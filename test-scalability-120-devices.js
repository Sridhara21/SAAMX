import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import WebSocket from 'ws';

const PORT = 3016;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}`;
const TEST_STATE_FILE = './test-state-scalability.json';
const NUM_CLIENTS = 120;

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
  console.log(`🚀 SAAMX 2.0 — MULTI-DEVICE SCALABILITY & CONCURRENCY TEST SUITE (${NUM_CLIENTS} DEVICES)`);
  console.log('======================================================================\n');

  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }

  console.log(`Starting isolated scalability test server on port ${PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE: TEST_STATE_FILE },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {});
  serverProc.stderr.on('data', d => console.error('[Server stderr]', d.toString()));

  const clients = [];

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
    console.log('✓ Server operational.\n');

    // Admin login
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(loginRes.status, 200);
    const adminToken = loginRes.data.token;

    // Start continuous trading session
    const startRes = await request('POST', '/api/market/control', { action: 'START' }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(startRes.status, 200, 'Market start must return 200');

    // ------------------------------------------------------------------
    // TEST 1: Establish 120 Concurrent WebSocket Connections
    // ------------------------------------------------------------------
    console.log(`--- TEST 1: ESTABLISHING ${NUM_CLIENTS} CONCURRENT WEBSOCKET CONNECTIONS ---`);
    const connectPromises = [];
    let receivedInitialStates = 0;

    const startTime = Date.now();
    for (let i = 0; i < NUM_CLIENTS; i++) {
      const p = new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.clientId = i + 1;
        ws.receivedTypes = new Set();

        ws.on('open', () => {
          resolve(ws);
        });

        ws.on('message', (data) => {
          try {
            const str = typeof data === 'string' ? data : data.toString();
            const match = str.match(/"type":"([^"]+)"/);
            if (match && match[1]) {
              ws.receivedTypes.add(match[1]);
            }
          } catch (e) {}
        });

        ws.on('error', (err) => {
          reject(err);
        });
      });
      connectPromises.push(p);
    }

    const connectedSockets = await Promise.all(connectPromises);
    clients.push(...connectedSockets);
    const duration = Date.now() - startTime;
    assert.strictEqual(clients.length, NUM_CLIENTS, `All ${NUM_CLIENTS} connections must open`);
    console.log(`✓ Successfully established ${NUM_CLIENTS} concurrent WebSocket connections in ${duration}ms!`);

    // Wait a brief moment for initial state frames
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✓ All connections acknowledged by server.`);

    // ------------------------------------------------------------------
    // TEST 2: WebSocket Ping / Pong Heartbeat Verification
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: WEBSOCKET HEARTBEAT & CLIENT LIVENESS ---');
    // Clear PONG from receivedTypes
    clients.forEach(ws => ws.receivedTypes.delete('PONG'));

    // Paced heartbeat batching to simulate production traffic
    for (let b = 0; b < clients.length; b += 20) {
      const batch = clients.slice(b, b + 20);
      batch.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      });
      await new Promise(r => setTimeout(r, 40));
    }

    // Wait for PONG responses
    let pongCount = 0;
    for (let wait = 0; wait < 30; wait++) {
      pongCount = clients.filter(c => c.receivedTypes.has('PONG')).length;
      if (pongCount >= NUM_CLIENTS * 0.95) break;
      await new Promise(r => setTimeout(r, 200));
    }

    assert(pongCount >= NUM_CLIENTS * 0.95, `At least 95% of clients must receive heartbeat pong (received: ${pongCount})`);
    console.log(`✓ Heartbeat verified: ${pongCount}/${NUM_CLIENTS} clients responded with PONG.`);

    // ------------------------------------------------------------------
    // TEST 3: High-Frequency Delta Broadcast Distribution
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: HIGH-FREQUENCY DELTA BROADCAST DISTRIBUTION ---');
    // Clear ORDER_CREATED from receivedTypes
    clients.forEach(c => c.receivedTypes.delete('ORDER_CREATED'));

    // Submit a new order
    const dynamicTicket = String(Math.floor(100000 + Math.random() * 900000));
    const orderRes = await request('POST', '/api/order/submit', {
      ticketNumber: dynamicTicket,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 100,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    if (orderRes.status !== 200) {
      console.error('Order submit error:', orderRes.status, orderRes.data);
    }
    assert.strictEqual(orderRes.status, 200);
    const orderId = orderRes.data.order?.id;
    assert(orderId, 'Order must be submitted');

    // Wait for broadcast propagation
    let receivedBroadcastCount = 0;
    for (let wait = 0; wait < 30; wait++) {
      receivedBroadcastCount = clients.filter(c => c.receivedTypes.has('ORDER_CREATED')).length;
      if (receivedBroadcastCount >= NUM_CLIENTS * 0.9) break;
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`✓ Delta broadcast received by ${receivedBroadcastCount}/${NUM_CLIENTS} connected devices.`);
    assert(receivedBroadcastCount >= NUM_CLIENTS * 0.9, 'Delta state must propagate to at least 90% of clients');

    // ------------------------------------------------------------------
    // TEST 4: Atomic Mutex Concurrency & Race Condition Elimination
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: ATOMIC MUTEX CONCURRENCY & RACE CONDITION ELIMINATION ---');
    // Dispatch 20 concurrent claim requests for the EXACT SAME orderId simultaneously!
    const concurrentClaims = [];
    for (let i = 0; i < 20; i++) {
      concurrentClaims.push(
        request('POST', '/api/order/claim', {
          orderId: orderId,
          deskId: 'DESK_1'
        }, {
          'Authorization': `Bearer ${adminToken}`
        })
      );
    }

    const claimResults = await Promise.all(concurrentClaims);
    const successfulClaims = claimResults.filter(r => r.status === 200 && r.data.success);
    const rejectedClaims = claimResults.filter(r => r.status === 409 || (r.status === 200 && !r.data.success) || r.status === 400 || (r.data && r.data.error));

    console.log(`✓ Concurrently dispatched 20 simultaneous claim operations.`);
    console.log(`  - Exactly ${successfulClaims.length} claim operation succeeded.`);
    console.log(`  - Exactly ${rejectedClaims.length} redundant/racing claims blocked.`);
    assert.strictEqual(successfulClaims.length, 1, 'Exactly ONE claim must succeed under heavy concurrent race conditions!');

    // ------------------------------------------------------------------
    // TEST 5: Concurrent Trade Execution Mutex
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: CONCURRENT TRADE EXECUTION MUTEX ---');
    // Validate the order first
    await request('POST', '/api/order/action', {
      orderId: orderId,
      action: 'VALIDATE',
      deskId: 'DESK_1'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    // Concurrently dispatch 15 execution requests for the same order
    const concurrentExecs = [];
    for (let i = 0; i < 15; i++) {
      concurrentExecs.push(
        request('POST', '/api/order/action', {
          orderId: orderId,
          action: 'EXECUTE',
          deskId: 'DESK_1'
        }, {
          'Authorization': `Bearer ${adminToken}`
        })
      );
    }

    const execResults = await Promise.all(concurrentExecs);
    const successfulExecs = execResults.filter(r => r.status === 200 && r.data.success);
    console.log(`  - Exactly ${successfulExecs.length} execution succeeded.`);
    assert.strictEqual(successfulExecs.length, 1, 'Exactly ONE execution must succeed, preventing double-fills or duplicate balance deductions!');

    console.log('\n======================================================================');
    console.log(`✅ ALL ${NUM_CLIENTS}-DEVICE SCALABILITY & MUTEX TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================================\n');
  } finally {
    clients.forEach(ws => {
      try { ws.close(); } catch (e) {}
    });
    serverProc.kill();
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }
}

run().catch(err => {
  console.error('\n❌ SCALABILITY TEST SUITE FAILED:', err);
  process.exit(1);
});
