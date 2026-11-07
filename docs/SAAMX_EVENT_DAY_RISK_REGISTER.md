# SAAMX — Live Event-Day Risk Register (Phase 5)

**Document Version:** 1.0.0  
**Phase:** 5 — Comprehensive Event-Readiness Audit  
**Date:** 2026-10-13  
**Auditor & Risk Officer:** SAAMX Lead Coding Agent  
**Event Scope:** 20 Investment Houses (100–120 Concurrent Devices)  

---

## 1. Risk Evaluation Framework

Risks are categorized into four standardized severity tiers based on event impact:

- 🔴 **CRITICAL:** Potential unauthorized super-admin access, material financial ledger corruption, unrecoverable crash, or total simulation stoppage. **Blocks live event.**
- 🟠 **HIGH:** Major operational workflow breakdown, duplicate order execution, desynchronized projector display, or high-concurrency event loop stalls. **Conditionally blocks event without mitigation.**
- 🟡 **MEDIUM:** Degraded usability, confusing error messages, localized display lag, recoverable network interruption, or administrative inconvenience. **Requires operational workarounds.**
- 🟢 **LOW:** Minor cosmetic flaws, non-blocking UI quirks, or developer documentation inconsistencies. **Does not disrupt live event.**

---

## 2. Comprehensive Risk Register

```mermaid
quadrantChart
    title SAAMX Event-Day Risk Matrix (Likelihood vs Impact)
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 Immediate Priority (Blockers)
    quadrant-2 High Vigilance (Plan Contigencies)
    quadrant-3 Low Concern
    quadrant-4 Quality Improvements
    "RSK-01 Hardcoded Passwords": [0.65, 0.95]
    "RSK-02 SPA API 404 Masking": [0.85, 0.75]
    "RSK-03 Duplicate Phoenix Act Route": [0.70, 0.85]
    "RSK-04 Synchronous 4.7MB Disk I/O": [0.80, 0.70]
    "RSK-05 Dual Backend Client Fallback": [0.55, 0.80]
    "RSK-06 Missing Execution Rollback": [0.30, 0.85]
    "RSK-07 Table DOM Overhead (2,062 Rows)": [0.75, 0.55]
    "RSK-08 In-Memory Mutex Missing TTL": [0.25, 0.70]
    "RSK-09 Monolithic AdminPage (202 KB)": [0.60, 0.45]
    "RSK-10 Unregistered Network Disconnections": [0.50, 0.40]
```

---

### 🔴 CRITICAL RISKS (Event Blockers)

#### RSK-01: Hardcoded Master & Role Fallback Passwords in Server Code
- **Severity:** 🔴 CRITICAL | **Likelihood:** HIGH | **Impact:** CRITICAL
- **Event Blocker:** **YES**
- **Description & Evidence:** In `server.js` lines 16–17 and 1236–1266, static fallback passwords (`MASTER_PASSWORD = '21112009'`, `PASSWORD_SECRET = 'fms-event-2026'`, and role strings like `exchange-event-2026`, `advisor-event-2026`) are hardcoded into the authentication logic. Any student or visitor with knowledge of legacy passwords or repository access can bypass the authoritative `state.personnel` directory, authenticate as Floor Director or any desk operator, and manipulate market data or balances.
- **Affected Endpoints & Roles:** `POST /api/auth/login`, all roles (`admin`, `super_admin`, `operator_x`, `advisor`, `sebi`).
- **Recommended Mitigation:** Remove all static fallback passwords from `server.js`. Enforce authentication strictly against salted `scrypt` password hashes stored in `state.personnel` and `state.teams`.
- **Dependencies:** None.
- **Verification Test:** Create automated adversarial login test ensuring static legacy passwords return HTTP 401.

---

#### RSK-02: SPA Catch-All Masking Unhandled API Routes (HTML Returned for 404s)
- **Severity:** 🔴 CRITICAL | **Likelihood:** HIGH | **Impact:** HIGH
- **Event Blocker:** **YES**
- **Description & Evidence:** In `server.js` line 8490, `app.get('*', ...)` serves `dist/index.html` for any unmatched GET path without verifying whether the request begins with `/api`. If a client calls an unregistered or misspelled API endpoint, the server returns HTTP 200 with HTML content. When client code calls `await res.json()`, it throws `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`, crashing React component lifecycles.
- **Affected Endpoints & Roles:** All client-side API integrations; affects all user roles.
- **Recommended Mitigation:** Insert an explicit `/api/*` handler before line 8490 returning HTTP 404 JSON: `res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl })`.
- **Dependencies:** None.
- **Verification Test:** Automated test sending GET to `/api/nonexistent-route` asserting status 404 and `content-type: application/json`.

---

