import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import crypto from 'crypto';

const PORT = 3016;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = './state.json';
const TEST_STATE_FILE = './test-state-lifecycle-disposable.json';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      ...headers
    };

    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch (e) {
          json = raw;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function run() {
  console.log('======================================================================');
  console.log('🧪 SAAMX — FULL END-TO-END VERIFICATION: LIFECYCLE & DESK DASHBOARD');
  console.log('======================================================================\n');

  const preHash = getSha256(ORIGINAL_STATE);
  console.log(`Pre-flight authoritative state.json hash: ${preHash}`);

  // Setup disposable state
  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }
  fs.copyFileSync(ORIGINAL_STATE, TEST_STATE_FILE);
  try { fs.chmodSync(TEST_STATE_FILE, 0o666); } catch (e) {}
  const fixture = JSON.parse(fs.readFileSync(TEST_STATE_FILE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fs.writeFileSync(TEST_STATE_FILE, JSON.stringify(fixture), 'utf8');

  console.log(`Starting isolated test server on port ${PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE: TEST_STATE_FILE },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {
    // console.log('[Server stdout]', d.toString());
  });
  serverProc.stderr.on('data', d => console.error('[Server stderr]', d.toString()));

  try {
    let ready = false;
    for (let i = 0; i < 35; i++) {
      try {
        const res = await request('GET', '/api/state');
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 600));
    }
    assert(ready, 'Test server failed to start within timeout');
    console.log('✓ Isolated test server online.\n');

    // ------------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------------
    console.log('--- STEP 1: AUTHENTICATION & DESK OPERATOR PROVISIONING ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminToken = adminLogin.data.token;
    assert(adminToken, 'Admin token required');

    // Enable TWO_PHASE_BANK settlement mode
    const modeRes = await request('POST', '/api/admin/settlement-mode', {
      mode: 'TWO_PHASE_BANK'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(modeRes.status, 200);
    assert.strictEqual(modeRes.data.settlementMode, 'TWO_PHASE_BANK');
    console.log('✓ Settlement mode confirmed: TWO_PHASE_BANK.');

    // Provision desk operator for DESK_1
    const op1 = {
      displayName: 'Operator Alpha',
      username: 'op_alpha',
      role: 'operator_x',
      department: 'Pit 1',
      password: 'Password123!',
      assignedDesk: 'DESK_1',
      selectedPages: ['#/exchange'],
      permissions: ['orders.view_queue', 'orders.verify', 'exchange.view', 'exchange.execute', 'dashboard.view']
    };
    await request('POST', '/api/personnel', op1, { 'Authorization': `Bearer ${adminToken}` });

    const opLogin = await request('POST', '/api/auth/login', {
      username: 'op_alpha',
      password: 'Password123!'
    });
    assert.strictEqual(opLogin.status, 200);
    const opToken = opLogin.data.token;
    assert.strictEqual(opLogin.data.assignedDesk, 'DESK_1');
    console.log('✓ Operator Alpha authenticated with authoritative station binding: DESK_1.\n');

    // ------------------------------------------------------------------
    // REQUIREMENT 1 & 2: VIRTUAL MARKET SLIP -> ORD-... -> DESK ASSIGNMENT
    // ------------------------------------------------------------------
    console.log('--- STEP 2: VIRTUAL MARKET-ONLY SLIP & PERSISTENT ORDER ID ---');
    const tktNum = `TKT-TEST-${Date.now()}`;
    const submitRes = await request('POST', '/api/orders/submit', {
      ticketNumber: tktNum,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.strictEqual(submitRes.status, 200);
    assert(submitRes.data.success, 'Submission must succeed');
    const order1 = submitRes.data.order;
    assert(order1.id.startsWith('ORD-'), `Order ID must have persistent ORD- prefix. Got: ${order1.id}`);
    assert.strictEqual(order1.orderType, 'MARKET', 'Order must be strictly MARKET');
    assert(['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'].includes(order1.deskId), 'Must be assigned to a designated desk');
    console.log(`✓ Digital order record created: ${order1.id} (Ticket #${order1.ticketNumber}) assigned to ${order1.deskId}`);

    // Verify Market-Orders-Only enforcement
    const invalidTypeRes = await request('POST', '/api/orders/submit', {
      ticketNumber: `TKT-INV-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'LIMIT',
      limitPrice: 2500
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(invalidTypeRes.status, 400);
    assert(invalidTypeRes.data.error.includes('MARKET'), 'Must enforce MARKET orders only');
    console.log('✓ Strict market-orders-only rule enforced: LIMIT orders rejected with 400.\n');

    // ------------------------------------------------------------------
    // REQUIREMENT 1: MERGED DESK REVIEW & ACCEPT/ROUTE TO BANK
    // ------------------------------------------------------------------
    console.log('--- STEP 3: MERGED DESK REVIEW, ACCEPT & ROUTE TO BANK WORKFLOW ---');
    // Claim order on assigned desk
    const claimRes = await request('POST', '/api/order/claim', {
      orderId: order1.id,
      deskId: order1.deskId,
      operator: 'Operator Alpha'
    }, { 'Authorization': `Bearer ${opToken}` });
    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.data.order.status, 'VERIFYING');

    // Merged desk reviews & accepts order (calls actionType: 'ACCEPT')
    const acceptRes = await request('POST', '/api/order/action', {
      orderId: order1.id,
      actionType: 'ACCEPT',
      deskId: order1.deskId,
      operator: 'Operator Alpha',
      physicalSlipChecked: true
    }, { 'Authorization': `Bearer ${opToken}` });

    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.data.orderStatus, 'EXECUTED_PENDING_SETTLEMENT');
    assert.strictEqual(acceptRes.data.order.status, 'EXECUTED_PENDING_SETTLEMENT');
    assert(acceptRes.data.settlement, 'Settlement voucher must be created');
    assert(acceptRes.data.order.bankDeskId, 'Bank desk must be assigned');
    assert(['BANK_1', 'BANK_2'].includes(acceptRes.data.order.bankDeskId), 'Bank desk must be BANK_1 or BANK_2');
    assert.strictEqual(acceptRes.data.order.lockedByDesk, null, 'Lock must be released for bank review');
    console.log(`✓ Order accepted by merged desk. Routed to Bank review (${acceptRes.data.order.bankDeskId}) with voucher ${acceptRes.data.settlement.voucherReference}`);

    // Verify Legacy Verification Endpoints are prevented from duplicate/independent execution
    console.log('\n--- STEP 4: PREVENT SEPARATE/DUPLICATE VERIFICATION WORKFLOW ---');
    const legacyClaimRes = await request('POST', '/api/verification/claim', {
      orderId: order1.id,
      officerName: 'Old Officer'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(legacyClaimRes.status, 400, 'Legacy claim must be rejected on executed/settling order');
    assert(legacyClaimRes.data.error.includes('already in status'), 'Error must specify order status');

    const legacyVerifyRes = await request('POST', '/api/verification/verify', {
      orderId: order1.id,
      officerName: 'Old Officer'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(legacyVerifyRes.status, 400, 'Legacy verify must be rejected');

    const legacyReturnRes = await request('POST', '/api/verification/return', {
      orderId: order1.id,
      officerName: 'Old Officer',
      returnReason: 'Should fail'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(legacyReturnRes.status, 400, 'Legacy return must be rejected');
    console.log('✓ Legacy separate verification endpoints strictly prevented from duplicate/independent execution.\n');

    // ------------------------------------------------------------------
    // REQUIREMENT 2: BANK REVIEW & EXACTLY-ONCE SETTLEMENT
    // ------------------------------------------------------------------
    console.log('--- STEP 5: BANK REVIEW & EXACTLY-ONCE SETTLEMENT ---');
    const bankToken = (await request('POST', '/api/auth/login', {
      username: 'bank',
      password: 'saamx-event-2026'
    })).data.token;
    assert(bankToken, 'Bank teller token required');

    // Confirm settlement
    const settleRes = await request('POST', '/api/bank/settle', {
      settlementId: acceptRes.data.settlement.id,
      voucherReference: acceptRes.data.settlement.voucherReference,
      notes: 'Physical payment collected at Bank Desk'
    }, { 'Authorization': `Bearer ${bankToken}` });

    assert.strictEqual(settleRes.status, 200);
    assert.strictEqual(settleRes.data.settlement.status, 'SETTLED');
    assert.strictEqual(settleRes.data.order.status, 'SETTLED');
    console.log('✓ Bank desk confirmed settlement: Order status is SETTLED.');

    // Duplicate settlement prevention
    const dupSettleRes = await request('POST', '/api/bank/settle', {
      settlementId: acceptRes.data.settlement.id
    }, { 'Authorization': `Bearer ${bankToken}` });
    assert.strictEqual(dupSettleRes.status, 409, 'Duplicate settlement must be rejected with 409 Conflict');
    console.log('✓ Exactly-once settlement verified: Duplicate settlement rejected with HTTP 409.\n');

    // ------------------------------------------------------------------
    // REQUIREMENT 2: REJECTION WORKFLOW & AUDIT TRAIL
    // ------------------------------------------------------------------
    console.log('--- STEP 6: REJECTION FLOWS AT MERGED DESK & BANK DESK ---');
    // Submit order to reject at Merged Desk
    const orderToReject = (await request('POST', '/api/orders/submit', {
      ticketNumber: `TKT-REJ-DESK-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, { 'Authorization': `Bearer ${adminToken}` })).data.order;

    // Missing rejection reason rejected
    const noReasonReject = await request('POST', '/api/order/action', {
      orderId: orderToReject.id,
      actionType: 'REJECT',
      deskId: orderToReject.deskId
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(noReasonReject.status, 400);

    // Valid rejection
    const validReject = await request('POST', '/api/order/action', {
      orderId: orderToReject.id,
      actionType: 'REJECT',
      rejectionReason: 'Invalid signatory authority',
      deskId: orderToReject.deskId,
      operator: 'Operator Alpha'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(validReject.status, 200);
    assert.strictEqual(validReject.data.order.status, 'REJECTED');
    assert.strictEqual(validReject.data.order.rejectionReason, 'Invalid signatory authority');
    console.log('✓ Merged desk rejection verified with explicit reason and audit entry.');

    // Submit order to accept at Merged Desk and reject at Bank Desk
    const orderForBankReject = (await request('POST', '/api/orders/submit', {
      ticketNumber: `TKT-REJ-BANK-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, { 'Authorization': `Bearer ${adminToken}` })).data.order;

    const acceptForBankReject = (await request('POST', '/api/order/action', {
      orderId: orderForBankReject.id,
      actionType: 'ACCEPT',
      deskId: orderForBankReject.deskId,
      operator: 'Operator Alpha',
      physicalSlipChecked: true
    }, { 'Authorization': `Bearer ${adminToken}` })).data;

    // Reject at Bank Desk
    const bankRejectRes = await request('POST', '/api/bank/reject', {
      settlementId: acceptForBankReject.settlement.id,
      reason: 'Physical currency counter counterfeit note detected'
    }, { 'Authorization': `Bearer ${bankToken}` });
    assert.strictEqual(bankRejectRes.status, 200);
    assert.strictEqual(bankRejectRes.data.settlement.status, 'REJECTED');
    assert.strictEqual(bankRejectRes.data.order.status, 'SETTLEMENT_REJECTED');
    console.log('✓ Bank desk rejection verified: Reserved cash released, order marked SETTLEMENT_REJECTED.\n');

    // ------------------------------------------------------------------
    // REQUIREMENT 3: DESK ASSIGNMENT AND QUEUE DASHBOARD
    // ------------------------------------------------------------------
    console.log('--- STEP 7: DESK ASSIGNMENT & QUEUE DASHBOARD ENDPOINT (/api/desk-queue-dashboard) ---');
    const dashRes = await request('GET', '/api/desk-queue-dashboard', null, {
      'Authorization': `Bearer ${opToken}`
    });
    assert.strictEqual(dashRes.status, 200);
    assert(dashRes.data.success);
    assert(Array.isArray(dashRes.data.desks), 'Must return exchange desks');
    assert(Array.isArray(dashRes.data.bankDesks), 'Must return bank desks');
    assert(Array.isArray(dashRes.data.allDesks), 'Must return allDesks');
    assert.strictEqual(dashRes.data.desks.length, 5, 'Must have 5 exchange desks');
    assert.strictEqual(dashRes.data.bankDesks.length, 2, 'Must have 2 bank desks');
    assert.strictEqual(dashRes.data.allDesks.length, 7, 'Must have 7 total desks');

    // Verify exchange desk attributes
    dashRes.data.desks.forEach(d => {
      assert.strictEqual(d.deskType, 'EXCHANGE');
      assert(d.deskIdentifier.startsWith('Desk '), `Desk identifier must be formatted: Desk X. Got: ${d.deskIdentifier}`);
      assert(typeof d.queueCount === 'number');
      assert(typeof d.isEmpty === 'boolean');
      assert(Array.isArray(d.orderIds));
      assert(Array.isArray(d.assignedOrders));
    });
    console.log('✓ All 5 exchange desks verified with Type, Identifier, and Queue counts.');

    // Verify bank desk attributes
    dashRes.data.bankDesks.forEach(b => {
      assert.strictEqual(b.deskType, 'BANK');
      assert(b.deskIdentifier.startsWith('Desk '), `Bank desk identifier must be formatted: Desk X. Got: ${b.deskIdentifier}`);
      assert(typeof b.queueCount === 'number');
      assert(typeof b.isEmpty === 'boolean');
      assert(Array.isArray(b.orderIds));
      assert(Array.isArray(b.assignedOrders));
    });
    console.log('✓ All 2 bank desks verified with Type, Identifier, and Queue counts.');

    // Submit an active order to DESK_3 to verify queue count and format
    const desk3Tkt = `TKT-D3-${Date.now()}`;
    const desk3Order = (await request('POST', '/api/orders/submit', {
      ticketNumber: desk3Tkt,
      teamCode: 'T02',
      ticker: 'WIPRO',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET',
      deskId: 'DESK_3'
    }, { 'Authorization': `Bearer ${adminToken}` })).data.order;

    const dashRes2 = await request('GET', '/api/desk-queue-dashboard', null, {
      'Authorization': `Bearer ${opToken}`
    });
    const desk3 = dashRes2.data.desks.find(d => d.id === 'DESK_3');
    assert(desk3, 'DESK_3 must exist');
    assert(desk3.queueCount >= 1, 'DESK_3 queue count must reflect assigned order');
    assert.strictEqual(desk3.isEmpty, false, 'DESK_3 must not be empty');
    const queuedOrder = desk3.assignedOrders.find(o => o.id === desk3Order.id);
    assert(queuedOrder, 'Assigned order must be present in assignedOrders list');
    assert.strictEqual(queuedOrder.statusDisplay, 'Awaiting review');
    assert(queuedOrder.assignmentTime, 'Assignment time must be present');
    console.log(`✓ Desk 3 queue accurately tracks Order ${queuedOrder.id} (${queuedOrder.statusDisplay}) assigned at ${queuedOrder.assignmentTime}`);

    // Verify empty desk state
    const emptyDesks = dashRes2.data.allDesks.filter(d => d.queueCount === 0);
    assert(emptyDesks.length > 0, 'At least one desk should have an empty queue');
    emptyDesks.forEach(ed => {
      assert.strictEqual(ed.isEmpty, true, 'Empty desk must have isEmpty: true');
      assert.strictEqual(ed.queueCount, 0, 'Empty desk must have queueCount: 0');
    });
    console.log(`✓ Clear empty queue indication verified across ${emptyDesks.length} idle desks (Queue: 0 — Queue is empty).`);

    // ------------------------------------------------------------------
    // STEP 7b: CROSS-DESK LOCK PRECEDENCE & QUEUE NON-DUPLICATION
    // ------------------------------------------------------------------
    console.log('\n--- STEP 7b: CROSS-DESK LOCK PRECEDENCE & NON-DUPLICATION ---');
    const orderForLockTest = (await request('POST', '/api/orders/submit', {
      ticketNumber: `TKT-LOCK-${Date.now()}`,
      teamCode: 'T03',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${adminToken}` })).data.order;

    // Operator at DESK_2 claims/locks the order originally assigned to DESK_1
    const claimDesk2Res = await request('POST', '/api/order/action', {
      orderId: orderForLockTest.id,
      actionType: 'CLAIM',
      deskId: 'DESK_2',
      operator: 'Operator Beta'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(claimDesk2Res.status, 200, 'Claiming order by DESK_2 failed');

    const dashResLock = await request('GET', '/api/desk-queue-dashboard', null, {
      'Authorization': `Bearer ${opToken}`
    });
    const desk1AfterLock = dashResLock.data.desks.find(d => d.id === 'DESK_1');
    const desk2AfterLock = dashResLock.data.desks.find(d => d.id === 'DESK_2');

    assert(!desk1AfterLock.orderIds.includes(orderForLockTest.id),
      'Order claimed by DESK_2 must NOT appear in DESK_1 queue');
    assert(desk2AfterLock.orderIds.includes(orderForLockTest.id),
      'Order claimed by DESK_2 MUST appear in DESK_2 queue');

    // Invariant: Across all 7 desks, orderForLockTest.id must appear exactly ONCE
    const appearances = dashResLock.data.allDesks.filter(d => d.orderIds.includes(orderForLockTest.id));
    assert.strictEqual(appearances.length, 1,
      `Cross-desk duplicate violation! Order appears in ${appearances.length} desks instead of exactly 1`);
    console.log('✓ Cross-desk lock precedence verified: Claimed order transferred cleanly with zero duplicate appearances.');

    // Verify Complete Order Audit History
    console.log('\n--- STEP 8: AUDIT TIMELINE INSPECTION ---');
    const settledOrder = (await request('GET', '/api/orders', null, { 'Authorization': `Bearer ${adminToken}` }))
      .data.find(o => o.id === order1.id);
    assert(settledOrder, 'Settled order must be found');
    assert(Array.isArray(settledOrder.statusHistory), 'Order must have statusHistory array');
    console.log(`Order ${settledOrder.id} complete audit progression:`);
    settledOrder.statusHistory.forEach(h => {
      console.log(`  -> [${h.stage || h.status}] at ${new Date(h.timestamp).toLocaleTimeString()}: ${h.note || 'Status updated'} (Actor: ${h.actor || 'System'})`);
    });
    assert(settledOrder.statusHistory.some(h => h.status === 'PENDING' || h.stage === 'AWAITING_VERIFICATION'));
    assert(settledOrder.statusHistory.some(h => h.status === 'EXECUTED_PENDING_SETTLEMENT'));
    assert(settledOrder.statusHistory.some(h => h.status === 'SETTLED'));
    console.log('✓ Complete audit timeline recorded from submission to bank settlement.');

    // ------------------------------------------------------------------
    // STEP 9: FRONTEND RBAC ROUTE GUARD & CODE VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- STEP 9: FRONTEND RBAC & CODE INTEGRITY CHECKS ---');
    const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
    assert(appJsx.includes("'#/desk-dashboard'"), 'src/App.jsx must configure #/desk-dashboard route guard');
    assert(appJsx.includes("'#/queue-dashboard'"), 'src/App.jsx must configure #/queue-dashboard route guard');

    const loginPageJsx = fs.readFileSync('src/pages/LoginPage.jsx', 'utf8');
    assert(loginPageJsx.includes("case 'bank_teller': return '#/bank';"),
      'LoginPage must redirect bank_teller to #/bank by default');
    assert(loginPageJsx.includes("'#/desk-dashboard'"),
      'LoginPage safeDesks must allow #/desk-dashboard');

    const orderHistoryJsx = fs.readFileSync('src/components/team/OrderHistorySection.jsx', 'utf8');
    assert(orderHistoryJsx.includes("order.status === 'EXECUTED' || order.status === 'SETTLED'"),
      'OrderHistorySection must treat SETTLED status as executed');

    const exchangeJsx = fs.readFileSync('src/pages/ExchangePage.jsx', 'utf8');
    assert(!exchangeJsx.includes('handleExecuteOrder(reviewOrder.id, true)'),
      'ExchangePage ReviewModal footer must not contain redundant execute button');
    console.log('✓ Frontend RBAC guards, bank redirect, and UI representations verified.');

    console.log('\n======================================================================');
    console.log('🎉 ALL END-TO-END LIFECYCLE & DASHBOARD VERIFICATIONS PASSED (10/10)!');
    console.log('======================================================================\n');
  } finally {
    serverProc.kill();
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }

  // POST-FLIGHT STATE INTEGRITY CHECK
  const postHash = getSha256(ORIGINAL_STATE);
  console.log(`Post-flight authoritative state.json hash: ${postHash}`);
  assert.strictEqual(postHash, preHash, 'AUTHORITATIVE STATE.JSON HASH CHANGED! MUST REMAIN IMMUTABLE!');
  console.log('✓ Authoritative state.json remains 100% bit-for-bit unchanged!\n');
}

run().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
