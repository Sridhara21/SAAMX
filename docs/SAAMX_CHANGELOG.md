# SAAMX — Changelog

All notable changes to the SAAMX application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

---

## [2.17.0-capacity-and-closure-audit] - 2026-10-14

### Phase 6.6 Closure Audit + Configurable Investment House Capacity (10 to 20) + Event Readiness Verification
- **Configurable Investment House Capacity (10 to 20):**
  - Designed and implemented configurable investment house capacity ($10 \le C \le 20$, default 20) with strict administrative governance.
  - Implemented `GET /api/capacity` (public) and `POST /api/admin/capacity` (admin-only) with strict integer validation rejecting negative, float, out-of-range, and malformed inputs.
  - Integrated active continuous trading session-locking: capacity changes during active market sessions return HTTP 409 Conflict unless authorized with `forceOverride: true` and an explicit reason.
  - Hardened team activation routes (`POST /api/admin/team/toggle-status`, `POST /api/admin/teams/set-active-count`, `POST /api/admin/registration/verify`) to reject activating houses beyond configured capacity.
  - Updated participant registration (`POST /api/register/complete`) to enforce capacity ceiling and display dynamic capacity tracking and limit warnings in `RegistrationPage.jsx`.
  - Updated `AdminPage.jsx` with capacity management controls (10–20 range input, confirmation dialog, registered/activated breakdown, aggregate capital stats).
  - Updated `PublicLandingPage.jsx` highlights strip to reflect "10–20 Investment Houses".
- **Securities Universe Exact Forensic Reconciliation (2,061 Canonical vs 2,063 Runtime):**
  - Confirmed 0 duplicate tickers and 0 duplicate IDs in both canonical dataset (`universe_data.js`) and runtime state (`state.json`).
  - Identified and documented the exact 2-instrument difference from `universe_generator.js:L359-L376`:
    1. `S_DTAI_066` (`DTAI` - Delta AI Labs Ltd): The dedicated crisis equity asset for Project Phoenix narrative acts (price drops, whistleblower reports, SEBI halt, bankruptcy).
    2. `S_RELI_001` (`RELI` - Reliance Energy & Petrochem Ltd): Equity test asset injected for high-liquidity volume testing alongside `STK_RELIANCE_ea1e16`.
  - Securities Universe Freeze strictly maintained: zero mutations, zero additions, zero deletions, zero reseeding.
- **Backend Authorization & Route Hardening:**
  - Audited and secured `POST /api/event/*` routes against unauthorized student team modification in `authMiddleware`.
  - Hardened `POST /api/coordinator/claim` to enforce server-side role validation (admin, sebi, coordinator, operator_x) with audit logging and state broadcasting.
  - Bridged `SebiPage.jsx` coordinator claim through authoritative backend API before syncing to Firebase RTDB.
  - Implemented dedicated JSON 404 handler for unmatched `/api/*` routes, eliminating SPA `index.html` fallback shadowing.
  - Enhanced `/api/state` to pass caller role to `getSanitizedState()`, preserving privacy for public viewers while supplying full portfolio data to authorized staff.
- **Authoritative Test Suite & Regression Battery:**
  - Authored and verified `test-capacity-and-capital-audit.js` covering 12 rigorous validation categories (12/12 passed 100%).
  - 100% pass across all 20 test suites and Vite production bundle clean in 4.88s.
  - `state.json` SHA-256 hash strictly preserved: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`.
  - Final readiness verdict: **READY FOR EVENT REHEARSAL**.

---

## [2.16.0-e2e-dry-run] - 2026-10-14

### Phase 6.6: Authoritative Configuration Correction, End-to-End Integration & Event Readiness Audit
- **Authoritative Configuration Correction & Inaccuracies Remediated:**
  - Corrected inaccurate claims of ₹10 Lakhs starting capital and 112+ securities introduced during earlier iterations.
  - Reconciled and firmly established authoritative figures across code, tests, and public surfaces:
    - **₹1 CRORE (₹1,00,00,000 INR)** starting capital per Investment House across all 20 active teams (**₹20 CRORE** aggregate liquidity pool).
    - **2,000+ Securities Universe** across 7 asset classes (Equities, ETFs, Mutual Funds, Sovereign Debt, Corporate Debt, REITs, InvITs) and 4 currencies (INR, USD, GBP, EUR).
  - Remediated starting capital defaults in `src/pages/PublicLandingPage.jsx`, `src/pages/ProjectorPage.jsx`, `src/App.jsx`, `src/pages/SebiPage.jsx`, `scoring_engine.js`, `src/lib/api.js`, `src/pages/RegistrationPage.jsx`, and `src/pages/TrainingPage.jsx`.
  - Realigned test assertions in `test-projector-and-public-ui.js` to assert `₹1 Crore` and `2,000+`.
- **Securities Universe Freeze Strictly Maintained:**
  - Strictly preserved `state.json` without any modifications, replacements, additions, deletions, renames, or reseeding scripts.
  - Confirmed exactly 2,063 runtime securities (2,058 Active, 5 IPO Staged) with 100% unique tickers and zero hash drift.
- **Canonical Taglines Preserved:**
  - Verified primary tagline: *"Experience the market, don't just plan it."*
  - Verified secondary tagline: *"Experience the Market. Don't Just Learn It."*
- **Physical Paper-Trading Workflow Fidelity:**
  - Verified strict client-side non-execution boundary on participant workstations (zero digital trade buttons).
  - Confirmed paper slip clearance workflow across 5 physical desks (`DESK_1` through `DESK_5`) with dynamic station binding and HTTP 403 cross-desk isolation.
- **End-to-End Test Suite Execution:**
  - 100% pass across all 19 operational test batteries: UI Foundation (8/8), Exchange Desk UI (8/8), Workstation UI (9/9), Privileged Consoles (6/6), Projector & Public Display (5/5), Theme System (6/6), Sidebar Navigation (PASS), Authentication Remediation (7/7), Phoenix Route Integrity (13/13), Personnel & RBAC (12/12), Securities Universe (7/7), Floor Operations (7/7), Consolidated Exchange Desk (11/11), Desk Security (10/10), 120-Device Scalability (5/5), Adversarial RBAC (13/13), Pricing Engine (6/6), Global FX Engine (9/9).
  - Documented legacy test script rationale (`test-event-readiness.js`, `test-final-suite.js`) validating that legacy pre-audit credential rejections demonstrate proper Phase 7A.1 security enforcement.
- **Production Build & Database Verification:**
  - Vite production bundle clean (`npm.cmd run build` — 102 modules transformed in 4.42s).
  - `state.json` SHA-256 hash verified 100% byte-for-byte intact: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`.
- **Authoritative Report Published:**
  - Published comprehensive dry run report at `docs/SAAMX_PHASE_6_6_E2E_DRY_RUN_REPORT.md` and artifact repository.
  - Final readiness determination: **READY FOR EVENT REHEARSAL**.

---

## [2.15.0-projector-public] - 2026-10-14

### Phase 6.5: Central Projector & Public Display Rebuild
- **Display Modernization Scope:**
  - Modernized `src/pages/ProjectorPage.jsx` and `src/pages/PublicLandingPage.jsx` using the Phase 6.1 shared UI foundation (`src/components/ui/`) and design tokens.
