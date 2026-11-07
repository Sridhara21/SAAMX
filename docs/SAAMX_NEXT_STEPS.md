# SAAMX — Next Steps & Actionable Roadmap

**Owner:** SAAMX Lead Coding Agent  
**Last Updated:** 2026-10-13  

---

## Prioritized Implementation Roadmap

### Phase 1: Exchange Desk Consolidation & Workflow Streamlining
- [x] **Consolidate Order Review:** Updated `ExchangePage.jsx` to natively incorporate physical paper slip review, signature confirmation, return-for-correction modal with mandatory reason, and distinct execution controls directly within the unified desk queue.
- [x] **Retire Standalone Verification Desk Navigation:** Removed `Verification Desk` tab from navigation in `src/App.jsx`. Routed legacy `#/verification` and `#/verification-desk` paths seamlessly to `ExchangePage` as backward-compatible aliases.
- [x] **Update Desk Roles & Permissions:** Updated `ROLE_PERMISSIONS` in `server.js` granting `orders.verify` and `orders.return_for_correction` to `operator_x` and `exchange`. Configured `getDefaultDeskForRole('verification')` to route to `#/exchange`.
- [x] **Prevent Duplicate Execution & Cross-Team Manipulation:** Hardened atomic state checks in `server.js`. Duplicate execution calls return HTTP 400 without cash/holding modifications. Added team ownership checks on `/orders/resubmit` and `/orders/cancel`.
- [x] **Preserve Data, Backups & Audit History:** Created pre-migration state snapshot in `backups/`. Ensured all historical audit records remain intact.
- [x] **Run Regression Suite:** Created and executed `test-consolidated-exchange-desk.js` (11/11 passed), `test-order-verification-advisor.js` (10/10 passed), and `test-final-suite.js` (5/5 passed). Verified Vite production build (`npm.cmd run build`) passes cleanly.

---

### Phase 2: Design System & Responsive Expandable Sidebar
- [x] **Sidebar Component (`src/components/Sidebar.jsx` & `Sidebar.css`):** Built a modern, collapsible sidebar supporting:
  - Expanded state (logo, 5 section groups, full labels, role badges, collapse toggle)
  - Collapsed state (icon-only rail with accessible floating tooltips and `Ctrl+B` shortcut)
  - Responsive drawer for mobile and tablet screens (< 1024px) with backdrop overlay and escape key listener
  - Role-based route filtering across 9 distinct roles with clean omission of empty sections
  - Active route highlighting supporting deep links and legacy verification aliases
- [x] **Taxonomy Module (`src/lib/navigationConfig.js`):** Extracted navigation definitions and role filter functions for modular reusability and headless testability.
- [x] **Integrate into `src/App.jsx`:** Replaced crowded 17-tab horizontal navigation with the responsive sidebar and dynamic layout shell (`.saamx-app-shell.expanded` / `.collapsed`) preventing table/dialog clipping.
- [x] **Preserve Compatibility:** Kept legacy `#/verification` and `#/verification-desk` deep links mapped to Exchange Desk with active state highlighting.
- [x] **Run Verification Suites:** Built Vite production bundle (83 modules transformed, 0 errors). Passed `test-sidebar-navigation.js`, `test-consolidated-exchange-desk.js`, and `test-final-suite.js`.

---

