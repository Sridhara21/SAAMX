// scripts/generate_320_events.js
import fs from 'fs';

console.log('Generating 320+ Structured Market Events for SAAMX 2026 Master Narrative...');

const events = [];
let seq = 1;

function addEvent(evt) {
  const padSeq = String(seq).padStart(3, '0');
  const fullEvt = {
    id: `EVT_${padSeq}`,
    sequence: seq++,
    scheduledTime: evt.scheduledTime || '09:30',
    triggerMinute: evt.triggerMinute || 15,
    category: evt.category || 'CORPORATE',
    tier: evt.tier || 'TIER_3',
    title: evt.title,
    shortHeadline: evt.shortHeadline || evt.title,
    description: evt.description,
    affectedCountries: evt.affectedCountries || ['India', 'United States'],
    affectedExchanges: evt.affectedExchanges || ['NSE', 'NASDAQ', 'NYSE'],
    affectedCurrencies: evt.affectedCurrencies || ['INR', 'USD'],
    affectedSectors: evt.affectedSectors || ['Technology'],
    affectedSecurities: evt.affectedSecurities || [],
    marketImpact: evt.marketImpact || 'NEUTRAL',
    volatilityImpact: evt.volatilityImpact || 'LOW',
    projectorPriority: evt.tier === 'TIER_1',
    participantVisible: true,
    requiresAdminTrigger: evt.requiresAdminTrigger !== undefined ? evt.requiresAdminTrigger : (evt.tier === 'TIER_1'),
    audioCue: evt.tier === 'TIER_1' ? 'breaking_news' : (evt.tier === 'TIER_2' ? 'alert_ping' : 'ticker_tick'),
    storyline: evt.storyline || 'GENERAL_MARKET',
    bullCommentary: evt.bullCommentary || null,
    bearCommentary: evt.bearCommentary || null
  };
  events.push(fullEvt);
  return fullEvt;
}

// ------------------------------------------------------------------------------------------------
// TIER 1: 35 MAJOR MARKET DEFINING EVENTS
// ------------------------------------------------------------------------------------------------

// 09:00 Pre-Open Signals
addEvent({
  scheduledTime: '09:00', triggerMinute: 0, category: 'GLOBAL_MACRO', tier: 'TIER_1',
  title: 'SAAMX Global Pre-Open Session Commences: Asian Indices Mixed Ahead of Milestone Event',
  description: 'Global capital markets prepare for the opening of SAAMX 2026. Overnight trading across Nikkei and Hang Seng showed defensive positioning in utilities with selective buying in AI hardware.',
  affectedCountries: ['India', 'Japan', 'Hong Kong'], affectedExchanges: ['NSE', 'TSE', 'HKG'], affectedCurrencies: ['INR', 'USD'],
  affectedSectors: ['Technology', 'Utilities'],
  affectedSecurities: [{ ticker: 'TCS', impactPercent: 0.5 }, { ticker: 'INFY', impactPercent: 0.4 }, { ticker: 'NVDA', impactPercent: 0.8 }],
  marketImpact: 'NEUTRAL', volatilityImpact: 'LOW', storyline: 'OPENING_NEWS'
});

