import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3028;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ISOLATED_STATE_FILE = path.join(__dirname, 'test-state-phoenix-route.json');
const ORIGINAL_STATE_FILE = path.join(__dirname, 'state.json');

function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) { json = raw; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer(baseUrl) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await request('GET', '/api/state');
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Server failed to start at ${baseUrl}`);
}

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function run() {
  console.log('======================================================================');
  console.log('🔥 SAAMX — PHASE 7A.2 PROJECT PHOENIX ROUTE INTEGRITY & REMEDIATION SUITE');
  console.log('======================================================================\n');

  const initialRealHash = getFileHash(ORIGINAL_STATE_FILE);
  console.log(`Initial state.json hash verified: ${initialRealHash}`);

  // Seed isolated state file from state.json
  const baselineState = JSON.parse(fs.readFileSync(ORIGINAL_STATE_FILE, 'utf8'));
  fs.writeFileSync(ISOLATED_STATE_FILE, JSON.stringify(baselineState, null, 2), 'utf8');

  // Spawn isolated test server
  console.log(`Spawning isolated server on port ${PORT} using ${path.basename(ISOLATED_STATE_FILE)}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: ISOLATED_STATE_FILE,
      SAAMX_TEST_SECRET: 'fms-event-2026'
    },
    stdio: 'pipe'
  });

  serverProc.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      console.error('[Server stderr]', msg);
    }
  });

  try {
    await waitForServer(BASE_URL);
    console.log('✓ Isolated test server is online and responding.\n');

    // ------------------------------------------------------------------
    // TEST 1: UNAUTHENTICATED REQUEST REJECTION
    // ------------------------------------------------------------------
    console.log('--- TEST 1: UNAUTHENTICATED REQUEST REJECTION ---');
    const unauthRes = await request('POST', '/api/admin/phoenix-act', { actNumber: 1 });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    assert(unauthRes.data.error, 'Must return error message');
    console.log('✓ Unauthenticated request rejected with HTTP 401.');

    // ------------------------------------------------------------------
    // TEST 2: UNAUTHORIZED ROLE REJECTION (TEAM ACCOUNT)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: UNAUTHORIZED ROLE REJECTION ---');
    const teamLogin = await request('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    assert.strictEqual(teamLogin.status, 200, 'Team login must succeed');
    const teamToken = teamLogin.data.token;

    const teamPhoenixRes = await request('POST', '/api/admin/phoenix-act', { actNumber: 1 }, {
      'Authorization': `Bearer ${teamToken}`
    });
    assert.strictEqual(teamPhoenixRes.status, 403, 'Team account must be forbidden (HTTP 403)');
    console.log('✓ Student team forbidden from triggering Phoenix acts (HTTP 403).');

    // ------------------------------------------------------------------
    // TEST 3: INPUT VALIDATION & BAD PAYLOAD HANDLING
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: INPUT VALIDATION & ERROR HANDLING ---');
    // Admin login
    const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    assert.strictEqual(adminLogin.status, 200, 'Admin login must succeed');
    const adminToken = adminLogin.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // Missing payload
    const missingRes = await request('POST', '/api/admin/phoenix-act', {}, adminHeaders);
    assert.strictEqual(missingRes.status, 400, 'Empty payload must return 400');

    // Invalid non-integer actNumber
    const invalidRes1 = await request('POST', '/api/admin/phoenix-act', { actNumber: 'invalid' }, adminHeaders);
    assert.strictEqual(invalidRes1.status, 400, 'Non-integer actNumber must return 400');

    // Out-of-range actNumber
    const invalidRes2 = await request('POST', '/api/admin/phoenix-act', { actNumber: 99 }, adminHeaders);
    assert.strictEqual(invalidRes2.status, 400, 'Out-of-range actNumber must return 400');
    console.log('✓ Input validation correctly rejects missing, non-integer, and out-of-range acts with HTTP 400.');

    // ------------------------------------------------------------------
    // TEST 4: AUTHORIZED EXECUTION OF ACT 1 (DTAI LOSS ANNOUNCEMENT)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: AUTHORIZED EXECUTION OF ACT 1 ---');
    // Read state before act 1
    const preState = (await request('GET', '/api/state', null, adminHeaders)).data;
    const preDtai = preState.securities.find(s => s.ticker === 'DTAI');
    assert(preDtai, 'DTAI must exist in database');
    const initialPrice = preDtai.currentPrice;
    console.log(`Initial DTAI price: ₹${initialPrice}`);

    const act1Res = await request('POST', '/api/admin/phoenix-act', { actNumber: 1 }, adminHeaders);
    assert.strictEqual(act1Res.status, 200, 'Act 1 execution must return HTTP 200');
    assert.strictEqual(act1Res.data.success, true);
    assert.strictEqual(act1Res.data.actNumber, 1);
    assert.strictEqual(act1Res.data.act, 1);

    // Verify DTAI price drop (-22%)
    const post1State = (await request('GET', '/api/state', null, adminHeaders)).data;
    const post1Dtai = post1State.securities.find(s => s.ticker === 'DTAI');
    const expectedPrice = parseFloat((initialPrice * 0.78).toFixed(2));
    assert.strictEqual(post1Dtai.currentPrice, expectedPrice, `DTAI price must be ₹${expectedPrice}, got ₹${post1Dtai.currentPrice}`);
    assert.strictEqual(post1Dtai.sentimentOverride, -1, 'Sentiment override must be -1');

    // Verify news flash NW_PHX_1
    const phxNews1 = post1State.newsEvents.find(n => n.id === 'NW_PHX_1');
    assert(phxNews1, 'News flash NW_PHX_1 must be published in newsEvents');
    assert(phxNews1.headline.includes('Delta AI Labs Reports Shock'), 'Headline must match loss report');

    // Verify state.firedPhoenixActs tracking
    assert(post1State.firedPhoenixActs && post1State.firedPhoenixActs['1'], 'firedPhoenixActs must record Act 1');
    console.log(`✓ Act 1 successfully dropped DTAI price to ₹${post1Dtai.currentPrice} (-22%), published news, and recorded in firedPhoenixActs.`);

    // ------------------------------------------------------------------
    // TEST 5: ANTI-REPLAY DUPLICATE EXECUTION PROTECTION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: ANTI-REPLAY DUPLICATE EXECUTION PROTECTION ---');
    const dupRes = await request('POST', '/api/admin/phoenix-act', { actNumber: 1 }, adminHeaders);
    assert.strictEqual(dupRes.status, 409, 'Duplicate execution without force must return HTTP 409 Conflict');
    assert(dupRes.data.error.includes('already been executed'), 'Error message must explain duplicate');
    assert.strictEqual(dupRes.data.requiresForce, true, 'Response must flag requiresForce');

    // Verify state was NOT mutated again
    const postDupState = (await request('GET', '/api/state', null, adminHeaders)).data;
    const postDupDtai = postDupState.securities.find(s => s.ticker === 'DTAI');
    assert.strictEqual(postDupDtai.currentPrice, expectedPrice, 'DTAI price must remain unchanged on rejected replay');
    console.log('✓ Anti-replay protection blocked duplicate execution with HTTP 409 Conflict without state mutation.');

    // ------------------------------------------------------------------
    // TEST 6: FORCED RE-EXECUTION VIA FORCE: TRUE
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: FORCED RE-EXECUTION VIA FORCE: TRUE ---');
    const forceRes = await request('POST', '/api/admin/phoenix-act', { actNumber: 1, force: true }, adminHeaders);
    assert.strictEqual(forceRes.status, 200, 'Forced execution must return 200');
    assert.strictEqual(forceRes.data.success, true);
    console.log('✓ Forced re-execution with force: true succeeded with HTTP 200.');

    // ------------------------------------------------------------------
    // TEST 7: AUTHORIZED EXECUTION OF ACT 3 (OPENAI IPO)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: AUTHORIZED EXECUTION OF ACT 3 (OPENAI IPO) ---');
    const act3Res = await request('POST', '/api/admin/phoenix-act', { actNumber: 3 }, adminHeaders);
    assert.strictEqual(act3Res.status, 200, 'Act 3 execution must return 200');

    const post3State = (await request('GET', '/api/state', null, adminHeaders)).data;
    const oaiSec = post3State.securities.find(s => s.ticker === 'OAI');
    assert(oaiSec, 'OAI security must exist in database');
    assert.strictEqual(oaiSec.status, 'IPO_PENDING', 'OAI status must transition to IPO_PENDING');
    assert.strictEqual(oaiSec.ipoStatus, 'SUBSCRIPTION_OPEN', 'OAI ipoStatus must be SUBSCRIPTION_OPEN');
    console.log('✓ Act 3 successfully launched OpenAI IPO with status IPO_PENDING.');

    // ------------------------------------------------------------------
    // TEST 8: AUTHORIZED EXECUTION OF ACT 12 (TRADING HALT)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 8: AUTHORIZED EXECUTION OF ACT 12 (SEBI HALT) ---');
    const act12Res = await request('POST', '/api/admin/phoenix-act', { actNumber: 12 }, adminHeaders);
    assert.strictEqual(act12Res.status, 200, 'Act 12 execution must return 200');

    const post12State = (await request('GET', '/api/state', null, adminHeaders)).data;
    const haltedDtai = post12State.securities.find(s => s.ticker === 'DTAI');
    assert.strictEqual(haltedDtai.status, 'Halted', 'DTAI status must transition to Halted');
    console.log('✓ Act 12 successfully halted DTAI trading.');

    // ------------------------------------------------------------------
    // TEST 9: AUTHORIZED EXECUTION OF ACT 13 (BANKRUPTCY)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 9: AUTHORIZED EXECUTION OF ACT 13 (BANKRUPTCY) ---');
    const act13Res = await request('POST', '/api/admin/phoenix-act', { actNumber: 13 }, adminHeaders);
    assert.strictEqual(act13Res.status, 200, 'Act 13 execution must return 200');

    const post13State = (await request('GET', '/api/state', null, adminHeaders)).data;
    const bankruptDtai = post13State.securities.find(s => s.ticker === 'DTAI');
    assert.strictEqual(bankruptDtai.status, 'Bankrupt', 'DTAI status must transition to Bankrupt');
    assert.strictEqual(bankruptDtai.currentPrice, 0, 'DTAI currentPrice must be 0');
    console.log('✓ Act 13 successfully declared DTAI bankrupt with price ₹0.');

    // ------------------------------------------------------------------
    // TEST 10: SEBI ROLE AUTHORIZATION FOR PHOENIX ACTS
    // ------------------------------------------------------------------
    console.log('\n--- TEST 10: SEBI ROLE AUTHORIZATION ---');
    // Login as SEBI
    const sebiLogin = await request('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    assert.strictEqual(sebiLogin.status, 200, 'SEBI login must succeed');
    const sebiHeaders = { 'Authorization': `Bearer ${sebiLogin.data.token}` };

    const sebiActRes = await request('POST', '/api/admin/phoenix-act', { actNumber: 4 }, sebiHeaders);
    assert.strictEqual(sebiActRes.status, 200, 'SEBI must be authorized to fire narrative stage');
    assert.strictEqual(sebiActRes.data.success, true);
    console.log('✓ SEBI console user authorized to trigger Phoenix narrative acts.');

    // ------------------------------------------------------------------
    // TEST 11: DEDICATED MACRO SHOCK ENDPOINT
    // ------------------------------------------------------------------
    console.log('\n--- TEST 11: DEDICATED MACRO SHOCK ENDPOINT ---');
    const macroRes = await request('POST', '/api/admin/scenario/macro-shock', { actNumber: 1 }, adminHeaders);
    assert.strictEqual(macroRes.status, 200, 'Macro shock act 1 must return 200');
    assert.strictEqual(macroRes.data.success, true);
    assert(macroRes.data.title.includes('Global Market Opening & Technology Surge'), 'Title must match macro shock act 1');

    const macroBadRes = await request('POST', '/api/admin/scenario/macro-shock', { actNumber: 5 }, adminHeaders);
    assert.strictEqual(macroBadRes.status, 400, 'Invalid macro shock act must return 400');
    console.log('✓ Dedicated /api/admin/scenario/macro-shock functions correctly for macro sector prototypes.');

    // ------------------------------------------------------------------
    // TEST 12: BACKWARD COMPATIBILITY VIA SCENARIO: MACRO_SHOCK
    // ------------------------------------------------------------------
    console.log('\n--- TEST 12: BACKWARD COMPATIBILITY (SCENARIO: MACRO_SHOCK) ---');
    const compatRes = await request('POST', '/api/admin/phoenix-act', { scenario: 'macro_shock', actNumber: 2 }, adminHeaders);
    assert.strictEqual(compatRes.status, 200, 'Compatibility routing must return 200');
    assert.strictEqual(compatRes.data.success, true);
    assert(compatRes.data.title.includes('Mid-Session Macro Volatility'), 'Title must match macro shock act 2');
    console.log('✓ Backward compatibility flag { scenario: "macro_shock" } routes seamlessly.');

    // ------------------------------------------------------------------
    // TEST 13: GOVERNANCE AUDIT LOGGING VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 13: GOVERNANCE AUDIT LOGGING ---');
    const auditRes = await request('GET', '/api/audit-log', null, adminHeaders);
    assert.strictEqual(auditRes.status, 200, 'Audit log endpoint must return 200');
    const logs = auditRes.data.auditLog || auditRes.data.log || [];
    const phxLogs = logs.filter(l => l.action && l.action.startsWith('PHOENIX_ACT_'));
    assert(phxLogs.length >= 4, `Must have logged multiple Phoenix act events, found ${phxLogs.length}`);
    console.log(`✓ Verified ${phxLogs.length} Phoenix act audit entries in state.auditLog.`);

    console.log('\n======================================================================');
    console.log('🎉 ALL 13 PROJECT PHOENIX ROUTE INTEGRITY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================================\n');
  } finally {
    // Graceful teardown
    console.log('Terminating isolated test server process...');
    serverProc.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));

    // Cleanup isolated state file
    if (fs.existsSync(ISOLATED_STATE_FILE)) {
      fs.unlinkSync(ISOLATED_STATE_FILE);
      console.log('Cleaned up isolated state file.');
    }

    // Verify original state.json was completely untouched
    const postRealHash = getFileHash(ORIGINAL_STATE_FILE);
    assert.strictEqual(initialRealHash, postRealHash, 'CRITICAL: state.json was modified during testing!');
    console.log(`✓ Confirmed state.json SHA-256 untouched: ${postRealHash}`);
  }
}

run().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
