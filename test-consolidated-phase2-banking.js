import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3096;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-consolidated-p2-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-consolidated-phase2-results.json');

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

async function runConsolidatedPhase2Suite() {
  console.log('======================================================================');
  console.log('🏛️ SAAMX CONSOLIDATED BUILD PHASE 2 — PHYSICAL BANK DESK & TWO-PHASE SETTLEMENT');
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
    scenario: 'Verify state.json SHA-256 matches immutable baseline',
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
  fixture.settlements = [];

  // Seed initial Team T01 & T02 holdings and wallets
  const teamT01 = fixture.teams.find(t => t.teamCode === 'T01');
  const teamT02 = fixture.teams.find(t => t.teamCode === 'T02');

  const usdRate = fixture.fxRates?.USDINR?.midRate || 88.20;

  teamT01.cashWallets = { INR: 1000000, USD: 2000, GBP: 0, EUR: 0 };
  teamT01.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0 };
  teamT01.holdings = { INFY: 100, TCS: 100 };
  teamT01.cashBalance = parseFloat((1000000 + 2000 * usdRate).toFixed(2));

  teamT02.cashWallets = { INR: 10000000, USD: 5000, GBP: 0, EUR: 0 };
  teamT02.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0 };
  teamT02.holdings = { OAI: 50 };
  teamT02.cashBalance = parseFloat((10000000 + 5000 * usdRate).toFixed(2));

  const secOAI = fixture.securities.find(s => s.ticker === 'OAI');
  if (secOAI) {
    secOAI.status = 'Active';
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
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    const tokenT02 = loginT02.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    const loginSebi = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    const tokenSebi = loginSebi.data?.token;

    assert(tokenT01 && tokenT02 && tokenAdmin && tokenBank && tokenSebi, 'Failed to acquire test session tokens');
    console.log('✓ Acquired session tokens for T01, T02, Admin, Bank Teller, and SEBI.\n');

    recordResult({
      id: 'AUTH-LOGIN-01',
      title: 'Session Token Acquisition for Bank Desk Roles',
      endpoint: 'POST /api/auth/login',
      role: 'all roles',
      scenario: 'Acquire JWT/HMAC session tokens for all operational roles including bank_teller',
      expected: 'HTTP 200 with valid session tokens for bank_teller, admin, sebi, and participant teams',
      actual: `bank: role=${loginBank.data?.role}, admin: role=${loginAdmin.data?.role}, T01: role=${loginT01.data?.role}`,
      evidence: { bankRole: loginBank.data?.role, adminRole: loginAdmin.data?.role, t01Role: loginT01.data?.role },
      status: loginBank.data?.role === 'bank_teller' && loginAdmin.data?.role === 'admin' ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 1: SETTLEMENT MODE CONFIGURATION ENDPOINT
    // ======================================================================
    console.log('\n--- SECTION 1: SETTLEMENT MODE CONFIGURATION ---');

    // Test 1.1: Unauthorized team attempt to change settlement mode -> 403
    const modeResTeam = await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'TWO_PHASE_BANK' }, bearerHeader(tokenT01));
    recordResult({
      id: 'MODE-SEC-01',
      title: 'Settlement Mode Configuration RBAC Enforcement',
      endpoint: 'POST /api/admin/settlement-mode',
      role: 'team (T01)',
      scenario: 'Unauthorized participant team attempts to change settlement mode',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${modeResTeam.status}`,
      evidence: modeResTeam.data,
      status: modeResTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // Test 1.2: Invalid settlement mode -> 400
    const modeResInvalid = await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'UNSUPPORTED_MODE' }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'MODE-VAL-01',
      title: 'Settlement Mode Validation (Invalid Mode Rejection)',
      endpoint: 'POST /api/admin/settlement-mode',
      role: 'admin',
      scenario: 'Administrator attempts to set an invalid settlement mode',
      expected: 'HTTP 400 Bad Request with supported modes message',
      actual: `HTTP ${modeResInvalid.status}`,
      evidence: modeResInvalid.data,
      status: modeResInvalid.status === 400 ? 'PASSED' : 'FAILED'
    });

    // Test 1.3: Admin configures INSTANT mode -> 200
    const modeResInstant = await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'INSTANT' }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'MODE-CFG-01',
      title: 'Admin Sets Settlement Mode to INSTANT',
      endpoint: 'POST /api/admin/settlement-mode',
      role: 'admin',
      scenario: 'Administrator sets settlementMode to INSTANT',
      expected: 'HTTP 200 with settlementMode: INSTANT',
      actual: `HTTP ${modeResInstant.status}, mode=${modeResInstant.data?.settlementMode}`,
      evidence: modeResInstant.data,
      status: modeResInstant.status === 200 && modeResInstant.data?.settlementMode === 'INSTANT' ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 2: INSTANT MODE BACKWARDS COMPATIBILITY
    // ======================================================================
    console.log('\n--- SECTION 2: INSTANT MODE COMPATIBILITY VERIFICATION ---');

    // Submit BUY order in INSTANT mode for T01
    const orderResInstant = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_INSTANT_01',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(orderResInstant.status, 200, 'Failed to submit order in INSTANT mode');
    const orderIdInstant = orderResInstant.data.orderId;

    // Execute order in INSTANT mode
    const execInstant = await apiRequest('POST', '/api/order/action', {
      orderId: orderIdInstant,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execInstant.status, 200, 'Failed to execute order in INSTANT mode');
    const instantOrder = execInstant.data.order;
    const instantTx = execInstant.data.transaction;

    // Check settlements queue in INSTANT mode: should not have created any pending voucher
    const settlementsInstantRes = await apiRequest('GET', '/api/bank/settlements', null, bearerHeader(tokenBank));
    const settlementsInstant = settlementsInstantRes.data;

    recordResult({
      id: 'SETTLE-INSTANT-01',
      title: 'INSTANT Mode Backwards Compatibility',
      endpoint: 'POST /api/order/action (EXECUTE)',
      role: 'admin',
      scenario: 'Execute BUY order in INSTANT mode; verify immediate debit/credit and no pending voucher',
      expected: 'orderStatus: EXECUTED, settlementStatus: SETTLED, no pending bank vouchers created',
      actual: `orderStatus: ${instantOrder.status}, txSettlementStatus: ${instantTx.settlementStatus}, bankQueueCount: ${settlementsInstant.length}`,
      evidence: { orderStatus: instantOrder.status, txStatus: instantTx.settlementStatus, settlementsLength: settlementsInstant.length },
      status: instantOrder.status === 'EXECUTED' && instantTx.settlementStatus === 'SETTLED' && settlementsInstant.length === 0 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 3: SWITCH TO TWO_PHASE_BANK & EXECUTE BUY WITH RESERVATION
    // ======================================================================
    console.log('\n--- SECTION 3: TWO_PHASE_BANK BUY EXECUTION & FUNDS RESERVATION ---');

    // Switch mode to TWO_PHASE_BANK
    const modeResTwoPhase = await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'TWO_PHASE_BANK' }, bearerHeader(tokenAdmin));
    assert.strictEqual(modeResTwoPhase.status, 200, 'Failed to set TWO_PHASE_BANK mode');

    // Snapshot pre-trade state for T01
    const t01PreBuy = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const preCashINR = Number(t01PreBuy.cashWallets.INR);
    const preReservedINR = Number(t01PreBuy.reservedCash?.INR || 0);
    const preHoldingsTCS = Number(t01PreBuy.holdings?.TCS || 0);

    // Submit BUY order: 20 units of TCS
    const buyOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_2P_BUY_01',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(buyOrderRes.status, 200, 'Failed to submit 2-phase buy order');
    const buyOrderId = buyOrderRes.data.orderId;

    // Execute the BUY order
    const execBuyRes = await apiRequest('POST', '/api/order/action', {
      orderId: buyOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execBuyRes.status, 200, 'Failed to execute 2-phase buy order');
    const executedBuyOrder = execBuyRes.data.order;
    const executedBuyTx = execBuyRes.data.transaction;
    const buySettlement = execBuyRes.data.settlement;

    // Snapshot post-trade state for T01
    const t01PostBuy = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const postCashINR = Number(t01PostBuy.cashWallets.INR);
    const postReservedINR = Number(t01PostBuy.reservedCash?.INR || 0);
    const postHoldingsTCS = Number(t01PostBuy.holdings?.TCS || 0);

    recordResult({
      id: 'TWO-PHASE-BUY-01',
      title: 'TWO_PHASE_BANK Buy Execution & Cash Reservation',
      endpoint: 'POST /api/order/action (EXECUTE)',
      role: 'admin',
      scenario: 'Execute BUY in TWO_PHASE_BANK mode; verify EXECUTED_PENDING_SETTLEMENT, cash reserved not debited, holdings not credited yet',
      expected: 'Order EXECUTED_PENDING_SETTLEMENT, cashWallets.INR unchanged, reservedCash increased by totalValue, holdings unchanged, pending voucher created',
      actual: `orderStatus: ${executedBuyOrder.status}, cashWallets.INR: ${postCashINR} (pre: ${preCashINR}), reservedCash.INR: ${postReservedINR} (pre: ${preReservedINR}), holdings.TCS: ${postHoldingsTCS} (pre: ${preHoldingsTCS}), voucher: ${buySettlement?.id}`,
      evidence: {
        orderStatus: executedBuyOrder.status,
        orderSettlementStatus: executedBuyOrder.settlementStatus,
        cashDelta: postCashINR - preCashINR,
        reservedDelta: postReservedINR - preReservedINR,
        holdingsDelta: postHoldingsTCS - preHoldingsTCS,
        voucherRef: buySettlement?.voucherReference,
        voucherStatus: buySettlement?.status
      },
      status: (
        executedBuyOrder.status === 'EXECUTED_PENDING_SETTLEMENT' &&
        postCashINR === preCashINR &&
        postReservedINR > preReservedINR &&
        postHoldingsTCS === preHoldingsTCS &&
        buySettlement?.status === 'PENDING' &&
        buySettlement?.type === 'PAYMENT_COLLECTION'
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 4: DOUBLE SPEND & UNRESERVED PURCHASING POWER ENFORCEMENT
    // ======================================================================
    console.log('\n--- SECTION 4: DOUBLE-SPEND & PURCHASING POWER ENFORCEMENT ---');

    // Team T01 has postCashINR in wallet, but postReservedINR is reserved.
    // Let's attempt an order that requires more than (postCashINR - postReservedINR)
    const availableUnreserved = postCashINR - postReservedINR;
    // Current price of TCS
    const currentTCS = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).securities.find(s => s.ticker === 'TCS').currentPrice;
    const excessiveUnits = Math.ceil((availableUnreserved + 10000) / currentTCS);

    const excessiveOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_EXCESSIVE_BUY',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: excessiveUnits,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(excessiveOrderRes.status, 200, 'Order submission accepted ticket into queue');
    const excessiveOrderId = excessiveOrderRes.data.orderId;

    // Validate action should reject due to insufficient unreserved balance
    const validateRes = await apiRequest('POST', '/api/order/action', {
      orderId: excessiveOrderId,
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    // Execution should also be rejected if attempted
    const execExcessiveRes = await apiRequest('POST', '/api/order/action', {
      orderId: excessiveOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'DOUBLE-SPEND-PREV-01',
      title: 'Double-Spend & Purchasing Power Protection',
      endpoint: 'POST /api/order/action (VALIDATE & EXECUTE)',
      role: 'admin',
      scenario: 'Attempt order exceeding unreserved cash balance (cash minus reservedCash)',
      expected: 'HTTP 400 rejection stating Insufficient unreserved INR balance with reservation notice',
      actual: `VALIDATE HTTP ${validateRes.status}: "${validateRes.data?.error}", EXECUTE HTTP ${execExcessiveRes.status}: "${execExcessiveRes.data?.error}"`,
      evidence: { validateError: validateRes.data?.error, execError: execExcessiveRes.data?.error },
      status: (validateRes.status === 400 && execExcessiveRes.status === 400 && String(validateRes.data?.error).includes('Insufficient unreserved')) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 5: TWO_PHASE_BANK SELL EXECUTION & PROCEEDS PROTECTION
    // ======================================================================
    console.log('\n--- SECTION 5: TWO_PHASE_BANK SELL & PROCEEDS PROTECTION ---');

    const t01PreSell = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const preSellCashINR = Number(t01PreSell.cashWallets.INR);
    const preSellHoldingsINFY = Number(t01PreSell.holdings?.INFY || 0);

    // Submit SELL order: 25 units of INFY
    const sellOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_2P_SELL_01',
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'SELL',
      quantity: 25,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(sellOrderRes.status, 200, 'Failed to submit 2-phase sell order');
    const sellOrderId = sellOrderRes.data.orderId;

    // Execute SELL order
    const execSellRes = await apiRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execSellRes.status, 200, 'Failed to execute 2-phase sell order');
    const executedSellOrder = execSellRes.data.order;
    const executedSellTx = execSellRes.data.transaction;
    const sellSettlement = execSellRes.data.settlement;

    const t01PostSell = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const postSellCashINR = Number(t01PostSell.cashWallets.INR);
    const postSellHoldingsINFY = Number(t01PostSell.holdings?.INFY || 0);

    recordResult({
      id: 'TWO-PHASE-SELL-01',
      title: 'TWO_PHASE_BANK Sell Execution & Proceeds Locking',
      endpoint: 'POST /api/order/action (EXECUTE)',
      role: 'admin',
      scenario: 'Execute SELL in TWO_PHASE_BANK; verify shares surrendered immediately but cash proceeds uncredited',
      expected: 'Order EXECUTED_PENDING_SETTLEMENT, holdings reduced immediately, cashWallets unchanged (unspendable), voucher PROCEEDS_DISBURSEMENT created',
      actual: `orderStatus: ${executedSellOrder.status}, holdings.INFY: ${postSellHoldingsINFY} (pre: ${preSellHoldingsINFY}), cashWallets.INR: ${postSellCashINR} (pre: ${preSellCashINR}), voucher: ${sellSettlement?.id}`,
      evidence: {
        orderStatus: executedSellOrder.status,
        holdingsDelta: postSellHoldingsINFY - preSellHoldingsINFY,
        cashDelta: postSellCashINR - preSellCashINR,
        voucherType: sellSettlement?.type,
        voucherStatus: sellSettlement?.status
      },
      status: (
        executedSellOrder.status === 'EXECUTED_PENDING_SETTLEMENT' &&
        postSellHoldingsINFY === preSellHoldingsINFY - 25 &&
        postSellCashINR === preSellCashINR &&
        sellSettlement?.status === 'PENDING' &&
        sellSettlement?.type === 'PROCEEDS_DISBURSEMENT'
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 6: BANK TELLER CONFIRMATION OF BUY & SELL VOUCHERS
    // ======================================================================
    console.log('\n--- SECTION 6: BANK TELLER SETTLEMENT CONFIRMATION ---');

    // 6.1: Settle the BUY voucher
    const settleBuyRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: buySettlement.id,
      notes: 'Cash collected at Bank Window 1'
    }, bearerHeader(tokenBank));

    assert.strictEqual(settleBuyRes.status, 200, `Bank settle buy failed: ${JSON.stringify(settleBuyRes.data)}`);

    const t01PostSettleBuy = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');

    recordResult({
      id: 'BANK-SETTLE-BUY-01',
      title: 'Bank Teller Settlement Confirmation (Payment Collection / Buy)',
      endpoint: 'POST /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Bank teller confirms BUY payment collection voucher; cash debited, reservation released, holdings credited',
      expected: 'HTTP 200, settlement SETTLED, order SETTLED, reservedCash reduced, cashWallet debited, holdings credited',
      actual: `HTTP 200, settlementStatus: ${settleBuyRes.data.settlement?.status}, orderStatus: ${settleBuyRes.data.order?.status}, reservedCash.INR: ${t01PostSettleBuy.reservedCash?.INR}, holdings.TCS: ${t01PostSettleBuy.holdings?.TCS}`,
      evidence: {
        settlement: settleBuyRes.data.settlement,
        wallets: settleBuyRes.data.wallets,
        holdings: settleBuyRes.data.holdings
      },
      status: (
        settleBuyRes.data.settlement?.status === 'SETTLED' &&
        settleBuyRes.data.order?.status === 'SETTLED' &&
        t01PostSettleBuy.reservedCash?.INR === 0 &&
        t01PostSettleBuy.holdings?.TCS === postHoldingsTCS + 20
      ) ? 'PASSED' : 'FAILED'
    });

    // 6.2: Settle the SELL voucher
    const settleSellRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: sellSettlement.id,
      notes: 'Proceeds disbursed at Bank Window 2'
    }, bearerHeader(tokenBank));

    assert.strictEqual(settleSellRes.status, 200, `Bank settle sell failed: ${JSON.stringify(settleSellRes.data)}`);

    const t01PostSettleSell = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');

    recordResult({
      id: 'BANK-SETTLE-SELL-01',
      title: 'Bank Teller Settlement Confirmation (Proceeds Disbursement / Sell)',
      endpoint: 'POST /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Bank teller confirms SELL proceeds disbursement voucher; cash credited to team wallet',
      expected: 'HTTP 200, settlement SETTLED, order SETTLED, cashWallets.INR credited with totalAmount',
      actual: `HTTP 200, settlementStatus: ${settleSellRes.data.settlement?.status}, orderStatus: ${settleSellRes.data.order?.status}, cashWallets.INR: ${t01PostSettleSell.cashWallets?.INR}`,
      evidence: {
        settlement: settleSellRes.data.settlement,
        cashBalance: t01PostSettleSell.cashBalance,
        creditedAmount: sellSettlement.totalAmount
      },
      status: (
        settleSellRes.data.settlement?.status === 'SETTLED' &&
        settleSellRes.data.order?.status === 'SETTLED' &&
        Math.abs(t01PostSettleSell.cashWallets?.INR - (t01PostSettleBuy.cashWallets?.INR + sellSettlement.totalAmount)) < 0.01
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 7: DUPLICATE SETTLEMENT REJECTION (409 CONFLICT)
    // ======================================================================
    console.log('\n--- SECTION 7: DUPLICATE SETTLEMENT REJECTION (409 CONFLICT) ---');

    // Attempt to settle the already settled BUY voucher again
    const dupSettleRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: buySettlement.id
    }, bearerHeader(tokenBank));

    const t01AfterDupAttempt = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');

    recordResult({
      id: 'DUP-SETTLE-01',
      title: 'Duplicate Settlement Attempt Rejection (409 Conflict)',
      endpoint: 'POST /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Attempt second settlement call on already SETTLED voucher',
      expected: 'HTTP 409 Conflict with duplicate settlement notice; zero ledger modification',
      actual: `HTTP ${dupSettleRes.status}: "${dupSettleRes.data?.error}", cashWallets.INR unchanged at ${t01AfterDupAttempt.cashWallets?.INR}`,
      evidence: { status: dupSettleRes.status, error: dupSettleRes.data?.error },
      status: (dupSettleRes.status === 409 && t01AfterDupAttempt.cashWallets?.INR === t01PostSettleSell.cashWallets?.INR) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 8: SETTLEMENT REJECTION WORKFLOW (BUY & SELL)
    // ======================================================================
    console.log('\n--- SECTION 8: SETTLEMENT REJECTION WORKFLOW ---');

    // 8.1: Buy Order Rejection by Bank Teller
    const buyRejectOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_2P_REJECT_BUY',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 15,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const buyRejectOrderId = buyRejectOrderRes.data.orderId;
    const execBuyRejectRes = await apiRequest('POST', '/api/order/action', {
      orderId: buyRejectOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const rejectBuyVoucher = execBuyRejectRes.data.settlement;
    const statePreReject = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const t01PreRejectBuy = statePreReject.teams.find(t => t.teamCode === 'T01');
    const secPreRejectBuy = statePreReject.securities.find(s => s.ticker === 'TCS');

    // Attempt rejection without reason -> 400
    const noReasonRes = await apiRequest('POST', '/api/bank/reject', {
      settlementId: rejectBuyVoucher.id,
      reason: ''
    }, bearerHeader(tokenBank));

    // Reject with explicit valid reason -> 200
    const rejectBuyRes = await apiRequest('POST', '/api/bank/reject', {
      settlementId: rejectBuyVoucher.id,
      reason: 'Physical cash shortage at teller counter'
    }, bearerHeader(tokenBank));

    const statePostReject = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const t01PostRejectBuy = statePostReject.teams.find(t => t.teamCode === 'T01');
    const secPostRejectBuy = statePostReject.securities.find(s => s.ticker === 'TCS');

    recordResult({
      id: 'SETTLE-REJECT-BUY-01',
      title: 'Settlement Rejection for Buy Voucher (Cash Reservation Release)',
      endpoint: 'POST /api/bank/reject',
      role: 'bank_teller',
      scenario: 'Bank teller rejects BUY voucher; verify reason enforced, reservation released, float returned',
      expected: 'Empty reason 400; valid reason 200; settlement REJECTED, order SETTLEMENT_REJECTED, reservedCash restored, float units restored',
      actual: `noReason: HTTP ${noReasonRes.status}, validReject: HTTP ${rejectBuyRes.status}, reservedCash.INR: ${t01PostRejectBuy.reservedCash?.INR} (was ${t01PreRejectBuy.reservedCash?.INR}), float: ${secPostRejectBuy.availableUnits} (was ${secPreRejectBuy.availableUnits})`,
      evidence: {
        noReasonStatus: noReasonRes.status,
        rejectStatus: rejectBuyRes.status,
        reservedBefore: t01PreRejectBuy.reservedCash?.INR,
        reservedAfter: t01PostRejectBuy.reservedCash?.INR,
        floatBefore: secPreRejectBuy.availableUnits,
        floatAfter: secPostRejectBuy.availableUnits,
        orderStatus: rejectBuyRes.data?.order?.status
      },
      status: (
        noReasonRes.status === 400 &&
        rejectBuyRes.status === 200 &&
        rejectBuyRes.data?.settlement?.status === 'REJECTED' &&
        rejectBuyRes.data?.order?.status === 'SETTLEMENT_REJECTED' &&
        t01PostRejectBuy.reservedCash?.INR === 0 &&
        secPostRejectBuy.availableUnits === secPreRejectBuy.availableUnits + 15
      ) ? 'PASSED' : 'FAILED'
    });

    // 8.2: Sell Order Rejection by Bank Teller (Holdings Restoration)
    const sellRejectOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_2P_REJECT_SELL',
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'SELL',
      quantity: 10,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const sellRejectOrderId = sellRejectOrderRes.data.orderId;
    const execSellRejectRes = await apiRequest('POST', '/api/order/action', {
      orderId: sellRejectOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const rejectSellVoucher = execSellRejectRes.data.settlement;
    const t01MidRejectSell = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');

    const rejectSellRes = await apiRequest('POST', '/api/bank/reject', {
      settlementId: rejectSellVoucher.id,
      reason: 'Physical delivery slip signature invalid'
    }, bearerHeader(tokenBank));

    const t01PostRejectSell = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');

    recordResult({
      id: 'SETTLE-REJECT-SELL-01',
      title: 'Settlement Rejection for Sell Voucher (Holdings Restoration)',
      endpoint: 'POST /api/bank/reject',
      role: 'bank_teller',
      scenario: 'Bank teller rejects SELL voucher; verify surrendered shares returned to team holdings',
      expected: 'HTTP 200, settlement REJECTED, order SETTLEMENT_REJECTED, holdings restored',
      actual: `HTTP ${rejectSellRes.status}, holdings.INFY: ${t01PostRejectSell.holdings?.INFY} (surrendered mid: ${t01MidRejectSell.holdings?.INFY})`,
      evidence: {
        rejectStatus: rejectSellRes.status,
        holdingsBefore: t01MidRejectSell.holdings?.INFY,
        holdingsAfter: t01PostRejectSell.holdings?.INFY,
        reason: rejectSellRes.data?.settlement?.rejectionReason
      },
      status: (
        rejectSellRes.status === 200 &&
        rejectSellRes.data?.settlement?.status === 'REJECTED' &&
        t01PostRejectSell.holdings?.INFY === (t01MidRejectSell.holdings?.INFY || 0) + 10
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 9: SCOPED AUTHORIZATION & PARTICIPANT ISOLATION
    // ======================================================================
    console.log('\n--- SECTION 9: SCOPED AUTHORIZATION & PARTICIPANT PRIVACY ---');

    // Create a voucher for Team T02 so we can test cross-team isolation
    const t02OrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_T02_ISO_01',
      teamCode: 'T02',
      ticker: 'OAI',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, bearerHeader(tokenT02));

    const execT02Res = await apiRequest('POST', '/api/order/action', {
      orderId: t02OrderRes.data?.orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const t02Voucher = execT02Res.data?.settlement;

    // 9.1: Anonymous access to /api/bank/settlements -> 401
    const anonListRes = await apiRequest('GET', '/api/bank/settlements');
    recordResult({
      id: 'AUTH-BANK-ANON-01',
      title: 'Anonymous Access Blocked on /api/bank/settlements',
      endpoint: 'GET /api/bank/settlements',
      role: 'anonymous',
      scenario: 'Unauthenticated caller attempts to query bank settlements list',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${anonListRes.status}`,
      evidence: anonListRes.data,
      status: anonListRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 9.2: Team T01 queries settlements -> receives only T01 records
    const t01ListRes = await apiRequest('GET', '/api/bank/settlements', null, bearerHeader(tokenT01));
    const t01Records = t01ListRes.data;
    const hasT02InT01View = Array.isArray(t01Records) && t01Records.some(r => r.teamCode === 'T02');

    recordResult({
      id: 'ISOLATION-BANK-LIST-01',
      title: 'Team Settlement List Scoping & Privacy',
      endpoint: 'GET /api/bank/settlements',
      role: 'team (T01)',
      scenario: 'Team T01 queries settlements; must only see T01 records, T02 strictly excluded',
      expected: 'HTTP 200, array containing only T01 records, 0 records for T02',
      actual: `HTTP ${t01ListRes.status}, totalRecords: ${t01Records.length}, hasT02InView: ${hasT02InT01View}`,
      evidence: { recordCount: t01Records.length, hasT02: hasT02InT01View },
      status: t01ListRes.status === 200 && Array.isArray(t01Records) && !hasT02InT01View ? 'PASSED' : 'FAILED'
    });

    // 9.3: Team T01 attempts to view T02's settlement voucher by ID -> 403 Forbidden
    const crossViewRes = await apiRequest('GET', `/api/bank/settlements/${t02Voucher.id}`, null, bearerHeader(tokenT01));
    recordResult({
      id: 'ISOLATION-BANK-ID-01',
      title: 'Cross-Team Individual Voucher Inspection Blocked',
      endpoint: 'GET /api/bank/settlements/:id',
      role: 'team (T01)',
      scenario: 'Team T01 attempts to inspect settlement voucher belonging to T02',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${crossViewRes.status}`,
      evidence: crossViewRes.data,
      status: crossViewRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 9.4: Team T01 attempts to settle its own voucher -> 403 Forbidden
    const teamSettleRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: buySettlement.id
    }, bearerHeader(tokenT01));

    recordResult({
      id: 'AUTH-BANK-SETTLE-TEAM-01',
      title: 'Participant Team Prohibited from Self-Settling',
      endpoint: 'POST /api/bank/settle',
      role: 'team (T01)',
      scenario: 'Student participant team attempts to confirm settlement on a voucher',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamSettleRes.status}`,
      evidence: teamSettleRes.data,
      status: teamSettleRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 9.5: Team T01 attempts to reject a voucher -> 403 Forbidden
    const teamRejectRes = await apiRequest('POST', '/api/bank/reject', {
      settlementId: t02Voucher.id,
      reason: 'Attempted fraud'
    }, bearerHeader(tokenT01));

    recordResult({
      id: 'AUTH-BANK-REJECT-TEAM-01',
      title: 'Participant Team Prohibited from Rejecting Settlements',
      endpoint: 'POST /api/bank/reject',
      role: 'team (T01)',
      scenario: 'Participant team attempts to call settlement rejection endpoint',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamRejectRes.status}`,
      evidence: teamRejectRes.data,
      status: teamRejectRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 10: MULTI-CURRENCY ACCURACY (USD WALLET & RESERVED CASH)
    // ======================================================================
    console.log('\n--- SECTION 10: MULTI-CURRENCY ACCURACY (USD WALLET & RESERVATION) ---');

    // T02 voucher for OAI was executed: 5 units of OAI at 180 USD = 900 USD
    const t02PreSettleUSD = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T02');
    const preUSDWallet = Number(t02PreSettleUSD.cashWallets.USD);
    const preUSDReserved = Number(t02PreSettleUSD.reservedCash?.USD || 0);
    const preINRWallet = Number(t02PreSettleUSD.cashWallets.INR);

    // Bank Teller settles T02's USD voucher
    const settleUSDRes = await apiRequest('POST', '/api/bank/settle', {
      settlementId: t02Voucher.id,
      notes: 'USD physical cash voucher processed'
    }, bearerHeader(tokenBank));

    assert.strictEqual(settleUSDRes.status, 200, 'Bank failed to settle USD voucher');

    const t02PostSettleUSD = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T02');
    const postUSDWallet = Number(t02PostSettleUSD.cashWallets.USD);
    const postUSDReserved = Number(t02PostSettleUSD.reservedCash?.USD || 0);
    const postINRWallet = Number(t02PostSettleUSD.cashWallets.INR);

    recordResult({
      id: 'MULTI-CURRENCY-01',
      title: 'Native USD Currency Wallet Accuracy & Reservation Release',
      endpoint: 'POST /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Settle USD trade voucher for OAI; verify cashWallets.USD debited, reservedCash.USD released, INR wallet unchanged',
      expected: 'cashWallets.USD debited by 900 USD, reservedCash.USD reduced to 0, INR wallet strictly untouched',
      actual: `cashWallets.USD: ${postUSDWallet} (pre: ${preUSDWallet}), reservedCash.USD: ${postUSDReserved} (pre: ${preUSDReserved}), cashWallets.INR: ${postINRWallet} (pre: ${preINRWallet})`,
      evidence: {
        usdPre: preUSDWallet,
        usdPost: postUSDWallet,
        reservedUSDPre: preUSDReserved,
        reservedUSDPost: postUSDReserved,
        inrPre: preINRWallet,
        inrPost: postINRWallet
      },
      status: (
        postUSDWallet === preUSDWallet - 900 &&
        postUSDReserved === 0 &&
        postINRWallet === preINRWallet
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 11: TRANSACTION VOID CONSISTENCY WITH LINKED PENDING SETTLEMENT
    // ======================================================================
    console.log('\n--- SECTION 11: TRANSACTION VOID & SETTLEMENT RECONCILIATION CONSISTENCY ---');

    // Create a new pending BUY trade to test voiding before bank settlement
    const voidOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT_2P_VOID_01',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 12,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const execVoidRes = await apiRequest('POST', '/api/order/action', {
      orderId: voidOrderRes.data.orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const txToVoid = execVoidRes.data.transaction;
    const stlToVoid = execVoidRes.data.settlement;

    const t01PreVoid = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8')).teams.find(t => t.teamCode === 'T01');
    const cashBeforeVoid = Number(t01PreVoid.cashWallets.INR);
    const reservedBeforeVoid = Number(t01PreVoid.reservedCash?.INR || 0);

    // SEBI / Admin voids the transaction
    const voidRes = await apiRequest('POST', '/api/transactions/void', {
      id: txToVoid.id,
      reason: 'Paper trade cancellation prior to bank processing'
    }, bearerHeader(tokenSebi));

    assert.strictEqual(voidRes.status, 200, 'SEBI failed to void transaction');

    const stateAfterVoid = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const t01PostVoid = stateAfterVoid.teams.find(t => t.teamCode === 'T01');
    const voidedStl = stateAfterVoid.settlements.find(s => s.id === stlToVoid.id);
    const voidedOrder = stateAfterVoid.orders.find(o => o.id === voidOrderRes.data.orderId);

    recordResult({
      id: 'VOID-SETTLE-CONSISTENCY-01',
      title: 'Transaction Void of Pending Two-Phase Trade',
      endpoint: 'POST /api/transactions/void',
      role: 'sebi',
      scenario: 'Void transaction with linked pending bank voucher; verify reservedCash released without double-crediting cashWallets',
      expected: 'HTTP 200, transaction voided, settlement VOIDED, order VOIDED, reservedCash released, cashWallets unchanged',
      actual: `HTTP ${voidRes.status}, settlementStatus: ${voidedStl?.status}, orderStatus: ${voidedOrder?.status}, reservedCash: ${t01PostVoid.reservedCash?.INR} (was ${reservedBeforeVoid}), cashWallets: ${t01PostVoid.cashWallets?.INR} (was ${cashBeforeVoid})`,
      evidence: {
        txVoided: voidRes.data?.transaction?.voided,
        settlementStatus: voidedStl?.status,
        orderStatus: voidedOrder?.status,
        cashDelta: t01PostVoid.cashWallets?.INR - cashBeforeVoid,
        reservedDelta: t01PostVoid.reservedCash?.INR - reservedBeforeVoid
      },
      status: (
        voidRes.status === 200 &&
        voidedStl?.status === 'VOIDED' &&
        voidedOrder?.status === 'VOIDED' &&
        t01PostVoid.cashWallets?.INR === cashBeforeVoid &&
        t01PostVoid.reservedCash?.INR === 0
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 12: RECONCILIATION AUDIT ENDPOINT
    // ======================================================================
    console.log('\n--- SECTION 12: BANK RECONCILIATION AUDIT ENDPOINT ---');

    // 12.1: Anonymous attempt -> 401
    const reconAnonRes = await apiRequest('GET', '/api/bank/reconciliation');
    recordResult({
      id: 'AUTH-BANK-RECON-ANON-01',
      title: 'Anonymous Access Blocked on /api/bank/reconciliation',
      endpoint: 'GET /api/bank/reconciliation',
      role: 'anonymous',
      scenario: 'Unauthenticated caller attempts to access bank reconciliation report',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${reconAnonRes.status}`,
      evidence: reconAnonRes.data,
      status: reconAnonRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 12.2: Participant team attempt -> 403
    const reconTeamRes = await apiRequest('GET', '/api/bank/reconciliation', null, bearerHeader(tokenT01));
    recordResult({
      id: 'AUTH-BANK-RECON-TEAM-01',
      title: 'Participant Team Blocked from /api/bank/reconciliation',
      endpoint: 'GET /api/bank/reconciliation',
      role: 'team (T01)',
      scenario: 'Participant team attempts to access supervisory bank reconciliation report',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${reconTeamRes.status}`,
      evidence: reconTeamRes.data,
      status: reconTeamRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 12.3: Bank Teller / SEBI reconciliation query -> 200 HEALTHY
    const reconBankRes = await apiRequest('GET', '/api/bank/reconciliation', null, bearerHeader(tokenBank));
    const reconData = reconBankRes.data;

    recordResult({
      id: 'BANK-RECONCILIATION-01',
      title: 'Bank Reconciliation Report Accuracy & Health Check',
      endpoint: 'GET /api/bank/reconciliation',
      role: 'bank_teller',
      scenario: 'Bank teller queries reconciliation audit summary and discrepancy check',
      expected: 'HTTP 200, status: HEALTHY, discrepancies: [], accurate summary counts and currency breakdown',
      actual: `HTTP ${reconBankRes.status}, status: ${reconData.status}, totalSettlements: ${reconData.summary?.totalSettlements}, settledCount: ${reconData.summary?.settledCount}, discrepancies: ${reconData.discrepancies?.length}`,
      evidence: {
        status: reconData.status,
        summary: reconData.summary,
        discrepanciesCount: reconData.discrepancies?.length
      },
      status: (
        reconBankRes.status === 200 &&
        reconData.status === 'HEALTHY' &&
        reconData.discrepancies?.length === 0 &&
        reconData.summary?.settledCount > 0
      ) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 13: UI ROUTE AND NAVIGATION METADATA AUDIT
    // ======================================================================
    console.log('\n--- SECTION 13: UI ROUTE & NAVIGATION AUDIT ---');

    const navConfigFile = path.join(__dirname, 'src', 'lib', 'navigationConfig.js');
    const navContent = fs.readFileSync(navConfigFile, 'utf8');
    const hasBankInNav = navContent.includes("path: '#/bank'") && navContent.includes("'bank_teller'");

    const appJsxFile = path.join(__dirname, 'src', 'App.jsx');
    const appContent = fs.readFileSync(appJsxFile, 'utf8');
    const hasBankInApp = appContent.includes("BankPage") && appContent.includes("case '#/bank':");

    const bankPageFile = path.join(__dirname, 'src', 'pages', 'BankPage.jsx');
    const bankPageExists = fs.existsSync(bankPageFile);

    recordResult({
      id: 'UI-BANK-INTEGRATION-01',
      title: 'Bank Desk UI Route & Navigation Registration Audit',
      endpoint: 'UI / Client Architecture',
      role: 'all roles',
      scenario: 'Verify BankPage component exists, registered in App.jsx routing and navigationConfig.js',
      expected: 'BankPage.jsx exists, navigation item registered for bank_teller/admin/sebi/team, route case #/bank in App.jsx',
      actual: `BankPage exists: ${bankPageExists}, navConfig registered: ${hasBankInNav}, App.jsx routing registered: ${hasBankInApp}`,
      evidence: { bankPageExists, hasBankInNav, hasBankInApp },
      status: bankPageExists && hasBankInNav && hasBankInApp ? 'PASSED' : 'FAILED'
    });

  } finally {
    // Teardown test server
    console.log('\n--- CLEANING UP TEST PROCESS & FIXTURES ---');
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));

    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Removed disposable test fixture: ${path.basename(DISPOSABLE_STATE)}`);
      }
    } catch (e) {
      console.warn('Warning: Could not remove disposable fixture:', e.message);
    }
  }

  // STEP 5: POST-FLIGHT STATE INTEGRITY CHECK
  console.log('\n--- STEP 5: POST-FLIGHT STATE INTEGRITY CHECK ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Final authoritative state.json SHA-256: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'FATAL: AUTHORITATIVE STATE FILE WAS MUTATED DURING TESTING!');
  console.log('✓ Verified: Authoritative state.json remains 100% bit-for-bit unchanged!\n');

  recordResult({
    id: 'POSTFLIGHT-01',
    title: 'Post-flight Authoritative State Hash Verification',
    endpoint: 'N/A',
    role: 'system',
    scenario: 'Confirm authoritative state.json was completely protected from mutations',
    expected: EXPECTED_HASH,
    actual: finalHash,
    evidence: { sha256: finalHash },
    status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 6: WRITE CONSOLIDATED RESULTS
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    suite: 'SAAMX Consolidated Build Phase 2 — Physical Bank Desk and Two-Phase Settlement',
    authoritativeStateHash: finalHash,
    totalTests: testResults.length,
    passedCount: testResults.filter(r => r.status === 'PASSED').length,
    failedCount: testResults.filter(r => r.status === 'FAILED').length,
    results: testResults
  }, null, 2), 'utf8');

  console.log('======================================================================');
  console.log(`📊 PHASE 2 TEST RESULTS SUMMARY: ${testResults.filter(r => r.status === 'PASSED').length}/${testResults.length} PASSED`);
  console.log('======================================================================');

  const failedTests = testResults.filter(r => r.status === 'FAILED');
  if (failedTests.length > 0) {
    console.error(`\n❌ ${failedTests.length} tests failed!`);
    failedTests.forEach(f => console.error(`  - ${f.id}: ${f.title}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 18 CONSOLIDATED PHASE 2 BANKING INTEGRATION TESTS PASSED PERFECTLY!\n');
  }
}

runConsolidatedPhase2Suite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
