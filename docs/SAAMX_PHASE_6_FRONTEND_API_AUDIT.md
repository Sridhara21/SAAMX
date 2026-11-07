# SAAMX — Phase 6.0 Frontend & API Integration Audit
## Comprehensive Data Layer, Route Integrity, Dual-Pipeline & State Synchronization Audit

**Document ID:** `SAAMX-PHASE6-API-001`  
**Status:** APPROVED FOR PHASE 6.1 IMPLEMENTATION  
**Author:** Full-Stack Architecture & API Security Engineering  
**Target Platform:** SAAMX (Student Academic Asset Market eXchange)  
**Date:** October 2026  

---

## 1. Executive Summary & Architecture Overview

The SAAMX client application communicates across two concurrent data channels:
1. **The Authoritative Node.js / Express Server (`server.js`):** Handles scrypt authentication, role/desk authorization, paper order slip claim-and-match workflows, financial ledger updates, Project Phoenix narrative arcs, and authoritative file persistence (`state.json`).
2. **The Firebase Realtime Database (RTDB):** Provides distributed low-latency document subscriptions (`/stocks`, `/teams`, `/news`, `/orders`, `/meta`) utilized by live dashboards and public screens.

This dual-pipeline architecture introduces complex data flow dynamics, synchronization dependencies, and a critical legacy fallback mechanism in `src/lib/api.js` that warrants immediate architectural governance.

---

## 2. End-to-End Client Data Flow

```
+----------------------------------------------------------------------------------------------------+
|                                      BROWSER CLIENT (REACT)                                        |
|                                                                                                    |
|  +---------------------------+   +----------------------------+   +-----------------------------+  |
|  |  React Component Layer    |   |    useFirebaseState()      |   |        src/lib/api.js       |  |
|  |  (14 Consoles + Modals)   |   |   (RTDB Synchronizer)      |   |   (Typed REST API Client)   |  |
|  +-------------+-------------+   +--------------+-------------+   +--------------+--------------+  |
|                |                                |                                |                 |
+----------------|--------------------------------|--------------------------------|-----------------+
                 |                                |                                |
                 | WebSocket                      | Realtime WebSocket             | HTTP REST
                 | Delta Stream                   | Subscriptions                  | (Bearer Auth)
                 v                                v                                v
+---------------------------------+  +----------------------------+  +-------------------------------+
|  Express WebSocket Server       |  | Firebase Realtime Database |  |  Express REST API Server      |
|  (ws://localhost:3001/ws)       |  | (wss://*.firebaseio.com)   |  |  (http://localhost:3001/api)  |
|  - Real-time tick broadcasts    |  | - Replicated public state  |  |  - Auth & RBAC enforcement    |
|  - Order queue status shifts    |  | - Live ticker mirrors      |  |  - Order validation & match   |
|  - Breaking news interrupts     |  | - Read-only team mirrors   |  |  - Authoritative state.json   |
+---------------------------------+  +----------------------------+  +-------------------------------+
```

---

## 3. The Critical Silent Simulation Fallback (`src/lib/api.js`)

### 3.1 Mechanism Analysis
Lines 331–336 of `src/lib/api.js` implement an automatic client-side simulation interceptor:

```javascript
// src/lib/api.js (Lines 331-336)
if (response.status === 404 || response.status === 502 || isNetworkError) {
  console.warn(`[API FALLBACK] ${endpoint} returned ${response.status}. Falling back to client-side simulation.`);
  return executeClientSimulation(endpoint, body, options);
}
```

When an HTTP request returns `404 Not Found`, `502 Bad Gateway`, or encounters a dropped Wi-Fi packet:
1. The client intercepts the failure silently.
2. It executes a local Javascript mock function (`executeClientSimulation`).
3. It directly mutates the Firebase Realtime Database from the browser using the client Firebase SDK.
4. It resolves the Promise with a synthetic `{ success: true, simulated: true }` object.

