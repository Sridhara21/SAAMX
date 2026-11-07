# SAAMX — Phase 6.0 Page Inventory & Console Audit
## Comprehensive Field Audit of All 14 Consoles, Workstations & Auxiliary Shells

**Document ID:** `SAAMX-PHASE6-INV-001`  
**Status:** APPROVED FOR PHASE 6.1 IMPLEMENTATION  
**Author:** Software Architecture & Quality Engineering  
**Target Platform:** SAAMX (Student Academic Asset Market eXchange)  
**Date:** October 2026  

---

## 1. Executive Summary & Audit Scope

This document provides a comprehensive, field-tested audit of every user-facing page, workstation, secondary console, modal dialog, and auxiliary screen across the SAAMX application. 

The audit covers:
- **14 Primary Production Consoles** mapped in `src/lib/navigationConfig.js`
- **4 Participant Subsections** in `src/components/team/`
- **4 Standalone / Public Screens** (`LoginPage`, `RegistrationPage`, `PublicLandingPage`, `CompanyProfileModal`)
- **5 Legacy / Superseded Files** retained in `src/pages/` from Phase 1 consolidation

Each entry examines real-world operational ergonomics, server-side role-based access control (RBAC), WebSocket delta dependencies, empty/error/loading/offline fault resilience, and architectural refactoring requirements for Phase 6.1.

---

## 2. Comprehensive Inventory Matrix

| # | Console / View | Source Component | Lines | Target Role(s) | Primary Data Source | Complexity |
| :-: | :--- | :--- | :-: | :--- | :--- | :-: |
| **01** | **Participant Terminal** | `ParticipantTerminal.jsx` + `src/components/team/*` | 3,262 | Team, Participant | REST `/api/team/*` + RTDB `/teams` | High |
| **02** | **Exchange Trading Floor** | `ExchangePage.jsx` | 1,435 | Clerk (`clerk`), Admin | REST `/api/orders/*` + RTDB `/orders` | High |
| **03** | **Master Admin Console** | `AdminPage.jsx` | 3,762 | Super-Admin (`sridhara`), Admin | REST `/api/admin/*` + Full State | Critical |
| **04** | **SEBI Regulatory Console** | `SebiPage.jsx` | 1,454 | SEBI Surveillance, Regulator | REST `/api/sebi/*` + RTDB `/sebi` | High |
| **05** | **Floor Market Watch** | `MarketWatchPage.jsx` | 1,605 | All Roles, Public | RTDB `/stocks` + Delta WS | Medium |
| **06** | **Auditorium Projector Display** | `ProjectorPage.jsx` | 1,551 | Audience, Floor Displays | RTDB `/stocks`, `/teams`, `/news` | High |
| **07** | **Order Slip Verification** | `OrderVerificationPage.jsx` | 741 | Floor Marshal, Verification Clerk | REST `/api/orders/verify` | Medium |
| **08** | **Floor Operations & Devices** | `FloorOperationsPage.jsx` | 892 | Operations Lead, IT Marshal | REST `/api/admin/desks` | Medium |
| **09** | **Floor Broker Terminal** | `BrokerTerminal.jsx` | 682 | Floor Broker, Team Runner | REST `/api/orders/quote` | Low |
| **10** | **Media & News Publishing** | `NewsPortalPage.jsx` | 814 | Journalist, PR, Media Lead | REST `/api/news` + RTDB `/news` | Medium |
| **11** | **Public Leaderboard** | `LeaderboardPage.jsx` | 563 | All Roles, Public, Spectators | RTDB `/teams` + REST `/api/leaderboard` | Low |
| **12** | **Stock Catalog Directory** | `StockDirectoryPage.jsx` | 728 | All Roles, Research Teams | Static Universe + Delta WS | Medium |
| **13** | **Forensic Audit Log** | `AuditLogsPage.jsx` | 642 | SEBI, Compliance, Admin | REST `/api/admin/audit` | Medium |
| **14** | **System Infrastructure Status** | `SystemStatusPage.jsx` | 512 | IT Admin, Devops | REST `/api/health`, `/api/system` | Low |
| **15** | **Authentication Gateway** | `LoginPage.jsx` | 340 | All Unauthenticated Users | REST `/api/auth/login` | Medium |
| **16** | **Pre-Event Registration** | `RegistrationPage.jsx` | 591 | Student Teams (Pre-Event) | REST `/api/auth/register-team` | Medium |
| **17** | **Public Landing Portal** | `PublicLandingPage.jsx` | 481 | Public Visitors, Guests | Static Config + Schedules | Low |
| **18** | **Equity Profile Modal** | `CompanyProfileModal.jsx` | 450 | All Roles (Deep Dive) | REST `/api/stocks/:ticker` | Medium |

