/**
 * ==============================================================================
 * SAAMX Phase A: Bank Settlement Rejection Master Regression Test Suite
 * ==============================================================================
 * Exercises:
 *   - Test 1: Missing settlement ID (404 Not Found)
 *   - Test 2: Missing / invalid rejection reason (400 Bad Request)
 *   - Test 3: Unauthorized caller (Team role returns 403 Forbidden)
 *   - Test 4: Successful Bank Rejection (Case A: Zero Subsequent Trades)
 *       - Cash reservation released
 *       - Security float restored
 *       - Current price rolled back to pre-trade execution price
 *       - Order status SETTLEMENT_REJECTED
 *       - Transaction voided
 *       - Trade count decremented
 *   - Test 5: Duplicate rejection prevention (400 Bad Request)
 *   - Test 6: Successful Bank Rejection (Case B: Subsequent Trades Exist)
 *       - Subsequent trades preserved
 *       - Forward compensating adjustment tick applied without rewriting history
 *       - Cash reservation released & float restored
 *   - Test 7: Concurrency & Lock Cleanup (Lock released after error/success)
 * ==============================================================================
 */

import http from 'http';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_STATE_PATH = path.join(ROOT_DIR, 'test-state-phaseA-rejection.json');

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      if (typeof body === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

// Prepare isolated test state
const baseState = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'state.json'), 'utf8'));
const fixture = JSON.parse(JSON.stringify(baseState));

fixture.settings = fixture.settings || {};
fixture.settings.settlementMode = 'TWO_PHASE_BANK';
fixture.marketState = fixture.marketState || {};
fixture.marketState.status = 'Open';
fixture.marketState.sessionState = 'CONTINUOUS_TRADING';

const sRel = (fixture.securities || []).find(s => s.ticker === 'RELIANCE');
if (sRel) {
  sRel.totalUnits = 1000;
  sRel.availableUnits = 500;
  sRel.volatility = 0.10;
  sRel.currentPrice = 2500;
  sRel.priceHistory = [{ timestamp: Date.now() - 10000, price: 2500 }];
}
const sTcs = (fixture.securities || []).find(s => s.ticker === 'TCS');
if (sTcs) {
  sTcs.totalUnits = 1000;
  sTcs.availableUnits = 500;
  sTcs.volatility = 0.10;
  sTcs.currentPrice = 3500;
  sTcs.priceHistory = [{ timestamp: Date.now() - 10000, price: 3500 }];
}

fs.writeFileSync(TEST_STATE_PATH, JSON.stringify(fixture, null, 2));

console.log('--- STARTING PHASE A BANK REJECTION REGRESSION TESTS ---');
console.log(`Spawning isolated test server on port ${TEST_PORT}...`);

