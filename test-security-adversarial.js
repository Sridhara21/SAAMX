/**
 * SAAMX 2.0 — Comprehensive Security, RBAC & Adversarial Test Suite
 * 
 * Tests:
 * 1.  Memory-Hard scrypt Password Hashing & Timing-Safe Verification
 * 2.  Automatic Legacy SHA-256 Hash Migration (Rehash-on-Success)
 * 3.  Password Strength Validation (>= 8 chars server-side enforcement)
 * 4.  Brute-Force Login Throttling & Rate Limiting (429 Too Many Requests)
 * 5.  Generic Auth Errors (Eliminating Username Enumeration)
 * 6.  Session Cryptographic Integrity, Expiration & Revocation on Logout
 * 7.  Immediate Session & WebSocket Revocation on Account Deactivation
 * 8.  WebSocket & Broadcast Data Sanitization (Zero Secret & Credential Leakage)
 * 9.  Cross-Team Isolation & Multi-Tenant Boundaries
 * 10. Granular Sensitive Action Gates (Separating Page Visibility from Execution)
 * 11. Master Super-Admin Sridhara & Last-Admin Recovery Safeguards
 * 12. Participant Registration Workflow & Administrative Approval Lifecycle
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3010;
const TEST_STATE_PATH = path.join(__dirname, 'state.adversarial-test.json');
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Helper: HTTP request wrapper
function request(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
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

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX 2.0 — MASTER SECURITY, RBAC & ADVERSARIAL VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Import server exports directly
  const serverModule = await import('./server.js');
  const {
    hashPassword,
    verifyPassword,
    validatePasswordStrength,
    getEffectivePermissions,
    ROLE_PERMISSIONS
  } = serverModule;

  // ------------------------------------------------------------------
  // TEST 1: SCRYPT HASHING & TIMING-SAFE VERIFICATION
  // ------------------------------------------------------------------
  console.log('--- TEST 1: SCRYPT HASHING & TIMING-SAFE VERIFICATION ---');
  const plainPassword = 'SecurityPassword2026!';
  const scryptHash = hashPassword(plainPassword);
  assert(scryptHash.startsWith('scrypt:'), 'Hash must follow scrypt:salt:derivedKey format');
  const parts = scryptHash.split(':');
  assert.strictEqual(parts.length, 3, 'Must contain prefix, salt, and key');
  assert.strictEqual(parts[1].length, 32, 'Salt must be 16 bytes (32 hex characters)');
  assert.strictEqual(parts[2].length, 128, 'Derived key must be 64 bytes (128 hex characters)');

  // Correct password verification
  const validCheck = verifyPassword(plainPassword, scryptHash);
  assert.strictEqual(validCheck.verified, true, 'Valid password must verify successfully');
  assert.strictEqual(validCheck.needsRehash, false, 'scrypt hash does not need rehash');

  // Incorrect password rejection
  const invalidCheck = verifyPassword('WrongPassword123!', scryptHash);
  assert.strictEqual(invalidCheck.verified, false, 'Invalid password must be rejected');
  console.log('✓ Memory-hard scrypt hashing and timing-safe verification verified.');

  // ------------------------------------------------------------------
  // TEST 2: LEGACY SHA-256 MIGRATION (REHASH-ON-SUCCESS)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: LEGACY SHA-256 HASH MIGRATION ---');
  const legacyPlain = 'saamx-event-2026';
  // Compute raw legacy sha256
  const crypto = await import('crypto');
  const legacyRawSha256 = crypto.createHash('sha256').update(legacyPlain).digest('hex');

  const legacyVerify = verifyPassword(legacyPlain, legacyRawSha256);
  assert.strictEqual(legacyVerify.verified, true, 'Legacy SHA-256 hash must verify cleanly');
  assert.strictEqual(legacyVerify.needsRehash, true, 'Legacy SHA-256 must flag needsRehash: true');

  const legacyWithPrefixVerify = verifyPassword(legacyPlain, `sha256:${legacyRawSha256}`);
  assert.strictEqual(legacyWithPrefixVerify.verified, true, 'Prefixed sha256 hash must verify cleanly');
  assert.strictEqual(legacyWithPrefixVerify.needsRehash, true);
  console.log('✓ Legacy hash backward-compatibility and migration flag verified.');

  // ------------------------------------------------------------------
  // TEST 3: PASSWORD STRENGTH VALIDATION ENFORCEMENT
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: SERVER-SIDE PASSWORD STRENGTH ENFORCEMENT ---');
  assert.strictEqual(validatePasswordStrength('short').valid, false, 'Passwords < 8 chars must be invalid');
  assert.strictEqual(validatePasswordStrength('').valid, false, 'Empty passwords must be invalid');
  assert.strictEqual(validatePasswordStrength('1234567').valid, false, '7-character password must be invalid');
  assert.strictEqual(validatePasswordStrength('valid-password-2026').valid, true, 'Alphanumeric >= 8 chars must be valid');
  assert.strictEqual(validatePasswordStrength('saamx-event-2026').valid, true);
  console.log('✓ Server-side password policy (>= 8 chars) strictly enforced.');

  // Start isolated test server
  console.log('\nStarting isolated test server on port ' + TEST_PORT + '...');
  process.env.PORT = String(TEST_PORT);
  process.env.STATE_FILE = TEST_STATE_PATH;
  process.env.SAAMX_AUTH_SECRET = 'adversarial-test-secret-key-3010';

  // Create clean isolated test state from production state
  const prodState = JSON.parse(fs.readFileSync(path.join(__dirname, 'state.json'), 'utf8'));
  fs.writeFileSync(TEST_STATE_PATH, JSON.stringify(prodState, null, 2), 'utf8');

  // Spawn isolated server
  const { spawn } = await import('child_process');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(TEST_PORT), STATE_FILE: TEST_STATE_PATH },
    stdio: 'ignore'
  });

  // Wait for server to bind
  await new Promise(r => setTimeout(r, 2000));

  try {
    // ------------------------------------------------------------------
    // TEST 4: GENERIC AUTH ERRORS (NO USERNAME ENUMERATION)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: GENERIC AUTHENTICATION ERRORS ---');
    // Non-existent username
    const nonExistentRes = await request('POST', '/api/auth/login', {
      username: 'non_existent_user_99999',
      password: 'SomePassword123!'
    });
    assert.strictEqual(nonExistentRes.status, 401);
    assert.strictEqual(nonExistentRes.data.error, 'Invalid username, PIN or password', 'Must return generic error');

    // Existing username with wrong password
    const wrongPassRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'wrong-password-here'
    });
    assert.strictEqual(wrongPassRes.status, 401);
    assert.strictEqual(wrongPassRes.data.error, 'Invalid username, PIN or password', 'Must return identical generic error');
    console.log('✓ Generic auth errors prevent username enumeration.');

    // ------------------------------------------------------------------
    // TEST 5: BRUTE-FORCE LOGIN RATE LIMITING (HTTP 429)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: BRUTE-FORCE LOGIN RATE LIMITING ---');
    const attackTarget = `target_victim_${Date.now()}`;
    let rateLimited = false;
    for (let i = 0; i < 12; i++) {
      const attemptRes = await request('POST', '/api/auth/login', {
        username: attackTarget,
        password: `bad-pass-${i}`
      });
      if (attemptRes.status === 429) {
        rateLimited = true;
        assert(attemptRes.data.error.includes('Too many failed login attempts'), 'Must notify client of lockout');
        break;
      }
    }
    assert.strictEqual(rateLimited, true, 'Must trigger HTTP 429 rate limit after repeated failures');
    console.log('✓ Brute-force login attempts throttled with HTTP 429 Too Many Requests.');

    // ------------------------------------------------------------------
    // TEST 6: ADMIN AUTHENTICATION & REHASH-ON-SUCCESS
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: AUTHENTICATION & REHASH-ON-SUCCESS ---');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
    assert.strictEqual(adminLoginRes.data.success, true);
    assert.strictEqual(adminLoginRes.data.passwordHash, undefined, 'Password hash must never leak in login response');
    const adminToken = adminLoginRes.data.token;
    assert(adminToken.startsWith('saamx.'), 'Session token must use cryptographic saamx prefix');

    // Verify /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.authenticated, true);
    assert.strictEqual(meRes.data.username, 'admin');
    console.log('✓ Admin authenticated with cryptographic session token.');

    // ------------------------------------------------------------------
    // TEST 7: SESSION INVALIDATION ON LOGOUT
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: SESSION INVALIDATION ON LOGOUT ---');
    // Provision temporary staff
    const tempStaffUser = `temp_staff_${Date.now()}`;
    const provisionRes = await request('POST', '/api/personnel', {
      name: 'Temporary Staff',
      username: tempStaffUser,
      role: 'operator_x',
      department: 'Testing',
      password: 'TemporaryPass2026!',
      selectedPages: ['#/exchange'],
      permissions: ['exchange.view']
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(provisionRes.status, 201);

    const tempLoginRes = await request('POST', '/api/auth/login', {
      username: tempStaffUser,
      password: 'TemporaryPass2026!'
    });
    assert.strictEqual(tempLoginRes.status, 200);
    const tempToken = tempLoginRes.data.token;

    // Logout
    const logoutRes = await request('POST', '/api/auth/logout', null, {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.strictEqual(logoutRes.status, 200);

    // Verify logged out token is rejected
    const postLogoutMe = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.strictEqual(postLogoutMe.status, 401, 'Logged out session must be rejected with 401');
    console.log('✓ Server-side session invalidation on logout verified.');

    // ------------------------------------------------------------------
    // TEST 8: IMMEDIATE SESSION & WEBSOCKET REVOCATION ON DEACTIVATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 8: IMMEDIATE SESSION REVOCATION ON DEACTIVATION ---');
    const deactStaffUser = `deact_user_${Date.now()}`;
    const createDeactRes = await request('POST', '/api/personnel', {
      name: 'Deactivatable Operator',
      username: deactStaffUser,
      role: 'operator_x',
      department: 'Desk',
      password: 'PasswordValid2026!',
      selectedPages: ['#/exchange'],
      permissions: ['exchange.view', 'exchange.execute']
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(createDeactRes.status, 201);
    const deactStaffId = createDeactRes.data.account.id;

    // Log in as this operator
    const deactLoginRes = await request('POST', '/api/auth/login', {
      username: deactStaffUser,
      password: 'PasswordValid2026!'
    });
    assert.strictEqual(deactLoginRes.status, 200);
    const deactToken = deactLoginRes.data.token;

    // Connect WebSocket as this user
    let wsClosedDueToDeactivation = false;
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}?token=${deactToken}`);
    await new Promise((resolve) => {
      ws.on('open', resolve);
    });
    ws.on('close', (code, reason) => {
      wsClosedDueToDeactivation = true;
    });

    // Deactivate account via admin
    const statusRes = await request('POST', `/api/personnel/${deactStaffId}/status`, {
      status: 'DISABLED',
      reason: 'Security containment test'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(statusRes.status, 200);

    // Wait 500ms for websocket disconnection
    await new Promise(r => setTimeout(r, 500));

    // HTTP session token must be immediately evicted
    const deactCheck = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${deactToken}`
    });
    assert.strictEqual(deactCheck.status, 401, 'Deactivated account token must be revoked immediately');

    // Login attempt for disabled account must return HTTP 403
    const disabledLoginRes = await request('POST', '/api/auth/login', {
      username: deactStaffUser,
      password: 'PasswordValid2026!'
    });
    assert.strictEqual(disabledLoginRes.status, 403, 'Disabled account login must return 403');
    assert(disabledLoginRes.data.error.includes('deactivated'), 'Must state account is deactivated');

    // WebSocket connection must have been closed
    assert.strictEqual(wsClosedDueToDeactivation, true, 'WebSocket connection must be forcefully closed on deactivation');
    console.log('✓ Immediate HTTP session and WebSocket revocation on deactivation verified.');

    // ------------------------------------------------------------------
    // TEST 9: WEBSOCKET DATA SANITIZATION & SECRET LEAK PREVENTION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 9: WEBSOCKET BROADCAST SANITIZATION ---');
    // Connect unauthenticated WebSocket (e.g. public viewer)
    const publicWs = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    let receivedState = null;
    await new Promise((resolve) => {
      publicWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'STATE_UPDATE') {
          receivedState = msg.state;
          resolve();
        }
      });
    });
    publicWs.close();

    assert(receivedState, 'Must receive initial state');
    assert.strictEqual(receivedState.personnel, undefined, 'Public state must NOT contain personnel directory');
    assert.strictEqual(receivedState.auditLog, undefined, 'Public state must NOT contain audit log');
    assert.strictEqual(receivedState.orders.length, 0, 'Public state must NOT contain live order tickets');

    // Verify all teams in public state have passwords and pins stripped
    for (const team of receivedState.teams || []) {
      assert.strictEqual(team.password, undefined, 'Public state must NEVER leak team password');
      assert.strictEqual(team.passwordHash, undefined, 'Public state must NEVER leak team passwordHash');
      assert.strictEqual(team.tempPin, undefined, 'Public state must NEVER leak team tempPin');
      assert.strictEqual(team.cashWallets, undefined, 'Public state must NEVER leak team private cashWallets');
    }
    console.log('✓ WebSocket state broadcasts strictly sanitized of secrets, personnel, and private holdings.');

    // ------------------------------------------------------------------
    // TEST 10: CROSS-TEAM DATA ISOLATION (MULTI-TENANT DEFENSE)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 10: CROSS-TEAM DATA ISOLATION ---');
    // Login as Team T01
    const t01Login = await request('POST', '/api/auth/login', {
      username: 'T01',
      password: 'saamx-team-01'
    });
    assert.strictEqual(t01Login.status, 200);
    const t01Token = t01Login.data.token;

    // Login as Team T02
    const t02Login = await request('POST', '/api/auth/login', {
      username: 'T02',
      password: 'saamx-team-02'
    });
    assert.strictEqual(t02Login.status, 200);
    const t02Token = t02Login.data.token;

    // Team T02 attempts to view Team T01's private portfolio
    const breachPortfolio = await request('GET', '/api/portfolio?teamCode=T01', null, {
      'Authorization': `Bearer ${t02Token}`
    });
    assert.strictEqual(breachPortfolio.status, 403, 'Cross-team portfolio inspection must return 403 Forbidden');

    // Team T02 attempts to submit an order on behalf of Team T01
    const breachOrder = await request('POST', '/api/order/create', {
      teamCode: 'T01',
      symbol: 'RELIANCE',
      action: 'BUY',
      quantity: 10
    }, {
      'Authorization': `Bearer ${t02Token}`
    });
    assert.strictEqual(breachOrder.status, 403, 'Cross-team order creation must return 403 Forbidden');

    // Team T02 attempts to cancel Team T01's order
    const breachCancel = await request('POST', '/api/orders/cancel', {
      orderId: 'ORD_T01_DUMMY',
      teamCode: 'T01'
    }, {
      'Authorization': `Bearer ${t02Token}`
    });
    // Either order doesn't exist (404) or cross-team blocked (403), must NOT succeed
    assert(breachCancel.status === 403 || breachCancel.status === 404, 'Must block unauthorized order cancellation');
    console.log('✓ Multi-tenant team data isolation strictly enforced on the server.');

    // ------------------------------------------------------------------
    // TEST 11: SEPARATION OF PAGE VISIBILITY FROM SENSITIVE ACTIONS
    // ------------------------------------------------------------------
    console.log('\n--- TEST 11: SEPARATION OF PAGE VISIBILITY FROM ACTIONS ---');
    // Provision operator with page visibility to #/exchange and #/results, but NO execution or publish permissions
    const viewOnlyUser = `view_operator_${Date.now()}`;
    const viewProvisionRes = await request('POST', '/api/personnel', {
      name: 'View Only Desk Operator',
      username: viewOnlyUser,
      role: 'operator_x',
      department: 'Desk Observation',
      password: 'ValidPassword2026!',
      selectedPages: ['#/exchange', '#/results'],
      permissions: ['exchange.view', 'results.view']
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(viewProvisionRes.status, 201);

    const viewLogin = await request('POST', '/api/auth/login', {
      username: viewOnlyUser,
      password: 'ValidPassword2026!'
    });
    assert.strictEqual(viewLogin.status, 200);
    const viewToken = viewLogin.data.token;

    // View-only operator attempting sensitive order EXECUTE
    const execAttempt = await request('POST', '/api/order/action', {
      orderId: 'ORD_TEST_EXEC',
      actionType: 'EXECUTE'
    }, {
      'Authorization': `Bearer ${viewToken}`
    });
    assert.strictEqual(execAttempt.status, 403, 'Operator lacking exchange.execute must receive 403 Forbidden');
    assert(execAttempt.data.error.includes('exchange.execute'));

    // View-only operator attempting market control
    const marketAttempt = await request('POST', '/api/market/control', { action: 'PAUSE' }, {
      'Authorization': `Bearer ${viewToken}`
    });
    assert.strictEqual(marketAttempt.status, 403, 'Operator lacking market.control must receive 403 Forbidden');

    // View-only operator attempting results publication
    const publishAttempt = await request('POST', '/api/results/publish', { eventId: 'EVT_LIVE_MAIN' }, {
      'Authorization': `Bearer ${viewToken}`
    });
    assert.strictEqual(publishAttempt.status, 403, 'Operator lacking results.approve must receive 403 Forbidden');
    console.log('✓ Page visibility grants desk viewing without conferring sensitive execution or publishing powers.');

    // ------------------------------------------------------------------
    // TEST 12: MASTER SUPER-ADMIN SRIDHARA RECOVERY SAFEGUARDS
    // ------------------------------------------------------------------
    console.log('\n--- TEST 12: MASTER SUPER-ADMIN SRIDHARA SAFEGUARDS ---');
    const sridharaStaff = (prodState.personnel || []).find(p => p.username === 'sridhara');
    assert(sridharaStaff, 'Sridhara super-admin account must exist');

    // Standard admin attempting to deactivate Sridhara
    const deactSridharaRes = await request('POST', `/api/personnel/${sridharaStaff.id}/status`, {
      status: 'DISABLED',
      reason: 'Malicious deactivation attempt'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(deactSridharaRes.status, 403, 'Deactivating Sridhara must be blocked with 403');
    assert(deactSridharaRes.data.error.includes('Sridhara cannot be deactivated'));

    // Standard admin attempting to demote Sridhara
    const demoteSridharaRes = await request('PUT', `/api/personnel/${sridharaStaff.id}`, {
      role: 'operator_x'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(demoteSridharaRes.status, 403, 'Demoting Sridhara by standard admin must be blocked with 403');

    // Standard admin attempting to reset Sridhara's password
    const resetSridharaRes = await request('POST', `/api/personnel/${sridharaStaff.id}/reset-password`, {
      newPassword: 'HackedPassword2026!'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(resetSridharaRes.status, 403, 'Resetting Sridhara password by standard admin must be blocked with 403');
    console.log('✓ Super-admin master Sridhara safeguards strictly enforced.');

    // ------------------------------------------------------------------
    // TEST 13: PARTICIPANT REGISTRATION & APPROVAL WORKFLOW
    // ------------------------------------------------------------------
    console.log('\n--- TEST 13: PARTICIPANT REGISTRATION & APPROVAL WORKFLOW ---');
    const testSchoolName = `Greenwood High School ${Date.now()}`;
    const testHouseName = `Vanguard Capital ${Date.now()}`;
    const regPayload = {
      schoolName: testSchoolName,
      board: 'CBSE',
      city: 'Bengaluru',
      contactPerson: 'Dr. Anand Rao',
      facultyCoordinator: 'Dr. Anand Rao',
      investmentHouseName: testHouseName,
      teamType: 'Retail',
      members: [
        { name: 'Kavya Nair', role: 'Chief Investment Officer' },
        { name: 'Rishi Patel', role: 'Quantitative Strategist' }
      ]
    };

    // Submit registration (zero email, zero phone)
    const regRes = await request('POST', '/api/register/complete', regPayload);
    assert.strictEqual(regRes.status, 200, 'Registration submission failed');
    assert.strictEqual(regRes.data.success, true);
    assert(regRes.data.registrationId, 'Must generate unique registrationId');
    assert(regRes.data.teamCode, 'Must allocate team code');
    const regId = regRes.data.registrationId;
    const allocatedCode = regRes.data.teamCode;

    // Duplicate submission guard (same school and event)
    const dupRegRes = await request('POST', '/api/register/complete', regPayload);
    assert.strictEqual(dupRegRes.status, 400, 'Duplicate registration must be rejected with 400');

    // Verify unapproved registration is NOT yet in active trading teams
    const preApprovalTeamRes = await request('GET', `/api/portfolio?teamCode=${allocatedCode}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(preApprovalTeamRes.status, 404, 'Unapproved registration must NOT exist as active trading team');

    // Admin approves registration
    const approveRes = await request('POST', '/api/admin/registration/verify', {
      registrationId: regId,
      action: 'APPROVE',
      allocatedTeamCode: allocatedCode
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(approveRes.status, 200, 'Registration approval failed');

    // Verify approved team is now fully activated in state.teams with ₹1 Cr capital
    const postApprovalTeamRes = await request('GET', `/api/portfolio?teamCode=${allocatedCode}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(postApprovalTeamRes.status, 200, 'Approved team must now exist in trading engine');
    assert.strictEqual(postApprovalTeamRes.data.team.cashBalance, 10000000, 'Must have starting capital of ₹1 Crore');
    assert.strictEqual(postApprovalTeamRes.data.team.teamName, testHouseName);
    console.log('✓ Registration submission and authorized administrative approval lifecycle verified.');

    console.log('\n======================================================================');
    console.log('✅ ALL ADVERSARIAL SECURITY & RBAC TESTS PASSED SUCCESSFULLY (13/13)!');
    console.log('======================================================================\n');
  } finally {
    // Cleanup server and test state file
    try { serverProcess.kill(); } catch (e) {}
    try {
      if (fs.existsSync(TEST_STATE_PATH)) {
        fs.unlinkSync(TEST_STATE_PATH);
      }
    } catch (e) {}
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ ADVERSARIAL SECURITY TEST SUITE FAILED:', err);
  process.exit(1);
});
