import http from 'http';
import { spawn } from 'child_process';
import assert from 'assert';

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_PASSWORD = 'fms-event-2026';

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
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function verify(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function waitForServer() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await request('GET', '/api/state', null, { 'X-FMS-Password': ADMIN_PASSWORD });
      if (res.status === 200) return true;
    } catch (e) {
      // wait
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Server failed to start within timeout.');
}

async function runFinalTestSuite() {
  console.log('\n============================================================');
  console.log('🚀 SAAMX 2026 — COMPREHENSIVE FINAL BUILD VERIFICATION SUITE');
  console.log('============================================================\n');

  console.log(`Starting standalone backend server instance on port ${PORT}...`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (d) => {
    console.error(`[server stderr] ${d.toString().trim()}`);
  });

  try {
    await waitForServer();
    console.log('✓ Backend instance ready. Seeding initial starter universe...\n');
    await request('POST', '/api/admin/seed', {}, { 'X-FMS-Password': ADMIN_PASSWORD });

    // 1. Check Server Liveness & Seeded Data
    console.log('--- TEST 1: SERVER & STATE LIVENESS ---');
    const stateRes = await request('GET', '/api/state', null, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(stateRes.status === 200, 'Server is running and returns HTTP 200 for /api/state');
    const rootState = stateRes.data.state;
    verify(rootState.securities && rootState.securities.length >= 10, 'Universe has seeded securities');
    verify(rootState.teams && rootState.teams.length >= 10, 'Active teams present (T01 - T20)');
    verify(rootState.marketState !== undefined, 'Market state object exists');

    // 2. Participant Privacy Controls
    console.log('\n--- TEST 2: PARTICIPANT PRIVACY GATES ---');
    const loginT01 = await request('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    const t01Token = loginT01.data.token;

    // Team T01 queries own portfolio -> 200 OK
    const ownRes = await request('POST', '/api/portfolio', { teamCode: 'T01' }, { 'Authorization': `Bearer ${t01Token}` });
    verify(ownRes.status === 200, 'T01 can access own portfolio (HTTP 200)');
    verify(ownRes.data.team.teamCode === 'T01', 'Portfolio belongs to T01');

    // Team T01 attempts to query T02 portfolio -> 403 Forbidden
    const crossRes = await request('POST', '/api/portfolio', { teamCode: 'T02' }, { 'Authorization': `Bearer ${t01Token}` });
    verify(crossRes.status === 403, 'T01 querying T02 portfolio is rejected with HTTP 403 Forbidden');

    // 3. Disaster Recovery & Snapshot System
    console.log('\n--- TEST 3: DISASTER RECOVERY & AUDIT BACKUPS ---');
    const backupRes = await request('POST', '/api/admin/backup', { notes: 'Automated pre-event snapshot' }, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(backupRes.status === 200, 'Created disaster recovery backup snapshot (HTTP 200)');
    verify(backupRes.data.backupId && (backupRes.data.backupId.toLowerCase().includes('backup')), 'Valid backupId returned');
    const createdBackupId = backupRes.data.backupId;

    // Test restore validation - missing confirmation phrase
    const badRestoreRes = await request('POST', '/api/admin/restore', { backupId: createdBackupId, confirmPhrase: 'WRONG' }, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(badRestoreRes.status === 400, 'Restore without exact confirmation phrase is rejected (HTTP 400)');

    // Test restore validation - with exact confirmation phrase
    const goodRestoreRes = await request('POST', '/api/admin/restore', { backupId: createdBackupId, confirmPhrase: `RESTORE ${createdBackupId}` }, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(goodRestoreRes.status === 200, `Restore with phrase "RESTORE ${createdBackupId}" succeeded (HTTP 200)`);

    // 4. Audit Log System
    console.log('\n--- TEST 4: AUDIT LOG LEDGER SYSTEM ---');
    const auditRes = await request('GET', '/api/audit-log', null, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(auditRes.status === 200, 'Audit log endpoint returned HTTP 200');
    verify(Array.isArray(auditRes.data.log), 'Audit log is a valid chronological array');
    verify(auditRes.data.log.length > 0, 'Audit events recorded in state');
    const lastAudit = auditRes.data.log[auditRes.data.log.length - 1];
    verify(lastAudit.action && lastAudit.timestamp, 'Audit entry contains action and timestamp');

    // 5. Atomic Market Reconciliation Engine
    console.log('\n--- TEST 5: RECONCILIATION ENGINE & LEADERBOARD DETERMINATION ---');
    const reconRes = await request('POST', '/api/admin/reconcile', { confirmText: 'RECONCILE MARKET' }, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(reconRes.status === 200, 'Reconciliation engine executed successfully (HTTP 200)');
    verify(reconRes.data.success === true, 'Reconciliation status is success: true');
    verify(Array.isArray(reconRes.data.leaderboard), 'Authoritative leaderboard generated as array');
    verify(reconRes.data.leaderboard.length >= 10, 'All active teams ranked on leaderboard');

    const topRanked = reconRes.data.leaderboard[0];
    verify(topRanked.rank === 1, 'Top team has rank 1');
    verify(topRanked.portfolioValue >= 0, 'Top team has computed portfolioValue');
    verify(typeof topRanked.roi === 'number', 'Top team has computed ROI %');

    // Verify session state was locked and moved to RESULTS
    const stateAfterRecon = await request('GET', '/api/state', null, { 'X-FMS-Password': ADMIN_PASSWORD });
    verify(stateAfterRecon.data.state.marketState.sessionState === 'RESULTS', 'Market sessionState updated to RESULTS');
    verify(stateAfterRecon.data.state.marketState.status === 'Closed', 'Market trading status locked to Closed');

    // Verify Audit Log captured RECONCILE / MARKET_RECONCILE
    const auditAfter = await request('GET', '/api/audit-log', null, { 'X-FMS-Password': ADMIN_PASSWORD });
    const reconAudit = auditAfter.data.log.find(a => a.action.includes('RECONCILE'));
    verify(reconAudit !== undefined, 'Audit log captured reconciliation event');

    console.log('\n============================================================');
    console.log('✅ ALL FINAL SUITE TESTS PASSED WITH 100% SUCCESS!');
    console.log('============================================================\n');
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

runFinalTestSuite();
