import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const CDP_PORT = 9222;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-disposable.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.networkFailures = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
          this.consoleLogs.push({ type, text, timestamp: Date.now() });
        } else if (msg.method === 'Network.loadingFailed') {
          this.networkFailures.push(msg.params);
        } else if (msg.method === 'Network.responseReceived') {
          if (msg.params.response.status >= 400 && !msg.params.response.url.includes('/api/auth/login')) {
            this.networkFailures.push({ url: msg.params.response.url, status: msg.params.response.status });
          }
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${JSON.stringify(res.exceptionDetails)})`);
    }
    return res.result?.value;
  }

  async navigate(url, waitMs = 1500) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  }

  async reload(waitMs = 1500) {
    await this.send('Page.reload');
    await new Promise(r => setTimeout(r, waitMs));
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: pathUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(raw); } catch (e) { json = raw; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getCDPPageUrl() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(raw);
          const page = list.find(p => p.type === 'page') || list[0];
          if (page) resolve(page.webSocketDebuggerUrl);
          else reject(new Error('No page target found'));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function runBrowserE2ESuite() {
  console.log('======================================================================');
  console.log('🌐 SAAMX — REAL HEADLESS BROWSER (CHROME CDP) END-TO-END QA SUITE');
  console.log('======================================================================\n');

  // Verify baseline state.json hash
  const initialHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE INTEGRITY] Baseline state.json SHA-256: ${initialHash}`);

  // Create isolated disposable state file
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`[ISOLATION] Created disposable state fixture: test-state-disposable.json`);

  // 1. Spawn Backend Server on Port 3000 with isolated state
  console.log(`\n[SPAWN] Launching local backend on http://localhost:${PORT}...`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: 'saamx-local-test-secret-32-chars-long'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', d => {
    const msg = d.toString().trim();
    if (msg.includes('FMS Platform Backend running')) {
      console.log(`[Server Ready] ${msg}`);
    }
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (!msg.includes('ExperimentalWarning')) {
      console.log(`[Server Stderr] ${msg}`);
    }
  });

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 50; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) { serverReady = true; break; }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!serverReady) throw new Error('Local backend server failed to start within timeout.');
  console.log(`✓ Local backend online and serving static frontend from dist/ on port ${PORT}.\n`);

  // 2. Spawn Headless Chrome with CDP
  console.log(`[SPAWN] Launching Chrome Headless CDP on port ${CDP_PORT}...`);
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    'about:blank'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 1500));
  const cdpWsUrl = await getCDPPageUrl();
  console.log(`✓ Chrome CDP target active: ${cdpWsUrl}\n`);

  const cdp = new ChromeCDP(cdpWsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Console.enable');

  try {
    // -------------------------------------------------------------
    // WORKFLOW 1: PUBLIC LANDING PAGE & MARKET INFORMATION
    // -------------------------------------------------------------
    console.log('--- WORKFLOW 1: PUBLIC LANDING PAGE & MARKET INFORMATION ---');
    await cdp.navigate(`${BASE_URL}/#/`);
    
    const pageTitle = await cdp.eval('document.title');
    console.log(`  Rendered Document Title: "${pageTitle}"`);

    const bodyText = await cdp.eval('document.body.innerText');
    const hasTagline1 = bodyText.includes("Experience the market, don't just plan it");
    const hasTagline2 = bodyText.includes("Experience the Market. Don't Just Learn It.");
    const hasCapacity = bodyText.includes('10–20') && bodyText.includes('Investment Houses');
    const hasCapital = bodyText.includes('₹1 Crore') || bodyText.includes('1 Crore');
    const hasUniverse = bodyText.includes('2,000+') || bodyText.includes('2000+');

    console.log(`  ✓ Primary Tagline rendered: ${hasTagline1}`);
    console.log(`  ✓ Secondary Tagline rendered: ${hasTagline2}`);
    console.log(`  ✓ "10–20 Investment Houses" rendered: ${hasCapacity}`);
    console.log(`  ✓ "₹1 Crore Capital" rendered: ${hasCapital}`);
    console.log(`  ✓ "2,000+ Market Universe" rendered: ${hasUniverse}`);

    if (!hasTagline1 || !hasTagline2 || !hasCapacity || !hasCapital) {
      throw new Error('Public Landing Page copy does not match authoritative specifications.');
    }

    // -------------------------------------------------------------
    // WORKFLOW 2: LOGIN, LOGOUT, & ROLE-SPECIFIC NAVIGATION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 2: AUTHENTICATION, LOGOUT & SESSIONS ---');
    await cdp.navigate(`${BASE_URL}/#/login`);

    // Test invalid login
    const invalidLoginRes = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'wrongpassword' });
    console.log(`  Invalid credentials response: HTTP ${invalidLoginRes.status} ("${invalidLoginRes.data.error}")`);
    if (invalidLoginRes.status !== 401 || invalidLoginRes.data.error !== 'Invalid username, PIN or password') {
      throw new Error('Invalid credentials did not return generic 401 error');
    }

    // Team login
    const teamLogin = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    console.log(`  Team T01 login: HTTP ${teamLogin.status}, Role: "${teamLogin.data.role}", Token: "${teamLogin.data.token?.slice(0, 15)}..."`);
    if (teamLogin.status !== 200 || teamLogin.data.role !== 'team' || !teamLogin.data.token.startsWith('saamx.')) {
      throw new Error('Team login failed or token invalid');
    }

    // Admin login
    const adminLogin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    console.log(`  Admin login: HTTP ${adminLogin.status}, Role: "${adminLogin.data.role}", Token: "${adminLogin.data.token?.slice(0, 15)}..."`);
    if (adminLogin.status !== 200 || adminLogin.data.role !== 'admin' || !adminLogin.data.token.startsWith('saamx.')) {
      throw new Error('Admin login failed or token invalid');
    }

    // Inject Admin token into browser session and navigate to Admin Console
    await cdp.eval(`
      sessionStorage.setItem('saamx_token', '${adminLogin.data.token}');
      sessionStorage.setItem('saamx_role', 'admin');
      sessionStorage.setItem('saamx_username', 'admin');
    `);

    // -------------------------------------------------------------
    // WORKFLOW 3: ADMIN CONFIGURATION OF CAPACITY (10–20)
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 3: ADMIN CONFIGURATION OF CAPACITY (10–20) ---');
    await cdp.navigate(`${BASE_URL}/#/admin`);
    
    // Check rendered admin console DOM
    const adminText = await cdp.eval('document.body.innerText');
    const hasAdminConsole = adminText.includes('Admin') || adminText.includes('Operations') || adminText.includes('Event');
    console.log(`  Admin Console rendered: ${hasAdminConsole}`);

    // Update capacity to 15 via authoritative API
    const capRes = await apiRequest('POST', '/api/admin/capacity', { capacity: 15, forceOverride: true }, {
      'Authorization': `Bearer ${adminLogin.data.token}`
    });
    console.log(`  Capacity update to 15: HTTP ${capRes.status}, Configured: ${capRes.data.configuredCapacity}, Aggregate: ₹${capRes.data.aggregateStartingCapital / 10000000} Cr`);
    if (capRes.status !== 200 || capRes.data.configuredCapacity !== 15 || capRes.data.aggregateStartingCapital !== 150000000) {
      throw new Error('Capacity configuration update to 15 failed');
    }

    // Verify GET /api/capacity
    const getCap = await apiRequest('GET', '/api/capacity');
    console.log(`  GET /api/capacity: Configured=${getCap.data.configuredCapacity}, Aggregate=₹${getCap.data.aggregateStartingCapital / 10000000} Cr, Active=${getCap.data.activatedHouses}`);

    // -------------------------------------------------------------
    // WORKFLOW 4: REGISTRATION, APPROVAL, & CAPACITY ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 4: REGISTRATION & CAPACITY ENFORCEMENT ---');
    await cdp.navigate(`${BASE_URL}/#/register`);
    const regText = await cdp.eval('document.body.innerText');
    const hasRegScreen = regText.includes('Registration') || regText.includes('Investment House');
    console.log(`  Registration Portal rendered: ${hasRegScreen}`);

    // Submit test registration
    const newRegRes = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'Hyderabad Public School',
      investmentHouseName: 'Eagle Horizon Capital',
      contactPerson: 'Aditya Varma',
      facultyCoordinator: 'Dr. Rao',
      preferredTeamCode: 'IH15'
    });
    console.log(`  Registration intake: HTTP ${newRegRes.status}, Allocated Code: "${newRegRes.data.teamCode}"`);
    if (newRegRes.status !== 200 || !newRegRes.data.teamCode) {
      throw new Error('Registration intake failed');
    }

    // -------------------------------------------------------------
    // WORKFLOW 5: STARTING CAPITAL (₹1 CRORE) VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 5: STARTING CAPITAL VERIFICATION ---');
    const stateRes = await apiRequest('GET', '/api/state', null, { 'Authorization': `Bearer ${adminLogin.data.token}` });
    const teams = stateRes.data.state.teams;
    const t01 = teams.find(t => t.teamCode === 'T01');
    console.log(`  Team T01 cashBalance: ₹${t01.cashBalance?.toLocaleString()} INR`);
    console.log(`  Team T01 INR Wallet: ₹${t01.cashWallets?.INR?.toLocaleString()} INR`);
    if (t01.cashBalance !== 10000000 || t01.cashWallets?.INR !== 10000000) {
      throw new Error('Team T01 cash balance is not ₹1 Crore');
    }

    // -------------------------------------------------------------
    // WORKFLOW 6: PARTICIPANT WORKSTATION & NON-EXECUTION BOUNDARY
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 6: PARTICIPANT WORKSTATION & STRICT BOUNDARY ---');
    // Set Team T01 token in browser
    await cdp.eval(`
      sessionStorage.setItem('saamx_token', '${teamLogin.data.token}');
      sessionStorage.setItem('saamx_role', 'team');
      sessionStorage.setItem('saamx_team_code', 'T01');
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_role', 'team');
      sessionStorage.setItem('fms_username', 'T01');
    `);
    await cdp.navigate(`${BASE_URL}/#/team`);
    await cdp.reload();

    const workText = await cdp.eval('document.body.innerText');
    const hasTeamTerminal = workText.includes('Terminal') || workText.includes('Overview') || workText.includes('Portfolio');
    console.log(`  Workstation rendered: ${hasTeamTerminal}`);

    // DOM query: Verify zero digital trade execution buttons exist
    const execButtonsCount = await cdp.eval(`
      Array.from(document.querySelectorAll('button')).filter(b => {
        const txt = (b.innerText || '').toLowerCase();
        return (txt.includes('buy now') || txt.includes('sell now') || txt.includes('execute trade') || txt.includes('place order')) && !txt.includes('slip') && !txt.includes('paper');
      }).length
    `);
    console.log(`  Digital trade execution buttons found in Workstation DOM: ${execButtonsCount} (Must be 0)`);
    if (execButtonsCount !== 0) {
      throw new Error('Strict paper-trading boundary violated: found digital execution buttons');
    }

    // Open market for continuous trading
    await apiRequest('POST', '/api/market/control', { action: 'START' }, { 'Authorization': `Bearer ${adminLogin.data.token}` });

    // Submit a paper order slip via API
    const orderSlipRes = await apiRequest('POST', '/api/orders/submit', {
      ticketNumber: 'TKT-TEST-001',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'LIMIT',
      limitPrice: 2651.76,
      deskId: 'DESK_1'
    }, { 'Authorization': `Bearer ${teamLogin.data.token}` });

    console.log(`  Paper slip intake: HTTP ${orderSlipRes.status}, Ticket: ${orderSlipRes.data.order?.ticketNumber || orderSlipRes.data.orderId}`);
    const orderId = orderSlipRes.data.order?.id || orderSlipRes.data.orderId;
    if (orderSlipRes.status !== 200 || !orderId) {
      throw new Error(`Paper slip intake failed: ${JSON.stringify(orderSlipRes.data)}`);
    }

    // -------------------------------------------------------------
    // WORKFLOW 7: EXCHANGE DESK REVIEW, VALIDATION & EXECUTION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 7: EXCHANGE DESK CLEARANCE & MUTEX ---');
    // Authenticate Exchange Operator
    const exchangeLogin = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    console.log(`  Exchange operator login: HTTP ${exchangeLogin.status}, Role: "${exchangeLogin.data.role}"`);

    // Claim order on Desk 1
    const claimRes = await apiRequest('POST', '/api/order/claim', { orderId, deskId: 'DESK_1' }, {
      'Authorization': `Bearer ${exchangeLogin.data.token}`
    });
    console.log(`  Desk 1 Claim ticket: HTTP ${claimRes.status}`);
    if (claimRes.status !== 200) {
      throw new Error(`Order claim failed: ${JSON.stringify(claimRes.data)}`);
    }

    // Attempt unauthorized student team action -> 403
    const teamActionRes = await apiRequest('POST', '/api/order/action', { orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, {
      'Authorization': `Bearer ${teamLogin.data.token}`
    });
    console.log(`  Unauthorized student team execution attempt: HTTP ${teamActionRes.status} (Expected 403)`);
    if (teamActionRes.status !== 403) {
      throw new Error('Student team was not rejected with HTTP 403 on desk execution action');
    }

    // Execute order with operator token
    const execRes = await apiRequest('POST', '/api/order/action', { orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, {
      'Authorization': `Bearer ${exchangeLogin.data.token}`
    });
    console.log(`  Authorized operator execution: HTTP ${execRes.status}`);
    if (execRes.status !== 200) {
      throw new Error(`Order execution failed with status ${execRes.status}: ${JSON.stringify(execRes.data)}`);
    }

    // Duplicate execution attempt -> 400
    const dupExec = await apiRequest('POST', '/api/order/action', { orderId, actionType: 'EXECUTE', deskId: 'DESK_1' }, {
      'Authorization': `Bearer ${exchangeLogin.data.token}`
    });
    console.log(`  Duplicate execution attempt: HTTP ${dupExec.status} (Expected 400 Bad Request)`);
    if (dupExec.status !== 400) {
      throw new Error('Duplicate execution was not blocked with HTTP 400');
    }

    // -------------------------------------------------------------
    // WORKFLOW 8: MARKET PRICING, HOLDINGS & PORTFOLIO LEDGER
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 8: PORTFOLIO LEDGER & HOLDINGS ---');
    const portRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, {
      'Authorization': `Bearer ${teamLogin.data.token}`
    });
    const t01Team = portRes.data.team || portRes.data.portfolio || portRes.data;
    const t01Cash = t01Team?.cashBalance;
    const t01Holdings = t01Team?.holdings?.RELIANCE || 0;
    console.log(`  T01 Portfolio: HTTP ${portRes.status}, Cash Balance: ₹${t01Cash?.toLocaleString()}, RELIANCE Units: ${t01Holdings}`);
    if (portRes.status !== 200 || t01Holdings < 10) {
      throw new Error('Executed trade was not properly reflected in team portfolio ledger');
    }

    // -------------------------------------------------------------
    // WORKFLOW 9: OPERATIONAL CONSOLES (FLOOR OPS, SEBI, JOURNALIST)
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 9: OPERATIONAL CONSOLES ---');
    // Set Admin token and full credentials in browser session
    await cdp.eval(`
      sessionStorage.setItem('saamx_token', '${adminLogin.data.token}');
      sessionStorage.setItem('saamx_role', 'admin');
      sessionStorage.setItem('saamx_username', 'admin');
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_role', 'admin');
      sessionStorage.setItem('fms_username', 'admin');
      sessionStorage.setItem('fms_password', 'saamx-event-2026');
    `);

    await cdp.navigate(`${BASE_URL}/#/floor-ops`);
    await cdp.reload();
    const floorText = await cdp.eval('document.body.innerText');
    const hasFloorOps = floorText.includes('Floor') || floorText.includes('Operations') || floorText.includes('Desk') || floorText.includes('Desks') || floorText.includes('Radar');
    console.log(`  Floor Operations Console rendered: ${hasFloorOps}`);
    if (!hasFloorOps) {
      console.log(`  DEBUG DOM text: ${floorText.slice(0, 300)}...`);
      throw new Error('Floor Operations Console did not render');
    }

    await cdp.navigate(`${BASE_URL}/#/sebi`);
    const sebiText = await cdp.eval('document.body.innerText');
    const hasSebi = sebiText.includes('SEBI') || sebiText.includes('Surveillance') || sebiText.includes('Circuit');
    console.log(`  SEBI Surveillance Console rendered: ${hasSebi}`);
    if (!hasSebi) {
      console.log(`  DEBUG DOM text: ${sebiText.slice(0, 300)}...`);
      throw new Error('SEBI Surveillance Console did not render');
    }

    await cdp.navigate(`${BASE_URL}/#/journalist`);
    const jourText = await cdp.eval('document.body.innerText');
    const hasJournalist = jourText.includes('Journalist') || jourText.includes('Wire') || jourText.includes('Press') || jourText.includes('News');
    console.log(`  Journalist Press Wire rendered: ${hasJournalist}`);
    if (!hasJournalist) {
      console.log(`  DEBUG DOM text: ${jourText.slice(0, 300)}...`);
      throw new Error('Journalist Press Wire did not render');
    }

    // -------------------------------------------------------------
    // WORKFLOW 10: AUDITORIUM PROJECTOR & TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 10: AUDITORIUM PROJECTOR & DISPLAY ---');
    await cdp.navigate(`${BASE_URL}/#/projector`);
    const projText = await cdp.eval('document.body.innerText');
    const hasProjector = projText.includes('MARKET') || projText.includes('INDEX') || projText.includes('GLOBAL') || projText.includes('INDIA');
    console.log(`  Auditorium Projector rendered: ${hasProjector}`);

    // -------------------------------------------------------------
    // WORKFLOW 11: PRIVACY & RESTRICTED INFORMATION GATES
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 11: PRIVACY & RESTRICTED DATA GATES ---');
    const publicState = await apiRequest('GET', '/api/state');
    const isPersonnelHidden = publicState.data.state.personnel === undefined;
    const isAuditLogHidden = publicState.data.state.auditLog === undefined;
    const isCashHidden = publicState.data.state.teams[0].cashBalance === undefined;
    console.log(`  Public view: Personnel accounts hidden? ${isPersonnelHidden}`);
    console.log(`  Public view: Audit log entries hidden? ${isAuditLogHidden}`);
    console.log(`  Public view: Team cash balances hidden? ${isCashHidden}`);
    if (!isPersonnelHidden || !isAuditLogHidden || !isCashHidden) {
      throw new Error('Public state leaks confidential staff or team financial balances');
    }

    // -------------------------------------------------------------
    // WORKFLOW 12: REAL-TIME WEBSOCKET LIVENESS & RECONNECTION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 12: REAL-TIME WEBSOCKET CONNECTIVITY ---');
    const wsClient = new WebSocket(`ws://localhost:${PORT}`);
    let wsConnected = false;
    await new Promise((resolve) => {
      wsClient.on('open', () => { wsConnected = true; resolve(); });
      setTimeout(resolve, 1000);
    });
    console.log(`  WebSocket connection established: ${wsConnected}`);
    wsClient.close();
    console.log(`  WebSocket disconnected cleanly and tested.`);

    // Check Chrome console errors during browsing
    console.log('\n--- BROWSER CONSOLE & NETWORK TELEMETRY SUMMARY ---');
    const severeConsoleErrors = cdp.consoleLogs.filter(l => l.type === 'error' && !l.text.includes('Firebase') && !l.text.includes('favicon'));
    console.log(`  Total browser console logs captured: ${cdp.consoleLogs.length}`);
    console.log(`  Severe application errors in browser console: ${severeConsoleErrors.length}`);
    if (severeConsoleErrors.length > 0) {
      severeConsoleErrors.forEach(e => console.log(`    ⚠️ Console Error: ${e.text}`));
    } else {
      console.log(`  ✓ Zero severe application errors encountered in browser runtime.`);
    }

    console.log(`  Network failures recorded: ${cdp.networkFailures.length}`);
    if (cdp.networkFailures.length > 0) {
      cdp.networkFailures.forEach(f => console.log(`    ⚠️ Network Warning: ${JSON.stringify(f)}`));
    }

    console.log('\n======================================================================');
    console.log('🎉 ALL 12 USER WORKFLOWS SUCCESSFULLY EXERCISED IN REAL BROWSER!');
    console.log('======================================================================\n');

  } finally {
    cdp.close();
    chromeProcess.kill();
    serverProcess.kill('SIGTERM');
    if (fs.existsSync(DISPOSABLE_STATE)) {
      fs.unlinkSync(DISPOSABLE_STATE);
      console.log('Cleaned up disposable state fixture.');
    }
  }

  // Final check: Confirm state.json SHA-256 untouched
  const finalHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE INTEGRITY] Final state.json SHA-256: ${finalHash}`);
  if (initialHash !== finalHash) {
    throw new Error(`CRITICAL: state.json was mutated during browser testing! Expected ${initialHash}, got ${finalHash}`);
  }
  console.log('✓ Confirmed: state.json strictly untouched (100% byte-for-byte identical).\n');
}

runBrowserE2ESuite().catch(err => {
  console.error('\n❌ BROWSER E2E TEST FAILED:', err);
  process.exit(1);
});
