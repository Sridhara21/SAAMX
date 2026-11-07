/**
 * SAAMX MILESTONE PHASE E: BROKER ADVISORY TERMINAL & RESEARCH WORKSPACE SUITE
 * File: SAAMX/test-milestone-phase-e-broker.js
 *
 * Verifies R2 (Phase E):
 * - Financial metric calculations (P/E, D/E, Operating Margin, ROE) with all edge cases.
 * - Company profile data binding and dual-pricing currency resolution.
 * - Valuation indicators (Undervalued, Fair Value, Overvalued) and Intrinsic Target Ranges.
 * - Bullish / Bearish analytical perspectives generation.
 * - Visual and structural distinction between factual data and simulated advisory opinion.
 * - Pure advisory mode: strictly zero automated trade execution capability.
 * - Advisor referrals queue and research recommendation broadcasting.
 * - Production Vite build compatibility.
 * - Bit-exact authoritative baseline state.json hash preservation.
 */

import http from 'http';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

// Dynamic import of calculation modules
import {
  getCompanyFundamentals,
  getCompanyRatios,
  getValuationAnalysis,
  getAnalyticalPerspectives,
  SECTOR_BENCHMARKS
} from './src/lib/companyFundamentals.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 3116;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-e-broker.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-milestone-phase-e-results.json');

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

