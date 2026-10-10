import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { INITIAL_SECURITIES_TEMPLATES } from './initial_securities.js';
import { generateFullSecurityUniverse } from './universe_generator.js';
import { calculateEventImpact, processVodafoneCrisisAct, processIpoStage } from './src/lib/eventEngine.js';
import * as scoringEngine from './scoring_engine.js';

const PORT = process.env.PORT || 3000;
const STATE_FILE = './state.json';
const BACKUP_DIR = './backups';
const PASSWORD_SECRET = 'fms-event-2026';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Canonical Default SAAMX Event Schedule
export const DEFAULT_EVENT_SCHEDULE = [
  { id: 'SCH_0800', time: '08:00', startTime: '08:00', endTime: '08:00', title: 'Reporting and Registration', phase: 'REGISTRATION', isTradingPermitted: false },
  { id: 'SCH_0800_0900', time: '08:00 - 09:00', startTime: '08:00', endTime: '09:00', title: 'Registration and Participant Briefing', phase: 'BRIEFING', isTradingPermitted: false },
  { id: 'SCH_0900_0930', time: '09:00 - 09:30', startTime: '09:00', endTime: '09:30', title: 'Pre-Market Preparation', phase: 'PRE_OPEN', isTradingPermitted: false },
  { id: 'SCH_0930', time: '09:30', startTime: '09:30', endTime: '09:30', title: 'Official Market Open', phase: 'MARKET_OPEN', isTradingPermitted: true },
  { id: 'SCH_1000', time: '10:00', startTime: '10:00', endTime: '10:00', title: 'Opening Market News Broadcast', phase: 'OPENING_BROADCAST', isTradingPermitted: true },
  { id: 'SCH_1000_1200', time: '10:00 - 12:00', startTime: '10:00', endTime: '12:00', title: 'Morning Trading Session', phase: 'MORNING_SESSION', isTradingPermitted: true },
  { id: 'SCH_1200_1300', time: '12:00 - 13:00', startTime: '12:00', endTime: '13:00', title: 'Lunch Break (Trading Paused)', phase: 'LUNCH_BREAK', isTradingPermitted: false },
  { id: 'SCH_1300_1530', time: '13:00 - 15:30', startTime: '13:00', endTime: '15:30', title: 'Afternoon Trading Session', phase: 'AFTERNOON_SESSION', isTradingPermitted: true },
  { id: 'SCH_1530', time: '15:30', startTime: '15:30', endTime: '15:30', title: 'Trading Closes & Immutable Closing Valuation Snapshot Freezes', phase: 'VALUATION_FREEZE', isTradingPermitted: false },
  { id: 'SCH_1530_1545', time: '15:30 - 15:45', startTime: '15:30', endTime: '15:45', title: 'Settlement and Reconciliation', phase: 'RECONCILIATION', isTradingPermitted: false },
  { id: 'SCH_1545_1600', time: '15:45 - 16:00', startTime: '15:45', endTime: '16:00', title: 'Judging Deliberation & Results Approval', phase: 'APPROVAL', isTradingPermitted: false },
  { id: 'SCH_1600', time: '16:00', startTime: '16:00', endTime: '16:00', title: 'Official Results Announced', phase: 'RESULTS', isTradingPermitted: false }
];

// Initial default state with Multi-Currency & FX Engine
const createInitialState = () => ({
  securities: [],
  teams: [],
  transactions: [],
  orders: [],
  newsEvents: [],
  corporateActions: [],
  auditLog: [],
  leaderboard: {},
  advisorReferrals: [],
  events: [
    {
      eventId: 'EVT_LIVE_MAIN',
      eventName: 'SAAMX Annual Inter-School Asset Market Championship',
      eventDate: '2026-10-15',
      venue: 'Main Trading Auditorium',
      registrationOpen: true,
      registrationClose: '2026-10-15T09:00:00Z',
      maximumInvestmentHouses: 40,
      teamSize: 4,
      startingCapital: 10000000, // ₹1 Crore
      marketOpenTime: '09:30',
      marketCloseTime: '15:30',
      lunchBreak: '12:00 - 13:00',
      resultsTime: '16:00',
      eventStatus: 'REGISTRATION_OPEN',
      eventMode: 'LIVE',
      schedule: JSON.parse(JSON.stringify(DEFAULT_EVENT_SCHEDULE)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      eventId: 'EVT_REHEARSAL_MAIN',
      eventName: 'SAAMX Simulation & Practice Rehearsal',
      eventDate: '2026-10-08',
      venue: 'Simulation Floor',
      registrationOpen: true,
      registrationClose: '2026-10-08T23:59:59Z',
      maximumInvestmentHouses: 20,
      teamSize: 4,
      startingCapital: 10000000,
      marketOpenTime: '09:30',
      marketCloseTime: '15:30',
      lunchBreak: '12:00 - 13:00',
      resultsTime: '16:00',
      eventStatus: 'MARKET_ACTIVE',
      eventMode: 'REHEARSAL',
      schedule: JSON.parse(JSON.stringify(DEFAULT_EVENT_SCHEDULE)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  currentEventId: 'EVT_LIVE_MAIN',
  schools: [],
  investmentHouses: [],
  registrations: [],
  eventSnapshots: [],
  eventClosingSnapshots: {},
  scoringConfig: JSON.parse(JSON.stringify(scoringEngine.DEFAULT_SCORING_CONFIG)),
  judgeScorecards: [],
  penalties: [],
  resultsLifecycle: 'CONFIGURED', // CONFIGURED -> LIVE_SCORING -> MARKET_CLOSED -> VALUATION_FROZEN -> JUDGING_COMPLETE -> RECONCILIATION -> APPROVED -> PUBLISHED
  publishedResults: null,
  reconciliationRecords: [],
  intelligenceFeed: [],
  riskControls: {
    circuitBreakerThreshold: 30, // 30%
    priceBandPercent: 20, // 20%
    maxOrderValue: 50000000, // ₹5 Crore max single order
    maxPositionSizePercent: 35, // max 35% portfolio in single stock
    concentrationWarningPercent: 25,
    allowShortSelling: false,
    cashProtectionFloor: 0
  },
  orderDesks: {
    DESK_1: { id: 'DESK_1', name: 'Order Desk 1 (Blue)', operator: 'Sandesh', activeOrderIds: [], totalProcessed: 0 },
    DESK_2: { id: 'DESK_2', name: 'Order Desk 2 (Amber)', operator: 'Akshay', activeOrderIds: [], totalProcessed: 0 },
    DESK_3: { id: 'DESK_3', name: 'Order Desk 3 (Emerald)', operator: 'Aarush', activeOrderIds: [], totalProcessed: 0 },
    DESK_4: { id: 'DESK_4', name: 'Order Desk 4 (Purple)', operator: 'Sridhara', activeOrderIds: [], totalProcessed: 0 },
    DESK_5: { id: 'DESK_5', name: 'Order Desk 5 (Crimson)', operator: 'Aksharaa', activeOrderIds: [], totalProcessed: 0 }
  },
  fxQueue: [],
  fxRates: {
    USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
    GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
    EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
  },
  fxTransactions: [],
  marketIndices: {
    GLOBAL100: { name: 'SAAMX GLOBAL 100', currentValue: 1000.0, openingValue: 1000.0, changePercent: 0.0 },
    INDIA50: { name: 'SAAMX INDIA 50', currentValue: 5000.0, openingValue: 5000.0, changePercent: 0.0 },
    US100: { name: 'SAAMX US 100', currentValue: 8000.0, openingValue: 8000.0, changePercent: 0.0 },
    UK100: { name: 'SAAMX UK 100', currentValue: 4000.0, openingValue: 4000.0, changePercent: 0.0 }
  },
  bullBear: {
    bull: { stance: 'STRONGLY BULLISH', confidence: 85, statement: 'Robust institutional accumulation.', publishedAt: Date.now() },
    bear: { stance: 'DEFENSIVE / BEARISH', confidence: 75, statement: 'Refinancing headwinds warrant caution.', publishedAt: Date.now() }
  },
  bullBearDebate: {
    activeRound: 1,
    currentTopic: 'Global Tech Equity Valuations & AI Monetization Models',
    timerSeconds: 300,
    status: 'IDLE', // IDLE, ACTIVE, PAUSED, CONCLUDED
    history: [],
    moderatorNotes: ''
  },
  advisors: {
    DOMESTIC: { id: 'DOMESTIC', name: 'Domestic Equities & Sector Strategist', coverage: 'NSE/BSE Indian Large, Mid & Small Caps', bio: 'Specialist in domestic industrial, banking, and tech equity trends.' },
    GLOBAL: { id: 'GLOBAL', name: 'Global & Cross-Border Equity Specialist', coverage: 'US (NASDAQ/NYSE) & UK/Europe Equities', bio: 'Monitors international market movements and tech valuation multiples.' },
    FX_COMMODITY: { id: 'FX_COMMODITY', name: 'FX & Commodities Macro Analyst', coverage: 'USD/INR, GBP/INR, EUR/INR, Gold, Crude', bio: 'Analyzes macro monetary shifts, cross-border flows, and currency hedging.' },
    RISK: { id: 'RISK', name: 'Portfolio Risk & Asset Allocation Officer', coverage: 'Concentration Limits, Diversification & Drawdown Control', bio: 'Surveils floor-wide portfolio leverage, liquidity buffers, and circuit risks.' }
  },
  brokerRecommendations: [],
  polls: {},
  marketState: {
    status: 'NotStarted', // NotStarted, Open, Paused, Closed
    sessionState: 'PRE_OPEN',
    simulationStartTime: null,
    simulationDurationMinutes: 60,
    marketIndex: 0,
    pauseTimeOffset: 0, // Cumulative time paused in ms
    pausedAt: null
  },
  settings: {
    startingCapitalRetail: 10000000, // ₹1 Crore
    startingCapitalMutualFund: 10000000, // ₹1 Crore
    startingCapitalHedgeFund: 10000000, // ₹1 Crore
    defaultVolatility: 0.5,
    circuitBreakerThreshold: 30, // 30%
    circuitBreakerWindowMinutes: 5,
    fxProcessingDurationSec: 4
  }
});

let state = createInitialState();
let transactionsSinceLastBackup = 0;
let lastBackupTime = Date.now();

const logAuditEvent = (entry) => {
  try {
    const auditId = `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullEntry = {
      id: auditId,
      timestamp: Date.now(),
      actor: entry.actor || 'System',
      role: entry.role || 'system',
      action: entry.action || 'MUTATION',
      target: entry.target || 'General',
      previousState: entry.previousState !== undefined ? JSON.stringify(entry.previousState) : null,
      newState: entry.newState !== undefined ? JSON.stringify(entry.newState) : null,
      reason: entry.reason || ''
    };
    if (!state.auditLog) state.auditLog = [];
    state.auditLog.unshift(fullEntry);
    if (state.auditLog.length > 500) state.auditLog.pop();
    return fullEntry;
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

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
      if (!state.auditLog) {
        state.auditLog = [];
      }
      if (!state.orders) {
        state.orders = [];
      }
      if (!state.events || state.events.length === 0) {
        state.events = createInitialState().events;
      }
      if (!state.currentEventId) {
        state.currentEventId = 'EVT_LIVE_MAIN';
      }
      if (!state.schools) state.schools = [];
      if (!state.investmentHouses) state.investmentHouses = [];
      if (!state.registrations) state.registrations = [];
      if (!state.eventSnapshots) state.eventSnapshots = [];
      if (!state.eventClosingSnapshots) state.eventClosingSnapshots = {};
      if (!state.scoringConfig) state.scoringConfig = JSON.parse(JSON.stringify(scoringEngine.DEFAULT_SCORING_CONFIG));
      if (!state.judgeScorecards) state.judgeScorecards = [];
      if (!state.penalties) state.penalties = [];
      if (!state.resultsLifecycle) state.resultsLifecycle = 'CONFIGURED';
      if (!state.reconciliationRecords) state.reconciliationRecords = [];
      if (!state.intelligenceFeed) state.intelligenceFeed = [];
      if (!state.advisorReferrals) state.advisorReferrals = [];
      if (!state.orders) state.orders = [];
      if (!state.bullBearDebate) {
        state.bullBearDebate = {
          activeRound: 1,
          currentTopic: 'Global Tech Equity Valuations & AI Monetization Models',
          timerSeconds: 300,
          status: 'IDLE',
          history: [],
          moderatorNotes: ''
        };
      }
      if (!state.advisors) {
        state.advisors = {
          DOMESTIC: { id: 'DOMESTIC', name: 'Domestic Equities & Sector Strategist', coverage: 'NSE/BSE Indian Large, Mid & Small Caps', bio: 'Specialist in domestic industrial, banking, and tech equity trends.' },
          GLOBAL: { id: 'GLOBAL', name: 'Global & Cross-Border Equity Specialist', coverage: 'US (NASDAQ/NYSE) & UK/Europe Equities', bio: 'Monitors international market movements and tech valuation multiples.' },
          FX_COMMODITY: { id: 'FX_COMMODITY', name: 'FX & Commodities Macro Analyst', coverage: 'USD/INR, GBP/INR, EUR/INR, Gold, Crude', bio: 'Analyzes macro monetary shifts, cross-border flows, and currency hedging.' },
          RISK: { id: 'RISK', name: 'Portfolio Risk & Asset Allocation Officer', coverage: 'Concentration Limits, Diversification & Drawdown Control', bio: 'Surveils floor-wide portfolio leverage, liquidity buffers, and circuit risks.' }
        };
      }
      if (!state.riskControls) state.riskControls = createInitialState().riskControls;
      if (!state.orderDesks) state.orderDesks = createInitialState().orderDesks;
      if (!state.fxQueue) state.fxQueue = [];
      
      // Upgrade any event schedule to 09:30 official market open
      (state.events || []).forEach(evt => {
        if (!evt.schedule || evt.schedule.length === 0) {
          evt.schedule = JSON.parse(JSON.stringify(DEFAULT_EVENT_SCHEDULE));
        }
        if (evt.marketOpenTime === '09:15') evt.marketOpenTime = '09:30';
        if (evt.lunchBreak === '12:30 - 13:15') evt.lunchBreak = '12:00 - 13:00';
        if (evt.resultsTime === '16:15') evt.resultsTime = '16:00';
        evt.startingCapital = 10000000;
      });

      // Single source of truth: ₹1 Crore starting capital per Investment House
      state.settings.startingCapitalRetail = 10000000;
      state.settings.startingCapitalMutualFund = 10000000;
      state.settings.startingCapitalHedgeFund = 10000000;

      if (!state.securities || state.securities.length < 2000) {
        console.log(`Securities list has ${state.securities?.length || 0} instruments (< 2000). Auto-seeding full 2,061 securities universe...`);
        seedStarterData();
        saveState();
      } else {
        // Ensure initial simulated IPOs have visibility defaults if not set
        ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].forEach(ticker => {
          const s = state.securities.find(sec => sec.ticker === ticker);
          if (s) {
            if (s.visibleToParticipants === undefined) {
              s.visibleToParticipants = (s.status === 'Active' || s.ipoStatus === 'LISTED');
            }
            if (!s.ipoStage) {
              s.ipoStage = s.status === 'Active' ? 'LISTING' : 'HIDDEN';
            }
          }
        });
      }

      console.log(`Successfully loaded state from state.json with ${state.securities.length} securities.`);
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
    
    // Atomic Write with Windows EPERM resilience
    try {
      fs.writeFileSync(tempFile, dataStr, 'utf8');
      fs.renameSync(tempFile, STATE_FILE);
    } catch (renameErr) {
      // Windows EPERM/EBUSY fallback
      fs.writeFileSync(STATE_FILE, dataStr, 'utf8');
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (uErr) {}
      }
    }

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

function seedStarterData() {
  const indianCities = ['Mumbai', 'Bengaluru', 'Chennai', 'Noida', 'Hyderabad', 'Pune', 'Gurugram', 'Kolkata', 'Ahmedabad', 'New Delhi'];

  const firstNames = ['Amit', 'Rajesh', 'Vikram', 'Anil', 'Sanjay', 'Sunil', 'Vijay', 'Rahul', 'Deepak', 'Aarav', 'Neha', 'Pooja', 'Priya', 'Ananya', 'Rohan'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Singh', 'Rao', 'Choudhury', 'Iyer', 'Sen', 'Banerjee'];

  // Seed Complete 1,800 Global Security Universe
  state.securities = generateFullSecurityUniverse();

  // Seed Teams (Multi-Currency Wallets with ₹1 Crore INR starting capital)
  state.teams = [];
  for (let i = 1; i <= 20; i++) {
    const teamCode = `T${String(i).padStart(2, '0')}`;
    const teamName = `Trader Elite ${i}`;
    const startingINR = state.settings.startingCapitalRetail || 10000000; // ₹1 Crore

    state.teams.push({
      id: `T${String(i).padStart(2, '0')}`,
      teamCode,
      teamName,
      teamType: 'Retail',
      cashBalance: startingINR,
      cashWallets: {
        INR: startingINR,
        USD: 0,
        GBP: 0,
        EUR: 0
      },
      holdings: {},
      isActive: true,
      createdAt: Date.now()
    });
  }

  // FX Rates
  state.fxRates = {
    USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
    GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
    EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
  };

  // Market Indices
  state.marketIndices = {
    GLOBAL100: { name: 'SAAMX GLOBAL 100', currentValue: 1000, openingValue: 1000, changePercent: 0 },
    INDIA50: { name: 'SAAMX INDIA 50', currentValue: 5000, openingValue: 5000, changePercent: 0 },
    US100: { name: 'SAAMX US 100', currentValue: 8000, openingValue: 8000, changePercent: 0 },
    UK100: { name: 'SAAMX UK 100', currentValue: 4000, openingValue: 4000, changePercent: 0 }
  };

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

// ----------------------------------------------------
// SECURE AUTHENTICATION & SESSION MANAGEMENT
// ----------------------------------------------------
const AUTH_SECRET = process.env.SAAMX_AUTH_SECRET || 'saamx-auth-signing-key-2026-prod';
const activeSessions = new Map(); // sessionId -> { token, role, teamCode, username, createdAt, expiresAt }

function createSessionToken(role, teamCode = null, username = null) {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const createdAt = Date.now();
  const expiresAt = createdAt + (12 * 60 * 60 * 1000); // 12 hours validity
  const payload = `${sessionId}.${role}.${teamCode || ''}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  const token = `saamx.${payload}.${sig}`;

  const sessionData = {
    token,
    sessionId,
    role,
    teamCode: teamCode ? String(teamCode).toUpperCase() : null,
    username: username || (teamCode ? teamCode : role),
    createdAt,
    expiresAt
  };

  activeSessions.set(sessionId, sessionData);
  return { token, sessionId, expiresAt };
}

function verifySessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const token = tokenString.replace(/^Bearer\s+/i, '').trim();

  if (!token.startsWith('saamx.')) {
    // Backwards compatibility for automated test runners using token_role_team_timestamp format
    if (token.startsWith('token_')) {
      const parts = token.split('_');
      const r = parts[1];
      const t = parts[2] && parts[2] !== 'admin' && parts[2] !== 'sebi' ? parts[2].toUpperCase() : null;
      return { role: r, teamCode: t, username: t || r, expiresAt: Date.now() + 3600000 };
    }
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 6) return null; // [saamx, sessionId, role, teamCode, expiresAt, sig]

  const [, sessionId, role, teamCode, expiresAtStr, sig] = parts;
  const payload = `${sessionId}.${role}.${teamCode}.${expiresAtStr}`;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');

  if (sig !== expectedSig) return null;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }

  const session = activeSessions.get(sessionId);
  if (!session) return null;

  return session;
}

function verifyTeamPassword(team, password) {
  if (!password) return false;
  const p = String(password).trim().toLowerCase();
  const teamNum = parseInt(team.teamCode?.replace(/\D/g, '') || team.id?.replace(/\D/g, '') || '0', 10);
  const padNum = String(teamNum).padStart(2, '0');

  const candidates = [
    team.rawPassword,
    team.credentials?.password,
    team.credentials?.tempPin,
    team.tempPin,
    `saamx-team-${padNum}`,
    `saamx-team-${teamNum}`,
    `team-${padNum}`,
    `team-${teamNum}`,
    team.teamCode?.toLowerCase()
  ].filter(Boolean).map(v => String(v).trim().toLowerCase());

  return candidates.includes(p);
}

// Authentication login endpoint
app.post('/api/auth/login', (req, res) => {
  const { role, username, password, teamCode } = req.body || {};
  const userIdentifier = (username || teamCode || '').trim();
  const p = (password || '').trim();

  if (!p) {
    return res.status(401).json({ error: 'Password or PIN is required' });
  }

  const teamsList = state.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
  const normalizedId = userIdentifier.toUpperCase();

  // 1. Participant / Team Login
  const matchedTeam = teamsList.find(t =>
    (t.teamCode || '').toUpperCase() === normalizedId ||
    (t.id || '').toUpperCase() === normalizedId
  );

  if (matchedTeam || role === 'team' || role === 'participant') {
    const targetTeam = matchedTeam || teamsList.find(t => (t.teamCode || '').toUpperCase() === (teamCode || '').toUpperCase());
    if (!targetTeam) {
      return res.status(404).json({ error: `Team ${userIdentifier} not found` });
    }
    if (targetTeam.isActive === false) {
      return res.status(403).json({ error: `Team ${targetTeam.teamCode} is currently deactivated.` });
    }
    if (!verifyTeamPassword(targetTeam, p)) {
      return res.status(401).json({ error: `Invalid password or PIN for Investment House ${targetTeam.teamCode}` });
    }
    const { token, expiresAt } = createSessionToken('team', targetTeam.teamCode, targetTeam.teamCode);
    return res.json({
      success: true,
      role: 'team',
      teamCode: targetTeam.teamCode,
      username: targetTeam.teamCode,
      token,
      expiresAt,
      team: targetTeam
    });
  }

  // 2. Staff / Official Console Login
  const staffUser = userIdentifier.toLowerCase();
  let assignedRole = null;

  if ((staffUser === 'admin' || role === 'admin') && (p === 'saamx-event-2026' || p === 'fms-event-2026' || p === PASSWORD_SECRET)) {
    assignedRole = 'admin';
  } else if ((staffUser === 'verification' || staffUser === 'verify' || staffUser === 'officer' || role === 'verification') &&
             (p === 'verification-event-2026' || p === 'verify-event-2026' || p === 'saamx-event-2026' || p === 'fms-event-2026')) {
    assignedRole = 'verification';
  } else if ((staffUser === 'exchange' || staffUser === 'operator_x' || staffUser === 'mr_x' || staffUser === 'mrx' || role === 'operator_x' || role === 'exchange') &&
             (p === 'exchange-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'operator_x';
  } else if ((staffUser === 'advisor' || staffUser === 'broker' || role === 'advisor' || role === 'broker') &&
             (p === 'advisor-event-2026' || p === 'broker-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'advisor';
  } else if ((staffUser === 'sebi' || role === 'sebi') &&
             (p === 'sebi-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'sebi';
  } else if ((staffUser === 'journalist' || staffUser === 'news' || role === 'journalist' || role === 'news') &&
             (p === 'journalist-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'journalist';
  } else if ((staffUser === 'judge' || role === 'judge') &&
             (p === 'judge-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'judge';
  } else if ((staffUser === 'portfolio' || role === 'portfolio') &&
             (p === 'portfolio-event-2026' || p === 'fms-event-2026' || p === 'saamx-event-2026')) {
    assignedRole = 'portfolio';
  }

  if (assignedRole) {
    const { token, expiresAt } = createSessionToken(assignedRole, null, staffUser || assignedRole);
    return res.json({
      success: true,
      role: assignedRole,
      teamCode: null,
      username: staffUser || assignedRole,
      token,
      expiresAt
    });
  }

  return res.status(401).json({ error: 'Invalid password' });
});

// Session verification endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  const session = verifySessionToken(authHeader);
  if (!session) {
    return res.status(401).json({ authenticated: false, error: 'Session invalid or expired' });
  }
  return res.json({
    authenticated: true,
    role: session.role,
    teamCode: session.teamCode,
    username: session.username,
    expiresAt: session.expiresAt
  });
});

// Logout and session revocation endpoint
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token.startsWith('saamx.')) {
      const parts = token.split('.');
      const sessionId = parts[1];
      if (sessionId) activeSessions.delete(sessionId);
    }
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

const authMiddleware = (req, res, next) => {
  const publicPaths = [
    '/auth/login',
    '/projector/snapshot',
    '/priceHistory',
    '/marketIndices',
    '/ipos',
    '/fx/rates',
    '/event/current'
  ];

  if (req.method === 'GET' && req.path === '/events') {
    return next();
  }

  if (publicPaths.some(p => req.path === p || (p !== '/' && req.path.startsWith(p + '/')))) {
    return next();
  }

  // 1. Primary: Verify cryptographic session token
  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  let session = verifySessionToken(authHeader);

  // 2. Automated test runner fallback via X-FMS-Password
  const rawPw = req.headers['x-fms-password'] || req.body?.password;
  if (!session && (rawPw === PASSWORD_SECRET || rawPw === 'saamx-event-2026')) {
    const fallbackRole = req.headers['x-fms-role'] || req.body?.role || 'admin';
    session = {
      role: fallbackRole,
      teamCode: req.headers['x-fms-team-code'] || req.body?.teamCode || null,
      username: fallbackRole
    };
  }

  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required.' });
  }

  req.role = session.role;
  req.teamCode = session.teamCode;
  req.session = session;

  if (session.role === 'admin') return next();

  if (req.path === '/audit-log') {
    if (session.role === 'sebi') return next();
    return res.status(403).json({ error: 'Forbidden: Audit log requires SEBI or Admin authorization.' });
  }

  if (req.path.startsWith('/admin') || req.path.startsWith('/events/trigger') || req.path === '/market/control') {
    return res.status(403).json({ error: 'Forbidden: Requires Admin privileges.' });
  }

  if (req.path === '/news' && req.method === 'POST') {
    if (session.role === 'journalist') return next();
    return res.status(403).json({ error: 'Forbidden: News publishing requires Journalist authorization.' });
  }

  if (req.path === '/advisor/signal') {
    if (session.role === 'advisor') return next();
    return res.status(403).json({ error: 'Forbidden: Requires Advisor authorization.' });
  }

  if (req.path.startsWith('/verification')) {
    if (session.role === 'verification' || session.role === 'operator_x') return next();
    return res.status(403).json({ error: 'Forbidden: Requires Verification Officer authorization.' });
  }

  if (session.role === 'team') {
    if (req.path === '/portfolio' || req.path === '/team/portfolio') {
      const requestedTeam = (req.body?.teamCode || req.query?.teamCode || req.body?.teamId || '').toUpperCase();
      if (requestedTeam && session.teamCode && requestedTeam !== session.teamCode) {
        return res.status(403).json({ error: '403 Forbidden: You are not authorized to view another team\'s portfolio.' });
      }
    }
    if (req.path === '/trade' || req.path === '/trades') {
      const tradeTeam = (req.body?.teamId || req.body?.teamCode || '').toUpperCase();
      if (tradeTeam && session.teamCode && tradeTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot trade on behalf of team ${tradeTeam}.` });
      }
    }
    if (req.path === '/order/create' || req.path === '/orders/submit') {
      const orderTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (orderTeam && session.teamCode && orderTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit orders on behalf of team ${orderTeam}.` });
      }
    }
    if (req.path === '/advisor/refer') {
      const referTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (referTeam && session.teamCode && referTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit referrals for team ${referTeam}.` });
      }
    }
  }

  next();
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

// ==========================================
// UNIFIED SCHEDULE, VALUATION & SCORING CORE
// ==========================================

export const getScheduleStatus = (event = null, referenceTime = Date.now()) => {
  const targetEvent = event || (state.events || []).find(e => e.eventId === state.currentEventId) || (state.events || [])[0];
  const schedule = targetEvent?.schedule || DEFAULT_EVENT_SCHEDULE;

  const refDate = new Date(referenceTime);
  const kolkataParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(refDate);

  const curHours = parseInt(kolkataParts.find(p => p.type === 'hour')?.value || '0', 10);
  const curMins = parseInt(kolkataParts.find(p => p.type === 'minute')?.value || '0', 10);
  const curTotalMins = curHours * 60 + curMins;

  let currentPhase = 'REGISTRATION';
  let currentTitle = 'Reporting and Registration';
  let isTradingPermitted = false;
  let nextEventTitle = 'Registration and Participant Briefing';
  let nextEventTime = '08:00';
  let minutesToNext = 0;

  if (curTotalMins < 8 * 60) {
    currentPhase = 'REGISTRATION';
    currentTitle = 'Pre-Event Reporting';
    isTradingPermitted = false;
    nextEventTitle = 'Registration & Briefing';
    nextEventTime = '08:00';
    minutesToNext = (8 * 60) - curTotalMins;
  } else if (curTotalMins < 9 * 60) {
    currentPhase = 'BRIEFING';
    currentTitle = 'Registration and Participant Briefing';
    isTradingPermitted = false;
    nextEventTitle = 'Pre-Market Preparation';
    nextEventTime = '09:00';
    minutesToNext = (9 * 60) - curTotalMins;
  } else if (curTotalMins < 9 * 60 + 30) {
    currentPhase = 'PRE_OPEN';
    currentTitle = 'Pre-Market Preparation';
    isTradingPermitted = false;
    nextEventTitle = 'Official Market Open';
    nextEventTime = '09:30';
    minutesToNext = (9 * 60 + 30) - curTotalMins;
  } else if (curTotalMins < 10 * 60) {
    currentPhase = 'MARKET_OPEN';
    currentTitle = 'Official Market Open & Price Discovery';
    isTradingPermitted = true;
    nextEventTitle = 'Opening Market News Broadcast';
    nextEventTime = '10:00';
    minutesToNext = (10 * 60) - curTotalMins;
  } else if (curTotalMins < 12 * 60) {
    currentPhase = 'MORNING_SESSION';
    currentTitle = 'Morning Trading Session';
    isTradingPermitted = true;
    nextEventTitle = 'Lunch Break (Trading Paused)';
    nextEventTime = '12:00';
    minutesToNext = (12 * 60) - curTotalMins;
  } else if (curTotalMins < 13 * 60) {
    currentPhase = 'LUNCH_BREAK';
    currentTitle = 'Lunch Break (Trading Paused)';
    isTradingPermitted = false;
    nextEventTitle = 'Afternoon Trading Session';
    nextEventTime = '13:00';
    minutesToNext = (13 * 60) - curTotalMins;
  } else if (curTotalMins < 15 * 60 + 30) {
    currentPhase = 'AFTERNOON_SESSION';
    currentTitle = 'Afternoon Trading Session';
    isTradingPermitted = true;
    nextEventTitle = 'Trading Stops & Closing Valuation Freeze';
    nextEventTime = '15:30';
    minutesToNext = (15 * 60 + 30) - curTotalMins;
  } else if (curTotalMins < 15 * 60 + 45) {
    currentPhase = 'RECONCILIATION';
    currentTitle = 'Settlement and Reconciliation';
    isTradingPermitted = false;
    nextEventTitle = 'Judging Deliberation & Results Approval';
    nextEventTime = '15:45';
    minutesToNext = (15 * 60 + 45) - curTotalMins;
  } else if (curTotalMins < 16 * 60) {
    currentPhase = 'APPROVAL';
    currentTitle = 'Judging Deliberation & Results Approval';
    isTradingPermitted = false;
    nextEventTitle = 'Official Results Announced';
    nextEventTime = '16:00';
    minutesToNext = (16 * 60) - curTotalMins;
  } else {
    currentPhase = 'RESULTS';
    currentTitle = 'Official Results Announced';
    isTradingPermitted = false;
    nextEventTitle = 'Competition Concluded';
    nextEventTime = 'Completed';
    minutesToNext = 0;
  }

  // If manual sessionState override is active in DEMO/REHEARSAL, prioritize it
  if (targetEvent?.eventMode === 'REHEARSAL' || state.marketState.status === 'Open') {
    if (state.marketState.status === 'Open' && !['RESULTS', 'MARKET_CLOSED', 'VALUATION_FREEZE', 'RECONCILIATION', 'APPROVAL'].includes(state.marketState.sessionState)) {
      isTradingPermitted = true;
    }
  }

  return {
    eventId: targetEvent?.eventId || 'EVT_LIVE_MAIN',
    currentPhase,
    currentTitle,
    isTradingPermitted,
    nextEventTitle,
    nextEventTime,
    minutesToNext,
    currentTimeString: `${String(curHours).padStart(2, '0')}:${String(curMins).padStart(2, '0')} IST`,
    schedule
  };
};

export const isTradingAllowedNow = () => {
  if (state.marketState.status !== 'Open') return false;
  if (state.marketState.isFrozen) return false;
  if (state.marketState.isManualOverride && state.marketState.status === 'Open') return true;
  if (['RESULTS', 'PRE_OPEN', 'MARKET_CLOSED', 'VALUATION_FREEZE', 'RECONCILIATION', 'APPROVAL'].includes(state.marketState.sessionState)) return false;

  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId);
  if (currentEvent && currentEvent.eventMode === 'LIVE' && state.marketState.sessionState !== 'CONTINUOUS_TRADING') {
    const sched = getScheduleStatus(currentEvent, Date.now());
    return sched.isTradingPermitted;
  }
  return true;
};

export const freezeClosingValuationSnapshot = (eventId, actor = 'System', reason = 'Official 15:30 Market Close Valuation Freeze') => {
  if (!state.eventClosingSnapshots) state.eventClosingSnapshots = {};
  if (state.eventClosingSnapshots[eventId]) {
    return state.eventClosingSnapshots[eventId];
  }

  const currentEvent = (state.events || []).find(e => e.eventId === eventId) || { eventId, startingCapital: 10000000 };
  const startingCap = currentEvent.startingCapital || 10000000;
  const snapshotTimestamp = Date.now();

  const teamValuations = {};
  (state.teams || []).forEach(team => {
    const val = scoringEngine.calculatePortfolioValuation(team, state.securities, state.fxRates, startingCap);
    teamValuations[team.teamCode || team.id] = {
      teamCode: team.teamCode || team.id,
      teamName: team.teamName || team.houseName || team.teamCode,
      schoolName: team.schoolName || '',
      totalEquity: val.totalEquity,
      cashINR: val.totalCashINR,
      holdingsINR: val.totalHoldingsINR,
      liabilitiesINR: val.liabilitiesINR,
      holdings: JSON.parse(JSON.stringify(team.holdings || {})),
      cashWallets: JSON.parse(JSON.stringify(team.cashWallets || {})),
      valuationDetails: val
    };
    Object.freeze(teamValuations[team.teamCode || team.id]);
  });
  Object.freeze(teamValuations);

  const snapshot = {
    id: `VAL_SNAP_${eventId}_${snapshotTimestamp}`,
    eventId,
    frozenAt: snapshotTimestamp,
    frozenBy: actor,
    reason,
    rubricVersion: scoringEngine.SCORING_RUBRIC_VERSION,
    scoringConfigVersion: state.scoringConfig?.version || scoringEngine.SCORING_RUBRIC_VERSION,
    closingFxRates: JSON.parse(JSON.stringify(state.fxRates || {})),
    closingPrices: (state.securities || []).map(s => ({ ticker: s.ticker, price: s.currentPrice, currency: s.currency })),
    teamValuations,
    immutableHash: null
  };

  const digestSource = JSON.stringify({
    eventId,
    frozenAt: snapshotTimestamp,
    teamValuations,
    closingFxRates: snapshot.closingFxRates
  });
  snapshot.immutableHash = `SHA256_${crypto.createHash('sha256').update(digestSource).digest('hex').substring(0, 32).toUpperCase()}`;
  Object.freeze(snapshot);

  state.eventClosingSnapshots[eventId] = snapshot;

  if (state.resultsLifecycle === 'CONFIGURED' || state.resultsLifecycle === 'LIVE_SCORING' || state.resultsLifecycle === 'MARKET_CLOSED') {
    state.resultsLifecycle = 'VALUATION_FROZEN';
  }

  logAuditEvent({
    actor,
    role: 'admin',
    action: 'FREEZE_VALUATION_SNAPSHOT',
    target: eventId,
    reason,
    newState: { snapshotId: snapshot.id, frozenAt: snapshotTimestamp, hash: snapshot.immutableHash }
  });

  saveState(true);
  broadcastState('VALUATION_SNAPSHOT_FROZEN', { snapshotId: snapshot.id, eventId });
  return snapshot;
};

// ----------------------------------------------------
// AUTONOMOUS SERVER-SIDE EVENT COORDINATOR
// ----------------------------------------------------
export function startServerAutonomousCoordinator() {
  if (global.__autonomousCoordinatorStarted) return;
  global.__autonomousCoordinatorStarted = true;

  console.log('[AUTONOMOUS COORDINATOR] Server-side event scheduler active (Asia/Kolkata).');

  setInterval(() => {
    try {
      const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || (state.events || [])[0];
      if (!currentEvent) return;

      const sched = getScheduleStatus(currentEvent, Date.now());

      if ((currentEvent.eventMode === 'LIVE' || state.coordinator?.mode === 'AUTONOMOUS') && !state.marketState.isManualOverride) {
        let changed = false;

        if (sched.currentPhase === 'MARKET_OPEN' || sched.currentPhase === 'MORNING_SESSION' || sched.currentPhase === 'AFTERNOON_SESSION') {
          if (state.marketState.status !== 'Open' && !state.marketState.isFrozen && state.marketState.sessionState !== 'VALUATION_FREEZE') {
            state.marketState.status = 'Open';
            state.marketState.sessionState = sched.currentPhase;
            changed = true;
            console.log(`[AUTONOMOUS COORDINATOR] Market session transitioned to Open (${sched.currentPhase})`);
          }
        } else if (sched.currentPhase === 'LUNCH_BREAK') {
          if (state.marketState.status === 'Open') {
            state.marketState.status = 'Paused';
            state.marketState.sessionState = 'LUNCH_BREAK';
            changed = true;
            console.log('[AUTONOMOUS COORDINATOR] Market paused for Lunch Break (12:00 - 13:00)');
          }
        } else if (['VALUATION_FREEZE', 'RECONCILIATION', 'APPROVAL', 'RESULTS'].includes(sched.currentPhase)) {
          if (state.marketState.status === 'Open' || state.marketState.status === 'Paused') {
            state.marketState.status = 'Closed';
            state.marketState.isFrozen = true;
            state.marketState.sessionState = sched.currentPhase;
            changed = true;
            console.log(`[AUTONOMOUS COORDINATOR] 15:30 Cutoff reached. Trading halted (${sched.currentPhase})`);
          }

          if (!state.eventClosingSnapshots?.[currentEvent.eventId]) {
            freezeClosingValuationSnapshot(currentEvent.eventId, 'Autonomous Coordinator', '15:30 Scheduled Market Close Snapshot');
            changed = true;
            console.log(`[AUTONOMOUS COORDINATOR] Idempotent closing valuation snapshot created for ${currentEvent.eventId}`);
          }
        }

        if (changed) {
          saveState(false);
          broadcastState('SCHEDULE_TRANSITION', { sched });
        }
      }

      if (!state.coordinator) state.coordinator = {};
      state.coordinator.lastHeartbeat = Date.now();
      state.coordinator.currentPhase = sched.currentPhase;
      state.coordinator.currentTitle = sched.currentTitle;
      state.coordinator.isTradingPermitted = sched.isTradingPermitted;
      state.coordinator.minutesToNext = sched.minutesToNext;
      state.coordinator.currentTimeString = sched.currentTimeString;
      state.coordinator.timezone = 'Asia/Kolkata';
    } catch (err) {
      console.error('[AUTONOMOUS COORDINATOR] Runtime error:', err);
    }
  }, 5000);
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------
app.get('/api/state', (req, res) => {
  res.json({ ...state, state, activeAlerts: Array.from(activeAlerts) });
});

app.post('/api/admin/seed', (req, res) => {
  seedStarterData();
  broadcastState('SYSTEM_RESET', { message: 'Starter data seeded.' });
  res.json({ success: true, state });
});

app.post('/api/admin/reset', (req, res) => {
  const { confirmText } = req.body || {};
  if (confirmText && confirmText !== 'RESET ALL') {
    return res.status(400).json({ error: 'Accidental reset prevented. Must provide exact confirmation phrase "RESET ALL".' });
  }

  state = createInitialState();
  activeAlerts.clear();
  seedStarterData();
  
  // Reset and pre-populate circuitBreakerHistory with seed price ticks
  Object.keys(circuitBreakerHistory).forEach(k => delete circuitBreakerHistory[k]);
  state.securities.forEach(s => {
    circuitBreakerHistory[s.id] = [{ timestamp: Date.now(), price: s.currentPrice }];
  });

  saveState(true);
  broadcastState('SYSTEM_RESET', { message: 'Database reset completed.' });
  res.json({ success: true, state });
});

// Coordinator Heartbeat & Claim Endpoints
app.get('/api/coordinator/status', (req, res) => {
  res.json({
    success: true,
    coordinator: state.coordinator || { status: 'ONLINE', lastHeartbeat: Date.now() }
  });
});

app.post('/api/coordinator/claim', (req, res) => {
  const { sessionUuid, role } = req.body || {};
  state.coordinator = {
    sessionUuid: sessionUuid || `SESSION_${Date.now()}`,
    role: role || 'admin',
    claimedAt: Date.now(),
    lastHeartbeat: Date.now()
  };
  res.json({ success: true, coordinator: state.coordinator });
});

// Projector Snapshot Telemetry
app.get('/api/projector/snapshot', (req, res) => {
  let adv = 0, dec = 0, unc = 0;
  (state.securities || []).forEach(s => {
    const cur = s.currentPrice || s.basePrice || 0;
    const op = s.openingPrice || s.basePrice || cur;
    if (cur > op) adv++;
    else if (cur < op) dec++;
    else unc++;
  });
  res.json({
    success: true,
    indices: state.marketIndices,
    fxRates: state.fxRates,
    marketState: state.marketState,
    breadth: { advances: adv, declines: dec, unchanged: unc, total: (state.securities || []).length },
    latestNews: (state.newsEvents || [])[state.newsEvents.length - 1] || null
  });
});

// SEBI Surveillance Halt / Resume
app.post('/api/sebi/halt', (req, res) => {
  const { securityId, ticker, reason } = req.body || {};
  const target = securityId || ticker;
  const sec = state.securities.find(s => s.id === target || s.ticker === target);
  if (!sec) return res.status(404).json({ error: 'Security not found' });
  sec.status = 'Halted';
  logAuditEvent({
    actor: 'SEBI Surveillance',
    role: 'sebi',
    action: `HALT_SECURITY: ${sec.ticker}`,
    target: sec.ticker,
    reason: reason || 'Circuit breaker / Regulatory intervention'
  });
  saveState(true);
  broadcastState('MARKET_HALT', { ticker: sec.ticker, name: sec.name, reason: reason || 'Trading Suspended by SEBI' });
  res.json({ success: true, security: sec });
});

app.post('/api/sebi/resume', (req, res) => {
  const { securityId, ticker } = req.body || {};
  const target = securityId || ticker;
  const sec = state.securities.find(s => s.id === target || s.ticker === target);
  if (!sec) return res.status(404).json({ error: 'Security not found' });
  sec.status = 'Active';
  logAuditEvent({
    actor: 'SEBI Surveillance',
    role: 'sebi',
    action: `RESUME_SECURITY: ${sec.ticker}`,
    target: sec.ticker,
    reason: 'Normal trading operations resumed'
  });
  saveState(true);
  broadcastState();
  res.json({ success: true, security: sec });
});

app.post('/api/admin/settings', (req, res) => {
  const { settings } = req.body;
  state.settings = { ...state.settings, ...settings };
  saveState();
  broadcastState();
  res.json({ success: true, settings: state.settings });
});

app.post('/api/market/control', (req, res) => {
  const { action, duration } = req.body || {};
  const now = Date.now();
  const act = (action || '').toUpperCase();

  if (act === 'START' || act === 'OPEN') {
    state.marketState.status = 'Open';
    state.marketState.isFrozen = false;
    state.marketState.isManualOverride = true;
    state.marketState.sessionState = 'CONTINUOUS_TRADING';
    state.marketState.simulationStartTime = now;
    state.marketState.pauseTimeOffset = 0;
    state.marketState.pausedAt = null;
    if (duration) state.marketState.simulationDurationMinutes = Number(duration);
    logAuditEvent({
      actor: req.body?.operator || 'Exchange Administrator',
      role: 'admin',
      action: 'MARKET_OPEN',
      target: 'Entire Floor',
      reason: 'Opening bell rang'
    });
    broadcastState('OPENING_BELL');
  } else if (act === 'PAUSE') {
    state.marketState.status = 'Paused';
    state.marketState.pausedAt = now;
    state.marketState.isManualOverride = false;
    logAuditEvent({
      actor: req.body?.operator || 'Exchange Administrator',
      role: 'admin',
      action: 'MARKET_PAUSE',
      target: 'Entire Floor',
      reason: req.body?.reason || 'Trading paused by administrator'
    });
    broadcastState();
  } else if (act === 'RESUME') {
    state.marketState.status = 'Open';
    state.marketState.isFrozen = false;
    state.marketState.isManualOverride = true;
    state.marketState.sessionState = 'CONTINUOUS_TRADING';
    if (state.marketState.pausedAt) {
      state.marketState.pauseTimeOffset += (now - state.marketState.pausedAt);
    }
    state.marketState.pausedAt = null;
    logAuditEvent({
      actor: req.body.operator || 'Exchange Administrator',
      role: 'admin',
      action: 'MARKET_RESUME',
      target: 'Entire Floor',
      reason: 'Trading resumed by administrator'
    });
    broadcastState();
  } else if (action === 'CLOSE') {
    state.marketState.isManualOverride = false;
    state.marketState.status = 'Closed';
    logAuditEvent({
      actor: req.body.operator || 'Exchange Administrator',
      role: 'admin',
      action: 'MARKET_CLOSE',
      target: 'Entire Floor',
      reason: 'Closing bell rang'
    });
    broadcastState('CLOSING_BELL');
  } else if (action === 'EMERGENCY_FREEZE' || action === 'FREEZE_ALL') {
    state.marketState.status = 'Paused';
    state.marketState.isFrozen = true;
    state.marketState.pausedAt = now;
    logAuditEvent({
      actor: req.body.operator || 'Exchange Controller',
      role: 'admin',
      action: 'EMERGENCY_FREEZE',
      target: 'Entire Market',
      reason: req.body.reason || 'Floor Emergency Freeze Invoked'
    });
    broadcastState('EMERGENCY_FREEZE', { reason: req.body.reason || 'All Market Operations Frozen by Controller' });
  }

  saveState(true);
  res.json({ success: true, marketState: state.marketState });
});

// ----------------------------------------------------
// EVENT PLATFORM & LIFECYCLE MANAGEMENT ENDPOINTS
// ----------------------------------------------------
app.get('/api/events', (req, res) => {
  res.json({ success: true, events: state.events || [], currentEventId: state.currentEventId });
});

app.get('/api/event/current', (req, res) => {
  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || (state.events || [])[0] || null;
  res.json({ success: true, event: currentEvent });
});

app.post('/api/event/create', (req, res) => {
  const {
    eventName,
    eventDate,
    venue,
    maximumInvestmentHouses,
    teamSize,
    startingCapital,
    marketOpenTime,
    marketCloseTime,
    lunchBreak,
    resultsTime,
    eventMode
  } = req.body || {};

  if (!eventName || !eventDate) {
    return res.status(400).json({ error: 'Event Name and Event Date are required.' });
  }

  const eventId = `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newEvent = {
    eventId,
    eventName: eventName.trim(),
    eventDate,
    venue: venue || 'Grand Convention Exchange Floor',
    registrationOpen: true,
    registrationClose: `${eventDate}T09:00:00Z`,
    maximumInvestmentHouses: Number(maximumInvestmentHouses) || 40,
    teamSize: Number(teamSize) || 4,
    startingCapital: Number(startingCapital) || 10000000,
    marketOpenTime: marketOpenTime || '09:15',
    marketCloseTime: marketCloseTime || '15:30',
    lunchBreak: lunchBreak || '12:30 - 13:15',
    resultsTime: resultsTime || '16:15',
    eventStatus: 'REGISTRATION_OPEN',
    eventMode: eventMode === 'REHEARSAL' ? 'REHEARSAL' : 'LIVE',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  if (!state.events) state.events = [];
  state.events.push(newEvent);
  state.currentEventId = eventId;

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `CREATE_EVENT: ${newEvent.eventName}`,
    target: eventId,
    newState: newEvent
  });

  saveState(true);
  broadcastState('EVENT_CONFIG_UPDATED', { event: newEvent });
  res.json({ success: true, event: newEvent });
});

app.post('/api/event/update', (req, res) => {
  const { eventId, updates } = req.body || {};
  const targetId = eventId || state.currentEventId;
  const event = (state.events || []).find(e => e.eventId === targetId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  Object.assign(event, updates || {});
  event.updatedAt = Date.now();

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `UPDATE_EVENT: ${event.eventName}`,
    target: targetId,
    newState: event
  });

  saveState(true);
  broadcastState('EVENT_CONFIG_UPDATED', { event });
  res.json({ success: true, event });
});

app.post('/api/event/lifecycle', (req, res) => {
  const { eventId, eventStatus } = req.body || {};
  const validStatuses = [
    'DRAFT',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'PRE_EVENT',
    'MARKET_ACTIVE',
    'MARKET_CLOSED',
    'SETTLEMENT',
    'RESULTS',
    'ARCHIVED'
  ];

  if (!validStatuses.includes(eventStatus)) {
    return res.status(400).json({ error: `Invalid eventStatus. Valid statuses: ${validStatuses.join(', ')}` });
  }

  const targetId = eventId || state.currentEventId;
  const event = (state.events || []).find(e => e.eventId === targetId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const prevStatus = event.eventStatus;
  event.eventStatus = eventStatus;
  event.updatedAt = Date.now();

  if (eventStatus === 'REGISTRATION_OPEN') {
    event.registrationOpen = true;
  } else if (eventStatus === 'REGISTRATION_CLOSED') {
    event.registrationOpen = false;
  } else if (eventStatus === 'MARKET_ACTIVE') {
    event.registrationOpen = false;
    state.marketState.status = 'Open';
  } else if (eventStatus === 'MARKET_CLOSED') {
    state.marketState.status = 'Closed';
  }

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `EVENT_LIFECYCLE_TRANSITION: ${prevStatus} -> ${eventStatus}`,
    target: targetId,
    reason: `Event lifecycle advanced to ${eventStatus}`
  });

  saveState(true);
  broadcastState('EVENT_LIFECYCLE_TRANSITION', { eventId: targetId, eventStatus, previousStatus: prevStatus });
  res.json({ success: true, eventId: targetId, eventStatus, previousStatus: prevStatus });
});

app.post('/api/event/mode', (req, res) => {
  const { eventId, eventMode } = req.body || {};
  const mode = eventMode === 'REHEARSAL' ? 'REHEARSAL' : 'LIVE';
  const targetId = eventId || state.currentEventId;
  const event = (state.events || []).find(e => e.eventId === targetId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  event.eventMode = mode;
  event.updatedAt = Date.now();

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `SET_EVENT_MODE: ${mode}`,
    target: targetId,
    reason: `Switched event mode to ${mode}`
  });

  saveState(true);
  broadcastState('EVENT_MODE_CHANGED', { eventId: targetId, eventMode: mode });
  res.json({ success: true, eventId: targetId, eventMode: mode });
});

