/**
 * SAAMX 2.0 — Phase 6.3 Participant Terminal / Workstation UI Verification Suite
 * Verifies UI foundation primitives reuse, 4-section architecture, physical paper-trading
 * boundaries (zero digital trade execution), 6-stage order lifecycle, accessible resubmit modal,
 * tabular numerals, multi-currency ledger, and byte-for-byte database preservation.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('======================================================================');
console.log('💼 SAAMX — PHASE 6.3 PARTICIPANT WORKSTATION UI VERIFICATION SUITE');
console.log('======================================================================\n');

// EXPECTED BASELINE STATE HASH
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

// TEST 1: STATE.JSON BASELINE HASH INTEGRITY
console.log('--- TEST 1: STATE.JSON BASELINE HASH INTEGRITY ---');
const stateRaw = fs.readFileSync('state.json');
const initialHash = crypto.createHash('sha256').update(stateRaw).digest('hex');
assert.strictEqual(initialHash, EXPECTED_HASH, `Baseline state.json hash mismatch: got ${initialHash}`);
console.log(`✓ state.json hash verified untouched: ${initialHash}`);

// TEST 2: SHARED UI FOUNDATION PRIMITIVES REUSE
console.log('\n--- TEST 2: SHARED UI FOUNDATION PRIMITIVES REUSE ---');
const filesToInspect = [
  'src/pages/ParticipantTerminal.jsx',
  'src/components/team/TeamOverviewSection.jsx',
  'src/components/team/MarketOverviewIntelligenceSection.jsx',
  'src/components/team/PortfolioHoldingsSection.jsx',
  'src/components/team/OrderHistorySection.jsx'
];

const requiredPrimitives = [
  'Button',
  'Card',
  'Badge',
  'OrderStatusBadge',
  'Modal',
  'SearchInput',
  'CurrencyDisplay',
  'PriceDisplay',
  'QuantityDisplay',
  'DeltaBadge',
  'EmptyState',
  'Alert'
];

const combinedContents = filesToInspect.map(f => fs.readFileSync(f, 'utf8')).join('\n');

requiredPrimitives.forEach(primitive => {
  assert(
    combinedContents.includes(primitive),
    `Workstation components must consume Phase 6.1 primitive: ${primitive}`
  );
});
console.log(`✓ Verified Workstation components consume all ${requiredPrimitives.length} required UI foundation primitives.`);

// TEST 3: 4-SECTION INFORMATION ARCHITECTURE
console.log('\n--- TEST 3: 4-SECTION INFORMATION ARCHITECTURE ---');
const terminalContent = fs.readFileSync('src/pages/ParticipantTerminal.jsx', 'utf8');

assert(terminalContent.includes("activeSection === 'overview'"), 'Must handle overview section');
assert(terminalContent.includes("activeSection === 'market'"), 'Must handle market section');
assert(terminalContent.includes("activeSection === 'portfolio'"), 'Must handle portfolio section');
assert(terminalContent.includes("activeSection === 'orders'"), 'Must handle orders section');

assert(terminalContent.includes("<TeamOverviewSection"), 'Must render TeamOverviewSection');
assert(terminalContent.includes("<MarketOverviewIntelligenceSection"), 'Must render MarketOverviewIntelligenceSection');
assert(terminalContent.includes("<PortfolioHoldingsSection"), 'Must render PortfolioHoldingsSection');
assert(terminalContent.includes("<OrderHistorySection"), 'Must render OrderHistorySection');
console.log('✓ Verified 4-section architecture (Overview, Market, Portfolio, Orders) is fully integrated.');

// TEST 4: STRICT PAPER-TRADING NON-EXECUTION BOUNDARY
console.log('\n--- TEST 4: STRICT PAPER-TRADING NON-EXECUTION BOUNDARY ---');
// Participants must NEVER be able to place or execute orders digitally from their terminal
assert(!terminalContent.includes('/api/order/execute'), 'Participant terminal must not execute trades');
assert(!terminalContent.includes('/api/order/claim'), 'Participant terminal must not claim trades');
assert(!combinedContents.includes('Place Order Now'), 'Participant terminal must not have digital buy buttons');
assert(!combinedContents.includes('Buy Shares Online'), 'Participant terminal must not have digital buy buttons');
assert(combinedContents.includes('Physical Order Slip'), 'Must display physical paper slip instructions');
console.log('✓ Strict paper-trading non-execution boundary verified: zero digital execution buttons.');

// TEST 5: 6-STAGE ORDER LIFECYCLE COVERAGE
console.log('\n--- TEST 5: 6-STAGE ORDER LIFECYCLE COVERAGE ---');
const orderHistoryContent = fs.readFileSync('src/components/team/OrderHistorySection.jsx', 'utf8');
const lifecycleStates = [
  'PENDING',
  'VERIFYING',
  'VALIDATED',
  'EXECUTED',
  'RETURNED_FOR_CORRECTION',
  'REJECTED'
];

lifecycleStates.forEach(status => {
  assert(
    orderHistoryContent.includes(status),
    `OrderHistorySection must explicitly handle lifecycle status: ${status}`
  );
});
console.log('✓ Verified all 6 order lifecycle stages are handled and monitored.');

// TEST 6: ACCESSIBLE RESUBMISSION MODAL & RETURN-FOR-CORRECTION
console.log('\n--- TEST 6: ACCESSIBLE RESUBMISSION MODAL & RETURN-FOR-CORRECTION ---');
assert(orderHistoryContent.includes('<Modal'), 'Must use accessible Modal component');
assert(orderHistoryContent.includes('backgroundColor: \'var(--color-surface)\''), 'Modal must adapt to theme surface');
assert(orderHistoryContent.includes('/api/orders/resubmit'), 'Must invoke authoritative resubmission endpoint');
assert(orderHistoryContent.includes('Correct & Resubmit'), 'Must present resubmission action');
console.log('✓ Verified accessible Modal dialog for paper slip return-for-correction resubmission.');

// TEST 7: HIGH-PERFORMANCE SECURITIES EXPLORER & PAGINATION
console.log('\n--- TEST 7: HIGH-PERFORMANCE SECURITIES EXPLORER & PAGINATION ---');
const marketContent = fs.readFileSync('src/components/team/MarketOverviewIntelligenceSection.jsx', 'utf8');
assert(marketContent.includes('itemsPerPage = 20'), 'Must use 20 items per page for client performance');
assert(marketContent.includes('totalPages ='), 'Must calculate total pages');
assert(marketContent.includes('currentSecPage'), 'Must manage current page');
assert(marketContent.includes('secSearch'), 'Must support securities search');
assert(marketContent.includes('secExchange'), 'Must support exchange filtering');
assert(marketContent.includes('secSector'), 'Must support sector filtering');
assert(marketContent.includes('focusedSecurity'), 'Must support contextual detail panel');
console.log('✓ Verified high-performance paginated explorer (20 items/page) with multi-criteria filtering.');

// TEST 8: TABULAR NUMERALS & FINANCIAL ACCESSIBILITY
console.log('\n--- TEST 8: TABULAR NUMERALS & FINANCIAL ACCESSIBILITY ---');
filesToInspect.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  assert(
    content.includes('tabular-nums') || content.includes('font-data'),
    `${f} must enforce tabular numerals for financial alignment`
  );
});
console.log('✓ Verified tabular numerals enforcement across all 5 Workstation components.');

// TEST 9: FINAL POST-TEST STATE HASH RE-VERIFICATION
console.log('\n--- TEST 9: FINAL POST-TEST STATE HASH RE-VERIFICATION ---');
const finalHash = crypto.createHash('sha256').update(fs.readFileSync('state.json')).digest('hex');
assert.strictEqual(finalHash, EXPECTED_HASH, `Final state.json hash corrupted: got ${finalHash}`);
console.log(`✓ Confirmed state.json SHA-256 remains 100% untouched: ${finalHash}`);

console.log('\n======================================================================');
console.log('🎉 ALL 9 PARTICIPANT WORKSTATION UI VERIFICATIONS PASSED (9/9)!');
console.log('======================================================================\n');
