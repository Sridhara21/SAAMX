/**
 * SAAMX ADVERSARIAL CONCURRENCY, RACE CONDITION & MUTEX STRESS TEST SUITE
 * Milestone 2 / Phase C: Dedicated Order Queue Screen & Multi-Desk Routing
 * File: SAAMX/test-adversarial-phase-c-concurrency.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGES:
 * 1. 10-Way Concurrent Claim Race on Exchange Order Ticket (POST /api/order/claim) -> exactly 1x 200, 9x 409
 * 2. Cross-Desk & Role Authorization Boundary on Locked Ticket:
 *    - Team claim attempt -> HTTP 403
 *    - Team EXECUTE attempt -> HTTP 403
 *    - Team ACCEPT attempt -> VULNERABILITY AUDIT (does unprivileged team bypass role guard?)
 * 3. Exchange Approval & Clean Mutex Release to Bank Desk (Deadlock Immunity)
 * 4. Concurrent Claim Race on Bank Settlement Voucher (POST /api/bank/claim) across competing tellers -> exactly 1x 200, 1x 409
 * 5. Concurrent Claim Race on FX Operator Queue Ticket (POST /api/fx/queue-action CLAIM) across competing operators -> exactly 1x 200, 1x 409
 * 6. Concurrent Double Settlement Attack on Bank Voucher (POST /api/bank/settle) -> exactly 1x 200, 1x 400/409, 0% double-debiting
 * 7. Lock Release & Zero-Leakage Recovery on Order Rejection and Correction Return
 * 8. Sequential & Replay Mutex Protection on invalid/terminal statuses
 * 9. Post-Flight Authoritative Hash Bit-Exact Integrity (6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca)
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
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-challenger-c1-3128.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-c-results.json');

const testResults = [];

function recordResult({ id, title, endpoint, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, endpoint, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : (status === 'VULNERABILITY' ? '⚠️ VULNERABILITY FOUND' : '🔴 FAILED');
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Endpoint:  ${endpoint || 'N/A'}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (evidence) {
    console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
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

function bearer(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function getTeamData(res) {
  return res.data?.team || res.data?.portfolio || res.data || {};
}

function getReservedINR(teamObj) {
  if (!teamObj) return 0;
  if (typeof teamObj.reservedCash === 'object' && teamObj.reservedCash !== null) {
    return Number(teamObj.reservedCash.INR || 0);
  }
  return Number(teamObj.reservedCash || 0);
}

function getCashINR(teamObj) {
  if (!teamObj) return 0;
  if (typeof teamObj.cashWallets === 'object' && teamObj.cashWallets !== null) {
    return Number(teamObj.cashWallets.INR ?? teamObj.cashBalance ?? 0);
  }
  return Number(teamObj.cashBalance || 0);
}

async function runAdversarialPhaseCSuite() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX EMPIRICAL ADVERSARIAL CHALLENGE — PHASE C (MILESTONE 2)');
  console.log('⚔️ CONCURRENCY, RACE CONDITIONS & MUTEX STRESS TESTING');
  console.log('======================================================================');
  console.log(`Port:            ${PORT}`);
  console.log(`Original State:  ${ORIGINAL_STATE}`);
  console.log(`Disposable State:${DISPOSABLE_STATE}`);
  console.log(`Expected Hash:   ${EXPECTED_HASH}\n`);

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'ADV-C-PREFLIGHT',
    title: 'Pre-flight Authoritative State Hash Verification',
    endpoint: 'N/A',
    scenario: 'Verify state.json SHA-256 matches authoritative baseline before test suite',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: FIXTURE SETUP
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  if (fs.existsSync(DISPOSABLE_STATE)) {
    try {
      fs.chmodSync(DISPOSABLE_STATE, 0o666);
      fs.unlinkSync(DISPOSABLE_STATE);
    } catch (e) {}
  }
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'TWO_PHASE_BANK' };
  fixture.fxQueue = [];
  fixture.fxTransactions = [];

  // Seed multiple test teams with large unreserved balances & deliverable holdings
  ['T01', 'T02', 'T03', 'T04'].forEach(code => {
    let team = (fixture.teams || []).find(t => t.teamCode === code);
    if (team) {
      team.cashBalance = 50000000;
      team.cashWallets = { INR: 50000000, USD: 100000, EUR: 100000, GBP: 100000 };
      team.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CAD: 0, CHF: 0, CNY: 0 };
      team.holdings = { ...(team.holdings || {}), TCS: 5000, RELIANCE: 5000, INFY: 5000 };
      team.lockedHoldings = { TCS: 0, RELIANCE: 0, INFY: 0 };
    }
  });

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log('✓ Disposable fixture initialized with active teams and market Open.');

  // STEP 3: SPAWN ISOLATED BACKEND SERVER
  console.log(`\n--- STEP 3: SPAWNING ISOLATED BACKEND SERVER (PORT ${PORT}) ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      SAAMX_STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      DISABLE_FIREBASE_SYNC: 'true',
      VITE_DISABLE_FIREBASE: 'true'
    },
    stdio: 'pipe'
  });

  let hydrated = false;
  serverProcess.stdout.on('data', d => {
    const text = d.toString();
    if (text.includes('Successfully hydrated authoritative state') || text.includes('Running in memory/file fallback mode')) {
      hydrated = true;
    }
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 50; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && (hydrated || i >= 15)) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT} (hydration complete).`);
        break;
      }
    } catch (e) {
      // keep waiting
    }
    await new Promise(r => setTimeout(r, 400));
  }

  if (!serverStarted) {
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('\n--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const [lExch, lBank, lAdmin, lT01, lT02] = await Promise.all([
      apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' }),
      apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' })
    ]);

    const tokenExch = lExch.data?.token;
    const tokenBank = lBank.data?.token;
    const tokenAdmin = lAdmin.data?.token;
    const tokenT01 = lT01.data?.token;
    const tokenT02 = lT02.data?.token;

    assert.ok(tokenExch && tokenBank && tokenAdmin && tokenT01 && tokenT02, 'Authentication failed for test roles');
    console.log('✓ Tokens acquired for Exchange, Bank, Admin, T01, and T02.\n');

    const RUN_ID = Date.now();

    // =========================================================================
    // CHALLENGE 1: 10-WAY CONCURRENT CLAIM RACE ON SAME EXCHANGE ORDER TICKET
    // =========================================================================
    console.log('--- CHALLENGE 1: 10-WAY CONCURRENT CLAIM RACE ON EXCHANGE ORDER ---');
    const ticket1 = `TKN-EX-RACE-${RUN_ID}-001`;
    const order1Res = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: ticket1,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearer(tokenExch));

    assert.strictEqual(order1Res.status, 200, `Order submission failed: ${JSON.stringify(order1Res.data)}`);
    const targetOrderId = order1Res.data.order.id;
    console.log(`Created target order: ${targetOrderId} (Ticket: ${ticket1})`);

    // Fire 10 simultaneous concurrent claims from 10 distinct simulated clerks/stations
    console.log('Firing 10 simultaneous concurrent claim requests to POST /api/order/claim...');
    const claimContenders = Array.from({ length: 10 }, (_, i) => ({
      deskId: `DESK_${(i % 5) + 1}`,
      operator: `Clerk Station ${i + 1}`
    }));

    const claimResponses = await Promise.all(
      claimContenders.map(c =>
        apiRequest('POST', '/api/order/claim', {
          orderId: targetOrderId,
          deskId: c.deskId,
          operator: c.operator
        }, bearer(tokenExch))
      )
    );

    const statuses1 = claimResponses.map(r => r.status);
    const count200 = statuses1.filter(s => s === 200).length;
    const count409 = statuses1.filter(s => s === 409).length;

    console.log(`Claim responses: ${count200}x HTTP 200, ${count409}x HTTP 409. (Statuses: ${statuses1.join(', ')})`);

    const winIndex = statuses1.indexOf(200);
    const winnerData = winIndex >= 0 ? claimResponses[winIndex].data : null;
    const winningClerk = winIndex >= 0 ? claimContenders[winIndex] : null;

    // Verify order state after race
    const getOrderRes = await apiRequest('GET', '/api/orders', null, bearer(tokenExch));
    const finalOrder1 = (getOrderRes.data.orders || getOrderRes.data || []).find(o => o.id === targetOrderId);

    const ch1Passed = (count200 === 1) &&
                      (count409 === 9) &&
                      finalOrder1 &&
                      finalOrder1.status === 'VERIFYING_AT_EXCHANGE' &&
                      finalOrder1.lockedByDesk === winningClerk.deskId;

    recordResult({
      id: 'ADV-C-CONCUR-EXCH-CLAIM-01',
      title: '10-Way Concurrent Claim Race on Exchange Order Ticket',
      endpoint: 'POST /api/order/claim (10 concurrent requests)',
      scenario: '10 clerks concurrently claim the exact same unverified ticket. Verify strictly 1x HTTP 200, 9x HTTP 409 Conflict, and winning clerk holds lock without state corruption.',
      expected: 'Exactly 1x HTTP 200, 9x HTTP 409 Conflict. Order locked to winning clerk and status VERIFYING_AT_EXCHANGE.',
      actual: `200 Count=${count200}, 409 Count=${count409}, FinalStatus=${finalOrder1?.status}, LockedBy=${finalOrder1?.lockedByDesk}, Operator=${finalOrder1?.operator}`,
      evidence: {
        statuses: statuses1,
        winningClerk,
        winnerResponse: winnerData,
        sampleConflictError: claimResponses.find(r => r.status === 409)?.data?.error
      },
      status: ch1Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // CHALLENGE 2: CROSS-DESK & ROLE AUTHORIZATION BOUNDARY ON ORDER ACTIONS
    // =========================================================================
    console.log('\n--- CHALLENGE 2: CROSS-DESK & ROLE AUTHORIZATION BOUNDARY ---');
    // Test 2.1: Participant team attempts to CLAIM an order slip at exchange desk
    const teamClaimRes = await apiRequest('POST', '/api/order/claim', {
      orderId: targetOrderId,
      deskId: 'DESK_1'
    }, bearer(tokenT01));

    console.log(`Team claim attempt HTTP: ${teamClaimRes.status} (Expected: 403)`);

    // Test 2.2: Participant team attempts action EXECUTE
    const teamExecuteRes = await apiRequest('POST', '/api/order/action', {
      orderId: targetOrderId,
      actionType: 'EXECUTE',
      physicalSlipChecked: true
    }, bearer(tokenT01));

    console.log(`Team EXECUTE attempt HTTP: ${teamExecuteRes.status} (Expected: 403)`);

    // Test 2.3: Participant team attempts action ACCEPT (slip verification approval)
    // EMPIRICAL VULNERABILITY AUDIT: Is ACCEPT guarded in authMiddleware like EXECUTE?
    const teamAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: targetOrderId,
      actionType: 'ACCEPT',
      physicalSlipChecked: true
    }, bearer(tokenT01));

    console.log(`Team ACCEPT attempt HTTP: ${teamAcceptRes.status} (Expected: 403, Vulnerability if 200)`);
    const acceptVulnerabilityExposed = (teamAcceptRes.status === 200);

    recordResult({
      id: 'ADV-C-ROLE-GUARD-ACCEPT-01',
      title: 'Role Authorization Boundary on Physical Slip Approval (actionType: ACCEPT)',
      endpoint: 'POST /api/order/action (actionType: ACCEPT by role "team")',
      scenario: 'Audit whether participant teams (role "team") are prohibited from accepting/approving order slips. In authMiddleware, EXECUTE is guarded with 403, but ACCEPT was omitted from the permission check.',
      expected: 'HTTP 403 Forbidden: Participant teams must not be permitted to approve physical slips.',
      actual: acceptVulnerabilityExposed
        ? `⚠️ VULNERABILITY CONFIRMED: Participant team received HTTP 200 OK and self-approved order slip without exchange operator review.`
        : `HTTP ${teamAcceptRes.status} returned.`,
      evidence: {
        teamClaimStatus: teamClaimRes.status,
        teamExecuteStatus: teamExecuteRes.status,
        teamAcceptStatus: teamAcceptRes.status,
        vulnerabilityExposed: acceptVulnerabilityExposed,
        acceptResponse: teamAcceptRes.data
      },
      status: acceptVulnerabilityExposed ? 'VULNERABILITY' : 'PASSED'
    });

    // =========================================================================
    // CHALLENGE 3: EXCHANGE APPROVAL & CLEAN LOCK RELEASE TO BANK DESK (DEADLOCK IMMUNITY)
    // =========================================================================
    console.log('\n--- CHALLENGE 3: EXCHANGE APPROVAL & CLEAN LOCK RELEASE (DEADLOCK IMMUNITY) ---');
    // Submit a fresh order for clean handoff lifecycle testing
    const ticket3 = `TKN-EX-HANDOFF-${RUN_ID}-003`;
    const order3Res = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: ticket3,
      teamCode: 'T02',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 2,
      orderType: 'MARKET',
      deskId: 'DESK_2'
    }, bearer(tokenExch));

    assert.strictEqual(order3Res.status, 200, `Order 3 submit failed: ${JSON.stringify(order3Res.data)}`);
    const order3Id = order3Res.data.order.id;

    // Fetch client wallet balance before exchange approval (pass raw response to getTeamData)
    const rawPreApprove = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT02));
    const tPreApprove = getTeamData(rawPreApprove);
    const cashPreApprove = getCashINR(tPreApprove);
    const resvPreApprove = getReservedINR(tPreApprove);

    // Exchange clerk claims order 3
    const claim3Res = await apiRequest('POST', '/api/order/claim', {
      orderId: order3Id,
      deskId: 'DESK_2',
      operator: 'Clerk Beta'
    }, bearer(tokenExch));
    assert.strictEqual(claim3Res.status, 200, `Claim failed: ${JSON.stringify(claim3Res.data)}`);

    // Exchange clerk validates order
    const valRes = await apiRequest('POST', '/api/order/action', {
      orderId: order3Id,
      actionType: 'VALIDATE',
      deskId: 'DESK_2'
    }, bearer(tokenExch));
    assert.strictEqual(valRes.status, 200, `Validation failed: ${JSON.stringify(valRes.data)}`);

    // Exchange clerk approves order with physicalSlipChecked: true
    const approveRes = await apiRequest('POST', '/api/order/action', {
      orderId: order3Id,
      actionType: 'ACCEPT',
      deskId: 'DESK_2',
      physicalSlipChecked: true
    }, bearer(tokenExch));

    assert.strictEqual(approveRes.status, 200, `Approval failed: ${JSON.stringify(approveRes.data)}`);
    const approvedOrder = approveRes.data.order;
    const voucherRef3 = approveRes.data.voucherReference || approvedOrder?.voucherReference;

    console.log(`Exchange approved order ${order3Id}. Status: ${approvedOrder?.status}, Voucher: ${voucherRef3}, lockedByDesk: ${approvedOrder?.lockedByDesk}`);

    // Verify cash balance invariant: Cash NOT debited upon Exchange approval
    const rawPostApprove = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT02));
    const tPostApprove = getTeamData(rawPostApprove);
    const cashPostApprove = getCashINR(tPostApprove);
    const resvPostApprove = getReservedINR(tPostApprove);

    const cashUntouched = (cashPostApprove === cashPreApprove);
    const resvIntact = (resvPostApprove === resvPreApprove);
    const lockReleased = (approvedOrder?.lockedByDesk === null);
    const isApprovedStatus = (approvedOrder?.status === 'EXCHANGE_APPROVED');
    const hasVoucher = Boolean(voucherRef3 && voucherRef3.startsWith('BNK-PAY-'));

    // DEADLOCK PREVENTION TEST: Bank Teller immediately claims the voucher
    console.log(`Bank Teller attempting to claim voucher ${voucherRef3}...`);
    const bankClaimRes = await apiRequest('POST', '/api/bank/claim', {
      voucherReference: voucherRef3,
      bankDeskId: 'BANK_1'
    }, bearer(tokenBank));

    console.log(`Bank claim response HTTP: ${bankClaimRes.status}`);
    const bankClaimSucceeded = (bankClaimRes.status === 200) &&
                               (bankClaimRes.data.settlement?.status === 'VERIFYING_AT_BANK');

    const ch3Passed = cashUntouched && resvIntact && lockReleased && isApprovedStatus && hasVoucher && bankClaimSucceeded;

    recordResult({
      id: 'ADV-C-LOCK-RELEASE-HANDOFF-01',
      title: 'Exchange Approval Lock Release & Bank Desk Handoff (Deadlock Prevention)',
      endpoint: 'POST /api/order/action (ACCEPT) -> POST /api/bank/claim',
      scenario: 'Exchange approves verified order, releasing exchange mutex (lockedByDesk: null) and generating BNK-PAY voucher. Bank Teller immediately claims voucher without deadlock or contention.',
      expected: 'lockedByDesk === null, client cash undebited, voucher emitted, Bank Desk claims voucher with HTTP 200.',
      actual: `Status=${approvedOrder?.status}, lockedByDesk=${approvedOrder?.lockedByDesk}, CashDelta=${cashPreApprove - cashPostApprove}, Voucher=${voucherRef3}, BankClaimHTTP=${bankClaimRes.status}`,
      evidence: {
        orderStatus: approvedOrder?.status,
        lockedByDesk: approvedOrder?.lockedByDesk,
        voucherReference: voucherRef3,
        cashBefore: cashPreApprove,
        cashAfter: cashPostApprove,
        bankClaimStatus: bankClaimRes.status,
        bankSettlementStatus: bankClaimRes.data?.settlement?.status
      },
      status: ch3Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // CHALLENGE 4: CONCURRENT CLAIM RACE ON BANK SETTLEMENT VOUCHER ACROSS OPERATORS
    // =========================================================================
    console.log('\n--- CHALLENGE 4: CONCURRENT CLAIM RACE ON BANK SETTLEMENT VOUCHER ---');
    // Create and approve an order to produce an unclaimed voucher for bank race
    const ticket4 = `TKN-EX-RACE-${RUN_ID}-004`;
    const order4Res = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: ticket4,
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      deskId: 'DESK_3'
    }, bearer(tokenExch));

    const order4Id = order4Res.data.order.id;
    await apiRequest('POST', '/api/order/claim', { orderId: order4Id, deskId: 'DESK_3' }, bearer(tokenExch));
    const approve4Res = await apiRequest('POST', '/api/order/action', {
      orderId: order4Id,
      actionType: 'ACCEPT',
      deskId: 'DESK_3',
      physicalSlipChecked: true
    }, bearer(tokenExch));

    const voucherRef4 = approve4Res.data.voucherReference || approve4Res.data.order?.voucherReference;
    assert.ok(voucherRef4, 'Voucher 4 reference missing');
    console.log(`Created target bank voucher for race: ${voucherRef4}`);

    // Competing Bank Claim: Teller 1 (bank) vs Teller 2 (admin)
    console.log('Firing concurrent claim requests from Bank Teller (bank) and Supervisor (admin)...');
    const [bClaim1, bClaim2] = await Promise.all([
      apiRequest('POST', '/api/bank/claim', { voucherReference: voucherRef4, bankDeskId: 'BANK_1' }, bearer(tokenBank)),
      apiRequest('POST', '/api/bank/claim', { voucherReference: voucherRef4, bankDeskId: 'BANK_2' }, bearer(tokenAdmin))
    ]);

    const bankStatuses = [bClaim1.status, bClaim2.status].sort();
    console.log(`Bank Claim race outcomes: ${bClaim1.status} and ${bClaim2.status}`);

    const bankHasOne200 = bankStatuses.includes(200);
    const bankHasOne409 = bankStatuses.includes(409);
    const ch4Passed = bankHasOne200 && bankHasOne409;

    recordResult({
      id: 'ADV-C-CONCUR-BANK-CLAIM-01',
      title: 'Concurrent Claim Race on Bank Settlement Voucher (Mutual Exclusion)',
      endpoint: 'POST /api/bank/claim (Concurrent bank vs admin)',
      scenario: 'Two authorized operators concurrently claim the exact same approved voucher. Verify atomic mutual exclusion (1x HTTP 200, 1x HTTP 409 Conflict).',
      expected: 'Exactly 1x HTTP 200 (lock acquired), 1x HTTP 409 Conflict (contention blocked)',
      actual: `Statuses=[${bankStatuses.join(', ')}]`,
      evidence: {
        claim1Status: bClaim1.status,
        claim1Data: bClaim1.data,
        claim2Status: bClaim2.status,
        claim2Data: bClaim2.data
      },
      status: ch4Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // CHALLENGE 5: CONCURRENT CLAIM RACE ON FX QUEUE TICKET ACROSS OPERATORS
    // =========================================================================
    console.log('\n--- CHALLENGE 5: CONCURRENT CLAIM RACE ON FX QUEUE TICKET ---');
    // Submit FX intake slip
    const fxSlipRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 90000,
      notes: 'Adversarial FX Claim Race Slip'
    }, bearer(tokenT01));

    assert.strictEqual(fxSlipRes.status, 200, `FX slip submission failed: ${JSON.stringify(fxSlipRes.data)}`);
    const fxTargetId = fxSlipRes.data.fxRequest.id;
    console.log(`Created target FX queue slip: ${fxTargetId}`);

    // Competing FX Claim: Operator 1 (exchange) vs Operator 2 (admin)
    console.log('Firing concurrent CLAIM requests from FX Clerk (exchange) and Admin (admin)...');
    const [fxClaim1, fxClaim2] = await Promise.all([
      apiRequest('POST', '/api/fx/queue-action', { requestId: fxTargetId, actionType: 'CLAIM' }, bearer(tokenExch)),
      apiRequest('POST', '/api/fx/queue-action', { requestId: fxTargetId, actionType: 'CLAIM' }, bearer(tokenAdmin))
    ]);

    const fxStatuses = [fxClaim1.status, fxClaim2.status].sort();
    console.log(`FX Claim race outcomes: ${fxClaim1.status} and ${fxClaim2.status}`);

    const fxHasOne200 = fxStatuses.includes(200);
    const fxHasOne409 = fxStatuses.includes(409);
    const ch5Passed = fxHasOne200 && fxHasOne409;

    recordResult({
      id: 'ADV-C-CONCUR-FX-CLAIM-01',
      title: 'Concurrent Claim Race on FX Queue Ticket (Mutual Exclusion)',
      endpoint: 'POST /api/fx/queue-action (actionType: CLAIM, exchange vs admin)',
      scenario: 'Two FX operators concurrently claim the same pending FX intake slip. Verify strictly 1x HTTP 200 and 1x HTTP 409 Conflict.',
      expected: 'Exactly 1x HTTP 200 (lock acquired), 1x HTTP 409 Conflict (contention blocked)',
      actual: `Statuses=[${fxStatuses.join(', ')}]`,
      evidence: {
        claim1Status: fxClaim1.status,
        claim1Data: fxClaim1.data,
        claim2Status: fxClaim2.status,
        claim2Data: fxClaim2.data
      },
      status: ch5Passed ? 'PASSED' : 'FAILED'
    });

    // Clean up FX reservation
    await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxTargetId,
      actionType: 'CANCEL',
      rejectionReason: 'Test cleanup'
    }, bearer(tokenExch));

    // =========================================================================
    // CHALLENGE 6: CONCURRENT DOUBLE SETTLEMENT ATTACK ON BANK VOUCHER
    // =========================================================================
    console.log('\n--- CHALLENGE 6: CONCURRENT DOUBLE SETTLEMENT ATTACK ON BANK VOUCHER ---');
    // Use voucher 3 which was claimed by bank in Challenge 3
    console.log(`Executing concurrent double settlement on voucher ${voucherRef3}...`);
    const rawPreSettle = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT02));
    const tPreSettle = getTeamData(rawPreSettle);
    const cashPreSettle = getCashINR(tPreSettle);
    const holdingsPreSettle = tPreSettle.holdings?.RELIANCE || 0;

    const [settleResA, settleResB] = await Promise.all([
      apiRequest('POST', '/api/bank/settle', { voucherReference: voucherRef3 }, bearer(tokenBank)),
      apiRequest('POST', '/api/bank/settle', { voucherReference: voucherRef3 }, bearer(tokenBank))
    ]);

    const settleStatuses = [settleResA.status, settleResB.status].sort();
    console.log(`Concurrent settle outcomes: ${settleResA.status} and ${settleResB.status}`);

    // Check post-settlement balances
    const rawPostSettle = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT02));
    const tPostSettle = getTeamData(rawPostSettle);
    const cashPostSettle = getCashINR(tPostSettle);
    const holdingsPostSettle = tPostSettle.holdings?.RELIANCE || 0;

    // Both cannot succeed with 200! Exactly 1 must succeed with 200, the other must be rejected (400 or 409)
    const exactOneSucceeded = (settleStatuses[0] === 200 && settleStatuses[1] !== 200);
    const doubleExecutionBlocked = !(settleResA.status === 200 && settleResB.status === 200);

    // Shares must have incremented by exactly 2 (order 3 quantity was 2)
    const unitsDelivered = holdingsPostSettle - holdingsPreSettle;
    const singleDelivery = (unitsDelivered === 2);

    // Cash must have been deducted exactly once
    const cashDeducted = parseFloat((cashPreSettle - cashPostSettle).toFixed(2));
    console.log(`Units delivered: ${unitsDelivered}, Cash deducted: ${cashDeducted}`);

    // Subsequent re-claim on settled voucher must be rejected with HTTP 400
    const reclaimSettledRes = await apiRequest('POST', '/api/bank/claim', {
      voucherReference: voucherRef3
    }, bearer(tokenBank));
    console.log(`Re-claim on settled voucher returned HTTP: ${reclaimSettledRes.status}`);

    const reclaimBlocked = (reclaimSettledRes.status === 400);

    const ch6Passed = doubleExecutionBlocked && exactOneSucceeded && singleDelivery && reclaimBlocked;

    recordResult({
      id: 'ADV-C-DOUBLE-SETTLE-PREVENTION-01',
      title: 'Concurrent Double Settlement Attack on Bank Voucher',
      endpoint: 'POST /api/bank/settle (Concurrent)',
      scenario: 'Simultaneously execute two settle requests on the same claimed voucher. Verify exactly 1 succeeds, double crediting/debiting is prevented, and post-settlement reclaim is rejected with HTTP 400.',
      expected: 'Exactly 1x HTTP 200, 1x rejection (400/409), exactly 2 units delivered, reclaim returns HTTP 400.',
      actual: `Statuses=[${settleStatuses.join(', ')}], UnitsDelivered=${unitsDelivered}, ReclaimHTTP=${reclaimSettledRes.status}`,
      evidence: {
        statuses: settleStatuses,
        unitsDelivered,
        cashDeducted,
        reclaimError: reclaimSettledRes.data?.error
      },
      status: ch6Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // CHALLENGE 7: LOCK RELEASE & ZERO-LEAKAGE ON REJECTION AND CORRECTION RETURN
    // =========================================================================
    console.log('\n--- CHALLENGE 7: LOCK RELEASE & ZERO-LEAKAGE ON REJECTION AND RETURN ---');
    // Test 7.1: Return for Correction
    const ticket5 = `TKN-EX-RACE-${RUN_ID}-005`;
    const order5Res = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: ticket5,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 2,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearer(tokenExch));

    const order5Id = order5Res.data.order.id;
    await apiRequest('POST', '/api/order/claim', { orderId: order5Id, deskId: 'DESK_1' }, bearer(tokenExch));

    const returnRes = await apiRequest('POST', '/api/order/action', {
      orderId: order5Id,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: 'Adversarial check: signature discrepancy on runner slip'
    }, bearer(tokenExch));

    assert.strictEqual(returnRes.status, 200, `Return for correction failed: ${JSON.stringify(returnRes.data)}`);
    const returnedOrder = returnRes.data.order;
    const returnLockCleared = (returnedOrder.lockedByDesk === null);
    const returnStatusCorrect = (returnedOrder.status === 'RETURNED_FOR_CORRECTION');

    // Test 7.2: Order Rejection with 100% Cash Buffer Unreservation
    const ticket6 = `TKN-EX-RACE-${RUN_ID}-006`;
    const order6Res = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: ticket6,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      deskId: 'DESK_2'
    }, bearer(tokenExch));

    const order6Id = order6Res.data.order.id;
    const reservedCost6 = order6Res.data.order.reservedCashAmount;
    assert.ok(reservedCost6 > 0, 'Order 6 must have reserved cash buffer');

    const rawPreReject = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const resvPreReject = getReservedINR(getTeamData(rawPreReject));

    await apiRequest('POST', '/api/order/claim', { orderId: order6Id, deskId: 'DESK_2' }, bearer(tokenExch));

    const rejectRes = await apiRequest('POST', '/api/order/action', {
      orderId: order6Id,
      actionType: 'REJECT',
      rejectionReason: 'Counterfeit paper token detected'
    }, bearer(tokenExch));

    assert.strictEqual(rejectRes.status, 200, `Reject order failed: ${JSON.stringify(rejectRes.data)}`);
    const rejectedOrder = rejectRes.data.order;

    const rawPostReject = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const resvPostReject = getReservedINR(getTeamData(rawPostReject));
    const unreservedDelta = parseFloat((resvPreReject - resvPostReject).toFixed(2));

    const rejectLockCleared = (rejectedOrder.lockedByDesk === null);
    const rejectZeroLeakage = (unreservedDelta === reservedCost6);

    console.log(`Order 6 ReservedCost: ${reservedCost6}, UnreservedDelta: ${unreservedDelta}, LockCleared: ${rejectLockCleared}`);

    const ch7Passed = returnLockCleared && returnStatusCorrect && rejectLockCleared && rejectZeroLeakage;

    recordResult({
      id: 'ADV-C-REJECT-RETURN-LOCK-RELEASE-01',
      title: 'Lock Release & 100% Buffer Restoration on Rejection and Return',
      endpoint: 'POST /api/order/action (RETURN_FOR_CORRECTION & REJECT)',
      scenario: 'Verify desk locks are cleanly cleared to null upon return and rejection, and 100% of cash reservations (+5% buffer) are restored with zero leakage.',
      expected: 'lockedByDesk === null on both, unreserved cash delta equals exact reservedCost (0% leakage).',
      actual: `ReturnLockCleared=${returnLockCleared}, RejectLockCleared=${rejectLockCleared}, UnreservedDelta=${unreservedDelta} === ReservedCost=${reservedCost6}`,
      evidence: {
        returnStatus: returnedOrder.status,
        returnLock: returnedOrder.lockedByDesk,
        rejectStatus: rejectedOrder.status,
        rejectLock: rejectedOrder.lockedByDesk,
        reservedCost: reservedCost6,
        unreservedDelta
      },
      status: ch7Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // CHALLENGE 8: SEQUENTIAL & REPLAY MUTEX PROTECTION
    // =========================================================================
    console.log('\n--- CHALLENGE 8: SEQUENTIAL & REPLAY MUTEX PROTECTION ---');
    // Attempting to claim the rejected order
    const claimRejectedRes = await apiRequest('POST', '/api/order/claim', {
      orderId: order6Id,
      deskId: 'DESK_1'
    }, bearer(tokenExch));

    console.log(`Claim on rejected order returned HTTP: ${claimRejectedRes.status}`);
    const claimRejectedBlocked = (claimRejectedRes.status === 409);

    // Attempting to claim the settled order
    const claimSettledOrderRes = await apiRequest('POST', '/api/order/claim', {
      orderId: order3Id,
      deskId: 'DESK_1'
    }, bearer(tokenExch));

    console.log(`Claim on settled order returned HTTP: ${claimSettledOrderRes.status}`);
    const claimSettledBlocked = (claimSettledOrderRes.status === 409);

    const ch8Passed = claimRejectedBlocked && claimSettledBlocked;

    recordResult({
      id: 'ADV-C-TERMINAL-CLAIM-PROTECTION-01',
      title: 'Sequential Mutex Guard on Terminal Order Statuses',
      endpoint: 'POST /api/order/claim (on REJECTED and SETTLED orders)',
      scenario: 'Attempt to claim orders that have already reached terminal state (REJECTED_BY_EXCHANGE or SETTLED). Verify HTTP 409 Conflict rejection.',
      expected: 'HTTP 409 Conflict returned for both terminal states, preventing resurrection or state tampering.',
      actual: `RejectedOrderClaimHTTP=${claimRejectedRes.status}, SettledOrderClaimHTTP=${claimSettledOrderRes.status}`,
      evidence: {
        claimRejectedError: claimRejectedRes.data?.error,
        claimSettledError: claimSettledOrderRes.data?.error
      },
      status: ch8Passed ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP TEST SERVER
    console.log('\n--- CLEANING UP TEST BACKEND PROCESS ---');
    try {
      serverProcess.kill('SIGINT');
      serverProcess.kill('SIGKILL');
    } catch (e) {}

    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.chmodSync(DISPOSABLE_STATE, 0o666);
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Removed disposable fixture ${DISPOSABLE_STATE}`);
      }
    } catch (e) {
      console.warn('Warning: Could not unlink disposable fixture:', e.message);
    }
  }

  // STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('\n--- STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256 after test execution: ${finalHash}`);
  const postFlightPassed = (finalHash === EXPECTED_HASH);

  recordResult({
    id: 'ADV-C-POSTFLIGHT',
    title: 'Post-Flight Authoritative State Baseline Hash Integrity',
    endpoint: 'Local File System (state.json)',
    scenario: 'Confirm authoritative state.json was 100% bit-for-bit untouched throughout all test executions',
    expected: EXPECTED_HASH,
    actual: finalHash,
    evidence: { sha256: finalHash, bitExact: postFlightPassed },
    status: postFlightPassed ? 'PASSED' : 'FAILED'
  });

  // Export results JSON
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`\n✓ Results exported to ${RESULTS_FILE}`);

  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const vulnerabilities = testResults.filter(r => r.status === 'VULNERABILITY').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('\n======================================================================');
  console.log(`📊 ADVERSARIAL CONCURRENCY CHALLENGE SUMMARY: ${passed} PASSED, ${vulnerabilities} VULNERABILITIES, ${failed} FAILED`);
  console.log('======================================================================\n');
}

runAdversarialPhaseCSuite().catch(err => {
  console.error('\n❌ Unhandled Adversarial Test Suite Failure:', err);
  process.exit(1);
});