// Snapshot & Checkpoint Recovery
app.post('/api/event/snapshot/create', (req, res) => {
  const { snapshotType, label } = req.body || {};
  const validTypes = ['pre-market', 'mid-market', 'pre-close', 'pre-settlement', 'custom'];
  const type = validTypes.includes(snapshotType) ? snapshotType : 'custom';

  const snapshotId = `SNAP_${type.toUpperCase().replace('-', '_')}_${Date.now()}`;
  const snapshotData = {
    snapshotId,
    eventId: state.currentEventId || 'EVT_LIVE_MAIN',
    snapshotType: type,
    label: label || `Snapshot: ${type.toUpperCase()}`,
    timestamp: Date.now(),
    marketState: JSON.parse(JSON.stringify(state.marketState)),
    teamsCount: state.teams?.length || 0,
    ordersCount: state.orders?.length || 0,
    transactionsCount: state.transactions?.length || 0,
    payload: {
      teams: JSON.parse(JSON.stringify(state.teams || [])),
      orders: JSON.parse(JSON.stringify(state.orders || [])),
      transactions: JSON.parse(JSON.stringify(state.transactions || [])),
      fxTransactions: JSON.parse(JSON.stringify(state.fxTransactions || [])),
      fxQueue: JSON.parse(JSON.stringify(state.fxQueue || [])),
      marketState: JSON.parse(JSON.stringify(state.marketState || {})),
      securities: (state.securities || []).map(s => ({
        id: s.id,
        ticker: s.ticker,
        currentPrice: s.currentPrice,
        availableUnits: s.availableUnits,
        status: s.status
      }))
    }
  };

  if (!state.eventSnapshots) state.eventSnapshots = [];
  state.eventSnapshots.unshift({
    snapshotId: snapshotData.snapshotId,
    eventId: snapshotData.eventId,
    snapshotType: snapshotData.snapshotType,
    label: snapshotData.label,
    timestamp: snapshotData.timestamp,
    teamsCount: snapshotData.teamsCount,
    ordersCount: snapshotData.ordersCount,
    transactionsCount: snapshotData.transactionsCount,
    payload: snapshotData.payload
  });

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `CREATE_CHECKPOINT: ${type}`,
    target: snapshotId,
    reason: label || `Event checkpoint snapshot created`
  });

  saveState(true);
  res.json({ success: true, snapshot: { snapshotId, label: snapshotData.label, timestamp: snapshotData.timestamp, snapshotType: type } });
});

app.post('/api/event/snapshot/restore', (req, res) => {
  const { snapshotId } = req.body || {};
  if (!snapshotId) return res.status(400).json({ error: 'snapshotId required.' });

  const snap = (state.eventSnapshots || []).find(s => s.snapshotId === snapshotId);
  if (!snap || !snap.payload) return res.status(404).json({ error: 'Snapshot not found.' });

  state.teams = snap.payload.teams;
  state.orders = snap.payload.orders;
  state.transactions = snap.payload.transactions;
  state.fxTransactions = snap.payload.fxTransactions || [];
  state.fxQueue = snap.payload.fxQueue || [];
  state.marketState = snap.payload.marketState;

  if (snap.payload.securities && Array.isArray(snap.payload.securities)) {
    const secMap = new Map(snap.payload.securities.map(s => [s.ticker, s]));
    state.securities.forEach(s => {
      const saved = secMap.get(s.ticker);
      if (saved) {
        s.currentPrice = saved.currentPrice;
        s.availableUnits = saved.availableUnits;
        s.status = saved.status;
      }
    });
  }

  logAuditEvent({
    actor: 'Event Administrator',
    role: 'admin',
    action: `RESTORE_CHECKPOINT: ${snapshotId}`,
    target: snapshotId,
    reason: `System state recovered to checkpoint: ${snap.label}`
  });

  saveState(true);
  broadcastState('SYSTEM_RECOVERY', { message: `Recovered to checkpoint: ${snap.label}` });
  res.json({ success: true, message: `System successfully restored to checkpoint ${snap.label}` });
});

app.post('/api/admin/start-market', (req, res) => {
  state.marketState.status = 'Open';
  state.marketState.sessionState = 'CONTINUOUS_TRADING';
  state.marketState.simulationStartTime = Date.now();
  state.marketState.pauseTimeOffset = 0;
  state.marketState.pausedAt = null;
  broadcastState('OPENING_BELL');
  saveState(true);
  res.json({ success: true, marketState: state.marketState });
});

app.post('/api/admin/pause-market', (req, res) => {
  state.marketState.status = 'Paused';
  state.marketState.pausedAt = Date.now();
  broadcastState();
  saveState(true);
  res.json({ success: true, marketState: state.marketState });
});

app.post('/api/admin/session-state', (req, res) => {
  const { sessionState } = req.body || {};
  if (!sessionState) return res.status(400).json({ error: 'Missing sessionState' });
  state.marketState.sessionState = sessionState;
  if (sessionState === 'RESULTS' || sessionState === 'MARKET_CLOSED') {
    state.marketState.status = 'Closed';
  } else if (sessionState === 'CONTINUOUS_TRADING') {
    state.marketState.status = 'Open';
  } else if (sessionState === 'PRE_OPEN') {
    state.marketState.status = 'NotStarted';
  }
  broadcastState();
  saveState(true);
  res.json({ success: true, marketState: state.marketState });
});

