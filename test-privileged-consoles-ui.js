/**
 * SAAMX 2.0 — Phase 6.4 Privileged Operations Consoles UI Verification Suite
 * Verifies UI foundation primitives adoption, theme tokens integration, accessible modal dialogs,
 * tabular numerals, super-admin guards, and authoritative backend contract preservation across:
 * 1. AdminPage.jsx (Master Command Center & Unified Sub-navigation)
 * 2. FloorOperationsDashboard.jsx (Operational Radar & Queue Pressure)
 * 3. SebiPage.jsx (Surveillance, Circuit Breakers & Phoenix Scenarios)
 * 4. JournalistPage.jsx (Press Wire & Teleprompter Console)
 */

import assert from 'assert';
import fs from 'fs';
import crypto from 'crypto';

console.log('======================================================================');
console.log('🛡️ SAAMX — PHASE 6.4 PRIVILEGED CONSOLES UI VERIFICATION SUITE');
console.log('======================================================================\n');

// EXPECTED BASELINE STATE HASH
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

// TEST 1: STATE.JSON BASELINE HASH INTEGRITY
console.log('--- TEST 1: STATE.JSON BASELINE HASH INTEGRITY ---');
const stateRaw = fs.readFileSync('state.json');
const initialHash = crypto.createHash('sha256').update(stateRaw).digest('hex');
assert.strictEqual(initialHash, EXPECTED_HASH, `Baseline state.json hash mismatch: got ${initialHash}`);
console.log(`✓ state.json hash verified untouched: ${initialHash}`);

// TEST 2: ADMINPAGE.JSX UI FOUNDATION & CONSOLE CONSOLIDATION
console.log('\n--- TEST 2: ADMINPAGE.JSX UI FOUNDATION & DESIGN TOKENS ---');
const adminContent = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');

// Primitives import check
assert(adminContent.includes("from '../components/ui/index.js'"), 'AdminPage must import from UI primitives');
assert(adminContent.includes('Button'), 'AdminPage must import Button primitive');
assert(adminContent.includes('Modal'), 'AdminPage must import Modal primitive');
assert(adminContent.includes('Card'), 'AdminPage must import Card primitive');

// Sub-page navigation sections
assert(adminContent.includes("consoleSection === 'overview'"), 'AdminPage must support overview sub-page');
assert(adminContent.includes("consoleSection === 'events'"), 'AdminPage must support events sub-page');
assert(adminContent.includes("consoleSection === 'personnel'"), 'AdminPage must support personnel sub-page');
assert(adminContent.includes("consoleSection === 'results'"), 'AdminPage must support results sub-page');
assert(adminContent.includes("consoleSection === 'audit'"), 'AdminPage must support audit sub-page');

// Super-admin protection
assert(adminContent.includes('isSuperAdmin'), 'AdminPage must maintain isSuperAdmin checks');
assert(adminContent.includes('Super-Administrator Privilege Required'), 'AdminPage must gate personnel editing');

// Modal adoption
assert(adminContent.includes('<Modal'), 'AdminPage must render Modal primitive');
assert(adminContent.includes("title={confirmConfig.title}"), 'AdminPage must use Modal for confirm dialogs');
assert(adminContent.includes('Close Credential Slip'), 'AdminPage must use Modal for credential slip');

// Tabular numerals & design tokens
assert(adminContent.includes('tabular-nums'), 'AdminPage must use tabular numerals for telemetry');
assert(adminContent.includes('var(--color-surface'), 'AdminPage must use design tokens for theme support');
assert(adminContent.includes('var(--color-brass'), 'AdminPage must use design tokens for theme support');
console.log('✓ AdminPage.jsx passes all UI primitives, navigation, guards, and theme checks.');

// TEST 3: FLOOROPERATIONSDASHBOARD.JSX MODERNIZATION
console.log('\n--- TEST 3: FLOOROPERATIONSBAORD.JSX UI FOUNDATION & MODALS ---');
const floorOpsContent = fs.readFileSync('src/pages/FloorOperationsDashboard.jsx', 'utf8');

// Primitives check
assert(floorOpsContent.includes("from '../components/ui/index.js'"), 'FloorOps must import from UI primitives');
assert(floorOpsContent.includes('Button'), 'FloorOps must use Button primitive');
assert(floorOpsContent.includes('Modal'), 'FloorOps must use Modal primitive');
assert(floorOpsContent.includes('ToastContainer'), 'FloorOps must use ToastContainer');

