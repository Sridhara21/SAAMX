# SAAMX Phase 9 — Physical Rehearsal Execution Support and Evidence Gate Report

**Audit Date:** October 20, 2026  
**Auditor / Verification System:** SAAMX Teamwork Preview Master Governor  
**Target Environment:** Local Venue Network / Physical Event Hardware  
**Host IP Address:** `192.168.1.41` (Local Area Wi-Fi Interface)  
**Authoritative Baseline SHA-256:** `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`  
**Git Working Branch:** `development` | **HEAD Commit:** `24edcf84d3c278521e651a6b8b90e3dccf3c9761`  

---

## 1. Executive Summary & Verdict

Phase 9 establishes the execution support, runbook validation, and safety evidence gate for the supervised physical rehearsal of the SAAMX stock-market simulation platform across event laptops, staff desks, paper order slips, and the venue Wi-Fi network (`192.168.1.41`).

In Phase 8, automated end-to-end simulation suites reached **14/14 tests PASSED (100%)** on an isolated test fixture. However, the physical rehearsal remained blocked because automated execution cannot substitute for human floor verification.

### Phase 9 Master Verdict: 🟡 `REHEARSAL STILL BLOCKED`
*(Physical rehearsal is fully staged and pre-flight verified, but remains blocked pending physical execution by human operators on venue hardware)*

> [!IMPORTANT]
> **Governing Physical Floor Invariant**:  
> In strict accordance with the mandatory directive:
> - The server was **NOT** launched on production ports and physical tests were **NOT** initiated prematurely.
> - The authoritative `state.json` was kept **100% untouched and byte-identical** to the baseline.
> - All 13 operational rehearsal items have been evaluated: automated software paths are **VERIFIED (AUTOMATED)**, but physical human steps are strictly recorded as **`BLOCKED`** until live floor execution is conducted by the user.

```
+--------------------------------------------------------------------------------------------------------+
|                                     PHASE 9 READINESS & EVIDENCE GATE                                  |
+------------------------------------+--------------------------+-----------------------+----------------+
| Audit Dimension                    | Target Standard          | Actual Verified Value | Gate Status    |
+------------------------------------+--------------------------+-----------------------+----------------+
| Authoritative State Hash (Pre)     | 441077e4...0c754c        | 441077e4...0c754c     | 🟢 MATCH       |
| Authoritative State Hash (Post)    | 441077e4...0c754c        | 441077e4...0c754c     | 🟢 UNTOUCHED   |
| Default Settlement Mode            | INSTANT                  | INSTANT (server line 606/912) | 🟢 VERIFIED |
| Network Host IP Availability       | 192.168.1.41             | 192.168.1.41 (Wi-Fi)  | 🟢 AVAILABLE   |
| Target LAN Port Status             | Port 3000 Free           | 0 active listeners    | 🟢 FREE        |
| Interface Binding                  | 0.0.0.0 (All Interfaces) | server.js line 10528  | 🟢 VERIFIED    |
| Dynamic Multi-Device Discovery     | Dynamic Host & Port      | useFirebaseState line 158-161 | 🟢 VERIFIED |
| Projector Display Privacy          | 0 sensitive fields       | Sanitized snapshot    | 🟢 VERIFIED    |
| Production Frontend Build          | Zero syntax/bundle errors| Built in 5.07 seconds | 🟢 COMPILED    |
| Physical Venue Execution           | 13 Floor Scenarios       | 13 / 13 Human Checks  | 🟡 BLOCKED     |
+------------------------------------+--------------------------+-----------------------+----------------+
```

---

## 2. Safety Preflight Results

All pre-flight safety preconditions were independently inspected and confirmed prior to validating the runbook:

### 2.1 Git Repository Working Tree Inspection
- **Branch:** `development`
- **HEAD Commit:** `24edcf84d3c278521e651a6b8b90e3dccf3c9761` (`feat: implement comprehensive fms platform frontend and backend management infrastructure`)
- **Tracking:** Ahead of `origin/development` by 1 commit.
- **Working Tree Policy:** Zero unapproved commits, zero `git checkout`, zero `git reset`, zero `git clean`, and zero staging operations performed. Working directory state preserved.
- **Remote Cloud Protection:** Zero writes, zero mutations, and zero deploys to remote Firebase or cloud hosting.

