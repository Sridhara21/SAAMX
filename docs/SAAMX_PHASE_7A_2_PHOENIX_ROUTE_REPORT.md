# SAAMX — Phase 7A.2: Project Phoenix Route Integrity Review & Targeted Remediation Report

**Date:** 2026-10-13  
**Status:** CLOSED (CONFIRMED DEFECT REMEDIATED & VERIFIED)  
**Classification:** Category B — Confirmed Functional Defect (Targeted Correction)  
**Target File:** `server.js`  
**State Integrity:** 100% Unaltered (`state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`)  
**Production Build:** Clean (`npm.cmd run build` — 90 modules transformed, 0 errors, 3.31s)

---

## 1. Executive Summary

Phase 7A.2 conducted an evidence-based route integrity investigation into the reported duplicate registrations of `POST /api/admin/phoenix-act` in `server.js`.

The audit confirmed that the earlier registration completely shadowed the later registration due to Express's first-come, first-served router evaluation order. As a direct consequence, the authoritative 15-act Project Phoenix storyline—controlling the Delta AI Labs (`DTAI`) crisis narrative, OpenAI (`OAI`) and Stripe (`STRP`) IPO window staging, SEBI market halts, and NCLT liquidation orders—was completely unreachable from HTTP requests. When the SEBI console or automated coordinators triggered scenario stages, the server executed an obsolete 3-act macro sector shock prototype instead of the intended storyline.

This defect was classified as **Category B: Confirmed Functional Defect**. A targeted, non-destructive remediation was engineered and verified:

1. **Route De-duplication & Alias Isolation:** The prototype 3-act sector shock handler was moved to a dedicated endpoint, `POST /api/admin/scenario/macro-shock`, and preserved via backward-compatible routing (`{ scenario: 'macro_shock' }`), eliminating router shadowing while retaining all prototype functionality.
2. **Authoritative Route Consolidation:** Consolidated `POST /api/admin/phoenix-act` to invoke `executePhoenixAct()` directly with robust integer validation (`actNumber` 1–15).
3. **Anti-Replay Protection:** Added duplicate execution safeguards returning HTTP 409 Conflict if an act has already been executed, preventing accidental double-drops of security prices or duplicate news alerts, with explicit `force: true` override support for administrative drills.
4. **State & Real-Time Synchronization:** Ensured `state.firedPhoenixActs[act]` timestamp tracking and broadcasted `PHOENIX_ACT_TRIGGERED` delta messages to all connected consoles (`SebiPage`, `ProjectorPage`, `FloorOperationsDashboard`).
5. **Authorization Hardening:** Hardened `authMiddleware` to explicitly authorize administrators, Floor Directors, and SEBI Surveillance Officers (`sebi` role, `scenarios.trigger`, `sebi.halt`, `system.config`), while rejecting unauthorized roles (HTTP 403 Forbidden) and unauthenticated callers (HTTP 401 Unauthorized).
6. **Governance Audit Logging:** Enforced server-side audit logging via `logAuditEvent` recording actor identity, act number, and target security.

---

## 2. Detailed Technical Inspection & Defect Analysis

### 2.1 The Two Competing Registrations in `server.js`

Prior to remediation, `server.js` registered `POST /api/admin/phoenix-act` at two separate locations:

| Attribute | Registration 1 (Original Line 6491) | Registration 2 (Original Line 7894) |
| :--- | :--- | :--- |
| **Location** | `server.js:L6491-L6562` | `server.js:L7894-L7899` |
| **Handler Implementation** | Inlined anonymous function | Delegated to `executePhoenixAct(actNumber)` (`L7560-L7892`) |
| **Scope of Narrative** | Generic 3-act macro sector shock prototype | Full 15-act Project Phoenix narrative targeting `DTAI`, `OAI`, `STRP`, `ANTH` |
| **State Side Effects** | Multiplies prices of entire sectors by +5.2%, +4.8%, +6.0%; Acts $\ge 4$ emit blank headlines with 0 targets | Decreases `DTAI` by -22%, stages OpenAI IPO, stages Stripe IPO, halts `DTAI`, bankrupted `DTAI` (₹0) |
| **WebSocket Events** | `ACT_TRIGGERED` | `NEWS_FLASH`, `IPO_PENDING`, `MARKET_HALT`, `BANKRUPTCY` |
| **Router Precedence** | **First** (Registered first in file) | **Shadowed** (Unreachable via HTTP) |

### 2.2 Operational Impact of Shadowing

Because Express matches route paths sequentially, any inbound HTTP request to `POST /api/admin/phoenix-act` was intercepted and consumed by Registration 1. Registration 2 was never executed via HTTP.

