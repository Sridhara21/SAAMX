/**
 * SAAMX — Central Authoritative Scoring Engine
 * Total Score: 1,000 Points
 *
 * Categories:
 * 1. Risk Management (300 pts)
 * 2. Returns and Performance (250 pts)
 * 3. Diversification (200 pts)
 * 4. Decision-Making and Adaptability (150 pts - Judge-assessed)
 * 5. Future Potential (100 pts - Judge-assessed)
 *
 * Official Tagline: "Experience the Market. Don't Just Learn It."
 */

const SCORING_RUBRIC_VERSION = 'v1.0-standard';

const DEFAULT_SCORING_CONFIG = {
  version: SCORING_RUBRIC_VERSION,
  startingCapital: 10000000, // ₹1,00,00,000 (₹1 Crore)
  returnRangeMin: -10, // -10% -> 0 pts
  returnRangeMax: 10,  // +10% -> 150 pts
  benchmark: {
    name: 'SAAMX Multi-Asset Composite Benchmark',
    version: 'BMK_2026_Q4_V1',
    components: [
      { name: 'SAAMX INDIA 50', weight: 0.50, key: 'INDIA50' },
      { name: 'SAAMX US 100', weight: 0.20, key: 'US100' },
      { name: 'SAAMX UK 100', weight: 0.15, key: 'UK100' },
      { name: 'Cash / G-Sec Equivalent', weight: 0.15, returnPct: 0.5 }
    ]
  },
  thresholds: {
    riskManagement: { maxDrawdown: 80, positionConcentration: 60, sectorExposure: 50, liquidity: 40, currencyRisk: 35, compliance: 35, total: 300 },
    returnsPerformance: { absoluteReturn: 150, benchmarkRelative: 60, capitalEfficiency: 40, total: 250 },
    diversification: { instrument: 60, sector: 45, assetClass: 40, geographic: 30, balance: 25, total: 200 },
    decisionMaking: { responseToEvents: 45, decisionTiming: 35, adaptability: 35, riskRecognition: 35, total: 150 },
    futurePotential: { forwardPositioning: 35, resilience: 30, balance: 20, adaptCapacity: 15, total: 100 }
  },
  penaltyCaps: {
    maxSinglePenalty: 50,
    maxAggregateDeduction: 150
  },
  tieBreakOrder: [
    'riskManagement',
    'decisionMaking',
    'diversification',
    'returnsPerformance'
  ],
  resultsLifecycle: 'CONFIGURED' // CONFIGURED, LIVE_SCORING, MARKET_CLOSED, VALUATION_FROZEN, RECONCILIATION, JUDGING_COMPLETE, APPROVED, PUBLISHED
};

const DEFAULT_FX_MID_RATES = {
  USDINR: 88.20,
  GBPINR: 119.40,
  EURINR: 103.50,
  JPYINR: 0.58,
  AEDINR: 24.01,
  SGDINR: 66.80,
  CADINR: 64.50,
  CNYINR: 12.25,
  AUDINR: 55.50,
  KRWINR: 0.062
};

function getMidRate(currency, fxRates = {}) {
  if (!currency || currency === 'INR') return 1.0;
  const pairKey = `${currency}INR`;
  return Number(fxRates?.[pairKey]?.midRate || DEFAULT_FX_MID_RATES[pairKey] || 1.0);
}

/**
 * Calculate total equity of an Investment House
 * Safely converts multi-currency cash wallets and holdings into INR across all 10 supported currencies.
 */
