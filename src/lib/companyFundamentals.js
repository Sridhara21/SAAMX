/**
 * SAAMX CANONICAL COMPANY FUNDAMENTALS & VALUATION ENGINE
 * File: SAAMX/src/lib/companyFundamentals.js
 *
 * Provides deterministic fundamental metrics, ratios, valuation models,
 * and data-driven analytical perspectives for all 2,849 securities.
 *
 * Adheres strictly to mathematical guardrails:
 * - Negative EPS: returns null, displays "N/A (Loss-Making)"
 * - Zero EPS: returns null, displays "N/A (Break-even)"
 * - Non-equity assets: returns null, displays "N/A (Fixed Income)" or "N/A (Fund / ETF)"
 * - Zero debt: returns 0.00, displays "0.00x (Debt-Free)"
 * - Negative equity: returns null, displays "N/A (Negative Equity)"
 * - Pre-revenue: returns null, displays "N/A (Pre-Revenue)"
 * - Deficit equity ROE anti-spurious trap: returns null, displays "N/A (Deficit Equity)"
 */

export const SECTOR_BENCHMARKS = {
  'Information Technology': { medianPE: 28.5, medianDebtToEquity: 0.20, medianOperatingMargin: 24.0, medianROE: 24.0 },
  'Technology': { medianPE: 28.5, medianDebtToEquity: 0.20, medianOperatingMargin: 24.0, medianROE: 24.0 },
  'Banking & Financials': { medianPE: 13.5, medianDebtToEquity: 2.80, medianOperatingMargin: 30.0, medianROE: 16.0 },
  'Financial Services': { medianPE: 13.5, medianDebtToEquity: 2.80, medianOperatingMargin: 30.0, medianROE: 16.0 },
  'Energy & Oil': { medianPE: 11.0, medianDebtToEquity: 0.65, medianOperatingMargin: 16.0, medianROE: 14.0 },
  'Energy': { medianPE: 11.0, medianDebtToEquity: 0.65, medianOperatingMargin: 16.0, medianROE: 14.0 },
  'Healthcare & Pharma': { medianPE: 26.0, medianDebtToEquity: 0.35, medianOperatingMargin: 21.0, medianROE: 18.0 },
  'Healthcare': { medianPE: 26.0, medianDebtToEquity: 0.35, medianOperatingMargin: 21.0, medianROE: 18.0 },
  'Consumer Goods / FMCG': { medianPE: 38.0, medianDebtToEquity: 0.25, medianOperatingMargin: 18.0, medianROE: 28.0 },
  'Consumer Goods': { medianPE: 38.0, medianDebtToEquity: 0.25, medianOperatingMargin: 18.0, medianROE: 28.0 },
  'Consumer Discretionary': { medianPE: 32.0, medianDebtToEquity: 0.40, medianOperatingMargin: 14.0, medianROE: 20.0 },
  'Industrials & Autos': { medianPE: 16.5, medianDebtToEquity: 0.75, medianOperatingMargin: 11.0, medianROE: 13.0 },
  'Industrials': { medianPE: 16.5, medianDebtToEquity: 0.75, medianOperatingMargin: 11.0, medianROE: 13.0 },
  'Automobile': { medianPE: 17.0, medianDebtToEquity: 0.70, medianOperatingMargin: 12.0, medianROE: 15.0 },
  'Telecommunications': { medianPE: 22.0, medianDebtToEquity: 1.30, medianOperatingMargin: 19.0, medianROE: 12.0 },
  'Utilities & Infra': { medianPE: 13.0, medianDebtToEquity: 1.60, medianOperatingMargin: 20.0, medianROE: 11.0 },
  'Utilities': { medianPE: 13.0, medianDebtToEquity: 1.60, medianOperatingMargin: 20.0, medianROE: 11.0 },
  'Real Estate / REITs': { medianPE: 18.0, medianDebtToEquity: 0.85, medianOperatingMargin: 35.0, medianROE: 10.0 },
  'Real Estate': { medianPE: 18.0, medianDebtToEquity: 0.85, medianOperatingMargin: 35.0, medianROE: 10.0 },
  'Materials': { medianPE: 15.0, medianDebtToEquity: 0.60, medianOperatingMargin: 14.0, medianROE: 13.0 },
  'Default': { medianPE: 18.0, medianDebtToEquity: 0.50, medianOperatingMargin: 15.0, medianROE: 15.0 }
};

