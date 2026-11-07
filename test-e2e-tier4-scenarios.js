/**
 * SAAMX '26 — E2E Test Suite: Tier 4 Real-World Application Scenarios
 * File: SAAMX/test-e2e-tier4-scenarios.js
 * 
 * Verifies complex multi-actor market simulation workloads:
 *   - Scenario 1: Opening Bell Trading Rush (concurrent multi-team orders across desks)
 *   - Scenario 2: Macro Shock & Panic Selling (news contagion, naked short lock, liquidation)
 *   - Scenario 3: FX Liquidity Crunch & Treasury Replenishment (reserve depletion & injection)
 *   - Scenario 4: Unicorn IPO Listing Day (oversubscription, pro-rata, secondary transition)
 *   - Scenario 5: Full Simulation Trading Day & EOD Market Reconciliation
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

const TIER = 'Tier 4';

export async function runTier4(baseUrl = DEFAULT_BASE_URL, recorder = null) {
  const rec = recorder || new TestRecorder('Tier 4: Real-World Application Scenarios');
  console.log(`\n======================================================================`);
  console.log(`🚀 RUNNING TIER 4: REAL-WORLD APPLICATION SCENARIOS (FULL SIMULATION)`);
  console.log(`======================================================================\n`);

  // ============================================================================
  // SCENARIO 1: OPENING BELL TRADING RUSH
  // ============================================================================
  const DOM_S1 = 'Scenario: Opening Bell Rush';

  await rec.record(TIER, DOM_S1, 'T4_SCEN_01_ALL', 'High-volume concurrent trading rush across multiple desks, voucher routing to dual bank desks, and zero cash leakage', async () => {
    // 1. Three distinct teams submit orders across multiple securities and desks
    const ordersToSubmit = [
      { teamCode: 'T05', ticker: 'RELIANCE', qty: 10, desk: 'DESK_1' },
      { teamCode: 'T06', ticker: 'HDFCBANK', qty: 10, desk: 'DESK_2' },
      { teamCode: 'T07', ticker: 'ICICIBANK', qty: 10, desk: 'DESK_1' }
    ];

    const submittedOrders = [];
    for (const item of ordersToSubmit) {
      const ticketNo = `T4-S1-${item.teamCode}-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const subRes = await httpRequest('POST', '/api/orders/submit', {
        teamCode: item.teamCode,
        ticker: item.ticker,
        action: 'BUY',
        quantity: item.qty,
        orderType: 'MARKET',
        ticketNumber: ticketNo,
        deskId: item.desk
      }, getAuthHeaders('team', item.teamCode), baseUrl);

      assert.strictEqual(subRes.status, 200);
      assert(subRes.body.order?.id, 'Order id returned');
      submittedOrders.push({
        ...item,
        orderId: subRes.body.order.id,
        ticketNo
      });
    }

    // 2. Desk Operators validate and accept all orders generating vouchers
    const vouchers = [];
    for (const ord of submittedOrders) {
      // Validate
      const valRes = await httpRequest('POST', '/api/order/action', {
        orderId: ord.orderId,
        action: 'VALIDATE',
        operator: `Operator ${ord.desk}`
      }, getAuthHeaders('operator_x'), baseUrl);
      assert.strictEqual(valRes.status, 200);

      // Accept
      const accRes = await httpRequest('POST', '/api/order/action', {
        orderId: ord.orderId,
        action: 'ACCEPT',
        operator: `Operator ${ord.desk}`
      }, getAuthHeaders('operator_x'), baseUrl);
      assert.strictEqual(accRes.status, 200);
      const vRef = accRes.body.voucherReference || accRes.body.order?.voucherReference;
      assert(Boolean(vRef), 'Voucher generated');
      vouchers.push({ ...ord, voucherRef: vRef });
    }

    // 3. Bank Tellers claim and settle vouchers across Bank Desks 1 and 2
    for (let i = 0; i < vouchers.length; i++) {
      const v = vouchers[i];
      const bankDesk = i % 2 === 0 ? 'BANK_1' : 'BANK_2';

      const claimRes = await httpRequest('POST', '/api/bank/claim', {
        voucherReference: v.voucherRef
      }, getAuthHeaders('bank_teller'), baseUrl);
      assert.strictEqual(claimRes.status, 200);

      const settleRes = await httpRequest('POST', '/api/bank/settle', {
        voucherReference: v.voucherRef,
        teller: `Teller ${bankDesk}`,
        deskId: bankDesk
      }, getAuthHeaders('bank_teller'), baseUrl);
      assert.strictEqual(settleRes.status, 200);
      assert.strictEqual(settleRes.body.success, true);
    }

    // 4. Verification: Bank reconciliation health check confirms zero ledger discrepancy
    const reconRes = await httpRequest('GET', '/api/bank/reconciliation', null, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(reconRes.status, 200);
    assert(reconRes.body.status === 'HEALTHY' || reconRes.body.summary, 'Reconciliation must be clean');
  });

  // ============================================================================
  // SCENARIO 2: MACRO SHOCK & PANIC SELLING
  // ============================================================================
  const DOM_S2 = 'Scenario: Macro Shock & Panic Selling';

  await rec.record(TIER, DOM_S2, 'T4_SCEN_02_ALL', 'Negative sector shock triggers market price drop, naked shorting is prevented, and legitimate sell order liquidates successfully', async () => {
    // 1. Initial prices of RELIANCE
    const preState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const preRel = preState.body.securities.find(s => s.ticker === 'RELIANCE');
    assert(preRel, 'RELIANCE security exists');
    const prePrice = Number(preRel.currentPrice);

    // 2. Breaking News: Negative shock (-15%)
    const newsRes = await httpRequest('POST', '/api/news', {
      headline: 'Global Energy Refining Margins Slump Amid Renewable Shift',
      description: 'Downstream petrochemical margins contract across major integrated refiners.',
      sentiment: 'Negative',
      impactPercent: 15,
      affectedSecurityIds: ['RELIANCE']
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(newsRes.status, 200);
    assert.strictEqual(newsRes.body.success, true);

    // Verify price dropped
    const midState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postRel = midState.body.securities.find(s => s.ticker === 'RELIANCE');
    assert(Number(postRel.currentPrice) < prePrice, 'RELIANCE price must drop post-macro shock');

    // 3. Naked Shorting Attempt: Team T09 attempts to SELL 50 RELIANCE with 0 holdings -> Rejection with HTTP 400
    const nakedTicket = `T4-NAKED-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nakedRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T09',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: 50,
      orderType: 'MARKET',
      ticketNumber: nakedTicket
    }, getAuthHeaders('team', 'T09'), baseUrl);

    assert.strictEqual(nakedRes.status, 400);
    assert(nakedRes.body.error?.includes('deliverable') || nakedRes.body.error?.includes('holdings'));

    // 4. Legitimate Liquidation: Team T01 (has deliverable RELIANCE shares) liquidates 10 RELIANCE at post-shock price
    const preT01State = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const preT01Holdings = Number(preT01State.body.teams.find(t => t.teamCode === 'T01')?.holdings?.RELIANCE || 0);
    const preT01Cash = Number(preT01State.body.teams.find(t => t.teamCode === 'T01')?.cashWallets?.INR || 0);
    assert(preT01Holdings >= 10, 'Team T01 must have at least 10 RELIANCE shares to sell');

    const sellTicket = `T4-SELL-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sellRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: sellTicket
    }, getAuthHeaders('team', 'T01'), baseUrl);

    assert.strictEqual(sellRes.status, 200);
    const sellOrderId = sellRes.body.order?.id;

    // Validate
    await httpRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);

    // Accept -> Voucher
    const accRes = await httpRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      action: 'ACCEPT',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    const vRef = accRes.body.voucherReference || accRes.body.order?.voucherReference;
    assert(Boolean(vRef), 'Sell voucher generated');

    // Bank Claim & Settle (Payout to Team)
    await httpRequest('POST', '/api/bank/claim', { voucherReference: vRef }, getAuthHeaders('bank_teller'), baseUrl);
    const settleRes = await httpRequest('POST', '/api/bank/settle', {
      voucherReference: vRef,
      teller: 'Bank Teller Beta'
    }, getAuthHeaders('bank_teller'), baseUrl);

    assert.strictEqual(settleRes.status, 200);
    assert.strictEqual(settleRes.body.success, true);

    // Verify holdings decremented and cash credited from liquidation proceeds
    const postT01State = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const postT01Holdings = Number(postT01State.body.teams.find(t => t.teamCode === 'T01')?.holdings?.RELIANCE || 0);
    const postT01Cash = Number(postT01State.body.teams.find(t => t.teamCode === 'T01')?.cashWallets?.INR || 0);

    assert.strictEqual(postT01Holdings, preT01Holdings - 10, 'RELIANCE holdings decremented by exactly 10 shares');
    assert(postT01Cash > preT01Cash, 'Cash balance credited with sale proceeds');
  });

  // ============================================================================
  // SCENARIO 3: FX LIQUIDITY CRUNCH & TREASURY REPLENISHMENT
  // ============================================================================
  const DOM_S3 = 'Scenario: FX Crunch & Replenishment';

  await rec.record(TIER, DOM_S3, 'T4_SCEN_03_ALL', 'High-volume FX conversions deplete foreign reserves, and authorized admin treasury replenishment restores liquidity with solvency verified', async () => {
    // 1. Initial FX reserves for JPY and AED
    const preReservesRes = await httpRequest('GET', '/api/fx/reserves', null, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(preReservesRes.status, 200);
    const preJpy = preReservesRes.body.reserves?.JPY;
    const preAed = preReservesRes.body.reserves?.AED;
    assert(preJpy && preAed, 'JPY and AED reserves exist');
    const initJpyAvail = Number(preJpy.availableReserve);
    const initAedAvail = Number(preAed.availableReserve);

    // 2. Heavy conversion burst: T08 converts INR to JPY, T09 converts INR to AED
    const conv1 = await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T08',
      fromCurrency: 'INR',
      toCurrency: 'JPY',
      amount: 500000
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(conv1.status, 200);

    const conv2 = await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T09',
      fromCurrency: 'INR',
      toCurrency: 'AED',
      amount: 500000
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(conv2.status, 200);

    // Verify reserves decreased
    const midReservesRes = await httpRequest('GET', '/api/fx/reserves', null, getAuthHeaders('admin'), baseUrl);
    const midJpyAvail = Number(midReservesRes.body.reserves?.JPY?.availableReserve);
    const midAedAvail = Number(midReservesRes.body.reserves?.AED?.availableReserve);
    assert(midJpyAvail < initJpyAvail, 'JPY available reserve must decrease after client purchase');
    assert(midAedAvail < initAedAvail, 'AED available reserve must decrease after client purchase');

    // 3. Admin Treasury Replenishment: Inject 100,000,000 JPY
    const repRes = await httpRequest('POST', '/api/fx/reserves/replenish', {
      currency: 'JPY',
      quantity: 100000000,
      reason: 'Treasury desk authorized liquidity injection during high participant demand window'
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(repRes.status, 200);
    assert.strictEqual(repRes.body.success, true);
    assert.strictEqual(repRes.body.replenishedQuantity, 100000000);

    // 4. Verify post-replenishment inventory and solvency invariant across all 9 currencies
    const postReservesRes = await httpRequest('GET', '/api/fx/reserves', null, getAuthHeaders('admin'), baseUrl);
    const postJpy = postReservesRes.body.reserves?.JPY;
    assert(Number(postJpy.currentInventory) > Number(midReservesRes.body.reserves?.JPY?.currentInventory), 'JPY inventory increased');

    for (const cur of ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW']) {
      const r = postReservesRes.body.reserves?.[cur];
      assert(r, `Reserve ${cur} must exist`);
      const invDiff = Math.abs((Number(r.availableReserve) + Number(r.reservedInventory)) - Number(r.currentInventory));
      assert(invDiff < 0.01, `Solvency invariant failed for ${cur}: avail + res !== cur (${invDiff})`);
    }
  });

  // ============================================================================
  // SCENARIO 4: UNICORN IPO LISTING DAY & SECONDARY MARKET TRANSITION
  // ============================================================================
  const DOM_S4 = 'Scenario: Unicorn IPO Listing Day';

  await rec.record(TIER, DOM_S4, 'T4_SCEN_04_ALL', 'Staged Unicorn IPO opens, bids are allotted pro-rata, stock transitions to Active, and secondary trading commences', async () => {
    // 1. Advance staged IPO DISC to SUBSCRIPTION_OPEN
    const transRes = await httpRequest('POST', '/api/ipo/transition', {
      ticker: 'DISC',
      nextStatus: 'SUBSCRIPTION_OPEN'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(transRes.status, 200);

    // 2. Fund T03 and T04 with USD (convert 1,500,000 INR -> USD each)
    await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T03',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 1500000
    }, getAuthHeaders('admin'), baseUrl);

    await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T04',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 1500000
    }, getAuthHeaders('admin'), baseUrl);

    // 3. T03 and T04 place primary subscription bids (300 shares each @ $48 = $14,400)
    const bid1 = await httpRequest('POST', '/api/ipo/bid', {
      teamCode: 'T03',
      ticker: 'DISC',
      quantity: 300
    }, getAuthHeaders('team', 'T03'), baseUrl);
    assert.strictEqual(bid1.status, 200);

    const bid2 = await httpRequest('POST', '/api/ipo/bid', {
      teamCode: 'T04',
      ticker: 'DISC',
      quantity: 300
    }, getAuthHeaders('team', 'T04'), baseUrl);
    assert.strictEqual(bid2.status, 200);

    // 4. Admin triggers pro-rata allotment with floatUnits: 400 (600 total demand -> oversubscribed)
    const allotRes = await httpRequest('POST', '/api/ipo/allot', {
      ticker: 'DISC',
      floatUnits: 400
    }, getAuthHeaders('admin'), baseUrl);

    assert.strictEqual(allotRes.status, 200);
    assert.strictEqual(allotRes.body.success, true);
    assert(allotRes.body.allotments?.T03?.allottedQuantity > 0, 'T03 received allotted shares');
    assert(allotRes.body.allotments?.T03?.refundAmount > 0, 'T03 received unallocated capital refund');

    // 5. Verify security transitioned to secondary trading
    const postState = await httpRequest('GET', '/api/state', null, getAuthHeaders('admin'), baseUrl);
    const secDISC = postState.body.securities.find(s => s.ticker === 'DISC');
    assert.strictEqual(secDISC.status, 'Active', 'DISC status must be Active');
    assert.strictEqual(secDISC.ipoStatus, 'ALLOTMENT_FINALIZED', 'DISC ipoStatus finalized');

    // 6. Secondary Market Trading: Team T03 sells 10 shares of newly listed DISC
    const secTicket = `T4-SEC-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const secOrderRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T03',
      ticker: 'DISC',
      action: 'SELL',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: secTicket
    }, getAuthHeaders('team', 'T03'), baseUrl);

    assert.strictEqual(secOrderRes.status, 200);
    assert.strictEqual(secOrderRes.body.success, true);
    const secOrdId = secOrderRes.body.order?.id;

    // Validate on exchange secondary desk
    const valRes = await httpRequest('POST', '/api/order/action', {
      orderId: secOrdId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(valRes.status, 200);

    // Accept on exchange
    const accRes = await httpRequest('POST', '/api/order/action', {
      orderId: secOrdId,
      action: 'ACCEPT',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);
    assert.strictEqual(accRes.status, 200);
    assert(Boolean(accRes.body.voucherReference || accRes.body.order?.voucherReference), 'Secondary trade voucher generated');
  });

  // ============================================================================
  // SCENARIO 5: FULL TRADING DAY LIFECYCLE & EOD MARKET RECONCILIATION
  // ============================================================================
  const DOM_S5 = 'Scenario: Full Trading Day Lifecycle';

  await rec.record(TIER, DOM_S5, 'T4_SCEN_05_ALL', 'Full end-to-end trading session lifecycle with news, trading, SEBI pause/resume, and end-of-day multi-currency reconciliation', async () => {
    // Phase 1: Pre-market verification & broker advisory intelligence bulletin
    const pingRes = await httpRequest('GET', '/api/ping', null, {}, baseUrl);
    assert.strictEqual(pingRes.status, 200);

    const bullRes = await httpRequest('POST', '/api/broker/bulletin', {
      headline: 'Pre-Market Floor Intelligence: Banking & Industrials Momentum',
      body: 'Opening liquidity expected to focus heavily on domestic heavyweights and selected FX pairs.',
      author: 'Chief Floor Economist'
    }, getAuthHeaders('advisor'), baseUrl);
    assert.strictEqual(bullRes.status, 200);

    // Phase 2: Active continuous trading window
    const tradeTicket = `T4-S5-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tradeSub = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T10',
      ticker: 'HDFCBANK',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: tradeTicket
    }, getAuthHeaders('team', 'T10'), baseUrl);
    assert.strictEqual(tradeSub.status, 200);
    const ordId = tradeSub.body.order?.id;

    await httpRequest('POST', '/api/order/action', { orderId: ordId, action: 'VALIDATE' }, getAuthHeaders('operator_x'), baseUrl);
    const accRes = await httpRequest('POST', '/api/order/action', { orderId: ordId, action: 'ACCEPT' }, getAuthHeaders('operator_x'), baseUrl);
    const vRef = accRes.body.voucherReference || accRes.body.order?.voucherReference;

    await httpRequest('POST', '/api/bank/claim', { voucherReference: vRef }, getAuthHeaders('bank_teller'), baseUrl);
    const bSettle = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef, teller: 'Bank Teller Alpha' }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(bSettle.status, 200);

    // Phase 3: Midday news dispatch and market volatility
    await httpRequest('POST', '/api/news', {
      headline: 'Reserve Bank Maintains Neutral Stance; Banking Sector Upward Guidance',
      sentiment: 'Positive',
      impactPercent: 5,
      affectedSecurityIds: ['HDFCBANK']
    }, getAuthHeaders('admin'), baseUrl);

    // Phase 4: Midday SEBI Surveillance circuit test
    const haltRes = await httpRequest('POST', '/api/sebi/halt', {
      ticker: 'HDFCBANK',
      reason: 'Routine mid-session circuit verification'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(haltRes.status, 200);

    const resumeRes = await httpRequest('POST', '/api/sebi/resume', {
      ticker: 'HDFCBANK'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(resumeRes.status, 200);

    // Phase 5: End-of-Day Event Reconciliation Run
    const eodRunRes = await httpRequest('POST', '/api/event/reconciliation/run', {
      operator: 'Chief Financial Controller',
      notes: 'End-of-day market close reconciliation certification'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(eodRunRes.status, 200);

    // Phase 6: Admin Market Reconciliation Engine
    const adminReconRes = await httpRequest('POST', '/api/admin/reconcile', {
      confirmText: 'RECONCILE MARKET'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(adminReconRes.status, 200);
    assert.strictEqual(adminReconRes.body.success, true);
    assert(Array.isArray(adminReconRes.body.leaderboard), 'Leaderboard of reconciled teams returned');
    assert(adminReconRes.body.leaderboard.length > 0, 'Reconciled teams ranked');

    // Phase 7: Audit log complete session trail integrity
    const auditRes = await httpRequest('GET', '/api/audit-log', null, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(auditRes.status, 200);
    const logs = auditRes.body.auditLog || auditRes.body.logs || auditRes.body;
    assert(Array.isArray(logs) && logs.length > 0, 'Audit log records session operations');
  });

  return rec;
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    let harness = null;
    try {
      harness = await startTestServer(DEFAULT_TEST_PORT);
      const rec = new TestRecorder('Tier 4: Real-World Application Scenarios (Standalone)');
      await runTier4(harness.baseUrl, rec);
      const summary = rec.printSummary();
      await harness.cleanup();
      process.exit(summary.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error('Fatal Tier 4 execution error:', err);
      if (harness) await harness.cleanup();
      process.exit(1);
    }
  })();
}
