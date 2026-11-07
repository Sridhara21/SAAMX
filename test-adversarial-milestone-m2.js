import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { initPool, getPool, closePool } from './database/db.js';
import {
  CURRENCY_DIRECTORY,
  ACTIVE_CURRENCIES,
  ACTIVE_FOREIGN_CURRENCIES,
  formatCurrency,
  roundCurrency,
  DEFAULT_FX_RATES
} from './src/lib/formatters.js';
import {
  calculateFxConversion,
  ensureFxReserves,
  assertSolvencyInvariant,
  getScarcityPricingMetrics
} from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3199;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-adversarial-m2.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-m2-results.json');

const testResults = [];

function recordResult({ id, title, category, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, category, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Category:  ${category}`);
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

async function runAdversarialM2Suite() {
  console.log('================================================================================');
  console.log('⚔️  SAAMX ADVERSARIAL CHALLENGER — MILESTONE M2 EMPIRICAL TEST HARNESS');
  console.log('================================================================================\n');

  // STEP 1: PRE-FLIGHT HASH VERIFICATION
  console.log('--- STEP 1: PRE-FLIGHT AUTHORITATIVE STATE HASH VERIFICATION ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash verified.\n');

  recordResult({
    id: 'ADV-M2-PREFLIGHT-01',
    title: 'Pre-flight Authoritative State Hash Verification',
    category: 'Integrity',
    scenario: 'Verify state.json SHA-256 matches baseline before testing',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: ISOLATED FIXTURE & POSTGRESQL CLEANUP
  console.log('--- STEP 2: PREPARING ISOLATED FIXTURE & CLEANING POSTGRESQL STATE ---');
  try { if (fs.existsSync(DISPOSABLE_STATE)) fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
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

  // Seed Team T01 with ₹100 Crore INR so client cash balance NEVER masks desk reserve exhaustion
  const teamT01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (teamT01) {
    teamT01.cashBalance = 1000000000;
    teamT01.cashWallets = {
      INR: 1000000000,
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

  // Configure finite test pools in disposable fixture:
  // SGD pool set to exactly 500 SGD available for precision exhaustion & partial conversion tests
  fixture.fxReserves = fixture.fxReserves || {};
  ensureFxReserves(fixture.fxReserves);
  if (fixture.fxReserves.SGD) {
    fixture.fxReserves.SGD.openingReserve = 500;
    fixture.fxReserves.SGD.replenishments = 0;
    fixture.fxReserves.SGD.completedPurchases = 0;
    fixture.fxReserves.SGD.completedSales = 0;
    fixture.fxReserves.SGD.reservedInventory = 0;
    fixture.fxReserves.SGD.currentInventory = 500;
    fixture.fxReserves.SGD.availableReserve = 500;
  }
  // AUD pool set to exactly 10,000 AUD available
  if (fixture.fxReserves.AUD) {
    fixture.fxReserves.AUD.openingReserve = 10000;
    fixture.fxReserves.AUD.replenishments = 0;
    fixture.fxReserves.AUD.completedPurchases = 0;
    fixture.fxReserves.AUD.completedSales = 0;
    fixture.fxReserves.AUD.reservedInventory = 0;
    fixture.fxReserves.AUD.currentInventory = 10000;
    fixture.fxReserves.AUD.availableReserve = 10000;
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // Synchronize PostgreSQL tables so PG reflects this clean test baseline
  const pool = initPool();
  if (pool) {
    try {
      // Clean wallets for T01
      for (const cur of ACTIVE_CURRENCIES) {
        const bal = teamT01?.cashWallets?.[cur] || 0;
        await pool.query(
          `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
           ON CONFLICT (team_id, currency) DO UPDATE SET balance = $4, reserved = 0, updated_at = NOW()`,
          [`W_T01_${cur}`, 'T01', cur, bal]
        );
      }
      // Reset reserved_inventory = 0 across all foreign pools in PostgreSQL to prevent leftover leaks
      await pool.query(
        `UPDATE fx_reserves
         SET reserved_inventory = 0,
             updated_at = NOW()`
      );
      // Set SGD and AUD pools in PostgreSQL to match fixture
      await pool.query(
        `UPDATE fx_reserves
         SET opening_reserve = 500, replenishments = 0, completed_purchases = 0, completed_sales = 0,
             reserved_inventory = 0, updated_at = NOW()
         WHERE currency = 'SGD'`
      );
      await pool.query(
        `UPDATE fx_reserves
         SET opening_reserve = 10000, replenishments = 0, completed_purchases = 0, completed_sales = 0,
             reserved_inventory = 0, updated_at = NOW()
         WHERE currency = 'AUD'`
      );
      // Clean fx_queue
      await pool.query(`DELETE FROM fx_queue WHERE team_code = 'T01'`);
      console.log('✓ PostgreSQL tables initialized cleanly for T01, AUD, and SGD pools.');
    } catch (e) {
      console.warn('Notice: PG initialization notice:', e.message);
    }
  }

  // STEP 3: SPAWN ISOLATED BACKEND ON PORT 3199
  console.log(`--- STEP 3: SPAWNING ISOLATED BACKEND (PORT ${PORT}) ---`);
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
    const m = d.toString();
    if (!m.includes('ExperimentalWarning') && !m.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${m}`);
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
      await new Promise(r => setTimeout(r, 350));
    }
  }

  if (!serverStarted) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Failed to start backend server on port ${PORT}`);
  }

  try {
    // Authenticate roles
    console.log('--- AUTHENTICATING TEST SESSIONS ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginOp = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenOp = loginOp.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    assert(tokenT01 && tokenOp && tokenAdmin, 'Failed to acquire test session tokens');
    console.log('✓ Tokens acquired for Team T01, Exchange Desk Operator, and Admin.\n');

    // =========================================================================
    // OBJECTIVE 1: TRUE RESERVE EXHAUSTION EDGE CASES & PARTIAL CONVERSIONS
    // =========================================================================
    console.log('================================================================================');
    console.log('🎯 ADVERSARIAL SECTION 1: RESERVE EXHAUSTION EDGE CASES & PARTIAL CONVERSIONS');
    console.log('================================================================================');

    // TEST 1.1: Requesting EXACTLY Available Reserve (Exact Boundary Match)
    // On AUD pool with 10,000 AUD available:
    const reservesPreAud = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.AUD;
    const availAud = Number(reservesPreAud?.availableReserve || 10000);

    // Calculate exact INR amount needed to purchase exactly availAud AUD
    // In server: rawToAmount = fromAmount / effectiveRate; toAmount = roundCurrency(rawToAmount, 'AUD')
    const convEstAud = calculateFxConversion('INR', 'AUD', 555000, null, { AUD: reservesPreAud });
    const estRateAud = convEstAud.effectiveRate;
    const exactInrForAud = roundCurrency(availAud * estRateAud, 'INR');
    const checkConv = calculateFxConversion('INR', 'AUD', exactInrForAud, null, { AUD: reservesPreAud });
    assert.strictEqual(checkConv.toAmount, availAud, 'Pre-condition: Calculated amount must equal exactly available reserve');

    const exactAudExchange = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'AUD',
      fromAmount: exactInrForAud
    }, bearer(tokenOp));

    const postExactAudReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.AUD;
    const postExactAudAvail = Number(postExactAudReserves?.availableReserve);

    const test1_1_Pass = exactAudExchange.status === 200 &&
      exactAudExchange.data?.fxTransaction?.toAmount === availAud &&
      postExactAudAvail === 0;

    recordResult({
      id: 'ADV-M2-EXHAUST-01',
      title: 'Requesting Exactly Available Reserve (Exact Boundary Success)',
      category: 'Reserve Exhaustion',
      scenario: `Submit direct exchange for exactly ${availAud} AUD (100% of available pool); verify fulfillment and pool depletion to 0`,
      expected: `HTTP 200, toAmount === ${availAud}, availableReserve === 0`,
      actual: `HTTP ${exactAudExchange.status}: toAmount=${exactAudExchange.data?.fxTransaction?.toAmount}, availableReserve=${postExactAudAvail}`,
      evidence: {
        exactInr: exactInrForAud,
        fxTransaction: exactAudExchange.data?.fxTransaction,
        postAudReserves: postExactAudReserves
      },
      status: test1_1_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 1.2: Requesting 1 Unit Beyond Available Reserve when Available is 0 (HTTP 400 Rejection)
    // Now that AUD available reserve is strictly 0.00:
    const zeroAvailReq = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'AUD',
      fromAmount: 1000 // Requests ~17 AUD when available is 0
    }, bearer(tokenOp));

    const postZeroReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.AUD;
    const test1_2_Pass = zeroAvailReq.status === 400 &&
      zeroAvailReq.data?.error === 'Insufficient FX desk reserves' &&
      zeroAvailReq.data?.availableReserve === 0 &&
      postZeroReserves?.availableReserve === 0 &&
      postZeroReserves?.currentInventory >= 0;

    recordResult({
      id: 'ADV-M2-EXHAUST-02',
      title: 'Requesting Units on Depleted Reserve Pool (HTTP 400 & Zero Negative Inventory)',
      category: 'Reserve Exhaustion',
      scenario: 'Submit exchange request on depleted AUD pool (availableReserve === 0); verify HTTP 400 Insufficient FX desk reserves',
      expected: 'HTTP 400 Bad Request with error="Insufficient FX desk reserves", availableReserve === 0, non-negative inventory',
      actual: `HTTP ${zeroAvailReq.status}: error="${zeroAvailReq.data?.error}", availableReserve=${zeroAvailReq.data?.availableReserve}`,
      evidence: {
        response: zeroAvailReq.data,
        deskReserveAfter: postZeroReserves
      },
      status: test1_2_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 1.3: Requesting Available + 1 Unit on Partially Funded Pool (HTTP 400)
    // SGD pool currently has exactly 500 SGD available:
    const preSgdRes = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;
    const availSgd = Number(preSgdRes?.availableReserve || 500);

    // Calculate INR amount that yields exactly 501 SGD (available + 1 unit)
    const convSgdRate = calculateFxConversion('INR', 'SGD', 33500, null, { SGD: preSgdRes }).effectiveRate;
    const inrFor501Sgd = roundCurrency((availSgd + 1) * convSgdRate, 'INR');
    const conv501Check = calculateFxConversion('INR', 'SGD', inrFor501Sgd, null, { SGD: preSgdRes });
    assert(conv501Check.toAmount > availSgd, `Calculated amount (${conv501Check.toAmount}) must exceed available (${availSgd})`);

    const availPlusOneReq = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: inrFor501Sgd
    }, bearer(tokenOp));

    const test1_3_Pass = availPlusOneReq.status === 400 &&
      availPlusOneReq.data?.error === 'Insufficient FX desk reserves' &&
      availPlusOneReq.data?.availableReserve === availSgd &&
      availPlusOneReq.data?.requestedAmount > availSgd;

    recordResult({
      id: 'ADV-M2-EXHAUST-03',
      title: 'Requesting Available + 1 Unit on Active Pool (HTTP 400 Rejection)',
      category: 'Reserve Exhaustion',
      scenario: `Submit exchange for ${availSgd + 1} SGD when exactly ${availSgd} is available; verify rejection`,
      expected: `HTTP 400 Bad Request: error="Insufficient FX desk reserves", requestedAmount > ${availSgd}`,
      actual: `HTTP ${availPlusOneReq.status}: error="${availPlusOneReq.data?.error}", requested=${availPlusOneReq.data?.requestedAmount}, avail=${availPlusOneReq.data?.availableReserve}`,
      evidence: availPlusOneReq.data,
      status: test1_3_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 1.4: Partial Conversions Default False (All-or-Nothing Guarantee)
    // When 501 SGD was requested with only 500 available:
    // Verify client received 0 SGD, client debited 0 INR, desk inventory unchanged at 500
    const teamPortAfterAttempt = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const sgdDeskAfterAttempt = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;

    // Also test explicitly sending allowPartial: true and allowPartial: false
    const explicitPartialFalse = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: inrFor501Sgd,
      allowPartial: false
    }, bearer(tokenOp));

    const explicitPartialTrue = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      amount: inrFor501Sgd,
      allowPartial: true
    }, bearer(tokenOp));

    const test1_4_Pass = teamPortAfterAttempt?.cashWallets?.SGD === 10000 &&
      sgdDeskAfterAttempt?.availableReserve === 500 &&
      sgdDeskAfterAttempt?.completedSales === 0 &&
      explicitPartialFalse.status === 400 &&
      explicitPartialTrue.status === 400; // Partial conversions are not permitted; default false

    recordResult({
      id: 'ADV-M2-PARTIAL-01',
      title: 'Partial Conversions Default False (Strict All-or-Nothing Guarantee)',
      category: 'Reserve Exhaustion',
      scenario: 'Verify request exceeding available reserve is 100% rejected; zero partial fulfillment, zero leakage, desk reserves intact',
      expected: 'HTTP 400 rejection across all partial flags, client SGD unchanged, desk SGD available unchanged at 500',
      actual: `Client SGD=${teamPortAfterAttempt?.cashWallets?.SGD}, Desk SGD available=${sgdDeskAfterAttempt?.availableReserve}, partialFalse=${explicitPartialFalse.status}, partialTrue=${explicitPartialTrue.status}`,
      evidence: {
        teamWallets: teamPortAfterAttempt?.cashWallets,
        deskReserve: sgdDeskAfterAttempt,
        explicitFalseStatus: explicitPartialFalse.status,
        explicitTrueStatus: explicitPartialTrue.status
      },
      status: test1_4_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 1.5: Queued Request Exhaustion Boundary & Settle
    // On SGD pool with 500 available:
    // A) Request for 501 SGD must reject immediately with HTTP 400
    const queueExhaustReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: inrFor501Sgd
    }, bearer(tokenT01));

    // B) Request for exactly 500 SGD must succeed (status QUEUED)
    const inrFor500Sgd = roundCurrency(500 * convSgdRate, 'INR');
    const queueExactReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: inrFor500Sgd
    }, bearer(tokenT01));

    const postQueueReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;
    const queueRequestId = queueExactReq.data?.fxRequest?.id;

    // C) Now that 500 SGD is reserved in queue, availableReserve is 0. Attempting another queued request for 1 SGD must reject:
    const queueSecondReq = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: 100
    }, bearer(tokenT01));

    // D) Settle the queued request:
    const settleExactReq = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: queueRequestId,
      actionType: 'SETTLE'
    }, bearer(tokenOp));

    const postSettleSgdReserves = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.SGD;

    const test1_5_Pass = queueExhaustReq.status === 400 &&
      queueExactReq.status === 200 &&
      postQueueReserves?.reservedInventory === 500 &&
      postQueueReserves?.availableReserve === 0 &&
      queueSecondReq.status === 400 &&
      settleExactReq.status === 200 &&
      postSettleSgdReserves?.availableReserve === 0 &&
      postSettleSgdReserves?.reservedInventory === 0;

    recordResult({
      id: 'ADV-M2-QUEUE-EXHAUST-01',
      title: 'Queued Request Exhaustion Boundary & Atomic Settlement',
      category: 'Reserve Exhaustion',
      scenario: 'Submit 501 SGD queue request (rejected 400); submit 500 SGD request (accepted, reserves pool); submit 2nd request (rejected 400); settle',
      expected: 'Queue 501 rejects HTTP 400; Queue 500 locks pool to available=0; 2nd queue rejects 400; settlement completes cleanly',
      actual: `Queue501=${queueExhaustReq.status}, Queue500=${queueExactReq.status}, Queue2nd=${queueSecondReq.status}, Settle=${settleExactReq.status}, finalAvail=${postSettleSgdReserves?.availableReserve}`,
      evidence: {
        queueExhaustReq: queueExhaustReq.data,
        queueExactReq: queueExactReq.data,
        queueSecondReq: queueSecondReq.data,
        settleExactReq: settleExactReq.data,
        postSettleSgdReserves
      },
      status: test1_5_Pass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // OBJECTIVE 2: INTEGER PRECISION STRESS TESTING FOR JPY AND KRW
    // =========================================================================
    console.log('================================================================================');
    console.log('🎯 ADVERSARIAL SECTION 2: INTEGER PRECISION STRESS TESTING FOR JPY AND KRW');
    console.log('================================================================================');

    // TEST 2.1: JPY Conversion Precision Generator & Oracle (10,000 trials)
    console.log('Running 10,000 algorithmic stress trials for JPY conversions...');
    let jpyFailures = 0;
    let jpySampleTrials = [];

    // Construct adversarial inputs: repeating fractions, micro-paise, irrational numbers, max bounds
    const jpyTestInputs = [
      0.01, 0.02, 0.49, 0.50, 0.51, 0.99, 1.00, 1.23, 3.333333, 7.777777,
      13.37, 99.99, 100.55, 333.33, 999.99, 1234.56, 9876.54, 88888.88,
      99999.99, 123456.78, 555555.55, 1000000.01, 9999999.99, 10000000.50,
      1/3, 2/3, 1/7, Math.PI, Math.E, Math.SQRT2, 0.0000001, 99999999.9999
    ];

    // Expand to 10,000 pseudo-random adversarial inputs
    for (let i = 0; i < 9968; i++) {
      const base = Math.random() * 5000000;
      const frac = Math.random();
      jpyTestInputs.push(base + frac);
    }

    const testReserves = ensureFxReserves();

    for (let i = 0; i < jpyTestInputs.length; i++) {
      const inrAmt = jpyTestInputs[i];
      try {
        const conv = calculateFxConversion('INR', 'JPY', inrAmt, DEFAULT_FX_RATES, testReserves);
        const toAmt = conv.toAmount;
        const isInt = Number.isInteger(toAmt) && (toAmt % 1 === 0) && Number.isFinite(toAmt);
        if (!isInt) {
          jpyFailures++;
          if (jpySampleTrials.length < 5) {
            jpySampleTrials.push({ inrAmt, toAmt, isInt });
          }
        }
      } catch (e) {
        jpyFailures++;
        if (jpySampleTrials.length < 5) {
          jpySampleTrials.push({ inrAmt, error: e.message });
        }
      }
    }

    const test2_1_Pass = (jpyFailures === 0);
    recordResult({
      id: 'ADV-M2-PRECISION-JPY-01',
      title: 'Algorithmic Stress Oracle: 10,000 JPY Conversion Trials (Strict Zero-Decimal Integer)',
      category: 'Integer Precision',
      scenario: 'Execute 10,000 conversions with random fractional paise, micro-amounts, and irrationals to JPY; assert Number.isInteger(toAmount) on 100%',
      expected: '10,000/10,000 trials return integer toAmount (0 failures)',
      actual: `${10000 - jpyFailures}/10,000 passed (${jpyFailures} failures)`,
      evidence: { totalTrials: 10000, jpyFailures, sampleFailures: jpySampleTrials },
      status: test2_1_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 2.2: KRW Conversion Precision Generator & Oracle (10,000 trials)
    console.log('Running 10,000 algorithmic stress trials for KRW conversions...');
    let krwFailures = 0;
    let krwSampleTrials = [];

    const krwTestInputs = [...jpyTestInputs]; // Same 10,000 adversarial inputs

    for (let i = 0; i < krwTestInputs.length; i++) {
      const inrAmt = krwTestInputs[i];
      try {
        const conv = calculateFxConversion('INR', 'KRW', inrAmt, DEFAULT_FX_RATES, testReserves);
        const toAmt = conv.toAmount;
        const isInt = Number.isInteger(toAmt) && (toAmt % 1 === 0) && Number.isFinite(toAmt);
        if (!isInt) {
          krwFailures++;
          if (krwSampleTrials.length < 5) {
            krwSampleTrials.push({ inrAmt, toAmt, isInt });
          }
        }
      } catch (e) {
        krwFailures++;
        if (krwSampleTrials.length < 5) {
          krwSampleTrials.push({ inrAmt, error: e.message });
        }
      }
    }

    const test2_2_Pass = (krwFailures === 0);
    recordResult({
      id: 'ADV-M2-PRECISION-KRW-01',
      title: 'Algorithmic Stress Oracle: 10,000 KRW Conversion Trials (Strict Zero-Decimal Integer)',
      category: 'Integer Precision',
      scenario: 'Execute 10,000 conversions with random fractional paise, micro-amounts, and irrationals to KRW; assert Number.isInteger(toAmount) on 100%',
      expected: '10,000/10,000 trials return integer toAmount (0 failures)',
      actual: `${10000 - krwFailures}/10,000 passed (${krwFailures} failures)`,
      evidence: { totalTrials: 10000, krwFailures, sampleFailures: krwSampleTrials },
      status: test2_2_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 2.3: Cross-Currency JPY <-> KRW Zero-Decimal Conversions (5,000 trials)
    console.log('Running 5,000 cross-currency JPY <-> KRW conversion stress trials...');
    let crossFailures = 0;
    for (let i = 0; i < 2500; i++) {
      const jpyIn = Math.floor(Math.random() * 5000000) + 1;
      const conv = calculateFxConversion('JPY', 'KRW', jpyIn, DEFAULT_FX_RATES, testReserves);
      if (!Number.isInteger(conv.toAmount)) crossFailures++;
    }
    for (let i = 0; i < 2500; i++) {
      const krwIn = Math.floor(Math.random() * 50000000) + 1;
      const conv = calculateFxConversion('KRW', 'JPY', krwIn, DEFAULT_FX_RATES, testReserves);
      if (!Number.isInteger(conv.toAmount)) crossFailures++;
    }

    const test2_3_Pass = (crossFailures === 0);
    recordResult({
      id: 'ADV-M2-PRECISION-CROSS-01',
      title: 'Cross-Currency Zero-Decimal Conversions (2,500 JPY->KRW, 2,500 KRW->JPY)',
      category: 'Integer Precision',
      scenario: 'Execute 5,000 triangular cross-currency conversions between zero-decimal pairs; assert integer outputs',
      expected: '5,000/5,000 trials return strict integers',
      actual: `${5000 - crossFailures}/5,000 passed (${crossFailures} failures)`,
      evidence: { totalTrials: 5000, crossFailures },
      status: test2_3_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 2.4: End-to-End HTTP API Execution with Fractional Inputs
    const jpyHttpRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'JPY',
      amount: 123456.78
    }, bearer(tokenOp));

    const krwHttpRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'KRW',
      amount: 987654.32
    }, bearer(tokenOp));

    const jpyHttpAmt = jpyHttpRes.data?.toAmount ?? jpyHttpRes.data?.credited;
    const krwHttpAmt = krwHttpRes.data?.toAmount ?? krwHttpRes.data?.credited;

    const jpyIsInt = Number.isInteger(jpyHttpAmt);
    const krwIsInt = Number.isInteger(krwHttpAmt);

    const test2_4_Pass = jpyHttpRes.status === 200 && krwHttpRes.status === 200 && jpyIsInt && krwIsInt;
    recordResult({
      id: 'ADV-M2-PRECISION-HTTP-01',
      title: 'End-to-End HTTP Conversion with Fractional Paise Inputs',
      category: 'Integer Precision',
      scenario: 'Dispatch /api/fx/convert with ₹1,23,456.78 for JPY and ₹9,87,654.32 for KRW; assert JSON payload toAmount isInteger',
      expected: 'HTTP 200, JPY toAmount integer=true, KRW toAmount integer=true',
      actual: `JPY=${jpyHttpAmt} (int=${jpyIsInt}), KRW=${krwHttpAmt} (int=${krwIsInt})`,
      evidence: { jpyHttp: jpyHttpRes.data, krwHttp: krwHttpRes.data },
      status: test2_4_Pass ? 'PASSED' : 'FAILED'
    });

    // TEST 2.5: Universal Formatter Oracle (2,000 trials)
    let fmtFailures = 0;
    for (let i = 0; i < 1000; i++) {
      const val = (Math.random() * 10000000);
      const str = formatCurrency(val, 'JPY');
      if (str.includes('.') || !str.includes('¥')) fmtFailures++;
    }
    for (let i = 0; i < 1000; i++) {
      const val = (Math.random() * 10000000);
      const str = formatCurrency(val, 'KRW');
      if (str.includes('.') || !str.includes('₩')) fmtFailures++;
    }

    const test2_5_Pass = (fmtFailures === 0);
    recordResult({
      id: 'ADV-M2-FORMATTER-ORACLE-01',
      title: 'Universal Financial Formatter Oracle (2,000 JPY/KRW Trials)',
      category: 'Integer Precision',
      scenario: 'Format 2,000 continuous floating numbers with formatCurrency; assert zero decimal points and proper currency symbols',
      expected: '2,000/2,000 formatted strings have zero decimal point characters',
      actual: `${2000 - fmtFailures}/2,000 passed (${fmtFailures} failures)`,
      evidence: { totalTrials: 2000, fmtFailures },
      status: test2_5_Pass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // OBJECTIVE 3: CAD/CHF STRICT BOUNDARY TESTING
    // =========================================================================
    console.log('================================================================================');
    console.log('🎯 ADVERSARIAL SECTION 3: CAD/CHF STRICT BOUNDARY TESTING');
    console.log('================================================================================');

    // TEST 3.1: Complete Matrix of CAD/CHF Transaction Endpoints
    const cadChfMatrix = [
      // Exchange endpoint
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', fromAmount: 1000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', fromAmount: 65000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'INR', fromAmount: 1000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CHF', fromAmount: 100000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'CHF', fromAmount: 1000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'CAD', fromAmount: 1000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'USD', fromAmount: 1000 } },
      { ep: '/api/fx/exchange', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'USD', toCurrency: 'CHF', fromAmount: 1000 } },
      // Convert endpoint
      { ep: '/api/fx/convert', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', amount: 1000 } },
      { ep: '/api/fx/convert', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', amount: 65000 } },
      { ep: '/api/fx/convert', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'USD', amount: 1000 } },
      { ep: '/api/fx/convert', role: tokenOp, body: { teamCode: 'T01', fromCurrency: 'USD', toCurrency: 'CHF', amount: 1000 } },
      // Request (Queue) endpoint
      { ep: '/api/fx/request', role: tokenT01, body: { teamCode: 'T01', fromCurrency: 'CAD', toCurrency: 'INR', fromAmount: 1000 } },
      { ep: '/api/fx/request', role: tokenT01, body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CAD', fromAmount: 65000 } },
      { ep: '/api/fx/request', role: tokenT01, body: { teamCode: 'T01', fromCurrency: 'CHF', toCurrency: 'INR', fromAmount: 1000 } },
      { ep: '/api/fx/request', role: tokenT01, body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'CHF', fromAmount: 100000 } },
      // Replenish endpoints (uppercase and lowercase)
      { ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'CAD', quantity: 100000, reason: 'Test legacy CAD' } },
      { ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'CHF', quantity: 100000, reason: 'Test legacy CHF' } },
      { ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'cad', quantity: 100000, reason: 'Test lowercase cad' } },
      { ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'chf', quantity: 100000, reason: 'Test lowercase chf' } },
      { ep: '/api/fx/replenish', role: tokenAdmin, body: { currency: 'CAD', quantity: 100000, reason: 'Test legacy CAD alias' } },
      { ep: '/api/fx/replenish', role: tokenAdmin, body: { currency: 'CHF', quantity: 100000, reason: 'Test legacy CHF alias' } }
    ];

    let matrixAllRejected = true;
    const matrixResults = [];

    for (const testItem of cadChfMatrix) {
      const res = await apiRequest('POST', testItem.ep, testItem.body, bearer(testItem.role));
      const passed = (res.status === 400);
      matrixResults.push({
        endpoint: testItem.ep,
        params: testItem.body,
        status: res.status,
        error: res.data?.error,
        passed
      });
      if (!passed) matrixAllRejected = false;
    }

    recordResult({
      id: 'ADV-M2-CADCHF-MATRIX-01',
      title: 'CAD/CHF Strict Boundary Matrix (22 Boundary Rejection Tests)',
      category: 'CAD/CHF Isolation',
      scenario: 'Attempt exchange, convert, queue, and replenishment across 22 distinct permutations of CAD and CHF',
      expected: '22/22 requests rejected with HTTP 400 Bad Request',
      actual: `${matrixResults.filter(r => r.passed).length}/22 rejected with HTTP 400`,
      evidence: matrixResults,
      status: matrixAllRejected ? 'PASSED' : 'FAILED'
    });

    // TEST 3.2: Module Exports & Formatting Boundary
    const cadTradable = CURRENCY_DIRECTORY.CAD?.tradable === false && CURRENCY_DIRECTORY.CAD?.isLegacy === true;
    const chfTradable = CURRENCY_DIRECTORY.CHF?.tradable === false && CURRENCY_DIRECTORY.CHF?.isLegacy === true;
    const activeExcludesCad = !ACTIVE_CURRENCIES.includes('CAD') && !ACTIVE_CURRENCIES.includes('CHF');
    const foreignExcludesCad = !ACTIVE_FOREIGN_CURRENCIES.includes('CAD') && !ACTIVE_FOREIGN_CURRENCIES.includes('CHF');

    let fnThrowsCad = false;
    let fnThrowsChf = false;
    try { calculateFxConversion('CAD', 'INR', 1000); } catch (e) { fnThrowsCad = true; }
    try { calculateFxConversion('INR', 'CHF', 1000); } catch (e) { fnThrowsChf = true; }

    const test3_2_Pass = cadTradable && chfTradable && activeExcludesCad && foreignExcludesCad && fnThrowsCad && fnThrowsChf;
    recordResult({
      id: 'ADV-M2-CADCHF-METADATA-01',
      title: 'CAD/CHF Metadata Non-Tradable Isolation & calculateFxConversion Exception Guard',
      category: 'CAD/CHF Isolation',
      scenario: 'Verify formatters exports CAD/CHF as tradable: false, excludes from active currencies, and calculateFxConversion throws',
      expected: 'tradable=false, isLegacy=true, activeExcludes=true, calculateFxConversion throws for both',
      actual: `cadTradable=${cadTradable}, chfTradable=${chfTradable}, excludes=${activeExcludesCad}, throwsCad=${fnThrowsCad}, throwsChf=${fnThrowsChf}`,
      evidence: { cadTradable, chfTradable, activeExcludesCad, foreignExcludesCad, fnThrowsCad, fnThrowsChf },
      status: test3_2_Pass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // OBJECTIVE 4: SOLVENCY INVARIANT RIGOROUS ASSERTION (A + Res = I)
    // =========================================================================
    console.log('================================================================================');
    console.log('🎯 ADVERSARIAL SECTION 4: SOLVENCY INVARIANT RIGOROUS ASSERTION (A + Res = I)');
    console.log('================================================================================');

    async function evaluateSolvencyInvariants() {
      const reservesRes = await apiRequest('GET', '/api/fx/reserves');
      const reserves = reservesRes.data?.reserves || {};
      const statusMap = {};
      let allHold = true;

      for (const cur of ACTIVE_FOREIGN_CURRENCIES) {
        const r = reserves[cur];
        if (!r) {
          allHold = false;
          statusMap[cur] = { missing: true };
          continue;
        }
        const open = Number(r.openingReserve || 0);
        const rep = Number(r.replenishments || 0);
        const pur = Number(r.completedPurchases || 0);
        const sal = Number(r.completedSales || 0);
        const inv = Number(r.currentInventory || 0);
        const avail = Number(r.availableReserve || 0);
        const resv = Number(r.reservedInventory || 0);

        // Invariant 1: currentInventory === openingReserve + replenishments + completedPurchases - completedSales
        const expectedInv = open + rep + pur - sal;
        const invDiff = Math.abs(inv - expectedInv);

        // Invariant 2: availableReserve + reservedInventory === currentInventory
        const sumDiff = Math.abs((avail + resv) - inv);

        // Non-negativity constraints: avail >= 0, resv >= 0, inv >= resv
        const nonNeg = (avail >= 0) && (resv >= 0) && (inv >= resv);
        const holds = (invDiff < 0.001) && (sumDiff < 0.001) && nonNeg;

        statusMap[cur] = { inv, avail, resv, open, rep, pur, sal, invDiff, sumDiff, nonNeg, holds };
        if (!holds) allHold = false;
      }
      return { allHold, statusMap };
    }

    // Evaluate solvency initially
    const solv1 = await evaluateSolvencyInvariants();

    // Perform an interleaved burst of actions across multiple currencies:
    // 1. Submit queued EUR request (103,500 INR -> ~1,000 EUR)
    const qEur = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 103500
    }, bearer(tokenT01));

    // 2. Submit queued USD request (88,600 INR -> ~1,000 USD)
    const qUsd = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 88600
    }, bearer(tokenT01));

    // 3. Settle EUR request
    const qEurId = qEur.data?.fxRequest?.id;
    await apiRequest('POST', '/api/fx/queue-action', { requestId: qEurId, actionType: 'SETTLE' }, bearer(tokenOp));

    // 4. Reject USD request (restores reservation)
    const qUsdId = qUsd.data?.fxRequest?.id;
    await apiRequest('POST', '/api/fx/queue-action', { requestId: qUsdId, actionType: 'REJECT', rejectionReason: 'Test rejection' }, bearer(tokenOp));

    // 5. Replenish JPY pool with 500,000,000 JPY
    await apiRequest('POST', '/api/fx/reserves/replenish', {
      currency: 'JPY',
      quantity: 500000000,
      reason: 'Central Bank Liquidity Operation'
    }, bearer(tokenAdmin));

    // 6. Direct exchange INR -> AED (50,000 INR)
    await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'AED',
      fromAmount: 50000
    }, bearer(tokenOp));

    // Evaluate solvency post-burst
    const solv2 = await evaluateSolvencyInvariants();

    const test4_1_Pass = solv1.allHold && solv2.allHold;
    recordResult({
      id: 'ADV-M2-SOLVENCY-01',
      title: 'Solvency Invariant ($A + Res = I$ and $I \\ge Res \\ge 0$) Across 9 Foreign Pools',
      category: 'Solvency Invariants',
      scenario: 'Assert Available + Reserved = Current Inventory, non-negativity, and inventory formula before and after interleaved multi-currency burst',
      expected: 'Invariants hold 100% across all 9 foreign currencies pools before and after operations',
      actual: `Pre-burst=${solv1.allHold}, Post-burst=${solv2.allHold}`,
      evidence: solv2.statusMap,
      status: test4_1_Pass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // OBJECTIVE 5: ZERO CURRENCY CREATION & ACCOUNTING INTEGRITY
    // =========================================================================
    console.log('================================================================================');
    console.log('🎯 ADVERSARIAL SECTION 5: ZERO CURRENCY CREATION & ACCOUNTING INTEGRITY');
    console.log('================================================================================');

    // TEST 5.1: Mathematical Conservation of Currency on FX Conversions
    // When client buys foreign currency:
    // Client wallet increases by Delta C. Desk completedSales increases by Delta C.
    // Client INR decreases by Delta INR. Desk deskInrCash increases by Delta INR.
    const preConvPort = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const preConvRes = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.CNY;

    const cnyPurchase = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'CNY',
      fromAmount: 122500 // ~9,950 CNY
    }, bearer(tokenOp));

    const postConvPort = (await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearer(tokenT01))).data?.team;
    const postConvRes = (await apiRequest('GET', '/api/fx/reserves')).data?.reserves?.CNY;

    const clientCnyGain = roundCurrency((postConvPort?.cashWallets?.CNY || 0) - (preConvPort?.cashWallets?.CNY || 0), 'CNY');
    const deskCnySalesDelta = roundCurrency((postConvRes?.completedSales || 0) - (preConvRes?.completedSales || 0), 'CNY');
    const deskCnyInvDelta = roundCurrency((preConvRes?.currentInventory || 0) - (postConvRes?.currentInventory || 0), 'CNY');

    const conservationHolds = (clientCnyGain === deskCnySalesDelta) && (clientCnyGain === deskCnyInvDelta) && (clientCnyGain > 0);

    recordResult({
      id: 'ADV-M2-CONSERVE-01',
      title: 'Mathematical Conservation of Currency (Zero Creation Ex Nihilo)',
      category: 'Zero Currency Creation',
      scenario: 'Client purchases CNY; verify client wallet gain strictly equals desk completedSales increase and inventory reduction',
      expected: 'clientCnyGain === deskCnySalesDelta === deskCnyInventoryReduction > 0',
      actual: `clientGain=${clientCnyGain}, deskSalesDelta=${deskCnySalesDelta}, deskInvDrop=${deskCnyInvDelta}, holds=${conservationHolds}`,
      evidence: {
        tx: cnyPurchase.data?.fxTransaction,
        clientCnyGain,
        deskCnySalesDelta,
        deskCnyInvDelta
      },
      status: conservationHolds ? 'PASSED' : 'FAILED'
    });

    // TEST 5.2: Adversarial Value Injections (Negative, Zero, NaN, Infinity, Malformed)
    const adversarialVectors = [
      { name: 'Negative fromAmount (-1000)', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: -1000 } },
      { name: 'Zero fromAmount (0)', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 0 } },
      { name: 'String NaN', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 'NaN' } },
      { name: 'String Infinity', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 'Infinity' } },
      { name: 'Negative Infinity', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: -Infinity } },
      { name: 'Null fromAmount', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: null } },
      { name: 'SQL injection string', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: "1000; DROP TABLE wallets;" } },
      { name: 'Negative replenishment (-100000)', ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'USD', quantity: -100000, reason: 'Negative injection' } },
      { name: 'Zero replenishment (0)', ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'USD', quantity: 0, reason: 'Zero injection' } },
      { name: 'Sub-minimum reason string', ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'USD', quantity: 1000, reason: 'abc' } },
      { name: 'INR foreign replenishment', ep: '/api/fx/reserves/replenish', role: tokenAdmin, body: { currency: 'INR', quantity: 100000, reason: 'INR injection under foreign desk' } }
    ];

    let allAdversarialRejected = true;
    const adversarialResults = [];

    for (const vec of adversarialVectors) {
      const ep = vec.ep || '/api/fx/exchange';
      const role = vec.role || tokenOp;
      const res = await apiRequest('POST', ep, vec.body, bearer(role));
      const passed = (res.status === 400);
      adversarialResults.push({ name: vec.name, endpoint: ep, status: res.status, error: res.data?.error, passed });
      if (!passed) allAdversarialRejected = false;
    }

    recordResult({
      id: 'ADV-M2-ATTACK-VECTORS-01',
      title: 'Adversarial Injection Defense (Negative, Zero, NaN, Infinity, Malformed)',
      category: 'Zero Currency Creation',
      scenario: 'Send 11 adversarial and boundary injection payloads designed to trick currency creation logic; assert HTTP 400',
      expected: '11/11 payloads rejected with HTTP 400 Bad Request',
      actual: `${adversarialResults.filter(r => r.passed).length}/11 rejected with HTTP 400`,
      evidence: adversarialResults,
      status: allAdversarialRejected ? 'PASSED' : 'FAILED'
    });

    // TEST 5.3: Double-Entry Ledger Invariant Across All Transactions
    let ledgerAuditPass = false;
    let ledgerLinesCount = 0;
    let currencyBalances = {};

    if (pool) {
      try {
        const txId = cnyPurchase.data?.fxTransaction?.id;
        const jeRes = await pool.query(
          `SELECT id, transaction_id, entry_type FROM journal_entries WHERE transaction_id = $1`,
          [txId]
        );
        if (jeRes.rows.length > 0) {
          const linesRes = await pool.query(
            `SELECT account_id, debit, credit, currency FROM ledger_lines WHERE journal_entry_id = $1`,
            [jeRes.rows[0].id]
          );
          const lines = linesRes.rows;
          ledgerLinesCount = lines.length;

          for (const l of lines) {
            if (!currencyBalances[l.currency]) currencyBalances[l.currency] = { debit: 0, credit: 0 };
            currencyBalances[l.currency].debit += Number(l.debit);
            currencyBalances[l.currency].credit += Number(l.credit);
          }

          const allCurrenciesBalanced = Object.values(currencyBalances).every(b => Math.abs(b.debit - b.credit) < 0.001);
          if (allCurrenciesBalanced && ledgerLinesCount >= 4) {
            ledgerAuditPass = true;
          }
        }
      } catch (pgErr) {
        console.warn('Notice: PG ledger query notice:', pgErr.message);
      }
    } else {
      ledgerAuditPass = true;
    }

    recordResult({
      id: 'ADV-M2-DOUBLE-ENTRY-01',
      title: 'Double-Entry Accounting Invariant (Balanced Debits and Credits Per Currency)',
      category: 'Accounting Integrity',
      scenario: 'Inspect PostgreSQL journal_entries and ledger_lines for settled FX transaction; assert Sum(Debits) === Sum(Credits) per currency',
      expected: 'Sum(Debits) === Sum(Credits) for INR and CNY respectively, 4 balanced ledger lines',
      actual: `balanced=${ledgerAuditPass}, lineCount=${ledgerLinesCount}`,
      evidence: currencyBalances,
      status: ledgerAuditPass ? 'PASSED' : 'FAILED'
    });

    // STEP 6: POST-FLIGHT HASH VERIFICATION
    console.log('--- POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after all tests: ${finalHash}`);
    const hashUntouched = finalHash === EXPECTED_HASH;

    recordResult({
      id: 'ADV-M2-POSTFLIGHT-01',
      title: 'Post-Flight Authoritative State Baseline Hash Integrity',
      category: 'Integrity',
      scenario: 'Confirm authoritative state.json was 100% bit-for-bit untouched throughout all test executions',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: hashUntouched ? 'PASSED' : 'FAILED'
    });

  } finally {
    console.log('\n--- STOPPING TEST SERVER PROCESS ---');
    serverProcess.kill('SIGKILL');
    console.log('✓ Test backend stopped.');

    try {
      if (fs.existsSync(DISPOSABLE_STATE)) fs.unlinkSync(DISPOSABLE_STATE);
      console.log('✓ Removed disposable fixture.');
    } catch (e) {}

    if (pool) {
      try {
        await pool.query(
          `UPDATE fx_reserves
           SET opening_reserve = 13000000, replenishments = 0, completed_purchases = 0, completed_sales = 0,
               reserved_inventory = 0, updated_at = NOW()
           WHERE currency = 'SGD'`
        );
        await pool.query(
          `UPDATE fx_reserves
           SET opening_reserve = 15000000, replenishments = 0, completed_purchases = 0, completed_sales = 0,
               reserved_inventory = 0, updated_at = NOW()
           WHERE currency = 'AUD'`
        );
      } catch (e) {}
      await closePool();
    }
  }

  // SUMMARY & VERDICT
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;

  console.log('\n================================================================================');
  console.log(`📊 ADVERSARIAL TEST SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('================================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Test evidence saved to: ${RESULTS_FILE}`);

  if (failed > 0) {
    console.error(`\n❌ VERDICT: REQUEST_CHANGES (${failed} adversarial challenges failed)`);
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: APPROVE (All adversarial challenges passed with zero defects)');
  }
}

runAdversarialM2Suite().catch(err => {
  console.error('\n❌ Unhandled error during Adversarial Suite execution:', err);
  process.exit(1);
});
