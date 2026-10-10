import { db, ref, set, get, update, push } from './firebase.js';
import { runTransaction } from 'firebase/database';
import { INITIAL_SECURITIES_TEMPLATES } from '../../initial_securities.js';
import { generateFullSecurityUniverse } from '../../universe_generator.js';
import { NEWS_PRESETS } from './newsPresets.js';
import { calculateEventImpact, processVodafoneCrisisAct, processIpoStage } from './eventEngine.js';

export function calculateMarketClock(marketState, serverTimeOffset = 0) {
  if (!marketState) {
    return { sessionState: 'PRE_OPEN', currentPhase: 'PRE_OPEN', timeString: '09:00 AM', timeLeftString: '00:00', elapsedMinutes: 0, isPaused: false, isTradingActive: false };
  }

  const now = Date.now() + serverTimeOffset;
  const mode = marketState.mode || 'EVENT';

  if (mode === 'EVENT') {
    const nowDate = new Date(now);
    const hours = nowDate.getHours();
    const minutes = nowDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    let sessionState = 'PRE_OPEN';
    let currentPhase = 'REGISTRATION';
    let timeLeftString = '';
    let elapsedMinutes = 0;
    let isTradingActive = false;

    // Canonical SAAMX Schedule:
    // < 08:00          -> REGISTRATION
    // 08:00 - 09:00    -> BRIEFING
    // 09:00 - 09:30    -> PRE_OPEN
    // 09:30 - 10:00    -> MARKET_OPEN
    // 10:00 - 12:00    -> MORNING_SESSION
    // 12:00 - 13:00    -> LUNCH_BREAK
    // 13:00 - 15:30    -> AFTERNOON_SESSION
    // 15:30            -> MARKET CLOSE & VALUATION FREEZE
    // 15:30 - 15:45    -> RECONCILIATION
    // 15:45 - 16:00    -> APPROVAL (Judging Deliberation & Results Approval)
    // 16:00+           -> RESULTS

    if (totalMinutes < 8 * 60) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'REGISTRATION';
      const rem = (8 * 60) - totalMinutes;
      timeLeftString = `REGISTRATION IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 9 * 60) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'BRIEFING';
      const rem = (9 * 60) - totalMinutes;
      timeLeftString = `PRE-OPEN IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 9 * 60 + 30) {
      sessionState = 'PRE_OPEN';
      currentPhase = 'PRE_OPEN';
      const rem = (9 * 60 + 30) - totalMinutes;
      timeLeftString = `BELL RINGS IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 12 * 60) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = totalMinutes < 10 * 60 ? 'MARKET_OPEN' : 'MORNING_SESSION';
      const rem = (12 * 60) - totalMinutes;
      timeLeftString = `LUNCH IN ${Math.floor(rem / 60)}h ${rem % 60}m`;
      elapsedMinutes = totalMinutes - (9 * 60 + 30);
      isTradingActive = true;
    } else if (totalMinutes < 13 * 60) {
      sessionState = 'LUNCH_BREAK';
      currentPhase = 'LUNCH_BREAK';
      const rem = (13 * 60) - totalMinutes;
      timeLeftString = `LUNCH: RESUMES IN ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 15 * 60 + 30) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = 'AFTERNOON_SESSION';
      const rem = (15 * 60 + 30) - totalMinutes;
      timeLeftString = `CLOSES IN ${Math.floor(rem / 60)}h ${rem % 60}m`;
      elapsedMinutes = (120) + (totalMinutes - 13 * 60);
      isTradingActive = true;
    } else if (totalMinutes < 15 * 60 + 45) {
      sessionState = 'CLOSING';
      currentPhase = 'RECONCILIATION';
      const rem = (15 * 60 + 45) - totalMinutes;
      timeLeftString = `RECONCILIATION: ${rem}M`;
      isTradingActive = false;
    } else if (totalMinutes < 16 * 60) {
      sessionState = 'CLOSING';
      currentPhase = 'APPROVAL';
      const rem = (16 * 60) - totalMinutes;
      timeLeftString = `RESULTS APPROVAL: ${rem}M`;
      isTradingActive = false;
    } else {
      sessionState = 'RESULTS';
      currentPhase = 'RESULTS';
      timeLeftString = 'RESULTS PUBLISHED';
      isTradingActive = false;
    }

    const timeString = nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      sessionState,
      currentPhase,
      timeString,
      timeLeftString,
      elapsedMinutes,
      isTradingActive: isTradingActive && marketState.status === 'Open',
      isPaused: marketState.status === 'Paused' || marketState.isFrozen
    };
  } else {
    // DEMO / SIMULATION MODE timings:
    const startTime = marketState.simulationStartTime;
    if (marketState.status === 'NotStarted' || !startTime) {
      return {
        sessionState: 'PRE_OPEN',
        currentPhase: 'PRE_OPEN',
        timeString: '09:30 AM',
        timeLeftString: `${String(marketState.simulationDurationMinutes || 60).padStart(2, '0')}:00`,
        elapsedMinutes: 0,
        isPaused: false,
        isTradingActive: false
      };
    }

    const durationMins = marketState.simulationDurationMinutes || 60;
    const pauseOffset = marketState.pauseTimeOffset || 0;
    const pausedAt = marketState.pausedAt;

    let elapsedMs = 0;
    if (marketState.status === 'Paused' && pausedAt) {
      elapsedMs = pausedAt - startTime - pauseOffset;
    } else {
      elapsedMs = now - startTime - pauseOffset;
    }

    const elapsedMinutes = elapsedMs / 60000;

    let sessionState = 'CONTINUOUS_TRADING';
    let currentPhase = 'MORNING_SESSION';
    let timeLeftString = '00:00';
    let timeString = '09:30 AM';
    let isTradingActive = marketState.status === 'Open';

    const tradingLimit = durationMins * 0.75; // e.g. 45 min
    const closingLimit = durationMins * 0.916; // e.g. 55 min

    if (elapsedMinutes < tradingLimit) {
      sessionState = 'CONTINUOUS_TRADING';
      currentPhase = 'MORNING_SESSION';
      const progress = elapsedMinutes / tradingLimit;
      const simMinutes = progress * 360; // 9:30 AM to 3:30 PM is 360 minutes
      const simTime = new Date(new Date().setHours(9, 30, 0, 0) + simMinutes * 60000);
      timeString = simTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const remainingMs = Math.max(0, (tradingLimit * 60000) - elapsedMs);
      const remMin = Math.floor(remainingMs / 60000);
      const remSec = Math.floor((remainingMs % 60000) / 1000);
      timeLeftString = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    } else if (elapsedMinutes < closingLimit) {
      sessionState = 'CLOSING';
      isTradingActive = false;
      const progress = (elapsedMinutes - tradingLimit) / (closingLimit - tradingLimit);
      const isSecondHalf = progress >= 0.5;
      currentPhase = isSecondHalf ? 'APPROVAL' : 'RECONCILIATION';
      const simMinutes = progress * 30; // 3:30 PM to 4:00 PM is 30 minutes
      const simTime = new Date(new Date().setHours(15, 30, 0, 0) + simMinutes * 60000);
      timeString = simTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const remainingMs = Math.max(0, (closingLimit * 60000) - elapsedMs);
      const remMin = Math.floor(remainingMs / 60000);
      const remSec = Math.floor((remainingMs % 60000) / 1000);
      timeLeftString = isSecondHalf
        ? `RESULTS APPROVAL: ${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`
        : `RECONCILIATION: ${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    } else {
      sessionState = 'RESULTS';
      currentPhase = 'RESULTS';
      isTradingActive = false;
      timeString = '04:00 PM';
      timeLeftString = 'RESULTS UNLOCKED';
    }

    return {
      sessionState,
      currentPhase,
      timeString,
      timeLeftString,
      elapsedMinutes: Math.floor(elapsedMinutes),
      isTradingActive,
      isPaused: marketState.status === 'Paused' || marketState.isFrozen
    };
  }
}

export async function updateMarketIndices(securities) {
  const activeSecurities = Object.values(securities || {}).filter(s => s.status !== 'Suspended');
  if (activeSecurities.length === 0) return;

  let globalSum = 0, globalCount = 0;
  let indiaSum = 0, indiaCount = 0;
  let usSum = 0, usCount = 0;
  let ukSum = 0, ukCount = 0;

  activeSecurities.forEach(s => {
    const basePrice = s.basePrice || s.openingPrice || 100;
    const currentPrice = s.currentPrice || 100;
    const pctChange = ((currentPrice - basePrice) / basePrice) * 100;

    globalSum += pctChange;
    globalCount++;

    if (s.exchange === 'NSE' || s.exchange === 'BSE' || s.country === 'India') {
      indiaSum += pctChange;
      indiaCount++;
    }

    if (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' || s.country === 'USA') {
      usSum += pctChange;
      usCount++;
    }

    if (s.exchange === 'LSE' || s.country === 'UK') {
      ukSum += pctChange;
      ukCount++;
    }
  });

  const globalAvg = globalCount > 0 ? (globalSum / globalCount) : 0;
  const indiaAvg = indiaCount > 0 ? (indiaSum / indiaCount) : 0;
  const usAvg = usCount > 0 ? (usSum / usCount) : 0;
  const ukAvg = ukCount > 0 ? (ukSum / ukCount) : 0;

  const globalVal = parseFloat((1000 * (1 + globalAvg / 100)).toFixed(2));
  const indiaVal = parseFloat((5000 * (1 + indiaAvg / 100)).toFixed(2));
  const usVal = parseFloat((8000 * (1 + usAvg / 100)).toFixed(2));
  const ukVal = parseFloat((4000 * (1 + ukAvg / 100)).toFixed(2));

  const indicesObj = {
    GLOBAL100: {
      name: 'SAAMX GLOBAL 100',
      currentValue: globalVal,
      openingValue: 1000,
      changePercent: parseFloat(globalAvg.toFixed(2)),
      changeAbsolute: parseFloat((globalVal - 1000).toFixed(2))
    },
    INDIA50: {
      name: 'SAAMX INDIA 50',
      currentValue: indiaVal,
      openingValue: 5000,
      changePercent: parseFloat(indiaAvg.toFixed(2)),
      changeAbsolute: parseFloat((indiaVal - 5000).toFixed(2))
    },
    US100: {
      name: 'SAAMX US 100',
      currentValue: usVal,
      openingValue: 8000,
      changePercent: parseFloat(usAvg.toFixed(2)),
      changeAbsolute: parseFloat((usVal - 8000).toFixed(2))
    },
    UK100: {
      name: 'SAAMX UK 100',
      currentValue: ukVal,
      openingValue: 4000,
      changePercent: parseFloat(ukAvg.toFixed(2)),
      changeAbsolute: parseFloat((ukVal - 4000).toFixed(2))
    }
  };

  await set(ref(db, 'fms/marketIndices'), indicesObj);
}

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

export async function logAuditEvent(entry) {
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
    await set(ref(db, `fms/auditLog/${auditId}`), fullEntry);
    return fullEntry;
  } catch (err) {
    console.error("Audit log write error:", err);
  }
}

export async function apiFetch(path, options = {}) {
  // 1. Primary path: Attempt authoritative backend HTTP fetch if running in browser
  if (typeof window !== 'undefined') {
    const rawFetch = window.__nativeFetch || (typeof fetch === 'function' ? fetch : null);
    if (rawFetch) {
      try {
        const sessionToken = sessionStorage.getItem('saamx_token') || localStorage.getItem('saamx_token');
        const sessionPw = sessionStorage.getItem('saamx_password') || localStorage.getItem('saamx_password');
        const sessionRole = sessionStorage.getItem('saamx_role') || localStorage.getItem('saamx_role');
        const sessionTeamCode = sessionStorage.getItem('saamx_team_code') || localStorage.getItem('saamx_team_code');

        const headers = {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          ...(sessionPw ? { 'X-FMS-Password': sessionPw } : {}),
          ...(sessionRole ? { 'X-FMS-Role': sessionRole } : {}),
          ...(sessionTeamCode ? { 'X-FMS-Team-Code': sessionTeamCode } : {}),
          ...(options.headers || {})
        };

        const targetUrl = path.startsWith('http') ? path : (path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`);
        const res = await rawFetch(targetUrl, {
          ...options,
          _skipApiIntercept: true,
          headers
        });

        if (res.status !== 404 && res.status !== 502) {
          return res;
        }
      } catch (netErr) {
        // Backend server offline; fallback to browser simulation
      }
    }
  }

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

  const hashPassword = async (plain) => {
    const msgBuffer = new TextEncoder().encode(plain);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const buildSecurityObject = (c, index, indianCities, firstNames, lastNames) => {
    const ceo = c.manager || `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const hq = indianCities[Math.floor(Math.random() * indianCities.length)];
    const founded = Math.floor(Math.random() * 35) + 1990;

    let tagline = `Real-world market leader in ${c.sector}.`;
    let about = `Leading enterprise specializing in ${c.sector.toLowerCase()} services, catering to regional and global market segments.`;
    let facts = [];
    let holdings = null;
    let note = null;

    if (c.ticker === 'DTAI') {
      tagline = "Fictional delta labs mock asset.";
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
      facts = [
        { label: 'Fund House', value: c.fundHouse },
        { label: 'Category', value: c.category },
        { label: 'AUM', value: c.aum },
        { label: 'Fund Manager', value: c.manager },
        { label: 'Expense Ratio', value: c.expenseRatio },
        { label: '5-Yr CAGR', value: c.cagr }
      ];
    }

    let exchange = 'NSE';
    let country = 'India';
    let currency = 'INR';

    if (c.type === 'GlobalEquity') {
      exchange = c.ticker === 'SAMS' ? 'KRX' : c.ticker === 'BABA' ? 'NYSE' : 'NASDAQ';
      country = c.ticker === 'SAMS' ? 'South Korea' : c.ticker === 'BABA' ? 'China' : 'USA';
      currency = c.ticker === 'SAMS' ? 'KRW' : 'USD';
    } else if (c.sector && c.sector.includes('USA')) {
      exchange = 'NASDAQ';
      country = 'USA';
      currency = 'USD';
    }

    return {
      id: `S${String(index + 1).padStart(4, '0')}`,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      industry: `${c.sector} Industry`,
      exchange,
      country,
      currency,
      type: c.type === 'GlobalEquity' ? 'Stock' : c.type,
      referencePrice: c.basePrice,
      openingPrice: c.basePrice,
      previousClose: c.basePrice,
      basePrice: c.basePrice,
      currentPrice: c.basePrice,
      dayHigh: c.basePrice,
      dayLow: c.basePrice,
      totalUnits: c.totalUnits,
      availableUnits: c.totalUnits,
      tradingVolume: 0,
      volatility: c.volatility,
      riskRating: c.riskRating,
      growthRating: 3,
      status: 'Active',
      ipoStatus: 'NONE',
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
        holdings: null,
        note
      }
    };
  };

  try {
    // 1. SEED DATABASE
    if (path === '/api/admin/seed') {
      const generatedList = generateFullSecurityUniverse();
      const securities = {};
      generatedList.forEach(s => {
        securities[s.ticker] = s;
      });

      const startingINR = 10000000; // ₹1 Crore
      const teams = {};
      for (let i = 1; i <= 20; i++) {
        const teamCode = `T${String(i).padStart(2, '0')}`;
        const defaultPlainPw = `saamx-team-${String(i).padStart(2, '0')}`;
        const hashedPw = await hashPassword(defaultPlainPw);
        teams[teamCode] = {
          id: `T${String(i).padStart(2, '0')}`,
          teamCode,
          teamName: `Trader Elite ${i}`,
          teamType: 'Retail',
          passwordHash: hashedPw,
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
        };
      }

      const fxRates = {
        USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45, lastUpdated: Date.now() },
        GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45, lastUpdated: Date.now() },
        EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45, lastUpdated: Date.now() }
      };

      await set(ref(db, 'fms/securities'), securities);
      await set(ref(db, 'fms/teams'), teams);
      await set(ref(db, 'fms/fxRates'), fxRates);
      await set(ref(db, 'fms/fxTransactions'), {});

      // Initialize flat priceHistory path atomically on seed
      const priceHistories = {};
      const initialTimestamp = Date.now();
      Object.keys(securities).forEach(ticker => {
        priceHistories[ticker] = {
          [initialTimestamp]: { price: securities[ticker].basePrice }
        };
      });
      await set(ref(db, 'fms/priceHistory'), priceHistories);
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
    if (path === '/api/admin/reset' || path === '/api/admin/master-reset') {
      const mode = (body && body.mode) || 'TEST';
      const activeTeamCount = (body && typeof body.activeTeamCount === 'number') ? body.activeTeamCount : 20;

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

      // Read configuration (authoritative ₹1 Crore starting capital)
      const settings = currentFms.settings || { startingCapitalRetail: 10000000 };
      const startingCapital = 10000000; // ₹1 Crore single source of truth
      const durationMins = currentFms.marketState?.simulationDurationMinutes || 60;

      // Seed 1,800 Global Security Universe
      const generatedList = generateFullSecurityUniverse();
      const securities = {};
      generatedList.forEach(s => {
        securities[s.ticker] = s;
      });

      const fxRates = {
        USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45, lastUpdated: Date.now() },
        GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45, lastUpdated: Date.now() },
        EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45, lastUpdated: Date.now() }
      };

      // Seed teams with Multi-Currency Wallets
      const teams = {};
      for (let i = 1; i <= 20; i++) {
        const teamCode = `T${String(i).padStart(2, '0')}`;
        const active = i <= activeTeamCount;
        const defaultPlainPw = `saamx-team-${String(i).padStart(2, '0')}`;
        const hashedPw = await hashPassword(defaultPlainPw);
        teams[teamCode] = {
          id: `T${String(i).padStart(2, '0')}`,
          teamCode,
          teamName: `Trader Elite ${i}`,
          teamType: 'Retail',
          passwordHash: hashedPw,
          cashBalance: startingCapital,
          cashWallets: {
            INR: startingCapital,
            USD: 0,
            GBP: 0,
            EUR: 0
          },
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

      const priceHistories = {};
      const initialTimestamp = Date.now();
      Object.keys(securities).forEach(ticker => {
        priceHistories[ticker] = {
          [initialTimestamp]: { price: securities[ticker].basePrice }
        };
      });

      const result = await runTransaction(ref(db, 'fms'), (fms) => {
        const nextState = {
          securities,
          teams,
          fxRates,
          fxTransactions: {},
          priceHistory: priceHistories,
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
            activeTeamCount,
            sessionState: 'PRE_OPEN',
            mode: mode === 'TEST' ? 'DEMO' : 'EVENT',
            timeString: '09:00 AM',
            timeLeftString: mode === 'TEST' ? `${String(durationMins).padStart(2, '0')}:00` : 'OPENS IN 15M'
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
        if (secCount < 1800) {
          verificationError = `Securities count mismatch: expected at least 1800, got ${secCount}`;
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
          const isIpo = s.simulationLabel || s.ipoStatus || s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED';
          if (!isIpo && s.status !== 'Active') {
            verificationError = `Security ${s.ticker} status is not Active`;
            return;
          }
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
      await set(ref(db, 'fms/coordinator'), null);
      await updateMarketIndices(securities);

      return mockResponse({ success: true, report: resetReport });
    }

    // 3. EXECUTE TRADE TRANSACTION
    if (path === '/api/trade') {
      const { teamId, securityId, action, quantity, enteredBy } = body;
      const Q = Number(quantity);
      if (!teamId || !securityId || !action || isNaN(Q) || Q <= 0 || !Number.isInteger(Q)) {
        return mockResponse({ error: 'Missing parameters or invalid quantity. Quantity must be a positive integer.' }, 400);
      }
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

      const currentSessionState = marketState.sessionState || 'PRE_OPEN';
      if (currentSessionState !== 'CONTINUOUS_TRADING') {
        return mockResponse({ error: `Trading is locked. Market session is currently ${currentSessionState}.` }, 400);
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
      // Resolve Security Currency & Team Wallet
      const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR');
      const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
      
      const teamWallets = team.cashWallets || { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
      const nativeCash = Number(teamWallets[secCurrency] || 0);

      const openingPrice = security.openingPrice || security.basePrice || 100;
      const bandPercent = marketState.priceBandPercent || 10;
      const lowerLimit = parseFloat((openingPrice * (1 - bandPercent / 100)).toFixed(2));
      const upperLimit = parseFloat((openingPrice * (1 + bandPercent / 100)).toFixed(2));

      let proposedNewPrice = 0;
      if (action === 'BUY') {
        proposedNewPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
      } else {
        proposedNewPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
      }

      if (proposedNewPrice < lowerLimit || proposedNewPrice > upperLimit) {
        return mockResponse({ error: `Order rejected: Price band violation. Daily limit is ±${bandPercent}%. Permitted range: ${curSym}${lowerLimit.toFixed(2)} - ${curSym}${upperLimit.toFixed(2)}. Proposed price: ${curSym}${proposedNewPrice.toFixed(2)}` }, 400);
      }

      if (action === 'BUY') {
        if (Q > security.availableUnits) {
          return mockResponse({ error: `Only ${security.availableUnits} units available.` }, 400);
        }
        if (nativeCash < totalValue) {
          return mockResponse({ error: `Insufficient ${secCurrency} balance. Team has ${curSym}${nativeCash.toLocaleString()}, order requires ${curSym}${totalValue.toLocaleString()}. Please convert funds at the Currency Exchange Desk (#/fx).` }, 400);
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
        
        sec.tradingVolume = (sec.tradingVolume || 0) + Q;
        sec.dayHigh = Math.max(sec.dayHigh || 0, sec.currentPrice);
        sec.dayLow = Math.min(sec.dayLow || sec.currentPrice, sec.currentPrice);

        if (!sec.priceHistory) sec.priceHistory = [];
        sec.priceHistory.push({ timestamp: Date.now(), price: sec.currentPrice });
        if (sec.priceHistory.length > 50) sec.priceHistory.shift();
        
        return sec;
      });

      if (!secUpdateResult.committed) {
        return mockResponse({ error: 'Order execution failed: Security state conflict. Please try again.' }, 400);
      }

      // 3. Update the team balance and holdings atomically
      const fxRatesSnap = await get(ref(db, 'fms/fxRates'));
      const activeFxRates = fxRatesSnap.exists() ? fxRatesSnap.val() : {
        USDINR: { midRate: 88.20 },
        GBPINR: { midRate: 119.40 },
        EURINR: { midRate: 103.50 }
      };

      const usdRate = activeFxRates.USDINR?.midRate || 88.20;
      const gbpRate = activeFxRates.GBPINR?.midRate || 119.40;
      const eurRate = activeFxRates.EURINR?.midRate || 103.50;

      const teamUpdateResult = await runTransaction(ref(db, `fms/teams/${teamKey}`), (tm) => {
        if (!tm) return;
        if (!tm.cashWallets) {
          tm.cashWallets = { INR: Number(tm.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
        }
        
        const curWalletBalance = Number(tm.cashWallets[secCurrency] || 0);
        if (action === 'BUY') {
          tm.cashWallets[secCurrency] = parseFloat((curWalletBalance - totalValue).toFixed(2));
          if (!tm.holdings) tm.holdings = {};
          tm.holdings[security.ticker] = (tm.holdings[security.ticker] || 0) + Q;
        } else {
          tm.cashWallets[secCurrency] = parseFloat((curWalletBalance + totalValue).toFixed(2));
          tm.holdings[security.ticker] -= Q;
          if (tm.holdings[security.ticker] === 0) {
            delete tm.holdings[security.ticker];
          }
        }

        // Consolidated INR
        tm.cashBalance = parseFloat((
          Number(tm.cashWallets.INR || 0) +
          Number(tm.cashWallets.USD || 0) * usdRate +
          Number(tm.cashWallets.GBP || 0) * gbpRate +
          Number(tm.cashWallets.EUR || 0) * eurRate
        ).toFixed(2));
        
        return tm;
      });

      if (!teamUpdateResult.committed) {
        // Rollback security if team update fails
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
          
          sec.tradingVolume = Math.max(0, (sec.tradingVolume || 0) - Q);
          return sec;
        });
        return mockResponse({ error: 'Order execution failed: Team balance conflict. Please try again.' }, 400);
      }

      // Write tick to flat priceHistory path
      const tradeTimestamp = Date.now();
      const updatedSecVal = secUpdateResult.snapshot.val();
      await set(ref(db, `fms/priceHistory/${security.ticker}/${tradeTimestamp}`), { price: updatedSecVal.currentPrice });

      // 4. Write transaction log
      const txCountSnap = await get(ref(db, 'fms/transactions'));
      const txCount = txCountSnap.exists() ? Object.keys(txCountSnap.val()).length : 0;
      const txId = `TX${String(txCount + 1).padStart(4, '0')}`;
      const fxRateAtExecution = secCurrency === 'USD' ? usdRate : secCurrency === 'GBP' ? gbpRate : secCurrency === 'EUR' ? eurRate : 1.0;
      const inrEquivalent = parseFloat((totalValue * fxRateAtExecution).toFixed(2));

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
        localPrice: executionPrice,
        localCurrency: secCurrency,
        grossValue: totalValue,
        fxRateAtExecution,
        inrEquivalent,
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

      // Update simulated indices in database
      const freshSecuritiesSnap = await get(ref(db, 'fms/securities'));
      if (freshSecuritiesSnap.exists()) {
        await updateMarketIndices(freshSecuritiesSnap.val());
      }

      return mockResponse({ success: true, executionPrice, transaction: transactionObj });
    }

    // 3.1 CURRENCY EXCHANGE DESK TRANSACTION
    if (path === '/api/fx/exchange') {
      const { teamCode, fromCurrency, toCurrency, fromAmount, operatorId, notes, ticketNumber } = body || {};
      const amount = Number(fromAmount);

      if (!teamCode || !fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
        return mockResponse({ error: 'Invalid exchange parameters: teamCode, fromCurrency, toCurrency, and positive fromAmount are required.' }, 400);
      }

      if (fromCurrency === toCurrency) {
        return mockResponse({ error: 'Cannot exchange currency to itself.' }, 400);
      }

      const validCurrencies = ['INR', 'USD', 'GBP', 'EUR'];
      if (!validCurrencies.includes(fromCurrency) || !validCurrencies.includes(toCurrency)) {
        return mockResponse({ error: `Unsupported currency. Supported: ${validCurrencies.join(', ')}` }, 400);
      }

      const [teamsSnap, fxRatesSnap, marketStateSnap] = await Promise.all([
        get(ref(db, 'fms/teams')),
        get(ref(db, 'fms/fxRates')),
        get(ref(db, 'fms/marketState'))
      ]);

      if (!teamsSnap.exists()) {
        return mockResponse({ error: 'Teams database not initialized.' }, 400);
      }

      const teams = teamsSnap.val();
      const teamKey = Object.keys(teams).find(k => k === teamCode || teams[k].teamCode === teamCode);
      if (!teamKey) {
        return mockResponse({ error: `Team ${teamCode} not found.` }, 404);
      }

      const fxRates = fxRatesSnap.exists() ? fxRatesSnap.val() : {
        USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
        GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
        EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
      };

      const team = teams[teamKey];
      const wallets = team.cashWallets || { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
      const currentFromBalance = Number(wallets[fromCurrency] || 0);

      if (currentFromBalance < amount) {
        const curSym = fromCurrency === 'INR' ? '₹' : fromCurrency === 'USD' ? '$' : fromCurrency === 'GBP' ? '£' : '€';
        return mockResponse({
          error: `Insufficient ${fromCurrency} balance. Team has ${curSym}${currentFromBalance.toLocaleString()}, requested ${curSym}${amount.toLocaleString()}.`
        }, 400);
      }

      // Calculate Exchange Rate with Buy/Sell Spread
      let effectiveRate = 1.0;
      let toAmount = 0;
      let spreadPercent = 0.45;

      if (fromCurrency === 'INR') {
        const pairKey = `${toCurrency}INR`;
        const fxInfo = fxRates[pairKey] || { buyRate: toCurrency === 'USD' ? 88.60 : toCurrency === 'GBP' ? 119.95 : 103.95, spreadPercent: 0.45 };
        effectiveRate = fxInfo.buyRate;
        spreadPercent = fxInfo.spreadPercent || 0.45;
        toAmount = parseFloat((amount / effectiveRate).toFixed(2));
      } else if (toCurrency === 'INR') {
        const pairKey = `${fromCurrency}INR`;
        const fxInfo = fxRates[pairKey] || { sellRate: fromCurrency === 'USD' ? 87.80 : fromCurrency === 'GBP' ? 118.85 : 103.05, spreadPercent: 0.45 };
        effectiveRate = fxInfo.sellRate;
        spreadPercent = fxInfo.spreadPercent || 0.45;
        toAmount = parseFloat((amount * effectiveRate).toFixed(2));
      } else {
        const fromPair = fxRates[`${fromCurrency}INR`] || { sellRate: 87.80, spreadPercent: 0.45 };
        const toPair = fxRates[`${toCurrency}INR`] || { buyRate: 103.95, spreadPercent: 0.45 };
        const inrValue = amount * fromPair.sellRate;
        toAmount = parseFloat((inrValue / toPair.buyRate).toFixed(2));
        effectiveRate = parseFloat((fromPair.sellRate / toPair.buyRate).toFixed(4));
        spreadPercent = Math.max(fromPair.spreadPercent || 0.45, toPair.spreadPercent || 0.45);
      }

      const usdRate = fxRates.USDINR?.midRate || 88.20;
      const gbpRate = fxRates.GBPINR?.midRate || 119.40;
      const eurRate = fxRates.EURINR?.midRate || 103.50;

      // Atomic Team Wallet Update
      const teamUpdateRes = await runTransaction(ref(db, `fms/teams/${teamKey}`), (tm) => {
        if (!tm) return;
        if (!tm.cashWallets) {
          tm.cashWallets = { INR: Number(tm.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
        }
        tm.cashWallets[fromCurrency] = parseFloat((Number(tm.cashWallets[fromCurrency]) - amount).toFixed(2));
        tm.cashWallets[toCurrency] = parseFloat(((Number(tm.cashWallets[toCurrency]) || 0) + toAmount).toFixed(2));
        tm.cashBalance = parseFloat((
          Number(tm.cashWallets.INR || 0) +
          Number(tm.cashWallets.USD || 0) * usdRate +
          Number(tm.cashWallets.GBP || 0) * gbpRate +
          Number(tm.cashWallets.EUR || 0) * eurRate
        ).toFixed(2));
        return tm;
      });

      if (!teamUpdateRes.committed) {
        return mockResponse({ error: 'Currency exchange failed due to team wallet concurrency. Please retry.' }, 400);
      }

      const txSeqSnap = await get(ref(db, 'fms/fxTransactions'));
      const txSeq = txSeqSnap.exists() ? Object.keys(txSeqSnap.val()).length + 1 : 1;
      const fxTxId = `FX${String(txSeq).padStart(6, '0')}`;
      const generatedTicket = ticketNumber || `FX-${Date.now().toString().slice(-4)}`;

      const fxTransaction = {
        id: fxTxId,
        ticketNumber: generatedTicket,
        timestamp: Date.now(),
        teamCode: team.teamCode,
        teamId: team.id || team.teamCode,
        teamName: team.teamName,
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount,
        effectiveRate,
        spreadPercent,
        operatorId: operatorId || 'FX-DESK',
        status: 'CONFIRMED',
        notes: notes || 'Physical FX Desk Clearance'
      };

      await set(ref(db, `fms/fxTransactions/${fxTxId}`), fxTransaction);

      await logAudit(
        operatorId || 'FX Operator',
        'fx_operator',
        'FX_CONFIRM',
        team.teamCode,
        null,
        fxTransaction,
        `Exchanged ${fromCurrency} ${amount.toLocaleString()} -> ${toCurrency} ${toAmount.toLocaleString()} @ ${effectiveRate}`
      );

      return mockResponse({ success: true, fxTransaction, team: teamUpdateRes.snapshot.val() });
    }

    // 3.2 SEBI / ADMIN FX RATE UPDATE
    if (path === '/api/fx/rates') {
      const { pair, midRate, spreadPercent, actor, reason } = body || {};
      if (!pair || !midRate || Number(midRate) <= 0) {
        return mockResponse({ error: 'Valid currency pair and positive midRate are required.' }, 400);
      }

      const fxRatesSnap = await get(ref(db, 'fms/fxRates'));
      const fxRates = fxRatesSnap.exists() ? fxRatesSnap.val() : {};
      const prevRate = fxRates[pair] || {};

      const spread = spreadPercent !== undefined ? Number(spreadPercent) : (prevRate.spreadPercent || 0.45);
      const mid = parseFloat(Number(midRate).toFixed(2));
      const buyRate = parseFloat((mid * (1 + spread / 100)).toFixed(2));
      const sellRate = parseFloat((mid * (1 - spread / 100)).toFixed(2));

      const updatedRateObj = {
        pair: prevRate.pair || `${pair.slice(0, 3)}/${pair.slice(3)}`,
        base: pair.slice(0, 3),
        quote: pair.slice(3),
        midRate: mid,
        buyRate,
        sellRate,
        spreadPercent: spread,
        lastUpdated: Date.now()
      };

      await set(ref(db, `fms/fxRates/${pair}`), updatedRateObj);

      await logAudit(
        actor || 'SEBI FX Desk',
        'sebi',
        'FX_RATE_CHANGE',
        pair,
        prevRate,
        updatedRateObj,
        reason || 'Market FX rate adjustment'
      );

      return mockResponse({ success: true, updatedRate: updatedRateObj });
    }

    // 3.5 IPO BID SUBMISSION
    if (path === '/api/ipo/bid') {
      const { ticker, quantity, teamCode } = body || {};
      const Q = Number(quantity);
      if (!ticker || isNaN(Q) || Q <= 0 || !teamCode) {
        return mockResponse({ error: 'Missing or invalid parameters: ticker, quantity, teamCode required.' }, 400);
      }

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

      const currentSessionState = marketState.sessionState || 'PRE_OPEN';
      if (currentSessionState !== 'CONTINUOUS_TRADING') {
        return mockResponse({ error: `IPO bidding is locked. Market session is currently ${currentSessionState}.` }, 400);
      }

      const secKey = Object.keys(securities).find(k => securities[k].ticker === ticker.toUpperCase());
      const teamKey = Object.keys(teams).find(k => teams[k].teamCode === teamCode.toUpperCase());

      if (!secKey || !teamKey) {
        return mockResponse({ error: 'Security or Team not found in database.' }, 400);
      }

      const security = securities[secKey];
      const team = teams[teamKey];

      if (security.status !== 'IPO_PENDING') {
        return mockResponse({ error: `IPO for ${ticker} is not open for subscription.` }, 400);
      }

      const offerPrice = security.ipoPrice || security.basePrice || 100;
      const totalCost = Q * offerPrice;
      const cashBalance = Number(team.cashBalance);

      if (cashBalance < totalCost) {
        return mockResponse({ error: `Insufficient cash to bid. Team has ₹${cashBalance.toLocaleString('en-IN')}, need ₹${totalCost.toLocaleString('en-IN')}.` }, 400);
      }

      // Deduct cash from team and record the bid
      const teamUpdateResult = await runTransaction(ref(db, `fms/teams/${teamKey}`), (tm) => {
        if (!tm) return;
        tm.cashBalance = parseFloat((tm.cashBalance - totalCost).toFixed(2));
        return tm;
      });

      if (!teamUpdateResult.committed) {
        return mockResponse({ error: 'IPO bid failed: Team state conflict. Please try again.' }, 400);
      }

      // Record bid under security
      await runTransaction(ref(db, `fms/securities/${secKey}`), (sec) => {
        if (!sec) return;
        if (!sec.bids) sec.bids = {};
        const existingBid = sec.bids[teamCode.toUpperCase()] || { quantity: 0 };
        sec.bids[teamCode.toUpperCase()] = {
          quantity: existingBid.quantity + Q,
          offerPrice,
          timestamp: Date.now()
        };
        return sec;
      });

      return mockResponse({ success: true, message: `Successfully subscribed to ${Q} units of ${ticker} at ₹${offerPrice} per unit.` });
    }

    // 3.6 CREATE PAPER TICKET ORDER
    if (path === '/api/order/create') {
      const { ticketNumber, teamCode, ticker, action, quantity, orderType, limitPrice, brokerId, notes, enteredBy } = body || {};
      const Q = Number(quantity);
      if (!ticketNumber || !teamCode || !ticker || !action || isNaN(Q) || Q <= 0) {
        return mockResponse({ error: 'Missing or invalid parameters: ticketNumber, teamCode, ticker, action, quantity are required.' }, 400);
      }

      // Check for duplicate ticket number
      const ordersSnap = await get(ref(db, 'fms/orders'));
      if (ordersSnap.exists()) {
        const orders = ordersSnap.val();
        const duplicate = Object.values(orders).find(o => String(o.ticketNumber).toUpperCase() === String(ticketNumber).toUpperCase());
        if (duplicate) {
          return mockResponse({ error: `Duplicate Ticket Number: Ticket #${ticketNumber} has already been logged.` }, 400);
        }
      }

      const orderId = `ORD_${Date.now()}`;
      const orderObj = {
        id: orderId,
        ticketNumber,
        teamCode: teamCode.toUpperCase(),
        ticker: ticker.toUpperCase(),
        action: action.toUpperCase(),
        quantity: Q,
        orderType: (orderType || 'MARKET').toUpperCase(),
        limitPrice: limitPrice ? Number(limitPrice) : null,
        brokerId: brokerId || 'B01',
        notes: notes || '',
        status: 'PENDING',
        timestamp: Date.now(),
        enteredBy: enteredBy || 'Broker Terminal'
      };

      await set(ref(db, `fms/orders/${orderId}`), orderObj);
      return mockResponse({ success: true, orderId, order: orderObj });
    }

    // 3.7 EXECUTE PAPER TICKET ORDER ACTION
    if (path === '/api/order/action') {
      const { orderId, actionType, rejectionReason } = body || {};
      if (!orderId || !actionType) {
        return mockResponse({ error: 'Missing parameters: orderId and actionType required.' }, 400);
      }

      let errorMessage = null;
      let orderStatus = '';

      const result = await runTransaction(ref(db, 'fms'), (fms) => {
        if (!fms) return;
        if (!fms.orders || !fms.orders[orderId]) {
          errorMessage = 'Order not found in database.';
          return;
        }

        const order = fms.orders[orderId];
        orderStatus = order.status;

        if (order.status === 'EXECUTED') {
          errorMessage = 'Order has already been executed.';
          return;
        }

        if (actionType === 'EXECUTE') {
          if (order.status !== 'PENDING' && order.status !== 'VALIDATED') {
            errorMessage = `Cannot execute order in ${order.status} state.`;
            return;
          }
        }

        if (actionType === 'VALIDATE') {
          if (order.status !== 'PENDING') {
            errorMessage = `Cannot validate order in ${order.status} state.`;
            return;
          }
          order.status = 'VALIDATED';
          orderStatus = 'VALIDATED';
          return fms;
        }

        if (actionType === 'REJECT') {
          order.status = 'REJECTED';
          order.rejectionReason = rejectionReason || 'Rejected by exchange admin.';
          orderStatus = 'REJECTED';
          return fms;
        }

        if (actionType === 'CANCEL') {
          order.status = 'CANCELLED';
          orderStatus = 'CANCELLED';
          return fms;
        }

        // Validate and execute steps
        const currentSessionState = fms.marketState?.sessionState || 'PRE_OPEN';
        if (currentSessionState !== 'CONTINUOUS_TRADING') {
          order.status = 'REJECTED';
          order.rejectionReason = `Trading is locked. Market session is currently ${currentSessionState}.`;
          return fms;
        }
        const security = Object.values(fms.securities || {}).find(s => s.ticker === order.ticker);
        const team = fms.teams?.[order.teamCode];

        if (!security) {
          order.status = 'REJECTED';
          order.rejectionReason = `Security ${order.ticker} not found.`;
          return fms;
        }

        if (!team) {
          order.status = 'REJECTED';
          order.rejectionReason = `Team ${order.teamCode} not found.`;
          return fms;
        }

        if (security.status !== 'Active') {
          order.status = 'REJECTED';
          order.rejectionReason = `Security is ${security.status} — trading suspended.`;
          return fms;
        }

        const executionPrice = order.orderType === 'LIMIT' && order.limitPrice ? order.limitPrice : security.currentPrice;
        const totalValue = order.quantity * executionPrice;
        const impactFactor = order.quantity / security.totalUnits;
        const priceChangePercent = impactFactor * security.volatility * 100;

        // Price band checks
        const openingPrice = security.openingPrice || security.basePrice || 100;
        const bandPercent = fms.marketState?.priceBandPercent || (fms.settings && fms.settings.priceBandPercent) || 10;
        const lowerLimit = parseFloat((openingPrice * (1 - bandPercent / 100)).toFixed(2));
        const upperLimit = parseFloat((openingPrice * (1 + bandPercent / 100)).toFixed(2));

        let proposedNewPrice = 0;
        if (order.action === 'BUY') {
          proposedNewPrice = parseFloat((executionPrice * (1 + priceChangePercent / 100)).toFixed(2));
        } else {
          proposedNewPrice = Math.max(1, parseFloat((executionPrice * (1 - priceChangePercent / 100)).toFixed(2)));
        }

        if (proposedNewPrice < lowerLimit || proposedNewPrice > upperLimit) {
          order.status = 'REJECTED';
          order.rejectionReason = `Price band violation (±${bandPercent}% limit). Range: ₹${lowerLimit.toFixed(2)} - ₹${upperLimit.toFixed(2)}. proposed: ₹${proposedNewPrice.toFixed(2)}`;
          return fms;
        }

        // Cash check
        if (order.action === 'BUY') {
          if (team.cashBalance < totalValue) {
            order.status = 'REJECTED';
            order.rejectionReason = `Insufficient cash. Need ₹${totalValue.toLocaleString()}, balance is ₹${Number(team.cashBalance).toLocaleString()}.`;
            return fms;
          }
        }

        // Holdings check
        if (order.action === 'SELL') {
          const currentHolding = Number(team.holdings?.[order.ticker] || 0);
          if (currentHolding < order.quantity) {
            order.status = 'REJECTED';
            order.rejectionReason = `Insufficient holdings. Need ${order.quantity} units, holds ${currentHolding}.`;
            return fms;
          }
        }

        if (actionType === 'VALIDATE') {
          order.status = 'VALIDATED';
          orderStatus = 'VALIDATED';
          return fms;
        }

        if (actionType === 'EXECUTE') {
          // Commit trade changes atomically
          if (order.action === 'BUY') {
            security.currentPrice = proposedNewPrice;
            security.availableUnits -= order.quantity;
            team.cashBalance = parseFloat((team.cashBalance - totalValue).toFixed(2));
            if (!team.holdings) team.holdings = {};
            team.holdings[order.ticker] = (team.holdings[order.ticker] || 0) + order.quantity;
          } else {
            security.currentPrice = proposedNewPrice;
            security.availableUnits += order.quantity;
            team.cashBalance = parseFloat((team.cashBalance + totalValue).toFixed(2));
            team.holdings[order.ticker] -= order.quantity;
            if (team.holdings[order.ticker] <= 0) {
              delete team.holdings[order.ticker];
            }
          }

          security.tradingVolume = (security.tradingVolume || 0) + order.quantity;
          security.dayHigh = Math.max(security.dayHigh || 0, security.currentPrice);
          security.dayLow = Math.min(security.dayLow || security.currentPrice, security.currentPrice);

          if (!security.priceHistory) security.priceHistory = [];
          security.priceHistory.push({ timestamp: Date.now(), price: security.currentPrice });
          if (security.priceHistory.length > 50) security.priceHistory.shift();

          // Log transaction
          const txCount = Object.keys(fms.transactions || {}).length;
          const txId = `TX${String(txCount + 1).padStart(4, '0')}`;
          if (!fms.transactions) fms.transactions = {};
          fms.transactions[txId] = {
            id: txId,
            timestamp: Date.now(),
            teamId: team.teamCode,
            teamCode: team.teamCode,
            teamName: team.teamName,
            teamType: 'Retail',
            securityId: security.id,
            ticker: security.ticker,
            action: order.action,
            quantity: order.quantity,
            priceAtExecution: executionPrice,
            totalValue,
            enteredBy: order.enteredBy || 'Staff Desk',
            voided: false
          };

          // Update index
          let totalChange = 0;
          let activeCount = 0;
          Object.values(fms.securities || {}).forEach(s => {
            if (s.status === 'Active') {
              const pct = ((s.currentPrice - s.basePrice) / s.basePrice) * 100;
              totalChange += pct;
              activeCount++;
            }
          });
          fms.marketState.marketIndex = activeCount > 0 ? parseFloat((totalChange / activeCount).toFixed(2)) : 0;
          fms.marketState.totalTradesCount = (fms.marketState.totalTradesCount || 0) + 1;
          fms.marketState.lastUpdated = Date.now();

          order.status = 'EXECUTED';
          orderStatus = 'EXECUTED';
          order.priceAtExecution = executionPrice;

          // Side-effect flag priceHistory
          if (!fms.priceHistory) fms.priceHistory = {};
          if (!fms.priceHistory[security.ticker]) fms.priceHistory[security.ticker] = {};
          fms.priceHistory[security.ticker][Date.now()] = { price: security.currentPrice };

          return fms;
        }
      });

      if (errorMessage) return mockResponse({ error: errorMessage }, 400);
      if (!result.committed) return mockResponse({ error: 'Failed to process order due to concurrency conflict.' }, 500);

      // Update simulated indices in database
      if (actionType === 'EXECUTE' && result.snapshot && result.snapshot.val()) {
        await updateMarketIndices(result.snapshot.val().securities);
      }

      return mockResponse({ success: true, orderStatus });
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
            pausedAt: null,
            sessionState: 'PRE_OPEN',
            mode: 'DEMO',
            timeString: '09:15 AM',
            timeLeftString: '60:00'
          };
        }

        if (action === 'START') {
          marketState.status = 'Open';
          marketState.sessionState = 'CONTINUOUS_TRADING';
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
          marketState.sessionState = 'CLOSING';
          setTakeoverEvent({ type: 'CLOSING_BELL' }, 6000);
        } else if (action === 'SET_MODE') {
          marketState.mode = body.mode;
        } else if (action === 'TRANSITION_SESSION') {
          marketState.sessionState = body.sessionState;
          if (body.sessionState === 'CONTINUOUS_TRADING') {
            marketState.status = 'Open';
          } else if (body.sessionState === 'CLOSING' || body.sessionState === 'MARKET_CLOSED') {
            marketState.status = 'Closed';
          }
        }

        marketState.lastUpdated = now;
        updatedMarketState = marketState;
        return marketState;
      });

      // Side-effect: Sector / Market wide actions
      if (action === 'PAUSE_SECTOR') {
        const sector = body.sector;
        await runTransaction(ref(db, 'fms/securities'), (secs) => {
          if (!secs) return;
          Object.keys(secs).forEach(k => {
            if (secs[k].sector === sector && secs[k].status === 'Active') {
              secs[k].status = 'Halted';
            }
          });
          return secs;
        });
      } else if (action === 'RESUME_SECTOR') {
        const sector = body.sector;
        await runTransaction(ref(db, 'fms/securities'), (secs) => {
          if (!secs) return;
          Object.keys(secs).forEach(k => {
            if (secs[k].sector === sector && secs[k].status === 'Halted') {
              secs[k].status = 'Active';
            }
          });
          return secs;
        });
      } else if (action === 'HALT_ALL_TRADING') {
        await runTransaction(ref(db, 'fms/securities'), (secs) => {
          if (!secs) return;
          Object.keys(secs).forEach(k => {
            if (secs[k].status === 'Active') {
              secs[k].status = 'Halted';
            }
          });
          return secs;
        });
        await update(ref(db, 'fms/marketState'), { status: 'Closed', sessionState: 'CLOSING' });
      } else if (action === 'RESUME_ALL_TRADING') {
        await runTransaction(ref(db, 'fms/securities'), (secs) => {
          if (!secs) return;
          Object.keys(secs).forEach(k => {
            if (secs[k].status === 'Halted') {
              secs[k].status = 'Active';
            }
          });
          return secs;
        });
        await update(ref(db, 'fms/marketState'), { status: 'Open', sessionState: 'CONTINUOUS_TRADING' });
      }

      return mockResponse({ success: true, marketState: updatedMarketState });
    }

    // 4.5 RECONCILE MARKET & LEADERBOARD DETERMINATION
    if (path === '/api/admin/reconcile') {
      const { confirmText, confirmPhrase, actor } = body || {};
      const confirm = confirmText || confirmPhrase;
      if (confirm !== 'RECONCILE MARKET' && confirm !== 'RECONCILE') {
        return mockResponse({ error: 'Confirmation required. Type "RECONCILE MARKET" to proceed.' }, 400);
      }

      const [teamsSnap, securitiesSnap, fxRatesSnap, txSnap, settingsSnap] = await Promise.all([
        get(ref(db, 'fms/teams')),
        get(ref(db, 'fms/securities')),
        get(ref(db, 'fms/fxRates')),
        get(ref(db, 'fms/transactions')),
        get(ref(db, 'fms/settings'))
      ]);

      if (!teamsSnap.exists() || !securitiesSnap.exists()) {
        return mockResponse({ error: 'Database state missing.' }, 400);
      }

      const teams = teamsSnap.val();
      const securities = securitiesSnap.val();
      const fxRates = fxRatesSnap.exists() ? fxRatesSnap.val() : {};
      const transactions = txSnap.exists() ? txSnap.val() : {};
      const settings = settingsSnap.exists() ? settingsSnap.val() : {};

      const startingCapital = Number(settings.startingCapitalRetail) || 10000000;
      const usdRate = fxRates.USDINR?.midRate || 88.20;
      const gbpRate = fxRates.GBPINR?.midRate || 119.40;
      const eurRate = fxRates.EURINR?.midRate || 103.50;
      const sectorsCount = new Set(Object.values(securities).map(s => s.sector)).size || 1;

      const processed = Object.values(teams)
        .filter(t => t.isActive)
        .map(team => {
          const inrCash = Number(team.cashWallets?.INR ?? team.cashBalance ?? 0);
          const usdCashInr = Number(team.cashWallets?.USD || 0) * usdRate;
          const gbpCashInr = Number(team.cashWallets?.GBP || 0) * gbpRate;
          const eurCashInr = Number(team.cashWallets?.EUR || 0) * eurRate;
          const totalCashInr = parseFloat((inrCash + usdCashInr + gbpCashInr + eurCashInr).toFixed(2));

          let holdingsVal = 0;
          let heldSectors = new Set();
          let riskPoints = 0;
          let ipoAllotmentUnits = 0;

          Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
            const sec = Object.values(securities).find(s => s.ticker === ticker || s.id === ticker);
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

          const teamTxs = Object.values(transactions).filter(tx => (tx.teamCode === team.teamCode || tx.teamId === team.id) && !tx.voided);
          const tradeCount = teamTxs.length;
          const totalVolume = teamTxs.reduce((sum, tx) => sum + Number(tx.quantity || 0), 0);

          let maxSingleGain = 0;
          teamTxs.forEach(tx => {
            const sec = Object.values(securities).find(s => s.ticker === tx.ticker || s.id === tx.securityId);
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
            cashBalance: totalCashInr,
            cashWallets: team.cashWallets || { INR: inrCash, USD: 0, GBP: 0, EUR: 0 },
            holdingsValue: holdingsVal,
            finalNetWorth,
            portfolioValue: finalNetWorth,
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
      }

      const leaderboardMap = {};
      processed.forEach(t => {
        leaderboardMap[t.teamCode] = t;
      });

      await set(ref(db, 'fms/leaderboard'), leaderboardMap);
      await update(ref(db, 'fms/marketState'), {
        status: 'Closed',
        sessionState: 'RESULTS',
        reconciledAt: Date.now()
      });

      await logAudit(
        actor || 'SEBI Desk',
        'sebi',
        'MARKET_RECONCILE',
        'Leaderboard',
        null,
        { rank1: processed[0]?.teamCode, count: processed.length },
        'Market session reconciled, final multi-currency net worth calculated, rankings locked.'
      );

      return mockResponse({ success: true, leaderboard: processed });
    }

    // 5. DISPATCH NEWS & MARKET IMPACT ENGINE
    if (path === '/api/news') {
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
      } = body;

      const rawImpact = impactPercent !== undefined ? Number(impactPercent) : Number(priceImpactPercent || 0);
      const impact = Math.abs(rawImpact);
      const direction = sentiment === 'Positive' ? 1 : sentiment === 'Negative' ? -1 : (rawImpact >= 0 ? 1 : -1);
      const finalPriceDeltaPct = direction * impact;

      const sectorsToTarget = affectedSectors || (affectedSector ? [affectedSector] : []);
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
          if (affectedSecurityIds && (affectedSecurityIds.includes(s.ticker) || affectedSecurityIds.includes(s.id))) {
            targetSecurities.push(s);
          } else if (sectorsToTarget.length > 0 && sectorsToTarget.includes(s.sector)) {
            targetSecurities.push(s);
          }
        }
      });

      // 2. Perform narrow transaction updates on each target security individual node
      for (const targetSec of targetSecurities) {
        await runTransaction(ref(db, `fms/securities/${targetSec.ticker}`), (security) => {
          if (!security) return targetSec;
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
          return security;
        });
      }

      // Optional FX Impact
      if (fxImpactPercent) {
        const fxPairKey = targetPair || 'USDINR';
        await runTransaction(ref(db, `fms/fxRates/${fxPairKey}`), (rateObj) => {
          if (!rateObj) return rateObj;
          rateObj.midRate = parseFloat((rateObj.midRate * (1 + Number(fxImpactPercent) / 100)).toFixed(2));
          return rateObj;
        });
      }

      // 3. Write news item directly to database
      newsItem = {
        id: newsId,
        headline,
        description: description || summary || '',
        summary: summary || description || '',
        affectedSecurityIds: targetSecurities.map(t => t.ticker),
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

      await set(ref(db, `fms/newsEvents/${newsId}`), newsItem);

      // Log to audit log
      const auditId = `AUD_${Date.now()}`;
      await set(ref(db, `fms/auditLog/${auditId}`), {
        id: auditId,
        timestamp: Date.now(),
        role: 'ADMIN',
        action: `NEWS_DISPATCH: ${headline}`,
        details: `Category: ${category || 'Macro'} | Impact: ${finalPriceDeltaPct}% on ${targetSecurities.length} assets`
      });

      // 4. Trigger news flash takeover for high-severity
      if (newsItem.severity === 'CRITICAL' || newsItem.severity === 'BREAKING' || newsItem.severity === 'IMPORTANT') {
        setTakeoverEvent({
          type: 'NEWS_FLASH',
          name: headline,
          headline: headline,
          ticker: description || 'Breaking Market Alert',
          description: description || 'Market moving event',
          category: newsItem.category,
          severity: newsItem.severity,
          impactPercent: finalPriceDeltaPct
        }, 8000);
      }

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

          const secCur = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR');
          const fxRates = fms.fxRates || { USDINR: { midRate: 88.20 }, GBPINR: { midRate: 119.40 }, EURINR: { midRate: 103.50 } };
          const usdRate = fxRates.USDINR?.midRate || 88.20;
          const gbpRate = fxRates.GBPINR?.midRate || 119.40;
          const eurRate = fxRates.EURINR?.midRate || 103.50;

          Object.keys(fms.teams || {}).forEach(k => {
            const team = fms.teams[k];
            if (team.holdings && team.holdings[security.ticker]) {
              const qty = team.holdings[security.ticker];
              const payout = parseFloat((qty * dividendAmount).toFixed(2));
              if (!team.cashWallets) team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
              team.cashWallets[secCur] = parseFloat(((team.cashWallets[secCur] || 0) + payout).toFixed(2));
              team.cashBalance = parseFloat((
                Number(team.cashWallets.INR || 0) +
                Number(team.cashWallets.USD || 0) * usdRate +
                Number(team.cashWallets.GBP || 0) * gbpRate +
                Number(team.cashWallets.EUR || 0) * eurRate
              ).toFixed(2));
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
          const secCur = tx.localCurrency || (security ? (security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : 'INR')) : 'INR');
          if (!team.cashWallets) team.cashWallets = { INR: Number(team.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };

          const fxRates = fms.fxRates || { USDINR: { midRate: 88.20 }, GBPINR: { midRate: 119.40 }, EURINR: { midRate: 103.50 } };
          const usdRate = fxRates.USDINR?.midRate || 88.20;
          const gbpRate = fxRates.GBPINR?.midRate || 119.40;
          const eurRate = fxRates.EURINR?.midRate || 103.50;

          if (tx.action === 'BUY') {
            team.cashWallets[secCur] = parseFloat(((team.cashWallets[secCur] || 0) + Number(tx.totalValue)).toFixed(2));
            if (team.holdings && team.holdings[tx.ticker]) {
              team.holdings[tx.ticker] -= Number(tx.quantity);
              if (team.holdings[tx.ticker] <= 0) {
                delete team.holdings[tx.ticker];
              }
            }
          } else if (tx.action === 'SELL') {
            team.cashWallets[secCur] = parseFloat(((team.cashWallets[secCur] || 0) - Number(tx.totalValue)).toFixed(2));
            if (!team.holdings) team.holdings = {};
            team.holdings[tx.ticker] = (team.holdings[tx.ticker] || 0) + Number(tx.quantity);
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

        // Auto-activate pending IPOs if 60 seconds have elapsed since announcement (subscription period)
        let fmsUpdated = false;
        if (fms.securities) {
          Object.keys(fms.securities).forEach(k => {
            const s = fms.securities[k];
            if (s.status === 'IPO_PENDING') {
              const firstHistory = s.priceHistory && s.priceHistory.length > 0 ? s.priceHistory[0] : null;
              const announcedTime = firstHistory ? firstHistory.timestamp : null;
              if (announcedTime && (currentServerTime - announcedTime >= 60000)) {
                // Execute IPO Allotment Engine
                const bids = s.bids || {};
                const totalBidsCount = Object.values(bids).reduce((acc, b) => acc + Number(b.quantity), 0);
                const availableUnits = s.totalUnits || 100000;
                s.ipoPrice = s.ipoPrice || s.basePrice || 100;

                if (totalBidsCount > 0) {
                  if (totalBidsCount > availableUnits) {
                    // Oversubscribed! Pro-rata allotment
                    const allotmentRatio = availableUnits / totalBidsCount;
                    const oversubscriptionTimes = totalBidsCount / availableUnits;
                    const spikePercent = Math.min(100, (oversubscriptionTimes - 1) * 15);
                    const spikedPrice = parseFloat((s.ipoPrice * (1 + spikePercent / 100)).toFixed(2));

                    s.currentPrice = spikedPrice;
                    s.openingPrice = spikedPrice;
                    s.dayHigh = spikedPrice;
                    s.dayLow = spikedPrice;
                    s.availableUnits = 0;

                    // Allot shares and refund remaining cash to teams
                    Object.entries(bids).forEach(([teamCode, bid]) => {
                      const teamObj = fms.teams[teamCode];
                      if (teamObj) {
                        const bidQty = Number(bid.quantity);
                        const allottedQty = Math.floor(bidQty * allotmentRatio);
                        const unusedQty = bidQty - allottedQty;
                        const refundAmount = parseFloat((unusedQty * s.ipoPrice).toFixed(2));

                        teamObj.cashBalance = parseFloat((Number(teamObj.cashBalance) + refundAmount).toFixed(2));
                        if (!teamObj.holdings) teamObj.holdings = {};
                        teamObj.holdings[s.ticker] = (teamObj.holdings[s.ticker] || 0) + allottedQty;
                      }
                    });

                    // Log listing corporate action / news
                    const newsId = `NEWS_${Date.now()}_${s.ticker}`;
                    if (!fms.newsEvents) fms.newsEvents = {};
                    fms.newsEvents[newsId] = {
                      id: newsId,
                      timestamp: Date.now(),
                      headline: `IPO Listing: ${s.name} Lists at ₹${spikedPrice} (+${spikePercent.toFixed(1)}% Spike on Blockbuster ${oversubscriptionTimes.toFixed(1)}x Oversubscription!)`,
                      content: `${s.name} (${s.ticker}) has successfully listed on the exchange. The IPO received bids for ${totalBidsCount.toLocaleString()} units out of ${availableUnits.toLocaleString()} units offered. Allotted shares have been credited, and unallotted bid capital refunded.`,
                      urgency: 'HIGH',
                      category: 'Market',
                      affectedSecurityIds: [s.id]
                    };
                  } else {
                    // Undersubscribed or equal! 100% allotment
                    s.currentPrice = s.ipoPrice;
                    s.openingPrice = s.ipoPrice;
                    s.dayHigh = s.ipoPrice;
                    s.dayLow = s.ipoPrice;
                    s.availableUnits = availableUnits - totalBidsCount;

                    Object.entries(bids).forEach(([teamCode, bid]) => {
                      const teamObj = fms.teams[teamCode];
                      if (teamObj) {
                        const bidQty = Number(bid.quantity);
                        if (!teamObj.holdings) teamObj.holdings = {};
                        teamObj.holdings[s.ticker] = (teamObj.holdings[s.ticker] || 0) + bidQty;
                      }
                    });

                    const newsId = `NEWS_${Date.now()}_${s.ticker}`;
                    if (!fms.newsEvents) fms.newsEvents = {};
                    fms.newsEvents[newsId] = {
                      id: newsId,
                      timestamp: Date.now(),
                      headline: `IPO Listing: ${s.name} Lists at Par of ₹${s.ipoPrice}`,
                      content: `${s.name} (${s.ticker}) has successfully listed on the exchange. The IPO received bids for ${totalBidsCount.toLocaleString()} units out of ${availableUnits.toLocaleString()} units offered.`,
                      urgency: 'MEDIUM',
                      category: 'Market',
                      affectedSecurityIds: [s.id]
                    };
                  }
                } else {
                  // No bids! Just list at par
                  s.currentPrice = s.ipoPrice;
                  s.openingPrice = s.ipoPrice;
                  s.dayHigh = s.ipoPrice;
                  s.dayLow = s.ipoPrice;
                  s.availableUnits = availableUnits;
                }

                s.bids = null;
                s.status = 'Active';
                
                // Add initial listing tick to flat history
                if (!fms.priceHistory) fms.priceHistory = {};
                if (!fms.priceHistory[s.ticker]) fms.priceHistory[s.ticker] = {};
                fms.priceHistory[s.ticker][Date.now()] = { price: s.currentPrice };

                fmsUpdated = true;
              }
            }
          });
        }

        const currentSessionState = fms.marketState?.sessionState || 'PRE_OPEN';
        const isMarketOpen = currentSessionState === 'CONTINUOUS_TRADING';
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

      if (result.committed) {
        if (result.snapshot && result.snapshot.val()) {
          await updateMarketIndices(result.snapshot.val().securities);
        }
        if (firedNews) {
          setTakeoverEvent({
            type: 'NEWS_FLASH',
            name: firedNews.headline,
            ticker: firedNews.description || 'Breaking Market Alert'
          }, 8000);
          return mockResponse({ success: true, firedNews });
        }
        return mockResponse({ success: true });
      }

      return mockResponse({ success: false });
    }

    // 15. RECONCILIATION & FINAL LEADERBOARD GENERATION
    if (path === '/api/admin/reconcile') {
      const { confirmText, actor } = body || {};
      if (confirmText !== 'RECONCILE MARKET') {
        return mockResponse({ error: 'Confirmation required. Type "RECONCILE MARKET" to proceed.' }, 400);
      }

      const [securitiesSnap, teamsSnap, transactionsSnap, newsEventsSnap, marketStateSnap] = await Promise.all([
        get(ref(db, 'fms/securities')),
        get(ref(db, 'fms/teams')),
        get(ref(db, 'fms/transactions')),
        get(ref(db, 'fms/newsEvents')),
        get(ref(db, 'fms/marketState'))
      ]);

      const securities = securitiesSnap.val() || {};
      const teams = teamsSnap.val() || {};
      const transactions = transactionsSnap.val() || {};
      const newsEvents = newsEventsSnap.val() || {};
      const mState = marketStateSnap.val() || {};

      const startingCapital = 1000000;
      const sectorsCount = new Set(Object.values(securities).map(s => s.sector)).size || 1;

      // 1. Process team holdings & compute final Net Worth, ROI, P&L, Trades, Volumes, Diversity & Risk scores
      const processed = Object.values(teams)
        .filter(t => t.isActive)
        .map(team => {
          let holdingsVal = 0;
          let heldSectors = new Set();
          let riskPoints = 0;
          let ipoAllotmentUnits = 0;

          Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
            const sec = Object.values(securities).find(s => s.ticker === ticker || s.id === ticker);
            if (sec && qty > 0) {
              const val = qty * (sec.currentPrice || sec.basePrice);
              holdingsVal += val;
              if (sec.sector) heldSectors.add(sec.sector);
              const rWeight = sec.riskRating === 'High' ? 3 : sec.riskRating === 'Medium' ? 2 : 1;
              riskPoints += rWeight * val;
              if (sec.type === 'IPO' || sec.ipoStatus === 'ALLOTTED') {
                ipoAllotmentUnits += qty;
              }
            }
          });

          const finalNetWorth = parseFloat((Number(team.cashBalance) + holdingsVal).toFixed(2));
          const totalPnL = parseFloat((finalNetWorth - startingCapital).toFixed(2));
          const roi = parseFloat(((totalPnL / startingCapital) * 100).toFixed(2));
          const divScore = parseFloat(((heldSectors.size / sectorsCount) * 10).toFixed(1));
          const riskScore = holdingsVal > 0 ? parseFloat((riskPoints / holdingsVal).toFixed(1)) : 1.0;

          const teamTxs = Object.values(transactions).filter(tx => (tx.teamCode === team.teamCode || tx.teamId === team.teamCode) && !tx.voided);
          const tradeCount = teamTxs.length;
          const totalVolume = teamTxs.reduce((sum, tx) => sum + Number(tx.quantity || 0), 0);

          let maxSingleGain = 0;
          teamTxs.forEach(tx => {
            const sec = Object.values(securities).find(s => s.ticker === tx.ticker || s.id === tx.securityId);
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

      // 2. Sort ranking by finalNetWorth descending
      processed.sort((a, b) => {
        if (b.finalNetWorth !== a.finalNetWorth) return b.finalNetWorth - a.finalNetWorth;
        if (b.roi !== a.roi) return b.roi - a.roi;
        if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount;
        return (a.teamCode || '').localeCompare(b.teamCode || '');
      });
      processed.forEach((t, idx) => {
        t.rank = idx + 1;
      });

      // 3. Award Badges
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

        const allValidTxs = Object.values(transactions).filter(tx => !tx.voided && tx.timestamp).sort((a, b) => a.timestamp - b.timestamp);
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

      // 4. Save to fms/leaderboard and update market state
      const leaderboardMap = {};
      processed.forEach(t => {
        leaderboardMap[t.teamCode] = t;
      });

      await set(ref(db, 'fms/leaderboard'), leaderboardMap);
      await update(ref(db, 'fms/marketState'), {
        status: 'Closed',
        sessionState: 'RESULTS',
        timeString: '04:00 PM',
        timeLeftString: 'RESULTS UNLOCKED',
        reconciledAt: Date.now()
      });

      // 5. Create backup snapshot
      const backupKey = `RECONCILED_${mState.sessionId || 'SESSION'}_${Date.now()}`;
      const fmsSnap = await get(ref(db, 'fms'));
      if (fmsSnap.exists()) {
        await set(ref(db, `fms/backups/${backupKey}`), fmsSnap.val());
      }

      await logAuditEvent({
        actor: actor || 'SEBI Desk',
        role: 'sebi',
        action: 'MARKET_RECONCILE',
        target: 'Leaderboard',
        newState: { rank1: processed[0]?.teamCode, count: processed.length },
        reason: 'Market session reconciled, final net worth calculated, rankings deterministic and locked.'
      });

      return mockResponse({ success: true, leaderboard: processed });
    }

    // 16. MANUAL / PERIODIC BACKUP SNAPSHOT
    if (path === '/api/admin/backup') {
      const fmsSnap = await get(ref(db, 'fms'));
      if (!fmsSnap.exists()) {
        return mockResponse({ error: 'Database empty.' }, 400);
      }
      const data = fmsSnap.val();
      const timestamp = Date.now();
      const backupId = `BACKUP_${data.marketState?.sessionId || 'SAAMX'}_${timestamp}`;
      await set(ref(db, `fms/backups/${backupId}`), {
        ...data,
        backupTimestamp: timestamp,
        backupType: body.type || 'MANUAL'
      });
      await logAuditEvent({
        actor: body.actor || 'Admin',
        role: 'admin',
        action: 'STATE_BACKUP',
        target: backupId,
        reason: body.reason || 'State backup snapshot created'
      });
      return mockResponse({ success: true, backupId, timestamp });
    }

    // 17. RESTORE BACKUP SNAPSHOT
    if (path === '/api/admin/restore') {
      const { backupId, confirmText, actor } = body || {};
      if (confirmText !== `RESTORE ${backupId}`) {
        return mockResponse({ error: `Confirmation mismatch. Please type exactly "RESTORE ${backupId}".` }, 400);
      }
      const backupSnap = await get(ref(db, `fms/backups/${backupId}`));
      if (!backupSnap.exists()) {
        return mockResponse({ error: `Backup ${backupId} not found.` }, 404);
      }
      const backupData = backupSnap.val();
      const existingBackupsSnap = await get(ref(db, 'fms/backups'));
      const backups = existingBackupsSnap.exists() ? existingBackupsSnap.val() : {};
      
      const restoredState = {
        ...backupData,
        backups
      };
      await set(ref(db, 'fms'), restoredState);
      await logAuditEvent({
        actor: actor || 'Admin',
        role: 'admin',
        action: 'STATE_RESTORE',
        target: backupId,
        reason: 'Restored system state from backup snapshot.'
      });
      return mockResponse({ success: true, message: `System state restored from ${backupId}` });
    }

    // 18. GET AUDIT LOG
    if (path === '/api/audit-log') {
      const auditSnap = await get(ref(db, 'fms/auditLog'));
      const log = auditSnap.exists() ? Object.values(auditSnap.val()).sort((a, b) => b.timestamp - a.timestamp) : [];
      return mockResponse({ success: true, log });
    }

    // 19. PRIVACY-PROTECTED TEAM PORTFOLIO ENDPOINT
    if (path.startsWith('/api/team/portfolio') || path === '/api/portfolio') {
      const targetTeam = body.teamCode || options.teamCode;
      const requestActor = body.actorTeamCode || options.actorTeamCode;
      
      if (requestActor && targetTeam && requestActor.toUpperCase() !== targetTeam.toUpperCase() && !['admin', 'sebi', 'exchange'].includes(options.role)) {
        return mockResponse({ error: '403 Forbidden: You are not authorized to view another team\'s portfolio.' }, 403);
      }
      const teamSnap = await get(ref(db, `fms/teams/${targetTeam?.toUpperCase()}`));
      if (!teamSnap.exists()) {
        return mockResponse({ error: 'Team not found.' }, 404);
      }
      return mockResponse({ success: true, team: teamSnap.val() });
    }

    // 20. TEAM STATUS TOGGLE
    if (path === '/api/admin/team/toggle-status') {
      const { teamCode, isActive } = body || {};
      if (!teamCode) return mockResponse({ error: 'teamCode is required.' }, 400);
      const codeUpper = teamCode.toUpperCase();
      let updatedIsActive = true;
      await runTransaction(ref(db, `fms/teams/${codeUpper}`), (t) => {
        if (!t) return;
        t.isActive = isActive !== undefined ? Boolean(isActive) : (t.isActive === false ? true : false);
        updatedIsActive = t.isActive;
        return t;
      });
      return mockResponse({ success: true, teamCode: codeUpper, isActive: updatedIsActive });
    }

    // 21. BATCH SET ACTIVE TEAMS COUNT
    if (path === '/api/admin/teams/set-active-count') {
      const { activeCount } = body || {};
      const count = parseInt(activeCount, 10);
      if (isNaN(count) || count < 0) return mockResponse({ error: 'Valid activeCount required.' }, 400);
      
      const teamsSnap = await get(ref(db, 'fms/teams'));
      if (teamsSnap.exists()) {
        const teams = teamsSnap.val();
        const updates = {};
        Object.keys(teams).forEach((k, idx) => {
          updates[`fms/teams/${k}/isActive`] = idx < count;
        });
        await update(ref(db), updates);
      }
      return mockResponse({ success: true, activeCount: count });
    }

    // 22. FX CURRENCY CONVERT
    if (path === '/api/fx/convert') {
      const { teamCode, fromCurrency, toCurrency, amount } = body || {};
      const A = Number(amount);
      if (!teamCode || !fromCurrency || !toCurrency || isNaN(A) || A <= 0) {
        return mockResponse({ error: 'Valid teamCode, fromCurrency, toCurrency, positive amount required.' }, 400);
      }
      const codeUpper = teamCode.toUpperCase();
      let cred = 0;
      let balanceError = false;

      const fxRatesSnap = await get(ref(db, 'fms/fxRates'));
      const activeRates = fxRatesSnap.exists() ? fxRatesSnap.val() : {
        USDINR: { midRate: 88.20 },
        GBPINR: { midRate: 119.40 },
        EURINR: { midRate: 103.50 }
      };
      const usdRate = activeRates.USDINR?.midRate || 88.20;
      const gbpRate = activeRates.GBPINR?.midRate || 119.40;
      const eurRate = activeRates.EURINR?.midRate || 103.50;

      const teamRes = await runTransaction(ref(db, `fms/teams/${codeUpper}`), (t) => {
        if (!t) return;
        if (!t.cashWallets) t.cashWallets = { INR: Number(t.cashBalance) || 0, USD: 0, GBP: 0, EUR: 0 };
        if ((t.cashWallets[fromCurrency] || 0) < A) {
          balanceError = true;
          return;
        }

        if (fromCurrency === 'INR' && toCurrency === 'USD') cred = parseFloat((A / usdRate).toFixed(2));
        else if (fromCurrency === 'USD' && toCurrency === 'INR') cred = parseFloat((A * usdRate).toFixed(2));
        else if (fromCurrency === 'INR' && toCurrency === 'GBP') cred = parseFloat((A / gbpRate).toFixed(2));
        else if (fromCurrency === 'GBP' && toCurrency === 'INR') cred = parseFloat((A * gbpRate).toFixed(2));
        else if (fromCurrency === 'INR' && toCurrency === 'EUR') cred = parseFloat((A / eurRate).toFixed(2));
        else if (fromCurrency === 'EUR' && toCurrency === 'INR') cred = parseFloat((A * eurRate).toFixed(2));
        else cred = parseFloat((A).toFixed(2));

        t.cashWallets[fromCurrency] = parseFloat(((t.cashWallets[fromCurrency] || 0) - A).toFixed(2));
        t.cashWallets[toCurrency] = parseFloat(((t.cashWallets[toCurrency] || 0) + cred).toFixed(2));

        t.cashBalance = parseFloat((
          Number(t.cashWallets.INR || 0) +
          Number(t.cashWallets.USD || 0) * usdRate +
          Number(t.cashWallets.GBP || 0) * gbpRate +
          Number(t.cashWallets.EUR || 0) * eurRate
        ).toFixed(2));

        return t;
      });

      if (balanceError) {
        return mockResponse({ error: `Insufficient ${fromCurrency} balance.` }, 400);
      }
      if (!teamRes.committed) {
        return mockResponse({ error: 'FX conversion failed due to team concurrency.' }, 500);
      }

      await logAuditEvent({
        actor: 'FX Exchange',
        role: 'fx_operator',
        action: 'FX_CONVERT',
        target: codeUpper,
        reason: `Converted ${fromCurrency} ${A} -> ${toCurrency} ${cred}`
      });

      return mockResponse({ success: true, debited: A, credited: cred, team: teamRes.snapshot.val() });
    }

    // 23. IPOS LIST
    if (path === '/api/ipos') {
      const secSnap = await get(ref(db, 'fms/securities'));
      const secs = secSnap.exists() ? Object.values(secSnap.val()) : [];
      const ipos = secs.filter(s => s.simulationLabel || s.ipoStatus || s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED');
      return mockResponse({ success: true, ipos });
    }

    // 24. UNIFIED MASTER EVENT TRIGGER
    if (path === '/api/events/trigger') {
      const { event, impactMultiplier = 1.0, actor = 'Admin' } = body;
      if (!event || !event.id) {
        return mockResponse({ error: 'Missing event payload.' }, 400);
      }

      const fmsSnap = await get(ref(db, 'fms'));
      const currentFms = fmsSnap.exists() ? fmsSnap.val() : {};

      const { nextState, newsEntry, modifiedSecurities } = calculateEventImpact(event, currentFms, { impactMultiplier, actor });

      // Persist modifications to Firebase
      const updates = {};
      if (modifiedSecurities && modifiedSecurities.length > 0) {
        modifiedSecurities.forEach(m => {
          updates[`fms/securities/${m.ticker}`] = nextState.securities[m.ticker];
        });
      }
      updates[`fms/newsEvents/${newsEntry.id}`] = newsEntry;
      updates[`fms/events/${event.id}`] = nextState.events[event.id];
      if (nextState.marketState.takeoverEvent) {
        updates['fms/marketState/takeoverEvent'] = nextState.marketState.takeoverEvent;
      }
      if (nextState.fxRates) {
        updates['fms/fxRates'] = nextState.fxRates;
      }

      await update(ref(db), updates);
      await updateMarketIndices(nextState.securities);

      return mockResponse({ success: true, newsEntry, modifiedSecurities });
    }

    // 25. BULL / BEAR STANCE & STATEMENT PUBLISHING
    if (path === '/api/bull-bear/statement') {
      const { role, stance, confidence, targetSectors, riskAreas, statement, author = 'Analyst' } = body;
      if (!role || !statement) {
        return mockResponse({ error: 'Role and statement required.' }, 400);
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

      const updates = {};
      updates[`fms/bullBear/${roleKey}`] = stanceEntry;
      updates[`fms/newsEvents/${newsId}`] = newsEntry;
      await update(ref(db), updates);

      return mockResponse({ success: true, stanceEntry, newsEntry });
    }

    // 26. BULL VS BEAR LIVE DEBATE SHOWDOWN
    if (path === '/api/bull-bear/debate') {
      const { topic, round = 1, active = true } = body;
      const now = Date.now();
      const debateData = {
        topic: topic || 'AI Megacap Valuations vs Market Fundamentals',
        round: Number(round) || 1,
        active: Boolean(active),
        startedAt: now
      };

      const updates = {
        'fms/bullBear/activeDebate': debateData
      };

      if (active) {
        const takeoverId = `TAKEOVER_DEBATE_${now}`;
        updates['fms/marketState/takeoverEvent'] = {
          id: takeoverId,
          type: 'DEBATE_SHOWDOWN',
          headline: `⚔️ LIVE MARKET DEBATE: BULL 🐂 VS BEAR 🐻`,
          description: `Floor showdown active: ${debateData.topic}. Participants cast sentiment votes in Market Intelligence.`,
          tier: 'TIER_1',
          category: 'DEBATE',
          audioCue: 'breaking_news',
          triggeredAt: now
        };
      }

      await update(ref(db), updates);
      return mockResponse({ success: true, debateData });
    }

    // 27. BROKER ADVISORY RECOMMENDATIONS
    if (path === '/api/broker/recommendation') {
      const { brokerName, ticker, recommendation, confidence, reasoning, riskLevel = 'MEDIUM', timeframe = 'MEDIUM' } = body;
      if (!ticker || !recommendation) {
        return mockResponse({ error: 'Ticker and recommendation required.' }, 400);
      }

      const recId = `REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const recData = {
        id: recId,
        brokerName: brokerName || 'Floor Advisor',
        ticker: ticker.toUpperCase(),
        recommendation: recommendation.toUpperCase(), // BUY, SELL, HOLD, WATCHLIST
        confidence: Number(confidence) || 80,
        reasoning: reasoning || 'Technical and fundamental setup aligned.',
        riskLevel,
        timeframe,
        publishedAt: Date.now()
      };

      await set(ref(db, `fms/brokerRecommendations/${recId}`), recData);
      return mockResponse({ success: true, recommendation: recData });
    }

    // 28. MARKET SENTIMENT POLLING ENGINE
    if (path === '/api/polls/create') {
      const { question, options = ['Bullish 🐂', 'Bearish 🐻', 'Neutral ⚖️'], durationSeconds = 180 } = body;
      if (!question) return mockResponse({ error: 'Poll question required.' }, 400);

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

      await set(ref(db, `fms/polls/${pollId}`), pollData);
      return mockResponse({ success: true, poll: pollData });
    }

    if (path === '/api/polls/vote') {
      const { pollId, teamCode, optionId } = body;
      if (!pollId || !teamCode || optionId === undefined) {
        return mockResponse({ error: 'Missing poll voting parameters.' }, 400);
      }

      let voteSuccess = false;
      await runTransaction(ref(db, `fms/polls/${pollId}`), (poll) => {
        if (!poll || poll.status !== 'OPEN') return poll;
        if (!poll.votes) poll.votes = {};
        if (poll.votes[teamCode] !== undefined) return poll; // Already voted

        poll.votes[teamCode] = Number(optionId);
        if (poll.options && poll.options[optionId]) {
          poll.options[optionId].votes = (poll.options[optionId].votes || 0) + 1;
        }
        voteSuccess = true;
        return poll;
      });

      return mockResponse({ success: voteSuccess });
    }

    if (path === '/api/polls/close') {
      const { pollId } = body;
      await update(ref(db, `fms/polls/${pollId}`), { status: 'CLOSED', closedAt: Date.now() });
      return mockResponse({ success: true });
    }

    // 29. VODAFONE IDEA CRISIS STORYLINE ADVANCE
    if (path === '/api/crisis/vodafone/advance') {
      const { actNumber, resolutionType = 'RECOVERY' } = body;
      const fmsSnap = await get(ref(db, 'fms'));
      const currentFms = fmsSnap.exists() ? fmsSnap.val() : {};

      const { nextState, newsEntry } = processVodafoneCrisisAct(Number(actNumber), resolutionType, currentFms);

      const updates = {
        'fms/securities/IDEA': nextState.securities['IDEA'],
        [`fms/newsEvents/${newsEntry.id}`]: newsEntry,
        'fms/vodafoneCrisis': nextState.vodafoneCrisis
      };
      if (nextState.marketState.takeoverEvent) {
        updates['fms/marketState/takeoverEvent'] = nextState.marketState.takeoverEvent;
      }

      await update(ref(db), updates);
      return mockResponse({ success: true, newsEntry, vodafoneCrisis: nextState.vodafoneCrisis });
    }

    // 30. IPO LIFECYCLE STAGE ADVANCE
    if (path === '/api/ipo/advance') {
      const { ticker, stageName } = body;
      if (!ticker || !stageName) return mockResponse({ error: 'Ticker and stageName required.' }, 400);

      const fmsSnap = await get(ref(db, 'fms'));
      const currentFms = fmsSnap.exists() ? fmsSnap.val() : {};

      const { nextState, newsEntry } = processIpoStage(ticker.toUpperCase(), stageName.toUpperCase(), currentFms);

      const updates = {
        [`fms/securities/${ticker.toUpperCase()}`]: nextState.securities[ticker.toUpperCase()],
        [`fms/newsEvents/${newsEntry.id}`]: newsEntry,
        [`fms/ipoRegistry/${ticker.toUpperCase()}`]: nextState.ipoRegistry[ticker.toUpperCase()]
      };
      if (nextState.marketState.takeoverEvent) {
        updates['fms/marketState/takeoverEvent'] = nextState.marketState.takeoverEvent;
      }

      await update(ref(db), updates);
      return mockResponse({ success: true, newsEntry });
    }

    // Fallback: If not handled in client-side mock, route to backend server via window.fetch
    if (typeof window !== 'undefined' && window.fetch) {
      try {
        const fetchOptions = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        };
        if (options.body) {
          fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        const rawFetch = typeof window !== 'undefined' && window.__nativeFetch ? window.__nativeFetch : (typeof fetch === 'function' ? fetch : null);
        if (rawFetch) {
          const realRes = await rawFetch(path, { ...fetchOptions, _skipApiIntercept: true });
          return realRes;
        }
      } catch (netErr) {
        console.warn(`Backend fetch failed for ${path}, returning fallback response:`, netErr);
      }
    }

    return mockResponse({ error: 'Endpoint mock not mapped.' }, 404);
  } catch (err) {
    console.error(`Mock API Error on ${path}:`, err);
    return mockResponse({ error: err.message }, 500);
  }
}

// ==========================================
// SAAMX PHASE 3 & 4 CLIENT API HELPERS
// ==========================================

export async function fetchEventSchedule(eventId) {
  const q = eventId ? `?eventId=${eventId}` : '';
  const res = await apiFetch(`/api/event/schedule${q}`);
  return res.json();
}

export async function updateEventSchedule(eventId, updates) {
  const res = await apiFetch('/api/event/schedule/update', {
    method: 'POST',
    body: JSON.stringify({ eventId, ...updates })
  });
  return res.json();
}

export async function overrideSchedulePhase(phase, options = {}) {
  const res = await apiFetch('/api/event/schedule/override', {
    method: 'POST',
    body: JSON.stringify({ phase, ...options })
  });
  return res.json();
}

export async function freezeValuationSnapshot(eventId, reason = 'Market Close Snapshot') {
  const res = await apiFetch('/api/event/valuation/freeze', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason })
  });
  return res.json();
}

export async function fetchValuationSnapshot(eventId) {
  const q = eventId ? `?eventId=${eventId}` : '';
  const res = await apiFetch(`/api/event/valuation/snapshot${q}`);
  return res.json();
}

export async function runReconciliation(eventId, adjustments = [], notes = '') {
  const res = await apiFetch('/api/event/reconciliation/run', {
    method: 'POST',
    body: JSON.stringify({ eventId, adjustments, notes })
  });
  return res.json();
}

export async function fetchScoringLeaderboard() {
  const res = await apiFetch('/api/scoring/leaderboard');
  return res.json();
}

export async function fetchTeamScorecard(teamId) {
  const res = await apiFetch(`/api/scoring/team/${encodeURIComponent(teamId)}`);
  return res.json();
}

export async function recalculateScores() {
  const res = await apiFetch('/api/scoring/recalculate', { method: 'POST' });
  return res.json();
}

export async function fetchJudgeScorecards(query = {}) {
  const params = new URLSearchParams(query).toString();
  const res = await apiFetch(`/api/judging/scorecards${params ? `?${params}` : ''}`);
  return res.json();
}

export async function saveJudgeScorecard(cardData) {
  const res = await apiFetch('/api/judging/scorecard/save', {
    method: 'POST',
    body: JSON.stringify(cardData)
  });
  return res.json();
}

export async function moderateJudgeScorecards(moderationData) {
  const res = await apiFetch('/api/judging/moderate', {
    method: 'POST',
    body: JSON.stringify(moderationData)
  });
  return res.json();
}

export async function fetchPenalties(teamCode) {
  const q = teamCode ? `?teamCode=${encodeURIComponent(teamCode)}` : '';
  const res = await apiFetch(`/api/penalties${q}`);
  return res.json();
}

export async function createPenalty(penaltyData) {
  const res = await apiFetch('/api/penalties/create', {
    method: 'POST',
    body: JSON.stringify(penaltyData)
  });
  return res.json();
}

export async function appealPenalty(penaltyId, appealReason, submittedBy) {
  const res = await apiFetch('/api/penalties/appeal', {
    method: 'POST',
    body: JSON.stringify({ penaltyId, appealReason, submittedBy })
  });
  return res.json();
}

export async function resolvePenaltyAppeal(penaltyId, resolution, resolutionReason, reviewedBy) {
  const res = await apiFetch('/api/penalties/resolve-appeal', {
    method: 'POST',
    body: JSON.stringify({ penaltyId, resolution, resolutionReason, reviewedBy })
  });
  return res.json();
}

export async function updateResultsLifecycle(lifecycleState) {
  const res = await apiFetch('/api/results/lifecycle', {
    method: 'POST',
    body: JSON.stringify({ lifecycleState })
  });
  return res.json();
}

export async function approveResults(eventId, approver, notes) {
  const res = await apiFetch('/api/results/approve', {
    method: 'POST',
    body: JSON.stringify({ eventId, approver, notes })
  });
  return res.json();
}

export async function publishResults(eventId, publisher) {
  const res = await apiFetch('/api/results/publish', {
    method: 'POST',
    body: JSON.stringify({ eventId, publisher })
  });
  return res.json();
}

export async function reopenResults(eventId, reason) {
  const res = await apiFetch('/api/results/reopen', {
    method: 'POST',
    body: JSON.stringify({ eventId, reason })
  });
  return res.json();
}

export async function fetchIntelligenceFeed(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/intelligence/feed${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function publishIntelligenceItem(item) {
  const res = await apiFetch('/api/intelligence/item', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function manageScenario(action, scenario) {
  const res = await apiFetch('/api/scenarios/manage', {
    method: 'POST',
    body: JSON.stringify({ action, scenario })
  });
  return res.json();
}

export async function publishBrokerBulletin(bulletin) {
  const res = await apiFetch('/api/broker/bulletin', {
    method: 'POST',
    body: JSON.stringify(bulletin)
  });
  return res.json();
}

export async function startDebateRound(roundData) {
  const res = await apiFetch('/api/bull-bear/round', {
    method: 'POST',
    body: JSON.stringify(roundData)
  });
  return res.json();
}

export async function fetchEventReport() {
  const res = await apiFetch('/api/analytics/event-report');
  return res.json();
}