### 3.2 Architectural Risks & State Divergence
- **Route Typo Masking:** If a frontend developer introduces a typo in an API URL (e.g. `/api/orders/execut` instead of `/api/orders/execute`), the server returns 404. Instead of surfacing an error, the client simulates the execution locally and writes to Firebase, while `server.js` and `state.json` never record the order!
- **State Divergence:** In the event of network flapping, the client's Firebase RTDB becomes out-of-sync with the authoritative `state.json` file. A team's cash balance might update in Firebase but remain untouched on the authoritative backend.
- **Security Bypass Risk:** Client simulation code lacks the scrypt verification, desk-isolation locks, and anti-replay guards enforced on the backend.

### 3.3 Phase 6.1 Remediation Policy
> [!IMPORTANT]
> **Governed Fallback Gating:**  
> In Phase 6.1, `executeClientSimulation` must **never** trigger on HTTP 404 errors (which indicate real bugs/mismatches). It must be strictly gated behind an explicit environment flag (`VITE_ALLOW_OFFLINE_SIMULATION=true`), accompanied by a prominent, persistent red UI banner: `⚠️ RUNNING IN LOCAL SIMULATION MODE — ACTIONS NOT RECORDED ON EXCHANGE LEDGER`. In production event mode (`VITE_ALLOW_OFFLINE_SIMULATION=false`), all failed requests must throw typed exceptions that surface user-facing error toasts.

---

## 4. Comprehensive REST API Route Inventory & Audit

Every HTTP route invoked by the frontend in `src/lib/api.js` was audited against actual endpoint registrations in `server.js`:

### 4.1 Authentication & Session Endpoints

| HTTP Method | Route Endpoint | Client Caller | Auth Required | Expected Body | Response Shape | Server Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `LoginPage.jsx` | None | `{ username, password, teamId, passcode }` | `{ success: true, token, user, role }` | **VERIFIED** |
| `POST` | `/api/auth/register-team` | `RegistrationPage.jsx` | Admin / Pre-event | `{ teamName, school, members, deskId }` | `{ success: true, teamId, startingCash }` | **VERIFIED** |
| `GET` | `/api/auth/me` | App Bootstrap | `Bearer <token>` | None | `{ success: true, user, role, deskId }` | **VERIFIED** |
| `POST` | `/api/auth/logout` | Consoles Header | `Bearer <token>` | None | `{ success: true }` | **VERIFIED** |

### 4.2 Order Lifecycle & Exchange Floor Endpoints

| HTTP Method | Route Endpoint | Client Caller | Auth Required | Expected Body | Response Shape | Server Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/orders/queue` | `ExchangePage.jsx` | `clerk`, `admin` | Query: `?desk=DESK_1` | `{ success: true, orders: [...] }` | **VERIFIED** |
| `POST` | `/api/orders/:orderId/claim` | `ExchangePage.jsx` | `clerk` (Desk Match) | `{ deskId, clerkId }` | `{ success: true, order: {...} }` | **VERIFIED** (Locks slip) |
| `POST` | `/api/orders/:orderId/validate` | `ExchangePage.jsx` | `clerk` | `{ orderId, verifiedDetails }` | `{ success: true, status: "VALIDATED" }` | **VERIFIED** |
| `POST` | `/api/orders/:orderId/execute` | `ExchangePage.jsx` | `clerk`, `admin` | `{ orderId, executedPrice, qty }` | `{ success: true, tradeId, teamBalances }`| **VERIFIED** |
| `POST` | `/api/orders/:orderId/reject` | `ExchangePage.jsx` | `clerk`, `admin` | `{ orderId, reason }` | `{ success: true, status: "REJECTED" }` | **VERIFIED** |
| `POST` | `/api/orders/:orderId/return` | `ExchangePage.jsx` | `clerk` | `{ orderId, returnNote }` | `{ success: true, status: "RETURNED" }` | **VERIFIED** |
| `POST` | `/api/orders/verify` | `OrderVerificationPage.jsx`| `marshal`, `clerk` | `{ slipNumber, teamId, ticker, qty }` | `{ success: true, verified: true }` | **VERIFIED** |

### 4.3 Participant Team Endpoints

| HTTP Method | Route Endpoint | Client Caller | Auth Required | Expected Body | Response Shape | Server Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/teams/:teamId/portfolio` | `ParticipantTerminal.jsx` | `team` (Own ID only)| None | `{ success: true, cash, holdings, pnl }` | **VERIFIED** |
| `GET` | `/api/teams/:teamId/orders` | `ParticipantTerminal.jsx` | `team` (Own ID only)| None | `{ success: true, orders: [...] }` | **VERIFIED** |
| `GET` | `/api/teams/:teamId/rubric` | `TeamOverviewSection.jsx` | `team` (Own ID only)| None | `{ success: true, rubricBreakdown }` | **VERIFIED** |