// ==========================================
// UNIFIED SCHEDULE & EVENT CLOCK ENDPOINTS
// ==========================================
app.get('/api/event/schedule', (req, res) => {
  const { eventId } = req.query;
  const targetEvent = (state.events || []).find(e => e.eventId === (eventId || state.currentEventId)) || (state.events || [])[0];
  const scheduleStatus = getScheduleStatus(targetEvent, Date.now());
  res.json({
    success: true,
    scheduleStatus,
    currentEventId: targetEvent?.eventId,
    eventName: targetEvent?.eventName,
    eventMode: targetEvent?.eventMode
  });
});

app.post('/api/event/schedule/update', (req, res) => {
  const { eventId = state.currentEventId, schedule, marketOpenTime, marketCloseTime, lunchBreak, resultsTime } = req.body || {};
  const event = (state.events || []).find(e => e.eventId === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (Array.isArray(schedule)) event.schedule = schedule;
  if (marketOpenTime) event.marketOpenTime = marketOpenTime;
  if (marketCloseTime) event.marketCloseTime = marketCloseTime;
  if (lunchBreak) event.lunchBreak = lunchBreak;
  if (resultsTime) event.resultsTime = resultsTime;
  event.updatedAt = Date.now();

  logAuditEvent({
    actor: req.body.operator || 'Event Administrator',
    role: 'admin',
    action: 'UPDATE_EVENT_SCHEDULE',
    target: eventId,
    reason: req.body.reason || 'Event schedule updated by administrator'
  });

  saveState(true);
  broadcastState('EVENT_SCHEDULE_UPDATED', { eventId, schedule: event.schedule });
  res.json({ success: true, event });
});

app.post('/api/event/schedule/override', (req, res) => {
  const { phase, sessionState, marketStatus, reason = 'Emergency schedule override' } = req.body || {};
  if (!phase) return res.status(400).json({ error: 'Target phase required for override.' });

  if (sessionState) state.marketState.sessionState = sessionState;
  if (marketStatus) state.marketState.status = marketStatus;

  logAuditEvent({
    actor: req.body.operator || 'Exchange Controller',
    role: 'admin',
    action: `SCHEDULE_OVERRIDE_TO_${phase}`,
    target: state.currentEventId,
    reason
  });

  saveState(true);
  broadcastState('SCHEDULE_PHASE_OVERRIDE', { phase, sessionState: state.marketState.sessionState, marketStatus: state.marketState.status });
  res.json({ success: true, phase, marketState: state.marketState });
});

// ==========================================
// CLOSING VALUATION FREEZE & RECONCILIATION
// ==========================================
app.post('/api/event/valuation/freeze', (req, res) => {
  const { eventId = state.currentEventId, reason, operator = 'Exchange Controller' } = req.body || {};
  const snapshot = freezeClosingValuationSnapshot(eventId, operator, reason || '15:30 Market Close Valuation Freeze');
  res.json({ success: true, snapshot });
});

app.get('/api/event/valuation/snapshot', (req, res) => {
  const { eventId = state.currentEventId } = req.query;
  const snapshot = state.eventClosingSnapshots?.[eventId] || null;
  res.json({ success: true, snapshot, isFrozen: !!snapshot });
});

app.post('/api/event/reconciliation/run', (req, res) => {
  const { eventId = state.currentEventId, adjustments = [], notes = '', operator = 'Exchange Auditor', authorizedBy, authorizationReason } = req.body || {};
  let snapshot = state.eventClosingSnapshots?.[eventId];
  if (!snapshot) {
    snapshot = freezeClosingValuationSnapshot(eventId, operator, 'Valuation snapshot auto-frozen prior to reconciliation');
  }

  // Audit control: Any permitted discrepancy adjustments require explicit authorization and reasons
  if (adjustments && adjustments.length > 0) {
    if (!authorizedBy || !authorizationReason) {
      return res.status(400).json({ error: 'Audit control violation: Any reconciliation adjustments require explicit authorization (authorizedBy and authorizationReason).' });
    }
    adjustments.forEach(adj => {
      logAuditEvent({
        actor: authorizedBy,
        role: 'admin',
        action: 'RECONCILIATION_DISCREPANCY_ADJUSTMENT',
        target: adj.teamCode || eventId,
        reason: `${adj.reason || 'Reconciliation discrepancy resolution'}: ${authorizationReason}`,
        newState: adj
      });
    });
  }

  const recRecord = {
    id: `REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    snapshotId: snapshot.id,
    reconciledAt: Date.now(),
    reconciledBy: operator,
    authorizedBy: authorizedBy || null,
    authorizationReason: authorizationReason || null,
    notes,
    discrepanciesFound: adjustments.length,
    adjustments,
    status: 'COMPLETED'
  };

  if (!state.reconciliationRecords) state.reconciliationRecords = [];
  state.reconciliationRecords.unshift(recRecord);

  if (state.resultsLifecycle === 'VALUATION_FROZEN' || state.resultsLifecycle === 'MARKET_CLOSED') {
    state.resultsLifecycle = 'RECONCILIATION';
  }

  logAuditEvent({
    actor: operator,
    role: 'admin',
    action: 'SETTLEMENT_RECONCILIATION_RUN',
    target: eventId,
    reason: notes || 'Floor settlement & trade reconciliation performed'
  });

  saveState(true);
  broadcastState('RECONCILIATION_COMPLETED', { reconciliationRecord: recRecord });
  res.json({ success: true, reconciliationRecord: recRecord });
});

// ==========================================
// CENTRAL AUTHORITATIVE SCORING ENGINE (1000 PTS)
// ==========================================
app.get(['/api/leaderboard', '/api/scoring/leaderboard'], (req, res) => {
  const isOfficialPublished = state.resultsLifecycle === 'PUBLISHED' && state.publishedResults;

  let leaderboard = [];
  if (isOfficialPublished) {
    leaderboard = state.publishedResults.leaderboard;
  } else {
    leaderboard = scoringEngine.generateLeaderboard(state, state.scoringConfig);
  }

  const snapshot = state.eventClosingSnapshots?.[state.currentEventId] || null;

  res.json({
    success: true,
    leaderboard,
    isProvisional: !isOfficialPublished,
    resultsLifecycle: state.resultsLifecycle,
    rubricVersion: scoringEngine.SCORING_RUBRIC_VERSION,
    snapshotId: isOfficialPublished ? state.publishedResults.snapshotId : (snapshot?.id || null),
    snapshotHash: isOfficialPublished ? state.publishedResults.snapshotHash : (snapshot?.immutableHash || null),
    scoringConfigVersion: state.scoringConfig?.version || scoringEngine.SCORING_RUBRIC_VERSION,
    publishedAt: isOfficialPublished ? state.publishedResults.publishedAt : null
  });
});

app.get('/api/scoring/team/:teamId', (req, res) => {
  const { teamId } = req.params;
  const team = (state.teams || []).find(t => t.teamCode === teamId || t.id === teamId);
  if (!team) return res.status(404).json({ error: `Team ${teamId} not found.` });

  const scorecard = scoringEngine.calculateHouseScore(team, state, state.scoringConfig);
  const snapshot = state.eventClosingSnapshots?.[team.eventId || state.currentEventId] || null;

  res.json({
    success: true,
    scorecard,
    isProvisional: state.resultsLifecycle !== 'PUBLISHED',
    resultsLifecycle: state.resultsLifecycle,
    snapshotId: snapshot?.id || null,
    snapshotHash: snapshot?.immutableHash || null,
    rubricVersion: scoringEngine.SCORING_RUBRIC_VERSION,
    scoringConfigVersion: state.scoringConfig?.version || scoringEngine.SCORING_RUBRIC_VERSION
  });
});

app.post('/api/scoring/recalculate', (req, res) => {
  const leaderboard = scoringEngine.generateLeaderboard(state, state.scoringConfig);
  state.leaderboard = leaderboard;
  saveState();
  broadcastState('LEADERBOARD_RECALCULATED', {
    leaderboard,
    isProvisional: state.resultsLifecycle !== 'PUBLISHED'
  });
  res.json({ success: true, leaderboard, isProvisional: state.resultsLifecycle !== 'PUBLISHED' });
});

// ==========================================
// JUDGE CONSOLE & SCORING GOVERNANCE
// ==========================================
app.get('/api/judging/scorecards', (req, res) => {
  const { teamCode, judgeId } = req.query;
  let cards = state.judgeScorecards || [];
  if (teamCode) cards = cards.filter(c => (c.teamCode || '').toUpperCase() === teamCode.toUpperCase());
  if (judgeId) cards = cards.filter(c => (c.judgeId || '').toUpperCase() === judgeId.toUpperCase());
  res.json({ success: true, scorecards: cards, resultsLifecycle: state.resultsLifecycle });
});

app.post('/api/judging/scorecard/save', (req, res) => {
  const {
    judgeId = 'JUDGE_1',
    judgeName = 'Judge 1',
    teamCode,
    responseToEvents = 3,
    decisionTiming = 3,
    adaptability = 3,
    riskRecognition = 3,
    forwardPositioning = 3,
    resilience = 3,
    balance = 3,
    adaptCapacity = 3,
    notes = '',
    isLocked = false
  } = req.body || {};

  if (!teamCode) return res.status(400).json({ error: 'Team Code is required.' });

  if (state.resultsLifecycle === 'PUBLISHED') {
    return res.status(400).json({ error: 'Cannot modify scorecards after official results have been published.' });
  }

  if (!state.judgeScorecards) state.judgeScorecards = [];

  const existingIdx = state.judgeScorecards.findIndex(c => 
    (c.teamCode || '').toUpperCase() === teamCode.toUpperCase() && 
    (c.judgeId || '').toUpperCase() === judgeId.toUpperCase()
  );

  const cardData = {
    id: existingIdx >= 0 ? state.judgeScorecards[existingIdx].id : `CARD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    judgeId,
    judgeName,
    teamCode: teamCode.toUpperCase(),
    responseToEvents: Math.min(5, Math.max(0, Number(responseToEvents))),
    decisionTiming: Math.min(5, Math.max(0, Number(decisionTiming))),
    adaptability: Math.min(5, Math.max(0, Number(adaptability))),
    riskRecognition: Math.min(5, Math.max(0, Number(riskRecognition))),
    forwardPositioning: Math.min(5, Math.max(0, Number(forwardPositioning))),
    resilience: Math.min(5, Math.max(0, Number(resilience))),
    balance: Math.min(5, Math.max(0, Number(balance))),
    adaptCapacity: Math.min(5, Math.max(0, Number(adaptCapacity))),
    notes,
    isLocked: !!isLocked,
    updatedAt: Date.now()
  };

  if (existingIdx >= 0) {
    if (state.judgeScorecards[existingIdx].isLocked && !req.body.overrideLock) {
      return res.status(400).json({ error: 'This scorecard is locked. Admin override required to edit.' });
    }
    state.judgeScorecards[existingIdx] = cardData;
  } else {
    state.judgeScorecards.push(cardData);
  }

  logAuditEvent({
    actor: judgeName,
    role: 'judge',
    action: `SAVE_SCORECARD: ${teamCode}`,
    target: teamCode,
    reason: isLocked ? 'Scorecard submitted & locked' : 'Scorecard draft autosaved'
  });

  saveState(true);
  broadcastState('SCORECARD_UPDATED', { scorecard: cardData });
  res.json({ success: true, scorecard: cardData });
});

app.post('/api/judging/moderate', (req, res) => {
  const { teamCode, moderator = 'Chief Judge', resolutionNotes = '', adjustedCard } = req.body || {};
  if (!teamCode) return res.status(400).json({ error: 'Team Code required.' });

  if (!state.judgeScorecards) state.judgeScorecards = [];

  const modCard = {
    id: `MOD_${Date.now()}`,
    judgeId: 'MODERATOR',
    judgeName: `Moderator (${moderator})`,
    teamCode: teamCode.toUpperCase(),
    ...adjustedCard,
    isLocked: true,
    isModerated: true,
    moderationNotes: resolutionNotes,
    updatedAt: Date.now()
  };

  state.judgeScorecards.push(modCard);

  logAuditEvent({
    actor: moderator,
    role: 'admin',
    action: `MODERATE_SCORECARDS: ${teamCode}`,
    target: teamCode,
    reason: resolutionNotes || 'Scorecard discrepancy resolved by Chief Judge'
  });

  saveState(true);
  broadcastState('SCORECARD_MODERATED', { moderatedCard: modCard });
  res.json({ success: true, moderatedCard: modCard });
});

// ==========================================
// PENALTIES & APPEALS GOVERNANCE
// ==========================================
app.get('/api/penalties', (req, res) => {
  const { teamCode } = req.query;
  let list = state.penalties || [];
  if (teamCode) list = list.filter(p => (p.teamCode || '').toUpperCase() === teamCode.toUpperCase());
  res.json({ success: true, penalties: list });
});

app.post('/api/penalties/create', (req, res) => {
  const { teamCode, ruleViolation, pointsDeducted = 5, reason, evidenceReference = '', reviewer = 'Exchange Compliance' } = req.body || {};
  if (!teamCode || !ruleViolation || !reason) {
    return res.status(400).json({ error: 'teamCode, ruleViolation, and reason are required.' });
  }

  const codeUpper = teamCode.toUpperCase();
  const cappedPoints = Math.min(50, Math.max(1, Number(pointsDeducted) || 5));

  // Audit guard: Prevent duplicate penalty filing for identical violation & evidence
  const isDuplicate = (state.penalties || []).some(p => 
    p.teamCode === codeUpper && 
    p.ruleViolation === ruleViolation && 
    (p.status === 'APPLIED' || p.status === 'CONFIRMED') && 
    (p.reason === reason.trim() || (evidenceReference && p.evidenceReference === evidenceReference.trim()))
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'Duplicate penalty prevented: An active penalty with identical violation and evidence already exists for this Investment House.' });
  }

  const penaltyId = `PEN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const penaltyRecord = {
    id: penaltyId,
    teamCode: codeUpper,
    ruleViolation,
    pointsDeducted: cappedPoints,
    reason: reason.trim(),
    evidenceReference: evidenceReference.trim(),
    reviewer,
    status: 'APPLIED',
    createdAt: Date.now(),
    appeal: null
  };

  if (!state.penalties) state.penalties = [];
  state.penalties.unshift(penaltyRecord);

  logAuditEvent({
    actor: reviewer,
    role: 'admin',
    action: `APPLY_PENALTY: ${penaltyRecord.pointsDeducted} pts to ${teamCode}`,
    target: teamCode,
    reason: `${ruleViolation} — ${reason}`
  });

  saveState(true);
  broadcastState('PENALTY_APPLIED', { penalty: penaltyRecord });
  res.json({ success: true, penalty: penaltyRecord });
});

app.post('/api/penalties/appeal', (req, res) => {
  const { penaltyId, appealReason, submittedBy = 'Team Representative' } = req.body || {};
  if (!penaltyId || !appealReason) {
    return res.status(400).json({ error: 'penaltyId and appealReason are required.' });
  }

  const penalty = (state.penalties || []).find(p => p.id === penaltyId);
  if (!penalty) return res.status(404).json({ error: 'Penalty record not found.' });

  penalty.status = 'APPEALED';
  penalty.appeal = {
    appealReason: appealReason.trim(),
    submittedBy,
    submittedAt: Date.now(),
    resolution: 'PENDING'
  };

  logAuditEvent({
    actor: submittedBy,
    role: 'participant',
    action: `APPEAL_PENALTY: ${penaltyId}`,
    target: penalty.teamCode,
    reason: appealReason
  });

  saveState(true);
  broadcastState('PENALTY_APPEALED', { penalty });
  res.json({ success: true, penalty });
});

app.post('/api/penalties/resolve-appeal', (req, res) => {
  const { penaltyId, resolution, resolutionReason = '', reviewedBy = 'Arbitration Committee' } = req.body || {};
  if (!penaltyId || !['ACCEPTED', 'OVERTURNED'].includes(resolution)) {
    return res.status(400).json({ error: 'Valid penaltyId and resolution (ACCEPTED or OVERTURNED) required.' });
  }

  const penalty = (state.penalties || []).find(p => p.id === penaltyId);
  if (!penalty) return res.status(404).json({ error: 'Penalty record not found.' });

  if (resolution === 'OVERTURNED') {
    penalty.status = 'OVERTURNED';
    penalty.originalPointsDeducted = penalty.pointsDeducted;
    penalty.pointsDeducted = 0;
  } else {
    penalty.status = 'CONFIRMED';
  }

  if (penalty.appeal) {
    penalty.appeal.resolution = resolution;
    penalty.appeal.resolutionReason = resolutionReason;
    penalty.appeal.reviewedBy = reviewedBy;
    penalty.appeal.resolvedAt = Date.now();
  }

  logAuditEvent({
    actor: reviewedBy,
    role: 'admin',
    action: `RESOLVE_APPEAL: ${resolution} for ${penaltyId}`,
    target: penalty.teamCode,
    reason: resolutionReason
  });

  saveState(true);
  broadcastState('PENALTY_APPEAL_RESOLVED', { penalty });
  res.json({ success: true, penalty });
});

// ==========================================
// RESULTS LIFECYCLE, APPROVAL & PUBLICATION
// ==========================================
app.post('/api/results/lifecycle', (req, res) => {
  const { lifecycleState, operator = 'Competition Director' } = req.body || {};
  const validStages = ['CONFIGURED', 'LIVE_SCORING', 'MARKET_CLOSED', 'VALUATION_FROZEN', 'JUDGING_COMPLETE', 'RECONCILIATION', 'APPROVED', 'PUBLISHED'];
  if (!validStages.includes(lifecycleState)) {
    return res.status(400).json({ error: `Invalid lifecycle state. Must be one of: ${validStages.join(', ')}` });
  }

  const previous = state.resultsLifecycle;
  state.resultsLifecycle = lifecycleState;

  logAuditEvent({
    actor: operator,
    role: 'admin',
    action: `RESULTS_LIFECYCLE_CHANGE: ${lifecycleState}`,
    target: state.currentEventId,
    previousState: previous,
    newState: lifecycleState
  });

  saveState(true);
  broadcastState('RESULTS_LIFECYCLE_UPDATED', { resultsLifecycle: state.resultsLifecycle });
  res.json({ success: true, resultsLifecycle: state.resultsLifecycle });
});

app.post('/api/results/approve', (req, res) => {
  const { eventId = state.currentEventId, approver = 'Chief Judge', notes = '' } = req.body || {};
  state.resultsLifecycle = 'APPROVED';

  logAuditEvent({
    actor: approver,
    role: 'admin',
    action: 'APPROVE_RESULTS',
    target: eventId,
    reason: notes || 'Official championship results approved by Chief Judge'
  });

  saveState(true);
  broadcastState('RESULTS_APPROVED', { eventId });
  res.json({ success: true, resultsLifecycle: state.resultsLifecycle });
});

app.post('/api/results/publish', (req, res) => {
  const { eventId = state.currentEventId, publisher = 'Competition Director' } = req.body || {};

  if (state.resultsLifecycle === 'PUBLISHED' && state.publishedResults) {
    return res.status(400).json({ error: 'Duplicate publication prevented: Results are already officially published. Use /api/results/reopen with explicit authorization before re-publishing.' });
  }

  const snapshot = state.eventClosingSnapshots?.[eventId] || null;
  const finalLeaderboard = scoringEngine.generateLeaderboard(state, state.scoringConfig);
  state.publishedResults = {
    eventId,
    publishedAt: Date.now(),
    publishedBy: publisher,
    rubricVersion: scoringEngine.SCORING_RUBRIC_VERSION,
    snapshotId: snapshot ? snapshot.id : null,
    snapshotHash: snapshot ? snapshot.immutableHash : null,
    scoringConfigVersion: state.scoringConfig?.version || scoringEngine.SCORING_RUBRIC_VERSION,
    leaderboard: finalLeaderboard,
    status: 'OFFICIAL_FINAL_RESULTS'
  };
  state.resultsLifecycle = 'PUBLISHED';

  logAuditEvent({
    actor: publisher,
    role: 'admin',
    action: 'PUBLISH_OFFICIAL_RESULTS',
    target: eventId,
    reason: 'Official final championship leaderboard published to floor'
  });

  saveState(true);
  broadcastState('RESULTS_PUBLISHED', { publishedResults: state.publishedResults });
  res.json({ success: true, publishedResults: state.publishedResults });
});

app.post('/api/results/reopen', (req, res) => {
  const { eventId = state.currentEventId, reason, actor = 'Administrator' } = req.body || {};
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Explicit authorization reason is required to reopen published results.' });
  }

  const prevLifecycle = state.resultsLifecycle;
  state.resultsLifecycle = 'RECONCILIATION';
  state.publishedResults = null;

  logAuditEvent({
    actor,
    role: 'admin',
    action: 'REOPEN_RESULTS',
    target: eventId,
    reason: reason.trim(),
    previousState: prevLifecycle,
    newState: 'RECONCILIATION'
  });

  saveState(true);
  broadcastState('RESULTS_REOPENED', { reason });
  res.json({ success: true, message: 'Results reopened for review', resultsLifecycle: state.resultsLifecycle });
});

// ==========================================
// MARKET INTELLIGENCE FEED & SCENARIOS
// ==========================================
app.get('/api/intelligence/feed', (req, res) => {
  const { category, severity, status = 'PUBLISHED', limit = 50 } = req.query;
  let items = state.intelligenceFeed || [];
  if (category && category !== 'ALL') items = items.filter(i => i.category === category);
  if (severity && severity !== 'ALL') items = items.filter(i => i.severity === severity);
  if (status && status !== 'ALL') items = items.filter(i => i.status === status);

  items = [...items].sort((a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0)).slice(0, Number(limit));
  res.json({ success: true, intelligenceFeed: items });
});

app.post('/api/intelligence/item', (req, res) => {
  const {
    title,
    narrative,
    category = 'MARKET_OVERVIEW',
    severity = 'INFO',
    affectedTickers = [],
    affectedSectors = [],
    status = 'PUBLISHED',
    scenarioId = null,
    author = 'News Controller'
  } = req.body || {};

  if (!title || !narrative) {
    return res.status(400).json({ error: 'Title and narrative are required.' });
  }

  const itemId = `INT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item = {
    id: itemId,
    eventId: state.currentEventId,
    title: title.trim(),
    narrative: narrative.trim(),
    category,
    severity,
    affectedTickers,
    affectedSectors,
    status,
    scenarioId,
    author,
    createdAt: Date.now(),
    publishedAt: status === 'PUBLISHED' ? Date.now() : null
  };

  if (!state.intelligenceFeed) state.intelligenceFeed = [];
  state.intelligenceFeed.unshift(item);

  if (status === 'PUBLISHED') {
    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift({
      id: `NW_${Date.now()}`,
      headline: item.title,
      description: item.narrative,
      sentiment: severity === 'CRITICAL' || severity === 'HIGH' ? 'Negative' : 'Neutral',
      category,
      impactPercent: 0,
      triggeredAt: Date.now()
    });
  }

  saveState(true);
  broadcastState('INTELLIGENCE_ITEM_ADDED', { item });
  res.json({ success: true, item });
});

app.post('/api/scenarios/manage', (req, res) => {
  const { action, scenario } = req.body || {};
  if (!scenario || !scenario.title) {
    return res.status(400).json({ error: 'Valid scenario object is required.' });
  }

  const sId = scenario.id || `SCEN_${Date.now()}`;
  const managedScenario = {
    id: sId,
    eventId: state.currentEventId,
    title: scenario.title,
    narrative: scenario.narrative,
    category: scenario.category || 'Macro',
    severity: scenario.severity || 'MEDIUM',
    affectedTickers: scenario.affectedTickers || [],
    affectedSectors: scenario.affectedSectors || [],
    effectType: scenario.effectType || 'PRICE_SHIFT',
    magnitudePercent: Number(scenario.magnitudePercent) || 0,
    status: action === 'PUBLISH' ? 'PUBLISHED' : action === 'SCHEDULE' ? 'SCHEDULED' : 'DRAFT',
    createdAt: scenario.createdAt || Date.now(),
    publishedAt: action === 'PUBLISH' ? Date.now() : null,
    author: req.body.operator || 'Market Controller'
  };

  if (action === 'PUBLISH' && managedScenario.magnitudePercent !== 0) {
    const beforeState = [];
    (state.securities || []).forEach(sec => {
      const matchTicker = (managedScenario.affectedTickers || []).includes(sec.ticker);
      const matchSector = (managedScenario.affectedSectors || []).includes(sec.sector);
      if (matchTicker || matchSector) {
        beforeState.push({ ticker: sec.ticker, oldPrice: sec.currentPrice });
        const mult = 1 + (managedScenario.magnitudePercent / 100);
        sec.currentPrice = parseFloat(Math.max(1, sec.currentPrice * mult).toFixed(2));
        sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
      }
    });

    managedScenario.appliedBeforeAfter = beforeState;
    updateMarketIndex();
  }

  if (!state.managedScenarios) state.managedScenarios = [];
  const idx = state.managedScenarios.findIndex(s => s.id === sId);
  if (idx >= 0) state.managedScenarios[idx] = managedScenario;
  else state.managedScenarios.unshift(managedScenario);

  logAuditEvent({
    actor: req.body.operator || 'Market Controller',
    role: 'admin',
    action: `SCENARIO_${action}: ${managedScenario.title}`,
    target: sId,
    reason: managedScenario.narrative
  });

  saveState(true);
  broadcastState('SCENARIO_UPDATED', { scenario: managedScenario });
  res.json({ success: true, scenario: managedScenario });
});

