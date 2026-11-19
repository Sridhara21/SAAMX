/**
 * SAAMX Centralized Market Impact Engine
 * 
 * Pure mathematical calculations driving multi-asset price movements,
 * sector contagion (30% spillover), bounded volatility expansion,
 * circuit breaker halts (>= 20% shocks), exponential half-life duration decay,
 * rumour uncertainty resolution, clean multiplicative inverse corrections,
 * and simulated FX reserve demand pressure.
 */

/**
 * 1. Calculate immediate market impact for an event across target securities and peers
 * @param {Object} event - The news event conforming to schema or legacy format
 * @param {Array} securities - Current array of security state objects
 * @param {Object} options - Tuning options (multiplier, peerContagionRate, circuitThreshold)
 * @returns {Object} { modifications, circuitHalts, primaryDeltaPct, peerDeltaPct }
 */
export function calculateMarketImpact(event, securities, options = {}) {
  const {
    multiplier = 1.0,
    peerContagionRate = 0.30,
    circuitThreshold = 20.0
  } = options;

  if (!event || !Array.isArray(securities)) {
    return { modifications: [], circuitHalts: [], primaryDeltaPct: 0, peerDeltaPct: 0 };
  }

  // Determine sentiment direction
  const sentiment = (event.sentiment || event.primaryDirection || '').toUpperCase();
  const sentimentMultiplier =
    (sentiment === 'POSITIVE' || sentiment === 'BULLISH') ? 1 :
    (sentiment === 'NEGATIVE' || sentiment === 'BEARISH') ? -1 : 0;

  // Extract base magnitude
  let rawMagnitude = 0;
  if (event.impactParameters && typeof event.impactParameters.priceImpactPercent === 'number') {
    rawMagnitude = event.impactParameters.priceImpactPercent;
  } else if (event.impactMagnitude !== undefined) {
    rawMagnitude = Number(event.impactMagnitude) * (sentimentMultiplier || 1);
  } else if (event.impactPercent !== undefined) {
    rawMagnitude = Number(event.impactPercent) * (sentimentMultiplier || 1);
  }

  // Adjust for confidence if provided
  let confidenceMultiplier = 1.0;
  if (event.confidence === 'MEDIUM') confidenceMultiplier = 0.85;
  if (event.confidence === 'SPECULATIVE') confidenceMultiplier = 0.60;

  let primaryDeltaPct = rawMagnitude * multiplier * confidenceMultiplier;

  // Rumour uncertainty discount: rumours begin with a 50% discount until confirmed/debunked
  const isRumour = event.classification === 'rumour' || event.category === 'Speculation / rumours' || (event.category && event.category.toLowerCase().includes('rumour'));
  if (isRumour && !event.isResolution) {
    primaryDeltaPct = parseFloat((primaryDeltaPct * 0.50).toFixed(2));
  }

  // Extract affected asset identifiers
  const affectedSecurityIds = new Set([
    ...(event.affectedSecurityIds || []),
    ...(event.affectedTickers || []),
    ...((event.affectedAssets && event.affectedAssets.securities) || [])
  ]);

  const affectedSectors = new Set([
    ...(event.affectedSectors || []),
    ...((event.affectedAssets && event.affectedAssets.sectors) || []),
    ...(event.affectedSector ? [event.affectedSector] : [])
  ]);

  // Identify primary targets
  const primaryTargets = securities.filter(s => {
    if (!s || s.status === 'Halted' || s.status === 'Bankrupt' || s.status === 'UNLISTED') return false;
    if (affectedSecurityIds.size > 0) {
      return affectedSecurityIds.has(s.id) || affectedSecurityIds.has(s.ticker);
    }
    if (affectedSectors.size > 0) {
      return affectedSectors.has(s.sector);
    }
    return false;
  });

  // Identify peer targets in same sector for 30% contagion spillover
  const peerTargets = [];
  if (affectedSecurityIds.size > 0 && affectedSectors.size > 0) {
    const primaryIdSet = new Set(primaryTargets.map(t => t.id || t.ticker));
    securities.forEach(s => {
      if (!s || primaryIdSet.has(s.id) || primaryIdSet.has(s.ticker)) return;
      if ((!s.status || s.status === 'Active') && affectedSectors.has(s.sector)) {
        peerTargets.push(s);
      }
    });
  }

  const modifications = [];
  const circuitHalts = [];

  // 1. Apply primary impacts
  primaryTargets.forEach(sec => {
    const oldPrice = Number(sec.currentPrice || sec.basePrice || 100);
    const newPrice = Math.max(0.10, parseFloat((oldPrice * (1 + primaryDeltaPct / 100)).toFixed(2)));
    const priceDelta = parseFloat((newPrice - oldPrice).toFixed(2));

    // Volatility expansion proportional to shock magnitude
    const baseVol = Number(sec.baseVolatility || sec.volatility || 0.50);
    const expandedVol = Math.min(0.95, parseFloat((baseVol * (1 + Math.abs(primaryDeltaPct) / 40)).toFixed(2)));

    // Trading restriction / Circuit halt threshold evaluation
    const explicitHalt = (event.impactParameters && event.impactParameters.tradingRestriction === 'TRADING_HALT') ||
                         event.category === 'REGULATORY_HALT' ||
                         event.severity === 'CRITICAL';
    const shockExceedsCircuit = Math.abs(primaryDeltaPct) >= circuitThreshold;
    const shouldHalt = explicitHalt || shockExceedsCircuit;

    if (shouldHalt) {
      circuitHalts.push({
        ticker: sec.ticker,
        securityId: sec.id,
        reason: `Circuit breaker triggered by news: ${event.headline || 'Volatility shock'}`
      });
    }

    modifications.push({
      ticker: sec.ticker,
      securityId: sec.id,
      isPrimary: true,
      oldPrice,
      newPrice,
      priceDelta,
      impactPercent: primaryDeltaPct,
      oldVolatility: baseVol,
      newVolatility: expandedVol,
      shouldHalt,
      appliedAt: Date.now()
    });
  });

  // 2. Apply secondary contagion impacts to peers (30% proportional spillover)
  const peerDeltaPct = parseFloat((primaryDeltaPct * peerContagionRate).toFixed(2));
  peerTargets.forEach(sec => {
    const oldPrice = Number(sec.currentPrice || sec.basePrice || 100);
    const newPrice = Math.max(0.10, parseFloat((oldPrice * (1 + peerDeltaPct / 100)).toFixed(2)));
    const priceDelta = parseFloat((newPrice - oldPrice).toFixed(2));

    modifications.push({
      ticker: sec.ticker,
      securityId: sec.id,
      isPrimary: false,
      oldPrice,
      newPrice,
      priceDelta,
      impactPercent: peerDeltaPct,
      oldVolatility: Number(sec.volatility || 0.50),
      newVolatility: Number(sec.volatility || 0.50),
      shouldHalt: false,
      appliedAt: Date.now()
    });
  });

  return {
    modifications,
    circuitHalts,
    primaryDeltaPct,
    peerDeltaPct
  };
}

