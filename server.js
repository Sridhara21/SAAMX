import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { INITIAL_SECURITIES_TEMPLATES } from './initial_securities.js';

const PORT = process.env.PORT || 3000;
const STATE_FILE = './state.json';
const BACKUP_DIR = './backups';
const PASSWORD_SECRET = 'fms-event-2026';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initial default state
const createInitialState = () => ({
  securities: [],
  teams: [],
  transactions: [],
  newsEvents: [],
  corporateActions: [],
  marketState: {
    status: 'NotStarted', // NotStarted, Open, Paused, Closed
    simulationStartTime: null,
    simulationDurationMinutes: 60,
    marketIndex: 0,
    pauseTimeOffset: 0, // Cumulative time paused in ms
    pausedAt: null
  },
  settings: {
    startingCapitalRetail: 1000000,
    startingCapitalMutualFund: 1000000,
    startingCapitalHedgeFund: 1000000,
    defaultVolatility: 0.5,
    circuitBreakerThreshold: 30, // 30%
    circuitBreakerWindowMinutes: 5,
  }
});

let state = createInitialState();
let transactionsSinceLastBackup = 0;
let lastBackupTime = Date.now();

// ----------------------------------------------------
// CRASH-SAFE PERSISTENCE IMPLEMENTATION
// ----------------------------------------------------
const loadState = () => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      state = JSON.parse(data);

      // Audit duplicate team codes and rename them, convert all to Retail
      const seenCodes = new Set();
      state.teams.forEach(t => {
        t.teamType = 'Retail';
        let code = t.teamCode.toUpperCase();
        if (seenCodes.has(code)) {
          let suffix = 2;
          let newCode = `${code}-${suffix}`;
          while (state.teams.some(x => x.teamCode === newCode)) {
            suffix++;
            newCode = `${code}-${suffix}`;
          }
          console.log(`Auto-renaming duplicate team code ${code} -> ${newCode}`);
          t.teamCode = newCode;
        } else {
          seenCodes.add(code);
        }
      });

      // Force 10 Lakh capital defaults in settings
      if (!state.settings) {
        state.settings = {};
      }
      state.settings.startingCapitalRetail = 1000000;
      state.settings.startingCapitalMutualFund = 1000000;
      state.settings.startingCapitalHedgeFund = 1000000;

      if (!state.securities || state.securities.length === 0) {
        console.log('Securities list is empty. Auto-seeding starter data...');
        seedStarterData();
        saveState();
      }

      console.log('Successfully loaded state from state.json');
      return;
    }
  } catch (err) {
    console.error('Error reading state.json, attempting backup recovery...', err);
  }

  // Backup recovery
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));

      for (const file of files) {
        try {
          const filePath = path.join(BACKUP_DIR, file);
          const data = fs.readFileSync(filePath, 'utf8');
          state = JSON.parse(data);
          console.log(`Successfully recovered state from backup: ${file}`);
          return;
        } catch (backupErr) {
          console.error(`Failed to parse backup file ${file}, trying next...`, backupErr);
        }
      }
    }
  } catch (dirErr) {
    console.error('Failed to read backups directory', dirErr);
  }

  console.log('No valid state or backup found. Initializing empty state.');
  state = createInitialState();
};

const saveState = (forceBackup = false) => {
  try {
    const dataStr = JSON.stringify(state, null, 2);
    const tempFile = `${STATE_FILE}.tmp`;
    
    // Atomic Write
    fs.writeFileSync(tempFile, dataStr, 'utf8');
    fs.renameSync(tempFile, STATE_FILE);

    // Backup check
    const isMarketOpen = state.marketState.status === 'Open';
    const now = Date.now();
    const timeSinceLastBackup = now - lastBackupTime;

    if (forceBackup || (isMarketOpen && (transactionsSinceLastBackup >= 10 || timeSinceLastBackup >= 60000))) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `state-${timestamp}.json`);
      fs.writeFileSync(backupPath, dataStr, 'utf8');
      
      transactionsSinceLastBackup = 0;
      lastBackupTime = now;
      console.log(`Created state backup snapshot: ${backupPath}`);
    }
  } catch (err) {
    console.error('Error saving state atomically:', err);
  }
};

// ----------------------------------------------------
// PRICING ENGINE UTILITIES
// ----------------------------------------------------
const updateMarketIndex = () => {
  const activeSecurities = state.securities.filter(s => s.status === 'Active');
  if (activeSecurities.length === 0) {
    state.marketState.marketIndex = 0;
    return;
  }

  let totalChange = 0;
  activeSecurities.forEach(s => {
    const pctChange = ((s.currentPrice - s.basePrice) / s.basePrice) * 100;
    totalChange += pctChange;
  });

  state.marketState.marketIndex = parseFloat((totalChange / activeSecurities.length).toFixed(2));
};

const circuitBreakerHistory = {};

const cleanOldCircuitBreakerHistory = (securityId, windowMs) => {
  if (!circuitBreakerHistory[securityId]) return;
  const cutoff = Date.now() - windowMs;
  circuitBreakerHistory[securityId] = circuitBreakerHistory[securityId].filter(p => p.timestamp >= cutoff);
};

const checkCircuitBreaker = (security, oldPrice, newPrice) => {
  const now = Date.now();
  const windowMs = (state.settings.circuitBreakerWindowMinutes || 5) * 60 * 1000;
  const threshold = state.settings.circuitBreakerThreshold || 30;

  if (!circuitBreakerHistory[security.id]) {
    circuitBreakerHistory[security.id] = [];
  }

  circuitBreakerHistory[security.id].push({ timestamp: now, price: newPrice });
  cleanOldCircuitBreakerHistory(security.id, windowMs);

  const history = circuitBreakerHistory[security.id];
  if (history.length < 2) return null;

  const basePricePoint = history[0].price;
  const maxChangePercent = ((newPrice - basePricePoint) / basePricePoint) * 100;

  if (Math.abs(maxChangePercent) >= threshold) {
    return {
      securityId: security.id,
      ticker: security.ticker,
      name: security.name,
      changePercent: parseFloat(maxChangePercent.toFixed(2)),
      threshold,
      windowMinutes: state.settings.circuitBreakerWindowMinutes,
    };
  }
  return null;
};

