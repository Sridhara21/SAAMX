import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3095;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase7-5-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-phase-7-5-release-gate-remediation-results.json');

const testResults = [];

function recordResult({ id, category, title, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, category, title, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Scenario: ${scenario}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  console.log(`  Evidence: ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
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

async function runReleaseGateRemediationSuite() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE 7.5 — RELEASE-GATE REMEDIATION TEST SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY
  console.log('--- STEP 1: VERIFYING AUTHORITATIVE STATE INTEGRITY ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH! STOPPING IMMEDIATELY.');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: DISPOSABLE FIXTURE PREPARATION
  console.log('--- STEP 2: CLONING DISPOSABLE FIXTURE & CONFIGURING TEST DATA ---');
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

  // Seed test orders
  fixture.orders = [
    {
      id: 'ORD_T01_001',
      ticketNumber: 'TKT-001',
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
      id: 'ORD_T01_002',
      ticketNumber: 'TKT-002',
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
      id: 'ORD_T02_001',
      ticketNumber: 'TKT-003',
      teamCode: 'T02',
      ticker: 'INFY',
      action: 'BUY',
      quantity: 20,
      orderType: 'MARKET',
      status: 'AWAITING_VERIFICATION',
      submittedAt: Date.now()
    },
    {
      id: 'ORD_T03_001',
      ticketNumber: 'TKT-004',
      teamCode: 'T03',
      ticker: 'HDFCBANK',
      action: 'BUY',
      quantity: 15,
      orderType: 'MARKET',
      status: 'EXECUTED',
      submittedAt: Date.now()
    }
  ];

  // Seed test FX transactions
  fixture.fxTransactions = [
    {
      id: 'FX_TX_T01_001',
      ticketNumber: 'FX-001',
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000,
      toAmount: 1128.67,
      status: 'SETTLED',
      timestamp: Date.now()
    },
    {
      id: 'FX_TX_T02_001',
      ticketNumber: 'FX-002',
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'EUR',
      fromAmount: 200000,
      toAmount: 1923.99,
      status: 'SETTLED',
      timestamp: Date.now()
    }
  ];

  // Seed test FX queue
  fixture.fxQueue = [
    {
      id: 'FX_Q_T01_001',
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'GBP',
      fromAmount: 50000,
      status: 'PENDING',
      timestamp: Date.now()
    },
    {
      id: 'FX_Q_T02_001',
      teamCode: 'T02',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 150000,
      status: 'PENDING',
      timestamp: Date.now()
    }
  ];

  // Seed test scorecards
  fixture.judgeScorecards = [
    {
      id: 'CARD_SEED_001',
      judgeId: 'JUDGE_1',
      judgeName: 'Official Judge 1',
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
    },
    {
      id: 'CARD_SEED_002',
      judgeId: 'JUDGE_2',
      judgeName: 'Official Judge 2',
      teamCode: 'T01',
      responseToEvents: 3,
      decisionTiming: 3,
      adaptability: 3,
      riskRecognition: 3,
      forwardPositioning: 3,
      resilience: 3,
      balance: 3,
      adaptCapacity: 3,
      isLocked: true,
      notes: 'Submitted and locked scorecard'
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

  // STEP 3: SPAWN ISOLATED TEST SERVER
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
    const teamHeaders = (teamCode) => ({
      'x-fms-password': 'fms-event-2026',
      'x-fms-role': 'team',
      'x-fms-team-code': teamCode
    });
    const roleHeaders = (role) => ({
      'x-fms-password': 'fms-event-2026',
      'x-fms-role': role
    });

    // ======================================================================
    // 1. FINDING 7.4-01: REST ORDER-SLIP PRIVACY (GET /api/orders & /api/order-desks)
    // ======================================================================
    console.log('======================================================================');
    console.log('📌 AUDIT AREA 1: FINDING 7.4-01 — REST ORDER-SLIP PRIVACY');
    console.log('======================================================================');

    // 1.A: Anonymous GET /api/orders
    const ordAnon = await apiRequest('GET', '/api/orders');
    recordResult({
      id: 'SEC-7.5-01-A',
      category: 'Order Privacy',
      title: 'Anonymous /api/orders Rejection',
      scenario: 'Unauthenticated caller requests GET /api/orders',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${ordAnon.status}`,
      evidence: ordAnon.data,
      status: ordAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 1.B: Team T01 receives only T01 orders
    const ordT01 = await apiRequest('GET', '/api/orders', null, teamHeaders('T01'));
    const isOnlyT01 = Array.isArray(ordT01.data) && ordT01.data.length === 2 && ordT01.data.every(o => o.teamCode === 'T01');
    recordResult({
      id: 'SEC-7.5-01-B',
      category: 'Order Privacy',
      title: 'Team T01 Scoped Orders Retrieval',
      scenario: 'Authenticated team T01 requests GET /api/orders',
      expected: 'HTTP 200 with strictly T01 orders (2 orders, zero cross-team slips)',
      actual: `HTTP ${ordT01.status}, count=${Array.isArray(ordT01.data) ? ordT01.data.length : 'N/A'}`,
      evidence: Array.isArray(ordT01.data) ? ordT01.data.map(o => ({ id: o.id, teamCode: o.teamCode })) : ordT01.data,
      status: ordT01.status === 200 && isOnlyT01 ? 'PASSED' : 'FAILED'
    });

    // 1.C: Team T01 spoof attempt with ?teamCode=T02
    const ordT01Spoof = await apiRequest('GET', '/api/orders?teamCode=T02', null, teamHeaders('T01'));
    const isStillOnlyT01 = Array.isArray(ordT01Spoof.data) && ordT01Spoof.data.length === 2 && ordT01Spoof.data.every(o => o.teamCode === 'T01');
    recordResult({
      id: 'SEC-7.5-01-C',
      category: 'Order Privacy',
      title: 'Team T01 Query Parameter Spoofing Prevention',
      scenario: 'Team T01 passes ?teamCode=T02 in query string to access T02 orders',
      expected: 'HTTP 200 with strictly T01 orders (query param ignored; zero T02 leakage)',
      actual: `HTTP ${ordT01Spoof.status}, count=${Array.isArray(ordT01Spoof.data) ? ordT01Spoof.data.length : 'N/A'}`,
      evidence: Array.isArray(ordT01Spoof.data) ? ordT01Spoof.data.map(o => ({ id: o.id, teamCode: o.teamCode })) : ordT01Spoof.data,
      status: ordT01Spoof.status === 200 && isStillOnlyT01 ? 'PASSED' : 'FAILED'
    });

    // 1.D: Team T02 receives only T02 orders
    const ordT02 = await apiRequest('GET', '/api/orders', null, teamHeaders('T02'));
    const isOnlyT02 = Array.isArray(ordT02.data) && ordT02.data.length === 1 && ordT02.data[0].teamCode === 'T02';
    recordResult({
      id: 'SEC-7.5-01-D',
      category: 'Order Privacy',
      title: 'Team T02 Scoped Orders Retrieval',
      scenario: 'Authenticated team T02 requests GET /api/orders',
      expected: 'HTTP 200 with strictly T02 orders (1 order)',
      actual: `HTTP ${ordT02.status}, count=${Array.isArray(ordT02.data) ? ordT02.data.length : 'N/A'}`,
      evidence: ordT02.data,
      status: ordT02.status === 200 && isOnlyT02 ? 'PASSED' : 'FAILED'
    });

    // 1.E: Unprivileged roles (journalist, judge, advisor) Deny-by-default
    const ordJournalist = await apiRequest('GET', '/api/orders', null, roleHeaders('journalist'));
    const ordJudge = await apiRequest('GET', '/api/orders', null, roleHeaders('judge'));
    const ordAdvisor = await apiRequest('GET', '/api/orders', null, roleHeaders('advisor'));
    const allDenied = ordJournalist.status === 403 && ordJudge.status === 403 && ordAdvisor.status === 403;
    recordResult({
      id: 'SEC-7.5-01-E',
      category: 'Order Privacy',
      title: 'Unprivileged Roles Deny-By-Default for Orders',
      scenario: 'Journalist, Judge, and Advisor attempt GET /api/orders',
      expected: 'HTTP 403 Forbidden for all unprivileged roles',
      actual: `Journalist=${ordJournalist.status}, Judge=${ordJudge.status}, Advisor=${ordAdvisor.status}`,
      evidence: { journalist: ordJournalist.data, judge: ordJudge.data, advisor: ordAdvisor.data },
      status: allDenied ? 'PASSED' : 'FAILED'
    });

    // 1.F: Authorized exchange desk receives all orders
    const ordExchange = await apiRequest('GET', '/api/orders', null, roleHeaders('operator_x'));
    const hasAllOrdersExchange = Array.isArray(ordExchange.data) && ordExchange.data.length === 4;
    recordResult({
      id: 'SEC-7.5-01-F',
      category: 'Order Privacy',
      title: 'Authorized Exchange Desk Global Orders Access',
      scenario: 'Exchange desk operator requests GET /api/orders',
      expected: 'HTTP 200 with complete active orders collection (4 orders)',
      actual: `HTTP ${ordExchange.status}, count=${Array.isArray(ordExchange.data) ? ordExchange.data.length : 'N/A'}`,
      evidence: { orderCount: ordExchange.data?.length },
      status: ordExchange.status === 200 && hasAllOrdersExchange ? 'PASSED' : 'FAILED'
    });

    // 1.G: Authorized admin receives all orders
    const ordAdmin = await apiRequest('GET', '/api/orders', null, roleHeaders('admin'));
    const hasAllOrdersAdmin = Array.isArray(ordAdmin.data) && ordAdmin.data.length === 4;
    recordResult({
      id: 'SEC-7.5-01-G',
      category: 'Order Privacy',
      title: 'Administrator Global Orders Access',
      scenario: 'Administrator requests GET /api/orders',
      expected: 'HTTP 200 with complete active orders collection (4 orders)',
      actual: `HTTP ${ordAdmin.status}, count=${Array.isArray(ordAdmin.data) ? ordAdmin.data.length : 'N/A'}`,
      evidence: { orderCount: ordAdmin.data?.length },
      status: ordAdmin.status === 200 && hasAllOrdersAdmin ? 'PASSED' : 'FAILED'
    });

    // 1.H: Trailing-slash normalization
    const ordTrailing = await apiRequest('GET', '/api/orders/', null, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-01-H',
      category: 'Order Privacy',
      title: 'Trailing Slash Route Normalization',
      scenario: 'Team T01 requests GET /api/orders/ with trailing slash',
      expected: 'HTTP 200 with strictly T01 orders',
      actual: `HTTP ${ordTrailing.status}, count=${Array.isArray(ordTrailing.data) ? ordTrailing.data.length : 'N/A'}`,
      evidence: { count: ordTrailing.data?.length },
      status: ordTrailing.status === 200 && Array.isArray(ordTrailing.data) && ordTrailing.data.length === 2 ? 'PASSED' : 'FAILED'
    });

    // 1.I: Related desk queue & metrics endpoint (/api/order-desks & /api/desks)
    const desksAnon = await apiRequest('GET', '/api/order-desks');
    const desksTeam = await apiRequest('GET', '/api/order-desks', null, teamHeaders('T01'));
    const desksStaff = await apiRequest('GET', '/api/order-desks', null, roleHeaders('operator_x'));
    recordResult({
      id: 'SEC-7.5-01-I',
      category: 'Desk Privacy',
      title: 'Desk Metrics & Queue Endpoint Authorization',
      scenario: 'Check /api/order-desks for anonymous, team, and desk staff access',
      expected: 'Anonymous=401, Team=403, DeskStaff=200',
      actual: `Anon=${desksAnon.status}, Team=${desksTeam.status}, Staff=${desksStaff.status}`,
      evidence: { anon: desksAnon.status, team: desksTeam.status, staff: desksStaff.status },
      status: desksAnon.status === 401 && desksTeam.status === 403 && desksStaff.status === 200 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // 2. FINDING 7.4-02: FX TRANSACTION & QUEUE PRIVACY
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT AREA 2: FINDING 7.4-02 — FX TRANSACTION & QUEUE PRIVACY');
    console.log('======================================================================');

    // 2.A: Anonymous GET /api/fx/transactions
    const fxAnon = await apiRequest('GET', '/api/fx/transactions');
    recordResult({
      id: 'SEC-7.5-02-A',
      category: 'FX Privacy',
      title: 'Anonymous /api/fx/transactions Rejection',
      scenario: 'Unauthenticated caller requests GET /api/fx/transactions',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${fxAnon.status}`,
      evidence: fxAnon.data,
      status: fxAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 2.B: Team T01 receives only T01 FX history
    const fxT01 = await apiRequest('GET', '/api/fx/transactions', null, teamHeaders('T01'));
    const isOnlyT01Fx = fxT01.data?.success && Array.isArray(fxT01.data?.fxTransactions) && fxT01.data.fxTransactions.length === 1 && fxT01.data.fxTransactions[0].teamCode === 'T01';
    recordResult({
      id: 'SEC-7.5-02-B',
      category: 'FX Privacy',
      title: 'Team T01 Scoped FX Transactions Retrieval',
      scenario: 'Team T01 requests GET /api/fx/transactions',
      expected: 'HTTP 200 with strictly T01 FX transactions (1 transaction)',
      actual: `HTTP ${fxT01.status}, count=${fxT01.data?.fxTransactions?.length}`,
      evidence: fxT01.data?.fxTransactions,
      status: fxT01.status === 200 && isOnlyT01Fx ? 'PASSED' : 'FAILED'
    });

    // 2.C: Team T01 query parameter spoofing
    const fxT01Spoof = await apiRequest('GET', '/api/fx/transactions?teamCode=T02&actorTeamCode=T02&role=admin', null, teamHeaders('T01'));
    const isStillOnlyT01Fx = fxT01Spoof.data?.success && Array.isArray(fxT01Spoof.data?.fxTransactions) && fxT01Spoof.data.fxTransactions.length === 1 && fxT01Spoof.data.fxTransactions[0].teamCode === 'T01';
    recordResult({
      id: 'SEC-7.5-02-C',
      category: 'FX Privacy',
      title: 'Team T01 Query Parameter Spoofing Prevention in FX History',
      scenario: 'Team T01 attempts to view T02 FX history by spoofing ?teamCode=T02&actorTeamCode=T02&role=admin',
      expected: 'HTTP 200 with strictly T01 FX transactions (zero T02 leakage)',
      actual: `HTTP ${fxT01Spoof.status}, count=${fxT01Spoof.data?.fxTransactions?.length}`,
      evidence: fxT01Spoof.data?.fxTransactions,
      status: fxT01Spoof.status === 200 && isStillOnlyT01Fx ? 'PASSED' : 'FAILED'
    });

    // 2.D: Unprivileged roles deny-by-default for FX history
    const fxJournalist = await apiRequest('GET', '/api/fx/transactions', null, roleHeaders('journalist'));
    const fxJudge = await apiRequest('GET', '/api/fx/transactions', null, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-02-D',
      category: 'FX Privacy',
      title: 'Unprivileged Roles Deny-By-Default for FX History',
      scenario: 'Journalist and Judge request GET /api/fx/transactions',
      expected: 'HTTP 403 Forbidden for unprivileged roles',
      actual: `Journalist=${fxJournalist.status}, Judge=${fxJudge.status}`,
      evidence: { journalist: fxJournalist.data, judge: fxJudge.data },
      status: fxJournalist.status === 403 && fxJudge.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 2.E: Authorized exchange operator receives full FX history
    const fxOperator = await apiRequest('GET', '/api/fx/transactions', null, roleHeaders('operator_x'));
    const hasAllFx = fxOperator.data?.success && Array.isArray(fxOperator.data?.fxTransactions) && fxOperator.data.fxTransactions.length === 2;
    recordResult({
      id: 'SEC-7.5-02-E',
      category: 'FX Privacy',
      title: 'Authorized Operator Global FX Transactions Retrieval',
      scenario: 'Exchange desk operator requests GET /api/fx/transactions',
      expected: 'HTTP 200 with complete FX transaction log (2 transactions)',
      actual: `HTTP ${fxOperator.status}, count=${fxOperator.data?.fxTransactions?.length}`,
      evidence: { count: fxOperator.data?.fxTransactions?.length },
      status: fxOperator.status === 200 && hasAllFx ? 'PASSED' : 'FAILED'
    });

    // 2.F: Anonymous GET /api/fx/queue
    const fxqAnon = await apiRequest('GET', '/api/fx/queue');
    recordResult({
      id: 'SEC-7.5-02-F',
      category: 'FX Queue Privacy',
      title: 'Anonymous /api/fx/queue Rejection',
      scenario: 'Unauthenticated caller requests GET /api/fx/queue',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${fxqAnon.status}`,
      evidence: fxqAnon.data,
      status: fxqAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 2.G: Team T01 receives only T01 pending FX queue items
    const fxqT01 = await apiRequest('GET', '/api/fx/queue', null, teamHeaders('T01'));
    const isOnlyT01Queue = fxqT01.data?.success && Array.isArray(fxqT01.data?.queue) && fxqT01.data.queue.length === 1 && fxqT01.data.queue[0].teamCode === 'T01';
    recordResult({
      id: 'SEC-7.5-02-G',
      category: 'FX Queue Privacy',
      title: 'Team T01 Scoped FX Queue Retrieval',
      scenario: 'Team T01 requests GET /api/fx/queue',
      expected: 'HTTP 200 with strictly T01 pending conversion requests (1 item; zero T02 leakage)',
      actual: `HTTP ${fxqT01.status}, count=${fxqT01.data?.queue?.length}`,
      evidence: fxqT01.data?.queue,
      status: fxqT01.status === 200 && isOnlyT01Queue ? 'PASSED' : 'FAILED'
    });

    // 2.H: Team T01 FX queue query spoofing
    const fxqT01Spoof = await apiRequest('GET', '/api/fx/queue?teamCode=T02', null, teamHeaders('T01'));
    const isStillOnlyT01Queue = fxqT01Spoof.data?.success && Array.isArray(fxqT01Spoof.data?.queue) && fxqT01Spoof.data.queue.length === 1 && fxqT01Spoof.data.queue[0].teamCode === 'T01';
    recordResult({
      id: 'SEC-7.5-02-H',
      category: 'FX Queue Privacy',
      title: 'Team T01 FX Queue Query Spoofing Prevention',
      scenario: 'Team T01 requests GET /api/fx/queue?teamCode=T02',
      expected: 'HTTP 200 with strictly T01 pending conversion requests',
      actual: `HTTP ${fxqT01Spoof.status}, count=${fxqT01Spoof.data?.queue?.length}`,
      evidence: fxqT01Spoof.data?.queue,
      status: fxqT01Spoof.status === 200 && isStillOnlyT01Queue ? 'PASSED' : 'FAILED'
    });

    // 2.I: Unprivileged roles deny-by-default for FX queue
    const fxqJournalist = await apiRequest('GET', '/api/fx/queue', null, roleHeaders('journalist'));
    recordResult({
      id: 'SEC-7.5-02-I',
      category: 'FX Queue Privacy',
      title: 'Unprivileged Roles Deny-By-Default for FX Queue',
      scenario: 'Journalist requests GET /api/fx/queue',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxqJournalist.status}`,
      evidence: fxqJournalist.data,
      status: fxqJournalist.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 2.J: Authorized desk operator receives full FX queue
    const fxqOperator = await apiRequest('GET', '/api/fx/queue', null, roleHeaders('operator_x'));
    const hasAllQueue = fxqOperator.data?.success && Array.isArray(fxqOperator.data?.queue) && fxqOperator.data.queue.length === 2;
    recordResult({
      id: 'SEC-7.5-02-J',
      category: 'FX Queue Privacy',
      title: 'Authorized Operator Global FX Queue Retrieval',
      scenario: 'Exchange desk operator requests GET /api/fx/queue',
      expected: 'HTTP 200 with complete active FX queue (2 items)',
      actual: `HTTP ${fxqOperator.status}, count=${fxqOperator.data?.queue?.length}`,
      evidence: { count: fxqOperator.data?.queue?.length },
      status: fxqOperator.status === 200 && hasAllQueue ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // 3. FINDING 7.4-03: JUDGING & SCORECARD AUTHORIZATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT AREA 3: FINDING 7.4-03 — JUDGING & SCORECARD AUTHORIZATION');
    console.log('======================================================================');

    // 3.A: Anonymous POST /api/judging/scorecard/save
    const judgeAnon = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5
    });
    recordResult({
      id: 'SEC-7.5-03-A',
      category: 'Judging RBAC',
      title: 'Anonymous Scorecard Submission Rejection',
      scenario: 'Unauthenticated caller attempts to save scorecard for T01',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${judgeAnon.status}`,
      evidence: judgeAnon.data,
      status: judgeAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 3.B: Team T01 attempts to score themselves
    const judgeTeam = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5,
      decisionTiming: 5
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-03-B',
      category: 'Judging RBAC',
      title: 'Participant Team Self-Scoring Rejection',
      scenario: 'Team T01 attempts to submit judge scorecard for themselves',
      expected: 'HTTP 403 Forbidden (judging.score required)',
      actual: `HTTP ${judgeTeam.status}`,
      evidence: judgeTeam.data,
      status: judgeTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 3.C: Unauthorized staff (advisor, journalist)
    const judgeAdvisor = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 5
    }, roleHeaders('advisor'));
    recordResult({
      id: 'SEC-7.5-03-C',
      category: 'Judging RBAC',
      title: 'Unauthorized Staff Scorecard Submission Rejection',
      scenario: 'Advisor attempts to submit judge scorecard',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${judgeAdvisor.status}`,
      evidence: judgeAdvisor.data,
      status: judgeAdvisor.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 3.D: Authorized judge saves draft scorecard
    const judgeValid = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 4,
      decisionTiming: 4,
      adaptability: 4,
      riskRecognition: 4,
      forwardPositioning: 4,
      resilience: 4,
      balance: 4,
      adaptCapacity: 4,
      notes: 'Legitimate evaluation by official judge'
    }, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-03-D',
      category: 'Judging RBAC',
      title: 'Authorized Judge Scorecard Submission',
      scenario: 'Authorized judge submits scorecard for team T01',
      expected: 'HTTP 200 with saved scorecard bound to session judge identity',
      actual: `HTTP ${judgeValid.status}, judgeId=${judgeValid.data?.scorecard?.judgeId}`,
      evidence: judgeValid.data?.scorecard,
      status: judgeValid.status === 200 && judgeValid.data?.success && judgeValid.data?.scorecard?.judgeId === 'judge' ? 'PASSED' : 'FAILED'
    });

    // 3.E: Judge-to-judge impersonation attempt
    const judgeImpersonate = await apiRequest('POST', '/api/judging/scorecard/save', {
      judgeId: 'JUDGE_SPOOFED_ID',
      judgeName: 'Spoofed Chief Justice',
      teamCode: 'T01',
      responseToEvents: 5
    }, roleHeaders('judge'));
    const isBoundToSession = judgeImpersonate.data?.scorecard?.judgeId === 'judge' && judgeImpersonate.data?.scorecard?.judgeName === 'judge';
    recordResult({
      id: 'SEC-7.5-03-E',
      category: 'Judging RBAC',
      title: 'Judge Identity Impersonation Prevention',
      scenario: 'Judge attempts to submit body { judgeId: "JUDGE_SPOOFED_ID", judgeName: "Spoofed Chief Justice" }',
      expected: 'HTTP 200 with judge identity bound strictly to session, ignoring caller body',
      actual: `HTTP ${judgeImpersonate.status}, judgeId=${judgeImpersonate.data?.scorecard?.judgeId}`,
      evidence: { judgeId: judgeImpersonate.data?.scorecard?.judgeId, judgeName: judgeImpersonate.data?.scorecard?.judgeName },
      status: judgeImpersonate.status === 200 && isBoundToSession ? 'PASSED' : 'FAILED'
    });

    // 3.F: Malformed rubric scores (>5 or negative)
    const judgeMalformed = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'T01',
      responseToEvents: 100 // invalid: must be 0-5
    }, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-03-F',
      category: 'Judging RBAC',
      title: 'Malformed Rubric Score Rejection',
      scenario: 'Judge attempts to submit score out of 0-5 range (responseToEvents: 100)',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${judgeMalformed.status}`,
      evidence: judgeMalformed.data,
      status: judgeMalformed.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 3.G: Non-existent team scorecard submission
    const judgeNonExistent = await apiRequest('POST', '/api/judging/scorecard/save', {
      teamCode: 'TEAM_DOES_NOT_EXIST',
      responseToEvents: 4
    }, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-03-G',
      category: 'Judging RBAC',
      title: 'Non-Existent Team Scorecard Rejection',
      scenario: 'Judge attempts to submit scorecard for TEAM_DOES_NOT_EXIST',
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${judgeNonExistent.status}`,
      evidence: judgeNonExistent.data,
      status: judgeNonExistent.status === 404 ? 'PASSED' : 'FAILED'
    });

    // 3.H: Anonymous & unauthorized moderation
    const modAnon = await apiRequest('POST', '/api/judging/moderate', { teamCode: 'T01' });
    const modJudge = await apiRequest('POST', '/api/judging/moderate', { teamCode: 'T01', adjustedCard: { responseToEvents: 4 } }, roleHeaders('judge'));
    const modTeam = await apiRequest('POST', '/api/judging/moderate', { teamCode: 'T01' }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-03-H',
      category: 'Judging Moderation',
      title: 'Unauthorized Scorecard Moderation Rejection',
      scenario: 'Anonymous, ordinary Judge, and Team attempt POST /api/judging/moderate',
      expected: 'Anonymous=401, Judge=403, Team=403 (results.approve required)',
      actual: `Anon=${modAnon.status}, Judge=${modJudge.status}, Team=${modTeam.status}`,
      evidence: { anon: modAnon.data, judge: modJudge.data, team: modTeam.data },
      status: modAnon.status === 401 && modJudge.status === 403 && modTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 3.I: Authorized administrator moderation
    const modAdmin = await apiRequest('POST', '/api/judging/moderate', {
      teamCode: 'T01',
      resolutionNotes: 'Official discrepancy resolved by Chief Judge',
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
    }, roleHeaders('admin'));
    recordResult({
      id: 'SEC-7.5-03-I',
      category: 'Judging Moderation',
      title: 'Authorized Administrator Scorecard Moderation',
      scenario: 'Administrator submits official moderation scorecard for T01',
      expected: 'HTTP 200 with moderated scorecard created',
      actual: `HTTP ${modAdmin.status}, isModerated=${modAdmin.data?.moderatedCard?.isModerated}`,
      evidence: modAdmin.data?.moderatedCard,
      status: modAdmin.status === 200 && modAdmin.data?.success && modAdmin.data?.moderatedCard?.isModerated === true ? 'PASSED' : 'FAILED'
    });

    // 3.J: Deliberation scorecards viewing authorization
    const cardsAnon = await apiRequest('GET', '/api/judging/scorecards');
    const cardsTeam = await apiRequest('GET', '/api/judging/scorecards', null, teamHeaders('T01'));
    const cardsJudge = await apiRequest('GET', '/api/judging/scorecards', null, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-03-J',
      category: 'Judging Deliberation Privacy',
      title: 'Unpublished Deliberation Scorecards Viewing Privacy',
      scenario: 'Check GET /api/judging/scorecards before official publication',
      expected: 'Anon=401, Team=403, Judge=200',
      actual: `Anon=${cardsAnon.status}, Team=${cardsTeam.status}, Judge=${cardsJudge.status}`,
      evidence: { anon: cardsAnon.status, team: cardsTeam.status, judge: cardsJudge.status },
      status: cardsAnon.status === 401 && cardsTeam.status === 403 && cardsJudge.status === 200 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // 4. FINDING 7.4-04: CSV REPORT AUTHORIZATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT AREA 4: FINDING 7.4-04 — CSV REPORT AUTHORIZATION');
    console.log('======================================================================');

    // 4.A: Anonymous GET /api/reports/orders/csv
    const repOrdersAnon = await apiRequest('GET', '/api/reports/orders/csv');
    recordResult({
      id: 'SEC-7.5-04-A',
      category: 'Report Authorization',
      title: 'Anonymous Orders CSV Report Export Rejection',
      scenario: 'Unauthenticated caller requests GET /api/reports/orders/csv',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${repOrdersAnon.status}`,
      evidence: repOrdersAnon.data,
      status: repOrdersAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 4.B: Team T01 GET /api/reports/orders/csv
    const repOrdersTeam = await apiRequest('GET', '/api/reports/orders/csv', null, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-04-B',
      category: 'Report Authorization',
      title: 'Participant Team Orders CSV Export Rejection',
      scenario: 'Team T01 requests GET /api/reports/orders/csv',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${repOrdersTeam.status}`,
      evidence: repOrdersTeam.data,
      status: repOrdersTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.C: Unprivileged staff (journalist, judge, advisor)
    const repOrdersJournalist = await apiRequest('GET', '/api/reports/orders/csv', null, roleHeaders('journalist'));
    const repOrdersJudge = await apiRequest('GET', '/api/reports/orders/csv', null, roleHeaders('judge'));
    recordResult({
      id: 'SEC-7.5-04-C',
      category: 'Report Authorization',
      title: 'Unprivileged Staff Orders CSV Export Rejection',
      scenario: 'Journalist and Judge request GET /api/reports/orders/csv',
      expected: 'HTTP 403 Forbidden for non-audit/non-desk roles',
      actual: `Journalist=${repOrdersJournalist.status}, Judge=${repOrdersJudge.status}`,
      evidence: { journalist: repOrdersJournalist.data, judge: repOrdersJudge.data },
      status: repOrdersJournalist.status === 403 && repOrdersJudge.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.D: Authorized desk operator exports orders CSV
    const repOrdersDesk = await apiRequest('GET', '/api/reports/orders/csv', null, roleHeaders('operator_x'));
    const isCsvOrdersDesk = repOrdersDesk.status === 200 && typeof repOrdersDesk.data === 'string' && repOrdersDesk.data.includes('Order ID,Ticket Number,Team Code');
    recordResult({
      id: 'SEC-7.5-04-D',
      category: 'Report Authorization',
      title: 'Authorized Desk Operator Orders CSV Export',
      scenario: 'Exchange desk operator requests GET /api/reports/orders/csv',
      expected: 'HTTP 200 with valid CSV content header and rows',
      actual: `HTTP ${repOrdersDesk.status}, isCsv=${isCsvOrdersDesk}`,
      evidence: { status: repOrdersDesk.status, preview: typeof repOrdersDesk.data === 'string' ? repOrdersDesk.data.slice(0, 100) : repOrdersDesk.data },
      status: isCsvOrdersDesk ? 'PASSED' : 'FAILED'
    });

    // 4.E: Authorized SEBI / Audit exports orders CSV
    const repOrdersSebi = await apiRequest('GET', '/api/reports/orders/csv', null, roleHeaders('sebi'));
    const isCsvOrdersSebi = repOrdersSebi.status === 200 && typeof repOrdersSebi.data === 'string' && repOrdersSebi.data.includes('Order ID,Ticket Number,Team Code');
    recordResult({
      id: 'SEC-7.5-04-E',
      category: 'Report Authorization',
      title: 'SEBI / Audit Orders CSV Export',
      scenario: 'SEBI auditor requests GET /api/reports/orders/csv',
      expected: 'HTTP 200 with valid CSV content',
      actual: `HTTP ${repOrdersSebi.status}, isCsv=${isCsvOrdersSebi}`,
      evidence: { status: repOrdersSebi.status },
      status: isCsvOrdersSebi ? 'PASSED' : 'FAILED'
    });

    // 4.F: Anonymous GET /api/reports/reconciliation/csv
    const repReconAnon = await apiRequest('GET', '/api/reports/reconciliation/csv');
    recordResult({
      id: 'SEC-7.5-04-F',
      category: 'Report Authorization',
      title: 'Anonymous Reconciliation CSV Export Rejection',
      scenario: 'Unauthenticated caller requests GET /api/reports/reconciliation/csv',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${repReconAnon.status}`,
      evidence: repReconAnon.data,
      status: repReconAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 4.G: Team T01 GET /api/reports/reconciliation/csv
    const repReconTeam = await apiRequest('GET', '/api/reports/reconciliation/csv', null, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-04-G',
      category: 'Report Authorization',
      title: 'Participant Team Reconciliation CSV Export Rejection',
      scenario: 'Team T01 requests GET /api/reports/reconciliation/csv',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${repReconTeam.status}`,
      evidence: repReconTeam.data,
      status: repReconTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.H: Desk operator without audit.view GET /api/reports/reconciliation/csv
    const repReconDesk = await apiRequest('GET', '/api/reports/reconciliation/csv', null, roleHeaders('operator_x'));
    recordResult({
      id: 'SEC-7.5-04-H',
      category: 'Report Authorization',
      title: 'Desk Operator (Non-Audit) Reconciliation CSV Export Rejection',
      scenario: 'Exchange desk operator requests GET /api/reports/reconciliation/csv',
      expected: 'HTTP 403 Forbidden (requires audit.view)',
      actual: `HTTP ${repReconDesk.status}`,
      evidence: repReconDesk.data,
      status: repReconDesk.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 4.I: Authorized SEBI auditor exports reconciliation CSV
    const repReconSebi = await apiRequest('GET', '/api/reports/reconciliation/csv', null, roleHeaders('sebi'));
    const isCsvReconSebi = repReconSebi.status === 200 && typeof repReconSebi.data === 'string' && repReconSebi.data.includes('Rank,Team Code,Team Name');
    recordResult({
      id: 'SEC-7.5-04-I',
      category: 'Report Authorization',
      title: 'SEBI / Audit Reconciliation CSV Export',
      scenario: 'SEBI auditor requests GET /api/reports/reconciliation/csv',
      expected: 'HTTP 200 with complete financial reconciliation report',
      actual: `HTTP ${repReconSebi.status}, isCsv=${isCsvReconSebi}`,
      evidence: { status: repReconSebi.status, preview: typeof repReconSebi.data === 'string' ? repReconSebi.data.slice(0, 100) : repReconSebi.data },
      status: isCsvReconSebi ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // 5. FINDING 7.4-05: AUDITORIUM DEBATE & ROUND CONTROLS
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT AREA 5: FINDING 7.4-05 — AUDITORIUM DEBATE & ROUND CONTROLS');
    console.log('======================================================================');

    // 5.A: Anonymous POST /api/bull-bear/debate
    const bbDebateAnon = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Hacked Debate Topic',
      round: 2,
      active: true
    });
    recordResult({
      id: 'SEC-7.5-05-A',
      category: 'Auditorium Controls',
      title: 'Anonymous Auditorium Debate Takeover Rejection',
      scenario: 'Unauthenticated caller attempts POST /api/bull-bear/debate',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${bbDebateAnon.status}`,
      evidence: bbDebateAnon.data,
      status: bbDebateAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 5.B: Team T01 POST /api/bull-bear/debate
    const bbDebateTeam = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Team Hijack Topic',
      round: 2,
      active: true
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-05-B',
      category: 'Auditorium Controls',
      title: 'Participant Team Debate Takeover Rejection',
      scenario: 'Team T01 attempts POST /api/bull-bear/debate to hijack projector display',
      expected: 'HTTP 403 Forbidden (market.control required)',
      actual: `HTTP ${bbDebateTeam.status}`,
      evidence: bbDebateTeam.data,
      status: bbDebateTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 5.C: Unprivileged staff (journalist, judge, advisor)
    const bbDebateJournalist = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'Journalist Hijack Topic',
      round: 2,
      active: true
    }, roleHeaders('journalist'));
    recordResult({
      id: 'SEC-7.5-05-C',
      category: 'Auditorium Controls',
      title: 'Unprivileged Staff Debate Takeover Rejection',
      scenario: 'Journalist attempts POST /api/bull-bear/debate',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${bbDebateJournalist.status}`,
      evidence: bbDebateJournalist.data,
      status: bbDebateJournalist.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 5.D: Authorized coordinator activates debate showdown
    const bbDebateCoord = await apiRequest('POST', '/api/bull-bear/debate', {
      topic: 'AI Megacap Valuations vs Market Fundamentals',
      round: 1,
      active: true
    }, roleHeaders('coordinator'));
    recordResult({
      id: 'SEC-7.5-05-D',
      category: 'Auditorium Controls',
      title: 'Authorized Coordinator Debate Activation',
      scenario: 'Coordinator activates debate showdown on projector stage',
      expected: 'HTTP 200 with debateData initialized and takeoverEvent broadcast',
      actual: `HTTP ${bbDebateCoord.status}, topic=${bbDebateCoord.data?.debateData?.topic}`,
      evidence: bbDebateCoord.data,
      status: bbDebateCoord.status === 200 && bbDebateCoord.data?.success && bbDebateCoord.data?.debateData?.round === 1 ? 'PASSED' : 'FAILED'
    });

    // 5.E: Anonymous POST /api/bull-bear/round
    const bbRoundAnon = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'Unauthenticated Topic'
    });
    recordResult({
      id: 'SEC-7.5-05-E',
      category: 'Auditorium Controls',
      title: 'Anonymous Debate Round Modification Rejection',
      scenario: 'Unauthenticated caller attempts POST /api/bull-bear/round',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${bbRoundAnon.status}`,
      evidence: bbRoundAnon.data,
      status: bbRoundAnon.status === 401 ? 'PASSED' : 'FAILED'
    });

    // 5.F: Team T01 POST /api/bull-bear/round
    const bbRoundTeam = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'Team Modified Topic'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-05-F',
      category: 'Auditorium Controls',
      title: 'Participant Team Debate Round Modification Rejection',
      scenario: 'Team T01 attempts POST /api/bull-bear/round',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${bbRoundTeam.status}`,
      evidence: bbRoundTeam.data,
      status: bbRoundTeam.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 5.G: Authorized coordinator advances debate round
    const bbRoundCoord = await apiRequest('POST', '/api/bull-bear/round', {
      round: 2,
      topic: 'Sovereign Debt & Inflationary Pressures',
      timerSeconds: 240,
      moderatorNotes: 'Round 2 Cross-Examination'
    }, roleHeaders('coordinator'));
    recordResult({
      id: 'SEC-7.5-05-G',
      category: 'Auditorium Controls',
      title: 'Authorized Coordinator Debate Round Management',
      scenario: 'Coordinator advances debate to round 2 with topic and timer',
      expected: 'HTTP 200 with debate round updated',
      actual: `HTTP ${bbRoundCoord.status}, round=${bbRoundCoord.data?.debate?.activeRound}`,
      evidence: bbRoundCoord.data?.debate,
      status: bbRoundCoord.status === 200 && bbRoundCoord.data?.success && bbRoundCoord.data?.debate?.activeRound === 2 ? 'PASSED' : 'FAILED'
    });

    // 5.H: Malformed round payload rejection
    const bbRoundMalformed = await apiRequest('POST', '/api/bull-bear/round', {
      round: -5,
      topic: ''
    }, roleHeaders('coordinator'));
    recordResult({
      id: 'SEC-7.5-05-H',
      category: 'Auditorium Controls',
      title: 'Malformed Debate Round Payload Rejection',
      scenario: 'Coordinator sends malformed payload (empty topic and negative round)',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${bbRoundMalformed.status}`,
      evidence: bbRoundMalformed.data,
      status: bbRoundMalformed.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 5.I: Trailing slash authorization normalization
    const bbDebateTrailing = await apiRequest('POST', '/api/bull-bear/debate/', {
      topic: 'Test Trailing',
      round: 1
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-7.5-05-I',
      category: 'Auditorium Controls',
      title: 'Debate Trailing Slash Route Normalization',
      scenario: 'Team T01 attempts POST /api/bull-bear/debate/ with trailing slash',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${bbDebateTrailing.status}`,
      evidence: bbDebateTrailing.data,
      status: bbDebateTrailing.status === 403 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // 6. LEDGER & NON-MUTATION AUDIT
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT AREA 6: LEDGER & FINANCIAL NON-MUTATION ASSERTIONS');
    console.log('======================================================================');

    // Confirm that the negative tests did NOT corrupt the disposable state
    const postTestFixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const t01Team = postTestFixture.teams.find(t => t.teamCode === 'T01');
    assert.strictEqual(t01Team.cashBalance, 10000000, 'T01 cash balance unexpectedly mutated during test execution!');
    assert.strictEqual(postTestFixture.orders.length, 4, 'Orders array length unexpectedly changed!');
    assert.strictEqual(postTestFixture.fxTransactions.length, 2, 'FX transactions length unexpectedly changed!');
    assert.strictEqual(postTestFixture.fxQueue.length, 2, 'FX queue length unexpectedly changed!');

    recordResult({
      id: 'SEC-7.5-06-A',
      category: 'Ledger Non-Mutation',
      title: 'Financial Ledger & Order Queue Non-Mutation Guarantee',
      scenario: 'Verify cash balances, order slips, and FX queues remained unmutated by test suite attacks',
      expected: 'Strict zero mutation across financial ledger, cash balances, and queues',
      actual: 'Zero mutations observed; T01 cash exactly 10,000,000 INR; order count=4; fxQueue count=2',
      evidence: { cashBalance: t01Team.cashBalance, ordersCount: postTestFixture.orders.length, fxCount: postTestFixture.fxTransactions.length },
      status: 'PASSED'
    });

  } finally {
    // Terminate isolated server process
    console.log('\n--- TERMINATING ISOLATED TEST SERVER ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 800));
    console.log('✓ Isolated test server terminated.');
  }

  // STEP 7: POST-FLIGHT AUTHORITATIVE STATE INTEGRITY VERIFICATION
  console.log('\n--- STEP 7: POST-FLIGHT AUTHORITATIVE STATE INTEGRITY VERIFICATION ---');
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
  console.log(`✓ Test execution audit report saved to: ${path.basename(RESULTS_FILE)}`);
  console.log(`\n======================================================================`);
  console.log(`FINAL RESULTS: ${summary.passed}/${summary.totalScenarios} PASSED (${summary.failed} FAILED)`);
  console.log(`======================================================================\n`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runReleaseGateRemediationSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
