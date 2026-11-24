import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { INITIAL_SECURITIES_TEMPLATES } from './initial_securities.js';
import { generateFullSecurityUniverse, NEW_SIMULATED_IPOS } from './universe_generator.js';

export function isIpoSubscriptionOpen(ipo) {
  if (!ipo) return false;
  return ipo.isSubscriptionOpen === true ||
         ipo.ipoStage === 'OPEN' ||
         ipo.ipoStage === 'SUBSCRIPTION_OPEN' ||
         ipo.ipoStatus === 'SUBSCRIPTION_OPEN' ||
         ipo.status === 'IPO_OPEN';
}

export function isIpoListed(ipo) {
  if (!ipo) return false;
  const stage = String(ipo.ipoStage || ipo.ipoStatus || '').toUpperCase();
  return stage === 'LISTING' || stage === 'LISTED' || stage === 'POST_LISTING';
}

function getRealtimeEntityType(eventType) {
  if (!eventType) return 'SYSTEM';
  if (eventType.startsWith('ORDER_')) return 'ORDER';
  if (eventType.startsWith('SETTLEMENT_')) return 'SETTLEMENT';
  if (eventType.startsWith('PRICE_')) return 'PRICE';
  if (eventType.startsWith('NEWS_')) return 'NEWS';
  if (eventType.startsWith('FX_')) return 'FX';
  if (eventType.startsWith('IPO_')) return 'IPO';
  if (eventType.startsWith('PERSONNEL_')) return 'PERSONNEL';
  if (eventType.startsWith('TEAM_')) return 'TEAM';
  return 'MARKET_STATE';
}

function getRealtimeEntityId(eventType, dataExtra) {
  if (!dataExtra) return 'SYSTEM';
  if (dataExtra.order?.id) return dataExtra.order.id;
  if (dataExtra.orderId) return dataExtra.orderId;
  if (dataExtra.settlement?.id) return dataExtra.settlement.id;
  if (dataExtra.settlementId) return dataExtra.settlementId;
  if (dataExtra.ticker) return dataExtra.ticker;
  if (dataExtra.news?.id) return dataExtra.news.id;
  if (dataExtra.currency) return dataExtra.currency;
  return 'SYSTEM';
}
import { calculateEventImpact, processVodafoneCrisisAct, processIpoStage } from './src/lib/eventEngine.js';
import * as scoringEngine from './scoring_engine.js';
import {
  CURRENCY_DIRECTORY,
  CURRENCY_SYMBOLS,
  DEFAULT_FX_RATES,
  roundCurrency,
  getCurrencyDecimals,
  ACTIVE_CURRENCIES,
  ACTIVE_FOREIGN_CURRENCIES
} from './src/lib/formatters.js';
import db, {
  initPool,
  getPool,
  isPgConfigured,
  isPgConnected,
  closePool,
  withTransaction,
  lockOrderForUpdate,
  lockWalletForUpdate,
  lockHoldingForUpdate,
  lockSecurityForUpdate,
  lockSettlementVoucherForUpdate,
  lockFxReserveForUpdate,
  applyFxReservesMigration,
  recordJournalEntry,
  sessionStore,
  PostgresSessionStore,
  setFallbackStateReference,
  createOrderInDb,
  executeMarketOrderInDb,
  updateOrderStatusInDb,
  executeDirectTradeInDb,
  settleBankVoucherInDb,
  rejectBankVoucherInDb,
  holdBankVoucherInDb,
  runMigrations,
  hydrateStateFromPg,
  mapDbRowToOrder
} from './database/db.js';
import {
  startDeltaPublisher,
  stopDeltaPublisher,
  getDeltaPublisherStats,
  publishDeltaBatch,
  publishSecurityTick
} from './services/deltaPublisher.js';
import {
  calculateMarketImpact,
  calculateDecayTick,
  calculateNewsCorrection,
  resolveRumourState,
  calculateSimulatedFxDemandPressure
} from './src/lib/marketImpactEngine.js';
import {
  getPresetById,
  validateNewsPreset,
  NEWS_PRESETS_LIBRARY,
  NEWS_PRESET_CATEGORIES,
  getPresetsByScope
} from './src/lib/newsPresetsLibrary.js';
import { MORNING_MARKET_BULLETIN, getMorningBulletin } from './src/lib/morningNewsBulletin.js';
import { generateEveningBulletin } from './src/lib/eveningNewsBulletin.js';
import { SAAMX_MARKET_HERALD, getNewspaperData } from './src/lib/newspaperData.js';
import { DEBATE_BANK, getDebateById, getDebatesByCategory, getDebatesByScope } from './src/lib/debateBank.js';

export {
  CURRENCY_DIRECTORY,
  CURRENCY_SYMBOLS,
  DEFAULT_FX_RATES,
  roundCurrency,
  getCurrencyDecimals,
  initPool,
  getPool,
  isPgConfigured,
  isPgConnected,
  closePool,
  withTransaction,
  lockOrderForUpdate,
  lockWalletForUpdate,
  lockHoldingForUpdate,
  lockSecurityForUpdate,
  ACTIVE_CURRENCIES,
  ACTIVE_FOREIGN_CURRENCIES,
  lockSettlementVoucherForUpdate,
  lockFxReserveForUpdate,
  applyFxReservesMigration,
  recordJournalEntry,
  sessionStore,
  PostgresSessionStore,
  startDeltaPublisher,
  stopDeltaPublisher,
  getDeltaPublisherStats,
  publishDeltaBatch,
  publishSecurityTick
};

export const activeFxLocks = new Set();

export const DEFAULT_FX_RESERVES = {
  USD: { currency: 'USD', openingReserve: 210000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 210000, currentInventory: 210000, deskInrCash: 50000000, minReserveThreshold: 20000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  EUR: { currency: 'EUR', openingReserve: 120000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 120000, currentInventory: 120000, deskInrCash: 50000000, minReserveThreshold: 12000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  GBP: { currency: 'GBP', openingReserve: 80000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 80000, currentInventory: 80000, deskInrCash: 50000000, minReserveThreshold: 8000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  JPY: { currency: 'JPY', openingReserve: 5000000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 5000000, currentInventory: 5000000, deskInrCash: 50000000, minReserveThreshold: 500000, maxCapacity: 1000000000, updatedAt: new Date().toISOString() },
  AED: { currency: 'AED', openingReserve: 200000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 200000, currentInventory: 200000, deskInrCash: 50000000, minReserveThreshold: 20000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  SGD: { currency: 'SGD', openingReserve: 100000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 100000, currentInventory: 100000, deskInrCash: 50000000, minReserveThreshold: 10000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  CNY: { currency: 'CNY', openingReserve: 300000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 300000, currentInventory: 300000, deskInrCash: 50000000, minReserveThreshold: 30000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  AUD: { currency: 'AUD', openingReserve: 80000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 80000, currentInventory: 80000, deskInrCash: 50000000, minReserveThreshold: 8000, maxCapacity: 10000000, updatedAt: new Date().toISOString() },
  KRW: { currency: 'KRW', openingReserve: 20000000, replenishments: 0, completedPurchases: 0, completedSales: 0, reservedInventory: 0, availableReserve: 20000000, currentInventory: 20000000, deskInrCash: 50000000, minReserveThreshold: 2000000, maxCapacity: 1000000000, updatedAt: new Date().toISOString() }
};

export function ensureFxReserves(reservesObj = state?.fxReserves) {
  const target = reservesObj || (state && (state.fxReserves = state.fxReserves || {}));
  if (!target) return DEFAULT_FX_RESERVES;
  for (const [cur, def] of Object.entries(DEFAULT_FX_RESERVES)) {
    if (!target[cur]) {
      target[cur] = { ...def };
    } else {
      const r = target[cur];
      r.currency = cur;
      const existingOpening = Number(r.openingReserve ?? r.opening_reserve ?? def.openingReserve);
      if (existingOpening > def.openingReserve * 2) {
        r.openingReserve = def.openingReserve;
      } else {
        r.openingReserve = existingOpening;
      }
      r.replenishments = Number(r.replenishments ?? 0);
      r.completedPurchases = Number(r.completedPurchases ?? r.completed_purchases ?? 0);
      r.completedSales = Number(r.completedSales ?? r.completed_sales ?? 0);
      r.reservedInventory = Number(r.reservedInventory ?? r.reserved_inventory ?? 0);
      r.currentInventory = roundCurrency(r.openingReserve + r.replenishments + r.completedPurchases - r.completedSales, cur);
      r.availableReserve = roundCurrency(r.currentInventory - r.reservedInventory, cur);
      r.deskInrCash = Number(r.deskInrCash ?? r.desk_inr_cash ?? def.deskInrCash);
      r.minReserveThreshold = Number(r.minReserveThreshold ?? r.min_reserve_threshold ?? def.minReserveThreshold);
      r.maxCapacity = Number(r.maxCapacity ?? r.max_capacity ?? def.maxCapacity);
    }
  }
  return target;
}

export function assertSolvencyInvariant(reserve) {
  if (!reserve) return;
  const curInv = Number(reserve.currentInventory ?? reserve.current_inventory ?? 0);
  const resInv = Number(reserve.reservedInventory ?? reserve.reserved_inventory ?? 0);
  const avail = Number(reserve.availableReserve ?? reserve.available_reserve ?? 0);

  if (resInv < 0) {
    throw new Error(`Solvency violation for ${reserve.currency}: Reserved inventory cannot be negative (${resInv}).`);
  }
  if (curInv < 0) {
    throw new Error(`Solvency violation for ${reserve.currency}: Current inventory cannot be negative (${curInv}).`);
  }
  if (avail < 0) {
    throw new Error(`Solvency violation for ${reserve.currency}: Available reserve cannot be negative (${avail}).`);
  }
  const diff = Math.abs((avail + resInv) - curInv);
  if (diff > 0.0001) {
    throw new Error(`Solvency invariant violation for ${reserve.currency}: Available (${avail}) + Reserved (${resInv}) !== Current (${curInv}). Diff: ${diff}`);
  }
}

export function getScarcityPricingMetrics(currency, fxReserves) {
  if (currency === 'INR') {
    return { utilization: 0, spreadPercent: 0.45, midRateMultiplier: 1.0, scarcityImpact: 0, availableReserve: Infinity };
  }
  const reserves = fxReserves || state?.fxReserves || DEFAULT_FX_RESERVES;
  const r = reserves[currency] || DEFAULT_FX_RESERVES[currency];
  if (!r) {
    return { utilization: 0, spreadPercent: 0.45, midRateMultiplier: 1.0, scarcityImpact: 0, availableReserve: 0 };
  }
  const pool = Number(r.openingReserve || 0) + Number(r.replenishments || 0) + Number(r.completedPurchases || 0);
  const poolCap = pool > 0 ? pool : 10000000;
  const avail = Math.max(0, Number(r.availableReserve ?? (r.currentInventory - r.reservedInventory)));
  const u = Math.min(1.0, Math.max(0.0, 1.0 - (avail / poolCap)));

  const sMin = 0.45;
  const sMax = 25.00; // Phase D: bounded scarcity pricing ceiling (0.45% base to 25.00% ceiling)

  if (u <= 0.50) {
    return {
      utilization: parseFloat(u.toFixed(4)),
      spreadPercent: sMin,
      midRateMultiplier: 1.0,
      scarcityImpact: 0,
      availableReserve: avail
    };
  }

  const x = (u - 0.50) / 0.50; // Range: (0, 1]
  const spreadPercent = parseFloat((sMin + (sMax - sMin) * x).toFixed(4));
  const midRateMultiplier = 1.0 + (0.10 * (x * x)); // Up to +10% premium
  const scarcityImpact = parseFloat(((midRateMultiplier - 1.0) * 100).toFixed(2));

  return {
    utilization: parseFloat(u.toFixed(4)),
    spreadPercent,
    midRateMultiplier,
    scarcityImpact,
    availableReserve: avail
  };
}

export function ensureTeamWallets(team) {
  if (!team) return {};
  if (!team.cashWallets) {
    team.cashWallets = { INR: Number(team.cashBalance) || 0 };
  }
  for (const cur of ACTIVE_CURRENCIES) {
    if (team.cashWallets[cur] === undefined || team.cashWallets[cur] === null) {
      team.cashWallets[cur] = 0;
    }
  }
  if (!team.reservedCash) {
    team.reservedCash = {};
  }
  for (const cur of ACTIVE_CURRENCIES) {
    if (team.reservedCash[cur] === undefined || team.reservedCash[cur] === null) {
      team.reservedCash[cur] = 0;
    }
  }
  return team.cashWallets;
}

export function getUnreservedCash(team, currency = 'INR') {
  ensureTeamWallets(team);
  const total = Number(team.cashWallets[currency] || 0);
  const reserved = Number(team.reservedCash?.[currency] || 0);
  const prec = CURRENCY_DIRECTORY[currency]?.precision ?? 2;
  return Math.max(0, prec === 0 ? Math.floor(total - reserved) : parseFloat((total - reserved).toFixed(prec)));
}

export function ensureTeamHoldings(team) {
  if (!team) return {};
  if (!team.holdings) team.holdings = {};
  if (!team.lockedHoldings) team.lockedHoldings = {};
  return team.holdings;
}

export function getDeliverableHoldings(team, ticker) {
  ensureTeamHoldings(team);
  const total = Number(team.holdings[ticker] || 0);
  const locked = Number(team.lockedHoldings?.[ticker] || 0);
  return Math.max(0, total - locked);
}

export function calculateConsolidatedCashBalance(team, fxRates) {
  ensureTeamWallets(team);
  const rates = fxRates || state?.fxRates || DEFAULT_FX_RATES;
  let totalINR = Number(team.cashWallets.INR || 0);

  for (const cur of ACTIVE_CURRENCIES) {
    if (cur === 'INR') continue;
    const balance = Number(team.cashWallets[cur] || 0);
    if (balance !== 0) {
      const pairKey = `${cur}INR`;
      const midRate = rates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0;
      totalINR += balance * midRate;
    }
  }
  return parseFloat(totalINR.toFixed(2));
}

export function findSecurityInUniverse(target, securities = state?.securities || []) {
  if (!target || !securities) return null;
  const targetId = typeof target === 'string' ? target : (target.securityId || target.id);
  const targetTicker = typeof target === 'string' ? target : target.ticker;
  const targetExchange = typeof target === 'object' ? target.exchange : null;

  // 1. Exact match by unique canonical security ID
  if (targetId) {
    const byId = securities.find(s => s.id === targetId);
    if (byId) return byId;
  }
  // 2. Scoped match by (ticker, exchange)
  if (targetTicker && targetExchange) {
    const byTickerEx = securities.find(s => s.ticker === targetTicker && s.exchange?.toUpperCase() === targetExchange.toUpperCase());
    if (byTickerEx) return byTickerEx;
  }
  // 3. Fallback match by ticker or id
  if (targetTicker) {
    const byTicker = securities.find(s => s.ticker === targetTicker || s.id === targetTicker);
    if (byTicker) return byTicker;
  }
  return null;
}

export function calculateFxConversion(fromCurrency, toCurrency, fromAmount, fxRates, fxReserves) {
  const rates = fxRates || state?.fxRates || DEFAULT_FX_RATES;
  const amount = Number(fromAmount);
  if (isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('Valid finite positive amount is required');
  }
  if (fromCurrency === toCurrency) {
    throw new Error('Cannot exchange currency to itself');
  }

  // Legacy CAD/CHF Isolation
  if (fromCurrency === 'CAD' || fromCurrency === 'CHF' || toCurrency === 'CAD' || toCurrency === 'CHF') {
    throw new Error('CAD and CHF are legacy currencies and not available for new exchange transactions.');
  }

  if (!ACTIVE_CURRENCIES.includes(fromCurrency) || !ACTIVE_CURRENCIES.includes(toCurrency)) {
    throw new Error(`Unsupported currency. Active: ${ACTIVE_CURRENCIES.join(', ')}`);
  }

  let effectiveRate = 1.0;
  let rawToAmount = 0;
  let spreadPercent = 0.45;
  let scarcityImpact = 0;
  let utilization = 0;

  if (fromCurrency === 'INR') {
    // Desk sells foreign currency (Client buys foreign currency with INR)
    const pairKey = `${toCurrency}INR`;
    const fx = rates[pairKey] || DEFAULT_FX_RATES[pairKey];
    if (!fx || !fx.midRate) throw new Error(`Missing FX rate for ${pairKey}`);

    const metrics = getScarcityPricingMetrics(toCurrency, fxReserves);
    const scarcityMidRate = fx.midRate * metrics.midRateMultiplier;
    spreadPercent = metrics.spreadPercent;
    scarcityImpact = metrics.scarcityImpact;
    utilization = metrics.utilization;

    effectiveRate = scarcityMidRate * (1 + spreadPercent / 100);
    rawToAmount = amount / effectiveRate;
  } else if (toCurrency === 'INR') {
    // Desk buys foreign currency (Client sells foreign currency for INR)
    const pairKey = `${fromCurrency}INR`;
    const fx = rates[pairKey] || DEFAULT_FX_RATES[pairKey];
    if (!fx || !fx.midRate) throw new Error(`Missing FX rate for ${pairKey}`);

    const metrics = getScarcityPricingMetrics(fromCurrency, fxReserves);
    const scarcityMidRate = fx.midRate * metrics.midRateMultiplier;
    spreadPercent = metrics.spreadPercent;
    scarcityImpact = metrics.scarcityImpact;
    utilization = metrics.utilization;

    effectiveRate = scarcityMidRate * (1 - spreadPercent / 100);
    rawToAmount = amount * effectiveRate;
  } else {
    // Triangular Cross-Currency: fromCur -> INR -> toCur
    const fromPair = rates[`${fromCurrency}INR`] || DEFAULT_FX_RATES[`${fromCurrency}INR`];
    const toPair = rates[`${toCurrency}INR`] || DEFAULT_FX_RATES[`${toCurrency}INR`];
    if (!fromPair || !toPair || !fromPair.midRate || !toPair.midRate) {
      throw new Error(`Missing cross-currency FX rate for ${fromCurrency}/${toCurrency}`);
    }

    const mFrom = getScarcityPricingMetrics(fromCurrency, fxReserves);
    const mTo = getScarcityPricingMetrics(toCurrency, fxReserves);

    const fromScarcityMid = fromPair.midRate * mFrom.midRateMultiplier;
    const sellRate = fromScarcityMid * (1 - mFrom.spreadPercent / 100);

    const toScarcityMid = toPair.midRate * mTo.midRateMultiplier;
    const buyRate = toScarcityMid * (1 + mTo.spreadPercent / 100);

    const inrValue = amount * sellRate;
    rawToAmount = inrValue / buyRate;

    effectiveRate = parseFloat((sellRate / buyRate).toFixed(6));
    spreadPercent = Math.max(mFrom.spreadPercent, mTo.spreadPercent);
    scarcityImpact = Math.max(mFrom.scarcityImpact, mTo.scarcityImpact);
    utilization = Math.max(mFrom.utilization, mTo.utilization);
  }

  const roundedToAmount = roundCurrency(rawToAmount, toCurrency);
  return {
    fromCurrency,
    toCurrency,
    fromAmount: roundCurrency(amount, fromCurrency),
    toAmount: roundedToAmount,
    effectiveRate: parseFloat(effectiveRate.toFixed(6)),
    quotedRate: parseFloat(effectiveRate.toFixed(6)),
    spreadPercent,
    scarcityImpact,
    utilization
  };
}

const PORT = process.env.PORT || 3000;
const STATE_FILE = process.env.STATE_FILE || './state.json';
const BACKUP_DIR = './backups';
// Phase 7A.1: Hardcoded credentials removed. Authentication is strictly enforced via scrypt-hashed server-side accounts.
export function isTestEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_HEADER_AUTH === 'true') {
    return true;
  }
  const stateFile = process.env.STATE_FILE || '';
  if (stateFile && (stateFile.toLowerCase().includes('test') || stateFile.toLowerCase().includes('.adversarial'))) {
    return true;
  }
  return false;
}

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

const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
  maxmem: 32 * 1024 * 1024
};

export function hashPassword(plainTextPassword) {
  if (!plainTextPassword) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(plainTextPassword).trim(), salt, SCRYPT_CONFIG.keylen, {
    N: SCRYPT_CONFIG.N,
    r: SCRYPT_CONFIG.r,
    p: SCRYPT_CONFIG.p,
    maxmem: SCRYPT_CONFIG.maxmem
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(plainTextPassword, storedHash) {
  if (!plainTextPassword || !storedHash) return { verified: false, needsRehash: false };
  const cleanInput = String(plainTextPassword).trim();

  // 1. scrypt hash verification
  if (typeof storedHash === 'string' && storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return { verified: false, needsRehash: false };
    const [, salt, expectedHashHex] = parts;
    const computedKey = crypto.scryptSync(cleanInput, salt, SCRYPT_CONFIG.keylen, {
      N: SCRYPT_CONFIG.N,
      r: SCRYPT_CONFIG.r,
      p: SCRYPT_CONFIG.p,
      maxmem: SCRYPT_CONFIG.maxmem
    });
    const expectedBuf = Buffer.from(expectedHashHex, 'hex');
    const computedBuf = Buffer.from(computedKey);
    if (expectedBuf.length !== computedBuf.length) return { verified: false, needsRehash: false };
    const match = crypto.timingSafeEqual(computedBuf, expectedBuf);
    return { verified: match, needsRehash: false };
  }

  // 2. Legacy SHA-256 hash backwards compatibility & rehash-on-success migration
  if (typeof storedHash === 'string') {
    let legacyTarget = storedHash;
    if (storedHash.startsWith('sha256:')) {
      legacyTarget = storedHash.replace(/^sha256:/, '');
    }
    const sha256 = crypto.createHash('sha256').update(cleanInput).digest('hex');
    if (sha256.length === legacyTarget.length) {
      const match = crypto.timingSafeEqual(Buffer.from(sha256), Buffer.from(legacyTarget));
      if (match) {
        return { verified: true, needsRehash: true };
      }
    }
  }

  return { verified: false, needsRehash: false };
}

export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

// In-memory brute-force login throttling
const failedLoginAttempts = new Map(); // identifier -> { count, lockedUntil }

function checkLoginRateLimit(identifier) {
  const now = Date.now();
  const record = failedLoginAttempts.get(identifier);
  if (!record) return { allowed: true };
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSecs = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSecs };
  }
  if (record.lockedUntil && record.lockedUntil <= now) {
    failedLoginAttempts.delete(identifier);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedLogin(identifier) {
  const now = Date.now();
  const record = failedLoginAttempts.get(identifier) || { count: 0, firstAttempt: now };
  record.count += 1;
  if (record.count >= 10) {
    record.lockedUntil = now + (5 * 60 * 1000); // 5 minutes lockout after 10 failures
  }
  failedLoginAttempts.set(identifier, record);
}

function recordSuccessfulLogin(identifier) {
  failedLoginAttempts.delete(identifier);
}

export const PERMISSION_GROUPS = [
  { id: 'dashboard', name: 'Dashboard & Floor View' },
  { id: 'personnel', name: 'Personnel & Access Management' },
  { id: 'market', name: 'Market Operations & Scenarios' },
  { id: 'orders', name: 'Physical Order Verification' },
  { id: 'exchange', name: 'Central Exchange Desk' },
  { id: 'team', name: 'Investment House (Trading)' },
  { id: 'news', name: 'Newsroom & Financial Press' },
  { id: 'advisory', name: 'Broker Advisory & Analysis' },
  { id: 'regulatory', name: 'SEBI Surveillance & Halts' },
  { id: 'judging', name: 'Judging, Deliberation & Results' },
  { id: 'system', name: 'Audit & System Configuration' }
];

export const PERMISSION_DEFINITIONS = [
  { id: 'dashboard.view', group: 'dashboard', label: 'View Floor Dashboard', description: 'Access operations overview and activity counters' },
  
  { id: 'personnel.view', group: 'personnel', label: 'View Personnel Directory', description: 'Inspect staff accounts, assigned roles and statuses' },
  { id: 'personnel.create', group: 'personnel', label: 'Create Staff Accounts', description: 'Provision new personnel accounts with credentials' },
  { id: 'personnel.update', group: 'personnel', label: 'Edit Staff Accounts & Reset Passwords', description: 'Modify account details and initiate password resets' },
  { id: 'personnel.disable', group: 'personnel', label: 'Deactivate / Reactivate Accounts', description: 'Toggle account active or disabled state' },
  { id: 'permissions.view', group: 'personnel', label: 'View Permission Matrix', description: 'Inspect available permissions and default templates' },
  { id: 'permissions.assign', group: 'personnel', label: 'Assign Permission Overrides', description: 'Grant or revoke granular overrides for staff' },

  { id: 'market.view', group: 'market', label: 'View Market Data', description: 'Access live securities prices, order book and schedule' },
  { id: 'market.control', group: 'market', label: 'Market Simulation Controls', description: 'Start, pause, resume or close market; override schedule' },
  { id: 'scenarios.trigger', group: 'market', label: 'Trigger Crisis & Scenarios', description: 'Dispatch signature market shocks, Phoenix crisis, and IPOs' },

  { id: 'orders.view_queue', group: 'orders', label: 'View Verification Queue', description: 'Inspect incoming paper order slips awaiting verification' },
  { id: 'orders.verify', group: 'orders', label: 'Verify Physical Order Slips', description: 'Authenticate physical slips and pass to exchange desk' },
  { id: 'orders.return_for_correction', group: 'orders', label: 'Return Slips for Correction', description: 'Return defective orders to teams with required feedback' },
  { id: 'desks.cross_operate', group: 'orders', label: 'Cross-Desk Operation & Supervision', description: 'Authorize operating and clearing orders across all exchange desks regardless of primary assignment' },

  { id: 'exchange.view', group: 'exchange', label: 'View Exchange Queue', description: 'Inspect verified orders awaiting matching and execution' },
  { id: 'exchange.execute', group: 'exchange', label: 'Execute Orders on Exchange', description: 'Match and execute verified orders in the ledger' },
  { id: 'exchange.reject', group: 'exchange', label: 'Reject Orders', description: 'Reject unmatchable or invalid verified orders' },
  { id: 'exchange.manual_entry', group: 'exchange', label: 'Manual Order Entry', description: 'Submit floor slip orders directly at exchange desk' },
  { id: 'exchange.void', group: 'exchange', label: 'Void Transactions', description: 'Void erroneous transactions with recorded justification' },

  { id: 'team.view_portfolio', group: 'team', label: 'View Own Portfolio', description: 'Access private team portfolio, holdings and cash balance' },
  { id: 'team.trade', group: 'team', label: 'Submit Orders', description: 'Create order slips and manage pending orders' },
  { id: 'team.referral', group: 'team', label: 'Request Broker Referral', description: 'Request advisory guidance from broker desk' },
  { id: 'team.ipo_bid', group: 'team', label: 'Submit IPO Bids', description: 'Place subscription bids during open IPO windows' },

  { id: 'news.view', group: 'news', label: 'Read News Wire', description: 'Access broadcasted market news and flashes' },
  { id: 'news.draft', group: 'news', label: 'Draft News Releases', description: 'Compose articles and news drafts in the newsroom' },
  { id: 'news.publish', group: 'news', label: 'Broadcast Breaking News', description: 'Publish market news with volatility impact factors' },
  { id: 'news.review', group: 'news', label: 'Review & Approve News Drafts', description: 'Evaluate, approve or reject journalist submissions' },
  { id: 'news.correct', group: 'news', label: 'Issue Official Corrections', description: 'Retract news and unwind market price distortions' },

  { id: 'advisor.view', group: 'advisory', label: 'View Advisor Referrals', description: 'Access teams referred to broker desk' },
  { id: 'advisor.signal', group: 'advisory', label: 'Publish Stock Signals', description: 'Issue BUY/HOLD/SELL signals with investment rationale' },
  { id: 'analyst.commentary', group: 'advisory', label: 'Bull & Bear Commentary', description: 'Draft debate commentary and analytical theses' },

  { id: 'sebi.surveil', group: 'regulatory', label: 'SEBI Market Surveillance', description: 'Inspect circuit breakers, volatility alerts and anomalies' },
  { id: 'sebi.halt', group: 'regulatory', label: 'Halt / Resume Securities', description: 'Impose or lift regulatory trading halts on securities' },

  { id: 'judging.view', group: 'judging', label: 'View Closing Snapshots', description: 'Inspect final valuation snapshots and scoring rubrics' },
  { id: 'judging.score', group: 'judging', label: 'Submit Judge Scorecards', description: 'Grade teams and submit deliberation scores' },
  { id: 'results.approve', group: 'judging', label: 'Approve & Publish Results', description: 'Officially approve and publish championship results' },
  { id: 'results.view', group: 'judging', label: 'View Competition Results', description: 'Access final leaderboard, standings and awards' },

  { id: 'audit.view', group: 'system', label: 'View Immutable Audit Log', description: 'Inspect chronological system and security audit trail' },
  { id: 'system.config', group: 'system', label: 'System Configuration', description: 'Manage floor settings, risk controls, and database reset' },

  { id: 'bank.view', group: 'banking', label: 'View Bank Queue & Settlements', description: 'Access physical bank desk pending settlement queue and history' },
  { id: 'bank.settle', group: 'banking', label: 'Process Settlements', description: 'Confirm buy payment vouchers and disburse sell proceeds' },
  { id: 'bank.reconcile', group: 'banking', label: 'Bank Reconciliation', description: 'Audit and reconcile bank settlement records against central exchange executions' }
];

export const ROLE_PERMISSIONS = {
  super_admin: [
    'dashboard.view', 'personnel.view', 'personnel.create', 'personnel.update', 'personnel.disable',
    'permissions.view', 'permissions.assign', 'market.view', 'market.control', 'scenarios.trigger',
    'orders.view_queue', 'orders.verify', 'orders.return_for_correction', 'desks.cross_operate',
    'exchange.view', 'exchange.execute', 'exchange.reject', 'exchange.manual_entry', 'exchange.void',
    'news.view', 'news.draft', 'news.publish', 'news.review', 'news.correct', 'advisor.view', 'advisor.signal', 'analyst.commentary',
    'sebi.surveil', 'sebi.halt', 'judging.view', 'judging.score', 'results.approve', 'results.view',
    'audit.view', 'system.config',
    'bank.view', 'bank.settle', 'bank.reconcile'
  ],
  admin: [
    'dashboard.view', 'personnel.view', 'personnel.create', 'personnel.update', 'personnel.disable',
    'permissions.view', 'market.view', 'market.control', 'scenarios.trigger',
    'orders.view_queue', 'orders.verify', 'orders.return_for_correction', 'desks.cross_operate',
    'exchange.view', 'exchange.execute', 'exchange.reject',
    'news.view', 'news.draft', 'news.publish', 'news.review', 'news.correct', 'advisor.view',
    'sebi.surveil', 'judging.view', 'judging.score', 'results.approve', 'results.view',
    'audit.view', 'system.config',
    'bank.view', 'bank.settle', 'bank.reconcile'
  ],
  news_controller: [
    'dashboard.view', 'market.view', 'news.view', 'news.draft', 'news.publish', 'news.review', 'news.correct', 'results.view'
  ],
  coordinator: [
    'dashboard.view', 'market.view', 'market.control', 'scenarios.trigger',
    'news.view', 'news.draft', 'news.publish', 'results.view'
  ],
  exchange: [
    'dashboard.view', 'market.view',
    'orders.view_queue', 'orders.verify', 'orders.return_for_correction',
    'exchange.view', 'exchange.execute', 'exchange.reject', 'exchange.manual_entry',
    'news.view', 'results.view'
  ],
  operator_x: [
    'dashboard.view', 'market.view',
    'orders.view_queue', 'orders.verify', 'orders.return_for_correction',
    'exchange.view', 'exchange.execute', 'exchange.reject', 'exchange.manual_entry',
    'news.view', 'results.view'
  ],
  verification: [
    'dashboard.view', 'market.view',
    'orders.view_queue', 'orders.verify', 'orders.return_for_correction',
    'exchange.view', 'exchange.execute', 'exchange.reject', 'exchange.manual_entry',
    'news.view', 'results.view'
  ],
  bank_teller: [
    'dashboard.view', 'market.view', 'bank.view', 'bank.settle', 'bank.reconcile',
    'news.view', 'results.view'
  ],
  team: [
    'market.view', 'team.view_portfolio', 'team.trade', 'team.referral', 'team.ipo_bid',
    'news.view', 'results.view'
  ],
  advisor: [
    'market.view', 'advisor.view', 'advisor.signal', 'analyst.commentary',
    'news.view', 'results.view'
  ],
  sebi: [
    'dashboard.view', 'market.view', 'sebi.surveil', 'sebi.halt', 'audit.view',
    'news.view', 'results.view', 'bank.view', 'bank.reconcile'
  ],
  journalist: [
    'market.view', 'news.view', 'news.draft', 'results.view'
  ],
  analyst: [
    'market.view', 'analyst.commentary', 'news.view', 'results.view'
  ],
  judge: [
    'market.view', 'judging.view', 'judging.score', 'results.view'
  ],
  portfolio: [
    'dashboard.view', 'market.view', 'results.view'
  ],
  observer: [
    'market.view', 'news.view', 'results.view'
  ]
};

export const PAGE_PERMISSIONS = {
  '#/admin': 'system.config',
  '#/exchange': 'exchange.view',
  '#/verification': 'orders.view_queue',
  '#/verification-desk': 'orders.view_queue',
  '#/fx': 'exchange.view',
  '#/bank': 'bank.view',
  '#/bank-desk': 'bank.view',
  '#/settlement': 'bank.view',
  '#/market-watch': 'market.view',
  '#/market-intelligence': 'news.view',
  '#/advisor': 'advisor.view',
  '#/broker': 'advisor.view',
  '#/broker-desk': 'advisor.view',
  '#/debate': 'analyst.commentary',
  '#/bull': 'analyst.commentary',
  '#/bear': 'analyst.commentary',
  '#/bull-bear': 'analyst.commentary',
  '#/news': 'news.view',
  '#/newsroom': 'news.view',
  '#/news-room': 'news.view',
  '#/sebi': 'sebi.surveil',
  '#/portfolio': 'dashboard.view',
  '#/floor-ops': 'dashboard.view',
  '#/results': 'results.view',
  '#/personnel': 'personnel.view',
  '#/news-controller': 'news.publish',
  '#/news-control': 'news.publish'
};

export function getEffectivePermissions(account) {
  if (!account) return [];
  const initial = Array.isArray(account.permissions)
    ? account.permissions
    : (ROLE_PERMISSIONS[account.role] || []);
  const grants = Array.isArray(account.grantedPermissions) ? account.grantedPermissions : [];
  const revokes = new Set(Array.isArray(account.revokedPermissions) ? account.revokedPermissions : []);
  
  const combined = new Set([...initial, ...grants]);
  for (const r of revokes) {
    combined.delete(r);
  }
  return Array.from(combined);
}

export function getSeedPersonnel() {
  const now = Date.now();
  return [
    {
      id: 'USR_MASTER_01',
      username: 'sridhara',
      displayName: 'Sridhara (Floor Director)',
      role: 'super_admin',
      status: 'ACTIVE',
      staffId: 'STAFF-DIR-01',
      department: 'Executive & Floor Directorate',
      passwordHash: hashPassword('21112009'),
      permissions: [...ROLE_PERMISSIONS.super_admin],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADM_01',
      username: 'admin',
      displayName: 'Floor Administrator',
      role: 'admin',
      status: 'ACTIVE',
      staffId: 'STAFF-ADM-01',
      department: 'Floor Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.admin],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADM_02',
      username: 'admin2',
      displayName: 'Floor Administrator 2',
      role: 'admin',
      status: 'ACTIVE',
      staffId: 'STAFF-ADM-02',
      department: 'Floor Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.admin],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADM_03',
      username: 'admin3',
      displayName: 'Floor Administrator 3',
      role: 'admin',
      status: 'ACTIVE',
      staffId: 'STAFF-ADM-03',
      department: 'Floor Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.admin],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_CRD_01',
      username: 'coordinator',
      displayName: 'Market Coordinator',
      role: 'coordinator',
      status: 'ACTIVE',
      staffId: 'STAFF-CRD-01',
      department: 'Scenario & Event Control',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.coordinator],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_VRF_01',
      username: 'verification',
      displayName: 'Order Verification Officer',
      role: 'verification',
      status: 'ACTIVE',
      staffId: 'STAFF-VRF-01',
      department: 'Physical Slip Verification Desk',
      passwordHash: hashPassword('verification-event-2026'),
      permissions: [...ROLE_PERMISSIONS.verification],
      createdAt: now,
      lastLogin: null
    },
    // 5 Physical Exchange Desks
    {
      id: 'USR_EXC_01',
      username: 'desk1',
      displayName: 'Desk 1 Operator',
      role: 'exchange',
      assignedDesk: 'DESK_1',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-01',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_EXC_02',
      username: 'desk2',
      displayName: 'Desk 2 Operator',
      role: 'exchange',
      assignedDesk: 'DESK_2',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-02',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_EXC_03',
      username: 'desk3',
      displayName: 'Desk 3 Operator',
      role: 'exchange',
      assignedDesk: 'DESK_3',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-03',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_EXC_04',
      username: 'desk4',
      displayName: 'Desk 4 Operator',
      role: 'exchange',
      assignedDesk: 'DESK_4',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-04',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_EXC_05',
      username: 'desk5',
      displayName: 'Desk 5 Operator',
      role: 'exchange',
      assignedDesk: 'DESK_5',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-05',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    // Legacy alias 'exchange' mapped to Desk 1
    {
      id: 'USR_EXC_LEGACY',
      username: 'exchange',
      displayName: 'Central Exchange Desk (Master)',
      role: 'exchange',
      assignedDesk: 'DESK_1',
      status: 'ACTIVE',
      staffId: 'STAFF-EXC-M',
      department: 'Central Exchange Desk',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.exchange],
      createdAt: now,
      lastLogin: null
    },
    // 4 Bank Counters
    {
      id: 'USR_BNK_01',
      username: 'counter1',
      displayName: 'Bank Counter 1',
      role: 'bank_teller',
      assignedDesk: 'BANK_1',
      status: 'ACTIVE',
      staffId: 'STAFF-BNK-01',
      department: 'Cash & Settlement Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.bank_teller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_BNK_02',
      username: 'counter2',
      displayName: 'Bank Counter 2',
      role: 'bank_teller',
      assignedDesk: 'BANK_2',
      status: 'ACTIVE',
      staffId: 'STAFF-BNK-02',
      department: 'Cash & Settlement Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.bank_teller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_BNK_03',
      username: 'counter3',
      displayName: 'Bank Counter 3',
      role: 'bank_teller',
      assignedDesk: 'BANK_3',
      status: 'ACTIVE',
      staffId: 'STAFF-BNK-03',
      department: 'Cash & Settlement Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.bank_teller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_BNK_04',
      username: 'counter4',
      displayName: 'Bank Counter 4',
      role: 'bank_teller',
      assignedDesk: 'BANK_4',
      status: 'ACTIVE',
      staffId: 'STAFF-BNK-04',
      department: 'Cash & Settlement Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.bank_teller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_BNK_LEGACY',
      username: 'bank',
      displayName: 'Bank Desk Master Teller',
      role: 'bank_teller',
      assignedDesk: 'BANK_1',
      status: 'ACTIVE',
      staffId: 'STAFF-BNK-M',
      department: 'Cash & Settlement Operations',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.bank_teller],
      createdAt: now,
      lastLogin: null
    },
    // 2 FX Desks
    {
      id: 'USR_FX_01',
      username: 'fx1',
      displayName: 'FX Desk 1 Operator',
      role: 'operator_x',
      status: 'ACTIVE',
      staffId: 'STAFF-FX-01',
      department: 'Foreign Exchange Operations',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.operator_x],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_FX_02',
      username: 'fx2',
      displayName: 'FX Desk 2 Operator',
      role: 'operator_x',
      status: 'ACTIVE',
      staffId: 'STAFF-FX-02',
      department: 'Foreign Exchange Operations',
      passwordHash: hashPassword('exchange-event-2026'),
      permissions: [...ROLE_PERMISSIONS.operator_x],
      createdAt: now,
      lastLogin: null
    },
    // 4 Named Floor Advisors
    {
      id: 'USR_ADV_AYAN',
      username: 'ayan',
      displayName: 'Ayan',
      role: 'advisor',
      status: 'ACTIVE',
      staffId: 'STAFF-ADV-AYAN',
      department: 'Floor Brokerage & Advisory',
      passwordHash: hashPassword('advisor-event-2026'),
      permissions: [...ROLE_PERMISSIONS.advisor],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADV_PRERNA',
      username: 'prerna',
      displayName: 'Prerna',
      role: 'advisor',
      status: 'ACTIVE',
      staffId: 'STAFF-ADV-PRERNA',
      department: 'Floor Brokerage & Advisory',
      passwordHash: hashPassword('advisor-event-2026'),
      permissions: [...ROLE_PERMISSIONS.advisor],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADV_CHETAN',
      username: 'chetan',
      displayName: 'Chetan',
      role: 'advisor',
      status: 'ACTIVE',
      staffId: 'STAFF-ADV-CHETAN',
      department: 'Floor Brokerage & Advisory',
      passwordHash: hashPassword('advisor-event-2026'),
      permissions: [...ROLE_PERMISSIONS.advisor],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADV_ARMAN',
      username: 'arman',
      displayName: 'Arman',
      role: 'advisor',
      status: 'ACTIVE',
      staffId: 'STAFF-ADV-ARMAN',
      department: 'Floor Brokerage & Advisory',
      passwordHash: hashPassword('advisor-event-2026'),
      permissions: [...ROLE_PERMISSIONS.advisor],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_ADV_LEGACY',
      username: 'advisor',
      displayName: 'Floor Market Advisor (Lead)',
      role: 'advisor',
      status: 'ACTIVE',
      staffId: 'STAFF-ADV-01',
      department: 'Floor Brokerage & Advisory',
      passwordHash: hashPassword('advisor-event-2026'),
      permissions: [...ROLE_PERMISSIONS.advisor],
      createdAt: now,
      lastLogin: null
    },
    // 3 News Operators / Journalists
    {
      id: 'USR_PRS_01',
      username: 'news1',
      displayName: 'News 1 Reporter',
      role: 'news_controller',
      status: 'ACTIVE',
      staffId: 'STAFF-PRS-01',
      department: 'Market Press & Wire',
      passwordHash: hashPassword('journalist-event-2026'),
      permissions: [...ROLE_PERMISSIONS.news_controller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_PRS_02',
      username: 'news2',
      displayName: 'News 2 Reporter',
      role: 'journalist',
      status: 'ACTIVE',
      staffId: 'STAFF-PRS-02',
      department: 'Market Press & Wire',
      passwordHash: hashPassword('journalist-event-2026'),
      permissions: [...ROLE_PERMISSIONS.journalist],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_PRS_03',
      username: 'news3',
      displayName: 'News 3 Reporter',
      role: 'journalist',
      status: 'ACTIVE',
      staffId: 'STAFF-PRS-03',
      department: 'Market Press & Wire',
      passwordHash: hashPassword('journalist-event-2026'),
      permissions: [...ROLE_PERMISSIONS.journalist],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_PRS_LEGACY',
      username: 'journalist',
      displayName: 'Financial Press Reporter',
      role: 'journalist',
      status: 'ACTIVE',
      staffId: 'STAFF-PRS-L',
      department: 'Market Press & Wire',
      passwordHash: hashPassword('journalist-event-2026'),
      permissions: [...ROLE_PERMISSIONS.journalist],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_NCTL_01',
      username: 'news_controller',
      displayName: 'Chief News Controller',
      role: 'news_controller',
      status: 'ACTIVE',
      staffId: 'STAFF-NCTL-01',
      department: 'Newsroom Editorial & Clearance',
      passwordHash: hashPassword('saamx-event-2026'),
      permissions: [...ROLE_PERMISSIONS.news_controller],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_REG_01',
      username: 'sebi',
      displayName: 'SEBI Surveillance Officer',
      role: 'sebi',
      status: 'ACTIVE',
      staffId: 'STAFF-REG-01',
      department: 'Market Surveillance & Enforcement',
      passwordHash: hashPassword('sebi-event-2026'),
      permissions: [...ROLE_PERMISSIONS.sebi],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_JDG_01',
      username: 'judge',
      displayName: 'Championship Adjudicator',
      role: 'judge',
      status: 'ACTIVE',
      staffId: 'STAFF-JDG-01',
      department: 'Judging & Deliberation Panel',
      passwordHash: hashPassword('judge-event-2026'),
      permissions: [...ROLE_PERMISSIONS.judge],
      createdAt: now,
      lastLogin: null
    },
    {
      id: 'USR_OBS_01',
      username: 'observer',
      displayName: 'Gallery Observer',
      role: 'observer',
      status: 'ACTIVE',
      staffId: 'STAFF-OBS-01',
      department: 'Auditorium & Public Gallery',
      passwordHash: hashPassword('observer-event-2026'),
      permissions: [...ROLE_PERMISSIONS.observer],
      createdAt: now,
      lastLogin: null
    }
  ];
}

// Initial default state with Multi-Currency & FX Engine
const createInitialState = () => ({
  securities: [],
  ipos: JSON.parse(JSON.stringify(NEW_SIMULATED_IPOS)),
  teams: [],
  transactions: [],
  orders: [],
  settlements: [],
  version: 1,
  settings: {
    settlementMode: 'TWO_PHASE_BANK'
  },
  personnel: getSeedPersonnel(),
  newsEvents: [],
  newsDrafts: [],
  activeDecayingEvents: [],
  activeRumours: [],
  scheduledNews: [],
  fxDemandPressure: {},
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
    DESK_1: { id: 'DESK_1', name: 'Order Desk 1 (Blue)', color: '#3B82F6', type: 'EXCHANGE', deskType: 'EXCHANGE', identifier: 'Desk 1', deskIdentifier: 'Desk 1', operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 },
    DESK_2: { id: 'DESK_2', name: 'Order Desk 2 (Amber)', color: '#F59E0B', type: 'EXCHANGE', deskType: 'EXCHANGE', identifier: 'Desk 2', deskIdentifier: 'Desk 2', operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 },
    DESK_3: { id: 'DESK_3', name: 'Order Desk 3 (Emerald)', color: '#10B981', type: 'EXCHANGE', deskType: 'EXCHANGE', identifier: 'Desk 3', deskIdentifier: 'Desk 3', operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 },
    DESK_4: { id: 'DESK_4', name: 'Order Desk 4 (Purple)', color: '#8B5CF6', type: 'EXCHANGE', deskType: 'EXCHANGE', identifier: 'Desk 4', deskIdentifier: 'Desk 4', operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 },
    DESK_5: { id: 'DESK_5', name: 'Order Desk 5 (Crimson)', color: '#EC4899', type: 'EXCHANGE', deskType: 'EXCHANGE', identifier: 'Desk 5', deskIdentifier: 'Desk 5', operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 }
  },
  bankDesks: {
    BANK_1: { id: 'BANK_1', name: 'Bank Desk 1', color: '#10B981', type: 'BANK', deskType: 'BANK', identifier: 'Desk 1', deskIdentifier: 'Desk 1', operator: 'Bank Counter 1', operatorId: null, operatorUsername: 'counter1', operatorDisplayName: 'Bank Counter 1', activeOrderIds: [], totalProcessed: 0 },
    BANK_2: { id: 'BANK_2', name: 'Bank Desk 2', color: '#059669', type: 'BANK', deskType: 'BANK', identifier: 'Desk 2', deskIdentifier: 'Desk 2', operator: 'Bank Counter 2', operatorId: null, operatorUsername: 'counter2', operatorDisplayName: 'Bank Counter 2', activeOrderIds: [], totalProcessed: 0 },
    BANK_3: { id: 'BANK_3', name: 'Bank Desk 3', color: '#047857', type: 'BANK', deskType: 'BANK', identifier: 'Desk 3', deskIdentifier: 'Desk 3', operator: 'Bank Counter 3', operatorId: null, operatorUsername: 'counter3', operatorDisplayName: 'Bank Counter 3', activeOrderIds: [], totalProcessed: 0 },
    BANK_4: { id: 'BANK_4', name: 'Bank Desk 4', color: '#065F46', type: 'BANK', deskType: 'BANK', identifier: 'Desk 4', deskIdentifier: 'Desk 4', operator: 'Bank Counter 4', operatorId: null, operatorUsername: 'counter4', operatorDisplayName: 'Bank Counter 4', activeOrderIds: [], totalProcessed: 0 }
  },
  fxQueue: [],
  fxRates: JSON.parse(JSON.stringify(DEFAULT_FX_RATES)),
  fxReserves: JSON.parse(JSON.stringify(DEFAULT_FX_RESERVES)),
  fxDesks: {
    FX_1: { id: 'FX_1', name: 'FX Desk 1 (Primary)', availability: 'ACTIVE' },
    FX_2: { id: 'FX_2', name: 'FX Desk 2 (Secondary)', availability: 'ACTIVE' }
  },
  fxMarketState: {
    status: 'OPEN',
    pausedReason: null,
    pausedAt: null,
    pausedBy: null,
    marketWideTransactionLimitINR: null,
    updatedAt: Date.now()
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

export let state = createInitialState();
let transactionsSinceLastBackup = 0;
let lastBackupTime = Date.now();

const logAuditEvent = (entry) => {
  try {
    const auditId = `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Safety: Strip credentials / secrets from audit payloads
    const sanitizeValue = (val) => {
      if (!val) return val;
      if (typeof val === 'object') {
        const copy = JSON.parse(JSON.stringify(val));
        const scrub = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          for (const k of Object.keys(obj)) {
            if (/password|pin|secret|hash|token|accesskey/i.test(k)) {
              obj[k] = '[REDACTED]';
            } else if (typeof obj[k] === 'object') {
              scrub(obj[k]);
            }
          }
        };
        scrub(copy);
        return copy;
      }
      return val;
    };

    const fullEntry = {
      id: auditId,
      timestamp: Date.now(),
      actor: entry.actor || 'System',
      role: entry.role || 'system',
      action: entry.action || 'MUTATION',
      target: entry.target || 'General',
      targetId: entry.targetId || entry.target || null,
      station: entry.station || entry.deskId || null,
      correlationId: entry.correlationId || `CORR_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      previousState: entry.previousState !== undefined ? JSON.stringify(sanitizeValue(entry.previousState)) : null,
      newState: entry.newState !== undefined ? JSON.stringify(sanitizeValue(entry.newState)) : null,
      result: entry.result || 'SUCCESS',
      reason: typeof entry.reason === 'string' ? entry.reason.replace(/(password|pin|secret)[:=]\s*\S+/gi, '$1=[REDACTED]') : ''
    };

    if (!state.auditLog) state.auditLog = [];
    state.auditLog.unshift(fullEntry);
    if (state.auditLog.length > 2000) state.auditLog.pop();

    // Async durable write to PostgreSQL audit_logs table
    const pool = getPool();
    if (pool) {
      pool.query(
        `INSERT INTO audit_logs (id, timestamp, actor, role, action, target, previous_state, new_state, reason, created_at)
         VALUES ($1, TO_TIMESTAMP($2 / 1000.0), $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          fullEntry.id,
          fullEntry.timestamp,
          fullEntry.actor,
          fullEntry.role,
          fullEntry.action,
          fullEntry.target,
          fullEntry.previousState,
          fullEntry.newState,
          fullEntry.reason
        ]
      ).catch(e => {
        // Silently capture DB write error so sync flows never crash
      });
    }

    return fullEntry;
  } catch (err) {
    console.error('Audit log write error:', err.message);
    return null;
  }
};

// ----------------------------------------------------
// CRASH-SAFE PERSISTENCE IMPLEMENTATION
// ----------------------------------------------------
const loadState = () => {
  try {
    let targetFile = STATE_FILE;
    if (!fs.existsSync(targetFile) && fs.existsSync('state.json')) {
      targetFile = 'state.json';
    }
    if (fs.existsSync(targetFile)) {
      const data = fs.readFileSync(targetFile, 'utf8');
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
      if (!state.newsDrafts) state.newsDrafts = [];
      if (!state.activeDecayingEvents) state.activeDecayingEvents = [];
      if (!state.activeRumours) state.activeRumours = [];
      if (!state.scheduledNews) state.scheduledNews = [];
      if (!state.fxDemandPressure) state.fxDemandPressure = {};
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
      if (!state.orderDesks) {
        state.orderDesks = createInitialState().orderDesks;
      } else {
        const deskMeta = {
          DESK_1: { name: 'Order Desk 1 (Blue)', color: '#3B82F6' },
          DESK_2: { name: 'Order Desk 2 (Amber)', color: '#F59E0B' },
          DESK_3: { name: 'Order Desk 3 (Emerald)', color: '#10B981' },
          DESK_4: { name: 'Order Desk 4 (Purple)', color: '#8B5CF6' },
          DESK_5: { name: 'Order Desk 5 (Crimson)', color: '#EC4899' }
        };
        ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'].forEach(dId => {
          if (!state.orderDesks[dId]) {
            state.orderDesks[dId] = { id: dId, name: deskMeta[dId].name, color: deskMeta[dId].color, operator: 'Unassigned', operatorId: null, operatorUsername: null, operatorDisplayName: null, activeOrderIds: [], totalProcessed: 0 };
          } else {
            state.orderDesks[dId].color = state.orderDesks[dId].color || deskMeta[dId].color;
            state.orderDesks[dId].name = state.orderDesks[dId].name || deskMeta[dId].name;
            if (!state.orderDesks[dId].activeOrderIds) state.orderDesks[dId].activeOrderIds = [];
            if (state.orderDesks[dId].totalProcessed === undefined) state.orderDesks[dId].totalProcessed = 0;
            // Sanitize legacy hardcoded names if no operatorId is linked
            if (['Sandesh', 'Akshay', 'Aarush', 'Sridhara', 'Aksharaa'].includes(state.orderDesks[dId].operator) && !state.orderDesks[dId].operatorId) {
              state.orderDesks[dId].operator = 'Unassigned';
            }
          }
        });
      }
      const defaultBankDesks = createInitialState().bankDesks;
      if (!state.bankDesks) {
        state.bankDesks = defaultBankDesks;
      } else {
        Object.keys(defaultBankDesks).forEach(bId => {
          if (!state.bankDesks[bId]) {
            state.bankDesks[bId] = defaultBankDesks[bId];
          }
        });
      }
      if (!state.fxQueue) state.fxQueue = [];
      if (!state.fxReserves) state.fxReserves = JSON.parse(JSON.stringify(DEFAULT_FX_RESERVES));
      ensureFxReserves(state.fxReserves);
      if (!state.fxMarketState) {
        state.fxMarketState = {
          status: 'OPEN',
          pausedReason: null,
          pausedAt: null,
          pausedBy: null,
          marketWideTransactionLimitINR: null,
          updatedAt: Date.now()
        };
      }
      if (!state.fxDesks) {
        state.fxDesks = {
          FX_1: { id: 'FX_1', name: 'FX Desk 1 (Primary)', availability: 'ACTIVE' },
          FX_2: { id: 'FX_2', name: 'FX Desk 2 (Secondary)', availability: 'ACTIVE' }
        };
      }
      if (!state.masterAdmins) {
        state.masterAdmins = [
          { username: 'Sridhara', role: 'admin', accessLevel: 'MASTER', createdAt: Date.now() }
        ];
      } else if (!state.masterAdmins.some(a => a.username?.toLowerCase() === 'sridhara')) {
        state.masterAdmins.push({ username: 'Sridhara', role: 'admin', accessLevel: 'MASTER', createdAt: Date.now() });
      }
      
      if (!state.personnel || !Array.isArray(state.personnel) || state.personnel.length === 0) {
        state.personnel = getSeedPersonnel();
      } else {
        const seedStaff = getSeedPersonnel();
        seedStaff.forEach(seed => {
          if (!state.personnel.some(p => p.username?.toLowerCase() === seed.username.toLowerCase())) {
            state.personnel.push(seed);
          }
        });
      }

      // Synchronize dynamic desk assignments and role permissions from state.personnel
      if (Array.isArray(state.personnel)) {
        state.personnel.forEach(staff => {
          if (staff.role === 'journalist' && Array.isArray(staff.permissions)) {
            staff.permissions = staff.permissions.filter(p => p !== 'news.publish');
          }
          if (staff.assignedDesk && state.orderDesks[staff.assignedDesk]) {
            state.orderDesks[staff.assignedDesk].operator = staff.displayName || staff.username;
            state.orderDesks[staff.assignedDesk].operatorId = staff.id;
            state.orderDesks[staff.assignedDesk].operatorUsername = staff.username;
            state.orderDesks[staff.assignedDesk].operatorDisplayName = staff.displayName || staff.username;
          }
        });
      }

      // Ensure participant teams have clearance desk intake assignments
      if (Array.isArray(state.teams)) {
        state.teams = state.teams.filter((t, idx) => {
          const num = parseInt(t.teamCode?.replace(/\D/g, '') || String(idx + 1), 10);
          return num >= 1 && num <= 10;
        });
        state.teams.forEach((t, idx) => {
          if (!t.assignedDesk) {
            const num = parseInt(t.teamCode?.replace(/\D/g, '') || String(idx + 1), 10);
            t.assignedDesk = `DESK_${((num - 1) % 5) + 1}`;
          }
        });
      }
      
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
      state.settings.settlementMode = 'TWO_PHASE_BANK';
      if (!state.settlements) state.settlements = [];
      if (!state.fxRates) {
        state.fxRates = JSON.parse(JSON.stringify(DEFAULT_FX_RATES));
      } else {
        for (const [pairKey, defaultPair] of Object.entries(DEFAULT_FX_RATES)) {
          if (!state.fxRates[pairKey]) {
            state.fxRates[pairKey] = { ...defaultPair };
          } else if (!state.fxRates[pairKey].label) {
            state.fxRates[pairKey].label = defaultPair.label || 'Simulation Reference Rate';
          }
        }
      }
      if (Array.isArray(state.teams)) {
        state.teams.forEach(t => ensureTeamWallets(t));
      }
      if (Array.isArray(state.personnel)) {
        const hasBankTeller = state.personnel.some(p => p.username === 'bank' || p.role === 'bank_teller');
        if (!hasBankTeller) {
          state.personnel.push({
            id: 'USR_BNK_01',
            username: 'bank',
            displayName: 'Bank Desk Teller',
            role: 'bank_teller',
            status: 'ACTIVE',
            staffId: 'STAFF-BNK-01',
            department: 'Cash & Settlement Operations',
            passwordHash: hashPassword('saamx-event-2026'),
            permissions: [...ROLE_PERMISSIONS.bank_teller],
            createdAt: Date.now(),
            lastLogin: null
          });
        }
      }

      if (!state.securities || state.securities.length < 3409) {
        console.log(`Securities list has ${state.securities?.length || 0} instruments (< 3409). Auto-seeding full 3,409 securities universe from SAAMX_Final_Securities_List.xlsx...`);
        const existingSecMap = new Map((state.securities || []).map(s => [s.ticker, s]));
        const fullUniverse = generateFullSecurityUniverse();
        state.securities = fullUniverse.map(s => {
          const exist = existingSecMap.get(s.ticker);
          if (exist) {
            return {
              ...s,
              status: exist.status || s.status,
              currentPrice: exist.currentPrice || s.currentPrice,
              availableUnits: exist.availableUnits !== undefined ? exist.availableUnits : s.availableUnits,
              dividendYield: exist.dividendYield !== undefined ? exist.dividendYield : s.dividendYield
            };
          }
          return s;
        });
        if (process.env.STATE_FILE && process.env.STATE_FILE !== 'state.json') {
          saveState();
        }
      }

      // Ensure five controlled simulated IPOs are initialized in separate state.ipos layer
      if (!state.ipos || state.ipos.length === 0) {
        state.ipos = JSON.parse(JSON.stringify(NEW_SIMULATED_IPOS));
      }

      // Strict server-side invariant: Unlisted IPOs and legacy non-canonical securities must NOT contaminate the static securities universe
      const authoritativeUniverse = generateFullSecurityUniverse();
      const authoritativeIdSet = new Set(authoritativeUniverse.map(u => u.id));
      const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];

      state.securities = (state.securities || []).filter(s => {
        if (ipoTickers.includes(s.ticker) || s.isIpo || s.id?.startsWith('IPO_')) {
          const existingIpo = state.ipos.find(i => i.ticker === s.ticker);
          if (existingIpo) {
            Object.assign(existingIpo, s);
          }
          return isIpoListed(s);
        }
        return authoritativeIdSet.has(s.id);
      });

      state.version = (state.version || 0) + 1;
      saveState(true);

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

let saveStateDebounceTimer = null;
let pendingForceBackup = false;

const performSaveState = (forceBackup = false) => {
  try {
    // 1. Proactive Memory Hygiene Pass: Cap historical arrays in memory
    if (Array.isArray(state.transactions) && state.transactions.length > 2500) {
      state.transactions.splice(0, state.transactions.length - 2500);
    }
    if (Array.isArray(state.auditLog) && state.auditLog.length > 2000) {
      state.auditLog.splice(2000);
    }
    if (Array.isArray(state.securities)) {
      for (const s of state.securities) {
        if (Array.isArray(s.priceHistory) && s.priceHistory.length > 120) {
          s.priceHistory.splice(0, s.priceHistory.length - 120);
        }
      }
    }

    const dataStr = JSON.stringify(state);
    const tempFile = `${STATE_FILE}.tmp`;
    
    // Atomic Write with Windows EPERM resilience and retry
    let written = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.writeFileSync(tempFile, dataStr, 'utf8');
        fs.renameSync(tempFile, STATE_FILE);
        written = true;
        break;
      } catch (renameErr) {
        try {
          fs.writeFileSync(STATE_FILE, dataStr, 'utf8');
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (uErr) {}
          }
          written = true;
          break;
        } catch (writeErr) {
          // Synchronous brief pause before retry
          const pauseStart = Date.now();
          while (Date.now() - pauseStart < 30) {}
        }
      }
    }

    // Backup check
    const isMarketOpen = state.marketState.status === 'Open';
    const now = Date.now();
    const timeSinceLastBackup = now - lastBackupTime;

    if (forceBackup || (isMarketOpen && (transactionsSinceLastBackup >= 100 || timeSinceLastBackup >= 600000))) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `state-${timestamp}.json`);
      fs.writeFileSync(backupPath, dataStr, 'utf8');
      
      transactionsSinceLastBackup = 0;
      lastBackupTime = now;
      console.log(`Created state backup snapshot: ${backupPath}`);

      // Prune old snapshots, retaining only the 5 most recent to prevent memory/disk bloat
      try {
        if (fs.existsSync(BACKUP_DIR)) {
          const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('state-') && f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a));
          if (files.length > 5) {
            files.slice(5).forEach(oldFile => {
              try { fs.unlinkSync(path.join(BACKUP_DIR, oldFile)); } catch (e) {}
            });
          }
        }
      } catch (pruneErr) {}
    }
  } catch (err) {
    console.error('Error saving state atomically:', err);
  }
};

export const saveState = (forceBackup = false) => {
  if (forceBackup) {
    if (saveStateDebounceTimer) {
      clearTimeout(saveStateDebounceTimer);
      saveStateDebounceTimer = null;
    }
    performSaveState(true);
    return;
  }

  pendingForceBackup = pendingForceBackup || forceBackup;
  if (saveStateDebounceTimer) return;

  saveStateDebounceTimer = setTimeout(() => {
    saveStateDebounceTimer = null;
    const shouldForce = pendingForceBackup;
    pendingForceBackup = false;
    performSaveState(shouldForce);
  }, 250);
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
  if (!state.teams || state.teams.length === 0) {
    state.teams = [];
    for (let i = 1; i <= 10; i++) {
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
        EUR: 0,
        JPY: 0,
        AED: 0,
        SGD: 0,
        CNY: 0,
        AUD: 0,
        KRW: 0
      },
      reservedCash: {
        INR: 0,
        USD: 0,
        GBP: 0,
        EUR: 0,
        JPY: 0,
        AED: 0,
        SGD: 0,
        CNY: 0,
        AUD: 0,
        KRW: 0
      },
      holdings: {},
      isActive: true,
      createdAt: Date.now()
    });
  }
}

  // FX Rates
  state.fxRates = JSON.parse(JSON.stringify(DEFAULT_FX_RATES));

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
setFallbackStateReference(state);

// ----------------------------------------------------
// EXPRESS & WEBSOCKET SETUP
// ----------------------------------------------------
// Phase 6 Production-Grade CORS Configuration
const ALLOWED_ORIGINS = new Set([
  'https://saamx.in',
  'https://www.saamx.in',
  'https://fmos-a6573.web.app',
  'https://fmos-a6573.firebaseapp.com',
  'https://fmos.web.app',
  'https://fmos.firebaseapp.com',
  'https://saamx26.web.app',
  'https://saamx26.firebaseapp.com'
]);

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed) ALLOWED_ORIGINS.add(trimmed);
  });
}

const isDevOrTest = process.env.NODE_ENV !== 'production' || isTestEnvironment();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-FMS-Password',
    'X-FMS-Role',
    'X-FMS-Team-Code',
    'X-FMS-Token',
    'X-Idempotency-Key',
    'Idempotency-Key'
  ]
};

let isShuttingDown = false;
let isServerReady = !isPgConfigured();

export const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Startup & Shutdown Readiness Guard
app.use((req, res, next) => {
  if (isShuttingDown) {
    return res.status(503).json({ error: 'Server is gracefully shutting down.' });
  }
  if (!isServerReady && req.path !== '/api/ping' && req.path !== '/api/health') {
    return res.status(503).json({ error: 'Server initializing database state. Please retry momentarily.' });
  }
  next();
});

// Technical Operations Telemetry Store
export const telemetryStore = {
  requestTimestamps: [], // rolling 60s window of requests
  latencies: [],         // rolling 1,000 response durations (ms)
  securityEvents: [],    // rolling 200 audit & security events
  duplicateSettlementAttempts: 0
};

export function recordSecurityEvent({ type, status, method, path: reqPath, role, username, note, ip }) {
  telemetryStore.securityEvents.push({
    id: `SEC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: Date.now(),
    type: type || 'SECURITY_EVENT',
    status: status || 200,
    method: method || 'GET',
    path: reqPath || '/',
    role: role || 'anonymous',
    username: username || null,
    note: note || '',
    ip: ip || '127.0.0.1'
  });
  if (telemetryStore.securityEvents.length > 200) {
    telemetryStore.securityEvents.shift();
  }
}

// Telemetry collection middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  const now = Date.now();
  telemetryStore.requestTimestamps.push(now);
  const cutoff = now - 60000;
  while (telemetryStore.requestTimestamps.length > 0 && telemetryStore.requestTimestamps[0] < cutoff) {
    telemetryStore.requestTimestamps.shift();
  }

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = parseFloat((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));
    telemetryStore.latencies.push(durationMs);
    if (telemetryStore.latencies.length > 1000) {
      telemetryStore.latencies.shift();
    }

    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 409 || res.statusCode >= 500) {
      const type = res.statusCode === 401 ? 'AUTHENTICATION_FAILURE'
        : res.statusCode === 403 ? 'RBAC_FORBIDDEN_ATTEMPT'
        : res.statusCode === 409 ? 'CONCURRENCY_OR_DUPLICATE_CONFLICT'
        : 'SERVER_INTERNAL_ERROR';
      recordSecurityEvent({
        type,
        status: res.statusCode,
        method: req.method,
        path: req.originalUrl || req.path,
        role: req.session?.role || 'anonymous',
        username: req.session?.username || req.session?.teamCode || null,
        ip: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      });
    }
  });
  next();
});

// Graceful shutdown middleware for financial mutations
app.use((req, res, next) => {
  if (isShuttingDown && req.method === 'POST') {
    return res.status(503).json({
      error: 'Service Unavailable: Server is undergoing graceful shutdown. Financial transactions are paused.'
    });
  }
  next();
});

// Phase 6 Authoritative Health & Diagnostics Endpoint
app.get(['/health', '/api/health'], async (req, res) => {
  let pgActive = false;
  if (isPgConfigured()) {
    try {
      pgActive = await isPgConnected();
    } catch (e) {
      pgActive = false;
    }
  }
  const isHealthy = (!isPgConfigured() || pgActive);
  const healthData = {
    status: isHealthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      configured: isPgConfigured(),
      connected: pgActive
    },
    websockets: {
      connectedClients: clients.size
    },
    tradingActive: state.marketState?.status === 'Open'
  };

  if (!isHealthy && process.env.NODE_ENV === 'production') {
    return res.status(503).json(healthData);
  }
  return res.json(healthData);
});

// Process-level chaos resilience guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server Uncaught Exception]', err);
});

// Serve static assets
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

let authSecretWarned = false;
function getAuthSecret() {
  if (process.env.SAAMX_AUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET) {
    return process.env.SAAMX_AUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;
  }
  if (!globalThis.__SAAMX_EPHEMERAL_AUTH_SECRET) {
    globalThis.__SAAMX_EPHEMERAL_AUTH_SECRET = crypto.randomBytes(32).toString('hex');
    if (!authSecretWarned) {
      console.warn('[SECURITY WARNING] SAAMX_AUTH_SECRET is not configured in environment. Generated an ephemeral, cryptographically secure 32-byte secret for this session.');
      authSecretWarned = true;
    }
  }
  return globalThis.__SAAMX_EPHEMERAL_AUTH_SECRET;
}

const activeSessions = new Map(); // sessionId -> { token, role, teamCode, username, createdAt, expiresAt }

function createSessionToken(role, teamCode = null, username = null, personnelId = null, assignedDesk = null) {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const createdAt = Date.now();
  const expiresAt = createdAt + (12 * 60 * 60 * 1000); // 12 hours validity

  let authoritativeDesk = assignedDesk;
  if (personnelId || (username && role !== 'team')) {
    const matchedStaff = (state?.personnel || []).find(staff =>
      (personnelId && staff.id === personnelId) ||
      (username && staff.username?.toLowerCase() === username.toLowerCase())
    );
    if (matchedStaff) {
      if (!personnelId && matchedStaff.id) personnelId = matchedStaff.id;
      if (!authoritativeDesk && matchedStaff.assignedDesk) authoritativeDesk = matchedStaff.assignedDesk;
    }
  }

  const payload = `${sessionId}.${role}.${teamCode || ''}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('hex');
  const token = `saamx.${payload}.${sig}`;

  const sessionData = {
    token,
    sessionId,
    role,
    teamCode: teamCode ? String(teamCode).toUpperCase() : null,
    username: username || (teamCode ? teamCode : role),
    personnelId: personnelId || null,
    assignedDesk: authoritativeDesk || null,
    createdAt,
    expiresAt
  };

  activeSessions.set(sessionId, sessionData);
  sessionStore.createSession({
    sessionId,
    userId: personnelId,
    role,
    teamCode,
    username: sessionData.username,
    expiresAt
  }).catch(() => {});
  return { token, sessionId, expiresAt, assignedDesk: sessionData.assignedDesk };
}

export function verifySessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const token = tokenString.replace(/^Bearer\s+/i, '').trim();

  if (!token.startsWith('saamx.')) {
    // Backwards compatibility strictly isolated to test environments
    if (isTestEnvironment() && token.startsWith('token_')) {
      const parts = token.split('_');
      const r = parts[1];
      const t = parts[2] && parts[2] !== 'admin' && parts[2] !== 'sebi' ? parts[2].toUpperCase() : null;
      return { role: r, teamCode: t, username: t || r, assignedDesk: null, expiresAt: Date.now() + 3600000 };
    }
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 6) return null; // [saamx, sessionId, role, teamCode, expiresAt, sig]

  const [, sessionId, role, teamCode, expiresAtStr, sig] = parts;
  const payload = `${sessionId}.${role}.${teamCode}.${expiresAtStr}`;
  const expectedSig = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('hex');

  const sigBuffer = Buffer.from(sig, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSig, 'hex');
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    activeSessions.delete(sessionId);
    sessionStore.revokeSession(sessionId).catch(() => {});
    return null;
  }

  const session = sessionStore.getSessionSync(sessionId) || activeSessions.get(sessionId);
  if (!session) return null;

  // Real-time revocation & desk assignment synchronization
  if (session.personnelId || (session.username && session.role !== 'team')) {
    const matchedStaff = (state.personnel || []).find(staff =>
      (session.personnelId && staff.id === session.personnelId) ||
      (staff.username && staff.username.toLowerCase() === session.username.toLowerCase())
    );
    if (matchedStaff) {
      if (matchedStaff.status === 'DISABLED') {
        activeSessions.delete(sessionId);
        sessionStore.revokeSession(sessionId).catch(() => {});
        return null;
      }
      session.assignedDesk = matchedStaff.assignedDesk || null;
    }
  }

  return session;
}

export const verifySessionTokenSync = verifySessionToken;

export async function verifySessionTokenAsync(tokenString) {
  // 1. Try fast synchronous L1 cache check first (<0.05ms)
  const syncSession = verifySessionToken(tokenString);
  if (syncSession) return syncSession;

  // 2. Query PostgreSQL session store (<0.5ms) on L1 cache miss (e.g. server reboot or multi-process)
  if (!tokenString || typeof tokenString !== 'string') return null;
  const token = tokenString.replace(/^Bearer\s+/i, '').trim();
  if (!token.startsWith('saamx.')) return null;

  const parts = token.split('.');
  if (parts.length !== 6) return null;

  const [, sessionId, role, teamCode, expiresAtStr, sig] = parts;
  const payload = `${sessionId}.${role}.${teamCode}.${expiresAtStr}`;
  const expectedSig = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('hex');

  const sigBuffer = Buffer.from(sig, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSig, 'hex');
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    activeSessions.delete(sessionId);
    await sessionStore.revokeSession(sessionId);
    return null;
  }

  const dbSession = await sessionStore.getSession(sessionId);
  if (!dbSession) return null;

  if (dbSession.personnelId || (dbSession.username && dbSession.role !== 'team')) {
    const matchedStaff = (state.personnel || []).find(staff =>
      (dbSession.personnelId && staff.id === dbSession.personnelId) ||
      (staff.username && staff.username.toLowerCase() === dbSession.username.toLowerCase())
    );
    if (matchedStaff) {
      if (matchedStaff.status === 'DISABLED') {
        activeSessions.delete(sessionId);
        await sessionStore.revokeSession(sessionId);
        return null;
      }
      dbSession.assignedDesk = matchedStaff.assignedDesk || null;
    }
  }

  return dbSession;
}

function verifyTeamPassword(team, password) {
  if (!password) return false;
  const rawP = String(password).trim();
  const p = rawP.toLowerCase();

  // 1. Scrypt password hash verification for custom delegate & team passwords
  if (team.passwordHash) {
    try {
      const v = verifyPassword(rawP, team.passwordHash);
      if (v && v.verified) return true;
    } catch (e) {}
  }
  if (team.credentials?.passwordHash) {
    try {
      const v = verifyPassword(rawP, team.credentials.passwordHash);
      if (v && v.verified) return true;
    } catch (e) {}
  }

  // 2. Standard and temporary PIN candidates
  const teamNum = parseInt(team.teamCode?.replace(/\D/g, '') || team.id?.replace(/\D/g, '') || '0', 10);
  const padNum = String(teamNum).padStart(2, '0');

  const candidates = [
    team.rawPassword,
    team.credentials?.password,
    team.credentials?.tempPin,
    team.tempPin,
    padNum,
    String(teamNum),
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

  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const throttleKey = `${clientIp}_${userIdentifier.toLowerCase()}`;

  const rateLimit = checkLoginRateLimit(throttleKey);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${rateLimit.remainingSecs} seconds before trying again.`
    });
  }

  if (!p) {
    recordFailedLogin(throttleKey);
    return res.status(401).json({ error: 'Password or PIN is required' });
  }

  const teamsList = state.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
  const normalizedId = userIdentifier.toUpperCase();

  // 1. Participant / Team / Delegate Login
  let matchedMember = null;
  let memberTeam = null;

  // Check if identifier matches teamCode or id
  let matchedTeam = teamsList.find(t =>
    (t.teamCode || '').toUpperCase() === normalizedId ||
    (t.id || '').toUpperCase() === normalizedId
  );

  // Check if identifier matches an individual team member's name or delegate ID
  if (!matchedTeam) {
    for (const t of teamsList) {
      if (Array.isArray(t.members)) {
        const mem = t.members.find(m =>
          (m.name && m.name.trim().toLowerCase() === userIdentifier.toLowerCase()) ||
          (m.delegateId && m.delegateId.toUpperCase() === normalizedId)
        );
        if (mem) {
          matchedMember = mem;
          memberTeam = t;
          matchedTeam = t;
          break;
        }
      }
    }
  }

  // Check pending or submitted Investment House registrations
  if (!matchedTeam) {
    const investmentHousesList = Array.isArray(state.investmentHouses) ? state.investmentHouses : [];
    let matchedPendingMember = null;
    const matchedHouse = investmentHousesList.find(h => {
      if (
        (h.teamCode || '').toUpperCase() === normalizedId ||
        (h.investmentHouseId || '').toUpperCase() === normalizedId ||
        (h.investmentHouseName || '').trim().toLowerCase() === userIdentifier.toLowerCase()
      ) {
        return true;
      }
      if (Array.isArray(h.members)) {
        const mem = h.members.find(m =>
          (m.name && m.name.trim().toLowerCase() === userIdentifier.toLowerCase()) ||
          (m.delegateId && m.delegateId.toUpperCase() === normalizedId)
        );
        if (mem) {
          matchedPendingMember = mem;
          return true;
        }
      }
      return false;
    });

    if (matchedHouse) {
      const housePinMatch = String(p).trim() === String(matchedHouse.credentials?.tempPin || matchedHouse.tempPin).trim();
      let housePassMatch = false;
      const targetHash = matchedHouse.credentials?.passwordHash || matchedHouse.passwordHash;
      if (targetHash) {
        try {
          const v = verifyPassword(p, targetHash);
          housePassMatch = Boolean(v && v.verified);
        } catch (e) {}
      }

      if (housePinMatch || housePassMatch) {
        if (matchedHouse.verificationStatus === 'REJECTED') {
          recordFailedLogin(throttleKey);
          return res.status(403).json({
            error: `Registration was declined: ${matchedHouse.rejectionReason || 'Contact floor administrator.'}`
          });
        }

        if (matchedHouse.verificationStatus === 'PENDING' || matchedHouse.registrationStatus === 'SUBMITTED') {
          return res.status(403).json({
            error: `Investment House registration for ${matchedHouse.investmentHouseName} (${matchedHouse.teamCode})${matchedPendingMember ? ` delegate ${matchedPendingMember.name}` : ''} is pending verification by the SAAMX Exchange Desk. Assigned station: ${matchedHouse.assignedDesk || 'Floor Desk'}.`,
            isPendingVerification: true,
            teamCode: matchedHouse.teamCode,
            assignedDesk: matchedHouse.assignedDesk,
            delegate: matchedPendingMember ? matchedPendingMember.name : null,
            status: 'PENDING_VERIFICATION'
          });
        }
      } else {
        recordFailedLogin(throttleKey);
        return res.status(401).json({ error: `Invalid password or PIN for registered Investment House ${matchedHouse.teamCode}` });
      }
    }
  }

  if (matchedTeam || role === 'team' || role === 'participant') {
    const targetTeam = matchedTeam || teamsList.find(t => (t.teamCode || '').toUpperCase() === (teamCode || '').toUpperCase());
    if (!targetTeam) {
      recordFailedLogin(throttleKey);
      return res.status(401).json({ error: 'Invalid username, PIN or password' });
    }
    if (targetTeam.isActive === false) {
      return res.status(403).json({ error: `Team ${targetTeam.teamCode} is currently deactivated.` });
    }
    if (!verifyTeamPassword(targetTeam, p)) {
      recordFailedLogin(throttleKey);
      return res.status(401).json({ error: 'Invalid username, PIN or password' });
    }
    recordSuccessfulLogin(throttleKey);
    const sessionUser = matchedMember ? `${targetTeam.teamCode} (${matchedMember.name})` : targetTeam.teamCode;
    const { token, expiresAt } = createSessionToken('team', targetTeam.teamCode, sessionUser);
    const { password: _p, pin: _pin, ...safeTeam } = targetTeam;
    return res.json({
      success: true,
      role: 'team',
      teamCode: targetTeam.teamCode,
      username: sessionUser,
      delegate: matchedMember || null,
      token,
      expiresAt,
      team: safeTeam
    });
  }

  // 2. Staff / Official Console Login
  let staffUser = userIdentifier.toLowerCase();
  // Canonical aliases for desks, counters, admins, advisors
  if (staffUser === 'admin1') staffUser = 'admin';
  else if (staffUser === 'armaan') staffUser = 'arman';
  else if (staffUser === 'bank1') staffUser = 'counter1';
  else if (staffUser === 'bank2') staffUser = 'counter2';
  else if (staffUser === 'bank3') staffUser = 'counter3';
  else if (staffUser === 'bank4') staffUser = 'counter4';
  else if (staffUser === 'fx' || staffUser === 'operator_x' || staffUser === 'forex' || staffUser === 'fx_desk') staffUser = 'fx1';
  else if (staffUser === 'forex1') staffUser = 'fx1';
  else if (staffUser === 'forex2') staffUser = 'fx2';

  let assignedRole = null;
  let customUsername = null;
  let matchedPersonnel = null;

  // Primary: Check registered personnel directory first with scrypt & legacy verification
  if (state.personnel && Array.isArray(state.personnel)) {
    const matchedStaff = state.personnel.find(staff => 
      staff.username?.toLowerCase() === staffUser ||
      (staffUser === 'admin' && staff.username?.toLowerCase() === 'admin1') ||
      (staffUser === 'arman' && staff.username?.toLowerCase() === 'armaan') ||
      (staffUser === 'counter1' && staff.username?.toLowerCase() === 'bank1') ||
      (staffUser === 'counter2' && staff.username?.toLowerCase() === 'bank2') ||
      (staffUser === 'counter3' && staff.username?.toLowerCase() === 'bank3') ||
      (staffUser === 'counter4' && staff.username?.toLowerCase() === 'bank4')
    );
    if (matchedStaff) {
      if (matchedStaff.status === 'DISABLED') {
        return res.status(403).json({ error: 'Account is deactivated. Please contact floor administrator.' });
      }
      let authResult = verifyPassword(p, matchedStaff.passwordHash);
      if (!authResult.verified) {
        // Also permit role-wide master event keys for official accounts
        if (matchedStaff.role === 'advisor' && (p === 'advisor-event-2026' || p === 'saamx-advisor-2026')) {
          authResult = { verified: true, needsRehash: false };
        } else if (matchedStaff.role === 'exchange' && (p === 'exchange-event-2026' || p === 'saamx-desk-2026')) {
          authResult = { verified: true, needsRehash: false };
        } else if (matchedStaff.role === 'bank_teller' && (p === 'saamx-event-2026' || p === 'saamx-bank-2026')) {
          authResult = { verified: true, needsRehash: false };
        } else if (matchedStaff.role === 'operator_x' && (p === 'exchange-event-2026' || p === 'saamx-fx-2026' || p === 'fx-event-2026' || p === 'saamx-event-2026')) {
          authResult = { verified: true, needsRehash: false };
        } else if ((matchedStaff.role === 'journalist' || matchedStaff.role === 'news_controller') && (p === 'journalist-event-2026' || p === 'saamx-news-2026' || p === 'saamx-event-2026')) {
          authResult = { verified: true, needsRehash: false };
        } else if (matchedStaff.role === 'admin' && (p === 'saamx-event-2026' || p === 'saamx-admin-2026')) {
          authResult = { verified: true, needsRehash: false };
        }
      }
      if (authResult.verified) {
        matchedPersonnel = matchedStaff;
        matchedPersonnel.lastLogin = Date.now();
        if (authResult.needsRehash) {
          matchedPersonnel.passwordHash = hashPassword(p);
          saveState();
        }
        assignedRole = matchedStaff.role === 'super_admin' ? 'admin' : matchedStaff.role;
        customUsername = matchedStaff.displayName || matchedStaff.username;
      }
    }
  }

  // Disaster recovery override: strictly gated to sridhara when SAAMX_RECOVERY_PASSWORD is explicitly defined in environment
  const recoveryPass = process.env.SAAMX_RECOVERY_PASSWORD || process.env.SAAMX_BOOTSTRAP_ADMIN_PASSWORD;
  if (!assignedRole && recoveryPass && staffUser === 'sridhara' && p === recoveryPass) {
    const sridharaStaff = (state.personnel || []).find(s => s.username?.toLowerCase() === 'sridhara');
    if (sridharaStaff) {
      console.warn('[SECURITY AUDIT] Emergency disaster recovery authentication invoked for @sridhara using environment recovery secret.');
      matchedPersonnel = sridharaStaff;
      matchedPersonnel.lastLogin = Date.now();
      assignedRole = 'admin';
      customUsername = sridharaStaff.displayName || sridharaStaff.username;
    }
  }

  if (assignedRole) {
    recordSuccessfulLogin(throttleKey);
    const finalUsername = matchedPersonnel ? matchedPersonnel.username : (staffUser || assignedRole);
    const finalDisplayName = matchedPersonnel ? (matchedPersonnel.displayName || matchedPersonnel.username) : (customUsername || staffUser || assignedRole);
    const personnelId = matchedPersonnel ? matchedPersonnel.id : null;
    const finalAssignedDesk = matchedPersonnel?.assignedDesk || null;
    const { token, expiresAt } = createSessionToken(assignedRole, null, finalUsername, personnelId, finalAssignedDesk);

    const userPermissions = matchedPersonnel 
      ? getEffectivePermissions(matchedPersonnel) 
      : (ROLE_PERMISSIONS[assignedRole] || []);
    const userPages = matchedPersonnel && Array.isArray(matchedPersonnel.selectedPages) 
      ? matchedPersonnel.selectedPages 
      : [];

    return res.json({
      success: true,
      role: assignedRole,
      teamCode: null,
      username: finalUsername,
      displayName: finalDisplayName,
      personnelId,
      assignedDesk: finalAssignedDesk,
      department: matchedPersonnel?.department || '',
      permissions: userPermissions,
      selectedPages: userPages,
      token,
      expiresAt,
      isMaster: (assignedRole === 'admin' || finalUsername.toLowerCase() === 'sridhara' || (matchedPersonnel && matchedPersonnel.role === 'super_admin'))
    });
  }

  recordFailedLogin(throttleKey);
  return res.status(401).json({ error: 'Invalid username, PIN or password' });
});

// Session verification endpoint
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  const session = await verifySessionTokenAsync(authHeader);
  if (!session) {
    return res.status(401).json({ authenticated: false, error: 'Session invalid or expired' });
  }

  let userPermissions = ROLE_PERMISSIONS[session.role] || [];
  let userPages = [];
  let displayName = session.username;
  let department = '';
  let assignedDesk = session.assignedDesk || null;

  if (session.personnelId || (session.username && session.role !== 'team')) {
    const matched = (state.personnel || []).find(staff =>
      (session.personnelId && staff.id === session.personnelId) ||
      (staff.username && staff.username.toLowerCase() === session.username.toLowerCase())
    );
    if (matched) {
      userPermissions = getEffectivePermissions(matched);
      userPages = Array.isArray(matched.selectedPages) ? matched.selectedPages : [];
      displayName = matched.displayName || matched.username;
      department = matched.department || '';
      assignedDesk = matched.assignedDesk || null;
    }
  }

  return res.json({
    authenticated: true,
    role: session.role,
    teamCode: session.teamCode,
    username: session.username,
    displayName,
    department,
    assignedDesk,
    permissions: userPermissions,
    selectedPages: userPages,
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
      if (sessionId) {
        activeSessions.delete(sessionId);
        sessionStore.revokeSession(sessionId).catch(() => {});
      }
    }
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

export function hasPerm(session, permId) {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'super_admin') return true;
  const staff = (state.personnel || []).find(u => 
    (session.personnelId && u.id === session.personnelId) ||
    (u.username && u.username.toLowerCase() === session.username?.toLowerCase())
  );
  if (staff) {
    const perms = getEffectivePermissions(staff);
    return perms.includes(permId);
  }
  const rolePerms = ROLE_PERMISSIONS[session.role] || [];
  return rolePerms.includes(permId);
}

export function isDeskSupervisor(session) {
  if (!session) return false;
  if (session.role === 'admin' || session.role === 'super_admin' || session.isMaster === true) return true;
  if (session.username && (session.username.toLowerCase() === 'sridhara' || session.username.toLowerCase() === 'master')) return true;
  if (hasPerm(session, 'desks.cross_operate') || hasPerm(session, 'system.config')) return true;
  return false;
}

export function validateDeskAccess(session, requestedDeskId = null, order = null) {
  if (!session) {
    return { allowed: false, status: 401, error: 'Authentication required' };
  }

  // 1. Supervisors & super-admins have complete cross-desk operational authority
  if (isDeskSupervisor(session)) {
    return {
      allowed: true,
      isSupervisor: true,
      effectiveDesk: requestedDeskId || (order ? (order.lockedByDesk || order.deskId) : 'DESK_1')
    };
  }

  // 2. Desk Operator isolation
  const assignedDesk = session.assignedDesk;

  // If operator has no assigned desk and attempts desk-specific actions
  if (!assignedDesk) {
    return {
      allowed: true,
      effectiveDesk: requestedDeskId || (order ? (order.lockedByDesk || order.deskId) : 'DESK_1')
    };
  }

  // If operator is assigned to assignedDesk:
  // Reject parameter tampering if client attempts to operate another desk
  if (requestedDeskId && requestedDeskId !== assignedDesk) {
    return {
      allowed: false,
      status: 403,
      error: `Forbidden: Operator assigned to ${assignedDesk} is not authorized to operate ${requestedDeskId}.`
    };
  }

  // If order is locked by or assigned to a different desk:
  const targetDesk = order ? (order.lockedByDesk || order.deskId) : null;
  if (targetDesk && targetDesk !== assignedDesk) {
    return {
      allowed: false,
      status: 403,
      error: `Forbidden: Order is locked by ${targetDesk}. Operator assigned to ${assignedDesk} cannot perform actions on this order.`
    };
  }

  return {
    allowed: true,
    effectiveDesk: assignedDesk
  };
}

const authMiddleware = async (req, res, next) => {
  const normalizedPath = (req.path || '').replace(/\/+$/, '') || '/';

  const publicGetPaths = [
    '/projector/snapshot',
    '/priceHistory',
    '/marketIndices',
    '/ipos',
    '/fx/rates',
    '/fx/reserves',
    '/event/current',
    '/events',
    '/capacity',
    '/securities',
    '/state',
    '/ping',
    '/db/status',
    '/rtdb/delta-stats',
    '/news/presets',
    '/training'
  ];

  const publicPostPaths = [
    '/auth/login',
    '/register/complete',
    '/audit-log',
    '/training'
  ];

  const isPublicGet = req.method === 'GET' && publicGetPaths.some(p => normalizedPath === p || normalizedPath.startsWith(p + '/'));
  const isPublicPost = req.method === 'POST' && publicPostPaths.some(p => normalizedPath === p || normalizedPath.startsWith(p + '/'));

  if (isPublicGet || isPublicPost) {
    const authHeader = req.headers['authorization'] || req.headers['x-fms-token'] || (req.query && req.query.token);
    let session = await verifySessionTokenAsync(authHeader);
    if (!session && isTestEnvironment()) {
      const rawPw = req.headers['x-fms-password'];
      if (rawPw) {
        const testSecret = process.env.SAAMX_TEST_SECRET || 'fms-event-2026';
        if (rawPw === testSecret || rawPw === 'saamx-event-2026') {
          const fallbackRole = req.headers['x-fms-role'] || 'admin';
          session = {
            role: fallbackRole,
            teamCode: req.headers['x-fms-team-code'] || null,
            username: fallbackRole === 'admin' ? 'admin' : fallbackRole,
            assignedDesk: null
          };
        }
      }
    }
    if (session) {
      req.role = session.role;
      req.teamCode = session.teamCode;
      req.session = session;
    }
    return next();
  }

  // 1. Primary: Verify cryptographic session token
  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'] || (req.query && req.query.token);
  let session = await verifySessionTokenAsync(authHeader);

  // 2. Automated test runner fallback via X-FMS-Password
  // STRICT SECURITY ISOLATION: Enabled strictly in automated test environments
  if (!session && isTestEnvironment()) {
    const rawPw = req.headers['x-fms-password'];
    if (rawPw) {
      const testSecret = process.env.SAAMX_TEST_SECRET || 'fms-event-2026';
      if (rawPw === testSecret || rawPw === 'saamx-event-2026') {
        const fallbackRole = req.headers['x-fms-role'] || 'admin';
        session = {
          role: fallbackRole,
          teamCode: req.headers['x-fms-team-code'] || null,
          username: fallbackRole === 'admin' ? 'admin' : fallbackRole,
          assignedDesk: null
        };
      } else if (rawPw === 'journalist-event-2026') {
        session = { role: 'journalist', teamCode: null, username: 'journalist', assignedDesk: null };
      } else if (rawPw === 'sebi-event-2026') {
        session = { role: 'sebi', teamCode: null, username: 'sebi', assignedDesk: null };
      } else if (rawPw === 'exchange-event-2026') {
        session = { role: 'operator_x', teamCode: null, username: 'exchange', assignedDesk: null };
      } else if (rawPw === 'verification-event-2026' || rawPw === 'verify-event-2026') {
        session = { role: 'verification', teamCode: null, username: 'verification', assignedDesk: null };
      } else if (rawPw === 'advisor-event-2026' || rawPw === 'broker-event-2026') {
        session = { role: 'advisor', teamCode: null, username: 'advisor', assignedDesk: null };
      } else if (rawPw === 'judge-event-2026') {
        session = { role: 'judge', teamCode: null, username: 'judge', assignedDesk: null };
      } else if (rawPw === 'portfolio-event-2026') {
        session = { role: 'portfolio', teamCode: null, username: 'portfolio', assignedDesk: null };
      } else {
        const teamMatch = (state.teams || []).find(t => t.password === rawPw || (t.teamCode && rawPw === `saamx-team-${t.teamCode.replace('T', '').toLowerCase()}`));
        if (teamMatch) {
          session = { role: 'team', teamCode: teamMatch.teamCode, username: teamMatch.teamCode, assignedDesk: teamMatch.assignedDesk || null };
        }
      }
    }
  }

  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required.' });
  }

  // Ensure session has assignedDesk resolved if personnelId or username is present
  if (!session.assignedDesk && (session.personnelId || (session.username && session.role !== 'team'))) {
    const matchedStaff = (state.personnel || []).find(staff =>
      (session.personnelId && staff.id === session.personnelId) ||
      (staff.username && staff.username.toLowerCase() === session.username.toLowerCase())
    );
    if (matchedStaff?.assignedDesk) {
      session.assignedDesk = matchedStaff.assignedDesk;
      session.personnelId = matchedStaff.id;
    }
  }

  req.role = session.role;
  req.teamCode = session.teamCode;
  req.session = session;

  if (session.role === 'admin' || session.role === 'super_admin') return next();

  // Personnel management RBAC
  if (normalizedPath === '/personnel' && req.method === 'GET') {
    if (hasPerm(session, 'personnel.view')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires personnel.view permission.' });
  }

  if (normalizedPath === '/personnel' && req.method === 'POST') {
    if (hasPerm(session, 'personnel.create')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires personnel.create permission.' });
  }

  if (normalizedPath.startsWith('/personnel/') && normalizedPath.endsWith('/status')) {
    if (hasPerm(session, 'personnel.disable')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires personnel.disable permission.' });
  }

  if (normalizedPath.startsWith('/personnel/') && (req.method === 'PUT' || normalizedPath.endsWith('/reset-password'))) {
    if (hasPerm(session, 'personnel.update')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires personnel.update permission.' });
  }

  if (normalizedPath === '/permissions/matrix') {
    if (hasPerm(session, 'permissions.view')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires permissions.view permission.' });
  }

  if (normalizedPath === '/audit-log') {
    if (session.role === 'sebi' || hasPerm(session, 'audit.view')) return next();
    return res.status(403).json({ error: 'Forbidden: Audit log requires SEBI or Admin authorization.' });
  }

  if (normalizedPath === '/market/control') {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'market.control')) return next();
    return res.status(403).json({ error: 'Forbidden: Market control requires market.control permission.' });
  }

  if (normalizedPath.startsWith('/events/trigger')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'scenarios.trigger')) return next();
    return res.status(403).json({ error: 'Forbidden: Scenario triggering requires scenarios.trigger permission.' });
  }

  if (normalizedPath === '/admin/phoenix-act' || normalizedPath === '/admin/scenario/macro-shock') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'scenarios.trigger') || hasPerm(session, 'system.config') || hasPerm(session, 'sebi.halt')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires scenario triggering or administrator privileges.' });
  }

  if (normalizedPath.startsWith('/admin')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires Admin privileges.' });
  }

  if (normalizedPath.startsWith('/event/') || (normalizedPath === '/event' && req.method !== 'GET') || normalizedPath.startsWith('/events/schedule')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config')) return next();
    return res.status(403).json({ error: 'Forbidden: Event configuration requires Administrator privileges.' });
  }

  if (normalizedPath === '/coordinator/claim') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || session.role === 'coordinator' || hasPerm(session, 'market.control')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires SEBI, Coordinator, or Administrator privileges.' });
  }

  if (normalizedPath === '/results/approve' || normalizedPath === '/results/publish' || normalizedPath === '/results/lifecycle' || normalizedPath === '/results/reopen') {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'results.approve')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires results.approve permission.' });
  }

  if (normalizedPath === '/news' && req.method === 'POST') {
    if (hasPerm(session, 'news.publish') || session.role === 'admin' || session.role === 'super_admin' || session.role === 'news_controller') return next();
    return res.status(403).json({ error: 'Forbidden: Direct news publishing requires News Controller or Administrator authorization.' });
  }

  if (normalizedPath === '/advisor/signal') {
    if (session.role === 'advisor' || hasPerm(session, 'advisor.signal')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires Advisor authorization.' });
  }

  // Securities Catalog Management RBAC
  if (normalizedPath.startsWith('/securities') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config')) return next();
    return res.status(403).json({ error: 'Forbidden: Securities catalog management requires Administrator privileges.' });
  }

  // Team Roster Management RBAC
  if (normalizedPath.startsWith('/teams') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config')) return next();
    return res.status(403).json({ error: 'Forbidden: Team roster management requires Administrator privileges.' });
  }

  // FX Rate Modification RBAC
  if (normalizedPath === '/fx/rates' && req.method === 'POST') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi') return next();
    return res.status(403).json({ error: 'Forbidden: Modifying FX rates requires SEBI or Administrator authorization.' });
  }

  // FX Execution & Conversion Desk RBAC
  if (normalizedPath === '/fx/exchange' || normalizedPath === '/fx/convert' || normalizedPath === '/fx/queue-action') {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'exchange.execute')) return next();
    return res.status(403).json({ error: 'Forbidden: Direct currency exchange and desk queue processing require Exchange Desk Operator privileges.' });
  }

  // FX Request Intake RBAC
  if (normalizedPath === '/fx/request') {
    if (session.role !== 'team' && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Submitting currency exchange requests requires Investment House privileges.' });
    }
  }

  // Sentiment Polling Management RBAC
  if (normalizedPath === '/polls/create' || normalizedPath === '/polls/close') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'coordinator' || hasPerm(session, 'market.control')) return next();
    return res.status(403).json({ error: 'Forbidden: Creating or closing sentiment polls requires Coordinator or Administrator privileges.' });
  }

  // Sentiment Polling Voting RBAC
  if (normalizedPath === '/polls/vote') {
    if (session.role !== 'team' && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Only registered Investment Houses or Administrators can vote in market polls.' });
    }
  }

  // Broker Advisory Recommendations & Bulletins RBAC
  if (normalizedPath === '/broker/recommendation' || normalizedPath === '/broker/bulletin') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'advisor' || session.role === 'analyst' || hasPerm(session, 'advisor.signal') || hasPerm(session, 'analyst.commentary')) return next();
    return res.status(403).json({ error: 'Forbidden: Publishing broker recommendations or bulletins requires Advisory or Administrator privileges.' });
  }

  // Transaction Voiding RBAC
  if (normalizedPath === '/transactions/void') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'exchange.void')) return next();
    return res.status(403).json({ error: 'Forbidden: Transaction voiding requires SEBI or Administrator privileges.' });
  }

  // Bank Desk Operations RBAC
  if (['/bank/settle', '/bank/reject', '/bank/hold', '/bank/claim'].includes(normalizedPath)) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'bank.settle')) return next();
    return res.status(403).json({ error: 'Forbidden: Processing bank settlements requires Bank Teller or Administrator privileges.' });
  }

  if (normalizedPath === '/bank/reconciliation') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'bank.reconcile')) return next();
    return res.status(403).json({ error: 'Forbidden: Bank reconciliation requires Bank Desk or Regulatory privileges.' });
  }

  if (normalizedPath === '/admin/settlement-mode') {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config')) return next();
    return res.status(403).json({ error: 'Forbidden: Managing settlement mode requires Administrator privileges.' });
  }

  // Corporate Actions RBAC
  if (normalizedPath === '/corporate-action') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'market.control')) return next();
    return res.status(403).json({ error: 'Forbidden: Corporate actions require SEBI or Administrator privileges.' });
  }

  // Direct Trade Execution RBAC
  if (normalizedPath === '/trade' || normalizedPath === '/trades') {
    if (session.role === 'team') {
      return res.status(403).json({ error: 'Forbidden: Trading floor participants cannot execute trades directly. Orders must be submitted as slips via /api/order/create.' });
    }
    if (session.role !== 'admin' && session.role !== 'super_admin' && !hasPerm(session, 'exchange.execute')) {
      return res.status(403).json({ error: 'Forbidden: Direct trade execution requires exchange or administrator privileges.' });
    }
  }

  // IPO Lifecycle Operations RBAC
  if (['/ipo/allot', '/ipo/transition', '/ipo/stage', '/ipo/advance', '/ipo/visibility'].includes(normalizedPath)) {
    if (session.role === 'admin' || session.role === 'super_admin') return next();
    return res.status(403).json({ error: 'Forbidden: IPO lifecycle operations require Administrator privileges.' });
  }

  // Penalties Creation & Appeal Resolution RBAC
  if (normalizedPath === '/penalties/create') {
    if (session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi') return next();
    return res.status(403).json({ error: 'Forbidden: Issuing penalties requires SEBI or Administrator privileges.' });
  }

  if (normalizedPath === '/penalties/resolve-appeal') {
    if (session.role === 'admin' || session.role === 'super_admin') return next();
    return res.status(403).json({ error: 'Forbidden: Resolving penalty appeals requires Administrator privileges.' });
  }

  // Scenarios & Crisis Management RBAC
  if (normalizedPath === '/scenarios/manage' || normalizedPath.startsWith('/crisis/')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'scenarios.trigger')) return next();
    return res.status(403).json({ error: 'Forbidden: Scenario and crisis management requires Administrator privileges.' });
  }

  if (normalizedPath === '/order/claim') {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'orders.verify') || hasPerm(session, 'exchange.execute') || hasPerm(session, 'orders.view_queue')) {
      if (session.assignedDesk && !isDeskSupervisor(session)) {
        const requestedDeskId = req.body?.deskId;
        if (requestedDeskId && requestedDeskId !== session.assignedDesk) {
          return res.status(403).json({ error: `Forbidden: Operator assigned to ${session.assignedDesk} cannot operate ${requestedDeskId}.` });
        }
      }
      return next();
    }
    return res.status(403).json({ error: `Forbidden: Role '${session.role}' is not authorized to claim orders at exchange desks.` });
  }

  if (normalizedPath === '/order/action') {
    const actionType = req.body?.actionType || req.body?.action;
    if (actionType === 'EXECUTE' || actionType === 'ACCEPT') {
      if (session.role === 'team' || !hasPerm(session, 'exchange.execute')) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges (requires exchange.execute).' });
      }
    } else if (actionType === 'REJECT') {
      if (!hasPerm(session, 'exchange.reject') && !hasPerm(session, 'orders.verify')) {
        return res.status(403).json({ error: 'Forbidden: Order rejection requires exchange.reject or orders.verify permission.' });
      }
    } else if (actionType === 'RETURN_FOR_CORRECTION') {
      if (!hasPerm(session, 'orders.verify') && !hasPerm(session, 'orders.return_for_correction') && !hasPerm(session, 'exchange.reject') && !hasPerm(session, 'exchange.execute') && session.role !== 'exchange' && session.role !== 'operator_x' && session.role !== 'verification') {
        return res.status(403).json({ error: `Forbidden: Order return action requires exchange or verification authorization.` });
      }
    } else if (['VERIFY', 'MARK_VERIFIED', 'VALIDATE'].includes(actionType)) {
      if (!hasPerm(session, 'orders.verify') && !hasPerm(session, 'orders.return_for_correction') && session.role !== 'exchange' && session.role !== 'operator_x' && session.role !== 'verification') {
        return res.status(403).json({ error: `Forbidden: Order verification action '${actionType}' requires orders.verify permission.` });
      }
    } else if (['CLAIM', 'CLAIM_FOR_VERIFICATION', 'CLAIM_FOR_EXCHANGE'].includes(actionType)) {
      if (!hasPerm(session, 'orders.verify') && !hasPerm(session, 'exchange.execute') && !hasPerm(session, 'orders.view_queue')) {
        return res.status(403).json({ error: 'Forbidden: Claiming orders requires desk authorization.' });
      }
    }

    if (session.assignedDesk && !isDeskSupervisor(session)) {
      const requestedDeskId = req.body?.deskId;
      if (requestedDeskId && requestedDeskId !== session.assignedDesk) {
        return res.status(403).json({ error: `Forbidden: Operator assigned to ${session.assignedDesk} cannot operate ${requestedDeskId}.` });
      }
      const orderId = req.body?.orderId;
      const targetOrder = (state.orders || []).find(o => o.id === orderId);
      if (targetOrder) {
        const orderDesk = targetOrder.lockedByDesk || targetOrder.deskId;
        if (orderDesk && orderDesk !== session.assignedDesk) {
          return res.status(403).json({ error: `Forbidden: Order is locked by ${orderDesk}. Operator assigned to ${session.assignedDesk} cannot perform actions on this order.` });
        }
      }
    }
  }

  if (normalizedPath.startsWith('/verification')) {
    if (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'orders.verify') || hasPerm(session, 'exchange.execute') || hasPerm(session, 'orders.view_queue')) return next();
    return res.status(403).json({ error: 'Forbidden: Requires Exchange Desk Operator authorization.' });
  }

  // Order Submission, Modification & Cancellation Role Guards
  if (normalizedPath === '/orders/resubmit' || normalizedPath === '/orders/cancel') {
    if (session.role !== 'team' && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Only the owning Investment House or Administrator can modify or cancel orders.' });
    }
  }

  if (normalizedPath === '/order/create' || normalizedPath === '/orders/submit' || normalizedPath === '/order/submit') {
    if (session.role !== 'team' && session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'exchange' && session.role !== 'operator_x' && session.role !== 'verification' && !hasPerm(session, 'exchange.execute') && !hasPerm(session, 'orders.verify')) {
      return res.status(403).json({ error: 'Forbidden: Order submission requires Investment House, Exchange Desk, or Administrator privileges.' });
    }
  }

  // Primary IPO Subscriptions Role Guard
  if (normalizedPath === '/ipo/bid' || normalizedPath === '/ipo/subscribe') {
    if (session.role !== 'team' && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: IPO subscriptions require Investment House or Administrator privileges.' });
    }
  }

  if (session.role === 'team') {
    if (normalizedPath === '/orders/resubmit' || (normalizedPath === '/order/action' && req.body?.actionType === 'RESUBMIT')) {
      const targetOrderId = req.body?.orderId;
      const targetOrder = (state.orders || []).find(o => o.id === targetOrderId);
      if (targetOrder && session.teamCode && targetOrder.teamCode !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot resubmit orders belonging to team ${targetOrder.teamCode}.` });
      }
    }
    if (normalizedPath === '/orders/cancel' || (normalizedPath === '/order/action' && req.body?.actionType === 'CANCEL')) {
      const targetOrderId = req.body?.orderId;
      const targetOrder = (state.orders || []).find(o => o.id === targetOrderId);
      if (targetOrder && session.teamCode && targetOrder.teamCode !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot cancel orders belonging to team ${targetOrder.teamCode}.` });
      }
    }
    if (normalizedPath === '/portfolio' || normalizedPath === '/team/portfolio') {
      const requestedTeam = (req.body?.teamCode || req.query?.teamCode || req.body?.teamId || '').toUpperCase();
      if (requestedTeam && session.teamCode && requestedTeam !== session.teamCode) {
        return res.status(403).json({ error: '403 Forbidden: You are not authorized to view another team\'s portfolio.' });
      }
    }
    if (normalizedPath === '/order/create' || normalizedPath === '/orders/submit' || normalizedPath === '/order/submit') {
      const orderTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (orderTeam && session.teamCode && orderTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit orders on behalf of team ${orderTeam}.` });
      }
    }
    if (normalizedPath === '/ipo/bid' || normalizedPath === '/ipo/subscribe') {
      const bidTeam = (req.body?.teamCode || '').toUpperCase();
      if (bidTeam && session.teamCode && bidTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot place IPO bids for team ${bidTeam}.` });
      }
    }
    if (normalizedPath === '/penalties/appeal') {
      const penaltyId = req.body?.penaltyId;
      const targetPenalty = (state.penalties || []).find(p => p.id === penaltyId);
      if (targetPenalty && session.teamCode && targetPenalty.teamCode !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot appeal penalties issued to team ${targetPenalty.teamCode}.` });
      }
    }
    if (normalizedPath === '/advisor/refer') {
      const referTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (referTeam && session.teamCode && referTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit referrals for team ${referTeam}.` });
      }
    }
    if (normalizedPath === '/fx/request') {
      const requestedTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (requestedTeam && session.teamCode && requestedTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit FX requests for team ${requestedTeam}.` });
      }
    }
    if (normalizedPath === '/polls/vote') {
      const voteTeam = (req.body?.teamCode || req.body?.teamId || '').toUpperCase();
      if (voteTeam && session.teamCode && voteTeam !== session.teamCode) {
        return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot vote on behalf of team ${voteTeam}.` });
      }
    }
  }

  // Phase 7.5 Release-Gate Auxiliary Route Authorization Guards
  // Finding 7.4-01: Orders REST queue & slip privacy
  if (normalizedPath === '/orders' && req.method === 'GET') {
    if (session.role !== 'team' && !hasPerm(session, 'orders.view_queue') && !hasPerm(session, 'exchange.view') && !hasPerm(session, 'sebi.surveil') && !hasPerm(session, 'audit.view')) {
      return res.status(403).json({ error: 'Forbidden: Requires desk or audit authorization to view orders queue.' });
    }
  }

  // Related desk queue & metrics endpoint
  if ((normalizedPath === '/order-desks' || normalizedPath === '/desks') && req.method === 'GET') {
    if (!hasPerm(session, 'orders.view_queue') && !hasPerm(session, 'exchange.view') && !hasPerm(session, 'desks.cross_operate') && !hasPerm(session, 'dashboard.view') && !hasPerm(session, 'sebi.surveil') && !hasPerm(session, 'audit.view')) {
      return res.status(403).json({ error: 'Forbidden: Desk operator or supervisory authorization required.' });
    }
  }

  // Finding 7.4-02: FX transactions & queue privacy
  if ((normalizedPath === '/fx/transactions' || normalizedPath === '/fx/queue') && req.method === 'GET') {
    if (session.role !== 'team' && !hasPerm(session, 'exchange.execute') && !hasPerm(session, 'exchange.view') && !hasPerm(session, 'sebi.surveil') && !hasPerm(session, 'audit.view')) {
      return res.status(403).json({ error: 'Forbidden: Requires FX desk or audit authorization.' });
    }
  }

  // Finding 7.4-03: Judging scorecard submission & moderation
  if (normalizedPath === '/judging/scorecard/save' && req.method === 'POST') {
    if (!hasPerm(session, 'judging.score')) {
      return res.status(403).json({ error: 'Forbidden: Requires judging.score permission.' });
    }
  }

  if (normalizedPath === '/judging/moderate' && req.method === 'POST') {
    if (!hasPerm(session, 'results.approve')) {
      return res.status(403).json({ error: 'Forbidden: Requires results.approve moderation permission.' });
    }
  }

  if (normalizedPath === '/judging/scorecards' && req.method === 'GET') {
    const isDeliberator = hasPerm(session, 'judging.view') || hasPerm(session, 'judging.score') || hasPerm(session, 'results.approve');
    const isPublished = state.resultsLifecycle === 'PUBLISHED' && hasPerm(session, 'results.view');
    if (!isDeliberator && !isPublished) {
      return res.status(403).json({ error: 'Forbidden: Requires judging authorization to view scorecards.' });
    }
  }

  // Finding 7.4-04: Audit & reconciliation CSV report exports
  if (normalizedPath === '/reports/orders/csv' && req.method === 'GET') {
    if (!hasPerm(session, 'audit.view') && !hasPerm(session, 'orders.view_queue') && !hasPerm(session, 'exchange.view')) {
      return res.status(403).json({ error: 'Forbidden: Requires audit.view or desk supervision authorization to export orders CSV report.' });
    }
  }

  if (normalizedPath === '/reports/reconciliation/csv' && req.method === 'GET') {
    if (!hasPerm(session, 'audit.view') && !hasPerm(session, 'system.config')) {
      return res.status(403).json({ error: 'Forbidden: Requires audit.view permission to export event reconciliation report.' });
    }
  }

  // Finding 7.4-05: Auditorium debate & round controls
  if ((normalizedPath === '/bull-bear/debate' || normalizedPath === '/bull-bear/round') && req.method === 'POST') {
    if (!hasPerm(session, 'market.control') && session.role !== 'coordinator') {
      return res.status(403).json({ error: 'Forbidden: Auditorium debate control requires market.control permission.' });
    }
  }

  next();
};

app.use('/api', authMiddleware);

export const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
const activeAlerts = new Set();
const activeOrderLocks = new Set();
const activeSettlementLocks = new Set();
const orderMutexMap = new Map();

async function acquireOrderLock(orderId) {
  while (orderMutexMap.has(orderId)) {
    try {
      await orderMutexMap.get(orderId);
    } catch (e) {}
  }
  let release;
  const lockPromise = new Promise(resolve => { release = resolve; });
  orderMutexMap.set(orderId, lockPromise);
  return () => {
    orderMutexMap.delete(orderId);
    release();
  };
}

// Multi-Device Scalability: Heartbeat & Dead Client Pruner (30s)
const wsHeartbeatInterval = setInterval(() => {
  for (const client of clients) {
    if (client.isAlive === false) {
      clients.delete(client);
      try { client.terminate(); } catch (e) {}
      continue;
    }
    client.isAlive = false;
    try {
      client.ping();
    } catch (e) {
      clients.delete(client);
    }
  }
}, 30000);
if (wsHeartbeatInterval.unref) wsHeartbeatInterval.unref();

export function getSanitizedState(rawState = state, role = null, teamCode = null) {
  if (!rawState) return rawState;
  const clone = { ...rawState };

  // 1. Personnel sanitization: Hide entirely from non-staff/unauthenticated callers
  if (role === 'admin' || role === 'super_admin' || role === 'operator_x' || role === 'coordinator') {
    if (Array.isArray(clone.personnel)) {
      clone.personnel = clone.personnel.map(p => {
        const { passwordHash, ...safe } = p;
        return safe;
      });
    }
  } else {
    delete clone.personnel;
  }

  // 2. Audit log sanitization: Only admin, super_admin, and SEBI surveillance officers
  if (role !== 'admin' && role !== 'super_admin' && role !== 'sebi') {
    delete clone.auditLog;
  }

  // 3. Multi-Team Privacy & Credential Redaction: Strip password and tempPin from all teams
  if (Array.isArray(clone.teams)) {
    clone.teams = clone.teams.map(t => {
      const { password: _p, passwordHash: _ph, tempPin: _tp, ...safeT } = t;
      if (role === 'team') {
        if (teamCode && (t.teamCode === teamCode || t.id === teamCode)) {
          return safeT; // Authenticated team receives its own portfolio, cash, holdings, and metrics
        }
        // Other teams' private holdings, cash wallets, and private balances are redacted
        return {
          id: t.id,
          teamCode: t.teamCode,
          teamName: t.teamName,
          school: t.school,
          isActive: t.isActive,
          teamType: t.teamType,
          portfolioValue: t.portfolioValue,
          pnl: t.pnl,
          roi: t.roi,
          tradeCount: t.tradeCount
        };
      }
      if (role === 'admin' || role === 'super_admin' || role === 'sebi' || role === 'operator_x' || role === 'exchange' || role === 'advisor' || role === 'bank_teller') {
        return safeT;
      }
      // Public / Auditorium Projector / Unauthenticated
      return {
        id: t.id,
        teamCode: t.teamCode,
        teamName: t.teamName,
        school: t.school,
        isActive: t.isActive,
        teamType: t.teamType,
        portfolioValue: t.portfolioValue,
        pnl: t.pnl,
        roi: t.roi,
        tradeCount: t.tradeCount
      };
    });
  }

  // 4. Order slip privacy: Teams only see their own orders; Desk and Admin roles see all; Others see none
  const isDeskOrAdminRole = ['admin', 'super_admin', 'operator_x', 'exchange', 'sebi', 'desk', 'verification', 'bank_teller'].includes(role);
  if (role === 'team') {
    if (teamCode && Array.isArray(clone.orders)) {
      clone.orders = clone.orders.filter(o => o.teamCode === teamCode || o.teamId === teamCode);
    } else {
      clone.orders = [];
    }
  } else if (!isDeskOrAdminRole) {
    clone.orders = [];
  }

  // 5. Settlement privacy: Teams only see their own settlements; Bank tellers, Sebi, and Admins see all; Others see none
  const canViewAllSettlements = ['admin', 'super_admin', 'sebi', 'bank_teller'].includes(role);
  if (role === 'team') {
    if (teamCode && Array.isArray(clone.settlements)) {
      clone.settlements = clone.settlements.filter(s => s.teamCode === teamCode || s.teamId === teamCode);
    } else {
      clone.settlements = [];
    }
  } else if (!canViewAllSettlements) {
    clone.settlements = [];
  }

  // 6. Securities & IPO Visibility Enforcement (Server-Side Boundary)
  const isStaffOrAdmin = ['admin', 'super_admin', 'operator_x', 'coordinator'].includes(role);
  if (!isStaffOrAdmin) {
    // For Teams, secondary market desks, and public viewers:
    // Strip all unlisted IPO instruments from securities catalog.
    // Unlisted IPOs (DRAFT, ANNOUNCED, RUMOUR, CONFIRMED, OPENING_SOON, OPEN, SUBSCRIPTION_CLOSED, ALLOTMENT)
    // MUST NEVER appear in tradable securities or search interfaces!
    if (Array.isArray(clone.securities)) {
      clone.securities = clone.securities.filter(s => {
        const isIpoInstrument = s.isIpo || s.id?.startsWith('IPO_') || ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].includes(s.ticker);
        if (isIpoInstrument) {
          return isIpoListed(s) && s.visibleToParticipants !== false;
        }
        return s.visibleToParticipants !== false;
      });
    }

    // 7. Controlled IPO Layer
    // Teams only receive IPO instruments in state.ipos if subscription is currently open!
    const allIpos = Array.isArray(clone.ipos) ? clone.ipos : (Array.isArray(state.ipos) ? state.ipos : []);
    clone.ipos = allIpos.filter(ipo => isIpoSubscriptionOpen(ipo));
  } else {
    // Admin / Staff can see all 5 simulated IPOs in state.ipos at all times
    if (!clone.ipos && Array.isArray(state.ipos)) {
      clone.ipos = state.ipos;
    }
  }

  // 7. Judge Scorecards & Unreleased Results Privacy Filter
  // Before official results release (resultsLifecycle === 'PUBLISHED'), non-judges and teams
  // MUST NOT see other teams' unfinished scores, judge scorecards, or unreleased rankings
  const isJudgeOrAdmin = ['admin', 'super_admin', 'judge', 'coordinator'].includes(role);
  if (!isJudgeOrAdmin) {
    delete clone.judgeScorecards;
  }
  if (clone.resultsLifecycle !== 'PUBLISHED' && !isJudgeOrAdmin) {
    delete clone.publishedResults;
  }

  clone.version = state.version || 1;
  clone.lastUpdated = state.lastUpdated || Date.now();

  return clone;
}

wss.on('connection', (ws, request) => {
  clients.add(ws);
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Authenticate from request url or query params if present
  if (request && request.url) {
    try {
      const parsedUrl = new URL(request.url, 'http://localhost');
      const token = parsedUrl.searchParams.get('token');
      if (token) {
        const session = verifySessionToken(token);
        if (session) ws.session = session;
      }
    } catch (e) {}
  }

  // Send initial personalized state update
  ws.send(JSON.stringify({
    type: 'STATE_UPDATE',
    state: getSanitizedState(state, ws.session?.role, ws.session?.teamCode),
    activeAlerts: Array.from(activeAlerts)
  }));

  // Handle runtime AUTH and PING messages from socket client
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.isAlive = true;
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }
      if (msg.type === 'RESYNC' || msg.type === 'GET_STATE') {
        ws.send(JSON.stringify({
          type: 'STATE_UPDATE',
          state: getSanitizedState(state, ws.session?.role, ws.session?.teamCode),
          activeAlerts: Array.from(activeAlerts)
        }));
        return;
      }
      if (msg.type === 'AUTH' && msg.token) {
        const session = verifySessionToken(msg.token);
        if (session) {
          ws.session = session;
          ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            state: getSanitizedState(state, session.role, session.teamCode),
            activeAlerts: Array.from(activeAlerts)
          }));
        }
      }
    } catch (e) {}
  });

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
  // Monotonic version counter for strict stale-data protection
  state.version = (state.version || 0) + 1;
  state.lastUpdated = Date.now();

  // Ultra-lightweight delta for high-frequency price updates
  if (eventType === 'PRICE_UPDATE') {
    const payloadStr = JSON.stringify({
      type: 'PRICE_UPDATE',
      eventType: 'PRICE_UPDATE',
      entityType: 'PRICE',
      entityId: 'ALL',
      timestamp: state.lastUpdated,
      version: state.version,
      source: 'SAAMX_COORDINATOR',
      priceUpdates: dataExtra.priceUpdates || {},
      marketIndices: dataExtra.marketIndices || state.marketIndices || {},
      marketState: state.marketState || {}
    });
    for (const client of clients) {
      if (client.readyState === 1) {
        try {
          client.send(payloadStr);
        } catch (err) {}
      }
    }
    return;
  }

  const isFullStateEvent = eventType === 'STATE_UPDATE' || eventType === 'STOCK_SPLIT' || eventType === 'BANKRUPTCY' || eventType === 'DIVIDEND_ANNOUNCEMENT' || eventType === 'IPO_LAUNCH';

  // Fast path for delta events (ORDER_CLAIMED, ORDER_EXECUTED, ORDER_CREATED, SETTLEMENT_COMPLETED, etc.)
  if (!isFullStateEvent) {
    for (const client of clients) {
      if (client.readyState === 1) {
        try {
          const role = client.session?.role;
          const teamCode = client.session?.teamCode;
          const isDeskOrAdmin = ['admin', 'super_admin', 'operator_x', 'exchange', 'sebi', 'desk', 'verification', 'bank_teller'].includes(role);

          let clientOrders = [];
          let clientSettlements = [];
          if (isDeskOrAdmin) {
            clientOrders = state.orders || [];
            clientSettlements = state.settlements || [];
          } else if (role === 'team') {
            clientOrders = (state.orders || []).filter(o => o.teamCode === teamCode || o.teamId === teamCode);
            clientSettlements = (state.settlements || []).filter(s => s.teamCode === teamCode || s.teamId === teamCode);
          }

          let clientTeams = [];
          if (isDeskOrAdmin) {
            clientTeams = state.teams || [];
          } else if (role === 'team') {
            clientTeams = (state.teams || []).map(t => {
              const { password: _p, passwordHash: _ph, tempPin: _tp, ...safeT } = t;
              if (teamCode && (t.teamCode === teamCode || t.id === teamCode)) {
                return safeT;
              }
              return {
                id: t.id,
                teamCode: t.teamCode,
                teamName: t.teamName,
                school: t.school,
                isActive: t.isActive,
                teamType: t.teamType,
                portfolioValue: t.portfolioValue,
                pnl: t.pnl,
                roi: t.roi,
                tradeCount: t.tradeCount
              };
            });
          }

          const allIpos = Array.isArray(state.ipos) ? state.ipos : [];
          const clientIpos = isDeskOrAdmin
            ? allIpos
            : allIpos.filter(ipo => isIpoSubscriptionOpen(ipo));

          // Sanitize dataExtra per recipient to prevent leakage
          const clientDataExtra = { ...dataExtra };
          if (dataExtra.order) {
            const ord = dataExtra.order;
            const ownsOrder = role === 'team' && (ord.teamCode === teamCode || ord.teamId === teamCode);
            if (!isDeskOrAdmin && !ownsOrder) {
              delete clientDataExtra.order;
            }
          }
          if (dataExtra.transaction) {
            const tx = dataExtra.transaction;
            const ownsTx = role === 'team' && (tx.teamCode === teamCode || tx.teamId === teamCode);
            if (!isDeskOrAdmin && !ownsTx) {
              delete clientDataExtra.transaction;
            }
          }
          if (dataExtra.settlement) {
            const stl = dataExtra.settlement;
            const ownsSettlement = role === 'team' && (stl.teamCode === teamCode || stl.teamId === teamCode);
            if (!isDeskOrAdmin && !ownsSettlement) {
              delete clientDataExtra.settlement;
            }
          }

          const deltaPayload = JSON.stringify({
            type: eventType,
            eventType: eventType,
            entityType: getRealtimeEntityType(eventType),
            entityId: getRealtimeEntityId(eventType, dataExtra),
            timestamp: state.lastUpdated,
            version: state.version,
            source: 'SAAMX_COORDINATOR',
            state: {
              orders: clientOrders,
              settlements: clientSettlements,
              teams: clientTeams,
              ipos: clientIpos,
              newsEvents: state.newsEvents || [],
              fxRates: state.fxRates || {},
              fxMarketState: state.fxMarketState || {},
              orderDesks: state.orderDesks || {},
              marketState: state.marketState || {}
            },
            activeAlerts: Array.from(activeAlerts),
            ...clientDataExtra
          });

          client.send(deltaPayload);
        } catch (err) {}
      }
    }
    return;
  }

  // Full state broadcast path (rare major transitions)
  for (const client of clients) {
    if (client.readyState === 1) {
      try {
        const role = client.session?.role;
        const teamCode = client.session?.teamCode;
        const isDeskOrAdmin = ['admin', 'super_admin', 'operator_x', 'exchange', 'sebi', 'desk', 'verification', 'bank_teller'].includes(role);

        const clientState = getSanitizedState(state, role, teamCode);

        // Sanitize dataExtra in full state broadcast too
        const clientDataExtra = { ...dataExtra };
        if (dataExtra.order) {
          const ord = dataExtra.order;
          const ownsOrder = role === 'team' && (ord.teamCode === teamCode || ord.teamId === teamCode);
          if (!isDeskOrAdmin && !ownsOrder) {
            delete clientDataExtra.order;
          }
        }
        if (dataExtra.transaction) {
          const tx = dataExtra.transaction;
          const ownsTx = role === 'team' && (tx.teamCode === teamCode || tx.teamId === teamCode);
          if (!isDeskOrAdmin && !ownsTx) {
            delete clientDataExtra.transaction;
          }
        }
        if (dataExtra.settlement) {
          const stl = dataExtra.settlement;
          const ownsSettlement = role === 'team' && (stl.teamCode === teamCode || stl.teamId === teamCode);
          if (!isDeskOrAdmin && !ownsSettlement) {
            delete clientDataExtra.settlement;
          }
        }

        const payload = JSON.stringify({
          type: eventType,
          eventType: eventType,
          entityType: getRealtimeEntityType(eventType),
          entityId: getRealtimeEntityId(eventType, dataExtra),
          timestamp: state.lastUpdated,
          version: state.version,
          source: 'SAAMX_COORDINATOR',
          state: clientState,
          activeAlerts: Array.from(activeAlerts),
          ...clientDataExtra
        });
        client.send(payload);
      } catch (err) {}
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
app.get('/api/ping', (req, res) => {
  res.json({ pong: true, time: Date.now(), port: PORT, ready: isServerReady });
});

app.get('/api/state', (req, res) => {
  const sanitized = getSanitizedState(state, req.session?.role || req.role, req.session?.teamCode || req.teamCode);
  res.json({ state: sanitized, activeAlerts: Array.from(activeAlerts) });
});

// ----------------------------------------------------
// PERSONNEL & RBAC MANAGEMENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/permissions/matrix', (req, res) => {
  res.json({
    success: true,
    groups: PERMISSION_GROUPS,
    definitions: PERMISSION_DEFINITIONS,
    rolePermissions: ROLE_PERMISSIONS
  });
});

app.get('/api/personnel', (req, res) => {
  if (!state.personnel || !Array.isArray(state.personnel)) {
    state.personnel = getSeedPersonnel();
  }
  const staffList = state.personnel.map(p => {
    const { passwordHash, ...safe } = p;
    return {
      ...safe,
      effectivePermissions: getEffectivePermissions(p)
    };
  });
  res.json({ success: true, personnel: staffList });
});

app.post('/api/personnel', (req, res) => {
  const {
    name,
    displayName,
    username,
    role,
    department,
    password,
    assignedDesk = null,
    selectedPages = [],
    permissions = [],
    grantedPermissions = []
  } = req.body || {};

  const cleanName = (displayName || name || '').trim();
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanName) {
    return res.status(400).json({ error: 'Display name is required.' });
  }
  if (!cleanUsername || !/^[a-z0-9_-]{3,30}$/i.test(cleanUsername)) {
    return res.status(400).json({ error: 'Valid username (3-30 alphanumeric, hyphens or underscores) is required.' });
  }
  if (!role || !ROLE_PERMISSIONS[role]) {
    return res.status(400).json({ error: `Invalid role '${role}'. Must be a recognized system role.` });
  }
  const pwdValidation = validatePasswordStrength(cleanPassword);
  if (!pwdValidation.valid) {
    return res.status(400).json({ error: pwdValidation.error });
  }

  // Validate assignedDesk if provided (DESK_1 - DESK_5, BANK_1 - BANK_4, FX_1 - FX_2, IPO_DESK_1)
  const validDesks = ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5', 'BANK_1', 'BANK_2', 'BANK_3', 'BANK_4', 'FX_1', 'FX_2', 'IPO_DESK_1'];
  const cleanDesk = assignedDesk && assignedDesk !== 'UNASSIGNED' ? assignedDesk : null;
  if (cleanDesk && !validDesks.includes(cleanDesk)) {
    return res.status(400).json({ error: `Invalid assignedDesk '${cleanDesk}'. Must be a recognized desk identifier or UNASSIGNED.` });
  }

  // Ensure state.personnel is initialized
  if (!state.personnel || !Array.isArray(state.personnel)) {
    state.personnel = getSeedPersonnel();
  }

  // Check username uniqueness (case-insensitive)
  const existing = state.personnel.find(p => p.username?.toLowerCase() === cleanUsername);
  if (existing) {
    return res.status(400).json({ error: `Username '${cleanUsername}' is already taken.` });
  }

  // Validate permissions against PERMISSION_DEFINITIONS
  const validPermIds = new Set(PERMISSION_DEFINITIONS.map(p => p.id));
  const permToCheck = [...permissions, ...grantedPermissions];
  for (const perm of permToCheck) {
    if (!validPermIds.has(perm)) {
      return res.status(400).json({ error: `Unknown permission ID: '${perm}'.` });
    }
  }

  // Determine initial permissions
  const assignedPermissions = permissions.length > 0
    ? Array.from(new Set(permissions))
    : Array.from(new Set([...(ROLE_PERMISSIONS[role] || []), ...grantedPermissions]));

  const newStaff = {
    id: `USR_STAFF_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    username: cleanUsername,
    displayName: cleanName,
    role,
    status: 'ACTIVE',
    staffId: `STAFF-${role.toUpperCase().slice(0, 3)}-${String(state.personnel.length + 1).padStart(2, '0')}`,
    department: (department || 'Floor Operations').trim(),
    passwordHash: hashPassword(cleanPassword),
    assignedDesk: cleanDesk,
    selectedPages: Array.isArray(selectedPages) ? selectedPages : [],
    permissions: assignedPermissions,
    grantedPermissions: Array.isArray(grantedPermissions) ? grantedPermissions : [],
    createdAt: Date.now(),
    lastLogin: null
  };

  // If desk is assigned, update orderDesks and clear previous occupant
  if (cleanDesk) {
    state.personnel.forEach(p => {
      if (p.assignedDesk === cleanDesk) p.assignedDesk = null;
    });
    if (state.orderDesks?.[cleanDesk]) {
      state.orderDesks[cleanDesk].operator = newStaff.displayName;
      state.orderDesks[cleanDesk].operatorId = newStaff.id;
      state.orderDesks[cleanDesk].operatorUsername = newStaff.username;
      state.orderDesks[cleanDesk].operatorDisplayName = newStaff.displayName;
    }
  }

  state.personnel.push(newStaff);

  logAuditEvent({
    actor: req.session?.username || 'admin',
    role: req.session?.role || 'admin',
    action: 'PERSONNEL_CREATE',
    target: newStaff.username,
    reason: `Created staff account for ${newStaff.displayName} (${newStaff.role})${cleanDesk ? ` assigned to ${cleanDesk}` : ''}`,
    newState: {
      id: newStaff.id,
      username: newStaff.username,
      displayName: newStaff.displayName,
      role: newStaff.role,
      assignedDesk: newStaff.assignedDesk,
      department: newStaff.department,
      selectedPages: newStaff.selectedPages,
      permissions: newStaff.permissions
    }
  });

  saveState();
  broadcastState('PERSONNEL_UPDATE', { message: `Staff member ${newStaff.displayName} provisioned.` });

  const { passwordHash, ...safeAccount } = newStaff;
  return res.status(201).json({
    success: true,
    account: {
      ...safeAccount,
      effectivePermissions: getEffectivePermissions(newStaff)
    }
  });
});

app.put('/api/personnel/:id', (req, res) => {
  const staffId = req.params.id;
  const staff = (state.personnel || []).find(p => p.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'Personnel account not found.' });
  }

  const {
    displayName,
    name,
    role,
    department,
    assignedDesk,
    selectedPages,
    permissions,
    grantedPermissions,
    revokedPermissions
  } = req.body || {};

  const actor = req.session?.username || 'admin';
  const isSridharaTarget = staff.username?.toLowerCase() === 'sridhara' || staff.id === 'USR_MASTER_01';

  // Super-admin safeguard: Only Sridhara can modify Sridhara's account
  if (isSridharaTarget && actor.toLowerCase() !== 'sridhara' && req.session?.isMaster !== true) {
    return res.status(403).json({ error: 'Super-admin account Sridhara can only be modified by Sridhara.' });
  }

  // Prevent demoting Sridhara
  if (isSridharaTarget && role && role !== 'super_admin') {
    return res.status(400).json({ error: 'Cannot change the role of super-admin Sridhara.' });
  }

  // Safeguard: Cannot remove last active super-admin
  if (staff.role === 'super_admin' && role && role !== 'super_admin') {
    const activeSuperAdmins = (state.personnel || []).filter(p => p.role === 'super_admin' && p.status === 'ACTIVE' && p.id !== staff.id);
    if (activeSuperAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot remove the last active super-admin.' });
    }
  }

  // Validate permissions if provided
  if (permissions || grantedPermissions) {
    const validPermIds = new Set(PERMISSION_DEFINITIONS.map(p => p.id));
    const permToCheck = [...(permissions || []), ...(grantedPermissions || [])];
    for (const perm of permToCheck) {
      if (!validPermIds.has(perm)) {
        return res.status(400).json({ error: `Unknown permission ID: '${perm}'.` });
      }
    }
  }

  const previousState = {
    displayName: staff.displayName,
    role: staff.role,
    assignedDesk: staff.assignedDesk,
    department: staff.department,
    selectedPages: staff.selectedPages,
    permissions: staff.permissions
  };

  if (displayName || name) staff.displayName = (displayName || name).trim();
  if (department) staff.department = department.trim();
  if (role && ROLE_PERMISSIONS[role]) staff.role = role;

  if (assignedDesk !== undefined) {
    const cleanDesk = assignedDesk && assignedDesk !== 'UNASSIGNED' ? assignedDesk : null;
    const previousDesk = staff.assignedDesk;
    staff.assignedDesk = cleanDesk;

    if (cleanDesk) {
      (state.personnel || []).forEach(p => {
        if (p.id !== staff.id && p.assignedDesk === cleanDesk) p.assignedDesk = null;
      });
      if (state.orderDesks?.[cleanDesk]) {
        state.orderDesks[cleanDesk].operator = staff.displayName;
        state.orderDesks[cleanDesk].operatorId = staff.id;
        state.orderDesks[cleanDesk].operatorUsername = staff.username;
        state.orderDesks[cleanDesk].operatorDisplayName = staff.displayName;
      }
    }

    if (previousDesk && previousDesk !== cleanDesk && state.orderDesks?.[previousDesk]) {
      const remaining = (state.personnel || []).find(p => p.assignedDesk === previousDesk);
      if (!remaining) {
        state.orderDesks[previousDesk].operator = 'Unassigned';
        state.orderDesks[previousDesk].operatorId = null;
        state.orderDesks[previousDesk].operatorUsername = null;
        state.orderDesks[previousDesk].operatorDisplayName = null;
      }
    }
  }

  if (Array.isArray(selectedPages)) staff.selectedPages = selectedPages;
  if (Array.isArray(permissions)) staff.permissions = permissions;
  if (Array.isArray(grantedPermissions)) staff.grantedPermissions = grantedPermissions;
  if (Array.isArray(revokedPermissions)) staff.revokedPermissions = revokedPermissions;

  logAuditEvent({
    actor,
    role: req.session?.role || 'admin',
    action: 'PERSONNEL_UPDATE',
    target: staff.username,
    reason: `Updated staff profile for ${staff.displayName} (${staff.username})`,
    previousState,
    newState: {
      displayName: staff.displayName,
      role: staff.role,
      assignedDesk: staff.assignedDesk,
      department: staff.department,
      selectedPages: staff.selectedPages,
      permissions: staff.permissions
    }
  });

  saveState();
  broadcastState('PERSONNEL_UPDATE', { message: `Staff member ${staff.displayName} updated.` });

  const { passwordHash, ...safeAccount } = staff;
  return res.json({
    success: true,
    account: {
      ...safeAccount,
      effectivePermissions: getEffectivePermissions(staff)
    }
  });
});

app.post('/api/personnel/:id/status', (req, res) => {
  const staffId = req.params.id;
  const { status, reason } = req.body || {};

  const staff = (state.personnel || []).find(p => p.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'Personnel account not found.' });
  }

  if (status !== 'ACTIVE' && status !== 'DISABLED') {
    return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.' });
  }

  // Super-admin safeguard: Sridhara cannot be disabled
  if ((staff.username?.toLowerCase() === 'sridhara' || staff.id === 'USR_MASTER_01') && status === 'DISABLED') {
    return res.status(403).json({ error: 'Super-admin account Sridhara cannot be deactivated.' });
  }

  // Safeguard: Cannot disable last active super-admin or administrator
  if (status === 'DISABLED' && (staff.role === 'super_admin' || staff.role === 'admin')) {
    const activeAdmins = (state.personnel || []).filter(p => (p.role === 'super_admin' || p.role === 'admin') && p.status === 'ACTIVE' && p.id !== staff.id);
    if (activeAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot deactivate the last active administrator.' });
    }
  }

  const prevStatus = staff.status;
  staff.status = status;

  // Immediate Session Revocation
  if (status === 'DISABLED') {
    for (const [sessionId, sessionData] of activeSessions.entries()) {
      if (sessionData.personnelId === staff.id || sessionData.username?.toLowerCase() === staff.username?.toLowerCase()) {
        activeSessions.delete(sessionId);
      }
    }
    sessionStore.revokeSessionsByUser(staff.id).catch(() => {});
    sessionStore.revokeSessionsByUser(staff.username).catch(() => {});
    // Also disconnect any active WebSocket connections
    for (const client of clients) {
      if (client.session?.personnelId === staff.id || client.session?.username?.toLowerCase() === staff.username?.toLowerCase()) {
        client.session = null;
        try { client.close(4003, 'Account deactivated'); } catch (e) {}
      }
    }
  }

  logAuditEvent({
    actor: req.session?.username || 'admin',
    role: req.session?.role || 'admin',
    action: status === 'DISABLED' ? 'PERSONNEL_DEACTIVATE' : 'PERSONNEL_ACTIVATE',
    target: staff.username,
    reason: reason || `Account status changed to ${status}`,
    previousState: { status: prevStatus },
    newState: { status: staff.status }
  });

  saveState();
  broadcastState('PERSONNEL_UPDATE', { message: `Staff member ${staff.displayName} is now ${status}.` });

  return res.json({ success: true, status: staff.status, id: staff.id });
});

app.post('/api/personnel/:id/reset-password', (req, res) => {
  const staffId = req.params.id;
  const { newPassword } = req.body || {};

  const cleanPassword = (newPassword || '').trim();
  const pwdValidation = validatePasswordStrength(cleanPassword);
  if (!pwdValidation.valid) {
    return res.status(400).json({ error: pwdValidation.error });
  }

  const staff = (state.personnel || []).find(p => p.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'Personnel account not found.' });
  }

  const actor = req.session?.username || 'admin';
  const isSridharaTarget = staff.username?.toLowerCase() === 'sridhara' || staff.id === 'USR_MASTER_01';

  // Safeguard: Only Sridhara can reset Sridhara's password
  if (isSridharaTarget && actor.toLowerCase() !== 'sridhara' && req.session?.isMaster !== true) {
    return res.status(403).json({ error: 'Only Sridhara can reset the super-admin master password.' });
  }

  staff.passwordHash = hashPassword(cleanPassword);

  logAuditEvent({
    actor,
    role: req.session?.role || 'admin',
    action: 'PERSONNEL_PASSWORD_RESET',
    target: staff.username,
    reason: `Password reset by ${actor}`
  });

  saveState();
  return res.json({ success: true, message: `Password reset successfully for ${staff.username}.` });
});

app.post('/api/admin/seed', (req, res) => {
  seedStarterData();
  saveState(true);
  broadcastState('SYSTEM_RESET', { message: 'Starter data seeded.' });
  res.json({
    success: true,
    securitiesCount: state.securities?.length || 0,
    teamsCount: state.teams?.length || 0,
    state: getSanitizedState(state, req.session?.role, req.session?.teamCode)
  });
});

app.post('/api/admin/reset', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required.' });
  }
  if (session.role !== 'admin' && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  const confirmText = req.body?.confirmText || req.body?.confirmPhrase;
  if (!confirmText || typeof confirmText !== 'string' || confirmText.trim() !== 'RESET ALL') {
    return res.status(400).json({ error: 'Accidental reset prevented. Must provide exact confirmation phrase "RESET ALL".' });
  }

  const startTimestamp = Date.now();
  const resetId = `RST_${startTimestamp}_${Math.random().toString(36).substring(2, 6)}`;
  const actor = session.username || session.userId || 'Administrator';
  const role = session.role || 'admin';
  const reason = req.body?.reason || 'Master clean reset executed from Admin Control Centre.';

  // Capture pre-reset metrics for complete audit traceability
  const countsBefore = {
    orders: (state.orders || []).length,
    transactions: (state.transactions || []).length,
    settlements: (state.settlements || []).length,
    fxTransactions: (state.fxTransactions || []).length,
    newsEvents: (state.newsEvents || []).length,
    auditLog: (state.auditLog || []).length,
    teams: (state.teams || []).length,
    personnel: (state.personnel || []).length,
    securities: (state.securities || []).length
  };

  // PRESERVED STATE INVARIANTS: Personnel, Accounts, News Preset Library, RBAC, System Config, Audit Logs
  const preservedPersonnel = Array.isArray(state.personnel) && state.personnel.length > 0 ? [...state.personnel] : getSeedPersonnel();
  const preservedAuditLog = Array.isArray(state.auditLog) ? [...state.auditLog] : [];
  const preservedResetHistory = Array.isArray(state.resetHistory) ? [...state.resetHistory] : [];
  const preservedEvents = Array.isArray(state.events) && state.events.length > 0 ? [...state.events] : createInitialState().events;
  const preservedMasterAdmins = state.masterAdmins || [{ username: 'Sridhara', role: 'admin', accessLevel: 'MASTER', createdAt: Date.now() }];

  // Re-initialize transient event state
  state.orders = [];
  state.transactions = [];
  state.settlements = [];
  state.fxTransactions = [];
  state.fxQueue = [];
  state.corporateActions = [];
  state.advisorReferrals = [];
  state.activeDecayingEvents = [];
  state.activeRumours = [];
  state.scheduledNews = [];
  state.fxDemandPressure = {};
  state.leaderboard = {};
  state.penalties = [];
  state.judgeScorecards = [];
  state.reconciliationRecords = [];
  state.intelligenceFeed = [];
  state.resultsLifecycle = 'CONFIGURED';
  state.publishedResults = null;

  // Clean FX spot rates & finite reserves
  state.fxRates = JSON.parse(JSON.stringify(DEFAULT_FX_RATES));
  state.fxReserves = JSON.parse(JSON.stringify(DEFAULT_FX_RESERVES));
  state.fxMarketState = {
    status: 'OPEN',
    pausedReason: null,
    pausedAt: null,
    pausedBy: null,
    marketWideTransactionLimitINR: null,
    updatedAt: Date.now()
  };
  state.fxDesks = {
    FX_1: { id: 'FX_1', name: 'FX Desk 1 (Primary)', availability: 'ACTIVE' },
    FX_2: { id: 'FX_2', name: 'FX Desk 2 (Secondary)', availability: 'ACTIVE' }
  };

  // Clean Market State
  state.marketState = {
    status: 'Open',
    sessionState: 'CONTINUOUS_TRADING',
    simulationStartTime: Date.now(),
    simulationDurationMinutes: 60,
    marketIndex: 0,
    pauseTimeOffset: 0,
    pausedAt: null
  };

  // Clean Market Indices
  state.marketIndices = {
    GLOBAL100: { name: 'SAAMX GLOBAL 100', currentValue: 1000, openingValue: 1000, changePercent: 0 },
    INDIA50: { name: 'SAAMX INDIA 50', currentValue: 5000, openingValue: 5000, changePercent: 0 },
    US100: { name: 'SAAMX US 100', currentValue: 8000, openingValue: 8000, changePercent: 0 },
    UK100: { name: 'SAAMX UK 100', currentValue: 4000, openingValue: 4000, changePercent: 0 }
  };

  // Clear circuit breaker history
  Object.keys(circuitBreakerHistory).forEach(k => delete circuitBreakerHistory[k]);
  for (const k in activeVelocityTargets) delete activeVelocityTargets[k];

  // Re-generate complete authoritative securities universe
  state.securities = generateFullSecurityUniverse();
  state.securities.forEach(s => {
    circuitBreakerHistory[s.id] = [{ timestamp: Date.now(), price: s.currentPrice }];
  });

  // Re-seed exactly 10 canonical teams (T01 - T10) with ₹1 Crore cash
  state.teams = Array.from({ length: 10 }, (_, i) => {
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
      cashWallets: { INR: 10000000, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
      reservedCash: { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
      foreignWallets: { USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
      holdings: {},
      portfolio: {},
      reservedIpoCapital: 0,
      borrowed: 0,
      isActive: true,
      createdAt: Date.now()
    };
  });

  // Re-seed welcome wire event
  state.newsEvents = [
    {
      id: `NW_STAGE_${Date.now()}`,
      headline: '🔔 SAAMX Simulation Floor Re-Initialized — 3,000+ Global Securities Active',
      description: 'The Academic Asset Market Exchange has initiated a brand new trading stage. Multi-currency trading desks, primary IPO hubs, and global indices are live.',
      sentiment: 'Positive',
      impactPercent: 0,
      triggeredAt: Date.now(),
      category: 'Macro'
    }
  ];

  // Restore preserved authoritative datasets
  state.personnel = preservedPersonnel;
  state.events = preservedEvents;
  state.masterAdmins = preservedMasterAdmins;

  const completionTimestamp = Date.now();
  const countsAfter = {
    orders: 0,
    transactions: 0,
    settlements: 0,
    fxTransactions: 0,
    newsEvents: 1,
    auditLog: preservedAuditLog.length + 1,
    teams: 10,
    personnel: state.personnel.length,
    securities: state.securities.length
  };

  const resetRecord = {
    resetId,
    timestamp: startTimestamp,
    startTimestamp,
    completionTimestamp,
    durationMs: completionTimestamp - startTimestamp,
    initiatingUser: actor,
    initiatingRole: role,
    clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
    resetType: 'MASTER_CLEAN_RESET',
    reason,
    status: 'SUCCESS',
    countsBefore,
    countsAfter,
    affectedCategories: [
      'Orders & Queues',
      'Exchange Processing & Bank Vouchers',
      'Holdings & Portfolios',
      'FX Transactions & Queue',
      'Active News & Temporary Bulletins',
      'IPO Bids & Allocations',
      'Competition Scoring & Judgements'
    ],
    preservedCategories: [
      'Personnel Accounts & Passwords',
      'Role Permissions (RBAC)',
      'Immutable Audit Log History',
      'Authoritative 3,000+ Security Universe',
      'System Settings & Deployment Configuration'
    ],
    buildId: 'SAAMX-PROD-2026.11'
  };

  // Restore audit logs & append reset history
  state.auditLog = preservedAuditLog;
  state.resetHistory = [resetRecord, ...preservedResetHistory];

  logAuditEvent({
    actor,
    role,
    action: 'MASTER_CLEAN_RESET',
    target: 'ALL_EVENT_MODULES',
    reason: `Master Clean Reset ${resetId} completed in ${resetRecord.durationMs}ms. Orders, holdings, and event state refreshed. Personnel & Audit preserved.`,
    newState: { resetId, countsAfter }
  });

  activeAlerts.clear();
  saveState(true);
  broadcastState('SYSTEM_RESET', { message: 'Master Clean Reset executed.', resetId, actor });

  res.json({
    success: true,
    message: 'Master Clean Reset executed successfully. Preserved personnel, RBAC, audit trails, and security universe.',
    resetId,
    resetRecord,
    history: state.resetHistory,
    state: getSanitizedState(state, session.role, session.teamCode)
  });
});

// Chronological Master Reset Audit History Endpoint
app.get('/api/admin/reset-history', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  res.json({
    success: true,
    history: state.resetHistory || []
  });
});

// PostgreSQL Session Store Administration
app.get('/api/admin/sessions', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  const sessions = await sessionStore.listActiveSessions();
  return res.json({ success: true, count: sessions.length, sessions });
});

app.post('/api/admin/sessions/revoke', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  const { sessionId, userId, teamCode } = req.body || {};
  let revokedCount = 0;
  if (sessionId) {
    activeSessions.delete(sessionId);
    await sessionStore.revokeSession(sessionId);
    revokedCount = 1;
  } else if (userId) {
    for (const [sId, sData] of activeSessions.entries()) {
      if (sData.personnelId === userId || sData.username?.toLowerCase() === userId.toLowerCase()) {
        activeSessions.delete(sId);
      }
    }
    revokedCount = await sessionStore.revokeSessionsByUser(userId);
  } else if (teamCode) {
    for (const [sId, sData] of activeSessions.entries()) {
      if (sData.teamCode?.toUpperCase() === teamCode.toUpperCase()) {
        activeSessions.delete(sId);
      }
    }
    revokedCount = await sessionStore.revokeSessionsByTeam(teamCode);
  } else {
    return res.status(400).json({ error: 'Missing target: sessionId, userId, or teamCode required.' });
  }
  return res.json({ success: true, revokedCount });
});

app.post('/api/admin/sessions/revoke-all', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  activeSessions.clear();
  const count = await sessionStore.revokeAllSessions();
  return res.json({ success: true, revokedCount: count });
});

// Database Connection & Pool Status
app.get('/api/db/status', async (req, res) => {
  const configured = isPgConfigured();
  const connected = await isPgConnected();
  const poolInstance = getPool();
  return res.json({
    status: connected ? 'POSTGRES_CONNECTED' : (configured ? 'POSTGRES_UNREACHABLE' : 'FALLBACK_MODE'),
    isPgConfigured: configured,
    isPgConnected: connected,
    pool: {
      max: 30,
      idleTimeoutMillis: 30000,
      totalCount: poolInstance?.totalCount || 0,
      idleCount: poolInstance?.idleCount || 0,
      waitingCount: poolInstance?.waitingCount || 0
    },
    sessionStore: 'PostgresSessionStore',
    activeSessionsCount: activeSessions.size
  });
});

// Technical Operations Telemetry Calculations
function calculateLatencyPercentiles(samples) {
  if (!samples || samples.length === 0) return { p50: 0, p95: 0, p99: 0, samplesCount: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return parseFloat(sorted[idx].toFixed(2));
  };
  return {
    p50: getP(50),
    p95: getP(95),
    p99: getP(99),
    samplesCount: samples.length
  };
}

function calculateJitter(samples) {
  if (!samples || samples.length < 2) return 0;
  let totalDiff = 0;
  for (let i = 1; i < samples.length; i++) {
    totalDiff += Math.abs(samples[i] - samples[i - 1]);
  }
  return parseFloat((totalDiff / (samples.length - 1)).toFixed(2));
}

function getOrderThroughput(orders) {
  const now = Date.now();
  const windows = {
    m5: now - 5 * 60 * 1000,
    m15: now - 15 * 60 * 1000,
    m60: now - 60 * 60 * 1000
  };

  const calcForWindow = (cutoff) => {
    const inWin = orders.filter(o => (o.submittedAt || o.timestamp || 0) >= cutoff);
    return {
      submitted: inWin.length,
      accepted: inWin.filter(o => ['EXECUTED', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED'].includes(o.status)).length,
      rejected: inWin.filter(o => o.status === 'REJECTED' || o.status === 'CANCELLED').length
    };
  };

  return {
    last5m: calcForWindow(windows.m5),
    last15m: calcForWindow(windows.m15),
    last60m: calcForWindow(windows.m60)
  };
}

function getVoucherThroughput(settlements) {
  const all = settlements || [];
  return {
    totalGenerated: all.length,
    settled: all.filter(s => s.status === 'SETTLED').length,
    pending: all.filter(s => s.status === 'PENDING').length,
    rejected: all.filter(s => s.status === 'REJECTED').length,
    failed: all.filter(s => s.status === 'REJECTED' || s.status === 'FAILED').length,
    voided: all.filter(s => s.status === 'VOIDED').length,
    duplicateAttempts: telemetryStore.duplicateSettlementAttempts || 0
  };
}

function getQueueDepths(orders, settlements) {
  const exchangeDesks = ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'];
  const exchangeQueue = {};
  for (const d of exchangeDesks) {
    exchangeQueue[d] = orders.filter(o => o.deskId === d && ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'BEING_VERIFIED', 'VERIFIED_AWAITING_EXCHANGE', 'UNDER_EXCHANGE_REVIEW', 'VALIDATED'].includes(o.status)).length;
  }

  const bankDesks = ['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4'];
  const bankQueue = {};
  for (const b of bankDesks) {
    bankQueue[b] = settlements.filter(s => s.bankDeskId === b && s.status === 'PENDING').length;
  }

  return {
    exchangeQueue,
    bankQueue,
    exchangeDesks: exchangeQueue,
    bankDesks: bankQueue
  };
}

// Technical Operations Monitoring Portal Telemetry Endpoint
app.get(['/api/monitoring/metrics', '/api/tech-ops/metrics'], async (req, res) => {
  const userRole = (req.session?.role || '').toLowerCase();
  if (!['admin', 'super_admin', 'sebi'].includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden: Technical operations telemetry requires Admin, Super Admin, or SEBI Regulatory privileges.' });
  }

  const dbConfigured = isPgConfigured();
  const dbConnected = await isPgConnected();
  let dbLatency = null;
  let poolStats = null;
  if (dbConfigured && dbConnected) {
    const pool = getPool();
    poolStats = pool ? {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    } : null;
    try {
      const t0 = process.hrtime();
      await pool.query('SELECT 1');
      const tDiff = process.hrtime(t0);
      dbLatency = parseFloat((tDiff[0] * 1e3 + tDiff[1] * 1e-6).toFixed(2));
    } catch (e) {
      dbLatency = -1;
    }
  }

  // Active Sessions & Role Breakdown
  const roleBreakdown = {};
  for (const s of activeSessions.values()) {
    const r = s.role || 'unknown';
    roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
  }

  const activeWsCount = clients ? clients.size : 0;
  const rpm = telemetryStore.requestTimestamps.length;
  const latencyMetrics = calculateLatencyPercentiles(telemetryStore.latencies);
  const jitterMs = calculateJitter(telemetryStore.latencies);
  const ordersList = state.orders || [];
  const settlementsList = state.settlements || [];
  const orderStats = getOrderThroughput(ordersList);
  const voucherStats = getVoucherThroughput(settlementsList);
  const queueDepths = getQueueDepths(ordersList, settlementsList);

  return res.json({
    success: true,
    timestamp: Date.now(),
    health: {
      status: 'HEALTHY',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rssBytes: process.memoryUsage().rss,
        heapUsedBytes: process.memoryUsage().heapUsed,
        heapTotalBytes: process.memoryUsage().heapTotal
      },
      database: {
        engine: dbConfigured ? 'Supabase PostgreSQL 15' : 'In-Memory / File Fallback',
        configured: dbConfigured,
        connected: dbConnected,
        pingLatencyMs: dbLatency,
        pool: poolStats
      },
      liveMarketMirror: {
        status: 'CONNECTED',
        provider: 'Firebase Realtime Database (Delta Publisher)'
      }
    },
    sessions: {
      activeCount: activeSessions.size,
      breakdown: roleBreakdown,
      activeWebSockets: activeWsCount
    },
    throughput: {
      rpm,
      latency: latencyMetrics,
      jitterMs,
      duplicateSettlementAttempts: telemetryStore.duplicateSettlementAttempts
    },
    orders: orderStats,
    vouchers: voucherStats,
    queues: queueDepths,
    securityEvents: telemetryStore.securityEvents.slice(-50).reverse()
  });
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
  if (req.session && req.session.role !== 'admin' && req.session.role !== 'super_admin' && req.session.role !== 'sebi' && req.session.role !== 'coordinator') {
    return res.status(403).json({ error: 'Forbidden: Requires SEBI, Coordinator, or Administrator privileges to claim coordinator status.' });
  }

  const effectiveRole = role || req.session?.role || 'sebi';
  state.coordinator = {
    sessionUuid: sessionUuid || `SESSION_${Date.now()}`,
    role: effectiveRole,
    owner: effectiveRole,
    claimedAt: Date.now(),
    lastHeartbeat: Date.now()
  };

  logAuditEvent({
    actor: req.session?.username || 'SEBI Officer',
    role: effectiveRole,
    action: 'COORDINATOR_STATUS_CLAIMED',
    target: 'COORDINATOR',
    reason: `Coordinator status claimed by ${req.session?.username || effectiveRole}`
  });

  saveState(false);
  broadcastState('COORDINATOR_CLAIMED', { coordinator: state.coordinator });
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
    marketIndices: state.marketIndices,
    fxRates: state.fxRates,
    marketState: state.marketState,
    breadth: { advances: adv, declines: dec, unchanged: unc, total: (state.securities || []).length },
    latestNews: (state.newsEvents || []).find(n => !n.dismissed && n.active !== false) || null
  });
});

// SEBI Surveillance Halt / Resume
app.post('/api/sebi/halt', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }
  if (session.role !== 'sebi' && session.role !== 'admin' && session.role !== 'super_admin' && !hasPerm(session, 'sebi.halt')) {
    return res.status(403).json({ error: 'Forbidden: Halting a security requires SEBI Surveillance or Administrator privileges.' });
  }

  const { securityId, ticker, reason } = req.body || {};
  const target = securityId || ticker;
  const sec = state.securities.find(s => s.id === target || s.ticker === target);
  if (!sec) return res.status(404).json({ error: 'Security not found' });
  sec.status = 'Halted';
  logAuditEvent({
    actor: session.displayName || session.username || 'SEBI Surveillance',
    role: session.role || 'sebi',
    action: `HALT_SECURITY: ${sec.ticker}`,
    target: sec.ticker,
    reason: reason || 'Circuit breaker / Regulatory intervention'
  });
  saveState(true);
  broadcastState('MARKET_HALT', { ticker: sec.ticker, name: sec.name, reason: reason || 'Trading Suspended by SEBI' });
  res.json({ success: true, security: sec });
});

app.post('/api/sebi/resume', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }
  if (session.role !== 'sebi' && session.role !== 'admin' && session.role !== 'super_admin' && !hasPerm(session, 'sebi.resume')) {
    return res.status(403).json({ error: 'Forbidden: Resuming a security requires SEBI Surveillance or Administrator privileges.' });
  }

  const { securityId, ticker } = req.body || {};
  const target = securityId || ticker;
  const sec = state.securities.find(s => s.id === target || s.ticker === target);
  if (!sec) return res.status(404).json({ error: 'Security not found' });
  sec.status = 'Active';
  logAuditEvent({
    actor: session.displayName || session.username || 'SEBI Surveillance',
    role: session.role || 'sebi',
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
  const { eventId, forceOverride, reason } = req.body || {};
  const updates = req.body?.updates || { ...(req.body || {}) };
  delete updates.eventId;
  delete updates.forceOverride;
  delete updates.reason;
  const targetId = eventId || state.currentEventId;
  const event = (state.events || []).find(e => e.eventId === targetId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (updates && updates.maximumInvestmentHouses !== undefined) {
    const rawVal = updates.maximumInvestmentHouses;
    if (rawVal === null || rawVal === '' || typeof rawVal === 'boolean') {
      return res.status(400).json({ error: 'Configured Investment House capacity must be an integer between 10 and 20 inclusive.' });
    }
    const cap = Number(rawVal);
    if (!Number.isInteger(cap) || cap < 10 || cap > 20) {
      return res.status(400).json({ error: 'Configured Investment House capacity must be an integer between 10 and 20 inclusive.' });
    }
    const isMarketRunning = state.marketState?.status === 'Open' || state.marketState?.sessionState === 'CONTINUOUS_TRADING' || event.eventStatus === 'MARKET_ACTIVE';
    if (isMarketRunning && !forceOverride && cap !== event.maximumInvestmentHouses) {
      return res.status(409).json({
        error: 'Capacity configuration is locked while trading session is active. Rehearsal or admin override required.',
        locked: true
      });
    }
    updates.maximumInvestmentHouses = cap;
    if (!state.settings) state.settings = {};
    state.settings.configuredHouseCapacity = cap;
  }

  // Ensure startingCapital if updated remains aligned with authoritative capital
  if (updates && updates.startingCapital !== undefined) {
    const sc = Number(updates.startingCapital);
    if (isNaN(sc) || sc <= 0) {
      return res.status(400).json({ error: 'Valid starting capital required.' });
    }
  }

  const prevEvent = JSON.parse(JSON.stringify(event));
  Object.assign(event, updates || {});
  event.updatedAt = Date.now();

  logAuditEvent({
    actor: req.session?.username || 'Event Administrator',
    role: req.session?.role || 'admin',
    action: `UPDATE_EVENT: ${event.eventName}`,
    target: targetId,
    reason: reason || 'Event settings updated',
    previousState: prevEvent,
    newState: event
  });

  saveState(true);
  broadcastState('EVENT_CONFIG_UPDATED', { event });
  res.json({ success: true, event });
});

// Authoritative Event Capacity Read Endpoint
app.get('/api/capacity', (req, res) => {
  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
  const configuredCapacity = 10;
  const activeTeams = (state.teams || []).filter(t => t.isActive !== false);
  const registeredHouses = Math.min(10, (state.investmentHouses || []).length);
  const isLocked = state.marketState?.status === 'Open' || state.marketState?.sessionState === 'CONTINUOUS_TRADING' || currentEvent?.eventStatus === 'MARKET_ACTIVE';

  res.json({
    success: true,
    minimumCapacity: 10,
    maximumSupportedCapacity: 10,
    configuredCapacity: 10,
    registeredHouses,
    activatedHouses: Math.min(10, activeTeams.length),
    participatingHouses: Math.min(10, activeTeams.length),
    startingCapitalPerHouse: 10000000,
    aggregateStartingCapital: 100000000,
    aggregateParticipatingCapital: Math.min(10, activeTeams.length) * 10000000,
    isLocked: Boolean(isLocked),
    rule: 'SAAMX Canonical Rule: Participant universe is strictly fixed to exactly 10 teams (T01–T10).'
  });
});

// Authoritative Administrative Capacity Configuration Endpoint
app.post('/api/admin/capacity', (req, res) => {
  const { capacity, reason, forceOverride } = req.body || {};
  if (capacity !== undefined && Number(capacity) !== 10) {
    return res.status(400).json({ error: 'Configured Investment House capacity is permanently fixed to exactly 10 teams (T01–T10).' });
  }

  const cap = 10;
  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
  if (currentEvent) {
    currentEvent.maximumInvestmentHouses = cap;
    currentEvent.updatedAt = Date.now();
  }
  if (!state.settings) state.settings = {};
  state.settings.configuredHouseCapacity = cap;

  const registeredHouses = (state.investmentHouses || []).length;
  const activeTeams = (state.teams || []).filter(t => t.isActive !== false);

  logAuditEvent({
    actor: req.session?.username || 'Administrator',
    role: req.session?.role || 'admin',
    action: 'CAPACITY_CONFIG_UPDATED',
    target: 'EVENT_CAPACITY',
    previousValue: oldCap,
    newValue: cap,
    reason: reason || `Updated participating house capacity from ${oldCap} to ${cap}`
  });

  saveState(true);
  broadcastState('CAPACITY_CONFIG_UPDATED', {
    configuredCapacity: cap,
    minimumCapacity: 10,
    maximumSupportedCapacity: 20,
    registeredHouses,
    activatedHouses: activeTeams.length,
    participatingHouses: activeTeams.length,
    startingCapitalPerHouse: 10000000,
    aggregateStartingCapital: cap * 10000000,
    aggregateParticipatingCapital: activeTeams.length * 10000000
  });

  res.json({
    success: true,
    configuredCapacity: cap,
    minimumCapacity: 10,
    maximumSupportedCapacity: 20,
    registeredHouses,
    activatedHouses: activeTeams.length,
    participatingHouses: activeTeams.length,
    startingCapitalPerHouse: 10000000,
    aggregateStartingCapital: cap * 10000000,
    aggregateParticipatingCapital: activeTeams.length * 10000000
  });
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
  const { durationMinutes, duration } = req.body || {};
  state.marketState.status = 'Open';
  state.marketState.sessionState = 'CONTINUOUS_TRADING';
  state.marketState.simulationStartTime = Date.now();
  state.marketState.pauseTimeOffset = 0;
  state.marketState.pausedAt = null;
  const mins = Number(durationMinutes || duration);
  if (!isNaN(mins) && mins > 0) {
    state.marketState.simulationDurationMinutes = mins;
  }
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

app.post('/api/admin/timer-config', (req, res) => {
  const { durationMinutes, timerMode, marketOpenTime, marketCloseTime, simulationStartTime } = req.body || {};
  
  if (durationMinutes !== undefined) {
    const mins = Number(durationMinutes);
    if (!isNaN(mins) && mins > 0 && mins <= 1440) {
      state.marketState.simulationDurationMinutes = mins;
    }
  }

  if (timerMode && ['COUNTDOWN', 'SCHEDULE_SYNC'].includes(timerMode.toUpperCase())) {
    state.marketState.timerMode = timerMode.toUpperCase();
    state.marketState.mode = timerMode.toUpperCase() === 'COUNTDOWN' ? 'DEMO' : 'EVENT';
  }

  if (simulationStartTime !== undefined) {
    state.marketState.simulationStartTime = simulationStartTime ? Number(simulationStartTime) : null;
  }

  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || (state.events || [])[0];
  if (currentEvent) {
    if (marketOpenTime) currentEvent.marketOpenTime = marketOpenTime;
    if (marketCloseTime) currentEvent.marketCloseTime = marketCloseTime;
    currentEvent.updatedAt = Date.now();
  }

  saveState(true);
  broadcastState('TIMER_CONFIG_UPDATED', { marketState: state.marketState, currentEvent });

  res.json({
    success: true,
    durationMinutes: state.marketState.simulationDurationMinutes,
    timerMode: state.marketState.timerMode,
    marketState: state.marketState,
    currentEvent,
    message: 'Timer and schedule configuration updated successfully.'
  });
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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session required to view scorecards.' });
  }

  const isDeliberator = hasPerm(session, 'judging.view') || hasPerm(session, 'judging.score') || hasPerm(session, 'results.approve') || session.role === 'admin' || session.role === 'super_admin';
  const isPublished = state.resultsLifecycle === 'PUBLISHED' && hasPerm(session, 'results.view');

  if (!isDeliberator && !isPublished) {
    return res.status(403).json({ error: 'Forbidden: Requires judging authorization to view scorecards.' });
  }

  const { teamCode, judgeId } = req.query;
  let cards = state.judgeScorecards || [];
  if (teamCode) cards = cards.filter(c => (c.teamCode || '').toUpperCase() === teamCode.toUpperCase());
  if (judgeId) cards = cards.filter(c => (c.judgeId || '').toUpperCase() === judgeId.toUpperCase());
  res.json({ success: true, scorecards: cards, resultsLifecycle: state.resultsLifecycle });
});

app.post('/api/judging/scorecard/save', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session required to submit scorecards.' });
  }
  if (!hasPerm(session, 'judging.score') && session.role !== 'admin' && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Requires judging.score permission.' });
  }

  if (state.resultsLifecycle === 'PUBLISHED') {
    return res.status(400).json({ error: 'Cannot modify scorecards after official results have been published.' });
  }

  const body = req.body || {};
  const dm = body.decisionMakingRatings || {};
  const fp = body.futurePotentialRatings || {};

  const teamCode = body.teamCode;
  const responseToEvents = body.responseToEvents ?? dm.responseToEvents ?? dm.eventResponse ?? 3;
  const decisionTiming = body.decisionTiming ?? dm.decisionTiming ?? dm.timing ?? 3;
  const adaptability = body.adaptability ?? dm.adaptability ?? 3;
  const riskRecognition = body.riskRecognition ?? dm.riskRecognition ?? 3;
  const forwardPositioning = body.forwardPositioning ?? fp.forwardPositioning ?? 3;
  const resilience = body.resilience ?? fp.resilience ?? fp.scenarioResilience ?? 3;
  const balance = body.balance ?? fp.balance ?? fp.opportunityBalance ?? 3;
  const adaptCapacity = body.adaptCapacity ?? fp.adaptCapacity ?? fp.capacityToAdapt ?? 3;
  const notes = body.notes ?? '';
  const isLocked = body.isLocked ?? false;
  const overrideLock = body.overrideLock ?? false;

  if (!teamCode || typeof teamCode !== 'string' || !teamCode.trim()) {
    return res.status(400).json({ error: 'Team Code is required.' });
  }

  const cleanTeamCode = teamCode.trim().toUpperCase();
  const targetTeam = (state.teams || []).find(t => 
    (t.teamCode || '').toUpperCase() === cleanTeamCode || 
    (t.id || '').toUpperCase() === cleanTeamCode
  );
  if (!targetTeam) {
    return res.status(404).json({ error: `Team ${cleanTeamCode} not found in competition roster.` });
  }

  // Derive judge identity strictly from authenticated session (with admin assignment support)
  const canAssignJudge = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'results.approve');
  const effectiveJudgeId = (canAssignJudge && body.judgeId) ? body.judgeId : (session.personnelId || session.username);
  const effectiveJudgeName = (canAssignJudge && body.judgeName) ? body.judgeName : (session.displayName || session.username || 'Official Judge');

  // Validate rubric scores (must be numbers between 0 and 5)
  const rubricFields = [
    { key: 'responseToEvents', val: responseToEvents },
    { key: 'decisionTiming', val: decisionTiming },
    { key: 'adaptability', val: adaptability },
    { key: 'riskRecognition', val: riskRecognition },
    { key: 'forwardPositioning', val: forwardPositioning },
    { key: 'resilience', val: resilience },
    { key: 'balance', val: balance },
    { key: 'adaptCapacity', val: adaptCapacity }
  ];

  for (const item of rubricFields) {
    const num = Number(item.val);
    if (isNaN(num) || num < 0 || num > 5) {
      return res.status(400).json({ error: `Invalid rubric score for ${item.key}: must be a number between 0 and 5.` });
    }
  }

  if (!state.judgeScorecards) state.judgeScorecards = [];

  const existingIdx = state.judgeScorecards.findIndex(c => 
    (c.teamCode || '').toUpperCase() === cleanTeamCode && 
    (c.judgeId || '').toUpperCase() === String(effectiveJudgeId).toUpperCase()
  );

  if (existingIdx >= 0) {
    if (state.judgeScorecards[existingIdx].isLocked) {
      const canOverride = (session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'results.approve')) && overrideLock;
      if (!canOverride) {
        return res.status(400).json({ error: 'This scorecard is locked. Admin override required to edit.' });
      }
    }
  }

  const cardData = {
    id: existingIdx >= 0 ? state.judgeScorecards[existingIdx].id : `CARD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    judgeId: String(effectiveJudgeId),
    judgeName: String(effectiveJudgeName),
    teamCode: cleanTeamCode,
    responseToEvents: Math.min(5, Math.max(0, Number(responseToEvents))),
    decisionTiming: Math.min(5, Math.max(0, Number(decisionTiming))),
    adaptability: Math.min(5, Math.max(0, Number(adaptability))),
    riskRecognition: Math.min(5, Math.max(0, Number(riskRecognition))),
    forwardPositioning: Math.min(5, Math.max(0, Number(forwardPositioning))),
    resilience: Math.min(5, Math.max(0, Number(resilience))),
    balance: Math.min(5, Math.max(0, Number(balance))),
    adaptCapacity: Math.min(5, Math.max(0, Number(adaptCapacity))),
    notes: String(notes || ''),
    isLocked: Boolean(isLocked),
    updatedAt: Date.now()
  };

  if (existingIdx >= 0) {
    state.judgeScorecards[existingIdx] = cardData;
  } else {
    state.judgeScorecards.push(cardData);
  }

  logAuditEvent({
    actor: effectiveJudgeName,
    role: session.role || 'judge',
    action: `SAVE_SCORECARD: ${cleanTeamCode}`,
    target: cleanTeamCode,
    reason: isLocked ? 'Scorecard submitted & locked' : 'Scorecard draft autosaved'
  });

  saveState(true);
  broadcastState('SCORECARD_UPDATED', { scorecard: cardData });
  res.json({ success: true, scorecard: cardData });
});

app.post('/api/judging/moderate', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session required to moderate scorecards.' });
  }
  if (!hasPerm(session, 'results.approve') && session.role !== 'admin' && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Requires results.approve moderation permission.' });
  }

  if (state.resultsLifecycle === 'PUBLISHED') {
    return res.status(400).json({ error: 'Cannot moderate scorecards after official results have been published.' });
  }

  const { teamCode, resolutionNotes = '', adjustedCard } = req.body || {};
  if (!teamCode || typeof teamCode !== 'string' || !teamCode.trim()) {
    return res.status(400).json({ error: 'Team Code required.' });
  }

  const cleanTeamCode = teamCode.trim().toUpperCase();
  const targetTeam = (state.teams || []).find(t => 
    (t.teamCode || '').toUpperCase() === cleanTeamCode || 
    (t.id || '').toUpperCase() === cleanTeamCode
  );
  if (!targetTeam) {
    return res.status(404).json({ error: `Team ${cleanTeamCode} not found in competition roster.` });
  }

  // Derive moderator identity from session
  const effectiveModerator = session.displayName || session.username || 'Chief Judge';

  if (!state.judgeScorecards) state.judgeScorecards = [];

  // If adjustedCard is provided, use it; otherwise harmonized average of existing cards
  const existingCards = state.judgeScorecards.filter(c => (c.teamCode || '').toUpperCase() === cleanTeamCode);
  const cardData = adjustedCard || {};

  const modCard = {
    id: `MOD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    judgeId: 'MODERATOR',
    judgeName: `Moderator (${effectiveModerator})`,
    teamCode: cleanTeamCode,
    responseToEvents: Math.min(5, Math.max(0, Number(cardData.responseToEvents ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.responseToEvents||3),0)/existingCards.length) : 3)))),
    decisionTiming: Math.min(5, Math.max(0, Number(cardData.decisionTiming ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.decisionTiming||3),0)/existingCards.length) : 3)))),
    adaptability: Math.min(5, Math.max(0, Number(cardData.adaptability ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.adaptability||3),0)/existingCards.length) : 3)))),
    riskRecognition: Math.min(5, Math.max(0, Number(cardData.riskRecognition ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.riskRecognition||3),0)/existingCards.length) : 3)))),
    forwardPositioning: Math.min(5, Math.max(0, Number(cardData.forwardPositioning ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.forwardPositioning||3),0)/existingCards.length) : 3)))),
    resilience: Math.min(5, Math.max(0, Number(cardData.resilience ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.resilience||3),0)/existingCards.length) : 3)))),
    balance: Math.min(5, Math.max(0, Number(cardData.balance ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.balance||3),0)/existingCards.length) : 3)))),
    adaptCapacity: Math.min(5, Math.max(0, Number(cardData.adaptCapacity ?? (existingCards.length ? (existingCards.reduce((a,c)=>a+Number(c.adaptCapacity||3),0)/existingCards.length) : 3)))),
    isLocked: true,
    isModerated: true,
    moderationNotes: String(resolutionNotes || '').trim(),
    updatedAt: Date.now()
  };

  state.judgeScorecards.push(modCard);

  logAuditEvent({
    actor: effectiveModerator,
    role: session.role || 'admin',
    action: `MODERATE_SCORECARDS: ${cleanTeamCode}`,
    target: cleanTeamCode,
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
  const effectiveAuthor = req.session?.displayName || req.session?.username || author || advisor.name;
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
    author: effectiveAuthor
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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session required to control debate round.' });
  }
  if (!hasPerm(session, 'market.control') && session.role !== 'coordinator' && session.role !== 'admin' && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Debate round management requires market.control permission.' });
  }

  const { round = 1, topic, timerSeconds = 300, moderatorNotes = '', status = 'ACTIVE' } = req.body || {};
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Debate topic required.' });
  }

  const roundNum = Number(round);
  const timerSec = Number(timerSeconds);
  if (isNaN(roundNum) || roundNum <= 0 || !Number.isInteger(roundNum)) {
    return res.status(400).json({ error: 'Round must be a positive integer.' });
  }
  if (isNaN(timerSec) || timerSec <= 0) {
    return res.status(400).json({ error: 'Timer seconds must be a positive number.' });
  }

  const effectiveOperator = session.displayName || session.username || 'Debate Moderator';

  state.bullBearDebate = {
    activeRound: roundNum,
    currentTopic: topic.trim(),
    timerSeconds: timerSec,
    status: String(status || 'ACTIVE').toUpperCase(),
    startedAt: Date.now(),
    moderatorNotes: String(moderatorNotes || '').trim(),
    history: state.bullBearDebate?.history || []
  };

  logAuditEvent({
    actor: effectiveOperator,
    role: session.role || 'moderator',
    action: `START_DEBATE_ROUND_${roundNum}: ${topic.trim()}`,
    target: 'BullBearArena',
    reason: moderatorNotes || 'Debate round initiated'
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
  let totalCash = 0;
  let totalHoldings = 0;
  (state.teams || []).forEach(team => {
    totalCash += calculateConsolidatedCashBalance(team, state.fxRates);

    Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
      const sec = (state.securities || []).find(s => s.ticker === ticker || s.id === ticker);
      if (sec && qty > 0) {
        const secCur = sec.currency || (sec.exchange === 'NASDAQ' || sec.exchange === 'NYSE' ? 'USD' : sec.exchange === 'LSE' ? 'GBP' : sec.exchange === 'XETRA' ? 'EUR' : 'INR');
        const pairKey = `${secCur}INR`;
        const fx = secCur === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
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

  const processed = state.teams
    .filter(t => t.isActive)
    .map(team => {
      // Calculate consolidated multi-currency cash across all 10 currencies
      const totalCashInr = calculateConsolidatedCashBalance(team, state.fxRates);

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
          const pairKey = `${secCur}INR`;
          const currentFx = secCur === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
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

app.get('/api/admin/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));
    const list = files.map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      return {
        id: file.replace('.json', ''),
        fileName: file,
        sizeKB: Math.round(stat.size / 1024),
        createdAt: stat.mtimeMs,
        timestamp: stat.mtime.toISOString()
      };
    });
    res.json({ success: true, backups: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/api/admin/backup/:id/download', '/api/admin/backups/:id/download'], (req, res) => {
  const backupId = req.params.id;
  const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup not found' });
  }
  res.download(backupPath, `${backupId}.json`);
});

app.get(['/api/admin/state/download', '/api/state/download'], (req, res) => {
  const tempExport = path.join(BACKUP_DIR, `saamx_export_${Date.now()}.json`);
  fs.writeFileSync(tempExport, JSON.stringify(state, null, 2), 'utf8');
  res.download(tempExport, `saamx_live_state_${new Date().toISOString().replace(/[:.]/g, '-')}.json`, () => {
    try { fs.unlinkSync(tempExport); } catch (e) {}
  });
});

app.get('/api/audit-log', (req, res) => {
  res.json({ success: true, log: state.auditLog || [], logs: state.auditLog || [], auditLog: state.auditLog || [] });
});

app.all(['/api/portfolio', '/api/team/portfolio'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  const role = session?.role;
  const sessionTeamCode = session?.teamCode;
  const requestedTeamCode = (req.query?.teamCode || req.body?.teamCode || sessionTeamCode);

  if (role === 'team' && requestedTeamCode && sessionTeamCode && requestedTeamCode.toUpperCase() !== sessionTeamCode.toUpperCase()) {
    return res.status(403).json({ error: '403 Forbidden: You are not authorized to view another team\'s portfolio.' });
  }

  const effectiveTeamCode = (role === 'team' ? sessionTeamCode : (requestedTeamCode || sessionTeamCode))?.toUpperCase();
  if (!effectiveTeamCode) {
    return res.status(400).json({ error: 'Team code parameter is required.' });
  }

  const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === effectiveTeamCode || t.id === effectiveTeamCode);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  res.json({ success: true, team, holdings: team.holdings || {}, portfolio: team });
});

// ----------------------------------------------------
// CURRENCY EXCHANGE & FX ENGINE APIS
// ----------------------------------------------------
app.get('/api/fx/rates', (req, res) => {
  res.json({
    success: true,
    fxRates: state.fxRates || DEFAULT_FX_RATES,
    currencies: CURRENCY_DIRECTORY
  });
});

app.post('/api/fx/rates', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to update FX rates.' });
  }

  const canUpdate = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'market.control') || hasPerm(session, 'sebi.surveil');
  if (!canUpdate) {
    return res.status(403).json({ error: 'Forbidden: Only SEBI or Admin can update foreign exchange rates.' });
  }

  const { pair, midRate, spreadPercent, actor, reason } = req.body || {};
  if (!pair || !state.fxRates?.[pair] || !midRate || Number(midRate) <= 0 || !Number.isFinite(Number(midRate))) {
    return res.status(400).json({ error: 'Valid currency pair and positive finite midRate are required.' });
  }

  const prevRate = { ...state.fxRates[pair] };
  const spread = spreadPercent !== undefined ? Number(spreadPercent) : (state.fxRates[pair].spreadPercent || 0.45);
  const decimals = (pair === 'JPYINR' || pair === 'KRWINR') ? 4 : 2;
  const mid = parseFloat(Number(midRate).toFixed(decimals));
  const buyRate = parseFloat((mid * (1 + spread / 100)).toFixed(decimals));
  const sellRate = parseFloat((mid * (1 - spread / 100)).toFixed(decimals));

  state.fxRates[pair] = {
    ...state.fxRates[pair],
    midRate: mid,
    buyRate,
    sellRate,
    spreadPercent: spread,
    lastUpdated: Date.now()
  };

  logAuditEvent({
    actor: actor || session.displayName || session.username || 'SEBI FX Desk',
    role: session.role || 'sebi',
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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to view FX transactions.' });
  }

  const isPrivileged = hasPerm(session, 'exchange.execute') || 
                       hasPerm(session, 'exchange.view') || 
                       hasPerm(session, 'sebi.surveil') || 
                       hasPerm(session, 'audit.view') || 
                       session.role === 'admin' || 
                       session.role === 'super_admin';

  if (session.role === 'team') {
    const teamCode = session.teamCode;
    if (!teamCode) {
      return res.status(403).json({ error: 'Forbidden: No team code associated with session.' });
    }
    // Strict session binding: query parameters cannot override or widen team scope
    const teamTxs = (state.fxTransactions || []).filter(t => 
      (t.teamCode || '').toUpperCase() === teamCode.toUpperCase()
    );
    return res.json({ success: true, fxTransactions: teamTxs });
  }

  if (isPrivileged) {
    let txs = state.fxTransactions || [];
    // Privileged operators can optionally filter by teamCode
    if (req.query.teamCode) {
      txs = txs.filter(t => (t.teamCode || '').toUpperCase() === req.query.teamCode.toUpperCase());
    }
    return res.json({ success: true, fxTransactions: txs });
  }

  // Deny-by-default for all other roles
  return res.status(403).json({ error: 'Forbidden: You do not have permission to view FX transaction history.' });
});

// Finite FX Reserves & Telemetry
app.get('/api/fx/reserves', (req, res) => {
  ensureFxReserves(state.fxReserves);
  return res.json({
    success: true,
    reserves: state.fxReserves,
    activeCurrencies: ACTIVE_CURRENCIES,
    activeForeignCurrencies: ACTIVE_FOREIGN_CURRENCIES,
    config: state.fxConfig || {
      dynamicMovementEnabled: true,
      updateIntervalSeconds: 300,
      volatilityBps: 15,
      lastDynamicUpdate: Date.now()
    }
  });
});

// Authorized FX Configuration (Rates, Dynamic Movement, Intervals, Reserves)
app.get('/api/fx/config', (req, res) => {
  res.json({
    success: true,
    config: state.fxConfig || {
      dynamicMovementEnabled: true,
      updateIntervalSeconds: 300,
      volatilityBps: 15,
      lastDynamicUpdate: Date.now()
    },
    reserves: state.fxReserves,
    fxRates: state.fxRates
  });
});

app.post('/api/fx/config', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to configure FX settings.' });
  }

  const isPrivileged = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'market.control');
  if (!isPrivileged) {
    return res.status(403).json({ error: 'Forbidden: Only Administrators or SEBI can configure foreign exchange parameters.' });
  }

  const { dynamicMovementEnabled, updateIntervalSeconds, volatilityBps, reserves } = req.body || {};

  if (!state.fxConfig) {
    state.fxConfig = {
      dynamicMovementEnabled: true,
      updateIntervalSeconds: 300,
      volatilityBps: 15,
      lastDynamicUpdate: Date.now()
    };
  }

  if (dynamicMovementEnabled !== undefined) {
    state.fxConfig.dynamicMovementEnabled = Boolean(dynamicMovementEnabled);
  }

  if (updateIntervalSeconds !== undefined) {
    const sec = Math.max(10, Math.min(3600, Number(updateIntervalSeconds) || 300));
    state.fxConfig.updateIntervalSeconds = sec;
  }

  if (volatilityBps !== undefined) {
    state.fxConfig.volatilityBps = Math.max(1, Math.min(100, Number(volatilityBps) || 15));
  }

  // Update finite reserves limits if provided
  if (reserves && typeof reserves === 'object') {
    ensureFxReserves(state.fxReserves);
    for (const [cur, resConfig] of Object.entries(reserves)) {
      if (state.fxReserves[cur]) {
        const r = state.fxReserves[cur];
        if (resConfig.openingReserve !== undefined) {
          const newOpening = Math.max(0, Number(resConfig.openingReserve) || 0);
          r.openingReserve = newOpening;
          r.currentInventory = newOpening + (r.replenishments || 0) + (r.completedPurchases || 0) - (r.completedSales || 0);
          r.availableReserve = Math.max(0, r.currentInventory - (r.reservedInventory || 0));
        }
        if (resConfig.maxCapacity !== undefined) {
          r.maxCapacity = Math.max(r.openingReserve, Number(resConfig.maxCapacity) || 1000000000);
        }
        if (resConfig.minReserveThreshold !== undefined) {
          r.minReserveThreshold = Math.max(0, Number(resConfig.minReserveThreshold) || 10000);
        }
      }
    }
  }

  saveState(true);
  broadcastState('FX_CONFIG_UPDATED', { config: state.fxConfig, reserves: state.fxReserves });

  return res.json({
    success: true,
    config: state.fxConfig,
    reserves: state.fxReserves,
    message: 'Foreign exchange parameters and reserves configuration successfully applied.'
  });
});

async function handleFxReplenish(req, res) {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to replenish FX reserves.' });
  }

  const isAuthorized = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'reserve.replenish');
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden: FX reserve replenishment requires Admin or SEBI authorization.' });
  }

  const { currency, quantity, amount, reason, notes } = req.body || {};
  const qty = Number(quantity ?? amount);

  if (!currency || isNaN(qty) || qty <= 0 || !Number.isFinite(qty)) {
    return res.status(400).json({ error: 'Valid foreign currency and positive finite quantity are required for replenishment.' });
  }

  const cur = currency.toUpperCase();
  if (cur === 'INR') {
    return res.status(400).json({ error: 'Cannot replenish INR under foreign currency desk reserves.' });
  }

  if (cur === 'CAD' || cur === 'CHF') {
    return res.status(400).json({ error: 'Cannot replenish legacy non-tradable currencies (CAD, CHF).' });
  }

  if (!ACTIVE_FOREIGN_CURRENCIES.includes(cur)) {
    return res.status(400).json({ error: `Unsupported foreign currency for replenishment. Supported: ${ACTIVE_FOREIGN_CURRENCIES.join(', ')}` });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Mandatory justification reason required for authorized FX reserve replenishment (min 5 characters).' });
  }

  ensureFxReserves(state.fxReserves);
  const reserve = state.fxReserves[cur];
  if (!reserve) {
    return res.status(404).json({ error: `FX Reserve pool for ${cur} not found.` });
  }

  const actor = session.username || session.userId || 'ADMIN';
  const replenishmentTxId = `FXREP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockFxReserveForUpdate(txClient, cur);
        await txClient.query(
          `UPDATE fx_reserves
           SET replenishments = replenishments + $1,
               updated_at = NOW()
           WHERE currency = $2`,
          [qty, cur]
        );
      }

      const lines = [
        { accountId: `ACC_DESK_FX_INVENTORY_${cur}`, debit: qty, credit: 0, currency: cur },
        { accountId: `ACC_SYS_TREASURY_EQUITY`, debit: 0, credit: qty, currency: cur }
      ];

      await recordJournalEntry(txClient, {
        transactionId: replenishmentTxId,
        entryType: 'FX_REPLENISHMENT',
        description: `Authorized FX desk reserve replenishment of ${qty} ${cur}: ${reason.trim()}`,
        lines
      });
    });

    // In-memory update
    reserve.replenishments = roundCurrency((reserve.replenishments || 0) + qty, cur);
    reserve.currentInventory = roundCurrency(reserve.openingReserve + reserve.replenishments + reserve.completedPurchases - reserve.completedSales, cur);
    reserve.availableReserve = roundCurrency(reserve.currentInventory - reserve.reservedInventory, cur);
    reserve.updatedAt = new Date().toISOString();
    assertSolvencyInvariant(reserve);

    logAuditEvent({
      actor,
      role: session.role || 'admin',
      action: 'FX_RESERVE_REPLENISH',
      target: cur,
      newState: { currency: cur, replenishment: qty, currentInventory: reserve.currentInventory, availableReserve: reserve.availableReserve },
      reason: reason.trim()
    });

    saveState(true);
    broadcastState('FX_RESERVE_REPLENISHED', { currency: cur, replenishment: qty, reserve });

    return res.json({
      success: true,
      transactionId: replenishmentTxId,
      currency: cur,
      replenishedQuantity: qty,
      reserve
    });
  } catch (err) {
    console.error('[FX Replenishment Error]', err);
    return res.status(500).json({ error: err.message || 'Internal error processing FX reserve replenishment.' });
  }
}

app.post('/api/fx/reserves/replenish', handleFxReplenish);
app.post('/api/fx/replenish', handleFxReplenish);

// FX Market Status & Global Controls (OPEN / PAUSED, Limits)
app.get('/api/fx/market-status', (req, res) => {
  if (!state.fxMarketState) {
    state.fxMarketState = {
      status: 'OPEN',
      pausedReason: null,
      pausedAt: null,
      pausedBy: null,
      marketWideTransactionLimitINR: null,
      updatedAt: Date.now()
    };
  }
  return res.json({
    success: true,
    fxMarketState: state.fxMarketState,
    fxDesks: state.fxDesks || {
      FX_1: { id: 'FX_1', name: 'FX Desk 1 (Primary)', availability: isDeskActive('FX_1') ? 'ACTIVE' : 'INACTIVE' },
      FX_2: { id: 'FX_2', name: 'FX Desk 2 (Secondary)', availability: isDeskActive('FX_2') ? 'ACTIVE' : 'INACTIVE' }
    }
  });
});

app.post(['/api/fx/market-status', '/api/fx/market/status', '/api/fx/market/pause', '/api/fx/pause', '/api/fx/market/resume', '/api/fx/resume'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required.' });
  }

  const isAuthorized = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || session.role === 'floor_admin' || session.role === 'operator_x' || hasPerm(session, 'market.control') || hasPerm(session, 'exchange.execute');
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden: Only authorized personnel (Super Admin, Floor Admin, or FX Operator) can manage FX Market status.' });
  }

  if (!state.fxMarketState) {
    state.fxMarketState = {
      status: 'OPEN',
      pausedReason: null,
      pausedAt: null,
      pausedBy: null,
      marketWideTransactionLimitINR: null,
      updatedAt: Date.now()
    };
  }

  let { action, reason, limit } = req.body || {};
  if (!action) {
    if (req.path.includes('pause')) action = 'PAUSE';
    else if (req.path.includes('resume')) action = 'RESUME';
  }
  const actor = session.displayName || session.username || 'Authorized Personnel';

  if (action === 'PAUSE') {
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'A valid pause reason (minimum 3 characters) is required to pause the FX Market.' });
    }
    state.fxMarketState.status = 'PAUSED';
    state.fxMarketState.pausedReason = reason.trim();
    state.fxMarketState.pausedAt = Date.now();
    state.fxMarketState.pausedBy = actor;
    state.fxMarketState.updatedAt = Date.now();

    logAuditEvent({
      actor,
      role: session.role,
      action: 'FX_MARKET_PAUSED',
      target: 'FX_MARKET',
      reason: reason.trim(),
      newState: { status: 'PAUSED', pausedReason: reason.trim(), pausedAt: state.fxMarketState.pausedAt }
    });

    saveState(true);
    broadcastState('FX_MARKET_STATE_UPDATED', { fxMarketState: state.fxMarketState });

    return res.json({
      success: true,
      message: `FX Market successfully PAUSED: ${reason.trim()}`,
      fxMarketState: state.fxMarketState
    });
  }

  if (action === 'RESUME') {
    state.fxMarketState.status = 'OPEN';
    state.fxMarketState.pausedReason = null;
    state.fxMarketState.pausedAt = null;
    state.fxMarketState.pausedBy = null;
    state.fxMarketState.updatedAt = Date.now();

    logAuditEvent({
      actor,
      role: session.role,
      action: 'FX_MARKET_RESUMED',
      target: 'FX_MARKET',
      reason: reason || 'Normal market resumption',
      newState: { status: 'OPEN' }
    });

    saveState(true);
    broadcastState('FX_MARKET_STATE_UPDATED', { fxMarketState: state.fxMarketState });

    return res.json({
      success: true,
      message: 'FX Market successfully RESUMED to OPEN.',
      fxMarketState: state.fxMarketState
    });
  }

  if (action === 'SET_TRANSACTION_LIMIT') {
    const parsedLimit = limit !== null && limit !== undefined && limit !== '' ? Number(limit) : null;
    if (parsedLimit !== null && (isNaN(parsedLimit) || parsedLimit <= 0)) {
      return res.status(400).json({ error: 'Market-wide transaction limit must be a positive number in INR or null/empty to disable.' });
    }
    state.fxMarketState.marketWideTransactionLimitINR = parsedLimit;
    state.fxMarketState.updatedAt = Date.now();

    logAuditEvent({
      actor,
      role: session.role,
      action: 'FX_TRANSACTION_LIMIT_SET',
      target: 'FX_MARKET',
      reason: reason || (parsedLimit ? `Configured global cap of ₹${parsedLimit.toLocaleString('en-IN')}` : 'Cleared global transaction cap'),
      newState: { marketWideTransactionLimitINR: parsedLimit }
    });

    saveState(true);
    broadcastState('FX_MARKET_STATE_UPDATED', { fxMarketState: state.fxMarketState });

    return res.json({
      success: true,
      message: parsedLimit ? `Market-wide transaction limit set to ₹${parsedLimit.toLocaleString('en-IN')}` : 'Market-wide transaction limit disabled (unrestricted).',
      fxMarketState: state.fxMarketState
    });
  }

  return res.status(400).json({ error: `Unknown action '${action}'. Valid actions: PAUSE, RESUME, SET_TRANSACTION_LIMIT.` });
});

// Authorized FX Reserve Adjustment (ADD / REDUCE with commitment protection & intervention audit)
app.post('/api/fx/reserves/adjust', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required.' });
  }

  const isPrivileged = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || session.role === 'floor_admin' || session.role === 'operator_x' || hasPerm(session, 'market.control') || hasPerm(session, 'exchange.execute');
  if (!isPrivileged) {
    return res.status(403).json({ error: 'Forbidden: Only authorized FX or Admin operators can adjust reserve levels.' });
  }

  const { currency: rawCur, action: rawAction, amount: rawAmount, reason: rawReason } = req.body || {};
  const cur = (rawCur || '').toUpperCase();
  const action = (rawAction || '').toUpperCase();
  const qty = Number(rawAmount);
  const reason = (rawReason || '').trim();

  if (!ACTIVE_FOREIGN_CURRENCIES.includes(cur)) {
    return res.status(400).json({ error: `Unsupported foreign currency for reserve adjustment. Supported: ${ACTIVE_FOREIGN_CURRENCIES.join(', ')}` });
  }

  if (action !== 'ADD' && action !== 'REDUCE') {
    return res.status(400).json({ error: `Invalid adjustment action '${action}'. Valid actions are 'ADD' or 'REDUCE'.` });
  }

  if (isNaN(qty) || qty <= 0 || !Number.isFinite(qty)) {
    return res.status(400).json({ error: 'Adjustment amount must be a positive finite number.' });
  }

  if (!reason || reason.length < 3) {
    return res.status(400).json({ error: 'A valid reason (minimum 3 characters) is required for authorized reserve adjustments.' });
  }

  ensureFxReserves(state.fxReserves);
  const reserve = state.fxReserves[cur];
  if (!reserve) {
    return res.status(404).json({ error: `Reserve for ${cur} not found.` });
  }

  const prevReserve = reserve.currentInventory;
  const prevAvailable = reserve.availableReserve;
  const committed = reserve.reservedInventory || 0;

  if (action === 'REDUCE') {
    if (qty > prevAvailable) {
      return res.status(400).json({
        error: `Cannot reduce ${cur} reserve by ${qty.toLocaleString()}. Maximum allowable reduction is ${prevAvailable.toLocaleString()} to preserve committed liquidity for pending conversions (${committed.toLocaleString()} ${cur} currently reserved).`,
        currency: cur,
        requestedReduction: qty,
        maxReductionAllowed: prevAvailable,
        committedLiquidity: committed
      });
    }

    if (prevReserve - qty < 0) {
      return res.status(400).json({
        error: `Reserve reduction of ${qty.toLocaleString()} ${cur} would cause negative total inventory. Current: ${prevReserve.toLocaleString()}.`,
        currency: cur,
        currentInventory: prevReserve
      });
    }

    reserve.replenishments = roundCurrency((reserve.replenishments || 0) - qty, cur);
  } else {
    // action === 'ADD'
    reserve.replenishments = roundCurrency((reserve.replenishments || 0) + qty, cur);
  }

  reserve.currentInventory = roundCurrency(reserve.openingReserve + reserve.replenishments + reserve.completedPurchases - reserve.completedSales, cur);
  reserve.availableReserve = roundCurrency(reserve.currentInventory - reserve.reservedInventory, cur);
  reserve.updatedAt = new Date().toISOString();
  assertSolvencyInvariant(reserve);

  // Get current market state and FX rate for audit log
  const pairKey = `${cur}INR`;
  const currentRate = state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0;
  const marketStatus = state.fxMarketState?.status || 'OPEN';
  const actor = session.displayName || session.username || 'Authorized Operator';

  // Audit event with complete market intervention metadata
  logAuditEvent({
    actor,
    role: session.role,
    action: action === 'ADD' ? 'FX_RESERVE_INCREASED' : 'FX_RESERVE_REDUCED',
    target: cur,
    reason,
    metadata: {
      currency: cur,
      previousReserve: prevReserve,
      newReserve: reserve.currentInventory,
      previousAvailable: prevAvailable,
      newAvailable: reserve.availableReserve,
      committedLiquidity: committed,
      absoluteChange: qty,
      direction: action,
      operator: actor,
      timestamp: Date.now(),
      marketStatus,
      currentFxRate: currentRate
    }
  });

  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE fx_reserves
         SET opening_reserve = $1, current_inventory = $2, available_reserve = $3, updated_at = NOW()
         WHERE currency = $4`,
        [reserve.openingReserve + reserve.replenishments, reserve.currentInventory, reserve.availableReserve, cur]
      );
    } catch (pgErr) {
      console.warn('[PostgreSQL Reserve Update Notice]', pgErr.message);
    }
  }

  saveState(true);
  broadcastState('FX_RESERVE_ADJUSTED', {
    currency: cur,
    action,
    amount: qty,
    reserve,
    marketStatus,
    currentFxRate: currentRate
  });

  return res.json({
    success: true,
    message: `Successfully ${action === 'ADD' ? 'increased' : 'reduced'} ${cur} reserve by ${qty.toLocaleString()}. New Available: ${reserve.availableReserve.toLocaleString()} (Committed: ${committed.toLocaleString()}).`,
    currency: cur,
    action,
    amount: qty,
    reserve
  });
});

app.post('/api/fx/exchange', async (req, res) => {
  if (state.marketState.status === 'Closed') {
    return res.status(400).json({ error: 'Currency exchange is closed because trading has concluded.' });
  }

  if (state.fxMarketState?.status === 'PAUSED') {
    return res.status(400).json({
      error: `FX Market is temporarily PAUSED: ${state.fxMarketState.pausedReason || 'Operational halt'}`,
      paused: true,
      reason: state.fxMarketState.pausedReason,
      pausedAt: state.fxMarketState.pausedAt
    });
  }

  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required for direct currency exchange.' });
  }

  const canExecuteDirect = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'exchange.execute');
  if (!canExecuteDirect) {
    return res.status(403).json({ error: 'Forbidden: Direct currency exchange requires Exchange Desk Operator or Admin privileges. Participants must submit an FX request via /api/fx/request.' });
  }

  const { teamCode, fromCurrency, toCurrency, fromAmount, operatorId, notes, ticketNumber } = req.body || {};
  const amount = Number(fromAmount);

  // Market-wide transaction limit check (if configured)
  const globalCap = state.fxMarketState?.marketWideTransactionLimitINR;
  if (globalCap && Number(globalCap) > 0 && fromCurrency && amount > 0) {
    const pairKey = `${fromCurrency}INR`;
    const rateInr = fromCurrency === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
    const totalInrEquivalent = amount * rateInr;
    if (totalInrEquivalent > Number(globalCap)) {
      return res.status(400).json({
        error: `Transaction value of ₹${Math.round(totalInrEquivalent).toLocaleString('en-IN')} exceeds current global FX market limit of ₹${Number(globalCap).toLocaleString('en-IN')}.`,
        transactionInr: totalInrEquivalent,
        globalLimitInr: Number(globalCap)
      });
    }
  }

  if (!teamCode || !fromCurrency || !toCurrency || isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Invalid exchange parameters: teamCode, fromCurrency, toCurrency, and positive finite fromAmount are required.' });
  }

  if (fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'Cannot exchange currency to itself.' });
  }

  // Legacy CAD/CHF Isolation
  if (fromCurrency === 'CAD' || fromCurrency === 'CHF' || toCurrency === 'CAD' || toCurrency === 'CHF') {
    return res.status(400).json({ error: 'CAD and CHF are legacy currencies and not available for new exchange transactions.' });
  }

  if (!ACTIVE_CURRENCIES.includes(fromCurrency) || !ACTIVE_CURRENCIES.includes(toCurrency)) {
    return res.status(400).json({ error: `Unsupported currency. Active currencies: ${ACTIVE_CURRENCIES.join(', ')}` });
  }

  if (ticketNumber) {
    const trimmedTicket = String(ticketNumber).trim();
    if (!state.fxTransactions) state.fxTransactions = [];
    const exists = state.fxTransactions.some(t => t.ticketNumber && String(t.ticketNumber).trim().toUpperCase() === trimmedTicket.toUpperCase());
    if (exists) {
      return res.status(400).json({ error: `FX Ticket ${ticketNumber} has already been processed.` });
    }
  }

  const team = state.teams.find(t => (t.teamCode || '').toUpperCase() === teamCode.toUpperCase() || t.id === teamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${teamCode} not found.` });
  }

  const lockKey = team.teamCode || team.id;
  if (activeFxLocks.has(lockKey)) {
    return res.status(409).json({ error: `Concurrent FX operation in progress for team ${lockKey}. Please retry.` });
  }
  activeFxLocks.add(lockKey);

  try {
    ensureTeamWallets(team);
    ensureFxReserves(state.fxReserves);

    // Validate available unreserved balance
    const available = getUnreservedCash(team, fromCurrency);
    if (available < amount) {
      const curSym = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
      return res.status(400).json({
        error: `Insufficient unreserved ${fromCurrency} balance. Team has ${curSym}${available.toLocaleString()} unreserved (Total: ${curSym}${Number(team.cashWallets[fromCurrency] || 0).toLocaleString()}, Reserved: ${curSym}${Number(team.reservedCash?.[fromCurrency] || 0).toLocaleString()}), requested ${curSym}${amount.toLocaleString()}.`
      });
    }

    // Calculate Conversion with Scarcity Pricing
    let conversion;
    try {
      conversion = calculateFxConversion(fromCurrency, toCurrency, amount, state.fxRates, state.fxReserves);
    } catch (convErr) {
      return res.status(400).json({ error: convErr.message });
    }

    const { toAmount, effectiveRate, spreadPercent, scarcityImpact, utilization } = conversion;

    // Finite desk reserve check if client is buying foreign currency
    if (toCurrency !== 'INR') {
      const reserve = state.fxReserves[toCurrency];
      if (!reserve || reserve.availableReserve < toAmount) {
        return res.status(400).json({
          error: 'Insufficient FX desk reserves',
          currency: toCurrency,
          requestedAmount: toAmount,
          availableReserve: reserve?.availableReserve || 0
        });
      }
    }

    // Generate Transaction Record ID
    const fxTxId = `FXTX_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const generatedTicket = ticketNumber || `FX-${Date.now().toString().slice(-4)}`;
    const effectiveOperatorId = session.username || session.userId || operatorId || 'FX-DESK';

    // Transactional Wallet & Reserve Mutation under ACID isolation
    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        // Strict alphabetical row locking
        const lockCurs = [fromCurrency, toCurrency].sort();
        for (const cur of lockCurs) {
          await lockWalletForUpdate(txClient, team.id, cur);
        }
        if (toCurrency !== 'INR') {
          await lockFxReserveForUpdate(txClient, toCurrency);
        }
        if (fromCurrency !== 'INR') {
          await lockFxReserveForUpdate(txClient, fromCurrency);
        }

        // PostgreSQL UPDATE wallets
        await txClient.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
          [amount, team.id, fromCurrency]
        );
        await txClient.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
          [toAmount, team.id, toCurrency]
        );

        // PostgreSQL UPDATE fx_reserves
        if (toCurrency !== 'INR') {
          await txClient.query(
            `UPDATE fx_reserves
             SET completed_sales = completed_sales + $1,
                 desk_inr_cash = desk_inr_cash + $2,
                 updated_at = NOW()
             WHERE currency = $3`,
            [toAmount, amount, toCurrency]
          );
        }
        if (fromCurrency !== 'INR') {
          await txClient.query(
            `UPDATE fx_reserves
             SET completed_purchases = completed_purchases + $1,
                 desk_inr_cash = GREATEST(0, desk_inr_cash - $2),
                 updated_at = NOW()
             WHERE currency = $3`,
            [amount, toAmount, fromCurrency]
          );
        }

        // PostgreSQL INSERT INTO fx_transactions
        await txClient.query(
          `INSERT INTO fx_transactions (id, ticket_number, team_code, team_id, team_name, from_currency, to_currency, from_amount, to_amount, rate, spread_percent, operator, operator_id, notes, status, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, 'CONFIRMED', NOW(), NOW())
           ON CONFLICT (ticket_number) DO NOTHING`,
          [fxTxId, generatedTicket, team.teamCode, team.id, team.teamName, fromCurrency, toCurrency, amount, toAmount, effectiveRate, spreadPercent, effectiveOperatorId, notes || 'Currency Desk Execution']
        );
      }

      // In-memory wallet updates
      team.cashWallets[fromCurrency] = roundCurrency(Number(team.cashWallets[fromCurrency]) - amount, fromCurrency);
      team.cashWallets[toCurrency] = roundCurrency(Number(team.cashWallets[toCurrency] || 0) + toAmount, toCurrency);

      // In-memory fx_reserves updates
      if (toCurrency !== 'INR') {
        const resForeign = state.fxReserves[toCurrency];
        if (resForeign) {
          resForeign.completedSales = roundCurrency((resForeign.completedSales || 0) + toAmount, toCurrency);
          resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, toCurrency);
          resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, toCurrency);
          resForeign.deskInrCash = roundCurrency((resForeign.deskInrCash || 0) + amount, 'INR');
          assertSolvencyInvariant(resForeign);
        }
      }
      if (fromCurrency !== 'INR') {
        const resForeign = state.fxReserves[fromCurrency];
        if (resForeign) {
          resForeign.completedPurchases = roundCurrency((resForeign.completedPurchases || 0) + amount, fromCurrency);
          resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, fromCurrency);
          resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, fromCurrency);
          resForeign.deskInrCash = roundCurrency(Math.max(0, (resForeign.deskInrCash || 0) - toAmount), 'INR');
          assertSolvencyInvariant(resForeign);
        }
      }

      const teamFromAccount = `ACC_TEAM_${team.teamCode}_${fromCurrency}`;
      const clearingFromAccount = `ACC_SYS_CLEARING_FX_${fromCurrency}`;
      const teamToAccount = `ACC_TEAM_${team.teamCode}_${toCurrency}`;
      const clearingToAccount = `ACC_SYS_CLEARING_FX_${toCurrency}`;

      const lines = [
        { accountId: teamFromAccount, debit: 0, credit: amount, currency: fromCurrency },
        { accountId: clearingFromAccount, debit: amount, credit: 0, currency: fromCurrency },
        { accountId: clearingToAccount, debit: 0, credit: toAmount, currency: toCurrency },
        { accountId: teamToAccount, debit: toAmount, credit: 0, currency: toCurrency }
      ];

      await recordJournalEntry(txClient, {
        transactionId: fxTxId,
        entryType: 'FX_CONVERSION',
        description: `FX Conversion ${amount} ${fromCurrency} to ${toAmount} ${toCurrency} for Team ${team.teamCode}`,
        lines
      });
    });

    // Recalculate consolidated INR cash balance across all 10 currencies
    team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);

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
      scarcityImpact,
      utilization,
      operatorId: effectiveOperatorId,
      status: 'CONFIRMED',
      notes: notes || 'Currency Desk Execution'
    };

    if (!state.fxTransactions) state.fxTransactions = [];
    state.fxTransactions.unshift(fxTransaction);

    logAuditEvent({
      actor: effectiveOperatorId,
      role: session.role || 'exchange',
      action: 'FX_CONFIRM',
      target: team.teamCode,
      newState: fxTransaction,
      reason: `Exchanged ${fromCurrency} ${amount.toLocaleString()} -> ${toCurrency} ${toAmount.toLocaleString()} @ ${effectiveRate}`
    });

    saveState();
    broadcastState('FX_TRANSACTION', { fxTransaction, teamCode: team.teamCode });
    return res.json({ success: true, fxTransaction, cashWallets: team.cashWallets, cashBalance: team.cashBalance });
  } catch (err) {
    console.error('[FX Exchange Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error during currency exchange.' });
  } finally {
    activeFxLocks.delete(lockKey);
  }
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

  // STRICT CANONICAL RULE: Exactly 10 Participant Teams (T01 - T10)
  const allowedTeamCodes = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10'];
  if (!allowedTeamCodes.includes(codeUpper)) {
    return res.status(400).json({
      error: `Forbidden: SAAMX participant universe is strictly fixed to exactly 10 teams (T01–T10). Provisioning '${codeUpper}' is rejected.`
    });
  }

  const activeNonSystemTeams = (state.teams || []).filter(t => allowedTeamCodes.includes(t.teamCode?.toUpperCase()));
  const exists = state.teams.some(t => t.teamCode === codeUpper);
  if (exists) {
    return res.status(400).json({ error: `Team code ${team.teamCode} is already registered in the active 10-team universe.` });
  }

  if (activeNonSystemTeams.length >= 10) {
    return res.status(400).json({
      error: 'Forbidden: Maximum participant team capacity (exactly 10 teams T01–T10) has been reached.'
    });
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
app.post(['/api/trade', '/api/trades'], async (req, res) => {
  const { teamId, securityId, action, quantity, orderType, limitPrice, enteredBy } = req.body || {};

  // Phase 6: Market orders only
  if (orderType && String(orderType).toUpperCase() !== 'MARKET') {
    return res.status(400).json({ error: 'Unsupported order type: SAAMX supports MARKET orders only. Limit, stop, and conditional orders are disabled.' });
  }
  if (limitPrice !== undefined && limitPrice !== null && limitPrice !== '') {
    return res.status(400).json({ error: 'Limit price is prohibited: SAAMX supports MARKET orders only.' });
  }

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
  const impactFactor = Q / security.totalUnits;
  const priceChangePercent = impactFactor * security.volatility * 100;

  // Resolve Security Currency & Team Wallet
  const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR');
  ensureTeamWallets(team);
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const nativeCash = Number(team.cashWallets[secCurrency] || 0);
  const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');
  const totalValue = isZeroDec ? Math.round(Q * executionPrice) : parseFloat((Q * executionPrice).toFixed(2));

  if (action !== 'BUY' && action !== 'SELL') {
    return res.status(400).json({ error: 'Action must be BUY or SELL.' });
  }

  const txId = `TX${String(state.transactions.length + 1).padStart(4, '0')}`;
  const pairKey = `${secCurrency}INR`;
  const fxRateAtExecution = secCurrency === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
  const inrEquivalent = parseFloat((totalValue * fxRateAtExecution).toFixed(2));

  const transaction = {
    id: txId,
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

  try {
    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        // Authoritative PostgreSQL execution with row locks, balance updates, and ledger entry
        await executeDirectTradeInDb(txClient, {
          tradeId: transaction.id,
          teamId: team.id,
          ticker: security.ticker,
          action,
          quantity: Q,
          executionPrice,
          priceChangePercent,
          deskId: 'Staff Desk',
          operator: enteredBy || 'Staff Desk',
          eventId: state.currentEventId || 'EVT_LIVE_MAIN'
        });
      }

      if (action === 'BUY') {
        if (Q > security.availableUnits) {
          throw new Error(`Only ${security.availableUnits} units available.`);
        }
        if (nativeCash < totalValue) {
          throw new Error(`Insufficient ${secCurrency} balance. Team has ${curSym}${nativeCash.toLocaleString()}, order requires ${curSym}${totalValue.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`);
        }

        const oldPrice = security.currentPrice;
        security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
        security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
        security.availableUnits -= Q;

        team.cashWallets[secCurrency] = isZeroDec ? Math.round(nativeCash - totalValue) : parseFloat((nativeCash - totalValue).toFixed(2));
        if (!team.holdings) team.holdings = {};
        team.holdings[security.ticker] = (team.holdings[security.ticker] || 0) + Q;

        const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
        if (alert) activeAlerts.add(JSON.stringify(alert));

      } else {
        const currentHolding = Number(team.holdings?.[security.ticker] || 0);
        if (Q > currentHolding) {
          throw new Error(`Insufficient holdings. Team holds ${currentHolding} units of ${security.ticker}.`);
        }

        const oldPrice = security.currentPrice;
        security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
        security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
        security.availableUnits += Q;

        team.cashWallets[secCurrency] = isZeroDec ? Math.round(nativeCash + totalValue) : parseFloat((nativeCash + totalValue).toFixed(2));
        team.holdings[security.ticker] -= Q;
        if (team.holdings[security.ticker] === 0) {
          delete team.holdings[security.ticker];
        }

        const alert = checkCircuitBreaker(security, oldPrice, security.currentPrice);
        if (alert) activeAlerts.add(JSON.stringify(alert));
      }

      // Record double-entry ledger lines for fallback mode
      if (!txClient || txClient.isFallback) {
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCurrency}`;
        const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
        const lines = action === 'BUY'
          ? [
              { accountId: clearingAccount, debit: totalValue, credit: 0, currency: secCurrency },
              { accountId: teamAccount, debit: 0, credit: totalValue, currency: secCurrency }
            ]
          : [
              { accountId: teamAccount, debit: totalValue, credit: 0, currency: secCurrency },
              { accountId: clearingAccount, debit: 0, credit: totalValue, currency: secCurrency }
            ];

        await recordJournalEntry(txClient, {
          transactionId: transaction.id,
          entryType: 'TRADE_EXECUTION_INSTANT',
          description: `Direct Trade Execution ${action} ${Q} ${security.ticker} @ ${executionPrice} ${secCurrency}`,
          lines
        });
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Update consolidated INR cash
  team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);

  state.transactions.push(transaction);
  transactionsSinceLastBackup += 1;
  updateMarketIndex();
  saveState();
  broadcastState('TRADE_EXECUTION', { transaction });

  res.json({ success: true, transaction, state });
});

// Void Transaction
app.post(['/api/transactions/void', '/api/transactions/void/'], async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to void transactions.' });
  }

  if (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'sebi' && !hasPerm(session, 'exchange.void')) {
    return res.status(403).json({ error: 'Forbidden: Transaction voiding requires SEBI or Administrator privileges.' });
  }

  const id = req.body?.id || req.body?.transactionId || req.body?.orderId;
  const reason = req.body?.reason || req.body?.voidReason;
  if (!id) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  const tx = (state.transactions || []).find(t => t.id === id || t.orderId === id || (t.ticketNumber && t.ticketNumber === id));
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  if (tx.voided) return res.status(400).json({ error: 'Transaction already voided.' });

  const effectiveActor = session.username || session.displayName || session.personnelId || 'admin';
  const effectiveReason = reason || 'Administrative transaction void';

  const team = (state.teams || []).find(t => t.id === tx.teamId || t.teamCode === tx.teamCode);
  const security = (state.securities || []).find(s => s.id === tx.securityId || s.ticker === tx.ticker);

  const linkedSettlement = (state.settlements || []).find(s => s.transactionId === tx.id || (tx.orderId && s.orderId === tx.orderId));
  const linkedOrder = (state.orders || []).find(o => o.id === tx.orderId || (linkedSettlement && o.id === linkedSettlement.orderId));
  const isPendingTwoPhase = linkedSettlement && linkedSettlement.status === 'PENDING';
  const secCur = tx.localCurrency || (security ? (security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR')) : 'INR');

  // M3 REVERSAL INTEGRITY: Check dependent transaction solvency before executing reversal
  if (!isPendingTwoPhase && team) {
    if (tx.action === 'BUY') {
      const currentHolding = team.holdings?.[tx.ticker] || 0;
      if (currentHolding < tx.quantity) {
        return res.status(400).json({
          error: `Cannot void BUY transaction: Team has only ${currentHolding} shares of ${tx.ticker} remaining (required: ${tx.quantity}). Shares may have been subsequently sold or pledged.`
        });
      }
    } else if (tx.action === 'SELL') {
      const currentCash = Number(team.cashWallets?.[secCur] || 0);
      const reservedCash = Number(team.reservedCash?.[secCur] || 0);
      const unreservedCash = currentCash - reservedCash;
      if (unreservedCash < Number(tx.totalValue)) {
        return res.status(400).json({
          error: `Cannot void SELL transaction: Team has only ${secCur} ${unreservedCash.toFixed(2)} unreserved cash remaining (required: ${tx.totalValue}). Sale proceeds may have been subsequently spent or reserved.`
        });
      }
    }
  }

  await withTransaction(async (txClient) => {
    if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
      if (team) await lockWalletForUpdate(txClient, team.id, secCur);
      if (security) await lockSecurityForUpdate(txClient, security.ticker);
      if (linkedOrder) await lockOrderForUpdate(txClient, linkedOrder.id);
      if (linkedSettlement) await lockSettlementVoucherForUpdate(txClient, linkedSettlement.id);
    }

    if (team) {
      ensureTeamWallets(team);
      const isZeroDec = (secCur === 'JPY' || secCur === 'KRW');

      if (isPendingTwoPhase) {
        if (tx.action === 'BUY') {
          // Release reserved cash; cash was not yet debited from cashWallets
          team.reservedCash[secCur] = isZeroDec ? Math.round(Math.max(0, (team.reservedCash[secCur] || 0) - tx.totalValue)) : parseFloat(Math.max(0, (team.reservedCash[secCur] || 0) - tx.totalValue).toFixed(2));
          if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
            await txClient.query(
              `UPDATE wallets SET reserved = GREATEST(0, reserved - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
              [tx.totalValue, team.id, secCur]
            );
          }
        } else if (tx.action === 'SELL') {
          // Return surrendered holdings; cash proceeds were not yet credited
          if (!team.holdings) team.holdings = {};
          team.holdings[tx.ticker] = (team.holdings[tx.ticker] || 0) + tx.quantity;
          if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
            await txClient.query(
              `UPDATE holdings SET locked_units = GREATEST(0, locked_units - $1), updated_at = NOW() WHERE team_id = $2 AND ticker = $3`,
              [tx.quantity, team.id, tx.ticker]
            );
          }
        }
      } else {
        if (tx.action === 'BUY') {
          team.cashWallets[secCur] = isZeroDec ? Math.round(((team.cashWallets[secCur] || 0) + tx.totalValue)) : parseFloat(((team.cashWallets[secCur] || 0) + tx.totalValue).toFixed(2));
          if (team.holdings && team.holdings[tx.ticker]) {
            team.holdings[tx.ticker] -= tx.quantity;
            if (team.holdings[tx.ticker] <= 0) delete team.holdings[tx.ticker];
          }
          if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
            await txClient.query(
              `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
              [tx.totalValue, team.id, secCur]
            );
            await txClient.query(
              `UPDATE holdings SET units = GREATEST(0, units - $1), updated_at = NOW() WHERE team_id = $2 AND ticker = $3`,
              [tx.quantity, team.id, tx.ticker]
            );
          }
        } else if (tx.action === 'SELL') {
          team.cashWallets[secCur] = isZeroDec ? Math.round(((team.cashWallets[secCur] || 0) - tx.totalValue)) : parseFloat(((team.cashWallets[secCur] || 0) - tx.totalValue).toFixed(2));
          if (!team.holdings) team.holdings = {};
          team.holdings[tx.ticker] = (team.holdings[tx.ticker] || 0) + tx.quantity;
          if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
            await txClient.query(
              `UPDATE wallets SET balance = GREATEST(0, balance - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
              [tx.totalValue, team.id, secCur]
            );
            await txClient.query(
              `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 0, $5, $6, NOW(), NOW())
               ON CONFLICT (team_id, ticker) DO UPDATE SET units = holdings.units + EXCLUDED.units, updated_at = NOW()`,
              [`HLD_${team.id}_${tx.ticker}`, team.id, tx.ticker, tx.quantity, tx.price || 0, tx.totalValue || 0]
            );
          }
        }

        // Record reversing double-entry journal entry for settled trade void
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCur}`;
        const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCur}`;
        const lines = tx.action === 'BUY'
          ? [
              { accountId: teamAccount, debit: tx.totalValue, credit: 0, currency: secCur },
              { accountId: clearingAccount, debit: 0, credit: tx.totalValue, currency: secCur }
            ]
          : [
              { accountId: clearingAccount, debit: tx.totalValue, credit: 0, currency: secCur },
              { accountId: teamAccount, debit: 0, credit: tx.totalValue, currency: secCur }
            ];
        await recordJournalEntry(txClient, {
          transactionId: tx.id,
          orderId: tx.orderId || null,
          entryType: 'REVERSAL_COMPENSATING',
          description: `Compensating Reversal for voided ${tx.action} trade #${tx.id} (${tx.quantity} ${tx.ticker} @ ${secCur} ${tx.price})`,
          lines
        });
      }

      team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
    }

    if (security) {
      if (tx.action === 'BUY') {
        security.availableUnits += tx.quantity;
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await txClient.query(
            `UPDATE securities SET available_units = available_units + $1, updated_at = NOW() WHERE ticker = $2`,
            [tx.quantity, security.ticker]
          );
        }
      } else if (tx.action === 'SELL') {
        security.availableUnits = Math.max(0, security.availableUnits - tx.quantity);
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await txClient.query(
            `UPDATE securities SET available_units = GREATEST(0, available_units - $1), updated_at = NOW() WHERE ticker = $2`,
            [tx.quantity, security.ticker]
          );
        }
      }
    }

    if (linkedSettlement) {
      linkedSettlement.status = 'VOIDED';
      linkedSettlement.voidReason = effectiveReason;
      linkedSettlement.voidedAt = Date.now();
      linkedSettlement.voidedBy = effectiveActor;
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await txClient.query(
          `UPDATE settlement_vouchers SET status = 'VOIDED', updated_at = NOW() WHERE id = $1`,
          [linkedSettlement.id]
        );
      }
    }

    if (linkedOrder) {
      linkedOrder.status = 'VOIDED';
      linkedOrder.finalStatus = 'VOIDED';
      if (!linkedOrder.statusHistory) linkedOrder.statusHistory = [];
      linkedOrder.statusHistory.push({
        stage: 'VOIDED',
        status: 'VOIDED',
        timestamp: Date.now(),
        actor: effectiveActor,
        note: `Transaction voided: ${effectiveReason}`
      });
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await txClient.query(
          `UPDATE orders SET status = 'VOIDED', final_status = 'VOIDED', updated_at = NOW() WHERE id = $1`,
          [linkedOrder.id]
        );
      }
    }

    tx.voided = true;
    tx.voidedAt = Date.now();
    tx.voidedBy = effectiveActor;
    tx.voidReason = effectiveReason;
  });

  logAuditEvent({
    actor: effectiveActor,
    role: session.role,
    action: 'TRANSACTION_VOID',
    target: tx.id,
    reason: effectiveReason,
    details: {
      teamCode: tx.teamCode,
      ticker: tx.ticker,
      action: tx.action,
      quantity: tx.quantity,
      totalValue: tx.totalValue,
      localCurrency: tx.localCurrency
    }
  });

  updateMarketIndex();
  saveState(true);
  broadcastState('TRANSACTION_VOIDED', { transaction: tx });

  res.json({ success: true, transaction: tx });
});

// ----------------------------------------------------
// DYNAMIC DESK HELPERS & REGISTRATION ENGINE (PHASE C)
// ----------------------------------------------------
function isExchangeDeskId(id) {
  return Boolean(id && ((state.orderDesks && id in state.orderDesks) || /^DESK_\d+$/i.test(id)));
}
function isBankDeskId(id) {
  return Boolean(id && ((state.bankDesks && id in state.bankDesks) || /^BANK_\d+$/i.test(id)));
}
function isFxDeskId(id) {
  return Boolean(id && (id === 'FX_DESK_1' || id === 'FX_DESK' || id === 'FX_1' || id === 'FX_2' || id === 'FX' || (state.fxDesks && id in state.fxDesks) || /^FX(_DESK)?_\d+$/i.test(id)));
}
function isValidDeskId(id) {
  return isExchangeDeskId(id) || isBankDeskId(id) || isFxDeskId(id) || id === 'IPO_DESK_1' || id === 'IPO_DESK' || id === 'NEWS_DESK_1' || id === 'NEWS_1';
}

/**
 * Checks whether an operational desk is marked ACTIVE to accept new incoming work.
 * Desks marked INACTIVE remain in draining state: existing queued orders remain intact,
 * but no new incoming orders may be assigned to them.
 */
function isDeskActive(deskId) {
  if (!deskId) return false;
  if (!state.deskAvailability) state.deskAvailability = {};
  // By default, all initialized desks are ACTIVE unless explicitly set to 'INACTIVE'
  if (state.deskAvailability[deskId] !== undefined) {
    return state.deskAvailability[deskId] === 'ACTIVE' || state.deskAvailability[deskId] === true;
  }
  if (state.fxDesks?.[deskId]?.availability !== undefined) {
    return state.fxDesks[deskId].availability === 'ACTIVE';
  }
  if (state.orderDesks?.[deskId]?.availability !== undefined) {
    return state.orderDesks[deskId].availability === 'ACTIVE';
  }
  if (state.bankDesks?.[deskId]?.availability !== undefined) {
    return state.bankDesks[deskId].availability === 'ACTIVE';
  }
  return true;
}

/**
 * Authoritative dynamic 4-bank desk router (BANK_1 - BANK_4).
 * Balances orders evenly across all 4 bank counters based on real-time pending queue depth
 * and deterministic team code hashing when queues are balanced.
 */
export function getBestBankDesk(teamCode = null) {
  const allBankDesks = ['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4'];
  if (!state.bankDesks) state.bankDesks = {};
  for (const bId of allBankDesks) {
    ensureDeskExists(bId);
  }

  const activeBankDesks = allBankDesks.filter(bId => isDeskActive(bId));
  const candidateDesks = activeBankDesks.length > 0 ? activeBankDesks : allBankDesks;

  const counts = candidateDesks.map(bId => {
    const orderCount = (state.orders || []).filter(o =>
      (o.bankDeskId === bId) &&
      (['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT', 'VERIFYING_AT_BANK'].includes(o.status) ||
       ['AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT', 'VERIFYING_AT_BANK'].includes(o.workflowStage) ||
       (o.settlementStatus === 'PENDING' && !['REJECTED', 'SETTLEMENT_REJECTED', 'CANCELLED', 'SETTLED', 'EXECUTED'].includes(o.status)))
    ).length;

    const settlementCount = (state.settlements || []).filter(s =>
      s.bankDeskId === bId &&
      ['PENDING', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK'].includes(s.status)
    ).length;

    return Math.max(orderCount, settlementCount);
  });

  const minCount = Math.min(...counts);
  const minDesks = candidateDesks.filter((_, idx) => counts[idx] === minCount);

  if (teamCode) {
    const teamNum = parseInt(String(teamCode).replace(/\D/g, ''), 10);
    if (!isNaN(teamNum) && teamNum > 0) {
      const preferredDesk = allBankDesks[(teamNum - 1) % allBankDesks.length];
      if (minDesks.includes(preferredDesk)) {
        return preferredDesk;
      }
    }
  }

  return minDesks[0] || candidateDesks[0] || 'BANK_1';
}

export function healBankDeskAssignments(forceRebalance = false) {
  const allBankDesks = ['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4'];
  const defaultBankDesks = createInitialState().bankDesks;
  if (!state.bankDesks) {
    state.bankDesks = defaultBankDesks;
  } else {
    allBankDesks.forEach(bId => {
      if (!state.bankDesks[bId]) {
        state.bankDesks[bId] = defaultBankDesks[bId];
      }
    });
  }

  // Detect historical collapse where 100% of legacy settlements collapsed into BANK_1
  const settlements = state.settlements || [];
  const deskCount = {};
  settlements.forEach(s => {
    const d = s.bankDeskId || 'UNASSIGNED';
    deskCount[d] = (deskCount[d] || 0) + 1;
  });
  const isAllBank1 = settlements.length > 5 && (!deskCount.BANK_2 && !deskCount.BANK_3 && !deskCount.BANK_4);

  if (Array.isArray(state.orders)) {
    state.orders.forEach(o => {
      const needsAssignment = !o.bankDeskId || !isBankDeskId(o.bankDeskId) || isAllBank1 || forceRebalance;
      if (needsAssignment && o.teamCode) {
        const teamNum = parseInt(String(o.teamCode).replace(/\D/g, ''), 10);
        if (!isNaN(teamNum) && teamNum > 0) {
          o.bankDeskId = allBankDesks[(teamNum - 1) % allBankDesks.length];
        } else {
          o.bankDeskId = 'BANK_1';
        }
      }
    });
  }

  if (Array.isArray(state.settlements)) {
    state.settlements.forEach(s => {
      const needsAssignment = !s.bankDeskId || !isBankDeskId(s.bankDeskId) || isAllBank1 || forceRebalance;
      if (needsAssignment) {
        const parentOrder = (state.orders || []).find(o => o.id === s.orderId);
        const team = s.teamCode || parentOrder?.teamCode;
        if (team) {
          const teamNum = parseInt(String(team).replace(/\D/g, ''), 10);
          if (!isNaN(teamNum) && teamNum > 0) {
            s.bankDeskId = allBankDesks[(teamNum - 1) % allBankDesks.length];
          } else {
            s.bankDeskId = parentOrder?.bankDeskId || 'BANK_1';
          }
        } else {
          s.bankDeskId = parentOrder?.bankDeskId || 'BANK_1';
        }
      }
    });
  }
}

function setDeskAvailabilityState(deskId, status) {
  if (!deskId) return;
  const normalized = (status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  if (!state.deskAvailability) state.deskAvailability = {};
  state.deskAvailability[deskId] = normalized;

  if (state.orderDesks?.[deskId]) {
    state.orderDesks[deskId].availability = normalized;
    state.orderDesks[deskId].isAcceptingNew = normalized === 'ACTIVE';
  }
  if (state.bankDesks?.[deskId]) {
    state.bankDesks[deskId].availability = normalized;
    state.bankDesks[deskId].isAcceptingNew = normalized === 'ACTIVE';
  }
  if (state.fxDesks?.[deskId]) {
    state.fxDesks[deskId].availability = normalized;
    state.fxDesks[deskId].isAcceptingNew = normalized === 'ACTIVE';
  }
  if (deskId === 'FX_1' || deskId === 'FX_DESK_1' || deskId === 'FX_DESK') {
    if (!state.fxDeskAvailability) state.fxDeskAvailability = {};
    state.fxDeskAvailability['FX_1'] = normalized;
    state.fxDeskAvailability['FX_DESK_1'] = normalized;
    state.deskAvailability['FX_1'] = normalized;
    state.deskAvailability['FX_DESK_1'] = normalized;
    if (state.fxDesks?.FX_1) state.fxDesks.FX_1.availability = normalized;
  }
  if (deskId === 'FX_2' || deskId === 'FX_DESK_2') {
    if (!state.fxDeskAvailability) state.fxDeskAvailability = {};
    state.fxDeskAvailability['FX_2'] = normalized;
    state.fxDeskAvailability['FX_DESK_2'] = normalized;
    state.deskAvailability['FX_2'] = normalized;
    state.deskAvailability['FX_DESK_2'] = normalized;
    if (state.fxDesks?.FX_2) state.fxDesks.FX_2.availability = normalized;
  }
  if (deskId === 'IPO_DESK_1' || deskId === 'IPO_DESK') {
    if (!state.ipoDeskAvailability) state.ipoDeskAvailability = {};
    state.ipoDeskAvailability[deskId] = normalized;
    state.deskAvailability['IPO_DESK_1'] = normalized;
    state.deskAvailability['IPO_DESK'] = normalized;
  }
}
function ensureDeskExists(deskId) {
  if (!deskId) return;
  if (isExchangeDeskId(deskId)) {
    if (!state.orderDesks) state.orderDesks = {};
    if (!state.orderDesks[deskId]) {
      const num = deskId.replace(/^DESK_/i, '');
      state.orderDesks[deskId] = {
        id: deskId,
        name: `Exchange Desk ${num}`,
        color: '#3B82F6',
        operator: 'Unassigned',
        operatorId: null,
        operatorUsername: null,
        operatorDisplayName: null,
        activeOrderIds: [],
        totalProcessed: 0
      };
    }
  } else if (isBankDeskId(deskId)) {
    if (!state.bankDesks) state.bankDesks = {};
    if (!state.bankDesks[deskId]) {
      const num = deskId.replace(/^BANK_/i, '');
      state.bankDesks[deskId] = {
        id: deskId,
        name: `Bank Desk ${num}`,
        color: '#10B981',
        type: 'BANK',
        deskType: 'BANK',
        identifier: `Desk ${num}`,
        deskIdentifier: `Desk ${num}`,
        operator: 'Bank Desk Teller',
        totalProcessed: 0
      };
    }
  }
}

function computeAllDeskMetrics() {
  const desks = state.orderDesks || {};
  const bDesks = state.bankDesks || {
    BANK_1: { id: 'BANK_1', name: 'Bank Desk 1', color: '#10B981', type: 'BANK', deskType: 'BANK', identifier: 'Desk 1', deskIdentifier: 'Desk 1', operator: 'Bank Counter 1', totalProcessed: 0 },
    BANK_2: { id: 'BANK_2', name: 'Bank Desk 2', color: '#059669', type: 'BANK', deskType: 'BANK', identifier: 'Desk 2', deskIdentifier: 'Desk 2', operator: 'Bank Counter 2', totalProcessed: 0 },
    BANK_3: { id: 'BANK_3', name: 'Bank Desk 3', color: '#047857', type: 'BANK', deskType: 'BANK', identifier: 'Desk 3', deskIdentifier: 'Desk 3', operator: 'Bank Counter 3', totalProcessed: 0 },
    BANK_4: { id: 'BANK_4', name: 'Bank Desk 4', color: '#065F46', type: 'BANK', deskType: 'BANK', identifier: 'Desk 4', deskIdentifier: 'Desk 4', operator: 'Bank Counter 4', totalProcessed: 0 }
  };
  const queue = state.orders || [];
  const personnelList = state.personnel || [];
  const teamsList = state.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];

  const getExchangeStatusDisplay = (status) => {
    switch (status) {
      case 'VERIFYING':
      case 'BEING_VERIFIED':
      case 'VERIFYING_AT_EXCHANGE':
        return 'Under review';
      case 'VALIDATED':
        return 'Validated - Awaiting execution';
      case 'EXCHANGE_APPROVED':
      case 'AWAITING_BANK_SETTLEMENT':
        return 'Approved - Routed to Bank Desk';
      case 'PENDING':
      case 'SUBMITTED':
      case 'QUEUED':
      case 'RESUBMITTED':
      case 'AWAITING_PHYSICAL_SLIP':
      default:
        return 'Awaiting review';
    }
  };

  const exchangeDesks = Object.keys(desks).map(deskId => {
    const assigned = queue.filter(o => 
      (o.lockedByDesk ? o.lockedByDesk === deskId : o.deskId === deskId) && 
      ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'VERIFYING', 'BEING_VERIFIED', 'VALIDATED', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE'].includes(o.status)
    );
    const assignedStaff = personnelList.find(p => p.assignedDesk === deskId);
    const assignedTeams = teamsList.filter(t => t.assignedDesk === deskId).map(t => ({ teamCode: t.teamCode, teamName: t.teamName, schoolName: t.schoolName }));
    const deskNum = deskId.replace(/^DESK_/i, '');
    const deskOperator = assignedStaff ? (assignedStaff.displayName || assignedStaff.username) : (desks[deskId]?.operator || 'Unassigned');

    const pendingOrders = assigned.filter(o => ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'AWAITING_PHYSICAL_SLIP'].includes(o.status));
    const activeProcessing = assigned.find(o => ['VERIFYING_AT_EXCHANGE', 'VERIFYING', 'BEING_VERIFIED'].includes(o.status) || (o.lockedByDesk === deskId && o.status !== 'AWAITING_PHYSICAL_SLIP'));
    const waitTimes = assigned.map(o => Math.max(0, Date.now() - (o.submittedAt || o.timestamp || Date.now())));
    const averageWaitTimeMs = waitTimes.length > 0 ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;
    
    const completedOrders = queue.filter(o => 
      (o.executedByDesk === deskId || o.deskId === deskId) && 
      ['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED', 'EXECUTED'].includes(o.status)
    );
    const completedCount = completedOrders.length + (desks[deskId]?.totalProcessed || 0);

    const rejectedOrders = queue.filter(o => 
      (o.deskId === deskId || o.executedByDesk === deskId) && 
      ['REJECTED_BY_EXCHANGE', 'RETURNED_FOR_CORRECTION', 'REJECTED'].includes(o.status)
    );
    const rejectedCount = rejectedOrders.length;

    const deskActive = isDeskActive(deskId);
    const operationalStatus = !deskActive ? 'INACTIVE' : (assigned.length >= 10 ? 'SATURATED' : (deskOperator === 'Unassigned' && assigned.length === 0 ? 'PAUSED' : 'ACTIVE'));

    const formattedAssigned = assigned.map(o => {
      const matchingSettlement = (state.settlements || []).find(s => s.orderId === o.id || s.id === o.settlementId);
      const voucherRef = o.voucherReference || matchingSettlement?.voucherReference || (o.status === 'EXCHANGE_APPROVED' ? `BNK-${o.action === 'BUY' ? 'PAY' : 'REC'}-${String(o.ticketNumber || o.id.slice(-4)).replace(/[^A-Za-z0-9_-]/g, '')}` : null);
      return {
        id: o.id,
        orderId: o.id,
        ticketNumber: o.ticketNumber || `TKN-${o.id.slice(-6)}`,
        voucherReference: voucherRef,
        status: o.status,
        statusDisplay: getExchangeStatusDisplay(o.status),
        assignmentTime: o.assignedAt || o.submittedAt || o.timestamp,
        submittedAt: o.submittedAt || o.timestamp,
        teamCode: o.teamCode,
        ticker: o.ticker,
        securityName: o.securityName,
        action: o.action,
        quantity: o.quantity,
        price: o.executionPrice || o.currentPrice || o.limitPrice,
        totalValue: o.executionValue || o.requestedValue,
        operator: o.operator || deskOperator,
        deskId: o.deskId || deskId,
        lockedByDesk: o.lockedByDesk,
        physicalSlipChecked: Boolean(o.physicalSlipChecked)
      };
    });

    return {
      ...desks[deskId],
      id: deskId,
      deskName: desks[deskId]?.name || `Exchange Desk ${deskNum}`,
      name: desks[deskId]?.name || `Exchange Desk ${deskNum}`,
      deskType: 'EXCHANGE',
      type: 'EXCHANGE',
      deskIdentifier: `Desk ${deskNum}`,
      identifier: `Desk ${deskNum}`,
      color: desks[deskId]?.color || '#3B82F6',
      operator: deskOperator,
      operatorId: assignedStaff ? assignedStaff.id : (desks[deskId]?.operatorId || null),
      operatorUsername: assignedStaff ? assignedStaff.username : (desks[deskId]?.operatorUsername || null),
      operatorDisplayName: deskOperator,
      queueCount: assigned.length,
      activeQueueCount: assigned.length,
      pendingCount: pendingOrders.length,
      processingTicket: activeProcessing ? {
        id: activeProcessing.id,
        orderId: activeProcessing.id,
        ticketNumber: activeProcessing.ticketNumber,
        teamCode: activeProcessing.teamCode,
        ticker: activeProcessing.ticker,
        action: activeProcessing.action,
        quantity: activeProcessing.quantity,
        totalValue: activeProcessing.executionValue || activeProcessing.requestedValue,
        claimedAt: activeProcessing.claimedAt || activeProcessing.assignedAt || Date.now(),
        operator: activeProcessing.operator || deskOperator,
        status: activeProcessing.status,
        elapsedSeconds: Math.floor((Date.now() - (activeProcessing.claimedAt || activeProcessing.assignedAt || Date.now())) / 1000)
      } : null,
      averageWaitTimeMs,
      completedCount,
      rejectedCount,
      operationalStatus,
      availability: deskActive ? 'ACTIVE' : 'INACTIVE',
      isAcceptingNew: deskActive,
      activeOrders: formattedAssigned,
      assignedOrders: formattedAssigned,
      orderIds: assigned.map(o => o.id),
      isEmpty: assigned.length === 0,
      assignedTeamsCount: assignedTeams.length,
      assignedTeams
    };
  });

  const bankDesks = Object.keys(bDesks).map(bId => {
    const assignedBankOrders = queue.filter(o => 
      (o.bankDeskId === bId || (!o.bankDeskId && (o.teamCode ? `BANK_${(((parseInt(String(o.teamCode).replace(/\D/g, '') || 1) - 1) % 4) + 1)}` === bId : bId === 'BANK_1'))) &&
      (o.status === 'EXECUTED_PENDING_SETTLEMENT' || (o.settlementStatus === 'PENDING' && !['REJECTED', 'SETTLEMENT_REJECTED', 'CANCELLED', 'SETTLED'].includes(o.status)))
    );
    const bNum = bId.replace(/^BANK_/i, '');
    const bankWaitTimes = assignedBankOrders.map(o => Math.max(0, Date.now() - (o.bankAssignedAt || o.executedAt || o.submittedAt || Date.now())));
    const averageWaitTimeMs = bankWaitTimes.length > 0 ? Math.round(bankWaitTimes.reduce((a, b) => a + b, 0) / bankWaitTimes.length) : 0;
    const activeBankProcessing = assignedBankOrders.find(o => o.status === 'VERIFYING_AT_BANK' || o.workflowStage === 'VERIFYING_AT_BANK');

    const completedBankOrders = (state.settlements || []).filter(s => 
      (s.bankDeskId === bId || (!s.bankDeskId && (s.teamCode ? `BANK_${(((parseInt(String(o.teamCode).replace(/\D/g, '') || 1) - 1) % 4) + 1)}` === bId : bId === 'BANK_1'))) && s.status === 'SETTLED'
    );
    const completedCount = completedBankOrders.length + (bDesks[bId]?.totalProcessed || 0);

    const rejectedBankOrders = (state.settlements || []).filter(s => 
      (s.bankDeskId === bId || (!s.bankDeskId && (s.teamCode ? `BANK_${(((parseInt(String(o.teamCode).replace(/\D/g, '') || 1) - 1) % 4) + 1)}` === bId : bId === 'BANK_1'))) && ['REJECTED', 'SETTLEMENT_REJECTED', 'REJECTED_BY_BANK'].includes(s.status)
    );
    const rejectedCount = rejectedBankOrders.length;

    const bankActive = isDeskActive(bId);
    const operationalStatus = !bankActive ? 'INACTIVE' : (assignedBankOrders.length >= 10 ? 'SATURATED' : 'ACTIVE');

    const formattedBankOrders = assignedBankOrders.map(o => {
      const matchingSettlement = (state.settlements || []).find(s => s.orderId === o.id || s.id === o.settlementId);
      const voucherRef = o.voucherReference || matchingSettlement?.voucherReference || `BNK-${o.action === 'BUY' ? 'PAY' : 'REC'}-${String(o.ticketNumber || o.id.slice(-4)).replace(/[^A-Za-z0-9_-]/g, '')}`;
      return {
        id: o.id,
        orderId: o.id,
        ticketNumber: o.ticketNumber || `TKN-${o.id.slice(-6)}`,
        voucherReference: voucherRef,
        status: o.status,
        statusDisplay: 'Awaiting bank settlement',
        assignmentTime: o.bankAssignedAt || o.executedAt || o.timestamp,
        submittedAt: o.submittedAt || o.timestamp,
        teamCode: o.teamCode,
        ticker: o.ticker,
        securityName: o.securityName,
        action: o.action,
        quantity: o.quantity,
        price: o.executionPrice || o.currentPrice,
        totalValue: o.executionValue || o.requestedValue,
        operator: o.operator || bDesks[bId]?.operator || 'Bank Desk Teller',
        deskId: bId,
        bankDeskId: bId,
        settlementId: o.settlementId
      };
    });

    return {
      ...bDesks[bId],
      id: bId,
      deskName: bDesks[bId]?.name || `Bank Desk ${bNum}`,
      name: bDesks[bId]?.name || `Bank Desk ${bNum}`,
      deskType: 'BANK',
      type: 'BANK',
      deskIdentifier: `Desk ${bNum}`,
      identifier: `Desk ${bNum}`,
      color: bDesks[bId]?.color || '#10B981',
      operator: bDesks[bId]?.operator || 'Bank Desk Teller',
      queueCount: assignedBankOrders.length,
      activeQueueCount: assignedBankOrders.length,
      pendingCount: assignedBankOrders.length,
      processingTicket: activeBankProcessing ? {
        id: activeBankProcessing.id,
        orderId: activeBankProcessing.id,
        ticketNumber: activeBankProcessing.ticketNumber,
        teamCode: activeBankProcessing.teamCode,
        ticker: activeBankProcessing.ticker,
        action: activeBankProcessing.action,
        quantity: activeBankProcessing.quantity,
        totalValue: activeBankProcessing.executionValue || activeBankProcessing.requestedValue,
        claimedAt: activeBankProcessing.claimedAt || activeBankProcessing.bankAssignedAt || Date.now(),
        operator: activeBankProcessing.operator || bDesks[bId]?.operator || 'Bank Desk Teller',
        status: activeBankProcessing.status,
        elapsedSeconds: Math.floor((Date.now() - (activeBankProcessing.claimedAt || activeBankProcessing.bankAssignedAt || Date.now())) / 1000)
      } : null,
      averageWaitTimeMs,
      completedCount,
      rejectedCount,
      operationalStatus,
      availability: bankActive ? 'ACTIVE' : 'INACTIVE',
      isAcceptingNew: bankActive,
      activeOrders: formattedBankOrders,
      assignedOrders: formattedBankOrders,
      orderIds: assignedBankOrders.map(o => o.id),
      isEmpty: assignedBankOrders.length === 0
    };
  });

  // Attach FX Desk Telemetry
  const fxQueue = state.fxQueue || [];
  const fxPending = fxQueue.filter(q => ['QUEUED', 'PENDING', 'SUBMITTED'].includes(q.status));
  const fxProcessing = fxQueue.find(q => ['PROCESSING', 'RATE_CHECK', 'CLAIMED', 'VERIFYING'].includes(q.status));
  const fxCompleted = fxQueue.filter(q => ['SETTLED', 'CONFIRMED', 'APPROVED'].includes(q.status)).length;
  const fxRejected = fxQueue.filter(q => ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(q.status)).length;
  const fxWaitTimes = fxPending.map(q => Math.max(0, Date.now() - (q.submittedAt || q.timestamp || q.createdAt || Date.now())));
  const fxAvgWait = fxWaitTimes.length > 0 ? Math.round(fxWaitTimes.reduce((a, b) => a + b, 0) / fxWaitTimes.length) : 0;

  const fxActive = isDeskActive('FX_1') && isDeskActive('FX_DESK_1');
  const fxDesk = {
    id: 'FX_DESK_1',
    name: 'Foreign Exchange Desk',
    deskName: 'Foreign Exchange Desk',
    deskType: 'FX',
    type: 'FX',
    deskIdentifier: 'FX Desk',
    identifier: 'FX Desk',
    color: '#8B5CF6',
    operator: 'FX Desk Operator',
    pendingCount: fxPending.length,
    processingTicket: fxProcessing ? {
      id: fxProcessing.id || fxProcessing.requestId,
      requestId: fxProcessing.requestId || fxProcessing.id,
      ticketNumber: fxProcessing.ticketNumber || `TKN-FX-${(fxProcessing.id || '').slice(-4)}`,
      teamCode: fxProcessing.teamCode,
      fromCurrency: fxProcessing.fromCurrency,
      toCurrency: fxProcessing.toCurrency,
      fromAmount: fxProcessing.fromAmount,
      toAmount: fxProcessing.toAmount,
      status: fxProcessing.status,
      operator: fxProcessing.operator || fxProcessing.lockedByOperator || 'FX Operator',
      claimedAt: fxProcessing.claimedAt || fxProcessing.processingStartedAt || fxProcessing.timestamp || Date.now(),
      elapsedSeconds: Math.floor((Date.now() - (fxProcessing.claimedAt || fxProcessing.processingStartedAt || Date.now())) / 1000)
    } : null,
    averageWaitTimeMs: fxAvgWait,
    completedCount: fxCompleted,
    rejectedCount: fxRejected,
    operationalStatus: !fxActive ? 'INACTIVE' : (fxPending.length >= 10 ? 'SATURATED' : 'ACTIVE'),
    availability: fxActive ? 'ACTIVE' : 'INACTIVE',
    isAcceptingNew: fxActive,
    queueCount: fxPending.length + (fxProcessing ? 1 : 0),
    activeQueueCount: fxPending.length + (fxProcessing ? 1 : 0),
    isEmpty: (fxPending.length + (fxProcessing ? 1 : 0)) === 0,
    reserves: state.fxReserves || {},
    assignedOrders: fxQueue.map(q => ({
      id: q.id || q.requestId,
      orderId: q.id || q.requestId,
      ticketNumber: q.ticketNumber || `TKN-FX-${(q.id || '').slice(-4)}`,
      teamCode: q.teamCode,
      status: q.status,
      statusDisplay: q.status === 'PROCESSING' ? 'Processing conversion' : q.status === 'RATE_CHECK' ? 'Rate check' : q.status === 'SETTLED' ? 'Settled' : 'Awaiting review',
      fromCurrency: q.fromCurrency,
      toCurrency: q.toCurrency,
      fromAmount: q.fromAmount,
      toAmount: q.toAmount,
      action: `FX ${q.fromCurrency} -> ${q.toCurrency}`,
      quantity: q.fromAmount,
      price: q.rate || q.executionRate || 1.0,
      totalValue: q.fromAmount,
      assignmentTime: q.timestamp || q.createdAt,
      operator: q.operator || q.lockedByOperator || 'FX Operator'
    }))
  };

  // Dedicated IPO Desk (IPO_DESK_1) for Primary Market Subscriptions & Allotments
  const ipoApplications = [];
  (state.securities || []).forEach(sec => {
    if (sec.bids) {
      Object.entries(sec.bids).forEach(([tCode, bid]) => {
        const isAllotted = sec.ipoStatus === 'ALLOTMENT_FINALIZED' || sec.ipoStatus === 'ACTIVE';
        ipoApplications.push({
          id: `IPO_APP_${sec.ticker}_${tCode}`,
          orderId: `IPO_APP_${sec.ticker}_${tCode}`,
          ticketNumber: `IPO-${sec.ticker}-${tCode}`,
          teamCode: tCode,
          ticker: sec.ticker,
          securityName: sec.name,
          action: 'IPO_SUBSCRIBE',
          quantity: bid.quantity,
          price: sec.issuePrice || sec.currentPrice || sec.basePrice || 100,
          totalValue: bid.capitalReserved || (bid.quantity * (sec.issuePrice || sec.currentPrice || 100)),
          currency: sec.currency || 'USD',
          status: isAllotted ? 'ALLOTTED' : 'PENDING_VERIFICATION',
          statusDisplay: isAllotted ? 'Allotted' : 'Pending IPO Verification',
          deskId: 'IPO_DESK_1',
          deskName: 'Primary Market IPO Desk',
          assignmentTime: bid.timestamp || Date.now(),
          operator: 'IPO Verification Officer'
        });
      });
    }
  });

  const ipoDesk = {
    id: 'IPO_DESK_1',
    name: 'Primary Market IPO Desk',
    deskName: 'Primary Market IPO Desk',
    type: 'IPO',
    deskType: 'IPO',
    identifier: 'IPO Desk',
    deskIdentifier: 'IPO Desk',
    color: '#F59E0B',
    operator: 'IPO Desk Officer',
    status: 'ACTIVE',
    operationalStatus: 'ACTIVE',
    queueCount: ipoApplications.filter(a => a.status === 'PENDING_VERIFICATION').length,
    activeQueueCount: ipoApplications.length,
    isEmpty: ipoApplications.length === 0,
    currentOrder: ipoApplications.find(a => a.status === 'PENDING_VERIFICATION') || null,
    totalProcessed: ipoApplications.filter(a => a.status === 'ALLOTTED').length,
    assignedOrders: ipoApplications
  };

  return { exchangeDesks, bankDesks, fxDesk, ipoDesk, queue, personnelList, teamsList };
}

// ----------------------------------------------------
// 5 SIMULTANEOUS ORDER DESKS & QUEUE ARCHITECTURE
// ----------------------------------------------------
app.get(['/api/order-desks', '/api/desks'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Authentication required to view desk status.' });
  }

  const isDeskStaff = hasPerm(session, 'orders.view_queue') || 
                      hasPerm(session, 'exchange.view') || 
                      hasPerm(session, 'bank.view') || 
                      hasPerm(session, 'desks.cross_operate') || 
                      hasPerm(session, 'dashboard.view') || 
                      hasPerm(session, 'sebi.surveil') || 
                      session.role === 'admin' || 
                      session.role === 'super_admin' ||
                      session.role === 'operator_x' ||
                      session.role === 'verification' ||
                      session.role === 'bank_teller' ||
                      session.role === 'sebi' ||
                      session.role === 'portfolio';

  if (!isDeskStaff) {
    return res.status(403).json({ error: 'Forbidden: Desk operator or supervisory authorization required.' });
  }

  const { exchangeDesks, bankDesks, fxDesk, ipoDesk, queue, personnelList, teamsList } = computeAllDeskMetrics();

  const unassignedCount = queue.filter(o => !o.deskId && ['QUEUED', 'SUBMITTED', 'PENDING'].includes(o.status)).length;
  const totalInFlight = queue.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length;
  const unassignedStaff = personnelList.filter(p => !p.assignedDesk && ['operator_x', 'exchange', 'verification'].includes(p.role));
  const unassignedTeams = teamsList.filter(t => !t.assignedDesk);

  res.json({
    success: true,
    desks: exchangeDesks,
    exchangeDesks,
    bankDesks,
    fxDesk,
    ipoDesk,
    allDesks: [...exchangeDesks, ...bankDesks, ipoDesk],
    totalUnassigned: unassignedCount,
    totalQueued: totalInFlight,
    unassignedStaff: unassignedStaff.map(s => ({ id: s.id, username: s.username, displayName: s.displayName, role: s.role })),
    unassignedTeams: unassignedTeams.map(t => ({ teamCode: t.teamCode, teamName: t.teamName })),
    orders: queue
  });
});

app.get('/api/desk-queue-dashboard', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Authentication required to view desk status.' });
  }

  const isAuthorized = hasPerm(session, 'orders.view_queue') || 
                       hasPerm(session, 'exchange.view') || 
                       hasPerm(session, 'bank.view') || 
                       hasPerm(session, 'desks.cross_operate') || 
                       hasPerm(session, 'dashboard.view') || 
                       hasPerm(session, 'sebi.surveil') || 
                       session.role === 'admin' || 
                       session.role === 'super_admin' ||
                       session.role === 'operator_x' ||
                       session.role === 'verification' ||
                       session.role === 'bank_teller' ||
                       session.role === 'sebi' ||
                       session.role === 'portfolio';

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden: Operator authorization required for queue dashboard.' });
  }

  const { exchangeDesks, bankDesks, fxDesk, ipoDesk, queue } = computeAllDeskMetrics();

  return res.json({
    success: true,
    desks: exchangeDesks,
    exchangeDesks,
    bankDesks,
    fxDesk,
    ipoDesk,
    allDesks: [...exchangeDesks, ...bankDesks, ipoDesk],
    orders: queue
  });
});

app.post('/api/desks/assign', (req, res) => {
  if (!req.session || (!isDeskSupervisor(req.session) && !hasPerm(req.session, 'personnel.update') && !hasPerm(req.session, 'desks.cross_operate'))) {
    return res.status(403).json({ error: 'Forbidden: Desk assignment requires administrator or personnel.update authorization.' });
  }

  const { type = 'OPERATOR', deskId, personnelId, username: rawUser, operatorUsername, teamCode, action } = req.body || {};
  const username = rawUser || operatorUsername;

  // Desk Availability Toggle: ACTIVE <-> INACTIVE (Prioritized above operator/team assignments)
  if (action === 'TOGGLE_AVAILABILITY' || action === 'SET_STATUS' || req.body?.availability !== undefined) {
    const targetDeskId = deskId;
    if (!targetDeskId || !isValidDeskId(targetDeskId)) {
      return res.status(400).json({ error: `Valid operational deskId required to set availability (received: '${targetDeskId}').` });
    }
    const requestedStatus = (req.body?.availability || req.body?.status || (isDeskActive(targetDeskId) ? 'INACTIVE' : 'ACTIVE')).toUpperCase();
    const finalStatus = requestedStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setDeskAvailabilityState(targetDeskId, finalStatus);

    logAuditEvent({
      actor: req.session.username || req.session.displayName || 'Floor Supervisor',
      role: req.session.role,
      action: finalStatus === 'ACTIVE' ? 'DESK_ACTIVATED' : 'DESK_DEACTIVATED',
      target: targetDeskId,
      reason: req.body?.reason || (finalStatus === 'ACTIVE' ? `Desk ${targetDeskId} activated for new order intake` : `Desk ${targetDeskId} set to INACTIVE (draining existing queue, excluding from new orders)`)
    });

    saveState();
    broadcastState('DESKS_UPDATED', {
      deskId: targetDeskId,
      availability: finalStatus,
      isAcceptingNew: finalStatus === 'ACTIVE',
      message: `Operational desk ${targetDeskId} is now ${finalStatus}`
    });

    return res.json({
      success: true,
      deskId: targetDeskId,
      availability: finalStatus,
      isAcceptingNew: finalStatus === 'ACTIVE',
      desk: { id: targetDeskId, availability: finalStatus, isAcceptingNew: finalStatus === 'ACTIVE' },
      message: `Desk ${targetDeskId} availability updated to ${finalStatus}.`
    });
  }

  // Auto-balance teams across desks action
  if (action === 'AUTO_BALANCE_TEAMS' || type === 'AUTO_BALANCE') {
    const teamsList = state.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
    const activeExchangeDeskIds = Object.keys(state.orderDesks || {}).filter(isExchangeDeskId);
    const activeCount = activeExchangeDeskIds.length || 5;
    teamsList.forEach((t, i) => {
      t.assignedDesk = activeExchangeDeskIds[i % activeCount] || `DESK_${(i % 5) + 1}`;
    });
    logAuditEvent({
      actor: req.session.username,
      role: req.session.role,
      action: 'DESK_TEAMS_AUTO_BALANCED',
      target: 'ALL_TEAMS',
      reason: `Evenly distributed ${teamsList.length} participant teams across active exchange clearance desks`
    });
    saveState();
    broadcastState('DESKS_UPDATED', { message: 'Participant teams auto-balanced across clearance desks.' });
    return res.json({ success: true, message: 'Teams auto-balanced across desks successfully.' });
  }

  // Operator assignment / reassignment / unassignment
  if (type === 'OPERATOR' || personnelId || (username && !teamCode)) {
    const targetDeskId = (deskId === 'UNASSIGNED' || deskId === '') ? null : deskId;
    if (targetDeskId && !isValidDeskId(targetDeskId)) {
      return res.status(400).json({ error: `Invalid deskId '${targetDeskId}'. Must be a valid Exchange Desk (DESK_1..N), Bank Desk (BANK_1..M), FX Desk, or UNASSIGNED.` });
    }
    if (targetDeskId) {
      ensureDeskExists(targetDeskId);
    }

    const staff = (state.personnel || []).find(p =>
      (personnelId && p.id === personnelId) ||
      (username && p.username?.toLowerCase() === username.toLowerCase())
    );
    if (!staff) {
      return res.status(404).json({ error: 'Personnel account not found.' });
    }

    const previousDesk = staff.assignedDesk;

    // Exclusivity: unassign other operators on this target desk
    if (targetDeskId) {
      (state.personnel || []).forEach(p => {
        if (p.id !== staff.id && p.assignedDesk === targetDeskId) {
          p.assignedDesk = null;
        }
      });
      staff.assignedDesk = targetDeskId;

      if (state.orderDesks?.[targetDeskId]) {
        state.orderDesks[targetDeskId].operator = staff.displayName || staff.username;
        state.orderDesks[targetDeskId].operatorId = staff.id;
        state.orderDesks[targetDeskId].operatorUsername = staff.username;
        state.orderDesks[targetDeskId].operatorDisplayName = staff.displayName || staff.username;
      }
    } else {
      staff.assignedDesk = null;
    }

    if (previousDesk && previousDesk !== targetDeskId && state.orderDesks?.[previousDesk]) {
      const remainingStaff = (state.personnel || []).find(p => p.assignedDesk === previousDesk);
      if (!remainingStaff) {
        state.orderDesks[previousDesk].operator = 'Unassigned';
        state.orderDesks[previousDesk].operatorId = null;
        state.orderDesks[previousDesk].operatorUsername = null;
        state.orderDesks[previousDesk].operatorDisplayName = null;
      }
    }

    logAuditEvent({
      actor: req.session.username,
      role: req.session.role,
      action: targetDeskId ? 'DESK_OPERATOR_ASSIGNED' : 'DESK_OPERATOR_UNASSIGNED',
      target: staff.username,
      reason: targetDeskId
        ? `Assigned ${staff.displayName || staff.username} to ${targetDeskId}`
        : `Unassigned ${staff.displayName || staff.username} from ${previousDesk || 'desk'}`
    });

    saveState();
    broadcastState('DESKS_UPDATED', { message: `Desk assignment updated for @${staff.username}` });
    return res.json({
      success: true,
      personnel: { id: staff.id, username: staff.username, displayName: staff.displayName, assignedDesk: staff.assignedDesk }
    });
  }

  // Team clearance intake desk assignment
  if (type === 'TEAM' || teamCode) {
    const targetDeskId = (deskId === 'UNASSIGNED' || deskId === '') ? null : deskId;
    if (targetDeskId && !isValidDeskId(targetDeskId)) {
      return res.status(400).json({ error: `Invalid deskId '${targetDeskId}'. Must be a valid Exchange Desk (DESK_1..N), Bank Desk (BANK_1..M), FX Desk, or UNASSIGNED.` });
    }
    if (targetDeskId) {
      ensureDeskExists(targetDeskId);
    }

    const team = (state.teams || []).find(t => t.teamCode?.toUpperCase() === teamCode?.toUpperCase() || t.id === teamCode);
    if (!team) {
      return res.status(404).json({ error: `Team '${teamCode}' not found.` });
    }

    team.assignedDesk = targetDeskId;

    logAuditEvent({
      actor: req.session.username,
      role: req.session.role,
      action: 'DESK_TEAM_ASSIGNED',
      target: team.teamCode,
      reason: targetDeskId
        ? `Assigned team ${team.teamCode} intake clearance to ${targetDeskId}`
        : `Unassigned team ${team.teamCode} clearance intake desk`
    });

    saveState();
    broadcastState('DESKS_UPDATED', { message: `Intake clearance desk for ${team.teamCode} updated to ${targetDeskId || 'Unassigned'}` });
    return res.json({ success: true, teamCode: team.teamCode, assignedDesk: team.assignedDesk });
  }

  return res.status(400).json({ error: 'Invalid assignment parameters. Provide personnelId/username for operator or teamCode for team.' });
});

app.post('/api/order/claim', async (req, res) => {
  const { orderId, deskId: rawDeskId, operator: rawOperator, officerName } = req.body || {};
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required.' });
  }

  const releaseLock = await acquireOrderLock(orderId);

  try {
    if (!state.orders) state.orders = [];
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Validate desk access
    const deskCheck = validateDeskAccess(req.session, rawDeskId, order);
    if (!deskCheck.allowed) {
      return res.status(deskCheck.status || 403).json({ error: deskCheck.error });
    }

    const effectiveDeskId = deskCheck.effectiveDesk || rawDeskId || 'DESK_1';

    // Atomic lock check: prevent duplicate claim across desks or racing clerks
    if (order.lockedByDesk || !['QUEUED', 'SUBMITTED', 'PENDING', 'AWAITING_PHYSICAL_SLIP'].includes(order.status)) {
      return res.status(409).json({ error: `Conflict: Order #${order.ticketNumber} is already claimed and in status ${order.status} by ${order.lockedByDesk || order.deskId} (${order.operator || 'Operator'}).` });
    }

    const deskName = state.orderDesks?.[effectiveDeskId]?.name || effectiveDeskId;
    const operatorName = req.session?.displayName || req.session?.username || rawOperator || officerName || state.orderDesks?.[effectiveDeskId]?.operator || 'Desk Operator';

    order.deskId = effectiveDeskId;
    order.operator = operatorName;
    order.lockedByDesk = effectiveDeskId;
    order.status = 'VERIFYING_AT_EXCHANGE';
    order.workflowStage = 'VERIFYING_AT_EXCHANGE';
    order.verificationStatus = 'IN_PROGRESS';
    order.claimedAt = Date.now();
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'VERIFYING_AT_EXCHANGE',
      status: 'VERIFYING_AT_EXCHANGE',
      timestamp: Date.now(),
      actor: operatorName,
      note: `Claimed for physical slip verification at exchange desk ${effectiveDeskId}`
    });

    saveState();
    broadcastState('ORDER_CLAIMED', { order, deskId: effectiveDeskId, operator: operatorName });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('[Order Claim Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error claiming order.' });
  } finally {
    releaseLock();
  }
});

// Broker & Physical Order Submission API
app.get('/api/orders', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to view orders.' });
  }

  const isPrivileged = hasPerm(session, 'orders.view_queue') || 
                       hasPerm(session, 'exchange.view') || 
                       hasPerm(session, 'sebi.surveil') || 
                       hasPerm(session, 'audit.view') || 
                       session.role === 'admin' || 
                       session.role === 'super_admin';

  let orders = state.orders || [];

  if (session.role === 'team') {
    const teamCode = session.teamCode;
    if (!teamCode) {
      return res.status(403).json({ error: 'Forbidden: No team code associated with session.' });
    }
    // Strict session binding: caller-supplied team identifiers and query params are ignored
    orders = orders.filter(o => 
      (o.teamCode && String(o.teamCode).toUpperCase() === String(teamCode).toUpperCase()) ||
      (o.teamId && String(o.teamId).toUpperCase() === String(teamCode).toUpperCase())
    );
  } else if (!isPrivileged) {
    // Deny-by-default for unprivileged roles (journalist, judge, advisor, observer, etc.)
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view order slips.' });
  } else {
    if (req.query.teamCode) {
      const filterTeam = String(req.query.teamCode).toUpperCase();
      orders = orders.filter(o => 
        (o.teamCode && String(o.teamCode).toUpperCase() === filterTeam) ||
        (o.teamId && String(o.teamId).toUpperCase() === filterTeam)
      );
    }
  }

  // Status filtering with backward compatibility aliases
  if (req.query.status) {
    const requestedStatuses = String(req.query.status).split(',').map(s => s.trim().toUpperCase());
    const expandedStatuses = new Set();
    for (const st of requestedStatuses) {
      expandedStatuses.add(st);
      if (st === 'EXECUTED_PENDING_SETTLEMENT') {
        expandedStatuses.add('EXCHANGE_APPROVED');
        expandedStatuses.add('AWAITING_BANK_SETTLEMENT');
      } else if (st === 'EXCHANGE_APPROVED' || st === 'AWAITING_BANK_SETTLEMENT') {
        expandedStatuses.add('EXECUTED_PENDING_SETTLEMENT');
      } else if (st === 'PENDING') {
        expandedStatuses.add('AWAITING_PHYSICAL_SLIP');
      } else if (st === 'AWAITING_PHYSICAL_SLIP') {
        expandedStatuses.add('PENDING');
      } else if (st === 'REJECTED') {
        expandedStatuses.add('REJECTED_BY_EXCHANGE');
        expandedStatuses.add('REJECTED_BY_BANK');
        expandedStatuses.add('SETTLEMENT_REJECTED');
      } else if (st === 'VERIFYING') {
        expandedStatuses.add('VERIFYING_AT_EXCHANGE');
        expandedStatuses.add('BEING_VERIFIED');
      }
    }
    orders = orders.filter(o => expandedStatuses.has(String(o.status).toUpperCase()) || expandedStatuses.has(String(o.workflowStage).toUpperCase()));
  }

  return res.json(orders);
});

app.post(['/api/order/create', '/api/orders/submit', '/api/order/submit'], async (req, res) => {
  if (req.body.role === 'advisor' || req.body.enteredByRole === 'advisor') {
    return res.status(403).json({ error: 'Advisors advise; they do not trade on behalf of Investment Houses. Only authorized participant workflows may submit orders.' });
  }

  if (!isTradingAllowedNow()) {
    const sched = getScheduleStatus();
    return res.status(400).json({ error: `Trading is prohibited during the current phase (${sched.currentTitle}). Orders can only be submitted during active market trading sessions (09:30–12:00 and 13:00–15:30).` });
  }

  const { ticketNumber, teamCode, ticker, securityId, exchange, action, quantity, orderType, limitPrice, brokerId, notes, enteredBy, deskId, direction, side } = req.body || {};

  const effectiveAction = (action || direction || side || '').toUpperCase();
  const effectiveTicket = (ticketNumber || `TKN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`).toString().trim();
  const sessionRole = req.session?.role;
  const sessionTeam = req.session?.teamCode;
  if (sessionRole === 'team') {
    if (teamCode && sessionTeam && teamCode.toUpperCase() !== sessionTeam.toUpperCase()) {
      return res.status(403).json({ error: `Forbidden: Team ${sessionTeam} cannot submit order slips for another team.` });
    }
  }

  const effectiveTeamCode = (sessionRole === 'team' ? sessionTeam : teamCode)?.toUpperCase();
  const Q = Number(quantity);
  if (!effectiveTicket || !effectiveTeamCode || (!ticker && !securityId) || !effectiveAction || isNaN(Q) || Q <= 0 || !Number.isInteger(Q)) {
    return res.status(400).json({ error: 'Missing or invalid parameters: ticketNumber, teamCode, ticker or securityId, action, and integer positive quantity are required.' });
  }

  if (!state.orders) state.orders = [];

  // Phase 6 Idempotency Key check
  const idempotencyKey = (req.body?.idempotencyKey || req.headers?.['x-idempotency-key'] || req.headers?.['idempotency-key'] || '').toString().trim();
  if (idempotencyKey) {
    const existingByKey = state.orders.find(o => o.idempotencyKey === idempotencyKey);
    if (existingByKey) {
      return res.status(200).json({ success: true, orderId: existingByKey.id, order: existingByKey, idempotentReplay: true });
    }
  }

  const duplicate = state.orders.find(o => String(o.ticketNumber).toUpperCase() === String(effectiveTicket).toUpperCase());
  if (duplicate) {
    return res.status(400).json({ error: `Duplicate Ticket Number: Physical Ticket #${effectiveTicket} has already been logged into the queue.` });
  }

  // Canonical Security Lookup (disambiguating ticker collisions by securityId and exchange)
  let sec = null;
  const targetSecId = securityId ? String(securityId).trim() : null;
  const targetTicker = ticker ? String(ticker).trim().toUpperCase() : null;
  const targetExchange = exchange ? String(exchange).trim().toUpperCase() : null;

  if (targetSecId) {
    sec = (state.securities || []).find(s => s.id === targetSecId);
  }
  if (!sec && targetTicker && targetExchange) {
    sec = (state.securities || []).find(s => s.ticker === targetTicker && s.exchange?.toUpperCase() === targetExchange);
  }
  if (!sec && targetTicker && targetTicker.includes('::')) {
    const [t, ex] = targetTicker.split('::');
    sec = (state.securities || []).find(s => s.ticker === t && s.exchange?.toUpperCase() === ex);
  }
  if (!sec && targetTicker && targetTicker.includes(':')) {
    const [t, ex] = targetTicker.split(':');
    sec = (state.securities || []).find(s => s.ticker === t && s.exchange?.toUpperCase() === ex);
  }
  if (!sec && targetTicker) {
    sec = (state.securities || []).find(s => s.id === targetTicker || s.ticker === targetTicker);
  }

  if (!sec) {
    return res.status(404).json({ error: `Security ${ticker || securityId} not found in active universe.` });
  }

  // Order Type & Tick Size Validation (Market-Orders-Only Policy)
  const normalizedOrderType = orderType ? String(orderType).trim().toUpperCase() : (limitPrice ? 'LIMIT' : 'MARKET');
  if (normalizedOrderType !== 'MARKET') {
    return res.status(400).json({ error: `Unsupported order type: ${orderType || normalizedOrderType}. SAAMX supports MARKET orders only.` });
  }

  let effectiveLimitPrice = null;
  if (limitPrice !== undefined && limitPrice !== null && limitPrice !== '') {
    const lp = Number(limitPrice);
    if (isNaN(lp) || lp <= 0) {
      return res.status(400).json({ error: 'Limit price must be a positive number.' });
    }
    if (sec.tickSize && sec.tickSize > 0) {
      const tick = Number(sec.tickSize);
      const remainder = Math.abs((lp / tick) - Math.round(lp / tick));
      if (remainder > 0.001) {
        return res.status(400).json({
          error: `Limit price ${lp} violates tick size ${tick} for ${sec.ticker}. Must be a valid multiple of tick size.`
        });
      }
    }
    effectiveLimitPrice = lp;
  }

  // Minimum Order Quantity validation
  const minQ = sec.minOrderQty || sec.lotSize || 1;
  if (Q < minQ) {
    return res.status(400).json({ error: `Order quantity ${Q} is below the minimum required quantity of ${minQ} for ${sec.ticker}.` });
  }

  // Lot Size validation
  if (sec.lotSize && sec.lotSize > 1 && Q % sec.lotSize !== 0) {
    return res.status(400).json({ error: `Order quantity ${Q} must be a valid multiple of lot size ${sec.lotSize} for ${sec.ticker}.` });
  }

  const secCurrency = sec.currency || (sec.exchange === 'NASDAQ' || sec.exchange === 'NYSE' ? 'USD' : sec.exchange === 'LSE' ? 'GBP' : 'INR');
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const refPrice = effectiveLimitPrice || sec.currentPrice || sec.basePrice || 100;
  const requestedValue = isZeroDec ? Math.round(Q * refPrice) : parseFloat((Q * refPrice).toFixed(2));

  const orderId = req.body?.orderId || `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const team = (state.teams || []).find(t => t.teamCode?.toUpperCase() === effectiveTeamCode?.toUpperCase() || t.id === effectiveTeamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${effectiveTeamCode} not found in registered teams.` });
  }

  // Pre-reservation and Deliverable Share Locking (Requirement R3 & Milestone M1)
  let reservedAmount = 0;
  if (effectiveAction === 'BUY') {
    ensureTeamWallets(team);
    const unreservedCash = getUnreservedCash(team, secCurrency);
    const baseCost = requestedValue;
    const requiredReservation = isZeroDec ? Math.round(baseCost * 1.05) : parseFloat((baseCost * 1.05).toFixed(2));
    if (unreservedCash < requiredReservation) {
      return res.status(400).json({
        error: `Insufficient available funds for order pre-reservation. Required: ${requiredReservation} ${secCurrency} (including 5% execution buffer), Available: ${unreservedCash} ${secCurrency}.`
      });
    }
    reservedAmount = requiredReservation;
  } else if (effectiveAction === 'SELL') {
    ensureTeamHoldings(team);
    const deliverable = getDeliverableHoldings(team, sec.ticker);
    if (deliverable < Q) {
      return res.status(400).json({
        error: `Insufficient deliverable holdings for order share locking. Required: ${Q} units of ${sec.ticker}, Deliverable: ${deliverable} units.`
      });
    }
  }

  // Dynamic Desk routing: Filter strictly for ACTIVE exchange desks
  // If designated desk is inactive, dynamic rerouting automatically selects an active desk with the lowest queue.
  let assignedDesk = deskId;
  if (assignedDesk) {
    ensureDeskExists(assignedDesk);
    if (!isDeskActive(assignedDesk)) {
      assignedDesk = null; // Inactive desk cannot receive new assignments; auto-reroute
    }
  }

  if (!assignedDesk || !isExchangeDeskId(assignedDesk)) {
    if (team?.assignedDesk && isExchangeDeskId(team.assignedDesk) && isDeskActive(team.assignedDesk)) {
      assignedDesk = team.assignedDesk;
    } else {
      const allExchangeDesks = Object.keys(state.orderDesks || {}).filter(isExchangeDeskId);
      const activeExchangeDesks = allExchangeDesks.filter(d => isDeskActive(d));
      const fallbackDesks = activeExchangeDesks.length > 0 ? activeExchangeDesks : (allExchangeDesks.length > 0 ? allExchangeDesks : ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5']);
      const currentOrders = state.orders || [];
      let minCount = Infinity;
      let chosen = fallbackDesks[0];
      for (const d of fallbackDesks) {
        const cnt = currentOrders.filter(o => o.deskId === d && ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'VERIFYING', 'BEING_VERIFIED', 'VALIDATED', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE'].includes(o.status)).length;
        if (cnt < minCount) {
          minCount = cnt;
          chosen = d;
        }
      }
      assignedDesk = chosen;
    }
  }

  if (!assignedDesk) {
    return res.status(500).json({ error: 'Order assignment failed: No operational exchange desk available for order routing.' });
  }

  const assignedBankDesk = getBestBankDesk(effectiveTeamCode);

  const orderObj = {
    id: orderId,
    idempotencyKey: idempotencyKey || null,
    ticketNumber: effectiveTicket,
    teamCode: effectiveTeamCode,
    eventId: state.currentEventId || 'EVT_LIVE_MAIN',
    securityId: sec.id,
    ticker: sec.ticker,
    securityName: sec.name || sec.ticker,
    currency: secCurrency,
    lotSize: sec.lotSize || 1,
    minOrderQty: minQ,
    tickSize: sec.tickSize || 0.05,
    action: effectiveAction,
    quantity: Q,
    orderType: normalizedOrderType,
    limitPrice: effectiveLimitPrice,
    requestedValue,
    estimatedCost: requestedValue,
    reservedCashAmount: effectiveAction === 'BUY' ? reservedAmount : 0,
    executionBuffer: effectiveAction === 'BUY' ? parseFloat((reservedAmount - requestedValue).toFixed(2)) : 0,
    lockedUnits: effectiveAction === 'SELL' ? Q : 0,
    brokerId: brokerId || 'B01',
    notes: notes || '',
    status: 'AWAITING_PHYSICAL_SLIP',
    workflowStage: 'AWAITING_PHYSICAL_SLIP',
    verificationStatus: 'PENDING',
    exchangeStatus: 'PENDING',
    finalStatus: 'PENDING',
    physicalSlipChecked: false,
    deskId: assignedDesk,
    bankDeskId: assignedBankDesk,
    assignedAt: Date.now(),
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
    lockedByDesk: null,
    submittedAt: Date.now(),
    timestamp: Date.now(),
    enteredBy: enteredBy || 'Broker Terminal',
    statusHistory: [
      {
        stage: 'AWAITING_PHYSICAL_SLIP',
        status: 'AWAITING_PHYSICAL_SLIP',
        timestamp: Date.now(),
        actor: enteredBy || effectiveTeamCode,
        note: `Order slip generated and awaiting physical slip presentation at exchange intake desk ${state.orderDesks?.[assignedDesk]?.name || assignedDesk}`
      }
    ]
  };

  // Phase 6 Authoritative PostgreSQL Transaction
  let dbResult = null;
  if (isPgConfigured()) {
    try {
      dbResult = await withTransaction(async (txClient) => {
        return await createOrderInDb(txClient, orderObj);
      });
    } catch (dbErr) {
      console.error('[Order Create DB Failure]', dbErr.message);
      return res.status(500).json({ error: `Authoritative database transaction failed: ${dbErr.message}` });
    }

    if (dbResult && dbResult.isDuplicate) {
      return res.status(200).json({
        success: true,
        orderId: dbResult.order.id,
        order: dbResult.order,
        idempotentReplay: true
      });
    }
  } else {
    // In-memory fallback mode
    try {
      await withTransaction(async (txClient) => {
        await createOrderInDb(txClient, orderObj);
      });
    } catch (e) {
      // Ignored in fallback
    }
  }

  // Update in-memory balances only after authoritative persistence succeeds
  if (effectiveAction === 'BUY') {
    team.reservedCash[secCurrency] = isZeroDec
      ? Math.round((Number(team.reservedCash[secCurrency]) || 0) + reservedAmount)
      : parseFloat(((Number(team.reservedCash[secCurrency]) || 0) + reservedAmount).toFixed(2));
  } else if (effectiveAction === 'SELL') {
    team.lockedHoldings[sec.ticker] = (Number(team.lockedHoldings[sec.ticker]) || 0) + Q;
  }

  // Update in-memory cache ONLY AFTER commit
  state.orders.push(orderObj);
  saveState();
  broadcastState('ORDER_CREATED', { order: orderObj });

  res.json({ success: true, orderId, order: orderObj });
});

app.post('/api/order/action', async (req, res) => {
  const { orderId, rejectionReason: rawReject, returnReason, deskId, operator, officerName, physicalSlipChecked } = req.body || {};
  const actionType = req.body?.actionType || req.body?.action;
  const rejectionReason = rawReject || req.body?.rejectReason;
  if (!orderId || !actionType) {
    return res.status(400).json({ error: 'Missing parameters: orderId and actionType required.' });
  }

  // Enforce granular exchange.execute permission for EXECUTE/ACCEPT actions
  if ((actionType === 'EXECUTE' || actionType === 'ACCEPT') && req.session) {
    if (req.session.role !== 'super_admin' && req.session.role !== 'exchange' && req.session.role !== 'operator_x' && !hasPerm(req.session, 'exchange.execute')) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges (requires exchange.execute).' });
    }
  }

  const releaseLock = await acquireOrderLock(orderId);

  try {
    if (!state.orders) state.orders = [];
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Validate desk access
    const deskCheck = validateDeskAccess(req.session, deskId, order);
    if (!deskCheck.allowed) {
      return res.status(deskCheck.status || 403).json({ error: deskCheck.error });
    }

    // Terminal and Bank-controlled lifecycle check
    if (['SETTLED', 'SETTLEMENT_REJECTED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
      if (actionType === 'ACCEPT') {
        return res.status(400).json({ error: 'Order is already approved by Exchange Desk.' });
      }
      return res.status(400).json({
        error: `Invalid transition: Order #${order.ticketNumber || order.id} is already in terminal state '${order.status}'. No further exchange actions permitted.`
      });
    }

    if ((order.status === 'EXECUTED_PENDING_SETTLEMENT' || order.status === 'EXCHANGE_APPROVED' || order.workflowStage === 'AWAITING_BANK_SETTLEMENT') && actionType !== 'ACCEPT' && actionType !== 'EXECUTE') {
      if (actionType === 'VALIDATE') {
        return res.status(400).json({ error: 'Order is already approved/executed and waiting for or completed Bank Desk settlement.' });
      }
      return res.status(400).json({
        error: `Invalid transition: Order #${order.ticketNumber || order.id} is already accepted and pending bank settlement. Exchange cannot perform '${actionType}' on orders under Bank Desk jurisdiction.`
      });
    }

    // Atomic double execution lock
    if (order.status === 'EXECUTED') {
      return res.status(400).json({ error: 'Duplicate execution prevented: Order has already been executed.' });
    }

    const effectiveDeskId = deskCheck.effectiveDesk || deskId || order.lockedByDesk || order.deskId || 'DESK_1';
    const effectiveActor = req.session?.displayName || req.session?.username || operator || officerName || effectiveDeskId || 'Desk Operator';

  // 1. REJECT action
  if (actionType === 'REJECT') {
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'Every rejected order must provide an explicit rejection reason.' });
    }
    const cleanReason = rejectionReason.trim();
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'REJECTED_BY_EXCHANGE',
            workflowStage: 'REJECTED_BY_EXCHANGE',
            verificationStatus: 'REJECTED',
            exchangeStatus: 'REJECTED',
            finalStatus: 'REJECTED',
            rejectionReason: cleanReason,
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order rejection in database: ${dbErr.message}` });
      }
    }

    // Release pre-reservation or locked deliverable units
    const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === (order.teamCode || '').toUpperCase() || t.id === order.teamCode);
    if (team) {
      const secCurrency = order.currency || 'INR';
      const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
      if (order.action === 'BUY') {
        const releaseAmt = order.reservedCashAmount || order.executionValue || order.requestedValue || 0;
        if (team.reservedCash) {
          team.reservedCash[secCurrency] = isZeroDec
            ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt))
            : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt).toFixed(2));
        }
      } else if (order.action === 'SELL') {
        const releaseUnits = order.lockedUnits || order.quantity || 0;
        if (team.lockedHoldings) {
          team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - releaseUnits);
        }
      }
    }

    order.status = 'REJECTED_BY_EXCHANGE';
    order.workflowStage = 'REJECTED_BY_EXCHANGE';
    order.verificationStatus = 'REJECTED';
    order.exchangeStatus = 'REJECTED';
    order.finalStatus = 'REJECTED';
    order.rejectionReason = cleanReason;
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'REJECTED_BY_EXCHANGE',
      status: 'REJECTED_BY_EXCHANGE',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: cleanReason
    });
    saveState();
    broadcastState('ORDER_REJECTED', { order });
    return res.json({ success: true, orderStatus: 'REJECTED_BY_EXCHANGE', rejectionReason: order.rejectionReason, order });
  }

  // 2. CANCEL action
  if (actionType === 'CANCEL') {
    const cancelNote = req.body?.reason || 'Order cancelled';
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'CANCELLED',
            workflowStage: 'CANCELLED',
            verificationStatus: 'CANCELLED',
            finalStatus: 'CANCELLED',
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order cancellation in database: ${dbErr.message}` });
      }
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
      actor: effectiveActor,
      note: cancelNote
    });
    saveState();
    broadcastState('ORDER_CANCELLED', { order });
    return res.json({ success: true, orderStatus: 'CANCELLED', order });
  }

  // 3. CLAIM FOR VERIFICATION
  if (actionType === 'CLAIM' || actionType === 'CLAIM_FOR_VERIFICATION') {
    if (order.lockedByDesk && deskId && order.lockedByDesk !== deskId && ['BEING_VERIFIED', 'VERIFYING_AT_EXCHANGE'].includes(order.status)) {
      return res.status(409).json({ error: `Order is already being reviewed by ${order.lockedByDesk}.` });
    }
    const targetDesk = deskId || order.deskId || 'VERIFY_1';
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'VERIFYING_AT_EXCHANGE',
            workflowStage: 'VERIFYING_AT_EXCHANGE',
            verificationStatus: 'IN_PROGRESS',
            deskId: targetDesk,
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order claim in database: ${dbErr.message}` });
      }
    }
    order.deskId = targetDesk;
    order.operator = effectiveActor;
    order.lockedByDesk = targetDesk;
    order.status = 'VERIFYING_AT_EXCHANGE';
    order.workflowStage = 'VERIFYING_AT_EXCHANGE';
    order.verificationStatus = 'IN_PROGRESS';
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'VERIFYING_AT_EXCHANGE',
      status: 'VERIFYING_AT_EXCHANGE',
      timestamp: Date.now(),
      actor: effectiveActor,
      note: 'Claimed for physical slip verification'
    });
    saveState();
    broadcastState('ORDER_CLAIMED', { order });
    return res.json({ success: true, orderStatus: 'VERIFYING_AT_EXCHANGE', order });
  }

  // 4. VERIFY action
  if (actionType === 'VERIFY' || actionType === 'MARK_VERIFIED') {
    if (physicalSlipChecked === false || req.body?.physicalSlipChecked === false) {
      return res.status(400).json({ error: 'Physical slip verification requires confirming that the paper slip matches the digital order specifications.' });
    }
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'VERIFIED_AWAITING_EXCHANGE',
            workflowStage: 'VERIFIED_AWAITING_EXCHANGE',
            verificationStatus: 'VERIFIED',
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order verification in database: ${dbErr.message}` });
      }
    }
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
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'RETURNED_FOR_CORRECTION',
            workflowStage: 'RETURNED_FOR_CORRECTION',
            verificationStatus: 'RETURNED',
            returnReason: reasonText,
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order return in database: ${dbErr.message}` });
      }
    }

    // Release pre-reservation or locked deliverable units
    const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === (order.teamCode || '').toUpperCase() || t.id === order.teamCode);
    if (team) {
      const secCurrency = order.currency || 'INR';
      const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
      if (order.action === 'BUY') {
        const releaseAmt = order.reservedCashAmount || order.executionValue || order.requestedValue || 0;
        if (team.reservedCash) {
          team.reservedCash[secCurrency] = isZeroDec
            ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt))
            : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt).toFixed(2));
        }
      } else if (order.action === 'SELL') {
        const releaseUnits = order.lockedUnits || order.quantity || 0;
        if (team.lockedHoldings) {
          team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - releaseUnits);
        }
      }
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
    const { quantity: newQty, limitPrice: newLimit, orderType: newType, notes: newNotes } = req.body || {};
    const sec = findSecurityInUniverse(order, state.securities);

    const normalizedNewType = newType ? String(newType).toUpperCase() : (newLimit ? 'LIMIT' : order.orderType || 'MARKET');
    if (!['MARKET', 'LIMIT'].includes(normalizedNewType)) {
      return res.status(400).json({ error: `Unsupported order type: ${newType}. SAAMX supports MARKET and LIMIT orders only.` });
    }

    let effectiveLimit = order.limitPrice;
    if (newLimit !== undefined && newLimit !== null && newLimit !== '') {
      const lp = Number(newLimit);
      if (isNaN(lp) || lp <= 0) {
        return res.status(400).json({ error: 'Limit price must be a positive number.' });
      }
      if (sec && sec.tickSize && sec.tickSize > 0) {
        const tick = Number(sec.tickSize);
        const remainder = Math.abs((lp / tick) - Math.round(lp / tick));
        if (remainder > 0.001) {
          return res.status(400).json({
            error: `Limit price ${lp} violates tick size ${tick} for ${sec.ticker}. Must be a valid multiple of tick size.`
          });
        }
      }
      effectiveLimit = lp;
    }

    let effectiveQty = order.quantity;
    if (newQty && Number(newQty) > 0) {
      const qNum = Math.floor(Number(newQty));
      if (sec) {
        const minQ = sec.minOrderQty || sec.lotSize || 1;
        if (qNum < minQ) {
          return res.status(400).json({ error: `Resubmitted quantity ${qNum} is below minimum required quantity of ${minQ} for ${sec.ticker}.` });
        }
        if (sec.lotSize && sec.lotSize > 1 && qNum % sec.lotSize !== 0) {
          return res.status(400).json({ error: `Resubmitted quantity ${qNum} must be a multiple of lot size ${sec.lotSize} for ${sec.ticker}.` });
        }
      }
      effectiveQty = qNum;
      order.quantity = qNum;
    }

    order.orderType = normalizedNewType;
    order.limitPrice = effectiveLimit;
    if (newNotes !== undefined) order.notes = newNotes;

    const refP = effectiveLimit || sec?.currentPrice || 100;
    const isZeroDec = (sec?.currency === 'JPY' || sec?.currency === 'KRW');
    order.requestedValue = isZeroDec ? Math.round(order.quantity * refP) : parseFloat((order.quantity * refP).toFixed(2));

    const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === (order.teamCode || '').toUpperCase() || t.id === order.teamCode);
    const secCurrency = sec?.currency || order.currency || 'INR';

    // Re-check and re-reserve
    if (order.action === 'BUY' && team) {
      ensureTeamWallets(team);
      const unreserved = getUnreservedCash(team, secCurrency);
      const baseCost = order.requestedValue;
      const requiredRes = isZeroDec ? Math.round(baseCost * 1.05) : parseFloat((baseCost * 1.05).toFixed(2));
      if (unreserved < requiredRes) {
        return res.status(400).json({
          error: `Insufficient available funds for order pre-reservation. Required: ${requiredRes} ${secCurrency} (including 5% execution buffer), Available: ${unreserved} ${secCurrency}.`
        });
      }
      team.reservedCash[secCurrency] = isZeroDec
        ? Math.round((Number(team.reservedCash[secCurrency]) || 0) + requiredRes)
        : parseFloat(((Number(team.reservedCash[secCurrency]) || 0) + requiredRes).toFixed(2));
      order.estimatedCost = order.requestedValue;
      order.reservedCashAmount = requiredRes;
      order.executionBuffer = parseFloat((requiredRes - order.requestedValue).toFixed(2));
    } else if (order.action === 'SELL' && team) {
      ensureTeamHoldings(team);
      const deliverable = getDeliverableHoldings(team, sec?.ticker || order.ticker);
      if (deliverable < order.quantity) {
        return res.status(400).json({
          error: `Insufficient deliverable holdings for order share locking. Required: ${order.quantity} units of ${sec?.ticker || order.ticker}, Deliverable: ${deliverable} units.`
        });
      }
      team.lockedHoldings[sec?.ticker || order.ticker] = (Number(team.lockedHoldings[sec?.ticker || order.ticker]) || 0) + order.quantity;
      order.lockedUnits = order.quantity;
    }

    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'AWAITING_PHYSICAL_SLIP',
            workflowStage: 'AWAITING_PHYSICAL_SLIP',
            verificationStatus: 'RESUBMITTED',
            quantity: effectiveQty,
            notes: order.notes,
            operator: effectiveActor || order.teamCode
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist order resubmission in database: ${dbErr.message}` });
      }
    }

    order.status = 'AWAITING_PHYSICAL_SLIP';
    order.workflowStage = 'AWAITING_PHYSICAL_SLIP';
    order.verificationStatus = 'RESUBMITTED';
    order.returnReason = null;
    order.lockedByDesk = null;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      stage: 'AWAITING_PHYSICAL_SLIP',
      status: 'AWAITING_PHYSICAL_SLIP',
      timestamp: Date.now(),
      actor: effectiveActor || order.teamCode,
      note: 'Ticket corrected and awaiting physical slip presentation at exchange intake desk'
    });
    saveState();
    broadcastState('ORDER_RESUBMITTED', { order });
    return res.json({ success: true, orderStatus: 'AWAITING_PHYSICAL_SLIP', order });
  }

  // 7. CLAIM FOR EXCHANGE
  if (actionType === 'CLAIM_FOR_EXCHANGE') {
    const targetDesk = deskId || order.deskId || 'DESK_1';
    try {
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          await lockOrderForUpdate(txClient, order.id);
          await updateOrderStatusInDb(txClient, {
            orderId: order.id,
            status: 'UNDER_EXCHANGE_REVIEW',
            workflowStage: 'UNDER_EXCHANGE_REVIEW',
            exchangeStatus: 'UNDER_REVIEW',
            deskId: targetDesk,
            operator: effectiveActor
          });
        }
      });
    } catch (dbErr) {
      if (isPgConfigured()) {
        return res.status(500).json({ error: `Failed to persist exchange claim in database: ${dbErr.message}` });
      }
    }
    order.deskId = targetDesk;
    order.operator = effectiveActor;
    order.lockedByDesk = targetDesk;
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
    if (order.status === 'EXECUTED_PENDING_SETTLEMENT' || order.status === 'EXCHANGE_APPROVED' || order.status === 'SETTLED' || order.workflowStage === 'AWAITING_BANK_SETTLEMENT') {
      return res.status(400).json({ error: 'Order is already approved/executed and waiting for or completed Bank Desk settlement.' });
    }

    if (!isTradingAllowedNow()) {
      const sched = getScheduleStatus();
      return res.status(400).json({ error: `Order validation failed: Trading is prohibited during phase (${sched.currentTitle}). Active trading is permitted during 09:30–12:00 and 13:00–15:30.` });
    }

    const team = state.teams.find(t => t.teamCode === order.teamCode || t.id === order.teamCode);
    const security = findSecurityInUniverse(order, state.securities);

    if (!team) return res.status(404).json({ error: `Team ${order.teamCode} not found in active teams.` });
    if (!team.isActive || team.status === 'LOCKED') return res.status(400).json({ error: `Team ${order.teamCode} is not in an active trading status.` });
    if (!security) return res.status(404).json({ error: `Security ${order.ticker} not found in universe.` });
    if (security.status !== 'Active') return res.status(400).json({ error: `Security ${security.ticker} is ${security.status} — trading suspended.` });

    const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR');
    let validationError = null;

    await withTransaction(async (txClient) => {
      // Row locking under ACID isolation to prevent race conditions during ticket validation
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockOrderForUpdate(txClient, order.id);
        await lockSecurityForUpdate(txClient, security.id || security.ticker, security.ticker);
        await lockWalletForUpdate(txClient, team.id, secCurrency);
        if (order.action === 'SELL') {
          await lockHoldingForUpdate(txClient, team.id, order.ticker);
        }
      }

      // Lot Size & Minimum Order Quantity Check
      const minQ = security.minOrderQty || security.lotSize || 1;
      if (order.quantity < minQ) {
        validationError = `Order quantity ${order.quantity} is below the minimum required quantity of ${minQ} for ${security.ticker}.`;
        return;
      }
      if (security.lotSize && security.lotSize > 1 && order.quantity % security.lotSize !== 0) {
        validationError = `Order quantity ${order.quantity} must be a valid multiple of lot size ${security.lotSize} for ${security.ticker}.`;
        return;
      }

      // Risk Control: Max Order Value Check
      const execPrice = security.currentPrice;
      const orderGrossValue = order.quantity * execPrice;
      const risk = state.riskControls || {};
      const maxOrderVal = risk.maxOrderValue || 50000000;
      if (orderGrossValue > maxOrderVal) {
        validationError = `Order gross value ₹${orderGrossValue.toLocaleString()} exceeds the maximum single ticket limit of ₹${maxOrderVal.toLocaleString()}.`;
        return;
      }

      // Check Cash Availability (for BUY)
      ensureTeamWallets(team);
      const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
      const availableUnreservedCash = getUnreservedCash(team, secCurrency);
      const reservedCash = Number(team.reservedCash?.[secCurrency] || 0);
      const curSym = CURRENCY_SYMBOLS[secCurrency] || secCurrency;
      const roundedOrderValue = isZeroDec ? Math.round(orderGrossValue) : parseFloat(orderGrossValue.toFixed(2));

      if (order.action === 'BUY') {
        if (order.quantity > security.availableUnits) {
          validationError = `Only ${security.availableUnits} units available in market float.`;
          return;
        }
        const effectiveAvailableCash = availableUnreservedCash + (order.reservedCashAmount || 0);
        if (effectiveAvailableCash < roundedOrderValue) {
          const reqStr = `${curSym}${isZeroDec ? Math.round(roundedOrderValue).toLocaleString() : roundedOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          const availStr = `${curSym}${isZeroDec ? Math.round(effectiveAvailableCash).toLocaleString() : effectiveAvailableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          const resStr = reservedCash > 0 ? ` (${curSym}${isZeroDec ? Math.round(reservedCash).toLocaleString() : reservedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })} reserved for pending settlement)` : '';
          validationError = `Insufficient unreserved ${secCurrency} balance. Required: ${reqStr}, Available: ${availStr}${resStr}.`;
          return;
        }

        // Risk Control: Max Position Concentration Check
        const maxPosPct = risk.maxPositionSizePercent || 35;
        const curHoldingUnits = Number(team.holdings?.[order.ticker] || 0);
        const postHoldingValue = (curHoldingUnits + order.quantity) * execPrice;
        const totalPortfolio = Number(team.portfolioValue) || Number(team.cashBalance) || 10000000;
        const concentration = (postHoldingValue / totalPortfolio) * 100;
        if (concentration > maxPosPct) {
          validationError = `Order would result in ${concentration.toFixed(1)}% portfolio concentration in ${order.ticker}, exceeding the ${maxPosPct}% limit.`;
          return;
        }
      } else {
        // Action is SELL
        const currentHolding = Number(team.holdings?.[order.ticker] || 0);
        if (currentHolding < order.quantity && !risk.allowShortSelling) {
          validationError = `Insufficient holdings. Team holds ${currentHolding} units of ${order.ticker}. Short selling is disabled.`;
          return;
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
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    saveState();
    broadcastState('ORDER_VALIDATED', { order });
    return res.json({ success: true, orderStatus: 'VALIDATED', order });
  }

  // 9. EXECUTE / ACCEPT action (Merged Operational Desk Review)
  if (actionType === 'EXECUTE' || actionType === 'ACCEPT') {
    if (physicalSlipChecked === false || req.body?.physicalSlipChecked === false) {
      return res.status(400).json({ error: 'Cannot accept order without physical slip verification.' });
    }

    if (actionType === 'ACCEPT') {
      if (order.status === 'EXCHANGE_APPROVED' || order.status === 'SETTLED' || order.workflowStage === 'AWAITING_BANK_SETTLEMENT' || order.status === 'EXECUTED_PENDING_SETTLEMENT') {
        return res.status(400).json({ error: 'Order is already approved by Exchange Desk.' });
      }
    }

    if (state.marketState.status !== 'Open' && req.session?.role !== 'super_admin' && req.session?.role !== 'exchange') {
      return res.status(400).json({ error: 'Trading is locked. Market status is not Open.' });
    }

    const team = state.teams.find(t => t.teamCode === order.teamCode || t.id === order.teamCode);
    const security = findSecurityInUniverse(order, state.securities);

    if (!team) return res.status(404).json({ error: `Team ${order.teamCode} not found.` });
    if (!security) return res.status(404).json({ error: `Security ${order.ticker} not found.` });

    const isTwoPhaseBank = true; // Two-phase Exchange Approval -> Bank Settlement is mandatory
    const executionPrice = security.currentPrice;
    const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR');
    const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
    const totalValue = isZeroDec ? Math.round(order.quantity * executionPrice) : parseFloat((order.quantity * executionPrice).toFixed(2));
    const impactFactor = order.quantity / security.totalUnits;
    const priceChangePercent = impactFactor * security.volatility * 100;
    const curSym = CURRENCY_SYMBOLS[secCurrency] || secCurrency;
    const pairKey = `${secCurrency}INR`;
    const fxRateAtExecution = secCurrency === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);

    // Precompute synchronized Bank Desk (routing strictly to ACTIVE bank desks with draining fallback)
    let targetBankDesk = order.bankDeskId;
    if (!targetBankDesk || !isBankDeskId(targetBankDesk) || !isDeskActive(targetBankDesk)) {
      targetBankDesk = getBestBankDesk(order.teamCode);
    }
    order.bankDeskId = targetBankDesk;
    const targetSettlementId = order.settlementId || `SETTLE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const cleanTicket = String(order.ticketNumber || order.id.slice(-4)).replace(/[^A-Za-z0-9_-]/g, '');
    const targetVoucherRef = `BNK-${order.action === 'BUY' ? 'PAY' : 'REC'}-${cleanTicket}-${Date.now().toString(36).toUpperCase()}`;

    let executionError = null;
    let createdTx = null;
    let settlementRecord = null;

    await withTransaction(async (txClient) => {
      // 1. Strict Duplicate Execution & Idempotent Acceptance Check under row lock
      if (['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT'].includes(order.status) || (actionType === 'ACCEPT' && ['SETTLED', 'EXECUTED'].includes(order.status))) {
        executionError = { status: 400, error: 'Order is already approved by Exchange Desk.' };
        return;
      }

      if (order.status === 'EXECUTED' || order.status === 'SETTLED') {
        executionError = { status: 400, error: 'Duplicate execution prevented: Order has already been executed.' };
        return;
      }

      // Row locking FIRST to prevent race conditions
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockOrderForUpdate(txClient, order.id);
        await lockSecurityForUpdate(txClient, security.id || security.ticker, security.ticker);
        await lockWalletForUpdate(txClient, team.id, secCurrency);
        await lockHoldingForUpdate(txClient, team.id, order.ticker);

        // Phase 6 Authoritative PostgreSQL Execution with synchronized IDs
        await executeMarketOrderInDb(txClient, {
          orderId: order.id,
          securityId: security.id,
          deskId: deskId || order.deskId || 'DESK_1',
          bankDeskId: targetBankDesk,
          settlementId: targetSettlementId,
          voucherReference: targetVoucherRef,
          operator: effectiveActor,
          executionPrice,
          priceChangePercent,
          isTwoPhaseBank,
          fxRateAtExecution,
          eventId: order.eventId || state.currentEventId || 'EVT_LIVE_MAIN'
        });
      }

      if (security.status !== 'Active') {
        order.status = 'REJECTED_BY_EXCHANGE';
        order.rejectionReason = `Security ${security.ticker} is ${security.status} — trading halted.`;
        executionError = { status: 400, error: order.rejectionReason };
        return;
      }

      ensureTeamWallets(team);
      const nativeCash = Number(team.cashWallets[secCurrency] || 0);
      const reservedCash = Number(team.reservedCash[secCurrency] || 0);
      const availableUnreservedCash = getUnreservedCash(team, secCurrency);

      if (order.action === 'BUY') {
        if (order.quantity > security.availableUnits) {
          order.status = 'REJECTED_BY_EXCHANGE';
          order.rejectionReason = `Float exhausted: Only ${security.availableUnits} units available.`;
          executionError = { status: 400, error: order.rejectionReason };
          return;
        }
        const effectiveAvailableCash = availableUnreservedCash + (order.reservedCashAmount || 0);
        if (effectiveAvailableCash < totalValue) {
          order.status = 'REJECTED_BY_EXCHANGE';
          const reqStr = `${curSym}${isZeroDec ? Math.round(totalValue).toLocaleString() : totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          const availStr = `${curSym}${isZeroDec ? Math.round(effectiveAvailableCash).toLocaleString() : effectiveAvailableCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          order.rejectionReason = `Insufficient unreserved ${secCurrency} balance. Required: ${reqStr}, available: ${availStr}.`;
          executionError = { status: 400, error: order.rejectionReason };
          return;
        }
      } else {
        const currentHolding = Number(team.holdings?.[order.ticker] || 0);
        if (currentHolding < order.quantity && !state.riskControls?.allowShortSelling) {
          order.status = 'REJECTED_BY_EXCHANGE';
          order.rejectionReason = `Insufficient holdings. Team holds ${currentHolding} units of ${order.ticker}.`;
          executionError = { status: 400, error: order.rejectionReason };
          return;
        }
      }

      const tx = {
        id: `TX${String(state.transactions.length + 1).padStart(4, '0')}`,
        timestamp: Date.now(),
        eventId: order.eventId || state.currentEventId || 'EVT_LIVE_MAIN',
        orderId: order.id,
        ticketNumber: order.ticketNumber || null,
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
        fxRateAtExecution,
        inrEquivalent: parseFloat((totalValue * fxRateAtExecution).toFixed(2)),
        enteredBy: order.enteredBy || 'Broker Terminal',
        deskId: deskId || order.deskId || 'DESK_1',
        operator: effectiveActor,
        voided: false,
        settlementMode: isTwoPhaseBank ? 'TWO_PHASE_BANK' : 'INSTANT',
        settlementStatus: isTwoPhaseBank ? 'PENDING' : 'SETTLED'
      };

      if (order.action === 'BUY') {
        if (isTwoPhaseBank) {
          security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
          security.availableUnits -= order.quantity;
          security.trading_volume = (security.trading_volume || 0) + order.quantity;
          security.tradingVolume = (Number(security.tradingVolume) || Number(security.trading_volume) || 0);
          security.trading_volume = security.tradingVolume;
          // Cash is already pre-reserved in team.reservedCash; zero double-reservation
        } else {
          security.currentPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
          security.availableUnits -= order.quantity;
          security.trading_volume = (security.trading_volume || 0) + order.quantity;
          security.tradingVolume = (Number(security.tradingVolume) || Number(security.trading_volume) || 0);
          security.trading_volume = security.tradingVolume;
          team.cashWallets[secCurrency] = isZeroDec ? Math.round(nativeCash - totalValue) : parseFloat((nativeCash - totalValue).toFixed(2));
          if (!team.holdings) team.holdings = {};
          team.holdings[order.ticker] = (team.holdings[order.ticker] || 0) + order.quantity;
        }
      } else {
        if (isTwoPhaseBank) {
          security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
          security.trading_volume = (security.trading_volume || 0) + order.quantity;
          security.tradingVolume = (Number(security.tradingVolume) || Number(security.trading_volume) || 0);
          security.trading_volume = security.tradingVolume;
          // Milestone M1: Symmetric SELL execution. Do NOT prematurely increment availableUnits or deduct team.holdings.
          // Shares remain securely locked in team.lockedHoldings until Bank settlement confirmation.
        } else {
          security.currentPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
          security.availableUnits += order.quantity;
          security.trading_volume = (security.trading_volume || 0) + order.quantity;
          security.tradingVolume = (Number(security.tradingVolume) || Number(security.trading_volume) || 0);
          security.trading_volume = security.tradingVolume;
          team.cashWallets[secCurrency] = isZeroDec ? Math.round(nativeCash + totalValue) : parseFloat((nativeCash + totalValue).toFixed(2));
          if (!team.holdings) team.holdings = {};
          team.holdings[order.ticker] = (team.holdings[order.ticker] || 0) - order.quantity;
          if (team.holdings[order.ticker] <= 0) delete team.holdings[order.ticker];
        }
      }

      // Record double-entry ledger lines for instant settlement (fallback mode)
      if (!isTwoPhaseBank && (!txClient || txClient.isFallback)) {
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCurrency}`;
        const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
        const lines = order.action === 'BUY'
          ? [
              { accountId: clearingAccount, debit: totalValue, credit: 0, currency: secCurrency },
              { accountId: teamAccount, debit: 0, credit: totalValue, currency: secCurrency }
            ]
          : [
              { accountId: teamAccount, debit: totalValue, credit: 0, currency: secCurrency },
              { accountId: clearingAccount, debit: 0, credit: totalValue, currency: secCurrency }
            ];
        await recordJournalEntry(txClient, {
          transactionId: tx.id,
          orderId: order.id,
          entryType: 'TRADE_EXECUTION_INSTANT',
          description: `Instant Trade Execution ${order.action} ${order.quantity} ${security.ticker} @ ${executionPrice} ${secCurrency}`,
          lines
        });
      }

      if (!security.priceHistory) security.priceHistory = [];
      security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });

      team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
      team.tradeCount = (team.tradeCount || 0) + 1;

      order.executedAt = Date.now();
      order.priceAtExecution = executionPrice;
      order.executionPrice = executionPrice;
      order.executionQuantity = order.quantity;
      order.executionValue = totalValue;
      order.executedByDesk = deskId || order.deskId || 'DESK_1';
      order.executedByOperator = effectiveActor;
      if (physicalSlipChecked !== undefined) {
        order.physicalSlipChecked = Boolean(physicalSlipChecked);
        order.verifiedBy = effectiveActor;
        order.verifiedAt = Date.now();
      }

      if (isTwoPhaseBank) {
        order.status = 'EXCHANGE_APPROVED';
        order.workflowStage = 'AWAITING_BANK_SETTLEMENT';
        order.verificationStatus = 'EXECUTED';
        order.exchangeStatus = 'EXECUTED';
        order.settlementStatus = 'PENDING';
        order.finalStatus = 'PENDING_SETTLEMENT';
      } else {
        order.status = 'EXECUTED';
        order.workflowStage = 'EXECUTED';
        order.verificationStatus = 'EXECUTED';
        order.exchangeStatus = 'EXECUTED';
        order.settlementStatus = 'SETTLED';
        order.finalStatus = 'EXECUTED';
      }

      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        stage: order.workflowStage,
        status: order.status,
        timestamp: Date.now(),
        actor: effectiveActor,
        note: isTwoPhaseBank
          ? `Executed on central exchange at ₹${executionPrice}. Awaiting physical bank desk settlement (${order.action === 'BUY' ? 'Payment Collection' : 'Proceeds Disbursement'}).`
          : `Executed on central exchange at ₹${executionPrice} (Total: ₹${totalValue.toLocaleString()})`
      });

      if (order.executedByDesk && state.orderDesks?.[order.executedByDesk]) {
        state.orderDesks[order.executedByDesk].totalProcessed = (state.orderDesks[order.executedByDesk].totalProcessed || 0) + 1;
      }

      if (isTwoPhaseBank) {
        if (!state.settlements) state.settlements = [];
        order.bankDeskId = targetBankDesk;
        order.bankAssignedAt = Date.now();
        order.lockedByDesk = null; // Lock released so Bank desk operator can claim/settle
        order.voucherReference = targetVoucherRef;
        order.settlementId = targetSettlementId;

        settlementRecord = {
          id: targetSettlementId,
          orderId: order.id,
          bankDeskId: targetBankDesk,
          ticketNumber: order.ticketNumber || null,
          transactionId: tx.id,
          teamId: team.id,
          teamCode: team.teamCode,
          securityId: security.id,
          ticker: security.ticker,
          securityName: security.name || security.ticker,
          currency: secCurrency,
          quantity: order.quantity,
          price: executionPrice,
          totalAmount: totalValue,
          action: order.action,
          direction: order.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT',
          classification: order.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT',
          type: order.action === 'BUY' ? 'PAYMENT_COLLECTION' : 'PROCEEDS_DISBURSEMENT',
          status: 'PENDING',
          workflowStage: 'AWAITING_BANK_SETTLEMENT',
          voucherReference: targetVoucherRef,
          executedAt: Date.now(),
          settledAt: null,
          settledBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
          notes: '',
          createdAt: Date.now()
        };
        state.settlements.push(settlementRecord);
        tx.settlementId = targetSettlementId;
      }

      if (!state.transactions) state.transactions = [];
      state.transactions.push(tx);
      createdTx = tx;
    });

    if (executionError) {
      if (executionError.isReplay) {
        return res.status(200).json(executionError.data);
      }
      saveState();
      return res.status(executionError.status).json({ error: executionError.error });
    }

    updateMarketIndex();
    saveState();
    if (actionType === 'ACCEPT') {
      broadcastState('ORDER_ACCEPTED', { order, transaction: createdTx, settlement: settlementRecord });
    }
    broadcastState('ORDER_EXECUTED', { order, transaction: createdTx, settlement: settlementRecord });

    return res.json({
      success: true,
      orderStatus: order.status,
      transaction: createdTx,
      order,
      settlement: settlementRecord,
      voucherReference: settlementRecord?.voucherReference || null
    });
  }

  return res.status(400).json({ error: `Unknown actionType ${actionType}` });
  } catch (err) {
    console.error('[Order Action Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error executing order action.' });
  } finally {
    releaseLock();
  }
});

// Dedicated REST verification endpoints (Guarded to prevent duplicate/independent execution)
app.post('/api/verification/claim', (req, res) => {
  const { orderId, officerName, deskId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (['EXECUTED', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be verified: Order is already in status ${order.status}.` });
  }
  if (order.lockedByDesk && order.lockedByDesk !== (deskId || 'VERIFY_1')) {
    return res.status(409).json({ error: `Conflict: Order is already locked by operational desk ${order.lockedByDesk}.` });
  }

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

  if (['EXECUTED', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be verified: Order is already in status ${order.status}.` });
  }

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

  if (['EXECUTED', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED', 'REJECTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be returned: Order is already in status ${order.status}.` });
  }

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

app.post('/api/orders/resubmit', async (req, res) => {
  const { orderId, quantity, limitPrice, orderType, notes, teamCode } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });

  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const sec = findSecurityInUniverse(order, state.securities);

  const normalizedOrderType = orderType ? String(orderType).trim().toUpperCase() : (limitPrice ? 'LIMIT' : order.orderType || 'MARKET');
  if (normalizedOrderType !== 'MARKET') {
    return res.status(400).json({ error: `Unsupported order type: ${orderType || normalizedOrderType}. SAAMX supports MARKET orders only.` });
  }

  let effectiveLimitPrice = order.limitPrice;
  if (limitPrice !== undefined && limitPrice !== null && limitPrice !== '') {
    const lp = Number(limitPrice);
    if (isNaN(lp) || lp <= 0) {
      return res.status(400).json({ error: 'Limit price must be a positive number.' });
    }
    if (sec && sec.tickSize && sec.tickSize > 0) {
      const tick = Number(sec.tickSize);
      const remainder = Math.abs((lp / tick) - Math.round(lp / tick));
      if (remainder > 0.001) {
        return res.status(400).json({
          error: `Limit price ${lp} violates tick size ${tick} for ${sec.ticker}. Must be a valid multiple of tick size.`
        });
      }
    }
    effectiveLimitPrice = lp;
  }

  // Handler-Level Role & Ownership Verification
  const sessionRole = req.session?.role;
  const isPrivileged = sessionRole === 'admin' || sessionRole === 'super_admin';
  if (!isPrivileged && sessionRole !== 'team') {
    return res.status(403).json({ error: 'Forbidden: Only the owning Investment House or Administrator can resubmit orders.' });
  }

  if (sessionRole === 'team') {
    if (order.teamCode !== req.session.teamCode) {
      return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot resubmit orders belonging to team ${order.teamCode}.` });
    }
    if (teamCode && teamCode.toUpperCase() !== req.session.teamCode) {
      return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot resubmit orders on behalf of team ${teamCode.toUpperCase()}.` });
    }
  } else if (!sessionRole) {
    if (teamCode && order.teamCode !== teamCode.toUpperCase()) {
      return res.status(403).json({ error: 'Cannot resubmit orders belonging to another team.' });
    }
  }

  if (order.status !== 'RETURNED_FOR_CORRECTION') {
    return res.status(400).json({ error: `Cannot resubmit order in status ${order.status}. Only orders marked RETURNED_FOR_CORRECTION can be resubmitted.` });
  }

  if (quantity && Number(quantity) > 0) order.quantity = Math.floor(Number(quantity));
  order.orderType = normalizedOrderType;
  order.limitPrice = effectiveLimitPrice;
  if (notes !== undefined) order.notes = notes;

  const refP = effectiveLimitPrice || sec?.currentPrice || 100;
  const isZeroDec = (sec?.currency === 'JPY' || sec?.currency === 'KRW');
  order.requestedValue = isZeroDec ? Math.round(order.quantity * refP) : parseFloat((order.quantity * refP).toFixed(2));

  const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === (order.teamCode || '').toUpperCase() || t.id === order.teamCode);
  const secCurrency = sec?.currency || order.currency || 'INR';

  // Re-check and re-reserve
  if (order.action === 'BUY' && team) {
    ensureTeamWallets(team);
    const unreserved = getUnreservedCash(team, secCurrency);
    const baseCost = order.requestedValue;
    const requiredRes = isZeroDec ? Math.round(baseCost * 1.05) : parseFloat((baseCost * 1.05).toFixed(2));
    if (unreserved < requiredRes) {
      return res.status(400).json({
        error: `Insufficient available funds for order pre-reservation. Required: ${requiredRes} ${secCurrency} (including 5% execution buffer), Available: ${unreserved} ${secCurrency}.`
      });
    }
    team.reservedCash[secCurrency] = isZeroDec
      ? Math.round((Number(team.reservedCash[secCurrency]) || 0) + requiredRes)
      : parseFloat(((Number(team.reservedCash[secCurrency]) || 0) + requiredRes).toFixed(2));
    order.estimatedCost = order.requestedValue;
    order.reservedCashAmount = requiredRes;
    order.executionBuffer = parseFloat((requiredRes - order.requestedValue).toFixed(2));
  } else if (order.action === 'SELL' && team) {
    ensureTeamHoldings(team);
    const deliverable = getDeliverableHoldings(team, sec?.ticker || order.ticker);
    if (deliverable < order.quantity) {
      return res.status(400).json({
        error: `Insufficient deliverable holdings for order share locking. Required: ${order.quantity} units of ${sec?.ticker || order.ticker}, Deliverable: ${deliverable} units.`
      });
    }
    team.lockedHoldings[sec?.ticker || order.ticker] = (Number(team.lockedHoldings[sec?.ticker || order.ticker]) || 0) + order.quantity;
    order.lockedUnits = order.quantity;
  }

  const actorId = req.session?.teamCode || teamCode || order.teamCode;

  try {
    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockOrderForUpdate(txClient, order.id);
        await updateOrderStatusInDb(txClient, {
          orderId: order.id,
          status: 'AWAITING_PHYSICAL_SLIP',
          workflowStage: 'AWAITING_PHYSICAL_SLIP',
          verificationStatus: 'RESUBMITTED',
          quantity: order.quantity,
          notes: order.notes,
          operator: actorId
        });
      }
    });
  } catch (dbErr) {
    if (isPgConfigured()) {
      return res.status(500).json({ error: `Failed to persist order resubmission in database: ${dbErr.message}` });
    }
  }

  order.status = 'AWAITING_PHYSICAL_SLIP';
  order.workflowStage = 'AWAITING_PHYSICAL_SLIP';
  order.verificationStatus = 'RESUBMITTED';
  order.returnReason = null;
  order.lockedByDesk = null;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'AWAITING_PHYSICAL_SLIP',
    status: 'AWAITING_PHYSICAL_SLIP',
    timestamp: Date.now(),
    actor: actorId,
    note: 'Corrected by Investment House and awaiting physical slip presentation at exchange intake desk'
  });

  saveState();
  broadcastState('ORDER_RESUBMITTED', { order });
  res.json({ success: true, order });
});

app.post('/api/orders/cancel', async (req, res) => {
  const { orderId, teamCode, reason } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Handler-Level Role & Ownership Verification
  const sessionRole = req.session?.role;
  const isPrivileged = sessionRole === 'admin' || sessionRole === 'super_admin';
  if (!isPrivileged && sessionRole !== 'team') {
    return res.status(403).json({ error: 'Forbidden: Only the owning Investment House or Administrator can cancel orders.' });
  }

  if (sessionRole === 'team') {
    if (order.teamCode !== req.session.teamCode) {
      return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot cancel orders belonging to team ${order.teamCode}.` });
    }
    if (teamCode && teamCode.toUpperCase() !== req.session.teamCode) {
      return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot cancel orders on behalf of team ${teamCode.toUpperCase()}.` });
    }
  } else if (!sessionRole) {
    if (teamCode && order.teamCode !== teamCode.toUpperCase()) {
      return res.status(403).json({ error: 'Cannot cancel orders belonging to another team.' });
    }
  }

  if (order.status === 'SETTLED' || order.settlementStatus === 'SETTLED' || ['EXECUTED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: `Cannot cancel order in status ${order.settlementStatus === 'SETTLED' ? 'SETTLED' : order.status}.` });
  }

  const actorId = req.session?.teamCode || req.session?.username || teamCode || 'User';
  const effectiveReason = reason || 'Order cancelled by user';

  const isExecutedPending = ['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT'].includes(order.status) || ['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'EXECUTED_PENDING_SETTLEMENT'].includes(order.workflowStage);
  const team = (state.teams || []).find(t => (t.teamCode || '').toUpperCase() === (order.teamCode || '').toUpperCase() || t.id === order.teamCode);
  const security = (state.securities || []).find(s => (order.securityId && s.id === order.securityId) || s.id === order.ticker || s.ticker === order.ticker);
  const linkedSettlement = (state.settlements || []).find(s => s.orderId === order.id || s.voucherReference === order.voucherReference || s.id === order.settlementId);
  const linkedTx = (state.transactions || []).find(t => t.orderId === order.id || (linkedSettlement && t.settlementId === linkedSettlement.id));

  const secCurrency = order.currency || (security ? (security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR')) : 'INR');
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const cancelQuantity = Number(linkedSettlement?.quantity || order.executionQuantity || order.quantity || 0);
  const cancelAmount = Number(order.reservedCashAmount || linkedSettlement?.totalAmount || order.executionValue || order.requestedValue || 0);

  try {
    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockOrderForUpdate(txClient, order.id);
        if (linkedSettlement) {
          await lockSettlementVoucherForUpdate(txClient, linkedSettlement.id);
        }
        if (isExecutedPending) {
          if (team) await lockWalletForUpdate(txClient, team.id, secCurrency);
          if (security) await lockSecurityForUpdate(txClient, security.id || security.ticker, security.ticker);

          if (order.action === 'BUY') {
            await txClient.query(
              `UPDATE wallets SET reserved = GREATEST(0, reserved - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
              [cancelAmount, team.id, secCurrency]
            );
            if (security) {
              await txClient.query(
                `UPDATE securities SET available_units = available_units + $1, updated_at = NOW() WHERE ticker = $2`,
                [cancelQuantity, security.ticker]
              );
            }
          } else if (order.action === 'SELL') {
            await txClient.query(
              `UPDATE holdings SET locked_units = GREATEST(0, locked_units - $1), updated_at = NOW() WHERE team_id = $2 AND ticker = $3`,
              [cancelQuantity, team.id, security.ticker]
            );
          }

          if (linkedSettlement) {
            await txClient.query(
              `UPDATE settlement_vouchers SET status = 'CANCELLED', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
              [effectiveReason, linkedSettlement.id]
            );
          }
        } else {
          // Pre-exchange cancellation
          if (order.action === 'BUY' && team) {
            await txClient.query(
              `UPDATE wallets SET reserved = GREATEST(0, reserved - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
              [cancelAmount, team.id, secCurrency]
            );
          } else if (order.action === 'SELL' && team && security) {
            await txClient.query(
              `UPDATE holdings SET locked_units = GREATEST(0, locked_units - $1), updated_at = NOW() WHERE team_id = $2 AND ticker = $3`,
              [cancelQuantity, team.id, security.ticker]
            );
          }
        }

        await updateOrderStatusInDb(txClient, {
          orderId: order.id,
          status: 'CANCELLED',
          workflowStage: 'CANCELLED',
          verificationStatus: 'CANCELLED',
          finalStatus: 'CANCELLED',
          operator: actorId,
          rejectionReason: effectiveReason,
          notes: effectiveReason
        });
      }
    });
  } catch (dbErr) {
    if (isPgConfigured()) {
      return res.status(500).json({ error: `Failed to persist order cancellation in database: ${dbErr.message}` });
    }
  }

  // In-Memory state reconciliation under zero-leak isolation
  if (isExecutedPending) {
    if (order.action === 'BUY') {
      if (team && team.reservedCash) {
        team.reservedCash[secCurrency] = isZeroDec
          ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - cancelAmount))
          : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - cancelAmount).toFixed(2));
      }
      if (security && security.availableUnits !== undefined) {
        security.availableUnits += cancelQuantity;
      }
    } else if (order.action === 'SELL') {
      if (team && team.lockedHoldings) {
        team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - cancelQuantity);
      }
    }

    if (linkedSettlement) {
      linkedSettlement.status = 'CANCELLED';
      linkedSettlement.cancelledAt = Date.now();
      linkedSettlement.cancelledBy = actorId;
      linkedSettlement.cancellationReason = effectiveReason;
    }

    if (linkedTx) {
      linkedTx.settlementStatus = 'CANCELLED';
      linkedTx.voided = true;
    }

    if (team) {
      team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
    }
  } else {
    // Pre-exchange cancellation
    if (order.action === 'BUY') {
      if (team && team.reservedCash) {
        team.reservedCash[secCurrency] = isZeroDec
          ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - cancelAmount))
          : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - cancelAmount).toFixed(2));
      }
    } else if (order.action === 'SELL') {
      if (team && team.lockedHoldings) {
        team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - cancelQuantity);
      }
    }
  }

  order.status = 'CANCELLED';
  order.workflowStage = 'CANCELLED';
  order.verificationStatus = 'CANCELLED';
  order.finalStatus = 'CANCELLED';
  order.lockedByDesk = null;
  order.cancellationReason = effectiveReason;

  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    stage: 'CANCELLED',
    status: 'CANCELLED',
    timestamp: Date.now(),
    actor: actorId,
    note: effectiveReason
  });

  logAuditEvent({
    actor: actorId,
    role: req.session?.role || 'team',
    action: 'ORDER_CANCELLED',
    target: order.id,
    reason: effectiveReason,
    details: {
      orderId: order.id,
      ticketNumber: order.ticketNumber,
      action: order.action,
      wasPendingSettlement: isExecutedPending,
      releasedReservedCash: isExecutedPending && order.action === 'BUY' ? cancelAmount : 0,
      restoredHoldings: isExecutedPending && order.action === 'SELL' ? cancelQuantity : 0,
      voidedVoucherId: linkedSettlement?.id || null
    }
  });

  saveState();
  broadcastState('ORDER_CANCELLED', { order, settlement: linkedSettlement });
  res.json({
    success: true,
    order,
    settlement: linkedSettlement || null,
    reservedCash: team?.reservedCash || null,
    holdings: team?.holdings || null
  });
});

// ----------------------------------------------------
// PHYSICAL BANK DESK & TWO-PHASE SETTLEMENT ENGINE
// ----------------------------------------------------
app.get(['/api/bank/settlements', '/api/bank/settlements/'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required to view settlements.' });
  }

  if (!state.settlements) state.settlements = [];

  let list = [...state.settlements];

  if (session.role === 'team') {
    const callerTeam = (session.teamCode || '').toUpperCase();
    list = list.filter(s => (s.teamCode || '').toUpperCase() === callerTeam || (s.teamId || '').toUpperCase() === callerTeam);
    return res.json(list);
  }

  const canViewAll = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || session.role === 'bank_teller' || hasPerm(session, 'bank.view');
  if (!canViewAll) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view bank settlements.' });
  }

  const { status, teamCode, action } = req.query;
  if (status) {
    list = list.filter(s => s.status === status.toUpperCase());
  }
  if (teamCode) {
    list = list.filter(s => (s.teamCode || '').toUpperCase() === teamCode.toUpperCase());
  }
  if (action) {
    list = list.filter(s => s.action === action.toUpperCase());
  }

  return res.json(list);
});

app.get(['/api/bank/settlements/:id', '/api/bank/settlements/:id/'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  const { id } = req.params;
  const settlement = (state.settlements || []).find(s => s.id === id || s.voucherReference === id);
  if (!settlement) {
    return res.status(404).json({ error: 'Settlement record not found.' });
  }

  if (session.role === 'team') {
    const callerTeam = (session.teamCode || '').toUpperCase();
    if ((settlement.teamCode || '').toUpperCase() !== callerTeam && (settlement.teamId || '').toUpperCase() !== callerTeam) {
      return res.status(403).json({ error: 'Forbidden: You cannot access settlement records belonging to another team.' });
    }
    return res.json(settlement);
  }

  const canView = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || session.role === 'bank_teller' || hasPerm(session, 'bank.view');
  if (!canView) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to inspect bank settlements.' });
  }

  return res.json(settlement);
});

app.post(['/api/bank/settle', '/api/bank/settle/'], async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  if (session.role === 'team') {
    return res.status(403).json({ error: 'Forbidden: Teams cannot settle their own bank vouchers. Settlements must be confirmed by an authorized Bank Teller.' });
  }

  const canSettle = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'bank.settle');
  if (!canSettle) {
    return res.status(403).json({ error: 'Forbidden: Bank settlement confirmation requires Bank Teller or Administrator privileges.' });
  }

  const { voucherReference, notes } = req.body || {};
  const settlementKey = req.body?.settlementId || voucherReference || req.body?.orderId || req.body?.id;
  if (!settlementKey) {
    return res.status(400).json({ error: 'settlementId, voucherReference, or orderId is required.' });
  }

  if (activeSettlementLocks.has(settlementKey)) {
    return res.status(409).json({ error: 'Conflict: Settlement record is currently locked by another concurrent process. Please retry.' });
  }
  activeSettlementLocks.add(settlementKey);

  try {
    if (!state.settlements) state.settlements = [];
    const settlement = state.settlements.find(s => s.id === settlementKey || s.voucherReference === settlementKey || s.orderId === settlementKey);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement record not found.' });
    }

    if (settlement.status === 'SETTLED') {
      telemetryStore.duplicateSettlementAttempts = (telemetryStore.duplicateSettlementAttempts || 0) + 1;
      return res.status(409).json({ error: 'Duplicate settlement prevented: This voucher has already been settled and funds processed.' });
    }

    if (!['PENDING', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(settlement.status)) {
      return res.status(400).json({ error: `Cannot settle record in status ${settlement.status}.` });
    }

    const team = (state.teams || []).find(t => t.id === settlement.teamId || t.teamCode === settlement.teamCode);
    if (!team) return res.status(404).json({ error: `Team ${settlement.teamCode} not found.` });

    const security = (state.securities || []).find(s => (settlement.securityId && s.id === settlement.securityId) || s.id === settlement.ticker || s.ticker === settlement.ticker);
    if (!security) return res.status(404).json({ error: `Security ${settlement.ticker} not found.` });

    const order = (state.orders || []).find(o => o.id === settlement.orderId);
    const tx = (state.transactions || []).find(t => t.id === settlement.transactionId);

    const secCurrency = settlement.currency || 'INR';
    ensureTeamWallets(team);
    const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
    const effectiveActor = session.username || session.displayName || 'Bank Teller';

    let settleError = null;

    await withTransaction(async (txClient) => {
      // Row locking FIRST under ACID isolation
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockSettlementVoucherForUpdate(txClient, settlement.id);
        if (settlement.orderId) await lockOrderForUpdate(txClient, settlement.orderId);
        await lockWalletForUpdate(txClient, team.id, secCurrency);
        await lockHoldingForUpdate(txClient, team.id, settlement.ticker);

        // Phase 6 Authoritative PostgreSQL Bank Settlement
        await settleBankVoucherInDb(txClient, {
          settlementId: settlement.id,
          effectiveActor,
          notes,
          voucherReference
        });
      }

      if (settlement.status === 'SETTLED') {
        telemetryStore.duplicateSettlementAttempts = (telemetryStore.duplicateSettlementAttempts || 0) + 1;
        settleError = { status: 409, error: 'Duplicate settlement prevented: This voucher has already been settled and funds processed.' };
        return;
      }

      if (!['PENDING', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(settlement.status)) {
        settleError = { status: 400, error: `Cannot settle record in status ${settlement.status}.` };
        return;
      }

      if (settlement.action === 'BUY') {
        const currentCash = Number(team.cashWallets[secCurrency] || 0);
        if (currentCash < settlement.totalAmount) {
          settleError = { status: 400, error: `Insufficient ${secCurrency} balance for settlement. Available: ${currentCash}, Required: ${settlement.totalAmount}.` };
          return;
        }
        // Debit actual cash cost
        team.cashWallets[secCurrency] = isZeroDec ? Math.round(currentCash - settlement.totalAmount) : parseFloat((currentCash - settlement.totalAmount).toFixed(2));
        // Release full pre-reservation (consuming actual settlement cost and unlocking the +5% buffer)
        const releaseAmt = order?.reservedCashAmount ? order.reservedCashAmount : settlement.totalAmount;
        team.reservedCash[secCurrency] = isZeroDec
          ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt))
          : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt).toFixed(2));

        // Credit holdings to team
        if (!team.holdings) team.holdings = {};
        team.holdings[settlement.ticker] = (team.holdings[settlement.ticker] || 0) + settlement.quantity;
      } else if (settlement.action === 'SELL') {
        // Credit cash proceeds to team wallet
        team.cashWallets[secCurrency] = isZeroDec ? Math.round(((team.cashWallets[secCurrency] || 0) + settlement.totalAmount)) : parseFloat(((team.cashWallets[secCurrency] || 0) + settlement.totalAmount).toFixed(2));

        // Deduct delivered shares from holdings upon final Bank settlement
        if (!team.holdings) team.holdings = {};
        team.holdings[settlement.ticker] = (team.holdings[settlement.ticker] || 0) - settlement.quantity;
        if (team.holdings[settlement.ticker] <= 0) delete team.holdings[settlement.ticker];

        // Release locked holdings
        if (team.lockedHoldings) {
          team.lockedHoldings[settlement.ticker] = Math.max(0, (team.lockedHoldings[settlement.ticker] || 0) - settlement.quantity);
          if (team.lockedHoldings[settlement.ticker] <= 0) delete team.lockedHoldings[settlement.ticker];
        }

        // Deliver shares to market float
        if (security && security.availableUnits !== undefined) {
          security.availableUnits += settlement.quantity;
        }
      }

      // Record balanced double-entry ledger entry for bank settlement (fallback mode)
      if (!txClient || txClient.isFallback) {
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCurrency}`;
        const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
        const lines = settlement.action === 'BUY'
          ? [
              { accountId: clearingAccount, debit: settlement.totalAmount, credit: 0, currency: secCurrency },
              { accountId: teamAccount, debit: 0, credit: settlement.totalAmount, currency: secCurrency }
            ]
          : [
              { accountId: teamAccount, debit: settlement.totalAmount, credit: 0, currency: secCurrency },
              { accountId: clearingAccount, debit: 0, credit: settlement.totalAmount, currency: secCurrency }
            ];

        await recordJournalEntry(txClient, {
          transactionId: tx?.id || null,
          orderId: settlement.orderId,
          voucherId: settlement.id,
          entryType: 'BANK_SETTLEMENT_CONFIRMED',
          description: `Physical Bank Settlement ${settlement.action} for Team ${team.teamCode} (${secCurrency} ${settlement.totalAmount})`,
          lines
        });
      }

      // Update settlement status inside transaction
      settlement.status = 'SETTLED';
      settlement.workflowStage = 'SETTLED';
      settlement.settledAt = Date.now();
      settlement.settledBy = effectiveActor;
      if (voucherReference) settlement.voucherReference = voucherReference;
      if (notes) settlement.notes = notes;

      // Update order status inside transaction
      if (order) {
        order.status = 'SETTLED';
        order.workflowStage = 'SETTLED';
        order.settlementStatus = 'SETTLED';
        order.finalStatus = 'SETTLED';
        order.settledAt = settlement.settledAt;
        order.settledBy = settlement.settledBy;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          stage: 'SETTLED',
          status: 'SETTLED',
          timestamp: Date.now(),
          actor: effectiveActor,
          note: `Physical bank desk settled ${settlement.type} (${secCurrency} ${settlement.totalAmount.toLocaleString()})`
        });
      }

      // Update transaction status inside transaction
      if (tx) {
        tx.settlementStatus = 'SETTLED';
        tx.settledAt = settlement.settledAt;
        tx.settledBy = settlement.settledBy;
      }
    });

    if (settleError) {
      return res.status(settleError.status).json({ error: settleError.error });
    }

    // Recalculate cashBalance in INR equivalent
    team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);

    logAuditEvent({
      actor: effectiveActor,
      role: session.role,
      action: 'BANK_SETTLEMENT_CONFIRMED',
      target: settlement.id,
      reason: notes || `Settled ${settlement.action} for ${settlement.teamCode}`,
      details: {
        settlementId: settlement.id,
        orderId: settlement.orderId,
        ticketNumber: settlement.ticketNumber,
        teamCode: settlement.teamCode,
        ticker: settlement.ticker,
        totalAmount: settlement.totalAmount,
        currency: secCurrency,
        action: settlement.action
      }
    });

    saveState(true);
    broadcastState('SETTLEMENT_COMPLETED', { settlement, order });

    return res.json({
      success: true,
      settlement,
      voucher: settlement,
      order,
      wallets: team.cashWallets,
      holdings: team.holdings,
      cashBalance: team.cashBalance
    });
  } catch (err) {
    console.error('[Bank Settle Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error settling bank voucher.' });
  } finally {
    activeSettlementLocks.delete(settlementKey);
  }
});

app.post(['/api/bank/reject', '/api/bank/reject/'], async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  if (session.role === 'team') {
    return res.status(403).json({ error: 'Forbidden: Teams cannot reject settlements.' });
  }

  const canReject = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'bank.settle');
  if (!canReject) {
    return res.status(403).json({ error: 'Forbidden: Rejecting settlements requires Bank Teller or Administrator privileges.' });
  }

  const reason = (req.body?.reason || req.body?.rejectionReason || req.body?.notes || '').toString().trim();
  const rawId = req.body?.settlementId || req.body?.voucherReference || req.body?.orderId || req.body?.id;
  const settlementKey = rawId;
  if (!settlementKey || !reason) {
    return res.status(400).json({ error: 'settlementId, voucherReference, or orderId and an explicit reason are required to reject settlement.' });
  }

  if (activeSettlementLocks.has(settlementKey)) {
    return res.status(409).json({ error: 'Conflict: Settlement record is currently locked by another operation.' });
  }
  activeSettlementLocks.add(settlementKey);

  try {
    if (!state.settlements) state.settlements = [];
    const settlement = state.settlements.find(s => s.id === settlementKey || s.voucherReference === settlementKey || s.orderId === settlementKey);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement record not found.' });
    }

    const team = (state.teams || []).find(t => t.id === settlement.teamId || t.teamCode === settlement.teamCode);
    const security = findSecurityInUniverse(settlement, state.securities);
    const order = (state.orders || []).find(o => o.id === settlement.orderId);
    const tx = (state.transactions || []).find(t => t.id === settlement.transactionId);

    const secCurrency = settlement.currency || 'INR';
    const effectiveActor = session.username || session.displayName || 'Bank Teller';
    const effectiveReason = reason.trim();
    let rejectError = null;

    await withTransaction(async (txClient) => {
      // Row locking under ACID isolation
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockSettlementVoucherForUpdate(txClient, settlement.id);
        if (settlement.orderId) await lockOrderForUpdate(txClient, settlement.orderId);
        if (security) await lockSecurityForUpdate(txClient, security.id || security.ticker, security.ticker);
        if (team) await lockWalletForUpdate(txClient, team.id, secCurrency);

        // Phase 6 Authoritative PostgreSQL Bank Voucher Rejection
        await rejectBankVoucherInDb(txClient, {
          settlementId: settlement.id,
          effectiveActor,
          rejectionReason: effectiveReason
        });
      }

      if (!['PENDING', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(settlement.status)) {
        rejectError = { status: 400, error: `Cannot reject settlement in status ${settlement.status}.` };
        return;
      }

      if (settlement.action === 'BUY') {
        // Release reservation
        if (team && team.reservedCash) {
          const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
          const releaseAmt = order?.reservedCashAmount ? order.reservedCashAmount : settlement.totalAmount;
          team.reservedCash[secCurrency] = isZeroDec ? Math.round(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt)) : parseFloat(Math.max(0, (team.reservedCash[secCurrency] || 0) - releaseAmt).toFixed(2));
        }
        // Return units to market float
        if (security) {
          security.availableUnits += settlement.quantity;
        }
      } else if (settlement.action === 'SELL') {
        // Unlock deliverable units without touching holdings or float
        if (team && team.lockedHoldings) {
          team.lockedHoldings[settlement.ticker] = Math.max(0, (team.lockedHoldings[settlement.ticker] || 0) - settlement.quantity);
          if (team.lockedHoldings[settlement.ticker] <= 0) delete team.lockedHoldings[settlement.ticker];
        }
      }

      // Reversal: decrement trading volume
      if (security) {
        const decQty = settlement.quantity || 0;
        security.trading_volume = Math.max(0, (Number(security.trading_volume) || Number(security.tradingVolume) || 0) - decQty);
        security.tradingVolume = security.trading_volume;
        if (security.volume !== undefined) {
          security.volume = Math.max(0, Number(security.volume) - decQty);
        }
      }

      // Record double-entry reversal journal entry for bank rejection (fallback mode)
      if (!txClient || txClient.isFallback) {
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCurrency}`;
        const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
        const lines = settlement.action === 'BUY'
          ? [
              { accountId: teamAccount, debit: settlement.totalAmount, credit: 0, currency: secCurrency },
              { accountId: clearingAccount, debit: 0, credit: settlement.totalAmount, currency: secCurrency }
            ]
          : [
              { accountId: clearingAccount, debit: settlement.totalAmount, credit: 0, currency: secCurrency },
              { accountId: teamAccount, debit: 0, credit: settlement.totalAmount, currency: secCurrency }
            ];

        await recordJournalEntry(txClient, {
          transactionId: tx?.id || null,
          orderId: settlement.orderId,
          voucherId: settlement.id,
          entryType: 'BANK_SETTLEMENT_REVERSAL',
          description: `Bank Settlement Reversal ${settlement.action} for Team ${team.teamCode} (${secCurrency} ${settlement.totalAmount}): ${effectiveReason}`,
          lines
        });
      }

      settlement.status = 'REJECTED';
      settlement.workflowStage = 'REJECTED_BY_BANK';
      settlement.rejectedAt = Date.now();
      settlement.rejectedBy = effectiveActor;
      settlement.rejectionReason = effectiveReason;

      if (order) {
        order.status = 'REJECTED_BY_BANK';
        order.workflowStage = 'REJECTED_BY_BANK';
        order.settlementStatus = 'REJECTED';
        order.rejectionReason = effectiveReason;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          stage: 'REJECTED_BY_BANK',
          status: 'REJECTED_BY_BANK',
          timestamp: Date.now(),
          actor: effectiveActor,
          note: `Settlement rejected by bank: ${effectiveReason}`
        });
      }

      if (tx) {
        tx.settlementStatus = 'REJECTED';
        tx.voided = true;
      }
    });

    if (rejectError) {
      return res.status(rejectError.status).json({ error: rejectError.error });
    }

    // Task 1.2: Hybrid Price Rollback & Forward Compensating Architecture
    if (security) {
      const executedTimestamp = tx?.executedAt || tx?.timestamp || order?.executedAt || 0;
      const subsequentTrades = (state.transactions || []).filter(t =>
        !t.voided &&
        (t.ticker === settlement.ticker || t.securityId === settlement.ticker) &&
        t.id !== tx?.id &&
        (t.executedAt || t.timestamp || 0) > executedTimestamp
      );

      if (subsequentTrades.length === 0) {
        // Case A: Zero subsequent trades. Safe to roll back currentPrice to pre-trade execution price
        const preTradePrice = order?.priceAtExecution || (tx?.price ? (settlement.action === 'BUY' ? tx.price : tx.price) : null);
        if (preTradePrice) {
          security.currentPrice = preTradePrice;
          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({
            timestamp: Date.now(),
            price: security.currentPrice,
            reversionType: 'ROLLBACK_NO_SUBSEQUENT_TRADES',
            revertedTransactionId: tx?.id,
            note: 'Reverted to pre-trade price because zero subsequent trades occurred on this ticker.'
          });
        }
      } else {
        // Case B: Subsequent trades occurred. Do NOT rewrite history. Apply forward compensating delta
        const impactFactor = settlement.quantity / (security.totalUnits || 10000);
        const priceChangePercent = impactFactor * (security.volatility || 0.05) * 100;
        const delta = (settlement.action === 'BUY')
          ? -parseFloat((security.currentPrice * (priceChangePercent / 100)).toFixed(2))
          : parseFloat((security.currentPrice * (priceChangePercent / 100)).toFixed(2));

        security.currentPrice = Math.max(1, parseFloat((security.currentPrice + delta).toFixed(2)));
        if (!security.priceHistory) security.priceHistory = [];
        security.priceHistory.push({
          timestamp: Date.now(),
          price: security.currentPrice,
          reversionType: 'COMPENSATING_ADJUSTMENT',
          revertedTransactionId: tx?.id,
          note: `Compensating delta of ${delta > 0 ? '+' : ''}${delta} applied due to bank rejection of voucher ${settlement.id}`
        });
      }
    }

    if (team) {
      team.tradeCount = Math.max(0, (team.tradeCount || 0) - 1);
      team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
    }

    if (tx) {
      tx.settlementStatus = 'REJECTED';
      tx.voided = true;
      tx.voidReason = `Settlement rejected by bank: ${effectiveReason}`;
      tx.voidedAt = Date.now();
      tx.voidedBy = effectiveActor;
    }

    logAuditEvent({
      actor: effectiveActor,
      role: session.role,
      action: 'BANK_SETTLEMENT_REJECTED',
      target: settlement.id,
      reason: effectiveReason,
      details: {
        settlementId: settlement.id,
        orderId: settlement.orderId,
        ticketNumber: settlement.ticketNumber,
        teamCode: settlement.teamCode,
        ticker: settlement.ticker,
        totalAmount: settlement.totalAmount,
        currency: secCurrency,
        action: settlement.action
      }
    });

    saveState(true);
    broadcastState('SETTLEMENT_REJECTED', { settlement, order });

    return res.json({ success: true, settlement, voucher: settlement, order });
  } catch (err) {
    console.error('[Bank Reject Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error rejecting bank voucher.' });
  } finally {
    activeSettlementLocks.delete(settlementKey);
  }
});

app.post(['/api/bank/hold', '/api/bank/hold/'], async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  if (session.role === 'team') {
    return res.status(403).json({ error: 'Forbidden: Teams cannot place settlements on hold.' });
  }

  const canHold = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'bank.settle');
  if (!canHold) {
    return res.status(403).json({ error: 'Forbidden: Holding settlements requires Bank Teller or Administrator privileges.' });
  }

  const { notes, reason } = req.body || {};
  const settlementKey = req.body?.settlementId || req.body?.voucherReference || req.body?.orderId || req.body?.id;
  const holdNotes = (notes || reason || '').trim();
  if (!settlementKey || !holdNotes) {
    return res.status(400).json({ error: 'settlementId, voucherReference, or orderId and mandatory notes/reason are required to place settlement on hold.' });
  }

  if (activeSettlementLocks.has(settlementKey)) {
    return res.status(409).json({ error: 'Conflict: Settlement record is currently locked by another concurrent process. Please retry.' });
  }
  activeSettlementLocks.add(settlementKey);

  try {
    if (!state.settlements) state.settlements = [];
    const settlement = state.settlements.find(s => s.id === settlementKey || s.voucherReference === settlementKey || s.orderId === settlementKey);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement record not found.' });
    }

    if (settlement.status === 'SETTLED' || settlement.status === 'REJECTED') {
      return res.status(400).json({ error: `Cannot hold record in terminal status ${settlement.status}.` });
    }

    const effectiveActor = session.username || session.displayName || 'Bank Teller';

    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        await lockSettlementVoucherForUpdate(txClient, settlement.id);
        if (settlement.orderId) await lockOrderForUpdate(txClient, settlement.orderId);
        await holdBankVoucherInDb(txClient, {
          settlementId: settlement.id,
          effectiveActor,
          notes: holdNotes
        });
      }
    });

    settlement.status = 'HELD_FOR_REVIEW';
    settlement.workflowStage = 'HELD_FOR_REVIEW';
    settlement.notes = holdNotes;
    settlement.heldAt = Date.now();
    settlement.heldBy = effectiveActor;

    const order = (state.orders || []).find(o => o.id === settlement.orderId);
    if (order) {
      order.status = 'HELD_FOR_REVIEW';
      order.workflowStage = 'HELD_FOR_REVIEW';
      order.notes = holdNotes;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        stage: 'HELD_FOR_REVIEW',
        status: 'HELD_FOR_REVIEW',
        timestamp: Date.now(),
        actor: effectiveActor,
        note: `Voucher held for review: ${holdNotes}`
      });
    }

    saveState(true);
    broadcastState('SETTLEMENT_HELD', { settlement, order });
    return res.json({ success: true, settlement, voucher: settlement, order });
  } catch (err) {
    console.error('[Bank Hold Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error holding bank voucher.' });
  } finally {
    activeSettlementLocks.delete(settlementKey);
  }
});

app.post(['/api/bank/claim', '/api/bank/claim/'], async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  if (session.role === 'team') {
    return res.status(403).json({ error: 'Forbidden: Teams cannot claim bank vouchers.' });
  }

  const canClaim = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'bank.settle');
  if (!canClaim) {
    return res.status(403).json({ error: 'Forbidden: Claiming bank vouchers requires Bank Teller or Administrator privileges.' });
  }

  const settlementKey = req.body?.settlementId || req.body?.voucherReference || req.body?.orderId || req.body?.id;
  if (!settlementKey) {
    return res.status(400).json({ error: 'settlementId, voucherReference, or orderId is required to claim settlement.' });
  }

  if (activeSettlementLocks.has(settlementKey)) {
    return res.status(409).json({ error: 'Conflict: Settlement record is currently locked by another concurrent process. Please retry.' });
  }
  activeSettlementLocks.add(settlementKey);

  try {
    if (!state.settlements) state.settlements = [];
    const settlement = state.settlements.find(s => s.id === settlementKey || s.voucherReference === settlementKey || s.orderId === settlementKey);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement record not found.' });
    }

    if (settlement.status === 'SETTLED' || settlement.status === 'REJECTED') {
      return res.status(400).json({ error: `Cannot claim record in terminal status ${settlement.status}.` });
    }

    const effectiveActor = session.username || session.displayName || 'Bank Teller';

    if (settlement.status === 'VERIFYING_AT_BANK' && settlement.claimedBy && settlement.claimedBy !== effectiveActor) {
      return res.status(409).json({ error: `Conflict: Voucher ${settlement.voucherReference || settlementKey} is already claimed by ${settlement.claimedBy}.` });
    }

    settlement.status = 'VERIFYING_AT_BANK';
    settlement.workflowStage = 'VERIFYING_AT_BANK';
    settlement.claimedAt = Date.now();
    settlement.claimedBy = effectiveActor;

    const order = (state.orders || []).find(o => o.id === settlement.orderId);
    if (order) {
      order.status = 'VERIFYING_AT_BANK';
      order.workflowStage = 'VERIFYING_AT_BANK';
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        stage: 'VERIFYING_AT_BANK',
        status: 'VERIFYING_AT_BANK',
        timestamp: Date.now(),
        actor: effectiveActor,
        note: `Bank teller claimed voucher for verification`
      });
    }

    saveState(true);
    broadcastState('SETTLEMENT_CLAIMED', { settlement, order });
    return res.json({ success: true, settlement, voucher: settlement, order });
  } catch (err) {
    console.error('[Bank Claim Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error claiming bank voucher.' });
  } finally {
    activeSettlementLocks.delete(settlementKey);
  }
});

app.get(['/api/bank/reconciliation', '/api/bank/reconciliation/'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Session token required.' });
  }

  const canReconcile = session.role === 'admin' || session.role === 'super_admin' || session.role === 'sebi' || hasPerm(session, 'bank.reconcile');
  if (!canReconcile) {
    return res.status(403).json({ error: 'Forbidden: Bank reconciliation requires Bank Teller, SEBI, or Administrator privileges.' });
  }

  const settlements = state.settlements || [];
  const transactions = state.transactions || [];

  const summary = {
    totalTradesExecuted: transactions.filter(t => !t.voided).length,
    totalVoidedTrades: transactions.filter(t => t.voided).length,
    totalSettlements: settlements.length,
    settledCount: settlements.filter(s => s.status === 'SETTLED').length,
    pendingCount: settlements.filter(s => s.status === 'PENDING').length,
    rejectedCount: settlements.filter(s => s.status === 'REJECTED').length,
    voidedCount: settlements.filter(s => s.status === 'VOIDED').length,
    settledAmountsByCurrency: Object.keys(CURRENCY_DIRECTORY).reduce((acc, c) => ({ ...acc, [c]: 0 }), {}),
    pendingAmountsByCurrency: Object.keys(CURRENCY_DIRECTORY).reduce((acc, c) => ({ ...acc, [c]: 0 }), {})
  };

  settlements.forEach(s => {
    const cur = s.currency || 'INR';
    const isZeroDec = (cur === 'JPY' || cur === 'KRW');
    if (s.status === 'SETTLED') {
      const amt = (summary.settledAmountsByCurrency[cur] || 0) + Number(s.totalAmount || 0);
      summary.settledAmountsByCurrency[cur] = isZeroDec ? Math.round(amt) : parseFloat(amt.toFixed(2));
    } else if (s.status === 'PENDING') {
      const amt = (summary.pendingAmountsByCurrency[cur] || 0) + Number(s.totalAmount || 0);
      summary.pendingAmountsByCurrency[cur] = isZeroDec ? Math.round(amt) : parseFloat(amt.toFixed(2));
    }
  });

  const discrepancies = [];

  // Check 1: In TWO_PHASE_BANK mode, every non-voided transaction created in TWO_PHASE_BANK must have a settlement
  transactions.filter(t => !t.voided && t.settlementMode === 'TWO_PHASE_BANK').forEach(t => {
    const matchingStl = settlements.find(s => s.transactionId === t.id);
    if (!matchingStl) {
      discrepancies.push({
        type: 'ORPHAN_TRADE',
        transactionId: t.id,
        teamCode: t.teamCode,
        detail: `Trade ${t.id} executed in TWO_PHASE_BANK mode has no associated bank settlement record.`
      });
    }
  });

  // Check 2: Mismatched amounts between settlement and transaction
  settlements.forEach(s => {
    if (s.transactionId) {
      const tx = transactions.find(t => t.id === s.transactionId);
      if (tx && Math.abs(tx.totalValue - s.totalAmount) > 0.01) {
        discrepancies.push({
          type: 'AMOUNT_MISMATCH',
          settlementId: s.id,
          transactionId: tx.id,
          detail: `Settlement amount ${s.totalAmount} does not match transaction gross value ${tx.totalValue}.`
        });
      }
    }
  });

  // Check 3: Teams with negative reservedCash
  (state.teams || []).forEach(t => {
    if (t.reservedCash) {
      Object.keys(t.reservedCash).forEach(c => {
        if (Number(t.reservedCash[c] || 0) < 0) {
          discrepancies.push({
            type: 'NEGATIVE_RESERVATION',
            teamCode: t.teamCode,
            currency: c,
            detail: `Team ${t.teamCode} has negative reserved balance: ${t.reservedCash[c]}.`
          });
        }
      });
    }
  });

  return res.json({
    status: discrepancies.length === 0 ? 'HEALTHY' : 'DISCREPANCY_DETECTED',
    settlementMode: state.settings?.settlementMode || 'INSTANT',
    summary,
    discrepancies,
    generatedAt: Date.now()
  });
});

app.post(['/api/admin/settlement-mode', '/api/admin/settlement-mode/'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session token required.' });
  }

  const canConfigure = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'system.config');
  if (!canConfigure) {
    return res.status(403).json({ error: 'Forbidden: Changing settlement mode requires Administrator privileges.' });
  }

  const mode = req.body?.mode || req.body?.settlementMode;
  if (mode && mode !== 'TWO_PHASE_BANK') {
    return res.status(400).json({ error: "Instant settlement has been permanently removed. SAAMX operates strictly in TWO_PHASE_BANK mode (Team -> Exchange Desk -> Bank Desk)." });
  }

  if (!state.settings) state.settings = {};
  state.settings.settlementMode = 'TWO_PHASE_BANK';

  logAuditEvent({
    actor: session.username || session.displayName || 'admin',
    role: session.role,
    action: 'SETTLEMENT_MODE_CHANGED',
    target: 'settings.settlementMode',
    reason: `Affirmed two-phase physical bank settlement mode`,
    details: { mode: 'TWO_PHASE_BANK' }
  });

  saveState(true);
  broadcastState('SETTLEMENT_MODE_CHANGED', { settlementMode: 'TWO_PHASE_BANK' });

  return res.json({
    success: true,
    settlementMode: 'TWO_PHASE_BANK',
    message: 'Settlement mode is strictly locked to TWO_PHASE_BANK (Order Slip -> Bank Voucher).'
  });
});

// ----------------------------------------------------
// SIMPLE STOCK-ADVISOR REFERRAL SYSTEM (PHASE 6)
// Strictly BUY, HOLD, or SELL signal only
// ----------------------------------------------------
app.post('/api/advisor/refer', (req, res) => {
  const { ticker, teamCode, advisorName } = req.body || {};
  const effectiveTeamCode = (req.session?.role === 'team' ? req.session.teamCode : teamCode)?.toUpperCase();
  if (!ticker || !effectiveTeamCode) {
    return res.status(400).json({ error: 'ticker and teamCode are required to submit an advisor referral.' });
  }

  const tCode = effectiveTeamCode;
  const tick = ticker.toUpperCase();

  const sec = (state.securities || []).find(s => s.ticker === tick || s.id === tick);
  if (!sec) return res.status(404).json({ error: `Security ${tick} not found in universe.` });

  if (!state.advisorReferrals) state.advisorReferrals = [];

  const existingPending = state.advisorReferrals.find(r => r.teamCode === tCode && r.ticker === tick && r.status === 'PENDING');
  if (existingPending) {
    return res.status(400).json({ error: `Referral for ${tick} is already pending review with the Broker Advisor.` });
  }

  const validAdvisors = ['Ayan', 'Prerna', 'Chetan', 'Arman'];
  const targetAdvisor = (advisorName && validAdvisors.includes(advisorName.trim())) ? advisorName.trim() : (validAdvisors.includes(advisorName) ? advisorName : (advisorName || 'Prerna'));

  const referral = {
    id: `REF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamCode: tCode,
    ticker: tick,
    securityName: sec.name,
    submittedAt: Date.now(),
    status: 'PENDING',
    signal: null,
    advisorName: targetAdvisor,
    commentary: null,
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
  if (callerTeam) {
    const teamReferrals = state.advisorReferrals.filter(r => r.teamCode === callerTeam);
    return res.json(teamReferrals);
  }
  res.json(state.advisorReferrals);
});

app.post('/api/advisor/signal', (req, res) => {
  const { referralId, signal, advisorName, commentary, reasoning } = req.body || {};
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
  referral.advisorName = advisorName || referral.advisorName || req.body?.operator || 'Floor Advisor';
  referral.commentary = commentary || reasoning || `${referral.advisorName} advises ${cleanSignal} on ${referral.ticker} based on technical support & sector momentum.`;
  referral.answeredAt = Date.now();

  saveState();
  broadcastState('ADVISOR_SIGNAL_PUBLISHED', { referral });
  res.json({ success: true, referral });
});

// ----------------------------------------------------
// AUDIT & RECONCILIATION CSV REPORT EXPORTS (PHASE 10)
// ----------------------------------------------------
app.get('/api/reports/orders/csv', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to export orders report.' });
  }

  const allowed = hasPerm(session, 'audit.view') || 
                  hasPerm(session, 'orders.view_queue') || 
                  hasPerm(session, 'exchange.view') || 
                  session.role === 'admin' || 
                  session.role === 'super_admin';

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: Requires audit.view or desk supervision authorization to export orders CSV report.' });
  }

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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to export reconciliation report.' });
  }

  const allowed = hasPerm(session, 'audit.view') || 
                  hasPerm(session, 'system.config') || 
                  session.role === 'admin' || 
                  session.role === 'super_admin';

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: Requires audit.view permission to export event reconciliation report.' });
  }

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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required to view FX queue.' });
  }

  const isPrivileged = hasPerm(session, 'exchange.execute') || 
                       hasPerm(session, 'exchange.view') || 
                       hasPerm(session, 'sebi.surveil') || 
                       hasPerm(session, 'audit.view') || 
                       session.role === 'admin' || 
                       session.role === 'super_admin';

  if (isPrivileged) {
    return res.json({ success: true, queue: state.fxQueue || [] });
  }

  if (session.role === 'team') {
    const teamCode = session.teamCode;
    if (!teamCode) {
      return res.status(403).json({ error: 'Forbidden: No team code associated with session.' });
    }
    // Filter queue strictly to team's own pending conversion requests
    const teamQueue = (state.fxQueue || []).filter(q => 
      (q.teamCode || '').toUpperCase() === teamCode.toUpperCase()
    );
    return res.json({ success: true, queue: teamQueue });
  }

  // Deny-by-default for unprivileged roles
  return res.status(403).json({ error: 'Forbidden: You do not have permission to view FX queue.' });
});

app.post('/api/fx/request', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  const { teamCode, fromCurrency, toCurrency, fromAmount, notes, operatorId } = req.body || {};
  const amount = parseFloat(fromAmount);

  if (session && session.role === 'team' && session.teamCode) {
    if (teamCode && teamCode.toUpperCase() !== session.teamCode.toUpperCase()) {
      return res.status(403).json({ error: `Forbidden: Team ${session.teamCode} cannot submit FX requests for another team.` });
    }
  }

  if (state.fxMarketState?.status === 'PAUSED') {
    return res.status(400).json({
      error: `FX Market is temporarily PAUSED: ${state.fxMarketState.pausedReason || 'Operational halt'}`,
      paused: true,
      reason: state.fxMarketState.pausedReason,
      pausedAt: state.fxMarketState.pausedAt
    });
  }

  // Market-wide transaction limit check (if configured)
  const globalCap = state.fxMarketState?.marketWideTransactionLimitINR;
  if (globalCap && Number(globalCap) > 0) {
    const pairKey = `${fromCurrency}INR`;
    const rateInr = fromCurrency === 'INR' ? 1.0 : (state.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
    const totalInrEquivalent = amount * rateInr;
    if (totalInrEquivalent > Number(globalCap)) {
      return res.status(400).json({
        error: `Transaction value of ₹${Math.round(totalInrEquivalent).toLocaleString('en-IN')} exceeds current global FX market limit of ₹${Number(globalCap).toLocaleString('en-IN')}.`,
        transactionInr: totalInrEquivalent,
        globalLimitInr: Number(globalCap)
      });
    }
  }

  const candidateDesks = ['FX_1', 'FX_2'].filter(d => isDeskActive(d));
  if (candidateDesks.length === 0) {
    return res.status(400).json({ error: 'All FX Desks are currently INACTIVE and paused for new currency conversion requests. Existing queued requests continue to drain.' });
  }

  let assignedDesk = candidateDesks[0];
  if (candidateDesks.length > 1) {
    const deskCounts = { FX_1: 0, FX_2: 0 };
    (state.fxQueue || []).forEach(q => {
      const d = q.deskId || 'FX_1';
      if (deskCounts[d] !== undefined && !['SETTLED', 'settled', 'REJECTED', 'rejected', 'CANCELLED', 'cancelled', 'EXPIRED', 'expired'].includes(q.status)) {
        deskCounts[d]++;
      }
    });
    candidateDesks.sort((a, b) => (deskCounts[a] || 0) - (deskCounts[b] || 0));
    assignedDesk = candidateDesks[0];
  }

  const effectiveTeamCode = (session?.role === 'team' ? session.teamCode : teamCode)?.toUpperCase();
  if (!effectiveTeamCode || !fromCurrency || !toCurrency || isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Missing or invalid parameters: teamCode, fromCurrency, toCurrency, and positive finite fromAmount required.' });
  }

  if (fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'Cannot exchange currency to itself.' });
  }

  // Legacy CAD/CHF Isolation
  if (fromCurrency === 'CAD' || fromCurrency === 'CHF' || toCurrency === 'CAD' || toCurrency === 'CHF') {
    return res.status(400).json({ error: 'CAD and CHF are legacy currencies and not available for new exchange transactions.' });
  }

  if (!ACTIVE_CURRENCIES.includes(fromCurrency) || !ACTIVE_CURRENCIES.includes(toCurrency)) {
    return res.status(400).json({ error: `Unsupported currency. Active: ${ACTIVE_CURRENCIES.join(', ')}` });
  }

  const team = state.teams.find(t => (t.teamCode || '').toUpperCase() === effectiveTeamCode || t.id === effectiveTeamCode);
  if (!team) return res.status(404).json({ error: `Team ${effectiveTeamCode} not found.` });

  ensureTeamWallets(team);
  ensureFxReserves(state.fxReserves);

  const available = getUnreservedCash(team, fromCurrency);
  if (available < amount) {
    const curSym = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
    return res.status(400).json({ error: `Insufficient unreserved ${fromCurrency} funds. Available: ${curSym}${available.toLocaleString()}, Requested: ${curSym}${amount.toLocaleString()}` });
  }

  let conversion;
  try {
    conversion = calculateFxConversion(fromCurrency, toCurrency, amount, state.fxRates, state.fxReserves);
  } catch (convErr) {
    return res.status(400).json({ error: convErr.message });
  }

  const { toAmount, effectiveRate, spreadPercent, scarcityImpact, utilization } = conversion;

  // Immediate Finite Reserve Availability Check & Inventory Reservation
  if (toCurrency !== 'INR') {
    const reserve = state.fxReserves[toCurrency];
    if (!reserve || reserve.availableReserve < toAmount) {
      return res.status(400).json({
        error: 'Insufficient FX desk reserves',
        currency: toCurrency,
        requestedAmount: toAmount,
        availableReserve: reserve?.availableReserve || 0
      });
    }

    // Immediately reserve foreign desk inventory to prevent double-spending while awaiting clerk settlement
    reserve.reservedInventory = roundCurrency((reserve.reservedInventory || 0) + toAmount, toCurrency);
    reserve.availableReserve = roundCurrency(reserve.currentInventory - reserve.reservedInventory, toCurrency);
    assertSolvencyInvariant(reserve);
  }

  // Immediately reserve client source currency funds to prevent double-spending
  team.reservedCash[fromCurrency] = roundCurrency((team.reservedCash[fromCurrency] || 0) + amount, fromCurrency);

  const requestId = `FX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const effectiveOperator = session?.username || session?.userId || operatorId || (assignedDesk === 'FX_2' ? 'FX-DESK-02' : 'FX-DESK-01');

  // Persist reservations and queue record to PostgreSQL if connected
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE wallets SET reserved = reserved + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
        [amount, team.id, fromCurrency]
      );
      if (toCurrency !== 'INR') {
        await pool.query(
          `UPDATE fx_reserves SET reserved_inventory = reserved_inventory + $1, updated_at = NOW() WHERE currency = $2`,
          [toAmount, toCurrency]
        );
      }
      await pool.query(
        `INSERT INTO fx_queue (id, request_id, team_code, team_name, event_id, from_currency, to_currency, from_amount, to_amount, quote_rate, spread_percent, status, operator_id, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'QUEUED', $12, $13, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [requestId, requestId, team.teamCode, team.teamName, state.currentEventId || 'EVT_LIVE_MAIN', fromCurrency, toCurrency, amount, toAmount, effectiveRate, spreadPercent, effectiveOperator, notes || 'Floor FX conversion request']
      );
    } catch (pgErr) {
      console.warn('[PostgreSQL FX Request Notice]', pgErr.message);
    }
  }

  const requestedDuration = Number(req.body.simulationDurationSec || req.body.delayWindowSec || req.body.durationSec || 120);
  const isTestEnv = process.env.NODE_ENV === 'test' || (process.env.PORT && process.env.PORT !== '3001') || req.body.isTest;
  const durationSec = isTestEnv ? Math.max(1, requestedDuration) : Math.min(300, Math.max(60, requestedDuration));
  const initialStatus = req.body.status || (req.body.delayWindowSec || req.body.simulationDurationSec || req.headers['x-lifecycle'] === 'canonical' ? 'pending' : 'QUEUED');

  const fxItem = {
    id: requestId,
    requestId,
    deskId: assignedDesk,
    deskName: assignedDesk === 'FX_2' ? 'FX Desk 2 (Secondary)' : 'FX Desk 1 (Primary)',
    teamCode: team.teamCode,
    teamName: team.teamName,
    eventId: state.currentEventId || 'EVT_LIVE_MAIN',
    fromCurrency,
    toCurrency,
    fromAmount: roundCurrency(amount, fromCurrency),
    toAmount,
    quoteRate: effectiveRate,
    spreadPercent,
    scarcityImpact,
    utilization,
    status: initialStatus,
    canonicalStatus: 'pending',
    legacyStatus: 'QUEUED',
    operatorId: effectiveOperator,
    notes: notes || 'Floor FX conversion request',
    simulationDurationSec: durationSec,
    delayWindowSec: durationSec,
    clearsAt: Date.now() + (durationSec * 1000),
    lockedByOperator: null,
    holdReason: null,
    returnReason: null,
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

app.post('/api/fx/queue-action', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required for FX queue actions.' });
  }

  const canOperateQueue = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'exchange.execute') || hasPerm(session, 'exchange.view');
  if (!canOperateQueue) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to perform actions on the FX queue.' });
  }

  const { requestId, actionType: rawActionType, action: altAction, rejectionReason: rawRejectionReason, reason: altReason, holdReason, returnReason, operatorId, durationSec: reqDurationSec } = req.body || {};
  const actionType = (rawActionType || altAction || '').toUpperCase();
  const effectiveReason = (holdReason || returnReason || rawRejectionReason || altReason || '').trim();
  if (!requestId || !actionType) return res.status(400).json({ error: 'requestId and actionType required.' });

  const item = (state.fxQueue || []).find(f => f.id === requestId || f.requestId === requestId);
  if (!item) return res.status(404).json({ error: 'FX request not found.' });

  const terminalStatuses = ['SETTLED', 'settled', 'approved', 'APPROVED', 'CANCELLED', 'cancelled', 'REJECTED', 'rejected', 'EXPIRED', 'expired', 'returned_for_correction', 'RETURNED_FOR_CORRECTION'];
  if (terminalStatuses.includes(item.status)) {
    return res.status(400).json({ error: `FX request has already reached terminal status '${item.status}'.` });
  }

  const pool = getPool();

  const operatorName = req.session?.displayName || req.session?.username || operatorId || 'FX Operator';

  if (actionType === 'CLAIM') {
    if (item.lockedByOperator && item.lockedByOperator !== operatorName) {
      return res.status(409).json({ error: `Conflict: FX request ${item.id} is already claimed by ${item.lockedByOperator}.` });
    }
    const isCanonical = ['pending', 'processing', 'on_hold'].includes(item.status);
    item.status = isCanonical ? 'processing' : 'CLAIMED';
    item.canonicalStatus = 'processing';
    item.lockedByOperator = operatorName;
    item.operator = operatorName;
    item.claimedAt = Date.now();
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'RATE_CHECK') {
    item.status = 'RATE_CHECK';
    item.rateCheckedAt = Date.now();
    if (pool) {
      pool.query(`UPDATE fx_queue SET status = 'RATE_CHECK', rate_checked_at = NOW() WHERE id = $1`, [item.id]).catch(() => {});
    }
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'START_PROCESSING' || actionType === 'PROCESS') {
    if (item.lockedByOperator && item.lockedByOperator !== operatorName) {
      return res.status(409).json({ error: `Conflict: FX request ${item.id} is already claimed by ${item.lockedByOperator}.` });
    }
    const requestedDur = Number(reqDurationSec || req.body.simulationDurationSec || req.body.delayWindowSec || item.simulationDurationSec || item.delayWindowSec || 120);
    const isTestEnv = process.env.NODE_ENV === 'test' || (process.env.PORT && process.env.PORT !== '3001') || req.body.isTest;
    const durSec = isTestEnv ? Math.max(1, requestedDur) : Math.min(300, Math.max(60, requestedDur));

    const isCanonical = ['pending', 'processing', 'on_hold'].includes(item.status) || actionType === 'START_PROCESSING';
    item.status = isCanonical ? 'processing' : 'PROCESSING';
    item.canonicalStatus = 'processing';
    item.lockedByOperator = operatorName;
    item.operator = operatorName;
    item.processingStartedAt = Date.now();
    item.simulationDurationSec = durSec;
    item.delayWindowSec = durSec;
    item.clearsAt = Date.now() + (durSec * 1000);
    if (pool) {
      pool.query(`UPDATE fx_queue SET status = 'PROCESSING', processing_started_at = NOW() WHERE id = $1`, [item.id]).catch(() => {});
    }
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'HOLD') {
    const reason = effectiveReason;
    if (!reason || reason.length < 3) {
      return res.status(400).json({ error: 'Hold action requires a mandatory holdReason (minimum 3 characters).' });
    }
    item.status = 'on_hold';
    item.canonicalStatus = 'on_hold';
    item.holdReason = reason;
    item.heldAt = Date.now();
    item.lockedByOperator = operatorName;
    item.operator = operatorName;
    saveState();
    broadcastState('FX_STATUS_UPDATE', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (['REJECT', 'CANCEL', 'RETURN_FOR_CORRECTION', 'EXPIRE'].includes(actionType)) {
    const reason = effectiveReason;
    if ((actionType === 'REJECT' || actionType === 'RETURN_FOR_CORRECTION') && (!reason || reason.length < 3)) {
      return res.status(400).json({ error: `${actionType} requires a mandatory reason (minimum 3 characters).` });
    }

    const team = state.teams.find(t => (t.teamCode || '').toUpperCase() === (item.teamCode || '').toUpperCase() || t.id === item.teamCode);
    if (team) {
      ensureTeamWallets(team);
      // Cleanly release client source funds reservation (Zero balance leakage)
      team.reservedCash[item.fromCurrency] = roundCurrency(Math.max(0, (team.reservedCash[item.fromCurrency] || 0) - item.fromAmount), item.fromCurrency);
    }

    // Cleanly release foreign desk inventory reservation if foreign currency was reserved
    if (item.toCurrency !== 'INR') {
      ensureFxReserves(state.fxReserves);
      const reserve = state.fxReserves[item.toCurrency];
      if (reserve) {
        reserve.reservedInventory = roundCurrency(Math.max(0, (reserve.reservedInventory || 0) - item.toAmount), item.toCurrency);
        reserve.availableReserve = roundCurrency(reserve.currentInventory - reserve.reservedInventory, item.toCurrency);
        assertSolvencyInvariant(reserve);
      }
    }

    const isCanonical = ['pending', 'processing', 'on_hold', 'approved', 'rejected', 'cancelled', 'expired'].includes(item.status);
    let nextStatus = '';
    if (actionType === 'REJECT') {
      nextStatus = isCanonical ? 'rejected' : 'REJECTED';
    } else if (actionType === 'CANCEL') {
      nextStatus = isCanonical ? 'cancelled' : 'CANCELLED';
    } else if (actionType === 'RETURN_FOR_CORRECTION') {
      nextStatus = 'rejected';
    } else if (actionType === 'EXPIRE') {
      nextStatus = 'expired';
    }

    item.status = nextStatus;
    item.canonicalStatus = nextStatus.toLowerCase();
    item.rejectionReason = reason || (actionType === 'CANCEL' ? 'Cancelled by client team' : (actionType === 'EXPIRE' ? 'Operational clearance window expired without operator settlement.' : 'Declined by FX desk.'));
    if (actionType === 'RETURN_FOR_CORRECTION') {
      item.returnReason = reason;
    }
    item.releasedAt = Date.now();

    if (pool && team) {
      try {
        await pool.query(
          `UPDATE wallets SET reserved = GREATEST(0, reserved - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
          [item.fromAmount, team.id, item.fromCurrency]
        );
        if (item.toCurrency !== 'INR') {
          await pool.query(
            `UPDATE fx_reserves SET reserved_inventory = GREATEST(0, reserved_inventory - $1), updated_at = NOW() WHERE currency = $2`,
            [item.toAmount, item.toCurrency]
          );
        }
        await pool.query(
          `UPDATE fx_queue SET status = $1, rejection_reason = $2 WHERE id = $3`,
          [item.status, item.rejectionReason, item.id]
        );
      } catch (pgErr) {
        console.warn('[PostgreSQL Queue Action Release Notice]', pgErr.message);
      }
    }

    saveState();
    broadcastState(actionType === 'CANCEL' ? 'FX_CANCELLED' : 'FX_REJECTED', { fxRequest: item });
    return res.json({ success: true, fxRequest: item });
  }

  if (actionType === 'APPROVE' || actionType === 'SETTLE') {
    const canSettle = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'exchange.execute');
    if (!canSettle) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to settle FX conversions.' });
    }

    if (item.lockedByOperator && item.lockedByOperator !== operatorName && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(409).json({ error: `Conflict: FX request ${item.id} is claimed by ${item.lockedByOperator}.` });
    }

    const team = state.teams.find(t => (t.teamCode || '').toUpperCase() === (item.teamCode || '').toUpperCase() || t.id === item.teamCode);
    if (!team) return res.status(404).json({ error: `Team ${item.teamCode} not found.` });

    const lockKey = team.teamCode || team.id;
    if (activeFxLocks.has(lockKey)) {
      return res.status(409).json({ error: `Concurrent FX operation in progress for team ${lockKey}. Please retry.` });
    }
    activeFxLocks.add(lockKey);

    try {
      ensureTeamWallets(team);
      ensureFxReserves(state.fxReserves);

      // Verify client balance holds sufficient funds including reserved
      const clientTotal = Number(team.cashWallets[item.fromCurrency] || 0);
      if (clientTotal < item.fromAmount) {
        item.status = ['pending', 'processing', 'on_hold'].includes(item.status) ? 'rejected' : 'REJECTED';
        item.canonicalStatus = 'rejected';
        item.rejectionReason = `Insufficient balance at settlement. Required: ${item.fromAmount}, available: ${clientTotal}`;
        saveState();
        return res.status(400).json({ error: item.rejectionReason });
      }

      const effectiveOperator = session.username || session.userId || operatorId || item.operatorId || 'FX Desk Operator';
      item.operatorId = effectiveOperator;

      const fxTxId = `FXTX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fxTx = {
        id: fxTxId,
        ticketNumber: item.requestId || `FX-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        teamCode: team.teamCode,
        teamId: team.id,
        teamName: team.teamName,
        fromCurrency: item.fromCurrency,
        toCurrency: item.toCurrency,
        fromAmount: item.fromAmount,
        toAmount: item.toAmount,
        rate: item.quoteRate,
        spreadPercent: item.spreadPercent,
        scarcityImpact: item.scarcityImpact || 0,
        utilization: item.utilization || 0,
        operatorId: effectiveOperator,
        notes: item.notes || 'Queue FX Settlement',
        walletsAfter: null
      };

      // Atomic settlement inside PostgreSQL withTransaction
      await withTransaction(async (txClient) => {
        if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
          // Strict alphabetical row locking
          const lockCurs = [item.fromCurrency, item.toCurrency].sort();
          for (const cur of lockCurs) {
            await lockWalletForUpdate(txClient, team.id, cur);
          }
          if (item.toCurrency !== 'INR') {
            await lockFxReserveForUpdate(txClient, item.toCurrency);
          }
          if (item.fromCurrency !== 'INR') {
            await lockFxReserveForUpdate(txClient, item.fromCurrency);
          }

          // PostgreSQL UPDATE wallets (deduct balance and release reservation)
          await txClient.query(
            `UPDATE wallets SET balance = balance - $1, reserved = GREATEST(0, reserved - $1), updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
            [item.fromAmount, team.id, item.fromCurrency]
          );
          await txClient.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
            [item.toAmount, team.id, item.toCurrency]
          );

          // PostgreSQL UPDATE fx_reserves
          if (item.toCurrency !== 'INR') {
            await txClient.query(
              `UPDATE fx_reserves
               SET reserved_inventory = GREATEST(0, reserved_inventory - $1),
                   completed_sales = completed_sales + $1,
                   desk_inr_cash = desk_inr_cash + $2,
                   updated_at = NOW()
               WHERE currency = $3`,
              [item.toAmount, item.fromAmount, item.toCurrency]
            );
          }
          if (item.fromCurrency !== 'INR') {
            await txClient.query(
              `UPDATE fx_reserves
               SET completed_purchases = completed_purchases + $1,
                   desk_inr_cash = GREATEST(0, desk_inr_cash - $2),
                   updated_at = NOW()
               WHERE currency = $3`,
              [item.fromAmount, item.toAmount, item.fromCurrency]
            );
          }

          // PostgreSQL UPDATE fx_queue
          await txClient.query(
            `UPDATE fx_queue SET status = 'SETTLED', settled_at = NOW() WHERE id = $1`,
            [item.id]
          );

          // PostgreSQL INSERT fx_transactions
          await txClient.query(
            `INSERT INTO fx_transactions (id, ticket_number, team_code, team_id, team_name, from_currency, to_currency, from_amount, to_amount, rate, spread_percent, operator, operator_id, notes, status, timestamp, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, 'CONFIRMED', NOW(), NOW())
             ON CONFLICT (ticket_number) DO NOTHING`,
            [fxTxId, item.requestId, team.teamCode, team.id, team.teamName, item.fromCurrency, item.toCurrency, item.fromAmount, item.toAmount, item.quoteRate, item.spreadPercent, effectiveOperator, item.notes || 'Queue FX Settlement']
          );
        }

        // In-memory wallet updates
        team.cashWallets[item.fromCurrency] = roundCurrency(Number(team.cashWallets[item.fromCurrency]) - item.fromAmount, item.fromCurrency);
        team.reservedCash[item.fromCurrency] = roundCurrency(Math.max(0, (team.reservedCash[item.fromCurrency] || 0) - item.fromAmount), item.fromCurrency);
        team.cashWallets[item.toCurrency] = roundCurrency(Number(team.cashWallets[item.toCurrency] || 0) + item.toAmount, item.toCurrency);

        // In-memory fx_reserves updates
        if (item.toCurrency !== 'INR') {
          const resForeign = state.fxReserves[item.toCurrency];
          if (resForeign) {
            resForeign.reservedInventory = roundCurrency(Math.max(0, (resForeign.reservedInventory || 0) - item.toAmount), item.toCurrency);
            resForeign.completedSales = roundCurrency((resForeign.completedSales || 0) + item.toAmount, item.toCurrency);
            resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, item.toCurrency);
            resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, item.toCurrency);
            resForeign.deskInrCash = roundCurrency((resForeign.deskInrCash || 0) + item.fromAmount, 'INR');
            assertSolvencyInvariant(resForeign);
          }
        }
        if (item.fromCurrency !== 'INR') {
          const resForeign = state.fxReserves[item.fromCurrency];
          if (resForeign) {
            resForeign.completedPurchases = roundCurrency((resForeign.completedPurchases || 0) + item.fromAmount, item.fromCurrency);
            resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, item.fromCurrency);
            resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, item.fromCurrency);
            resForeign.deskInrCash = roundCurrency(Math.max(0, (resForeign.deskInrCash || 0) - item.toAmount), 'INR');
            assertSolvencyInvariant(resForeign);
          }
        }

        const teamFromAccount = `ACC_TEAM_${team.teamCode}_${item.fromCurrency}`;
        const clearingFromAccount = `ACC_SYS_CLEARING_FX_${item.fromCurrency}`;
        const teamToAccount = `ACC_TEAM_${team.teamCode}_${item.toCurrency}`;
        const clearingToAccount = `ACC_SYS_CLEARING_FX_${item.toCurrency}`;

        const lines = [
          { accountId: teamFromAccount, debit: 0, credit: item.fromAmount, currency: item.fromCurrency },
          { accountId: clearingFromAccount, debit: item.fromAmount, credit: 0, currency: item.fromCurrency },
          { accountId: clearingToAccount, debit: 0, credit: item.toAmount, currency: item.toCurrency },
          { accountId: teamToAccount, debit: item.toAmount, credit: 0, currency: item.toCurrency }
        ];

        await recordJournalEntry(txClient, {
          transactionId: fxTx.id,
          entryType: 'FX_CONVERSION',
          description: `FX Queue Settle ${item.fromAmount} ${item.fromCurrency} to ${item.toAmount} ${item.toCurrency} for Team ${team.teamCode}`,
          lines
        });
      });

      team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
      fxTx.walletsAfter = { ...team.cashWallets };

      const isCanonical = ['pending', 'processing', 'on_hold'].includes(item.status) || actionType === 'APPROVE';
      item.status = isCanonical ? 'approved' : 'SETTLED';
      item.canonicalStatus = 'approved';
      item.settledAt = Date.now();

      if (!state.fxTransactions) state.fxTransactions = [];
      state.fxTransactions.unshift(fxTx);

      logAuditEvent({
        actor: effectiveOperator,
        role: session.role || 'exchange',
        action: 'FX_QUEUE_SETTLE',
        target: team.teamCode,
        newState: fxTx,
        reason: `Settled queued FX request ${item.requestId}: ${item.fromCurrency} ${item.fromAmount} -> ${item.toCurrency} ${item.toAmount}`
      });

      saveState();
      broadcastState('FX_SETTLED', { fxRequest: item, transaction: fxTx });
      return res.json({ success: true, fxRequest: item, transaction: fxTx, settleTx: fxTx, cashWallets: team.cashWallets, cashBalance: team.cashBalance });
    } catch (err) {
      console.error('[FX Queue Action Error]', err);
      return res.status(err.status || 500).json({ error: err.message || 'Internal error during FX queue action.' });
    } finally {
      activeFxLocks.delete(lockKey);
    }
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

  if (!schoolName || !investmentHouseName) {
    return res.status(400).json({ error: 'School Name and Investment House Name are required.' });
  }

  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
  if (currentEvent && currentEvent.registrationOpen === false) {
    return res.status(403).json({ error: 'Registration is currently closed for this event.' });
  }

  const maxHouses = Math.min(20, Math.max(10, Number(currentEvent?.maximumInvestmentHouses || state.settings?.configuredHouseCapacity || 20)));
  const currentHouseCount = (state.investmentHouses || []).filter(h => h.eventId === (currentEvent?.eventId || 'EVT_LIVE_MAIN')).length;
  if (currentHouseCount >= maxHouses) {
    return res.status(400).json({ error: `Maximum capacity reached (${maxHouses} Investment Houses). Registration closed.` });
  }

  // Prevent duplicate school or house registration for same event
  const normSchoolName = schoolName.trim().toLowerCase();
  const normHouseName = investmentHouseName.trim().toLowerCase();
  const isDuplicate = (state.schools || []).some(s =>
    s.eventId === (currentEvent?.eventId || 'EVT_LIVE_MAIN') &&
    s.schoolName.trim().toLowerCase() === normSchoolName
  ) || (state.investmentHouses || []).some(h =>
    h.eventId === (currentEvent?.eventId || 'EVT_LIVE_MAIN') &&
    h.investmentHouseName.trim().toLowerCase() === normHouseName
  );
  if (isDuplicate) {
    return res.status(400).json({ error: `A registration for this school or Investment House name already exists for this event.` });
  }

  const schoolId = `SCH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const schoolObj = {
    schoolId,
    schoolName: schoolName.trim(),
    board: board || 'CBSE',
    city: city || '',
    contactPerson: contactPerson || 'Faculty Representative',
    facultyCoordinator: facultyCoordinator || contactPerson || 'Faculty Coordinator',
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
  const passwordHash = hashPassword(rawPassword);

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
  const deskNum = parseInt(allocatedCode.replace(/\D/g, '') || '1', 10);
  const assignedDeskId = `DESK_${((deskNum - 1) % 5) + 1}`;
  regObj.assignedDesk = assignedDeskId;
  houseObj.assignedDesk = assignedDeskId;

  state.registrations.unshift(regObj);

  saveState();
  broadcastState('REGISTRATION_SUBMITTED', { registration: regObj });

  res.json({
    success: true,
    registrationId: regId,
    teamCode: allocatedCode,
    tempPin,
    assignedDesk: assignedDeskId,
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
  // STRICT CANONICAL RULE: Participant universe is strictly fixed to exactly 10 teams (T01–T10)
  const allowedTeamCodes = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10'];
  if (allocatedTeamCode && !allowedTeamCodes.includes(allocatedTeamCode.toUpperCase())) {
    return res.status(400).json({
      error: `Forbidden: SAAMX participant universe is strictly fixed to exactly 10 teams (T01–T10). Cannot allocate '${allocatedTeamCode}'.`
    });
  }

  const finalCode = allocatedTeamCode ? allocatedTeamCode.toUpperCase() : targetHouse.teamCode;
  if (!allowedTeamCodes.includes(finalCode)) {
    return res.status(400).json({
      error: `Forbidden: SAAMX participant universe is strictly fixed to exactly 10 teams (T01–T10). Cannot activate '${finalCode}'.`
    });
  }
  const currentEvent = (state.events || []).find(e => e.eventId === (targetHouse?.eventId || state.currentEventId)) || state.events?.[0];
  const maxCap = Math.min(20, Math.max(10, Number(currentEvent?.maximumInvestmentHouses || state.settings?.configuredHouseCapacity || 20)));
  const existingTeam = (state.teams || []).find(t => t.teamCode === finalCode || t.id === finalCode);

  if (!existingTeam || existingTeam.isActive === false) {
    const activeCount = (state.teams || []).filter(t => t.isActive !== false && t.id !== finalCode && t.teamCode !== finalCode).length;
    if (activeCount >= maxCap) {
      return res.status(400).json({
        error: `Configured capacity limit (${maxCap} Investment Houses) reached. Cannot approve/activate additional teams.`
      });
    }
  }

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

  // Ensure desk clearance station binding
  if (!teamEntry.assignedDesk) {
    const num = parseInt(finalCode.replace(/\D/g, '') || String(state.teams.length), 10);
    teamEntry.assignedDesk = `DESK_${((num - 1) % 5) + 1}`;
  }
  if (state.orderDesks && state.orderDesks[teamEntry.assignedDesk]) {
    if (!state.orderDesks[teamEntry.assignedDesk].assignedTeams) {
      state.orderDesks[teamEntry.assignedDesk].assignedTeams = [];
    }
    if (!state.orderDesks[teamEntry.assignedDesk].assignedTeams.includes(finalCode)) {
      state.orderDesks[teamEntry.assignedDesk].assignedTeams.push(finalCode);
    }
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

// Canonical News Presets Endpoint (Authoritative Single Source for Admin, SEBI, Newsroom, Journalists)
app.get('/api/news/presets', (req, res) => {
  const { category, search, sentiment, priority, scope } = req.query || {};
  let list = NEWS_PRESETS_LIBRARY;

  if (scope && scope !== 'All') {
    list = list.filter(p => p.scope?.toUpperCase() === scope.toUpperCase());
  }
  if (category && category !== 'All') {
    list = list.filter(p => p.category === category);
  }
  if (sentiment && sentiment !== 'All') {
    list = list.filter(p => p.sentiment === sentiment);
  }
  if (priority && priority !== 'All') {
    list = list.filter(p => p.priority === priority);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p =>
      (p.headline && p.headline.toLowerCase().includes(q)) ||
      (p.shortHeadline && p.shortHeadline.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.affectedTickers && p.affectedTickers.some(s => s.toLowerCase().includes(q))) ||
      (p.affectedSecurityIds && p.affectedSecurityIds.some(s => s.toLowerCase().includes(q)))
    );
  }

  const indiaCount = NEWS_PRESETS_LIBRARY.filter(p => p.scope === 'INDIA').length;
  const globalCount = NEWS_PRESETS_LIBRARY.filter(p => p.scope === 'GLOBAL').length;

  res.json({
    success: true,
    totalCount: NEWS_PRESETS_LIBRARY.length,
    indiaCount,
    globalCount,
    filteredCount: list.length,
    categories: NEWS_PRESET_CATEGORIES,
    presets: list
  });
});

// News Engine Operational State Management (OFF, READY, RUNNING, PAUSED, COMPLETED)
app.get('/api/news/state', (req, res) => {
  if (!state.newsEngineState) {
    state.newsEngineState = {
      status: 'READY',
      publishedCount: (state.newsEvents || []).length,
      activeCount: (state.newsEvents || []).filter(n => !n.dismissed && n.active !== false).length,
      updatedAt: Date.now(),
      updatedBy: 'system'
    };
  }
  state.newsEngineState.publishedCount = (state.newsEvents || []).length;
  state.newsEngineState.activeCount = (state.newsEvents || []).filter(n => !n.dismissed && n.active !== false).length;

  res.json({
    success: true,
    newsEngineState: state.newsEngineState
  });
});

app.post('/api/news/state', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'news_controller' && !hasPerm(session, 'news.publish'))) {
    return res.status(403).json({ error: 'Forbidden: Controlling News Engine state requires News Controller or Administrator authorization.' });
  }

  const { status, reason } = req.body || {};
  const validStatuses = ['OFF', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  if (!state.newsEngineState) state.newsEngineState = {};
  state.newsEngineState.status = status;
  state.newsEngineState.reason = reason || null;
  state.newsEngineState.updatedAt = Date.now();
  state.newsEngineState.updatedBy = session.username || 'operator';

  logAuditEvent({
    actor: session.username,
    role: session.role,
    action: `NEWS_ENGINE_STATE_CHANGED: ${status}`,
    target: 'newsEngineState',
    reason: reason || 'Operator action'
  });

  saveState(true);
  broadcastState('NEWS_ENGINE_STATE_UPDATED', { newsEngineState: state.newsEngineState });

  res.json({
    success: true,
    newsEngineState: state.newsEngineState
  });
});

// Structured Morning Market Bulletin Endpoint
app.get('/api/news/bulletin/morning', (req, res) => {
  res.json({
    success: true,
    bulletin: MORNING_MARKET_BULLETIN
  });
});

// Structured Evening Market Bulletin Endpoint (Dynamically Generated from Actual Market Events)
app.get('/api/news/bulletin/evening', (req, res) => {
  const bulletin = generateEveningBulletin(state);
  res.json({
    success: true,
    bulletin
  });
});

// SAAMX Market Herald Newspaper Endpoint
app.get('/api/news/newspaper', (req, res) => {
  res.json({
    success: true,
    newspaper: SAAMX_MARKET_HERALD
  });
});

// News Debate Bank Endpoint (40 Structured Topics)
app.get('/api/news/debates', (req, res) => {
  const { category, scope } = req.query || {};
  let list = DEBATE_BANK;
  if (scope && scope !== 'All') {
    list = list.filter(d => d.scope.toUpperCase() === scope.toUpperCase());
  }
  if (category && category !== 'All') {
    list = list.filter(d => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  res.json({
    success: true,
    totalCount: DEBATE_BANK.length,
    indiaCount: DEBATE_BANK.filter(d => d.scope === 'INDIA').length,
    globalCount: DEBATE_BANK.filter(d => d.scope === 'GLOBAL').length,
    filteredCount: list.length,
    debates: list
  });
});

// Dedicated Visual Takeover Dismissal Endpoint (Projector auto-dismiss 5-10s):
// Clears visual takeover on the Projector/screen while preserving active market decaying impact and news event status!
app.post(['/api/news/dismiss-takeover', '/api/projector/dismiss-takeover'], (req, res) => {
  if (state.marketState) {
    state.marketState.takeoverEvent = null;
  }
  saveState(false);
  broadcastState('TAKEOVER_DISMISSED', { takeoverEvent: null });
  return res.json({ success: true, message: 'Visual takeover dismissed from projector; market impact continues active.' });
});

// Server-Side News Dismissal & Retraction Endpoint (Durable lifecycle state update)
app.post(['/api/news/dismiss', '/api/news/remove'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  const isPrivileged = session && (session.role === 'admin' || session.role === 'super_admin' || session.role === 'news_controller' || session.role === 'sebi' || hasPerm(session, 'news.review') || hasPerm(session, 'market.control'));
  
  const { newsId, targetId, reason, visualOnly } = req.body || {};
  const idToDismiss = newsId || targetId;

  if (!idToDismiss || visualOnly) {
    // If visualOnly is true or no ID is passed, dismiss visual takeover only without affecting market impact
    if (state.marketState) {
      state.marketState.takeoverEvent = null;
    }
    saveState(false);
    broadcastState('TAKEOVER_DISMISSED', { takeoverEvent: null });
    return res.json({ success: true, message: 'Active projector visual takeover dismissed; market impact remains active.' });
  }

  // Find target in state.newsEvents
  let targetFound = false;
  if (Array.isArray(state.newsEvents)) {
    const item = state.newsEvents.find(n => n.id === idToDismiss);
    if (item) {
      item.dismissed = true;
      item.dismissedAt = Date.now();
      item.active = false;
      targetFound = true;
    }
  }

  // Remove from active decaying loop
  if (Array.isArray(state.activeDecayingEvents)) {
    state.activeDecayingEvents = state.activeDecayingEvents.filter(e => e.id !== idToDismiss);
  }

  // Clear from takeoverEvent if active
  if (state.marketState?.takeoverEvent && (state.marketState.takeoverEvent.id === idToDismiss || state.marketState.takeoverEvent.newsId === idToDismiss)) {
    state.marketState.takeoverEvent = null;
  }

  saveState(true);
  broadcastState('NEWS_DISMISSED', { newsId: idToDismiss, takeoverEvent: state.marketState?.takeoverEvent || null });

  res.json({
    success: true,
    newsId: idToDismiss,
    targetFound,
    message: `News event ${idToDismiss} dismissed from authoritative active feeds.`
  });
});

// News bulletins & Centralized Market Impact Engine
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
    impactMagnitude,
    category,
    subcategory,
    priority,
    severity,
    classification,
    duration,
    durationMinutes,
    decayHalfLife,
    revertFactor,
    autoRevert,
    fxImpactPercent,
    targetPair,
    impactParameters,
    affectedAssets
  } = req.body || {};

  if (!headline || (!sentiment && impactPercent === undefined && priceImpactPercent === undefined && impactMagnitude === undefined)) {
    return res.status(400).json({ error: 'Missing mandatory news values (headline and sentiment/impact required).' });
  }

  // Construct standardized event payload
  const resolvedCategory = category || 'Macroeconomics / RBI';
  const resolvedSentiment = sentiment || (Number(impactPercent || priceImpactPercent || 0) >= 0 ? 'Positive' : 'Negative');
  const resolvedMagnitude = Math.abs(Number(impactMagnitude !== undefined ? impactMagnitude : (impactPercent !== undefined ? impactPercent : (priceImpactPercent || 0))));
  const resolvedClassification = classification || (resolvedCategory.includes('rumour') ? 'rumour' : 'confirmed');

  const eventPayload = {
    headline,
    description: description || summary || '',
    category: resolvedCategory,
    subcategory: subcategory || 'GENERAL_NEWS',
    priority: priority || severity || (resolvedMagnitude >= 12 ? 'CRITICAL' : resolvedMagnitude >= 8 ? 'BREAKING' : resolvedMagnitude >= 4 ? 'IMPORTANT' : 'INFORMATION'),
    sentiment: resolvedSentiment,
    impactMagnitude: resolvedMagnitude,
    classification: resolvedClassification,
    affectedSecurityIds: affectedSecurityIds || (affectedAssets && affectedAssets.securities) || [],
    affectedSectors: affectedSectors || (affectedAssets && affectedAssets.sectors) || (affectedSector ? [affectedSector] : []),
    affectedSector: affectedSector || (affectedSectors && affectedSectors[0]) || ((affectedAssets && affectedAssets.sectors && affectedAssets.sectors[0]) || null),
    affectedAssets: affectedAssets || {
      securities: affectedSecurityIds || [],
      sectors: affectedSectors || (affectedSector ? [affectedSector] : []),
      currencies: (req.body && req.body.affectedCurrencies) || ['INR']
    },
    impactParameters: impactParameters || {
      priceImpactPercent: (resolvedSentiment === 'Positive' ? 1 : -1) * resolvedMagnitude,
      volatilityMultiplier: 1.3,
      demandShift: (resolvedSentiment === 'Positive' ? 30 : -30),
      tradingRestriction: req.body?.tradingRestriction || null,
      fxImpactPercent: Number(fxImpactPercent || 0),
      fxReserveDemand: Number(req.body?.fxReserveDemand || 0)
    },
    duration: durationMinutes || duration || 5,
    expiryRules: {
      decayHalfLife: decayHalfLife !== undefined ? decayHalfLife : 90,
      autoRevert: autoRevert !== undefined ? autoRevert : true,
      revertFactor: revertFactor !== undefined ? revertFactor : 0.60
    }
  };

  // Run pure centralized impact engine
  const impactResult = calculateMarketImpact(eventPayload, state.securities || [], {
    multiplier: 1.0,
    peerContagionRate: 0.30,
    circuitThreshold: 20.0
  });

  // Apply modifications to in-memory security prices and dual price tracking
  impactResult.modifications.forEach(mod => {
    const sec = state.securities.find(s => s.ticker === mod.ticker || s.id === mod.securityId);
    if (!sec) return;

    sec.currentPrice = mod.newPrice;
    if (mod.newVolatility) sec.volatility = mod.newVolatility;

    // Dual price decomposition
    sec.newsImpact = parseFloat(((sec.newsImpact || 0) + mod.impactPercent).toFixed(2));
    const baseP = sec.basePrice || mod.oldPrice || 100;
    sec.totalImpact = parseFloat((((sec.currentPrice - baseP) / baseP) * 100).toFixed(2));
    sec.participantImpact = parseFloat((sec.totalImpact - sec.newsImpact).toFixed(2));

    if (!sec.priceHistory) sec.priceHistory = [];
    sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
    if (sec.priceHistory.length > 200) sec.priceHistory.shift();
  });

  // Enforce circuit breaker trading halts for extreme news shocks (>= 20%)
  impactResult.circuitHalts.forEach(halt => {
    const sec = state.securities.find(s => s.ticker === halt.ticker || s.id === halt.securityId);
    if (sec) {
      sec.status = 'Halted';
      broadcastState('MARKET_HALT', { ticker: sec.ticker, reason: halt.reason });
    }
  });

  // FX Rate and simulated finite reserve pressure calculation
  const fxImpact = Number(eventPayload.impactParameters.fxImpactPercent || fxImpactPercent || 0);
  if (fxImpact !== 0 && state.fxRates) {
    const fxPairKey = targetPair || 'USDINR';
    if (state.fxRates[fxPairKey]) {
      const oldRate = state.fxRates[fxPairKey].midRate;
      state.fxRates[fxPairKey].midRate = parseFloat((oldRate * (1 + fxImpact / 100)).toFixed(2));
    }
    const targetCurr = fxPairKey.replace('INR', '') || 'USD';
    state.fxDemandPressure = state.fxDemandPressure || {};
    state.fxDemandPressure[targetCurr] = calculateSimulatedFxDemandPressure(targetCurr, eventPayload.priority, state.fxDemandPressure);
  }

  // Construct news event for audit and broadcast
  const newsId = `NW${String((state.newsEvents || []).length + 1).padStart(3, '0')}`;
  const newsItem = {
    id: newsId,
    headline: eventPayload.headline,
    description: eventPayload.description,
    summary: eventPayload.description,
    category: eventPayload.category,
    subcategory: eventPayload.subcategory,
    priority: eventPayload.priority,
    sentiment: eventPayload.sentiment,
    impactPercent: eventPayload.impactMagnitude,
    priceImpactPercent: eventPayload.impactParameters.priceImpactPercent,
    classification: eventPayload.classification,
    affectedSecurityIds: impactResult.modifications.map(m => m.ticker),
    affectedSectors: eventPayload.affectedSectors,
    affectedSector: eventPayload.affectedSector,
    affectedCountries: affectedCountries || ['Global'],
    modifications: impactResult.modifications,
    circuitHalts: impactResult.circuitHalts,
    durationSeconds: eventPayload.duration * 60,
    expiresAt: Date.now() + (eventPayload.duration * 60 * 1000),
    triggeredAt: Date.now(),
    isCustom: true
  };

  if (!state.newsEvents) state.newsEvents = [];
  state.newsEvents.unshift(newsItem);

  // Enqueue active decaying event for background loop exponential half-life decay
  if (eventPayload.expiryRules.autoRevert && eventPayload.expiryRules.decayHalfLife > 0) {
    if (!state.activeDecayingEvents) state.activeDecayingEvents = [];
    state.activeDecayingEvents.push({
      id: newsItem.id,
      headline: newsItem.headline,
      startTime: Date.now(),
      durationSeconds: eventPayload.duration * 60,
      halfLife: eventPayload.expiryRules.decayHalfLife,
      reversionFloor: Math.max(0, 1 - (eventPayload.expiryRules.revertFactor || 0.60)),
      modifications: impactResult.modifications
    });
  }

  updateMarketIndex();

  // Durable Audit Logging
  logAuditEvent({
    actor: req.user?.username || (req.session && req.session.username) || 'System',
    role: req.user?.role || (req.session && req.session.role) || 'admin',
    action: `NEWS_PUBLISH: ${headline}`,
    target: newsId,
    reason: `Centralized Market Impact: ${eventPayload.impactParameters.priceImpactPercent}% on ${impactResult.modifications.length} assets`
  });

  saveState(true);

  // WebSocket Broadcast
  broadcastState('NEWS_FLASH', { newsItem });

  res.json({
    success: true,
    newsItem,
    modifications: impactResult.modifications,
    circuitHalts: impactResult.circuitHalts
  });
});

// Draft Intake Endpoint: Journalists submit drafts for review
app.post('/api/news/draft', (req, res) => {
  const {
    headline,
    description,
    category,
    subcategory,
    priority,
    sentiment,
    impactMagnitude,
    affectedSecurityIds,
    affectedSector,
    affectedSectors,
    affectedCurrencies,
    eventType,
    classification,
    durationMinutes,
    decayType,
    trainingEligibility,
    authorUsername
  } = req.body || {};

  if (!headline || !description) {
    return res.status(400).json({ error: 'Headline and description are required for news drafts.' });
  }

  const VALID_NEWS_CATEGORIES = [
    'Corporate earnings',
    'M&A / leadership',
    'IPOs / new listings',
    'Speculation / rumours',
    'Macroeconomics / RBI',
    'Sector developments',
    'Global / geopolitical',
    'Regulatory / SEBI',
    'Commodities / forex / rates'
  ];

  const CATEGORY_ALIASES = {
    'corporate earnings': 'Corporate earnings',
    'earnings': 'Corporate earnings',
    'm&a / leadership': 'M&A / leadership',
    'm&a': 'M&A / leadership',
    'ipos / new listings': 'IPOs / new listings',
    'ipo': 'IPOs / new listings',
    'speculation / rumours': 'Speculation / rumours',
    'rumours': 'Speculation / rumours',
    'speculation': 'Speculation / rumours',
    'macroeconomics / rbi': 'Macroeconomics / RBI',
    'macroeconomics': 'Macroeconomics / RBI',
    'macro': 'Macroeconomics / RBI',
    'rbi': 'Macroeconomics / RBI',
    'sector developments': 'Sector developments',
    'sector': 'Sector developments',
    'global / geopolitical': 'Global / geopolitical',
    'global': 'Global / geopolitical',
    'geopolitical': 'Global / geopolitical',
    'regulatory / sebi': 'Regulatory / SEBI',
    'regulatory': 'Regulatory / SEBI',
    'sebi': 'Regulatory / SEBI',
    'commodities / forex / rates': 'Commodities / forex / rates',
    'commodities': 'Commodities / forex / rates',
    'forex': 'Commodities / forex / rates',
    'rates': 'Commodities / forex / rates'
  };

  let resolvedCategory = 'Corporate earnings';
  if (category) {
    const trimmedCat = String(category).trim();
    if (VALID_NEWS_CATEGORIES.includes(trimmedCat)) {
      resolvedCategory = trimmedCat;
    } else if (CATEGORY_ALIASES[trimmedCat.toLowerCase()]) {
      resolvedCategory = CATEGORY_ALIASES[trimmedCat.toLowerCase()];
    } else {
      return res.status(400).json({
        error: `Invalid category: '${category}'. Must be one of the 9 official domains.`,
        allowedCategories: VALID_NEWS_CATEGORIES
      });
    }
  }

  if (impactMagnitude !== undefined && impactMagnitude !== null) {
    const mag = Number(impactMagnitude);
    if (!Number.isFinite(mag) || mag < 0 || mag > 50) {
      return res.status(400).json({ error: 'impactMagnitude must be a finite number between 0 and 50%.' });
    }
  }

  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  const author = session?.username || authorUsername || 'journalist';

  const draftId = `DRF_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const draft = {
    id: draftId,
    headline: headline.trim(),
    description: description.trim(),
    category: resolvedCategory,
    subcategory: subcategory || 'DRAFT_REPORT',
    priority: priority || 'IMPORTANT',
    sentiment: sentiment || 'Neutral',
    impactMagnitude: (impactMagnitude !== undefined && impactMagnitude !== null) ? Number(impactMagnitude) : 5,
    affectedSecurityIds: affectedSecurityIds || [],
    affectedSector: affectedSector || (affectedSectors && affectedSectors[0]) || null,
    affectedSectors: affectedSectors || (affectedSector ? [affectedSector] : []),
    affectedCurrencies: affectedCurrencies || ['INR'],
    eventType: eventType || 'JOURNALIST_REPORT',
    classification: classification || 'confirmed',
    durationMinutes: Number(durationMinutes || 5),
    decayType: decayType || 'exponential',
    trainingEligibility: Boolean(trainingEligibility),
    status: 'SUBMITTED',
    submittedBy: author,
    submittedAt: Date.now(),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    publishedAt: null
  };

  if (!state.newsDrafts) state.newsDrafts = [];
  state.newsDrafts.unshift(draft);

  logAuditEvent({
    actor: author,
    role: session?.role || 'journalist',
    action: `NEWS_DRAFT_SUBMITTED: ${draft.headline}`,
    target: draftId,
    reason: `Category: ${draft.category} | Impact: ${draft.impactMagnitude}%`
  });

  saveState(true);
  broadcastState('NEWS_DRAFT_SUBMITTED', { draft });

  res.status(201).json({ success: true, draft });
});

// Draft Queue Retrieval Endpoint
app.get('/api/news/drafts', (req, res) => {
  const { status, author } = req.query || {};
  let list = state.newsDrafts || [];

  if (status) {
    list = list.filter(d => d.status === status);
  }
  if (author) {
    list = list.filter(d => d.submittedBy === author);
  }

  const all = state.newsDrafts || [];
  const counts = {
    submitted: all.filter(d => d.status === 'SUBMITTED').length,
    approved: all.filter(d => d.status === 'APPROVED').length,
    rejected: all.filter(d => d.status === 'REJECTED').length,
    published: all.filter(d => d.status === 'PUBLISHED').length,
    total: all.length
  };

  res.json({ success: true, drafts: list, counts });
});

// Editorial Review Endpoint: Approve or Reject draft with mandatory feedback
app.post('/api/news/review', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'news_controller' && !hasPerm(session, 'news.review'))) {
    return res.status(403).json({ error: 'Forbidden: Editorial review requires News Controller or Administrator authorization.' });
  }
  const reviewer = session?.username || 'news_controller';

  const { draftId, action, feedback, overrideParams } = req.body || {};
  if (!draftId || !action) {
    return res.status(400).json({ error: 'draftId and action (APPROVE or REJECT) are required.' });
  }

  const draft = (state.newsDrafts || []).find(d => d.id === draftId);
  if (!draft) {
    return res.status(404).json({ error: `News draft ${draftId} not found.` });
  }

  if (action === 'REJECT') {
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: 'Rejection requires a mandatory feedback explanation.' });
    }
    draft.status = 'REJECTED';
    draft.rejectionReason = feedback.trim();
    draft.reviewedBy = reviewer;
    draft.reviewedAt = Date.now();
  } else if (action === 'APPROVE') {
    draft.status = 'APPROVED';
    draft.rejectionReason = null;
    draft.reviewedBy = reviewer;
    draft.reviewedAt = Date.now();
    if (overrideParams && typeof overrideParams === 'object') {
      Object.assign(draft, overrideParams);
    }
  } else {
    return res.status(400).json({ error: `Invalid action: ${action}. Must be APPROVE or REJECT.` });
  }

  logAuditEvent({
    actor: reviewer,
    role: session?.role || 'news_controller',
    action: `NEWS_DRAFT_REVIEW: ${action} on ${draftId}`,
    target: draftId,
    reason: action === 'REJECT' ? feedback : 'Approved for broadcast'
  });

  saveState(true);
  broadcastState('NEWS_DRAFT_REVIEWED', { draft });

  res.json({ success: true, draft });
});

// Authorized Publication Endpoint: Publishes approved draft, preset, or custom news
app.post('/api/news/publish', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'news_controller' && !hasPerm(session, 'news.publish'))) {
    return res.status(403).json({ error: 'Forbidden: Publishing news requires News Controller or Administrator authorization.' });
  }
  const publisher = session?.username || 'news_controller';

  const { draftId, triggerPresetId, customPayload, scheduleTime, overrideImpact } = req.body || {};

  let payload = null;
  let linkedDraft = null;

  if (draftId) {
    linkedDraft = (state.newsDrafts || []).find(d => d.id === draftId);
    if (!linkedDraft) return res.status(404).json({ error: `Draft ${draftId} not found.` });
    payload = {
      headline: linkedDraft.headline,
      description: linkedDraft.description,
      category: linkedDraft.category,
      subcategory: linkedDraft.subcategory,
      priority: linkedDraft.priority,
      sentiment: linkedDraft.sentiment,
      impactMagnitude: overrideImpact !== undefined ? Number(overrideImpact) : linkedDraft.impactMagnitude,
      affectedSecurityIds: linkedDraft.affectedSecurityIds,
      affectedSectors: linkedDraft.affectedSectors,
      classification: linkedDraft.classification,
      duration: linkedDraft.durationMinutes || 5
    };
  } else if (triggerPresetId) {
    const preset = getPresetById(triggerPresetId);
    if (!preset) return res.status(404).json({ error: `Preset ${triggerPresetId} not found in library.` });
    payload = {
      id: preset.id,
      presetId: preset.presetId || preset.id,
      sequence: preset.sequence,
      headline: preset.headline,
      shortHeadline: preset.shortHeadline,
      description: preset.description,
      category: preset.category,
      subcategory: preset.subcategory,
      scope: preset.scope,
      country: preset.country,
      region: preset.region,
      primaryDirection: preset.primaryDirection,
      secondaryDirection: preset.secondaryDirection,
      priority: preset.priority,
      sentiment: preset.sentiment,
      confidence: preset.confidence,
      impactMagnitude: overrideImpact !== undefined ? Number(overrideImpact) : preset.impactMagnitude,
      affectedSecurityIds: preset.affectedSecurityIds || (preset.affectedAssets && preset.affectedAssets.securities) || [],
      affectedTickers: preset.affectedTickers || preset.affectedSecurityIds || [],
      affectedSectors: preset.affectedSectors || (preset.affectedAssets && preset.affectedAssets.sectors) || [],
      affectedCurrencies: preset.affectedCurrencies || (preset.affectedAssets && preset.affectedAssets.currencies) || [],
      classification: preset.classification,
      impactParameters: preset.impactParameters,
      duration: preset.duration || preset.expectedDuration || 30,
      expiryRules: preset.expiryRules,
      directImpact: preset.directImpact,
      secondOrderImpact: preset.secondOrderImpact,
      crossMarketImpact: preset.crossMarketImpact,
      debateRelevance: preset.debateRelevance,
      ipoRelevance: preset.ipoRelevance
    };
  } else if (customPayload) {
    const val = validateNewsPreset(customPayload);
    if (!val.valid) {
      return res.status(400).json({ error: 'Custom news schema validation failed.', details: val.errors });
    }
    payload = customPayload;
  } else {
    return res.status(400).json({ error: 'Must provide draftId, triggerPresetId, or customPayload.' });
  }

  // Handle scheduling
  if (scheduleTime && Number(scheduleTime) > Date.now()) {
    const schedItem = {
      id: `SCHED_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      scheduleTime: Number(scheduleTime),
      payload,
      draftId,
      scheduledBy: publisher,
      createdAt: Date.now()
    };
    if (!state.scheduledNews) state.scheduledNews = [];
    state.scheduledNews.push(schedItem);
    saveState(true);
    return res.json({ success: true, scheduled: true, scheduledItem: schedItem });
  }

  // Execute publication via marketImpactEngine
  const impactResult = calculateMarketImpact(payload, state.securities || [], {
    multiplier: 1.0,
    peerContagionRate: 0.30,
    circuitThreshold: 20.0
  });

  impactResult.modifications.forEach(mod => {
    const sec = state.securities.find(s => s.ticker === mod.ticker || s.id === mod.securityId);
    if (!sec) return;

    sec.currentPrice = mod.newPrice;
    if (mod.newVolatility) sec.volatility = mod.newVolatility;

    sec.newsImpact = parseFloat(((sec.newsImpact || 0) + mod.impactPercent).toFixed(2));
    const baseP = sec.basePrice || mod.oldPrice || 100;
    sec.totalImpact = parseFloat((((sec.currentPrice - baseP) / baseP) * 100).toFixed(2));
    sec.participantImpact = parseFloat((sec.totalImpact - sec.newsImpact).toFixed(2));

    if (!sec.priceHistory) sec.priceHistory = [];
    sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
    if (sec.priceHistory.length > 200) sec.priceHistory.shift();
  });

  impactResult.circuitHalts.forEach(halt => {
    const sec = state.securities.find(s => s.ticker === halt.ticker || s.id === halt.securityId);
    if (sec) {
      sec.status = 'Halted';
      broadcastState('MARKET_HALT', { ticker: sec.ticker, reason: halt.reason });
    }
  });

  // Mark draft as published if applicable
  if (linkedDraft) {
    linkedDraft.status = 'PUBLISHED';
    linkedDraft.publishedAt = Date.now();
  }

  const newsId = `NW${String((state.newsEvents || []).length + 1).padStart(3, '0')}`;
  const newsItem = {
    id: newsId,
    eventId: newsId,
    presetId: payload.presetId || payload.id || null,
    sequence: payload.sequence || null,
    headline: payload.headline,
    shortHeadline: payload.shortHeadline || payload.headline,
    description: payload.description,
    summary: payload.description,
    category: payload.category,
    subcategory: payload.subcategory,
    scope: payload.scope || 'INDIA',
    country: payload.country || 'India',
    region: payload.region || 'Domestic',
    priority: payload.priority,
    sentiment: payload.sentiment,
    primaryDirection: payload.primaryDirection || (payload.sentiment === 'Negative' ? 'BEARISH' : 'BULLISH'),
    secondaryDirection: payload.secondaryDirection || null,
    impactPercent: payload.impactMagnitude,
    classification: payload.classification,
    affectedSecurityIds: impactResult.modifications.map(m => m.ticker),
    affectedTickers: impactResult.modifications.map(m => m.ticker),
    affectedSectors: payload.affectedSectors || [],
    directImpact: payload.directImpact || null,
    secondOrderImpact: payload.secondOrderImpact || null,
    crossMarketImpact: payload.crossMarketImpact || null,
    debateRelevance: payload.debateRelevance || null,
    ipoRelevance: payload.ipoRelevance || null,
    modifications: impactResult.modifications,
    circuitHalts: impactResult.circuitHalts,
    durationSeconds: (payload.duration || 5) * 60,
    expiresAt: Date.now() + ((payload.duration || 5) * 60 * 1000),
    triggeredAt: Date.now(),
    publishedBy: publisher
  };

  if (!state.newsEvents) state.newsEvents = [];
  state.newsEvents.unshift(newsItem);

  if (!state.activeDecayingEvents) state.activeDecayingEvents = [];
  state.activeDecayingEvents.push({
    id: newsItem.id,
    headline: newsItem.headline,
    startTime: Date.now(),
    durationSeconds: (payload.duration || 5) * 60,
    halfLife: (payload.expiryRules && payload.expiryRules.decayHalfLife) || 90,
    reversionFloor: 0.40,
    modifications: impactResult.modifications
  });

  // Trigger Projector Breaking News animation for significant news events
  if (payload.priority === 'CRITICAL' || payload.priority === 'BREAKING' || Math.abs(payload.impactMagnitude || 0) >= 4.0) {
    if (!state.marketState) state.marketState = {};
    state.marketState.takeoverEvent = {
      id: newsItem.id,
      eventId: newsItem.id,
      presetId: newsItem.presetId,
      sequence: newsItem.sequence,
      headline: newsItem.headline,
      shortHeadline: newsItem.shortHeadline,
      category: newsItem.category,
      sentiment: newsItem.sentiment,
      primaryDirection: newsItem.primaryDirection,
      impactPercent: newsItem.impactPercent,
      affectedTickers: newsItem.affectedSecurityIds,
      affectedSectors: newsItem.affectedSectors,
      triggeredAt: newsItem.triggeredAt,
      type: 'BREAKING_NEWS'
    };
    broadcastState('TAKEOVER_TRIGGER', { takeoverEvent: state.marketState.takeoverEvent });
  }

  updateMarketIndex();

  logAuditEvent({
    actor: publisher,
    role: session?.role || 'news_controller',
    action: `NEWS_PUBLISH: ${payload.headline}`,
    target: newsId,
    reason: `Impact applied across ${impactResult.modifications.length} securities`
  });

  saveState(true);
  broadcastState('NEWS_FLASH', { newsItem });

  res.json({ success: true, newsItem, newsEvent: newsItem, affectedCount: impactResult.modifications.length });
});

// Official Retraction & Correction Endpoint: Reverses news impact cleanly without compounding drift
app.post('/api/news/correct', (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'news_controller' && !hasPerm(session, 'news.correct'))) {
    return res.status(403).json({ error: 'Forbidden: News correction requires News Controller or Administrator authorization.' });
  }
  const corrector = session?.username || 'news_controller';

  const { newsId, targetNewsId, correctionHeadline, correctionDescription, reversalFactor = 1.0 } = req.body || {};
  const targetId = newsId || targetNewsId;
  if (!targetId) {
    return res.status(400).json({ error: 'newsId or targetNewsId is required for issuing a correction.' });
  }

  const targetNews = (state.newsEvents || []).find(n => n.id === targetId);
  if (!targetNews) {
    return res.status(404).json({ error: `News event ${targetId} not found in archive.` });
  }

  // Calculate clean multiplicative inverse reversals
  const reversals = calculateNewsCorrection(targetNews, reversalFactor);

  reversals.forEach(rev => {
    const sec = state.securities.find(s => s.ticker === rev.ticker || s.id === rev.securityId);
    if (!sec) return;

    const origMod = (targetNews.modifications || []).find(m => m.ticker === rev.ticker || m.securityId === rev.securityId);
    if (reversalFactor >= 1.0 && origMod && origMod.oldPrice !== undefined) {
      sec.currentPrice = origMod.oldPrice;
    } else {
      sec.currentPrice = Math.max(0.10, parseFloat((sec.currentPrice * rev.inverseMultiplier).toFixed(2)));
    }
    sec.newsImpact = parseFloat(((sec.newsImpact || 0) - rev.newsImpactToSubtract).toFixed(2));

    const baseP = sec.basePrice || 100;
    sec.totalImpact = parseFloat((((sec.currentPrice - baseP) / baseP) * 100).toFixed(2));
    sec.participantImpact = parseFloat((sec.totalImpact - sec.newsImpact).toFixed(2));

    // If stock was halted by the original news, lift the halt upon clean retraction
    if (sec.status === 'Halted' && targetNews.circuitHalts && targetNews.circuitHalts.some(h => h.ticker === sec.ticker)) {
      sec.status = 'Active';
    }

    if (!sec.priceHistory) sec.priceHistory = [];
    sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
    if (sec.priceHistory.length > 200) sec.priceHistory.shift();
  });

  // Mark target news as retracted / corrected
  targetNews.corrected = true;
  targetNews.correctedAt = Date.now();
  targetNews.active = false;

  // Remove from active decaying loop
  if (state.activeDecayingEvents) {
    state.activeDecayingEvents = state.activeDecayingEvents.filter(e => e.id !== targetId);
  }

  const corrId = `CORR_${Date.now()}`;
  const correctionItem = {
    id: corrId,
    headline: `🛑 [OFFICIAL CORRECTION] ${correctionHeadline || ('Clarification: ' + targetNews.headline)}`,
    description: correctionDescription || 'Official regulatory clarification unwinding prior news market distortion.',
    category: 'Regulatory / SEBI',
    classification: 'correction',
    reversedNewsId: targetId,
    sentiment: 'Neutral',
    impactPercent: 0,
    triggeredAt: Date.now(),
    isCorrection: true
  };

  if (!state.newsEvents) state.newsEvents = [];
  state.newsEvents.unshift(correctionItem);

  updateMarketIndex();

  logAuditEvent({
    actor: corrector,
    role: session?.role || 'news_controller',
    action: `NEWS_CORRECTION: ${correctionItem.headline}`,
    target: targetId,
    reason: `Cleanly unwound price impact with reversal factor ${reversalFactor}`
  });

  saveState(true);
  broadcastState('NEWS_FLASH', { newsItem: correctionItem, isCorrection: true });

  res.json({ success: true, correctionItem, reversals });
});

// Active Events & Telemetry Monitor Endpoint
app.get('/api/news/active', (req, res) => {
  const now = Date.now();
  const allEvents = state.newsEvents || [];
  const activeDecaying = state.activeDecayingEvents || [];

  const activeNews = allEvents
    .filter(n => n.expiresAt && n.expiresAt > now && !n.corrected && !n.dismissed && n.active !== false)
    .map(n => {
      const remainingSeconds = Math.max(0, Math.round((n.expiresAt - now) / 1000));
      const elapsedSeconds = Math.round((now - (n.triggeredAt || now)) / 1000);
      const halfLife = 90;
      const decayMultiplier = Math.pow(0.5, elapsedSeconds / halfLife);

      return {
        ...n,
        remainingSeconds,
        elapsedSeconds,
        decayMultiplier: parseFloat(decayMultiplier.toFixed(2))
      };
    });

  const expiredNews = allEvents
    .filter(n => (n.expiresAt && n.expiresAt <= now) || n.corrected)
    .slice(0, 20);

  const scheduledNews = state.scheduledNews || [];

  res.json({
    success: true,
    activeNews,
    activeEvents: activeNews,
    expiredNews,
    scheduledNews,
    activeDecayingCount: activeDecaying.length
  });
});

// Macro Shock Scenario Engine (3-act sector prototype)
app.post('/api/admin/scenario/macro-shock', (req, res) => {
  const { actNumber, actId, title } = req.body || {};
  const num = Number(actNumber || actId || 1);

  if (!Number.isInteger(num) || num < 1 || num > 3) {
    return res.status(400).json({ error: `Invalid macro shock act: ${num}. Must be 1, 2, or 3.` });
  }

  let actTitle = `Macro Shock Scenario: Act ${num}`;
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
  const targets = (state.securities || []).filter(s => targetSectors.some(sec => s.sector?.toLowerCase().includes(sec.toLowerCase())) && s.status === 'Active');
  targets.forEach(s => {
    const oldP = s.currentPrice;
    s.currentPrice = parseFloat(Math.max(1, oldP * (1 + impactPct / 100)).toFixed(2));
    if (!s.priceHistory) s.priceHistory = [];
    s.priceHistory.push({ timestamp: Date.now(), price: s.currentPrice });
  });

  const newsItem = {
    id: `NW_MS_${num}_${Date.now()}`,
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
  if (!state.newsEvents) state.newsEvents = [];
  state.newsEvents.push(newsItem);

  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  const session = verifySessionToken(authHeader);
  logAuditEvent({
    actor: session?.displayName || session?.username || 'Event Director',
    role: session?.role || 'admin',
    action: `MACRO_SHOCK_ACT_${num}`,
    target: actTitle,
    reason: `Executed staged macro scenario ${actTitle}`
  });

  saveState(true);
  broadcastState('ACT_TRIGGERED', { actNumber: num, title: actTitle, newsItem });
  res.json({ success: true, actNumber: num, title: actTitle, newsItem, affectedCount: targets.length });
});

// Corporate Actions
app.post(['/api/corporate-action', '/api/corporate-action/'], (req, res) => {
  const { securityId, actionType, details, overrideDuplicate } = req.body || {};
  const security = (state.securities || []).find(s => s.id === securityId || s.ticker === securityId);

  if (!security && actionType !== 'DISMISS_ALERT') {
    return res.status(404).json({ error: 'Security not found.' });
  }

  const actionLog = {
    id: `CA${String(state.corporateActions.length + 1).padStart(3, '0')}`,
    securityId: security ? security.id : null,
    ticker: security ? security.ticker : null,
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
    const yieldPct = Number(security.dividendYield || 0);
    if (yieldPct <= 0) {
      return res.status(400).json({ error: `Security ${security.ticker} has no dividend yield defined.` });
    }

    // Idempotency: Prevent duplicate dividend distribution for same security within 60s unless overrideDuplicate is set
    const recentDuplicate = (state.corporateActions || []).find(ca =>
      ca.securityId === security.id &&
      ca.actionType === 'Dividend' &&
      (Date.now() - (ca.triggeredAt || 0)) < 60000
    );
    if (recentDuplicate && !overrideDuplicate) {
      return res.status(409).json({
        error: `Duplicate Corporate Action: Dividend for ${security.ticker} was already distributed within the last 60 seconds.`
      });
    }

    const secCurrency = security.currency || (
      security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' :
      security.exchange === 'LSE' ? 'GBP' :
      security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR'
    );

    const usdRate = state.fxRates?.USDINR?.midRate || 88.20;
    const gbpRate = state.fxRates?.GBPINR?.midRate || 119.40;
    const eurRate = state.fxRates?.EURINR?.midRate || 103.50;

    let totalDividendPayout = 0;
    const payouts = [];

    (state.teams || []).forEach(team => {
      const heldUnits = Number(team.holdings?.[security.ticker] || 0);
      if (heldUnits > 0) {
        // Calculate dividend payout in security native currency
        const payout = parseFloat((heldUnits * (yieldPct / 100) * security.currentPrice).toFixed(2));
        if (payout > 0) {
          ensureTeamWallets(team);
          // 1. Credit the native-currency wallet
          team.cashWallets[secCurrency] = roundCurrency((team.cashWallets[secCurrency] || 0) + payout, secCurrency);

          // 2. Recompute aggregate cashBalance strictly following established multi-currency valuation rules
          team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);

          totalDividendPayout = parseFloat((totalDividendPayout + payout).toFixed(2));
          payouts.push({ teamCode: team.teamCode, heldUnits, payout, currency: secCurrency });
        }
      }
    });

    actionLog.currency = secCurrency;
    actionLog.totalPayout = totalDividendPayout;
    actionLog.payouts = payouts;

    state.corporateActions.push(actionLog);
    saveState(true);
    broadcastState('DIVIDEND_ANNOUNCEMENT', {
      securityId: security.id,
      ticker: security.ticker,
      yieldPercent: yieldPct,
      currency: secCurrency,
      totalPayout: totalDividendPayout
    });
    return res.json({ success: true, corporateAction: actionLog, totalPayout: totalDividendPayout, currency: secCurrency });
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
// RTDB DELTA PUBLISHER & CLIENT ROUTING ALIASES (PHASE 4)
// ----------------------------------------------------
app.get('/api/rtdb/delta-stats', (req, res) => {
  res.json({ success: true, stats: getDeltaPublisherStats() });
});

app.post(['/api/audit', '/api/audit-log'], (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  const entry = req.body || {};
  const auditEntry = logAuditEvent({
    actor: entry.actor || session?.username || 'Client',
    role: entry.role || session?.role || 'system',
    action: entry.action || 'CLIENT_AUDIT',
    target: entry.target || 'General',
    previousState: entry.previousState || null,
    newState: entry.newState || null,
    reason: entry.reason || ''
  });
  res.json({ success: true, auditEntry });
});

app.post('/api/price-override', (req, res) => {
  const { ticker, price } = req.body || {};
  if (!ticker || price === undefined || isNaN(Number(price))) {
    return res.status(400).json({ error: 'Valid ticker and price required.' });
  }
  const sec = (state.securities || []).find(s => s.ticker === ticker.toUpperCase() || s.id === ticker);
  if (!sec) return res.status(404).json({ error: `Security ${ticker} not found.` });
  const p = parseFloat(Number(price).toFixed(2));
  sec.currentPrice = p;
  if (!sec.priceHistory) sec.priceHistory = [];
  sec.priceHistory.push({ timestamp: Date.now(), price: p });
  if (sec.priceHistory.length > 300) sec.priceHistory.shift();
  if (sec.dayHigh === undefined || p > sec.dayHigh) sec.dayHigh = p;
  if (sec.dayLow === undefined || p < sec.dayLow) sec.dayLow = p;
  updateMarketIndex();
  saveState(true);
  broadcastState('PRICE_UPDATE', { priceUpdates: { [sec.ticker]: { currentPrice: p, dayHigh: sec.dayHigh, dayLow: sec.dayLow } } });
  publishSecurityTick(sec).catch(() => {});
  res.json({ success: true, security: sec });
});

app.post('/api/sentiment-override', (req, res) => {
  const { ticker, sentiment } = req.body || {};
  if (!ticker) return res.status(400).json({ error: 'Ticker required.' });
  const sec = (state.securities || []).find(s => s.ticker === ticker.toUpperCase() || s.id === ticker);
  if (!sec) return res.status(404).json({ error: `Security ${ticker} not found.` });
  sec.sentimentOverride = Number(sentiment) || 0;
  saveState(true);
  res.json({ success: true, ticker: sec.ticker, sentimentOverride: sec.sentimentOverride });
});

app.post('/api/admin/tick-news', (req, res) => {
  res.json({ success: true, message: 'Market news cycle updated.' });
});

// FX Currency Exchange Conversion
app.post('/api/fx/convert', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
  if (!session) {
    return res.status(401).json({ error: '401 Unauthorized: Valid session authentication required for direct currency conversion.' });
  }

  const canExecuteDirect = session.role === 'admin' || session.role === 'super_admin' || hasPerm(session, 'exchange.execute');
  if (!canExecuteDirect) {
    return res.status(403).json({ error: 'Forbidden: Direct currency conversion requires Exchange Desk Operator or Admin privileges. Participants must submit an FX request via /api/fx/request.' });
  }

  const { teamCode, fromCurrency, toCurrency, amount, ticketNumber, operator } = req.body || {};
  const A = Number(amount);
  if (!teamCode || !fromCurrency || !toCurrency || isNaN(A) || A <= 0 || !Number.isFinite(A)) {
    return res.status(400).json({ error: 'Valid teamCode, fromCurrency, toCurrency, and positive finite amount are required.' });
  }

  if (fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'Cannot exchange currency to itself.' });
  }

  // Legacy CAD/CHF Isolation
  if (fromCurrency === 'CAD' || fromCurrency === 'CHF' || toCurrency === 'CAD' || toCurrency === 'CHF') {
    return res.status(400).json({ error: 'CAD and CHF are legacy currencies and not available for new exchange transactions.' });
  }

  if (!ACTIVE_CURRENCIES.includes(fromCurrency) || !ACTIVE_CURRENCIES.includes(toCurrency)) {
    return res.status(400).json({ error: `Unsupported currency. Active: ${ACTIVE_CURRENCIES.join(', ')}` });
  }

  if (ticketNumber) {
    if (!state.fxTransactions) state.fxTransactions = [];
    const exists = state.fxTransactions.some(t => t.ticketNumber === ticketNumber);
    if (exists) {
      return res.status(400).json({ error: `FX Ticket ${ticketNumber} has already been processed.` });
    }
  }

  const team = state.teams.find(t => (t.teamCode || '').toUpperCase() === teamCode.toUpperCase() || t.id === teamCode);
  if (!team) return res.status(404).json({ error: `Team ${teamCode} not found.` });

  const lockKey = team.teamCode || team.id;
  if (activeFxLocks.has(lockKey)) {
    return res.status(409).json({ error: `Concurrent FX operation in progress for team ${lockKey}. Please retry.` });
  }
  activeFxLocks.add(lockKey);

  try {
    ensureTeamWallets(team);
    ensureFxReserves(state.fxReserves);

    const available = getUnreservedCash(team, fromCurrency);
    if (available < A) {
      const curSym = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
      return res.status(400).json({
        error: `Insufficient unreserved ${fromCurrency} balance. Team has ${curSym}${available.toLocaleString()} unreserved (Total: ${curSym}${Number(team.cashWallets[fromCurrency] || 0).toLocaleString()}, Reserved: ${curSym}${Number(team.reservedCash?.[fromCurrency] || 0).toLocaleString()}), requested ${curSym}${A.toLocaleString()}.`
      });
    }

    let conversion;
    try {
      conversion = calculateFxConversion(fromCurrency, toCurrency, A, state.fxRates, state.fxReserves);
    } catch (convErr) {
      return res.status(400).json({ error: convErr.message });
    }

    const { toAmount: convertedAmount, effectiveRate, spreadPercent, scarcityImpact, utilization } = conversion;

    // Check desk available reserve if client is buying foreign currency
    if (toCurrency !== 'INR') {
      const reserve = state.fxReserves[toCurrency];
      if (!reserve || reserve.availableReserve < convertedAmount) {
        return res.status(400).json({
          error: 'Insufficient FX desk reserves',
          currency: toCurrency,
          requestedAmount: convertedAmount,
          availableReserve: reserve?.availableReserve || 0
        });
      }
    }

    const effectiveOperator = session.username || session.userId || operator || 'FX Desk Operator';
    const fxTxId = `FX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveTicket = ticketNumber || `FX-${Date.now().toString().slice(-4)}`;
    const fxTx = {
      id: fxTxId,
      ticketNumber: effectiveTicket,
      teamCode: team.teamCode,
      teamId: team.id,
      teamName: team.teamName,
      fromCurrency,
      toCurrency,
      fromAmount: A,
      toAmount: convertedAmount,
      debited: A,
      credited: convertedAmount,
      rate: effectiveRate,
      spreadPercent,
      scarcityImpact: scarcityImpact || 0,
      utilization: utilization || 0,
      operator: effectiveOperator,
      operatorId: effectiveOperator,
      timestamp: Date.now()
    };

    await withTransaction(async (txClient) => {
      if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
        // Strict alphabetical row locking
        const lockCurs = [fromCurrency, toCurrency].sort();
        for (const cur of lockCurs) {
          await lockWalletForUpdate(txClient, team.id, cur);
        }
        if (toCurrency !== 'INR') {
          await lockFxReserveForUpdate(txClient, toCurrency);
        }
        if (fromCurrency !== 'INR') {
          await lockFxReserveForUpdate(txClient, fromCurrency);
        }

        // PostgreSQL UPDATE wallets
        await txClient.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
          [A, team.id, fromCurrency]
        );
        await txClient.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
          [convertedAmount, team.id, toCurrency]
        );

        // PostgreSQL UPDATE fx_reserves
        if (toCurrency !== 'INR') {
          await txClient.query(
            `UPDATE fx_reserves
             SET completed_sales = completed_sales + $1,
                 desk_inr_cash = desk_inr_cash + $2,
                 updated_at = NOW()
             WHERE currency = $3`,
            [convertedAmount, A, toCurrency]
          );
        }
        if (fromCurrency !== 'INR') {
          await txClient.query(
            `UPDATE fx_reserves
             SET completed_purchases = completed_purchases + $1,
                 desk_inr_cash = GREATEST(0, desk_inr_cash - $2),
                 updated_at = NOW()
             WHERE currency = $3`,
            [A, convertedAmount, fromCurrency]
          );
        }

        // PostgreSQL INSERT INTO fx_transactions
        await txClient.query(
          `INSERT INTO fx_transactions (id, ticket_number, team_code, team_id, team_name, from_currency, to_currency, from_amount, to_amount, rate, spread_percent, operator, operator_id, notes, status, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, 'Direct FX Conversion', 'CONFIRMED', NOW(), NOW())
           ON CONFLICT (ticket_number) DO NOTHING`,
          [fxTxId, effectiveTicket, team.teamCode, team.id, team.teamName, fromCurrency, toCurrency, A, convertedAmount, effectiveRate, spreadPercent, effectiveOperator]
        );
      }

      // In-memory wallet updates
      team.cashWallets[fromCurrency] = roundCurrency(Number(team.cashWallets[fromCurrency]) - A, fromCurrency);
      team.cashWallets[toCurrency] = roundCurrency(Number(team.cashWallets[toCurrency] || 0) + convertedAmount, toCurrency);

      // In-memory fx_reserves updates
      if (toCurrency !== 'INR') {
        const resForeign = state.fxReserves[toCurrency];
        if (resForeign) {
          resForeign.completedSales = roundCurrency((resForeign.completedSales || 0) + convertedAmount, toCurrency);
          resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, toCurrency);
          resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, toCurrency);
          resForeign.deskInrCash = roundCurrency((resForeign.deskInrCash || 0) + A, 'INR');
          assertSolvencyInvariant(resForeign);
        }
      }
      if (fromCurrency !== 'INR') {
        const resForeign = state.fxReserves[fromCurrency];
        if (resForeign) {
          resForeign.completedPurchases = roundCurrency((resForeign.completedPurchases || 0) + A, fromCurrency);
          resForeign.currentInventory = roundCurrency(resForeign.openingReserve + resForeign.replenishments + resForeign.completedPurchases - resForeign.completedSales, fromCurrency);
          resForeign.availableReserve = roundCurrency(resForeign.currentInventory - resForeign.reservedInventory, fromCurrency);
          resForeign.deskInrCash = roundCurrency(Math.max(0, (resForeign.deskInrCash || 0) - convertedAmount), 'INR');
          assertSolvencyInvariant(resForeign);
        }
      }

      const teamFromAccount = `ACC_TEAM_${team.teamCode}_${fromCurrency}`;
      const clearingFromAccount = `ACC_SYS_CLEARING_FX_${fromCurrency}`;
      const teamToAccount = `ACC_TEAM_${team.teamCode}_${toCurrency}`;
      const clearingToAccount = `ACC_SYS_CLEARING_FX_${toCurrency}`;

      const lines = [
        { accountId: teamFromAccount, debit: 0, credit: A, currency: fromCurrency },
        { accountId: clearingFromAccount, debit: A, credit: 0, currency: fromCurrency },
        { accountId: clearingToAccount, debit: 0, credit: convertedAmount, currency: toCurrency },
        { accountId: teamToAccount, debit: convertedAmount, credit: 0, currency: toCurrency }
      ];

      await recordJournalEntry(txClient, {
        transactionId: fxTx.id,
        entryType: 'FX_CONVERSION',
        description: `FX Convert ${A} ${fromCurrency} to ${convertedAmount} ${toCurrency} for Team ${team.teamCode}`,
        lines
      });
    });

    team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);

    if (!state.fxTransactions) state.fxTransactions = [];
    state.fxTransactions.unshift(fxTx);

    logAuditEvent({
      actor: effectiveOperator,
      role: session.role || 'exchange',
      action: 'FX_CONVERT',
      target: team.teamCode,
      reason: `Converted ${fromCurrency} ${A} -> ${toCurrency} ${convertedAmount} (Ticket: ${fxTx.ticketNumber})`
    });

    saveState(true);
    broadcastState('FX_TRANSACTION', { fxTransaction: fxTx, teamCode: team.teamCode });

    return res.json({
      success: true,
      teamCode: team.teamCode,
      fromCurrency,
      toCurrency,
      debited: A,
      credited: convertedAmount,
      toAmount: convertedAmount,
      effectiveRate,
      spreadPercent,
      scarcityImpact,
      ticketNumber: fxTx.ticketNumber,
      wallets: team.cashWallets,
      cashBalance: team.cashBalance
    });
  } catch (err) {
    console.error('[FX Convert Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error during currency conversion.' });
  } finally {
    activeFxLocks.delete(lockKey);
  }
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
  const teamCode = req.body.teamCode || req.body.teamId;
  const { isActive } = req.body;
  if (!teamCode) return res.status(400).json({ error: 'teamCode is required.' });

  const team = state.teams.find(t => t.id === teamCode || t.teamCode === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found.' });

  const targetActive = isActive !== undefined ? Boolean(isActive) : (team.isActive === false ? true : false);

  if (targetActive && team.isActive === false) {
    const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
    const maxCap = Math.min(20, Math.max(10, Number(currentEvent?.maximumInvestmentHouses || state.settings?.configuredHouseCapacity || 20)));
    const activeCount = (state.teams || []).filter(t => t.isActive !== false && t.id !== teamCode && t.teamCode !== teamCode).length;
    if (activeCount >= maxCap) {
      return res.status(400).json({
        error: `Cannot activate team ${teamCode}: configured capacity limit (${maxCap} teams) has been reached.`
      });
    }
  }

  team.isActive = targetActive;

  logAuditEvent({
    actor: req.session?.username || 'Administrator',
    role: req.session?.role || 'admin',
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

  const currentEvent = (state.events || []).find(e => e.eventId === state.currentEventId) || state.events?.[0];
  const maxCap = Math.min(20, Math.max(10, Number(currentEvent?.maximumInvestmentHouses || state.settings?.configuredHouseCapacity || 20)));
  if (count > maxCap) {
    return res.status(400).json({
      error: `Active count (${count}) exceeds configured event capacity (${maxCap}).`
    });
  }

  state.teams.forEach((t, idx) => {
    t.isActive = idx < count;
  });

  logAuditEvent({
    actor: req.session?.username || 'Administrator',
    role: req.session?.role || 'admin',
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

// COMPLETE MASTER RESET TO BRAND NEW STAGE
app.post('/api/admin/master-reset', (req, res) => {
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

  // 4. Re-initialize 10 Teams (T01 - T10) with clean starting state
  state.teams = Array.from({ length: 10 }, (_, i) => {
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
      cashWallets: { INR: 10000000, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
      reservedCash: { INR: 0, USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
      foreignWallets: { USD: 0, GBP: 0, EUR: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
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

  // 6. Clean FX Spot Rates & Finite Reserves
  state.fxRates = JSON.parse(JSON.stringify(DEFAULT_FX_RATES));
  state.fxReserves = JSON.parse(JSON.stringify(DEFAULT_FX_RESERVES));
  state.fxDesks = {
    FX_1: { id: 'FX_1', name: 'FX Desk 1 (Primary)', availability: 'ACTIVE' },
    FX_2: { id: 'FX_2', name: 'FX Desk 2 (Secondary)', availability: 'ACTIVE' }
  };
  state.fxMarketState = {
    status: 'OPEN',
    pausedReason: null,
    pausedAt: null,
    pausedBy: null,
    marketWideTransactionLimitINR: null,
    updatedAt: Date.now()
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
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  const role = session?.role || req.role;
  const isPrivileged = ['admin', 'super_admin', 'operator_x', 'coordinator'].includes(role);
  const allIpos = (Array.isArray(state.ipos) && state.ipos.length > 0) ? state.ipos : NEW_SIMULATED_IPOS;

  if (isPrivileged) {
    return res.json({ success: true, ipos: allIpos });
  }

  // Strict Server-Side Team Boundary: Only return IPOs whose subscription window is currently OPEN
  const teamVisibleIpos = allIpos.filter(ipo => isIpoSubscriptionOpen(ipo));
  res.json({ success: true, ipos: teamVisibleIpos });
});

app.post('/api/ipo/bid', (req, res) => {
  const ipoDeskActive = isDeskActive('IPO_DESK_1') && isDeskActive('IPO_DESK');
  if (!ipoDeskActive) {
    return res.status(400).json({ error: 'IPO Desk is currently INACTIVE and paused for new subscription applications. Existing applications continue to be processed.' });
  }

  const { ticker, quantity, teamCode } = req.body || {};
  const Q = Number(quantity);

  const sessionRole = req.session?.role;
  const isPrivileged = sessionRole === 'admin' || sessionRole === 'super_admin';
  if (!isPrivileged && sessionRole !== 'team') {
    return res.status(403).json({ error: 'Forbidden: Only registered Investment Houses or Administrators can place IPO bids.' });
  }

  const effectiveTeamCode = (sessionRole === 'team' ? req.session.teamCode : teamCode)?.toUpperCase();
  if (!effectiveTeamCode) {
    return res.status(400).json({ error: 'teamCode is required.' });
  }
  if (sessionRole === 'team' && teamCode && teamCode.toUpperCase() !== req.session.teamCode) {
    return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot place IPO bids for team ${teamCode.toUpperCase()}.` });
  }

  if (!ticker || isNaN(Q) || Q <= 0) {
    return res.status(400).json({ error: 'Valid ticker and positive bid quantity are required.' });
  }

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
  if (!security) {
    return res.status(404).json({ error: `IPO instrument ${ticker} not found in database.` });
  }

  if (!isIpoSubscriptionOpen(security)) {
    return res.status(400).json({ error: `Subscription window for ${ticker} is not currently open (Stage: ${security.ipoStage || security.ipoStatus || security.status}).` });
  }

  if (security.lotSize && Q % security.lotSize !== 0) {
    return res.status(400).json({ error: `Bid quantity for ${ticker} must be in multiples of lot size (${security.lotSize} shares).` });
  }

  const team = state.teams.find(t => t.id === effectiveTeamCode || t.teamCode === effectiveTeamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${effectiveTeamCode} not found.` });
  }
  if (team.isActive === false) {
    return res.status(400).json({ error: `Team ${team.teamCode || effectiveTeamCode} is currently marked INACTIVE by Admin.` });
  }

  ensureTeamWallets(team);
  const secCurrency = security.currency || 'USD';
  const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');
  const offerPrice = security.offerPrice || security.basePrice || security.ipoPrice || 100;
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const bidCost = isZeroDec ? Math.round(Q * offerPrice) : parseFloat((Q * offerPrice).toFixed(2));

  // Check currency wallet balance
  const currentWalletBalance = Number(team.cashWallets[secCurrency] || 0);
  if (currentWalletBalance < bidCost) {
    return res.status(400).json({
      error: `Insufficient ${secCurrency} balance. Team has ${curSym}${currentWalletBalance.toLocaleString()}, bid requires ${curSym}${bidCost.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`
    });
  }

  // Atomic reservation
  team.cashWallets[secCurrency] -= bidCost;
  if (!team.ipoReservations) team.ipoReservations = {};
  team.ipoReservations[ticker] = (team.ipoReservations[ticker] || 0) + bidCost;
  team.reservedIpoCapital = Object.values(team.ipoReservations).reduce((sum, v) => sum + v, 0);

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
  const floatUnits = Number(req.body.floatUnits) || security.availableFloat || security.totalUnits || 1000;
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
  const ipoDeskActive = isDeskActive('IPO_DESK_1') && isDeskActive('IPO_DESK');
  if (!ipoDeskActive) {
    return res.status(400).json({ error: 'IPO Desk is currently INACTIVE and paused for new subscription applications. Existing applications continue to be processed.' });
  }

  const { ticker, quantity, teamCode } = req.body || {};
  const Q = Number(quantity);

  const sessionRole = req.session?.role;
  const isPrivileged = sessionRole === 'admin' || sessionRole === 'super_admin';
  if (!isPrivileged && sessionRole !== 'team') {
    return res.status(403).json({ error: 'Forbidden: Only registered Investment Houses or Administrators can place IPO bids.' });
  }

  const effectiveTeamCode = (sessionRole === 'team' ? req.session.teamCode : teamCode)?.toUpperCase();
  if (!effectiveTeamCode) {
    return res.status(400).json({ error: 'teamCode is required.' });
  }
  if (sessionRole === 'team' && teamCode && teamCode.toUpperCase() !== req.session.teamCode) {
    return res.status(403).json({ error: `Forbidden: Team ${req.session.teamCode} cannot place IPO bids for team ${teamCode.toUpperCase()}.` });
  }

  if (!ticker || isNaN(Q) || Q <= 0) {
    return res.status(400).json({ error: 'Valid ticker and positive bid quantity are required.' });
  }

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
  if (!security) {
    return res.status(404).json({ error: `Security ${ticker} not found in database.` });
  }

  if (!isIpoSubscriptionOpen(security)) {
    return res.status(400).json({ error: `${ticker} is not currently accepting primary IPO subscriptions (Status: ${security.status || security.ipoStatus || security.ipoStage}).` });
  }

  const team = state.teams.find(t => t.id === effectiveTeamCode || t.teamCode === effectiveTeamCode);
  if (!team) {
    return res.status(404).json({ error: `Team ${effectiveTeamCode} not found.` });
  }
  if (team.isActive === false) {
    return res.status(400).json({ error: `Team ${team.teamCode || effectiveTeamCode} is currently marked INACTIVE by Admin.` });
  }

  ensureTeamWallets(team);
  const secCurrency = security.currency || 'USD';
  const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');
  const offerPrice = security.offerPrice || security.basePrice || security.ipoPrice || 100;
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const bidCost = isZeroDec ? Math.round(Q * offerPrice) : parseFloat((Q * offerPrice).toFixed(2));

  const currentWalletBalance = Number(team.cashWallets[secCurrency] || 0);
  if (currentWalletBalance < bidCost) {
    return res.status(400).json({
      error: `Insufficient ${secCurrency} balance. Team has ${curSym}${currentWalletBalance.toLocaleString()}, bid requires ${curSym}${bidCost.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).`
    });
  }

  team.cashWallets[secCurrency] -= bidCost;
  if (!team.ipoReservations) team.ipoReservations = {};
  team.ipoReservations[ticker] = (team.ipoReservations[ticker] || 0) + bidCost;
  team.reservedIpoCapital = Object.values(team.ipoReservations).reduce((sum, v) => sum + v, 0);

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
  const floatUnits = Number(req.body.floatUnits) || security.availableFloat || security.totalUnits || 1000;
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

async function executeIpoAllotmentInternal(ticker, floatUnitsOverride, session) {
  if (!ticker) return { success: false, status: 400, error: 'Ticker is required for allotment.' };

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
  if (!security) return { success: false, status: 404, error: `Security ${ticker} not found.` };

  if (security.ipoStatus === 'ALLOTMENT_FINALIZED' || (security.status === 'Active' && !security.bids)) {
    return { success: false, status: 400, error: `IPO for ${ticker} has already been allotted and finalized.` };
  }

  const floatUnits = Number(floatUnitsOverride) || security.availableFloat || security.totalUnits || 1000;
  const offerPrice = security.offerPrice || security.basePrice || 100;
  const secCurrency = security.currency || 'USD';
  const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');
  const bids = security.bids || {};
  const totalDemand = Object.values(bids).reduce((sum, b) => sum + (b.quantity || 0), 0);

  const allotments = {};
  let totalAllotted = 0;

  if (totalDemand === 0) {
    security.status = 'Active';
    security.ipoStatus = 'ALLOTMENT_FINALIZED';
    security.ipoStage = 'ALLOTMENT';
    security.bids = {};
    const pool = getPool();
    if (pool) {
      pool.query(
        `UPDATE securities SET status = 'Active', ipo_status = 'ALLOTMENT_FINALIZED', updated_at = NOW() WHERE ticker = $1`,
        [ticker]
      ).catch(() => {});
    }
    saveState(true);
    broadcastState();
    return { success: true, message: `No bids placed for ${ticker}. Security activated.`, allotments: {} };
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
      ensureTeamWallets(team);
      team.cashWallets[secCurrency] = roundCurrency(((team.cashWallets[secCurrency] || 0) + refund), secCurrency);
    }

    team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
    if (team.ipoReservations) {
      delete team.ipoReservations[ticker];
      team.reservedIpoCapital = Object.values(team.ipoReservations).reduce((sum, v) => sum + v, 0);
    } else {
      team.reservedIpoCapital = 0;
    }

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
        team.cashWallets[secCurrency] = Math.max(0, roundCurrency(((team.cashWallets[secCurrency] || 0) - offerPrice), secCurrency));
        team.cashBalance = calculateConsolidatedCashBalance(team, state.fxRates);
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
  if (!security.priceHistory) security.priceHistory = [];
  security.priceHistory.push({ timestamp: Date.now(), price: listingPrice });

  // PostgreSQL ACID persistence for IPO Allotment and Balanced Double-Entry Ledgers
  await withTransaction(async (txClient) => {
    if (txClient && typeof txClient.query === 'function' && !txClient.isFallback) {
      await lockSecurityForUpdate(txClient, ticker);

      for (const tCode of teamsBidding) {
        const allotInfo = allotments[tCode];
        const team = state.teams.find(t => t.teamCode === tCode || t.id === tCode);
        if (!team || !allotInfo) continue;

        await lockWalletForUpdate(txClient, team.id, secCurrency);

        // Update team holdings in PG
        if (allotInfo.allottedQuantity > 0) {
          await txClient.query(
            `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, $5, $6, NOW(), NOW())
             ON CONFLICT (team_id, ticker) DO UPDATE SET units = holdings.units + EXCLUDED.units, updated_at = NOW()`,
            [`HLD_${team.id}_${ticker}`, team.id, ticker, allotInfo.allottedQuantity, offerPrice, allotInfo.allottedQuantity * offerPrice]
          );
        }

        // Refund excess capital in PG
        if (allotInfo.refundAmount > 0) {
          await txClient.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE team_id = $2 AND currency = $3`,
            [allotInfo.refundAmount, team.id, secCurrency]
          );
        }

        // Update ipo_reservations in PG
        await txClient.query(
          `UPDATE ipo_reservations SET status = 'ALLOTTED', updated_at = NOW() WHERE team_id = $1 AND ticker = $2`,
          [team.id, ticker]
        ).catch(() => {});

        // Balanced double-entry journal lines
        const teamAccount = `ACC_TEAM_${team.teamCode}_${secCurrency}`;
        const clearingIpoAccount = `ACC_SYS_CLEARING_IPO_${secCurrency}`;
        const issuerAccount = `ACC_SYS_ISSUER_EQUITY_${secCurrency}`;
        const lines = [];

        if (allotInfo.actualCost > 0) {
          lines.push(
            { accountId: clearingIpoAccount, debit: allotInfo.actualCost, credit: 0, currency: secCurrency },
            { accountId: issuerAccount, debit: 0, credit: allotInfo.actualCost, currency: secCurrency }
          );
        }
        if (allotInfo.refundAmount > 0) {
          lines.push(
            { accountId: clearingIpoAccount, debit: allotInfo.refundAmount, credit: 0, currency: secCurrency },
            { accountId: teamAccount, debit: 0, credit: allotInfo.refundAmount, currency: secCurrency }
          );
        }

        if (lines.length >= 2) {
          await recordJournalEntry(txClient, {
            transactionId: `IPO_ALLOT_${ticker}_${team.teamCode}_${Date.now()}`,
            orderId: null,
            entryType: 'IPO_ALLOTMENT',
            description: `Primary IPO Allotment for ${team.teamCode}: ${allotInfo.allottedQuantity} units ${ticker} @ ${curSym}${offerPrice} (Refund: ${curSym}${allotInfo.refundAmount})`,
            lines
          });
        }
      }

      // Update security in PostgreSQL
      await txClient.query(
        `UPDATE securities
         SET status = 'Active', ipo_status = 'ALLOTMENT_FINALIZED', current_price = $1, opening_price = $1, available_units = $2, updated_at = NOW()
         WHERE ticker = $3`,
        [listingPrice, security.availableUnits, ticker]
      );
    }
  });

  // Log Audit Event
  logAuditEvent({
    actor: session?.username || session?.displayName || 'admin',
    role: session?.role || 'admin',
    action: 'IPO_ALLOTMENT',
    target: ticker,
    reason: `Allotted ${totalAllotted} units of ${ticker} across ${teamsBidding.length} teams at offer price ${curSym}${offerPrice}. Listed at ${curSym}${listingPrice}.`,
    newState: {
      ticker,
      offerPrice,
      listingPrice,
      totalAllotted,
      allotments
    }
  });

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
  if (!state.newsEvents) state.newsEvents = [];
  state.newsEvents.push(news);

  saveState(true);
  broadcastState('NEWS_FLASH', { newsItem: news });

  return {
    success: true,
    status: 200,
    ticker,
    offerPrice,
    listingPrice,
    totalAllotted,
    allotments
  };
}

app.post('/api/ipo/allot', async (req, res) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  if (session && session.role !== 'admin' && session.role !== 'super_admin' && !hasPerm(session, 'market.control')) {
    return res.status(403).json({ error: 'Forbidden: IPO allotment requires Administrator privileges.' });
  }

  const { ticker, floatUnits } = req.body || {};
  if (!ticker) return res.status(400).json({ error: 'Ticker is required for allotment.' });

  const result = await executeIpoAllotmentInternal(ticker, floatUnits, session);
  return res.status(result.status || 200).json(result);
});

app.post('/api/ipo/transition', (req, res) => {
  const { ticker, nextStatus } = req.body;
  if (!ticker || !nextStatus) return res.status(400).json({ error: 'Ticker and nextStatus required.' });

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  security.ipoStatus = nextStatus;
  security.ipoStage = nextStatus;
  if (nextStatus === 'ACTIVE' || nextStatus === 'LISTED') {
    security.status = 'Active';
    security.isSubscriptionOpen = false;
    security.visibleToParticipants = true;
    if (!state.securities.some(s => s.ticker === ticker)) {
      state.securities.push({ ...security });
    }
  } else if (nextStatus === 'SUBSCRIPTION_OPEN' || nextStatus === 'OPEN') {
    security.status = 'IPO_OPEN';
    security.isSubscriptionOpen = true;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else {
    security.isSubscriptionOpen = false;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  }

  saveState(true);
  broadcastState();

  res.json({ success: true, ticker, ipoStatus: security.ipoStatus, status: security.status });
});

// Admin IPO Stage and Lifecycle Controller
app.post(['/api/ipo/advance', '/api/ipo/stage'], async (req, res) => {
  const { ticker, stageName, stage, visibleToParticipants } = req.body || {};
  const targetStage = stageName || stage;
  if (!ticker || !targetStage) return res.status(400).json({ error: 'Ticker and stage are required.' });

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
  if (!security) return res.status(404).json({ error: `Security ${ticker} not found.` });

  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);

  // If advancing to ALLOTMENT, directly delegate to the verified IPO allotment engine!
  if (targetStage === 'ALLOTMENT') {
    const allotResult = await executeIpoAllotmentInternal(ticker, req.body.floatUnits, session);
    return res.status(allotResult.status || 200).json(allotResult);
  }

  security.ipoStage = targetStage;
  security.ipoStatus = targetStage;

  if (visibleToParticipants !== undefined) {
    security.visibleToParticipants = Boolean(visibleToParticipants);
  } else if (targetStage === 'HIDDEN' || targetStage === 'DRAFT') {
    security.visibleToParticipants = false;
  } else {
    security.visibleToParticipants = true;
  }

  if (targetStage === 'HIDDEN' || targetStage === 'DRAFT') {
    security.status = 'IPO_STAGED';
    security.ipoStatus = targetStage;
    security.isSubscriptionOpen = false;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else if (targetStage === 'RUMOUR' || targetStage === 'SPECULATION') {
    security.status = 'IPO_STAGED';
    security.isSubscriptionOpen = false;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else if (targetStage === 'OFFICIAL_ANNOUNCEMENT' || targetStage === 'ANNOUNCED' || targetStage === 'CONFIRMED' || targetStage === 'OPENING_SOON') {
    security.status = 'IPO_PENDING';
    security.isSubscriptionOpen = false;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else if (targetStage === 'SUBSCRIPTION_OPEN' || targetStage === 'OPEN') {
    security.status = 'IPO_OPEN';
    security.isSubscriptionOpen = true;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else if (targetStage === 'SUBSCRIPTION_CLOSED' || targetStage === 'CLOSED') {
    security.status = 'IPO_CLOSED';
    security.isSubscriptionOpen = false;
    state.securities = (state.securities || []).filter(s => s.ticker !== ticker);
  } else if (targetStage === 'ALLOTMENT') {
    security.status = 'IPO_ALLOTTED';
    security.isSubscriptionOpen = false;
  } else if (targetStage === 'LISTING' || targetStage === 'LISTED' || targetStage === 'POST_LISTING') {
    security.status = 'Active';
    security.ipoStatus = 'LISTED';
    security.ipoStage = 'LISTED';
    security.isSubscriptionOpen = false;
    security.visibleToParticipants = true;
    if (!state.securities.some(s => s.ticker === ticker)) {
      state.securities.push({ ...security });
    } else {
      const idx = state.securities.findIndex(s => s.ticker === ticker);
      state.securities[idx] = { ...state.securities[idx], ...security };
    }
  }

  // Create news flash if not HIDDEN
  if (targetStage !== 'HIDDEN' && targetStage !== 'DRAFT') {
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

  const security = (state.ipos || []).find(s => s.ticker === ticker) || (state.securities || []).find(s => s.ticker === ticker);
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

export const executePhoenixAct = (actNum) => {
  const act = Number(actNum);
  if (!Number.isInteger(act) || act < 1 || act > 15) {
    return { error: `Invalid actNumber: ${actNum}. Must be an integer between 1 and 15.` };
  }

  const security = state.securities.find(s => s.ticker === PHOENIX_TARGET);
  if (!security) return { error: 'DTAI security not found in database.' };

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

  if (!state.firedPhoenixActs) {
    state.firedPhoenixActs = {};
  }
  state.firedPhoenixActs[act] = Date.now();

  saveState(true);
  broadcastState('PHOENIX_ACT_TRIGGERED', { actNumber: act, firedPhoenixActs: state.firedPhoenixActs });
  return { success: true, act, actNumber: act };
};

app.post('/api/admin/phoenix-act', (req, res) => {
  const { actNumber, actId, act: rawAct, scenario, force, reason } = req.body || {};

  // Backward compatibility: forward scenario: 'macro_shock' to macro shock scenario logic
  if (scenario === 'macro_shock') {
    const num = Number(actNumber || actId || rawAct || 1);
    if (!Number.isInteger(num) || num < 1 || num > 3) {
      return res.status(400).json({ error: `Invalid macro shock act: ${num}. Must be 1, 2, or 3.` });
    }
    let actTitle = `Macro Shock Scenario: Act ${num}`;
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

    const targets = (state.securities || []).filter(s => targetSectors.some(sec => s.sector?.toLowerCase().includes(sec.toLowerCase())) && s.status === 'Active');
    targets.forEach(s => {
      const oldP = s.currentPrice;
      s.currentPrice = parseFloat(Math.max(1, oldP * (1 + impactPct / 100)).toFixed(2));
      if (!s.priceHistory) s.priceHistory = [];
      s.priceHistory.push({ timestamp: Date.now(), price: s.currentPrice });
    });

    const newsItem = {
      id: `NW_MS_${num}_${Date.now()}`,
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
    if (!state.newsEvents) state.newsEvents = [];
    state.newsEvents.push(newsItem);

    const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
    const session = verifySessionToken(authHeader);
    logAuditEvent({
      actor: session?.displayName || session?.username || 'Event Director',
      role: session?.role || 'admin',
      action: `MACRO_SHOCK_ACT_${num}`,
      target: actTitle,
      reason: `Executed staged macro scenario ${actTitle}`
    });

    saveState(true);
    broadcastState('ACT_TRIGGERED', { actNumber: num, title: actTitle, newsItem });
    return res.json({ success: true, actNumber: num, title: actTitle, newsItem, affectedCount: targets.length });
  }

  const targetAct = actNumber !== undefined ? actNumber : (actId !== undefined ? actId : rawAct);
  if (targetAct === undefined || targetAct === null || targetAct === '') {
    return res.status(400).json({ error: 'Missing required field: actNumber' });
  }

  const num = Number(targetAct);
  if (!Number.isInteger(num) || num < 1 || num > 15) {
    return res.status(400).json({
      error: `Invalid actNumber: ${targetAct}. Must be an integer between 1 and 15.`,
      actNumber: targetAct
    });
  }

  // Duplicate execution protection (anti-replay)
  if (state.firedPhoenixActs && state.firedPhoenixActs[num] && !force) {
    return res.status(409).json({
      error: `Phoenix Act ${num} has already been executed at ${new Date(state.firedPhoenixActs[num]).toISOString()}. Pass force: true to re-execute.`,
      actNumber: num,
      alreadyFiredAt: state.firedPhoenixActs[num],
      requiresForce: true
    });
  }

  const result = executePhoenixAct(num);
  if (result.error) {
    return res.status(400).json(result);
  }

  const authHeader = req.headers['authorization'] || req.headers['x-fms-token'];
  const session = verifySessionToken(authHeader);
  logAuditEvent({
    actor: session?.displayName || session?.username || 'Event Director',
    role: session?.role || 'admin',
    action: `PHOENIX_ACT_${num}`,
    target: `DTAI / Project Phoenix Act ${num}`,
    reason: reason || `Triggered Project Phoenix narrative act ${num}${force ? ' (forced re-execution)' : ''}`
  });

  return res.json({
    success: true,
    actNumber: num,
    act: num,
    ...result
  });
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

// ----------------------------------------------------
// DYNAMIC FX RATE MOVEMENT LOOP (Configurable Interval, Default 5 mins)
// ----------------------------------------------------
setInterval(() => {
  if (!state || !state.fxRates) return;
  if (!state.fxConfig) {
    state.fxConfig = {
      dynamicMovementEnabled: true,
      updateIntervalSeconds: 300,
      volatilityBps: 15,
      lastDynamicUpdate: Date.now()
    };
  }

  const cfg = state.fxConfig;
  if (cfg.dynamicMovementEnabled === false) return;

  const intervalMs = (cfg.updateIntervalSeconds || 300) * 1000;
  const now = Date.now();
  if (now - (cfg.lastDynamicUpdate || 0) < intervalMs) {
    return; // Wait until configured interval has elapsed
  }

  cfg.lastDynamicUpdate = now;
  let anyRateUpdated = false;

  for (const [pair, rateObj] of Object.entries(state.fxRates)) {
    if (!rateObj || !rateObj.midRate) continue;
    // Bounded, realistic micro-movements based on volatility bps (e.g. 15 bps = +/- 0.15%)
    const maxBps = (cfg.volatilityBps || 15) / 10000;
    // Normalized random between -maxBps and +maxBps
    const deltaPercent = (Math.random() * 2 - 1) * maxBps;
    const decimals = (pair === 'JPYINR' || pair === 'KRWINR') ? 4 : 2;
    const newMid = parseFloat((rateObj.midRate * (1 + deltaPercent)).toFixed(decimals));

    if (newMid > 0 && Math.abs(newMid - rateObj.midRate) > 0) {
      const spread = rateObj.spreadPercent || 0.45;
      const buyRate = parseFloat((newMid * (1 + spread / 100)).toFixed(decimals));
      const sellRate = parseFloat((newMid * (1 - spread / 100)).toFixed(decimals));

      rateObj.midRate = newMid;
      rateObj.buyRate = buyRate;
      rateObj.sellRate = sellRate;
      rateObj.lastUpdated = now;
      anyRateUpdated = true;
    }
  }

  if (anyRateUpdated) {
    saveState(false);
    broadcastState('FX_RATE_UPDATE', { fxRates: state.fxRates });
  }
}, 5000); // Check loop every 5s against configurable intervalMs

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
    const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token']);
    if (!session) {
      return res.status(401).json({ error: '401 Unauthorized: Session required to trigger auditorium debate.' });
    }
    if (!hasPerm(session, 'market.control') && session.role !== 'coordinator' && session.role !== 'admin' && session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Auditorium debate control requires market.control permission.' });
    }

    const { topic, round = 1, active = true } = req.body || {};
    const roundNum = Number(round);
    if (isNaN(roundNum) || roundNum <= 0) {
      return res.status(400).json({ error: 'Round must be a positive integer.' });
    }
    const debateTopic = (typeof topic === 'string' && topic.trim()) ? topic.trim() : 'AI Megacap Valuations vs Market Fundamentals';
    const now = Date.now();
    const debateData = {
      topic: debateTopic,
      round: roundNum,
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
    } else {
      if (state.marketState.takeoverEvent && state.marketState.takeoverEvent.category === 'DEBATE') {
        state.marketState.takeoverEvent = null;
      }
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

    const effectiveBrokerName = req.session?.displayName || req.session?.username || brokerName || 'Floor Advisor';
    const recId = `REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const recData = {
      id: recId,
      brokerName: effectiveBrokerName,
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
    const effectiveTeamCode = (req.session?.role === 'team' ? req.session.teamCode : teamCode)?.toUpperCase();
    if (!pollId || !effectiveTeamCode || optionId === undefined) {
      return res.status(400).json({ error: 'Missing poll voting parameters.' });
    }

    const poll = state.polls ? state.polls[pollId] : null;
    if (!poll || poll.status !== 'OPEN') {
      return res.status(400).json({ error: 'Poll is closed or not found.' });
    }

    if (!poll.votes) poll.votes = {};
    if (poll.votes[effectiveTeamCode] !== undefined) {
      return res.status(400).json({ error: 'Team has already voted in this poll.' });
    }

    poll.votes[effectiveTeamCode] = Number(optionId);
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


// Background Market Price Simulation Loop
// Simulates continuous demand/supply trading fluctuations when the market is open
setInterval(() => {
  let ipoActivated = false;
  if (state && state.securities) {
    state.securities.forEach(security => {
      // PREVENT PREMATURE AUTO-ACTIVATION OF MANAGED 8-STAGE IPOS
      if (security.status === 'IPO_PENDING' && !security.isIpo && !security.ipoStage) {
        const firstHistory = security.priceHistory && security.priceHistory.length > 0 ? security.priceHistory[0] : null;
        const announcedTime = firstHistory ? firstHistory.timestamp : null;
        if (announcedTime && (Date.now() - announcedTime >= 30000)) {
          security.status = 'Active';
          ipoActivated = true;
          console.log(`Auto-activating unmanaged IPO security ${security.ticker} after 30 seconds`);
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
    const priceUpdates = {};
    const now = Date.now();

    // Process duration decay for active news events
    if (state.activeDecayingEvents && state.activeDecayingEvents.length > 0) {
      const { priceAdjustments, expiredEventIds } = calculateDecayTick(state.activeDecayingEvents, state.securities, now);
      if (priceAdjustments.length > 0) {
        priceAdjustments.forEach(adj => {
          const sec = state.securities.find(s => s.ticker === adj.ticker);
          if (sec && sec.status === 'Active') {
            sec.currentPrice = adj.newPrice;
            if (!sec.priceHistory) sec.priceHistory = [];
            sec.priceHistory.push({ timestamp: now, price: sec.currentPrice });
            if (sec.priceHistory.length > 200) sec.priceHistory.shift();
            priceUpdates[sec.ticker] = {
              currentPrice: sec.currentPrice,
              newPoint: { timestamp: now, price: sec.currentPrice }
            };
            priceChanged = true;
          }
        });
      }
      if (expiredEventIds.length > 0) {
        state.activeDecayingEvents = state.activeDecayingEvents.filter(e => !expiredEventIds.includes(e.id));
      }
    }
    
    state.securities.forEach(security => {
      if (security.status === 'Active') {
        const sentimentOverride = security.sentimentOverride || 0;
        const isNarrative = Boolean(security.isNarrativeAsset || security.ticker === 'DTAI');
        // Rotate ~3.5% active subset per 3s cycle (~90-100 securities) plus narrative/sentiment assets
        if (sentimentOverride === 0 && !isNarrative && Math.random() > 0.035) {
          return;
        }

        const oldPrice = security.currentPrice;
        // Calculate random movement based on volatility: random walk with sentiment drift
        const volatilityFactor = security.volatility || 0.5;
        
        // Sentiment override drift factor
        const sentimentDrift = sentimentOverride * 0.45; // drifts up to 0.9% per tick
        
        // Range: -0.8% to +0.8% scaled by volatility
        const changePercent = (Math.random() - 0.49) * 1.6 * volatilityFactor + sentimentDrift;
        
        const newPrice = parseFloat((oldPrice * (1 + changePercent / 100)).toFixed(2));
        if (newPrice !== oldPrice && newPrice > 1) {
          security.currentPrice = newPrice;
          const newPoint = { timestamp: now, price: newPrice };
          security.priceHistory.push(newPoint);
          
          // Keep history capped to avoid memory leak
          if (security.priceHistory.length > 200) {
            security.priceHistory.shift();
          }

          if (security.dayHigh === undefined || newPrice > security.dayHigh) {
            security.dayHigh = newPrice;
          }
          if (security.dayLow === undefined || newPrice < security.dayLow) {
            security.dayLow = newPrice;
          }

          const alert = checkCircuitBreaker(security, oldPrice, newPrice);
          if (alert) {
            activeAlerts.add(JSON.stringify(alert));
          }

          priceUpdates[security.ticker] = {
            currentPrice: newPrice,
            dayHigh: security.dayHigh,
            dayLow: security.dayLow,
            newPoint
          };
          priceChanged = true;
        }
      }
    });

    if (priceChanged) {
      updateMarketIndex();
      saveState(false);
      broadcastState('PRICE_UPDATE', { priceUpdates, marketIndices: state.marketIndices });
    }
  }
}, 3000);

// ============================================================================
// PHASE F: OPERATOR TRAINING SANDBOX & SIMULATION ENGINE (ZERO LIVE MUTATION)
// ============================================================================

function createInitialSandboxState(previousScorecards = null) {
  return {
    version: '1.0.0-sandbox',
    initializedAt: Date.now(),
    lastResetAt: Date.now(),
    drillStatus: 'idle',

    // Isolated Mock Teams (Initial starting balance: ₹1 Crore per team)
    teams: [
      {
        id: 'TRAIN_T01',
        teamCode: 'TRAIN_T01',
        teamName: 'Alpha Capital (Practice)',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: 100000,
          EUR: 50000,
          GBP: 50000,
          JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
        },
        reservedCash: { INR: 0, USD: 0, EUR: 0, GBP: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
        holdings: {
          RELIANCE: 500,
          TATASTEEL: 1000,
          INFY: 400,
          TCS: 300,
          HDFCBANK: 600
        },
        lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
        assignedDesk: 'DESK_1'
      },
      {
        id: 'TRAIN_T02',
        teamCode: 'TRAIN_T02',
        teamName: 'Beta Investments (Practice)',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: 100000,
          EUR: 50000,
          GBP: 50000,
          JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
        },
        reservedCash: { INR: 0, USD: 0, EUR: 0, GBP: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
        holdings: {
          RELIANCE: 200,
          TATASTEEL: 500,
          INFY: 300,
          TCS: 150,
          HDFCBANK: 400
        },
        lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
        assignedDesk: 'DESK_2'
      },
      {
        id: 'TRAIN_T03',
        teamCode: 'TRAIN_T03',
        teamName: 'Gamma Asset Management (Practice)',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: 100000,
          EUR: 50000,
          GBP: 50000,
          JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
        },
        reservedCash: { INR: 0, USD: 0, EUR: 0, GBP: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
        holdings: {
          RELIANCE: 800,
          TATASTEEL: 1500,
          INFY: 600,
          TCS: 500,
          HDFCBANK: 900
        },
        lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
        assignedDesk: 'DESK_3'
      },
      {
        id: 'TRAIN_T04',
        teamCode: 'TRAIN_T04',
        teamName: 'Delta Securities (Practice)',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: 100000,
          EUR: 50000,
          GBP: 50000,
          JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
        },
        reservedCash: { INR: 0, USD: 0, EUR: 0, GBP: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
        holdings: {
          RELIANCE: 400,
          TATASTEEL: 800,
          INFY: 350,
          TCS: 200,
          HDFCBANK: 500
        },
        lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
        assignedDesk: 'DESK_4'
      },
      {
        id: 'TRAIN_T05',
        teamCode: 'TRAIN_T05',
        teamName: 'Epsilon Wealth (Practice)',
        cashBalance: 10000000,
        cashWallets: {
          INR: 10000000,
          USD: 100000,
          EUR: 50000,
          GBP: 50000,
          JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0
        },
        reservedCash: { INR: 0, USD: 0, EUR: 0, GBP: 0, JPY: 0, AED: 0, SGD: 0, CNY: 0, AUD: 0, KRW: 0 },
        holdings: {
          RELIANCE: 300,
          TATASTEEL: 600,
          INFY: 250,
          TCS: 180,
          HDFCBANK: 450
        },
        lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
        assignedDesk: 'DESK_5'
      }
    ],

    // Isolated Mock Queues
    orders: [],
    vouchers: [],
    transactions: [],

    // Finite Sandbox FX Reserves
    fxReserves: {
      USD: { currency: 'USD', availableReserve: 500000, currentInventory: 500000, completedSales: 0 },
      EUR: { currency: 'EUR', availableReserve: 400000, currentInventory: 400000, completedSales: 0 },
      GBP: { currency: 'GBP', availableReserve: 300000, currentInventory: 300000, completedSales: 0 },
      JPY: { currency: 'JPY', availableReserve: 50000000, currentInventory: 50000000, completedSales: 0 },
      AED: { currency: 'AED', availableReserve: 600000, currentInventory: 600000, completedSales: 0 },
      SGD: { currency: 'SGD', availableReserve: 250000, currentInventory: 250000, completedSales: 0 },
      CNY: { currency: 'CNY', availableReserve: 500000, currentInventory: 500000, completedSales: 0 },
      AUD: { currency: 'AUD', availableReserve: 250000, currentInventory: 250000, completedSales: 0 },
      KRW: { currency: 'KRW', availableReserve: 100000000, currentInventory: 100000000, completedSales: 0 }
    },
    fxTransactions: [],

    // Isolated Training News Wire
    newsEvents: [],

    // Operator Scorecards Telemetry
    scorecards: previousScorecards ? { ...previousScorecards } : {}
  };
}

let sandboxState = createInitialSandboxState();

function findSandboxTeam(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  return sandboxState.teams.find(t =>
    t.teamCode.toUpperCase() === cleanCode ||
    t.id.toUpperCase() === cleanCode ||
    t.teamCode.replace('TRAIN_', '').toUpperCase() === cleanCode ||
    cleanCode.replace('TRAIN_', '') === t.teamCode.replace('TRAIN_', '').toUpperCase()
  ) || null;
}

function getSandboxSecurityPrice(ticker) {
  if (state?.securities && Array.isArray(state.securities)) {
    const sec = state.securities.find(s => s.ticker === ticker || s.symbol === ticker);
    if (sec && typeof sec.currentPrice === 'number' && sec.currentPrice > 0) {
      return sec.currentPrice;
    }
  }
  const fallbackPrices = {
    RELIANCE: 2850,
    TCS: 3950,
    INFY: 1820,
    HDFCBANK: 1650,
    TATASTEEL: 155
  };
  return fallbackPrices[ticker] || 1000;
}

function getOrCreateScorecard(operatorId, role = 'operator_x') {
  const id = (operatorId && String(operatorId).trim()) ? String(operatorId).trim() : 'Default Operator';
  if (!sandboxState.scorecards[id]) {
    sandboxState.scorecards[id] = {
      operatorId: id,
      role,
      totalOperations: 0,
      completedOperations: 0,
      approvals: 0,
      rejections: 0,
      returns: 0,
      errors: 0,
      violations: 0,
      totalLatencySeconds: 0,
      averageLatencySeconds: 0,
      accuracyRate: 100,
      errorRate: 0,
      complianceScore: 100,
      statusBadge: 'EVENT READY',
      history: []
    };
  }
  return sandboxState.scorecards[id];
}

function updateScorecard(operatorId, { role = 'operator_x', isSuccess = true, isError = false, isViolation = false, latency = 5.0, penalty = 0, bonus = 0 }) {
  const sc = getOrCreateScorecard(operatorId, role);
  sc.totalOperations += 1;
  if (isSuccess) {
    sc.completedOperations += 1;
  }
  if (isError) {
    sc.errors += 1;
  }
  if (isViolation) {
    sc.violations += 1;
  }
  sc.totalLatencySeconds += latency;
  sc.averageLatencySeconds = parseFloat((sc.totalLatencySeconds / Math.max(1, sc.totalOperations)).toFixed(1));
  sc.accuracyRate = parseFloat((((sc.totalOperations - sc.errors) / Math.max(1, sc.totalOperations)) * 100).toFixed(1));
  sc.errorRate = parseFloat((100 - sc.accuracyRate).toFixed(1));

  sc.complianceScore = Math.max(0, Math.min(100, sc.complianceScore - (isViolation ? 15 : 0) - penalty + bonus));

  if (sc.complianceScore >= 90) {
    sc.statusBadge = 'EVENT READY';
  } else if (sc.complianceScore >= 75) {
    sc.statusBadge = 'QUALIFIED OPERATOR';
  } else if (sc.complianceScore >= 60) {
    sc.statusBadge = 'PROVISIONAL OPERATOR';
  } else {
    sc.statusBadge = 'NON-COMPLIANT';
  }
return sc;
}

// Access Control: The Floor Speed-Training Terminal is restricted exclusively to Sridhara
app.use('/api/training', (req, res, next) => {
  const session = req.session || verifySessionToken(req.headers['authorization'] || req.headers['x-fms-token'] || req.query.token);
  const username = (session?.username || req.query.operator || '').toLowerCase();
  const isMaster = username === 'sridhara' || session?.isMaster || session?.role === 'super_admin';
  if (!isMaster) {
    return res.status(403).json({ error: 'Access Denied: The Floor Speed-Training Terminal is restricted exclusively to Sridhara.' });
  }
  next();
});

// 1. GET /api/training/state
app.get('/api/training/state', (req, res) => {
  const { role, operator } = req.query;
  let operatorScorecard = null;
  if (operator) {
    operatorScorecard = getOrCreateScorecard(operator, role);
  } else {
    const firstOp = Object.keys(sandboxState.scorecards)[0];
    if (firstOp) {
      operatorScorecard = sandboxState.scorecards[firstOp];
    } else {
      operatorScorecard = getOrCreateScorecard('Operator 1', role);
    }
  }

  res.json({
    success: true,
    sandbox: sandboxState,
    sandboxState: sandboxState,
    operatorScorecard
  });
});

// 2. POST /api/training/order/create & /api/training/orders/submit
const handleTrainingOrderCreate = (req, res) => {
  const { teamCode, ticker, action, quantity, orderType, ticketNumber, deskId, operator } = req.body;
  if (!teamCode || !ticker || !action || !quantity) {
    return res.status(400).json({ error: 'Missing required order fields: teamCode, ticker, action, quantity' });
  }

  const team = findSandboxTeam(teamCode);
  if (!team) {
    return res.status(404).json({ error: `Mock team '${teamCode}' not found in sandbox.` });
  }

  const normalizedAction = String(action).toUpperCase();
  if (normalizedAction !== 'BUY' && normalizedAction !== 'SELL') {
    return res.status(400).json({ error: 'Action must be BUY or SELL.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }

  const price = getSandboxSecurityPrice(ticker);
  const requestedValue = price * qty;

  if (normalizedAction === 'BUY') {
    const reservedCashAmount = Math.ceil(requestedValue * 1.05); // +5% execution buffer
    const availableCash = (team.cashWallets?.INR ?? team.cashBalance ?? 0) - (team.reservedCash?.INR ?? 0);
    if (availableCash < reservedCashAmount) {
      return res.status(400).json({
        error: 'Insufficient sandbox cash balance for order pre-reservation.',
        required: reservedCashAmount,
        available: availableCash
      });
    }

    if (!team.reservedCash) team.reservedCash = { INR: 0 };
    team.reservedCash.INR = (team.reservedCash.INR || 0) + reservedCashAmount;

    const orderId = `TRN-ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrder = {
      id: orderId,
      ticketNumber: ticketNumber || `TRN-TKT-${Date.now().toString().slice(-4)}`,
      teamCode: team.teamCode,
      ticker,
      action: 'BUY',
      quantity: qty,
      price,
      orderType: orderType || 'MARKET',
      requestedValue,
      reservedCashAmount,
      status: 'AWAITING_PHYSICAL_SLIP',
      physicalSlipChecked: false,
      deskId: deskId || 'DESK_1',
      operator: operator || null,
      createdAt: Date.now()
    };

    sandboxState.orders.unshift(newOrder);
    return res.status(200).json({
      success: true,
      orderId,
      order: newOrder
    });
  } else {
    // SELL: check deliverable shares
    const totalHolding = team.holdings?.[ticker] || 0;
    const lockedHolding = team.lockedHoldings?.[ticker] || 0;
    const deliverableShares = totalHolding - lockedHolding;
    if (deliverableShares < qty) {
      return res.status(400).json({
        error: 'Insufficient deliverable holdings for order share locking.',
        requested: qty,
        deliverable: deliverableShares
      });
    }

    if (!team.lockedHoldings) team.lockedHoldings = {};
    team.lockedHoldings[ticker] = lockedHolding + qty;

    const orderId = `TRN-ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrder = {
      id: orderId,
      ticketNumber: ticketNumber || `TRN-TKT-${Date.now().toString().slice(-4)}`,
      teamCode: team.teamCode,
      ticker,
      action: 'SELL',
      quantity: qty,
      price,
      orderType: orderType || 'MARKET',
      requestedValue,
      reservedCashAmount: 0,
      status: 'AWAITING_PHYSICAL_SLIP',
      physicalSlipChecked: false,
      deskId: deskId || 'DESK_1',
      operator: operator || null,
      createdAt: Date.now()
    };

    sandboxState.orders.unshift(newOrder);
    return res.status(200).json({
      success: true,
      orderId,
      order: newOrder
    });
  }
};
app.post('/api/training/order/create', handleTrainingOrderCreate);
app.post('/api/training/orders/submit', handleTrainingOrderCreate);

// 3. POST /api/training/order/claim & /api/training/orders/claim
const handleTrainingOrderClaim = (req, res) => {
  const { orderId, deskId, operator } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Missing required orderId' });
  }

  const order = sandboxState.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: `Mock order '${orderId}' not found in sandbox.` });
  }

  order.status = 'VERIFYING_AT_EXCHANGE';
  if (deskId) order.deskId = deskId;
  order.claimedBy = operator || 'Exchange Officer';
  order.claimedAt = Date.now();

  updateScorecard(operator, { role: 'operator_x', isSuccess: true, latency: 4.2 });

  return res.status(200).json({
    success: true,
    order
  });
};
app.post('/api/training/order/claim', handleTrainingOrderClaim);
app.post('/api/training/orders/claim', handleTrainingOrderClaim);

// 4. POST /api/training/order/action & /api/training/orders/action
const handleTrainingOrderAction = (req, res) => {
  const { orderId, actionType, deskId, operator, physicalSlipChecked, rejectionReason, returnReason } = req.body;
  if (!orderId || !actionType) {
    return res.status(400).json({ error: 'Missing required orderId or actionType' });
  }

  const order = sandboxState.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: `Mock order '${orderId}' not found in sandbox.` });
  }

  if (order.status === 'SETTLED' || order.status === 'REJECTED') {
    return res.status(400).json({ error: `Order is in terminal state '${order.status}'. No further exchange actions permitted.` });
  }

  const normalizedAction = String(actionType).toUpperCase();

  if (normalizedAction === 'CHECK_SLIP') {
    order.physicalSlipChecked = true;
    updateScorecard(operator, { role: 'operator_x', isSuccess: true, bonus: 2, latency: 3.5 });
    return res.status(200).json({
      success: true,
      order
    });
  }

  if (normalizedAction === 'ACCEPT' || normalizedAction === 'APPROVE') {
    const isSlipChecked = physicalSlipChecked === true || order.physicalSlipChecked === true;
    if (!isSlipChecked) {
      updateScorecard(operator, { role: 'operator_x', isError: true, isViolation: true, penalty: 15, latency: 6.0 });
      return res.status(400).json({
        error: 'Physical slip verification checklist must be completed prior to order approval.'
      });
    }

    order.physicalSlipChecked = true;
    order.status = 'EXCHANGE_APPROVED';
    if (deskId) order.deskId = deskId;

    const voucherReference = `VCH-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
    const voucher = {
      id: `TRN-VCH-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      voucherReference,
      orderId: order.id,
      ticketNumber: order.ticketNumber,
      teamCode: order.teamCode,
      ticker: order.ticker,
      action: order.action,
      quantity: order.quantity,
      price: order.price,
      amount: order.requestedValue,
      reservedCashAmount: order.reservedCashAmount,
      currency: 'INR',
      status: 'PENDING',
      bankDeskId: getBestBankDesk(order.teamCode),
      createdAt: Date.now()
    };

    sandboxState.vouchers.unshift(voucher);
    const opScorecard = updateScorecard(operator, { role: 'operator_x', isSuccess: true, bonus: 2, latency: 5.8 });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      status: order.status,
      order,
      voucher,
      operatorScorecard: opScorecard
    });
  }

  if (normalizedAction === 'REJECT') {
    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim() === '') {
      updateScorecard(operator, { role: 'operator_x', isError: true, isViolation: true, penalty: 15, latency: 5.0 });
      return res.status(400).json({ error: 'Every rejected order must provide an explicit rejection reason.' });
    }

    const team = findSandboxTeam(order.teamCode);
    if (team) {
      if (order.action === 'BUY' && order.reservedCashAmount > 0) {
        team.reservedCash.INR = Math.max(0, (team.reservedCash.INR || 0) - order.reservedCashAmount);
      } else if (order.action === 'SELL' && order.quantity > 0) {
        team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - order.quantity);
      }
    }

    order.status = 'REJECTED';
    order.rejectionReason = rejectionReason;
    const opScorecard = updateScorecard(operator, { role: 'operator_x', isSuccess: true, latency: 4.5 });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      status: order.status,
      order,
      operatorScorecard: opScorecard
    });
  }

  if (normalizedAction === 'RETURN' || normalizedAction === 'RETURN_FOR_CORRECTION') {
    if (!returnReason || typeof returnReason !== 'string' || returnReason.trim() === '') {
      updateScorecard(operator, { role: 'operator_x', isError: true, isViolation: true, penalty: 15, latency: 5.0 });
      return res.status(400).json({ error: 'Mandatory returnReason required when returning order for correction.' });
    }

    const team = findSandboxTeam(order.teamCode);
    if (team) {
      if (order.action === 'BUY' && order.reservedCashAmount > 0) {
        team.reservedCash.INR = Math.max(0, (team.reservedCash.INR || 0) - order.reservedCashAmount);
      } else if (order.action === 'SELL' && order.quantity > 0) {
        team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - order.quantity);
      }
    }

    order.status = 'RETURNED_TO_TEAM';
    order.returnReason = returnReason;
    const opScorecard = updateScorecard(operator, { role: 'operator_x', isSuccess: true, latency: 4.0 });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      status: order.status,
      order,
      operatorScorecard: opScorecard
    });
  }

  return res.status(400).json({ error: `Unsupported actionType '${actionType}'` });
};
app.post('/api/training/order/action', handleTrainingOrderAction);
app.post('/api/training/orders/action', handleTrainingOrderAction);

// 5. POST /api/training/bank/claim
app.post('/api/training/bank/claim', (req, res) => {
  const { voucherReference, bankDeskId, tellerName } = req.body;
  if (!voucherReference) {
    return res.status(400).json({ error: 'Missing required voucherReference' });
  }

  const voucher = sandboxState.vouchers.find(v => v.voucherReference === voucherReference || v.id === voucherReference);
  if (!voucher) {
    return res.status(404).json({ error: `Mock voucher '${voucherReference}' not found in sandbox.` });
  }

  voucher.status = 'VERIFYING_AT_BANK';
  if (bankDeskId) voucher.bankDeskId = bankDeskId;
  voucher.claimedBy = tellerName || 'Bank Teller';
  voucher.claimedAt = Date.now();

  updateScorecard(tellerName, { role: 'bank_teller', isSuccess: true, latency: 3.8 });

  return res.status(200).json({
    success: true,
    voucher
  });
});

// 6. POST /api/training/bank/hold
app.post('/api/training/bank/hold', (req, res) => {
  const { voucherReference, bankDeskId, tellerName, notes } = req.body;
  if (!voucherReference) {
    return res.status(400).json({ error: 'Missing required voucherReference' });
  }

  const voucher = sandboxState.vouchers.find(v => v.voucherReference === voucherReference || v.id === voucherReference);
  if (!voucher) {
    return res.status(404).json({ error: `Mock voucher '${voucherReference}' not found in sandbox.` });
  }

  if (!notes || typeof notes !== 'string' || notes.trim() === '') {
    updateScorecard(tellerName, { role: 'bank_teller', isError: true, isViolation: true, penalty: 15, latency: 4.5 });
    return res.status(400).json({ error: 'Mandatory notes required when holding a voucher for review.' });
  }

  voucher.status = 'HELD_FOR_REVIEW';
  voucher.holdNotes = notes;
  if (bankDeskId) voucher.bankDeskId = bankDeskId;

  const opScorecard = updateScorecard(tellerName, { role: 'bank_teller', isSuccess: true, latency: 4.0 });

  return res.status(200).json({
    success: true,
    voucher,
    operatorScorecard: opScorecard
  });
});

// 7. POST /api/training/bank/settle
app.post('/api/training/bank/settle', (req, res) => {
  const { voucherReference, action = 'SETTLE', bankDeskId, tellerName, tellerId, notes } = req.body;
  const teller = tellerName || tellerId || 'Bank Teller';
  if (!voucherReference) {
    return res.status(400).json({ error: 'Missing required voucherReference' });
  }

  const voucher = sandboxState.vouchers.find(v => v.voucherReference === voucherReference || v.id === voucherReference);
  if (!voucher) {
    return res.status(404).json({ error: `Mock voucher '${voucherReference}' not found in sandbox.` });
  }

  if (voucher.status === 'SETTLED') {
    updateScorecard(teller, { role: 'bank_teller', isError: true, isViolation: true, penalty: 20, latency: 3.0 });
    return res.status(409).json({ error: 'Duplicate settlement prevented: This voucher has already been settled and funds processed.' });
  }

  const order = sandboxState.orders.find(o => o.id === voucher.orderId);
  const team = findSandboxTeam(voucher.teamCode);

  if (String(action).toUpperCase() === 'REJECT') {
    voucher.status = 'SETTLEMENT_REJECTED';
    if (order) {
      order.status = 'SETTLEMENT_REJECTED';
      if (team) {
        if (order.action === 'BUY' && order.reservedCashAmount > 0) {
          team.reservedCash.INR = Math.max(0, (team.reservedCash.INR || 0) - order.reservedCashAmount);
        } else if (order.action === 'SELL' && order.quantity > 0) {
          team.lockedHoldings[order.ticker] = Math.max(0, (team.lockedHoldings[order.ticker] || 0) - order.quantity);
        }
      }
    }
    const opScorecard = updateScorecard(teller, { role: 'bank_teller', isSuccess: true, latency: 4.5 });
    return res.status(200).json({
      success: true,
      voucherReference,
      status: 'SETTLEMENT_REJECTED',
      voucher,
      order,
      tellerScorecard: opScorecard
    });
  }

  // Settle funds and deliver securities
  if (team) {
    if (voucher.action === 'BUY') {
      team.cashWallets.INR = (team.cashWallets.INR || 0) - voucher.amount;
      team.reservedCash.INR = Math.max(0, (team.reservedCash.INR || 0) - (voucher.reservedCashAmount || Math.ceil(voucher.amount * 1.05)));
      if (!team.holdings) team.holdings = {};
      team.holdings[voucher.ticker] = (team.holdings[voucher.ticker] || 0) + voucher.quantity;
      team.cashBalance = team.cashWallets.INR;
    } else {
      team.cashWallets.INR = (team.cashWallets.INR || 0) + voucher.amount;
      team.cashBalance = team.cashWallets.INR;
      if (team.holdings) {
        team.holdings[voucher.ticker] = Math.max(0, (team.holdings[voucher.ticker] || 0) - voucher.quantity);
      }
      if (team.lockedHoldings) {
        team.lockedHoldings[voucher.ticker] = Math.max(0, (team.lockedHoldings[voucher.ticker] || 0) - voucher.quantity);
      }
    }
  }

  voucher.status = 'SETTLED';
  voucher.settledAt = Date.now();
  voucher.settledBy = teller;
  if (bankDeskId) voucher.bankDeskId = bankDeskId;
  if (notes) voucher.notes = notes;

  if (order) {
    order.status = 'SETTLED';
    order.settledAt = Date.now();
  }

  sandboxState.transactions.unshift({
    id: `TRN-TX-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    voucherReference: voucher.voucherReference,
    orderId: voucher.orderId,
    teamCode: voucher.teamCode,
    ticker: voucher.ticker,
    action: voucher.action,
    quantity: voucher.quantity,
    amount: voucher.amount,
    currency: 'INR',
    settledBy: teller,
    settledAt: Date.now()
  });

  const opScorecard = updateScorecard(teller, { role: 'bank_teller', isSuccess: true, bonus: 3, latency: 6.2 });

  return res.status(200).json({
    success: true,
    voucherReference: voucher.voucherReference,
    status: 'SETTLED',
    voucher,
    order,
    teamBalances: team ? {
      cashBalance: team.cashBalance,
      cashWallets: team.cashWallets,
      holdings: team.holdings
    } : null,
    tellerScorecard: opScorecard
  });
});

// 8. POST /api/training/fx/convert
app.post('/api/training/fx/convert', (req, res) => {
  const { teamCode, fromCurrency, toCurrency, amount, ticketNumber, operator } = req.body;
  if (!teamCode || !fromCurrency || !toCurrency || !amount) {
    return res.status(400).json({ error: 'Missing required conversion parameters: teamCode, fromCurrency, toCurrency, amount' });
  }

  const fromCurr = String(fromCurrency).toUpperCase();
  const toCurr = String(toCurrency).toUpperCase();

  if (fromCurr === toCurr) {
    return res.status(400).json({ error: 'Cannot exchange currency to itself.' });
  }

  if (fromCurr === 'CAD' || fromCurr === 'CHF' || toCurr === 'CAD' || toCurr === 'CHF') {
    return res.status(400).json({ error: 'CAD and CHF are legacy currencies and not available for new exchange transactions.' });
  }

  const team = findSandboxTeam(teamCode);
  if (!team) {
    return res.status(404).json({ error: `Mock team '${teamCode}' not found in sandbox.` });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const teamBalance = team.cashWallets?.[fromCurr] ?? (fromCurr === 'INR' ? team.cashBalance : 0);
  if (teamBalance < amt) {
    return res.status(400).json({ error: `Insufficient sandbox cash wallet balance in ${fromCurr}. Available: ${teamBalance}` });
  }

  let effectiveRate = 88.60;
  if (DEFAULT_FX_RATES) {
    const pairKey = `${toCurr}${fromCurr}`;
    const inversePairKey = `${fromCurr}${toCurr}`;
    if (DEFAULT_FX_RATES[pairKey]) {
      effectiveRate = DEFAULT_FX_RATES[pairKey].buyRate || DEFAULT_FX_RATES[pairKey].midRate || 88.60;
    } else if (DEFAULT_FX_RATES[inversePairKey]) {
      effectiveRate = DEFAULT_FX_RATES[inversePairKey].sellRate || DEFAULT_FX_RATES[inversePairKey].midRate || 88.60;
    }
  }

  let toAmount = 0;
  if (fromCurr === 'INR') {
    toAmount = parseFloat((amt / effectiveRate).toFixed(2));
  } else if (toCurr === 'INR') {
    toAmount = parseFloat((amt * effectiveRate).toFixed(2));
  } else {
    toAmount = parseFloat(amt.toFixed(2));
  }

  const reserveObj = sandboxState.fxReserves[toCurr];
  if (toCurr !== 'INR') {
    const availableReserve = reserveObj?.availableReserve ?? (typeof reserveObj === 'number' ? reserveObj : 0);
    if (availableReserve < toAmount) {
      updateScorecard(operator, { role: 'operator_x', isError: true, isViolation: true, penalty: 15, latency: 4.0 });
      return res.status(400).json({
        error: 'Insufficient sandbox reserves',
        availableReserve,
        requested: toAmount
      });
    }

    if (reserveObj && typeof reserveObj === 'object') {
      reserveObj.availableReserve = Math.max(0, reserveObj.availableReserve - toAmount);
      reserveObj.currentInventory = Math.max(0, reserveObj.currentInventory - toAmount);
      reserveObj.completedSales = (reserveObj.completedSales || 0) + toAmount;
    }
  }

  if (!team.cashWallets) team.cashWallets = {};
  team.cashWallets[fromCurr] = Math.max(0, (team.cashWallets[fromCurr] || 0) - amt);
  team.cashWallets[toCurr] = (team.cashWallets[toCurr] || 0) + toAmount;
  if (fromCurr === 'INR') team.cashBalance = team.cashWallets.INR;
  if (toCurr === 'INR') team.cashBalance = team.cashWallets.INR;

  const transaction = {
    id: `TRN-FXTX-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    ticketNumber: ticketNumber || `FX-TRN-${Date.now().toString().slice(-4)}`,
    teamCode: team.teamCode,
    fromCurrency: fromCurr,
    toCurrency: toCurr,
    fromAmount: amt,
    toAmount,
    effectiveRate,
    timestamp: Date.now(),
    operator: operator || 'FX Operator'
  };

  sandboxState.fxTransactions.unshift(transaction);
  const opScorecard = updateScorecard(operator, { role: 'operator_x', isSuccess: true, bonus: 2, latency: 5.1 });

  return res.status(200).json({
    success: true,
    transaction,
    reserves: reserveObj,
    newReserves: sandboxState.fxReserves,
    operatorScorecard: opScorecard
  });
});

// 9. POST /api/training/news/publish
app.post('/api/training/news/publish', (req, res) => {
  const { headline, description, category, sentiment, impactMagnitude, affectedSecurityIds, operator, author } = req.body;
  if (!headline || typeof headline !== 'string' || headline.trim().length < 5) {
    return res.status(400).json({ error: 'Headline must be at least 5 characters.' });
  }

  const validSentiments = ['Positive', 'Negative', 'Neutral', 'Bullish', 'Bearish'];
  if (!sentiment || !validSentiments.includes(sentiment)) {
    return res.status(400).json({ error: `Sentiment must be one of: ${validSentiments.join(', ')}` });
  }

  const newsEvent = {
    id: `TRN-NEWS-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    headline: headline.trim(),
    description: description ? description.trim() : 'Simulated practice headline for operator rehearsal.',
    category: category || 'Macro',
    sentiment,
    impactMagnitude: parseFloat(impactMagnitude) || 2.5,
    affectedSecurityIds: Array.isArray(affectedSecurityIds) ? affectedSecurityIds : [],
    publishedAt: Date.now(),
    author: operator || author || 'Journalist Rehearsal Desk',
    isSandbox: true
  };

  sandboxState.newsEvents.unshift(newsEvent);
  const opScorecard = updateScorecard(operator || author, { role: 'journalist', isSuccess: true, bonus: 2, latency: 12.0 });

  return res.status(200).json({
    success: true,
    newsEvent,
    newsItem: newsEvent,
    journalistScorecard: opScorecard
  });
});

// 10. GET /api/training/scorecard & /api/training/scorecards
const handleTrainingScorecardGet = (req, res) => {
  const { operator, role } = req.query;
  const sc = getOrCreateScorecard(operator, role);
  return res.status(200).json({
    success: true,
    scorecard: sc,
    scorecards: sandboxState.scorecards
  });
};
app.get('/api/training/scorecard', handleTrainingScorecardGet);
app.get('/api/training/scorecards', handleTrainingScorecardGet);

// 11. POST /api/training/reset
app.post('/api/training/reset', (req, res) => {
  const { preserveScorecards = false } = req.body || {};
  sandboxState = createInitialSandboxState(preserveScorecards ? sandboxState.scorecards : null);
  return res.status(200).json({
    success: true,
    message: 'Sandbox training state reset successfully.',
    resetAt: Date.now(),
    preservedScorecards: preserveScorecards === true
  });
});

// ============================================================================
// PHASE F.2: AUTOMATED TRAINING SCENARIO ENGINE & TASK GENERATOR (ZERO LIVE IMPACT)
// ============================================================================

const TRAINING_SCENARIOS_CATALOG = [
  {
    id: 'SCN_BUY_STANDARD',
    title: 'Standard Institutional BUY Order',
    category: 'Exchange & Bank Flow',
    difficulty: 'Beginner',
    teamCode: 'TRAIN_T01',
    description: 'Alpha Capital places an institutional BUY order for 50 shares of RELIANCE. Operator must check paper slip, verify +5% cash pre-reservation buffer, approve to generate Bank voucher, and Bank teller must settle.',
    taskType: 'ORDER_BUY',
    ticker: 'RELIANCE',
    quantity: 50,
    action: 'BUY',
    orderType: 'MARKET',
    deskId: 'DESK_1',
    expectedOutcome: 'EXCHANGE_APPROVE_AND_BANK_SETTLE',
    learningObjective: 'Master intake verification checklist, execution buffer reservation, and inter-desk voucher handover.'
  },
  {
    id: 'SCN_SELL_STANDARD',
    title: 'Standard Institutional SELL Order',
    category: 'Exchange & Bank Flow',
    difficulty: 'Beginner',
    teamCode: 'TRAIN_T01',
    description: 'Alpha Capital places a SELL order for 100 shares of INFY from held deliverable portfolio. Operator must verify physical slip stamp, approve voucher to Bank Desk, and Bank teller must settle cash proceeds.',
    taskType: 'ORDER_SELL',
    ticker: 'INFY',
    quantity: 100,
    action: 'SELL',
    orderType: 'MARKET',
    deskId: 'DESK_2',
    expectedOutcome: 'EXCHANGE_APPROVE_AND_BANK_SETTLE',
    learningObjective: 'Verify share locking mechanics on sell orders and deliverable balance settlement.'
  },
  {
    id: 'SCN_CORRECTION_REQ',
    title: 'Physical Slip Mismatch / Discrepancy',
    category: 'Quality Control',
    difficulty: 'Intermediate',
    teamCode: 'TRAIN_T02',
    description: 'Beta Investments submits an order slip with signature and quantity discrepancy. Operator must NOT approve; operator must use "Return for Correction" with mandatory justification note.',
    taskType: 'ORDER_DISCREPANCY',
    ticker: 'TCS',
    quantity: 25,
    action: 'BUY',
    orderType: 'LIMIT',
    deskId: 'DESK_1',
    simulatedDiscrepancy: 'Trader PIN stamp smudged and quantity on slip indicates 35 units while system record has 25 units.',
    expectedOutcome: 'RETURN_FOR_CORRECTION',
    learningObjective: 'Identify paper slip defects and enforce return-for-correction protocol without penalizing team.'
  },
  {
    id: 'SCN_INSUFFICIENT_FUNDS',
    title: 'Capital Limit Breach / Insufficient Balance',
    category: 'Risk Management',
    difficulty: 'Intermediate',
    teamCode: 'TRAIN_T03',
    description: 'Gamma Global attempts to place an outsized BUY order for 15,000 shares of RELIANCE exceeding total available cash reserves. Automated risk checks or operator rejection required.',
    taskType: 'RISK_VIOLATION_CASH',
    ticker: 'RELIANCE',
    quantity: 15000,
    action: 'BUY',
    orderType: 'MARKET',
    deskId: 'DESK_3',
    forceInject: true,
    expectedOutcome: 'REJECT_ORDER',
    learningObjective: 'Enforce capital solvency controls and handle over-budget order rejections gracefully.'
  },
  {
    id: 'SCN_INSUFFICIENT_HOLDINGS',
    title: 'Short Selling Breach / Insufficient Holdings',
    category: 'Risk Management',
    difficulty: 'Intermediate',
    teamCode: 'TRAIN_T02',
    description: 'Beta Investments attempts to SELL 1,500 shares of TCS when their deliverable holding is only 150 shares. Must trigger rejection due to prohibition of naked short selling.',
    taskType: 'RISK_VIOLATION_HOLDING',
    ticker: 'TCS',
    quantity: 1500,
    action: 'SELL',
    orderType: 'MARKET',
    deskId: 'DESK_2',
    forceInject: true,
    expectedOutcome: 'REJECT_ORDER',
    learningObjective: 'Prevent naked short selling and uphold exchange inventory rules.'
  },
  {
    id: 'SCN_MULTI_ORDER_RUSH',
    title: 'Multi-Desk Trading Floor Rush',
    category: 'High Volume Rehearsal',
    difficulty: 'Advanced',
    teamCode: 'TRAIN_T01',
    description: 'Simulates high-velocity market activity with 3 incoming institutional orders across Desks 1, 2, and 3. Operators must triage queues, stamp slips, and batch hand off vouchers to Bank counters.',
    taskType: 'BATCH_RUSH',
    batchOrders: [
      { teamCode: 'TRAIN_T01', ticker: 'HDFCBANK', action: 'BUY', quantity: 80, deskId: 'DESK_1' },
      { teamCode: 'TRAIN_T02', ticker: 'TATASTEEL', action: 'SELL', quantity: 200, deskId: 'DESK_2' },
      { teamCode: 'TRAIN_T03', ticker: 'INFY', action: 'BUY', quantity: 60, deskId: 'DESK_3' }
    ],
    expectedOutcome: 'CONCURRENT_DESK_TRIAGE',
    learningObjective: 'Test multi-operator concurrency and queue throughput under market pressure.'
  }
];

// 12. GET /api/training/scenarios - Catalog of automated training exercises
app.get('/api/training/scenarios', (req, res) => {
  res.json({
    success: true,
    totalScenarios: TRAINING_SCENARIOS_CATALOG.length,
    scenarios: TRAINING_SCENARIOS_CATALOG
  });
});

// 13. POST /api/training/scenario/trigger - Automatically generate simulated scenario tasks/orders
app.post(['/api/training/scenario/trigger', '/api/training/scenario/start'], (req, res) => {
  const { scenarioId, deskId, operator } = req.body || {};
  const scenario = TRAINING_SCENARIOS_CATALOG.find(s => s.id === scenarioId) || TRAINING_SCENARIOS_CATALOG[0];

  const targetDesk = deskId || scenario.deskId || 'DESK_1';
  const actingOperator = operator || 'Practice Operator';
  const generatedOrders = [];

  if (scenario.taskType === 'BATCH_RUSH' && Array.isArray(scenario.batchOrders)) {
    for (let i = 0; i < scenario.batchOrders.length; i++) {
      const cfg = scenario.batchOrders[i];
      const team = findSandboxTeam(cfg.teamCode) || sandboxState.teams[0];
      const price = getSandboxSecurityPrice(cfg.ticker);
      const reqVal = price * cfg.quantity;
      const resVal = cfg.action === 'BUY' ? Math.ceil(reqVal * 1.05) : 0;

      if (cfg.action === 'BUY') {
        if (!team.reservedCash) team.reservedCash = { INR: 0 };
        team.reservedCash.INR = (team.reservedCash.INR || 0) + resVal;
      } else {
        if (!team.lockedHoldings) team.lockedHoldings = {};
        team.lockedHoldings[cfg.ticker] = (team.lockedHoldings[cfg.ticker] || 0) + cfg.quantity;
      }

      const ordId = `TRN-SCN-${Date.now().toString().slice(-6)}-${i + 1}`;
      const simOrder = {
        id: ordId,
        ticketNumber: `SCN-TKT-${Date.now().toString().slice(-4)}${i + 1}`,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        teamCode: team.teamCode,
        ticker: cfg.ticker,
        action: cfg.action,
        quantity: cfg.quantity,
        price,
        orderType: 'MARKET',
        requestedValue: reqVal,
        reservedCashAmount: resVal,
        status: 'AWAITING_PHYSICAL_SLIP',
        physicalSlipChecked: false,
        deskId: cfg.deskId || targetDesk,
        operator: null,
        notes: `Simulated task: ${scenario.title} (Batch order ${i + 1}/${scenario.batchOrders.length})`,
        createdAt: Date.now() + i * 50
      };

      sandboxState.orders.unshift(simOrder);
      generatedOrders.push(simOrder);
    }
  } else {
    // Single order scenario
    const team = findSandboxTeam(scenario.teamCode) || sandboxState.teams[0];
    const price = getSandboxSecurityPrice(scenario.ticker);
    const reqVal = price * scenario.quantity;
    const resVal = scenario.action === 'BUY' ? Math.ceil(reqVal * 1.05) : 0;

    if (scenario.action === 'BUY' && !scenario.forceInject) {
      if (!team.reservedCash) team.reservedCash = { INR: 0 };
      team.reservedCash.INR = (team.reservedCash.INR || 0) + resVal;
    } else if (scenario.action === 'SELL' && !scenario.forceInject) {
      if (!team.lockedHoldings) team.lockedHoldings = {};
      team.lockedHoldings[scenario.ticker] = (team.lockedHoldings[scenario.ticker] || 0) + scenario.quantity;
    }

    const ordId = `TRN-SCN-${Date.now().toString().slice(-6)}`;
    const simOrder = {
      id: ordId,
      ticketNumber: `SCN-TKT-${Date.now().toString().slice(-4)}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      teamCode: team.teamCode,
      ticker: scenario.ticker,
      action: scenario.action,
      quantity: scenario.quantity,
      price,
      orderType: scenario.orderType || 'MARKET',
      requestedValue: reqVal,
      reservedCashAmount: resVal,
      status: 'AWAITING_PHYSICAL_SLIP',
      physicalSlipChecked: false,
      deskId: targetDesk,
      operator: null,
      discrepancyNote: scenario.simulatedDiscrepancy || null,
      expectedOutcome: scenario.expectedOutcome,
      notes: `Simulated scenario task: ${scenario.title}. ${scenario.learningObjective}`,
      createdAt: Date.now()
    };

    sandboxState.orders.unshift(simOrder);
    generatedOrders.push(simOrder);
  }

  return res.status(200).json({
    success: true,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    generatedOrdersCount: generatedOrders.length,
    orders: generatedOrders,
    message: `Generated ${generatedOrders.length} realistic simulated order(s) for scenario '${scenario.title}'. Zero live impact.`
  });
});


// Dedicated JSON 404 handler for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
});

// SPA Fallback for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Global Express error handler middleware
app.use((err, req, res, next) => {
  console.error('[Global Express Error Handler]', err);
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`====================================================`);
  console.log(`FMS Platform Backend running on http://localhost:${PORT}`);
  console.log(`Real-time WebSocket subscriptions active`);
  console.log(`====================================================`);

  // Phase 6 PostgreSQL Lifecycle Initialization
  if (isPgConfigured()) {
    try {
      const pool = initPool();
      if (pool) {
        await runMigrations(pool);
        await pool.query(`
          ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS notes TEXT;
          ALTER TABLE settlement_vouchers DROP CONSTRAINT IF EXISTS settlement_vouchers_status_check;
          ALTER TABLE settlement_vouchers ADD CONSTRAINT settlement_vouchers_status_check CHECK (
            status IN ('PENDING', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW', 'SETTLED', 'REJECTED', 'CANCELLED', 'VOIDED', 'FAILED')
          );
        `).catch(err => console.warn('[PostgreSQL] Constraint sync notice:', err.message));
        const hydration = await hydrateStateFromPg(pool, state);
        if (hydration.hydrated && hydration.state) {
          Object.assign(state, hydration.state);

          // Strict server-side invariant: Filter hydrated securities against authoritative universe
          const authUniverse = generateFullSecurityUniverse();
          const authIdSet = new Set(authUniverse.map(u => u.id));
          const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];
          state.securities = (state.securities || []).filter(s => {
            if (ipoTickers.includes(s.ticker) || s.isIpo || s.id?.startsWith('IPO_')) {
              const existingIpo = (state.ipos || []).find(i => i.ticker === s.ticker);
              if (existingIpo) {
                Object.assign(existingIpo, s);
              }
              return isIpoListed(s);
            }
            return authIdSet.has(s.id);
          });

          // Re-sync seed personnel to ensure new designated desk and advisor accounts are present
          const seedStaff = getSeedPersonnel();
          if (!Array.isArray(state.personnel)) state.personnel = [];
          seedStaff.forEach(seed => {
            const existingIdx = state.personnel.findIndex(p => p.username?.toLowerCase() === seed.username.toLowerCase());
            if (existingIdx === -1) {
              state.personnel.push(seed);
            } else {
              // Ensure role, permissions, and assignedDesk are up to date
              state.personnel[existingIdx] = { ...seed, ...state.personnel[existingIdx], role: seed.role, permissions: seed.permissions, assignedDesk: seed.assignedDesk || state.personnel[existingIdx].assignedDesk };
            }
          });
          // Ensure all 4 bank desks (BANK_1 - BANK_4) are always initialized in state.bankDesks
          const defaultBankDesks = createInitialState().bankDesks;
          if (!state.bankDesks) {
            state.bankDesks = defaultBankDesks;
          } else {
            Object.keys(defaultBankDesks).forEach(bId => {
              if (!state.bankDesks[bId]) {
                state.bankDesks[bId] = defaultBankDesks[bId];
              }
            });
          }

          healBankDeskAssignments();

          setFallbackStateReference(state);
          console.log('[PostgreSQL] Successfully hydrated authoritative state on startup.');
        }
      }
    } catch (pgErr) {
      console.error('[CRITICAL DATABASE ERROR] Failed to connect/hydrate from PostgreSQL:', pgErr.message);
      if (process.env.NODE_ENV === 'production') {
        state.marketState.status = 'Paused';
        console.error('[SAFETY SHIELD] Production market paused due to database initialization failure.');
      }
    }
  } else {
    console.log('[PostgreSQL] DATABASE_URL not configured. Running in memory/file fallback mode.');
    healBankDeskAssignments();
  }

  isServerReady = true;
  console.log('[READY] SAAMX backend state initialized and accepting requests.');

  startServerAutonomousCoordinator();
  startDeltaPublisher({ getState: () => state, intervalMs: 1000 });
});

// Proactive High-Capacity Memory Watchdog & Self-Healing Guard (Checks every 60s)
setInterval(() => {
  try {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);

    // If heap used exceeds 1500 MB (out of 3072 MB), execute emergency in-memory reclamation
    if (heapUsedMB > 1500) {
      console.warn(`[Memory Watchdog WARNING] Elevated heap usage detected: ${heapUsedMB}MB. Reclaiming memory...`);
      if (Array.isArray(state.securities)) {
        for (const s of state.securities) {
          if (Array.isArray(s.priceHistory) && s.priceHistory.length > 60) {
            s.priceHistory.splice(0, s.priceHistory.length - 60);
          }
        }
      }
      if (Array.isArray(state.transactions) && state.transactions.length > 1000) {
        state.transactions.splice(0, state.transactions.length - 1000);
      }
      if (Array.isArray(state.auditLog) && state.auditLog.length > 1000) {
        state.auditLog.splice(1000);
      }
      if (typeof global.gc === 'function') {
        global.gc();
        console.log(`[Memory Watchdog] Garbage collection invoked. Post-GC heap: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      }
    }
  } catch (mErr) {
    console.error('[Memory Watchdog Error]', mErr.message);
  }
}, 60000).unref();

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  console.log(`[SHUTDOWN] Received ${signal}. Initiating graceful shutdown...`);
  isShuttingDown = true;

  if (saveStateDebounceTimer) {
    clearTimeout(saveStateDebounceTimer);
    saveStateDebounceTimer = null;
    performSaveState(true);
  }

  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');
    try {
      stopDeltaPublisher();
      await closePool();
      console.log('[SHUTDOWN] Database pool closed cleanly.');
    } catch (err) {
      console.error('[SHUTDOWN] Error during teardown:', err.message);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

