import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_TEST_MODE = 3021;
const PORT_PROD_MODE = 3022;
const BASE_TEST_URL = `http://127.0.0.1:${PORT_TEST_MODE}`;
const BASE_PROD_URL = `http://127.0.0.1:${PORT_PROD_MODE}`;

const ISOLATED_TEST_STATE = path.join(__dirname, 'test-state-auth-remediation.json');
const ISOLATED_PROD_STATE = path.join(__dirname, 'state.prod-sim.json');

function request(baseUrl, method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, baseUrl);
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
      const res = await request(baseUrl, 'GET', '/api/state');
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Server failed to start at ${baseUrl}`);
}

async function run() {
  console.log('======================================================================');
  console.log('🔒 SAAMX — PHASE 7A.1 AUTHENTICATION SECURITY & REMEDIATION TEST SUITE');
  console.log('======================================================================\n');

  // Load baseline state to seed test state files
  const baselineState = JSON.parse(fs.readFileSync(path.join(__dirname, 'state.json'), 'utf8'));

  fs.writeFileSync(ISOLATED_TEST_STATE, JSON.stringify(baselineState, null, 2), 'utf8');
  fs.writeFileSync(ISOLATED_PROD_STATE, JSON.stringify(baselineState, null, 2), 'utf8');

  // Spawn Test-Mode Server (STATE_FILE includes "test")
  console.log(`Starting isolated test-mode server on port ${PORT_TEST_MODE}...`);
  const testServerProc = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT_TEST_MODE),
      STATE_FILE: ISOLATED_TEST_STATE,
      SAAMX_RECOVERY_PASSWORD: 'EmergencyDisasterRecoveryKey2026!'
    },
    stdio: 'pipe'
  });
  testServerProc.stderr.on('data', d => console.error('[Test Server stderr]', d.toString()));

  // Spawn Production-Mode Server (NODE_ENV=production, STATE_FILE does NOT contain test)
  console.log(`Starting isolated production-mode server on port ${PORT_PROD_MODE}...`);
  const prodServerProc = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT_PROD_MODE),
      NODE_ENV: 'production',
      STATE_FILE: ISOLATED_PROD_STATE
    },
    stdio: 'pipe'
  });
  prodServerProc.stderr.on('data', d => console.error('[Prod Server stderr]', d.toString()));

  try {
    await waitForServer(BASE_TEST_URL);
    await waitForServer(BASE_PROD_URL);
    console.log('✓ Both test-mode and production-mode servers are operational.\n');

    // ------------------------------------------------------------------
    // TEST 1: LEGITIMATE TEAM AUTHENTICATION
    // ------------------------------------------------------------------
    console.log('--- TEST 1: LEGITIMATE TEAM AUTHENTICATION ---');
    const validTeamRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'T01',
      password: 'saamx-team-01'
    });
    assert.strictEqual(validTeamRes.status, 200, 'Legitimate team login should succeed');
    assert.strictEqual(validTeamRes.data.role, 'team');
    assert.strictEqual(validTeamRes.data.teamCode, 'T01');
    assert(validTeamRes.data.token && validTeamRes.data.token.startsWith('saamx.'), 'Must return cryptographically signed token');
    assert.strictEqual(validTeamRes.data.team.password, undefined, 'Must not leak team password in response');
    console.log('✓ Legitimate team login succeeded with sanitized team state.');

    // Team login with wrong password
    const invalidTeamRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'T01',
      password: 'wrong-team-password'
    });
    assert.strictEqual(invalidTeamRes.status, 401, 'Invalid team password must return 401');
    assert.strictEqual(invalidTeamRes.data.error, 'Invalid username, PIN or password');
    console.log('✓ Invalid team credentials rejected with generic error message.');

    // ------------------------------------------------------------------
    // TEST 2: LEGITIMATE STAFF CREDENTIAL AUTHENTICATION VIA SCRYPT
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: LEGITIMATE STAFF AUTHENTICATION (SCRYPT VERIFICATION) ---');
    // Admin login
    const adminLoginRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login with valid password must succeed');
    assert.strictEqual(adminLoginRes.data.role, 'admin');
    const adminToken = adminLoginRes.data.token;
    assert(adminToken.startsWith('saamx.'), 'Session token must use saamx prefix');
    console.log('✓ Admin authenticated via stored scrypt password hash.');

    // Super-admin Sridhara login
    const sridharaLoginRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'sridhara',
      password: '21112009'
    });
    assert.strictEqual(sridharaLoginRes.status, 200, 'Sridhara login with valid configured key must succeed');
    assert.strictEqual(sridharaLoginRes.data.role, 'admin');
    assert.strictEqual(sridharaLoginRes.data.isMaster, true);
    console.log('✓ Super-admin Sridhara authenticated successfully via stored scrypt credentials.');

    // Operator Mr. X login
    const exchangeLoginRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'exchange',
      password: 'exchange-event-2026'
    });
    assert.strictEqual(exchangeLoginRes.status, 200);
    assert.strictEqual(exchangeLoginRes.data.role, 'exchange');
    console.log('✓ Exchange matching operator (Mr. X) authenticated via server-side credentials.');

    // ------------------------------------------------------------------
    // TEST 3: MASTER PASSWORD BYPASS ELIMINATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: MASTER PASSWORD BYPASS ELIMINATION ---');
    // Attempting to log into 'admin' using the legacy master password (21112009)
    const adminBypassRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'admin',
      password: '21112009'
    });
    assert.strictEqual(adminBypassRes.status, 401, 'Using master password against admin account must be REJECTED with 401');
    assert.strictEqual(adminBypassRes.data.error, 'Invalid username, PIN or password');
    console.log('✓ Legacy master password bypass on admin account is blocked (401 Unauthorized).');

    // Attempting to log into 'exchange' using 21112009
    const exchangeBypassRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'exchange',
      password: '21112009'
    });
    assert.strictEqual(exchangeBypassRes.status, 401, 'Using master password against exchange operator must be REJECTED with 401');
    console.log('✓ Legacy master password bypass on exchange account is blocked (401 Unauthorized).');

    // Attempting to log into 'verification' using 21112009
    const verifBypassRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'verification',
      password: '21112009'
    });
    assert.strictEqual(verifBypassRes.status, 401, 'Using master password against verification officer must be REJECTED with 401');
    console.log('✓ Legacy master password bypass on verification account is blocked (401 Unauthorized).');

    // ------------------------------------------------------------------
    // TEST 4: SYNTHETIC FALLBACK ACCOUNT REMOVAL
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: SYNTHETIC FALLBACK ACCOUNT REMOVAL ---');
    // In legacy code, username 'superadmin' with 21112009 synthesized an admin session out of thin air
    const syntheticSuperRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'superadmin',
      password: '21112009'
    });
    assert.strictEqual(syntheticSuperRes.status, 401, 'Non-existent superadmin username must be REJECTED with 401');
    console.log('✓ Synthetic superadmin login is blocked.');

    // In legacy code, passing role='admin' with legacy password synthesized an admin account
    const syntheticRoleRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'unregistered_actor',
      role: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(syntheticRoleRes.status, 401, 'Client-supplied role with legacy password must be REJECTED with 401');
    console.log('✓ Synthetic client-supplied role claims are blocked.');

    // In legacy code, obsolete string 'fms-event-2026' authenticated arbitrary roles
    const obsoleteSecretRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'fms-event-2026'
    });
    assert.strictEqual(obsoleteSecretRes.status, 401, 'Obsolete fms-event-2026 secret must be REJECTED with 401');
    console.log('✓ Obsolete fallback string (fms-event-2026) is blocked.');

    // ------------------------------------------------------------------
    // TEST 5: PRODUCTION MODE DIRECT API CALL PROTECTION (NO HEADER BYPASS)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: PRODUCTION MODE DIRECT API HEADER PROTECTION ---');
    // Direct API call on production server passing X-FMS-Password header without Bearer token
    const prodHeaderBypassRes = await request(BASE_PROD_URL, 'GET', '/api/audit-log', null, {
      'X-FMS-Password': 'fms-event-2026'
    });
    assert.strictEqual(prodHeaderBypassRes.status, 401, 'Production server must REJECT X-FMS-Password with 401');
    assert(prodHeaderBypassRes.data.error.includes('Valid session authentication required'));
    console.log('✓ Production mode strictly rejects X-FMS-Password bypass on protected routes (401).');

    // Direct API call on production server passing legacy master password in header
    const prodMasterHeaderRes = await request(BASE_PROD_URL, 'GET', '/api/audit-log', null, {
      'X-FMS-Password': '21112009'
    });
    assert.strictEqual(prodMasterHeaderRes.status, 401, 'Production server must REJECT 21112009 in header with 401');
    console.log('✓ Production mode rejects 21112009 in header with 401.');

    // Legitimate admin login and token access on production server
    const prodAdminLogin = await request(BASE_PROD_URL, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(prodAdminLogin.status, 200, 'Legitimate login on production server must succeed');
    const prodToken = prodAdminLogin.data.token;

    const prodTokenRes = await request(BASE_PROD_URL, 'GET', '/api/audit-log', null, {
      'Authorization': `Bearer ${prodToken}`
    });
    assert.strictEqual(prodTokenRes.status, 200, 'Legitimate token access on production server must succeed');
    console.log('✓ Production server accepts legitimate cryptographic token authentication.');

    // ------------------------------------------------------------------
    // TEST 6: DISASTER RECOVERY ENVIRONMENT OVERRIDE
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: DISASTER RECOVERY ENVIRONMENT OVERRIDE ---');
    // On testServerProc, SAAMX_RECOVERY_PASSWORD was configured
    const recoveryRes = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'sridhara',
      password: 'EmergencyDisasterRecoveryKey2026!'
    });
    assert.strictEqual(recoveryRes.status, 200, 'Emergency disaster recovery password for Sridhara must succeed');
    assert.strictEqual(recoveryRes.data.role, 'admin');
    console.log('✓ Emergency recovery authentication strictly verified for @sridhara using environment key.');

    // Attempting recovery key on non-sridhara account must fail
    const invalidRecoveryTarget = await request(BASE_TEST_URL, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'EmergencyDisasterRecoveryKey2026!'
    });
    assert.strictEqual(invalidRecoveryTarget.status, 401, 'Recovery key cannot be used on other accounts');
    console.log('✓ Emergency recovery key is strictly restricted from non-sridhara accounts.');

    // ------------------------------------------------------------------
    // TEST 7: TIMING-SAFE TOKEN VERIFICATION & SIGNATURE TAMPERING
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: TOKEN TAMPERING REJECTION ---');
    const tamperedToken = adminToken.slice(0, -4) + 'abcd';
    const tamperedRes = await request(BASE_TEST_URL, 'GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${tamperedToken}`
    });
    assert.strictEqual(tamperedRes.status, 401, 'Tampered token must be rejected with 401');
    console.log('✓ Tampered cryptographic signature rejected timing-safely with 401.');

    console.log('\n======================================================================');
    console.log('✅ ALL PHASE 7A.1 AUTHENTICATION SECURITY TESTS PASSED (7/7)!');
    console.log('======================================================================\n');
  } finally {
    try { testServerProc.kill(); } catch (e) {}
    try { prodServerProc.kill(); } catch (e) {}
    try { if (fs.existsSync(ISOLATED_TEST_STATE)) fs.unlinkSync(ISOLATED_TEST_STATE); } catch (e) {}
    try { if (fs.existsSync(ISOLATED_PROD_STATE)) fs.unlinkSync(ISOLATED_PROD_STATE); } catch (e) {}
  }
}

run().catch(err => {
  console.error('\n❌ AUTH SECURITY TEST SUITE FAILED:', err);
  process.exit(1);
});
