# SAAMX — Comprehensive Page & Console Inventory (Phase 5)

**Document Version:** 1.0.0  
**Phase:** 5 — Comprehensive Event-Readiness Audit  
**Date:** 2026-10-13  
**Auditor & Engineering Lead:** SAAMX Lead Coding Agent  
**Baseline Test Status:** 100% Pass across all 11 test suites  

---

## Executive Overview

This inventory provides an authoritative, evidence-based audit of every existing page, console, modal, and critical workflow within the SAAMX application. The application contains **14 primary navigation destinations** across 5 logical sections in the responsive sidebar, plus **6 essential standalone pages, modals, and workflow controllers**.

### Summary Matrix

| # | Route / Alias | Page Name | Section / Group | Target Role | File Location | Lines / Size | Current Status | Rebuild Priority |
|:---:|:---|:---|:---|:---|:---|:---:|:---:|:---:|
| **1** | `#/team`, `#/terminal` | Team Trading Workstation | Trading & Execution | `team`, `admin` | `ParticipantTerminal.jsx` + `src/components/team/*` | 2,898 lines / 137.1 KB | Verified Operational | High (UX Polish) |
| **2** | `#/exchange`, `#/verification` | Consolidated Exchange Desk | Trading & Execution | `operator_x`, `verification`, `admin` | `ExchangePage.jsx` | 1,435 lines / 67.1 KB | Verified Operational | High (Modularize) |
| **3** | `#/fx` | Spot Currency Desk | Trading & Execution | `operator_x`, `admin` | `CurrencyExchangePage.jsx` | 1,202 lines / 52.1 KB | Verified Operational | Medium |
| **4** | `#/market-watch` | Market Watch Explorer | Market & Intelligence | All Roles | `MarketWatchPage.jsx` | 1,605 lines / 79.2 KB | Verified Operational | Medium (Virtualize) |
| **5** | `#/market-intelligence` | Market Intelligence Feed | Market & Intelligence | `team`, `journalist`, `admin` | `MarketIntelligencePage.jsx` | 734 lines / 40.9 KB | Verified Operational | Low |
| **6** | `#/advisor`, `#/broker` | Broker & Advisory Terminal | Market & Intelligence | `advisor`, `admin`, `team` | `BrokerAdvisoryTerminal.jsx` | 970 lines / 49.3 KB | Verified Operational | Medium |
| **7** | `#/sebi` | SEBI Surveillance Desk | Surveillance & Oversight | `sebi`, `admin` | `SebiPage.jsx` | 1,454 lines / 68.0 KB | Verified Operational | High (De-Firebase) |
| **8** | `#/portfolio` | Portfolios Oversight | Surveillance & Oversight | `portfolio`, `admin` | `PortfolioPage.jsx` | 285 lines / 13.3 KB | Verified Operational | Low |
| **9** | `#/journalist`, `#/anchor` | Press Wire & Anchor Console | Surveillance & Oversight | `journalist`, `admin` | `JournalistPage.jsx` + `NewsAnchorConsole.jsx` | 1,322 lines / 59.5 KB | Verified Operational | Medium |
| **10** | `#/floor-ops` | Floor Operations Dashboard | Operations & Control | `operator_x`, `admin` | `FloorOperationsDashboard.jsx` | 707 lines / 35.7 KB | Verified Operational | High (Telemetry) |
| **11** | `#/admin`, `#/personnel` | Floor Director / Master Admin | Operations & Control | `admin`, `super_admin` | `AdminPage.jsx` + `PersonnelManagementPage.jsx` | 5,412 lines / 271.5 KB | Verified Operational | Critical (Decompose) |
| **12** | `#/results` | Competition Results & Scoring | Event & Overview | `judge`, `admin`, `team` | `ResultsPage.jsx` | 678 lines / 40.0 KB | Verified Operational | High (Audit View) |
| **13** | `#/portals`, `#/directory` | Portals Hub & Directory | Event & Overview | All Roles | `HomePage.jsx` | 490 lines / 22.6 KB | Verified Operational | Low |
| **14** | `#/projector` | Auditorium Projector Display | Event & Overview | Public Display | `ProjectorPage.jsx` | 1,551 lines / 66.8 KB | Verified Operational | High (TV / 4K Tuning) |
| **15** | `#/`, `#/home` | Public Landing Page | Standalone Shell | Unauthenticated | `PublicLandingPage.jsx` | 481 lines / 18.8 KB | Verified Operational | Low |
| **16** | `#/login` | Authentication Gateway | Standalone Shell | Unauthenticated | `LoginPage.jsx` | 340 lines / 11.4 KB | Verified Operational | Critical (Security) |
| **17** | `#/register` | Team Intake Registration | Standalone Shell | Unauthenticated | `RegistrationPage.jsx` | 591 lines / 30.2 KB | Verified Operational | Medium |
| **18** | Inline Modal | Company Fundamentals Drawer | Shared Component | All Roles | `CompanyProfileModal.jsx` | 450 lines / 19.5 KB | Verified Operational | Low |
| **19** | Inline Modal | Order Return & Resubmission | Shared Component | `team`, `operator_x` | `OrderHistorySection.jsx` | 210 lines / 9.2 KB | Verified Operational | Medium |
| **20** | Inline Modal | Personnel Provisioning & Edit | Shared Component | `admin`, `super_admin` | `PersonnelManagementPage.jsx` | 480 lines / 21.0 KB | Verified Operational | Medium |

