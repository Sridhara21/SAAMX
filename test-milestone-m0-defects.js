import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3105;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-m0-disposable.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-milestone-m0-results.json');

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

async function getTeamState(token, teamCode = 'T01') {
  const res = await apiRequest('GET', '/api/state', null, bearerHeader(token));
  const t = (res.data?.teams || []).find(team => team.teamCode === teamCode || team.id === teamCode);
  return t || {};
}

async function runMilestoneM0DefectSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX MILESTONE M0 — AUTOMATED DEFECT & INTEGRITY TEST SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, `AUTHORITATIVE STATE HASH MISMATCH! Expected ${EXPECTED_HASH}, got ${initialHash}`);
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: FIXTURE SETUP
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  const fixture = JSON.parse(fs.readFileSync(ORIGINAL_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Seeded disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}\n`);

  // STEP 3: SPAWN ISOLATED TEST SERVER
  console.log(`--- STEP 3: LAUNCHING ISOLATED SERVER INSTANCE ON PORT ${PORT} ---`);
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
    serverProcess.kill();
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES & OPENING MARKET ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    assert(tokenT01 && tokenAdmin && tokenExchange && tokenBank, 'Failed to acquire test session tokens');
    console.log('✓ Successfully acquired session tokens for T01, Admin, Exchange, and Bank.');

    // Ensure market is started with manual override active
    const startMarketRes = await apiRequest('POST', '/api/market/control', { action: 'START' }, bearerHeader(tokenAdmin));
    assert.strictEqual(startMarketRes.status, 200, 'Failed to open market via /api/market/control');
    console.log('✓ Market opened with manual override enabled.\n');

    // ======================================================================
    // SECTION 1: DEFECT 2 — ADMIN UI ENDPOINT & PHRASE ALIGNMENT
    // ======================================================================
    console.log('======================================================================');
    console.log('📌 DEFECT 2: ADMIN UI ENDPOINT & CONFIRMATION PHRASE ALIGNMENT');
    console.log('======================================================================');

    const adminPageCode = fs.readFileSync(path.join(__dirname, 'src', 'pages', 'AdminPage.jsx'), 'utf8');
    const hasWrongEndpoint = adminPageCode.includes('/api/admin/reset-database');
    const hasCorrectEndpoint = adminPageCode.includes('/api/admin/reset');
    const hasWrongPhrase = adminPageCode.includes("resetPhrase !== 'CONFIRM RESET'");
    const hasCorrectPhrase = adminPageCode.includes("resetPhrase !== 'RESET ALL'");
    const hasCorrectPlaceholder = adminPageCode.includes('placeholder="Type RESET ALL"');
    const sendsConfirmText = adminPageCode.includes('confirmText: resetPhrase');

    recordResult({
      id: 'D2-UI-01',
      title: 'Admin UI Reset Endpoint Alignment',
      endpoint: 'src/pages/AdminPage.jsx',
      role: 'static-audit',
      scenario: 'Verify Admin UI calls authoritative /api/admin/reset without 404 mismatch',
      expected: 'No /api/admin/reset-database, contains /api/admin/reset with confirmText',
      actual: `hasWrongEndpoint: ${hasWrongEndpoint}, hasCorrectEndpoint: ${hasCorrectEndpoint}, sendsConfirmText: ${sendsConfirmText}`,
      evidence: { hasWrongEndpoint, hasCorrectEndpoint, sendsConfirmText },
      status: (!hasWrongEndpoint && hasCorrectEndpoint && sendsConfirmText) ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'D2-UI-02',
      title: 'Admin UI Reset Phrase Alignment',
      endpoint: 'src/pages/AdminPage.jsx',
      role: 'static-audit',
      scenario: 'Verify Admin UI prompts and checks exact phrase RESET ALL',
      expected: 'No CONFIRM RESET check, contains resetPhrase !== "RESET ALL" and placeholder',
      actual: `hasWrongPhrase: ${hasWrongPhrase}, hasCorrectPhrase: ${hasCorrectPhrase}, hasCorrectPlaceholder: ${hasCorrectPlaceholder}`,
      evidence: { hasWrongPhrase, hasCorrectPhrase, hasCorrectPlaceholder },
      status: (!hasWrongPhrase && hasCorrectPhrase && hasCorrectPlaceholder) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 2: DEFECT 3 — FX QUEUE SETTLEMENT ACID & LEDGER INTEGRATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 DEFECT 3: FX QUEUE SETTLEMENT ACID ISOLATION & DOUBLE-ENTRY LEDGER');
    console.log('======================================================================');

    // Read starting balances via /api/state
    const tPreQueue = await getTeamState(tokenT01, 'T01');
    const preINR = Number(tPreQueue.cashWallets?.INR || 10000000);
    const preUSD = Number(tPreQueue.cashWallets?.USD || 0);

    // Step 2.1: Submit FX request for T01 (100,000 INR -> USD)
    const fxReqRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000,
      notes: 'M0 Queue Settlement Verification'
    }, bearerHeader(tokenT01));

    assert.strictEqual(fxReqRes.status, 200, 'Failed to submit FX request');
    const createdFxItem = fxReqRes.data.fxRequest;
    assert(createdFxItem?.requestId, 'Created FX request missing requestId');

    // Step 2.2: Settle FX request via /api/fx/queue-action
    const fxSettleRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: createdFxItem.requestId,
      actionType: 'SETTLE',
      operatorId: 'FX Desk Lead'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(fxSettleRes.status, 200, `FX Queue settlement failed with status ${fxSettleRes.status}`);
    const settledItem = fxSettleRes.data.fxRequest;
    const settledTx = fxSettleRes.data.transaction;

    // Read post-settle state
    const tPostQueue = await getTeamState(tokenT01, 'T01');
    const postINR = Number(tPostQueue.cashWallets?.INR);
    const postUSD = Number(tPostQueue.cashWallets?.USD);
    const inrDelta = preINR - postINR;
    const usdDelta = postUSD - preUSD;

    const statePostQueueRes = await apiRequest('GET', '/api/state', null, bearerHeader(tokenAdmin));
    const recordedTxInState = (statePostQueueRes.data?.fxTransactions || []).find(t => t.id === settledTx.id);

    recordResult({
      id: 'D3-FX-01',
      title: 'FX Queue Settle ACID Wallet Mutation',
      endpoint: 'POST /api/fx/queue-action',
      role: 'exchange',
      scenario: 'Settle queued FX request (100,000 INR -> USD); verify atomic debit/credit',
      expected: 'Status SETTLED, INR debited exactly 100,000, USD credited converted amount',
      actual: `status: ${settledItem.status}, inrDelta: ${inrDelta}, usdDelta: ${usdDelta.toFixed(4)}`,
      evidence: {
        itemStatus: settledItem.status,
        inrDelta,
        usdDelta,
        walletsAfter: settledTx.walletsAfter
      },
      status: (settledItem.status === 'SETTLED' && inrDelta === 100000 && usdDelta > 0 && settledTx.walletsAfter) ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'D3-FX-02',
      title: 'FX Queue Settle Ledger & Transaction Record',
      endpoint: 'POST /api/fx/queue-action',
      role: 'exchange',
      scenario: 'Verify fxTransactions array records ticketNumber, operatorId, and walletsAfter',
      expected: 'fxTransaction recorded with ticketNumber, operatorId, and valid transaction ID',
      actual: `recorded: ${!!recordedTxInState}, ticketNumber: ${settledTx.ticketNumber}, operatorId: ${settledTx.operatorId}`,
      evidence: {
        txId: settledTx.id,
        ticketNumber: settledTx.ticketNumber,
        operatorId: settledTx.operatorId,
        inState: !!recordedTxInState
      },
      status: (recordedTxInState && settledTx.ticketNumber && settledTx.operatorId) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 3: DEFECT 4 — /api/fx/exchange DUPLICATE TICKET PROTECTION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 DEFECT 4: DIRECT FX CONVERSION DUPLICATE TICKET PROTECTION');
    console.log('======================================================================');

    const uniqueTicketNumber = `FX-TKT-M0-${Date.now()}`;

    // Step 3.1: First submission -> 200 OK
    const fxDirect1 = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 10000,
      ticketNumber: uniqueTicketNumber,
      notes: 'First conversion with unique ticket'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(fxDirect1.status, 200, `First direct exchange failed with status ${fxDirect1.status}`);

    // Read wallet after first exchange
    const tAfterDirect1 = await getTeamState(tokenT01, 'T01');
    const inrAfterDirect1 = Number(tAfterDirect1.cashWallets?.INR);

    // Step 3.2: Duplicate submission with identical ticketNumber -> 400 Bad Request
    const fxDirect2 = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 10000,
      ticketNumber: uniqueTicketNumber,
      notes: 'Second conversion with duplicate ticket'
    }, bearerHeader(tokenExchange));

    // Read wallet after second attempt
    const tAfterDirect2 = await getTeamState(tokenT01, 'T01');
    const inrAfterDirect2 = Number(tAfterDirect2.cashWallets?.INR);

    recordResult({
      id: 'D4-DUP-01',
      title: 'Duplicate FX Ticket Submission Rejection',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Submit identical ticketNumber FX-TKT-M0-... twice to /api/fx/exchange',
      expected: 'Second attempt rejected with HTTP 400 Bad Request ("already been processed")',
      actual: `HTTP ${fxDirect2.status} - ${fxDirect2.data?.error || ''}`,
      evidence: fxDirect2.data,
      status: (fxDirect2.status === 400 && String(fxDirect2.data?.error).includes('already been processed')) ? 'PASSED' : 'FAILED'
    });

    recordResult({
      id: 'D4-DUP-02',
      title: 'Duplicate FX Ticket Zero-Debit Invariant',
      endpoint: 'POST /api/fx/exchange',
      role: 'exchange',
      scenario: 'Verify wallet was not debited a second time on duplicate ticket rejection',
      expected: 'INR wallet after duplicate attempt strictly equals wallet after first attempt',
      actual: `inrAfterDirect1: ${inrAfterDirect1}, inrAfterDirect2: ${inrAfterDirect2}`,
      evidence: { inrAfterDirect1, inrAfterDirect2, diff: inrAfterDirect2 - inrAfterDirect1 },
      status: (inrAfterDirect1 === inrAfterDirect2 && !isNaN(inrAfterDirect1)) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 4: DEFECT 5 — ORDER CANCELLATION ZERO-LEAK & SETTLED GUARD
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 DEFECT 5: ORDER CANCELLATION ZERO-LEAK REMEDIATION & SETTLED GUARD');
    console.log('======================================================================');

    // Ensure TWO_PHASE_BANK mode is active
    await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'TWO_PHASE_BANK' }, bearerHeader(tokenAdmin));

    // --- SUBTEST 5.1: BUY ORDER CANCELLATION LEAK REMEDIATION ---
    // Snapshot balances before BUY
    const tPreBuy = await getTeamState(tokenT01, 'T01');
    const preBuyReserved = Number(tPreBuy.reservedCash?.INR || 0);

    // Submit BUY order: 10 shares of TCS
    const buyOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-BUY-CANCEL-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(buyOrderRes.status, 200, `Failed to submit test buy order: ${JSON.stringify(buyOrderRes.data)}`);
    const buyOrderId = buyOrderRes.data.orderId;

    // Execute at exchange desk into EXECUTED_PENDING_SETTLEMENT
    const execBuyRes = await apiRequest('POST', '/api/order/action', {
      orderId: buyOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execBuyRes.status, 200, `Failed to execute test buy order: ${JSON.stringify(execBuyRes.data)}`);
    const executedBuy = execBuyRes.data.order;
    const buyVoucher = execBuyRes.data.settlement;
    assert(['EXCHANGE_APPROVED', 'EXECUTED_PENDING_SETTLEMENT'].includes(executedBuy.status), 'Order not in pending settlement');

    // Verify reservedCash increased
    const tPostExecBuy = await getTeamState(tokenT01, 'T01');
    const postExecReserved = Number(tPostExecBuy.reservedCash?.INR || 0);
    assert(postExecReserved > preBuyReserved, `reservedCash did not increase on execution (pre: ${preBuyReserved}, post: ${postExecReserved})`);

    // Cancel the pending buy order
    const cancelBuyRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: buyOrderId,
      teamCode: 'T01',
      reason: 'Milestone M0 BUY Cancellation Test'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(cancelBuyRes.status, 200, `Failed to cancel order: ${JSON.stringify(cancelBuyRes.data)}`);

    // Verify reservedCash is released back
    const tPostCancelBuy = await getTeamState(tokenT01, 'T01');
    const postCancelReserved = Number(tPostCancelBuy.reservedCash?.INR || 0);
    const cancelledVoucher = cancelBuyRes.data?.settlement;

    recordResult({
      id: 'D5-LEAK-01',
      title: 'BUY Order Cancellation Reserved Cash Zero-Leak',
      endpoint: 'POST /api/orders/cancel',
      role: 'admin',
      scenario: 'Cancel BUY order in EXECUTED_PENDING_SETTLEMENT; verify reservedCash released to baseline',
      expected: 'Order CANCELLED, reservedCash returns to pre-order level, voucher marked CANCELLED',
      actual: `orderStatus: ${cancelBuyRes.data?.order?.status}, preBuyReserved: ${preBuyReserved}, postExecReserved: ${postExecReserved}, postCancelReserved: ${postCancelReserved}, voucherStatus: ${cancelledVoucher?.status}`,
      evidence: {
        preBuyReserved,
        postExecReserved,
        postCancelReserved,
        voucherStatus: cancelledVoucher?.status
      },
      status: (cancelBuyRes.data?.order?.status === 'CANCELLED' && postCancelReserved === preBuyReserved && cancelledVoucher?.status === 'CANCELLED') ? 'PASSED' : 'FAILED'
    });

    // Attempt bank settlement on the cancelled voucher -> must be rejected
    const settleCancelledVoucherRes = await apiRequest('POST', '/api/bank/settle', {
      voucherReference: buyVoucher.voucherReference || buyVoucher.id
    }, bearerHeader(tokenBank));

    recordResult({
      id: 'D5-LEAK-02',
      title: 'Cancelled Voucher Settlement Prevention',
      endpoint: 'POST /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Bank teller attempts to settle voucher from cancelled order',
      expected: 'HTTP 400 Bad Request ("Cannot settle record in status CANCELLED")',
      actual: `HTTP ${settleCancelledVoucherRes.status} - ${settleCancelledVoucherRes.data?.error || ''}`,
      evidence: settleCancelledVoucherRes.data,
      status: (settleCancelledVoucherRes.status === 400 && String(settleCancelledVoucherRes.data?.error).includes('CANCELLED')) ? 'PASSED' : 'FAILED'
    });

    // --- SUBTEST 5.2: SELL ORDER CANCELLATION LEAK REMEDIATION ---
    // Ensure T01 has holdings of INFY
    let tPreSell = await getTeamState(tokenT01, 'T01');
    let preSellHoldings = Number(tPreSell.holdings?.INFY || 0);

    // If holdings are 0, grant seed holdings via buy or state setup
    if (preSellHoldings < 10) {
      const grantRes = await apiRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-SEED-BUY-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'INFY',
        action: 'BUY',
        quantity: 20,
        orderType: 'MARKET'
      }, bearerHeader(tokenT01));
      const grantExec = await apiRequest('POST', '/api/order/action', {
        orderId: grantRes.data.orderId,
        actionType: 'EXECUTE',
        deskId: 'DESK_1'
      }, bearerHeader(tokenAdmin));
      await apiRequest('POST', '/api/bank/settle', {
        voucherReference: grantExec.data.settlement?.voucherReference || grantExec.data.settlement?.id
      }, bearerHeader(tokenBank));
      tPreSell = await getTeamState(tokenT01, 'T01');
      preSellHoldings = Number(tPreSell.holdings?.INFY || 0);
    }
    assert(preSellHoldings >= 10, 'Insufficient INFY holdings for test');

    // Submit SELL order: 10 shares of INFY
    const sellOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-SELL-CANCEL-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'SELL',
      quantity: 10,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(sellOrderRes.status, 200, `Failed to submit test sell order: ${JSON.stringify(sellOrderRes.data)}`);
    const sellOrderId = sellOrderRes.data.orderId;

    // Execute at exchange desk
    const execSellRes = await apiRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execSellRes.status, 200, `Failed to execute test sell order: ${JSON.stringify(execSellRes.data)}`);
    const executedSell = execSellRes.data.order;
    const sellVoucher = execSellRes.data.settlement;

    // Verify holdings locked (M1 compliant: lockedHoldings reserved or holdings decremented)
    const tPostExecSell = await getTeamState(tokenT01, 'T01');
    const postExecHoldings = Number(tPostExecSell.holdings?.INFY || 0);
    const postExecLocked = Number(tPostExecSell.lockedHoldings?.INFY || 0);
    assert(postExecLocked >= 10 || postExecHoldings === preSellHoldings - 10, 'Holdings not locked or decremented on sell execution');

    // Cancel the pending sell order
    const cancelSellRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: sellOrderId,
      teamCode: 'T01',
      reason: 'Milestone M0 SELL Cancellation Test'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(cancelSellRes.status, 200, `Failed to cancel sell order: ${JSON.stringify(cancelSellRes.data)}`);

    // Verify holdings restored
    const tPostCancelSell = await getTeamState(tokenT01, 'T01');
    const postCancelHoldings = Number(tPostCancelSell.holdings?.INFY || 0);
    const cancelledSellVoucher = cancelSellRes.data?.settlement;

    recordResult({
      id: 'D5-LEAK-03',
      title: 'SELL Order Cancellation Holdings Restoration',
      endpoint: 'POST /api/orders/cancel',
      role: 'admin',
      scenario: 'Cancel SELL order in EXECUTED_PENDING_SETTLEMENT; verify surrendered shares restored',
      expected: 'Order CANCELLED, holdings restored to pre-order count, voucher marked CANCELLED',
      actual: `orderStatus: ${cancelSellRes.data?.order?.status}, preSellHoldings: ${preSellHoldings}, postExecHoldings: ${postExecHoldings}, postCancelHoldings: ${postCancelHoldings}, voucherStatus: ${cancelledSellVoucher?.status}`,
      evidence: {
        preSellHoldings,
        postExecHoldings,
        postCancelHoldings,
        voucherStatus: cancelledSellVoucher?.status
      },
      status: (cancelSellRes.data?.order?.status === 'CANCELLED' && postCancelHoldings === preSellHoldings && cancelledSellVoucher?.status === 'CANCELLED') ? 'PASSED' : 'FAILED'
    });

    // --- SUBTEST 5.3: SETTLED ORDER CANCELLATION GUARD ---
    // Submit, execute, and fully settle a trade
    const buyOrderSettleRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-BUY-SETTLE-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(buyOrderSettleRes.status, 200, `Failed to submit test buy order for settlement: ${JSON.stringify(buyOrderSettleRes.data)}`);
    const settleOrderId = buyOrderSettleRes.data.orderId;

    const execSettleRes = await apiRequest('POST', '/api/order/action', {
      orderId: settleOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execSettleRes.status, 200, `Failed to execute order: ${JSON.stringify(execSettleRes.data)}`);
    const settleVoucher = execSettleRes.data.settlement;

    const bankSettleRes = await apiRequest('POST', '/api/bank/settle', {
      voucherReference: settleVoucher.voucherReference || settleVoucher.id
    }, bearerHeader(tokenBank));

    assert.strictEqual(bankSettleRes.status, 200, `Failed to settle voucher: ${JSON.stringify(bankSettleRes.data)}`);

    // Verify order is now SETTLED
    const statePostBankSettle = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const settledOrder = statePostBankSettle.orders.find(o => o.id === settleOrderId);
    assert.strictEqual(settledOrder.status, 'SETTLED', 'Order not in status SETTLED');

    // Attempt to cancel the SETTLED order -> must be rejected with 400
    const cancelSettledRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: settleOrderId,
      teamCode: 'T01',
      reason: 'Attempting illegal cancel of settled order'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'D5-LEAK-04',
      title: 'Settled Order Cancellation Guard',
      endpoint: 'POST /api/orders/cancel',
      role: 'admin',
      scenario: 'Attempt to cancel an order that has already been SETTLED at the Bank',
      expected: 'HTTP 400 Bad Request ("Cannot cancel order in status SETTLED")',
      actual: `HTTP ${cancelSettledRes.status} - ${cancelSettledRes.data?.error || ''}`,
      evidence: cancelSettledRes.data,
      status: (cancelSettledRes.status === 400 && String(cancelSettledRes.data?.error).includes('SETTLED')) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 5: DEFECT 1 — /api/admin/reset RBAC & STRICT CONFIRMATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 DEFECT 1: /api/admin/reset SECURITY, RBAC & CONFIRMATION PHRASE');
    console.log('======================================================================');

    // Test 1.1: Unauthenticated reset -> 401
    const rAnon = await apiRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' });
    recordResult({
      id: 'D1-SEC-01',
      title: 'Unauthenticated Reset Request Rejection',
      endpoint: 'POST /api/admin/reset',
      role: 'anonymous',
      scenario: 'Caller without session token attempts to trigger master reset',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${rAnon.status}`,
      evidence: rAnon.data,
      status: rAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // Test 1.2: Team (non-admin) role reset -> 403
    const rTeam = await apiRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' }, bearerHeader(tokenT01));
    recordResult({
      id: 'D1-SEC-02',
      title: 'Non-Admin Participant Reset Request Rejection',
      endpoint: 'POST /api/admin/reset',
      role: 'team (T01)',
      scenario: 'Participant team attempts to trigger master reset with valid phrase',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${rTeam.status}`,
      evidence: rTeam.data,
      status: rTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // Test 1.3: Empty body bypass prevention -> 400
    const rEmpty = await apiRequest('POST', '/api/admin/reset', {}, bearerHeader(tokenAdmin));
    recordResult({
      id: 'D1-SEC-03',
      title: 'Empty Body Reset Bypass Prevention',
      endpoint: 'POST /api/admin/reset',
      role: 'admin',
      scenario: 'Admin sends empty body {} without confirmText (verifying empty-body bypass is closed)',
      expected: 'HTTP 400 Bad Request with exact confirmation phrase required',
      actual: `HTTP ${rEmpty.status} - ${rEmpty.data?.error || ''}`,
      evidence: rEmpty.data,
      status: (rEmpty.status === 400 && String(rEmpty.data?.error).includes('RESET ALL')) ? 'PASSED' : 'FAILED'
    });

    // Test 1.4: Wrong phrase prevention -> 400
    const rWrongPhrase = await apiRequest('POST', '/api/admin/reset', { confirmText: 'CONFIRM RESET' }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'D1-SEC-04',
      title: 'Wrong Phrase (CONFIRM RESET) Rejection',
      endpoint: 'POST /api/admin/reset',
      role: 'admin',
      scenario: 'Admin sends legacy/incorrect phrase "CONFIRM RESET"',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${rWrongPhrase.status} - ${rWrongPhrase.data?.error || ''}`,
      evidence: rWrongPhrase.data,
      status: (rWrongPhrase.status === 400 && String(rWrongPhrase.data?.error).includes('RESET ALL')) ? 'PASSED' : 'FAILED'
    });

    // Test 1.5: Valid phrase 'RESET ALL' with Admin -> 200
    const rValid = await apiRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'D1-SEC-05',
      title: 'Authorized Master Reset with Exact Phrase RESET ALL',
      endpoint: 'POST /api/admin/reset',
      role: 'admin',
      scenario: 'Admin provides exact confirmation phrase "RESET ALL"',
      expected: 'HTTP 200 OK with success: true',
      actual: `HTTP ${rValid.status} - success=${rValid.data?.success}`,
      evidence: { success: rValid.data?.success, teamsCount: rValid.data?.state?.teams?.length },
      status: (rValid.status === 200 && rValid.data?.success === true) ? 'PASSED' : 'FAILED'
    });

  } finally {
    // Teardown test server
    console.log('\n--- TEARDOWN: TERMINATING TEST SERVER ---');
    serverProcess.kill();
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Cleaned up disposable fixture: ${path.basename(DISPOSABLE_STATE)}`);
      }
    } catch (e) {
      console.warn('Warning: Could not remove disposable fixture:', e.message);
    }
  }

  // STEP 6: POST-FLIGHT INTEGRITY
  console.log('\n--- STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE MODIFIED DURING TEST!');
  console.log('✓ Authoritative state hash confirmed strictly unmodified.\n');

  // SUMMARY & REPORT
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;

  console.log('======================================================================');
  console.log(`📊 MILESTONE M0 TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('======================================================================');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    results: testResults
  }, null, 2), 'utf8');
  console.log(`✓ Results saved to ${path.basename(RESULTS_FILE)}\n`);

  if (failed > 0) {
    console.error(`❌ ${failed} assertions failed in Milestone M0 suite.`);
    process.exit(1);
  } else {
    console.log('🎉 100% OF MILESTONE M0 TESTS PASSED!');
  }
}

runMilestoneM0DefectSuite().catch(err => {
  console.error('\n❌ Unhandled error during Milestone M0 suite execution:', err);
  process.exit(1);
});
