import { db, ref, set, get, update, push } from './firebase.js';
import { runTransaction } from 'firebase/database';
import { INITIAL_SECURITIES_TEMPLATES } from '../../initial_securities.js';

export async function apiFetch(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // Helper for mock Response
  const mockResponse = (data, status = 200) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data
    };
  };

  try {
    // 1. SEED DATABASE
    if (path === '/api/admin/seed') {
      const indianCities = ['Mumbai', 'Bengaluru', 'Chennai', 'Noida', 'Hyderabad', 'Pune', 'Gurugram', 'Kolkata', 'Ahmedabad', 'New Delhi'];
      const firstNames = ['Amit', 'Rajesh', 'Vikram', 'Anil', 'Sanjay', 'Sunil', 'Vijay', 'Rahul', 'Deepak', 'Aarav', 'Neha', 'Pooja', 'Priya', 'Ananya', 'Rohan'];
      const lastNames = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Singh', 'Rao', 'Choudhury', 'Iyer', 'Sen', 'Banerjee'];

      const securities = {};
      INITIAL_SECURITIES_TEMPLATES.forEach((c, index) => {
        const ceo = c.manager || `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const hq = indianCities[Math.floor(Math.random() * indianCities.length)];
        const founded = Math.floor(Math.random() * 35) + 1990;

        let tagline = `Real-world market leader in ${c.sector}.`;
        let about = `Leading enterprise specializing in ${c.sector.toLowerCase()} services, catering to regional and global market segments.`;
        let facts = [];
        let holdings = null;
        let note = null;

        if (c.ticker === 'DTAI') {
          tagline = "Fictional educational simulation asset.";
          about = "Delta AI Labs is a fictional company created for this educational simulation.";
          facts = [
            { label: 'CEO', value: 'Arjun Mehta' },
            { label: 'Founded', value: '2023' },
            { label: 'Type', value: 'Educational Mock Stock' }
          ];
        } else if (c.type === 'Stock') {
          tagline = `Pioneer in Indian ${c.sector} sector.`;
          about = `${c.name} is a major Indian enterprise driving commercial scale in ${c.sector.toLowerCase()} offerings.`;
          facts = [
            { label: 'Revenue', value: `₹${(c.basePrice * 125).toLocaleString()} Cr` },
            { label: 'Net Profit', value: `₹${(c.basePrice * 15).toLocaleString()} Cr` },
            { label: 'Debt-to-Equity', value: (Math.random() * 0.8 + 0.1).toFixed(2) },
            { label: 'CEO', value: ceo }
          ];
        } else if (c.type === 'GlobalEquity') {
          tagline = `Global technology and commerce giant listed internationally.`;
          about = `${c.name} is a global market leader listed on international markets, offering high-growth equity exposure.`;
          facts = [
            { label: 'Listed on', value: c.ticker === 'SAMS' ? 'KRX' : c.ticker === 'BABA' ? 'NYSE' : 'NASDAQ' },
            { label: 'Currency', value: c.ticker === 'SAMS' ? 'KRW' : 'USD' },
            { label: 'CEO', value: ceo },
            { label: 'Country', value: c.ticker === 'SAMS' ? 'South Korea' : c.ticker === 'BABA' ? 'China' : 'USA' }
          ];
          note = 'International stocks carry additional currency risk and geopolitical risk associated with foreign equity exposure.';
        } else if (c.type === 'ETF') {
          tagline = `Passively managed fund tracking the ${c.name}.`;
          about = `Tracks the performance of the underlying index or asset in equal proportion weights.`;
          facts = [
            { label: 'AUM', value: '₹12,450 Cr' },
            { label: 'Expense Ratio', value: '0.15%' },
            { label: 'Category', value: 'Exchange Traded Fund' }
          ];
        } else if (c.type === 'REIT') {
          tagline = `Income-yielding real estate investment trust.`;
          about = `Owns and operates prime commercial office spaces and IT parks across major metro cities.`;
          facts = [
            { label: 'Dividend Yield', value: '7.5%' },
            { label: 'Properties Owned', value: 'Commercial IT Parks' }
          ];
        } else if (c.type === 'InvIT') {
          tagline = `Infrastructure yield investment trust.`;
          about = `Pools investor capital to operate highway toll roads, power grids, and national infrastructure.`;
          facts = [
            { label: 'Sponsor', value: 'PowerGrid / IRB Infra' },
            { label: 'Revenue Model', value: 'Tolls & Tariffs' }
          ];
        } else if (c.type === 'GovernmentBond') {
          tagline = `Fixed income sovereign debt guaranteed by the Government of India.`;
          about = `Sovereign bonds issued by GoI, offering maximum safety and predictable yield rates.`;
          facts = [
            { label: 'Issuer', value: 'Government of India' },
            { label: 'Coupon Rate', value: c.coupon || '7.26%' }
          ];
        } else if (c.type === 'MutualFund') {
          tagline = `Managed equity mutual fund portfolio by ${c.fundHouse}.`;
          about = `${c.name} is a high-growth mutual fund diversified across key market sectors.`;
          
          const topHoldingsMap = {
            'HDFCFLX': 'ICICI Bank (8.2%), HDFC Bank (7.8%), Infosys (6.1%), Reliance Industries (5.9%), Axis Bank (4.7%)',
            'ICICIMID': 'TVS Motors (6.5%), Jindal Steel (5.8%), Federal Bank (5.1%), Tata Communications (4.8%), Bharat Electronics (4.5%)',
            'SBISML': 'Blue Star (7.2%), Carborundum (6.1%), Elgi Equipments (5.5%), Kalpataru (4.8%), KSB Ltd (4.2%)',
            'AXISLTQ': 'Bajaj Finance (9.1%), Avenue Supermarts (8.5%), TCS (7.2%), Kotak Bank (6.8%), ICICI Bank (6.1%)',
            'MIRLAG': 'HDFC Bank (9.5%), ICICI Bank (8.8%), Reliance (8.1%), Infosys (7.5%), Larsen & Loubro (5.2%)',
            'PPFASG': 'Alphabet Inc (8.5%), Microsoft (7.8%), Amazon (6.5%), ITC Ltd (5.2%), HDFC Bank (4.9%)',
            'NIPSMCP': 'Nippon India Small Cap Top 5 Stocks',
            'KOTKEMG': 'Kotak Emerging Equity Top Holdings',
            'DSPMIDC': 'DSP Midcap Fund Top Holdings',
            'QNTACT': 'Quant Active Fund Top Holdings'
          };

          const sectorAllocMap = {
            'HDFCFLX': 'Financials (32%), Tech (18%), FMCG (14%)',
            'ICICIMID': 'Auto (22%), Metals (18%), Financials (15%)',
            'SBISML': 'Capital Goods (28%), Consumer (20%), Chemicals (12%)',
            'AXISLTQ': 'Financials (35%), Retail (22%), Technology (18%)',
            'MIRLAG': 'Financials (38%), Energy (15%), Technology (12%)',
            'PPFASG': 'Technology (28%), Global Equity (22%), Financials (20%)',
            'NIPSMCP': 'Consumer Goods (25%), Finance (20%), Tech (15%)',
            'KOTKEMG': 'Capital Goods (24%), Consumer Discretionary (18%)',
            'DSPMIDC': 'Pharma (22%), Chemicals (18%), Engineering (15%)',
            'QNTACT': 'Financials (28%), Tech (20%), Services (15%)'
          };

          facts = [
            { label: 'Fund House', value: c.fundHouse },
            { label: 'Category', value: c.category },
            { label: 'AUM', value: c.aum },
            { label: 'Fund Manager', value: c.manager },
            { label: 'Expense Ratio', value: c.expenseRatio },
            { label: '5-Yr CAGR', value: c.cagr }
          ];

          holdings = [
            { name: 'Top 5 Holdings', value: topHoldingsMap[c.ticker] || 'Underlying Equity Float' },
            { name: 'Sector Allocation', value: sectorAllocMap[c.ticker] || 'Diversified' },
            { name: 'Why Invest', value: `This fund is professionally managed by ${c.manager} at ${c.fundHouse}, holding a diversified portfolio of market-leading assets to capture consistent compound returns with active risk mitigation.` }
          ];
        }

        securities[c.ticker] = {
          id: `S${String(index + 1).padStart(2, '0')}`,
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          type: c.type === 'GlobalEquity' ? 'Stock' : c.type,
          basePrice: c.basePrice,
          currentPrice: c.basePrice,
          totalUnits: c.totalUnits,
          availableUnits: c.totalUnits,
          volatility: c.volatility,
          riskRating: c.riskRating,
          growthRating: 3,
          status: 'Active',
          description: tagline,
          ceoName: ceo,
          foundedYear: founded,
          headquarters: hq,
          logoInitials: c.ticker.slice(0, 2).toUpperCase(),
          dividendYield: parseFloat((Math.random() * 4 + 1).toFixed(2)),
          priceHistory: [{ timestamp: Date.now(), price: c.basePrice }],
          profileDetails: {
            tagline,
            about,
            facts,
            holdings,
            note
          }
        };
      });

      const teams = {};
      for (let i = 1; i <= 20; i++) {
        const teamCode = `T${String(i).padStart(2, '0')}`;
        teams[teamCode] = {
          id: `T${String(i).padStart(2, '0')}`,
          teamCode,
          teamName: `Trader Elite ${i}`,
          teamType: 'Retail',
          cashBalance: 1000000,
          holdings: {},
          isActive: true,
          createdAt: Date.now()
        };
      }

      await set(ref(db, 'fms/securities'), securities);
      await set(ref(db, 'fms/teams'), teams);
      await set(ref(db, 'fms/marketState'), {
        status: 'NotStarted',
        simulationStartTime: null,
        simulationDurationMinutes: 60,
        marketIndex: 0.00,
        totalTradesCount: 0,
        lastUpdated: Date.now()
      });
      await set(ref(db, 'fms/transactions'), {});
      await set(ref(db, 'fms/newsEvents'), {});
      await set(ref(db, 'fms/corporateActions'), {});
      await set(ref(db, 'fms/velocities'), {});

      return mockResponse({ success: true });
    }

    // 2. MASTER RESET
    if (path === '/api/admin/reset') {
      // Re-seed directly is identical to reset
      return apiFetch('/api/admin/seed', { method: 'POST' });
    }

    // 3. EXECUTE TRADE TRANSACTION
    if (path === '/api/trade') {
      const { teamId, securityId, action, quantity, enteredBy } = body;
      const Q = Number(quantity);
      let executionPrice = 0;
      let transactionObj = null;
      let errorMessage = null;

      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return fms;

        if (fms.marketState.status !== 'Open') {
          errorMessage = 'Trading is only permitted when market status is Open.';
          return;
        }

        const securities = fms.securities || {};
        const teams = fms.teams || {};
        
        let secKey = Object.keys(securities).find(k => k === securityId || securities[k].ticker === securityId);
        let teamKey = Object.keys(teams).find(k => k === teamId || teams[k].teamCode === teamId);

        const security = secKey ? securities[secKey] : null;
        const team = teamKey ? teams[teamKey] : null;

        if (!security) {
          errorMessage = 'Security not found.';
          return;
        }
        if (!team) {
          errorMessage = 'Team not found.';
          return;
        }

        if (security.status !== 'Active') {
          errorMessage = `Trading halted: Company is ${security.status}.`;
          return;
        }

        executionPrice = security.currentPrice;
        const totalValue = Q * executionPrice;
        const impactFactor = Q / security.totalUnits;
        const priceChangePercent = impactFactor * security.volatility * 100;

        if (action === 'BUY') {
          if (Q > security.availableUnits) {
            errorMessage = `Only ${security.availableUnits} units available.`;
            return;
          }
          if (team.cashBalance < totalValue) {
            errorMessage = `Insufficient cash. Team has ₹${team.cashBalance.toLocaleString('en-IN')}, need ₹${totalValue.toLocaleString('en-IN')}.`;
            return;
          }

          security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          if (security.priceHistory.length > 100) security.priceHistory.shift();
          security.availableUnits -= Q;

          team.cashBalance = parseFloat((team.cashBalance - totalValue).toFixed(2));
          if (!team.holdings) team.holdings = {};
          team.holdings[security.ticker] = (team.holdings[security.ticker] || 0) + Q;

        } else if (action === 'SELL') {
          const currentHolding = team.holdings ? (team.holdings[security.ticker] || 0) : 0;
          if (Q > currentHolding) {
            errorMessage = `Insufficient holdings. Team holds ${currentHolding} units.`;
            return;
          }

          security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          if (security.priceHistory.length > 100) security.priceHistory.shift();
          security.availableUnits += Q;

          team.cashBalance = parseFloat((team.cashBalance + totalValue).toFixed(2));
          team.holdings[security.ticker] -= Q;
          if (team.holdings[security.ticker] === 0) {
            delete team.holdings[security.ticker];
          }
        }

        if (!fms.transactions) fms.transactions = {};
        const txCount = Object.keys(fms.transactions).length;
        const txId = `TX${String(txCount + 1).padStart(4, '0')}`;
        
        transactionObj = {
          id: txId,
          timestamp: Date.now(),
          teamId: team.teamCode,
          teamCode: team.teamCode,
          teamName: team.teamName,
          teamType: 'Retail',
          securityId: security.ticker,
          ticker: security.ticker,
          action,
          quantity: Q,
          priceAtExecution: executionPrice,
          totalValue,
          enteredBy: enteredBy || 'Staff Desk',
          voided: false
        };

        fms.transactions[txId] = transactionObj;
        
        let totalChange = 0;
        let activeCount = 0;
        Object.values(securities).forEach(s => {
          if (s.status === 'Active') {
            const pct = ((s.currentPrice - s.basePrice) / s.basePrice) * 100;
            totalChange += pct;
            activeCount++;
          }
        });
        fms.marketState.marketIndex = activeCount > 0 ? parseFloat((totalChange / activeCount).toFixed(2)) : 0;
        fms.marketState.totalTradesCount = (fms.marketState.totalTradesCount || 0) + 1;
        fms.marketState.lastUpdated = Date.now();

        return fms;
      });

      if (errorMessage) return mockResponse({ error: errorMessage }, 400);
      return mockResponse({ success: true, executionPrice, transaction: transactionObj });
    }

    // 4. MARKET SESSION CONTROLLER
    if (path === '/api/market/control' || path === '/api/market') {
      const { action, duration } = body;
      const now = Date.now();
      let updatedMarketState = null;

      await runTransaction(ref(db, 'fms/marketState'), (marketState) => {
        if (!marketState) {
          marketState = {
            status: 'NotStarted',
            simulationStartTime: null,
            simulationDurationMinutes: 60,
            marketIndex: 0.00,
            pauseTimeOffset: 0,
            pausedAt: null
          };
        }

        if (action === 'START') {
          marketState.status = 'Open';
          marketState.simulationStartTime = now;
          marketState.pauseTimeOffset = 0;
          marketState.pausedAt = null;
          if (duration) marketState.simulationDurationMinutes = Number(duration);
        } else if (action === 'PAUSE') {
          marketState.status = 'Paused';
          marketState.pausedAt = now;
        } else if (action === 'RESUME') {
          marketState.status = 'Open';
          if (marketState.pausedAt) {
            marketState.pauseTimeOffset += (now - marketState.pausedAt);
          }
          marketState.pausedAt = null;
        } else if (action === 'CLOSE') {
          marketState.status = 'Closed';
        }

        marketState.lastUpdated = now;
        updatedMarketState = marketState;
        return marketState;
      });

      return mockResponse({ success: true, marketState: updatedMarketState });
    }

    // 5. DISPATCH NEWS
    if (path === '/api/news') {
      const { headline, description, affectedSecurityIds, affectedSector, sentiment, impactPercent, category } = body;
      const impact = Number(impactPercent);
      const direction = sentiment === 'Positive' ? 1 : sentiment === 'Negative' ? -1 : 0;
      let newsItem = null;

      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return fms;

        const securities = fms.securities || {};
        const newsEvents = fms.newsEvents || {};
        const newsCount = Object.keys(newsEvents).length;
        const newsId = `NW${String(newsCount + 1).padStart(3, '0')}`;

        const targetSecurities = [];
        Object.keys(securities).forEach(k => {
          const s = securities[k];
          if (s.status === 'Active') {
            if (affectedSecurityIds && affectedSecurityIds.includes(s.ticker)) {
              targetSecurities.push(s);
            } else if (affectedSector && s.sector === affectedSector) {
              targetSecurities.push(s);
            }
          }
        });

        targetSecurities.forEach(security => {
          const oldPrice = security.currentPrice;
          security.currentPrice = parseFloat((oldPrice * (1 + (direction * impact) / 100)).toFixed(2));
          if (security.currentPrice < 1) security.currentPrice = 1;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
        });

        newsItem = {
          id: newsId,
          headline,
          description: description || '',
          affectedSecurityIds: targetSecurities.map(t => t.ticker),
          affectedSector: affectedSector || null,
          sentiment,
          impactPercent: impact,
          triggeredAt: Date.now(),
          isCustom: true,
          category: category || 'Macro'
        };

        if (!fms.newsEvents) fms.newsEvents = {};
        fms.newsEvents[newsId] = newsItem;

        return fms;
      });

      return mockResponse({ success: true, newsItem });
    }

    // 6. PRICE OVERRIDES & VELOCITY CONFIGS
    if (path === '/api/price-override') {
      const { securityId, type, price, targetPrice, durationSeconds, percentChange } = body;
      const ticker = securityId ? securityId.toUpperCase() : null;

      if (type === 'Instant') {
        await runTransaction(ref(db, `fms/securities/${ticker}`), (security) => {
          if (!security) return security;
          security.currentPrice = Number(price);
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          if (security.priceHistory.length > 100) security.priceHistory.shift();
          return security;
        });
        return mockResponse({ success: true });
      }

      if (type === 'Shift') {
        await runTransaction(ref(db, `fms/securities/${ticker}`), (security) => {
          if (!security) return security;
          security.currentPrice = parseFloat((security.currentPrice * (1 + Number(percentChange) / 100)).toFixed(2));
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          return security;
        });
        return mockResponse({ success: true });
      }

      if (type === 'Velocity') {
        const snap = await get(ref(db, `fms/securities/${ticker}`));
        if (!snap.exists()) return mockResponse({ error: 'Security not found' }, 404);
        const security = snap.val();
        
        await set(ref(db, `fms/velocities/${ticker}`), {
          ticker,
          targetPrice: Number(targetPrice),
          startPrice: security.currentPrice,
          startTime: Date.now(),
          durationMs: (Number(durationSeconds) || 60) * 1000,
          active: true
        });
        return mockResponse({ success: true });
      }

      if (type === 'StopVelocity') {
        await set(ref(db, `fms/velocities/${ticker}`), null);
        return mockResponse({ success: true });
      }
    }

    // 7. CORPORATE ACTION DISPATCH
    if (path === '/api/corporate-action') {
      const { securityId, actionType, details } = body;
      let actionLog = null;

      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return fms;

        const securities = fms.securities || {};
        const corporateActions = fms.corporateActions || {};
        const actionsCount = Object.keys(corporateActions).length;
        const actionId = `CA${String(actionsCount + 1).padStart(3, '0')}`;

        let secKey = Object.keys(securities).find(k => k === securityId || securities[k].ticker === securityId);
        const security = secKey ? securities[secKey] : null;

        actionLog = {
          id: actionId,
          securityId: security ? security.ticker : null,
          actionType,
          details: details || '',
          triggeredAt: Date.now()
        };

        if (actionType === 'CircuitBreaker' && security) {
          security.status = 'Halted';
        } else if (actionType === 'UNHALT' && security) {
          security.status = 'Active';
        } else if (actionType === 'StockSplit' && security) {
          security.totalUnits *= 2;
          security.availableUnits *= 2;
          security.currentPrice = parseFloat((security.currentPrice / 2).toFixed(2));
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

          Object.keys(fms.teams || {}).forEach(k => {
            const team = fms.teams[k];
            if (team.holdings && team.holdings[security.ticker]) {
              team.holdings[security.ticker] *= 2;
            }
          });
        } else if (actionType === 'Bankruptcy' && security) {
          security.status = 'Bankrupt';
          security.currentPrice = 0;
          security.availableUnits = 0;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: 0 });
        } else if (actionType === 'Delisting' && security) {
          security.status = 'Delisted';
          security.currentPrice = 0;
          security.availableUnits = 0;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: 0 });
        }

        if (actionType !== 'DISMISS_ALERT') {
          if (!fms.corporateActions) fms.corporateActions = {};
          fms.corporateActions[actionId] = actionLog;
        }

        return fms;
      });

      return mockResponse({ success: true, actionLog });
    }

    // 8. TEAMS CRUD
    if (path.startsWith('/api/teams')) {
      if (method === 'GET') {
        const snap = await get(ref(db, 'fms/teams'));
        return mockResponse(snap.exists() ? Object.values(snap.val()) : []);
      }
      if (method === 'POST') {
        const codeUpper = body.teamCode.toUpperCase();
        await set(ref(db, `fms/teams/${codeUpper}`), {
          id: `T_${codeUpper}`,
          teamCode: codeUpper,
          teamName: body.teamName,
          teamType: 'Retail',
          cashBalance: Number(body.cashBalance) || 1000000,
          holdings: {},
          isActive: true,
          createdAt: Date.now()
        });
        return mockResponse({ success: true });
      }
      if (method === 'PUT') {
        const codeUpper = body.teamCode.toUpperCase();
        await update(ref(db, `fms/teams/${codeUpper}`), {
          teamName: body.teamName,
          cashBalance: Number(body.cashBalance)
        });
        return mockResponse({ success: true });
      }
      if (method === 'DELETE') {
        const id = path.split('/').pop().toUpperCase();
        await set(ref(db, `fms/teams/${id}`), null);
        return mockResponse({ success: true });
      }
    }

    // 9. SECURITIES CRUD
    if (path.startsWith('/api/securities')) {
      if (method === 'GET') {
        const snap = await get(ref(db, 'fms/securities'));
        return mockResponse(snap.exists() ? Object.values(snap.val()) : []);
      }
      if (method === 'POST') {
        const tickerUpper = body.ticker.toUpperCase();
        await set(ref(db, `fms/securities/${tickerUpper}`), {
          id: `S_${tickerUpper}`,
          ticker: tickerUpper,
          name: body.name,
          sector: body.sector || 'Technology',
          type: body.type || 'Stock',
          basePrice: Number(body.basePrice) || 100,
          currentPrice: Number(body.basePrice) || 100,
          totalUnits: Number(body.totalUnits) || 100,
          availableUnits: Number(body.totalUnits) || 100,
          volatility: Number(body.volatility) || 0.5,
          riskRating: body.riskRating || 'Medium',
          status: 'Active',
          priceHistory: [{ timestamp: Date.now(), price: Number(body.basePrice) || 100 }]
        });
        return mockResponse({ success: true });
      }
      if (method === 'PUT') {
        const tickerUpper = body.ticker.toUpperCase();
        await update(ref(db, `fms/securities/${tickerUpper}`), body);
        return mockResponse({ success: true });
      }
    }

    // 10. GLOBAL CONTROLS
    if (path === '/api/global-control') {
      const { action } = body;
      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return fms;

        const securities = fms.securities || {};
        const newsEvents = fms.newsEvents || {};
        const newsCount = Object.keys(newsEvents).length;
        const newsId = `NW_GLB_${Date.now()}`;

        if (action === 'BULL_RUN') {
          Object.keys(securities).forEach(k => {
            if (securities[k].status === 'Active') securities[k].sentimentOverride = 2;
          });
          fms.newsEvents[newsId] = {
            id: newsId,
            headline: 'GLOBAL MARKET RALLY INITIATED',
            description: 'Strong bullish sentiment sweeps across all trading desks.',
            sentiment: 'Positive',
            impactPercent: 0,
            triggeredAt: Date.now(),
            category: 'Macro'
          };
        } else if (action === 'CRASH') {
          Object.keys(securities).forEach(k => {
            if (securities[k].status === 'Active') securities[k].sentimentOverride = -2;
          });
          fms.newsEvents[newsId] = {
            id: newsId,
            headline: 'SYSTEMIC MARKET CORRECTION',
            description: 'Panic selling triggers widespread index downward drift.',
            sentiment: 'Negative',
            impactPercent: 0,
            triggeredAt: Date.now(),
            category: 'Macro'
          };
        } else if (action === 'RESET_SENTIMENT') {
          Object.keys(securities).forEach(k => {
            securities[k].sentimentOverride = 0;
          });
        } else if (action === 'FREEZE_ALL') {
          Object.keys(securities).forEach(k => {
            if (securities[k].status === 'Active') securities[k].status = 'Halted';
          });
        } else if (action === 'RESUME_ALL') {
          Object.keys(securities).forEach(k => {
            if (securities[k].status === 'Halted') securities[k].status = 'Active';
          });
        }

        return fms;
      });

      return mockResponse({ success: true });
    }

    // 11. PROJECT PHOENIX ACTS
    if (path === '/api/admin/phoenix-act') {
      const { actNumber } = body;
      const act = Number(actNumber);
      let triggeredNews = null;
      let triggeredAction = null;

      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return fms;

        const securities = fms.securities || {};
        const newsEvents = fms.newsEvents || {};
        const corporateActions = fms.corporateActions || {};
        const dtai = securities['DTAI'];
        if (!dtai) return;

        const newsId = `NW_PHX_${act}_${Date.now()}`;
        const actionId = `CA_PHX_${act}_${Date.now()}`;

        if (act === 1) {
          dtai.sentimentOverride = -1;
          dtai.currentPrice = parseFloat((dtai.currentPrice * 0.78).toFixed(2));
          if (!dtai.priceHistory) dtai.priceHistory = [];
          dtai.priceHistory.push({ timestamp: Date.now(), price: dtai.currentPrice });

          triggeredNews = {
            id: newsId,
            headline: 'Delta AI Labs Reports Shock ₹285 Crore Quarterly Loss — Misses Estimates by 340%',
            description: 'Delta AI Labs has reported a net loss of ₹285 crore for Q2 FY26, catastrophically missing consensus estimates. The company cites rising compute infrastructure costs.',
            sentiment: 'Negative',
            impactPercent: 22,
            triggeredAt: Date.now(),
            category: 'Corporate',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

        } else if (act === 2) {
          dtai.sentimentOverride = 0;
          if (!fms.velocities) fms.velocities = {};
          fms.velocities['DTAI'] = {
            ticker: 'DTAI',
            targetPrice: 210,
            startPrice: dtai.currentPrice,
            startTime: Date.now(),
            durationMs: 120000,
            active: true
          };

          triggeredNews = {
            id: newsId,
            headline: 'Singapore-Based PE Consortium Acquires Strategic Stake in Delta AI Labs',
            description: 'Regulatory filings reveal a Singapore-registered entity has acquired a 12% stake in DTAI. Speculators eye proprietary patents.',
            sentiment: 'Positive',
            impactPercent: 12,
            triggeredAt: Date.now(),
            category: 'Corporate',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

        } else if (act === 3) {
          const ticker = 'ISFT';
          fms.securities[ticker] = {
            id: `S_${ticker}`,
            ticker,
            name: 'IndiaStack Fintech Ltd',
            sector: 'Fintech / Technology',
            type: 'Stock',
            basePrice: 285,
            currentPrice: 285,
            totalUnits: 180,
            availableUnits: 180,
            volatility: 0.75,
            riskRating: 'High',
            status: 'IPO_PENDING',
            priceHistory: [{ timestamp: Date.now(), price: 285 }]
          };

          triggeredAction = {
            id: actionId,
            securityId: ticker,
            actionType: 'IPO',
            details: 'IndiaStack Fintech Ltd IPO initiated',
            triggeredAt: Date.now()
          };
          fms.corporateActions[actionId] = triggeredAction;

        } else if (act === 4) {
          dtai.sentimentOverride = 2;
          if (!fms.velocities) fms.velocities = {};
          fms.velocities['DTAI'] = {
            ticker: 'DTAI',
            targetPrice: 420,
            startPrice: dtai.currentPrice,
            startTime: Date.now(),
            durationMs: 60000,
            active: true
          };

          triggeredNews = {
            id: newsId,
            headline: 'EXCLUSIVE: Delta AI Labs New CEO Former Goldman Sachs MD — Major Mandate Expected',
            description: 'Incoming CEO has deep institutional relationships. Market expects massive allocation announcements.',
            sentiment: 'Positive',
            impactPercent: 18,
            triggeredAt: Date.now(),
            category: 'Corporate',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

        } else if (act === 5) {
          dtai.sentimentOverride = 1;
          if (!fms.velocities) fms.velocities = {};
          fms.velocities['DTAI'] = {
            ticker: 'DTAI',
            targetPrice: 450,
            startPrice: dtai.currentPrice,
            startTime: Date.now(),
            durationMs: 60000,
            active: true
          };

          triggeredNews = {
            id: newsId,
            headline: 'RUMOUR: Tata Sons Evaluating Majority Stake Acquisition in Delta AI Labs',
            description: 'Speculation spreads on trading floors regarding a potential buyout offer from the Tata group.',
            sentiment: 'Positive',
            impactPercent: 15,
            triggeredAt: Date.now(),
            category: 'Corporate',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

        } else if (act === 6) {
          dtai.sentimentOverride = -2;
          dtai.currentPrice = parseFloat((dtai.currentPrice * 0.75).toFixed(2));
          if (!dtai.priceHistory) dtai.priceHistory = [];
          dtai.priceHistory.push({ timestamp: Date.now(), price: dtai.currentPrice });

          triggeredNews = {
            id: newsId,
            headline: '⚖️ SEBI/FMS/2026/0089 — SEBI INITIATES FORMAL INVESTIGATION INTO DTAI',
            description: 'SEBI orders forensic audit into Delta AI Labs citing suspicious price manipulation and whistleblower complaints.',
            sentiment: 'Negative',
            impactPercent: 25,
            triggeredAt: Date.now(),
            category: 'Policy',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

          triggeredAction = {
            id: actionId,
            securityId: 'DTAI',
            actionType: 'CircuitBreaker',
            details: 'SEBI opened formal investigation',
            triggeredAt: Date.now()
          };
          fms.corporateActions[actionId] = triggeredAction;

        } else if (act === 7) {
          dtai.sentimentOverride = -2;
          dtai.currentPrice = parseFloat((dtai.currentPrice * 0.70).toFixed(2));
          if (!dtai.priceHistory) dtai.priceHistory = [];
          dtai.priceHistory.push({ timestamp: Date.now(), price: dtai.currentPrice });

          triggeredNews = {
            id: newsId,
            headline: 'SCANDAL: Former DTAI CEO, CFO, and CTO Liquidated Holdings 72 Hours Before Loss Announcement',
            description: 'Audit traces promoters selling ₹500 Cr stake to offshore shells, confirming insider dump.',
            sentiment: 'Negative',
            impactPercent: 30,
            triggeredAt: Date.now(),
            category: 'Scandal',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

        } else if (act === 8) {
          dtai.status = 'Halted';
          triggeredNews = {
            id: newsId,
            headline: '⚖️ SEBI NOTICE: IMMEDIATE SUSPENSION OF TRADING IN DELTA AI LABS',
            description: 'Trading in DTAI suspended under Section 11(4)(b) of the SEBI Act. Liquidity frozen.',
            sentiment: 'Neutral',
            impactPercent: 0,
            triggeredAt: Date.now(),
            category: 'Policy',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

          triggeredAction = {
            id: actionId,
            securityId: 'DTAI',
            actionType: 'CircuitBreaker',
            details: 'SEBI trading suspension ordered',
            triggeredAt: Date.now()
          };
          fms.corporateActions[actionId] = triggeredAction;

        } else if (act === 9) {
          dtai.status = 'Bankrupt';
          dtai.currentPrice = 0;
          dtai.availableUnits = 0;
          if (!dtai.priceHistory) dtai.priceHistory = [];
          dtai.priceHistory.push({ timestamp: Date.now(), price: 0 });

          triggeredNews = {
            id: newsId,
            headline: '⚖️ SEBI NOTICE: DELTA AI LABS DECLARED INSOLVENT — SHARES VALUE ₹0',
            description: 'NCLT grants liquidation order. Shares declared worthless. Patents auctioned to creditors.',
            sentiment: 'Negative',
            impactPercent: 0,
            triggeredAt: Date.now(),
            category: 'Scandal',
            affectedSecurityIds: ['DTAI']
          };
          fms.newsEvents[newsId] = triggeredNews;

          triggeredAction = {
            id: actionId,
            securityId: 'DTAI',
            actionType: 'Bankruptcy',
            details: 'Insolvency liquidation granted',
            triggeredAt: Date.now()
          };
          fms.corporateActions[actionId] = triggeredAction;
        }

        return fms;
      });

      return mockResponse({ success: true, triggeredNews, triggeredAction });
    }

    // 12. AI CHAT ASSISTANT COMMAND PARSER
    if (path === '/api/admin/ai-chat') {
      const text = body.message.toLowerCase();
      const executedCmds = [];
      let responseText = "I parsed your query but couldn't map it directly to a local command template.";

      if (text.includes('anthropic') && text.includes('ipo')) {
        await apiFetch('/api/admin/phoenix-act', { method: 'POST', body: { actNumber: 7 } });
        responseText = "Triggering Anthropic AI India IPO launch sequence (Act 7). The projector will display the 8-second Initial Public Offering announcement takeover.";
      } else if (text.includes('indiastack') && text.includes('ipo')) {
        await apiFetch('/api/admin/phoenix-act', { method: 'POST', body: { actNumber: 3 } });
        responseText = "Triggering IndiaStack Fintech IPO launch sequence (Act 3). The projector will display the 8-second Initial Public Offering announcement takeover.";
      } else if (text.includes('phoenix act') || text.includes('fire act')) {
        const match = text.match(/(?:act|phase)\s*(\d+)/i);
        if (match) {
          const actNum = Number(match[1]);
          await apiFetch('/api/admin/phoenix-act', { method: 'POST', body: { actNumber: actNum } });
          responseText = `Firing Project Phoenix Act ${actNum}. Live news bulletin and asset transitions will propagate to Projector.`;
        }
      } else if (text.includes('crash the banking sector')) {
        await apiFetch('/api/global-control', { method: 'POST', body: { action: 'CRASH' } });
        responseText = `Instructing systemic crash on Banking sector. Sentiment dial set to Extreme Bear.`;
      }

      return mockResponse({ response: responseText, executed: executedCmds });
    }

    // 13. SETTINGS
    if (path === '/api/admin/settings') {
      await update(ref(db, 'fms/settings'), body.settings || {});
      return mockResponse({ success: true });
    }

    return mockResponse({ error: 'Endpoint mock not mapped.' }, 404);
  } catch (err) {
    console.error(`Mock API Error on ${path}:`, err);
    return mockResponse({ error: err.message }, 500);
  }
}
