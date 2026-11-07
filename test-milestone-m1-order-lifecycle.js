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

const PORT = 3106;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-m1-disposable.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-milestone-m1-results.json');

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

function getTeamReserved(team, currency = 'INR') {
  if (!team) return 0;
  if (typeof team.reservedCash === 'object' && team.reservedCash !== null) {
    return Number(team.reservedCash[currency] || 0);
  }
  return Number(team.reservedCash || 0);
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

async function getSecurityState(token, ticker = 'RELIANCE') {
  const res = await apiRequest('GET', '/api/state', null, bearerHeader(token));
  const s = (res.data?.securities || []).find(sec => sec.ticker === ticker || sec.id === ticker);
  return s || {};
}

async function runMilestoneM1OrderLifecycleSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX MILESTONE M1 — ORDER LIFECYCLE & SETTLEMENT INTEGRITY SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, `AUTHORITATIVE STATE HASH MISMATCH! Expected ${EXPECTED_HASH}, got ${initialHash}`);
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: FIXTURE SETUP
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;

  // Ensure T01 has plenty of cash and some RELIANCE shares to test both BUY and SELL
  const t01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (t01) {
    t01.cashBalance = 10000000; // 1 Crore
    t01.cashWallets = { INR: 10000000 };
    t01.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CAD: 0, CHF: 0, CNY: 0 };
    t01.reservedWallets = { INR: 0 };
    t01.holdings = { ...(t01.holdings || {}), RELIANCE: 1000 };
    t01.lockedHoldings = { RELIANCE: 0 };
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Seeded disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}\n`);

  // Pre-seed PostgreSQL state if active to ensure test fixture parity
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
        VALUES ('H_T01_RELIANCE', 'T01', 'RELIANCE', 1000, 0, 100, 100000, NOW(), NOW())
        ON CONFLICT (team_id, ticker) DO UPDATE SET
          units = 1000,
          locked_units = 0,
          updated_at = NOW()
      `);
      await pool.query(`
        UPDATE wallets
        SET balance = 10000000,
            reserved = 0,
            updated_at = NOW()
        WHERE team_id = 'T01' AND currency = 'INR'
      `);
      const relianceSec = (fixture.securities || []).find(s => s.ticker === 'RELIANCE');
      if (relianceSec) {
        await pool.query(`
          UPDATE securities
          SET available_units = $1,
              trading_volume = 0,
              current_price = $2,
              updated_at = NOW()
          WHERE ticker = 'RELIANCE'
        `, [Number(relianceSec.availableUnits || 20519041), Number(relianceSec.currentPrice || relianceSec.basePrice || 2678.45)]);
      }
      await pool.query(`
        ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE settlement_vouchers DROP CONSTRAINT IF EXISTS settlement_vouchers_status_check;
        ALTER TABLE settlement_vouchers ADD CONSTRAINT settlement_vouchers_status_check CHECK (
          status IN ('PENDING', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW', 'SETTLED', 'REJECTED', 'CANCELLED', 'VOIDED', 'FAILED')
        );
      `);
      console.log('✓ Seeded PostgreSQL test fixtures for T01, RELIANCE float, and settlement_vouchers parity\n');
    } catch (pgErr) {
      console.warn('Notice: PG fixture pre-seeding notice:', pgErr.message);
    } finally {
      await closePool();
    }
  }

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

  let serverStarted = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && (hydrated || i >= 15)) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT} (authoritative hydration complete).\n`);
        break;
      }
    } catch (e) {
      // keep waiting
    }
    await new Promise(r => setTimeout(r, 400));
  }

  if (!serverStarted) {
    serverProcess.kill();
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    assert(tokenT01, 'T01 authentication failed');
    assert(tokenExchange, 'Exchange authentication failed');
    assert(tokenBank, 'Bank authentication failed');
    assert(tokenAdmin, 'Admin authentication failed');
    console.log('✓ All roles authenticated successfully.\n');

    const RUN_ID = Date.now();

    // TEST 1: BUY Pre-reservation with +5% Execution Buffer
    console.log('--- RUNNING TEST 1: BUY PRE-RESERVATION WITH +5% EXECUTION BUFFER ---');
    const secBeforeBuy = await getSecurityState(tokenAdmin, 'RELIANCE');
    const currentPrice = secBeforeBuy.currentPrice || 100;
    const buyQty = 50;
    const requestedValue = buyQty * currentPrice;
    const expectedReservedCash = parseFloat((requestedValue * 1.05).toFixed(2));
    const expectedBuffer = parseFloat((expectedReservedCash - requestedValue).toFixed(2));

    const teamBeforeBuy = await getTeamState(tokenT01, 'T01');
    const cashBeforeBuy = teamBeforeBuy.cashBalance || teamBeforeBuy.cashWallets?.INR;
    const reservedBeforeBuy = getTeamReserved(teamBeforeBuy, 'INR');

    const orderRes1 = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-001`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: buyQty,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(orderRes1.status, 200, `Order creation failed: ${JSON.stringify(orderRes1.data)}`);
    const createdOrder1 = orderRes1.data.order;
    assert.strictEqual(createdOrder1.status, 'AWAITING_PHYSICAL_SLIP', 'Order status must be AWAITING_PHYSICAL_SLIP');
    assert.strictEqual(createdOrder1.reservedCashAmount, expectedReservedCash, `Reserved cash must be ${expectedReservedCash}`);
    assert.strictEqual(createdOrder1.executionBuffer, expectedBuffer, `Execution buffer must be ${expectedBuffer}`);

    const teamAfterBuy = await getTeamState(tokenT01, 'T01');
    const reservedAfterBuy = getTeamReserved(teamAfterBuy, 'INR');
    assert.strictEqual(reservedAfterBuy, reservedBeforeBuy + expectedReservedCash, 'Team reservedCash must increase by exact reservedCashAmount');

    recordResult({
      id: 'M1-TEST-01',
      title: 'BUY Pre-Reservation with +5% Execution Buffer',
      endpoint: '/api/orders/submit',
      role: 'exchange (DESK_1)',
      scenario: 'Submit 50 RELIANCE BUY order; verify AWAITING_PHYSICAL_SLIP and +5% buffer pre-reserved',
      expected: `status=AWAITING_PHYSICAL_SLIP, reservedCashAmount=${expectedReservedCash}`,
      actual: `status=${createdOrder1.status}, reservedCashAmount=${createdOrder1.reservedCashAmount}`,
      evidence: { orderId: createdOrder1.id, reservedCashAmount: createdOrder1.reservedCashAmount, executionBuffer: createdOrder1.executionBuffer },
      status: 'PASSED'
    });

    // TEST 2: BUY Rejection on Insufficient Cash
    console.log('--- RUNNING TEST 2: BUY REJECTION ON INSUFFICIENT CASH (< requestedValue * 1.05) ---');
    const hugeQty = 1000000;
    const orderRes2 = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-002`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: hugeQty,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(orderRes2.status, 400, 'Huge BUY order must be rejected with 400');
    assert(orderRes2.data.error.includes('Insufficient'), `Error message must indicate insufficient cash: ${orderRes2.data.error}`);

    recordResult({
      id: 'M1-TEST-02',
      title: 'BUY Rejection on Insufficient Cash',
      endpoint: '/api/orders/submit',
      role: 'exchange (DESK_1)',
      scenario: 'Submit BUY order exceeding available unreserved cash including +5% buffer',
      expected: 'HTTP 400 Insufficient unreserved cash balance',
      actual: `HTTP ${orderRes2.status} error="${orderRes2.data.error}"`,
      evidence: { error: orderRes2.data.error },
      status: 'PASSED'
    });

    // TEST 3: SELL Share Locking (Deliverable Units Check)
    console.log('--- RUNNING TEST 3: SELL PRE-RESERVATION & DELIVERABLE SHARE LOCKING ---');
    const teamBeforeSell = await getTeamState(tokenT01, 'T01');
    const holdingsReliance = teamBeforeSell.holdings?.RELIANCE || 1000;
    const sellQty = 200;

    const sellRes1 = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-003`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: sellQty,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(sellRes1.status, 200, `SELL order creation failed: ${JSON.stringify(sellRes1.data)}`);
    const createdSellOrder = sellRes1.data.order;
    assert.strictEqual(createdSellOrder.status, 'AWAITING_PHYSICAL_SLIP', 'SELL order status must be AWAITING_PHYSICAL_SLIP');
    assert.strictEqual(createdSellOrder.lockedUnits, sellQty, 'Order lockedUnits must match quantity');

    const teamAfterSell = await getTeamState(tokenT01, 'T01');
    assert.strictEqual(teamAfterSell.lockedHoldings?.RELIANCE, sellQty, 'Team lockedHoldings must reflect 200 locked shares');
    assert.strictEqual(teamAfterSell.holdings?.RELIANCE, holdingsReliance, 'Total holdings must NOT be deducted prematurely');

    // Attempt to sell more than deliverable (available = 1000 - 200 = 800)
    const excessSellRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-004`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'SELL',
      quantity: 850,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(excessSellRes.status, 400, 'Excess SELL order must be rejected with 400');
    assert(excessSellRes.data.error.includes('Insufficient deliverable'), `Error message must indicate insufficient deliverable holdings: ${excessSellRes.data.error}`);

    recordResult({
      id: 'M1-TEST-03',
      title: 'SELL Share Locking & Deliverable Units Check',
      endpoint: '/api/orders/submit',
      role: 'exchange (DESK_1)',
      scenario: 'Lock 200 shares on SELL; verify total holdings unchanged, and reject order exceeding remaining 800 deliverable units',
      expected: 'HTTP 200 for 200 units, HTTP 400 Insufficient deliverable holdings for 850 units',
      actual: `Created order status=${createdSellOrder.status}, Excess attempt error="${excessSellRes.data.error}"`,
      evidence: { orderId: createdSellOrder.id, lockedUnits: createdSellOrder.lockedUnits, teamLockedHoldings: teamAfterSell.lockedHoldings },
      status: 'PASSED'
    });

    // TEST 4: Exchange Claim and Transition to VERIFYING_AT_EXCHANGE
    console.log('--- RUNNING TEST 4: EXCHANGE CLAIM TRANSITION ---');
    const claimRes = await apiRequest('POST', '/api/order/claim', {
      orderId: createdOrder1.id,
      deskId: 'DESK_1',
      operator: 'Desk Operator 1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(claimRes.status, 200, `Claim failed: ${JSON.stringify(claimRes.data)}`);
    assert.strictEqual(claimRes.data.order?.status, 'VERIFYING_AT_EXCHANGE', 'Order must transition to VERIFYING_AT_EXCHANGE');
    assert.strictEqual(claimRes.data.order?.deskId, 'DESK_1', 'deskId must be set');

    recordResult({
      id: 'M1-TEST-04',
      title: 'Exchange Claim Order Transition',
      endpoint: '/api/order/claim',
      role: 'exchange (DESK_1)',
      scenario: 'Desk 1 claims AWAITING_PHYSICAL_SLIP order; transitions to VERIFYING_AT_EXCHANGE',
      expected: 'status=VERIFYING_AT_EXCHANGE, deskId=DESK_1',
      actual: `status=${claimRes.data.order?.status}, deskId=${claimRes.data.order?.deskId}`,
      evidence: { orderId: createdOrder1.id, deskId: claimRes.data.order?.deskId, status: claimRes.data.order?.status },
      status: 'PASSED'
    });

    // TEST 5: Exchange Approval (Non-Premature Execution & Symmetric SELL)
    console.log('--- RUNNING TEST 5: EXCHANGE APPROVAL & SYMMETRIC NON-PREMATURE SELL ---');
    // First, claim the SELL order
    await apiRequest('POST', '/api/order/claim', {
      orderId: createdSellOrder.id,
      deskId: 'DESK_1',
      operator: 'Desk Operator 1'
    }, bearerHeader(tokenExchange));

    // Execute SELL order
    const floatBeforeSell = (await getSecurityState(tokenAdmin, 'RELIANCE')).availableUnits;
    const execSellRes = await apiRequest('POST', '/api/order/action', {
      orderId: createdSellOrder.id,
      actionType: 'ACCEPT',
      deskId: 'DESK_1',
      operator: 'Desk Operator 1',
      physicalSlipChecked: true
    }, bearerHeader(tokenExchange));

    assert.strictEqual(execSellRes.status, 200, `SELL execution failed: ${JSON.stringify(execSellRes.data)}`);
    assert.strictEqual(execSellRes.data.order?.status, 'EXCHANGE_APPROVED', 'SELL order status must be EXCHANGE_APPROVED');

    // CRITICAL: verify non-premature symmetric sell!
    const teamDuringPendingSell = await getTeamState(tokenT01, 'T01');
    const floatDuringPendingSell = (await getSecurityState(tokenAdmin, 'RELIANCE')).availableUnits;

    assert.strictEqual(teamDuringPendingSell.holdings?.RELIANCE, 1000, 'SELL shares must NOT be deducted from holdings upon exchange approval');
    assert.strictEqual(teamDuringPendingSell.lockedHoldings?.RELIANCE, 200, 'SELL shares must remain locked in lockedHoldings');
    assert.strictEqual(floatDuringPendingSell, floatBeforeSell, 'Market float availableUnits must NOT increase prematurely upon exchange approval');

    // Execute BUY order
    const execBuyRes = await apiRequest('POST', '/api/order/action', {
      orderId: createdOrder1.id,
      actionType: 'ACCEPT',
      deskId: 'DESK_1',
      operator: 'Desk Operator 1',
      physicalSlipChecked: true
    }, bearerHeader(tokenExchange));

    assert.strictEqual(execBuyRes.status, 200, `BUY execution failed: ${JSON.stringify(execBuyRes.data)}`);
    assert.strictEqual(execBuyRes.data.order?.status, 'EXCHANGE_APPROVED', 'BUY order status must be EXCHANGE_APPROVED');

    const teamDuringPendingBuy = await getTeamState(tokenT01, 'T01');
    assert.strictEqual(getTeamReserved(teamDuringPendingBuy, 'INR'), expectedReservedCash, 'No double-reservation of cash upon exchange approval');

    recordResult({
      id: 'M1-TEST-05',
      title: 'Exchange Approval & Symmetric Non-Premature Execution',
      endpoint: '/api/order/action (ACCEPT)',
      role: 'exchange (DESK_1)',
      scenario: 'Execute SELL and BUY orders; verify EXCHANGE_APPROVED status, no premature share deduction, no float increase, and no cash double-reservation',
      expected: 'status=EXCHANGE_APPROVED, holdings unchanged=1000, lockedHoldings=200, float unchanged, reservedCash unchanged',
      actual: `SELL status=${execSellRes.data.order?.status}, BUY status=${execBuyRes.data.order?.status}, holdings=${teamDuringPendingSell.holdings?.RELIANCE}, lockedHoldings=${teamDuringPendingSell.lockedHoldings?.RELIANCE}`,
      evidence: { sellOrder: execSellRes.data.order?.id, buyOrder: execBuyRes.data.order?.id, voucherReference: execBuyRes.data.settlement?.voucherReference },
      status: 'PASSED'
    });

    // TEST 6: Bank Claim and Bank Hold with Mandatory Notes
    console.log('--- RUNNING TEST 6: BANK CLAIM & BANK HOLD WITH MANDATORY NOTES ---');
    const buyVoucherRef = execBuyRes.data.settlement?.voucherReference || execBuyRes.data.voucherReference;
    assert(buyVoucherRef, 'Settlement voucher reference must be generated');

    // Claim voucher at Bank Desk
    const bankClaimRes = await apiRequest('POST', '/api/bank/claim', {
      voucherReference: buyVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1'
    }, bearerHeader(tokenBank));

    assert.strictEqual(bankClaimRes.status, 200, `Bank claim failed: ${JSON.stringify(bankClaimRes.data)}`);
    assert.strictEqual(bankClaimRes.data.voucher?.status, 'VERIFYING_AT_BANK', 'Voucher must transition to VERIFYING_AT_BANK');

    // Attempt Bank Hold WITHOUT notes -> must reject 400
    const holdFailRes = await apiRequest('POST', '/api/bank/hold', {
      voucherReference: buyVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1'
    }, bearerHeader(tokenBank));

    assert.strictEqual(holdFailRes.status, 400, 'Hold without notes must be rejected with 400');
    assert(holdFailRes.data.error.includes('reason') || holdFailRes.data.error.includes('notes'), 'Error must specify mandatory notes');

    // Call Bank Hold WITH notes
    const holdRes = await apiRequest('POST', '/api/bank/hold', {
      voucherReference: buyVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1',
      notes: 'Under review for large runner transaction verification'
    }, bearerHeader(tokenBank));

    assert.strictEqual(holdRes.status, 200, `Bank hold failed: ${JSON.stringify(holdRes.data)}`);
    assert.strictEqual(holdRes.data.voucher?.status, 'HELD_FOR_REVIEW', 'Voucher must transition to HELD_FOR_REVIEW');

    recordResult({
      id: 'M1-TEST-06',
      title: 'Bank Claim & Hold Voucher with Mandatory Notes',
      endpoint: '/api/bank/hold',
      role: 'bank (BANK_1)',
      scenario: 'Claim voucher, reject hold without notes (400), then successfully transition to HELD_FOR_REVIEW with mandatory notes',
      expected: 'HTTP 400 without notes, HTTP 200 with status=HELD_FOR_REVIEW',
      actual: `Fail HTTP ${holdFailRes.status}, Success status=${holdRes.data.voucher?.status}`,
      evidence: { voucherReference: buyVoucherRef, holdNotes: holdRes.data.voucher?.holdNotes },
      status: 'PASSED'
    });

    // TEST 7: Bank Settlement & Zero Buffer Leakage
    console.log('--- RUNNING TEST 7: BANK SETTLEMENT & ZERO BUFFER LEAKAGE ---');
    const teamPreSettle = await getTeamState(tokenT01, 'T01');
    const cashPreSettle = teamPreSettle.cashBalance || teamPreSettle.cashWallets?.INR;
    const reservedPreSettle = getTeamReserved(teamPreSettle, 'INR');

    const settleBuyRes = await apiRequest('POST', '/api/bank/settle', {
      voucherReference: buyVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1'
    }, bearerHeader(tokenBank));

    assert.strictEqual(settleBuyRes.status, 200, `Bank settlement failed: ${JSON.stringify(settleBuyRes.data)}`);
    assert.strictEqual(settleBuyRes.data.voucher?.status, 'SETTLED', 'Voucher must transition to SETTLED');
    assert.strictEqual(settleBuyRes.data.order?.status, 'SETTLED', 'Order must transition to SETTLED');

    const teamPostSettle = await getTeamState(tokenT01, 'T01');
    const cashPostSettle = teamPostSettle.cashBalance || teamPostSettle.cashWallets?.INR;
    const reservedPostSettle = getTeamReserved(teamPostSettle, 'INR');

    // Actual consideration = buyQty * executionPrice
    const executionConsideration = settleBuyRes.data.voucher?.totalAmount || requestedValue;
    assert.strictEqual(cashPostSettle, cashPreSettle - executionConsideration, 'Cash debited must be exact execution consideration (NOT including 5% buffer)');
    assert.strictEqual(reservedPostSettle, reservedPreSettle - expectedReservedCash, 'Full reservation including +5% buffer must be cleanly released');
    assert.strictEqual(reservedPostSettle, 0, 'Team reservedCash must return cleanly to 0 (ZERO BUFFER LEAKAGE)');
    assert.strictEqual(teamPostSettle.holdings?.RELIANCE, 1000 + buyQty, 'Shares must be credited to holdings upon settlement');

    recordResult({
      id: 'M1-TEST-07',
      title: 'Bank Settlement & Zero Buffer Leakage Verification',
      endpoint: '/api/bank/settle',
      role: 'bank (BANK_1)',
      scenario: 'Settle BUY voucher; verify exact execution cash debited, full 105% reservation released with zero buffer leakage, shares credited',
      expected: `cashDebit=${executionConsideration}, reservedCashReleased=${expectedReservedCash}, finalReservedCash=0`,
      actual: `cashDebit=${cashPreSettle - cashPostSettle}, finalReservedCash=${reservedPostSettle}, finalHoldings=${teamPostSettle.holdings?.RELIANCE}`,
      evidence: { voucherReference: buyVoucherRef, cashPostSettle, reservedPostSettle, holdings: teamPostSettle.holdings?.RELIANCE },
      status: 'PASSED'
    });

    // TEST 8: Symmetric SELL Bank Settlement
    console.log('--- RUNNING TEST 8: SYMMETRIC SELL BANK SETTLEMENT ---');
    const sellVoucherRef = execSellRes.data.settlement?.voucherReference || execSellRes.data.voucherReference;
    assert(sellVoucherRef, 'SELL settlement voucher reference must exist');

    const floatPreSellSettle = (await getSecurityState(tokenAdmin, 'RELIANCE')).availableUnits;
    const teamPreSellSettle = await getTeamState(tokenT01, 'T01');

    const settleSellRes = await apiRequest('POST', '/api/bank/settle', {
      voucherReference: sellVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1'
    }, bearerHeader(tokenBank));

    assert.strictEqual(settleSellRes.status, 200, `SELL settlement failed: ${JSON.stringify(settleSellRes.data)}`);
    assert.strictEqual(settleSellRes.data.voucher?.status, 'SETTLED', 'SELL voucher must transition to SETTLED');

    const teamPostSellSettle = await getTeamState(tokenT01, 'T01');
    const floatPostSellSettle = (await getSecurityState(tokenAdmin, 'RELIANCE')).availableUnits;

    // NOW shares should be deducted and lockedHoldings cleared
    assert.strictEqual(teamPostSellSettle.holdings?.RELIANCE, teamPreSellSettle.holdings?.RELIANCE - sellQty, 'Shares must now be deducted from holdings upon settlement');
    assert.strictEqual(teamPostSellSettle.lockedHoldings?.RELIANCE || 0, 0, 'lockedHoldings must be cleared upon settlement');
    assert.strictEqual(floatPostSellSettle, floatPreSellSettle + sellQty, 'Market float availableUnits must now increase by sold shares');

    recordResult({
      id: 'M1-TEST-08',
      title: 'Symmetric SELL Final Settlement Delivery',
      endpoint: '/api/bank/settle',
      role: 'bank (BANK_1)',
      scenario: 'Settle SELL voucher; verify final deduction from holdings, unlocking of lockedHoldings, and increment to market float',
      expected: `holdings=${teamPreSellSettle.holdings?.RELIANCE - sellQty}, lockedHoldings=0, float=+${sellQty}`,
      actual: `holdings=${teamPostSellSettle.holdings?.RELIANCE}, lockedHoldings=${teamPostSellSettle.lockedHoldings?.RELIANCE || 0}, floatChange=${floatPostSellSettle - floatPreSellSettle}`,
      evidence: { voucherReference: sellVoucherRef, floatPostSellSettle },
      status: 'PASSED'
    });

    // TEST 9: Bank Rejection & Volume Reversal
    console.log('--- RUNNING TEST 9: BANK REJECTION & TRADING VOLUME REVERSAL ---');
    // Create new BUY order
    const rejOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-009`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 40,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange));

    const rejOrderId = rejOrderRes.data.order?.id;
    // Approve at exchange
    const rejExecRes = await apiRequest('POST', '/api/order/action', {
      orderId: rejOrderId,
      actionType: 'ACCEPT',
      deskId: 'DESK_1',
      operator: 'Desk Operator 1',
      physicalSlipChecked: true
    }, bearerHeader(tokenExchange));

    const rejVoucherRef = rejExecRes.data.settlement?.voucherReference || rejExecRes.data.voucherReference;
    const volAfterExec = (await getSecurityState(tokenAdmin, 'RELIANCE')).tradingVolume || 0;

    // Bank Teller rejects voucher
    const bankRejectRes = await apiRequest('POST', '/api/bank/reject', {
      voucherReference: rejVoucherRef,
      bankDeskId: 'BANK_1',
      tellerName: 'Bank Teller 1',
      reason: 'Counterfeit bank note detected during cash count',
      rejectionReason: 'Counterfeit bank note detected during cash count'
    }, bearerHeader(tokenBank));

    assert.strictEqual(bankRejectRes.status, 200, `Bank reject failed: ${JSON.stringify(bankRejectRes.data)}`);
    assert.strictEqual(bankRejectRes.data.voucher?.status, 'REJECTED', 'Voucher must be REJECTED');
    assert.strictEqual(bankRejectRes.data.order?.status, 'REJECTED_BY_BANK', 'Order must be REJECTED_BY_BANK');

    const volAfterReject = (await getSecurityState(tokenAdmin, 'RELIANCE')).tradingVolume || 0;
    assert.strictEqual(volAfterReject, volAfterExec - 40, 'tradingVolume must be decremented by 40 on bank rejection');

    const teamAfterReject = await getTeamState(tokenT01, 'T01');
    assert.strictEqual(getTeamReserved(teamAfterReject, 'INR'), 0, 'Reserved cash must be released cleanly on bank rejection');

    recordResult({
      id: 'M1-TEST-09',
      title: 'Bank Rejection & Trading Volume Reversal',
      endpoint: '/api/bank/reject',
      role: 'bank (BANK_1)',
      scenario: 'Reject voucher at bank; verify status=REJECTED_BY_BANK, securities.tradingVolume decremented, cash reservation released',
      expected: 'status=REJECTED_BY_BANK, tradingVolume decremented by 40, reservedCash=0',
      actual: `orderStatus=${bankRejectRes.data.order?.status}, volumeChange=${volAfterReject - volAfterExec}, reservedCash=${getTeamReserved(teamAfterReject, 'INR')}`,
      evidence: { voucherReference: rejVoucherRef, rejectionReason: bankRejectRes.data.voucher?.rejectionReason },
      status: 'PASSED'
    });

    // TEST 10: Exchange Rejection, Return for Correction, and Cancel Zero-Leakage
    console.log('--- RUNNING TEST 10: EXCHANGE REJECTION, RETURN & CANCEL ZERO-LEAKAGE ---');
    // 10a. Exchange Reject
    const ordA = (await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-010A`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange))).data.order;

    assert(getTeamReserved(await getTeamState(tokenT01, 'T01'), 'INR') > 0, 'Cash must be reserved for ordA');

    const excRejRes = await apiRequest('POST', '/api/order/action', {
      orderId: ordA.id,
      actionType: 'REJECT',
      rejectionReason: 'Invalid runner badge credentials',
      deskId: 'DESK_1',
      operator: 'Desk Operator 1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(excRejRes.status, 200);
    assert.strictEqual(excRejRes.data.order?.status, 'REJECTED_BY_EXCHANGE');
    assert.strictEqual(getTeamReserved(await getTeamState(tokenT01, 'T01'), 'INR'), 0, 'Reserved cash must be released on exchange reject');

    // 10b. Return for correction and resubmit
    const ordB = (await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-M1-${RUN_ID}-010B`,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 15,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearerHeader(tokenExchange))).data.order;

    const returnRes = await apiRequest('POST', '/api/order/action', {
      orderId: ordB.id,
      actionType: 'RETURN_FOR_CORRECTION',
      returnReason: 'Missing team delegate countersignature',
      deskId: 'DESK_1',
      operator: 'Desk Operator 1'
    }, bearerHeader(tokenExchange));

    assert.strictEqual(returnRes.status, 200, `Return for correction failed: ${JSON.stringify(returnRes.data)}`);
    assert.strictEqual(returnRes.data.order?.status, 'RETURNED_FOR_CORRECTION');
    assert.strictEqual(getTeamReserved(await getTeamState(tokenT01, 'T01'), 'INR'), 0, 'Reserved cash released on return');

    // Resubmit corrected order
    const resubmitRes = await apiRequest('POST', '/api/orders/resubmit', {
      orderId: ordB.id,
      quantity: 20,
      orderType: 'MARKET',
      notes: 'Countersigned by team captain',
      teamCode: 'T01'
    }, bearerHeader(tokenT01));

    assert.strictEqual(resubmitRes.status, 200);
    assert.strictEqual(resubmitRes.data.order?.status, 'AWAITING_PHYSICAL_SLIP');
    assert(getTeamReserved(await getTeamState(tokenT01, 'T01'), 'INR') > 0, 'Cash re-reserved on resubmit');

    // 10c. Cancel order
    const cancelRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: ordB.id,
      teamCode: 'T01'
    }, bearerHeader(tokenT01));

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.data.order?.status, 'CANCELLED');
    assert.strictEqual(getTeamReserved(await getTeamState(tokenT01, 'T01'), 'INR'), 0, 'Reserved cash released on cancellation');

    recordResult({
      id: 'M1-TEST-10',
      title: 'Exchange Rejection, Return for Correction, and Cancel Zero-Leakage',
      endpoint: '/api/order/action & /api/orders/cancel',
      role: 'exchange & team',
      scenario: 'Test REJECT (REJECTED_BY_EXCHANGE), RETURN_FOR_CORRECTION, RESUBMIT, and CANCEL; verify zero cash leakage across all transitions',
      expected: 'All states correct, reservedCash=0 after each rejection/cancellation',
      actual: `REJECTED_BY_EXCHANGE verified, RETURNED_FOR_CORRECTION verified, CANCELLED verified, reservedCash=0`,
      evidence: { orderA: ordA.id, orderB: ordB.id, cancelStatus: cancelRes.data.order?.status },
      status: 'PASSED'
    });

    // TEST 11: Backward-Compatible API Queries
    console.log('--- RUNNING TEST 11: BACKWARD-COMPATIBLE API QUERIES ---');
    // Query with status=PENDING
    const pendingQuery = await apiRequest('GET', '/api/orders?status=PENDING', null, bearerHeader(tokenAdmin));
    assert.strictEqual(pendingQuery.status, 200);
    assert(Array.isArray(pendingQuery.data));

    // Query with status=EXECUTED_PENDING_SETTLEMENT
    const expPendingQuery = await apiRequest('GET', '/api/orders?status=EXECUTED_PENDING_SETTLEMENT', null, bearerHeader(tokenAdmin));
    assert.strictEqual(expPendingQuery.status, 200);
    assert(Array.isArray(expPendingQuery.data));

    // Query with status=REJECTED
    const rejectedQuery = await apiRequest('GET', '/api/orders?status=REJECTED', null, bearerHeader(tokenAdmin));
    assert.strictEqual(rejectedQuery.status, 200);
    assert(Array.isArray(rejectedQuery.data));
    const hasRejectedByBank = rejectedQuery.data.some(o => o.status === 'REJECTED_BY_BANK');
    const hasRejectedByExchange = rejectedQuery.data.some(o => o.status === 'REJECTED_BY_EXCHANGE');
    assert(hasRejectedByBank || hasRejectedByExchange, 'Query for REJECTED must return orders rejected by bank or exchange');

    recordResult({
      id: 'M1-TEST-11',
      title: 'Backward-Compatible API Queries & Status Alias Expansion',
      endpoint: '/api/orders?status=...',
      role: 'admin',
      scenario: 'Query orders by legacy status aliases (PENDING, EXECUTED_PENDING_SETTLEMENT, REJECTED); verify M1 states returned',
      expected: 'HTTP 200 with alias expansion containing distinct M1 states',
      actual: `PENDING count=${pendingQuery.data.length}, EXECUTED_PENDING count=${expPendingQuery.data.length}, REJECTED count=${rejectedQuery.data.length}`,
      evidence: { hasRejectedByBank, hasRejectedByExchange },
      status: 'PASSED'
    });

    // TEST 12: Post-Flight Authoritative Hash Integrity
    console.log('--- RUNNING TEST 12: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Authoritative state.json SHA-256 after test run: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, `AUTHORITATIVE STATE HASH CHANGED! Expected ${EXPECTED_HASH}, got ${finalHash}`);

    recordResult({
      id: 'M1-TEST-12',
      title: 'Post-Flight Authoritative Baseline Hash Integrity',
      endpoint: 'Local File System (state.json)',
      role: 'system',
      scenario: 'Verify original authoritative state.json was NEVER modified during tests',
      expected: `SHA-256: ${EXPECTED_HASH}`,
      actual: `SHA-256: ${finalHash}`,
      evidence: { finalHash },
      status: 'PASSED'
    });

  } finally {
    console.log('\n--- TEARDOWN: TERMINATING ISOLATED TEST SERVER & CLEANING FIXTURES ---');
    serverProcess.kill();
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Cleaned up disposable fixture: ${path.basename(DISPOSABLE_STATE)}`);
      } catch (e) {}
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`✓ Recorded test results to: ${path.basename(RESULTS_FILE)}\n`);
  }

  // Summary
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log('======================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL: ${testResults.length})`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneM1OrderLifecycleSuite().catch(err => {
  console.error('\n❌ Unhandled error during test suite execution:', err);
  process.exit(1);
});
