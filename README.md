# Financial Market Simulation (FMS) Platform

FMS is a real-time multiplayer financial exchange, regulatory dashboard, and market simulation network. It allows teams to host a live 60-minute mock trading event where participants enter orders via the Exchange, coordinators monitor market manipulation via the SEBI cockpit, and public displays visualize stock ticks over local network sockets.

A complete visual walkthrough of the dashboard interfaces is available in: **[fms_platform_screenshots.pdf](fms_platform_screenshots.pdf)**.
Detailed hosting setup instructions are available in: **[SETUP.md](SETUP.md)**.

---

## 🌟 Motivation
High-frequency finance and regulatory surveillance are complex systems that are difficult to teach theoretically. FMS was built as an interactive learning laboratory. By connecting multiple client devices (Exchange terminals, SEBI regulator screens, public news projectors) over a unified local server, students experience the mechanics of order book matching, liquidity drains, circuit breakers, and insider trading audits first-hand.

---

## 🏗 How It Works
The platform runs as a single-host server with multi-device connections:
1. **Central Broker Server (`server.js`)**: An Express.js and WebSocket gateway that maintains the order book state, matches buy/sell limits, triggers circuit breakers, and broadcasts real-time feed updates.
2. **Exchange Console (`/exchange`)**: Client terminal where traders submit orders and monitor personal portfolio balances.
3. **SEBI Regulatory Cockpit (`/sebi`)**: Compliance interface to analyze order books, trace suspicious transactions, and freeze stocks.
4. **Projector Dashboard (`/projector`)**: Public display displaying real-time tickers, order depths, and market announcements.
5. **Journalist Desk (`/journalist`)**: Portal to publish market-moving news alerts that alter trading algorithms.
6. **Information Flow**:
   ```
   [Trader Order Submitted] ──► [Exchange Gateway UI]
                                       │
                                       ▼ (WebSocket)
   [Projector Ticker Feed]  ◄── [Central Broker Server] ──► [SEBI Cockpit Alert]
            ▲                          ▲
            └───── [Journalist News] ──┘
   ```

---

## 🤖 AI Usage & Custom Engineering Limits Compliance
FMS is completely custom-engineered and does not rely on third-party LLM APIs:
*   **0% AI API reliance**: There are no external AI dependencies or wrapper services. 
*   **What is Custom Engineered (100%)**: The multi-room WebSocket event broker (`server.js`), pricing engine with price limits and bid-ask spreads (`server.js`), live charts, local layout components, simulation generators, and local network discovery routes.

---

## 🛠 Technology Stack
*   **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, WebSocket Client
*   **Backend Server**: Node.js, Express, WS (WebSockets)
*   **Simulation Scripting**: PDFKit, Custom JS pricing models
*   **Network Protocol**: Real-time bidirectional WebSockets

---

## 🖥 Platform Preview (Interfaces)
*   **Exchange Entry**: High-speed limit/market order book console.
*   **SEBI Control Panel**: Audit logs, trade histories, and stock freeze switches.
*   **Projector Page**: Chart ticks and news flashes for public screens.
*   **Journalist Panel**: Custom news writer with predetermined stock impact factors.

---

## ⚡ Quick Setup & Host Guide
Ensure the host laptop and all user devices are connected to the same Wi-Fi network.

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Central Server**:
   ```bash
   node server.js
   ```
3. **Find Host IP**: Find your local IPv4 address (e.g. `192.168.1.50`).
4. **Traders/Staff Connection**: Open a web browser on any device and visit `http://<HOST-IP>:3000/exchange` or `/sebi`.