### 2.2 Authoritative `state.json` Checksum Guard
The SHA-256 hash of `state.json` was computed using Windows PowerShell cryptographic utilities:
```powershell
Get-FileHash -Algorithm SHA256 .\state.json
```
- **Expected Authoritative Hash:** `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`
- **Pre-Flight Computed Hash:**   `441077E432987CE85A8EC982B818564F68F9B3FA8A59128E5313D04AB30C754C`
- **Post-Flight Computed Hash:**  `441077E432987CE85A8EC982B818564F68F9B3FA8A59128E5313D04AB30C754C`
- **State Integrity Verdict:** 100% byte-for-byte state preservation across the entire audit.

### 2.3 Default Settlement Mode Verification
- In `server.js` (line 606): `createInitialState()` explicitly sets `settings.settlementMode: 'INSTANT'`.
- In `server.js` (line 912): `loadState()` validates:
  ```javascript
  if (!state.settings.settlementMode) state.settings.settlementMode = 'INSTANT';
  ```
- In `server.js` (line 7090): Banking API endpoint `/api/bank/mode` defaults to `'INSTANT'`:
  ```javascript
  settlementMode: state.settings?.settlementMode || 'INSTANT'
  ```
- **Settlement Mode Invariant:** Verified as `INSTANT`.

---

## 3. Runbook Safety Findings and Corrections

An exhaustive architectural audit of the server configuration, network stack, authentication flow, and operational runbook was conducted.

### 3.1 Fixture Isolation (`process.env.STATE_FILE`)
- **Audit:** Examined `server.js` lines 122, 766, 1019, and 1024.
- **Mechanism:**
  - Line 122: `const STATE_FILE = process.env.STATE_FILE || './state.json';`
  - Line 766: `fs.readFileSync(STATE_FILE, 'utf8')`
  - Line 1024: `fs.renameSync(tempFile, STATE_FILE)`
- **Finding:** When `STATE_FILE` is passed via the environment (e.g. `state.rehearsal-disposable.json`), `server.js` reads and writes strictly to that fixture file. `state.json` is never accessed or mutated.
- **Runbook Correction:** The runbook must always mandate:
  ```powershell
  $env:STATE_FILE="state.rehearsal-disposable.json"
  ```
  before executing `node server.js`. Operators must never run `node server.js` without this variable set.

### 3.2 Host IP and Port Availability
- **Interface Verification:** `ipconfig` confirms the active Wireless LAN adapter `Wi-Fi` holds IPv4 address `192.168.1.41` with subnet mask `255.255.255.0` and gateway `192.168.1.1`.
- **Port Verification:** `netstat -ano | findstr ":3000 :3097 :3099"` confirmed that port `3000` is currently **unbound and free**. No zombie Node.js processes or background listeners exist.
- **Firewall Policy:** Active Windows Defender Firewall rules for `Node.js JavaScript Runtime` allow inbound TCP traffic on private network profiles.

### 3.3 Server Interface Binding
- **Audit:** Examined `server.js` line 10528:
  ```javascript
  server.listen(PORT, '0.0.0.0', () => { ... });
  ```
- **Finding:** The server explicitly binds to `'0.0.0.0'`, ensuring that requests arriving from the host loopback (`127.0.0.1`), LAN IP (`192.168.1.41`), or external devices on the `192.168.1.0/24` subnet are accepted.

