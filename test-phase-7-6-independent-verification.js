import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3094;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase7-6-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-phase-7-6-independent-verification-results.json');

const testResults = [];

function recordResult({ id, category, title, endpoint, role, testMethod, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, category, title, endpoint, role, testMethod, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Endpoint:    ${endpoint || 'N/A'}`);
  console.log(`  Role/Auth:   ${role || 'N/A'}`);
  console.log(`  Method:      ${testMethod || 'N/A'}`);
  console.log(`  Scenario:    ${scenario}`);
  console.log(`  Expected:    ${expected}`);
  console.log(`  Actual:      ${actual}`);
  console.log(`  Evidence:    ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
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
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function runIndependentVerificationSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE 7.6 — INDEPENDENT SECURITY VERIFICATION & RELEASE GATE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: VERIFYING AUTHORITATIVE STATE INTEGRITY ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH! STOPPING IMMEDIATELY.');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: DISPOSABLE FIXTURE PREPARATION
  console.log('--- STEP 2: PREPARING ISOLATED DISPOSABLE TEST FIXTURE ---');
  try {
    fs.chmodSync(ORIGINAL_STATE, 0o444);
    console.log('✓ Marked authoritative state.json as READ-ONLY (0o444).');
  } catch (e) {
    console.warn('Warning: Could not set chmod 0o444 on state.json:', e.message);
  }

  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  fs.chmodSync(DISPOSABLE_STATE, 0o666);
  console.log(`✓ Created disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}`);

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.resultsLifecycle = 'PRE_EVENT';

  // Seed sample orders for multiple teams
  fixture.orders = [
    {
      id: 'ORD_T01_101',
      ticketNumber: 'TKT-101',
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      status: 'VERIFYING',
      deskId: 'DESK_1',
      submittedAt: Date.now()
    },
    {
      id: 'ORD_T01_102',
      ticketNumber: 'TKT-102',
      teamCode: 'T01',
      ticker: 'TCS',
      action: 'SELL',
      quantity: 5,
      orderType: 'LIMIT',
      limitPrice: 3800,
      status: 'EXECUTED',
      executionPrice: 3810,
      submittedAt: Date.now()
    },
    {
      id: 'ORD_T02_101',
      ticketNumber: 'TKT-103',
      teamCode: 'T02',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 25,
      orderType: 'MARKET',
      status: 'AWAITING_VERIFICATION',
      submittedAt: Date.now()
    },
    {
      id: 'ORD_T03_101',
      ticketNumber: 'TKT-104',
      teamCode: 'T03',
      ticker: 'HDFCBANK',
      action: 'BUY',
      quantity: 15,
      orderType: 'MARKET',
      status: 'EXECUTED',
      submittedAt: Date.now()
    }
  ];

  // Seed FX transactions
  fixture.fxTransactions = [
    {
      id: 'FX_TX_T01_101',
      ticketNumber: 'FX-101',
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000,
      toAmount: 1128.67,
      status: 'SETTLED',
      timestamp: Date.now()
    },
    {
      id: 'FX_TX_T02_101',
      ticketNumber: 'FX-102',
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 200000,
      toAmount: 1923.99,
      status: 'SETTLED',
      timestamp: Date.now()
    }
  ];

  // Seed FX queue
  fixture.fxQueue = [
    {
      id: 'FX_Q_T01_101',
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'GBP',
      fromAmount: 50000,
      status: 'PENDING',
      timestamp: Date.now()
    },
    {
      id: 'FX_Q_T02_101',
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 150000,
      status: 'PENDING',
      timestamp: Date.now()
    }
  ];

  // Seed initial scorecards
  fixture.judgeScorecards = [
    {
      id: 'CARD_SEED_T01_J1',
      judgeId: 'judge',
      judgeName: 'Official Judge',
      teamCode: 'T01',
      responseToEvents: 4,
      decisionTiming: 4,
      adaptability: 3,
      riskRecognition: 4,
      forwardPositioning: 3,
      resilience: 4,
      balance: 3,
      adaptCapacity: 4,
      isLocked: false,
      notes: 'Initial deliberation draft'
    }
  ];

  // Seed debate
  fixture.bullBearDebate = {
    activeRound: 1,
    currentTopic: 'Initial Baseline Topic',
    timerSeconds: 300,
    status: 'ACTIVE',
    history: []
  };

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // STEP 3: SPAWN ISOLATED TEST SERVER ON PORT 3094
  console.log(`\n--- STEP 3: SPAWNING ISOLATED SERVER ON PORT ${PORT} ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      STATE_PATH: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      DISABLE_FIREBASE_SYNC: 'true',
      VITE_DISABLE_FIREBASE: 'true'
    },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('DEP0040')) {
      process.stderr.write(`[SERVER-ERR] ${msg}`);
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!serverStarted) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // ======================================================================
    // SECTION 1: REAL CRYPTOGRAPHIC SESSION AUTHENTICATION & LOGIN WORKFLOWS
    // ======================================================================
    console.log('======================================================================');
    console.log('📌 AUDIT SECTION 1: PRODUCTION AUTHENTICATION & CRYPTOGRAPHIC SESSIONS');
    console.log('======================================================================');

    // 1.1 Login as Team T01
    const loginT01 = await apiRequest('POST', '/api/auth/login', {
      username: 'T01',
      password: 'saamx-team-01'
    });
    const tokenT01 = loginT01.data?.token;
    recordResult({
      id: 'AUTH-REAL-01',
      category: 'Production Auth',
      title: 'Real Team Login & HMAC Token Generation (T01)',
      endpoint: 'POST /api/auth/login',
      role: 'team (T01)',
      testMethod: 'POST credentials',
      scenario: 'Team T01 authenticates via POST /api/auth/login with valid password',
      expected: 'HTTP 200 with valid saamx... HMAC token and role=team, teamCode=T01',
      actual: `HTTP ${loginT01.status}, tokenPrefix=${tokenT01 ? tokenT01.split('.')[0] : 'null'}`,
      evidence: { success: loginT01.data?.success, role: loginT01.data?.role, teamCode: loginT01.data?.teamCode, tokenLength: tokenT01?.length },
      status: loginT01.status === 200 && loginT01.data?.role === 'team' && loginT01.data?.teamCode === 'T01' && tokenT01 && tokenT01.startsWith('saamx.') ? 'PASSED' : 'FAILED'
    });

    // 1.2 Login as Team T02
    const loginT02 = await apiRequest('POST', '/api/auth/login', {
      username: 'T02',
      password: 'saamx-team-02'
    });
    const tokenT02 = loginT02.data?.token;
    recordResult({
      id: 'AUTH-REAL-02',
      category: 'Production Auth',
      title: 'Real Team Login & HMAC Token Generation (T02)',
      endpoint: 'POST /api/auth/login',
      role: 'team (T02)',
      testMethod: 'POST credentials',
      scenario: 'Team T02 authenticates via POST /api/auth/login',
      expected: 'HTTP 200 with role=team, teamCode=T02',
      actual: `HTTP ${loginT02.status}, role=${loginT02.data?.role}, teamCode=${loginT02.data?.teamCode}`,
      evidence: { success: loginT02.data?.success, role: loginT02.data?.role, teamCode: loginT02.data?.teamCode },
      status: loginT02.status === 200 && loginT02.data?.teamCode === 'T02' && tokenT02 ? 'PASSED' : 'FAILED'
    });

    // 1.3 Login as Staff: Judge
    const loginJudge = await apiRequest('POST', '/api/auth/login', {
      username: 'judge',
      password: 'judge-event-2026'
    });
    const tokenJudge = loginJudge.data?.token;
    recordResult({
      id: 'AUTH-REAL-03',
      category: 'Production Auth',
      title: 'Real Judge Authentication & Granular Permissions',
      endpoint: 'POST /api/auth/login',
      role: 'judge',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Official Judge logs in with password',
      expected: 'HTTP 200 with role=judge and judging.score permission',
      actual: `HTTP ${loginJudge.status}, role=${loginJudge.data?.role}, hasJudgingScore=${loginJudge.data?.permissions?.includes('judging.score')}`,
      evidence: { role: loginJudge.data?.role, permissions: loginJudge.data?.permissions },
      status: loginJudge.status === 200 && loginJudge.data?.role === 'judge' && loginJudge.data?.permissions?.includes('judging.score') ? 'PASSED' : 'FAILED'
    });

    // 1.4 Login as Staff: Coordinator
    const loginCoord = await apiRequest('POST', '/api/auth/login', {
      username: 'coordinator',
      password: 'saamx-event-2026'
    });
    const tokenCoord = loginCoord.data?.token;
    recordResult({
      id: 'AUTH-REAL-04',
      category: 'Production Auth',
      title: 'Real Coordinator Authentication & Market Control Permission',
      endpoint: 'POST /api/auth/login',
      role: 'coordinator',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Floor Coordinator logs in with password',
      expected: 'HTTP 200 with role=coordinator and market.control permission',
      actual: `HTTP ${loginCoord.status}, role=${loginCoord.data?.role}, hasMarketControl=${loginCoord.data?.permissions?.includes('market.control')}`,
      evidence: { role: loginCoord.data?.role, permissions: loginCoord.data?.permissions },
      status: loginCoord.status === 200 && loginCoord.data?.permissions?.includes('market.control') ? 'PASSED' : 'FAILED'
    });

    // 1.5 Login as Staff: Administrator
    const loginAdmin = await apiRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'saamx-event-2026'
    });
    const tokenAdmin = loginAdmin.data?.token;
    recordResult({
      id: 'AUTH-REAL-05',
      category: 'Production Auth',
      title: 'Real Administrator Authentication & Full Staff Rights',
      endpoint: 'POST /api/auth/login',
      role: 'admin',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Administrator logs in with password',
      expected: 'HTTP 200 with role=admin and audit.view/results.approve permissions',
      actual: `HTTP ${loginAdmin.status}, role=${loginAdmin.data?.role}`,
      evidence: { role: loginAdmin.data?.role, hasAuditView: loginAdmin.data?.permissions?.includes('audit.view') },
      status: loginAdmin.status === 200 && loginAdmin.data?.role === 'admin' ? 'PASSED' : 'FAILED'
    });

    // 1.6 Login as Staff: SEBI Auditor
    const loginSebi = await apiRequest('POST', '/api/auth/login', {
      username: 'sebi',
      password: 'sebi-event-2026'
    });
    const tokenSebi = loginSebi.data?.token;
    recordResult({
      id: 'AUTH-REAL-06',
      category: 'Production Auth',
      title: 'Real SEBI Auditor Authentication & Surveillance Permissions',
      endpoint: 'POST /api/auth/login',
      role: 'sebi',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'SEBI officer logs in with password',
      expected: 'HTTP 200 with role=sebi and audit.view/sebi.surveil permissions',
      actual: `HTTP ${loginSebi.status}, role=${loginSebi.data?.role}`,
      evidence: { role: loginSebi.data?.role, permissions: loginSebi.data?.permissions },
      status: loginSebi.status === 200 && loginSebi.data?.permissions?.includes('audit.view') ? 'PASSED' : 'FAILED'
    });

    // 1.7 Login as Staff: Exchange Desk Operator
    const loginExchange = await apiRequest('POST', '/api/auth/login', {
      username: 'exchange',
      password: 'exchange-event-2026'
    });
    const tokenExchange = loginExchange.data?.token;
    recordResult({
      id: 'AUTH-REAL-07',
      category: 'Production Auth',
      title: 'Real Exchange Operator Authentication & Desk Execution Permissions',
      endpoint: 'POST /api/auth/login',
      role: 'exchange',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Exchange desk operator logs in with password',
      expected: 'HTTP 200 with exchange.execute and orders.view_queue permissions',
      actual: `HTTP ${loginExchange.status}, role=${loginExchange.data?.role}`,
      evidence: { role: loginExchange.data?.role, permissions: loginExchange.data?.permissions },
      status: loginExchange.status === 200 && loginExchange.data?.permissions?.includes('exchange.execute') ? 'PASSED' : 'FAILED'
    });

    // 1.8 Login as Staff: Journalist
    const loginJournalist = await apiRequest('POST', '/api/auth/login', {
      username: 'journalist',
      password: 'journalist-event-2026'
    });
    const tokenJournalist = loginJournalist.data?.token;
    recordResult({
      id: 'AUTH-REAL-08',
      category: 'Production Auth',
      title: 'Real Journalist Authentication',
      endpoint: 'POST /api/auth/login',
      role: 'journalist',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Press journalist logs in with password',
      expected: 'HTTP 200 with role=journalist and news.publish permission',
      actual: `HTTP ${loginJournalist.status}, role=${loginJournalist.data?.role}`,
      evidence: { role: loginJournalist.data?.role },
      status: loginJournalist.status === 200 && loginJournalist.data?.role === 'journalist' ? 'PASSED' : 'FAILED'
    });

    // 1.9 Login as Staff: Advisor
    const loginAdvisor = await apiRequest('POST', '/api/auth/login', {
      username: 'advisor',
      password: 'advisor-event-2026'
    });
    const tokenAdvisor = loginAdvisor.data?.token;
    recordResult({
      id: 'AUTH-REAL-09',
      category: 'Production Auth',
      title: 'Real Advisor Authentication',
      endpoint: 'POST /api/auth/login',
      role: 'advisor',
      testMethod: 'POST scrypt verified credentials',
      scenario: 'Floor advisor logs in with password',
      expected: 'HTTP 200 with role=advisor and advisor.signal permission',
      actual: `HTTP ${loginAdvisor.status}, role=${loginAdvisor.data?.role}`,
      evidence: { role: loginAdvisor.data?.role },
      status: loginAdvisor.status === 200 && loginAdvisor.data?.role === 'advisor' ? 'PASSED' : 'FAILED'
    });

    // 1.10 Invalid password rejection
    const loginBadPw = await apiRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'INCORRECT_PASSWORD_ATTEMPT'
    });
    recordResult({
      id: 'AUTH-REAL-10',
      category: 'Production Auth',
      title: 'Invalid Credentials Rejection',
      endpoint: 'POST /api/auth/login',
      role: 'anonymous/bad credentials',
      testMethod: 'POST bad credentials',
      scenario: 'Caller submits incorrect password for admin account',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${loginBadPw.status}`,
      evidence: loginBadPw.data,
      status: loginBadPw.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 1.11 Cryptographic Token Tampering Defense (Signature Mutation)
    const tamperedSigToken = tokenT01.slice(0, -4) + 'abcd';
    const authTamperedSig = await apiRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${tamperedSigToken}`
    });
    recordResult({
      id: 'AUTH-REAL-11',
      category: 'Cryptographic Integrity',
      title: 'HMAC Signature Tampering Rejection',
      endpoint: 'GET /api/auth/me',
      role: 'tampered token',
      testMethod: 'GET with forged signature',
      scenario: 'Attacker mutates HMAC signature bytes of a valid session token',
      expected: 'HTTP 401 Unauthorized (timingSafeEqual rejection)',
      actual: `HTTP ${authTamperedSig.status}`,
      evidence: authTamperedSig.data,
      status: authTamperedSig.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 1.12 Token Privilege Escalation Payload Forgery
    // Replace role 'team' with 'admin' in token string
    const tokenParts = tokenT01.split('.');
    tokenParts[2] = 'admin'; // forge role part
    const forgedRoleToken = tokenParts.join('.');
    const authForgedRole = await apiRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${forgedRoleToken}`
    });
    recordResult({
      id: 'AUTH-REAL-12',
      category: 'Cryptographic Integrity',
      title: 'Token Payload Role Tampering Rejection',
      endpoint: 'GET /api/auth/me',
      role: 'forged admin token',
      testMethod: 'GET with forged payload',
      scenario: 'Attacker modifies token payload segment from team to admin',
      expected: 'HTTP 401 Unauthorized (HMAC mismatch)',
      actual: `HTTP ${authForgedRole.status}`,
      evidence: authForgedRole.data,
      status: authForgedRole.status === 401 ? 'PASSED' : 'FAILED'
    });

    // Helper for Bearer auth
    const bearerHeader = (t) => ({ 'Authorization': `Bearer ${t}` });

    // ======================================================================
    // SECTION 2: VERIFICATION OF FINDING 7.4-01 (REST ORDER-SLIP PRIVACY)
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 2: FINDING 7.4-01 — REST ORDER-SLIP PRIVACY WITH REAL TOKENS');
    console.log('======================================================================');

    // 2.1 Anonymous GET /api/orders
    const vOrdAnon = await apiRequest('GET', '/api/orders');
    recordResult({
      id: 'VER-7.5-01-01',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Anonymous /api/orders Rejection',
      endpoint: 'GET /api/orders',
      role: 'anonymous',
      testMethod: 'GET without token',
      scenario: 'Unauthenticated caller requests GET /api/orders',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vOrdAnon.status}`,
      evidence: vOrdAnon.data,
      status: vOrdAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 2.2 Team T01 receives only T01 orders
    const vOrdT01 = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenT01));
    const isOnlyT01 = Array.isArray(vOrdT01.data) && vOrdT01.data.length === 2 && vOrdT01.data.every(o => o.teamCode === 'T01');
    recordResult({
      id: 'VER-7.5-01-02',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Team T01 Private Order Slip Isolation',
      endpoint: 'GET /api/orders',
      role: 'team (T01)',
      testMethod: 'GET with real T01 token',
      scenario: 'Team T01 requests order history with valid cryptographic token',
      expected: 'HTTP 200 with strictly T01 orders (2 slips, zero T02/T03 slips)',
      actual: `HTTP ${vOrdT01.status}, count=${vOrdT01.data?.length}`,
      evidence: vOrdT01.data?.map(o => ({ id: o.id, teamCode: o.teamCode })),
      status: vOrdT01.status === 200 && isOnlyT01 ? 'PASSED' : 'FAILED'
    });

    // 2.3 Team T01 cross-team query spoofing attempt
    const vOrdT01Spoof = await apiRequest('GET', '/api/orders?teamCode=T02', null, bearerHeader(tokenT01));
    const isSpoofBlocked = Array.isArray(vOrdT01Spoof.data) && vOrdT01Spoof.data.length === 2 && vOrdT01Spoof.data.every(o => o.teamCode === 'T01');
    recordResult({
      id: 'VER-7.5-01-03',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Team T01 Query Parameter Tampering Prevention',
      endpoint: 'GET /api/orders?teamCode=T02',
      role: 'team (T01)',
      testMethod: 'GET with spoofed query param',
      scenario: 'Team T01 passes ?teamCode=T02 to view rival team orders',
      expected: 'HTTP 200 with strictly T01 orders (session identity strictly enforced)',
      actual: `HTTP ${vOrdT01Spoof.status}, count=${vOrdT01Spoof.data?.length}`,
      evidence: vOrdT01Spoof.data?.map(o => ({ id: o.id, teamCode: o.teamCode })),
      status: vOrdT01Spoof.status === 200 && isSpoofBlocked ? 'PASSED' : 'FAILED'
    });

    // 2.4 Team T02 receives only T02 orders
    const vOrdT02 = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenT02));
    const isOnlyT02 = Array.isArray(vOrdT02.data) && vOrdT02.data.length === 1 && vOrdT02.data[0].teamCode === 'T02';
    recordResult({
      id: 'VER-7.5-01-04',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Team T02 Private Order Slip Isolation',
      endpoint: 'GET /api/orders',
      role: 'team (T02)',
      testMethod: 'GET with real T02 token',
      scenario: 'Team T02 requests order slips',
      expected: 'HTTP 200 with strictly T02 orders (1 slip)',
      actual: `HTTP ${vOrdT02.status}, count=${vOrdT02.data?.length}`,
      evidence: vOrdT02.data?.map(o => ({ id: o.id, teamCode: o.teamCode })),
      status: vOrdT02.status === 200 && isOnlyT02 ? 'PASSED' : 'FAILED'
    });

    // 2.5 Unprivileged roles (journalist, judge, advisor) deny-by-default
    const vOrdJournalist = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenJournalist));
    const vOrdJudge = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenJudge));
    const vOrdAdvisor = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenAdvisor));
    const areUnprivilegedBlocked = vOrdJournalist.status === 403 && vOrdJudge.status === 403 && vOrdAdvisor.status === 403;
    recordResult({
      id: 'VER-7.5-01-05',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Unprivileged Staff Roles Deny-By-Default for Orders',
      endpoint: 'GET /api/orders',
      role: 'journalist, judge, advisor',
      testMethod: 'GET with staff tokens',
      scenario: 'Staff members lacking desk permissions attempt to inspect order queue',
      expected: 'HTTP 403 Forbidden for all unprivileged staff',
      actual: `Journalist=${vOrdJournalist.status}, Judge=${vOrdJudge.status}, Advisor=${vOrdAdvisor.status}`,
      evidence: { journalist: vOrdJournalist.data, judge: vOrdJudge.data, advisor: vOrdAdvisor.data },
      status: areUnprivilegedBlocked ? 'PASSED' : 'FAILED'
    });

    // 2.6 Authorized desk operator global orders retrieval
    const vOrdExchange = await apiRequest('GET', '/api/orders', null, bearerHeader(tokenExchange));
    const isGlobalOrdersAccess = Array.isArray(vOrdExchange.data) && vOrdExchange.data.length === 4;
    recordResult({
      id: 'VER-7.5-01-06',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Authorized Exchange Operator Global Queue Access',
      endpoint: 'GET /api/orders',
      role: 'exchange operator',
      testMethod: 'GET with exchange token',
      scenario: 'Authorized desk operator requests global orders queue',
      expected: 'HTTP 200 with complete active orders queue (4 orders)',
      actual: `HTTP ${vOrdExchange.status}, count=${vOrdExchange.data?.length}`,
      evidence: { count: vOrdExchange.data?.length },
      status: vOrdExchange.status === 200 && isGlobalOrdersAccess ? 'PASSED' : 'FAILED'
    });

    // 2.7 Trailing slash normalization
    const vOrdTrailing = await apiRequest('GET', '/api/orders/', null, bearerHeader(tokenT01));
    recordResult({
      id: 'VER-7.5-01-07',
      category: 'Finding 7.4-01 (Orders)',
      title: 'Trailing Slash Route Normalization (/api/orders/)',
      endpoint: 'GET /api/orders/',
      role: 'team (T01)',
      testMethod: 'GET with trailing slash',
      scenario: 'Team T01 requests /api/orders/ with trailing slash',
      expected: 'HTTP 200 with strictly T01 orders',
      actual: `HTTP ${vOrdTrailing.status}, count=${vOrdTrailing.data?.length}`,
      evidence: { count: vOrdTrailing.data?.length },
      status: vOrdTrailing.status === 200 && Array.isArray(vOrdTrailing.data) && vOrdTrailing.data.length === 2 ? 'PASSED' : 'FAILED'
    });

    // 2.8 Desk management & queue metrics endpoints (/api/order-desks & /api/desks)
    const vDeskAnon = await apiRequest('GET', '/api/order-desks');
    const vDeskTeam = await apiRequest('GET', '/api/order-desks', null, bearerHeader(tokenT01));
    const vDeskStaff = await apiRequest('GET', '/api/order-desks', null, bearerHeader(tokenExchange));
    recordResult({
      id: 'VER-7.5-01-08',
      category: 'Finding 7.4-01 (Desks)',
      title: 'Desk Metrics & Queue Inspection Authorization',
      endpoint: 'GET /api/order-desks',
      role: 'anonymous, team, exchange',
      testMethod: 'GET desk status',
      scenario: 'Verify /api/order-desks rejects anonymous (401) and team (403), allows desk staff (200)',
      expected: 'Anonymous=401, Team=403, DeskStaff=200',
      actual: `Anon=${vDeskAnon.status}, Team=${vDeskTeam.status}, Staff=${vDeskStaff.status}`,
      evidence: { anon: vDeskAnon.status, team: vDeskTeam.status, staff: vDeskStaff.status },
      status: vDeskAnon.status === 401 && vDeskTeam.status === 403 && vDeskStaff.status === 200 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 3: VERIFICATION OF FINDING 7.4-02 (FX TRANSACTION & QUEUE PRIVACY)
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 3: FINDING 7.4-02 — FX TRANSACTION & QUEUE PRIVACY WITH REAL TOKENS');
    console.log('======================================================================');

    // 3.1 Anonymous GET /api/fx/transactions
    const vFxAnon = await apiRequest('GET', '/api/fx/transactions');
    recordResult({
      id: 'VER-7.5-02-01',
      category: 'Finding 7.4-02 (FX)',
      title: 'Anonymous /api/fx/transactions Rejection',
      endpoint: 'GET /api/fx/transactions',
      role: 'anonymous',
      testMethod: 'GET without token',
      scenario: 'Unauthenticated caller requests FX history',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vFxAnon.status}`,
      evidence: vFxAnon.data,
      status: vFxAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 3.2 Team T01 receives only T01 FX history
    const vFxT01 = await apiRequest('GET', '/api/fx/transactions', null, bearerHeader(tokenT01));
    const isOnlyT01Fx = vFxT01.data?.success && Array.isArray(vFxT01.data?.fxTransactions) && vFxT01.data.fxTransactions.length === 1 && vFxT01.data.fxTransactions[0].teamCode === 'T01';
    recordResult({
      id: 'VER-7.5-02-02',
      category: 'Finding 7.4-02 (FX)',
      title: 'Team T01 Private FX Transaction Scoping',
      endpoint: 'GET /api/fx/transactions',
      role: 'team (T01)',
      testMethod: 'GET with real T01 token',
      scenario: 'Team T01 requests FX transactions',
      expected: 'HTTP 200 with strictly T01 FX records (1 tx)',
      actual: `HTTP ${vFxT01.status}, count=${vFxT01.data?.fxTransactions?.length}`,
      evidence: vFxT01.data?.fxTransactions,
      status: vFxT01.status === 200 && isOnlyT01Fx ? 'PASSED' : 'FAILED'
    });

    // 3.3 Team T01 query parameter tampering
    const vFxT01Spoof = await apiRequest('GET', '/api/fx/transactions?teamCode=T02&actorTeamCode=T02&role=admin', null, bearerHeader(tokenT01));
    const isFxSpoofBlocked = vFxT01Spoof.data?.success && Array.isArray(vFxT01Spoof.data?.fxTransactions) && vFxT01Spoof.data.fxTransactions.length === 1 && vFxT01Spoof.data.fxTransactions[0].teamCode === 'T01';
    recordResult({
      id: 'VER-7.5-02-03',
      category: 'Finding 7.4-02 (FX)',
      title: 'Team T01 FX History Query Parameter Tampering Prevention',
      endpoint: 'GET /api/fx/transactions?teamCode=T02',
      role: 'team (T01)',
      testMethod: 'GET with spoofed query params',
      scenario: 'Team T01 supplies ?teamCode=T02&actorTeamCode=T02&role=admin',
      expected: 'HTTP 200 with strictly T01 FX transactions (query params discarded)',
      actual: `HTTP ${vFxT01Spoof.status}, count=${vFxT01Spoof.data?.fxTransactions?.length}`,
      evidence: vFxT01Spoof.data?.fxTransactions,
      status: vFxT01Spoof.status === 200 && isFxSpoofBlocked ? 'PASSED' : 'FAILED'
    });

    // 3.4 Anonymous GET /api/fx/queue
    const vFxqAnon = await apiRequest('GET', '/api/fx/queue');
    recordResult({
      id: 'VER-7.5-02-04',
      category: 'Finding 7.4-02 (FX)',
      title: 'Anonymous /api/fx/queue Rejection',
      endpoint: 'GET /api/fx/queue',
      role: 'anonymous',
      testMethod: 'GET without token',
      scenario: 'Unauthenticated caller requests FX conversion queue',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vFxqAnon.status}`,
      evidence: vFxqAnon.data,
      status: vFxqAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 3.5 Team T01 receives only T01 pending FX queue items
    const vFxqT01 = await apiRequest('GET', '/api/fx/queue', null, bearerHeader(tokenT01));
    const isOnlyT01FxQueue = vFxqT01.data?.success && Array.isArray(vFxqT01.data?.queue) && vFxqT01.data.queue.length === 1 && vFxqT01.data.queue[0].teamCode === 'T01';
    recordResult({
      id: 'VER-7.5-02-05',
      category: 'Finding 7.4-02 (FX)',
      title: 'Team T01 Private FX Queue Scoping',
      endpoint: 'GET /api/fx/queue',
      role: 'team (T01)',
      testMethod: 'GET with real T01 token',
      scenario: 'Team T01 requests pending FX conversions',
      expected: 'HTTP 200 with strictly T01 items (1 item, zero T02 leakage)',
      actual: `HTTP ${vFxqT01.status}, count=${vFxqT01.data?.queue?.length}`,
      evidence: vFxqT01.data?.queue,
      status: vFxqT01.status === 200 && isOnlyT01FxQueue ? 'PASSED' : 'FAILED'
    });

    // 3.6 Team T01 FX queue query spoofing
    const vFxqT01Spoof = await apiRequest('GET', '/api/fx/queue?teamCode=T02', null, bearerHeader(tokenT01));
    const isFxqSpoofBlocked = vFxqT01Spoof.data?.success && Array.isArray(vFxqT01Spoof.data?.queue) && vFxqT01Spoof.data.queue.length === 1 && vFxqT01Spoof.data.queue[0].teamCode === 'T01';
    recordResult({
      id: 'VER-7.5-02-06',
      category: 'Finding 7.4-02 (FX)',
      title: 'Team T01 FX Queue Query Spoofing Prevention',
      endpoint: 'GET /api/fx/queue?teamCode=T02',
      role: 'team (T01)',
      testMethod: 'GET with spoofed query param',
      scenario: 'Team T01 requests /api/fx/queue?teamCode=T02',
      expected: 'HTTP 200 with strictly T01 items',
      actual: `HTTP ${vFxqT01Spoof.status}, count=${vFxqT01Spoof.data?.queue?.length}`,
      evidence: vFxqT01Spoof.data?.queue,
      status: vFxqT01Spoof.status === 200 && isFxqSpoofBlocked ? 'PASSED' : 'FAILED'
    });

    // 3.7 Authorized operator full FX queue access
    const vFxqExchange = await apiRequest('GET', '/api/fx/queue', null, bearerHeader(tokenExchange));
    const isGlobalFxQueueAccess = vFxqExchange.data?.success && Array.isArray(vFxqExchange.data?.queue) && vFxqExchange.data.queue.length === 2;
    recordResult({
      id: 'VER-7.5-02-07',
      category: 'Finding 7.4-02 (FX)',
      title: 'Authorized Operator Global FX Queue Access',
      endpoint: 'GET /api/fx/queue',
      role: 'exchange operator',
      testMethod: 'GET with exchange token',
      scenario: 'Exchange desk operator inspects complete FX queue',
      expected: 'HTTP 200 with all pending FX requests (2 items)',
      actual: `HTTP ${vFxqExchange.status}, count=${vFxqExchange.data?.queue?.length}`,
      evidence: { count: vFxqExchange.data?.queue?.length },
      status: vFxqExchange.status === 200 && isGlobalFxQueueAccess ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 4: VERIFICATION OF FINDING 7.4-03 (JUDGING & SCORECARDS)
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 4: FINDING 7.4-03 — JUDGING & SCORECARD AUTHORIZATION');
    console.log('======================================================================');

    // 4.1 Anonymous POST /api/judging/scorecard/save
    const vJudgeAnon = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5
    });
    recordResult({
      id: 'VER-7.5-03-01',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Anonymous Scorecard Submission Rejection',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'anonymous',
      testMethod: 'POST without token',
      scenario: 'Unauthenticated caller attempts to save scorecard for T01',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vJudgeAnon.status}`,
      evidence: vJudgeAnon.data,
      status: vJudgeAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 4.2 Participant Team T01 self-scoring attempt
    const vJudgeTeam = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5,
      decisionTiming: 5
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'VER-7.5-03-02',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Participant Team Self-Scoring Rejection',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'team (T01)',
      testMethod: 'POST with team token',
      scenario: 'Team T01 attempts to award themselves perfect scores',
      expected: 'HTTP 403 Forbidden (judging.score required)',
      actual: `HTTP ${vJudgeTeam.status}`,
      evidence: vJudgeTeam.data,
      status: vJudgeTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.3 Unauthorized Staff (Advisor)
    const vJudgeAdvisor = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5
    }, bearerHeader(tokenAdvisor));
    recordResult({
      id: 'VER-7.5-03-03',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Unauthorized Staff Scorecard Submission Rejection',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'advisor',
      testMethod: 'POST with advisor token',
      scenario: 'Floor advisor attempts to submit judge scorecard',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vJudgeAdvisor.status}`,
      evidence: vJudgeAdvisor.data,
      status: vJudgeAdvisor.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.4 Authorized Judge submits legitimate scorecard
    const vJudgeLegit = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T02',
      responseToEvents: 4,
      decisionTiming: 4,
      adaptability: 4,
      riskRecognition: 4,
      forwardPositioning: 4,
      resilience: 4,
      balance: 4,
      adaptCapacity: 4,
      notes: 'Official deliberation evaluation by Judge'
    }, bearerHeader(tokenJudge));
    recordResult({
      id: 'VER-7.5-03-04',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Authorized Judge Legitimate Scorecard Submission',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'judge',
      testMethod: 'POST with judge token',
      scenario: 'Authorized judge submits scorecard for team T02',
      expected: 'HTTP 200 with scorecard bound to judge session identity',
      actual: `HTTP ${vJudgeLegit.status}, judgeId=${vJudgeLegit.data?.scorecard?.judgeId}`,
      evidence: vJudgeLegit.data?.scorecard,
      status: vJudgeLegit.status === 200 && vJudgeLegit.data?.success && (vJudgeLegit.data?.scorecard?.judgeId === 'USR_JDG_01' || vJudgeLegit.data?.scorecard?.judgeId === 'judge') ? 'PASSED' : 'FAILED'
    });

    // 4.5 Judge identity impersonation in body
    const vJudgeSpoof = await apiRequest('POST', '/api/judging/scorecard/save', {
      judgeId: 'CHIEF_JUSTICE_SPOOFED',
      judgeName: 'Chief Justice',
      teamCode: 'T02',
      responseToEvents: 5
    }, bearerHeader(tokenJudge));
    const isIdentityBoundToSession = (vJudgeSpoof.data?.scorecard?.judgeId === 'USR_JDG_01' || vJudgeSpoof.data?.scorecard?.judgeId === 'judge') && 
      vJudgeSpoof.data?.scorecard?.judgeId !== 'CHIEF_JUSTICE_SPOOFED';
    recordResult({
      id: 'VER-7.5-03-05',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Judge Identity Forgery Prevention',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'judge',
      testMethod: 'POST with spoofed body judgeId',
      scenario: 'Judge attempts to submit body { judgeId: "CHIEF_JUSTICE_SPOOFED" }',
      expected: 'HTTP 200 with judge identity bound strictly to session, ignoring body',
      actual: `HTTP ${vJudgeSpoof.status}, resolvedJudgeId=${vJudgeSpoof.data?.scorecard?.judgeId}`,
      evidence: { resolvedJudgeId: vJudgeSpoof.data?.scorecard?.judgeId },
      status: vJudgeSpoof.status === 200 && isIdentityBoundToSession ? 'PASSED' : 'FAILED'
    });

    // 4.6 Rubric score bounds validation
    const vJudgeBounds = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T02',
      responseToEvents: 99 // out of [0, 5] range
    }, bearerHeader(tokenJudge));
    recordResult({
      id: 'VER-7.5-03-06',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Rubric Score Bounds Validation ([0, 5])',
      endpoint: 'POST /api/judging/scorecard/save',
      role: 'judge',
      testMethod: 'POST with score > 5',
      scenario: 'Judge submits score of 99',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${vJudgeBounds.status}`,
      evidence: vJudgeBounds.data,
      status: vJudgeBounds.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 4.7 Scorecard moderation authorization
    const vModJudge = await apiRequest('POST', '/api/judging/moderate', {
      teamCode: 'T01',
      adjustedCard: { responseToEvents: 4 }
    }, bearerHeader(tokenJudge));
    const vModAdmin = await apiRequest('POST', '/api/judging/moderate', {
      teamCode: 'T01',
      resolutionNotes: 'Official Chief Judge Moderation',
      adjustedCard: {
        responseToEvents: 4,
        decisionTiming: 4,
        adaptability: 4,
        riskRecognition: 4,
        forwardPositioning: 4,
        resilience: 4,
        balance: 4,
        adaptCapacity: 4
      }
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'VER-7.5-03-07',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Scorecard Moderation Authorization (results.approve)',
      endpoint: 'POST /api/judging/moderate',
      role: 'judge vs admin',
      testMethod: 'POST moderation',
      scenario: 'Verify Judge cannot moderate (403), Administrator can moderate (200)',
      expected: 'Judge=403, Admin=200',
      actual: `Judge=${vModJudge.status}, Admin=${vModAdmin.status}`,
      evidence: { judgeStatus: vModJudge.status, adminStatus: vModAdmin.status, isModerated: vModAdmin.data?.moderatedCard?.isModerated },
      status: vModJudge.status === 403 && vModAdmin.status === 200 && vModAdmin.data?.moderatedCard?.isModerated === true ? 'PASSED' : 'FAILED'
    });

    // 4.8 Viewing deliberation scorecards
    const vCardsTeam = await apiRequest('GET', '/api/judging/scorecards', null, bearerHeader(tokenT01));
    const vCardsJudge = await apiRequest('GET', '/api/judging/scorecards', null, bearerHeader(tokenJudge));
    recordResult({
      id: 'VER-7.5-03-08',
      category: 'Finding 7.4-03 (Judging)',
      title: 'Deliberation Scorecards Viewing Privacy',
      endpoint: 'GET /api/judging/scorecards',
      role: 'team vs judge',
      testMethod: 'GET scorecards before publishing',
      scenario: 'Verify Team is blocked (403), Judge is permitted (200)',
      expected: 'Team=403, Judge=200',
      actual: `Team=${vCardsTeam.status}, Judge=${vCardsJudge.status}`,
      evidence: { teamStatus: vCardsTeam.status, judgeStatus: vCardsJudge.status, cardsCount: vCardsJudge.data?.scorecards?.length },
      status: vCardsTeam.status === 403 && vCardsJudge.status === 200 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 5: VERIFICATION OF FINDING 7.4-04 (CSV REPORT AUTHORIZATION)
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 5: FINDING 7.4-04 — CSV REPORT AUTHORIZATION & QUERY TOKENS');
    console.log('======================================================================');

    // 5.1 Anonymous GET /api/reports/orders/csv
    const vCsvOrdAnon = await apiRequest('GET', '/api/reports/orders/csv');
    recordResult({
      id: 'VER-7.5-04-01',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Anonymous Orders CSV Report Rejection',
      endpoint: 'GET /api/reports/orders/csv',
      role: 'anonymous',
      testMethod: 'GET without token',
      scenario: 'Unauthenticated caller requests orders CSV export',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vCsvOrdAnon.status}`,
      evidence: vCsvOrdAnon.data,
      status: vCsvOrdAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 5.2 Team T01 GET /api/reports/orders/csv
    const vCsvOrdTeam = await apiRequest('GET', '/api/reports/orders/csv', null, bearerHeader(tokenT01));
    recordResult({
      id: 'VER-7.5-04-02',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Participant Team Orders CSV Export Rejection',
      endpoint: 'GET /api/reports/orders/csv',
      role: 'team (T01)',
      testMethod: 'GET with team token',
      scenario: 'Team T01 requests complete orders CSV export',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vCsvOrdTeam.status}`,
      evidence: vCsvOrdTeam.data,
      status: vCsvOrdTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 5.3 Authorized Desk Operator GET /api/reports/orders/csv
    const vCsvOrdDesk = await apiRequest('GET', '/api/reports/orders/csv', null, bearerHeader(tokenExchange));
    const isCsvOrdersValid = vCsvOrdDesk.status === 200 && typeof vCsvOrdDesk.data === 'string' && vCsvOrdDesk.data.includes('Order ID,Ticket Number,Team Code');
    recordResult({
      id: 'VER-7.5-04-03',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Authorized Desk Operator Orders CSV Export',
      endpoint: 'GET /api/reports/orders/csv',
      role: 'exchange operator',
      testMethod: 'GET with exchange token',
      scenario: 'Exchange desk operator exports orders CSV',
      expected: 'HTTP 200 with text/csv header and order rows',
      actual: `HTTP ${vCsvOrdDesk.status}, isCsv=${isCsvOrdersValid}`,
      evidence: { status: vCsvOrdDesk.status, preview: typeof vCsvOrdDesk.data === 'string' ? vCsvOrdDesk.data.slice(0, 100) : vCsvOrdDesk.data },
      status: isCsvOrdersValid ? 'PASSED' : 'FAILED'
    });

    // 5.4 Authorized SEBI Auditor GET /api/reports/reconciliation/csv
    const vCsvReconSebi = await apiRequest('GET', '/api/reports/reconciliation/csv', null, bearerHeader(tokenSebi));
    const isCsvReconValid = vCsvReconSebi.status === 200 && typeof vCsvReconSebi.data === 'string' && vCsvReconSebi.data.includes('Rank,Team Code,Team Name');
    recordResult({
      id: 'VER-7.5-04-04',
      category: 'Finding 7.4-04 (Reports)',
      title: 'SEBI Auditor Financial Reconciliation CSV Export',
      endpoint: 'GET /api/reports/reconciliation/csv',
      role: 'sebi auditor',
      testMethod: 'GET with sebi token',
      scenario: 'SEBI auditor exports reconciliation rankings CSV',
      expected: 'HTTP 200 with text/csv header and team financial metrics',
      actual: `HTTP ${vCsvReconSebi.status}, isCsv=${isCsvReconValid}`,
      evidence: { status: vCsvReconSebi.status, preview: typeof vCsvReconSebi.data === 'string' ? vCsvReconSebi.data.slice(0, 100) : vCsvReconSebi.data },
      status: isCsvReconValid ? 'PASSED' : 'FAILED'
    });

    // 5.5 Query Parameter Token Validation for Browser CSV Exports
    // Valid SEBI Token in URL query string
    const vCsvQueryTokenValid = await apiRequest('GET', `/api/reports/orders/csv?token=${tokenSebi}`);
    const isCsvQueryTokenSuccess = vCsvQueryTokenValid.status === 200 && typeof vCsvQueryTokenValid.data === 'string' && vCsvQueryTokenValid.data.includes('Order ID,Ticket Number,Team Code');
    recordResult({
      id: 'VER-7.5-04-05',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Browser Query-Token Authentication (Authorized SEBI)',
      endpoint: 'GET /api/reports/orders/csv?token=...',
      role: 'sebi (query token)',
      testMethod: 'GET with URL token parameter',
      scenario: 'Browser downloads orders CSV via link with valid SEBI query token',
      expected: 'HTTP 200 with CSV stream',
      actual: `HTTP ${vCsvQueryTokenValid.status}, isCsv=${isCsvQueryTokenSuccess}`,
      evidence: { status: vCsvQueryTokenValid.status },
      status: isCsvQueryTokenSuccess ? 'PASSED' : 'FAILED'
    });

    // 5.6 Query Parameter Token Validation with Team Token (Privilege Check)
    const vCsvQueryTokenTeam = await apiRequest('GET', `/api/reports/orders/csv?token=${tokenT01}`);
    recordResult({
      id: 'VER-7.5-04-06',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Browser Query-Token Privilege Enforcement (Team Forbidden)',
      endpoint: 'GET /api/reports/orders/csv?token=...',
      role: 'team (query token)',
      testMethod: 'GET with URL team token',
      scenario: 'Team attempts to download complete orders CSV via query token',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vCsvQueryTokenTeam.status}`,
      evidence: vCsvQueryTokenTeam.data,
      status: vCsvQueryTokenTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 5.7 Query Parameter Token Tampering / Forgery
    const vCsvQueryTokenTampered = await apiRequest('GET', `/api/reports/orders/csv?token=${tokenSebi.slice(0, -6)}ffff00`);
    recordResult({
      id: 'VER-7.5-04-07',
      category: 'Finding 7.4-04 (Reports)',
      title: 'Browser Query-Token Signature Tampering Rejection',
      endpoint: 'GET /api/reports/orders/csv?token=...',
      role: 'tampered query token',
      testMethod: 'GET with forged signature in URL parameter',
      scenario: 'Attacker supplies forged token in query string',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vCsvQueryTokenTampered.status}`,
      evidence: vCsvQueryTokenTampered.data,
      status: vCsvQueryTokenTampered.status === 401 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 6: VERIFICATION OF FINDING 7.4-05 (AUDITORIUM DEBATE & ROUNDS)
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 6: FINDING 7.4-05 — AUDITORIUM DEBATE & ROUND CONTROLS WITH REAL TOKENS');
    console.log('======================================================================');

    // 6.1 Anonymous POST /api/bull-bear/debate
    const vDebateAnon = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Hacked Topic',
      round: 2,
      active: true
    });
    recordResult({
      id: 'VER-7.5-05-01',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Anonymous Auditorium Debate Takeover Rejection',
      endpoint: 'POST /api/bull-bear/debate',
      role: 'anonymous',
      testMethod: 'POST without token',
      scenario: 'Unauthenticated caller attempts to hijack projector display',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vDebateAnon.status}`,
      evidence: vDebateAnon.data,
      status: vDebateAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 6.2 Team T01 POST /api/bull-bear/debate
    const vDebateTeam = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Team Hijack Topic',
      round: 2,
      active: true
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'VER-7.5-05-02',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Participant Team Debate Takeover Rejection',
      endpoint: 'POST /api/bull-bear/debate',
      role: 'team (T01)',
      testMethod: 'POST with team token',
      scenario: 'Team T01 attempts to trigger debate stage showdown',
      expected: 'HTTP 403 Forbidden (market.control required)',
      actual: `HTTP ${vDebateTeam.status}`,
      evidence: vDebateTeam.data,
      status: vDebateTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 6.3 Authorized Coordinator POST /api/bull-bear/debate
    const vDebateCoord = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Semiconductor CapEx Supercycles',
      round: 1,
      active: true
    }, bearerHeader(tokenCoord));
    recordResult({
      id: 'VER-7.5-05-03',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Authorized Coordinator Debate Showdown Activation',
      endpoint: 'POST /api/bull-bear/debate',
      role: 'coordinator',
      testMethod: 'POST with coordinator token',
      scenario: 'Floor Coordinator activates debate showdown on projector',
      expected: 'HTTP 200 with debateData initialized and takeoverEvent active',
      actual: `HTTP ${vDebateCoord.status}, topic=${vDebateCoord.data?.debateData?.topic}`,
      evidence: vDebateCoord.data,
      status: vDebateCoord.status === 200 && vDebateCoord.data?.success && vDebateCoord.data?.debateData?.topic === 'Semiconductor CapEx Supercycles' ? 'PASSED' : 'FAILED'
    });

    // 6.4 Anonymous POST /api/bull-bear/round
    const vRoundAnon = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'Unauthenticated Topic'
    });
    recordResult({
      id: 'VER-7.5-05-04',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Anonymous Debate Round Modification Rejection',
      endpoint: 'POST /api/bull-bear/round',
      role: 'anonymous',
      testMethod: 'POST without token',
      scenario: 'Unauthenticated caller attempts to modify debate round',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${vRoundAnon.status}`,
      evidence: vRoundAnon.data,
      status: vRoundAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 6.5 Team T01 POST /api/bull-bear/round
    const vRoundTeam = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'Team Tampered Topic'
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'VER-7.5-05-05',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Participant Team Debate Round Modification Rejection',
      endpoint: 'POST /api/bull-bear/round',
      role: 'team (T01)',
      testMethod: 'POST with team token',
      scenario: 'Team T01 attempts to advance debate round',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vRoundTeam.status}`,
      evidence: vRoundTeam.data,
      status: vRoundTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 6.6 Authorized Coordinator POST /api/bull-bear/round
    const vRoundCoord = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'High Yield Credit Spreads vs Equity Valuations',
      timerSeconds: 300,
      moderatorNotes: 'Official Round 2 Discussion'
    }, bearerHeader(tokenCoord));
    recordResult({
      id: 'VER-7.5-05-06',
      category: 'Finding 7.4-05 (Debate)',
      title: 'Authorized Coordinator Debate Round Management',
      endpoint: 'POST /api/bull-bear/round',
      role: 'coordinator',
      testMethod: 'POST with coordinator token',
      scenario: 'Coordinator advances debate round with topic and timer',
      expected: 'HTTP 200 with debate round updated',
      actual: `HTTP ${vRoundCoord.status}, round=${vRoundCoord.data?.debate?.activeRound}`,
      evidence: vRoundCoord.data?.debate,
      status: vRoundCoord.status === 200 && vRoundCoord.data?.success && vRoundCoord.data?.debate?.activeRound === 2 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 7: PHASE 7.1 & 7.3 REGRESSION VERIFICATION WITH REAL TOKENS
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 7: PHASE 7.1 & 7.3 REGRESSION INTEGRITY (REAL TOKENS)');
    console.log('======================================================================');

    // 7.1 Cross-team order resubmission blocking
    const vResubmitCross = await apiRequest('POST', '/api/orders/resubmit', {
      orderId: 'ORD_T02_101',
      teamCode: 'T02',
      quantity: 50
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'REG-7.1-01',
      category: 'Phase 7.1 Regression',
      title: 'Cross-Team Order Resubmission Prevention',
      endpoint: 'POST /api/orders/resubmit',
      role: 'team (T01)',
      testMethod: 'POST with rival orderId',
      scenario: 'Team T01 attempts to resubmit Team T02 order',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vResubmitCross.status}`,
      evidence: vResubmitCross.data,
      status: vResubmitCross.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 7.2 Cross-team order cancellation blocking
    const vCancelCross = await apiRequest('POST', '/api/orders/cancel', {
      orderId: 'ORD_T02_101',
      teamCode: 'T02'
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'REG-7.1-02',
      category: 'Phase 7.1 Regression',
      title: 'Cross-Team Order Cancellation Prevention',
      endpoint: 'POST /api/orders/cancel',
      role: 'team (T01)',
      testMethod: 'POST with rival orderId',
      scenario: 'Team T01 attempts to cancel Team T02 order',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vCancelCross.status}`,
      evidence: vCancelCross.data,
      status: vCancelCross.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 7.3 Direct trade execution blocked for team
    const vDirectTrade = await apiRequest('POST', '/api/trade', {
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'REG-7.1-03',
      category: 'Phase 7.1 Regression',
      title: 'Direct Trade Execution Blocked for Floor Participants',
      endpoint: 'POST /api/trade',
      role: 'team (T01)',
      testMethod: 'POST direct trade execution',
      scenario: 'Team T01 attempts to bypass desk clearance and execute trade directly',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vDirectTrade.status}`,
      evidence: vDirectTrade.data,
      status: vDirectTrade.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 7.4 Cross-team poll voting prevention (Phase 7.3)
    const vPollCreate = await apiRequest('POST', '/api/polls/create', {
      question: 'Market Direction Test Poll',
      options: ['Bull', 'Bear', 'Flat'],
      durationSeconds: 300
    }, bearerHeader(tokenCoord));
    const createdPollId = vPollCreate.data?.poll?.id;

    const vPollVoteSpoof = await apiRequest('POST', '/api/polls/vote', {
      pollId: createdPollId,
      teamCode: 'T02',
      optionId: 0
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'REG-7.3-01',
      category: 'Phase 7.3 Regression',
      title: 'Cross-Team Poll Vote Spoofing Prevention',
      endpoint: 'POST /api/polls/vote',
      role: 'team (T01 attempting T02 vote)',
      testMethod: 'POST vote with rival teamCode',
      scenario: 'Team T01 attempts to cast poll vote on behalf of Team T02',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${vPollVoteSpoof.status}`,
      evidence: vPollVoteSpoof.data,
      status: vPollVoteSpoof.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 7.5 Unprivileged broker recommendation creation blocked (Phase 7.3)
    const vBrokerRecTeam = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'TCS',
      recommendation: 'BUY',
      confidence: 90,
      reasoning: 'Team injected signal'
    }, bearerHeader(tokenT01));
    recordResult({
      id: 'REG-7.3-02',
      category: 'Phase 7.3 Regression',
      title: 'Unprivileged Broker Recommendation Creation Blocked',
      endpoint: 'POST /api/broker/recommendation',
      role: 'team (T01)',
      testMethod: 'POST recommendation',
      scenario: 'Participant team attempts to publish stock advisory signal',
      expected: 'HTTP 403 Forbidden (requires advisor role)',
      actual: `HTTP ${vBrokerRecTeam.status}`,
      evidence: vBrokerRecTeam.data,
      status: vBrokerRecTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 8: LEDGER & FINANCIAL INVARIANT VERIFICATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT SECTION 8: FINANCIAL LEDGER & SCORECARD NON-MUTATION AUDIT');
    console.log('======================================================================');

    const postTestFixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const t01Team = postTestFixture.teams.find(t => t.teamCode === 'T01');
    assert.strictEqual(t01Team.cashBalance, 10000000, 'T01 cash balance unexpectedly mutated during independent test execution!');
    assert.strictEqual(postTestFixture.orders.length, 4, 'Orders array length unexpectedly changed!');
    assert.strictEqual(postTestFixture.fxTransactions.length, 2, 'FX transactions length unexpectedly changed!');
    assert.strictEqual(postTestFixture.fxQueue.length, 2, 'FX queue length unexpectedly changed!');

    recordResult({
      id: 'LEDGER-VER-01',
      category: 'Ledger Invariants',
      title: 'Financial Ledger & Queue Invariants Preserved',
      endpoint: 'Database State Invariants',
      role: 'system state',
      testMethod: 'Deep fixture assertion',
      scenario: 'Verify cash balance, orders collection, and FX queues remained uncorrupted by hostile test vectors',
      expected: 'Zero mutations on cash, orders, and FX queues',
      actual: `T01 Cash=${t01Team.cashBalance}, OrdersCount=${postTestFixture.orders.length}, FxQueueCount=${postTestFixture.fxQueue.length}`,
      evidence: { cashBalance: t01Team.cashBalance, ordersCount: postTestFixture.orders.length, fxQueueCount: postTestFixture.fxQueue.length },
      status: 'PASSED'
    });

  } finally {
    // Terminate isolated test server process
    console.log('\n--- TERMINATING ISOLATED TEST SERVER ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 800));
    console.log('✓ Isolated test server terminated.');
  }

  // STEP 9: POST-FLIGHT AUTHORITATIVE STATE INTEGRITY VERIFICATION
  console.log('\n--- STEP 9: POST-FLIGHT AUTHORITATIVE STATE INTEGRITY VERIFICATION ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'FATAL ERROR: AUTHORITATIVE STATE WAS MODIFIED DURING TEST!');
  console.log('✓ Bit-identical authoritative state integrity verified: 100% untouched.\n');

  // WRITE AUDIT RESULTS
  const summary = {
    totalScenarios: testResults.length,
    passed: testResults.filter(r => r.status === 'PASSED').length,
    failed: testResults.filter(r => r.status === 'FAILED').length,
    timestamp: new Date().toISOString(),
    expectedStateHash: EXPECTED_HASH,
    finalStateHash: finalHash,
    results: testResults
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`✓ Independent verification audit results saved to: ${path.basename(RESULTS_FILE)}`);
  console.log(`\n======================================================================`);
  console.log(`FINAL INDEPENDENT AUDIT RESULTS: ${summary.passed}/${summary.totalScenarios} PASSED (${summary.failed} FAILED)`);
  console.log(`======================================================================\n`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runIndependentVerificationSuite().catch(err => {
  console.error('\n❌ INDEPENDENT VERIFICATION FAILED WITH ERROR:', err);
  process.exit(1);
});