---

## 3. Deep Architectural Audit of All Consoles

### 3.1 Console 01: Participant Terminal (`ParticipantTerminal.jsx` & Child Sections)

- **Source Code:** `src/pages/ParticipantTerminal.jsx` (364 lines) delegating to:
  - `src/components/team/TeamOverviewSection.jsx` (520 lines)
  - `src/components/team/MarketOverviewIntelligenceSection.jsx` (912 lines)
  - `src/components/team/PortfolioHoldingsSection.jsx` (742 lines)
  - `src/components/team/OrderHistorySection.jsx` (724 lines)
- **Target Role(s):** Student Investment Teams (`role: "team"`).
- **Core Workflow & Purpose:**  
  The primary workstation for student investment teams during live rounds. In accordance with the SAAMX physical trading floor design, teams do **not** click online "buy/sell" buttons to execute orders. Instead, they conduct market research, calculate valuations, check their cash balance and portfolio holdings, formulate physical paper trading slips, and track their order lifecycle as slips are submitted to floor exchange desks.
- **Layout & Structure:**  
  Modern tabbed layout with persistent sticky team header:
  1. *Team Header:* Team Name, School, Desk Assignment (`DESK_1`..`5`), Current Cash Balance, Total Portfolio Net Worth, Today's P&L, Rubric Score Progress (0–1,000 points).
  2. *Section 1: Overview & Performance:* Performance chart, asset allocation pie/bar, recent executed orders, live market ticker ribbon.
  3. *Section 2: Market Intelligence:* Searchable universe of 2,061 securities, sector filters, top gainers/losers, company financial briefs.
  4. *Section 3: Portfolio Holdings:* Tabular list of current equity holdings, average purchase price, current market price, unrealized P&L, and paper slip prep helper.
  5. *Section 4: Order History:* Complete lifecycle tracker of submitted paper slips (`QUEUED` $\to$ `CLAIMED` $\to$ `VALIDATED` $\to$ `EXECUTED` / `REJECTED` / `RETURNED`).
- **Authorization & Security Checks:**  
  Strict team token authentication (`Authorization: Bearer <saamx_token>`). Can only access data matching `token.teamId`. Server returns HTTP 403 if team attempts to query another team's portfolio.
- **Data Sources & API Endpoints:**  
  - REST: `GET /api/teams/:teamId/portfolio`
  - REST: `GET /api/teams/:teamId/orders`
  - RTDB / WS: `/stocks` (real-time price updates), `/news` (breaking market flashes).
- **State Resilience:**  
  - *Loading:* Skeleton cards for portfolio metrics.
  - *Empty:* Encouraging onboarding guides if no orders have been submitted.
  - *Offline:* Visual warning banner: "Trading floor connection interrupted. Real-time ticker paused."
- **Critical UI/UX Weaknesses:**  
  1. Market Intelligence renders hundreds of unvirtualized stock rows, causing scroll lag on lower-spec student laptops.
  2. Paper slip prep helper needs a 1-click printable or formatted view matching physical floor paper slips.
- **Phase 6.1 Rebuild Standard:**  
  Virtualize the 2,061-stock directory table. Integrate explicit paper slip preview card so students can verify calculations before handing paper to runners.

---

### 3.2 Console 02: Exchange Trading Floor (`ExchangePage.jsx`)

- **Source Code:** `src/pages/ExchangePage.jsx` (1,435 lines).
- **Target Role(s):** Exchange Desk Clerks (`role: "clerk"`, `role: "admin"`).
- **Core Workflow & Purpose:**  
  The nerve center of the physical trading floor. Exchange clerks stationed at physical desks (`DESK_1` through `DESK_5`) receive physical paper order slips from team runners. Clerks input the slip details into SAAMX, claim exclusive locks on slips, validate team cash/holdings, and execute or reject trades.
- **Layout & Structure:**  
  Split-pane layout:
  - *Left Pane (Order Queue):* Live queue of incoming orders filtered by assigned desk (`My Desk Orders` vs `All Floor Orders`). High-contrast urgency badges (`QUEUED`, `CLAIMED`).
  - *Right Pane (Execution Slip Terminal):* Active order processing card. Clerks verify paper slip number, team ID, ticker symbol, transaction type (`BUY`/`SELL`), quantity, limit price, and clerk signature.
  - *Station Indicator Banner:* Persistent top banner displaying active desk lock (e.g., `STATION: DESK_2 — CLERK: MR. X`).
