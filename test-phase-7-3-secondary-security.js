import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3099;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase7-3-disposable.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const RESULTS_FILE = path.join(__dirname, 'test-phase-7-3-secondary-security-results.json');

const testResults = [];

function recordResult({ id, category, title, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, category, title, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Scenario: ${scenario}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  console.log(`  Evidence: ${JSON.stringify(evidence)}`);
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

async function runSecondarySecurityAudit() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE 7.3 — SECONDARY AUTHORIZATION REMEDIATION TEST SUITE');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT AUTHORITATIVE STATE INTEGRITY
  console.log('--- STEP 1: VERIFYING AUTHORITATIVE STATE INTEGRITY ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH! STOPPING IMMEDIATELY.');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  // STEP 2: STATE ISOLATION & DISPOSABLE FIXTURE
  console.log('--- STEP 2: ENFORCING READ-ONLY RESTRICTION & CLONING DISPOSABLE FIXTURE ---');
  try {
    fs.chmodSync(ORIGINAL_STATE, 0o444);
    console.log('✓ Marked authoritative state.json as READ-ONLY (0o444).');
  } catch (e) {
    console.warn('Warning: Could not set chmod 0o444 on state.json:', e.message);
  }

  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  fs.chmodSync(DISPOSABLE_STATE, 0o666);
  console.log(`✓ Created disposable test-state fixture: ${path.basename(DISPOSABLE_STATE)}`);

  // Ensure market is open in disposable fixture for FX conversions
  const fixtureData = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixtureData.marketState.status = 'Open';
  fixtureData.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixtureData.marketState.isManualOverride = true;
  if (!fixtureData.fxTransactions) fixtureData.fxTransactions = [];
  if (!fixtureData.fxQueue) fixtureData.fxQueue = [];
  if (!fixtureData.polls) fixtureData.polls = {};
  if (!fixtureData.brokerRecommendations) fixtureData.brokerRecommendations = [];
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixtureData, null, 2), 'utf8');

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

    // Record pre-test T01 wallet balance
    const preTeamRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, teamHeaders('T01'));
    const initialT01Cash = preTeamRes.data?.team?.cashBalance || 10000000;
    const initialT01Wallets = JSON.parse(JSON.stringify(preTeamRes.data?.team?.cashWallets || { INR: 10000000, USD: 0, GBP: 0, EUR: 0 }));

    // ======================================================================
    // SECTION 4: FINDING SEC-NEW-01 — FX ENDPOINTS REMEDIATION
    // ======================================================================
    console.log('======================================================================');
    console.log('📌 AUDIT CATEGORY 1: SEC-NEW-01 — FX WALLET MANIPULATION & DESK RBAC');
    console.log('======================================================================');

    // SEC-NEW-01-01: Participant team attempts direct /api/fx/exchange
    const fxExRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 500000
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-01-01',
      category: 'FX RBAC',
      title: 'Participant Direct /api/fx/exchange Rejection',
      scenario: 'Participant team T01 attempting direct currency exchange execution without exchange desk staff privileges',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxExRes.status} (${fxExRes.data?.error || 'OK'})`,
      evidence: fxExRes.data,
      status: fxExRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-02: Participant team attempts direct /api/fx/convert
    const fxConvRes = await apiRequest('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 500000
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-01-02',
      category: 'FX RBAC',
      title: 'Participant Direct /api/fx/convert Rejection',
      scenario: 'Participant team T01 attempting direct /api/fx/convert conversion without desk privileges',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxConvRes.status} (${fxConvRes.data?.error || 'OK'})`,
      evidence: fxConvRes.data,
      status: fxConvRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-03: Participant team attempts /api/fx/queue-action
    const fxQueueActRes = await apiRequest('POST', '/api/fx/queue-action', {
      requestId: 'REQ_MOCK_01',
      actionType: 'SETTLE'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-01-03',
      category: 'FX RBAC',
      title: 'Participant /api/fx/queue-action Rejection',
      scenario: 'Participant team T01 attempting desk queue action (SETTLE)',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxQueueActRes.status} (${fxQueueActRes.data?.error || 'OK'})`,
      evidence: fxQueueActRes.data,
      status: fxQueueActRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-04: Unauthorized staff (journalist) attempts /api/fx/exchange
    const fxJournRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000
    }, roleHeaders('journalist'));
    recordResult({
      id: 'SEC-NEW-01-04',
      category: 'FX RBAC',
      title: 'Unauthorized Staff Role /api/fx/exchange Rejection',
      scenario: 'Journalist staff role attempting direct FX execution',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxJournRes.status} (${fxJournRes.data?.error || 'OK'})`,
      evidence: fxJournRes.data,
      status: fxJournRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-05: Cross-team FX request spoofing (T02 submitting for T01)
    const fxSpoofRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 200000
    }, teamHeaders('T02'));
    recordResult({
      id: 'SEC-NEW-01-05',
      category: 'FX Ownership',
      title: 'Cross-Team /api/fx/request Spoofing Rejection',
      scenario: 'Team T02 attempting to submit an FX intake slip specifying teamCode: T01',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxSpoofRes.status} (${fxSpoofRes.data?.error || 'OK'})`,
      evidence: fxSpoofRes.data,
      status: fxSpoofRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-06: Trailing slash bypass attempt
    const fxSlashRes = await apiRequest('POST', '/api/fx/exchange/', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 500000
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-01-06',
      category: 'FX RBAC',
      title: 'Trailing Slash /api/fx/exchange/ Rejection',
      scenario: 'Participant team T01 attempting path alias /api/fx/exchange/',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${fxSlashRes.status} (${fxSlashRes.data?.error || 'OK'})`,
      evidence: fxSlashRes.data,
      status: fxSlashRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-07: Unauthenticated attempt
    const fxUnauthRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 500000
    });
    recordResult({
      id: 'SEC-NEW-01-07',
      category: 'FX Auth',
      title: 'Unauthenticated /api/fx/exchange Rejection',
      scenario: 'Anonymous request to /api/fx/exchange without session token or credentials',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${fxUnauthRes.status} (${fxUnauthRes.data?.error || 'OK'})`,
      evidence: fxUnauthRes.data,
      status: fxUnauthRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-08: State non-mutation verification
    const postNegativeTeamRes = await apiRequest('GET', '/api/portfolio?teamCode=T01', null, teamHeaders('T01'));
    const postNegativeCash = postNegativeTeamRes.data?.team?.cashBalance;
    const postNegativeWallets = postNegativeTeamRes.data?.team?.cashWallets;
    const unmutated = (postNegativeCash === initialT01Cash && postNegativeWallets?.INR === initialT01Wallets.INR && (postNegativeWallets?.USD || 0) === 0);
    recordResult({
      id: 'SEC-NEW-01-08',
      category: 'State Integrity',
      title: 'Ledger Non-Mutation Post Rejected FX Requests',
      scenario: 'Verify Team T01 cashWallets and cashBalance remain strictly unmodified after all rejected attempts',
      expected: `INR: ${initialT01Wallets.INR}, USD: 0, Cash: ${initialT01Cash}`,
      actual: `INR: ${postNegativeWallets?.INR}, USD: ${postNegativeWallets?.USD}, Cash: ${postNegativeCash}`,
      evidence: { cashBalance: postNegativeCash, cashWallets: postNegativeWallets },
      status: unmutated ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-09: Authorized legitimate FX Request from Team T01
    const legFxReqRes = await apiRequest('POST', '/api/fx/request', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 50000,
      notes: 'Treasury hedging order'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-01-09',
      category: 'FX Operations',
      title: 'Authorized Team /api/fx/request Submission',
      scenario: 'Team T01 submitting legitimate FX request for their own team',
      expected: 'HTTP 200 OK & Queued',
      actual: `HTTP ${legFxReqRes.status} (Status: ${legFxReqRes.data?.fxRequest?.status})`,
      evidence: legFxReqRes.data,
      status: (legFxReqRes.status === 200 && legFxReqRes.data?.fxRequest?.teamCode === 'T01' && legFxReqRes.data?.fxRequest?.status === 'QUEUED') ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-01-10: Authorized Exchange Desk Operator executing /api/fx/exchange
    const legFxExRes = await apiRequest('POST', '/api/fx/exchange', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      fromAmount: 100000,
      operatorId: 'DESK_OP_01',
      notes: 'Counter-order execution'
    }, roleHeaders('operator_x'));
    const fxTx = legFxExRes.data?.fxTransaction;
    const legFxExPassed = (legFxExRes.status === 200 && fxTx && fxTx.fromAmount === 100000 && fxTx.toAmount > 0 && (fxTx.operatorId === 'operator_x' || fxTx.operatorId === 'exchange'));
    recordResult({
      id: 'SEC-NEW-01-10',
      category: 'FX Operations',
      title: 'Authorized Exchange Desk Execution (/api/fx/exchange)',
      scenario: 'Exchange Operator (operator_x) executing currency exchange for T01 (100,000 INR -> USD)',
      expected: 'HTTP 200 OK, Wallets Debited/Credited, Operator Session Bound',
      actual: `HTTP ${legFxExRes.status} (Debited: ${fxTx?.fromAmount} INR, Credited: ${fxTx?.toAmount} USD, Operator: ${fxTx?.operatorId})`,
      evidence: { fxTransaction: fxTx, cashWallets: legFxExRes.data?.cashWallets },
      status: legFxExPassed ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 5: FINDING SEC-NEW-02 — MARKET POLLING REMEDIATION
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT CATEGORY 2: SEC-NEW-02 — MARKET POLLING RBAC & VOTE BINDING');
    console.log('======================================================================');

    // SEC-NEW-02-01: Participant team attempts /api/polls/create
    const pollCreateTeamRes = await apiRequest('POST', '/api/polls/create', {
      question: 'Will tech rally continue?'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-02-01',
      category: 'Polling RBAC',
      title: 'Participant /api/polls/create Rejection',
      scenario: 'Participant team T01 attempting to create a floor sentiment poll',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${pollCreateTeamRes.status} (${pollCreateTeamRes.data?.error || 'OK'})`,
      evidence: pollCreateTeamRes.data,
      status: pollCreateTeamRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-02: Participant team attempts /api/polls/close
    const pollCloseTeamRes = await apiRequest('POST', '/api/polls/close', {
      pollId: 'POLL_FAKE_01'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-02-02',
      category: 'Polling RBAC',
      title: 'Participant /api/polls/close Rejection',
      scenario: 'Participant team T01 attempting to close a sentiment poll',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${pollCloseTeamRes.status} (${pollCloseTeamRes.data?.error || 'OK'})`,
      evidence: pollCloseTeamRes.data,
      status: pollCloseTeamRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-03: Unauthorized staff (analyst) attempts /api/polls/create
    const pollCreateAnalystRes = await apiRequest('POST', '/api/polls/create', {
      question: 'Will rate cuts happen?'
    }, roleHeaders('analyst'));
    recordResult({
      id: 'SEC-NEW-02-03',
      category: 'Polling RBAC',
      title: 'Unauthorized Staff Role /api/polls/create Rejection',
      scenario: 'Floor Analyst attempting poll creation (requires Coordinator or Admin)',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${pollCreateAnalystRes.status} (${pollCreateAnalystRes.data?.error || 'OK'})`,
      evidence: pollCreateAnalystRes.data,
      status: pollCreateAnalystRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-04: Cross-team vote spoofing (T02 voting for T01)
    const pollVoteSpoofRes = await apiRequest('POST', '/api/polls/vote', {
      pollId: 'POLL_MOCK_99',
      teamCode: 'T01',
      optionId: 0
    }, teamHeaders('T02'));
    recordResult({
      id: 'SEC-NEW-02-04',
      category: 'Polling Identity',
      title: 'Cross-Team /api/polls/vote Spoofing Rejection',
      scenario: 'Team T02 attempting to cast a vote with body teamCode: T01',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${pollVoteSpoofRes.status} (${pollVoteSpoofRes.data?.error || 'OK'})`,
      evidence: pollVoteSpoofRes.data,
      status: pollVoteSpoofRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-05: Trailing slash attempt on poll creation
    const pollSlashRes = await apiRequest('POST', '/api/polls/create/', {
      question: 'Test Slash Poll'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-02-05',
      category: 'Polling RBAC',
      title: 'Trailing Slash /api/polls/create/ Rejection',
      scenario: 'Participant team T01 attempting path alias /api/polls/create/',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${pollSlashRes.status} (${pollSlashRes.data?.error || 'OK'})`,
      evidence: pollSlashRes.data,
      status: pollSlashRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-06: Unauthenticated poll creation attempt
    const pollUnauthRes = await apiRequest('POST', '/api/polls/create', {
      question: 'Unauthenticated poll'
    });
    recordResult({
      id: 'SEC-NEW-02-06',
      category: 'Polling Auth',
      title: 'Unauthenticated /api/polls/create Rejection',
      scenario: 'Anonymous request to /api/polls/create without authentication',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${pollUnauthRes.status} (${pollUnauthRes.data?.error || 'OK'})`,
      evidence: pollUnauthRes.data,
      status: pollUnauthRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-07: Legitimate Poll Creation by Floor Coordinator
    const legPollCreateRes = await apiRequest('POST', '/api/polls/create', {
      question: 'Will Nifty reach 26,000 this session?',
      options: ['Bullish 🐂', 'Bearish 🐻', 'Sideways ⚖️'],
      durationSeconds: 300
    }, roleHeaders('coordinator'));
    const createdPoll = legPollCreateRes.data?.poll;
    const pollCreatedOk = (legPollCreateRes.status === 200 && createdPoll && createdPoll.status === 'OPEN');
    recordResult({
      id: 'SEC-NEW-02-07',
      category: 'Polling Operations',
      title: 'Authorized Floor Coordinator /api/polls/create',
      scenario: 'Floor Coordinator successfully creating market sentiment poll',
      expected: 'HTTP 200 OK & Status OPEN',
      actual: `HTTP ${legPollCreateRes.status} (Poll ID: ${createdPoll?.id}, Status: ${createdPoll?.status})`,
      evidence: createdPoll,
      status: pollCreatedOk ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-08: Legitimate Vote by Team T01
    const legVoteRes = await apiRequest('POST', '/api/polls/vote', {
      pollId: createdPoll?.id,
      teamCode: 'T01',
      optionId: 0
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-02-08',
      category: 'Polling Operations',
      title: 'Authorized Participant /api/polls/vote Submission',
      scenario: 'Team T01 legitimately casting vote for option 0 in active poll',
      expected: 'HTTP 200 OK',
      actual: `HTTP ${legVoteRes.status}`,
      evidence: legVoteRes.data,
      status: legVoteRes.status === 200 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-09: Duplicate Vote Rejection for Team T01
    const dupVoteRes = await apiRequest('POST', '/api/polls/vote', {
      pollId: createdPoll?.id,
      teamCode: 'T01',
      optionId: 1
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-02-09',
      category: 'Polling Operations',
      title: 'Duplicate Poll Vote Rejection',
      scenario: 'Team T01 attempting to vote a second time in the same active poll',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${dupVoteRes.status} (${dupVoteRes.data?.error || 'OK'})`,
      evidence: dupVoteRes.data,
      status: dupVoteRes.status === 400 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-02-10: Legitimate Poll Closure by Coordinator
    const legCloseRes = await apiRequest('POST', '/api/polls/close', {
      pollId: createdPoll?.id
    }, roleHeaders('coordinator'));
    recordResult({
      id: 'SEC-NEW-02-10',
      category: 'Polling Operations',
      title: 'Authorized Floor Coordinator /api/polls/close',
      scenario: 'Floor Coordinator closing the active poll',
      expected: 'HTTP 200 OK',
      actual: `HTTP ${legCloseRes.status}`,
      evidence: legCloseRes.data,
      status: legCloseRes.status === 200 ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // SECTION 6: FINDING SEC-NEW-03 — BROKER RECOMMENDATIONS & BULLETINS
    // ======================================================================
    console.log('\n======================================================================');
    console.log('📌 AUDIT CATEGORY 3: SEC-NEW-03 — BROKER ADVISORY & BULLETIN RBAC');
    console.log('======================================================================');

    // SEC-NEW-03-01: Participant team attempts /api/broker/recommendation
    const recTeamRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'RELIANCE',
      recommendation: 'STRONG_BUY',
      confidence: 90
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-03-01',
      category: 'Broker RBAC',
      title: 'Participant /api/broker/recommendation Rejection',
      scenario: 'Participant team T01 attempting to publish a broker advisory recommendation',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${recTeamRes.status} (${recTeamRes.data?.error || 'OK'})`,
      evidence: recTeamRes.data,
      status: recTeamRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-02: Participant team attempts /api/broker/bulletin
    const bullTeamRes = await apiRequest('POST', '/api/broker/bulletin', {
      headline: 'Rally incoming',
      body: 'All teams buy now.'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-03-02',
      category: 'Broker RBAC',
      title: 'Participant /api/broker/bulletin Rejection',
      scenario: 'Participant team T01 attempting to publish a broker advisory bulletin',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${bullTeamRes.status} (${bullTeamRes.data?.error || 'OK'})`,
      evidence: bullTeamRes.data,
      status: bullTeamRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-03: Unauthorized staff (journalist) attempts /api/broker/recommendation
    const recJournRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'TCS',
      recommendation: 'HOLD'
    }, roleHeaders('journalist'));
    recordResult({
      id: 'SEC-NEW-03-03',
      category: 'Broker RBAC',
      title: 'Unauthorized Staff Role /api/broker/recommendation Rejection',
      scenario: 'Journalist staff role attempting to publish broker recommendation',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${recJournRes.status} (${recJournRes.data?.error || 'OK'})`,
      evidence: recJournRes.data,
      status: recJournRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-04: Unauthorized staff (exchange operator) attempts /api/broker/bulletin
    const bullExRes = await apiRequest('POST', '/api/broker/bulletin', {
      headline: 'Exchange Commentary',
      body: 'Floor status bulletin.'
    }, roleHeaders('operator_x'));
    recordResult({
      id: 'SEC-NEW-03-04',
      category: 'Broker RBAC',
      title: 'Unauthorized Staff Role /api/broker/bulletin Rejection',
      scenario: 'Exchange Operator attempting to publish broker bulletin',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${bullExRes.status} (${bullExRes.data?.error || 'OK'})`,
      evidence: bullExRes.data,
      status: bullExRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-05: Trailing slash attempt on recommendation
    const recSlashRes = await apiRequest('POST', '/api/broker/recommendation/', {
      ticker: 'INFY',
      recommendation: 'BUY'
    }, teamHeaders('T01'));
    recordResult({
      id: 'SEC-NEW-03-05',
      category: 'Broker RBAC',
      title: 'Trailing Slash /api/broker/recommendation/ Rejection',
      scenario: 'Participant team T01 attempting path alias /api/broker/recommendation/',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${recSlashRes.status} (${recSlashRes.data?.error || 'OK'})`,
      evidence: recSlashRes.data,
      status: recSlashRes.status === 403 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-06: Unauthenticated recommendation attempt
    const recUnauthRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'INFY',
      recommendation: 'BUY'
    });
    recordResult({
      id: 'SEC-NEW-03-06',
      category: 'Broker Auth',
      title: 'Unauthenticated /api/broker/recommendation Rejection',
      scenario: 'Anonymous request to /api/broker/recommendation without authentication',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${recUnauthRes.status} (${recUnauthRes.data?.error || 'OK'})`,
      evidence: recUnauthRes.data,
      status: recUnauthRes.status === 401 ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-07: Legitimate Broker Recommendation by Floor Advisor
    const legRecRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'TCS',
      recommendation: 'ACCUMULATE',
      confidence: 88,
      reasoning: 'Strong quarterly order pipeline and stable cloud margins.',
      riskLevel: 'LOW',
      timeframe: 'MEDIUM'
    }, roleHeaders('advisor'));
    const recData = legRecRes.data?.recommendation;
    const recOk = (legRecRes.status === 200 && recData && recData.ticker === 'TCS' && recData.brokerName === 'advisor');
    recordResult({
      id: 'SEC-NEW-03-07',
      category: 'Broker Operations',
      title: 'Authorized Advisor /api/broker/recommendation Publication',
      scenario: 'Floor Advisor legitimately publishing stock recommendation with session identity binding',
      expected: 'HTTP 200 OK & Author Bound to Session',
      actual: `HTTP ${legRecRes.status} (Ticker: ${recData?.ticker}, Broker: ${recData?.brokerName})`,
      evidence: recData,
      status: recOk ? 'PASSED' : 'FAILED'
    });

    // SEC-NEW-03-08: Legitimate Broker Bulletin by Floor Advisor
    const legBullRes = await apiRequest('POST', '/api/broker/bulletin', {
      advisorId: 'DOMESTIC',
      headline: 'IT Sector Momentum Call',
      body: 'Midcap and largecap IT services exhibit favorable risk-reward setups.',
      relatedTickers: ['TCS', 'INFY'],
      relatedSectors: ['Information Technology'],
      opinionType: 'BULLISH'
    }, roleHeaders('advisor'));
    const bullData = legBullRes.data?.bulletin;
    const bullOk = (legBullRes.status === 200 && bullData && bullData.headline === 'IT Sector Momentum Call' && bullData.author === 'advisor');
    recordResult({
      id: 'SEC-NEW-03-08',
      category: 'Broker Operations',
      title: 'Authorized Advisor /api/broker/bulletin Publication',
      scenario: 'Floor Advisor legitimately publishing research bulletin with session identity binding',
      expected: 'HTTP 200 OK & Author Bound to Session',
      actual: `HTTP ${legBullRes.status} (Headline: ${bullData?.headline}, Author: ${bullData?.author})`,
      evidence: bullData,
      status: bullOk ? 'PASSED' : 'FAILED'
    });

  } finally {
    // STEP 4: CLEANUP & POST-FLIGHT INTEGRITY
    console.log('\n--- STEP 4: TEARDOWN & POST-FLIGHT INTEGRITY CHECK ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 600));

    // Remove disposable fixture
    try {
      if (fs.existsSync(DISPOSABLE_STATE)) {
        fs.unlinkSync(DISPOSABLE_STATE);
        console.log(`✓ Cleaned up disposable fixture: ${path.basename(DISPOSABLE_STATE)}`);
      }
    } catch (e) {
      console.warn('Warning: Could not remove disposable fixture:', e.message);
    }

    // Verify authoritative state hash
    const finalHash = getSha256(ORIGINAL_STATE);
    console.log(`Post-flight authoritative state.json SHA-256: ${finalHash}`);
    assert.strictEqual(finalHash, EXPECTED_HASH, 'CRITICAL ALARM: Authoritative state.json hash was modified!');
    console.log('✓ Authoritative state.json confirmed strictly untouched and bit-identical.\n');
  }

  // STEP 5: SAVE RESULTS SUMMARY
  const summary = {
    testDate: new Date().toISOString(),
    suite: 'SAAMX Phase 7.3 Secondary Authorization & Identity Enforcement',
    totalTests: testResults.length,
    passed: testResults.filter(t => t.status === 'PASSED').length,
    failed: testResults.filter(t => t.status === 'FAILED').length,
    results: testResults
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`======================================================================`);
  console.log(`📊 TEST SUITE SUMMARY: ${summary.passed}/${summary.totalTests} PASSED, ${summary.failed} FAILED`);
  console.log(`Results saved to: ${path.basename(RESULTS_FILE)}`);
  console.log(`======================================================================\n`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runSecondarySecurityAudit().catch(err => {
  console.error('\n❌ Unhandled error in test suite:', err);
  process.exit(1);
});