const seedStarterData = () => {
  const indianCities = ['Mumbai', 'Bengaluru', 'Chennai', 'Noida', 'Hyderabad', 'Pune', 'Gurugram', 'Kolkata', 'Ahmedabad', 'New Delhi'];

  const firstNames = ['Amit', 'Rajesh', 'Vikram', 'Anil', 'Sanjay', 'Sunil', 'Vijay', 'Rahul', 'Deepak', 'Aarav', 'Neha', 'Pooja', 'Priya', 'Ananya', 'Rohan'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Singh', 'Rao', 'Choudhury', 'Iyer', 'Sen', 'Banerjee'];

  // Seed Securities
  state.securities = INITIAL_SECURITIES_TEMPLATES.map((c, index) => {
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
        'MIRLAG': 'HDFC Bank (9.5%), ICICI Bank (8.8%), Reliance (8.1%), Infosys (7.5%), Larsen & Toubro (5.2%)',
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

    return {
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

  // Seed Teams (Retail only, ₹10 Lakhs starting capital)
  state.teams = [];
  for (let i = 1; i <= 20; i++) {
    const teamCode = `T${String(i).padStart(2, '0')}`;
    const teamName = `Trader Elite ${i}`;
    const cashBalance = state.settings.startingCapitalRetail; // 10 Lakhs

    state.teams.push({
      id: `T${String(i).padStart(2, '0')}`,
      teamCode,
      teamName,
      teamType: 'Retail',
      cashBalance,
      holdings: {},
      isActive: true,
      createdAt: Date.now()
    });
  }

  // Preload news templates
  state.newsEvents = [
    // Positive — Corporate / Earnings
    { id: 'N01', headline: 'Record Quarterly Revenue Reported', description: 'Strong analyst upgrades follow key enterprise earnings reports.', affectedSector: 'Technology', sentiment: 'Positive', impactPercent: 12, isCustom: false, category: 'Corporate' },
    { id: 'N02', headline: 'Board Approves ₹500 Crore Share Buyback', description: 'Surplus cash utilized to acquire stock float from secondary markets.', affectedSector: 'Banking', sentiment: 'Positive', impactPercent: 10, isCustom: false, category: 'Corporate' },
    { id: 'N03', headline: 'Government Infrastructure Contract Awarded', description: 'Leading engineering firms secure long-term public works directives.', affectedSector: 'Manufacturing', sentiment: 'Positive', impactPercent: 15, isCustom: false, category: 'Corporate' },
    { id: 'N04', headline: 'New Product Launch Surpasses Target Pre-Orders', description: 'Customer feedback index registers outstanding commercial traction.', affectedSector: 'Retail', sentiment: 'Positive', impactPercent: 9, isCustom: false, category: 'Corporate' },
    { id: 'N05', headline: 'Strategic Partnership with Global Giant Signed', description: 'Joint ventures clear local market distribution bottlenecks.', affectedSector: 'AI', sentiment: 'Positive', impactPercent: 14, isCustom: false, category: 'Corporate' },
    { id: 'N06', headline: 'Credit Rating Outlook Upgraded to Positive', description: 'Sovereign scoring agencies upgrade corporate solvency levels.', affectedSector: 'Energy', sentiment: 'Positive', impactPercent: 8, isCustom: false, category: 'Corporate' },

    // Positive — Macro / Policy
    { id: 'N07', headline: 'RBI Cuts Repo Rate by 25 Basis Points', description: 'Central banking committee reduces lending rate thresholds.', affectedSector: 'Banking', sentiment: 'Positive', impactPercent: 10, isCustom: false, category: 'Policy' },
    { id: 'N08', headline: 'Government Production Linked Incentives Approved', description: 'New tax rebates stimulate high-tech manufacturing plants.', affectedSector: 'Technology', sentiment: 'Positive', impactPercent: 12, isCustom: false, category: 'Policy' },
    { id: 'N09', headline: 'Trade Agreements Open New Export Inflows', description: 'Customs duties cut on major international trade routes.', affectedSector: 'Manufacturing', sentiment: 'Positive', impactPercent: 11, isCustom: false, category: 'Policy' },
    { id: 'N10', headline: 'Inflation Falls to 3-Year Low', description: 'Lending and input raw-material rates stabilize across core indices.', affectedSector: 'Retail', sentiment: 'Positive', impactPercent: 7, isCustom: false, category: 'Macro' },
    { id: 'N11', headline: 'FIIs Increase India Capital Allocation', description: 'Foreign investment desks step up equity and index fund buyouts.', affectedSector: 'Mutual Fund', sentiment: 'Positive', impactPercent: 9, isCustom: false, category: 'Macro' },

    // Negative — Corporate / Scandal
    { id: 'N12', headline: 'Accounting Irregularities Uncovered', description: 'Auditors flag structural discrepancy in previous company filings.', affectedSector: 'Technology', sentiment: 'Negative', impactPercent: 20, isCustom: false, category: 'Scandal' },
    { id: 'N13', headline: 'CEO Resigns with Immediate Effect', description: 'Board of directors calls immediate conference citing policy split.', affectedSector: 'AI', sentiment: 'Negative', impactPercent: 12, isCustom: false, category: 'Corporate' },
    { id: 'N14', headline: 'Promoter Pledges Shares Amid Liquidity Crunch', description: 'High debt burdens force immediate collateral conversions.', affectedSector: 'Energy', sentiment: 'Negative', impactPercent: 15, isCustom: false, category: 'Corporate' },
    { id: 'N15', headline: 'Major Client Cancels ₹800 Crore Contract', description: 'Substandard delivery timelines cited for contract termination.', affectedSector: 'Telecom', sentiment: 'Negative', impactPercent: 18, isCustom: false, category: 'Corporate' },
    { id: 'N16', headline: 'Insider Trading Allegations Spark Probe', description: 'SEBI freezes security accounts linked to early private disclosures.', affectedSector: 'Banking', sentiment: 'Negative', impactPercent: 16, isCustom: false, category: 'Scandal' },
    { id: 'N17', headline: 'Credit Rating Downgraded to Junk', description: 'Rating desks flag corporate solvency risks. Yields spike.', affectedSector: 'Corporate Bond', sentiment: 'Negative', impactPercent: 22, isCustom: false, category: 'Corporate' },
    { id: 'N18', headline: 'Factory Fire Halts Assembly Production', description: 'Main production plants suffer offline delays. Deliveries frozen.', affectedSector: 'Manufacturing', sentiment: 'Negative', impactPercent: 14, isCustom: false, category: 'Disaster' },
    { id: 'N19', headline: 'Ransomware Cyberattack Takes Core Systems Offline', description: 'Central servers offline. Operations halt pending diagnostic restore.', affectedSector: 'Technology', sentiment: 'Negative', impactPercent: 15, isCustom: false, category: 'Disaster' },

    // Negative — Macro / Crisis
    { id: 'N20', headline: 'RBI Raises Repo Rate by 50 Basis Points', description: 'Inflation pressure forces rate hikes. Borrowing costs elevate.', affectedSector: 'Banking', sentiment: 'Negative', impactPercent: 12, isCustom: false, category: 'Policy' },
    { id: 'N21', headline: 'Inflation Hits 3-Year Highs', description: 'Core consumer prices jump. Margins squeeze across core sectors.', affectedSector: 'Retail', sentiment: 'Negative', impactPercent: 8, isCustom: false, category: 'Macro' },
    { id: 'N22', headline: 'Trade Embargo Disrupts Supply Networks', description: 'Customs blockades halt manufacturing raw materials transit.', affectedSector: 'Manufacturing', sentiment: 'Negative', impactPercent: 11, isCustom: false, category: 'Policy' },
    { id: 'N23', headline: 'Crude Oil Prices Surge 15% on Production Cuts', description: 'Refinery inputs tighten, squeezing transportation costs.', affectedSector: 'Energy', sentiment: 'Negative', impactPercent: 13, isCustom: false, category: 'Macro' },
    { id: 'N24', headline: 'Global Recession Fears Mount on Weak Trade Data', description: 'Index funds face redemption outflows as growth indices slide.', affectedSector: 'ETF', sentiment: 'Negative', impactPercent: 10, isCustom: false, category: 'Macro' },
    { id: 'N25', headline: 'Rupee Weakens to 6-Month Lows', description: 'Capital outflows trigger currency values slide against USD.', affectedSector: 'Government Bond', sentiment: 'Negative', impactPercent: 7, isCustom: false, category: 'Macro' },

    // Neutral / Mixed
    { id: 'N26', headline: 'Quarterly Earnings Meet Consensus Targets', description: 'Financial statements align with average broker consensus.', affectedSector: 'Retail', sentiment: 'Neutral', impactPercent: 0, isCustom: false, category: 'Corporate' },
    { id: 'N27', headline: 'Management Guidance Targets Retained', description: 'Directors outline steady long-term expansion goals.', affectedSector: 'Energy', sentiment: 'Neutral', impactPercent: 0, isCustom: false, category: 'Corporate' },
    { id: 'N28', headline: 'Sector Consolidation Expected', description: 'Synergies increase. Mergers and acquisitions interest climbs.', affectedSector: 'Telecom', sentiment: 'Neutral', impactPercent: 0, isCustom: false, category: 'Macro' },
    { id: 'N29', headline: 'Regulatory Policy Review Initiated', description: 'Ministry drafts preliminary rulebook upgrades. Outcome pending.', affectedSector: 'Government Bond', sentiment: 'Neutral', impactPercent: 0, isCustom: false, category: 'Policy' },
    { id: 'N30', headline: 'Corporate Restructuring Plan Disclosed', description: 'Strategic reallocations expected to increase workflow productivity.', affectedSector: 'Healthcare', sentiment: 'Neutral', impactPercent: 0, isCustom: false, category: 'Corporate' }
  ];

  state.transactions = [];
  state.corporateActions = [];
  state.marketState = {
    status: 'NotStarted',
    simulationStartTime: null,
    simulationDurationMinutes: 60,
    marketIndex: 0,
    pauseTimeOffset: 0,
    pausedAt: null
  };

  transactionsSinceLastBackup = 0;
  lastBackupTime = Date.now();
  saveState(true);
};

// Initialize state
loadState();

// ----------------------------------------------------
// EXPRESS & WEBSOCKET SETUP
// ----------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

const authMiddleware = (req, res, next) => {
  // Allow GET /api/state (which maps to /state here due to mounting)
  if (req.method === 'GET' && req.path === '/state') {
    return next();
  }
  const password = req.headers['x-fms-password'];
  if (password === PASSWORD_SECRET) {
    req.role = 'admin';
    return next();
  } else if (password === 'journalist-event-2026') {
    req.role = 'journalist';
    // Journalist role is ONLY allowed to POST to /api/news
    if (req.path === '/news' && req.method === 'POST') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Journalist role lacks administrative privileges.' });
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid administrative credentials.' });
};

app.use('/api', authMiddleware);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
const activeAlerts = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', state, activeAlerts: Array.from(activeAlerts) }));
  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const broadcastState = (eventType = 'STATE_UPDATE', dataExtra = {}) => {
  const message = JSON.stringify({
    type: eventType,
    state,
    activeAlerts: Array.from(activeAlerts),
    ...dataExtra
  });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
};

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------
app.get('/api/state', (req, res) => {
  res.json({ state, activeAlerts: Array.from(activeAlerts) });
});

app.post('/api/admin/seed', (req, res) => {
  seedStarterData();
  broadcastState('SYSTEM_RESET', { message: 'Starter data seeded.' });
  res.json({ success: true, state });
});

app.post('/api/admin/reset', (req, res) => {
  state = createInitialState();
  activeAlerts.clear();
  seedStarterData();
  saveState(true);
  broadcastState('SYSTEM_RESET', { message: 'Database reset completed.' });
  res.json({ success: true, state });
});

app.post('/api/admin/settings', (req, res) => {
  const { settings } = req.body;
  state.settings = { ...state.settings, ...settings };
  saveState();
  broadcastState();
  res.json({ success: true, settings: state.settings });
});

app.post('/api/market/control', (req, res) => {
  const { action, duration } = req.body;
  const now = Date.now();

  if (action === 'START') {
    state.marketState.status = 'Open';
    state.marketState.simulationStartTime = now;
    state.marketState.pauseTimeOffset = 0;
    state.marketState.pausedAt = null;
    if (duration) state.marketState.simulationDurationMinutes = Number(duration);
    broadcastState('OPENING_BELL');
  } else if (action === 'PAUSE') {
    state.marketState.status = 'Paused';
    state.marketState.pausedAt = now;
    broadcastState();
  } else if (action === 'RESUME') {
    state.marketState.status = 'Open';
    if (state.marketState.pausedAt) {
      state.marketState.pauseTimeOffset += (now - state.marketState.pausedAt);
    }
    state.marketState.pausedAt = null;
    broadcastState();
  } else if (action === 'CLOSE') {
    state.marketState.status = 'Closed';
    broadcastState('CLOSING_BELL');
  }

  saveState(true);
  res.json({ success: true, marketState: state.marketState });
});

// Securities CRUD
app.post('/api/securities', (req, res) => {
  const newSec = req.body;
  if (!newSec.ticker || !newSec.name) {
    return res.status(400).json({ error: 'Ticker and Name are required.' });
  }

  const id = `S${String(state.securities.length + 1).padStart(2, '0')}`;
  const security = {
    id,
    ticker: newSec.ticker.toUpperCase(),
    name: newSec.name,
    sector: newSec.sector || 'Technology',
    type: newSec.type || 'Stock',
    basePrice: Number(newSec.basePrice) || 100,
    currentPrice: Number(newSec.basePrice) || 100,
    totalUnits: Number(newSec.totalUnits) || 100,
    availableUnits: Number(newSec.totalUnits) || 100,
    volatility: Number(newSec.volatility) || 0.5,
    riskRating: newSec.riskRating || 'Medium',
    growthRating: Number(newSec.growthRating) || 3,
    status: 'Active',
    description: newSec.description || '',
    ceoName: newSec.ceoName || 'Fictional CEO',
    foundedYear: Number(newSec.foundedYear) || 2026,
    headquarters: newSec.headquarters || 'Mumbai',
    logoInitials: newSec.ticker.slice(0, 2).toUpperCase(),
    dividendYield: Number(newSec.dividendYield) || 0,
    priceHistory: [{ timestamp: Date.now(), price: Number(newSec.basePrice) || 100 }]
  };

  state.securities.push(security);
  updateMarketIndex();
  saveState();
  broadcastState('IPO_LAUNCH', { securityId: security.id, ticker: security.ticker, name: security.name });
  res.json({ success: true, security });
});

app.put('/api/securities/:id', (req, res) => {
  const { id } = req.params;
  const index = state.securities.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Security not found' });

  const oldSec = state.securities[index];
  const newSec = req.body;
  
  const currentPrice = Number(newSec.currentPrice) !== undefined && Number(newSec.currentPrice) !== oldSec.currentPrice ? Number(newSec.currentPrice) : oldSec.currentPrice;
  const priceHistory = [...oldSec.priceHistory];
  if (currentPrice !== oldSec.currentPrice) {
    priceHistory.push({ timestamp: Date.now(), price: currentPrice });
  }

  state.securities[index] = {
    ...oldSec,
    ...newSec,
    currentPrice,
    priceHistory,
    totalUnits: Number(newSec.totalUnits) || oldSec.totalUnits,
    availableUnits: Number(newSec.availableUnits) !== undefined ? Number(newSec.availableUnits) : oldSec.availableUnits,
  };

  updateMarketIndex();
  saveState();
  broadcastState();
  res.json({ success: true, security: state.securities[index] });
});

app.delete('/api/securities/:id', (req, res) => {
  const { id } = req.params;
  state.securities = state.securities.filter(s => s.id !== id);
  updateMarketIndex();
  saveState();
  broadcastState();
  res.json({ success: true });
});

// Teams CRUD
app.post('/api/teams', (req, res) => {
  const team = req.body;
  if (!team.teamCode || !team.teamName) {
    return res.status(400).json({ error: 'Team Code and Team Name are required.' });
  }
  const codeUpper = team.teamCode.toUpperCase();
  const exists = state.teams.some(t => t.teamCode === codeUpper);
  if (exists) {
    return res.status(400).json({ error: `Team code ${team.teamCode} is already taken.` });
  }

  const id = `T${String(state.teams.length + 1).padStart(2, '0')}`;
  const cashMultiplier = team.teamType === 'HedgeFund' ? 5 : team.teamType === 'MutualFund' ? 3 : 1;
  const cashBalance = Number(team.cashBalance) || (state.settings.startingCapitalRetail * cashMultiplier);

  const newTeam = {
    id,
    teamCode: codeUpper,
    teamName: team.teamName,
    teamType: team.teamType || 'Retail',
    cashBalance,
    holdings: {},
    isActive: true,
    createdAt: Date.now()
  };

  state.teams.push(newTeam);
  saveState();
  broadcastState();
  res.json({ success: true, team: newTeam });
});

app.put('/api/teams/:id', (req, res) => {
  const { id } = req.params;
  const index = state.teams.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });

  if (req.body.teamCode) {
    const codeUpper = req.body.teamCode.toUpperCase();
    const exists = state.teams.some(t => t.teamCode === codeUpper && t.id !== id);
    if (exists) {
      return res.status(400).json({ error: `Team code ${req.body.teamCode} is already taken.` });
    }
  }

  state.teams[index] = {
    ...state.teams[index],
    ...req.body,
    teamCode: req.body.teamCode ? req.body.teamCode.toUpperCase() : state.teams[index].teamCode,
    cashBalance: Number(req.body.cashBalance) !== undefined && !isNaN(Number(req.body.cashBalance)) ? Number(req.body.cashBalance) : state.teams[index].cashBalance
  };

  saveState();
  broadcastState();
  res.json({ success: true, team: state.teams[index] });
});

app.delete('/api/teams/:id', (req, res) => {
  const { id } = req.params;
  state.teams = state.teams.filter(t => t.id !== id);
  saveState();
  broadcastState();
  res.json({ success: true });
});

// Exchange Trade Order API
app.post('/api/trade', (req, res) => {
  if (state.marketState.status !== 'Open') {
    return res.status(400).json({ error: 'Trading is only permitted when market status is Open.' });
  }

  const { teamId, securityId, action, quantity, enteredBy } = req.body;
  const Q = Number(quantity);

  if (!teamId || !securityId || !action || isNaN(Q) || Q <= 0) {
    return res.status(400).json({ error: 'Missing parameters or invalid quantity.' });
  }

  const team = state.teams.find(t => t.id === teamId || t.teamCode === teamId);
  const security = state.securities.find(s => s.id === securityId || s.ticker === securityId);

  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (!security) return res.status(404).json({ error: 'Security not found.' });

  if (security.status !== 'Active') {
    return res.status(400).json({ error: `Trading halted: Company is ${security.status}.` });
  }

  const executionPrice = security.currentPrice;
  const totalValue = Q * executionPrice;
  const impactFactor = Q / security.totalUnits;
  const priceChangePercent = impactFactor * security.volatility * 100;

  if (action === 'BUY') {
    if (Q > security.availableUnits) {
      return res.status(400).json({ error: `Only ${security.availableUnits} units available.` });
    }
    if (team.cashBalance < totalValue) {
      return res.status(400).json({ error: `Insufficient cash. Team has ₹${team.cashBalance.toLocaleString()}, need ₹${totalValue.toLocaleString()}.` });
    }

    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    security.availableUnits -= Q;

    team.cashBalance = parseFloat((team.cashBalance - totalValue).toFixed(2));
    team.holdings[security.id] = (team.holdings[security.id] || 0) + Q;

    const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
    if (alert) activeAlerts.add(JSON.stringify(alert));

  } else if (action === 'SELL') {
    const currentHolding = team.holdings[security.id] || 0;
    if (Q > currentHolding) {
      return res.status(400).json({ error: `Insufficient holdings. Team holds ${currentHolding} units.` });
    }

    const oldPrice = security.currentPrice;
    security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    security.availableUnits += Q;

    team.cashBalance = parseFloat((team.cashBalance + totalValue).toFixed(2));
    team.holdings[security.id] -= Q;
    if (team.holdings[security.id] === 0) {
      delete team.holdings[security.id];
    }

    const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
    if (alert) activeAlerts.add(JSON.stringify(alert));
  } else {
    return res.status(400).json({ error: 'Action must be BUY or SELL.' });
  }

  const transaction = {
    id: `TX${String(state.transactions.length + 1).padStart(4, '0')}`,
    timestamp: Date.now(),
    teamId: team.id,
    teamCode: team.teamCode,
    teamName: team.teamName,
    teamType: team.teamType,
    securityId: security.id,
    ticker: security.ticker,
    action,
    quantity: Q,
    priceAtExecution: executionPrice,
    totalValue,
    enteredBy: enteredBy || 'Staff Desk',
    voided: false
  };

  state.transactions.push(transaction);
  transactionsSinceLastBackup += 1;
  updateMarketIndex();
  saveState();
  broadcastState('TRADE_EXECUTION', { transaction });

  res.json({ success: true, transaction, state });
});

// Void Transaction
app.post('/api/transactions/void', (req, res) => {
  const { id } = req.body;
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  if (tx.voided) return res.status(400).json({ error: 'Transaction already voided.' });

  const team = state.teams.find(t => t.id === tx.teamId);
  const security = state.securities.find(s => s.id === tx.securityId);

  if (team) {
    if (tx.action === 'BUY') {
      team.cashBalance = parseFloat((team.cashBalance + tx.totalValue).toFixed(2));
      if (team.holdings[tx.securityId]) {
        team.holdings[tx.securityId] -= tx.quantity;
        if (team.holdings[tx.securityId] <= 0) delete team.holdings[tx.securityId];
      }
    } else if (tx.action === 'SELL') {
      team.cashBalance = parseFloat((team.cashBalance - tx.totalValue).toFixed(2));
      team.holdings[tx.securityId] = (team.holdings[tx.securityId] || 0) + tx.quantity;
    }
  }

  if (security) {
    if (tx.action === 'BUY') {
      security.availableUnits += tx.quantity;
    } else if (tx.action === 'SELL') {
      security.availableUnits = Math.max(0, security.availableUnits - tx.quantity);
    }
  }

  tx.voided = true;
  updateMarketIndex();
  saveState(true);
  broadcastState();

  res.json({ success: true, transaction: tx });
});

// News bulletins publisher
app.post('/api/news', (req, res) => {
  const { headline, description, affectedSecurityIds, affectedSector, sentiment, impactPercent, category } = req.body;

  if (!headline || !sentiment || isNaN(Number(impactPercent))) {
    return res.status(400).json({ error: 'Missing mandatory news values.' });
  }

  const impact = Number(impactPercent);
  const direction = sentiment === 'Positive' ? 1 : sentiment === 'Negative' ? -1 : 0;

  let targets = [];
  if (affectedSecurityIds && affectedSecurityIds.length > 0) {
    targets = state.securities.filter(s => affectedSecurityIds.includes(s.id) && s.status === 'Active');
  } else if (affectedSector) {
    targets = state.securities.filter(s => s.sector === affectedSector && s.status === 'Active');
  }

  targets.forEach(security => {
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * (1 + (direction * impact) / 100)).toFixed(2));
    if (security.currentPrice < 1) security.currentPrice = 1;
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
  });

  const newsItem = {
    id: `NW${String(state.newsEvents.length + 1).padStart(3, '0')}`,
    headline,
    description: description || '',
    affectedSecurityIds: targets.map(t => t.id),
    affectedSector: affectedSector || null,
    sentiment,
    impactPercent: impact,
    triggeredAt: Date.now(),
    isCustom: true,
    category: category || 'Macro'
  };

  state.newsEvents.push(newsItem);
  updateMarketIndex();
  saveState(true);
  broadcastState('NEWS_FLASH', { newsItem });
  res.json({ success: true, newsItem });
});

// Corporate Actions
app.post('/api/corporate-action', (req, res) => {
  const { securityId, actionType, details } = req.body;
  const security = state.securities.find(s => s.id === securityId);

  if (!security && actionType !== 'DISMISS_ALERT') {
    return res.status(404).json({ error: 'Security not found.' });
  }

  const actionLog = {
    id: `CA${String(state.corporateActions.length + 1).padStart(3, '0')}`,
    securityId: security ? security.id : null,
    actionType,
    details: details || '',
    triggeredAt: Date.now()
  };

  if (actionType === 'DISMISS_ALERT') {
    activeAlerts.delete(details);
    broadcastState();
    return res.json({ success: true });
  }

  if (actionType === 'CircuitBreaker') {
    security.status = 'Halted';
    const alertsArr = Array.from(activeAlerts);
    const targetAlert = alertsArr.find(a => JSON.parse(a).securityId === security.id);
    if (targetAlert) activeAlerts.delete(targetAlert);

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('MARKET_HALT', { securityId: security.id, ticker: security.ticker, name: security.name });
    return res.json({ success: true });
  }

  if (actionType === 'UNHALT') {
    security.status = 'Active';
    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState();
    return res.json({ success: true });
  }

  if (actionType === 'StockSplit') {
    security.totalUnits *= 2;
    security.availableUnits *= 2;
    security.currentPrice = parseFloat((security.currentPrice / 2).toFixed(2));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    state.teams.forEach(team => {
      if (team.holdings[security.id]) {
        team.holdings[security.id] *= 2;
      }
    });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('STOCK_SPLIT', { securityId: security.id, ticker: security.ticker, name: security.name });
    return res.json({ success: true });
  }

  if (actionType === 'BonusIssue') {
    // 1-for-1 bonus issue (identical to stock split portfolio effect)
    security.totalUnits *= 2;
    security.availableUnits *= 2;
    security.currentPrice = parseFloat((security.currentPrice / 2).toFixed(2));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    state.teams.forEach(team => {
      if (team.holdings[security.id]) {
        team.holdings[security.id] *= 2;
      }
    });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('STOCK_SPLIT', { securityId: security.id, ticker: security.ticker, name: security.name });
    return res.json({ success: true });
  }

  if (actionType === 'Dividend') {
    const yieldPct = security.dividendYield;
    state.teams.forEach(team => {
      const heldUnits = team.holdings[security.id] || 0;
      if (heldUnits > 0) {
        const payout = parseFloat((heldUnits * (yieldPct / 100) * security.currentPrice).toFixed(2));
        team.cashBalance = parseFloat((team.cashBalance + payout).toFixed(2));
      }
    });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('DIVIDEND_ANNOUNCEMENT', { securityId: security.id, ticker: security.ticker, yieldPercent: yieldPct });
    return res.json({ success: true });
  }

  if (actionType === 'Bankruptcy') {
    security.status = 'Bankrupt';
    security.currentPrice = 0;
    security.availableUnits = 0;
    security.priceHistory.push({ timestamp: Date.now(), price: 0 });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('BANKRUPTCY', { securityId: security.id, ticker: security.ticker, name: security.name });
    return res.json({ success: true });
  }

  if (actionType === 'Delisting') {
    security.status = 'Delisted';
    security.currentPrice = 0;
    security.availableUnits = 0;
    security.priceHistory.push({ timestamp: Date.now(), price: 0 });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('BANKRUPTCY', { securityId: security.id, ticker: security.ticker, name: security.name });
    return res.json({ success: true });
  }

  if (actionType === 'CEOChange') {
    const newCeo = details;
    security.ceoName = newCeo;
    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('NEWS_FLASH', { newsItem: { headline: `CEO Leadership Shift at ${security.ticker}`, description: `Executive board appoints ${newCeo} as CEO to lead strategic growth.`, sentiment: 'Neutral', impactPercent: 0, triggeredAt: Date.now() } });
    return res.json({ success: true });
  }

  if (actionType === 'CreditUpgrade') {
    security.riskRating = security.riskRating === 'High' ? 'Medium' : 'Low';
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * 1.10).toFixed(2)); // 10% price boost
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('NEWS_FLASH', { newsItem: { headline: `Credit Rating Upgraded for ${security.ticker}`, description: `Rating agencies upgrade status. Volatility stabilizes with positive outlook.`, sentiment: 'Positive', impactPercent: 10, triggeredAt: Date.now() } });
    return res.json({ success: true });
  }

  if (actionType === 'CreditDowngrade') {
    security.riskRating = security.riskRating === 'Low' ? 'Medium' : 'High';
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * 0.90).toFixed(2)); // 10% price drop
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('NEWS_FLASH', { newsItem: { headline: `Credit Rating Downgraded for ${security.ticker}`, description: `Financial audits trigger credit status downgrade. Asset experiences sell-off.`, sentiment: 'Negative', impactPercent: 10, triggeredAt: Date.now() } });
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Unsupported corporate action type.' });
});

