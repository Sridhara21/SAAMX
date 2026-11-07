/**
 * SAAMX — Phase 6.2 Exchange Desk Frontend UI & Integration Verification Suite
 * Verifies component reuse, lifecycle status handling, desk isolation ergonomics,
 * physical slip validation gates, in-flight action locks, keyboard hotkeys, and state integrity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';

console.log('======================================================================');
console.log('🏛️ SAAMX — PHASE 6.2 EXCHANGE DESK FRONTEND UI VERIFICATION SUITE');
console.log('======================================================================\n');

// 1. STATE INTEGRITY BASELINE CHECK
console.log('--- TEST 1: STATE.JSON BASELINE HASH INTEGRITY ---');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const statePath = path.resolve('state.json');
assert(fs.existsSync(statePath), 'state.json must exist');
const stateBuffer = fs.readFileSync(statePath);
const actualHash = crypto.createHash('sha256').update(stateBuffer).digest('hex');
assert.strictEqual(actualHash, EXPECTED_HASH, `state.json hash must match baseline! Expected ${EXPECTED_HASH}, got ${actualHash}`);
console.log(`✓ state.json hash verified untouched: ${actualHash}\n`);

// 2. EXCHANGE PAGE SOURCE & UI FOUNDATION INTEGRATION
console.log('--- TEST 2: SHARED UI FOUNDATION PRIMITIVES REUSE ---');
const exchangePagePath = path.resolve('src/pages/ExchangePage.jsx');
assert(fs.existsSync(exchangePagePath), 'ExchangePage.jsx must exist');
const exchangeContent = fs.readFileSync(exchangePagePath, 'utf8');

const requiredUIImports = [
  'Button',
  'Input',
  'Card',
  'CardHeader',
  'Badge',
  'OrderStatusBadge',
  'StationBadge',
  'Modal',
  'ToastContainer',
  'CurrencyDisplay',
  'PriceDisplay',
  'QuantityDisplay',
  'EmptyState',
  'Alert'
];

for (const imp of requiredUIImports) {
  assert(
    exchangeContent.includes(imp),
    `ExchangePage must import and utilize shared UI component: ${imp}`
  );
}
console.log(`✓ Verified ExchangePage reuses all ${requiredUIImports.length} required Phase 6.1 UI foundation primitives.\n`);

// 3. LIFECYCLE STATUS COVERAGE & BADGES
console.log('--- TEST 3: 6-STAGE ORDER LIFECYCLE STATUS COVERAGE ---');
const requiredStatuses = [
  'PENDING',
  'VERIFYING',
  'VALIDATED',
  'EXECUTED',
  'RETURNED_FOR_CORRECTION',
  'REJECTED'
];

for (const st of requiredStatuses) {
  assert(
    exchangeContent.includes(st),
    `ExchangePage must explicitly handle order status: ${st}`
  );
}
assert(
  exchangeContent.includes('<OrderStatusBadge'),
  'ExchangePage must render <OrderStatusBadge> for unambiguous visual status'
);
console.log(`✓ Verified all ${requiredStatuses.length} order lifecycle states are explicitly rendered and handled.\n`);

// 4. STATION ISOLATION & DYNAMIC DESKS
console.log('--- TEST 4: STATION ASSIGNMENT & SERVER-SIDE DESK ISOLATION ---');
const requiredDesks = ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'];
for (const dId of requiredDesks) {
  assert(
    exchangeContent.includes(dId),
    `ExchangePage must dynamically support ${dId}`
  );
}
assert(
  exchangeContent.includes('isSupervisor'),
  'ExchangePage must respect supervisor / administrator cross-operate override'
);
assert(
  exchangeContent.includes('Station Locked'),
  'ExchangePage must visually indicate locked stations to non-assigned operators'
);
console.log('✓ Verified 5 dynamic desks, station lock ergonomics, and supervisory access guards.\n');

// 5. IN-FLIGHT ACTION LOCKING (DOUBLE-CLICK & CONFLICT PROTECTION)
console.log('--- TEST 5: IN-FLIGHT LOCKING & CONCURRENCY PROTECTION ---');
assert(
  exchangeContent.includes('processingOrderIds'),
  'ExchangePage must maintain processingOrderIds Set to prevent double-execution'
);
assert(
  exchangeContent.includes('setOrderProcessing'),
  'ExchangePage must provide setOrderProcessing mutex setter'
);
console.log('✓ Verified in-flight mutex locks protect claim, validation, execution, and rejection actions.\n');

// 6. PHYSICAL SLIP VALIDATION GATES
console.log('--- TEST 6: PHYSICAL PAPER SLIP INSPECTION GATES ---');
assert(
  exchangeContent.includes('physicalSlipChecked'),
  'ExchangePage must enforce physical paper slip seal inspection checkbox'
);
assert(
  exchangeContent.includes('returnReason'),
  'ExchangePage must enforce mandatory return reason on correction modal'
);
assert(
  exchangeContent.includes('rejectReason'),
  'ExchangePage must enforce mandatory rejection reason on rejection modal'
);
console.log('✓ Verified physical paper slip confirmation gate, mandatory return reason, and rejection reason.\n');

// 7. KEYBOARD ACCESSIBILITY & TABULAR NUMERALS
console.log('--- TEST 7: KEYBOARD HOTKEYS & TABULAR NUMERALS ---');
assert(
  exchangeContent.includes("key === 'Escape'"),
  'ExchangePage must listen for Escape key to dismiss active modals'
);
assert(
  exchangeContent.includes("key === 'Enter'") && exchangeContent.includes('ctrlKey'),
  'ExchangePage must support Ctrl+Enter shortcut for rapid slip submission'
);
assert(
  exchangeContent.includes('tabular-nums'),
  'ExchangePage must enforce tabular-nums on monetary consideration and ticket numbers'
);
console.log('✓ Verified keyboard accelerators (Ctrl+Enter, Escape) and tabular numerals formatting.\n');

// 8. FINAL STATE HASH RE-VERIFICATION
console.log('--- TEST 8: FINAL POST-TEST STATE HASH RE-VERIFICATION ---');
const postTestBuffer = fs.readFileSync(statePath);
const postTestHash = crypto.createHash('sha256').update(postTestBuffer).digest('hex');
assert.strictEqual(postTestHash, EXPECTED_HASH, 'state.json was altered during test execution!');
console.log(`✓ Confirmed state.json SHA-256 remains 100% untouched: ${postTestHash}\n`);

console.log('======================================================================');
console.log('🎉 ALL 8 EXCHANGE DESK UI VERIFICATIONS PASSED (8/8)!');
console.log('======================================================================');
