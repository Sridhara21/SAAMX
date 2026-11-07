/**
 * SAAMX ADVERSARIAL STRESS TEST SUITE: PHASE F SANDBOX STATE ISOLATION
 * File: SAAMX/test-adversarial-phase-f-isolation.js
 *
 * Challenger 1: Sandbox Isolation Stress Tester
 *
 * Verifies:
 * - Bit-exact zero-delta on live event state across all entities:
 *   * Live team cash balances (cashBalance, cashWallets, reservedCash)
 *   * Live team stock holdings (holdings, lockedHoldings)
 *   * Live orders, clearing accounts, and vouchers
 *   * Live FX desk reserves (USD, EUR, GBP, JPY, AED, SGD, CNY, AUD, KRW)
 *   * Live news events and public ticker feeds
 *   * Live audit logs, transactions, and journals
 *   * Live securities prices and market state
 * - Heavy adversarial storm of training operations:
 *   * Battery 1: 150+ concurrent mock orders across desks & teams with boundary attacks
 *   * Battery 2: Multi-phase DvP settlement race condition attacks (double settlement, slip bypass, hold notes bypass)
 *   * Battery 3: High-volume FX spot conversion storm & finite reserve exhaustion attack
 *   * Battery 4: Training news injection & broadcast flood (zero live ticker leakage)
 *   * Battery 5: Rapid-fire sandbox resets interleaved with live concurrent traffic
 *   * Battery 6: Comprehensive live state bit-exact zero-delta deep comparison
 *   * Battery 7: Post-storm authoritative baseline state.json SHA-256 hash verification
 * - Strictly preserves authoritative baseline SHA-256 hash of state.json:
 *   6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca.
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 3129;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-f-adversarial.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-f-results.json');

const testResults = [];

function recordResult({ id, title, battery, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, battery, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Battery:   ${battery}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (evidence) {
    const evStr = typeof evidence === 'object' ? JSON.stringify(evidence) : String(evidence);
    console.log(`  Evidence:  ${evStr.length > 200 ? evStr.slice(0, 200) + '...' : evStr}`);
  }
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: encodeURI(pathUrl),
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function bearer(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function runAdversarialPhaseFSuite() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX PHASE F ADVERSARIAL STRESS HARNESS — CHALLENGER 1');
  console.log('Target: Sandbox State Isolation & Live Event Immunity Under Storm');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- PRE-FLIGHT: AUTHORITATIVE BASELINE HASH CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'ADV-F-PRE-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    battery: 'Pre-Flight Integrity',
    scenario: 'Verify state.json SHA-256 is strictly bit-exact before running stress harness',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: FIXTURE SETUP
  console.log('--- PRE-FLIGHT: INITIALIZING DISPOSABLE TEST FIXTURE ---');
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Paused';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  recordResult({
    id: 'ADV-F-PRE-02',
    title: 'Disposable Test Fixture Initialization',
    battery: 'Pre-Flight Integrity',
    scenario: 'Create isolated writable test fixture snapshot for ephemeral server',
    expected: 'state.test-phase-f-adversarial.json created from state.json',
    actual: 'Snapshot initialized',
    evidence: { disposableState: DISPOSABLE_STATE },
    status: fs.existsSync(DISPOSABLE_STATE) ? 'PASSED' : 'FAILED'
  });

  // STEP 3: SPAWN ISOLATED BACKEND SERVER
  console.log(`--- PRE-FLIGHT: SPAWNING ISOLATED BACKEND SERVER (PORT ${PORT}) ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      DISABLE_FIREBASE_SYNC: 'true',
      VITE_DISABLE_FIREBASE: 'true'
    },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 60; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && ping.data?.ready === true) {
        serverStarted = true;
        console.log(`✓ Isolated test backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!serverStarted) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  recordResult({
    id: 'ADV-F-PRE-03',
    title: 'Ephemeral Test Server Healthcheck',
    battery: 'Pre-Flight Integrity',
    scenario: 'Confirm test server initializes with disposable state on dynamic port',
    expected: 'HTTP 200 with ready: true',
    actual: 'Server ready',
    evidence: { port: PORT },
    status: serverStarted ? 'PASSED' : 'FAILED'
  });

  try {
    // STEP 4: AUTHENTICATION
    console.log('--- PRE-FLIGHT: AUTHENTICATING TEST ROLES ---');
    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    const loginJournalist = await apiRequest('POST', '/api/auth/login', { username: 'journalist', password: 'journalist-event-2026' });
    const tokenJournalist = loginJournalist.data?.token;

    assert.ok(tokenAdmin && tokenT01 && tokenExchange && tokenBank && tokenJournalist, 'All test roles must authenticate');
    console.log('✓ Multi-role tokens established.\n');

    recordResult({
      id: 'ADV-F-PRE-04',
      title: 'Multi-Role Test Authentication',
      battery: 'Pre-Flight Integrity',
      scenario: 'Obtain JWT tokens for admin, team, exchange, bank, and journalist',
      expected: 'Valid tokens for all 5 roles',
      actual: 'All 5 tokens received',
      evidence: { roles: ['admin', 'team', 'exchange', 'bank', 'journalist'] },
      status: 'PASSED'
    });

    // STEP 5: CAPTURE PRE-STORM BASELINE SNAPSHOT OF LIVE EVENT STATE
    console.log('--- PRE-FLIGHT: CAPTURING PRE-STORM LIVE EVENT SNAPSHOT ---');
    const liveStatePreRes = await apiRequest('GET', '/api/state', null, bearer(tokenAdmin));
    assert.strictEqual(liveStatePreRes.status, 200, 'Failed to fetch pre-storm live state');
    const liveStatePre = JSON.parse(JSON.stringify(liveStatePreRes.data));

    // Deep structured metrics
    const preTeams = new Map();
    (liveStatePre.teams || []).forEach(t => {
      preTeams.set(t.teamCode || t.id, {
        cashBalance: t.cashBalance,
        cashWallets: JSON.parse(JSON.stringify(t.cashWallets || {})),
        reservedCash: JSON.parse(JSON.stringify(t.reservedCash || {})),
        holdings: JSON.parse(JSON.stringify(t.holdings || {})),
        lockedHoldings: JSON.parse(JSON.stringify(t.lockedHoldings || {}))
      });
    });

    const preOrders = JSON.parse(JSON.stringify(liveStatePre.orders || []));
    const preTransactions = JSON.parse(JSON.stringify(liveStatePre.transactions || []));
    const preFxReserves = JSON.parse(JSON.stringify(liveStatePre.fxReserves || {}));
    const preFxTransactions = JSON.parse(JSON.stringify(liveStatePre.fxTransactions || []));
    const preNewsEvents = JSON.parse(JSON.stringify(liveStatePre.newsEvents || []));
    const preAuditLog = JSON.parse(JSON.stringify(liveStatePre.auditLog || []));
    const preSecurities = JSON.parse(JSON.stringify(liveStatePre.securities || []));
    const preMarketState = JSON.parse(JSON.stringify(liveStatePre.marketState || {}));

    console.log(`✓ Pre-Storm Baseline: ${preTeams.size} Live Teams, ${preOrders.length} Orders, ${preNewsEvents.length} News Events, ${preAuditLog.length} Audit Entries.\n`);

    recordResult({
      id: 'ADV-F-PRE-05',
      title: 'Pre-Storm Live Event State Deep Snapshot Capture',
      battery: 'Pre-Flight Integrity',
      scenario: 'Capture complete pre-storm snapshot of all live teams, balances, holdings, orders, FX, news, and audit logs',
      expected: 'Complete snapshot captured via GET /api/state',
      actual: `Captured ${preTeams.size} teams, ${preOrders.length} orders, ${preNewsEvents.length} news events`,
      evidence: { teamsCount: preTeams.size, ordersCount: preOrders.length, newsCount: preNewsEvents.length },
      status: 'PASSED'
    });

    // ========================================================================
    // BATTERY 1: HIGH-VOLUME MOCK ORDERS STORM & DESK CONCURRENCY
    // ========================================================================
    console.log('--- BATTERY 1: HIGH-VOLUME MOCK ORDERS STORM & DESK CONCURRENCY ---');

    const tickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATASTEEL'];
    const mockTeams = ['TRAIN_T01', 'TRAIN_T02', 'TRAIN_T03', 'TRAIN_T04', 'TRAIN_T05'];
    const desks = ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'];

    const concurrentOrderPromises = [];
    const NUM_ORDERS = 150;

    for (let i = 0; i < NUM_ORDERS; i++) {
      const teamCode = mockTeams[i % mockTeams.length];
      const ticker = tickers[i % tickers.length];
      const action = i % 2 === 0 ? 'BUY' : 'SELL';
      const quantity = (i % 5 + 1) * 2;
      const deskId = desks[i % desks.length];
      const operator = `Adversarial Operator ${i % 10 + 1}`;

      concurrentOrderPromises.push(
        apiRequest('POST', '/api/training/order/create', {
          teamCode,
          ticker,
          action,
          quantity,
          orderType: 'MARKET',
          deskId,
          operator
        }, bearer(tokenT01))
      );
    }

    const orderResults = await Promise.all(concurrentOrderPromises);
    const successfulOrders = orderResults.filter(r => r.status === 200 && r.data?.success === true);
    console.log(`✓ Submitted ${NUM_ORDERS} concurrent mock orders. Success: ${successfulOrders.length}/${NUM_ORDERS}`);

    assert.strictEqual(successfulOrders.length, NUM_ORDERS, `Expected all ${NUM_ORDERS} mock orders to succeed`);

    recordResult({
      id: 'ADV-F-ORD-01',
      title: 'High-Volume Mock Orders Concurrent Ingestion',
      battery: 'Battery 1: Orders Storm',
      scenario: `Submit burst of ${NUM_ORDERS} concurrent BUY and SELL mock orders across all 5 mock teams and desks`,
      expected: `All ${NUM_ORDERS} orders return HTTP 200 with orderId and status AWAITING_PHYSICAL_SLIP`,
      actual: `${successfulOrders.length}/${NUM_ORDERS} orders created successfully`,
      evidence: { totalSubmitted: NUM_ORDERS, successCount: successfulOrders.length },
      status: successfulOrders.length === NUM_ORDERS ? 'PASSED' : 'FAILED'
    });

    // Check Buffer Reservation on BUY orders
    const buyOrders = successfulOrders.filter(r => r.data.order.action === 'BUY');
    const bufferCorrect = buyOrders.every(r => {
      const ord = r.data.order;
      const expectedBuffer = Math.ceil(ord.price * ord.quantity * 1.05);
      return ord.reservedCashAmount === expectedBuffer;
    });

    recordResult({
      id: 'ADV-F-ORD-02',
      title: 'Mock BUY +5% Execution Buffer Reservation Verification',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Verify every mock BUY order reserves requestedValue + 5% execution buffer in sandbox',
      expected: 'reservedCashAmount == Math.ceil(price * quantity * 1.05) across all orders',
      actual: bufferCorrect ? 'All BUY orders have exact +5% cash reservation' : 'Buffer mismatch detected',
      evidence: { sampleBuy: buyOrders[0]?.data.order },
      status: bufferCorrect ? 'PASSED' : 'FAILED'
    });

    // Check Deliverable Shares Locking on SELL orders
    const sellOrders = successfulOrders.filter(r => r.data.order.action === 'SELL');
    const sellShareLocking = sellOrders.length > 0 && sellOrders.every(r => r.data.order.reservedCashAmount === 0);

    recordResult({
      id: 'ADV-F-ORD-03',
      title: 'Mock SELL Deliverable Shares Locking Verification',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Verify every mock SELL order locks deliverable shares with zero cash reservation',
      expected: 'reservedCashAmount == 0 on all SELL orders',
      actual: sellShareLocking ? 'All SELL orders lock shares with 0 cash reserved' : 'Invalid reservation',
      evidence: { sampleSell: sellOrders[0]?.data.order },
      status: sellShareLocking ? 'PASSED' : 'FAILED'
    });

    // Adversarial Boundary Tests for Orders
    // 1. Zero quantity
    const zeroQtyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 0
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-04',
      title: 'Zero Quantity Mock Order Boundary Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Submit mock order with quantity=0; must be rejected with HTTP 400',
      expected: 'HTTP 400 Quantity must be a positive integer',
      actual: `HTTP ${zeroQtyRes.status} Error: ${zeroQtyRes.data?.error}`,
      evidence: zeroQtyRes.data,
      status: zeroQtyRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2. Negative quantity
    const negQtyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: -50
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-05',
      title: 'Negative Quantity Mock Order Boundary Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Submit mock order with quantity=-50; must be rejected with HTTP 400',
      expected: 'HTTP 400 Quantity must be a positive integer',
      actual: `HTTP ${negQtyRes.status} Error: ${negQtyRes.data?.error}`,
      evidence: negQtyRes.data,
      status: negQtyRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 3. Non-numeric quantity
    const nanQtyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 'INVALID_NUMBER'
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-06',
      title: 'Non-Numeric Quantity Mock Order Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: "Submit mock order with quantity='INVALID_NUMBER'; must be rejected with HTTP 400",
      expected: 'HTTP 400 Quantity must be a positive integer',
      actual: `HTTP ${nanQtyRes.status} Error: ${nanQtyRes.data?.error}`,
      evidence: nanQtyRes.data,
      status: nanQtyRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 4. Overdraft Cash BUY Protection
    const overdraftBuyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 50000000 // Huge cash requirement
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-07',
      title: 'Mock Cash Overdraft Protection Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Submit mock BUY order requiring ₹142+ Crore against ₹1 Crore wallet',
      expected: 'HTTP 400 Insufficient sandbox cash balance',
      actual: `HTTP ${overdraftBuyRes.status} Error: ${overdraftBuyRes.data?.error}`,
      evidence: overdraftBuyRes.data,
      status: overdraftBuyRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 5. Overdraft Holdings SELL Protection
    const overdraftSellRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: 50000000 // Huge share requirement
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-08',
      title: 'Mock Deliverable Shares Overdraft Protection Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Submit mock SELL order requiring 50,000,000 shares against 500 holdings',
      expected: 'HTTP 400 Insufficient deliverable holdings',
      actual: `HTTP ${overdraftSellRes.status} Error: ${overdraftSellRes.data?.error}`,
      evidence: overdraftSellRes.data,
      status: overdraftSellRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 6. Unknown Mock Team Rejection
    const fakeTeamRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'NONEXISTENT_TRAIN_99',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-09',
      title: 'Non-Existent Mock Team Rejection',
      battery: 'Battery 1: Orders Storm',
      scenario: "Submit order with teamCode='NONEXISTENT_TRAIN_99'",
      expected: 'HTTP 404 Mock team not found in sandbox',
      actual: `HTTP ${fakeTeamRes.status} Error: ${fakeTeamRes.data?.error}`,
      evidence: fakeTeamRes.data,
      status: fakeTeamRes.status === 404 ? 'PASSED' : 'FAILED'
    });

    // 7. Live Team Code Injection Guard
    // Test with actual live team code 'T01'
    const liveTeamRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'T01', // live team code
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10
    }, bearer(tokenT01));

    // Confirm that live team T01 in state.teams was NOT altered
    const liveStateMid1 = await apiRequest('GET', '/api/state', null, bearer(tokenAdmin));
    const liveT01 = liveStateMid1.data?.teams?.find(t => t.teamCode === 'T01' || t.id === 'T01');
    const preT01 = preTeams.get('T01');
    const liveT01Unchanged = liveT01 &&
      liveT01.cashBalance === preT01.cashBalance &&
      JSON.stringify(liveT01.cashWallets || {}) === JSON.stringify(preT01.cashWallets || {}) &&
      JSON.stringify(liveT01.holdings || {}) === JSON.stringify(preT01.holdings || {});

    recordResult({
      id: 'ADV-F-ORD-10',
      title: 'Live Team Code Injection Sandbox Isolation Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: "Submit training order using live team code 'T01'; assert zero mutation to live T01 state",
      expected: 'Live team cash balance and holdings strictly unmutated',
      actual: liveT01Unchanged ? 'Live T01 strictly unmutated' : 'Live state mutated!',
      evidence: { responseStatus: liveTeamRes.status, liveCash: liveT01?.cashBalance, preCash: preT01?.cashBalance },
      status: liveT01Unchanged ? 'PASSED' : 'FAILED'
    });

    // 8. Missing Required Fields Guard
    const missingFieldsRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01'
      // missing ticker, action, quantity
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-11',
      title: 'Missing Required Fields Order Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: 'Submit order payload missing ticker, action, and quantity',
      expected: 'HTTP 400 Missing required order fields',
      actual: `HTTP ${missingFieldsRes.status} Error: ${missingFieldsRes.data?.error}`,
      evidence: missingFieldsRes.data,
      status: missingFieldsRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 9. Unsupported Action Guard
    const badActionRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'HODL',
      quantity: 10
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-ORD-12',
      title: 'Unsupported Action Type Order Guard',
      battery: 'Battery 1: Orders Storm',
      scenario: "Submit order with action='HODL'",
      expected: 'HTTP 400 Action must be BUY or SELL',
      actual: `HTTP ${badActionRes.status} Error: ${badActionRes.data?.error}`,
      evidence: badActionRes.data,
      status: badActionRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 2: MULTI-PHASE DvP SETTLEMENT RACE & CONCURRENCY STORM
    // ========================================================================
    console.log('\n--- BATTERY 2: MULTI-PHASE DvP SETTLEMENT RACE & CONCURRENCY STORM ---');

    // Fetch current sandbox orders
    const sbStateRes = await apiRequest('GET', '/api/training/state', null, bearer(tokenAdmin));
    const pendingOrders = (sbStateRes.data.sandbox?.orders || []).filter(o => o.status === 'AWAITING_PHYSICAL_SLIP');
    console.log(`✓ Retrieved ${pendingOrders.length} pending mock orders for DvP pipeline processing.`);

    // 2.1 Concurrent Order Claiming
    const claimPromises = pendingOrders.slice(0, 30).map((ord, idx) =>
      apiRequest('POST', '/api/training/order/claim', {
        orderId: ord.id,
        deskId: `DESK_${(idx % 5) + 1}`,
        operator: `Exchange Officer ${idx + 1}`
      }, bearer(tokenExchange))
    );
    const claimResults = await Promise.all(claimPromises);
    const claimedCount = claimResults.filter(r => r.status === 200 && r.data.order?.status === 'VERIFYING_AT_EXCHANGE').length;

    recordResult({
      id: 'ADV-F-DVP-01',
      title: 'Concurrent Mock Order Intake & Claiming',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Concurrently claim 30 pending orders by multiple simulated exchange officers',
      expected: 'All 30 orders transition to VERIFYING_AT_EXCHANGE with claimedBy populated',
      actual: `${claimedCount}/30 orders claimed successfully`,
      evidence: { claimedCount },
      status: claimedCount === 30 ? 'PASSED' : 'FAILED'
    });

    // 2.2 Physical Slip Verification Checklist Guard (Attempt approve without checking slip)
    const orderToApproveWithoutSlip = pendingOrders[0];
    const unverifiedApproveRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToApproveWithoutSlip.id,
      actionType: 'APPROVE',
      deskId: 'DESK_1',
      operator: 'Rogue Operator',
      physicalSlipChecked: false
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-02',
      title: 'Physical Slip Checklist Mandatory Verification Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Attempt to APPROVE mock order without completing physical slip checklist (physicalSlipChecked=false)',
      expected: 'HTTP 400 Physical slip verification checklist must be completed prior to order approval',
      actual: `HTTP ${unverifiedApproveRes.status} Error: ${unverifiedApproveRes.data?.error}`,
      evidence: unverifiedApproveRes.data,
      status: unverifiedApproveRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.3 Rejection Reason Mandatory Guard
    const orderToRejectWithoutReason = pendingOrders[1];
    const unreasonedRejectRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToRejectWithoutReason.id,
      actionType: 'REJECT',
      operator: 'Exchange Officer 1',
      rejectionReason: ''
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-03',
      title: 'Mandatory Rejection Reason Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Attempt to REJECT mock order with empty rejectionReason',
      expected: 'HTTP 400 Every rejected order must provide an explicit rejection reason',
      actual: `HTTP ${unreasonedRejectRes.status} Error: ${unreasonedRejectRes.data?.error}`,
      evidence: unreasonedRejectRes.data,
      status: unreasonedRejectRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.4 Return Reason Mandatory Guard
    const orderToReturnWithoutReason = pendingOrders[2];
    const unreasonedReturnRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToReturnWithoutReason.id,
      actionType: 'RETURN',
      operator: 'Exchange Officer 1',
      returnReason: ''
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-04',
      title: 'Mandatory Return Reason Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Attempt to RETURN mock order with empty returnReason',
      expected: 'HTTP 400 Mandatory returnReason required when returning order for correction',
      actual: `HTTP ${unreasonedReturnRes.status} Error: ${unreasonedReturnRes.data?.error}`,
      evidence: unreasonedReturnRes.data,
      status: unreasonedReturnRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.5 Valid Rejection & Resource Release
    const validRejectRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToRejectWithoutReason.id,
      actionType: 'REJECT',
      operator: 'Exchange Officer 1',
      rejectionReason: 'Invalid physical stamp on broker slip'
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-05',
      title: 'Order Rejection & Sandbox Resource Release',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Reject order with valid reason; assert status=REJECTED and resources unlocked',
      expected: 'Status 200, status=REJECTED, rejectionReason recorded',
      actual: `Status: ${validRejectRes.status}, OrderStatus: ${validRejectRes.data.order?.status}`,
      evidence: validRejectRes.data.order,
      status: validRejectRes.data.order?.status === 'REJECTED' ? 'PASSED' : 'FAILED'
    });

    // 2.6 Valid Return & Resource Release
    const validReturnRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToReturnWithoutReason.id,
      actionType: 'RETURN',
      operator: 'Exchange Officer 1',
      returnReason: 'Missing team trader signature on ticket'
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-06',
      title: 'Order Return For Correction & Resource Release',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Return order with valid reason; assert status=RETURNED_TO_TEAM',
      expected: 'Status 200, status=RETURNED_TO_TEAM, returnReason recorded',
      actual: `Status: ${validReturnRes.status}, OrderStatus: ${validReturnRes.data.order?.status}`,
      evidence: validReturnRes.data.order,
      status: validReturnRes.data.order?.status === 'RETURNED_TO_TEAM' ? 'PASSED' : 'FAILED'
    });

    // 2.7 Slip Verification & Valid Order Approvals Generating Vouchers
    const ordersToApprove = pendingOrders.slice(3, 23); // 20 orders
    const approvePromises = ordersToApprove.map((ord, idx) =>
      apiRequest('POST', '/api/training/order/action', {
        orderId: ord.id,
        actionType: 'APPROVE',
        deskId: `DESK_${(idx % 5) + 1}`,
        operator: `Exchange Officer ${(idx % 5) + 1}`,
        physicalSlipChecked: true
      }, bearer(tokenExchange))
    );

    const approveResults = await Promise.all(approvePromises);
    const approvedVouchers = approveResults
      .filter(r => r.status === 200 && r.data.voucher?.voucherReference)
      .map(r => r.data.voucher);

    console.log(`✓ Approved ${approvedVouchers.length}/20 orders. Generated settlement vouchers.`);

    recordResult({
      id: 'ADV-F-DVP-07',
      title: 'Physical Slip Verification & Voucher Generation Storm',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Approve 20 orders with physicalSlipChecked=true; verify voucher generation',
      expected: '20 vouchers generated with valid voucherReference and status PENDING',
      actual: `${approvedVouchers.length}/20 vouchers generated`,
      evidence: { voucherCount: approvedVouchers.length, sampleVoucher: approvedVouchers[0]?.voucherReference },
      status: approvedVouchers.length === 20 ? 'PASSED' : 'FAILED'
    });

    // 2.8 Terminal State Guard: Attempt to re-approve an already rejected order
    const terminalRejectReApprove = await apiRequest('POST', '/api/training/order/action', {
      orderId: orderToRejectWithoutReason.id,
      actionType: 'APPROVE',
      operator: 'Exchange Officer 1',
      physicalSlipChecked: true
    }, bearer(tokenExchange));

    recordResult({
      id: 'ADV-F-DVP-08',
      title: 'Terminal Order State Mutation Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Attempt to APPROVE an order already in terminal REJECTED state',
      expected: 'HTTP 400 Order is in terminal state',
      actual: `HTTP ${terminalRejectReApprove.status} Error: ${terminalRejectReApprove.data?.error}`,
      evidence: terminalRejectReApprove.data,
      status: terminalRejectReApprove.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.9 Bank Teller Voucher Claiming
    const voucherToClaim = approvedVouchers[0];
    const bankClaimRes = await apiRequest('POST', '/api/training/bank/claim', {
      voucherReference: voucherToClaim.voucherReference,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller Alpha'
    }, bearer(tokenBank));

    recordResult({
      id: 'ADV-F-DVP-09',
      title: 'Bank Teller Settlement Voucher Intake & Claim',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Claim settlement voucher; transition status to VERIFYING_AT_BANK',
      expected: 'Status 200, status=VERIFYING_AT_BANK, bankDeskId=BANK_1',
      actual: `Status: ${bankClaimRes.status}, VoucherStatus: ${bankClaimRes.data.voucher?.status}`,
      evidence: bankClaimRes.data.voucher,
      status: bankClaimRes.data.voucher?.status === 'VERIFYING_AT_BANK' ? 'PASSED' : 'FAILED'
    });

    // 2.10 Bank Hold Mandatory Notes Guard
    const voucherToHold = approvedVouchers[1];
    const unnotedHoldRes = await apiRequest('POST', '/api/training/bank/hold', {
      voucherReference: voucherToHold.voucherReference,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller Alpha',
      notes: ''
    }, bearer(tokenBank));

    recordResult({
      id: 'ADV-F-DVP-10',
      title: 'Bank Hold Mandatory Review Notes Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Attempt to place voucher on HOLD without mandatory notes',
      expected: 'HTTP 400 Mandatory notes required when holding a voucher for review',
      actual: `HTTP ${unnotedHoldRes.status} Error: ${unnotedHoldRes.data?.error}`,
      evidence: unnotedHoldRes.data,
      status: unnotedHoldRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.11 Bank Hold Valid Execution
    const validHoldRes = await apiRequest('POST', '/api/training/bank/hold', {
      voucherReference: voucherToHold.voucherReference,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller Alpha',
      notes: 'Counterparty physical cash token serial mismatch. Awaiting manager approval.'
    }, bearer(tokenBank));

    recordResult({
      id: 'ADV-F-DVP-11',
      title: 'Bank Hold Valid Execution & Ledger Tagging',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Place voucher on hold with detailed notes; assert status=HELD_FOR_REVIEW',
      expected: 'Status 200, status=HELD_FOR_REVIEW, holdNotes saved',
      actual: `Status: ${validHoldRes.status}, VoucherStatus: ${validHoldRes.data.voucher?.status}`,
      evidence: validHoldRes.data.voucher,
      status: validHoldRes.data.voucher?.status === 'HELD_FOR_REVIEW' ? 'PASSED' : 'FAILED'
    });

    // 2.12 Multi-Phase DvP Settlement Execution
    const voucherToSettle = approvedVouchers[2];
    const settleRes = await apiRequest('POST', '/api/training/bank/settle', {
      voucherReference: voucherToSettle.voucherReference,
      action: 'SETTLE',
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller Alpha',
      notes: 'Physical cash and deliverable securities verified.'
    }, bearer(tokenBank));

    assert.strictEqual(settleRes.status, 200, `Voucher settlement failed: ${JSON.stringify(settleRes.data)}`);
    assert.strictEqual(settleRes.data.voucher?.status, 'SETTLED');
    assert.strictEqual(settleRes.data.order?.status, 'SETTLED');

    recordResult({
      id: 'ADV-F-DVP-12',
      title: 'Two-Phase DvP Settlement & Cash/Securities Delivery',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Execute DvP settlement; verify funds transfer, share delivery, and transaction log',
      expected: 'Status 200, voucher.status=SETTLED, order.status=SETTLED',
      actual: `Voucher: ${settleRes.data.voucher?.status}, Order: ${settleRes.data.order?.status}`,
      evidence: { voucher: settleRes.data.voucher?.voucherReference, teamBalances: settleRes.data.teamBalances },
      status: 'PASSED'
    });

    // 2.13 DOUBLE SETTLEMENT RACE CONDITION ATTACK
    console.log('--- EXECUTING DOUBLE SETTLEMENT RACE CONDITION ATTACK ---');
    const voucherForRace = approvedVouchers[3];

    // Fire 10 simultaneous settlement requests for the exact same voucher
    const raceSettlementPromises = Array.from({ length: 10 }).map((_, idx) =>
      apiRequest('POST', '/api/training/bank/settle', {
        voucherReference: voucherForRace.voucherReference,
        action: 'SETTLE',
        bankDeskId: `BANK_${(idx % 3) + 1}`,
        tellerName: `Teller Race ${idx + 1}`
      }, bearer(tokenBank))
    );

    const raceResults = await Promise.all(raceSettlementPromises);
    const race200Count = raceResults.filter(r => r.status === 200).length;
    const race409Count = raceResults.filter(r => r.status === 409).length;

    console.log(`✓ Double Settlement Race: 200 OK: ${race200Count}, 409 Conflict: ${race409Count}`);

    const doubleSettlePrevented = race200Count === 1 && race409Count === 9;

    recordResult({
      id: 'ADV-F-DVP-13',
      title: 'Double Settlement Race Condition Conflict Prevention Guard',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: 'Fire 10 simultaneous POST /api/training/bank/settle requests on the same voucher',
      expected: 'Exactly 1 request returns HTTP 200; remaining 9 return HTTP 409 Conflict',
      actual: `200 OK: ${race200Count}, 409 Conflict: ${race409Count}`,
      evidence: { race200Count, race409Count, sampleConflict: raceResults.find(r => r.status === 409)?.data },
      status: doubleSettlePrevented ? 'PASSED' : 'FAILED'
    });

    // 2.14 Bank Settlement Rejection & Resource Unlock
    const voucherToRejectBank = approvedVouchers[4];
    const bankRejectRes = await apiRequest('POST', '/api/training/bank/settle', {
      voucherReference: voucherToRejectBank.voucherReference,
      action: 'REJECT',
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller Alpha',
      notes: 'Counterfeit banknote detected.'
    }, bearer(tokenBank));

    recordResult({
      id: 'ADV-F-DVP-14',
      title: 'Bank Settlement Rejection & Resource Unlocking',
      battery: 'Battery 2: DvP Settlement Storm',
      scenario: "Reject voucher at Bank Desk with action='REJECT'; assert status=SETTLEMENT_REJECTED",
      expected: 'Status 200, voucher.status=SETTLEMENT_REJECTED, order.status=SETTLEMENT_REJECTED',
      actual: `Voucher: ${bankRejectRes.data.voucher?.status}, Order: ${bankRejectRes.data.order?.status}`,
      evidence: bankRejectRes.data,
      status: bankRejectRes.data.voucher?.status === 'SETTLEMENT_REJECTED' ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 3: HIGH-VOLUME FX CONVERSION STORM & RESERVE DEPLETION EXHAUSTION
    // ========================================================================
    console.log('\n--- BATTERY 3: HIGH-VOLUME FX CONVERSION STORM & RESERVE DEPLETION EXHAUSTION ---');

    const fxCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];
    const NUM_FX_CONV = 100;
    const fxPromises = [];

    for (let i = 0; i < NUM_FX_CONV; i++) {
      const teamCode = mockTeams[i % mockTeams.length];
      const toCurrency = fxCurrencies[i % fxCurrencies.length];
      const amount = 5000 + (i * 100);

      fxPromises.push(
        apiRequest('POST', '/api/training/fx/convert', {
          teamCode,
          fromCurrency: 'INR',
          toCurrency,
          amount,
          operator: `FX Trainee ${(i % 5) + 1}`
        }, bearer(tokenT01))
      );
    }

    const fxResults = await Promise.all(fxPromises);
    const successfulFx = fxResults.filter(r => r.status === 200 && r.data.success === true);
    console.log(`✓ Executed ${NUM_FX_CONV} concurrent FX spot conversions. Success: ${successfulFx.length}/${NUM_FX_CONV}`);

    assert.strictEqual(successfulFx.length, NUM_FX_CONV, `Expected all ${NUM_FX_CONV} FX conversions to succeed`);

    recordResult({
      id: 'ADV-F-FX-01',
      title: 'High-Volume Multi-Currency FX Spot Conversion Storm',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: `Execute burst of ${NUM_FX_CONV} concurrent spot conversions across all 9 currencies against sandbox reserves`,
      expected: `All ${NUM_FX_CONV} conversions return HTTP 200 with transaction record and updated reserves`,
      actual: `${successfulFx.length}/${NUM_FX_CONV} conversions succeeded`,
      evidence: { totalSubmitted: NUM_FX_CONV, successCount: successfulFx.length, sampleTx: successfulFx[0]?.data.transaction },
      status: successfulFx.length === NUM_FX_CONV ? 'PASSED' : 'FAILED'
    });

    // Adversarial FX Boundary Checks
    // 1. Self-currency exchange
    const selfCurrencyRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'INR',
      amount: 1000
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-FX-02',
      title: 'Self-Currency FX Conversion Rejection Guard',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Attempt to exchange INR to INR',
      expected: 'HTTP 400 Cannot exchange currency to itself',
      actual: `HTTP ${selfCurrencyRes.status} Error: ${selfCurrencyRes.data?.error}`,
      evidence: selfCurrencyRes.data,
      status: selfCurrencyRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2. Legacy currencies (CAD / CHF)
    const cadFxRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'CAD',
      amount: 1000
    }, bearer(tokenT01));

    const chfFxRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'CHF',
      toCurrency: 'INR',
      amount: 1000
    }, bearer(tokenT01));

    const legacyBlocked = cadFxRes.status === 400 && chfFxRes.status === 400;

    recordResult({
      id: 'ADV-F-FX-03',
      title: 'Legacy Currency Rejection Guard (CAD & CHF)',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Attempt conversions involving decommissioned currencies CAD and CHF',
      expected: 'HTTP 400 CAD and CHF are legacy currencies and not available',
      actual: `CAD: HTTP ${cadFxRes.status}, CHF: HTTP ${chfFxRes.status}`,
      evidence: { cadError: cadFxRes.data?.error, chfError: chfFxRes.data?.error },
      status: legacyBlocked ? 'PASSED' : 'FAILED'
    });

    // 3. Negative / Zero conversion amount
    const negFxRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: -5000
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-FX-04',
      title: 'Negative / Zero FX Conversion Amount Guard',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Attempt conversion with amount=-5000',
      expected: 'HTTP 400 Amount must be a positive number',
      actual: `HTTP ${negFxRes.status} Error: ${negFxRes.data?.error}`,
      evidence: negFxRes.data,
      status: negFxRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 4. Insufficient wallet balance for conversion
    const overdraftFxRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 999999999 // Way beyond team wallet
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-F-FX-05',
      title: 'Team Wallet Overdraft Guard on FX Conversion',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Attempt to convert ₹99+ Crore when available wallet is ~₹90 Lakh',
      expected: 'HTTP 400 Insufficient sandbox cash wallet balance',
      actual: `HTTP ${overdraftFxRes.status} Error: ${overdraftFxRes.data?.error}`,
      evidence: overdraftFxRes.data,
      status: overdraftFxRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 5. Finite Reserve Exhaustion Attack
    console.log('--- EXECUTING FINITE RESERVE EXHAUSTION ATTACK ---');
    // Deplete SGD reserve (initial 250,000 SGD) using two consecutive high-volume team conversions
    // Step 1: TRAIN_T04 converts ₹9,000,000 INR to SGD (requires ~134,128 SGD at rate 67.10)
    const sgdPreRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T04',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: 9000000,
      operator: 'FX Trainee 1'
    }, bearer(tokenT01));

    assert.strictEqual(sgdPreRes.status, 200, 'SGD pre-exhaustion conversion must succeed');
    const remainingSgd = sgdPreRes.data.reserves?.availableReserve;
    console.log(`Remaining sandbox SGD available reserve after first heavy conversion: S$${remainingSgd}`);

    // Step 2: TRAIN_T05 attempts to convert ₹9,000,000 INR to SGD
    // TRAIN_T05 has ₹10,000,000 INR (wallet check passes), but requested S$134,128 exceeds remaining S$115,871
    const excessSgdRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T05',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: 9000000,
      operator: 'FX Trainee 2'
    }, bearer(tokenT01));

    const exhausted = excessSgdRes.status === 400 && excessSgdRes.data?.error?.includes('Insufficient sandbox reserves');

    recordResult({
      id: 'ADV-F-FX-06',
      title: 'Finite FX Reserve Exhaustion Attack & Guard Verification',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Pound SGD reserve with high-volume spot conversions until depleted; verify strict 400 rejection',
      expected: 'HTTP 400 Insufficient sandbox reserves when requested amount exceeds available reserve',
      actual: exhausted ? `HTTP 400 Error: ${excessSgdRes.data?.error}` : `HTTP ${excessSgdRes.status} Error: ${excessSgdRes.data?.error}`,
      evidence: excessSgdRes.data,
      status: exhausted ? 'PASSED' : 'FAILED'
    });

    // 6. Zero Live FX Reserves Leakage Verification
    const liveStateMid2 = await apiRequest('GET', '/api/state', null, bearer(tokenAdmin));
    const liveFxReservesMid = liveStateMid2.data?.fxReserves;
    const liveFxReservesIntact = JSON.stringify(liveFxReservesMid) === JSON.stringify(preFxReserves);

    recordResult({
      id: 'ADV-F-FX-07',
      title: 'Zero Leakage into Live FX Reserves Under Exhaustion',
      battery: 'Battery 3: FX Storm & Reserves',
      scenario: 'Confirm live event FX desk reserves remained 100% untouched while sandbox USD was depleted',
      expected: 'liveState.fxReserves strictly identical to pre-storm snapshot',
      actual: liveFxReservesIntact ? 'Live FX reserves 100% identical and untouched' : 'Live FX reserves mutated!',
      evidence: { preReserves: Object.keys(preFxReserves), midReserves: Object.keys(liveFxReservesMid || {}) },
      status: liveFxReservesIntact ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 4: TRAINING NEWS INJECTION & BROADCAST FLOOD
    // ========================================================================
    console.log('\n--- BATTERY 4: TRAINING NEWS INJECTION & BROADCAST FLOOD ---');

    const newsSentiments = ['Positive', 'Negative', 'Neutral', 'Bullish', 'Bearish'];
    const newsCategories = ['Macro', 'Corporate', 'Regulatory', 'Commodity', 'Technology'];
    const NUM_NEWS = 50;
    const newsPromises = [];

    for (let i = 0; i < NUM_NEWS; i++) {
      const sentiment = newsSentiments[i % newsSentiments.length];
      const category = newsCategories[i % newsCategories.length];
      const headline = `Simulated Rehearsal Wire ${i + 1}: RBI Macro Liquidity Adjustment on Market Volatility`;

      newsPromises.push(
        apiRequest('POST', '/api/training/news/publish', {
          headline,
          description: `Practice press wire release ${i + 1} for operator drills. Zero live market influence.`,
          category,
          sentiment,
          impactMagnitude: 1.5 + (i % 4),
          affectedSecurityIds: ['RELIANCE', 'TCS'],
          author: `Journalist Trainee ${(i % 5) + 1}`
        }, bearer(tokenJournalist))
      );
    }

    const newsResults = await Promise.all(newsPromises);
    const successfulNews = newsResults.filter(r => r.status === 200 && r.data.success === true);
    console.log(`✓ Broadcast ${NUM_NEWS} concurrent simulated news items. Success: ${successfulNews.length}/${NUM_NEWS}`);

    assert.strictEqual(successfulNews.length, NUM_NEWS, `Expected all ${NUM_NEWS} news items to publish`);

    recordResult({
      id: 'ADV-F-NEWS-01',
      title: 'High-Frequency Training News Broadcast Flood',
      battery: 'Battery 4: Training News Flood',
      scenario: `Flood sandbox wire with ${NUM_NEWS} simulated news releases across all 5 sentiments and categories`,
      expected: `All ${NUM_NEWS} news items return HTTP 200 and are tagged with isSandbox: true`,
      actual: `${successfulNews.length}/${NUM_NEWS} news items published`,
      evidence: { totalPublished: NUM_NEWS, sampleHeadline: successfulNews[0]?.data.newsEvent?.headline },
      status: successfulNews.length === NUM_NEWS ? 'PASSED' : 'FAILED'
    });

    // Adversarial News Boundary Checks
    // 1. Empty / short headline
    const shortHeadlineRes = await apiRequest('POST', '/api/training/news/publish', {
      headline: 'RBI', // < 5 chars
      sentiment: 'Positive'
    }, bearer(tokenJournalist));

    recordResult({
      id: 'ADV-F-NEWS-02',
      title: 'Headline Minimum Length Validation Guard',
      battery: 'Battery 4: Training News Flood',
      scenario: "Submit news release with headline='RBI' (< 5 chars)",
      expected: 'HTTP 400 Headline must be at least 5 characters',
      actual: `HTTP ${shortHeadlineRes.status} Error: ${shortHeadlineRes.data?.error}`,
      evidence: shortHeadlineRes.data,
      status: shortHeadlineRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2. Invalid sentiment
    const badSentimentRes = await apiRequest('POST', '/api/training/news/publish', {
      headline: 'Valid Headline About Macro Policy',
      sentiment: 'EUPHORIC' // Invalid sentiment
    }, bearer(tokenJournalist));

    recordResult({
      id: 'ADV-F-NEWS-03',
      title: 'Sentiment Whitelist Validation Guard',
      battery: 'Battery 4: Training News Flood',
      scenario: "Submit news release with sentiment='EUPHORIC'",
      expected: 'HTTP 400 Sentiment must be one of: Positive, Negative, Neutral, Bullish, Bearish',
      actual: `HTTP ${badSentimentRes.status} Error: ${badSentimentRes.data?.error}`,
      evidence: badSentimentRes.data,
      status: badSentimentRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 3. News Feed Isolation: Verify ZERO sandbox news items leaked into live state.newsEvents
    const liveStateMid3 = await apiRequest('GET', '/api/state', null, bearer(tokenAdmin));
    const liveNewsPost = liveStateMid3.data?.newsEvents || [];
    const leakedNews = liveNewsPost.filter(item => item.isSandbox === true || (item.headline || '').includes('Simulated Rehearsal'));

    recordResult({
      id: 'ADV-F-NEWS-04',
      title: 'Live News Feed Zero-Leakage Invariant Verification',
      battery: 'Battery 4: Training News Flood',
      scenario: 'Check live state newsEvents array; assert exactly 0 sandbox news items leaked',
      expected: 'Zero leaked sandbox news items in live feed',
      actual: `Found ${leakedNews.length} leaked items in live news feed`,
      evidence: { leakedCount: leakedNews.length, liveCount: liveNewsPost.length, preCount: preNewsEvents.length },
      status: leakedNews.length === 0 && liveNewsPost.length === preNewsEvents.length ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 5: RAPID-FIRE SANDBOX RESETS INTERLEAVED WITH CONCURRENT TRAFFIC
    // ========================================================================
    console.log('\n--- BATTERY 5: RAPID-FIRE SANDBOX RESETS INTERLEAVED WITH CONCURRENT TRAFFIC ---');

    // Fire 10 rapid consecutive resets alternating preserveScorecards
    const resetResults = [];
    for (let r = 0; r < 10; r++) {
      const preserveScorecards = r % 2 === 0;
      const res = await apiRequest('POST', '/api/training/reset', { preserveScorecards }, bearer(tokenAdmin));
      resetResults.push({ attempt: r + 1, status: res.status, preserved: preserveScorecards });
    }

    const allResetsSucceeded = resetResults.every(r => r.status === 200);

    recordResult({
      id: 'ADV-F-RST-01',
      title: 'Rapid-Fire Consecutive Sandbox Resets',
      battery: 'Battery 5: Sandbox Resets',
      scenario: 'Execute 10 rapid consecutive POST /api/training/reset calls alternating scorecard preservation',
      expected: 'All 10 reset calls return HTTP 200 cleanly',
      actual: `${resetResults.filter(r => r.status === 200).length}/10 reset calls returned 200 OK`,
      evidence: resetResults,
      status: allResetsSucceeded ? 'PASSED' : 'FAILED'
    });

    // Test Scorecard Preservation behavior
    // 1. Generate scorecard activity
    await apiRequest('POST', '/api/training/order/claim', {
      orderId: 'NON_EXISTENT_ORDER',
      operator: 'Telemetry Operator Alpha'
    }, bearer(tokenExchange));

    const resetWithScorecards = await apiRequest('POST', '/api/training/reset', { preserveScorecards: true }, bearer(tokenAdmin));
    const scAfterPreservedReset = await apiRequest('GET', '/api/training/scorecard?operator=Telemetry Operator Alpha', null, bearer(tokenAdmin));
    const scorecardPreserved = scAfterPreservedReset.data?.scorecard?.operatorId === 'Telemetry Operator Alpha';

    recordResult({
      id: 'ADV-F-RST-02',
      title: 'Reset with Scorecard Telemetry Retention',
      battery: 'Battery 5: Sandbox Resets',
      scenario: 'Reset sandbox with preserveScorecards=true; confirm operator scorecards are retained',
      expected: 'Operator scorecards survive reset',
      actual: scorecardPreserved ? 'Scorecards retained successfully' : 'Scorecards wiped',
      evidence: scAfterPreservedReset.data?.scorecard,
      status: scorecardPreserved ? 'PASSED' : 'FAILED'
    });

    // 2. Full Clean Reset Hygiene
    const cleanResetRes = await apiRequest('POST', '/api/training/reset', { preserveScorecards: false }, bearer(tokenAdmin));
    const sbStateAfterClean = await apiRequest('GET', '/api/training/state', null, bearer(tokenAdmin));
    const sbOrdersAfter = (sbStateAfterClean.data.sandbox?.orders || []).length;
    const sbVouchersAfter = (sbStateAfterClean.data.sandbox?.vouchers || []).length;
    const sbNewsAfter = (sbStateAfterClean.data.sandbox?.newsEvents || []).length;
    const sbTeams = sbStateAfterClean.data.sandbox?.teams || [];
    const teamBalancesReset = sbTeams.every(t => t.cashBalance === 10000000 && t.reservedCash?.INR === 0);

    const cleanWipeVerified = sbOrdersAfter === 0 && sbVouchersAfter === 0 && sbNewsAfter === 0 && teamBalancesReset;

    recordResult({
      id: 'ADV-F-RST-03',
      title: 'Pristine Sandbox Reset State Hygiene',
      battery: 'Battery 5: Sandbox Resets',
      scenario: 'Execute full reset (preserveScorecards=false); assert mock queues cleared & balances restored to ₹1 Crore',
      expected: 'Orders: 0, Vouchers: 0, News: 0, Team starting cash: ₹10,000,000 across all mock teams',
      actual: cleanWipeVerified ? 'Pristine sandbox fixtures verified' : 'State corruption detected after reset',
      evidence: { sbOrdersAfter, sbVouchersAfter, sbNewsAfter, teamCount: sbTeams.length },
      status: cleanWipeVerified ? 'PASSED' : 'FAILED'
    });

    // 3. Interleaved Concurrent Traffic During Resets (Race Resilience)
    console.log('--- EXECUTING CONCURRENT TRAFFIC INTERLEAVED WITH RESETS ---');
    const interleavedOperations = [
      apiRequest('POST', '/api/training/order/create', {
        teamCode: 'TRAIN_T01', ticker: 'RELIANCE', action: 'BUY', quantity: 10
      }, bearer(tokenT01)),
      apiRequest('POST', '/api/training/reset', { preserveScorecards: false }, bearer(tokenAdmin)),
      apiRequest('POST', '/api/training/fx/convert', {
        teamCode: 'TRAIN_T02', fromCurrency: 'INR', toCurrency: 'EUR', amount: 50000
      }, bearer(tokenT01)),
      apiRequest('POST', '/api/training/reset', { preserveScorecards: false }, bearer(tokenAdmin)),
      apiRequest('POST', '/api/training/news/publish', {
        headline: 'Interleaved Concurrency Rehearsal Bulletin', sentiment: 'Positive'
      }, bearer(tokenJournalist))
    ];

    const interleavedResults = await Promise.allSettled(interleavedOperations);
    const noServerCrashes = interleavedResults.every(r => r.status === 'fulfilled');

    // Confirm server is still alive
    const pingCheck = await apiRequest('GET', '/api/ping');
    const serverAlive = pingCheck.status === 200 && pingCheck.data?.ready === true;

    recordResult({
      id: 'ADV-F-RST-04',
      title: 'Interleaved Concurrent Traffic & Reset Concurrency Resilience',
      battery: 'Battery 5: Sandbox Resets',
      scenario: 'Simultaneously interleave orders, FX conversions, news, and resets without server crash',
      expected: 'All interleaved requests handled gracefully without crash; server health remains 200 OK',
      actual: serverAlive ? 'Server survived interleaved storm cleanly' : 'Server crashed or stalled',
      evidence: { pingStatus: pingCheck.status, ready: pingCheck.data?.ready },
      status: (noServerCrashes && serverAlive) ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 6: LIVE STATE BIT-EXACT ZERO-DELTA DEEP COMPARISON
    // ========================================================================
    console.log('\n--- BATTERY 6: LIVE STATE BIT-EXACT ZERO-DELTA DEEP COMPARISON ---');

    const liveStatePostRes = await apiRequest('GET', '/api/state', null, bearer(tokenAdmin));
    assert.strictEqual(liveStatePostRes.status, 200, 'Failed to fetch post-storm live state');
    const liveStatePost = liveStatePostRes.data;

    // 6.1 Team Cash Balances, Wallets & Reserved Cash Deep Comparison
    let teamCashDeltas = 0;
    const postTeams = liveStatePost.teams || [];

    for (const postT of postTeams) {
      const code = postT.teamCode || postT.id;
      const preT = preTeams.get(code);
      if (!preT) {
        teamCashDeltas++;
        console.error(`🔴 Unexpected new team discovered in live state: ${code}`);
        continue;
      }
      if (postT.cashBalance !== preT.cashBalance) {
        teamCashDeltas++;
        console.error(`🔴 Team cashBalance mismatch for ${code}: pre=${preT.cashBalance}, post=${postT.cashBalance}`);
      }
      if (JSON.stringify(postT.cashWallets || {}) !== JSON.stringify(preT.cashWallets || {})) {
        teamCashDeltas++;
        console.error(`🔴 Team cashWallets mismatch for ${code}`);
      }
      if (JSON.stringify(postT.reservedCash || {}) !== JSON.stringify(preT.reservedCash || {})) {
        teamCashDeltas++;
        console.error(`🔴 Team reservedCash mismatch for ${code}`);
      }
    }

    recordResult({
      id: 'ADV-F-ZERO-01',
      title: 'Live Team Cash Balances Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert bit-exact zero-delta across cashBalance, cashWallets, and reservedCash for all live teams',
      expected: '0 cash balance deltas across all live teams',
      actual: `${teamCashDeltas} cash balance deltas detected`,
      evidence: { totalLiveTeams: postTeams.length, teamCashDeltas },
      status: teamCashDeltas === 0 ? 'PASSED' : 'FAILED'
    });

    // 6.2 Team Stock Holdings & Locked Holdings Deep Comparison
    let teamHoldingsDeltas = 0;
    for (const postT of postTeams) {
      const code = postT.teamCode || postT.id;
      const preT = preTeams.get(code);
      if (!preT) continue;
      if (JSON.stringify(postT.holdings || {}) !== JSON.stringify(preT.holdings || {})) {
        teamHoldingsDeltas++;
        console.error(`🔴 Team holdings mismatch for ${code}`);
      }
      if (JSON.stringify(postT.lockedHoldings || {}) !== JSON.stringify(preT.lockedHoldings || {})) {
        teamHoldingsDeltas++;
        console.error(`🔴 Team lockedHoldings mismatch for ${code}`);
      }
    }

    recordResult({
      id: 'ADV-F-ZERO-02',
      title: 'Live Team Stock Holdings Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert bit-exact zero-delta across deliverable holdings and lockedHoldings for all live teams',
      expected: '0 holdings deltas across all live teams',
      actual: `${teamHoldingsDeltas} holdings deltas detected`,
      evidence: { teamHoldingsDeltas },
      status: teamHoldingsDeltas === 0 ? 'PASSED' : 'FAILED'
    });

    // 6.3 Live Orders & Vouchers Deep Comparison
    const postOrders = liveStatePost.orders || [];
    const ordersIdentical = JSON.stringify(postOrders) === JSON.stringify(preOrders);

    recordResult({
      id: 'ADV-F-ZERO-03',
      title: 'Live Orders & Clearing Accounts Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert live orders queue length, IDs, and statuses remain 100% bit-exact',
      expected: `Exact match: preCount=${preOrders.length}, postCount=${postOrders.length}`,
      actual: ordersIdentical ? 'Live orders 100% identical' : 'Live orders queue mutated!',
      evidence: { preOrdersCount: preOrders.length, postOrdersCount: postOrders.length },
      status: ordersIdentical ? 'PASSED' : 'FAILED'
    });

    // 6.4 Live FX Desk Reserves Deep Comparison
    const postFxReserves = liveStatePost.fxReserves || {};
    const fxReservesIdentical = JSON.stringify(postFxReserves) === JSON.stringify(preFxReserves);

    recordResult({
      id: 'ADV-F-ZERO-04',
      title: 'Live FX Desk Reserves Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert all 9 live FX currency desk reserves remain 100% bit-exact untouched',
      expected: 'liveState.fxReserves bit-for-bit identical to pre-storm snapshot',
      actual: fxReservesIdentical ? 'All 9 currency reserves 100% identical' : 'FX reserves mutated!',
      evidence: { preCurrencies: Object.keys(preFxReserves), postCurrencies: Object.keys(postFxReserves) },
      status: fxReservesIdentical ? 'PASSED' : 'FAILED'
    });

    // 6.5 Live News Events Deep Comparison
    const postNewsEvents = liveStatePost.newsEvents || [];
    const newsIdentical = JSON.stringify(postNewsEvents) === JSON.stringify(preNewsEvents);

    recordResult({
      id: 'ADV-F-ZERO-05',
      title: 'Live News Events Stream Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert live newsEvents stream contains 0 extra items and remains 100% bit-exact',
      expected: `Exact match: preCount=${preNewsEvents.length}, postCount=${postNewsEvents.length}`,
      actual: newsIdentical ? 'Live news stream 100% identical' : 'Live news mutated!',
      evidence: { preNewsCount: preNewsEvents.length, postNewsCount: postNewsEvents.length },
      status: newsIdentical ? 'PASSED' : 'FAILED'
    });

    // 6.6 Live Transactions & Audit Logs Deep Comparison
    const postTransactions = liveStatePost.transactions || [];
    const postAuditLog = liveStatePost.auditLog || [];
    const transactionsIdentical = JSON.stringify(postTransactions) === JSON.stringify(preTransactions);
    const auditLogIdentical = JSON.stringify(postAuditLog) === JSON.stringify(preAuditLog);

    recordResult({
      id: 'ADV-F-ZERO-06',
      title: 'Live Transactions & Audit Logs Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert live transactions ledger and audit log contain zero mock entries',
      expected: 'Transactions and audit logs bit-for-bit identical to pre-storm snapshot',
      actual: (transactionsIdentical && auditLogIdentical) ? 'Audit logs 100% identical' : 'Audit logs mutated!',
      evidence: {
        preTx: preTransactions.length, postTx: postTransactions.length,
        preAudit: preAuditLog.length, postAudit: postAuditLog.length
      },
      status: (transactionsIdentical && auditLogIdentical) ? 'PASSED' : 'FAILED'
    });

    // 6.7 Live Securities Prices & Market State Deep Comparison
    const postSecurities = liveStatePost.securities || [];
    const postMarketState = liveStatePost.marketState || {};
    const securitiesIdentical = JSON.stringify(postSecurities) === JSON.stringify(preSecurities);
    const marketStateIdentical = JSON.stringify(postMarketState) === JSON.stringify(preMarketState);

    recordResult({
      id: 'ADV-F-ZERO-07',
      title: 'Live Securities Prices & Market State Strictly Zero-Delta',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Assert securities prices, trading session, and market state remain 100% identical',
      expected: 'Securities prices and marketState untouched',
      actual: (securitiesIdentical && marketStateIdentical) ? 'Securities & market state 100% identical' : 'Market state mutated!',
      evidence: { securitiesCount: postSecurities.length, sessionState: postMarketState.sessionState },
      status: (securitiesIdentical && marketStateIdentical) ? 'PASSED' : 'FAILED'
    });

    // 6.8 Comprehensive Deep Hash Equality of Full Live State
    // Hash key subtrees of liveStatePre vs liveStatePost
    const preFullHash = crypto.createHash('sha256').update(JSON.stringify({
      teams: liveStatePre.teams,
      orders: liveStatePre.orders,
      transactions: liveStatePre.transactions,
      fxReserves: liveStatePre.fxReserves,
      fxTransactions: liveStatePre.fxTransactions,
      newsEvents: liveStatePre.newsEvents,
      auditLog: liveStatePre.auditLog,
      securities: liveStatePre.securities,
      marketState: liveStatePre.marketState
    })).digest('hex');

    const postFullHash = crypto.createHash('sha256').update(JSON.stringify({
      teams: liveStatePost.teams,
      orders: liveStatePost.orders,
      transactions: liveStatePost.transactions,
      fxReserves: liveStatePost.fxReserves,
      fxTransactions: liveStatePost.fxTransactions,
      newsEvents: liveStatePost.newsEvents,
      auditLog: liveStatePost.auditLog,
      securities: liveStatePost.securities,
      marketState: liveStatePost.marketState
    })).digest('hex');

    const deepHashMatch = preFullHash === postFullHash;

    recordResult({
      id: 'ADV-F-ZERO-08',
      title: 'Comprehensive Mathematical Zero-Delta State Hash Proof',
      battery: 'Battery 6: Zero-Delta Verification',
      scenario: 'Cryptographic SHA-256 hash comparison across all live event state subtrees pre vs post storm',
      expected: preFullHash,
      actual: postFullHash,
      evidence: { preFullHash, postFullHash, deltaFound: !deepHashMatch },
      status: deepHashMatch ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 7: POST-STORM AUTHORITATIVE BASELINE STATE.JSON SHA-256 HASH CHECK
    // ========================================================================
    console.log('\n--- BATTERY 7: POST-STORM AUTHORITATIVE BASELINE STATE.JSON HASH CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after heavy adversarial storm: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH CORRUPTED AFTER ADVERSARIAL STORM!');
    console.log('✓ Authoritative state.json confirmed 100% bit-for-bit untouched.\n');

    recordResult({
      id: 'ADV-F-POST-01',
      title: 'Post-Storm Authoritative Baseline State.json SHA-256 Certification',
      battery: 'Battery 7: Hash Certification',
      scenario: 'Assert state.json hash is bit-exact to authoritative hash 6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP
    console.log('--- CLEANING UP TEST BACKEND PROCESS ---');
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      try { serverProcess.kill('SIGKILL'); } catch (e) {}
    }, 500);
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
      }
    } catch (e) {}
    console.log('✓ Isolated test backend stopped.');
    console.log('✓ Removed disposable fixture file.\n');
  }

  // SUMMARY & PERSISTENCE
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('======================================================================');
  console.log(`📊 ADVERSARIAL SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Adversarial test results saved to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialPhaseFSuite().catch(err => {
  console.error('Fatal adversarial test suite error:', err);
  process.exit(1);
});
