import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3095;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-consolidated-p1-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-consolidated-phase1-results.json');

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

async function runConsolidatedPhase1Suite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX CONSOLIDATED BUILD PHASE 1 — FINANCIAL INTEGRITY & SECURITY');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: PRE-FLIGHT INTEGRITY CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

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

  // Seed initial Team T01 & T02 holdings and transactions
  const teamT01 = fixture.teams.find(t => t.teamCode === 'T01');
  const teamT02 = fixture.teams.find(t => t.teamCode === 'T02');

  teamT01.cashWallets = { INR: 9900000, USD: 1000, GBP: 0, EUR: 0 };
  teamT01.holdings = { INFY: 100, TCS: 50 };
  const usdRate = fixture.fxRates.USDINR?.midRate || 88.20;
  teamT01.cashBalance = parseFloat((9900000 + 1000 * usdRate).toFixed(2));

  teamT02.cashWallets = { INR: 10000000, USD: 5000, GBP: 0, EUR: 0 };
  teamT02.holdings = { OAI: 20 };
  teamT02.cashBalance = parseFloat((10000000 + 5000 * usdRate).toFixed(2));

  // Seed sample transactions to void
  const txToVoidBuy = {
    id: 'TX_VOID_BUY_01',
    timestamp: Date.now() - 10000,
    teamId: teamT01.id,
    teamCode: 'T01',
    securityId: 'STK_INFY_32cd51',
    ticker: 'INFY',
    action: 'BUY',
    quantity: 20,
    priceAtExecution: 1800,
    totalValue: 36000,
    localCurrency: 'INR',
    voided: false
  };

  const txToVoidSell = {
    id: 'TX_VOID_SELL_02',
    timestamp: Date.now() - 5000,
    teamId: teamT02.id,
    teamCode: 'T02',
    securityId: 'IPO_OAI_001',
    ticker: 'OAI',
    action: 'SELL',
    quantity: 10,
    priceAtExecution: 180,
    totalValue: 1800,
    localCurrency: 'USD',
    voided: false
  };

  fixture.transactions = [txToVoidBuy, txToVoidSell];

  // Configure TCS and OAI for dividend tests
  const secTCS = fixture.securities.find(s => s.ticker === 'TCS');
  if (secTCS) {
    secTCS.dividendYield = 2.0; // 2%
    secTCS.currentPrice = 3200;
    secTCS.currency = 'INR';
  }

  const secOAI = fixture.securities.find(s => s.ticker === 'OAI');
  if (secOAI) {
    secOAI.dividendYield = 3.0; // 3%
    secOAI.currentPrice = 200;
    secOAI.currency = 'USD';
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Seeded disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}\n`);

  // STEP 3: SPAWN ISOLATED TEST SERVER
  console.log('--- STEP 3: LAUNCHING ISOLATED SERVER INSTANCE ON PORT ' + PORT + ' ---');
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
    // STEP 4: REAL PRODUCTION AUTHENTICATION LOGIN
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES VIA REAL POST /api/auth/login ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginSebi = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    const tokenSebi = loginSebi.data?.token;

    assert(tokenT01 && tokenAdmin && tokenSebi, 'Failed to acquire test session tokens');
    console.log('✓ Successfully acquired real cryptographic tokens for T01, Admin, and SEBI.\n');

    // ======================================================================
    // SECTION A: TASK A — TRANSACTION VOID AUTHORIZATION & FINANCIAL INTEGRITY
    // ======================================================================
    console.log('======================================================================');
    console.log('📌 TASK A: TRANSACTION VOID AUTHORIZATION & REVERSAL AUDIT');
    console.log('======================================================================');

    // Test 1: Unauthenticated void attempt -> 401
    const vVoidAnon = await apiRequest('POST', '/api/transactions/void', { id: 'TX_VOID_BUY_01' });
    recordResult({
      id: 'VOID-SEC-01',
      title: 'Unauthenticated Transaction Void Rejection',
      endpoint: 'POST /api/transactions/void',
      role: 'anonymous',
      scenario: 'Unauthenticated caller attempts to void transaction TX_VOID_BUY_01',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vVoidAnon.status}`,
      evidence: vVoidAnon.data,
      status: vVoidAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // Test 2: Authenticated unauthorized participant team attempting void -> 403
    const vVoidTeam = await apiRequest('POST', '/api/transactions/void', { id: 'TX_VOID_BUY_01' }, bearerHeader(tokenT01));
    recordResult({
      id: 'VOID-SEC-02',
      title: 'Unauthorized Participant Team Void Rejection',
      endpoint: 'POST /api/transactions/void',
      role: 'team (T01)',
      scenario: 'Team T01 attempts to void transaction TX_VOID_BUY_01',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vVoidTeam.status}`,
      evidence: vVoidTeam.data,
      status: vVoidTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // Test 3: Trailing slash authorization normalization -> 403 for team
    const vVoidSlash = await apiRequest('POST', '/api/transactions/void/', { id: 'TX_VOID_BUY_01' }, bearerHeader(tokenT01));
    recordResult({
      id: 'VOID-SEC-03',
      title: 'Trailing Slash Route Normalization (/api/transactions/void/)',
      endpoint: 'POST /api/transactions/void/',
      role: 'team (T01)',
      scenario: 'Team T01 attempts trailing slash alias to bypass void authorization',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vVoidSlash.status}`,
      evidence: vVoidSlash.data,
      status: vVoidSlash.status === 403 ? 'PASSED' : 'FAILED'
    });

    // Test 4: Authorized administrator successfully voids valid BUY transaction
    // Pre-void state check: T01 cashWallets.INR = 9900000, holdings.INFY = 100
    const vVoidAdminBuy = await apiRequest('POST', '/api/transactions/void', {
      id: 'TX_VOID_BUY_01',
      reason: 'Erroneous duplicate execution by clerk'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'VOID-LEGIT-01',
      title: 'Authorized Administrator Valid BUY Transaction Void',
      endpoint: 'POST /api/transactions/void',
      role: 'admin',
      scenario: 'Administrator voids BUY transaction (₹36,000 / 20 INFY)',
      expected: 'HTTP 200 with tx.voided=true and audit fields populated',
      actual: `HTTP ${vVoidAdminBuy.status}, voided=${vVoidAdminBuy.data?.transaction?.voided}`,
      evidence: {
        success: vVoidAdminBuy.data?.success,
        voided: vVoidAdminBuy.data?.transaction?.voided,
        voidedBy: vVoidAdminBuy.data?.transaction?.voidedBy,
        voidReason: vVoidAdminBuy.data?.transaction?.voidReason
      },
      status: vVoidAdminBuy.status === 200 &&
              vVoidAdminBuy.data?.transaction?.voided === true &&
              vVoidAdminBuy.data?.transaction?.voidedBy === 'admin' ? 'PASSED' : 'FAILED'
    });

    // Test 5: Verify post-void BUY financial ledger state (Cash refunded, holdings reduced)
    const postVoidFixture1 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const postT01 = postVoidFixture1.teams.find(t => t.teamCode === 'T01');
    const expectedT01CashINR = 9900000 + 36000; // 9,936,000 INR
    const expectedT01Infy = 100 - 20; // 80 INFY
    const expectedT01TotalCash = parseFloat((expectedT01CashINR + 1000 * usdRate).toFixed(2));

    const isBuyVoidLedgerConsistent = postT01.cashWallets.INR === expectedT01CashINR &&
                                      postT01.holdings.INFY === expectedT01Infy &&
                                      postT01.cashBalance === expectedT01TotalCash;

    recordResult({
      id: 'VOID-LEDGER-01',
      title: 'BUY Void Ledger Integrity (Cash Refund & Holdings Reduction)',
      endpoint: 'Database State Assertion',
      role: 'financial ledger',
      scenario: 'Check Team T01 INR wallet, INFY holdings, and aggregate cash balance after void',
      expected: `INR wallet=${expectedT01CashINR}, INFY holdings=${expectedT01Infy}, cashBalance=${expectedT01TotalCash}`,
      actual: `INR wallet=${postT01.cashWallets.INR}, INFY holdings=${postT01.holdings.INFY}, cashBalance=${postT01.cashBalance}`,
      evidence: {
        cashWallets: postT01.cashWallets,
        holdings: postT01.holdings,
        cashBalance: postT01.cashBalance
      },
      status: isBuyVoidLedgerConsistent ? 'PASSED' : 'FAILED'
    });

    // Test 6: Duplicate void attempt rejected without second financial reversal -> 400
    const vVoidDuplicate = await apiRequest('POST', '/api/transactions/void', {
      id: 'TX_VOID_BUY_01',
      reason: 'Second void attempt on same transaction'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'VOID-IDEMPOTENCY-01',
      title: 'Duplicate Transaction Void Rejection (Idempotency)',
      endpoint: 'POST /api/transactions/void',
      role: 'admin',
      scenario: 'Attempting to void an already-voided transaction a second time',
      expected: 'HTTP 400 Transaction already voided',
      actual: `HTTP ${vVoidDuplicate.status}`,
      evidence: vVoidDuplicate.data,
      status: vVoidDuplicate.status === 400 &&
              vVoidDuplicate.data?.error?.includes('already voided') ? 'PASSED' : 'FAILED'
    });

    // Test 7: Verify second attempt did NOT mutate balances again
    const postDupFixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const postDupT01 = postDupFixture.teams.find(t => t.teamCode === 'T01');
    const isBalanceUnalteredAfterDuplicate = postDupT01.cashWallets.INR === expectedT01CashINR &&
                                            postDupT01.holdings.INFY === expectedT01Infy;

    recordResult({
      id: 'VOID-IDEMPOTENCY-02',
      title: 'Duplicate Void Non-Mutation Guarantee',
      endpoint: 'Database State Assertion',
      role: 'financial ledger',
      scenario: 'Confirm no secondary cash or holdings reversal occurred upon duplicate void attempt',
      expected: `Cash remains ${expectedT01CashINR}, INFY remains ${expectedT01Infy}`,
      actual: `Cash=${postDupT01.cashWallets.INR}, INFY=${postDupT01.holdings.INFY}`,
      evidence: { cashINR: postDupT01.cashWallets.INR, infy: postDupT01.holdings.INFY },
      status: isBalanceUnalteredAfterDuplicate ? 'PASSED' : 'FAILED'
    });

    // Test 8: Authorized SEBI Auditor successfully voids USD SELL transaction
    // Pre-void: T02 has USD 5000, OAI 20. SELL was 10 OAI for $1800.
    // Voiding SELL should: clawback $1800 from USD wallet (5000 - 1800 = 3200), restore 10 OAI (20 + 10 = 30)
    const vVoidSebiSell = await apiRequest('POST', '/api/transactions/void', {
      id: 'TX_VOID_SELL_02',
      reason: 'SEBI surveillance cancellation of spoofed sell order'
    }, bearerHeader(tokenSebi));

    const postVoidFixture2 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const postT02 = postVoidFixture2.teams.find(t => t.teamCode === 'T02');
    const expectedT02USD = 5000 - 1800; // 3200 USD
    const expectedT02OAI = 20 + 10; // 30 OAI
    const expectedT02TotalCash = parseFloat((10000000 + expectedT02USD * usdRate).toFixed(2));

    const isSellVoidLedgerConsistent = postT02.cashWallets.USD === expectedT02USD &&
                                       postT02.holdings.OAI === expectedT02OAI &&
                                       postT02.cashBalance === expectedT02TotalCash;

    recordResult({
      id: 'VOID-LEGIT-02',
      title: 'SEBI Authorized Foreign Currency SELL Void (USD Clawback & Holdings Restoration)',
      endpoint: 'POST /api/transactions/void',
      role: 'sebi',
      scenario: 'SEBI voids SELL transaction in USD ($1,800 / 10 OAI)',
      expected: `HTTP 200, USD wallet=${expectedT02USD}, OAI holdings=${expectedT02OAI}`,
      actual: `HTTP ${vVoidSebiSell.status}, USD wallet=${postT02.cashWallets.USD}, OAI holdings=${postT02.holdings.OAI}`,
      evidence: {
        status: vVoidSebiSell.status,
        voidedBy: vVoidSebiSell.data?.transaction?.voidedBy,
        cashWallets: postT02.cashWallets,
        holdings: postT02.holdings,
        cashBalance: postT02.cashBalance
      },
      status: vVoidSebiSell.status === 200 && isSellVoidLedgerConsistent ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION B: TASK B — CORPORATE ACTION DIVIDEND MULTI-CURRENCY ACCOUNTING
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 TASK B: CORPORATE ACTION DIVIDEND MULTI-CURRENCY ACCOUNTING AUDIT');
    console.log('======================================================================');

    // Test 9: Unauthenticated dividend corporate action attempt -> 401
    const vDivAnon = await apiRequest('POST', '/api/corporate-action', {
      securityId: 'TCS',
      actionType: 'Dividend'
    });
    recordResult({
      id: 'DIV-SEC-01',
      title: 'Unauthenticated Dividend Trigger Rejection',
      endpoint: 'POST /api/corporate-action',
      role: 'anonymous',
      scenario: 'Unauthenticated caller attempts to trigger dividend distribution',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vDivAnon.status}`,
      evidence: vDivAnon.data,
      status: vDivAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // Test 10: Unauthorized team dividend trigger attempt -> 403
    const vDivTeam = await apiRequest('POST', '/api/corporate-action', {
      securityId: 'TCS',
      actionType: 'Dividend'
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'DIV-SEC-02',
      title: 'Participant Team Dividend Trigger Rejection',
      endpoint: 'POST /api/corporate-action',
      role: 'team (T01)',
      scenario: 'Team T01 attempts to trigger dividend payout on TCS',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vDivTeam.status}`,
      evidence: vDivTeam.data,
      status: vDivTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // Test 11: Authorized Admin triggers INR Dividend on TCS (yield: 2.0%, price: 3200)
    // Team T01 holds 50 units of TCS.
    // Payout = 50 * (2.0 / 100) * 3200 = 50 * 64 = ₹3,200 INR.
    // Pre-dividend: T01 cashWallets.INR = 9,936,000, USD = 1,000
    const preDivStateT01 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const preDivCashINR = preDivStateT01.cashWallets.INR;
    const preDivCashUSD = preDivStateT01.cashWallets.USD;

    const vDivAdminINR = await apiRequest('POST', '/api/corporate-action', {
      securityId: 'TCS',
      actionType: 'Dividend'
    }, bearerHeader(tokenAdmin));

    const postDivFixture1 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const postDivT01 = postDivFixture1.teams.find(t => t.teamCode === 'T01');
    const expectedDivPayoutINR = 3200; // 50 * 0.02 * 3200
    const expectedPostCashINR = preDivCashINR + expectedDivPayoutINR;
    const expectedPostTotalCash = parseFloat((expectedPostCashINR + preDivCashUSD * usdRate).toFixed(2));

    const isINRDividendWalletConsistent = postDivT01.cashWallets.INR === expectedPostCashINR &&
                                          postDivT01.cashWallets.USD === preDivCashUSD &&
                                          postDivT01.cashBalance === expectedPostTotalCash;

    recordResult({
      id: 'DIV-ACCT-01',
      title: 'INR Dividend Credited to Native INR Wallet & Cash Balance Reconciled',
      endpoint: 'POST /api/corporate-action',
      role: 'admin',
      scenario: 'Admin triggers 2% dividend on TCS (50 units held by T01)',
      expected: `HTTP 200, INR wallet credited +₹${expectedDivPayoutINR} (new INR=${expectedPostCashINR}), USD unchanged (${preDivCashUSD}), cashBalance=${expectedPostTotalCash}`,
      actual: `HTTP ${vDivAdminINR.status}, INR wallet=${postDivT01.cashWallets.INR}, USD wallet=${postDivT01.cashWallets.USD}, cashBalance=${postDivT01.cashBalance}`,
      evidence: {
        response: vDivAdminINR.data,
        preCashINR: preDivCashINR,
        postCashINR: postDivT01.cashWallets.INR,
        postCashUSD: postDivT01.cashWallets.USD,
        postCashBalance: postDivT01.cashBalance
      },
      status: vDivAdminINR.status === 200 && isINRDividendWalletConsistent ? 'PASSED' : 'FAILED'
    });

    // Test 12: Duplicate dividend distribution rejection within 60s (Idempotency -> 409)
    const vDivDuplicate = await apiRequest('POST', '/api/corporate-action', {
      securityId: 'TCS',
      actionType: 'Dividend'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'DIV-IDEMPOTENCY-01',
      title: 'Duplicate Dividend Distribution Rejection Within Cooldown',
      endpoint: 'POST /api/corporate-action',
      role: 'admin',
      scenario: 'Admin accidentally clicks dividend button twice within 60 seconds',
      expected: 'HTTP 409 Conflict with duplicate notification',
      actual: `HTTP ${vDivDuplicate.status}`,
      evidence: vDivDuplicate.data,
      status: vDivDuplicate.status === 409 &&
              vDivDuplicate.data?.error?.includes('Duplicate Corporate Action') ? 'PASSED' : 'FAILED'
    });

    // Test 13: Authorized SEBI Auditor triggers USD Foreign Dividend on OAI (yield: 3.0%, price: $200)
    // Team T02 holds 30 units of OAI (after void restoration).
    // Payout = 30 * (3.0 / 100) * $200 = 30 * $6 = $180 USD.
    // Pre-dividend: T02 cashWallets.USD = 3,200, INR = 10,000,000.
    // Native USD wallet should become: 3,200 + 180 = 3,380 USD.
    // Total cashBalance should reconcile to: 10,000,000 + 3,380 * usdRate.
    const preDivStateT02 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T02');
    const preDivUSD = preDivStateT02.cashWallets.USD;
    const preDivINR = preDivStateT02.cashWallets.INR;

    const vDivAdminUSD = await apiRequest('POST', '/api/corporate-action', {
      securityId: 'OAI',
      actionType: 'Dividend'
    }, bearerHeader(tokenSebi));

    const postDivFixture2 = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const postDivT02 = postDivFixture2.teams.find(t => t.teamCode === 'T02');
    const expectedUSDPayout = 180; // 30 * 0.03 * 200
    const expectedPostUSD = preDivUSD + expectedUSDPayout; // 3380 USD
    const expectedPostT02TotalCash = parseFloat((preDivINR + expectedPostUSD * usdRate).toFixed(2));

    const isUSDDividendWalletConsistent = postDivT02.cashWallets.USD === expectedPostUSD &&
                                          postDivT02.cashWallets.INR === preDivINR &&
                                          postDivT02.cashBalance === expectedPostT02TotalCash;

    recordResult({
      id: 'DIV-ACCT-02',
      title: 'USD Foreign Dividend Credited to Native USD Wallet & Reconciled',
      endpoint: 'POST /api/corporate-action',
      role: 'sebi',
      scenario: 'SEBI triggers 3% dividend on USD security OAI (30 units held by T02)',
      expected: `HTTP 200, USD wallet credited +$${expectedUSDPayout} (new USD=${expectedPostUSD}), INR unchanged (${preDivINR}), cashBalance=${expectedPostT02TotalCash}`,
      actual: `HTTP ${vDivAdminUSD.status}, USD wallet=${postDivT02.cashWallets.USD}, INR wallet=${postDivT02.cashWallets.INR}, cashBalance=${postDivT02.cashBalance}`,
      evidence: {
        response: vDivAdminUSD.data,
        preUSD: preDivUSD,
        postUSD: postDivT02.cashWallets.USD,
        postINR: postDivT02.cashWallets.INR,
        postCashBalance: postDivT02.cashBalance
      },
      status: vDivAdminUSD.status === 200 && isUSDDividendWalletConsistent ? 'PASSED' : 'FAILED'
    });

  } finally {
    // Terminate isolated test server process
    console.log('\n--- TERMINATING ISOLATED TEST SERVER ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 800));
    console.log('✓ Isolated test server terminated.');

    // Cleanup disposable fixture
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log('✓ Cleaned up disposable fixture: ' + path.basename(DISPOSABLE_STATE));
      } catch (e) {}
    }
  }

  // STEP 5: POST-FLIGHT AUTHORITATIVE STATE CHECK
  console.log('\n--- STEP 5: POST-FLIGHT AUTHORITATIVE STATE INTEGRITY VERIFICATION ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'FATAL ERROR: AUTHORITATIVE STATE WAS MODIFIED DURING TEST!');
  console.log('✓ Bit-identical authoritative state integrity verified: 100% untouched.\n');

  // WRITE TEST AUDIT REPORT
  const summary = {
    totalScenarios: testResults.length,
    passed: testResults.filter(r => r.status === 'PASSED').length,
    failed: testResults.filter(r => r.status === 'FAILED').length,
    timestamp: new Date().toISOString(),
    expectedStateHash: EXPECTED_HASH,
    finalStateHash: finalHash,
    results: testResults
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`✓ Test results saved to: ${path.basename(RESULTS_FILE)}`);
  console.log(`\n======================================================================`);
  console.log(`CONSOLIDATED PHASE 1 TEST RESULTS: ${summary.passed}/${summary.totalScenarios} PASSED (${summary.failed} FAILED)`);
  console.log(`======================================================================\n`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runConsolidatedPhase1Suite().catch(err => {
  console.error('\n❌ CONSOLIDATED PHASE 1 TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