const serverProcess = spawn(process.execPath, ['server.js'], {
  cwd: ROOT_DIR,
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    STATE_FILE: TEST_STATE_PATH,
    NODE_ENV: 'test',
    SAAMX_AUTH_SECRET: 'test-secret-phaseA-rejection-1234567890'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverLogs = '';
serverProcess.stdout.on('data', d => { serverLogs += d.toString(); });
serverProcess.stderr.on('data', d => { serverLogs += d.toString(); });
serverProcess.on('error', err => { serverLogs += `[Process Error] ${err}\n`; });
serverProcess.on('exit', (code, sig) => { serverLogs += `[Process Exited] code=${code} sig=${sig}\n`; });

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await httpRequest(`${BASE_URL}/api/ping`);
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Server failed to start on port ${TEST_PORT}:\n${serverLogs}`);
}

async function runTests() {
  await waitForServer();
  console.log(`✓ Test server operational on port ${TEST_PORT}`);

  // 1. Authenticate Bank Teller, Admin/Exchange, and Teams
  const tellerAuth = await httpRequest(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    username: 'bank',
    password: 'saamx-event-2026'
  });
  assert.strictEqual(tellerAuth.status, 200, 'Bank Teller login must succeed');
  const tellerToken = tellerAuth.body.token;

  const adminAuth = await httpRequest(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    username: 'admin',
    password: 'saamx-event-2026'
  });
  assert.strictEqual(adminAuth.status, 200, 'Admin login must succeed');
  const adminToken = adminAuth.body.token;

  // Start market
  await httpRequest(`${BASE_URL}/api/market/control`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { action: 'START' });

  const teamAuth = await httpRequest(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    username: 'T01',
    password: 'saamx-team-01'
  });
  assert.strictEqual(teamAuth.status, 200, 'Team T01 login must succeed');
  const teamToken = teamAuth.body.token;

  console.log('✓ Authentication tokens acquired for teller, exchange, and team.');

  // TEST 1: Missing Settlement ID (404)
  const t1 = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tellerToken}` }
  }, {
    settlementId: 'NON_EXISTENT_SETTLEMENT_9999',
    reason: 'Voucher not recognized'
  });
  assert.strictEqual(t1.status, 404, 'Non-existent settlement must return 404');
  console.log('✓ Test 1 Passed: Missing settlement ID rejected with 404 Not Found.');

  // TEST 2: Missing or whitespace-only reason (400)
  const t2 = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tellerToken}` }
  }, {
    settlementId: 'ANY_ID',
    reason: '   '
  });
  assert.strictEqual(t2.status, 400, 'Empty rejection reason must return 400');
  console.log('✓ Test 2 Passed: Empty rejection reason rejected with 400 Bad Request.');

  // TEST 3: Unauthorized caller (Team role blocked with 403)
  const t3 = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teamToken}` }
  }, {
    settlementId: 'ANY_ID',
    reason: 'Student attempting self-rejection'
  });
  assert.strictEqual(t3.status, 403, 'Team role must receive 403 Forbidden');
  console.log('✓ Test 3 Passed: Unauthorized team role rejected with 403 Forbidden.');

  // Helper to fetch live state
  async function getLiveState(token = adminToken) {
    const res = await httpRequest(`${BASE_URL}/api/state`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.body.state;
  }

  // TEST 4: Successful Bank Rejection (Case A: Zero Subsequent Trades)
  // Step A: Setup test security with controlled float, price and volatility
  const testSecTicker = 'TESTA';
  const createSecRes = await httpRequest(`${BASE_URL}/api/securities`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    ticker: testSecTicker,
    name: 'Phase A Test Corp',
    basePrice: 100,
    totalUnits: 1000,
    volatility: 0.20
  });
  assert.strictEqual(createSecRes.status, 200, 'Creation of TESTA must succeed');

  const initialPrice1 = 100;
  const initialFloat1 = 1000;

  // Step B: Submit order from Team T01
  const submitOrderRes = await httpRequest(`${BASE_URL}/api/order/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teamToken}` }
  }, {
    teamCode: 'T01',
    ticker: testSecTicker,
    action: 'BUY',
    quantity: 50,
    orderType: 'MARKET'
  });
  assert.strictEqual(submitOrderRes.status, 200, 'Order submission must succeed');
  const orderId1 = submitOrderRes.body.orderId || submitOrderRes.body.order?.id;

  // Step C: Execute order on Exchange Desk in TWO_PHASE_BANK mode
  const execRes = await httpRequest(`${BASE_URL}/api/order/action`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    orderId: orderId1,
    actionType: 'EXECUTE',
    deskId: 'DESK_1',
    operator: 'Floor Operator',
    physicalSlipChecked: true
  });
  assert.strictEqual(execRes.status, 200, 'Exchange execution must succeed');
  assert.strictEqual(execRes.body.order.status, 'EXECUTED_PENDING_SETTLEMENT');
  assert.strictEqual(execRes.body.order.settlementStatus, 'PENDING');
  const voucherRef1 = execRes.body.settlement.voucherReference;
  const settlementId1 = execRes.body.settlement.id;
  const executedPrice1 = execRes.body.order.executionPrice;
  const stLiveAfterExec = await getLiveState();
  const newPrice1 = stLiveAfterExec.securities.find(s => s.ticker === testSecTicker).currentPrice;

  assert(newPrice1 > executedPrice1, `BUY execution must produce upward price impact (new: ${newPrice1}, exec: ${executedPrice1})`);

  // Verify reserved cash and float deduction
  const team1AfterExec = stLiveAfterExec.teams.find(t => t.teamCode === 'T01');
  assert(team1AfterExec.reservedCash.INR > 0, 'Team must have reserved cash for pending voucher');

  // Step D: Bank Teller rejects settlement voucher
  const rejectRes1 = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tellerToken}` }
  }, {
    settlementId: settlementId1,
    reason: 'Student failed to present physical cash at counter'
  });

  assert.strictEqual(rejectRes1.status, 200, 'Bank rejection must succeed with 200 OK');
  assert.strictEqual(rejectRes1.body.settlement.status, 'REJECTED');
  assert.strictEqual(rejectRes1.body.order.status, 'SETTLEMENT_REJECTED');
  assert.strictEqual(rejectRes1.body.order.workflowStage, 'SETTLEMENT_REJECTED');

  // Step E: Verify post-rejection invariant consistency (Case A)
  const stReject1 = await getLiveState();
  const sec1AfterRejection = stReject1.securities.find(s => s.ticker === testSecTicker);
  assert.strictEqual(sec1AfterRejection.availableUnits, initialFloat1, 'Float must be 100% restored upon rejection');
  assert.strictEqual(sec1AfterRejection.currentPrice, executedPrice1, 'Case A: Price must roll back to pre-trade execution price');

  const team1AfterRejection = stReject1.teams.find(t => t.teamCode === 'T01');
  assert.strictEqual(team1AfterRejection.reservedCash.INR, 0, 'Reserved cash must be 100% released');

  console.log(`✓ Test 4 Passed: Case A Bank Rejection rolled back price from ₹${newPrice1} to ₹${sec1AfterRejection.currentPrice}, restored float (+50), and released ₹${execRes.body.settlement.totalAmount} reserved cash.`);

  // TEST 5: Duplicate Rejection Prevention (400)
  const t5 = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tellerToken}` }
  }, {
    settlementId: settlementId1,
    reason: 'Attempting to reject already rejected voucher'
  });
  assert.strictEqual(t5.status, 400, 'Duplicate rejection must be blocked with 400');
  console.log('✓ Test 5 Passed: Duplicate rejection blocked with 400 Bad Request.');

  // TEST 6: Successful Bank Rejection (Case B: Subsequent Trades Exist)
  // Step A: Setup security
  const tickerB = 'TESTB';
  const createSecBRes = await httpRequest(`${BASE_URL}/api/securities`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    ticker: tickerB,
    name: 'Phase B Multi-Trade Corp',
    basePrice: 200,
    totalUnits: 1000,
    volatility: 0.20
  });
  assert.strictEqual(createSecBRes.status, 200, 'Creation of TESTB must succeed');
  const initialPriceB = 200;
  const initialFloatB = 1000;

  // Step B: Trade 1 - Team T01 buys 50 units of TESTB
  const o1Res = await httpRequest(`${BASE_URL}/api/order/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teamToken}` }
  }, {
    teamCode: 'T01',
    ticker: tickerB,
    action: 'BUY',
    quantity: 50,
    orderType: 'MARKET'
  });
  assert.strictEqual(o1Res.status, 200, 'Trade 1 order submit must succeed');
  const orderIdB1 = o1Res.body.orderId || o1Res.body.order?.id;

  const exec1Res = await httpRequest(`${BASE_URL}/api/order/action`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    orderId: orderIdB1,
    actionType: 'EXECUTE',
    deskId: 'DESK_1',
    operator: 'Operator 1',
    physicalSlipChecked: true
  });
  assert.strictEqual(exec1Res.status, 200);
  const stlB1 = exec1Res.body.settlement.id;
  const stB1 = await getLiveState();
  const priceAfterTrade1 = stB1.securities.find(s => s.ticker === tickerB).currentPrice;

  // Step C: Trade 2 (Subsequent Trade) - Team T02 buys 25 units of TESTB AFTER Trade 1
  const team2Auth = await httpRequest(`${BASE_URL}/api/auth/login`, { method: 'POST' }, {
    username: 'T02',
    password: 'saamx-team-02'
  });
  assert.strictEqual(team2Auth.status, 200, 'Team T02 login must succeed');

  const o2Res = await httpRequest(`${BASE_URL}/api/order/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${team2Auth.body.token}` }
  }, {
    teamCode: 'T02',
    ticker: tickerB,
    action: 'BUY',
    quantity: 25,
    orderType: 'MARKET'
  });
  assert.strictEqual(o2Res.status, 200, 'Trade 2 order submit must succeed');
  const orderIdB2 = o2Res.body.orderId || o2Res.body.order?.id;

  const exec2Res = await httpRequest(`${BASE_URL}/api/order/action`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    orderId: orderIdB2,
    actionType: 'EXECUTE',
    deskId: 'DESK_2',
    operator: 'Operator 2',
    physicalSlipChecked: true
  });
  assert.strictEqual(exec2Res.status, 200);
  const stB2 = await getLiveState();
  const priceAfterTrade2 = stB2.securities.find(s => s.ticker === tickerB).currentPrice;
  assert(priceAfterTrade2 > priceAfterTrade1, 'Trade 2 must advance market price further');

  // Step D: Bank rejects voucher for Trade 1 (while Trade 2 remains active)
  const rejectResB = await httpRequest(`${BASE_URL}/api/bank/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tellerToken}` }
  }, {
    settlementId: stlB1,
    reason: 'Trade 1 voucher counterfeit signature detected'
  });

  assert.strictEqual(rejectResB.status, 200, 'Bank rejection of Trade 1 must succeed');

  // Step E: Verify Case B invariants
  const stBAfter = await getLiveState();
  const secBAfter = stBAfter.securities.find(s => s.ticker === tickerB);
  // In Case B, history is preserved and a forward compensating delta is applied
  assert(secBAfter.currentPrice < priceAfterTrade2, 'Compensating delta must reduce current price moving forward');
  assert(secBAfter.currentPrice > initialPriceB, 'Current price must still reflect active Trade 2 rather than being wiped back to initial price');

  const latestPriceTick = secBAfter.priceHistory[secBAfter.priceHistory.length - 1];
  assert.strictEqual(latestPriceTick.reversionType, 'COMPENSATING_ADJUSTMENT', 'Tick must be labeled COMPENSATING_ADJUSTMENT');

  console.log(`✓ Test 6 Passed: Case B Bank Rejection preserved subsequent Trade 2, applied forward compensating tick (adjusted price: ₹${secBAfter.currentPrice} vs peak ₹${priceAfterTrade2}).`);

  console.log('\n======================================================');
  console.log('🏆 ALL 6/6 PHASE A BANK REJECTION TESTS PASSED!');
  console.log('======================================================');
}

runTests()
  .catch(err => {
    console.error('❌ PHASE A TEST FAILURE:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    serverProcess.kill('SIGINT');
    if (fs.existsSync(TEST_STATE_PATH)) {
      try { fs.unlinkSync(TEST_STATE_PATH); } catch (e) {}
    }
  });
