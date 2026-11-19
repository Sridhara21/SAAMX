/**
 * SAAMX Market Herald Newspaper Structured Data
 * Conforms strictly to Section 9 of SAAMX News Architecture.
 * Pre-market physical/digital broadsheet reference establishing editorial lenses,
 * cross-asset themes, watchlists, and behavioral frameworks for participants.
 */

export const SAAMX_MARKET_HERALD = {
  masthead: {
    title: "THE SAAMX MARKET HERALD",
    edition: "Official D-Day Pre-Market Broadsheet Edition",
    motto: "The Authoritative Pre-Market Chronicle of the SAAMX Exchange",
    dateString: "D-Day Official Session",
    disclaimer: "Pre-market editorial intelligence only. Does not replace the SAAMX Act, exchange desk rules, or live terminal pricing."
  },

  marketAtAGlance: {
    title: "Market at a Glance",
    headlineTheme: "Capital Dispersion & Structural Liquidity Under Global Friction",
    riskSentiment: "SELECTIVE MOMENTUM / EARNINGS-DRIVEN DISPERSION",
    keyAssetClassesSummary: "Equities exhibit strong domestic resilience; Fixed-income yields hold steady; Gold acts as structural reserve hedge.",
    importantCurrenciesSummary: "INR tightly defended by central bank reserves; USD index steady; JPY carries policy tightening sensitivity.",
    importantCommoditiesSummary: "Brent crude range-bound near $82/bbl; Industrial metals diverge as copper firms while Chinese steel exports overhang."
  },

  indiaMarketToWatch: {
    title: "India — The Market to Watch",
    leadStory: "Domestic Capex Multiplier Meets Unprecedented Retail SIP Inflow Bulwark",
    domesticMacro: "High nominal GDP trajectory (10.5%), benign current account deficit (< 1.2% of GDP), and disciplined fiscal consolidation anchor sovereign stability.",
    policyCatalysts: "Production-Linked Incentive (PLI) expansions, national power transmission corridor capital grants, and dedicated freight corridor completions.",
    corporateDevelopments: "Clean corporate balance sheets (lowest debt-to-equity in 15 years) enabling private sector capex revival across power, industrials, and real estate.",
    sectorThemes: "HVDC power transmission, defense indigenization, private banking deposit consolidation, and quick-commerce retail disruption.",
    institutionalFlows: "Domestic Mutual Fund SIPs inject ~₹25,000 Cr every 30 days, creating a permanent liquidity floor counteracting foreign portfolio volatility."
  },

  globalThemes: {
    title: "Global Cross-Market Themes & Transmission Lines",
    usMarket: "Hyperscaler AI infrastructure capex sustains technology leadership; Federal Reserve navigates higher-for-longer neutral real interest rates.",
    europeUk: "Moderate economic sluggishness in core industrial hubs offset by aerospace and healthcare defensive export demand.",
    chinaHongKong: "Struggling real estate debt overhang met by targeted central bank liquidity operations; industrial export dumping impacts global steel & solar margins.",
    japanKorea: "Tokyo Stock Exchange corporate governance reforms fuel record dividend buybacks; South Korea rolls out corporate 'Value-Up' program.",
    geopolitics: "Red Sea and Middle East maritime shipping diversions absorb 12% of global containership capacity, keeping regional freight rates elevated.",
    technology: "High-Bandwidth Memory (HBM3e) and advanced semiconductor packaging (CoWoS) bottlenecks determine the pace of enterprise AI deployment."
  },

  securitiesToWatch: {
    title: "Securities to Watch — Editorial Analytical Lenses",
    disclaimer: "These editorial lenses represent simulation analytical frameworks, NOT guaranteed predictions of market performance.",
    categories: [
      {
        lens: "High Potential",
        badgeColor: "success",
        description: "Companies positioned at the confluence of structural demand tailwinds and clear multi-year capital expenditure backlogs.",
        securities: [
          { ticker: "GEV", name: "GE Vernova", thesis: "Electrification supercycle and global gas turbine / grid equipment capacity constraints." },
          { ticker: "CATL", name: "Contemporary Amperex Technology (CATL)", thesis: "Uncontested global battery market share (>37%) and technological cost leadership." },
          { ticker: "NU", name: "Nu Holdings", thesis: "Hyper-efficient digital banking operating leverage across Latin American consumer credit." },
          { ticker: "HITACHI", name: "Hitachi Energy India", thesis: "Dominant market share in Indian high-voltage transmission transformers and HVDC interconnections." }
        ]
      },
      {
        lens: "Underappreciated?",
        badgeColor: "primary",
        description: "High-cash-generation enterprises trading at subdued multiples relative to underlying business quality.",
        securities: [
          { ticker: "ITOCHU", name: "Itochu Corporation", thesis: "Japanese trading house with capital allocation discipline and consumer-facing non-resource diversification." },
          { ticker: "MIDEA", name: "Midea Group", thesis: "World's largest home appliance manufacturer generating 15%+ ROE with deep international expansion." },
          { ticker: "KIA", name: "Kia Corporation", thesis: "Industry-leading automotive operating margins (>12%) driven by popular hybrid and SUV mix." }
        ]
      },
      {
        lens: "Expectations May Be High",
        badgeColor: "warning",
        description: "Market darlings trading at premium valuation multiples that leave zero room for execution missteps.",
        securities: [
          { ticker: "PLTR", name: "Palantir Technologies", thesis: "Exceptional AIP enterprise momentum, but forward multiples demand flawless 40%+ revenue growth." },
          { ticker: "TSLA", name: "Tesla Inc", thesis: "Valuation assumes rapid robotaxi and humanoid robotics monetization while core auto margins face price war friction." },
          { ticker: "MSTR", name: "MicroStrategy", thesis: "Trades at a dramatic premium to underlying Bitcoin net asset value, introducing substantial leverage risk." }
        ]
      },
      {
        lens: "Cyclical Peak?",
        badgeColor: "danger",
        description: "Cyclical businesses enjoying peak margin conditions vulnerable to capacity expansion or demand softening.",
        securities: [
          { ticker: "MU_HYNIX", name: "Micron Technology / SK Hynix", thesis: "Peak memory pricing sentiment vulnerable to future fab capacity additions." },
          { ticker: "MAERSK", name: "A.P. Moller - Maersk", thesis: "Red Sea rate spike masks impending 8% delivery of new container vessel overcapacity." }
        ]
      },
      {
        lens: "Distress Behind Headlines",
        badgeColor: "danger",
        description: "High-profile enterprises facing severe balance sheet, liquidity, or operational headwinds.",
        securities: [
          { ticker: "SPICEJET", name: "SpiceJet Ltd", thesis: "Recurring aircraft lessor legal disputes and depleted fleet availability." },
          { ticker: "IDEA", name: "Vodafone Idea", thesis: "Substantial looming AGR debt obligations and chronic subscriber market share loss." },
          { ticker: "LCID", name: "Lucid Group", thesis: "High cash burn per vehicle sold requiring ongoing sovereign fund capital injections." }
        ]
      },
      {
        lens: "Silent Movers",
        badgeColor: "info",
        description: "Niche component and infrastructure leaders operating outside retail limelight with immense pricing power.",
        securities: [
          { ticker: "HITACHI", name: "Hitachi Energy India", thesis: "Pivotal bottleneck supplier for renewable power grid connections." },
          { ticker: "HANMI", name: "Hanmi Semiconductor", thesis: "Monopolistic provider of Dual TC Bonders required for HBM stacking." },
          { ticker: "NARI", name: "NARI Technology", thesis: "China's leading power grid automation and ultra-high-voltage control system creator." },
          { ticker: "PRESIGHT", name: "Presight AI", thesis: "Middle Eastern sovereign AI big-data analytics powerhouse with public sector backing." }
        ]
      }
    ]
  },

  assetClassesToWatch: {
    title: "Asset Classes to Watch — Multi-Asset Matrix",
    classes: [
      { name: "Equities", focus: "Look for operating leverage and pricing power rather than speculative beta." },
      { name: "ETFs", focus: "Low-cost index wrappers provide diversification during volatile sectoral rotations." },
      { name: "Mutual Funds", focus: "Active small/mid-cap funds capture bottom-up domestic compounding." },
      { name: "Government Bonds", focus: "Risk-free yield anchors offering capital preservation during liquidity shocks." },
      { name: "Corporate Bonds", focus: "High-grade AAA paper offers attractive risk-adjusted yield pick-ups." },
      { name: "REITs", focus: "Grade-A commercial office space leases to global capability centers (GCCs) yield 7%+ cash distributions." },
      { name: "InvITs", focus: "Toll road and power transmission operational assets provide inflation-indexed cash yields." },
      { name: "Currencies", focus: "Active FX desk rates reflect cross-border reserve liquidity and trade flows." },
      { name: "Commodities", focus: "Crude oil and gold serve as direct geopolitical and inflation hedges." }
    ]
  },

  theBigQuestion: {
    headline: "The Big Question",
    prompt: "“What moves a market?”",
    narrative: "Markets are not calculators that compute intrinsic value in a vacuum. Markets are voting machines driven by liquidity, regulatory boundaries, unexpected news, and above all — investor psychology."
  },

  fiveThingsToWatch: {
    title: "Five Things Every Investor Should Watch",
    items: [
      { number: 1, title: "India", description: "Domestic credit cycle, capex order books, and persistent retail monthly SIP flows." },
      { number: 2, title: "Global Markets", description: "US interest rates, tech hyperscaler capex, and Chinese industrial supply chains." },
      { number: 3, title: "Currencies", description: "USD strength, foreign exchange desk reserves, and central bank intervention bands." },
      { number: 4, title: "News", description: "Differentiate between verified structural catalysts and unconfirmed speculative chatter." },
      { number: 5, title: "Investor Behaviour", description: "Recognize fear, FOMO, panic liquidation, and crowded herd momentum before it reverses." }
    ]
  },

  investorsNote: {
    title: "Investor's Note",
    quote: "“What could happen next — and what has the market already priced in?”",
    takeaway: "The successful participant does not merely forecast corporate performance; they anticipate how other market participants will react when reality diverges from expectations."
  }
};

export function getNewspaperData() {
  return SAAMX_MARKET_HERALD;
}

export default SAAMX_MARKET_HERALD;
