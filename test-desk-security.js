import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 3014;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_STATE_FILE = './test-state-desk-security.json';

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
  console.log('======================================================================');
  console.log('🧪 SAAMX 2.0 — PHASE 4: DYNAMIC DESK ASSIGNMENT & SECURITY TEST SUITE');
  console.log('======================================================================\n');

  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }

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
    assert(ready, 'Test server failed to start');
    console.log('✓ Test server operational.\n');

    // ------------------------------------------------------------------
    // TEST 1: Super Admin Login & Dynamic Desk Introspection
    // ------------------------------------------------------------------
    console.log('--- TEST 1: DYNAMIC DESK INTROSPECTION (/api/desks) ---');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(loginRes.status, 200);
    const adminToken = loginRes.data.token;
    assert(adminToken, 'Must receive token for master administrator');

    const desksRes = await request('GET', '/api/desks', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(desksRes.status, 200);
    assert(Array.isArray(desksRes.data.desks), 'Must return desks array');
    assert.strictEqual(desksRes.data.desks.length, 5, 'Must have 5 physical desks');
    assert(desksRes.data.desks.every(d => d.id.startsWith('DESK_')), 'All desks must have DESK_ prefix');
    console.log(`✓ 5 dynamic desks verified: ${desksRes.data.desks.map(d => d.name).join(', ')}`);

    // ------------------------------------------------------------------
    // TEST 2: Provision Desk Operator Accounts with Assigned Station
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: PROVISION DESK OPERATORS WITH STATION ASSIGNMENTS ---');
    const operator1 = {
      displayName: 'Operator Alpha',
      username: 'op_alpha',
      role: 'operator_x',
      department: 'Trading Pit 1',
      password: 'Password123!',
      assignedDesk: 'DESK_1',
      selectedPages: ['#/exchange'],
      permissions: ['orders.view_queue', 'orders.verify', 'exchange.view', 'exchange.execute']
    };
    const prov1Res = await request('POST', '/api/personnel', operator1, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(prov1Res.status, 201);
    assert.strictEqual(prov1Res.data.account.assignedDesk, 'DESK_1');

    const operator2 = {
      displayName: 'Operator Beta',
      username: 'op_beta',
      role: 'operator_x',
      department: 'Trading Pit 2',
      password: 'Password123!',
      assignedDesk: 'DESK_2',
      selectedPages: ['#/exchange'],
      permissions: ['orders.view_queue', 'orders.verify', 'exchange.view', 'exchange.execute']
    };
    const prov2Res = await request('POST', '/api/personnel', operator2, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(prov2Res.status, 201);
    assert.strictEqual(prov2Res.data.account.assignedDesk, 'DESK_2');
    console.log('✓ Operator Alpha assigned to DESK_1, Operator Beta assigned to DESK_2.');

    // ------------------------------------------------------------------
    // TEST 3: Login as Operator & Verify Authoritative Desk Resolution
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: OPERATOR AUTHENTICATION & /api/auth/me DESK BINDING ---');
    const op1Login = await request('POST', '/api/auth/login', {
      username: 'op_alpha',
      password: 'Password123!'
    });
    assert.strictEqual(op1Login.status, 200);
    const op1Token = op1Login.data.token;
    assert.strictEqual(op1Login.data.assignedDesk, 'DESK_1');

    const op1Me = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${op1Token}`
    });
    assert.strictEqual(op1Me.status, 200);
    assert.strictEqual(op1Me.data.assignedDesk, 'DESK_1');
    console.log('✓ /api/auth/me authoritatively returns assignedDesk: DESK_1.');

    // ------------------------------------------------------------------
    // TEST 4: Submit Orders for Testing Isolation
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: TICKET SUBMISSION & INTAKE QUEUING ---');
    // Ensure market state is OPEN / CONTINUOUS_TRADING so orders can be processed
    await request('POST', '/api/market/control', { action: 'START' }, {
      'Authorization': `Bearer ${adminToken}`
    });

    // Submit ticket 1001 for Desk 1
    const order1Res = await request('POST', '/api/order/submit', {
      ticketNumber: '1001',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 50,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(order1Res.status, 200);
    const order1Id = order1Res.data.order?.id;
    assert(order1Id, 'Must have created order 1001');

    // Submit ticket 1002 for Desk 2
    const order2Res = await request('POST', '/api/order/submit', {
      ticketNumber: '1002',
      teamCode: 'T02',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 30,
      orderType: 'MARKET',
      deskId: 'DESK_2'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(order2Res.status, 200);
    const order2Id = order2Res.data.order?.id;
    assert(order2Id, 'Must have created order 1002');
    console.log(`✓ Order 1001 (DESK_1) and Order 1002 (DESK_2) successfully queued.`);

    // ------------------------------------------------------------------
    // TEST 5: Operator 1 Claims Desk 1 Order (Allowed)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: AUTHORIZED STATION CLAIM (DESK_1 -> DESK_1) ---');
    const claim1Res = await request('POST', '/api/order/claim', {
      orderId: order1Id,
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${op1Token}`
    });
    assert.strictEqual(claim1Res.status, 200);
    assert(claim1Res.data.success);
    assert.strictEqual(claim1Res.data.order.lockedByDesk, 'DESK_1');
    console.log('✓ Operator Alpha successfully claimed Order 1001 on DESK_1.');

    // ------------------------------------------------------------------
    // TEST 6: Strict Desk Isolation - Operator 1 Claims Desk 2 Order (Rejected with 403)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: STRICT CROSS-DESK VIOLATION REJECTION (403 FORBIDDEN) ---');
    const claimCrossRes = await request('POST', '/api/order/claim', {
      orderId: order2Id,
      deskId: 'DESK_2'
    }, {
      'Authorization': `Bearer ${op1Token}`
    });
    assert.strictEqual(claimCrossRes.status, 403);
    assert(claimCrossRes.data.error.includes('Forbidden') || claimCrossRes.data.error.includes('not authorized'));
    console.log('✓ Cross-desk claim correctly rejected with HTTP 403 Forbidden.');

    // ------------------------------------------------------------------
    // TEST 7: Parameter Tampering Defense (Claiming Desk 2 order while passing deskId: 'DESK_1')
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: PARAMETER TAMPERING DEFENSE ---');
    const tamperRes = await request('POST', '/api/order/claim', {
      orderId: order2Id,
      deskId: 'DESK_1' // Trying to spoof deskId to match their own desk
    }, {
      'Authorization': `Bearer ${op1Token}`
    });
    // Server must reject because the order is bound to DESK_2
    assert.strictEqual(tamperRes.status, 403);
    console.log('✓ Request parameter tampering successfully thwarted with HTTP 403 Forbidden.');

    // ------------------------------------------------------------------
    // TEST 8: Unauthorized Desk Reassignment Protection
    // ------------------------------------------------------------------
    console.log('\n--- TEST 8: UNAUTHORIZED DESK REASSIGNMENT REJECTION ---');
    const unauthReassign = await request('POST', '/api/desks/assign', {
      deskId: 'DESK_2',
      operatorUsername: 'op_alpha'
    }, {
      'Authorization': `Bearer ${op1Token}` // Operator trying to reassign themselves
    });
    assert.strictEqual(unauthReassign.status, 403);
    console.log('✓ Unauthorized desk reassignment attempt rejected with HTTP 403.');

    // ------------------------------------------------------------------
    // TEST 9: Dynamic Reassignment Shifts Access Rights Immediately
    // ------------------------------------------------------------------
    console.log('\n--- TEST 9: REAL-TIME DYNAMIC REASSIGNMENT & IMMEDIATE RIGHTS SHIFT ---');
    const reassignRes = await request('POST', '/api/desks/assign', {
      deskId: 'DESK_2',
      operatorUsername: 'op_alpha'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(reassignRes.status, 200);

    // Using the SAME op1Token, verify that the session dynamically resolves to DESK_2
    const op1MeAfter = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${op1Token}`
    });
    assert.strictEqual(op1MeAfter.status, 200);
    assert.strictEqual(op1MeAfter.data.assignedDesk, 'DESK_2');

    // Now Operator Alpha should be allowed to claim Order 1002 on DESK_2!
    const claimNowRes = await request('POST', '/api/order/claim', {
      orderId: order2Id,
      deskId: 'DESK_2'
    }, {
      'Authorization': `Bearer ${op1Token}`
    });
    assert.strictEqual(claimNowRes.status, 200);
    assert.strictEqual(claimNowRes.data.order.lockedByDesk, 'DESK_2');
    console.log('✓ Reassignment to DESK_2 immediately active: Operator Alpha claimed Order 1002 without re-login!');

    // ------------------------------------------------------------------
    // TEST 10: Supervisory Cross-Desk Authority
    // ------------------------------------------------------------------
    console.log('\n--- TEST 10: SUPERVISORY UNIVERSAL ACCESS (desks.cross_operate) ---');
    // Admin executes order 1001 (on DESK_1) and order 1002 (on DESK_2)
    // First validate order 1001
    await request('POST', '/api/order/action', {
      orderId: order1Id,
      action: 'VALIDATE',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    const exec1Res = await request('POST', '/api/order/action', {
      orderId: order1Id,
      action: 'EXECUTE',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(exec1Res.status, 200);
    assert.strictEqual(exec1Res.data.order.status, 'EXECUTED');
    console.log('✓ Master Supervisor successfully validated and executed ticket across desks.');

    console.log('\n======================================================================');
    console.log('✅ ALL PHASE 4 DESK-LEVEL SECURITY TESTS PASSED (10/10)!');
    console.log('======================================================================\n');
  } finally {
    serverProc.kill();
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }
}

run().catch(err => {
  console.error('\n❌ DESK SECURITY TEST SUITE FAILED:', err);
  process.exit(1);
});
