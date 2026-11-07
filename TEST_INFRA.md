# SAAMX '26 — End-to-End Testing Infrastructure & Verification Specification

**File**: `TEST_INFRA.md`  
**Location**: Project Root (`SAAMX/`)  
**Track**: E2E Verification & Quality Assurance (Opaque-Box Requirement-Driven)  
**Authoritative Baseline State Hash**: `6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca`  
**Master Test Runner**: `node test-e2e-master-runner.js`  
**Tier Runners**:
- Tier 1: `node test-e2e-tier1-features.js`
- Tier 2: `node test-e2e-tier2-boundaries.js`
- Tier 3: `node test-e2e-tier3-combinations.js`
- Tier 4: `node test-e2e-tier4-scenarios.js`

---

## 1. Executive Summary & Purpose

The SAAMX '26 platform is a high-concurrency financial market simulation engine orchestrating 2,849 securities across 10 currencies (base INR + 9 foreign currencies), 5 staged IPOs, 20 participant investment houses, dynamic physical exchange intake desks, 2 physical cash/settlement desks, an operator-controlled FX queue with finite reserves, a news intelligence system (~400 presets with market impact engine), a broker advisory terminal, and an isolated role-based training environment.

This document establishes the official **End-to-End (E2E) Test Infrastructure Specification** for pre-deployment verification and continuous quality certification. The testing methodology is strictly:
- **Opaque-Box & Requirement-Driven**: Tests interact exclusively with external interfaces (HTTP REST APIs, WebSocket events, and formal interface contracts), asserting only observable behavior against published business specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- **Zero-Side-Effect Isolation**: All tests execute against an ephemeral, isolated server instance backed by a disposable snapshot copy (`state.test-e2e-disposable.json`). The authoritative `state.json` baseline remains strictly untouched, verifiable via SHA-256 bit-identity before and after test runs.
- **4-Tier Structured Hierarchy**: Systematic progression from isolated feature verification (Tier 1) to boundary stress and corner cases (Tier 2), cross-module integration pipelines (Tier 3), and full-scale operational event workloads (Tier 4).
- **Comprehensive Coverage**: Exercises all 31 features in the `PROJECT.md § Feature Inventory` across all 12 operational portals.

---

## 2. Test Architecture & Environment Isolation

### 2.1 Isolation Model

```
+-------------------------------------------------------------------------------+
|                             TEST RUNNER PROCESS                               |
|                     (SAAMX/test-e2e-master-runner.js)                         |
+---------------------------------------+---------------------------------------+
                                        |
       1. Compute Baseline Hash         | 2. Clone Disposable Fixture
       (6c30e425ca30e0a2...28acca)      | (state.test-e2e-disposable.json)
                                        v
+-------------------------------+       +---------------------------------------+
|  AUTHORITATIVE state.json     |       | ISOLATED TEST SERVER (PORT 3456)      |
|  (STRICTLY IMMUTABLE / READ)  |       | - STATE_FILE: disposable snapshot     |
+-------------------------------+       | - ALLOW_TEST_HEADER_AUTH: true        |
                                        | - DATABASE_URL: unset (file fallback) |
                                        | - SAAMX_TEST_SECRET: fms-event-2026   |
                                        +-------------------+-------------------+
                                                            |
                                3. Execute 4-Tier Test Suite | (REST HTTP / APIs)
                                                            v
                                        +---------------------------------------+
                                        | - Tier 1: Feature Coverage (40+ tests)|
                                        | - Tier 2: Boundaries/Corners(30+ tests)|
                                        | - Tier 3: Cross-Feature Chains(6 runs)|
                                        | - Tier 4: Real-World Workloads(5 runs)|
                                        +-------------------+-------------------+
                                                            |
                                4. Teardown Server          |
                                5. Delete Disposable State  |
                                6. Re-Verify Baseline Hash  v
                                (Must equal 6c30e425ca30...28acca)
```

### 2.2 Ephemeral Port & Process Lifecycle
- The test harness allocates a dedicated isolated port (`3456`) to avoid port collisions with the default development port `3000`.
- The Express process is spawned via Node `child_process.spawn` with environment flags:
  - `PORT`: `3456`
  - `STATE_FILE`: `state.test-e2e-disposable.json`
  - `SAAMX_STATE_FILE`: `state.test-e2e-disposable.json`
  - `NODE_ENV`: `test`
  - `ALLOW_TEST_HEADER_AUTH`: `true`
  - `SAAMX_TEST_SECRET`: `fms-event-2026`
  - `DATABASE_URL`: `''` (guarantees local in-memory fallback without touching external databases)
