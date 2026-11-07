# SAAMX Phase 11: Release Changelog

**Release Version:** `v1.11.0-phase11-release`  
**Release Date:** 2026-10-21  
**Authoritative Hash Invariant:** `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c` (100% UNTOUCHED)  

---

## 1. Overview of Release Changes

Phase 11 delivers comprehensive architectural hardening, full-stack browser QA automation, UI/UX workflow modernization, and bundle size reduction for the SAAMX simulation platform.

---

## 2. Detailed File Modifications

### `server.js`
- **Scrypt Password Verification (`verifyTeamPassword`):** Added scrypt cryptographic hash verification (`verifyPassword()`) against `team.passwordHash` and `team.credentials?.passwordHash`. Teams registering with custom passwords can now authenticate reliably.
- **Pending Registration Status Handling (`POST /api/auth/login`):** Enhanced login endpoint to search `state.investmentHouses`. Unapproved registered teams receive structured HTTP 403 responses containing `isPendingVerification: true`, `teamCode`, and `assignedDesk`, replacing ambiguous HTTP 401 errors.
- **Delegate-Level Authentication (`POST /api/auth/login`):** Added support for matching individual delegates by member name or delegate ID across team rosters. Sessions for delegates are tagged with both team ID and delegate name.
- **Order Endpoint Aliases & Auto-Ticketing (`POST /api/order/create`):** Added support for `direction` and `side` aliases for `action`, and auto-generated unique `effectiveTicket` when omitted by clients.
- **Unified Portfolio Endpoint (`GET/POST /api/portfolio`):** Unified portfolio response structure returning `{ success: true, team, holdings: team.holdings, portfolio: team }`.
- **Dynamic Event Clock Configuration (`POST /api/admin/timer-config`):** Created administrative endpoint to configure `durationMinutes`, `timerMode` (`COUNTDOWN` vs `SCHEDULE_SYNC`), and timetable synchronization parameters.
- **Configurable Market Start Duration (`POST /api/admin/start-market`):** Updated market start handler to accept custom `durationMinutes` parameter and configure `marketState.simulationDurationMinutes`.
- **Toggle Team Status Resilience (`POST /api/admin/team/toggle-status`):** Updated route handler to accept either `teamCode` or `teamId`.
- **Windows Atomic File Write Resilience (`saveState`):** Implemented exponential backoff retry loop (up to 5 attempts with 30ms random jitter) around `fs.renameSync()`, preventing Windows `EPERM` file-locking errors during rapid concurrent mutations.

### `src/App.jsx`
- **Granular Route-Level Code Splitting:** Replaced monolithic eager imports of 22 desk pages with dynamic `React.lazy()` imports wrapped in `<Suspense>` with a custom `PageLoadingFallback` indicator.
- **Shadowed Route Unlocking:** Re-routed `#/personnel` and `#/personnel-management` to render `<PersonnelManagementPage>`, restoring the 1,637-line staff credentials and RBAC management console.
- **Removed Orphaned `setAuthError` Reference:** Eliminated undefined `setAuthError('')` call in `handleHashChange`, fixing runtime `ReferenceError` during route navigation.
- **Firebase Imports Hardening:** Added missing `set` import from `./lib/firebase.js` utilized during active coordinator heartbeat broadcasts.
- **False Alert Banner Suppression:** Suppressed false "Coordinator Offline" warning banners on local LAN servers when connected via WebSocket (`!dbConnected`).

### `src/pages/ProjectorPage.jsx`
- **Keyed Leaderboard Normalization:** Normalized `state.leaderboard` (stored as an object dictionary in `state.json`) using `useMemo` into a rank-sorted array, resolving fatal runtime crash `TypeError: K.slice is not a function`.
- **Dual IST Clock & Schedule Telemetry:** Added dual header clock displaying both Indian Standard Time (`Asia/Kolkata`) and remaining session countdown, synchronized with `SCHEDULE_SYNC` and `COUNTDOWN` modes.

### `src/pages/LoginPage.jsx`
- **Portal Mode Tabs:** Added segmented toggle (`Participant Station` vs `Staff & Officials`) for clear user role orientation.
- **Pending Registration Guidance Card:** Added amber callout card displaying assigned desk intake station and credential verification instructions when unapproved teams attempt login.
- **Direct Link to Registration:** Added explicit "Register Investment House →" link pointing to `#/register`.
- **Strict Accessibility Compliance:** Preserved all IDs (`#login-username`, `#login-password`, `button[type="submit"]`), classes, and theme toggling capabilities.

### `src/pages/RegistrationPage.jsx`
- **Direct Terminal Sign-In Action:** Added a high-contrast `Proceed to Terminal Sign In →` button on the Step 5 confirmation pass directly routing users to `#/login`.
- **JSX Tag Balancing:** Corrected button container wrapper tags to fix transformation errors during Vite production builds.

### `src/pages/AdminPage.jsx`
- **Event Clock Header Action:** Added `⏱️ TIMER CONFIG` button to the primary administrative top bar.
- **Event Clock & Duration Modal:** Added modal with quick duration presets (`60m`, `120m`, `300m`, `360m`), custom minute input validation, and dual-mode operation selection (`SCHEDULE_SYNC` vs `COUNTDOWN`).

### `src/pages/SebiPage.jsx`
- **Missing Icon Import Fixed:** Added missing `IconClock` import from `../lib/icons.jsx` used in the staged market intervention timeline.

### `src/pages/ParticipantTerminal.jsx`
- **Derived FX Rates:** Extracted `usdRate`, `gbpRate`, and `eurRate` from `fxRates`, restoring dual-currency valuations and buy commitments without runtime reference errors.

### `scripts/phase11_e2e_verification.js`
- **Comprehensive E2E Chrome CDP Verification Suite:** Built end-to-end test runner executing in headless Chrome CDP across all 22 routes, testing registration intake, multi-tier authentication, schedule sync, and Windows file-locking concurrency.

### `scripts/test_phase11_multiclient_e2e.js`
- **Multi-Client 7-Role E2E Verification Suite:** Built advanced multi-client headless browser and API integration test verifying 7 concurrent client roles, privacy boundaries, delegate authentication, 5-desk physical trading workflow, dual timer modes, and 10-order parallel mutex serialization.

---

## 3. Metrics & Verification Results

- **Bundle Reduction:** Entry JS chunk reduced from 1,435.46 kB to 274.48 kB (**80.9% reduction**).
- **Automated Regression Suite Results:** 221 / 221 assertions passed across 8 comprehensive suites (100% pass rate).
- **Authoritative Hash Check:** SHA-256 `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c` verified untouched.
