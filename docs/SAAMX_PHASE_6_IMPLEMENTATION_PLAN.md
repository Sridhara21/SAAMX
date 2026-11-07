# SAAMX — Phase 6.0 Implementation & Rebuild Master Plan
## Structured Execution Blueprint for Complete Frontend Redesign & API Cleanup

**Document ID:** `SAAMX-PHASE6-PLAN-001`  
**Status:** APPROVED FOR PHASE 6.1 EXECUTION  
**Author:** Software Architecture & Project Engineering Lead  
**Target Platform:** SAAMX (Student Academic Asset Market eXchange)  
**Date:** October 2026  

---

## 1. Executive Summary & Phasing Strategy

This document establishes the authoritative execution plan for the page-by-page UI/UX redesign, frontend refactoring, and API integration cleanup for SAAMX.

Following strict software engineering discipline, changes will be executed in **5 manageable, verified stages (Phase 6.1 through 6.5)**. No production page will be decommissioned until its replacement meets 100% of functional requirements, accessibility standards, and pass-through test criteria.

```
+---------------------------------------------------------------------------------------------------+
|                                 SAAMX PHASE 6 EXECUTION ROADMAP                                   |
+---------------------------------------------------------------------------------------------------+
|  PHASE 6.1: Shared UI Primitives & Foundational Design Tokens                                     |
|  - Implement CSS variable tokens (Light default & Dark alt).                                      |
|  - Build core primitives: Button, Input, Select, Badge, Card, Modal, Virtualized DataTable.       |
|  - Build financial widgets: StatCard, Sparkline, OrderSlipCard, DeskBadge.                        |
+---------------------------------------------------------------------------------------------------+
|  PHASE 6.2: Core Trading Operations Rebuild (Tier 1)                                              |
|  - Rebuild Exchange Trading Floor (ExchangePage.jsx) with keyboard-first slip processing.         |
|  - Refactor Participant Workstation (ParticipantTerminal.jsx & 4 subsections).                   |
|  - Standardize Authentication Gateway (LoginPage.jsx) & Order Verification (OrderVerification).   |
+---------------------------------------------------------------------------------------------------+
|  PHASE 6.3: Regulatory Governance & Master Administration (Tier 2)                                 |
|  - Decompose Admin Console (AdminPage.jsx) into 5 focused tab components.                         |
|  - Rebuild SEBI Surveillance Console (SebiPage.jsx) with pure REST enforcement.                   |
|  - Overhaul Auditorium Projector (ProjectorPage.jsx) with 4K fluid scaling & split-flap board.    |
+---------------------------------------------------------------------------------------------------+
|  PHASE 6.4: Market Intelligence, Floor Operations & Auxiliary Consoles (Tier 3 & 4)              |
|  - Virtualize Market Watch (MarketWatchPage.jsx) & Stock Directory (StockDirectoryPage.jsx).      |
|  - Rebuild Floor Operations, Broker Terminal, News Portal, Leaderboard, Audit Logs, Status.      |
|  - Refactor Pre-Event Registration and Public Landing portals.                                    |
+---------------------------------------------------------------------------------------------------+
|  PHASE 6.5: End-to-End Hardening, Concurrency Stress & Dress Rehearsal                            |
|  - Full integration test suite run (120 simultaneous simulated participants).                     |
|  - Disaster recovery simulation (abrupt server reboot, network partition, token recovery).        |
|  - Final sign-off & release freeze.                                                               |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Rebuild Sequencing & Priority Matrix

Pages and components are sequenced by operational criticality. Core trading execution interfaces are built and tested before secondary intelligence screens.

| Priority Tier | Component / Page | Key Operational Requirement | Target Phase |
| :--- | :--- | :--- | :-: |
| **Foundation** | `src/components/ui/*` | Universal token-driven UI primitives & virtualized table | **Phase 6.1** |
| **Tier 1** | `ExchangePage.jsx` | Station desk isolation, keyboard slip processing, zero re-render lag | **Phase 6.2** |
| **Tier 1** | `ParticipantTerminal.jsx` | 4-section workstation, paper slip prep, portfolio metrics | **Phase 6.2** |
| **Tier 1** | `LoginPage.jsx` | Single-pane scrypt authentication, role switching, zero leaks | **Phase 6.2** |
| **Tier 1** | `OrderVerificationPage.jsx` | Pre-flight slip scanning, fast clerk verification | **Phase 6.2** |
| **Tier 2** | `AdminPage.jsx` | Modular 5-tab decomposition, safe Phoenix orchestration | **Phase 6.3** |
| **Tier 2** | `SebiPage.jsx` | Real-time collusion detection, pure audited REST actions | **Phase 6.3** |
| **Tier 2** | `ProjectorPage.jsx` | 4K display scaling, 3D split-flap board, breaking news modal | **Phase 6.3** |
| **Tier 3** | `MarketWatchPage.jsx` | Virtualized 2,061 stocks, memoized SVG sparklines | **Phase 6.4** |
| **Tier 3** | `FloorOperationsPage.jsx` | Live desk queue density map, device health monitor | **Phase 6.4** |
| **Tier 3** | `StockDirectoryPage.jsx` | Searchable 2,061-security directory with sector filters | **Phase 6.4** |
| **Tier 3** | `BrokerTerminal.jsx` | Quick order value calculator and paper slip preview | **Phase 6.4** |
| **Tier 4** | `LeaderboardPage.jsx` | Real-time standings, blind-round anonymity support | **Phase 6.4** |
| **Tier 4** | `NewsPortalPage.jsx` | Editorial publishing, leak-level tagging, news flashes | **Phase 6.4** |
| **Tier 4** | `AuditLogsPage.jsx` | Immutable audit ledger with structured filtering & CSV export | **Phase 6.4** |
| **Tier 4** | `SystemStatusPage.jsx` | Process memory, WebSocket ping, sync health monitor | **Phase 6.4** |
| **Tier 4** | `RegistrationPage.jsx` | Multi-step team enrollment wizard | **Phase 6.4** |
| **Tier 4** | `PublicLandingPage.jsx` | Welcome portal, schedule, rulebook download | **Phase 6.4** |

---

## 3. Shared Component Construction Plan (Phase 6.1)

Before modifying any page, a unified suite of accessible, typed, token-driven UI primitives will be created in `src/components/ui/`:

### 3.1 Foundational UI Primitives
1. `src/components/ui/Button.jsx`:
   - Variants: `primary` (brass), `secondary` (outlined), `destructive` (crimson), `ghost`, `success` (emerald).
   - Props: `size` (`sm`, `md`, `lg`), `loading` (spinner), `disabled`, `icon`.
   - Accessible keyboard focus ring and active states.
2. `src/components/ui/Input.jsx`:
   - Styled text and numeric input with currency/prefix adornment (`₹`, `QTY`, `%`).
   - Built-in error message display, helper text, and clear button.
3. `src/components/ui/Select.jsx`:
   - Themed custom select dropdown with arrow-key keyboard navigation.
4. `src/components/ui/Badge.jsx`:
   - Semantic color variants: `gain`, `loss`, `warn`, `info`, `brass`, `neutral`.
   - Size options: `sm`, `md`.
5. `src/components/ui/Card.jsx`:
   - Container component with `CardHeader`, `CardTitle`, `CardBody`, and `CardFooter`.
   - Subtle paper surface, distinct borders, and elevation shadow tokens.
6. `src/components/ui/Modal.jsx` & `src/components/ui/Drawer.jsx`:
   - Backdrop blur, focus trapping, Escape listener, smooth entrance transition.
7. `src/components/ui/DataTable.jsx`:
   - Sticky headers, column sorting indicators, alternating striping.
   - Built-in DOM virtualization (`@tanstack/react-virtual` or lightweight virtual window) for high row counts.

### 3.2 Specialized Financial & Trading Components
1. `src/components/ui/StatCard.jsx`: Metric display with large tabular numerals, delta badge, and subtitle.
2. `src/components/ui/TickerSparkline.jsx`: Normalized lightweight SVG sparkline with green/red stroke styling.
3. `src/components/ui/OrderSlipCard.jsx`: Visual representation of a physical floor trading slip.
4. `src/components/ui/DeskBadge.jsx`: Station desk indicator (`DESK_1` through `DESK_5`) with active clerk lock badge.
5. `src/components/ui/Toast.jsx`: Non-blocking notification toast system with auto-dismiss progress bar.

---

## 4. API & Data Layer Remediation Strategy

### 4.1 Strict Simulation Gating
- Replace automatic silent simulation fallback on 404/502 in `src/lib/api.js` with an explicit environment-gated flag: `VITE_ALLOW_OFFLINE_SIMULATION`.
- In production event mode (`false`): HTTP failures raise structured errors that surface explicit user-facing toasts with retry actions.
- Prevent any silent client-side writes to Firebase RTDB that bypass authoritative `state.json` logging.

### 4.2 Centralized Typed API Client
- Refactor `src/lib/api.js` to expose typed, domain-specific modules:
  - `authApi`: `login()`, `logout()`, `getMe()`
  - `ordersApi`: `getQueue()`, `claim()`, `validate()`, `execute()`, `reject()`, `return()`
  - `teamApi`: `getPortfolio()`, `getOrders()`, `getRubric()`
  - `adminApi`: `roundAction()`, `triggerPhoenixAct()`, `haltMarket()`
  - `sebiApi`: `getSurveillance()`, `freezeTeam()`, `levyFine()`

### 4.3 WebSocket Catch-up Reconciliation
- Enhance WebSocket client to store last received event sequence/timestamp.
- On reconnect, request missing delta batch from Express server buffer to prevent stale UI state.

---

## 5. Phase-by-Phase Acceptance Criteria

### Phase 6.1 Acceptance Criteria
- [ ] Complete CSS token palette active in `src/index.css` (Light default & Dark alt).
- [ ] 7 foundational primitives and 5 financial widgets built in `src/components/ui/`.
- [ ] Component test suite validates focus trapping, keyboard navigation, and theme switching.
- [ ] Zero build warnings; `npm run build` succeeds cleanly.

### Phase 6.2 Acceptance Criteria
- [ ] `ExchangePage.jsx` refactored into modular subcomponents; 100% keyboard-navigable slip entry.
- [ ] Clerk desk isolation verified: clerks locked to assigned station; concurrency conflict toast on claimed slips.
- [ ] `ParticipantTerminal.jsx` renders 4 cohesive sections with paper slip preview; virtualized stock search.
- [ ] `LoginPage.jsx` and `OrderVerificationPage.jsx` fully compliant with new design tokens.

### Phase 6.3 Acceptance Criteria
- [ ] `AdminPage.jsx` split into 5 modular tab components; dangerous reset actions isolated in 2-step confirmation modal.
- [ ] `SebiPage.jsx` purged of direct Firebase SDK writes; 100% of actions route through audited REST.
- [ ] `ProjectorPage.jsx` tested at 3840×2160 (4K); split-flap board flips smoothly at 60 FPS.

### Phase 6.4 Acceptance Criteria
- [ ] `MarketWatchPage.jsx` and `StockDirectoryPage.jsx` smoothly scroll through 2,061 securities without dropped frames.
- [ ] Remaining 6 auxiliary consoles updated to design system standards.
- [ ] Legacy pages verified as safe re-exports.

### Phase 6.5 Acceptance Criteria
- [ ] Concurrency load test: 120 simulated devices simultaneously receiving price ticks and submitting slips.
- [ ] Chaos test: Unplugged server process successfully recovers active sessions and state on restart.
- [ ] Final production build clean, zero console errors, zero secret leaks.

---

## 6. Open Decisions Requiring Product Owner Guidance

During the Phase 6.0 audit, the following design decisions were identified for product-owner alignment:

1. **Participant Mobile Device Policy:**  
   *Question:* Should student participants on smartphones have access to the full portfolio and paper slip helper, or should a simplified "Mobile Read-Only Market Watch" view be presented on viewports $< 768\text{px}$?  
   *Architect Recommendation:* Full responsive workstation access with simplified 1-column layout, as teams frequently use multiple devices at their table.
2. **Exchange Clerk Multi-Monitor Layout:**  
   *Question:* Should exchange desk clerks have a dedicated "Dual-Screen Popout" option (Screen 1: Incoming Order Queue; Screen 2: Slip Execution Form)?  
   *Architect Recommendation:* Provide an optional split-window or popout mode using `window.open` for physical multi-monitor clerk desks.
3. **Real-time Charting Engine:**  
   *Question:* Should SAAMX adopt a full financial charting library (e.g. TradingView Lightweight Charts) or remain on lightweight native SVG sparklines and Canvas renderers?  
   *Architect Recommendation:* Retain lightweight SVG sparklines for directory tables to keep bundle size small, and introduce Lightweight Charts exclusively on the `CompanyProfileModal.jsx` deep-dive screen.

---

## 7. Final Phase 6.0 Status Recommendation

**RECOMMENDATION:** **`READY FOR PHASE 6.1`**

### Rationale:
- Complete baseline established: `state.json` SHA-256 hash verified (`441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`).
- Zero code modifications or state mutations made during Phase 6.0.
- All 13 Project Phoenix integrity tests and 7 Phase 7A.1 authentication security tests passing 100%.
- Vite production build clean (3.02s, 0 errors).
- All 4 authoritative audit and design specifications authored and committed:
  1. `docs/SAAMX_PHASE_6_DESIGN_SYSTEM.md`
  2. `docs/SAAMX_PHASE_6_PAGE_INVENTORY.md`
  3. `docs/SAAMX_PHASE_6_FRONTEND_API_AUDIT.md`
  4. `docs/SAAMX_PHASE_6_IMPLEMENTATION_PLAN.md`

Phase 6.1 (Shared UI Primitives & Design Tokens) is fully specified and ready for implementation.