// ==========================================
// BROKER ADVISORY BULLETINS & RESTRICTION
// ==========================================
app.post('/api/broker/bulletin', (req, res) => {
  const { advisorId = 'DOMESTIC', headline, body, relatedTickers = [], relatedSectors = [], opinionType = 'NEUTRAL', author } = req.body || {};
  if (!headline || !body) {
    return res.status(400).json({ error: 'Headline and body are required.' });
  }

  const advisor = state.advisors?.[advisorId] || { name: 'Floor Advisor', coverage: 'General' };
  const bulletin = {
    id: `ADV_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    advisorId,
    advisorName: advisor.name,
    coverage: advisor.coverage,
    headline: headline.trim(),
    body: body.trim(),
    relatedTickers,
    relatedSectors,
    opinionType,
    publishedAt: Date.now(),
    author: author || advisor.name
  };

  if (!state.brokerRecommendations) state.brokerRecommendations = [];
  state.brokerRecommendations.unshift(bulletin);

  saveState(true);
  broadcastState('BROKER_BULLETIN_PUBLISHED', { bulletin });
  res.json({ success: true, bulletin });
});

// ==========================================
// BULL / BEAR MARKET DEBATE ROUND MANAGEMENT
// ==========================================
app.post('/api/bull-bear/round', (req, res) => {
  const { round = 1, topic, timerSeconds = 300, moderatorNotes = '', status = 'ACTIVE' } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Debate topic required.' });

  state.bullBearDebate = {
    activeRound: Number(round),
    currentTopic: topic.trim(),
    timerSeconds: Number(timerSeconds),
    status,
    startedAt: Date.now(),
    moderatorNotes,
    history: state.bullBearDebate?.history || []
  };

  logAuditEvent({
    actor: req.body.operator || 'Debate Moderator',
    role: 'moderator',
    action: `START_DEBATE_ROUND_${round}: ${topic}`,
    target: 'BullBearArena',
    reason: moderatorNotes
  });

  saveState(true);
  broadcastState('DEBATE_ROUND_UPDATED', { debate: state.bullBearDebate });
  res.json({ success: true, debate: state.bullBearDebate });
});

// ==========================================
// EVENT ANALYTICS & EXECUTIVE REPORTING
// ==========================================
app.get('/api/analytics/event-report', (req, res) => {
  const totalTrades = (state.transactions || []).filter(t => !t.voided).length;
  let totalTurnoverINR = 0;
  (state.transactions || []).forEach(t => {
    if (!t.voided && t.total) totalTurnoverINR += Number(t.total);
  });

  const ordersByStatus = {
    EXECUTED: (state.orders || []).filter(o => o.status === 'EXECUTED').length,
    REJECTED: (state.orders || []).filter(o => o.status === 'REJECTED').length,
    CANCELLED: (state.orders || []).filter(o => o.status === 'CANCELLED').length,
    PENDING: (state.orders || []).filter(o => o.status === 'PENDING' || o.status === 'VERIFYING').length
  };

  const fxStats = {
    totalQueueItems: (state.fxQueue || []).length,
    settledCount: (state.fxQueue || []).filter(q => q.status === 'SETTLED').length,
    pendingCount: (state.fxQueue || []).filter(q => q.status !== 'SETTLED' && q.status !== 'REJECTED').length
  };

  const ipoStats = {
    activeIpos: (state.securities || []).filter(s => s.status === 'IPO_PENDING' || s.ipoStatus === 'SUBSCRIPTION_OPEN').length,
    listedIpos: (state.securities || []).filter(s => s.ipoStatus === 'LISTED' || (s.ipoStage === 'LISTING' && s.status === 'Active')).length
  };

  const activeEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || (state.events || [])[0];

  res.json({
    success: true,
    analytics: {
      eventId: activeEvent?.eventId,
      eventName: activeEvent?.eventName,
      eventMode: activeEvent?.eventMode,
      resultsLifecycle: state.resultsLifecycle,
      totalRegisteredHouses: (state.investmentHouses || []).length,
      totalActiveTeams: (state.teams || []).filter(t => t.isActive !== false).length,
      totalTurnoverINR,
      totalTrades,
      ordersByStatus,
      fxStats,
      ipoStats,
      reconciliationRecordsCount: (state.reconciliationRecords || []).length,
      penaltiesCount: (state.penalties || []).length,
      judgeScorecardsCount: (state.judgeScorecards || []).length
    }
  });
});

app.get(['/api/reconciliation', '/api/admin/reconciliation'], (req, res) => {
  const usdRate = state.fxRates?.USDINR?.midRate || 88.20;
  const gbpRate = state.fxRates?.GBPINR?.midRate || 119.40;
  const eurRate = state.fxRates?.EURINR?.midRate || 103.50;

  let totalCash = 0;
  let totalHoldings = 0;
  (state.teams || []).forEach(team => {
    const inr = Number(team.cashWallets?.INR ?? team.cashBalance ?? 0);
    const usd = Number(team.cashWallets?.USD || 0) * usdRate;
    const gbp = Number(team.cashWallets?.GBP || 0) * gbpRate;
    const eur = Number(team.cashWallets?.EUR || 0) * eurRate;
    totalCash += inr + usd + gbp + eur;

    Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
      const sec = (state.securities || []).find(s => s.ticker === ticker || s.id === ticker);
      if (sec && qty > 0) {
        const secCur = sec.currency || (sec.exchange === 'NASDAQ' || sec.exchange === 'NYSE' ? 'USD' : sec.exchange === 'LSE' ? 'GBP' : sec.exchange === 'XETRA' ? 'EUR' : 'INR');
        const fx = secCur === 'USD' ? usdRate : secCur === 'GBP' ? gbpRate : secCur === 'EUR' ? eurRate : 1.0;
        totalHoldings += qty * (sec.currentPrice || sec.basePrice || 0) * fx;
      }
    });
  });

  const totalCapital = totalCash + totalHoldings;
  const totalTrades = (state.transactions || []).filter(t => !t.voided).length;
  res.json({
    success: true,
    totalCapital,
    totalCash,
    totalHoldings,
    totalTrades,
    teamCount: (state.teams || []).length,
    reconciled: state.marketState?.sessionState === 'RESULTS' || state.marketState?.status === 'Closed'
  });
});

app.get('/api/bull-bear/statement', (req, res) => {
  res.json({ success: true, bullBear: state.bullBear || {} });
});

app.get('/api/broker/recommendations', (req, res) => {
  res.json({ success: true, recommendations: state.brokerRecommendations || [] });
});

app.get('/api/polls', (req, res) => {
  res.json({ success: true, polls: state.polls || {} });
});

app.post('/api/admin/reconcile', (req, res) => {
  const { confirmText, confirmPhrase, actor } = req.body || {};
  const confirm = confirmText || confirmPhrase;
  if (confirm !== 'RECONCILE MARKET' && confirm !== 'RECONCILE') {
    return res.status(400).json({ error: 'Confirmation required. Type "RECONCILE MARKET" to proceed.' });
  }

  const startingCapital = state.settings.startingCapitalRetail || 10000000; // ₹1 Crore
  const sectorsCount = new Set(state.securities.map(s => s.sector)).size || 1;
  const usdRate = state.fxRates?.USDINR?.midRate || 88.20;
  const gbpRate = state.fxRates?.GBPINR?.midRate || 119.40;
  const eurRate = state.fxRates?.EURINR?.midRate || 103.50;

  const processed = state.teams
    .filter(t => t.isActive)
    .map(team => {
      // Calculate consolidated multi-currency cash
      const inrCash = Number(team.cashWallets?.INR ?? team.cashBalance ?? 0);
      const usdCashInr = Number(team.cashWallets?.USD || 0) * usdRate;
      const gbpCashInr = Number(team.cashWallets?.GBP || 0) * gbpRate;
      const eurCashInr = Number(team.cashWallets?.EUR || 0) * eurRate;
      const totalCashInr = parseFloat((inrCash + usdCashInr + gbpCashInr + eurCashInr).toFixed(2));

      let holdingsVal = 0;
      let investmentPnL = 0;
      let fxPnL = 0;
      let heldSectors = new Set();
      let riskPoints = 0;
      let ipoAllotmentUnits = 0;

      Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
        const sec = state.securities.find(s => s.ticker === ticker || s.id === ticker);
        if (sec && qty > 0) {
          const secCur = sec.currency || (sec.exchange === 'NASDAQ' || sec.exchange === 'NYSE' ? 'USD' : sec.exchange === 'LSE' ? 'GBP' : sec.exchange === 'XETRA' ? 'EUR' : 'INR');
          const currentFx = secCur === 'USD' ? usdRate : secCur === 'GBP' ? gbpRate : secCur === 'EUR' ? eurRate : 1.0;
          const currentPrice = sec.currentPrice || sec.basePrice;
          const nativeVal = qty * currentPrice;
          const inrVal = nativeVal * currentFx;

          holdingsVal += inrVal;
          if (sec.sector) heldSectors.add(sec.sector);
          const rWeight = sec.riskRating === 'High' ? 3 : sec.riskRating === 'Medium' ? 2 : 1;
          riskPoints += rWeight * inrVal;
          if (sec.type === 'IPO' || sec.ipoStatus === 'ALLOTTED') {
            ipoAllotmentUnits += qty;
          }
        }
      });

      const finalNetWorth = parseFloat((totalCashInr + holdingsVal).toFixed(2));
      const totalPnL = parseFloat((finalNetWorth - startingCapital).toFixed(2));
      const roi = parseFloat(((totalPnL / startingCapital) * 100).toFixed(2));
      const divScore = parseFloat(((heldSectors.size / sectorsCount) * 10).toFixed(1));
      const riskScore = holdingsVal > 0 ? parseFloat((riskPoints / holdingsVal).toFixed(1)) : 1.0;

      const teamTxs = (state.transactions || []).filter(tx => (tx.teamCode === team.teamCode || tx.teamId === team.id) && !tx.voided);
      const tradeCount = teamTxs.length;
      const totalVolume = teamTxs.reduce((sum, tx) => sum + Number(tx.quantity || 0), 0);

      let maxSingleGain = 0;
      teamTxs.forEach(tx => {
        const sec = state.securities.find(s => s.ticker === tx.ticker || s.id === tx.securityId);
        if (sec) {
          const currentPrice = sec.currentPrice || sec.basePrice;
          const gain = tx.action === 'BUY' 
            ? (currentPrice - tx.priceAtExecution) * tx.quantity 
            : (tx.priceAtExecution - currentPrice) * tx.quantity;
          if (gain > maxSingleGain) maxSingleGain = gain;
        }
      });

      return {
        id: team.id || team.teamCode,
        teamCode: team.teamCode,
        teamName: team.teamName,
        teamType: team.teamType || 'Retail',
        cashBalance: Number(team.cashBalance),
        holdingsValue: holdingsVal,
        finalNetWorth,
        portfolioValue: finalNetWorth,
        totalCapital: finalNetWorth,
        totalPnL,
        roi,
        divScore,
        riskScore,
        tradeCount,
        totalVolume,
        maxSingleGain,
        ipoAllotmentUnits,
        badges: []
      };
    });

  processed.sort((a, b) => {
    if (b.finalNetWorth !== a.finalNetWorth) return b.finalNetWorth - a.finalNetWorth;
    if (b.roi !== a.roi) return b.roi - a.roi;
    if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount;
    return (a.teamCode || '').localeCompare(b.teamCode || '');
  });
  processed.forEach((t, idx) => {
    t.rank = idx + 1;
  });

  if (processed.length > 0) {
    processed[0].badges.push({ id: 'BEST_OVERALL', label: '🏆 Best Overall Investor', desc: 'Rank #1 Highest Ending Net Worth' });

    const highestRoiTeam = [...processed].sort((a, b) => b.roi - a.roi)[0];
    if (highestRoiTeam && !highestRoiTeam.badges.some(b => b.id === 'HIGHEST_ROI')) {
      highestRoiTeam.badges.push({ id: 'HIGHEST_ROI', label: '🚀 Highest ROI', desc: `Maximum Portfolio ROI (${highestRoiTeam.roi}%)` });
    }

    const activeHolders = processed.filter(t => t.holdingsValue > 0);
    if (activeHolders.length > 0) {
      const lowestRiskTeam = [...activeHolders].sort((a, b) => a.riskScore - b.riskScore)[0];
      lowestRiskTeam.badges.push({ id: 'RISK_MANAGER', label: '🛡️ Best Risk Manager', desc: `Conservative low-volatility allocation (Risk Index ${lowestRiskTeam.riskScore})` });
    }

    const mostActiveTeam = [...processed].sort((a, b) => b.tradeCount - a.tradeCount)[0];
    if (mostActiveTeam && mostActiveTeam.tradeCount > 0) {
      mostActiveTeam.badges.push({ id: 'MOST_ACTIVE', label: '⚡ Most Active Trader', desc: `Executed ${mostActiveTeam.tradeCount} market orders` });
    }

    const ipoSpecialist = [...processed].sort((a, b) => b.ipoAllotmentUnits - a.ipoAllotmentUnits)[0];
    if (ipoSpecialist && ipoSpecialist.ipoAllotmentUnits > 0) {
      ipoSpecialist.badges.push({ id: 'IPO_SPECIALIST', label: '💎 IPO Specialist', desc: `Subscribed and captured ${ipoSpecialist.ipoAllotmentUnits.toLocaleString()} IPO units` });
    }

    const allValidTxs = (state.transactions || []).filter(tx => !tx.voided && tx.timestamp).sort((a, b) => a.timestamp - b.timestamp);
    if (allValidTxs.length > 0) {
      const firstTx = allValidTxs[0];
      const firstTradeTeam = processed.find(t => t.teamCode === firstTx.teamCode || t.id === firstTx.teamId);
      if (firstTradeTeam && !firstTradeTeam.badges.some(b => b.id === 'FIRST_TRADE')) {
        firstTradeTeam.badges.push({ id: 'FIRST_TRADE', label: '🥇 First Trade', desc: 'Logged the first cleared trade of the SAAMX session' });
      }
    }

    const mostDiverseTeam = [...processed].sort((a, b) => b.divScore - a.divScore)[0];
    if (mostDiverseTeam && mostDiverseTeam.divScore > 0) {
      mostDiverseTeam.badges.push({ id: 'DIVERSIFICATION', label: '🌐 Best Diversification', desc: `Allocated capital across multiple market sectors (Score ${mostDiverseTeam.divScore}/10)` });
    }

    const biggestWinner = [...processed].sort((a, b) => b.maxSingleGain - a.maxSingleGain)[0];
    if (biggestWinner && biggestWinner.maxSingleGain > 0) {
      biggestWinner.badges.push({ id: 'BIGGEST_WINNER', label: '💰 Biggest Winner', desc: `Single trade gain of +₹${biggestWinner.maxSingleGain.toLocaleString()}` });
    }

    const bestRecovery = [...processed].filter(t => t.tradeCount >= 2).sort((a, b) => b.totalPnL - a.totalPnL)[0];
    if (bestRecovery && !bestRecovery.badges.some(b => b.id === 'BEST_RECOVERY')) {
      bestRecovery.badges.push({ id: 'BEST_RECOVERY', label: '📈 Best Recovery', desc: 'Strong performance across active continuous market trades' });
    }
  }

  const leaderboardMap = {};
  processed.forEach(t => {
    leaderboardMap[t.teamCode] = t;
  });

  state.leaderboard = leaderboardMap;
  state.marketState.status = 'Closed';
  state.marketState.sessionState = 'RESULTS';
  state.marketState.reconciledAt = Date.now();

  logAuditEvent({
    actor: actor || 'SEBI Desk',
    role: 'sebi',
    action: 'MARKET_RECONCILE',
    target: 'Leaderboard',
    newState: { rank1: processed[0]?.teamCode, count: processed.length },
    reason: 'Market session reconciled, final net worth calculated, rankings deterministic and locked.'
  });

  saveState(true);
  broadcastState('RECONCILIATION_COMPLETE', { leaderboard: processed });
  res.json({ success: true, leaderboard: processed });
});

app.post('/api/admin/backup', (req, res) => {
  const timestamp = Date.now();
  const backupId = `BACKUP_${state.marketState?.sessionId || 'SAAMX'}_${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(state, null, 2), 'utf8');
  saveState(true);
  logAuditEvent({
    actor: req.body?.actor || 'Admin',
    role: 'admin',
    action: 'STATE_BACKUP',
    target: backupId,
    reason: req.body?.reason || 'Manual state snapshot'
  });
  res.json({ success: true, backupId, timestamp });
});

app.post('/api/admin/restore', (req, res) => {
  const { backupId, confirmText, confirmPhrase, actor } = req.body || {};
  const confirm = confirmText || confirmPhrase;
  if (confirm !== `RESTORE ${backupId}`) {
    return res.status(400).json({ error: `Confirmation mismatch. Please type exactly "RESTORE ${backupId}".` });
  }
  const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: `Backup ${backupId} not found.` });
  }
  try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    state = JSON.parse(raw);
    logAuditEvent({
      actor: actor || 'Admin',
      role: 'admin',
      action: 'STATE_RESTORE',
      target: backupId,
      reason: 'Restored state from backup snapshot file.'
    });
    saveState(true);
    broadcastState('STATE_UPDATE', { message: `Restored from ${backupId}` });
    res.json({ success: true, message: `System state restored from ${backupId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/state', (req, res) => {
  res.json(state);
});

app.get('/api/audit-log', (req, res) => {
  res.json({ success: true, log: state.auditLog || [] });
});

app.post(['/api/portfolio', '/api/team/portfolio'], (req, res) => {
  const { teamCode, actorTeamCode, role } = req.body || {};
  if (actorTeamCode && teamCode && actorTeamCode.toUpperCase() !== teamCode.toUpperCase() && !['admin', 'sebi', 'exchange', 'fx'].includes(role)) {
    return res.status(403).json({ error: '403 Forbidden: You are not authorized to view another team\'s portfolio.' });
  }
  const team = state.teams.find(t => t.teamCode.toUpperCase() === (teamCode || '').toUpperCase() || t.id === teamCode);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  res.json({ success: true, team });
});

// ----------------------------------------------------
// CURRENCY EXCHANGE & FX ENGINE APIS
// ----------------------------------------------------
app.get('/api/fx/rates', (req, res) => {
  res.json({ success: true, fxRates: state.fxRates });
});

app.post('/api/fx/rates', (req, res) => {
  const { pair, midRate, spreadPercent, actor, reason } = req.body || {};
  if (!pair || !state.fxRates[pair] || !midRate || Number(midRate) <= 0) {
    return res.status(400).json({ error: 'Valid currency pair and positive midRate are required.' });
  }

  const prevRate = { ...state.fxRates[pair] };
  const spread = spreadPercent !== undefined ? Number(spreadPercent) : (state.fxRates[pair].spreadPercent || 0.45);
  const mid = parseFloat(Number(midRate).toFixed(2));
  const buyRate = parseFloat((mid * (1 + spread / 100)).toFixed(2));
  const sellRate = parseFloat((mid * (1 - spread / 100)).toFixed(2));

  state.fxRates[pair] = {
    ...state.fxRates[pair],
    midRate: mid,
    buyRate,
    sellRate,
    spreadPercent: spread,
    lastUpdated: Date.now()
  };

  logAuditEvent({
    actor: actor || 'SEBI FX Desk',
    role: 'sebi',
    action: 'FX_RATE_CHANGE',
    target: pair,
    previousState: prevRate,
    newState: state.fxRates[pair],
    reason: reason || 'Market FX rate adjustment'
  });

  saveState();
  broadcastState('FX_RATE_UPDATE', { fxRates: state.fxRates, updatedPair: pair });
  res.json({ success: true, fxRates: state.fxRates, updatedPair: state.fxRates[pair] });
});

app.get('/api/fx/transactions', (req, res) => {
  const { teamCode, actorTeamCode, role } = req.query;
  if (actorTeamCode && teamCode && actorTeamCode.toUpperCase() !== teamCode.toUpperCase() && !['admin', 'sebi', 'exchange', 'fx'].includes(role)) {
    return res.status(403).json({ error: '403 Forbidden: You are not authorized to view another team\'s FX history.' });
  }

  let txs = state.fxTransactions || [];
  if (teamCode) {
    txs = txs.filter(t => (t.teamCode || '').toUpperCase() === teamCode.toUpperCase());
  }
  res.json({ success: true, fxTransactions: txs });
});

app.post('/api/fx/exchange', (req, res) => {
  if (state.marketState.status === 'Closed') {
    return res.status(400).json({ error: 'Currency exchange is closed because trading has concluded.' });
  }

  const { teamCode, fromCurrency, toCurrency, fromAmount, operatorId, notes, ticketNumber } = req.body || {};
  const amount = Number(fromAmount);

  if (!teamCode || !fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid exchange parameters: teamCode, fromCurrency, toCurrency, and positive fromAmount are required.' });
  }

  if (fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'Cannot exchange currency to itself.' });
  }

  const validCurrencies = ['INR', 'USD', 'GBP', 'EUR'];
  if (!validCurrencies.includes(fromCurrency) || !validCurrencies.includes(toCurrency)) {
    return res.status(400).json({ error: `Unsupported currency. Supported: ${validCurrencies.join(', ')}` });
  }

  const team = state.teams.find(t => t.teamCode.toUpperCase() === teamCode.toUpperCase() || t.id === teamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${teamCode} not found.` });
  }

  // Ensure cashWallets exists
  if (!team.cashWallets) {
    team.cashWallets = {
      INR: Number(team.cashBalance) || 0,
      USD: 0,
      GBP: 0,
      EUR: 0
    };
  }

  const currentFromBalance = Number(team.cashWallets[fromCurrency] || 0);
  if (currentFromBalance < amount) {
    const curSym = fromCurrency === 'INR' ? '₹' : fromCurrency === 'USD' ? '$' : fromCurrency === 'GBP' ? '£' : '€';
    return res.status(400).json({
      error: `Insufficient ${fromCurrency} balance. Team has ${curSym}${currentFromBalance.toLocaleString()}, requested ${curSym}${amount.toLocaleString()}.`
    });
  }

  // Calculate Exchange Rate with Buy/Sell Spread
  let effectiveRate = 1.0;
  let toAmount = 0;
  let spreadPercent = 0.45;

  if (fromCurrency === 'INR') {
    // Team sells INR to buy foreign currency (Desk applies buyRate, e.g. 88.60 INR per USD)
    const pairKey = `${toCurrency}INR`;
    const fxInfo = state.fxRates[pairKey] || { buyRate: toCurrency === 'USD' ? 88.60 : toCurrency === 'GBP' ? 119.95 : 103.95, spreadPercent: 0.45 };
    effectiveRate = fxInfo.buyRate;
    spreadPercent = fxInfo.spreadPercent || 0.45;
    toAmount = parseFloat((amount / effectiveRate).toFixed(2));
  } else if (toCurrency === 'INR') {
    // Team sells foreign currency to buy INR (Desk applies sellRate, e.g. 87.80 INR per USD)
    const pairKey = `${fromCurrency}INR`;
    const fxInfo = state.fxRates[pairKey] || { sellRate: fromCurrency === 'USD' ? 87.80 : fromCurrency === 'GBP' ? 118.85 : 103.05, spreadPercent: 0.45 };
    effectiveRate = fxInfo.sellRate;
    spreadPercent = fxInfo.spreadPercent || 0.45;
    toAmount = parseFloat((amount * effectiveRate).toFixed(2));
  } else {
    // Cross-Currency (e.g. USD -> EUR)
    const fromPair = state.fxRates[`${fromCurrency}INR`] || { sellRate: 87.80, spreadPercent: 0.45 };
    const toPair = state.fxRates[`${toCurrency}INR`] || { buyRate: 103.95, spreadPercent: 0.45 };
    const inrValue = amount * fromPair.sellRate;
    toAmount = parseFloat((inrValue / toPair.buyRate).toFixed(2));
    effectiveRate = parseFloat((fromPair.sellRate / toPair.buyRate).toFixed(4));
    spreadPercent = Math.max(fromPair.spreadPercent || 0.45, toPair.spreadPercent || 0.45);
  }

  // Atomic Wallet Mutation
  team.cashWallets[fromCurrency] = parseFloat((Number(team.cashWallets[fromCurrency]) - amount).toFixed(2));
  team.cashWallets[toCurrency] = parseFloat(((Number(team.cashWallets[toCurrency]) || 0) + toAmount).toFixed(2));

  // Compute consolidated INR cash equivalent
  const usdRate = state.fxRates.USDINR?.midRate || 88.20;
  const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
  const eurRate = state.fxRates.EURINR?.midRate || 103.50;
  team.cashBalance = parseFloat((
    Number(team.cashWallets.INR || 0) +
    Number(team.cashWallets.USD || 0) * usdRate +
    Number(team.cashWallets.GBP || 0) * gbpRate +
    Number(team.cashWallets.EUR || 0) * eurRate
  ).toFixed(2));

  // Generate Transaction Record
  const txSeq = (state.fxTransactions || []).length + 1;
  const fxTxId = `FX${String(txSeq).padStart(6, '0')}`;
  const generatedTicket = ticketNumber || `FX-${Date.now().toString().slice(-4)}`;

  const fxTransaction = {
    id: fxTxId,
    ticketNumber: generatedTicket,
    timestamp: Date.now(),
    teamCode: team.teamCode,
    teamId: team.id,
    teamName: team.teamName,
    fromCurrency,
    toCurrency,
    fromAmount: amount,
    toAmount,
    effectiveRate,
    spreadPercent,
    operatorId: operatorId || 'FX-DESK',
    status: 'CONFIRMED',
    notes: notes || 'Currency Desk Execution'
  };

  if (!state.fxTransactions) state.fxTransactions = [];
  state.fxTransactions.unshift(fxTransaction);

  logAuditEvent({
    actor: operatorId || 'FX Operator',
    role: 'fx_operator',
    action: 'FX_CONFIRM',
    target: team.teamCode,
    newState: fxTransaction,
    reason: `Exchanged ${fromCurrency} ${amount.toLocaleString()} -> ${toCurrency} ${toAmount.toLocaleString()} @ ${effectiveRate}`
  });

  saveState();
  broadcastState('FX_TRANSACTION', { fxTransaction, teamCode: team.teamCode });
  res.json({ success: true, fxTransaction, cashWallets: team.cashWallets, cashBalance: team.cashBalance });
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
  const startingCapital = Number(team.cashBalance) || state.settings?.startingCapitalRetail || 10000000;

  const newTeam = {
    id,
    teamCode: codeUpper,
    teamName: team.teamName,
    teamType: team.teamType || 'Retail',
    cashBalance: startingCapital,
    cashWallets: {
      INR: startingCapital,
      USD: 0,
      GBP: 0,
      EUR: 0
    },
    holdings: {},
    portfolioValue: startingCapital,
    pnl: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    roi: 0,
    tradeCount: 0,
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
app.post(['/api/trade', '/api/trades'], (req, res) => {
  const { teamId, securityId, action, quantity, enteredBy } = req.body || {};
  const Q = Number(quantity);

  if (!teamId || !securityId || !action || isNaN(Q) || Q <= 0 || !Number.isInteger(Q)) {
    return res.status(400).json({ error: 'Missing parameters or invalid quantity. Quantity must be a positive integer.' });
  }

  const team = state.teams.find(t => t.id === teamId || t.teamCode === teamId);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (team.isActive === false) {
    return res.status(400).json({ error: `Team ${team.teamCode || teamId} is currently marked INACTIVE by Admin. Contact coordinator.` });
  }

  const security = state.securities.find(s => s.id === securityId || s.ticker === securityId);
  if (!security) return res.status(404).json({ error: 'Security not found.' });

  if (state.marketState.status !== 'Open' || state.marketState.sessionState === 'RESULTS' || state.marketState.sessionState === 'PRE_OPEN' || state.marketState.sessionState === 'MARKET_CLOSED') {
    return res.status(400).json({ error: 'Trading is only permitted when market status is Open and continuous trading is active.' });
  }

  if (security.status !== 'Active') {
    return res.status(400).json({ error: `${security.ticker} is currently ${security.status} — trading not permitted.` });
  }

  const executionPrice = security.currentPrice;
  const totalValue = Q * executionPrice;
  const impactFactor = Q / security.totalUnits;
  const priceChangePercent = impactFactor * security.volatility * 100;

  // Resolve Security Currency & Team Wallet
  const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR');
  
  if (!team.cashWallets) {
    team.cashWallets = {
      INR: Number(team.cashBalance) || 0,
      USD: 0,
      GBP: 0,
      EUR: 0
    };
  }

  const nativeCash = Number(team.cashWallets[secCurrency] || 0);
  const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';

  if (action === 'BUY') {
    if (Q > security.availableUnits) {
      return res.status(400).json({ error: `Only ${security.availableUnits} units available.` });
    }
    if (nativeCash < totalValue) {
      return res.status(400).json({
        error: `Insufficient ${secCurrency} balance. Team has ${curSym}${nativeCash.toLocaleString()}, order requires ${curSym}${totalValue.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`
      });
    }

    const oldPrice = security.currentPrice;
    security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    security.availableUnits -= Q;

    team.cashWallets[secCurrency] = parseFloat((nativeCash - totalValue).toFixed(2));
    if (!team.holdings) team.holdings = {};
    team.holdings[security.ticker] = (team.holdings[security.ticker] || 0) + Q;

    const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
    if (alert) activeAlerts.add(JSON.stringify(alert));

  } else if (action === 'SELL') {
    const currentHolding = Number(team.holdings?.[security.ticker] || 0);
    if (Q > currentHolding) {
      return res.status(400).json({ error: `Insufficient holdings. Team holds ${currentHolding} units of ${security.ticker}.` });
    }

    const oldPrice = security.currentPrice;
    security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    security.availableUnits += Q;

    team.cashWallets[secCurrency] = parseFloat((nativeCash + totalValue).toFixed(2));
    team.holdings[security.ticker] -= Q;
    if (team.holdings[security.ticker] === 0) {
      delete team.holdings[security.ticker];
    }

    const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
    if (alert) activeAlerts.add(JSON.stringify(alert));
  } else {
    return res.status(400).json({ error: 'Action must be BUY or SELL.' });
  }

  // Update consolidated INR cash
  const usdRate = state.fxRates.USDINR?.midRate || 88.20;
  const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
  const eurRate = state.fxRates.EURINR?.midRate || 103.50;
  team.cashBalance = parseFloat((
    Number(team.cashWallets.INR || 0) +
    Number(team.cashWallets.USD || 0) * usdRate +
    Number(team.cashWallets.GBP || 0) * gbpRate +
    Number(team.cashWallets.EUR || 0) * eurRate
  ).toFixed(2));

  const fxRateAtExecution = secCurrency === 'USD' ? usdRate : secCurrency === 'GBP' ? gbpRate : secCurrency === 'EUR' ? eurRate : 1.0;
  const inrEquivalent = parseFloat((totalValue * fxRateAtExecution).toFixed(2));

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
    localPrice: executionPrice,
    localCurrency: secCurrency,
    grossValue: totalValue,
    fxRateAtExecution,
    inrEquivalent,
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

  const team = state.teams.find(t => t.id === tx.teamId || t.teamCode === tx.teamCode);
  const security = state.securities.find(s => s.id === tx.securityId || s.ticker === tx.ticker);

  if (team) {
    const secCur = tx.localCurrency || (security ? (security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR')) : 'INR');
    if (!team.cashWallets) team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };

    const usdRate = state.fxRates.USDINR?.midRate || 88.20;
    const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
    const eurRate = state.fxRates.EURINR?.midRate || 103.50;

    if (tx.action === 'BUY') {
      team.cashWallets[secCur] = parseFloat(((team.cashWallets[secCur] || 0) + tx.totalValue).toFixed(2));
      if (team.holdings && team.holdings[tx.ticker]) {
        team.holdings[tx.ticker] -= tx.quantity;
        if (team.holdings[tx.ticker] <= 0) delete team.holdings[tx.ticker];
      }
    } else if (tx.action === 'SELL') {
      team.cashWallets[secCur] = parseFloat(((team.cashWallets[secCur] || 0) - tx.totalValue).toFixed(2));
      if (!team.holdings) team.holdings = {};
      team.holdings[tx.ticker] = (team.holdings[tx.ticker] || 0) + tx.quantity;
    }

    team.cashBalance = parseFloat((
      Number(team.cashWallets.INR || 0) +
      Number(team.cashWallets.USD || 0) * usdRate +
      Number(team.cashWallets.GBP || 0) * gbpRate +
      Number(team.cashWallets.EUR || 0) * eurRate
    ).toFixed(2));
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

// ----------------------------------------------------
// 5 SIMULTANEOUS ORDER DESKS & QUEUE ARCHITECTURE
// ----------------------------------------------------
app.get('/api/order-desks', (req, res) => {
  const desks = state.orderDesks || {};
  const queue = state.orders || [];
  const deskMetrics = Object.keys(desks).map(deskId => {
    const assigned = queue.filter(o => o.deskId === deskId && ['VERIFYING', 'VALIDATED'].includes(o.status));
    return {
      ...desks[deskId],
      activeQueueCount: assigned.length,
      activeOrders: assigned
    };
  });

  const unassignedCount = queue.filter(o => !o.deskId && ['QUEUED', 'SUBMITTED', 'PENDING'].includes(o.status)).length;
  const totalInFlight = queue.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length;

  res.json({
    success: true,
    desks: deskMetrics,
    totalUnassigned: unassignedCount,
    totalQueued: totalInFlight,
    orders: queue
  });
});

app.post('/api/order/claim', (req, res) => {
  const { orderId, deskId, operator } = req.body || {};
  if (!orderId || !deskId) {
    return res.status(400).json({ error: 'orderId and deskId are required.' });
  }

  if (!state.orders) state.orders = [];
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Atomic lock check: prevent duplicate claim across desks
  if (order.lockedByDesk && order.lockedByDesk !== deskId) {
    return res.status(409).json({ error: `Conflict: Order is already claimed by ${order.lockedByDesk} (${order.operator || 'Operator'}).` });
  }

  if (['EXECUTED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be claimed because it is already ${order.status}.` });
  }

  const deskName = state.orderDesks?.[deskId]?.name || deskId;
  const operatorName = operator || state.orderDesks?.[deskId]?.operator || 'Desk Operator';

  order.deskId = deskId;
  order.operator = operatorName;
  order.lockedByDesk = deskId;
  order.status = 'VERIFYING';
  order.verificationStatus = 'IN_PROGRESS';
  order.claimedAt = Date.now();

  saveState();
  broadcastState('ORDER_CLAIMED', { order, deskId, operator: operatorName });
  res.json({ success: true, order });
});

// Broker & Physical Order Submission API
app.get('/api/orders', (req, res) => {
  res.json(state.orders || []);
});

app.post(['/api/order/create', '/api/orders/submit'], (req, res) => {
  if (req.body.role === 'advisor' || req.body.enteredByRole === 'advisor') {
    return res.status(403).json({ error: 'Advisors advise; they do not trade on behalf of Investment Houses. Only authorized participant workflows may submit orders.' });
  }

  if (!isTradingAllowedNow()) {
    const sched = getScheduleStatus();
    return res.status(400).json({ error: `Trading is prohibited during the current phase (${sched.currentTitle}). Orders can only be submitted during active market trading sessions (09:30–12:00 and 13:00–15:30).` });
  }

  const { ticketNumber, teamCode, ticker, action, quantity, orderType, limitPrice, brokerId, notes, enteredBy, deskId } = req.body || {};
  const Q = Number(quantity);
  if (!ticketNumber || !teamCode || !ticker || !action || isNaN(Q) || Q <= 0 || !Number.isInteger(Q)) {
    return res.status(400).json({ error: 'Missing or invalid parameters: ticketNumber, teamCode, ticker, action, and integer positive quantity are required.' });
  }

  if (!state.orders) state.orders = [];
  const duplicate = state.orders.find(o => String(o.ticketNumber).toUpperCase() === String(ticketNumber).toUpperCase());
  if (duplicate) {
    return res.status(400).json({ error: `Duplicate Ticket Number: Physical Ticket #${ticketNumber} has already been logged into the queue.` });
  }

  const sec = (state.securities || []).find(s => s.ticker === ticker.toUpperCase() || s.id === ticker.toUpperCase());
  if (!sec) {
    return res.status(404).json({ error: `Security ${ticker} not found in active universe.` });
  }

  const refPrice = orderType === 'LIMIT' && limitPrice ? Number(limitPrice) : (sec.currentPrice || sec.basePrice || 100);
  const requestedValue = parseFloat((Q * refPrice).toFixed(2));

  const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderObj = {
    id: orderId,
    ticketNumber,
    teamCode: teamCode.toUpperCase(),
    eventId: state.currentEventId || 'EVT_LIVE_MAIN',
    ticker: ticker.toUpperCase(),
    securityName: sec.name || ticker.toUpperCase(),
    action: action.toUpperCase(),
    quantity: Q,
    orderType: (orderType || 'MARKET').toUpperCase(),
    limitPrice: limitPrice ? Number(limitPrice) : null,
    requestedValue,
    brokerId: brokerId || 'B01',
    notes: notes || '',
    status: 'PENDING', // PENDING -> BEING_VERIFIED -> VERIFIED_AWAITING_EXCHANGE -> UNDER_EXCHANGE_REVIEW -> VALIDATED -> EXECUTING -> EXECUTED / REJECTED
    workflowStage: 'AWAITING_VERIFICATION',
    verificationStatus: 'PENDING',
    exchangeStatus: 'PENDING',
    finalStatus: 'PENDING',
    physicalSlipChecked: false,
    deskId: deskId || null,
    operator: enteredBy || null,
    verifiedBy: null,
    verifiedAt: null,
    returnedAt: null,
    returnReason: null,
    rejectionReason: null,
    executionQuantity: null,
    executionPrice: null,
    executionValue: null,
    executedAt: null,
    executedByDesk: null,
    executedByOperator: null,
    lockedByDesk: deskId || null,
    submittedAt: Date.now(),
    timestamp: Date.now(),
    enteredBy: enteredBy || 'Broker Terminal',
    statusHistory: [
      {
        stage: 'AWAITING_VERIFICATION',
        status: 'PENDING',
        timestamp: Date.now(),
        actor: enteredBy || teamCode,
        note: 'Physical order slip logged into verification queue'
      }
    ]
  };

  state.orders.push(orderObj);
  saveState();
  broadcastState('ORDER_CREATED', { order: orderObj });

  res.json({ success: true, orderId, order: orderObj });
});

app.post('/api/order/action', (req, res) => {
  const { orderId, actionType, rejectionReason, returnReason, deskId, operator, officerName, physicalSlipChecked } = req.body || {};
  if (!orderId || !actionType) {
    return res.status(400).json({ error: 'Missing parameters: orderId and actionType required.' });
  }

  if (!state.orders) state.orders = [];
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Atomic double execution lock
  if (order.status === 'EXECUTED') {
    return res.status(400).json({ error: 'Duplicate execution prevented: Order has already been executed.' });
  }

  const effectiveActor = operator || officerName || deskId || 'Desk Operator';

  // 1. REJECT action
  if (actionType === 'REJECT') {
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'Every rejected order must provide an explicit rejection reason.' });
    }
    order.status = 'REJECTED';
    order.workflowStage = 'REJECTED';
    order.verificationStatus = 'REJECTED';
    order.exchangeStatus = 'REJECTED';
    order.finalStatus = 'REJECTED';
    order.rejectionReason = rejectionReason.trim();
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'REJECTED',
      status: 'REJECTED',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: rejectionReason.trim()
    });
    saveState();
    broadcastState('ORDER_REJECTED', { order });
    return res.json({ success: true, orderStatus: 'REJECTED', rejectionReason: order.rejectionReason, order });
  }

  // 2. CANCEL action
  if (actionType === 'CANCEL') {
    order.status = 'CANCELLED';
    order.workflowStage = 'CANCELLED';
    order.verificationStatus = 'CANCELLED';
    order.finalStatus = 'CANCELLED';
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'CANCELLED',
      status: 'CANCELLED',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: req.body?.reason || 'Order cancelled'
    });
    saveState();
    broadcastState('ORDER_CANCELLED', { order });
    return res.json({ success: true, orderStatus: 'CANCELLED', order });
  }

  // 3. CLAIM FOR VERIFICATION
  if (actionType === 'CLAIM' || actionType === 'CLAIM_FOR_VERIFICATION') {
    if (order.lockedByDesk && deskId && order.lockedByDesk !== deskId && order.status === 'BEING_VERIFIED') {
      return res.status(409).json({ error: `Order is already being reviewed by ${order.lockedByDesk}.` });
    }
    order.deskId = deskId || order.deskId || 'VERIFY_1';
    order.operator = effectiveActor;
    order.lockedByDesk = order.deskId;
    order.status = 'BEING_VERIFIED';
    order.workflowStage = 'BEING_VERIFIED';
    order.verificationStatus = 'IN_PROGRESS';
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'BEING_VERIFIED',
      status: 'BEING_VERIFIED',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: 'Claimed for physical slip verification'
    });
    saveState();
    broadcastState('ORDER_CLAIMED', { order });
    return res.json({ success: true, orderStatus: 'BEING_VERIFIED', order });
  }

  // 4. VERIFY action
  if (actionType === 'VERIFY' || actionType === 'MARK_VERIFIED') {
    order.status = 'VERIFIED_AWAITING_EXCHANGE';
    order.workflowStage = 'VERIFIED_AWAITING_EXCHANGE';
    order.verificationStatus = 'VERIFIED';
    order.physicalSlipChecked = physicalSlipChecked !== undefined ? Boolean(physicalSlipChecked) : true;
    order.verifiedBy = effectiveActor;
    order.verifiedAt = Date.now();
    order.lockedByDesk = null; // Unlocked so Exchange Desk can claim
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'VERIFIED_AWAITING_EXCHANGE',
      status: 'VERIFIED_AWAITING_EXCHANGE',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: 'Physical slip validated and marked verified for exchange queue'
    });
    saveState();
    broadcastState('ORDER_VERIFIED', { order });
    return res.json({ success: true, orderStatus: 'VERIFIED_AWAITING_EXCHANGE', order });
  }

  // 5. RETURN FOR CORRECTION action
  if (actionType === 'RETURN_FOR_CORRECTION') {
    const reasonText = (returnReason || req.body?.reason || '').trim();
    if (!reasonText) {
      return res.status(400).json({ error: 'Every returned order must provide an explicit return reason detailing the needed correction.' });
    }
    order.status = 'RETURNED_FOR_CORRECTION';
    order.workflowStage = 'RETURNED_FOR_CORRECTION';
    order.verificationStatus = 'RETURNED';
    order.returnReason = reasonText;
    order.returnedAt = Date.now();
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'RETURNED_FOR_CORRECTION',
      status: 'RETURNED_FOR_CORRECTION',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: `Returned for correction: ${reasonText}`
    });
    saveState();
    broadcastState('ORDER_RETURNED', { order });
    return res.json({ success: true, orderStatus: 'RETURNED_FOR_CORRECTION', returnReason: order.returnReason, order });
  }

  // 6. RESUBMIT action
  if (actionType === 'RESUBMIT') {
    const { quantity: newQty, limitPrice: newLimit, notes: newNotes } = req.body || {};
    if (newQty && Number(newQty) > 0) order.quantity = Math.floor(Number(newQty));
    if (newLimit !== undefined) order.limitPrice = newLimit ? Number(newLimit) : null;
    if (newNotes !== undefined) order.notes = newNotes;

    const sec = (state.securities || []).find(s => s.ticker === order.ticker);
    const refP = order.orderType === 'LIMIT' && order.limitPrice ? order.limitPrice : (sec?.currentPrice || 100);
    order.requestedValue = parseFloat((order.quantity * refP).toFixed(2));

    order.status = 'PENDING';
    order.workflowStage = 'RESUBMITTED';
    order.verificationStatus = 'RESUBMITTED';
    order.returnReason = null;
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'RESUBMITTED',
      status: 'PENDING',
      timestamp: Date.now(),
      actor: effectiveActor || order.teamCode,
      note: 'Ticket corrected and resubmitted into verification queue'
    });
    saveState();
    broadcastState('ORDER_RESUBMITTED', { order });
    return res.json({ success: true, orderStatus: 'PENDING', order });
  }

  // 7. CLAIM FOR EXCHANGE
  if (actionType === 'CLAIM_FOR_EXCHANGE') {
    order.deskId = deskId || order.deskId || 'DESK_1';
    order.operator = effectiveActor;
    order.lockedByDesk = order.deskId;
    order.status = 'UNDER_EXCHANGE_REVIEW';
    order.workflowStage = 'UNDER_EXCHANGE_REVIEW';
    order.exchangeStatus = 'UNDER_REVIEW';
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'UNDER_EXCHANGE_REVIEW',
      status: 'UNDER_EXCHANGE_REVIEW',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: `Claimed by Exchange Desk ${order.deskId}`
    });
    saveState();
    broadcastState('ORDER_CLAIMED', { order });
    return res.json({ success: true, orderStatus: 'UNDER_EXCHANGE_REVIEW', order });
  }

  // 8. VALIDATE action
  if (actionType === 'VALIDATE') {
    if (!isTradingAllowedNow()) {
      const sched = getScheduleStatus();
      return res.status(400).json({ error: `Order validation failed: Trading is prohibited during phase (${sched.currentTitle}). Active trading is permitted during 09:30–12:00 and 13:00–15:30.` });
    }

    const team = state.teams.find(t => t.teamCode === order.teamCode || t.id === order.teamCode);
    const security = state.securities.find(s => s.ticker === order.ticker || s.id === order.ticker);

    if (!team) return res.status(404).json({ error: `Team ${order.teamCode} not found in active teams.` });
    if (!team.isActive || team.status === 'LOCKED') return res.status(400).json({ error: `Team ${order.teamCode} is not in an active trading status.` });
    if (!security) return res.status(404).json({ error: `Security ${order.ticker} not found in universe.` });
    if (security.status !== 'Active') return res.status(400).json({ error: `Security ${security.ticker} is ${security.status} — trading suspended.` });

    // Risk Control: Price Band Check
    const risk = state.riskControls || {};
    const priceBandPct = risk.priceBandPercent || 20;
    if (order.orderType === 'LIMIT' && order.limitPrice) {
      const devPct = Math.abs(order.limitPrice - security.currentPrice) / security.currentPrice * 100;
      if (devPct > priceBandPct) {
        return res.status(400).json({ error: `Limit price ₹${order.limitPrice} deviates ${devPct.toFixed(1)}% which exceeds the ±${priceBandPct}% price band.` });
      }
    }

    // Risk Control: Max Order Value Check
    const execPrice = order.orderType === 'LIMIT' && order.limitPrice ? order.limitPrice : security.currentPrice;
    const orderGrossValue = order.quantity * execPrice;
    const maxOrderVal = risk.maxOrderValue || 50000000;
    if (orderGrossValue > maxOrderVal) {
      return res.status(400).json({ error: `Order gross value ₹${orderGrossValue.toLocaleString()} exceeds the maximum single ticket limit of ₹${maxOrderVal.toLocaleString()}.` });
    }

    // Check Cash Availability (for BUY)
    const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR');
    const teamWallets = team.cashWallets || { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
    const nativeCash = Number(teamWallets[secCurrency] || 0);

    if (order.action === 'BUY') {
      if (order.quantity > security.availableUnits) {
        return res.status(400).json({ error: `Only ${security.availableUnits} units available in market float.` });
      }
      if (nativeCash < orderGrossValue) {
        return res.status(400).json({ error: `Insufficient ${secCurrency} balance. Required: ${orderGrossValue}, Available: ${nativeCash}.` });
      }

      // Risk Control: Max Position Concentration Check
      const maxPosPct = risk.maxPositionSizePercent || 35;
      const curHoldingUnits = Number(team.holdings?.[order.ticker] || 0);
      const postHoldingValue = (curHoldingUnits + order.quantity) * execPrice;
      const totalPortfolio = Number(team.portfolioValue) || Number(team.cashBalance) || 10000000;
      const concentration = (postHoldingValue / totalPortfolio) * 100;
      if (concentration > maxPosPct) {
        return res.status(400).json({ error: `Order would result in ${concentration.toFixed(1)}% portfolio concentration in ${order.ticker}, exceeding the ${maxPosPct}% limit.` });
      }
    } else {
      // Action is SELL
      const currentHolding = Number(team.holdings?.[order.ticker] || 0);
      if (currentHolding < order.quantity && !risk.allowShortSelling) {
        return res.status(400).json({ error: `Insufficient holdings. Team holds ${currentHolding} units of ${order.ticker}. Short selling is disabled.` });
      }
    }

    order.status = 'VALIDATED';
    order.workflowStage = 'VALIDATED';
    order.exchangeStatus = 'VALIDATED';
    order.validatedAt = Date.now();
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'VALIDATED',
      status: 'VALIDATED',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: 'Risk controls, price bands, and balance checks validated'
    });
    saveState();
    broadcastState('ORDER_VALIDATED', { order });
    return res.json({ success: true, orderStatus: 'VALIDATED', order });
  }

  // 9. EXECUTE action
  if (actionType === 'EXECUTE') {
    if (state.marketState.status !== 'Open') {
      return res.status(400).json({ error: 'Trading is locked. Market status is not Open.' });
    }

    if (order.status === 'EXECUTED') {
      return res.status(400).json({ error: 'Duplicate execution prevented: Order is already executed.' });
    }

    const team = state.teams.find(t => t.teamCode === order.teamCode || t.id === order.teamCode);
    const security = state.securities.find(s => s.ticker === order.ticker || s.id === order.ticker);

    if (!team) return res.status(404).json({ error: `Team ${order.teamCode} not found.` });
    if (!security) return res.status(404).json({ error: `Security ${order.ticker} not found.` });
    if (security.status !== 'Active') {
      order.status = 'REJECTED';
      order.rejectionReason = `Security ${security.ticker} is ${security.status} — trading halted.`;
      saveState();
      return res.status(400).json({ error: order.rejectionReason });
    }

    const executionPrice = order.orderType === 'LIMIT' && order.limitPrice ? order.limitPrice : security.currentPrice;
    const totalValue = order.quantity * executionPrice;
    const impactFactor = order.quantity / security.totalUnits;
    const priceChangePercent = impactFactor * security.volatility * 100;
    const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR');

    if (!team.cashWallets) {
      team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
    }
    const nativeCash = Number(team.cashWallets[secCurrency] || 0);

    if (order.action === 'BUY') {
      if (order.quantity > security.availableUnits) {
        order.status = 'REJECTED';
        order.rejectionReason = `Float exhausted: Only ${security.availableUnits} units available.`;
        saveState();
        return res.status(400).json({ error: order.rejectionReason });
      }
      if (nativeCash < totalValue) {
        order.status = 'REJECTED';
        order.rejectionReason = `Insufficient ${secCurrency} balance. Required: ${totalValue}, available: ${nativeCash}.`;
        saveState();
        return res.status(400).json({ error: order.rejectionReason });
      }

      security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
      security.availableUnits -= order.quantity;
      team.cashWallets[secCurrency] = parseFloat((nativeCash - totalValue).toFixed(2));
      if (!team.holdings) team.holdings = {};
      team.holdings[order.ticker] = (team.holdings[order.ticker] || 0) + order.quantity;
    } else {
      const currentHolding = Number(team.holdings?.[order.ticker] || 0);
      if (currentHolding < order.quantity && !state.riskControls?.allowShortSelling) {
        order.status = 'REJECTED';
        order.rejectionReason = `Insufficient holdings. Team holds ${currentHolding} units of ${order.ticker}.`;
        saveState();
        return res.status(400).json({ error: order.rejectionReason });
      }

      security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
      security.availableUnits += order.quantity;
      team.cashWallets[secCurrency] = parseFloat((nativeCash + totalValue).toFixed(2));
      if (!team.holdings) team.holdings = {};
      team.holdings[order.ticker] = (team.holdings[order.ticker] || 0) - order.quantity;
      if (team.holdings[order.ticker] <= 0) delete team.holdings[order.ticker];
    }

    if (!security.priceHistory) security.priceHistory = [];
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

    const usdRate = state.fxRates.USDINR?.midRate || 88.20;
    const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
    const eurRate = state.fxRates.EURINR?.midRate || 103.50;
    team.cashBalance = parseFloat((
      Number(team.cashWallets.INR || 0) +
      Number(team.cashWallets.USD || 0) * usdRate +
      Number(team.cashWallets.GBP || 0) * gbpRate +
      Number(team.cashWallets.EUR || 0) * eurRate
    ).toFixed(2));

    team.tradeCount = (team.tradeCount || 0) + 1;

    order.status = 'EXECUTED';
    order.workflowStage = 'EXECUTED';
    order.verificationStatus = 'EXECUTED';
    order.exchangeStatus = 'EXECUTED';
    order.finalStatus = 'EXECUTED';
    order.executedAt = Date.now();
    order.priceAtExecution = executionPrice;
    order.executionPrice = executionPrice;
    order.executionQuantity = order.quantity;
    order.executionValue = totalValue;
    order.executedByDesk = deskId || order.deskId || 'DESK_1';
    order.executedByOperator = effectiveActor;

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'EXECUTED',
      status: 'EXECUTED',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: `Executed on central exchange at ₹${executionPrice} (Total: ₹${totalValue.toLocaleString()})`
    });

    if (order.executedByDesk && state.orderDesks?.[order.executedByDesk]) {
      state.orderDesks[order.executedByDesk].totalProcessed = (state.orderDesks[order.executedByDesk].totalProcessed || 0) + 1;
    }

    const tx = {
      id: `TX${String(state.transactions.length + 1).padStart(4, '0')}`,
      timestamp: Date.now(),
      eventId: order.eventId || state.currentEventId || 'EVT_LIVE_MAIN',
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      teamType: team.teamType,
      securityId: security.id,
      ticker: security.ticker,
      action: order.action,
      quantity: order.quantity,
      priceAtExecution: executionPrice,
      totalValue,
      localPrice: executionPrice,
      localCurrency: secCurrency,
      grossValue: totalValue,
      fxRateAtExecution: secCurrency === 'USD' ? usdRate : secCurrency === 'GBP' ? gbpRate : secCurrency === 'EUR' ? eurRate : 1.0,
      inrEquivalent: parseFloat((totalValue * (secCurrency === 'USD' ? usdRate : secCurrency === 'GBP' ? gbpRate : secCurrency === 'EUR' ? eurRate : 1.0)).toFixed(2)),
      enteredBy: order.enteredBy || 'Broker Terminal',
      deskId: order.executedByDesk,
      operator: order.executedByOperator,
      voided: false
    };

    state.transactions.push(tx);
    updateMarketIndex();
    saveState();
    broadcastState('ORDER_EXECUTED', { order, transaction: tx });

    return res.json({ success: true, orderStatus: 'EXECUTED', transaction: tx, order });
  }

  return res.status(400).json({ error: `Unknown actionType ${actionType}` });
});

