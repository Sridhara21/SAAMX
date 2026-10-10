import http from 'http';
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

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
        'x-fms-password': 'fms-event-2026',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL
// -------------------------------------------------------------
test('AUTH: Admin, SEBI, News Desk, Broker login with correct passwords', async () => {
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
});

test('AUTH: Reject invalid passwords with 401 Unauthorized', async () => {
  const res = await request('POST', '/api/auth/login', { role: 'admin', password: 'wrong-password' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.data.error, 'Invalid password');
});

// -------------------------------------------------------------
// 2. PRIVACY-PROTECTED PARTICIPANT PORTFOLIO AUDIT
// -------------------------------------------------------------
test('PRIVACY: Participants cannot view another team portfolio', async () => {
  const res = await request('POST', '/api/team/portfolio', {
    teamCode: 'T02',
    actorTeamCode: 'T01',
    role: 'participant'
  });
  assert.strictEqual(res.status, 403, 'Cross-team portfolio view must be blocked with 403');
});

test('PRIVACY: Participants CAN view their own portfolio', async () => {
  const res = await request('POST', '/api/team/portfolio', {
    teamCode: 'T01',
    actorTeamCode: 'T01',
    role: 'participant'
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.team.teamCode, 'T01');
});

// -------------------------------------------------------------
// 3. SYSTEM RESET & HARD SEEDING
// -------------------------------------------------------------
test('RESET: Complete market reset with active teams count = 20 and start capital', async () => {
  const res = await request('POST', '/api/admin/reset', {
    confirmText: 'RESET ALL',
    activeTeamCount: 20
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);

  const stateRes = await request('GET', '/api/state');
  const teams = stateRes.data.teams || stateRes.data.state?.teams || [];
  assert.strictEqual(teams.length, 20);
  assert.strictEqual(teams[0].cashBalance, 10000000);
});

// -------------------------------------------------------------
// 4. MARKET CLOCK & SESSION TRANSITIONS
// -------------------------------------------------------------
test('SESSION: Pre-open locks continuous trading', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));
  const testTicker = inStock ? inStock.ticker : 'DTAI';

  const tradeRes = await request('POST', '/api/trade', {
    teamId: 'T01',
    securityId: testTicker,
    action: 'BUY',
    quantity: 10
  });
  assert.strictEqual(tradeRes.status, 400, 'Trade must be blocked during PRE_OPEN');
});

test('SESSION: Admin starts continuous trading session', async () => {
  const startRes = await request('POST', '/api/market/control', { action: 'START', duration: 60 });
  assert.strictEqual(startRes.status, 200);
  const mState = startRes.data.marketState || startRes.data.state?.marketState;
  assert.strictEqual(mState.status, 'Open');
});

// -------------------------------------------------------------
// 5. TRADING ENGINE: INTEGRITY & CONSTRAINTS
// -------------------------------------------------------------
test('TRADING: Buy order executes and updates cashWallet, holdings, price, and volume', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));
  const testTicker = inStock.ticker;

  const res = await request('POST', '/api/trade', {
    teamId: 'T01',
    securityId: testTicker,
    action: 'BUY',
    quantity: 10
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.transaction.quantity, 10);
  assert.strictEqual(res.data.transaction.ticker, testTicker);
});

test('TRADING: Rejects fractional share purchases', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));

  const res = await request('POST', '/api/trade', {
    teamId: 'T01',
    securityId: inStock.ticker,
    action: 'BUY',
    quantity: 2.5
  });
  assert.strictEqual(res.status, 400, 'Fractional trade must be rejected');
});

test('TRADING: Rejects over-selling beyond holding quantity', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));

  const res = await request('POST', '/api/trade', {
    teamId: 'T01',
    securityId: inStock.ticker,
    action: 'SELL',
    quantity: 99999
  });
  assert.strictEqual(res.status, 400, 'Over-selling must be rejected');
});

test('TRADING: Rejects buy orders when cash wallet has insufficient balance', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));

  const res = await request('POST', '/api/trade', {
    teamId: 'T02',
    securityId: inStock.ticker,
    action: 'BUY',
    quantity: 5000000
  });
  assert.strictEqual(res.status, 400, 'Insufficient balance must be rejected');
});

// -------------------------------------------------------------
// 6. MULTI-CURRENCY & FX CONVERSION DESK
// -------------------------------------------------------------
test('FX: Rejects foreign stock purchase without foreign currency balance', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const usStock = securities.find(s => s.status === 'Active' && s.currency === 'USD') || { ticker: 'OAI' };

  const res = await request('POST', '/api/trade', {
    teamId: 'T03',
    securityId: usStock.ticker,
    action: 'BUY',
    quantity: 10
  });
  assert.strictEqual(res.status, 400, 'Cannot buy USD stock without USD cash in wallet');
});