addEvent({
  scheduledTime: '09:15', triggerMinute: 15, category: 'GLOBAL_MACRO', tier: 'TIER_1',
  title: '🔔 SAAMX Market Opening Bell: Continuous Multi-Currency Trading is Live',
  description: 'The ceremonial opening bell rings across the trading floor. Trading desks report heavy initial liquidity in benchmark Indian large-caps and US megacaps.',
  affectedCountries: ['India', 'United States', 'United Kingdom', 'Europe'], affectedExchanges: ['NSE', 'BSE', 'NASDAQ', 'NYSE', 'LSE'],
  affectedCurrencies: ['INR', 'USD', 'GBP', 'EUR'], affectedSectors: ['Financial Services', 'Technology', 'Energy'],
  affectedSecurities: [{ ticker: 'RELIANCE', impactPercent: 1.2 }, { ticker: 'HDFCBANK', impactPercent: 0.8 }, { ticker: 'AAPL', impactPercent: 1.0 }, { ticker: 'MSFT', impactPercent: 1.1 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'MEDIUM', storyline: 'OPENING_NEWS'
});

// 09:30–09:45: Opening News Anchor Studio 10-Headline Sequence
const OPENING_HEADLINES = [
  { title: 'Union Ministry Announces ₹45,000 Cr Semiconductor Sub-Component Incentive Scheme', sec: [{ ticker: 'DIXON', impactPercent: 6.2 }, { ticker: 'TATAELXSI', impactPercent: 4.5 }, { ticker: 'KAYNES', impactPercent: 5.8 }], sector: 'Technology', cat: 'GOVERNMENT', impact: 'POSITIVE' },
  { title: 'Crude Oil Bounces to $82/bbl Following Red Sea Maritime Routing Delays', sec: [{ ticker: 'ONGC', impactPercent: 3.8 }, { ticker: 'OIL', impactPercent: 4.2 }, { ticker: 'INDIGO', impactPercent: -4.5 }, { ticker: 'BPCL', impactPercent: -2.1 }], sector: 'Energy', cat: 'GLOBAL_MACRO', impact: 'MIXED' },
  { title: 'RBI Liquidity Survey Signals Accommodative Stance for Scheduled Commercial Banks', sec: [{ ticker: 'SBIN', impactPercent: 2.8 }, { ticker: 'ICICIBANK', impactPercent: 2.4 }, { ticker: 'KOTAKBANK', impactPercent: 1.9 }], sector: 'Financial Services', cat: 'GOVERNMENT', impact: 'POSITIVE' },
  { title: 'US Federal Reserve Minutes Hint at Extended Pause in Benchmark Fed Funds Rate', sec: [{ ticker: 'AAPL', impactPercent: 1.5 }, { ticker: 'GOOGL', impactPercent: 1.8 }, { ticker: 'AMZN', impactPercent: 1.4 }], sector: 'Technology', cat: 'GLOBAL_MACRO', impact: 'POSITIVE' },
  { title: 'European Carbon Border Adjustment (CBAM) Prompts Re-evaluation of Steel Export Margins', sec: [{ ticker: 'TATASTEEL', impactPercent: -3.2 }, { ticker: 'JSWSTEEL', impactPercent: -2.8 }, { ticker: 'SAIL', impactPercent: -3.5 }], sector: 'Metals & Mining', cat: 'REGULATORY', impact: 'NEGATIVE' },
  { title: 'Telecom Department Circulates Spectrum Dues Consultation Paper with Strict Default Clauses', sec: [{ ticker: 'IDEA', impactPercent: -5.4 }, { ticker: 'BHARTIARTL', impactPercent: 1.5 }], sector: 'Telecommunications', cat: 'REGULATORY', impact: 'MIXED' },
  { title: 'Leading Private Hospital Operators Report 18% Increase in Medical Tourism Revenue', sec: [{ ticker: 'APOLLOHOSP', impactPercent: 3.5 }, { ticker: 'MAXHEALTH', impactPercent: 4.1 }, { ticker: 'MEDANTA', impactPercent: 3.8 }], sector: 'Healthcare', cat: 'CORPORATE', impact: 'POSITIVE' },
  { title: 'National Highways Authority Awards ₹18,200 Cr Toll-Operate-Transfer (TOT) Bundles', sec: [{ ticker: 'LT', impactPercent: 3.2 }, { ticker: 'IRB', impactPercent: 4.8 }, { ticker: 'PNCINFRA', impactPercent: 3.6 }], sector: 'Infrastructure', cat: 'GOVERNMENT', impact: 'POSITIVE' },
  { title: 'Global AI Infrastructure Alliance Hints at Landmark Pre-IPO Primary Filings', sec: [{ ticker: 'NVDA', impactPercent: 3.5 }, { ticker: 'AVGO', impactPercent: 2.8 }, { ticker: 'SMCI', impactPercent: 4.2 }], sector: 'Technology', cat: 'IPO', impact: 'POSITIVE' },
  { title: 'Foreign Portfolio Investors (FPI) Record Net Inflows of ₹4,200 Cr in Morning Session', sec: [{ ticker: 'NIFTYBEES', impactPercent: 1.5 }, { ticker: 'BANKBEES', impactPercent: 1.8 }, { ticker: 'HDFCBANK', impactPercent: 2.0 }], sector: 'Financial Services', cat: 'CURRENCY', impact: 'POSITIVE' }
];

OPENING_HEADLINES.forEach((h, i) => {
  addEvent({
    scheduledTime: `09:${30 + i * 2}`, triggerMinute: 30 + i * 2, category: h.cat || 'CORPORATE', tier: 'TIER_1',
    title: h.title,
    shortHeadline: h.title,
    description: `Official morning broadcast segment presented by News Anchor Studio. ${h.title}. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.`,
    affectedSectors: [h.sector],
    affectedSecurities: h.sec,
    marketImpact: h.impact,
    volatilityImpact: 'MEDIUM',
    storyline: 'OPENING_NEWS'
  });
});

// 10:30: Bull vs Bear Showdown I
addEvent({
  scheduledTime: '10:30', triggerMinute: 90, category: 'SENTIMENT', tier: 'TIER_1',
  title: '⚔️ Bull vs Bear Showdown I: Tech Valuations & Global AI Capex Sustainability',
  description: 'Live physical face-off on the trading stage between the Market Bull and Bear. Bull argues AI compute demand is non-cyclical; Bear warns enterprise software monetisation lags hardware spending.',
  affectedSectors: ['Technology', 'Information Technology'],
  affectedSecurities: [{ ticker: 'TCS', impactPercent: 1.2 }, { ticker: 'INFY', impactPercent: -1.0 }, { ticker: 'NVDA', impactPercent: 2.4 }, { ticker: 'MSFT', impactPercent: 1.5 }],
  marketImpact: 'MIXED', volatilityImpact: 'HIGH', storyline: 'BULL_VS_BEAR',
  bullCommentary: 'Generative AI represents a foundational platform shift akin to cloud transition in 2010. Multi-year enterprise capex guarantees technology multiples will expand.',
  bearCommentary: 'CapEx is front-loaded while enterprise ROI remains unproven. Hardware suppliers are operating at peak cyclical margins that cannot persist.'
});

// 10:45: IPO 1 Rumours
addEvent({
  scheduledTime: '10:45', triggerMinute: 105, category: 'IPO', tier: 'TIER_1',
  title: '🔍 Silicon Valley Wire: Frontier AI Pioneer Secretly Registers Hyperscale US IPO',
  description: 'Unconfirmed reports from investment banking sources indicate a top-tier generative cognitive engine developer is finalizing a $180/share subscription tender on NASDAQ.',
  affectedCountries: ['United States', 'India'], affectedCurrencies: ['USD', 'INR'],
  affectedSectors: ['Technology'],
  affectedSecurities: [{ ticker: 'MSFT', impactPercent: 2.8 }, { ticker: 'GOOGL', impactPercent: -1.2 }, { ticker: 'NVDA', impactPercent: 3.4 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_OPENAI'
});

// 11:00: IPO Launch I (OpenAI OAI)
addEvent({
  scheduledTime: '11:00', triggerMinute: 120, category: 'IPO', tier: 'TIER_1',
  title: '🚀 IPO LAUNCH I: OpenAI Global Hyperscale IPO (OAI) Opens for Bidding at $180',
  description: 'Official prospectus approved by NASDAQ. OpenAI Inc commences public book-building at $180/share with lot size 10 units. International capital desks receive heavy initial bid volume.',
  affectedCountries: ['United States'], affectedExchanges: ['NASDAQ'], affectedCurrencies: ['USD'],
  affectedSectors: ['Technology'],
  affectedSecurities: [{ ticker: 'OAI', impactPercent: 15.0 }, { ticker: 'MSFT', impactPercent: 3.2 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_OPENAI'
});

// 11:40: Surprise IPO (Stripe STRP)
addEvent({
  scheduledTime: '11:40', triggerMinute: 160, category: 'IPO', tier: 'TIER_1',
  title: '🚨 SURPRISE MEGA IPO: Stripe Global Financial Infrastructure (STRP) Launches on NYSE',
  description: 'Unscheduled flash listing on the Big Board: Stripe Inc files immediate public offer at $95/share with lot size 20 units. Digital payment Rails capture immediate cross-border allocation.',
  affectedCountries: ['United States', 'United Kingdom'], affectedExchanges: ['NYSE'], affectedCurrencies: ['USD'],
  affectedSectors: ['Financial Services'],
  affectedSecurities: [{ ticker: 'STRP', impactPercent: 12.5 }, { ticker: 'V', impactPercent: -2.1 }, { ticker: 'MA', impactPercent: -1.8 }, { ticker: 'PYPL', impactPercent: -3.4 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_STRIPE'
});

// 12:15–12:50: Market Lunch Break
addEvent({
  scheduledTime: '12:15', triggerMinute: 195, category: 'GLOBAL_MACRO', tier: 'TIER_1',
  title: '⏸️ SAAMX Mid-Day Trading Recess: Order Matching Suspended for Lunch Interval',
  description: 'Continuous trading queues are paused for the official session recess. The Market Intelligence Wire and FX Quotation desks remain fully operational for afternoon strategy re-evaluation.',
  affectedCountries: ['Global'], affectedCurrencies: ['INR', 'USD', 'GBP', 'EUR'],
  affectedSectors: ['Broad Market'], affectedSecurities: [],
  marketImpact: 'NEUTRAL', volatilityImpact: 'LOW', storyline: 'GENERAL_MARKET'
});

addEvent({
  scheduledTime: '12:50', triggerMinute: 230, category: 'GLOBAL_MACRO', tier: 'TIER_1',
  title: '🔔 SAAMX Afternoon Session Resumes: Heavy Foreign Currency Arbitrage Noted',
  description: 'The afternoon opening bell rings. Desks react to lunch-hour macroeconomic shifts with renewed institutional block deals across Indian manufacturing and foreign technology.',
  affectedCountries: ['India', 'United States'], affectedExchanges: ['NSE', 'NASDAQ'], affectedCurrencies: ['INR', 'USD'],
  affectedSectors: ['Technology', 'Financial Services'],
  affectedSecurities: [{ ticker: 'RELIANCE', impactPercent: 1.5 }, { ticker: 'OAI', impactPercent: 4.8 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'MEDIUM', storyline: 'GENERAL_MARKET'
});

// 13:20: Bull vs Bear Showdown II
addEvent({
  scheduledTime: '13:20', triggerMinute: 260, category: 'SENTIMENT', tier: 'TIER_1',
  title: '⚔️ Bull vs Bear Showdown II: The Distressed Asset Conundrum & Rate Trajectory',
  description: 'Stage debate escalates into high drama: Bull insists Indian domestic consumption cushions high-debt telecom and infrastructure; Bear predicts imminent credit downgrade cascade.',
  affectedSectors: ['Telecommunications', 'Utilities', 'Financial Services'],
  affectedSecurities: [{ ticker: 'IDEA', impactPercent: -4.5 }, { ticker: 'BHARTIARTL', impactPercent: 2.1 }, { ticker: 'SBIN', impactPercent: -1.5 }],
  marketImpact: 'HIGH', volatilityImpact: 'HIGH', storyline: 'BULL_VS_BEAR',
  bullCommentary: 'Government cannot afford a duopoly in critical digital connectivity. Strategic debt-to-equity conversions will protect equity stakeholders.',
  bearCommentary: 'Cash burn is mathematically unsustainable. Any debt conversion massively dilutes existing equity to near zero.'
});

// 13:40–14:40: Vodafone Idea Crisis Storyline (Stages 1-6)
addEvent({
  scheduledTime: '13:40', triggerMinute: 280, category: 'CRISIS', tier: 'TIER_1',
  title: '⚠️ SAAMX SIMULATION SCENARIO: Anonymous Telecom Giant Faces Severe Working Capital Crunch',
  description: 'SAAMX SIMULATION SCENARIO — HYPOTHETICAL CORPORATE CRISIS. Credit rating agencies place a leading Indian cellular operator on negative credit watch following vendor dues dispute.',
  affectedCountries: ['India'], affectedExchanges: ['NSE', 'BSE'], affectedCurrencies: ['INR'],
  affectedSectors: ['Telecommunications'],
  affectedSecurities: [{ ticker: 'IDEA', impactPercent: -8.5 }, { ticker: 'INDUSTOWER', impactPercent: -6.2 }, { ticker: 'BHARTIARTL', impactPercent: 3.4 }],
  marketImpact: 'NEGATIVE', volatilityImpact: 'HIGH', storyline: 'VODAFONE_IDEA_CRISIS'
});

addEvent({
  scheduledTime: '13:55', triggerMinute: 295, category: 'CRISIS', tier: 'TIER_1',
  title: '🚨 SAAMX SIMULATION SCENARIO — CRISIS REVEAL: Vodafone Idea (IDEA) Convenes Emergency Board',
  description: 'SAAMX SIMULATION SCENARIO. Vodafone Idea formally notifies exchange of emergency promoter meetings to discuss debt moratoriums and AGR relief appeals.',
  affectedCountries: ['India'], affectedExchanges: ['NSE'], affectedCurrencies: ['INR'],
  affectedSectors: ['Telecommunications', 'Financial Services'],
  affectedSecurities: [{ ticker: 'IDEA', impactPercent: -18.2 }, { ticker: 'INDUSTOWER', impactPercent: -11.5 }, { ticker: 'SBIN', impactPercent: -3.2 }, { ticker: 'BHARTIARTL', impactPercent: 4.8 }],
  marketImpact: 'NEGATIVE', volatilityImpact: 'HIGH', storyline: 'VODAFONE_IDEA_CRISIS'
});

addEvent({
  scheduledTime: '14:15', triggerMinute: 315, category: 'CRISIS', tier: 'TIER_1',
  title: '⛔ REGULATORY HALT: SEBI & NSE Trigger Circuit Breaker on Vodafone Idea (IDEA)',
  description: 'SAAMX SIMULATION SCENARIO. Trading in Vodafone Idea is formally suspended under Exchange Rule 14-B pending material structural disclosure from the Department of Telecommunications.',
  affectedCountries: ['India'], affectedExchanges: ['NSE'], affectedCurrencies: ['INR'],
  affectedSectors: ['Telecommunications'],
  affectedSecurities: [{ ticker: 'IDEA', impactPercent: -10.0 }],
  marketImpact: 'NEGATIVE', volatilityImpact: 'HIGH', storyline: 'VODAFONE_IDEA_CRISIS'
});

addEvent({
  scheduledTime: '14:35', triggerMinute: 335, category: 'CRISIS', tier: 'TIER_1',
  title: '🚨 SAAMX SIMULATION SCENARIO RESOLUTION: Emergency Restructuring & Moratorium Granted',
  description: 'SAAMX SIMULATION SCENARIO. Department of Telecom grants 5-year spectrum deferral alongside state-backed debt restructuring. Trading resumes with explosive volatility.',
  affectedCountries: ['India'], affectedExchanges: ['NSE'], affectedCurrencies: ['INR'],
  affectedSectors: ['Telecommunications', 'Financial Services'],
  affectedSecurities: [{ ticker: 'IDEA', impactPercent: 32.5 }, { ticker: 'INDUSTOWER', impactPercent: 18.4 }, { ticker: 'SBIN', impactPercent: 2.8 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'VODAFONE_IDEA_CRISIS'
});

// 14:00: Canva IPO (CNVA)
addEvent({
  scheduledTime: '14:00', triggerMinute: 300, category: 'IPO', tier: 'TIER_1',
  title: '🎨 IPO LAUNCH: Canva Global Visual Suite (CNVA) Debuts on NASDAQ at $88/share',
  description: 'Global SaaS enterprise Canva Pty files official public listing. Algorithmic and retail subscription orders flood NASDAQ exchange gateway.',
  affectedCountries: ['United States', 'Australia'], affectedExchanges: ['NASDAQ'], affectedCurrencies: ['USD'],
  affectedSectors: ['Technology'],
  affectedSecurities: [{ ticker: 'CNVA', impactPercent: 14.0 }, { ticker: 'ADBE', impactPercent: -3.8 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_CANVA'
});

// 14:45: Discord Mega IPO (DISC)
addEvent({
  scheduledTime: '14:45', triggerMinute: 345, category: 'IPO', tier: 'TIER_1',
  title: '💬 SUPER MEGA IPO: Discord Community Infrastructure (DISC) Launches at $64/share',
  description: 'High-density community messaging network Discord Inc executes historic NYSE listing. Cross-border capital desks execute block subscription allocations.',
  affectedCountries: ['United States'], affectedExchanges: ['NYSE'], affectedCurrencies: ['USD'],
  affectedSectors: ['Consumer Internet'],
  affectedSecurities: [{ ticker: 'DISC', impactPercent: 16.5 }, { ticker: 'META', impactPercent: -1.8 }, { ticker: 'MSFT', impactPercent: 1.2 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_DISCORD'
});

// 15:00: Closing News 10-Headline Rundown
const CLOSING_HEADLINES = [
  { title: 'SAAMX Global 100 Index Inches Toward Record Floor Close on Technology Volume', sec: [{ ticker: 'NVDA', impactPercent: 2.1 }, { ticker: 'RELIANCE', impactPercent: 1.4 }], sector: 'Broad Market', cat: 'GLOBAL_MACRO', impact: 'POSITIVE' },
  { title: 'USD/INR Closes Session at ₹88.45 as Foreign Equity Inflow Matches Corporate Outward Remittance', sec: [{ ticker: 'TCS', impactPercent: 1.2 }, { ticker: 'INFY', impactPercent: 1.0 }], sector: 'Currency', cat: 'CURRENCY', impact: 'POSITIVE' },
  { title: 'Telecom Sector Volume Crosses All-Time SAAMX High Following Crisis Moratorium Resolution', sec: [{ ticker: 'IDEA', impactPercent: 4.5 }, { ticker: 'BHARTIARTL', impactPercent: 1.8 }], sector: 'Telecommunications', cat: 'CRISIS', impact: 'POSITIVE' },
  { title: '10-Year Indian Sovereign Bond Yield Anchored at 6.92% Post Monetary Policy Affirmation', sec: [{ ticker: 'GSEC10Y', impactPercent: 0.4 }, { ticker: 'HDFCBANK', impactPercent: 0.6 }], sector: 'Fixed Income', cat: 'BOND', impact: 'POSITIVE' },
  { title: 'Primary Market Recap: All 5 Flagship IPOs Fully Subscribed with Double-Digit Day-One Premiums', sec: [{ ticker: 'OAI', impactPercent: 3.5 }, { ticker: 'STRP', impactPercent: 2.8 }, { ticker: 'CNVA', impactPercent: 3.0 }], sector: 'Technology', cat: 'IPO', impact: 'POSITIVE' },
  { title: 'Banking Syndicate Reports Zero Default Exposure Post Systemic Regulatory Stress Tests', sec: [{ ticker: 'SBIN', impactPercent: 1.5 }, { ticker: 'ICICIBANK', impactPercent: 1.2 }], sector: 'Financial Services', cat: 'GOVERNMENT', impact: 'POSITIVE' },
  { title: 'Power Grid Major Completes ₹8,400 Cr Inter-State Transmission Line Ahead of Schedule', sec: [{ ticker: 'POWERGRID', impactPercent: 2.4 }, { ticker: 'NTPC', impactPercent: 1.9 }], sector: 'Utilities', cat: 'CORPORATE', impact: 'POSITIVE' },
  { title: 'Automobile Desks Rally on Surge in Commercial Fleet and EV Delivery Volume', sec: [{ ticker: 'TATAMOTORS', impactPercent: 2.8 }, { ticker: 'M&M', impactPercent: 2.5 }], sector: 'Automotive', cat: 'CORPORATE', impact: 'POSITIVE' },
  { title: 'SEBI Surveillance Logs Clean Trading Floor Ledger with Zero Circuit Violations in Afternoon', sec: [{ ticker: 'BSE', impactPercent: 2.2 }, { ticker: 'MCX', impactPercent: 1.8 }], sector: 'Financial Services', cat: 'REGULATORY', impact: 'POSITIVE' },
  { title: 'Trading Desks Lock Order Terminals as Central Reconciliation Commences', sec: [{ ticker: 'NIFTYBEES', impactPercent: 0.2 }], sector: 'Broad Market', cat: 'GLOBAL_MACRO', impact: 'NEUTRAL' }
];

CLOSING_HEADLINES.forEach((h, i) => {
  addEvent({
    scheduledTime: `15:${String(i * 2).padStart(2, '0')}`, triggerMinute: 360 + i * 2, category: h.cat || 'GLOBAL_MACRO', tier: 'TIER_1',
    title: h.title,
    shortHeadline: h.title,
    description: `Official closing broadcast segment presented by News Anchor Studio. ${h.title}. Trading teams prepare balance sheets for official reconciliation.`,
    affectedSectors: [h.sector],
    affectedSecurities: h.sec,
    marketImpact: h.impact,
    volatilityImpact: 'LOW',
    storyline: 'CLOSING_NEWS'
  });
});

// 15:00: Final Polymarket IPO & Climax
addEvent({
  scheduledTime: '15:05', triggerMinute: 365, category: 'IPO', tier: 'TIER_1',
  title: '🔮 FINAL IPO EVENT: Polymarket Decentralized Prediction Engine (POLY) Lists on NASDAQ',
  description: 'Final primary market twist of SAAMX 2026: Polymarket Protocol opens secondary trading at $45/share. Desks scramble to balance final tournament portfolio allocations.',
  affectedCountries: ['United States'], affectedExchanges: ['NASDAQ'], affectedCurrencies: ['USD'],
  affectedSectors: ['Technology'],
  affectedSecurities: [{ ticker: 'POLY', impactPercent: 18.5 }],
  marketImpact: 'POSITIVE', volatilityImpact: 'HIGH', storyline: 'IPO_POLYMARKET'
});

// 15:30: Official Market Close Bell
addEvent({
  scheduledTime: '15:30', triggerMinute: 390, category: 'GLOBAL_MACRO', tier: 'TIER_1',
  title: '🔕 SAAMX 2026 OFFICIAL MARKET CLOSE: All Order Matching Engines Locked',
  description: 'The final ceremonial closing bell rings across the central trading floor. Trading desks lock positions as the SEBI Auditor Desk begins multi-currency net worth reconciliation.',
  affectedCountries: ['India', 'United States', 'United Kingdom'],
  affectedExchanges: ['NSE', 'NASDAQ', 'NYSE', 'LSE'],
  affectedCurrencies: ['INR', 'USD', 'GBP', 'EUR'],
  affectedSectors: ['All Sectors'],
  affectedSecurities: [],
  marketImpact: 'NEUTRAL', volatilityImpact: 'LOW', storyline: 'CLOSING_NEWS'
});

// ------------------------------------------------------------------------------------------------
// TIER 2: 95 SECTOR & MACROECONOMIC DEVELOPMENTS
// ------------------------------------------------------------------------------------------------

const TIER2_TEMPLATES = [
  { title: "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance", sec: ["NTPC", "TATAPOWER", "BHEL"], sector: "Utilities", cat: "GOVERNMENT", impact: "MIXED" },
  { title: "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders", sec: ["HAL", "BEL", "BDL", "COCHINSHIP"], sector: "Defense & Capital Goods", cat: "GOVERNMENT", impact: "POSITIVE" },
  { title: "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium", sec: ["TCS", "TEJASNET", "HFCL"], sector: "Technology", cat: "GOVERNMENT", impact: "POSITIVE" },
  { title: "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework", sec: ["TATAMOTORS", "OLECTRA", "EXIDEIND"], sector: "Automotive", cat: "GOVERNMENT", impact: "POSITIVE" },
  { title: "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster", sec: ["RELIANCE", "LARSEN", "ADANIGREEN"], sector: "Energy", cat: "GOVERNMENT", impact: "POSITIVE" },
  { title: "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities", sec: ["BSE", "MCX", "CDSL", "ANGELONE"], sector: "Financial Services", cat: "REGULATORY", impact: "POSITIVE" },
  { title: "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating", sec: ["BAJFINANCE", "SBICARD", "AXISBANK", "IDFCFIRSTB"], sector: "Financial Services", cat: "REGULATORY", impact: "NEGATIVE" },
  { title: "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships", sec: ["MSFT", "GOOGL", "AMZN"], sector: "Technology", cat: "REGULATORY", impact: "NEGATIVE" },
  { title: "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness", sec: ["HSBA", "BARC", "LLOY"], sector: "Banking", cat: "GLOBAL_MACRO", cur: "GBP", ctry: "United Kingdom", impact: "MIXED" },
  { title: "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation", sec: ["BNP", "SAN", "ALV"], sector: "Financial Services", cat: "GLOBAL_MACRO", cur: "EUR", ctry: "Europe", impact: "POSITIVE" },
  { title: "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment", sec: ["ONGC", "OIL", "BPCL", "IOC"], sector: "Energy", cat: "GLOBAL_MACRO", impact: "MIXED" },
  { title: "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows", sec: ["GSEC10Y", "SBIN", "HDFCBANK"], sector: "Bonds & Fixed Income", cat: "BOND", impact: "POSITIVE" },
  { title: "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps", sec: ["CORPBOND_AAA", "RELIANCE", "LT"], sector: "Bonds & Fixed Income", cat: "BOND", impact: "POSITIVE" },
  { title: "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%", sec: ["SBIN", "HDFCBANK"], sector: "Bonds & Fixed Income", cat: "BOND", impact: "POSITIVE" },
  { title: "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing", sec: ["TCS", "INFY", "WIPRO"], sector: "Forex & Exports", cat: "CURRENCY", impact: "POSITIVE" },
  { title: "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion", sec: ["RR", "AZN", "ULVR"], sector: "UK Equities", cat: "CURRENCY", cur: "GBP", impact: "POSITIVE" },
  { title: "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery", sec: ["SAP", "ASML", "SIE"], sector: "European Equities", cat: "CURRENCY", cur: "EUR", impact: "POSITIVE" },
  { title: "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory", sec: ["RELIANCE", "TATACHEM"], sector: "Conglomerates / Energy", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank", sec: ["TCS", "INFY"], sector: "Information Technology", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA", sec: ["INFY", "NVDA"], sector: "Information Technology", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios", sec: ["HDFCBANK", "KOTAKBANK"], sector: "Banking", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract", sec: ["LT", "IRB"], sector: "Infrastructure", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension", sec: ["SUNPHARMA", "CIPLA", "DRREDDY"], sector: "Healthcare", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum", sec: ["M&M", "MARUTI"], sector: "Automotive", cat: "CORPORATE", impact: "POSITIVE" },
  { title: "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure", sec: ["TATAMOTORS", "ASHOKLEY"], sector: "Automotive", cat: "CORPORATE", impact: "POSITIVE" }
];

for (let i = 0; i < 95; i++) {
  const tmpl = TIER2_TEMPLATES[i % TIER2_TEMPLATES.length];
  const hrs = Math.floor(9 + (i * 3.5) / 60);
  const mins = Math.floor((i * 3.5) % 60);
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  
  const secs = (tmpl.sec || ['RELIANCE', 'TCS']).map(t => ({
    ticker: t,
    impactPercent: Number(((Math.random() * 3.5 + 0.8) * (tmpl.impact === 'NEGATIVE' ? -1 : 1)).toFixed(1))
  }));

  addEvent({
    scheduledTime: timeStr,
    triggerMinute: Math.floor(i * 3.5),
    category: tmpl.cat || 'CORPORATE',
    tier: 'TIER_2',
    title: tmpl.title,
    shortHeadline: tmpl.title,
    description: `${tmpl.title}. Institutional desks report active position recalibration across ${tmpl.sector} assets.`,
    affectedCountries: [tmpl.ctry || 'India'],
    affectedExchanges: ['NSE', 'NASDAQ', 'NYSE', 'LSE'],
    affectedCurrencies: [tmpl.cur || 'INR'],
    affectedSectors: [tmpl.sector],
    affectedSecurities: secs,
    marketImpact: tmpl.impact || 'POSITIVE',
    volatilityImpact: 'MEDIUM',
    storyline: 'SECTOR_NEWS'
  });
}

// ------------------------------------------------------------------------------------------------
// TIER 3: 190 CONTINUOUS MARKET INTELLIGENCE & MICRO-SIGNALS
// ------------------------------------------------------------------------------------------------

const TICKER_ANALYST_POOL = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL", "SBIN", "LT", "ITC", "HINDUNILVR",
  "TATAMOTORS", "TATASTEEL", "M&M", "BAJFINANCE", "SUNPHARMA", "ASIANPAINT", "AXISBANK", "KOTAKBANK",
  "MARUTI", "WIPRO", "HCLTECH", "ULTRACEMCO", "TITAN", "NESTLEIND", "BAJAJFINSV", "ADANIENT",
  "ADANIPORTS", "POWERGRID", "NTPC", "ONGC", "COALINDIA", "JSWSTEEL", "HINDALCO", "GRASIM", "TECHM",
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX", "AMD", "INTC", "ORCL", "CRM",
  "JPM", "V", "MA", "WMT", "KO", "DIS", "BA", "XOM", "CVX", "PG", "JNJ", "UNH", "PFE", "MRK",
  "SHEL", "BP", "HSBA", "BARC", "LLOY", "AZN", "GSK", "ULVR", "RR", "RIO", "BHP", "GLEN", "VOD",
  "ASML", "SAP", "SIE", "BMW", "MBG", "VOW3", "AIR", "MC", "OR", "SAN", "TTE", "BNP", "DTE", "ALV"
];

const ANALYST_HOUSES = [
  "Morgan Stanley Research", "Goldman Sachs Equity Research", "JPMorgan Global Markets",
  "Kotak Institutional Equities", "ICICI Securities Research", "CLSA Asia-Pacific",
  "Jefferies India", "Citi Global Wealth", "UBS Global Research", "Nomura Equities",
  "HSBC Global Research", "Macquarie Capital", "Motilal Oswal Financial Services"
];

const MICRO_TOPICS = [
  { action: "Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)", impactPct: 3.2, sent: "Positive" },
  { action: "Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)", impactPct: -2.4, sent: "Negative" },
  { action: "Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)", impactPct: 2.1, sent: "Positive" },
  { action: "Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)", impactPct: -1.5, sent: "Negative" },
  { action: "Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)", impactPct: 2.8, sent: "Positive" },
  { action: "Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)", impactPct: 1.9, sent: "Positive" },
  { action: "Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)", impactPct: 2.4, sent: "Positive" },
  { action: "Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)", impactPct: -1.8, sent: "Negative" },
  { action: "Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)", impactPct: 2.2, sent: "Positive" },
  { action: "Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)", impactPct: 2.6, sent: "Positive" }
];

let microIdx = 0;
for (let minute = 5; minute <= 380; minute += 2) {
  if (events.filter(e => e.tier === 'TIER_3').length >= 190) break;
  const ticker = TICKER_ANALYST_POOL[microIdx % TICKER_ANALYST_POOL.length];
  const house = ANALYST_HOUSES[microIdx % ANALYST_HOUSES.length];
  const topic = MICRO_TOPICS[microIdx % MICRO_TOPICS.length];
  microIdx++;

  const hrs = Math.floor(9 + minute / 60);
  const mins = Math.floor(minute % 60);
  const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  addEvent({
    scheduledTime: timeStr,
    triggerMinute: Math.floor(minute),
    category: 'ANALYST',
    tier: 'TIER_3',
    title: `${house}: ${ticker} ${topic.action}`,
    shortHeadline: `${ticker}: ${topic.action}`,
    description: `${house} published updated institutional market intelligence on ${ticker}. ${topic.action}. Local and international trading desks are adjusting orderbook depth.`,
    affectedCountries: ['India', 'United States', 'United Kingdom'],
    affectedExchanges: ['NSE', 'NASDAQ', 'NYSE', 'LSE'],
    affectedCurrencies: ['INR', 'USD', 'GBP'],
    affectedSectors: ['Equity'],
    affectedSecurities: [{ ticker, impactPercent: topic.impactPct }],
    marketImpact: topic.sent === 'Positive' ? 'POSITIVE' : 'NEGATIVE',
    volatilityImpact: 'LOW',
    storyline: 'ANALYST_FEED'
  });
}

console.log(`\nGenerated Total Events: ${events.length}`);
const tierCounts = {};
events.forEach(e => tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1);
console.log('Tier breakdown:', tierCounts);

// Write to src/lib/marketEventsDataset.js
const fileContent = `/**
 * SAAMX 2026 — Master Market Events Dataset (~320 Curated Structured Signals)
 * Covering Tier 1 (Market Defining), Tier 2 (Important Sector/Macro), and Tier 3 (Continuous Intelligence)
 */

export const MASTER_MARKET_EVENTS = ${JSON.stringify(events, null, 2)};
`;

fs.writeFileSync('src/lib/marketEventsDataset.js', fileContent, 'utf8');
console.log('✓ Successfully wrote src/lib/marketEventsDataset.js');