function calculatePortfolioValuation(team, securities = [], fxRates = {}, startingCapital = 10000000) {
  if (!team) return { totalEquity: startingCapital, cashINR: startingCapital, holdingsINR: 0, liabilitiesINR: 0 };

  // 1. Cash Wallets
  const inrCash = Number(team.cashWallets?.INR ?? team.cashBalance ?? 0);
  let otherCashINR = 0;
  const geoWeights = { INDIA: inrCash };
  const cashByCurrencyINR = { INR: inrCash };

  if (team.cashWallets) {
    Object.entries(team.cashWallets).forEach(([cur, val]) => {
      if (cur === 'INR' || !val) return;
      const rate = getMidRate(cur, fxRates);
      const valINR = Number(val) * rate;
      otherCashINR += valINR;
      cashByCurrencyINR[cur] = (cashByCurrencyINR[cur] || 0) + valINR;

      const geo = cur === 'USD' ? 'US' : cur === 'GBP' ? 'UK' : cur === 'EUR' ? 'EUROPE' : cur === 'JPY' ? 'JAPAN' : cur === 'CNY' ? 'CHINA' : cur === 'SGD' ? 'SINGAPORE' : cur === 'AED' ? 'UAE' : cur === 'AUD' ? 'AUSTRALIA' : cur === 'KRW' ? 'KOREA' : cur === 'CAD' ? 'CANADA' : cur === 'CHF' ? 'SWITZERLAND' : 'GLOBAL';
      geoWeights[geo] = (geoWeights[geo] || 0) + valINR;
    });
  }
  const totalCashINR = inrCash + otherCashINR;

  // 2. Holdings Valuation
  let totalHoldingsINR = 0;
  const holdingsBreakdown = [];
  const sectorWeights = {};
  const assetClassWeights = {};

  Object.entries(team.holdings || {}).forEach(([ticker, qty]) => {
    if (qty <= 0) return;
    const sec = securities.find(s => s.ticker === ticker || s.id === ticker);
    if (!sec) return;

    const price = Number(sec.currentPrice || sec.basePrice || 0);
    const secCur = sec.currency || (sec.exchange === 'NASDAQ' || sec.exchange === 'NYSE' ? 'USD' : sec.exchange === 'LSE' ? 'GBP' : sec.exchange === 'XETRA' ? 'EUR' : sec.exchange === 'TSE' ? 'JPY' : sec.exchange === 'SGX' ? 'SGD' : sec.exchange === 'ADX' || sec.exchange === 'DFM' ? 'AED' : sec.exchange === 'ASX' ? 'AUD' : sec.exchange === 'KRX' ? 'KRW' : sec.exchange === 'TSX' ? 'CAD' : sec.exchange === 'SIX' ? 'CHF' : sec.exchange === 'SSE' || sec.exchange === 'SZSE' ? 'CNY' : 'INR');
    const fx = getMidRate(secCur, fxRates);
    const valueINR = qty * price * fx;

    totalHoldingsINR += valueINR;

    const sector = sec.sector || 'Diversified';
    sectorWeights[sector] = (sectorWeights[sector] || 0) + valueINR;

    const assetClass = sec.assetClass || (sec.type === 'ETF' ? 'ETF' : sec.type === 'Commodity' ? 'Commodity' : (sec.type === 'Mutual Fund' || sec.type === 'MutualFund') ? 'Mutual Fund' : (sec.type && sec.type.includes('Bond')) ? 'Bond' : sec.type === 'REIT' ? 'REIT' : sec.type === 'InvIT' ? 'InvIT' : 'Equity');
    assetClassWeights[assetClass] = (assetClassWeights[assetClass] || 0) + valueINR;

    const geo = secCur === 'USD' ? 'US' : secCur === 'GBP' ? 'UK' : secCur === 'EUR' ? 'EUROPE' : secCur === 'JPY' ? 'JAPAN' : secCur === 'CNY' ? 'CHINA' : secCur === 'SGD' ? 'SINGAPORE' : secCur === 'AED' ? 'UAE' : secCur === 'AUD' ? 'AUSTRALIA' : secCur === 'KRW' ? 'KOREA' : secCur === 'CAD' ? 'CANADA' : secCur === 'CHF' ? 'SWITZERLAND' : 'INDIA';
    geoWeights[geo] = (geoWeights[geo] || 0) + valueINR;

    holdingsBreakdown.push({
      ticker,
      name: sec.name || ticker,
      qty,
      price,
      currency: secCur,
      valueINR,
      sector,
      assetClass
    });
  });

  const liabilitiesINR = Number(team.borrowedMargin || 0);
  const totalEquity = Math.max(0, parseFloat((totalCashINR + totalHoldingsINR - liabilitiesINR).toFixed(2)));

  return {
    totalEquity,
    totalCashINR: parseFloat(totalCashINR.toFixed(2)),
    totalHoldingsINR: parseFloat(totalHoldingsINR.toFixed(2)),
    cashINR: parseFloat(totalCashINR.toFixed(2)),
    holdingsINR: parseFloat(totalHoldingsINR.toFixed(2)),
    liabilitiesINR,
    holdingsBreakdown,
    sectorWeights,
    assetClassWeights,
    geoWeights,
    currencyExposure: {
      INR: totalEquity > 0 ? ((cashByCurrencyINR.INR || 0) + ((geoWeights.INDIA || 0) - (cashByCurrencyINR.INR || 0))) / totalEquity : 1.0,
      USD: totalEquity > 0 ? ((cashByCurrencyINR.USD || 0) + ((geoWeights.US || 0) - (cashByCurrencyINR.USD || 0))) / totalEquity : 0,
      GBP: totalEquity > 0 ? ((cashByCurrencyINR.GBP || 0) + ((geoWeights.UK || 0) - (cashByCurrencyINR.GBP || 0))) / totalEquity : 0,
      EUR: totalEquity > 0 ? ((cashByCurrencyINR.EUR || 0) + ((geoWeights.EUROPE || 0) - (cashByCurrencyINR.EUR || 0))) / totalEquity : 0,
      JPY: totalEquity > 0 ? ((cashByCurrencyINR.JPY || 0) + ((geoWeights.JAPAN || 0) - (cashByCurrencyINR.JPY || 0))) / totalEquity : 0,
      AED: totalEquity > 0 ? ((cashByCurrencyINR.AED || 0) + ((geoWeights.UAE || 0) - (cashByCurrencyINR.AED || 0))) / totalEquity : 0,
      SGD: totalEquity > 0 ? ((cashByCurrencyINR.SGD || 0) + ((geoWeights.SINGAPORE || 0) - (cashByCurrencyINR.SGD || 0))) / totalEquity : 0,
      CNY: totalEquity > 0 ? ((cashByCurrencyINR.CNY || 0) + ((geoWeights.CHINA || 0) - (cashByCurrencyINR.CNY || 0))) / totalEquity : 0,
      AUD: totalEquity > 0 ? ((cashByCurrencyINR.AUD || 0) + ((geoWeights.AUSTRALIA || 0) - (cashByCurrencyINR.AUD || 0))) / totalEquity : 0,
      KRW: totalEquity > 0 ? ((cashByCurrencyINR.KRW || 0) + ((geoWeights.KOREA || 0) - (cashByCurrencyINR.KRW || 0))) / totalEquity : 0,
      CAD: totalEquity > 0 ? ((cashByCurrencyINR.CAD || 0) + ((geoWeights.CANADA || 0) - (cashByCurrencyINR.CAD || 0))) / totalEquity : 0,
      CHF: totalEquity > 0 ? ((cashByCurrencyINR.CHF || 0) + ((geoWeights.SWITZERLAND || 0) - (cashByCurrencyINR.CHF || 0))) / totalEquity : 0
    }
  };
}

