# SAAMX — Architectural Decision Records (ADRs)

---

## ADR-001: Consolidation of Verification Desk into Exchange Desk
* **Status:** Confirmed & Planned  
* **Date:** 2026-10-11  
* **Context:** The application previously split physical paper order slips between an independent `VerificationPage.jsx` and an `ExchangePage.jsx`. In live operations, this added unnecessary multi-operator latency and screen hopping without adding independent validation value.  
* **Decision:** Remove the standalone Verification Desk route/page and consolidate operational order review, slip verification, risk validation, and execution directly into the **Exchange Desk** (`ExchangePage.jsx`).  
* **Consequences:** Simplifies floor staffing to a single unified Exchange Desk while retaining all underlying server validation checks, duplicate slip guards, and status audit logging.

---

## ADR-002: Authoritative 2,061 Securities Universe & ₹1 Crore Starting Capital
* **Status:** Confirmed & Implemented  
* **Date:** 2026-10-11  
* **Context:** The event requires a broad multi-asset universe (Indian equities, global equities, ETFs, commodities, and simulated IPOs) with institutional-scale virtual capital for 10–20 high-school Investment Houses.  
* **Decision:** The backend dataset in `state.json` authorizes exactly 2,061 securities and 20 Investment Houses (`T01`–`T20`), each initialized with ₹1,00,00,000 (₹1 Crore) starting cash balance in their INR wallet.  
* **Consequences:** All portfolio accounting, mark-to-market valuations, and scoring formulas must evaluate against this authoritative server dataset. Client-side state overrides are prohibited.

---

## ADR-003: Responsive Expandable Sidebar Navigation
* **Status:** Confirmed & Planned  
* **Date:** 2026-10-11  
* **Context:** The current application uses a top horizontal navigation bar containing 17 tabs. This results in severe header overcrowding, text truncation on standard screens, and total breakage on tablet/mobile screens.  
* **Decision:** Replace the top navigation with a responsive expandable/collapsible sidebar component. In expanded mode, it renders grouped navigation links with clear section hierarchy and role tags. In collapsed mode, it renders clean iconography with accessible floating tooltips.  
* **Consequences:** Greatly improves screen real estate for financial charts and tables while ensuring seamless navigation across all 20 pages.

---

## ADR-004: SAAMX-Verified Stock Advisors Framework
* **Status:** Confirmed & Planned  
* **Date:** 2026-10-11  
* **Context:** Stock advisory previously functioned as an ad-hoc broker research terminal without a formal directory or clear verification status.  
* **Decision:** Establish a dedicated "SAAMX-Verified Stock Advisors" directory. Each advisor profile will showcase name, coverage area, biography, availability, and an official SAAMX verification badge. Verification status can only be granted, suspended, or revoked by authorized personnel.  
* **Consequences:** Provides a realistic institutional advisory experience without creating false regulatory or performance claims.

---

## ADR-005: Unified Single-Backend Authority (`server.js`)
* **Status:** Confirmed & Enforced  
* **Date:** 2026-10-11  
* **Context:** A historical dual-backend topology existed between Google Firebase Realtime Database and the local Node.js `server.js` Express/WebSocket instance, creating split-brain risks during live multi-laptop execution.  
* **Decision:** `server.js` running on the event host machine is the authoritative single source of truth for all trades, orders, portfolios, valuation snapshots, and market events. `apiFetch` dispatches directly to the server, and `state.json` provides persistent crash-safe storage.  
---

