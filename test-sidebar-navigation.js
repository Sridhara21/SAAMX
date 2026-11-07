import assert from 'assert';
import { NAVIGATION_SECTIONS, getFilteredNavSections, isItemActive } from './src/lib/navigationConfig.js';

console.log('============================================================');
console.log('🧪 SAAMX 2.0 — PHASE 2 RESPONSIVE SIDEBAR NAVIGATION TESTS');
console.log('============================================================\n');

// 1. Verify Navigation Sections Structure
console.log('--- TEST 1: NAVIGATION TAXONOMY & STRUCTURE ---');
assert(Array.isArray(NAVIGATION_SECTIONS), 'NAVIGATION_SECTIONS must be an array');
assert.strictEqual(NAVIGATION_SECTIONS.length, 5, 'Must have exactly 5 logical sections');

const sectionIds = NAVIGATION_SECTIONS.map(s => s.id);
assert.deepStrictEqual(sectionIds, ['trading', 'market', 'surveillance', 'operations', 'event'], 'Section IDs must match taxonomy');

let allItems = [];
NAVIGATION_SECTIONS.forEach(sec => {
  assert(sec.title && sec.title.trim().length > 0, `Section ${sec.id} must have a title`);
  assert(Array.isArray(sec.items) && sec.items.length > 0, `Section ${sec.id} must have items`);
  sec.items.forEach(item => {
    assert(item.id, 'Item must have an id');
    assert(item.name, 'Item must have a name');
    assert(item.path && item.path.startsWith('#/'), `Item ${item.name} path must start with #/`);
    assert(Array.isArray(item.routes) && item.routes.length > 0, `Item ${item.name} must have routes array`);
    assert(item.icon, `Item ${item.name} must have an icon`);
    assert(Array.isArray(item.roles) && item.roles.length > 0, `Item ${item.name} must have allowed roles`);
    assert(item.description, `Item ${item.name} must have a description`);
    allItems.push(item);
  });
});

console.log(`✓ Verified ${allItems.length} total navigation destinations across 5 sections.`);

// Check for uniqueness of paths and IDs
const itemIds = allItems.map(i => i.id);
assert.strictEqual(new Set(itemIds).size, itemIds.length, 'Item IDs must be unique');

// Check that standalone Verification Desk tab is NOT in items
const hasStandaloneVerificationTab = allItems.some(i => i.id === 'verification-desk' || i.name === 'Verification Desk');
assert.strictEqual(hasStandaloneVerificationTab, false, 'Standalone Verification Desk tab must NOT be restored');
console.log('✓ Verified standalone Verification Desk tab is NOT present.');

// Check that Exchange Desk includes both legacy verification aliases
const exchangeItem = allItems.find(i => i.id === 'exchange-desk');
assert(exchangeItem, 'Exchange Desk item must exist');
assert(exchangeItem.routes.includes('#/verification'), 'Exchange Desk must include #/verification route');
assert(exchangeItem.routes.includes('#/verification-desk'), 'Exchange Desk must include #/verification-desk route');
console.log('✓ Verified Exchange Desk includes #/verification and #/verification-desk compatibility aliases.');

// 2. Active Route Resolution & Aliases
console.log('\n--- TEST 2: ACTIVE ROUTE RESOLUTION & ALIASES ---');
assert.strictEqual(isItemActive(exchangeItem, '#/exchange'), true, '#/exchange must be active');
assert.strictEqual(isItemActive(exchangeItem, '#/verification'), true, '#/verification must activate Exchange Desk');
assert.strictEqual(isItemActive(exchangeItem, '#/verification-desk'), true, '#/verification-desk must activate Exchange Desk');
assert.strictEqual(isItemActive(exchangeItem, '#/exchange?desk=DESK_1'), true, 'Query param route must be active');
assert.strictEqual(isItemActive(exchangeItem, '#/team'), false, 'Non-matching route must be inactive');