/**
 * Calculate Composite Benchmark Return
 */
function calculateBenchmarkReturn(indices = {}, startingVal = 1000) {
  const g100 = indices?.GLOBAL100?.changePercent || 0;
  const in50 = indices?.INDIA50?.changePercent || 0;
  const us100 = indices?.US100?.changePercent || 0;
  const uk100 = indices?.UK100?.changePercent || 0;

  // Weighted composite return
  const benchReturn = (0.50 * in50) + (0.20 * us100) + (0.15 * uk100) + (0.15 * 0.25);
  return parseFloat(benchReturn.toFixed(2));
}

/**
 * 1. Risk Management — 300 Points
 * - Max Drawdown: 80 pts
 * - Position Concentration: 60 pts
 * - Sector & Asset-Class Exposure: 50 pts
 * - Liquidity Management: 40 pts
 * - Currency & Cross-Asset Risk: 35 pts
 * - Risk-Rule Compliance: 35 pts
 */
function calculateRiskScore(team, valuation, config = DEFAULT_SCORING_CONFIG) {
  const { totalEquity, totalCashINR, totalHoldingsINR, holdingsBreakdown, sectorWeights } = valuation;
  const startingCap = config.startingCapital || 10000000;
  const txCount = Number(team.tradesCount ?? team.tradeCount ?? team.txCount ?? 0);
  const isInactive = txCount === 0 && totalHoldingsINR <= 0;

  // A. Max Drawdown (80 pts)
  // Drawdown = (Peak - Current) / Peak
  const peakEquity = Math.max(startingCap, Number(team.peakEquity || startingCap), totalEquity);
  const drawdownPct = peakEquity > 0 ? Math.max(0, ((peakEquity - totalEquity) / peakEquity) * 100) : 0;
  let drawdownScore = 80;

  if (isInactive) {
    // Inactive portfolio sitting entirely on cash did not manage market risk
    drawdownScore = 25;
  } else if (drawdownPct > 15) {
    drawdownScore = 0;
  } else if (drawdownPct <= 3) {
    // Sensible risk-taking corridor: small market volatility (0-3%) is expected and unpenalized
    drawdownScore = 80;
  } else if (drawdownPct <= 6) {
    drawdownScore = 70;
  } else if (drawdownPct <= 10) {
    drawdownScore = 50;
  } else {
    // 10% to 15% drawdown
    drawdownScore = Math.max(10, Math.round(50 - ((drawdownPct - 10) / 5) * 40));
  }

  // B. Position Concentration (60 pts)
  // Max single stock weight: <=20% is ideal (60 pts); >35% is heavily penalized
  let maxPositionWeight = 0;
  if (totalEquity > 0 && holdingsBreakdown.length > 0) {
    holdingsBreakdown.forEach(h => {
      const w = (h.valueINR / totalEquity) * 100;
      if (w > maxPositionWeight) maxPositionWeight = w;
    });
  }
  let concentrationScore = 60;
  if (isInactive) {
    concentrationScore = 25; // zero active asset selection
  } else if (maxPositionWeight > 35) {
    concentrationScore = Math.max(10, Math.round(60 - ((maxPositionWeight - 35) / 65) * 50));
  } else if (maxPositionWeight > 20) {
    concentrationScore = Math.round(60 - ((maxPositionWeight - 20) / 15) * 20);
  }

  // C. Sector & Asset-Class Exposure (50 pts)
  // Max single sector weight: <=35% is ideal (50 pts)
  let maxSectorWeight = 0;
  if (totalEquity > 0) {
    Object.values(sectorWeights).forEach(sVal => {
      const w = (sVal / totalEquity) * 100;
      if (w > maxSectorWeight) maxSectorWeight = w;
    });
  }
  let sectorScore = 50;
  if (isInactive) {
    sectorScore = 20; // zero sector deployment
  } else if (maxSectorWeight > 50) {
    sectorScore = Math.max(10, Math.round(50 - ((maxSectorWeight - 50) / 50) * 40));
  } else if (maxSectorWeight > 35) {
    sectorScore = Math.round(50 - ((maxSectorWeight - 35) / 15) * 15);
  }

  // D. Liquidity Management (40 pts)
  // Optimal liquidity corridor is 5% to 30% cash buffer.
  // Highest cash balance does NOT get highest score: idle cash drag (>75%) is penalized.
  const cashRatio = totalEquity > 0 ? (totalCashINR / totalEquity) * 100 : 100;
  let liquidityScore = 40;
  if (totalCashINR < 0) {
    liquidityScore = 0; // Negative cash / breach
  } else if (cashRatio < 3) {
    liquidityScore = 5; // dangerously illiquid
  } else if (cashRatio >= 5 && cashRatio <= 30) {
    liquidityScore = 40; // optimal active liquidity corridor
  } else if (cashRatio > 30 && cashRatio <= 50) {
    liquidityScore = 30; // mild cash drag
  } else if (cashRatio > 50 && cashRatio <= 75) {
    liquidityScore = 20; // moderate cash drag
  } else if (cashRatio > 75 && cashRatio <= 95) {
    liquidityScore = 12; // severe idle cash drag
  } else {
    liquidityScore = 8; // >95% or 100% idle cash: dormant capital drag
  }

  // E. Currency and Cross-Asset Risk (35 pts)
  const fxExposure = valuation.currencyExposure || {};
  const nonINRExposure = ((fxExposure.USD || 0) + (fxExposure.GBP || 0) + (fxExposure.EUR || 0)) * 100;
  let currencyRiskScore = 35;
  if (isInactive) {
    currencyRiskScore = 20;
  } else if (nonINRExposure > 70) {
    currencyRiskScore = 18; // extreme unhedged FX
  } else if (nonINRExposure >= 5 && nonINRExposure <= 50) {
    currencyRiskScore = 35; // balanced multi-currency asset allocation
  } else if (nonINRExposure > 0) {
    currencyRiskScore = 30;
  } else {
    currencyRiskScore = 26; // 100% domestic, no FX exposure
  }

  // F. Risk-Rule Compliance (35 pts)
  // Distinguish attempted rejected orders from executed limit breaches
  const violations = Array.isArray(team.violations) ? team.violations : [];
  const executedBreaches = violations.filter(v => 
    v.type === 'LIMIT_BREACH' || 
    v.type === 'MARGIN_DEFICIT' || 
    (v.severity === 'HIGH' && v.type !== 'REJECTED_ORDER')
  ).length;
  const rejectedOrders = violations.filter(v => 
    v.type === 'REJECTED_ORDER' || v.isRejectedOrder === true
  ).length;

  // Executed breaches deduct 10 pts each; rejected orders only deduct friction after 5+ failed attempts
  const rejectionFrictionDeduction = rejectedOrders > 5 ? Math.min(5, Math.floor((rejectedOrders - 5) / 2) * 2) : 0;
  let complianceScore = Math.max(0, 35 - (executedBreaches * 10) - rejectionFrictionDeduction);

  let totalRiskScore = drawdownScore + concentrationScore + sectorScore + liquidityScore + currencyRiskScore + complianceScore;
  if (isInactive) {
    totalRiskScore = Math.min(135, totalRiskScore); // Capped for inactive house
  }

  return {
    total: Math.min(300, Math.max(0, totalRiskScore)),
    breakdown: {
      isInactiveDormant: isInactive,
      maxDrawdown: { score: drawdownScore, max: 80, observedPct: parseFloat(drawdownPct.toFixed(2)) },
      positionConcentration: { score: concentrationScore, max: 60, maxObservedWeight: parseFloat(maxPositionWeight.toFixed(2)) },
      sectorExposure: { score: sectorScore, max: 50, maxObservedWeight: parseFloat(maxSectorWeight.toFixed(2)) },
      liquidityManagement: { score: liquidityScore, max: 40, cashRatio: parseFloat(cashRatio.toFixed(2)) },
      currencyRisk: { score: currencyRiskScore, max: 35, foreignExposurePct: parseFloat(nonINRExposure.toFixed(2)) },
      riskRuleCompliance: { score: complianceScore, max: 35, executedBreaches, rejectedOrders }
    }
  };
}

