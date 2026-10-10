import assert from 'assert';
import http from 'http';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_PASSWORD = 'fms-event-2026';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': ADMIN_PASSWORD
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testTeamActiveStatus() {
  console.log('======================================================================');
  console.log('🧪 SAAMX 2026 — TEAM ACTIVE/INACTIVE CONTROLS TEST SUITE');
  console.log('======================================================================\n');

  // 1. Toggle Individual Team T20 to Inactive
  console.log('1. Toggling Team T20 to Inactive...');
  const tog1 = await request('POST', '/api/admin/team/toggle-status', { teamCode: 'T20', isActive: false });
  assert.strictEqual(tog1.status, 200, 'Toggle failed');
  assert.strictEqual(tog1.data.isActive, false, 'T20 should be inactive');
  console.log('  ✓ Team T20 successfully marked INACTIVE.\n');

  // 2. Attempt Trade on Inactive Team (Should be Rejected)
  console.log('2. Verifying trade rejection on Inactive Team T20...');
  const tradeRes = await request('POST', '/api/trades', {
    teamId: 'T20',
    securityId: 'RELI',
    action: 'BUY',
    quantity: 10
  });
  assert.strictEqual(tradeRes.status, 400, 'Inactive team trade must be rejected with 400');
  assert(tradeRes.data.error.includes('INACTIVE'), `Expected error message to mention INACTIVE, got: ${tradeRes.data.error}`);
  console.log(`  ✓ Trade rejected cleanly: "${tradeRes.data.error}"\n`);

  // 3. Batch Configure First 8 Teams as Active (e.g. uncertain event turnout)
  console.log('3. Testing Batch Active Configuration for 8 Teams...');
  const batchRes = await request('POST', '/api/admin/teams/set-active-count', { activeCount: 8 });
  assert.strictEqual(batchRes.status, 200, 'Batch setup failed');
  assert.strictEqual(batchRes.data.activeTeams.length, 8, 'Expected 8 active teams');
  console.log(`  ✓ Active teams configured: ${batchRes.data.activeTeams.join(', ')}\n`);

  // 4. Verify in Global State
  console.log('4. Verifying State endpoint reflection...');
  const stateRes = await request('GET', '/api/state');
  const s = stateRes.data.state || stateRes.data;
  const activeCount = s.teams.filter(t => t.isActive !== false).length;
  const inactiveCount = s.teams.filter(t => t.isActive === false).length;
  assert.strictEqual(activeCount, 8, `Expected 8 active teams in state, found ${activeCount}`);
  assert.strictEqual(inactiveCount, 12, `Expected 12 inactive teams in state, found ${inactiveCount}`);
  console.log(`  ✓ State verified: ${activeCount} Active / ${inactiveCount} Inactive.\n`);

  // 5. Restore All 20 Teams Active for Default Floor
  console.log('5. Restoring All 20 Teams as Active...');
  await request('POST', '/api/admin/teams/set-active-count', { activeCount: 20 });
  console.log('  ✓ All 20 teams set to Active.\n');

  console.log('======================================================================');
  console.log('🎉 ALL TEAM ACTIVE/INACTIVE CONTROLS PASSED WITH 100% SUCCESS!');
  console.log('======================================================================\n');
}

testTeamActiveStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
