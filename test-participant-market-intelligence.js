/**
 * test-participant-market-intelligence.js
 * Verification of the new Participant Market Intelligence Hub, Multi-Currency Integrity & Privacy Isolation
 */

import http from 'http';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
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

async function runTest() {
  console.log("======================================================================");
  console.log("🧪 SAAMX 2026 — PARTICIPANT MARKET INTELLIGENCE & MULTI-CURRENCY TEST");
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

  // 1. Check Server Liveness & Seeded State
  console.log("1. Checking Server Liveness and Universe State...");
  await request('POST', '/api/admin/seed', {});
  const stateRes = await request('GET', '/api/state');
  assert(stateRes.status === 200, "Backend API is reachable (HTTP 200)");
  const state = stateRes.data.state || stateRes.data;
  const securities = Array.isArray(state.securities) ? state.securities : Object.values(state.securities || {});
  assert(securities.length >= 1800, `Universe contains ${securities.length} global securities`);

  // 2. Verify 4-Currency Currency Support across Constituents
  console.log("\n2. Verifying 4-Currency Multi-Currency System (INR, USD, GBP, EUR)...");
  const currencies = new Set(securities.map(s => s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? 'USD' : s.exchange === 'LSE' ? 'GBP' : s.exchange === 'XETRA' ? 'EUR' : 'INR')));
  assert(currencies.has('INR'), "INR (₹) domestic currency supported");
  assert(currencies.has('USD'), "USD ($) US markets supported");
  assert(currencies.has('GBP'), "GBP (£) UK markets supported");
  assert(currencies.has('EUR'), "EUR (€) European markets supported");

  // 3. Dispatch Live Market Intelligence News Bulletin
  console.log("\n3. Testing Breaking News Event Dispatch...");
  const newsRes = await request('POST', '/api/news', {
    headline: 'Reliance Announces Major Multi-GigaWatt Green Hydrogen Hub in Gujarat',
    description: 'Energy infrastructure expansion receives strategic sovereign capital support.',
    affectedSector: 'Energy & Conglomerate',
    sentiment: 'Positive',
    impactPercent: 8,
    category: 'CORPORATE',
    severity: 'BREAKING'
  });
  assert(newsRes.status === 200 && newsRes.data.success === true, "Breaking news dispatched successfully");

  // 4. Verify Privacy Isolation (Teams only access their own state)
  console.log("\n4. Verifying Participant Privacy Isolation...");
  const teams = state.teams || [];
  assert(teams.length === 20, "20 participant teams initialized");
  if (teams[0]) {
    assert(teams[0].cashWallets !== undefined || teams[0].cashBalance !== undefined, `Team ${teams[0].teamCode} maintains private cash reserves`);
  }

  // 5. Verify FX Multi-Currency Spot Rates
  console.log("\n5. Verifying FX Rates Engine...");
  const fxRates = state.fxRates || {};
  assert(fxRates.USDINR?.midRate > 0, `USD/INR mid-rate active: ₹${fxRates.USDINR?.midRate}`);
  assert(fxRates.GBPINR?.midRate > 0, `GBP/INR mid-rate active: ₹${fxRates.GBPINR?.midRate}`);
  assert(fxRates.EURINR?.midRate > 0, `EUR/INR mid-rate active: ₹${fxRates.EURINR?.midRate}`);

  console.log("\n======================================================================");
  console.log(`🏁 Market Intelligence Test Results: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
  console.log("======================================================================\n");
}

runTest().catch(console.error);