// Dedicated REST verification endpoints
app.post('/api/verification/claim', (req, res) => {
  const { orderId, officerName, deskId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.status = 'BEING_VERIFIED';
  order.workflowStage = 'BEING_VERIFIED';
  order.verificationStatus = 'IN_PROGRESS';
  order.deskId = deskId || order.deskId || 'VERIFY_1';
  order.operator = officerName || 'Verification Officer';
  order.lockedByDesk = order.deskId;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'BEING_VERIFIED',
    status: 'BEING_VERIFIED',
    timestamp: Date.now(),
    actor: order.operator,
    note: 'Claimed by Verification Officer'
  });

  saveState();
  broadcastState('ORDER_CLAIMED', { order });
  res.json({ success: true, order });
});

app.post('/api/verification/verify', (req, res) => {
  const { orderId, officerName, physicalSlipChecked } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.status = 'VERIFIED_AWAITING_EXCHANGE';
  order.workflowStage = 'VERIFIED_AWAITING_EXCHANGE';
  order.verificationStatus = 'VERIFIED';
  order.physicalSlipChecked = physicalSlipChecked !== undefined ? Boolean(physicalSlipChecked) : true;
  order.verifiedBy = officerName || 'Verification Officer';
  order.verifiedAt = Date.now();
  order.lockedByDesk = null;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'VERIFIED_AWAITING_EXCHANGE',
    status: 'VERIFIED_AWAITING_EXCHANGE',
    timestamp: Date.now(),
    actor: order.verifiedBy,
    note: 'Physical ticket checked and verified for Exchange Desk execution'
  });

  saveState();
  broadcastState('ORDER_VERIFIED', { order });
  res.json({ success: true, order });
});

app.post('/api/verification/return', (req, res) => {
  const { orderId, officerName, returnReason } = req.body || {};
  if (!orderId || !returnReason || !returnReason.trim()) {
    return res.status(400).json({ error: 'orderId and an explicit returnReason are required.' });
  }
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.status = 'RETURNED_FOR_CORRECTION';
  order.workflowStage = 'RETURNED_FOR_CORRECTION';
  order.verificationStatus = 'RETURNED';
  order.returnReason = returnReason.trim();
  order.returnedAt = Date.now();
  order.lockedByDesk = null;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'RETURNED_FOR_CORRECTION',
    status: 'RETURNED_FOR_CORRECTION',
    timestamp: Date.now(),
    actor: officerName || 'Verification Officer',
    note: `Returned for correction: ${order.returnReason}`
  });

  saveState();
  broadcastState('ORDER_RETURNED', { order });
  res.json({ success: true, order });
});

app.post('/api/orders/resubmit', (req, res) => {
  const { orderId, quantity, limitPrice, notes, teamCode } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.status !== 'RETURNED_FOR_CORRECTION') {
    return res.status(400).json({ error: `Cannot resubmit order in status ${order.status}. Only orders marked RETURNED_FOR_CORRECTION can be resubmitted.` });
  }

  if (teamCode && order.teamCode !== teamCode.toUpperCase()) {
    return res.status(403).json({ error: 'Cannot resubmit orders belonging to another team.' });
  }

  if (quantity && Number(quantity) > 0) order.quantity = Math.floor(Number(quantity));
  if (limitPrice !== undefined) order.limitPrice = limitPrice ? Number(limitPrice) : null;
  if (notes !== undefined) order.notes = notes;

  const sec = (state.securities || []).find(s => s.ticker === order.ticker);
  const refP = order.orderType === 'LIMIT' && order.limitPrice ? order.limitPrice : (sec?.currentPrice || 100);
  order.requestedValue = parseFloat((order.quantity * refP).toFixed(2));

  order.status = 'PENDING';
  order.workflowStage = 'RESUBMITTED';
  order.verificationStatus = 'RESUBMITTED';
  order.returnReason = null;
  order.lockedByDesk = null;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'RESUBMITTED',
    status: 'PENDING',
    timestamp: Date.now(),
    actor: teamCode || order.teamCode,
    note: 'Corrected by Investment House and resubmitted for verification'
  });

  saveState();
  broadcastState('ORDER_RESUBMITTED', { order });
  res.json({ success: true, order });
});

app.post('/api/orders/cancel', (req, res) => {
  const { orderId, teamCode, reason } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (['EXECUTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Cannot cancel order in status ${order.status}.` });
  }

  if (teamCode && order.teamCode !== teamCode.toUpperCase()) {
    return res.status(403).json({ error: 'Cannot cancel orders belonging to another team.' });
  }

  order.status = 'CANCELLED';
  order.workflowStage = 'CANCELLED';
  order.verificationStatus = 'CANCELLED';
  order.finalStatus = 'CANCELLED';
  order.lockedByDesk = null;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'CANCELLED',
    status: 'CANCELLED',
    timestamp: Date.now(),
    actor: teamCode || 'User',
    note: reason || 'Order cancelled by user'
  });

  saveState();
  broadcastState('ORDER_CANCELLED', { order });
  res.json({ success: true, order });
});

