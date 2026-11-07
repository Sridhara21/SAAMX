/**
 * SAAMX 2.0 — Phase 6.5 Central Projector & Public Display Rebuild Verification Suite
 * Verifies UI foundation primitives adoption, theme tokens integration, large-format legibility,
 * tabular numerals, stale telemetry / disconnected handling, universal takeover overlays,
 * dual tagline preservation, unauthenticated privacy, and authoritative backend contract preservation across:
 * 1. ProjectorPage.jsx (Auditorium Screen & Market Intelligence Center)
 * 2. PublicLandingPage.jsx (Public Entry, Dual Taglines & Event Schedule)
 * 3. App.jsx (Route bindings and connection telemetry prop forwarding)
 */

import assert from 'assert';
import fs from 'fs';
import crypto from 'crypto';

console.log('======================================================================');
console.log('📽️ SAAMX — PHASE 6.5 CENTRAL PROJECTOR & PUBLIC DISPLAY VERIFICATION');
console.log('======================================================================\n');

// EXPECTED BASELINE STATE HASH
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

// TEST 1: STATE.JSON BASELINE HASH INTEGRITY
console.log('--- TEST 1: STATE.JSON BASELINE HASH INTEGRITY ---');
const stateRaw = fs.readFileSync('state.json');
const initialHash = crypto.createHash('sha256').update(stateRaw).digest('hex');
assert.strictEqual(initialHash, EXPECTED_HASH, `Baseline state.json hash mismatch: got ${initialHash}`);
console.log(`✓ state.json hash verified untouched: ${initialHash}`);

// TEST 2: PROJECTORPAGE.JSX UI FOUNDATION & DESIGN TOKENS
console.log('\n--- TEST 2: PROJECTORPAGE.JSX UI FOUNDATION & DESIGN TOKENS ---');
const projectorContent = fs.readFileSync('src/pages/ProjectorPage.jsx', 'utf8');

// Primitives import check
assert(projectorContent.includes("from '../components/ui/index.js'"), 'ProjectorPage must import from UI primitives');
assert(projectorContent.includes('Card'), 'ProjectorPage must import Card primitive');
assert(projectorContent.includes('Badge'), 'ProjectorPage must import Badge primitive');
assert(projectorContent.includes('Button'), 'ProjectorPage must import Button primitive');

// Design tokens
assert(projectorContent.includes('var(--color-surface'), 'ProjectorPage must use surface design tokens');
assert(projectorContent.includes('var(--color-brass'), 'ProjectorPage must use brass design tokens');
assert(projectorContent.includes('var(--color-rise'), 'ProjectorPage must use rise design tokens');
assert(projectorContent.includes('var(--color-fall'), 'ProjectorPage must use fall design tokens');

// Tabular numerals for large display readability
assert(projectorContent.includes('font-mono tabular-nums'), 'ProjectorPage must format figures with font-mono tabular-nums');

// Disconnected / Stale Telemetry Handling
assert(projectorContent.includes('connected = true'), 'ProjectorPage must accept connected prop');
assert(projectorContent.includes('isCoordinatorOffline = false'), 'ProjectorPage must accept isCoordinatorOffline prop');
assert(projectorContent.includes('TELEMETRY DISCONNECTED'), 'ProjectorPage must display disconnected warning banner');
assert(projectorContent.includes('COORDINATOR OFFLINE'), 'ProjectorPage must display coordinator offline warning banner');

// Preserved visual gauges & sparklines
assert(projectorContent.includes('Sparkline'), 'ProjectorPage must retain Sparkline drawing');
assert(projectorContent.includes('MarketPulseGauge'), 'ProjectorPage must retain MarketPulseGauge');
assert(projectorContent.includes('marketIndices'), 'ProjectorPage must compute global indices');
assert(projectorContent.includes('fxRates'), 'ProjectorPage must compute FX spot rates');
assert(projectorContent.includes('breadth'), 'ProjectorPage must compute market breadth');

// Interactive modal profile trigger
assert(projectorContent.includes('onOpenProfile'), 'ProjectorPage must support onOpenProfile callback');

// Universal takeover overlays
assert(projectorContent.includes('renderTakeoverOverlay'), 'ProjectorPage must render takeover overlay function');
assert(projectorContent.includes('NEWS_FLASH'), 'ProjectorPage must support NEWS_FLASH overlay');
assert(projectorContent.includes('MARKET_HALT'), 'ProjectorPage must support MARKET_HALT overlay');
assert(projectorContent.includes('IPO_PENDING'), 'ProjectorPage must support IPO_PENDING overlay');
assert(projectorContent.includes('IPO_LAUNCH'), 'ProjectorPage must support IPO_LAUNCH overlay');
assert(projectorContent.includes('BANKRUPTCY'), 'ProjectorPage must support BANKRUPTCY overlay');
assert(projectorContent.includes('OPENING_BELL'), 'ProjectorPage must support OPENING_BELL overlay');
assert(projectorContent.includes('CLOSING_BELL'), 'ProjectorPage must support CLOSING_BELL overlay');
assert(projectorContent.includes('STOCK_SPLIT'), 'ProjectorPage must support STOCK_SPLIT overlay');
assert(projectorContent.includes('8000'), 'ProjectorPage must auto-dismiss takeover overlays after 8 seconds');
assert(projectorContent.includes("e.key === 'Escape'"), 'ProjectorPage must support ESC key dismissal');
assert(projectorContent.includes('✕ CLOSE [ESC]'), 'ProjectorPage must provide accessible close button on takeover');

