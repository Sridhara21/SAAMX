import { MASTER_MARKET_EVENTS } from './src/lib/marketEventsDataset.js';

console.log('Testing SAAMX 2026 Master Market Event Library...');

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

// Test 1: Event library count
assert(MASTER_MARKET_EVENTS.length >= 300, `Event library count >= 300 (Actual: ${MASTER_MARKET_EVENTS.length})`);

// Test 2: Tier distribution
const tiers = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
MASTER_MARKET_EVENTS.forEach(e => {
  if (tiers[e.tier] !== undefined) tiers[e.tier]++;
});
assert(tiers.TIER_1 >= 25, `Tier 1 (Market Defining) count >= 25 (Actual: ${tiers.TIER_1})`);
assert(tiers.TIER_2 >= 70, `Tier 2 (Important Sector/Macro) count >= 70 (Actual: ${tiers.TIER_2})`);
assert(tiers.TIER_3 >= 140, `Tier 3 (Continuous Wire) count >= 140 (Actual: ${tiers.TIER_3})`);

// Test 3: Schema completeness for all events
let schemaErrors = 0;
MASTER_MARKET_EVENTS.forEach((e, idx) => {
  if (!e.id || !e.title || !e.description || !e.category || !e.tier || !e.scheduledTime) {
    schemaErrors++;
    console.error(`Schema error at index ${idx}:`, e);
  }
});
assert(schemaErrors === 0, `All events conform to master schema (Errors: ${schemaErrors})`);

// Test 4: Categories distribution
const categories = new Set(MASTER_MARKET_EVENTS.map(e => e.category));
assert(categories.has('CORPORATE'), 'Category CORPORATE present');
assert(categories.has('GLOBAL_MACRO'), 'Category GLOBAL_MACRO present');
assert(categories.has('GOVERNMENT'), 'Category GOVERNMENT present');
assert(categories.has('REGULATORY'), 'Category REGULATORY present');
assert(categories.has('CURRENCY'), 'Category CURRENCY present');
assert(categories.has('BOND'), 'Category BOND present');
assert(categories.has('IPO'), 'Category IPO present');
assert(categories.has('CRISIS'), 'Category CRISIS present');

// Test 5: Storylines present
const storylines = new Set(MASTER_MARKET_EVENTS.map(e => e.storyline).filter(Boolean));
assert(storylines.has('VODAFONE_IDEA_CRISIS'), 'Vodafone Idea Crisis storyline present');
assert(storylines.has('OPENING_NEWS'), 'Opening News storyline present');
assert(storylines.has('BULL_VS_BEAR'), 'Bull vs Bear storyline present');
assert(storylines.has('CLOSING_NEWS'), 'Closing News storyline present');

console.log(`\nEvent Library Test Summary: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