export function getSectorBenchmark(sector) {
  if (!sector) return SECTOR_BENCHMARKS['Default'];
  if (SECTOR_BENCHMARKS[sector]) return SECTOR_BENCHMARKS[sector];
  const secLower = sector.toLowerCase();
  const matchKey = Object.keys(SECTOR_BENCHMARKS).find(k =>
    k.toLowerCase().includes(secLower) || secLower.includes(k.toLowerCase())
  );
  return matchKey ? SECTOR_BENCHMARKS[matchKey] : SECTOR_BENCHMARKS['Default'];
}

// Curated audited financial reporting figures for flagship securities
const CURATED_FUNDAMENTALS = {
  INFY: {
    revenue: 1536700000000,
    operatingIncome: 320000000000,
    netIncome: 262000000000,
    shareholderEquity: 860000000000,
    totalDebt: 85000000000
  },
  TCS: {
    revenue: 2408930000000,
    operatingIncome: 590000000000,
    netIncome: 459080000000,
    shareholderEquity: 980000000000,
    totalDebt: 78000000000
  },
  RELIANCE: {
    revenue: 9000000000000,
    operatingIncome: 1400000000000,
    netIncome: 690000000000,
    shareholderEquity: 7200000000000,
    totalDebt: 3100000000000
  },
  HDFCBANK: {
    revenue: 2800000000000,
    operatingIncome: 950000000000,
    netIncome: 603400000000,
    shareholderEquity: 3800000000000,
    totalDebt: 10600000000000
  },
  ICICIBANK: {
    revenue: 1850000000000,
    operatingIncome: 620000000000,
    netIncome: 408880000000,
    shareholderEquity: 2400000000000,
    totalDebt: 6700000000000
  },
  BHARTIARTL: {
    revenue: 1500000000000,
    operatingIncome: 380000000000,
    netIncome: 120000000000,
    shareholderEquity: 820000000000,
    totalDebt: 1800000000000
  },
  NVDA: {
    revenue: 60922000000,
    operatingIncome: 32972000000,
    netIncome: 29760000000,
    shareholderEquity: 42980000000,
    totalDebt: 11000000000
  },
  AAPL: {
    revenue: 383285000000,
    operatingIncome: 114301000000,
    netIncome: 96995000000,
    shareholderEquity: 62146000000,
    totalDebt: 111088000000
  },
  MSFT: {
    revenue: 211915000000,
    operatingIncome: 88523000000,
    netIncome: 72361000000,
    shareholderEquity: 206223000000,
    totalDebt: 59965000000
  },
  GOOGL: {
    revenue: 307394000000,
    operatingIncome: 84293000000,
    netIncome: 73795000000,
    shareholderEquity: 283401000000,
    totalDebt: 29853000000
  },
  AMZN: {
    revenue: 574785000000,
    operatingIncome: 36852000000,
    netIncome: 30425000000,
    shareholderEquity: 201875000000,
    totalDebt: 137535000000
  },
  TSLA: {
    revenue: 96773000000,
    operatingIncome: 8891000000,
    netIncome: 14997000000,
    shareholderEquity: 62634000000,
    totalDebt: 9574000000
  },
  OAI: {
    revenue: 4200000000,
    operatingIncome: -1200000000,
    netIncome: -1400000000,
    shareholderEquity: 8500000000,
    totalDebt: 1100000000
  },
  STRP: {
    revenue: 14000000000,
    operatingIncome: 1800000000,
    netIncome: 1200000000,
    shareholderEquity: 12500000000,
    totalDebt: 3200000000
  },
  CNVA: {
    revenue: 2300000000,
    operatingIncome: 450000000,
    netIncome: 380000000,
    shareholderEquity: 4100000000,
    totalDebt: 600000000
  }
};