- Teardown is guaranteed via `finally` blocks, gracefully terminating child processes and removing disposable state files.
- SHA-256 verification of `state.json` occurs before and after test execution.

---

## 3. The 4-Tier Test Hierarchy

```
+=============================================================================+
|  TIER 4: REAL-WORLD APPLICATION SCENARIOS                                   |
|  - Multi-session trading simulations (Opening Rush, Macro Shock, FX Run,    |
|    IPO Rush, Market Close Reconciliation) (>=5 complex multi-actor flows)   |
+-----------------------------------------------------------------------------+
|  TIER 3: CROSS-FEATURE INTEGRATION PIPELINES                                 |
|  - Order -> Approval -> Voucher -> Bank Settle                              |
|  - Order -> Hold -> Rejection -> Refund                                     |
|  - FX Queue -> Delay -> Settle                                              |
|  - News Flash -> Price Shift -> Circuit Halt                                |
|  - IPO Bid -> Allotment -> Pro-rata Refund                                  |
|  - Dependent Trade Void & Solvency Protection                               |
+-----------------------------------------------------------------------------+
|  TIER 2: BOUNDARY & CORNER CASES                                            |
|  - Negative & zero quantities, float quantities, lot size multiples         |
|  - JPY/KRW 0-decimal integer precision, finite FX reserve depletion limits  |
|  - 409 duplicate settlements, delisted securities, 401/403/404 handling     |
+-----------------------------------------------------------------------------+
|  TIER 1: FEATURE COVERAGE (Isolated Verification across 31 Features)        |
|  - Portals & RBAC, News Intelligence, Dynamic Desk Queues, Bank Settlement, |
|    Operator FX Queue, IPO Engine, Broker Advisory, Training Terminal Sandbox|
+=============================================================================+
```

---

## 4. Feature-to-Portal Matrix (All 31 Features across 12 Portals)

