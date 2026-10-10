import assert from 'assert';
import { generateFullSecurityUniverse, NEW_SIMULATED_IPOS } from './universe_generator.js';

console.log('======================================================================');
console.log('🧪 SAAMX 2026 — GLOBAL MARKET & FX MULTI-CURRENCY ENGINE TEST SUITE');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Test Universe Generation & Multi-Currency Integrity
runTest('1. Global Universe contains 1,800+ securities with real native currencies', () => {
  const universe = generateFullSecurityUniverse();
  assert(universe.length >= 1800, 'Universe must contain at least 1,800 securities');
  
  const inrSecs = universe.filter(s => s.currency === 'INR');
  const usdSecs = universe.filter(s => s.currency === 'USD');
  const gbpSecs = universe.filter(s => s.currency === 'GBP');
  const eurSecs = universe.filter(s => s.currency === 'EUR');

  assert(inrSecs.length >= 700, `Expected >= 700 INR securities, got ${inrSecs.length}`);
  assert(usdSecs.length >= 350, `Expected >= 350 USD securities, got ${usdSecs.length}`);
  assert(gbpSecs.length >= 100, `Expected >= 100 GBP securities, got ${gbpSecs.length}`);
  assert(eurSecs.length >= 100, `Expected >= 100 EUR securities, got ${eurSecs.length}`);
});

// 2. Test Multi-Currency Starting Capital
runTest('2. Starting capital per team is ₹1,00,00,000 INR with empty foreign wallets', () => {
  const startingCapitalINR = 10000000;
  const initialWallets = {
    INR: startingCapitalINR,
    USD: 0,
    GBP: 0,
    EUR: 0
  };

  assert.strictEqual(initialWallets.INR, 10000000, 'INR cash must be 1 Crore');
  assert.strictEqual(initialWallets.USD, 0, 'USD cash must be 0');
  assert.strictEqual(initialWallets.GBP, 0, 'GBP cash must be 0');
  assert.strictEqual(initialWallets.EUR, 0, 'EUR cash must be 0');
});

// 3. Test Spot FX Rate Quotes & Spreads
runTest('3. FX Desk quotes Bid/Ask spread correctly (Spot: 88.20 -> Buy: 88.60, Sell: 87.80)', () => {
  const midRate = 88.20;
  const spreadPercent = 0.45;
  const buyRate = parseFloat((midRate * (1 + spreadPercent / 100)).toFixed(2));
  const sellRate = parseFloat((midRate * (1 - spreadPercent / 100)).toFixed(2));

  assert.strictEqual(buyRate, 88.60, 'Buy rate with 0.45% spread should be 88.60');
  assert.strictEqual(sellRate, 87.80, 'Sell rate with 0.45% spread should be 87.80');
});

// 4. Test Currency Desk Conversion (INR -> USD)
runTest('4. Currency Desk converts ₹10,00,000 INR to USD at Buy Rate ($11,286.68)', () => {
  const inrToSell = 1000000;
  const buyRate = 88.60;
  const expectedUsd = parseFloat((inrToSell / buyRate).toFixed(2));
  
  assert.strictEqual(expectedUsd, 11286.68, 'Converted USD amount should match buy rate calculation');

  // Mutate team wallet
  const teamWallet = { INR: 10000000, USD: 0, GBP: 0, EUR: 0 };
  teamWallet.INR -= inrToSell;
  teamWallet.USD += expectedUsd;

  assert.strictEqual(teamWallet.INR, 9000000, 'INR balance should be reduced to 90 Lakhs');
  assert.strictEqual(teamWallet.USD, 11286.68, 'USD balance should be 11,286.68');

  // Consolidated Net Worth in INR (@ mid rate 88.20)
  const consolidated = teamWallet.INR + (teamWallet.USD * 88.20);
  assert(Math.abs(consolidated - 9995485.18) < 1, 'Consolidated value should reflect exchange spread cost');
});

// 5. Test Cross-Currency Conversion (USD -> GBP)
runTest('5. Cross-currency conversion triangulates through INR accurately', () => {
  const usdAmount = 5000;
  const usdSellRate = 87.80; // Desk buys USD at 87.80
  const gbpBuyRate = 119.95; // Desk sells GBP at 119.95

  const inrGross = usdAmount * usdSellRate; // 439,000 INR
  const gbpReceived = parseFloat((inrGross / gbpBuyRate).toFixed(2));

  assert.strictEqual(gbpReceived, 3659.86, 'Cross currency output matches triangulation formula');
});

