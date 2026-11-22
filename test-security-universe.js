import assert from 'assert';
import { generateFullSecurityUniverse, NEW_SIMULATED_IPOS } from './universe_generator.js';

console.log('======================================================================');
console.log('🧪 SAAMX 2026 — 2,000+ SECURITIES & 5 SIMULATED IPOs VALIDATION SUITE');
console.log('======================================================================\n');

const universe = generateFullSecurityUniverse();

// 1. Total Universe Count (authoritative 2,849 + staged IPOs/simulated instruments)
console.log(`[TEST 1] Verifying Total Securities Count >= 2,849...`);
assert(universe.length >= 2849, `Expected at least 2,849 securities, got ${universe.length}`);
console.log(`  ✓ Passed: Universe contains exactly ${universe.length} securities.\n`);

// 2. Canonical ID Uniqueness & Scoped Ticker Verification
console.log(`[TEST 2] Verifying 100% Uniqueness for Canonical Security IDs...`);
const idSet = new Set(universe.map(s => s.id));
assert.strictEqual(idSet.size, universe.length, `Duplicate IDs found! IDs: ${idSet.size}, Total: ${universe.length}`);

// Multi-exchange ticker collisions: exactly 20 tickers repeat across different exchanges (e.g. BHP on ASX vs LSE)
const scopedTickerSet = new Set(universe.map(s => `${s.ticker}::${s.exchange}`));
assert.strictEqual(scopedTickerSet.size, universe.length, `Collisions found in scoped (ticker::exchange) pairs!`);
console.log(`  ✓ Passed: 100% unique canonical IDs (${idSet.size}) and unique scoped ticker::exchange pairs across all instruments.\n`);

// 3. 5 Simulated IPO Verification
console.log(`[TEST 3] Verifying the 5 New Simulated IPOs (OpenAI, Stripe, Canva, Discord, Polymarket)...`);
const ipos = NEW_SIMULATED_IPOS;
assert.strictEqual(ipos.length, 5, `Expected exactly 5 IPOs, got ${ipos.length}`);
const ipoTickers = ipos.map(i => i.ticker).sort();
assert.deepStrictEqual(ipoTickers, ['CNVA', 'DISC', 'OAI', 'POLY', 'STRP'], `Unexpected IPO tickers: ${ipoTickers}`);
ipos.forEach(ipo => {
  assert(ipo.offerPrice > 0, `${ipo.ticker} missing offerPrice`);
  assert(ipo.lotSize > 0, `${ipo.ticker} missing lotSize`);
  assert(ipo.simulationLabel.includes('SAAMX SIMULATED IPO'), `${ipo.ticker} missing simulationLabel`);
});
console.log(`  ✓ Passed: 5 Simulated IPOs verified (${ipoTickers.join(', ')}).\n`);

// 4. Asset Class Breadth
console.log(`[TEST 4] Verifying Asset Class Distribution...`);
const typeCounts = {};
universe.forEach(s => typeCounts[s.type] = (typeCounts[s.type] || 0) + 1);
console.log('  Breakdown by Asset Class:', typeCounts);
const equityCount = (typeCounts.Stock || 0) + (typeCounts.Equity || 0);
const bondCount = (typeCounts.GovernmentBond || 0) + (typeCounts['Government Bond'] || 0) + (typeCounts.CorporateBond || 0) + (typeCounts['Corporate Bond'] || 0) + (typeCounts['Corp Bond'] || 0) + (typeCounts['Govt Bond'] || 0);
const mfCount = (typeCounts.MutualFund || 0) + (typeCounts['Mutual Fund'] || 0);
const etfCount = typeCounts.ETF || 0;
const altCount = (typeCounts.REIT || 0) + (typeCounts.InvIT || 0) + (typeCounts['Commodity-linked Instrument'] || 0);

assert(equityCount >= 1000, `Insufficient Equities: ${equityCount}`);
assert(bondCount >= 180, `Insufficient Bonds: ${bondCount}`);
assert(mfCount >= 80, `Insufficient Mutual Funds: ${mfCount}`);
assert(etfCount >= 50, `Insufficient ETFs: ${etfCount}`);
assert(altCount >= 30, `Insufficient Alternatives: ${altCount}`);
console.log(`  ✓ Passed: Multi-asset diversification verified.\n`);

// 5. Geographic & Multi-Currency Distribution
console.log(`[TEST 5] Verifying Geographic & Currency Distribution...`);
const countries = {};
const currencies = {};
universe.forEach(s => {
  countries[s.country] = (countries[s.country] || 0) + 1;
  currencies[s.currency] = (currencies[s.currency] || 0) + 1;
});
console.log('  Breakdown by Country:', countries);
console.log('  Breakdown by Currency:', currencies);
assert(currencies.INR >= 700, `Insufficient INR securities: ${currencies.INR}`);
assert(currencies.USD >= 400, `Insufficient USD securities: ${currencies.USD}`);
assert(currencies.GBP >= 100, `Insufficient GBP securities: ${currencies.GBP}`);
assert(currencies.EUR >= 100, `Insufficient EUR securities: ${currencies.EUR}`);
console.log(`  ✓ Passed: Global 4-Currency distribution verified (INR, USD, GBP, EUR).\n`);

// 6. Company Descriptions & Profile Details
console.log(`[TEST 6] Verifying Factual Descriptions and Dossier Metadata...`);
const missingDesc = universe.filter(s => !s.description || s.description.trim().length < 20);
assert.strictEqual(missingDesc.length, 0, `Found ${missingDesc.length} securities with missing/brief descriptions`);
console.log(`  ✓ Passed: 100% of ${universe.length} securities contain enriched factual descriptions.\n`);

// 7. Pricing & Quantities Sanity
console.log(`[TEST 7] Verifying Pricing & Quantities Sanity...`);
const badPrices = universe.filter(s => typeof s.currentPrice !== 'number' || s.currentPrice <= 0);
const badUnits = universe.filter(s => typeof s.totalUnits !== 'number' || s.totalUnits <= 0 || s.availableUnits <= 0 || s.availableUnits > s.totalUnits);
assert.strictEqual(badPrices.length, 0, `Found ${badPrices.length} invalid prices`);
assert.strictEqual(badUnits.length, 0, `Found ${badUnits.length} invalid units`);
console.log(`  ✓ Passed: Zero negative prices or invalid float quantities.\n`);

console.log('======================================================================');
console.log('🎉 ALL 7 UNIVERSE AND IPO DATABASE TESTS PASSED WITH ZERO ERRORS!');
console.log('======================================================================\n');