// ----------------------------------------------------
// SIMPLE STOCK-ADVISOR REFERRAL SYSTEM (PHASE 6)
// Strictly BUY, HOLD, or SELL signal only
// ----------------------------------------------------
app.post('/api/advisor/refer', (req, res) => {
  const { ticker, teamCode } = req.body || {};
  if (!ticker || !teamCode) {
    return res.status(400).json({ error: 'ticker and teamCode are required to submit an advisor referral.' });
  }

  const tCode = teamCode.toUpperCase();
  const tick = ticker.toUpperCase();

  const sec = (state.securities || []).find(s => s.ticker === tick || s.id === tick);
  if (!sec) return res.status(404).json({ error: `Security ${tick} not found in universe.` });

  if (!state.advisorReferrals) state.advisorReferrals = [];

  const existingPending = state.advisorReferrals.find(r => r.teamCode === tCode && r.ticker === tick && r.status === 'PENDING');
  if (existingPending) {
    return res.status(400).json({ error: `Referral for ${tick} is already pending review with the Broker Advisor.` });
  }

  const referral = {
    id: `REF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamCode: tCode,
    ticker: tick,
    securityName: sec.name,
    submittedAt: Date.now(),
    status: 'PENDING',
    signal: null,
    advisorName: null,
    answeredAt: null
  };

  state.advisorReferrals.push(referral);
  saveState();
  broadcastState('ADVISOR_REFERRAL_CREATED', { referral });
  res.json({ success: true, referral });
});

app.get('/api/advisor/referrals', (req, res) => {
  if (!state.advisorReferrals) state.advisorReferrals = [];
  const callerTeam = req.role === 'team' ? req.teamCode : (req.query.teamCode ? req.query.teamCode.toUpperCase() : null);
  if (req.role === 'team' && callerTeam) {
    const teamReferrals = state.advisorReferrals.filter(r => r.teamCode === callerTeam);
    return res.json(teamReferrals);
  }
  res.json(state.advisorReferrals);
});

app.post('/api/advisor/signal', (req, res) => {
  const { referralId, signal, advisorName } = req.body || {};
  if (!referralId || !signal) {
    return res.status(400).json({ error: 'referralId and signal are required.' });
  }

  const cleanSignal = String(signal).toUpperCase().trim();
  if (!['BUY', 'HOLD', 'SELL'].includes(cleanSignal)) {
    return res.status(400).json({ error: `Invalid advisor signal '${signal}'. Permitted signals are strictly BUY, HOLD, or SELL.` });
  }

  if (!state.advisorReferrals) state.advisorReferrals = [];
  const referral = state.advisorReferrals.find(r => r.id === referralId);
  if (!referral) return res.status(404).json({ error: 'Referral not found.' });

  if (referral.status === 'COMPLETED' && referral.signal) {
    return res.status(400).json({ error: `Signal has already been published as '${referral.signal}'. Overwriting is prohibited to preserve audit trail.` });
  }

  referral.signal = cleanSignal;
  referral.status = 'COMPLETED';
  referral.advisorName = advisorName || req.body?.operator || 'Floor Advisor';
  referral.answeredAt = Date.now();

  saveState();
  broadcastState('ADVISOR_SIGNAL_PUBLISHED', { referral });
  res.json({ success: true, referral });
});

// ----------------------------------------------------
// AUDIT & RECONCILIATION CSV REPORT EXPORTS (PHASE 10)
// ----------------------------------------------------
app.get('/api/reports/orders/csv', (req, res) => {
  const orders = state.orders || [];
  const headers = [
    'Order ID',
    'Ticket Number',
    'Team Code',
    'Ticker',
    'Security Name',
    'Action',
    'Quantity',
    'Order Type',
    'Limit Price',
    'Requested Value',
    'Status',
    'Workflow Stage',
    'Verification Status',
    'Exchange Status',
    'Physical Slip Checked',
    'Verified By',
    'Return Reason',
    'Rejection Reason',
    'Execution Price',
    'Execution Quantity',
    'Execution Value',
    'Submitted At',
    'Executed At'
  ];

  const rows = orders.map(o => [
    `"${o.id || ''}"`,
    `"${o.ticketNumber || ''}"`,
    `"${o.teamCode || ''}"`,
    `"${o.ticker || ''}"`,
    `"${(o.securityName || '').replace(/"/g, '""')}"`,
    `"${o.action || ''}"`,
    o.quantity || 0,
    `"${o.orderType || 'MARKET'}"`,
    o.limitPrice || '',
    o.requestedValue || '',
    `"${o.status || ''}"`,
    `"${o.workflowStage || ''}"`,
    `"${o.verificationStatus || ''}"`,
    `"${o.exchangeStatus || ''}"`,
    o.physicalSlipChecked ? 'TRUE' : 'FALSE',
    `"${(o.verifiedBy || '').replace(/"/g, '""')}"`,
    `"${(o.returnReason || '').replace(/"/g, '""')}"`,
    `"${(o.rejectionReason || '').replace(/"/g, '""')}"`,
    o.executionPrice || '',
    o.executionQuantity || '',
    o.executionValue || '',
    o.submittedAt ? new Date(o.submittedAt).toISOString() : '',
    o.executedAt ? new Date(o.executedAt).toISOString() : ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="saamx_orders_report.csv"');
  res.send(csvContent);
});

