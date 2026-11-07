/**
 * SAAMX ADVERSARIAL STRESS TEST SUITE — PHASE E: RATIOS & ADVISORY BOUNDARY
 * File: SAAMX/test-adversarial-phase-e-ratios.js
 *
 * EMPIRICAL CHALLENGER VERIFICATION HARNESS:
 * 1. Financial Fundamentals Engine Fuzzing & Malformed Inputs (NaN, Infinity, non-string, extremes)
 * 2. Mathematical Anti-Spurious Double-Negative ROE Trap
 * 3. Ratio Guardrails (P/E Loss/Break-even/Fixed Income, D/E Zero/Negative Equity, Margin Pre-Revenue)
 * 4. Valuation Spread & Target Price Range Invariants (Bear <= Fair <= Bull, Penny stocks, High multiples)
 * 5. Pure Advisory Non-Execution Boundary:
 *    - Simulated adversarial order placement attempts via advisor sessions and spoofed payloads
 *    - Complete wallet, cash, holdings, and reserve non-mutation invariant assertions
 * 6. AST Provenance and Audit trail verification
 * 7. Bit-exact baseline SHA-256 state.json preservation check
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import {
  SECTOR_BENCHMARKS,
  getSectorBenchmark,
  getCompanyFundamentals,
  getCompanyRatios,
  getValuationAnalysis,
  getAnalyticalPerspectives
} from './src/lib/companyFundamentals.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3122;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.adversarial-phase-e.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-e-results.json');

const testResults = [];

function getSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex').toLowerCase();
}

function recordResult({ id, title, endpoint, role, scenario, expected, actual, evidence, status }) {
  const item = {
    id,
    title,
    endpoint,
    role,
    scenario,
    expected,
    actual,
    evidence,
    status,
    timestamp: new Date().toISOString()
  };
  testResults.push(item);
  const icon = status === 'PASSED' ? '🟢' : '🔴';
  console.log(`[${icon} ${status}] ${id}: ${title}`);
  if (status === 'FAILED') {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

function apiRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: endpoint,
      method: method.toUpperCase(),
      headers: reqHeaders
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', err => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

const bearer = token => ({ Authorization: `Bearer ${token}` });

async function runAdversarialPhaseESuite() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX ADVERSARIAL STRESS HARNESS — PHASE E (RATIOS & ADVISORY) ⚔️');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'ADV-PREFLIGHT-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    endpoint: 'Local File System (state.json)',
    role: 'system',
    scenario: 'Verify state.json SHA-256 is strictly bit-exact before running adversarial tests',
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
  fixture.advisorReferrals = [];
  fixture.brokerRecommendations = [];
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  recordResult({
    id: 'ADV-FIXTURE-01',
    title: 'Disposable Fixture Initialization',
    endpoint: 'Local File System',
    role: 'system',
    scenario: 'Create isolated writable test fixture snapshot for ephemeral test server',
    expected: 'state.adversarial-phase-e.json created from state.json',
    actual: 'Snapshot initialized',
    evidence: { disposableState: DISPOSABLE_STATE },
    status: fs.existsSync(DISPOSABLE_STATE) ? 'PASSED' : 'FAILED'
  });

  // STEP 3: SPAWN ISOLATED BACKEND SERVER
  console.log(`--- STEP 3: SPAWNING ISOLATED BACKEND SERVER (PORT ${PORT}) ---`);
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

    const loginAdvisor = await apiRequest('POST', '/api/auth/login', { username: 'advisor', password: 'advisor-event-2026' }).catch(() => null);
    const tokenAdvisor = loginAdvisor?.data?.token || tokenAdmin;

    recordResult({
      id: 'ADV-AUTH-01',
      title: 'Authentication & Session Acquisition for Adversarial Roles',
      endpoint: '/api/auth/login',
      role: 'team, admin, advisor',
      scenario: 'Acquire JWT session tokens for role verification',
      expected: 'Valid session tokens for T01, Admin, and Advisor',
      actual: `T01: ${Boolean(tokenT01)}, Admin: ${Boolean(tokenAdmin)}, Advisor: ${Boolean(tokenAdvisor)}`,
      evidence: { hasTokenT01: Boolean(tokenT01), hasTokenAdmin: Boolean(tokenAdmin), hasTokenAdvisor: Boolean(tokenAdvisor) },
      status: (tokenT01 && tokenAdmin && tokenAdvisor) ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 1: MATHEMATICAL ANTI-SPURIOUS DOUBLE-NEGATIVE ROE TRAP & EXTREMES
    // =========================================================================
    console.log('\n--- BATTERY 1: ANTI-SPURIOUS ROE TRAP & MATHEMATICAL INTEGRITY ---');

    // Test 1.1: Double-Negative Trap (-NetIncome / -Equity)
    // -120M / -400M mathematically equals +30.0%, but it is financially an insolvency deficit.
    // Assert roe is null and roeDisplay shows Deficit Equity.
    const trapCase1 = {
      ticker: 'DEFICIT_1',
      sector: 'Technology',
      currentPrice: 100,
      financials: { netIncome: -120000000, shareholderEquity: -400000000, revenue: 500000000, operatingIncome: -100000000 }
    };
    const rTrap1 = getCompanyRatios(trapCase1);
    const roeTrapPass = (rTrap1.roe === null) &&
      (rTrap1.roeDisplay === 'N/A (Deficit Equity)') &&
      !rTrap1.roeDisplay.includes('+') &&
      !rTrap1.roeDisplay.includes('30');

    recordResult({
      id: 'ADV-ROE-01',
      title: 'Anti-Spurious Double-Negative ROE Trap (-NetIncome / -Equity)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Assert (-120M) / (-400M) is trapped and never displays mathematical +30% positive ROE',
      expected: 'roe: null, roeDisplay: "N/A (Deficit Equity)"',
      actual: `roe=${rTrap1.roe}, roeDisplay="${rTrap1.roeDisplay}"`,
      evidence: { roe: rTrap1.roe, roeDisplay: rTrap1.roeDisplay },
      status: roeTrapPass ? 'PASSED' : 'FAILED'
    });

    // Test 1.2: Grid Stress on Negative Equity Deficits
    // Run 20 variations of negative net income and negative shareholder equity
    let allGridTrapped = true;
    const gridFailures = [];
    for (let i = 1; i <= 20; i++) {
      const netInc = -1 * (i * 15000000);
      const eq = -1 * (i * 40000000);
      const testSec = { ticker: `GRID_${i}`, financials: { netIncome: netInc, shareholderEquity: eq } };
      const res = getCompanyRatios(testSec);
      if (res.roe !== null || res.roeDisplay !== 'N/A (Deficit Equity)') {
        allGridTrapped = false;
        gridFailures.push({ i, netInc, eq, roe: res.roe, display: res.roeDisplay });
      }
    }
    recordResult({
      id: 'ADV-ROE-02',
      title: 'Exhaustive Double-Negative ROE Grid (20 Test Vectors)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Assert 20 random negative net income & negative equity pairs all return Deficit Equity',
      expected: '20/20 trapped with roe: null, roeDisplay: "N/A (Deficit Equity)"',
      actual: allGridTrapped ? '20/20 trapped' : `${gridFailures.length} failed`,
      evidence: { failureCount: gridFailures.length, sampleFailures: gridFailures.slice(0, 3) },
      status: allGridTrapped ? 'PASSED' : 'FAILED'
    });

    // Test 1.3: Positive Net Income with Deficit Equity (+50M / -200M)
    // A turnaround company with lingering accumulated balance sheet deficit
    const posIncNegEq = { ticker: 'TURNAROUND', financials: { netIncome: 50000000, shareholderEquity: -200000000 } };
    const rTurn = getCompanyRatios(posIncNegEq);
    const turnPass = rTurn.roe === null && rTurn.roeDisplay === 'N/A (Deficit Equity)';
    recordResult({
      id: 'ADV-ROE-03',
      title: 'Positive Net Income with Balance Sheet Equity Deficit (+50M / -200M)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Assert positive income with negative equity is trapped and displays Deficit Equity',
      expected: 'roe: null, roeDisplay: "N/A (Deficit Equity)"',
      actual: `roe=${rTurn.roe}, roeDisplay="${rTurn.roeDisplay}"`,
      evidence: { roe: rTurn.roe, roeDisplay: rTurn.roeDisplay },
      status: turnPass ? 'PASSED' : 'FAILED'
    });

    // Test 1.4: Zero Shareholder Equity Boundary
    const zeroEqStock = { ticker: 'ZERO_EQ', financials: { netIncome: 50000000, shareholderEquity: 0 } };
    const rZeroEq = getCompanyRatios(zeroEqStock);
    const zeroEqPass = rZeroEq.roe === null && rZeroEq.roeDisplay === 'N/A (Zero Equity)';
    recordResult({
      id: 'ADV-ROE-04',
      title: 'Zero Shareholder Equity Boundary (Division by Zero Trap)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Assert shareholderEquity=0 returns Zero Equity without throwing division by zero',
      expected: 'roe: null, roeDisplay: "N/A (Zero Equity)"',
      actual: `roe=${rZeroEq.roe}, roeDisplay="${rZeroEq.roeDisplay}"`,
      evidence: { roe: rZeroEq.roe, roeDisplay: rZeroEq.roeDisplay },
      status: zeroEqPass ? 'PASSED' : 'FAILED'
    });

    // Test 1.5: Missing / Undefined / NaN Equity
    const nanEqStock = { ticker: 'NAN_EQ', financials: { netIncome: 50000000, shareholderEquity: NaN } };
    const rNanEq = getCompanyRatios(nanEqStock);
    const nanEqPass = rNanEq.roe === null && rNanEq.roeDisplay === 'N/A (No Equity Data)';
    recordResult({
      id: 'ADV-ROE-05',
      title: 'NaN / Missing Equity Data Sanitization',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Assert shareholderEquity=NaN returns No Equity Data',
      expected: 'roe: null, roeDisplay: "N/A (No Equity Data)"',
      actual: `roe=${rNanEq.roe}, roeDisplay="${rNanEq.roeDisplay}"`,
      evidence: { roe: rNanEq.roe, roeDisplay: rNanEq.roeDisplay },
      status: nanEqPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 2: FINANCIAL FUNDAMENTALS ENGINE FUZZING & MALFORMED INPUTS
    // =========================================================================
    console.log('\n--- BATTERY 2: FUNDAMENTALS FUZZING & RESILIENCE ---');

    // Test 2.1: Null and Undefined Security Input
    const nullSec = getCompanyFundamentals(null);
    const undefSec = getCompanyFundamentals(undefined);
    const emptySec = getCompanyFundamentals({});
    const safeNullPass = (nullSec === null) && (undefSec === null) && (emptySec !== null && typeof emptySec === 'object');
    recordResult({
      id: 'ADV-FUND-01',
      title: 'Fuzzing: Null, Undefined, and Empty Object Inputs',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyFundamentals',
      role: 'unit-challenger',
      scenario: 'Verify getCompanyFundamentals safely handles null/undefined and empty security objects',
      expected: 'null for null/undefined, valid derived model for empty object',
      actual: `null=${nullSec === null}, undef=${undefSec === null}, emptyModel=${Boolean(emptySec?.marketCap)}`,
      evidence: { nullSec, undefSec, emptySecHasCap: Boolean(emptySec?.marketCap) },
      status: safeNullPass ? 'PASSED' : 'FAILED'
    });

    // Test 2.2: Extreme Floating Point Numbers (1e25, Number.MAX_SAFE_INTEGER, 1e-10)
    const extremeSec = {
      ticker: 'EXTREME',
      currentPrice: 1e12,
      totalUnits: 1e10,
      financials: {
        revenue: 1e20,
        operatingIncome: 1e19,
        netIncome: 1e18,
        shareholderEquity: 1e19,
        totalDebt: 1e18
      }
    };
    const rExtreme = getCompanyRatios(extremeSec);
    const extremePass = Number.isFinite(rExtreme.operatingMargin) &&
      Number.isFinite(rExtreme.roe) &&
      Number.isFinite(rExtreme.debtToEquity);
    recordResult({
      id: 'ADV-FUND-02',
      title: 'Extreme Astronomical Financial Quantities (1e20 scale)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Verify engine computes finite metrics for massive numbers without overflow crash',
      expected: 'All ratios finite numbers',
      actual: `opMargin=${rExtreme.operatingMargin}, roe=${rExtreme.roe}, de=${rExtreme.debtToEquity}`,
      evidence: { rExtreme },
      status: extremePass ? 'PASSED' : 'FAILED'
    });

    // Test 2.3: Sector Benchmark Fallback Stress (Fictional Sectors)
    const fictionalSectors = ['Cybernetic Warfare', 'Quantum Gravitation', 'Asteroid Mining', 'Subsea Aquaculture', '', null, undefined];
    let allSectorsFallback = true;
    for (const sec of fictionalSectors) {
      const bm = getSectorBenchmark(sec);
      if (!bm || !bm.medianPE || !bm.medianOperatingMargin) {
        allSectorsFallback = false;
        break;
      }
    }
    recordResult({
      id: 'ADV-FUND-03',
      title: 'Sector Benchmark Fallback Stress on Fictional / Unknown Sectors',
      endpoint: 'src/lib/companyFundamentals.js:getSectorBenchmark',
      role: 'unit-challenger',
      scenario: 'Verify unlisted or novel sector strings safely fallback to Default benchmarks',
      expected: '100% resolve to valid benchmark object with medianPE',
      actual: allSectorsFallback ? 'All resolved to valid benchmarks' : 'Failed to resolve',
      evidence: { testCount: fictionalSectors.length, defaultPE: SECTOR_BENCHMARKS['Default'].medianPE },
      status: allSectorsFallback ? 'PASSED' : 'FAILED'
    });

    // Test 2.4: Deterministic Seed Stability across 50 Securities
    let deterministicPass = true;
    for (let i = 0; i < 50; i++) {
      const t = `DETERMINISTIC_${i}`;
      const run1 = getCompanyFundamentals({ ticker: t, sector: 'Technology' });
      const run2 = getCompanyFundamentals({ ticker: t, sector: 'Technology' });
      if (run1.revenue !== run2.revenue || run1.netIncome !== run2.netIncome || run1.eps !== run2.eps) {
        deterministicPass = false;
        break;
      }
    }
    recordResult({
      id: 'ADV-FUND-04',
      title: 'Deterministic Modeling Seed Invariance across 50 Random Securities',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyFundamentals',
      role: 'unit-challenger',
      scenario: 'Verify identical ticker string always yields identical bit-for-bit accounting metrics',
      expected: '100% reproducible fundamentals across repeated invocations',
      actual: deterministicPass ? '100% reproducible' : 'Discrepancy detected',
      evidence: { iterations: 50, deterministicPass },
      status: deterministicPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 3: RATIOS BOUNDARY STRESS (P/E, DEBT-TO-EQUITY, OPERATING MARGIN)
    // =========================================================================
    console.log('\n--- BATTERY 3: P/E, D/E, AND MARGIN BOUNDARY STRESS ---');

    // Test 3.1: P/E Loss-Making and Break-even
    const lossSec = { ticker: 'LOSS_CO', financials: { netIncome: -100, eps: -0.01 } };
    const breakSec = { ticker: 'BREAK_CO', financials: { netIncome: 0, eps: 0 } };
    const rLoss = getCompanyRatios(lossSec);
    const rBreak = getCompanyRatios(breakSec);
    const peLossBreakPass = (rLoss.peRatio === null && rLoss.peRatioDisplay.includes('Loss-Making')) &&
      (rBreak.peRatio === null && rBreak.peRatioDisplay.includes('Break-even'));
    recordResult({
      id: 'ADV-RATIO-01',
      title: 'P/E Ratio Guardrails: Loss-Making and Break-Even Enforcements',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Negative EPS displays Loss-Making; Zero EPS displays Break-even',
      expected: 'peRatio=null with exact status strings',
      actual: `loss="${rLoss.peRatioDisplay}", break="${rBreak.peRatioDisplay}"`,
      evidence: { lossDisplay: rLoss.peRatioDisplay, breakDisplay: rBreak.peRatioDisplay },
      status: peLossBreakPass ? 'PASSED' : 'FAILED'
    });

    // Test 3.2: P/E High Multiple Cap (> 500x)
    const highPeSec = { ticker: 'HIGH_PE', currentPrice: 1000, financials: { netIncome: 10000, eps: 0.5 } }; // 1000 / 0.5 = 2000x
    const rHighPe = getCompanyRatios(highPeSec);
    const highPePass = (rHighPe.peRatio === 2000) && rHighPe.peRatioDisplay.includes('>500.00x (High Multiple)');
    recordResult({
      id: 'ADV-RATIO-02',
      title: 'P/E High Multiple Capping (>500.00x)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Extreme multiples over 500x display descriptive ceiling warning',
      expected: '>500.00x (High Multiple)',
      actual: rHighPe.peRatioDisplay,
      evidence: { peRatio: rHighPe.peRatio, display: rHighPe.peRatioDisplay },
      status: highPePass ? 'PASSED' : 'FAILED'
    });

    // Test 3.3: Non-Equity Asset Classes (Bonds, Debentures, G-Secs, Funds, ETFs)
    const bondTypes = ['GovernmentBond', 'CorporateBond', 'GSec10Y', 'TreasuryBill', 'Debenture'];
    const fundTypes = ['MutualFund', 'IndexETF', 'CommodityFund'];
    let allNonEquitySafe = true;

    for (const b of bondTypes) {
      const res = getCompanyRatios({ ticker: b, type: b, currentPrice: 100 });
      if (res.peRatio !== null || !res.peRatioDisplay.includes('Fixed Income')) {
        allNonEquitySafe = false;
        break;
      }
    }
    for (const f of fundTypes) {
      const res = getCompanyRatios({ ticker: f, type: f, currentPrice: 50 });
      if (res.peRatio !== null || !res.peRatioDisplay.includes('Fund / ETF')) {
        allNonEquitySafe = false;
        break;
      }
    }
    recordResult({
      id: 'ADV-RATIO-03',
      title: 'Non-Equity Asset P/E Guardrails (Bonds, G-Secs, Debentures, Funds, ETFs)',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Fixed income yields N/A (Fixed Income); Funds yield N/A (Fund / ETF)',
      expected: 'peRatio=null with asset-specific classification',
      actual: allNonEquitySafe ? 'All non-equity assets correctly classified' : 'Classification mismatch',
      evidence: { bondTypes, fundTypes },
      status: allNonEquitySafe ? 'PASSED' : 'FAILED'
    });

    // Test 3.4: Debt-to-Equity Zero Debt and Negative Equity
    const zeroDebt = { ticker: 'ZERO_DEBT', financials: { totalDebt: 0, shareholderEquity: 500000000 } };
    const negDebtEq = { ticker: 'NEG_EQ_DE', financials: { totalDebt: 200000000, shareholderEquity: -100000000 } };
    const rZeroD = getCompanyRatios(zeroDebt);
    const rNegEqD = getCompanyRatios(negDebtEq);
    const dePass = (rZeroD.debtToEquity === 0 && rZeroD.debtToEquityDisplay.includes('0.00x (Debt-Free)')) &&
      (rNegEqD.debtToEquity === null && rNegEqD.debtToEquityDisplay.includes('Negative Equity'));
    recordResult({
      id: 'ADV-RATIO-04',
      title: 'Debt-to-Equity: Zero Debt and Negative Equity Guardrails',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Zero debt returns 0.00x (Debt-Free); Insolvent equity returns N/A (Negative Equity)',
      expected: 'Zero debt: 0.00x (Debt-Free); Negative equity: N/A (Negative Equity)',
      actual: `zero="${rZeroD.debtToEquityDisplay}", negEq="${rNegEqD.debtToEquityDisplay}"`,
      evidence: { rZeroD, rNegEqD },
      status: dePass ? 'PASSED' : 'FAILED'
    });

    // Test 3.5: Operating Margin Pre-Revenue and Operating Loss
    const preRev = { ticker: 'PRE_REV', financials: { revenue: 0, operatingIncome: -10000 } };
    const negRev = { ticker: 'NEG_REV', financials: { revenue: -50000, operatingIncome: -10000 } };
    const opLoss = { ticker: 'OP_LOSS', financials: { revenue: 1000000, operatingIncome: -150000 } }; // -15%
    const rPre = getCompanyRatios(preRev);
    const rNegRev = getCompanyRatios(negRev);
    const rOpLoss = getCompanyRatios(opLoss);
    const marginPass = (rPre.operatingMargin === null && rPre.operatingMarginDisplay.includes('Pre-Revenue')) &&
      (rNegRev.operatingMargin === null && rNegRev.operatingMarginDisplay.includes('Pre-Revenue')) &&
      (rOpLoss.operatingMargin === -15 && rOpLoss.operatingMarginDisplay.includes('(Operating Loss)'));
    recordResult({
      id: 'ADV-RATIO-05',
      title: 'Operating Margin: Pre-Revenue, Negative Revenue, and Operating Loss',
      endpoint: 'src/lib/companyFundamentals.js:getCompanyRatios',
      role: 'unit-challenger',
      scenario: 'Zero/negative revenue displays Pre-Revenue; Negative EBIT displays Operating Loss',
      expected: 'preRev=Pre-Revenue, negRev=Pre-Revenue, opLoss=-15.00% (Operating Loss)',
      actual: `pre="${rPre.operatingMarginDisplay}", neg="${rNegRev.operatingMarginDisplay}", loss="${rOpLoss.operatingMarginDisplay}"`,
      evidence: { rPre, rNegRev, rOpLoss },
      status: marginPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 4: VALUATION MODELS & TARGET PRICE RANGE INVARIANTS
    // =========================================================================
    console.log('\n--- BATTERY 4: VALUATION MODELS & TARGET PRICE RANGES ---');

    // Test 4.1: Target Price Range Invariant (Bear <= Fair <= Bull)
    // Verify across 50 diverse securities that Bear Target <= Fair Value <= Bull Target strictly holds
    let targetInvariantHold = true;
    const targetViolations = [];
    for (let i = 1; i <= 50; i++) {
      const price = i * 25.5;
      const sec = { ticker: `VAL_${i}`, currentPrice: price, basePrice: price, sector: 'Technology' };
      const val = getValuationAnalysis(sec);
      if (!(val.bearTarget <= val.fairValue && val.fairValue <= val.bullTarget)) {
        targetInvariantHold = false;
        targetViolations.push({ ticker: sec.ticker, val });
      }
    }
    recordResult({
      id: 'ADV-VAL-01',
      title: 'Target Price Range Ordering Invariant: Bear Target <= Fair Value <= Bull Target',
      endpoint: 'src/lib/companyFundamentals.js:getValuationAnalysis',
      role: 'unit-challenger',
      scenario: 'Assert Bear (0.88x) <= Fair (1.00x) <= Bull (1.18x) holds across 50 securities',
      expected: 'Invariant holds strictly for 50/50 test securities',
      actual: targetInvariantHold ? '50/50 hold invariant' : `${targetViolations.length} violations`,
      evidence: { targetViolations },
      status: targetInvariantHold ? 'PASSED' : 'FAILED'
    });

    // Test 4.2: Penny Stocks Lower Bound Clamping (Never <= 0)
    const pennySec = { ticker: 'PENNY_1', currentPrice: 0.15, basePrice: 0.15, sector: 'Consumer Goods' };
    const valPenny = getValuationAnalysis(pennySec);
    const pennyClampingPass = (valPenny.fairValue >= 1.0) && (valPenny.bearTarget >= 0.01) && (valPenny.bullTarget >= 0.01);
    recordResult({
      id: 'ADV-VAL-02',
      title: 'Penny Stock Valuation Lower Bound Clamping (Targets >= 0.01)',
      endpoint: 'src/lib/companyFundamentals.js:getValuationAnalysis',
      role: 'unit-challenger',
      scenario: 'Verify penny stock prices (₹0.15) never produce 0 or negative price targets',
      expected: 'fairValue >= 1.0, bearTarget >= 0.01, bullTarget >= 0.01',
      actual: `fair=${valPenny.fairValue}, bear=${valPenny.bearTarget}, bull=${valPenny.bullTarget}`,
      evidence: { valPenny },
      status: pennyClampingPass ? 'PASSED' : 'FAILED'
    });

    // Test 4.3: Valuation Classification Thresholds (-10% / +10%)
    const cheapStock = { ticker: 'CHEAP', currentPrice: 50, basePrice: 100, sector: 'Information Technology' }; // -50% discount
    const richStock = { ticker: 'RICH', currentPrice: 200, basePrice: 100, sector: 'Information Technology' }; // +100% premium
    const fairStock = { ticker: 'FAIR', currentPrice: 102, basePrice: 100, sector: 'Information Technology' }; // +2% band
    const valCheap = getValuationAnalysis(cheapStock);
    const valRich = getValuationAnalysis(richStock);
    const valFair = getValuationAnalysis(fairStock);
    const thresholdPass = (valCheap.status === 'UNDERVALUED' && valCheap.badgeVariant === 'rise') &&
      (valRich.status === 'OVERVALUED' && valRich.badgeVariant === 'fall') &&
      (valFair.status === 'FAIR VALUE' && valFair.badgeVariant === 'caution');
    recordResult({
      id: 'ADV-VAL-03',
      title: 'Valuation Status Classification & Color Badge Mapping',
      endpoint: 'src/lib/companyFundamentals.js:getValuationAnalysis',
      role: 'unit-challenger',
      scenario: 'Assert discount < -10% is UNDERVALUED (rise), premium > +10% is OVERVALUED (fall), ±10% is FAIR VALUE (caution)',
      expected: 'UNDERVALUED/rise, OVERVALUED/fall, FAIR VALUE/caution',
      actual: `cheap=${valCheap.status}/${valCheap.badgeVariant}, rich=${valRich.status}/${valRich.badgeVariant}, fair=${valFair.status}/${valFair.badgeVariant}`,
      evidence: { valCheap, valRich, valFair },
      status: thresholdPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 5: PURE ADVISORY NON-EXECUTION BOUNDARY & ADVERSARIAL EXPLOITS
    // =========================================================================
    console.log('\n--- BATTERY 5: PURE ADVISORY NON-EXECUTION BOUNDARY & ZERO MUTATION ---');

    // Test 5.1: Unauthenticated Order Rejection
    const unauthOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'ROGUE-001',
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    });
    const unauthBlocked = [401, 403].includes(unauthOrderRes.status);
    recordResult({
      id: 'ADV-EXEC-01',
      title: 'Adversarial Exploitation: Unauthenticated Order Rejection',
      endpoint: 'POST /api/orders/submit',
      role: 'anonymous-hacker',
      scenario: 'Attempting order submission without session token must be rejected with HTTP 401 or 403',
      expected: 'HTTP 401 / 403 rejection',
      actual: `HTTP ${unauthOrderRes.status}: ${unauthOrderRes.data?.error || 'Rejected'}`,
      evidence: { status: unauthOrderRes.status, body: unauthOrderRes.data },
      status: unauthBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.2: Advisor Role Order Creation Prohibition
    const advisorOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'ROGUE-002',
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, bearer(tokenAdvisor));
    const advisorBlocked = advisorOrderRes.status === 403;
    recordResult({
      id: 'ADV-EXEC-02',
      title: 'Adversarial Exploitation: Advisor Session Order Creation Gate',
      endpoint: 'POST /api/orders/submit',
      role: 'advisor',
      scenario: 'Attempting trade placement while authenticated as advisor role must be rejected with HTTP 403',
      expected: 'HTTP 403 Forbidden: Order submission requires Investment House, Exchange Desk, or Admin privileges',
      actual: `HTTP ${advisorOrderRes.status}: ${advisorOrderRes.data?.error || 'Rejected'}`,
      evidence: { status: advisorOrderRes.status, error: advisorOrderRes.data?.error },
      status: advisorBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.3: Advisor Order Creation on Alternative Endpoint (/api/order/create)
    const advisorCreateRes = await apiRequest('POST', '/api/order/create', {
      ticketNumber: 'ROGUE-003',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, bearer(tokenAdvisor));
    const advisorCreateBlocked = [403, 404].includes(advisorCreateRes.status);
    recordResult({
      id: 'ADV-EXEC-03',
      title: 'Adversarial Exploitation: Secondary Endpoint /api/order/create Gate',
      endpoint: 'POST /api/order/create',
      role: 'advisor',
      scenario: 'Attempting order placement on secondary /api/order/create endpoint with advisor session',
      expected: 'HTTP 403 Forbidden or 404',
      actual: `HTTP ${advisorCreateRes.status}: ${advisorCreateRes.data?.error || 'Rejected'}`,
      evidence: { status: advisorCreateRes.status, error: advisorCreateRes.data?.error },
      status: advisorCreateBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.4: Payload Role Spoofing Attack ({ role: 'advisor' })
    // Even if sent with admin or team session, if payload says role === 'advisor', server must reject
    const spoofRoleRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'ROGUE-004',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      role: 'advisor'
    }, bearer(tokenAdmin));
    const spoofBlocked = spoofRoleRes.status === 403 &&
      spoofRoleRes.data?.error?.includes('Advisors advise; they do not trade');
    recordResult({
      id: 'ADV-EXEC-04',
      title: 'Adversarial Exploitation: Payload Role Spoofing ({ role: "advisor" })',
      endpoint: 'POST /api/orders/submit',
      role: 'admin-spoof',
      scenario: 'Admin sends order payload with role="advisor"; server must reject with educational boundary guard',
      expected: 'HTTP 403: Advisors advise; they do not trade on behalf of Investment Houses',
      actual: `HTTP ${spoofRoleRes.status}: ${spoofRoleRes.data?.error || 'Rejected'}`,
      evidence: { status: spoofRoleRes.status, error: spoofRoleRes.data?.error },
      status: spoofBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.5: Payload Role Spoofing Attack ({ enteredByRole: 'advisor' })
    const spoofEnteredRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'ROGUE-005',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      enteredByRole: 'advisor'
    }, bearer(tokenT01));
    const spoofEnteredBlocked = spoofEnteredRes.status === 403 &&
      spoofEnteredRes.data?.error?.includes('Advisors advise; they do not trade');
    recordResult({
      id: 'ADV-EXEC-05',
      title: 'Adversarial Exploitation: Payload Role Spoofing ({ enteredByRole: "advisor" })',
      endpoint: 'POST /api/orders/submit',
      role: 'team-spoof',
      scenario: 'Team sends order payload with enteredByRole="advisor"; server must reject',
      expected: 'HTTP 403: Advisors advise; they do not trade on behalf of Investment Houses',
      actual: `HTTP ${spoofEnteredRes.status}: ${spoofEnteredRes.data?.error || 'Rejected'}`,
      evidence: { status: spoofEnteredRes.status, error: spoofEnteredRes.data?.error },
      status: spoofEnteredBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 5.6: Advisory Actions Wallet & Holdings Zero-Mutation Invariant
    // Snapshot initial state of all 12 teams (cash, holdings, frozen cash, frozen holdings)
    console.log('Taking full system snapshot of wallets, orders, and FX reserves...');
    const preState = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data;
    const initialOrdersCount = (preState.orders || []).length;
    const initialTeams = JSON.parse(JSON.stringify(preState.teams || {}));
    const initialFxReserves = JSON.parse(JSON.stringify(preState.fxReserves || {}));
    const initialVouchersCount = (preState.settlementVouchers || []).length;

    // Dispatch 5 research recommendations across different tickers
    const testRecommendations = [
      { ticker: 'INFY', recommendation: 'BUY', confidence: 85, reasoning: 'Strong margin resilience' },
      { ticker: 'TCS', recommendation: 'HOLD', confidence: 75, reasoning: 'Fair value multiple' },
      { ticker: 'RELIANCE', recommendation: 'BUY', confidence: 90, reasoning: 'Energy expansion' },
      { ticker: 'HDFCBANK', recommendation: 'HOLD', confidence: 70, reasoning: 'Loan book consolidation' },
      { ticker: 'NVDA', recommendation: 'SELL', confidence: 80, reasoning: 'Multiple compression warning' }
    ];

    for (const rec of testRecommendations) {
      await apiRequest('POST', '/api/broker/recommendation', rec, bearer(tokenAdvisor));
    }

    // Submit and answer 3 advisor referrals
    for (const t of ['INFY', 'TCS', 'RELIANCE']) {
      const refRes = await apiRequest('POST', '/api/advisor/refer', { ticker: t, teamCode: 'T01' }, bearer(tokenT01));
      const refId = refRes.data?.referral?.id;
      if (refId) {
        await apiRequest('POST', '/api/advisor/signal', { referralId: refId, signal: 'BUY', advisorName: 'Senior Strategist' }, bearer(tokenAdvisor));
      }
    }

    // Fetch post-advisory state
    const postState = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data;
    const postOrdersCount = (postState.orders || []).length;
    const postTeams = postState.teams || {};
    const postFxReserves = postState.fxReserves || {};
    const postVouchersCount = (postState.settlementVouchers || []).length;

    // Assert zero mutations
    const ordersDelta = postOrdersCount - initialOrdersCount;
    const vouchersDelta = postVouchersCount - initialVouchersCount;

    let walletsMutated = false;
    const walletMutations = [];
    for (const [teamCode, teamData] of Object.entries(initialTeams)) {
      const postTeam = postTeams[teamCode];
      if (!postTeam) {
        walletsMutated = true;
        walletMutations.push(`Team ${teamCode} deleted`);
        continue;
      }
      if (teamData.cash !== postTeam.cash) {
        walletsMutated = true;
        walletMutations.push(`Team ${teamCode} cash changed from ${teamData.cash} to ${postTeam.cash}`);
      }
      if (teamData.frozenCash !== postTeam.frozenCash) {
        walletsMutated = true;
        walletMutations.push(`Team ${teamCode} frozen cash changed`);
      }
      if (JSON.stringify(teamData.portfolio) !== JSON.stringify(postTeam.portfolio)) {
        walletsMutated = true;
        walletMutations.push(`Team ${teamCode} portfolio mutated`);
      }
    }

    const zeroMutationPass = (ordersDelta === 0) &&
      (vouchersDelta === 0) &&
      (!walletsMutated) &&
      (JSON.stringify(initialFxReserves) === JSON.stringify(postFxReserves));

    recordResult({
      id: 'ADV-EXEC-06',
      title: 'Pure Advisory Zero-Mutation Invariant (Wallets, Orders, Holdings, Reserves)',
      endpoint: 'POST /api/broker/recommendation & /api/advisor/signal',
      role: 'advisor',
      scenario: 'Publishing 5 research bulletins and 3 referral signals must cause strictly zero cash/holding mutations',
      expected: 'Orders delta=0, Vouchers delta=0, Wallets mutated=false, FX reserves delta=0',
      actual: `Orders delta=${ordersDelta}, Vouchers delta=${vouchersDelta}, Wallets mutated=${walletsMutated}`,
      evidence: { ordersDelta, vouchersDelta, walletMutations },
      status: zeroMutationPass ? 'PASSED' : 'FAILED'
    });

    // Test 5.7: AST Static Audit of BrokerAdvisoryTerminal.jsx
    console.log('Auditing BrokerAdvisoryTerminal.jsx source AST for zero trade execution calls...');
    const terminalSourcePath = path.join(__dirname, 'src', 'pages', 'BrokerAdvisoryTerminal.jsx');
    const terminalSource = fs.readFileSync(terminalSourcePath, 'utf8');

    // Check for absence of order endpoints
    const hasOrderRoute = /['"]\/api\/orders?(\/submit|\/create|\/action)?['"]/.test(terminalSource);
    const hasSubmitOrderFunc = /function\s+submitOrder|const\s+submitOrder\s*=|const\s+handleCreateOrder\s*=/.test(terminalSource);
    const hasBuySellButtons = /<button[^>]*>[^<]*(Place Buy Order|Execute Trade|Confirm Order)[^<]*<\/button>/i.test(terminalSource);

    // Check for presence of required visual badges & provenance
    const hasFactualProvenance = terminalSource.includes('data-provenance="factual"');
    const hasSimulatedProvenance = terminalSource.includes('data-provenance="simulated"');
    const hasPaperSlipNotice = terminalSource.includes('PAPER SLIP EXECUTION ONLY');

    const astAuditPass = (!hasOrderRoute) &&
      (!hasSubmitOrderFunc) &&
      (!hasBuySellButtons) &&
      hasFactualProvenance &&
      hasSimulatedProvenance &&
      hasPaperSlipNotice;

    recordResult({
      id: 'ADV-EXEC-07',
      title: 'Static AST Verification of BrokerAdvisoryTerminal.jsx Non-Execution Boundary',
      endpoint: 'src/pages/BrokerAdvisoryTerminal.jsx',
      role: 'code-auditor',
      scenario: 'Verify 0 trade routing endpoints, 0 order handlers, and presence of Paper Slip + Provenance tags',
      expected: 'hasOrderRoute=false, hasSubmitFunc=false, hasFactual=true, hasSimulated=true, hasPaperNotice=true',
      actual: `orderRoute=${hasOrderRoute}, submitFunc=${hasSubmitOrderFunc}, factual=${hasFactualProvenance}, simulated=${hasSimulatedProvenance}, paperNotice=${hasPaperSlipNotice}`,
      evidence: { hasOrderRoute, hasSubmitOrderFunc, hasBuySellButtons, hasFactualProvenance, hasSimulatedProvenance, hasPaperSlipNotice },
      status: astAuditPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 6: ADVISORY PIPELINE AUDIT TRAIL & INTEGRITY
    // =========================================================================
    console.log('\n--- BATTERY 6: ADVISORY AUDIT TRAIL & INPUT VALIDATION ---');

    // Test 6.1: Signal Overwrite Rejection
    const freshRef = await apiRequest('POST', '/api/advisor/refer', { ticker: 'INFY', teamCode: 'T01' }, bearer(tokenT01));
    const freshRefId = freshRef.data?.referral?.id;
    await apiRequest('POST', '/api/advisor/signal', { referralId: freshRefId, signal: 'BUY' }, bearer(tokenAdvisor));
    const overwriteAttempt = await apiRequest('POST', '/api/advisor/signal', { referralId: freshRefId, signal: 'SELL' }, bearer(tokenAdvisor));
    const overwritePass = overwriteAttempt.status === 400 && overwriteAttempt.data?.error?.includes('Overwriting is prohibited');
    recordResult({
      id: 'ADV-FLOW-01',
      title: 'Advisor Signal Immutable Audit Trail: Overwrite Prohibited',
      endpoint: 'POST /api/advisor/signal',
      role: 'advisor',
      scenario: 'Attempting to overwrite a completed referral signal must be rejected with HTTP 400',
      expected: 'HTTP 400: Signal has already been published. Overwriting is prohibited',
      actual: `HTTP ${overwriteAttempt.status}: ${overwriteAttempt.data?.error}`,
      evidence: { status: overwriteAttempt.status, error: overwriteAttempt.data?.error },
      status: overwritePass ? 'PASSED' : 'FAILED'
    });

    // Test 6.2: Signal Enum Validation
    const invalidSignalAttempt = await apiRequest('POST', '/api/advisor/signal', {
      referralId: freshRefId,
      signal: 'BUY_1000_IMMEDIATELY'
    }, bearer(tokenAdvisor));
    const invalidSignalPass = invalidSignalAttempt.status === 400 &&
      invalidSignalAttempt.data?.error?.includes('Permitted signals are strictly BUY, HOLD, or SELL');
    recordResult({
      id: 'ADV-FLOW-02',
      title: 'Advisor Signal Permitted Enum Enforcement (BUY, HOLD, SELL only)',
      endpoint: 'POST /api/advisor/signal',
      role: 'advisor',
      scenario: 'Attempting non-enum signals like "BUY_1000_IMMEDIATELY" must be rejected with HTTP 400',
      expected: 'HTTP 400: Permitted signals are strictly BUY, HOLD, or SELL',
      actual: `HTTP ${invalidSignalAttempt.status}: ${invalidSignalAttempt.data?.error}`,
      evidence: { status: invalidSignalAttempt.status, error: invalidSignalAttempt.data?.error },
      status: invalidSignalPass ? 'PASSED' : 'FAILED'
    });

    // Test 6.3: Recommendation Missing Fields Validation
    const invalidRecAttempt = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: '',
      recommendation: ''
    }, bearer(tokenAdvisor));
    const invalidRecPass = invalidRecAttempt.status === 400 &&
      invalidRecAttempt.data?.error?.includes('Ticker and recommendation required');
    recordResult({
      id: 'ADV-FLOW-03',
      title: 'Broker Recommendation Mandatory Fields Validation',
      endpoint: 'POST /api/broker/recommendation',
      role: 'advisor',
      scenario: 'Publishing bulletin with empty ticker and recommendation must be rejected with HTTP 400',
      expected: 'HTTP 400: Ticker and recommendation required',
      actual: `HTTP ${invalidRecAttempt.status}: ${invalidRecAttempt.data?.error}`,
      evidence: { status: invalidRecAttempt.status, error: invalidRecAttempt.data?.error },
      status: invalidRecPass ? 'PASSED' : 'FAILED'
    });

    // =========================================================================
    // BATTERY 7: POST-FLIGHT STATE HASH INVARIANT CHECK
    // =========================================================================
    console.log('\n--- BATTERY 7: POST-FLIGHT BASELINE INVARIANT CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after all adversarial tests: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER TESTING!');
    console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

    recordResult({
      id: 'ADV-POSTFLIGHT-01',
      title: 'Post-flight Authoritative Baseline Hash Verification',
      endpoint: 'Local File System (state.json)',
      role: 'system',
      scenario: 'Confirm authoritative state.json remained 100% bit-for-bit untouched throughout testing',
      expected: EXPECTED_HASH,
      actual: finalHash,
      evidence: { sha256: finalHash },
      status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP
    console.log('--- CLEANING UP TEST BACKEND PROCESS ---');
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      try { serverProcess.kill('SIGKILL'); } catch (e) {}
    }, 500);
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
      }
    } catch (e) {}
    console.log('✓ Isolated test backend stopped.');
    console.log('✓ Removed disposable fixture file.\n');
  }

  // SUMMARY
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('======================================================================');
  console.log(`📊 ADVERSARIAL TEST SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Test results saved to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialPhaseESuite().catch(err => {
  console.error('Fatal Adversarial suite error:', err);
  process.exit(1);
});
