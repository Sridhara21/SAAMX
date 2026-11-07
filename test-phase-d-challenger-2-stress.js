import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';
import {
  CURRENCY_DIRECTORY,
  ACTIVE_CURRENCIES,
  ACTIVE_FOREIGN_CURRENCIES,
  formatCurrency,
  roundCurrency
} from './src/lib/formatters.js';
import { getScarcityPricingMetrics, calculateFxConversion } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3195;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-d-challenger-2.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-phase-d-challenger-2-results.json');

const testResults = [];

function recordResult({ id, title, section, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, section, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Section:   ${section}`);
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

async function runChallenger2StressSuite() {
  console.log('======================================================================');
  console.log('⚔️  SAAMX PHASE D CHALLENGER 2: EMPIRICAL STRESS & INVARIANT HARNESS');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- PRE-FLIGHT: BASELINE STATE HASH VERIFICATION ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Baseline state.json hash verified bit-exact.\n');

  recordResult({
    id: 'CHALLENGER-2-PREFLIGHT',
    title: 'Baseline state.json SHA-256 Pre-flight Verification',
    section: 'Preflight',
    scenario: 'Confirm authoritative state.json matches baseline hash before tests',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: FIXTURE SETUP
  console.log('--- FIXTURE SETUP: CREATING DISPOSABLE TEST SNAPSHOT ---');
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

  // Seed test teams with abundant multi-currency funds for stress testing
  for (const teamCode of ['T01', 'T02', 'T03']) {
    const t = (fixture.teams || []).find(tm => tm.teamCode === teamCode);
    if (t) {
      t.cashWallets = {
        INR: 500000000,
        USD: 1000000,
        GBP: 1000000,
        EUR: 1000000,
        JPY: 50000000,
        AED: 2000000,
        SGD: 1000000,
        CNY: 5000000,
        AUD: 1000000,
        KRW: 500000000
      };
      t.reservedCash = {
        INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
      };
    }
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Disposable test snapshot created: ${DISPOSABLE_STATE}\n`);

  // STEP 3: SPAWN ISOLATED BACKEND SERVER
  console.log(`--- SPAWNING ISOLATED SERVER ON PORT ${PORT} ---`);
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
        console.log(`✓ Isolated backend active on port ${PORT}.\n`);
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
    // Authenticate roles
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    const tokenT02 = loginT02.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginOp = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenOp = loginOp.data?.token;

    assert.ok(tokenT01 && tokenT02 && tokenAdmin && tokenOp, 'Failed to acquire authentication tokens');
    console.log('✓ Authentication successful for T01, T02, Admin, Exchange Operator.\n');

    // =========================================================================
    // BATTERY 1: SCARCITY PRICING CURVE MATHEMATICAL & BOUNDARY VERIFICATION
    // =========================================================================
    console.log('======================================================================');
    console.log('🧪 BATTERY 1: SCARCITY PRICING CURVE VERIFICATION');
    console.log('======================================================================');

    // 1.1 Discrete utilization level testing across specified vector: [0.0, 0.25, 0.50, 0.75, 0.90, 0.99, 1.00]
    const uTargets = [0.0, 0.25, 0.50, 0.75, 0.90, 0.99, 1.00];
    const discreteResults = [];
    let discreteAllPass = true;

    for (const u of uTargets) {
      // Create a mock reserve with openingReserve = 10,000,000 and availableReserve = (1 - u) * 10,000,000
      const poolCap = 10000000;
      const avail = Math.round((1 - u) * poolCap);
      const mockReserves = {
        USD: {
          currency: 'USD',
          openingReserve: poolCap,
          replenishments: 0,
          completedPurchases: 0,
          completedSales: 0,
          reservedInventory: 0,
          currentInventory: avail,
          availableReserve: avail
        }
      };

      const metrics = getScarcityPricingMetrics('USD', mockReserves);
      const spread = metrics.spreadPercent;

      // Assertions based on mathematical specification:
      // Base spread = 0.45% for u <= 0.50
      // Ceiling = strictly 25.00% at u = 1.00
      // Bounded in [0.45, 25.00]
      let pass = true;
      let expectedDesc = '';

      if (u <= 0.50) {
        expectedDesc = 'spread = 0.45%';
        if (spread !== 0.45) pass = false;
      } else if (u === 1.00) {
        expectedDesc = 'spread = 25.00%';
        if (spread !== 25.00) pass = false;
      } else {
        const x = (u - 0.50) / 0.50;
        const expectedSpread = parseFloat((0.45 + (25.00 - 0.45) * x).toFixed(4));
        expectedDesc = `spread ≈ ${expectedSpread}%`;
        if (Math.abs(spread - expectedSpread) > 0.01) pass = false;
      }

      if (spread < 0.45 || spread > 25.00) pass = false;
      if (!pass) discreteAllPass = false;

      discreteResults.push({
        u,
        avail,
        spread,
        midRateMultiplier: metrics.midRateMultiplier,
        scarcityImpact: metrics.scarcityImpact,
        pass
      });
    }

    recordResult({
      id: 'CHALLENGER-2-SCARCITY-DISCRETE',
      title: 'Scarcity Pricing Curve at Specified Utilization Levels [0.0, 0.25, 0.50, 0.75, 0.90, 0.99, 1.00]',
      section: 'Scarcity Pricing',
      scenario: 'Verify spread stays at 0.45% for u <= 0.50, reaches 25.00% at u = 1.00, and is strictly bounded',
      expected: 'u <= 0.50 -> 0.45%, u = 0.75 -> 12.725%, u = 0.90 -> 20.09%, u = 0.99 -> 24.509%, u = 1.00 -> 25.00%',
      actual: JSON.stringify(discreteResults.map(r => ({ u: r.u, spread: `${r.spread}%`, pass: r.pass }))),
      evidence: discreteResults,
      status: discreteAllPass ? 'PASSED' : 'FAILED'
    });

    // 1.2 Continuous Sweep Across 1,000 Points & Boundary Extrema Clamping
    let continuousAllPass = true;
    let minObservedSpread = Infinity;
    let maxObservedSpread = -Infinity;
    let violations = [];
    let prevSpread = 0;

    for (let i = 0; i <= 1000; i++) {
      const u = i / 1000.0;
      const poolCap = 10000000;
      const avail = Math.round((1.0 - u) * poolCap);
      const mockReserves = {
        EUR: {
          currency: 'EUR',
          openingReserve: poolCap,
          replenishments: 0,
          completedPurchases: 0,
          completedSales: 0,
          reservedInventory: 0,
          currentInventory: avail,
          availableReserve: avail
        }
      };

      const metrics = getScarcityPricingMetrics('EUR', mockReserves);
      const spread = metrics.spreadPercent;

      if (spread < minObservedSpread) minObservedSpread = spread;
      if (spread > maxObservedSpread) maxObservedSpread = spread;

      // Invariants:
      // 1. Never below 0.45%
      if (spread < 0.45) {
        continuousAllPass = false;
        violations.push({ u, spread, reason: 'Spread fell below base 0.45%' });
      }
      // 2. Never exceeds 25.00%
      if (spread > 25.00) {
        continuousAllPass = false;
        violations.push({ u, spread, reason: 'Spread exceeded ceiling 25.00%' });
      }
      // 3. For u <= 0.50, strictly 0.45%
      if (u <= 0.50 && spread !== 0.45) {
        continuousAllPass = false;
        violations.push({ u, spread, reason: 'Spread not 0.45% when u <= 0.50' });
      }
      // 4. Monotonic non-decreasing
      if (i > 0 && spread < prevSpread) {
        continuousAllPass = false;
        violations.push({ u, spread, prevSpread, reason: 'Spread decreased as utilization increased (non-monotonic)' });
      }
      prevSpread = spread;
    }

    // Boundary stress: u < 0 (avail > poolCap) and u > 1 (avail < 0)
    const overCapacityReserves = {
      GBP: { currency: 'GBP', openingReserve: 10000000, availableReserve: 15000000, currentInventory: 15000000, reservedInventory: 0 }
    };
    const metricsOver = getScarcityPricingMetrics('GBP', overCapacityReserves);

    const negativeReserves = {
      GBP: { currency: 'GBP', openingReserve: 10000000, availableReserve: -5000, currentInventory: 0, reservedInventory: 5000 }
    };
    const metricsNegative = getScarcityPricingMetrics('GBP', negativeReserves);

    const boundaryPass = (metricsOver.spreadPercent === 0.45) && (metricsNegative.spreadPercent === 25.00);
    if (!boundaryPass) continuousAllPass = false;

    recordResult({
      id: 'CHALLENGER-2-SCARCITY-CONTINUOUS-1000',
      title: 'Scarcity Pricing Continuous 1,000-Point Sweep & Clamping Boundary Stress',
      section: 'Scarcity Pricing',
      scenario: 'Sweep 1,000 points u in [0, 1] + test u < 0 and u > 1; verify monotonic bounds [0.45%, 25.00%]',
      expected: 'Min spread = 0.45%, Max spread = 25.00%, monotonic non-decreasing, clamped at boundaries',
      actual: `Min observed: ${minObservedSpread}%, Max observed: ${maxObservedSpread}%, Boundary over: ${metricsOver.spreadPercent}%, Boundary neg: ${metricsNegative.spreadPercent}%, Violations: ${violations.length}`,
      evidence: { minObservedSpread, maxObservedSpread, metricsOver, metricsNegative, violationCount: violations.length },
      status: (continuousAllPass && boundaryPass) ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 2: FINITE RESERVE SOLVENCY INVARIANT (A + Res = I) ACROSS ALL 9
    // =========================================================================
    console.log('\n======================================================================');
    console.log('🧪 BATTERY 2: FINITE RESERVE SOLVENCY INVARIANT (A + Res = I) ACROSS 9 CURRENCIES');
    console.log('======================================================================');

    const currencies9 = ['USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];

    // 2.1 Baseline Invariant Verification Across All 9 Foreign Currencies
    const initialResResp = await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01));
    const initialReserves = initialResResp.data?.reserves || {};

    let initialSolvencyAllPass = true;
    const initialSolvencyEvidence = {};

    for (const cur of currencies9) {
      const r = initialReserves[cur];
      assert.ok(r, `Reserve for ${cur} not found in state!`);
      const A = Number(r.availableReserve ?? 0);
      const Res = Number(r.reservedInventory ?? 0);
      const I = Number(r.currentInventory ?? 0);
      const diff = Math.abs((A + Res) - I);
      const pass = diff < 0.0001 && A >= 0 && Res >= 0 && I >= 0;
      if (!pass) initialSolvencyAllPass = false;
      initialSolvencyEvidence[cur] = { A, Res, I, diff, pass };
    }

    recordResult({
      id: 'CHALLENGER-2-SOLVENCY-BASELINE-9',
      title: 'Baseline Solvency Invariant A + Res = I Across All 9 Currencies',
      section: 'Reserve Solvency',
      scenario: 'Inspect initial reserves for all 9 foreign currencies to verify A + Res = I',
      expected: 'Diff < 0.0001 with A >= 0, Res >= 0, I >= 0 for all 9 currencies',
      actual: `All 9 passed: ${initialSolvencyAllPass}`,
      evidence: initialSolvencyEvidence,
      status: initialSolvencyAllPass ? 'PASSED' : 'FAILED'
    });

    // 2.2 Deep Lifecycle Stress: Interleaved Holds, Cancellations, and Settlements on All 9 Currencies
    console.log('--- Executing Lifecycle Stress (Request -> Hold -> Cancel -> Settle) Across All 9 Currencies ---');
    let lifecycleStressAllPass = true;
    const lifecycleEvidence = {};

    for (const cur of currencies9) {
      // 1. Submit Request 1 (INR -> cur)
      const reqAmount1 = cur === 'JPY' || cur === 'KRW' ? 500000 : 100000;
      const r1Resp = await apiRequest('POST', '/api/fx/request', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount: reqAmount1,
        delayWindowSec: 60,
        notes: `Stress test req 1 for ${cur}`
      }, bearer(tokenT01));

      assert.strictEqual(r1Resp.status, 200, `Request 1 for ${cur} failed: ${JSON.stringify(r1Resp.data)}`);
      const item1 = r1Resp.data?.fxRequest;

      // Check reserves after Request 1
      const resPostR1 = (await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01))).data?.reserves?.[cur];
      const diffPostR1 = Math.abs((resPostR1.availableReserve + resPostR1.reservedInventory) - resPostR1.currentInventory);
      const r1Pass = diffPostR1 < 0.0001 && resPostR1.reservedInventory >= item1.toAmount;

      // 2. Submit Request 2 (INR -> cur)
      const reqAmount2 = cur === 'JPY' || cur === 'KRW' ? 250000 : 50000;
      const r2Resp = await apiRequest('POST', '/api/fx/request', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount: reqAmount2,
        delayWindowSec: 60,
        notes: `Stress test req 2 for ${cur}`
      }, bearer(tokenT01));

      assert.strictEqual(r2Resp.status, 200, `Request 2 for ${cur} failed: ${JSON.stringify(r2Resp.data)}`);
      const item2 = r2Resp.data?.fxRequest;

      // Check reserves after Request 2
      const resPostR2 = (await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01))).data?.reserves?.[cur];
      const diffPostR2 = Math.abs((resPostR2.availableReserve + resPostR2.reservedInventory) - resPostR2.currentInventory);
      const r2Pass = diffPostR2 < 0.0001;

      // 3. Place Request 1 on HOLD with reason
      const holdResp = await apiRequest('POST', '/api/fx/queue-action', {
        requestId: item1.id,
        actionType: 'HOLD',
        holdReason: `KYC verification required for ${cur} allocation`
      }, bearer(tokenOp));
      assert.strictEqual(holdResp.status, 200, `Hold for ${cur} failed: ${JSON.stringify(holdResp.data)}`);

      const resPostHold = (await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01))).data?.reserves?.[cur];
      const diffPostHold = Math.abs((resPostHold.availableReserve + resPostHold.reservedInventory) - resPostHold.currentInventory);
      const holdPass = diffPostHold < 0.0001 && resPostHold.reservedInventory >= item1.toAmount;

      // 4. Cancel Request 2 (Verify partial cancellation releases reservation with zero balance leakage)
      const cancelResp = await apiRequest('POST', '/api/fx/queue-action', {
        requestId: item2.id,
        actionType: 'CANCEL',
        reason: 'Participant requested cancellation'
      }, bearer(tokenOp));
      assert.strictEqual(cancelResp.status, 200, `Cancel for ${cur} failed: ${JSON.stringify(cancelResp.data)}`);

      const resPostCancel = (await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01))).data?.reserves?.[cur];
      const diffPostCancel = Math.abs((resPostCancel.availableReserve + resPostCancel.reservedInventory) - resPostCancel.currentInventory);
      const cancelPass = diffPostCancel < 0.0001;

      // 5. Approve Request 1 from HOLD
      const approveResp = await apiRequest('POST', '/api/fx/queue-action', {
        requestId: item1.id,
        actionType: 'APPROVE'
      }, bearer(tokenOp));
      assert.strictEqual(approveResp.status, 200, `Approve for ${cur} failed: ${JSON.stringify(approveResp.data)}`);

      const resPostApprove = (await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01))).data?.reserves?.[cur];
      const diffPostApprove = Math.abs((resPostApprove.availableReserve + resPostApprove.reservedInventory) - resPostApprove.currentInventory);
      const approvePass = diffPostApprove < 0.0001;

      const currencyPass = r1Pass && r2Pass && holdPass && cancelPass && approvePass;
      if (!currencyPass) lifecycleStressAllPass = false;

      lifecycleEvidence[cur] = {
        r1Pass,
        r2Pass,
        holdPass,
        cancelPass,
        approvePass,
        finalReserve: resPostApprove,
        diffFinal: diffPostApprove
      };
    }

    recordResult({
      id: 'CHALLENGER-2-SOLVENCY-LIFECYCLE-9',
      title: 'Lifecycle Stress (Request, Hold, Cancel, Settle) Across All 9 Currencies',
      section: 'Reserve Solvency',
      scenario: 'Execute full request -> hold -> cancel -> settle sequence across all 9 currencies; check A + Res = I at every step',
      expected: 'A + Res = I strictly maintained at all 5 lifecycle steps across all 9 currencies',
      actual: `All 9 currencies passed: ${lifecycleStressAllPass}`,
      evidence: lifecycleEvidence,
      status: lifecycleStressAllPass ? 'PASSED' : 'FAILED'
    });

    // 2.3 Massive Concurrent Conversion Storm & Terminal Status Invariant
    console.log('--- Executing Massive 45-Conversion Multi-Currency Storm ---');
    const stormRequests = [];
    // Submit 45 requests across all 9 currencies (5 each)
    for (let i = 0; i < 45; i++) {
      const cur = currencies9[i % 9];
      const amt = (cur === 'JPY' || cur === 'KRW') ? 10000 : 5000;
      const effectiveTeam = i % 2 === 0 ? 'T01' : 'T02';
      const effectiveToken = i % 2 === 0 ? tokenT01 : tokenT02;
      const resp = await apiRequest('POST', '/api/fx/request', {
        teamCode: effectiveTeam,
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount: amt,
        delayWindowSec: 60,
        notes: `Storm test req ${i} for ${cur}`
      }, bearer(effectiveToken));

      assert.strictEqual(resp.status, 200, `Storm req ${i} failed: ${JSON.stringify(resp.data)}`);
      stormRequests.push({ id: resp.data?.fxRequest?.id, cur, toAmount: resp.data?.fxRequest?.toAmount, index: i });
    }

    // Now execute actions across the 45 requests:
    // First 18: Approve
    // Next 9: Hold then Reject
    // Next 9: Return for correction
    // Last 9: Cancel
    for (let i = 0; i < stormRequests.length; i++) {
      const reqItem = stormRequests[i];
      if (i < 18) {
        // Approve (with retry for transient PostgreSQL row lock / deadlock contention)
        let r;
        for (let attempt = 0; attempt < 5; attempt++) {
          r = await apiRequest('POST', '/api/fx/queue-action', {
            requestId: reqItem.id,
            actionType: 'APPROVE'
          }, bearer(tokenOp));
          if (r.status === 200) break;
          await new Promise(res => setTimeout(res, 200 * (attempt + 1)));
        }
        assert.strictEqual(r.status, 200, `Approve failed for ${reqItem.id}: ${JSON.stringify(r.data)}`);
      } else if (i < 27) {
        // Hold then Reject
        await apiRequest('POST', '/api/fx/queue-action', {
          requestId: reqItem.id,
          actionType: 'HOLD',
          holdReason: 'Regulatory compliance investigation'
        }, bearer(tokenOp));

        const r = await apiRequest('POST', '/api/fx/queue-action', {
          requestId: reqItem.id,
          actionType: 'REJECT',
          reason: 'Regulatory compliance sanction check failed'
        }, bearer(tokenOp));
        assert.strictEqual(r.status, 200);
      } else if (i < 36) {
        // Return for correction
        const r = await apiRequest('POST', '/api/fx/queue-action', {
          requestId: reqItem.id,
          actionType: 'RETURN_FOR_CORRECTION',
          reason: 'Incorrect trading purpose declared by team'
        }, bearer(tokenOp));
        assert.strictEqual(r.status, 200);
      } else {
        // Cancel
        const r = await apiRequest('POST', '/api/fx/queue-action', {
          requestId: reqItem.id,
          actionType: 'CANCEL',
          reason: 'Cancelled by operator during queue cleanup'
        }, bearer(tokenOp));
        assert.strictEqual(r.status, 200);
      }
    }

    // Now query final reserves for all 9 currencies
    const finalReservesResp = await apiRequest('GET', '/api/fx/reserves', null, bearer(tokenT01));
    const finalReserves = finalReservesResp.data?.reserves || {};

    let stormSolvencyAllPass = true;
    const stormSolvencyEvidence = {};

    for (const cur of currencies9) {
      const r = finalReserves[cur];
      const A = Number(r.availableReserve ?? 0);
      const Res = Number(r.reservedInventory ?? 0);
      const I = Number(r.currentInventory ?? 0);
      const diff = Math.abs((A + Res) - I);
      const pass = diff < 0.0001 && A >= 0 && Res >= 0 && I >= 0;
      if (!pass) stormSolvencyAllPass = false;
      stormSolvencyEvidence[cur] = { A, Res, I, diff, pass };
    }

    recordResult({
      id: 'CHALLENGER-2-SOLVENCY-STORM-45',
      title: 'Solvency Invariant After 45-Conversion Multi-Currency Storm',
      section: 'Reserve Solvency',
      scenario: 'Dispatch 45 rapid conversions with interleaved Approvals, Rejections, Corrections, and Cancellations',
      expected: 'A + Res = I strictly holds for all 9 currencies with zero leakage',
      actual: `All 9 currencies passed: ${stormSolvencyAllPass}`,
      evidence: stormSolvencyEvidence,
      status: stormSolvencyAllPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 3: LEGACY CURRENCY ISOLATION (CAD & CHF) STRESS TEST
    // =========================================================================
    console.log('\n======================================================================');
    console.log('🧪 BATTERY 3: LEGACY CURRENCY ISOLATION (CAD & CHF) STRESS TEST');
    console.log('======================================================================');

    const legacyPayloads = [
      // Direct CAD/CHF on /api/fx/request
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Request from CAD to INR' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', fromAmount: 50000 }, desc: 'Request from INR to CAD' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Request from CHF to INR' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CHF', fromAmount: 50000 }, desc: 'Request from INR to CHF' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'CHF', fromAmount: 1000 }, desc: 'Request cross CAD to CHF' },
      // Direct CAD/CHF on /api/fx/exchange
      { endpoint: '/api/fx/exchange', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Exchange from CAD to INR' },
      { endpoint: '/api/fx/exchange', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', fromAmount: 50000 }, desc: 'Exchange from INR to CAD' },
      { endpoint: '/api/fx/exchange', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Exchange from CHF to INR' },
      { endpoint: '/api/fx/exchange', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CHF', fromAmount: 50000 }, desc: 'Exchange from INR to CHF' },
      // Direct CAD/CHF on /api/fx/convert
      { endpoint: '/api/fx/convert', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', amount: 1000 }, desc: 'Convert from CAD to INR' },
      { endpoint: '/api/fx/convert', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', amount: 50000 }, desc: 'Convert from INR to CAD' },
      { endpoint: '/api/fx/convert', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'INR', amount: 1000 }, desc: 'Convert from CHF to INR' },
      { endpoint: '/api/fx/convert', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CHF', amount: 50000 }, desc: 'Convert from INR to CHF' },
      // Payload encoding / case mutations
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'cad', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Lowercase cad request' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'chf', fromAmount: 1000 }, desc: 'Lowercase chf request' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'Cad', toCurrency: 'USD', fromAmount: 1000 }, desc: 'Mixed-case Cad request' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: ' CAD ', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Whitespace padded CAD' },
      { endpoint: '/api/fx/request', method: 'POST', body: { teamCode: 'T01', fromCurrency: 'CHF\0', toCurrency: 'INR', fromAmount: 1000 }, desc: 'Null-byte terminated CHF' },
      // Replenish attempts for CAD/CHF
      { endpoint: '/api/fx/replenish', method: 'POST', body: { currency: 'CAD', quantity: 50000, reason: 'Trying to replenish legacy CAD' }, desc: 'Replenish legacy CAD' },
      { endpoint: '/api/fx/replenish', method: 'POST', body: { currency: 'CHF', quantity: 50000, reason: 'Trying to replenish legacy CHF' }, desc: 'Replenish legacy CHF' }
    ];

    let legacyAllRejected = true;
    const legacyEvidence = [];

    for (const testCase of legacyPayloads) {
      let token = tokenOp;
      if (testCase.endpoint === '/api/fx/request') token = tokenT01;
      else if (testCase.endpoint === '/api/fx/replenish') token = tokenAdmin;
      const resp = await apiRequest(testCase.method, testCase.endpoint, testCase.body, bearer(token));
      const isRejected = resp.status === 400;
      if (!isRejected) legacyAllRejected = false;
      legacyEvidence.push({
        desc: testCase.desc,
        endpoint: testCase.endpoint,
        status: resp.status,
        error: resp.data?.error,
        rejectedAsExpected: isRejected
      });
    }

    recordResult({
      id: 'CHALLENGER-2-LEGACY-ISOLATION-STRESS',
      title: 'Legacy Currency (CAD/CHF) Isolation Across Endpoints & Payload Variations',
      section: 'Legacy Isolation',
      scenario: 'Submit 20 diverse CAD/CHF payloads across /request, /exchange, /convert, /replenish',
      expected: '100% rejection with HTTP 400 (20/20 rejected)',
      actual: `${legacyEvidence.filter(e => e.rejectedAsExpected).length}/${legacyEvidence.length} rejected with HTTP 400`,
      evidence: legacyEvidence,
      status: legacyAllRejected ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 4: INTEGER ROUNDING FOR JPY AND KRW INVARIANT VERIFICATION
    // =========================================================================
    console.log('\n======================================================================');
    console.log('🧪 BATTERY 4: INTEGER ROUNDING FOR JPY AND KRW INVARIANT VERIFICATION');
    console.log('======================================================================');

    // 4.1 Unit Test Engine: 1,000 Randomized Conversions into JPY and KRW
    let integerUnitAllPass = true;
    let nonIntegerCount = 0;
    const sampleIntegerConversions = [];

    for (let i = 0; i < 1000; i++) {
      // Generate randomized INR amount with float precision (e.g. 12.34 to 9876543.21)
      const randomInr = parseFloat((Math.random() * 5000000 + 1).toFixed(4));
      
      // Calculate conversion into JPY
      const convJPY = calculateFxConversion('INR', 'JPY', randomInr);
      if (!Number.isInteger(convJPY.toAmount)) {
        integerUnitAllPass = false;
        nonIntegerCount++;
      }

      // Calculate conversion into KRW
      const convKRW = calculateFxConversion('INR', 'KRW', randomInr);
      if (!Number.isInteger(convKRW.toAmount)) {
        integerUnitAllPass = false;
        nonIntegerCount++;
      }

      // Cross-currency conversion: USD -> JPY, EUR -> KRW
      const randomForeign = parseFloat((Math.random() * 50000 + 1).toFixed(2));
      const convUSD_JPY = calculateFxConversion('USD', 'JPY', randomForeign);
      if (!Number.isInteger(convUSD_JPY.toAmount)) {
        integerUnitAllPass = false;
        nonIntegerCount++;
      }

      const convEUR_KRW = calculateFxConversion('EUR', 'KRW', randomForeign);
      if (!Number.isInteger(convEUR_KRW.toAmount)) {
        integerUnitAllPass = false;
        nonIntegerCount++;
      }

      if (i < 5) {
        sampleIntegerConversions.push({
          randomInr,
          jpyToAmount: convJPY.toAmount,
          isJPYInteger: Number.isInteger(convJPY.toAmount),
          krwToAmount: convKRW.toAmount,
          isKRWInteger: Number.isInteger(convKRW.toAmount),
          convUSD_JPY: convUSD_JPY.toAmount,
          convEUR_KRW: convEUR_KRW.toAmount
        });
      }
    }

    recordResult({
      id: 'CHALLENGER-2-INTEGER-ROUNDING-4000-VECTORS',
      title: 'Integer Rounding Invariant: 4,000 Randomized JPY and KRW Conversion Vectors',
      section: 'Integer Precision',
      scenario: 'Test 4,000 randomized conversions (INR->JPY, INR->KRW, USD->JPY, EUR->KRW); assert Number.isInteger === true',
      expected: '100% of conversion outputs strictly whole integers (0 non-integer outputs)',
      actual: `Non-integer outputs: ${nonIntegerCount}`,
      evidence: { testedVectors: 4000, nonIntegerCount, sampleIntegerConversions },
      status: integerUnitAllPass ? 'PASSED' : 'FAILED'
    });

    // 4.2 Live API Conversions: Verify Settled Balances and Queue Requests for JPY & KRW
    console.log('--- Live API Execution of Randomized JPY and KRW Conversions ---');
    let liveIntegerAllPass = true;
    const liveIntegerEvidence = [];

    for (let i = 0; i < 10; i++) {
      const cur = i % 2 === 0 ? 'JPY' : 'KRW';
      const randomAmt = parseFloat((Math.random() * 50000 + 1000).toFixed(2));

      // Direct convert via /api/fx/convert
      const convResp = await apiRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        amount: randomAmt
      }, bearer(tokenOp));

      assert.strictEqual(convResp.status, 200, `Live convert to ${cur} failed`);
      const toAmount = convResp.data?.toAmount ?? convResp.data?.credited;
      const isInteger = Number.isInteger(toAmount);
      if (!isInteger) liveIntegerAllPass = false;

      // Queue request and settlement via /api/fx/request and /api/fx/queue-action
      const reqResp = await apiRequest('POST', '/api/fx/request', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: cur,
        fromAmount: randomAmt,
        delayWindowSec: 60,
        notes: `Integer check ${i} for ${cur}`
      }, bearer(tokenT01));

      assert.strictEqual(reqResp.status, 200);
      const reqToAmount = reqResp.data?.fxRequest?.toAmount;
      const isReqInteger = Number.isInteger(reqToAmount);
      if (!isReqInteger) liveIntegerAllPass = false;

      const approveResp = await apiRequest('POST', '/api/fx/queue-action', {
        requestId: reqResp.data?.fxRequest?.id,
        actionType: 'APPROVE'
      }, bearer(tokenOp));

      assert.strictEqual(approveResp.status, 200);
      const settledWalletBal = approveResp.data?.cashWallets?.[cur];
      const isWalletInteger = Number.isInteger(settledWalletBal);
      if (!isWalletInteger) liveIntegerAllPass = false;

      liveIntegerEvidence.push({
        cur,
        randomInrAmt: randomAmt,
        toAmount,
        isInteger,
        reqToAmount,
        isReqInteger,
        settledWalletBal,
        isWalletInteger
      });
    }

    recordResult({
      id: 'CHALLENGER-2-INTEGER-LIVE-API',
      title: 'Live API JPY & KRW Conversion and Settled Wallet Balance Integer Verification',
      section: 'Integer Precision',
      scenario: 'Execute 10 live API conversions and queue settlements; verify all toAmounts and resulting wallet balances are whole integers',
      expected: 'Number.isInteger === true across all API outputs and settled wallet balances',
      actual: `All live JPY/KRW integer checks passed: ${liveIntegerAllPass}`,
      evidence: liveIntegerEvidence,
      status: liveIntegerAllPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // STEP 6: POST-FLIGHT AUTHORITATIVE STATE BASELINE HASH CHECK
    // =========================================================================
    console.log('\n--- POST-FLIGHT: AUTHORITATIVE BASELINE HASH VERIFICATION ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after stress tests: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER STRESS TESTS!');
    console.log('✓ Baseline state.json hash verified strictly untouched.\n');

    recordResult({
      id: 'CHALLENGER-2-POSTFLIGHT',
      title: 'Post-flight Authoritative Baseline Hash Verification',
      section: 'Postflight',
      scenario: 'Confirm authoritative state.json was 100% bit-for-bit untouched throughout all stress tests',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP
    console.log('--- CLEANING UP ISOLATED TEST SERVER PROCESS ---');
    serverProcess.kill('SIGTERM');
    try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    console.log('✓ Isolated test backend terminated.');
    console.log('✓ Removed disposable test fixture.\n');
  }

  // SUMMARY & REPORT
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('======================================================================');
  console.log(`📊 CHALLENGER 2 STRESS SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Detailed stress test results saved to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runChallenger2StressSuite().catch(err => {
  console.error('Fatal Challenger 2 suite error:', err);
  process.exit(1);
});
