# Project: SAAMX '26 Final Pre-Deployment Audit & Stabilization

## Architecture
- **Objective**: Establish a rock-solid, verified local release baseline for SAAMX '26 prior to cloud deployment (Firebase Hosting, Railway API, Supabase PostgreSQL, Firebase RTDB).
- **Core Principles**:
  - Audit and stabilization — NOT a redesign or rewrite.
  - Strict preservation of the Premium Light Glassmorphism design and working features.
  - Absolute preservation of authoritative `state.json` SHA-256 baseline: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c` (100% BIT-IDENTICAL).
  - Fix only verified defects with empirical proof.
- **Subsystem Landscape**:
  - 26 Hash Routes in `src/App.jsx` and `src/lib/navigationConfig.js`.
  - 14 Subsystems across 102 core interactive controls.
  - 2,849 Securities Universe across 10 currencies + 5 staged IPOs.
  - Two-Phase Physical Bank Settlement (`TWO_PHASE_BANK`).
  - Scrypt authentication, HMAC SHA-256 session tokens, 40 RBAC permissions across 11 groups.
  - Dual Persistence: PostgreSQL 15 with row locks (`SELECT FOR UPDATE`) + Standalone mutex fallback with atomic `state.json.tmp` renames and deep snapshot rollbacks.

---

## Feature Inventory
Every feature and inspection area from the survey phase is mapped below with an assigned milestone:

| # | Feature / Area | Description | Milestone | Source |
|---|----------------|-------------|-----------|--------|
| 1 | Baseline Verification | Git status, commit `24edcf8...`, state.json hash verification, preservation of 40 modified and untracked files | M1 | Survey (Baseline) |
| 2 | Production Build | Clean Vite build (`npm run build`), bundle size checks, 0 errors | M1 | Survey (Baseline) |
| 3 | Market Chart Engine | Geometric & mathematical curve generation in `chartTimeframeEngine.js`, `lastPrice === currentPrice` invariant | M1 | Survey (Charts) |
| 4 | Chart Data Authenticity & Labels | Explicit "Simulated" / "Illustrative" provenance labels for synthetic timeframes (`1W`, `1M`, `3M`, `1Y`) | M1 | Survey (Charts) |
| 5 | Chart Live Badge Transparency | Condition pulsing green "Live" badge in `InteractiveMarketChart.jsx` to only appear on live intraday data | M1 | Survey (Charts) |
| 6 | Dynamic 3M Chart Axis | Replace hardcoded `['Aug', 'Sep', 'Oct']` in `chartTimeframeEngine.js` with dynamic calendar month derivation | M1 | Survey (Charts) |
| 7 | Benchmark Index Label Harmonization | Resolve "NIFTY 50" card in `MarketOverviewIntelligenceSection.jsx` binding to `marketIndices.INDIA50` (5,000) vs real benchmark | M1 | Survey (Charts) |
| 8 | Chart Test Suite Expansion | Expand `test-market-chart-timeframes.js` for real tick downsampling and zero-price/flat-day edge cases | M1 | Survey (Charts) |
| 9 | Trading & Order Submission | Market-orders-only enforcement, PIN verification, duplicate ticket prevention, queue routing | M2 | Survey (Workflows) |
| 10 | Merged Exchange Clearance | Mutex order locking, illegal state transition guards, atomic `BNK-PAY` / `BNK-REC` voucher generation | M2 | Survey (Workflows) |
| 11 | Two-Phase Bank Settlement | Teller RBAC, duplicate settlement rejection (HTTP 409), atomic double-entry, voucher rejection rollback | M2 | Survey (Workflows) |
| 12 | Foreign Exchange (FX) Counter | 10 currencies, JPY/KRW integer precision, bid/ask spreads, triangular conversion, double-spend mutex | M2 | Survey (Workflows) |
| 13 | IPO Primary Market | Staged IPO offerings, lot-size enforcement, native currency reservation, pro-rata allotment & auto-refunds | M2 | Survey (Workflows) |
| 14 | Security & RBAC Integrity | Scrypt password hashing, timing-safe HMAC tokens, session revocation, 40 permissions, super-admin lock | M2 | Survey (Workflows) |
| 15 | Test Fixture Alignment | Align mock state fixture in `test-consolidated-phase1-fixes.js` with canonical universe security IDs | M2 | Survey (Workflows) |
| 16 | E2E Testing Harness & Infrastructure | Requirement-driven opaque-box test runner covering Tiers 1–4 across all 26 routes and core workflows | E2E-Track | Dual Track |
| 17 | Final Regression Battery | Execution of all 18+ test suites post-stabilization, 0 failures, 100% pass | M3 | Survey (All) |
| 18 | Bit-Identical State Hash Final Check | Final SHA-256 hash check confirming `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c` | M3 | Mandate |
| 19 | Forensic Integrity Audit | Systematic integrity verification by `teamwork_auditor` (binary veto) | M3 | Mandate |
| 20 | Deliverable Synthesis | Creation of `SAAMX_FINAL_PREDEPLOYMENT_AUDIT.md` with 10 required sections and official verdict | M4 | Mandate |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Chart Authenticity & Engine Stabilization | Remediate chart provenance labels ("Simulated"), condition "Live" badge, dynamic 3M months, index card harmonization, expand chart tests | Baseline Survey | DONE |
| M2 | Financial Workflows & Security Verification | Verify Trading, Exchange, Two-phase Banking, FX precision, IPOs, RBAC; align `test-consolidated-phase1-fixes.js` fixture | Baseline Survey | DONE |
| E2E | Comprehensive E2E Testing Track | Design & execute 4-tier opaque-box test suite derived from user requirements; publish `TEST_READY.md` | M1, M2 | DONE |
| M3 | Full Regression, Adversarial Verification & Audit | Run all 18+ regression test suites, verify state hash invariant, execute Forensic Integrity Audit | M1, M2, E2E | DONE |
| M4 | Deliverable Synthesis & Release Readiness | Author `SAAMX_FINAL_PREDEPLOYMENT_AUDIT.md` and deliver release readiness verdict | M3 | DONE |


---

## Interface Contracts

### Chart Timeframe Data Contract (`chartTimeframeEngine.js` ↔ `InteractiveMarketChart.jsx`)
- Input: `generateTimeframeData(instrument, timeframe, state)`
- Output Schema:
  ```javascript
  {
    timeframe: string,          // '1D' | '1W' | '1M' | '3M' | '1Y'
    points: Array<{ x, y, price, timestamp }>, // min length >= 5
    sourceLabel: string,        // Must contain 'Simulated' or 'Illustrative' if synthetic
    isLive: boolean,            // true ONLY if downsampled from real recorded ticks
    isSimulatedLive: boolean,   // true if synthetic 1D session trajectory
    xAxisLabels: string[],      // Dynamically formatted date/time labels
    highPrice: number,
    lowPrice: number,
    startPrice: number,
    currentPrice: number        // Points[last].price MUST EQUAL currentPrice
  }
  ```

### Two-Phase Settlement Contract (`/api/order/action` ↔ `/api/bank/settle`)
- Acceptance:
  - Generates voucher: `BNK-PAY-${ticket}-${timestamp}` (BUY) or `BNK-REC-${ticket}-${timestamp}` (SELL)
  - Order status: `EXECUTED_PENDING_SETTLEMENT`
  - Reserves cash/stock; does NOT debit/credit liquid balances.
- Settlement:
  - Requires bank teller role (`role !== 'team'`).
  - Atomic double-entry settlement; returns HTTP 409 if already `SETTLED`.
  - Sets order status: `SETTLED`, voucher status: `SETTLED`.

---

## Code Layout
- `src/lib/chartTimeframeEngine.js`: Timeframe data generation, Catmull-Rom Bezier geometry, PRNG curves.
- `src/components/ui/InteractiveMarketChart.jsx`: Reusable SVG chart with interactive crosshair and status badges.
- `src/components/team/MarketOverviewIntelligenceSection.jsx`: Market overview index cards and charts.
- `src/components/team/TeamOverviewSection.jsx`: Participant terminal overview and chart.
- `server.js`: Core Express server, API endpoints, two-phase settlement, order engine, FX, IPO, RBAC, persistence.
- `database/db.js`: Supabase PostgreSQL connection pool, transaction helpers, row locks.
- `test-market-chart-timeframes.js`: Automated unit and Chrome CDP tests for charts.
- `state.json`: **AUTHORITATIVE IMMUTABLE BASELINE STATE (DO NOT OVERWRITE OR RESET)**.
- `SAAMX_FINAL_PREDEPLOYMENT_AUDIT.md`: Final audit deliverable at repository root.
