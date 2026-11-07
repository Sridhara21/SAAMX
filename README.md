# SAAMX — Student Academic Asset Market eXchange

> *"Experience the market, don't just plan it."*

**SAAMX** is an event-grade, real-time financial trading, clearing, and simulation ecosystem designed for university and business school trading competitions, executive training, and high-intensity mock trading drills. 

The platform merges the operational intensity of an open-outcry trading floor with modern electronic stock exchanges, central clearinghouses, commercial banking desks, finite-reserve foreign currency bureaus, news controllers, and regulatory watchdogs.

---

## 🏛️ Platform Architecture & 12 Operational Portals

SAAMX provides 12 specialized role-based portals configured for simultaneous floor operations across 100+ concurrent participant devices and administrative desks:

| Portal | Hash Route | Description |
| :--- | :--- | :--- |
| **Team Trading Workstation** | `#/team` | Multi-currency portfolios (10 currencies), real-time candlestick charts, paper slip generation, and IPO subscription bidding. |
| **Exchange Clearing Desk** | `#/exchange` | Physical paper slip inspection, digital order verification, slip claiming, and Bank Settlement Voucher issuance. |
| **Commercial Bank Counter** | `#/bank` | Voucher verification, team solvency checks, hold notes, and final atomic cash settlement with share delivery. |
| **Dedicated Desk Queues** | `#/desk-queues` | Multi-desk operational board tracking backlog across Exchange Desks 1..N, Bank Counters 1..2, and the FX Bureau. |
| **FX Currency Bureau** | `#/fx` | Finite currency inventory tracking across 9 foreign currency reserves, dynamic scarcity pricing, and 1–5m operational delay timers. |
| **Broker Advisory Terminal** | `#/advisory` | Institutional research desk with deterministic valuation indicators (P/E, D/E, Margin, ROE), bull/bear perspectives, and pure advisory non-execution guards. |
| **Training Terminal Sandbox** | `#/training` | Role-based practice simulator for Exchange, Bank, FX, Team, and Journalist roles operating in a strictly isolated in-memory sandbox. |
| **News Controller Console** | `#/news-controller` | Editorial gatekeeper desk for reviewing journalist drafts, browsing 400 market presets, and managing zero-drift rumour debunking. |
| **Journalist Press Wire** | `#/journalist` | Media drafting terminal for submitting breaking news articles and investigative drafts to the News Controller. |
| **Executive Admin Console** | `#/admin` | Global market session management (Open, Halt, Freeze, Close), IPO stage advancement, and exact-phrase (`"RESET ALL"`) master reset. |
| **SEBI Surveillance Watchdog** | `#/sebi` | Real-time regulatory audit trail, insider trading velocity detection, compliance penalty levying, and circuit breaker overrides. |
| **Public Market Projector** | `#/projector`, `#/market-watch` | High-contrast trading floor visualizer with real-time ticker feeds, sector heatmaps, order depth, and live team leaderboard. |

---

## ⚙️ Core Financial & Operational Mechanics

### 1. Decoupled Two-Phase Order Settlement
* **Phase 1 (Exchange Execution)**: Floor operators inspect physical paper slips against digital orders. Approval issues an official Bank Settlement Voucher (`BNK-PAY-*`) without debiting client cash or inflating market float.
* **Phase 2 (Bank Settlement)**: Commercial Bank tellers verify client cash solvency and execute final settlement, transferring shares, refunding the 5% execution buffer with 0% balance leakage, and recording balanced double-entry ledger lines.

### 2. Finite FX Reserves & Scarcity Engine
* Finite reserves tracked across 9 foreign currencies: `USD`, `GBP`, `EUR`, `JPY`, `AED`, `SGD`, `CNY`, `AUD`, `KRW` (with base currency `INR`).
* Strict mathematical invariant: $\text{Available Reserve} + \text{Reserved Inventory} \equiv \text{Current Inventory}$.
* Dynamic scarcity curve bounded between **0.45% base spread** and **25.00% ceiling**.
* Integer precision enforced for `JPY` and `KRW` (zero fractional decimals); legacy `CAD` and `CHF` isolated as strictly non-tradable.