/**
 * 2. Returns and Performance — 250 Points
 * - Absolute Return: 150 pts (-10% to +10% calibrated)
 * - Benchmark-Relative Performance: 60 pts
 * - Capital Efficiency: 40 pts
 */
function calculateReturnsScore(team, valuation, benchmarkReturn = 0, config = DEFAULT_SCORING_CONFIG) {
  const startingCap = Math.max(1, config.startingCapital || 10000000);
  const returnPct = ((valuation.totalEquity - startingCap) / startingCap) * 100;

  // A. Absolute Return (150 pts)
  // Range: -10% -> 0 pts, 0% -> 75 pts, +10% -> 150 pts
  const minR = config.returnRangeMin ?? -10;
  const maxR = config.returnRangeMax ?? 10;
  const rangeSpan = (maxR - minR) || 1;
  let absScore = 75; // baseline for 0%
  if (returnPct <= minR) {
    absScore = 0;
  } else if (returnPct >= maxR) {
    absScore = 150;
  } else {
    absScore = Math.round(((returnPct - minR) / rangeSpan) * 150);
  }

  // B. Benchmark-Relative Performance (60 pts)
  // Alpha = returnPct - benchmarkReturn
  const alpha = returnPct - benchmarkReturn;
  let alphaScore = 30; // neutral
  if (alpha <= -5) {
    alphaScore = Math.max(0, Math.round(30 + (alpha / 5) * 30));
  } else if (alpha >= 5) {
    alphaScore = 60;
  } else {
    alphaScore = Math.round(30 + (alpha / 5) * 30);
  }

  // C. Capital Efficiency (40 pts)
  // Evaluates both capital deployment ratio and execution discipline (not trade count alone)
  const txCount = Number(team.tradesCount ?? team.tradeCount ?? team.txCount ?? 0);
  const deploymentRatio = valuation.totalEquity > 0 ? (valuation.totalHoldingsINR / valuation.totalEquity) : 0;
  let capEfficiency = 0;

  if (txCount === 0 || valuation.totalHoldingsINR <= 0) {
    capEfficiency = 0; // Zero deployment: zero efficiency
  } else if (deploymentRatio >= 0.40 && txCount >= 3 && txCount <= 35) {
    capEfficiency = 40; // High efficiency: strong capital deployment with disciplined execution
  } else if (deploymentRatio >= 0.25 && txCount >= 2 && txCount <= 45) {
    capEfficiency = 30; // Moderate efficiency
  } else if (txCount > 45) {
    // Excessive churn / hyperactive over-trading
    capEfficiency = Math.max(10, 30 - Math.round((txCount - 45) * 0.75));
  } else {
    capEfficiency = 18; // Low deployment / under-utilized capital
  }

  const totalReturnsScore = absScore + alphaScore + capEfficiency;

  return {
    total: Math.min(250, Math.max(0, totalReturnsScore)),
    breakdown: {
      absoluteReturn: { score: absScore, max: 150, returnPct: parseFloat(returnPct.toFixed(2)) },
      benchmarkRelative: { score: alphaScore, max: 60, alpha: parseFloat(alpha.toFixed(2)), benchmarkReturn },
      capitalEfficiency: { score: capEfficiency, max: 40, tradeCount: txCount, deploymentRatio: parseFloat(deploymentRatio.toFixed(2)) }
    }
  };
}