// ----------------------------------------------------
// VELOCITY AND GLOBAL CONTROL ENGINES
// ----------------------------------------------------
const activeVelocityTargets = {};

app.post('/api/admin/velocity-control', (req, res) => {
  const { securityId, targetPrice, durationSeconds } = req.body;
  const security = state.securities.find(s => s.id === securityId || s.ticker === securityId);
  if (!security) return res.status(404).json({ error: 'Security not found' });

  const target = Number(targetPrice);
  const dur = Number(durationSeconds) || 60;

  if (isNaN(target)) return res.status(400).json({ error: 'Invalid target price' });

  const priceDiff = target - security.currentPrice;
  const steps = dur; // 1-second steps
  const stepVal = priceDiff / steps;

  activeVelocityTargets[security.id] = {
    targetPrice: target,
    stepVal: stepVal,
    stepsRemaining: steps
  };

  console.log(`Velocity control set for ${security.ticker}: target ₹${target} over ${dur}s`);
  res.json({ success: true, velocity: activeVelocityTargets[security.id] });
});

app.post('/api/admin/global-control', (req, res) => {
  const { action } = req.body;
  if (!action) return res.status(400).json({ error: 'Missing action parameter' });

  if (action === 'BULL_RUN') {
    state.securities.forEach(s => {
      if (s.status === 'Active') s.sentimentOverride = 2;
    });
    broadcastState('NEWS_FLASH', { newsItem: { headline: 'GLOBAL MARKET RALLY INITIATED', description: 'Strong bullish sentiment sweeps across all trading desks.', sentiment: 'Positive', impactPercent: 0, triggeredAt: Date.now() } });
  } else if (action === 'CRASH') {
    state.securities.forEach(s => {
      if (s.status === 'Active') s.sentimentOverride = -2;
    });
    broadcastState('NEWS_FLASH', { newsItem: { headline: 'SYSTEMIC MARKET CORRECTION', description: 'Panic selling triggers widespread index downward drift.', sentiment: 'Negative', impactPercent: 0, triggeredAt: Date.now() } });
  } else if (action === 'RESET_SENTIMENT') {
    state.securities.forEach(s => {
      s.sentimentOverride = 0;
    });
  } else if (action === 'FREEZE_ALL') {
    state.securities.forEach(s => {
      if (s.status === 'Active') s.status = 'Halted';
    });
    broadcastState('MARKET_HALT', { name: 'All Securities Halted' });
  } else if (action === 'RESUME_ALL') {
    state.securities.forEach(s => {
      if (s.status === 'Halted') s.status = 'Active';
    });
    broadcastState();
  }

  saveState(true);
  res.json({ success: true, message: `Action ${action} executed successfully.` });
});

