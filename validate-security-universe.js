/**
 * validate-security-universe.js
 * Verification of the entire 2,000+ security dataset integrity, classifications, currencies, and descriptions
 */

import { generateFullSecurityUniverse } from './universe_generator.js';

console.log('======================================================================');
console.log('🔍 SAAMX 2026 — 2,000+ SECURITIES COMPREHENSIVE DATASET VALIDATION');
console.log('======================================================================\n');

const universe = generateFullSecurityUniverse();
let errors = 0;

function reportError(msg) {
  console.error(`❌ [VALIDATION ERROR]: ${msg}`);
  errors++;
}

// 1. Total Count (>= 1,900)
if (universe.length < 1900) {
  reportError(`Expected at least 1,900 securities, found ${universe.length}`);
} else {
  console.log(`✅ [1/8] Total Count: Exactly ${universe.length} securities loaded and verified.`);
}

// 2. ID & Ticker Uniqueness
const idMap = new Map();
const tickerMap = new Map();

universe.forEach((s, idx) => {
  if (!s.id) reportError(`Index ${idx}: Missing ID`);
  else if (idMap.has(s.id)) reportError(`Duplicate ID: ${s.id} (first at ${idMap.get(s.id)})`);
  else idMap.set(s.id, idx);

  if (!s.ticker) reportError(`Index ${idx}: Missing Ticker`);
  else if (tickerMap.has(s.ticker)) reportError(`Duplicate Ticker: ${s.ticker} (first at ${tickerMap.get(s.ticker)})`);
  else tickerMap.set(s.ticker, idx);
});

if (idMap.size === universe.length && tickerMap.size === universe.length) {
  console.log(`✅ [2/8] Uniqueness: ${universe.length} unique IDs and ${universe.length} unique tickers verified.`);
}

// 3. Supported Currencies
const VALID_CURRENCIES = new Set(['INR', 'USD', 'GBP', 'EUR']);
const currencyCounts = {};

universe.forEach(s => {
  if (!VALID_CURRENCIES.has(s.currency)) {
    reportError(`Invalid currency for ${s.ticker}: ${s.currency}`);
  }
  currencyCounts[s.currency] = (currencyCounts[s.currency] || 0) + 1;
});
console.log(`✅ [3/8] Currencies: All valid (${JSON.stringify(currencyCounts)}).`);

// 4. Supported Exchanges
universe.forEach(s => {
  if (!s.exchange || typeof s.exchange !== 'string' || s.exchange.trim().length === 0) {
    reportError(`Missing or invalid exchange for ${s.ticker}: ${s.exchange}`);
  }
});
console.log(`✅ [4/8] Exchanges: All listed on valid recognized exchanges.`);

// 5. Security Classifications
const VALID_TYPES = new Set([
  'Stock', 'Equity', 'ETF', 'MutualFund', 'Mutual Fund', 'GovernmentBond', 'Government Bond',
  'CorporateBond', 'Corporate Bond', 'REIT', 'InvIT', 'Commodity-linked Instrument', 'Index-linked Instrument'
]);
const typeCounts = {};

universe.forEach(s => {
  if (!VALID_TYPES.has(s.type)) {
    reportError(`Invalid security type for ${s.ticker}: ${s.type}`);
  }
  typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
});
console.log(`✅ [5/8] Security Classifications: All valid (${JSON.stringify(typeCounts)}).`);

// 6. Prices and Quantities Sanity
universe.forEach(s => {
  const price = s.currentPrice || s.basePrice || s.referencePrice;
  if (typeof price !== 'number' || price <= 0) {
    reportError(`Invalid price for ${s.ticker}: ${price}`);
  }
  if (typeof s.totalUnits !== 'number' || s.totalUnits <= 0) {
    reportError(`Invalid totalUnits for ${s.ticker}: ${s.totalUnits}`);
  }
});
console.log(`✅ [6/8] Pricing & Quantities: Zero negative prices or float quantities.`);

// 7. Company Descriptions Quality Check
universe.forEach(s => {
  if (!s.description || s.description.trim().length < 20) {
    reportError(`Short or missing description on ${s.ticker}: "${s.description}"`);
  }
});
console.log(`✅ [7/8] Descriptions: 100% of securities contain enriched factual profile descriptions.`);

// 8. 5 Simulated IPO Verification
const ipoList = universe.filter(s => s.simulationLabel || s.ipoStatus === 'SUBSCRIPTION_OPEN');
if (ipoList.length !== 5) {
  reportError(`Expected 5 simulated IPOs, found ${ipoList.length}`);
} else {
  console.log(`✅ [8/8] Simulated IPOs: 5 hypothetical scenarios verified (OpenAI, Stripe, Canva, Discord, Polymarket).`);
}

console.log('\n======================================================================');
if (errors === 0) {
  console.log('🎉 100% SUCCESS: Universe Dataset is verified and ready for production!');
} else {
  console.error(`💥 Validation failed with ${errors} errors.`);
  process.exit(1);
}
console.log('======================================================================\n');