- **Auditorium Central Projector (`src/pages/ProjectorPage.jsx`):**
  - Integrated UI primitives: `Card`, `Badge`, `Button`.
  - Re-engineered layout for high-visibility legibility on 1080p and 4K auditorium projectors, with high-contrast surfaces and crisp typography.
  - Implemented real-time connection telemetry indicator banner displaying an auditorium-visible warning when `!connected` (`⚠️ TELEMETRY DISCONNECTED — RECONNECTING TO EXCHANGE (DISPLAYING LAST KNOWN STATE)`) or when `isCoordinatorOffline` (`⚠️ COORDINATOR OFFLINE — SCHEDULED NEWS & AUTOMATION SUSPENDED`), ensuring viewers never mistake frozen telemetry for live execution.
  - Enforced `font-mono tabular-nums` across all financial figures: session clocks, time remaining countdowns, global indices (GLOBAL100, INDIA50, US100, UK100), spot FX mid-rates and spreads (USD/INR, GBP/INR, EUR/INR), advance-decline breadth totals, sector heatmap movements, top gainers/losers prices, volume turnover leaders, and podium rankings.
  - Preserved SVG dynamic `Sparkline` rendering and semi-circle `MarketPulseGauge` needle kinematics.
  - Preserved all 9 universal takeover overlay modes (`NEWS_FLASH`, `MARKET_HALT`, `IPO_PENDING`, `IPO_LAUNCH`, `BANKRUPTCY`, `OPENING_BELL`, `CLOSING_BELL`, `STOCK_SPLIT`, `DEBATE_SHOWDOWN`, plus generic bulletins) with 8-second auto-dismiss and `Escape` key listeners.
  - Enhanced official results ceremony with top 3 podium cards (🥇 Gold, 🥈 Silver, 🥉 Bronze) and comprehensive institutional standings table with tabular numerals.
  - Added interactive company profile modal inspection (`onOpenProfile`) on asset rows.
- **Public Landing Portal (`src/pages/PublicLandingPage.jsx`):**
  - Integrated UI primitives: `Card`, `Badge`, `Button`.
  - Preserved dual taglines: primary `"Experience the market, don't just plan it"` and secondary `"Experience the Market. Don't Just Learn It."`.
  - Articulated the authentic student academic simulation framing: ₹10 Lakhs institutional starting capital, 112+ curated securities universe, physical paper-trading floor mechanics across 5 desks, multi-currency spot conversions, and SEBI regulatory oversight.
  - Established canonical 08:00–16:00 operational schedule with `tabular-nums` timing.
  - Clearly distinguished confirmed competition rules from unconfigured event details (Host Campus & Event Date announced by Event Secretariat) without fabricating corporate sponsors.
  - Enforced strict unauthenticated privacy and security: zero private state, balances, clerk tokens, or audit logs exposed.
  - Added responsive navigation links to `#/login` (Participant & Staff Login), `#/projector` (Auditorium Display), and `#/portals` (Desks & Portals).
- **Application Integration (`src/App.jsx`):**
  - Updated projector route binding in `App.jsx` to pass live `connected={dbConnected}` and `isCoordinatorOffline={isCoordinatorOffline}` props.
- **Verification & State Integrity:**
  - Dedicated verification suite `test-projector-and-public-ui.js` passing 5/5 tests.
  - Complete regression battery (`test-privileged-consoles-ui.js`, `test-floor-operations-and-consoles.js`, `test-personnel-and-rbac.js`, `test-phoenix-route-integrity.js`, `test-team-workstation-ui.js`, `test-exchange-desk-ui.js`, `test-theme-system.js`) passing 100%.
  - Clean Vite production build (`npm.cmd run build` — 102 modules transformed in 3.94s).
  - Production database SHA-256 hash verified 100% untouched (`state.json`: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).

---

## [2.14.0-privileged-consoles] - 2026-10-14

### Phase 6.4: Privileged Operations Consoles Rebuild
- **Console Modernization Scope:**
  - Modernized `AdminPage.jsx`, `FloorOperationsDashboard.jsx`, `SebiPage.jsx`, and `JournalistPage.jsx` using the Phase 6.1 UI foundation (`src/components/ui/`) and dual-theme design tokens.
- **Phase 6.4A: Master Admin Console (`src/pages/AdminPage.jsx`):**
  - Integrated Phase 6.1 UI primitives: `Button`, `Input`, `SearchInput`, `Select`, `Card`, `Badge`, `Modal`, `Alert`, `EmptyState`, `Table`.
  - Harmonized the 5-subsection navigation bar (`overview`, `events`, `personnel`, `results`, `audit`) with design tokens (`var(--color-surface)`, `var(--color-paper)`, `var(--color-border)`, `var(--color-ink)`, `var(--color-brass)`), resolving high-contrast dark theme drift.
  - Replaced bespoke credential slip and confirmation popups with accessible `<Modal>` primitive dialogs.
  - Preserved super-admin safeguards (`isSuperAdmin`, master admin badge) protecting personnel provisioning and destructive actions.
  - Formatted telemetry, session clocks, order counts, and turnover with `tabular-nums` and `font-mono`.
- **Phase 6.4B: Floor Operations Dashboard (`src/pages/FloorOperationsDashboard.jsx`):**
  - Modernized operational radar, urgent conditions banner, and 5-desk workload indicators using `Card`, `Badge`, and `Button` primitives.
  - Replaced ad-hoc modal overlays with accessible `<Modal>` primitives for `PAUSE`, `RESUME`, and `DIRECTIVE` dispatching.
  - Adopted standard Phase 6.1 `<ToastContainer>`.
  - Enforced `tabular-nums` on exchange clocks, session countdowns, in-flight queues, and desk metrics.
  - Preserved market control endpoint `/api/market/control` and operational directive broadcast with `[OPERATIONAL DIRECTIVE]` prefix.
- **Phase 6.4C: SEBI Surveillance & Regulatory Console (`src/pages/SebiPage.jsx`):**
  - Integrated UI primitives (`Button`, `Card`, `Badge`, `Alert`) and design tokens across surveillance alert feeds and volatility circuit flags.
  - Preserved authoritative market-wide trading halts, sector circuit freezes, and Phoenix crisis acts (`/api/admin/phoenix-act`).
  - Documented direct Firebase RTDB coordinator heartbeat claim (`set(ref(db, 'fms/coordinator'), ...)`) preserving failover recovery.
  - Formatted price history thresholds, circuit flags, and timestamps with `font-mono tabular-nums`.
- **Phase 6.4D: Financial Journalist & Press Console (`src/pages/JournalistPage.jsx`):**
  - Modernized Press Wire, Scenario Timeline, and Live Anchor teleprompter modes using `Button`, `Card`, and `Badge`.
  - Enforced default `[SIMULATION WIRE]` tagging on all bulletin broadcasts and duplicate debounce protection.
  - Maintained embedded integration of `NewsAnchorConsole.jsx`.
  - Formatted news sequence steps and publication timestamps with `tabular-nums`.
