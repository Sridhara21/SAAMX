/**
 * ==============================================================================
 * SAAMX '26 — Pre-Deployment Comprehensive E2E Test Runner Suite
 * ==============================================================================
 * File: scripts/test_predeployment_e2e_suite.js
 * Location: SAAMX/scripts/
 * 
 * Architecture:
 * - Opaque-box, requirement-driven 4-tier testing hierarchy.
 * - Ephemeral server on isolated port with disposable state fixture.
 * - Strict preservation of authoritative state.json SHA-256 baseline.
 * - Exercises: /api/orders/submit, /api/order/action, /api/bank/settle,
 *   /api/bank/reject, /api/fx/convert, /api/ipo/bid, /api/ipo/allot,
 *   /api/auth/login, and public routes.
 * ==============================================================================
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

import { generateTimeframeData } from '../src/lib/chartTimeframeEngine.js';
import { generateFullSecurityUniverse } from '../universe_generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TEST_PORT = 3210;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const ORIGINAL_STATE = path.join(ROOT_DIR, 'state.json');
const DISPOSABLE_STATE = path.join(ROOT_DIR, 'state.test-e2e-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

function computeFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function httpRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(url, {
      method,
      headers: reqHeaders,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP request timed out after 10000ms: ${method} ${endpoint}`));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Global Test Registry
const testResults = [];

async function recordTest(tier, domain, id, description, testFn) {
  const startTime = Date.now();
  try {
    await testFn();
    const durationMs = Date.now() - startTime;
    testResults.push({ tier, domain, id, description, status: 'PASS', durationMs, error: null });
    console.log(`  ✓ [${id}] ${description} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    testResults.push({ tier, domain, id, description, status: 'FAIL', durationMs, error: err.message });
    console.error(`  ✗ [${id}] ${description} (${durationMs}ms) -> FAIL: ${err.message}`);
  }
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest('GET', '/api/ping');
      if (res.status === 200) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Isolated test server failed to respond on ${BASE_URL} within ${timeoutMs}ms.`);
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 SAAMX \'26: COMPREHENSIVE PRE-DEPLOYMENT E2E TESTING SUITE');
  console.log('======================================================================\n');

  // 1. Authoritative state hash pre-flight verification
  const initialHash = computeFileHash(ORIGINAL_STATE);
  console.log(`[PRE-FLIGHT] Authoritative state.json hash: ${initialHash}`);
  if (initialHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL INTEGRITY FAILURE: Baseline hash mismatch!\nExpected: ${EXPECTED_HASH}\nFound:    ${initialHash}`);
  }
  console.log('✓ Authoritative state.json bit-exact baseline verified.\n');

  // 2. Prepare disposable state fixture with full 2,849 universe
  const baseData = JSON.parse(fs.readFileSync(ORIGINAL_STATE, 'utf8'));
  const fixture = JSON.parse(JSON.stringify(baseData));

  // Populate complete universe so server.js does not overwrite custom security fields
  fixture.securities = generateFullSecurityUniverse();

  // Configure fixture settings
  fixture.settings = fixture.settings || {};
  fixture.settings.settlementMode = 'TWO_PHASE_BANK';
  fixture.marketState = fixture.marketState || {};
  fixture.marketState.status = 'Open';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';

  // Key test securities configuration
  const sRel = fixture.securities.find(s => s.ticker === 'RELIANCE');
  if (sRel) {
    sRel.status = 'Active';
    sRel.totalUnits = 10000;
    sRel.availableUnits = 5000;
    sRel.currentPrice = 2500;
    sRel.currency = 'INR';
    sRel.exchange = 'NSE';
  }
  const sTcs = fixture.securities.find(s => s.ticker === 'TCS');
  if (sTcs) {
    sTcs.status = 'Active';
    sTcs.totalUnits = 10000;
    sTcs.availableUnits = 5000;
    sTcs.currentPrice = 3500;
    sTcs.currency = 'INR';
    sTcs.exchange = 'NSE';
  }
  const sInfy = fixture.securities.find(s => s.ticker === 'INFY');
  if (sInfy) {
    sInfy.status = 'Active';
    sInfy.totalUnits = 10000;
    sInfy.availableUnits = 5000;
    sInfy.currentPrice = 1500;
    sInfy.currency = 'INR';
    sInfy.exchange = 'NSE';
  }
  const sAapl = fixture.securities.find(s => s.ticker === 'AAPL');
  if (sAapl) {
    sAapl.status = 'Active';
    sAapl.totalUnits = 10000;
    sAapl.availableUnits = 5000;
    sAapl.currentPrice = 180;
    sAapl.currency = 'USD';
    sAapl.exchange = 'NASDAQ';
  }

  // Staged IPO 1: OAI (used for Tier 1 lifecycle)
  let sOai = fixture.securities.find(s => s.ticker === 'OAI');
  if (!sOai) {
    sOai = {
      id: 'SEC_IPO_OAI_01',
      ticker: 'OAI',
      name: 'OpenAI Staged Offering',
      status: 'IPO_STAGED',
      ipoStatus: 'SUBSCRIPTION_OPEN',
      ipoStage: 'SUBSCRIPTION',
      offerPrice: 150,
      lotSize: 10,
      availableFloat: 1000,
      totalUnits: 1000,
      currency: 'USD',
      exchange: 'NASDAQ',
      bids: {}
    };
    fixture.securities.push(sOai);
  } else {
    sOai.status = 'IPO_STAGED';
    sOai.ipoStatus = 'SUBSCRIPTION_OPEN';
    sOai.ipoStage = 'SUBSCRIPTION';
    sOai.offerPrice = 150;
    sOai.lotSize = 10;
    sOai.availableFloat = 1000;
    sOai.totalUnits = 1000;
    sOai.currency = 'USD';
    sOai.bids = {};
  }

  // Staged IPO 2: STRP (used for Tier 2 boundary testing)
  let sStrp = fixture.securities.find(s => s.ticker === 'STRP');
  if (!sStrp) {
    sStrp = {
      id: 'SEC_IPO_STRP_01',
      ticker: 'STRP',
      name: 'Stripe Staged Offering',
      status: 'IPO_STAGED',
      ipoStatus: 'SUBSCRIPTION_OPEN',
      ipoStage: 'SUBSCRIPTION',
      offerPrice: 200,
      lotSize: 10,
      availableFloat: 1000,
      totalUnits: 1000,
      currency: 'USD',
      exchange: 'NASDAQ',
      bids: {}
    };
    fixture.securities.push(sStrp);
  } else {
    sStrp.status = 'IPO_STAGED';
    sStrp.ipoStatus = 'SUBSCRIPTION_OPEN';
    sStrp.ipoStage = 'SUBSCRIPTION';
    sStrp.offerPrice = 200;
    sStrp.lotSize = 10;
    sStrp.availableFloat = 1000;
    sStrp.totalUnits = 1000;
    sStrp.currency = 'USD';
    sStrp.bids = {};
  }

  // Seed wallets for teams T01, T02, T03
  for (const tCode of ['T01', 'T02', 'T03']) {
    let team = (fixture.teams || []).find(t => t.teamCode === tCode || t.id === tCode);
    if (!team) {
      team = {
        id: tCode,
        teamCode: tCode,
        teamName: `Investment House ${tCode}`,
        isActive: true,
        assignedDesk: 'DESK_1',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: tCode === 'T03' ? 0 : 100000,
          GBP: 10000,
          EUR: 10000,
          JPY: 0
        },
        reservedCash: { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0 },
        holdings: { RELIANCE: 100, TCS: 50 },
        ipoReservations: {}
      };
      fixture.teams.push(team);
    } else {
      team.isActive = true;
      team.cashBalance = 10000000;
      team.cashWallets = team.cashWallets || {};
      team.cashWallets.INR = 10000000;
      team.cashWallets.USD = tCode === 'T03' ? 0 : 100000;
      team.cashWallets.GBP = 10000;
      team.cashWallets.EUR = 10000;
      team.cashWallets.JPY = 0;
      team.reservedCash = { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0 };
      team.holdings = team.holdings || {};
      team.holdings.RELIANCE = 100;
      team.holdings.TCS = 50;
      team.ipoReservations = {};
    }
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Created isolated disposable test state with 2,849 universe: ${DISPOSABLE_STATE}`);

  // 3. Spawn isolated test server
  console.log(`Starting isolated test server on port ${TEST_PORT}...`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      STATE_FILE: DISPOSABLE_STATE,
      SAAMX_STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: 'saamx-e2e-predeployment-secret-2026',
      DATABASE_URL: '' // Enforce isolated memory/file fallback mode
    },
    stdio: 'pipe'
  });

  try {
    await waitForServer();
    console.log(`✓ Test server operational on ${BASE_URL}\n`);

    // Authentication Setup
    const adminLogin = await httpRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
    const adminToken = adminLogin.body.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const tellerLogin = await httpRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    assert.strictEqual(tellerLogin.status, 200, 'Bank teller login failed');
    const tellerToken = tellerLogin.body.token;
    const tellerHeaders = { Authorization: `Bearer ${tellerToken}` };

    const sebiLogin = await httpRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    assert.strictEqual(sebiLogin.status, 200, 'SEBI login failed');
    const sebiToken = sebiLogin.body.token;
    const sebiHeaders = { Authorization: `Bearer ${sebiToken}` };

    const t01Login = await httpRequest('POST', '/api/auth/login', { teamCode: 'T01', password: 'team-01' });
    assert.strictEqual(t01Login.status, 200, 'T01 login failed');
    const t01Token = t01Login.body.token;
    const t01Headers = { Authorization: `Bearer ${t01Token}` };

    // =========================================================================
    // TIER 1: FEATURE COVERAGE IN ISOLATION (>=5 test cases per feature)
    // =========================================================================
    console.log('--- EXECUTING TIER 1: FEATURE COVERAGE (7 DOMAINS) ---');

    // 1. Trading Domain (5 cases)
    let tier1OrderId = null;
    let tier1OrderTicket = `TKT-T1-${Date.now()}`;
    await recordTest('Tier 1', 'Trading', 'T1_TRAD_01', 'Submit valid MARKET BUY order', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: tier1OrderTicket,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.orderId || res.body.order?.id);
      tier1OrderId = res.body.orderId || res.body.order?.id;
    });

    await recordTest('Tier 1', 'Trading', 'T1_TRAD_02', 'Validate order under risk and price bands', async () => {
      const res = await httpRequest('POST', '/api/order/action', {
        orderId: tier1OrderId,
        action: 'VALIDATE'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.orderStatus, 'VALIDATED');
    });

    await recordTest('Tier 1', 'Trading', 'T1_TRAD_03', 'Exchange Desk claims order for review', async () => {
      const res = await httpRequest('POST', '/api/order/action', {
        orderId: tier1OrderId,
        action: 'CLAIM_FOR_EXCHANGE',
        deskId: 'DESK_1'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.orderStatus, 'UNDER_EXCHANGE_REVIEW');
    });

    let tier1VoucherRef = null;
    await recordTest('Tier 1', 'Trading', 'T1_TRAD_04', 'Exchange Desk accepts order with two-phase voucher', async () => {
      const res = await httpRequest('POST', '/api/order/action', {
        orderId: tier1OrderId,
        action: 'ACCEPT',
        deskId: 'DESK_1'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.orderStatus, 'EXECUTED_PENDING_SETTLEMENT');
      assert.ok(res.body.voucherReference, 'Must issue voucherReference');
      tier1VoucherRef = res.body.voucherReference;
    });

    await recordTest('Tier 1', 'Trading', 'T1_TRAD_05', 'Exchange Desk rejects order with explicit reason', async () => {
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-T1-REJ-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(sub.status, 200);
      const rejId = sub.body.orderId || sub.body.order?.id;

      const res = await httpRequest('POST', '/api/order/action', {
        orderId: rejId,
        action: 'REJECT',
        rejectionReason: 'Invalid physical paperwork signature'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.orderStatus, 'REJECTED');
      assert.strictEqual(res.body.rejectionReason, 'Invalid physical paperwork signature');
    });

    // 2. Banking Domain (5 cases)
    await recordTest('Tier 1', 'Banking', 'T1_BANK_01', 'Bank Teller queries settlement vouchers', async () => {
      const res = await httpRequest('GET', '/api/bank/settlements', null, tellerHeaders);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const hasVoucher = res.body.some(s => s.voucherReference === tier1VoucherRef);
      assert.ok(hasVoucher, 'Settlements queue must contain generated voucher');
    });

    await recordTest('Tier 1', 'Banking', 'T1_BANK_02', 'Lookup single settlement voucher by reference', async () => {
      const res = await httpRequest('GET', `/api/bank/settlements/${tier1VoucherRef}`, null, tellerHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.voucherReference, tier1VoucherRef);
      assert.strictEqual(res.body.status, 'PENDING');
    });

    await recordTest('Tier 1', 'Banking', 'T1_BANK_03', 'Bank Teller confirms settlement of BUY voucher', async () => {
      const res = await httpRequest('POST', '/api/bank/settle', {
        voucherReference: tier1VoucherRef,
        notes: 'Cash received and confirmed at window'
      }, tellerHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.settlement?.status, 'SETTLED');
      assert.strictEqual(res.body.order?.status, 'SETTLED');
    });

    await recordTest('Tier 1', 'Banking', 'T1_BANK_04', 'Bank Teller rejects settlement voucher with reason', async () => {
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-T1-BREJ-${Date.now()}`,
        teamCode: 'T02',
        ticker: 'TCS',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, adminHeaders);
      const oId = sub.body.orderId || sub.body.order?.id;
      const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
      const vRef = acc.body.voucherReference;

      const res = await httpRequest('POST', '/api/bank/reject', {
        voucherReference: vRef,
        reason: 'Payment slip dishonored at counter'
      }, tellerHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.settlement?.status, 'REJECTED');
      assert.strictEqual(res.body.order?.status, 'SETTLEMENT_REJECTED');
    });

    await recordTest('Tier 1', 'Banking', 'T1_BANK_05', 'Bank Teller settles a SELL voucher', async () => {
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-T1-SELL-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'SELL',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      const oId = sub.body.orderId || sub.body.order?.id;
      const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
      const vRef = acc.body.voucherReference;

      const res = await httpRequest('POST', '/api/bank/settle', {
        voucherReference: vRef,
        notes: 'Sell proceeds disbursed at desk'
      }, tellerHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.settlement?.status, 'SETTLED');
      assert.strictEqual(res.body.settlement?.action, 'SELL');
    });

    // 3. Foreign Exchange (FX) Domain (5 cases)
    await recordTest('Tier 1', 'FX', 'T1_FX_01', 'Query live catalog of FX rates', async () => {
      const res = await httpRequest('GET', '/api/fx/rates');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.fxRates?.USDINR, 'Must contain USDINR');
      assert.ok(res.body.fxRates?.GBPINR, 'Must contain GBPINR');
      assert.ok(res.body.fxRates?.EURINR, 'Must contain EURINR');
    });

    await recordTest('Tier 1', 'FX', 'T1_FX_02', 'Direct FX conversion INR to USD', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 85000
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.fromCurrency, 'INR');
      assert.strictEqual(res.body.toCurrency, 'USD');
      assert.ok(res.body.credited > 0);
    });

    await recordTest('Tier 1', 'FX', 'T1_FX_03', 'Direct FX conversion USD to INR', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'USD',
        toCurrency: 'INR',
        amount: 500
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.fromCurrency, 'USD');
      assert.strictEqual(res.body.toCurrency, 'INR');
      assert.ok(res.body.credited > 0);
    });

    await recordTest('Tier 1', 'FX', 'T1_FX_04', 'Triangular cross-currency conversion GBP to EUR', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'GBP',
        toCurrency: 'EUR',
        amount: 500
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.fromCurrency, 'GBP');
      assert.strictEqual(res.body.toCurrency, 'EUR');
      assert.ok(res.body.credited > 0);
    });

    await recordTest('Tier 1', 'FX', 'T1_FX_05', 'Conversion to zero-decimal currency JPY', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'JPY',
        amount: 50000
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.toCurrency, 'JPY');
      assert.strictEqual(res.body.credited, Math.round(res.body.credited), 'JPY must be rounded to integer');
    });

    // 4. IPO Primary Market Domain (5 cases)
    await recordTest('Tier 1', 'IPO', 'T1_IPO_01', 'Query available staged IPO offerings', async () => {
      const res = await httpRequest('GET', '/api/ipos');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.ipos));
      const hasOai = res.body.ipos.some(i => i.ticker === 'OAI');
      assert.ok(hasOai, 'Staged IPO OAI must be in IPO listing');
    });

    await recordTest('Tier 1', 'IPO', 'T1_IPO_02', 'Team T01 places primary IPO bid on OAI', async () => {
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T01',
        ticker: 'OAI',
        quantity: 20
      }, t01Headers);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.teamBid?.quantity, 20);
    });

    await recordTest('Tier 1', 'IPO', 'T1_IPO_03', 'Team T02 places primary IPO bid on OAI', async () => {
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T02',
        ticker: 'OAI',
        quantity: 40
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.totalSubscription >= 60);
    });

    await recordTest('Tier 1', 'IPO', 'T1_IPO_04', 'Admin triggers pro-rata IPO allotment', async () => {
      const res = await httpRequest('POST', '/api/ipo/allot', {
        ticker: 'OAI'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.allotments?.T01);
      assert.strictEqual(res.body.allotments.T01.allottedQuantity, 20);
    });

    await recordTest('Tier 1', 'IPO', 'T1_IPO_05', 'Admin transitions IPO to ACTIVE listing stage', async () => {
      const res = await httpRequest('POST', '/api/ipo/transition', {
        ticker: 'OAI',
        nextStatus: 'ACTIVE'
      }, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'Active');
    });

    // 5. Role-Based Access Control (RBAC) Domain (5 cases)
    await recordTest('Tier 1', 'RBAC', 'T1_RBAC_01', 'Admin login authenticates with full privileges', async () => {
      const res = await httpRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.role, 'admin');
      assert.ok(res.body.token);
    });

    await recordTest('Tier 1', 'RBAC', 'T1_RBAC_02', 'Bank Teller login authenticates with teller privileges', async () => {
      const res = await httpRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.role, 'bank_teller');
      assert.ok(res.body.permissions.includes('bank.settle'));
    });

    await recordTest('Tier 1', 'RBAC', 'T1_RBAC_03', 'Team participant login authenticates with team scope', async () => {
      const res = await httpRequest('POST', '/api/auth/login', { teamCode: 'T01', password: 'team-01' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.role, 'team');
      assert.strictEqual(res.body.teamCode, 'T01');
    });

    await recordTest('Tier 1', 'RBAC', 'T1_RBAC_04', 'SEBI Surveillance officer login', async () => {
      const res = await httpRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.role, 'sebi');
      assert.ok(res.body.permissions.includes('sebi.surveil'));
    });

    await recordTest('Tier 1', 'RBAC', 'T1_RBAC_05', 'Session introspection me endpoint verifies token validity', async () => {
      const res = await httpRequest('GET', '/api/auth/me', null, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.role, 'admin');
      assert.ok(res.body.authenticated);
    });

    // 6. Navigation & Public Routes Domain (5 cases)
    await recordTest('Tier 1', 'Navigation', 'T1_NAV_01', 'Liveness ping probe endpoint', async () => {
      const res = await httpRequest('GET', '/api/ping');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pong, true);
    });

    await recordTest('Tier 1', 'Navigation', 'T1_NAV_02', 'Subsystem health endpoint', async () => {
      const res = await httpRequest('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
    });

    await recordTest('Tier 1', 'Navigation', 'T1_NAV_03', 'State snapshot endpoint', async () => {
      const res = await httpRequest('GET', '/api/state');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.securities);
      assert.ok(res.body.teams);
      assert.ok(res.body.marketState);
    });

    await recordTest('Tier 1', 'Navigation', 'T1_NAV_04', 'Projector display snapshot endpoint', async () => {
      const res = await httpRequest('GET', '/api/projector/snapshot');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.marketIndices);
      assert.ok(res.body.breadth);
    });

    await recordTest('Tier 1', 'Navigation', 'T1_NAV_05', 'Permissions matrix catalog endpoint (authenticated)', async () => {
      const res = await httpRequest('GET', '/api/permissions/matrix', null, adminHeaders);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.groups);
      assert.ok(res.body.definitions);
      assert.ok(res.body.rolePermissions);
    });

    // 7. Interactive Market Charts Domain (5 cases)
    await recordTest('Tier 1', 'Charts', 'T1_CHART_01', 'Chart timeframe 1D contract & lastPrice invariant', async () => {
      const data = generateTimeframeData({ ticker: 'RELIANCE', currentPrice: 2500, previousClose: 2480 }, '1D');
      assert.strictEqual(data.timeframe, '1D');
      assert.ok(data.points.length >= 5);
      assert.strictEqual(data.lastPrice, 2500);
      assert.strictEqual(data.points[data.points.length - 1].price, 2500);
    });

    await recordTest('Tier 1', 'Charts', 'T1_CHART_02', 'Chart timeframe 1W simulated trajectory contract', async () => {
      const data = generateTimeframeData({ ticker: 'TCS', currentPrice: 3500, previousClose: 3450 }, '1W');
      assert.strictEqual(data.timeframe, '1W');
      assert.ok(data.sourceLabel.includes('Simulated'));
      assert.strictEqual(data.lastPrice, 3500);
    });

    await recordTest('Tier 1', 'Charts', 'T1_CHART_03', 'Chart timeframe 1M simulated model contract', async () => {
      const data = generateTimeframeData({ ticker: 'INFY', currentPrice: 1500, previousClose: 1480 }, '1M');
      assert.strictEqual(data.timeframe, '1M');
      assert.ok(data.sourceLabel.includes('Simulated'));
      assert.strictEqual(data.lastPrice, 1500);
    });

    await recordTest('Tier 1', 'Charts', 'T1_CHART_04', 'Chart timeframe 3M dynamic calendar axis derivation', async () => {
      const data = generateTimeframeData({ ticker: 'AAPL', currentPrice: 180, previousClose: 175 }, '3M');
      assert.strictEqual(data.timeframe, '3M');
      assert.strictEqual(data.xAxisLabels.length, 3);
      assert.strictEqual(data.lastPrice, 180);
    });

    await recordTest('Tier 1', 'Charts', 'T1_CHART_05', 'Chart timeframe 1Y annual macro trend contract', async () => {
      const data = generateTimeframeData({ ticker: 'INDIA50', currentPrice: 5000, previousClose: 4950 }, '1Y');
      assert.strictEqual(data.timeframe, '1Y');
      assert.ok(data.points.length >= 12);
      assert.strictEqual(data.lastPrice, 5000);
    });

    // =========================================================================
    // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases per feature)
    // =========================================================================
    console.log('\n--- EXECUTING TIER 2: BOUNDARY & CORNER CASES (7 DOMAINS) ---');

    // 1. Trading Boundaries (6 cases)
    await recordTest('Tier 2', 'Trading', 'T2_TRAD_01', 'Reject negative quantity order', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-NEG-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: -10,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('positive quantity are required'));
    });

    await recordTest('Tier 2', 'Trading', 'T2_TRAD_02', 'Reject fractional/non-integer quantity order', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-FRAC-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10.5,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('integer positive quantity are required'));
    });

    await recordTest('Tier 2', 'Trading', 'T2_TRAD_03', 'Reject order quantity violating lot size', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-LOT-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'OAI',
        action: 'BUY',
        quantity: 15, // lot size is 10
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('multiple of lot size'));
    });

    await recordTest('Tier 2', 'Trading', 'T2_TRAD_04', 'Reject LIMIT order type under market-orders-only policy', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-LIM-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10,
        orderType: 'LIMIT',
        limitPrice: 2500
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('SAAMX supports MARKET orders only'));
    });

    await recordTest('Tier 2', 'Trading', 'T2_TRAD_05', 'Reject duplicate physical ticket submission', async () => {
      const ticket = `TKT-DUP-${Date.now()}`;
      const first = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: ticket,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(first.status, 200);

      const second = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: ticket,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(second.status, 400);
      assert.ok(second.body.error.includes('Duplicate Ticket Number'));
    });

    await recordTest('Tier 2', 'Trading', 'T2_TRAD_06', 'Reject non-existent security lookup with 404', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-NON-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'NONEXISTENT999',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error.includes('not found in active universe'));
    });

    // 2. Banking Boundaries (5 cases)
    await recordTest('Tier 2', 'Banking', 'T2_BANK_01', 'Reject settlement request with missing settlement key', async () => {
      const res = await httpRequest('POST', '/api/bank/settle', { notes: 'Incomplete' }, tellerHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('is required'));
    });

    await recordTest('Tier 2', 'Banking', 'T2_BANK_02', 'Reject settlement of non-existent voucher with 404', async () => {
      const res = await httpRequest('POST', '/api/bank/settle', { voucherReference: 'BNK-PAY-NONEXIST-9999' }, tellerHeaders);
      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error.includes('Settlement record not found'));
    });

    await recordTest('Tier 2', 'Banking', 'T2_BANK_03', 'Reject participant team attempting bank settlement with 403', async () => {
      const res = await httpRequest('POST', '/api/bank/settle', { voucherReference: tier1VoucherRef }, t01Headers);
      assert.strictEqual(res.status, 403);
      assert.ok(res.body.error.includes('Bank Teller or Administrator privileges'));
    });

    await recordTest('Tier 2', 'Banking', 'T2_BANK_04', 'Reject duplicate settlement replay with 409 Conflict', async () => {
      const res = await httpRequest('POST', '/api/bank/settle', { voucherReference: tier1VoucherRef }, tellerHeaders);
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.includes('Duplicate settlement prevented'));
    });

    await recordTest('Tier 2', 'Banking', 'T2_BANK_05', 'Reject bank voucher rejection when missing mandatory reason', async () => {
      const res = await httpRequest('POST', '/api/bank/reject', { voucherReference: 'BNK-ANY-001' }, tellerHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('explicit reason are required'));
    });

    // 3. FX Boundaries (5 cases)
    await recordTest('Tier 2', 'FX', 'T2_FX_01', 'Reject zero or negative FX conversion amount', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 0
      }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('positive finite amount are required'));
    });

    await recordTest('Tier 2', 'FX', 'T2_FX_02', 'Reject converting currency to itself', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 100
      }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Cannot exchange currency to itself'));
    });

    await recordTest('Tier 2', 'FX', 'T2_FX_03', 'Reject unsupported currency code', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'ZZZ',
        amount: 100
      }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Unsupported currency'));
    });

    await recordTest('Tier 2', 'FX', 'T2_FX_04', 'Reject FX conversion exceeding unreserved cash balance', async () => {
      const res = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 999999999
      }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Insufficient unreserved INR balance'));
    });

    await recordTest('Tier 2', 'FX', 'T2_FX_05', 'Reject duplicate FX ticket number replay', async () => {
      const ticket = `FX-DUP-${Date.now()}`;
      const first = await httpRequest('POST', '/api/fx/convert', {
        ticketNumber: ticket,
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 1000
      }, adminHeaders);
      assert.strictEqual(first.status, 200);

      const second = await httpRequest('POST', '/api/fx/convert', {
        ticketNumber: ticket,
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 1000
      }, adminHeaders);
      assert.strictEqual(second.status, 400);
      assert.ok(second.body.error.includes('already been processed'));
    });

    // 4. IPO Boundaries (5 cases)
    await recordTest('Tier 2', 'IPO', 'T2_IPO_01', 'Reject zero or negative IPO bid quantity', async () => {
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T01',
        ticker: 'STRP',
        quantity: 0
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('positive bid quantity are required'));
    });

    await recordTest('Tier 2', 'IPO', 'T2_IPO_02', 'Reject IPO bid violating lot size', async () => {
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T01',
        ticker: 'STRP',
        quantity: 15 // lot size is 10
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('must be in multiples of lot size'));
    });

    await recordTest('Tier 2', 'IPO', 'T2_IPO_03', 'Reject IPO bid on active secondary market stock', async () => {
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T01',
        ticker: 'RELIANCE',
        quantity: 10
      }, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('not currently accepting primary IPO subscriptions'));
    });

    await recordTest('Tier 2', 'IPO', 'T2_IPO_04', 'Reject IPO bid when currency wallet balance insufficient', async () => {
      // Team T03 has 0 USD balance in fixture
      const res = await httpRequest('POST', '/api/ipo/bid', {
        teamCode: 'T03',
        ticker: 'STRP',
        quantity: 10
      }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Insufficient USD balance'));
    });

    await recordTest('Tier 2', 'IPO', 'T2_IPO_05', 'Reject duplicate IPO allotment execution on finalized IPO', async () => {
      // First allotment finalizes STRP
      const first = await httpRequest('POST', '/api/ipo/allot', { ticker: 'STRP' }, adminHeaders);
      assert.strictEqual(first.status, 200);

      // Duplicate allotment attempt must return 400
      const res = await httpRequest('POST', '/api/ipo/allot', { ticker: 'STRP' }, adminHeaders);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('already been allotted and finalized'));
    });

    // 5. RBAC Boundaries (5 cases)
    await recordTest('Tier 2', 'RBAC', 'T2_RBAC_01', 'Reject unauthenticated access to protected admin route', async () => {
      const res = await httpRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' });
      assert.ok([401, 403].includes(res.status));
    });

    await recordTest('Tier 2', 'RBAC', 'T2_RBAC_02', 'Reject login with invalid password with 401', async () => {
      const res = await httpRequest('POST', '/api/auth/login', { username: 'admin', password: 'wrong-password-999' });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.error);
    });

    await recordTest('Tier 2', 'RBAC', 'T2_RBAC_03', 'Reject team submitting order for another team with 403', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-SPOOF-${Date.now()}`,
        teamCode: 'T02',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, t01Headers); // T01 trying to trade for T02
      assert.strictEqual(res.status, 403);
      assert.ok(res.body.error.includes('cannot submit orders on behalf of team'));
    });

    await recordTest('Tier 2', 'RBAC', 'T2_RBAC_04', 'Reject login for disabled staff account with 403', async () => {
      await httpRequest('POST', '/api/personnel/USR_OBS_01/status', { status: 'DISABLED' }, adminHeaders);
      const res = await httpRequest('POST', '/api/auth/login', { username: 'observer', password: 'observer-event-2026' });
      assert.strictEqual(res.status, 403);
      assert.ok(res.body.error.includes('Account is deactivated'));
    });

    await recordTest('Tier 2', 'RBAC', 'T2_RBAC_05', 'Reject order submission by advisor role with 403', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-ADV-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10,
        role: 'advisor'
      }, adminHeaders);
      assert.strictEqual(res.status, 403);
      assert.ok(res.body.error.includes('Advisors advise; they do not trade'));
    });

    // 6. Navigation Boundaries (5 cases)
    await recordTest('Tier 2', 'Navigation', 'T2_NAV_01', 'Non-existent API route returns 404 gracefully', async () => {
      const res = await httpRequest('GET', '/api/non_existent_route_boundary', null, adminHeaders);
      assert.strictEqual(res.status, 404);
    });

    await recordTest('Tier 2', 'Navigation', 'T2_NAV_02', 'Unauthenticated access to tech-ops metrics returns 401', async () => {
      const res = await httpRequest('GET', '/api/tech-ops/metrics');
      assert.strictEqual(res.status, 401);
    });

    await recordTest('Tier 2', 'Navigation', 'T2_NAV_03', 'Invalid HTTP method on orders endpoint returns 404/405', async () => {
      const res = await httpRequest('DELETE', '/api/orders/submit', null, adminHeaders);
      assert.ok([404, 405].includes(res.status));
    });

    await recordTest('Tier 2', 'Navigation', 'T2_NAV_04', 'Empty payload on order submit returns 400', async () => {
      const res = await httpRequest('POST', '/api/orders/submit', {}, t01Headers);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Missing or invalid parameters'));
    });

    await recordTest('Tier 2', 'Navigation', 'T2_NAV_05', 'Idempotent replay with X-Idempotency-Key returns cached 200', async () => {
      const idemKey = `IDEM-${Date.now()}`;
      const first = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-IDEM-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET',
        idempotencyKey: idemKey
      }, t01Headers);
      assert.strictEqual(first.status, 200);

      const second = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-IDEM-IGNORED-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET',
        idempotencyKey: idemKey
      }, t01Headers);
      assert.strictEqual(second.status, 200);
      assert.strictEqual(second.body.idempotentReplay, true);
    });

    // 7. Charts Boundaries (5 cases)
    await recordTest('Tier 2', 'Charts', 'T2_CHART_01', 'Null instrument parameter handles fallback safely', async () => {
      const data = generateTimeframeData(null, '1D');
      assert.ok(data.points.length >= 5);
      assert.strictEqual(data.lastPrice, 24852.60);
    });

    await recordTest('Tier 2', 'Charts', 'T2_CHART_02', 'Flat day zero price change handles division safely', async () => {
      const data = generateTimeframeData({ ticker: 'FLAT', currentPrice: 100, previousClose: 100 }, '1D');
      assert.strictEqual(data.lastPrice, 100);
      assert.strictEqual(data.points[data.points.length - 1].price, 100);
    });

    await recordTest('Tier 2', 'Charts', 'T2_CHART_03', 'Multi-exchange ticker collision resolves correctly', async () => {
      const nse = generateTimeframeData({ id: 'NSE:RELIANCE', ticker: 'RELIANCE', currentPrice: 2500 }, '1D');
      const bse = generateTimeframeData({ id: 'BSE:RELIANCE', ticker: 'RELIANCE', currentPrice: 2498 }, '1D');
      assert.strictEqual(nse.lastPrice, 2500);
      assert.strictEqual(bse.lastPrice, 2498);
    });

    await recordTest('Tier 2', 'Charts', 'T2_CHART_04', 'Single price point history falls back safely to synthetic curve', async () => {
      const data = generateTimeframeData({
        ticker: 'TEST_SINGLE',
        currentPrice: 100,
        priceHistory: [{ price: 100, timestamp: Date.now() }]
      }, '1D');
      assert.ok(data.points.length >= 5);
      assert.strictEqual(data.lastPrice, 100);
    });

    await recordTest('Tier 2', 'Charts', 'T2_CHART_05', 'Micro-price precision preserves exact currentPrice', async () => {
      const data = generateTimeframeData({ ticker: 'PENNY', currentPrice: 0.15, previousClose: 0.14 }, '1D');
      assert.strictEqual(data.lastPrice, 0.15);
      assert.strictEqual(data.points[data.points.length - 1].price, 0.15);
    });

    // =========================================================================
    // TIER 3: CROSS-FEATURE COMBINATIONS & INTEGRATION PIPELINES
    // =========================================================================
    console.log('\n--- EXECUTING TIER 3: CROSS-FEATURE INTEGRATION PIPELINES ---');

    await recordTest('Tier 3', 'Integration', 'T3_PIPE_01', 'Complete Order-to-Settlement Pipeline (Submit -> Clear -> Settle -> Ledger)', async () => {
      const tkt = `TKT-P1-${Date.now()}`;
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: tkt,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 20,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(sub.status, 200);
      const oId = sub.body.orderId || sub.body.order?.id;

      await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'VALIDATE' }, adminHeaders);

      const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
      assert.strictEqual(acc.status, 200);
      const vRef = acc.body.voucherReference;
      assert.ok(vRef);

      const set = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, tellerHeaders);
      assert.strictEqual(set.status, 200);
      assert.strictEqual(set.body.settlement?.status, 'SETTLED');

      const st = await httpRequest('GET', '/api/state', null, adminHeaders);
      const team = st.body.teams.find(t => t.teamCode === 'T01');
      assert.ok(team.holdings?.RELIANCE >= 120, 'Holdings must reflect 100 initial + 20 new');
    });

    await recordTest('Tier 3', 'Integration', 'T3_PIPE_02', 'Rejection & Rollback Lifecycle (Accept -> Bank Reject -> Float & Cash Restored)', async () => {
      const stBefore = await httpRequest('GET', '/api/state', null, adminHeaders);
      const secBefore = stBefore.body.securities.find(s => s.ticker === 'TCS');
      const floatBefore = secBefore.availableUnits;

      const tkt = `TKT-P2-${Date.now()}`;
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: tkt,
        teamCode: 'T02',
        ticker: 'TCS',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, adminHeaders);
      const oId = sub.body.orderId || sub.body.order?.id;
      const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
      const vRef = acc.body.voucherReference;

      const rej = await httpRequest('POST', '/api/bank/reject', {
        voucherReference: vRef,
        reason: 'Client cancelled at teller window'
      }, tellerHeaders);
      assert.strictEqual(rej.status, 200);
      assert.strictEqual(rej.body.settlement?.status, 'REJECTED');

      const stAfter = await httpRequest('GET', '/api/state', null, adminHeaders);
      const secAfter = stAfter.body.securities.find(s => s.ticker === 'TCS');
      assert.strictEqual(secAfter.availableUnits, floatBefore, 'Float must be 100% restored');
    });

    await recordTest('Tier 3', 'Integration', 'T3_PIPE_03', 'Cross-Border FX to International Equity Settlement (Convert -> Order -> Settle)', async () => {
      const conv = await httpRequest('POST', '/api/fx/convert', {
        teamCode: 'T01',
        fromCurrency: 'INR',
        toCurrency: 'USD',
        amount: 250000
      }, adminHeaders);
      assert.strictEqual(conv.status, 200);

      const tkt = `TKT-US-${Date.now()}`;
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: tkt,
        teamCode: 'T01',
        ticker: 'AAPL',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(sub.status, 200);
      const oId = sub.body.orderId || sub.body.order?.id;

      const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
      assert.strictEqual(acc.status, 200);
      const vRef = acc.body.voucherReference;

      const set = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, tellerHeaders);
      assert.strictEqual(set.status, 200);
      assert.strictEqual(set.body.settlement?.status, 'SETTLED');

      const st = await httpRequest('GET', '/api/state', null, adminHeaders);
      const team = st.body.teams.find(t => t.teamCode === 'T01');
      assert.ok(team.holdings?.AAPL >= 10);
    });

    await recordTest('Tier 3', 'Integration', 'T3_PIPE_04', 'Primary IPO to Secondary Market Liquidity Pipeline', async () => {
      const trans = await httpRequest('POST', '/api/ipo/transition', { ticker: 'OAI', nextStatus: 'ACTIVE' }, adminHeaders);
      assert.strictEqual(trans.status, 200);

      const tkt = `TKT-OAI-SEC-${Date.now()}`;
      const sub = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: tkt,
        teamCode: 'T01',
        ticker: 'OAI',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(sub.status, 200);

      const acc = await httpRequest('POST', '/api/order/action', {
        orderId: sub.body.orderId || sub.body.order?.id,
        action: 'ACCEPT'
      }, adminHeaders);
      assert.strictEqual(acc.status, 200);

      const set = await httpRequest('POST', '/api/bank/settle', {
        voucherReference: acc.body.voucherReference
      }, tellerHeaders);
      assert.strictEqual(set.status, 200);
      assert.strictEqual(set.body.settlement?.status, 'SETTLED');
    });

    await recordTest('Tier 3', 'Integration', 'T3_PIPE_05', 'High Concurrency Multi-Desk Serialization Under Mutex', async () => {
      const orders = [];
      for (let i = 0; i < 10; i++) {
        orders.push(httpRequest('POST', '/api/orders/submit', {
          ticketNumber: `TKT-CONC-${Date.now()}-${i}`,
          teamCode: i % 2 === 0 ? 'T01' : 'T02',
          ticker: 'RELIANCE',
          action: 'BUY',
          quantity: 2,
          orderType: 'MARKET'
        }, adminHeaders));
      }

      const results = await Promise.all(orders);
      const successes = results.filter(r => r.status === 200);
      assert.strictEqual(successes.length, 10, 'All 10 concurrent orders must succeed');
    });

    // =========================================================================
    // TIER 4: REAL-WORLD APPLICATION WORKLOADS
    // =========================================================================
    console.log('\n--- EXECUTING TIER 4: REAL-WORLD APPLICATION WORKLOADS ---');

    await recordTest('Tier 4', 'Workload', 'T4_WORK_01', 'Championship Floor Morning Session Opening Bell', async () => {
      const bell = await httpRequest('POST', '/api/market/control', { action: 'START' }, adminHeaders);
      assert.strictEqual(bell.status, 200);

      const st = await httpRequest('GET', '/api/state', null, adminHeaders);
      assert.strictEqual(st.body.marketState.status, 'Open');
      assert.strictEqual(st.body.marketState.sessionState, 'CONTINUOUS_TRADING');

      const order = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-BELL-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'RELIANCE',
        action: 'BUY',
        quantity: 10,
        orderType: 'MARKET'
      }, t01Headers);
      assert.strictEqual(order.status, 200);
    });

    await recordTest('Tier 4', 'Workload', 'T4_WORK_02', 'Macro Shock & SEBI Regulatory Circuit Breaker Halt', async () => {
      const halt = await httpRequest('POST', '/api/sebi/halt', {
        ticker: 'INFY',
        reason: 'Sudden anomalous volatility exceeding circuit limit'
      }, sebiHeaders);
      assert.strictEqual(halt.status, 200);

      const blocked = await httpRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-HALT-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'INFY',
        action: 'BUY',
        quantity: 5,
        orderType: 'MARKET'
      }, t01Headers);
      const oId = blocked.body?.orderId || blocked.body?.order?.id;
      if (oId) {
        const val = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
        assert.strictEqual(val.status, 400);
        assert.ok(val.body.error.includes('halted') || val.body.error.includes('suspended'));
      }

      const resume = await httpRequest('POST', '/api/sebi/resume', {
        ticker: 'INFY',
        reason: 'Market volatility stabilized'
      }, sebiHeaders);
      assert.strictEqual(resume.status, 200);
    });

    await recordTest('Tier 4', 'Workload', 'T4_WORK_03', 'Stress Settlement Burst with Interleaved Duplicates', async () => {
      const vouchers = [];
      for (let i = 0; i < 5; i++) {
        const sub = await httpRequest('POST', '/api/orders/submit', {
          ticketNumber: `TKT-BURST-${Date.now()}-${i}`,
          teamCode: 'T01',
          ticker: 'RELIANCE',
          action: 'BUY',
          quantity: 2,
          orderType: 'MARKET'
        }, t01Headers);
        const oId = sub.body.orderId || sub.body.order?.id;
        const acc = await httpRequest('POST', '/api/order/action', { orderId: oId, action: 'ACCEPT' }, adminHeaders);
        vouchers.push(acc.body.voucherReference);
      }

      for (const vRef of vouchers) {
        const s = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, tellerHeaders);
        assert.strictEqual(s.status, 200);
      }

      for (const vRef of vouchers) {
        const dup = await httpRequest('POST', '/api/bank/settle', { voucherReference: vRef }, tellerHeaders);
        assert.strictEqual(dup.status, 409, 'Replay of settled voucher must return 409');
      }
    });

    await recordTest('Tier 4', 'Workload', 'T4_WORK_04', 'Complete Day Lifecycle to Valuation Freeze', async () => {
      const pause = await httpRequest('POST', '/api/market/control', { action: 'PAUSE' }, adminHeaders);
      assert.strictEqual(pause.status, 200);

      const st = await httpRequest('GET', '/api/state', null, adminHeaders);
      assert.strictEqual(st.body.marketState.status, 'Paused');

      const proj = await httpRequest('GET', '/api/projector/snapshot');
      assert.strictEqual(proj.status, 200);
      assert.ok(proj.body.marketIndices);
    });

  } finally {
    console.log('\n[TEARDOWN] Terminating isolated test server process...');
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));

    // Cleanup disposable test state files
    for (const f of [DISPOSABLE_STATE, `${DISPOSABLE_STATE}.tmp`]) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
          console.log(`[CLEANUP] Deleted fixture: ${path.basename(f)}`);
        } catch (e) {
          console.warn(`[CLEANUP WARN] Could not delete ${f}: ${e.message}`);
        }
      }
    }

    // 4. Authoritative state hash post-flight verification
    const finalHash = computeFileHash(ORIGINAL_STATE);
    console.log(`[POST-FLIGHT] Authoritative state.json hash: ${finalHash}`);
    if (finalHash !== EXPECTED_HASH) {
      console.error('FATAL ERROR: Authoritative state.json was altered during test execution!');
      process.exit(1);
    }
    console.log('✓ Authoritative state.json verified 100% BIT-FOR-BIT UNTOUCHED.\n');
  }

  // Generate Final Summary Report
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('======================================================================');
  console.log('📊 SAAMX \'26 PRE-DEPLOYMENT E2E TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  console.log(`Total Test Cases Executed : ${total}`);
  console.log(`Passed                    : ${passed}`);
  console.log(`Failed                    : ${failed}`);
  console.log(`Pass Rate                 : ${passRate}%\n`);

  console.log('Tier Breakdown:');
  const tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
  for (const t of tiers) {
    const tierTests = testResults.filter(r => r.tier === t);
    const tierPass = tierTests.filter(r => r.status === 'PASS').length;
    console.log(`  - ${t.padEnd(8)}: ${tierPass}/${tierTests.length} passed (${((tierPass / tierTests.length) * 100).toFixed(1)}%)`);
  }
  console.log('======================================================================');

  if (failed > 0) {
    console.error(`\n❌ TEST SUITE FAILED WITH ${failed} ERRORS.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED WITH 100% SUCCESS RATE. SYSTEM READY FOR DEPLOYMENT.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\nFATAL SUITE RUNNER FAILURE:', err);
  process.exit(1);
});