/**
 * 3. Diversification — 200 Points
 * - Instrument Diversification: 60 pts
 * - Sector Diversification: 45 pts
 * - Asset-Class Diversification: 40 pts
 * - Geographic & Currency Diversification: 30 pts
 * - Portfolio Balance & Completeness: 25 pts
 */
function calculateDiversificationScore(team, valuation) {
  const { totalEquity, holdingsBreakdown, sectorWeights, assetClassWeights, geoWeights } = valuation;

  // A. Instrument Diversification (60 pts)
  // More holdings do NOT automatically mean better diversification.
  // Evaluate effective number of holdings (inverse Herfindahl) and meaningful allocation (>= 2.5% of portfolio)
  let sumSquaredWeights = 0;
  const meaningfulHoldings = holdingsBreakdown.filter(h => {
    if (totalEquity <= 0) return false;
    const w = h.valueINR / totalEquity;
    sumSquaredWeights += (w * w);
    return w >= 0.025; // at least 2.5% of total portfolio equity
  }).length;

  const effectiveHoldings = sumSquaredWeights > 0 ? (1 / sumSquaredWeights) : 0;
  let instScore = 0;
  if (effectiveHoldings >= 6 && meaningfulHoldings >= 6) {
    instScore = 60;
  } else if (effectiveHoldings >= 4 && meaningfulHoldings >= 4) {
    instScore = 45;
  } else if (effectiveHoldings >= 2.5 && meaningfulHoldings >= 3) {
    instScore = 30;
  } else if (effectiveHoldings >= 1.5 && meaningfulHoldings >= 1) {
    instScore = 15;
  } else {
    instScore = 0;
  }

  // B. Sector Diversification (45 pts)
  // Requires sectors to have at least 5% portfolio weight
  const significantSectors = Object.values(sectorWeights).filter(sVal => totalEquity > 0 && (sVal / totalEquity) >= 0.05).length;
  let sectorScore = 0;
  if (significantSectors >= 5) {
    sectorScore = 45;
  } else if (significantSectors >= 4) {
    sectorScore = 35;
  } else if (significantSectors >= 3) {
    sectorScore = 25;
  } else if (significantSectors >= 2) {
    sectorScore = 15;
  } else if (significantSectors === 1) {
    sectorScore = 5;
  }

  // C. Asset-Class Diversification (40 pts)
  const significantAssetClasses = Object.values(assetClassWeights).filter(aVal => totalEquity > 0 && (aVal / totalEquity) >= 0.05).length;
  let assetClassScore = 0;
  if (significantAssetClasses >= 3) {
    assetClassScore = 40;
  } else if (significantAssetClasses >= 2) {
    assetClassScore = 28;
  } else if (significantAssetClasses === 1) {
    assetClassScore = 15;
  }

  // D. Geographic & Currency Diversification (30 pts)
  const significantGeos = Object.entries(geoWeights).filter(([_, v]) => totalEquity > 0 && (v / totalEquity) >= 0.05).length;
  let geoScore = 10;
  if (significantGeos >= 3) {
    geoScore = 30;
  } else if (significantGeos >= 2) {
    geoScore = 22;
  }

  // E. Portfolio Balance & Completeness (25 pts)
  // Herfindahl-Hirschman Index across all positions
  let balanceScore = 25;
  if (holdingsBreakdown.length > 0 && totalEquity > 0) {
    if (sumSquaredWeights > 0.40) {
      balanceScore = 10; // high concentration in 1-2 names
    } else if (sumSquaredWeights > 0.22) {
      balanceScore = 18; // moderate balance
    } else {
      balanceScore = 25; // highly balanced distribution
    }
  } else {
    balanceScore = 8; // all cash, no investment balance
  }

  const totalDivScore = instScore + sectorScore + assetClassScore + geoScore + balanceScore;

  return {
    total: Math.min(200, Math.max(0, totalDivScore)),
    breakdown: {
      instrumentDiversification: { score: instScore, max: 60, meaningfulCount: meaningfulHoldings, effectivePositions: parseFloat(effectiveHoldings.toFixed(2)) },
      sectorDiversification: { score: sectorScore, max: 45, significantSectors },
      assetClassDiversification: { score: assetClassScore, max: 40, significantAssetClasses },
      geoCurrencyDiversification: { score: geoScore, max: 30, activeRegions: significantGeos },
      portfolioBalance: { score: balanceScore, max: 25, hhi: parseFloat(sumSquaredWeights.toFixed(3)) }
    }
  };
}