- **Authorization & Security Checks:**  
  - Requires `role: "clerk"` or `role: "admin"`.
  - Enforces Server-Side Desk Isolation (Phase 4): A clerk locked to `DESK_2` cannot claim or validate slips assigned to `DESK_1` unless assigned as floor floating supervisor.
  - All matching requests pass through scrypt-verified tokens.
- **Data Sources & API Endpoints:**  
  - REST: `GET /api/orders/queue?desk=:deskId`
  - REST: `POST /api/orders/:orderId/claim` (Locks order to clerk)
  - REST: `POST /api/orders/:orderId/validate`
  - REST: `POST /api/orders/:orderId/execute`
  - REST: `POST /api/orders/:orderId/reject`
  - REST: `POST /api/orders/:orderId/return`
- **State Resilience:**  
  - *Concurrency Conflicts:* If another clerk claims an order simultaneously, server returns HTTP 409 Conflict. Client immediately displays toast: "Order already claimed by Desk 3" and clears local selection.
  - *Network Drop:* Form retains entered data locally in component state; retry button appears without losing entered fields.
- **Critical UI/UX Weaknesses:**  
  1. Monolithic 1,435-line component contains inline claim/validation modals, forcing full-screen re-renders on keystrokes.
  2. Keyboard ergonomics: Currently requires multiple mouse clicks between inputting quantity and confirming execution.
- **Phase 6.1 Rebuild Standard:**  
  Decompose into `OrderQueueList.jsx`, `OrderProcessingTerminal.jsx`, and `DeskSwitchModal.jsx`. Implement 100% mouse-free keyboard processing: `Enter` to confirm, `Esc` to release claim, `Ctrl+R` to reject with predefined reason dropdown.

---

### 3.3 Console 03: Master Admin Console (`AdminPage.jsx`)

- **Source Code:** `src/pages/AdminPage.jsx` (3,762 lines - largest component in SAAMX).
- **Target Role(s):** Master Administrator (`sridhara`), Event Directors (`role: "admin"`).
- **Core Workflow & Purpose:**  
  Master control room for the entire simulation event: round transitions, circuit breakers, macro shocks, Project Phoenix narrative arcs, team credit injections, personnel role assignments, and final rubric score calculations.
- **Layout & Structure:**  
  Monolithic tab system encompassing 5 major operational modules:
  1. *Event Control:* Round Start/Pause/End timer, Global Market Halt switch, Index circuit breakers.
  2. *Project Phoenix Narrative Orchestrator:* Acts 1–13 triggering news leaks, DTAI collapse, OpenAI IPO, and bankruptcy procedures.
  3. *Personnel & Desk Provisioning:* Clerk desk assignments, password resets, token revocations.
  4. *Market Maker & Liquidity Controls:* Automated market maker depth injection, spread settings.
  5. *Scoring & Results:* 1,000-point rubric breakdown calculation, exportable CSV rankings.
- **Authorization & Security Checks:**  
  Highest security tier. Multi-layer verification. Restricted to authoritative personnel records. Critical disaster operations (e.g., hard reset, emergency restore) require confirmation modals and are logged to immutable forensic ledger.
- **Data Sources & API Endpoints:**  
  - REST: `POST /api/admin/round/start`, `pause`, `stop`
  - REST: `POST /api/admin/phoenix-act` (Phase 7A.2 verified)
  - REST: `POST /api/admin/halt-market`
  - REST: `GET /api/admin/state-dump`
- **Critical UI/UX Weaknesses:**  
  1. At 3,762 lines, the file has excessive coupling. State updates in the personnel tab trigger re-renders of the Phoenix orchestrator.
  2. Danger zones (e.g. market reset) sit directly adjacent to routine round controls without sufficient visual segregation.
- **Phase 6.1 Rebuild Standard:**  
  Decompose into `src/pages/admin/` with 5 standalone subcomponents: `AdminOverviewTab.jsx`, `AdminPhoenixTab.jsx`, `AdminPersonnelTab.jsx`, `AdminScoringTab.jsx`, `AdminAuditTab.jsx`. Wrap high-risk administrative actions in a dual-action "Arm & Fire" confirmation modal.

---

### 3.4 Console 04: SEBI Regulatory Console (`SebiPage.jsx`)