---

## Detailed Page Inventories

### 1. Team Trading Workstation (`#/team`, `#/terminal`)
- **Target Role:** `team` (Investment House delegate teams `T01`–`T20`), `admin`
- **Main Purpose:** Unified, professional financial workstation providing portfolio monitoring, market screening, fundamental research, intelligence evaluation, and paper order tracking.
- **Existing Functionality:**
  - Internal navigation rail with 4 unified sections: `Team Overview`, `Market Overview & Intelligence`, `Portfolio & Holdings`, and `Order History`.
  - Full 2,062 securities universe explorer with multi-exchange filters (NSE, NASDAQ, NYSE, LSE, XETRA).
  - Chronological intelligence feed synchronizing corporate announcements, SEBI circulars, RBI macro indicators, sector trends, and Bull/Bear advisor theses.
  - Multi-currency cash wallets (INR, USD, GBP, EUR) and dual P&L (realized vs unrealized).
  - Physical paper slip tracking with ticket badges (`Awaiting Verification`, `Being Verified`, `Returned for Correction`, `Validated`, `Executed`, `Rejected`).
  - **Strict Non-Execution Model:** Zero participant-side digital order submission buttons.
- **Components & Dependencies:** `ParticipantTerminal.jsx`, `TeamOverviewSection.jsx`, `MarketOverviewIntelligenceSection.jsx`, `PortfolioHoldingsSection.jsx`, `OrderHistorySection.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `GET /api/state`, `POST /api/orders/resubmit`, `POST /api/orders/cancel`, WS events `ORDER_CLAIMED`, `ORDER_EXECUTED`, `ORDER_RETURNED`, `PRICE_UPDATE`.
- **Data Read/Modified:** Reads team wallet, holdings, order history, securities quotes; modifies resubmitted order parameters.
- **Observed Weaknesses:** `MarketOverviewIntelligenceSection.jsx` is 1,095 lines; table rendering for 2,062 securities can drop frame rates on low-end delegate laptops if virtual scrolling is disabled.
- **Rebuild Recommendation:** Retain existing 4-section architecture; implement react-window virtualization on the securities table.

---

### 2. Consolidated Exchange Desk (`#/exchange`, `#/verification`)
- **Target Role:** `operator_x` (Exchange Clerks), `verification`, `admin`, `super_admin`
- **Main Purpose:** Central physical trading floor operations desk handling paper order slip intake, signature inspection, validation, execution, and return for correction.
- **Existing Functionality:**
  - Physical slip intake form accepting `ticketNumber`, `teamCode`, `ticker`, `action` (BUY/SELL), `quantity`, `orderType`, and `limitPrice`.
  - In-flight processing locks (`processingOrderIds` Set) preventing double-clicks.
  - Physical clearance desk capacity meters across 5 stations (`DESK_1`..`DESK_5`).
  - Station lock: clerks assigned to Desk 1 cannot action tickets belonging to Desk 2.
  - Modals: Ticket Claim, Review & Validation, Return for Correction (with mandatory reason), Rejection (with mandatory reason).
  - Keyboard accelerators: `Ctrl + Enter` intake submission, `Escape` modal dismissal.