/**
 * 4 & 5. Judge-Assessed Criteria
 * Decision-Making and Adaptability (150 pts):
 *   - Response to market events: 45 pts
 *   - Decision timing and execution choices: 35 pts
 *   - Adaptability: 35 pts
 *   - Recognition of emerging risks/opportunities: 35 pts
 * Future Potential (100 pts):
 *   - Forward-looking portfolio positioning: 35 pts
 *   - Resilience under alternative scenarios: 30 pts
 *   - Opportunity/downside balance: 20 pts
 *   - Capacity to adapt going forward: 15 pts
 *
 * Ratings: 0 to 5 per criterion
 * Supports 2 independent judges and averages their criterion scores
 */
function calculateJudgeScores(scorecards = [], teamCode = '') {
  const teamCards = scorecards.filter(c => (c.teamCode || '').toUpperCase() === teamCode.toUpperCase());

  // Default neutral 3/5 rating if judging is not yet completed (for provisional view)
  const defaultRating = 3;

  if (teamCards.length === 0) {
    // Return provisional neutral scores
    const dScore = Math.round((defaultRating / 5) * 45) + Math.round((defaultRating / 5) * 35) + Math.round((defaultRating / 5) * 35) + Math.round((defaultRating / 5) * 35);
    const fScore = Math.round((defaultRating / 5) * 35) + Math.round((defaultRating / 5) * 30) + Math.round((defaultRating / 5) * 20) + Math.round((defaultRating / 5) * 15);
    return {
      decisionMaking: {
        total: dScore,
        isProvisional: true,
        breakdown: {
          responseToEvents: { rating: defaultRating, score: Math.round((defaultRating / 5) * 45), max: 45 },
          decisionTiming: { rating: defaultRating, score: Math.round((defaultRating / 5) * 35), max: 35 },
          adaptability: { rating: defaultRating, score: Math.round((defaultRating / 5) * 35), max: 35 },
          riskRecognition: { rating: defaultRating, score: Math.round((defaultRating / 5) * 35), max: 35 }
        }
      },
      futurePotential: {
        total: fScore,
        isProvisional: true,
        breakdown: {
          forwardPositioning: { rating: defaultRating, score: Math.round((defaultRating / 5) * 35), max: 35 },
          resilience: { rating: defaultRating, score: Math.round((defaultRating / 5) * 30), max: 30 },
          balance: { rating: defaultRating, score: Math.round((defaultRating / 5) * 20), max: 20 },
          adaptCapacity: { rating: defaultRating, score: Math.round((defaultRating / 5) * 15), max: 15 }
        }
      },
      judgesCount: 0,
      moderationRequired: false
    };
  }

  // Average ratings across available judges
  const sumDM = { response: 0, timing: 0, adapt: 0, risk: 0 };
  const sumFP = { forward: 0, resilience: 0, balance: 0, capacity: 0 };

  teamCards.forEach(card => {
    sumDM.response += Number(card.responseToEvents ?? defaultRating);
    sumDM.timing += Number(card.decisionTiming ?? defaultRating);
    sumDM.adapt += Number(card.adaptability ?? defaultRating);
    sumDM.risk += Number(card.riskRecognition ?? defaultRating);

    sumFP.forward += Number(card.forwardPositioning ?? defaultRating);
    sumFP.resilience += Number(card.resilience ?? defaultRating);
    sumFP.balance += Number(card.balance ?? defaultRating);
    sumFP.capacity += Number(card.adaptCapacity ?? defaultRating);
  });

  const count = teamCards.length;
  const avgDM = {
    response: sumDM.response / count,
    timing: sumDM.timing / count,
    adapt: sumDM.adapt / count,
    risk: sumDM.risk / count
  };
  const avgFP = {
    forward: sumFP.forward / count,
    resilience: sumFP.resilience / count,
    balance: sumFP.balance / count,
    capacity: sumFP.capacity / count
  };

  // Convert to points
  const dmResponseScore = Math.round((avgDM.response / 5) * 45);
  const dmTimingScore = Math.round((avgDM.timing / 5) * 35);
  const dmAdaptScore = Math.round((avgDM.adapt / 5) * 35);
  const dmRiskScore = Math.round((avgDM.risk / 5) * 35);
  const totalDM = dmResponseScore + dmTimingScore + dmAdaptScore + dmRiskScore;

  const fpForwardScore = Math.round((avgFP.forward / 5) * 35);
  const fpResilienceScore = Math.round((avgFP.resilience / 5) * 30);
  const fpBalanceScore = Math.round((avgFP.balance / 5) * 20);
  const fpCapacityScore = Math.round((avgFP.capacity / 5) * 15);
  const totalFP = fpForwardScore + fpResilienceScore + fpBalanceScore + fpCapacityScore;

  // Moderation check: Discrepancy > 20% between Judge 1 & 2
  let moderationRequired = false;
  if (count >= 2) {
    const card1Total = (teamCards[0].responseToEvents || 3) + (teamCards[0].decisionTiming || 3);
    const card2Total = (teamCards[1].responseToEvents || 3) + (teamCards[1].decisionTiming || 3);
    if (Math.abs(card1Total - card2Total) > 3) {
      moderationRequired = true;
    }
  }

  return {
    decisionMaking: {
      total: Math.min(150, Math.max(0, totalDM)),
      isProvisional: false,
      breakdown: {
        responseToEvents: { rating: parseFloat(avgDM.response.toFixed(1)), score: dmResponseScore, max: 45 },
        decisionTiming: { rating: parseFloat(avgDM.timing.toFixed(1)), score: dmTimingScore, max: 35 },
        adaptability: { rating: parseFloat(avgDM.adapt.toFixed(1)), score: dmAdaptScore, max: 35 },
        riskRecognition: { rating: parseFloat(avgDM.risk.toFixed(1)), score: dmRiskScore, max: 35 }
      }
    },
    futurePotential: {
      total: Math.min(100, Math.max(0, totalFP)),
      isProvisional: false,
      breakdown: {
        forwardPositioning: { rating: parseFloat(avgFP.forward.toFixed(1)), score: fpForwardScore, max: 35 },
        resilience: { rating: parseFloat(avgFP.resilience.toFixed(1)), score: fpResilienceScore, max: 30 },
        balance: { rating: parseFloat(avgFP.balance.toFixed(1)), score: fpBalanceScore, max: 20 },
        adaptCapacity: { rating: parseFloat(avgFP.capacity.toFixed(1)), score: fpCapacityScore, max: 15 }
      }
    },
    judgesCount: count,
    moderationRequired
  };
}

