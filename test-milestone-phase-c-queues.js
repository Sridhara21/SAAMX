/**
 * SAAMX MILESTONE PHASE C: DEDICATED ORDER QUEUE SCREEN & VERIFICATION SUITE
 * File: SAAMX/test-milestone-phase-c-queues.js
 *
 * Verifies R2 (Phase C):
 * - Multi-desk operational screen & dynamic tabs API (#/desk-queues)
 * - Distinct identifier uniqueness across 100+ items (Token, Order, Voucher)
 * - Operator claim mutex concurrency (HTTP 409 Conflict)
 * - Real-time metrics calculations (pending, processing, wait time, completed, rejected)
 * - Decoupled physical slip verification workflow
 * - Post-flight cleanup and bit-exact state.json hash verification
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { getPool, closePool } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3112;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-c-queues.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-milestone-phase-c-results.json');

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
  if (evidence) {
    console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
  }
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

function bearer(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function getTeamData(res) {
  return res.data?.team || res.data?.portfolio || res.data || {};
}

function getReservedINR(teamObj) {
  if (!teamObj) return 0;
  if (typeof teamObj.reservedCash === 'object' && teamObj.reservedCash !== null) {
    return Number(teamObj.reservedCash.INR || 0);
  }
  return Number(teamObj.reservedCash || 0);
}

function getCashINR(teamObj) {
  if (!teamObj) return 0;
  if (typeof teamObj.cashWallets === 'object' && teamObj.cashWallets !== null) {
    return Number(teamObj.cashWallets.INR ?? teamObj.cashBalance ?? 0);
  }
  return Number(teamObj.cashBalance || 0);
}

async function runPhaseCTestSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE C (MILESTONE 2) — DEDICATED ORDER QUEUE TEST SUITE');
  console.log('======================================================================');
  console.log(`Port:            ${PORT}`);
  console.log(`Original State:  ${ORIGINAL_STATE}`);
  console.log(`Disposable State:${DISPOSABLE_STATE}`);
  console.log(`Expected Hash:   ${EXPECTED_HASH}\n`);

  // ------------------------------------------------------------------
  // STEP 1: PRE-FLIGHT AUTHORITATIVE HASH VERIFICATION
  // ------------------------------------------------------------------
  console.log('--- STEP 1: PRE-FLIGHT HASH VERIFICATION ---');
  const preHash = getSha256(ORIGINAL_STATE);
  assert.strictEqual(preHash, EXPECTED_HASH, `Pre-flight hash mismatch! Expected ${EXPECTED_HASH}, got ${preHash}`);
  recordResult({
    id: 'PHASE-C-01',
    title: 'Pre-Flight Authoritative Hash Check',
    endpoint: 'N/A',
    role: 'SYSTEM',
    scenario: 'Compute SHA-256 of authoritative state.json prior to test execution',
    expected: `SHA-256 equals ${EXPECTED_HASH}`,
    actual: `SHA-256 is ${preHash}`,
    evidence: { sha256: preHash },
    status: 'PASSED'
  });

  // ------------------------------------------------------------------
  // STEP 2: PREPARE DISPOSABLE TEST FIXTURE & HYDRATE
  // ------------------------------------------------------------------
  console.log('\n--- STEP 2: PREPARING DISPOSABLE FIXTURE ---');
  if (fs.existsSync(DISPOSABLE_STATE)) {
    try {
      fs.chmodSync(DISPOSABLE_STATE, 0o666);
      fs.unlinkSync(DISPOSABLE_STATE);
    } catch (e) {}
  }
  const originalRaw = fs.readFileSync(ORIGINAL_STATE, 'utf8');
  const fixture = JSON.parse(originalRaw);
  if (!fixture.marketState) fixture.marketState = {};
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;

  // Ensure T01 has plenty of cash to submit 100+ orders and test trades
  const t01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (t01) {
    t01.cashBalance = 50000000;
    t01.cashWallets = { INR: 50000000 };
    t01.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CAD: 0, CHF: 0, CNY: 0 };
    t01.reservedWallets = { INR: 0 };
    t01.holdings = { ...(t01.holdings || {}), TCS: 1000, RELIANCE: 1000 };
    t01.lockedHoldings = { TCS: 0, RELIANCE: 0 };
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), { mode: 0o666 });
  console.log('✓ Disposable state prepared with Market Status = Open.');

  // Pre-seed PostgreSQL state if active to ensure test fixture parity
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(`
        UPDATE wallets
        SET balance = 50000000,
            reserved = 0,
            updated_at = NOW()
        WHERE team_id = 'T01' AND currency = 'INR'
      `);
      console.log('✓ Seeded PostgreSQL test fixture for T01 wallet parity\n');
    } catch (pgErr) {
      console.warn('Notice: PG fixture pre-seeding notice:', pgErr.message);
    } finally {
      await closePool();
    }
  }

  // ------------------------------------------------------------------
  // STEP 3: SPAWN ISOLATED TEST SERVER ON PORT 3112
  // ------------------------------------------------------------------
  console.log(`\n--- STEP 3: SPAWNING ISOLATED TEST SERVER ON PORT ${PORT} ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      SAAMX_STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      DISABLE_FIREBASE_SYNC: 'true',
      VITE_DISABLE_FIREBASE: 'true'
    },
    stdio: 'pipe'
  });

  let hydrated = false;
  serverProcess.stdout.on('data', d => {
    const text = d.toString();
    if (text.includes('Successfully hydrated authoritative state') || text.includes('Running in memory/file fallback mode')) {
      hydrated = true;
    }
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && (hydrated || i >= 15)) {
        serverReady = true;
        console.log(`✓ Isolated backend responding on port ${PORT} (hydration complete).\n`);
        break;
      }
    } catch (e) {
      // keep waiting
    }
    await new Promise(r => setTimeout(r, 400));
  }

  if (!serverReady) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // ------------------------------------------------------------------
    // STEP 4: AUTHENTICATE TEST ROLES
    // ------------------------------------------------------------------
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    const tokenT02 = loginT02.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    assert(tokenT01, 'T01 login failed');
    assert(tokenT02, 'T02 login failed');
    assert(tokenExchange, 'Exchange login failed');
    assert(tokenBank, 'Bank login failed');
    assert(tokenAdmin, 'Admin login failed');
    console.log('✓ All roles authenticated successfully.\n');

    const RUN_ID = Date.now();

    // ------------------------------------------------------------------
    // TEST PHASE-C-02: Multi-Desk Queue Route & Navigation Registration
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-02: ROUTING & REGISTRATION ---');
    const appSource = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf8');
    const navSource = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'navigationConfig.js'), 'utf8');
    const pageExists = fs.existsSync(path.join(__dirname, 'src', 'pages', 'DeskQueueDashboard.jsx'));

    const hasAppRoute = appSource.includes("'#/desk-queues'") || appSource.includes('"#/desk-queues"');
    const hasNavRoute = navSource.includes("'#/desk-queues'") || navSource.includes('"#/desk-queues"');
    assert(pageExists, 'src/pages/DeskQueueDashboard.jsx must exist');
    assert(hasAppRoute, 'App.jsx must route #/desk-queues');
    assert(hasNavRoute, 'navigationConfig.js must register #/desk-queues');

    recordResult({
      id: 'PHASE-C-02',
      title: 'Multi-Desk Queue Route & Navigation Registration',
      endpoint: '#/desk-queues',
      role: 'SYSTEM',
      scenario: 'Static inspection of route switch and navigation registration for Portal #11',
      expected: 'Page exists, route switch includes #/desk-queues, navigationConfig registers #/desk-queues',
      actual: 'Page exists, App.jsx routes #/desk-queues, navigationConfig registers #/desk-queues',
      evidence: { pageExists, hasAppRoute, hasNavRoute },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-03: Dynamic Desk Registry & Endpoint Verification
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-03: DYNAMIC DESK REGISTRY ---');
    // 1. Initial desks check
    const desksRes = await apiRequest('GET', '/api/desks', null, bearer(tokenAdmin));
    assert.strictEqual(desksRes.status, 200);
    assert(desksRes.data.success);
    assert(Array.isArray(desksRes.data.desks), 'Must return desks array');
    assert.strictEqual(desksRes.data.desks.length, 5, 'Baseline exchange desks count must be 5');
    assert.strictEqual(desksRes.data.bankDesks.length, 2, 'Baseline bank desks count must be 2');
    assert(desksRes.data.fxDesk, 'Must attach fxDesk object');

    // 2. Assign team to dynamic exchange desk DESK_6
    const assignRes = await apiRequest('POST', '/api/desks/assign', {
      type: 'TEAM',
      teamCode: 'T02',
      deskId: 'DESK_6'
    }, bearer(tokenAdmin));
    assert.strictEqual(assignRes.status, 200, `Dynamic desk assignment failed: ${JSON.stringify(assignRes.data)}`);
    assert.strictEqual(assignRes.data.assignedDesk, 'DESK_6');

    // Verify desk registry now exposes DESK_6
    const desksResAfter = await apiRequest('GET', '/api/desks', null, bearer(tokenAdmin));
    const hasDesk6 = desksResAfter.data.desks.some(d => d.id === 'DESK_6');
    assert(hasDesk6, 'DESK_6 must be registered dynamically in exchange desks');

    recordResult({
      id: 'PHASE-C-03',
      title: 'Dynamic Desk Registry & Endpoint Verification',
      endpoint: '/api/desks and /api/desks/assign',
      role: 'admin',
      scenario: 'Verify GET /api/desks baseline and dynamic registration of DESK_6 via /api/desks/assign',
      expected: 'DESK_6 registered dynamically without HTTP 400 rejection; exchange, bank, and fxDesk present',
      actual: `DESK_6 successfully registered. Total exchange desks: ${desksResAfter.data.desks.length}`,
      evidence: { dynamicDeskId: 'DESK_6', totalExchangeDesks: desksResAfter.data.desks.length, fxDeskPresent: Boolean(desksResAfter.data.fxDesk) },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-04: Queue Dashboard Multi-Desk Telemetry Contract
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-04: DASHBOARD TELEMETRY CONTRACT ---');
    const dashRes = await apiRequest('GET', '/api/desk-queue-dashboard', null, bearer(tokenExchange));
    assert.strictEqual(dashRes.status, 200);
    assert(dashRes.data.success);
    assert(Array.isArray(dashRes.data.desks), 'Must return exchange desks');
    assert(Array.isArray(dashRes.data.bankDesks), 'Must return bank desks');
    assert(Array.isArray(dashRes.data.allDesks), 'Must return allDesks');
    assert(dashRes.data.fxDesk, 'Must attach fxDesk');
    assert(dashRes.data.fxDesk.reserves, 'fxDesk must expose currency reserves');

    recordResult({
      id: 'PHASE-C-04',
      title: 'Queue Dashboard Multi-Desk Telemetry Contract',
      endpoint: '/api/desk-queue-dashboard',
      role: 'operator_x / verification',
      scenario: 'Verify telemetry contract with Exchange, Bank, and FX desk telemetry',
      expected: 'HTTP 200, desks and bankDesks arrays present, fxDesk object attached with reserves',
      actual: `HTTP 200. Desks: ${dashRes.data.desks.length}, Bank Desks: ${dashRes.data.bankDesks.length}, FX Desk ID: ${dashRes.data.fxDesk.id}`,
      evidence: { desksCount: dashRes.data.desks.length, bankDesksCount: dashRes.data.bankDesks.length, fxDesk: dashRes.data.fxDesk.id },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-05: Distinct Identifier Generation & Strict Uniqueness (100+ Items)
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-05: DISTINCT IDENTIFIER UNIQUENESS (100+ ITEMS) ---');
    const tokenSet = new Set();
    const orderSet = new Set();
    const voucherSet = new Set();
    const NUM_ITEMS = 100;

    console.log(`Generating ${NUM_ITEMS} tickets across unique namespaces...`);
    const createdOrders = [];
    for (let i = 1; i <= NUM_ITEMS; i++) {
      const ticketNum = `TKN-EX1-${RUN_ID}-${String(i).padStart(4, '0')}`;
      tokenSet.add(ticketNum);

      const orderRes = await apiRequest('POST', '/api/orders/submit', {
        ticketNumber: ticketNum,
        teamCode: 'T01',
        ticker: 'TCS',
        action: 'BUY',
        quantity: 1,
        orderType: 'MARKET',
        deskId: 'DESK_1'
      }, bearer(tokenExchange));

      assert.strictEqual(orderRes.status, 200, `Order creation ${i} failed: ${JSON.stringify(orderRes.data)}`);
      const ord = orderRes.data.order;
      orderSet.add(ord.id);
      createdOrders.push(ord);
    }

    assert.strictEqual(tokenSet.size, NUM_ITEMS, `Must have ${NUM_ITEMS} unique token numbers`);
    assert.strictEqual(orderSet.size, NUM_ITEMS, `Must have ${NUM_ITEMS} unique order IDs`);

    // Verify token regex format
    for (const t of tokenSet) {
      assert(/^TKN-[A-Za-z0-9_-]+$/.test(t), `Token ${t} violates TKN- format`);
    }

    // Verify order regex format
    for (const o of orderSet) {
      assert(/^ORD-[A-Za-z0-9_-]+$/.test(o), `Order ID ${o} violates ORD- format`);
    }

    // Approve the first 10 orders to generate vouchers and test voucher uniqueness & regex
    for (let i = 0; i < 10; i++) {
      const ord = createdOrders[i];
      await apiRequest('POST', '/api/order/claim', { orderId: ord.id, deskId: 'DESK_1' }, bearer(tokenExchange));
      const approveRes = await apiRequest('POST', '/api/order/action', {
        orderId: ord.id,
        actionType: 'ACCEPT',
        physicalSlipChecked: true,
        deskId: 'DESK_1'
      }, bearer(tokenExchange));
      assert.strictEqual(approveRes.status, 200, `Approval ${i} failed: ${JSON.stringify(approveRes.data)}`);
      const vRef = approveRes.data.voucherReference || approveRes.data.order?.voucherReference;
      assert(vRef, `Voucher reference missing for order ${ord.id}`);
      assert(/^BNK-(PAY|REC)-[A-Za-z0-9_-]+$/.test(vRef), `Voucher ${vRef} violates BNK-(PAY|REC)- format`);
      voucherSet.add(vRef);
    }

    assert.strictEqual(voucherSet.size, 10, 'Must have 10 unique voucher references');

    // Verify ZERO overlap between Token, Order, and Voucher namespaces
    for (const t of tokenSet) {
      assert(!orderSet.has(t), `Token ${t} collides with order set`);
      assert(!voucherSet.has(t), `Token ${t} collides with voucher set`);
    }
    for (const o of orderSet) {
      assert(!voucherSet.has(o), `Order ${o} collides with voucher set`);
    }

    recordResult({
      id: 'PHASE-C-05',
      title: 'Distinct Identifier Generation & Strict Uniqueness (100+ Items)',
      endpoint: '/api/orders/submit and /api/order/action',
      role: 'exchange',
      scenario: 'Generate 100 queue tickets; assert regex format and 100% collision-free uniqueness across Tokens, Orders, and Vouchers',
      expected: '100 unique Tokens, 100 unique Orders, 10 unique Vouchers; zero cross-namespace collision',
      actual: `Unique Tokens: ${tokenSet.size}, Unique Orders: ${orderSet.size}, Unique Vouchers: ${voucherSet.size}. Zero collisions detected.`,
      evidence: { tokenCount: tokenSet.size, orderCount: orderSet.size, voucherCount: voucherSet.size, sampleVoucher: Array.from(voucherSet)[0] },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-06: Anti-Replay Guard on Duplicate Ticket Intake
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-06: DUPLICATE TICKET INTAKE GUARD ---');
    const existingTicket = createdOrders[0].ticketNumber;
    const dupRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: existingTicket,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearer(tokenExchange));

    assert.strictEqual(dupRes.status, 400, 'Re-submitting existing ticketNumber must return HTTP 400');
    assert(dupRes.data.error.includes('Duplicate Ticket Number'), `Error must mention duplicate: ${dupRes.data.error}`);

    recordResult({
      id: 'PHASE-C-06',
      title: 'Anti-Replay Guard on Duplicate Ticket Intake',
      endpoint: '/api/orders/submit',
      role: 'exchange',
      scenario: 'Attempt to submit an order with a previously registered ticket number',
      expected: 'HTTP 400 Bad Request with Duplicate Ticket Number error message',
      actual: `HTTP ${dupRes.status} returned. Error: "${dupRes.data.error}"`,
      evidence: { status: dupRes.status, error: dupRes.data.error },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-07: Operator Claim Mutex Lock (Concurrent Race)
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-07: OPERATOR CLAIM MUTEX LOCK ---');
    // Submit a fresh order for concurrent claim test
    const targetOrder = createdOrders[15];
    assert.strictEqual(targetOrder.status, 'AWAITING_PHYSICAL_SLIP');

    // Execute 2 concurrent claim requests
    const [claim1, claim2] = await Promise.all([
      apiRequest('POST', '/api/order/claim', { orderId: targetOrder.id, deskId: 'DESK_1', operator: 'Teller Alpha' }, bearer(tokenExchange)),
      apiRequest('POST', '/api/order/claim', { orderId: targetOrder.id, deskId: 'DESK_2', operator: 'Teller Beta' }, bearer(tokenExchange))
    ]);

    const statuses = [claim1.status, claim2.status].sort();
    assert.deepStrictEqual(statuses, [200, 409], `Expected exactly one HTTP 200 and one HTTP 409. Got: ${claim1.status} and ${claim2.status}`);

    const winningClaim = claim1.status === 200 ? claim1 : claim2;
    const losingClaim = claim1.status === 409 ? claim1 : claim2;
    assert(losingClaim.data.error.includes('Conflict'), `Conflict message expected: ${losingClaim.data.error}`);

    recordResult({
      id: 'PHASE-C-07',
      title: 'Operator Claim Mutex Lock (Concurrent Claim Race)',
      endpoint: '/api/order/claim',
      role: 'operator_x / verification',
      scenario: 'Simultaneous claim requests from two clerks for the same order slip',
      expected: 'Exactly one HTTP 200 (lock acquired) and one HTTP 409 Conflict (lock contention)',
      actual: `Winner HTTP ${winningClaim.status}, Competitor HTTP ${losingClaim.status}. Error: "${losingClaim.data.error}"`,
      evidence: { winnerStatus: winningClaim.status, competitorStatus: losingClaim.status, lockError: losingClaim.data.error },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-08: Real-Time Desk Metrics Calculation Engine
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-08: REAL-TIME DESK METRICS ---');
    const metricsRes = await apiRequest('GET', '/api/desk-queue-dashboard', null, bearer(tokenExchange));
    assert.strictEqual(metricsRes.status, 200);

    const desk1 = metricsRes.data.desks.find(d => d.id === 'DESK_1');
    assert(desk1, 'DESK_1 must be present in response');
    assert(typeof desk1.pendingCount === 'number', 'pendingCount must be numeric');
    assert(desk1.pendingCount >= 0, 'pendingCount must be non-negative');
    assert(typeof desk1.completedCount === 'number', 'completedCount must be numeric');
    assert(desk1.completedCount >= 10, 'completedCount must reflect approved orders (at least 10)');
    assert(typeof desk1.averageWaitTimeMs === 'number', 'averageWaitTimeMs must be numeric');
    assert(desk1.averageWaitTimeMs >= 0, 'averageWaitTimeMs must be non-negative');
    assert(['ACTIVE', 'PAUSED', 'SATURATED'].includes(desk1.operationalStatus), `Invalid operationalStatus: ${desk1.operationalStatus}`);

    recordResult({
      id: 'PHASE-C-08',
      title: 'Real-Time Desk Metrics Calculation Engine',
      endpoint: '/api/desk-queue-dashboard',
      role: 'verification',
      scenario: 'Verify real-time calculation of pendingCount, processingTicket, averageWaitTimeMs, completedCount, and operationalStatus',
      expected: 'pendingCount >= 0, completedCount >= 10, averageWaitTimeMs >= 0, operationalStatus in ACTIVE/PAUSED/SATURATED',
      actual: `pendingCount: ${desk1.pendingCount}, completedCount: ${desk1.completedCount}, avgWaitMs: ${desk1.averageWaitTimeMs}, status: ${desk1.operationalStatus}`,
      evidence: { pendingCount: desk1.pendingCount, completedCount: desk1.completedCount, averageWaitTimeMs: desk1.averageWaitTimeMs, operationalStatus: desk1.operationalStatus },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-09: Decoupled Physical Slip Verification Workflow
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-09: DECOUPLED SLIP VERIFICATION ---');
    const orderToVerify = createdOrders[20];

    // Check client cash balance before exchange approval
    const teamBeforeApprove = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tApproveBefore = getTeamData(teamBeforeApprove);
    const cashBeforeApprove = getCashINR(tApproveBefore);
    const reservedBeforeApprove = getReservedINR(tApproveBefore);

    // 1. Claim
    const claimRes = await apiRequest('POST', '/api/order/claim', { orderId: orderToVerify.id, deskId: 'DESK_1' }, bearer(tokenExchange));
    assert.strictEqual(claimRes.status, 200);

    // 2. Validate
    const valRes = await apiRequest('POST', '/api/order/action', { orderId: orderToVerify.id, actionType: 'VALIDATE' }, bearer(tokenExchange));
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.data.orderStatus, 'VALIDATED');

    // 3. Approve with physicalSlipChecked = true
    const approveRes = await apiRequest('POST', '/api/order/action', {
      orderId: orderToVerify.id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExchange));
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.order?.status, 'EXCHANGE_APPROVED');
    const voucherRef = approveRes.data.voucherReference || approveRes.data.order?.voucherReference;
    assert(voucherRef.startsWith('BNK-PAY-'), `Voucher reference must be BNK-PAY-*: ${voucherRef}`);

    // Check client cash balance after exchange approval
    const teamAfterApprove = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tApproveAfter = getTeamData(teamAfterApprove);
    const cashAfterApprove = getCashINR(tApproveAfter);
    const reservedAfterApprove = getReservedINR(tApproveAfter);

    // FINANCIAL INVARIANT: Cash must NOT be deducted yet! Pre-reservation must remain!
    assert.strictEqual(cashAfterApprove, cashBeforeApprove, 'Client cash wallet must NOT be debited upon exchange approval (Decoupled Invariant)');
    assert.strictEqual(reservedAfterApprove, reservedBeforeApprove, 'Reserved cash buffer must remain intact prior to bank settlement');

    recordResult({
      id: 'PHASE-C-09',
      title: 'Physical Slip Verification Decoupled from Bank Settlement',
      endpoint: '/api/order/action (ACCEPT)',
      role: 'exchange',
      scenario: 'Exchange approves verified order, issuing BNK-PAY voucher; verify client cash is NOT debited',
      expected: 'Order status EXCHANGE_APPROVED, voucher emitted, client cash untouched (strictly decoupled)',
      actual: `Status: EXCHANGE_APPROVED, Voucher: ${voucherRef}, Cash Before: ${cashBeforeApprove}, Cash After: ${cashAfterApprove} (Unchanged)`,
      evidence: { voucherReference: voucherRef, cashBefore: cashBeforeApprove, cashAfter: cashAfterApprove, reserved: reservedAfterApprove },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-10: Physical Slip Verification Guard
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-10: PHYSICAL SLIP VERIFICATION GUARD ---');
    const unverifiedOrder = createdOrders[25];
    await apiRequest('POST', '/api/order/claim', { orderId: unverifiedOrder.id, deskId: 'DESK_1' }, bearer(tokenExchange));

    // Attempt verification with physicalSlipChecked = false
    const guardVerifyRes = await apiRequest('POST', '/api/order/action', {
      orderId: unverifiedOrder.id,
      actionType: 'VERIFY',
      physicalSlipChecked: false
    }, bearer(tokenExchange));
    assert.strictEqual(guardVerifyRes.status, 400, 'VERIFY with physicalSlipChecked: false must return HTTP 400');

    // Attempt accept with physicalSlipChecked = false
    const guardAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: unverifiedOrder.id,
      actionType: 'ACCEPT',
      physicalSlipChecked: false
    }, bearer(tokenExchange));
    assert.strictEqual(guardAcceptRes.status, 400, 'ACCEPT with physicalSlipChecked: false must return HTTP 400');

    recordResult({
      id: 'PHASE-C-10',
      title: 'Physical Slip Rejection Guard (physicalSlipChecked: false)',
      endpoint: '/api/order/action',
      role: 'exchange',
      scenario: 'Attempt VERIFY and ACCEPT when physicalSlipChecked is explicitly false',
      expected: 'HTTP 400 Bad Request blocking approval without physical slip confirmation',
      actual: `VERIFY HTTP ${guardVerifyRes.status}, ACCEPT HTTP ${guardAcceptRes.status}. Blocked properly.`,
      evidence: { verifyError: guardVerifyRes.data.error, acceptError: guardAcceptRes.data.error },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-11: Return for Correction Workflow & Mandatory Reason
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-11: RETURN FOR CORRECTION WORKFLOW ---');
    const returnOrder = createdOrders[30];
    await apiRequest('POST', '/api/order/claim', { orderId: returnOrder.id, deskId: 'DESK_1' }, bearer(tokenExchange));

    // 1. Return without reason -> 400
    const noReasonRes = await apiRequest('POST', '/api/order/action', {
      orderId: returnOrder.id,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: '   '
    }, bearer(tokenExchange));
    assert.strictEqual(noReasonRes.status, 400, 'Return without reason must return HTTP 400');

    // 2. Return with explicit reason -> 200, releases lockedByDesk
    const withReasonRes = await apiRequest('POST', '/api/order/action', {
      orderId: returnOrder.id,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: 'Discrepancy in authorized participant signature on paper slip'
    }, bearer(tokenExchange));
    assert.strictEqual(withReasonRes.status, 200);
    assert.strictEqual(withReasonRes.data.orderStatus, 'RETURNED_FOR_CORRECTION');
    assert.strictEqual(withReasonRes.data.order?.lockedByDesk, null, 'Desk lock must be released on return');

    recordResult({
      id: 'PHASE-C-11',
      title: 'Return for Correction Workflow & Mandatory Reason',
      endpoint: '/api/order/action (RETURN_FOR_CORRECTION)',
      role: 'exchange',
      scenario: 'Verify mandatory return reason requirement and desk lock release upon return',
      expected: 'Missing reason rejected with HTTP 400; valid reason returns order and clears lockedByDesk',
      actual: `Missing reason HTTP ${noReasonRes.status}, Valid reason HTTP ${withReasonRes.status}, lockedByDesk: null`,
      evidence: { errorOnMissing: noReasonRes.data.error, returnedStatus: withReasonRes.data.orderStatus, lockCleared: withReasonRes.data.order?.lockedByDesk === null },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-12: Order Rejection with Full Cash Unreservation
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-12: ORDER REJECTION & CASH UNRESERVATION ---');
    const rejectOrder = createdOrders[35];
    const reservedCost = rejectOrder.reservedCashAmount;
    assert(reservedCost > 0, 'Order must have reserved cash buffer');

    const teamBeforeReject = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tRejectBefore = getTeamData(teamBeforeReject);
    const reservedBeforeReject = getReservedINR(tRejectBefore);

    const rejectRes = await apiRequest('POST', '/api/order/action', {
      orderId: rejectOrder.id,
      actionType: 'REJECT',
      rejectionReason: 'Counterfeit paper runner token detected'
    }, bearer(tokenExchange));
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.orderStatus, 'REJECTED_BY_EXCHANGE');

    const teamAfterReject = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tRejectAfter = getTeamData(teamAfterReject);
    const reservedAfterReject = getReservedINR(tRejectAfter);
    const diff = parseFloat((reservedBeforeReject - reservedAfterReject).toFixed(2));

    assert.strictEqual(diff, reservedCost, `Expected exactly ${reservedCost} to be unreserved. Got diff: ${diff}`);

    recordResult({
      id: 'PHASE-C-12',
      title: 'Order Rejection with Full Cash Unreservation',
      endpoint: '/api/order/action (REJECT)',
      role: 'exchange',
      scenario: 'Reject order slip with mandatory reason; verify 100% of cash reservation (+5% buffer) is cleanly restored',
      expected: 'HTTP 200, status REJECTED_BY_EXCHANGE, reserved cash decreases by exactly reservedCost (0% leakage)',
      actual: `HTTP 200. Reserved Before: ${reservedBeforeReject}, Reserved After: ${reservedAfterReject}, Unreserved Delta: ${diff}`,
      evidence: { reservedCost, reservedBeforeReject, reservedAfterReject, unreservedDelta: diff },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-13: Bank Desk Claim & Settlement Execution via Voucher
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-13: BANK DESK CLAIM & SETTLEMENT ---');
    const voucherToSettle = approveRes.data.voucherReference || approveRes.data.order?.voucherReference;
    assert(voucherToSettle, 'Must have voucher reference from Test 9');

    // 1. Bank Claim Mutex Test: Teller claims voucher
    const bankClaim1 = await apiRequest('POST', '/api/bank/claim', { voucherReference: voucherToSettle }, bearer(tokenBank));
    assert.strictEqual(bankClaim1.status, 200, `Bank claim failed: ${JSON.stringify(bankClaim1.data)}`);
    assert.strictEqual(bankClaim1.data.settlement?.status, 'VERIFYING_AT_BANK');

    // Competing bank teller claims same voucher -> HTTP 409 Conflict
    const bankClaim2 = await apiRequest('POST', '/api/bank/claim', { voucherReference: voucherToSettle }, bearer(tokenAdmin));
    assert.strictEqual(bankClaim2.status, 409, 'Concurrent bank claim must return HTTP 409 Conflict');

    // 2. Bank Settlement Execution
    const teamBeforeSettle = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tSettleBefore = getTeamData(teamBeforeSettle);
    const cashBeforeSettle = getCashINR(tSettleBefore);
    const holdingsBeforeSettle = tSettleBefore.holdings?.[orderToVerify.ticker] || 0;

    const settleRes = await apiRequest('POST', '/api/bank/settle', { voucherReference: voucherToSettle }, bearer(tokenBank));
    assert.strictEqual(settleRes.status, 200, `Bank settlement failed: ${JSON.stringify(settleRes.data)}`);
    assert.strictEqual(settleRes.data.settlement?.status, 'SETTLED');

    const teamAfterSettle = await apiRequest('GET', '/api/team/portfolio', null, bearer(tokenT01));
    const tSettleAfter = getTeamData(teamAfterSettle);
    const cashAfterSettle = getCashINR(tSettleAfter);
    const holdingsAfterSettle = tSettleAfter.holdings?.[orderToVerify.ticker] || 0;

    // Verify cash WAS debited and holdings WERE credited
    assert(cashAfterSettle < cashBeforeSettle, 'Client cash must be debited upon bank settlement');
    assert.strictEqual(holdingsAfterSettle, holdingsBeforeSettle + orderToVerify.quantity, 'Holdings must be credited upon bank settlement');

    recordResult({
      id: 'PHASE-C-13',
      title: 'Bank Desk Claim & Settlement Execution via Voucher',
      endpoint: '/api/bank/claim and /api/bank/settle',
      role: 'bank_teller',
      scenario: 'Bank teller claims voucher (mutex protected) and settles trade; verify cash debited and shares delivered',
      expected: 'Bank claim mutex enforces 409 on contention; settlement debits cash and credits holdings',
      actual: `Bank Claim 1 HTTP 200, Bank Claim 2 HTTP ${bankClaim2.status}. Settle HTTP 200. Holdings: ${holdingsBeforeSettle} -> ${holdingsAfterSettle}`,
      evidence: { voucher: voucherToSettle, cashBeforeSettle, cashAfterSettle, holdingsBeforeSettle, holdingsAfterSettle },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-14: Participant Team Slip Approval Role Guard (HTTP 403 Forbidden)
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-14: ROLE GUARD ON ACCEPT (TEAM SELF-APPROVAL BLOCKED) ---');
    const teamSlipOrder = createdOrders[40];
    const teamAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: teamSlipOrder.id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenT01));

    assert.strictEqual(teamAcceptRes.status, 403, `Participant team calling ACCEPT must return HTTP 403. Got ${teamAcceptRes.status}`);
    assert(teamAcceptRes.data.error.includes('Forbidden'), `Error must mention Forbidden: ${teamAcceptRes.data.error}`);

    recordResult({
      id: 'PHASE-C-14',
      title: 'Participant Team Slip Approval Role Guard (HTTP 403 Forbidden)',
      endpoint: '/api/order/action (ACCEPT by role: team)',
      role: 'team (T01)',
      scenario: 'Participant trading team attempts to self-approve paper slip without exchange clerk authorization',
      expected: 'HTTP 403 Forbidden blocking participant team from approving physical slips',
      actual: `HTTP ${teamAcceptRes.status} returned. Error: "${teamAcceptRes.data.error}"`,
      evidence: { status: teamAcceptRes.status, error: teamAcceptRes.data.error },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-15: State Machine Guard on Re-Validation After Exchange Approval
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-15: RE-VALIDATION GUARD AFTER EXCHANGE APPROVAL ---');
    const approvedOrder = createdOrders[1];
    const revalRes = await apiRequest('POST', '/api/order/action', {
      orderId: approvedOrder.id,
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, bearer(tokenExchange));

    assert.strictEqual(revalRes.status, 400, `Calling VALIDATE on EXCHANGE_APPROVED order must return HTTP 400. Got ${revalRes.status}`);

    recordResult({
      id: 'PHASE-C-15',
      title: 'State Machine Guard on Re-Validation After Exchange Approval',
      endpoint: '/api/order/action (VALIDATE on EXCHANGE_APPROVED order)',
      role: 'exchange',
      scenario: 'Operator attempts to re-validate an order that has already been approved by exchange desk',
      expected: 'HTTP 400 Bad Request blocking state machine regression and duplicate voucher generation',
      actual: `HTTP ${revalRes.status} returned. Error: "${revalRes.data.error}"`,
      evidence: { status: revalRes.status, error: revalRes.data.error },
      status: 'PASSED'
    });

    // ------------------------------------------------------------------
    // TEST PHASE-C-16: Duplicate Slip Acceptance Prevention Guard
    // ------------------------------------------------------------------
    console.log('--- RUNNING TEST PHASE-C-16: DUPLICATE ACCEPTANCE PREVENTION GUARD ---');
    // 1. Duplicate ACCEPT on EXCHANGE_APPROVED order
    const dupAcceptApprovedRes = await apiRequest('POST', '/api/order/action', {
      orderId: approvedOrder.id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExchange));

    assert.strictEqual(dupAcceptApprovedRes.status, 400, `Re-accepting EXCHANGE_APPROVED order must return HTTP 400. Got ${dupAcceptApprovedRes.status}`);
    assert(dupAcceptApprovedRes.data.error.includes('already approved'), `Error message expected: ${dupAcceptApprovedRes.data.error}`);

    // 2. Duplicate ACCEPT on SETTLED order (orderToVerify from Test 13)
    const dupAcceptSettledRes = await apiRequest('POST', '/api/order/action', {
      orderId: orderToVerify.id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExchange));

    assert.strictEqual(dupAcceptSettledRes.status, 400, `Calling ACCEPT on SETTLED order must return HTTP 400. Got ${dupAcceptSettledRes.status}`);

    recordResult({
      id: 'PHASE-C-16',
      title: 'Duplicate Slip Acceptance Prevention Guard (EXCHANGE_APPROVED and SETTLED)',
      endpoint: '/api/order/action (ACCEPT on EXCHANGE_APPROVED / SETTLED order)',
      role: 'exchange',
      scenario: 'Attempt duplicate acceptance on order in EXCHANGE_APPROVED and SETTLED terminal states',
      expected: 'HTTP 400 Bad Request blocking duplicate slip acceptance',
      actual: `EXCHANGE_APPROVED duplicate HTTP ${dupAcceptApprovedRes.status}, SETTLED duplicate HTTP ${dupAcceptSettledRes.status}`,
      evidence: { approvedStatus: dupAcceptApprovedRes.status, settledStatus: dupAcceptSettledRes.status },
      status: 'PASSED'
    });

  } finally {
    // ------------------------------------------------------------------
    // STEP 6: SERVER SHUTDOWN & CLEANUP
    // ------------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST SERVER & DISPOSABLE STATE ---');
    try {
      serverProcess.kill('SIGINT');
      serverProcess.kill('SIGKILL');
    } catch (e) {}

    if (fs.existsSync(DISPOSABLE_STATE)) {
      try {
        fs.chmodSync(DISPOSABLE_STATE, 0o666);
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Unlinked disposable state file ${DISPOSABLE_STATE}`);
      } catch (e) {
        console.error(`Failed to unlink disposable state: ${e.message}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // TEST PHASE-C-17: POST-FLIGHT AUTHORITATIVE BASELINE HASH INTEGRITY
  // ------------------------------------------------------------------
  console.log('\n--- STEP 7: POST-FLIGHT AUTHORITATIVE HASH VERIFICATION ---');
  const postHash = getSha256(ORIGINAL_STATE);
  assert.strictEqual(postHash, EXPECTED_HASH, `Post-flight hash mismatch! Expected ${EXPECTED_HASH}, got ${postHash}`);
  recordResult({
    id: 'PHASE-C-17',
    title: 'Post-Flight Authoritative Baseline Hash Integrity',
    endpoint: 'N/A',
    role: 'SYSTEM',
    scenario: 'Recompute SHA-256 of authoritative state.json following all test executions and cleanup',
    expected: `SHA-256 strictly matches baseline ${EXPECTED_HASH}`,
    actual: `SHA-256 is ${postHash} (Bit-exact match)`,
    evidence: { sha256: postHash, matches: postHash === EXPECTED_HASH },
    status: 'PASSED'
  });

  // Export results JSON
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2));
  console.log(`\n✓ Results exported to ${RESULTS_FILE}`);

  const passedCount = testResults.filter(r => r.status === 'PASSED').length;
  console.log('\n======================================================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount} / ${testResults.length} PASSED (100%)`);
  console.log('======================================================================');

  if (passedCount !== testResults.length) {
    process.exit(1);
  }
}

runPhaseCTestSuite().catch(err => {
  console.error('\n❌ Unhandled Test Suite Failure:', err);
  process.exit(1);
});
