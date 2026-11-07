/**
 * SAAMX — Phase 6.1 UI Foundation, Design System & Financial Primitives Verification Suite
 * Verifies design tokens, contrast ratios, tabular numerals, component contracts,
 * accessibility compliance, financial formatting, and state integrity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';

console.log('======================================================================');
console.log('🏛️ SAAMX — PHASE 6.1 SHARED UI FOUNDATION & DESIGN SYSTEM SUITE');
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

// 2. CSS TOKEN MATRIX VERIFICATION
console.log('--- TEST 2: CENTRALIZED CSS TOKEN MATRIX IN SRC/INDEX.CSS ---');
const indexCssPath = path.resolve('src/index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');

const requiredTokensInRoot = [
  '--color-paper: #F8F9FC',
  '--color-surface: #FFFFFF',
  '--color-surface-elevated: #FFFFFF',
  '--color-surface-sunken: #F1F3F8',
  '--color-ink-primary: #0F172A',
  '--color-ink-secondary: #475569',
  '--color-ink-muted: #94A3B8',
  '--color-border-subtle: #E2E8F0',
  '--color-border-strong: #CBD5E1',
  '--color-brass-primary: #2563EB',
  '--color-gain-text: #065F3E',
  '--color-gain-solid: #059669',
  '--color-loss-text: #931913',
  '--color-loss-solid: #DC2626',
  '--color-warn-text: #8A4B08',
  '--color-warn-solid: #D97706',
  '--color-info-text: #1E429F',
  '--color-info-solid: #2563EB'
];

for (const token of requiredTokensInRoot) {
  assert(indexCss.includes(token), `Light theme token "${token}" missing from :root in src/index.css`);
}
console.log('✓ All 18 required Phase 6.0 tokens present in :root (Light Theme default).');

const requiredTokensInDark = [
  '--color-paper: #0B0F19',
  '--color-surface: #111827',
  '--color-surface-elevated: #1F2937',
  '--color-surface-sunken: #070A10',
  '--color-ink-primary: #F1F5F9',
  '--color-ink-secondary: #94A3B8',
  '--color-border-subtle: #1F2937',
  '--color-border-strong: #374151',
  '--color-brass-primary: #3B82F6',
  '--color-gain-text: #34D399',
  '--color-gain-solid: #10B981',
  '--color-loss-text: #F87171',
  '--color-loss-solid: #EF4444',
  '--color-warn-text: #FBBF24',
  '--color-warn-solid: #F59E0B',
  '--color-info-text: #60A5FA',
  '--color-info-solid: #3B82F6'
];

for (const token of requiredTokensInDark) {
  assert(indexCss.includes(token), `Dark theme token "${token}" missing from [data-theme="dark"] in src/index.css`);
}
console.log('✓ All 17 required Phase 6.0 tokens present in [data-theme="dark"] (Dark Theme alt).\n');

// 3. WCAG 2.1 MATHEMATICAL CONTRAST MEASUREMENTS
console.log('--- TEST 3: WCAG 2.1 CONTRAST MEASUREMENTS ---');
function sRGBtoLin(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function hexToLuminance(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
  const r = sRGBtoLin(parseInt(hex.slice(0, 2), 16));
  const g = sRGBtoLin(parseInt(hex.slice(2, 4), 16));
  const b = sRGBtoLin(parseInt(hex.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const contrastChecks = [
  { name: 'Light Surface vs Primary Ink', c1: '#FFFFFF', c2: '#0F172A', min: 7.0 },
  { name: 'Light Surface vs Secondary Ink', c1: '#FFFFFF', c2: '#475569', min: 7.0 },
  { name: 'Light Surface vs Gain Text', c1: '#FFFFFF', c2: '#065F3E', min: 7.0 },
  { name: 'Light Surface vs Loss Text', c1: '#FFFFFF', c2: '#931913', min: 7.0 },
  { name: 'Light Surface vs Info Text', c1: '#FFFFFF', c2: '#1E429F', min: 7.0 },
  { name: 'Dark Surface vs Dark Primary Ink', c1: '#111827', c2: '#F1F5F9', min: 7.0 },
  { name: 'Dark Surface vs Dark Gain Text', c1: '#111827', c2: '#34D399', min: 7.0 },
  { name: 'Dark Surface vs Dark Loss Text', c1: '#111827', c2: '#F87171', min: 4.5 }
];

for (const check of contrastChecks) {
  const ratio = contrastRatio(check.c1, check.c2);
  assert(ratio >= check.min, `Contrast for ${check.name} failed: ${ratio.toFixed(2)}:1 < min ${check.min}:1`);
  console.log(`✓ ${check.name}: ${ratio.toFixed(2)}:1 (Meets target $\\ge$ ${check.min}:1)`);
}
console.log('✓ All measured high-priority text/surface contrast ratios exceed specifications.\n');

// 4. TABULAR NUMERALS & ACCESSIBILITY RULES
console.log('--- TEST 4: TABULAR NUMERALS & ACCESSIBILITY ENFORCEMENT ---');
assert(indexCss.includes('.tabular-nums, .tnum'), '.tabular-nums, .tnum utility class missing in src/index.css');
assert(indexCss.includes('font-feature-settings: "tnum" 1'), 'font-feature-settings: "tnum" 1 missing in src/index.css');
assert(indexCss.includes(':focus-visible'), ':focus-visible rule missing in src/index.css');
assert(indexCss.includes('prefers-reduced-motion'), 'prefers-reduced-motion media query missing in src/index.css');
console.log('✓ Verified tabular numerals enforcement, focus-visible indicators, and motion sensitivity.\n');

// 5. REUSABLE UI PRIMITIVES AUDIT
console.log('--- TEST 5: REUSABLE UI COMPONENT INVENTORY IN SRC/COMPONENTS/UI/ ---');
const expectedComponents = [
  'Button.jsx',
  'Input.jsx',
  'Card.jsx',
  'Badge.jsx',
  'Tabs.jsx',
  'Modal.jsx',
  'Table.jsx',
  'States.jsx',
  'FinancialFormatters.jsx',
  'Toast.jsx',
  'index.js'
];

for (const comp of expectedComponents) {
  const compPath = path.resolve(`src/components/ui/${comp}`);
  assert(fs.existsSync(compPath), `Expected primitive component file missing: src/components/ui/${comp}`);
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.length > 100, `Component file ${comp} is unexpectedly empty or truncated`);
}
console.log(`✓ Verified all ${expectedComponents.length} UI primitive component files created and populated.\n`);

// 6. FINANCIAL FORMATTING FUNCTIONS VERIFICATION
console.log('--- TEST 6: FINANCIAL FORMATTING UNIT CONTRACTS ---');
import {
  formatCurrency,
  formatPrice,
  formatDelta,
  formatQuantity
} from './src/lib/formatters.js';

// Currency tests
assert.strictEqual(formatCurrency(250000, 'INR', { showSymbol: true }), '₹2,50,000.00');
assert.strictEqual(formatCurrency(15000000, 'INR', { compact: true, showSymbol: true }), '₹1.50 Cr');
assert.strictEqual(formatCurrency(250000, 'INR', { compact: true, showSymbol: true }), '₹2.50 L');
assert.strictEqual(formatCurrency(100.5, 'USD', { showSymbol: true }), '$100.50');
console.log('✓ formatCurrency correctly handles INR Indian-numbering (L/Cr) and ISO currency.');

// Price tests
assert.strictEqual(formatPrice(170.04), '170.04');
assert.strictEqual(formatPrice(100), '100.00');
assert.strictEqual(formatPrice('invalid'), '—');
console.log('✓ formatPrice formats numbers to fixed decimals and handles invalid values.');

// Delta tests (Colorblind redundancy)
const gainDelta = formatDelta(4.25);
assert.strictEqual(gainDelta.direction, 'gain');
assert.strictEqual(gainDelta.arrow, '▲');
assert.strictEqual(gainDelta.text, '+4.25%');

const lossDelta = formatDelta(-2.8);
assert.strictEqual(lossDelta.direction, 'loss');
assert.strictEqual(lossDelta.arrow, '▼');
assert.strictEqual(lossDelta.text, '-2.80%');

const neutralDelta = formatDelta(0);
assert.strictEqual(neutralDelta.direction, 'neutral');
assert.strictEqual(neutralDelta.arrow, '—');
assert.strictEqual(neutralDelta.text, '0.00%');
console.log('✓ formatDelta strictly pairs directional symbols (▲, ▼, —) with numbers (never color alone).');

// Quantity tests
assert.strictEqual(formatQuantity(50000), '50,000');
console.log('✓ formatQuantity formats share quantities with integer locale formatting.\n');

// 7. BARREL EXPORT INTEGRITY
console.log('--- TEST 7: BARREL EXPORT VERIFICATION IN SRC/COMPONENTS/UI/INDEX.JS ---');
const indexPath = path.resolve('src/components/ui/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const requiredExports = [
  'Button',
  'IconButton',
  'Input',
  'SearchInput',
  'Select',
  'Card',
  'CardHeader',
  'Badge',
  'OrderStatusBadge',
  'StationBadge',
  'Tabs',
  'TabList',
  'TabTrigger',
  'TabContent',
  'Modal',
  'Table',
  'FinancialCell',
  'DataTable',
  'Spinner',
  'Skeleton',
  'EmptyState',
  'Alert',
  'ErrorBoundaryState',
  'CurrencyDisplay',
  'PriceDisplay',
  'DeltaBadge',
  'QuantityDisplay',
  'Toast',
  'ToastContainer'
];

for (const exp of requiredExports) {
  assert(indexContent.includes(exp), `Export "${exp}" missing from src/components/ui/index.js`);
}
console.log(`✓ Verified all ${requiredExports.length} required primitives exported from central barrel index.\n`);

// 8. FINAL STATE INTEGRITY CONFIRMATION
console.log('--- TEST 8: FINAL POST-TEST STATE HASH RE-VERIFICATION ---');
const postTestBuffer = fs.readFileSync(statePath);
const postTestHash = crypto.createHash('sha256').update(postTestBuffer).digest('hex');
assert.strictEqual(postTestHash, EXPECTED_HASH, 'state.json was altered during test execution!');
console.log(`✓ Confirmed state.json SHA-256 remains 100% untouched: ${postTestHash}\n`);

console.log('======================================================================');
console.log('🎉 ALL 8 UI FOUNDATION & DESIGN SYSTEM VERIFICATIONS PASSED (8/8)!');
console.log('======================================================================');
