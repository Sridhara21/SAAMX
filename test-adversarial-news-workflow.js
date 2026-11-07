import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3118;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-adversarial-disposable.json');
const EXPECTED_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';
const RESULTS_FILE = path.join(__dirname, 'test-adversarial-results.json');

const testResults = [];

function recordResult({ id, domain, title, endpoint, scenario, expected, actual, evidence, status }) {
  const resultObj = { id, domain, title, endpoint, scenario, expected, actual, evidence, status };
  testResults.push(resultObj);
  const tag = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  console.log(`\n[${tag}] ${id}: ${title}`);
  if (endpoint) console.log(`  Endpoint:  ${endpoint}`);
  console.log(`  Scenario:  ${scenario}`);
  console.log(`  Expected:  ${expected}`);
  console.log(`  Actual:    ${actual}`);
  if (evidence !== undefined) {
    console.log(`  Evidence:  ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
  }
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

function bearerHeader(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function runAdversarialWorkflowTestSuite() {
  console.log('='.repeat(80));
  console.log('SAAMX ADVERSARIAL STRESS TEST: WORKFLOW, RBAC SECURITY & IPO CONTROLLER');
  console.log('='.repeat(80));

  // 1. Pre-test baseline verification
  const preHash = getSha256(ORIGINAL_STATE);
  console.log(`Authoritative state.json SHA-256: ${preHash}`);
  assert.strictEqual(preHash, EXPECTED_HASH, 'Initial state.json must match authoritative hash');

  // Prepare disposable fixture without inheriting read-only flags
  if (fs.existsSync(DISPOSABLE_STATE)) {
    try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
  }
  const fixture = JSON.parse(fs.readFileSync(ORIGINAL_STATE, 'utf8'));
  fixture.marketState.status = 'Open';
  fixture.marketState.sessionState = 'CONTINUOUS_TRADING';
  fixture.marketState.isManualOverride = true;
  fixture.marketState.isFrozen = false;

  // Ensure test teams have sufficient cash for IPO bidding tests
  if (fixture.teams) {
    const t01 = fixture.teams.find(t => t.teamCode === 'T01');
    if (t01) {
      if (!t01.cashWallets) t01.cashWallets = {};
      t01.cashWallets['USD'] = 500000;
      t01.cashWallets['INR'] = 50000000;
    }
    const t02 = fixture.teams.find(t => t.teamCode === 'T02');
    if (t02) {
      if (!t02.cashWallets) t02.cashWallets = {};
      t02.cashWallets['USD'] = 500000;
      t02.cashWallets['INR'] = 50000000;
    }
  }

  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(fixture, null, 2), 'utf8');

  // Spawn isolated server
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

  let hydrated = false;
  serverProcess.stdout.on('data', d => {
    const text = d.toString();
    if (text.includes('Successfully hydrated authoritative state') || text.includes('Running in memory/file fallback mode')) {
      hydrated = true;
    }
  });

  let serverStarted = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200 && (hydrated || i >= 12)) {
        serverStarted = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }

  assert.ok(serverStarted, `Server failed to start on isolated port ${PORT}`);
  console.log(`✓ Isolated test server online on port ${PORT}`);

  try {
    async function loginWithRetry(username, password) {
      for (let i = 0; i < 15; i++) {
        const res = await apiRequest('POST', '/api/auth/login', { username, password });
        if (res.status === 200 && res.data?.token) return res.data.token;
        if (res.status === 503) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return res.data?.token;
      }
      return null;
    }

    // Role Authentication
    const tokenAdmin = await loginWithRetry('admin', 'saamx-event-2026');
    const tokenNewsController = await loginWithRetry('news_controller', 'saamx-event-2026');
    const tokenJournalist = await loginWithRetry('journalist', 'journalist-event-2026');
    const tokenTeam01 = await loginWithRetry('T01', 'saamx-team-01');
    const tokenTeam02 = await loginWithRetry('T02', 'saamx-team-02');

    assert.ok(tokenAdmin, 'Admin authentication failed');
    assert.ok(tokenNewsController, 'News Controller authentication failed');
    assert.ok(tokenJournalist, 'Journalist authentication failed');
    assert.ok(tokenTeam01, 'Team T01 authentication failed');
    assert.ok(tokenTeam02, 'Team T02 authentication failed');

    console.log('✓ All 5 test actor roles authenticated successfully');

    // ========================================================================
    // DOMAIN 1: UNAUTHORIZED PUBLICATION ATTEMPTS (RBAC SECURITY)
    // ========================================================================
    console.log('\n--- DOMAIN 1: UNAUTHORIZED PUBLICATION ATTEMPTS (RBAC SECURITY) ---');

    // 1.1 Unauthenticated POST /api/news/publish -> 401
    const unauthPub = await apiRequest('POST', '/api/news/publish', {
      triggerPresetId: 'NEWS_EARN_001'
    });
    recordResult({
      id: 'ADV-RBAC-01',
      domain: 'RBAC Security',
      title: 'Unauthenticated POST /api/news/publish Rejection',
      endpoint: 'POST /api/news/publish',
      scenario: 'Anonymous request attempts to trigger news publication without token',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${unauthPub.status}`,
      evidence: unauthPub.data,
      status: (unauthPub.status === 401 || unauthPub.status === 403) ? 'PASSED' : 'FAILED'
    });

    // 1.2 Participant (Team) POST /api/news/publish -> 403
    const teamPub = await apiRequest('POST', '/api/news/publish', {
      triggerPresetId: 'NEWS_EARN_001'
    }, bearerHeader(tokenTeam01));
    recordResult({
      id: 'ADV-RBAC-02',
      domain: 'RBAC Security',
      title: 'Participant POST /api/news/publish Forbidden',
      endpoint: 'POST /api/news/publish',
      scenario: 'Team participant token attempts to trigger news publication',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamPub.status}`,
      evidence: teamPub.data,
      status: teamPub.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 1.3 Journalist POST /api/news/publish -> 403
    const journalistPub = await apiRequest('POST', '/api/news/publish', {
      triggerPresetId: 'NEWS_EARN_001'
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-RBAC-03',
      domain: 'RBAC Security',
      title: 'Journalist POST /api/news/publish Forbidden',
      endpoint: 'POST /api/news/publish',
      scenario: 'Journalist role attempts direct news publishing bypassing News Controller',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${journalistPub.status}`,
      evidence: journalistPub.data,
      status: journalistPub.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 1.4 Unauthenticated POST /api/news -> 401
    const unauthLegacyNews = await apiRequest('POST', '/api/news', {
      headline: 'Unauthenticated Direct Shock',
      sentiment: 'Positive',
      impactPercent: 10
    });
    recordResult({
      id: 'ADV-RBAC-04',
      domain: 'RBAC Security',
      title: 'Unauthenticated POST /api/news Rejection',
      endpoint: 'POST /api/news',
      scenario: 'Anonymous request attempts to broadcast direct news bulletin',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${unauthLegacyNews.status}`,
      evidence: unauthLegacyNews.data,
      status: (unauthLegacyNews.status === 401 || unauthLegacyNews.status === 403) ? 'PASSED' : 'FAILED'
    });

    // 1.5 Participant (Team) POST /api/news -> 403
    const teamLegacyNews = await apiRequest('POST', '/api/news', {
      headline: 'Participant Direct Market Manipulation',
      sentiment: 'Positive',
      impactPercent: 15
    }, bearerHeader(tokenTeam01));
    recordResult({
      id: 'ADV-RBAC-05',
      domain: 'RBAC Security',
      title: 'Participant POST /api/news Forbidden',
      endpoint: 'POST /api/news',
      scenario: 'Team participant token attempts direct news bulletin broadcast',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${teamLegacyNews.status}`,
      evidence: teamLegacyNews.data,
      status: teamLegacyNews.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 1.6 Journalist POST /api/news -> MUST BE 403 (Demoted from direct publishing)
    const journalistLegacyNews = await apiRequest('POST', '/api/news', {
      headline: 'Journalist Direct Market Shock Without Editorial Review',
      sentiment: 'Negative',
      impactPercent: 12
    }, bearerHeader(tokenJournalist));
    const isJournalistLegacyBlocked = (journalistLegacyNews.status === 403 || journalistLegacyNews.status === 401);
    recordResult({
      id: 'ADV-RBAC-06',
      domain: 'RBAC Security',
      title: 'Journalist POST /api/news Direct Publish Prevention',
      endpoint: 'POST /api/news',
      scenario: 'Journalist attempts direct news broadcast without News Controller review',
      expected: 'HTTP 403 Forbidden (Journalist demoted from news.publish)',
      actual: `HTTP ${journalistLegacyNews.status}`,
      evidence: journalistLegacyNews.data,
      status: isJournalistLegacyBlocked ? 'PASSED' : 'FAILED'
    });

    // 1.7 Unauthorized Editorial Review attempts
    const unauthReview = await apiRequest('POST', '/api/news/review', {
      draftId: 'DRF_TEST',
      action: 'APPROVE'
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-RBAC-07',
      domain: 'RBAC Security',
      title: 'Journalist POST /api/news/review Forbidden',
      endpoint: 'POST /api/news/review',
      scenario: 'Journalist attempts self-approval of news drafts',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${unauthReview.status}`,
      evidence: unauthReview.data,
      status: unauthReview.status === 403 ? 'PASSED' : 'FAILED'
    });

    // 1.8 Unauthorized News Correction attempts
    const unauthCorrect = await apiRequest('POST', '/api/news/correct', {
      newsId: 'NW001',
      reversalFactor: 1.0
    }, bearerHeader(tokenTeam01));
    recordResult({
      id: 'ADV-RBAC-08',
      domain: 'RBAC Security',
      title: 'Participant POST /api/news/correct Forbidden',
      endpoint: 'POST /api/news/correct',
      scenario: 'Participant attempts to issue regulatory market correction',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${unauthCorrect.status}`,
      evidence: unauthCorrect.data,
      status: unauthCorrect.status === 403 ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // DOMAIN 2: MALFORMED PAYLOADS & STRICT 400 REJECTION
    // ========================================================================
    console.log('\n--- DOMAIN 2: MALFORMED PAYLOADS & STRICT VALIDATION ---');

    // 2.1 Missing all fields on POST /api/news/draft
    const emptyDraft = await apiRequest('POST', '/api/news/draft', {}, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-VAL-01',
      domain: 'Malformed Payloads',
      title: 'Empty Draft Payload Rejection',
      endpoint: 'POST /api/news/draft',
      scenario: 'Journalist submits empty JSON object',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${emptyDraft.status}`,
      evidence: emptyDraft.data,
      status: emptyDraft.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.2 Empty headline on POST /api/news/draft
    const emptyHeadlineDraft = await apiRequest('POST', '/api/news/draft', {
      headline: '',
      description: 'Valid description of market shock with sufficient length'
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-VAL-02',
      domain: 'Malformed Payloads',
      title: 'Empty Headline Draft Rejection',
      endpoint: 'POST /api/news/draft',
      scenario: 'Journalist submits draft with empty headline string',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${emptyHeadlineDraft.status}`,
      evidence: emptyHeadlineDraft.data,
      status: emptyHeadlineDraft.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.3 Missing description on POST /api/news/draft
    const missingDescDraft = await apiRequest('POST', '/api/news/draft', {
      headline: 'Valid Headline About RBI Rate Decision',
      description: ''
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-VAL-03',
      domain: 'Malformed Payloads',
      title: 'Missing Description Draft Rejection',
      endpoint: 'POST /api/news/draft',
      scenario: 'Journalist submits draft with empty description',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${missingDescDraft.status}`,
      evidence: missingDescDraft.data,
      status: missingDescDraft.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.4 Non-existent Category on POST /api/news/draft
    const fakeCategoryDraft = await apiRequest('POST', '/api/news/draft', {
      headline: 'Suspicious Rumour About Crypto Mining Farm',
      description: 'Unverified report of crypto activities on corporate balance sheet',
      category: 'Cryptocurrency / DeFi / Web3' // Non-existent category
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-VAL-04',
      domain: 'Malformed Payloads',
      title: 'Non-existent Category in News Draft Rejection',
      endpoint: 'POST /api/news/draft',
      scenario: 'Draft submitted with category outside the 9 approved domains',
      expected: 'HTTP 400 Bad Request rejection',
      actual: `HTTP ${fakeCategoryDraft.status} (Category accepted: ${fakeCategoryDraft.data?.draft?.category})`,
      evidence: fakeCategoryDraft.data,
      status: fakeCategoryDraft.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.4B Out-of-range Magnitude on POST /api/news/draft
    const outOfRangeDraft = await apiRequest('POST', '/api/news/draft', {
      headline: 'Extreme Exorbitant Market Shock Attempt',
      description: 'Draft with magnitude far outside legitimate bounds',
      impactMagnitude: 99999 // Out-of-range magnitude
    }, bearerHeader(tokenJournalist));
    recordResult({
      id: 'ADV-VAL-04B',
      domain: 'Malformed Payloads',
      title: 'Out-of-Range Magnitude in News Draft Rejection',
      endpoint: 'POST /api/news/draft',
      scenario: 'Draft submitted with impact magnitude 99999% far outside reasonable 1-25% limits',
      expected: 'HTTP 400 Bad Request rejection',
      actual: `HTTP ${outOfRangeDraft.status} (Magnitude accepted: ${outOfRangeDraft.data?.draft?.impactMagnitude})`,
      evidence: outOfRangeDraft.data,
      status: outOfRangeDraft.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.5 Empty payload on POST /api/news/publish -> 400
    const emptyPub = await apiRequest('POST', '/api/news/publish', {}, bearerHeader(tokenNewsController));
    recordResult({
      id: 'ADV-VAL-05',
      domain: 'Malformed Payloads',
      title: 'Empty Publication Request Rejection',
      endpoint: 'POST /api/news/publish',
      scenario: 'News Controller submits empty publish request without draftId, presetId, or customPayload',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${emptyPub.status}`,
      evidence: emptyPub.data,
      status: emptyPub.status === 400 ? 'PASSED' : 'FAILED'
    });

    // 2.6 Non-existent presetId on POST /api/news/publish -> 404
    const fakePresetPub = await apiRequest('POST', '/api/news/publish', {
      triggerPresetId: 'NEWS_NONEXISTENT_9999'
    }, bearerHeader(tokenNewsController));
    recordResult({
      id: 'ADV-VAL-06',
      domain: 'Malformed Payloads',
      title: 'Non-existent Preset ID Rejection',
      endpoint: 'POST /api/news/publish',
      scenario: 'News Controller attempts to trigger invalid preset ID',
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${fakePresetPub.status}`,
      evidence: fakePresetPub.data,
      status: fakePresetPub.status === 404 ? 'PASSED' : 'FAILED'
    });

    // 2.7 Malformed customPayload on POST /api/news/publish -> 400 with validation details
    const malformedCustomPub = await apiRequest('POST', '/api/news/publish', {
      customPayload: {
        headline: 'Too short', // < 10 characters
        description: 'Short desc', // < 20 characters
        category: 'Fake Domain',
        sentiment: 'SuperBullish' // Invalid sentiment
      }
    }, bearerHeader(tokenNewsController));
    const hasDetails = malformedCustomPub.data?.details && Array.isArray(malformedCustomPub.data.details) && malformedCustomPub.data.details.length > 0;
    recordResult({
      id: 'ADV-VAL-07',
      domain: 'Malformed Payloads',
      title: 'Malformed Custom News Rejection with Validation Details',
      endpoint: 'POST /api/news/publish',
      scenario: 'Publish custom news with missing required schema fields, short headline, and invalid sentiment',
      expected: 'HTTP 400 Bad Request with details error array',
      actual: `HTTP ${malformedCustomPub.status} (Details count: ${malformedCustomPub.data?.details?.length || 0})`,
      evidence: malformedCustomPub.data,
      status: (malformedCustomPub.status === 400 && hasDetails) ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // DOMAIN 3: 8-STAGE IPO LIFECYCLE CONTROLLER & PRO-RATA ALLOTMENT STRESS
    // ========================================================================
    console.log('\n--- DOMAIN 3: 8-STAGE IPO LIFECYCLE & PRO-RATA ALLOTMENT STRESS ---');

    const IPO_TICKER = 'OAI'; // OpenAI IPO from authoritative catalog

    // Ensure clean starting baseline for OAI
    const stage0 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'HIDDEN'
    }, bearerHeader(tokenAdmin));
    assert.strictEqual(stage0.status, 200);

    // 3.1 Stage 1: HIDDEN
    const stage1Sec = (await apiRequest('GET', '/api/ipos')).data?.ipos?.find(s => s.ticker === IPO_TICKER);
    const hiddenTrade = await apiRequest('POST', '/api/trade', {
      teamId: 'T01',
      securityId: IPO_TICKER,
      action: 'BUY',
      quantity: 10
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-IPO-01',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 1: HIDDEN Verification & Trading Prohibition',
      endpoint: 'POST /api/ipo/stage (HIDDEN)',
      scenario: 'IPO is HIDDEN; verify visibility false and trading prohibited',
      expected: 'visibleToParticipants === false and HTTP 400 for secondary trade',
      actual: `visible: ${stage1Sec?.visibleToParticipants}, trade status: ${hiddenTrade.status}`,
      evidence: { stage: stage1Sec?.ipoStage, tradeError: hiddenTrade.data?.error },
      status: (stage1Sec?.visibleToParticipants === false && hiddenTrade.status === 400) ? 'PASSED' : 'FAILED'
    });

    // 3.2 Stage 2: RUMOUR
    const stage2 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'RUMOUR'
    }, bearerHeader(tokenAdmin));
    const rumourTrade = await apiRequest('POST', '/api/trade', {
      teamId: 'T01',
      securityId: IPO_TICKER,
      action: 'BUY',
      quantity: 10
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-IPO-02',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 2: RUMOUR Verification & Trading Prohibition',
      endpoint: 'POST /api/ipo/stage (RUMOUR)',
      scenario: 'IPO moves to RUMOUR stage; secondary trading must remain blocked',
      expected: 'status === IPO_STAGED and secondary trade rejected (HTTP 400)',
      actual: `status: ${stage2.data?.status}, trade status: ${rumourTrade.status}`,
      evidence: { stage: stage2.data?.stage, tradeError: rumourTrade.data?.error },
      status: (stage2.data?.status === 'IPO_STAGED' && rumourTrade.status === 400) ? 'PASSED' : 'FAILED'
    });

    // 3.3 Stage 3: SPECULATION
    const stage3 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'SPECULATION'
    }, bearerHeader(tokenAdmin));
    const specTrade = await apiRequest('POST', '/api/trade', {
      teamId: 'T01',
      securityId: IPO_TICKER,
      action: 'BUY',
      quantity: 10
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-IPO-03',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 3: SPECULATION Verification & Trading Prohibition',
      endpoint: 'POST /api/ipo/stage (SPECULATION)',
      scenario: 'IPO moves to SPECULATION stage; trading must remain blocked',
      expected: 'status === IPO_STAGED and secondary trade rejected (HTTP 400)',
      actual: `status: ${stage3.data?.status}, trade status: ${specTrade.status}`,
      evidence: { stage: stage3.data?.stage, tradeError: specTrade.data?.error },
      status: (stage3.data?.status === 'IPO_STAGED' && specTrade.status === 400) ? 'PASSED' : 'FAILED'
    });

    // 3.4 Stage 4: ANNOUNCED (Official Announcement)
    const stage4 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'ANNOUNCED'
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-IPO-04',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 4: ANNOUNCED Verification',
      endpoint: 'POST /api/ipo/stage (ANNOUNCED)',
      scenario: 'IPO moves to ANNOUNCED stage; status becomes IPO_PENDING with ipoStage set',
      expected: 'status === IPO_PENDING and ipoStage === ANNOUNCED',
      actual: `status: ${stage4.data?.status}, stage: ${stage4.data?.stage}`,
      evidence: stage4.data,
      status: (stage4.data?.status === 'IPO_PENDING' && stage4.data?.stage === 'ANNOUNCED') ? 'PASSED' : 'FAILED'
    });

    // 3.5 Stress Test: 30-Second Legacy Loop Guard
    // When an IPO is staged with ipoStage = 'ANNOUNCED', the legacy 30s auto-activation loop
    // must NEVER prematurely activate it to 'Active' even if announcedTime is > 30s ago!
    const stateBeforeLoop = JSON.parse(fs.readFileSync(DISPOSABLE_STATE, 'utf8'));
    const secInState = stateBeforeLoop.securities.find(s => s.ticker === IPO_TICKER);
    // Artificially age the price history timestamp by 60 seconds (older than the 30s threshold)
    if (secInState) {
      secInState.priceHistory = [{ timestamp: Date.now() - 60000, price: 100 }];
      fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(stateBeforeLoop, null, 2), 'utf8');
    }

    // Wait 2 seconds for any active background tick to execute
    await new Promise(r => setTimeout(r, 2000));

    // Verify security status remains IPO_PENDING and has NOT transitioned to Active
    const secAfterTick = (await apiRequest('GET', '/api/ipos')).data?.ipos?.find(s => s.ticker === IPO_TICKER);
    recordResult({
      id: 'ADV-IPO-05',
      domain: '8-Stage IPO Lifecycle',
      title: '30-Second Legacy Loop Guard Against Premature Listing',
      endpoint: 'Background setInterval Loop',
      scenario: 'Staged IPO (ANNOUNCED) has timestamp > 30s in the past; loop must not auto-activate',
      expected: 'status === IPO_PENDING (NOT Active)',
      actual: `status: ${secAfterTick?.status}`,
      evidence: { ticker: IPO_TICKER, status: secAfterTick?.status, ipoStage: secAfterTick?.ipoStage },
      status: (secAfterTick?.status === 'IPO_PENDING' && secAfterTick?.status !== 'Active') ? 'PASSED' : 'FAILED'
    });

    // 3.6 Stage 5: SUBSCRIPTION_OPEN
    const stage5 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'SUBSCRIPTION_OPEN'
    }, bearerHeader(tokenAdmin));
    recordResult({
      id: 'ADV-IPO-06',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 5: SUBSCRIPTION_OPEN Verification',
      endpoint: 'POST /api/ipo/stage (SUBSCRIPTION_OPEN)',
      scenario: 'Subscription window opens for primary bidding',
      expected: 'status === IPO_OPEN and ipoStage === SUBSCRIPTION_OPEN',
      actual: `status: ${stage5.data?.status}, stage: ${stage5.data?.stage}`,
      evidence: stage5.data,
      status: (stage5.data?.status === 'IPO_OPEN' && stage5.data?.stage === 'SUBSCRIPTION_OPEN') ? 'PASSED' : 'FAILED'
    });

    // 3.7 Competing Team Bids during SUBSCRIPTION_OPEN
    // T01 bids 600 units; T02 bids 400 units on a 500 unit float (Total demand 1000 units = 2.0x oversubscribed)
    const bidT01 = await apiRequest('POST', '/api/ipo/bid', {
      ticker: IPO_TICKER,
      quantity: 600,
      teamCode: 'T01',
      floatUnits: 500
    }, bearerHeader(tokenTeam01));

    const bidT02 = await apiRequest('POST', '/api/ipo/bid', {
      ticker: IPO_TICKER,
      quantity: 400,
      teamCode: 'T02',
      floatUnits: 500
    }, bearerHeader(tokenTeam02));

    const ipoDemandState = (await apiRequest('GET', '/api/ipos')).data?.ipos?.find(s => s.ticker === IPO_TICKER);
    const demandPass = (
      bidT01.status === 200 &&
      bidT02.status === 200 &&
      ipoDemandState?.totalSubscription === 1000 &&
      ipoDemandState?.subscriptionMultiple === 2.0
    );
    recordResult({
      id: 'ADV-IPO-07',
      domain: '8-Stage IPO Lifecycle',
      title: 'Competing Team Bids & Demand Calculation',
      endpoint: 'POST /api/ipo/bid',
      scenario: 'Teams T01 (600) and T02 (400) place competing bids on 500-unit float',
      expected: 'Total demand: 1000, Subscription multiple: 2.0x',
      actual: `Total demand: ${ipoDemandState?.totalSubscription}, Multiple: ${ipoDemandState?.subscriptionMultiple}x`,
      evidence: { bids: ipoDemandState?.bids, total: ipoDemandState?.totalSubscription },
      status: demandPass ? 'PASSED' : 'FAILED'
    });

    // 3.8 Stage 6: SUBSCRIPTION_CLOSED
    const stage6 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'SUBSCRIPTION_CLOSED'
    }, bearerHeader(tokenAdmin));
    // Verify further bids are rejected when closed
    const lateBid = await apiRequest('POST', '/api/ipo/bid', {
      ticker: IPO_TICKER,
      quantity: 100,
      teamCode: 'T01'
    }, bearerHeader(tokenTeam01));
    recordResult({
      id: 'ADV-IPO-08',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 6: SUBSCRIPTION_CLOSED & Late Bid Rejection',
      endpoint: 'POST /api/ipo/stage (SUBSCRIPTION_CLOSED)',
      scenario: 'Subscription window closes; late bids rejected',
      expected: 'status === IPO_CLOSED and late bid rejected (HTTP 400)',
      actual: `status: ${stage6.data?.status}, late bid status: ${lateBid.status}`,
      evidence: { stage: stage6.data?.stage, lateBidError: lateBid.data?.error },
      status: (stage6.data?.status === 'IPO_CLOSED' && lateBid.status === 400) ? 'PASSED' : 'FAILED'
    });

    // 3.9 Stage 7: ALLOTMENT (Pro-Rata Allotment Engine Delegation)
    const stage7 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'ALLOTMENT',
      floatUnits: 500
    }, bearerHeader(tokenAdmin));

    // Verify pro-rata: 2.0x oversubscription means 50% pro-rata allotment
    // T01 (bid 600) should get 300 units; T02 (bid 400) should get 200 units
    const allotT01 = stage7.data?.allotments?.['T01']?.allottedQuantity;
    const allotT02 = stage7.data?.allotments?.['T02']?.allottedQuantity;
    const refundT01 = stage7.data?.allotments?.['T01']?.refundAmount;
    const refundT02 = stage7.data?.allotments?.['T02']?.refundAmount;
    const proRataExact = (allotT01 === 300 && allotT02 === 200);

    recordResult({
      id: 'ADV-IPO-09',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 7: Pro-Rata Allotment & Refund Execution',
      endpoint: 'POST /api/ipo/stage (ALLOTMENT)',
      scenario: 'Execute pro-rata allotment across T01 (600 bid) and T02 (400 bid) for 500 float',
      expected: 'T01 allotted 300 units, T02 allotted 200 units, excess capital refunded',
      actual: `T01: ${allotT01} units (Refund: $${refundT01}), T02: ${allotT02} units (Refund: $${refundT02})`,
      evidence: stage7.data?.allotments,
      status: (stage7.status === 200 && proRataExact) ? 'PASSED' : 'FAILED'
    });

    // 3.10 Stage 8: LISTING (Secondary Market Opens)
    const stage8 = await apiRequest('POST', '/api/ipo/stage', {
      ticker: IPO_TICKER,
      stage: 'LISTING'
    }, bearerHeader(tokenAdmin));

    const finalIpoState = (await apiRequest('GET', '/api/ipos')).data?.ipos?.find(s => s.ticker === IPO_TICKER);
    recordResult({
      id: 'ADV-IPO-10',
      domain: '8-Stage IPO Lifecycle',
      title: 'Stage 8: LISTING & Secondary Market Activation',
      endpoint: 'POST /api/ipo/stage (LISTING)',
      scenario: 'IPO completes listing with market opening price pop',
      expected: 'status === Active and ipoStatus === LISTED',
      actual: `status: ${finalIpoState?.status}, ipoStatus: ${finalIpoState?.ipoStatus}, price: $${finalIpoState?.currentPrice}`,
      evidence: { status: finalIpoState?.status, ipoStatus: finalIpoState?.ipoStatus, currentPrice: finalIpoState?.currentPrice },
      status: (finalIpoState?.status === 'Active' && finalIpoState?.ipoStatus === 'LISTED') ? 'PASSED' : 'FAILED'
    });

    // 3.11 Post-Listing Secondary Trading Verification
    // T01 was allotted 300 shares in stage 7; verify secondary trading slip intake via /api/orders/submit
    const postListingOrder = await apiRequest('POST', '/api/orders/submit', {
      teamCode: 'T01',
      ticker: IPO_TICKER,
      action: 'SELL',
      quantity: 10,
      physicalTicketNumber: `TKT-OAI-LIST-${Date.now().toString().slice(-6)}`,
      notes: 'Post-listing secondary trading execution from allotted holdings'
    }, bearerHeader(tokenTeam01));

    recordResult({
      id: 'ADV-IPO-11',
      domain: '8-Stage IPO Lifecycle',
      title: 'Post-Listing Secondary Trading Intake Enabled',
      endpoint: 'POST /api/orders/submit',
      scenario: 'Team submits secondary market order slip (SELL 10 units) from allotted holdings on newly listed security',
      expected: 'HTTP 200 OK and order queued successfully',
      actual: `HTTP ${postListingOrder.status}`,
      evidence: { orderId: postListingOrder.data?.orderId, status: postListingOrder.data?.order?.status },
      status: (postListingOrder.status === 200 && postListingOrder.data?.success) ? 'PASSED' : 'FAILED'
    });

    // ========================================================================
    // DOMAIN 4: CONCURRENCY & RACE CONDITIONS
    // ========================================================================
    console.log('\n--- DOMAIN 4: CONCURRENCY & RACE CONDITIONS ---');

    // 4.1 Dispatch 20 simultaneous draft submissions
    const CONCURRENT_DRAFTS = 20;
    const draftPromises = [];
    for (let i = 0; i < CONCURRENT_DRAFTS; i++) {
      draftPromises.push(
        apiRequest('POST', '/api/news/draft', {
          headline: `Concurrent Market Pulse #${i + 1} - Volatility Influx`,
          description: `Simultaneous automated telemetry report ${i + 1} testing thread safety`,
          category: 'Corporate earnings',
          sentiment: i % 2 === 0 ? 'Positive' : 'Negative',
          impactMagnitude: 5 + (i % 5)
        }, bearerHeader(tokenJournalist))
      );
    }

    const draftResponses = await Promise.all(draftPromises);
    const successfulDrafts = draftResponses.filter(r => r.status === 201 && r.data?.draft?.id);
    const draftIds = successfulDrafts.map(r => r.data.draft.id);
    const uniqueDraftIds = new Set(draftIds);

    recordResult({
      id: 'ADV-CONC-01',
      domain: 'Concurrency Stress',
      title: 'Simultaneous Draft Submissions (20 concurrent)',
      endpoint: 'POST /api/news/draft',
      scenario: '20 concurrent journalist draft submissions dispatched simultaneously via Promise.all',
      expected: '20/20 successful (201) with 20 distinct unique draft IDs',
      actual: `${successfulDrafts.length}/20 successful, ${uniqueDraftIds.size} unique IDs`,
      evidence: { total: successfulDrafts.length, uniqueCount: uniqueDraftIds.size },
      status: (successfulDrafts.length === CONCURRENT_DRAFTS && uniqueDraftIds.size === CONCURRENT_DRAFTS) ? 'PASSED' : 'FAILED'
    });

    // 4.2 Dispatch 10 simultaneous review approvals on the submitted drafts
    const CONCURRENT_REVIEWS = 10;
    const reviewPromises = [];
    for (let i = 0; i < CONCURRENT_REVIEWS; i++) {
      reviewPromises.push(
        apiRequest('POST', '/api/news/review', {
          draftId: draftIds[i],
          action: 'APPROVE',
          feedback: `Batch review approval #${i + 1}`
        }, bearerHeader(tokenNewsController))
      );
    }

    const reviewResponses = await Promise.all(reviewPromises);
    const successfulReviews = reviewResponses.filter(r => r.status === 200 && r.data?.draft?.status === 'APPROVED');

    recordResult({
      id: 'ADV-CONC-02',
      domain: 'Concurrency Stress',
      title: 'Simultaneous Draft Review Approvals (10 concurrent)',
      endpoint: 'POST /api/news/review',
      scenario: '10 concurrent draft review approvals dispatched simultaneously via Promise.all',
      expected: '10/10 successfully approved (200) without race collision',
      actual: `${successfulReviews.length}/10 successful approvals`,
      evidence: { approvedCount: successfulReviews.length },
      status: successfulReviews.length === CONCURRENT_REVIEWS ? 'PASSED' : 'FAILED'
    });

    // 4.3 Concurrent Primary IPO Bidding from Multiple Teams
    // Open another IPO for concurrent bidding test
    const CONC_IPO = 'STRP'; // Stripe
    await apiRequest('POST', '/api/ipo/stage', { ticker: CONC_IPO, stage: 'SUBSCRIPTION_OPEN' }, bearerHeader(tokenAdmin));

    const concurrentBids = await Promise.all([
      apiRequest('POST', '/api/ipo/bid', { ticker: CONC_IPO, quantity: 100, teamCode: 'T01', floatUnits: 1000 }, bearerHeader(tokenTeam01)),
      apiRequest('POST', '/api/ipo/bid', { ticker: CONC_IPO, quantity: 200, teamCode: 'T02', floatUnits: 1000 }, bearerHeader(tokenTeam02)),
      apiRequest('POST', '/api/ipo/bid', { ticker: CONC_IPO, quantity: 300, teamCode: 'T01', floatUnits: 1000 }, bearerHeader(tokenTeam01)),
      apiRequest('POST', '/api/ipo/bid', { ticker: CONC_IPO, quantity: 150, teamCode: 'T02', floatUnits: 1000 }, bearerHeader(tokenTeam02))
    ]);

    const strpSec = (await apiRequest('GET', '/api/ipos')).data?.ipos?.find(s => s.ticker === CONC_IPO);
    const expectedTotal = 100 + 200 + 300 + 150; // 750 units
    const concBidPass = concurrentBids.every(b => b.status === 200) && strpSec?.totalSubscription === expectedTotal;

    recordResult({
      id: 'ADV-CONC-03',
      domain: 'Concurrency Stress',
      title: 'Concurrent Multi-Team Primary IPO Bidding',
      endpoint: 'POST /api/ipo/bid',
      scenario: '4 concurrent bids dispatched from T01 and T02 simultaneously',
      expected: `All 4 bids succeed with exact total demand sum ${expectedTotal}`,
      actual: `All succeed: ${concurrentBids.every(b => b.status === 200)}, total demand: ${strpSec?.totalSubscription}`,
      evidence: { totalDemand: strpSec?.totalSubscription, bids: strpSec?.bids },
      status: concBidPass ? 'PASSED' : 'FAILED'
    });

  } finally {
    // Teardown test server
    serverProcess.kill('SIGKILL');
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    }
  }

  // ==========================================================================
  // DOMAIN 5: AUTHORITATIVE STATE & BASELINE IMMUTABILITY
  // ==========================================================================
  console.log('\n--- DOMAIN 5: AUTHORITATIVE BASELINE IMMUTABILITY ---');
  const postHash = getSha256(ORIGINAL_STATE);
  const hashMatches = postHash === EXPECTED_HASH;
  recordResult({
    id: 'ADV-BASE-01',
    domain: 'Baseline Integrity',
    title: 'Authoritative state.json Immutability Verification',
    endpoint: 'Local File System (SAAMX/state.json)',
    scenario: 'Verify SHA-256 hash of state.json after intense adversarial stress testing',
    expected: EXPECTED_HASH,
    actual: postHash,
    evidence: { byteForByteIdentical: hashMatches },
    status: hashMatches ? 'PASSED' : 'FAILED'
  });

  // Write results summary to JSON file
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2), 'utf8');

  console.log('\n' + '='.repeat(80));
  const passedCount = testResults.filter(r => r.status === 'PASSED').length;
  const failedCount = testResults.filter(r => r.status === 'FAILED').length;
  console.log(`TOTAL ADVERSARIAL TESTS: ${testResults.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('='.repeat(80));

  return { total: testResults.length, passed: passedCount, failed: failedCount, results: testResults };
}

runAdversarialWorkflowTestSuite()
  .then(summary => {
    if (summary.failed > 0) {
      console.log(`\n⚠️  Adversarial testing identified ${summary.failed} failure(s)/vulnerabilities.`);
      process.exit(1);
    } else {
      console.log('\n✨ All adversarial tests passed successfully!');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