/**
 * Calculate penalties applied to an Investment House
 * Enforces published caps: max 50 pts per violation, max 150 pts aggregate deduction
 */
function calculatePenalties(penalties = [], teamCode = '') {
  const activePenalties = penalties.filter(p => 
    (p.teamCode || '').toUpperCase() === teamCode.toUpperCase() && 
    (p.status === 'APPLIED' || p.status === 'CONFIRMED')
  );

  let totalDeduction = 0;
  const processedPenalties = activePenalties.map(p => {
    const rawPts = Number(p.pointsDeducted) || 0;
    const boundedPts = Math.min(50, Math.max(0, rawPts));
    totalDeduction += boundedPts;
    return { ...p, effectivePointsDeducted: boundedPts };
  });

  const aggregateDeduction = Math.min(150, totalDeduction);

  return {
    totalDeduction: aggregateDeduction,
    penaltiesList: processedPenalties
  };
}

/**
 * Master House Scorecard Calculator (1,000 Points)
 * Risk Management: 300 pts (Automated)
 * Returns & Performance: 250 pts (Automated)
 * Diversification: 200 pts (Automated)
 * Decision-Making & Adaptability: 150 pts (Judge-assessed)
 * Future Potential: 100 pts (Judge-assessed)
 */
function calculateHouseScore(team, state = {}, config = DEFAULT_SCORING_CONFIG) {
  const securities = state.securities || [];
  const fxRates = state.fxRates || {};
  const startingCap = config.startingCapital || state.settings?.startingCapitalRetail || 10000000;
  const teamKey = team.teamCode || team.id;

  // Use frozen closing valuation snapshot if available for immutable post-close scoring
  const eventId = team.eventId || state.currentEventId || 'EVT_LIVE_MAIN';
  const frozenSnapshot = state.eventClosingSnapshots?.[eventId] || null;
  const frozenTeamVal = frozenSnapshot?.teamValuations?.[teamKey]?.valuationDetails;

  const valuation = frozenTeamVal || calculatePortfolioValuation(team, securities, fxRates, startingCap);
  const benchReturn = calculateBenchmarkReturn(state.marketIndices || {});

  const risk = calculateRiskScore(team, valuation, config);
  const returns = calculateReturnsScore(team, valuation, benchReturn, config);
  const diversification = calculateDiversificationScore(team, valuation);
  const judge = calculateJudgeScores(state.judgeScorecards || [], teamKey);
  const penalty = calculatePenalties(state.penalties || [], teamKey);

  const rawTotal = risk.total + returns.total + diversification.total + judge.decisionMaking.total + judge.futurePotential.total;
  const finalScore = Math.min(1000, Math.max(0, rawTotal - penalty.totalDeduction));

  const roiPct = startingCap > 0 ? ((valuation.totalEquity - startingCap) / startingCap) * 100 : 0;

  return {
    teamCode: teamKey,
    teamName: team.teamName || team.houseName || teamKey || 'Investment House',
    schoolName: team.schoolName || '',
    finalScore,
    rawScore: rawTotal,
    penaltiesDeducted: penalty.totalDeduction,
    penaltiesList: penalty.penaltiesList,
    valuation,
    roiPct: parseFloat(roiPct.toFixed(2)),
    snapshotBinding: frozenSnapshot ? {
      snapshotId: frozenSnapshot.id,
      immutableHash: frozenSnapshot.immutableHash,
      frozenAt: frozenSnapshot.frozenAt
    } : null,
    rubricVersion: config.version || SCORING_RUBRIC_VERSION,
    categories: {
      riskManagement: { name: 'Risk Management', score: risk.total, max: 300, breakdown: risk.breakdown, isJudgeAssessed: false },
      returnsPerformance: { name: 'Returns & Performance', score: returns.total, max: 250, breakdown: returns.breakdown, isJudgeAssessed: false },
      diversification: { name: 'Diversification', score: diversification.total, max: 200, breakdown: diversification.breakdown, isJudgeAssessed: false },
      decisionMaking: { name: 'Decision-Making & Adaptability', score: judge.decisionMaking.total, max: 150, breakdown: judge.decisionMaking.breakdown, isProvisional: judge.decisionMaking.isProvisional, isJudgeAssessed: true },
      futurePotential: { name: 'Future Potential', score: judge.futurePotential.total, max: 100, breakdown: judge.futurePotential.breakdown, isProvisional: judge.futurePotential.isProvisional, isJudgeAssessed: true }
    },
    judgingStatus: {
      judgesCount: judge.judgesCount,
      moderationRequired: judge.moderationRequired
    }
  };
}

