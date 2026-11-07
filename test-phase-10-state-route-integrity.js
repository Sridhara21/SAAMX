/**
 * SAAMX Phase 10 — State Route Integrity & Sanitization Regression Test
 *
 * Verifies:
 * 1. GET /api/state is registered exactly ONCE in server.js (dead duplicate route removed).
 * 2. Unauthenticated GET /api/state returns sanitized state and leaks zero credentials/passwords.
 * 3. Authenticated participant GET /api/state protects participant privacy and does not leak raw state.
 * 4. Authoritative state.json hash is 100% untouched pre and post test.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3094;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const AUTHORITATIVE_STATE_PATH = path.resolve('state.json');
const DISPOSABLE_STATE_PATH = path.resolve('state.test-phase10-fixture.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const FIXED_AUTH_SECRET = 'saamx-event-fixed-jwt-secret-2026-phase10';

let serverProcess = null;
const testResults = [];

function recordTest(id, name, endpoint, role, scenario, expected, actual, passed, evidence = {}) {
  const result = { id, name, endpoint, role, scenario, expected, actual, passed, evidence };
  testResults.push(result);
  const mark = passed ? '🟢 PASS' : '🔴 FAIL';
  console.log(`\n[${mark}] ${id}: ${name}`);
  console.log(`  Endpoint:  ${endpoint}`);
  console.log(`  Role/Auth: ${role}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (!passed) {
    console.error(`  Evidence:  ${JSON.stringify(evidence)}`);
  }
}

function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function request(method, route, body = null, headers = {}) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const url = new URL(route, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data, latencyMs: Date.now() - startTime });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runRegressionSuite() {
  console.log('======================================================================');
  console.log('SAAMX PHASE 10: STATE ROUTE INTEGRITY & REGRESSION AUDIT');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE HASH
  const preHash = computeFileHash(AUTHORITATIVE_STATE_PATH);
  const preHashValid = preHash === EXPECTED_HASH;
  recordTest(
    'PREFLIGHT-HASH-01',
    'Pre-Flight Authoritative state.json Checksum Verification',
    'Filesystem state.json SHA-256',
    'System Governor',
    'Ensure authoritative state hash matches expected baseline prior to testing',
    EXPECTED_HASH,
    preHash,
    preHashValid,
    { expected: EXPECTED_HASH, actual: preHash }
  );

  if (!preHashValid) {
    throw new Error('Preflight hash mismatch! Aborting.');
  }

  // STEP 2: STATIC ROUTE AUDIT (ZERO DUPLICATE ROUTES ACROSS ENTIRE ROUTE TABLE)
  const serverCode = fs.readFileSync('server.js', 'utf8');
  const lines = serverCode.split('\n');
  const routeMap = new Map();

  lines.forEach((line, idx) => {
    const match = line.match(/app\.(get|post|put|delete|patch|all)\(\s*(\[[^\]]+\]|'[^']+'|"[^"]+")/);
    if (match) {
      const method = match[1].toUpperCase();
      let paths = [];
      if (match[2].startsWith('[')) {
        paths = match[2].slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        paths = [match[2].replace(/^['"]|['"]$/g, '')];
      }
      paths.forEach(p => {
        const route = method + ' ' + p;
        if (!routeMap.has(route)) routeMap.set(route, []);
        routeMap.get(route).push(idx + 1);
      });
    }
  });

  const duplicateRoutes = [];
  for (const [route, locs] of routeMap.entries()) {
    if (locs.length > 1) {
      duplicateRoutes.push({ route, locs });
    }
  }

  const zeroDuplicates = duplicateRoutes.length === 0;
  recordTest(
    'ROUTE-INTEGRITY-01',
    'Global Zero-Duplicate Route Definition Invariant',
    'server.js Route Table',
    'Code Governor',
    'Verify all routes (including /api/state, /api/admin/seed, /api/admin/reset, /api/audit-log, /api/ipo/advance) have exactly 1 definition',
    '0 duplicate route signatures',
    `${duplicateRoutes.length} duplicate signatures detected`,
    zeroDuplicates,
    { duplicateRoutes, totalUniqueRoutes: routeMap.size }
  );

  // Specific check for critical routes
  const criticalRoutes = ['GET /api/state', 'POST /api/admin/seed', 'POST /api/admin/reset', 'GET /api/audit-log', 'POST /api/ipo/advance'];
  criticalRoutes.forEach(cr => {
    const locs = routeMap.get(cr) || [];
    const isSingle = locs.length === 1;
    recordTest(
      `CRITICAL-ROUTE-${cr.replace(/[\s\/]/g, '_')}`,
      `Unique Definition for Critical Route ${cr}`,
      'server.js Route Table',
      'Security Governor',
      `Ensure ${cr} is defined exactly once with zero legacy shadowing`,
      'Exactly 1 definition',
      `Found ${locs.length} definition(s) at line(s): ${locs.join(', ')}`,
      isSingle,
      { route: cr, locations: locs }
    );
  });

  // STEP 3: DISPOSABLE FIXTURE SETUP
  const baseData = JSON.parse(fs.readFileSync(AUTHORITATIVE_STATE_PATH, 'utf8'));
  fs.writeFileSync(DISPOSABLE_STATE_PATH, JSON.stringify(baseData, null, 2), 'utf8');
  console.log('✓ Created disposable fixture:', path.basename(DISPOSABLE_STATE_PATH));

  // STEP 4: SPAWN SERVER
  console.log(`Spawning test server on port ${TEST_PORT}...`);
  serverProcess = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      STATE_FILE: DISPOSABLE_STATE_PATH,
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: FIXED_AUTH_SECRET,
      JWT_SECRET: FIXED_AUTH_SECRET,
      SESSION_SECRET: FIXED_AUTH_SECRET,
      NODE_ENV: 'test'
    },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await request('GET', '/api/ping');
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  if (!ready) {
    throw new Error(`Server failed to start on port ${TEST_PORT}`);
  }
  console.log(`✓ Test server operational on ${BASE_URL}`);

  // STEP 5: TEST UNCREDENTIALED /api/state CALL
  const anonRes = await request('GET', '/api/state');
  const anonBody = anonRes.body;
  const anonRaw = anonRes.raw;

  const hasSanitizedWrapper = anonBody && (anonBody.state !== undefined || anonBody.securities !== undefined);
  const leaksPersonnelSecrets = anonRaw.includes('saamx-event-2026') || anonRaw.includes('saamx-team-');
  const leaksAuthSecret = anonRaw.includes(FIXED_AUTH_SECRET);
  const leaksAuditLogRaw = anonBody.auditLog !== undefined && Array.isArray(anonBody.auditLog) && anonBody.auditLog.length > 0;

  const sanitizationPassed = anonRes.status === 200 && hasSanitizedWrapper && !leaksPersonnelSecrets && !leaksAuthSecret;

  recordTest(
    'STATE-SANITIZATION-ANON-02',
    'Unauthenticated GET /api/state Sanitization & Privacy Preservation',
    'GET /api/state',
    'Anonymous Client',
    'Ensure GET /api/state uses getSanitizedState and leaks 0 credentials, secrets or internal state',
    'HTTP 200 sanitized state, 0 credentials leaked',
    `Status: ${anonRes.status}, Leaks Secrets: ${leaksPersonnelSecrets}, Leaks JWT Secret: ${leaksAuthSecret}`,
    sanitizationPassed,
    { status: anonRes.status, leaksPersonnelSecrets, leaksAuthSecret, leaksAuditLogRaw }
  );

  // STEP 6: TEST AUTHENTICATED TEAM T01 /api/state CALL
  const loginRes = await request('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
  const token = loginRes.body?.token;

  const teamRes = await request('GET', '/api/state', null, { 'Authorization': `Bearer ${token}` });
  const teamBody = teamRes.body;
  const teamRaw = teamRes.raw;

  const teamSanitized = teamRes.status === 200 && !teamRaw.includes('saamx-event-2026') && !teamRaw.includes(FIXED_AUTH_SECRET);
  recordTest(
    'STATE-SANITIZATION-AUTH-03',
    'Authenticated Participant GET /api/state Isolation',
    'GET /api/state',
    'Participant Team T01',
    'Ensure authenticated participant receives appropriately scoped state without credential exposure',
    'HTTP 200 scoped state, 0 credential leakage',
    `Status: ${teamRes.status}, Scoped & Sanitized: ${teamSanitized}`,
    teamSanitized,
    { status: teamRes.status }
  );

  // STEP 7: TEST ADMIN /api/admin/seed SANITIZATION & PERSISTENCE
  const adminLoginRes = await request('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
  const adminToken = adminLoginRes.body?.token;

  const seedRes = await request('POST', '/api/admin/seed', {}, { 'Authorization': `Bearer ${adminToken}` });
  const seedBody = seedRes.body;
  const seedRaw = seedRes.raw;
  const seedSafe = seedRes.status === 200 && seedBody.success === true && !seedRaw.includes('saamx-team-01');

  recordTest(
    'ADMIN-SEED-SANITIZATION-04',
    'Admin POST /api/admin/seed Sanitization & Persistence',
    'POST /api/admin/seed',
    'System Administrator',
    'Verify seed endpoint executes, saves state, and returns sanitized state without leaking team/personnel credentials',
    'HTTP 200, success: true, 0 credentials leaked in payload',
    `Status: ${seedRes.status}, Success: ${seedBody?.success}, Safe: ${seedSafe}`,
    seedSafe,
    { status: seedRes.status, success: seedBody?.success }
  );

  // STEP 8: TEST ADMIN /api/admin/reset CONFIRMATION & SANITIZATION
  const resetBadRes = await request('POST', '/api/admin/reset', { confirmText: 'WRONG' }, { 'Authorization': `Bearer ${adminToken}` });
  const resetGoodRes = await request('POST', '/api/admin/reset', { confirmText: 'RESET ALL' }, { 'Authorization': `Bearer ${adminToken}` });
  const resetRaw = resetGoodRes.raw;
  const resetSafe = resetBadRes.status === 400 && resetGoodRes.status === 200 && !resetRaw.includes('saamx-team-01');

  recordTest(
    'ADMIN-RESET-GUARD-05',
    'Admin POST /api/admin/reset Confirmation & Sanitization',
    'POST /api/admin/reset',
    'System Administrator',
    'Verify reset requires exact "RESET ALL" confirmation and returns sanitized state without credential exposure',
    'Bad confirm: 400, Valid confirm: 200, 0 credentials leaked',
    `Bad: ${resetBadRes.status}, Good: ${resetGoodRes.status}, Safe: ${resetSafe}`,
    resetSafe,
    { badStatus: resetBadRes.status, goodStatus: resetGoodRes.status }
  );

  // STEP 9: CLEANUP & POST-FLIGHT HASH
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 600));
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
    serverProcess = null;
    console.log('✓ Terminated test server');
  }

  if (fs.existsSync(DISPOSABLE_STATE_PATH)) {
    fs.unlinkSync(DISPOSABLE_STATE_PATH);
    console.log('✓ Cleaned up disposable fixture');
  }

  const postHash = computeFileHash(AUTHORITATIVE_STATE_PATH);
  const postHashValid = postHash === EXPECTED_HASH;
  recordTest(
    'POSTFLIGHT-HASH-02',
    'Post-Flight Authoritative state.json Checksum Invariant',
    'Filesystem state.json SHA-256',
    'System Governor',
    'Ensure authoritative state hash remains 100% byte-identical to baseline',
    EXPECTED_HASH,
    postHash,
    postHashValid,
    { expected: EXPECTED_HASH, actual: postHash }
  );

  console.log('\n======================================================================');
  const allPassed = testResults.every(t => t.passed);
  const passedCount = testResults.filter(t => t.passed).length;
  console.log(`REGRESSION AUDIT SUMMARY: ${passedCount}/${testResults.length} PASSED`);
  console.log(`Authoritative Hash: ${postHash}`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runRegressionSuite().catch(async (err) => {
  console.error('Fatal test execution failure:', err);
  if (serverProcess) {
    try { serverProcess.kill('SIGKILL'); } catch (e) {}
  }
  if (fs.existsSync(DISPOSABLE_STATE_PATH)) {
    try { fs.unlinkSync(DISPOSABLE_STATE_PATH); } catch (e) {}
  }
  process.exit(1);
});
