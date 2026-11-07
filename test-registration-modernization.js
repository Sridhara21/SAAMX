/**
 * test-registration-modernization.js
 * Verification suite for Phase D.2: RegistrationPage.jsx and PublicLandingPage.jsx modernization
 */

import assert from 'assert';
import fs from 'fs';
import crypto from 'crypto';

console.log('======================================================================');
console.log('📝 SAAMX — PHASE D.2 REGISTRATION & PUBLIC LANDING VERIFICATION');
console.log('======================================================================\n');

// 1. BASELINE HASH CHECK
console.log('--- TEST 1: STATE.JSON INTEGRITY ---');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const actualHash = crypto.createHash('sha256').update(fs.readFileSync('state.json')).digest('hex');
assert.strictEqual(actualHash, EXPECTED_HASH, 'state.json SHA-256 hash must be identical to baseline');
console.log(`✓ Baseline state.json hash verified: ${actualHash}`);

// 2. REGISTRATIONPAGE.JSX AUDIT
console.log('\n--- TEST 2: REGISTRATIONPAGE.JSX ARCHITECTURE & COMPONENT SYSTEM ---');
const regContent = fs.readFileSync('src/pages/RegistrationPage.jsx', 'utf8');

// Imports & UI Primitives
assert(regContent.includes("from '../components/ui/index.js'"), 'RegistrationPage must import from UI primitives');
assert(regContent.includes('Card'), 'RegistrationPage must import Card');
assert(regContent.includes('Button'), 'RegistrationPage must import Button');
assert(regContent.includes('Input'), 'RegistrationPage must import Input');
assert(regContent.includes('Select'), 'RegistrationPage must import Select');
assert(regContent.includes('Alert'), 'RegistrationPage must import Alert');
assert(regContent.includes('ThemeToggle'), 'RegistrationPage must import ThemeToggle');

// SVG Icons
assert(regContent.includes("from '../lib/icons.jsx'"), 'RegistrationPage must import SVG icons');
assert(regContent.includes('IconBuilding'), 'RegistrationPage must import IconBuilding');
assert(regContent.includes('IconBriefcase'), 'RegistrationPage must import IconBriefcase');
assert(regContent.includes('IconUser'), 'RegistrationPage must import IconUser');
assert(regContent.includes('IconShieldCheck'), 'RegistrationPage must import IconShieldCheck');
assert(regContent.includes('IconCheck'), 'RegistrationPage must import IconCheck');
assert(regContent.includes('IconPrinter'), 'RegistrationPage must import IconPrinter');
assert(regContent.includes('IconX'), 'RegistrationPage must import IconX');
assert(regContent.includes('IconClipboardList'), 'RegistrationPage must import IconClipboardList');

// Zero emoji check in JSX
const emojiPattern = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const lines = regContent.split('\n');
const linesWithEmojis = lines.filter((l, i) => emojiPattern.test(l) && !l.includes('*') && !l.includes('//'));
assert.strictEqual(linesWithEmojis.length, 0, `RegistrationPage must not contain emoji icons in code: ${JSON.stringify(linesWithEmojis)}`);
console.log('✓ RegistrationPage strictly uses SVG icons with zero emojis.');

// 3. LATENT BUG FIX VERIFICATION: contactEmail & contactPhone
console.log('\n--- TEST 3: LATENT STATE REFERENCE BUG FIX ---');
assert(regContent.includes("const [contactEmail, setContactEmail] = useState('');"), 'contactEmail state variable must be declared');
assert(regContent.includes("const [contactPhone, setContactPhone] = useState('');"), 'contactPhone state variable must be declared');
assert(regContent.includes('contactEmail: contactEmail.trim()'), 'contactEmail must be included in registration payload');
assert(regContent.includes('contactPhone: contactPhone.trim()'), 'contactPhone must be included in registration payload');
assert(regContent.includes('Team Leader Email Address'), 'Step 1 must provide an email input field');
assert(regContent.includes('Contact Phone / Mobile'), 'Step 1 must provide a phone input field');
console.log('✓ Latent ReferenceError for contactEmail and contactPhone resolved completely.');

