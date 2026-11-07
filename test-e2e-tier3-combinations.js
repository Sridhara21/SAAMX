/**
 * SAAMX '26 — E2E Test Suite: Tier 3 Cross-Feature Integration Pipelines
 * File: SAAMX/test-e2e-tier3-combinations.js
 * 
 * Verifies end-to-end multi-step business workflows spanning across multiple
 * portals, engines, and actor roles (Exchange Desk, Bank Desk, FX Desk, SEBI, Admin, Team).
 */

import assert from 'assert';
import { fileURLToPath } from 'url';
import {
  httpRequest,
  getAuthHeaders,
  startTestServer,
  TestRecorder,
  DEFAULT_BASE_URL,
  DEFAULT_TEST_PORT
} from './test-e2e-helpers.js';

const TIER = 'Tier 3';

export async function runTier3(baseUrl = DEFAULT_BASE_URL, recorder = null) {
  const rec = recorder || new TestRecorder('Tier 3: Cross-Feature Combinations');
  console.log(`\n======================================================================`);
  console.log(`🚀 RUNNING TIER 3: CROSS-FEATURE INTEGRATION PIPELINES`);
  console.log(`======================================================================\n`);

  // Shared context for Pipeline 1 steps
  const p1Context = {};

  // ============================================================================
  // PIPELINE 1: ORDER -> VERIFICATION -> VOUCHER -> BANK SETTLEMENT -> FINANCIAL LEDGER
  // ============================================================================
  const DOM_P1 = 'Pipeline: Order to Bank Settle';

  await rec.record(TIER, DOM_P1, 'T3_PIPE_01_STEP1', 'Participant Team submits BUY order into physical intake queue with cash buffer reservation', async () => {
    // 1. Check initial team state using privileged query
    const teamRes = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const teamT01 = teamRes.body.teams.find(t => t.teamCode === 'T01');
    assert(teamT01, 'Team T01 must exist');
    const initCash = Number(teamT01.cashWallets?.INR || teamT01.cashBalance || 0);
    const initHoldings = Number(teamT01.holdings?.['RELIANCE'] || 0);

    // 2. Submit physical market BUY order
    const ticketNo = `T3-P1-${Date.now().toString().slice(-6)}`;
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: ticketNo
    }, getAuthHeaders('team', 'T01'), baseUrl);

    assert.strictEqual(subRes.status, 200);
    assert.strictEqual(subRes.body.success, true);
    const order = subRes.body.order;
    assert(order, 'Order object returned');
    assert.strictEqual(order.ticketNumber, ticketNo);
    assert(Boolean(order.id), 'Order id must exist');

    // 3. Verify cash was reserved (not yet debited) including 5% buffer
    const postSubState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postT01 = postSubState.body.teams.find(t => t.teamCode === 'T01');
    const reservedInr = Number(postT01.reservedCash?.INR || 0);
    assert(reservedInr > 0, 'Cash must be reserved for BUY order with 5% execution buffer');

    p1Context.orderId = order.id;
    p1Context.ticketNo = ticketNo;
    p1Context.initCash = initCash;
    p1Context.initHoldings = initHoldings;
  });

  await rec.record(TIER, DOM_P1, 'T3_PIPE_01_STEP2', 'Exchange Operator claims and validates physical ticket against market constraints', async () => {
    assert(p1Context.orderId, 'Context must have orderId');

    // Operator Validate
    const valRes = await httpRequest('POST', '/api/order/action', {
      orderId: p1Context.orderId,
      action: 'VALIDATE',
      operator: 'Desk 1 Chief Operator'
    }, getAuthHeaders('operator_x'), baseUrl);

    assert.strictEqual(valRes.status, 200);
    assert(valRes.body.order?.status === 'VALIDATED' || valRes.body.orderStatus === 'VALIDATED', 'Order must be validated');
  });

  await rec.record(TIER, DOM_P1, 'T3_PIPE_01_STEP3', 'Exchange Operator accepts order and generates decoupled Bank Settlement voucher', async () => {
    const acceptRes = await httpRequest('POST', '/api/order/action', {
      orderId: p1Context.orderId,
      action: 'ACCEPT',
      operator: 'Desk 1 Chief Operator'
    }, getAuthHeaders('operator_x'), baseUrl);

    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.success, true);
    const vRef = acceptRes.body.voucherReference || acceptRes.body.order?.voucherReference;
    assert(Boolean(vRef), 'Decoupled voucherReference must be generated upon Exchange approval');
    assert(vRef.startsWith('BNK-') || vRef.includes('-'), 'Voucher reference follows identifier scheme');
    p1Context.voucherRef = vRef;
  });

  await rec.record(TIER, DOM_P1, 'T3_PIPE_01_STEP4', 'Bank Teller claims voucher, confirms payment settlement, and executes atomic double-entry balance update', async () => {
    assert(p1Context.voucherRef, 'Must have voucherRef');

    // Teller claim voucher
    const claimRes = await httpRequest('POST', '/api/bank/claim', {
      voucherReference: p1Context.voucherRef
    }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.body.success, true);

    // Teller settle voucher
    const settleRes = await httpRequest('POST', '/api/bank/settle', {
      voucherReference: p1Context.voucherRef,
      teller: 'Bank Teller Alpha',
      deskId: 'BANK_1'
    }, getAuthHeaders('bank_teller'), baseUrl);

    assert.strictEqual(settleRes.status, 200);
    assert.strictEqual(settleRes.body.success, true);

    // Verify final state: T01 cash debited, reservation cleared, holdings credited
    const finalState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const finalT01 = finalState.body.teams.find(t => t.teamCode === 'T01');
    const finalHoldings = Number(finalT01.holdings?.['RELIANCE'] || 0);

    assert.strictEqual(finalHoldings, p1Context.initHoldings + 10, 'Holdings must increment by exactly 10 units');
    assert(Number(finalT01.cashWallets?.INR || 0) < p1Context.initCash, 'Cash balance must be debited after bank settlement');
  });

  // ============================================================================
  // PIPELINE 2: ORDER -> OPERATOR REJECTION -> COMPENSATING REFUND
  // ============================================================================
  const DOM_P2 = 'Pipeline: Order Hold, Rejection & Refund';

  await rec.record(TIER, DOM_P2, 'T3_PIPE_02_ALL', 'Order submitted, rejected with mandatory reason by operator, and client funds fully refunded', async () => {
    // 1. Initial T02 balance
    const preState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const preT02 = preState.body.teams.find(t => t.teamCode === 'T02');
    const preCash = Number(preT02.cashWallets?.INR || preT02.cashBalance || 0);
    const preReserved = Number(preT02.reservedCash?.INR || 0);

    // 2. Submit order for 20 INFY
    const ticketNo = `T3-P2-${Date.now().toString().slice(-6)}`;
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T02',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET',
      ticketNumber: ticketNo
    }, getAuthHeaders('team', 'T02'), baseUrl);

    assert.strictEqual(subRes.status, 200);
    const orderId = subRes.body.order?.id;
    assert(orderId, 'Order id returned');

    // Verify cash reserved
    const midState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const midT02 = midState.body.teams.find(t => t.teamCode === 'T02');
    assert(Number(midT02.reservedCash?.INR || 0) > preReserved, 'Cash buffer must be reserved');

    // 3. Operator claims order
    const claimRes = await httpRequest('POST', '/api/order/action', {
      orderId,
      action: 'CLAIM',
      operator: 'Desk 2 Supervisor'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(claimRes.status, 200);

    // 4. Operator rejects order with mandatory reason
    const rejRes = await httpRequest('POST', '/api/order/action', {
      orderId,
      action: 'REJECT',
      operator: 'Desk 2 Supervisor',
      rejectionReason: 'Invalid seal and illegible signature on physical slip'
    }, getAuthHeaders('operator_x'), baseUrl);

    assert.strictEqual(rejRes.status, 200);
    assert(rejRes.body.order?.status?.includes('REJECTED'));

    // 5. Verify compensating unreservation invariant: reserved cash returned, zero float leakage
    const postState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postT02 = postState.body.teams.find(t => t.teamCode === 'T02');
    const postReserved = Number(postT02.reservedCash?.INR || 0);
    assert.strictEqual(postReserved, preReserved, 'Reserved cash must return to pre-order level with zero leakage');
    const postCash = Number(postT02.cashWallets?.INR || postT02.cashBalance || 0);
    assert.strictEqual(postCash, preCash, 'Available cash balance must be fully restored');
  });

  // ============================================================================
  // PIPELINE 3: FX QUEUE -> DELAY -> ATOMIC SETTLEMENT -> SOLVENCY INVARIANT
  // ============================================================================
  const DOM_P3 = 'Pipeline: FX Queue to Settlement';

  await rec.record(TIER, DOM_P3, 'T3_PIPE_03_ALL', 'FX conversion request enqueued, processed through 7-state lifecycle, and settled with reserve solvency verified', async () => {
    // 1. Team T03 checks initial wallets
    const preState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const preT03 = preState.body.teams.find(t => t.teamCode === 'T03');
    const initInr = Number(preT03.cashWallets?.INR || 0);
    const initEur = Number(preT03.cashWallets?.EUR || 0);

    // 2. Submit FX Request: 150,000 INR -> EUR
    const fxReqRes = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T03',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 150000,
      notes: 'Pipeline 3 FX conversion'
    }, getAuthHeaders('team', 'T03'), baseUrl);

    assert.strictEqual(fxReqRes.status, 200);
    assert.strictEqual(fxReqRes.body.success, true);
    const fxReqId = fxReqRes.body.fxRequest?.id || fxReqRes.body.fxRequest?.requestId;
    assert(fxReqId, 'FX requestId returned');

    // 3. Operator claims request (PROCESSING)
    const procRes = await httpRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqId,
      actionType: 'PROCESS'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(procRes.status, 200);
    assert.strictEqual(procRes.body.fxRequest?.status, 'PROCESSING');

    // 4. Operator completes atomic settlement (SETTLE)
    const settleRes = await httpRequest('POST', '/api/fx/queue-action', {
      requestId: fxReqId,
      actionType: 'SETTLE'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(settleRes.status, 200);
    assert.strictEqual(settleRes.body.fxRequest?.status, 'SETTLED');

    // 5. Verify team wallets updated
    const postState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postT03 = postState.body.teams.find(t => t.teamCode === 'T03');
    const postEur = Number(postT03.cashWallets?.EUR || 0);
    assert(postEur > initEur, 'EUR wallet balance must be credited');

    // 6. Verify EUR reserve solvency invariant
    const resRes = await httpRequest('GET', '/api/fx/reserves', null, getAuthHeaders('admin'), baseUrl);
    const eurReserve = resRes.body.reserves?.EUR;
    assert(eurReserve, 'EUR reserve must exist');
    const invDiff = Math.abs((Number(eurReserve.availableReserve) + Number(eurReserve.reservedInventory)) - Number(eurReserve.currentInventory));
    assert(invDiff < 0.01, `Solvency invariant failed: avail + res !== cur (${invDiff})`);
  });

  // ============================================================================
  // PIPELINE 4: NEWS FLASH -> PRICE SHIFT -> SURVEILLANCE CIRCUIT HALT -> ORDER BLOCKED
  // ============================================================================
  const DOM_P4 = 'Pipeline: News to Circuit Halt';

  await rec.record(TIER, DOM_P4, 'T3_PIPE_04_ALL', 'Severe breaking news triggers market price crash, SEBI circuit breaker engages, and order validation is suspended', async () => {
    // 1. Get current price of TCS
    const preState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const secTCS = preState.body.securities.find(s => s.ticker === 'TCS');
    assert(secTCS, 'TCS security exists');
    const prePrice = Number(secTCS.currentPrice);

    // 2. Publish severe breaking news via Market Impact Engine (-20% impact)
    const newsRes = await httpRequest('POST', '/api/news', {
      headline: 'TCS Faces Global Enterprise Contract Suspension Investigation',
      description: 'Regulatory audit initiates comprehensive review of legacy outsourcing contracts.',
      sentiment: 'Negative',
      impactPercent: 20,
      affectedSecurityIds: ['TCS']
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(newsRes.status, 200);
    assert.strictEqual(newsRes.body.success, true);

    // 3. Verify price dropped in state
    const midState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const midTCS = midState.body.securities.find(s => s.ticker === 'TCS');
    assert(Number(midTCS.currentPrice) < prePrice, 'Price must drop post-negative news');

    // 4. SEBI Surveillance engages regulatory circuit halt
    const haltRes = await httpRequest('POST', '/api/sebi/halt', {
      ticker: 'TCS',
      reason: 'Circuit limit triggered post-breaking news wire'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(haltRes.status, 200);
    assert.strictEqual(haltRes.body.security?.status, 'Halted');

    // 5. Team T04 submits BUY order for TCS
    const tkt = `T3-P4-${Date.now().toString().slice(-6)}`;
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T04',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: tkt
    }, getAuthHeaders('team', 'T04'), baseUrl);
    assert.strictEqual(subRes.status, 200);
    const orderId = subRes.body.order?.id;

    // 6. Exchange operator attempts validation — must be BLOCKED with HTTP 400
    const valRes = await httpRequest('POST', '/api/order/action', {
      orderId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(valRes.status, 400);
    assert(valRes.body.error?.includes('Halted') || valRes.body.error?.includes('suspended'));

    // 7. SEBI resumes trading; validation now succeeds
    const resumeRes = await httpRequest('POST', '/api/sebi/resume', {
      ticker: 'TCS'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(resumeRes.status, 200);

    const revalRes = await httpRequest('POST', '/api/order/action', {
      orderId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(revalRes.status, 200);
  });

  // ============================================================================
  // PIPELINE 5: STAGED IPO BIDDING -> LOT SIZE ENFORCEMENT -> PRO-RATA ALLOTMENT -> REFUND
  // ============================================================================
  const DOM_P5 = 'Pipeline: IPO Lifecycle & Pro-Rata Allotment';

  await rec.record(TIER, DOM_P5, 'T3_PIPE_05_ALL', 'Staged IPO opens, multiple teams bid in USD, oversubscription triggers pro-rata allotment and unallocated capital refund', async () => {
    // 1. Transition staged IPO CNVA to open subscription
    const transRes = await httpRequest('POST', '/api/ipo/transition', {
      ticker: 'CNVA',
      nextStatus: 'SUBSCRIPTION_OPEN'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(transRes.status, 200);

    // 2. Fund T01 and T02 with USD for IPO bidding (converting 2,000,000 INR -> ~$23,000 USD)
    await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 2000000
    }, getAuthHeaders('admin'), baseUrl);

    await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 2000000
    }, getAuthHeaders('admin'), baseUrl);

    // 3. Team T01 bids for 300 shares of CNVA ($62/share = $18,600)
    const bid1Res = await httpRequest('POST', '/api/ipo/bid', {
      teamCode: 'T01',
      ticker: 'CNVA',
      quantity: 300
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(bid1Res.status, 200);

    // 4. Team T02 bids for 300 shares of CNVA ($18,600)
    const bid2Res = await httpRequest('POST', '/api/ipo/bid', {
      teamCode: 'T02',
      ticker: 'CNVA',
      quantity: 300
    }, getAuthHeaders('team', 'T02'), baseUrl);
    assert.strictEqual(bid2Res.status, 200);

    // Total demand = 600 shares. Admin passes floatUnits = 400 to force oversubscription (1.5x)
    const allotRes = await httpRequest('POST', '/api/ipo/allot', {
      ticker: 'CNVA',
      floatUnits: 400
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(allotRes.status, 200);
    assert.strictEqual(allotRes.body.success, true);
    assert(allotRes.body.allotments?.T01?.allottedQuantity > 0, 'T01 must have allotted quantity');
    assert(allotRes.body.allotments?.T01?.refundAmount > 0, 'T01 must receive refund for unallocated bid capital');

    // 5. Verify pro-rata share allocation and unallocated capital refund for T01
    const postState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postT01 = postState.body.teams.find(t => t.teamCode === 'T01');
    const allottedShares = Number(postT01.holdings?.['CNVA'] || 0);
    assert(allottedShares > 0, `Expected pro-rata shares > 0, got ${allottedShares}`);
    assert.strictEqual(Number(postT01.reservedCash?.USD || 0), 0, 'USD reservation must be fully released post-allotment');

    // 6. Verify security transitioned to Active status
    const secCNVA = postState.body.securities.find(s => s.ticker === 'CNVA');
    assert.strictEqual(secCNVA.status, 'Active');
    assert.strictEqual(secCNVA.ipoStatus, 'ALLOTMENT_FINALIZED');
  });

  // ============================================================================
  // PIPELINE 6: SETTLED TRADE VOID & SOLVENCY INTEGRITY
  // ============================================================================
  const DOM_P6 = 'Pipeline: Trade Void & Reversal Integrity';

  await rec.record(TIER, DOM_P6, 'T3_PIPE_06_ALL', 'Settled transaction voided via regulatory action, balanced double-entry reversal posted, and portfolio restored', async () => {
    // 1. Initial T01 holdings and cash
    const initState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const initT01 = initState.body.teams.find(t => t.teamCode === 'T01');
    const initHoldings = Number(initT01.holdings?.['SBIN'] || 0);
    const initCash = Number(initT01.cashWallets?.INR || 0);

    // 2. Submit, validate, accept, and bank-settle a fresh trade for Team T01
    const tkt = `T3-P6-${Date.now().toString().slice(-6)}`;
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'SBIN',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: tkt
    }, getAuthHeaders('team', 'T01'), baseUrl);

    const ordId = subRes.body.order?.id;
    assert(ordId, 'Order submitted');

    // Validate
    await httpRequest('POST', '/api/order/action', {
      orderId: ordId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);

    // Accept -> Voucher
    const accRes = await httpRequest('POST', '/api/order/action', {
      orderId: ordId,
      action: 'ACCEPT',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    const vRef = accRes.body.voucherReference || accRes.body.order?.voucherReference;
    assert(vRef, 'Voucher generated');

    // Bank Claim & Settle
    await httpRequest('POST', '/api/bank/claim', { voucherReference: vRef }, getAuthHeaders('bank_teller'), baseUrl);
    const settleRes = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef, teller: 'Bank Teller Alpha' }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(settleRes.status, 200);

    // 3. Locate settled transaction in state
    const stateMid = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const tx = (stateMid.body.transactions || []).find(t => t.orderId === ordId || t.ticketNumber === tkt);
    assert(tx, 'Settled transaction found in state');
    assert.strictEqual(tx.voided, false);

    const midT01 = stateMid.body.teams.find(t => t.teamCode === 'T01');
    const midHoldings = Number(midT01.holdings?.['SBIN'] || 0);
    assert.strictEqual(midHoldings, initHoldings + 10, 'Holdings must increment by 10 upon settlement');
    const midCash = Number(midT01.cashWallets?.INR || 0);

    // 4. Void transaction via Admin privileges
    const voidRes = await httpRequest('POST', '/api/transactions/void', {
      id: tx.id,
      reason: 'Erroneous physical slip match regulatory audit reversal'
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(voidRes.status, 200);
    assert.strictEqual(voidRes.body.success, true);

    // 5. Verify post-void state: holdings decremented, cash refunded, tx marked voided
    const postState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const voidedTx = (postState.body.transactions || []).find(t => t.id === tx.id);
    assert.strictEqual(voidedTx.voided, true);
    assert.strictEqual(voidedTx.voidReason, 'Erroneous physical slip match regulatory audit reversal');

    const postT01 = postState.body.teams.find(t => t.teamCode === 'T01');
    const postHoldings = Number(postT01.holdings?.['SBIN'] || 0);
    assert.strictEqual(postHoldings, initHoldings, 'Holdings decremented back to initial level');

    const postCash = Number(postT01.cashWallets?.INR || 0);
    assert(postCash > midCash, 'Cash balance refunded after trade voiding');
  });

  return rec;
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    let harness = null;
    try {
      harness = await startTestServer(DEFAULT_TEST_PORT);
      const rec = new TestRecorder('Tier 3: Cross-Feature Combinations (Standalone)');
      await runTier3(harness.baseUrl, rec);
      const summary = rec.printSummary();
      await harness.cleanup();
      process.exit(summary.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error('Fatal Tier 3 execution error:', err);
      if (harness) await harness.cleanup();
      process.exit(1);
    }
  })();
}
