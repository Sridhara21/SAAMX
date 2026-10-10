/**
 * test-public-landing-and-security.js
 * Comprehensive automated verification for SAAMX Public Landing Page & Secure Role-Based Access
 */

import http from 'http';
import assert from 'assert';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    process.stdout.write(`  [TEST] ${name} ... `);
    await fn();
    console.log('✅ PASSED');
    passedTests++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function runSecurityTestSuite() {
  console.log('\n======================================================================');
  console.log('🛡️  SAAMX — PUBLIC LANDING PAGE & SECURITY ROLE VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Group 1: Public Domain & Route Assets
  console.log('--- 1. PUBLIC LANDING & STATIC BUNDLE ACCESS ---');
  await test('Root domain "/" serves HTML without requiring authentication', async () => {
    const res = await request('GET', '/');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.data === 'string' && res.data.includes('<div id="root"></div>'));
    assert.ok(res.data.includes('SAAMX'));
  });

  await test('Public projector snapshot endpoint is accessible without credentials', async () => {
    const res = await request('GET', '/api/projector/snapshot');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data);
    // Ensure no private credentials or secrets are leaked
    assert.strictEqual(res.data.PASSWORD_SECRET, undefined);
    assert.strictEqual(res.data.activeSessions, undefined);
  });

  await test('Public price history and FX rates are accessible without credentials', async () => {
    const resFx = await request('GET', '/api/fx/rates');
    assert.strictEqual(resFx.status, 200);
    const resHistory = await request('GET', '/api/priceHistory');
    assert.strictEqual(resHistory.status, 200);
  });

  // Group 2: Unauthenticated Protection & Anti-Spoofing
  console.log('\n--- 2. UNAUTHENTICATED PROTECTION & ANTI-SPOOFING ---');
  await test('Unauthenticated access to private state is rejected with 401', async () => {
    const res = await request('GET', '/api/state');
    assert.strictEqual(res.status, 401, 'Private state must require authentication');
  });

  await test('Spoofed "X-FMS-Role: admin" header without token is rejected with 401', async () => {
    const res = await request('POST', '/api/events/trigger', { eventId: 'TEST' }, {
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(res.status, 401, 'Unverified role header must not grant admin access');
  });

  await test('Spoofed "X-FMS-Role: sebi" header without token is rejected with 401', async () => {
    const res = await request('GET', '/api/audit-log', null, {
      'X-FMS-Role': 'sebi'
    });
    assert.strictEqual(res.status, 401, 'Unverified role header must not grant SEBI access');
  });

  await test('Spoofed "X-FMS-Role: verification" header without token is rejected with 401', async () => {
    const res = await request('POST', '/api/verification/approve', { orderId: 'ORD_001' }, {
      'X-FMS-Role': 'verification'
    });
    assert.strictEqual(res.status, 401, 'Unverified role header must not grant verification officer access');
  });

  await test('Forged Bearer token format is rejected with 401', async () => {
    const res = await request('GET', '/api/state', null, {
      'Authorization': 'Bearer saamx.forged.admin.fake.sig'
    });
    assert.strictEqual(res.status, 401, 'Forged HMAC token must be rejected');
  });

  // Group 3: Team Authentication & Privacy Boundaries
  console.log('\n--- 3. TEAM AUTHENTICATION & PORTFOLIO PRIVACY ---');
  let team1Token = null;
  let team2Token = null;

  await test('Team login with invalid password returns 401', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'T01',
      password: 'wrong-password-xyz'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, undefined);
  });

  await test('Team T01 logs in successfully with valid credentials and receives signed token', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'T01',
      password: 'saamx-team-01'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.role, 'team');
    assert.strictEqual(res.data.teamCode, 'T01');
    assert.ok(res.data.token && res.data.token.startsWith('saamx.'));
    team1Token = res.data.token;
  });

  await test('Team T02 logs in successfully and receives signed token', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'T02',
      password: 'saamx-team-02'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.teamCode, 'T02');
    team2Token = res.data.token;
  });

  await test('Team T01 CAN view its own portfolio', async () => {
    const res = await request('POST', '/api/portfolio', { teamCode: 'T01' }, {
      'Authorization': `Bearer ${team1Token}`
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Team T01 CANNOT view Team T02 portfolio (Cross-team privacy enforced with 403)', async () => {
    const res = await request('POST', '/api/portfolio', { teamCode: 'T02' }, {
      'Authorization': `Bearer ${team1Token}`
    });
    assert.strictEqual(res.status, 403, 'Participant cannot view another team portfolio');
  });

  await test('Team T01 CANNOT submit orders or trade on behalf of Team T02 (403 Forbidden)', async () => {
    const res = await request('POST', '/api/order/create', { teamCode: 'T02', symbol: 'RELIANCE', quantity: 10, orderType: 'BUY' }, {
      'Authorization': `Bearer ${team1Token}`
    });
    assert.strictEqual(res.status, 403, 'Participant cannot execute orders for another team');
  });

  await test('Team T01 CANNOT access Admin endpoints (403 Forbidden)', async () => {
    const res = await request('POST', '/api/admin/reset', { confirmText: 'RESET' }, {
      'Authorization': `Bearer ${team1Token}`
    });
    assert.strictEqual(res.status, 403, 'Team token must be forbidden from admin endpoints');
  });

  // Group 4: Staff Console Authentication & Role Segregation
  console.log('\n--- 4. STAFF CONSOLE AUTHENTICATION & ROLE ISOLATION ---');
  let adminToken = null;
  let verificationToken = null;
  let operatorToken = null;
  let sebiToken = null;
  let journalistToken = null;

  await test('Admin logs in with valid access key and receives admin token', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'admin');
    assert.ok(res.data.token);
    adminToken = res.data.token;
  });

  await test('Verification Officer logs in with valid access key', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'verification',
      password: 'verification-event-2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'verification');
    verificationToken = res.data.token;
  });

  await test('Exchange Operator logs in with valid access key', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'exchange',
      password: 'exchange-event-2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'operator_x');
    operatorToken = res.data.token;
  });

  await test('SEBI Surveillance Officer logs in with valid access key', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'sebi',
      password: 'sebi-event-2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'sebi');
    sebiToken = res.data.token;
  });

  await test('Journalist logs in with valid access key', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'journalist',
      password: 'journalist-event-2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'journalist');
    journalistToken = res.data.token;
  });

  await test('SEBI token CAN access audit log', async () => {
    const res = await request('GET', '/api/audit-log', null, {
      'Authorization': `Bearer ${sebiToken}`
    });
    assert.strictEqual(res.status, 200);
  });

  await test('Journalist token CANNOT access audit log (403 Forbidden)', async () => {
    const res = await request('GET', '/api/audit-log', null, {
      'Authorization': `Bearer ${journalistToken}`
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Journalist token CANNOT access Verification endpoints (403 Forbidden)', async () => {
    const res = await request('POST', '/api/verification/approve', { orderId: 'ORD_001' }, {
      'Authorization': `Bearer ${journalistToken}`
    });
    assert.strictEqual(res.status, 403);
  });

  // Group 5: Session Verification (/api/auth/me) & Logout Revocation
  console.log('\n--- 5. SESSION VERIFICATION & LOGOUT REVOCATION ---');
  await test('Active token validates via /api/auth/me', async () => {
    const res = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.authenticated, true);
    assert.strictEqual(res.data.role, 'admin');
  });

  await test('Logout revokes the session token', async () => {
    const res = await request('POST', '/api/auth/logout', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  await test('Revoked token is rejected by /api/auth/me with 401', async () => {
    const res = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 401, 'Revoked token must return 401');
    assert.strictEqual(res.data.authenticated, false);
  });

  await test('Revoked token is rejected for protected operations with 401', async () => {
    const res = await request('GET', '/api/state', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 401, 'Revoked session cannot access protected endpoints');
  });

  console.log('\n======================================================================');
  console.log(`🏆 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY WITH ZERO REGRESSIONS!`);
  console.log('======================================================================\n');
}

runSecurityTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Aborted on Error:\n', err);
  process.exit(1);
});