// Market controls & modals
assert(floorOpsContent.includes("showControlModal === 'PAUSE'"), 'FloorOps must handle PAUSE modal');
assert(floorOpsContent.includes("showControlModal === 'RESUME'"), 'FloorOps must handle RESUME modal');
assert(floorOpsContent.includes("showControlModal === 'DIRECTIVE'"), 'FloorOps must handle DIRECTIVE modal');
assert(floorOpsContent.includes('/api/market/control'), 'FloorOps must call /api/market/control');
assert(floorOpsContent.includes('[OPERATIONAL DIRECTIVE]'), 'FloorOps must prefix operational directives');

// Tabular numerals
assert(floorOpsContent.includes('font-mono tabular-nums'), 'FloorOps must format clocks and queue stats with tabular numerals');
console.log('✓ FloorOperationsDashboard.jsx passes all UI primitives, control modals, and queue telemetry checks.');

// TEST 4: SEBIPAGE.JSX SURVEILLANCE & SCENARIOS
console.log('\n--- TEST 4: SEBIPAGE.JSX SURVEILLANCE, HALTS & COORDINATOR HEARTBEAT ---');
const sebiContent = fs.readFileSync('src/pages/SebiPage.jsx', 'utf8');

// Primitives check
assert(sebiContent.includes("from '../components/ui/index.js'"), 'SebiPage must import from UI primitives');
assert(sebiContent.includes('Button'), 'SebiPage must use Button primitive');

// Critical functionality preservation
assert(sebiContent.includes('handleClaimCoordinator'), 'SebiPage must preserve coordinator claim logic');
assert(sebiContent.includes("ref(db, 'fms/coordinator')"), 'SebiPage coordinator heartbeat ref preserved');
assert(sebiContent.includes('handleMarketWideAction'), 'SebiPage must preserve market-wide trading halts');
assert(sebiContent.includes('/api/admin/phoenix-act'), 'SebiPage must preserve Phoenix act scenario dispatcher');
assert(sebiContent.includes('STAGED_INTERVENTION_PROTOCOLS'), 'SebiPage must retain staged intervention protocols');
assert(sebiContent.includes('tabular-nums'), 'SebiPage must format numerical data with tabular numerals');
console.log('✓ SebiPage.jsx passes surveillance, Phoenix acts, and coordinator claim preservation checks.');

// TEST 5: JOURNALISTPAGE.JSX CONSOLIDATION & NEWS ATTRIBUTION
console.log('\n--- TEST 5: JOURNALISTPAGE.JSX WIRE & PROMPTER CONSOLE ---');
const journalistContent = fs.readFileSync('src/pages/JournalistPage.jsx', 'utf8');

// Primitives check
assert(journalistContent.includes("from '../components/ui/index.js'"), 'JournalistPage must import from UI primitives');
assert(journalistContent.includes('Button'), 'JournalistPage must use Button primitive');

// Dual modes
assert(journalistContent.includes("activeMode === 'wire'"), 'JournalistPage must support wire mode');
assert(journalistContent.includes("activeMode === 'scenario'"), 'JournalistPage must support scenario mode');
assert(journalistContent.includes("activeMode === 'anchor'"), 'JournalistPage must support anchor mode');
assert(journalistContent.includes('NewsAnchorConsole'), 'JournalistPage must embed NewsAnchorConsole');

// Simulation attribution & debounce
assert(journalistContent.includes('[SIMULATION WIRE]'), 'JournalistPage must enforce [SIMULATION WIRE] tagging');
assert(journalistContent.includes('includeSimTag'), 'JournalistPage must maintain simulation tag state');
assert(journalistContent.includes('isDuplicate'), 'JournalistPage must maintain duplicate publication debounce check');
assert(journalistContent.includes('tabular-nums'), 'JournalistPage must format timestamps with tabular numerals');
console.log('✓ JournalistPage.jsx passes dual-mode, simulation tagging, debounce, and teleprompter checks.');

// TEST 6: STATE INTEGRITY VERIFICATION AFTER INSPECTIONS
console.log('\n--- TEST 6: FINAL STATE.JSON HASH INTEGRITY ---');
const finalStateRaw = fs.readFileSync('state.json');
const finalHash = crypto.createHash('sha256').update(finalStateRaw).digest('hex');
assert.strictEqual(finalHash, EXPECTED_HASH, `Final state.json hash corrupted: got ${finalHash}`);
console.log(`✓ Final state.json hash strictly preserved: ${finalHash}`);

console.log('\n======================================================================');
console.log('🎉 ALL PRIVILEGED CONSOLES UI VERIFICATIONS PASSED (6/6)');
console.log('======================================================================');