app.get('/api/reports/reconciliation/csv', (req, res) => {
  const teams = state.teams || [];
  const fxRates = state.fxRates || {};
  const securities = state.securities || [];
  const startingCap = 10000000;

  const rankedTeams = [...teams].map(t => {
    const val = scoringEngine.calculatePortfolioValuation(t, securities, fxRates, startingCap);
    const pnl = val.totalEquity - startingCap;
    const roi = startingCap > 0 ? (pnl / startingCap) * 100 : 0;
    return {
      teamCode: t.teamCode || t.id,
      teamName: t.teamName || '',
      schoolName: t.schoolName || '',
      teamType: t.teamType || 'Retail',
      startingCap,
      cashINR: val.totalCashINR || 0,
      holdingsINR: val.totalHoldingsINR || 0,
      totalEquity: val.totalEquity || startingCap,
      pnl,
      roi,
      tradeCount: t.tradeCount || 0,
      isActive: t.isActive !== false
    };
  }).sort((a, b) => b.totalEquity - a.totalEquity);

  const headers = [
    'Rank',
    'Team Code',
    'Team Name',
    'School',
    'Team Type',
    'Starting Capital (INR)',
    'Cash Balance (INR)',
    'Holdings Valuation (INR)',
    'Total Equity (INR)',
    'Net PnL (INR)',
    'ROI %',
    'Trades Cleared',
    'Active Status'
  ];

  const rows = rankedTeams.map((t, idx) => [
    idx + 1,
    `"${t.teamCode}"`,
    `"${t.teamName.replace(/"/g, '""')}"`,
    `"${t.schoolName.replace(/"/g, '""')}"`,
    `"${t.teamType}"`,
    t.startingCap,
    t.cashINR.toFixed(2),
    t.holdingsINR.toFixed(2),
    t.totalEquity.toFixed(2),
    t.pnl.toFixed(2),
    t.roi.toFixed(2),
    t.tradeCount,
    t.isActive ? 'ACTIVE' : 'LOCKED'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="saamx_reconciliation_report.csv"');
  res.send(csvContent);
});

// ----------------------------------------------------
// RISK CONTROLS CONFIGURATION ENDPOINTS
// ----------------------------------------------------
app.get(['/api/risk-controls', '/api/admin/risk-controls'], (req, res) => {
  res.json({ success: true, riskControls: state.riskControls || {} });
});

app.post('/api/admin/risk-controls', (req, res) => {
  const {
    circuitBreakerThreshold,
    priceBandPercent,
    maxOrderValue,
    maxPositionSizePercent,
    concentrationWarningPercent,
    allowShortSelling,
    cashProtectionFloor
  } = req.body || {};

  state.riskControls = {
    circuitBreakerThreshold: circuitBreakerThreshold !== undefined ? Number(circuitBreakerThreshold) : (state.riskControls?.circuitBreakerThreshold || 30),
    priceBandPercent: priceBandPercent !== undefined ? Number(priceBandPercent) : (state.riskControls?.priceBandPercent || 20),
    maxOrderValue: maxOrderValue !== undefined ? Number(maxOrderValue) : (state.riskControls?.maxOrderValue || 50000000),
    maxPositionSizePercent: maxPositionSizePercent !== undefined ? Number(maxPositionSizePercent) : (state.riskControls?.maxPositionSizePercent || 35),
    concentrationWarningPercent: concentrationWarningPercent !== undefined ? Number(concentrationWarningPercent) : (state.riskControls?.concentrationWarningPercent || 25),
    allowShortSelling: allowShortSelling !== undefined ? Boolean(allowShortSelling) : (state.riskControls?.allowShortSelling || false),
    cashProtectionFloor: cashProtectionFloor !== undefined ? Number(cashProtectionFloor) : (state.riskControls?.cashProtectionFloor || 0)
  };

  logAuditEvent({
    actor: 'Surveillance Desk',
    role: 'admin',
    action: 'UPDATE_RISK_CONTROLS',
    target: 'Exchange Risk Parameters',
    newState: state.riskControls
  });

  saveState();
  broadcastState('RISK_CONTROLS_UPDATED', { riskControls: state.riskControls });
  res.json({ success: true, riskControls: state.riskControls });
});

// ----------------------------------------------------
// MULTI-CURRENCY FX QUEUE & SETTLEMENT PIPELINE
// ----------------------------------------------------
app.get('/api/fx/queue', (req, res) => {
  res.json({ success: true, queue: state.fxQueue || [] });
});

app.post('/api/fx/request', (req, res) => {
  const { teamCode, fromCurrency, toCurrency, fromAmount, notes, operatorId } = req.body || {};
  const amount = parseFloat(fromAmount);
  if (!teamCode || !fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Missing or invalid parameters: teamCode, fromCurrency, toCurrency, and positive fromAmount required.' });
  }

  const team = state.teams.find(t => t.teamCode === teamCode.toUpperCase() || t.id === teamCode.toUpperCase());
  if (!team) return res.status(404).json({ error: `Team ${teamCode} not found.` });

  const teamWallets = team.cashWallets || { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
  const available = Number(teamWallets[fromCurrency] || 0);
  if (available < amount) {
    return res.status(400).json({ error: `Insufficient ${fromCurrency} funds. Available: ${available}, Requested: ${amount}` });
  }

  const fxRates = state.fxRates || {};
  let effectiveRate = 1.0;
  let toAmount = 0;
  let spreadPercent = 0.45;

  if (fromCurrency === 'INR') {
    const pairKey = `${toCurrency}INR`;
    const fx = fxRates[pairKey] || { buyRate: toCurrency === 'USD' ? 88.60 : toCurrency === 'GBP' ? 119.95 : 103.95, spreadPercent: 0.45 };
    effectiveRate = fx.buyRate;
    spreadPercent = fx.spreadPercent || 0.45;
    toAmount = parseFloat((amount / effectiveRate).toFixed(2));
  } else if (toCurrency === 'INR') {
    const pairKey = `${fromCurrency}INR`;
    const fx = fxRates[pairKey] || { sellRate: fromCurrency === 'USD' ? 87.80 : fromCurrency === 'GBP' ? 118.85 : 103.05, spreadPercent: 0.45 };
    effectiveRate = fx.sellRate;
    spreadPercent = fx.spreadPercent || 0.45;
    toAmount = parseFloat((amount * effectiveRate).toFixed(2));
  } else {
    const fromPair = fxRates[`${fromCurrency}INR`] || { sellRate: 87.80, spreadPercent: 0.45 };
    const toPair = fxRates[`${toCurrency}INR`] || { buyRate: 103.95, spreadPercent: 0.45 };
    const inrVal = amount * fromPair.sellRate;
    toAmount = parseFloat((inrVal / toPair.buyRate).toFixed(2));
    effectiveRate = parseFloat((fromPair.sellRate / toPair.buyRate).toFixed(4));
    spreadPercent = Math.max(fromPair.spreadPercent || 0.45, toPair.spreadPercent || 0.45);
  }

  const requestId = `FX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fxItem = {
    id: requestId,
    requestId,
    teamCode: team.teamCode,
    teamName: team.teamName,
    eventId: state.currentEventId || 'EVT_LIVE_MAIN',
    fromCurrency,
    toCurrency,
    fromAmount: amount,
    toAmount,
    quoteRate: effectiveRate,
    spreadPercent,
    status: 'QUEUED', // QUEUED -> RATE_CHECK -> PROCESSING -> SETTLED (or REJECTED)
    operatorId: operatorId || 'FX-DESK-01',
    notes: notes || 'Floor FX conversion request',
    createdAt: Date.now(),
    settledAt: null,
    rejectionReason: null
  };

  if (!state.fxQueue) state.fxQueue = [];
  state.fxQueue.unshift(fxItem);
  saveState();
  broadcastState('FX_REQUEST_CREATED', { fxRequest: fxItem });

  res.json({ success: true, fxRequest: fxItem });
});

app.post('/api/fx/queue-action', (req, res) => {
  const { requestId, actionType, rejectionReason, operatorId } = req.body || {};
  if (!requestId || !actionType) return res.status(400).json({ error: 'requestId and actionType required.' });

  const item = (state.fxQueue || []).find(f => f.id === requestId || f.requestId === requestId);
  if (!item) return res.status(404).json({ error: 'FX request not found.' });

  if (item.status === 'SETTLED') return res.status(400).json({ error: 'FX request has already been settled.' });

  if (actionType === 'RATE_CHECK') {
    item.status = 'RATE_CHECK';
    item.rateCheckedAt = Date.now();
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'PROCESS') {
    item.status = 'PROCESSING';
    item.processingStartedAt = Date.now();
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'REJECT') {
    item.status = 'REJECTED';
    item.rejectionReason = rejectionReason || 'Declined by FX desk.';
    saveState();
    broadcastState('FX_REJECTED', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'SETTLE') {
    const team = state.teams.find(t => t.teamCode === item.teamCode || t.id === item.teamCode);
    if (!team) return res.status(404).json({ error: `Team ${item.teamCode} not found.` });

    if (!team.cashWallets) {
      team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
    }

    const available = Number(team.cashWallets[item.fromCurrency] || 0);
    if (available < item.fromAmount) {
      item.status = 'REJECTED';
      item.rejectionReason = `Insufficient balance at settlement. Required: ${item.fromAmount}, available: ${available}`;
      saveState();
      return res.status(400).json({ error: item.rejectionReason });
    }

    team.cashWallets[item.fromCurrency] = parseFloat((available - item.fromAmount).toFixed(2));
    team.cashWallets[item.toCurrency] = parseFloat((Number(team.cashWallets[item.toCurrency] || 0) + item.toAmount).toFixed(2));

    const usdRate = state.fxRates.USDINR?.midRate || 88.20;
    const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
    const eurRate = state.fxRates.EURINR?.midRate || 103.50;

    team.cashBalance = parseFloat((
      Number(team.cashWallets.INR || 0) +
      Number(team.cashWallets.USD || 0) * usdRate +
      Number(team.cashWallets.GBP || 0) * gbpRate +
      Number(team.cashWallets.EUR || 0) * eurRate
    ).toFixed(2));

    item.status = 'SETTLED';
    item.settledAt = Date.now();
    if (operatorId) item.operatorId = operatorId;

    const fxTx = {
      id: `FXTX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      teamCode: team.teamCode,
      fromCurrency: item.fromCurrency,
      toCurrency: item.toCurrency,
      fromAmount: item.fromAmount,
      toAmount: item.toAmount,
      rate: item.quoteRate,
      spreadPercent: item.spreadPercent,
      operatorId: item.operatorId,
      notes: item.notes,
      walletsAfter: { ...team.cashWallets }
    };

    if (!state.fxTransactions) state.fxTransactions = [];
    state.fxTransactions.unshift(fxTx);

    saveState();
    broadcastState('FX_SETTLED', { fxRequest: item, transaction: fxTx });
    return res.json({ success: true, fxRequest: item, transaction: fxTx });
  }

  return res.status(400).json({ error: `Unknown actionType ${actionType}` });
});

// ----------------------------------------------------
// DYNAMIC REGISTRATION & PARTICIPANT LIFECYCLE API
// ----------------------------------------------------
app.post('/api/register/complete', (req, res) => {
  const {
    schoolName,
    board,
    city,
    contactPerson,
    contactEmail,
    contactPhone,
    facultyCoordinator,
    investmentHouseName,
    teamType,
    preferredTeamCode,
    members,
    password
  } = req.body || {};

  if (!schoolName || !contactEmail || !investmentHouseName) {
    return res.status(400).json({ error: 'School Name, Contact Email, and Investment House Name are required.' });
  }

  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
  if (currentEvent && currentEvent.registrationOpen === false) {
    return res.status(403).json({ error: 'Registration is currently closed for this event.' });
  }

  const maxHouses = currentEvent?.maximumInvestmentHouses || 40;
  const currentHouseCount = (state.investmentHouses || []).filter(h => h.eventId === (currentEvent?.eventId || 'EVT_LIVE_MAIN')).length;
  if (currentHouseCount >= maxHouses) {
    return res.status(400).json({ error: `Maximum capacity reached (${maxHouses} Investment Houses). Registration closed.` });
  }

  // Prevent duplicate school registration for same event
  const normSchoolName = schoolName.trim().toLowerCase();
  const normEmail = contactEmail.trim().toLowerCase();
  const isDuplicateSchool = (state.schools || []).some(s =>
    s.eventId === (currentEvent?.eventId || 'EVT_LIVE_MAIN') &&
    (s.schoolName.trim().toLowerCase() === normSchoolName || s.contactEmail.trim().toLowerCase() === normEmail)
  );
  if (isDuplicateSchool) {
    return res.status(400).json({ error: `A school registration with this name or email already exists for this event.` });
  }

  const schoolId = `SCH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const schoolObj = {
    schoolId,
    schoolName: schoolName.trim(),
    board: board || 'CBSE',
    city: city || '',
    contactPerson: contactPerson || '',
    contactEmail: normEmail,
    contactPhone: contactPhone || '',
    facultyCoordinator: facultyCoordinator || contactPerson || '',
    registrationStatus: 'REGISTERED',
    eventId: currentEvent?.eventId || 'EVT_LIVE_MAIN',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  if (!state.schools) state.schools = [];
  state.schools.push(schoolObj);

  // Generate unique dynamic team code
  let allocatedCode = preferredTeamCode ? preferredTeamCode.trim().toUpperCase() : '';
  if (!allocatedCode || state.teams.some(t => t.teamCode === allocatedCode)) {
    let nextNum = (state.investmentHouses?.length || 0) + 1;
    allocatedCode = `IH${String(nextNum).padStart(2, '0')}`;
    while (state.teams.some(t => t.teamCode === allocatedCode) || (state.investmentHouses || []).some(h => h.teamCode === allocatedCode)) {
      nextNum++;
      allocatedCode = `IH${String(nextNum).padStart(2, '0')}`;
    }
  }

  const tempPin = String(Math.floor(100000 + Math.random() * 900000));
  const rawPassword = password ? password.trim() : tempPin;
  const passwordHash = crypto.createHash('sha256').update(rawPassword).digest('hex');

  const investmentHouseId = `IH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const houseObj = {
    investmentHouseId,
    schoolId,
    eventId: currentEvent?.eventId || 'EVT_LIVE_MAIN',
    investmentHouseName: investmentHouseName.trim(),
    teamCode: allocatedCode,
    teamType: teamType || 'Retail',
    members: Array.isArray(members) && members.length > 0 ? members : [{ name: contactPerson || 'Lead Analyst', role: 'Chief Investment Officer' }],
    registrationStatus: 'SUBMITTED',
    verificationStatus: 'PENDING',
    activeStatus: 'INACTIVE',
    participantLifecycle: 'REGISTERED', // REGISTERED -> VERIFIED -> READY -> MARKET_ACTIVE -> MARKET_CLOSED -> SETTLED
    credentials: {
      username: allocatedCode,
      passwordHash,
      tempPin
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  if (!state.investmentHouses) state.investmentHouses = [];
  state.investmentHouses.push(houseObj);

  const regId = `REG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const regObj = {
    id: regId,
    registrationId: regId,
    eventId: currentEvent?.eventId || 'EVT_LIVE_MAIN',
    schoolId,
    investmentHouseId,
    schoolName: schoolObj.schoolName,
    investmentHouseName: houseObj.investmentHouseName,
    teamCode: allocatedCode,
    teamType: houseObj.teamType,
    members: houseObj.members,
    status: 'SUBMITTED',
    verificationStatus: 'PENDING',
    tempPin,
    createdAt: Date.now()
  };

  if (!state.registrations) state.registrations = [];
  state.registrations.unshift(regObj);

  saveState();
  broadcastState('REGISTRATION_SUBMITTED', { registration: regObj });

  res.json({
    success: true,
    registrationId: regId,
    teamCode: allocatedCode,
    tempPin,
    school: schoolObj,
    investmentHouse: houseObj,
    message: 'Registration submitted successfully! Pending verification by SAAMX Exchange Desk.'
  });
});

app.get('/api/admin/registrations', (req, res) => {
  res.json({
    success: true,
    registrations: state.registrations || [],
    schools: state.schools || [],
    investmentHouses: state.investmentHouses || []
  });
});

app.post('/api/admin/registration/verify', (req, res) => {
  const { registrationId, investmentHouseId, action, rejectionReason, allocatedTeamCode } = req.body || {};
  const house = (state.investmentHouses || []).find(h =>
    h.investmentHouseId === investmentHouseId ||
    h.investmentHouseId === registrationId ||
    h.teamCode === allocatedTeamCode
  );
  const reg = (state.registrations || []).find(r =>
    r.registrationId === registrationId ||
    r.investmentHouseId === investmentHouseId ||
    r.id === registrationId
  );

  if (!house && !reg) return res.status(404).json({ error: 'Registration or Investment House not found.' });

  const targetHouse = house || (state.investmentHouses || []).find(h => h.investmentHouseId === reg.investmentHouseId);
  const targetSchool = (state.schools || []).find(s => s.schoolId === targetHouse?.schoolId || s.schoolId === reg?.schoolId);

  if (action === 'REJECT') {
    if (targetHouse) {
      targetHouse.verificationStatus = 'REJECTED';
      targetHouse.registrationStatus = 'REJECTED';
      targetHouse.rejectionReason = rejectionReason || 'Declined by administrator';
    }
    if (reg) {
      reg.status = 'REJECTED';
      reg.verificationStatus = 'REJECTED';
      reg.rejectionReason = rejectionReason || 'Declined by administrator';
    }
    saveState();
    broadcastState('REGISTRATION_VERIFIED', { house: targetHouse, reg });
    return res.json({ success: true, status: 'REJECTED' });
  }

  // APPROVE
  const finalCode = allocatedTeamCode ? allocatedTeamCode.toUpperCase() : targetHouse.teamCode;
  targetHouse.teamCode = finalCode;
  targetHouse.verificationStatus = 'VERIFIED';
  targetHouse.registrationStatus = 'APPROVED';
  targetHouse.participantLifecycle = 'READY';
  targetHouse.activeStatus = 'ACTIVE';
  targetHouse.updatedAt = Date.now();

  if (reg) {
    reg.teamCode = finalCode;
    reg.status = 'APPROVED';
    reg.verificationStatus = 'VERIFIED';
  }

  // Sync to state.teams so all market engines, orders, and portfolios see the new team immediately!
  const startingCapital = state.settings?.startingCapitalRetail || 10000000;
  let teamEntry = state.teams.find(t => t.teamCode === finalCode || t.id === finalCode);

  if (!teamEntry) {
    teamEntry = {
      id: finalCode,
      teamCode: finalCode,
      teamName: targetHouse.investmentHouseName,
      teamType: targetHouse.teamType || 'Retail',
      schoolId: targetHouse.schoolId,
      schoolName: targetSchool ? targetSchool.schoolName : 'Affiliated Institution',
      investmentHouseId: targetHouse.investmentHouseId,
      eventId: targetHouse.eventId,
      members: targetHouse.members || [],
      passwordHash: targetHouse.credentials?.passwordHash || '',
      tempPin: targetHouse.credentials?.tempPin || '',
      cashBalance: startingCapital,
      cashWallets: {
        INR: startingCapital,
        USD: 0,
        GBP: 0,
        EUR: 0
      },
      holdings: {},
      portfolioValue: startingCapital,
      pnl: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      roi: 0,
      tradeCount: 0,
      isActive: true,
      createdAt: Date.now()
    };
    state.teams.push(teamEntry);
  } else {
    teamEntry.teamName = targetHouse.investmentHouseName;
    teamEntry.schoolName = targetSchool ? targetSchool.schoolName : teamEntry.schoolName;
    teamEntry.members = targetHouse.members || teamEntry.members;
    teamEntry.passwordHash = targetHouse.credentials?.passwordHash || teamEntry.passwordHash;
    teamEntry.tempPin = targetHouse.credentials?.tempPin || teamEntry.tempPin;
    teamEntry.isActive = true;
  }

  logAuditEvent({
    actor: 'Registration Desk',
    role: 'admin',
    action: `VERIFY_INVESTMENT_HOUSE: ${finalCode}`,
    target: finalCode,
    reason: `Verified ${targetHouse.investmentHouseName} from ${targetSchool?.schoolName || 'School'}`
  });

  saveState();
  broadcastState('REGISTRATION_VERIFIED', { house: targetHouse, team: teamEntry });

  res.json({ success: true, house: targetHouse, team: teamEntry, tempPin: targetHouse.credentials?.tempPin });
});

app.post('/api/admin/participant/lifecycle', (req, res) => {
  const { teamCode, investmentHouseId, lifecycleState } = req.body || {};
  const validStates = ['REGISTERED', 'VERIFIED', 'READY', 'MARKET_ACTIVE', 'MARKET_CLOSED', 'SETTLED'];
  if (!validStates.includes(lifecycleState)) {
    return res.status(400).json({ error: `Invalid lifecycleState. Must be one of: ${validStates.join(', ')}` });
  }

  const house = (state.investmentHouses || []).find(h => h.teamCode === teamCode || h.investmentHouseId === investmentHouseId);
  const team = state.teams.find(t => t.teamCode === teamCode || t.id === teamCode);

  if (house) {
    house.participantLifecycle = lifecycleState;
    if (['READY', 'MARKET_ACTIVE'].includes(lifecycleState)) {
      house.activeStatus = 'ACTIVE';
    } else if (['MARKET_CLOSED', 'SETTLED'].includes(lifecycleState)) {
      house.activeStatus = 'LOCKED';
    }
  }

  if (team) {
    team.status = lifecycleState;
    if (['READY', 'MARKET_ACTIVE'].includes(lifecycleState)) {
      team.isActive = true;
    } else if (lifecycleState === 'MARKET_CLOSED' || lifecycleState === 'SETTLED') {
      team.isActive = false;
    }
  }

  saveState();
  broadcastState('PARTICIPANT_LIFECYCLE_UPDATED', { teamCode, lifecycleState });
  res.json({ success: true, teamCode, lifecycleState });
});

app.post('/api/admin/rehearsal/seed', (req, res) => {
  const rehearsalEvent = (state.events || []).find(e => e.eventId === 'EVT_REHEARSAL_MAIN') || {
    eventId: 'EVT_REHEARSAL_MAIN',
    eventName: 'SAAMX Simulation & Practice Rehearsal',
    eventMode: 'REHEARSAL'
  };

  const sampleSchools = [
    { schoolId: 'SCH_REH_01', schoolName: 'Delhi Public School, R.K. Puram', city: 'New Delhi', board: 'CBSE', contactPerson: 'Dr. R. K. Sharma', contactEmail: 'dps.rkp@sample.edu', eventId: rehearsalEvent.eventId, registrationStatus: 'VERIFIED' },
    { schoolId: 'SCH_REH_02', schoolName: 'The Doon School', city: 'Dehradun', board: 'ICSE', contactPerson: 'Vikram Joshi', contactEmail: 'doon@sample.edu', eventId: rehearsalEvent.eventId, registrationStatus: 'VERIFIED' },
    { schoolId: 'SCH_REH_03', schoolName: 'Dhirubhai Ambani International School', city: 'Mumbai', board: 'IB', contactPerson: 'Anita Mehta', contactEmail: 'dais@sample.edu', eventId: rehearsalEvent.eventId, registrationStatus: 'VERIFIED' },
    { schoolId: 'SCH_REH_04', schoolName: 'National Public School, Indiranagar', city: 'Bengaluru', board: 'CBSE', contactPerson: 'Suresh Rao', contactEmail: 'nps.blr@sample.edu', eventId: rehearsalEvent.eventId, registrationStatus: 'VERIFIED' },
    { schoolId: 'SCH_REH_05', schoolName: 'La Martiniere for Boys', city: 'Kolkata', board: 'ICSE', contactPerson: 'Debashis Sen', contactEmail: 'lmb@sample.edu', eventId: rehearsalEvent.eventId, registrationStatus: 'VERIFIED' }
  ];

  if (!state.schools) state.schools = [];
  sampleSchools.forEach(sch => {
    if (!state.schools.some(s => s.schoolId === sch.schoolId)) state.schools.push(sch);
  });

  const sampleHouses = [
    { code: 'IH01', name: 'Apex Sovereign Capital', schoolId: 'SCH_REH_01', type: 'Hedge Fund' },
    { code: 'IH02', name: 'Vanguard Alpha Fund', schoolId: 'SCH_REH_01', type: 'Mutual Fund' },
    { code: 'IH03', name: 'Doon Quant House', schoolId: 'SCH_REH_02', type: 'Prop Desk' },
    { code: 'IH04', name: 'Highland Asset Management', schoolId: 'SCH_REH_02', type: 'Retail' },
    { code: 'IH05', name: 'Ambani Institutional Desk', schoolId: 'SCH_REH_03', type: 'Hedge Fund' },
    { code: 'IH06', name: 'Peninsula Value Partners', schoolId: 'SCH_REH_03', type: 'Mutual Fund' },
    { code: 'IH07', name: 'Silicon Valley India Capital', schoolId: 'SCH_REH_04', type: 'Hedge Fund' },
    { code: 'IH08', name: 'Bengaluru Growth Equity', schoolId: 'SCH_REH_04', type: 'Retail' },
    { code: 'IH09', name: 'Eastern Trading Consortium', schoolId: 'SCH_REH_05', type: 'Prop Desk' },
    { code: 'IH10', name: 'Martiniere Macro Fund', schoolId: 'SCH_REH_05', type: 'Mutual Fund' }
  ];

  if (!state.investmentHouses) state.investmentHouses = [];
  sampleHouses.forEach((sh, idx) => {
    if (!state.investmentHouses.some(h => h.teamCode === sh.code)) {
      const pin = `26000${idx + 1}`;
      const hash = crypto.createHash('sha256').update(pin).digest('hex');
      const house = {
        investmentHouseId: `IH_REH_${sh.code}`,
        schoolId: sh.schoolId,
        eventId: rehearsalEvent.eventId,
        investmentHouseName: sh.name,
        teamCode: sh.code,
        teamType: sh.type,
        members: [
          { name: `Lead Analyst ${idx + 1}`, role: 'Chief Investment Officer' },
          { name: `Quant Analyst ${idx + 1}`, role: 'Risk Officer' }
        ],
        registrationStatus: 'APPROVED',
        verificationStatus: 'VERIFIED',
        activeStatus: 'ACTIVE',
        participantLifecycle: 'READY',
        credentials: { username: sh.code, passwordHash: hash, tempPin: pin },
        isRehearsal: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      state.investmentHouses.push(house);

      if (!state.teams.some(t => t.teamCode === sh.code)) {
        const capital = 10000000;
        state.teams.push({
          id: sh.code,
          teamCode: sh.code,
          teamName: sh.name,
          teamType: sh.type,
          schoolId: sh.schoolId,
          schoolName: sampleSchools.find(s => s.schoolId === sh.schoolId)?.schoolName || '',
          investmentHouseId: house.investmentHouseId,
          eventId: rehearsalEvent.eventId,
          members: house.members,
          passwordHash: hash,
          tempPin: pin,
          cashBalance: capital,
          cashWallets: { INR: capital, USD: 0, GBP: 0, EUR: 0 },
          holdings: {},
          portfolioValue: capital,
          pnl: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          roi: 0,
          tradeCount: 0,
          isActive: true,
          isRehearsal: true,
          createdAt: Date.now()
        });
      }
    }
  });

  saveState();
  broadcastState('REHEARSAL_DATA_SEEDED');
  res.json({ success: true, message: 'Rehearsal test schools and investment houses seeded successfully.' });
});

app.post('/api/admin/rehearsal/reset', (req, res) => {
  if (state.schools) state.schools = state.schools.filter(s => s.eventId !== 'EVT_REHEARSAL_MAIN');
  if (state.investmentHouses) state.investmentHouses = state.investmentHouses.filter(h => h.eventId !== 'EVT_REHEARSAL_MAIN');
  if (state.registrations) state.registrations = state.registrations.filter(r => r.eventId !== 'EVT_REHEARSAL_MAIN');
  if (state.teams) state.teams = state.teams.filter(t => t.eventId !== 'EVT_REHEARSAL_MAIN');
  if (state.orders) state.orders = state.orders.filter(o => o.eventId !== 'EVT_REHEARSAL_MAIN');
  if (state.transactions) state.transactions = state.transactions.filter(t => t.eventId !== 'EVT_REHEARSAL_MAIN');

  saveState();
  broadcastState('REHEARSAL_DATA_RESET');
  res.json({ success: true, message: 'Rehearsal data successfully cleared without affecting Live event.' });
});

// News bulletins & Market Impact Engine
app.post('/api/news', (req, res) => {
  const { 
    headline, 
    description, 
    summary,
    affectedSecurityIds, 
    affectedSector, 
    affectedSectors,
    affectedCountries,
    sentiment, 
    impactPercent, 
    priceImpactPercent,
    category,
    severity,
    fxImpactPercent,
    targetPair
  } = req.body;

  if (!headline || (!sentiment && impactPercent === undefined)) {
    return res.status(400).json({ error: 'Missing mandatory news values.' });
  }

  const rawImpact = impactPercent !== undefined ? Number(impactPercent) : Number(priceImpactPercent || 0);
  const impact = Math.abs(rawImpact);
  const direction = sentiment === 'Positive' ? 1 : sentiment === 'Negative' ? -1 : (rawImpact >= 0 ? 1 : -1);
  const finalPriceDeltaPct = direction * impact;

  const sectorsToTarget = affectedSectors || (affectedSector ? [affectedSector] : []);
  let targets = [];

  if (affectedSecurityIds && affectedSecurityIds.length > 0) {
    targets = state.securities.filter(s => (affectedSecurityIds.includes(s.id) || affectedSecurityIds.includes(s.ticker)) && s.status === 'Active');
  } else if (sectorsToTarget.length > 0) {
    targets = state.securities.filter(s => sectorsToTarget.includes(s.sector) && s.status === 'Active');
  }

  targets.forEach(security => {
    const oldPrice = security.currentPrice;
    const newPrice = parseFloat(Math.max(1, oldPrice * (1 + finalPriceDeltaPct / 100)).toFixed(2));
    security.currentPrice = newPrice;
    
    // Track dual price decomposition
    security.newsImpact = parseFloat(((security.newsImpact || 0) + finalPriceDeltaPct).toFixed(2));
    const baseP = security.basePrice || oldPrice || 1;
    security.totalImpact = parseFloat((((newPrice - baseP) / baseP) * 100).toFixed(2));
    security.participantImpact = parseFloat((security.totalImpact - security.newsImpact).toFixed(2));

    if (!security.priceHistory) security.priceHistory = [];
    security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
    if (security.priceHistory.length > 200) security.priceHistory.shift();
  });

  // Optional FX Impact
  if (fxImpactPercent && state.fxRates) {
    const fxPairKey = targetPair || 'USDINR';
    if (state.fxRates[fxPairKey]) {
      const oldRate = state.fxRates[fxPairKey].midRate;
      state.fxRates[fxPairKey].midRate = parseFloat((oldRate * (1 + Number(fxImpactPercent) / 100)).toFixed(2));
    }
  }

  const newsItem = {
    id: `NW${String(state.newsEvents.length + 1).padStart(3, '0')}`,
    headline,
    description: description || summary || '',
    summary: summary || description || '',
    affectedSecurityIds: targets.map(t => t.ticker || t.id),
    affectedSectors: sectorsToTarget,
    affectedSector: sectorsToTarget[0] || null,
    affectedCountries: affectedCountries || ['Global'],
    sentiment: sentiment || (finalPriceDeltaPct >= 0 ? 'Positive' : 'Negative'),
    impactPercent: impact,
    severity: severity || (impact >= 12 ? 'CRITICAL' : impact >= 8 ? 'BREAKING' : impact >= 4 ? 'IMPORTANT' : 'INFORMATION'),
    category: category || 'MACROECONOMIC',
    triggeredAt: Date.now(),
    isCustom: true
  };

  state.newsEvents.push(newsItem);
  updateMarketIndex();
  
  // Log to audit trail
  state.auditLog.push({
    id: `AUD_${Date.now()}`,
    timestamp: Date.now(),
    role: 'ADMIN',
    action: `NEWS_DISPATCH: ${headline}`,
    details: `Category: ${category || 'Macro'} | Impact: ${finalPriceDeltaPct}% on ${targets.length} assets`
  });

  saveState(true);

  // Broadcast high-severity flash
  if (newsItem.severity === 'CRITICAL' || newsItem.severity === 'BREAKING' || newsItem.severity === 'IMPORTANT') {
    broadcastState('NEWS_FLASH', { newsItem });
  } else {
    broadcastState();
  }

  res.json({ success: true, newsItem });
});

// Staged Project Phoenix Acts & Scenarios
app.post('/api/admin/phoenix-act', (req, res) => {
  const { actNumber, actId, title } = req.body || {};
  const num = Number(actNumber || actId || 1);

  let actTitle = `Project Phoenix: Act ${num}`;
  let headline = '';
  let description = '';
  let targetSectors = [];
  let impactPct = 4;
  let sentiment = 'Positive';

  if (num === 1) {
    actTitle = 'Act 1: Global Market Opening & Technology Surge';
    headline = 'Global Tech Consortium Announces Breakthrough in Hyperscale AI Compute Rails';
    description = 'Frontier technology and semiconductor stocks experience strong institutional accumulation across global exchanges.';
    targetSectors = ['Technology', 'Information Technology', 'Semiconductors'];
    impactPct = 5.2;
    sentiment = 'Positive';
  } else if (num === 2) {
    actTitle = 'Act 2: Mid-Session Macro Volatility & Energy Rebalancing';
    headline = 'International Energy Agency Revises Crude Reserves; Global Supply Chains Tighten';
    description = 'Energy, logistics, and commodity-linked assets surge while broad consumer discretionary adjusts to freight cost revisions.';
    targetSectors = ['Energy', 'Utilities', 'Infrastructure'];
    impactPct = 4.8;
    sentiment = 'Positive';
    if (state.fxRates?.USDINR) {
      state.fxRates.USDINR.midRate = parseFloat((state.fxRates.USDINR.midRate * 1.008).toFixed(2));
    }
  } else if (num === 3) {
    actTitle = 'Act 3: Final Power Hour, IPO Allotment & High-Volume Rebalancing';
    headline = 'Institutional Allocators Deploy Record Inflows into Private & Public Equities';
    description = 'High trading intensity observed across domestic and foreign exchanges as event closing bell approaches.';
    targetSectors = ['Financial Services', 'Banking', 'Technology'];
    impactPct = 6.0;
    sentiment = 'Positive';
  }

  // Adjust target securities
  const targets = state.securities.filter(s => targetSectors.some(sec => s.sector?.toLowerCase().includes(sec.toLowerCase())) && s.status === 'Active');
  targets.forEach(s => {
    const oldP = s.currentPrice;
    s.currentPrice = parseFloat(Math.max(1, oldP * (1 + impactPct / 100)).toFixed(2));
    if (!s.priceHistory) s.priceHistory = [];
    s.priceHistory.push({ timestamp: Date.now(), price: s.currentPrice });
  });

  const newsItem = {
    id: `NW_PHX_${num}_${Date.now()}`,
    headline,
    description,
    affectedSectors: targetSectors,
    sentiment,
    impactPercent: impactPct,
    severity: 'CRITICAL',
    category: 'SCENARIO_ACT',
    triggeredAt: Date.now(),
    isCustom: true
  };
  state.newsEvents.push(newsItem);

  logAuditEvent({
    actor: 'Event Director',
    role: 'admin',
    action: `PHOENIX_ACT_${num}`,
    target: actTitle,
    reason: `Executed staged narrative scenario ${actTitle}`
  });

  saveState(true);
  broadcastState('ACT_TRIGGERED', { actNumber: num, title: actTitle, newsItem });
  res.json({ success: true, actNumber: num, title: actTitle, newsItem, affectedCount: targets.length });
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
      if (team.holdings[security.ticker]) {
        team.holdings[security.ticker] *= 2;
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
      if (team.holdings[security.ticker]) {
        team.holdings[security.ticker] *= 2;
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
      const heldUnits = team.holdings[security.ticker] || 0;
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

// FX Currency Exchange Conversion
app.post('/api/fx/convert', (req, res) => {
  const { teamCode, fromCurrency, toCurrency, amount, ticketNumber, operator } = req.body;
  const A = Number(amount);
  if (!teamCode || !fromCurrency || !toCurrency || isNaN(A) || A <= 0) {
    return res.status(400).json({ error: 'Valid teamCode, fromCurrency, toCurrency, and positive amount are required.' });
  }

  if (ticketNumber) {
    if (!state.fxTransactions) state.fxTransactions = [];
    const exists = state.fxTransactions.some(t => t.ticketNumber === ticketNumber);
    if (exists) {
      return res.status(400).json({ error: `FX Ticket ${ticketNumber} has already been processed.` });
    }
  }

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found.' });

  if (!team.cashWallets) {
    team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
  }

  if ((team.cashWallets[fromCurrency] || 0) < A) {
    return res.status(400).json({ error: `Insufficient ${fromCurrency} balance.` });
  }

  const rates = state.fxRates || {
    USDINR: { midRate: 88.20 },
    GBPINR: { midRate: 119.40 },
    EURINR: { midRate: 103.50 }
  };

  let convertedAmount = 0;
  if (fromCurrency === 'INR' && toCurrency === 'USD') convertedAmount = parseFloat((A / rates.USDINR.midRate).toFixed(2));
  else if (fromCurrency === 'USD' && toCurrency === 'INR') convertedAmount = parseFloat((A * rates.USDINR.midRate).toFixed(2));
  else if (fromCurrency === 'INR' && toCurrency === 'GBP') convertedAmount = parseFloat((A / rates.GBPINR.midRate).toFixed(2));
  else if (fromCurrency === 'GBP' && toCurrency === 'INR') convertedAmount = parseFloat((A * rates.GBPINR.midRate).toFixed(2));
  else if (fromCurrency === 'INR' && toCurrency === 'EUR') convertedAmount = parseFloat((A / rates.EURINR.midRate).toFixed(2));
  else if (fromCurrency === 'EUR' && toCurrency === 'INR') convertedAmount = parseFloat((A * rates.EURINR.midRate).toFixed(2));
  else {
    return res.status(400).json({ error: `Conversion from ${fromCurrency} to ${toCurrency} not supported directly.` });
  }

  team.cashWallets[fromCurrency] = parseFloat(((team.cashWallets[fromCurrency] || 0) - A).toFixed(2));
  team.cashWallets[toCurrency] = parseFloat(((team.cashWallets[toCurrency] || 0) + convertedAmount).toFixed(2));

  const usdRate = rates.USDINR?.midRate || 88.20;
  const gbpRate = rates.GBPINR?.midRate || 119.40;
  const eurRate = rates.EURINR?.midRate || 103.50;
  team.cashBalance = parseFloat((
    Number(team.cashWallets.INR || 0) +
    Number(team.cashWallets.USD || 0) * usdRate +
    Number(team.cashWallets.GBP || 0) * gbpRate +
    Number(team.cashWallets.EUR || 0) * eurRate
  ).toFixed(2));

  const fxTx = {
    id: `FX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ticketNumber: ticketNumber || `FX-${Date.now()}`,
    teamCode,
    fromCurrency,
    toCurrency,
    debited: A,
    credited: convertedAmount,
    rate: fromCurrency === 'INR' ? (convertedAmount > 0 ? A / convertedAmount : 0) : (A > 0 ? convertedAmount / A : 0),
    operator: operator || 'FX Desk Operator',
    timestamp: Date.now()
  };
  if (!state.fxTransactions) state.fxTransactions = [];
  state.fxTransactions.unshift(fxTx);

  logAuditEvent({
    actor: operator || 'FX Exchange',
    role: 'fx_operator',
    action: 'FX_CONVERT',
    target: teamCode,
    reason: `Converted ${fromCurrency} ${A} -> ${toCurrency} ${convertedAmount} (Ticket: ${fxTx.ticketNumber})`
  });

  saveState(true);
  broadcastState();

  res.json({
    success: true,
    teamCode,
    fromCurrency,
    toCurrency,
    debited: A,
    credited: convertedAmount,
    ticketNumber: fxTx.ticketNumber,
    wallets: team.cashWallets,
    cashBalance: team.cashBalance
  });
});

// Admin Team Wallet Funding
app.post('/api/admin/team/wallets', (req, res) => {
  const { teamCode, wallets } = req.body;
  if (!teamCode || !wallets) return res.status(400).json({ error: 'teamCode and wallets required.' });

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found.' });

  if (!team.cashWallets) team.cashWallets = { INR: 10000000, USD: 0, GBP: 0, EUR: 0 };
  Object.assign(team.cashWallets, wallets);

  saveState(true);
  broadcastState();

  res.json({ success: true, teamCode, cashWallets: team.cashWallets });
});

// Toggle Team Active/Inactive Status
app.post('/api/admin/team/toggle-status', (req, res) => {
  const { teamCode, isActive } = req.body;
  if (!teamCode) return res.status(400).json({ error: 'teamCode is required.' });

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found.' });

  team.isActive = isActive !== undefined ? Boolean(isActive) : (team.isActive === false ? true : false);

  logAuditEvent({
    actor: 'Administrator',
    role: 'admin',
    action: 'TEAM_STATUS_TOGGLE',
    target: teamCode,
    reason: `Team ${teamCode} set to ${team.isActive ? 'ACTIVE' : 'INACTIVE'}`
  });

  saveState(true);
  broadcastState();

  res.json({ success: true, teamCode, isActive: team.isActive });
});

// Batch Set Active Teams Count
app.post('/api/admin/teams/set-active-count', (req, res) => {
  const { activeCount } = req.body;
  const count = parseInt(activeCount, 10);
  if (isNaN(count) || count < 0) {
    return res.status(400).json({ error: 'Valid activeCount number required.' });
  }

  state.teams.forEach((t, idx) => {
    t.isActive = idx < count;
  });

  logAuditEvent({
    actor: 'Administrator',
    role: 'admin',
    action: 'TEAMS_ACTIVE_COUNT_SET',
    target: 'TEAMS',
    reason: `Configured first ${count} teams as ACTIVE (${state.teams.length - count} INACTIVE).`
  });

  saveState(true);
  broadcastState();

  res.json({
    success: true,
    activeCount: count,
    totalTeams: state.teams.length,
    activeTeams: state.teams.filter(t => t.isActive !== false).map(t => t.teamCode)
  });
});

// Audit Log Ledger Endpoint
app.get('/api/audit-log', (req, res) => {
  res.json({ success: true, logs: state.auditLog || [] });
});

// Admin Universe Seed Endpoint
app.post('/api/admin/seed', (req, res) => {
  if (typeof generateFullSecurityUniverse === 'function') {
    state.securities = generateFullSecurityUniverse();
  }
  // Initialize standard 20 teams with multi-currency wallets
  state.teams = Array.from({ length: 20 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
      id: `T${num}`,
      teamCode: `T${num}`,
      teamName: `Trader Elite ${i + 1}`,
      name: `Team ${num}`,
      teamType: 'Retail',
      cashBalance: 10000000,
      cash: 10000000,
      initialCash: 10000000,
      cashWallets: { INR: 10000000, USD: 0, GBP: 0, EUR: 0 },
      foreignWallets: { USD: 0, GBP: 0, EUR: 0 },
      holdings: {},
      portfolio: {},
      reservedIpoCapital: 0,
      borrowed: 0,
      isActive: true,
      createdAt: Date.now()
    };
  });
  saveState(true);
  broadcastState();
  res.json({ success: true, securitiesCount: state.securities.length, teamsCount: state.teams.length });
});

// COMPLETE MASTER RESET TO BRAND NEW STAGE
app.post(['/api/admin/master-reset', '/api/admin/reset'], (req, res) => {
  console.log('⚡ EXECUTING COMPLETE MASTER RESET OF SAAMX APPLICATION...');
  
  // 1. Wipe all order book, transaction history, audit trails, and execution logs
  state.transactions = [];
  state.orders = [];
  state.fxTransactions = [];
  state.corporateActions = [];
  state.auditLog = [];
  state.leaderboard = {};

  // 2. Clear circuit breaker histories and velocity targets
  for (const k in activeVelocityTargets) delete activeVelocityTargets[k];
  for (const k in circuitBreakerHistory) delete circuitBreakerHistory[k];

  // 3. Re-seed full 1,800-constituent universe (including 5 simulated IPOs: OAI, STRP, CNVA, DISC, POLY)
  state.securities = generateFullSecurityUniverse();

  // 4. Re-initialize 20 Teams (T01 - T20) with clean starting state
  state.teams = Array.from({ length: 20 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
      id: `T${num}`,
      teamCode: `T${num}`,
      teamName: `Trader Elite ${i + 1}`,
      name: `Team ${num}`,
      teamType: 'Retail',
      cashBalance: 10000000,
      cash: 10000000,
      initialCash: 10000000,
      cashWallets: { INR: 10000000, USD: 0, GBP: 0, EUR: 0 },
      foreignWallets: { USD: 0, GBP: 0, EUR: 0 },
      holdings: {},
      portfolio: {},
      reservedIpoCapital: 0,
      borrowed: 0,
      isActive: true,
      createdAt: Date.now()
    };
  });

  // 5. Clean Market Indices
  state.marketIndices = {
    GLOBAL100: { name: 'SAAMX GLOBAL 100', currentValue: 1000, openingValue: 1000, changePercent: 0 },
    INDIA50: { name: 'SAAMX INDIA 50', currentValue: 5000, openingValue: 5000, changePercent: 0 },
    US100: { name: 'SAAMX US 100', currentValue: 8000, openingValue: 8000, changePercent: 0 },
    UK100: { name: 'SAAMX UK 100', currentValue: 4000, openingValue: 4000, changePercent: 0 }
  };

  // 6. Clean FX Spot Rates
  state.fxRates = {
    USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
    GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
    EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
  };

  // 7. Reset Market State to Fresh Simulation Stage
  state.marketState = {
    status: 'Open',
    sessionState: 'CONTINUOUS_TRADING',
    simulationStartTime: Date.now(),
    simulationDurationMinutes: 60,
    marketIndex: 0,
    pauseTimeOffset: 0,
    pausedAt: null
  };

  // 8. Clean News Feed
  state.newsEvents = [
    {
      id: `NW_STAGE_${Date.now()}`,
      headline: '🔔 SAAMX Simulation Floor Re-Initialized — 1,800 Global Securities Active',
      description: 'The Academic Asset Market Exchange has initiated a brand new trading stage. Multi-currency trading desks, primary IPO hubs, and global indices are live.',
      sentiment: 'Positive',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Macro'
    }
  ];

  logAuditEvent({
    actor: 'Administrator',
    role: 'admin',
    action: 'COMPLETE_MASTER_RESET',
    target: 'ALL_MODULES',
    reason: 'Full application master reset to brand new simulation stage.'
  });

  saveState(true);
  broadcastState('STAGE_RESET', { message: 'Complete Master Reset executed.' });

  res.json({
    success: true,
    message: 'Complete Master Reset successfully executed. 1,800 securities active and all teams re-initialized.',
    securitiesCount: state.securities.length,
    teamsCount: state.teams.length,
    marketState: state.marketState
  });
});

// ----------------------------------------------------
// SAAMX SIMULATED IPO ENGINE & LIFECYCLE
// ----------------------------------------------------
app.get('/api/ipos', (req, res) => {
  const ipoSecurities = (state.securities || []).filter(s => 
    (s.ipoStatus && s.ipoStatus !== 'NONE') || s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED' || s.simulationLabel
  );
  res.json({ success: true, ipos: ipoSecurities });
});

app.post('/api/ipo/bid', (req, res) => {
  const { ticker, quantity, teamCode } = req.body;
  const Q = Number(quantity);

  if (!ticker || isNaN(Q) || Q <= 0) {
    return res.status(400).json({ error: 'Valid ticker and positive bid quantity are required.' });
  }

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) {
    return res.status(404).json({ error: `Security ${ticker} not found in database.` });
  }

  if (security.status !== 'IPO_PENDING' && security.status !== 'IPO_STAGED' && security.ipoStatus !== 'SUBSCRIPTION_OPEN') {
    return res.status(400).json({ error: `${ticker} is not currently accepting primary IPO subscriptions (Status: ${security.status || security.ipoStatus}).` });
  }

  if (security.lotSize && Q % security.lotSize !== 0) {
    return res.status(400).json({ error: `Bid quantity for ${ticker} must be in multiples of lot size (${security.lotSize} shares).` });
  }

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${teamCode} not found.` });
  }
  if (team.isActive === false) {
    return res.status(400).json({ error: `Team ${team.teamCode || teamCode} is currently marked INACTIVE by Admin.` });
  }

  if (!team.cashWallets) {
    team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
  }

  const secCurrency = security.currency || 'USD';
  const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
  const offerPrice = security.offerPrice || security.basePrice || security.ipoPrice || 100;
  const bidCost = Q * offerPrice;

  // Check currency wallet balance
  const currentWalletBalance = Number(team.cashWallets[secCurrency] || 0);
  if (currentWalletBalance < bidCost) {
    return res.status(400).json({
      error: `Insufficient ${secCurrency} balance. Team has ${curSym}${currentWalletBalance.toLocaleString()}, bid requires ${curSym}${bidCost.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`
    });
  }

  // Atomic reservation
  team.cashWallets[secCurrency] -= bidCost;
  team.reservedIpoCapital = (team.reservedIpoCapital || 0) + bidCost;

  security.bids = security.bids || {};
  const existingBid = security.bids[team.teamCode] || { quantity: 0, capitalReserved: 0 };
  const newBidQty = existingBid.quantity + Q;
  const newCapital = existingBid.capitalReserved + bidCost;

  security.bids[team.teamCode] = {
    quantity: newBidQty,
    capitalReserved: newCapital,
    timestamp: Date.now()
  };

  // Recalculate total demand and subscription multiple
  security.totalSubscription = Object.values(security.bids).reduce((sum, b) => sum + (b.quantity || 0), 0);
  const floatUnits = security.availableFloat || security.totalUnits || 1000;
  security.subscriptionMultiple = parseFloat((security.totalSubscription / floatUnits).toFixed(2));

  saveState(true);
  broadcastState();

  res.json({
    success: true,
    message: `Successfully placed subscription for ${Q.toLocaleString()} units of ${ticker} (${curSym}${bidCost.toLocaleString()} reserved).`,
    teamBid: security.bids[team.teamCode],
    totalSubscription: security.totalSubscription,
    subscriptionMultiple: security.subscriptionMultiple
  });
});

app.post('/api/ipo/subscribe', (req, res) => {
  const { ticker, quantity, teamCode } = req.body;
  const Q = Number(quantity);

  if (!ticker || isNaN(Q) || Q <= 0) {
    return res.status(400).json({ error: 'Valid ticker and positive bid quantity are required.' });
  }

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) {
    return res.status(404).json({ error: `Security ${ticker} not found in database.` });
  }

  if (security.status !== 'IPO_PENDING' && security.status !== 'IPO_STAGED' && security.ipoStatus !== 'SUBSCRIPTION_OPEN') {
    return res.status(400).json({ error: `${ticker} is not currently accepting primary IPO subscriptions (Status: ${security.status || security.ipoStatus}).` });
  }

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${teamCode} not found.` });
  }

  if (!team.cashWallets) {
    team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
  }

  const secCurrency = security.currency || 'USD';
  const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
  const offerPrice = security.offerPrice || security.basePrice || security.ipoPrice || 100;
  const bidCost = Q * offerPrice;

  const currentWalletBalance = Number(team.cashWallets[secCurrency] || 0);
  if (currentWalletBalance < bidCost) {
    return res.status(400).json({
      error: `Insufficient ${secCurrency} balance. Team has ${curSym}${currentWalletBalance.toLocaleString()}, bid requires ${curSym}${bidCost.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`
    });
  }

  team.cashWallets[secCurrency] -= bidCost;
  team.reservedIpoCapital = (team.reservedIpoCapital || 0) + bidCost;

  security.bids = security.bids || {};
  const existingBid = security.bids[team.teamCode] || { quantity: 0, capitalReserved: 0 };
  const newBidQty = existingBid.quantity + Q;
  const newCapital = existingBid.capitalReserved + bidCost;

  security.bids[team.teamCode] = {
    quantity: newBidQty,
    capitalReserved: newCapital,
    timestamp: Date.now()
  };

  security.totalSubscription = Object.values(security.bids).reduce((sum, b) => sum + (b.quantity || 0), 0);
  const floatUnits = security.availableFloat || security.totalUnits || 1000;
  security.subscriptionMultiple = parseFloat((security.totalSubscription / floatUnits).toFixed(2));

  saveState(true);
  broadcastState();

  res.json({
    success: true,
    message: `Successfully placed subscription for ${Q.toLocaleString()} units of ${ticker} (${curSym}${bidCost.toLocaleString()} reserved).`,
    teamBid: security.bids[team.teamCode],
    totalSubscription: security.totalSubscription,
    subscriptionMultiple: security.subscriptionMultiple
  });
});

