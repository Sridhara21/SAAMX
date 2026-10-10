/**
 * SAAMX 2026 — Master Market Events Dataset (~320 Curated Structured Signals)
 * Covering Tier 1 (Market Defining), Tier 2 (Important Sector/Macro), and Tier 3 (Continuous Intelligence)
 */

export const MASTER_MARKET_EVENTS = [
  {
    "id": "EVT_001",
    "sequence": 1,
    "scheduledTime": "09:00",
    "triggerMinute": 15,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "SAAMX Global Pre-Open Session Commences: Asian Indices Mixed Ahead of Milestone Event",
    "shortHeadline": "SAAMX Global Pre-Open Session Commences: Asian Indices Mixed Ahead of Milestone Event",
    "description": "Global capital markets prepare for the opening of SAAMX 2026. Overnight trading across Nikkei and Hang Seng showed defensive positioning in utilities with selective buying in AI hardware.",
    "affectedCountries": [
      "India",
      "Japan",
      "Hong Kong"
    ],
    "affectedExchanges": [
      "NSE",
      "TSE",
      "HKG"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology",
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 0.5
      },
      {
        "ticker": "INFY",
        "impactPercent": 0.4
      },
      {
        "ticker": "NVDA",
        "impactPercent": 0.8
      }
    ],
    "marketImpact": "NEUTRAL",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_002",
    "sequence": 2,
    "scheduledTime": "09:15",
    "triggerMinute": 15,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "🔔 SAAMX Market Opening Bell: Continuous Multi-Currency Trading is Live",
    "shortHeadline": "🔔 SAAMX Market Opening Bell: Continuous Multi-Currency Trading is Live",
    "description": "The ceremonial opening bell rings across the trading floor. Trading desks report heavy initial liquidity in benchmark Indian large-caps and US megacaps.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom",
      "Europe"
    ],
    "affectedExchanges": [
      "NSE",
      "BSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP",
      "EUR"
    ],
    "affectedSectors": [
      "Financial Services",
      "Technology",
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 1.2
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 0.8
      },
      {
        "ticker": "AAPL",
        "impactPercent": 1
      },
      {
        "ticker": "MSFT",
        "impactPercent": 1.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_003",
    "sequence": 3,
    "scheduledTime": "09:30",
    "triggerMinute": 30,
    "category": "GOVERNMENT",
    "tier": "TIER_1",
    "title": "Union Ministry Announces ₹45,000 Cr Semiconductor Sub-Component Incentive Scheme",
    "shortHeadline": "Union Ministry Announces ₹45,000 Cr Semiconductor Sub-Component Incentive Scheme",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Union Ministry Announces ₹45,000 Cr Semiconductor Sub-Component Incentive Scheme. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "DIXON",
        "impactPercent": 6.2
      },
      {
        "ticker": "TATAELXSI",
        "impactPercent": 4.5
      },
      {
        "ticker": "KAYNES",
        "impactPercent": 5.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_004",
    "sequence": 4,
    "scheduledTime": "09:32",
    "triggerMinute": 32,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "Crude Oil Bounces to $82/bbl Following Red Sea Maritime Routing Delays",
    "shortHeadline": "Crude Oil Bounces to $82/bbl Following Red Sea Maritime Routing Delays",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Crude Oil Bounces to $82/bbl Following Red Sea Maritime Routing Delays. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 3.8
      },
      {
        "ticker": "OIL",
        "impactPercent": 4.2
      },
      {
        "ticker": "INDIGO",
        "impactPercent": -4.5
      },
      {
        "ticker": "BPCL",
        "impactPercent": -2.1
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_005",
    "sequence": 5,
    "scheduledTime": "09:34",
    "triggerMinute": 34,
    "category": "GOVERNMENT",
    "tier": "TIER_1",
    "title": "RBI Liquidity Survey Signals Accommodative Stance for Scheduled Commercial Banks",
    "shortHeadline": "RBI Liquidity Survey Signals Accommodative Stance for Scheduled Commercial Banks",
    "description": "Official morning broadcast segment presented by News Anchor Studio. RBI Liquidity Survey Signals Accommodative Stance for Scheduled Commercial Banks. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 2.8
      },
      {
        "ticker": "ICICIBANK",
        "impactPercent": 2.4
      },
      {
        "ticker": "KOTAKBANK",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_006",
    "sequence": 6,
    "scheduledTime": "09:36",
    "triggerMinute": 36,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "US Federal Reserve Minutes Hint at Extended Pause in Benchmark Fed Funds Rate",
    "shortHeadline": "US Federal Reserve Minutes Hint at Extended Pause in Benchmark Fed Funds Rate",
    "description": "Official morning broadcast segment presented by News Anchor Studio. US Federal Reserve Minutes Hint at Extended Pause in Benchmark Fed Funds Rate. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "AAPL",
        "impactPercent": 1.5
      },
      {
        "ticker": "GOOGL",
        "impactPercent": 1.8
      },
      {
        "ticker": "AMZN",
        "impactPercent": 1.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_007",
    "sequence": 7,
    "scheduledTime": "09:38",
    "triggerMinute": 38,
    "category": "REGULATORY",
    "tier": "TIER_1",
    "title": "European Carbon Border Adjustment (CBAM) Prompts Re-evaluation of Steel Export Margins",
    "shortHeadline": "European Carbon Border Adjustment (CBAM) Prompts Re-evaluation of Steel Export Margins",
    "description": "Official morning broadcast segment presented by News Anchor Studio. European Carbon Border Adjustment (CBAM) Prompts Re-evaluation of Steel Export Margins. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Metals & Mining"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATASTEEL",
        "impactPercent": -3.2
      },
      {
        "ticker": "JSWSTEEL",
        "impactPercent": -2.8
      },
      {
        "ticker": "SAIL",
        "impactPercent": -3.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_008",
    "sequence": 8,
    "scheduledTime": "09:40",
    "triggerMinute": 40,
    "category": "REGULATORY",
    "tier": "TIER_1",
    "title": "Telecom Department Circulates Spectrum Dues Consultation Paper with Strict Default Clauses",
    "shortHeadline": "Telecom Department Circulates Spectrum Dues Consultation Paper with Strict Default Clauses",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Telecom Department Circulates Spectrum Dues Consultation Paper with Strict Default Clauses. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Telecommunications"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": -5.4
      },
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 1.5
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_009",
    "sequence": 9,
    "scheduledTime": "09:42",
    "triggerMinute": 42,
    "category": "CORPORATE",
    "tier": "TIER_1",
    "title": "Leading Private Hospital Operators Report 18% Increase in Medical Tourism Revenue",
    "shortHeadline": "Leading Private Hospital Operators Report 18% Increase in Medical Tourism Revenue",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Leading Private Hospital Operators Report 18% Increase in Medical Tourism Revenue. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Healthcare"
    ],
    "affectedSecurities": [
      {
        "ticker": "APOLLOHOSP",
        "impactPercent": 3.5
      },
      {
        "ticker": "MAXHEALTH",
        "impactPercent": 4.1
      },
      {
        "ticker": "MEDANTA",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_010",
    "sequence": 10,
    "scheduledTime": "09:44",
    "triggerMinute": 44,
    "category": "GOVERNMENT",
    "tier": "TIER_1",
    "title": "National Highways Authority Awards ₹18,200 Cr Toll-Operate-Transfer (TOT) Bundles",
    "shortHeadline": "National Highways Authority Awards ₹18,200 Cr Toll-Operate-Transfer (TOT) Bundles",
    "description": "Official morning broadcast segment presented by News Anchor Studio. National Highways Authority Awards ₹18,200 Cr Toll-Operate-Transfer (TOT) Bundles. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Infrastructure"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": 3.2
      },
      {
        "ticker": "IRB",
        "impactPercent": 4.8
      },
      {
        "ticker": "PNCINFRA",
        "impactPercent": 3.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_011",
    "sequence": 11,
    "scheduledTime": "09:46",
    "triggerMinute": 46,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "Global AI Infrastructure Alliance Hints at Landmark Pre-IPO Primary Filings",
    "shortHeadline": "Global AI Infrastructure Alliance Hints at Landmark Pre-IPO Primary Filings",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Global AI Infrastructure Alliance Hints at Landmark Pre-IPO Primary Filings. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "NVDA",
        "impactPercent": 3.5
      },
      {
        "ticker": "AVGO",
        "impactPercent": 2.8
      },
      {
        "ticker": "SMCI",
        "impactPercent": 4.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_012",
    "sequence": 12,
    "scheduledTime": "09:48",
    "triggerMinute": 48,
    "category": "CURRENCY",
    "tier": "TIER_1",
    "title": "Foreign Portfolio Investors (FPI) Record Net Inflows of ₹4,200 Cr in Morning Session",
    "shortHeadline": "Foreign Portfolio Investors (FPI) Record Net Inflows of ₹4,200 Cr in Morning Session",
    "description": "Official morning broadcast segment presented by News Anchor Studio. Foreign Portfolio Investors (FPI) Record Net Inflows of ₹4,200 Cr in Morning Session. Institutional desks and arbitrage teams are evaluating portfolio allocations across affected sectors.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "NIFTYBEES",
        "impactPercent": 1.5
      },
      {
        "ticker": "BANKBEES",
        "impactPercent": 1.8
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "OPENING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_013",
    "sequence": 13,
    "scheduledTime": "10:30",
    "triggerMinute": 90,
    "category": "SENTIMENT",
    "tier": "TIER_1",
    "title": "⚔️ Bull vs Bear Showdown I: Tech Valuations & Global AI Capex Sustainability",
    "shortHeadline": "⚔️ Bull vs Bear Showdown I: Tech Valuations & Global AI Capex Sustainability",
    "description": "Live physical face-off on the trading stage between the Market Bull and Bear. Bull argues AI compute demand is non-cyclical; Bear warns enterprise software monetisation lags hardware spending.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology",
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 1.2
      },
      {
        "ticker": "INFY",
        "impactPercent": -1
      },
      {
        "ticker": "NVDA",
        "impactPercent": 2.4
      },
      {
        "ticker": "MSFT",
        "impactPercent": 1.5
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "BULL_VS_BEAR",
    "bullCommentary": "Generative AI represents a foundational platform shift akin to cloud transition in 2010. Multi-year enterprise capex guarantees technology multiples will expand.",
    "bearCommentary": "CapEx is front-loaded while enterprise ROI remains unproven. Hardware suppliers are operating at peak cyclical margins that cannot persist."
  },
  {
    "id": "EVT_014",
    "sequence": 14,
    "scheduledTime": "10:45",
    "triggerMinute": 105,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "🔍 Silicon Valley Wire: Frontier AI Pioneer Secretly Registers Hyperscale US IPO",
    "shortHeadline": "🔍 Silicon Valley Wire: Frontier AI Pioneer Secretly Registers Hyperscale US IPO",
    "description": "Unconfirmed reports from investment banking sources indicate a top-tier generative cognitive engine developer is finalizing a $180/share subscription tender on NASDAQ.",
    "affectedCountries": [
      "United States",
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "USD",
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": 2.8
      },
      {
        "ticker": "GOOGL",
        "impactPercent": -1.2
      },
      {
        "ticker": "NVDA",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_OPENAI",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_015",
    "sequence": 15,
    "scheduledTime": "11:00",
    "triggerMinute": 120,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "🚀 IPO LAUNCH I: OpenAI Global Hyperscale IPO (OAI) Opens for Bidding at $180",
    "shortHeadline": "🚀 IPO LAUNCH I: OpenAI Global Hyperscale IPO (OAI) Opens for Bidding at $180",
    "description": "Official prospectus approved by NASDAQ. OpenAI Inc commences public book-building at $180/share with lot size 10 units. International capital desks receive heavy initial bid volume.",
    "affectedCountries": [
      "United States"
    ],
    "affectedExchanges": [
      "NASDAQ"
    ],
    "affectedCurrencies": [
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "OAI",
        "impactPercent": 15
      },
      {
        "ticker": "MSFT",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_OPENAI",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_016",
    "sequence": 16,
    "scheduledTime": "11:40",
    "triggerMinute": 160,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "🚨 SURPRISE MEGA IPO: Stripe Global Financial Infrastructure (STRP) Launches on NYSE",
    "shortHeadline": "🚨 SURPRISE MEGA IPO: Stripe Global Financial Infrastructure (STRP) Launches on NYSE",
    "description": "Unscheduled flash listing on the Big Board: Stripe Inc files immediate public offer at $95/share with lot size 20 units. Digital payment Rails capture immediate cross-border allocation.",
    "affectedCountries": [
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NYSE"
    ],
    "affectedCurrencies": [
      "USD"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "STRP",
        "impactPercent": 12.5
      },
      {
        "ticker": "V",
        "impactPercent": -2.1
      },
      {
        "ticker": "MA",
        "impactPercent": -1.8
      },
      {
        "ticker": "PYPL",
        "impactPercent": -3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_STRIPE",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_017",
    "sequence": 17,
    "scheduledTime": "12:15",
    "triggerMinute": 195,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "⏸️ SAAMX Mid-Day Trading Recess: Order Matching Suspended for Lunch Interval",
    "shortHeadline": "⏸️ SAAMX Mid-Day Trading Recess: Order Matching Suspended for Lunch Interval",
    "description": "Continuous trading queues are paused for the official session recess. The Market Intelligence Wire and FX Quotation desks remain fully operational for afternoon strategy re-evaluation.",
    "affectedCountries": [
      "Global"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP",
      "EUR"
    ],
    "affectedSectors": [
      "Broad Market"
    ],
    "affectedSecurities": [],
    "marketImpact": "NEUTRAL",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "GENERAL_MARKET",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_018",
    "sequence": 18,
    "scheduledTime": "12:50",
    "triggerMinute": 230,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "🔔 SAAMX Afternoon Session Resumes: Heavy Foreign Currency Arbitrage Noted",
    "shortHeadline": "🔔 SAAMX Afternoon Session Resumes: Heavy Foreign Currency Arbitrage Noted",
    "description": "The afternoon opening bell rings. Desks react to lunch-hour macroeconomic shifts with renewed institutional block deals across Indian manufacturing and foreign technology.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology",
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 1.5
      },
      {
        "ticker": "OAI",
        "impactPercent": 4.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "GENERAL_MARKET",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_019",
    "sequence": 19,
    "scheduledTime": "13:20",
    "triggerMinute": 260,
    "category": "SENTIMENT",
    "tier": "TIER_1",
    "title": "⚔️ Bull vs Bear Showdown II: The Distressed Asset Conundrum & Rate Trajectory",
    "shortHeadline": "⚔️ Bull vs Bear Showdown II: The Distressed Asset Conundrum & Rate Trajectory",
    "description": "Stage debate escalates into high drama: Bull insists Indian domestic consumption cushions high-debt telecom and infrastructure; Bear predicts imminent credit downgrade cascade.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Telecommunications",
      "Utilities",
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": -4.5
      },
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 2.1
      },
      {
        "ticker": "SBIN",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "HIGH",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "BULL_VS_BEAR",
    "bullCommentary": "Government cannot afford a duopoly in critical digital connectivity. Strategic debt-to-equity conversions will protect equity stakeholders.",
    "bearCommentary": "Cash burn is mathematically unsustainable. Any debt conversion massively dilutes existing equity to near zero."
  },
  {
    "id": "EVT_020",
    "sequence": 20,
    "scheduledTime": "13:40",
    "triggerMinute": 280,
    "category": "CRISIS",
    "tier": "TIER_1",
    "title": "⚠️ SAAMX SIMULATION SCENARIO: Anonymous Telecom Giant Faces Severe Working Capital Crunch",
    "shortHeadline": "⚠️ SAAMX SIMULATION SCENARIO: Anonymous Telecom Giant Faces Severe Working Capital Crunch",
    "description": "SAAMX SIMULATION SCENARIO — HYPOTHETICAL CORPORATE CRISIS. Credit rating agencies place a leading Indian cellular operator on negative credit watch following vendor dues dispute.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "BSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Telecommunications"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": -8.5
      },
      {
        "ticker": "INDUSTOWER",
        "impactPercent": -6.2
      },
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "VODAFONE_IDEA_CRISIS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_021",
    "sequence": 21,
    "scheduledTime": "13:55",
    "triggerMinute": 295,
    "category": "CRISIS",
    "tier": "TIER_1",
    "title": "🚨 SAAMX SIMULATION SCENARIO — CRISIS REVEAL: Vodafone Idea (IDEA) Convenes Emergency Board",
    "shortHeadline": "🚨 SAAMX SIMULATION SCENARIO — CRISIS REVEAL: Vodafone Idea (IDEA) Convenes Emergency Board",
    "description": "SAAMX SIMULATION SCENARIO. Vodafone Idea formally notifies exchange of emergency promoter meetings to discuss debt moratoriums and AGR relief appeals.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Telecommunications",
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": -18.2
      },
      {
        "ticker": "INDUSTOWER",
        "impactPercent": -11.5
      },
      {
        "ticker": "SBIN",
        "impactPercent": -3.2
      },
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 4.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "VODAFONE_IDEA_CRISIS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_022",
    "sequence": 22,
    "scheduledTime": "14:15",
    "triggerMinute": 315,
    "category": "CRISIS",
    "tier": "TIER_1",
    "title": "⛔ REGULATORY HALT: SEBI & NSE Trigger Circuit Breaker on Vodafone Idea (IDEA)",
    "shortHeadline": "⛔ REGULATORY HALT: SEBI & NSE Trigger Circuit Breaker on Vodafone Idea (IDEA)",
    "description": "SAAMX SIMULATION SCENARIO. Trading in Vodafone Idea is formally suspended under Exchange Rule 14-B pending material structural disclosure from the Department of Telecommunications.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Telecommunications"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": -10
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "VODAFONE_IDEA_CRISIS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_023",
    "sequence": 23,
    "scheduledTime": "14:35",
    "triggerMinute": 335,
    "category": "CRISIS",
    "tier": "TIER_1",
    "title": "🚨 SAAMX SIMULATION SCENARIO RESOLUTION: Emergency Restructuring & Moratorium Granted",
    "shortHeadline": "🚨 SAAMX SIMULATION SCENARIO RESOLUTION: Emergency Restructuring & Moratorium Granted",
    "description": "SAAMX SIMULATION SCENARIO. Department of Telecom grants 5-year spectrum deferral alongside state-backed debt restructuring. Trading resumes with explosive volatility.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Telecommunications",
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": 32.5
      },
      {
        "ticker": "INDUSTOWER",
        "impactPercent": 18.4
      },
      {
        "ticker": "SBIN",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "VODAFONE_IDEA_CRISIS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_024",
    "sequence": 24,
    "scheduledTime": "14:00",
    "triggerMinute": 300,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "🎨 IPO LAUNCH: Canva Global Visual Suite (CNVA) Debuts on NASDAQ at $88/share",
    "shortHeadline": "🎨 IPO LAUNCH: Canva Global Visual Suite (CNVA) Debuts on NASDAQ at $88/share",
    "description": "Global SaaS enterprise Canva Pty files official public listing. Algorithmic and retail subscription orders flood NASDAQ exchange gateway.",
    "affectedCountries": [
      "United States",
      "Australia"
    ],
    "affectedExchanges": [
      "NASDAQ"
    ],
    "affectedCurrencies": [
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "CNVA",
        "impactPercent": 14
      },
      {
        "ticker": "ADBE",
        "impactPercent": -3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_CANVA",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_025",
    "sequence": 25,
    "scheduledTime": "14:45",
    "triggerMinute": 345,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "💬 SUPER MEGA IPO: Discord Community Infrastructure (DISC) Launches at $64/share",
    "shortHeadline": "💬 SUPER MEGA IPO: Discord Community Infrastructure (DISC) Launches at $64/share",
    "description": "High-density community messaging network Discord Inc executes historic NYSE listing. Cross-border capital desks execute block subscription allocations.",
    "affectedCountries": [
      "United States"
    ],
    "affectedExchanges": [
      "NYSE"
    ],
    "affectedCurrencies": [
      "USD"
    ],
    "affectedSectors": [
      "Consumer Internet"
    ],
    "affectedSecurities": [
      {
        "ticker": "DISC",
        "impactPercent": 16.5
      },
      {
        "ticker": "META",
        "impactPercent": -1.8
      },
      {
        "ticker": "MSFT",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_DISCORD",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_026",
    "sequence": 26,
    "scheduledTime": "15:00",
    "triggerMinute": 360,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "SAAMX Global 100 Index Inches Toward Record Floor Close on Technology Volume",
    "shortHeadline": "SAAMX Global 100 Index Inches Toward Record Floor Close on Technology Volume",
    "description": "Official closing broadcast segment presented by News Anchor Studio. SAAMX Global 100 Index Inches Toward Record Floor Close on Technology Volume. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Broad Market"
    ],
    "affectedSecurities": [
      {
        "ticker": "NVDA",
        "impactPercent": 2.1
      },
      {
        "ticker": "RELIANCE",
        "impactPercent": 1.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_027",
    "sequence": 27,
    "scheduledTime": "15:02",
    "triggerMinute": 362,
    "category": "CURRENCY",
    "tier": "TIER_1",
    "title": "USD/INR Closes Session at ₹88.45 as Foreign Equity Inflow Matches Corporate Outward Remittance",
    "shortHeadline": "USD/INR Closes Session at ₹88.45 as Foreign Equity Inflow Matches Corporate Outward Remittance",
    "description": "Official closing broadcast segment presented by News Anchor Studio. USD/INR Closes Session at ₹88.45 as Foreign Equity Inflow Matches Corporate Outward Remittance. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Currency"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 1.2
      },
      {
        "ticker": "INFY",
        "impactPercent": 1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_028",
    "sequence": 28,
    "scheduledTime": "15:04",
    "triggerMinute": 364,
    "category": "CRISIS",
    "tier": "TIER_1",
    "title": "Telecom Sector Volume Crosses All-Time SAAMX High Following Crisis Moratorium Resolution",
    "shortHeadline": "Telecom Sector Volume Crosses All-Time SAAMX High Following Crisis Moratorium Resolution",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Telecom Sector Volume Crosses All-Time SAAMX High Following Crisis Moratorium Resolution. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Telecommunications"
    ],
    "affectedSecurities": [
      {
        "ticker": "IDEA",
        "impactPercent": 4.5
      },
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 1.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_029",
    "sequence": 29,
    "scheduledTime": "15:06",
    "triggerMinute": 366,
    "category": "BOND",
    "tier": "TIER_1",
    "title": "10-Year Indian Sovereign Bond Yield Anchored at 6.92% Post Monetary Policy Affirmation",
    "shortHeadline": "10-Year Indian Sovereign Bond Yield Anchored at 6.92% Post Monetary Policy Affirmation",
    "description": "Official closing broadcast segment presented by News Anchor Studio. 10-Year Indian Sovereign Bond Yield Anchored at 6.92% Post Monetary Policy Affirmation. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSEC10Y",
        "impactPercent": 0.4
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 0.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_030",
    "sequence": 30,
    "scheduledTime": "15:08",
    "triggerMinute": 368,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "Primary Market Recap: All 5 Flagship IPOs Fully Subscribed with Double-Digit Day-One Premiums",
    "shortHeadline": "Primary Market Recap: All 5 Flagship IPOs Fully Subscribed with Double-Digit Day-One Premiums",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Primary Market Recap: All 5 Flagship IPOs Fully Subscribed with Double-Digit Day-One Premiums. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "OAI",
        "impactPercent": 3.5
      },
      {
        "ticker": "STRP",
        "impactPercent": 2.8
      },
      {
        "ticker": "CNVA",
        "impactPercent": 3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_031",
    "sequence": 31,
    "scheduledTime": "15:10",
    "triggerMinute": 370,
    "category": "GOVERNMENT",
    "tier": "TIER_1",
    "title": "Banking Syndicate Reports Zero Default Exposure Post Systemic Regulatory Stress Tests",
    "shortHeadline": "Banking Syndicate Reports Zero Default Exposure Post Systemic Regulatory Stress Tests",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Banking Syndicate Reports Zero Default Exposure Post Systemic Regulatory Stress Tests. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 1.5
      },
      {
        "ticker": "ICICIBANK",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_032",
    "sequence": 32,
    "scheduledTime": "15:12",
    "triggerMinute": 372,
    "category": "CORPORATE",
    "tier": "TIER_1",
    "title": "Power Grid Major Completes ₹8,400 Cr Inter-State Transmission Line Ahead of Schedule",
    "shortHeadline": "Power Grid Major Completes ₹8,400 Cr Inter-State Transmission Line Ahead of Schedule",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Power Grid Major Completes ₹8,400 Cr Inter-State Transmission Line Ahead of Schedule. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "POWERGRID",
        "impactPercent": 2.4
      },
      {
        "ticker": "NTPC",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_033",
    "sequence": 33,
    "scheduledTime": "15:14",
    "triggerMinute": 374,
    "category": "CORPORATE",
    "tier": "TIER_1",
    "title": "Automobile Desks Rally on Surge in Commercial Fleet and EV Delivery Volume",
    "shortHeadline": "Automobile Desks Rally on Surge in Commercial Fleet and EV Delivery Volume",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Automobile Desks Rally on Surge in Commercial Fleet and EV Delivery Volume. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 2.8
      },
      {
        "ticker": "M&M",
        "impactPercent": 2.5
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_034",
    "sequence": 34,
    "scheduledTime": "15:16",
    "triggerMinute": 376,
    "category": "REGULATORY",
    "tier": "TIER_1",
    "title": "SEBI Surveillance Logs Clean Trading Floor Ledger with Zero Circuit Violations in Afternoon",
    "shortHeadline": "SEBI Surveillance Logs Clean Trading Floor Ledger with Zero Circuit Violations in Afternoon",
    "description": "Official closing broadcast segment presented by News Anchor Studio. SEBI Surveillance Logs Clean Trading Floor Ledger with Zero Circuit Violations in Afternoon. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BSE",
        "impactPercent": 2.2
      },
      {
        "ticker": "MCX",
        "impactPercent": 1.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_035",
    "sequence": 35,
    "scheduledTime": "15:18",
    "triggerMinute": 378,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "Trading Desks Lock Order Terminals as Central Reconciliation Commences",
    "shortHeadline": "Trading Desks Lock Order Terminals as Central Reconciliation Commences",
    "description": "Official closing broadcast segment presented by News Anchor Studio. Trading Desks Lock Order Terminals as Central Reconciliation Commences. Trading teams prepare balance sheets for official reconciliation.",
    "affectedCountries": [
      "India",
      "United States"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD"
    ],
    "affectedSectors": [
      "Broad Market"
    ],
    "affectedSecurities": [
      {
        "ticker": "NIFTYBEES",
        "impactPercent": 0.2
      }
    ],
    "marketImpact": "NEUTRAL",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_036",
    "sequence": 36,
    "scheduledTime": "15:05",
    "triggerMinute": 365,
    "category": "IPO",
    "tier": "TIER_1",
    "title": "🔮 FINAL IPO EVENT: Polymarket Decentralized Prediction Engine (POLY) Lists on NASDAQ",
    "shortHeadline": "🔮 FINAL IPO EVENT: Polymarket Decentralized Prediction Engine (POLY) Lists on NASDAQ",
    "description": "Final primary market twist of SAAMX 2026: Polymarket Protocol opens secondary trading at $45/share. Desks scramble to balance final tournament portfolio allocations.",
    "affectedCountries": [
      "United States"
    ],
    "affectedExchanges": [
      "NASDAQ"
    ],
    "affectedCurrencies": [
      "USD"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "POLY",
        "impactPercent": 18.5
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "HIGH",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "IPO_POLYMARKET",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_037",
    "sequence": 37,
    "scheduledTime": "15:30",
    "triggerMinute": 390,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_1",
    "title": "🔕 SAAMX 2026 OFFICIAL MARKET CLOSE: All Order Matching Engines Locked",
    "shortHeadline": "🔕 SAAMX 2026 OFFICIAL MARKET CLOSE: All Order Matching Engines Locked",
    "description": "The final ceremonial closing bell rings across the central trading floor. Trading desks lock positions as the SEBI Auditor Desk begins multi-currency net worth reconciliation.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP",
      "EUR"
    ],
    "affectedSectors": [
      "All Sectors"
    ],
    "affectedSecurities": [],
    "marketImpact": "NEUTRAL",
    "volatilityImpact": "LOW",
    "projectorPriority": true,
    "participantVisible": true,
    "requiresAdminTrigger": true,
    "audioCue": "breaking_news",
    "storyline": "CLOSING_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_038",
    "sequence": 38,
    "scheduledTime": "09:00",
    "triggerMinute": 15,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "shortHeadline": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "description": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance. Institutional desks report active position recalibration across Utilities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 3.2
      },
      {
        "ticker": "TATAPOWER",
        "impactPercent": 2
      },
      {
        "ticker": "BHEL",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_039",
    "sequence": 39,
    "scheduledTime": "09:03",
    "triggerMinute": 3,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "shortHeadline": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "description": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders. Institutional desks report active position recalibration across Defense & Capital Goods assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Defense & Capital Goods"
    ],
    "affectedSecurities": [
      {
        "ticker": "HAL",
        "impactPercent": 1
      },
      {
        "ticker": "BEL",
        "impactPercent": 4.3
      },
      {
        "ticker": "BDL",
        "impactPercent": 1.2
      },
      {
        "ticker": "COCHINSHIP",
        "impactPercent": 4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_040",
    "sequence": 40,
    "scheduledTime": "09:07",
    "triggerMinute": 7,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "shortHeadline": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "description": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 1.9
      },
      {
        "ticker": "TEJASNET",
        "impactPercent": 3.2
      },
      {
        "ticker": "HFCL",
        "impactPercent": 1.5
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_041",
    "sequence": 41,
    "scheduledTime": "09:10",
    "triggerMinute": 10,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "shortHeadline": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "description": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 1.3
      },
      {
        "ticker": "OLECTRA",
        "impactPercent": 2.5
      },
      {
        "ticker": "EXIDEIND",
        "impactPercent": 1.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_042",
    "sequence": 42,
    "scheduledTime": "09:14",
    "triggerMinute": 14,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "shortHeadline": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "description": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 4.2
      },
      {
        "ticker": "LARSEN",
        "impactPercent": 3.9
      },
      {
        "ticker": "ADANIGREEN",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_043",
    "sequence": 43,
    "scheduledTime": "09:17",
    "triggerMinute": 17,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "shortHeadline": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "description": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BSE",
        "impactPercent": 2.8
      },
      {
        "ticker": "MCX",
        "impactPercent": 3.6
      },
      {
        "ticker": "CDSL",
        "impactPercent": 1.1
      },
      {
        "ticker": "ANGELONE",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_044",
    "sequence": 44,
    "scheduledTime": "09:21",
    "triggerMinute": 21,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "shortHeadline": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "description": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -3.7
      },
      {
        "ticker": "SBICARD",
        "impactPercent": -2.7
      },
      {
        "ticker": "AXISBANK",
        "impactPercent": -3.3
      },
      {
        "ticker": "IDFCFIRSTB",
        "impactPercent": -0.9
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_045",
    "sequence": 45,
    "scheduledTime": "09:24",
    "triggerMinute": 24,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "shortHeadline": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "description": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": -3.8
      },
      {
        "ticker": "GOOGL",
        "impactPercent": -2.1
      },
      {
        "ticker": "AMZN",
        "impactPercent": -2.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_046",
    "sequence": 46,
    "scheduledTime": "09:28",
    "triggerMinute": 28,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "shortHeadline": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "description": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": 2.2
      },
      {
        "ticker": "BARC",
        "impactPercent": 3
      },
      {
        "ticker": "LLOY",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_047",
    "sequence": 47,
    "scheduledTime": "09:31",
    "triggerMinute": 31,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "shortHeadline": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "description": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "Europe"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": 1.3
      },
      {
        "ticker": "SAN",
        "impactPercent": 2.5
      },
      {
        "ticker": "ALV",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_048",
    "sequence": 48,
    "scheduledTime": "09:35",
    "triggerMinute": 35,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "shortHeadline": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "description": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 3.2
      },
      {
        "ticker": "OIL",
        "impactPercent": 3.7
      },
      {
        "ticker": "BPCL",
        "impactPercent": 2.5
      },
      {
        "ticker": "IOC",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_049",
    "sequence": 49,
    "scheduledTime": "09:38",
    "triggerMinute": 38,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "shortHeadline": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "description": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSEC10Y",
        "impactPercent": 4.1
      },
      {
        "ticker": "SBIN",
        "impactPercent": 3
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_050",
    "sequence": 50,
    "scheduledTime": "09:42",
    "triggerMinute": 42,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "shortHeadline": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "description": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "CORPBOND_AAA",
        "impactPercent": 2.4
      },
      {
        "ticker": "RELIANCE",
        "impactPercent": 4.2
      },
      {
        "ticker": "LT",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_051",
    "sequence": 51,
    "scheduledTime": "09:45",
    "triggerMinute": 45,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "shortHeadline": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "description": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 1.8
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_052",
    "sequence": 52,
    "scheduledTime": "09:49",
    "triggerMinute": 49,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "shortHeadline": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "description": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing. Institutional desks report active position recalibration across Forex & Exports assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Forex & Exports"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 1.7
      },
      {
        "ticker": "INFY",
        "impactPercent": 2.3
      },
      {
        "ticker": "WIPRO",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_053",
    "sequence": 53,
    "scheduledTime": "09:52",
    "triggerMinute": 52,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "shortHeadline": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "description": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion. Institutional desks report active position recalibration across UK Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "UK Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": 3.6
      },
      {
        "ticker": "AZN",
        "impactPercent": 3.4
      },
      {
        "ticker": "ULVR",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_054",
    "sequence": 54,
    "scheduledTime": "09:56",
    "triggerMinute": 56,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "shortHeadline": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "description": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery. Institutional desks report active position recalibration across European Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "European Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": 3.2
      },
      {
        "ticker": "ASML",
        "impactPercent": 4.3
      },
      {
        "ticker": "SIE",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_055",
    "sequence": 55,
    "scheduledTime": "09:59",
    "triggerMinute": 59,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "shortHeadline": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "description": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory. Institutional desks report active position recalibration across Conglomerates / Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Conglomerates / Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 0.9
      },
      {
        "ticker": "TATACHEM",
        "impactPercent": 3.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_056",
    "sequence": 56,
    "scheduledTime": "10:03",
    "triggerMinute": 63,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "shortHeadline": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "description": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 4
      },
      {
        "ticker": "INFY",
        "impactPercent": 4.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_057",
    "sequence": 57,
    "scheduledTime": "10:06",
    "triggerMinute": 66,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "shortHeadline": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "description": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": 1.6
      },
      {
        "ticker": "NVDA",
        "impactPercent": 1.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_058",
    "sequence": 58,
    "scheduledTime": "10:10",
    "triggerMinute": 70,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "shortHeadline": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "description": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2.9
      },
      {
        "ticker": "KOTAKBANK",
        "impactPercent": 0.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_059",
    "sequence": 59,
    "scheduledTime": "10:13",
    "triggerMinute": 73,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "shortHeadline": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "description": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract. Institutional desks report active position recalibration across Infrastructure assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Infrastructure"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": 1.6
      },
      {
        "ticker": "IRB",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_060",
    "sequence": 60,
    "scheduledTime": "10:17",
    "triggerMinute": 77,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "shortHeadline": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "description": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension. Institutional desks report active position recalibration across Healthcare assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Healthcare"
    ],
    "affectedSecurities": [
      {
        "ticker": "SUNPHARMA",
        "impactPercent": 3.3
      },
      {
        "ticker": "CIPLA",
        "impactPercent": 1.2
      },
      {
        "ticker": "DRREDDY",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_061",
    "sequence": 61,
    "scheduledTime": "10:20",
    "triggerMinute": 80,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "shortHeadline": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "description": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "M&M",
        "impactPercent": 2.4
      },
      {
        "ticker": "MARUTI",
        "impactPercent": 3.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_062",
    "sequence": 62,
    "scheduledTime": "10:24",
    "triggerMinute": 84,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "shortHeadline": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "description": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 3.8
      },
      {
        "ticker": "ASHOKLEY",
        "impactPercent": 1.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_063",
    "sequence": 63,
    "scheduledTime": "10:27",
    "triggerMinute": 87,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "shortHeadline": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "description": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance. Institutional desks report active position recalibration across Utilities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 4.1
      },
      {
        "ticker": "TATAPOWER",
        "impactPercent": 1.7
      },
      {
        "ticker": "BHEL",
        "impactPercent": 1.5
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_064",
    "sequence": 64,
    "scheduledTime": "10:31",
    "triggerMinute": 91,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "shortHeadline": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "description": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders. Institutional desks report active position recalibration across Defense & Capital Goods assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Defense & Capital Goods"
    ],
    "affectedSecurities": [
      {
        "ticker": "HAL",
        "impactPercent": 2.3
      },
      {
        "ticker": "BEL",
        "impactPercent": 1.1
      },
      {
        "ticker": "BDL",
        "impactPercent": 3.2
      },
      {
        "ticker": "COCHINSHIP",
        "impactPercent": 2.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_065",
    "sequence": 65,
    "scheduledTime": "10:34",
    "triggerMinute": 94,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "shortHeadline": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "description": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 4.3
      },
      {
        "ticker": "TEJASNET",
        "impactPercent": 1.3
      },
      {
        "ticker": "HFCL",
        "impactPercent": 1.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_066",
    "sequence": 66,
    "scheduledTime": "10:38",
    "triggerMinute": 98,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "shortHeadline": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "description": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 1
      },
      {
        "ticker": "OLECTRA",
        "impactPercent": 3.2
      },
      {
        "ticker": "EXIDEIND",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_067",
    "sequence": 67,
    "scheduledTime": "10:41",
    "triggerMinute": 101,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "shortHeadline": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "description": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 4.1
      },
      {
        "ticker": "LARSEN",
        "impactPercent": 1.2
      },
      {
        "ticker": "ADANIGREEN",
        "impactPercent": 1.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_068",
    "sequence": 68,
    "scheduledTime": "10:45",
    "triggerMinute": 105,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "shortHeadline": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "description": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BSE",
        "impactPercent": 3
      },
      {
        "ticker": "MCX",
        "impactPercent": 2.1
      },
      {
        "ticker": "CDSL",
        "impactPercent": 1.3
      },
      {
        "ticker": "ANGELONE",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_069",
    "sequence": 69,
    "scheduledTime": "10:48",
    "triggerMinute": 108,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "shortHeadline": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "description": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -1.6
      },
      {
        "ticker": "SBICARD",
        "impactPercent": -2.4
      },
      {
        "ticker": "AXISBANK",
        "impactPercent": -3.7
      },
      {
        "ticker": "IDFCFIRSTB",
        "impactPercent": -3.3
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_070",
    "sequence": 70,
    "scheduledTime": "10:52",
    "triggerMinute": 112,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "shortHeadline": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "description": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": -2.7
      },
      {
        "ticker": "GOOGL",
        "impactPercent": -3.5
      },
      {
        "ticker": "AMZN",
        "impactPercent": -2.2
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_071",
    "sequence": 71,
    "scheduledTime": "10:55",
    "triggerMinute": 115,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "shortHeadline": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "description": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": 2.4
      },
      {
        "ticker": "BARC",
        "impactPercent": 1
      },
      {
        "ticker": "LLOY",
        "impactPercent": 1.5
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_072",
    "sequence": 72,
    "scheduledTime": "10:59",
    "triggerMinute": 119,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "shortHeadline": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "description": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "Europe"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": 3.3
      },
      {
        "ticker": "SAN",
        "impactPercent": 3.7
      },
      {
        "ticker": "ALV",
        "impactPercent": 1.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_073",
    "sequence": 73,
    "scheduledTime": "11:02",
    "triggerMinute": 122,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "shortHeadline": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "description": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 1.1
      },
      {
        "ticker": "OIL",
        "impactPercent": 2
      },
      {
        "ticker": "BPCL",
        "impactPercent": 1.8
      },
      {
        "ticker": "IOC",
        "impactPercent": 1.7
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_074",
    "sequence": 74,
    "scheduledTime": "11:06",
    "triggerMinute": 126,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "shortHeadline": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "description": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSEC10Y",
        "impactPercent": 1.2
      },
      {
        "ticker": "SBIN",
        "impactPercent": 2.7
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_075",
    "sequence": 75,
    "scheduledTime": "11:09",
    "triggerMinute": 129,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "shortHeadline": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "description": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "CORPBOND_AAA",
        "impactPercent": 3.5
      },
      {
        "ticker": "RELIANCE",
        "impactPercent": 3.4
      },
      {
        "ticker": "LT",
        "impactPercent": 3.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_076",
    "sequence": 76,
    "scheduledTime": "11:13",
    "triggerMinute": 133,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "shortHeadline": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "description": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 4
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 1.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_077",
    "sequence": 77,
    "scheduledTime": "11:16",
    "triggerMinute": 136,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "shortHeadline": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "description": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing. Institutional desks report active position recalibration across Forex & Exports assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Forex & Exports"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.7
      },
      {
        "ticker": "INFY",
        "impactPercent": 2.7
      },
      {
        "ticker": "WIPRO",
        "impactPercent": 1.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_078",
    "sequence": 78,
    "scheduledTime": "11:20",
    "triggerMinute": 140,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "shortHeadline": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "description": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion. Institutional desks report active position recalibration across UK Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "UK Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": 3.3
      },
      {
        "ticker": "AZN",
        "impactPercent": 4.2
      },
      {
        "ticker": "ULVR",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_079",
    "sequence": 79,
    "scheduledTime": "11:23",
    "triggerMinute": 143,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "shortHeadline": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "description": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery. Institutional desks report active position recalibration across European Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "European Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": 4
      },
      {
        "ticker": "ASML",
        "impactPercent": 4
      },
      {
        "ticker": "SIE",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_080",
    "sequence": 80,
    "scheduledTime": "11:27",
    "triggerMinute": 147,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "shortHeadline": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "description": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory. Institutional desks report active position recalibration across Conglomerates / Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Conglomerates / Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 3.4
      },
      {
        "ticker": "TATACHEM",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_081",
    "sequence": 81,
    "scheduledTime": "11:30",
    "triggerMinute": 150,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "shortHeadline": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "description": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 3.4
      },
      {
        "ticker": "INFY",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_082",
    "sequence": 82,
    "scheduledTime": "11:34",
    "triggerMinute": 154,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "shortHeadline": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "description": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": 1.9
      },
      {
        "ticker": "NVDA",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_083",
    "sequence": 83,
    "scheduledTime": "11:37",
    "triggerMinute": 157,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "shortHeadline": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "description": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 1.4
      },
      {
        "ticker": "KOTAKBANK",
        "impactPercent": 3.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_084",
    "sequence": 84,
    "scheduledTime": "11:41",
    "triggerMinute": 161,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "shortHeadline": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "description": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract. Institutional desks report active position recalibration across Infrastructure assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Infrastructure"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": 3.1
      },
      {
        "ticker": "IRB",
        "impactPercent": 4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_085",
    "sequence": 85,
    "scheduledTime": "11:44",
    "triggerMinute": 164,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "shortHeadline": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "description": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension. Institutional desks report active position recalibration across Healthcare assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Healthcare"
    ],
    "affectedSecurities": [
      {
        "ticker": "SUNPHARMA",
        "impactPercent": 2.8
      },
      {
        "ticker": "CIPLA",
        "impactPercent": 1.3
      },
      {
        "ticker": "DRREDDY",
        "impactPercent": 3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_086",
    "sequence": 86,
    "scheduledTime": "11:48",
    "triggerMinute": 168,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "shortHeadline": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "description": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "M&M",
        "impactPercent": 1.9
      },
      {
        "ticker": "MARUTI",
        "impactPercent": 3.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_087",
    "sequence": 87,
    "scheduledTime": "11:51",
    "triggerMinute": 171,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "shortHeadline": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "description": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 3.4
      },
      {
        "ticker": "ASHOKLEY",
        "impactPercent": 4.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_088",
    "sequence": 88,
    "scheduledTime": "11:55",
    "triggerMinute": 175,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "shortHeadline": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "description": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance. Institutional desks report active position recalibration across Utilities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 1.5
      },
      {
        "ticker": "TATAPOWER",
        "impactPercent": 4.2
      },
      {
        "ticker": "BHEL",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_089",
    "sequence": 89,
    "scheduledTime": "11:58",
    "triggerMinute": 178,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "shortHeadline": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "description": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders. Institutional desks report active position recalibration across Defense & Capital Goods assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Defense & Capital Goods"
    ],
    "affectedSecurities": [
      {
        "ticker": "HAL",
        "impactPercent": 1.6
      },
      {
        "ticker": "BEL",
        "impactPercent": 1.2
      },
      {
        "ticker": "BDL",
        "impactPercent": 3.4
      },
      {
        "ticker": "COCHINSHIP",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_090",
    "sequence": 90,
    "scheduledTime": "12:02",
    "triggerMinute": 182,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "shortHeadline": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "description": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.6
      },
      {
        "ticker": "TEJASNET",
        "impactPercent": 4.2
      },
      {
        "ticker": "HFCL",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_091",
    "sequence": 91,
    "scheduledTime": "12:05",
    "triggerMinute": 185,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "shortHeadline": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "description": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 1.6
      },
      {
        "ticker": "OLECTRA",
        "impactPercent": 2.7
      },
      {
        "ticker": "EXIDEIND",
        "impactPercent": 1.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_092",
    "sequence": 92,
    "scheduledTime": "12:09",
    "triggerMinute": 189,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "shortHeadline": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "description": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 3.3
      },
      {
        "ticker": "LARSEN",
        "impactPercent": 2.8
      },
      {
        "ticker": "ADANIGREEN",
        "impactPercent": 1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_093",
    "sequence": 93,
    "scheduledTime": "12:12",
    "triggerMinute": 192,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "shortHeadline": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "description": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BSE",
        "impactPercent": 4.2
      },
      {
        "ticker": "MCX",
        "impactPercent": 4.1
      },
      {
        "ticker": "CDSL",
        "impactPercent": 3
      },
      {
        "ticker": "ANGELONE",
        "impactPercent": 2.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_094",
    "sequence": 94,
    "scheduledTime": "12:16",
    "triggerMinute": 196,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "shortHeadline": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "description": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -2.5
      },
      {
        "ticker": "SBICARD",
        "impactPercent": -1.3
      },
      {
        "ticker": "AXISBANK",
        "impactPercent": -2.5
      },
      {
        "ticker": "IDFCFIRSTB",
        "impactPercent": -3.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_095",
    "sequence": 95,
    "scheduledTime": "12:19",
    "triggerMinute": 199,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "shortHeadline": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "description": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": -4.2
      },
      {
        "ticker": "GOOGL",
        "impactPercent": -1.3
      },
      {
        "ticker": "AMZN",
        "impactPercent": -2.9
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_096",
    "sequence": 96,
    "scheduledTime": "12:23",
    "triggerMinute": 203,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "shortHeadline": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "description": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": 3
      },
      {
        "ticker": "BARC",
        "impactPercent": 1.9
      },
      {
        "ticker": "LLOY",
        "impactPercent": 3.3
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_097",
    "sequence": 97,
    "scheduledTime": "12:26",
    "triggerMinute": 206,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "shortHeadline": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "description": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "Europe"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": 0.9
      },
      {
        "ticker": "SAN",
        "impactPercent": 3.2
      },
      {
        "ticker": "ALV",
        "impactPercent": 2.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_098",
    "sequence": 98,
    "scheduledTime": "12:30",
    "triggerMinute": 210,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "shortHeadline": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "description": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 2.3
      },
      {
        "ticker": "OIL",
        "impactPercent": 2.7
      },
      {
        "ticker": "BPCL",
        "impactPercent": 2.7
      },
      {
        "ticker": "IOC",
        "impactPercent": 1.3
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_099",
    "sequence": 99,
    "scheduledTime": "12:33",
    "triggerMinute": 213,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "shortHeadline": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "description": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSEC10Y",
        "impactPercent": 1.8
      },
      {
        "ticker": "SBIN",
        "impactPercent": 2.5
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_100",
    "sequence": 100,
    "scheduledTime": "12:37",
    "triggerMinute": 217,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "shortHeadline": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "description": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "CORPBOND_AAA",
        "impactPercent": 4.1
      },
      {
        "ticker": "RELIANCE",
        "impactPercent": 2.9
      },
      {
        "ticker": "LT",
        "impactPercent": 0.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_101",
    "sequence": 101,
    "scheduledTime": "12:40",
    "triggerMinute": 220,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "shortHeadline": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "description": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 4.2
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_102",
    "sequence": 102,
    "scheduledTime": "12:44",
    "triggerMinute": 224,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "shortHeadline": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "description": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing. Institutional desks report active position recalibration across Forex & Exports assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Forex & Exports"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.6
      },
      {
        "ticker": "INFY",
        "impactPercent": 2.1
      },
      {
        "ticker": "WIPRO",
        "impactPercent": 2.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_103",
    "sequence": 103,
    "scheduledTime": "12:47",
    "triggerMinute": 227,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "shortHeadline": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "description": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion. Institutional desks report active position recalibration across UK Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "UK Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": 2.9
      },
      {
        "ticker": "AZN",
        "impactPercent": 1
      },
      {
        "ticker": "ULVR",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_104",
    "sequence": 104,
    "scheduledTime": "12:51",
    "triggerMinute": 231,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "shortHeadline": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "description": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery. Institutional desks report active position recalibration across European Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "European Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": 3.1
      },
      {
        "ticker": "ASML",
        "impactPercent": 3.3
      },
      {
        "ticker": "SIE",
        "impactPercent": 0.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_105",
    "sequence": 105,
    "scheduledTime": "12:54",
    "triggerMinute": 234,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "shortHeadline": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "description": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory. Institutional desks report active position recalibration across Conglomerates / Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Conglomerates / Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 2.6
      },
      {
        "ticker": "TATACHEM",
        "impactPercent": 2.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_106",
    "sequence": 106,
    "scheduledTime": "12:58",
    "triggerMinute": 238,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "shortHeadline": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "description": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 3
      },
      {
        "ticker": "INFY",
        "impactPercent": 3.5
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_107",
    "sequence": 107,
    "scheduledTime": "13:01",
    "triggerMinute": 241,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "shortHeadline": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "description": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": 3.6
      },
      {
        "ticker": "NVDA",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_108",
    "sequence": 108,
    "scheduledTime": "13:05",
    "triggerMinute": 245,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "shortHeadline": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios",
    "description": "HDFC Bank Reports 18.5% Domestic Advances Growth in Core Retail & SME Portfolios. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.6
      },
      {
        "ticker": "KOTAKBANK",
        "impactPercent": 1.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_109",
    "sequence": 109,
    "scheduledTime": "13:08",
    "triggerMinute": 248,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "shortHeadline": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract",
    "description": "Larsen & Toubro Heavy Civil Infrastructure Wins ₹4,500 Cr Bullet Train Viaduct Contract. Institutional desks report active position recalibration across Infrastructure assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Infrastructure"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": 1.9
      },
      {
        "ticker": "IRB",
        "impactPercent": 1.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_110",
    "sequence": 110,
    "scheduledTime": "13:12",
    "triggerMinute": 252,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "shortHeadline": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension",
    "description": "Sun Pharma Receives US FDA Final Approval for Novel Ophthalmic Suspension. Institutional desks report active position recalibration across Healthcare assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Healthcare"
    ],
    "affectedSecurities": [
      {
        "ticker": "SUNPHARMA",
        "impactPercent": 4.1
      },
      {
        "ticker": "CIPLA",
        "impactPercent": 3.1
      },
      {
        "ticker": "DRREDDY",
        "impactPercent": 3.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_111",
    "sequence": 111,
    "scheduledTime": "13:15",
    "triggerMinute": 255,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "shortHeadline": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum",
    "description": "Mahindra & Mahindra SUV Order Backlog Surpasses 220,000 Units on Strong Booking Momentum. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "M&M",
        "impactPercent": 3.9
      },
      {
        "ticker": "MARUTI",
        "impactPercent": 3.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_112",
    "sequence": 112,
    "scheduledTime": "13:19",
    "triggerMinute": 259,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "shortHeadline": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure",
    "description": "Tata Motors Commercial Vehicle Arm Announces Demerger Timeline and Capital Structure. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 2.3
      },
      {
        "ticker": "ASHOKLEY",
        "impactPercent": 3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_113",
    "sequence": 113,
    "scheduledTime": "13:22",
    "triggerMinute": 262,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "shortHeadline": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance",
    "description": "Ministry of Power Mandates 100% Thermal Plant Flue-Gas Desulfurization Compliance. Institutional desks report active position recalibration across Utilities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Utilities"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 1.8
      },
      {
        "ticker": "TATAPOWER",
        "impactPercent": 4.1
      },
      {
        "ticker": "BHEL",
        "impactPercent": 4
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_114",
    "sequence": 114,
    "scheduledTime": "13:26",
    "triggerMinute": 266,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "shortHeadline": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders",
    "description": "Defense Acquisition Council Clears ₹28,000 Cr Indigenous Frigate & Radar Orders. Institutional desks report active position recalibration across Defense & Capital Goods assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Defense & Capital Goods"
    ],
    "affectedSecurities": [
      {
        "ticker": "HAL",
        "impactPercent": 3.3
      },
      {
        "ticker": "BEL",
        "impactPercent": 3.4
      },
      {
        "ticker": "BDL",
        "impactPercent": 1.9
      },
      {
        "ticker": "COCHINSHIP",
        "impactPercent": 3.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_115",
    "sequence": 115,
    "scheduledTime": "13:29",
    "triggerMinute": 269,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "shortHeadline": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium",
    "description": "Department of Telecommunications Approves 6G Testbed Pilot Funding for IIT Consortium. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 1.8
      },
      {
        "ticker": "TEJASNET",
        "impactPercent": 2.6
      },
      {
        "ticker": "HFCL",
        "impactPercent": 4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_116",
    "sequence": 116,
    "scheduledTime": "13:33",
    "triggerMinute": 273,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "shortHeadline": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework",
    "description": "Ministry of Heavy Industries Extends FAME-III Electric Vehicle Subsidy Framework. Institutional desks report active position recalibration across Automotive assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Automotive"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 3
      },
      {
        "ticker": "OLECTRA",
        "impactPercent": 2.1
      },
      {
        "ticker": "EXIDEIND",
        "impactPercent": 3.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_117",
    "sequence": 117,
    "scheduledTime": "13:36",
    "triggerMinute": 276,
    "category": "GOVERNMENT",
    "tier": "TIER_2",
    "title": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "shortHeadline": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster",
    "description": "National Green Hydrogen Mission Sanctions 1.2 Million Tonne Electrolyser Cluster. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 1.7
      },
      {
        "ticker": "LARSEN",
        "impactPercent": 3.2
      },
      {
        "ticker": "ADANIGREEN",
        "impactPercent": 3.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_118",
    "sequence": 118,
    "scheduledTime": "13:40",
    "triggerMinute": 280,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "shortHeadline": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities",
    "description": "SEBI Mandates T+0 Instant Settlement Pilot for Top 500 Market Cap Securities. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BSE",
        "impactPercent": 4.3
      },
      {
        "ticker": "MCX",
        "impactPercent": 2.3
      },
      {
        "ticker": "CDSL",
        "impactPercent": 3.4
      },
      {
        "ticker": "ANGELONE",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_119",
    "sequence": 119,
    "scheduledTime": "13:43",
    "triggerMinute": 283,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "shortHeadline": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating",
    "description": "RBI Tightens Unsecured Retail Lending Risk Weights to Curb Personal Loan Overheating. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -4
      },
      {
        "ticker": "SBICARD",
        "impactPercent": -1.1
      },
      {
        "ticker": "AXISBANK",
        "impactPercent": -4.2
      },
      {
        "ticker": "IDFCFIRSTB",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_120",
    "sequence": 120,
    "scheduledTime": "13:47",
    "triggerMinute": 287,
    "category": "REGULATORY",
    "tier": "TIER_2",
    "title": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "shortHeadline": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships",
    "description": "US FTC Opens Formal Antitrust Scrutiny into Cloud AI Infrastructure Partnerships. Institutional desks report active position recalibration across Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": -2.5
      },
      {
        "ticker": "GOOGL",
        "impactPercent": -3.8
      },
      {
        "ticker": "AMZN",
        "impactPercent": -2.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_121",
    "sequence": 121,
    "scheduledTime": "13:50",
    "triggerMinute": 290,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "shortHeadline": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness",
    "description": "Bank of England Holds Base Rate at 5.0% Amid Services Sector Inflation Stickiness. Institutional desks report active position recalibration across Banking assets.",
    "affectedCountries": [
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "Banking"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": 2.8
      },
      {
        "ticker": "BARC",
        "impactPercent": 2.4
      },
      {
        "ticker": "LLOY",
        "impactPercent": 3.3
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_122",
    "sequence": 122,
    "scheduledTime": "13:54",
    "triggerMinute": 294,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "shortHeadline": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation",
    "description": "European Central Bank Signals 25 bps Deposit Rate Reduction on Core Disinflation. Institutional desks report active position recalibration across Financial Services assets.",
    "affectedCountries": [
      "Europe"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "Financial Services"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": 3.4
      },
      {
        "ticker": "SAN",
        "impactPercent": 1.3
      },
      {
        "ticker": "ALV",
        "impactPercent": 1.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_123",
    "sequence": 123,
    "scheduledTime": "13:57",
    "triggerMinute": 297,
    "category": "GLOBAL_MACRO",
    "tier": "TIER_2",
    "title": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "shortHeadline": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment",
    "description": "OPEC+ Reaffirms 2.2 Million Barrels per Day Voluntary Crude Production Curtailment. Institutional desks report active position recalibration across Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 2.4
      },
      {
        "ticker": "OIL",
        "impactPercent": 3.8
      },
      {
        "ticker": "BPCL",
        "impactPercent": 3.4
      },
      {
        "ticker": "IOC",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "MIXED",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_124",
    "sequence": 124,
    "scheduledTime": "14:01",
    "triggerMinute": 301,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "shortHeadline": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows",
    "description": "Government of India 10-Year Benchmark Bond Yield Drops 6 bps Following FPI Inflows. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSEC10Y",
        "impactPercent": 3.2
      },
      {
        "ticker": "SBIN",
        "impactPercent": 2.5
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_125",
    "sequence": 125,
    "scheduledTime": "14:04",
    "triggerMinute": 304,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "shortHeadline": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps",
    "description": "AAA Corporate Bond Spread Narrowing Signals Record Low Refinancing Risk for Large-Caps. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "CORPBOND_AAA",
        "impactPercent": 3.9
      },
      {
        "ticker": "RELIANCE",
        "impactPercent": 2.2
      },
      {
        "ticker": "LT",
        "impactPercent": 4.3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_126",
    "sequence": 126,
    "scheduledTime": "14:08",
    "triggerMinute": 308,
    "category": "BOND",
    "tier": "TIER_2",
    "title": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "shortHeadline": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%",
    "description": "State Bank of India Raises ₹10,000 Cr via Tier-2 Basel III Subordinated Debt at 7.35%. Institutional desks report active position recalibration across Bonds & Fixed Income assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Bonds & Fixed Income"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 0.9
      },
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.7
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_127",
    "sequence": 127,
    "scheduledTime": "14:11",
    "triggerMinute": 311,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "shortHeadline": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing",
    "description": "USD/INR Volatility Index Cools to Multi-Month Low of 2.1% on Central Bank Smoothing. Institutional desks report active position recalibration across Forex & Exports assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Forex & Exports"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.1
      },
      {
        "ticker": "INFY",
        "impactPercent": 1.8
      },
      {
        "ticker": "WIPRO",
        "impactPercent": 3.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_128",
    "sequence": 128,
    "scheduledTime": "14:15",
    "triggerMinute": 315,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "shortHeadline": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion",
    "description": "GBP/INR Spikes to ₹119.80 Following UK Retail Sales Expansion. Institutional desks report active position recalibration across UK Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "GBP"
    ],
    "affectedSectors": [
      "UK Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": 2.1
      },
      {
        "ticker": "AZN",
        "impactPercent": 2.3
      },
      {
        "ticker": "ULVR",
        "impactPercent": 1.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_129",
    "sequence": 129,
    "scheduledTime": "14:18",
    "triggerMinute": 318,
    "category": "CURRENCY",
    "tier": "TIER_2",
    "title": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "shortHeadline": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery",
    "description": "EUR/INR Touches ₹103.85 Amid Eurozone Manufacturing Sentiment Recovery. Institutional desks report active position recalibration across European Equities assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "EUR"
    ],
    "affectedSectors": [
      "European Equities"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": 2.9
      },
      {
        "ticker": "ASML",
        "impactPercent": 3.7
      },
      {
        "ticker": "SIE",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_130",
    "sequence": 130,
    "scheduledTime": "14:22",
    "triggerMinute": 322,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "shortHeadline": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory",
    "description": "Reliance Industries Commissions World-Scale Integrated Solar Photovoltaic Giga-Factory. Institutional desks report active position recalibration across Conglomerates / Energy assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Conglomerates / Energy"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 1.1
      },
      {
        "ticker": "TATACHEM",
        "impactPercent": 2.5
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_131",
    "sequence": 131,
    "scheduledTime": "14:25",
    "triggerMinute": 325,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "shortHeadline": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank",
    "description": "Tata Consultancy Services Secures $1.8 Billion Digital Transformation Deal from European Bank. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.3
      },
      {
        "ticker": "INFY",
        "impactPercent": 3
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_132",
    "sequence": 132,
    "scheduledTime": "14:29",
    "triggerMinute": 329,
    "category": "CORPORATE",
    "tier": "TIER_2",
    "title": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "shortHeadline": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA",
    "description": "Infosys Expands Enterprise Generative AI Studio in Partnership with NVIDIA. Institutional desks report active position recalibration across Information Technology assets.",
    "affectedCountries": [
      "India"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR"
    ],
    "affectedSectors": [
      "Information Technology"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": 1.9
      },
      {
        "ticker": "NVDA",
        "impactPercent": 4.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "MEDIUM",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "alert_ping",
    "storyline": "SECTOR_NEWS",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_133",
    "sequence": 133,
    "scheduledTime": "09:05",
    "triggerMinute": 5,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: RELIANCE Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "RELIANCE: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on RELIANCE. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_134",
    "sequence": 134,
    "scheduledTime": "09:07",
    "triggerMinute": 7,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: TCS Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "TCS: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on TCS. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_135",
    "sequence": 135,
    "scheduledTime": "09:09",
    "triggerMinute": 9,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: HDFCBANK Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "HDFCBANK: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on HDFCBANK. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_136",
    "sequence": 136,
    "scheduledTime": "09:11",
    "triggerMinute": 11,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: INFY Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "INFY: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on INFY. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_137",
    "sequence": 137,
    "scheduledTime": "09:13",
    "triggerMinute": 13,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: ICICIBANK Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "ICICIBANK: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on ICICIBANK. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ICICIBANK",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_138",
    "sequence": 138,
    "scheduledTime": "09:15",
    "triggerMinute": 15,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: BHARTIARTL Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "BHARTIARTL: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on BHARTIARTL. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BHARTIARTL",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_139",
    "sequence": 139,
    "scheduledTime": "09:17",
    "triggerMinute": 17,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: SBIN Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "SBIN: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Jefferies India published updated institutional market intelligence on SBIN. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_140",
    "sequence": 140,
    "scheduledTime": "09:19",
    "triggerMinute": 19,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: LT Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "LT: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on LT. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_141",
    "sequence": 141,
    "scheduledTime": "09:21",
    "triggerMinute": 21,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: ITC Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "ITC: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "UBS Global Research published updated institutional market intelligence on ITC. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ITC",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_142",
    "sequence": 142,
    "scheduledTime": "09:23",
    "triggerMinute": 23,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: HINDUNILVR Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "HINDUNILVR: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Nomura Equities published updated institutional market intelligence on HINDUNILVR. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HINDUNILVR",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_143",
    "sequence": 143,
    "scheduledTime": "09:25",
    "triggerMinute": 25,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: TATAMOTORS Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "TATAMOTORS: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "HSBC Global Research published updated institutional market intelligence on TATAMOTORS. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_144",
    "sequence": 144,
    "scheduledTime": "09:27",
    "triggerMinute": 27,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: TATASTEEL Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "TATASTEEL: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Macquarie Capital published updated institutional market intelligence on TATASTEEL. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATASTEEL",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_145",
    "sequence": 145,
    "scheduledTime": "09:29",
    "triggerMinute": 29,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: M&M Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "M&M: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on M&M. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "M&M",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_146",
    "sequence": 146,
    "scheduledTime": "09:31",
    "triggerMinute": 31,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: BAJFINANCE Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "BAJFINANCE: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on BAJFINANCE. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_147",
    "sequence": 147,
    "scheduledTime": "09:33",
    "triggerMinute": 33,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: SUNPHARMA Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "SUNPHARMA: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on SUNPHARMA. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SUNPHARMA",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_148",
    "sequence": 148,
    "scheduledTime": "09:35",
    "triggerMinute": 35,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: ASIANPAINT Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "ASIANPAINT: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on ASIANPAINT. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ASIANPAINT",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_149",
    "sequence": 149,
    "scheduledTime": "09:37",
    "triggerMinute": 37,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: AXISBANK Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "AXISBANK: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on AXISBANK. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AXISBANK",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_150",
    "sequence": 150,
    "scheduledTime": "09:39",
    "triggerMinute": 39,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: KOTAKBANK Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "KOTAKBANK: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on KOTAKBANK. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "KOTAKBANK",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_151",
    "sequence": 151,
    "scheduledTime": "09:41",
    "triggerMinute": 41,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: MARUTI Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "MARUTI: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on MARUTI. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MARUTI",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_152",
    "sequence": 152,
    "scheduledTime": "09:43",
    "triggerMinute": 43,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: WIPRO Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "WIPRO: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Jefferies India published updated institutional market intelligence on WIPRO. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "WIPRO",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_153",
    "sequence": 153,
    "scheduledTime": "09:45",
    "triggerMinute": 45,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: HCLTECH Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "HCLTECH: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on HCLTECH. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HCLTECH",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_154",
    "sequence": 154,
    "scheduledTime": "09:47",
    "triggerMinute": 47,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: ULTRACEMCO Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "ULTRACEMCO: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "UBS Global Research published updated institutional market intelligence on ULTRACEMCO. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ULTRACEMCO",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_155",
    "sequence": 155,
    "scheduledTime": "09:49",
    "triggerMinute": 49,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: TITAN Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "TITAN: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Nomura Equities published updated institutional market intelligence on TITAN. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TITAN",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_156",
    "sequence": 156,
    "scheduledTime": "09:51",
    "triggerMinute": 51,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: NESTLEIND Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "NESTLEIND: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "HSBC Global Research published updated institutional market intelligence on NESTLEIND. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NESTLEIND",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_157",
    "sequence": 157,
    "scheduledTime": "09:53",
    "triggerMinute": 53,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: BAJAJFINSV Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "BAJAJFINSV: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Macquarie Capital published updated institutional market intelligence on BAJAJFINSV. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJAJFINSV",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_158",
    "sequence": 158,
    "scheduledTime": "09:55",
    "triggerMinute": 55,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: ADANIENT Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "ADANIENT: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on ADANIENT. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ADANIENT",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_159",
    "sequence": 159,
    "scheduledTime": "09:57",
    "triggerMinute": 57,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: ADANIPORTS Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "ADANIPORTS: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on ADANIPORTS. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ADANIPORTS",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_160",
    "sequence": 160,
    "scheduledTime": "09:59",
    "triggerMinute": 59,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: POWERGRID Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "POWERGRID: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on POWERGRID. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "POWERGRID",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_161",
    "sequence": 161,
    "scheduledTime": "10:01",
    "triggerMinute": 61,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: NTPC Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "NTPC: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on NTPC. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_162",
    "sequence": 162,
    "scheduledTime": "10:03",
    "triggerMinute": 63,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: ONGC Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "ONGC: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on ONGC. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_163",
    "sequence": 163,
    "scheduledTime": "10:05",
    "triggerMinute": 65,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: COALINDIA Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "COALINDIA: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on COALINDIA. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "COALINDIA",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_164",
    "sequence": 164,
    "scheduledTime": "10:07",
    "triggerMinute": 67,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: JSWSTEEL Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "JSWSTEEL: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on JSWSTEEL. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JSWSTEEL",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_165",
    "sequence": 165,
    "scheduledTime": "10:09",
    "triggerMinute": 69,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: HINDALCO Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "HINDALCO: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Jefferies India published updated institutional market intelligence on HINDALCO. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HINDALCO",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_166",
    "sequence": 166,
    "scheduledTime": "10:11",
    "triggerMinute": 71,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: GRASIM Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "GRASIM: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on GRASIM. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GRASIM",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_167",
    "sequence": 167,
    "scheduledTime": "10:13",
    "triggerMinute": 73,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: TECHM Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "TECHM: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "UBS Global Research published updated institutional market intelligence on TECHM. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TECHM",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_168",
    "sequence": 168,
    "scheduledTime": "10:15",
    "triggerMinute": 75,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: AAPL Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "AAPL: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Nomura Equities published updated institutional market intelligence on AAPL. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AAPL",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_169",
    "sequence": 169,
    "scheduledTime": "10:17",
    "triggerMinute": 77,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: MSFT Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "MSFT: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "HSBC Global Research published updated institutional market intelligence on MSFT. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_170",
    "sequence": 170,
    "scheduledTime": "10:19",
    "triggerMinute": 79,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: GOOGL Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "GOOGL: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Macquarie Capital published updated institutional market intelligence on GOOGL. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GOOGL",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_171",
    "sequence": 171,
    "scheduledTime": "10:21",
    "triggerMinute": 81,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: AMZN Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "AMZN: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on AMZN. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AMZN",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_172",
    "sequence": 172,
    "scheduledTime": "10:23",
    "triggerMinute": 83,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: NVDA Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "NVDA: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on NVDA. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NVDA",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_173",
    "sequence": 173,
    "scheduledTime": "10:25",
    "triggerMinute": 85,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: META Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "META: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on META. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "META",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_174",
    "sequence": 174,
    "scheduledTime": "10:27",
    "triggerMinute": 87,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: TSLA Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "TSLA: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on TSLA. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TSLA",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_175",
    "sequence": 175,
    "scheduledTime": "10:29",
    "triggerMinute": 89,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: NFLX Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "NFLX: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on NFLX. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NFLX",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_176",
    "sequence": 176,
    "scheduledTime": "10:31",
    "triggerMinute": 91,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: AMD Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "AMD: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on AMD. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AMD",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_177",
    "sequence": 177,
    "scheduledTime": "10:33",
    "triggerMinute": 93,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: INTC Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "INTC: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on INTC. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "INTC",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_178",
    "sequence": 178,
    "scheduledTime": "10:35",
    "triggerMinute": 95,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: ORCL Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "ORCL: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Jefferies India published updated institutional market intelligence on ORCL. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ORCL",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_179",
    "sequence": 179,
    "scheduledTime": "10:37",
    "triggerMinute": 97,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: CRM Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "CRM: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on CRM. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "CRM",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_180",
    "sequence": 180,
    "scheduledTime": "10:39",
    "triggerMinute": 99,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: JPM Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "JPM: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "UBS Global Research published updated institutional market intelligence on JPM. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JPM",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_181",
    "sequence": 181,
    "scheduledTime": "10:41",
    "triggerMinute": 101,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: V Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "V: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Nomura Equities published updated institutional market intelligence on V. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "V",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_182",
    "sequence": 182,
    "scheduledTime": "10:43",
    "triggerMinute": 103,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: MA Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "MA: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "HSBC Global Research published updated institutional market intelligence on MA. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MA",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_183",
    "sequence": 183,
    "scheduledTime": "10:45",
    "triggerMinute": 105,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: WMT Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "WMT: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Macquarie Capital published updated institutional market intelligence on WMT. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "WMT",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_184",
    "sequence": 184,
    "scheduledTime": "10:47",
    "triggerMinute": 107,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: KO Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "KO: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on KO. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "KO",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_185",
    "sequence": 185,
    "scheduledTime": "10:49",
    "triggerMinute": 109,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: DIS Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "DIS: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on DIS. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "DIS",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_186",
    "sequence": 186,
    "scheduledTime": "10:51",
    "triggerMinute": 111,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: BA Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "BA: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on BA. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BA",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_187",
    "sequence": 187,
    "scheduledTime": "10:53",
    "triggerMinute": 113,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: XOM Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "XOM: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on XOM. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "XOM",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_188",
    "sequence": 188,
    "scheduledTime": "10:55",
    "triggerMinute": 115,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: CVX Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "CVX: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on CVX. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "CVX",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_189",
    "sequence": 189,
    "scheduledTime": "10:57",
    "triggerMinute": 117,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: PG Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "PG: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on PG. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "PG",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_190",
    "sequence": 190,
    "scheduledTime": "10:59",
    "triggerMinute": 119,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: JNJ Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "JNJ: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on JNJ. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JNJ",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_191",
    "sequence": 191,
    "scheduledTime": "11:01",
    "triggerMinute": 121,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: UNH Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "UNH: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Jefferies India published updated institutional market intelligence on UNH. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "UNH",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_192",
    "sequence": 192,
    "scheduledTime": "11:03",
    "triggerMinute": 123,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: PFE Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "PFE: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on PFE. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "PFE",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_193",
    "sequence": 193,
    "scheduledTime": "11:05",
    "triggerMinute": 125,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: MRK Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "MRK: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "UBS Global Research published updated institutional market intelligence on MRK. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MRK",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_194",
    "sequence": 194,
    "scheduledTime": "11:07",
    "triggerMinute": 127,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: SHEL Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "SHEL: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Nomura Equities published updated institutional market intelligence on SHEL. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SHEL",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_195",
    "sequence": 195,
    "scheduledTime": "11:09",
    "triggerMinute": 129,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: BP Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "BP: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "HSBC Global Research published updated institutional market intelligence on BP. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BP",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_196",
    "sequence": 196,
    "scheduledTime": "11:11",
    "triggerMinute": 131,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: HSBA Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "HSBA: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Macquarie Capital published updated institutional market intelligence on HSBA. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_197",
    "sequence": 197,
    "scheduledTime": "11:13",
    "triggerMinute": 133,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: BARC Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "BARC: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on BARC. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BARC",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_198",
    "sequence": 198,
    "scheduledTime": "11:15",
    "triggerMinute": 135,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: LLOY Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "LLOY: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on LLOY. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "LLOY",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_199",
    "sequence": 199,
    "scheduledTime": "11:17",
    "triggerMinute": 137,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: AZN Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "AZN: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on AZN. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AZN",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_200",
    "sequence": 200,
    "scheduledTime": "11:19",
    "triggerMinute": 139,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: GSK Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "GSK: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on GSK. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSK",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_201",
    "sequence": 201,
    "scheduledTime": "11:21",
    "triggerMinute": 141,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: ULVR Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "ULVR: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on ULVR. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ULVR",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_202",
    "sequence": 202,
    "scheduledTime": "11:23",
    "triggerMinute": 143,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: RR Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "RR: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on RR. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_203",
    "sequence": 203,
    "scheduledTime": "11:25",
    "triggerMinute": 145,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: RIO Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "RIO: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on RIO. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RIO",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_204",
    "sequence": 204,
    "scheduledTime": "11:27",
    "triggerMinute": 147,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: BHP Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "BHP: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Jefferies India published updated institutional market intelligence on BHP. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BHP",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_205",
    "sequence": 205,
    "scheduledTime": "11:29",
    "triggerMinute": 149,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: GLEN Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "GLEN: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on GLEN. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GLEN",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_206",
    "sequence": 206,
    "scheduledTime": "11:31",
    "triggerMinute": 151,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: VOD Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "VOD: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "UBS Global Research published updated institutional market intelligence on VOD. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "VOD",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_207",
    "sequence": 207,
    "scheduledTime": "11:33",
    "triggerMinute": 153,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: ASML Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "ASML: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Nomura Equities published updated institutional market intelligence on ASML. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ASML",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_208",
    "sequence": 208,
    "scheduledTime": "11:35",
    "triggerMinute": 155,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: SAP Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "SAP: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "HSBC Global Research published updated institutional market intelligence on SAP. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_209",
    "sequence": 209,
    "scheduledTime": "11:37",
    "triggerMinute": 157,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: SIE Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "SIE: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Macquarie Capital published updated institutional market intelligence on SIE. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SIE",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_210",
    "sequence": 210,
    "scheduledTime": "11:39",
    "triggerMinute": 159,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: BMW Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "BMW: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on BMW. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BMW",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_211",
    "sequence": 211,
    "scheduledTime": "11:41",
    "triggerMinute": 161,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: MBG Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "MBG: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on MBG. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MBG",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_212",
    "sequence": 212,
    "scheduledTime": "11:43",
    "triggerMinute": 163,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: VOW3 Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "VOW3: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on VOW3. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "VOW3",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_213",
    "sequence": 213,
    "scheduledTime": "11:45",
    "triggerMinute": 165,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: AIR Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "AIR: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on AIR. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AIR",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_214",
    "sequence": 214,
    "scheduledTime": "11:47",
    "triggerMinute": 167,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: MC Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "MC: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on MC. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MC",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_215",
    "sequence": 215,
    "scheduledTime": "11:49",
    "triggerMinute": 169,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: OR Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "OR: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on OR. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "OR",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_216",
    "sequence": 216,
    "scheduledTime": "11:51",
    "triggerMinute": 171,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: SAN Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "SAN: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on SAN. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAN",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_217",
    "sequence": 217,
    "scheduledTime": "11:53",
    "triggerMinute": 173,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: TTE Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "TTE: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Jefferies India published updated institutional market intelligence on TTE. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TTE",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_218",
    "sequence": 218,
    "scheduledTime": "11:55",
    "triggerMinute": 175,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: BNP Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "BNP: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on BNP. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_219",
    "sequence": 219,
    "scheduledTime": "11:57",
    "triggerMinute": 177,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: DTE Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "DTE: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "UBS Global Research published updated institutional market intelligence on DTE. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "DTE",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_220",
    "sequence": 220,
    "scheduledTime": "11:59",
    "triggerMinute": 179,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: ALV Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "ALV: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Nomura Equities published updated institutional market intelligence on ALV. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ALV",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_221",
    "sequence": 221,
    "scheduledTime": "12:01",
    "triggerMinute": 181,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: RELIANCE Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "RELIANCE: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "HSBC Global Research published updated institutional market intelligence on RELIANCE. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_222",
    "sequence": 222,
    "scheduledTime": "12:03",
    "triggerMinute": 183,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: TCS Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "TCS: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Macquarie Capital published updated institutional market intelligence on TCS. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_223",
    "sequence": 223,
    "scheduledTime": "12:05",
    "triggerMinute": 185,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: HDFCBANK Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "HDFCBANK: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on HDFCBANK. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_224",
    "sequence": 224,
    "scheduledTime": "12:07",
    "triggerMinute": 187,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: INFY Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "INFY: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on INFY. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_225",
    "sequence": 225,
    "scheduledTime": "12:09",
    "triggerMinute": 189,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: ICICIBANK Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "ICICIBANK: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on ICICIBANK. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ICICIBANK",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_226",
    "sequence": 226,
    "scheduledTime": "12:11",
    "triggerMinute": 191,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: BHARTIARTL Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "BHARTIARTL: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on BHARTIARTL. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BHARTIARTL",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_227",
    "sequence": 227,
    "scheduledTime": "12:13",
    "triggerMinute": 193,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: SBIN Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "SBIN: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on SBIN. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_228",
    "sequence": 228,
    "scheduledTime": "12:15",
    "triggerMinute": 195,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: LT Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "LT: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on LT. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_229",
    "sequence": 229,
    "scheduledTime": "12:17",
    "triggerMinute": 197,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: ITC Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "ITC: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on ITC. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ITC",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_230",
    "sequence": 230,
    "scheduledTime": "12:19",
    "triggerMinute": 199,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: HINDUNILVR Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "HINDUNILVR: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Jefferies India published updated institutional market intelligence on HINDUNILVR. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HINDUNILVR",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_231",
    "sequence": 231,
    "scheduledTime": "12:21",
    "triggerMinute": 201,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: TATAMOTORS Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "TATAMOTORS: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on TATAMOTORS. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_232",
    "sequence": 232,
    "scheduledTime": "12:23",
    "triggerMinute": 203,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: TATASTEEL Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "TATASTEEL: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "UBS Global Research published updated institutional market intelligence on TATASTEEL. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATASTEEL",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_233",
    "sequence": 233,
    "scheduledTime": "12:25",
    "triggerMinute": 205,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: M&M Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "M&M: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Nomura Equities published updated institutional market intelligence on M&M. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "M&M",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_234",
    "sequence": 234,
    "scheduledTime": "12:27",
    "triggerMinute": 207,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: BAJFINANCE Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "BAJFINANCE: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "HSBC Global Research published updated institutional market intelligence on BAJFINANCE. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJFINANCE",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_235",
    "sequence": 235,
    "scheduledTime": "12:29",
    "triggerMinute": 209,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: SUNPHARMA Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "SUNPHARMA: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Macquarie Capital published updated institutional market intelligence on SUNPHARMA. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SUNPHARMA",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_236",
    "sequence": 236,
    "scheduledTime": "12:31",
    "triggerMinute": 211,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: ASIANPAINT Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "ASIANPAINT: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on ASIANPAINT. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ASIANPAINT",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_237",
    "sequence": 237,
    "scheduledTime": "12:33",
    "triggerMinute": 213,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: AXISBANK Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "AXISBANK: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on AXISBANK. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AXISBANK",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_238",
    "sequence": 238,
    "scheduledTime": "12:35",
    "triggerMinute": 215,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: KOTAKBANK Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "KOTAKBANK: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on KOTAKBANK. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "KOTAKBANK",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_239",
    "sequence": 239,
    "scheduledTime": "12:37",
    "triggerMinute": 217,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: MARUTI Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "MARUTI: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on MARUTI. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MARUTI",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_240",
    "sequence": 240,
    "scheduledTime": "12:39",
    "triggerMinute": 219,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: WIPRO Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "WIPRO: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on WIPRO. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "WIPRO",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_241",
    "sequence": 241,
    "scheduledTime": "12:41",
    "triggerMinute": 221,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: HCLTECH Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "HCLTECH: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on HCLTECH. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HCLTECH",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_242",
    "sequence": 242,
    "scheduledTime": "12:43",
    "triggerMinute": 223,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: ULTRACEMCO Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "ULTRACEMCO: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on ULTRACEMCO. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ULTRACEMCO",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_243",
    "sequence": 243,
    "scheduledTime": "12:45",
    "triggerMinute": 225,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: TITAN Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "TITAN: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Jefferies India published updated institutional market intelligence on TITAN. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TITAN",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_244",
    "sequence": 244,
    "scheduledTime": "12:47",
    "triggerMinute": 227,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: NESTLEIND Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "NESTLEIND: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on NESTLEIND. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NESTLEIND",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_245",
    "sequence": 245,
    "scheduledTime": "12:49",
    "triggerMinute": 229,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: BAJAJFINSV Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "BAJAJFINSV: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "UBS Global Research published updated institutional market intelligence on BAJAJFINSV. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BAJAJFINSV",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_246",
    "sequence": 246,
    "scheduledTime": "12:51",
    "triggerMinute": 231,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: ADANIENT Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "ADANIENT: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Nomura Equities published updated institutional market intelligence on ADANIENT. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ADANIENT",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_247",
    "sequence": 247,
    "scheduledTime": "12:53",
    "triggerMinute": 233,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: ADANIPORTS Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "ADANIPORTS: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "HSBC Global Research published updated institutional market intelligence on ADANIPORTS. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ADANIPORTS",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_248",
    "sequence": 248,
    "scheduledTime": "12:55",
    "triggerMinute": 235,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: POWERGRID Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "POWERGRID: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Macquarie Capital published updated institutional market intelligence on POWERGRID. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "POWERGRID",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_249",
    "sequence": 249,
    "scheduledTime": "12:57",
    "triggerMinute": 237,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: NTPC Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "NTPC: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on NTPC. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NTPC",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_250",
    "sequence": 250,
    "scheduledTime": "12:59",
    "triggerMinute": 239,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: ONGC Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "ONGC: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on ONGC. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ONGC",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_251",
    "sequence": 251,
    "scheduledTime": "13:01",
    "triggerMinute": 241,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: COALINDIA Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "COALINDIA: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on COALINDIA. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "COALINDIA",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_252",
    "sequence": 252,
    "scheduledTime": "13:03",
    "triggerMinute": 243,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: JSWSTEEL Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "JSWSTEEL: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on JSWSTEEL. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JSWSTEEL",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_253",
    "sequence": 253,
    "scheduledTime": "13:05",
    "triggerMinute": 245,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: HINDALCO Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "HINDALCO: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on HINDALCO. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HINDALCO",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_254",
    "sequence": 254,
    "scheduledTime": "13:07",
    "triggerMinute": 247,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: GRASIM Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "GRASIM: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on GRASIM. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GRASIM",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_255",
    "sequence": 255,
    "scheduledTime": "13:09",
    "triggerMinute": 249,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: TECHM Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "TECHM: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on TECHM. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TECHM",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_256",
    "sequence": 256,
    "scheduledTime": "13:11",
    "triggerMinute": 251,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: AAPL Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "AAPL: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Jefferies India published updated institutional market intelligence on AAPL. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AAPL",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_257",
    "sequence": 257,
    "scheduledTime": "13:13",
    "triggerMinute": 253,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: MSFT Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "MSFT: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on MSFT. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MSFT",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_258",
    "sequence": 258,
    "scheduledTime": "13:15",
    "triggerMinute": 255,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: GOOGL Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "GOOGL: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "UBS Global Research published updated institutional market intelligence on GOOGL. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GOOGL",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_259",
    "sequence": 259,
    "scheduledTime": "13:17",
    "triggerMinute": 257,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: AMZN Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "AMZN: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Nomura Equities published updated institutional market intelligence on AMZN. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AMZN",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_260",
    "sequence": 260,
    "scheduledTime": "13:19",
    "triggerMinute": 259,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: NVDA Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "NVDA: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "HSBC Global Research published updated institutional market intelligence on NVDA. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NVDA",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_261",
    "sequence": 261,
    "scheduledTime": "13:21",
    "triggerMinute": 261,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: META Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "META: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Macquarie Capital published updated institutional market intelligence on META. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "META",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_262",
    "sequence": 262,
    "scheduledTime": "13:23",
    "triggerMinute": 263,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: TSLA Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "TSLA: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on TSLA. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TSLA",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_263",
    "sequence": 263,
    "scheduledTime": "13:25",
    "triggerMinute": 265,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: NFLX Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "NFLX: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on NFLX. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "NFLX",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_264",
    "sequence": 264,
    "scheduledTime": "13:27",
    "triggerMinute": 267,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: AMD Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "AMD: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on AMD. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AMD",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_265",
    "sequence": 265,
    "scheduledTime": "13:29",
    "triggerMinute": 269,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: INTC Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "INTC: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on INTC. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "INTC",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_266",
    "sequence": 266,
    "scheduledTime": "13:31",
    "triggerMinute": 271,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: ORCL Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "ORCL: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on ORCL. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ORCL",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_267",
    "sequence": 267,
    "scheduledTime": "13:33",
    "triggerMinute": 273,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: CRM Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "CRM: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on CRM. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "CRM",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_268",
    "sequence": 268,
    "scheduledTime": "13:35",
    "triggerMinute": 275,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: JPM Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "JPM: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on JPM. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JPM",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_269",
    "sequence": 269,
    "scheduledTime": "13:37",
    "triggerMinute": 277,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: V Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "V: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Jefferies India published updated institutional market intelligence on V. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "V",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_270",
    "sequence": 270,
    "scheduledTime": "13:39",
    "triggerMinute": 279,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: MA Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "MA: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on MA. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MA",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_271",
    "sequence": 271,
    "scheduledTime": "13:41",
    "triggerMinute": 281,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: WMT Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "WMT: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "UBS Global Research published updated institutional market intelligence on WMT. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "WMT",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_272",
    "sequence": 272,
    "scheduledTime": "13:43",
    "triggerMinute": 283,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: KO Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "KO: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Nomura Equities published updated institutional market intelligence on KO. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "KO",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_273",
    "sequence": 273,
    "scheduledTime": "13:45",
    "triggerMinute": 285,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: DIS Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "DIS: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "HSBC Global Research published updated institutional market intelligence on DIS. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "DIS",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_274",
    "sequence": 274,
    "scheduledTime": "13:47",
    "triggerMinute": 287,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: BA Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "BA: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Macquarie Capital published updated institutional market intelligence on BA. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BA",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_275",
    "sequence": 275,
    "scheduledTime": "13:49",
    "triggerMinute": 289,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: XOM Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "XOM: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on XOM. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "XOM",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_276",
    "sequence": 276,
    "scheduledTime": "13:51",
    "triggerMinute": 291,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: CVX Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "CVX: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on CVX. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "CVX",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_277",
    "sequence": 277,
    "scheduledTime": "13:53",
    "triggerMinute": 293,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: PG Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "PG: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on PG. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "PG",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_278",
    "sequence": 278,
    "scheduledTime": "13:55",
    "triggerMinute": 295,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: JNJ Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "JNJ: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on JNJ. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "JNJ",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_279",
    "sequence": 279,
    "scheduledTime": "13:57",
    "triggerMinute": 297,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: UNH Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "UNH: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on UNH. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "UNH",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_280",
    "sequence": 280,
    "scheduledTime": "13:59",
    "triggerMinute": 299,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: PFE Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "PFE: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on PFE. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "PFE",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_281",
    "sequence": 281,
    "scheduledTime": "14:01",
    "triggerMinute": 301,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: MRK Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "MRK: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on MRK. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MRK",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_282",
    "sequence": 282,
    "scheduledTime": "14:03",
    "triggerMinute": 303,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: SHEL Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "SHEL: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Jefferies India published updated institutional market intelligence on SHEL. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SHEL",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_283",
    "sequence": 283,
    "scheduledTime": "14:05",
    "triggerMinute": 305,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: BP Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "BP: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on BP. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BP",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_284",
    "sequence": 284,
    "scheduledTime": "14:07",
    "triggerMinute": 307,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: HSBA Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "HSBA: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "UBS Global Research published updated institutional market intelligence on HSBA. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HSBA",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_285",
    "sequence": 285,
    "scheduledTime": "14:09",
    "triggerMinute": 309,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: BARC Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "BARC: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Nomura Equities published updated institutional market intelligence on BARC. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BARC",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_286",
    "sequence": 286,
    "scheduledTime": "14:11",
    "triggerMinute": 311,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: LLOY Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "LLOY: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "HSBC Global Research published updated institutional market intelligence on LLOY. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "LLOY",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_287",
    "sequence": 287,
    "scheduledTime": "14:13",
    "triggerMinute": 313,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: AZN Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "AZN: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "Macquarie Capital published updated institutional market intelligence on AZN. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AZN",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_288",
    "sequence": 288,
    "scheduledTime": "14:15",
    "triggerMinute": 315,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: GSK Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "GSK: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on GSK. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GSK",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_289",
    "sequence": 289,
    "scheduledTime": "14:17",
    "triggerMinute": 317,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: ULVR Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "ULVR: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on ULVR. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ULVR",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_290",
    "sequence": 290,
    "scheduledTime": "14:19",
    "triggerMinute": 319,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: RR Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "RR: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on RR. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RR",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_291",
    "sequence": 291,
    "scheduledTime": "14:21",
    "triggerMinute": 321,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: RIO Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "RIO: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on RIO. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RIO",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_292",
    "sequence": 292,
    "scheduledTime": "14:23",
    "triggerMinute": 323,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: BHP Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "BHP: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on BHP. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BHP",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_293",
    "sequence": 293,
    "scheduledTime": "14:25",
    "triggerMinute": 325,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: GLEN Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "GLEN: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on GLEN. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "GLEN",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_294",
    "sequence": 294,
    "scheduledTime": "14:27",
    "triggerMinute": 327,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: VOD Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "VOD: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on VOD. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "VOD",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_295",
    "sequence": 295,
    "scheduledTime": "14:29",
    "triggerMinute": 329,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: ASML Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "ASML: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Jefferies India published updated institutional market intelligence on ASML. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ASML",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_296",
    "sequence": 296,
    "scheduledTime": "14:31",
    "triggerMinute": 331,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: SAP Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "SAP: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on SAP. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAP",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_297",
    "sequence": 297,
    "scheduledTime": "14:33",
    "triggerMinute": 333,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: SIE Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "SIE: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "UBS Global Research published updated institutional market intelligence on SIE. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SIE",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_298",
    "sequence": 298,
    "scheduledTime": "14:35",
    "triggerMinute": 335,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: BMW Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "BMW: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Nomura Equities published updated institutional market intelligence on BMW. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BMW",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_299",
    "sequence": 299,
    "scheduledTime": "14:37",
    "triggerMinute": 337,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: MBG Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "MBG: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "HSBC Global Research published updated institutional market intelligence on MBG. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MBG",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_300",
    "sequence": 300,
    "scheduledTime": "14:39",
    "triggerMinute": 339,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: VOW3 Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "VOW3: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "Macquarie Capital published updated institutional market intelligence on VOW3. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "VOW3",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_301",
    "sequence": 301,
    "scheduledTime": "14:41",
    "triggerMinute": 341,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: AIR Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "AIR: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on AIR. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "AIR",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_302",
    "sequence": 302,
    "scheduledTime": "14:43",
    "triggerMinute": 343,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: MC Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "MC: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on MC. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "MC",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_303",
    "sequence": 303,
    "scheduledTime": "14:45",
    "triggerMinute": 345,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: OR Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "OR: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on OR. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "OR",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_304",
    "sequence": 304,
    "scheduledTime": "14:47",
    "triggerMinute": 347,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: SAN Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "SAN: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on SAN. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SAN",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_305",
    "sequence": 305,
    "scheduledTime": "14:49",
    "triggerMinute": 349,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: TTE Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "TTE: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on TTE. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TTE",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_306",
    "sequence": 306,
    "scheduledTime": "14:51",
    "triggerMinute": 351,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: BNP Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "BNP: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on BNP. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BNP",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_307",
    "sequence": 307,
    "scheduledTime": "14:53",
    "triggerMinute": 353,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: DTE Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "DTE: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on DTE. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "DTE",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_308",
    "sequence": 308,
    "scheduledTime": "14:55",
    "triggerMinute": 355,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Jefferies India: ALV Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "ALV: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Jefferies India published updated institutional market intelligence on ALV. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ALV",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_309",
    "sequence": 309,
    "scheduledTime": "14:57",
    "triggerMinute": 357,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Citi Global Wealth: RELIANCE Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "RELIANCE: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "Citi Global Wealth published updated institutional market intelligence on RELIANCE. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "RELIANCE",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_310",
    "sequence": 310,
    "scheduledTime": "14:59",
    "triggerMinute": 359,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "UBS Global Research: TCS Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "TCS: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "UBS Global Research published updated institutional market intelligence on TCS. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TCS",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_311",
    "sequence": 311,
    "scheduledTime": "15:01",
    "triggerMinute": 361,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Nomura Equities: HDFCBANK Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "shortHeadline": "HDFCBANK: Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%)",
    "description": "Nomura Equities published updated institutional market intelligence on HDFCBANK. Highlights Strategic Enterprise Expansion in Tier-2 Indian Metros (+2.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HDFCBANK",
        "impactPercent": 2.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_312",
    "sequence": 312,
    "scheduledTime": "15:03",
    "triggerMinute": 363,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "HSBC Global Research: INFY Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "shortHeadline": "INFY: Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%)",
    "description": "HSBC Global Research published updated institutional market intelligence on INFY. Raises FY27 EPS Forecast by 4.5% Following Channel Partner Checks (+2.6%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "INFY",
        "impactPercent": 2.6
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_313",
    "sequence": 313,
    "scheduledTime": "15:05",
    "triggerMinute": 365,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Macquarie Capital: ICICIBANK Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "shortHeadline": "ICICIBANK: Upgrades to OVERWEIGHT with Target Price Revision (+3.2%)",
    "description": "Macquarie Capital published updated institutional market intelligence on ICICIBANK. Upgrades to OVERWEIGHT with Target Price Revision (+3.2%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ICICIBANK",
        "impactPercent": 3.2
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_314",
    "sequence": 314,
    "scheduledTime": "15:07",
    "triggerMinute": 367,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Motilal Oswal Financial Services: BHARTIARTL Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "shortHeadline": "BHARTIARTL: Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%)",
    "description": "Motilal Oswal Financial Services published updated institutional market intelligence on BHARTIARTL. Downgrades to NEUTRAL citing Short-Term Margin Headwinds (-2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "BHARTIARTL",
        "impactPercent": -2.4
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_315",
    "sequence": 315,
    "scheduledTime": "15:09",
    "triggerMinute": 369,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Morgan Stanley Research: SBIN Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "shortHeadline": "SBIN: Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%)",
    "description": "Morgan Stanley Research published updated institutional market intelligence on SBIN. Reports Record High Channel Inventories and Strong Festive Offtake (+2.1%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "SBIN",
        "impactPercent": 2.1
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_316",
    "sequence": 316,
    "scheduledTime": "15:11",
    "triggerMinute": 371,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Goldman Sachs Equity Research: LT Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "shortHeadline": "LT: Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%)",
    "description": "Goldman Sachs Equity Research published updated institutional market intelligence on LT. Observes Minor Supply Chain Lead-Time Expansion in Asian Fabrication Hubs (-1.5%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "LT",
        "impactPercent": -1.5
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_317",
    "sequence": 317,
    "scheduledTime": "15:13",
    "triggerMinute": 373,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "JPMorgan Global Markets: ITC Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "shortHeadline": "ITC: Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%)",
    "description": "JPMorgan Global Markets published updated institutional market intelligence on ITC. Maintains BUY with Conviction List Rating Following Factory Tour (+2.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "ITC",
        "impactPercent": 2.8
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_318",
    "sequence": 318,
    "scheduledTime": "15:15",
    "triggerMinute": 375,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "Kotak Institutional Equities: HINDUNILVR Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "shortHeadline": "HINDUNILVR: Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%)",
    "description": "Kotak Institutional Equities published updated institutional market intelligence on HINDUNILVR. Notes Block Deal Inflow of 1.4 Million Shares via Foreign Custodian (+1.9%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "HINDUNILVR",
        "impactPercent": 1.9
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_319",
    "sequence": 319,
    "scheduledTime": "15:17",
    "triggerMinute": 377,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "ICICI Securities Research: TATAMOTORS Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "shortHeadline": "TATAMOTORS: Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%)",
    "description": "ICICI Securities Research published updated institutional market intelligence on TATAMOTORS. Reiterates OUTPERFORM Highlighting Robust Free Cash Flow Conversion (+2.4%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATAMOTORS",
        "impactPercent": 2.4
      }
    ],
    "marketImpact": "POSITIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  },
  {
    "id": "EVT_320",
    "sequence": 320,
    "scheduledTime": "15:19",
    "triggerMinute": 379,
    "category": "ANALYST",
    "tier": "TIER_3",
    "title": "CLSA Asia-Pacific: TATASTEEL Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "shortHeadline": "TATASTEEL: Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%)",
    "description": "CLSA Asia-Pacific published updated institutional market intelligence on TATASTEEL. Flags Raw Material Inflation Pressures in European Logistics Corridor (-1.8%). Local and international trading desks are adjusting orderbook depth.",
    "affectedCountries": [
      "India",
      "United States",
      "United Kingdom"
    ],
    "affectedExchanges": [
      "NSE",
      "NASDAQ",
      "NYSE",
      "LSE"
    ],
    "affectedCurrencies": [
      "INR",
      "USD",
      "GBP"
    ],
    "affectedSectors": [
      "Equity"
    ],
    "affectedSecurities": [
      {
        "ticker": "TATASTEEL",
        "impactPercent": -1.8
      }
    ],
    "marketImpact": "NEGATIVE",
    "volatilityImpact": "LOW",
    "projectorPriority": false,
    "participantVisible": true,
    "requiresAdminTrigger": false,
    "audioCue": "ticker_tick",
    "storyline": "ANALYST_FEED",
    "bullCommentary": null,
    "bearCommentary": null
  }
];
