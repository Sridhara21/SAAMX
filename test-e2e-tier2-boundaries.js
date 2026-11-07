/**
 * SAAMX '26 — E2E Test Suite: Tier 2 Boundary & Corner Cases
 * File: SAAMX/test-e2e-tier2-boundaries.js
 * 
 * Verifies boundary conditions, limits, zero-decimal precision (JPY/KRW),
 * negative values, conflict guards (409), and security error envelopes.
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

const TIER = 'Tier 2';

export async function runTier2(baseUrl = DEFAULT_BASE_URL, recorder = null) {
  const rec = recorder || new TestRecorder('Tier 2: Boundary & Corner Cases');
  console.log(`\n======================================================================`);
  console.log(`🚀 RUNNING TIER 2: BOUNDARY & CORNER CASES (ADVERSARIAL STRESS)`);
  console.log(`======================================================================\n`);

  // ============================================================================
  // DOMAIN 1: TRADING BOUNDARIES & INPUT INTEGRITY
  // ============================================================================
  const DOM_TRAD = 'Trading Boundaries';

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_01', 'Order with zero quantity rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 0,
      orderType: 'MARKET',
      physicalTicketNumber: `T2-Z-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_02', 'Order with negative quantity rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: -10,
      orderType: 'MARKET',
      physicalTicketNumber: `T2-NEG-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_03', 'Order with fractional quantity (10.5) rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10.5,
      orderType: 'MARKET',
      physicalTicketNumber: `T2-FRAC-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_04', 'Order violating lot size multiple rejected with HTTP 400', async () => {
    // Find security with lot size > 1
    const stRes = await httpRequest('GET', '/api/state', null, {}, baseUrl);
    const lotSec = stRes.body.securities.find(s => s.status === 'Active' && s.lotSize && s.lotSize > 1) || { ticker: 'OAI', lotSize: 10 };
    const invalidQty = (lotSec.lotSize || 10) + 1; // non-multiple

    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: lotSec.ticker,
      action: 'BUY',
      quantity: invalidQty,
      orderType: 'MARKET',
      physicalTicketNumber: `T2-LOT-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_05', 'Duplicate physical ticket number rejected with anti-replay error', async () => {
    const dupTicket = `T2-DUP-${Date.now()}`;
    const res1 = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: dupTicket
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res1.status, 200);

    // Replay with exact same ticket number
    const res2 = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: dupTicket
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res2.status, 400);
    assert(res2.body.error?.toLowerCase().includes('duplicate') || res2.body.error?.toLowerCase().includes('already'));
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_06', 'Order for non-existent security ticker returns HTTP 404', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'NONEXISTENT_TICKER_999XYZ',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      physicalTicketNumber: `T2-404-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 404);
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_07', 'BUY order exceeding team unreserved cash rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 999999999, // Unattainable quantity
      orderType: 'MARKET',
      physicalTicketNumber: `T2-FND-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
    assert(res.body.error?.toLowerCase().includes('insufficient'));
  });

  await rec.record(TIER, DOM_TRAD, 'T2_BND_TRAD_08', 'SELL order exceeding deliverable holdings rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T05',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: 9999999, // Way exceeding deliverable holdings
      orderType: 'MARKET',
      physicalTicketNumber: `T2-SHR-${Date.now()}`
    }, getAuthHeaders('team', 'T05'), baseUrl);
    assert.strictEqual(res.status, 400);
    assert(res.body.error?.toLowerCase().includes('insufficient') || res.body.error?.toLowerCase().includes('holding'));
  });

  // ============================================================================
  // DOMAIN 2: BANKING & SETTLEMENT BOUNDARIES
  // ============================================================================
  const DOM_BANK = 'Banking Boundaries';

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_01', 'Settlement without voucherReference or settlementId rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/bank/settle', {
      notes: 'No voucher specified'
    }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_02', 'Settlement of non-existent voucher returns HTTP 404', async () => {
    const res = await httpRequest('POST', '/api/bank/settle', {
      voucherReference: 'BNK-NONEXISTENT-999999'
    }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(res.status, 404);
  });

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_03', 'Participant team role attempting bank settlement rejected with HTTP 403 Forbidden', async () => {
    const res = await httpRequest('POST', '/api/bank/settle', {
      voucherReference: 'BNK-PAY-T01-001'
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 403);
  });

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_04', 'Duplicate settlement replay on already SETTLED voucher rejected with HTTP 409 Conflict', async () => {
    // 1. Submit fresh order
    const tkt = `T2-409-${Date.now().toString().slice(-6)}`;
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      physicalTicketNumber: tkt
    }, getAuthHeaders('team', 'T01'), baseUrl);
    const ordId = subRes.body.order?.id || subRes.body.orderId;

    // 2. Validate & Accept
    await httpRequest('POST', '/api/order/action', { orderId: ordId, action: 'VALIDATE' }, getAuthHeaders('operator_x'), baseUrl);
    const appRes = await httpRequest('POST', '/api/order/action', { orderId: ordId, action: 'ACCEPT' }, getAuthHeaders('operator_x'), baseUrl);
    const vRef = appRes.body.voucherReference || appRes.body.order?.voucherReference;
    assert(vRef, 'Voucher reference obtained');

    // 3. Settle first time -> 200
    const set1 = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(set1.status, 200);

    // 4. Settle second time -> 409 Conflict
    const set2 = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(set2.status, 409);
    assert(set2.body.error?.toLowerCase().includes('already been settled'));
  });

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_05', 'Bank rejection without mandatory reason rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/bank/reject', {
      voucherReference: 'BNK-PAY-SAMPLE',
      reason: '' // Empty reason
    }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_BANK, 'T2_BND_BANK_06', 'Bank hold action without mandatory reason rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/bank/hold', {
      voucherReference: 'BNK-PAY-SAMPLE',
      reason: '' // Missing reason
    }, getAuthHeaders('bank_teller'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  // ============================================================================
  // DOMAIN 3: FX BOUNDARIES & ZERO-DECIMAL CURRENCIES (JPY, KRW)
  // ============================================================================
  const DOM_FX = 'FX Boundaries & Decimals';

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_01', 'FX request with zero conversion amount rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 0
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_02', 'FX request with negative amount rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: -5000
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_03', 'FX request exchanging currency to itself rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'INR',
      fromAmount: 10000
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
    assert(res.body.error?.toLowerCase().includes('itself'));
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_04', 'FX request with unsupported currency code rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'XYZ',
      fromAmount: 10000
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_05', 'Legacy discontinued currencies (CAD, CHF) rejected with explicit isolation message', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'CAD',
      fromAmount: 10000
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
    assert(res.body.error?.toLowerCase().includes('legacy') || res.body.error?.toLowerCase().includes('cad'));
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_06', 'JPY zero-decimal currency integer precision strictly enforced (0 decimals)', async () => {
    const res = await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'JPY',
      amount: 10000
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(res.status, 200);
    const credited = res.body.credited || res.body.toAmount;
    assert.strictEqual(credited, Math.floor(credited), `JPY credited amount must be strictly an integer without decimals: ${credited}`);
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_07', 'KRW zero-decimal currency integer precision strictly enforced (0 decimals)', async () => {
    const res = await httpRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'KRW',
      amount: 10000
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(res.status, 200);
    const credited = res.body.credited || res.body.toAmount;
    assert.strictEqual(credited, Math.floor(credited), `KRW credited amount must be strictly an integer without decimals: ${credited}`);
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_08', 'FX queue action on already terminal request rejected with HTTP 400', async () => {
    // 1. Submit FX request
    const reqRes = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 10000
    }, getAuthHeaders('team', 'T02'), baseUrl);
    assert.strictEqual(reqRes.status, 200);
    const fxId = reqRes.body.fxRequest?.id;

    // 2. Reject request
    const rejRes = await httpRequest('POST', '/api/fx/queue-action', {
      requestId: fxId,
      actionType: 'REJECT',
      rejectionReason: 'Test rejection'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(rejRes.status, 200);

    // 3. Attempt action on already terminal request -> 400
    const secondAction = await httpRequest('POST', '/api/fx/queue-action', {
      requestId: fxId,
      actionType: 'PROCESS'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(secondAction.status, 400);
    assert(secondAction.body.error?.toLowerCase().includes('terminal'));
  });

  await rec.record(TIER, DOM_FX, 'T2_BND_FX_09', 'FX request exceeding team unreserved funds rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 99999999999 // Astronomical amount
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 400);
    assert(res.body.error?.toLowerCase().includes('insufficient'));
  });

  // ============================================================================
  // DOMAIN 4: NEWS & SURVEILLANCE BOUNDARIES
  // ============================================================================
  const DOM_SURV = 'Surveillance & News Boundaries';

  await rec.record(TIER, DOM_SURV, 'T2_BND_NEWS_01', 'News submission missing mandatory headline rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/news', {
      headline: '',
      sentiment: 'Positive',
      impactPercent: 5
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_SURV, 'T2_BND_NEWS_02', 'News submission missing sentiment and impact rejected with HTTP 400', async () => {
    const res = await httpRequest('POST', '/api/news', {
      headline: 'News Without Sentiment Or Impact'
    }, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(res.status, 400);
  });

  await rec.record(TIER, DOM_SURV, 'T2_BND_NEWS_03', 'SEBI trading halt endpoint halts trading for a security', async () => {
    const res = await httpRequest('POST', '/api/sebi/halt', {
      ticker: 'RELIANCE',
      reason: 'Extreme volatility surveillance halt',
      actor: 'SEBI Chief Inspector'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await rec.record(TIER, DOM_SURV, 'T2_BND_NEWS_04', 'Order validation for halted security is rejected with circuit halt notice', async () => {
    const subRes = await httpRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      ticketNumber: `T2-HALT-${Date.now()}`
    }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(subRes.status, 200);
    const ordId = subRes.body.order?.id || subRes.body.orderId;

    const valRes = await httpRequest('POST', '/api/order/action', {
      orderId: ordId,
      action: 'VALIDATE',
      operator: 'Desk 1 Operator'
    }, getAuthHeaders('operator_x'), baseUrl);

    assert.strictEqual(valRes.status, 400);
    assert(valRes.body.error?.toLowerCase().includes('halted') || valRes.body.error?.toLowerCase().includes('suspended'));
  });

  await rec.record(TIER, DOM_SURV, 'T2_BND_NEWS_05', 'SEBI resume trading endpoint restores market trading status', async () => {
    const res = await httpRequest('POST', '/api/sebi/resume', {
      ticker: 'RELIANCE',
      reason: 'Volatility stabilized, resuming trading',
      actor: 'SEBI Chief Inspector'
    }, getAuthHeaders('sebi'), baseUrl);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // ============================================================================
  // DOMAIN 5: RBAC & SECURITY ERROR ENVELOPES
  // ============================================================================
  const DOM_SEC = 'RBAC & Security';

  await rec.record(TIER, DOM_SEC, 'T2_BND_SEC_01', 'Unauthenticated request to protected admin route returns HTTP 401', async () => {
    const res = await httpRequest('POST', '/api/admin/reset', { confirmPhrase: 'RESET MARKET' }, {}, baseUrl);
    assert.strictEqual(res.status, 401);
  });

  await rec.record(TIER, DOM_SEC, 'T2_BND_SEC_02', 'Unauthenticated query to private queue (/api/fx/queue) returns HTTP 401', async () => {
    const res = await httpRequest('GET', '/api/fx/queue', null, {}, baseUrl);
    assert.strictEqual(res.status, 401);
  });

  await rec.record(TIER, DOM_SEC, 'T2_BND_SEC_03', 'Participant team attempting administrative reset returns HTTP 403 Forbidden', async () => {
    const res = await httpRequest('POST', '/api/admin/reset', { confirmPhrase: 'RESET MARKET' }, getAuthHeaders('team', 'T01'), baseUrl);
    assert.strictEqual(res.status, 403);
  });

  await rec.record(TIER, DOM_SEC, 'T2_BND_SEC_04', 'Non-existent API route returns HTTP 404 cleanly without crashing', async () => {
    const res = await httpRequest('GET', '/api/non_existent_route_boundary_404', null, getAuthHeaders('admin'), baseUrl);
    assert.strictEqual(res.status, 404);
  });

  return rec;
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    let harness = null;
    try {
      harness = await startTestServer(DEFAULT_TEST_PORT);
      const rec = new TestRecorder('Tier 2: Boundary & Corner Cases (Standalone)');
      await runTier2(harness.baseUrl, rec);
      const summary = rec.printSummary();
      await harness.cleanup();
      process.exit(summary.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error('Fatal Tier 2 execution error:', err);
      if (harness) await harness.cleanup();
      process.exit(1);
    }
  })();
}