### 3. News Intelligence & Centralized Contagion Engine
* **400 structured presets** across 9 domains with 24 paired rumour-debunking stories.
* **Sector Spillover**: 30% price contagion automatically ripples to peer equities in the affected sector.
* **Circuit Breakers**: Shocks $\ge 20\%$ automatically trigger trading halts.
* **Zero-Drift Rumour Debunking**: Mathematical multiplicative inverse applies $\frac{1}{1 + M}$ with 0.0000% baseline drift.

### 4. Deterministic Fundamental Analysis Engine
* Real-time calculation of **P/E Ratio**, **Debt-to-Equity (D/E)**, **Operating Margin (%)**, and **Return on Equity (ROE %)** across 2,856 active securities.
* Anti-Spurious ROE Trap prevents distorted indicators during negative equity deficits.
* Strict structural segregation: `FACTUAL MARKET DATA` vs. `SIMULATED ADVISORY OPINION`.

### 5. Training Terminal with Strict Sandbox Isolation
* In-memory `sandboxState` partition (`/api/training/*`) completely decoupled from production database tables and `state.json`.
* Rehearsal drills for 5 roles with real-time operator scorecards measuring decision latency (ms), verification accuracy (%), and compliance.

---

## 🛠️ Technology Stack

* **Frontend Client**: React 18 SPA, Vite 5.4, Tailwind CSS, Lucide Icons, Glassmorphism Design System.
* **Backend Application Server**: Node.js 20 LTS, Express, WebSocket (`ws`) real-time broadcasting.
* **Persistence & Database**: Dedicated Supabase PostgreSQL 17.11 instance with connection pooling (`pg.Pool`), row-level ACID locks (`SELECT ... FOR UPDATE`), and local snapshot fallback.
* **Testing Infrastructure**: Opaque-box multi-tier test harness with ephemeral port assignment and disposable state fixtures.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20 LTS recommended)
* **npm**: v9.0.0 or higher

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Sridhara21/SAAMX.git
   cd SAAMX
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
1. Start the backend server:
   ```bash
   cmd /c npm run server
   ```
2. In a separate terminal, launch the Vite development server:
   ```bash
   cmd /c npm run dev
   ```
3. Open your browser to the local address (typically `http://localhost:5173/`).

### Building for Production
To compile the production build:
```bash
cmd /c npm run build
```

---

## 🧪 Verification & Regression Test Estate

SAAMX maintains an exhaustive 18-suite test battery with **403 / 403 passing test assertions (100% pass rate)**:

```bash
# Foundational Security & Accounting Milestones
node test-milestone-m0-defects.js             # 15/15 Passed
node test-milestone-m1-order-lifecycle.js      # 12/12 Passed
node test-milestone-m2-fx-reserves.js          # 16/16 Passed
node test-milestone-m3-accounting.js           # 9/9 Passed
node test-milestone-m1-news-intelligence.js    # 24/24 Passed

# Operational Desks & Queues
node test-milestone-phase-c-queues.js          # 17/17 Passed
node test-adversarial-phase-c-concurrency.js   # 10/10 Passed
node test-milestone-phase-d-fx-queue.js        # 16/16 Passed
node test-phase-d-challenger-2-stress.js       # 10/10 Passed
node test-adversarial-phase-d-fx-queue.js      # 18/18 Passed

# Broker Advisory & Training Sandbox
node test-milestone-phase-e-broker.js          # 30/30 Passed
node test-adversarial-phase-e-ratios.js        # 31/31 Passed
node test-adversarial-phase-e-concurrency.js   # 20/20 Passed
node test-milestone-phase-f-training.js        # 36/36 Passed
node test-adversarial-phase-f-isolation.js     # 55/55 Passed
node test-adversarial-phase-f-scorecards.js    # 24/24 Passed

# Master Opaque-Box E2E Runner (Tiers 1–4)
node test-e2e-master-runner.js                 # 93/93 Passed
```

---

## 🔒 Licensing & Intellectual Property

This codebase is proprietary software. All rights to the software, models, algorithms, documentation, and simulation workflows are strictly reserved under the proprietary terms defined in the [LICENSE](./LICENSE) file.

**Copyright (c) 2026 Medam Sridhara. All Rights Reserved.**
