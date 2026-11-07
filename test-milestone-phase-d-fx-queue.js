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
  formatCurrency,
  roundCurrency
} from './src/lib/formatters.js';
import { getScarcityPricingMetrics } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3114;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-d-fx-queue.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-milestone-phase-d-results.json');

const testResults = [];

function recordResult({ id, title, endpoint, role, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, endpoint, role, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Endpoint:  ${endpoint || 'N/A'}`);
  console.log(`  Role/Auth: ${role || 'N/A'}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
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

async function runPhaseDFxQueueSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE D — FX OPERATOR-CONTROLLED PROCESSING QUEUE SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'PHASE-D-PREFLIGHT-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    endpoint: 'Local File System (state.json)',
    role: 'system',
    scenario: 'Verify state.json SHA-256 is strictly bit-exact before testing',
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
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'INSTANT' };
  fixture.fxQueue = [];
  fixture.fxTransactions = [];

  // Seed Team T01 with all 10 currency wallets
  const teamT01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (teamT01) {
    teamT01.cashWallets = {
      INR: 10000000,
      USD: 10000,
      GBP: 5000,
      EUR: 5000,
      JPY: 1000000,
      AED: 20000,
      SGD: 10000,
      CNY: 50000,
      AUD: 10000,
      KRW: 10000000
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
      USD: 10000,
      GBP: 5000,
      EUR: 5000,
      JPY: 1000000,
      AED: 20000,
      SGD: 10000,
      CNY: 50000,
      AUD: 10000,
      KRW: 10000000
    };
    teamT02.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
    };
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // Seed PostgreSQL database for T01/T02 wallets if configured
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

  console.log('✓ Disposable fixture initialized on isolated port 3114.\n');

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
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginOp = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenOp = loginOp.data?.token;

    console.log('✓ Session tokens acquired for T01, Admin, and Exchange Operator.\n');

    // TEST 2: Legacy CAD/CHF Isolation
    console.log('--- SECTION 2: LEGACY CAD/CHF ISOLATION ---');
    const cadReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'CAD',
      fromAmount: 50000,
      delayWindowSec: 120
    }, bearer(tokenT01));

    const chfEx = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'CHF',
      toCurrency: 'INR',
      fromAmount: 1000
    }, bearer(tokenOp));

    const cadConv = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'CAD',
      toCurrency: 'INR',
      amount: 1000
    }, bearer(tokenOp));

    const cadChfIsolated = cadReq.status === 400 && chfEx.status === 400 && cadConv.status === 400;
    recordResult({
      id: 'PHASE-D-LEGACY-CAD-CHF-01',
      title: 'Legacy CAD/CHF Rejection (HTTP 400)',
      endpoint: '/api/fx/request, /api/fx/exchange, /api/fx/convert',
      role: 'team, exchange',
      scenario: 'Attempting exchange, request, or conversion with CAD/CHF returns HTTP 400',
      expected: 'HTTP 400 rejection across all endpoints with legacy currency error',
      actual: `Request=${cadReq.status}, Exchange=${chfEx.status}, Convert=${cadConv.status}`,
      evidence: {
        cadReqError: cadReq.data?.error,
        chfExError: chfEx.data?.error,
        cadConvError: cadConv.data?.error
      },
      status: cadChfIsolated ? 'PASSED' : 'FAILED'
    });

    // TEST 3: Integer Rounding for JPY/KRW
    console.log('--- SECTION 3: INTEGER ROUNDING FOR JPY/KRW ---');
    const jpyConv = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'JPY',
      amount: 100000
    }, bearer(tokenOp));

    const krwConv = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'KRW',
      amount: 100000
    }, bearer(tokenOp));

    const jpyAmount = jpyConv.data?.toAmount ?? jpyConv.data?.credited;
    const krwAmount = krwConv.data?.toAmount ?? krwConv.data?.credited;
    const precisionValid = Number.isInteger(jpyAmount) && Number.isInteger(krwAmount);

    recordResult({
      id: 'PHASE-D-PRECISION-JPY-KRW-01',
      title: 'Integer Rounding for JPY/KRW (Zero Decimals)',
      endpoint: 'POST /api/fx/convert',
      role: 'team',
      scenario: 'Conversions to JPY and KRW must strictly produce whole integers with zero fractional decimals',
      expected: 'Number.isInteger(toAmount) === true for both JPY and KRW',
      actual: `JPY toAmount=${jpyAmount} (isInteger=${Number.isInteger(jpyAmount)}), KRW toAmount=${krwAmount} (isInteger=${Number.isInteger(krwAmount)})`,
      evidence: { jpyAmount, krwAmount },
      status: precisionValid ? 'PASSED' : 'FAILED'
    });

    // TEST 4: Scarcity Pricing Curve Bounded 0.45% to 25.00%
    console.log('--- SECTION 4: SCARCITY PRICING CURVE BOUNDED 0.45% TO 25.00% ---');
    // Test direct scarcity metrics calculation across utilization range
    const mockReserves = {
      USD: {
        currency: 'USD',
        openingReserve: 10000000,
        replenishments: 0,
        completedPurchases: 0,
        completedSales: 0,
        reservedInventory: 0,
        availableReserve: 10000000,
        currentInventory: 10000000
      }
    };
    // 0% utilization
    const metric0 = getScarcityPricingMetrics('USD', mockReserves);

    // 50% utilization (avail = 5,000,000)
    mockReserves.USD.availableReserve = 5000000;
    const metric50 = getScarcityPricingMetrics('USD', mockReserves);

    // 75% utilization (avail = 2,500,000)
    mockReserves.USD.availableReserve = 2500000;
    const metric75 = getScarcityPricingMetrics('USD', mockReserves);

    // 100% utilization (avail = 0)
    mockReserves.USD.availableReserve = 0;
    const metric100 = getScarcityPricingMetrics('USD', mockReserves);

    const curveValid = (
      metric0.spreadPercent === 0.45 &&
      metric50.spreadPercent === 0.45 &&
      metric75.spreadPercent > 12.00 && metric75.spreadPercent < 13.00 &&
      metric100.spreadPercent === 25.00
    );

    recordResult({
      id: 'PHASE-D-SCARCITY-CURVE-01',
      title: 'Scarcity Pricing Curve Bounded 0.45% to 25.00% Ceiling',
      endpoint: 'server.js:getScarcityPricingMetrics',
      role: 'system',
      scenario: 'Verify spread remains at base 0.45% for <=50% drawdown and scales to 25.00% ceiling at 100% drawdown',
      expected: 'u<=0.50 spread=0.45%, u=0.75 spread~12.725%, u=1.00 spread=25.00%',
      actual: `u=0 spread=${metric0.spreadPercent}%, u=0.5 spread=${metric50.spreadPercent}%, u=0.75 spread=${metric75.spreadPercent}%, u=1.0 spread=${metric100.spreadPercent}%`,
      evidence: { metric0, metric50, metric75, metric100 },
      status: curveValid ? 'PASSED' : 'FAILED'
    });

    // TEST 5: FX Queue Intake & Initial State ('pending')
    console.log('--- SECTION 5: FX QUEUE INTAKE & INITIAL STATE PENDING ---');
    const reqAmountInr = 88600;
    const preReservesRes = await apiRequest('GET', '/api/fx/reserves');
    const preUsdAvail = preReservesRes.data?.reserves?.USD?.availableReserve || 0;
    const preUsdResv = preReservesRes.data?.reserves?.USD?.reservedInventory || 0;

    const queueReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: reqAmountInr,
      delayWindowSec: 120,
      notes: 'Phase D Queue intake testing'
    }, bearer(tokenT01));

    const createdItem = queueReq.data?.fxRequest;
    const postReservesRes = await apiRequest('GET', '/api/fx/reserves');
    const postUsdAvail = postReservesRes.data?.reserves?.USD?.availableReserve || 0;
    const postUsdResv = postReservesRes.data?.reserves?.USD?.reservedInventory || 0;

    const teamStateRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01));
    const teamReservedInr = teamStateRes.data?.team?.reservedCash?.INR || 0;

    const intakeValid = (
      queueReq.status === 200 &&
      createdItem?.status === 'pending' &&
      createdItem?.clearsAt > Date.now() &&
      teamReservedInr >= reqAmountInr &&
      postUsdResv > preUsdResv &&
      postUsdAvail < preUsdAvail
    );

    recordResult({
      id: 'PHASE-D-QUEUE-INTAKE-01',
      title: 'FX Queue Intake & Initial State (pending)',
      endpoint: 'POST /api/fx/request',
      role: 'team (T01)',
      scenario: 'Submit conversion slip with delayWindowSec; verify status is initialized to pending with locked client cash and desk inventory',
      expected: 'HTTP 200, status=pending, clearsAt set, client reservedCash.INR locked, desk reservedInventory locked',
      actual: `HTTP ${queueReq.status}: status=${createdItem?.status}, clearsAt=${createdItem?.clearsAt}, clientReservedINR=${teamReservedInr}, deskReservedUSD=${postUsdResv}`,
      evidence: { createdItem, teamReservedInr, postUsdAvail, postUsdResv },
      status: intakeValid ? 'PASSED' : 'FAILED'
    });

    const ticket1Id = createdItem?.id;

    // TEST 6: Finite FX Reserve Solvency Invariant (A + Res = I)
    console.log('--- SECTION 6: FINITE FX RESERVE SOLVENCY INVARIANT ---');
    const allReservesRes = await apiRequest('GET', '/api/fx/reserves');
    const reservesObj = allReservesRes.data?.reserves || {};
    let invariantHoldsAll = true;
    const invariantDetails = {};

    for (const cur of ACTIVE_FOREIGN_CURRENCIES) {
      const r = reservesObj[cur];
      if (!r) {
        invariantHoldsAll = false;
        break;
      }
      const inv = Number(r.currentInventory);
      const avail = Number(r.availableReserve);
      const resv = Number(r.reservedInventory || 0);
      const diff = Math.abs((avail + resv) - inv);
      const holds = diff <= 0.001 && avail >= 0 && resv >= 0;
      invariantDetails[cur] = { inv, avail, resv, diff, holds };
      if (!holds) invariantHoldsAll = false;
    }

    recordResult({
      id: 'PHASE-D-SOLVENCY-INVARIANT-01',
      title: 'Finite FX Reserve Solvency Invariant (A + Res = I)',
      endpoint: 'GET /api/fx/reserves',
      role: 'public',
      scenario: 'Verify availableReserve + reservedInventory === currentInventory holds strictly across all 9 foreign currencies',
      expected: 'A + Res === I strictly holds within 0.001 precision across all 9 foreign currencies',
      actual: `Invariant holds across all 9 foreign currencies: ${invariantHoldsAll}`,
      evidence: invariantDetails,
      status: invariantHoldsAll ? 'PASSED' : 'FAILED'
    });

    // TEST 7: Operator Claim Mutex Locking & Concurrency Protection
    console.log('--- SECTION 7: OPERATOR CLAIM MUTEX LOCKING ---');
    const claimRes1 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'CLAIM'
    }, bearer(tokenOp));

    // Operator 2 (Admin) attempts to claim the same locked ticket
    const claimRes2 = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'CLAIM'
    }, bearer(tokenAdmin));

    const claimPass = (
      claimRes1.status === 200 &&
      claimRes1.data?.fxRequest?.status === 'processing' &&
      claimRes1.data?.fxRequest?.lockedByOperator === 'exchange' &&
      claimRes2.status === 409
    );

    recordResult({
      id: 'PHASE-D-CLAIM-MUTEX-01',
      title: 'Operator Claim Mutex Locking & Concurrency Protection',
      endpoint: 'POST /api/fx/queue-action (CLAIM)',
      role: 'exchange, admin',
      scenario: 'Operator 1 claims ticket; Operator 2 attempting concurrent claim on same ticket receives HTTP 409 Conflict',
      expected: 'Operator 1 HTTP 200 status=processing; Operator 2 HTTP 409 Conflict',
      actual: `Op1=${claimRes1.status} (status=${claimRes1.data?.fxRequest?.status}, lockedBy=${claimRes1.data?.fxRequest?.lockedByOperator}), Op2=${claimRes2.status}`,
      evidence: { claim1: claimRes1.data, claim2: claimRes2.data },
      status: claimPass ? 'PASSED' : 'FAILED'
    });

    // TEST 8: Operational Simulation Delay Window & Non-Bypass
    console.log('--- SECTION 8: OPERATIONAL DELAY WINDOW & NON-BYPASS ---');
    // Start processing with 1s simulated duration
    const procRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'START_PROCESSING',
      durationSec: 1,
      isTest: true
    }, bearer(tokenOp));

    // Wait for the simulated delay duration to elapse (1.5 seconds)
    await new Promise(r => setTimeout(r, 1500));

    // Inspect queue after timer expiration: verify ticket is STILL 'processing' and NOT auto-settled
    const queueListRes = await apiRequest('GET', '/api/fx/queue', null, bearer(tokenOp));
    const ticketAfterDelay = (queueListRes.data?.queue || []).find(q => q.id === ticket1Id);

    const nonBypassValid = (
      procRes.status === 200 &&
      ticketAfterDelay?.status === 'processing' &&
      Date.now() >= ticketAfterDelay?.clearsAt &&
      ticketAfterDelay?.settledAt === null
    );

    recordResult({
      id: 'PHASE-D-DELAY-TIMER-SIM-01',
      title: 'Operational Simulation Delay Window & Zero Auto-Settlement Bypass',
      endpoint: 'POST /api/fx/queue-action (START_PROCESSING)',
      role: 'exchange',
      scenario: 'Start operational delay window; wait for clearsAt to elapse; confirm timer expiry does NOT trigger auto-settlement',
      expected: 'clearsAt elapsed, status remains processing, settledAt is null, no automatic bypass',
      actual: `status=${ticketAfterDelay?.status}, elapsed=${Date.now() >= ticketAfterDelay?.clearsAt}, settledAt=${ticketAfterDelay?.settledAt}`,
      evidence: { ticketAfterDelay, elapsedMs: Date.now() - ticketAfterDelay?.clearsAt },
      status: nonBypassValid ? 'PASSED' : 'FAILED'
    });

    // TEST 9: Operator Control: HOLD with Mandatory Reason
    console.log('--- SECTION 9: OPERATOR HOLD WITH MANDATORY REASON ---');
    // 9.1 Missing reason must return HTTP 400
    const holdNoReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'HOLD',
      reason: ''
    }, bearer(tokenOp));

    // 9.2 Valid reason updates status to on_hold and preserves reservations
    const preHoldReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.USD;
    const holdWithReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'HOLD',
      holdReason: 'Awaiting KYC compliance documentation from participant'
    }, bearer(tokenOp));
    const postHoldReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.USD;

    const holdPass = (
      holdNoReason.status === 400 &&
      holdWithReason.status === 200 &&
      holdWithReason.data?.fxRequest?.status === 'on_hold' &&
      holdWithReason.data?.fxRequest?.holdReason === 'Awaiting KYC compliance documentation from participant' &&
      postHoldReserves.reservedInventory === preHoldReserves.reservedInventory
    );

    recordResult({
      id: 'PHASE-D-HOLD-ACTION-01',
      title: 'Operator Control: HOLD with Mandatory Reason',
      endpoint: 'POST /api/fx/queue-action (HOLD)',
      role: 'exchange',
      scenario: 'Missing hold reason returns HTTP 400; valid reason sets status on_hold while preserving reservations',
      expected: 'No reason: HTTP 400; Valid reason: HTTP 200 status=on_hold, reservations held intact',
      actual: `NoReason=${holdNoReason.status}, ValidReason=${holdWithReason.status} (status=${holdWithReason.data?.fxRequest?.status}, reservedUSD=${postHoldReserves.reservedInventory})`,
      evidence: { holdNoReason: holdNoReason.data, holdWithReason: holdWithReason.data },
      status: holdPass ? 'PASSED' : 'FAILED'
    });

    // TEST 10: Operator Control: RETURN_FOR_CORRECTION with Mandatory Reason
    console.log('--- SECTION 10: RETURN FOR CORRECTION WITH MANDATORY REASON ---');
    // Submit ticket 2 for return testing
    const reqTicket2 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'GBP',
      fromAmount: 120000,
      delayWindowSec: 120
    }, bearer(tokenT01));
    const ticket2Id = reqTicket2.data?.fxRequest?.id;

    // Missing reason returns HTTP 400
    const returnNoReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket2Id,
      actionType: 'RETURN_FOR_CORRECTION',
      reason: ''
    }, bearer(tokenOp));

    // Valid return releases reservations cleanly
    const preReturnTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preReturnGbp = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.GBP;

    const returnWithReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket2Id,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: 'Amount deviates from trade confirmation voucher'
    }, bearer(tokenOp));

    const postReturnTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postReturnGbp = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.GBP;

    const returnPass = (
      returnNoReason.status === 400 &&
      returnWithReason.status === 200 &&
      returnWithReason.data?.fxRequest?.status === 'rejected' &&
      postReturnTeam.reservedCash.INR < preReturnTeam.reservedCash.INR &&
      postReturnGbp.reservedInventory < preReturnGbp.reservedInventory &&
      postReturnTeam.cashWallets.INR === preReturnTeam.cashWallets.INR // Zero cash balance leakage
    );

    recordResult({
      id: 'PHASE-D-CORRECTION-ACTION-01',
      title: 'Operator Control: RETURN_FOR_CORRECTION with Mandatory Reason',
      endpoint: 'POST /api/fx/queue-action (RETURN_FOR_CORRECTION)',
      role: 'exchange',
      scenario: 'Missing reason returns HTTP 400; valid return sets status rejected and cleanly releases funds without cash balance leakage',
      expected: 'No reason: HTTP 400; Valid: HTTP 200 status=rejected, reservations released, 0% cash leakage',
      actual: `NoReason=${returnNoReason.status}, Valid=${returnWithReason.status} (status=${returnWithReason.data?.fxRequest?.status}, cashWallets.INR untouched=${postReturnTeam.cashWallets.INR === preReturnTeam.cashWallets.INR})`,
      evidence: { returnNoReason: returnNoReason.data, returnWithReason: returnWithReason.data },
      status: returnPass ? 'PASSED' : 'FAILED'
    });

    // TEST 11: Clean Reservation Release on REJECT (Zero Balance Leakage)
    console.log('--- SECTION 11: CLEAN RESERVATION RELEASE ON REJECT ---');
    const reqTicket3 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 95000,
      delayWindowSec: 120
    }, bearer(tokenT01));
    const ticket3Id = reqTicket3.data?.fxRequest?.id;

    // Missing rejection reason returns HTTP 400
    const rejectNoReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket3Id,
      actionType: 'REJECT',
      reason: ''
    }, bearer(tokenOp));

    const preRejectTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preRejectEur = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.EUR;

    const rejectWithReason = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket3Id,
      actionType: 'REJECT',
      rejectionReason: 'Exceeds foreign procurement threshold for this round'
    }, bearer(tokenOp));

    const postRejectTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postRejectEur = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.EUR;

    const rejectPass = (
      rejectNoReason.status === 400 &&
      rejectWithReason.status === 200 &&
      rejectWithReason.data?.fxRequest?.status === 'rejected' &&
      postRejectTeam.reservedCash.INR < preRejectTeam.reservedCash.INR &&
      postRejectEur.reservedInventory < preRejectEur.reservedInventory &&
      postRejectTeam.cashWallets.INR === preRejectTeam.cashWallets.INR // Zero balance leakage
    );

    recordResult({
      id: 'PHASE-D-REJECT-LEAKAGE-01',
      title: 'Clean Reservation Release on REJECT (Zero Balance Leakage)',
      endpoint: 'POST /api/fx/queue-action (REJECT)',
      role: 'exchange',
      scenario: 'Missing reason returns HTTP 400; valid rejection restores client unreserved cash and desk inventory with 0% balance leakage',
      expected: 'No reason: HTTP 400; Valid: HTTP 200 status=rejected, reservations released, cashWallets intact',
      actual: `NoReason=${rejectNoReason.status}, Valid=${rejectWithReason.status} (status=${rejectWithReason.data?.fxRequest?.status}, cashLeakage=0)`,
      evidence: { rejectNoReason: rejectNoReason.data, rejectWithReason: rejectWithReason.data },
      status: rejectPass ? 'PASSED' : 'FAILED'
    });

    // TEST 12: Clean Reservation Release on CANCEL (Zero Balance Leakage)
    console.log('--- SECTION 12: CLEAN RESERVATION RELEASE ON CANCEL ---');
    const reqTicket4 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: 67000,
      delayWindowSec: 120
    }, bearer(tokenT01));
    const ticket4Id = reqTicket4.data?.fxRequest?.id;

    const preCancelTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preCancelSgd = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;

    const cancelRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket4Id,
      actionType: 'CANCEL'
    }, bearer(tokenOp));

    const postCancelTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postCancelSgd = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;

    const cancelPass = (
      cancelRes.status === 200 &&
      cancelRes.data?.fxRequest?.status === 'cancelled' &&
      postCancelTeam.reservedCash.INR < preCancelTeam.reservedCash.INR &&
      postCancelSgd.reservedInventory < preCancelSgd.reservedInventory &&
      postCancelTeam.cashWallets.INR === preCancelTeam.cashWallets.INR // Zero cash leakage
    );

    recordResult({
      id: 'PHASE-D-CANCEL-LEAKAGE-01',
      title: 'Clean Reservation Release on CANCEL (Zero Balance Leakage)',
      endpoint: 'POST /api/fx/queue-action (CANCEL)',
      role: 'exchange',
      scenario: 'Ticket cancellation releases reservations cleanly with zero balance leakage',
      expected: 'HTTP 200 status=cancelled, client unreserved cash and desk inventory fully restored',
      actual: `HTTP ${cancelRes.status}: status=${cancelRes.data?.fxRequest?.status}, cashLeakage=0`,
      evidence: { cancelRes: cancelRes.data },
      status: cancelPass ? 'PASSED' : 'FAILED'
    });

    // TEST 13: Clean Reservation Release on EXPIRE (Zero Balance Leakage)
    console.log('--- SECTION 13: CLEAN RESERVATION RELEASE ON EXPIRE ---');
    const reqTicket5 = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'AED',
      fromAmount: 50000,
      delayWindowSec: 120
    }, bearer(tokenT01));
    const ticket5Id = reqTicket5.data?.fxRequest?.id;

    const preExpireTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preExpireAed = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.AED;

    const expireRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket5Id,
      actionType: 'EXPIRE'
    }, bearer(tokenOp));

    const postExpireTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postExpireAed = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.AED;

    const expirePass = (
      expireRes.status === 200 &&
      expireRes.data?.fxRequest?.status === 'expired' &&
      postExpireTeam.reservedCash.INR < preExpireTeam.reservedCash.INR &&
      postExpireAed.reservedInventory < preExpireAed.reservedInventory &&
      postExpireTeam.cashWallets.INR === preExpireTeam.cashWallets.INR // Zero cash leakage
    );

    recordResult({
      id: 'PHASE-D-EXPIRE-LEAKAGE-01',
      title: 'Clean Reservation Release on EXPIRE (Zero Balance Leakage)',
      endpoint: 'POST /api/fx/queue-action (EXPIRE)',
      role: 'exchange',
      scenario: 'Expired ticket releases reservations cleanly without leaving stranded or duplicated funds',
      expected: 'HTTP 200 status=expired, client cash and desk inventory restored with zero leakage',
      actual: `HTTP ${expireRes.status}: status=${expireRes.data?.fxRequest?.status}, cashLeakage=0`,
      evidence: { expireRes: expireRes.data },
      status: expirePass ? 'PASSED' : 'FAILED'
    });

    // TEST 14: Atomic Settlement & Double-Entry Accounting Ledger
    console.log('--- SECTION 14: ATOMIC QUEUE SETTLEMENT (APPROVE) ---');
    // Settle ticket 1 (which was on_hold) using APPROVE
    const preSettleTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preSettleUsd = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.USD;

    const approveRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'APPROVE'
    }, bearer(tokenOp));

    const postSettleTeam = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postSettleUsd = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.USD;

    // Verify terminal status protection: attempting second action on approved ticket returns HTTP 400
    const doubleApproveRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: ticket1Id,
      actionType: 'APPROVE'
    }, bearer(tokenOp));

    const inrDebited = (preSettleTeam?.cashWallets?.INR || 0) - (postSettleTeam?.cashWallets?.INR || 0);
    const usdCredited = (postSettleTeam?.cashWallets?.USD || 0) - (preSettleTeam?.cashWallets?.USD || 0);

    const reservedInrReleased = (preSettleTeam?.reservedCash?.INR || 0) - (postSettleTeam?.reservedCash?.INR || 0);

    const reservedUsdReleased = (preSettleUsd?.reservedInventory || 0) - (postSettleUsd?.reservedInventory || 0);

    const approvePass = (
      approveRes.status === 200 &&
      approveRes.data?.fxRequest?.status === 'approved' &&
      inrDebited === reqAmountInr &&
      usdCredited > 0 &&
      reservedInrReleased === reqAmountInr &&
      Math.abs(reservedUsdReleased - (approveRes.data?.fxRequest?.toAmount || 0)) < 0.05 &&
      doubleApproveRes.status === 400
    );

    recordResult({
      id: 'PHASE-D-APPROVE-SETTLE-01',
      title: 'Atomic Settlement (APPROVE) & Terminal Status Guard',
      endpoint: 'POST /api/fx/queue-action (APPROVE)',
      role: 'exchange',
      scenario: 'Execute conversion settlement; verify source debit, destination credit, reserve update, and terminal status guard',
      expected: 'HTTP 200 status=approved, client INR debited, USD credited, double settlement blocked (HTTP 400)',
      actual: `HTTP ${approveRes.status}: status=${approveRes.data?.fxRequest?.status}, inrDebited=${inrDebited}, usdCredited=${usdCredited}, doubleSettleBlocked=${doubleApproveRes.status === 400}`,
      evidence: { approveRes: approveRes.data, inrDebited, usdCredited, doubleStatus: doubleApproveRes.status },
      status: approvePass ? 'PASSED' : 'FAILED'
    });

    // TEST 15: Desk Reserve Exhaustion & Negative Inventory Guard
    console.log('--- SECTION 15: DESK RESERVE EXHAUSTION PROTECTION ---');
    const massiveReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 50000000000, // Massive conversion exceeding entire desk reserve pool
      delayWindowSec: 120
    }, bearer(tokenT01));

    const postMassiveReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.USD;
    const exhaustPass = (
      massiveReq.status === 400 &&
      postMassiveReserves.availableReserve >= 0 &&
      postMassiveReserves.currentInventory >= 0
    );

    recordResult({
      id: 'PHASE-D-RESERVE-EXHAUST-01',
      title: 'Desk Reserve Exhaustion & Negative Inventory Guard',
      endpoint: 'POST /api/fx/request',
      role: 'team',
      scenario: 'Attempt conversion exceeding desk reserve pool; verify HTTP 400 rejection and zero negative inventory',
      expected: 'HTTP 400 rejection preventing desk reserves from dipping below zero',
      actual: `HTTP ${massiveReq.status}: error="${massiveReq.data?.error}", USD available=${postMassiveReserves.availableReserve}`,
      evidence: { error: massiveReq.data?.error, usdReserve: postMassiveReserves },
      status: exhaustPass ? 'PASSED' : 'FAILED'
    });

    // TEST 16: Post-Flight Authoritative State Baseline Hash Integrity
    console.log('--- SECTION 16: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after test suite: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER TESTING!');
    console.log('✓ Authoritative state.json confirmed bit-for-bit untouched.\n');

    recordResult({
      id: 'PHASE-D-POSTFLIGHT-01',
      title: 'Post-flight Authoritative Baseline Hash Verification',
      endpoint: 'Local File System (state.json)',
      role: 'system',
      scenario: 'Confirm authoritative state.json was 100% bit-for-bit untouched throughout all test executions',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP
    console.log('--- CLEANING UP TEST BACKEND PROCESS ---');
    serverProcess.kill('SIGTERM');
    try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    closePool().catch(() => {});
    console.log('✓ Isolated test backend stopped.');
    console.log('✓ Removed disposable fixture file.\n');
  }

  // SUMMARY
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('======================================================================');
  console.log(`📊 PHASE D TEST SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Test results saved to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhaseDFxQueueSuite().catch(err => {
  console.error('Fatal Phase D suite error:', err);
  process.exit(1);
});