| # | Feature | Target Portals | Primary Endpoints / Interfaces | Verification Tier |
|---|---------|----------------|--------------------------------|-------------------|
| 1 | Baseline Safety & Environment Boundaries | System / Dev / Staging | Repository status, environment variables | Tier 1, Master |
| 2 | Authoritative State Hash Preservation | Project Root | SHA-256 hash `6c30e425ca30e0a2...28acca` | Pre/Post Test |
| 3 | News Preset Library Expansion (~400 Presets) | Journalist, News Controller | `src/lib/marketEventsDataset.js`, `newsPresets.js` | Tier 1 |
| 4 | Centralized Market Impact Engine | News Controller, Market Watch | `POST /api/news`, `POST /api/price-override` | Tier 1, Tier 3 |
| 5 | IPO News Lifecycle Engine | Team, Exchange, Admin | `/api/ipos`, `/api/ipo/bid`, `/api/ipo/allot` | Tier 1, Tier 3, Tier 4 |
| 6 | Journalist Console Workflow | Journalist Console (#9) | `POST /api/news`, `GET /api/intelligence/feed` | Tier 1 |
| 7 | News Controller Console | News Controller (#10) | `POST /api/news`, `/api/events/trigger` | Tier 1, Tier 3 |
| 8 | Dedicated Order Queue Screen | Order Queue Screen (#11) | `GET /api/desk-queue-dashboard` | Tier 1 |
| 9 | Dynamic Desk Configuration | Exchange Desks (#2), Queue (#11)| `GET /api/desks`, `GET /api/order-desks` | Tier 1 |
| 10 | Desk Operational Metrics | Order Queue Screen (#11) | `GET /api/desk-queue-dashboard` metrics | Tier 1 |
| 11 | Distinct Identifier Scheme | Team, Exchange, Bank | Token (`TKN-`), Order (`ORD-`), Voucher (`BNK-`) | Tier 1, Tier 3 |
| 12 | Exchange Desk Verification Workflow | Exchange Desk (#2) | `POST /api/orders/submit`, `POST /api/order/action` | Tier 1, Tier 3 |
| 13 | Bank Desk Settlement Queue & Verification | Bank Desk (#3) | `GET /api/bank/settlements`, `POST /api/bank/settle` | Tier 1, Tier 3 |
| 14 | Queue Concurrency & Mutex Protection | Exchange & Bank Desks | Concurrent claims, status locks | Tier 1, Tier 2 |
| 15 | Operator-Controlled FX Queue Workflow | FX Desk (#4), Team (#1) | `POST /api/fx/request`, `POST /api/fx/queue-action`| Tier 1, Tier 3 |
| 16 | FX 7-State Lifecycle & Processing Window | FX Desk (#4) | `status` transitions (`pending` -> `settled`) | Tier 1, Tier 3 |
| 17 | FX Operator Controls & Demand Visibility | FX Desk (#4) | `GET /api/fx/queue`, operator actions | Tier 1, Tier 3 |
| 18 | Finite FX Reserve Model Across 9 Currencies | FX Desk (#4) | `GET /api/fx/reserves`, solvency checks | Tier 1, Tier 2, Tier 4 |
| 19 | Broker Advisory Terminal | Broker Advisory (#8) | `GET /api/broker/recommendations`, `POST /api/broker/recommendation` | Tier 1 |
| 20 | Advisory Factual Distinction & Zero Execution | Broker Advisory (#8) | Factual data inspection, zero order creation | Tier 1 |
| 21 | 12 Portals Verification & RBAC Enforcement | All 12 Portals | `src/lib/navigationConfig.js`, `/api/auth/me` | Tier 1 |
| 22 | Decommissioning Excluded Modules | Route Gate | Absence of Debate Arena & Registration routes | Tier 1 |
| 23 | Training Terminal Backend Sandbox Isolation | Training Terminal (#12) | Independent drill state, zero live mutations | Tier 1 |
| 24 | Sandbox-Only Reset Mechanism | Training Terminal (#12) | Rehearsal reset preserves live event state | Tier 1 |
| 25 | Role-Based Training Workflows | Training Terminal (#12) | Exchange, Bank, FX, Team practice workflows | Tier 1 |
| 26 | Training-Only News Dispatch & Market Effects | Training Terminal (#12) | Simulated order flow without live price mutation | Tier 1 |
| 27 | Operator Performance Scorecards | Training Terminal (#12) | Accuracy, error rate, processing duration | Tier 1 |
| 28 | Core Financial Invariants Preservation | Core Financial Engine | 5% BUY buffer, share locking, double-entry | Tier 1, Tier 3, Tier 4 |
| 29 | E2E Test Suite (Tiers 1–4) | Verification Harness | All 4 tier runner scripts | Master Runner |
| 30 | Adversarial Coverage Hardening | Test Framework | Boundary, limits, 409 conflict checks | Tier 2 |
| 31 | Master Regression Battery & Production Build | Build Pipeline | 100% pass across all tiers, bit-exact hash | Master Runner |

---

## 5. Detailed Tier Specifications

### 5.1 Tier 1: Feature Coverage (Isolation)
Exercises each feature in isolation with clear inputs and derived expected outputs:
- **Portals & System Liveness**: Health, ping, state snapshots, permissions matrix, 12 portals navigation configuration, and confirmation of excluded modules removal.
- **News Intelligence**: Verification of >=300 curated events, schema completeness, upward price impact, downward price impact, sector-wide contagion, and simulated FX rate movement.
- **Dynamic Desk Queues**: Dynamic desk registry, multi-desk telemetry dashboard, ticket submission with distinct identifiers, desk claim, physical/digital verification, and decoupled voucher generation.
- **Banking Settlement**: Bank queue inspection, single voucher lookup, teller settlement with cash liquidation and stock credit, teller hold with notes, teller rejection with cash release, and double-entry balance check.
- **Operator FX Queue**: 9-currency FX catalog, finite reserve balances, client FX request, operator queue inspection, operator claim/processing, atomic queue settlement, and scarcity pricing spreads.
- **IPO Engine**: Staged offerings catalog, lot-sized bidding, native currency reservations, pro-rata allotment execution, and listing transition.
- **Broker Advisory**: Recommendation query, publication of analyst signals, structural separation of factual fundamentals and subjective sentiment, and verification of zero automated trade side-effects.
- **Training Sandbox**: In-memory rehearsal drill execution, scorecard accuracy metrics, and verification that training actions leave live wallets and holdings untouched.

### 5.2 Tier 2: Boundary & Corner Cases
Adversarial edge conditions, invalid inputs, and error-handling envelopes:
- **Trading Boundaries**: Negative quantity (400), zero quantity (400), non-integer quantity (400), non-lot-size multiple (400), LIMIT order rejection (400), duplicate ticket number (400 anti-replay), non-existent security ticker (404), insufficient cash buffer (400), insufficient deliverable holdings (400).
- **Banking Boundaries**: Settlement without key (400), non-existent voucher ID (404), unauthorized participant settlement attempt (403), duplicate settlement replay on already SETTLED voucher (409 Conflict), rejection without mandatory reason (400).
- **FX Boundaries & Zero Decimals**: Zero/negative exchange amount (400), exchange currency to itself (400), unsupported currency (400), legacy CAD/CHF rejection (400), JPY integer precision (0 decimals enforced), KRW integer precision (0 decimals enforced), reserve exhaustion limit.
- **Security & RBAC**: Unauthenticated request (401), invalid credentials (401), unauthorized role escalation (403), cross-team private data access (403).

### 5.3 Tier 3: Cross-Feature Integration Pipelines
Multi-step interacting workflows simulating end-to-end platform processes:
- **Pipeline 1 (Order -> Approval -> Voucher -> Bank Settle)**: Team BUY order -> Exchange intake claim -> slip verification -> voucher generation (`BNK-PAY-...`) -> Bank Desk claim -> teller settlement -> double-entry ledger update -> wallet & portfolio update.
- **Pipeline 2 (Order -> Hold -> Rejection -> Refund)**: Team BUY order -> Order hold by operator -> voucher rejection with mandatory reason -> complete unreservation of client cash (including 5% execution buffer).
- **Pipeline 3 (FX Queue -> Delay -> Settle)**: FX request submission -> fund & reserve reservation -> queue addition -> operator claim (`PROCESS`) -> operator atomic settlement (`SETTLE`) -> currency ledger update.
- **Pipeline 4 (News Flash -> Price Shift -> Circuit Halt)**: Breaking news broadcast -> market impact engine moves security prices -> SEBI surveillance detects extreme movement -> circuit halt engaged -> order submission blocked.
- **Pipeline 5 (IPO Bid -> Allotment -> Pro-rata Refund)**: Multiple team bids on staged IPO -> offer oversubscribed -> allotment engine executes pro-rata allocation -> shares added to portfolio -> unallocated capital released.
- **Pipeline 6 (Dependent Trade Void & Solvency Protection)**: Settled trade voided via `/api/transactions/void` -> balanced `REVERSAL_COMPENSATING` double-entry lines posted -> solvency verified without negative balances.

### 5.4 Tier 4: Real-World Application Scenarios
Full-scale operational simulation flows across multiple actors:
- **Scenario 1 (Opening Bell Rush)**: Multi-team concurrent trading across desks, simultaneous voucher routing, dual bank desk settlement, zero cash leakage.
- **Scenario 2 (Macro Shock & Panic Selling)**: Breaking negative news wire, sector price drop, surge of participant sell orders, deliverable share lock enforcement.
- **Scenario 3 (FX Liquidity Crunch)**: High-volume foreign currency conversions, reserve depletion, scarcity pricing spread widening, admin reserve replenishment, solvency invariant check.
- **Scenario 4 (High-Demand Unicorn IPO Listing Day)**: Staged IPO launch, 300% oversubscription, pro-rata allotment, excess capital refund, transition to secondary market trading.
- **Scenario 5 (Full Simulation Trading Day Lifecycle)**: Market open -> pre-market quotes -> breaking news -> desk order intake -> bank settlements -> FX operations -> SEBI market pause -> end-of-day market reconciliation and scorecard finalization.

---

## 6. Execution & Verification Guide

### 6.1 Running the Complete Suite
```bash
cd SAAMX
node test-e2e-master-runner.js
```

### 6.2 Running Individual Tiers
```bash
# Tier 1: Feature Coverage (Isolated Functional Verification)
node test-e2e-tier1-features.js

# Tier 2: Boundary & Corner Cases (Adversarial Edge Verification)
node test-e2e-tier2-boundaries.js

# Tier 3: Cross-Feature Combinations (Pairwise Pipeline Workflows)
node test-e2e-tier3-combinations.js

# Tier 4: Real-World Scenarios (Full Simulation Event Workloads)
node test-e2e-tier4-scenarios.js
```

### 6.3 State Invariant Certification
Before and after test execution, verify the SHA-256 hash of `state.json`:
```powershell
Get-FileHash -Algorithm SHA256 "c:\Users\Lapcarts Electronics\OneDrive\Desktop\Antigravity\SAAMX\state.json"
```
The output must match exactly:
`6C30E425CA30E0A22A5BE40C7228543D1E8D716FE9A4795B3CDF136DF728ACCA`