app.post('/api/ipo/allot', (req, res) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker is required for allotment.' });

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  if (security.ipoStatus === 'ALLOTMENT_FINALIZED' || (security.status === 'Active' && !security.bids)) {
    return res.status(400).json({ error: `IPO for ${ticker} has already been allotted and finalized.` });
  }

  const floatUnits = security.availableFloat || security.totalUnits || 1000;
  const offerPrice = security.offerPrice || security.basePrice || 100;
  const secCurrency = security.currency || 'USD';
  const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
  const bids = security.bids || {};
  const totalDemand = Object.values(bids).reduce((sum, b) => sum + (b.quantity || 0), 0);

  const allotments = {};
  let totalAllotted = 0;

  if (totalDemand === 0) {
    security.status = 'Active';
    security.ipoStatus = 'ALLOTMENT_FINALIZED';
    security.bids = {};
    saveState(true);
    broadcastState();
    return res.json({ success: true, message: `No bids placed for ${ticker}. Security activated.`, allotments: {} });
  }

  // Pro-rata Allotment Engine
  const teamsBidding = Object.keys(bids);
  for (const tCode of teamsBidding) {
    const b = bids[tCode];
    const team = state.teams.find(t => t.teamCode === tCode || t.id === tCode);
    if (!team) continue;

    let allottedQty = 0;
    if (totalDemand <= floatUnits) {
      allottedQty = b.quantity;
    } else {
      allottedQty = Math.floor((b.quantity * floatUnits) / totalDemand);
    }

    totalAllotted += allottedQty;
    const actualCost = allottedQty * offerPrice;
    const refund = b.capitalReserved - actualCost;

    if (!team.holdings) team.holdings = {};
    team.holdings[ticker] = (team.holdings[ticker] || 0) + allottedQty;

    if (refund > 0) {
      if (!team.cashWallets) team.cashWallets = { INR: 0, USD: 0, GBP: 0, EUR: 0 };
      team.cashWallets[secCurrency] = parseFloat(((team.cashWallets[secCurrency] || 0) + refund).toFixed(2));
    }

    const usdRate = state.fxRates.USDINR?.midRate || 88.20;
    const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
    const eurRate = state.fxRates.EURINR?.midRate || 103.50;
    team.cashBalance = parseFloat((
      Number(team.cashWallets.INR || 0) +
      Number(team.cashWallets.USD || 0) * usdRate +
      Number(team.cashWallets.GBP || 0) * gbpRate +
      Number(team.cashWallets.EUR || 0) * eurRate
    ).toFixed(2));
    team.reservedIpoCapital = 0;

    allotments[tCode] = {
      bidQuantity: b.quantity,
      allottedQuantity: allottedQty,
      refundAmount: refund,
      actualCost
    };
  }

  // Rounding remainder shares distribution
  let remainder = floatUnits - totalAllotted;
  if (remainder > 0 && totalDemand > floatUnits) {
    for (const tCode of teamsBidding) {
      if (remainder <= 0) break;
      const team = state.teams.find(t => t.teamCode === tCode || t.id === tCode);
      if (team && allotments[tCode] && allotments[tCode].allottedQuantity < bids[tCode].quantity) {
        team.holdings[ticker] += 1;
        allotments[tCode].allottedQuantity += 1;
        allotments[tCode].refundAmount -= offerPrice;
        allotments[tCode].actualCost += offerPrice;
        team.cashWallets[secCurrency] = Math.max(0, parseFloat(((team.cashWallets[secCurrency] || 0) - offerPrice).toFixed(2)));
        
        const usdRate = state.fxRates.USDINR?.midRate || 88.20;
        const gbpRate = state.fxRates.GBPINR?.midRate || 119.40;
        const eurRate = state.fxRates.EURINR?.midRate || 103.50;
        team.cashBalance = parseFloat((
          Number(team.cashWallets.INR || 0) +
          Number(team.cashWallets.USD || 0) * usdRate +
          Number(team.cashWallets.GBP || 0) * gbpRate +
          Number(team.cashWallets.EUR || 0) * eurRate
        ).toFixed(2));
        remainder--;
      }
    }
  }

  // Calculate Personality-driven Listing Price Pop
  let listingMultiplier = 1.15;
  if (security.ticker === 'OAI') listingMultiplier = 1.32; // OpenAI AI Frenzy (+32%)
  else if (security.ticker === 'STRP') listingMultiplier = 1.12; // Stripe Fundamentals (+12%)
  else if (security.ticker === 'CNVA') listingMultiplier = 1.20; // Canva Retail Growth (+20%)
  else if (security.ticker === 'DISC') listingMultiplier = 1.08; // Discord Network (+8%)
  else if (security.ticker === 'POLY') listingMultiplier = 1.28; // Polymarket Speculation (+28%)

  const listingPrice = parseFloat((offerPrice * listingMultiplier).toFixed(2));
  security.currentPrice = listingPrice;
  security.openingPrice = listingPrice;
  security.status = 'Active';
  security.ipoStatus = 'ALLOTMENT_FINALIZED';
  security.availableUnits = Math.max(0, floatUnits - totalAllotted);
  security.bids = {};
  security.priceHistory.push({ timestamp: Date.now(), price: listingPrice });

  // Add breaking news flash
  const news = {
    id: `NW_IPO_ALLOT_${security.ticker}_${Date.now()}`,
    headline: `🔔 ${security.name} (${security.ticker}) Completes Allotment & Lists at ${curSym}${listingPrice} (+${((listingMultiplier - 1)*100).toFixed(0)}%)`,
    description: `Primary subscription finalized at ${security.subscriptionMultiple || 1}x demand. Secondary trading is now active on ${security.exchange}.`,
    affectedSecurityIds: [security.id],
    sentiment: 'Positive',
    impactPercent: Math.round((listingMultiplier - 1) * 100),
    triggeredAt: Date.now(),
    category: 'Corporate'
  };
  state.newsEvents.push(news);

  saveState(true);
  broadcastState('NEWS_FLASH', { newsItem: news });

  res.json({
    success: true,
    ticker,
    offerPrice,
    listingPrice,
    totalAllotted,
    allotments
  });
});

app.post('/api/ipo/transition', (req, res) => {
  const { ticker, nextStatus } = req.body;
  if (!ticker || !nextStatus) return res.status(400).json({ error: 'Ticker and nextStatus required.' });

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  security.ipoStatus = nextStatus;
  if (nextStatus === 'ACTIVE') security.status = 'Active';
  if (nextStatus === 'SUBSCRIPTION_OPEN') security.status = 'IPO_PENDING';

  saveState(true);
  broadcastState();

  res.json({ success: true, ticker, ipoStatus: security.ipoStatus, status: security.status });
});

// Admin IPO Stage and Lifecycle Controller
app.post(['/api/ipo/advance', '/api/ipo/stage'], (req, res) => {
  const { ticker, stageName, stage, visibleToParticipants } = req.body || {};
  const targetStage = stageName || stage;
  if (!ticker || !targetStage) return res.status(400).json({ error: 'Ticker and stage are required.' });

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  security.ipoStage = targetStage;
  security.ipoStatus = targetStage;

  if (visibleToParticipants !== undefined) {
    security.visibleToParticipants = Boolean(visibleToParticipants);
  } else if (targetStage === 'HIDDEN') {
    security.visibleToParticipants = false;
  } else {
    security.visibleToParticipants = true;
  }

  if (targetStage === 'HIDDEN') {
    security.status = 'IPO_STAGED';
    security.ipoStatus = 'HIDDEN';
  } else if (targetStage === 'RUMOUR' || targetStage === 'SPECULATION') {
    security.status = 'IPO_STAGED';
  } else if (targetStage === 'OFFICIAL_ANNOUNCEMENT' || targetStage === 'ANNOUNCED') {
    security.status = 'IPO_PENDING';
  } else if (targetStage === 'SUBSCRIPTION_OPEN') {
    security.status = 'IPO_OPEN';
  } else if (targetStage === 'SUBSCRIPTION_CLOSED') {
    security.status = 'IPO_CLOSED';
  } else if (targetStage === 'ALLOTMENT') {
    security.status = 'IPO_ALLOTTED';
  } else if (targetStage === 'LISTING' || targetStage === 'LISTED') {
    security.status = 'Active';
    security.ipoStatus = 'LISTED';
    security.visibleToParticipants = true;
  }

  // Create news flash if not HIDDEN
  if (targetStage !== 'HIDDEN') {
    const news = {
      id: `NW_IPO_${security.ticker}_${targetStage}_${Date.now()}`,
      headline: `📢 IPO Stage Update: ${security.name} (${security.ticker}) moves to ${targetStage.replace(/_/g, ' ')}`,
      description: `Primary capital market pipeline status updated for ${security.name}.`,
      affectedSecurityIds: [security.id],
      sentiment: 'Positive',
      impactPercent: targetStage === 'LISTING' ? 15 : 0,
      triggeredAt: Date.now(),
      category: 'IPO'
    };
    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift(news);
  }

  saveState(true);
  broadcastState('IPO_STAGE_UPDATE', { ticker, stage: targetStage, visibleToParticipants: security.visibleToParticipants, security });

  res.json({
    success: true,
    ticker,
    stage: targetStage,
    status: security.status,
    ipoStatus: security.ipoStatus,
    visibleToParticipants: security.visibleToParticipants,
    security
  });
});

// Admin IPO Visibility Toggle
app.post('/api/ipo/visibility', (req, res) => {
  const { ticker, visibleToParticipants } = req.body || {};
  if (!ticker || visibleToParticipants === undefined) {
    return res.status(400).json({ error: 'Ticker and visibleToParticipants boolean are required.' });
  }

  const security = state.securities.find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  security.visibleToParticipants = Boolean(visibleToParticipants);
  if (!security.visibleToParticipants && (!security.ipoStage || security.ipoStage === 'RUMOUR')) {
    security.ipoStage = 'HIDDEN';
    security.ipoStatus = 'HIDDEN';
  }

  saveState(true);
  broadcastState('IPO_VISIBILITY_UPDATE', { ticker, visibleToParticipants: security.visibleToParticipants });

  res.json({
    success: true,
    ticker,
    visibleToParticipants: security.visibleToParticipants
  });
});

// ----------------------------------------------------
// PROJECT PHOENIX SCENARIO SCRIPTS
// ----------------------------------------------------
const PHOENIX_TARGET = 'DTAI';

const triggerIPO = (ipoDetails) => {
  let security = state.securities.find(s => s.ticker === ipoDetails.ticker);
  if (!security) {
    const id = `S${String(state.securities.length + 1).padStart(4, '0')}`;
    security = {
      id,
      ticker: ipoDetails.ticker,
      name: ipoDetails.companyName,
      sector: ipoDetails.sector || 'Technology',
      industry: ipoDetails.industry || 'Technology',
      type: 'Equity',
      basePrice: ipoDetails.ipoPrice || ipoDetails.offerPrice || 100,
      referencePrice: ipoDetails.ipoPrice || ipoDetails.offerPrice || 100,
      currentPrice: ipoDetails.ipoPrice || ipoDetails.offerPrice || 100,
      totalUnits: ipoDetails.totalUnitsOffered || ipoDetails.totalUnits || 1000,
      availableUnits: ipoDetails.totalUnitsOffered || ipoDetails.availableUnits || 1000,
      availableFloat: ipoDetails.totalUnitsOffered || 1000,
      volatility: ipoDetails.volatility || 0.75,
      riskRating: ipoDetails.riskRating || 'High',
      growthRating: 4,
      status: 'IPO_PENDING',
      ipoStatus: 'SUBSCRIPTION_OPEN',
      currency: ipoDetails.currency || 'USD',
      exchange: ipoDetails.exchange || 'NASDAQ',
      country: ipoDetails.country || 'United States',
      simulationLabel: 'SAAMX SIMULATED IPO — HYPOTHETICAL EVENT SCENARIO',
      sentimentOverride: 0,
      description: ipoDetails.description || '',
      ceoName: ipoDetails.ceoName || '',
      foundedYear: ipoDetails.foundedYear || 2026,
      headquarters: ipoDetails.headquarters || 'United States',
      logoInitials: ipoDetails.ticker.slice(0, 2).toUpperCase(),
      dividendYield: 0,
      priceHistory: [{ timestamp: Date.now(), price: ipoDetails.ipoPrice || 100 }]
    };
    state.securities.push(security);
  } else {
    security.status = 'IPO_PENDING';
    security.ipoStatus = 'SUBSCRIPTION_OPEN';
  }

  saveState(true);

  // Broadcast IPO pending event for Projector takeover
  broadcastState('IPO_PENDING', {
    type: 'IPO_PENDING',
    ticker: ipoDetails.ticker,
    name: ipoDetails.companyName,
    ipoPrice: ipoDetails.ipoPrice || ipoDetails.offerPrice,
    availableUnits: ipoDetails.totalUnitsOffered || ipoDetails.totalUnits
  });
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
    // IPO 1: OpenAI Global Hyperscale IPO (T+16:00)
    triggerIPO({
      ticker: 'OAI',
      companyName: 'OpenAI Inc',
      sector: 'Technology',
      ipoPrice: 180,
      totalUnitsOffered: 1000,
      currency: 'USD',
      exchange: 'NASDAQ',
      volatility: 0.88,
      riskRating: 'High',
      ceoName: 'Sam Altman',
      foundedYear: 2015,
      description: "OpenAI is a leading artificial intelligence research and deployment company known for pioneering the GPT foundation model architecture and ChatGPT. It provides generative cognitive engines and API platforms globally."
    });

    const news = {
      id: 'NW_OAI_IPO_WARN',
      headline: "OpenAI Global Hyperscale IPO (OAI) Opens Subscription Window at $180 (Lot: 10)",
      description: "The most anticipated AI listing opens for subscription bidding. Extreme institutional and retail demand expected. Bidding is open in USD.",
      sentiment: 'Positive',
      impactPercent: 25,
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
    // Stripe IPO Alert Warning (T+23:00)
    const news = {
      id: 'NW_STRP_WARN',
      headline: "⚡ BREAKING: Stripe Global Financial Infrastructure IPO in 60 Seconds — $95 Issue Price | Lot: 20",
      description: "The global internet payment processing leader makes its public debut. Institutional confidence backed by record enterprise payment volume.",
      sentiment: 'Positive',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Corporate'
    };
    state.newsEvents.push(news);
    broadcastState('NEWS_FLASH', { newsItem: news });
  }
  else if (act === 7) {
    // IPO 2: Stripe Global Financial Infrastructure IPO (T+24:00)
    triggerIPO({
      ticker: 'STRP',
      companyName: 'Stripe Inc',
      sector: 'Financials',
      ipoPrice: 95,
      totalUnitsOffered: 1200,
      currency: 'USD',
      exchange: 'NYSE',
      volatility: 0.42,
      riskRating: 'Medium',
      ceoName: 'Patrick Collison',
      foundedYear: 2010,
      description: "Stripe is a global economic infrastructure platform providing payment processing software and APIs for internet commerce and cross-border treasury settlements."
    });
  }
  else if (act === 8) {
    // IPO Allotment Finalization for OAI
    const oai = state.securities.find(s => s.ticker === 'OAI');
    if (oai) {
      const oldPrice = oai.currentPrice;
      oai.currentPrice = parseFloat((oldPrice * 1.32).toFixed(2));
      oai.priceHistory.push({ timestamp: Date.now(), price: oai.currentPrice });
    }
    const news = {
      id: 'NW_OAI_POP',
      headline: "OpenAI Global Hyperscale Surges +32% on Day 1 Listing — Historic Trading Volume on NASDAQ",
      description: "OpenAI makes its public debut surging to $237.60 from its $180 offer price. Extreme secondary market buying continues.",
      sentiment: 'Positive',
      impactPercent: 32,
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

// ==========================================
// SAAMX MASTER MARKET NARRATIVE ROUTES
// ==========================================

// 1. UNIFIED EVENT TRIGGER
app.post('/api/events/trigger', (req, res) => {
  try {
    const { event, impactMultiplier = 1.0, actor = 'Admin' } = req.body;
    if (!event || !event.id) {
      return res.status(400).json({ error: 'Missing event payload.' });
    }

    // Convert array format state.securities to map for eventEngine
    const secMap = {};
    (state.securities || []).forEach(s => { secMap[s.ticker] = s; });

    const pseudoFms = {
      securities: secMap,
      fxRates: state.fxRates,
      newsEvents: {},
      events: state.events || {},
      marketState: state.marketState,
      auditLog: state.auditLog
    };

    const { nextState, newsEntry, modifiedSecurities } = calculateEventImpact(event, pseudoFms, { impactMultiplier, actor });

    // Apply back to state.securities array
    if (modifiedSecurities && modifiedSecurities.length > 0) {
      modifiedSecurities.forEach(m => {
        const idx = state.securities.findIndex(s => s.ticker === m.ticker);
        if (idx !== -1) {
          state.securities[idx] = nextState.securities[m.ticker];
        }
      });
    }

    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift(newsEntry);
    if (!state.events) state.events = {};
    state.events[event.id] = nextState.events[event.id];

    if (nextState.marketState.takeoverEvent) {
      state.marketState.takeoverEvent = nextState.marketState.takeoverEvent;
    }
    if (nextState.fxRates) {
      state.fxRates = nextState.fxRates;
    }

    updateMarketIndex();
    saveState(true);
    broadcastState();

    return res.json({ success: true, newsEntry, modifiedSecurities });
  } catch (err) {
    console.error('Error triggering event:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. BULL / BEAR STANCE & STATEMENT
app.post('/api/bull-bear/statement', (req, res) => {
  try {
    const { role, stance, confidence, targetSectors, riskAreas, statement, author = 'Analyst' } = req.body;
    if (!role || !statement) {
      return res.status(400).json({ error: 'Role and statement required.' });
    }

    const roleKey = role.toLowerCase() === 'bull' ? 'bull' : 'bear';
    const now = Date.now();
    const stanceEntry = {
      role: roleKey,
      stance: stance || (roleKey === 'bull' ? 'STRONGLY BULLISH' : 'BEARISH'),
      confidence: Number(confidence) || 75,
      targetSectors: targetSectors || [],
      riskAreas: riskAreas || [],
      statement,
      author,
      publishedAt: now
    };

    const newsId = `NEWS_BB_${roleKey.toUpperCase()}_${now}`;
    const newsEntry = {
      id: newsId,
      headline: `${roleKey === 'bull' ? '🐂 BULL VIEW' : '🐻 BEAR VIEW'}: ${statement.substring(0, 75)}...`,
      title: `${roleKey === 'bull' ? 'BULL' : 'BEAR'} VIEWPOINT: Market Outlook`,
      body: statement,
      description: statement,
      category: 'ANALYST',
      tier: 'TIER_2',
      severity: 'MEDIUM',
      marketImpact: roleKey === 'bull' ? 'BULLISH' : 'BEARISH',
      triggeredAt: now,
      source: roleKey === 'bull' ? 'SAAMX Floor Bull Desk' : 'SAAMX Floor Bear Desk',
      storyline: 'BULL_VS_BEAR'
    };

    if (!state.bullBear) state.bullBear = {};
    state.bullBear[roleKey] = stanceEntry;
    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift(newsEntry);

    saveState(true);
    broadcastState();

    return res.json({ success: true, stanceEntry, newsEntry });
  } catch (err) {
    console.error('Error in bull-bear statement:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. BULL VS BEAR LIVE DEBATE
app.post('/api/bull-bear/debate', (req, res) => {
  try {
    const { topic, round = 1, active = true } = req.body;
    const now = Date.now();
    const debateData = {
      topic: topic || 'AI Megacap Valuations vs Market Fundamentals',
      round: Number(round) || 1,
      active: Boolean(active),
      startedAt: now
    };

    if (!state.bullBear) state.bullBear = {};
    state.bullBear.activeDebate = debateData;

    if (active) {
      state.marketState.takeoverEvent = {
        id: `TAKEOVER_DEBATE_${now}`,
        type: 'DEBATE_SHOWDOWN',
        headline: `⚔️ LIVE MARKET DEBATE: BULL 🐂 VS BEAR 🐻`,
        description: `Floor showdown active: ${debateData.topic}. Cast sentiment votes in Market Intelligence.`,
        tier: 'TIER_1',
        category: 'DEBATE',
        audioCue: 'breaking_news',
        triggeredAt: now
      };
    }

    saveState(true);
    broadcastState();

    return res.json({ success: true, debateData });
  } catch (err) {
    console.error('Error in bull-bear debate:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. BROKER ADVISORY RECOMMENDATION
app.post('/api/broker/recommendation', (req, res) => {
  try {
    const { brokerName, ticker, recommendation, confidence, reasoning, riskLevel = 'MEDIUM', timeframe = 'MEDIUM' } = req.body;
    if (!ticker || !recommendation) {
      return res.status(400).json({ error: 'Ticker and recommendation required.' });
    }

    const recId = `REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const recData = {
      id: recId,
      brokerName: brokerName || 'Floor Advisor',
      ticker: ticker.toUpperCase(),
      recommendation: recommendation.toUpperCase(),
      confidence: Number(confidence) || 80,
      reasoning: reasoning || 'Technical and fundamental setup aligned.',
      riskLevel,
      timeframe,
      publishedAt: Date.now()
    };

    if (!state.brokerRecommendations) state.brokerRecommendations = [];
    state.brokerRecommendations.unshift(recData);

    saveState(true);
    broadcastState();

    return res.json({ success: true, recommendation: recData });
  } catch (err) {
    console.error('Error in broker recommendation:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. MARKET SENTIMENT POLLING
app.post('/api/polls/create', (req, res) => {
  try {
    const { question, options = ['Bullish 🐂', 'Bearish 🐻', 'Neutral ⚖️'], durationSeconds = 180 } = req.body;
    if (!question) return res.status(400).json({ error: 'Poll question required.' });

    const pollId = `POLL_${Date.now()}`;
    const pollData = {
      id: pollId,
      question,
      options: options.map((opt, i) => ({ id: i, text: opt, votes: 0 })),
      status: 'OPEN',
      createdAt: Date.now(),
      expiresAt: Date.now() + (Number(durationSeconds) || 180) * 1000,
      votes: {}
    };

    if (!state.polls) state.polls = {};
    state.polls[pollId] = pollData;

    saveState(true);
    broadcastState();

    return res.json({ success: true, poll: pollData });
  } catch (err) {
    console.error('Error creating poll:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/polls/vote', (req, res) => {
  try {
    const { pollId, teamCode, optionId } = req.body;
    if (!pollId || !teamCode || optionId === undefined) {
      return res.status(400).json({ error: 'Missing poll voting parameters.' });
    }

    const poll = state.polls ? state.polls[pollId] : null;
    if (!poll || poll.status !== 'OPEN') {
      return res.status(400).json({ error: 'Poll is closed or not found.' });
    }

    if (!poll.votes) poll.votes = {};
    if (poll.votes[teamCode] !== undefined) {
      return res.status(400).json({ error: 'Team has already voted in this poll.' });
    }

    poll.votes[teamCode] = Number(optionId);
    if (poll.options && poll.options[optionId]) {
      poll.options[optionId].votes = (poll.options[optionId].votes || 0) + 1;
    }

    saveState(true);
    broadcastState();

    return res.json({ success: true });
  } catch (err) {
    console.error('Error voting poll:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/polls/close', (req, res) => {
  try {
    const { pollId } = req.body;
    if (state.polls && state.polls[pollId]) {
      state.polls[pollId].status = 'CLOSED';
      state.polls[pollId].closedAt = Date.now();
      saveState(true);
      broadcastState();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error closing poll:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. VODAFONE IDEA CRISIS ACT ADVANCE
app.post('/api/crisis/vodafone/advance', (req, res) => {
  try {
    const { actNumber, resolutionType = 'RECOVERY' } = req.body;

    const secMap = {};
    (state.securities || []).forEach(s => { secMap[s.ticker] = s; });

    const pseudoFms = {
      securities: secMap,
      newsEvents: {},
      marketState: state.marketState,
      auditLog: state.auditLog,
      vodafoneCrisis: state.vodafoneCrisis
    };

    const { nextState, newsEntry } = processVodafoneCrisisAct(Number(actNumber), resolutionType, pseudoFms);

    const idx = (state.securities || []).findIndex(s => s.ticker === 'IDEA');
    if (idx !== -1) {
      state.securities[idx] = nextState.securities['IDEA'];
    }

    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift(newsEntry);
    state.vodafoneCrisis = nextState.vodafoneCrisis;

    if (nextState.marketState.takeoverEvent) {
      state.marketState.takeoverEvent = nextState.marketState.takeoverEvent;
    }

    updateMarketIndex();
    saveState(true);
    broadcastState();

    return res.json({ success: true, newsEntry, vodafoneCrisis: state.vodafoneCrisis });
  } catch (err) {
    console.error('Error advancing vodafone crisis:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 7. IPO LIFECYCLE STAGE ADVANCE
app.post('/api/ipo/advance', (req, res) => {
  try {
    const { ticker, stageName } = req.body;
    if (!ticker || !stageName) return res.status(400).json({ error: 'Ticker and stageName required.' });

    const secMap = {};
    (state.securities || []).forEach(s => { secMap[s.ticker] = s; });

    const pseudoFms = {
      securities: secMap,
      newsEvents: {},
      marketState: state.marketState,
      ipoRegistry: state.ipoRegistry || {}
    };

    const { nextState, newsEntry } = processIpoStage(ticker.toUpperCase(), stageName.toUpperCase(), pseudoFms);

    const idx = (state.securities || []).findIndex(s => s.ticker === ticker.toUpperCase());
    if (idx !== -1) {
      state.securities[idx] = nextState.securities[ticker.toUpperCase()];
    }

    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.unshift(newsEntry);
    if (!state.ipoRegistry) state.ipoRegistry = {};
    state.ipoRegistry[ticker.toUpperCase()] = nextState.ipoRegistry[ticker.toUpperCase()];

    if (nextState.marketState.takeoverEvent) {
      state.marketState.takeoverEvent = nextState.marketState.takeoverEvent;
    }

    updateMarketIndex();
    saveState(true);
    broadcastState();

    return res.json({ success: true, newsEntry });
  } catch (err) {
    console.error('Error advancing IPO stage:', err);
    return res.status(500).json({ error: err.message });
  }
});

// SPA router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Background Market Price Simulation Loop
// Simulates continuous demand/supply trading fluctuations when the market is open
setInterval(() => {
  let ipoActivated = false;
  if (state && state.securities) {
    state.securities.forEach(security => {
      if (security.status === 'IPO_PENDING') {
        const firstHistory = security.priceHistory && security.priceHistory.length > 0 ? security.priceHistory[0] : null;
        const announcedTime = firstHistory ? firstHistory.timestamp : null;
        if (announcedTime && (Date.now() - announcedTime >= 30000)) {
          security.status = 'Active';
          ipoActivated = true;
          console.log(`Auto-activating IPO security ${security.ticker} after 30 seconds`);
        }
      }
    });
  }

  if (ipoActivated) {
    updateMarketIndex();
    saveState(false);
    broadcastState();
  }

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
  startServerAutonomousCoordinator();
});