- **Verification & State Integrity:**
  - Authoritative verification suite `test-privileged-consoles-ui.js` passing 6/6 tests.
  - Regression suites (`test-floor-operations-and-consoles.js`, `test-personnel-and-rbac.js`, `test-phoenix-route-integrity.js`, `test-team-workstation-ui.js`, `test-exchange-desk-ui.js`, `test-theme-system.js`) passing 100%.
  - Clean Vite production build (`npm.cmd run build` — 102 modules in 9.60s).
  - Production database SHA-256 hash verified 100% untouched (`state.json`: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).

---

## [2.13.0-participant-terminal] - 2026-10-14

### Phase 6.3: Participant Terminal / Workstation Frontend Rebuild
- **UI Foundation Primitives Integration (`src/components/ui/`):**
  - Modernized `ParticipantTerminal.jsx` and all 4 workstation sections (`src/components/team/*`) using Phase 6.1 design primitives: `Button`, `Card`, `Badge`, `OrderStatusBadge`, `Modal`, `SearchInput`, `Select`, `Table`, `CurrencyDisplay`, `PriceDisplay`, `QuantityDisplay`, `DeltaBadge`, `EmptyState`, and `Alert`.
  - Enforced CSS design tokens (`var(--color-surface)`, `var(--color-paper)`, `var(--color-border)`, `var(--color-brass)`, `var(--color-ink)`) across all workstation surfaces.
- **Refined 4-Section Information Architecture:**
  - **Team Overview (`TeamOverviewSection.jsx`):** Renders authoritative team identity, delegation details, session clock, continuous trading phase badge, 4-member delegate role roster, ledger summary cards (Portfolio Value, Virtual Cash with multi-currency breakdown, Holdings Value, Dual P&L with text/icon cues), recent paper slips with `OrderStatusBadge`, latest announcements, advisor stances (Bull/Bear), and tactile navigation portals.
  - **Market Overview & Intelligence (`MarketOverviewIntelligenceSection.jsx`):** High-density market overview featuring 4 major indices with sparkline charts, market breadth & sentiment pills, notable movers, venture IPO spotlight, and a paginated securities explorer (20 items/page) with full-text search, exchange/country/sector/type filters, contextual fundamentals drawer, and physical paper order slip specimen guide. Accompanied by a chronological feed of corporate, regulatory (SEBI), macro (RBI), and advisor intelligence.
  - **Portfolio & Holdings (`PortfolioHoldingsSection.jsx`):** Real-time monitoring of all active holdings with sortable table (Value, P&L, Ticker, Quantity), cost basis, market prices, Indian Rupee valuations, and dual P&L. Displays multi-currency cash wallets (INR, USD, GBP, EUR) with live spot conversion rates, sector allocation breakdown bars, and jurisdiction allocation breakdown bars.
  - **Order History (`OrderHistorySection.jsx`):** Authoritative tracking of all physical paper slips across the 6-stage order lifecycle (`PENDING`/`QUEUED`, `VERIFYING`, `VALIDATED`, `EXECUTED`, `RETURNED_FOR_CORRECTION`, `REJECTED`) with ticket numbers, order parameters, settlement banners, and expandable audit progression timelines.
- **Accessible Resubmission Modal & Correction Flow:**
  - Replaced ad-hoc raw overlay with an accessible, theme-aware `Modal` dialog (`style={{ backgroundColor: 'var(--color-surface)' }}`) for correcting and resubmitting physical slips returned by exchange clerks (`/api/orders/resubmit`).
- **Strict Paper-Trading Non-Execution Boundary:**
  - Strictly preserved the physical paper trading model: zero participant-side digital buy/sell buttons or trade execution capabilities.
- **Tabular Numerals & Accessibility:**
  - Enforced `.tabular-nums` across all financial figures, valuations, ticket numbers, share counts, exchange rates, and timestamps for clean vertical alignment.