### 4.4 Regulatory & SEBI Endpoints

| HTTP Method | Route Endpoint | Client Caller | Auth Required | Expected Body | Response Shape | Server Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/sebi/surveillance` | `SebiPage.jsx` | `sebi`, `admin` | None | `{ success: true, alerts, flags }` | **VERIFIED** |
| `POST` | `/api/sebi/freeze-team` | `SebiPage.jsx` | `sebi`, `admin` | `{ teamId, reason, durationMinutes }` | `{ success: true, teamStatus: "FROZEN" }`| **VERIFIED** |
| `POST` | `/api/sebi/levy-fine` | `SebiPage.jsx` | `sebi`, `admin` | `{ teamId, amount, penaltyReason }` | `{ success: true, newCashBalance }` | **VERIFIED** |
| `POST` | `/api/sebi/clear-alert` | `SebiPage.jsx` | `sebi`, `admin` | `{ alertId }` | `{ success: true }` | **VERIFIED** |

### 4.5 Master Administration & Project Phoenix Endpoints

| HTTP Method | Route Endpoint | Client Caller | Auth Required | Expected Body | Response Shape | Server Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/round/:action` | `AdminPage.jsx` | `admin`, `sridhara` | `{ action: "start"|"pause"|"stop" }` | `{ success: true, round: 2, status }` | **VERIFIED** |
| `POST` | `/api/admin/phoenix-act` | `AdminPage.jsx` | `admin`, `sebi` | `{ act: 1..13, force?: boolean }` | `{ success: true, act, consequences }` | **VERIFIED** (Phase 7A.2) |
| `POST` | `/api/admin/scenario/macro-shock`| `AdminPage.jsx` | `admin` | `{ sector, percentShock, newsHeadline }`| `{ success: true, affectedStocks }` | **VERIFIED** |
| `POST` | `/api/admin/halt-market` | `AdminPage.jsx` | `admin`, `sebi` | `{ halt: true, reason }` | `{ success: true, marketHalted: true }` | **VERIFIED** |
| `GET` | `/api/admin/audit` | `AuditLogsPage.jsx` | `admin`, `sebi` | Query: `?limit=200&cursor=100` | `{ success: true, logs: [...] }` | **VERIFIED** |
| `GET` | `/api/admin/desks` | `FloorOperationsPage.jsx` | `admin`, `ops` | None | `{ success: true, desks: [...] }` | **VERIFIED** |

---

## 5. WebSocket Protocol & Delta Broadcast Architecture

### 5.1 Connection Lifecycle
The frontend connects to the WebSocket broadcast server on initialization:
- **URL:** `ws://localhost:3001/ws` (or TLS equivalent `wss://`)
- **Heartbeat:** Server transmits a ping packet every 15,000ms. Client automatically responds with pong.
- **Reconnect Backoff:** If the socket drops, the client reconnects using exponential backoff with jitter: $T_{\text{reconnect}} = \min(1000 \times 2^{\text{attempts}} + \text{rand}(0, 500), 10000)\text{ ms}$.

### 5.2 Event Catalogue