/**
 * 2. Exponential half-life duration decay calculation
 * Prevents single news events from permanently distorting market prices.
 * M(t) = R_floor + (1 - R_floor) * (0.5)^(t / t_half)
 * 
 * @param {Array} activeEvents - Array of currently active news events with modification histories
 * @param {Array} securities - Current array of security state objects
 * @param {number} now - Timestamp in ms
 * @returns {Object} { priceAdjustments, expiredEventIds }
 */
export function calculateDecayTick(activeEvents, securities, now = Date.now()) {
  const priceAdjustments = [];
  const expiredEventIds = [];

  if (!Array.isArray(activeEvents) || !Array.isArray(securities)) {
    return { priceAdjustments, expiredEventIds };
  }

  activeEvents.forEach(evt => {
    if (!evt || !evt.startTime) return;
    const elapsedSeconds = (now - evt.startTime) / 1000;
    const halfLife = (evt.expiryRules && evt.expiryRules.decayHalfLife) || evt.halfLife || 90;
    const autoRevert = evt.expiryRules ? evt.expiryRules.autoRevert : (evt.autoRevert !== false);
    
    // Reversion floor: fraction of shock that remains permanent (default 0.40 = 40% permanent)
    const reversionFloor = (evt.expiryRules && typeof evt.expiryRules.revertFactor === 'number')
      ? Math.max(0, 1 - evt.expiryRules.revertFactor)
      : (evt.reversionFloor !== undefined ? evt.reversionFloor : 0.40);

    const duration = evt.durationSeconds || (evt.duration ? evt.duration * 60 : 300);

    // If event has reached its duration, mark as expired
    if (elapsedSeconds >= duration) {
      expiredEventIds.push(evt.id);
      return;
    }

    // If no decay configured or autoRevert disabled, skip decay calculations
    if (halfLife <= 0 || !autoRevert) {
      return;
    }

    // Exponential decay of transient sentiment overreaction
    const decayFactor = Math.pow(0.5, elapsedSeconds / halfLife);
    const activeImpactMultiplier = reversionFloor + (1 - reversionFloor) * decayFactor;

    (evt.modifications || []).forEach(mod => {
      const sec = securities.find(s => s.ticker === mod.ticker || s.id === mod.securityId);
      if (!sec || sec.status !== 'Active') return;

      const targetPrice = parseFloat((mod.oldPrice + (mod.priceDelta * activeImpactMultiplier)).toFixed(2));
      if (Math.abs(sec.currentPrice - targetPrice) >= 0.05) {
        priceAdjustments.push({
          ticker: sec.ticker,
          securityId: sec.id,
          previousPrice: sec.currentPrice,
          newPrice: targetPrice,
          reason: 'NEWS_HALF_LIFE_DECAY',
          eventId: evt.id
        });
      }
    });
  });

  return { priceAdjustments, expiredEventIds };
}