This created critical operational failures during simulation rehearsals:
- **Act 1 (DTAI Loss Announcement):** SEBI console expected `DTAI` to drop by $-22\%$. Instead, Registration 1 increased all Technology stocks by $+5.2\%$.
- **Act 3 (OpenAI Hyperscale IPO):** Expected `OAI` to transition to `IPO_PENDING` ($180). Instead, Registration 1 increased Banking stocks by $+6.0\%$.
- **Act 7 (Stripe IPO) & Act 8–13 (Scandal, Halt, Liquidation):** Registration 1 only defined cases for 1, 2, and 3. Any act $\ge 4$ generated an empty news headline with 0 affected securities, leaving `DTAI` trading normally and never launching Stripe, never halting trading, and never enforcing bankruptcy.
- **Projector Takeover Failure:** `ProjectorPage.jsx` specifically listens to WebSocket events `IPO_PENDING`, `MARKET_HALT`, and `BANKRUPTCY`. Because Registration 1 broadcast only `ACT_TRIGGERED`, projector takeover screens were never triggered.
- **SEBI Counter Desynchronization:** `SebiPage.jsx` tracks storyline progression using `state.firedPhoenixActs`. Registration 1 never populated this structure, leaving the SEBI console stage counter permanently at `0 / 13 FIRED`.

---

## 3. Targeted Remediation Applied

### 3.1 Separation of Concerns: Dedicated Macro Shock Endpoint

The 3-act prototype macro shock engine was decoupled and re-registered at:
`POST /api/admin/scenario/macro-shock`

For backward compatibility with older test harnesses or drill scripts, requests to `POST /api/admin/phoenix-act` with payload `{ scenario: 'macro_shock', actNumber }` route cleanly to the macro shock engine.

### 3.2 Consolidation of `POST /api/admin/phoenix-act`

The single authoritative route handler was established at line 7894:

```javascript
app.post('/api/admin/phoenix-act', (req, res) => {
  const { actNumber, actId, act: rawAct, scenario, force, reason } = req.body || {};

  // Backward compatibility: forward scenario: 'macro_shock' to macro shock scenario logic
  if (scenario === 'macro_shock') {
    // ... executes macro shock logic ...
  }

  const targetAct = actNumber !== undefined ? actNumber : (actId !== undefined ? actId : rawAct);
  if (targetAct === undefined || targetAct === null || targetAct === '') {
    return res.status(400).json({ error: 'Missing required field: actNumber' });
  }

  const num = Number(targetAct);
  if (!Number.isInteger(num) || num < 1 || num > 15) {
    return res.status(400).json({
      error: `Invalid actNumber: ${targetAct}. Must be an integer between 1 and 15.`,
      actNumber: targetAct
    });
  }

  // Duplicate execution protection (anti-replay)
  if (state.firedPhoenixActs && state.firedPhoenixActs[num] && !force) {
    return res.status(409).json({
      error: `Phoenix Act ${num} has already been executed at ${new Date(state.firedPhoenixActs[num]).toISOString()}. Pass force: true to re-execute.`,
      actNumber: num,
      alreadyFiredAt: state.firedPhoenixActs[num],
      requiresForce: true
    });
  }

  const result = executePhoenixAct(num);
  if (result.error) {
    return res.status(400).json(result);
  }

  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  const session = verifySessionToken(authHeader);
  logAuditEvent({
    actor: session?.displayName || session?.username || 'Event Director',
    role: session?.role || 'admin',
    action: `PHOENIX_ACT_${num}`,
    target: `DTAI / Project Phoenix Act ${num}`,
    reason: reason || `Triggered Project Phoenix narrative act ${num}${force ? ' (forced re-execution)' : ''}`
  });

  return res.json({
    success: true,
    actNumber: num,
    act: num,
    ...result
  });
});
```

### 3.3 Authorization Hardening in `authMiddleware`

Placed immediately ahead of the generic `/admin` route prefix check in `authMiddleware`:

```javascript
if (req.path === '/admin/phoenix-act' || req.path === '/admin/scenario/macro-shock') {
  if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'scenarios.trigger') || hasPerm(session, 'system.config') || hasPerm(session, 'sebi.halt')) return next();
  return res.status(403).json({ error: 'Forbidden: Requires scenario triggering or administrator privileges.' });
}
```

- **Authorized:** Admins, Super-Admins (`sridhara`), Coordinators with `scenarios.trigger`, SEBI Surveillance Officers (`sebi` role or `sebi.halt`).
- **Forbidden (403):** Student teams (`team`), Exchange operators (`operator_x`), Verification desk, Advisors, Journalists.
- **Unauthorized (401):** Missing or invalid Bearer tokens.

### 3.4 State Synchronization & Anti-Replay Protection

In `executePhoenixAct`:
```javascript
if (!state.firedPhoenixActs) {
  state.firedPhoenixActs = {};
}
state.firedPhoenixActs[act] = Date.now();

saveState(true);
broadcastState('PHOENIX_ACT_TRIGGERED', { actNumber: act, firedPhoenixActs: state.firedPhoenixActs });
return { success: true, act, actNumber: act };
```
- Sets authoritative timestamp in `state.firedPhoenixActs`.
- Emits real-time delta event `PHOENIX_ACT_TRIGGERED` so `SebiPage` counter updates immediately.
- Returns `{ success: true, act, actNumber }` guaranteeing compatibility with all callers.