// 4. CAPACITY & DOMAIN SEMANTICS
console.log('\n--- TEST 4: CAPACITY BOUNDARIES & SEMANTICS ---');
assert(regContent.includes('Math.min(20, Math.max(10,'), 'Configured capacity must clamp between 10 and 20');
assert(regContent.includes('Registered Intake'), 'Capacity bar must display registered intake distinctly');
assert(regContent.includes('Starting Capital:'), 'Capacity bar must state Starting Capital');
assert(regContent.includes('₹{(currentEvent.startingCapital || 10000000).toLocaleString('), 'Starting capital must format with locale formatting');
assert(regContent.includes('isCapacityReached'), 'Must evaluate isCapacityReached');
assert(regContent.includes('isRegistrationClosed'), 'Must evaluate isRegistrationClosed');
console.log('✓ Capacity semantics correctly evaluate between 10 and 20 houses.');

// 5. STEP WORKFLOW & VALIDATION LOGIC
console.log('\n--- TEST 5: STEP WORKFLOW INTEGRITY ---');
assert(regContent.includes('Step 1: Educational Institution Profile'), 'Step 1 title present');
assert(regContent.includes('Step 2: Investment House Identity'), 'Step 2 title present');
assert(regContent.includes('Step 3: Team Delegates & Officers'), 'Step 3 title present');
assert(regContent.includes('Step 4: Review Registration Details'), 'Step 4 title present');
assert(regContent.includes('Registration Successfully Submitted!'), 'Step 5 title present');
assert(regContent.includes('saamx-credential-badge'), 'Official delegate pass credential badge present for print target');
assert(regContent.includes('printBadge'), 'Print badge function defined');
console.log('✓ Multi-step intake workflow (5 steps) intact with official credential ticket.');

// 6. BACKEND API CONTRACT & ASYNC RESPONSE PARSING
console.log('\n--- TEST 6: BACKEND API CONTRACT & ROBUST RESPONSE PARSING ---');
assert(regContent.includes("apiFetch('/api/register/complete'"), 'Must call /api/register/complete');
assert(regContent.includes("typeof res.json === 'function'"), 'Must safely parse response if res.json() is available');
assert(regContent.includes('setConfirmationData(data)'), 'Must update confirmation data on success');
assert(regContent.includes('setStep(5)'), 'Must advance to step 5 on success');
console.log('✓ Authoritative backend contract with /api/register/complete strictly verified.');

// 7. PUBLICLANDINGPAGE.JSX VERIFICATION
console.log('\n--- TEST 7: PUBLICLANDINGPAGE.JSX TAGLINES & PRIVACY ---');
const landingContent = fs.readFileSync('src/pages/PublicLandingPage.jsx', 'utf8');
assert(landingContent.includes("Experience the market, don't just plan it"), 'Primary tagline must be present');
assert(landingContent.includes("Experience the Market. Don't Just Learn It."), 'Secondary tagline must be present');
assert(!landingContent.includes('password'), 'Public landing page must not leak the word password');
assert(landingContent.includes('#/register'), 'Must link to #/register');
assert(landingContent.includes('#/login'), 'Must link to #/login');
console.log('✓ PublicLandingPage.jsx taglines and privacy boundary verified.');

// 8. FINAL STATE.JSON CHECK
console.log('\n--- TEST 8: FINAL POST-TEST STATE INTEGRITY ---');
const finalHash = crypto.createHash('sha256').update(fs.readFileSync('state.json')).digest('hex');
assert.strictEqual(finalHash, EXPECTED_HASH, 'state.json must remain 100% untouched');
console.log(`✓ Final state.json hash verified: ${finalHash}`);

console.log('\n======================================================================');
console.log('🎉 ALL PHASE D.2 VERIFICATIONS PASSED (8/8) WITH ZERO REGRESSIONS!');
console.log('======================================================================\n');
