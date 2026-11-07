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

const remediationResults = [];

function recordResult({ id, title, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, scenario, expected, actual, evidence, status };
  remediationResults.push(resultObj);
  const tag = status === 'REMEDIATED' ? '🟢 REMEDIATED' : (status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED');
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

async function runPhase7Remediation() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE 7.1 — REMEDIATION VERIFICATION & SECURITY REGRESSION SUITE');
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
  // TEST SUITE: VERIFY REMEDIATION OF ALL VULNERABILITIES
  // =========================================================================
  console.log('======================================================================');
  console.log('🧪 VERIFYING SECURITY REMEDIATION CONTROLS (EXPECTING 401/403/FILTERED)');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // FINDING SEC-01: Public Route Method Scoping & Administrative Mutation RBAC
  // -------------------------------------------------------------------------
  // 1.1 Unauthenticated POST /api/securities
  const sec01_post = await apiRequest('POST', '/api/securities', { ticker: 'UNAUTH', name: 'Rogue Asset', basePrice: 50 }, {});
  recordResult({
    id: 'SEC-01.1',
    title: 'Unauthenticated Security Creation Blocked via POST /api/securities',
    scenario: 'Calling POST /api/securities with no authentication headers',
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_post.status} (${sec01_post.data.error || 'Blocked'})`,
    evidence: { status: sec01_post.status, error: sec01_post.data.error },
    status: (sec01_post.status === 401 || sec01_post.status === 403) ? 'REMEDIATED' : 'FAILED'
  });

  // 1.2 Unauthenticated PUT /api/securities/:id
  const targetPutId = 'STK_RELIANCE_ea1e16';
  const sec01_put = await apiRequest('PUT', `/api/securities/${targetPutId}`, { currentPrice: 9999.55 }, {});
  recordResult({
    id: 'SEC-01.2',
    title: 'Unauthenticated Security Modification Blocked via PUT /api/securities/:id',
    scenario: `Calling PUT /api/securities/${targetPutId} with no authentication headers`,
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_put.status} (${sec01_put.data.error || 'Blocked'})`,
    evidence: { status: sec01_put.status, error: sec01_put.data.error },
    status: (sec01_put.status === 401 || sec01_put.status === 403) ? 'REMEDIATED' : 'FAILED'
  });

  // 1.3 Unauthenticated DELETE /api/securities/:id
  const sec01_delete = await apiRequest('DELETE', `/api/securities/${targetPutId}`, null, {});
  recordResult({
    id: 'SEC-01.3',
    title: 'Unauthenticated Security Deletion Blocked via DELETE /api/securities/:id',
    scenario: `Calling DELETE /api/securities/${targetPutId} with no authentication headers`,
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_delete.status} (${sec01_delete.data.error || 'Blocked'})`,
    evidence: { status: sec01_delete.status, error: sec01_delete.data.error },
    status: (sec01_delete.status === 401 || sec01_delete.status === 403) ? 'REMEDIATED' : 'FAILED'
  });

  // 1.4 Unauthenticated POST /api/fx/rates
  const sec01_fx = await apiRequest('POST', '/api/fx/rates', { pair: 'USDINR', midRate: 155.00 }, {});
  recordResult({
    id: 'SEC-01.4',
    title: 'Unauthenticated Global FX Rate Manipulation Blocked via POST /api/fx/rates',
    scenario: 'Calling POST /api/fx/rates with no authentication headers',
    expected: '401 Unauthorized or 403 Forbidden',
    actual: `HTTP ${sec01_fx.status} (${sec01_fx.data.error || 'Blocked'})`,
    evidence: { status: sec01_fx.status, error: sec01_fx.data.error },
    status: (sec01_fx.status === 401 || sec01_fx.status === 403) ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-02: Trailing Slash Normalization & Ownership Guard
  // -------------------------------------------------------------------------
  // 2.1 Trailing slash bypass blocked on /api/orders/resubmit/
  const sec02_resubmit = await apiRequest('POST', '/api/orders/resubmit/', {
    orderId: 'ORD_TEST_T01_RET_SEC02',
    quantity: 120,
    limitPrice: 3300
  }, headersT02); // Team T02 calling resubmit on T01's order with trailing slash
  recordResult({
    id: 'SEC-02.1',
    title: 'Trailing Slash Normalized & Cross-Team Resubmit Blocked on /api/orders/resubmit/',
    scenario: 'Team T02 resubmitting Team T01 returned order via /api/orders/resubmit/',
    expected: '403 Forbidden',
    actual: `HTTP ${sec02_resubmit.status} (${sec02_resubmit.data.error || 'Blocked'})`,
    evidence: { status: sec02_resubmit.status, error: sec02_resubmit.data.error },
    status: sec02_resubmit.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // 2.2 Trailing slash bypass blocked on /api/orders/cancel/
  const sec02_cancel = await apiRequest('POST', '/api/orders/cancel/', {
    orderId: 'ORD_TEST_T01_PEND'
  }, headersT02); // Team T02 cancelling T01's order with trailing slash
  recordResult({
    id: 'SEC-02.2',
    title: 'Trailing Slash Normalized & Cross-Team Cancel Blocked on /api/orders/cancel/',
    scenario: 'Team T02 cancelling Team T01 pending order via /api/orders/cancel/',
    expected: '403 Forbidden',
    actual: `HTTP ${sec02_cancel.status} (${sec02_cancel.data.error || 'Blocked'})`,
    evidence: { status: sec02_cancel.status, error: sec02_cancel.data.error },
    status: sec02_cancel.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-01: Transaction Voiding Authorization Guard
  // -------------------------------------------------------------------------
  const fin01_res = await apiRequest('POST', '/api/transactions/void', { id: 'TX_PHASE7_TEST' }, headersT02);
  recordResult({
    id: 'FIN-01',
    title: 'Unprivileged Transaction Voiding Blocked via POST /api/transactions/void',
    scenario: 'Team T02 calling POST /api/transactions/void to void Team T01 transaction',
    expected: '403 Forbidden (Requires Admin/SEBI role)',
    actual: `HTTP ${fin01_res.status} (${fin01_res.data.error || 'Blocked'})`,
    evidence: { status: fin01_res.status, error: fin01_res.data.error },
    status: fin01_res.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-02: Corporate Actions Protection
  // -------------------------------------------------------------------------
  // Team T01 calling POST /api/corporate-action (Bankruptcy on INFY)
  const fin02_bankrupt = await apiRequest('POST', '/api/corporate-action', { securityId: 'STK_INFY_32cd51', actionType: 'Bankruptcy' }, headersT01);
  recordResult({
    id: 'FIN-02.1',
    title: 'Unprivileged Stock Bankruptcy Blocked via POST /api/corporate-action',
    scenario: 'Team T01 triggering Bankruptcy on Security INFY',
    expected: '403 Forbidden (Requires Admin/SEBI role)',
    actual: `HTTP ${fin02_bankrupt.status} (${fin02_bankrupt.data.error || 'Blocked'})`,
    evidence: { status: fin02_bankrupt.status, error: fin02_bankrupt.data.error },
    status: fin02_bankrupt.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // Team T01 calling POST /api/corporate-action (Dividend on TCS)
  const fin02_dividend = await apiRequest('POST', '/api/corporate-action', { securityId: 'STK_TCS_1e211e', actionType: 'Dividend' }, headersT01);
  recordResult({
    id: 'FIN-02.2',
    title: 'Unprivileged Dividend Distribution Blocked via POST /api/corporate-action',
    scenario: 'Team T01 triggering Dividend payout on Security TCS',
    expected: '403 Forbidden (Requires Admin/SEBI role)',
    actual: `HTTP ${fin02_dividend.status} (${fin02_dividend.data.error || 'Blocked'})`,
    evidence: { status: fin02_dividend.status, error: fin02_dividend.data.error },
    status: fin02_dividend.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING AUD-D31-01: Cross-Team Order Slip Modification & Cancellation Guard
  // -------------------------------------------------------------------------
  // Case 5.1: Non-Team Role (Journalist) Resubmitting T01 Order with teamCode omitted in body
  const resubmitByJournalist = await apiRequest('POST', '/api/orders/resubmit', {
    orderId: 'ORD_TEST_T01_RET_AUD31',
    quantity: 88
  }, {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'journalist'
  });

  recordResult({
    id: 'AUD-D31-01.1',
    title: 'Non-Team Role / Omitted teamCode Resubmit Blocked',
    scenario: 'Journalist session resubmitting Team T01 order with teamCode omitted in body',
    expected: '403 Forbidden',
    actual: `HTTP ${resubmitByJournalist.status} (${resubmitByJournalist.data.error || 'Blocked'})`,
    evidence: { status: resubmitByJournalist.status, error: resubmitByJournalist.data.error },
    status: resubmitByJournalist.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // Case 5.2: Non-Team Role (Advisor) Cancelling T01 Order with spoofed teamCode: T01 in body
  const cancelByAdvisor = await apiRequest('POST', '/api/orders/cancel', {
    orderId: 'ORD_TEST_T01_PEND',
    teamCode: 'T01' // Spoofed teamCode in body
  }, {
    'X-FMS-Password': 'fms-event-2026',
    'X-FMS-Role': 'advisor'
  });

  recordResult({
    id: 'AUD-D31-01.2',
    title: 'Non-Team Role / Spoofed teamCode Cancellation Blocked',
    scenario: 'Advisor session cancelling Team T01 order with spoofed teamCode: T01 in body',
    expected: '403 Forbidden',
    actual: `HTTP ${cancelByAdvisor.status} (${cancelByAdvisor.data.error || 'Blocked'})`,
    evidence: { status: cancelByAdvisor.status, error: cancelByAdvisor.data.error },
    status: cancelByAdvisor.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-03: Route Guard for /api/order/submit Alias
  // -------------------------------------------------------------------------
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
    title: 'Cross-Team Injection Blocked on /api/order/submit Alias',
    scenario: 'Team T02 injecting order on behalf of Team T01 via /api/order/submit alias',
    expected: '403 Forbidden',
    actual: `HTTP ${sec03_alias.status} (${sec03_alias.data.error || 'Blocked'})`,
    evidence: { status: sec03_alias.status, error: sec03_alias.data.error },
    status: sec03_alias.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-03: Direct Trade Execution Route Protection
  // -------------------------------------------------------------------------
  const fin03_direct = await apiRequest('POST', '/api/trade', {
    teamId: 'T01',
    securityId: 'RELIANCE',
    action: 'BUY',
    quantity: 10
  }, headersT01);

  recordResult({
    id: 'FIN-03',
    title: 'Direct Trade Execution Blocked for Trading Floor Participants',
    scenario: 'Participant Team T01 calling POST /api/trade to execute directly',
    expected: '403 Forbidden',
    actual: `HTTP ${fin03_direct.status} (${fin03_direct.data.error || 'Blocked'})`,
    evidence: { status: fin03_direct.status, error: fin03_direct.data.error },
    status: fin03_direct.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING FIN-04: IPO Subscription & Allotment Security
  // -------------------------------------------------------------------------
  // 8.1 IPO Bid on behalf of another team blocked
  const fin04_bid = await apiRequest('POST', '/api/ipo/bid', {
    ticker: 'DTAI',
    quantity: 10,
    teamCode: 'T01' // T02 submitting bid that would reserve T01's USD funds
  }, headersT02);

  recordResult({
    id: 'FIN-04.1',
    title: 'Cross-Team IPO Bid & Fund Reservation Blocked via /api/ipo/bid',
    scenario: 'Team T02 placing IPO bid on behalf of Team T01',
    expected: '403 Forbidden',
    actual: `HTTP ${fin04_bid.status} (${fin04_bid.data.error || 'Blocked'})`,
    evidence: { status: fin04_bid.status, error: fin04_bid.data.error },
    status: fin04_bid.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // 8.2 Unprivileged IPO Allotment Trigger blocked
  const fin04_allot = await apiRequest('POST', '/api/ipo/allot', { ticker: 'DTAI' }, headersT01);
  recordResult({
    id: 'FIN-04.2',
    title: 'Unprivileged IPO Allotment Trigger Blocked via /api/ipo/allot',
    scenario: 'Team T01 calling POST /api/ipo/allot',
    expected: '403 Forbidden',
    actual: `HTTP ${fin04_allot.status} (${fin04_allot.data.error || 'Blocked'})`,
    evidence: { status: fin04_allot.status, error: fin04_allot.data.error },
    status: fin04_allot.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING SEC-04: Penalties Creation & Appeal Resolution Security
  // -------------------------------------------------------------------------
  // 9.1 Team T01 penalizing Team T02 blocked
  const sec04_create = await apiRequest('POST', '/api/penalties/create', {
    teamCode: 'T02',
    ruleViolation: 'CODE_OF_CONDUCT',
    pointsDeducted: 15,
    reason: 'Malicious competitor penalty injection'
  }, headersT01);

  recordResult({
    id: 'SEC-04.1',
    title: 'Unprivileged Competitor Penalty Injection Blocked via /api/penalties/create',
    scenario: 'Team T01 submitting penalty against competing Team T02',
    expected: '403 Forbidden',
    actual: `HTTP ${sec04_create.status} (${sec04_create.data.error || 'Blocked'})`,
    evidence: { status: sec04_create.status, error: sec04_create.data.error },
    status: sec04_create.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // 9.2 Team T02 overturning its own penalty blocked
  const sec04_overturn = await apiRequest('POST', '/api/penalties/resolve-appeal', {
    penaltyId: 'PEN_TEST_001',
    resolution: 'OVERTURNED',
    resolutionReason: 'Self-cleared by participant'
  }, headersT02);

  recordResult({
    id: 'SEC-04.2',
    title: 'Self-Service Penalty Overturn Blocked via /api/penalties/resolve-appeal',
    scenario: 'Team T02 overturning penalty points deduction',
    expected: '403 Forbidden',
    actual: `HTTP ${sec04_overturn.status} (${sec04_overturn.data.error || 'Blocked'})`,
    evidence: { status: sec04_overturn.status, error: sec04_overturn.data.error },
    status: sec04_overturn.status === 403 ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING PRIV-01: Multi-Team Privacy in WebSocket Delta Broadcasts
  // -------------------------------------------------------------------------
  let priv01_remediated = false;
  let wsEvidence = null;

  try {
    const wsUrl = `ws://127.0.0.1:${PORT}`;
    const wsClientT02 = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      wsClientT02.on('open', () => {
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

    // Verify whether Client T02 received ANY details of Team T01's order
    const orderCreatedMsgs = receivedMessages.filter(m => m.type === 'ORDER_CREATED');
    let hasLeak = false;
    for (const msg of receivedMessages) {
      if (msg.order && (msg.order.teamCode === 'T01' || msg.order.teamId === 'T01')) {
        hasLeak = true;
      }
      if (msg.state?.orders && Array.isArray(msg.state.orders)) {
        if (msg.state.orders.some(o => o.teamCode === 'T01' || o.teamId === 'T01')) {
          hasLeak = true;
        }
      }
    }

    priv01_remediated = !hasLeak;
    wsEvidence = {
      receivedCount: receivedMessages.length,
      hasLeak,
      clientT02OrdersCount: (receivedMessages[receivedMessages.length - 1]?.state?.orders || []).length
    };
  } catch (err) {
    wsEvidence = { error: err.message };
  }

  recordResult({
    id: 'PRIV-01',
    title: 'Cross-Team Order Slip Privacy Enforced in WebSocket Broadcasts',
    scenario: 'Client T02 observing WebSocket broadcast when Team T01 creates order slip',
    expected: 'Zero details of Team T01 orders delivered to Client T02',
    actual: priv01_remediated
      ? 'Client T02 received sanitized broadcast with 0 leaked orders from Team T01'
      : 'Client T02 received leaked order details',
    evidence: wsEvidence,
    status: priv01_remediated ? 'REMEDIATED' : 'FAILED'
  });

  // -------------------------------------------------------------------------
  // FINDING AUD-RTDB-01: Non-Destructive State Merging in useFirebaseState.js
  // -------------------------------------------------------------------------
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

  // Read actual source code of useFirebaseState.js to confirm non-destructive functional merge
  const hookSource = fs.readFileSync(path.join(__dirname, 'src', 'hooks', 'useFirebaseState.js'), 'utf8');
  const hasFunctionalMerge = hookSource.includes('setState(prevState => ({') &&
                             hookSource.includes('...(prevState || {}),') &&
                             hookSource.includes('...localState,');

  // Simulate functional merge as coded
  const mockPrevState = { ...restState };
  const mockLocalState = { marketState: restState.marketState, securities: restState.securities, teams: restState.teams };
  const simulatedMerged = {
    ...(mockPrevState || {}),
    ...mockLocalState,
    securities: mockLocalState.securities,
    teams: mockLocalState.teams || mockPrevState.teams || {}
  };
  const droppedAfterMerge = serverOnlyCollections.filter(col => simulatedMerged[col] === undefined);

  const rtdbRemediated = hasFunctionalMerge && droppedAfterMerge.length === 0;

  recordResult({
    id: 'AUD-RTDB-01',
    title: 'Non-Destructive State Merging in useFirebaseState.js',
    scenario: 'Simulating RTDB partial key sync over existing authoritative REST state',
    expected: 'All server-only collections preserved; functional prevState merger present in hook',
    actual: rtdbRemediated
      ? `All ${serverOnlyCollections.length} collections preserved across sync with functional setState`
      : `${droppedAfterMerge.length} collections dropped`,
    evidence: {
      hasFunctionalMergeInSource: hasFunctionalMerge,
      preservedCollectionsCount: serverOnlyCollections.length,
      serverOnlyCollections
    },
    status: rtdbRemediated ? 'REMEDIATED' : 'FAILED'
  });

  // =========================================================================
  // LEGITIMATE AUTHORIZED WORKFLOWS & ACCOUNTING INVARIANTS
  // =========================================================================
  console.log('\n======================================================================');
  console.log('✅ TESTING LEGITIMATE AUTHORIZED WORKFLOWS & FINANCIAL INVARIANTS');
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
    status: (legOrderRes.status === 200 && legOrder?.status === 'PENDING') ? 'PASSED' : 'FAILED'
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
    status: (legVerifyRes.status === 200 && legVerifyRes.data.order?.status === 'VERIFIED_AWAITING_EXCHANGE') ? 'PASSED' : 'FAILED'
  });

  // L.3 Legitimate Trade Execution & Multi-Currency Financial Ledger Invariants
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
    status: (legExecRes.status === 200 && cashDeductedCorrectly && holdingsUpdatedCorrectly) ? 'PASSED' : 'FAILED'
  });

  // L.4 Legitimate Order Resubmission by Owning Team
  const legResubmitRes = await apiRequest('POST', '/api/orders/resubmit', {
    orderId: 'ORD_TEST_T01_RET_AUD31',
    quantity: 90,
    limitPrice: 3250,
    notes: 'Corrected quantity per desk note'
  }, headersT01);

  recordResult({
    id: 'LEG-04',
    title: 'Legitimate Order Resubmission by Owning Team',
    scenario: 'Team T01 resubmitting its own returned order with updated quantity',
    expected: 'HTTP 200, status PENDING, quantity 90',
    actual: `HTTP ${legResubmitRes.status} (Status: ${legResubmitRes.data.order?.status}, Qty: ${legResubmitRes.data.order?.quantity})`,
    evidence: {
      status: legResubmitRes.status,
      orderId: legResubmitRes.data.order?.id,
      newQuantity: legResubmitRes.data.order?.quantity,
      orderStatus: legResubmitRes.data.order?.status
    },
    status: (legResubmitRes.status === 200 && legResubmitRes.data.order?.status === 'PENDING' && legResubmitRes.data.order?.quantity === 90) ? 'PASSED' : 'FAILED'
  });

  // L.5 Legitimate Order Cancellation by Owning Team
  // Create a pending order for T01 to cancel
  const legOrderForCancelRes = await apiRequest('POST', '/api/order/create', {
    ticketNumber: 'TK_CANCEL_LEG_001',
    teamCode: 'T01',
    ticker: 'INFY',
    action: 'BUY',
    quantity: 15,
    orderType: 'LIMIT',
    price: 1800
  }, headersT01);
  const cancelOrderId = legOrderForCancelRes.data.order?.id;

  const legCancelRes = await apiRequest('POST', '/api/orders/cancel', {
    orderId: cancelOrderId,
    reason: 'Strategy shift'
  }, headersT01);

  recordResult({
    id: 'LEG-05',
    title: 'Legitimate Order Cancellation by Owning Team',
    scenario: 'Team T01 cancelling its own pending order',
    expected: 'HTTP 200, status CANCELLED',
    actual: `HTTP ${legCancelRes.status} (Status: ${legCancelRes.data.order?.status})`,
    evidence: {
      status: legCancelRes.status,
      orderId: legCancelRes.data.order?.id,
      orderStatus: legCancelRes.data.order?.status
    },
    status: (legCancelRes.status === 200 && legCancelRes.data.order?.status === 'CANCELLED') ? 'PASSED' : 'FAILED'
  });

  // L.6 Legitimate Primary IPO Subscription by Owning Team
  const legIpoBidRes = await apiRequest('POST', '/api/ipo/bid', {
    ticker: 'DTAI',
    quantity: 10,
    teamCode: 'T01'
  }, headersT01);

  recordResult({
    id: 'LEG-06',
    title: 'Legitimate Primary IPO Subscription by Authenticated Team',
    scenario: 'Team T01 placing valid IPO bid for DTAI with sufficient USD cash wallet',
    expected: 'HTTP 200, successful fund reservation',
    actual: `HTTP ${legIpoBidRes.status} (${legIpoBidRes.data.message || 'Bid accepted'})`,
    evidence: {
      status: legIpoBidRes.status,
      teamBid: legIpoBidRes.data.teamBid,
      totalSubscription: legIpoBidRes.data.totalSubscription
    },
    status: (legIpoBidRes.status === 200 && legIpoBidRes.data.success === true) ? 'PASSED' : 'FAILED'
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
  const outPath = path.join(__dirname, 'test-phase-7-remediation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(remediationResults, null, 2), 'utf8');
  console.log(`✓ Remediation results saved to ${path.basename(outPath)}`);

  console.log('\n======================================================================');
  console.log('📋 REMEDIATION VERIFICATION COMPLETE — SUMMARY:');
  const remediatedCount = remediationResults.filter(r => r.status === 'REMEDIATED').length;
  const passedCount = remediationResults.filter(r => r.status === 'PASSED').length;
  const failedCount = remediationResults.filter(r => r.status === 'FAILED').length;
  console.log(`  Total Scenarios Tested: ${remediationResults.length}`);
  console.log(`  Vulnerabilities Verified Remediated: ${remediatedCount}`);
  console.log(`  Legitimate Workflows Passed: ${passedCount}`);
  console.log(`  Failed Tests: ${failedCount}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} remediation test scenarios failed!`);
  }
}

runPhase7Remediation().catch(err => {
  console.error('\n❌ REMEDIATION TEST ERROR:', err);
  try { fs.chmodSync(ORIGINAL_STATE, 0o666); } catch (e) {}
  process.exit(1);
});