- **Components & Dependencies:** `ExchangePage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `POST /api/orders/submit`, `POST /api/order/claim`, `POST /api/order/action` (`VALIDATE`, `EXECUTE`, `RETURN_FOR_CORRECTION`, `REJECT`), `GET /api/desks`.
- **Data Read/Modified:** Reads queue, ledger, personnel desk bindings; mutates orders, team cash balance, and security float.
- **Observed Weaknesses:** Monolithic 1,435-line component with inline modal definitions causing full component re-renders on keystrokes.
- **Rebuild Recommendation:** Extract modals (`ClaimModal`, `ValidationModal`, `ReturnModal`) into discrete component files; preserve server-side desk isolation.

---

### 3. Spot Currency Desk (`#/fx`)
- **Target Role:** `operator_x` (FX Clearance Officers), `admin`
- **Main Purpose:** Real-time multi-currency exchange desk converting virtual INR into USD, GBP, and EUR to fund international stock purchases.
- **Existing Functionality:**
  - Real-time exchange rate matrix (USD/INR, GBP/INR, EUR/INR) with bid-ask spread.
  - Spot conversion calculator with live spread calculation.
  - Physical FX order slip queue with atomic settlement controls.
  - Audit trail of currency swaps with transaction IDs.
- **Components & Dependencies:** `CurrencyExchangePage.jsx`.
- **APIs & WebSocket Events:** `GET /api/fx/rates`, `POST /api/fx/rates`, `GET /api/fx/queue`, `POST /api/fx/exchange`, `POST /api/fx/queue-action`.
- **Data Read/Modified:** Reads team multi-currency wallets; debits source wallet and credits destination wallet.
- **Observed Weaknesses:** Inline styling with legacy dark-theme fallbacks; lacks a quick-calculator shortcut for standard ₹1 Lakh / ₹5 Lakh / ₹10 Lakh lots.
- **Rebuild Recommendation:** Modernize with design tokens; add one-click preset lot buttons.

---

### 4. Market Watch Explorer (`#/market-watch`)
- **Target Role:** All Roles (Universal Market Data)
- **Main Purpose:** High-density institutional quotes monitor and screening tool for all 2,062 securities across 5 exchanges.
- **Existing Functionality:**
  - Multi-exchange tabs: `NSE` (Indian Equities), `NASDAQ` & `NYSE` (US Equities), `LSE` (UK Equities), `XETRA` (German Equities).
  - Sector filters: Technology, Healthcare, Energy, Financials, Consumer, Industrials, Materials.
  - Real-time quote cards with price change %, day high/low, volume, volatility, and SVG sparkline.
  - Search by ticker symbol or company name with instantaneous client filtering.
- **Components & Dependencies:** `MarketWatchPage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `GET /api/state`, WS `PRICE_UPDATE`.
- **Data Read/Modified:** Read-only market quote stream.
- **Observed Weaknesses:** 1,605 lines in a single file; renders large DOM tree without virtualization; sparklines computed on every re-render.
- **Rebuild Recommendation:** Memoize sparkline generation; introduce table virtualization for smooth 60fps scrolling under 120-client load.

---

### 5. Market Intelligence Feed (`#/market-intelligence`)
- **Target Role:** `team`, `journalist`, `admin`
- **Main Purpose:** Curated news wire, regulatory bulletin stream, and sentiment analyzer tracking market catalysts.
- **Existing Functionality:**
  - Chronological news stream with sentiment badges (Bullish, Bearish, Neutral) and market impact percentages.
  - News categorization: Corporate Earnings, Regulatory (SEBI), Monetary Policy (RBI), Global Macro, Scandals.
  - Highlighting affected ticker symbols with direct links to fundamental research drawers.
- **Components & Dependencies:** `MarketIntelligencePage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `GET /api/intelligence/feed`, WS `NEWS_FLASH`, `ACT_TRIGGERED`.
- **Data Read/Modified:** Read-only news and catalyst stream.
- **Observed Weaknesses:** Overlaps in layout with the unified feed in `MarketOverviewIntelligenceSection.jsx`.
- **Rebuild Recommendation:** Streamline to focus on deep narrative analysis and historical timeline scrubbing.

---

### 6. Broker & Advisory Terminal (`#/advisor`, `#/broker`)
- **Target Role:** `advisor` (Stock Advisors), `admin`, `team`
- **Main Purpose:** Institutional research and advisory hub for publishing verified stock signals, market theses, and screening momentum vs vulnerabilities.
- **Existing Functionality:**
  - SAAMX-Verified Stock Advisors directory.
  - Signal dispatch console for authorized advisors (publishing BUY/HOLD/SELL calls with investment rationale).
  - Sub-views: `Advisory & Consultations`, `Bull Momentum Scanner`, `Bear Vulnerability Scanner`.
  - Non-execution educational boundary banner explicitly stating advisors cannot execute trades.
