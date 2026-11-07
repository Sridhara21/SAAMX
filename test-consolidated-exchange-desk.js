import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 3008;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_STATE_FILE = './test-state-consolidated-desk.json';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': 'fms-event-2026',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log(`Starting isolated test server on port ${PORT}...`);
  // Ensure clean test state file
  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }

  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE: TEST_STATE_FILE },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {
    // console.log('[Server stdout]', d.toString());
  });
  serverProc.stderr.on('data', d => {
    console.error('[Server stderr]', d.toString());
  });
  serverProc.on('exit', (code, sig) => {
    if (code !== null && code !== 0) console.log(`[Server exited] code: ${code}, signal: ${sig}`);
  });

  // Wait for server to boot reliably
  await new Promise((resolve) => {
    let booted = false;
    serverProc.stdout.on('data', d => {
      if (d.toString().includes('running on') || d.toString().includes('Backend running')) {
        if (!booted) {
          booted = true;
          setTimeout(resolve, 500);
        }
      }
    });
    setTimeout(() => {
      if (!booted) resolve();
    }, 8000);
  });

  try {
    console.log('\n--- 1. Resetting test state & starting market ---');
    const resetRes = await request('POST', '/api/admin/reset', { confirmText: 'RESET ALL' });
    assert.strictEqual(resetRes.status, 200, 'Admin reset failed');

    const startRes = await request('POST', '/api/market/control', { action: 'START' });
    assert.strictEqual(startRes.status, 200, 'Market start failed');

    // Get initial team portfolio state via POST /api/portfolio
    const teamStateRes = await request('POST', '/api/portfolio', { teamCode: 'T01' });
    assert.strictEqual(teamStateRes.status, 200, 'Portfolio fetch failed');
    const teamData = teamStateRes.data.team || teamStateRes.data;
    const initialCash = Number(teamData.cashBalance !== undefined ? teamData.cashBalance : teamData.cash);
    const initialHoldings = { ...(teamData.holdings || {}) };
    console.log(`Initial T01 Cash: ₹${initialCash.toLocaleString('en-IN')}`);

    // --- 2. Paper order slip intake ---
    console.log('\n--- 2. Submitting paper order slip (Intake) ---');
    const ticket1 = `TKT-PHASE1-${Date.now()}`;
    const submitRes = await request('POST', '/api/orders/submit', {
      ticketNumber: ticket1,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET',
      enteredBy: 'Floor Runner Desk 1'
    });
    assert.strictEqual(submitRes.status, 200, 'Order submission failed');
    const order1 = submitRes.data.order;
    const orderId1 = submitRes.data.orderId || order1.id;
    assert.strictEqual(order1.status, 'PENDING');
    assert.strictEqual(order1.workflowStage, 'AWAITING_VERIFICATION');
    assert.strictEqual(order1.ticketNumber, ticket1);
    console.log(`✓ Order created: ID ${orderId1}, Ticket ${ticket1}, Status: ${order1.status}`);

    // --- 3. Atomic Desk Claim Locking ---
    console.log('\n--- 3. Testing Atomic Desk Claim & Concurrency Locking ---');
    const claimRes1 = await request('POST', '/api/order/claim', {
      orderId: orderId1,
      deskId: 'DESK_1',
      officerName: 'Exchange Operator A'
    });
    assert.strictEqual(claimRes1.status, 200, 'Desk 1 claim failed');
    assert(claimRes1.data.order.status === 'VERIFYING' || claimRes1.data.order.status === 'BEING_VERIFIED');
    assert.strictEqual(claimRes1.data.order.lockedByDesk, 'DESK_1');
    console.log(`✓ Desk 1 successfully locked order. Status: ${claimRes1.data.order.status}`);

    // Concurrency conflict test: Desk 2 attempts to claim the same order
    const claimResConflict = await request('POST', '/api/order/claim', {
      orderId: orderId1,
      deskId: 'DESK_2',
      officerName: 'Exchange Operator B'
    });
    assert(claimResConflict.status === 409 || claimResConflict.status === 400, `Expected 409 or 400 for already locked order, got ${claimResConflict.status}`);
    console.log(`✓ Concurrency guard passed: Desk 2 rejected with ${claimResConflict.status} (${claimResConflict.data.error})`);

    // --- 4. Return for Correction Workflow ---
    console.log('\n--- 4. Testing Return for Correction Workflow ---');
    // Test missing returnReason
    const badReturnRes = await request('POST', '/api/order/action', {
      orderId: orderId1,
      actionType: 'RETURN_FOR_CORRECTION',
      deskId: 'DESK_1',
      officerName: 'Exchange Operator A'
    });
    assert.strictEqual(badReturnRes.status, 400, 'Expected 400 for missing returnReason');
    console.log(`✓ Validation guard passed: Missing returnReason rejected with 400`);

    // Valid return with reason
    const returnRes = await request('POST', '/api/order/action', {
      orderId: orderId1,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: 'Quantity smudged on physical runner slip; verify with team captain',
      deskId: 'DESK_1',
      officerName: 'Exchange Operator A'
    });
    assert.strictEqual(returnRes.status, 200, 'Return for correction failed');
    assert.strictEqual(returnRes.data.order.status, 'RETURNED_FOR_CORRECTION');
    assert.strictEqual(returnRes.data.order.lockedByDesk, null);
    assert.strictEqual(returnRes.data.order.returnReason, 'Quantity smudged on physical runner slip; verify with team captain');
    console.log(`✓ Order returned for correction. Lock released, returnReason saved.`);

    // --- 5. Team Resubmission & Cross-Team Security ---
    console.log('\n--- 5. Testing Team Resubmission & Cross-Team Security ---');
    // Login as T02 to get session token
    const loginT02 = await request('POST', '/api/auth/login', { username: 'T02', password: 't02' });
    assert.strictEqual(loginT02.status, 200, 'T02 login failed');
    let t02Token = loginT02.data.token;
    
    // Cross-team resubmit attempt with T02 token
    const crossResubmit = await request('POST', '/api/orders/resubmit', {
      orderId: orderId1,
      quantity: 50
    }, { Authorization: `Bearer ${t02Token}` });
    assert.strictEqual(crossResubmit.status, 403, 'Expected 403 for cross-team order resubmission');
    console.log(`✓ Cross-team guard passed: Team T02 denied resubmission with 403`);

    // Authorized Team T01 resubmission
    const loginT01 = await request('POST', '/api/auth/login', { username: 'T01', password: 't01' });
    assert.strictEqual(loginT01.status, 200, 'T01 login failed');
    let t01Token = loginT01.data.token;
    const t01Resubmit = await request('POST', '/api/orders/resubmit', {
      orderId: orderId1,
      quantity: 25,
      notes: 'Clarified 25 units with Captain'
    }, { Authorization: `Bearer ${t01Token}` });
    assert.strictEqual(t01Resubmit.status, 200, 'T01 resubmission failed');
    assert.strictEqual(t01Resubmit.data.order.status, 'PENDING');
    assert.strictEqual(t01Resubmit.data.order.quantity, 25);
    assert.strictEqual(t01Resubmit.data.order.returnReason, null);
    console.log(`✓ Authorized resubmission passed: Order updated to 25 shares, status reset to PENDING.`);

    // --- 6. Review & Validation in Consolidated Desk ---
    console.log('\n--- 6. Testing Order Review & Validation in Consolidated Desk ---');
    // Claim by Desk 2
    const claimRes2 = await request('POST', '/api/order/claim', {
      orderId: orderId1,
      deskId: 'DESK_2',
      officerName: 'Exchange Operator B'
    });
    assert.strictEqual(claimRes2.status, 200);

    // Validate order
    const validateRes = await request('POST', '/api/order/action', {
      orderId: orderId1,
      actionType: 'VALIDATE',
      deskId: 'DESK_2',
      officerName: 'Exchange Operator B',
      physicalSlipChecked: true
    });
    assert.strictEqual(validateRes.status, 200, 'Order validation failed: ' + JSON.stringify(validateRes.data));
    assert.strictEqual(validateRes.data.order.status, 'VALIDATED');
    console.log(`✓ Order successfully validated. Ready for execution.`);

    // Cash and holdings should NOT have moved yet
    const preExecTeamRes = await request('POST', '/api/portfolio', { teamCode: 'T01' });
    const preExecTeam = preExecTeamRes.data.team;
    const preExecCash = Number(preExecTeam.cashBalance !== undefined ? preExecTeam.cashBalance : preExecTeam.cash);
    assert.strictEqual(preExecCash, initialCash, 'Cash moved prematurely before execution!');
    console.log(`✓ Portfolio integrity verified: No cash deduction prior to execution.`);

    // --- 7. Authorized Execution & Portfolio Consistency ---
    console.log('\n--- 7. Testing Trade Execution & Portfolio Accounting Consistency ---');
    const execRes = await request('POST', '/api/order/action', {
      orderId: orderId1,
      actionType: 'EXECUTE',
      deskId: 'DESK_2',
      officerName: 'Exchange Operator B'
    });
    assert.strictEqual(execRes.status, 200, 'Order execution failed: ' + JSON.stringify(execRes.data));
    assert.strictEqual(execRes.data.order.status, 'EXECUTED');
    const executedPrice = Number(execRes.data.order.executionPrice || execRes.data.order.executedPrice || execRes.data.order.priceAtExecution);
    const executedValue = Number(execRes.data.order.executionValue || execRes.data.order.executedValue || execRes.data.order.totalValue);
    assert(executedPrice > 0, `Executed price must be positive, got ${executedPrice}`);
    assert(executedValue > 0, `Executed value must be positive, got ${executedValue}`);
    console.log(`✓ Trade executed at ₹${executedPrice} (Total: ₹${executedValue})`);

    // Verify Team Cash & Holdings
    const postExecTeamRes = await request('POST', '/api/portfolio', { teamCode: 'T01' });
    const postExecTeam = postExecTeamRes.data.team;
    const postExecCash = Number(postExecTeam.cashBalance !== undefined ? postExecTeam.cashBalance : postExecTeam.cash);
    const expectedCash = initialCash - executedValue;
    assert.strictEqual(postExecCash, expectedCash, `Expected cash ₹${expectedCash}, got ₹${postExecCash}`);
    const expectedHoldings = (initialHoldings['RELIANCE'] || 0) + 25;
    assert.strictEqual(postExecTeam.holdings['RELIANCE'], expectedHoldings, `Expected 25 RELIANCE shares`);
    console.log(`✓ Portfolio consistency verified: Cash debited exactly by ₹${executedValue}, 25 RELIANCE shares added.`);

    // --- 8. Duplicate Execution Prevention ---
    console.log('\n--- 8. Testing Duplicate Execution Prevention ---');
    const dupExecRes = await request('POST', '/api/order/action', {
      orderId: orderId1,
      actionType: 'EXECUTE',
      deskId: 'DESK_2',
      officerName: 'Exchange Operator B'
    });
    assert.strictEqual(dupExecRes.status, 400, 'Expected 400 for duplicate execution');
    console.log(`✓ Duplicate execution prevented with 400 (${dupExecRes.data.error})`);

    // Verify Cash and Holdings did NOT change after rejected duplicate execution
    const postDupTeamRes = await request('POST', '/api/portfolio', { teamCode: 'T01' });
    const postDupTeam = postDupTeamRes.data.team;
    const postDupCash = Number(postDupTeam.cashBalance !== undefined ? postDupTeam.cashBalance : postDupTeam.cash);
    assert.strictEqual(postDupCash, expectedCash, 'Cash was modified during duplicate execution attempt!');
    assert.strictEqual(postDupTeam.holdings['RELIANCE'], expectedHoldings, 'Holdings were modified during duplicate execution attempt!');
    console.log(`✓ Portfolio remained completely untouched after duplicate execution attempt.`);

    // --- 9. Rejection Workflow for Invalid Order ---
    console.log('\n--- 9. Testing Floor Rejection Workflow ---');
    const ticket2 = `TKT-REJECT-${Date.now()}`;
    const submitRejectRes = await request('POST', '/api/orders/submit', {
      ticketNumber: ticket2,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'SELL',
      quantity: 100, // T01 has 0 shares of TCS
      orderType: 'MARKET',
      enteredBy: 'Floor Runner Desk 2'
    });
    assert.strictEqual(submitRejectRes.status, 200);
    const orderId2 = submitRejectRes.data.orderId || submitRejectRes.data.order.id;

    // Claim
    await request('POST', '/api/order/claim', {
      orderId: orderId2,
      deskId: 'DESK_3',
      officerName: 'Exchange Operator C'
    });

    // Reject with reason
    const rejectActionRes = await request('POST', '/api/order/action', {
      orderId: orderId2,
      actionType: 'REJECT',
      rejectionReason: 'Insufficient holdings: Team T01 does not hold 100 shares of TCS',
      deskId: 'DESK_3',
      officerName: 'Exchange Operator C'
    });
    assert.strictEqual(rejectActionRes.status, 200, 'Rejection failed');
    assert.strictEqual(rejectActionRes.data.order.status, 'REJECTED');
    assert.strictEqual(rejectActionRes.data.order.rejectionReason, 'Insufficient holdings: Team T01 does not hold 100 shares of TCS');
    console.log(`✓ Invalid order rejected with explicit reason.`);

    // Cannot execute rejected order
    const execRejectedRes = await request('POST', '/api/order/action', {
      orderId: orderId2,
      actionType: 'EXECUTE',
      deskId: 'DESK_3',
      officerName: 'Exchange Operator C'
    });
    assert.strictEqual(execRejectedRes.status, 400, 'Expected 400 when attempting to execute rejected order');
    console.log(`✓ Rejected order cannot be executed (400 confirmed).`);

    // --- 10. Role-Based Authorization Enforcement ---
    console.log('\n--- 10. Testing Role Authorization Guards on Desk Actions ---');
    // Team role attempting desk claim
    const teamClaimRes = await request('POST', '/api/order/claim', {
      orderId: orderId2,
      deskId: 'DESK_1'
    }, { Authorization: `Bearer ${t01Token}` });
    assert.strictEqual(teamClaimRes.status, 403, 'Expected 403 for team role attempting desk claim');

    // Team role attempting desk action
    const teamActionRes = await request('POST', '/api/order/action', {
      orderId: orderId2,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, { Authorization: `Bearer ${t01Token}` });
    assert.strictEqual(teamActionRes.status, 403, 'Expected 403 for team role attempting desk action');
    console.log(`✓ Team role strictly prohibited from desk claim and action (403 confirmed).`);

    // Operator_x / Exchange role allowed
    const loginOpX = await request('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    assert.strictEqual(loginOpX.status, 200, 'Operator X login failed');
    let opXToken = loginOpX.data.token;
    assert(opXToken, 'Operator X token missing');

    const ticket3 = `TKT-OPX-${Date.now()}`;
    const submit3 = await request('POST', '/api/orders/submit', {
      ticketNumber: ticket3,
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET',
      enteredBy: 'Floor Runner 3'
    });
    const orderId3 = submit3.data.orderId || submit3.data.order.id;

    const opXClaim = await request('POST', '/api/order/claim', {
      orderId: orderId3,
      deskId: 'DESK_4',
      officerName: 'Exchange Operator X'
    }, { Authorization: `Bearer ${opXToken}` });
    assert.strictEqual(opXClaim.status, 200, 'Operator X desk claim should succeed');
    console.log(`✓ Exchange operator role successfully authorized for desk claim.`);

    // --- 11. Audit Trail Preservation ---
    console.log('\n--- 11. Verifying Audit Trail Integrity ---');
    const auditRes = await request('GET', '/api/audit-log');
    assert.strictEqual(auditRes.status, 200);
    const auditLogs = auditRes.data.log || [];
    console.log(`✓ Global audit log contains ${auditLogs.length} events.`);

    // Check that order1 lifecycle statusHistory is meticulously recorded
    const ordersRes = await request('GET', '/api/orders');
    assert.strictEqual(ordersRes.status, 200);
    const orders = ordersRes.data.orders || ordersRes.data || [];
    const recordedOrder1 = orders.find(o => o.id === orderId1);
    assert(recordedOrder1, 'Recorded order 1 must exist');
    assert(Array.isArray(recordedOrder1.statusHistory) && recordedOrder1.statusHistory.length >= 4,
      `Expected statusHistory >= 4 entries, got ${recordedOrder1.statusHistory?.length}`);
    const stages = recordedOrder1.statusHistory.map(h => h.stage);
    console.log(`✓ Order ${orderId1} complete audit history stages:`, stages.join(' -> '));
    assert(stages.includes('RETURNED_FOR_CORRECTION'), 'Must include RETURNED_FOR_CORRECTION');
    assert(stages.includes('VALIDATED'), 'Must include VALIDATED');
    assert(stages.includes('EXECUTED'), 'Must include EXECUTED');

    console.log('\n======================================================');
    console.log('✅ ALL PHASE 1 CONSOLIDATED EXCHANGE DESK TESTS PASSED!');
    console.log('======================================================\n');

  } finally {
    // Kill test server
    serverProc.kill();
    // Clean up test state file
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }
}

run().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
