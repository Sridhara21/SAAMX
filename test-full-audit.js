/**
 * test-full-audit.js
 * SAAMX 2026 — Master End-to-End System Audit and Pre-Production Verification Suite
 * Executes sequential audits across all 17 critical event domains.
 */

import http from 'http';
import assert from 'assert';
import { MASTER_MARKET_EVENTS } from './src/lib/marketEventsDataset.js';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_PASSWORD = 'fms-event-2026';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': ADMIN_PASSWORD,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const auditResults = [];

async function runDomainAudit(domainName, testFn) {
  process.stdout.write(`Auditing ${domainName.padEnd(26)}... `);
  try {
    await testFn();
    auditResults.push({ domain: domainName, status: 'PASS' });
    console.log('PASS');
  } catch (err) {
    auditResults.push({ domain: domainName, status: 'FAIL', error: err.message });
    console.log(`FAIL (${err.message})`);
  }
}

async function runMasterAudit() {
  console.log('\n======================================================================');
  console.log('SAAMX 2026 — COMPREHENSIVE PRODUCTION READINESS MASTER AUDIT');
  console.log('======================================================================\n');

  // Ensure DB has fresh reset
  await request('POST', '/api/admin/reset', { confirmText: 'RESET ALL', activeTeamCount: 20 });

  // 1. AUTHENTICATION
  await runDomainAudit('AUTHENTICATION', async () => {
    const roles = [
      { role: 'admin', pass: 'fms-event-2026' },
      { role: 'sebi', pass: 'fms-event-2026' },
      { role: 'news', pass: 'journalist-event-2026' },
      { role: 'broker', pass: 'fms-event-2026' }
    ];
    for (const r of roles) {
      const res = await request('POST', '/api/auth/login', { role: r.role, password: r.pass });
      assert.strictEqual(res.status, 200, `Login failed for ${r.role}`);
      assert.strictEqual(res.data.success, true);
    }
    // Reject invalid password
    const failRes = await request('POST', '/api/auth/login', { role: 'admin', password: 'wrong-password' });
    assert.strictEqual(failRes.status, 401, 'Invalid password must be rejected with 401');
  });

  // 2. TEAM PRIVACY
  await runDomainAudit('TEAM PRIVACY', async () => {
    const res = await request('POST', '/api/portfolio', {
      teamCode: 'T02',
      actorTeamCode: 'T01',
      role: 'team'
    });
    assert.strictEqual(res.status, 403, 'Unauthorized portfolio view across teams must return 403 Forbidden');
    
    // Authorized role access
    const authRes = await request('POST', '/api/portfolio', {
      teamCode: 'T02',
      actorTeamCode: 'T01',
      role: 'sebi'
    });
    assert.strictEqual(authRes.status, 200, 'SEBI or Admin role must be authorized to inspect team portfolio');
  });

  // 3. TRADING ENGINE
  await runDomainAudit('TRADING ENGINE', async () => {
    // Open session for trading
    await request('POST', '/api/market/control', { action: 'START', duration: 60 });

    const stateRes = await request('GET', '/api/state');
    const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
    const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR')) || { ticker: 'RELIANCE' };

    // Standard buy trade
    const buyRes = await request('POST', '/api/trade', {
      teamId: 'T01',
      securityId: inStock.ticker,
      action: 'BUY',
      quantity: 10
    });
    assert.strictEqual(buyRes.status, 200, `Buy trade failed: ${JSON.stringify(buyRes.data)}`);
    assert.strictEqual(buyRes.data.success, true);

    // Reject fractional trade
    const fracRes = await request('POST', '/api/trade', {
      teamId: 'T01',
      securityId: inStock.ticker,
      action: 'BUY',
      quantity: 5.5
    });
    assert.strictEqual(fracRes.status, 400, 'Fractional order must return 400 Bad Request');

    // Reject overselling beyond balance
    const overSellRes = await request('POST', '/api/trade', {
      teamId: 'T01',
      securityId: inStock.ticker,
      action: 'SELL',
      quantity: 999999
    });
    assert.strictEqual(overSellRes.status, 400, 'Overselling beyond holding balance must return 400');
  });

  // 4. PRICING ENGINE
  await runDomainAudit('PRICING ENGINE', async () => {
    const stateRes = await request('GET', '/api/state');
    const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
    assert(securities.length > 500, 'Universe must contain full security list');
    const sec = securities.find(s => s.status === 'Active');
    assert(sec, 'Must find active security');
    assert(typeof (sec.currentPrice || sec.basePrice) === 'number' && (sec.currentPrice || sec.basePrice) > 0, 'Security must have positive price');
  });

  // 5. FX ENGINE
  await runDomainAudit('FX ENGINE', async () => {
    const ratesRes = await request('GET', '/api/fx/rates');
    assert.strictEqual(ratesRes.status, 200);
    assert(ratesRes.data.fxRates?.USDINR?.midRate > 0, 'USD/INR mid rate must be positive');

    // Convert INR to USD
    const convRes = await request('POST', '/api/fx/convert', {
      teamCode: 'T01',
      fromCurrency: 'INR',
      toCurrency: 'USD',
      amount: 100000
    });
    assert.strictEqual(convRes.status, 200);
    assert(convRes.data.credited > 0, 'Credited USD must be positive');
  });

  // 6. IPO ENGINE
  await runDomainAudit('IPO ENGINE', async () => {
    const iposRes = await request('GET', '/api/ipos');
    assert.strictEqual(iposRes.status, 200);
    const ipos = iposRes.data.ipos || [];
    assert(ipos.length >= 5, 'Must contain all 5 simulated landmark IPOs');
    ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].forEach(t => {
      assert(ipos.some(i => i.ticker === t), `Missing simulated IPO: ${t}`);
    });

    // Fund Team T01 with USD for bidding
    await request('POST', '/api/admin/team/wallets', {
      teamCode: 'T01',
      wallets: { INR: 10000000, USD: 100000, GBP: 10000, EUR: 10000 }
    });

    // Valid lot size bid
    const bidRes = await request('POST', '/api/ipo/bid', {
      ticker: 'OAI',
      quantity: 50,
      teamCode: 'T01'
    });
    assert.strictEqual(bidRes.status, 200, `IPO Bid failed: ${JSON.stringify(bidRes.data)}`);

    // Allotment & Listing
    const allotRes = await request('POST', '/api/ipo/allot', { ticker: 'OAI' });
    assert.strictEqual(allotRes.status, 200);
    assert(allotRes.data.listingPrice > 0, 'Listing price must be positive');

    // Reject duplicate allotment
    const dupAllot = await request('POST', '/api/ipo/allot', { ticker: 'OAI' });
    assert.strictEqual(dupAllot.status, 400, 'Duplicate allotment must return 400');
  });

  // 7. MARKET EVENTS
  await runDomainAudit('MARKET EVENTS', async () => {
    assert(MASTER_MARKET_EVENTS && MASTER_MARKET_EVENTS.length >= 315, `Expected ~320 events, found ${MASTER_MARKET_EVENTS?.length}`);
    const sampleEvent = MASTER_MARKET_EVENTS[0];
    const trigRes = await request('POST', '/api/events/trigger', {
      event: sampleEvent,
      actor: 'Auditor'
    });
    assert.strictEqual(trigRes.status, 200);
    assert.strictEqual(trigRes.data.success, true);
  });

  // 8. BULL/BEAR
  await runDomainAudit('BULL/BEAR', async () => {
    const stmtRes = await request('POST', '/api/bull-bear/statement', {
      role: 'bull',
      stance: 'STRONGLY BULLISH',
      confidence: 92,
      statement: 'Robust institutional accumulation in semiconductor supply chain.',
      topic: 'AI Compute Supercycle'
    });
    assert.strictEqual(stmtRes.status, 200);
    assert.strictEqual(stmtRes.data.success, true);

    const getRes = await request('GET', '/api/bull-bear/statement');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.bullBear?.bull?.confidence, 92);
  });

  // 9. BROKER INTELLIGENCE
  await runDomainAudit('BROKER INTELLIGENCE', async () => {
    const pubRes = await request('POST', '/api/broker/recommendation', {
      brokerName: 'Institutional Alpha',
      ticker: 'TCS',
      recommendation: 'STRONG BUY',
      confidence: 88,
      riskLevel: 'LOW',
      reasoning: 'Solid deal conversion in BFSI vertical and margin expansion.'
    });
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.success, true);

    const listRes = await request('GET', '/api/broker/recommendations');
    assert.strictEqual(listRes.status, 200);
    assert(listRes.data.recommendations?.length > 0);
  });

  // 10. POLL ENGINE
  let pollId = null;
  await runDomainAudit('POLL ENGINE', async () => {
    const createRes = await request('POST', '/api/polls/create', {
      question: 'Will Nifty reach record highs this session?',
      options: ['Yes (Aggressive Bull)', 'No (Correction Ahead)', 'Sideways Range']
    });
    assert.strictEqual(createRes.status, 200);
    pollId = createRes.data.poll?.id;
    assert(pollId, 'Poll ID must be returned');

    // Vote
    const voteRes = await request('POST', '/api/polls/vote', {
      pollId,
      teamCode: 'T01',
      optionId: 0
    });
    assert.strictEqual(voteRes.status, 200);
    assert.strictEqual(voteRes.data.success, true);

    // Reject duplicate vote
    const dupVote = await request('POST', '/api/polls/vote', {
      pollId,
      teamCode: 'T01',
      optionId: 1
    });
    assert.strictEqual(dupVote.status, 400, 'Duplicate vote from same team must be rejected with 400');
  });

  // 11. ADMIN CONTROLS
  await runDomainAudit('ADMIN CONTROLS', async () => {
    const startRes = await request('POST', '/api/admin/start-market', {});
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.data.success, true);

    const pauseRes = await request('POST', '/api/admin/pause-market', {});
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.data.success, true);

    // Resume
    await request('POST', '/api/admin/start-market', {});
  });

  // 12. PROJECTOR DATA
  await runDomainAudit('PROJECTOR DATA', async () => {
    const stateRes = await request('GET', '/api/state');
    assert.strictEqual(stateRes.status, 200);
    const data = stateRes.data.state || stateRes.data;
    assert(data.marketIndices, 'Must have marketIndices for projector display');
    assert((data.securities || []).length > 0, 'Must have securities');
    assert(data.fxRates, 'Must have fxRates for ticker');
  });

  // 13. AUDIT LOG
  await runDomainAudit('AUDIT LOG', async () => {
    const logRes = await request('GET', '/api/audit-log');
    assert.strictEqual(logRes.status, 200);
    assert(Array.isArray(logRes.data.log), 'Audit log must be an array');
    assert(logRes.data.log.length > 0, 'Audit log must record operational events');
  });

  // 14. BACKUP
  let backupId = null;
  await runDomainAudit('BACKUP', async () => {
    const bkpRes = await request('POST', '/api/admin/backup', {
      actor: 'Master Auditor',
      reason: 'Pre-production readiness check'
    });
    assert.strictEqual(bkpRes.status, 200);
    assert(bkpRes.data.backupId, 'Backup ID must be generated');
    backupId = bkpRes.data.backupId;
  });

  // 15. RESTORE
  await runDomainAudit('RESTORE', async () => {
    assert(backupId, 'Must have valid backupId from previous step');
    
    // Mismatched confirmation phrase must fail
    const failRestore = await request('POST', '/api/admin/restore', {
      backupId,
      confirmPhrase: 'WRONG'
    });
    assert.strictEqual(failRestore.status, 400, 'Mismatched confirm phrase must return 400');

    // Valid restore
    const validRestore = await request('POST', '/api/admin/restore', {
      backupId,
      confirmPhrase: `RESTORE ${backupId}`
    });
    assert.strictEqual(validRestore.status, 200);
    assert.strictEqual(validRestore.data.success, true);
  });

  // 16. RECONCILIATION
  await runDomainAudit('RECONCILIATION', async () => {
    const reconRes = await request('GET', '/api/reconciliation');
    assert.strictEqual(reconRes.status, 200);
    assert(reconRes.data.totalCapital !== undefined, 'Total capital must be reconciled');
  });

  // 17. LEADERBOARD
  await runDomainAudit('LEADERBOARD', async () => {
    const lbRes = await request('GET', '/api/leaderboard');
    assert.strictEqual(lbRes.status, 200);
    const rankings = lbRes.data.leaderboard || [];
    assert(Array.isArray(rankings), 'Leaderboard must be an array');
    assert(rankings.length > 0, 'Leaderboard must list participant teams');
    // Ensure sorted descending by totalCapital or portfolioValue
    for (let i = 0; i < rankings.length - 1; i++) {
      const valA = rankings[i].totalCapital ?? rankings[i].portfolioValue ?? rankings[i].finalNetWorth ?? 0;
      const valB = rankings[i + 1].totalCapital ?? rankings[i + 1].portfolioValue ?? rankings[i + 1].finalNetWorth ?? 0;
      assert(valA >= valB, `Leaderboard must be sorted descending: ${valA} < ${valB}`);
    }
  });

  // REPORT FORMAT REQUIRED BY SPECIFICATION
  console.log('\n======================================================================');
  console.log('SAAMX 2026 FULL SYSTEM AUDIT\n');
  
  auditResults.forEach(r => {
    console.log(`${r.domain.padEnd(28)} ${r.status}`);
  });

  const passedCount = auditResults.filter(r => r.status === 'PASS').length;
  const totalCount = auditResults.length;
  const allPassed = passedCount === totalCount;

  console.log(`\nTOTAL: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log(`STATUS: ${allPassed ? 'EVENT READY' : 'REMEDIATION REQUIRED'}`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMasterAudit().catch(err => {
  console.error('\n❌ Unhandled error in Master Audit Suite:', err);
  process.exit(1);
});