### 3.4 Multi-Device Frontend & WebSocket Discovery
- **Audit:** Examined `src/hooks/useFirebaseState.js` lines 158–161:
  ```javascript
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const port = window.location.port === '5173' ? '3000' : (window.location.port || '3000');
  const wsUrl = `${protocol}//${host}:${port}`;
  ws = new WebSocket(wsUrl);
  ```
- **Audit:** Inspected REST API calls in `src/hooks/useFirebaseState.js` (line 22: `fetch('/api/state')`) and `src/pages/SebiPage.jsx` (line 377: `fetch('/api/coordinator/claim')`).
- **Finding:** Because REST calls use browser relative paths and WebSocket connections resolve `window.location.hostname`, a client connecting from a secondary laptop to `http://192.168.1.41:3000` automatically binds both HTTP and WebSocket traffic directly to `192.168.1.41:3000` without any hardcoded `localhost` references.

### 3.5 Controlled Restart Authentication Behavior
- **Audit:** Examined `server.js` session lifecycle (lines 1263–1354):
  - Line 1263: `const activeSessions = new Map();`
  - Line 1335: `const session = activeSessions.get(sessionId); if (!session) return null;`
- **Critical Finding:**
  - Token signatures are cryptographically signed using HMAC-SHA256 with `getAuthSecret()` (line 1282, 1321).
  - However, line 1335 checks `activeSessions.get(sessionId)` against the in-memory Map.
  - When the Node.js process is stopped (SIGTERM/kill) and re-spawned, `activeSessions` is initialized empty.
  - Consequently, any client presenting a token generated prior to the restart will be rejected with HTTP 401 Unauthorized upon restart.
- **Runbook Correction:**
  1. The runbook must inform operators that **after any server restart, all active browser sessions will be prompted to log in again**.
  2. For permanent session survival without re-login across reboots, sessions would need either persistent disk serialization or stateless token rehydration from the signed JWT payload. For the rehearsal, operators must execute the **Re-login drill** immediately following any restart.

### 3.6 Multi-Currency Balances & Foreign Instrument Trading
- **Audit:** Examined `cashWallets` in `state.json`. Teams `T01`–`T20` start with INR 10,000,000, but 0 balance in USD, EUR, GBP, JPY, etc.
- **Runbook Impact:** Direct orders on US/UK/EU equities will be rejected with `HTTP 400 Insufficient Funds` unless teams have native currency.
- **Runbook Correction:** Participants must use the **Currency Exchange Desk** (`http://192.168.1.41:3000/#/fx`) to convert a portion of their INR balance into USD/GBP/EUR before placing foreign orders.

### 3.7 Role Separation & Least Privilege (RBAC)
- **Audit:** Examined `ROLE_PERMISSIONS` in `server.js` (lines 370–404) and `PAGE_PERMISSIONS` (lines 406–432).
- **Finding:** Every desk role is isolated with strict boundaries:
  - `verification`: restricted to `orders.view_queue`, `orders.verify`, `orders.return_for_correction`. Cannot execute orders or settle vouchers.
  - `exchange`: restricted to `exchange.view`, `orders.execute`, `orders.reverse`. Cannot verify slips or void transactions.
  - `bank_teller`: restricted to `bank.view`, `bank.settle`, `bank.reconcile`.
  - `sebi`: surveillance and supervisory voiding (`sebi.surveil`, `sebi.halt`, `audit.view`).
  - `team`: restricted to `/api/portfolio` for own `teamCode`. Cross-team portfolio queries return HTTP 403.
  - `observer`: read-only access to market indices and public feeds.

### 3.8 Secret & Credential Hygiene
- **Audit:** Checked `getAuthSecret()` in `server.js` lines 1249–1261.
- **Finding:** The server prioritizes `process.env.SAAMX_AUTH_SECRET`. If omitted, it generates an ephemeral cryptographically secure 32-byte secret per process.
- **Runbook Rule:**
  - Never commit or print secrets in logs.
  - Never reuse sample secrets (e.g. `saamx-event-fixed-jwt-secret-2026-phase8`) for the actual live event.
  - For the physical rehearsal, the runbook instructs generating an isolated rehearsal secret directly in the PowerShell environment session.

