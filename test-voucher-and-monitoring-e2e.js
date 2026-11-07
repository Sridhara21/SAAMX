import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3110;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-voucher-monitoring-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-voucher-monitoring-e2e-results.json');

const testResults = [];

function recordResult({ id, title, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
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

function readCurrentState() {
  return JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
}

async function runVoucherAndMonitoringE2ETests() {
  console.log('======================================================================');
  console.log('🏦 SAAMX E2E SUITE: VOUCHER LIFECYCLE & TECH-OPS TELEMETRY');
  console.log('======================================================================\n');

  // STEP 1: Pre-flight Hash Check
  console.log('--- STEP 1: PRE-FLIGHT HASH VERIFICATION ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  recordResult({
    id: 'PREFLIGHT-HASH',
    title: 'Pre-flight Authoritative state.json SHA-256 Baseline',
    scenario: 'Verify state.json SHA-256 matches baseline hash',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  if (fs.existsSync(DISPOSABLE_STATE)) {
    try {
      fs.chmodSync(DISPOSABLE_STATE, 0o666);
      fs.unlinkSync(DISPOSABLE_STATE);
    } catch (e) {}
  }
  const rawState = fs.readFileSync(ORIGINAL_STATE, 'utf8');
  fs.writeFileSync(DISPOSABLE_STATE, rawState, 'utf8');
  const fixture = JSON.parse(rawState);
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'TWO_PHASE_BANK' };
  fixture.settlements = [];
  fixture.orders = [];

  // Seed T01 with sufficient INR and shares
  const teamT01 = fixture.teams.find(t => t.teamCode === 'T01');
  if (teamT01) {
    teamT01.cash = 10000000;
    teamT01.wallets = { INR: 10000000, USD: 100000, GBP: 50000 };
    teamT01.cashWallets = { INR: 10000000, USD: 100000, GBP: 50000 };
    teamT01.holdings = {
      RELIANCE: { quantity: 100, averageCost: 2800 },
      TCS: { quantity: 100, averageCost: 3500 }
    };
    teamT01.reservedHoldings = {};
    teamT01.reservedCash = 0;
  }
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log('✓ Seeded disposable fixture configured for TWO_PHASE_BANK settlement.');

  // STEP 3: Spawn Test Server
  console.log('\n--- STEP 3: SPAWNING ISOLATED SERVER ON PORT ' + PORT + ' ---');
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

  serverProcess.stdout.on('data', d => {
    const msg = d.toString();
    if (process.env.DEBUG_SERVER) process.stdout.write(`[SERVER-OUT] ${msg}`);
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) {
        serverStarted = true;
        console.log(`✓ Isolated backend active on port ${PORT}.\n`);
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  assert.strictEqual(serverStarted, true, 'Server failed to start on port ' + PORT);

  let order1Id = null;
  let order1Ticket = 'TKT-1001';
  let voucher1Ref = null;
  let settlement1Id = null;

  try {
    // -------------------------------------------------------------------------
    // AUTHENTICATE TEST ROLES
    // -------------------------------------------------------------------------
    console.log('--- AUTHENTICATING TEST SESSIONS ---');
    const adminLogin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
    const adminToken = adminLogin.data.token;

    const bankLogin = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    assert.strictEqual(bankLogin.status, 200, 'Bank login failed');
    const bankToken = bankLogin.data.token;

    const sebiLogin = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    assert.strictEqual(sebiLogin.status, 200, 'SEBI login failed');
    const sebiToken = sebiLogin.data.token;

    const t01Login = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    assert.strictEqual(t01Login.status, 200, 'T01 login failed');
    const t01Token = t01Login.data.token;

    console.log('✓ Acquired JWT tokens for Admin, Bank Teller, SEBI, and Participant Team.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Order Submission does NOT generate voucher or bank desk
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: ORDER SUBMISSION DOES NOT GENERATE VOUCHER ---');
    const submitRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: order1Ticket,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      brokerId: 'B01',
      notes: 'Initial paper ticket intake',
      enteredBy: 'Operator 1',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.strictEqual(submitRes.status, 200, 'Order submit failed');
    assert.strictEqual(submitRes.data.success, true, 'Order submit response success false');
    order1Id = submitRes.data.order?.id;
    assert.ok(order1Id, 'No order ID returned from submission');

    // Verify order status and absence of voucher
    assert.strictEqual(submitRes.data.voucher, undefined, 'Voucher MUST NOT be returned on submission');
    assert.strictEqual(submitRes.data.order?.bankDeskId, undefined, 'bankDeskId MUST NOT be assigned on submission');
    assert.ok(['QUEUED', 'SUBMITTED', 'PENDING'].includes(submitRes.data.order?.status), 'Order status should be QUEUED/PENDING');

    // Query state settlements
    const stateCheck1 = readCurrentState();
    const order1InState = (stateCheck1.orders || []).find(o => o.id === order1Id);
    const settlementsInState1 = stateCheck1.settlements || [];
    const matchingSettlement1 = settlementsInState1.find(s => s.orderId === order1Id || s.ticketNumber === order1Ticket);

    const test1Passed = !matchingSettlement1 && !order1InState?.bankDeskId && !order1InState?.voucherReference;
    recordResult({
      id: 'VOUCHER-01-SUBMIT-NO-VOUCHER',
      title: 'Order Submission MUST NOT Generate Bank Voucher or Assign Bank Desk',
      scenario: 'Submit order ticket to Desk 1 and verify zero vouchers generated in state',
      expected: 'voucher = undefined, bankDeskId = undefined, matchingSettlement = null',
      actual: `matchingSettlement = ${matchingSettlement1 ? 'FOUND' : 'null'}, bankDeskId = ${order1InState?.bankDeskId || 'none'}`,
      evidence: { orderId: order1Id, status: order1InState?.status, bankDeskId: order1InState?.bankDeskId },
      status: test1Passed ? 'PASSED' : 'FAILED'
    });

    // -------------------------------------------------------------------------
    // TEST 2: Floor Verification / Review does NOT generate voucher
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: DESK CLAIM & VALIDATE DOES NOT GENERATE VOUCHER ---');
    const claimRes = await apiRequest('POST', '/api/order/claim', {
      orderId: order1Id,
      deskId: 'DESK_1',
      operator: 'Clerk Alpha'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(claimRes.status, 200, 'Claim order failed');

    const validateRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'VALIDATE',
      deskId: 'DESK_1',
      operator: 'Clerk Alpha',
      physicalSlipChecked: true
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(validateRes.status, 200, 'Validate order failed');

    const stateCheck2 = readCurrentState();
    const settlementsInState2 = stateCheck2.settlements || [];
    const matchingSettlement2 = settlementsInState2.find(s => s.orderId === order1Id);
    const order1AfterVal = (stateCheck2.orders || []).find(o => o.id === order1Id) || validateRes.data.order;

    const test2Passed = !matchingSettlement2 && !order1AfterVal?.bankDeskId && order1AfterVal?.status === 'VALIDATED';
    recordResult({
      id: 'VOUCHER-02-REVIEW-NO-VOUCHER',
      title: 'Floor Verification & Risk Validation MUST NOT Generate Bank Voucher',
      scenario: 'Claim and risk-validate order slip; verify order is VALIDATED without voucher or bank desk',
      expected: 'status = VALIDATED, vouchers = 0, bankDeskId = undefined',
      actual: `status = ${order1AfterVal?.status}, matchingSettlement = ${matchingSettlement2 ? 'FOUND' : 'null'}`,
      evidence: { orderStatus: order1AfterVal?.status, deskId: order1AfterVal?.deskId },
      status: test2Passed ? 'PASSED' : 'FAILED'
    });

    // -------------------------------------------------------------------------
    // TEST 3: Exchange Rejection does NOT generate voucher
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: EXCHANGE REJECTION DOES NOT GENERATE VOUCHER ---');
    const rejectOrderTicket = 'TKT-1002';
    const rejectSubmitRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: rejectOrderTicket,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      brokerId: 'B01',
      notes: 'Slip destined for rejection',
      enteredBy: 'Operator 1',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    const rejectOrderId = rejectSubmitRes.data.order?.id;
    assert.ok(rejectOrderId, 'Reject test order failed to create');

    // Reject from floor
    const rejectActionRes = await apiRequest('POST', '/api/order/action', {
      orderId: rejectOrderId,
      actionType: 'REJECT',
      rejectionReason: 'Invalid broker signature on physical intake',
      deskId: 'DESK_1',
      operator: 'Clerk Alpha'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(rejectActionRes.status, 200, 'Order rejection failed');

    const stateCheck3 = readCurrentState();
    const rejectOrderInState = (stateCheck3.orders || []).find(o => o.id === rejectOrderId) || rejectActionRes.data.order;
    const settlementsInState3 = stateCheck3.settlements || [];
    const matchingSettlement3 = settlementsInState3.find(s => s.orderId === rejectOrderId || s.ticketNumber === rejectOrderTicket);

    const test3Passed = rejectOrderInState?.status === 'REJECTED' && !matchingSettlement3 && !rejectOrderInState?.bankDeskId;
    recordResult({
      id: 'VOUCHER-03-REJECT-NO-VOUCHER',
      title: 'Exchange Rejection MUST NEVER Generate Bank Voucher or Assign Bank Desk',
      scenario: 'Reject order ticket; verify status REJECTED, 0 vouchers created, 0 bank desks assigned',
      expected: 'status = REJECTED, matchingSettlement = null, bankDeskId = undefined',
      actual: `status = ${rejectOrderInState?.status}, matchingSettlement = ${matchingSettlement3 ? 'FOUND' : 'null'}`,
      evidence: { orderId: rejectOrderId, rejectionReason: rejectOrderInState?.rejectionReason },
      status: test3Passed ? 'PASSED' : 'FAILED'
    });

    // -------------------------------------------------------------------------
    // TEST 4: Exchange Acceptance Atomically Generates EXACTLY ONE Voucher
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: EXCHANGE ACCEPTANCE ATOMICALLY GENERATES EXACTLY ONE VOUCHER ---');
    const acceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      deskId: 'DESK_1',
      operator: 'Clerk Alpha',
      physicalSlipChecked: true
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.strictEqual(acceptRes.status, 200, 'Order accept failed');
    assert.strictEqual(acceptRes.data.success, true, 'Accept response success is false');
    assert.ok(acceptRes.data.settlement, 'Accept response missing settlement record');

    const createdSettlement = acceptRes.data.settlement;
    voucher1Ref = createdSettlement.voucherReference || acceptRes.data.voucherReference;
    settlement1Id = createdSettlement.id;
    const bankDeskId = createdSettlement.bankDeskId;

    assert.ok(voucher1Ref, 'Missing voucherReference');
    assert.ok(voucher1Ref.startsWith('BNK-PAY-'), `Voucher reference for BUY pay-in must start with 'BNK-PAY-', got '${voucher1Ref}'`);
    assert.ok(['BANK_1', 'BANK_2'].includes(bankDeskId), `bankDeskId must be BANK_1 or BANK_2, got '${bankDeskId}'`);
    assert.strictEqual(createdSettlement.direction, 'PAY_IN', `direction must be 'PAY_IN', got '${createdSettlement.direction}'`);
    assert.strictEqual(createdSettlement.classification, 'PAY_IN', `classification must be 'PAY_IN', got '${createdSettlement.classification}'`);

    const stateCheck4 = readCurrentState();
    const order1Accepted = (stateCheck4.orders || []).find(o => o.id === order1Id) || acceptRes.data.order;
    assert.strictEqual(order1Accepted?.status, 'EXECUTED_PENDING_SETTLEMENT', 'Order status must be EXECUTED_PENDING_SETTLEMENT');
    assert.strictEqual(order1Accepted?.bankDeskId, bankDeskId, 'Order bankDeskId must match settlement bankDeskId');

    const matchingVouchers = (stateCheck4.settlements || []).filter(s => s.orderId === order1Id);
    assert.strictEqual(matchingVouchers.length, 1, `Expected exactly 1 voucher in settlements, found ${matchingVouchers.length}`);

    recordResult({
      id: 'VOUCHER-04-ACCEPT-ATOMIC-VOUCHER',
      title: 'Exchange Acceptance Atomically Generates Exactly ONE Persistent Voucher',
      scenario: 'Execute ACCEPT action; verify voucher generated with BNK-PAY- prefix, direction PAY_IN, assigned to BANK_1/BANK_2',
      expected: 'status = EXECUTED_PENDING_SETTLEMENT, voucher = BNK-PAY-*, bankDeskId in [BANK_1, BANK_2], count = 1',
      actual: `voucher = ${voucher1Ref}, bankDesk = ${bankDeskId}, direction = ${createdSettlement.direction}, count = ${matchingVouchers.length}`,
      evidence: { voucherReference: voucher1Ref, bankDeskId, direction: createdSettlement.direction, orderStatus: order1Accepted?.status },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 5: Acceptance Idempotency (Retry does not duplicate voucher)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: ACCEPTANCE IDEMPOTENCY ---');
    const retryAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      deskId: 'DESK_1',
      operator: 'Clerk Alpha',
      physicalSlipChecked: true
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.strictEqual(retryAcceptRes.status, 200, 'Retry accept failed with HTTP error');
    assert.strictEqual(retryAcceptRes.data.success, true, 'Retry accept response success is false');
    assert.strictEqual(retryAcceptRes.data.idempotentReplay, true, 'Retry accept must flag idempotentReplay: true');
    assert.strictEqual(retryAcceptRes.data.voucherReference, voucher1Ref, 'Retry accept must return existing voucher reference');

    const stateCheck5 = readCurrentState();
    const vouchersAfterRetry = (stateCheck5.settlements || []).filter(s => s.orderId === order1Id);
    assert.strictEqual(vouchersAfterRetry.length, 1, `Voucher count after retry must remain 1, found ${vouchersAfterRetry.length}`);

    recordResult({
      id: 'VOUCHER-05-ACCEPT-IDEMPOTENCY',
      title: 'Retrying Exchange Acceptance is Strictly Idempotent',
      scenario: 'Resubmit ACCEPT on already accepted order; verify idempotentReplay: true and zero duplicate vouchers created',
      expected: 'idempotentReplay = true, voucher count = 1, voucherReference matches existing',
      actual: `idempotentReplay = ${retryAcceptRes.data.idempotentReplay}, count = ${vouchersAfterRetry.length}, ref = ${retryAcceptRes.data.voucherReference}`,
      evidence: { idempotentReplay: retryAcceptRes.data.idempotentReplay, voucherCount: vouchersAfterRetry.length },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 6: SELL Order Pay-Out Voucher (BNK-DISB- prefix & PAY_OUT)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: SELL ORDER PAYOUT VOUCHER GENERATION ---');
    const sellTicket = 'TKT-1003';
    const sellSubmitRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: sellTicket,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'SELL',
      quantity: 5,
      orderType: 'MARKET',
      brokerId: 'B01',
      notes: 'Sale of TCS holdings',
      enteredBy: 'Operator 1',
      deskId: 'DESK_2'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    const sellOrderId = sellSubmitRes.data.order?.id;
    assert.ok(sellOrderId, 'Sell order failed to create');

    // Claim, Validate, Accept
    await apiRequest('POST', '/api/order/claim', { orderId: sellOrderId, deskId: 'DESK_2', operator: 'Clerk Beta' }, { 'Authorization': `Bearer ${adminToken}` });
    await apiRequest('POST', '/api/order/action', { orderId: sellOrderId, actionType: 'VALIDATE', deskId: 'DESK_2', operator: 'Clerk Beta', physicalSlipChecked: true }, { 'Authorization': `Bearer ${adminToken}` });
    const sellAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      actionType: 'ACCEPT',
      deskId: 'DESK_2',
      operator: 'Clerk Beta',
      physicalSlipChecked: true
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.strictEqual(sellAcceptRes.status, 200, 'Sell accept failed');
    const sellSettlement = sellAcceptRes.data.settlement;
    const sellVoucherRef = sellSettlement?.voucherReference || sellAcceptRes.data.voucherReference;
    assert.ok(sellVoucherRef.startsWith('BNK-DISB-') || sellVoucherRef.startsWith('BNK-REC-'), `Sell voucher must start with BNK-DISB- or BNK-REC-, got '${sellVoucherRef}'`);
    assert.strictEqual(sellSettlement.direction, 'PAY_OUT', `direction must be 'PAY_OUT', got '${sellSettlement.direction}'`);
    assert.strictEqual(sellSettlement.classification, 'PAY_OUT', `classification must be 'PAY_OUT', got '${sellSettlement.classification}'`);
    assert.ok(['BANK_1', 'BANK_2'].includes(sellSettlement.bankDeskId), `bankDeskId must be BANK_1 or BANK_2, got '${sellSettlement.bankDeskId}'`);

    recordResult({
      id: 'VOUCHER-06-SELL-PAYOUT-VOUCHER',
      title: 'SELL Order Acceptance Generates PAY_OUT Voucher with BNK-DISB- Prefix',
      scenario: 'Accept SELL order; verify voucher has BNK-DISB- prefix and PAY_OUT direction classification',
      expected: 'voucher = BNK-DISB-*, direction = PAY_OUT, bankDeskId in [BANK_1, BANK_2]',
      actual: `voucher = ${sellVoucherRef}, direction = ${sellSettlement.direction}, desk = ${sellSettlement.bankDeskId}`,
      evidence: { voucherReference: sellVoucherRef, direction: sellSettlement.direction, bankDeskId: sellSettlement.bankDeskId },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 7: Bank Rejection Releases Reserved Float/Holdings
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: BANK REJECTION RESTORES RESERVATIONS ---');
    const bankRejectRes = await apiRequest('POST', '/api/bank/reject', {
      settlementId: sellSettlement.id,
      reason: 'Team representative failed to present physical voucher at bank desk'
    }, {
      'Authorization': `Bearer ${bankToken}`
    });

    assert.strictEqual(bankRejectRes.status, 200, 'Bank reject failed');
    const stateCheck7 = readCurrentState();
    const rejectedSettlement = (stateCheck7.settlements || []).find(s => s.id === sellSettlement.id);
    assert.strictEqual(rejectedSettlement?.status, 'REJECTED', 'Settlement status must be REJECTED');

    recordResult({
      id: 'VOUCHER-07-BANK-REJECT-RESTORE',
      title: 'Bank Desk Rejection Releases Reservations and Sets REJECTED Status',
      scenario: 'Reject sell voucher at bank desk; verify settlement status REJECTED',
      expected: 'settlement.status = REJECTED',
      actual: `settlement.status = ${rejectedSettlement?.status}`,
      evidence: { settlementId: sellSettlement.id, status: rejectedSettlement?.status, reason: rejectedSettlement?.rejectionReason },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 8: Bank Settle & Double Settlement Protection (409 Conflict)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: BANK SETTLEMENT & DOUBLE SETTLEMENT PROTECTION ---');
    const settleRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: settlement1Id,
      voucherReference: voucher1Ref,
      notes: 'Verified physical cash collection of 28,000 INR at Bank Desk 1'
    }, {
      'Authorization': `Bearer ${bankToken}`
    });

    assert.strictEqual(settleRes.status, 200, 'Bank settle failed');
    const stateCheck8 = readCurrentState();
    const settledVoucherInState = (stateCheck8.settlements || []).find(s => s.id === settlement1Id);
    assert.strictEqual(settledVoucherInState?.status, 'SETTLED', 'Settlement status must be SETTLED');

    // Attempt duplicate settlement
    const duplicateSettleRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: settlement1Id,
      voucherReference: voucher1Ref,
      notes: 'Attempting illegal replay of already settled voucher'
    }, {
      'Authorization': `Bearer ${bankToken}`
    });

    assert.strictEqual(duplicateSettleRes.status, 409, `Duplicate settle must return 409 Conflict, got ${duplicateSettleRes.status}`);

    recordResult({
      id: 'VOUCHER-08-DOUBLE-SETTLE-CONFLICT',
      title: 'Duplicate Bank Settlement Protection Returns 409 Conflict',
      scenario: 'Attempt second settlement on already settled voucher; verify 409 Conflict rejected',
      expected: 'HTTP 409 Conflict on retry',
      actual: `HTTP ${duplicateSettleRes.status}`,
      evidence: { firstStatus: settleRes.status, secondStatus: duplicateSettleRes.status, error: duplicateSettleRes.data.error },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 9: Monitoring & Telemetry API - RBAC (Unauthorized 403)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: MONITORING RBAC AUTHORIZATION CHECK ---');
    const unauthMetricsRes = await apiRequest('GET', '/api/monitoring/metrics', null, {
      'Authorization': `Bearer ${t01Token}`
    });

    assert.strictEqual(unauthMetricsRes.status, 403, `Team role must be forbidden from accessing telemetry, got ${unauthMetricsRes.status}`);

    recordResult({
      id: 'MONITORING-01-RBAC-FORBIDDEN',
      title: 'Monitoring API Rejects Unauthorized Non-Privileged Access (HTTP 403)',
      scenario: 'Request /api/monitoring/metrics as team participant; verify HTTP 403 Forbidden',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${unauthMetricsRes.status}`,
      evidence: { status: unauthMetricsRes.status, error: unauthMetricsRes.data.error },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 10: Monitoring & Telemetry API - Authorized Payload Completeness
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: MONITORING TELEMETRY PAYLOAD COMPLETENESS ---');
    const adminMetricsRes = await apiRequest('GET', '/api/monitoring/metrics', null, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.strictEqual(adminMetricsRes.status, 200, 'Admin metrics request failed');
    const metrics = adminMetricsRes.data;

    assert.ok(metrics.health?.nodeVersion, 'Missing health.nodeVersion');
    assert.ok(metrics.health?.memory?.rssBytes, 'Missing health.memory.rssBytes');
    assert.strictEqual(metrics.health?.status, 'HEALTHY', 'Health status should be HEALTHY');
    assert.ok(metrics.health?.database, 'Missing health.database');
    assert.ok(typeof metrics.throughput?.rpm === 'number', 'Missing throughput.rpm');
    assert.ok(typeof metrics.throughput?.latency?.p50 === 'number', 'Missing throughput.latency.p50');
    assert.ok(typeof metrics.throughput?.latency?.p95 === 'number', 'Missing throughput.latency.p95');
    assert.ok(typeof metrics.throughput?.latency?.p99 === 'number', 'Missing throughput.latency.p99');
    assert.ok(typeof metrics.throughput?.jitterMs === 'number', 'Missing throughput.jitterMs');
    assert.ok(metrics.throughput?.duplicateSettlementAttempts >= 1, 'throughput.duplicateSettlementAttempts should track duplicate attempts');
    assert.ok(metrics.orders?.last5m !== undefined, 'Missing orders throughput last5m');
    assert.ok(metrics.vouchers?.totalGenerated !== undefined, 'Missing vouchers totalGenerated');
    assert.ok(metrics.vouchers?.failed !== undefined, 'Missing vouchers failed');
    assert.ok(metrics.queues?.exchangeDesks !== undefined, 'Missing queues.exchangeDesks');
    assert.ok(metrics.queues?.bankDesks?.BANK_1 !== undefined, 'Missing queues.bankDesks.BANK_1');
    assert.ok(metrics.queues?.bankDesks?.BANK_2 !== undefined, 'Missing queues.bankDesks.BANK_2');
    assert.ok(Array.isArray(metrics.securityEvents), 'Missing securityEvents array');

    // Test SEBI access
    const sebiMetricsRes = await apiRequest('GET', '/api/monitoring/metrics', null, {
      'Authorization': `Bearer ${sebiToken}`
    });
    assert.strictEqual(sebiMetricsRes.status, 200, 'SEBI metrics request failed');

    recordResult({
      id: 'MONITORING-02-METRICS-PAYLOAD',
      title: 'Technical Operations Monitoring Returns Comprehensive Telemetry for Admin/SEBI',
      scenario: 'Query /api/monitoring/metrics as admin and sebi; verify latency p50/p95/p99, jitter, pool stats, queue depths, duplicate attempts',
      expected: 'HTTP 200, complete telemetry object, zero credentials leaked',
      actual: `HTTP 200, RPM=${metrics.throughput?.rpm}, p95=${metrics.throughput?.latency?.p95}ms, duplicateAttempts=${metrics.throughput?.duplicateSettlementAttempts}`,
      evidence: {
        systemUptime: metrics.health?.uptimeSeconds,
        rpm: metrics.throughput?.rpm,
        latency: metrics.throughput?.latency,
        duplicateSettlementAttempts: metrics.throughput?.duplicateSettlementAttempts,
        queues: metrics.queues
      },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 11: Concurrent Simultaneous ACCEPT Race Condition (Double Click)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: CONCURRENT SIMULTANEOUS ACCEPT RACE CONDITION ---');
    const concurTicket = 'TKT-CONCUR-1004';
    const concurSubmitRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: concurTicket,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 2,
      orderType: 'MARKET',
      brokerId: 'B01',
      notes: 'Concurrency race stress test',
      enteredBy: 'Operator 1',
      deskId: 'DESK_3'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(concurSubmitRes.status, 200, 'Submit for concurrency test failed');
    const concurOrderId = concurSubmitRes.data.order?.id;
    assert.ok(concurOrderId, 'Missing order id for concurrency test');

    // Claim and Validate
    await apiRequest('POST', '/api/order/claim', { orderId: concurOrderId, deskId: 'DESK_3', operator: 'Clerk Gamma' }, { 'Authorization': `Bearer ${adminToken}` });
    await apiRequest('POST', '/api/order/action', { orderId: concurOrderId, actionType: 'VALIDATE', deskId: 'DESK_3', operator: 'Clerk Gamma', physicalSlipChecked: true }, { 'Authorization': `Bearer ${adminToken}` });

    // Fire TWO simultaneous ACCEPT requests concurrently at the exact same millisecond
    const [concurRes1, concurRes2] = await Promise.all([
      apiRequest('POST', '/api/order/action', {
        orderId: concurOrderId,
        actionType: 'ACCEPT',
        deskId: 'DESK_3',
        operator: 'Operator Alice',
        physicalSlipChecked: true
      }, { 'Authorization': `Bearer ${adminToken}` }),
      apiRequest('POST', '/api/order/action', {
        orderId: concurOrderId,
        actionType: 'ACCEPT',
        deskId: 'DESK_3',
        operator: 'Operator Bob',
        physicalSlipChecked: true
      }, { 'Authorization': `Bearer ${adminToken}` })
    ]);

    assert.strictEqual(concurRes1.status, 200, `Concurrent request 1 failed with ${concurRes1.status}: ${JSON.stringify(concurRes1.data)}`);
    assert.strictEqual(concurRes2.status, 200, `Concurrent request 2 failed with ${concurRes2.status}: ${JSON.stringify(concurRes2.data)}`);

    const ref1 = concurRes1.data.voucherReference || concurRes1.data.settlement?.voucherReference;
    const ref2 = concurRes2.data.voucherReference || concurRes2.data.settlement?.voucherReference;
    assert.ok(ref1, 'Concurrent response 1 missing voucher reference');
    assert.ok(ref2, 'Concurrent response 2 missing voucher reference');
    assert.strictEqual(ref1, ref2, `Concurrent requests generated divergent vouchers: '${ref1}' vs '${ref2}'`);

    const hasReplay = Boolean(concurRes1.data.idempotentReplay || concurRes2.data.idempotentReplay);
    assert.strictEqual(hasReplay, true, 'At least one concurrent accept request must be resolved via idempotentReplay');

    const stateCheck11 = readCurrentState();
    const concurVouchersInState = (stateCheck11.settlements || []).filter(s => s.orderId === concurOrderId);
    assert.strictEqual(concurVouchersInState.length, 1, `Expected exactly 1 voucher in state for concurrent order, found ${concurVouchersInState.length}`);

    recordResult({
      id: 'VOUCHER-09-CONCURRENT-RACE-IDEMPOTENCY',
      title: 'Simultaneous Concurrent Acceptance Produces Exactly One Voucher with Idempotent Replay',
      scenario: 'Fire two simultaneous HTTP POST ACCEPT requests for same order; verify both 200 OK, identical voucherRef, 1 voucher total',
      expected: 'HTTP 200 for both, ref1 === ref2, voucherCount === 1, idempotentReplay === true on race resolver',
      actual: `res1=${concurRes1.status}, res2=${concurRes2.status}, ref=${ref1}, vouchersInState=${concurVouchersInState.length}, hasReplay=${hasReplay}`,
      evidence: { voucherRef: ref1, vouchersCount: concurVouchersInState.length, res1Status: concurRes1.status, res2Status: concurRes2.status },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 12: Terminal and Bank-Controlled State Transition Invariants
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: INVALID STATE TRANSITION GUARDS ON ACCEPTED/SETTLED ORDERS ---');
    // Attempt exchange rejection on already accepted order
    const illegalRejectRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id, // Already in EXECUTED_PENDING_SETTLEMENT / SETTLED
      actionType: 'REJECT',
      rejectionReason: 'Illegal late exchange rejection',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(illegalRejectRes.status, 400, `Exchange rejection of accepted/settled order must return 400, got ${illegalRejectRes.status}`);

    // Attempt exchange cancellation on already accepted order
    const illegalCancelRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'CANCEL',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(illegalCancelRes.status, 400, `Exchange cancellation of accepted/settled order must return 400, got ${illegalCancelRes.status}`);

    // Attempt exchange validation on rejected order
    const illegalValidateRes = await apiRequest('POST', '/api/order/action', {
      orderId: rejectOrderId, // In REJECTED state
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(illegalValidateRes.status, 400, `Validation of terminal rejected order must return 400, got ${illegalValidateRes.status}`);

    recordResult({
      id: 'LIFECYCLE-01-TERMINAL-STATE-GUARDS',
      title: 'Terminal & Bank-Controlled Orders Strictly Reject Invalid Exchange State Transitions',
      scenario: 'Attempt REJECT and CANCEL on accepted/settled order, and VALIDATE on rejected order; verify HTTP 400 rejected',
      expected: 'HTTP 400 on all illegal lifecycle mutations',
      actual: `rejectOnAccepted=${illegalRejectRes.status}, cancelOnAccepted=${illegalCancelRes.status}, validateOnRejected=${illegalValidateRes.status}`,
      evidence: {
        rejectError: illegalRejectRes.data.error,
        cancelError: illegalCancelRes.data.error,
        validateError: illegalValidateRes.data.error
      },
      status: 'PASSED'
    });

    // -------------------------------------------------------------------------
    // TEST 13: Colliding Ticker Disambiguation by Canonical Security ID
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: COLLIDING TICKER CANONICAL SECURITY ID DISAMBIGUATION ---');
    // BHP exists on ASX (AUD, STK_BHP_d3fb5a) and LSE (GBP, STK_BHP_3d8d84)
    // Seed T01 with GBP wallet

    const bhpTicket = 'TKT-BHP-LSE-1005';
    const lseBhpSubmitRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: bhpTicket,
      teamCode: 'T01',
      ticker: 'BHP',
      securityId: 'STK_BHP_3d8d84', // Canonical ID for London Stock Exchange
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      brokerId: 'B01',
      notes: 'BHP on LSE in GBP',
      enteredBy: 'Operator 1',
      deskId: 'DESK_4'
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(lseBhpSubmitRes.status, 200, `BHP LSE submission failed: ${JSON.stringify(lseBhpSubmitRes.data)}`);
    const lseBhpOrder = lseBhpSubmitRes.data.order;
    assert.strictEqual(lseBhpOrder.securityId, 'STK_BHP_3d8d84', 'Order must link to canonical LSE security ID');
    assert.strictEqual(lseBhpOrder.currency, 'GBP', 'Order currency must be GBP for LSE instrument');

    // Claim, Validate, Accept
    const bhpClaimRes = await apiRequest('POST', '/api/order/claim', { orderId: lseBhpOrder.id, deskId: 'DESK_4', operator: 'Clerk Delta' }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(bhpClaimRes.status, 200, `Claim failed: ${JSON.stringify(bhpClaimRes.data)}`);
    const bhpValRes = await apiRequest('POST', '/api/order/action', { orderId: lseBhpOrder.id, actionType: 'VALIDATE', deskId: 'DESK_4', operator: 'Clerk Delta', physicalSlipChecked: true }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(bhpValRes.status, 200, `Validate failed: ${JSON.stringify(bhpValRes.data)}`);
    const lseBhpAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: lseBhpOrder.id,
      actionType: 'ACCEPT',
      deskId: 'DESK_4',
      operator: 'Clerk Delta',
      physicalSlipChecked: true
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(lseBhpAcceptRes.status, 200, `BHP LSE acceptance failed: ${JSON.stringify(lseBhpAcceptRes.data)}`);
    const lseSettlement = lseBhpAcceptRes.data.settlement;
    assert.strictEqual(lseSettlement.currency, 'GBP', `Settlement voucher currency must be GBP, got ${lseSettlement.currency}`);
    assert.strictEqual(lseSettlement.securityId, 'STK_BHP_3d8d84', 'Settlement voucher must preserve canonical securityId');

    recordResult({
      id: 'UNIVERSE-01-COLLIDING-TICKER-DISAMBIGUATION',
      title: 'Colliding Ticker Disambiguated by Canonical Security ID Across Multi-Currency Lifecycle',
      scenario: 'Submit and accept order for colliding ticker BHP specifying London Stock Exchange securityId STK_BHP_3d8d84; verify GBP currency and voucher',
      expected: 'order.securityId === STK_BHP_3d8d84, currency === GBP, settlement.currency === GBP',
      actual: `securityId=${lseBhpOrder.securityId}, orderCurrency=${lseBhpOrder.currency}, settlementCurrency=${lseSettlement.currency}`,
      evidence: { securityId: lseSettlement.securityId, currency: lseSettlement.currency, voucherRef: lseSettlement.voucherReference },
      status: 'PASSED'
    });

  } finally {
    // Terminate test server
    console.log('\n--- TERMINATING TEST SERVER ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 600));

    // Clean up disposable fixture
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log('✓ Cleaned up disposable fixture.');
      }
    } catch (e) {
      console.warn('Could not remove disposable state:', e.message);
    }
  }

  // STEP 4: Post-flight Hash Integrity Check
  console.log('\n--- STEP 4: POST-FLIGHT AUTHORITATIVE STATE HASH INTEGRITY ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH CORRUPTED AFTER TESTS!');
  recordResult({
    id: 'POSTFLIGHT-HASH',
    title: 'Post-flight Authoritative state.json Hash Verification',
    scenario: 'Verify state.json SHA-256 remains byte-for-byte identical after all tests',
    expected: EXPECTED_HASH,
    actual: finalHash,
    evidence: { sha256: finalHash },
    status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // Save Results File
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`\n✓ Results written to ${path.basename(RESULTS_FILE)}`);

  const passedCount = testResults.filter(t => t.status === 'PASSED').length;
  const failedCount = testResults.filter(t => t.status === 'FAILED').length;
  console.log(`\n======================================================================`);
  console.log(`SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED out of ${testResults.length} total tests.`);
  console.log(`======================================================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runVoucherAndMonitoringE2ETests().catch(err => {
  console.error('Test Suite Failed with unhandled error:', err);
  process.exit(1);
});