---

## 4. Verification & Testing Evidence

### 4.1 Dedicated Test Suite: `test-phoenix-route-integrity.js`

Authored a dedicated, zero-mutation test harness running on an isolated test port with an isolated state file:

| Test ID | Test Description | Expected Result | Actual Result |
| :---: | :--- | :---: | :---: |
| **TEST 1** | Unauthenticated request to `/api/admin/phoenix-act` | HTTP 401 Unauthorized | **PASS** (401) |
| **TEST 2** | Unauthorized team account (`T01`) request | HTTP 403 Forbidden | **PASS** (403) |
| **TEST 3** | Input validation (empty payload, non-integer, out-of-range) | HTTP 400 Bad Request | **PASS** (400) |
| **TEST 4** | Authorized execution of Act 1 (DTAI Loss Announcement) | HTTP 200, price ₹170.04 (-22%), news NW_PHX_1 published | **PASS** (200) |
| **TEST 5** | Anti-replay protection on duplicate Act 1 execution | HTTP 409 Conflict, price unmutated | **PASS** (409) |
| **TEST 6** | Forced re-execution with `force: true` | HTTP 200 OK | **PASS** (200) |
| **TEST 7** | Authorized execution of Act 3 (OpenAI IPO) | HTTP 200, `OAI` status `IPO_PENDING` | **PASS** (200) |
| **TEST 8** | Authorized execution of Act 12 (SEBI Trading Halt) | HTTP 200, `DTAI` status `Halted` | **PASS** (200) |
| **TEST 9** | Authorized execution of Act 13 (NCLT Bankruptcy) | HTTP 200, `DTAI` status `Bankrupt`, price ₹0 | **PASS** (200) |
| **TEST 10** | SEBI role authorization for Phoenix acts | HTTP 200 OK for SEBI role | **PASS** (200) |
| **TEST 11** | Dedicated Macro Shock endpoint `/api/admin/scenario/macro-shock` | HTTP 200 for Act 1, HTTP 400 for bad act | **PASS** (200) |
| **TEST 12** | Backward compatibility via `{ scenario: 'macro_shock' }` | HTTP 200 OK | **PASS** (200) |
| **TEST 13** | Governance audit logging | Verified 6 Phoenix audit entries in `state.auditLog` | **PASS** (6 entries) |

```
======================================================================
🎉 ALL 13 PROJECT PHOENIX ROUTE INTEGRITY TESTS PASSED SUCCESSFULLY!
======================================================================
✓ Confirmed state.json SHA-256 untouched: 441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c
```

### 4.2 Full Regression Test Verification

| Test Suite | File | Scope | Result |
| :--- | :--- | :--- | :---: |
| **Auth Security Remediation** | `test-auth-security-remediation.js` | Scrypt verification, secret hardening, timing-safe checks | **PASS (7/7)** |
| **Personnel & RBAC** | `test-personnel-and-rbac.js` | Granular permission matrix, role grants, master safeguards | **PASS (12/12)** |
| **Desk-Level Security** | `test-desk-security.js` | Station isolation, cross-desk 403 enforcement, intake | **PASS (10/10)** |
| **Adversarial Security** | `test-security-adversarial.js` | Rate limiting, brute-force defense, token tampering | **PASS (13/13)** |
| **Consolidated Exchange Desk** | `test-consolidated-exchange-desk.js` | Paper slip verification, validation, execution, ledger | **PASS (11/11)** |
| **Frontend Production Build** | `npm.cmd run build` | Vite production bundling | **PASS (0 errors, 3.31s)** |

### 4.3 Database Integrity

- Initial `state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`
- Final `state.json` SHA-256: `441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c`
- **Result:** Exact byte-for-byte match. Zero state alterations occurred during Phase 7A.2.

---

## 5. Scope Boundary Compliance

| Guideline | Adherence Note |
| :--- | :--- |
| **Zero Scope Creep** | No changes to API 404 handler, Firebase sync, UI components, or securities universe. |
| **Preservation of User State** | `state.json` unmutated and verified via SHA-256 hash check. |
| **Credential Safety** | No cleartext passwords, password hashes, or token secrets printed in reports or test logs. |
| **Backward Compatibility** | Both `actNumber`, `actId`, and `act` fields accepted; macro shock prototype fully preserved at dedicated route and through `{ scenario: 'macro_shock' }`. |

---

## 6. Conclusion & Recommendation

The duplicate route defect on `POST /api/admin/phoenix-act` has been resolved with precision. The full Project Phoenix storyline is now fully accessible to authorized event directors and SEBI surveillance operators with complete anti-replay protection, input validation, and governance logging.

Phase 7A.2 is **CLOSED**. The application is ready to proceed to Phase 7A.3.