const teamItem = allItems.find(i => i.id === 'team-terminal');
assert.strictEqual(isItemActive(teamItem, '#/team'), true);
assert.strictEqual(isItemActive(teamItem, '#/team?t=orders'), true);
assert.strictEqual(isItemActive(teamItem, '#/exchange'), false);
console.log('✓ Active route matching & legacy alias resolution passed.');

// 3. Role-Based Navigation Filtering
console.log('\n--- TEST 3: ROLE-BASED NAVIGATION FILTERING ---');

// Team role
const teamSections = getFilteredNavSections('team');
const teamItemNames = teamSections.flatMap(s => s.items.map(i => i.name));
console.log('Team visible items:', teamItemNames.join(', '));
assert(teamItemNames.includes('Team Terminal'), 'Team must see Team Terminal');
assert(teamItemNames.includes('Market Watch'), 'Team must see Market Watch');
assert(teamItemNames.includes('Broker Advisor'), 'Team must see Broker Advisor');
assert(teamItemNames.includes('Competition Results'), 'Team must see Results');
assert(!teamItemNames.includes('Floor Director (Admin)'), 'Team must NOT see Floor Director');
assert(!teamItemNames.includes('SEBI Surveillance'), 'Team must NOT see SEBI Surveillance');
assert(!teamItemNames.includes('Exchange Desk'), 'Team must NOT see Exchange Desk');

// Operator_x role
const opXSections = getFilteredNavSections('operator_x');
const opXItemNames = opXSections.flatMap(s => s.items.map(i => i.name));
console.log('Operator X visible items:', opXItemNames.join(', '));
assert(opXItemNames.includes('Exchange Desk'), 'Operator X must see Exchange Desk');
assert(opXItemNames.includes('Currency Desk'), 'Operator X must see Currency Desk');
assert(opXItemNames.includes('Floor Operations'), 'Operator X must see Floor Operations');
assert(!opXItemNames.includes('Team Terminal'), 'Operator X must NOT see Team Terminal');
assert(!opXItemNames.includes('SEBI Surveillance'), 'Operator X must NOT see SEBI Surveillance');

// Verification role (migrated to Exchange Desk)
const verifSections = getFilteredNavSections('verification');
const verifItemNames = verifSections.flatMap(s => s.items.map(i => i.name));
console.log('Verification role visible items:', verifItemNames.join(', '));
assert(verifItemNames.includes('Exchange Desk'), 'Verification role must see Exchange Desk');
assert(!verifItemNames.includes('Verification Desk'), 'Verification role must NOT see standalone Verification Desk');
assert(!verifItemNames.includes('Floor Director (Admin)'), 'Verification role must NOT see Floor Director');

// SEBI Surveillance role
const sebiSections = getFilteredNavSections('sebi');
const sebiItemNames = sebiSections.flatMap(s => s.items.map(i => i.name));
console.log('SEBI visible items:', sebiItemNames.join(', '));
assert(sebiItemNames.includes('SEBI Surveillance'), 'SEBI must see SEBI Surveillance');
assert(sebiItemNames.includes('Portfolios Oversight'), 'SEBI must see Portfolios Oversight');
assert(!sebiItemNames.includes('Exchange Desk'), 'SEBI must NOT see Exchange Desk');
assert(!sebiItemNames.includes('Team Terminal'), 'SEBI must NOT see Team Terminal');

// Admin role
const adminSections = getFilteredNavSections('admin');
const adminItemNames = adminSections.flatMap(s => s.items.map(i => i.name));
console.log(`Admin visible items: ${adminItemNames.length} total items`);
assert.strictEqual(adminItemNames.length, allItems.length, 'Admin must see ALL navigation destinations');

console.log('✓ Role-based navigation filtering passed across all roles.');

console.log('\n============================================================');
console.log('✅ ALL SIDEBAR NAVIGATION TESTS PASSED SUCCESSFULLY!');
console.log('============================================================\n');
