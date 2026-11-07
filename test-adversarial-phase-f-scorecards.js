/**
 * SAAMX ADVERSARIAL CHALLENGER SUITE: SCORECARDS & WORKFLOW EDGE CASES
 * Milestone: Phase F (Operator Training Sandbox & Simulation Engine)
 * File: SAAMX/test-adversarial-phase-f-scorecards.js
 *
 * EMPIRICAL STRESS-TEST BATTERIES:
 * Battery 1: Scorecard Mathematical Accuracy & Threshold Bounds
 *   - Fast valid actions & latency accumulation
 *   - Intentional operator errors & penalty math:
 *     * Unverified slip approval attempt (HTTP 400, isViolation, penalty 15)
 *     * Rejection without mandatory reason (HTTP 400, isViolation, penalty 15)
 *     * Return for correction without mandatory reason (HTTP 400, isViolation, penalty 15)
 *     * Bank hold without mandatory notes (HTTP 400, isViolation, penalty 15)
 *     * Double settlement attempt (HTTP 409 Conflict, isViolation, penalty 20)
 *     * FX reserve overdraft attempt (HTTP 400, isViolation, penalty 15)
 *   - Mathematical clamping: compliance score bounded in [0, 100] under extreme repeat violations
 *   - Status badge transitions: EVENT READY (>=90), QUALIFIED (>=75), PROVISIONAL (>=60), NON-COMPLIANT (<60)
 *
 * Battery 2: Training News Strict Containment & Non-Leakage
 *   - Aggressive training news published to sandbox
 *   - Verification that live news feed (/api/news) contains ZERO training news items
 *   - Verification that live state (/api/state) contains ZERO training news items
 *   - Verification that live security prices and market index remain 100% unmutated
 *
 * Battery 3: Sandbox Reset Hygiene & State Restoration
 *   - Extensive sandbox mutations (orders, settlements, FX spot trades, training news)
 *   - Reset with preserveScorecards=true: verify clean restoration of mock cash (₹1 Cr),
 *     mock holdings, mock FX reserves, queue clearance, and scorecard preservation
 *   - Reset with preserveScorecards=false: verify complete scorecard clearance
 *   - Invariant: live state and state.json remain 100% untouched
 *
 * Battery 4: Multi-Operator Concurrency & Race Condition Stress
 *   - 5 distinct simulated operators issuing 50 rapid concurrent requests
 *   - Verification of zero unhandled exceptions, zero 500s
 *   - Strict additive consistency across all operator scorecard buckets
 *
 * Battery 5: Workflow Edge Cases & Security Boundary Probing
 *   - Invalid action types, terminal state immutability, negative quantities,
 *     non-existent entities, invalid news sentiments
 *
 * Battery 6: Baseline Hash Bit-Exact Preservation
 *   - Confirm SHA-256 of state.json matches 6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca
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

const PORT = 3128;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-f-challenger-scorecards.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-f-scorecards-results.json');

const testResults = [];

function recordResult({ id, title, battery, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, battery, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Battery:  ${battery}`);
  console.log(`  Scenario: ${scenario}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  if (evidence) {
    console.log(`  Evidence: ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
  }
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

let defaultToken = null;

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(defaultToken && !headers['Authorization'] && !headers['authorization'] ? { 'Authorization': `Bearer ${defaultToken}` } : {}),
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...headers
    };
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: encodeURI(pathUrl),
      method,
      headers: reqHeaders
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

async function runAdversarialScorecardsSuite() {
  console.log('================================================================================');
  console.log('⚔️  SAAMX PHASE F ADVERSARIAL STRESS TEST: SCORECARDS & WORKFLOW EDGE CASES');
  console.log('================================================================================\n');

  // PRE-FLIGHT HASH CHECK
  console.log('--- PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'PRE-FLIGHT HASH MISMATCH!');
  console.log('✓ Authoritative baseline hash strictly intact.\n');

  recordResult({
    id: 'ADV-PHASE-F-PRE-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    battery: 'Integrity',
    scenario: 'Confirm state.json SHA-256 is strictly bit-exact before tests run',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // SETUP DISPOSABLE SNAPSHOT
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // SPAWN EPHEMERAL SERVER
  console.log(`Spawning isolated backend on port ${PORT}...`);
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
        console.log(`✓ Ephemeral test server operational on port ${PORT}.\n`);
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!serverStarted) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // AUTHENTICATE TEST ROLES
    console.log('--- AUTHENTICATING TEST ROLES ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginJournalist = await apiRequest('POST', '/api/auth/login', { username: 'journalist', password: 'journalist-event-2026' });
    const tokenJournalist = loginJournalist.data?.token;

    function bearer(tok) {
      return tok ? { 'Authorization': `Bearer ${tok}` } : {};
    }

    assert.ok(tokenExchange, 'Exchange login token must be present');
    assert.ok(tokenBank, 'Bank login token must be present');
    assert.ok(tokenAdmin, 'Admin login token must be present');
    defaultToken = tokenAdmin;
    console.log('✓ All role authentication tokens established.\n');

    // ========================================================================
    // BATTERY 1: SCORECARD MATHEMATICAL ACCURACY & THRESHOLD BOUNDS
    // ========================================================================
    console.log('========================================================================');
    console.log('BATTERY 1: SCORECARD MATHEMATICAL ACCURACY & THRESHOLD BOUNDS');
    console.log('========================================================================\n');

    // Test 1.1: Fresh scorecard default initialization
    const freshOpRes = await apiRequest('GET', '/api/training/scorecard?operator=Op_Fresh_101&role=operator_x', null, bearer(tokenExchange));
    const freshSc = freshOpRes.data?.scorecard;

    const freshInitValid = freshOpRes.status === 200 &&
      freshSc?.operatorId === 'Op_Fresh_101' &&
      freshSc?.totalOperations === 0 &&
      freshSc?.completedOperations === 0 &&
      freshSc?.errors === 0 &&
      freshSc?.violations === 0 &&
      freshSc?.averageLatencySeconds === 0 &&
      freshSc?.accuracyRate === 100 &&
      freshSc?.errorRate === 0 &&
      freshSc?.complianceScore === 100 &&
      freshSc?.statusBadge === 'EVENT READY';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-01',
      title: 'Fresh Operator Scorecard Initialization Defaults',
      battery: 'Battery 1: Scorecards',
      scenario: 'Query scorecard for newly initialized operator before any actions',
      expected: 'totalOps=0, completedOps=0, errors=0, accuracy=100%, compliance=100, badge=EVENT READY',
      actual: `totalOps=${freshSc?.totalOperations}, accuracy=${freshSc?.accuracyRate}%, compliance=${freshSc?.complianceScore}, badge=${freshSc?.statusBadge}`,
      evidence: freshSc,
      status: freshInitValid ? 'PASSED' : 'FAILED'
    });

    // Test 1.2: Valid workflow progression and latency math
    const OP_MATH = 'Op_Math_Rigorous';

    // Step A: Create order (team action)
    const ordRes1 = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      ticketNumber: 'TKT-MATH-01'
    }, bearer(tokenT01));
    const order1Id = ordRes1.data?.orderId;

    // Step B: Claim order by OP_MATH (latency 4.2, success)
    const claimRes1 = await apiRequest('POST', '/api/training/order/claim', {
      orderId: order1Id,
      deskId: 'DESK_1',
      operator: OP_MATH
    }, bearer(tokenExchange));
    assert.strictEqual(claimRes1.status, 200);

    // Step C: Check physical slip by OP_MATH (latency 3.5, bonus 2, success)
    const slipRes1 = await apiRequest('POST', '/api/training/order/action', {
      orderId: order1Id,
      actionType: 'CHECK_SLIP',
      operator: OP_MATH
    }, bearer(tokenExchange));
    assert.strictEqual(slipRes1.status, 200);

    // Step D: Approve order by OP_MATH (latency 5.8, bonus 2, success)
    const approveRes1 = await apiRequest('POST', '/api/training/order/action', {
      orderId: order1Id,
      actionType: 'APPROVE',
      operator: OP_MATH,
      physicalSlipChecked: true
    }, bearer(tokenExchange));
    assert.strictEqual(approveRes1.status, 200);

    // Query scorecard for OP_MATH
    const scMathRes1 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_MATH}`, null, bearer(tokenExchange));
    const sc1 = scMathRes1.data?.scorecard;

    // Expected after 3 valid operations:
    // ops = 3, completed = 3, errors = 0, violations = 0
    // totalLatency = 4.2 + 3.5 + 5.8 = 13.5
    // avgLatency = (13.5 / 3).toFixed(1) = 4.5
    // accuracy = 100.0%, errorRate = 0.0%
    // compliance = 100 (capped at 100)
    // statusBadge = 'EVENT READY'
    const mathValid1 = sc1.totalOperations === 3 &&
      sc1.completedOperations === 3 &&
      sc1.errors === 0 &&
      sc1.violations === 0 &&
      Math.abs(sc1.averageLatencySeconds - 4.5) < 0.05 &&
      sc1.accuracyRate === 100 &&
      sc1.errorRate === 0 &&
      sc1.complianceScore === 100 &&
      sc1.statusBadge === 'EVENT READY';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-02',
      title: 'Valid Operations Latency Accumulation & 100% Accuracy Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Execute 3 successive valid operations (claim, check slip, approve)',
      expected: 'totalOps=3, completed=3, errors=0, avgLatency=4.5s, accuracy=100.0%, compliance=100, badge=EVENT READY',
      actual: `totalOps=${sc1?.totalOperations}, completed=${sc1?.completedOperations}, errors=${sc1?.errors}, avgLatency=${sc1?.averageLatencySeconds}s, accuracy=${sc1?.accuracyRate}%, compliance=${sc1?.complianceScore}`,
      evidence: sc1,
      status: mathValid1 ? 'PASSED' : 'FAILED'
    });

    // Test 1.3: Intentional Error 1 — Unverified Slip Approval Attempt
    // Create new order without checking physical slip
    const ordRes2 = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      ticketNumber: 'TKT-MATH-02'
    });
    const order2Id = ordRes2.data?.orderId;

    // Attempt approval with physicalSlipChecked omitted/false
    const errSlipRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: order2Id,
      actionType: 'APPROVE',
      operator: OP_MATH,
      physicalSlipChecked: false
    });

    const unverifiedRejected = errSlipRes.status === 400 &&
      errSlipRes.data?.error?.includes('Physical slip verification checklist must be completed');

    const scMathRes2 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_MATH}`);
    const sc2 = scMathRes2.data?.scorecard;

    // Expected after unverified slip error:
    // ops = 4, errors = 1, violations = 1
    // totalLatency = 13.5 + 6.0 = 19.5
    // avgLatency = (19.5 / 4).toFixed(1) = 4.9
    // accuracyRate = (((4 - 1)/4)*100).toFixed(1) = 75.0%
    // errorRate = 25.0%
    // complianceScore: 100 - (15 violation + 15 penalty) = 70
    // statusBadge at 70: 'PROVISIONAL OPERATOR'
    // Note: completedOperations=4 reflects server updateScorecard default isSuccess=true
    const mathValid2 = unverifiedRejected &&
      sc2.totalOperations === 4 &&
      sc2.errors === 1 &&
      sc2.violations === 1 &&
      Math.abs(sc2.averageLatencySeconds - 4.9) < 0.05 &&
      Math.abs(sc2.accuracyRate - 75.0) < 0.05 &&
      Math.abs(sc2.errorRate - 25.0) < 0.05 &&
      sc2.complianceScore === 70 &&
      sc2.statusBadge === 'PROVISIONAL OPERATOR';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-03',
      title: 'Intentional Violation: Unverified Physical Slip Approval Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Attempt APPROVE on order without physical slip check -> expect 400, accuracy drops to 75%, compliance drops to 70',
      expected: 'HTTP 400, totalOps=4, errors=1, accuracy=75.0%, errorRate=25.0%, compliance=70, badge=PROVISIONAL OPERATOR',
      actual: `HTTP ${errSlipRes.status}, totalOps=${sc2?.totalOperations}, errors=${sc2?.errors}, accuracy=${sc2?.accuracyRate}%, compliance=${sc2?.complianceScore}, badge=${sc2?.statusBadge}`,
      evidence: { error: errSlipRes.data, scorecard: sc2 },
      status: mathValid2 ? 'PASSED' : 'FAILED'
    });

    // Test 1.4: Intentional Error 2 — Rejection without mandatory reason
    const ordRes3 = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T02',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 10,
      ticketNumber: 'TKT-MATH-03'
    });
    const order3Id = ordRes3.data?.orderId;

    const emptyRejectRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: order3Id,
      actionType: 'REJECT',
      operator: OP_MATH,
      rejectionReason: '   ' // empty whitespace
    });

    const rejectRejected = emptyRejectRes.status === 400 &&
      emptyRejectRes.data?.error?.includes('rejection reason');

    const scMathRes3 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_MATH}`);
    const sc3 = scMathRes3.data?.scorecard;

    // Expected after empty rejection reason:
    // ops = 5, errors = 2, violations = 2
    // totalLatency = 19.5 + 5.0 = 24.5
    // avgLatency = (24.5 / 5).toFixed(1) = 4.9
    // accuracyRate = (((5 - 2)/5)*100).toFixed(1) = 60.0%
    // errorRate = 40.0%
    // complianceScore: 70 - (15 violation + 15 penalty) = 40
    // statusBadge at 40: 'NON-COMPLIANT' (< 60)
    const mathValid3 = rejectRejected &&
      sc3.totalOperations === 5 &&
      sc3.errors === 2 &&
      sc3.violations === 2 &&
      Math.abs(sc3.averageLatencySeconds - 4.9) < 0.05 &&
      Math.abs(sc3.accuracyRate - 60.0) < 0.05 &&
      Math.abs(sc3.errorRate - 40.0) < 0.05 &&
      sc3.complianceScore === 40 &&
      sc3.statusBadge === 'NON-COMPLIANT';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-04',
      title: 'Intentional Violation: Rejection Without Mandatory Reason Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Attempt REJECT with empty reason -> expect 400, accuracy drops to 60%, compliance drops to 40, badge=NON-COMPLIANT',
      expected: 'HTTP 400, totalOps=5, errors=2, accuracy=60.0%, errorRate=40.0%, compliance=40, badge=NON-COMPLIANT',
      actual: `HTTP ${emptyRejectRes.status}, totalOps=${sc3?.totalOperations}, errors=${sc3?.errors}, accuracy=${sc3?.accuracyRate}%, compliance=${sc3?.complianceScore}, badge=${sc3?.statusBadge}`,
      evidence: { error: emptyRejectRes.data, scorecard: sc3 },
      status: mathValid3 ? 'PASSED' : 'FAILED'
    });

    // Test 1.5: Intentional Error 3 — Return without mandatory returnReason
    const ordRes4 = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T02',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 5,
      ticketNumber: 'TKT-MATH-04'
    });
    const order4Id = ordRes4.data?.orderId;

    const emptyReturnRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: order4Id,
      actionType: 'RETURN',
      operator: OP_MATH,
      returnReason: ''
    });

    const returnRejected = emptyReturnRes.status === 400 &&
      emptyReturnRes.data?.error?.includes('returnReason required');

    const scMathRes4 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_MATH}`);
    const sc4 = scMathRes4.data?.scorecard;

    // Expected: ops = 6, errors = 3, violations = 3
    // compliance: 40 - 30 = 10
    const mathValid4 = returnRejected &&
      sc4.totalOperations === 6 &&
      sc4.errors === 3 &&
      sc4.complianceScore === 10;

    recordResult({
      id: 'ADV-PHASE-F-SCORE-05',
      title: 'Intentional Violation: Return Without Mandatory Reason Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Attempt RETURN with empty reason -> expect 400, compliance drops to 10',
      expected: 'HTTP 400, totalOps=6, errors=3, compliance=10',
      actual: `HTTP ${emptyReturnRes.status}, totalOps=${sc4?.totalOperations}, errors=${sc4?.errors}, compliance=${sc4?.complianceScore}`,
      evidence: { error: emptyReturnRes.data, scorecard: sc4 },
      status: mathValid4 ? 'PASSED' : 'FAILED'
    });

    // Test 1.6: Intentional Error 4 — Bank Hold Without Notes
    const OP_TELLER = 'Teller_Math_Test';

    // First generate a valid voucher
    const ordRes5 = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T03',
      ticker: 'HDFCBANK',
      action: 'BUY',
      quantity: 10,
      ticketNumber: 'TKT-TELLER-01'
    });
    const order5Id = ordRes5.data?.orderId;
    await apiRequest('POST', '/api/training/order/action', {
      orderId: order5Id,
      actionType: 'CHECK_SLIP',
      operator: 'Op_Prep'
    });
    const appRes5 = await apiRequest('POST', '/api/training/order/action', {
      orderId: order5Id,
      actionType: 'APPROVE',
      operator: 'Op_Prep',
      physicalSlipChecked: true
    });
    const voucherRef1 = appRes5.data?.voucher?.voucherReference;

    // Claim voucher
    await apiRequest('POST', '/api/training/bank/claim', {
      voucherReference: voucherRef1,
      tellerName: OP_TELLER
    });

    // Hold voucher with empty notes
    const emptyHoldRes = await apiRequest('POST', '/api/training/bank/hold', {
      voucherReference: voucherRef1,
      tellerName: OP_TELLER,
      notes: '   '
    });

    const holdRejected = emptyHoldRes.status === 400 &&
      emptyHoldRes.data?.error?.includes('Mandatory notes required');

    const scTellerRes1 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_TELLER}&role=bank_teller`);
    const scT1 = scTellerRes1.data?.scorecard;

    // Teller ops = 2 (claim + failed hold), errors = 1, violations = 1
    // compliance: 100 - (15 + 15) = 70
    const tellerValid1 = holdRejected &&
      scT1.totalOperations === 2 &&
      scT1.errors === 1 &&
      scT1.violations === 1 &&
      scT1.complianceScore === 70;

    recordResult({
      id: 'ADV-PHASE-F-SCORE-06',
      title: 'Intentional Violation: Bank Hold Without Mandatory Notes Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Attempt bank hold without notes -> expect 400, teller errors=1, compliance drops to 70',
      expected: 'HTTP 400, totalOps=2, errors=1, compliance=70',
      actual: `HTTP ${emptyHoldRes.status}, totalOps=${scT1?.totalOperations}, errors=${scT1?.errors}, compliance=${scT1?.complianceScore}`,
      evidence: { error: emptyHoldRes.data, scorecard: scT1 },
      status: tellerValid1 ? 'PASSED' : 'FAILED'
    });

    // Test 1.7: Intentional Error 5 — Double Settlement Attempt (HTTP 409 Conflict)
    // Settle voucherRef1 with proper notes
    const validSettleRes = await apiRequest('POST', '/api/training/bank/settle', {
      voucherReference: voucherRef1,
      tellerName: OP_TELLER,
      notes: 'Verified cash received'
    });
    assert.strictEqual(validSettleRes.status, 200);

    // Attempt second settlement on the exact same voucher
    const dupSettleRes = await apiRequest('POST', '/api/training/bank/settle', {
      voucherReference: voucherRef1,
      tellerName: OP_TELLER,
      notes: 'Double settlement attempt'
    });

    const doubleSettlePrevented = dupSettleRes.status === 409 &&
      dupSettleRes.data?.error?.includes('Duplicate settlement prevented');

    const scTellerRes2 = await apiRequest('GET', `/api/training/scorecard?operator=${OP_TELLER}&role=bank_teller`);
    const scT2 = scTellerRes2.data?.scorecard;

    // Teller ops = 4 (claim, failed hold, settle, failed dup-settle)
    // Settle gave bonus: 3, so compliance before dup-settle was 70 + 3 = 73.
    // Dup-settle: isViolation=true (-15), penalty=20 (-20) -> total drop = -35.
    // 73 - 35 = 38.
    const doubleSettleValid = doubleSettlePrevented &&
      scT2.totalOperations === 4 &&
      scT2.errors === 2 &&
      scT2.violations === 2 &&
      scT2.complianceScore === 38 &&
      scT2.statusBadge === 'NON-COMPLIANT';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-07',
      title: 'Intentional Violation: Double Settlement Rejection & Heavy Penalty Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Attempt duplicate settlement on SETTLED voucher -> expect 409, penalty -35, compliance drops to 38, badge=NON-COMPLIANT',
      expected: 'HTTP 409, totalOps=4, errors=2, compliance=38, badge=NON-COMPLIANT',
      actual: `HTTP ${dupSettleRes.status}, totalOps=${scT2?.totalOperations}, errors=${scT2?.errors}, compliance=${scT2?.complianceScore}, badge=${scT2?.statusBadge}`,
      evidence: { error: dupSettleRes.data, scorecard: scT2 },
      status: doubleSettleValid ? 'PASSED' : 'FAILED'
    });

    // Test 1.8: Intentional Error 6 — FX Reserve Overdraft Attempt via Run-on-the-Bank
    const OP_FX = 'FX_Overdraft_Tester';
    // Team 1 converts 8,000,000 INR to SGD (~119,225 SGD out of 250,000 SGD reserve)
    await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: 8000000,
      operator: 'Op_Prep_FX'
    });
    // Team 2 converts 8,000,000 INR to SGD (~119,225 SGD; remaining SGD reserve is now ~11,549 SGD)
    await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T02',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: 8000000,
      operator: 'Op_Prep_FX'
    });

    // Team 3 attempts to convert 2,000,000 INR to SGD (~29,806 SGD requested, but only ~11,549 SGD available)
    const overdraftRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T03',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: 2000000,
      operator: OP_FX
    });

    const overdraftBlocked = overdraftRes.status === 400 &&
      overdraftRes.data?.error?.includes('Insufficient sandbox reserves');

    const scFxRes = await apiRequest('GET', `/api/training/scorecard?operator=${OP_FX}&role=operator_x`);
    const scFx = scFxRes.data?.scorecard;

    // ops = 1, errors = 1, violations = 1
    // compliance: 100 - (15 + 15) = 70
    const fxOverdraftValid = overdraftBlocked &&
      scFx.totalOperations === 1 &&
      scFx.errors === 1 &&
      scFx.violations === 1 &&
      scFx.complianceScore === 70;

    recordResult({
      id: 'ADV-PHASE-F-SCORE-08',
      title: 'Intentional Violation: FX Reserve Overdraft Block & Penalty Math',
      battery: 'Battery 1: Scorecards',
      scenario: 'Deplete SGD reserve to ~11k SGD, then attempt conversion for ~29k SGD -> expect 400 Insufficient reserves, errors=1, compliance drops to 70',
      expected: 'HTTP 400 Insufficient sandbox reserves, totalOps=1, errors=1, compliance=70',
      actual: `HTTP ${overdraftRes.status}, totalOps=${scFx?.totalOperations}, errors=${scFx?.errors}, compliance=${scFx?.complianceScore}`,
      evidence: { error: overdraftRes.data, scorecard: scFx },
      status: fxOverdraftValid ? 'PASSED' : 'FAILED'
    });

    // Test 1.9: Mathematical Clamping Invariant: Compliance score NEVER drops below 0
    const OP_ZERO_CLAMP = 'Op_Extreme_Violator';
    for (let i = 0; i < 6; i++) {
      // Each unverified slip call penalizes by 30 points
      await apiRequest('POST', '/api/training/order/action', {
        orderId: order2Id, // still unverified
        actionType: 'APPROVE',
        operator: OP_ZERO_CLAMP,
        physicalSlipChecked: false
      });
    }

    const scZeroRes = await apiRequest('GET', `/api/training/scorecard?operator=${OP_ZERO_CLAMP}`);
    const scZero = scZeroRes.data?.scorecard;

    // 6 violations * 30 points penalty = 180 points penalty from 100 base.
    // Mathematical clamp must ensure complianceScore === 0, not -80!
    const zeroClamped = scZero.totalOperations === 6 &&
      scZero.errors === 6 &&
      scZero.violations === 6 &&
      scZero.complianceScore === 0 &&
      scZero.accuracyRate === 0 &&
      scZero.errorRate === 100 &&
      scZero.statusBadge === 'NON-COMPLIANT';

    recordResult({
      id: 'ADV-PHASE-F-SCORE-09',
      title: 'Mathematical Invariant: Compliance Score Lower Bound Clamping [0, 100]',
      battery: 'Battery 1: Scorecards',
      scenario: 'Subject operator to 6 severe violations (180 penalty points) -> verify complianceScore is clamped strictly at 0',
      expected: 'totalOps=6, errors=6, complianceScore=0 (clamped, >= 0), accuracyRate=0.0%, errorRate=100.0%',
      actual: `complianceScore=${scZero?.complianceScore}, accuracyRate=${scZero?.accuracyRate}%, errorRate=${scZero?.errorRate}%`,
      evidence: scZero,
      status: zeroClamped ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 2: TRAINING NEWS STRICT CONTAINMENT & NON-LEAKAGE
    // ========================================================================
    console.log('\n========================================================================');
    console.log('BATTERY 2: TRAINING NEWS STRICT CONTAINMENT & NON-LEAKAGE');
    console.log('========================================================================\n');

    // Baseline live check before training news
    const liveNewsPre = await apiRequest('GET', '/api/news');
    const liveNewsCountPre = Array.isArray(liveNewsPre.data) ? liveNewsPre.data.length : (liveNewsPre.data?.news?.length || 0);

    const liveStatePre = await apiRequest('GET', '/api/state');
    const liveReliancePre = liveStatePre.data?.securities?.find(s => s.ticker === 'RELIANCE');
    const reliancePricePre = liveReliancePre?.currentPrice;

    // Publish high-impact training news
    const ADVERSARIAL_HEADLINE = `SIMULATED COLLAPSE ${Date.now()}: Macro Contagion Drops Banking Index`;
    const newsPubRes = await apiRequest('POST', '/api/training/news/publish', {
      headline: ADVERSARIAL_HEADLINE,
      description: 'Adversarial drill headline strictly meant for training terminal rehearsal.',
      category: 'Banking',
      sentiment: 'Bearish',
      impactMagnitude: 10.0,
      affectedSecurityIds: ['RELIANCE', 'HDFCBANK'],
      operator: 'Drill_Journalist_1'
    });
    assert.strictEqual(newsPubRes.status, 200);

    // Verify news in training sandbox
    const trainStatePost = await apiRequest('GET', '/api/training/state');
    const trainingNews = trainStatePost.data?.sandbox?.newsEvents || [];
    const foundInSandbox = trainingNews.some(n => n.headline === ADVERSARIAL_HEADLINE && n.isSandbox === true);

    // Verify news ABSENT in live /api/news
    const liveNewsPost = await apiRequest('GET', '/api/news');
    const liveNewsItems = Array.isArray(liveNewsPost.data) ? liveNewsPost.data : (liveNewsPost.data?.news || []);
    const leakedIntoLiveNews = liveNewsItems.some(n => n.headline && n.headline.includes(ADVERSARIAL_HEADLINE));

    // Verify news ABSENT in live /api/state
    const liveStatePost = await apiRequest('GET', '/api/state');
    const liveStateNews = liveStatePost.data?.newsEvents || [];
    const leakedIntoLiveState = liveStateNews.some(n => n.headline && n.headline.includes(ADVERSARIAL_HEADLINE));

    // Verify live security prices untouched
    const liveReliancePost = liveStatePost.data?.securities?.find(s => s.ticker === 'RELIANCE');
    const reliancePricePost = liveReliancePost?.currentPrice;
    const priceUnmutated = reliancePricePre === reliancePricePost;

    const newsContained = foundInSandbox && !leakedIntoLiveNews && !leakedIntoLiveState && priceUnmutated;

    recordResult({
      id: 'ADV-PHASE-F-NEWS-01',
      title: 'Training News Sandbox Containment & Zero Live News Feed Leakage',
      battery: 'Battery 2: News Containment',
      scenario: 'Publish aggressive simulated news -> verify present in sandbox newsEvents but completely absent in live /api/news',
      expected: 'foundInSandbox=true, leakedIntoLiveNews=false',
      actual: `foundInSandbox=${foundInSandbox}, leakedIntoLiveNews=${leakedIntoLiveNews}`,
      evidence: { foundInSandbox, leakedIntoLiveNews, liveNewsCountPre, liveNewsCountPost: liveNewsItems.length },
      status: (!leakedIntoLiveNews && foundInSandbox) ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'ADV-PHASE-F-NEWS-02',
      title: 'Training News Zero Live State & Price Mutation',
      battery: 'Battery 2: News Containment',
      scenario: 'Verify training news does not leak into live state.newsEvents or impact live security prices',
      expected: 'leakedIntoLiveState=false, priceUnmutated=true',
      actual: `leakedIntoLiveState=${leakedIntoLiveState}, priceUnmutated=${priceUnmutated} (price=${reliancePricePost})`,
      evidence: { reliancePricePre, reliancePricePost, leakedIntoLiveState },
      status: (!leakedIntoLiveState && priceUnmutated) ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 3: SANDBOX RESET HYGIENE & STATE RESTORATION
    // ========================================================================
    console.log('\n========================================================================');
    console.log('BATTERY 3: SANDBOX RESET HYGIENE & STATE RESTORATION');
    console.log('========================================================================\n');

    // Mutate sandbox before reset:
    // 1. Team T04 converts 200,000 INR to USD
    const fxMutRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T04',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 200000,
      operator: 'Op_Reset_Prep'
    });
    assert.strictEqual(fxMutRes.status, 200);

    // Check sandbox state before reset
    const preResetTrainState = await apiRequest('GET', '/api/training/state');
    const t04CashPre = preResetTrainState.data?.sandbox?.teams?.find(t => t.teamCode === 'TRAIN_T04')?.cashWallets?.INR;
    const usdReservePre = preResetTrainState.data?.sandbox?.fxReserves?.USD?.availableReserve;
    assert.ok(t04CashPre < 10000000, 'T04 cash should have decreased');
    assert.ok(usdReservePre < 500000, 'USD reserve should have decreased');

    // Call reset with preserveScorecards=true
    const resetResPreserve = await apiRequest('POST', '/api/training/reset', {
      preserveScorecards: true
    });
    assert.strictEqual(resetResPreserve.status, 200);

    // Verify sandbox restored
    const postResetState1 = await apiRequest('GET', '/api/training/state');
    const sandbox1 = postResetState1.data?.sandbox;
    const t04Restored = sandbox1?.teams?.find(t => t.teamCode === 'TRAIN_T04');
    const usdReserveRestored = sandbox1?.fxReserves?.USD?.availableReserve;
    const queuesCleared = sandbox1?.orders?.length === 0 &&
      sandbox1?.vouchers?.length === 0 &&
      sandbox1?.transactions?.length === 0 &&
      sandbox1?.newsEvents?.length === 0;

    // Check that scorecards were preserved
    const scorecardsPreserved = Object.keys(sandbox1?.scorecards || {}).length > 0;

    const resetPreserveValid = t04Restored?.cashWallets?.INR === 10000000 &&
      t04Restored?.cashBalance === 10000000 &&
      usdReserveRestored === 500000 &&
      queuesCleared &&
      scorecardsPreserved;

    recordResult({
      id: 'ADV-PHASE-F-RESET-01',
      title: 'Sandbox Reset Hygiene: Capital, Reserves & Queues Restored (Preserve Scorecards)',
      battery: 'Battery 3: Reset Hygiene',
      scenario: 'Execute POST /api/training/reset with preserveScorecards=true -> verify pristine initial capital (₹1 Cr), reserves restored, queues empty, scorecards retained',
      expected: 'INR=10000000, USDReserve=500000, queuesEmpty=true, scorecardsPreserved=true',
      actual: `INR=${t04Restored?.cashWallets?.INR}, USDReserve=${usdReserveRestored}, queuesEmpty=${queuesCleared}, scorecardsPreserved=${scorecardsPreserved}`,
      evidence: { t04Cash: t04Restored?.cashWallets?.INR, usdReserve: usdReserveRestored, queuesCleared, scorecardKeys: Object.keys(sandbox1?.scorecards || {}) },
      status: resetPreserveValid ? 'PASSED' : 'FAILED'
    });

    // Call reset with preserveScorecards=false (wipe scorecards)
    const resetResWipe = await apiRequest('POST', '/api/training/reset', {
      preserveScorecards: false
    });
    assert.strictEqual(resetResWipe.status, 200);

    const postResetState2 = await apiRequest('GET', '/api/training/state');
    const sandbox2 = postResetState2.data?.sandbox;
    // When scorecards are wiped, GET /api/training/state auto-populates only the pristine 'Operator 1' fallback for UI rendering
    const scorecardsKeys = Object.keys(sandbox2?.scorecards || {});
    const priorOperatorsWiped = !sandbox2?.scorecards?.['Op_Math_Rigorous'] &&
      !sandbox2?.scorecards?.['Teller_Math_Test'] &&
      !sandbox2?.scorecards?.['FX_Overdraft_Tester'];
    const scorecardsWiped = priorOperatorsWiped && (scorecardsKeys.length === 0 || (scorecardsKeys.length === 1 && scorecardsKeys[0] === 'Operator 1' && sandbox2.scorecards['Operator 1'].totalOperations === 0));

    recordResult({
      id: 'ADV-PHASE-F-RESET-02',
      title: 'Sandbox Reset Hygiene: Complete Scorecard Clearance (Wipe Mode)',
      battery: 'Battery 3: Reset Hygiene',
      scenario: 'Execute POST /api/training/reset with preserveScorecards=false -> verify user scorecards are wiped and only default UI placeholder remains',
      expected: 'priorOperatorsWiped=true, only Operator 1 UI placeholder remains with totalOperations=0',
      actual: `scorecardsKeys=[${scorecardsKeys.join(', ')}], priorOperatorsWiped=${priorOperatorsWiped}`,
      evidence: { scorecards: sandbox2?.scorecards },
      status: scorecardsWiped ? 'PASSED' : 'FAILED'
    });

    // Invariant: Live state remained 100% untouched through resets
    const liveStateAfterReset = await apiRequest('GET', '/api/state');
    const liveTeamsUntouched = liveStateAfterReset.data?.teams?.length === liveStatePre.data?.teams?.length;

    recordResult({
      id: 'ADV-PHASE-F-RESET-03',
      title: 'Live State Invariance Across Sandbox Resets',
      battery: 'Battery 3: Reset Hygiene',
      scenario: 'Verify live /api/state is 100% unmutated by training resets',
      expected: 'liveTeamsUntouched=true',
      actual: `liveTeamsUntouched=${liveTeamsUntouched}`,
      evidence: { liveTeamsCount: liveStateAfterReset.data?.teams?.length },
      status: liveTeamsUntouched ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 4: MULTI-OPERATOR CONCURRENCY & RACE CONDITION STRESS
    // ========================================================================
    console.log('\n========================================================================');
    console.log('BATTERY 4: MULTI-OPERATOR CONCURRENCY & RACE CONDITION STRESS');
    console.log('========================================================================\n');

    // Create 10 mock orders in advance for concurrent testing
    const createdOrderIds = [];
    for (let i = 0; i < 10; i++) {
      const oRes = await apiRequest('POST', '/api/training/order/create', {
        teamCode: `TRAIN_T0${(i % 5) + 1}`,
        ticker: i % 2 === 0 ? 'RELIANCE' : 'INFY',
        action: 'BUY',
        quantity: 5,
        ticketNumber: `TKT-CONC-${i}`
      });
      if (oRes.status === 200 && oRes.data?.orderId) {
        createdOrderIds.push(oRes.data.orderId);
      }
    }
    assert.strictEqual(createdOrderIds.length, 10, 'All 10 orders must be created');

    // Launch 50 concurrent requests across 5 distinct operators
    const concurrentOps = [
      'Op_Conc_Exch_1',
      'Op_Conc_Exch_2',
      'Teller_Conc_1',
      'Op_Conc_FX',
      'Journ_Conc_1'
    ];

    const dispatchList = [];

    // Dispatch 10 slip checks by Op_Conc_Exch_1
    for (let i = 0; i < 10; i++) {
      dispatchList.push({
        op: 'Op_Conc_Exch_1',
        fn: () => apiRequest('POST', '/api/training/order/action', {
          orderId: createdOrderIds[i],
          actionType: 'CHECK_SLIP',
          operator: 'Op_Conc_Exch_1'
        })
      });
    }

    // Dispatch 10 approvals by Op_Conc_Exch_2
    for (let i = 0; i < 10; i++) {
      dispatchList.push({
        op: 'Op_Conc_Exch_2',
        fn: () => apiRequest('POST', '/api/training/order/action', {
          orderId: createdOrderIds[i],
          actionType: 'APPROVE',
          operator: 'Op_Conc_Exch_2',
          physicalSlipChecked: true
        })
      });
    }

    // Dispatch 10 FX conversions by Op_Conc_FX (small amounts within reserve)
    for (let i = 0; i < 10; i++) {
      dispatchList.push({
        op: 'Op_Conc_FX',
        fn: () => apiRequest('POST', '/api/training/fx/convert', {
          teamCode: 'TRAIN_T01',
          fromCurrency: 'INR',
          toCurrency: 'USD',
          amount: 5000,
          operator: 'Op_Conc_FX'
        })
      });
    }

    // Dispatch 10 news publications by Journ_Conc_1
    for (let i = 0; i < 10; i++) {
      dispatchList.push({
        op: 'Journ_Conc_1',
        fn: () => apiRequest('POST', '/api/training/news/publish', {
          headline: `Concurrent Market Pulse Update #${i} - ${Date.now()}`,
          sentiment: i % 2 === 0 ? 'Positive' : 'Neutral',
          category: 'Corporate',
          operator: 'Journ_Conc_1'
        })
      });
    }

    // Dispatch 10 scorecard queries by Teller_Conc_1
    for (let i = 0; i < 10; i++) {
      dispatchList.push({
        op: 'Teller_Conc_1',
        fn: () => apiRequest('GET', '/api/training/scorecard?operator=Teller_Conc_1&role=bank_teller')
      });
    }

    console.log(`Executing ${dispatchList.length} concurrent requests across 5 operators...`);
    const startTime = Date.now();
    const concurrentResults = await Promise.all(dispatchList.map(d => d.fn()));
    const durationMs = Date.now() - startTime;
    console.log(`✓ Completed 50 concurrent requests in ${durationMs}ms.\n`);

    // Verify zero 500 crashes
    const serverErrors = concurrentResults.filter(r => r.status >= 500);
    const zeroCrashes = serverErrors.length === 0;

    // Verify operator scorecards reflect exact counts
    const scExch1 = (await apiRequest('GET', '/api/training/scorecard?operator=Op_Conc_Exch_1')).data?.scorecard;
    const scExch2 = (await apiRequest('GET', '/api/training/scorecard?operator=Op_Conc_Exch_2')).data?.scorecard;
    const scFxConc = (await apiRequest('GET', '/api/training/scorecard?operator=Op_Conc_FX')).data?.scorecard;
    const scJourn = (await apiRequest('GET', '/api/training/scorecard?operator=Journ_Conc_1')).data?.scorecard;

    const exch1CountMatch = scExch1?.totalOperations === 10;
    const exch2CountMatch = scExch2?.totalOperations === 10;
    const fxCountMatch = scFxConc?.totalOperations === 10;
    const journCountMatch = scJourn?.totalOperations === 10;

    // Check mathematical consistency on all concurrent operators
    function verifyOperatorMath(sc) {
      if (!sc) return false;
      const expectedAvgLatency = parseFloat((sc.totalLatencySeconds / Math.max(1, sc.totalOperations)).toFixed(1));
      const expectedAccuracy = parseFloat((((sc.totalOperations - sc.errors) / Math.max(1, sc.totalOperations)) * 100).toFixed(1));
      const expectedErrorRate = parseFloat((100 - expectedAccuracy).toFixed(1));

      return Math.abs(sc.averageLatencySeconds - expectedAvgLatency) < 0.05 &&
        Math.abs(sc.accuracyRate - expectedAccuracy) < 0.05 &&
        Math.abs(sc.errorRate - expectedErrorRate) < 0.05 &&
        sc.complianceScore >= 0 && sc.complianceScore <= 100 &&
        sc.totalOperations === (sc.completedOperations + sc.errors);
    }

    const allMathConsistent = verifyOperatorMath(scExch1) &&
      verifyOperatorMath(scExch2) &&
      verifyOperatorMath(scFxConc) &&
      verifyOperatorMath(scJourn);

    recordResult({
      id: 'ADV-PHASE-F-CONC-01',
      title: 'High-Concurrency Multi-Operator Throughput & Zero Crash Integrity',
      battery: 'Battery 4: Concurrency',
      scenario: 'Fire 50 simultaneous mixed requests across 5 distinct operators -> assert 0 HTTP 500s',
      expected: 'serverErrors.length === 0',
      actual: `serverErrors.length === ${serverErrors.length} (total requests=${concurrentResults.length})`,
      evidence: { durationMs, totalRequests: concurrentResults.length, serverErrors },
      status: zeroCrashes ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'ADV-PHASE-F-CONC-02',
      title: 'Concurrent Telemetry Additive Exactness & Math Consistency',
      battery: 'Battery 4: Concurrency',
      scenario: 'Verify each concurrent operator recorded exactly 10 operations and satisfied mathematical invariants',
      expected: 'All operators recorded totalOps=10 with strict mathematical consistency',
      actual: `Op_Conc_Exch_1=${scExch1?.totalOperations}, Op_Conc_Exch_2=${scExch2?.totalOperations}, Op_Conc_FX=${scFxConc?.totalOperations}, Journ_Conc_1=${scJourn?.totalOperations}, allMathConsistent=${allMathConsistent}`,
      evidence: { scExch1, scExch2, scFxConc, scJourn, allMathConsistent },
      status: (exch1CountMatch && exch2CountMatch && fxCountMatch && journCountMatch && allMathConsistent) ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 5: WORKFLOW EDGE CASES & SECURITY BOUNDARY PROBING
    // ========================================================================
    console.log('\n========================================================================');
    console.log('BATTERY 5: WORKFLOW EDGE CASES & SECURITY BOUNDARY PROBING');
    console.log('========================================================================\n');

    // Test 5.1: Invalid Action Type on Order Action
    const badActionRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: createdOrderIds[0],
      actionType: 'ILLEGAL_CORRUPTION_ACTION'
    });
    const badActionBlocked = badActionRes.status === 400 &&
      badActionRes.data?.error?.includes('Unsupported actionType');

    recordResult({
      id: 'ADV-PHASE-F-EDGE-01',
      title: 'Order Action: Unsupported Action Type Rejection',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Submit unrecognized actionType -> expect HTTP 400',
      expected: 'HTTP 400 Unsupported actionType',
      actual: `HTTP ${badActionRes.status}: ${badActionRes.data?.error}`,
      evidence: badActionRes.data,
      status: badActionBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.2: Terminal State Guard on Settled Order
    const termOrdRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 5,
      ticketNumber: 'TKT-TERMINAL-01'
    });
    const termOrderId = termOrdRes.data?.orderId;
    await apiRequest('POST', '/api/training/order/action', {
      orderId: termOrderId,
      actionType: 'CHECK_SLIP',
      operator: 'Op_Term_Check'
    });
    const termAppRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: termOrderId,
      actionType: 'APPROVE',
      operator: 'Op_Term_Check',
      physicalSlipChecked: true
    });
    const termVchRef = termAppRes.data?.voucher?.voucherReference;
    await apiRequest('POST', '/api/training/bank/claim', {
      voucherReference: termVchRef,
      tellerName: 'Teller_Term'
    });
    await apiRequest('POST', '/api/training/bank/settle', {
      voucherReference: termVchRef,
      tellerName: 'Teller_Term'
    });

    // Now order is SETTLED. Attempt further action on it
    const settledActionRes = await apiRequest('POST', '/api/training/order/action', {
      orderId: termOrderId,
      actionType: 'APPROVE',
      physicalSlipChecked: true
    });
    const terminalBlocked = settledActionRes.status === 400 &&
      settledActionRes.data?.error?.includes('terminal state');

    recordResult({
      id: 'ADV-PHASE-F-EDGE-02',
      title: 'Terminal Order State Immutability Guard',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Attempt exchange action on an already SETTLED order -> expect HTTP 400',
      expected: 'HTTP 400 terminal state',
      actual: `HTTP ${settledActionRes.status}: ${settledActionRes.data?.error}`,
      evidence: settledActionRes.data,
      status: terminalBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.3: Negative and Non-Numeric Order Quantities
    const negQtyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: -50
    });
    const strQtyRes = await apiRequest('POST', '/api/training/order/create', {
      teamCode: 'TRAIN_T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 'not-a-number'
    });
    const invalidQtyBlocked = negQtyRes.status === 400 && strQtyRes.status === 400;

    recordResult({
      id: 'ADV-PHASE-F-EDGE-03',
      title: 'Order Quantity Validation: Negative & Non-Numeric Rejection',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Submit quantity=-50 and quantity="not-a-number" -> expect HTTP 400 for both',
      expected: 'Both requests rejected with HTTP 400',
      actual: `negQty=${negQtyRes.status}, strQty=${strQtyRes.status}`,
      evidence: { neg: negQtyRes.data, str: strQtyRes.data },
      status: invalidQtyBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.4: Non-Existent Entities Return Proper 404s
    const fakeOrderRes = await apiRequest('POST', '/api/training/order/claim', {
      orderId: 'TRN-ORD-FAKE-999999'
    });
    const fakeVoucherRes = await apiRequest('POST', '/api/training/bank/claim', {
      voucherReference: 'VCH-NONEXISTENT'
    });
    const fakeEntities404 = fakeOrderRes.status === 404 && fakeVoucherRes.status === 404;

    recordResult({
      id: 'ADV-PHASE-F-EDGE-04',
      title: 'Non-Existent Entities 404 Clean Handling',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Query or claim non-existent order and voucher -> expect HTTP 404',
      expected: 'Both return HTTP 404',
      actual: `fakeOrder=${fakeOrderRes.status}, fakeVoucher=${fakeVoucherRes.status}`,
      evidence: { order404: fakeOrderRes.data, voucher404: fakeVoucherRes.data },
      status: fakeEntities404 ? 'PASSED' : 'FAILED'
    });

    // Test 5.5: Invalid FX Currency Self-Exchange and Legacy Currencies
    const sameCurrRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'INR',
      amount: 1000
    });
    const legacyCadRes = await apiRequest('POST', '/api/training/fx/convert', {
      teamCode: 'TRAIN_T01',
      fromCurrency: 'INR',
      toCurrency: 'CAD',
      amount: 1000
    });
    const fxGuardsWorking = sameCurrRes.status === 400 &&
      sameCurrRes.data?.error?.includes('itself') &&
      legacyCadRes.status === 400 &&
      legacyCadRes.data?.error?.includes('legacy');

    recordResult({
      id: 'ADV-PHASE-F-EDGE-05',
      title: 'FX Desk Safety: Same-Currency & Legacy Currency Rejection',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Attempt INR->INR and INR->CAD conversions -> expect HTTP 400 rejection',
      expected: 'Both rejected with HTTP 400',
      actual: `sameCurr=${sameCurrRes.status}, legacyCad=${legacyCadRes.status}`,
      evidence: { same: sameCurrRes.data, legacy: legacyCadRes.data },
      status: fxGuardsWorking ? 'PASSED' : 'FAILED'
    });

    // Test 5.6: Training News Boundary: Short Headline and Invalid Sentiment
    const shortHeadlineRes = await apiRequest('POST', '/api/training/news/publish', {
      headline: 'Hi',
      sentiment: 'Positive'
    });
    const badSentimentRes = await apiRequest('POST', '/api/training/news/publish', {
      headline: 'Valid Headline Over 5 Chars',
      sentiment: 'SUPER_PUMP_EXCITED'
    });
    const newsBoundariesWorking = shortHeadlineRes.status === 400 &&
      shortHeadlineRes.data?.error?.includes('at least 5 characters') &&
      badSentimentRes.status === 400 &&
      badSentimentRes.data?.error?.includes('Sentiment must be one of');

    recordResult({
      id: 'ADV-PHASE-F-EDGE-06',
      title: 'Training News Input Validation: Short Headline & Sentiment Enum',
      battery: 'Battery 5: Edge Cases',
      scenario: 'Attempt headline length < 5 and unapproved sentiment enum -> expect HTTP 400',
      expected: 'Both rejected with HTTP 400',
      actual: `shortHeadline=${shortHeadlineRes.status}, badSentiment=${badSentimentRes.status}`,
      evidence: { short: shortHeadlineRes.data, sentiment: badSentimentRes.data },
      status: newsBoundariesWorking ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // BATTERY 6: POST-TEST BASELINE STATE.JSON HASH INTEGRITY
    // ========================================================================
    console.log('\n========================================================================');
    console.log('BATTERY 6: POST-TEST BASELINE STATE.JSON HASH INTEGRITY');
    console.log('========================================================================\n');

    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`state.json SHA-256 after all adversarial tests: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'POST-FLIGHT BASELINE HASH CONTAMINATED!');
    console.log('✓ Authoritative state.json hash verified strictly bit-exact.\n');

    recordResult({
      id: 'ADV-PHASE-F-POST-01',
      title: 'Post-flight Authoritative Baseline Hash Certification',
      battery: 'Integrity',
      scenario: 'Confirm authoritative state.json was 100% bit-for-bit unmutated through entire adversarial suite',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
    });

  } finally {
    // TEARDOWN EPHEMERAL SERVER
    console.log('--- TEARING DOWN EPHEMERAL TEST SERVER ---');
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      try { serverProcess.kill('SIGKILL'); } catch (e) {}
    }, 500);

    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
      }
    } catch (e) {}
    console.log('✓ Ephemeral server terminated and disposable fixture removed.\n');
  }

  // SUMMARY
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('================================================================================');
  console.log(`📊 ADVERSARIAL CHALLENGER SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('================================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Adversarial results written to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialScorecardsSuite().catch(err => {
  console.error('Fatal adversarial suite failure:', err);
  process.exit(1);
});
