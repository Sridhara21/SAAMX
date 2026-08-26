import assert from 'assert';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_PASSWORD = 'fms-event-2026';
const JOURNALIST_PASSWORD = 'journalist-event-2026';

// Helper for making API requests
async function apiCall(method, path, body = null, password = ADMIN_PASSWORD) {
  const headers = { 'Content-Type': 'application/json' };
  if (password) {
    headers['X-FMS-Password'] = password;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  return { status: response.status, ok: response.ok, data };
}

async function runHardTests() {
  console.log('==================================================');
  console.log('🚀 RUNNING COMPREHENSIVE FMS PLATFORM LOGIC TESTS');
  console.log('==================================================\n');

  try {
    // --------------------------------------------------
    // TEST 1: Authentication Middleware Verification
    // --------------------------------------------------
    console.log('🧪 TEST 1: Authentication Middleware...');
    
    // No password -> should fail
    const authFailNoPass = await apiCall('POST', '/api/admin/settings', { settings: {} }, null);
    assert.strictEqual(authFailNoPass.status, 401, 'Request without password should be unauthorized (401)');

    // Wrong password -> should fail
    const authFailWrongPass = await apiCall('POST', '/api/admin/settings', { settings: {} }, 'wrong-password-123');
    assert.strictEqual(authFailWrongPass.status, 401, 'Request with wrong password should be unauthorized (401)');

    // Journalist trying to access admin configurations -> should be forbidden (403)
    const authFailJournalist = await apiCall('POST', '/api/admin/settings', { settings: {} }, JOURNALIST_PASSWORD);
    assert.strictEqual(authFailJournalist.status, 403, 'Journalist accessing admin settings should get forbidden (403)');

    // Journalist posting news -> should succeed
    const authSuccessNews = await apiCall('POST', '/api/news', {
      headline: 'Test Journalist News Link',
      sentiment: 'Positive',
      impactPercent: 5
    }, JOURNALIST_PASSWORD);
    assert.strictEqual(authSuccessNews.status, 200, 'Journalist posting news should be authorized (200)');
    
    console.log('✔ TEST 1 passed: Authentication and role scopes verified.\n');

    // Reset database to ensure clean state
    console.log('🧹 Resetting database to clean seed state...');
    const resetRes = await apiCall('POST', '/api/admin/reset', {});
    assert.strictEqual(resetRes.status, 200, 'Database reset should succeed');
    console.log('✔ State reset complete.\n');

    // --------------------------------------------------
    // TEST 2: Trade Execution and Pricing Engine (Market Impact)
    // --------------------------------------------------
    console.log('🧪 TEST 2: Trade Execution and Pricing Engine...');
    
    // Let's get initial state
    const stateBeforeTrade = (await apiCall('GET', '/api/state')).data.state;
    const team = stateBeforeTrade.teams.find(t => t.id === 'T01');
    const security = stateBeforeTrade.securities.find(s => s.ticker === 'RELI');

    assert.ok(team, 'Retail Team T01 should exist');
    assert.ok(security, 'Security RELI should exist');

    const initialCash = team.cashBalance;
    const initialPrice = security.currentPrice;
    const initialAvailableUnits = security.availableUnits;

    // Start market
    await apiCall('POST', '/api/market/control', { action: 'START', duration: 60 });

    // Place a BUY trade: Team T01 buys 20 units of RELI
    const buyQty = 20;
    const buyRes = await apiCall('POST', '/api/trade', {
      teamId: 'T01',
      securityId: 'RELI',
      action: 'BUY',
      quantity: buyQty,
      enteredBy: 'Hard Integration Test'
    });

    assert.strictEqual(buyRes.status, 200, `Buy execution failed: ${JSON.stringify(buyRes.data)}`);
    
    // Validate state updates
    const stateAfterBuy = (await apiCall('GET', '/api/state')).data.state;
    const teamAfterBuy = stateAfterBuy.teams.find(t => t.id === 'T01');
    const secAfterBuy = stateAfterBuy.securities.find(s => s.ticker === 'RELI');

    // Cash check: cash = initialCash - qty * initialPrice
    const expectedValue = buyQty * initialPrice;
    const expectedCash = parseFloat((initialCash - expectedValue).toFixed(2));
    assert.strictEqual(teamAfterBuy.cashBalance, expectedCash, 'Cash balance not correctly deducted');

    // Holdings check: holdings of RELI must equal buy quantity
    assert.strictEqual(teamAfterBuy.holdings['RELI'], buyQty, 'Holdings should contain purchased units of RELI');

    // Float check: available units must decrease
    assert.strictEqual(secAfterBuy.availableUnits, initialAvailableUnits - buyQty, 'Available units not correctly updated');

    // Price impact check: currentPrice must increase due to volatility scaling
    // priceChangePercent = (qty / totalUnits) * volatility * 100
    const impactFactor = buyQty / security.totalUnits;
    const priceChangePercent = impactFactor * security.volatility * 100;
    const expectedPrice = parseFloat((initialPrice * (1 + priceChangePercent / 100)).toFixed(2));
    assert.strictEqual(secAfterBuy.currentPrice, expectedPrice, 'Security price impact calculation mismatch');

    console.log('✔ TEST 2 passed: Trade execution updates balances, holdings, available units, and price impact accurately.\n');

    // --------------------------------------------------
    // TEST 3: Circuit Breaker and Halted Securities
    // --------------------------------------------------
    console.log('🧪 TEST 3: Circuit Breakers & Halted Trading...');

    // We will buy repeatedly to trigger a circuit breaker (>30% price change)
    // Let's target DTAI (Fictional AI Stock with base price 218, total units 500, volatility 0.85)
    const dtai = stateBeforeTrade.securities.find(s => s.ticker === 'DTAI');
    
    // Perform multiple buy trades to pump DTAI by >30%
    // Volatility 0.85. Buying 120 units: impact = 120/500 * 0.85 * 100 = 20.4% price spike
    const pumpRes1 = await apiCall('POST', '/api/trade', {
      teamId: 'T02',
      securityId: 'DTAI',
      action: 'BUY',
      quantity: 120,
      enteredBy: 'Pumper Desk'
    });
    assert.strictEqual(pumpRes1.status, 200, 'DTAI first buy trade should succeed');

    // Pump again with another 120 units -> overall price change will exceed 30% threshold
    const pumpRes2 = await apiCall('POST', '/api/trade', {
      teamId: 'T02',
      securityId: 'DTAI',
      action: 'BUY',
      quantity: 120,
      enteredBy: 'Pumper Desk'
    });
    assert.strictEqual(pumpRes2.status, 200, 'DTAI second buy trade should succeed');

    // Verify circuit breaker alert is generated in activeAlerts
    const stateAlertsRes = await apiCall('GET', '/api/state');
    const alerts = stateAlertsRes.data.activeAlerts.map(a => JSON.parse(a));
    const dtaiAlert = alerts.find(a => a.ticker === 'DTAI');
    assert.ok(dtaiAlert, 'Circuit breaker alert should have triggered for DTAI');
    assert.ok(Math.abs(dtaiAlert.changePercent) >= 30, 'Circuit breaker changePercent should be >= 30%');

    // Trigger corporate action: CircuitBreaker (Halt trading) on DTAI
    const CBHaltRes = await apiCall('POST', '/api/corporate-action', {
      securityId: dtai.id,
      actionType: 'CircuitBreaker',
      details: JSON.stringify(dtaiAlert)
    });
    assert.strictEqual(CBHaltRes.status, 200, 'CircuitBreaker halt should succeed');

    // Verify DTAI status is now Halted
    const stateAfterHalt = (await apiCall('GET', '/api/state')).data.state;
    const secAfterHalt = stateAfterHalt.securities.find(s => s.ticker === 'DTAI');
    assert.strictEqual(secAfterHalt.status, 'Halted', 'Security status should be Halted');

    // Verify trading is blocked when halted
    const failTradeRes = await apiCall('POST', '/api/trade', {
      teamId: 'T01',
      securityId: 'DTAI',
      action: 'BUY',
      quantity: 5,
      enteredBy: 'Exchange Operator'
    });
    assert.strictEqual(failTradeRes.status, 400, 'Trading on a halted stock should be blocked (400)');
    assert.ok(failTradeRes.data.error.includes('Halted'), 'Error message should indicate the stock is halted');

    // Unhalt DTAI
    const unhaltRes = await apiCall('POST', '/api/corporate-action', {
      securityId: dtai.id,
      actionType: 'UNHALT',
      details: 'Restoring standard trading availability'
    });
    assert.strictEqual(unhaltRes.status, 200, 'Unhalt corporate action should succeed');

    // Check status is Active again
    const stateAfterUnhalt = (await apiCall('GET', '/api/state')).data.state;
    const secAfterUnhalt = stateAfterUnhalt.securities.find(s => s.ticker === 'DTAI');
    assert.strictEqual(secAfterUnhalt.status, 'Active', 'Security status should return to Active');

    console.log('✔ TEST 3 passed: Circuit breaker monitoring, state-wide halts, and unhalting function properly.\n');

    // --------------------------------------------------
    // TEST 4: Corporate Actions (Stock Splits & Dividends)
    // --------------------------------------------------
    console.log('🧪 TEST 4: Corporate Actions (Splits & Dividends)...');

    // We will buy 50 units of WIPR (Wipro Ltd, base price 485, available units 400)
    const wiprBuyQty = 50;
    const wiprTrade = await apiCall('POST', '/api/trade', {
      teamId: 'T03',
      securityId: 'WIPR',
      action: 'BUY',
      quantity: wiprBuyQty,
      enteredBy: 'Staff Entry Desk'
    });
    assert.strictEqual(wiprTrade.status, 200, 'Trade execution should succeed');

    const stateBeforeSplit = (await apiCall('GET', '/api/state')).data.state;
    const wiprBeforeSplit = stateBeforeSplit.securities.find(s => s.ticker === 'WIPR');
    const teamBeforeSplit = stateBeforeSplit.teams.find(t => t.id === 'T03');

    assert.strictEqual(teamBeforeSplit.holdings['WIPR'], wiprBuyQty, 'Team T03 holdings of WIPR should match purchased units');

    // Trigger Stock Split corporate action
    const splitRes = await apiCall('POST', '/api/corporate-action', {
      securityId: wiprBeforeSplit.id,
      actionType: 'StockSplit',
      details: '2-for-1 Stock Split'
    });
    assert.strictEqual(splitRes.status, 200, 'Stock split should execute successfully');

    // Fetch state and verify split updates
    const stateAfterSplit = (await apiCall('GET', '/api/state')).data.state;
    const wiprAfterSplit = stateAfterSplit.securities.find(s => s.ticker === 'WIPR');
    const teamAfterSplit = stateAfterSplit.teams.find(t => t.id === 'T03');

    // Verify price is halved (approx. float)
    assert.strictEqual(wiprAfterSplit.currentPrice, parseFloat((wiprBeforeSplit.currentPrice / 2).toFixed(2)), 'Stock price should be halved');

    // Verify team holdings doubled
    assert.strictEqual(teamAfterSplit.holdings['WIPR'], wiprBuyQty * 2, 'Team holdings of WIPR should be doubled');

    // Verify security units doubled
    assert.strictEqual(wiprAfterSplit.totalUnits, wiprBeforeSplit.totalUnits * 2, 'Total units should double');
    assert.strictEqual(wiprAfterSplit.availableUnits, wiprBeforeSplit.availableUnits * 2, 'Available units should double');

    // Test Dividend payment
    const dividendRes = await apiCall('POST', '/api/corporate-action', {
      securityId: wiprBeforeSplit.id,
      actionType: 'Dividend',
      details: 'Payout dividend yield'
    });
    assert.strictEqual(dividendRes.status, 200, 'Dividend payment should succeed');

    const stateAfterDividend = (await apiCall('GET', '/api/state')).data.state;
    const teamAfterDividend = stateAfterDividend.teams.find(t => t.id === 'T03');
    const wiprAfterDividend = stateAfterDividend.securities.find(s => s.ticker === 'WIPR');

    // Verify cash balance increased: cashAfterDiv = cashAfterSplit + (heldUnits * yieldPercent / 100 * currentPrice)
    const yieldPct = wiprAfterDividend.dividendYield;
    const heldUnits = teamAfterSplit.holdings['WIPR']; // 100 units
    const expectedPayout = parseFloat((heldUnits * (yieldPct / 100) * wiprAfterDividend.currentPrice).toFixed(2));
    const expectedCashAfterDiv = parseFloat((teamAfterSplit.cashBalance + expectedPayout).toFixed(2));
    
    assert.strictEqual(teamAfterDividend.cashBalance, expectedCashAfterDiv, 'Dividend payout value did not credit cash balance correctly');

    console.log('✔ TEST 4 passed: Stock Split and Dividends execute correctly, modifying holdings and cash balances using Ticker keys.\n');

    // --------------------------------------------------
    // TEST 5: Transaction Voiding Logic (Cash/Holdings Reversion)
    // --------------------------------------------------
    console.log('🧪 TEST 5: Transaction Voiding...');

    const stateBeforeVoid = (await apiCall('GET', '/api/state')).data.state;
    const lastTx = stateBeforeVoid.transactions[stateBeforeVoid.transactions.length - 1];
    
    const teamBeforeVoid = stateBeforeVoid.teams.find(t => t.id === lastTx.teamId);
    const secBeforeVoid = stateBeforeVoid.securities.find(s => s.id === lastTx.securityId);

    const cashBeforeVoid = teamBeforeVoid.cashBalance;
    const holdingsBeforeVoid = teamBeforeVoid.holdings[secBeforeVoid.ticker] || 0;
    const availableBeforeVoid = secBeforeVoid.availableUnits;

    // Void the last transaction (which was the BUY trade from TEST 4)
    const voidRes = await apiCall('POST', '/api/transactions/void', { id: lastTx.id });
    assert.strictEqual(voidRes.status, 200, 'Voiding transaction should succeed');

    const stateAfterVoid = (await apiCall('GET', '/api/state')).data.state;
    const teamAfterVoid = stateAfterVoid.teams.find(t => t.id === lastTx.teamId);
    const secAfterVoid = stateAfterVoid.securities.find(s => s.id === lastTx.securityId);
    const txAfterVoid = stateAfterVoid.transactions.find(t => t.id === lastTx.id);

    // Verify transaction is flagged as voided
    assert.strictEqual(txAfterVoid.voided, true, 'Transaction voided flag should be true');

    // Verify cash balance returned: cashAfterVoid = cashBeforeVoid + tx.totalValue
    const expectedCashAfterVoid = parseFloat((cashBeforeVoid + lastTx.totalValue).toFixed(2));
    assert.strictEqual(teamAfterVoid.cashBalance, expectedCashAfterVoid, 'Voiding trade did not refund cash correctly');

    // Verify holdings returned: holdingsAfterVoid = holdingsBeforeVoid - tx.quantity
    const expectedHoldingsAfterVoid = holdingsBeforeVoid - lastTx.quantity;
    if (expectedHoldingsAfterVoid === 0) {
      assert.strictEqual(teamAfterVoid.holdings[secBeforeVoid.ticker], undefined, 'Holdings should be cleared when quantity reaches zero');
    } else {
      assert.strictEqual(teamAfterVoid.holdings[secBeforeVoid.ticker], expectedHoldingsAfterVoid, 'Holdings not reverted correctly');
    }

    // Verify float returned: availableUnitsAfterVoid = availableUnitsBeforeVoid + tx.quantity
    assert.strictEqual(secAfterVoid.availableUnits, availableBeforeVoid + lastTx.quantity, 'Voiding trade did not restore float availability');

    console.log('✔ TEST 5 passed: Transaction voiding successfully restores cash reserves, holdings, and available float.\n');

    // Close market session
    await apiCall('POST', '/api/market/control', { action: 'CLOSE' });
    console.log('🏁 Market closed. Integration tests completed successfully!');
    console.log('==================================================');
    console.log('✅ ALL TESTS PASSED: FMS CORE LOGIC IS 10/10');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILURE:');
    console.error(error);
    process.exit(1);
  }
}

runHardTests();