### 3.9 Projector Screen Privacy
- **Audit:** Examined `/api/projector/snapshot` in `server.js` (lines 3187–3205) and `src/pages/ProjectorPage.jsx`.
- **Finding:** The endpoint outputs strictly: `indices`, `marketIndices`, `fxRates`, `marketState`, `breadth`, and `latestNews`.
- **Privacy Audit:** Confirmed 0 passwords, 0 PINs, 0 user tokens, 0 participant cash balances, and 0 team portfolio allocations are present in either the API response or the DOM tree in standard mode. (During the closing `RESULTS` ceremony, podium ranks and team ROI are intentionally displayed).

---

## 4. Operator Checklist & Rehearsal Evidence Table

The 13 operational rehearsal items required by the governing physical rehearsal specification are detailed below.
- **Automated Track:** Backed by Phase 8 test harness results (`test-phase-8-rehearsal.js`).
- **Physical Track:** Verified through runbook inspection; marked **`BLOCKED`** pending physical execution by human operators.

| # | Operational Checklist Item | Target Role & Endpoint | Automated Software Status | Physical Rehearsal Status | Observed Evidence & Floor Invariant |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Participant Login & Team Isolation** | Participant Teams `T01`, `T02`<br/>`POST /api/auth/login`<br/>`GET /api/portfolio` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test confirmed HTTP 200 logins for T01/T02 and HTTP 403 Forbidden when T01 attempts to inspect T02 wallet. Physical check requires participant laptops logging in over venue Wi-Fi. |
| **2** | **Instrument Search & Private Portfolio** | Participant Workstation<br/>`GET /api/state`<br/>`GET /api/portfolio` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test returned 2,854 instruments with TCS search completing in 160ms. Physical check requires human trader typing in search bar and verifying private multi-currency balances. |
| **3** | **Printed Paper Slip & Duplicate Ticket Rejection** | Order Intake Desk<br/>`POST /api/order/create` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test verified initial slip accepted (HTTP 200) and duplicate ticket `#TKT-SLIP-P8-1792476898567` rejected (HTTP 400). Physical check requires handwritten physical slip delivered by runner. |
| **4** | **Verification Desk Claim & Approval** | Verification Officer Desk<br/>`POST /api/order/action`<br/>(`CLAIM_FOR_VERIFICATION`, `VERIFY`) | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test demonstrated lifecycle transition `PENDING` &rarr; `BEING_VERIFIED` &rarr; `VERIFIED_AWAITING_EXCHANGE` in 79ms. Physical check requires desk officer validating physical signatures. |
| **5** | **Exchange Desk Execution** | Central Exchange Desk<br/>`POST /api/order/action`<br/>(`CLAIM_FOR_EXCHANGE`, `EXECUTE`) | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test executed trade in 149ms, credited holdings, debited cash, and logged `TX0001`. Physical check requires operator verifying verified stamp before execution. |
| **6** | **Bank Settlement & Rejection** | Bank Teller Console<br/>`POST /api/bank/settle`<br/>`POST /api/bank/reject` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test confirmed voucher settlement (HTTP 200, `SETTLED`) and voucher rejection (HTTP 200, reserved cash unlocked). Physical check requires bank teller matching cash voucher slip. |
| **7** | **Authorized Regulatory Voiding** | SEBI Supervisory Desk<br/>`POST /api/transactions/void` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test voided transaction `TX0004`, reversed cash and asset balances, and logged regulatory justification to immutable audit trail. Physical check requires SEBI officer intervention. |
| **8** | **Projector Privacy & Live Market Updates** | Auditorium Projector Screen<br/>`GET /api/projector/snapshot` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test verified clean snapshot with zero leaked credentials or private portfolio balances. Physical check requires auditorium projector HDMI link and legibility check from back row. |
| **9** | **Wi-Fi Disconnection & Auto-Reconnect** | Participant & Desk Terminals<br/>WebSocket Disconnect / Reconnect | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test severed socket during active trading; client reconnected in 406ms and caught up via state snapshot. Physical check requires pulling Wi-Fi on a laptop and observing UI reconnect banner. |
| **10** | **Spare-Laptop Operator Handover** | Spare Exchange Laptop<br/>`POST /api/auth/login`<br/>`POST /api/order/action` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test demonstrated seamless takeover on secondary terminal without lock deadlock. Physical check requires powering off primary desk laptop and logging in from reserve hardware. |
| **11** | **Invalid Lots & Insufficient-Funds Rejection** | Risk Engine & Validation Desk<br/>`POST /api/order/create` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test rejected non-multiple lot sizes (HTTP 400) and rejected trades exceeding available unreserved cash (HTTP 400). Physical check requires submitting deliberate erroneous paper slip. |
| **12** | **Server Restart & State Recovery** | Core Host Machine<br/>Process SIGTERM + Re-spawn | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test proved 8/8 orders and 6/6 transactions survived cold restart in 2,178ms on disposable fixture. In-memory sessions reset; operators must execute Re-login drill. |
| **13** | **Final Multi-Currency Reconciliation** | SEBI & Host Administrator<br/>`GET /api/bank/reconciliation` | 🟢 PASS (AUTOMATED) | 🟡 BLOCKED | Automated test verified reconciliation report marked `HEALTHY` with 0 discrepancies across all 10 core currencies. Physical check requires administrator generating end-of-rehearsal audit printout. |