// Results view podium & table
assert(projectorContent.includes("sessionState === 'RESULTS'"), 'ProjectorPage must handle RESULTS view');
assert(projectorContent.includes('OFFICIAL FINAL COMPETITION RESULTS'), 'ProjectorPage must handle official results title');
assert(projectorContent.includes('PROVISIONAL LEADERBOARD'), 'ProjectorPage must handle provisional leaderboard title');
assert(projectorContent.includes('🥇'), 'ProjectorPage must render Rank 1 gold medal');
assert(projectorContent.includes('🥈'), 'ProjectorPage must render Rank 2 silver medal');
assert(projectorContent.includes('🥉'), 'ProjectorPage must render Rank 3 bronze medal');
assert(projectorContent.includes('Complete Institutional Directory Standings'), 'ProjectorPage must display full team leaderboard');

console.log('✓ ProjectorPage.jsx passes all UI primitives, telemetry, overlays, podium, and theme checks.');

// TEST 3: PUBLICLANDINGPAGE.JSX MODERNIZATION & DUAL TAGLINES
console.log('\n--- TEST 3: PUBLICLANDINGPAGE.JSX UI FOUNDATION & TAGLINES ---');
const landingContent = fs.readFileSync('src/pages/PublicLandingPage.jsx', 'utf8');

// Primitives check
assert(landingContent.includes("from '../components/ui/index.js'"), 'PublicLandingPage must import from UI primitives');
assert(landingContent.includes('Card'), 'PublicLandingPage must import Card primitive');
assert(landingContent.includes('Badge'), 'PublicLandingPage must import Badge primitive');
assert(landingContent.includes('Button'), 'PublicLandingPage must import Button primitive');

// Dual Taglines Preservation
assert(
  landingContent.includes("Experience the market, don't just plan it"),
  'PublicLandingPage must preserve primary tagline: "Experience the market, don\'t just plan it"'
);
assert(
  landingContent.includes("Experience the Market. Don't Just Learn It."),
  'PublicLandingPage must preserve secondary tagline: "Experience the Market. Don\'t Just Learn It."'
);

// Academic simulation framing & physical paper-trading fidelity
assert(landingContent.includes('Student Academic Asset Market eXchange'), 'PublicLandingPage must display canonical SAAMX title');
assert(landingContent.includes('₹1 Crore'), 'PublicLandingPage must specify ₹1 Crore institutional starting capital');
assert(landingContent.includes('2,000+'), 'PublicLandingPage must mention 2,000+ securities directory');
assert(landingContent.includes('Physical Paper Desks'), 'PublicLandingPage must emphasize physical paper-trading floor mechanics');
assert(landingContent.includes('Multi-Currency Settlement'), 'PublicLandingPage must explain multi-currency FX settlement');
assert(landingContent.includes('SEBI Regulatory Watch'), 'PublicLandingPage must detail SEBI surveillance');
assert(landingContent.includes('Canonical Competition Protocol'), 'PublicLandingPage must feature canonical competition schedule');
assert(landingContent.includes('Subject to Event Secretariat Announcement'), 'PublicLandingPage must distinguish confirmed rules from unconfigured host/date details without fictional sponsors');

// Tabular numerals
assert(landingContent.includes('tabular-nums'), 'PublicLandingPage must use tabular numerals for schedule and highlights');

// Security & Privacy Guarantee (Zero private state / credentials exposed)
assert(!landingContent.includes('password'), 'PublicLandingPage must not contain password strings');
assert(!landingContent.includes('MASTER_PASSWORD'), 'PublicLandingPage must not leak master password');
assert(!landingContent.includes('SAAMX_AUTH_SECRET'), 'PublicLandingPage must not leak auth secret');
assert(!landingContent.includes('clerkStation'), 'PublicLandingPage must not expose internal clerk stations');
assert(!landingContent.includes('auditLog'), 'PublicLandingPage must not expose private audit logs');

// Navigation links
assert(landingContent.includes('#/login'), 'PublicLandingPage must link to #/login');
assert(landingContent.includes('#/projector'), 'PublicLandingPage must link to #/projector');
assert(landingContent.includes('#/portals'), 'PublicLandingPage must link to #/portals');

console.log('✓ PublicLandingPage.jsx passes UI primitives, dual taglines, schedule, privacy, and theme checks.');

// TEST 4: APP.JSX INTEGRATION & CONNECTION PROP FORWARDING
console.log('\n--- TEST 4: APP.JSX CONNECTION PROP FORWARDING ---');
const appContent = fs.readFileSync('src/App.jsx', 'utf8');

assert(appContent.includes('connected={dbConnected}'), 'App.jsx must pass connected prop to ProjectorPage');
assert(appContent.includes('isCoordinatorOffline={isCoordinatorOffline}'), 'App.jsx must pass isCoordinatorOffline to ProjectorPage');
console.log('✓ App.jsx passes connection telemetry prop forwarding check.');

// TEST 5: FINAL STATE.JSON INTEGRITY CHECK
console.log('\n--- TEST 5: FINAL STATE.JSON INTEGRITY CHECK ---');
const finalStateRaw = fs.readFileSync('state.json');
const finalHash = crypto.createHash('sha256').update(finalStateRaw).digest('hex');
assert.strictEqual(finalHash, EXPECTED_HASH, `State hash mutated during tests! Got ${finalHash}`);
console.log(`✓ state.json hash verified strictly untouched: ${finalHash}`);

console.log('\n======================================================================');
console.log('🎉 ALL PHASE 6.5 PROJECTOR & PUBLIC DISPLAY VERIFICATIONS PASSED (5/5)');
console.log('======================================================================');
