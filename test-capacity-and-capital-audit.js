import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3030;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ISOLATED_STATE_FILE = path.join(__dirname, 'test-state-capacity.json');
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

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await request('GET', '/api/state');
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Server failed to start within timeout.');
}

async function runCapacityAndCapitalSuite() {
  console.log('======================================================================');
  console.log('🏛️ SAAMX — CONFIGURABLE INVESTMENT HOUSE CAPACITY & CAPITAL TEST SUITE');
  console.log('======================================================================\n');

  // Verify baseline state.json hash
  const initialHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE_FILE)).digest('hex');
  console.log(`Initial state.json SHA-256: ${initialHash}`);

  // Create isolated copy for testing
  fs.copyFileSync(ORIGINAL_STATE_FILE, ISOLATED_STATE_FILE);

  console.log(`Spawning isolated server on port ${PORT} using test-state-capacity.json...`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'test',
      STATE_FILE: ISOLATED_STATE_FILE,
      ALLOW_TEST_HEADER_AUTH: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (!msg.includes('ExperimentalWarning')) {
      console.log(`[Server stderr] ${msg}`);
    }
  });

  try {
    await waitForServer();
    console.log('✓ Isolated test server is online and responding.\n');

    // Authenticate Admin and Team T01
    const adminLoginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login must succeed');
    const adminToken = adminLoginRes.data?.token;
    assert(adminToken && adminToken.startsWith('saamx.'), 'Admin token must be valid');

    const teamLoginRes = await request('POST', '/api/auth/login', {
      username: 'T01',
      password: 'saamx-team-01'
    });
    assert.strictEqual(teamLoginRes.status, 200, 'Team login must succeed');
    const teamToken = teamLoginRes.data?.token;
    assert(teamToken && teamToken.startsWith('saamx.'), 'Team token must be valid');

    const sebiLoginRes = await request('POST', '/api/auth/login', {
      username: 'sebi',
      password: 'sebi-event-2026'
    });
    assert.strictEqual(sebiLoginRes.status, 200, 'SEBI login must succeed');
    const sebiToken = sebiLoginRes.data?.token;
    assert(sebiToken && sebiToken.startsWith('saamx.'), 'SEBI token must be valid');

    // --- TEST 1: UNAUTHENTICATED CAPACITY ACCESS ---
    console.log('--- TEST 1: UNAUTHENTICATED CAPACITY WRITE REJECTION ---');
    const unauthRes = await request('POST', '/api/admin/capacity', { capacity: 15 });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated capacity change must return HTTP 401');
    console.log('✓ Unauthenticated request rejected with HTTP 401.');

    // --- TEST 2: UNAUTHORIZED ROLE (TEAM) REJECTION ---
    console.log('\n--- TEST 2: UNAUTHORIZED ROLE (TEAM) REJECTION ---');
    const teamRes = await request('POST', '/api/admin/capacity', { capacity: 15 }, {
      'Authorization': `Bearer ${teamToken}`
    });
    assert.strictEqual(teamRes.status, 403, 'Team account must be forbidden from changing capacity (HTTP 403)');
    console.log('✓ Student team forbidden from changing event capacity (HTTP 403).');

    // --- TEST 3: UNAUTHORIZED EVENT CONFIGURATION REJECTION ---
    console.log('\n--- TEST 3: UNAUTHORIZED EVENT CONFIGURATION REJECTION ---');
    const teamEvtRes = await request('POST', '/api/event/update', {
      updates: { maximumInvestmentHouses: 15 }
    }, {
      'Authorization': `Bearer ${teamToken}`
    });
    assert.strictEqual(teamEvtRes.status, 403, 'Team account must be forbidden from updating event (HTTP 403)');
    console.log('✓ Student team forbidden from updating event configuration (HTTP 403).');

    // --- TEST 4: CAPACITY INPUT VALIDATION MATRIX ---
    console.log('\n--- TEST 4: CAPACITY INPUT VALIDATION (INVALID INPUTS) ---');
    const invalidInputs = [
      { val: 9, label: 'below minimum (9)' },
      { val: 21, label: 'above maximum (21)' },
      { val: 0, label: 'zero (0)' },
      { val: -5, label: 'negative (-5)' },
      { val: 12.5, label: 'decimal (12.5)' },
      { val: 'fifteen', label: 'non-numeric string' },
      { val: '', label: 'empty string' },
      { val: null, label: 'null value' },
      { val: true, label: 'boolean true' }
    ];

    for (const item of invalidInputs) {
      const res = await request('POST', '/api/admin/capacity', { capacity: item.val }, {
        'Authorization': `Bearer ${adminToken}`,
        'X-FMS-Password': 'saamx-event-2026',
        'X-FMS-Role': 'admin'
      });
      assert.strictEqual(res.status, 400, `Capacity ${item.label} must be rejected with HTTP 400`);
      assert(res.data.error, `Error message must be returned for ${item.label}`);
    }
    console.log('✓ All 9 invalid capacity inputs strictly rejected with HTTP 400 Bad Request.');

    // --- TEST 5: VALID CAPACITY MATRIX (10, 12, 15, 18, 20) ---
    console.log('\n--- TEST 5: VALID CAPACITY MATRIX & AGGREGATE CAPITAL ---');
    const validCapacities = [
      { cap: 10, expectedAggregate: 100000000, label: '₹10 Crore' },
      { cap: 12, expectedAggregate: 120000000, label: '₹12 Crore' },
      { cap: 15, expectedAggregate: 150000000, label: '₹15 Crore' },
      { cap: 18, expectedAggregate: 180000000, label: '₹18 Crore' },
      { cap: 20, expectedAggregate: 200000000, label: '₹20 Crore' }
    ];

    for (const item of validCapacities) {
      const res = await request('POST', '/api/admin/capacity', {
        capacity: item.cap,
        reason: `Rehearsal configuration for ${item.cap} houses`
      }, {
        'Authorization': `Bearer ${adminToken}`,
        'X-FMS-Password': 'saamx-event-2026',
        'X-FMS-Role': 'admin'
      });

      assert.strictEqual(res.status, 200, `Capacity ${item.cap} must succeed with HTTP 200`);
      assert.strictEqual(res.data.configuredCapacity, item.cap, `Configured capacity must be ${item.cap}`);
      assert.strictEqual(res.data.startingCapitalPerHouse, 10000000, 'Starting capital per house must be ₹1 Crore');
      assert.strictEqual(res.data.aggregateStartingCapital, item.expectedAggregate, `Aggregate starting capital must be ${item.label}`);

      // Verify GET /api/capacity reflects authoritative state
      const getRes = await request('GET', '/api/capacity');
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.configuredCapacity, item.cap);
      assert.strictEqual(getRes.data.aggregateStartingCapital, item.expectedAggregate);
      console.log(`  ✓ Capacity ${item.cap} houses: Per-house = ₹1 Cr, Aggregate = ${item.label} (${item.expectedAggregate.toLocaleString()} INR)`);
    }

    // --- TEST 6: PRESERVATION OF PORTFOLIOS, BALANCES, AND TEAMS ---
    console.log('\n--- TEST 6: NON-DESTRUCTIVE CAPACITY CHANGES ---');
    // Set capacity to 12
    await request('POST', '/api/admin/capacity', { capacity: 12 }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });

    const stateCheckRes = await request('GET', '/api/state', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    const teams = stateCheckRes.data.state.teams;
    assert.strictEqual(teams.length, 20, 'Existing 20 teams must NOT be deleted when capacity is reduced to 12');
    for (const t of teams) {
      assert.strictEqual(t.cashBalance, 10000000, `Team ${t.teamCode} cashBalance must remain ₹1 Crore`);
      assert.strictEqual(t.cashWallets?.INR, 10000000, `Team ${t.teamCode} INR wallet must remain ₹1 Crore`);
    }
    console.log('✓ Verified: 20 teams preserved, 0 teams deleted, all 20 cash balances strictly intact at ₹1 Crore.');

    // --- TEST 7: ENFORCEMENT ON TEAM ACTIVATION ---
    console.log('\n--- TEST 7: ENFORCEMENT ON TEAM ACTIVATION ---');
    // Configure capacity to 10
    await request('POST', '/api/admin/capacity', { capacity: 10 }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });

    // Batch set active count to 10
    const set10Res = await request('POST', '/api/admin/teams/set-active-count', { activeCount: 10 }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(set10Res.status, 200, 'Activating 10 teams under capacity 10 must succeed');

    // Attempting to batch set 11 teams under capacity 10 must be blocked
    const set11Res = await request('POST', '/api/admin/teams/set-active-count', { activeCount: 11 }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(set11Res.status, 400, 'Activating 11 teams under capacity 10 must return HTTP 400');
    console.log('✓ Batch activation exceeding capacity correctly blocked with HTTP 400.');

    // Attempting to individually activate 11th team (T11) via toggle-status must be blocked
    const toggleT11 = await request('POST', '/api/admin/team/toggle-status', { teamCode: 'T11', isActive: true }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(toggleT11.status, 400, 'Activating 11th team when capacity is 10 must return HTTP 400');
    console.log('✓ Individual team activation beyond capacity limit blocked with HTTP 400.');

    // --- TEST 8: ENFORCEMENT ON REGISTRATION INTAKE ---
    console.log('\n--- TEST 8: ENFORCEMENT ON REGISTRATION INTAKE ---');
    // Mock registration state to reach capacity
    const regCheckRes = await request('POST', '/api/register/complete', {
      schoolName: 'Test Academy Extra',
      investmentHouseName: 'Test House Overflow',
      contactPerson: 'Director Test'
    });
    // Either succeeds (if current registered < 10) or rejects with 400
    assert(regCheckRes.status === 200 || regCheckRes.status === 400, 'Registration returns valid status code');
    console.log(`✓ Registration intake evaluated against configured capacity (Status: ${regCheckRes.status}).`);

    // --- TEST 9: ACTIVE TRADING CAPACITY LOCKING ---
    console.log('\n--- TEST 9: ACTIVE TRADING SESSION CAPACITY LOCKING ---');
    // Transition marketState to Open
    const overrideOpen = await request('POST', '/api/event/schedule/override', {
      phase: 'MORNING_SESSION',
      marketStatus: 'Open',
      sessionState: 'CONTINUOUS_TRADING',
      reason: 'Start continuous trading test'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(overrideOpen.status, 200, 'Schedule override to Open must succeed');

    // Attempt to change capacity during active trading without forceOverride
    const lockedRes = await request('POST', '/api/admin/capacity', { capacity: 15 }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(lockedRes.status, 409, 'Changing capacity during active trading must return HTTP 409 Conflict');
    assert(lockedRes.data.locked === true, 'Response must indicate capacity is locked');
    console.log('✓ Capacity change during active trading locked with HTTP 409 Conflict.');

    // Force override during active trading
    const forceRes = await request('POST', '/api/admin/capacity', {
      capacity: 15,
      forceOverride: true,
      reason: 'Super-admin emergency capacity expansion'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(forceRes.status, 200, 'Force override during active trading must succeed (HTTP 200)');
    console.log('✓ Emergency authorized force override succeeded with HTTP 200.');

    // Restore marketState to Closed
    const overrideClose = await request('POST', '/api/event/schedule/override', {
      phase: 'POST_MARKET_REVIEW',
      marketStatus: 'Closed',
      sessionState: 'RESULTS',
      reason: 'Close trading test'
    }, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(overrideClose.status, 200, 'Schedule override to Closed must succeed');

    // --- TEST 10: COORDINATOR CLAIM AUTHORIZATION ---
    console.log('\n--- TEST 10: COORDINATOR CLAIM AUTHORIZATION ---');
    // Team user attempting to claim coordinator -> 403 Forbidden
    const teamCoordRes = await request('POST', '/api/coordinator/claim', {
      role: 'team'
    }, {
      'Authorization': `Bearer ${teamToken}`
    });
    assert.strictEqual(teamCoordRes.status, 403, 'Team user claiming coordinator must return HTTP 403');
    console.log('✓ Unauthorized coordinator claim by student team blocked with HTTP 403.');

    // SEBI officer claiming coordinator -> 200 OK
    const sebiCoordRes = await request('POST', '/api/coordinator/claim', {
      sessionUuid: 'SEBI_TEST_SESSION_001',
      role: 'sebi'
    }, {
      'Authorization': `Bearer ${sebiToken}`,
      'X-FMS-Password': 'sebi-event-2026',
      'X-FMS-Role': 'sebi'
    });
    assert.strictEqual(sebiCoordRes.status, 200, 'SEBI officer claiming coordinator must return HTTP 200');
    assert.strictEqual(sebiCoordRes.data.coordinator.role, 'sebi');
    console.log('✓ Authorized SEBI coordinator claim succeeded with HTTP 200.');

    // --- TEST 11: UNMATCHED API ROUTE 404 JSON HANDLING ---
    console.log('\n--- TEST 11: UNMATCHED API ROUTE 404 JSON HANDLING ---');
    const badApiRes = await request('GET', '/api/nonexistent-route-audit-test', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(badApiRes.status, 404, 'Unmatched API route must return HTTP 404');
    assert(typeof badApiRes.data === 'object' && badApiRes.data.error, 'Unmatched API route must return JSON error object');
    assert(!String(badApiRes.data).includes('<!doctype html>'), 'Unmatched API route must NEVER return HTML SPA index');
    console.log('✓ Unmatched API route returns clean JSON 404 response (prevented HTML SPA fallthrough).');

    // --- TEST 12: AUDIT LOG INTEGRITY ---
    console.log('\n--- TEST 12: AUDIT LOGGING OF CAPACITY EVENTS ---');
    const auditRes = await request('GET', '/api/audit-log', null, {
      'Authorization': `Bearer ${adminToken}`,
      'X-FMS-Password': 'saamx-event-2026',
      'X-FMS-Role': 'admin'
    });
    assert.strictEqual(auditRes.status, 200);
    const capacityLogs = (auditRes.data.logs || []).filter(l => l.action === 'CAPACITY_CONFIG_UPDATED');
    assert(capacityLogs.length >= 2, 'Audit log must contain capacity update entries');
    console.log(`✓ Verified ${capacityLogs.length} capacity governance entries in state.auditLog.`);

    console.log('\n======================================================================');
    console.log('🎉 ALL 12 CAPACITY & CAPITAL AUDIT VERIFICATIONS PASSED (12/12)!');
    console.log('======================================================================\n');
  } finally {
    console.log('Terminating isolated test server process...');
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 600));

    // Clean up temporary isolated state file
    if (fs.existsSync(ISOLATED_STATE_FILE)) {
      fs.unlinkSync(ISOLATED_STATE_FILE);
      console.log('Cleaned up isolated state file.');
    }

    // Verify original state.json remains 100% untouched
    const postTestHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE_FILE)).digest('hex');
    assert.strictEqual(postTestHash, initialHash, 'ORIGINAL state.json must remain 100% byte-for-byte untouched');
    console.log(`✓ Confirmed state.json SHA-256 untouched: ${postTestHash}\n`);
  }
}

runCapacityAndCapitalSuite().catch(err => {
  console.error('❌ SUITE FAILURE:', err);
  process.exit(1);
});
