import { calculateEventImpact, processVodafoneCrisisAct, processIpoStage } from './src/lib/eventEngine.js';

console.log('Testing SAAMX 2026 Unified Live Event Execution Engine...');

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

// Create mock fms state
const mockState = {
  securities: {
    NVDA: { ticker: 'NVDA', name: 'NVIDIA Corp', basePrice: 125.00, currentPrice: 125.00, status: 'Active' },
    MSFT: { ticker: 'MSFT', name: 'Microsoft Corp', basePrice: 420.00, currentPrice: 420.00, status: 'Active' },
    IDEA: { ticker: 'IDEA', name: 'Vodafone Idea Ltd', basePrice: 16.50, currentPrice: 16.50, status: 'Active' },
    OAI: { ticker: 'OAI', name: 'OpenAI Inc', basePrice: 420.00, currentPrice: 420.00, status: 'UNLISTED', isIpo: true }
  },
  fxRates: {
    USDINR: { pair: 'USD/INR', midRate: 88.20, spreadPercent: 0.45 },
    GBPINR: { pair: 'GBP/INR', midRate: 119.40, spreadPercent: 0.45 },
    EURINR: { pair: 'EUR/INR', midRate: 103.50, spreadPercent: 0.45 }
  },
  newsEvents: {},
  events: {},
  marketState: { status: 'Open' },
  auditLog: []
};

// 1. Test Event Impact on Multi-Asset Pricing & FX
const testEvent = {
  id: 'EVT_TEST_001',
  title: 'Global AI Infrastructure Supercycle Rallies Hardware Counters',
  description: 'Massive capex expansions announced across hyperscale data centers.',
  tier: 'TIER_1',
  category: 'CORPORATE',
  affectedSecurities: [
    { ticker: 'NVDA', impactPercent: 6.4 },
    { ticker: 'MSFT', impactPercent: 4.2 }
  ],
  affectedCurrencies: ['USD'],
  projectorPriority: true
};

const { nextState, newsEntry, modifiedSecurities } = calculateEventImpact(testEvent, mockState, { impactMultiplier: 1.0 });

assert(modifiedSecurities.length === 2, `Modified 2 target securities (Actual: ${modifiedSecurities.length})`);
assert(nextState.securities.NVDA.currentPrice === 133.00, `NVDA price adjusted +6.4% from 125.00 to 133.00 (Actual: ${nextState.securities.NVDA.currentPrice})`);
assert(nextState.securities.MSFT.currentPrice === 437.64, `MSFT price adjusted +4.2% from 420.00 to 437.64 (Actual: ${nextState.securities.MSFT.currentPrice})`);
assert(newsEntry.severity === 'CRITICAL', `Tier 1 event assigned CRITICAL severity (Actual: ${newsEntry.severity})`);
assert(nextState.marketState.takeoverEvent !== undefined, `Projector takeover event created for Tier 1 event`);
assert(nextState.securities.NVDA.priceDrivers && nextState.securities.NVDA.priceDrivers.length > 0, `Price driver metadata appended to NVDA`);

// 2. Test Vodafone Idea Crisis Progression
const crisisAct1 = processVodafoneCrisisAct(1, 'RECOVERY', mockState);
assert(crisisAct1.nextState.securities.IDEA.currentPrice < 16.50, `Act 1 decreases IDEA price (Actual: ${crisisAct1.nextState.securities.IDEA.currentPrice})`);

const crisisAct4 = processVodafoneCrisisAct(4, 'RECOVERY', crisisAct1.nextState);
assert(crisisAct4.nextState.securities.IDEA.status === 'Halted', `Act 4 halts IDEA trading status (Actual: ${crisisAct4.nextState.securities.IDEA.status})`);

const crisisAct5Rescue = processVodafoneCrisisAct(5, 'RECOVERY', crisisAct4.nextState);
assert(crisisAct5Rescue.nextState.securities.IDEA.status === 'Active', `Act 5 Rescue restores Active status (Actual: ${crisisAct5Rescue.nextState.securities.IDEA.status})`);
assert(crisisAct5Rescue.nextState.securities.IDEA.currentPrice > crisisAct4.nextState.securities.IDEA.currentPrice, `Act 5 Rescue rebounds price`);

const crisisAct5Bankruptcy = processVodafoneCrisisAct(5, 'BANKRUPTCY', crisisAct4.nextState);
assert(crisisAct5Bankruptcy.nextState.securities.IDEA.status === 'Bankrupt', `Act 5 Bankruptcy sets Bankrupt status (Actual: ${crisisAct5Bankruptcy.nextState.securities.IDEA.status})`);

// 3. Test IPO Lifecycle Progression
const ipoRumour = processIpoStage('OAI', 'RUMOUR', mockState);
assert(ipoRumour.nextState.securities.OAI.ipoStage === 'RUMOUR', `IPO stage advanced to RUMOUR`);

const ipoSubOpen = processIpoStage('OAI', 'SUBSCRIPTION_OPEN', ipoRumour.nextState);
assert(ipoSubOpen.nextState.securities.OAI.status === 'IPO_OPEN', `IPO status set to IPO_OPEN for subscription`);

const ipoListing = processIpoStage('OAI', 'LISTING', ipoSubOpen.nextState);
assert(ipoListing.nextState.securities.OAI.status === 'Active', `IPO status set to Active upon Listing`);
assert(ipoListing.nextState.marketState.takeoverEvent !== undefined, `Takeover triggered for IPO listing`);

console.log(`\nLive Event Engine Test Summary: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
