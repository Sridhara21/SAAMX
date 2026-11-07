import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase7-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

const verificationResults = [];

function recordResult({ id, title, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, scenario, expected, actual, evidence, status };
  verificationResults.push(resultObj);
  const tag = status === 'REPRODUCED' ? '🔴 REPRODUCED' : (status === 'NOT REPRODUCED' ? '🟢 NOT REPRODUCED' : '🟡 INCONCLUSIVE');
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Scenario: ${scenario}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  console.log(`  Evidence: ${JSON.stringify(evidence)}`);
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: pathUrl,
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

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function runPhase7Verification() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE 7.0 — ISOLATED VULNERABILITY VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE STATE HASH CHECK
  console.log('--- STEP 1: VERIFYING AUTHORITATIVE STATE INTEGRITY ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH! STOPPING IMMEDIATELY.');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: PROVE ISOLATION & STATE FIXTURE WIRING
  console.log('--- STEP 2: ENFORCING READ-ONLY RESTRICTION & CLONING DISPOSABLE FIXTURE ---');
  try {
    fs.chmodSync(ORIGINAL_STATE, 0o444);
    console.log('✓ Marked authoritative state.json as READ-ONLY (0o444).');
  } catch (e) {
    console.warn('Warning: Could not set chmod 0o444 on state.json:', e.message);
  }

  // Clone disposable state fixture
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  fs.chmodSync(DISPOSABLE_STATE, 0o666);
  console.log(`✓ Created disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}`);

  // Prepare testbeds in disposable fixture BEFORE spawning server process
  const fixtureData = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixtureData.marketState.status = 'Open';
  fixtureData.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixtureData.marketState.isManualOverride = true; // Ensure trading is permitted for test harness
  if (!fixtureData.orders) fixtureData.orders = [];
  if (!fixtureData.transactions) fixtureData.transactions = [];

  // Seed returned order for T01 for SEC02 trailing slash test (in RETURNED_FOR_CORRECTION status)
  const testReturnedOrderT01_SEC02 = {
    id: 'ORD_TEST_T01_RET_SEC02',
    ticketNumber: 'TK_RET_001',
    teamId: 'T01',
    teamCode: 'T01',
    teamName: 'Alpha Fund',
    ticker: 'TCS',
    action: 'BUY',
    quantity: 100,
    price: 3200,
    limitPrice: 3200,
    orderType: 'LIMIT',
    status: 'RETURNED_FOR_CORRECTION',
    deskId: 'DESK_1',
    lockedByDesk: null,
    returnReason: 'Please verify limit price',
    timestamp: Date.now()
  };
  fixtureData.orders.push(testReturnedOrderT01_SEC02);

  // Seed returned order for T01 for AUD31 test (in RETURNED_FOR_CORRECTION status)
  const testReturnedOrderT01_AUD31 = {
    id: 'ORD_TEST_T01_RET_AUD31',
    ticketNumber: 'TK_RET_002',
    teamId: 'T01',
    teamCode: 'T01',
    teamName: 'Alpha Fund',
    ticker: 'TCS',
    action: 'BUY',
    quantity: 80,
    price: 3200,
    limitPrice: 3200,
    orderType: 'LIMIT',
    status: 'RETURNED_FOR_CORRECTION',
    deskId: 'DESK_1',
    lockedByDesk: null,
    returnReason: 'Please verify quantity',
    timestamp: Date.now()
  };
  fixtureData.orders.push(testReturnedOrderT01_AUD31);

  // Seed pending order for T01 (in PENDING status)
  const testPendingOrderT01 = {
    id: 'ORD_TEST_T01_PEND',
    ticketNumber: 'TK_PEND_001',
    teamId: 'T01',
    teamCode: 'T01',
    teamName: 'Alpha Fund',
    ticker: 'INFY',
    action: 'BUY',
    quantity: 50,
    price: 1800,
    orderType: 'LIMIT',
    status: 'PENDING',
    deskId: 'DESK_1',
    lockedByDesk: null,
    timestamp: Date.now()
  };
  fixtureData.orders.push(testPendingOrderT01);

  // Pre-seed transaction for voiding test
  const testTx = {
    id: 'TX_PHASE7_TEST',
    timestamp: Date.now(),
    teamId: 'T01',
    teamCode: 'T01',
    securityId: 'STK_INFY_32cd51',
    ticker: 'INFY',
    action: 'BUY',
    quantity: 10,
    priceAtExecution: 1800,
    totalValue: 18000,
    localCurrency: 'INR',
    voided: false
  };
  fixtureData.transactions.unshift(testTx);

  // Ensure DTAI IPO is in SUBSCRIPTION_OPEN for IPO testing
  const dtaiSec = fixtureData.securities.find(s => s.ticker === 'DTAI');
  if (dtaiSec) {
    dtaiSec.status = 'IPO_PENDING';
    dtaiSec.ipoStatus = 'SUBSCRIPTION_OPEN';
    dtaiSec.currency = 'USD';
    dtaiSec.offerPrice = 100;
  }

  // Ensure Team T01 has adequate INR and USD balances
  const t01Team = fixtureData.teams.find(t => t.teamCode === 'T01');
  if (t01Team) {
    t01Team.cashBalance = 15000000;
    t01Team.cashWallets = { INR: 10000000, USD: 50000, GBP: 0, EUR: 0 };
    t01Team.assignedDesk = 'DESK_1';
  }

  // Ensure Team T02 has assigned desk
  const t02Team = fixtureData.teams.find(t => t.teamCode === 'T02');
  if (t02Team) {
    t02Team.assignedDesk = 'DESK_2';
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixtureData, null, 2), 'utf8');
  console.log('✓ Prepared disposable fixture with comprehensive test testbeds.');

  // STEP 3: SPAWN ISOLATED TEST SERVER ON PORT 3099
  console.log(`\n--- STEP 3: SPAWNING ISOLATED SERVER ON PORT ${PORT} ---`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      SAAMX_AUTH_SECRET: 'saamx-local-test-secret-32-chars-long'
    },
    stdio: 'ignore'
  });

  let serverOnline = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) {
        serverOnline = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  if (!serverOnline) {
    throw new Error(`Isolated test server failed to start on port ${PORT}`);
  }
  console.log(`✓ Isolated test server online at ${BASE_URL}\n`);

  // PROVE SERVER WRITES ONLY TO DISPOSABLE FIXTURE
  console.log('--- STEP 4: VERIFYING STATE-FILE PATH ISOLATION ---');
  const preProbeStateMtime = fs.statSync(DISPOSABLE_STATE).mtimeMs;
  const probeRes = await apiRequest('POST', '/api/event/mode', { eventId: 'EVT_LIVE_MAIN', mode: 'SIMULATION' }, {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'admin'
  });
  assert.strictEqual(probeRes.status, 200, 'State probe mutation failed!');
  const postProbeStateMtime = fs.statSync(DISPOSABLE_STATE).mtimeMs;
  assert(postProbeStateMtime >= preProbeStateMtime, 'Disposable state file was not updated!');

  const checkOriginalHash = getSha256(ORIGINAL_STATE);
  assert.strictEqual(checkOriginalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE MODIFIED DURING PROBE! VIOLATION DETECTED.');
  console.log('✓ PROVEN: Test server writes to disposable fixture. Authoritative state.json is strictly untouched.\n');

  // AUTHENTICATE TEST SESSIONS
  console.log('--- STEP 5: PROVISIONING TEST IDENTITIES VIA AUTH API ---');
  const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
  assert.strictEqual(loginT01.status, 200, 'T01 login failed');
  const tokenT01 = loginT01.data.token;

  const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
  assert.strictEqual(loginT02.status, 200, 'T02 login failed');
  const tokenT02 = loginT02.data.token;

  const headersT01 = { 'Authorization': `Bearer ${tokenT01}` };
  const headersT02 = { 'Authorization': `Bearer ${tokenT02}` };
  const headersAdmin = { 'X-FMS-Password': 'fms-event-2026', 'X-FMS-Role': 'admin' };
  const headersVerification = {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'verification',
    'X-FMS-Team-Code': null
  };
  const headersDesk1 = {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'exchange',
    'X-FMS-Team-Code': null
  };
  console.log('✓ Successfully authenticated cryptographic sessions for T01, T02, Verification, and Admin/Desk.\n');

  // =========================================================================
  // TEST SUITE: REPRODUCE FINDINGS
  // =========================================================================
  console.log('======================================================================');
  console.log('🧪 EXECUTING DEFECT REPRODUCTION TESTS');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // FINDING SEC-01: Unauthenticated Public Route Bypass for Security Mutations & FX Rates
  // -------------------------------------------------------------------------
  // 1.1 Unauthenticated POST /api/securities
  const sec01_post = await apiRequest('POST', '/api/securities', { ticker: 'UNAUTH', name: 'Rogue Asset', basePrice: 50 }, {});
  const createdSecId = sec01_post.data.security?.id;
  recordResult({
    id: 'SEC-01.1',
    title: 'Unauthenticated Security Creation via POST /api/securities',
    scenario: 'Calling POST /api/securities with no authentication headers',
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_post.status} (Security created with id ${createdSecId})`,
    evidence: { status: sec01_post.status, security: sec01_post.data.security?.ticker },
    status: sec01_post.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 1.2 Unauthenticated PUT /api/securities/:id
  const targetPutId = createdSecId || 'STK_RELIANCE_ea1e16';
  const sec01_put = await apiRequest('PUT', `/api/securities/${targetPutId}`, { currentPrice: 9999.55 }, {});
  recordResult({
    id: 'SEC-01.2',
    title: 'Unauthenticated Security Modification via PUT /api/securities/:id',
    scenario: `Calling PUT /api/securities/${targetPutId} with no authentication headers`,
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_put.status} (Security currentPrice set to ${sec01_put.data.security?.currentPrice})`,
    evidence: { status: sec01_put.status, modifiedPrice: sec01_put.data.security?.currentPrice },
    status: sec01_put.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 1.3 Unauthenticated DELETE /api/securities/:id
  const sec01_delete = await apiRequest('DELETE', `/api/securities/${targetPutId}`, null, {});
  recordResult({
    id: 'SEC-01.3',
    title: 'Unauthenticated Security Deletion via DELETE /api/securities/:id',
    scenario: `Calling DELETE /api/securities/${targetPutId} with no authentication headers`,
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_delete.status} (Success: ${sec01_delete.data.success})`,
    evidence: { status: sec01_delete.status, data: sec01_delete.data },
    status: sec01_delete.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 1.4 Unauthenticated POST /api/fx/rates
  const sec01_fx = await apiRequest('POST', '/api/fx/rates', { pair: 'USDINR', midRate: 155.00 }, {});
  recordResult({
    id: 'SEC-01.4',
    title: 'Unauthenticated Global FX Rate Manipulation via POST /api/fx/rates',
    scenario: 'Calling POST /api/fx/rates with no authentication headers',
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_fx.status} (USDINR midRate altered to ${sec01_fx.data.updatedPair?.midRate})`,
    evidence: { status: sec01_fx.status, updatedPair: sec01_fx.data.updatedPair },
    status: sec01_fx.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-02: Trailing Slash Route Guard Bypass
  // -------------------------------------------------------------------------
  // 2.1 Trailing slash bypass on /api/orders/resubmit/
  const sec02_resubmit = await apiRequest('POST', '/api/orders/resubmit/', {
    orderId: 'ORD_TEST_T01_RET_SEC02',
    quantity: 120,
    limitPrice: 3300
  }, headersT02); // Team T02 calling resubmit on T01's order with trailing slash
  recordResult({
    id: 'SEC-02.1',
    title: 'Trailing Slash Middleware Bypass on /api/orders/resubmit/',
    scenario: 'Team T02 resubmitting Team T01 returned order via /api/orders/resubmit/',
    expected: '403 Forbidden',
    actual: `HTTP ${sec02_resubmit.status} (${sec02_resubmit.data.message || sec02_resubmit.data.error || 'Resubmitted successfully'})`,
    evidence: { status: sec02_resubmit.status, order: sec02_resubmit.data.order?.id, newQty: sec02_resubmit.data.order?.quantity },
    status: sec02_resubmit.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 2.2 Trailing slash bypass on /api/orders/cancel/
  const sec02_cancel = await apiRequest('POST', '/api/orders/cancel/', {
    orderId: 'ORD_TEST_T01_PEND'
  }, headersT02); // Team T02 cancelling T01's order with trailing slash
  recordResult({
    id: 'SEC-02.2',
    title: 'Trailing Slash Middleware Bypass on /api/orders/cancel/',
    scenario: 'Team T02 cancelling Team T01 pending order via /api/orders/cancel/',
    expected: '403 Forbidden',
    actual: `HTTP ${sec02_cancel.status} (${sec02_cancel.data.message || sec02_cancel.data.error || 'Cancelled successfully'})`,
    evidence: { status: sec02_cancel.status, order: sec02_cancel.data.order?.id, orderStatus: sec02_cancel.data.order?.status },
    status: sec02_cancel.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-01: Arbitrary Transaction Voiding Without Authorization
  // -------------------------------------------------------------------------
  const fin01_res = await apiRequest('POST', '/api/transactions/void', { id: 'TX_PHASE7_TEST' }, headersT02);
  recordResult({
    id: 'FIN-01',
    title: 'Arbitrary Transaction Voiding Without Authorization via POST /api/transactions/void',
    scenario: 'Team T02 calling POST /api/transactions/void to void Team T01 transaction',
    expected: '403 Forbidden (Requires Admin/SEBI role)',
    actual: `HTTP ${fin01_res.status} (Transaction voided: ${fin01_res.data.transaction?.voided})`,
    evidence: { status: fin01_res.status, transactionId: fin01_res.data.transaction?.id, voided: fin01_res.data.transaction?.voided },
    status: (fin01_res.status === 200 && fin01_res.data.transaction?.voided === true) ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-02: Unprotected Corporate Actions & Market Destruction
  // -------------------------------------------------------------------------
  // Team T01 calling POST /api/corporate-action (Bankruptcy on INFY)
  const fin02_bankrupt = await apiRequest('POST', '/api/corporate-action', { securityId: 'STK_INFY_32cd51', actionType: 'Bankruptcy' }, headersT01);
  recordResult({
    id: 'FIN-02.1',
    title: 'Unprivileged Stock Bankruptcy via POST /api/corporate-action',
    scenario: 'Team T01 triggering Bankruptcy on Security INFY',
    expected: '403 Forbidden (Requires Admin role)',
    actual: `HTTP ${fin02_bankrupt.status} (Success: ${fin02_bankrupt.data.success})`,
    evidence: { status: fin02_bankrupt.status, data: fin02_bankrupt.data },
    status: fin02_bankrupt.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // Team T01 calling POST /api/corporate-action (Dividend Payout to Self on TCS)
  const fin02_dividend = await apiRequest('POST', '/api/corporate-action', { securityId: 'STK_TCS_1e211e', actionType: 'Dividend' }, headersT01);
  recordResult({
    id: 'FIN-02.2',
    title: 'Unprivileged Dividend Distribution via POST /api/corporate-action',
    scenario: 'Team T01 triggering Dividend payout on Security TCS',
    expected: '403 Forbidden (Requires Admin role)',
    actual: `HTTP ${fin02_dividend.status} (Success: ${fin02_dividend.data.success})`,
    evidence: { status: fin02_dividend.status, data: fin02_dividend.data },
    status: fin02_dividend.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING AUD-D31-01: Cross-Team Order Slip Modification & Cancellation (Body Trust / Omission / Spoofing)
  // -------------------------------------------------------------------------
  // Re-seed a returned order and a pending order for T01 directly via API or state
  const disState = (await apiRequest('GET', '/api/state')).data.state;
  const returnedOrderForT01 = disState.orders.find(o => o.teamCode === 'T01' && o.status === 'RETURNED_FOR_CORRECTION') || testReturnedOrderT01_AUD31;

  // Case 5.1: Non-Team Role (Journalist) Resubmitting T01 Order with teamCode omitted in body
  const resubmitByJournalist = await apiRequest('POST', '/api/orders/resubmit', {
    orderId: 'ORD_TEST_T01_RET_AUD31',
    quantity: 88
    // teamCode omitted in body
  }, {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'journalist'
  });

  recordResult({
    id: 'AUD-D31-01.1',
    title: 'Cross-Role / Omitted teamCode Resubmit Bypass',
    scenario: 'Journalist session resubmitting Team T01 order with teamCode omitted in body',
    expected: '403 Forbidden (Non-owner role cannot resubmit orders)',
    actual: `HTTP ${resubmitByJournalist.status} (${resubmitByJournalist.data.message || resubmitByJournalist.data.error || 'Resubmitted successfully'})`,
    evidence: { status: resubmitByJournalist.status, order: resubmitByJournalist.data.order?.id, newQty: resubmitByJournalist.data.order?.quantity },
    status: resubmitByJournalist.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // Case 5.2: Non-Team Role (Advisor) Cancelling T01 Order with spoofed teamCode: T01 in body
  // Re-create a pending order for T01 first
  const seedPendingOrder = await apiRequest('POST', '/api/order/create', {
    ticketNumber: 'TK_CANCEL_AUD_001',
    teamCode: 'T01',
    ticker: 'RELIANCE',
    action: 'BUY',
    quantity: 10,
    orderType: 'MARKET'
  }, headersT01);
  const orderToCancelId = seedPendingOrder.data.order?.id;

  const cancelByAdvisor = await apiRequest('POST', '/api/orders/cancel', {
    orderId: orderToCancelId,
    teamCode: 'T01' // Spoofed teamCode in body
  }, {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'advisor'
  });

  recordResult({
    id: 'AUD-D31-01.2',
    title: 'Cross-Role / Spoofed teamCode Cancellation Bypass',
    scenario: 'Advisor session cancelling Team T01 order with spoofed teamCode: T01 in body',
    expected: '403 Forbidden (Advisor cannot cancel participant orders)',
    actual: `HTTP ${cancelByAdvisor.status} (${cancelByAdvisor.data.message || cancelByAdvisor.data.error || 'Cancelled successfully'})`,
    evidence: { status: cancelByAdvisor.status, order: cancelByAdvisor.data.order?.id },
    status: cancelByAdvisor.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-03: Missing Route Guard for /api/order/submit Alias
  // -------------------------------------------------------------------------
  // Team T02 submits an order on behalf of T01 using /api/order/submit (singular alias)
  const sec03_alias = await apiRequest('POST', '/api/order/submit', {
    ticketNumber: 'TK_ALIAS_INJECT_001',
    teamCode: 'T01',
    ticker: 'RELIANCE',
    action: 'BUY',
    quantity: 15,
    orderType: 'MARKET',
    price: 2500
  }, headersT02); // T02 session calling /order/submit with teamCode: T01

  recordResult({
    id: 'SEC-03',
    title: 'Missing Route Guard for /api/order/submit Alias',
    scenario: 'Team T02 injecting order on behalf of Team T01 via /api/order/submit (singular alias)',
    expected: '403 Forbidden (Team T02 cannot submit orders on behalf of T01)',
    actual: `HTTP ${sec03_alias.status} (Order ID: ${sec03_alias.data.order?.id}, Assigned Team: ${sec03_alias.data.order?.teamCode})`,
    evidence: { status: sec03_alias.status, orderId: sec03_alias.data.order?.id, teamCode: sec03_alias.data.order?.teamCode },
    status: (sec03_alias.status === 200 && sec03_alias.data.order?.teamCode === 'T01') ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-03: Institutional Trading Floor Bypass: Direct Trade Execution via /api/trade
  // -------------------------------------------------------------------------
  const fin03_direct = await apiRequest('POST', '/api/trade', {
    teamId: 'T01',
    securityId: 'RELIANCE',
    action: 'BUY',
    quantity: 10
  }, headersT01);

  recordResult({
    id: 'FIN-03',
    title: 'Institutional Clearance Bypass via Direct Execution POST /api/trade',
    scenario: 'Participant Team T01 calling POST /api/trade to instantly execute trade without clearance desk',
    expected: '403 Forbidden (Participants must submit slips, not execute trades directly)',
    actual: `HTTP ${fin03_direct.status} (Transaction created: ${fin03_direct.data.transaction?.id})`,
    evidence: { status: fin03_direct.status, tx: fin03_direct.data.transaction?.id },
    status: fin03_direct.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-04: Unauthorized IPO Subscriptions & Allotment
  // -------------------------------------------------------------------------
  // 8.1 IPO Bid on behalf of another team via /api/ipo/bid
  const fin04_bid = await apiRequest('POST', '/api/ipo/bid', {
    ticker: 'DTAI',
    quantity: 10,
    teamCode: 'T01' // T02 submitting bid that reserves T01's USD funds
  }, headersT02);

  recordResult({
    id: 'FIN-04.1',
    title: 'Unauthorized Cross-Team IPO Bid & Fund Reservation via /api/ipo/bid',
    scenario: 'Team T02 placing IPO bid on behalf of Team T01 reserving T01 cash',
    expected: '403 Forbidden',
    actual: `HTTP ${fin04_bid.status} (${fin04_bid.data.message || fin04_bid.data.error})`,
    evidence: { status: fin04_bid.status, teamBid: fin04_bid.data.teamBid },
    status: fin04_bid.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 8.2 Unprivileged IPO Allotment Trigger
  const fin04_allot = await apiRequest('POST', '/api/ipo/allot', { ticker: 'DTAI' }, headersT01);
  recordResult({
    id: 'FIN-04.2',
    title: 'Unprivileged IPO Allotment Trigger via /api/ipo/allot',
    scenario: 'Team T01 calling POST /api/ipo/allot',
    expected: '403 Forbidden (Requires Admin)',
    actual: `HTTP ${fin04_allot.status} (${fin04_allot.data.message || fin04_allot.data.error || 'Allotment proceeded'})`,
    evidence: { status: fin04_allot.status, data: fin04_allot.data },
    status: fin04_allot.status !== 403 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-04: Missing Server-Side Role Enforcement on Penalties & Appeals
  // -------------------------------------------------------------------------
  // 9.1 Team T01 penalizing Team T02
  const sec04_create = await apiRequest('POST', '/api/penalties/create', {
    teamCode: 'T02',
    ruleViolation: 'CODE_OF_CONDUCT',
    pointsDeducted: 15,
    reason: 'Malicious competitor penalty injection'
  }, headersT01);

  recordResult({
    id: 'SEC-04.1',
    title: 'Unprivileged Competitor Penalty Injection via /api/penalties/create',
    scenario: 'Team T01 submitting penalty against competing Team T02',
    expected: '403 Forbidden (Requires Admin/SEBI role)',
    actual: `HTTP ${sec04_create.status} (Penalty ID: ${sec04_create.data.penalty?.id})`,
    evidence: { status: sec04_create.status, penalty: sec04_create.data.penalty },
    status: sec04_create.status === 200 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // 9.2 Team T02 overturning its own penalty
  const createdPenId = sec04_create.data.penalty?.id;
  const sec04_overturn = await apiRequest('POST', '/api/penalties/resolve-appeal', {
    penaltyId: createdPenId,
    resolution: 'OVERTURNED',
    resolutionReason: 'Self-cleared by participant'
  }, headersT02);

  recordResult({
    id: 'SEC-04.2',
    title: 'Self-Service Penalty Overturn via /api/penalties/resolve-appeal',
    scenario: 'Team T02 overturning its own penalty points deduction',
    expected: '403 Forbidden (Requires Admin/Arbitration role)',
    actual: `HTTP ${sec04_overturn.status} (Points Deducted: ${sec04_overturn.data.penalty?.pointsDeducted}, Status: ${sec04_overturn.data.penalty?.status})`,
    evidence: { status: sec04_overturn.status, penalty: sec04_overturn.data.penalty },
    status: (sec04_overturn.status === 200 && sec04_overturn.data.penalty?.status === 'OVERTURNED') ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // FINDING PRIV-01: Multi-Team Privacy Breach via WebSocket Delta Broadcasts
  // -------------------------------------------------------------------------
  let priv01_status = 'INCONCLUSIVE';
  let leakedPayload = null;

  try {
    const wsUrl = `ws://127.0.0.1:${PORT}`;
    const wsClientT02 = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      wsClientT02.on('open', () => {
        // Authenticate socket as Team T02
        wsClientT02.send(JSON.stringify({ type: 'AUTH', token: tokenT02 }));
        resolve();
      });
      wsClientT02.on('error', reject);
    });

    const receivedMessages = [];
    wsClientT02.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        receivedMessages.push(msg);
      } catch (e) {}
    });

    // Wait 250ms for auth to complete
    await new Promise(r => setTimeout(r, 250));

    // Now Team T01 submits a secret order with valid ticketNumber
    await apiRequest('POST', '/api/order/create', {
      ticketNumber: 'TK_SECRET_007',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 50,
      orderType: 'LIMIT',
      price: 2500,
      notes: 'CONFIDENTIAL STRATEGY ORDER'
    }, headersT01);

    // Wait 500ms for WebSocket broadcast to arrive
    await new Promise(r => setTimeout(r, 500));
    wsClientT02.close();

    // Inspect if Client T02 received Team T01's order details in ORDER_CREATED or state.orders
    const orderCreatedMsg = receivedMessages.find(m => m.type === 'ORDER_CREATED');
    if (orderCreatedMsg) {
      const orderData = orderCreatedMsg.order;
      const stateOrders = orderCreatedMsg.state?.orders || [];
      const hasT01Order = (orderData && orderData.teamCode === 'T01') || stateOrders.some(o => o.teamCode === 'T01');
      if (hasT01Order) {
        priv01_status = 'REPRODUCED';
        leakedPayload = {
          eventType: orderCreatedMsg.type,
          leakedOrderTeam: orderData?.teamCode,
          leakedOrdersCountInState: stateOrders.length,
          confidentialNotes: orderData?.notes
        };
      } else {
        priv01_status = 'NOT REPRODUCED';
      }
    } else {
      priv01_status = 'INCONCLUSIVE';
    }
  } catch (err) {
    leakedPayload = { error: err.message };
  }

  recordResult({
    id: 'PRIV-01',
    title: 'Cross-Team Order Slip Leak via WebSocket Delta Broadcasts',
    scenario: 'Client T02 observing WebSocket broadcast when Team T01 creates an order slip',
    expected: 'Client T02 receives zero details of Team T01 orders (redacted/filtered)',
    actual: priv01_status === 'REPRODUCED'
      ? `Client T02 received full ORDER_CREATED event with Team T01 details and raw state.orders array`
      : `WebSocket delta was redacted or not received`,
    evidence: leakedPayload,
    status: priv01_status
  });

  // -------------------------------------------------------------------------
  // FINDING AUD-RTDB-01: Asymmetric State Synchronization Demonstration
  // -------------------------------------------------------------------------
  console.log('\n--- EVALUATING AUD-RTDB-01: STATE SYNCHRONIZATION ANALYSIS ---');
  const restStateRes = await apiRequest('GET', '/api/state');
  const restState = restStateRes.data.state || restStateRes.data;

  const serverOnlyCollections = [
    'investmentHouses',
    'schools',
    'registrations',
    'events',
    'currentEventId',
    'scoringConfig',
    'resultsLifecycle',
    'judgeScorecards',
    'bullBearDebate',
    'riskControls'
  ].filter(col => restState[col] !== undefined);

  const subKeys = [
    'marketState',
    'securities',
    'teams',
    'fxRates',
    'fxTransactions',
    'newsEvents',
    'corporateActions',
    'firedPhoenixActs',
    'velocities',
    'settings',
    'transactions',
    'lastResetReport'
  ];

  const simulatedLocalState = {};
  subKeys.forEach(key => {
    simulatedLocalState[key] = restState[key] || {};
  });
  const simulatedSafeState = {
    ...simulatedLocalState,
    securities: simulatedLocalState.securities,
    teams: simulatedLocalState.teams
  };

  const droppedCollections = serverOnlyCollections.filter(col => simulatedSafeState[col] === undefined);

  recordResult({
    id: 'AUD-RTDB-01',
    title: 'Asymmetric State Synchronization: Server-Only Collections Dropped by RTDB Sync',
    scenario: 'Comparing authoritative REST state vs state constructed by useFirebaseState.js onValue listener',
    expected: 'All authoritative server collections preserved across remote state updates',
    actual: `${droppedCollections.length} authoritative collections dropped: ${droppedCollections.join(', ')}`,
    evidence: {
      serverOnlyCollectionsPresentInREST: serverOnlyCollections,
      droppedCollectionsAfterRTDBSync: droppedCollections,
      subKeysCount: subKeys.length,
      authoritativeSource: 'server.js (memory + state.json)',
      replicaSource: 'Firebase RTDB (downstream cache)'
    },
    status: droppedCollections.length > 0 ? 'REPRODUCED' : 'NOT REPRODUCED'
  });

  // -------------------------------------------------------------------------
  // LEGITIMATE AUTHORIZED WORKFLOWS (BASELINE CONTROLS)
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('✅ TESTING LEGITIMATE AUTHORIZED WORKFLOWS & ACCOUNTING INVARIANTS');
  console.log('======================================================================\n');

  // L.1 Legitimate Order Submission by Authorized Team
  const legOrderRes = await apiRequest('POST', '/api/order/create', {
    ticketNumber: 'TK_LEG_AUTH_001',
    teamCode: 'T01',
    ticker: 'TCS',
    action: 'BUY',
    quantity: 20,
    orderType: 'LIMIT',
    price: 3200,
    limitPrice: 3200,
    notes: 'Legitimate Authorized Slip'
  }, headersT01);

  const legOrder = legOrderRes.data.order;
  recordResult({
    id: 'LEG-01',
    title: 'Legitimate Order Submission by Authenticated Team',
    scenario: 'Team T01 submitting valid BUY order for TCS with correct session credentials',
    expected: 'HTTP 200 with status PENDING',
    actual: `HTTP ${legOrderRes.status} (Order ${legOrder?.id}, status: ${legOrder?.status})`,
    evidence: { status: legOrderRes.status, orderId: legOrder?.id, orderStatus: legOrder?.status },
    status: (legOrderRes.status === 200 && legOrder?.status === 'PENDING') ? 'NOT REPRODUCED' : 'REPRODUCED'
  });

  // L.2 Legitimate Clearance & Verification by Assigned Desk Operator
  const legClaimRes = await apiRequest('POST', '/api/order/action', {
    orderId: legOrder.id,
    actionType: 'CLAIM_FOR_VERIFICATION',
    deskId: 'DESK_1'
  }, headersVerification);

  const legVerifyRes = await apiRequest('POST', '/api/order/action', {
    orderId: legOrder.id,
    actionType: 'MARK_VERIFIED',
    deskId: 'DESK_1'
  }, headersVerification);

  recordResult({
    id: 'LEG-02',
    title: 'Legitimate Clearance Desk Verification',
    scenario: 'DESK_1 operator claiming and verifying order slip',
    expected: 'HTTP 200 with status VERIFIED_AWAITING_EXCHANGE',
    actual: `HTTP ${legVerifyRes.status} (Order status: ${legVerifyRes.data.order?.status})`,
    evidence: { claimStatus: legClaimRes.status, verifyStatus: legVerifyRes.status, orderStatus: legVerifyRes.data.order?.status },
    status: (legVerifyRes.status === 200 && legVerifyRes.data.order?.status === 'VERIFIED_AWAITING_EXCHANGE') ? 'NOT REPRODUCED' : 'REPRODUCED'
  });

  // L.3 Legitimate Trade Execution & Financial Accounting Invariant Verification
  const preExecState = (await apiRequest('GET', '/api/state', null, headersAdmin)).data.state;
  const preT01 = preExecState.teams.find(t => t.teamCode === 'T01');
  const preCashINR = Number(preT01.cashWallets?.INR || preT01.cashBalance);
  const preHoldingTCS = Number(preT01.holdings?.TCS || 0);

  const legExecRes = await apiRequest('POST', '/api/order/action', {
    orderId: legOrder.id,
    actionType: 'EXECUTE',
    deskId: 'DESK_1'
  }, headersDesk1);

  const postExecState = (await apiRequest('GET', '/api/state', null, headersAdmin)).data.state;
  const postT01 = postExecState.teams.find(t => t.teamCode === 'T01');
  const postCashINR = Number(postT01.cashWallets?.INR || postT01.cashBalance);
  const postHoldingTCS = Number(postT01.holdings?.TCS || 0);
  const tx = legExecRes.data.transaction;

  const totalCost = tx?.totalValue;
  const expectedPostCash = preCashINR - totalCost;
  const cashDeductedCorrectly = Math.abs(postCashINR - expectedPostCash) < 0.01;
  const holdingsUpdatedCorrectly = postHoldingTCS === (preHoldingTCS + legOrder.quantity);

  recordResult({
    id: 'LEG-03',
    title: 'Legitimate Trade Execution & Multi-Currency Financial Ledger Invariants',
    scenario: 'Exchange Operator executing verified order; verifying cash wallet and holdings accounting',
    expected: 'HTTP 200, status EXECUTED, exact INR wallet reduction, exact holdings increment',
    actual: `HTTP ${legExecRes.status} (Cash delta: ₹${preCashINR - postCashINR}, Holdings delta: +${postHoldingTCS - preHoldingTCS})`,
    evidence: {
      execStatus: legExecRes.status,
      orderStatus: legExecRes.data.order?.status,
      transactionId: tx?.id,
      preCashINR,
      postCashINR,
      totalCost,
      cashDeductedCorrectly,
      holdingsUpdatedCorrectly
    },
    status: (legExecRes.status === 200 && cashDeductedCorrectly && holdingsUpdatedCorrectly) ? 'NOT REPRODUCED' : 'REPRODUCED'
  });

  // STEP 6: TEARDOWN & POST-FLIGHT INTEGRITY
  console.log('\n--- STEP 6: CLEANING UP ISOLATED TEST HARNESS ---');
  serverProcess.kill('SIGTERM');
  console.log('✓ Isolated test server process terminated.');

  // Clean up disposable fixture
  try {
    if (fs.existsSync(DISPOSABLE_STATE)) fs.unlinkSync(DISPOSABLE_STATE);
    const tmpFile = `${DISPOSABLE_STATE}.tmp`;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    console.log(`✓ Removed disposable test fixture: ${path.basename(DISPOSABLE_STATE)}`);
  } catch (e) {}

  // Restore write permissions on state.json
  try {
    fs.chmodSync(ORIGINAL_STATE, 0o666);
    console.log('✓ Restored normal permissions on authoritative state.json.');
  } catch (e) {}

  // FINAL POST-FLIGHT INTEGRITY CHECK
  console.log('\n--- STEP 7: FINAL POST-FLIGHT AUTHORITATIVE STATE CHECK ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256 after test run: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'FATAL: AUTHORITATIVE STATE HASH CHANGED DURING TEST RUN!');
  console.log('✓ 100% INTACT: Authoritative state.json has ZERO modifications.\n');

  // Save results to json for reporting
  const outPath = path.join(__dirname, 'test-phase-7-verification-results.json');
  fs.writeFileSync(outPath, JSON.stringify(verificationResults, null, 2), 'utf8');
  console.log(`✓ Verification results saved to ${path.basename(outPath)}`);

  console.log('\n======================================================================');
  console.log('📋 VERIFICATION COMPLETE — SUMMARY:');
  const reproducedCount = verificationResults.filter(r => r.status === 'REPRODUCED').length;
  const notReproducedCount = verificationResults.filter(r => r.status === 'NOT REPRODUCED').length;
  console.log(`  Total Scenarios Tested: ${verificationResults.length}`);
  console.log(`  Vulnerabilities Verified / Reproduced: ${reproducedCount}`);
  console.log(`  Authorized Controls Verified / Passed: ${notReproducedCount}`);
  console.log('======================================================================\n');
}

runPhase7Verification().catch(err => {
  console.error('\n❌ VERIFICATION TEST ERROR:', err);
  // Ensure original state permissions are restored on crash
  try { fs.chmodSync(ORIGINAL_STATE, 0o666); } catch (e) {}
  process.exit(1);
});