// ----------------------------------------------------
// PROJECT PHOENIX SCENARIO SCRIPTS
// ----------------------------------------------------
const PHOENIX_TARGET = 'DTAI';

const triggerIPO = (ipoDetails) => {
  const id = `S${String(state.securities.length + 1).padStart(2, '0')}`;
  const security = {
    id,
    ticker: ipoDetails.ticker,
    name: ipoDetails.companyName,
    sector: ipoDetails.sector,
    type: 'Stock',
    basePrice: ipoDetails.ipoPrice,
    currentPrice: ipoDetails.ipoPrice,
    totalUnits: ipoDetails.totalUnitsOffered,
    availableUnits: ipoDetails.totalUnitsOffered,
    volatility: ipoDetails.volatility || 0.75,
    riskRating: ipoDetails.riskRating || 'High',
    growthRating: 3,
    status: 'IPO_PENDING',
    sentimentOverride: 0,
    description: ipoDetails.description || '',
    ceoName: ipoDetails.ceoName || '',
    foundedYear: ipoDetails.foundedYear || 2026,
    headquarters: ipoDetails.headquarters || 'Bengaluru',
    logoInitials: ipoDetails.ticker.slice(0, 2).toUpperCase(),
    dividendYield: 0,
    priceHistory: [{ timestamp: Date.now(), price: ipoDetails.ipoPrice }],
    profileDetails: {
      tagline: ipoDetails.description || '',
      about: ipoDetails.description || '',
      facts: [
        { label: 'CEO', value: ipoDetails.ceoName || 'Unknown' },
        { label: 'Founded', value: String(ipoDetails.foundedYear || 2026) },
        { label: 'IPO Price', value: `₹${ipoDetails.ipoPrice}` }
      ],
      holdings: [],
      note: 'Initial Public Offering.'
    }
  };

  state.securities.push(security);
  saveState(true);

  // Broadcast IPO pending event for 8s takeover on Projector
  broadcastState('IPO_PENDING', {
    type: 'IPO_PENDING',
    ticker: ipoDetails.ticker,
    name: ipoDetails.companyName,
    ipoPrice: ipoDetails.ipoPrice,
    availableUnits: ipoDetails.totalUnitsOffered
  });

  // Set timeout to open trading after 60 seconds
  setTimeout(() => {
    const sec = state.securities.find(s => s.id === id);
    if (sec) {
      sec.status = 'Active';
      sec.ipoTriggeredAt = Date.now();
      saveState(true);
      
      const news = {
        id: `NW_IPO_${sec.ticker}`,
        headline: `🔔 IPO: ${sec.name} (${sec.ticker}) now trading on NIFTY FMS EXCHANGE at ₹${sec.basePrice} — ${sec.totalUnits} units available`,
        description: sec.description,
        affectedSecurityIds: [sec.id],
        sentiment: 'Positive',
        impactPercent: 0,
        triggeredAt: Date.now(),
        category: 'Corporate'
      };
      state.newsEvents.push(news);
      broadcastState('NEWS_FLASH', { newsItem: news });

      if (sec.ticker === 'ISFT') {
        const oldPrice = sec.currentPrice;
        sec.currentPrice = parseFloat((oldPrice * 1.18).toFixed(2));
        sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
        saveState(true);
        broadcastState();
      }
      else if (sec.ticker === 'ANTH') {
        sec.sentimentOverride = 2;
        const target = 1180;
        const dur = 180;
        const priceDiff = target - sec.currentPrice;
        activeVelocityTargets[sec.id] = {
          targetPrice: target,
          stepVal: priceDiff / dur,
          stepsRemaining: dur
        };
      }
    }
  }, 60000);
};