- **Source Code:** `src/pages/SebiPage.jsx` (1,454 lines).
- **Target Role(s):** SEBI Surveillance Officers, Regulatory Compliance Lead.
- **Core Workflow & Purpose:**  
  Monitors market integrity in real-time. Detects suspicious trading patterns, insider trading collusion (front-running before news releases), unauthorized short selling, pump-and-dump schemes, and team debt overextension. SEBI officers can freeze individual team trading privileges, issue regulatory summons, levy fines, or inspect physical order slip chains of custody.
- **Layout & Structure:**  
  High-intensity surveillance interface:
  - *Alert Stream:* Real-time anomalous volume spike alerts, price deviation flags.
  - *Surveillance Matrix:* Cross-team holdings correlation table, trade timing relative to news flashes.
  - *Enforcement Actions Panel:* Freeze Team Account, Levy Regulatory Fine, Issue Formal Warning, Request Physical Slip Audit.
- **Authorization & Security Checks:**  
  Requires `role: "sebi"` or `role: "admin"`.
- **Data Sources & API Endpoints:**  
  - REST: `GET /api/sebi/surveillance-feed`
  - REST: `POST /api/sebi/freeze-team`
  - REST: `POST /api/sebi/levy-fine`
  - REST: `POST /api/sebi/clear-alert`
- **Critical UI/UX Weaknesses:**  
  Component still contains direct Firebase RTDB client SDK calls (`ref`, `update`) mixed with `apiFetch`. This bypasses backend audit logging when SEBI issues fines.
- **Phase 6.1 Rebuild Standard:**  
  Eliminate all direct Firebase mutations. Direct all enforcement operations through audited backend REST endpoints (`/api/sebi/*`). Enhance anomaly visualization with high-contrast amber/crimson indicator rings.

---

### 3.5 Console 05: Floor Market Watch (`MarketWatchPage.jsx`)

- **Source Code:** `src/pages/MarketWatchPage.jsx` (1,605 lines).
- **Target Role(s):** All roles, spectator terminals, classroom sideboards.
- **Core Workflow & Purpose:**  
  Provides floor-wide real-time quotations, sector performance indices, top gainers/losers, trading volume leaders, and market depth.
- **Layout & Structure:**  
  Grid of sector indices at top, followed by multi-tabbed security tables:
  - Nifty/SAAMX 50 Hero Index
  - Sector breakdown (Tech, Pharma, Banking, Energy, Auto, Infrastructure)
  - Gainers / Losers / Most Active by Volume
- **Data Sources & API Endpoints:**  
  RTDB `/stocks` + WebSocket delta broadcasts.
- **Critical UI/UX Weaknesses:**  
  SVG sparklines are re-calculated on every incoming WebSocket tick across hundreds of rows, spiking client CPU usage on older machines.
- **Phase 6.1 Rebuild Standard:**  
  Memoize sparkline SVG generation with `React.memo` and windowing. Implement search filtering with 150ms debounce.

---

### 3.6 Console 06: Auditorium Projector Display (`ProjectorPage.jsx`)

- **Source Code:** `src/pages/ProjectorPage.jsx` (1,551 lines).
- **Target Role(s):** Physical auditorium audience, wall projectors, live stream overlays.
- **Core Workflow & Purpose:**  
  Broadcasts the pulse of the market to the entire venue. Features a dramatic split-flap board cycling between top market movers, breaking news alerts, round countdown timers, and team leaderboard positions.
- **Layout & Structure:**  
  High-impact, dark-room optimized layout:
  - Massive round countdown timer (`04:32 remaining in Round 2`).
  - High-visibility split-flap board for SAAMX Master Index.
  - Ticker crawl banner along the bottom viewport.
  - Full-screen breaking news takeover modal on high-priority flashes.
- **Data Sources & API Endpoints:**  
  WebSocket delta feed + RTDB `/stocks`, `/news`, `/meta`.
- **Critical UI/UX Weaknesses:**  
  Lacks full 4K scaling optimizations. When rendered on 3840×2160 displays, certain badges appear undersized.
- **Phase 6.1 Rebuild Standard:**  
  Implement CSS clamp-based fluid typography scaling (`clamp(1.5rem, 3vw, 4rem)`) and hardware-accelerated 3D split-flap flip transitions.

---

### 3.7 Console 07: Order Slip Verification (`OrderVerificationPage.jsx`)

