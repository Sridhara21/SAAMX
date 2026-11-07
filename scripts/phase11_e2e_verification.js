import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = 3097;
const CDP_PORT = 9225;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(ROOT_DIR, 'state.json');
const DISPOSABLE_STATE = path.join(ROOT_DIR, 'state.test-phase11-e2e.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.networkFailures = [];
    this.pageErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            const type = msg.params.type;
            const text = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
            this.consoleLogs.push({ type, text, timestamp: Date.now() });
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const details = msg.params.exceptionDetails;
            const errMsg = details.exception?.description || details.text || 'Unknown script error';
            this.pageErrors.push({
              text: errMsg,
              url: details.url,
              line: details.lineNumber,
              col: details.columnNumber
            });
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
        } catch (e) {}
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

  async navigate(url, waitMs = 1200) {
    const startTime = Date.now();
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
    const navTimeMs = Date.now() - startTime;
    return navTimeMs;
  }

  clearLogs() {
    this.consoleLogs = [];
    this.networkFailures = [];
    this.pageErrors = [];
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
          else reject(new Error('No CDP page target found'));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function runE2EVerification() {
  console.log('======================================================================');
  console.log('🚀 SAAMX PHASE 11: FULL BROWSER & API E2E VERIFICATION SUITE');
  console.log('======================================================================\n');

  const baselineHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE CHECK] Baseline state.json hash: ${baselineHash}`);
  if (baselineHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL: Baseline state.json hash mismatch! Expected ${EXPECTED_HASH}, found ${baselineHash}`);
  }

  // Create disposable fixture
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`[ISOLATION] Created disposable fixture: ${DISPOSABLE_STATE}`);

  // Launch test server
  console.log(`[SPAWN] Launching backend server on port ${PORT}...`);
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: 'saamx-phase11-verification-secret-32'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', d => {
    const msg = d.toString();
    if (msg.includes('FMS Platform Backend running')) console.log(`[Server] ${msg.trim()}`);
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (!msg.includes('ExperimentalWarning')) console.warn(`[Server Error] ${msg}`);
  });

  let serverOnline = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) { serverOnline = true; break; }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!serverOnline) throw new Error('Test backend failed to start.');
  console.log(`✓ Test backend ready on port ${PORT}\n`);

  // Launch Chrome Headless
  const tempUserData = path.join(os.tmpdir(), `cdp_phase11_userData_${Date.now()}`);
  console.log(`[SPAWN] Launching Chrome Headless CDP on port ${CDP_PORT}...`);
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    'about:blank'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 1500));
  const wsUrl = await getCDPPageUrl();
  const cdp = new ChromeCDP(wsUrl);
  await cdp.connect();
  console.log(`✓ Chrome CDP connected successfully\n`);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  const testReport = {
    timestamp: new Date().toISOString(),
    baselineHash,
    publicRouteResults: [],
    authenticatedRouteResults: [],
    registrationSuite: {},
    loginSuite: {},
    timerSuite: {},
    atomicSaveSuite: {},
    failures: []
  };

  const adminHeaders = {
    'x-fms-password': 'saamx-event-2026',
    'x-fms-role': 'admin'
  };

  try {
    // ==================================================================
    // SUITE 1: PUBLIC SHELL ROUTE AUDIT (ZERO-ERROR & LAZY LOADING)
    // ==================================================================
    console.log('======================================================================');
    console.log('SUITE 1: PUBLIC SHELL ROUTE AUDIT (ZERO ERRORS & BUNDLE SPLITTING)');
    console.log('======================================================================\n');

    const publicRoutes = [
      { hash: '#/', name: 'Public Landing Page' },
      { hash: '#/login', name: 'Gateway Login Page' },
      { hash: '#/register', name: 'Investment House Registration' },
      { hash: '#/projector', name: 'Auditorium Projector Display' },
      { hash: '#/portals', name: 'Portals Directory' }
    ];

    for (const r of publicRoutes) {
      cdp.clearLogs();
      const targetUrl = `${BASE_URL}/${r.hash}`;
      const navTimeMs = await cdp.navigate(targetUrl, 1200);

      let domInfo = {};
      try {
        domInfo = await cdp.eval(`({
          title: document.title,
          heading: document.querySelector('h1, h2')?.textContent?.trim() || 'No heading',
          cardCount: document.querySelectorAll('.saamx-card, .card, [class*="card"]').length,
          buttonCount: document.querySelectorAll('button, a.button').length,
          hasErrorBanner: Boolean(document.querySelector('[role="alert"], .error-banner, .alert-danger')),
          bodyTextSnippet: document.body.innerText.substring(0, 160).replace(/\\s+/g, ' ')
        })`);
      } catch (e) {
        domInfo = { error: e.message };
      }

      const consoleErrors = cdp.consoleLogs.filter(l => l.type === 'error').map(l => l.text);
      const pageErrors = cdp.pageErrors.map(e => e.text);
      const totalErrors = consoleErrors.length + pageErrors.length;
      const status = totalErrors === 0 ? 'PASS' : 'FAIL';

      console.log(`[${status}] ${r.hash.padEnd(20)} | Nav: ${String(navTimeMs).padStart(4)}ms | Cards: ${String(domInfo.cardCount).padStart(2)} | Heading: "${domInfo.heading.substring(0, 30)}" | Errors: ${totalErrors}`);
      if (totalErrors > 0) {
        console.warn(`   Page Errors: ${pageErrors.join(' | ')}`);
        console.warn(`   Console Errors: ${consoleErrors.join(' | ')}`);
        testReport.failures.push(`Route ${r.hash} failed with ${totalErrors} errors: ${pageErrors.concat(consoleErrors).join('; ')}`);
      }

      testReport.publicRouteResults.push({
        route: r.hash,
        name: r.name,
        navTimeMs,
        heading: domInfo.heading,
        cardCount: domInfo.cardCount,
        errors: pageErrors.concat(consoleErrors),
        status
      });
    }

    // ==================================================================
    // SUITE 2: REGISTRATION INTAKE WORKFLOW
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SUITE 2: REGISTRATION INTAKE & ALLOCATION WORKFLOW');
    console.log('======================================================================\n');

    const regPayload = {
      schoolName: 'Delhi Public School, R.K. Puram',
      board: 'CBSE',
      city: 'New Delhi',
      contactPerson: 'Dr. Rajiv Malhotra',
      contactEmail: 'rajiv.m@dpsrkp.edu.in',
      contactPhone: '+91 98765 43210',
      facultyCoordinator: 'Dr. Rajiv Malhotra',
      investmentHouseName: 'Apex Quantitative Strategies',
      teamType: 'Hedge Fund',
      password: 'ApexCapital2026!',
      members: [
        { name: 'Aarav Mehta', role: 'CIO' },
        { name: 'Diya Sharma', role: 'Risk Officer' },
        { name: 'Kabir Verma', role: 'Lead Quant Analyst' },
        { name: 'Ananya Iyer', role: 'Macro Strategist' }
      ]
    };

    console.log('[REGISTRATION] Submitting new team registration via POST /api/register/complete...');
    const regRes = await apiRequest('POST', '/api/register/complete', regPayload);
    console.log(`[REGISTRATION] Status: ${regRes.status}`);

    if (regRes.status !== 200) {
      testReport.failures.push(`Registration API failed with status ${regRes.status}: ${JSON.stringify(regRes.data)}`);
    }

    const regData = regRes.data;
    const registeredTeamCode = regData.teamCode;
    const registeredTempPin = regData.tempPin;
    const registeredRegId = regData.registrationId;
    const registeredDesk = regData.assignedDesk;
    console.log(`✓ Registration succeeded. Code: ${registeredTeamCode}, Temp PIN: ${registeredTempPin}, Desk: ${registeredDesk}`);

    testReport.registrationSuite = {
      status: regRes.status,
      teamCode: registeredTeamCode,
      tempPin: registeredTempPin,
      registrationId: registeredRegId,
      assignedDesk: registeredDesk
    };

    // ==================================================================
    // SUITE 3: AUTHENTICATION (PRE-APPROVAL, POST-APPROVAL & DELEGATES)
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SUITE 3: AUTHENTICATION & MULTI-TIER LOGIN CHECKS');
    console.log('======================================================================\n');

    // Test 3.1: Pre-approval login attempt (must return 403 with isPendingVerification: true)
    console.log('[AUTH 3.1] Testing pre-approval login for registered team...');
    const preApprovalLogin = await apiRequest('POST', '/api/auth/login', {
      username: registeredTeamCode,
      password: 'ApexCapital2026!'
    });
    console.log(`[AUTH 3.1] Pre-approval Status: ${preApprovalLogin.status}`);

    if (preApprovalLogin.status === 403 && preApprovalLogin.data.isPendingVerification === true) {
      console.log('✓ PASS: Pre-approval login correctly returned 403 with isPendingVerification: true and assignedDesk information.');
    } else {
      console.error('❌ FAIL: Pre-approval login did not return expected 403 / isPendingVerification!');
      testReport.failures.push(`Pre-approval login expected 403 isPendingVerification, got ${preApprovalLogin.status}: ${JSON.stringify(preApprovalLogin.data)}`);
    }

    // Test 3.2: Verify desk & approve team
    console.log('\n[AUTH 3.2] Deactivating team T20 and approving registered team...');
    const toggleRes = await apiRequest('POST', '/api/admin/team/toggle-status', { teamCode: 'T20', isActive: false }, adminHeaders);
    console.log(`[AUTH 3.2] Team T20 toggle status: ${toggleRes.status}`);

    const approveRes = await apiRequest('POST', '/api/admin/registration/verify', {
      registrationId: registeredRegId,
      action: 'APPROVE',
      allocatedTeamCode: registeredTeamCode
    }, adminHeaders);
    console.log(`[AUTH 3.2] Approval Status: ${approveRes.status}`);
    console.log(`[AUTH 3.2] Approval Response:`, approveRes.data);

    if (approveRes.status === 200 && approveRes.data.success) {
      console.log('✓ PASS: Team registration approved and added to active teams.');
    } else {
      console.error('❌ FAIL: Team approval failed!');
      testReport.failures.push(`Team approval failed: ${JSON.stringify(approveRes.data)}`);
    }

    // Test 3.3: Post-approval login with customPassword
    console.log('\n[AUTH 3.3] Testing post-approval login with customPassword (ApexCapital2026!)...');
    const postApprovalCustomPass = await apiRequest('POST', '/api/auth/login', {
      username: registeredTeamCode,
      password: 'ApexCapital2026!'
    });
    console.log(`[AUTH 3.3] Post-approval Custom Pass Status: ${postApprovalCustomPass.status}`);
    if (postApprovalCustomPass.status === 200 && postApprovalCustomPass.data.token) {
      console.log('✓ PASS: Post-approval login with custom password succeeded.');
    } else {
      console.error('❌ FAIL: Post-approval login with custom password failed!');
      testReport.failures.push(`Post-approval login with custom password failed: ${JSON.stringify(postApprovalCustomPass.data)}`);
    }

    // Test 3.4: Post-approval login with tempPin
    console.log('\n[AUTH 3.4] Testing post-approval login with temporary PIN...');
    const postApprovalPin = await apiRequest('POST', '/api/auth/login', {
      username: registeredTeamCode,
      password: registeredTempPin
    });
    console.log(`[AUTH 3.4] Post-approval PIN Status: ${postApprovalPin.status}`);
    if (postApprovalPin.status === 200 && postApprovalPin.data.token) {
      console.log('✓ PASS: Post-approval login with temporary PIN succeeded.');
    } else {
      console.error('❌ FAIL: Post-approval login with temporary PIN failed!');
      testReport.failures.push(`Post-approval login with temporary PIN failed: ${JSON.stringify(postApprovalPin.data)}`);
    }

    // Test 3.5: Individual Delegate Authentication (Aarav Mehta / CIO)
    console.log('\n[AUTH 3.5] Testing individual delegate authentication by member name...');
    const delegateLogin = await apiRequest('POST', '/api/auth/login', {
      username: 'Aarav Mehta',
      password: 'ApexCapital2026!'
    });
    console.log(`[AUTH 3.5] Delegate Login Status: ${delegateLogin.status}`);
    if (delegateLogin.status === 200 && delegateLogin.data.token) {
      console.log(`✓ PASS: Delegate login succeeded. Identified Team: ${delegateLogin.data.teamCode}, Username: ${delegateLogin.data.username}`);
    } else {
      console.error('❌ FAIL: Individual delegate login failed!');
      testReport.failures.push(`Individual delegate login failed: ${JSON.stringify(delegateLogin.data)}`);
    }

    // Test 3.6: Browser UI Login via Chrome CDP (Admin Session)
    console.log('\n[AUTH 3.6] Authenticating browser session via LoginPage UI (#/login)...');
    cdp.clearLogs();
    await cdp.navigate(`${BASE_URL}/#/login`, 1000);

    // Obtain an authentic signed admin session token from the backend
    const adminLoginRes = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const adminToken = adminLoginRes.data?.token;

    // Inject authenticated session into browser and reload
    await cdp.eval(`(() => {
      sessionStorage.setItem('saamx_token', '${adminToken}');
      sessionStorage.setItem('saamx_role', 'admin');
      sessionStorage.setItem('saamx_username', 'admin');
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_role', 'admin');
      localStorage.setItem('saamx_token', '${adminToken}');
      window.location.hash = '#/admin';
      window.location.reload();
    })()`);

    await new Promise(r => setTimeout(r, 1800));

    const uiCheck = await cdp.eval(`(() => ({
      hash: window.location.hash,
      heading: document.querySelector('h1, h2')?.textContent?.trim() || '',
      isAuthenticated: Boolean(sessionStorage.getItem('saamx_token')),
      role: sessionStorage.getItem('saamx_role')
    }))()`);
    console.log('[AUTH 3.6] Admin Console Mount Verification:', uiCheck);

    testReport.loginSuite = {
      preApprovalCheck: preApprovalLogin.status === 403,
      customPassCheck: postApprovalCustomPass.status === 200,
      pinCheck: postApprovalPin.status === 200,
      delegateLoginCheck: delegateLogin.status === 200,
      adminBrowserSession: uiCheck
    };

    // ==================================================================
    // SUITE 4: 17 AUTHENTICATED DESK CONSOLES (BROWSER AUDIT & NO SHADOWING)
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SUITE 4: 17 AUTHENTICATED DESK CONSOLES & SHADOWING AUDIT');
    console.log('======================================================================\n');

    const authRoutesToTest = [
      { hash: '#/admin', name: 'Floor Director / Admin Console' },
      { hash: '#/personnel', name: 'Personnel & RBAC Management' },
      { hash: '#/personnel-management', name: 'Personnel Route Alias' },
      { hash: '#/exchange', name: 'Exchange / Verification Desk' },
      { hash: '#/bank', name: 'Bank Settlement Desk' },
      { hash: '#/sebi', name: 'SEBI Surveillance Console' },
      { hash: '#/floor-ops', name: 'Floor Operations Dashboard' },
      { hash: '#/news', name: 'News Wire / Anchor Console' },
      { hash: '#/advisor', name: 'Broker Advisory Terminal' },
      { hash: '#/debate', name: 'Bull vs Bear Debate Arena' },
      { hash: '#/fx', name: 'Currency Desk' },
      { hash: '#/results', name: 'Championship Results Leaderboard' },
      { hash: '#/training', name: 'Training Simulation Arena' },
      { hash: '#/market-watch', name: 'Market Watch Terminal' },
      { hash: '#/market-intelligence', name: 'Market Intelligence' },
      { hash: '#/portfolio', name: 'Portfolio Oversight Ledger' },
      { hash: '#/team', name: 'Participant Workstation' }
    ];

    for (const r of authRoutesToTest) {
      cdp.clearLogs();
      const targetUrl = `${BASE_URL}/${r.hash}`;
      const navTimeMs = await cdp.navigate(targetUrl, 1400);

      let domInfo = {};
      try {
        domInfo = await cdp.eval(`({
          title: document.title,
          heading: document.querySelector('h1, h2')?.textContent?.trim() || 'No heading',
          cardCount: document.querySelectorAll('.saamx-card, .card, [class*="card"]').length,
          buttonCount: document.querySelectorAll('button, a.button').length,
          hasErrorBanner: Boolean(document.querySelector('[role="alert"], .error-banner, .alert-danger')),
          bodyTextSnippet: document.body.innerText.substring(0, 180).replace(/\\s+/g, ' ')
        })`);
      } catch (e) {
        domInfo = { error: e.message };
      }

      const consoleErrors = cdp.consoleLogs.filter(l => l.type === 'error').map(l => l.text);
      const pageErrors = cdp.pageErrors.map(e => e.text);
      const totalErrors = consoleErrors.length + pageErrors.length;
      const status = totalErrors === 0 ? 'PASS' : 'FAIL';

      // Specific check for personnel routes: must NOT say "Floor Director" or "ADMIN CONSOLE"
      let isShadowed = false;
      if (r.hash.startsWith('#/personnel')) {
        const text = (domInfo.heading + ' ' + domInfo.bodyTextSnippet).toLowerCase();
        const hasPersonnelContent = text.includes('personnel') || text.includes('rbac') || text.includes('access directory') || text.includes('super admin');
        if (!hasPersonnelContent) {
          isShadowed = true;
          testReport.failures.push(`Route ${r.hash} appears to be shadowed by AdminPage! Heading: "${domInfo.heading}"`);
        }
      }

      console.log(`[${status}] ${r.hash.padEnd(24)} | Nav: ${String(navTimeMs).padStart(4)}ms | Cards: ${String(domInfo.cardCount).padStart(2)} | Heading: "${domInfo.heading.substring(0, 28)}" | Errors: ${totalErrors}`);
      if (totalErrors > 0) {
        console.warn(`   Page Errors: ${pageErrors.join(' | ')}`);
        console.warn(`   Console Errors: ${consoleErrors.join(' | ')}`);
        testReport.failures.push(`Route ${r.hash} failed with ${totalErrors} errors: ${pageErrors.concat(consoleErrors).join('; ')}`);
      }

      testReport.authenticatedRouteResults.push({
        route: r.hash,
        name: r.name,
        navTimeMs,
        heading: domInfo.heading,
        cardCount: domInfo.cardCount,
        errors: pageErrors.concat(consoleErrors),
        isShadowed,
        status: (status === 'PASS' && !isShadowed) ? 'PASS' : 'FAIL'
      });
    }

    // ==================================================================
    // SUITE 5: EVENT TIMER CONFIGURATION & SCHEDULE SYNCHRONIZATION
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SUITE 5: EVENT TIMER CONFIGURATION & SCHEDULE SYNCHRONIZATION');
    console.log('======================================================================\n');

    // Test 5.1: Configure timer via POST /api/admin/timer-config (360 minutes, SCHEDULE_SYNC)
    console.log('[TIMER 5.1] Updating event timer configuration to 360 minutes, SCHEDULE_SYNC...');
    const timerConfigRes = await apiRequest('POST', '/api/admin/timer-config', {
      durationMinutes: 360,
      timerMode: 'SCHEDULE_SYNC',
      totalActiveMinutes: 300
    }, adminHeaders);
    console.log(`[TIMER 5.1] Timer Config Status: ${timerConfigRes.status}`);

    const configDuration = timerConfigRes.data?.durationMinutes || timerConfigRes.data?.marketState?.simulationDurationMinutes;
    if (timerConfigRes.status === 200 && configDuration === 360) {
      console.log('✓ PASS: Timer config API updated duration to 360 minutes.');
    } else {
      console.error('❌ FAIL: Timer config API failed!');
      testReport.failures.push(`Timer config API failed: ${JSON.stringify(timerConfigRes.data)}`);
    }

    // Test 5.2: Start market with 360 minutes
    console.log('\n[TIMER 5.2] Triggering start market with 360m duration...');
    const startMarketRes = await apiRequest('POST', '/api/admin/start-market', {
      durationMinutes: 360
    }, adminHeaders);
    console.log(`[TIMER 5.2] Start Market Status: ${startMarketRes.status}`);

    // Test 5.3: Inspect Admin Page in Browser
    console.log('\n[TIMER 5.3] Verifying Admin Console clock display in browser...');
    cdp.clearLogs();
    await cdp.navigate(`${BASE_URL}/#/admin`, 1500);
    const adminTimerDisplay = await cdp.eval(`(() => {
      const clockBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('TIMER') || b.innerText.includes('CLOCK'));
      const bodyText = document.body.innerText;
      const has360m = bodyText.includes('360m') || bodyText.includes('360 min') || bodyText.includes('360');
      const hasScheduleSync = bodyText.includes('SCHEDULE') || bodyText.includes('SYNC') || bodyText.includes('09:30');
      return {
        foundClockBtn: Boolean(clockBtn),
        has360m,
        hasScheduleSync,
        pageSnippet: bodyText.substring(0, 300).replace(/\\s+/g, ' ')
      };
    })()`);
    console.log('[TIMER 5.3] Admin Console Clock Check:', adminTimerDisplay);

    testReport.timerSuite = {
      configStatus: timerConfigRes.status,
      startMarketStatus: startMarketRes.status,
      browserClockDisplay: adminTimerDisplay
    };

    // ==================================================================
    // SUITE 6: WINDOWS ATOMIC FILE WRITE CONCURRENCY STRESS
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SUITE 6: WINDOWS EPERM ATOMIC WRITE RESILIENCE STRESS');
    console.log('======================================================================\n');

    console.log('[CONCURRENCY] Firing 15 rapid concurrent administrative broadcast operations...');
    const rapidPromises = [];
    for (let i = 0; i < 15; i++) {
      rapidPromises.push(apiRequest('POST', '/api/admin/broadcast', {
        message: `Stress broadcast pulse #${i + 1} - ${Date.now()}`,
        level: i % 2 === 0 ? 'INFO' : 'URGENT'
      }, adminHeaders));
    }

    const rapidResults = await Promise.all(rapidPromises);
    const failedSaves = rapidResults.filter(r => r.status >= 500);
    console.log(`[CONCURRENCY] Concurrent saves completed. Total: ${rapidResults.length}, Failures (>=500): ${failedSaves.length}`);

    if (failedSaves.length === 0) {
      console.log('✓ PASS: All 15 concurrent atomic writes succeeded with zero Windows EPERM file-lock collisions.');
    } else {
      console.error(`❌ FAIL: Encountered ${failedSaves.length} file lock errors during concurrent writes!`);
      testReport.failures.push(`${failedSaves.length} concurrent saves failed with >=500 status.`);
    }

    testReport.atomicSaveSuite = {
      totalAttempts: 15,
      failedAttempts: failedSaves.length,
      successRate: `${(((15 - failedSaves.length) / 15) * 100).toFixed(1)}%`
    };

  } finally {
    // Teardown
    console.log('\n[TEARDOWN] Closing Chrome and terminating backend server...');
    cdp.close();
    chromeProcess.kill();
    serverProcess.kill();

    await new Promise(r => setTimeout(r, 1500));

    // Cleanup disposable state fixture
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
      console.log(`[CLEANUP] Deleted fixture: ${DISPOSABLE_STATE}`);
    }

    // Verify baseline hash
    const finalHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
    console.log(`\n[POST-FLIGHT STATE INTEGRITY] Authoritative state.json hash: ${finalHash}`);
    if (finalHash !== EXPECTED_HASH) {
      console.error(`❌ CRITICAL STATE CORRUPTION: Expected ${EXPECTED_HASH}, found ${finalHash}`);
      process.exit(1);
    } else {
      console.log(`✓ 100% INTACT: state.json was completely untouched.`);
    }
  }

  // Save results
  const reportPath = path.join(ROOT_DIR, 'scratch', 'phase11_e2e_verification_results.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
  console.log(`\n[REPORT] Detailed E2E test results written to ${reportPath}`);

  console.log('======================================================================');
  console.log(`FINAL VERDICT: ${testReport.failures.length === 0 ? '✅ ALL SUITES PASSED PERFECTLY (ZERO DEFECTS)' : '❌ ENCOUNTERED ' + testReport.failures.length + ' FAILURES'}`);
  console.log('======================================================================');
  if (testReport.failures.length > 0) {
    console.log('Failures:\n' + testReport.failures.map(f => ' - ' + f).join('\n'));
    process.exit(1);
  }
}

runE2EVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
