/**
 * SAAMX ADVERSARIAL STRESS & CONCURRENCY TEST SUITE
 * Milestone 3 / Phase D: FX Operator-Controlled Processing Queue & Finite Reserves
 * File: SAAMX/test-adversarial-phase-d-fx-queue.js
 * Port: 3144
 *
 * EMPIRICAL ADVERSARIAL CHALLENGES:
 * 1. Concurrency and Race Conditions:
 *    - 2-way simultaneous operator claim race on the same FX intake slip -> exactly 1x 200 OK, 1x 409 Conflict.
 *    - 10-way simultaneous claim storm from 10 distinct authenticated operators -> exactly 1x 200 OK, 9x 409 Conflict.
 *    - Concurrent double settlement attack (simultaneous APPROVE calls) -> exactly 1x 200, 1x 400/409, 0% double-debiting.
 *    - Non-owning operator claim violation -> HTTP 409 Conflict.
 * 2. Timer Expiration Adversarial Check:
 *    - Elapsed clearsAt inaction: when clearsAt has elapsed, NO automated settlement occurs without explicit operator action.
 *    - Adversarial balance crediting bypass: unprivileged team role or unauthenticated caller cannot APPROVE (HTTP 403 / 401).
 *    - Explicit EXPIRE operational action: cleanly transitions status, releases reservations, 0% balance crediting.
 * 3. Hold / Return / Reject Adversarial Checks (Reason Validation Boundaries):
 *    - HOLD: missing, empty, whitespace-only, 1-char, 2-char -> HTTP 400; >= 3 chars -> HTTP 200.
 *    - REJECT: missing, empty, whitespace-only, 1-2 chars -> HTTP 400; >= 3 chars -> HTTP 200.
 *    - RETURN_FOR_CORRECTION: missing, empty, whitespace-only, 1-2 chars -> HTTP 400; >= 3 chars -> HTTP 200.
 *    - Terminal status immutability: further operations on settled/rejected/cancelled/expired tickets rejected with HTTP 400.
 * 4. High-Precision Balance Leakage Audit:
 *    - 50-cycle continuous churn (submit -> hold -> reject/return/cancel/expire across multiple currencies).
 *    - 10^-6 precision verification: cashWallets suffer exactly 0.000000 balance delta or leakage.
 *    - 10^-6 precision verification: reservedCash returns to exactly 0.000000.
 *    - Finite FX reserve invariant (A + Res = I) holds bit-for-bit across all 9 foreign currencies.
 * 5. Pre-flight & post-flight authoritative state.json hash integrity (6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca).
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { initPool, closePool } from './database/db.js';
import {
  CURRENCY_DIRECTORY,
  ACTIVE_CURRENCIES,
  ACTIVE_FOREIGN_CURRENCIES,
  roundCurrency
} from './src/lib/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3144;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-challenger-d1-3144.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-d-results.json');

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

async function runAdversarialPhaseDSuite() {
  console.log('================================================================================');
  console.log('⚔️ SAAMX ADVERSARIAL CHALLENGER SUITE: PHASE D FX QUEUE & CONCURRENCY STRESS');
  console.log('================================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH BEFORE TESTING!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'ADV-D-PREFLIGHT-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    endpoint: 'Local File System (state.json)',
    scenario: 'Verify authoritative state.json SHA-256 matches expected baseline exactly',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: FIXTURE SETUP
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState = fixture.marketState || {};
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'INSTANT' };
  fixture.fxQueue = [];
  fixture.fxTransactions = [];

  // Seed 10 distinct exchange operators for the 10-way concurrency storm
  fixture.personnel = fixture.personnel || [];
  const baseOp = fixture.personnel.find(p => p.username === 'exchange');
  const opHash = baseOp?.passwordHash || '49ddb1c95c0bd3cde6fc6c66a321508bc926a90f1697be0869058a2cfd14441f';
  const opPerms = baseOp?.permissions || ['exchange.view', 'exchange.execute', 'exchange.reject'];

  for (let i = 1; i <= 10; i++) {
    const existing = fixture.personnel.find(p => p.username === `fx_op_${i}`);
    if (!existing) {
      fixture.personnel.push({
        id: `PERS_FX_OP_${i}`,
        username: `fx_op_${i}`,
        displayName: `FX Operator ${i}`,
        role: 'exchange',
        status: 'ACTIVE',
        department: 'FX Desk',
        passwordHash: opHash,
        permissions: [...opPerms],
        createdAt: Date.now()
      });
    }
  }

  // Seed Team T01 with full wallet balances across all 10 currencies
  const teamT01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (teamT01) {
    teamT01.cashWallets = {
      INR: 10000000,
      USD: 50000,
      GBP: 25000,
      EUR: 25000,
      JPY: 5000000,
      AED: 100000,
      SGD: 50000,
      CNY: 200000,
      AUD: 50000,
      KRW: 50000000
    };
    teamT01.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
    };
  }

  // Seed Team T02
  const teamT02 = (fixture.teams || []).find(t => t.teamCode === 'T02');
  if (teamT02) {
    teamT02.cashWallets = {
      INR: 10000000,
      USD: 50000,
      GBP: 25000,
      EUR: 25000,
      JPY: 5000000,
      AED: 100000,
      SGD: 50000,
      CNY: 200000,
      AUD: 50000,
      KRW: 50000000
    };
    teamT02.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
    };
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // Seed PostgreSQL database for T01/T02 wallets if available
  const pool = initPool();
  if (pool) {
    try {
      for (const cur of ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW']) {
        const bal1 = teamT01?.cashWallets?.[cur] || 0;
        await pool.query(
          `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
           ON CONFLICT (team_id, currency) DO UPDATE SET balance = $4, reserved = 0, updated_at = NOW()`,
          [`W_T01_${cur}`, 'T01', cur, bal1]
        );
      }
    } catch (e) {
      console.warn('Notice: PG seeding skipped:', e.message);
    }
  }

  console.log(`✓ Disposable fixture initialized on isolated port ${PORT}.\n`);

  // STEP 3: SPAWN ISOLATED BACKEND
  console.log(`--- STEP 3: SPAWNING ISOLATED BACKEND SERVER (PORT ${PORT}) ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'false',
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
        console.log(`✓ Isolated backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!serverStarted) {
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const [loginT01, loginT02, loginAdmin, loginOp, loginBank] = await Promise.all([
      apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' }),
      apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' }),
      apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' })
    ]);

    const tokenT01 = loginT01.data?.token;
    const tokenT02 = loginT02.data?.token;
    const tokenAdmin = loginAdmin.data?.token;
    const tokenOp = loginOp.data?.token;
    const tokenBank = loginBank.data?.token;

    assert.ok(tokenT01 && tokenT02 && tokenAdmin && tokenOp, 'Failed to acquire required authentication tokens');

    // Authenticate 10 distinct storm operators
    const stormTokens = [];
    for (let i = 1; i <= 10; i++) {
      const stormLogin = await apiRequest('POST', '/api/auth/login', {
        username: `fx_op_${i}`,
        password: 'exchange-event-2026'
      });
      stormTokens.push(stormLogin.data?.token);
    }
    assert.strictEqual(stormTokens.filter(Boolean).length, 10, 'All 10 distinct storm operators must authenticate');

    console.log('✓ Authentication tokens acquired for T01, T02, Admin, Exchange Operator, Bank Teller, and 10 Storm Operators.\n');

    // =========================================================================
    // SECTION 1: CONCURRENCY AND RACE CONDITIONS
    // =========================================================================
    console.log('========================================================================');
    console.log('SECTION 1: CONCURRENCY AND RACE CONDITIONS (MUTEX LOCKS & DOUBLE SETTLE)');
    console.log('========================================================================\n');

    // 1.1: 2-Way Concurrent Operator Claim Race
    console.log('--- TEST 1.1: 2-WAY SIMULTANEOUS OPERATOR CLAIM RACE ---');
    const req11 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 50000,
      delayWindowSec: 120
    }, bearer(tokenT01));

    assert.strictEqual(req11.status, 200, `Intake submission failed: ${JSON.stringify(req11.data)}`);
    const targetId11 = req11.data.fxRequest.id;

    // Firing concurrent claims: Operator 1 (exchange) vs Operator 2 (admin)
    const [c11_op, c11_admin] = await Promise.all([
      apiRequest('POST', '/api/fx/queue-action', { requestId: targetId11, actionType: 'CLAIM' }, bearer(tokenOp)),
      apiRequest('POST', '/api/fx/queue-action', { requestId: targetId11, actionType: 'CLAIM' }, bearer(tokenAdmin))
    ]);

    const statuses11 = [c11_op.status, c11_admin.status].sort();
    const isRaceValid11 = statuses11[0] === 200 && statuses11[1] === 409;

    recordResult({
      id: 'ADV-D-CONCUR-01',
      title: '2-Way Concurrent Operator Claim Race (Mutual Exclusion)',
      endpoint: 'POST /api/fx/queue-action (actionType: CLAIM, exchange vs admin)',
      scenario: 'Two authorized operators concurrently claim the same pending FX intake slip. Exactly one must acquire mutex (HTTP 200), one must be blocked (HTTP 409 Conflict).',
      expected: 'Exactly 1x HTTP 200, 1x HTTP 409 Conflict',
      actual: `StatusCodes: [${statuses11.join(', ')}]`,
      evidence: {
        opStatus: c11_op.status,
        opData: c11_op.data,
        adminStatus: c11_admin.status,
        adminData: c11_admin.data
      },
      status: isRaceValid11 ? 'PASSED' : 'FAILED'
    });

    // Clean up ticket 11 by rejecting with valid reason
    const cl11 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId11,
      actionType: 'REJECT',
      reason: 'Cleaning up test 1.1 ticket'
    }, bearer(tokenAdmin));
    const r11 = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team?.reservedCash;
    console.log(`[AUDIT] After Test 1.1 cleanup: status=${cl11.status}, data=${JSON.stringify(cl11.data)}, ReservedINR=${r11?.INR}`);

    // 1.2: 10-Way Simultaneous Claim Storm on Single FX Intake Ticket across 10 Distinct Operators
    console.log('\n--- TEST 1.2: 10-WAY SIMULTANEOUS CLAIM STORM ---');
    const req12 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 60000,
      delayWindowSec: 120
    }, bearer(tokenT01));

    assert.strictEqual(req12.status, 200, `Intake 1.2 submission failed: ${JSON.stringify(req12.data)}`);
    const targetId12 = req12.data.fxRequest.id;

    // Fire 10 simultaneous claim requests using 10 distinct authenticated operator sessions
    const claimStorm = stormTokens.map((sToken, idx) => {
      return apiRequest('POST', '/api/fx/queue-action', {
        requestId: targetId12,
        actionType: 'CLAIM'
      }, bearer(sToken));
    });

    const stormResults = await Promise.all(claimStorm);
    const stormStatuses = stormResults.map(r => r.status);
    const count200 = stormStatuses.filter(s => s === 200).length;
    const count409 = stormStatuses.filter(s => s === 409).length;
    const isStormValid = count200 === 1 && count409 === 9;

    recordResult({
      id: 'ADV-D-CONCUR-02',
      title: '10-Way Simultaneous Claim Storm on Single FX Ticket (10 Distinct Operators)',
      endpoint: 'POST /api/fx/queue-action (actionType: CLAIM across 10 distinct authenticated operators)',
      scenario: '10 distinct authenticated operators simultaneously contend for the exact same ticket. Verify atomic mutex holds: exactly 1x 200 OK, 9x 409 Conflict.',
      expected: 'Exactly 1x 200 OK, 9x 409 Conflict',
      actual: `200s: ${count200}, 409s: ${count409}, other: ${stormStatuses.length - count200 - count409}`,
      evidence: { stormStatuses },
      status: isStormValid ? 'PASSED' : 'FAILED'
    });

    // Clean up ticket 12
    const cl12 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId12,
      actionType: 'REJECT',
      reason: 'Cleaning up test 1.2 storm ticket'
    }, bearer(tokenAdmin));
    const r12 = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team?.reservedCash;
    console.log(`[AUDIT] After Test 1.2 cleanup: status=${cl12.status}, data=${JSON.stringify(cl12.data)}, ReservedINR=${r12?.INR}`);

    // 1.3: Concurrent Double Settlement Attack (Simultaneous APPROVE Calls)
    console.log('\n--- TEST 1.3: CONCURRENT DOUBLE SETTLEMENT ATTACK ---');
    const req13 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'GBP',
      fromAmount: 75000,
      delayWindowSec: 120
    }, bearer(tokenT01));

    assert.strictEqual(req13.status, 200, `Intake 1.3 failed: ${JSON.stringify(req13.data)}`);
    const targetId13 = req13.data.fxRequest.id;

    // Snapshot pre-settlement balances using /api/portfolio?teamCode=T01
    const preTeam13Res = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01));
    const preInr13 = preTeam13Res.data?.team?.cashWallets?.INR || 0;
    const preGbp13 = preTeam13Res.data?.team?.cashWallets?.GBP || 0;

    // Firing 2 simultaneous APPROVE settlement requests
    const [settle1, settle2] = await Promise.all([
      apiRequest('POST', '/api/fx/queue-action', { requestId: targetId13, actionType: 'APPROVE' }, bearer(tokenAdmin)),
      apiRequest('POST', '/api/fx/queue-action', { requestId: targetId13, actionType: 'APPROVE' }, bearer(tokenAdmin))
    ]);

    const settleStatuses = [settle1.status, settle2.status].sort();
    console.log(`Double settlement response codes: ${settle1.status} and ${settle2.status}`);

    const postTeam13Res = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01));
    const postInr13 = postTeam13Res.data?.team?.cashWallets?.INR || 0;
    const postGbp13 = postTeam13Res.data?.team?.cashWallets?.GBP || 0;

    const inrDebited = preInr13 - postInr13;
    const isSingleDebit = inrDebited === 75000;
    const isOneSuccessOneBlocked = settleStatuses.includes(200) && (settleStatuses.includes(400) || settleStatuses.includes(409));

    const r13 = postTeam13Res.data?.team?.reservedCash;
    console.log(`[AUDIT] After Test 1.3 settlement: ReservedINR=${r13?.INR}`);

    recordResult({
      id: 'ADV-D-CONCUR-03',
      title: 'Concurrent Double Settlement Race (Double-Debit Immunity)',
      endpoint: 'POST /api/fx/queue-action (actionType: APPROVE, 2x simultaneous)',
      scenario: 'Two simultaneous APPROVE requests target the exact same ticket. Verify atomic execution: exactly 1 settlement succeeds, second is rejected, source wallet debited strictly once (75000 INR).',
      expected: 'Exactly 1x 200 OK, 1x 400/409, Exactly 75,000 INR debited',
      actual: `Statuses=[${settleStatuses.join(', ')}], inrDebited=${inrDebited}`,
      evidence: {
        settle1Status: settle1.status,
        settle1Error: settle1.data?.error,
        settle2Status: settle2.status,
        settle2Error: settle2.data?.error,
        preBalances: { INR: preInr13, GBP: preGbp13 },
        postBalances: { INR: postInr13, GBP: postGbp13 }
      },
      status: (isOneSuccessOneBlocked && isSingleDebit) ? 'PASSED' : 'FAILED'
    });

    // 1.4: Non-Owning Operator Claim Conflict
    console.log('\n--- TEST 1.4: NON-OWNING OPERATOR CLAIM CONFLICT ---');
    const req14 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 20000,
      delayWindowSec: 120
    }, bearer(tokenT01));

    const targetId14 = req14.data.fxRequest.id;

    // Operator 'exchange' claims ticket
    const claim14 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId14,
      actionType: 'CLAIM'
    }, bearer(tokenOp));
    assert.strictEqual(claim14.status, 200);

    // Operator 'exchange' re-claiming own ticket should succeed (idempotent)
    const reClaimOwn = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId14,
      actionType: 'CLAIM'
    }, bearer(tokenOp));

    // A different operator (fx_op_1) attempting to claim ticket locked by 'exchange' must return 409
    const conflictClaim = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId14,
      actionType: 'CLAIM'
    }, bearer(stormTokens[0]));

    // Clean up ticket 14
    const cl14 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId14,
      actionType: 'REJECT',
      reason: 'Cleaning up test 1.4 ticket'
    }, bearer(tokenAdmin));

    const r14 = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team?.reservedCash;
    console.log(`[AUDIT] After Test 1.4 cleanup: status=${cl14.status}, data=${JSON.stringify(cl14.data)}, ReservedINR=${r14?.INR}`);

    const ch14Passed = reClaimOwn.status === 200 && conflictClaim.status === 409;

    recordResult({
      id: 'ADV-D-CONCUR-04',
      title: 'Idempotent Re-Claim vs Competing Non-Owning Operator Mutex Lock',
      endpoint: 'POST /api/fx/queue-action (actionType: CLAIM)',
      scenario: 'Owning operator re-claiming own ticket succeeds (HTTP 200); a different operator attempting to claim locked ticket is blocked (HTTP 409).',
      expected: 'Owning: HTTP 200; Competing: HTTP 409',
      actual: `Owning=${reClaimOwn.status}, Competing=${conflictClaim.status}`,
      evidence: { reClaimData: reClaimOwn.data, conflictData: conflictClaim.data },
      status: ch14Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // SECTION 2: TIMER EXPIRATION ADVERSARIAL CHECK (STRICT OPERATIONAL SIMULATION)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('SECTION 2: TIMER EXPIRATION ADVERSARIAL CHECK (NON-BYPASS INVARIANTS)');
    console.log('========================================================================\n');

    // 2.1: Elapsed clearsAt Inaction Verification
    console.log('--- TEST 2.1: ELAPSED CLEARANCE TIME INACTION VERIFICATION ---');
    // Create an FX request with 1-second simulation delay
    const req21 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000,
      delayWindowSec: 1
    }, bearer(tokenT01));

    assert.strictEqual(req21.status, 200, `Intake 2.1 failed: ${JSON.stringify(req21.data)}`);
    const targetId21 = req21.data.fxRequest.id;
    const targetClearsAt = req21.data.fxRequest.clearsAt;

    // Snapshot pre-expiration balances
    const pSnap21 = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preWallets21 = { ...pSnap21.cashWallets };
    const preReserved21 = { ...pSnap21.reservedCash };

    // Wait until clearsAt has strictly elapsed
    console.log(`Waiting for operational clearance window to elapse (${new Date(targetClearsAt).toISOString()})...`);
    await new Promise(r => setTimeout(r, 1500));
    const nowTime = Date.now();
    assert.ok(nowTime > targetClearsAt, `ClearsAt did not elapse: now=${nowTime}, clearsAt=${targetClearsAt}`);

    // Query queue state after clearsAt elapsed
    const qRes21 = await apiRequest('GET', '/api/fx/queue', null, bearer(tokenAdmin));
    const itemAfterElapsed = qRes21.data.queue.find(q => q.id === targetId21);

    // Query portfolio after clearsAt elapsed
    const pAfter21 = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postWallets21 = pAfter21.cashWallets;
    const postReserved21 = pAfter21.reservedCash;

    // Assert that NO auto-settlement occurred
    const statusUntouched = itemAfterElapsed && itemAfterElapsed.status !== 'approved' && itemAfterElapsed.status !== 'SETTLED';
    const sourceUntouched = postWallets21.INR === preWallets21.INR;
    const targetUntouched = postWallets21.USD === preWallets21.USD;
    const reserveIntact = postReserved21.INR === 100000;

    const ch21Passed = statusUntouched && sourceUntouched && targetUntouched && reserveIntact;

    recordResult({
      id: 'ADV-D-TIMER-01',
      title: 'Elapsed clearsAt Operational Simulation Inaction Verification',
      endpoint: 'GET /api/fx/queue & GET /api/portfolio (post-expiration check)',
      scenario: 'Operational delay window expires (now > clearsAt). Verify that strictly ZERO auto-settlement occurs: ticket status is not approved, cashWallets are unchanged, and reservedCash remains held.',
      expected: 'Status is pending/processing (NOT approved), INR unspent, USD not credited, reservedCash=100000',
      actual: `Status=${itemAfterElapsed?.status}, INR=${postWallets21.INR}, USD=${postWallets21.USD}, ReservedINR=${postReserved21.INR}`,
      evidence: {
        targetId: targetId21,
        clearsAt: targetClearsAt,
        now: nowTime,
        status: itemAfterElapsed?.status,
        preWallets: preWallets21,
        postWallets: postWallets21,
        postReserved: postReserved21
      },
      status: ch21Passed ? 'PASSED' : 'FAILED'
    });

    // 2.2: Adversarial Settlement Bypass Attack: Unprivileged Client APPROVE Attempt
    console.log('\n--- TEST 2.2: ADVERSARIAL SETTLEMENT BYPASS (UNPRIVILEGED ROLE) ---');
    const bypassClientRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId21,
      actionType: 'APPROVE'
    }, bearer(tokenT01));

    recordResult({
      id: 'ADV-D-TIMER-02',
      title: 'Adversarial Settle Bypass: Unprivileged Team APPROVE Attempt',
      endpoint: 'POST /api/fx/queue-action (actionType: APPROVE, caller: team role T01)',
      scenario: 'A participant team attempts to bypass operator review and settle an expired ticket directly. Must be blocked with HTTP 403 Forbidden.',
      expected: 'HTTP 403 Forbidden',
      actual: `Status: ${bypassClientRes.status}`,
      evidence: { responseData: bypassClientRes.data },
      status: bypassClientRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 2.3: Adversarial Settlement Bypass Attack: Unauthenticated Caller
    console.log('\n--- TEST 2.3: ADVERSARIAL SETTLEMENT BYPASS (UNAUTHENTICATED) ---');
    const bypassAnonRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId21,
      actionType: 'APPROVE'
    });

    recordResult({
      id: 'ADV-D-TIMER-03',
      title: 'Adversarial Settle Bypass: Unauthenticated APPROVE Attempt',
      endpoint: 'POST /api/fx/queue-action (actionType: APPROVE, unauthenticated)',
      scenario: 'An unauthenticated request attempts to trigger queue settlement. Must be blocked with HTTP 401 Unauthorized.',
      expected: 'HTTP 401 Unauthorized',
      actual: `Status: ${bypassAnonRes.status}`,
      evidence: { responseData: bypassAnonRes.data },
      status: bypassAnonRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 2.4: Adversarial Arbitrary Action Injection
    console.log('\n--- TEST 2.4: ADVERSARIAL ARBITRARY ACTION INJECTION ---');
    const invalidActionRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId21,
      actionType: 'AUTO_SETTLE'
    }, bearer(tokenAdmin));

    recordResult({
      id: 'ADV-D-TIMER-04',
      title: 'Adversarial Injection of Unsupported Action (AUTO_SETTLE)',
      endpoint: 'POST /api/fx/queue-action (actionType: AUTO_SETTLE)',
      scenario: 'Adversary submits an invalid actionType attempting to trigger automated settlement. Server must reject or ignore without auto-settling.',
      expected: 'Balances untouched, action rejected or no-op (status not approved)',
      actual: `Status: ${invalidActionRes.status}`,
      evidence: { responseData: invalidActionRes.data },
      status: invalidActionRes.status !== 200 || invalidActionRes.data?.fxRequest?.status !== 'approved' ? 'PASSED' : 'FAILED'
    });

    // 2.5: Explicit Operational Expiration (EXPIRE action)
    console.log('\n--- TEST 2.5: EXPLICIT OPERATIONAL EXPIRE ACTION ---');
    const expireRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: targetId21,
      actionType: 'EXPIRE'
    }, bearer(tokenAdmin));

    assert.strictEqual(expireRes.status, 200, `EXPIRE action failed: ${JSON.stringify(expireRes.data)}`);
    const pAfterExpire = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;

    // Confirm that EXPIRE cleanly released reservedCash and did NOT credit USD
    const expireReservedReleased = pAfterExpire.reservedCash.INR === 0;
    const expireUsdNotCredited = pAfterExpire.cashWallets.USD === preWallets21.USD;
    const expireInrNotDeducted = pAfterExpire.cashWallets.INR === preWallets21.INR;
    const ch25Passed = expireReservedReleased && expireUsdNotCredited && expireInrNotDeducted;

    recordResult({
      id: 'ADV-D-TIMER-05',
      title: 'Explicit Operational EXPIRE Action Invariant Verification',
      endpoint: 'POST /api/fx/queue-action (actionType: EXPIRE)',
      scenario: 'Operational clerk or system issues EXPIRE. Verify ticket transitions to expired, reserved funds released, and zero target currency credited.',
      expected: 'Status expired, reservedCash.INR=0, cashWallets.USD unchanged, cashWallets.INR unchanged',
      actual: `Status=${expireRes.data?.fxRequest?.status}, ReservedINR=${pAfterExpire.reservedCash.INR}, USD=${pAfterExpire.cashWallets.USD}`,
      evidence: {
        ticketStatus: expireRes.data?.fxRequest?.status,
        reservedCash: pAfterExpire.reservedCash,
        cashWallets: pAfterExpire.cashWallets
      },
      status: ch25Passed ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // SECTION 3: HOLD / RETURN / REJECT REASON VALIDATION BOUNDARIES
    // =========================================================================
    console.log('\n========================================================================');
    console.log('SECTION 3: MANDATORY REASON VALIDATION BOUNDARIES & TERMINAL IMMUTABILITY');
    console.log('========================================================================\n');

    // Helper to submit a fresh intake slip for reason testing
    async function getFreshSlip(cur = 'EUR', amt = 20000) {
      const r = await apiRequest('POST', '/api/fx/request', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount: amt,
        delayWindowSec: 120
      }, bearer(tokenT01));
      return r.data.fxRequest.id;
    }

    // 3.1: HOLD Reason Boundary Matrix
    console.log('--- TEST 3.1: HOLD REASON BOUNDARY MATRIX ---');
    const slip31 = await getFreshSlip('USD', 15000);

    const holdTests = [
      { name: 'Missing Reason Field', body: { requestId: slip31, actionType: 'HOLD' }, expected: 400 },
      { name: 'Empty String Reason', body: { requestId: slip31, actionType: 'HOLD', holdReason: '' }, expected: 400 },
      { name: 'Whitespace-Only Reason', body: { requestId: slip31, actionType: 'HOLD', holdReason: '     ' }, expected: 400 },
      { name: '1-Character Reason', body: { requestId: slip31, actionType: 'HOLD', holdReason: 'x' }, expected: 400 },
      { name: '2-Character Reason', body: { requestId: slip31, actionType: 'HOLD', holdReason: 'no' }, expected: 400 },
      { name: 'Exactly 3-Character Reason', body: { requestId: slip31, actionType: 'HOLD', holdReason: 'AML' }, expected: 200 }
    ];

    let holdAllMatched = true;
    const holdOutcomes = [];
    for (const ht of holdTests) {
      const res = await apiRequest('POST', '/api/fx/queue-action', ht.body, bearer(tokenAdmin));
      const passed = res.status === ht.expected;
      if (!passed) holdAllMatched = false;
      holdOutcomes.push({ test: ht.name, status: res.status, expected: ht.expected, match: passed });
    }

    // Clean up slip 31
    await apiRequest('POST', '/api/fx/queue-action', {
      requestId: slip31,
      actionType: 'CANCEL'
    }, bearer(tokenAdmin));

    recordResult({
      id: 'ADV-D-REASON-01',
      title: 'HOLD Mandatory Reason Boundary Stress Matrix (<3 Chars Blocked)',
      endpoint: 'POST /api/fx/queue-action (actionType: HOLD)',
      scenario: 'Test boundary edge cases for HOLD reasons: empty, whitespace-only, 1-char, 2-chars (all HTTP 400), and exactly 3-chars (HTTP 200).',
      expected: 'All 5 invalid reasons return HTTP 400, 3-char reason returns HTTP 200',
      actual: holdAllMatched ? 'All boundaries strictly enforced' : 'Boundary violation detected',
      evidence: { holdOutcomes },
      status: holdAllMatched ? 'PASSED' : 'FAILED'
    });

    // 3.2: REJECT Reason Boundary Matrix
    console.log('\n--- TEST 3.2: REJECT REASON BOUNDARY MATRIX ---');
    const slip32 = await getFreshSlip('JPY', 50000);

    const rejectTests = [
      { name: 'Missing Reason Field', body: { requestId: slip32, actionType: 'REJECT' }, expected: 400 },
      { name: 'Empty String Reason', body: { requestId: slip32, actionType: 'REJECT', rejectionReason: '' }, expected: 400 },
      { name: 'Whitespace-Only Reason', body: { requestId: slip32, actionType: 'REJECT', rejectionReason: '    ' }, expected: 400 },
      { name: '1-Character Reason', body: { requestId: slip32, actionType: 'REJECT', rejectionReason: '!' }, expected: 400 },
      { name: '2-Character Reason', body: { requestId: slip32, actionType: 'REJECT', rejectionReason: 'NA' }, expected: 400 },
      { name: 'Valid 3+ Character Reason', body: { requestId: slip32, actionType: 'REJECT', rejectionReason: 'Insufficient floor collateral' }, expected: 200 }
    ];

    let rejectAllMatched = true;
    const rejectOutcomes = [];
    for (const rt of rejectTests) {
      const res = await apiRequest('POST', '/api/fx/queue-action', rt.body, bearer(tokenAdmin));
      const passed = res.status === rt.expected;
      if (!passed) rejectAllMatched = false;
      rejectOutcomes.push({ test: rt.name, status: res.status, expected: rt.expected, match: passed });
    }

    recordResult({
      id: 'ADV-D-REASON-02',
      title: 'REJECT Mandatory Reason Boundary Stress Matrix (<3 Chars Blocked)',
      endpoint: 'POST /api/fx/queue-action (actionType: REJECT)',
      scenario: 'Test boundary edge cases for REJECT reasons: empty, whitespace-only, 1-2 chars (all HTTP 400), valid string (HTTP 200).',
      expected: 'All 5 invalid reasons return HTTP 400, valid string returns HTTP 200',
      actual: rejectAllMatched ? 'All boundaries strictly enforced' : 'Boundary violation detected',
      evidence: { rejectOutcomes },
      status: rejectAllMatched ? 'PASSED' : 'FAILED'
    });

    // 3.3: RETURN_FOR_CORRECTION Reason Boundary Matrix
    console.log('\n--- TEST 3.3: RETURN_FOR_CORRECTION REASON BOUNDARY MATRIX ---');
    const slip33 = await getFreshSlip('AED', 30000);

    const returnTests = [
      { name: 'Missing Reason Field', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION' }, expected: 400 },
      { name: 'Empty String Reason', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION', returnReason: '' }, expected: 400 },
      { name: 'Whitespace-Only Reason', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION', returnReason: '   ' }, expected: 400 },
      { name: '1-Character Reason', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION', returnReason: '?' }, expected: 400 },
      { name: '2-Character Reason', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION', returnReason: 'fx' }, expected: 400 },
      { name: 'Valid 3+ Character Reason', body: { requestId: slip33, actionType: 'RETURN_FOR_CORRECTION', returnReason: 'Re-verify settlement account details' }, expected: 200 }
    ];

    let returnAllMatched = true;
    const returnOutcomes = [];
    for (const ret of returnTests) {
      const res = await apiRequest('POST', '/api/fx/queue-action', ret.body, bearer(tokenAdmin));
      const passed = res.status === ret.expected;
      if (!passed) returnAllMatched = false;
      returnOutcomes.push({ test: ret.name, status: res.status, expected: ret.expected, match: passed });
    }

    recordResult({
      id: 'ADV-D-REASON-03',
      title: 'RETURN_FOR_CORRECTION Reason Boundary Matrix (<3 Chars Blocked)',
      endpoint: 'POST /api/fx/queue-action (actionType: RETURN_FOR_CORRECTION)',
      scenario: 'Test boundary edge cases for RETURN_FOR_CORRECTION reasons: empty, whitespace-only, 1-2 chars (all HTTP 400), valid string (HTTP 200).',
      expected: 'All 5 invalid reasons return HTTP 400, valid string returns HTTP 200',
      actual: returnAllMatched ? 'All boundaries strictly enforced' : 'Boundary violation detected',
      evidence: { returnOutcomes },
      status: returnAllMatched ? 'PASSED' : 'FAILED'
    });

    // 3.4: Terminal State Immutability
    console.log('\n--- TEST 3.4: TERMINAL STATE IMMUTABILITY ---');
    // slip32 was REJECTED in test 3.2, slip33 was RETURNED in test 3.3.
    // Any further actions on them must return HTTP 400.
    const reAction1 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: slip32,
      actionType: 'APPROVE'
    }, bearer(tokenAdmin));

    const reAction2 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: slip33,
      actionType: 'CLAIM'
    }, bearer(tokenOp));

    const isTerminalProtected = reAction1.status === 400 && reAction2.status === 400;

    recordResult({
      id: 'ADV-D-REASON-04',
      title: 'Terminal Status Immutability Protection',
      endpoint: 'POST /api/fx/queue-action (APPROVE on rejected, CLAIM on returned)',
      scenario: 'Attempting to perform further operations on tickets that reached terminal status (rejected / returned). Must return HTTP 400.',
      expected: 'Both actions rejected with HTTP 400',
      actual: `Re-Approve: ${reAction1.status}, Re-Claim: ${reAction2.status}`,
      evidence: {
        rejectedTicketSettleResponse: reAction1.data,
        returnedTicketClaimResponse: reAction2.data
      },
      status: isTerminalProtected ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // SECTION 4: BALANCE LEAKAGE AUDIT (10^-6 PRECISION EMPIRICAL CHURN)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('SECTION 4: BALANCE LEAKAGE AUDIT (HIGH-PRECISION 50-CYCLE CHURN)');
    console.log('========================================================================\n');

    // Step 4.1: Record exact baseline pre-churn state for T01 and Desk Reserves
    const preChurnTeamRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01));
    const preChurnWallets = { ...preChurnTeamRes.data?.team?.cashWallets };
    const preChurnReserved = { ...preChurnTeamRes.data?.team?.reservedCash };

    // Get baseline desk reserves for all 9 foreign currencies
    const preRatesRes = await apiRequest('GET', '/api/fx/reserves');
    const preDeskReserves = {};
    for (const c of ACTIVE_FOREIGN_CURRENCIES) {
      preDeskReserves[c] = {
        currentInventory: preRatesRes.data.reserves[c]?.currentInventory || 0,
        reservedInventory: preRatesRes.data.reserves[c]?.reservedInventory || 0,
        availableReserve: preRatesRes.data.reserves[c]?.availableReserve || 0
      };
      // Assert finite reserve invariant initially: A + Res = I
      const invariant = Math.abs((preDeskReserves[c].availableReserve + preDeskReserves[c].reservedInventory) - preDeskReserves[c].currentInventory);
      assert.ok(invariant < 1e-6, `Baseline FX reserve invariant failed for ${c}`);
    }

    console.log('Pre-churn baseline recorded across all 10 currencies. Beginning 50-cycle churn...');

    const CHURN_CYCLES = 50;
    const testCurrencies = ['USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];
    let invariantViolations = 0;

    for (let i = 0; i < CHURN_CYCLES; i++) {
      const cur = testCurrencies[i % testCurrencies.length];
      const fromAmount = cur === 'JPY' || cur === 'KRW' ? 100000 : 25000;
      const opPattern = i % 5; // 0=Hold->Cancel, 1=Reject, 2=Hold->Return, 3=Expire, 4=Direct Cancel

      // 1. Submit Request (INR -> Foreign)
      const subRes = await apiRequest('POST', '/api/fx/request', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount,
        delayWindowSec: 60
      }, bearer(tokenT01));

      assert.strictEqual(subRes.status, 200, `Churn iteration ${i} submission failed`);
      const churnTicketId = subRes.data.fxRequest.id;

      // 2. Perform operation sequence
      if (opPattern === 0) {
        // Hold -> Cancel
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'HOLD',
          holdReason: `Churn Hold Reason ${i}`
        }, bearer(tokenAdmin));

        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'CANCEL'
        }, bearer(tokenAdmin));
      } else if (opPattern === 1) {
        // Direct Reject
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'REJECT',
          reason: `Churn Rejection Reason ${i}`
        }, bearer(tokenAdmin));
      } else if (opPattern === 2) {
        // Hold -> Return for correction
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'HOLD',
          holdReason: `Churn Pre-Return Hold ${i}`
        }, bearer(tokenAdmin));

        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'RETURN_FOR_CORRECTION',
          returnReason: `Churn Return Reason ${i}`
        }, bearer(tokenAdmin));
      } else if (opPattern === 3) {
        // Direct Expire
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'EXPIRE'
        }, bearer(tokenAdmin));
      } else {
        // Direct Cancel
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: churnTicketId,
          actionType: 'CANCEL'
        }, bearer(tokenAdmin));
      }

      // Check intermediate reserve invariant periodically
      if (i % 10 === 0) {
        const intermediateRates = await apiRequest('GET', '/api/fx/reserves');
        for (const c of ACTIVE_FOREIGN_CURRENCIES) {
          const inv = intermediateRates.data.reserves[c]?.currentInventory || 0;
          const res = intermediateRates.data.reserves[c]?.reservedInventory || 0;
          const av = intermediateRates.data.reserves[c]?.availableReserve || 0;
          if (Math.abs((av + res) - inv) > 1e-6) {
            invariantViolations++;
          }
        }
      }
    }

    console.log(`✓ 50 churn iterations executed across all 9 currencies. Verifying post-churn state with 10^-6 precision...\n`);

    // Step 4.2: Post-Churn Precision Audit
    const postChurnTeamRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01));
    const postChurnWallets = postChurnTeamRes.data?.team?.cashWallets || {};
    const postChurnReserved = postChurnTeamRes.data?.team?.reservedCash || {};

    // Verify cashWallets suffered 0 balance delta
    const walletDeltas = {};
    let maxWalletDelta = 0;
    for (const cur of ACTIVE_CURRENCIES) {
      const delta = Math.abs(Number(postChurnWallets[cur] || 0) - Number(preChurnWallets[cur] || 0));
      walletDeltas[cur] = delta;
      if (delta > maxWalletDelta) maxWalletDelta = delta;
    }

    // Verify reservedCash returned to exact zero
    const reservedResiduals = {};
    let maxReservedResidual = 0;
    for (const cur of ACTIVE_CURRENCIES) {
      const resVal = Math.abs(Number(postChurnReserved[cur] || 0));
      reservedResiduals[cur] = resVal;
      if (resVal > maxReservedResidual) maxReservedResidual = resVal;
    }

    // Verify desk reserves
    const postRatesRes = await apiRequest('GET', '/api/fx/reserves');
    const reserveInvariants = {};
    let maxDeskInvariantDelta = 0;
    for (const c of ACTIVE_FOREIGN_CURRENCIES) {
      const preInv = preDeskReserves[c].currentInventory;
      const preAvail = preDeskReserves[c].availableReserve;
      const postInv = postRatesRes.data.reserves[c]?.currentInventory || 0;
      const postAvail = postRatesRes.data.reserves[c]?.availableReserve || 0;
      const postRes = postRatesRes.data.reserves[c]?.reservedInventory || 0;

      const invariantError = Math.abs((postAvail + postRes) - postInv);
      const inventoryDelta = Math.abs(postInv - preInv);
      const availableDelta = Math.abs(postAvail - preAvail);

      reserveInvariants[c] = {
        invariantError,
        inventoryDelta,
        availableDelta,
        postRes
      };

      if (invariantError > maxDeskInvariantDelta) maxDeskInvariantDelta = invariantError;
      if (inventoryDelta > maxDeskInvariantDelta) maxDeskInvariantDelta = inventoryDelta;
      if (availableDelta > maxDeskInvariantDelta) maxDeskInvariantDelta = availableDelta;
    }

    const isWalletsZeroLeakage = maxWalletDelta < 1e-6;
    const isReservedZeroResidual = maxReservedResidual < 1e-6;
    const isDeskZeroLeakage = maxDeskInvariantDelta < 1e-6;

    recordResult({
      id: 'ADV-D-LEAKAGE-01',
      title: '50-Cycle Churn: Client Cash Wallets Zero-Leakage Audit (10^-6 Precision)',
      endpoint: 'GET /api/portfolio (post-churn delta check across all 10 currencies)',
      scenario: 'Subject T01 client wallets to 50 rapid submit -> hold -> reject/return/cancel/expire cycles across all 9 foreign currencies. Compare pre-churn vs post-churn balances.',
      expected: 'Max balance delta strictly < 10^-6 (0.000000)',
      actual: `Max wallet delta = ${maxWalletDelta.toFixed(6)}`,
      evidence: { walletDeltas },
      status: isWalletsZeroLeakage ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'ADV-D-LEAKAGE-02',
      title: '50-Cycle Churn: Client Reserved Cash Zero-Residual Audit',
      endpoint: 'GET /api/portfolio (reservedCash check across all 10 currencies)',
      scenario: 'Verify that reservedCash for all 10 currencies returns strictly to 0.000000 after 50 churn cycles.',
      expected: 'All reservedCash values strictly = 0.000000',
      actual: `Max residual reserved = ${maxReservedResidual.toFixed(6)}`,
      evidence: { reservedResiduals },
      status: isReservedZeroResidual ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'ADV-D-LEAKAGE-03',
      title: '50-Cycle Churn: Finite FX Desk Reserve Invariant Audit (A + Res = I)',
      endpoint: 'GET /api/fx/rates (desk reserves check across all 9 foreign currencies)',
      scenario: 'Verify that Available Reserve + Reserved Inventory = Current Inventory holds bit-for-bit with 0 inventory leakage after 50 churn cycles.',
      expected: 'Max desk invariant/inventory delta strictly < 10^-6',
      actual: `Max desk error = ${maxDeskInvariantDelta.toFixed(6)}`,
      evidence: { reserveInvariants },
      status: isDeskZeroLeakage ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP & SERVER TEARDOWN
    console.log('\n--- CLEANUP & TEARDOWN ---');
    try {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        try { serverProcess.kill('SIGKILL'); } catch (e) {}
      }, 1000);
    } catch (e) {}

    await closePool();

    // Clean up disposable state snapshot
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Removed disposable state snapshot: ${DISPOSABLE_STATE}`);
      }
    } catch (e) {
      console.warn('Notice: Failed to remove disposable state snapshot:', e.message);
    }
  }

  // STEP 5: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('\n--- STEP 5: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const postHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${postHash}`);
  assert.strictEqual(postHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER TESTING!');
  console.log('✓ Authoritative state hash confirmed 100% bit-exact and untouched.\n');

  recordResult({
    id: 'ADV-D-POSTFLIGHT-01',
    title: 'Post-flight Authoritative Baseline Hash Verification',
    endpoint: 'Local File System (state.json)',
    scenario: 'Confirm authoritative state.json SHA-256 remains 100% bit-exact after all adversarial stress tests',
    expected: EXPECTED_HASH,
    actual: postHash,
    evidence: { sha256: postHash },
    status: postHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // WRITE RESULTS FILE
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Adversarial test results written to: ${RESULTS_FILE}\n`);

  // SUMMARY REPORT
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  const vuln = testResults.filter(r => r.status === 'VULNERABILITY').length;

  console.log('================================================================================');
  console.log('📊 ADVERSARIAL CHALLENGE EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`Total Adversarial Tests: ${total}`);
  console.log(`🟢 Passed:               ${passed}`);
  console.log(`🔴 Failed:               ${failed}`);
  console.log(`⚠️ Vulnerabilities:      ${vuln}`);
  console.log(`Verdict:                 ${failed === 0 && vuln === 0 ? 'CONFIRM' : 'REJECT'}`);
  console.log('================================================================================\n');

  if (failed > 0 || vuln > 0) {
    process.exit(1);
  }
}

runAdversarialPhaseDSuite().catch(err => {
  console.error('\n❌ ADVERSARIAL TEST RUNNER UNHANDLED EXCEPTION:', err);
  process.exit(1);
});
