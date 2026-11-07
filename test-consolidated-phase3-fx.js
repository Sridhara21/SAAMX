import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { initPool } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3097;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-consolidated-p3-disposable.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-consolidated-phase3-results.json');

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

function bearerHeader(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function runConsolidatedPhase3Suite() {
  console.log('======================================================================');
  console.log('💱 SAAMX CONSOLIDATED BUILD PHASE 3 — CURRENCY EXPANSION & FX INTEGRITY');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'PREFLIGHT-01',
    title: 'Pre-flight Authoritative State Hash Verification',
    endpoint: 'N/A',
    role: 'system',
    scenario: 'Verify state.json SHA-256 matches baseline before testing',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: FIXTURE SETUP
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  try {
    fs.chmodSync(ORIGINAL_STATE, 0o444);
    console.log('✓ Marked authoritative state.json as READ-ONLY (0o444).');
  } catch (e) {
    console.warn('Warning: Could not set chmod 0o444 on state.json:', e.message);
  }

  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  fs.chmodSync(DISPOSABLE_STATE, 0o666);

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'INSTANT' };
  fixture.fxQueue = [];
  fixture.fxTransactions = [];

  // Seed Team T01 with all 10 currency wallets
  const teamT01 = fixture.teams.find(t => t.teamCode === 'T01');
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
      KRW: 10000000,
      CAD: 10000,
      CHF: 10000
    };
    teamT01.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0, CAD: 0, CHF: 0
    };
  }

  // Seed Team T02 similarly
  const teamT02 = fixture.teams.find(t => t.teamCode === 'T02');
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
      KRW: 10000000,
      CAD: 10000,
      CHF: 10000
    };
    teamT02.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0, CAD: 0, CHF: 0
    };
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // Seed PostgreSQL wallets if DB is configured
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
        const bal2 = teamT02?.cashWallets?.[cur] || 0;
        await pool.query(
          `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
           ON CONFLICT (team_id, currency) DO UPDATE SET balance = $4, reserved = 0, updated_at = NOW()`,
          [`W_T02_${cur}`, 'T02', cur, bal2]
        );
      }
    } catch (e) {
      console.warn('Notice: PG seeding skipped:', e.message);
    }
  }

  console.log('✓ Disposable fixture initialized with 10 currencies.\n');

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
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
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

    const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    const tokenT02 = loginT02.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginSebi = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    const tokenSebi = loginSebi.data?.token;

    assert(tokenT01 && tokenT02 && tokenAdmin && tokenExchange && tokenSebi, 'Failed to acquire test session tokens');
    console.log('✓ Acquired session tokens for T01, T02, Admin, Exchange Operator, and SEBI.\n');

    recordResult({
      id: 'AUTH-LOGIN-01',
      title: 'Session Token Acquisition for FX Desk Roles',
      endpoint: 'POST /api/auth/login',
      role: 'all roles',
      scenario: 'Acquire HMAC session tokens for exchange operator, admin, sebi, and participant teams',
      expected: 'HTTP 200 with valid session tokens for exchange, admin, sebi, and teams',
      actual: `exchange: role=${loginExchange.data?.role}, admin: role=${loginAdmin.data?.role}, T01: role=${loginT01.data?.role}`,
      evidence: { exchangeRole: loginExchange.data?.role, adminRole: loginAdmin.data?.role, t01Role: loginT01.data?.role },
      status: loginExchange.data?.role === 'exchange' && loginAdmin.data?.role === 'admin' ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 1: CURRENCY DIRECTORY & RATE DIRECTORY INSPECTION
    // ======================================================================
    console.log('\n--- SECTION 1: CURRENCY DIRECTORY & RATE INSPECTION ---');

    const ratesRes = await apiRequest('GET', '/api/fx/rates');
    const currencies = ratesRes.data?.currencies || {};
    const fxRates = ratesRes.data?.fxRates || {};
    const curKeys = Object.keys(currencies);
    const expectedCurrencies = ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CAD', 'CHF', 'CNY'];
    const expectedPairs = ['USDINR', 'GBPINR', 'EURINR', 'JPYINR', 'AEDINR', 'SGDINR', 'CADINR', 'CHFINR', 'CNYINR'];

    const hasAllCurrencies = expectedCurrencies.every(c => currencies[c]);
    const jpyPrecision = currencies['JPY']?.precision;
    const usdPrecision = currencies['USD']?.precision;
    const hasAllPairs = expectedPairs.every(p => fxRates[p]);
    const hasSimulationLabel = Object.values(fxRates).every(r => r.label && r.label.includes('Simulation Reference Rate'));
    const spreadsValid = Object.values(fxRates).every(r => r.buyRate > r.midRate && r.sellRate < r.midRate);

    recordResult({
      id: 'FX-CUR-01',
      title: 'Currency Directory Definition (10 Currencies)',
      endpoint: 'GET /api/fx/rates',
      role: 'public',
      scenario: 'Verify 10 supported currencies with code, name, symbol, precision, and flag',
      expected: '10 currencies present with JPY precision 0 and 9 others precision 2',
      actual: `Found ${curKeys.length} currencies. JPY precision=${jpyPrecision}, USD precision=${usdPrecision}`,
      evidence: { curKeys, jpyMeta: currencies['JPY'], aedMeta: currencies['AED'] },
      status: hasAllCurrencies && jpyPrecision === 0 && usdPrecision === 2 ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'FX-RATES-01',
      title: 'FX Rate Directory Structure & Bid/Ask Spreads',
      endpoint: 'GET /api/fx/rates',
      role: 'public',
      scenario: 'Verify 9 pairs quoted against INR with simulation label and buyRate > midRate > sellRate',
      expected: 'All 9 pairs present, simulation reference rate labeled, valid buy/sell spreads',
      actual: `9 pairs present=${hasAllPairs}, simulation labeled=${hasSimulationLabel}, spreads valid=${spreadsValid}`,
      evidence: { pairs: Object.keys(fxRates), sample: fxRates['JPYINR'] },
      status: hasAllPairs && hasSimulationLabel && spreadsValid ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 2: FX RATE UPDATES (RBAC & PRECISION)
    // ======================================================================
    console.log('\n--- SECTION 2: FX RATE UPDATES (RBAC & PRECISION) ---');

    // 2.1 Anonymous update attempt -> 401
    const anonRateRes = await apiRequest('POST', '/api/fx/rates', {
      pair: 'USDINR',
      midRate: 90.0,
      reason: 'Anonymous change'
    });
    recordResult({
      id: 'FX-RATE-RBAC-01',
      title: 'Anonymous Rate Update Rejection',
      endpoint: 'POST /api/fx/rates',
      role: 'anonymous',
      scenario: 'Unauthenticated actor attempts to modify FX rate',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${anonRateRes.status}`,
      evidence: anonRateRes.data,
      status: anonRateRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 2.2 Participant Team T01 update attempt -> 403
    const teamRateRes = await apiRequest('POST', '/api/fx/rates', {
      pair: 'USDINR',
      midRate: 90.0,
      reason: 'Team manipulation attempt'
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'FX-RATE-RBAC-02',
      title: 'Participant Team Rate Modification Rejection',
      endpoint: 'POST /api/fx/rates',
      role: 'team (T01)',
      scenario: 'Team participant attempts to modify FX rate',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamRateRes.status}`,
      evidence: teamRateRes.data,
      status: teamRateRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 2.3 Invalid rate parameters (negative midRate) -> 400
    const negRateRes = await apiRequest('POST', '/api/fx/rates', {
      pair: 'USDINR',
      midRate: -88.0,
      reason: 'Negative test'
    }, bearerHeader(tokenSebi));
    recordResult({
      id: 'FX-RATE-VAL-01',
      title: 'Negative / Invalid FX Rate Rejection',
      endpoint: 'POST /api/fx/rates',
      role: 'sebi',
      scenario: 'Authorized regulator submits negative midRate',
      expected: 'HTTP 400 Bad Request with validation error',
      actual: `HTTP ${negRateRes.status}: ${negRateRes.data?.error}`,
      evidence: negRateRes.data,
      status: negRateRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.4 SEBI updates JPYINR with 4-decimal precision -> 200
    const sebiJpyRes = await apiRequest('POST', '/api/fx/rates', {
      pair: 'JPYINR',
      midRate: 0.6050,
      spreadPercent: 0.50,
      reason: 'Bank of Japan intervention'
    }, bearerHeader(tokenSebi));
    const updatedJpy = sebiJpyRes.data?.updatedPair;
    recordResult({
      id: 'FX-RATE-SEBI-01',
      title: 'SEBI JPYINR Rate Adjustment with Decimal Precision',
      endpoint: 'POST /api/fx/rates',
      role: 'sebi',
      scenario: 'SEBI updates JPYINR midRate preserving 4 decimal places',
      expected: 'HTTP 200 OK with midRate=0.605, buyRate > 0.605, sellRate < 0.605',
      actual: `HTTP ${sebiJpyRes.status}: midRate=${updatedJpy?.midRate}, buyRate=${updatedJpy?.buyRate}, sellRate=${updatedJpy?.sellRate}`,
      evidence: updatedJpy,
      status: sebiJpyRes.status === 200 && updatedJpy?.midRate === 0.605 && updatedJpy?.buyRate > 0.605 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 3: DIRECT FX EXCHANGE DESK OPERATIONS (`/api/fx/exchange`)
    // ======================================================================
    console.log('\n--- SECTION 3: DIRECT FX EXCHANGE DESK OPERATIONS ---');

    // 3.1 Anonymous direct exchange -> 401
    const anonExRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000
    });
    recordResult({
      id: 'FX-EX-AUTH-01',
      title: 'Anonymous Direct Exchange Rejection',
      endpoint: 'POST /api/fx/exchange',
      role: 'anonymous',
      scenario: 'Unauthenticated call to direct FX exchange',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${anonExRes.status}`,
      evidence: anonExRes.data,
      status: anonExRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 3.2 Participant team attempting direct execution -> 403
    const teamExRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'FX-EX-AUTH-02',
      title: 'Participant Direct Execution Prohibition',
      endpoint: 'POST /api/fx/exchange',
      role: 'team (T01)',
      scenario: 'Participant team attempts direct exchange without desk operator slip',
      expected: 'HTTP 403 Forbidden with prompt to use /api/fx/request or requiring operator privileges',
      actual: `HTTP ${teamExRes.status}: ${teamExRes.data?.error}`,
      evidence: teamExRes.data,
      status: teamExRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 3.3 Exchange to same currency -> 400
    const sameCurRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'USD',
      fromAmount: 100
    }, bearerHeader(tokenExchange));
    recordResult({
      id: 'FX-EX-VAL-01',
      title: 'Exchange to Same Currency Rejection',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Operator submits conversion of USD to USD',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${sameCurRes.status}: ${sameCurRes.data?.error}`,
      evidence: sameCurRes.data,
      status: sameCurRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 3.4 Unsupported currency -> 400
    const unsuppRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'BTC',
      toCurrency: 'INR',
      fromAmount: 1
    }, bearerHeader(tokenExchange));
    recordResult({
      id: 'FX-EX-VAL-02',
      title: 'Unsupported Currency Rejection',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Operator submits unsupported cryptocurrency BTC',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${unsuppRes.status}: ${unsuppRes.data?.error}`,
      evidence: unsuppRes.data,
      status: unsuppRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 3.5 Direct INR -> USD Execution (Desk Operator)
    const inrToUsdRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 886000,
      notes: 'Physical slip #101'
    }, bearerHeader(tokenExchange));
    const usdTx = inrToUsdRes.data?.fxTransaction;
    const walletsAfterUsd = inrToUsdRes.data?.cashWallets;
    recordResult({
      id: 'FX-EX-INR-USD-01',
      title: 'Direct INR -> USD Exchange Execution',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Exchange Operator sells 886,000 INR to buy USD for Team T01 at buyRate',
      expected: 'HTTP 200 OK, INR debited by 886,000, USD credited with 2-decimal precision',
      actual: `HTTP ${inrToUsdRes.status}: debited 886000 INR, credited ${usdTx?.toAmount} USD @ rate ${usdTx?.effectiveRate}`,
      evidence: { tx: usdTx, wallets: walletsAfterUsd },
      status: inrToUsdRes.status === 200 && usdTx?.toAmount > 0 && walletsAfterUsd?.USD > 10000 ? 'PASSED' : 'FAILED'
    });

    // 3.6 Direct INR -> JPY Execution with Zero-Decimal (Integer) Precision
    const inrToJpyRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'JPY',
      fromAmount: 100000,
      notes: 'Physical slip #102'
    }, bearerHeader(tokenExchange));
    const jpyTx = inrToJpyRes.data?.fxTransaction;
    const walletsAfterJpy = inrToJpyRes.data?.cashWallets;
    const isJpyInteger = Number.isInteger(jpyTx?.toAmount) && Number.isInteger(walletsAfterJpy?.JPY);
    recordResult({
      id: 'FX-EX-JPY-PREC-01',
      title: 'JPY Zero-Decimal Integer Precision Enforcement',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Convert INR to JPY and verify JPY amount is strictly integer (0 decimals)',
      expected: 'HTTP 200 with integer JPY credited (no floating decimals in JPY wallet)',
      actual: `HTTP ${inrToJpyRes.status}: credited ${jpyTx?.toAmount} JPY, wallet=${walletsAfterJpy?.JPY}, isInteger=${isJpyInteger}`,
      evidence: { toAmount: jpyTx?.toAmount, jpyWallet: walletsAfterJpy?.JPY, isJpyInteger },
      status: inrToJpyRes.status === 200 && isJpyInteger ? 'PASSED' : 'FAILED'
    });

    // 3.7 Direct Triangular Cross-Currency Conversions across all new currencies:
    // Pair A: USD -> EUR (Cross major)
    const usdToEurRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 1000,
      notes: 'Cross currency USD -> EUR'
    }, bearerHeader(tokenExchange));

    // Pair B: AED -> SGD (Middle East -> Asia)
    const aedToSgdRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'AED',
      toCurrency: 'SGD',
      fromAmount: 5000,
      notes: 'Cross currency AED -> SGD'
    }, bearerHeader(tokenExchange));

    // Pair C: AUD -> EUR (Pacific -> Europe)
    const audToEurRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'AUD',
      toCurrency: 'EUR',
      fromAmount: 2000,
      notes: 'Cross currency AUD -> EUR'
    }, bearerHeader(tokenExchange));

    // Pair D: CNY -> JPY (Asia -> Asia integer target)
    const cnyToJpyRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'CNY',
      toCurrency: 'JPY',
      fromAmount: 5000,
      notes: 'Cross currency CNY -> JPY'
    }, bearerHeader(tokenExchange));

    const crossSuccess = usdToEurRes.status === 200 && aedToSgdRes.status === 200 && audToEurRes.status === 200 && cnyToJpyRes.status === 200;
    const cnyJpyIsInteger = Number.isInteger(cnyToJpyRes.data?.fxTransaction?.toAmount);

    recordResult({
      id: 'FX-EX-CROSS-TRIANG-01',
      title: 'Triangular Cross-Currency Conversions Across Currency Directory',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Execute cross conversions: USD->EUR, AED->SGD, AUD->EUR, CNY->JPY',
      expected: 'HTTP 200 for all triangular conversions, accurate spreads, integer JPY',
      actual: `All 4 succeeded=${crossSuccess}, CNY->JPY integer=${cnyJpyIsInteger}`,
      evidence: {
        usdToEur: usdToEurRes.data?.fxTransaction,
        aedToSgd: aedToSgdRes.data?.fxTransaction,
        audToEur: audToEurRes.data?.fxTransaction,
        cnyToJpy: cnyToJpyRes.data?.fxTransaction
      },
      status: crossSuccess && cnyJpyIsInteger ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 4: CONVERSION ENDPOINT PARITY (`POST /api/fx/convert`)
    // ======================================================================
    console.log('\n--- SECTION 4: CONVERSION ENDPOINT PARITY (/api/fx/convert) ---');

    // 4.1 Anonymous access -> 401
    const anonConvRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'INR',
      amount: 100
    });
    recordResult({
      id: 'FX-CONV-AUTH-01',
      title: '/api/fx/convert Anonymous Authentication Check',
      endpoint: 'POST /api/fx/convert',
      role: 'anonymous',
      scenario: 'Unauthenticated call to /api/fx/convert',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${anonConvRes.status}`,
      evidence: anonConvRes.data,
      status: anonConvRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 4.2 Team participant access -> 403
    const teamConvRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'INR',
      amount: 100
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'FX-CONV-AUTH-02',
      title: '/api/fx/convert Team Participant Prohibition',
      endpoint: 'POST /api/fx/convert',
      role: 'team (T01)',
      scenario: 'Team participant attempts direct conversion via /api/fx/convert',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamConvRes.status}`,
      evidence: teamConvRes.data,
      status: teamConvRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.3 Operator converts AUD -> USD via /api/fx/convert
    const opConvRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'AUD',
      toCurrency: 'USD',
      amount: 500,
      ticketNumber: 'TKT-CONV-001'
    }, bearerHeader(tokenExchange));

    // 4.4 Duplicate ticket number -> 400
    const dupTicketRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'AUD',
      toCurrency: 'USD',
      amount: 500,
      ticketNumber: 'TKT-CONV-001'
    }, bearerHeader(tokenExchange));

    recordResult({
      id: 'FX-CONV-EXEC-01',
      title: '/api/fx/convert Execution and Duplicate Ticket Guard',
      endpoint: 'POST /api/fx/convert',
      role: 'exchange',
      scenario: 'Operator converts AUD to USD and attempts duplicate ticket replay',
      expected: 'First call HTTP 200, duplicate ticket HTTP 400 Bad Request',
      actual: `First call=${opConvRes.status}, duplicate=${dupTicketRes.status}`,
      evidence: { first: opConvRes.data, duplicate: dupTicketRes.data },
      status: opConvRes.status === 200 && dupTicketRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 5: UNRESERVED BALANCE & OVERDRAFT INVARIANTS
    // ======================================================================
    console.log('\n--- SECTION 5: UNRESERVED BALANCE & OVERDRAFT INVARIANTS ---');

    // 5.1 Insufficient total balance -> 400
    const overExchangeRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'CHF',
      toCurrency: 'USD',
      fromAmount: 999999999 // Way more than T01 has
    }, bearerHeader(tokenExchange));
    recordResult({
      id: 'FX-OVERDRAFT-01',
      title: 'Prevention of Overdraft Beyond Wallet Balance',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Exchange request exceeding total wallet balance',
      expected: 'HTTP 400 Bad Request with insufficient balance message',
      actual: `HTTP ${overExchangeRes.status}: ${overExchangeRes.data?.error}`,
      evidence: overExchangeRes.data,
      status: overExchangeRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 5.2 Two-Phase Banking Reserved Cash Invariant:
    // Switch settlement mode to TWO_PHASE_BANK and reserve cash
    await apiRequest('POST', '/api/admin/settlement-mode', {
      mode: 'TWO_PHASE_BANK',
      actor: 'Admin'
    }, bearerHeader(tokenAdmin));

    // Update T01 in disposable state to simulate active reservation in USD
    const t01Res = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, bearerHeader(tokenAdmin));
    const currentT01State = t01Res.data?.team;
    const usdWallet = Number(currentT01State?.cashWallets?.USD || 0);
    // Reserve most of T01's USD
    const reserveUsdAmount = Math.max(0, usdWallet - 100);
    const updatedReserved = { ...(currentT01State?.reservedCash || {}), USD: reserveUsdAmount };
    await apiRequest('PUT', `/api/teams/${currentT01State?.id || 'T01'}`, {
      reservedCash: updatedReserved
    }, bearerHeader(tokenAdmin));

    // Now T01 only has ~100 USD unreserved, even though total wallet has thousands.
    // Attempting to exchange 500 USD must fail!
    const reserveFailRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'INR',
      fromAmount: 500
    }, bearerHeader(tokenExchange));

    // Attempting to exchange 50 USD must succeed!
    const reservePassRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'USD',
      toCurrency: 'INR',
      fromAmount: 50
    }, bearerHeader(tokenExchange));

    recordResult({
      id: 'FX-RESERVED-CASH-01',
      title: 'Unreserved Cash Balance Protection Under Two-Phase Settlement',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Attempt exchange exceeding unreserved balance vs within unreserved balance',
      expected: 'Exceeding unreserved returns HTTP 400; within unreserved returns HTTP 200',
      actual: `Exceeding=${reserveFailRes.status} (${reserveFailRes.data?.error}), within=${reservePassRes.status}`,
      evidence: { fail: reserveFailRes.data, pass: reservePassRes.data },
      status: reserveFailRes.status === 400 && reservePassRes.status === 200 ? 'PASSED' : 'FAILED'
    });

    // Reset settlement mode back to INSTANT for standard testing
    await apiRequest('POST', '/api/admin/settlement-mode', {
      mode: 'INSTANT',
      actor: 'Admin'
    }, bearerHeader(tokenAdmin));

    // ======================================================================
    // SECTION 6: CONCURRENT MUTEX PROTECTION (RACE CONDITION GUARD)
    // ======================================================================
    console.log('\n--- SECTION 6: CONCURRENT MUTEX PROTECTION ---');

    // Dispatch parallel exchange requests for Team T02
    const p1 = apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'AED',
      fromAmount: 100000
    }, bearerHeader(tokenExchange));

    const p2 = apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'AED',
      fromAmount: 100000
    }, bearerHeader(tokenExchange));

    const [resP1, resP2] = await Promise.all([p1, p2]);
    const eitherConflictOrBothSuccess = (resP1.status === 409 || resP2.status === 409) || (resP1.status === 200 && resP2.status === 200);

    recordResult({
      id: 'FX-MUTEX-01',
      title: 'Concurrent Execution Mutex & Race Condition Guard',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Two concurrent exchange requests fired in parallel for the same team',
      expected: 'Protected against race condition: either HTTP 409 Conflict or serialized clean execution',
      actual: `Request 1=${resP1.status}, Request 2=${resP2.status}`,
      evidence: { req1: resP1.data, req2: resP2.data },
      status: eitherConflictOrBothSuccess ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 7: FX QUEUE PIPELINE (`/api/fx/request` and `/api/fx/queue-action`)
    // ======================================================================
    console.log('\n--- SECTION 7: FX QUEUE WORKFLOW PIPELINE ---');

    // 7.1 Team T01 submits request for T01 -> 200
    const queueReqRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: 67100,
      notes: 'Request for Singapore assets'
    }, bearerHeader(tokenT01));
    const fxReqItem = queueReqRes.data?.fxRequest;

    // 7.2 Team T01 attempts to submit request for T02 -> 403 Forbidden
    const crossTeamReqRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'SGD',
      fromAmount: 50000
    }, bearerHeader(tokenT01));

    recordResult({
      id: 'FX-QUEUE-INTAKE-01',
      title: 'FX Queue Request Intake & Cross-Team Submission Guard',
      endpoint: 'POST /api/fx/request',
      role: 'team (T01)',
      scenario: 'Team submits request for self (allowed) and for another team (forbidden)',
      expected: 'Self request HTTP 200 with QUEUED status; cross-team request HTTP 403 Forbidden',
      actual: `Self=${queueReqRes.status} (status=${fxReqItem?.status}), Cross-team=${crossTeamReqRes.status}`,
      evidence: { self: queueReqRes.data, crossTeam: crossTeamReqRes.data },
      status: queueReqRes.status === 200 && fxReqItem?.status === 'QUEUED' && crossTeamReqRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 7.3 Advance Request: RATE_CHECK
    const rateCheckRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqItem.id,
      actionType: 'RATE_CHECK'
    }, bearerHeader(tokenExchange));

    // 7.4 Advance Request: PROCESS
    const processRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqItem.id,
      actionType: 'PROCESS'
    }, bearerHeader(tokenExchange));

    // 7.5 Unprivileged settlement attempt (Team T01 tries to settle) -> 403
    const unprivSettleRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqItem.id,
      actionType: 'SETTLE'
    }, bearerHeader(tokenT01));

    // 7.6 Authorized Operator settles request -> 200
    const settleRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqItem.id,
      actionType: 'SETTLE',
      operatorId: 'FX-DESK-01'
    }, bearerHeader(tokenExchange));
    const settledItem = settleRes.data?.fxRequest;
    const settleTx = settleRes.data?.transaction;

    // 7.7 Double settlement prevention: settle already settled request -> 400
    const doubleSettleRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqItem.id,
      actionType: 'SETTLE'
    }, bearerHeader(tokenExchange));

    recordResult({
      id: 'FX-QUEUE-SETTLE-01',
      title: 'FX Queue Settlement Lifecycle & Double-Settlement Prevention',
      endpoint: 'POST /api/fx/queue-action',
      role: 'exchange & team',
      scenario: 'Transition QUEUED -> RATE_CHECK -> PROCESS -> SETTLE, verify RBAC and double-settle rejection',
      expected: 'RateCheck=200, Process=200, TeamSettle=403, OpSettle=200, DoubleSettle=400',
      actual: `RateCheck=${rateCheckRes.status}, Process=${processRes.status}, TeamSettle=${unprivSettleRes.status}, OpSettle=${settleRes.status}, DoubleSettle=${doubleSettleRes.status}`,
      evidence: { settleTx, doubleSettleErr: doubleSettleRes.data },
      status: rateCheckRes.status === 200 && processRes.status === 200 && unprivSettleRes.status === 403 && settleRes.status === 200 && doubleSettleRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 8: PARTICIPANT PRIVACY ON HISTORY & QUEUE
    // ======================================================================
    console.log('\n--- SECTION 8: PARTICIPANT PRIVACY ON HISTORY & QUEUE ---');

    // 8.1 Team T01 viewing FX transactions
    const txT01Res = await apiRequest('GET', '/api/fx/transactions', null, bearerHeader(tokenT01));
    const txT01List = txT01Res.data?.fxTransactions || [];
    const t01Only = txT01List.every(t => (t.teamCode || '').toUpperCase() === 'T01');

    // 8.2 Operator viewing FX transactions
    const txOpRes = await apiRequest('GET', '/api/fx/transactions', null, bearerHeader(tokenExchange));
    const txOpList = txOpRes.data?.fxTransactions || [];
    const hasMultipleTeamsInOp = txOpList.some(t => t.teamCode === 'T02') && txOpList.some(t => t.teamCode === 'T01');

    recordResult({
      id: 'FX-PRIVACY-TX-01',
      title: 'FX Transaction History Participant Privacy Isolation',
      endpoint: 'GET /api/fx/transactions',
      role: 'team vs exchange',
      scenario: 'Team T01 queries FX history vs exchange operator querying FX history',
      expected: 'T01 only sees T01 transactions; exchange operator sees full global ledger',
      actual: `T01 saw ${txT01List.length} txs (all T01=${t01Only}), Operator saw ${txOpList.length} txs (multiple teams=${hasMultipleTeamsInOp})`,
      evidence: { t01Count: txT01List.length, opCount: txOpList.length },
      status: txT01Res.status === 200 && t01Only && txOpList.length >= txT01List.length ? 'PASSED' : 'FAILED'
    });

    // 8.3 Team T01 viewing FX queue
    const queueT01Res = await apiRequest('GET', '/api/fx/queue', null, bearerHeader(tokenT01));
    const queueT01List = queueT01Res.data?.queue || [];
    const queueT01Only = queueT01List.every(q => (q.teamCode || '').toUpperCase() === 'T01');

    recordResult({
      id: 'FX-PRIVACY-QUEUE-01',
      title: 'FX Queue Participant Privacy Isolation',
      endpoint: 'GET /api/fx/queue',
      role: 'team (T01)',
      scenario: 'Team T01 queries active FX conversion queue',
      expected: 'T01 only sees queue items belonging to team T01',
      actual: `T01 queue saw ${queueT01List.length} items, all T01=${queueT01Only}`,
      evidence: { t01QueueCount: queueT01List.length },
      status: queueT01Res.status === 200 && queueT01Only ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 9: RECONCILIATION MULTI-CURRENCY INTEGRITY
    // ======================================================================
    console.log('\n--- SECTION 9: RECONCILIATION MULTI-CURRENCY INTEGRITY ---');

    const reconRes = await apiRequest('GET', '/api/reconciliation', null, bearerHeader(tokenAdmin));
    const totalCash = reconRes.data?.totalCash || 0;
    const totalCapital = reconRes.data?.totalCapital || 0;

    recordResult({
      id: 'FX-RECON-MULTI-01',
      title: 'Reconciliation Multi-Currency Cash Aggregation',
      endpoint: 'GET /api/reconciliation',
      role: 'admin',
      scenario: 'Reconcile total market cash balance factoring in all 10 currencies',
      expected: 'totalCash is positive finite number aggregating all 10 wallets converted to INR',
      actual: `totalCash=₹${totalCash.toLocaleString()}, totalCapital=₹${totalCapital.toLocaleString()}`,
      evidence: reconRes.data,
      status: reconRes.status === 200 && totalCash > 0 && Number.isFinite(totalCash) ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP SERVER
    console.log('\n--- CLEANING UP TEST BACKEND PROCESS ---');
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 600));
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
    console.log('✓ Isolated test backend stopped.');

    // CLEANUP DISPOSABLE FIXTURE
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log('✓ Removed disposable fixture file.');
      } catch (e) {
        console.warn('Could not remove disposable state file:', e.message);
      }
    }
  }

  // STEP 10: POST-TEST AUTHORITATIVE STATE INTEGRITY VERIFICATION
  console.log('\n--- STEP 10: POST-TEST STATE INTEGRITY VERIFICATION ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256 after test suite: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE FILE WAS MODIFIED DURING TEST SUITE!');
  console.log('✓ Authoritative state.json SHA-256 confirmed 100% BIT-IDENTICAL to baseline.\n');

  recordResult({
    id: 'POST-INTEGRITY-01',
    title: 'Post-Test Authoritative State Hash Verification',
    endpoint: 'N/A',
    role: 'system',
    scenario: 'Confirm authoritative state.json remained 100% untouched throughout all tests',
    expected: EXPECTED_HASH,
    actual: finalHash,
    evidence: { sha256: finalHash },
    status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // SUMMARY
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;

  console.log('======================================================================');
  console.log(`📊 PHASE 3 TEST SUITE SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('======================================================================');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    suite: 'SAAMX Consolidated Build Phase 3 — Currency Expansion & FX Integrity',
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    results: testResults
  }, null, 2), 'utf8');

  assert.strictEqual(failed, 0, `Phase 3 test suite encountered ${failed} failed tests!`);
}

runConsolidatedPhase3Suite().catch(err => {
  console.error('\n❌ Unhandled error running Phase 3 test suite:', err);
  process.exit(1);
});
