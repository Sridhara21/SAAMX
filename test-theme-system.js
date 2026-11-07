/**
 * SAAMX 2.0 — Theme System & UI/UX Excellence Verification Suite
 * Verifies Light Theme as Primary Default, Dark Theme Alternative,
 * Token Completeness, Zero Flash Initialization, and Component Integration.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('============================================================');
console.log('🧪 SAAMX 2.0 — UI/UX THEME SYSTEM VERIFICATION SUITE');
console.log('============================================================\n');

// 1. Verify index.html Synchronous Head Script
console.log('--- TEST 1: ZERO-FLASH HEAD SCRIPT IN INDEX.HTML ---');
const indexHtmlPath = path.resolve('index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

assert(
  indexHtmlContent.includes("localStorage.getItem('saamx_theme') || 'light'"),
  'index.html head script must default to "light" theme'
);
assert(
  indexHtmlContent.includes("document.documentElement.setAttribute('data-theme'"),
  'index.html head script must set data-theme synchronously on document.documentElement'
);
console.log('✓ Verified index.html head script initializes data-theme="light" before first paint.\n');

// 2. Verify ThemeContext & Hook Contract
console.log('--- TEST 2: THEME CONTEXT CONTRACT & LIGHT-FIRST DEFAULT ---');
const themeContextPath = path.resolve('src/context/ThemeContext.jsx');
const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');

assert(
  themeContextContent.includes("saved === 'dark' ? 'dark' : 'light'"),
  'ThemeContext must strictly default to light unless saved === "dark"'
);
assert(
  themeContextContent.includes("document.documentElement.setAttribute('data-theme', theme)"),
  'ThemeContext must sync data-theme on document.documentElement'
);
assert(
  themeContextContent.includes("localStorage.setItem('saamx_theme', theme)"),
  'ThemeContext must persist theme in localStorage under key "saamx_theme"'
);
assert(
  themeContextContent.includes("saamx_theme_changed"),
  'ThemeContext must dispatch "saamx_theme_changed" event for non-react listeners'
);
console.log('✓ Verified ThemeContext guarantees light-first default, persistence, and event broadcasting.\n');

// 3. Verify CSS Tokens & Legacy Aliases in src/index.css
console.log('--- TEST 3: CSS TOKENS & LEGACY COMPATIBILITY ALIASES ---');
const indexCssPath = path.resolve('src/index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

// Required Light Tokens in :root
const requiredLightTokens = [
  '--color-paper: #F8F9FC',
  '--color-surface: #FFFFFF',
  '--color-brass: #2563EB',
  '--color-rise: #059669',
  '--color-fall: #DC2626',
  '--color-ink: #0F172A'
];
for (const token of requiredLightTokens) {
  assert(indexCssContent.includes(token), `Light token "${token}" missing from :root`);
}

// Required Legacy Aliases in :root
const requiredAliases = [
  '--card-bg: var(--color-surface)',
  '--border-soft: var(--color-border)',
  '--navy-900: var(--color-ink)',
  '--gold-royal: var(--color-gold)',
  '--green-emerald: var(--color-rise)',
  '--red-crimson: var(--color-fall)'
];
for (const alias of requiredAliases) {
  assert(indexCssContent.includes(alias), `Legacy alias "${alias}" missing from :root`);
}

// Required Dark Tokens in [data-theme="dark"]
assert(indexCssContent.includes('[data-theme="dark"]'), '[data-theme="dark"] block missing from index.css');
const requiredDarkTokens = [
  '--color-paper: #0B0F19',
  '--color-surface: #111827',
  '--color-surface-2: #1F2937',
  '--color-brass: #3B82F6',
  '--color-rise: #10B981',
  '--color-fall: #EF4444',
  '--color-ink: #F1F5F9'
];
for (const token of requiredDarkTokens) {
  assert(indexCssContent.includes(token), `Dark token "${token}" missing from [data-theme="dark"]`);
}

// Required Dark Component Overrides
assert(indexCssContent.includes('[data-theme="dark"] .fms-table th'), 'Dark table header styles missing');
assert(indexCssContent.includes('[data-theme="dark"] .input-field'), 'Dark input field styles missing');
assert(indexCssContent.includes('[data-theme="dark"] .badge-public'), 'Dark badge-public styles missing');
assert(indexCssContent.includes('[data-theme="dark"] .app-header'), 'Dark app-header styles missing');
console.log('✓ Verified Light Tokens, Legacy Aliases, and Dark Overrides in src/index.css.\n');

// 4. Verify Sidebar Theme Adaptations in Sidebar.css
console.log('--- TEST 4: SIDEBAR DUAL-THEME ARCHITECTURE ---');
const sidebarCssPath = path.resolve('src/components/Sidebar.css');
const sidebarCssContent = fs.readFileSync(sidebarCssPath, 'utf8');

assert(
  sidebarCssContent.includes(':root, [data-theme="light"]'),
  'Sidebar.css must contain explicit :root, [data-theme="light"] styling'
);
assert(
  sidebarCssContent.includes('[data-theme="dark"]'),
  'Sidebar.css must contain explicit [data-theme="dark"] styling'
);
assert(
  sidebarCssContent.includes('--sidebar-bg: #FFFFFF'),
  'Light theme sidebar must use crisp white/off-white surface'
);
assert(
  sidebarCssContent.includes('--sidebar-bg: linear-gradient(180deg, #070A0F 0%, #0B132B 65%, #0F172A 100%)'),
  'Dark theme sidebar must use obsidian/navy gradient surface'
);
console.log('✓ Verified Sidebar has dedicated styling for both Light and Dark themes.\n');

// 5. Verify Component Wiring (ThemeToggle in Header and Sidebar)
console.log('--- TEST 5: THEME TOGGLE INTEGRATION ---');
const appJsxPath = path.resolve('src/App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
const sidebarJsxPath = path.resolve('src/components/Sidebar.jsx');
const sidebarJsxContent = fs.readFileSync(sidebarJsxPath, 'utf8');

assert(
  appJsxContent.includes('<ThemeToggle />'),
  'App.jsx header must render <ThemeToggle />'
);
assert(
  sidebarJsxContent.includes('<ThemeToggle'),
  'Sidebar.jsx footer must render <ThemeToggle />'
);
console.log('✓ Verified ThemeToggle component is embedded in both App Header and Sidebar Footer.\n');

// 6. Verify Surface Adaptations in Key Modals
console.log('--- TEST 6: MODAL THEME-AWARE SURFACES ---');
const exchangePagePath = path.resolve('src/pages/ExchangePage.jsx');
const exchangePageContent = fs.readFileSync(exchangePagePath, 'utf8');
const modalPath = path.resolve('src/components/CompanyProfileModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// Ensure modals don't have hardcoded white cards
assert(
  !modalContent.includes("backgroundColor: '#FFFFFF'"),
  'CompanyProfileModal drawer must not have hardcoded backgroundColor: "#FFFFFF"'
);
assert(
  modalContent.includes("backgroundColor: 'var(--color-surface)'"),
  'CompanyProfileModal must use var(--color-surface)'
);

// Review modal in ExchangePage
assert(
  exchangePageContent.includes("PHYSICAL ORDER SLIP REVIEW"),
  'ExchangePage must contain Physical Order Slip Review modal'
);
assert(
  exchangePageContent.includes("backgroundColor: 'var(--color-surface)'"),
  'ExchangePage modals must use var(--color-surface)'
);
console.log('✓ Verified Modals and Drawers adapt to theme surfaces via var(--color-surface).\n');

console.log('============================================================');
console.log('✅ ALL UI/UX THEME SYSTEM TESTS PASSED SUCCESSFULLY (6/6)');
console.log('============================================================');
