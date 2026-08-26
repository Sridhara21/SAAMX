import assert from 'assert';

// Mock State for Test
const createMockState = () => ({
  securities: [
    {
      id: 'S01',
      ticker: 'TEST',
      name: 'Test Inc',
      sector: 'Technology',
      type: 'Stock',
      basePrice: 100,
      currentPrice: 100,
      totalUnits: 1000,
      availableUnits: 1000,
      volatility: 0.5,
      status: 'Active',
      logoInitials: 'TE',
      dividendYield: 5.0,
      priceHistory: [{ timestamp: Date.now(), price: 100 }]
    }
  ],
  teams: [
    {
      id: 'T01',
      teamCode: 'T01',
      teamName: 'Titan Retail',
      teamType: 'Retail',
      cashBalance: 100000,
      holdings: {},
      isActive: true,
    }
  ],
  transactions: [],
  corporateActions: []
});

const executeBuy = (state, teamId, securityId, Q) => {
  const team = state.teams.find(t => t.id === teamId);
  const security = state.securities.find(s => s.id === securityId);

  if (!team || !security) throw new Error('Not found');
  if (security.status !== 'Active') throw new Error('Trading halted');

  const executionPrice = security.currentPrice;
  const totalValue = Q * executionPrice;
  const impactFactor = Q / security.totalUnits;
  const priceChangePercent = impactFactor * security.volatility * 100;

  if (Q > security.availableUnits) {
    throw new Error(`Only ${security.availableUnits} units available`);
  }
  if (team.cashBalance < totalValue) {
    throw new Error('Insufficient cash');
  }

  // Update State
  security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
  security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
  security.availableUnits -= Q;

  team.cashBalance = parseFloat((team.cashBalance - totalValue).toFixed(2));
  team.holdings[security.ticker] = (team.holdings[security.ticker] || 0) + Q;
};

const executeSell = (state, teamId, securityId, Q) => {
  const team = state.teams.find(t => t.id === teamId);
  const security = state.securities.find(s => s.id === securityId);

  if (!team || !security) throw new Error('Not found');

  const executionPrice = security.currentPrice;
  const totalValue = Q * executionPrice;
  const impactFactor = Q / security.totalUnits;
  const priceChangePercent = impactFactor * security.volatility * 100;

  const currentHolding = team.holdings[security.ticker] || 0;
  if (Q > currentHolding) {
    throw new Error('Insufficient holdings');
  }

  // Update State
  security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
  security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
  security.availableUnits += Q;

  team.cashBalance = parseFloat((team.cashBalance + totalValue).toFixed(2));
  team.holdings[security.ticker] -= Q;
  if (team.holdings[security.ticker] === 0) {
    delete team.holdings[security.ticker];
  }
};

const applyStockSplit = (state, securityId) => {
  const security = state.securities.find(s => s.id === securityId);
  if (!security) throw new Error('Not found');

  security.totalUnits *= 2;
  security.availableUnits *= 2;
  security.currentPrice = parseFloat((security.currentPrice / 2).toFixed(2));

  state.teams.forEach(team => {
    if (team.holdings[security.ticker]) {
      team.holdings[security.ticker] *= 2;
    }
  });
};

const applyDividend = (state, securityId) => {
  const security = state.securities.find(s => s.id === securityId);
  if (!security) throw new Error('Not found');

  const yieldPct = security.dividendYield;
  state.teams.forEach(team => {
    const held = team.holdings[security.ticker] || 0;
    if (held > 0) {
      const payout = parseFloat((held * (yieldPct / 100) * security.currentPrice).toFixed(2));
      team.cashBalance = parseFloat((team.cashBalance + payout).toFixed(2));
    }
  });
};

// Run Tests
const runTests = () => {
  console.log('Running Pricing Engine Tests...');

  // Test 1: Standard Buy
  let state = createMockState();
  executeBuy(state, 'T01', 'S01', 100);
  assert.strictEqual(state.securities[0].availableUnits, 900);
  // impactFactor = 100 / 1000 = 0.1
  // priceChangePercent = 0.1 * 0.5 * 100 = 5%
  // executionPrice = 100, currentPrice = 100 * 1.05 = 105
  assert.strictEqual(state.securities[0].currentPrice, 105);
  assert.strictEqual(state.teams[0].cashBalance, 90000); // 100000 - 100*100
  assert.strictEqual(state.teams[0].holdings['TEST'], 100);
  console.log('✔ Test 1 passed: Standard Buy execution & pricing impact');

  // Test 2: Reject Buy on Insufficient Units
  state = createMockState();
  assert.throws(() => executeBuy(state, 'T01', 'S01', 1100), /Only 1000 units available/);
  console.log('✔ Test 2 passed: Reject buy exceeding available units');

  // Test 3: Reject Buy on Insufficient Cash
  state = createMockState();
  state.teams[0].cashBalance = 1000;
  assert.throws(() => executeBuy(state, 'T01', 'S01', 200), /Insufficient cash/);
  console.log('✔ Test 3 passed: Reject buy exceeding cash balance');

  // Test 4: Standard Sell
  state = createMockState();
  executeBuy(state, 'T01', 'S01', 200); // Price becomes 110
  assert.strictEqual(state.securities[0].currentPrice, 110);
  executeSell(state, 'T01', 'S01', 100);
  // executionPrice = 110
  // impactFactor = 100 / 1000 = 0.1
  // priceChangePercent = 0.1 * 0.5 * 100 = 5%
  // newPrice = 110 * 0.95 = 104.5
  assert.strictEqual(state.securities[0].currentPrice, 104.5);
  assert.strictEqual(state.securities[0].availableUnits, 900); // 800 + 100
  assert.strictEqual(state.teams[0].holdings['TEST'], 100);
  console.log('✔ Test 4 passed: Standard Sell execution & pricing impact');

  // Test 5: Stock Split
  state = createMockState();
  executeBuy(state, 'T01', 'S01', 100); // Price 105, holding 100, available 900, total 1000
  applyStockSplit(state, 'S01');
  assert.strictEqual(state.securities[0].totalUnits, 2000);
  assert.strictEqual(state.securities[0].availableUnits, 1800);
  assert.strictEqual(state.securities[0].currentPrice, 52.5); // 105 / 2
  assert.strictEqual(state.teams[0].holdings['TEST'], 200);
  console.log('✔ Test 5 passed: Stock Split doubles holdings and units, halves price');

  // Test 6: Dividend Payment
  state = createMockState();
  executeBuy(state, 'T01', 'S01', 200); // Price 110, holding 200, cash 80000
  applyDividend(state, 'S01');
  // payout = 200 * (5.0 / 100) * 110 = 1100
  // cashBalance = 80000 + 1100 = 81100
  assert.strictEqual(state.teams[0].cashBalance, 81100);
  console.log('✔ Test 6 passed: Dividend pays yield correctly to holding teams');

  console.log('All tests completed successfully!');
};

runTests();