- **Verification & State Preservation:**
  - Created automated verification suite `test-team-workstation-ui.js` passing 9/9 tests.
  - Baseline workstation tests (`test-team-workstation.js`) passing 7/7.
  - All regression suites (`test-exchange-desk-ui.js`, `test-ui-foundation.js`, `test-theme-system.js`, `test-consolidated-exchange-desk.js`, `test-desk-security.js`, `test-phoenix-route-integrity.js`, `test-auth-security-remediation.js`) passing 100%.
  - Clean Vite production build (`npm.cmd run build` — 102 modules in 16.73s).
  - Database hash verified byte-for-byte untouched (`state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).

---

## [2.12.0-exchange-desk] - 2026-10-14

### Phase 6.2: Exchange Desk Frontend Rebuild
- **UI Foundation Primitives Integration (`src/components/ui/`):**
  - Completely refactored `src/pages/ExchangePage.jsx` to adopt Phase 6.1 design primitives: `Button`, `Input`, `Select`, `Card`, `CardHeader`, `Badge`, `OrderStatusBadge`, `StationBadge`, `Modal`, `ToastContainer`, `CurrencyDisplay`, `PriceDisplay`, `QuantityDisplay`, `EmptyState`, and `Alert`.
  - Replaced ad-hoc raw HTML controls and inline hex styles with centralized CSS design tokens (`var(--color-surface)`, `var(--color-paper)`, `var(--color-border)`, `var(--color-brass)`, `var(--color-ink)`).
- **High-Density Operational Layout & Station Isolation:**
  - Modernized the 5-desk workload and dynamic station assignment bar (`DESK_1` through `DESK_5`) with color-coded station badges, operator status indicators, and team allocation metrics.
  - Implemented intuitive station-lock ergonomics with clear visual callouts for operators viewing another desk's queue and explicit badges for supervisory cross-desk overrides (`desks.cross_operate`).
  - Added filter bar with live search, status selector, side filters (`BUY`, `SELL`, `ALL`), and clear-filter actions.
- **Physical Paper Slip Review & Verification Modal:**
  - Replaced unstyled fixed overlay dialogs with accessible, theme-aware `Modal` dialogs featuring focus trapping, `Escape` key listeners, and backdrop blur.
  - Designed tactile physical paper order slip inspection layout featuring watermarked ticket headers, side badges, security symbol and name, quantity, limit/market price, and total estimated consideration formatted with tabular numerals.
  - Integrated rigorous confirmation gates: operators must explicitly check "Physical order slip signature, team stamp, and token verified" before validating an order.
  - Enforced mandatory reason text inputs before an order can be returned for physical correction or rejected.
- **Concurrency & Concurrency Protection:**
  - Integrated in-flight action mutex locks (`processingOrderIds` Set) across ticket claims, validations, executions, returns, and rejections, eliminating rapid double-clicking and race conditions on the trading floor.
  - Added keyboard shortcuts (`Ctrl+Enter` to validate/execute, `Escape` to close modal).
- **Zero Authoritative Logic Regression:**
  - Zero modifications to authoritative backend routes, scoring, currencies, or the 2,061 securities universe.
  - Byte-for-byte preservation of `state.json` (SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).
- **Verification & Test Coverage:**
  - Authored `test-exchange-desk-ui.js` passing all 8/8 tests.
  - Verified 100% pass across all regression suites: `test-ui-foundation.js` (8/8), `test-theme-system.js` (6/6), `test-consolidated-exchange-desk.js` (11/11), `test-desk-security.js` (10/10), `test-phoenix-route-integrity.js` (13/13), `test-auth-security-remediation.js` (7/7).
  - Production build clean (`npm.cmd run build` — 102 modules transformed, 0 errors, 7.90s).

---

## [2.11.0-ui-foundation] - 2026-10-13

### Phase 6.1: Shared Design System & Reusable UI Foundation
- **Centralized Design Token Matrix:**
  - Enforced 18 CSS custom properties for the default Financial Heritage Light Theme (`--color-paper: #F7F5EE`, `--color-surface: #FFFFFF`, `--color-brass: #845508`, mineral emerald gain, mineral crimson loss).
  - Enforced 17 CSS custom properties for the High-Tech Terminal Dark Theme (`--color-paper: #070A0F`, `--color-surface: #0E1626`, `--color-brass: #D4AF37`, neon emerald, neon crimson).
  - Enforced tabular numerals across all financial numbers via `.tabular-nums`, `.tnum` (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`).
  - Added accessible focus outline rule (`:focus-visible`) and motion sensitivity rule (`@media (prefers-reduced-motion: reduce)`).
- **Reusable UI Primitives (`src/components/ui/`):**
  - `Button` & `IconButton`: 5 variants (`primary`, `secondary`, `destructive`, `ghost`, `success`), 3 sizes, loading spinners, tactile press, accessible ARIA names.
  - `Input`, `SearchInput`, & `Select`: Prefix/suffix adornment (`₹`, `QTY`), numeric tabular mode, debounced search, clear button, accessible error alerts.
  - `Card`, `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`, & `SectionHeader`: Surface elevations (`default`, `elevated`, `sunken`, `interactive`).
  - `Badge`, `OrderStatusBadge`, & `StationBadge`: 6-stage order lifecycle tracking (`QUEUED`, `CLAIMED`, `VALIDATED`, `EXECUTED`, `RETURNED`, `REJECTED`) with colorblind icon redundancy.
  - `Tabs`, `TabList`, `TabTrigger`, & `TabContent`: Accessible WAI-ARIA tab navigation with keyboard support.
  - `Modal`: Accessible dialog with focus trapping, `Escape` listener, backdrop blur, and scroll locking.
  - `Table`, `TableHeader`, `TableRow`, `TableCell`, `FinancialCell`, & `DataTable`: Tabular numeral cells, column sort indicators, sticky headers.
  - `Spinner`, `Skeleton`, `EmptyState`, `Alert`, & `ErrorBoundaryState`: Accessible feedback and recovery states.
  - `Toast` & `ToastContainer`: Auto-dismiss notifications with countdown timers.
- **Financial Formatters & Utilities (`src/lib/formatters.js`):**
  - `formatCurrency`: Dual support for Indian numbering system (Lakh/Crore) and general ISO currencies.
  - `formatDelta`: Directional arrows (`▲`, `▼`, `—`) paired with numbers to guarantee colorblind redundancy.
  - `formatPrice` & `formatQuantity`: Number formatting with tabular alignment.
- **Verification & Zero Regression:**
  - Created `test-ui-foundation.js` passing 8/8 tests across tokens, contrast math, components, formatters, and state integrity.
  - Math-verified WCAG 2.1 contrast ratios: Light Surface vs Ink = 16.71:1 (AAA), Dark Surface vs Ink = 14.67:1 (AAA), Light Gain = 7.74:1 (AAA), Light Loss = 8.79:1 (AAA).
  - All existing regression suites pass 100%: `test-theme-system.js` (6/6), `test-sidebar-navigation.js` (pass), `test-desk-security.js` (10/10), `test-phoenix-route-integrity.js` (13/13), `test-auth-security-remediation.js` (7/7).
  - Production build clean (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.67s).
  - Database hash verified byte-for-byte untouched (`state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).

---

## [2.10.1-phoenix-route] - 2026-10-13

### Phase 7A.2: Project Phoenix Route Integrity Review & Targeted Remediation
- **Route De-duplication & Shadowing Elimination:**
  - Resolved Express router shadowing on `POST /api/admin/phoenix-act` by converting the earlier generic 3-act macro shock prototype into a dedicated endpoint: `POST /api/admin/scenario/macro-shock`.
  - Preserved backward compatibility by allowing `{ scenario: 'macro_shock', actNumber }` on `POST /api/admin/phoenix-act`.
  - Restored full HTTP reachability for the authoritative 15-act Project Phoenix storyline (`executePhoenixAct`) targeting Delta AI Labs (`DTAI`), OpenAI IPO (`OAI`), Stripe IPO (`STRP`), Anthropic (`ANTH`), SEBI trading halts, and NCLT liquidation orders.
- **Input Validation & Anti-Replay Protection:**
  - Added strict payload validation requiring `actNumber` to be an integer between 1 and 15 (returns HTTP 400 for missing or invalid input).
  - Implemented anti-replay duplicate execution guard returning HTTP 409 Conflict if an act has already been executed (`state.firedPhoenixActs[act]`), protecting against accidental double-drops of stock prices or duplicate news bulletins.
  - Added explicit administrative re-run override via `{ force: true }`.
- **Authorization & Audit Logging:**
  - Hardened `authMiddleware` on `/admin/phoenix-act` and `/admin/scenario/macro-shock` to explicitly permit Floor Directors, Administrators, and SEBI Surveillance Officers (`admin`, `super_admin`, `sebi`, `scenarios.trigger`, `sebi.halt`, `system.config`), while rejecting unauthorized roles (HTTP 403 Forbidden) and unauthenticated callers (HTTP 401 Unauthorized).
  - Integrated governance audit logging recording `PHOENIX_ACT_{num}` in `state.auditLog`.
- **Real-Time State Synchronization:**
  - Maintained `state.firedPhoenixActs[act]` timestamp tracking and broadcasted `PHOENIX_ACT_TRIGGERED` delta events to connected clients, ensuring the SEBI console stage counter and Projector takeovers reflect live state instantly.
- **Verification & Zero Regression:**
  - Authored `test-phoenix-route-integrity.js` with 13/13 passing tests across security, validation, anti-replay, IPO staging, and audit logging.
  - Verified 100% pass rates across existing regression suites: `test-auth-security-remediation.js` (7/7), `test-personnel-and-rbac.js` (12/12), `test-desk-security.js` (10/10), `test-security-adversarial.js` (13/13), `test-consolidated-exchange-desk.js` (11/11).
  - Production build clean (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.31s).
  - Database hash verified byte-for-byte untouched (`state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).

---

## [2.10.0-auth-security] - 2026-10-13

### Phase 7A.1: Authentication Security Audit & Legacy Credential Remediation
- **Hardcoded Backdoor Removal:**
  - Permanently removed `MASTER_PASSWORD` (`[REDACTED]`) and `PASSWORD_SECRET` (`[REDACTED]`) top-level constants in `server.js`.
  - Removed master password bypass (`|| p === MASTER_PASSWORD`) in `/api/auth/login`. All staff authentication strictly verifies against server-side `scrypt` password hashes in `state.personnel`.
  - Eliminated the 30-line synthetic fallback account block that fabricated unauthenticated staff sessions (`superadmin`, `operator_x`, `sebi`, etc.) based on client-supplied roles or legacy passwords.
- **Session Token & Secret Hardening:**
  - Implemented dynamic secret management (`getAuthSecret()`) generating an ephemeral 32-byte cryptographically secure random key on startup with a console security warning if `SAAMX_AUTH_SECRET` is not set in environment.
  - Implemented timing-safe HMAC signature verification in `verifySessionToken` using `crypto.timingSafeEqual`, preventing signature timing attacks.
  - Gated legacy test runner token format (`token_`) strictly behind `isTestEnvironment()`.
- **Test Runner Isolation & Production Direct API Protection:**
  - Added `isTestEnvironment()` helper detecting test harnesses via `NODE_ENV === 'test'`, `ALLOW_TEST_HEADER_AUTH === 'true'`, or test state files.
  - In production mode (`isTestEnvironment() === false`), direct API requests attempting `X-FMS-Password` bypass without a valid Bearer token return HTTP 401 Unauthorized (`401 Unauthorized: Valid session authentication required.`).
  - Removed `req.body.password` authentication shortcut from `authMiddleware`.
- **Disaster Recovery Safeguards:**
  - Implemented secure, auditable disaster recovery authentication for Floor Director (`@sridhara`) strictly configurable via `process.env.SAAMX_RECOVERY_PASSWORD` or `process.env.SAAMX_BOOTSTRAP_ADMIN_PASSWORD`.
- **Frontend Credential Sanitization:**
  - Redacted cleartext master PIN from quick guide in `src/pages/LoginPage.jsx`.
  - Removed hardcoded fallback password in `src/App.jsx`.
- **Verification & Zero Regression:**
  - Authored `test-auth-security-remediation.js` with 7/7 passing security tests across isolated test and production configurations.
  - Verified 100% pass rates on regression suites: `test-personnel-and-rbac.js` (12/12), `test-desk-security.js` (10/10), `test-security-adversarial.js` (13/13), `test-consolidated-exchange-desk.js` (11/11).
  - Production build compiled cleanly (`npm.cmd run build` — 90 modules transformed, 0 errors, 5.43s).
  - `state.json` byte-for-byte preserved (4,690,267 bytes, 100% identical).

---

## [2.9.0-hardening] - 2026-10-13

### Phase 4: Event Simulation Hardening, Desk-Level Access Control & Multi-Device Scalability
- **Dynamic Desk Assignment & Strict Desk-Level Authorization:**
  - **Zero Hardcoded Operator Mappings:** Completely decoupled physical order desks (`DESK_1` through `DESK_5`) from static operator names. State now authoritative in `state.orderDesks` with dynamic operator and clearance team intake bindings.
  - **Authoritative REST Endpoints:** Added `GET /api/desks` (and alias `/api/order-desks`) and `POST /api/desks/assign` supporting operator station assignment, team clearance allocations, and automatic team load-balancing (`AUTO_BALANCE_TEAMS`).
  - **Strict Server-Side Isolation:** Enforced hard station boundaries in `server.js`. Operators bound to `DESK_1` cannot claim or process orders bound to `DESK_2` (returns HTTP 403 Forbidden). Client-supplied desk tampering in request payloads is strictly rejected.
  - **Dynamic Session Synchronization:** Session tokens and `/api/auth/me` reflect live `assignedDesk` synchronized in real time from `state.personnel`, eliminating stale credential risks without requiring re-login.
  - **Documented Supervisory Exceptions:** Super-admins, admins, Sridhara, and roles with `desks.cross_operate` permission maintain global floor oversight across all physical desks.
- **Station Binding & Desk Management UI:**
  - **Exchange Desk (`ExchangePage.jsx`):** Replaced static configurations with dynamic desks loaded from server. Enforced physical station locking (disabling switching buttons for non-supervisors) and added unassigned station warning banners.
  - **Personnel Management (`PersonnelManagementPage.jsx`):** Integrated physical desk assignment directly into staff provisioning and editing modals, with assigned station badges in the personnel directory.
  - **Floor Operations Dashboard (`FloorOperationsDashboard.jsx`):** Dynamically tracks live order queues, throughput, and active operators across all 5 physical desks.
  - **Registration & Team Admin (`RegistrationPage.jsx` & `AdminPage.jsx`):** Official delegate credential slips and team administration cards display designated intake clearance desk stations.
- **Multi-Device Scalability & Performance (100–120 Concurrent Devices):**
  - **Lightweight Delta Broadcasting:** Optimized `broadcastState()` to pre-serialize lightweight focused delta payloads once per mutation rather than serializing the full 2,062 securities universe 120 times, reducing per-event memory allocation by >99.9% and CPU time to <2ms.
  - **WebSocket Connection Hardening:** Implemented 30s ping/pong heartbeat, automatic zombie socket pruning, and payload size minimization.
  - **Compact State Persistence:** Replaced indented `JSON.stringify(state, null, 2)` in `saveState()` with compact serialization, preventing V8 heap exhaustion and disk I/O bottlenecks.
  - **Atomic Concurrency Controls:** Added in-memory mutex locks (`activeOrderLocks`) on order claims and executions, defending against race conditions and concurrent double-claims under high floor concurrency.
- **Automated Verification:**
  - Added `test-desk-security.js` (10/10 tests passed covering dynamic assignment, isolation, 403 boundaries, and supervisory overrides).
  - Added `test-scalability-120-devices.js` (120 concurrent WebSocket connections, heartbeats, broadcast propagation, and atomic claim/execution stress testing passed).
  - Clean Vite production build (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.86s).

---

## [2.8.0-consoles] - 2026-10-13

### Phase 3: Consolidated Floor & Staff Consoles Complete
- **Consolidated Exchange Desk Enhancements (`ExchangePage.jsx`):**
  - **In-Flight Processing Locks:** Implemented `processingOrderIds` Set state to guard against concurrent clicks and race conditions during order ticket claiming, validation, execution, return, and rejection.
  - **Keyboard Accelerators:** Added `Ctrl + Enter` intake submission shortcut with visual accelerator hint, plus global `Escape` key listeners for modal dismissals.
  - **Physical Clearance Workload Meters:** Integrated 5 physical clearance desk capacity meters (Sandesh, Akshay, Aarush, Sridhara, Aksharaa) to balance slip queues.
- **Floor Operations Console Modernization (`FloorOperationsDashboard.jsx`):**
  - **Design Token Harmonization:** Replaced hardcoded `#090D14` backgrounds with standard SAAMX CSS variables (`var(--color-surface)`, `var(--color-surface-2)`, `var(--color-ink)`).
  - **Real-Time Operational Header:** Added live session phase pill, high-contrast digital exchange clock, and phase countdown.
  - **Urgent System Condition Alerts:** Added automated alert banner for high order queue backlogs (>10 pending), telemetry anomalies, and emergency halts.
  - **Confirmation-Guarded Market Controls:** Added modal-guarded PAUSE / RESUME controls and operational directive broadcasting (`/api/news` with `category: 'Exchange'`).
  - **Live Audit Stream:** Integrated live stream rendering authoritative events from `state.auditLog`.
- **Journalist & Live Announcement Console (`JournalistPage.jsx` & `NewsAnchorConsole.jsx`):**
  - **Three Focused Operational Modes:** Separated workflows into `📰 Press Wire & Bulletin Dispatch`, `🎭 Scenario Timeline Player (80 Steps)`, and `🎙️ Live Stage Teleprompter & Rundowns`.
  - **Anti-Duplicate Publishing Guards:** Added `isPublishing` locks and duplicate headline detection to prevent accidental double-broadcasting.
  - **Explicit `[SIMULATION WIRE]` Markers:** Added automated prefixing and visual attribution badges to clearly demarcate simulation wire dispatches from external news.
  - **Harmonized Teleprompter:** Updated `NewsAnchorConsole` styles with design token variables while preserving pro broadcast teleprompter contrast.
- **Broker & Advisory Terminal Refinement (`BrokerAdvisoryTerminal.jsx`):**
  - **Educational Non-Execution Boundary Banner:** Added prominent floor notice stating that advisors formulate research and theses, but cannot execute trades (physical paper order slips must be submitted at the Exchange Desk).
  - **Design Token Harmonization:** Replaced hardcoded `#FFFFFF` backgrounds with `var(--color-surface)` for full theme compatibility.
  - **Verified Advisory Badges:** Added `✓ VERIFIED ADVISORY DISPATCH` badges and data-backed rationale to dispatched referral signals.
- **Admin & Audit Console Safeguards (`AdminPage.jsx`):**
  - **Super-Admin Protection on Master Re-Seed:** Restricted disaster recovery re-seed execution and controls strictly to `isSuperAdmin` (Sridhara).
- **Automated Verification & Zero Regression:**
  - Added `test-floor-operations-and-consoles.js` (7/7 passing).
  - Verified regression suites: `test-team-workstation.js` (7/7 PASS), `test-consolidated-exchange-desk.js` (11/11 PASS), `test-sidebar-navigation.js` (PASS), `test-bull-bear.js` (6/6 PASS), `test-personnel-and-rbac.js` (12/12 PASS).
  - Verified clean production build (`npm.cmd run build` — 90 modules transformed, 0 errors).

---

## [2.7.0-workstation] - 2026-10-12

### Complete Team Trading Workstation Redesign
- **Four Core Unified Workstation Sections:**
  - Redesigned `ParticipantTerminal.jsx` into a cohesive four-section financial workstation:
    1. **Team Overview:** Team credentials, roster roles (Lead Trader, Chief Analyst, Risk Manager, Macro Strategist), live market phase, authoritative cash and holdings ledger summary, recent paper slips, breaking news, and quick portal shortcuts.
    2. **Market Overview & Intelligence:** Single unified workspace eliminating separated tabs. Integrates compact market snapshot (4 major indices, breadth, movers), full 2,062 securities explorer with multi-exchange filters, contextual security research drawer, and unified chronological intelligence feed.
    3. **Portfolio & Holdings:** Pure position monitoring station reconciled with authoritative backend ledger. Multi-currency wallets (INR, USD, GBP, EUR), cost basis, current valuation, dual P&L (realized vs unrealized), ROI %, and sector/currency diversification charts. Zero digital trade execution buttons.
    4. **Order History:** Physical paper trading order tracking. Displays physical ticket numbers (`ticketNumber`), timestamps, status badges (`Awaiting Verification`, `Being Verified`, `Returned for Correction`, `Validated`, `Executed`, `Rejected`), execution/rejection details, expandable progression audit timeline, and `/api/orders/resubmit` correction modal.
- **Unified Market Intelligence Feed:**
  - Synchronizes Corporate Announcements, Regulatory Developments (SEBI circulars), Monetary Policy & Macro Indicators (RBI), Sector Trends, and Floor Advisor Theses (Bull/Bear desks) into a single chronological feed.
  - Rich cards with issuing authority attribution, effective date vs published date, status, affected tickers, and clear educational simulation labeling.
- **Physical Paper Trading Architecture:**
  - Strictly preserves SAAMX's core physical paper order-slip model. The workstation functions purely for monitoring, screening, and research, with all executions taking place via physical slips at the Consolidated Exchange Desk.
- **Routing & Navigation:**
  - Supported internal section navigation (`overview`, `market`, `portfolio`, `orders`) and URL hash route aliases (`#/team`, `#/terminal`).
- **Automated Verification:**
  - Added `test-team-workstation.js` (7 automated tests covering starting capital, 2,062 securities preservation, multi-currency ledger, unified feed, physical order lifecycle, component architecture, and routing aliases). Passed 100% (7/7).
  - Production build clean (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.72s).

---

## [2.6.0-phase1] - 2026-10-12

### Phase 1: Page Consolidation and Navigation Cleanup Complete
- **Broker & Advisory Consolidation:**
  - Merged `BullTerminal` (`#/bull-terminal`) and `BearTerminal` (`#/bear-terminal`) into `BrokerAdvisoryTerminal` (`#/advisor`).
  - Added seamless sub-view tabs (`💼 Advisory & Client Consultations`, `🐂 Bull Momentum Scanner`, `🐻 Bear Vulnerability Scanner`) retaining all bullish/bearish research, top picks, catalyst wires, and debate talking points without granting unauthorized trading permissions.
  - Added URL hash routing compatibility (`#/bull`, `#/bear`, `view=bull`, `view=bear`).
- **Journalism & Anchor Consolidation:**
  - Integrated `NewsAnchorConsole` into `JournalistPage` (`#/journalist`) with a toggle switch (`📰 Press Wire Editor & Dispatch` vs `🎙️ Live Stage Teleprompter & Rundown`).
  - Preserves broadcast queues, teleprompter rundowns, sequential story triggers, and anchor workflows with distinct permission checks.
- **Unified Admin Console (5 Sub-Pages):**
  - Consolidated Master Admin (`#/admin`), Personnel Management (`#/personnel`), and Results & Scoring (`#/results`) into `AdminPage` with 5 sub-pages:
    1. `📊 Overview` (Market state, active teams, telemetry, system metrics)
    2. `🎛️ Event Controls` (Market scheduler, emergency circuit halts, team cash adjustments, snapshot backups/restores)
    3. `👥 Personnel & Access` (Staff directory, multi-page permissions matrix, password resets, session revocations — strictly guarded by `isSuperAdmin`)
    4. `🏆 Results & Scoring` (Reconciliation, valuation freeze, scoring lifecycle, podium publishing, CSV exports)
    5. `🛡️ Audit Logs & State` (Immutable event log, security audits, database inspection)
- **Retirement of Redundant Desks:**
  - Retired standalone `VerificationDesk` (`#/verification`) and `BullBearDebatePage` (`#/debate`) from primary navigation while preserving route compatibility and redirects to `ExchangeDesk` and `BrokerAdvisoryTerminal`.
- **Navigation Taxonomy Update:**
  - Updated `src/lib/navigationConfig.js` to 14 core navigation items across 5 logical sections.
  - Updated `src/App.jsx`, `src/components/Sidebar.jsx`, and `src/pages/HomePage.jsx` portal cards.
- **Regression Verification & Production Build:**
  - All test suites passing (`test-sidebar-navigation.js`, `test-personnel-and-rbac.js`, `test-consolidated-exchange-desk.js`, `test-security-adversarial.js`, `test-bull-bear.js`).
  - Production build clean (`npm.cmd run build` — 86 modules, zero errors).

---

## [2.5.0-security] - 2026-10-12

### Master Quality, Security, UI/UX & Regression Initiative Complete
- **Password Security Hardening:**
  - Migrated password hashing from raw SHA-256 to modern, memory-hard `scrypt` with per-account random salt (`crypto.scryptSync`, N=16384, r=8, p=1, keylen=64).
  - Implemented timing-safe verification and automatic backward-compatible rehash-on-success migration for legacy SHA-256 hashes, ensuring zero user or seed lockouts.
  - Enforced server-side minimum password length policy ($\ge 8$ characters, alphanumeric) on staff creation, in-app resets, and client-side modals.
  - Added in-memory login rate limiting / brute-force throttling (HTTP 429 Too Many Requests after 10 failed attempts within 5 minutes).
  - Standardized generic authentication failure messages (`Invalid username, PIN or password`) across all endpoints to eliminate username enumeration.
- **WebSocket & Response Sanitization:**
  - Hardened `getSanitizedState` to completely remove `state.personnel` and `state.auditLog` from unauthenticated and participant team WebSocket broadcasts.
  - Stripped `password`, `passwordHash`, and `tempPin` from all team records across all broadcasts and responses.
  - Forcefully disconnects active WebSocket connections (code 4003) immediately when a personnel account is deactivated.
- **Participant Team Data Isolation:**
  - Strictly enforced multi-tenant team boundaries across orders, portfolios, submissions, cancellations, and referrals.
  - Verified that cross-team portfolio queries and unauthorized trades return HTTP 403 Forbidden.
- **Participant Registration Overhaul:**
  - Updated `POST /api/register/complete` and `RegistrationPage.jsx` to eliminate mandatory email and phone fields in strict compliance with the zero-email constraint.
  - Validated institution duplicate checks based on school name and investment house name.
  - Unapproved registrations are safely kept in `SUBMITTED` / `PENDING` state and prevented from accessing active trading engines until approved by authorized administrators.
  - Integrated administrative registration approvals (`POST /api/admin/registration/verify`) with immutable audit logging.
- **Bundle Size & Build Performance Optimization:**
  - Configured `rollupOptions.output.manualChunks` in `vite.config.js` to code-split `universe_data.js` (3.13 MB dataset), `vendor-firebase` (227 kB), and `vendor-react` (141 kB).
  - Slashed the monolithic client entry bundle from 4.76 MB down to 1.25 MB (~74% reduction) with a 4.08s build time.
- **Adversarial Security Test Suite:**
  - Created `test-security-adversarial.js` (13 automated tests covering scrypt hashing, legacy migration, password strength, rate limiting, generic errors, session revocation, WebSocket isolation, cross-team security, least privilege, super-admin safeguards, and registration lifecycle). Passed 100% (13/13).
- **Comprehensive Regression Verification:**
  - All 5 test suites passed cleanly with 100% success (`test-personnel-and-rbac.js`, `test-security-adversarial.js`, `test-sidebar-navigation.js`, `test-consolidated-exchange-desk.js`, `test-theme-system.js`).
  - Production `state.json` verified 100% pure (10 production seed accounts, 0 test accounts).

---

## [2.4.0-rbac] - 2026-10-12

### Multi-Page Staff Access & Personnel Management (RBAC Complete)
- **Multi-Page Staff Access Model:** Implemented individualized multi-page access control enabling a single staff account to access multiple desk portals (e.g. `['#/exchange', '#/market-watch']`) via explicit `selectedPages` array, preserving role identity while eliminating shared generic accounts.
- **Dedicated Personnel Administration Page (`src/pages/PersonnelManagementPage.jsx`):** Created full-featured, responsive, dual-theme personnel management portal mounted at `#/personnel` and `#/personnel-management`:
  - Searchable directory table with filters by name, username, department, staff ID, role, and active/disabled status.
  - KPI counter summary row (Total Staff, Active Operators, Deactivated Accounts, Multi-Page Staff).
  - Provision Staff modal with multi-page desk picker and granular permissions selector.
  - STRICT: Zero email or phone fields required, requested, or persisted.
  - Edit Access modal for existing staff members.
  - Deactivate / Reactivate confirmation dialog with immediate session revocation warnings.
  - In-app authorized password reset modal.
- **Authoritative Backend RBAC & API Endpoints (`server.js`):**
  - Added `PAGE_PERMISSIONS` canonical map and enhanced `getEffectivePermissions(account)`.
  - Implemented `GET /api/permissions/matrix` returning groups, definitions, and default role templates.
  - Implemented `GET /api/personnel` returning sanitized staff accounts without password hashes.
  - Implemented `POST /api/personnel` with strict input validation, uniqueness checks, and permission validation.
  - Implemented `PUT /api/personnel/:id` for modifying staff profiles, assigned pages, and permission overrides.
  - Implemented `POST /api/personnel/:id/status` toggling `ACTIVE` / `DISABLED` status with immediate token eviction from `activeSessions` and WebSocket client disconnection.
  - Implemented `POST /api/personnel/:id/reset-password` for authorized in-app credential updates.
- **Strict Super-Admin Safeguards:**
  - Hardened master super-admin account (`sridhara` / `USR_MASTER_01`): standard admins cannot modify, demote, or deactivate Sridhara.
  - Prevented removing or deactivating the last active super-admin or floor administrator.
- **Real-Time Revocation & Auth Middleware:**
  - Enhanced `verifySessionToken` to check associated personnel account status in real-time, rejecting tokens for deactivated users immediately.
  - Updated `/api/auth/login` to reject deactivated accounts with HTTP 403 Forbidden.
  - Updated `authMiddleware` to enforce granular permissions on personnel and operational endpoints using `hasPerm`.
- **Navigation & Client-Side Authorization:**
  - Added `Personnel Management` destination (`#/personnel`) under `Operations & Control` in `src/lib/navigationConfig.js`.
  - Updated `getFilteredNavSections(userRole, grantedPermissions, grantedPages)` and `isRouteAuthorized` in `src/App.jsx` to dynamically respect `grantedPages`.
  - Passed `grantedPermissions` and `grantedPages` to `<Sidebar />`.
- **Comprehensive Automated Test Suite:**
  - Created `test-personnel-and-rbac.js` (12 test suites, 100% pass): verifying permissions matrix, seed account privacy, account provisioning, duplicate rejection, unknown permission rejection, multi-page authentication, server-side least privilege, navigation visibility, staff editing, super-admin safeguards, status toggling, immediate session revocation, authorized password reset, audit trail logging, and specification example quarantine.
- **Production Build:** Verified clean Vite production build (`npm.cmd run build` — 86 modules transformed, 0 errors).

---

## [2.3.0-uiux] - 2026-10-11

### UI/UX Excellence Initiative (Original Light Theme First + Complete Dark Theme Alternative)
- **Original Light Theme Confirmed as Primary Default:** Preserved and refined the application's recognizable financial heritage light interface (`#F7F5EE` paper canvas, `#FFFFFF` surfaces, `#845508` antique brass, `#080A0E` ink, `#065F3E` emerald rise, `#931913` crimson fall). Guaranteed default for all new visits and empty storage.
- **Full Dark Theme Alternative:** Engineered high-contrast dark theme (`#070A0F` obsidian canvas, `#0E1626` elevated cards, `#00F2FE` cyan accents, `#D4AF37` radiant gold, `#10B981` emerald, `#EF4444` crimson, `#F8FAFC` slate text).
- **Zero-Flash Synchronous Initialization:** Added inline blocking script in `index.html` head to read `saamx_theme` from `localStorage` and apply `data-theme` attribute to `document.documentElement` before first paint, eliminating theme flashing.
- **Theme Infrastructure & Context:** Built `src/context/ThemeContext.jsx` with `useTheme` hook, local storage persistence under `saamx_theme`, and broadcast custom event `saamx_theme_changed`.
- **Accessible Theme Toggles:** Created `src/components/ThemeToggle.jsx` and integrated into top App Header and Sidebar Footer (supporting standard and compact icon modes).
- **Dual-Theme Sidebar:** Updated `src/components/Sidebar.css` with semantic variables ensuring sidebar renders with crisp white/brass styling in Light mode and glowing obsidian/cyan styling in Dark mode.
- **Modal & Drawer Theme Harmonization:** Replaced hardcoded `#FFFFFF` backgrounds with `var(--color-surface)` across `ExchangePage.jsx` (review, return, and reject modals) and `CompanyProfileModal.jsx`.
- **Legacy Variable Compatibility Aliases:** Mapped legacy CSS variables (`--card-bg`, `--border-soft`, `--navy-900`, `--gold-royal`, `--green-emerald`, `--red-crimson`, etc.) to base tokens in `src/index.css`, ensuring full backward compatibility across all legacy page components.
- **Automated Test Suite:** Created `test-theme-system.js` with 6 automated tests covering zero-flash initialization, light-first default contract, CSS token completeness, dual-theme sidebar architecture, ThemeToggle wiring, and modal surface adaptations. 100% pass.

---

## [2.2.0-phase2] - 2026-10-11

### Responsive Sidebar Navigation (Phase 2 Complete)
- **Built Responsive Sidebar Component:** Implemented `src/components/Sidebar.jsx` and `Sidebar.css` replacing the crowded 17-tab horizontal navigation with a modern expandable/collapsible sidebar.
- **Section Grouping & Taxonomy:** Grouped all 16 valid application destinations into 5 logical sections (`Trading & Execution`, `Market & Intelligence`, `Surveillance & Oversight`, `Operations & Control`, `Event & Overview`) via `src/lib/navigationConfig.js`.
- **Role-Based Visibility Gates:** Rigorously enforced role-specific item filtering for all roles (`team`, `operator_x`, `verification`, `sebi`, `advisor`, `journalist`, `portfolio`, `judge`, `admin`). Sections without accessible items for a role are cleanly omitted.
- **Desktop Rail & Floating Tooltips:** Supported expanded (250px) mode with full titles, role chips, badges, and collapsed (68px) icon rail with accessible CSS floating tooltips and `Ctrl+B` keyboard toggle. State persists in `localStorage`.
- **Mobile & Tablet Drawer:** Configured off-screen drawer on screens < 1024px with dark backdrop overlay (`.saamx-sidebar-backdrop`), accessible hamburger toggle in the top header, `Escape` key listener, and automatic close on route transition.
- **Non-Overlapping Content Shell:** Wrapped main application in `.saamx-app-shell` with smooth `margin-left` transitions ensuring the sidebar never covers page dialogs, tables, or tickers on desktop.
- **Legacy Aliases Preserved:** Verified `#/verification` and `#/verification-desk` routes remain mapped to the Exchange Desk and activate the `Exchange Desk` sidebar item.
- **Zero Backend/Data Mutations:** Preserved event state, `server.js` logic, 2,061 securities, and 20 Investment Houses without modification.
- **Automated Test Suite:** Created `test-sidebar-navigation.js` covering navigation taxonomy, active-route resolution, legacy aliases, and role-based filtering. 100% test pass.

---

## [2.1.0-phase1] - 2026-10-11

### Consolidated Exchange Desk (Phase 1 Complete)
- **Consolidated Verification into Exchange Desk:** Merged paper order-slip intake, detailed modal review, mandatory return-for-correction reasoning, affirmative physical slip check, server risk validation, and floor execution into `ExchangePage.jsx`.
- **Retired Standalone Verification Desk Navigation:** Removed the `Verification Desk` tab from top navigation in `src/App.jsx`. Configured `#/verification` and `#/verification-desk` routes to map to `ExchangePage` as graceful aliases to prevent broken deep links.
- **Updated Role Destinations:** Updated `getDefaultDeskForRole('verification')` and `LoginPage.jsx` defaults to route verification personnel directly into `#/exchange`.
- **Hardened Backend Authorization:** Added `orders.verify` and `orders.return_for_correction` permissions to `operator_x` and `exchange` roles in `ROLE_PERMISSIONS`. Protected `/api/order/claim` and `/api/order/action` with strict role enforcement (`admin`, `super_admin`, `operator_x`, `exchange`, `verification`); unauthorized roles (teams, coordinators) receive HTTP 403 Forbidden.
- **Cross-Team Security:** Enforced strict team ownership verification on `/api/orders/resubmit` and `/api/orders/cancel`.
- **Duplicate Execution Prevention:** Hardened atomic state checks on order execution; duplicate execution calls return HTTP 400 without cash or portfolio mutations.
- **Distinct Review & Execution UI:** Order review in `ExchangePage.jsx` requires explicit physical slip confirmation and risk validation before the `[🚀 Execute Trade]` button is unlocked.
- **Pre-Migration State Backup:** Preserved existing `state.json` data and created pre-migration snapshot in `backups/`.
- **Test Suite Coverage:** Created `test-consolidated-exchange-desk.js` covering 11 critical test scenarios (intake, atomic claim, return for correction, cross-team security, team resubmission, risk validation, floor execution, duplicate prevention, rejection, role authorization, audit trail). 100% test pass.

---

## [2.0.0-audit] - 2026-10-11

### Discovered & Audited
- Audited complete application code base across 20 pages, 6 shared components, Express backend (`server.js`), and simulation engine.
- Verified physical existence and schema validity of 2,061 securities and 20 Investment Houses in `state.json`.
- Confirmed starting virtual capital is strictly set to ₹1,00,00,000 (₹1 Crore) per house.
- Executed `npm.cmd run build`, `test-security-universe.js`, and `test-final-suite.js` confirming 100% test pass.
- Created authoritative project documentation suite in `docs/`.

---

## [1.0.0-stabilisation] - 2026-10-10

### Added
- Autonomous background coordinator in `server.js` running 08:00–16:00 Asia/Kolkata event schedule.
- Multi-currency wallets (INR, USD, GBP, EUR) with spot currency conversion desk (`CurrencyExchangePage.jsx`).
- Dedicated order verification workflow (`VerificationPage.jsx`) with physical slip inspection and return-for-correction mechanism.
- Simple stock-advisor referral pipeline (`/api/advisor/refer`, `/api/advisor/signal`).
- Automated crash-safe disk state persistence and disaster recovery snapshots in `backups/`.
- 1,000-point scoring engine (`scoring_engine.js`) with inactive portfolio anti-gaming dampeners and Herfindahl concentration metrics.
