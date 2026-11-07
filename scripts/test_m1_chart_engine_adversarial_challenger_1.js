/**
 * SAAMX '26 — Milestone 1 Interactive Chart Engine Empirical Adversarial Test Harness
 * Author: teamwork_challenger_m1_1 (Empirical Challenger)
 * 
 * Mandated Verification Checks:
 * 1. Extreme price ranges (penny stocks at 0.001, large index at 1,000,000).
 * 2. Zero-price / delisted securities (currentPrice === 0).
 * 3. Extreme volatility (100% price crashes or 500% price spikes).
 * 4. Corrupted or weird priceHistory inputs (strings, missing timestamps, null elements, empty array).
 * 5. Catmull-Rom cubic Bezier SVG path math (no NaN, no Infinity, valid path geometry).
 * 6. Invariant verification: lastPrice === currentPrice across all adversarial inputs.
 * 7. Authoritative state.json SHA-256 hash preservation (441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { generateTimeframeData, generateSmoothSvgPath } from '../src/lib/chartTimeframeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAAMX_DIR = path.resolve(__dirname, '..');

const BASELINE_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const STATE_FILE = path.join(SAAMX_DIR, 'state.json');

const testResults = [];

function recordTest(suite, name, passed, details = '', error = null) {
  testResults.push({ suite, name, passed, details, error });
  const statusMark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`  [${statusMark}] ${suite} :: ${name}`);
  if (details) console.log(`      ↳ ${details}`);
  if (error) console.log(`      ↳ Error: ${error.message || error}`);
}

function getFileHash(filepath) {
  const buf = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ====================================================================
// SUITE 1: STATE.JSON AUTHORITATIVE HASH INVARIANT
// ====================================================================
function suiteStateInvariant() {
  console.log('\n======================================================================');
  console.log('🔒 SUITE 1: STATE.JSON SHA-256 BASELINE INTEGRITY');
  console.log('======================================================================');

  try {
    const currentHash = getFileHash(STATE_FILE);
    const matches = currentHash === BASELINE_HASH;
    recordTest(
      'SUITE 1: State Hash',
      'Authoritative state.json SHA-256 matches baseline',
      matches,
      `Expected: ${BASELINE_HASH}, Actual: ${currentHash}`
    );
  } catch (err) {
    recordTest('SUITE 1: State Hash', 'Authoritative state.json readable', false, '', err);
  }
}

// ====================================================================
// SUITE 2: EXTREME PRICE RANGES (PENNY STOCKS & MEGA ASSETS)
// ====================================================================
function suiteExtremePriceRanges() {
  console.log('\n======================================================================');
  console.log('💰 SUITE 2: EXTREME PRICE RANGES (PENNY STOCKS & MEGA ASSETS)');
  console.log('======================================================================');

  const testCases = [
    {
      label: 'Penny stock at 0.001',
      instrument: { id: 'STK_PENNY_001', name: 'Micro Penny', currentPrice: 0.001, previousClose: 0.001 }
    },
    {
      label: 'Sub-cent penny stock at 0.0005',
      instrument: { id: 'STK_PENNY_SUB', name: 'Sub-Cent Penny', currentPrice: 0.0005, previousClose: 0.0005 }
    },
    {
      label: 'Fractional penny with precision at 0.012345',
      instrument: { id: 'STK_PENNY_FRAC', name: 'Fractional Penny', currentPrice: 0.012345, previousClose: 0.012345 }
    },
    {
      label: 'Large institutional index at 1,000,000',
      instrument: { id: 'IDX_MEGA_1M', name: 'Mega Index 1M', currentPrice: 1000000, previousClose: 995000, dayHigh: 1010000, dayLow: 990000 }
    },
    {
      label: 'Ultra large asset at 100,000,000',
      instrument: { id: 'STK_MEGA_100M', name: 'Ultra Mega 100M', currentPrice: 100000000, previousClose: 99000000, dayHigh: 105000000, dayLow: 98000000 }
    }
  ];

  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  for (const tc of testCases) {
    for (const tf of timeframes) {
      try {
        const data = generateTimeframeData(tc.instrument, tf);
        const svg = generateSmoothSvgPath(data.points, 320, 140);

        // Check 1: lastPrice === currentPrice invariant
        const priceMatches = data.lastPrice === tc.instrument.currentPrice;
        recordTest(
          'SUITE 2: Extreme Prices',
          `${tc.label} [${tf}] - lastPrice === currentPrice invariant`,
          priceMatches,
          `Expected: ${tc.instrument.currentPrice}, Actual: ${data.lastPrice}`
        );

        // Check 2: SVG path sanity (no NaN, no Infinity)
        const noNaN = !svg.pathD.includes('NaN') && !svg.areaD.includes('NaN');
        const noInf = !svg.pathD.includes('Infinity') && !svg.areaD.includes('Infinity');
        const validPath = svg.pathD.startsWith('M ') && svg.pathD.includes(' C ') && svg.areaD.endsWith(' Z');
        recordTest(
          'SUITE 2: Extreme Prices',
          `${tc.label} [${tf}] - SVG path finite and valid geometry`,
          noNaN && noInf && validPath,
          `Path preview: ${svg.pathD.slice(0, 45)}...`
        );
      } catch (err) {
        recordTest('SUITE 2: Extreme Prices', `${tc.label} [${tf}] - Unhandled Exception`, false, '', err);
      }
    }
  }
}

// ====================================================================
// SUITE 3: ZERO-PRICE / DELISTED / CIRCUIT-HALTED SECURITIES
// ====================================================================
function suiteZeroPriceSecurities() {
  console.log('\n======================================================================');
  console.log('🚫 SUITE 3: ZERO-PRICE & DELISTED SECURITIES');
  console.log('======================================================================');

  const zeroInstruments = [
    {
      label: 'Delisted security (currentPrice: 0, previousClose: 10.0)',
      instrument: { id: 'DELIST_01', name: 'Delisted 01', currentPrice: 0, previousClose: 10.0, dayHigh: 10.0, dayLow: 0 }
    },
    {
      label: 'Completely zeroed security (all 0s)',
      instrument: { id: 'ZERO_ALL', name: 'Zero All', currentPrice: 0, previousClose: 0, dayHigh: 0, dayLow: 0, basePrice: 0 }
    },
    {
      label: 'Flat circuit-halted stock (dayHigh === dayLow === currentPrice)',
      instrument: { id: 'FLAT_CIRCUIT', name: 'Circuit Lock', currentPrice: 250.0, previousClose: 250.0, dayHigh: 250.0, dayLow: 250.0 }
    }
  ];

  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  for (const item of zeroInstruments) {
    for (const tf of timeframes) {
      try {
        const data = generateTimeframeData(item.instrument, tf);
        const svg = generateSmoothSvgPath(data.points, 320, 140);

        const priceMatches = data.lastPrice === item.instrument.currentPrice;
        const finiteReturn = Number.isFinite(data.percentChange) && !Number.isNaN(data.percentChange);
        const noNaN = !svg.pathD.includes('NaN') && !svg.areaD.includes('NaN');
        const noInf = !svg.pathD.includes('Infinity') && !svg.areaD.includes('Infinity');

        recordTest(
          'SUITE 3: Zero Price',
          `${item.label} [${tf}] - Finite return & valid geometry`,
          priceMatches && finiteReturn && noNaN && noInf,
          `lastPrice: ${data.lastPrice}, pctChange: ${data.percentChange}%, SVG valid: ${noNaN && noInf}`
        );
      } catch (err) {
        recordTest('SUITE 3: Zero Price', `${item.label} [${tf}] - Exception`, false, '', err);
      }
    }
  }
}

// ====================================================================
// SUITE 4: EXTREME VOLATILITY (CRASHES & SPIKES)
// ====================================================================
function suiteExtremeVolatility() {
  console.log('\n======================================================================');
  console.log('⚡ SUITE 4: EXTREME VOLATILITY (100% CRASH & 500% SPIKE)');
  console.log('======================================================================');

  const volatileCases = [
    {
      label: '100% Total Price Crash (1000 -> 0)',
      instrument: { id: 'CRASH_100', name: 'Crash Corp', currentPrice: 0, previousClose: 1000, dayHigh: 1000, dayLow: 0 },
      expectedDelta: -1000
    },
    {
      label: '500% Massive Price Spike (100 -> 600)',
      instrument: { id: 'SPIKE_500', name: 'Spike Tech', currentPrice: 600, previousClose: 100, dayHigh: 600, dayLow: 100 },
      expectedDelta: 500
    },
    {
      label: 'Flash Crash & Intraday Whipsaw (1000 -> 10 -> 1000)',
      instrument: { id: 'WHIPSAW', name: 'Whipsaw Inc', currentPrice: 1000, previousClose: 1000, dayHigh: 1200, dayLow: 10 }
    }
  ];

  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  for (const vc of volatileCases) {
    for (const tf of timeframes) {
      try {
        const data = generateTimeframeData(vc.instrument, tf);
        const svg = generateSmoothSvgPath(data.points, 320, 140);

        const priceMatches = data.lastPrice === vc.instrument.currentPrice;
        const finiteReturn = Number.isFinite(data.percentChange) && !Number.isNaN(data.percentChange);
        const noNaN = !svg.pathD.includes('NaN');
        const noInf = !svg.pathD.includes('Infinity');

        recordTest(
          'SUITE 4: Volatility',
          `${vc.label} [${tf}] - lastPrice matches & SVG math stable`,
          priceMatches && finiteReturn && noNaN && noInf,
          `lastPrice: ${data.lastPrice}, pctChange: ${data.percentChange}%, points: ${data.points.length}`
        );
      } catch (err) {
        recordTest('SUITE 4: Volatility', `${vc.label} [${tf}] - Exception`, false, '', err);
      }
    }
  }
}

// ====================================================================
// SUITE 5: CORRUPTED & MALFORMED PRICEHISTORY INPUTS
// ====================================================================
function suiteCorruptedPriceHistory() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 5: CORRUPTED & MALFORMED PRICEHISTORY INPUTS');
  console.log('======================================================================');

  const now = Date.now();
  const corruptCases = [
    {
      name: 'Empty array []',
      priceHistory: []
    },
    {
      name: 'Single element array [{ price: 100 }]',
      priceHistory: [{ price: 100, timestamp: now }]
    },
    {
      name: '4 elements array (below >= 5 threshold)',
      priceHistory: [
        { price: 100, timestamp: now - 3000 },
        { price: 101, timestamp: now - 2000 },
        { price: 102, timestamp: now - 1000 },
        { price: 103, timestamp: now }
      ]
    },
    {
      name: 'Price values as strings ["100.50", "101.20", ...]',
      priceHistory: [
        { price: '100.50', timestamp: now - 4000 },
        { price: '101.20', timestamp: now - 3000 },
        { price: '102.30', timestamp: now - 2000 },
        { price: '103.40', timestamp: now - 1000 },
        { price: '104.50', timestamp: now }
      ]
    },
    {
      name: 'Missing timestamp attributes in tick objects',
      priceHistory: [
        { price: 100 },
        { price: 101 },
        { price: 102 },
        { price: 103 },
        { price: 104 }
      ]
    },
    {
      name: 'Null timestamps in tick objects',
      priceHistory: [
        { price: 100, timestamp: null },
        { price: 101, timestamp: null },
        { price: 102, timestamp: null },
        { price: 103, timestamp: null },
        { price: 104, timestamp: null }
      ]
    },
    {
      name: 'Null element inside priceHistory array',
      priceHistory: [
        { price: 100, timestamp: now - 4000 },
        null,
        { price: 102, timestamp: now - 2000 },
        { price: 103, timestamp: now - 1000 },
        { price: 104, timestamp: now }
      ]
    },
    {
      name: 'Undefined element inside priceHistory array',
      priceHistory: [
        { price: 100, timestamp: now - 4000 },
        undefined,
        { price: 102, timestamp: now - 2000 },
        { price: 103, timestamp: now - 1000 },
        { price: 104, timestamp: now }
      ]
    },
    {
      name: 'Null price attributes [{ price: null }, ...]',
      priceHistory: [
        { price: null, timestamp: now - 4000 },
        { price: null, timestamp: now - 3000 },
        { price: 102, timestamp: now - 2000 },
        { price: 103, timestamp: now - 1000 },
        { price: 104, timestamp: now }
      ]
    },
    {
      name: 'NaN price attributes [{ price: NaN }, ...]',
      priceHistory: [
        { price: NaN, timestamp: now - 4000 },
        { price: NaN, timestamp: now - 3000 },
        { price: 102, timestamp: now - 2000 },
        { price: 103, timestamp: now - 1000 },
        { price: 104, timestamp: now }
      ]
    },
    {
      name: 'Empty objects [{}] without price or timestamp',
      priceHistory: [{}, {}, {}, {}, {}]
    },
    {
      name: 'Non-array string "not-an-array"',
      priceHistory: 'not-an-array'
    }
  ];

  for (const cc of corruptCases) {
    try {
      const inst = {
        id: 'CORRUPT_TEST',
        name: 'Corrupt Test Inst',
        currentPrice: 105.00,
        priceHistory: cc.priceHistory
      };
      const data = generateTimeframeData(inst, '1D');
      const svg = generateSmoothSvgPath(data.points, 320, 140);

      const noNaN = !svg.pathD.includes('NaN');
      const noInf = !svg.pathD.includes('Infinity');
      const hasValidPoints = Array.isArray(data.points) && data.points.length >= 5;
      const lastPriceMatches = data.lastPrice === inst.currentPrice;

      recordTest(
        'SUITE 5: Corrupted History',
        cc.name,
        noNaN && noInf && hasValidPoints && lastPriceMatches,
        `points: ${data.points.length}, isLive: ${data.isLive}, svg NaN: ${!noNaN}, lastPrice match: ${lastPriceMatches}`
      );
    } catch (err) {
      recordTest(
        'SUITE 5: Corrupted History',
        cc.name,
        false,
        'Engine crashed with unhandled exception on corrupt history input',
        err
      );
    }
  }
}

// ====================================================================
// SUITE 6: CATMULL-ROM CUBIC BEZIER SVG PATH MATH SANITY
// ====================================================================
function suiteSvgPathMathSanity() {
  console.log('\n======================================================================');
  console.log('📐 SUITE 6: CATMULL-ROM CUBIC BEZIER SVG PATH MATH SANITY');
  console.log('======================================================================');

  // Test Case 6.1: Empty points
  try {
    const emptyRes = generateSmoothSvgPath([], 320, 140);
    recordTest(
      'SUITE 6: SVG Math',
      'Empty points returns clean empty path without NaN',
      emptyRes.pathD === '' && emptyRes.areaD === '' && emptyRes.vertices.length === 0,
      `pathD: "${emptyRes.pathD}", vertices: ${emptyRes.vertices.length}`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'Empty points exception', false, '', err);
  }

  // Test Case 6.2: Single point
  try {
    const singleRes = generateSmoothSvgPath([{ price: 100 }], 320, 140);
    const validSingle = singleRes.pathD.startsWith('M ') && singleRes.pathD.includes(' L ') && singleRes.areaD.endsWith(' Z');
    const noNaN = !singleRes.pathD.includes('NaN');
    recordTest(
      'SUITE 6: SVG Math',
      'Single point produces horizontal midline and area closure',
      validSingle && noNaN && singleRes.vertices.length === 1,
      `pathD: "${singleRes.pathD}"`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'Single point exception', false, '', err);
  }

  // Test Case 6.3: Two points
  try {
    const twoRes = generateSmoothSvgPath([{ price: 100 }, { price: 200 }], 320, 140);
    const validTwo = twoRes.pathD.startsWith('M ') && twoRes.pathD.includes(' C ') && twoRes.areaD.endsWith(' Z');
    const noNaN = !twoRes.pathD.includes('NaN');
    recordTest(
      'SUITE 6: SVG Math',
      'Two points produces cubic Bezier curve',
      validTwo && noNaN && twoRes.vertices.length === 2,
      `pathD: "${twoRes.pathD}"`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'Two points exception', false, '', err);
  }

  // Test Case 6.4: All identical prices (flat line)
  try {
    const flatPoints = [
      { price: 150 }, { price: 150 }, { price: 150 }, { price: 150 }, { price: 150 }
    ];
    const flatRes = generateSmoothSvgPath(flatPoints, 320, 140);
    const noNaN = !flatRes.pathD.includes('NaN') && !flatRes.areaD.includes('NaN');
    const noInf = !flatRes.pathD.includes('Infinity') && !flatRes.areaD.includes('Infinity');
    recordTest(
      'SUITE 6: SVG Math',
      'Identical prices (zero delta) does not divide by zero',
      noNaN && noInf,
      `pathD: "${flatRes.pathD.slice(0, 40)}..."`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'Identical prices exception', false, '', err);
  }

  // Test Case 6.5: Zero prices
  try {
    const zeroPoints = [
      { price: 0 }, { price: 0 }, { price: 0 }, { price: 0 }, { price: 0 }
    ];
    const zeroRes = generateSmoothSvgPath(zeroPoints, 320, 140);
    const noNaN = !zeroRes.pathD.includes('NaN') && !zeroRes.areaD.includes('NaN');
    const noInf = !zeroRes.pathD.includes('Infinity') && !zeroRes.areaD.includes('Infinity');
    recordTest(
      'SUITE 6: SVG Math',
      'All zero prices (0 - 0) does not produce NaN or Infinity',
      noNaN && noInf,
      `pathD: "${zeroRes.pathD.slice(0, 40)}..."`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'Zero prices exception', false, '', err);
  }

  // Test Case 6.6: Point containing NaN price
  try {
    const nanPoints = [
      { price: 100 }, { price: NaN }, { price: 102 }
    ];
    const nanRes = generateSmoothSvgPath(nanPoints, 320, 140);
    const noNaN = !nanRes.pathD.includes('NaN') && !nanRes.areaD.includes('NaN');
    recordTest(
      'SUITE 6: SVG Math',
      'Points with NaN price must not leak NaN into SVG path',
      noNaN,
      `pathD contains NaN: ${!noNaN}`
    );
  } catch (err) {
    recordTest('SUITE 6: SVG Math', 'NaN points exception', false, '', err);
  }
}

// ====================================================================
// SUITE 7: UNRECOGNIZED / NULL TIMEFRAME RESILIENCE
// ====================================================================
function suiteTimeframeResilience() {
  console.log('\n======================================================================');
  console.log('⏰ SUITE 7: UNRECOGNIZED / NULL TIMEFRAME RESILIENCE');
  console.log('======================================================================');

  const strangeTimeframes = ['UNKNOWN', '5Y', '10Y', null, undefined, ''];

  for (const tf of strangeTimeframes) {
    try {
      const inst = { id: 'TEST_TF', currentPrice: 100 };
      const res = generateTimeframeData(inst, tf);
      const passed = res && Array.isArray(res.points) && res.points.length > 0;
      recordTest(
        'SUITE 7: Timeframe Resilience',
        `Timeframe: ${JSON.stringify(tf)} does not throw unhandled exception`,
        passed,
        `points length: ${res?.points?.length}`
      );
    } catch (err) {
      recordTest(
        'SUITE 7: Timeframe Resilience',
        `Timeframe: ${JSON.stringify(tf)} throws unhandled exception`,
        false,
        'Engine crashed on unrecognized timeframe parameter',
        err
      );
    }
  }
}

// ====================================================================
// MAIN ENTRY POINT
// ====================================================================
function main() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX M1 EMPIRICAL ADVERSARIAL CHALLENGER SUITE (CHALLENGER 1)');
  console.log('======================================================================');

  suiteStateInvariant();
  suiteExtremePriceRanges();
  suiteZeroPriceSecurities();
  suiteExtremeVolatility();
  suiteCorruptedPriceHistory();
  suiteSvgPathMathSanity();
  suiteTimeframeResilience();

  // Final check of authoritative state hash
  console.log('\n======================================================================');
  console.log('🔒 FINAL POST-FLIGHT STATE HASH VERIFICATION');
  console.log('======================================================================');
  const postHash = getFileHash(STATE_FILE);
  const hashMatches = postHash === BASELINE_HASH;
  recordTest('Final Check', 'state.json SHA-256 untouched', hashMatches, `Hash: ${postHash}`);

  // Summary
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const total = testResults.length;

  console.log('\n======================================================================');
  console.log(`📊 ADVERSARIAL CHALLENGE EXECUTION SUMMARY`);
  console.log(`   Total Tests Run: ${total}`);
  console.log(`   Passed:          ${passed}`);
  console.log(`   Failed:          ${failed}`);
  console.log(`   Verdict:         ${failed > 0 ? 'REQUEST_CHANGES ⚠️' : 'APPROVE ✅'}`);
  console.log('======================================================================\n');

  // Print failure details
  if (failed > 0) {
    console.log('📋 VERIFIED VULNERABILITY CATALOG:');
    testResults.filter(t => !t.passed).forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.suite}] ${f.name}`);
      if (f.details) console.log(`     Details: ${f.details}`);
      if (f.error) console.log(`     Error:   ${f.error.message || f.error}`);
    });
    console.log('\n');
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
