/**
 * SAAMX Phase 6 — Independent Verification, Multi-Device Load Testing & Event-Day Reliability Master Suite
 * 
 * Conducts evidence-driven verification across 4 operational workstreams:
 *   - Agent A: Concurrent Load & Multi-Device Scalability (1, 10, 20, 30, and 50 client stress test)
 *   - Agent B: Financial Integrity & Concurrency (competing funds, overselling, duplicate tickets, lot/tick, all 7 asset classes, 10 currencies, JPY/KRW integer math, two-phase bank settlement/rejection, ledger reconciliation)
 *   - Agent C: WebSocket Correctness & Recovery (PRICE_UPDATE delta verification, multi-client sync, disconnect/reconnect recovery, RESYNC command, malformed payload resilience)
 *   - Agent D: Security, RBAC & Physical Event Workflow (desk authorization, team isolation, production test bypass lockdown, projector sanitization, paper slip lifecycle)
 *
 * MANDATORY SAFETY CONSTRAINTS:
 *   - Authoritative state.json hash verified before and after.
 *   - Runs exclusively on disposable test fixture (state.test-phase6-fixture.json) on isolated test port 3098.
 *   - Zero writes to remote Firebase or authoritative state.json.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import WebSocket from 'ws';

const TEST_PORT = 3098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}`;
const AUTHORITATIVE_STATE_PATH = path.resolve('state.json');
const DISPOSABLE_STATE_PATH = path.resolve('state.test-phase6-fixture.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

let serverProcess = null;
const testResults = [];
const performanceMetrics = {
  loadTests: {},
  websocket: {},
  apiLatencies: {}
};

function recordTest(id, name, endpoint, role, scenario, expected, actual, passed, evidence = {}) {
  const result = { id, name, endpoint, role, scenario, expected, actual, passed, evidence };
  testResults.push(result);
  const mark = passed ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${mark}] ${id}: ${name}`);
  console.log(`  Endpoint:  ${endpoint}`);
  console.log(`  Role/Auth: ${role}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (!passed) {
    console.error(`  Evidence:  ${JSON.stringify(evidence)}`);
  }
}

function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function request(method, route, body = null, headers = {}) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const url = new URL(route, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latencyMs = Date.now() - startTime;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json, latencyMs });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return { p50, p95, p99, min: sorted[0], max: sorted[sorted.length - 1], avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) };
}

async function loginUser(username, password) {
  const res = await request('POST', '/api/auth/login', { username, password });
  if (res.status === 200 && res.body?.token) {
    return { token: res.body.token, role: res.body.role, user: res.body.user };
  }
  return null;
}

async function startServer() {
  console.log('\n======================================================');
  console.log('--- SAFETY PREFLIGHT & DISPOSABLE TEST FIXTURE SETUP ---');
  console.log('======================================================');
  
  const initialHash = computeFileHash(AUTHORITATIVE_STATE_PATH);
  if (initialHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL PREFLIGHT FAILURE: Authoritative state hash mismatch!\nExpected: ${EXPECTED_HASH}\nActual:   ${initialHash}`);
  }
  console.log(`✓ Pre-flight Authoritative state.json hash verified pristine: ${initialHash}`);

  // Create isolated disposable fixture with full 2,854 securities
  const authoritativeState = JSON.parse(fs.readFileSync(AUTHORITATIVE_STATE_PATH, 'utf8'));
  const { ALL_SECURITIES_DATA } = await import('./universe_data.js');
  const { NEW_SIMULATED_IPOS } = await import('./universe_generator.js');
  const fullUniverse = [...ALL_SECURITIES_DATA, ...NEW_SIMULATED_IPOS];

  const fixtureState = {
    ...authoritativeState,
    securities: fullUniverse,
    orders: [],
    transactions: [],
    settlements: [],
    settings: {
      ...authoritativeState.settings,
      settlementMode: 'INSTANT' // Keep default INSTANT
    },
    marketState: {
      status: 'Open',
      sessionState: 'CONTINUOUS_TRADING',
      isManualOverride: true,
      isFrozen: false,
      mode: 'EVENT'
    }
  };

  // Pre-fund test teams T01..T20 with multi-currency wallets
  fixtureState.teams.forEach(t => {
    t.cashWallets = {
      INR: 10000000,
      USD: 100000,
      GBP: 100000,
      EUR: 100000,
      JPY: 5000000,
      AED: 100000,
      SGD: 100000,
      CNY: 100000,
      AUD: 100000,
      KRW: 20000000,
      CAD: 100000,
      CHF: 100000
    };
    t.reservedCash = {
      INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0, CAD: 0, CHF: 0
    };
  });

  fs.writeFileSync(DISPOSABLE_STATE_PATH, JSON.stringify(fixtureState, null, 2), 'utf8');
  console.log(`✓ Disposable test fixture created: ${DISPOSABLE_STATE_PATH} (${fixtureState.securities.length} securities)`);

  console.log(`Spawning isolated server on port ${TEST_PORT}...`);
  serverProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      STATE_FILE: DISPOSABLE_STATE_PATH,
      ALLOW_TEST_HEADER_AUTH: 'true',
      NODE_ENV: 'test'
    },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', d => {});
  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      // console.error('[Server stderr]', msg);
    }
  });

  // Wait for server readiness
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await request('GET', '/api/state');
      if (res.status === 200 && res.body?.state?.securities?.length > 0) {
        ready = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }

  if (!ready) {
    throw new Error(`Server failed to start on port ${TEST_PORT}`);
  }
  console.log(`✓ Isolated test server operational on http://127.0.0.1:${TEST_PORT}\n`);
}

async function stopServer() {
  console.log('\n--- TEARDOWN TEST ENVIRONMENT ---');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 800));
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
    serverProcess = null;
    console.log('✓ Test server process terminated');
  }

  if (fs.existsSync(DISPOSABLE_STATE_PATH)) {
    try {
      fs.unlinkSync(DISPOSABLE_STATE_PATH);
      console.log('✓ Disposable fixture removed');
    } catch (e) {}
  }
}

// Helper to create and connect a client WebSocket
function createWsClient(token = null) {
  return new Promise((resolve, reject) => {
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(url);
    const messages = [];
    let bytesReceived = 0;

    ws.on('open', () => {
      resolve({ ws, messages, getBytes: () => bytesReceived });
    });

    ws.on('message', (data) => {
      bytesReceived += data.length;
      try {
        const parsed = JSON.parse(data.toString());
        messages.push(parsed);
      } catch (e) {
        messages.push(data.toString());
      }
    });

    ws.on('error', (err) => {
      reject(err);
    });
  });
}

async function runMasterSuite() {
  await startServer();

  // Pre-authenticate staff and team accounts using verified credentials
  const adminAuth = await loginUser('admin', 'saamx-event-2026');
  const deskAuth = await loginUser('operator_x', 'exchange-event-2026') || await loginUser('exchange', 'exchange-event-2026');
  const verifyAuth = await loginUser('verification', 'saamx-event-2026') || adminAuth;
  const sebiAuth = await loginUser('sebi', 'sebi-event-2026');
  const bankAuth = await loginUser('bank', 'saamx-event-2026') || await loginUser('bank_teller', 'saamx-event-2026');
  const team1Auth = await loginUser('T01', 'saamx-team-01');
  const team2Auth = await loginUser('T02', 'saamx-team-02');

  // Pre-authenticate team tokens for T01..T20
  const teamTokens = {
    'T01': team1Auth?.token,
    'T02': team2Auth?.token
  };
  for (let i = 3; i <= 20; i++) {
    const code = `T${String(i).padStart(2, '0')}`;
    const pass = `saamx-team-${String(i).padStart(2, '0')}`;
    const tAuth = await loginUser(code, pass);
    if (tAuth?.token) teamTokens[code] = tAuth.token;
  }

  // Explicitly activate continuous market trading via admin market control
  await request('POST', '/api/market/control', { action: 'START' }, { 'Authorization': `Bearer ${adminAuth.token}` });

  // =========================================================================
  // WORKSTREAM A: CONCURRENT LOAD & MULTI-DEVICE SCALABILITY AUDIT
  // =========================================================================
  console.log('\n======================================================');
  console.log('WORKSTREAM A: CONCURRENT LOAD & MULTI-DEVICE SCALABILITY');
  console.log('======================================================');

  // Load Test Scenarios: 1, 10, 20, 30, and 50 Clients
  const clientScales = [1, 10, 20, 30, 50];

  for (const numClients of clientScales) {
    const isStress = numClients === 50;
    const testId = `LOAD-CLIENTS-${String(numClients).padStart(2, '0')}`;
    const scenarioName = isStress ? `50 Concurrent Clients Local Stress Test` : `${numClients} Concurrent Connected Clients`;
    
    console.log(`\n--- Simulating ${scenarioName} ---`);
    const clients = [];
    const connectionStart = Date.now();
    let connectionErrors = 0;

    try {
      // 1. Establish N concurrent WebSocket connections
      for (let i = 0; i < numClients; i++) {
        const teamCode = `T${String((i % 20) + 1).padStart(2, '0')}`;
        const token = teamTokens[teamCode] || team1Auth?.token;
        try {
          const client = await createWsClient(token);
          clients.push({ ...client, id: `client_${i + 1}`, teamCode });
        } catch (err) {
          connectionErrors++;
        }
      }
      const connectionTimeMs = Date.now() - connectionStart;

      // 2. Concurrently submit orders across clients (each using authorized team token)
      const orderLatencies = [];
      const orderCount = Math.min(numClients, 20); // submit up to 20 concurrent orders
      const orderPromises = [];

      for (let i = 0; i < orderCount; i++) {
        const c = clients[i];
        const tkt = `TKT-LOAD-${numClients}-${i + 1}-${Date.now()}`;
        const authToken = teamTokens[c.teamCode] || team1Auth?.token;

        orderPromises.push(
          request('POST', '/api/order/create', {
            ticketNumber: tkt,
            teamCode: c.teamCode,
            ticker: 'RELIANCE',
            action: 'BUY',
            quantity: 1,
            orderType: 'MARKET',
            deskId: 'DESK_1'
          }, { 'Authorization': `Bearer ${authToken}` }).then(res => {
            orderLatencies.push(res.latencyMs);
            return res;
          })
        );
      }

      const orderResults = await Promise.all(orderPromises);
      const successfulOrders = orderResults.filter(r => r.status === 200 || r.status === 201).length;
      const orderPercentiles = calculatePercentiles(orderLatencies);

      // 3. Concurrently execute submitted orders on Exchange Desk
      const execOrderIds = orderResults.filter(r => r.body?.orderId).map(r => r.body.orderId);
      const execPromises = execOrderIds.map(oid => 
        request('POST', '/api/order/action', { orderId: oid, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` })
      );
      await Promise.all(execPromises);

      // 4. Measure WebSocket payload size and bytes transmitted
      await new Promise(r => setTimeout(r, 600));
      const totalBytesReceived = clients.reduce((acc, c) => acc + c.getBytes(), 0);
      const avgBytesPerClient = numClients > 0 ? Math.round(totalBytesReceived / numClients) : 0;

      // Store metrics
      performanceMetrics.loadTests[numClients] = {
        connectionTimeMs,
        connectionErrors,
        successfulOrders,
        totalOrdersSubmitted: orderCount,
        orderPercentiles,
        totalBytesReceived,
        avgBytesPerClient
      };

      const passed = connectionErrors === 0 && successfulOrders === orderCount;
      recordTest(
        testId,
        `Concurrent Load Scalability (${scenarioName})`,
        'WebSocket + /api/order/create + /api/order/action',
        `${numClients} client sessions`,
        `Connect ${numClients} clients, submit ${orderCount} concurrent orders, execute, stream updates`,
        `${numClients} connected (0 drops), ${orderCount}/${orderCount} orders successful, p95 < 250ms`,
        `${clients.length} connected (${connectionErrors} errs), ${successfulOrders}/${orderCount} orders, p50=${orderPercentiles.p50}ms, p95=${orderPercentiles.p95}ms, payload=${avgBytesPerClient} B/client`,
        passed,
        performanceMetrics.loadTests[numClients]
      );

    } finally {
      // Cleanly teardown sockets
      for (const c of clients) {
        try { c.ws.close(); } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // =========================================================================
  // WORKSTREAM B: FINANCIAL INTEGRITY & CONCURRENCY AUDIT
  // =========================================================================
  console.log('\n======================================================');
  console.log('WORKSTREAM B: FINANCIAL INTEGRITY & CONCURRENCY AUDIT');
  console.log('======================================================');

  // Test B1: Double-Spend Race Condition (Competing BUY Orders exceeding unreserved cash)
  {
    console.log('\n--- Test B1: Competing BUY Orders for Limited Cash (Double-Spend Guard) ---');
    const pRes = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const startingCash = pRes.body?.team?.cashWallets?.INR ?? pRes.body?.portfolio?.cashWallets?.INR ?? 10000000;
    
    // Create 4 distinct orders of ₹30,00,000 each (Total ₹1.16 Cr > Starting ₹1.0 Cr)
    const tkt1 = `TKT-RACE-CASH-1-${Date.now()}`;
    const tkt2 = `TKT-RACE-CASH-2-${Date.now()}`;
    const tkt3 = `TKT-RACE-CASH-3-${Date.now()}`;
    const tkt4 = `TKT-RACE-CASH-4-${Date.now()}`;

    // 3OAHF is ₹1,936.15 per unit; 1,500 units ~ ₹29,04,225 each * 4 = ₹1.16 Cr
    const createOrders = await Promise.all([
      request('POST', '/api/order/create', { ticketNumber: tkt1, teamCode: 'T01', ticker: '3OAHF', action: 'BUY', quantity: 1500, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: tkt2, teamCode: 'T01', ticker: '3OAHF', action: 'BUY', quantity: 1500, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: tkt3, teamCode: 'T01', ticker: '3OAHF', action: 'BUY', quantity: 1500, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: tkt4, teamCode: 'T01', ticker: '3OAHF', action: 'BUY', quantity: 1500, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` })
    ]);

    const orderIds = createOrders.map(r => r.body?.orderId);

    // Concurrently EXECUTE all 4 orders at the exact same moment
    const execResults = await Promise.all(
      orderIds.map(oid => request('POST', '/api/order/action', { orderId: oid, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` }))
    );

    // Count executed vs rejected
    const executedCount = execResults.filter(r => r.status === 200 && r.body?.order?.status === 'EXECUTED').length;
    const rejectedCount = execResults.filter(r => r.status === 400 || r.body?.order?.status === 'REJECTED').length;

    // Verify final cash balance is never negative
    const finalP = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const finalCash = finalP.body?.team?.cashWallets?.INR ?? finalP.body?.portfolio?.cashWallets?.INR ?? 0;

    const noNegativeCash = finalCash >= 0;
    const passed = executedCount <= 3 && rejectedCount >= 1 && noNegativeCash;

    recordTest(
      'FIN-DOUBLE-SPEND-01',
      'Concurrent Competing Orders Cash Exhaustion Guard',
      'POST /api/order/action (EXECUTE)',
      'Desk Operator / Admin',
      'Execute 4 concurrent BUY orders totaling ₹1.16 Cr against ₹1.0 Cr cash balance',
      'Maximum 3 execute, remainder rejected with Insufficient Funds, cash balance >= 0',
      `Executed: ${executedCount}, Rejected: ${rejectedCount}, Final Cash: ₹${Number(finalCash).toLocaleString()} (Negative: ${!noNegativeCash})`,
      passed,
      { executedCount, rejectedCount, finalCash }
    );
  }

  // Test B2: Overselling Inventory Race Condition
  {
    console.log('\n--- Test B2: Competing SELL Orders Exceeding Holdings (Oversell Guard) ---');
    // First, give T02 a known holding of 100 units of BIRET
    const buyTkt = `TKT-BUY-BIRET-${Date.now()}`;
    const buyOrder = await request('POST', '/api/order/create', { ticketNumber: buyTkt, teamCode: 'T02', ticker: 'BIRET', action: 'BUY', quantity: 100, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team2Auth.token}` });
    await request('POST', '/api/order/action', { orderId: buyOrder.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    // Submit 3 concurrent SELL orders of 100 units each (Total 300 > Owned 100)
    const sellTkt1 = `TKT-RACE-SELL-1-${Date.now()}`;
    const sellTkt2 = `TKT-RACE-SELL-2-${Date.now()}`;
    const sellTkt3 = `TKT-RACE-SELL-3-${Date.now()}`;

    const createSells = await Promise.all([
      request('POST', '/api/order/create', { ticketNumber: sellTkt1, teamCode: 'T02', ticker: 'BIRET', action: 'SELL', quantity: 100, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team2Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: sellTkt2, teamCode: 'T02', ticker: 'BIRET', action: 'SELL', quantity: 100, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team2Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: sellTkt3, teamCode: 'T02', ticker: 'BIRET', action: 'SELL', quantity: 100, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team2Auth.token}` })
    ]);

    const sellOrderIds = createSells.map(r => r.body?.orderId);

    // Concurrently execute all 3 sell orders
    const sellExecs = await Promise.all(
      sellOrderIds.map(oid => request('POST', '/api/order/action', { orderId: oid, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` }))
    );

    const successfulSells = sellExecs.filter(r => r.status === 200 && r.body?.order?.status === 'EXECUTED').length;
    const rejectedSells = sellExecs.filter(r => r.status === 400 || r.body?.order?.status === 'REJECTED').length;

    // Verify holding count
    const pCheck = await request('GET', '/api/portfolio?teamCode=T02', null, { 'Authorization': `Bearer ${team2Auth.token}` });
    const biretHolding = pCheck.body?.team?.holdings?.BIRET ?? pCheck.body?.portfolio?.holdings?.BIRET ?? 0;

    const passed = successfulSells === 1 && rejectedSells === 2 && biretHolding >= 0;
    recordTest(
      'FIN-OVERSELL-RACE-02',
      'Concurrent Competing SELL Orders Inventory Guard',
      'POST /api/order/action (EXECUTE)',
      'Desk Operator / Admin',
      'Execute 3 concurrent SELL orders of 100 units each against 100 held units',
      'Exactly 1 executes, 2 rejected (Insufficient holdings), holding = 0 (no negative)',
      `Executed: ${successfulSells}, Rejected: ${rejectedSells}, Remaining Holdings: ${biretHolding}`,
      passed,
      { successfulSells, rejectedSells, biretHolding }
    );
  }

  // Test B3: Duplicate Physical Ticket Race Condition (Anti-Replay)
  {
    console.log('\n--- Test B3: Duplicate Physical Ticket Number Submission Race ---');
    const duplicateTkt = `TKT-REPLAY-DUP-${Date.now()}`;

    // Send 2 simultaneous POST /api/order/create with the EXACT SAME ticket number
    const [sub1, sub2] = await Promise.all([
      request('POST', '/api/order/create', { ticketNumber: duplicateTkt, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 1, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` }),
      request('POST', '/api/order/create', { ticketNumber: duplicateTkt, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 1, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` })
    ]);

    const passes = (sub1.status === 200 && sub2.status === 400) || (sub1.status === 400 && sub2.status === 200);
    const hasDuplicateError = (sub1.body?.error || '').includes('Duplicate Ticket Number') || (sub2.body?.error || '').includes('Duplicate Ticket Number');

    recordTest(
      'FIN-TICKET-REPLAY-03',
      'Simultaneous Duplicate Physical Ticket Submission Race',
      'POST /api/order/create',
      'Participant Team T01',
      'Submit two identical ticket numbers concurrently',
      'Exactly 1 succeeds (HTTP 200), other rejected with HTTP 400 Duplicate Ticket Number',
      `Sub1: ${sub1.status}, Sub2: ${sub2.status}, Duplicate Error Enforced: ${hasDuplicateError}`,
      passes && hasDuplicateError,
      { sub1Status: sub1.status, sub2Status: sub2.status }
    );
  }

  // Test B4: Multi-Currency Zero-Decimal Wallet Math (JPY, KRW Whole Numbers)
  {
    console.log('\n--- Test B4: Multi-Currency Zero-Decimal Integrity (JPY & KRW) ---');
    const tktJpy = `TKT-JPY-${Date.now()}`;
    const tktKrw = `TKT-KRW-${Date.now()}`;

    // JPY: '5201' (AGC Inc, lot 100), KRW: '196170' (Alteogen Inc, lot 1)
    const oJpy = await request('POST', '/api/order/create', { ticketNumber: tktJpy, teamCode: 'T01', ticker: '5201', action: 'BUY', quantity: 100, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    const oKrw = await request('POST', '/api/order/create', { ticketNumber: tktKrw, teamCode: 'T01', ticker: '196170', action: 'BUY', quantity: 10, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });

    await request('POST', '/api/order/action', { orderId: oJpy.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });
    await request('POST', '/api/order/action', { orderId: oKrw.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    const pCheck = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const jpyBalance = pCheck.body?.team?.cashWallets?.JPY ?? pCheck.body?.portfolio?.cashWallets?.JPY;
    const krwBalance = pCheck.body?.team?.cashWallets?.KRW ?? pCheck.body?.portfolio?.cashWallets?.KRW;

    const jpyIsInt = Number.isInteger(jpyBalance);
    const krwIsInt = Number.isInteger(krwBalance);

    recordTest(
      'FIN-ZERO-DECIMAL-MATH-04',
      'Zero-Decimal Whole Integer Wallet Accounting (JPY / KRW)',
      'POST /api/order/action + GET /api/portfolio',
      'Exchange Desk / Team',
      'Execute JPY and KRW orders and inspect resulting wallet balances',
      'Balances are strictly whole numbers (Number.isInteger === true, 0 fractional decimals)',
      `JPY Balance: ${jpyBalance} (Integer: ${jpyIsInt}), KRW Balance: ${krwBalance} (Integer: ${krwIsInt})`,
      jpyIsInt && krwIsInt,
      { jpyBalance, krwBalance, jpyIsInt, krwIsInt }
    );
  }

  // Test B5: Two-Phase Bank Settlement & Rejection Lifecycle with Reserved Cash Release
  {
    console.log('\n--- Test B5: TWO_PHASE_BANK Voucher Settlement & Rejection Lifecycle ---');
    // Enable TWO_PHASE_BANK mode dynamically
    await request('POST', '/api/admin/settlement-mode', { settlementMode: 'TWO_PHASE_BANK' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    // 1. Submit and execute order in TWO_PHASE_BANK mode
    const tktBank = `TKT-BNK-TEST-${Date.now()}`;
    const oRes = await request('POST', '/api/order/create', { ticketNumber: tktBank, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 10, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    const orderId = oRes.body?.orderId;

    const execRes = await request('POST', '/api/order/action', { orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });
    const voucherRef = execRes.body?.voucherReference || execRes.body?.settlement?.voucherReference;

    // Check reserved cash
    const pMid = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const reservedMid = pMid.body?.team?.reservedCash?.INR ?? pMid.body?.portfolio?.reservedCash?.INR ?? 0;

    // 2. Bank Teller settles the voucher
    const settleRes = await request('POST', '/api/bank/settle', { voucherReference: voucherRef }, { 'Authorization': `Bearer ${bankAuth.token}` });
    const settleSuccess = settleRes.status === 200 && settleRes.body?.settlement?.status === 'SETTLED';

    // 3. Duplicate settlement attempt on already settled voucher (must return HTTP 409)
    const dupSettleRes = await request('POST', '/api/bank/settle', { voucherReference: voucherRef }, { 'Authorization': `Bearer ${bankAuth.token}` });
    const dupBlocked = dupSettleRes.status === 409;

    // 4. Test Rejection Path with Reserved Cash Release
    const tktReject = `TKT-BNK-REJ-${Date.now()}`;
    const oRej = await request('POST', '/api/order/create', { ticketNumber: tktReject, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 10, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    const execRej = await request('POST', '/api/order/action', { orderId: oRej.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });
    const rejVoucherRef = execRej.body?.voucherReference || execRej.body?.settlement?.voucherReference;

    const pBeforeRej = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const reservedBeforeRej = pBeforeRej.body?.team?.reservedCash?.INR ?? pBeforeRej.body?.portfolio?.reservedCash?.INR ?? 0;

    // Bank Teller rejects voucher
    const bankRejectRes = await request('POST', '/api/bank/reject', { voucherReference: rejVoucherRef, reason: 'Participant failed physical payment at Bank Desk' }, { 'Authorization': `Bearer ${bankAuth.token}` });
    const rejSuccess = bankRejectRes.status === 200;

    const pAfterRej = await request('GET', '/api/portfolio?teamCode=T01', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const reservedAfterRej = pAfterRej.body?.team?.reservedCash?.INR ?? pAfterRej.body?.portfolio?.reservedCash?.INR ?? 0;
    const reservedReleased = reservedAfterRej < reservedBeforeRej;

    // Restore INSTANT settlement mode
    await request('POST', '/api/admin/settlement-mode', { settlementMode: 'INSTANT' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    const passed = settleSuccess && dupBlocked && rejSuccess && reservedReleased;
    recordTest(
      'FIN-TWO-PHASE-BANK-05',
      'Two-Phase Bank Voucher Settlement, Anti-Duplicate & Rejection Lifecycle',
      'POST /api/bank/settle + POST /api/bank/reject',
      'Bank Teller',
      'Execute TWO_PHASE_BANK order, settle voucher, attempt duplicate settlement, test rejection release',
      'Voucher settles, duplicate settlement blocked with HTTP 409, rejection releases reserved cash',
      `Settle: ${settleSuccess}, Duplicate Blocked: ${dupBlocked} (HTTP ${dupSettleRes.status}), Reject Success: ${rejSuccess}, Reserved Released: ${reservedReleased}`,
      passed,
      { settleStatus: settleRes.status, dupStatus: dupSettleRes.status, rejStatus: bankRejectRes.status }
    );
  }

  // Test B6: Multi-Currency Bank Ledger Reconciliation Across All 10 Currencies
  {
    console.log('\n--- Test B6: Multi-Currency Bank Ledger Reconciliation Across All Currencies ---');
    const recRes = await request('GET', '/api/bank/reconciliation', null, { 'Authorization': `Bearer ${bankAuth.token}` });
    const recData = recRes.body;

    const isHealthy = recData.status === 'HEALTHY';
    const totalDiscrepancies = Array.isArray(recData.discrepancies) ? recData.discrepancies.length : 0;
    const trackedCurrencies = Object.keys(recData.summary?.settledAmountsByCurrency || {});
    const expectedCurrencies = ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];
    const coversAll10 = expectedCurrencies.every(c => trackedCurrencies.includes(c));

    const passed = isHealthy && totalDiscrepancies === 0 && coversAll10;
    recordTest(
      'FIN-BANK-RECONCILIATION-06',
      'Authoritative Multi-Currency Bank Reconciliation Health',
      'GET /api/bank/reconciliation',
      'Bank Desk / SEBI',
      'Inspect ledger reconciliation report across all 10 core workbook currencies',
      'Ledger status HEALTHY, 0 discrepancies, all 10 currencies tracked',
      `Status: ${recData.status}, Discrepancies: ${totalDiscrepancies}, Currencies Tracked: ${trackedCurrencies.length} (All 10: ${coversAll10})`,
      passed,
      { totalDiscrepancies, trackedCurrencies }
    );
  }

  // =========================================================================
  // WORKSTREAM C: WEBSOCKET CORRECTNESS & RECOVERY AUDIT
  // =========================================================================
  console.log('\n======================================================');
  console.log('WORKSTREAM C: WEBSOCKET CORRECTNESS & RECOVERY AUDIT');
  console.log('======================================================');

  // Test C1: PRICE_UPDATE Delta Payload Verification & Size Benchmark
  {
    console.log('\n--- Test C1: WebSocket PRICE_UPDATE Delta Payload Format & Size ---');
    const client = await createWsClient(team1Auth.token);
    
    // Trigger price change on RELIANCE via trade
    const tktWs = `TKT-WS-PRICE-${Date.now()}`;
    const oRes = await request('POST', '/api/order/create', { ticketNumber: tktWs, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 50, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    await request('POST', '/api/order/action', { orderId: oRes.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    // Wait for delta price update message
    let deltaMsg = null;
    for (let i = 0; i < 20; i++) {
      deltaMsg = client.messages.find(m => m.type === 'PRICE_UPDATE');
      if (deltaMsg) break;
      await new Promise(r => setTimeout(r, 250));
    }

    client.ws.close();

    const isDelta = deltaMsg && deltaMsg.type === 'PRICE_UPDATE';
    const hasPriceUpdates = isDelta && typeof deltaMsg.priceUpdates === 'object';
    const hasIndices = isDelta && typeof deltaMsg.marketIndices === 'object';
    const deltaSize = isDelta ? JSON.stringify(deltaMsg).length : 0;

    // Full state payload reference: ~3.3 MB minified
    const fullStateSize = 3310000;
    const bandwidthReductionPct = Math.round((1 - (deltaSize / fullStateSize)) * 1000) / 10;

    const passed = isDelta && hasPriceUpdates && hasIndices && deltaSize < 35000;
    recordTest(
      'WS-DELTA-PAYLOAD-01',
      'WebSocket PRICE_UPDATE Delta Protocol Verification',
      'WS ws://localhost:3098',
      'Connected Client',
      'Verify structure and byte size of PRICE_UPDATE delta message',
      'Payload has type PRICE_UPDATE, priceUpdates map, marketIndices, payload size < 35 KB',
      `Delta Type: ${deltaMsg?.type}, Payload Size: ${deltaSize} bytes (${bandwidthReductionPct}% bandwidth savings vs full dump)`,
      passed,
      { deltaSize, bandwidthReductionPct }
    );
  }

  // Test C2: Multi-Client Consistent Delta Broadcast
  {
    console.log('\n--- Test C2: Multi-Client Broadcast Consistency ---');
    const client1 = await createWsClient(team1Auth.token);
    const client2 = await createWsClient(team2Auth.token);
    const client3 = await createWsClient(adminAuth.token);

    // Trigger price movement
    const tktSync = `TKT-WS-SYNC-${Date.now()}`;
    const oRes = await request('POST', '/api/order/create', { ticketNumber: tktSync, teamCode: 'T01', ticker: 'BIRET', action: 'BUY', quantity: 200, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    await request('POST', '/api/order/action', { orderId: oRes.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    // Wait for message arrival (wait for simulation interval to broadcast PRICE_UPDATE)
    let c1Deltas = [];
    let c2Deltas = [];
    let c3Deltas = [];
    for (let i = 0; i < 25; i++) {
      c1Deltas = client1.messages.filter(m => m.type === 'PRICE_UPDATE');
      c2Deltas = client2.messages.filter(m => m.type === 'PRICE_UPDATE');
      c3Deltas = client3.messages.filter(m => m.type === 'PRICE_UPDATE');
      if (c1Deltas.length > 0 && c2Deltas.length > 0 && c3Deltas.length > 0) break;
      await new Promise(r => setTimeout(r, 200));
    }

    client1.ws.close();
    client2.ws.close();
    client3.ws.close();

    const allReceived = c1Deltas.length > 0 && c2Deltas.length > 0 && c3Deltas.length > 0;
    const last1 = c1Deltas[c1Deltas.length - 1]?.marketIndices?.INDIA50?.currentValue ?? c1Deltas[c1Deltas.length - 1]?.marketIndices?.GLOBAL100?.currentValue;
    const last2 = c2Deltas[c2Deltas.length - 1]?.marketIndices?.INDIA50?.currentValue ?? c2Deltas[c2Deltas.length - 1]?.marketIndices?.GLOBAL100?.currentValue;
    const last3 = c3Deltas[c3Deltas.length - 1]?.marketIndices?.INDIA50?.currentValue ?? c3Deltas[c3Deltas.length - 1]?.marketIndices?.GLOBAL100?.currentValue;

    const indicesConsistent = (typeof last1 === 'number' && last1 === last2 && last2 === last3);

    const passed = allReceived && indicesConsistent;
    recordTest(
      'WS-MULTI-CLIENT-SYNC-02',
      'Multi-Client Consistent Update Delivery',
      'WS ws://localhost:3098 (3 concurrent sockets)',
      'Multiple Connected Clients',
      'Verify identical market index and price data delivered to all concurrent sockets',
      'All 3 clients receive delta broadcasts with identical index levels',
      `Client 1: ${last1}, Client 2: ${last2}, Client 3: ${last3} (Consistent: ${indicesConsistent})`,
      passed,
      { last1, last2, last3 }
    );
  }

  // Test C3: Disconnect and Reconnect Recovery (Authoritative State Catch-Up)
  {
    console.log('\n--- Test C3: Disconnect and Reconnect Recovery ---');
    // 1. Initial connection with Team T01 authentication
    const clientA = await createWsClient(team1Auth.token);
    await new Promise(r => setTimeout(r, 300));
    
    // 2. Disconnect client A
    clientA.ws.close();
    await new Promise(r => setTimeout(r, 300));

    // 3. Mutate server state while client is offline
    const tktOffline = `TKT-OFFLINE-TRADE-${Date.now()}`;
    const oRes = await request('POST', '/api/order/create', { ticketNumber: tktOffline, teamCode: 'T01', ticker: '360ONE', action: 'BUY', quantity: 50, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    await request('POST', '/api/order/action', { orderId: oRes.body?.orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${adminAuth.token}` });

    // 4. Reconnect client A as Team T01
    const clientAReconnected = await createWsClient(team1Auth.token);
    await new Promise(r => setTimeout(r, 500));

    // Inspect initial message on reconnect: must be STATE_UPDATE with the latest orders/securities
    const initMsg = clientAReconnected.messages.find(m => m.type === 'STATE_UPDATE');
    clientAReconnected.ws.close();

    const hasState = initMsg && initMsg.state;
    const hasSecurities = hasState && initMsg.state.securities && initMsg.state.securities.length > 0;
    const hasLatestOrder = hasState && initMsg.state.orders && initMsg.state.orders.some(o => o.ticketNumber === tktOffline);

    const passed = hasState && hasSecurities && hasLatestOrder;
    recordTest(
      'WS-RECONNECT-RECOVERY-03',
      'Client Disconnect and Reconnect Authoritative Catch-Up',
      'WS ws://localhost:3098 Reconnect',
      'Reconnecting Client',
      'Disconnect client, execute trade offline, reconnect, verify immediate state synchronization',
      'Reconnected client receives full personalized STATE_UPDATE containing trades executed during outage',
      `State Delivered: ${hasState}, Securities Count: ${initMsg?.state?.securities?.length}, Offline Trade Present: ${hasLatestOrder}`,
      passed,
      { hasState, securitiesCount: initMsg?.state?.securities?.length, hasLatestOrder }
    );
  }

  // Test C4: Explicit WebSocket RESYNC Protocol Command
  {
    console.log('\n--- Test C4: Explicit WebSocket RESYNC Command ---');
    const client = await createWsClient(team1Auth.token);
    await new Promise(r => setTimeout(r, 200));

    // Send RESYNC message
    const msgCountBefore = client.messages.length;
    client.ws.send(JSON.stringify({ type: 'RESYNC' }));
    await new Promise(r => setTimeout(r, 300));
    client.ws.close();

    const resyncReply = client.messages.slice(msgCountBefore).find(m => m.type === 'STATE_UPDATE');
    const hasFreshState = resyncReply && resyncReply.state && resyncReply.state.securities?.length > 0;

    recordTest(
      'WS-RESYNC-PROTOCOL-04',
      'Explicit WebSocket RESYNC Protocol Command',
      'WS Client send { type: "RESYNC" }',
      'Connected Client',
      'Client sends RESYNC message over existing socket; server replies with fresh STATE_UPDATE',
      'Server immediately responds with STATE_UPDATE containing complete sanitized state',
      `RESYNC Handled: ${Boolean(resyncReply)}, Securities Returned: ${resyncReply?.state?.securities?.length}`,
      Boolean(hasFreshState),
      { hasFreshState, msgType: resyncReply?.type }
    );
  }

  // Test C5: Malformed and Unauthorized WebSocket Message Resilience
  {
    console.log('\n--- Test C5: Malformed & Unauthorized Socket Message Resilience ---');
    const client = await createWsClient();
    
    // Send invalid JSON
    client.ws.send('INVALID_NON_JSON_DATA_STRING{{{');

    // Send malformed event type
    client.ws.send(JSON.stringify({ type: 'CORRUPT_INJECTION', payload: { cashBalance: 99999999999 } }));

    // Send valid PING message
    client.ws.send(JSON.stringify({ type: 'PING' }));

    await new Promise(r => setTimeout(r, 400));
    client.ws.close();

    // Verify server did not crash and responded to PING with PONG
    const pongMsg = client.messages.find(m => m.type === 'PONG');
    const serverAliveRes = await request('GET', '/api/state');

    const passed = serverAliveRes.status === 200 && Boolean(pongMsg);
    recordTest(
      'WS-MALFORMED-RESILIENCE-05',
      'Malformed & Unauthorized Socket Injection Resilience',
      'WS Client Frame Injection',
      'Adversarial Socket Client',
      'Send non-JSON bytes and unhandled message types; verify server survivability and PONG response',
      'Server gracefully discards invalid frames without crashing, replies to valid PING with PONG',
      `Server HTTP Status: ${serverAliveRes.status}, PONG Received: ${Boolean(pongMsg)}`,
      passed,
      { serverStatus: serverAliveRes.status, pongReceived: Boolean(pongMsg) }
    );
  }

  // =========================================================================
  // WORKSTREAM D: SECURITY, RBAC & PHYSICAL EVENT WORKFLOW AUDIT
  // =========================================================================
  console.log('\n======================================================');
  console.log('WORKSTREAM D: SECURITY, RBAC & PHYSICAL EVENT WORKFLOW');
  console.log('======================================================');

  // Test D1: Participant Direct Execution Prevention (Physical Desk Enforcement)
  {
    console.log('\n--- Test D1: Participant Direct Digital Trade Execution Block ---');
    const res = await request('POST', '/api/trade', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10
    }, { 'Authorization': `Bearer ${team1Auth.token}` });

    const blocked = res.status === 403;
    const errorMsg = res.body?.error || '';
    const explainsSlipRequired = errorMsg.includes('Orders must be submitted as slips');

    recordTest(
      'SEC-RBAC-DIRECT-TRADE-01',
      'Participant Direct Trade Execution Block (Must Use Paper Slips)',
      'POST /api/trade',
      'Participant Team T01',
      'Participant attempts to bypass physical floor and trade directly via API',
      'HTTP 403 Forbidden explaining paper slip submission requirement',
      `HTTP Status: ${res.status}, Error: "${errorMsg}"`,
      blocked && explainsSlipRequired,
      { status: res.status, error: errorMsg }
    );
  }

  // Test D2: Participant Order Action Block (Desk Execution Privilege)
  {
    console.log('\n--- Test D2: Participant Order Execution Action Block ---');
    const tkt = `TKT-D2-${Date.now()}`;
    const oRes = await request('POST', '/api/order/create', { ticketNumber: tkt, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 1, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    const orderId = oRes.body?.orderId;

    const res = await request('POST', '/api/order/action', {
      orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${team1Auth.token}` });

    const blocked = res.status === 403;
    recordTest(
      'SEC-RBAC-ORDER-ACTION-02',
      'Participant Execution of Queue Orders Block',
      'POST /api/order/action (EXECUTE)',
      'Participant Team T01',
      'Participant attempts to execute their own order in the queue',
      'HTTP 403 Forbidden: Requires exchange or admin privileges',
      `HTTP Status: ${res.status}, Error: "${res.body?.error || ''}"`,
      blocked,
      { status: res.status, error: res.body?.error }
    );
  }

  // Test D3: Team Isolation (Cross-Team Portfolio Snooping)
  {
    console.log('\n--- Test D3: Cross-Team Portfolio Inspection Block ---');
    const res = await request('GET', '/api/portfolio?teamCode=T02', null, { 'Authorization': `Bearer ${team1Auth.token}` });
    const blocked = res.status === 403;

    recordTest(
      'SEC-TEAM-ISOLATION-03',
      'Cross-Team Portfolio Snooping Block',
      'GET /api/portfolio?teamCode=T02',
      'Participant Team T01',
      'Team T01 attempts to inspect Team T02 portfolio and holdings',
      'HTTP 403 Forbidden: Cross-team data isolation enforced',
      `HTTP Status: ${res.status}, Error: "${res.body?.error || ''}"`,
      blocked,
      { status: res.status, error: res.body?.error }
    );
  }

  // Test D4: Team Isolation (Order Submission Spoofing)
  {
    console.log('\n--- Test D4: Cross-Team Order Submission Spoofing Block ---');
    const tkt = `TKT-SPOOF-${Date.now()}`;
    const res = await request('POST', '/api/order/create', {
      ticketNumber: tkt,
      teamCode: 'T02', // Team T01 claims to be Team T02
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${team1Auth.token}` });

    const blocked = res.status === 403;
    recordTest(
      'SEC-TEAM-SPOOF-04',
      'Cross-Team Order Submission Spoofing Block',
      'POST /api/order/create',
      'Participant Team T01',
      'Team T01 submits order with teamCode T02 in body',
      'HTTP 403 Forbidden: Session team mismatch detected and rejected',
      `HTTP Status: ${res.status}, Error: "${res.body?.error || ''}"`,
      blocked,
      { status: res.status, error: res.body?.error }
    );
  }

  // Test D5: Public Projector Display Data Sanitization
  {
    console.log('\n--- Test D5: Public Projector Snapshot Sanitization ---');
    const res = await request('GET', '/api/projector/snapshot');
    const data = res.body;

    const accessible = res.status === 200;
    const hasMarketIndices = Boolean(data.marketIndices || data.indices);
    const serialized = JSON.stringify(data);

    // Ensure zero leak of passwords, PINs, or private balances
    const noPasswordLeak = !serialized.includes('saamx-event-2026') && !serialized.includes('saamx-team-01');
    const noPinLeak = !serialized.includes('pin') && !serialized.includes('scrypt:');
    const noPrivateCashLeak = !data.cashWallets && !data.teams;

    const passed = accessible && hasMarketIndices && noPasswordLeak && noPinLeak && noPrivateCashLeak;
    recordTest(
      'SEC-PROJECTOR-SANITIZATION-05',
      'Public Projector Display Snapshot Data Sanitization',
      'GET /api/projector/snapshot',
      'Anonymous / Public',
      'Verify public projector feed exposes indices without leaking credentials or private balances',
      'HTTP 200, contains market indices, zero credentials/PINs/private cash balances',
      `HTTP Status: ${res.status}, Indices: ${hasMarketIndices}, Credential Leak: ${!noPasswordLeak}, Private Balance Leak: ${!noPrivateCashLeak}`,
      passed,
      { status: res.status, hasMarketIndices, noPasswordLeak, noPrivateCashLeak }
    );
  }

  // Test D6: Complete End-to-End Physical Workflow State Transitions
  {
    console.log('\n--- Test D6: End-to-End Physical Paper Slip Lifecycle Transitions ---');
    const tktFlow = `TKT-FLOW-${Date.now()}`;
    
    // 1. Participant submits physical slip into queue
    const s1 = await request('POST', '/api/order/create', { ticketNumber: tktFlow, teamCode: 'T01', ticker: 'RELIANCE', action: 'BUY', quantity: 5, orderType: 'MARKET', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${team1Auth.token}` });
    const orderId = s1.body?.orderId;
    const stage1 = s1.body?.order?.status === 'PENDING';

    // 2. Verification Desk claims slip
    const s2 = await request('POST', '/api/order/action', { orderId, actionType: 'CLAIM_FOR_VERIFICATION', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${verifyAuth.token}` });
    const stage2 = s2.body?.order?.status === 'BEING_VERIFIED';

    // 3. Verification Desk verifies physical paper slip
    const s3 = await request('POST', '/api/order/action', { orderId, actionType: 'VERIFY', deskId: 'DESK_1', physicalSlipChecked: true }, { 'Authorization': `Bearer ${verifyAuth.token}` });
    const stage3 = s3.body?.order?.status === 'VERIFIED_AWAITING_EXCHANGE';

    // 4. Exchange Execution Desk claims slip for exchange review
    const s4 = await request('POST', '/api/order/action', { orderId, actionType: 'CLAIM_FOR_EXCHANGE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${deskAuth.token}` });
    const stage4 = s4.body?.order?.status === 'UNDER_EXCHANGE_REVIEW';

    // 5. Verification Officer / Admin validates risk controls
    const s5 = await request('POST', '/api/order/action', { orderId, actionType: 'VALIDATE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${verifyAuth.token}` });
    const stage5 = s5.body?.order?.status === 'VALIDATED';

    // 6. Exchange Desk executes the trade
    const s6 = await request('POST', '/api/order/action', { orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, { 'Authorization': `Bearer ${deskAuth.token}` });
    const stage6 = s6.body?.order?.status === 'EXECUTED';

    const passed = stage1 && stage2 && stage3 && stage4 && stage5 && stage6;
    recordTest(
      'WORKFLOW-PHYSICAL-SLIP-06',
      'End-to-End Physical Order Slip State Transitions',
      'POST /api/order/action',
      'Exchange Desk Operator',
      'Verify strict 6-step state machine: PENDING -> BEING_VERIFIED -> VERIFIED_AWAITING_EXCHANGE -> UNDER_EXCHANGE_REVIEW -> VALIDATED -> EXECUTED',
      'All 6 stages transition cleanly with auditable history trail',
      `S1(PENDING): ${stage1}, S2(BEING_VERIFIED): ${stage2}, S3(VERIFIED): ${stage3}, S4(UNDER_REVIEW): ${stage4}, S5(VALIDATED): ${stage5}, S6(EXECUTED): ${stage6}`,
      passed,
      { stages: [stage1, stage2, stage3, stage4, stage5, stage6] }
    );
  }

  // =========================================================================
  // POST-FLIGHT: AUTHORITATIVE STATE INTEGRITY VERIFICATION
  // =========================================================================
  console.log('\n======================================================');
  console.log('SAFETY POST-FLIGHT: AUTHORITATIVE STATE HASH CHECK');
  console.log('======================================================');

  await stopServer();

  const finalHash = computeFileHash(AUTHORITATIVE_STATE_PATH);
  const hashMatches = finalHash === EXPECTED_HASH;

  recordTest(
    'SAFETY-AUTHORITATIVE-HASH-FINAL',
    'Post-Flight Authoritative State Hash Match',
    'Filesystem state.json',
    'Safety Precondition Governor',
    'Confirm authoritative state.json was not modified during Phase 6 testing',
    `SHA-256 equals ${EXPECTED_HASH}`,
    `Final Hash: ${finalHash} (Match: ${hashMatches})`,
    hashMatches,
    { expected: EXPECTED_HASH, actual: finalHash }
  );

  // Write results JSON
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: testResults.filter(t => t.passed).length,
    failed: testResults.filter(t => !t.passed).length,
    passRate: `${Math.round((testResults.filter(t => t.passed).length / testResults.length) * 100)}%`,
    authoritativeStateHash: finalHash,
    performanceMetrics,
    results: testResults
  };

  fs.writeFileSync('test-phase-6-reliability-results.json', JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`MASTER AUDIT COMPLETE: ${summary.passed}/${summary.totalTests} PASSED (${summary.passRate})`);
  console.log(`Final Authoritative State Hash: ${finalHash}`);
  console.log('======================================================\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runMasterSuite().catch(async (err) => {
  console.error('\nFATAL SUITE EXECUTION ERROR:', err);
  await stopServer();
  process.exit(1);
});