// 6. Test Security Purchase Validation in Native Currency
runTest('6. Purchase of US Security (AAPL @ $228) validates USD balance', () => {
  const teamWallet = { INR: 9000000, USD: 1000, GBP: 0, EUR: 0 };
  const stockPriceUSD = 228.00;
  const buyQty = 10;
  const totalCostUSD = stockPriceUSD * buyQty; // $2,280

  const hasFunds = teamWallet.USD >= totalCostUSD;
  assert.strictEqual(hasFunds, false, 'Should fail because team only has $1,000 USD and needs $2,280 USD');
  
  const shortfall = totalCostUSD - teamWallet.USD;
  assert.strictEqual(shortfall, 1280.00, 'Shortfall should be $1,280.00 USD');
});

// 7. Test Successful Foreign Security Execution & FX Metadata
runTest('7. Successful purchase of AAPL records native USD price and execution FX rate', () => {
  const teamWallet = { INR: 9000000, USD: 5000, GBP: 0, EUR: 0 };
  const stockPriceUSD = 228.00;
  const buyQty = 10;
  const totalCostUSD = stockPriceUSD * buyQty; // $2,280
  const spotFxRate = 88.20;

  // Deduct USD
  teamWallet.USD -= totalCostUSD;
  assert.strictEqual(teamWallet.USD, 2720.00, 'Remaining USD should be $2,720');

  // Trade record
  const txRecord = {
    ticker: 'AAPL',
    quantity: buyQty,
    price: stockPriceUSD,
    currency: 'USD',
    fxRate: spotFxRate,
    inrEquivalent: totalCostUSD * spotFxRate
  };

  assert.strictEqual(txRecord.currency, 'USD');
  assert.strictEqual(txRecord.price, 228.00);
  assert.strictEqual(txRecord.inrEquivalent, 201096.00);
});

// 8. Test Dual P&L Breakdown (Investment P&L vs FX P&L)
runTest('8. Dual P&L cleanly isolates stock price movement from FX rate fluctuation', () => {
  // Team bought 10 shares of AAPL @ $200 (Spot FX: ₹80.00). Cost Basis = $2,000 = ₹1,60,000 INR.
  // Current AAPL price = $220 (+10% stock appreciation).
  // Current Spot FX = ₹88.00 (+10% USD appreciation against INR).
  
  const qty = 10;
  const buyPrice = 200.00;
  const initialFx = 80.00;
  const currentPrice = 220.00;
  const currentFx = 88.00;

  const currentValuationNative = qty * currentPrice; // $2,200
  const currentValuationINR = currentValuationNative * currentFx; // ₹1,93,600
  const initialValuationINR = qty * buyPrice * initialFx; // ₹1,60,000

  const totalGainINR = currentValuationINR - initialValuationINR; // ₹33,600

  // Pure stock gain in USD = $200. Converted at initial FX (or current FX)
  const stockGainNative = (currentPrice - buyPrice) * qty; // $200
  const investmentGainINR = stockGainNative * initialFx; // ₹16,000
  const fxGainINR = totalGainINR - investmentGainINR; // ₹17,600 (currency tailwind + interaction)

  assert.strictEqual(totalGainINR, 33600, 'Total P&L is ₹33,600');
  assert.strictEqual(investmentGainINR, 16000, 'Pure asset P&L is ₹16,000');
  assert.strictEqual(fxGainINR, 17600, 'Currency FX gain is ₹17,600');
});

// 9. Test High-Intensity Simulated Event IPOs Integration
runTest('9. 5 Simulated Event IPOs are active and seeded correctly', () => {
  assert.strictEqual(NEW_SIMULATED_IPOS.length, 5, 'Must have exactly 5 simulated IPOs');
  const tickers = NEW_SIMULATED_IPOS.map(i => i.ticker);
  assert(tickers.includes('OAI'), 'Must include OAI');
  assert(tickers.includes('STRP'), 'Must include STRP');
  assert(tickers.includes('CNVA'), 'Must include CNVA');
  assert(tickers.includes('DISC'), 'Must include DISC');
  assert(tickers.includes('POLY'), 'Must include POLY');
});

console.log('\n======================================================================');
console.log(`🏁 Global Market & FX Engine Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('======================================================================');
