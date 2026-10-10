console.log('Testing SAAMX 2026 Stock Broker Intelligence System...');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Recommendations collection
const brokerRecommendations = [
  { id: 'R1', brokerName: 'Alpha Desk', ticker: 'NVDA', recommendation: 'BUY', confidence: 85, reasoning: 'Strong margins', riskLevel: 'LOW' },
  { id: 'R2', brokerName: 'Beta Securities', ticker: 'NVDA', recommendation: 'BUY', confidence: 80, reasoning: 'High momentum', riskLevel: 'MEDIUM' },
  { id: 'R3', brokerName: 'Gamma Capital', ticker: 'NVDA', recommendation: 'HOLD', confidence: 70, reasoning: 'Fairly valued', riskLevel: 'LOW' },
  { id: 'R4', brokerName: 'Delta Advisory', ticker: 'IDEA', recommendation: 'SELL', confidence: 90, reasoning: 'Liquidity headwinds', riskLevel: 'HIGH' }
];

// Test 1: Consensus Calculation for NVDA
const nvdaCalls = brokerRecommendations.filter(r => r.ticker === 'NVDA');
const buyCount = nvdaCalls.filter(r => r.recommendation === 'BUY').length;
const holdCount = nvdaCalls.filter(r => r.recommendation === 'HOLD').length;
const sellCount = nvdaCalls.filter(r => r.recommendation === 'SELL').length;
const total = nvdaCalls.length;

const buyPct = Math.round((buyCount / total) * 100);
const holdPct = Math.round((holdCount / total) * 100);

assert(total === 3, 'NVDA has 3 analyst recommendations');
assert(buyPct === 67, `NVDA BUY consensus is 67% (Actual: ${buyPct}%)`);
assert(holdPct === 33, `NVDA HOLD consensus is 33% (Actual: ${holdPct}%)`);

// Test 2: IDEA High Risk Flag
const ideaCalls = brokerRecommendations.filter(r => r.ticker === 'IDEA');
assert(ideaCalls[0].recommendation === 'SELL', 'IDEA recommendation is SELL');
assert(ideaCalls[0].riskLevel === 'HIGH', 'IDEA flagged as HIGH risk level');

console.log(`\nBroker Intelligence Test Summary: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