### UI/UX Excellence Initiative: Original Light Theme First + Complete Dark Theme Alternative
- [x] **Preserve Original Light Theme as Primary Default:** Retained refined financial heritage palette (`#F7F5EE` paper canvas, `#FFFFFF` cards, `#845508` antique brass, `#080A0E` ink) as strict default for new visits and unauthenticated users.
- [x] **Complete Dark Theme Alternative:** Engineered high-tech terminal dark palette (`#070A0F` obsidian canvas, `#0E1626` elevated cards, `#00F2FE` cyan accents, `#D4AF37` radiant gold, `#10B981` emerald, `#EF4444` crimson, `#F8FAFC` slate text).
- [x] **Zero-Flash Synchronous Head Script:** Embedded synchronous inline script in `index.html` head reading `localStorage.getItem('saamx_theme') || 'light'` and applying `data-theme` attribute before first paint.
- [x] **Theme Infrastructure (`src/context/ThemeContext.jsx`):** Created `ThemeProvider` with `useTheme` hook, local storage persistence, and `saamx_theme_changed` custom event dispatching.
- [x] **Accessible Theme Toggles (`src/components/ThemeToggle.jsx`):** Embedded in top App Header and Sidebar Footer (supporting standard and compact modes).
- [x] **Dual-Theme Sidebar (`src/components/Sidebar.css`):** Scoped CSS variables ensuring sidebar renders with crisp white/brass styling in Light mode and glowing obsidian/cyan styling in Dark mode.
- [x] **Modal & Drawer Theme Harmonization:** Replaced hardcoded `#FFFFFF` backgrounds with `var(--color-surface)` in `ExchangePage.jsx` modals and `CompanyProfileModal.jsx`.
- [x] **Legacy Variable Compatibility Aliases:** Mapped legacy CSS variables (`--card-bg`, `--border-soft`, `--navy-900`, `--gold-royal`, `--green-emerald`, `--red-crimson`, etc.) to base tokens in `src/index.css`.
- [x] **Automated Test Suite:** Created `test-theme-system.js` with 6 automated tests. Passed 100%. Production build passes with 85 modules transformed.

---

---

### Phase 3: Multi-Page Staff Access & Personnel Management
- [x] **Personnel & Access Management Page (`PersonnelManagementPage.jsx`):** Developed full-featured administration page (`#/personnel`) with:
  - Metric cards (Total Staff, Active Personnel, Multi-Page Operators, Deactivated Accounts).
  - Search and filter bar (search by name/username/staffId, filter by role, filter by status).
  - Staff directory table with interactive badges, department tags, and accessible actions.
  - Provision Staff Modal supporting multi-page selection (`selectedPages`), granular permissions matrix, and strict zero-email/phone rule.
  - Edit Access Modal to update roles, display names, departments, assigned pages, and granular permissions.
  - Deactivate Staff Modal with immediate session revocation and confirmation guard.
  - Reset Password Modal with authorized in-app credential updates.
- [x] **Permissions Architecture & Endpoints (`server.js`):**
  - Granular permissions matrix (`PERMISSION_DEFINITIONS`: 36 permissions across 11 functional domains).
  - Role baseline templates (`ROLE_PERMISSIONS`) and canonical page mapping (`PAGE_PERMISSIONS`).
  - Authoritative effective permissions resolver (`getEffectivePermissions`) honoring explicit grants.
  - Session token binding with `personnelId`, real-time status check, and instant revocation upon deactivation.
  - REST endpoints: `GET /api/permissions/matrix`, `GET /api/personnel`, `POST /api/personnel`, `PUT /api/personnel/:id`, `POST /api/personnel/:id/status`, `POST /api/personnel/:id/reset-password`.
- [x] **Separation of Page Visibility from Sensitive Actions:**
  - Granular server-side action gates in `authMiddleware`: order execution (`exchange.execute`), order verification (`orders.verify`), order rejection (`exchange.reject`), market control (`market.control`), scenario triggers (`scenarios.trigger`), and result approval/publication (`results.approve`).
  - Page access grants visibility without automatically conferring high-risk execution powers.
- [x] **Super-Admin Master Safeguards:**
  - Hardened protections preventing standard admins from demoting, disabling, or modifying Sridhara's super-admin master account (`USR_MASTER_01`).
  - Safeguard preventing deactivation or demotion of the last active super-admin or admin.
- [x] **Zero-Email Constraint & Data Isolation:**
  - Pure username and staff ID based credentials; zero email addresses or phone numbers collected or stored.
  - Multi-tenant participant team data isolation strictly enforced on the server.
- [x] **Automated RBAC Test Suite:**
  - Created `test-personnel-and-rbac.js` (12 automated tests covering matrix verification, credential sanitization, provisioning, multi-page login, least privilege, navigation visibility, account updates, super-admin safeguards, session revocation, password resets, audit logging, and state quarantine). Passed 100% (12/12).