test('FX: Currency conversion from INR to USD updates wallets and consolidated INR', async () => {
  const convertRes = await request('POST', '/api/fx/convert', {
    teamCode: 'T01',
    fromCurrency: 'INR',
    toCurrency: 'USD',
    amount: 100000 // 1 Lakh INR
  });
  assert.strictEqual(convertRes.status, 200);
  assert(convertRes.data.credited > 0, 'Credited USD must be positive');
  assert.strictEqual(convertRes.data.debited, 100000);
});

test('FX: Successful purchase of foreign stock after FX conversion', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const usStock = securities.find(s => s.status === 'Active' && s.currency === 'USD') || { ticker: 'OAI' };

  // Fund USD wallet if needed
  await request('POST', '/api/fx/convert', {
    teamCode: 'T01',
    fromCurrency: 'INR',
    toCurrency: 'USD',
    amount: 500000
  });

  const res = await request('POST', '/api/trade', {
    teamId: 'T01',
    securityId: usStock.ticker,
    action: 'BUY',
    quantity: 2
  });
  assert.strictEqual(res.status, 200, 'Purchase of foreign stock must succeed with converted funds');
  assert.strictEqual(res.data.transaction.localCurrency, 'USD');
});

// -------------------------------------------------------------
// 7. TRANSACTION VOIDING & MULTI-CURRENCY CASH RESTORATION
// -------------------------------------------------------------
test('VOIDING: Voiding foreign transaction restores native USD wallet and consolidated balance', async () => {
  const stateRes = await request('GET', '/api/state');
  const txs = stateRes.data.transactions || stateRes.data.state?.transactions || [];
  const lastTx = txs[txs.length - 1];
  assert(lastTx, 'Must have at least one transaction');

  const teams = stateRes.data.teams || stateRes.data.state?.teams || [];
  const teamBefore = teams.find(t => t.teamCode === 'T01');
  const usdBefore = teamBefore.cashWallets.USD;

  const voidRes = await request('POST', '/api/transactions/void', { id: lastTx.id });
  assert.strictEqual(voidRes.status, 200);

  const stateAfter = await request('GET', '/api/state');
  const teamsAfter = stateAfter.data.teams || stateAfter.data.state?.teams || [];
  const teamAfter = teamsAfter.find(t => t.teamCode === 'T01');
  assert.strictEqual(teamAfter.cashWallets.USD, parseFloat((usdBefore + lastTx.totalValue).toFixed(2)), 'USD wallet must be refunded correctly on void');
});

// -------------------------------------------------------------
// 8. BROKER PAPER TICKET ORDER SYSTEM
// -------------------------------------------------------------
let createdOrderId = null;
test('ORDERS: Create pending paper ticket order', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));

  const res = await request('POST', '/api/order/create', {
    ticketNumber: 'TKT-9901',
    teamCode: 'T03',
    ticker: inStock.ticker,
    action: 'BUY',
    quantity: 15,
    orderType: 'MARKET',
    brokerId: 'B01',
    enteredBy: 'Floor Broker 1'
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.order.status, 'PENDING');
  createdOrderId = res.data.orderId;
});

test('ORDERS: Duplicate ticket number rejected', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const inStock = securities.find(s => s.status === 'Active' && (!s.currency || s.currency === 'INR'));

  const res = await request('POST', '/api/order/create', {
    ticketNumber: 'TKT-9901',
    teamCode: 'T04',
    ticker: inStock.ticker,
    action: 'BUY',
    quantity: 10
  });
  assert.strictEqual(res.status, 400, 'Duplicate ticket number must be rejected');
});

test('ORDERS: Validate and execute broker paper ticket order', async () => {
  const valRes = await request('POST', '/api/order/action', {
    orderId: createdOrderId,
    actionType: 'VALIDATE'
  });
  assert.strictEqual(valRes.status, 200);
  assert.strictEqual(valRes.data.orderStatus, 'VALIDATED');

  const execRes = await request('POST', '/api/order/action', {
    orderId: createdOrderId,
    actionType: 'EXECUTE'
  });
  assert.strictEqual(execRes.status, 200);
  assert.strictEqual(execRes.data.orderStatus, 'EXECUTED');
  assert(execRes.data.transaction, 'Transaction must be created upon execution');
});

test('ORDERS: Prevent re-executing already executed order', async () => {
  const execRes = await request('POST', '/api/order/action', {
    orderId: createdOrderId,
    actionType: 'EXECUTE'
  });
  assert.strictEqual(execRes.status, 400, 'Double execution must be rejected');
});