- **Source Code:** `src/pages/OrderVerificationPage.jsx` (741 lines).
- **Target Role(s):** Floor Marshals, Pre-flight Slip Verification Clerks.
- **Core Workflow & Purpose:**  
  Acts as the pre-flight verification checkpoint before slips reach the exchange execution desk. Marshals inspect the physical slip, scan or enter the slip number, and verify that the student team has written a valid ticker, reasonable price limit, authorized team stamp, and valid order type.
- **Data Sources & API Endpoints:**  
  REST: `POST /api/orders/verify`, `GET /api/orders/pending-verification`.
- **Phase 6.1 Rebuild Standard:**  
  Streamline slip lookup with instant barcode/numeric auto-complete and visual validation checkmarks.

---

### 3.8 Console 08: Floor Operations & Devices (`FloorOperationsPage.jsx`)

- **Source Code:** `src/pages/FloorOperationsPage.jsx` (892 lines).
- **Target Role(s):** Operations Lead, IT Marshals.
- **Core Workflow & Purpose:**  
  Monitors physical trading floor infrastructure: active client connections per desk, paper slip queue density, Wi-Fi latency per workstation, and emergency desk reassignment.
- **Data Sources & API Endpoints:**  
  REST: `GET /api/admin/desks`, `POST /api/admin/desks/reassign`.
- **Phase 6.1 Rebuild Standard:**  
  Provide interactive physical desk layout map showing live queue depths per station.

---

### 3.9 Console 09: Floor Broker Terminal (`BrokerTerminal.jsx`)

- **Source Code:** `src/pages/BrokerTerminal.jsx` (682 lines).
- **Target Role(s):** Floor Brokers, Team Runners.
- **Core Workflow & Purpose:**  
  Assists teams in rapid price discovery, calculation of order value (Qty × Price = Total Cash Requirement), and routing to the shortest queue on the exchange floor.
- **Phase 6.1 Rebuild Standard:**  
  Integrate instant cash requirement calculator and physical slip printer/formatter.

---

### 3.10 Console 10: Media & News Publishing (`NewsPortalPage.jsx`)

- **Source Code:** `src/pages/NewsPortalPage.jsx` (814 lines).
- **Target Role(s):** Student Journalists, PR Marshals, Event Media Team.
- **Core Workflow & Purpose:**  
  Publishes official company quarterly reports, investigative leaks, regulatory scoops, and macroeconomic announcements. Supports drafting, editorial approval, and broadcast scheduling.
- **Data Sources & API Endpoints:**  
  REST: `GET /api/news`, `POST /api/news/publish`, `POST /api/news/leak`.
- **Phase 6.1 Rebuild Standard:**  
  Implement rich-text article drafting with leak-level tagging (`UNCONFIRMED RUMOR` vs `SEBI OFFICIAL RELEASE`).

---

### 3.11 Console 11: Public Leaderboard (`LeaderboardPage.jsx`)

- **Source Code:** `src/pages/LeaderboardPage.jsx` (563 lines).
- **Target Role(s):** Public Spectators, School Coaches, Teams.
- **Core Workflow & Purpose:**  
  Displays live standings, total net worth, round-over-round return on equity (ROE), and 1,000-point rubric progress. Supports anonymous mode to conceal school names during blind rounds.
- **Data Sources & API Endpoints:**  
  REST: `GET /api/leaderboard`, RTDB `/teams`.
- **Phase 6.1 Rebuild Standard:**  
  Add animated rank transitions and school medal tier badges (Gold/Silver/Bronze/Honorable).

---

### 3.12 Console 12: Stock Catalog Directory (`StockDirectoryPage.jsx`)

- **Source Code:** `src/pages/StockDirectoryPage.jsx` (728 lines).
- **Target Role(s):** All Roles, Research Teams.
- **Core Workflow & Purpose:**  
  Searchable directory of all 2,061 simulated securities. Provides industry sector classifications, market cap tiers, beta, historical volatility, and corporate background.
- **Phase 6.1 Rebuild Standard:**  
  Mandatory table virtualization (`@tanstack/react-virtual`) to guarantee 60 FPS scrolling through 2,061 entries.

---

### 3.13 Console 13: Forensic Audit Log (`AuditLogsPage.jsx`)

- **Source Code:** `src/pages/AuditLogsPage.jsx` (642 lines).
- **Target Role(s):** SEBI Officers, System Administrators.
- **Core Workflow & Purpose:**  
  Provides an immutable forensic timeline of all actions taken across the platform: order claims, slip validations, balance changes, circuit breaker halts, and administrative overrides.
