import { db, ref, set, get, update, push } from './firebase.js';
import { runTransaction } from 'firebase/database';
import { INITIAL_SECURITIES_TEMPLATES } from '../../initial_securities.js';

async function setTakeoverEvent(eventObj, durationMs = 6000) {
  const fullEvent = { ...eventObj, id: Math.random().toString(36).substring(2) };
  await set(ref(db, 'fms/marketState/takeoverEvent'), fullEvent);
  setTimeout(async () => {
    try {
      const snap = await get(ref(db, 'fms/marketState/takeoverEvent'));
      if (snap.exists() && snap.val().id === fullEvent.id) {
        await set(ref(db, 'fms/marketState/takeoverEvent'), null);
      }
    } catch (e) {
      console.error('Error clearing takeover event:', e);
    }
  }, durationMs);
}

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
      const { mode, confirmText, activeTeamCount } = body || {};

      if (!mode || (mode !== 'TEST' && mode !== 'EVENT')) {
        return mockResponse({ error: 'Reset mode must be specified (TEST or EVENT).' }, 400);
      }

      const expectedConfirm = `RESET ${mode}`;
      if (confirmText !== expectedConfirm) {
        return mockResponse({ error: `Incorrect confirmation. Please type exactly "${expectedConfirm}".` }, 400);
      }

      if (typeof activeTeamCount !== 'number' || activeTeamCount < 10 || activeTeamCount > 20) {
        return mockResponse({ error: 'Active team count must be an integer between 10 and 20.' }, 400);
      }

      // Check current market state
      const marketStateSnap = await get(ref(db, 'fms/marketState'));
      const currentMarketState = marketStateSnap.val();
      if (currentMarketState && currentMarketState.status === 'Open') {
        return mockResponse({ error: 'MARKET IS CURRENTLY OPEN. CLOSE THE MARKET BEFORE MASTER RESET.' }, 400);
      }

      // Get current state snapshot (for backup or stats report)
      const currentFmsSnap = await get(ref(db, 'fms'));
      const currentFms = currentFmsSnap.val() || {};

      const prevSessionId = currentFms.marketState?.sessionId || 'unknown';
      const prevTxCount = currentFms.transactions ? Object.keys(currentFms.transactions).length : 0;
      const prevNewsCount = currentFms.newsEvents ? Object.keys(currentFms.newsEvents).length : 0;
      const prevBankruptCount = currentFms.securities 
        ? Object.values(currentFms.securities).filter(s => s.status === 'Bankrupt').length 
        : 0;
      const prevOverridesCount = currentFms.securities
        ? Object.values(currentFms.securities).filter(s => s.sentimentOverride !== undefined && s.sentimentOverride !== 0).length
        : 0;

      // Generate Session ID
      const timestampStr = new Date().toISOString().slice(2, 16).replace(/[-T:]/g, '');
      const newSessionId = `SAAMX-${mode}-${timestampStr}`;

      // Perform backup for EVENT RESET
      if (mode === 'EVENT') {
        try {
          if (currentFmsSnap.exists()) {
            await set(ref(db, `fms/backups/${prevSessionId}_backup_${Date.now()}`), currentFms);
            console.log(`Event backup created for session ${prevSessionId}`);
          }
        } catch (backupErr) {
          return mockResponse({ error: `Backup failed: ${backupErr.message}. Reset aborted.` }, 500);
        }
      }

      // Read configuration
      const settings = currentFms.settings || { startingCapitalRetail: 1000000 };
      const startingCapital = Number(settings.startingCapitalRetail) || 1000000;
      const durationMins = currentFms.marketState?.simulationDurationMinutes || 60;

      // Seed securities
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

      // Seed teams
      const teams = {};
      for (let i = 1; i <= 20; i++) {
        const teamCode = `T${String(i).padStart(2, '0')}`;
        const active = i <= activeTeamCount;
        teams[teamCode] = {
          id: `T${String(i).padStart(2, '0')}`,
          teamCode,
          teamName: `Trader Elite ${i}`,
          teamType: 'Retail',
          cashBalance: startingCapital,
          holdings: {},
          portfolioValue: startingCapital,
          roi: 0,
          pnl: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          tradeCount: 0,
          isActive: active,
          createdAt: Date.now()
        };
      }

      let verificationError = null;

      const result = await runTransaction(ref(db, 'fms'), (fms) => {
        const nextState = {
          securities,
          teams,
          marketState: {
            status: 'NotStarted',
            simulationStartTime: null,
            simulationDurationMinutes: durationMins,
            pauseTimeOffset: 0,
            pausedAt: null,
            marketIndex: 0.00,
            totalTradesCount: 0,
            lastUpdated: Date.now(),
            sessionId: newSessionId,
            activeTeamCount
          },
          settings,
          transactions: {},
          newsEvents: {},
          corporateActions: {},
          firedPhoenixActs: {},
          velocities: {},
          backups: fms && fms.backups ? fms.backups : {}
        };

        // Verification Checks
        const secCount = Object.keys(nextState.securities).length;
        if (secCount !== INITIAL_SECURITIES_TEMPLATES.length) {
          verificationError = `Securities count mismatch: expected ${INITIAL_SECURITIES_TEMPLATES.length}, got ${secCount}`;
          return;
        }

        const teamCount = Object.keys(nextState.teams).length;
        if (teamCount !== 20) {
          verificationError = `Teams count mismatch: expected 20, got ${teamCount}`;
          return;
        }

        const actualActiveCount = Object.values(nextState.teams).filter(t => t.isActive).length;
        if (actualActiveCount !== activeTeamCount) {
          verificationError = `Active teams count mismatch: expected ${activeTeamCount}, got ${actualActiveCount}`;
          return;
        }

        for (const t of Object.values(nextState.teams)) {
          if (t.isActive) {
            if (t.cashBalance !== startingCapital || t.portfolioValue !== startingCapital) {
              verificationError = `Team cash or portfolio value mismatch for ${t.teamCode}`;
              return;
            }
            if (t.holdings && Object.keys(t.holdings).length > 0) {
              verificationError = `Holdings not empty for active team ${t.teamCode}`;
              return;
            }
            if (t.roi !== 0 || t.tradeCount !== 0 || t.pnl !== 0 || t.realizedPnL !== 0 || t.unrealizedPnL !== 0) {
              verificationError = `ROI/trade count stats not reset for active team ${t.teamCode}`;
              return;
            }
          }
        }

        for (const s of Object.values(nextState.securities)) {
          if (s.currentPrice !== s.basePrice || s.availableUnits !== s.totalUnits) {
            verificationError = `Security pricing/float mismatch for ${s.ticker}`;
            return;
          }
          if (s.status !== 'Active') {
            verificationError = `Security ${s.ticker} status is not Active`;
            return;
          }
        }

        if (nextState.marketState.status !== 'NotStarted') {
          verificationError = `Market status expected NotStarted, got ${nextState.marketState.status}`;
          return;
        }

        return nextState;
      });

      if (verificationError) {
        return mockResponse({ error: `RESET VERIFICATION FAILED: ${verificationError}` }, 500);
      }

      if (!result.committed) {
        return mockResponse({ error: 'RESET FAILED: Concurrency collision or abort during commit.' }, 500);
      }

      const resetReport = {
        status: 'SUCCESS',
        sessionId: newSessionId,
        activeTeamCount,
        teamsCount: 20,
        securitiesCount: INITIAL_SECURITIES_TEMPLATES.length,
        transactionsCleared: prevTxCount,
        newsCleared: prevNewsCount,
        bankruptciesReset: prevBankruptCount,
        overridesCleared: prevOverridesCount,
        startingCapital,
        marketState: 'CLOSED',
        timestamp: Date.now()
};

      // Write reset report as Firebase database source of truth
      await set(ref(db, 'fms/lastResetReport'), resetReport);

      return mockResponse({ success: true, report: resetReport });
    }

    // 3. EXECUTE TRADE TRANSACTION
    if (path === '/api/trade') {
      const { teamId, securityId, action, quantity, enteredBy } = body;
      const Q = Number(quantity);
      let executionPrice = 0;
      let transactionObj = null;

      // 1. Fetch directories to resolve keys and check state
      const [securitiesSnap, teamsSnap, marketStateSnap] = await Promise.all([
        get(ref(db, 'fms/securities')),
        get(ref(db, 'fms/teams')),
        get(ref(db, 'fms/marketState'))
      ]);

      if (!securitiesSnap.exists() || !teamsSnap.exists() || !marketStateSnap.exists()) {
        return mockResponse({ error: 'Database state not initialized.' }, 400);
      }

      const securities = securitiesSnap.val();
      const teams = teamsSnap.val();
      const marketState = marketStateSnap.val();

      if (marketState.status !== 'Open') {
        return mockResponse({ error: 'Trading is only permitted when market status is Open.' }, 400);
      }

      let secKey = Object.keys(securities).find(k => k === securityId || securities[k].ticker === securityId);
      let teamKey = Object.keys(teams).find(k => k === teamId || teams[k].teamCode === teamId);

      if (!secKey || !teamKey) {
        return mockResponse({ error: 'Security or Team not found in database.' }, 400);
      }

      const security = securities[secKey];
      const team = teams[teamKey];

      if (security.status !== 'Active') {
        return mockResponse({ error: `${security.ticker} is currently ${security.status} — trading not permitted.` }, 400);
      }

      executionPrice = security.currentPrice;
      const totalValue = Q * executionPrice;
      const impactFactor = Q / security.totalUnits;
      const priceChangePercent = impactFactor * security.volatility * 100;
      const cashBalance = Number(team.cashBalance);

      if (action === 'BUY') {
        if (Q > security.availableUnits) {
          return mockResponse({ error: `Only ${security.availableUnits} units available.` }, 400);
        }
        if (cashBalance < totalValue) {
          return mockResponse({ error: `Insufficient cash. Team has ₹${cashBalance.toLocaleString('en-IN')}, need ₹${totalValue.toLocaleString('en-IN')}.` }, 400);
        }
      } else if (action === 'SELL') {
        const currentHolding = Number(team.holdings?.[security.ticker] || 0);
        if (Q > currentHolding) {
          return mockResponse({ error: `Insufficient holdings. Team holds ${currentHolding} units of ${security.ticker}.` }, 400);
        }
      }

      // 2. Update the security price, history, and available units atomically
      const secUpdateResult = await runTransaction(ref(db, `fms/securities/${secKey}`), (sec) => {
        if (!sec) return;
        
        if (action === 'BUY') {
          sec.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
          sec.availableUnits -= Q;
        } else {
          sec.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
          sec.availableUnits += Q;
        }
        
        if (!sec.priceHistory) sec.priceHistory = [];
        sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
        if (sec.priceHistory.length > 100) sec.priceHistory.shift();
        
        return sec;
      });

      if (!secUpdateResult.committed) {
        return mockResponse({ error: 'Order execution failed: Security state conflict. Please try again.' }, 400);
      }

      // 3. Update the team balance and holdings atomically
      const teamUpdateResult = await runTransaction(ref(db, `fms/teams/${teamKey}`), (tm) => {
        if (!tm) return;
        
        if (action === 'BUY') {
          tm.cashBalance = parseFloat((tm.cashBalance - totalValue).toFixed(2));
          if (!tm.holdings) tm.holdings = {};
          tm.holdings[security.ticker] = (tm.holdings[security.ticker] || 0) + Q;
        } else {
          tm.cashBalance = parseFloat((tm.cashBalance + totalValue).toFixed(2));
          tm.holdings[security.ticker] -= Q;
          if (tm.holdings[security.ticker] === 0) {
            delete tm.holdings[security.ticker];
          }
        }
        
        return tm;
      });

      if (!teamUpdateResult.committed) {
        // Rollback security if team update fails (to maintain consistency)
        await runTransaction(ref(db, `fms/securities/${secKey}`), (sec) => {
          if (!sec) return;
          if (action === 'BUY') {
            sec.availableUnits += Q;
          } else {
            sec.availableUnits -= Q;
          }
          if (sec.priceHistory) sec.priceHistory.pop();
          sec.currentPrice = sec.priceHistory && sec.priceHistory.length > 0
            ? sec.priceHistory[sec.priceHistory.length - 1].price
            : sec.basePrice;
          return sec;
        });
        return mockResponse({ error: 'Order execution failed: Team balance conflict. Please try again.' }, 400);
      }

      // 4. Write transaction log
      const txCountSnap = await get(ref(db, 'fms/transactions'));
      const txCount = txCountSnap.exists() ? Object.keys(txCountSnap.val()).length : 0;
      const txId = `TX${String(txCount + 1).padStart(4, '0')}`;

      transactionObj = {
        id: txId,
        timestamp: Date.now(),
        teamId: team.teamCode,
        teamCode: team.teamCode,
        teamName: team.teamName,
        teamType: 'Retail',
        securityId: security.id,
        ticker: security.ticker,
        action,
        quantity: Q,
        priceAtExecution: executionPrice,
        totalValue,
        enteredBy: enteredBy || 'Staff Desk',
        voided: false
      };

      await set(ref(db, `fms/transactions/${txId}`), transactionObj);

      // 5. Update global market index and total trades count atomically
      let totalChange = 0;
      let activeCount = 0;
      Object.values(securities).forEach(s => {
        if (s.ticker === security.ticker) {
          // Use the newly computed price for the active security
          const updatedPrice = action === 'BUY'
            ? parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2))
            : Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
          const pct = ((updatedPrice - s.basePrice) / s.basePrice) * 100;
          totalChange += pct;
          activeCount++;
        } else if (s.status === 'Active') {
          const pct = ((s.currentPrice - s.basePrice) / s.basePrice) * 100;
          totalChange += pct;
          activeCount++;
        }
      });
      const marketIndex = activeCount > 0 ? parseFloat((totalChange / activeCount).toFixed(2)) : 0;

      await runTransaction(ref(db, 'fms/marketState'), (mState) => {
        if (!mState) return;
        mState.marketIndex = marketIndex;
        mState.totalTradesCount = (mState.totalTradesCount || 0) + 1;
        mState.lastUpdated = Date.now();
        return mState;
      });

      return mockResponse({ success: true, executionPrice, transaction: transactionObj });
    }

    // 4. MARKET SESSION CONTROLLER
    if (path === '/api/market/control' || path === '/api/market') {
      const { action, duration } = body;
      let updatedMarketState = null;

      let serverTimeOffset = 0;
      try {
        const offsetSnap = await get(ref(db, '.info/serverTimeOffset'));
        serverTimeOffset = offsetSnap.val() || 0;
      } catch (e) {
        console.error("Failed to fetch server time offset:", e);
      }
      const now = Date.now() + serverTimeOffset;

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
          setTakeoverEvent({ type: 'OPENING_BELL' }, 6000);
        } else if (action === 'PAUSE') {
          marketState.status = 'Paused';
          marketState.pausedAt = now;
        } else if (action === 'RESUME') {
          marketState.status = 'Open';
          if (!marketState.simulationStartTime) {
            marketState.simulationStartTime = now;
          }
          if (marketState.pausedAt) {
            marketState.pauseTimeOffset += (now - marketState.pausedAt);
          }
          marketState.pausedAt = null;
          setTakeoverEvent({ type: 'OPENING_BELL' }, 6000);
        } else if (action === 'CLOSE') {
          marketState.status = 'Closed';
          setTakeoverEvent({ type: 'CLOSING_BELL' }, 6000);
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

      // 1. Fetch child snapshot nodes directly
      const securitiesSnap = await get(ref(db, 'fms/securities'));
      const newsEventsSnap = await get(ref(db, 'fms/newsEvents'));

      const securities = securitiesSnap.exists() ? securitiesSnap.val() : {};
      const newsEvents = newsEventsSnap.exists() ? newsEventsSnap.val() : {};
      const newsCount = Object.keys(newsEvents).length;
      const newsId = `NW${String(newsCount + 1).padStart(3, '0')}`;

      const targetSecurities = [];
      Object.keys(securities).forEach(k => {
        const s = securities[k];
        if (s && s.status === 'Active') {
          if (affectedSecurityIds && affectedSecurityIds.includes(s.ticker)) {
            targetSecurities.push(s);
          } else if (affectedSector && s.sector === affectedSector) {
            targetSecurities.push(s);
          }
        }
      });

      // 2. Perform narrow transaction updates on each target security individual node
      for (const targetSec of targetSecurities) {
        await runTransaction(ref(db, `fms/securities/${targetSec.ticker}`), (security) => {
          if (!security) return targetSec;
          const oldPrice = security.currentPrice;
          security.currentPrice = parseFloat((oldPrice * (1 + (direction * impact) / 100)).toFixed(2));
          if (security.currentPrice < 1) security.currentPrice = 1;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          
          if (security.priceHistory.length > 200) {
            security.priceHistory.shift();
          }
          return security;
        });
      }

      // 3. Write news item directly to database
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

      await set(ref(db, `fms/newsEvents/${newsId}`), newsItem);

      // 4. Trigger news flash takeover
      setTakeoverEvent({
        type: 'NEWS_FLASH',
        name: headline,
        ticker: description || 'Breaking Market Alert'
      }, 8000);

      return mockResponse({ success: true, newsItem });
    }

    // 6. PRICE OVERRIDES & VELOCITY CONFIGS
    if (path === '/api/price-override') {
      const { securityId, type, price, targetPrice, durationSeconds, percentChange } = body;
      const ticker = securityId ? securityId.toUpperCase() : null;

      if (type === 'Instant') {
        await runTransaction(ref(db, `fms/securities/${ticker}`), (security) => {
          if (!security) return;
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
          if (!security) return;
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
        if (!fms) return;

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
          setTakeoverEvent({ type: 'MARKET_HALT', ticker: security.ticker, name: security.name }, 6000);
        } else if (actionType === 'UNHALT' && security) {
          security.status = 'Active';
        } else if ((actionType === 'StockSplit' || actionType === 'BonusIssue') && security) {
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
        } else if (actionType === 'Dividend' && security) {
          const dividendAmount = parseFloat(details) || 10;
          security.currentPrice = Math.max(1, parseFloat((security.currentPrice - dividendAmount).toFixed(2)));
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

          Object.keys(fms.teams || {}).forEach(k => {
            const team = fms.teams[k];
            if (team.holdings && team.holdings[security.ticker]) {
              const qty = team.holdings[security.ticker];
              team.cashBalance = parseFloat((team.cashBalance + (qty * dividendAmount)).toFixed(2));
            }
          });
        } else if (actionType === 'Bankruptcy' && security) {
          security.status = 'Bankrupt';
          security.currentPrice = 0;
          security.availableUnits = 0;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: 0 });
          setTakeoverEvent({ type: 'BANKRUPTCY', ticker: security.ticker, name: security.name }, 10000);
        } else if (actionType === 'Delisting' && security) {
          security.status = 'Delisted';
          security.currentPrice = 0;
          security.availableUnits = 0;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: 0 });
          setTakeoverEvent({ type: 'BANKRUPTCY', ticker: security.ticker, name: security.name }, 10000);
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
        let tickerOrId = path.substring('/api/securities/'.length).trim().toUpperCase();
        if (!tickerOrId && body.ticker) {
          tickerOrId = body.ticker.toUpperCase();
        }
        if (!tickerOrId) {
          return mockResponse({ error: 'Security identifier is required.' }, 400);
        }

        let targetTicker = tickerOrId;
        const snap = await get(ref(db, 'fms/securities'));
        if (snap.exists()) {
          const securities = snap.val() || {};
          const matchedKey = Object.keys(securities).find(k => k.toUpperCase() === tickerOrId || (securities[k].id && securities[k].id.toUpperCase() === tickerOrId));
          if (matchedKey) {
            targetTicker = matchedKey;
          }
        }

        if (body.status === 'Active') {
          const snapSec = await get(ref(db, `fms/securities/${targetTicker}`));
          if (snapSec.exists() && snapSec.val().status === 'IPO_PENDING') {
            setTakeoverEvent({ type: 'IPO_LAUNCH', ticker: snapSec.val().ticker, name: snapSec.val().name }, 8000);
          }
        }
        await update(ref(db, `fms/securities/${targetTicker}`), body);

        if (body.currentPrice !== undefined) {
          await runTransaction(ref(db, `fms/securities/${targetTicker}`), (sec) => {
            if (!sec) return;
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: Number(body.currentPrice) });
            return sec;
          });
        }
        return mockResponse({ success: true });
      }
    }

    // VOID TRANSACTION
    if (path === '/api/transactions/void') {
      const { id } = body;
      let txObj = null;
      let errorMessage = null;

      const result = await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return;

        const transactions = fms.transactions || {};
        const tx = transactions[id];

        if (!tx) {
          errorMessage = 'Transaction not found.';
          return;
        }
        if (tx.voided) {
          errorMessage = 'Transaction already voided.';
          return;
        }

        const securities = fms.securities || {};
        const teams = fms.teams || {};

        let secKey = Object.keys(securities).find(k => k === tx.securityId || securities[k].ticker === tx.securityId);
        let teamKey = Object.keys(teams).find(k => k === tx.teamId || teams[k].teamCode === tx.teamId);

        const security = secKey ? securities[secKey] : null;
        const team = teamKey ? teams[teamKey] : null;

        if (team) {
          if (tx.action === 'BUY') {
            team.cashBalance = parseFloat((Number(team.cashBalance) + Number(tx.totalValue)).toFixed(2));
            if (team.holdings && team.holdings[tx.ticker]) {
              team.holdings[tx.ticker] -= Number(tx.quantity);
              if (team.holdings[tx.ticker] <= 0) {
                delete team.holdings[tx.ticker];
              }
            }
          } else if (tx.action === 'SELL') {
            team.cashBalance = parseFloat((Number(team.cashBalance) - Number(tx.totalValue)).toFixed(2));
            if (!team.holdings) team.holdings = {};
            team.holdings[tx.ticker] = (team.holdings[tx.ticker] || 0) + Number(tx.quantity);
          }
        }

        if (security) {
          if (tx.action === 'BUY') {
            security.availableUnits += Number(tx.quantity);
          } else if (tx.action === 'SELL') {
            security.availableUnits = Math.max(0, security.availableUnits - Number(tx.quantity));
          }
        }

        tx.voided = true;

        // Recalculate market Index
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
        fms.marketState.lastUpdated = Date.now();

        txObj = tx;
        return fms;
      });

      if (errorMessage) return mockResponse({ error: errorMessage }, 400);
      if (!result.committed) return mockResponse({ error: 'Failed to void transaction due to database concurrency.' }, 400);
      return mockResponse({ success: true, transaction: txObj });
    }

    // Sentiment Override per security
    if (path === '/api/sentiment-override') {
      const { securityId, sentiment } = body;
      const ticker = securityId.toUpperCase();
      await runTransaction(ref(db, `fms/securities/${ticker}`), (security) => {
        if (!security) return;
        security.sentimentOverride = Number(sentiment);
        return security;
      });
      return mockResponse({ success: true });
    }

    // 10. GLOBAL CONTROLS
    if (path === '/api/global-control' || path === '/api/admin/global-control') {
      const { action } = body;
      await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return;

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

    // VELOCITY CONTROL
    if (path === '/api/admin/velocity-control') {
      const { securityId, targetPrice, durationSeconds } = body;
      const ticker = securityId ? securityId.toUpperCase() : null;
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

    // 11. PROJECT PHOENIX ACTS
    if (path === '/api/admin/phoenix-act') {
      const { actNumber } = body;
      const act = Number(actNumber);
      let triggeredNews = null;
      let triggeredAction = null;

      // 1. Check if act already fired using a narrow transaction
      let actAlreadyFired = false;
      await runTransaction(ref(db, `fms/firedPhoenixActs/${act}`), (firedTime) => {
        if (firedTime) {
          actAlreadyFired = true;
          return firedTime;
        }
        return Date.now();
      });

      if (actAlreadyFired) {
        return mockResponse({ success: true, message: 'Act already fired' });
      }

      // 2. Fetch child nodes once
      const newsEventsSnap = await get(ref(db, 'fms/newsEvents'));
      const newsEvents = newsEventsSnap.exists() ? newsEventsSnap.val() : {};
      const newsCount = Object.keys(newsEvents).length;

      const dtaiSnap = await get(ref(db, 'fms/securities/DTAI'));
      const dtai = dtaiSnap.exists() ? dtaiSnap.val() : null;

      const newsId = `NW_PHX_${act}_${Date.now()}`;
      const actionId = `CA_PHX_${act}_${Date.now()}`;

      if (act === 1) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = -1;
            sec.currentPrice = parseFloat((sec.currentPrice * 0.78).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

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
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 2) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = 0;
            return sec;
          });
          await set(ref(db, 'fms/velocities/DTAI'), {
            ticker: 'DTAI',
            targetPrice: 210,
            startPrice: dtai.currentPrice,
            startTime: Date.now(),
            durationMs: 120000,
            active: true
          });
        }

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
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 3) {
        const ticker = 'ISFT';
        const isftData = {
          id: `S_${ticker}`,
          ticker,
          name: 'IndiaStack Fintech Ltd',
          sector: 'Fintech / Technology',
          type: 'Stock',
          basePrice: 285,
          currentPrice: 285,
          totalUnits: 150,
          availableUnits: 150,
          volatility: 0.75,
          riskRating: 'High',
          status: 'IPO_PENDING',
          priceHistory: [{ timestamp: Date.now(), price: 285 }]
        };
        await set(ref(db, `fms/securities/${ticker}`), isftData);

        triggeredAction = {
          id: actionId,
          securityId: ticker,
          actionType: 'IPO',
          details: 'IndiaStack Fintech Ltd IPO initiated',
          triggeredAt: Date.now()
        };
        await set(ref(db, `fms/corporateActions/${actionId}`), triggeredAction);

        triggeredNews = {
          id: newsId,
          headline: 'IPO Alert: IndiaStack Fintech Ltd Announces Upcoming Blockbuster Public Offering',
          description: 'Subscription bidding is staged. Initial base price set at ₹285 per share. Bidding starts shortly.',
          sentiment: 'Positive',
          impactPercent: 0,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['ISFT']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 4) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = -1;
            sec.currentPrice = parseFloat((sec.currentPrice * 0.92).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'Delta AI Labs CEO Resigns Suddenly Citing Auditing Concerns; Shares Down 8%',
          description: 'The executive committee confirmed the departure of the CEO this morning. Forensic audits are expected to review capital structure entries.',
          sentiment: 'Negative',
          impactPercent: 8,
          triggeredAt: Date.now(),
          category: 'Corporate',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 5) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = 2;
            return sec;
          });
          await set(ref(db, 'fms/velocities/DTAI'), {
            ticker: 'DTAI',
            targetPrice: 420,
            startPrice: dtai.currentPrice,
            startTime: Date.now(),
            durationMs: 180000,
            active: true
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'PUMP PHASE: Delta AI Labs Appoints Former Goldman Sachs MD as CEO; Targets ₹420',
          description: 'Wall Street veteran takes the helm of Delta AI Labs. Board signals major restructures and capital commitments.',
          sentiment: 'Positive',
          impactPercent: 18,
          triggeredAt: Date.now(),
          category: 'Corporate',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 6) {
        triggeredNews = {
          id: newsId,
          headline: 'SEBI Reportedly Monitoring Unusual Volume Spikes in DTAI',
          description: 'Regulator shifts surveillance attention to Delta AI Labs citing abnormal volatility dials.',
          sentiment: 'Neutral',
          impactPercent: 0,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 7) {
        const ticker = 'ANTH';
        const anthData = {
          id: `S_${ticker}`,
          ticker,
          name: 'Anthropic AI India Ltd',
          sector: 'Technology',
          type: 'Stock',
          basePrice: 440,
          currentPrice: 440,
          totalUnits: 200,
          availableUnits: 200,
          volatility: 0.60,
          riskRating: 'Medium',
          status: 'IPO_PENDING',
          priceHistory: [{ timestamp: Date.now(), price: 440 }]
        };
        await set(ref(db, `fms/securities/${ticker}`), anthData);

        triggeredAction = {
          id: actionId,
          securityId: ticker,
          actionType: 'IPO',
          details: 'Anthropic AI India Ltd IPO initiated',
          triggeredAt: Date.now()
        };
        await set(ref(db, `fms/corporateActions/${actionId}`), triggeredAction);

        triggeredNews = {
          id: newsId,
          headline: 'IPO Staging: Anthropic AI India Ltd Files Prospectus; Price Band Set at ₹440',
          description: 'Subscription window opened in staged status. Trading console activation pending.',
          sentiment: 'Positive',
          impactPercent: 0,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['ANTH']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 8) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.currentPrice = parseFloat((sec.currentPrice * 1.08).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'SPECULATION: Tata Group Rumored to Acquire Strategic Stake in Delta AI Labs',
          description: 'Unconfirmed reports of acquisition talks spark massive speculative retail buying in DTAI.',
          sentiment: 'Positive',
          impactPercent: 8,
          triggeredAt: Date.now(),
          category: 'Macro',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 9) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = -2;
            sec.currentPrice = parseFloat((sec.currentPrice * 0.75).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: '⚖️ SEBI INITIATES FORENSIC INVESTIGATION INTO DELTA AI LABS FOR PROMOTER TRANSACTIONS',
          description: 'SEBI mandates forensic audit into promoter holdings citing whistle-blower disclosures.',
          sentiment: 'Negative',
          impactPercent: 25,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

        triggeredAction = {
          id: actionId,
          securityId: 'DTAI',
          actionType: 'CircuitBreaker',
          details: 'SEBI opened forensic audit',
          triggeredAt: Date.now()
        };
        await set(ref(db, `fms/corporateActions/${actionId}`), triggeredAction);

      } else if (act === 10) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.sentimentOverride = -2;
            sec.currentPrice = parseFloat((sec.currentPrice * 0.70).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'AUDIT SCANDAL: Delta AI Promoters Accused of Liquidating Stake Prior to Audit Notice',
          description: 'Whistle-blower reports trace massive offshore shell liquidation hours before SEBI order.',
          sentiment: 'Negative',
          impactPercent: 30,
          triggeredAt: Date.now(),
          category: 'Scandal',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 11) {
        const anthSnap = await get(ref(db, 'fms/securities/ANTH'));
        const anth = anthSnap.exists() ? anthSnap.val() : null;
        if (anth) {
          await runTransaction(ref(db, 'fms/securities/ANTH'), (sec) => {
            if (!sec) return anth;
            sec.sentimentOverride = 2;
            sec.currentPrice = parseFloat((sec.currentPrice * 1.10).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'Sector Rally: Anthropic AI India Guidance Drives Widespread Bull Run in Tech Stocks',
          description: 'Anthropic AI releases optimistic compute growth guidance, sparking positive flows across tech sector listings.',
          sentiment: 'Positive',
          impactPercent: 10,
          triggeredAt: Date.now(),
          category: 'Macro',
          affectedSecurityIds: ['ANTH']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 12) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.status = 'Halted';
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: '⚖️ SEBI INTERIM ORDER: SUSPENSION OF TRADING IN DELTA AI LABS EFFECTIVE IMMEDIATELY',
          description: 'Trading in DTAI suspended under Section 11 of the SEBI Act. Liquidity frozen.',
          sentiment: 'Neutral',
          impactPercent: 0,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

        triggeredAction = {
          id: actionId,
          securityId: 'DTAI',
          actionType: 'CircuitBreaker',
          details: 'Trading suspended by regulator',
          triggeredAt: Date.now()
        };
        await set(ref(db, `fms/corporateActions/${actionId}`), triggeredAction);

      } else if (act === 13) {
        if (dtai) {
          await runTransaction(ref(db, 'fms/securities/DTAI'), (sec) => {
            if (!sec) return dtai;
            sec.status = 'Bankrupt';
            sec.currentPrice = 0;
            sec.availableUnits = 0;
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: 0 });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'NCLT DECREE: Delta AI Labs Declared Bankrupt; Promoters Liquidated; Shares Worthless',
          description: 'Shares declared worthless. Assets scheduled for creditor auction.',
          sentiment: 'Negative',
          impactPercent: 0,
          triggeredAt: Date.now(),
          category: 'Scandal',
          affectedSecurityIds: ['DTAI']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

        triggeredAction = {
          id: actionId,
          securityId: 'DTAI',
          actionType: 'Bankruptcy',
          details: 'Insolvency declaration',
          triggeredAt: Date.now()
        };
        await set(ref(db, `fms/corporateActions/${actionId}`), triggeredAction);

      } else if (act === 14) {
        const securitiesSnap = await get(ref(db, 'fms/securities'));
        const securities = securitiesSnap.exists() ? securitiesSnap.val() : {};
        for (const k of Object.keys(securities)) {
          if (securities[k].status === 'Active' && securities[k].ticker !== 'DTAI') {
            await runTransaction(ref(db, `fms/securities/${k}`), (sec) => {
              if (!sec) return;
              sec.currentPrice = parseFloat((sec.currentPrice * 1.05).toFixed(2));
              if (!sec.priceHistory) sec.priceHistory = [];
              sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
              return sec;
            });
          }
        }

        triggeredNews = {
          id: newsId,
          headline: 'Market Stabilizes: Technical Rebound Lifts Tech Indices After Delta AI Shockwaves',
          description: 'Capital reallocation from DTAI to bluechip tech assets creates index recovery.',
          sentiment: 'Positive',
          impactPercent: 5,
          triggeredAt: Date.now(),
          category: 'Macro',
          affectedSecurityIds: []
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);

      } else if (act === 15) {
        const anthSnap = await get(ref(db, 'fms/securities/ANTH'));
        const anth = anthSnap.exists() ? anthSnap.val() : null;
        if (anth) {
          await runTransaction(ref(db, 'fms/securities/ANTH'), (sec) => {
            if (!sec) return anth;
            sec.sentimentOverride = 2;
            sec.currentPrice = parseFloat((sec.currentPrice * 1.08).toFixed(2));
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
            return sec;
          });
        }

        triggeredNews = {
          id: newsId,
          headline: 'Sovereign Deal: Anthropic AI India Secures ₹1,200 Cr Sovereign Compute Project',
          description: 'Government signs strategic procurement agreement for secure sovereign AI compute hardware.',
          sentiment: 'Positive',
          impactPercent: 8,
          triggeredAt: Date.now(),
          category: 'Policy',
          affectedSecurityIds: ['ANTH']
        };
        await set(ref(db, `fms/newsEvents/${newsId}`), triggeredNews);
      }

      // Trigger takeover dispatches
      if (act === 3) {
        setTakeoverEvent({
          type: 'IPO_PENDING',
          ticker: 'ISFT',
          name: 'IndiaStack Fintech Ltd',
          ipoPrice: 285,
          availableUnits: 150
        }, 8000);
      } else if (act === 7) {
        setTakeoverEvent({
          type: 'IPO_PENDING',
          ticker: 'ANTH',
          name: 'Anthropic AI India Ltd',
          ipoPrice: 440,
          availableUnits: 200
        }, 8000);
      } else if (act === 9 || act === 12) {
        setTakeoverEvent({
          type: 'MARKET_HALT',
          ticker: 'DTAI',
          name: 'Delta AI Labs'
        }, 8000);
      } else if (act === 13) {
        setTakeoverEvent({
          type: 'BANKRUPTCY',
          ticker: 'DTAI',
          name: 'Delta AI Labs'
        }, 10000);
      } else if (triggeredNews) {
        setTakeoverEvent({
          type: 'NEWS_FLASH',
          name: triggeredNews.headline,
          ticker: triggeredNews.description || 'Breaking Market Alert'
        }, 8000);
      }

      return mockResponse({ success: true, triggeredNews, triggeredAction });
    }

    // 12. AI CHAT ASSISTANT COMMAND PARSER
    if (path === '/api/admin/ai-chat') {
      const text = body.message.toLowerCase();
      const executedCmds = [];
      let responseText = "I parsed your query but couldn't map it directly to a local command template.";

      // Get current securities and state from DB to resolve names/tickers
      const snap = await get(ref(db, 'fms'));
      if (snap.exists()) {
        const fms = snap.val();
        const securities = fms.securities || {};

        // Match a security ticker in the message
        let foundTicker = null;
        Object.keys(securities).forEach(ticker => {
          if (text.includes(ticker.toLowerCase())) {
            foundTicker = ticker;
          }
        });

        // 1. Check for Phoenix Act triggers
        if (text.includes('phoenix') || text.includes('act') || text.includes('phase')) {
          const match = text.match(/(?:act|phase)\s*(\d+)/) || text.match(/(\d+)/);
          if (match) {
            const actNum = Number(match[1]);
            await apiFetch('/api/admin/phoenix-act', { method: 'POST', body: { actNumber: actNum } });
            responseText = `Firing Staged Scenario ${actNum} sequence. The corresponding news bulletin and corporate actions have been broadcasted to the wire.`;
            return mockResponse({ response: responseText, executed: ['phoenix-act'] });
          }
        }

        // 2. Check for specific Ticker operations: Halt, Unhalt, Bankruptcy, Velocity
        if (foundTicker) {
          const security = securities[foundTicker];

          // Circuit Breaker Halt
          if (text.includes('halt') || text.includes('suspend') || text.includes('freeze') || text.includes('stop')) {
            await apiFetch('/api/corporate-action', {
              method: 'POST',
              body: { securityId: foundTicker, actionType: 'CircuitBreaker', details: 'Halted via Chat Intervention' }
            });
            responseText = `Regulatory suspension executed: Trading in ${foundTicker} has been halted. Order terminals are frozen.`;
            return mockResponse({ response: responseText, executed: ['halt'] });
          }

          // Unhalt / Resume
          if (text.includes('unhalt') || text.includes('resume') || text.includes('activate') || text.includes('start')) {
            await apiFetch('/api/corporate-action', {
              method: 'POST',
              body: { securityId: foundTicker, actionType: 'UNHALT' }
            });
            responseText = `Regulatory clearance granted: Trading in ${foundTicker} has been resumed. Order execution terminals active.`;
            return mockResponse({ response: responseText, executed: ['unhalt'] });
          }

          // Crash / Liquidation / Bankruptcy
          if (text.includes('bankruptcy') || text.includes('liquidate') || text.includes('bankrupt')) {
            await apiFetch('/api/corporate-action', {
              method: 'POST',
              body: { securityId: foundTicker, actionType: 'Bankruptcy', details: 'Insolvency liquidation via Chat Desk' }
            });
            responseText = `Insolvency decree signed: ${foundTicker} declared bankrupt. Share price adjusted to ₹0.00 and available floating units set to 0.`;
            return mockResponse({ response: responseText, executed: ['bankruptcy'] });
          }

          // Velocity Overrides: Make [TICKER] go up/down [X]% over [Y] minutes/seconds
          const isUp = text.includes('up') || text.includes('pump') || text.includes('rise') || text.includes('increase');
          const isDown = text.includes('down') || text.includes('dump') || text.includes('drop') || text.includes('fall') || text.includes('crash');

          if (isUp || isDown) {
            const pctMatch = text.match(/(\d+)\s*%/);
            const pct = pctMatch ? Number(pctMatch[1]) : 20;

            let durationSeconds = 120;
            const durationMatch = text.match(/(\d+)\s*(min|sec|minute|second)/);
            if (durationMatch) {
              const val = Number(durationMatch[1]);
              const unit = durationMatch[2];
              durationSeconds = unit.startsWith('min') ? val * 60 : val;
            }

            const factor = isUp ? (1 + pct / 100) : (1 - pct / 100);
            const targetPrice = parseFloat((security.currentPrice * factor).toFixed(2));

            await set(ref(db, `fms/velocities/${foundTicker}`), {
              ticker: foundTicker,
              targetPrice,
              startPrice: security.currentPrice,
              startTime: Date.now(),
              durationMs: durationSeconds * 1000,
              active: true
            });

            responseText = `Velocity override initialized: Driving ${foundTicker} from ₹${security.currentPrice.toFixed(2)} to target ₹${targetPrice.toFixed(2)} (${isUp ? '+' : '-'}${pct}%) over ${durationSeconds} seconds.`;
            return mockResponse({ response: responseText, executed: ['velocity'] });
          }
        }

        // 3. Sector sentiment overrides
        const sectors = ['tech', 'technology', 'finance', 'financial', 'bank', 'banking', 'pharma', 'pharmaceutical', 'energy', 'power', 'infra', 'infrastructure', 'consumer', 'retail', 'fmcg'];
        let matchedSector = null;
        sectors.forEach(s => {
          if (text.includes(s)) matchedSector = s;
        });

        if (matchedSector) {
          const isUp = text.includes('up') || text.includes('pump') || text.includes('bull') || text.includes('rally');
          const isDown = text.includes('down') || text.includes('dump') || text.includes('bear') || text.includes('crash');

          if (isUp || isDown) {
            const sentimentVal = isUp ? 2 : -2;
            const sentimentLabel = isUp ? 'Bullish Rally' : 'Bearish Correction';
            
            const sectorMapping = {
              'tech': 'Technology', 'technology': 'Technology',
              'finance': 'Financials', 'financial': 'Financials', 'bank': 'Financials', 'banking': 'Financials',
              'pharma': 'Healthcare', 'pharmaceutical': 'Healthcare',
              'energy': 'Energy', 'power': 'Energy',
              'infra': 'Infrastructure', 'infrastructure': 'Infrastructure',
              'consumer': 'Consumer Goods', 'retail': 'Consumer Goods', 'fmcg': 'Consumer Goods'
            };
            const dbSector = sectorMapping[matchedSector] || 'Technology';

            await runTransaction(ref(db, 'fms/securities'), (securitiesList) => {
              if (!securitiesList) return;
              Object.keys(securitiesList).forEach(k => {
                if (securitiesList[k].sector?.toLowerCase() === dbSector.toLowerCase() || securitiesList[k].sector?.toLowerCase().includes(matchedSector)) {
                  securitiesList[k].sentimentOverride = sentimentVal;
                }
              });
              return securitiesList;
            });

            responseText = `Sector sentiment override applied: Initiating a ${sentimentLabel} (Override: ${sentimentVal}) across all active ${dbSector} securities.`;
            return mockResponse({ response: responseText, executed: ['sector-override'] });
          }
        }

        // 4. Global overrides reset & market bull/crash runs
        if (text.includes('reset') && (text.includes('sentiment') || text.includes('override'))) {
          await apiFetch('/api/global-control', { method: 'POST', body: { action: 'RESET_SENTIMENT' } });
          responseText = `Global sentiment override reset. Volatility rates reverted to standard market-driven parameters.`;
          return mockResponse({ response: responseText, executed: ['reset-sentiment'] });
        }

        if (text.includes('crash') && (text.includes('market') || text.includes('all') || text.includes('index'))) {
          await apiFetch('/api/global-control', { method: 'POST', body: { action: 'CRASH' } });
          responseText = `Systemic warning: Initiating widespread index correction. Universal sell sentiment override applied.`;
          return mockResponse({ response: responseText, executed: ['global-crash'] });
        }

        if ((text.includes('bull') || text.includes('rally')) && (text.includes('market') || text.includes('all') || text.includes('index'))) {
          await apiFetch('/api/global-control', { method: 'POST', body: { action: 'BULL_RUN' } });
          responseText = `Intervention active: Initiating global market rally. Universal buy sentiment override applied.`;
          return mockResponse({ response: responseText, executed: ['global-bull'] });
        }
      }

      return mockResponse({ response: responseText, executed: executedCmds });
    }

    // 13. SETTINGS
    if (path === '/api/admin/settings') {
      await update(ref(db, 'fms/settings'), body.settings || {});
      return mockResponse({ success: true });
    }

    // 14. TRANSACTIONAL AUTO-NEWS STEP TICKER
    if (path === '/api/admin/tick-news') {
      let firedNews = null;

      let serverTimeOffset = 0;
      try {
        const offsetSnap = await get(ref(db, '.info/serverTimeOffset'));
        serverTimeOffset = offsetSnap.val() || 0;
      } catch (e) {
        console.error(e);
      }
      const currentServerTime = Date.now() + serverTimeOffset;

      const result = await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return;

        // Auto-activate pending IPOs if 30 seconds have elapsed since announcement
        let fmsUpdated = false;
        if (fms.securities) {
          Object.keys(fms.securities).forEach(k => {
            const s = fms.securities[k];
            if (s.status === 'IPO_PENDING') {
              const firstHistory = s.priceHistory && s.priceHistory.length > 0 ? s.priceHistory[0] : null;
              const announcedTime = firstHistory ? firstHistory.timestamp : null;
              if (announcedTime && (currentServerTime - announcedTime >= 30000)) {
                s.status = 'Active';
                fmsUpdated = true;
              }
            }
          });
        }

        const isMarketOpen = fms.marketState?.status === 'Open';
        const currentSettings = fms.settings || {};

        if (!isMarketOpen) {
          return fmsUpdated ? fms : undefined;
        }

        if (!currentSettings.autoNewsEnabled) {
          return fmsUpdated ? fms : undefined;
        }

        const lastAutoNewsTime = fms.marketState.lastAutoNewsTime || fms.marketState.simulationStartTime;
        const autoNewsInterval = fms.marketState.autoNewsInterval || 45000;

        if (currentServerTime - lastAutoNewsTime < autoNewsInterval) {
          return fmsUpdated ? fms : undefined; // Skip if news interval has not elapsed yet
        }

        const currentNewsStep = currentSettings.currentNewsStep || 1;
        const preset = NEWS_PRESETS.find(p => p.step === currentNewsStep);
        if (!preset) return; // Exit if all presets have been dispatched

        const securities = fms.securities || {};
        const newsEvents = fms.newsEvents || {};
        const newsCount = Object.keys(newsEvents).length;
        const newsId = `NW${String(newsCount + 1).padStart(3, '0')}`;

        const targetSecurities = [];
        const direction = preset.sentiment === 'Positive' ? 1 : preset.sentiment === 'Negative' ? -1 : 0;
        const impact = Number(preset.impactPercent || 0);

        Object.keys(securities).forEach(k => {
          const s = securities[k];
          if (s.status === 'Active') {
            if (preset.affectedSecurityIds && preset.affectedSecurityIds.includes(s.ticker)) {
              targetSecurities.push(s);
            } else if (preset.affectedSector && s.sector === preset.affectedSector) {
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

        firedNews = {
          id: newsId,
          headline: preset.headline,
          description: preset.description || '',
          affectedSecurityIds: targetSecurities.map(t => t.ticker),
          affectedSector: preset.affectedSector || null,
          sentiment: preset.sentiment,
          impactPercent: impact,
          triggeredAt: Date.now(),
          category: preset.category || 'Macro'
        };

        if (!fms.newsEvents) fms.newsEvents = {};
        fms.newsEvents[newsId] = firedNews;

        // Advance next step count
        currentSettings.currentNewsStep = currentNewsStep + 1;
        fms.settings = currentSettings;

        // Generate next randomized auto interval (40-50s)
        const nextNewsInterval = Math.floor(Math.random() * 10000) + 40000;
        fms.marketState.lastAutoNewsTime = currentServerTime;
        fms.marketState.autoNewsInterval = nextNewsInterval;

        return fms;
      });

      if (result.committed && firedNews) {
        setTakeoverEvent({
          type: 'NEWS_FLASH',
          name: firedNews.headline,
          ticker: firedNews.description || 'Breaking Market Alert'
        }, 8000);
        return mockResponse({ success: true, firedNews });
      }

      return mockResponse({ success: false });
    }

    return mockResponse({ error: 'Endpoint mock not mapped.' }, 404);
  } catch (err) {
    console.error(`Mock API Error on ${path}:`, err);
    return mockResponse({ error: err.message }, 500);
  }
}