#### RSK-03: Duplicate Route Shadows Project Phoenix Projector Takeover Events
- **Severity:** 🔴 CRITICAL | **Likelihood:** HIGH | **Impact:** HIGH
- **Event Blocker:** **YES**
- **Description & Evidence:** In `server.js`, `POST /api/admin/phoenix-act` is registered at Line 6482 and again at Line 7885. Line 6482 handles a generic news flash and terminates the response. Line 7885 handles full `executePhoenixAct()` containing 8-second projector takeover countdowns and market halts. Because Line 6482 is registered first, Line 7885 is never reached, preventing automated projector takeovers from triggering during simulation acts.
- **Affected Endpoints & Roles:** `POST /api/admin/phoenix-act`, Journalist and Floor Director roles, Auditorium Projector.
- **Recommended Mitigation:** Delete the duplicate definition at Line 6482; route all act execution through Line 7885 (`executePhoenixAct()`).
- **Dependencies:** Projector display testing.
- **Verification Test:** Trigger Act 1 and Act 7; verify projector receives `takeoverEvent` in WebSocket payload.

---

### 🟠 HIGH RISKS (Conditionally Blocking)

#### RSK-04: Synchronous `saveState()` Disk Writes Blocking Node.js Event Loop
- **Severity:** 🟠 HIGH | **Likelihood:** HIGH | **Impact:** HIGH
- **Event Blocker:** Conditionally Blocking under 100+ concurrent devices.
- **Description & Evidence:** In `server.js` line 827, `saveState()` performs `fs.writeFileSync()` of the 4.7 MB `state.json` synchronously on every order submission, claim, execution, and news dispatch. Synchronous I/O of 4.7 MB blocks the single-threaded Node.js event loop for 15–35ms. Under 100 concurrent clients submitting requests, this causes CPU queue buildup, delaying WebSocket delta broadcasts and making the UI feel sluggish.
- **Affected Endpoints & Roles:** All mutating endpoints (`/api/order/*`, `/api/fx/*`, `/api/news`).
- **Recommended Mitigation:** Introduce a 100ms asynchronous write debouncer for non-critical mutations, or use asynchronous `fs.promises.writeFile` with atomic temporary file renaming.
- **Dependencies:** Persistence engine.
- **Verification Test:** Concurrency load test dispatching 50 orders in 2 seconds; measure event loop delay using `perf_hooks`.

---

#### RSK-05: Dual-Backend Client Fallback in `src/lib/api.js` Causing Split-Brain Risk
- **Severity:** 🟠 HIGH | **Likelihood:** MEDIUM | **Impact:** HIGH
- **Event Blocker:** Conditionally Blocking.
- **Description & Evidence:** `src/lib/api.js` lines 340–4133 contains 3,800 lines of client-side in-browser mock simulation logic. If `server.js` returns a network error or 404, `apiFetch` falls back to executing mutations locally and writing to Firebase Realtime Database. During live floor operations, this can cause a split-brain state where some laptops update the local server while others update remote Firebase.
- **Affected Endpoints & Roles:** All client actions in `ExchangePage.jsx`, `AdminPage.jsx`, `ParticipantTerminal.jsx`.
- **Recommended Mitigation:** Disable the in-browser mock fallback in production builds. If `server.js` is unreachable, return a clear network error rather than executing local mutations.
- **Dependencies:** Frontend build configuration.
- **Verification Test:** Simulate server downtime; verify client displays connection error banner instead of mutating Firebase.

---

#### RSK-06: Missing Transaction Rollback on Order Execution Failure
- **Severity:** 🟠 HIGH | **Likelihood:** LOW | **Impact:** HIGH
- **Event Blocker:** NO (Recoverable via snapshot restore).
- **Description & Evidence:** In `server.js` line 5278 (`actionType === 'EXECUTE'`), team cash balance is debited and security float is adjusted before order status and transaction records are finalized. If an unexpected JavaScript exception throws mid-execution, cash is debited without marking the order as executed.
- **Affected Endpoints & Roles:** `POST /api/order/action`, Exchange Clerks, Team Ledgers.
- **Recommended Mitigation:** Wrap order execution mutations in a rollback state snapshot. If an error throws, restore the team wallet and security float before returning HTTP 500.
- **Dependencies:** Order execution logic.
- **Verification Test:** Unit test throwing an error after cash debit; verify cash balance rolls back to initial value.

---

### 🟡 MEDIUM RISKS (Operational Degradation)

