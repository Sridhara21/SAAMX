import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';

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
  const sectors = [
    'Technology', 'AI', 'Healthcare', 'Energy', 'Banking', 
    'Manufacturing', 'Renewable Energy', 'Telecom', 'Retail', 
    'Government Bond', 'Corporate Bond', 'ETF', 'Mutual Fund', 'REIT'
  ];

  const companyNames = [
    // SECTION 1 — INDIAN LARGE-CAP STOCKS
    { ticker: 'RELI', name: 'Reliance Industries Ltd', sector: 'Energy / Conglomerate', basePrice: 2850, totalUnits: 150, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', basePrice: 3920, totalUnits: 120, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'INFY', name: 'Infosys Ltd', sector: 'Technology', basePrice: 1780, totalUnits: 200, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'HDFC', name: 'HDFC Bank Ltd', sector: 'Banking', basePrice: 1650, totalUnits: 250, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'ICBK', name: 'ICICI Bank Ltd', sector: 'Banking', basePrice: 1180, totalUnits: 300, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'WIPR', name: 'Wipro Ltd', sector: 'Technology', basePrice: 485, totalUnits: 400, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'HCLT', name: 'HCL Technologies', sector: 'Technology', basePrice: 1620, totalUnits: 220, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'BJFN', name: 'Bajaj Finance Ltd', sector: 'Banking / NBFC', basePrice: 7200, totalUnits: 60, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'BRTI', name: 'Bharti Airtel Ltd', sector: 'Telecom', basePrice: 1420, totalUnits: 280, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'ITCL', name: 'ITC Ltd', sector: 'FMCG / Conglomerate', basePrice: 445, totalUnits: 500, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure / Engineering', basePrice: 3650, totalUnits: 100, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'MRTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', basePrice: 12500, totalUnits: 35, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'ASPN', name: 'Asian Paints Ltd', sector: 'FMCG / Consumer', basePrice: 2980, totalUnits: 120, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'NEST', name: 'Nestle India Ltd', sector: 'FMCG', basePrice: 24500, totalUnits: 18, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'TITN', name: 'Titan Company Ltd', sector: 'Consumer Goods', basePrice: 3450, totalUnits: 100, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'KOTK', name: 'Kotak Mahindra Bank', sector: 'Banking', basePrice: 1850, totalUnits: 200, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'AXBK', name: 'Axis Bank Ltd', sector: 'Banking', basePrice: 1095, totalUnits: 350, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'SUNP', name: 'Sun Pharmaceutical', sector: 'Healthcare', basePrice: 1580, totalUnits: 220, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'HUL', name: 'Hindustan Unilever Ltd', sector: 'FMCG', basePrice: 2650, totalUnits: 140, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'PWGR', name: 'Power Grid Corporation', sector: 'Energy / Utilities', basePrice: 285, totalUnits: 800, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'COAL', name: 'Coal India Ltd', sector: 'Energy', basePrice: 465, totalUnits: 600, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'NTPC', name: 'NTPC Ltd', sector: 'Energy / Power', basePrice: 368, totalUnits: 700, risk: 'Low', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', basePrice: 272, totalUnits: 800, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'SBIN', name: 'State Bank of India', sector: 'Banking (PSU)', basePrice: 820, totalUnits: 450, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },
    { ticker: 'BPCL', name: 'Bharat Petroleum Corp', sector: 'Energy', basePrice: 525, totalUnits: 400, risk: 'Medium', type: 'Stock', volMin: 0.35, volMax: 0.55 },

    // SECTION 2 — INDIAN MID-CAP STOCKS
    { ticker: 'ZMAT', name: 'Zomato Ltd', sector: 'Technology / Food Delivery', basePrice: 185, totalUnits: 1000, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'PYTM', name: 'Paytm (One97 Communications)', sector: 'Fintech', basePrice: 425, totalUnits: 600, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'NYKA', name: 'Nykaa (FSN E-Commerce)', sector: 'Retail / E-Commerce', basePrice: 175, totalUnits: 900, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'DLVY', name: 'Delhivery Ltd', sector: 'Logistics', basePrice: 385, totalUnits: 600, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'IRCT', name: 'IRCTC Ltd', sector: 'Travel / Tourism', basePrice: 820, totalUnits: 350, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'INDB', name: 'IndusInd Bank', sector: 'Banking', basePrice: 1450, totalUnits: 250, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'VOLT', name: 'Voltas Ltd', sector: 'Manufacturing', basePrice: 1280, totalUnits: 280, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'PIDI', name: 'Pidilite Industries', sector: 'Chemicals', basePrice: 2850, totalUnits: 120, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'DIVI', name: 'Divi\'s Laboratories', sector: 'Healthcare / Pharma', basePrice: 4200, totalUnits: 80, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'ABML', name: 'ABB India Ltd', sector: 'Manufacturing / Electrical', basePrice: 6800, totalUnits: 50, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'TATA', name: 'Tata Motors Ltd', sector: 'Automobile', basePrice: 980, totalUnits: 380, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'JSWL', name: 'JSWL Steel Ltd', sector: 'Manufacturing / Steel', basePrice: 870, totalUnits: 400, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'ADNI', name: 'Adani Enterprises', sector: 'Conglomerate', basePrice: 2450, totalUnits: 140, risk: 'High', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'CIPLA', name: 'Cipla Ltd', sector: 'Healthcare / Pharma', basePrice: 1540, totalUnits: 230, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },
    { ticker: 'DRRD', name: 'Dr Reddy\'s Laboratories', sector: 'Healthcare / Pharma', basePrice: 6200, totalUnits: 55, risk: 'Medium', type: 'Stock', volMin: 0.50, volMax: 0.70 },

    // SECTION 3 — INTERNATIONAL STOCKS (Global Equities)
    { ticker: 'AAPL', name: 'Apple Inc', sector: 'Global Equity', basePrice: 15200, totalUnits: 30, risk: 'Low', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Global Equity', basePrice: 28500, totalUnits: 15, risk: 'Low', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'GOOGL', name: 'Alphabet Inc (Google)', sector: 'Global Equity', basePrice: 13800, totalUnits: 30, risk: 'Low', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Global Equity', basePrice: 14200, totalUnits: 25, risk: 'Medium', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Global Equity', basePrice: 96000, totalUnits: 5, risk: 'High', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'META', name: 'Meta Platforms Inc', sector: 'Global Equity', basePrice: 42500, totalUnits: 10, risk: 'Medium', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Global Equity', basePrice: 18500, totalUnits: 20, risk: 'High', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'BABA', name: 'Alibaba Group', sector: 'Global Equity', basePrice: 7200, totalUnits: 60, risk: 'High', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },
    { ticker: 'SAMS', name: 'Samsung Electronics', sector: 'Global Equity', basePrice: 5800, totalUnits: 80, risk: 'Medium', type: 'GlobalEquity', volMin: 0.40, volMax: 0.65 },

    // SECTION 4 — ETFs
    { ticker: 'NIFBEES', name: 'SBI Nifty 50 ETF', sector: 'ETF', basePrice: 218, totalUnits: 1000, risk: 'Low', type: 'ETF', volMin: 0.15, volMax: 0.30 },
    { ticker: 'BANKBEES', name: 'Nippon India Bank BeES ETF', sector: 'ETF', basePrice: 485, totalUnits: 500, risk: 'Medium', type: 'ETF', volMin: 0.15, volMax: 0.30 },
    { ticker: 'GOLDBEES', name: 'Nippon India Gold BeES ETF', sector: 'ETF', basePrice: 58, totalUnits: 2000, risk: 'Low', type: 'ETF', volMin: 0.15, volMax: 0.30 },
    { ticker: 'ITBEES', name: 'Mirae Asset NYSE FANG+ ETF', sector: 'ETF', basePrice: 85, totalUnits: 1500, risk: 'Medium', type: 'ETF', volMin: 0.15, volMax: 0.30 },
    { ticker: 'PSUBEES', name: 'Mirae Asset PSU Bank ETF', sector: 'ETF', basePrice: 42, totalUnits: 2500, risk: 'Medium', type: 'ETF', volMin: 0.15, volMax: 0.30 },
    { ticker: 'LIQUIDBEES', name: 'Nippon India ETF Liquid BeES', sector: 'ETF', basePrice: 1000, totalUnits: 200, risk: 'Low', type: 'ETF', volMin: 0.15, volMax: 0.30 },

    // SECTION 5 — REITs
    { ticker: 'EMBOFFS', name: 'Embassy Office Parks REIT', sector: 'REIT', basePrice: 368, totalUnits: 600, risk: 'Low', type: 'REIT', volMin: 0.20, volMax: 0.35 },
    { ticker: 'MINDSP', name: 'Mindspace Business Parks REIT', sector: 'REIT', basePrice: 325, totalUnits: 700, risk: 'Low', type: 'REIT', volMin: 0.20, volMax: 0.35 },
    { ticker: 'NEXUS', name: 'Nexus Select Trust REIT', sector: 'REIT', basePrice: 132, totalUnits: 1200, risk: 'Medium', type: 'REIT', volMin: 0.20, volMax: 0.35 },
    { ticker: 'BROOKF', name: 'Brookfield India REIT', sector: 'REIT', basePrice: 285, totalUnits: 800, risk: 'Low', type: 'REIT', volMin: 0.20, volMax: 0.35 },

    // SECTION 6 — InvITs
    { ticker: 'IRBINV', name: 'IRB InvIT Fund', sector: 'InvIT', basePrice: 85, totalUnits: 1500, risk: 'Medium', type: 'InvIT', volMin: 0.20, volMax: 0.35 },
    { ticker: 'INDGRD', name: 'India Grid Trust InvIT', sector: 'InvIT', basePrice: 142, totalUnits: 1000, risk: 'Low', type: 'InvIT', volMin: 0.20, volMax: 0.35 },
    { ticker: 'PWRGRD', name: 'PowerGrid Infrastructure InvIT', sector: 'InvIT', basePrice: 125, totalUnits: 1200, risk: 'Low', type: 'InvIT', volMin: 0.20, volMax: 0.35 },

    // SECTION 7 — GOVERNMENT BONDS
    { ticker: 'GSEC10', name: 'GoI 10-Year G-Sec 7.26%', sector: 'Government Bond', basePrice: 1050, totalUnits: 400, risk: 'Low', type: 'GovernmentBond', volMin: 0.05, volMax: 0.12 },
    { ticker: 'GSEC5', name: 'GoI 5-Year G-Sec 7.10%', sector: 'Government Bond', basePrice: 1020, totalUnits: 400, risk: 'Low', type: 'GovernmentBond', volMin: 0.05, volMax: 0.12 },
    { ticker: 'SGB', name: 'Sovereign Gold Bond 2026', sector: 'Government Bond', basePrice: 6250, totalUnits: 150, risk: 'Low', type: 'GovernmentBond', volMin: 0.05, volMax: 0.12 },
    { ticker: 'INFLNK', name: 'RBI Floating Rate Savings Bond', sector: 'Government Bond', basePrice: 1000, totalUnits: 500, risk: 'Low', type: 'GovernmentBond', volMin: 0.05, volMax: 0.12 },

    // SECTION 8 — CORPORATE BONDS
    { ticker: 'RELIBND', name: 'Reliance Industries 8.5% Bond 2030', sector: 'Corporate Bond', basePrice: 1080, totalUnits: 300, risk: 'Low', type: 'CorporateBond', volMin: 0.12, volMax: 0.22 },
    { ticker: 'HDFCBND', name: 'HDFC Bank 7.9% Bond 2028', sector: 'Corporate Bond', basePrice: 1045, totalUnits: 350, risk: 'Low', type: 'CorporateBond', volMin: 0.12, volMax: 0.22 },
    { ticker: 'ADNBND', name: 'Adani Ports 8.9% Bond 2031', sector: 'Corporate Bond', basePrice: 985, totalUnits: 250, risk: 'Medium', type: 'CorporateBond', volMin: 0.12, volMax: 0.22 },
    { ticker: 'TATBND', name: 'Tata Steel 9.1% NCD 2029', sector: 'Corporate Bond', basePrice: 960, totalUnits: 280, risk: 'Medium', type: 'CorporateBond', volMin: 0.12, volMax: 0.22 },

    // SECTION 9 — MUTUAL FUNDS
    { ticker: 'HDFCFLX', name: 'HDFC Flexicap Fund', sector: 'Mutual Fund', basePrice: 145, totalUnits: 1200, risk: 'Medium', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'ICICIMID', name: 'ICICI Prudential Midcap Fund', sector: 'Mutual Fund', basePrice: 215, totalUnits: 900, risk: 'High', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'SBISML', name: 'SBI Small Cap Fund', sector: 'Mutual Fund', basePrice: 128, totalUnits: 1100, risk: 'High', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'AXISLTQ', name: 'Axis Long Term Equity Fund (ELSS)', sector: 'Mutual Fund', basePrice: 68, totalUnits: 2000, risk: 'Medium', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'MIRLAG', name: 'Mirae Asset Large Cap Fund', sector: 'Mutual Fund', basePrice: 92, totalUnits: 1500, risk: 'Low', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'PPFASG', name: 'Parag Parikh Flexi Cap Fund', sector: 'Mutual Fund', basePrice: 75, totalUnits: 1800, risk: 'Medium', type: 'MutualFund', volMin: 0.20, volMax: 0.40 },
    { ticker: 'NIPPNF', name: 'Nippon India Nifty 50 BeES', sector: 'Mutual Fund', basePrice: 218, totalUnits: 1000, risk: 'Low', type: 'MutualFund', volMin: 0.20, volMax: 0.40 }
  ];

  const firstNames = ['Amit', 'Rajesh', 'Vikram', 'Anil', 'Sanjay', 'Sunil', 'Vijay', 'Rahul', 'Deepak', 'Aarav', 'Neha', 'Pooja', 'Priya', 'Ananya', 'Rohan'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Singh', 'Rao', 'Choudhury', 'Iyer', 'Sen', 'Banerjee'];

  // Seed Securities
  state.securities = companyNames.map((c, index) => {
    const ceo = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const hq = indianCities[Math.floor(Math.random() * indianCities.length)];
    const founded = Math.floor(Math.random() * 35) + 1990;

    const type = c.type;
    const basePrice = c.basePrice;
    const totalUnits = c.totalUnits;
    const volatility = parseFloat((Math.random() * (c.volMax - c.volMin) + c.volMin).toFixed(2));
    const riskRating = c.risk;
    const growthRating = Math.floor(Math.random() * 5) + 1;

    // Generate programmatic profileDetails
    let tagline = `Real-world market leader in ${c.sector}.`;
    let about = `Leading enterprise specializing in ${c.sector.toLowerCase()} services, catering to regional and global market segments.`;
    let facts = [];
    let holdings = null;
    let note = null;

    if (type === 'Stock') {
      tagline = `Pioneer in Indian ${c.sector} sector.`;
      about = `${c.name} is a major Indian enterprise driving commercial scale in ${c.sector.toLowerCase()} offerings.`;
      facts = [
        { label: 'Revenue', value: `₹${(c.basePrice * 125).toLocaleString()} Cr` },
        { label: 'Net Profit', value: `₹${(c.basePrice * 15).toLocaleString()} Cr` },
        { label: 'Debt-to-Equity', value: (Math.random() * 0.8 + 0.1).toFixed(2) },
        { label: 'CEO', value: ceo }
      ];
    } else if (type === 'GlobalEquity') {
      tagline = `Global technology and commerce giant listed internationally.`;
      about = `${c.name} is a global market leader listed on international markets, offering high-growth equity exposure.`;
      facts = [
        { label: 'Listed on', value: c.ticker === 'SAMS' ? 'KRX' : c.ticker === 'BABA' ? 'NYSE' : 'NASDAQ' },
        { label: 'Currency', value: c.ticker === 'SAMS' ? 'KRW' : 'USD' },
        { label: 'CEO', value: ceo },
        { label: 'Country', value: c.ticker === 'SAMS' ? 'South Korea' : c.ticker === 'BABA' ? 'China' : 'USA' }
      ];
      note = 'International stocks carry additional currency risk and geopolitical risk associated with foreign equity exposure.';
    } else if (type === 'ETF') {
      const tracksMap = {
        'NIFBEES': 'SBI Nifty 50 ETF',
        'BANKBEES': 'Nippon India Bank BeES ETF',
        'GOLDBEES': 'Nippon India Gold BeES ETF',
        'ITBEES': 'Mirae Asset NYSE FANG+ ETF',
        'PSUBEES': 'Mirae Asset PSU Bank ETF',
        'LIQUIDBEES': 'Nippon India ETF Liquid BeES'
      };
      const constituentsMap = {
        'NIFBEES': 'RELI, TCS, HDFC, ICBK, INFY',
        'BANKBEES': 'HDFC, ICBK, KOTK, AXBK, INDB',
        'GOLDBEES': 'Physical Gold Bullion (99.5% Purity)',
        'ITBEES': 'AAPL, MSFT, GOOGL, AMZN, NVDA',
        'PSUBEES': 'SBIN, BANKBARODA, CANBK, PNB, UNIONBANK',
        'LIQUIDBEES': 'Triparty Repo (TREPS), Call Money'
      };
      tagline = `Passively managed fund tracking the ${tracksMap[c.ticker] || 'index'}.`;
      about = `Tracks the performance of the ${tracksMap[c.ticker] || 'index'} in equal proportion weights.`;
      facts = [
        { label: 'Index Tracked', value: tracksMap[c.ticker] || 'Equity Index' },
        { label: 'Expense Ratio', value: '0.15%' },
        { label: 'AUM', value: '₹12,450 Cr' },
        { label: 'Category', value: 'Exchange Traded Fund' }
      ];
      holdings = [
        { name: 'Primary Index Float', value: constituentsMap[c.ticker] || 'Market Constituents' }
      ];
    } else if (type === 'REIT') {
      tagline = `Income-yielding real estate investment trust.`;
      about = `Owns and operates prime commercial IT parks and office spaces across major metro cities in India.`;
      facts = [
        { label: 'Properties Owned', value: 'IT Parks & Offices in Bengaluru, Mumbai, Pune' },
        { label: 'Dividend Yield', value: '7.5%' },
        { label: 'Sponsor', value: c.ticker === 'BROOKF' ? 'Brookfield' : 'Embassy/Blackstone' },
        { label: 'Listed Since', value: '2019' }
      ];
    } else if (type === 'InvIT') {
      tagline = `Infrastructure yield investment trust.`;
      about = `Pools investor capital to operate national highway toll roads, power transmission grids, and telecom towers.`;
      facts = [
        { label: 'Infrastructure Assets', value: 'Highway Tolls, Telecom Towers & Grid Transmission Lines' },
        { label: 'Revenue Model', value: 'Toll Collection & Transmission Tariffs' },
        { label: 'Sponsor', value: 'PowerGrid / IRB Infra' },
        { label: 'Listed Since', value: '2020' }
      ];
    } else if (type === 'GovernmentBond') {
      tagline = `Fixed income sovereign debt guaranteed by the Reserve Bank of India.`;
      about = `Sovereign bonds issued by the Government of India, offering high safety and predictable yield rates.`;
      facts = [
        { label: 'Issuer', value: 'Government of India / RBI' },
        { label: 'Coupon Rate', value: c.ticker === 'SGB' ? '2.5% + Gold appreciation' : '7.26% paid semi-annually' },
        { label: 'Credit Rating', value: 'AAA Sovereign' },
        { label: 'Tenure', value: c.ticker === 'SGB' ? '8 Years' : '10 Years' }
      ];
    } else if (type === 'CorporateBond') {
      tagline = `Fixed income corporate debt debenture.`;
      about = `Corporate bonds carrying credit risk associated with the issuer, offering higher yield than government debt.`;
      facts = [
        { label: 'Issuer', value: c.name.split(' ')[0] },
        { label: 'Coupon Rate', value: '8.5% paid quarterly' },
        { label: 'Credit Rating', value: 'AAA Stable' },
        { label: 'Maturity', value: '2030' }
      ];
    } else if (type === 'MutualFund') {
      const fundData = {
        'HDFCFLX': {
          manager: 'Roshi Jain',
          aum: '₹52,000 Cr',
          holdings: 'ICICI Bank (8.2%), HDFC Bank (7.8%), Infosys (6.1%), Reliance Industries (5.9%), Axis Bank (4.7%)',
          alloc: 'Financials (32%), Tech (18%), FMCG (14%)',
          about: 'Flexicap equity mutual fund shifting weights dynamically across market caps to maximize returns.'
        },
        'ICICIMID': {
          manager: 'Anish Tawakley',
          aum: '₹29,500 Cr',
          holdings: 'TVS Motors (6.5%), Jindal Steel (5.8%), Federal Bank (5.1%), Tata Communications (4.8%), Bharat Electronics (4.5%)',
          alloc: 'Auto (22%), Metals (18%), Financials (15%)',
          about: 'Focuses on mid-sized growth companies with capital appreciation potential.'
        },
        'SBISML': {
          manager: 'R. Srinivasan',
          aum: '₹22,100 Cr',
          holdings: 'Blue Star (7.2%), Carborundum (6.1%), Elgi Equipments (5.5%), Kalpataru (4.8%), KSB Ltd (4.2%)',
          alloc: 'Capital Goods (28%), Consumer (20%), Chemicals (12%)',
          about: 'Invests in small-cap companies offering high risk-return profiles.'
        },
        'AXISLTQ': {
          manager: 'Jinesh Gopani',
          aum: '₹34,000 Cr',
          holdings: 'Bajaj Finance (9.1%), Avenue Supermarts (8.5%), TCS (7.2%), Kotak Bank (6.8%), ICICI Bank (6.1%)',
          alloc: 'Financials (35%), Retail (22%), Technology (18%)',
          about: 'ELSS tax saving fund focusing on long-term compounders with clean balance sheets.'
        },
        'MIRLAG': {
          manager: 'Gaurav Misra',
          aum: '₹37,500 Cr',
          holdings: 'HDFC Bank (9.5%), ICICI Bank (8.8%), Reliance (8.1%), Infosys (7.5%), Larsen & Toubro (5.2%)',
          alloc: 'Financials (38%), Energy (15%), Technology (12%)',
          about: 'Core large-cap fund investing in top blue-chip conglomerates.'
        },
        'PPFASG': {
          manager: 'Rajeev Thakkar',
          aum: '₹62,000 Cr',
          holdings: 'Alphabet Inc (8.5%), Microsoft (7.8%), Amazon (6.5%), ITC Ltd (5.2%), HDFC Bank (4.9%)',
          alloc: 'Technology (28%), Global Equity (22%), Financials (20%)',
          about: 'Flexicap fund with international diversification mandate to mitigate domestic risks.'
        },
        'NIPPNF': {
          manager: 'Sailesh Raj Bhan',
          aum: '₹18,400 Cr',
          holdings: 'Reliance (9.2%), HDFC Bank (8.5%), ICICI Bank (7.8%), Infosys (6.9%), TCS (4.8%)',
          alloc: 'Conglomerates (30%), Financials (25%), Tech (18%)',
          about: 'Index tracking mutual fund mirroring Nifty 50 constituents.'
        }
      };

      const info = fundData[c.ticker] || fundData['HDFCFLX'];
      tagline = `Managed equity mutual fund portfolio.`;
      about = info.about;
      facts = [
        { label: 'Fund Manager', value: info.manager },
        { label: 'AUM', value: info.aum },
        { label: 'Expense Ratio', value: '1.5%' },
        { label: 'Category', value: 'Mutual Fund' }
      ];
      holdings = [
        { name: 'Top 5 Constituents', value: info.holdings },
        { name: 'Sector Exposure', value: info.alloc }
      ];
    }

    return {
      id: `S${String(index + 1).padStart(2, '0')}`,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      type,
      basePrice,
      currentPrice: basePrice,
      totalUnits,
      availableUnits: totalUnits,
      volatility,
      riskRating,
      growthRating,
      status: 'Active',
      description: tagline,
      ceoName: ceo,
      foundedYear: founded,
      headquarters: hq,
      logoInitials: c.ticker.slice(0, 2),
      dividendYield: parseFloat((Math.random() * 4 + 1).toFixed(2)),
      priceHistory: [{ timestamp: Date.now(), price: basePrice }],
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

const executePhoenixAct = (actNum) => {
  const security = state.securities.find(s => s.ticker === PHOENIX_TARGET);
  if (!security) return { error: 'DTAI security not found in database.' };

  const act = Number(actNum);

  if (act === 1) {
    // Loss Announcement
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
    // Mystery Buyer
    security.sentimentOverride = 0;
    // Set target price to 210 over 120 seconds
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
      headline: 'BREAKING: Singapore-Based Firm Acquires ₹100 Crore Strategic Stake in Delta AI Labs',
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
    // Leadership Upheaval
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
  else if (act === 4) {
    // Pump Phase Part 1
    security.sentimentOverride = 2;
    // Velocity to 280 over 60 seconds
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
  else if (act === 5) {
    // Pump Phase Part 2 (Rumour Peak)
    security.sentimentOverride = 2;
    // Velocity to 430 over 60 seconds
    const target = 430;
    const dur = 60;
    const priceDiff = target - security.currentPrice;
    activeVelocityTargets[security.id] = {
      targetPrice: target,
      stepVal: priceDiff / dur,
      stepsRemaining: dur
    };

    const news = {
      id: `NW_PHX_5`,
      headline: 'RUMOUR ⚠ UNVERIFIED: Tata Group in Advanced Talks to Acquire Delta AI Labs at ₹600 Premium',
      description: 'Unverified market sources claim Tata Sons is conducting due diligence on a full acquisition of DTAI. Volumes surge 847% above average.',
      sentiment: 'Positive',
      impactPercent: 15,
      triggeredAt: Date.now(),
      category: 'Macro',
      affectedSecurityIds: [security.id]
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 6) {
    // SEBI Probe
    security.sentimentOverride = -2;
    // Crash 25% instantly, then velocity to 220 over 180 seconds
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
  else if (act === 7) {
    // Scandal Breaks
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
  else if (act === 8) {
    // Suspend Trading
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
  else if (act === 9) {
    // Insolvency
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
  else if (act === 10) {
    // Market Recovery
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

    // Reset sentiment to neutral after 5 mins
    setTimeout(() => {
      state.securities.forEach(s => {
        if (s.ticker !== PHOENIX_TARGET) s.sentimentOverride = 0;
      });
      broadcastState();
    }, 5 * 60 * 1000);
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
    if (text.includes('phoenix act') || text.includes('fire act')) {
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
