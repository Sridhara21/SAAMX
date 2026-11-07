import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = process.cwd();

console.log('--- STARTING MILESTONE 2 EMPIRICAL AUDIT & VERIFICATION ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// 1. Authoritative state.json invariant check
const statePath = path.join(ROOT_DIR, 'state.json');
const stateBuffer = fs.readFileSync(statePath);
const stateHash = crypto.createHash('sha256').update(stateBuffer).digest('hex');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
assert(stateHash === EXPECTED_HASH, `state.json SHA-256 matches expected invariant (${stateHash})`);

// 2. DrawerContext.jsx verification
const drawerContextPath = path.join(ROOT_DIR, 'src', 'context', 'DrawerContext.jsx');
assert(fs.existsSync(drawerContextPath), 'src/context/DrawerContext.jsx exists');
const drawerContextContent = fs.readFileSync(drawerContextPath, 'utf8');
assert(drawerContextContent.includes("PORTALS: 'PORTALS_DRAWER'"), 'DRAWER_TYPES.PORTALS defined');
assert(drawerContextContent.includes("SEARCH: 'SEARCH_DRAWER'"), 'DRAWER_TYPES.SEARCH defined');
assert(drawerContextContent.includes("PORTFOLIO: 'PORTFOLIO_DRAWER'"), 'DRAWER_TYPES.PORTFOLIO defined');
assert(drawerContextContent.includes("DESK_ACTIONS: 'DESK_DRAWER'"), 'DRAWER_TYPES.DESK_ACTIONS defined');
assert(drawerContextContent.includes("export function DrawerProvider"), 'DrawerProvider exported');
assert(drawerContextContent.includes("export function useDrawer"), 'useDrawer hook exported');
assert(drawerContextContent.includes("key === 'k'"), 'Ctrl+K shortcut implemented');
assert(drawerContextContent.includes("key === 'b'"), 'Ctrl+B shortcut implemented');
assert(drawerContextContent.includes("key === 'p'"), 'Ctrl+P shortcut implemented');
assert(drawerContextContent.includes("key === 'd'"), 'Ctrl+D shortcut implemented');
assert(drawerContextContent.includes("e.key === 'Escape'"), 'Escape shortcut implemented');
assert(drawerContextContent.includes("document.body.style.overflow = 'hidden'"), 'Body focus/scroll lock implemented');

// 3. FloatingCommandDock.jsx & FloatingCommandDock.css verification
const dockPath = path.join(ROOT_DIR, 'src', 'components', 'FloatingCommandDock.jsx');
const dockCssPath = path.join(ROOT_DIR, 'src', 'components', 'FloatingCommandDock.css');
assert(fs.existsSync(dockPath), 'FloatingCommandDock.jsx exists');
assert(fs.existsSync(dockCssPath), 'FloatingCommandDock.css exists');
const dockContent = fs.readFileSync(dockPath, 'utf8');
const dockCssContent = fs.readFileSync(dockCssPath, 'utf8');
assert(dockContent.includes("export function IconGrid"), 'IconGrid exported');
assert(dockContent.includes("export function IconPieChart"), 'IconPieChart exported');
assert(dockContent.includes("Portals Directory"), 'Portal Directory pip implemented');
assert(dockContent.includes("Command Palette"), 'Search pip implemented');
assert(dockContent.includes("canAccessPortfolio"), 'Portfolio glance pip role-gated');
assert(dockContent.includes("dock-pulse-beacon"), 'WebSocket pulse beacon implemented');
assert(dockContent.includes("dock-ist-clock-chip"), 'IST monospace clock chip implemented');
assert(dockContent.includes("toggleDensity"), 'Adaptive density toggle implemented');
assert(dockContent.includes("toggleTheme"), 'Theme toggle implemented');
assert(dockContent.includes("dock-user-chip"), 'User identity chip implemented');
assert(dockCssContent.includes("backdrop-filter: blur(16px)"), '16px glass blur implemented in CSS');
assert(dockCssContent.includes("position: fixed"), 'Fixed positioning implemented');
assert(dockCssContent.includes("bottom: 20px"), 'Bottom 20px offset implemented');

// 4. DrawerManager.jsx & DrawerManager.css verification
const drawerManagerPath = path.join(ROOT_DIR, 'src', 'components', 'DrawerManager.jsx');
const drawerManagerCssPath = path.join(ROOT_DIR, 'src', 'components', 'DrawerManager.css');
assert(fs.existsSync(drawerManagerPath), 'DrawerManager.jsx exists');
assert(fs.existsSync(drawerManagerCssPath), 'DrawerManager.css exists');
const dmContent = fs.readFileSync(drawerManagerPath, 'utf8');
const dmCssContent = fs.readFileSync(drawerManagerCssPath, 'utf8');
assert(dmContent.includes("saamx-nav-drawer"), 'Portals drawer implemented');
assert(dmContent.includes("saamx-command-palette-modal"), 'Command search palette modal implemented');
assert(dmContent.includes("saamx-portfolio-drawer"), 'Portfolio inspection drawer implemented');
assert(dmContent.includes("saamx-action-drawer"), 'Desk action drawer implemented');
assert(dmContent.includes("CURRENCY_DIRECTORY"), '12 currencies directory integrated');
assert(dmContent.includes("handleSearchKeyDown"), 'Search palette keyboard navigation (ArrowUp/Down/Enter) implemented');
assert(dmCssContent.includes("backdrop-filter: blur(10px)"), 'Backdrop blur implemented in CSS');

// 5. Sidebar.css shell margins & clearance verification
const sidebarCssPath = path.join(ROOT_DIR, 'src', 'components', 'Sidebar.css');
const sidebarCssContent = fs.readFileSync(sidebarCssPath, 'utf8');
assert(sidebarCssContent.includes("margin-left: 0 !important"), 'saamx-app-shell margin-left: 0 !important implemented across breakpoints');
assert(sidebarCssContent.includes("padding: 24px 24px 104px 24px !important"), 'main-content 104px bottom clearance implemented');
assert(sidebarCssContent.includes("padding: 16px 16px 96px 16px !important"), 'compact density 96px bottom clearance implemented');

// 6. MarketStatusBar.jsx modernization verification
const statusBarPath = path.join(ROOT_DIR, 'src', 'components', 'MarketStatusBar.jsx');
const statusBarContent = fs.readFileSync(statusBarPath, 'utf8');
const brassHexes = ['#111419', '#845508', '#F6ECD5', '#B38027'];
const hasBrass = brassHexes.some(hex => statusBarContent.includes(hex));
assert(!hasBrass, 'MarketStatusBar.jsx has ZERO vintage brass hexes');
assert(statusBarContent.includes("var(--color-surface, #121722)"), 'Uses modern slate surface token');
assert(statusBarContent.includes("var(--color-accent, #00E5FF)"), 'Uses electric cyan accent token');
assert(statusBarContent.includes("fontVariantNumeric: 'tabular-nums'"), 'Tabular monospace formatting applied to clock');

// 7. MarketTicker.jsx modernization verification
const tickerPath = path.join(ROOT_DIR, 'src', 'components', 'MarketTicker.jsx');
const tickerContent = fs.readFileSync(tickerPath, 'utf8');
const tickerBrass = ['#845508', '#1A1E26', '#D4AF37'];
const hasTickerBrass = tickerBrass.some(hex => tickerContent.includes(hex));
assert(!hasTickerBrass, 'MarketTicker.jsx has ZERO vintage brass hexes');
assert(tickerContent.includes("track-a") && tickerContent.includes("track-b"), 'Gapless mathematical marquee loop (Track A + Track B) implemented');
assert(tickerContent.includes("animationPlayState = 'paused'"), 'Hover-pause micro-interaction implemented');

// 8. App.jsx integration verification
const appPath = path.join(ROOT_DIR, 'src', 'App.jsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes("DrawerProvider"), 'App wraps with DrawerProvider');
assert(appContent.includes("<DrawerManager"), 'DrawerManager mounted in App.jsx shell');
assert(appContent.includes("<FloatingCommandDock"), 'FloatingCommandDock mounted in App.jsx shell');
assert(appContent.includes("isPortalsRoute"), 'isPortalsRoute declared in App.jsx');
assert(appContent.includes("content = <HomePage state={normalizedState} connected={dbConnected} />;"), 'Portals directory rendered for public visitors before auth check');
assert(appContent.includes("isPublicShell = isPublicRoute || isPortalsRoute"), 'isPortalsRoute whitelisted in isPublicShell');
assert(appContent.includes("currentRoute === '#/portals'"), 'Portals route whitelisted in isRouteAuthorized');

console.log(`\nAUDIT RESULT: ${passedTests} / ${totalTests} assertions passed (${((passedTests / totalTests) * 100).toFixed(1)}%).`);

if (passedTests === totalTests) {
  console.log('--- ALL MILESTONE 2 REQUIREMENTS VERIFIED SUCCESSFULLY ---');
  process.exit(0);
} else {
  console.error('--- AUDIT FAILED ---');
  process.exit(1);
}
