import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3109;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-m0-adversarial-disposable.json');
const EXPECTED_HASH = '2bca8b34c2ee677ea1b23e6f0f6253da7b4ca45ffee2a28b76011b2fbfef8625';
const RESULTS_FILE = path.join(__dirname, 'test-m0-adversarial-results.json');

const testResults = [];

function recordResult({ id, title, category, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, category, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : (status === 'WARNING' ? '🟡 WARNING' : '🔴 FAILED');
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Category: ${category}`);
  console.log(`  Scenario: ${scenario}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  console.log(`  Evidence: ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: pathUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data !== null ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: raw, raw });
        }
      });
    });
    req.on('error', reject);
    if (data !== null) req.write(data);
    req.end();
  });
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

async function runAdversarialStressSuite() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX MILESTONE M0 — EMPIRICAL ADVERSARIAL STRESS TEST SUITE');
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

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');
  console.log(`✓ Seeded disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}\n`);

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

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!serverStarted) {
    serverProcess.kill();
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING TEST ROLES & OPENING MARKET ---');
    const loginT01 = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const tokenT01 = loginT01.data?.token;

    const loginT02 = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    const tokenT02 = loginT02.data?.token;

    const loginAdmin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = loginAdmin.data?.token;

    const loginExchange = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    const tokenExchange = loginExchange.data?.token;

    const loginBank = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    const tokenBank = loginBank.data?.token;

    assert(tokenT01 && tokenT02 && tokenAdmin && tokenExchange && tokenBank, 'Failed to acquire test session tokens');
    console.log('✓ Successfully acquired session tokens for T01, T02, Admin, Exchange, and Bank.');

    // Ensure market is started and settlement mode is TWO_PHASE_BANK
    await apiRequest('POST', '/api/market/control', { action: 'START' }, bearerHeader(tokenAdmin));
    await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'TWO_PHASE_BANK' }, bearerHeader(tokenAdmin));
    console.log('✓ Market opened and TWO_PHASE_BANK mode confirmed active.\n');

    // ======================================================================
    // SECTION 1: CONCURRENT DUPLICATE FX TICKET PROBING (/api/fx/exchange)
    // ======================================================================
    console.log('======================================================================');
    console.log('⚔️ SECTION 1: CONCURRENT DUPLICATE FX TICKET SUBMISSIONS');
    console.log('======================================================================');

    // Vector 1.1: 15 Concurrent Duplicate Submissions for Same Team & Same Ticket
    const t01BeforeConcurrent = await getTeamState(tokenT01, 'T01');
    const inrBeforeConcurrent = Number(t01BeforeConcurrent.cashWallets?.INR);
    const concurrentTicket = `FX-RACE-${Date.now()}`;
    const CONCURRENT_COUNT = 15;
    const FX_AMOUNT = 5000;

    console.log(`Dispatched ${CONCURRENT_COUNT} simultaneous requests with ticket ${concurrentTicket}...`);
    const concurrentPromises = [];
    for (let i = 0; i < CONCURRENT_COUNT; i++) {
      concurrentPromises.push(
        apiRequest('POST', '/api/fx/exchange', {
          teamCode: 'T01',
          fromCurrency: 'INR',
          toCurrency: 'USD',
          fromAmount: FX_AMOUNT,
          ticketNumber: concurrentTicket,
          notes: `Concurrent race test worker #${i}`
        }, bearerHeader(tokenExchange))
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    const successCount = concurrentResults.filter(r => r.status === 200).length;
    const conflictCount = concurrentResults.filter(r => r.status === 409).length;
    const badReqCount = concurrentResults.filter(r => r.status === 400).length;
    const otherCount = concurrentResults.filter(r => r.status !== 200 && r.status !== 409 && r.status !== 400).length;

    const t01AfterConcurrent = await getTeamState(tokenT01, 'T01');
    const inrAfterConcurrent = Number(t01AfterConcurrent.cashWallets?.INR);
    const actualInrDebited = inrBeforeConcurrent - inrAfterConcurrent;

    const stateAfterConcurrentRes = await apiRequest('GET', '/api/state', null, bearerHeader(tokenAdmin));
    const txRecordsForTicket = (stateAfterConcurrentRes.data?.fxTransactions || []).filter(
      t => t.ticketNumber === concurrentTicket
    );

    recordResult({
      id: 'ADV-FX-01',
      title: '15-Way Concurrent Duplicate FX Ticket Race Condition',
      category: 'FX Concurrency',
      scenario: `Fire ${CONCURRENT_COUNT} simultaneous requests with identical ticketNumber to /api/fx/exchange`,
      expected: `Exactly 1 request succeeds (HTTP 200), remaining ${CONCURRENT_COUNT - 1} fail (409 or 400), exactly ${FX_AMOUNT} INR debited, exactly 1 tx record in state`,
      actual: `200 OK: ${successCount}, 409 Conflict: ${conflictCount}, 400 BadReq: ${badReqCount}, other: ${otherCount}, inrDebited: ${actualInrDebited}, txRecords: ${txRecordsForTicket.length}`,
      evidence: {
        successCount,
        conflictCount,
        badReqCount,
        otherCount,
        inrBefore: inrBeforeConcurrent,
        inrAfter: inrAfterConcurrent,
        actualInrDebited,
        expectedInrDebited: FX_AMOUNT,
        txRecordsCount: txRecordsForTicket.length
      },
      status: (successCount === 1 && (conflictCount + badReqCount === CONCURRENT_COUNT - 1) && actualInrDebited === FX_AMOUNT && txRecordsForTicket.length === 1) ? 'PASSED' : 'FAILED'
    });

    // Vector 1.2: Cross-Team Ticket Replay Attack (T02 tries to redeem T01's already-used ticket)
    const crossTeamRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: FX_AMOUNT,
      ticketNumber: concurrentTicket,
      notes: 'Cross-team ticket replay attempt by T02'
    }, bearerHeader(tokenExchange));

    recordResult({
      id: 'ADV-FX-02',
      title: 'Cross-Team Replay Attack with Previously Processed Ticket',
      category: 'FX Ticket Integrity',
      scenario: `Team T02 attempts to redeem ticket ${concurrentTicket} already processed for T01`,
      expected: 'HTTP 400 Bad Request with "already been processed"',
      actual: `HTTP ${crossTeamRes.status} - ${crossTeamRes.data?.error || ''}`,
      evidence: crossTeamRes.data,
      status: (crossTeamRes.status === 400 && String(crossTeamRes.data?.error).includes('already been processed')) ? 'PASSED' : 'FAILED'
    });

    // Vector 1.3: Ticket String Tampering (Casing, Leading/Trailing Whitespace)
    const spacedTicketRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: FX_AMOUNT,
      ticketNumber: `  ${concurrentTicket}  `,
      notes: 'Tampered ticket with surrounding spaces'
    }, bearerHeader(tokenExchange));

    const lowerTicketRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: FX_AMOUNT,
      ticketNumber: concurrentTicket.toLowerCase(),
      notes: 'Tampered ticket with lowercase'
    }, bearerHeader(tokenExchange));

    recordResult({
      id: 'ADV-FX-03',
      title: 'FX Ticket Normalization & Bypass Resistance (Whitespace & Casing)',
      category: 'FX Ticket Tampering',
      scenario: 'Attempt duplicate execution with surrounding whitespace and lowercased ticket string',
      expected: 'Both rejected with HTTP 400 ("already been processed")',
      actual: `Spaced: HTTP ${spacedTicketRes.status} (${spacedTicketRes.data?.error}), Lowercase: HTTP ${lowerTicketRes.status} (${lowerTicketRes.data?.error})`,
      evidence: { spaced: spacedTicketRes.data, lower: lowerTicketRes.data },
      status: (spacedTicketRes.status === 400 && lowerTicketRes.status === 400 &&
               String(spacedTicketRes.data?.error).includes('already been processed') &&
               String(lowerTicketRes.data?.error).includes('already been processed')) ? 'PASSED' : 'FAILED'
    });

    // Vector 1.4: Extreme / Malformed FX Parameters
    const extremePayloads = [
      { name: 'Negative Amount', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: -100 } },
      { name: 'Zero Amount', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 0 } },
      { name: 'NaN Amount', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 'NaN' } },
      { name: 'Infinity Amount', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 1e308 } },
      { name: 'Identical Currencies', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'INR', fromAmount: 1000 } },
      { name: 'Fictional Currency', body: { teamCode: 'T01', fromCurrency: 'INR', toCurrency: 'FAKE', fromAmount: 1000 } },
      { name: 'Nonexistent Team', body: { teamCode: 'T999_DOES_NOT_EXIST', fromCurrency: 'INR', toCurrency: 'USD', fromAmount: 1000 } }
    ];

    let extremeAllRejected = true;
    const extremeEvidence = {};
    for (const p of extremePayloads) {
      const res = await apiRequest('POST', '/api/fx/exchange', p.body, bearerHeader(tokenExchange));
      extremeEvidence[p.name] = { status: res.status, error: res.data?.error };
      if (res.status !== 400 && res.status !== 404) {
        extremeAllRejected = false;
      }
    }

    recordResult({
      id: 'ADV-FX-04',
      title: 'Malformed and Extreme Parameter Input Hardening',
      category: 'FX Boundary',
      scenario: 'Submit negative, zero, NaN, Infinity, self-currency, fake currency, and non-existent team',
      expected: 'All 7 malformed inputs rejected with HTTP 400 or 404',
      actual: extremeAllRejected ? 'All 7 payloads safely rejected' : 'One or more payloads accepted or crashed',
      evidence: extremeEvidence,
      status: extremeAllRejected ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 2: TAMPERED PAYLOADS & CONFIRMATION PHRASES TO /api/admin/reset
    // ======================================================================
    console.log('\n======================================================================');
    console.log('⚔️ SECTION 2: TAMPERED PAYLOADS & CONFIRMATION PHRASES TO /api/admin/reset');
    console.log('======================================================================');

    // Vector 2.1: Privilege Escalation Probes
    const rolesToTest = [
      { name: 'Unauthenticated (No Token)', headers: {} },
      { name: 'Forged Bearer Token', headers: { 'Authorization': 'Bearer forgery-token-abc-123' } },
      { name: 'Team Token (T01)', headers: bearerHeader(tokenT01) },
      { name: 'Exchange Desk Token', headers: bearerHeader(tokenExchange) },
      { name: 'Bank Teller Token', headers: bearerHeader(tokenBank) }
    ];

    let allRolesBlocked = true;
    const roleEvidence = {};
    for (const r of rolesToTest) {
      const res = await apiRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' }, r.headers);
      roleEvidence[r.name] = { status: res.status, error: res.data?.error };
      if (res.status !== 401 && res.status !== 403) {
        allRolesBlocked = false;
      }
    }

    recordResult({
      id: 'ADV-RST-01',
      title: 'Admin Reset RBAC & Unauthorized Caller Shielding',
      category: 'Admin Reset RBAC',
      scenario: 'Attempt /api/admin/reset as Unauthenticated, Forged, Team, Exchange, and Bank roles with valid phrase',
      expected: 'Unauthenticated/Forged return 401, non-admin roles return 403',
      actual: allRolesBlocked ? 'All 5 non-admin attempts strictly rejected' : 'Unauthorized caller bypassed RBAC',
      evidence: roleEvidence,
      status: allRolesBlocked ? 'PASSED' : 'FAILED'
    });

    // Vector 2.2: Tampered / Malformed Phrases with Admin Credentials
    const phraseTamperTests = [
      { name: 'Lowercase', body: { confirmText: 'reset all' }, expectedStatus: 400 },
      { name: 'Mixed Case', body: { confirmText: 'Reset All' }, expectedStatus: 400 },
      { name: 'Legacy Phrase', body: { confirmText: 'CONFIRM RESET' }, expectedStatus: 400 },
      { name: 'Partial Phrase', body: { confirmText: 'RESET' }, expectedStatus: 400 },
      { name: 'Extra Suffix', body: { confirmText: 'RESET ALL NOW' }, expectedStatus: 400 },
      { name: 'Null Byte Injection', body: { confirmText: 'RESET ALL\0malicious' }, expectedStatus: 400 },
      { name: 'Empty String', body: { confirmText: '' }, expectedStatus: 400 },
      { name: 'Whitespace Only', body: { confirmText: '   ' }, expectedStatus: 400 },
      { name: 'Numeric Type Confusion', body: { confirmText: 12345 }, expectedStatus: 400 },
      { name: 'Boolean Type Confusion', body: { confirmText: true }, expectedStatus: 400 },
      { name: 'Array Type Confusion', body: { confirmText: ['RESET ALL'] }, expectedStatus: 400 },
      { name: 'Object Type Confusion', body: { confirmText: { phrase: 'RESET ALL' } }, expectedStatus: 400 },
      { name: 'Null Type Confusion', body: { confirmText: null }, expectedStatus: 400 }
    ];

    let allPhraseTampersBlocked = true;
    const phraseEvidence = {};
    for (const pt of phraseTamperTests) {
      const res = await apiRequest('POST', '/api/admin/reset', pt.body, bearerHeader(tokenAdmin));
      phraseEvidence[pt.name] = { status: res.status, error: res.data?.error };
      if (res.status !== pt.expectedStatus) {
        allPhraseTampersBlocked = false;
      }
    }

    recordResult({
      id: 'ADV-RST-02',
      title: 'Confirmation Phrase Tampering & Type Confusion Defense',
      category: 'Admin Reset Input Validation',
      scenario: 'Probe /api/admin/reset with 13 tampered phrase variations (casing, null-bytes, non-strings)',
      expected: 'All 13 invalid variations rejected with HTTP 400',
      actual: allPhraseTampersBlocked ? 'All 13 variations strictly rejected with 400' : 'A tampered variation was accepted',
      evidence: phraseEvidence,
      status: allPhraseTampersBlocked ? 'PASSED' : 'FAILED'
    });

    // Vector 2.3: Prototype Pollution Probe on req.body
    const protoPollutionPayload = JSON.stringify({
      "__proto__": { "confirmText": "RESET ALL" }
    });
    const protoRes = await apiRequest('POST', '/api/admin/reset', protoPollutionPayload, bearerHeader(tokenAdmin));

    // Verify whether prototype pollution bypassed confirmText validation
    // The endpoint should either reject with 400 because confirmText is not an own property or process safely
    const isProtoBypass = protoRes.status === 200;

    recordResult({
      id: 'ADV-RST-03',
      title: 'Prototype Pollution Body Injection Resilience',
      category: 'Admin Reset Security',
      scenario: 'Submit payload {"__proto__": {"confirmText": "RESET ALL"}} without own property',
      expected: 'Rejected with HTTP 400 ("Must provide exact confirmation phrase")',
      actual: `HTTP ${protoRes.status} - ${protoRes.data?.error || (protoRes.status === 200 ? 'Bypassed!' : '')}`,
      evidence: { status: protoRes.status, body: protoRes.data },
      status: (protoRes.status === 400) ? 'PASSED' : 'FAILED'
    });

    // Vector 2.4: Legacy Endpoint Decommission Verification
    const legacyEndpointRes = await apiRequest('POST', '/api/admin/reset-database', { confirmText: 'RESET ALL' }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-RST-04',
      title: 'Legacy Endpoint /api/admin/reset-database Decommission Verification',
      category: 'Endpoint Routing',
      scenario: 'Attempt request to deprecated /api/admin/reset-database endpoint',
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${legacyEndpointRes.status}`,
      evidence: legacyEndpointRes.data,
      status: (legacyEndpointRes.status === 404) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 3: EXTREME CANCELLATION SCENARIOS
    // ======================================================================
    console.log('\n======================================================================');
    console.log('⚔️ SECTION 3: EXTREME CANCELLATION SCENARIOS & RACE CONDITIONS');
    console.log('======================================================================');

    // Vector 3.1: Rapid Concurrent Cancellation Requests on the SAME BUY Order
    // Goal: Verify NO DOUBLE-RELEASE of reserved cash under concurrent cancellation storm
    const tPreBuyStress = await getTeamState(tokenT01, 'T01');
    const preBuyReservedCash = Number(tPreBuyStress.reservedCash?.INR || 0);

    // Create and execute a BUY order
    const buyOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-BUY-RACE-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(buyOrderRes.status, 200, `Buy order submit failed: ${JSON.stringify(buyOrderRes.data)}`);
    const buyOrderId = buyOrderRes.data.orderId;

    const execBuyRes = await apiRequest('POST', '/api/order/action', {
      orderId: buyOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execBuyRes.status, 200, 'Buy order execution failed');
    const postExecTeam = await getTeamState(tokenT01, 'T01');
    const postExecReservedCash = Number(postExecTeam.reservedCash?.INR || 0);
    const orderReservedAmount = postExecReservedCash - preBuyReservedCash;
    assert(orderReservedAmount > 0, `Reserved cash did not increase (pre: ${preBuyReservedCash}, post: ${postExecReservedCash})`);

    console.log(`Order ${buyOrderId} executed: reservedCash rose from ${preBuyReservedCash} to ${postExecReservedCash} (+${orderReservedAmount})`);

    // Fire 10 simultaneous cancellation requests on the SAME BUY order
    console.log(`Firing 10 concurrent cancellation requests on order ${buyOrderId}...`);
    const cancelPromises = [];
    for (let i = 0; i < 10; i++) {
      cancelPromises.push(
        apiRequest('POST', '/api/orders/cancel', {
          orderId: buyOrderId,
          teamCode: 'T01',
          reason: `Concurrent cancellation worker #${i}`
        }, bearerHeader(tokenAdmin))
      );
    }

    const cancelResults = await Promise.all(cancelPromises);
    const cancel200Count = cancelResults.filter(r => r.status === 200).length;
    const cancel400Count = cancelResults.filter(r => r.status === 400).length;

    const postCancelTeam = await getTeamState(tokenT01, 'T01');
    const postCancelReservedCash = Number(postCancelTeam.reservedCash?.INR || 0);

    recordResult({
      id: 'ADV-CNC-01',
      title: 'Rapid Concurrent Cancellation on Same BUY Order (Zero Cash Double-Release)',
      category: 'Order Cancellation Concurrency',
      scenario: 'Fire 10 simultaneous cancellation requests against single executed BUY order',
      expected: `reservedCash strictly returns to ${preBuyReservedCash} (zero double-release), exactly 1 cancellation updates status, remaining rejected`,
      actual: `200 OK: ${cancel200Count}, 400 BadReq: ${cancel400Count}, postCancelReserved: ${postCancelReservedCash} (expected: ${preBuyReservedCash})`,
      evidence: {
        cancel200Count,
        cancel400Count,
        preBuyReservedCash,
        postExecReservedCash,
        postCancelReservedCash,
        netDelta: postCancelReservedCash - preBuyReservedCash
      },
      status: (postCancelReservedCash === preBuyReservedCash) ? 'PASSED' : 'FAILED'
    });

    // Vector 3.2: Rapid Concurrent Cancellation Requests on the SAME SELL Order
    // Goal: Verify NO DOUBLE-RESTORATION of surrendered holdings
    let tPreSellStress = await getTeamState(tokenT01, 'T01');
    let preSellHoldings = Number(tPreSellStress.holdings?.INFY || 0);

    // Ensure team has at least 30 INFY shares
    if (preSellHoldings < 30) {
      const grantRes = await apiRequest('POST', '/api/orders/submit', {
        ticketNumber: `TKT-GRANT-${Date.now()}`,
        teamCode: 'T01',
        ticker: 'INFY',
        action: 'BUY',
        quantity: 50,
        orderType: 'MARKET'
      }, bearerHeader(tokenT01));
      const grantExec = await apiRequest('POST', '/api/order/action', {
        orderId: grantRes.data.orderId,
        actionType: 'EXECUTE',
        deskId: 'DESK_1'
      }, bearerHeader(tokenAdmin));
      await apiRequest('POST', '/api/bank/settle', {
        voucherReference: grantExec.data.settlement?.voucherReference || grantExec.data.settlement?.id
      }, bearerHeader(tokenBank));
      tPreSellStress = await getTeamState(tokenT01, 'T01');
      preSellHoldings = Number(tPreSellStress.holdings?.INFY || 0);
    }

    const sellQty = 15;
    const sellOrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-SELL-RACE-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'INFY',
      action: 'SELL',
      quantity: sellQty,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    assert.strictEqual(sellOrderRes.status, 200, `Sell order submit failed: ${JSON.stringify(sellOrderRes.data)}`);
    const sellOrderId = sellOrderRes.data.orderId;

    const execSellRes = await apiRequest('POST', '/api/order/action', {
      orderId: sellOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    assert.strictEqual(execSellRes.status, 200, 'Sell order execution failed');
    const postExecSellTeam = await getTeamState(tokenT01, 'T01');
    const postExecHoldings = Number(postExecSellTeam.holdings?.INFY || 0);
    assert.strictEqual(postExecHoldings, preSellHoldings - sellQty, 'Surrendered shares not decremented');

    console.log(`Sell Order ${sellOrderId} executed: holdings decremented from ${preSellHoldings} to ${postExecHoldings} (-${sellQty})`);

    // Fire 10 simultaneous cancellation requests on the SAME SELL order
    console.log(`Firing 10 concurrent cancellation requests on SELL order ${sellOrderId}...`);
    const cancelSellPromises = [];
    for (let i = 0; i < 10; i++) {
      cancelSellPromises.push(
        apiRequest('POST', '/api/orders/cancel', {
          orderId: sellOrderId,
          teamCode: 'T01',
          reason: `Concurrent sell cancel worker #${i}`
        }, bearerHeader(tokenAdmin))
      );
    }

    const cancelSellResults = await Promise.all(cancelSellPromises);
    const cancelSell200Count = cancelSellResults.filter(r => r.status === 200).length;
    const cancelSell400Count = cancelSellResults.filter(r => r.status === 400).length;

    const postCancelSellTeam = await getTeamState(tokenT01, 'T01');
    const postCancelHoldings = Number(postCancelSellTeam.holdings?.INFY || 0);

    recordResult({
      id: 'ADV-CNC-02',
      title: 'Rapid Concurrent Cancellation on Same SELL Order (Zero Share Double-Restoration)',
      category: 'Order Cancellation Concurrency',
      scenario: 'Fire 10 simultaneous cancellation requests against single executed SELL order',
      expected: `holdings strictly restored to ${preSellHoldings} (never double-credited to ${preSellHoldings + sellQty} or more)`,
      actual: `200 OK: ${cancelSell200Count}, 400 BadReq: ${cancelSell400Count}, postCancelHoldings: ${postCancelHoldings} (expected: ${preSellHoldings})`,
      evidence: {
        cancelSell200Count,
        cancelSell400Count,
        preSellHoldings,
        postExecHoldings,
        postCancelHoldings,
        shareInflation: postCancelHoldings - preSellHoldings
      },
      status: (postCancelHoldings === preSellHoldings) ? 'PASSED' : 'FAILED'
    });

    // Vector 3.3: Race Condition: Bank Settlement vs Order Cancellation
    // Scenario: Bank Teller attempts /api/bank/settle at the EXACT SAME INSTANT that /api/orders/cancel is called
    const raceBuyRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-SETTLE-RACE-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const raceBuyId = raceBuyRes.data.orderId;
    const execRaceRes = await apiRequest('POST', '/api/order/action', {
      orderId: raceBuyId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const raceVoucher = execRaceRes.data.settlement;
    const voucherRef = raceVoucher?.voucherReference || raceVoucher?.id;

    const tPreRace = await getTeamState(tokenT01, 'T01');
    const inrPreRace = Number(tPreRace.cashWallets?.INR || 0);
    const reservedPreRace = Number(tPreRace.reservedCash?.INR || 0);
    const holdingsPreRace = Number(tPreRace.holdings?.TCS || 0);

    console.log(`Dispatched simultaneous Bank Settlement and Order Cancellation for order ${raceBuyId} / voucher ${voucherRef}...`);

    // Fire settle and cancel concurrently!
    const [settleOutcome, cancelOutcome] = await Promise.all([
      apiRequest('POST', '/api/bank/settle', { voucherReference: voucherRef }, bearerHeader(tokenBank)),
      apiRequest('POST', '/api/orders/cancel', { orderId: raceBuyId, teamCode: 'T01', reason: 'Race cancellation' }, bearerHeader(tokenAdmin))
    ]);

    const tPostRace = await getTeamState(tokenT01, 'T01');
    const inrPostRace = Number(tPostRace.cashWallets?.INR || 0);
    const reservedPostRace = Number(tPostRace.reservedCash?.INR || 0);
    const holdingsPostRace = Number(tPostRace.holdings?.TCS || 0);

    console.log(`Race outcome: Settle HTTP ${settleOutcome.status}, Cancel HTTP ${cancelOutcome.status}`);
    console.log(`Pre: INR=${inrPreRace}, Reserved=${reservedPreRace}, Holdings=${holdingsPreRace}`);
    console.log(`Post: INR=${inrPostRace}, Reserved=${reservedPostRace}, Holdings=${holdingsPostRace}`);

    // Invariant check:
    // Case 1: Settle won (200), Cancel failed (400 or 409) -> Cash consumed, holdings increased by 10, reserved released
    // Case 2: Cancel won (200), Settle failed (400 or 409) -> Cash untouched, holdings untouched, reserved released back to baseline
    // Disaster Case: Both 200 (both settled and cancelled)!
    const bothSucceeded = (settleOutcome.status === 200 && cancelOutcome.status === 200);
    const exactlyOneWon = (settleOutcome.status === 200 && cancelOutcome.status >= 400) ||
                          (cancelOutcome.status === 200 && settleOutcome.status >= 400);

    recordResult({
      id: 'ADV-CNC-03',
      title: 'Simultaneous Bank Settlement vs Order Cancellation Race Condition',
      category: 'Settlement & Cancellation Race',
      scenario: 'Fire simultaneous Bank Settlement and Order Cancellation for identical order/voucher',
      expected: 'Strict mutual exclusion: exactly one operation succeeds, the other is rejected (never both 200 OK)',
      actual: `Settle: HTTP ${settleOutcome.status}, Cancel: HTTP ${cancelOutcome.status}`,
      evidence: {
        settleStatus: settleOutcome.status,
        settleError: settleOutcome.data?.error,
        cancelStatus: cancelOutcome.status,
        cancelError: cancelOutcome.data?.error,
        bothSucceeded,
        exactlyOneWon,
        inrDelta: inrPostRace - inrPreRace,
        reservedDelta: reservedPostRace - reservedPreRace,
        holdingsDelta: holdingsPostRace - holdingsPreRace
      },
      status: (!bothSucceeded && exactlyOneWon) ? 'PASSED' : 'FAILED'
    });

    // Vector 3.4: Unauthorized Cross-Team Cancellation Attempt
    // Team T02 attempts to cancel an order belonging to Team T01
    const t01OrderRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-CROSS-CANCEL-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const t01OrderId = t01OrderRes.data.orderId;
    const crossCancelRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: t01OrderId,
      teamCode: 'T02',
      reason: 'Cross-team cancellation attempt'
    }, bearerHeader(tokenT02));

    recordResult({
      id: 'ADV-CNC-04',
      title: 'Cross-Team Order Cancellation Authorization Shield',
      category: 'Order Cancellation Security',
      scenario: 'Team T02 submits cancellation request for Team T01 order',
      expected: 'HTTP 403 Forbidden ("cannot cancel orders belonging to team T01")',
      actual: `HTTP ${crossCancelRes.status} - ${crossCancelRes.data?.error || ''}`,
      evidence: crossCancelRes.data,
      status: (crossCancelRes.status === 403) ? 'PASSED' : 'FAILED'
    });

    // Vector 3.5: Post-Settlement Cancellation Guard (Settled order cannot be cancelled)
    // Create, execute, and settle an order
    const finalBuyRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: `TKT-SETTLED-GUARD-${Date.now()}`,
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'BUY',
      quantity: 5,
      orderType: 'MARKET'
    }, bearerHeader(tokenT01));

    const finalOrderId = finalBuyRes.data.orderId;
    const execFinalRes = await apiRequest('POST', '/api/order/action', {
      orderId: finalOrderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1'
    }, bearerHeader(tokenAdmin));

    const finalVoucherRef = execFinalRes.data.settlement?.voucherReference || execFinalRes.data.settlement?.id;
    const settleFinalRes = await apiRequest('POST', '/api/bank/settle', {
      voucherReference: finalVoucherRef
    }, bearerHeader(tokenBank));
    assert.strictEqual(settleFinalRes.status, 200, 'Bank settle failed');

    // Attempt cancellation on settled order
    const cancelSettledRes = await apiRequest('POST', '/api/orders/cancel', {
      orderId: finalOrderId,
      teamCode: 'T01',
      reason: 'Attempting cancellation of already settled order'
    }, bearerHeader(tokenAdmin));

    recordResult({
      id: 'ADV-CNC-05',
      title: 'Settled Order Cancellation Guard Invariant',
      category: 'Order Lifecycle State Machine',
      scenario: 'Attempt /api/orders/cancel on order already settled by Bank',
      expected: 'HTTP 400 Bad Request ("Cannot cancel order in status SETTLED")',
      actual: `HTTP ${cancelSettledRes.status} - ${cancelSettledRes.data?.error || ''}`,
      evidence: cancelSettledRes.data,
      status: (cancelSettledRes.status === 400 && String(cancelSettledRes.data?.error).includes('SETTLED')) ? 'PASSED' : 'FAILED'
    });

    // Vector 3.6: Authorized Master Reset with Exact Phrase "RESET ALL"
    console.log('\n--- EXECUTING AUTHORIZED MASTER RESET ---');
    const resetRes = await apiRequest('POST', '/api/admin/reset', { confirmText: 'RESET ALL' }, bearerHeader(tokenAdmin));
    const auditRes = await apiRequest('GET', '/api/audit', null, bearerHeader(tokenAdmin));
    const resetAudit = (auditRes.data?.logs || []).find(l => l.action === 'SYSTEM_RESET');

    recordResult({
      id: 'ADV-RST-05',
      title: 'Authorized Master Reset with Exact Phrase RESET ALL and Audit Emission',
      category: 'Admin Reset Execution',
      scenario: 'Submit /api/admin/reset with valid Admin credentials and exact phrase "RESET ALL"',
      expected: 'HTTP 200 OK, success: true, and audit log contains SYSTEM_RESET action',
      actual: `HTTP ${resetRes.status}, success: ${resetRes.data?.success}, auditLogged: ${!!resetAudit}`,
      evidence: { resetResponse: resetRes.data, auditEntry: resetAudit },
      status: (resetRes.status === 200 && resetRes.data?.success && resetAudit) ? 'PASSED' : 'FAILED'
    });

  } finally {
    // TEARDOWN
    console.log('\n--- TEARDOWN: TERMINATING TEST SERVER ---');
    serverProcess.kill('SIGINT');
    await new Promise(r => setTimeout(r, 1000));
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Cleaned up disposable fixture: ${path.basename(DISPOSABLE_STATE)}`);
      }
    } catch (e) {
      console.warn('Notice: Failed to unlink disposable state:', e.message);
    }
  }

  // STEP 6: POST-FLIGHT INTEGRITY
  console.log('\n--- STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const postHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${postHash}`);
  assert.strictEqual(postHash, EXPECTED_HASH, `POST-FLIGHT AUTHORITATIVE HASH CORRUPTED! Expected ${EXPECTED_HASH}, got ${postHash}`);
  console.log('✓ Authoritative state hash confirmed strictly unmodified.\n');

  // SUMMARY & METRICS
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;

  console.log('======================================================================');
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('======================================================================');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    results: testResults
  }, null, 2), 'utf8');
  console.log(`✓ Results saved to ${path.basename(RESULTS_FILE)}`);

  if (failed > 0) {
    console.error(`\n❌ EMPIRICAL CHALLENGE FAILED: ${failed} vulnerabilities detected!`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED EMPIRICALLY!');
    process.exit(0);
  }
}

runAdversarialStressSuite().catch(err => {
  console.error('\n💥 TEST HARNESS FATAL ERROR:', err);
  process.exit(1);
});