const executePhoenixAct = (actNum) => {
  const security = state.securities.find(s => s.ticker === PHOENIX_TARGET);
  if (!security) return { error: 'DTAI security not found in database.' };

  const act = Number(actNum);

  if (act === 1) {
    // Loss Announcement (T+08:00)
    security.sentimentOverride = -1;
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * 0.78).toFixed(2)); // -22%
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    const news = {
      id: `NW_PHX_1`,
      headline: 'Delta AI Labs Reports Shock ₹285 Crore Quarterly Loss — Misses Estimates by 340%',
      description: 'Delta AI Labs has reported a net loss of ₹285 crore for Q2 FY26, catastrophically missing consensus estimates. The company cites rising compute infrastructure costs and weak bookings.',
      sentiment: 'Negative',
      impactPercent: 22,
      triggeredAt: Date.now(),
      category: 'Corporate',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  } 
  else if (act === 2) {
    // Mystery Buyer (T+14:00)
    security.sentimentOverride = 0;
    const target = 210;
    const dur = 120;
    const priceDiff = target - security.currentPrice;
    activeVelocityTargets[security.id] = {
      targetPrice: target,
      stepVal: priceDiff / dur,
      stepsRemaining: dur
    };

    const news = {
      id: `NW_PHX_2`,
      headline: 'Singapore-Based Firm Acquires ₹100 Crore Strategic Stake in Delta AI Labs',
      description: 'Regulatory filings reveal that a private equity consortium registered in Singapore has acquired a 12% stake in DTAI. Speculators eye proprietary patents.',
      sentiment: 'Positive',
      impactPercent: 12,
      triggeredAt: Date.now(),
      category: 'Corporate',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  } 
  else if (act === 3) {
    // IPO 1: IndiaStack Fintech Ltd (T+16:00)
    triggerIPO({
      ticker: 'ISFT',
      companyName: 'IndiaStack Fintech Ltd',
      sector: 'Fintech / Technology',
      ipoPrice: 285,
      totalUnitsOffered: 180,
      volatility: 0.75,
      riskRating: 'High',
      ceoName: 'Ananya Krishnamurthy',
      foundedYear: 2018,
      description: "IndiaStack Fintech is a Bengaluru-based startup that built the UPI reconciliation infrastructure used by 14 major banks. After 6 years as a B2B platform, it is listing publicly to fund international expansion."
    });

    const news = {
      id: 'NW_ISFT_IPO_WARN',
      headline: "IndiaStack Fintech IPO Oversubscribed 14x — Strong Institutional Demand at Listing",
      description: "India's UPI infrastructure pioneer makes its market debut after a massively oversubscribed IPO. Institutional investors have anchored 60% of the offering. Retail demand exceeded expectations by 14x.",
      sentiment: 'Positive',
      impactPercent: 18,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 4) {
    // Leadership Upheaval (T+19:00)
    security.sentimentOverride = -1;
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * 0.92).toFixed(2)); // -8%
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    security.ceoName = 'Professional Board Interim';

    const news = {
      id: `NW_PHX_3`,
      headline: 'Delta AI Labs CEO, CFO, and CTO Resign — Board Cites Strategic Realignment',
      description: 'Founding CEO Arjun Mehta, CFO Priya Sharma, and CTO Rahul Verma resign immediately. Board cites transition to professional management.',
      sentiment: 'Negative',
      impactPercent: 8,
      triggeredAt: Date.now(),
      category: 'Scandal',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  } 
  else if (act === 5) {
    // Pump Phase Part 1 (T+22:00)
    security.sentimentOverride = 2;
    const target = 280;
    const dur = 60;
    const priceDiff = target - security.currentPrice;
    activeVelocityTargets[security.id] = {
      targetPrice: target,
      stepVal: priceDiff / dur,
      stepsRemaining: dur
    };

    const news = {
      id: `NW_PHX_4`,
      headline: 'EXCLUSIVE: Delta AI Labs New CEO Former Goldman Sachs MD — Major Mandate Expected',
      description: 'Sources close to the matter reveal that the incoming CEO has deep institutional relationships. Market expects massive allocation announcements.',
      sentiment: 'Positive',
      impactPercent: 18,
      triggeredAt: Date.now(),
      category: 'Corporate',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 6) {
    // Anthropic IPO Alert Warning (T+23:00)
    const news = {
      id: 'NW_ANTH_WARN',
      headline: "⚡ BREAKING: Anthropic AI India IPO in 60 Seconds — ₹850 Issue Price | 120 Units Only",
      description: "The most anticipated AI listing of the year hits the NIFTY FMS Exchange in 60 seconds. Anthropic AI India, subsidiary of the global AI safety pioneer, opens at ₹850 with only 120 units available.",
      sentiment: 'Positive',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 7) {
    // IPO 2: Anthropic AI India Ltd (T+24:00)
    triggerIPO({
      ticker: 'ANTH',
      companyName: 'Anthropic AI India Ltd',
      sector: 'AI / Technology',
      ipoPrice: 850,
      totalUnitsOffered: 120,
      volatility: 0.90,
      riskRating: 'High',
      ceoName: 'Dr. Meghna Iyer',
      foundedYear: 2023,
      description: "Anthropic AI India Ltd, the Indian subsidiary of the global AI safety company behind the Claude AI model. The company has ARR of ₹2,200 crore from enterprise contracts with 8 PSU banks and the Ministry of Electronics & IT."
    });
  }
  else if (act === 8) {
    // Anthropic IPO Day Pop (T+25:00)
    const anth = state.securities.find(s => s.ticker === 'ANTH');
    if (anth) {
      const oldPrice = anth.currentPrice;
      anth.currentPrice = parseFloat((oldPrice * 1.12).toFixed(2));
      anth.priceHistory.push({ timestamp: Date.now(), price: anth.currentPrice });
    }
    const news = {
      id: 'NW_ANTH_POP',
      headline: "Anthropic AI India Surges 38% Above Issue Price — Retail Window SOLD OUT in 4 Minutes",
      description: "Anthropic AI India's market debut has exceeded all expectations with the stock already 38% above its ₹850 IPO price. All 120 units have been allocated.",
      sentiment: 'Positive',
      impactPercent: 12,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 9) {
    // SEBI Probe (T+30:00)
    security.sentimentOverride = -2;
    security.currentPrice = parseFloat((security.currentPrice * 0.75).toFixed(2));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    const target = 220;
    const dur = 180;
    const priceDiff = target - security.currentPrice;
    activeVelocityTargets[security.id] = {
      targetPrice: target,
      stepVal: priceDiff / dur,
      stepsRemaining: dur
    };

    const notice = {
      id: `NW_PHX_6`,
      headline: '⚖ SEBI NOTICE: SEBI/FMS/2026/0089 — FORMAL INVESTIGATION INTO DELTA AI LABS',
      description: 'SEBI initiates forensic examination of Delta AI Labs (DTAI) following anomalous trading patterns and whistleblower allegations of misrepresentation.',
      sentiment: 'Negative',
      impactPercent: 25,
      triggeredAt: Date.now(),
      category: 'Scandal',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(notice);
    broadcastState('NEWS_FLASH', { newsItem: notice });
  }
  else if (act === 10) {
    // Scandal Breaks (T+34:00)
    security.sentimentOverride = -2;
    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((oldPrice * 0.70).toFixed(2)); // -30%
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    const news = {
      id: `NW_PHX_7`,
      headline: 'BREAKING: SEBI Finds Former DTAI Executives Liquidated Holdings 72 Hours Before Loss Announcement',
      description: 'SEBI audit reveals founders sold ₹500 crore stake before Q2 loss. Singapore firm traced to shell companies. Tata rumours were fabricated.',
      sentiment: 'Negative',
      impactPercent: 30,
      triggeredAt: Date.now(),
      category: 'Scandal',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 11) {
    // ANTH Sector Rally (T+35:00)
    const anth = state.securities.find(s => s.ticker === 'ANTH');
    if (anth) {
      const oldPrice = anth.currentPrice;
      anth.currentPrice = parseFloat((oldPrice * 1.10).toFixed(2));
      anth.priceHistory.push({ timestamp: Date.now(), price: anth.currentPrice });
    }
    const news = {
      id: 'NW_ANTH_RALLY',
      headline: "AI SECTOR RALLY: Anthropic AI India benefits from Delta AI Labs collapse — enterprise clients migrate to trusted AI provider",
      description: "Enterprise clients migrate to trusted AI provider following competitor governance failure. Anthropic registers massive client additions.",
      sentiment: 'Positive',
      impactPercent: 10,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 12) {
    // Suspend Trading DTAI (T+36:00)
    security.status = 'Halted';

    const notice = {
      id: `NW_PHX_8`,
      headline: '⚖ SEBI NOTICE: SEBI/FMS/2026/0091 — IMMEDIATE SUSPENSION OF TRADING IN DELTA AI LABS',
      description: 'SEBI suspends trading in securities of Delta AI Labs (DTAI) with immediate effect under Section 11(4)(b) of the SEBI Act.',
      sentiment: 'Neutral',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Policy',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(notice);
    broadcastState('MARKET_HALT', { securityId: security.id, ticker: security.ticker, name: security.name });
  }
  else if (act === 13) {
    // Insolvency DTAI (T+38:00)
    security.status = 'Bankrupt';
    security.currentPrice = 0;
    security.priceHistory.push({ timestamp: Date.now(), price: 0 });

    const notice = {
      id: `NW_PHX_9`,
      headline: '⚖ SEBI NOTICE: SEBI/FMS/2026/0093 — DELTA AI LABS DECLARED INSOLVENT — NCLT LIQUIDATION ORDER',
      description: 'NCLT grants liquidation order. Shares declared worthless. Patents auctioned for creditor recovery.',
      sentiment: 'Negative',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Scandal',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(notice);
    broadcastState('BANKRUPTCY', { securityId: security.id, ticker: security.ticker, name: security.name });
  }
  else if (act === 14) {
    // Market Recovery (T+40:00)
    state.securities.forEach(s => {
      if (s.ticker !== PHOENIX_TARGET && s.status === 'Active') {
        s.sentimentOverride = 1; // Mild Bull
      }
    });

    const news = {
      id: `NW_PHX_10`,
      headline: 'Markets Stabilise Following SEBI\'s Swift Winding-Up Actions — Institutional Investors Return',
      description: 'Broader market recovers from session lows as decisive regulatory action restores trust in financial oversight.',
      sentiment: 'Positive',
      impactPercent: 6,
      triggeredAt: Date.now(),
      category: 'Macro'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });

    setTimeout(() => {
      state.securities.forEach(s => {
        if (s.ticker !== PHOENIX_TARGET) s.sentimentOverride = 0;
      });
      broadcastState();
    }, 5 * 60 * 1000);
  }
  else if (act === 15) {
    // ANTH Defence Contract (T+45:00)
    const anth = state.securities.find(s => s.ticker === 'ANTH');
    if (anth) {
      const oldPrice = anth.currentPrice;
      anth.currentPrice = parseFloat((oldPrice * 1.08).toFixed(2));
      anth.priceHistory.push({ timestamp: Date.now(), price: anth.currentPrice });
    }
    const news = {
      id: 'NW_ANTH_CONTRACT',
      headline: "Anthropic AI India Signs ₹800 Crore Multi-Year Contract with Ministry of Defence for AI-Assisted Intelligence Analysis",
      description: "Ministry of Defence awards major national security project to Anthropic AI India. Deployment begins immediately.",
      sentiment: 'Positive',
      impactPercent: 8,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }

  saveState(true);
  broadcastState();
  return { success: true, act };
};

app.post('/api/admin/phoenix-act', (req, res) => {
  const { actNumber } = req.body;
  const result = executePhoenixAct(actNumber);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// ----------------------------------------------------
// AI MARKET ASSISTANT CHAT ENDPOINT
// ----------------------------------------------------
app.post('/api/admin/ai-chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing chat message' });

  // Prepare fallback rules processor
  const processLocalCommands = (msg) => {
    const text = msg.toLowerCase();
    const cmds = [];
    let aiText = '';

    // Matchers
    if (text.includes('anthropic') && text.includes('ipo')) {
      cmds.push({ action: 'fireProjectPhoenixAct', params: { actNumber: 7 } });
      aiText = "Triggering Anthropic AI India IPO launch sequence (Act 7). The projector will display the 8-second Initial Public Offering announcement takeover.";
    }
    else if ((text.includes('indiastack') || text.includes('india stack')) && text.includes('ipo')) {
      cmds.push({ action: 'fireProjectPhoenixAct', params: { actNumber: 3 } });
      aiText = "Triggering IndiaStack Fintech IPO launch sequence (Act 3). The projector will display the 8-second Initial Public Offering announcement takeover.";
    }
    else if (text.includes('phoenix act') || text.includes('fire act')) {
      const match = text.match(/(?:act|phase)\s*(\d+)/i);
      if (match) {
        const actNum = Number(match[1]);
        cmds.push({ action: 'fireProjectPhoenixAct', params: { actNumber: actNum } });
        aiText = `Firing Project Phoenix Act ${actNum}. Live news bulletin and asset transitions will propagate to Projector.`;
      }
    } 
    else if (text.includes('crash the banking sector')) {
      cmds.push({ action: 'setSectorSentiment', params: { sector: 'Banking', level: -2 } });
      aiText = `Instructing systemic crash on Banking sector. Sentiment dial set to Extreme Bear.`;
    }
    else if (text.includes('crash everything except government bonds')) {
      cmds.push({ action: 'setGlobalSentiment', params: { level: -2 } });
      cmds.push({ action: 'setSectorSentiment', params: { sector: 'Government Bond', level: 0 } });
      aiText = `Executing global market panic. All securities set to Extreme Bear sentiment, preserving Government Bonds.`;
    }
    else if (text.includes('set') && text.includes('bullish')) {
      // Find sector
      const sectorMatch = msg.match(/(\w+)\s+sector/i);
      if (sectorMatch) {
        cmds.push({ action: 'setSectorSentiment', params: { sector: sectorMatch[1], level: 2 } });
        aiText = `Sector sentiment for ${sectorMatch[1]} set to Extreme Bull.`;
      }
    }
    else if (text.includes('go up') || text.includes('recover') || text.includes('pump') || text.includes('boost')) {
      // Check target ticker
      const tickerMatch = msg.match(/([a-z]{3,7})/i);
      const percentMatch = msg.match(/(\d+)%/);
      const minutesMatch = msg.match(/(\d+)\s*minute/);

      if (tickerMatch) {
        const ticker = tickerMatch[1].toUpperCase();
        const sec = state.securities.find(s => s.ticker === ticker);
        if (sec) {
          const pct = percentMatch ? Number(percentMatch[1]) : 20;
          const targetPrice = parseFloat((sec.currentPrice * (1 + pct / 100)).toFixed(2));
          const duration = minutesMatch ? Number(minutesMatch[1]) * 60 : 120;

          cmds.push({ action: 'setVelocity', params: { securityId: sec.id, targetPrice, durationSeconds: duration } });
          aiText = `Initiating organic price boost for ${ticker} targeting ₹${targetPrice} over ${duration} seconds.`;
        }
      }
    }

    if (cmds.length === 0) {
      aiText = "I parsed your query but couldn't map it directly to a local command template. Please describe an asset action: 'Make RELI go up 20% over 2 minutes', 'Crash the banking sector', 'Fire Act 4 of Project Phoenix', etc.";
    }

    return { response: aiText, commands: cmds };
  };

  // 1. Check for Anthropic API Key
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: `You are an AI market operations assistant for a financial market simulation platform.
You have access to the current simulation state and can generate market manipulation commands.

Current securities state:
${JSON.stringify(state.securities.map(s => ({ id: s.id, ticker: s.ticker, name: s.name, price: s.currentPrice, sector: s.sector, status: s.status })))}

When the admin asks you to do something, respond with:
1. A brief confirmation of what you're doing (1-2 sentences)
2. A JSON command block that the platform will execute

Available commands:
- setPriceInstant: { securityId, price }
- shiftPrice: { securityId, percentChange }
- setVelocity: { securityId, targetPrice, durationSeconds }
- setSentiment: { securityId, level } (level: -2 to +2)
- setSectorSentiment: { sector, level }
- setGlobalSentiment: { level }
- dispatchNews: { headline, description, sentiment, impactPercent, targetSecurityId }
- fireProjectPhoenixAct: { actNumber }
- freezeSecurity: { securityId }
- bankruptSecurity: { securityId }

Always respond with valid JSON in a code block tagged as "commands".
You can chain multiple commands together.
Format: \`\`\`commands\n[{"action": "...", "params": {...}}, ...]\n\`\`\``,
          messages: [{ role: "user", content: message }]
        })
      });

      if (response.ok) {
        const payload = await response.json();
        const aiResponseText = payload.content[0].text;
        
        // Parse and execute commands
        const commandsMatch = aiResponseText.match(/```commands\n([\s\S]*?)\n```/);
        const cmdsExecuted = [];
        if (commandsMatch) {
          try {
            const commands = JSON.parse(commandsMatch[1]);
            for (const cmd of commands) {
              await executeParsedCommand(cmd);
              cmdsExecuted.push(cmd);
            }
          } catch (pe) {
            console.error('AI Command parse error:', pe);
          }
        }
        
        return res.json({ response: aiResponseText, executed: cmdsExecuted });
      }
    } catch (apiErr) {
      console.warn('Anthropic API query failed, falling back to local NLP engine.', apiErr);
    }
  }

  // Local fallback execution
  const localResult = processLocalCommands(message);
  for (const cmd of localResult.commands) {
    await executeParsedCommand(cmd);
  }

  res.json({ response: localResult.response, executed: localResult.commands });
});

async function executeParsedCommand(cmd) {
  const { action, params } = cmd;
  console.log(`AI Command Execution: ${action} with params:`, params);

  if (action === 'setPriceInstant') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) {
      s.currentPrice = Number(params.price);
      s.priceHistory.push({ timestamp: Date.now(), price: s.currentPrice });
    }
  } 
  else if (action === 'shiftPrice') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) {
      s.currentPrice = parseFloat((s.currentPrice * (1 + Number(params.percentChange) / 100)).toFixed(2));
      s.priceHistory.push({ timestamp: Date.now(), price: s.currentPrice });
    }
  }
  else if (action === 'setVelocity') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) {
      const priceDiff = Number(params.targetPrice) - s.currentPrice;
      const steps = Number(params.durationSeconds) || 60;
      activeVelocityTargets[s.id] = {
        targetPrice: Number(params.targetPrice),
        stepVal: priceDiff / steps,
        stepsRemaining: steps
      };
    }
  }
  else if (action === 'setSentiment') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) s.sentimentOverride = Number(params.level);
  }
  else if (action === 'setSectorSentiment') {
    state.securities.forEach(s => {
      if (s.sector === params.sector) s.sentimentOverride = Number(params.level);
    });
  }
  else if (action === 'setGlobalSentiment') {
    state.securities.forEach(s => {
      s.sentimentOverride = Number(params.level);
    });
  }
  else if (action === 'fireProjectPhoenixAct') {
    executePhoenixAct(params.actNumber);
  }
  else if (action === 'freezeSecurity') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) s.status = 'Halted';
  }
  else if (action === 'bankruptSecurity') {
    const s = state.securities.find(sec => sec.id === params.securityId || sec.ticker === params.securityId);
    if (s) {
      s.status = 'Bankrupt';
      s.currentPrice = 0;
    }
  }

  saveState(true);
  broadcastState();
}