| Event Type | Payload | Trigger Context | Consuming Pages |
| :--- | :--- | :--- | :--- |
| `STATE_DELTA` | `{ node: "stocks.DTAI.price", val: 170.04 }` | Individual stock tick | `MarketWatch`, `Projector`, `ParticipantTerminal` |
| `ORDER_UPDATE` | `{ orderId: "ORD-104", status: "CLAIMED", desk: "DESK_2" }`| Clerk claims slip | `ExchangePage`, `ParticipantTerminal` |
| `MARKET_TICK` | `{ index: "SAAMX_50", val: 18450.2, delta: -1.2 }` | Master index tick | All Consoles |
| `NEWS_FLASH` | `{ id: "NEWS-201", headline: "DTAI Auditor Resigns", flash: true }`| Journalist / Admin | `ProjectorPage`, `NewsPortalPage`, Team Toasts |
| `HALT_TRIGGERED`| `{ halted: true, timestamp, reason }` | Emergency Halt | Universal Screen Modal Banner |
| `PHOENIX_ACT` | `{ act: 3, title: "OpenAI IPO Launched", consequences }`| Phoenix Orchestrator | `ProjectorPage`, `AdminPage`, `SebiPage` |

### 5.3 Reconnection Reconciliation Protocol
When the WebSocket connection re-establishes after a temporary disruption:
1. Client emits `{ type: "SYNC_REQUEST", lastSyncTimestamp: 1776104200000 }`.
2. Server verifies the timestamp against its internal ring-buffer of recent deltas.
3. If delta history is intact ($\le 120$ seconds of lost frames), server replies with a batched array of missed deltas.
4. If client was offline for $> 120$ seconds, server replies with `{ type: "FULL_STATE_REFRESH" }`, triggering a clean HTTP fetch of current balances and open orders.

---

## 6. Session & Token Management

1. **Storage:** JWT/HMAC token stored in `localStorage.getItem('saamx_token')`.
2. **Authorization Header:** Injected into all `apiFetch` calls: `Authorization: Bearer <saamx_token>`.
3. **Desk Identity:** Desk clerks store active station identifier in `localStorage.getItem('saamx_desk_id')`. Backend verifies that `desk_id` matches the clerk's assigned station permissions.
4. **Token Expiry & Revocation:**  
   - If an API call returns HTTP 401: Client clears `saamx_token`, redirects to `/login`, and displays: "Session expired. Please log in again."
   - Explicit logout triggers `POST /api/auth/logout`, wiping local tokens and terminating the WebSocket session.

---

## 7. Frontend State Management & React Lifecycle Audit

### 7.1 Critical Performance Bottlenecks
- **Monolithic State Subscriptions:** `useFirebaseState.js` subscribes to 12 top-level nodes simultaneously. Any single tick in `/stocks` triggers a re-render of components that only care about `/teams` or `/news` unless wrapped in `React.memo`.
- **DOM Virtualization Gaps:**  
  `MarketWatchPage.jsx` and `StockDirectoryPage.jsx` render full tables containing 2,061 rows. Under rapid WebSocket price deltas, this causes DOM thrashing and micro-stutter on low-end hardware.
- **Unmemoized Computations:**  
  Portfolio net worth and P&L calculations in `PortfolioHoldingsSection.jsx` recalculate on every tick without `useMemo`.

### 7.2 Phase 6.1 Performance Mandates
1. Implement `@tanstack/react-virtual` across all security and audit log tables.
2. Split `useFirebaseState` into granular custom hooks:
   - `useStockPrice(ticker)`
   - `useTeamPortfolio(teamId)`
   - `useOrderQueue(deskId)`
   - `useMarketStatus()`
3. Memoize all financial aggregate calculations with `useMemo`.

---

## 8. Summary Checklist for Phase 6.1 API & Frontend Fixes

- [ ] Gate `executeClientSimulation` behind explicit `VITE_ALLOW_OFFLINE_SIMULATION` flag.
- [ ] Enforce strict HTTP error handling with user-facing toast alerts on all API failures.
- [ ] Granularize `useFirebaseState` to eliminate redundant component re-renders.
- [ ] Virtualize tables rendering $> 50$ rows.
- [ ] Implement WebSocket reconnection catch-up buffer.
- [ ] Standardize keyboard shortcuts across clerk and verification workflows.
