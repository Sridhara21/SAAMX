/**
 * SAAMX Morning Market Bulletin
 * Conforms strictly to Section 7 of SAAMX News Architecture.
 * Pre-market information framework establishing the macro, cross-market,
 * sector, and corporate context before trading commences.
 */

export const MORNING_MARKET_BULLETIN = {
  title: "SAAMX Morning Market Intelligence Briefing",
  edition: "Official D-Day Opening Bell Edition",
  timestamp: "08:45 AM IST",
  marketSetupTone: "CAUTIOUSLY OPTIMISTIC WITH DISPERSION",
  
  globalOvernight: {
    title: "Global Overnight Setup & Transmission",
    usMarketDirection: "S&P 500 +0.42%, Nasdaq +0.68%, Dow Jones -0.12%. Tech megacaps led gains following strong datacenter accelerator shipments.",
    europeanMarketDirection: "Stoxx 600 -0.25%, DAX +0.10%, FTSE 100 -0.35%. Cautious stance ahead of ECB interest rate trajectory guidance.",
    asianMarketDirection: "Nikkei 225 +0.85% on renewed corporate dividend announcements; Hang Seng -0.40% consolidating recent stimulus moves.",
    majorOvernightEvents: [
      "US Federal Reserve officials reiterate data-dependent neutral rate pause amid resilient services job prints.",
      "Brent crude oil contracts stabilized around $82.40/bbl as Red Sea commercial shipping diversions persist.",
      "Global semiconductor equipment book-to-bill ratio expanded to 1.18, signaling ongoing foundry tool orders."
    ],
    globalRiskSentiment: "Risk-On in advanced technology & industrial infrastructure; Defensive positioning across high-yield credit."
  },

  india: {
    title: "India Market Setup & Domestic Catalysts",
    setup: "GIFT Nifty indicates a gap-up opening (+45 pts) around 25,120. Institutional liquidity remains anchored by domestic monthly SIP inflows.",
    majorDomesticDevelopments: "Cabinet Committee on Economic Affairs greenlights ₹48,000 Cr critical power transmission corridors and rail freight electrification.",
    rbiLiquidityRates: "RBI maintains systemic liquidity in marginal surplus (₹35,000 Cr) via overnight VRR operations; repo rate held steady at 6.50%.",
    inflationMacroData: "Headline CPI recorded at 4.75% within the central bank's tolerance band; core manufacturing PMI printed at robust 58.1.",
    governmentPolicy: "Ministry of Commerce announces revised PLI incentive disbursement guidelines for advanced chemistry battery cell plants.",
    institutionalFlows: "Domestic Institutional Investors (DIIs) recorded net purchases of +₹3,250 Cr; Foreign Institutional Investors (FIIs) turned net buyers of +₹840 Cr.",
    sectorRotation: "Leadership shifting from overvalued consumer discretionaries toward capital goods, power transmission, and private banking leaders."
  },

  corporate: {
    title: "Corporate Radar & Earnings Catalyst Watch",
    earningsHighlights: [
      "TCS & Infosys report sequential margin stabilization (+40-70 bps) driven by generative AI enterprise pilot transitions.",
      "Reliance Industries operational cash flow reaches record quarterly run-rate supported by retail store monetization and telecom ARPU gains.",
      "HDFC Bank and ICICI Bank demonstrate stable deposit accretion (>14% YoY) with Gross NPAs dropping below 1.2%."
    ],
    guidanceShifts: "Capital goods and industrial transformer manufacturers raise multi-year order backlog execution guidance by 15-20%.",
    mnaRegulatory: "Competition Commission of India (CCI) approves strategic multi-billion-dollar media and aerospace component consolidation pacts.",
    majorContracts: "Hitachi Energy India and Power Grid secure high-voltage direct current (HVDC) corridor execution packages worth ₹8,400 Cr."
  },

  commodities: {
    title: "Commodities & Raw Material Energy Complex",
    crudeOil: "Brent crude trading at $82.15/bbl (-0.4%). OPEC+ compliance remains intact, balanced by non-OPEC US and Guyana output.",
    naturalGas: "Natural gas futures firm up +1.8% at $2.65/MMBtu amid seasonal cooling demand across Southern European grids.",
    goldPreciousMetals: "Gold holds firm at $2,420/oz (+0.3%) underpinned by central bank sovereign diversification purchases and geopolitical hedging.",
    industrialMetals: "LME Copper rebounds to $9,450/tonne on supply disruptions at Chilean mines; Steel benchmark prices remain soft due to Chinese export volume."
  },

  currency: {
    title: "Foreign Exchange Universe & Liquidity Indicatives",
    inrBase: "USD/INR opens tightly bound at 83.92; RBI active intervention defends the 84.00 psychological resistance boundary.",
    usd: "US Dollar Index (DXY) consolidates around 104.20 awaiting US Core PCE inflation deflator.",
    eur: "EUR/INR trading at 91.45; German manufacturing sentiment showing early signs of cyclical bottoming.",
    jpy: "JPY/INR at 0.548; Bank of Japan policy normalization rhetoric limits excessive Yen depreciation against the dollar.",
    cny: "CNY/INR steady at 11.72; People's Bank of China sets daily currency fixing to deter speculative capital outflows.",
    otherCurrencies: "GBP, SGD, AED, KRW, and AUD showing normal bid-ask spreads with zero desk liquidity strain."
  },

  technology: {
    title: "Technology, AI Infrastructure & Semiconductor Supply Chains",
    aiDatacenters: "Hyperscale cloud providers increase 2025 capex allocations for liquid-cooled server racks and 800G optical networking transceivers.",
    semiconductors: "High-Bandwidth Memory (HBM3e) capacity at SK Hynix and Micron fully allocated through Q3 2025.",
    dataCentresPower: "Power transmission grid interconnection queues emerge as the primary bottleneck for new AI datacenter campus approvals globally."
  },

  ipoCorporateActions: {
    title: "Primary Market IPO Pipeline & Corporate Actions",
    activeIpoNarratives: [
      { ticker: "OAI", name: "OmniAI Technologies", status: "Book Building Open", priceBand: "₹820 - ₹865", note: "Institutional anchor tranche oversubscribed 18x." },
      { ticker: "STRP", name: "StrataPay Global", status: "SEBI Approval Confirmed", priceBand: "₹450 - ₹480", note: "Roadshow underway; fintech retail buzz high." },
      { ticker: "CNVA", name: "CanvaScape Media", status: "Market Rumour / Draft Filing", priceBand: "Pending", note: "Unconfirmed chatter regarding Q3 listing valuation." }
    ],
    corporateActions: "TCS dividend ex-date approaches; Tata Motors board considers demerger structural timelines."
  },

  marketPsychology: {
    title: "Sentiment, Positioning & Behavioral Indicators",
    riskRegime: "MODERATE RISK-ON / QUALITY MOMENTUM",
    fearGreedScore: 62, // 0-100 scale (Greed zone)
    crowdedTrades: "Long Indian Capital Goods & Mid-Cap Industrials; Short Japanese Yen; Overcrowded in AI semiconductor suppliers.",
    possibleVolatility: "High sensitivity expected around 11:30 AM European opening and breaking macro headline dispatches."
  },

  morningQuestion: {
    headline: "The Morning Deliberation Question",
    prompt: "“What has the market already priced in — and what could still surprise investors?”",
    subtext: "Are high valuations supported by durable structural earnings growth, or will unexpected macro friction trigger sudden liquidity re-pricing?"
  }
};

export function getMorningBulletin() {
  return MORNING_MARKET_BULLETIN;
}

export default MORNING_MARKET_BULLETIN;
