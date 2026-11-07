# SAAMX 2.0 — Project Context & Master Specification

**Project:** Student Academic Asset Market eXchange (SAAMX)  
**Host:** Inter-School Market Simulation Championship hosted by Gatik Junior College, Tarnaka, Hyderabad  
**Tagline:** *"Experience the Market. Don't Just Learn It."*  
**Audience:** High-school student investment teams (Investment Houses), school faculty, event operators, and regulators  
**Last Updated:** 2026-10-11  

---

## 1. Product Mission & Purpose

SAAMX is an educational financial market simulation and inter-school championship platform modeled after multi-asset securities trading exchanges (NSE/BSE, NASDAQ/NYSE, LSE, XETRA). 

It is designed to give high-school students experiential education in:
- Value investing & fundamental analysis
- Portfolio construction & diversification
- Risk management & drawdown controls
- Real-time market dynamics, macroeconomic news reactions, and decision-making under pressure
- Multi-currency transactions & foreign exchange spot trading

---

## 2. Confirmed Core Product Decisions

The following product decisions are authoritative:

### A. Market & Team Configuration
- **2,000+ Securities Universe (2,061 Canonical / 2,063 Runtime):** Curated multi-asset dataset covering Indian Equities (NSE/BSE large/mid/small cap), Global Equities (US tech & industrials, UK/Europe blue chips), ETFs, Commodities, and 5 simulated venture IPOs (`OAI` OpenAI, `STRP` Stripe, `CNVA` Canva, `DISC` Discord, `POLY` Polymarket). The canonical dataset `universe_data.js` contains 2,061 instruments; runtime `state.json` contains exactly 2,063 instruments ($2,061 + 2$), with the additional two being `S_DTAI_066` (`DTAI` - Delta AI Labs Ltd narrative crisis asset for Project Phoenix) and `S_RELI_001` (`RELI` - Reliance Energy & Petrochem Ltd liquidity benchmark asset). Both sets contain 0 duplicate tickers and 0 duplicate IDs.
- **₹1,00,00,000 (₹1 Crore) Starting Virtual Capital:** Exactly ₹1,00,00,000 in starting virtual INR cash allocated to each Investment House.
- **Configurable 10 to 20 Investment Houses:** System supports dynamically configured capacity from 10 to 20 concurrent houses ($10 \le C \le 20$, default 20). Aggregate virtual starting capital scales linearly with capacity ($C \times \text{₹1 Crore}$ = ₹10 Crore to ₹20 Crore).
- **Authoritative Backend Ledger:** Financial accounting, balances, price elasticity, and portfolio valuations are authoritative on the server, not calculated client-side.

### B. Consolidated Exchange Desk
- **Consolidation:** The standalone Verification Desk is removed. Operational order intake, review, risk checking, and execution are consolidated into the **Exchange Desk**.
- **Intended Workflow:**
  $$\text{Order Submission} \longrightarrow \text{Server-Side Validation} \longrightarrow \text{Exchange Desk Review} \longrightarrow \text{Execution or Rejection} \longrightarrow \text{Trade Recording} \longrightarrow \text{Portfolio \& Cash Update}$$
- **Physical Ticket Support:** Preservation of the physical paper order-slip workflow (`ticketNumber` logging, duplicate ticket rejection, and audit trail).
- **Integrity Preservation:** Consolidating the desk maintains server-side risk checking, balance validation, atomic locks against duplicate execution, and mandatory rejection reasons.

### C. SAAMX-Verified Stock Advisors
- **Designation:** Formally presented as **SAAMX-Verified Stock Advisors**.
- **Directory Structure:** Directory features advisor names, specialized coverage areas (Domestic Equities, Global Markets, FX/Commodities, Portfolio Risk), biographies, verified status badges, and real availability.
- **Verification Governance:** SAAMX verification status is granted, suspended, or revoked exclusively by authorized administrators.
- **Ethical Integrity:** SAAMX verification is explicitly framed as an event educational designation, never fabricated as a SEBI registration or financial performance guarantee.
- **Real Action Workflows:** No dead contact buttons or fake submission alerts. Consultations and signal requests link to real backend states.

### D. Responsive Expandable Sidebar
- **Layout Shift:** Replace the crowded 17-tab horizontal header with an expandable/collapsible sidebar.
- **Navigation Features:**
  - Expanded mode (full labels, role badges, section headers)
  - Collapsed mode (clean icons with accessible floating tooltips)
  - Logical section grouping (Trading, Desks, Intelligence, Surveillance, Administration)
  - Active route highlighting
  - Role-based item filtering
  - Fully responsive across desktop, tablet, and mobile displays
  - Preserves deep links (`#/exchange`, `#/team`, etc.) and browser history navigation

### E. Unified Design System & Page Restructuring
- **Surfaces:** Deep navy (`#070A0F`, `#0B132B`, `#1C2541`) and blue-gray backdrops.
- **Interactive Accents:** Cyan / electric teal (`#00F2FE`, `#06B6D4`).
- **Semantic Colors:**
  - Emerald green (`#10B981`) for positive returns, gains, and approvals.
  - Crimson red (`#EF4444`) for losses, rejections, halts, and cancellations.
  - Amber (`#F59E0B`) for warnings, circuit cautions, and pending reviews.
- **Standardized UI Elements:** Shared typography, card surfaces, data tables, status badges, empty states, and Indian Rupee financial number formatting (`₹1,23,456.78`).

---

## 3. Technology Stack & Key Dependencies

- **Frontend:** React 18.3.1, Vite 5.4.11, Vanilla CSS tokens (`index.css`)
- **Backend:** Node.js (ES Modules), Express 4.21.1, WebSocket (`ws` 8.18.0) in [server.js](file:///c:/Users/Lapcarts%20Electronics/OneDrive/Desktop/Antigravity/SAAMX/server.js)
- **Data Persistence:** Local JSON storage in [state.json](file:///c:/Users/Lapcarts%20Electronics/OneDrive/Desktop/Antigravity/SAAMX/state.json) with automated backup snapshots in `backups/`
- **Scoring Engine:** [scoring_engine.js](file:///c:/Users/Lapcarts%20Electronics/OneDrive/Desktop/Antigravity/SAAMX/scoring_engine.js) (1,000-point multi-dimensional rubric)
- **Market Data:** [universe_data.js](file:///c:/Users/Lapcarts%20Electronics/OneDrive/Desktop/Antigravity/SAAMX/universe_data.js) & [parsed_universe.json](file:///c:/Users/Lapcarts%20Electronics/OneDrive/Desktop/Antigravity/SAAMX/parsed_universe.json)

---

## 4. Operational Roles & Security Perimeter

1. **`team` (Investment House):** Participants executing trades and viewing personal portfolios.
2. **`operator_x` (Exchange Desk Operator):** Staff operating the order desks and currency exchange.
3. **`admin` (Competition Director):** Master event control, schedule phases, and results publication.
4. **`sebi` (Surveillance Officer):** Market monitoring, circuit limits, and regulatory penalties.
5. **`journalist` (Press & Intelligence):** Authoring live market bulletins and news broadcasts.
6. **`portfolio` (Observer / Evaluator):** Read-only cross-team portfolio oversight.