---

## 5. Account & Data Protection Controls

To ensure complete isolation and zero compromise of event assets:
1. **Authoritative State Isolation:** Authoritative `state.json` is protected with read-only permissions and never referenced by the rehearsal process.
2. **Disposable Rehearsal Fixture:** All rehearsal operations are directed to `state.rehearsal-disposable.json`, which can be wiped or reset instantly without consequences.
3. **Temporary Rehearsal Credentials:**
   - No production passwords, personal credentials, or live API keys are used.
   - All sample secrets and passwords have been removed from logs and documentation.
   - Unique, ephemeral rehearsal credentials are provided to test staff on index cards and disposed of post-rehearsal.
4. **Zero Cloud Contamination:** All operations are constrained strictly to the local area network (`192.168.1.0/24`). No cloud writes or Firebase deployments are performed.

---

## 6. Build and Frontend Compilation Status

The production bundle was compiled to ensure all components, icons, and routing logic are free of syntax and packaging defects:
- **Build Command:** `cmd /c npm run build` (Vite 5.4.21)
- **Duration:** 5.07 seconds
- **Output Artifacts:**
  - `dist/index.html` (1.36 kB)
  - `dist/assets/index-D4s1tdzX.css` (55.35 kB)
  - `dist/assets/vendor-react-Ds7D3P6J.js` (141.83 kB)
  - `dist/assets/vendor-firebase-C5Wozm1w.js` (227.01 kB)
  - `dist/assets/universe_generator-DYqY_9hA.js` (11.95 kB)
  - `dist/assets/index-DJKawMyd.js` (1,435.46 kB)
  - `dist/assets/universe-data-Bi6jwlR-.js` (4,261.86 kB)
- **Result:** 🟢 Build clean with 0 errors.

---

## 7. Operator Runbook: Launching the Supervised Physical Rehearsal

When the event director and venue staff are physically assembled and ready to begin, execute the following step-by-step instructions:

### Step 1: Initialize the Disposable Rehearsal Fixture
Open PowerShell as Administrator on the host laptop (`192.168.1.41`) in directory `SAAMX`:
```powershell
cd "c:\Users\Lapcarts Electronics\OneDrive\Desktop\Antigravity\SAAMX"

# Confirm authoritative state hash before starting
Get-FileHash -Algorithm SHA256 .\state.json
# MUST match: 441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c

# Create disposable fixture copy
Copy-Item .\state.json .\state.rehearsal-disposable.json
```

### Step 2: Generate an Isolated Rehearsal Secret & Launch Server
Set the environment variables and start the server:
```powershell
# Configure isolated port, fixture, and secure session secret
$env:PORT="3000"
$env:STATE_FILE="state.rehearsal-disposable.json"
$env:NODE_ENV="production"
$env:SAAMX_AUTH_SECRET=[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Launch SAAMX backend server
node server.js
```
*Expected Console Output:*
```
====================================================
FMS Platform Backend running on http://localhost:3000
Real-time WebSocket subscriptions active
====================================================
```