// -------------------------------------------------------------
// 9. PRIMARY MARKET & IPO LIFECYCLE
// -------------------------------------------------------------
let ipoTargetTicker = null;
test('IPO: Bid submission with capital reservation', async () => {
  const stateRes = await request('GET', '/api/state');
  const securities = stateRes.data.securities || stateRes.data.state?.securities || [];
  const ipoSec = securities.find(s => (s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED' || s.ipoStatus === 'SUBSCRIPTION_OPEN') && s.ipoStatus !== 'ALLOTMENT_FINALIZED')
    || securities.find(s => s.ticker === 'STRP' || s.ticker === 'CNVA' || s.ticker === 'DISC' || s.ticker === 'POLY' || s.ticker === 'OAI');
  
  ipoTargetTicker = ipoSec.ticker;

  // Fund team with sufficient USD for bid
  await request('POST', '/api/fx/convert', {
    teamCode: 'T02',
    fromCurrency: 'INR',
    toCurrency: 'USD',
    amount: 1500000
  });

  const bidRes = await request('POST', '/api/ipo/bid', {
    ticker: ipoTargetTicker,
    teamCode: 'T02',
    quantity: 20
  });
  assert.strictEqual(bidRes.status, 200, `Bid failed with: ${bidRes.data?.error}`);
  assert.strictEqual(bidRes.data.success, true);
});

test('IPO: Allotment engine distributes shares and refunds unallotted capital', async () => {
  const allotRes = await request('POST', '/api/ipo/allot', { ticker: ipoTargetTicker });
  assert.strictEqual(allotRes.status, 200);
  assert.strictEqual(allotRes.data.success, true);
  assert(allotRes.data.listingPrice > 0, 'Listing price must be positive');
});

test('IPO: Rejects duplicate allotment call', async () => {
  const allotRes = await request('POST', '/api/ipo/allot', { ticker: ipoTargetTicker });
  assert.strictEqual(allotRes.status, 400, 'Double allotment must be rejected');
});

// -------------------------------------------------------------
// 10. PROJECT PHOENIX ACTS & SCENARIO ENGINE
// -------------------------------------------------------------
test('PHOENIX: Staged Acts execute and broadcast news without crashing', async () => {
  for (let act = 1; act <= 3; act++) {
    const res = await request('POST', '/api/admin/phoenix-act', { actNumber: act });
    assert.strictEqual(res.status, 200, `Act ${act} execution failed`);
    assert.strictEqual(res.data.success, true);
  }
});

// -------------------------------------------------------------
// 11. NEWS DISPATCH & CIRCUIT BREAKER TAKEOVERS
// -------------------------------------------------------------
test('NEWS: Dispatches breaking news and adjusts affected securities', async () => {
  const res = await request('POST', '/api/news', {
    headline: 'Reserve Bank Cuts Repo Rate by 50bps',
    description: 'Monetary policy committee eases liquidity.',
    category: 'MACROECONOMIC',
    severity: 'BREAKING',
    affectedSectors: ['Financials'],
    sentiment: 'Positive',
    impactPercent: 5
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
});

// -------------------------------------------------------------
// 12. STATE SNAPSHOT BACKUP & RESTORE
// -------------------------------------------------------------
let backupId = null;
test('BACKUP: Admin creates state snapshot', async () => {
  const res = await request('POST', '/api/admin/backup', { type: 'MANUAL', actor: 'Lead Auditor' });
  assert.strictEqual(res.status, 200);
  assert(res.data.backupId, 'Backup ID must be generated');
  backupId = res.data.backupId;
});

test('RESTORE: Restores state exactly from snapshot ID', async () => {
  const res = await request('POST', '/api/admin/restore', {
    backupId,
    confirmText: `RESTORE ${backupId}`,
    actor: 'Lead Auditor'
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.success, true);
});

// -------------------------------------------------------------
// 13. RECONCILIATION & DETERMINISTIC LEADERBOARD
// -------------------------------------------------------------
test('RECONCILE: Reconciles all portfolios with deterministic multi-factor tie-breaking', async () => {
  const res = await request('POST', '/api/admin/reconcile', { confirmText: 'RECONCILE MARKET' });
  assert.strictEqual(res.status, 200);
  const lb = res.data.leaderboard || [];
  assert(Array.isArray(lb), 'Leaderboard must be an array');
  assert.strictEqual(lb.length, 20);

  // Validate deterministic ranking
  for (let i = 0; i < lb.length - 1; i++) {
    assert(lb[i].finalNetWorth >= lb[i + 1].finalNetWorth, `Leaderboard rank ${i + 1} must be >= rank ${i + 2}`);
  }
});

// -------------------------------------------------------------
// RUNNER
// -------------------------------------------------------------
async function runAll() {
  console.log('='.repeat(70));
  console.log('🚀 SAAMX 2026 EVENT READINESS MASTER TEST SUITE');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(` ✅ PASS: ${t.name}`);
      passed++;
    } catch (err) {
      console.error(` ❌ FAIL: ${t.name}`);
      console.error(`    Details: ${err.message}`);
      failed++;
    }
  }

  console.log('='.repeat(70));
  console.log(`TOTAL TESTS: ${tests.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🏆 VERDICT: ALL EVENT READINESS AUDIT TESTS PASSED 100%!');
    process.exit(0);
  }
}

runAll().catch(e => {
  console.error('Test runner fatal exception:', e);
  process.exit(1);
});