---

### Phase 1 Consolidation: Application Navigation & Page Consolidation (Completed)
- [x] **Broker & Advisory Consolidation:** Merged `BullTerminal` (`#/bull-terminal`) and `BearTerminal` (`#/bear-terminal`) into `BrokerAdvisoryTerminal` (`#/advisor`) with sub-view tabs (`Advisory & Consultations`, `Bull Momentum Scanner`, `Bear Vulnerability Scanner`).
- [x] **Journalism & Anchor Consolidation:** Integrated `NewsAnchorConsole` into `JournalistPage` (`#/journalist`) with dual mode toggle (`Press Wire Editor` vs `Live Stage Teleprompter`).
- [x] **Unified Admin Console:** Consolidated Master Admin, Personnel Management, and Results & Scoring into `AdminPage` with 5 sub-pages (`Overview`, `Event Controls`, `Personnel & Access`, `Results & Scoring`, `Audit Logs`).
- [x] **Retired Redundant Desks:** Standalone Verification Desk (`#/verification`) and Bull-Bear Debate (`#/debate`) safely redirected to Consolidated Exchange Desk and Broker & Advisory Terminal.
- [x] **Navigation Configuration:** Streamlined `src/lib/navigationConfig.js` to 14 core navigation items across 5 logical sections.

---

### Phase 2: Complete Team Trading Workstation Redesign (Completed)
- [x] **Cohesive 4-Section Workstation:** Redesigned `ParticipantTerminal.jsx` with internal rail sub-navigation (`overview`, `market`, `portfolio`, `orders`).
- [x] **Section 1 — Team Overview (`TeamOverviewSection.jsx`):** Live team credentials, 4 delegate roles with student names, session phase indicator, authoritative financial cards, recent paper slips, and quick portal cards.
- [x] **Section 2 — Unified Market Overview & Intelligence (`MarketOverviewIntelligenceSection.jsx`):**
  - Market Snapshot: 4 major indices (`GLOBAL100`, `INDIA50`, `US100`, `UK100`) with SVG sparklines, market breadth pill, notable movers, and Landmark Venture IPOs spotlight banner (`OAI`, `STRP`, `CNVA`, `DISC`, `POLY`).
  - Securities Universe Explorer: real-time filtering across all 2,062 securities with multi-exchange support (`NSE`, `NASDAQ`, `NYSE`, `London Stock Exchange`, `Deutsche Boerse Xetra`).
  - Contextual Fundamentals Drawer: inline drawer showing key metrics, company profile, and tailored physical paper slip specimen guide.
  - Unified Intelligence Feed: chronological stream integrating corporate news, regulatory circulars (SEBI), monetary policy (RBI), sector trends, and floor advisor stances with authority attribution and status badges.
- [x] **Section 3 — Portfolio & Holdings (`PortfolioHoldingsSection.jsx`):**
  - Reconciled with authoritative server ledger. Dual P&L (realized vs unrealized), ROI %, multi-currency cash wallets (INR, USD, GBP, EUR), diversification breakdowns, and strictly zero digital execution buttons.
- [x] **Section 4 — Order History (`OrderHistorySection.jsx`):**
  - Physical paper trading ticket tracking (`ticketNumber`), 6 progression lifecycle badges, execution/rejection settlement details, expandable audit timeline, and `/api/orders/resubmit` return-for-correction modal.
- [x] **Routing & Verification:** Dual route aliases (`#/team` and `#/terminal`). Verified with `test-team-workstation.js` (7/7 passed) and clean Vite production build.

---

### Phase 3: Consolidated Floor & Staff Consoles (Completed)
- [x] **Consolidated Exchange Desk Operational Enhancements (`ExchangePage.jsx`):**
  - In-flight processing locks (`processingOrderIds` Set) to prevent concurrent double-clicks and race conditions during order ticket claiming, validation, execution, return, and rejection.
  - Keyboard accelerators: `Ctrl + Enter` intake submission shortcut with visual hint, plus global `Escape` key listener for review, return, and rejection modal dismissal.
  - Physical clearance desk workload meters: 5 clearance desk capacity tracking meters (Sandesh, Akshay, Aarush, Sridhara, Aksharaa) to balance slip intake queues.
  - Fixed starting capital fallback typo in `PortfolioPage.jsx` from 10L to ₹1 Crore.
