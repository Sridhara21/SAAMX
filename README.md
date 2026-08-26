# SAAMX - Student Academic Asset Market eXchange

SAAMX is a premium, real-time Financial Market Simulation (FMS) platform built for high-fidelity trading simulation events, mock drills, and academic/corporate training games. The platform integrates a real-time matching ledger, live surveillance dashboards, multi-terminal operators, and automated news event schedulers.

---

## 📊 Core Features

* **Multi-Terminal Role Gateways**:
  * **Coordinator / Admin Desk**: Manage global session timers, pause/resume trading, configure parameters, and toggle the automatic news scheduler.
  * **SEBI Surveillance Desk**: Live audit boards, circuit breaker overrides, and staged scenario intervention controllers.
  * **Exchange Matching Operators**: High-speed, granular-path transaction endpoints to process operator trade inputs and void executions.
  * **Journalist Press Wire**: Manual and scheduled preset news bulletins with direct market sentiment impacts.
  * **Public Projector Grid**: Real-time scrolling ticker,Dynamic sector heatmaps, advances/declines counts, and dynamic visual takeover animations for market halts and bankruptcies.
* **Millisecond-Perfect Synchronization**:
  * Real-time sync across all clients utilizing Firebase Realtime Database.
  * Auto-adjusting countdown timers utilizing server clock-skew offset corrections (`/.info/serverTimeOffset`).
* **Calibrated Volatility Simulator**:
  * Background price simulation tickers with randomized brownian walks, target price velocity controllers (Goldman Pump), and sentiment override systems.
  * Auto-unlocking IPO stages that stage asset prospectus alerts and transition listings to active trading after a 30-second trade lock.
* **Audit & Report Compilers**:
  * Internal scripts to fetch production database states and generate consolidated markdown ledgers detailing team performance, ROI leaderboards, asset histories, and transaction ledgers.

---

## 🛠️ Technology Stack

* **Frontend Client**: React 18, Vite, Vanilla Custom CSS
* **Database & Synchronization**: Firebase Realtime Database (RTDB)
* **Local Backend Mock Server**: Node.js, Express, WebSockets (`ws`)
* **Compilation & Bundling**: Vite, Rollup

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* NPM

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/Sridhara21/SAAMX.git
   cd SAAMX
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a local `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_DATABASE_URL=your_db_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```

### Running Locally
To launch the Vite client dev server locally:
```bash
npm run dev
```

To run the local mock Express backend:
```bash
npm run server
```

### Production Deployment
To build the static application bundle:
```bash
npm run build
```

To deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

---

## 📄 Licensing & Protection
This codebase is private property. All rights to this software, code, assets, and documentation are strictly reserved under the proprietary terms defined in the [LICENSE](./LICENSE) file.

**Copyright (c) 2026 Medam Sridhara. All Rights Reserved.**
