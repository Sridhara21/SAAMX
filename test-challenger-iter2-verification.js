/**
 * SAAMX PHASE C ITERATION 2 CHALLENGER EMPIRICAL VERIFICATION HARNESS
 * File: SAAMX/test-challenger-iter2-verification.js
 *
 * Verifies:
 * 1. Participant team (role: 'team') calling actionType: 'ACCEPT' is rejected with HTTP 403 Forbidden.
 * 2. Re-validating (actionType: 'VALIDATE') an order in EXCHANGE_APPROVED status is rejected with HTTP 400 Bad Request.
 * 3. Duplicate acceptance (actionType: 'ACCEPT') on an order in EXCHANGE_APPROVED status is rejected with HTTP 400 Bad Request.
 * 4. Duplicate acceptance and re-validation on an order in SETTLED status is rejected with HTTP 400 Bad Request.
 * 5. Concurrent duplicate ACCEPT / VALIDATE race conditions are properly guarded.
 * 6. Bit-exact SHA-256 hash preservation of state.json.
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3145;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-challenger-iter2-3145.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';

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

async function runVerification() {
  console.log('======================================================================');
  console.log('🔬 PHASE C ITERATION 2 INDEPENDENT EMPIRICAL CHALLENGER TEST');
  console.log('======================================================================');

  // STEP 1: PRE-FLIGHT HASH
  const preHash = getSha256(ORIGINAL_STATE);
  console.log(`Pre-flight SHA-256: ${preHash}`);
  assert.strictEqual(preHash, EXPECTED_HASH, 'Pre-flight hash mismatch');

  // STEP 2: FIXTURE SETUP
  if (fs.existsSync(DISPOSABLE_STATE)) {
    try {
      fs.chmodSync(DISPOSABLE_STATE, 0o666);
      fs.unlinkSync(DISPOSABLE_STATE);
    } catch (e) {}
  }
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.settings = { settlementMode: 'TWO_PHASE_BANK' };

  const t01 = (fixture.teams || []).find(t => t.teamCode === 'T01');
  if (t01) {
    t01.cashBalance = 50000000;
    t01.cashWallets = { INR: 50000000 };
    t01.reservedCash = { INR: 0 };
    t01.holdings = { ...(t01.holdings || {}), TCS: 5000 };
    t01.lockedHoldings = { TCS: 0 };
  }
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // STEP 3: SPAWN SERVER
  console.log(`Spawning test server on port ${PORT}...`);
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

  for (let i = 0; i < 50; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && (hydrated || i >= 15)) break;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }

  try {
    // Authenticate
    const [lExch, lBank, lT01] = await Promise.all([
      apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' }),
      apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' })
    ]);
    const tokenExch = lExch.data?.token;
    const tokenBank = lBank.data?.token;
    const tokenT01 = lT01.data?.token;

    assert.ok(tokenExch && tokenBank && tokenT01, 'Authentication failed');

    // -------------------------------------------------------------
    // TASK 1 VERIFICATION: Participant Team Calling ACCEPT
    // -------------------------------------------------------------
    console.log('\n--- TASK 1: PARTICIPANT TEAM CALLING ACCEPT ---');
    const runTs = Date.now();
    const order1 = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKN-TEST-CHALLENGER-${runTs}-001`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 1,
      orderType: 'MARKET',
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    assert.strictEqual(order1.status, 200, `Order 1 submit failed: ${JSON.stringify(order1.data)}`);
    const order1Id = order1.data.order.id;
    console.log(`Created order: ${order1Id} (Ticket: ${order1.data.order.ticketNumber})`);

    // Participant T01 attempts actionType: 'ACCEPT'
    const teamAccept1 = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenT01));

    console.log(`Team T01 ACCEPT (actionType: 'ACCEPT') -> status: ${teamAccept1.status}`);
    assert.strictEqual(teamAccept1.status, 403, 'Participant team calling ACCEPT must return HTTP 403');
    assert(teamAccept1.data.error.includes('Forbidden'), 'Error must contain Forbidden');

    // Participant T01 attempts action: 'ACCEPT' (legacy field)
    const teamAccept2 = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      action: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenT01));

    console.log(`Team T01 ACCEPT (action: 'ACCEPT') -> status: ${teamAccept2.status}`);
    assert.strictEqual(teamAccept2.status, 403, 'Participant team calling ACCEPT via action field must return HTTP 403');
    assert(teamAccept2.data.error.includes('Forbidden'), 'Error must contain Forbidden');

    // Participant T01 attempts unauthenticated ACCEPT
    const unauthAccept = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    });
    console.log(`Unauthenticated ACCEPT -> status: ${unauthAccept.status}`);
    assert(unauthAccept.status === 401 || unauthAccept.status === 403, 'Unauthenticated ACCEPT must be rejected');

    console.log('✓ Task 1 PASSED: Participant team calling ACCEPT is strictly rejected with HTTP 403 Forbidden.');

    // -------------------------------------------------------------
    // TASK 2 & 3 VERIFICATION: Re-validation & Duplicate ACCEPT on EXCHANGE_APPROVED
    // -------------------------------------------------------------
    console.log('\n--- TASK 2 & 3: RE-VALIDATION & DUPLICATE ACCEPT ON EXCHANGE_APPROVED ---');
    // Legitimate exchange flow:
    // 1. Claim
    const claimRes = await apiRequest('POST', '/api/order/claim', {
      orderId: order1Id,
      deskId: 'DESK_1',
      operator: 'Clerk Alpha'
    }, bearer(tokenExch));
    console.log(`Exchange claim -> status: ${claimRes.status}, data: ${JSON.stringify(claimRes.data)}`);
    assert.strictEqual(claimRes.status, 200, `Claim failed: ${JSON.stringify(claimRes.data)}`);

    // 2. Validate
    const valRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    assert.strictEqual(valRes.status, 200, 'Validate failed');
    assert.strictEqual(valRes.data.orderStatus, 'VALIDATED');

    // 3. Accept (Legitimate Exchange Approval)
    const acceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    assert.strictEqual(acceptRes.status, 200, 'Exchange ACCEPT failed');
    assert.strictEqual(acceptRes.data.order.status, 'EXCHANGE_APPROVED');
    const voucherRef = acceptRes.data.voucherReference || acceptRes.data.order.voucherReference;
    assert.ok(voucherRef, 'Voucher reference missing');
    console.log(`Order ${order1Id} transitioned to EXCHANGE_APPROVED with voucher ${voucherRef}`);

    // Verify Task 2: Calling VALIDATE on EXCHANGE_APPROVED order
    const revalRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    console.log(`Calling VALIDATE on EXCHANGE_APPROVED order -> status: ${revalRes.status}, error: "${revalRes.data.error}"`);
    assert.strictEqual(revalRes.status, 400, 'VALIDATE on EXCHANGE_APPROVED must return HTTP 400');
    assert.strictEqual(revalRes.data.error, 'Order is already approved/executed and waiting for or completed Bank Desk settlement.');

    // Verify order state is NOT corrupted / reverted
    const checkOrderRes1 = await apiRequest('GET', '/api/orders', null, bearer(tokenExch));
    const ordersList1 = Array.isArray(checkOrderRes1.data) ? checkOrderRes1.data : (checkOrderRes1.data?.orders || []);
    const currentOrder1 = ordersList1.find(o => o.id === order1Id);
    assert.strictEqual(currentOrder1.status, 'EXCHANGE_APPROVED', 'Order status must remain EXCHANGE_APPROVED after rejected VALIDATE');
    console.log('✓ Task 2 PASSED: Calling VALIDATE on EXCHANGE_APPROVED order is rejected with HTTP 400 without state mutation.');

    // Verify Task 3: Calling ACCEPT again on EXCHANGE_APPROVED order (Duplicate Acceptance)
    const dupAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    console.log(`Calling duplicate ACCEPT on EXCHANGE_APPROVED order -> status: ${dupAcceptRes.status}, error: "${dupAcceptRes.data.error}"`);
    assert.strictEqual(dupAcceptRes.status, 400, 'Duplicate ACCEPT on EXCHANGE_APPROVED must return HTTP 400');
    assert.strictEqual(dupAcceptRes.data.error, 'Order is already approved by Exchange Desk.');

    // Verify concurrent duplicate ACCEPT requests all get blocked
    const concurrentDupAccepts = await Promise.all([
      apiRequest('POST', '/api/order/action', { orderId: order1Id, actionType: 'ACCEPT', physicalSlipChecked: true, deskId: 'DESK_1' }, bearer(tokenExch)),
      apiRequest('POST', '/api/order/action', { orderId: order1Id, actionType: 'ACCEPT', physicalSlipChecked: true, deskId: 'DESK_1' }, bearer(tokenExch)),
      apiRequest('POST', '/api/order/action', { orderId: order1Id, actionType: 'VALIDATE', deskId: 'DESK_1' }, bearer(tokenExch))
    ]);
    assert.strictEqual(concurrentDupAccepts[0].status, 400);
    assert.strictEqual(concurrentDupAccepts[1].status, 400);
    assert.strictEqual(concurrentDupAccepts[2].status, 400);
    console.log('✓ Task 3 PASSED: Calling duplicate ACCEPT on EXCHANGE_APPROVED order is rejected with HTTP 400.');

    // -------------------------------------------------------------
    // FURTHER LIFECYCLE CHECKS: SETTLED STATUS GUARDS
    // -------------------------------------------------------------
    console.log('\n--- ADVANCED LIFECYCLE CHECK: SETTLED STATUS GUARDS ---');
    // Bank claims voucher
    const bankClaim = await apiRequest('POST', '/api/bank/claim', { voucherReference: voucherRef }, bearer(tokenBank));
    assert.strictEqual(bankClaim.status, 200, 'Bank claim failed');

    // Bank settles voucher
    const bankSettle = await apiRequest('POST', '/api/bank/settle', { voucherReference: voucherRef }, bearer(tokenBank));
    assert.strictEqual(bankSettle.status, 200, 'Bank settle failed');

    // Check order status is now SETTLED
    const checkOrderRes2 = await apiRequest('GET', '/api/orders', null, bearer(tokenExch));
    const ordersList2 = Array.isArray(checkOrderRes2.data) ? checkOrderRes2.data : (checkOrderRes2.data?.orders || []);
    const currentOrder2 = ordersList2.find(o => o.id === order1Id);
    assert.strictEqual(currentOrder2.status, 'SETTLED', 'Order must be SETTLED');
    console.log(`Order ${order1Id} is now SETTLED.`);

    // Attempt VALIDATE on SETTLED order
    const settledValidateRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'VALIDATE',
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    console.log(`Calling VALIDATE on SETTLED order -> status: ${settledValidateRes.status}`);
    assert.strictEqual(settledValidateRes.status, 400, 'VALIDATE on SETTLED order must return HTTP 400');

    // Attempt ACCEPT on SETTLED order
    const settledAcceptRes = await apiRequest('POST', '/api/order/action', {
      orderId: order1Id,
      actionType: 'ACCEPT',
      physicalSlipChecked: true,
      deskId: 'DESK_1'
    }, bearer(tokenExch));
    console.log(`Calling ACCEPT on SETTLED order -> status: ${settledAcceptRes.status}`);
    assert.strictEqual(settledAcceptRes.status, 400, 'ACCEPT on SETTLED order must return HTTP 400');

    console.log('✓ SETTLED lifecycle guards PASSED.');

  } finally {
    try {
      serverProcess.kill('SIGINT');
      serverProcess.kill('SIGKILL');
    } catch (e) {}
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.chmodSync(DISPOSABLE_STATE, 0o666);
        fs.unlinkSync(DISPOSABLE_STATE);
      }
    } catch (e) {}
  }

  // STEP 6: POST-FLIGHT HASH
  console.log('\n--- STEP 6: POST-FLIGHT HASH INTEGRITY ---');
  const postHash = getSha256(ORIGINAL_STATE);
  console.log(`Post-flight SHA-256: ${postHash}`);
  assert.strictEqual(postHash, EXPECTED_HASH, 'Post-flight hash mismatch!');
  console.log(`✓ Bit-exact match: ${postHash === EXPECTED_HASH}`);

  console.log('\n======================================================================');
  console.log('🎉 ALL CHALLENGER EMPIRICAL VERIFICATION TESTS PASSED!');
  console.log('======================================================================\n');
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