/**
 * Generate Complete Leaderboard with Deterministic Tie-Breaks
 */
function generateLeaderboard(state = {}, config = DEFAULT_SCORING_CONFIG) {
  const teams = Array.isArray(state.teams) ? state.teams : Object.values(state.teams || {});
  const activeTeams = teams.filter(t => t.isActive !== false && t.status !== 'DISQUALIFIED');

  const scoredTeams = activeTeams.map(t => calculateHouseScore(t, state, config));

  // Sort with multi-tier tie breaks
  scoredTeams.sort((a, b) => {
    // 1. Primary: Final Score
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    // 2. Tie-Break 1: Higher Risk Management score
    if (b.categories.riskManagement.score !== a.categories.riskManagement.score) {
      return b.categories.riskManagement.score - a.categories.riskManagement.score;
    }
    // 3. Tie-Break 2: Higher Decision-Making score
    if (b.categories.decisionMaking.score !== a.categories.decisionMaking.score) {
      return b.categories.decisionMaking.score - a.categories.decisionMaking.score;
    }
    // 4. Tie-Break 3: Higher Diversification score
    if (b.categories.diversification.score !== a.categories.diversification.score) {
      return b.categories.diversification.score - a.categories.diversification.score;
    }
    // 5. Tie-Break 4: Higher Returns score
    if (b.categories.returnsPerformance.score !== a.categories.returnsPerformance.score) {
      return b.categories.returnsPerformance.score - a.categories.returnsPerformance.score;
    }
    // 6. Tie-Break 5: Total Portfolio Equity
    return (b.valuation?.totalEquity || 0) - (a.valuation?.totalEquity || 0);
  });

  scoredTeams.forEach((t, i) => {
    t.rank = i + 1;
  });

  return scoredTeams;
}

export {
  SCORING_RUBRIC_VERSION,
  DEFAULT_SCORING_CONFIG,
  calculatePortfolioValuation,
  calculateBenchmarkReturn,
  calculateRiskScore,
  calculateReturnsScore,
  calculateDiversificationScore,
  calculateJudgeScores,
  calculatePenalties,
  calculateHouseScore,
  generateLeaderboard
};

export default {
  SCORING_RUBRIC_VERSION,
  DEFAULT_SCORING_CONFIG,
  calculatePortfolioValuation,
  calculateBenchmarkReturn,
  calculateRiskScore,
  calculateReturnsScore,
  calculateDiversificationScore,
  calculateJudgeScores,
  calculatePenalties,
  calculateHouseScore,
  generateLeaderboard
};