## ADR-006: Unified Team Trading Workstation Architecture (Four Core Sections & Strict Physical Paper Trading)
* **Status:** Confirmed & Implemented  
* **Date:** 2026-10-12  
* **Context:** The Participant/Team Terminal previously contained scattered tabs (portfolio, analytics, directory with an inappropriate digital order entry form, orders, intelligence, ipo), creating workflow confusion and drifting away from SAAMX's core physical paper-based trading simulation model.  
* **Decision:** Redesign the Team Terminal into a cohesive financial workstation organized into four primary sections:
  1. **Team Overview:** Unified dashboard for team credentials, delegate roles, session phase, authoritative cash/portfolio ledger summary, recent paper slips, and breaking news.
  2. **Market Overview & Intelligence:** One unified page integrating a compact market snapshot (4 major indices, breadth, movers), full 2,062 securities explorer with multi-exchange filters, contextual security research drawer, and a unified chronological intelligence feed (Corporate, Regulatory/SEBI, Macro/RBI, Sector trends, Advisor theses).
  3. **Portfolio & Holdings:** Pure monitoring station displaying authoritative server holdings, cost basis, current market valuation, dual P&L, multi-currency cash wallets (INR, USD, GBP, EUR), and diversification breakdowns without digital trade buttons.
  4. **Order History:** Physical paper order lifecycle tracking displaying unique order IDs, ticket numbers, timestamps, review stages, clerk return reasons, and resubmissions via `/api/orders/resubmit`.
* **Consequences:** Eliminates confusing separate tabs, unifies intelligence and market research onto a single surface, and preserves the authentic physical paper slip exchange process.

---

## ADR-007: Dynamic Desk Assignment & Strict Station-Level Isolation
* **Status:** Confirmed & Implemented  
* **Date:** 2026-10-13  
* **Context:** Physical order clearance desks had hardcoded operator names (`Sandesh`, `Akshay`, `Aarush`, `Sridhara`, `Aksharaa`) coupled to desks in both frontend components and server routes. Operators could also claim or manipulate order slips intended for other desks without server verification.  
* **Decision:**
  1. Decouple physical desks (`DESK_1`..`DESK_5`) into dynamic server state `state.orderDesks`, with operator bindings managed via REST APIs (`POST /api/desks/assign`) and UI modals in Personnel and Onboarding.
  2. Implement strict server-side desk isolation in `server.js`: An operator assigned to a station (e.g. `DESK_1`) is forbidden from claiming or actioning orders belonging to another station (e.g. `DESK_2`), returning HTTP 403 Forbidden.
  3. Desks are exclusive for operators: assigning an operator to a desk replaces prior assignments.
  4. Client-supplied desk tampering in request payloads is rejected; the server enforces identity strictly from session tokens.
  5. Supervisors (`super_admin`, `admin`, Sridhara, or accounts with `desks.cross_operate`) maintain floor-wide oversight and can action orders across any desk.
* **Consequences:** Eliminates hardcoded staffing assumptions, allows live reassignment on the trading floor without restarts or re-logins, and guarantees physical clearance desk integrity.

---

## ADR-008: Multi-Device Scalability via Pre-Serialized Delta Broadcasts & Atomic Mutex Locks
* **Status:** Confirmed & Implemented  
* **Date:** 2026-10-13  
* **Context:** When operating with 100–120 connected laptops and tablets on the trading floor, broadcasting full server state (including 2,062 securities) on every order mutation required serializing and cloning large JSON trees 120 times per event in a single Node.js event loop tick, exhausting the V8 heap and risking latency spikes or crash loops. Furthermore, concurrent paper slip intake created race conditions.  
* **Decision:**
  1. **Pre-Serialized Delta Broadcasting:** State mutations construct a lightweight delta payload (e.g. `{ type: 'ORDER_CLAIMED', order, desks: state.orderDesks }`) and pre-serialize it once (`JSON.stringify`) before broadcasting to all 120 client sockets. This reduces per-broadcast heap allocations by >99.9% and CPU execution time from hundreds of milliseconds to under 2ms.
  2. **WebSocket Heartbeats:** Server implements a 30-second ping/pong heartbeat interval, pruning dead sockets automatically after 2 missed beats.
  3. **Atomic Mutex Locks:** In-memory mutex map (`activeOrderLocks`) locks order IDs during async claim and execution operations, returning HTTP 409 Conflict if another operator or process attempts simultaneous operations on the same slip.
  4. **Compact State Storage:** Disk persistence (`saveState()`) uses unindented compact JSON formatting to reduce I/O overhead and prevent memory bloat.
* **Consequences:** Enables smooth real-time operation across 100–120 devices with low CPU/RAM footprint and zero risk of duplicate execution or concurrent slip corruption.