#### RSK-07: Table DOM Overhead for 2,062 Securities on Low-End Laptops
- **Severity:** 🟡 MEDIUM | **Likelihood:** HIGH | **Impact:** MEDIUM
- **Event Blocker:** NO
- **Description & Evidence:** In `MarketWatchPage.jsx` and `MarketOverviewIntelligenceSection.jsx`, filtering or sorting 2,062 securities renders over 2,000 DOM table rows simultaneously without virtualization. On entry-level student Chromebooks or budget laptops, this causes 2–3 second UI freezes during search keystrokes.
- **Affected Pages:** `MarketWatchPage.jsx`, `ParticipantTerminal.jsx`.
- **Recommended Mitigation:** Implement windowed/virtual scrolling (`react-window` or pagination) rendering only the visible 25–50 rows.
- **Dependencies:** Frontend component refactoring.
- **Verification Test:** Search benchmark rendering 2,062 rows on simulated 4x CPU throttle in Chrome DevTools.

---

#### RSK-08: In-Memory Mutex (`activeOrderLocks`) Lacking TTL Expiration
- **Severity:** 🟡 MEDIUM | **Likelihood:** LOW | **Impact:** MEDIUM
- **Event Blocker:** NO
- **Description & Evidence:** In `server.js`, `activeOrderLocks` locks an order ID during async operations. If an unhandled promise rejection or process crash occurs outside the finally block, the order ID remains in the map indefinitely, preventing future claims until server restart.
- **Affected Endpoints:** `POST /api/order/claim`, `POST /api/order/action`.
- **Recommended Mitigation:** Add a 15-second TTL timeout to mutex entries, automatically releasing expired locks.
- **Dependencies:** Concurrency engine.
- **Verification Test:** Simulate a hung lock; verify timeout releases lock after 15 seconds.

---

#### RSK-09: Monolithic `AdminPage.jsx` (202 KB, 3,762 Lines)
- **Severity:** 🟡 MEDIUM | **Likelihood:** HIGH | **Impact:** LOW
- **Event Blocker:** NO
- **Description & Evidence:** `AdminPage.jsx` is excessively large (3,762 lines), embedding all tabs directly within one file. Any state change in the overview tab triggers re-rendering of all administrative sub-panels.
- **Affected Pages:** `AdminPage.jsx`.
- **Recommended Mitigation:** Refactor into 5 modular tab components in `src/pages/admin/`.
- **Dependencies:** Admin page rebuild.
- **Verification Test:** Clean Vite production build with decomposed components.

---

### 🟢 LOW RISKS (Cosmetic & Maintenance)

#### RSK-10: Inline Styles Overriding Design Tokens
- **Severity:** 🟢 LOW | **Likelihood:** HIGH | **Impact:** LOW
- **Event Blocker:** NO
- **Description & Evidence:** Multiple pages (`CurrencyExchangePage.jsx`, `SebiPage.jsx`) still contain hundreds of inline style objects with hardcoded colors (`#1e293b`, `rgba(0,0,0,0.4)`), resulting in minor contrast inconsistencies when toggling between Light and Dark themes.
- **Recommended Mitigation:** Replace inline color definitions with SAAMX CSS variables (`var(--color-surface)`, `var(--color-ink)`).
- **Dependencies:** UI/UX cleanup.

---

## 3. Risk Mitigation Action Plan

| Risk ID | Action | Phase Scheduled | Responsible Role | Verification Method |
|:---|:---|:---:|:---:|:---|
| **RSK-01** | Remove static master and fallback passwords from `server.js` | Phase 7 (Backend Hardening) | Security Engineer | `test-security-adversarial.js` |
| **RSK-02** | Add `/api/*` JSON 404 handler before SPA catch-all | Phase 7 (Backend Hardening) | Backend Lead | `curl http://localhost:3000/api/unknown` |
| **RSK-03** | Remove duplicate Line 6482 `phoenix-act` route | Phase 7 (Backend Hardening) | Backend Lead | Projector takeover test |
| **RSK-04** | Implement debounced asynchronous state persistence | Phase 7 (Backend Hardening) | Performance Engineer | `test-scalability-120-devices.js` |
| **RSK-05** | Disable client-side mock fallback in production | Phase 6 (Frontend Cleanup) | Frontend Lead | Simulated offline test |
| **RSK-06** | Add execution state rollback wrapper | Phase 7 (Backend Hardening) | Full-Stack Lead | Ledger failure test |
| **RSK-07** | Virtualize securities explorer tables | Phase 6 (Frontend Rebuild) | Frontend Lead | Chrome DevTools 4x throttle |
| **RSK-08** | Add 15-second TTL timeout to `activeOrderLocks` | Phase 7 (Backend Hardening) | Concurrency Lead | Mutex stress test |
| **RSK-09** | Decompose `AdminPage.jsx` into 5 tab components | Phase 6 (Frontend Rebuild) | Frontend Lead | Production bundle analysis |
| **RSK-10** | Harmonize inline styles to design tokens | Phase 6 (Frontend Rebuild) | UI/UX Designer | Theme system test |
