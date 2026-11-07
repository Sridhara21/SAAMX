import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = 3095;
const CDP_PORT = 9225;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(ROOT_DIR, 'state.json');
const DISPOSABLE_STATE = path.join(ROOT_DIR, 'state.test-phase11-baseline.json');
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
            const text = msg.params.args.map(a => a.value !== undefined ? a.value : JSON.stringify(a)).join(' ');
            this.consoleLogs.push({ type, text, timestamp: Date.now() });
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const details = msg.params.exceptionDetails;
            this.pageErrors.push({
              text: details.text || details.exception?.description || 'Unknown script error',
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

  async captureScreenshot() {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    return res.data;
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

async function runBaselineAudit() {
  console.log('======================================================================');
  console.log('🔍 SAAMX PHASE 11: FULL BASELINE AUDIT & DEFECT DISCOVERY');
  console.log('======================================================================\n');

  const baselineHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE CHECK] state.json hash: ${baselineHash}`);
  if (baselineHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL: Baseline state.json hash mismatch! Expected ${EXPECTED_HASH}, found ${baselineHash}`);
  }

  // Create isolated disposable fixture
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`[ISOLATION] Created fixture: ${DISPOSABLE_STATE}`);

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
      SAAMX_AUTH_SECRET: 'saamx-local-test-secret-32-chars-long'
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
  const tempUserData = path.join(os.tmpdir(), `cdp_user_data_${Date.now()}`);
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
  console.log(`✓ Chrome CDP connected\n`);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  const auditReport = {
    timestamp: new Date().toISOString(),
    baselineHash,
    routeResults: [],
    registrationAudit: {},
    timerAudit: {},
    performanceMetrics: {},
    defectsFound: []
  };

  // 1. Route Navigation Audit
  const routesToTest = [
    { hash: '#/', name: 'Public Landing Page', role: 'Anonymous' },
    { hash: '#/login', name: 'Gateway Login Page', role: 'Anonymous' },
    { hash: '#/register', name: 'Investment House Registration', role: 'Participant / School' },
    { hash: '#/portals', name: 'Portals Directory', role: 'Anonymous' },
    { hash: '#/team', name: 'Participant Workstation', role: 'Team (T01)' },
    { hash: '#/market-watch', name: 'Market Watch Terminal', role: 'Observer / Team' },
    { hash: '#/market-intelligence', name: 'Market Intelligence', role: 'Team' },
    { hash: '#/advisor', name: 'Broker Advisory Terminal', role: 'Advisor' },
    { hash: '#/debate', name: 'Bull vs Bear Debate Arena', role: 'Floor' },
    { hash: '#/news', name: 'News Wire / Anchor Console', role: 'Journalist' },
    { hash: '#/exchange', name: 'Exchange / Verification Desk', role: 'Verification / Operator' },
    { hash: '#/bank', name: 'Bank Settlement Desk', role: 'Bank Teller' },
    { hash: '#/fx', name: 'Currency Desk', role: 'FX Operator' },
    { hash: '#/sebi', name: 'SEBI Surveillance Console', role: 'Regulator' },
    { hash: '#/portfolio', name: 'Portfolio Oversight Ledger', role: 'Auditor' },
    { hash: '#/journalist', name: 'Journalist News Console', role: 'Press' },
    { hash: '#/floor-ops', name: 'Floor Operations Dashboard', role: 'Operations' },
    { hash: '#/admin', name: 'Floor Director / Admin Console', role: 'Admin' },
    { hash: '#/personnel', name: 'Personnel & RBAC Management', role: 'Super Admin' },
    { hash: '#/results', name: 'Championship Results Leaderboard', role: 'Judge / Public' },
    { hash: '#/projector', name: 'Auditorium Projector Display', role: 'Projector (Public)' },
    { hash: '#/training', name: 'Training Simulation Arena', role: 'Trainer' }
  ];

  console.log('--- EXECUTING ROUTE NAVIGATION & RENDER AUDIT ---');
  for (const r of routesToTest) {
    cdp.clearLogs();
    const targetUrl = `${BASE_URL}/${r.hash}`;
    const navTimeMs = await cdp.navigate(targetUrl, 1200);

    // Evaluate DOM
    let domInfo = {};
    try {
      domInfo = await cdp.eval(`({
        title: document.title,
        heading: document.querySelector('h1, h2')?.textContent?.trim() || 'No heading',
        cardCount: document.querySelectorAll('.saamx-card, .card').length,
        buttonCount: document.querySelectorAll('button, a.button').length,
        hasErrorBanner: Boolean(document.querySelector('[role="alert"], .error-banner, .alert-danger')),
        errorBannerText: document.querySelector('[role="alert"], .error-banner, .alert-danger')?.textContent?.trim() || null,
        bodyTextSnippet: document.body.innerText.substring(0, 150).replace(/\\s+/g, ' ')
      })`);
    } catch (e) {
      domInfo = { error: e.message };
    }

    const consoleErrors = cdp.consoleLogs.filter(l => l.type === 'error').map(l => l.text);
    const pageScriptErrors = cdp.pageErrors.map(e => e.text);
    const netFailures = cdp.networkFailures.map(n => typeof n === 'string' ? n : `${n.url} (${n.status})`);

    const hasErrors = consoleErrors.length > 0 || pageScriptErrors.length > 0;
    const status = hasErrors ? 'WARN_ERRORS' : 'PASS';

    console.log(`[${status}] ${r.hash} (${r.name}) - Nav: ${navTimeMs}ms | Cards: ${domInfo.cardCount} | Errors: ${consoleErrors.length + pageScriptErrors.length}`);
    if (consoleErrors.length > 0) console.log(`   Console Errors: ${consoleErrors.join('; ')}`);
    if (pageScriptErrors.length > 0) console.log(`   Script Errors: ${pageScriptErrors.join('; ')}`);

    auditReport.routeResults.push({
      route: r.hash,
      name: r.name,
      role: r.role,
      navTimeMs,
      domInfo,
      consoleErrors,
      pageScriptErrors,
      networkFailures: netFailures,
      status
    });
  }

  // 2. Audit Registration & Personal Account Workflow
  console.log('\n--- AUDITING TEAM & PERSONAL REGISTRATION WORKFLOWS ---');
  
  // Test A: Team registration via API POST /api/register/complete
  const testRegPayload = {
    schoolName: 'Delhi Public School R.K. Puram',
    board: 'CBSE',
    city: 'New Delhi',
    contactPerson: 'Aarav Sharma',
    contactEmail: '',
    contactPhone: '',
    facultyCoordinator: 'Dr. Meenakshi Sundaram',
    investmentHouseName: 'Apex Capital Partners',
    teamType: 'Retail',
    preferredTeamCode: 'T99',
    password: 'CustomSecretPassword123!',
    members: [
      { name: 'Aarav Sharma', role: 'Chief Investment Officer' },
      { name: 'Priya Verma', role: 'Head of Quantitative Strategy' },
      { name: 'Rohan Mehta', role: 'Risk Analyst' }
    ]
  };

  const regRes = await apiRequest('POST', '/api/register/complete', testRegPayload);
  console.log(`[REGISTRATION POST] Status: ${regRes.status}, Success: ${regRes.data?.success}, Allocated Code: ${regRes.data?.teamCode}, TempPin: ${regRes.data?.tempPin}`);

  const allocatedTeamCode = regRes.data?.teamCode;
  const tempPin = regRes.data?.tempPin;

  // Test B: Attempt login with custom password BEFORE admin approval
  const preApprovalCustomLogin = await apiRequest('POST', '/api/auth/login', {
    username: allocatedTeamCode,
    password: 'CustomSecretPassword123!'
  });
  console.log(`[PRE-APPROVAL CUSTOM PASS LOGIN] Status: ${preApprovalCustomLogin.status}, Error: ${preApprovalCustomLogin.data?.error}`);

  // Test C: Attempt login with tempPin BEFORE admin approval
  const preApprovalPinLogin = await apiRequest('POST', '/api/auth/login', {
    username: allocatedTeamCode,
    password: tempPin
  });
  console.log(`[PRE-APPROVAL TEMP PIN LOGIN] Status: ${preApprovalPinLogin.status}, Error: ${preApprovalPinLogin.data?.error}`);

  // Test D: Admin verifies registration
  const verifyRes = await apiRequest('POST', '/api/admin/registration/verify', {
    registrationId: regRes.data?.registrationId,
    action: 'APPROVE',
    allocatedTeamCode
  });
  console.log(`[ADMIN APPROVAL] Status: ${verifyRes.status}, Success: ${verifyRes.data?.success}`);

  // Test E: Attempt login with custom password AFTER admin approval
  const postApprovalCustomLogin = await apiRequest('POST', '/api/auth/login', {
    username: allocatedTeamCode,
    password: 'CustomSecretPassword123!'
  });
  console.log(`[POST-APPROVAL CUSTOM PASS LOGIN] Status: ${postApprovalCustomLogin.status}, Success: ${postApprovalCustomLogin.data?.success}, Error: ${postApprovalCustomLogin.data?.error}`);

  // Test F: Attempt login with tempPin AFTER admin approval
  const postApprovalPinLogin = await apiRequest('POST', '/api/auth/login', {
    username: allocatedTeamCode,
    password: tempPin
  });
  console.log(`[POST-APPROVAL TEMP PIN LOGIN] Status: ${postApprovalPinLogin.status}, Success: ${postApprovalPinLogin.data?.success}, Error: ${postApprovalPinLogin.data?.error}`);

  // Test G: Check personal account / delegate login
  const memberLoginAttempt = await apiRequest('POST', '/api/auth/login', {
    username: 'Aarav Sharma',
    password: 'CustomSecretPassword123!'
  });
  console.log(`[MEMBER PERSONAL LOGIN ATTEMPT] Status: ${memberLoginAttempt.status}, Error: ${memberLoginAttempt.data?.error}`);

  auditReport.registrationAudit = {
    allocatedTeamCode,
    tempPin,
    preApprovalCustomLogin: { status: preApprovalCustomLogin.status, error: preApprovalCustomLogin.data?.error },
    preApprovalPinLogin: { status: preApprovalPinLogin.status, error: preApprovalPinLogin.data?.error },
    postApprovalCustomLogin: { status: postApprovalCustomLogin.status, success: postApprovalCustomLogin.data?.success, error: postApprovalCustomLogin.data?.error },
    postApprovalPinLogin: { status: postApprovalPinLogin.status, success: postApprovalPinLogin.data?.success, error: postApprovalPinLogin.data?.error },
    memberPersonalLogin: { status: memberLoginAttempt.status, error: memberLoginAttempt.data?.error }
  };

  // 3. Audit Event Timer
  console.log('\n--- AUDITING EVENT TIMER & CONFIGURATION ---');
  const stateRes = await apiRequest('GET', '/api/state');
  const marketState = stateRes.data?.marketState || stateRes.data?.state?.marketState;
  const currentEvent = (stateRes.data?.events || stateRes.data?.state?.events || [])[0];

  console.log(`[TIMER CONFIG] simulationDurationMinutes in state: ${marketState?.simulationDurationMinutes}`);
  console.log(`[TIMER CONFIG] Event Market Open: ${currentEvent?.marketOpenTime}, Market Close: ${currentEvent?.marketCloseTime}`);
  console.log(`[TIMER CONFIG] Event Schedule: ${currentEvent?.schedule ? currentEvent.schedule.length : 0} phases`);

  auditReport.timerAudit = {
    simulationDurationMinutes: marketState?.simulationDurationMinutes,
    marketOpenTime: currentEvent?.marketOpenTime,
    marketCloseTime: currentEvent?.marketCloseTime,
    discrepancyNote: 'Timer is fixed at 60 mins countdown despite event scheduled from 09:30 to 15:30 (360 mins / 300 active mins).'
  };

  // 4. Performance Metrics
  console.log('\n--- AUDITING PERFORMANCE & RESOURCE USAGE ---');
  try {
    const perfMetrics = await cdp.send('Performance.getMetrics');
    auditReport.performanceMetrics = perfMetrics.metrics.reduce((acc, m) => {
      acc[m.name] = m.value;
      return acc;
    }, {});
    console.log(`[PERF] JS Heap Used: ${(auditReport.performanceMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[PERF] Layout Count: ${auditReport.performanceMetrics.LayoutCount}`);
    console.log(`[PERF] Recalc Style Count: ${auditReport.performanceMetrics.RecalcStyleCount}`);
  } catch (e) {
    console.warn('[PERF] Performance metrics retrieval error:', e.message);
  }

  // Check bundle sizes from dist
  const distAssets = path.join(ROOT_DIR, 'dist', 'assets');
  if (fs.existsSync(distAssets)) {
    const files = fs.readdirSync(distAssets).map(f => {
      const stat = fs.statSync(path.join(distAssets, f));
      return { file: f, sizeKB: (stat.size / 1024).toFixed(2) };
    });
    auditReport.bundleSizes = files;
    console.log(`[BUNDLE] Assets in dist:`, files);
  }

  // Cleanup
  cdp.close();
  chromeProcess.kill();
  serverProcess.kill();
  if (fs.existsSync(tempUserData)) {
    try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) {}
  }
  if (fs.existsSync(DISPOSABLE_STATE)) {
    try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
  }

  // Verify postflight hash of authoritative state.json
  const postflightHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`\n[POSTFLIGHT HASH] state.json hash: ${postflightHash}`);
  if (postflightHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL: Authoritative state.json was modified during audit!`);
  }
  console.log(`✓ Authoritative state.json remains 100% UNTOUCHED.\n`);

  // Write results
  const scratchDir = path.join(ROOT_DIR, 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const resultsPath = path.join(scratchDir, 'phase11_baseline_audit_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(auditReport, null, 2));
  console.log(`✓ Baseline audit report saved to ${resultsPath}`);
}

runBaselineAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