- [x] **Floor Operations Console Modernization (`FloorOperationsDashboard.jsx`):**
  - Design token harmonization: eliminated hardcoded `#090D14` backgrounds in favor of standard SAAMX CSS variables (`var(--color-surface)`, `var(--color-surface-2)`, `var(--color-ink)`).
  - Real-time operational header with live session phase badge, exchange digital clock, and phase countdown.
  - Automated urgent system condition alert banner for high queue backlogs (>10 pending), telemetry anomalies, and emergency halts.
  - Confirmation-guarded market controls (PAUSE and RESUME modals) and operational directive broadcasting (`/api/news` with `category: 'Exchange'`).
  - Real-time live audit stream rendering authoritative entries from `state.auditLog`.
- [x] **Journalist & Live Announcement Console (`JournalistPage.jsx` & `NewsAnchorConsole.jsx`):**
  - Three distinct operational view modes: `📰 Press Wire & Bulletin Dispatch`, `🎭 Scenario Timeline Player (80 Steps)`, and `🎙️ Live Stage Teleprompter & Rundowns`.
  - Anti-duplicate publishing guards: added `isPublishing` locks and duplicate headline debounce detection to prevent duplicate broadcasts.
  - Explicit `[SIMULATION WIRE]` markers: automatic prefixing toggle and visual badges clearly demarcating simulation wire dispatches from external news.
  - Design token harmonization in `NewsAnchorConsole` with pro broadcast high-contrast teleprompter view.
- [x] **Broker & Advisory Terminal Refinement (`BrokerAdvisoryTerminal.jsx`):**
  - Educational non-execution boundary banner: prominent floor notice stating advisors formulate research, valuation models, and Bull/Bear theses, but cannot execute trades (physical paper slips must be submitted at Exchange Desk).
  - Design token harmonization: replaced hardcoded `#FFFFFF` backgrounds with `var(--color-surface)`.
  - Verified advisory badges: added `✓ VERIFIED ADVISORY DISPATCH` badges and data-backed rationale to dispatched referral signals.
- [x] **Admin & Audit Console Safeguards (`AdminPage.jsx`):**
  - Super-admin master re-seed safeguard: restricted disaster recovery re-seed execution strictly to `isSuperAdmin` (Sridhara).
- [x] **Automated Verification:**
  - Created `test-floor-operations-and-consoles.js` (7/7 passed).
  - Verified regression test suites (all passing: `test-team-workstation.js`, `test-consolidated-exchange-desk.js`, `test-sidebar-navigation.js`, `test-bull-bear.js`, `test-personnel-and-rbac.js`).
  - Verified clean Vite production build (`npm.cmd run build` — 90 modules transformed, 0 errors, 6.36s).

---

### Phase 4: Event Simulation Hardening, Desk-Level Access Control & Multi-Device Scalability (Completed)
- [x] **Dynamic Desk Assignment & Authoritative State:**
  - Decoupled physical clearance desks (`DESK_1` through `DESK_5`) from hardcoded operator mappings. Stored authoritatively in `state.orderDesks`.
  - Implemented REST APIs `GET /api/desks` (and alias `/api/order-desks`) and `POST /api/desks/assign` supporting operator assignment, team clearance binding, and automatic team load-balancing (`AUTO_BALANCE_TEAMS`).
  - Added desk station assignment to staff provisioning and editing workflows in `PersonnelManagementPage.jsx`.