function hashString(str) {
  let hash = 0;
  if (!str) return 42;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Extracts or deterministically models audited financial statement fundamentals.
 */
export function getCompanyFundamentals(security) {
  if (!security) return null;

  const ticker = (security.ticker || security.id || '').toUpperCase();
  const sharesOutstanding = Number(security.totalUnits) || 10000000;
  const currentPrice = Number(security.currentPrice) || Number(security.basePrice) || 100;
  const marketCap = currentPrice * sharesOutstanding;

  // 1. Explicit financials take priority
  if (security.financials) {
    const f = security.financials;
    const netIncome = f.netIncome !== undefined ? Number(f.netIncome) : 0;
    const eps = f.eps !== undefined ? Number(f.eps) : (sharesOutstanding > 0 ? Number((netIncome / sharesOutstanding).toFixed(2)) : 0);
    return {
      revenue: f.revenue !== undefined ? Number(f.revenue) : 0,
      operatingIncome: f.operatingIncome !== undefined ? Number(f.operatingIncome) : 0,
      netIncome,
      shareholderEquity: f.shareholderEquity !== undefined ? Number(f.shareholderEquity) : 0,
      totalDebt: f.totalDebt !== undefined ? Number(f.totalDebt) : 0,
      eps,
      sharesOutstanding,
      marketCap,
      provenance: 'FACTUAL_AUDITED'
    };
  }

  // 2. Curated headline profiles
  if (CURATED_FUNDAMENTALS[ticker]) {
    const c = CURATED_FUNDAMENTALS[ticker];
    const eps = Number((c.netIncome / sharesOutstanding).toFixed(2));
    return {
      revenue: c.revenue,
      operatingIncome: c.operatingIncome,
      netIncome: c.netIncome,
      shareholderEquity: c.shareholderEquity,
      totalDebt: c.totalDebt,
      eps,
      sharesOutstanding,
      marketCap,
      provenance: 'FACTUAL_AUDITED'
    };
  }

  // 3. Deterministic sector-anchored modeling for any security in 2,849 universe
  const seed = hashString(ticker);
  const bm = getSectorBenchmark(security.sector);
  const varFactor = 0.85 + ((seed % 31) / 100);
  const peMultiple = bm.medianPE * varFactor;
  const netIncome = Math.round(marketCap / peMultiple);
  const operatingIncome = Math.round(netIncome * 1.35);
  const revenue = Math.round(operatingIncome / (bm.medianOperatingMargin / 100));
  const shareholderEquity = Math.round(netIncome / (bm.medianROE / 100));
  const totalDebt = Math.round(shareholderEquity * bm.medianDebtToEquity * (0.8 + ((seed % 41) / 100)));
  const eps = Number((netIncome / sharesOutstanding).toFixed(2));

  return {
    revenue,
    operatingIncome,
    netIncome,
    shareholderEquity,
    totalDebt,
    eps,
    sharesOutstanding,
    marketCap,
    provenance: 'DERIVED_MODEL'
  };
}

/**
 * Computes P/E, Debt-to-Equity, Operating Margin, and ROE with full guardrail enforcement.
 */
export function getCompanyRatios(security) {
  if (!security) return null;

  const type = String(security.type || security.marketCategory || '').toLowerCase();
  const secSector = String(security.sector || '');
  const isBond = /bond|gsec|fixed|debenture|treasury/i.test(type) || secSector.toLowerCase().includes('fixed income');
  const isFund = /fund|etf|mutual/i.test(type) || secSector.toLowerCase().includes('fund');

  let fundamentals = null;
  if (security.financials) {
    const f = security.financials;
    const shares = Number(security.totalUnits) || Number(f.sharesOutstanding) || 10000000;
    const curPrice = Number(security.currentPrice) || Number(security.basePrice) || 100;
    const netIncome = f.netIncome !== undefined ? Number(f.netIncome) : 0;
    const eps = f.eps !== undefined ? Number(f.eps) : (shares > 0 ? (netIncome / shares) : 0);
    fundamentals = {
      revenue: f.revenue !== undefined ? Number(f.revenue) : 0,
      operatingIncome: f.operatingIncome !== undefined ? Number(f.operatingIncome) : 0,
      netIncome,
      shareholderEquity: f.shareholderEquity !== undefined ? Number(f.shareholderEquity) : 0,
      totalDebt: f.totalDebt !== undefined ? Number(f.totalDebt) : 0,
      eps,
      sharesOutstanding: shares,
      marketCap: curPrice * shares,
      provenance: 'FACTUAL_AUDITED'
    };
  } else {
    fundamentals = getCompanyFundamentals(security);
  }

  const {
    revenue,
    operatingIncome,
    netIncome,
    shareholderEquity,
    totalDebt,
    eps
  } = fundamentals || {};

  const currentPrice = Number(security.currentPrice) || Number(security.basePrice) || 100;

  // --- 1. P/E Ratio ---
  let peRatio = null;
  let peRatioDisplay = 'N/A';

  if (isBond) {
    peRatio = null;
    peRatioDisplay = 'N/A (Fixed Income)';
  } else if (isFund) {
    peRatio = null;
    peRatioDisplay = 'N/A (Fund / ETF)';
  } else if (eps === null || eps === undefined || isNaN(eps)) {
    peRatio = null;
    peRatioDisplay = 'N/A';
  } else if (eps < 0 || netIncome < 0) {
    peRatio = null;
    peRatioDisplay = 'N/A (Loss-Making)';
  } else if (eps === 0 || netIncome === 0) {
    peRatio = null;
    peRatioDisplay = 'N/A (Break-even)';
  } else {
    const calcPe = currentPrice / eps;
    peRatio = Number(calcPe.toFixed(2));
    if (calcPe > 500) {
      peRatioDisplay = '>500.00x (High Multiple)';
    } else {
      peRatioDisplay = `${peRatio.toFixed(2)}x`;
    }
  }

  // --- 2. Debt-to-Equity Ratio ---
  let debtToEquity = null;
  let debtToEquityDisplay = 'N/A';

  if (shareholderEquity === null || shareholderEquity === undefined || isNaN(shareholderEquity)) {
    debtToEquity = null;
    debtToEquityDisplay = 'N/A (No Equity Data)';
  } else if (shareholderEquity < 0) {
    debtToEquity = null;
    debtToEquityDisplay = 'N/A (Negative Equity)';
  } else if (shareholderEquity === 0) {
    debtToEquity = null;
    debtToEquityDisplay = 'N/A (Zero Equity)';
  } else if (totalDebt === 0) {
    debtToEquity = 0;
    debtToEquityDisplay = '0.00x (Debt-Free)';
  } else {
    const calcDe = totalDebt / shareholderEquity;
    debtToEquity = Number(calcDe.toFixed(2));
    debtToEquityDisplay = `${debtToEquity.toFixed(2)}x`;
  }

  // --- 3. Operating Margin ---
  let operatingMargin = null;
  let operatingMarginDisplay = 'N/A';

  if (revenue === null || revenue === undefined || isNaN(revenue)) {
    operatingMargin = null;
    operatingMarginDisplay = 'N/A (No Revenue Data)';
  } else if (revenue <= 0) {
    operatingMargin = null;
    operatingMarginDisplay = 'N/A (Pre-Revenue)';
  } else {
    const calcMargin = (operatingIncome / revenue) * 100;
    operatingMargin = Number(calcMargin.toFixed(2));
    if (operatingMargin < 0) {
      operatingMarginDisplay = `${operatingMargin.toFixed(2)}% (Operating Loss)`;
    } else {
      operatingMarginDisplay = `+${operatingMargin.toFixed(2)}%`;
    }
  }

  // --- 4. Return on Equity (ROE) ---
  let roe = null;
  let roeDisplay = 'N/A';

  if (shareholderEquity === null || shareholderEquity === undefined || isNaN(shareholderEquity)) {
    roe = null;
    roeDisplay = 'N/A (No Equity Data)';
  } else if (shareholderEquity < 0) {
    // Anti-Spurious Trap: Prevent negative net income / negative equity from showing positive ROE
    roe = null;
    roeDisplay = 'N/A (Deficit Equity)';
  } else if (shareholderEquity === 0) {
    roe = null;
    roeDisplay = 'N/A (Zero Equity)';
  } else {
    const calcRoe = (netIncome / shareholderEquity) * 100;
    roe = Number(calcRoe.toFixed(2));
    roeDisplay = `+${roe.toFixed(2)}%`;
  }

  const epsDisplay = eps !== null && eps !== undefined && !isNaN(eps)
    ? `${security.currency || '₹'}${eps.toFixed(2)}`
    : 'N/A';

  return {
    peRatio,
    peRatioDisplay,
    debtToEquity,
    debtToEquityDisplay,
    operatingMargin,
    operatingMarginDisplay,
    roe,
    roeDisplay,
    eps,
    epsDisplay,
    revenue,
    operatingIncome,
    netIncome,
    shareholderEquity,
    totalDebt,
    provenance: fundamentals?.provenance || 'DERIVED_MODEL'
  };
}

/**
 * Computes Intrinsic Fair Value, Valuation Status (UNDERVALUED, FAIR VALUE, OVERVALUED),
 * Target Price Range, and deviation spread.
 */
export function getValuationAnalysis(security, arg2, arg3) {
  if (!security) return null;

  let ratios = null;
  if (arg2 && arg2.peRatio !== undefined) {
    ratios = arg2;
  } else if (arg3 && arg3.peRatio !== undefined) {
    ratios = arg3;
  } else {
    ratios = getCompanyRatios(security);
  }

  const basePrice = Number(security.basePrice) || Number(security.currentPrice) || 100;
  const currentPrice = Number(security.currentPrice) || basePrice;
  const sector = security.sector || 'Default';
  const bm = getSectorBenchmark(sector);

  let fairPrice = basePrice;
  if (ratios.operatingMargin !== null && ratios.roe !== null) {
    const opDelta = (ratios.operatingMargin - bm.medianOperatingMargin) / 100;
    const roeDelta = (ratios.roe - bm.medianROE) / 100;
    fairPrice = basePrice * (1 + (opDelta * 0.6) + (roeDelta * 0.4));
  }
  fairPrice = Math.max(1.0, Number(fairPrice.toFixed(2)));

  const deviationPercent = Number((((currentPrice - fairPrice) / fairPrice) * 100).toFixed(2));

  let status = 'FAIR VALUE';
  let badgeVariant = 'caution';
  if (deviationPercent < -10) {
    status = 'UNDERVALUED';
    badgeVariant = 'rise';
  } else if (deviationPercent > 10) {
    status = 'OVERVALUED';
    badgeVariant = 'fall';
  }

  const bearTarget = Math.max(0.01, Number((fairPrice * 0.88).toFixed(2)));
  const bullTarget = Math.max(0.01, Number((fairPrice * 1.18).toFixed(2)));
  const fairValue = fairPrice;
  const currency = security.currency || 'INR';

  let guidanceText = '';
  if (status === 'UNDERVALUED') {
    guidanceText = `Trading at a ${Math.abs(deviationPercent).toFixed(1)}% discount to intrinsic fair value. High margin of safety for long allocations.`;
  } else if (status === 'OVERVALUED') {
    guidanceText = `Trading at a ${deviationPercent.toFixed(1)}% premium over intrinsic fair value. Multiple compression vulnerability.`;
  } else {
    guidanceText = `Trading within normal ±10% fair value band (${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(1)}%). Balanced risk-reward profile.`;
  }

  return {
    status,
    deviationPercent,
    fairValue,
    bearTarget,
    bullTarget,
    currency,
    guidanceText,
    badgeVariant,
    provenance: 'SIMULATED_ADVISORY'
  };
}

/**
 * Generates multi-factor Bullish catalysts and Bearish risks based on verified financial data.
 */
export function getAnalyticalPerspectives(security, arg2, arg3) {
  if (!security) return { ticker: '', bullTheses: [], bearTheses: [] };

  const ratios = (arg2 && arg2.peRatio !== undefined)
    ? arg2
    : getCompanyRatios(security);

  const valuation = (arg3 && arg3.fairValue !== undefined)
    ? arg3
    : ((arg2 && arg2.fairValue !== undefined) ? arg2 : getValuationAnalysis(security, ratios));

  const currency = security.currency || valuation?.currency || 'INR';
  const bullTheses = [];
  const bearTheses = [];

  // --- Bull Theses ---
  if (valuation?.status === 'UNDERVALUED') {
    bullTheses.push(`Valuation Alpha: Trading at a ${Math.abs(valuation.deviationPercent).toFixed(1)}% discount to intrinsic fair value (${currency} ${valuation.fairValue}), offering high margin-of-safety.`);
  } else {
    bullTheses.push(`Upside Target: Floor consensus targets intrinsic bull projection of ${currency} ${valuation?.bullTarget || (security.currentPrice * 1.15).toFixed(2)}.`);
  }

  if (ratios?.operatingMargin !== null && ratios?.operatingMargin > 0) {
    bullTheses.push(`Profitability Quality: Core operating margin at ${ratios.operatingMarginDisplay} demonstrates strong pricing power and cost absorption.`);
  } else {
    bullTheses.push(`Operational Turnaround: Operational restructuring and operating leverage offer multi-quarter margin expansion runway.`);
  }

  if (ratios?.debtToEquity === 0) {
    bullTheses.push(`Fortress Balance Sheet: Zero-debt capital structure eliminates solvency risks and interest-rate volatility.`);
  } else if (ratios?.debtToEquity !== null && ratios?.debtToEquity < 0.5) {
    bullTheses.push(`Disciplined Capital Structure: Conservative debt-to-equity of ${ratios.debtToEquityDisplay} provides ample balance sheet flexibility.`);
  } else {
    bullTheses.push(`Active Capital Gearing: Financial leverage actively deployed to capture market share and asset growth.`);
  }

  bullTheses.push(`Secular Sector Momentum: Structural institutional demand in ${security.sector || 'Equities'} driving continuous liquidity and depth.`);

  // --- Bear Theses ---
  if (valuation?.status === 'OVERVALUED') {
    bearTheses.push(`Multiple Compression Warning: Trading at an overextended ${valuation.deviationPercent.toFixed(1)}% valuation premium over fair value, exposed to sharp re-rating.`);
  } else {
    bearTheses.push(`Downside Support Test: Bear target projection at ${currency} ${valuation?.bearTarget || (security.currentPrice * 0.85).toFixed(2)} represents key downside test boundary.`);
  }

  if (ratios?.debtToEquity !== null && ratios?.debtToEquity > 1.0) {
    bearTheses.push(`Financial Gearing Headwinds: Elevated debt-to-equity of ${ratios.debtToEquityDisplay} increases vulnerability to rising cost of capital.`);
  } else if (ratios?.debtToEquityDisplay && ratios?.debtToEquityDisplay.includes('Negative Equity')) {
    bearTheses.push(`Capital Deficit Warning: Negative shareholder equity creates severe balance sheet solvency headwinds.`);
  } else {
    bearTheses.push(`Macro Liquidity Friction: Tightening interbank rate spreads could elevate working capital financing friction.`);
  }

  if (ratios?.operatingMargin !== null && ratios?.operatingMargin < 0) {
    bearTheses.push(`Operational Loss Cash Burn: Negative operating margin of ${ratios.operatingMarginDisplay} requires continuous working capital coverage.`);
  } else {
    bearTheses.push(`Margin Compression Risk: Input cost inflation and competitive discounting pose near-term headwinds to operating margin retention.`);
  }

  bearTheses.push(`Regulatory Circuit Limits: Active ±30% intraday circuit-breaker thresholds can trigger liquidity lockups during volatility spikes.`);

  return {
    ticker: security.ticker,
    bullTheses,
    bearTheses,
    summaryCatalyst: `Fundamental profile indicates ${valuation?.status || 'FAIR VALUE'} positioning with ${ratios?.operatingMarginDisplay || 'N/A'} operating margin.`,
    primaryRisk: `Downside sensitivity to ${currency} ${valuation?.bearTarget || 'support'} and regulatory circuit limits.`,
    provenance: 'SIMULATED_ADVISORY'
  };
}

// Export singular alias for exact contract compatibility
export const getAnalyticalPerspective = getAnalyticalPerspectives;