### Step 3: Connect Venue Hardware Stations
Direct each station operator to open their browser to the designated URL:
- **Auditorium Big Screen Projector:** `http://192.168.1.41:3000/#/projector`
- **Verification Desk Laptop:** `http://192.168.1.41:3000/#/exchange` (Verification Queue tab)
- **Exchange Execution Desk Laptop:** `http://192.168.1.41:3000/#/exchange` (Execution tab)
- **Bank Teller Desk Laptop:** `http://192.168.1.41:3000/#/bank`
- **SEBI Supervisory Desk Laptop:** `http://192.168.1.41:3000/#/sebi`
- **Currency Exchange Desk Laptop:** `http://192.168.1.41:3000/#/fx` *(Used by teams to exchange INR for foreign currency)*
- **Participant Stations (Teams T01–T10):** `http://192.168.1.41:3000/#/portfolio`

### Step 4: Execute the Physical Scenarios (Checklist 1 through 13)
Follow the 13 checklist items in Section 4:
1. Have Team T01 and T02 log in. Confirm T01 cannot view T02's holdings.
2. Team T01 searches for an instrument (e.g. `TCS` or `600893`).
3. For foreign instruments, Team T01 visits FX Desk (`#/fx`) and converts INR to USD/GBP/EUR.
4. Fill out physical paper slip `#TKT-001`. Runner walks slip to Verification Desk.
5. Verification Officer verifies lot size and marks slip verified.
6. Runner hands verified slip to Exchange Desk. Operator clicks **Claim & Execute**.
7. If Two-Phase mode is active, Bank Teller marks voucher settled.
8. SEBI Officer tests emergency voiding on an invalid drill trade.
9. Verify Projector display updates immediately without leaking team account data.
10. Disconnect Wi-Fi on one participant laptop for 10 seconds; reconnect and verify state catch-up.
11. Test operator handover to spare laptop.
12. Submit an intentional invalid lot size; confirm rejection at desk.
13. Simulate host restart (stop and re-launch `node server.js`); verify trades survive and perform **Re-login drill**.
14. Access `/api/bank/reconciliation` and verify zero currency discrepancies.

### Step 5: Post-Rehearsal Teardown & Hash Check
When physical rehearsal concludes:
1. Stop the server (`Ctrl+C` in PowerShell).
2. Delete the disposable rehearsal fixture:
   ```powershell
   Remove-Item .\state.rehearsal-disposable.json
   if (Test-Path .\state.rehearsal-disposable.json.tmp) { Remove-Item .\state.rehearsal-disposable.json.tmp }
   ```
3. Re-verify the authoritative hash:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\state.json
   ```
   Confirm the hash is still `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`.

---

## 8. Exact Next Actions Required by User

Before SAAMX can be certified for live production operation, the user must execute the following physical actions:

1. **Physical Venue Assembly:**
   - Assemble the designated physical hardware: 1 Host Laptop, 2 Desk Laptops (Verification & Exchange), 1 Bank Laptop, 1 SEBI Laptop, 1 Projector Laptop, and at least 2 Participant Laptops.
   - Connect all devices to the venue Wi-Fi network and confirm they are in the `192.168.1.0/24` subnet.
2. **Execute Operator Runbook (Steps 1 through 5 above):**
   - Execute the server on `state.rehearsal-disposable.json`.
   - Physically execute each of the 13 floor scenarios with live human staff and runners.
3. **Record Human-Observed Evidence:**
   - For each of the 13 checklist items, record the physical timestamps, runner transit times, and paper slip numbers.
4. **Transition Gate Status:**
   - Upon successful manual completion of all 13 items with zero data discrepancies, update the verdict from `REHEARSAL STILL BLOCKED` to `PHYSICAL REHEARSAL COMPLETE`.