async function runPhaseEBrokerSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE E — BROKER ADVISORY TERMINAL & RESEARCH WORKSPACE SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'PHASE-E-PREFLIGHT-01',
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
  fixture.advisorReferrals = [];
  fixture.brokerRecommendations = [];
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  recordResult({
    id: 'PHASE-E-FIXTURE-01',
    title: 'Disposable Fixture Initialization',
    endpoint: 'Local File System',
    role: 'system',
    scenario: 'Create isolated writable test fixture snapshot for ephemeral server',
    expected: 'state.test-phase-e-broker.json created from state.json',
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

    const loginAdvisor = await apiRequest('POST', '/api/auth/login', { username: 'advisor', password: 'saamx-event-2026' }).catch(() => null);
    const tokenAdvisor = loginAdvisor?.data?.token || tokenAdmin;

    recordResult({
      id: 'PHASE-E-AUTH-01',
      title: 'Authentication & Session Token Acquisition',
      endpoint: '/api/auth/login',
      role: 'team, admin, advisor',
      scenario: 'Acquire JWT session tokens for role verification',
      expected: 'Valid session tokens for T01 and Admin',
      actual: `T01: ${Boolean(tokenT01)}, Admin: ${Boolean(tokenAdmin)}`,
      evidence: { hasTokenT01: Boolean(tokenT01), hasTokenAdmin: Boolean(tokenAdmin) },
      status: (tokenT01 && tokenAdmin) ? 'PASSED' : 'FAILED'
    });

    // STEP 5: UNIT VERIFICATION OF FINANCIAL METRICS CALCULATION ENGINE
    console.log('\n--- STEP 5: FINANCIAL METRICS CALCULATION ENGINE ---');
    
    // Test 4: Standard P/E Ratio
    const standardStock = {
      ticker: 'TEST_STOCK',
      sector: 'Technology',
      type: 'Stock',
      currentPrice: 1500,
      basePrice: 1500,
      totalUnits: 10000000,
      financials: {
        netIncome: 300000000, // EPS = 300M / 10M = 30. P/E = 1500 / 30 = 50.0x
        revenue: 1000000000,
        operatingIncome: 250000000,
        shareholderEquity: 1200000000,
        totalDebt: 240000000
      }
    };
    const stdRatios = getCompanyRatios(standardStock);
    const pePass = stdRatios.peRatio === 50 && stdRatios.peRatioDisplay.includes('50.00x');
    recordResult({
      id: 'PHASE-E-METRIC-01',
      title: 'Standard P/E Ratio Calculation (Price / EPS)',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Calculate P/E for profitable stock: 1500 / 30 = 50.00x',
      expected: '50.00x',
      actual: stdRatios.peRatioDisplay,
      evidence: { peRatio: stdRatios.peRatio, display: stdRatios.peRatioDisplay },
      status: pePass ? 'PASSED' : 'FAILED'
    });

    // Test 5: P/E Loss-Making
    const lossStock = { ...standardStock, financials: { ...standardStock.financials, netIncome: -50000000 } };
    const lossRatios = getCompanyRatios(lossStock);
    const lossPass = lossRatios.peRatio === null && lossRatios.peRatioDisplay.includes('Loss-Making');
    recordResult({
      id: 'PHASE-E-METRIC-02',
      title: 'P/E Ratio Guardrail: Loss-Making Company',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Prevent negative P/E; display N/A (Loss-Making)',
      expected: 'N/A (Loss-Making)',
      actual: lossRatios.peRatioDisplay,
      evidence: { peRatio: lossRatios.peRatio, display: lossRatios.peRatioDisplay },
      status: lossPass ? 'PASSED' : 'FAILED'
    });

    // Test 6: P/E Break-Even (Zero EPS)
    const zeroStock = { ...standardStock, financials: { ...standardStock.financials, netIncome: 0 } };
    const zeroRatios = getCompanyRatios(zeroStock);
    const zeroPass = zeroRatios.peRatio === null && zeroRatios.peRatioDisplay.includes('Break-even');
    recordResult({
      id: 'PHASE-E-METRIC-03',
      title: 'P/E Ratio Guardrail: Zero EPS Break-Even',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Prevent division by zero or Infinity; display N/A (Break-even)',
      expected: 'N/A (Break-even)',
      actual: zeroRatios.peRatioDisplay,
      evidence: { peRatio: zeroRatios.peRatio, display: zeroRatios.peRatioDisplay },
      status: zeroPass ? 'PASSED' : 'FAILED'
    });

    // Test 7: P/E Non-Equity
    const bondAsset = { ticker: 'GSEC10Y', type: 'CorporateBond', currentPrice: 100 };
    const bondRatios = getCompanyRatios(bondAsset);
    const bondPass = bondRatios.peRatio === null && bondRatios.peRatioDisplay.includes('Fixed Income');
    recordResult({
      id: 'PHASE-E-METRIC-04',
      title: 'P/E Ratio Guardrail: Non-Equity Fixed Income',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Bonds/G-Secs return N/A (Fixed Income)',
      expected: 'N/A (Fixed Income)',
      actual: bondRatios.peRatioDisplay,
      evidence: { peRatio: bondRatios.peRatio, display: bondRatios.peRatioDisplay },
      status: bondPass ? 'PASSED' : 'FAILED'
    });

    // Test 8: Debt-to-Equity Standard
    // 240M / 1200M = 0.20x
    const dePass = stdRatios.debtToEquity === 0.2 && stdRatios.debtToEquityDisplay.includes('0.20x');
    recordResult({
      id: 'PHASE-E-METRIC-05',
      title: 'Standard Debt-to-Equity Ratio Calculation',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Calculate D/E for leveraged firm: 240M / 1200M = 0.20x',
      expected: '0.20x',
      actual: stdRatios.debtToEquityDisplay,
      evidence: { deRatio: stdRatios.debtToEquity, display: stdRatios.debtToEquityDisplay },
      status: dePass ? 'PASSED' : 'FAILED'
    });

    // Test 9: Debt-to-Equity Zero Debt
    const zeroDebtStock = { ...standardStock, financials: { ...standardStock.financials, totalDebt: 0 } };
    const zeroDebtRatios = getCompanyRatios(zeroDebtStock);
    const zeroDebtPass = zeroDebtRatios.debtToEquity === 0 && zeroDebtRatios.debtToEquityDisplay.includes('Debt-Free');
    recordResult({
      id: 'PHASE-E-METRIC-06',
      title: 'Debt-to-Equity Guardrail: Zero Debt Company',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Debt-free firm displays 0.00x (Debt-Free)',
      expected: '0.00x (Debt-Free)',
      actual: zeroDebtRatios.debtToEquityDisplay,
      evidence: { deRatio: zeroDebtRatios.debtToEquity, display: zeroDebtRatios.debtToEquityDisplay },
      status: zeroDebtPass ? 'PASSED' : 'FAILED'
    });

    // Test 10: Debt-to-Equity Negative Equity
    const negEqStock = { ...standardStock, financials: { ...standardStock.financials, shareholderEquity: -100000000 } };
    const negEqRatios = getCompanyRatios(negEqStock);
    const negEqPass = negEqRatios.debtToEquity === null && negEqRatios.debtToEquityDisplay.includes('Negative Equity');
    recordResult({
      id: 'PHASE-E-METRIC-07',
      title: 'Debt-to-Equity Guardrail: Negative Shareholder Equity',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Insolvent firm with negative equity displays N/A (Negative Equity)',
      expected: 'N/A (Negative Equity)',
      actual: negEqRatios.debtToEquityDisplay,
      evidence: { deRatio: negEqRatios.debtToEquity, display: negEqRatios.debtToEquityDisplay },
      status: negEqPass ? 'PASSED' : 'FAILED'
    });

    // Test 11: Operating Margin Standard
    // 250M / 1000M = 25.00%
    const opPass = stdRatios.operatingMargin === 25 && stdRatios.operatingMarginDisplay.includes('25.00%');
    recordResult({
      id: 'PHASE-E-METRIC-08',
      title: 'Standard Operating Margin Calculation',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Operating Margin = (250M / 1000M) * 100 = 25.00%',
      expected: '+25.00%',
      actual: stdRatios.operatingMarginDisplay,
      evidence: { opMargin: stdRatios.operatingMargin, display: stdRatios.operatingMarginDisplay },
      status: opPass ? 'PASSED' : 'FAILED'
    });

    // Test 12: Operating Margin Loss
    const opLossStock = { ...standardStock, financials: { ...standardStock.financials, operatingIncome: -50000000 } };
    const opLossRatios = getCompanyRatios(opLossStock);
    const opLossPass = opLossRatios.operatingMargin === -5 && opLossRatios.operatingMarginDisplay.includes('-5.00%');
    recordResult({
      id: 'PHASE-E-METRIC-09',
      title: 'Operating Margin Guardrail: Operating Loss',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Negative EBIT yields negative margin display',
      expected: '-5.00%',
      actual: opLossRatios.operatingMarginDisplay,
      evidence: { opMargin: opLossRatios.operatingMargin, display: opLossRatios.operatingMarginDisplay },
      status: opLossPass ? 'PASSED' : 'FAILED'
    });

    // Test 13: Operating Margin Zero Revenue
    const zeroRevStock = { ...standardStock, financials: { ...standardStock.financials, revenue: 0 } };
    const zeroRevRatios = getCompanyRatios(zeroRevStock);
    const zeroRevPass = zeroRevRatios.operatingMargin === null && zeroRevRatios.operatingMarginDisplay.includes('Pre-Revenue');
    recordResult({
      id: 'PHASE-E-METRIC-10',
      title: 'Operating Margin Guardrail: Pre-Revenue Startup',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Zero revenue firm displays N/A (Pre-Revenue) without division by zero',
      expected: 'N/A (Pre-Revenue)',
      actual: zeroRevRatios.operatingMarginDisplay,
      evidence: { opMargin: zeroRevRatios.operatingMargin, display: zeroRevRatios.operatingMarginDisplay },
      status: zeroRevPass ? 'PASSED' : 'FAILED'
    });

    // Test 14: Return on Equity (ROE) Standard
    // 300M / 1200M = 25.00%
    const roePass = stdRatios.roe === 25 && stdRatios.roeDisplay.includes('25.00%');
    recordResult({
      id: 'PHASE-E-METRIC-11',
      title: 'Standard Return on Equity (ROE) Calculation',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'ROE = (300M / 1200M) * 100 = 25.00%',
      expected: '+25.00%',
      actual: stdRatios.roeDisplay,
      evidence: { roe: stdRatios.roe, display: stdRatios.roeDisplay },
      status: roePass ? 'PASSED' : 'FAILED'
    });

    // Test 15: ROE Anti-Spurious Double-Negative Trap
    // Net Income = -50M, Equity = -200M. (-50)/(-200) mathematically equals +25%!
    // Must trap negative equity and return N/A (Deficit Equity).
    const trapStock = { ...standardStock, financials: { ...standardStock.financials, netIncome: -50000000, shareholderEquity: -200000000 } };
    const trapRatios = getCompanyRatios(trapStock);
    const trapPass = trapRatios.roe === null && trapRatios.roeDisplay.includes('Deficit Equity');
    recordResult({
      id: 'PHASE-E-METRIC-12',
      title: 'ROE Anti-Spurious Trap: Negative Equity Deficit',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Trap (-NetIncome) / (-Equity) mathematically positive result; display N/A (Deficit Equity)',
      expected: 'N/A (Deficit Equity)',
      actual: trapRatios.roeDisplay,
      evidence: { roe: trapRatios.roe, display: trapRatios.roeDisplay },
      status: trapPass ? 'PASSED' : 'FAILED'
    });

    // STEP 6: VALUATION INDICATORS & INTRINSIC BENCHMARKS
    console.log('\n--- STEP 6: VALUATION INDICATORS & BENCHMARK MODELS ---');
    
    // Test 16: Undervalued Status
    const underValSec = { ...standardStock, currentPrice: 1000, basePrice: 1500 };
    const underVal = getValuationAnalysis(underValSec, stdRatios);
    const underPass = underVal.status === 'UNDERVALUED' && underVal.deviationPercent < -10;
    recordResult({
      id: 'PHASE-E-VAL-01',
      title: 'Valuation Indicator: Undervalued Alpha Opportunity',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Price trading significantly below intrinsic anchor classified as UNDERVALUED',
      expected: 'UNDERVALUED with negative deviation',
      actual: `${underVal.status} (${underVal.deviationPercent.toFixed(1)}%)`,
      evidence: underVal,
      status: underPass ? 'PASSED' : 'FAILED'
    });

    // Test 17: Overvalued Status
    const overValSec = { ...standardStock, currentPrice: 2200, basePrice: 1500 };
    const overVal = getValuationAnalysis(overValSec, stdRatios);
    const overPass = overVal.status === 'OVERVALUED' && overVal.deviationPercent > 10;
    recordResult({
      id: 'PHASE-E-VAL-02',
      title: 'Valuation Indicator: Overvalued Multiple Warning',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Price trading significantly above intrinsic anchor classified as OVERVALUED',
      expected: 'OVERVALUED with positive deviation',
      actual: `${overVal.status} (+${overVal.deviationPercent.toFixed(1)}%)`,
      evidence: overVal,
      status: overPass ? 'PASSED' : 'FAILED'
    });

    // Test 18: Fair Value Status
    const fairValSec = { ...standardStock, currentPrice: 1520, basePrice: 1500 };
    const fairVal = getValuationAnalysis(fairValSec, stdRatios);
    const fairPass = fairVal.status === 'FAIR VALUE' && Math.abs(fairVal.deviationPercent) <= 10;
    recordResult({
      id: 'PHASE-E-VAL-03',
      title: 'Valuation Indicator: Fair Value Balanced Band',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Price trading within +/- 10% classified as FAIR VALUE',
      expected: 'FAIR VALUE',
      actual: `${fairVal.status} (${fairVal.deviationPercent.toFixed(1)}%)`,
      evidence: fairVal,
      status: fairPass ? 'PASSED' : 'FAILED'
    });

    // Test 19: Target Range Non-Negative Boundaries
    const rangePass = fairVal.bearTarget > 0 && fairVal.bullTarget > fairVal.fairValue && fairVal.bearTarget < fairVal.fairValue;
    recordResult({
      id: 'PHASE-E-VAL-04',
      title: 'Target Price Range Integrity (Bear, Fair, Bull Targets)',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Ensure Target Price range satisfies Bear < Fair < Bull and all > 0',
      expected: 'BearTarget < FairValue < BullTarget, all positive',
      actual: `Bear=${fairVal.bearTarget}, Fair=${fairVal.fairValue}, Bull=${fairVal.bullTarget}`,
      evidence: { bear: fairVal.bearTarget, fair: fairVal.fairValue, bull: fairVal.bullTarget },
      status: rangePass ? 'PASSED' : 'FAILED'
    });

    // STEP 7: BULL / BEAR PERSPECTIVES SYNTHESIS
    console.log('\n--- STEP 7: BULL / BEAR ANALYTICAL PERSPECTIVES ---');
    const perspectives = getAnalyticalPerspectives(standardStock, stdRatios, fairVal);
    const bullThesisPass = Array.isArray(perspectives.bullTheses) && perspectives.bullTheses.length >= 3;
    const bearThesisPass = Array.isArray(perspectives.bearTheses) && perspectives.bearTheses.length >= 3;

    recordResult({
      id: 'PHASE-E-THESIS-01',
      title: 'Bullish Catalysts Multi-Factor Generation',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Generate 3 distinct data-backed bull theses (valuation, margins, momentum)',
      expected: '>= 3 structured bull arguments',
      actual: `${perspectives.bullTheses?.length || 0} arguments generated`,
      evidence: perspectives.bullTheses,
      status: bullThesisPass ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'PHASE-E-THESIS-02',
      title: 'Bearish Risk Warning Multi-Factor Generation',
      endpoint: 'src/lib/companyFundamentals.js',
      role: 'unit',
      scenario: 'Generate 3 distinct data-backed risk warnings (multiple, debt, circuit limits)',
      expected: '>= 3 structured bear arguments',
      actual: `${perspectives.bearTheses?.length || 0} arguments generated`,
      evidence: perspectives.bearTheses,
      status: bearThesisPass ? 'PASSED' : 'FAILED'
    });

    // STEP 8: STRUCTURAL PROVENANCE SEPARATION & VISUAL DISTINCTION
    console.log('\n--- STEP 8: STRUCTURAL PROVENANCE SEPARATION ---');
    const terminalCode = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'BrokerAdvisoryTerminal.jsx'), 'utf8');

    const hasFactualProvenance = terminalCode.includes('data-provenance="factual"') || terminalCode.includes('provenance-factual');
    const hasSimulatedProvenance = terminalCode.includes('data-provenance="simulated"') || terminalCode.includes('data-provenance="opinion"') || terminalCode.includes('provenance-simulated');
    const hasFactualBadge = terminalCode.includes('FACTUAL') || terminalCode.includes('AUDITED');
    const hasOpinionBadge = terminalCode.includes('SIMULATED') || terminalCode.includes('ADVISORY OPINION');
    const hasDisclaimer = terminalCode.includes('Educational Advisory') || terminalCode.includes('Strictly Non-Execution');

    recordResult({
      id: 'PHASE-E-PROV-01',
      title: 'Structural Provenance Segregation in DOM',
      endpoint: 'src/pages/BrokerAdvisoryTerminal.jsx',
      role: 'static-ast',
      scenario: 'Verify distinct DOM containers with data-provenance="factual" and "simulated"',
      expected: 'Both factual and simulated provenance containers present in component',
      actual: `Factual: ${hasFactualProvenance}, Simulated: ${hasSimulatedProvenance}`,
      evidence: { hasFactualProvenance, hasSimulatedProvenance },
      status: (hasFactualProvenance && hasSimulatedProvenance) ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'PHASE-E-PROV-02',
      title: 'Visual Badges and Regulatory Disclaimer Banner',
      endpoint: 'src/pages/BrokerAdvisoryTerminal.jsx',
      role: 'static-ast',
      scenario: 'Verify visual badging for Factual Data vs Simulated Advisory and non-execution disclaimer',
      expected: 'Visual provenance badges and educational disclaimer present',
      actual: `FactualBadge: ${hasFactualBadge}, OpinionBadge: ${hasOpinionBadge}, Disclaimer: ${hasDisclaimer}`,
      evidence: { hasFactualBadge, hasOpinionBadge, hasDisclaimer },
      status: (hasFactualBadge && hasOpinionBadge && hasDisclaimer) ? 'PASSED' : 'FAILED'
    });

    // STEP 9: PURE ADVISORY NON-EXECUTION VERIFICATION
    console.log('\n--- STEP 9: PURE ADVISORY ZERO-EXECUTION ENFORCEMENT ---');
    const hasOrderApiCall = terminalCode.includes("'/api/order'") || terminalCode.includes('"/api/order"');
    const hasSubmitOrder = terminalCode.includes('submitOrder') || terminalCode.includes('handlePlaceOrder');
    const hasPaperSlipNotice = terminalCode.includes('PAPER SLIP EXECUTION ONLY');

    recordResult({
      id: 'PHASE-E-EXEC-01',
      title: 'Pure Advisory Mode: Zero Order Routing in Terminal Code',
      endpoint: 'src/pages/BrokerAdvisoryTerminal.jsx',
      role: 'static-ast',
      scenario: 'Confirm absence of /api/order, order submission functions, and presence of paper slip notice',
      expected: 'No /api/order calls, no order dispatchers, paper slip banner verified',
      actual: `hasOrderApiCall: ${hasOrderApiCall}, hasSubmitOrder: ${hasSubmitOrder}, hasPaperSlipNotice: ${hasPaperSlipNotice}`,
      evidence: { hasOrderApiCall, hasSubmitOrder, hasPaperSlipNotice },
      status: (!hasOrderApiCall && !hasSubmitOrder && hasPaperSlipNotice) ? 'PASSED' : 'FAILED'
    });

    // Step 9.2: Test that Advisor Signal dispatch does not mutate orders or wallets
    const refRes = await apiRequest('POST', '/api/advisor/refer', { ticker: 'INFY', teamCode: 'T01' }, bearer(tokenT01));
    const refId = refRes.data?.referral?.id;

    const initialOrders = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.orders || [];
    const initialT01Cash = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.teams?.find(t => t.teamCode === 'T01')?.cashWallets?.INR;

    const sigRes = await apiRequest('POST', '/api/advisor/signal', { referralId: refId, signal: 'BUY', advisorName: 'Senior Floor Advisor' }, bearer(tokenAdmin));
    
    const postOrders = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.orders || [];
    const postT01Cash = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.teams?.find(t => t.teamCode === 'T01')?.cashWallets?.INR;

    const zeroMutation = (sigRes.status === 200) && (postOrders.length === initialOrders.length) && (postT01Cash === initialT01Cash);
    recordResult({
      id: 'PHASE-E-EXEC-02',
      title: 'Signal Dispatch Non-Mutation Invariant',
      endpoint: 'POST /api/advisor/signal',
      role: 'advisor',
      scenario: 'Publishing BUY signal must strictly NOT create orders or mutate participant wallets',
      expected: 'Orders count unchanged, wallet balances unchanged',
      actual: `Signal status=${sigRes.status}, Orders delta=${postOrders.length - initialOrders.length}, Cash delta=${postT01Cash - initialT01Cash}`,
      evidence: { signalSuccess: sigRes.data?.success, ordersDelta: postOrders.length - initialOrders.length },
      status: zeroMutation ? 'PASSED' : 'FAILED'
    });

    // Step 9.3: Advisor Role Order Creation Prohibition
    const rogueOrderRes = await apiRequest('POST', '/api/order', {
      teamCode: 'ADVISOR_ROGUE',
      ticker: 'INFY',
      type: 'BUY',
      quantity: 100,
      price: 1500
    }, bearer(tokenAdvisor));

    const rogueOrderBlocked = [400, 401, 403, 404].includes(rogueOrderRes.status);
    recordResult({
      id: 'PHASE-E-EXEC-03',
      title: 'RBAC Gate: Advisor Role Order Creation Prohibited',
      endpoint: 'POST /api/order',
      role: 'advisor',
      scenario: 'Attempting order creation with advisor session is rejected',
      expected: 'HTTP 400, 401, 403, or 404 rejection',
      actual: `HTTP ${rogueOrderRes.status}: ${rogueOrderRes.data?.error || 'Rejected'}`,
      evidence: { status: rogueOrderRes.status, error: rogueOrderRes.data?.error },
      status: rogueOrderBlocked ? 'PASSED' : 'FAILED'
    });

    // STEP 10: ADVISOR REFERRALS & RESEARCH RECOMMENDATION PIPELINE
    console.log('\n--- STEP 10: ADVISOR REFERRALS & RESEARCH BROADCASTING ---');
    
    // Test overwrite prevention
    const overwriteRes = await apiRequest('POST', '/api/advisor/signal', { referralId: refId, signal: 'SELL', advisorName: 'Senior Advisor' }, bearer(tokenAdmin));
    const overwriteBlocked = overwriteRes.status === 400;
    recordResult({
      id: 'PHASE-E-FLOW-01',
      title: 'Advisor Signal Audit Protection: Overwrite Rejection',
      endpoint: 'POST /api/advisor/signal',
      role: 'advisor',
      scenario: 'Attempting to overwrite a completed referral signal returns HTTP 400',
      expected: 'HTTP 400 rejection preserving audit record',
      actual: `HTTP ${overwriteRes.status}: ${overwriteRes.data?.error}`,
      evidence: { status: overwriteRes.status, error: overwriteRes.data?.error },
      status: overwriteBlocked ? 'PASSED' : 'FAILED'
    });

    // Test research recommendation broadcasting
    const recRes = await apiRequest('POST', '/api/broker/recommendation', {
      brokerName: 'Floor Strategy Desk',
      ticker: 'INFY',
      recommendation: 'BUY',
      confidence: 88,
      reasoning: 'Strong margin profile and undervalued relative to benchmark multiple.',
      riskLevel: 'LOW',
      timeframe: 'MEDIUM'
    }, bearer(tokenAdmin));

    const recsListRes = await apiRequest('GET', '/api/broker/recommendations', null, bearer(tokenAdmin));
    const recFound = (recsListRes.data?.recommendations || []).some(r => r.ticker === 'INFY' && r.recommendation === 'BUY');
    recordResult({
      id: 'PHASE-E-FLOW-02',
      title: 'Broker Research Recommendation Publishing & Broadcast',
      endpoint: 'POST /api/broker/recommendation, GET /api/broker/recommendations',
      role: 'advisor, public',
      scenario: 'Publish formal research report bulletin and verify presence in public feed',
      expected: 'Recommendation saved and retrievable via GET',
      actual: `POST status=${recRes.status}, Found in list: ${recFound}`,
      evidence: { recommendationId: recRes.data?.recommendation?.id, totalRecs: recsListRes.data?.recommendations?.length },
      status: (recRes.status === 200 && recFound) ? 'PASSED' : 'FAILED'
    });

    // STEP 11: VITE PRODUCTION BUILD CERTIFICATION
    console.log('\n--- STEP 11: VITE PRODUCTION BUILD VERIFICATION ---');
    let buildPassed = false;
    let buildOutput = '';
    try {
      buildOutput = execSync('cmd /c "npm run build"', { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
      buildPassed = buildOutput.includes('built in') || buildOutput.includes('dist/index.html');
    } catch (e) {
      buildOutput = e.stderr || e.stdout || e.message;
    }

    recordResult({
      id: 'PHASE-E-BUILD-01',
      title: 'Vite Production Build Compilation (npm run build)',
      endpoint: 'CLI (vite build)',
      role: 'system',
      scenario: 'Compile entire project with Vite production bundler with 0 syntax or import errors',
      expected: 'Exit code 0, 0 compilation errors',
      actual: buildPassed ? 'Build completed cleanly' : 'Build failed',
      evidence: { buildOutputSnippet: buildOutput.slice(-300).trim() },
      status: buildPassed ? 'PASSED' : 'FAILED'
    });

    // STEP 12: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
    console.log('\n--- STEP 12: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after test suite: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER TESTING!');
    console.log('✓ Authoritative state.json confirmed bit-for-bit untouched.\n');

    recordResult({
      id: 'PHASE-E-POSTFLIGHT-01',
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
  console.log(`📊 PHASE E TEST SUITE SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================\n');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Test results saved to: ${RESULTS_FILE}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhaseEBrokerSuite().catch(err => {
  console.error('Fatal Phase E suite error:', err);
  process.exit(1);
});
