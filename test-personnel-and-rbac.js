import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import { getFilteredNavSections, NAVIGATION_SECTIONS, isItemActive } from './src/lib/navigationConfig.js';

const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_STATE_FILE = './test-state-personnel.json';

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
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('======================================================================');
  console.log('🧪 SAAMX 2.0 — MULTI-PAGE STAFF ACCESS & RBAC VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Ensure clean test state file
  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }

  console.log(`Starting isolated test server on port ${PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE: TEST_STATE_FILE },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {
    // console.log('[Server stdout]', d.toString());
  });
  serverProc.stderr.on('data', d => {
    console.error('[Server stderr]', d.toString());
  });

  // Wait for server to boot reliably
  await new Promise(r => setTimeout(r, 4500));

  try {
    // ------------------------------------------------------------------
    // TEST 1: LOGIN AS ADMIN & FETCH PERMISSION MATRIX
    // ------------------------------------------------------------------
    console.log('--- TEST 1: AUTHENTICATION & PERMISSIONS MATRIX ---');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
    assert.strictEqual(adminLoginRes.data.success, true);
    const adminToken = adminLoginRes.data.token;
    assert(adminToken, 'Admin token must be returned');

    const matrixRes = await request('GET', '/api/permissions/matrix', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(matrixRes.status, 200, 'GET /api/permissions/matrix failed');
    assert(Array.isArray(matrixRes.data.groups), 'Matrix must include permission groups');
    assert(Array.isArray(matrixRes.data.definitions), 'Matrix must include permission definitions');
    assert(matrixRes.data.rolePermissions?.operator_x, 'Matrix must include operator_x default permissions');
    console.log(`✓ Permissions Matrix verified (${matrixRes.data.definitions.length} granular permissions across ${matrixRes.data.groups.length} groups).`);

    // ------------------------------------------------------------------
    // TEST 2: SEED PERSONNEL DIRECTORY & PASSWORD HASH PROTECTION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: SEED PERSONNEL DIRECTORY & CREDENTIAL PROTECTION ---');
    const personnelRes = await request('GET', '/api/personnel', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(personnelRes.status, 200, 'GET /api/personnel failed');
    assert(Array.isArray(personnelRes.data.personnel), 'Personnel list must be returned');
    assert(personnelRes.data.personnel.length >= 10, 'Must have at least 10 seed accounts');

    // Password Hash Leakage Guard
    personnelRes.data.personnel.forEach(staff => {
      assert.strictEqual(staff.passwordHash, undefined, `Password hash must NEVER be exposed for @${staff.username}`);
    });
    console.log('✓ Password hashes are strictly sanitized and never returned in API responses.');

    // ------------------------------------------------------------------
    // TEST 3: PROVISIONING STAFF ACCOUNT (INPUT VALIDATION & RBAC)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: PROVISIONING MULTI-PAGE STAFF ACCOUNT & VALIDATION ---');
    const testUsername = `staff_op_${Date.now()}`;
    const newStaffPayload = {
      name: 'Rohan Verma',
      username: testUsername,
      role: 'operator_x',
      department: 'Central Trading Floor',
      password: 'operator-pass-2026',
      selectedPages: ['#/exchange', '#/market-watch'],
      permissions: ['exchange.view', 'exchange.execute', 'orders.verify', 'orders.view_queue', 'market.view']
    };

    const createRes = await request('POST', '/api/personnel', newStaffPayload, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(createRes.status, 201, 'POST /api/personnel failed');
    assert.strictEqual(createRes.data.success, true);
    assert.strictEqual(createRes.data.account.username, testUsername);
    assert.strictEqual(createRes.data.account.passwordHash, undefined, 'Created account must not return passwordHash');
    assert.deepStrictEqual(createRes.data.account.selectedPages, ['#/exchange', '#/market-watch']);
    const createdStaffId = createRes.data.account.id;
    console.log(`✓ Successfully provisioned multi-page staff member: @${testUsername} (${createdStaffId})`);

    // Validation Guard: Duplicate Username Rejection
    const dupRes = await request('POST', '/api/personnel', newStaffPayload, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate username must be rejected with 400');
    console.log('✓ Duplicate username rejection guard passed.');

    // Validation Guard: Unknown Permission Rejection
    const invalidPermPayload = {
      name: 'Hacker User',
      username: `hacker_${Date.now()}`,
      role: 'operator_x',
      password: 'pass',
      permissions: ['super_exploit_permission']
    };
    const invalidPermRes = await request('POST', '/api/personnel', invalidPermPayload, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(invalidPermRes.status, 400, 'Unknown permission ID must be rejected with 400');
    console.log('✓ Unknown permission ID rejection guard passed.');

    // ------------------------------------------------------------------
    // TEST 4: MULTI-PAGE OPERATOR AUTHENTICATION & SESSION PAYLOAD
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: MULTI-PAGE OPERATOR AUTHENTICATION ---');
    const opLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'operator-pass-2026'
    });
    assert.strictEqual(opLoginRes.status, 200, 'Multi-page staff login failed');
    assert.strictEqual(opLoginRes.data.success, true);
    assert.deepStrictEqual(opLoginRes.data.selectedPages, ['#/exchange', '#/market-watch'], 'Login must return assigned selectedPages');
    assert(Array.isArray(opLoginRes.data.permissions), 'Login must return effective permissions');
    assert(opLoginRes.data.permissions.includes('exchange.execute'), 'Must include exchange.execute');
    const opToken = opLoginRes.data.token;

    // Verify /api/auth/me returns assigned pages
    const opMeRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${opToken}`
    });
    assert.strictEqual(opMeRes.status, 200);
    assert.strictEqual(opMeRes.data.username, testUsername);
    assert.deepStrictEqual(opMeRes.data.selectedPages, ['#/exchange', '#/market-watch']);
    console.log('✓ Multi-page operator login returns authoritative selectedPages and permissions.');

    // ------------------------------------------------------------------
    // TEST 5: LEAST PRIVILEGE & SERVER-SIDE ACCESS RESTRICTION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: SERVER-SIDE AUTHORIZATION & ACCESS RESTRICTIONS ---');
    // Operator is authorized for order claim because of orders.verify permission
    const claimRes = await request('POST', '/api/order/claim', { orderId: 'NON_EXISTENT_TEST', deskId: 'DESK_1' }, {
      'Authorization': `Bearer ${opToken}`
    });
    // Should pass auth middleware (status 404 because order doesn't exist, NOT 403 Forbidden)
    assert(claimRes.status === 404 || claimRes.status === 200, `Operator must be authorized to attempt order claim (got ${claimRes.status})`);

    // Operator is NOT authorized for market simulation controls (requires admin)
    const marketControlRes = await request('POST', '/api/market/control', { action: 'START' }, {
      'Authorization': `Bearer ${opToken}`
    });
    assert.strictEqual(marketControlRes.status, 403, 'Operator without admin role must receive 403 on market control');

    // Operator is NOT authorized to provision staff
    const unauthStaffRes = await request('POST', '/api/personnel', { username: 'unauth' }, {
      'Authorization': `Bearer ${opToken}`
    });
    assert.strictEqual(unauthStaffRes.status, 403, 'Operator without personnel.create must receive 403 on staff creation');

    // Separate page visibility from sensitive actions:
    // Provision a view-only operator who can access #/exchange page but has NO exchange.execute permission
    const viewOnlyUsername = `staff_view_${Date.now()}`;
    const viewOnlyRes = await request('POST', '/api/personnel', {
      name: 'Pooja Sharma (Trainee)',
      username: viewOnlyUsername,
      role: 'operator_x',
      department: 'Exchange Observation',
      password: 'trainee-pass-2026',
      selectedPages: ['#/exchange', '#/results'],
      permissions: ['exchange.view', 'results.view'] // Has page visibility, NO execute or publish
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(viewOnlyRes.status, 201);

    const viewLoginRes = await request('POST', '/api/auth/login', {
      username: viewOnlyUsername,
      password: 'trainee-pass-2026'
    });
    assert.strictEqual(viewLoginRes.status, 200);
    const viewToken = viewLoginRes.data.token;

    // View-only operator attempting sensitive order EXECUTE must be rejected with 403
    const unauthExecuteRes = await request('POST', '/api/order/action', {
      orderId: 'ORD_TEST_EXEC',
      actionType: 'EXECUTE'
    }, {
      'Authorization': `Bearer ${viewToken}`
    });
    assert.strictEqual(unauthExecuteRes.status, 403, 'Operator without exchange.execute must receive 403 on EXECUTE');
    assert(unauthExecuteRes.data.error.includes('exchange.execute'), 'Must cite exchange.execute');

    // View-only operator attempting sensitive results PUBLISH must be rejected with 403
    const unauthPublishRes = await request('POST', '/api/results/publish', {
      eventId: 'EVT_LIVE_MAIN'
    }, {
      'Authorization': `Bearer ${viewToken}`
    });
    assert.strictEqual(unauthPublishRes.status, 403, 'Operator without results.approve must receive 403 on results publication');
    console.log('✓ Server-side least privilege authorization verified (page visibility strictly separated from EXECUTE & PUBLISH).');

    // ------------------------------------------------------------------
    // TEST 6: NAVIGATION CONFIGURATION & MULTI-PAGE VISIBILITY
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: NAVIGATION VISIBILITY FOR MULTI-PAGE ACCOUNTS ---');
    // Operator with selectedPages ['#/exchange', '#/market-watch']
    const opSections = getFilteredNavSections('operator_x', opLoginRes.data.permissions, opLoginRes.data.selectedPages);
    const opPaths = opSections.flatMap(s => s.items.map(i => i.path));
    assert(opPaths.includes('#/exchange'), 'Must include Exchange Desk');
    assert(opPaths.includes('#/market-watch'), 'Must include Market Watch');
    assert(!opPaths.includes('#/admin'), 'Must NOT include Floor Director');
    assert(!opPaths.includes('#/sebi'), 'Must NOT include SEBI Surveillance');

    // Admin must see all 14 destinations (consolidated from 17 in Phase 1)
    const adminSections = getFilteredNavSections('admin');
    const allItemsCount = NAVIGATION_SECTIONS.flatMap(s => s.items).length;
    const adminItemsCount = adminSections.flatMap(s => s.items).length;
    assert.strictEqual(adminItemsCount, allItemsCount, 'Admin must see ALL navigation destinations');
    assert.strictEqual(allItemsCount, 17, 'Must have exactly 17 total navigation destinations (including Bank Desk, Desk Queue Dashboard & Tech-Ops Monitoring)');
    console.log('✓ Navigation taxonomy and multi-page visibility verified.');

    // ------------------------------------------------------------------
    // TEST 7: EDIT STAFF ACCOUNT DETAILS & PERMISSIONS
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: EDIT STAFF ACCOUNT DETAILS & PERMISSIONS ---');
    const updateRes = await request('PUT', `/api/personnel/${createdStaffId}`, {
      displayName: 'Rohan Verma (Senior Lead)',
      department: 'Derivatives & Matching',
      selectedPages: ['#/exchange', '#/market-watch', '#/floor-ops'],
      permissions: ['exchange.view', 'exchange.execute', 'orders.verify', 'orders.view_queue', 'market.view', 'dashboard.view']
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(updateRes.status, 200, 'PUT /api/personnel/:id failed');
    assert.strictEqual(updateRes.data.account.displayName, 'Rohan Verma (Senior Lead)');
    assert.deepStrictEqual(updateRes.data.account.selectedPages, ['#/exchange', '#/market-watch', '#/floor-ops']);
    console.log('✓ Staff details and multi-page grants updated successfully.');

    // ------------------------------------------------------------------
    // TEST 8: SUPER-ADMIN SAFEGUARDS (SRIDHARA & LAST ADMIN PROTECTION)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 8: SUPER-ADMIN MASTER SAFEGUARDS ---');
    // Standard admin attempting to deactivate Sridhara
    const sridharaStaff = personnelRes.data.personnel.find(p => p.username === 'sridhara');
    assert(sridharaStaff, 'Sridhara master account must exist');

    const disableSridharaRes = await request('POST', `/api/personnel/${sridharaStaff.id}/status`, {
      status: 'DISABLED'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(disableSridharaRes.status, 403, 'Deactivating super-admin Sridhara must be blocked with 403');

    // Standard admin attempting to modify Sridhara
    const editSridharaRes = await request('PUT', `/api/personnel/${sridharaStaff.id}`, {
      displayName: 'Imposter'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(editSridharaRes.status, 403, 'Standard admin modifying Sridhara must be blocked with 403');
    console.log('✓ Super-admin master account safeguards strictly enforced.');

    // ------------------------------------------------------------------
    // TEST 9: ACCOUNT STATUS TOGGLING & IMMEDIATE SESSION REVOCATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 9: ACCOUNT DEACTIVATION & IMMEDIATE SESSION REVOCATION ---');
    // Deactivate Rohan Verma
    const disableRes = await request('POST', `/api/personnel/${createdStaffId}/status`, {
      status: 'DISABLED',
      reason: 'End of shift clearance'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(disableRes.status, 200, 'Disabling staff account failed');
    assert.strictEqual(disableRes.data.status, 'DISABLED');

    // 1. Existing session token must be immediately rejected
    const revokedCheckRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${opToken}`
    });
    assert.strictEqual(revokedCheckRes.status, 401, 'Revoked token must return 401 Unauthorized');

    // 2. New login attempt must be rejected with 403 Forbidden
    const disabledLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'operator-pass-2026'
    });
    assert.strictEqual(disabledLoginRes.status, 403, 'Disabled account login must return 403 Forbidden');
    console.log('✓ Immediate session revocation and disabled account login rejection verified.');

    // Reactivate account
    const reactivateRes = await request('POST', `/api/personnel/${createdStaffId}/status`, {
      status: 'ACTIVE'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(reactivateRes.status, 200);
    assert.strictEqual(reactivateRes.data.status, 'ACTIVE');

    const reactivatedLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'operator-pass-2026'
    });
    assert.strictEqual(reactivatedLoginRes.status, 200, 'Reactivated account login must succeed');
    console.log('✓ Account reactivation verified.');

    // ------------------------------------------------------------------
    // TEST 10: IN-APP AUTHORIZED PASSWORD RESET
    // ------------------------------------------------------------------
    console.log('\n--- TEST 10: IN-APP AUTHORIZED PASSWORD RESET ---');
    const resetRes = await request('POST', `/api/personnel/${createdStaffId}/reset-password`, {
      newPassword: 'new-secure-password-2026'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(resetRes.status, 200, 'Password reset failed');

    // Old password must fail
    const oldPwLogin = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'operator-pass-2026'
    });
    assert.strictEqual(oldPwLogin.status, 401, 'Old password must be rejected');

    // New password must succeed
    const newPwLogin = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'new-secure-password-2026'
    });
    assert.strictEqual(newPwLogin.status, 200, 'New password login must succeed');
    console.log('✓ Authorized password reset verified.');

    // ------------------------------------------------------------------
    // TEST 11: AUDIT TRAIL LOGGING
    // ------------------------------------------------------------------
    console.log('\n--- TEST 11: AUDIT TRAIL INTEGRITY ---');
    const auditRes = await request('GET', '/api/audit-log', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(auditRes.status, 200);
    const auditEntries = auditRes.data.auditLog || auditRes.data.log || auditRes.data.logs || [];
    const staffEvents = auditEntries.filter(e => e.action?.startsWith('PERSONNEL_'));
    assert(staffEvents.length >= 3, 'Must have recorded PERSONNEL_CREATE, UPDATE, STATUS events');
    assert(staffEvents.some(e => e.action === 'PERSONNEL_CREATE' && e.target === testUsername));
    assert(staffEvents.some(e => e.action === 'PERSONNEL_UPDATE' && e.target === testUsername));
    assert(staffEvents.some(e => e.action === 'PERSONNEL_PASSWORD_RESET' && e.target === testUsername));
    console.log(`✓ Audit trail verified (${staffEvents.length} personnel governance events logged).`);

    // ------------------------------------------------------------------
    // TEST 12: SPECIFICATION EXAMPLE QUARANTINE GUARD
    // ------------------------------------------------------------------
    console.log('\n--- TEST 12: SPECIFICATION EXAMPLE QUARANTINE GUARD ---');
    // Read production state.json file to verify NO mock accounts leaked into production state
    const prodStateRaw = fs.readFileSync('./state.json', 'utf8');
    assert(!prodStateRaw.includes(testUsername), 'Test username must NOT be in state.json');
    assert(!prodStateRaw.includes('"name":"","username":"","role":"operator_x"'), 'Spec example must NEVER be in state.json');
    console.log('✓ Production state.json is clean and preserved.');

    console.log('\n======================================================================');
    console.log('✅ ALL MULTI-PAGE STAFF ACCESS & RBAC TESTS PASSED SUCCESSFULLY (12/12)!');
    console.log('======================================================================\n');
  } finally {
    // Gracefully shut down test server process
    serverProc.kill();
    // Clean up temporary test state file
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }
}

run().catch(err => {
  console.error('\n❌ RBAC TEST SUITE FAILED:', err);
  process.exit(1);
});