- **Components & Dependencies:** `BrokerAdvisoryTerminal.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `GET /api/advisor/referrals`, `POST /api/advisor/signal`, `POST /api/broker/bulletin`.
- **Data Read/Modified:** Reads referrals; mutates advisory bulletins and signal logs.
- **Observed Weaknesses:** Signal form lacks quantitative risk/reward ratio calculation fields.
- **Rebuild Recommendation:** Add structured valuation metric inputs to the signal publishing modal.

---

### 7. SEBI Surveillance Desk (`#/sebi`)
- **Target Role:** `sebi` (Market Surveillance Officers), `admin`
- **Main Purpose:** Real-time regulatory market surveillance, volatility anomaly detection, circuit breaker tracking, insider trading audit, and penalty enforcement.
- **Existing Functionality:**
  - Volatility circuit breaker alert log (L1 5%, L2 10%, L3 15% price movements).
  - Trading halt / resume controls (freezing individual securities or market-wide emergency halts).
  - Insider trade detection algorithms flagging unusual order volume before major news acts.
  - Penalty enforcement console: levying fines and suspensions against rule-violating teams.
- **Components & Dependencies:** `SebiPage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `POST /api/sebi/halt`, `POST /api/sebi/resume`, `GET /api/penalties`, `POST /api/penalties/create`.
- **Data Read/Modified:** Mutates security trading status (`Active` vs `HALTED`), levies penalties against team cash wallets.
- **Observed Weaknesses:** 1,454 lines; still contains direct Firebase references (`import { db } from '../lib/firebase'`) rather than using pure `apiFetch`.
- **Rebuild Recommendation:** Remove all legacy Firebase SDK imports; migrate 100% of surveillance mutations to `apiFetch`.

---

### 8. Portfolios Oversight (`#/portfolio`)
- **Target Role:** `portfolio` (Floor Judges / Portfolio Analysts), `admin`
- **Main Purpose:** High-level bird's-eye view of all 20 Investment Houses' capital allocation, diversification, and mark-to-market performance.
- **Existing Functionality:**
  - Master summary cards: Aggregate Capital, Total Cash, Total Equity, Market Turnover.
  - 20-team comparative cards showing cash vs securities breakdown, trade count, and unrealized P&L.
  - Team detail drawer displaying granular holdings list with cost basis and current market value.
- **Components & Dependencies:** `PortfolioPage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** `GET /api/state`, WS `ORDER_EXECUTED`, `TRADE_EXECUTION`.
- **Data Read/Modified:** Read-only authoritative ledger aggregation.
- **Observed Weaknesses:** Compact 285-line component, but lacks export to CSV capability for floor judges.
- **Rebuild Recommendation:** Add "Export Floor Valuation Snapshot (CSV)" button.

---

### 9. Press Wire & Anchor Console (`#/journalist`, `#/anchor`)
- **Target Role:** `journalist` (Press Floor Journalists & News Anchors), `admin`
- **Main Purpose:** Media production center for drafting news bulletins, controlling the 80-step market storyline, and driving the live stage teleprompter.
- **Existing Functionality:**
  - Three distinct operational modes:
    1. `📰 Press Wire & Bulletin Dispatch`: Breaking news composer with duplicate debouncing.
    2. `🎭 Scenario Timeline Player (80 Steps)`: Step-by-step controller for Project Phoenix market scenario.
    3. `🎙️ Live Stage Teleprompter & Rundowns`: High-contrast pro broadcast teleprompter view with scrolling news.
  - Automatic `[SIMULATION WIRE]` prefixing to prevent confusion with real-world news.
- **Components & Dependencies:** `JournalistPage.jsx`, `NewsAnchorConsole.jsx`.
- **APIs & WebSocket Events:** `POST /api/news`, `POST /api/events/trigger`, WS `NEWS_FLASH`.
- **Data Read/Modified:** Mutates `state.newsEvents` and advances scenario step counter.
- **Observed Weaknesses:** Scenario timeline player lacks an immediate "Rollback Step" button in case of accidental advance.
- **Rebuild Recommendation:** Add confirmation guard and step rollback capability to scenario player.

---

### 10. Floor Operations Dashboard (`#/floor-ops`)
- **Target Role:** `operator_x` (Floor Operations Leads), `admin`
- **Main Purpose:** Real-time mission control for floor coordination, session phase tracking, queue backlogs, market halts, and physical desk throughput.
- **Existing Functionality:**
  - Live session phase bar with exchange digital clock and countdown.
  - Urgent condition alerts (>10 pending slip backlog, telemetry anomalies).
  - Confirmation-guarded PAUSE / RESUME controls for trading pauses.
  - Real-time throughput meters across all 5 physical clearance desks (`DESK_1`..`DESK_5`).
  - Live authoritative audit stream rendering entries directly from `state.auditLog`.
