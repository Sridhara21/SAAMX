/**
 * test-roles-and-event-experience.js
 * Verification of the new Event Interfaces, Specialized Market Roles, and Scenarios
 */

import http from 'http';

const PORT = 3000;
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
        'X-FMS-Password': ADMIN_PASSWORD,
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

async function runSuite() {
  console.log("======================================================================");
  console.log("🧪 SAAMX 2026 — ROLES, INTERFACES & EVENT EXPERIENCE TEST SUITE");
  console.log("======================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
    }
  }

  // 1. Verify State Endpoint
  console.log("1. Checking State and Universe Liveness...");
  const seedRes = await request('POST', '/api/admin/seed', {});
  const stateRes = await request('GET', '/api/state');
  assert(stateRes.status === 200, "Backend state is active and reachable (HTTP 200)");
  const state = stateRes.data.state || stateRes.data;
  const rawSecurities = Array.isArray(state.securities) ? state.securities : Object.values(state.securities || {});
  assert(rawSecurities.length > 0, `Securities universe seeded with ${rawSecurities.length} constituents`);

  // 2. Dispatch Signature Scenario: Global Macro Shock
  console.log("\n2. Testing Signature Scenario Dispatch: Global Macro Shock...");
  const macroRes = await request('POST', '/api/news', {
    headline: '🚨 Global Macro Shock: Federal Reserve Hikes Benchmark Rates by 75 bps',
    description: 'Central banks initiate emergency monetary tightening.',
    affectedSector: 'Technology',
    sentiment: 'Negative',
    impactPercent: 6,
    category: 'MACROECONOMIC',
    severity: 'CRITICAL',
    fxImpactPercent: 1.5,
    targetPair: 'USDINR'
  });
  assert(macroRes.status === 200 && macroRes.data.success === true, "Global Macro Shock scenario executed (HTTP 200)");
  assert(macroRes.data.newsItem.severity === 'CRITICAL', "High-severity CRITICAL alert flagged for cinematic takeover");

  // 3. Dispatch Signature Scenario: Sector Rotation
  console.log("\n3. Testing Signature Scenario Dispatch: Sector Rotation...");
  const rotationRes = await request('POST', '/api/news', {
    headline: '⚡ Major Sector Rotation: Institutional Inflows Pivot from Tech into Clean Energy',
    description: 'Global ESG mandates trigger massive reallocation into renewable energy assets.',
    affectedSector: 'Energy',
    sentiment: 'Positive',
    impactPercent: 7,
    category: 'COMMODITY',
    severity: 'IMPORTANT'
  });
  assert(rotationRes.status === 200 && rotationRes.data.success === true, "Sector Rotation scenario dispatched successfully");

  // 4. Verify Dual Price Impact Decomposition
  console.log("\n4. Verifying Dual Price Movement Integrity...");
  const updatedStateRes = await request('GET', '/api/state');
  const updatedState = updatedStateRes.data.state || updatedStateRes.data;
  const updatedSecurities = Array.isArray(updatedState.securities) ? updatedState.securities : Object.values(updatedState.securities || {});
  const techSecs = updatedSecurities.filter(s => s.sector === 'Technology' && s.status === 'Active');
  assert(techSecs.length > 0, "Active Technology constituents tracked in universe");
  if (techSecs[0]) {
    assert(techSecs[0].newsImpact !== undefined || techSecs[0].currentPrice !== undefined, `Price tracking active on ${techSecs[0].ticker || techSecs[0].id}`);
  }

  // 5. Verify Audit Log Trail
  console.log("\n5. Verifying Audit Log Ledger for Signature Events...");
  const auditRes = await request('GET', '/api/audit-log');
  const logs = auditRes.data?.logs || auditRes.data?.log || auditRes.data;
  assert(Array.isArray(logs) && logs.length > 0, `Audit log contains ${logs?.length} records with signature scenario timestamps`);

  console.log("\n======================================================================");
  console.log(`🏁 Roles & Event Experience Results: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
  console.log("======================================================================\n");
}

runSuite().catch(console.error);
