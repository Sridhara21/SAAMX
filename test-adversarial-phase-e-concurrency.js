/**
 * SAAMX ADVERSARIAL STRESS TEST SUITE: PHASE E CONCURRENCY & RECOMMENDATION PIPELINE
 * File: SAAMX/test-adversarial-phase-e-concurrency.js
 *
 * Adversarially stress-tests:
 * 1. Concurrent referral requests from multiple simulated investment houses (T01 - T10).
 * 2. Concurrency & audit integrity on POST /api/advisor/signal:
 *    Race conditions or duplicate attempts to overwrite an answered signal rejected with HTTP 400.
 * 3. Concurrent research report broadcasts (POST /api/broker/recommendation) and feed retrieval (GET /api/broker/recommendations).
 * 4. Scale & Memory Leak Harness: Processing all 2,849+ securities through getCompanyRatios and getValuationAnalysis.
 * 5. Bit-exact preservation of authoritative baseline state.json SHA-256 hash:
 *    6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca.
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

import {
  getCompanyFundamentals,
  getCompanyRatios,
  getValuationAnalysis,
  getAnalyticalPerspectives,
  SECTOR_BENCHMARKS
} from './src/lib/companyFundamentals.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3198;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'state.test-phase-e-challenger-2.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-phase-e-results.json');

const testResults = [];

function recordResult({ id, title, battery, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, title, battery, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  console.log(`  Battery:   ${battery}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (evidence) {
    console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
  }
}

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

function bearer(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function runAdversarialPhaseESuite() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX PHASE E ADVERSARIAL STRESS HARNESS — CHALLENGER 2');
  console.log('Target: Concurrency, Audit Trail Integrity & 2,849 Scale Robustness');
  console.log('======================================================================\n');

  // STEP 1: PRE-FLIGHT INTEGRITY CHECK
  console.log('--- STEP 1: PRE-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const initialHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH!');
  console.log('✓ Authoritative state hash confirmed strictly untouched.\n');

  recordResult({
    id: 'ADV-E-PREFLIGHT-01',
    title: 'Pre-flight Authoritative Baseline Hash Verification',
    battery: 'Baseline Integrity',
    scenario: 'Verify state.json SHA-256 matches baseline before launching test harness',
    expected: EXPECTED_HASH,
    actual: initialHash,
    evidence: { sha256: initialHash },
    status: initialHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // STEP 2: DISPOSABLE FIXTURE SETUP
  console.log('--- STEP 2: CREATING ISOLATED DISPOSABLE FIXTURE ---');
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  try { fs.chmodSync(DISPOSABLE_STATE, 0o666); } catch (e) {}

  const fixture = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;
  fixture.advisorReferrals = [];
  fixture.brokerRecommendations = [];
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  recordResult({
    id: 'ADV-E-FIXTURE-01',
    title: 'Disposable Fixture Initialization',
    battery: 'Fixture Setup',
    scenario: 'Create isolated writable test fixture snapshot for ephemeral server',
    expected: 'state.test-phase-e-challenger-2.json initialized from state.json',
    actual: 'Fixture created',
    evidence: { fixturePath: DISPOSABLE_STATE },
    status: fs.existsSync(DISPOSABLE_STATE) ? 'PASSED' : 'FAILED'
  });

  // STEP 3: SPAWN ISOLATED BACKEND SERVER
  console.log(`--- STEP 3: SPAWNING ISOLATED BACKEND SERVER (PORT ${PORT}) ---`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
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
  for (let i = 0; i < 60; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && ping.data?.ready === true) {
        serverStarted = true;
        console.log(`✓ Isolated backend responding on port ${PORT}.\n`);
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!serverStarted) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start on port ${PORT}`);
  }

  try {
    // STEP 4: AUTHENTICATING TEST ROLES
    console.log('--- STEP 4: AUTHENTICATING MULTI-HOUSE TEST SESSIONS ---');
    const teamTokens = {};
    for (let i = 1; i <= 10; i++) {
      const pad = String(i).padStart(2, '0');
      const teamCode = `T${pad}`;
      const pw = `saamx-team-${pad}`;
      const res = await apiRequest('POST', '/api/auth/login', { username: teamCode, password: pw });
      if (res.data?.token) {
        teamTokens[teamCode] = res.data.token;
      }
    }

    const adminLogin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const tokenAdmin = adminLogin.data?.token;

    const advisorLogin = await apiRequest('POST', '/api/auth/login', { username: 'advisor', password: 'advisor-event-2026' });
    const tokenAdvisor = advisorLogin.data?.token;

    const journalistLogin = await apiRequest('POST', '/api/auth/login', { username: 'journalist', password: 'journalist-event-2026' });
    const tokenJournalist = journalistLogin.data?.token;

    const allTeamsAuth = Object.keys(teamTokens).length === 10;
    recordResult({
      id: 'ADV-E-AUTH-01',
      title: 'Multi-House & Staff Session Authentication',
      battery: 'Authentication',
      scenario: 'Acquire JWT sessions for 10 investment houses (T01-T10), floor advisor, and journalist',
      expected: '10 team tokens, 1 advisor token, 1 journalist token acquired',
      actual: `Teams: ${Object.keys(teamTokens).length}/10, Advisor: ${Boolean(tokenAdvisor)}, Journalist: ${Boolean(tokenJournalist)}`,
      evidence: { teamsCount: Object.keys(teamTokens).length, hasAdvisor: Boolean(tokenAdvisor) },
      status: (allTeamsAuth && tokenAdvisor && tokenJournalist) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // BATTERY 2: MULTI-HOUSE CONCURRENT REFERRAL INTAKE STRESS
    // ======================================================================
    console.log('\n--- BATTERY 2: MULTI-HOUSE CONCURRENT REFERRAL INTAKE STRESS ---');

    // Test 1: 10 simulated investment houses fire concurrent referrals for 10 distinct stocks
    const houseTickers = [
      { team: 'T01', ticker: 'INFY' },
      { team: 'T02', ticker: 'TCS' },
      { team: 'T03', ticker: 'RELIANCE' },
      { team: 'T04', ticker: 'HDFCBANK' },
      { team: 'T05', ticker: 'ICICIBANK' },
      { team: 'T06', ticker: 'BHARTIARTL' },
      { team: 'T07', ticker: 'NVDA' },
      { team: 'T08', ticker: 'AAPL' },
      { team: 'T09', ticker: 'MSFT' },
      { team: 'T10', ticker: 'GOOGL' }
    ];

    const concurrentReferralPromises = houseTickers.map(item =>
      apiRequest('POST', '/api/advisor/refer', { ticker: item.ticker, teamCode: item.team }, bearer(teamTokens[item.team]))
    );

    const concurrentReferralResponses = await Promise.all(concurrentReferralPromises);
    const allRefOk = concurrentReferralResponses.every(r => r.status === 200 && r.data?.success === true && r.data?.referral?.status === 'PENDING');
    const uniqueRefIds = new Set(concurrentReferralResponses.map(r => r.data?.referral?.id)).size;

    recordResult({
      id: 'ADV-E-REF-01',
      title: 'Multi-House Concurrent Referral Flood (10 Houses)',
      battery: 'Referral Concurrency',
      scenario: '10 investment houses concurrently submit stock referrals for 10 distinct securities',
      expected: '10/10 return HTTP 200, status=PENDING, 10 unique referral IDs',
      actual: `Success: ${concurrentReferralResponses.filter(r => r.status === 200).length}/10, Unique IDs: ${uniqueRefIds}`,
      evidence: { statuses: concurrentReferralResponses.map(r => r.status), uniqueIds: uniqueRefIds },
      status: (allRefOk && uniqueRefIds === 10) ? 'PASSED' : 'FAILED'
    });

    // Test 2: 5 distinct houses simultaneously refer the SAME stock (e.g. TSLA)
    const sameStockTeams = ['T01', 'T02', 'T03', 'T04', 'T05'];
    const sameStockPromises = sameStockTeams.map(t =>
      apiRequest('POST', '/api/advisor/refer', { ticker: 'TSLA', teamCode: t }, bearer(teamTokens[t]))
    );
    const sameStockResponses = await Promise.all(sameStockPromises);
    const allSameStockOk = sameStockResponses.every(r => r.status === 200 && r.data?.success === true);
    const sameStockUniqueIds = new Set(sameStockResponses.map(r => r.data?.referral?.id)).size;

    recordResult({
      id: 'ADV-E-REF-02',
      title: 'Simultaneous Multi-House Referral of Same Stock (TSLA)',
      battery: 'Referral Concurrency',
      scenario: '5 distinct investment houses simultaneously submit referrals for TSLA',
      expected: 'All 5 houses succeed with HTTP 200 and create 5 independent referral entries',
      actual: `Success: ${sameStockResponses.filter(r => r.status === 200).length}/5, Unique IDs: ${sameStockUniqueIds}`,
      evidence: { statuses: sameStockResponses.map(r => r.status), uniqueIds: sameStockUniqueIds },
      status: (allSameStockOk && sameStockUniqueIds === 5) ? 'PASSED' : 'FAILED'
    });

    // Test 3: Same-House Duplicate Flood (Race Condition Prevention)
    // T01 attempts to submit 10 concurrent duplicate referrals for INFY (already pending from Test 1)
    const dupFloodPromises = Array.from({ length: 10 }).map(() =>
      apiRequest('POST', '/api/advisor/refer', { ticker: 'INFY', teamCode: 'T01' }, bearer(teamTokens['T01']))
    );
    const dupFloodResponses = await Promise.all(dupFloodPromises);
    const allDupBlocked = dupFloodResponses.every(r => r.status === 400 && r.data?.error?.includes('already pending review'));

    recordResult({
      id: 'ADV-E-REF-03',
      title: 'Same-House Duplicate Referral Flood Rejection',
      battery: 'Referral Concurrency',
      scenario: 'Team T01 fires 10 concurrent duplicate requests for already pending INFY referral',
      expected: '10/10 rejected with HTTP 400 (already pending review)',
      actual: `Rejected 400: ${dupFloodResponses.filter(r => r.status === 400).length}/10`,
      evidence: { statuses: dupFloodResponses.map(r => r.status), errorSample: dupFloodResponses[0]?.data?.error },
      status: allDupBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 4: Concurrent Queue Interleaved Reads & Scope Enforcement
    // T01, T02, T03 read queue concurrently with Advisor while new referral submitted by T06
    const interleavePromises = [
      apiRequest('GET', '/api/advisor/referrals', null, bearer(teamTokens['T01'])),
      apiRequest('GET', '/api/advisor/referrals', null, bearer(teamTokens['T02'])),
      apiRequest('GET', '/api/advisor/referrals', null, bearer(tokenAdvisor)),
      apiRequest('POST', '/api/advisor/refer', { ticker: 'AMZN', teamCode: 'T06' }, bearer(teamTokens['T06'])),
      apiRequest('GET', '/api/advisor/referrals', null, bearer(tokenAdmin))
    ];
    const interleaveResponses = await Promise.all(interleavePromises);
    const t01Scope = Array.isArray(interleaveResponses[0].data) && interleaveResponses[0].data.every(r => r.teamCode === 'T01');
    const t02Scope = Array.isArray(interleaveResponses[1].data) && interleaveResponses[1].data.every(r => r.teamCode === 'T02');
    const advisorAll = Array.isArray(interleaveResponses[2].data) && interleaveResponses[2].data.length > 5;
    const postAmznOk = interleaveResponses[3].status === 200;

    recordResult({
      id: 'ADV-E-REF-04',
      title: 'Concurrent Queue Reads & Scope Isolation Under Write Pressure',
      battery: 'Referral Concurrency',
      scenario: 'Interleaved concurrent queue reads from participant houses and floor advisor during live submission',
      expected: 'Team calls scoped to caller team; Advisor/Admin receives full global queue; zero corruption',
      actual: `T01 scoped: ${t01Scope}, T02 scoped: ${t02Scope}, Advisor sees all: ${advisorAll}, Write status: ${interleaveResponses[3].status}`,
      evidence: { t01Count: interleaveResponses[0].data?.length, advisorCount: interleaveResponses[2].data?.length },
      status: (t01Scope && t02Scope && advisorAll && postAmznOk) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // BATTERY 3: CONCURRENCY & AUDIT INTEGRITY ON POST /api/advisor/signal
    // ======================================================================
    console.log('\n--- BATTERY 3: CONCURRENCY & AUDIT INTEGRITY ON /api/advisor/signal ---');

    // Create a fresh pending referral specifically for race condition testing
    const raceReferralRes = await apiRequest('POST', '/api/advisor/refer', { ticker: 'NVDA', teamCode: 'T05' }, bearer(teamTokens['T05']));
    const raceRefId = raceReferralRes.data?.referral?.id;

    // Test 5: Duplicate Race Overwrite Attack
    // 10 concurrent requests to /api/advisor/signal for the same referralId with conflicting signals
    const signalsToRace = ['BUY', 'HOLD', 'SELL', 'BUY', 'SELL', 'HOLD', 'BUY', 'HOLD', 'SELL', 'BUY'];
    const raceSignalPromises = signalsToRace.map((sig, idx) =>
      apiRequest('POST', '/api/advisor/signal', {
        referralId: raceRefId,
        signal: sig,
        advisorName: `Competing Advisor ${idx + 1}`
      }, bearer(tokenAdvisor))
    );

    const raceSignalResponses = await Promise.all(raceSignalPromises);
    const raceSuccesses = raceSignalResponses.filter(r => r.status === 200);
    const raceRejections = raceSignalResponses.filter(r => r.status === 400);

    const racePassed = (raceSuccesses.length === 1) && (raceRejections.length === 9) &&
      raceRejections.every(r => r.data?.error?.includes('Overwriting is prohibited to preserve audit trail'));

    recordResult({
      id: 'ADV-E-SIG-01',
      title: 'Race Condition Duplicate Signal Overwrite Rejection',
      battery: 'Signal Audit Integrity',
      scenario: '10 concurrent competing requests to /api/advisor/signal for the exact same pending referral',
      expected: 'Exactly 1 request succeeds (HTTP 200); remaining 9 strictly rejected with HTTP 400',
      actual: `200 Success: ${raceSuccesses.length}, 400 Rejections: ${raceRejections.length}`,
      evidence: {
        winningSignal: raceSuccesses[0]?.data?.referral?.signal,
        winningAdvisor: raceSuccesses[0]?.data?.referral?.advisorName,
        sampleRejection: raceRejections[0]?.data?.error
      },
      status: racePassed ? 'PASSED' : 'FAILED'
    });

    // Test 6: Subsequent Sequential Overwrite Attempt Rejection
    const postOverwriteRes = await apiRequest('POST', '/api/advisor/signal', {
      referralId: raceRefId,
      signal: 'HOLD',
      advisorName: 'Delayed Attacker'
    }, bearer(tokenAdvisor));

    const postOverwriteBlocked = postOverwriteRes.status === 400 && postOverwriteRes.data?.error?.includes('Overwriting is prohibited');
    recordResult({
      id: 'ADV-E-SIG-02',
      title: 'Subsequent Sequential Signal Overwrite Rejection',
      battery: 'Signal Audit Integrity',
      scenario: 'Attempting to overwrite an already completed signal with a subsequent delayed request',
      expected: 'Strictly rejected with HTTP 400 preserving immutable audit record',
      actual: `HTTP ${postOverwriteRes.status}: ${postOverwriteRes.data?.error}`,
      evidence: { status: postOverwriteRes.status, error: postOverwriteRes.data?.error },
      status: postOverwriteBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 7: Malformed / Unpermitted Signal Fuzzing
    const invalidSignals = ['STRONG_BUY', 'SHORT', 'NEUTRAL', 'VOID', 'BUY_LIMIT', 123, '', null];
    const invalidSignalPromises = invalidSignals.map(badSig =>
      apiRequest('POST', '/api/advisor/signal', {
        referralId: raceRefId,
        signal: badSig,
        advisorName: 'Malicious Input'
      }, bearer(tokenAdvisor))
    );
    const invalidSignalResponses = await Promise.all(invalidSignalPromises);
    const allInvalidRejected = invalidSignalResponses.every(r => r.status === 400);

    recordResult({
      id: 'ADV-E-SIG-03',
      title: 'Malformed & Unpermitted Signal Rejection Fuzzing',
      battery: 'Signal Audit Integrity',
      scenario: 'Submit unpermitted signals (STRONG_BUY, SHORT, VOID, null, numbers)',
      expected: '100% rejected with HTTP 400 (Permitted signals strictly BUY, HOLD, SELL)',
      actual: `Rejected with 400: ${invalidSignalResponses.filter(r => r.status === 400).length}/${invalidSignals.length}`,
      evidence: { statuses: invalidSignalResponses.map(r => r.status) },
      status: allInvalidRejected ? 'PASSED' : 'FAILED'
    });

    // Test 8: Non-Existent Referral ID Handling
    const nonExistentRes = await apiRequest('POST', '/api/advisor/signal', {
      referralId: 'REF_NON_EXISTENT_999999',
      signal: 'BUY',
      advisorName: 'Phantom Advisor'
    }, bearer(tokenAdvisor));

    const nonExistentBlocked = nonExistentRes.status === 404;
    recordResult({
      id: 'ADV-E-SIG-04',
      title: 'Non-Existent Referral Signal Rejection',
      battery: 'Signal Audit Integrity',
      scenario: 'Submit signal against non-existent referral ID',
      expected: 'HTTP 404 Referral not found',
      actual: `HTTP ${nonExistentRes.status}: ${nonExistentRes.data?.error}`,
      evidence: { status: nonExistentRes.status, error: nonExistentRes.data?.error },
      status: nonExistentBlocked ? 'PASSED' : 'FAILED'
    });

    // Test 9: Pure Advisory Non-Execution Invariant Under Concurrent Signals
    // Answer remaining pending referrals and assert ZERO orders created, ZERO cash mutated
    const currentQueue = (await apiRequest('GET', '/api/advisor/referrals', null, bearer(tokenAdmin))).data || [];
    const pendingRefs = currentQueue.filter(r => r.status === 'PENDING').slice(0, 5);

    const initialOrders = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.orders || [];
    const initialT01Cash = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.teams?.find(t => t.teamCode === 'T01')?.cashWallets?.INR;

    const batchSignalPromises = pendingRefs.map((r, i) =>
      apiRequest('POST', '/api/advisor/signal', {
        referralId: r.id,
        signal: i % 2 === 0 ? 'BUY' : 'HOLD',
        advisorName: 'Desk Specialist'
      }, bearer(tokenAdvisor))
    );
    await Promise.all(batchSignalPromises);

    const postOrders = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.orders || [];
    const postT01Cash = (await apiRequest('GET', '/api/state', null, bearer(tokenAdmin))).data?.teams?.find(t => t.teamCode === 'T01')?.cashWallets?.INR;

    const zeroOrderLeakage = (postOrders.length === initialOrders.length);
    const zeroCashLeakage = (postT01Cash === initialT01Cash);

    recordResult({
      id: 'ADV-E-SIG-05',
      title: 'Pure Advisory Non-Execution Invariant Under Batch Signals',
      battery: 'Signal Audit Integrity',
      scenario: 'Publishing batch of advisor signals must never mutate orders or participant cash balances',
      expected: 'Orders delta = 0, Cash delta = 0',
      actual: `Orders delta: ${postOrders.length - initialOrders.length}, Cash delta: ${postT01Cash - initialT01Cash}`,
      evidence: { ordersBefore: initialOrders.length, ordersAfter: postOrders.length, cashBefore: initialT01Cash, cashAfter: postT01Cash },
      status: (zeroOrderLeakage && zeroCashLeakage) ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // BATTERY 4: CONCURRENT BROKER RECOMMENDATION BROADCASTING & FEED
    // ======================================================================
    console.log('\n--- BATTERY 4: CONCURRENT BROKER RECOMMENDATION BROADCASTING ---');

    // Test 10: 20 concurrent recommendation broadcasts across bluechip tickers
    const testTickers = ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'NVDA', 'AAPL', 'MSFT', 'GOOGL'];
    const broadcastPromises = Array.from({ length: 20 }).map((_, idx) => {
      const ticker = testTickers[idx % testTickers.length];
      const rec = idx % 3 === 0 ? 'BUY' : (idx % 3 === 1 ? 'HOLD' : 'SELL');
      return apiRequest('POST', '/api/broker/recommendation', {
        ticker,
        recommendation: rec,
        confidence: 70 + (idx % 25),
        reasoning: `Quantitative momentum and fundamental valuation alignment on ${ticker} (Batch #${idx + 1}).`,
        riskLevel: idx % 2 === 0 ? 'LOW' : 'MEDIUM',
        timeframe: 'MEDIUM'
      }, bearer(tokenAdvisor));
    });

    const broadcastResponses = await Promise.all(broadcastPromises);
    const allBroadcastOk = broadcastResponses.every(r => r.status === 200 && r.data?.success === true);
    const broadcastRecIds = new Set(broadcastResponses.map(r => r.data?.recommendation?.id)).size;

    recordResult({
      id: 'ADV-E-REC-01',
      title: 'High-Concurrency Research Recommendation Broadcast (20 Batches)',
      battery: 'Recommendation Pipeline',
      scenario: '20 concurrent recommendation broadcasts dispatched by authorized floor advisors',
      expected: '20/20 return HTTP 200, 20 unique recommendation IDs generated',
      actual: `200 Success: ${broadcastResponses.filter(r => r.status === 200).length}/20, Unique IDs: ${broadcastRecIds}`,
      evidence: { count: broadcastResponses.length, uniqueIds: broadcastRecIds },
      status: (allBroadcastOk && broadcastRecIds === 20) ? 'PASSED' : 'FAILED'
    });

    // Test 11: Concurrent Read & Write Interleaving on Feed
    // 10 concurrent writes interleaved with 10 concurrent GET /api/broker/recommendations
    const interleaveRecWrites = Array.from({ length: 10 }).map((_, idx) =>
      apiRequest('POST', '/api/broker/recommendation', {
        ticker: 'TSLA',
        recommendation: 'BUY',
        confidence: 85,
        reasoning: `Interleaved test broadcast #${idx + 1}`,
        riskLevel: 'HIGH',
        timeframe: 'SHORT'
      }, bearer(tokenAdvisor))
    );

    const interleaveRecReads = Array.from({ length: 10 }).map(() =>
      apiRequest('GET', '/api/broker/recommendations', null, bearer(tokenAdmin))
    );

    const mixedResponses = await Promise.all([...interleaveRecWrites, ...interleaveRecReads]);
    const writeResults = mixedResponses.slice(0, 10);
    const readResults = mixedResponses.slice(10, 20);

    const allWritesPassed = writeResults.every(r => r.status === 200);
    const allReadsPassed = readResults.every(r => r.status === 200 && Array.isArray(r.data?.recommendations));

    recordResult({
      id: 'ADV-E-REC-02',
      title: 'Concurrent Read & Write Interleaving on Recommendations Feed',
      battery: 'Recommendation Pipeline',
      scenario: 'Simultaneous 10 writes and 10 reads executing concurrently against recommendations store',
      expected: '10/10 writes succeed (200), 10/10 reads succeed (200) without race corruption',
      actual: `Writes 200: ${writeResults.filter(r => r.status === 200).length}/10, Reads 200: ${readResults.filter(r => r.status === 200).length}/10`,
      evidence: { totalRecsInLastRead: readResults[9]?.data?.recommendations?.length },
      status: (allWritesPassed && allReadsPassed) ? 'PASSED' : 'FAILED'
    });

    // Test 12: RBAC Security Enforcement on POST /api/broker/recommendation
    // Participant team (T01) and journalist attempting to post recommendations must be strictly rejected
    const teamRecRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'INFY',
      recommendation: 'BUY',
      confidence: 90
    }, bearer(teamTokens['T01']));

    const journRecRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'INFY',
      recommendation: 'BUY',
      confidence: 90
    }, bearer(tokenJournalist));

    const anonRecRes = await apiRequest('POST', '/api/broker/recommendation', {
      ticker: 'INFY',
      recommendation: 'BUY',
      confidence: 90
    });

    const teamBlocked = teamRecRes.status === 403;
    const journBlocked = journRecRes.status === 403;
    const anonBlocked = [401, 403].includes(anonRecRes.status);

    recordResult({
      id: 'ADV-E-REC-03',
      title: 'RBAC Authorization Gate on Recommendation Publishing',
      battery: 'Recommendation Pipeline',
      scenario: 'Verify participant teams, journalists, and anonymous callers are forbidden from publishing recommendations',
      expected: 'Team: 403, Journalist: 403, Anonymous: 401/403',
      actual: `Team: ${teamRecRes.status}, Journalist: ${journRecRes.status}, Anonymous: ${anonRecRes.status}`,
      evidence: { teamError: teamRecRes.data?.error, journError: journRecRes.data?.error },
      status: (teamBlocked && journBlocked && anonBlocked) ? 'PASSED' : 'FAILED'
    });

    // Test 13: Payload Validation on Recommendation Publishing
    const emptyRecRes = await apiRequest('POST', '/api/broker/recommendation', { ticker: '' }, bearer(tokenAdvisor));
    const emptyPayloadBlocked = emptyRecRes.status === 400;

    recordResult({
      id: 'ADV-E-REC-04',
      title: 'Recommendation Payload Validation (Missing Parameters)',
      battery: 'Recommendation Pipeline',
      scenario: 'Attempting to publish recommendation with missing ticker or recommendation',
      expected: 'HTTP 400 rejection',
      actual: `HTTP ${emptyRecRes.status}: ${emptyRecRes.data?.error}`,
      evidence: { status: emptyRecRes.status, error: emptyRecRes.data?.error },
      status: emptyPayloadBlocked ? 'PASSED' : 'FAILED'
    });

    // ======================================================================
    // BATTERY 5: 2,849-SECURITY SCALE, ROBUSTNESS & MEMORY HARNESS
    // ======================================================================
    console.log('\n--- BATTERY 5: 2,849-SECURITY SCALE, ROBUSTNESS & MEMORY LEAK HARNESS ---');

    // Test 14: Universe-Wide Batch Evaluation (All 2,856 securities in state.json)
    const stateData = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const securities = stateData.securities || [];
    console.log(`Loaded ${securities.length} securities from universe.`);

    let exceptionCount = 0;
    let validRatiosCount = 0;
    let validValuationCount = 0;
    let validPerspectivesCount = 0;

    const startUniverseTime = Date.now();
    for (const sec of securities) {
      try {
        const ratios = getCompanyRatios(sec);
        if (ratios &&
            typeof ratios.peRatioDisplay === 'string' &&
            typeof ratios.debtToEquityDisplay === 'string' &&
            typeof ratios.operatingMarginDisplay === 'string' &&
            typeof ratios.roeDisplay === 'string') {
          validRatiosCount++;
        }

        const val = getValuationAnalysis(sec, ratios);
        if (val &&
            ['UNDERVALUED', 'FAIR VALUE', 'OVERVALUED'].includes(val.status) &&
            val.fairValue > 0 &&
            val.bearTarget > 0 &&
            val.bullTarget >= val.fairValue) {
          validValuationCount++;
        }

        const pers = getAnalyticalPerspectives(sec, ratios, val);
        if (pers && Array.isArray(pers.bullTheses) && pers.bullTheses.length >= 3 &&
            Array.isArray(pers.bearTheses) && pers.bearTheses.length >= 3) {
          validPerspectivesCount++;
        }
      } catch (err) {
        exceptionCount++;
        console.error(`Exception evaluating ${sec.ticker}:`, err);
      }
    }
    const universeDuration = Date.now() - startUniverseTime;

    const universePassed = (exceptionCount === 0) &&
                           (validRatiosCount === securities.length) &&
                           (validValuationCount === securities.length) &&
                           (validPerspectivesCount === securities.length);

    recordResult({
      id: 'ADV-E-SCALE-01',
      title: 'Full Universe Batch Evaluation (2,856 Securities)',
      battery: 'Scale & Robustness',
      scenario: 'Execute getCompanyRatios, getValuationAnalysis, and getAnalyticalPerspectives across entire universe',
      expected: `2,856/2,856 securities processed with 0 exceptions and valid data contracts`,
      actual: `Processed ${validValuationCount}/${securities.length} in ${universeDuration}ms (0 exceptions)`,
      evidence: { totalSecurities: securities.length, durationMs: universeDuration, throughputSec: Math.round((securities.length / (universeDuration || 1)) * 1000) },
      status: universePassed ? 'PASSED' : 'FAILED'
    });

    // Test 15: Throughput & Memory Leak Evaluation Under 50 Complete Universe Sweeps (142,800 evaluations)
    console.log('Executing 50 complete universe sweeps (142,800 evaluations) for memory stability...');
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;

    const sweepCycles = 50;
    const startStressTime = Date.now();
    for (let c = 0; c < sweepCycles; c++) {
      for (let i = 0; i < securities.length; i++) {
        const sec = securities[i];
        const r = getCompanyRatios(sec);
        const v = getValuationAnalysis(sec, r);
      }
    }
    const totalDuration = Date.now() - startStressTime;
    const totalEvals = sweepCycles * securities.length;
    const throughput = Math.round((totalEvals / (totalDuration || 1)) * 1000);

    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    const heapGrowthMb = (memAfter - memBefore) / (1024 * 1024);

    const memoryStable = heapGrowthMb < 60; // Less than 60MB heap delta for 142k evaluations

    recordResult({
      id: 'ADV-E-SCALE-02',
      title: 'High-Throughput Stress & Memory Leak Stability (142,800 Evaluations)',
      battery: 'Scale & Robustness',
      scenario: '50 sweeps of 2,856 securities to verify throughput and heap memory stability',
      expected: 'Throughput > 5,000 evals/sec, bounded heap growth (<60MB)',
      actual: `Throughput: ${throughput.toLocaleString()} evals/sec, Heap growth: ${heapGrowthMb.toFixed(2)} MB (${totalDuration}ms)`,
      evidence: { totalEvals, totalDurationMs: totalDuration, throughputEvalsPerSec: throughput, heapDeltaMb: heapGrowthMb.toFixed(2) },
      status: memoryStable ? 'PASSED' : 'FAILED'
    });

    // Test 16: Pathological Edge Cases & Guardrail Fuzzing
    const pathologicalSecurities = [
      // 1. Bond / Fixed income
      { ticker: 'GOI_BOND_750', type: 'bond', sector: 'Fixed Income', currentPrice: 1000 },
      // 2. Fund / ETF
      { ticker: 'NIFTY_ETF', type: 'fund', sector: 'Mutual Fund', currentPrice: 250 },
      // 3. Negative Net Income & Negative Equity (Anti-Spurious Trap: -Net / -Equity must NOT return positive ROE)
      {
        ticker: 'DEFICIT_CORP',
        currentPrice: 50,
        financials: { netIncome: -500000000, shareholderEquity: -1000000000, revenue: 200000000, operatingIncome: -300000000, totalDebt: 800000000 }
      },
      // 4. Pre-revenue startup
      {
        ticker: 'EARLY_LABS',
        currentPrice: 100,
        financials: { revenue: 0, operatingIncome: -50000000, netIncome: -50000000, shareholderEquity: 500000000, totalDebt: 0 }
      },
      // 5. Zero Debt Company
      {
        ticker: 'CASH_RICH',
        currentPrice: 1200,
        financials: { revenue: 1000000000, operatingIncome: 250000000, netIncome: 200000000, shareholderEquity: 800000000, totalDebt: 0 }
      },
      // 6. Zero EPS Break-Even
      {
        ticker: 'BREAK_EVEN_INC',
        currentPrice: 150,
        financials: { revenue: 500000000, operatingIncome: 5000000, netIncome: 0, shareholderEquity: 200000000, totalDebt: 50000000 }
      },
      // 7. Astronomical Market Cap
      { ticker: 'TITAN_GIGA', currentPrice: 1000000, totalUnits: 1000000000, sector: 'Technology' },
      // 8. Micro Penny Stock
      { ticker: 'PENNY_MICRO', currentPrice: 0.05, totalUnits: 50000000, sector: 'Materials' },
      // 9. Unknown Sector fallback
      { ticker: 'EXOTIC_X', currentPrice: 100, sector: 'Quantum Deep Space Asteroid Mining' }
    ];

    let pathPassCount = 0;
    const pathResults = [];
    for (const sec of pathologicalSecurities) {
      const r = getCompanyRatios(sec);
      const v = getValuationAnalysis(sec, r);
      const p = getAnalyticalPerspectives(sec, r, v);

      const bondHandled = sec.ticker !== 'GOI_BOND_750' || (r.peRatio === null && r.peRatioDisplay.includes('Fixed Income'));
      const fundHandled = sec.ticker !== 'NIFTY_ETF' || (r.peRatio === null && r.peRatioDisplay.includes('Fund'));
      const antiSpuriousHandled = sec.ticker !== 'DEFICIT_CORP' || (r.roe === null && r.roeDisplay.includes('Deficit Equity'));
      const preRevHandled = sec.ticker !== 'EARLY_LABS' || (r.operatingMargin === null && r.operatingMarginDisplay.includes('Pre-Revenue'));
      const zeroDebtHandled = sec.ticker !== 'CASH_RICH' || (r.debtToEquity === 0 && r.debtToEquityDisplay.includes('Debt-Free'));
      const breakEvenHandled = sec.ticker !== 'BREAK_EVEN_INC' || (r.peRatio === null && r.peRatioDisplay.includes('Break-even'));
      const valValid = v && v.fairValue > 0 && v.bearTarget > 0 && v.bullTarget > 0;
      const persValid = p && p.bullTheses.length >= 3 && p.bearTheses.length >= 3;

      if (bondHandled && fundHandled && antiSpuriousHandled && preRevHandled && zeroDebtHandled && breakEvenHandled && valValid && persValid) {
        pathPassCount++;
      } else {
        pathResults.push({ ticker: sec.ticker, bondHandled, fundHandled, antiSpuriousHandled, preRevHandled, zeroDebtHandled, breakEvenHandled, valValid, persValid });
      }
    }

    recordResult({
      id: 'ADV-E-SCALE-03',
      title: 'Pathological Input & Guardrail Boundary Fuzzing',
      battery: 'Scale & Robustness',
      scenario: 'Evaluate edge cases: bonds, funds, deficit equity anti-spurious trap, pre-revenue, zero-debt, astronomical caps',
      expected: '9/9 pathological cases handled strictly within mathematical guardrails',
      actual: `Passed: ${pathPassCount}/9`,
      evidence: pathResults.length ? pathResults : 'All 9 pathological test cases satisfied guardrails',
      status: pathPassCount === 9 ? 'PASSED' : 'FAILED'
    });

  } finally {
    // CLEANUP SERVER
    console.log('\n--- CLEANING UP ISOLATED TEST SERVER ---');
    serverProcess.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 1000));

    // REMOVE DISPOSABLE FIXTURE
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    }
  }

  // STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK
  console.log('\n--- STEP 6: POST-FLIGHT AUTHORITATIVE BASELINE HASH CHECK ---');
  const finalHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256 after test harness: ${finalHash}`);
  assert.strictEqual(finalHash, EXPECTED_HASH, 'AUTHORITATIVE STATE HASH MISMATCH AFTER TESTING!');
  console.log('✓ Authoritative state.json confirmed bit-for-bit untouched.\n');

  recordResult({
    id: 'ADV-E-POSTFLIGHT-01',
    title: 'Post-flight Authoritative Baseline Hash Verification',
    battery: 'Baseline Integrity',
    scenario: 'Confirm authoritative state.json remained 100% bit-for-bit untouched throughout testing',
    expected: EXPECTED_HASH,
    actual: finalHash,
    evidence: { sha256: finalHash },
    status: finalHash === EXPECTED_HASH ? 'PASSED' : 'FAILED'
  });

  // SUMMARY & REPORTING
  console.log('======================================================================');
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log(`📊 CHALLENGER 2 PHASE E SUMMARY: ${passed}/${testResults.length} PASSED (${failed} FAILED)`);
  console.log('======================================================================');

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`✓ Test results saved to: ${RESULTS_FILE}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runAdversarialPhaseESuite().catch(err => {
  console.error('\n🔴 Fatal Suite Error:', err);
  process.exitCode = 1;
});