- **Components & Dependencies:** `FloorOperationsDashboard.jsx`.
- **APIs & WebSocket Events:** `POST /api/market/control`, `GET /api/desks`, `GET /api/audit-log`.
- **Data Read/Modified:** Mutates market state (Open/Paused), broadcasts operational directives.
- **Observed Weaknesses:** Does not display connected WebSocket client count (vital telemetry during 120-device event).
- **Rebuild Recommendation:** Add "Active Connected Devices Meter" reading live client socket count from backend.

---

### 11. Floor Director / Master Admin Console (`#/admin`, `#/personnel`)
- **Target Role:** `admin`, `super_admin` (Sridhara - Floor Director)
- **Main Purpose:** Complete executive administrative console managing market configuration, staff personnel, disaster recovery, results approval, and master database state.
- **Existing Functionality:**
  - Unified 5-tab console:
    1. `Overview`: High-level system telemetry, active teams, trading volume, and system alerts.
    2. `Event Controls`: Market schedule, phase overrides, risk controls, and automated coordinator controls.
    3. `Personnel & Access`: Full personnel directory with multi-page access grants, desk station assignments, and deactivation controls (`PersonnelManagementPage.jsx`).
    4. `Results & Scoring`: Final valuation freeze, 1,000-point scoring recalculation, judging scorecards, and results publishing.
    5. `Audit Logs`: Filterable immutable audit trail of all security, ledger, and operational actions.
  - Super-admin master re-seed safeguard restricting disaster recovery resets to `USR_MASTER_01` (Sridhara).
- **Components & Dependencies:** `AdminPage.jsx`, `PersonnelManagementPage.jsx`, `CompanyProfileModal.jsx`.
- **APIs & WebSocket Events:** 28+ admin endpoints (`/api/admin/*`, `/api/personnel/*`, `/api/event/*`, `/api/results/*`).
- **Data Read/Modified:** Full read/write access across all state domains.
- **Observed Weaknesses:** `AdminPage.jsx` is 3,762 lines (202 KB) — the largest file in the codebase. Contains embedded inline tabs that should be independent modular components.
- **Rebuild Recommendation:** Decompose into 5 separate component files (`AdminOverviewTab.jsx`, `AdminEventControlsTab.jsx`, `AdminPersonnelTab.jsx`, `AdminResultsTab.jsx`, `AdminAuditTab.jsx`).

---

### 12. Competition Results & Scoring (`#/results`)
- **Target Role:** `judge`, `admin`, `team`, All Roles (when published)
- **Main Purpose:** Official scoring leaderboard and multi-factor evaluation system for championship standings.
- **Existing Functionality:**
  - 1,000-point multi-factor rubric breakdown:
    - Portfolio Risk & Drawdown Management: 300 pts
    - Net Realized & Unrealized Returns: 250 pts
    - Sector & Asset Diversification: 200 pts
    - Trading Decision Quality: 150 pts
    - Long-Term Growth Potential: 100 pts
  - Judging deliberation input and score normalization.
  - Official winner announcement podium and certificates export.
- **Components & Dependencies:** `ResultsPage.jsx`.
- **APIs & WebSocket Events:** `GET /api/leaderboard`, `POST /api/results/publish`, `GET /api/judging/scorecards`.
- **Data Read/Modified:** Reads finalized portfolios, calculates points, mutates published results.
- **Observed Weaknesses:** Lacks an interactive "What-If" preview simulator for judges prior to official publication.
- **Rebuild Recommendation:** Add a private judging deliberation staging mode with instant score recalculation.

---

### 13. Portals Hub & Directory (`#/portals`, `#/directory`)
- **Target Role:** All Roles
- **Main Purpose:** Central landing directory and console launcher for all staff and participant roles.
- **Existing Functionality:**
  - Interactive portal cards with role badges, descriptions, and direct deep-links.
  - Visual system health indicator and market phase pill.
- **Components & Dependencies:** `HomePage.jsx`.
- **Data Read/Modified:** Read-only navigation hub.
- **Observed Weaknesses:** 490 lines; contains redundant duplicate cards for legacy desks.
- **Rebuild Recommendation:** Clean up cards to reflect the 14 consolidated destinations.