// ----------------------------------------------------
// VELOCITY TACT LOOP (1 second)
// ----------------------------------------------------
setInterval(() => {
  let changed = false;
  Object.entries(activeVelocityTargets).forEach(([secId, velocity]) => {
    const security = state.securities.find(s => s.id === secId);
    if (!security || security.status !== 'Active') {
      delete activeVelocityTargets[secId];
      return;
    }

    if (velocity.stepsRemaining <= 0) {
      security.currentPrice = velocity.targetPrice;
      security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
      delete activeVelocityTargets[secId];
      changed = true;
    } else {
      security.currentPrice = parseFloat((security.currentPrice + velocity.stepVal).toFixed(2));
      security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
      velocity.stepsRemaining--;
      changed = true;
    }

    if (security.priceHistory.length > 200) {
      security.priceHistory.shift();
    }
  });

  if (changed) {
    updateMarketIndex();
    saveState(false);
    broadcastState();
  }
}, 1000);

// SPA router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Background Market Price Simulation Loop
// Simulates continuous demand/supply trading fluctuations when the market is open
setInterval(() => {
  if (state && state.marketState && state.marketState.status === 'Open') {
    let priceChanged = false;
    
    state.securities.forEach(security => {
      if (security.status === 'Active') {
        const oldPrice = security.currentPrice;
        // Calculate random movement based on volatility: random walk with sentiment drift
        const volatilityFactor = security.volatility || 0.5;
        
        // Sentiment override drift factor
        const sentimentOverride = security.sentimentOverride || 0;
        const sentimentDrift = sentimentOverride * 0.45; // drifts up to 0.9% per tick
        
        // Range: -0.8% to +0.8% scaled by volatility
        const changePercent = (Math.random() - 0.49) * 1.6 * volatilityFactor + sentimentDrift;
        
        const newPrice = parseFloat((oldPrice * (1 + changePercent / 100)).toFixed(2));
        if (newPrice !== oldPrice && newPrice > 1) {
          security.currentPrice = newPrice;
          security.priceHistory.push({ timestamp: Date.now(), price: newPrice });
          
          // Keep history capped to avoid memory leak
          if (security.priceHistory.length > 200) {
            security.priceHistory.shift();
          }

          const alert = checkCircuitBreaker(security, oldPrice, newPrice);
          if (alert) {
            activeAlerts.add(JSON.stringify(alert));
          }
          priceChanged = true;
        }
      }
    });

    if (priceChanged) {
      updateMarketIndex();
      saveState(false);
      broadcastState();
    }
  }
}, 3000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`FMS Platform Backend running on http://localhost:${PORT}`);
  console.log(`Real-time WebSocket subscriptions active`);
  console.log(`====================================================`);
});
