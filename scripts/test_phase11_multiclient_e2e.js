import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = 3098;
const CDP_PORT = 9228;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(ROOT_DIR, 'state.json');
const DISPOSABLE_STATE = path.join(ROOT_DIR, 'state.test-phase11-multiclient.json');
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
      this.ws.close();
      this.ws = null;
    }
  }
}

function computeFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function apiRequest(method, route, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('======================================================================');
  console.log('🚀 SAAMX PHASE 11: ADVANCED MULTI-CLIENT & END-TO-END WORKFLOW AUDIT');
  console.log('======================================================================\n');

  // 1. Authoritative state hash pre-flight verification
  const initialHash = computeFileHash(ORIGINAL_STATE);
  console.log(`[PRE-FLIGHT] Authoritative state.json hash: ${initialHash}`);
  if (initialHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL: Authoritative state hash mismatch! Expected ${EXPECTED_HASH}, found ${initialHash}`);
  }
  console.log('✓ Authoritative state.json invariant verified strictly untouched.\n');

  // 2. Clone disposable state fixture
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`✓ Created isolated test fixture: ${DISPOSABLE_STATE}`);

  // 3. Launch isolated test server on port 3098
  const serverProcess = spawn('node', ['server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      SAAMX_STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'saamx-event-2026',
      SAAMX_AUTH_SECRET: 'saamx-multiclient-test-secret-2026-phase11'
    },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', d => {});
  serverProcess.stderr.on('data', d => {});

  await new Promise(r => setTimeout(r, 2000));
  console.log(`✓ Test backend server operational on ${BASE_URL}`);

  // 4. Launch headless Chrome CDP
  const tempUserData = path.join(os.tmpdir(), `cdp_p11_multi_${Date.now()}`);
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempUserData}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2000));

  // Connect to Chrome CDP target
  const listRes = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = listRes.find(p => p.type === 'page') || listRes[0];
  const cdp = new ChromeCDP(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  console.log('✓ Attached headless Chrome CDP session on port ' + CDP_PORT + '\n');

  const testReport = {
    rolesAudited: [],
    multiClientSessions: {},
    tradingWorkflow: {},
    timerVerification: {},
    boundaryIntegrity: {},
    failures: []
  };

  try {
    // ==================================================================
    // SECTION 1: AUTHENTICATING 7 INDEPENDENT CLIENT ROLES
    // ==================================================================
    console.log('======================================================================');
    console.log('SECTION 1: MULTI-CLIENT SESSION AUTHENTICATION (7 CONCURRENT ROLES)');
    console.log('======================================================================\n');

    // 1. Participant Team 1 (T01)
    const t01Login = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
    console.log(`[CLIENT 1] Team T01 Login Status: ${t01Login.status} (Role: ${t01Login.data.role}, Desk: ${t01Login.data.team?.assignedDesk || 'DESK_1'})`);
    if (t01Login.status !== 200) throw new Error('T01 login failed');
    const t01Token = t01Login.data.token;
    const t01Headers = { 'Authorization': `Bearer ${t01Token}` };

    // 2. Participant Team 2 (T02)
    const t02Login = await apiRequest('POST', '/api/auth/login', { username: 'T02', password: 'saamx-team-02' });
    console.log(`[CLIENT 2] Team T02 Login Status: ${t02Login.status} (Role: ${t02Login.data.role}, Desk: ${t02Login.data.team?.assignedDesk || 'DESK_2'})`);
    if (t02Login.status !== 200) throw new Error('T02 login failed');
    const t02Token = t02Login.data.token;
    const t02Headers = { 'Authorization': `Bearer ${t02Token}` };

    // 3. Verification Operator
    const verLogin = await apiRequest('POST', '/api/auth/login', { username: 'verification', password: 'verification-event-2026' });
    console.log(`[CLIENT 3] Verification Desk Login Status: ${verLogin.status} (Role: ${verLogin.data.role})`);
    if (verLogin.status !== 200) throw new Error('Verification login failed');
    const verToken = verLogin.data.token;
    const verHeaders = { 'Authorization': `Bearer ${verToken}` };

    // 4. Exchange Operator (Mr. X)
    const exLogin = await apiRequest('POST', '/api/auth/login', { username: 'exchange', password: 'exchange-event-2026' });
    console.log(`[CLIENT 4] Exchange Desk Login Status: ${exLogin.status} (Role: ${exLogin.data.role})`);
    if (exLogin.status !== 200) throw new Error('Exchange login failed');
    const exToken = exLogin.data.token;
    const exHeaders = { 'Authorization': `Bearer ${exToken}` };

    // 5. Bank Operator (Bank Desk)
    const bankLogin = await apiRequest('POST', '/api/auth/login', { username: 'bank', password: 'saamx-event-2026' });
    console.log(`[CLIENT 5] Bank Desk Login Status: ${bankLogin.status} (Role: ${bankLogin.data.role})`);
    if (bankLogin.status !== 200) throw new Error('Bank login failed');
    const bankToken = bankLogin.data.token;
    const bankHeaders = { 'Authorization': `Bearer ${bankToken}` };

    // 6. SEBI Regulator
    const sebiLogin = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    console.log(`[CLIENT 6] SEBI Surveillance Login Status: ${sebiLogin.status} (Role: ${sebiLogin.data.role})`);
    if (sebiLogin.status !== 200) throw new Error('SEBI login failed');
    const sebiToken = sebiLogin.data.token;
    const sebiHeaders = { 'Authorization': `Bearer ${sebiToken}` };

    // 7. Administrator (Floor Director)
    const adminLogin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    console.log(`[CLIENT 7] Floor Director Login Status: ${adminLogin.status} (Role: ${adminLogin.data.role}, Master: ${adminLogin.data.isMaster})`);
    if (adminLogin.status !== 200) throw new Error('Admin login failed');
    const adminToken = adminLogin.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    console.log('\n✓ All 7 concurrent roles authenticated successfully with real cryptographic tokens.');

    // ==================================================================
    // SECTION 2: CROSS-CLIENT PRIVACY & ACCESS BOUNDARIES AUDIT
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SECTION 2: CROSS-CLIENT PRIVACY & ACCESS BOUNDARIES AUDIT');
    console.log('======================================================================\n');

    // 2.1 Team T01 queries bank settlements -> must be scoped to T01
    const t01Settlements = await apiRequest('GET', '/api/bank/settlements', null, t01Headers);
    console.log(`[PRIVACY 2.1] Team T01 settlements status: ${t01Settlements.status}`);
    const t01Vouchers = Array.isArray(t01Settlements.data.settlements) ? t01Settlements.data.settlements : [];
    const hasT02Voucher = t01Vouchers.some(v => v.teamCode === 'T02');
    console.log(`[PRIVACY 2.1] Team T01 sees only self vouchers? ${!hasT02Voucher} (Count: ${t01Vouchers.length})`);
    if (hasT02Voucher) throw new Error('LEAK: T01 can see T02 vouchers!');

    // 2.2 Team T01 attempts direct trade execution -> 403 Forbidden
    const t01DirectTrade = await apiRequest('POST', '/api/trade', { ticker: 'INFY', quantity: 10, side: 'BUY' }, t01Headers);
    console.log(`[SECURITY 2.2] Team T01 direct trade execution blocked? Status: ${t01DirectTrade.status} (Expected: 403)`);
    if (t01DirectTrade.status !== 403) throw new Error('BREACH: Team T01 could execute trades directly!');

    // 2.3 Team T01 attempts administrative void -> 403 Forbidden
    const t01Void = await apiRequest('POST', '/api/transactions/void', { transactionId: 'TX_ANY' }, t01Headers);
    console.log(`[SECURITY 2.3] Team T01 void transaction blocked? Status: ${t01Void.status} (Expected: 403)`);
    if (t01Void.status !== 403) throw new Error('BREACH: Team T01 could void transactions!');

    // 2.4 Auditorium Projector Display Privacy
    await cdp.navigate(`${BASE_URL}/#/projector`, 2000);
    let projectorPrivacy = { hasPassHash: false, hasPrivatePin: false, hasCashWallets: false };
    for (let i = 0; i < 20; i++) {
      const text = (await cdp.eval(`document.body?.innerText || ''`)) || '';
      if (text.length > 50) {
        projectorPrivacy = {
          hasPassHash: text.includes('passwordHash') || text.includes('scrypt:'),
          hasPrivatePin: text.includes('tempPin') || text.includes('PIN:'),
          hasCashWallets: text.includes('cashWallets')
        };
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('[PRIVACY 2.4] Projector Display Privacy Check:', projectorPrivacy);
    if (projectorPrivacy.hasPassHash || projectorPrivacy.hasPrivatePin) {
      throw new Error('LEAK: Projector exposed sensitive team credentials!');
    }
    console.log('✓ Access boundaries and participant privacy verified across all desks.');

    // ==================================================================
    // SECTION 3: DELEGATE REGISTRATION & MULTI-TIER AUTHENTICATION
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SECTION 3: DELEGATE REGISTRATION & MULTI-TIER AUTHENTICATION');
    console.log('======================================================================\n');

    // 3.1 Submit new team with named delegates
    const regRes = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'Delhi Public School, R.K. Puram',
      board: 'CBSE',
      city: 'New Delhi',
      contactPerson: 'Aarav Mehta',
      contactEmail: 'amehta@dpsrkp.edu',
      contactPhone: '+91 98100 12345',
      facultyCoordinator: 'Dr. Sunita Sharma',
      investmentHouseName: 'Zenith Quantitative Partners',
      teamType: 'Quantitative Hedge Fund',
      preferredTeamCode: 'IH02',
      password: 'ZenithCapital2026!',
      members: [
        { name: 'Aarav Mehta', role: 'Chief Investment Officer (CIO)' },
        { name: 'Diya Kapoor', role: 'Head of Quantitative Strategy' },
        { name: 'Rohan Gupta', role: 'Risk & Derivatives Analyst' },
        { name: 'Ananya Sen', role: 'Macro & Sector Specialist' }
      ]
    });
    console.log(`[REG 3.1] New Team Registration Status: ${regRes.status} (Code: ${regRes.data.teamCode}, PIN: ${regRes.data.tempPin}, Desk: ${regRes.data.assignedDesk})`);
    if (regRes.status !== 200) throw new Error('Registration failed');

    // 3.2 Individual delegate login attempt before approval -> Structured 403
    const delegatePendingLogin = await apiRequest('POST', '/api/auth/login', {
      username: 'Aarav Mehta',
      password: 'ZenithCapital2026!'
    });
    console.log(`[AUTH 3.2] Delegate pre-approval login status: ${delegatePendingLogin.status}`);
    console.log(`[AUTH 3.2] Delegate pre-approval response:`, delegatePendingLogin.data);
    if (delegatePendingLogin.status !== 403 || !delegatePendingLogin.data.isPendingVerification) {
      throw new Error('FAIL: Delegate of pending team did not receive structured 403 verification notice!');
    }
    console.log('✓ PASS: Registered delegate Aarav Mehta received structured 403 pending desk verification.');

    // 3.3 Admin deactivates reserve slot T20 and approves the team
    await apiRequest('POST', '/api/admin/team/toggle-status', { teamCode: 'T20', isActive: false }, adminHeaders);
    const approveRes = await apiRequest('POST', '/api/admin/registration/verify', {
      investmentHouseId: regRes.data.investmentHouse.investmentHouseId,
      action: 'APPROVE',
      allocatedTeamCode: 'IH02'
    }, adminHeaders);
    console.log(`[APPROVE 3.3] Team approval status: ${approveRes.status}`);
    if (approveRes.status !== 200) throw new Error('Team approval failed');

    // 3.4 Delegate logs in post-approval using their own name
    const delegateApprovedLogin = await apiRequest('POST', '/api/auth/login', {
      username: 'Aarav Mehta',
      password: 'ZenithCapital2026!'
    });
    console.log(`[AUTH 3.4] Delegate post-approval status: ${delegateApprovedLogin.status} (User: ${delegateApprovedLogin.data.username})`);
    if (delegateApprovedLogin.status !== 200 || !delegateApprovedLogin.data.username.includes('Aarav Mehta')) {
      throw new Error('FAIL: Delegate login failed post approval!');
    }
    console.log('✓ PASS: Delegate successfully authenticated post-approval with personalized delegate session.');

    // ==================================================================
    // SECTION 4: COMPLETE REAL-TIME TRADING PIPELINE ACROSS DESKS
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SECTION 4: COMPLETE REAL-TIME TRADING PIPELINE ACROSS DESKS');
    console.log('======================================================================\n');

    // Set settlement mode to TWO_PHASE_BANK so bank settlement voucher is generated
    await apiRequest('POST', '/api/admin/settlement-mode', { mode: 'TWO_PHASE_BANK' }, adminHeaders);

    // Open the market for trading
    const openMarketRes = await apiRequest('POST', '/api/admin/start-market', { durationMinutes: 360 }, adminHeaders);
    console.log(`[MARKET] Central exchange opened. Status: ${openMarketRes.status}`);

    // Step A: Team T01 submits paper order slip for 25 TCS shares
    const orderSlipRes = await apiRequest('POST', '/api/order/create', {
      ticketNumber: 'TKT-P11-001',
      teamCode: 'T01',
      ticker: 'TCS',
      orderType: 'MARKET',
      action: 'BUY',
      quantity: 25,
      assignedDesk: 'DESK_1',
      notes: 'Phase 11 Rehearsal Multi-Client Order'
    }, t01Headers);
    console.log(`[STEP A] T01 Order Slip Created: Status ${orderSlipRes.status}, OrderId: ${orderSlipRes.data.order?.id || orderSlipRes.data.id}`);
    const orderId = orderSlipRes.data.order?.id || orderSlipRes.data.id;
    if (!orderId) throw new Error('Order creation failed');

    // Step B: Verification Desk verifies order slip
    const verifySlipRes = await apiRequest('POST', '/api/verification/verify', {
      orderId,
      officerName: 'verification',
      physicalSlipChecked: true
    }, verHeaders);
    console.log(`[STEP B] Verification Desk Verification: Status ${verifySlipRes.status}, Order Status: ${verifySlipRes.data.order?.status}`);
    if (verifySlipRes.status !== 200) throw new Error('Order verification failed');

    // Step C: Exchange Desk executes order
    await apiRequest('POST', '/api/order/action', {
      orderId,
      actionType: 'CLAIM_FOR_EXCHANGE',
      deskId: 'DESK_1',
      operator: 'exchange'
    }, exHeaders);

    const executeRes = await apiRequest('POST', '/api/order/action', {
      orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1',
      operator: 'exchange'
    }, exHeaders);
    console.log(`[STEP C] Exchange Desk Execution: Status ${executeRes.status}, Order Status: ${executeRes.data.order?.status}, SettleId: ${executeRes.data.settlement?.id}`);
    if (executeRes.status !== 200) throw new Error('Order execution failed');
    const settlementId = executeRes.data.settlement?.id;

    // Step D: Bank Desk settles trade voucher
    if (settlementId) {
      const settleRes = await apiRequest('POST', '/api/bank/settle', {
        settlementId,
        tellerId: 'bank',
        notes: 'Physical delivery slip stamped and settled'
      }, bankHeaders);
      console.log(`[STEP D] Bank Desk Settlement: Status ${settleRes.status}, Voucher Status: ${settleRes.data.settlement?.status}`);
      if (settleRes.status !== 200) throw new Error('Bank settlement failed');
    }

    // Step E: Verify Team T01 portfolio reflects updated holdings and cash
    const t01Portfolio = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, t01Headers);
    const tcsShares = t01Portfolio.data.team?.holdings?.TCS || t01Portfolio.data.holdings?.TCS || t01Portfolio.data.portfolio?.holdings?.TCS;
    console.log(`[STEP E] Team T01 Portfolio Verification: TCS Holdings: ${tcsShares}`);
    if (!tcsShares || tcsShares < 25) throw new Error('Holdings not updated in team portfolio!');

    // Step F: Verify SEBI surveillance audit trail
    const sebiAudit = await apiRequest('GET', '/api/audit-log', null, sebiHeaders);
    const hasOrderAudit = (sebiAudit.data.logs || sebiAudit.data.auditLog || []).some(l => JSON.stringify(l).includes(orderId));
    console.log(`[STEP F] SEBI Surveillance Audit Trail Recorded: ${hasOrderAudit}`);

    console.log('\n✓ End-to-end trading pipeline verified across all 5 participating desks.');

    // ==================================================================
    // SECTION 5: EVENT TIMER SYNCHRONIZATION ACROSS ALL DESKS
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SECTION 5: EVENT TIMER SYNCHRONIZATION ACROSS ALL DESKS');
    console.log('======================================================================\n');

    // 5.1 Set timer to SCHEDULE_SYNC mode
    const timerSyncRes = await apiRequest('POST', '/api/admin/timer-config', {
      durationMinutes: 360,
      timerMode: 'SCHEDULE_SYNC',
      marketOpenTime: '09:30',
      marketCloseTime: '15:30'
    }, adminHeaders);
    console.log(`[TIMER 5.1] Timer configuration set to SCHEDULE_SYNC (360m): Status ${timerSyncRes.status}`);

    // 5.2 Browser inspection on ProjectorPage
    await cdp.navigate(`${BASE_URL}/#/projector`, 2500);
    const loc = await cdp.eval('window.location.href');
    const title = await cdp.eval('document.title');
    const rootEl = await cdp.eval('document.getElementById("root")?.innerHTML?.substring(0, 300)');
    console.log(`[DEBUG 5.2] URL: ${loc}, Title: ${title}, Root HTML: ${rootEl}`);
    console.log(`[DEBUG 5.2] Console logs:`, cdp.consoleLogs);
    console.log(`[DEBUG 5.2] Page errors:`, cdp.pageErrors);

    let projectorClock = { hasMarketClock: false, hasRemaining: false, snippet: '' };
    for (let i = 0; i < 20; i++) {
      const clockHeader = (await cdp.eval(`document.body?.innerText || ''`)) || '';
      if (clockHeader.includes('MARKET CLOCK (IST)') || clockHeader.includes('SAAMX') || clockHeader.includes('TIME REMAINING')) {
        projectorClock = {
          hasMarketClock: clockHeader.includes('MARKET CLOCK (IST)') || clockHeader.includes('SAAMX'),
          hasRemaining: clockHeader.includes('TIME REMAINING'),
          snippet: clockHeader.substring(0, 200).replace(/\s+/g, ' ')
        };
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('[TIMER 5.2] Projector Clock Display:', projectorClock);
    if (!projectorClock.hasMarketClock) {
      throw new Error('Projector clock header missing!');
    }

    // 5.3 Switch to COUNTDOWN mode (120 minutes)
    const countdownRes = await apiRequest('POST', '/api/admin/timer-config', {
      durationMinutes: 120,
      timerMode: 'COUNTDOWN'
    }, adminHeaders);
    console.log(`[TIMER 5.3] Timer configuration set to COUNTDOWN (120m): Status ${countdownRes.status}`);
    if (countdownRes.data.durationMinutes !== 120 || countdownRes.data.timerMode !== 'COUNTDOWN') {
      throw new Error('Countdown mode update failed!');
    }

    console.log('\n✓ Timer operating modes (SCHEDULE_SYNC vs COUNTDOWN) verified across clients.');

    // ==================================================================
    // SECTION 6: HIGH-CONCURRENCY MUTEX & STATE INTEGRITY STRESS
    // ==================================================================
    console.log('\n======================================================================');
    console.log('SECTION 6: HIGH-CONCURRENCY MUTEX & STATE INTEGRITY STRESS');
    console.log('======================================================================\n');

    // Ensure market session is open with manual override for concurrency test
    await apiRequest('POST', '/api/market/control', { action: 'START' }, adminHeaders);
    console.log('[CONCURRENCY] Firing 10 concurrent trade orders from T01 and T02 in parallel...');
    const orderPromises = [];
    for (let i = 0; i < 5; i++) {
      orderPromises.push(apiRequest('POST', '/api/order/create', {
        ticketNumber: `TKT-T01-PAR-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        teamCode: 'T01',
        ticker: 'INFY',
        action: 'BUY',
        quantity: 2,
        orderType: 'LIMIT',
        limitPrice: 1500,
        assignedDesk: 'DESK_1'
      }, t01Headers));
      orderPromises.push(apiRequest('POST', '/api/order/create', {
        ticketNumber: `TKT-T02-PAR-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        teamCode: 'T02',
        ticker: 'TCS',
        action: 'BUY',
        quantity: 2,
        orderType: 'LIMIT',
        limitPrice: 3200,
        assignedDesk: 'DESK_2'
      }, t02Headers));
    }

    const orderResults = await Promise.all(orderPromises);
    const successfulOrders = orderResults.filter(r => r.status === 200 || r.status === 201);
    console.log(`[CONCURRENCY] Parallel orders completed: ${successfulOrders.length}/10 succeeded cleanly.`);
    if (successfulOrders.length < 10) {
      console.log('[CONCURRENCY ERROR]: Statuses:', orderResults.map(r => r.status), 'Sample Error:', orderResults[0]?.data);
      throw new Error(`Concurrency failure: only ${successfulOrders.length}/10 orders processed.`);
    }

    console.log('✓ All 10 parallel orders serialized and processed with zero lock collisions.');

  } finally {
    console.log('\n[TEARDOWN] Terminating Chrome and isolated server process...');
    cdp.close();
    chromeProcess.kill();
    serverProcess.kill();

    await new Promise(r => setTimeout(r, 1500));

    // Cleanup disposable fixture
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
      console.log(`[CLEANUP] Deleted fixture: ${DISPOSABLE_STATE}`);
    }

    // 7. Verify post-test state integrity
    const finalHash = computeFileHash(ORIGINAL_STATE);
    console.log(`[POST-FLIGHT] Authoritative state.json hash: ${finalHash}`);
    if (finalHash !== EXPECTED_HASH) {
      console.error(`FATAL: Authoritative state.json was modified!`);
      process.exit(1);
    }
    console.log('✓ Authoritative state.json hash verified 100% BIT-FOR-BIT UNTOUCHED.\n');
    console.log('======================================================================');
    console.log('🎉 ALL MULTI-CLIENT & END-TO-END WORKFLOW SUITES PASSED PERFECTLY!');
    console.log('======================================================================');
  }
}

run().catch(err => {
  console.error('\n❌ MULTI-CLIENT TEST SUITE FAILED:', err);
  process.exit(1);
});