---

### 14. Auditorium Projector Display (`#/projector`)
- **Target Role:** Public Main Hall Projector / TV Displays (No Authentication Required)
- **Main Purpose:** High-impact full-screen display for the main simulation hall, rendering indices, marquee ticker, emergency halts, and news takeovers.
- **Existing Functionality:**
  - Split-flap display animation (`SplitFlapText.jsx`) for index values and session phases.
  - Live scrolling bottom marquee ticker with prices and percentage changes.
  - Full-screen takeover overlay for emergency SEBI halts and landmark IPO announcements (8-second countdown).
  - Leaderboard rotation every 45 seconds during afternoon trading.
- **Components & Dependencies:** `ProjectorPage.jsx`, `SplitFlapText.jsx`.
- **APIs & WebSocket Events:** `GET /api/projector/snapshot`, WS `NEWS_FLASH`, `MARKET_HALT`, `IPO_LAUNCH`.
- **Data Read/Modified:** Read-only broadcast display.
- **Observed Weaknesses:** 1,551 lines; relies on legacy Firebase listeners alongside backend snapshots.
- **Rebuild Recommendation:** Remove Firebase listeners; optimize CSS animations for 60fps display on 4K projectors.

---

### 15. Public Landing Page (`#/`, `#/home`)
- **Target Role:** Unauthenticated Visitors
- **Main Purpose:** Event welcome screen, rules summary, countdown to opening bell, and portal login link.
- **Existing Functionality:** Refined financial heritage light theme with institutional branding, event schedule, and rules guide.
- **Components & Dependencies:** `PublicLandingPage.jsx`.

---

### 16. Authentication Gateway (`#/login`)
- **Target Role:** Unauthenticated Users
- **Main Purpose:** Single entry point for both student delegate teams and staff personnel.
- **Existing Functionality:**
  - Role selection pills (Delegate Team vs Staff Officer).
  - Team Code intake (`T01`–`T20`) with 4-digit PIN / password.
  - Staff Username intake with password.
  - Generic error messages ("Invalid username, PIN or password") preventing username enumeration.
  - HTTP 429 rate limit countdown timer rendering.
  - Session token creation and automatic routing to the default desk for the user's role.
- **Components & Dependencies:** `LoginPage.jsx`.
- **APIs:** `POST /api/auth/login`.

---

### 17. Delegate Registration Intake (`#/register`)
- **Target Role:** Unauthenticated Faculty Coordinators / Team Leads
- **Main Purpose:** Intake portal for newly arriving high-school teams strictly conforming to zero-email/phone privacy rules.
- **Existing Functionality:**
  - Captures Institution Name, House Name, Faculty Coordinator Name, and 4 Student Delegates with assigned roles (Lead Trader, Chief Analyst, Risk Manager, Macro Strategist).
  - Official printed delegate credential slip displaying assigned Intake Clearance Desk (`DESK_1`..`DESK_5`).
  - Quarantines unapproved teams until administrator approval in `AdminPage.jsx`.
- **Components & Dependencies:** `RegistrationPage.jsx`.
- **APIs:** `POST /api/register/complete`.

---

### 18. Company Profile Modal (Fundamental Research Drawer)
- **Target Role:** Universal Shared Modal across all pages
- **Main Purpose:** Contextual slide-out drawer providing company fundamentals, sector metrics, price history chart, and paper slip preparation guide for any clicked security.
- **Components & Dependencies:** `CompanyProfileModal.jsx`.
- **Data Read/Modified:** Reads security fundamentals from `universe_data.js` and live price from `state.securities`.

---

### 19. Order Return & Resubmission Modal
- **Target Role:** `team`, `operator_x`
- **Main Purpose:** Allows teams to correct physical paper order slip errors flagged by exchange clerks (e.g. adjust quantity, fix limit price) and resubmit the ticket.
- **Components & Dependencies:** Embedded in `OrderHistorySection.jsx` and `ExchangePage.jsx`.
- **APIs:** `POST /api/orders/resubmit`.

---

### 20. Personnel Provisioning & Editing Modal
- **Target Role:** `admin`, `super_admin`
- **Main Purpose:** Staff onboarding modal for provisioning individualized credentials, assigning physical desk stations (`DESK_1`..`DESK_5`), and granting granular permissions.
- **Components & Dependencies:** Embedded in `PersonnelManagementPage.jsx`.
- **APIs:** `POST /api/personnel`, `PUT /api/personnel/:id`.