/**
 * 3. Clean multiplicative inverse news correction
 * Completely eliminates compounding asymmetric price degradation ($100 -> +10% -> 110 -> clean unwind -> 100.00)
 * 
 * @param {Object} targetNewsItem - The original news event to reverse
 * @param {number} correctionFactor - Scale factor (1.0 = 100% full unwind)
 * @returns {Array} List of reversal operations per security
 */
export function calculateNewsCorrection(targetNewsItem, correctionFactor = 1.0) {
  if (!targetNewsItem) {
    throw new Error('Target news item missing required for clean unwind.');
  }

  const modifications = targetNewsItem.modifications || [];
  if (modifications.length === 0 && targetNewsItem.affectedSecurityIds) {
    // Reconstruct synthetic modifications if not stored on legacy events
    const impactPct = Number(targetNewsItem.impactPercent || targetNewsItem.priceImpactPercent || 0);
    targetNewsItem.affectedSecurityIds.forEach(ticker => {
      modifications.push({
        ticker,
        impactPercent: impactPct,
        priceDelta: 0
      });
    });
  }

  const reversals = [];
  modifications.forEach(mod => {
    const rawImpactPct = mod.impactPercent !== undefined ? mod.impactPercent : 0;
    const effectiveImpactPct = rawImpactPct * correctionFactor;

    // Clean Multiplicative Inverse Factor: 1 / (1 + delta / 100)
    // E.g., if delta was +10%, inverse is 1 / 1.10 = 0.909090...
    // 110 * (1 / 1.10) = 100.00 exactly!
    const denominator = 1 + effectiveImpactPct / 100;
    const inverseMultiplier = (effectiveImpactPct !== 0 && denominator > 0) ? (1 / denominator) : 1.0;

    reversals.push({
      ticker: mod.ticker,
      securityId: mod.securityId,
      deltaToSubtract: parseFloat(((mod.priceDelta || 0) * correctionFactor).toFixed(2)),
      inverseMultiplier,
      newsImpactToSubtract: parseFloat((rawImpactPct * correctionFactor).toFixed(2))
    });
  });

  return reversals;
}

/**
 * 4. Resolve rumour state uncertainty (CONFIRM vs DEBUNK vs EXPIRE)
 * 
 * @param {Object} rumour - The original rumour event
 * @param {string} resolutionType - 'CONFIRM' | 'DEBUNK' | 'EXPIRE'
 * @param {Object} resolutionNews - Optional resolving news item
 * @returns {Object} Resolution actions and delta multipliers
 */
export function resolveRumourState(rumour, resolutionType, resolutionNews = {}) {
  const appliedDeltaPct = rumour ? (rumour.appliedImpactPct || (rumour.impactParameters && rumour.impactParameters.priceImpactPercent) || 0) : 0;

  if (resolutionType === 'CONFIRM') {
    // Lift the 50% rumour discount, applying remaining magnitude
    return {
      status: 'CONFIRMED',
      additionalImpactPct: appliedDeltaPct, // Boosts remaining 50%
      headline: `📢 CONFIRMED: ${resolutionNews.headline || (rumour ? rumour.headline : 'Rumour Confirmed')}`
    };
  } else if (resolutionType === 'DEBUNK') {
    // Cleanly unwind the initial rumour pop + apply 2% credibility drag
    const debunkDenom = 1 + appliedDeltaPct / 100;
    return {
      status: 'DEBUNKED',
      reversalMultiplier: debunkDenom > 0 ? (1 / debunkDenom) : 1.0,
      credibilityDragPct: -2.0,
      headline: `🚫 DEBUNKED / OFFICIAL DENIAL: ${resolutionNews.headline || (rumour ? rumour.headline : 'Rumour Refuted')}`
    };
  }

  return { status: 'EXPIRED' };
}

/**
 * 5. Calculate simulated FX currency demand pressure
 * Drives indicative spreads and FX desk queue telemetry without violating finite reserve solvency.
 * 
 * @param {string} currency - Target foreign currency (e.g. 'USD', 'EUR')
 * @param {string} severity - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @param {Object} existingDemand - Current demand map
 * @returns {Object} Updated pressure metrics for currency
 */
export function calculateSimulatedFxDemandPressure(currency, severity = 'MEDIUM', existingDemand = {}) {
  const currentPressure = existingDemand[currency] || { demandScore: 30, spreadBps: 0 };
  const addScore = severity === 'CRITICAL' ? 35 : severity === 'HIGH' ? 20 : 10;
  const newScore = Math.min(100, Math.max(0, currentPressure.demandScore + addScore));
  
  // Dynamic spread basis point widening when demand exceeds baseline 60
  const spreadBps = newScore > 60 ? Math.round((newScore - 60) * 0.75) : 0;

  return {
    currency,
    demandScore: newScore,
    spreadBps,
    status: newScore > 75 ? 'HEAVY_OUTFLOW_STRAIN' : newScore > 50 ? 'ELEVATED_DEMAND' : 'NORMAL',
    expiresAt: Date.now() + 180000 // 3 minute window
  };
}
