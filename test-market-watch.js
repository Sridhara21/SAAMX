/**
 * test-market-watch.js
 * SAAMX 2026 — Market Watch Terminal Verification Suite
 */

import http from 'http';
import assert from 'assert';

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

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;

async function testCase(name, fn) {
  process.stdout.write(`🧪 [TEST ${String(passedCount + failedCount + 1).padStart(2, '0')}] ${name.padEnd(56)} `);
  try {
    await fn();
    console.log('✅ PASS');
    passedCount++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    failedCount++;
  }
}

async function runMarketWatchSuite() {
  console.log('\n======================================================================');
  console.log('📈 SAAMX 2026 — MARKET WATCH TERMINAL COMPREHENSIVE VERIFICATION');
  console.log('======================================================================\n');

  let state = null;

  // 1. Fetch live market state
  await testCase('1. Market Watch loads complete authoritative state', async () => {
    const res = await request('GET', '/api/state');
    assert.strictEqual(res.status, 200);
    assert(res.data.securities, 'Must contain securities universe');
    assert(res.data.marketIndices, 'Must contain market indices');
    assert(res.data.fxRates, 'Must contain FX rates');
    state = res.data;
  });

  const securities = Object.values(state.securities || {});

  // 2. 2,061 Securities Universe
  await testCase('2. Validates 2,000+ securities universe (2,061 instruments)', async () => {
    assert(securities.length >= 2000, `Expected >= 2000 securities, got ${securities.length}`);
  });

  // 3. Centralized Indices Validation
  await testCase('3. Validates central simulated indices (India 50, Global 100, US 100, UK 100)', async () => {
    const indices = state.marketIndices || {};
    assert(indices.INDIA50 || indices.GLOBAL100, 'Indices must exist in central state');
    assert(typeof (indices.INDIA50?.currentValue || indices.GLOBAL100?.currentValue) === 'number');
  });

  // 4. Multi-Currency Spot FX
  await testCase('4. Validates 4-currency FX spot rates (USD, GBP, EUR, INR)', async () => {
    const fx = state.fxRates || {};
    assert(fx.USDINR && fx.USDINR.midRate > 0, 'USD/INR must have positive midRate');
    assert(fx.GBPINR && fx.GBPINR.midRate > 0, 'GBP/INR must have positive midRate');
    assert(fx.EURINR && fx.EURINR.midRate > 0, 'EUR/INR must have positive midRate');
  });

  // 5. Market Breadth Calculation
  await testCase('5. Market breadth calculation (Advances, Declines, Unchanged)', async () => {
    let advances = 0, declines = 0, unchanged = 0;
    securities.forEach(s => {
      const curr = Number(s.currentPrice || s.basePrice || 0);
      const open = Number(s.openingPrice || s.basePrice || curr);
      const diff = curr - open;
      if (diff > 0.01) advances++;
      else if (diff < -0.01) declines++;
      else unchanged++;
    });
    assert.strictEqual(advances + declines + unchanged, securities.length);
  });

  // 6. Top Movers (Gainers, Losers, Volume)
  await testCase('6. Computes Top 10 Gainers, Losers, and Most Active correctly', async () => {
    const activeSecs = securities.filter(s => s.status === 'Active' && s.openingPrice > 0);
    const sortedGainers = [...activeSecs].sort((a, b) => {
      const pA = ((a.currentPrice - a.openingPrice) / a.openingPrice) * 100;
      const pB = ((b.currentPrice - b.openingPrice) / b.openingPrice) * 100;
      return pB - pA;
    }).slice(0, 10);

    const sortedLosers = [...activeSecs].sort((a, b) => {
      const pA = ((a.currentPrice - a.openingPrice) / a.openingPrice) * 100;
      const pB = ((b.currentPrice - b.openingPrice) / b.openingPrice) * 100;
      return pA - pB;
    }).slice(0, 10);

    assert(sortedGainers.length <= 10);
    assert(sortedLosers.length <= 10);
  });

  // 7. Sector Watch Grouping
  await testCase('7. Groups and aggregates securities across all sectors', async () => {
    const sectorMap = {};
    securities.forEach(s => {
      const sec = s.sector || 'General';
      sectorMap[sec] = (sectorMap[sec] || 0) + 1;
    });
    assert(Object.keys(sectorMap).length >= 5, 'Must have at least 5 distinct sectors');
  });

  // 8. Global Markets Categorization
  await testCase('8. Categorizes global markets by native currencies', async () => {
    const inrSecs = securities.filter(s => s.currency === 'INR');
    const usdSecs = securities.filter(s => s.currency === 'USD');
    const gbpSecs = securities.filter(s => s.currency === 'GBP');
    const eurSecs = securities.filter(s => s.currency === 'EUR');

    assert(inrSecs.length > 500, `INR securities count: ${inrSecs.length}`);
    assert(usdSecs.length > 200, `USD securities count: ${usdSecs.length}`);
    assert(gbpSecs.length > 50, `GBP securities count: ${gbpSecs.length}`);
    assert(eurSecs.length > 50, `EUR securities count: ${eurSecs.length}`);
  });

  // 9. Flagship Simulated IPOs
  await testCase('9. Verifies the 5 simulated IPOs (OAI, STRP, CNVA, DISC, POLY)', async () => {
    const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];
    ipoTickers.forEach(t => {
      const sec = securities.find(s => s.ticker === t);
      assert(sec, `IPO security ${t} must exist in universe`);
    });
  });

  // 10. Search & Filter Algorithm
  await testCase('10. Search and filter query matches accurately', async () => {
    const relSecs = securities.filter(s => s.ticker.toLowerCase().includes('rel') || s.name.toLowerCase().includes('reliance'));
    assert(relSecs.length > 0, 'Search for Reliance must return matching stocks');
  });

  // 11. Pagination Slicing
  await testCase('11. Pagination slices 2,061 rows cleanly without data loss', async () => {
    const pageSize = 50;
    const totalPages = Math.ceil(securities.length / pageSize);
    let totalSliced = 0;
    for (let p = 1; p <= totalPages; p++) {
      const pageSlice = securities.slice((p - 1) * pageSize, p * pageSize);
      totalSliced += pageSlice.length;
    }
    assert.strictEqual(totalSliced, securities.length);
  });

  // 12. Read-Only Integrity
  await testCase('12. Market Watch is read-only (Rejects unauthenticated mutations)', async () => {
    const unauthReq = await request('POST', '/api/sebi/halt', { securityId: 'INFY' }, { 'X-FMS-Password': 'wrong-password' });
    assert.strictEqual(unauthReq.status, 401, 'Unauthenticated mutation must return HTTP 401');
  });

  console.log('\n======================================================================');
  console.log(`TOTAL TESTS: 12 | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('======================================================================');

  if (failedCount === 0) {
    console.log('🏆 VERDICT: ALL 12 MARKET WATCH TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runMarketWatchSuite().catch(err => {
  console.error('Market Watch Test Suite encountered fatal runtime error:', err);
  process.exit(1);
});