- **Data Sources & API Endpoints:**  
  REST: `GET /api/admin/audit?limit=200&cursor=:cursor`.
- **Phase 6.1 Rebuild Standard:**  
  Add advanced structured filtering (by actor, desk, team, severity) and CSV export for post-event grievance arbitration.

---

### 3.14 Console 14: System Infrastructure Status (`SystemStatusPage.jsx`)

- **Source Code:** `src/pages/SystemStatusPage.jsx` (512 lines).
- **Target Role(s):** IT Team, Infrastructure Marshals.
- **Core Workflow & Purpose:**  
  Monitors node process memory usage, active WebSocket connections, Firebase RTDB sync health, response latency, and database write queues.
- **Data Sources & API Endpoints:**  
  REST: `GET /api/health`, `GET /api/system/metrics`.
- **Phase 6.1 Rebuild Standard:**  
  Add auto-ping heartbeat checker with visual red/green health indicators for Express, Firebase, and WebSocket subsystems.

---

## 4. Standalone Screens & Auxiliary Dialogs

### 4.1 Authentication Gateway (`LoginPage.jsx`)
- **Source Code:** `src/pages/LoginPage.jsx` (340 lines).
- **Purpose:** Unified authentication portal supporting dual pathways:
  1. *Student Team Login:* School selection dropdown, Team ID, Team Passcode.
  2. *Exchange Staff & Officer Login:* Username (`@sridhara`, `@clerk_1`, `@sebi_lead`), scrypt Password.
- **Phase 6.1 Standard:** Clear role-switcher pill, password visibility toggle, accessible error alerts with zero secret leakage.

### 4.2 Pre-Event Registration (`RegistrationPage.jsx`)
- **Source Code:** `src/pages/RegistrationPage.jsx` (591 lines).
- **Purpose:** Onboarding portal used prior to event day to enroll student teams, capture member names, assign school codes, and allocate starting capital.
- **Phase 6.1 Standard:** Multi-step wizard with client validation and printable confirmation passes.

### 4.3 Public Landing Portal (`PublicLandingPage.jsx`)
- **Source Code:** `src/pages/PublicLandingPage.jsx` (481 lines).
- **Purpose:** Welcome portal for spectators and participants before simulation rounds begin. Features event schedule, rulebook download, and floor directory.
- **Phase 6.1 Standard:** Institutional heritage typography and countdown clock to Round 1 opening bell.

### 4.4 Equity Profile Modal (`CompanyProfileModal.jsx`)
- **Source Code:** `src/components/CompanyProfileModal.jsx` (450 lines).
- **Purpose:** Full-screen modal launched when a user clicks any stock ticker across the platform. Displays 5-round price history, financials, order depth, and related news.
- **Phase 6.1 Standard:** Focus trapping, ESC key listener, seamless responsive presentation on mobile and desktop.

---

## 5. Status of Legacy & Superseded Files

The following 5 files in `src/pages/` were identified as remnants of earlier architectural iterations:
1. `VerificationPage.jsx` $\to$ Superseded by `OrderVerificationPage.jsx`.
2. `BullTerminal.jsx` $\to$ Consolidated into `ParticipantTerminal.jsx` (Phase 1).
3. `BearTerminal.jsx` $\to$ Consolidated into `ParticipantTerminal.jsx` (Phase 1).
4. `BullBearDebatePage.jsx` $\to$ Consolidated into `NewsPortalPage.jsx` / `ParticipantTerminal.jsx`.
5. `NewsAnchorConsole.jsx` $\to$ Superseded by `NewsPortalPage.jsx`.

> [!NOTE]
> In Phase 6.1, these legacy components will remain safely in place or be converted to clean re-exports of their authoritative counterparts to prevent breaking any legacy deep links.

---

## 6. Summary Checklist for Phase 6.1 Page Rebuild

- [ ] `ParticipantTerminal.jsx`: Virtualize stock tables and add paper slip preview.
- [ ] `ExchangePage.jsx`: Decompose 1,435-line monolith into dedicated queue and execution components; implement keyboard-first workflow.
- [ ] `AdminPage.jsx`: Split 3,762-line file into 5 modular tab components; isolate destructive controls.
- [ ] `SebiPage.jsx`: Remove direct Firebase mutations; route all enforcement through REST.
- [ ] `ProjectorPage.jsx`: Optimize 4K fluid scaling and hardware-accelerate split-flap board.
- [ ] Universal: Ensure loading skeletons, error boundaries, and offline warnings are active on all 14 consoles.