- [x] **Strict Server-Side Desk-Level Authorization & Isolation:**
  - Enforced strict station boundaries in `server.js`: operators assigned to `DESK_1` cannot claim or action orders assigned to `DESK_2` (returns HTTP 403 Forbidden).
  - Client-supplied desk tampering in request payloads is rejected; operator identity and assigned desk are verified strictly from server session tokens.
  - Live session synchronization: `/api/auth/me` and session verification reflect live `assignedDesk` dynamically synchronized with `state.personnel` without requiring re-login.
  - Documented supervisory exceptions: super-admins, admins, Sridhara, and personnel with `desks.cross_operate` permission maintain floor-wide operational oversight.
- [x] **Station Binding Across Staff and Delegate Consoles:**
  - `ExchangePage.jsx`: Replaced static desk definitions with dynamic desk state from server. Locked desk switcher buttons to assigned station for non-supervisors. Added unassigned warning banner.
  - `FloorOperationsDashboard.jsx`: Live monitoring meters rendering active operators, queue sizes, and processed order counts dynamically across all 5 physical stations.
  - `RegistrationPage.jsx` & `AdminPage.jsx`: Team clearance intake desk displayed on official delegate credential slips and team management cards.
- [x] **Multi-Device Scalability & Performance (100–120 Concurrent Devices):**
  - **Lightweight Delta Broadcasting:** Pre-serializes focused delta payloads once per mutation rather than serializing the 2,062 securities universe 120 times per event, reducing per-event memory allocation by >99.9% and CPU time to <2ms.
  - **WebSocket Connection Hardening:** 30s ping/pong heartbeat, automatic zombie socket pruning, and payload size minimization.
  - **Compact State Persistence:** Replaced indented serialization in `saveState()` with compact JSON to eliminate disk I/O bottlenecks and V8 heap bloat.
  - **Atomic Concurrency Mutexes:** In-memory mutex map (`activeOrderLocks`) locks order IDs during async claim and execution operations, returning HTTP 409 Conflict if another operator attempts simultaneous operations on the same slip.
- [x] **Automated Verification:**
  - Created `test-desk-security.js` (10/10 tests passed covering dynamic assignment, isolation, 403 boundaries, and supervisory overrides).
  - Created `test-scalability-120-devices.js` (120 concurrent WebSocket connections established in 7.6s, heartbeats verified, broadcast propagation verified, atomic claim/execution stress testing passed).
  - Verified clean production build (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.86s).

---

## Live Event Operations & Deployment Readiness Checklist

### Pre-Event Simulation Day Setup
- [ ] **Physical Desk Station Mapping:** Label physical tables in the auditorium as Desk 1 through Desk 5. Assign 1 exchange clerk laptop per station.
- [ ] **Personnel Account Onboarding:** Pre-provision exchange clerks (`operator_x`), advisors (`advisor`), journalists (`journalist`), surveillance officers (`sebi`), and administrators in `PersonnelManagementPage.jsx`.
- [ ] **Station Assignment:** In `PersonnelManagementPage.jsx` or Onboarding, assign each clerk to their designated physical station (`DESK_1`..`DESK_5`).
- [ ] **Network Verification:** Confirm all participant laptops (20 teams) and staff consoles connect to the local server host IP over the local event Wi-Fi/LAN.
- [ ] **Projector & Split-Flap Setup:** Connect main hall display to `#/projector` and test full-screen index telemetry and simulated news takeovers.

### During Simulation Execution
- [ ] **Intake Slip Distribution:** Physical order slips submitted by student teams must have physical ticket numbers (`ticketNumber`) and route to their designated intake desk.
- [ ] **Market Automation Monitoring:** Verify market coordinator daemon in `FloorOperationsDashboard.jsx` (market open, phase shifts, breaking news triggers).
- [ ] **Surveillance Oversight:** SEBI officer monitors circuit breaker halts and unusual volume in `#/sebi`.

### Post-Simulation Closing & Scoring
- [ ] **Closing Bell Reconciliation:** At 15:30 closing freeze, all trading halts automatically.
- [ ] **Scoring Engine Verification:** In `AdminPage.jsx` (`Results & Scoring`), trigger final ledger mark-to-market reconciliation and generate 1,000-point multi-factor rankings.
- [ ] **Disaster Recovery Snapshot:** Final state snapshot automatically preserved in `backups/` directory.
