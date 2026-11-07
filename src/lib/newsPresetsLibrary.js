/**
 * SAAMX News Presets Library (Standardized ~400 Presets Across 9 Categories)
 * Conforms strictly to the 16-field unified news schema.
 * Generated for Milestone 1 (News Intelligence System).
 */

export const NEWS_PRESET_CATEGORIES = [
  "Corporate earnings",
  "M&A / leadership",
  "IPOs / new listings",
  "Speculation / rumours",
  "Macroeconomics / RBI",
  "Sector developments",
  "Global / geopolitical",
  "Regulatory / SEBI",
  "Commodities / forex / rates"
];

export const NEWS_PRESETS_LIBRARY = [
  {
    "id": "NEWS_EARN_001",
    "headline": "📈 TCS Q1 Earnings: Net Profit Jumps 8.5%, Beats Estimates on Record Margin Expansion",
    "description": "Tata Consultancy Services reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "WIPRO"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_002",
    "headline": "📈 INFY Q2 Earnings: Net Profit Jumps 7.2%, Beats Estimates on Record Margin Expansion",
    "description": "Infosys Limited reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "INFY",
        "TCS",
        "HCLTECH"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_003",
    "headline": "📉 WIPRO Q3 Earnings: Net Profit Drops 6.4%, Misses Street Target as Operating Margins Contract",
    "description": "Wipro Limited reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "WIPRO",
        "TECHM",
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.4,
      "volatilityMultiplier": 1.5,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_004",
    "headline": "📈 HCLTECH Q4 Earnings: Net Profit Jumps 6.8%, Beats Estimates on Record Margin Expansion",
    "description": "HCL Technologies reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "HCLTECH",
        "TCS",
        "TECHM"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_005",
    "headline": "📉 TECHM Q1 Earnings: Net Profit Drops 7.5%, Misses Street Target as Operating Margins Contract",
    "description": "Tech Mahindra reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "TECHM",
        "WIPRO",
        "HCLTECH"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -7.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_006",
    "headline": "📉 TCS Q2 Earnings: Net Profit Drops 4.8%, Misses Street Target as Operating Margins Contract",
    "description": "Tata Consultancy Services reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.8,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_007",
    "headline": "📉 INFY Q3 Earnings: Net Profit Drops 5.9%, Misses Street Target as Operating Margins Contract",
    "description": "Infosys Limited reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.9,
    "affectedAssets": {
      "securities": [
        "INFY",
        "TCS"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.9,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_008",
    "headline": "📈 WIPRO Q4 Earnings: Net Profit Jumps 5.5%, Beats Estimates on Record Margin Expansion",
    "description": "Wipro Limited reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "WIPRO",
        "TECHM"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_009",
    "headline": "📈 HCLTECH Q1 Earnings: Net Profit Jumps 7.8%, Beats Estimates on Record Margin Expansion",
    "description": "HCL Technologies reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "HCLTECH",
        "TCS"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_010",
    "headline": "📈 TECHM Q2 Earnings: Net Profit Jumps 8.2%, Beats Estimates on Record Margin Expansion",
    "description": "Tech Mahindra reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "TECHM",
        "WIPRO"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_011",
    "headline": "📈 HDFCBANK Q3 Earnings: Net Profit Jumps 6.5%, Beats Estimates on Record Margin Expansion",
    "description": "HDFC Bank reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "ICICIBANK",
        "KOTAKBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_012",
    "headline": "📈 ICICIBANK Q4 Earnings: Net Profit Jumps 8%, Beats Estimates on Record Margin Expansion",
    "description": "ICICI Bank reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "ICICIBANK",
        "HDFCBANK",
        "AXISBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_013",
    "headline": "📈 SBIN Q1 Earnings: Net Profit Jumps 9.2%, Beats Estimates on Record Margin Expansion",
    "description": "State Bank of India reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9.2,
    "affectedAssets": {
      "securities": [
        "SBIN",
        "HDFCBANK",
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9.2,
      "volatilityMultiplier": 1.5,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_014",
    "headline": "📉 KOTAKBANK Q2 Earnings: Net Profit Drops 5.2%, Misses Street Target as Operating Margins Contract",
    "description": "Kotak Mahindra Bank reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "KOTAKBANK",
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.2,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_015",
    "headline": "📈 AXISBANK Q3 Earnings: Net Profit Jumps 7.4%, Beats Estimates on Record Margin Expansion",
    "description": "Axis Bank reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.4,
    "affectedAssets": {
      "securities": [
        "AXISBANK",
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_016",
    "headline": "📈 BAJFINANCE Q4 Earnings: Net Profit Jumps 10.5%, Beats Estimates on Record Margin Expansion",
    "description": "Bajaj Finance reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 10.5,
    "affectedAssets": {
      "securities": [
        "BAJFINANCE",
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_017",
    "headline": "📉 HDFCBANK Q1 Earnings: Net Profit Drops 6%, Misses Street Target as Operating Margins Contract",
    "description": "HDFC Bank reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_018",
    "headline": "📉 ICICIBANK Q2 Earnings: Net Profit Drops 4.5%, Misses Street Target as Operating Margins Contract",
    "description": "ICICI Bank reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "ICICIBANK",
        "AXISBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.5,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_019",
    "headline": "📉 SBIN Q3 Earnings: Net Profit Drops 6.8%, Misses Street Target as Operating Margins Contract",
    "description": "State Bank of India reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "SBIN",
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_020",
    "headline": "📈 KOTAKBANK Q4 Earnings: Net Profit Jumps 6.2%, Beats Estimates on Record Margin Expansion",
    "description": "Kotak Mahindra Bank reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "KOTAKBANK",
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_021",
    "headline": "📉 AXISBANK Q1 Earnings: Net Profit Drops 5.8%, Misses Street Target as Operating Margins Contract",
    "description": "Axis Bank reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "AXISBANK",
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_022",
    "headline": "📉 BAJFINANCE Q2 Earnings: Net Profit Drops 8.4%, Misses Street Target as Operating Margins Contract",
    "description": "Bajaj Finance reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "BAJFINANCE",
        "KOTAKBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -8.4,
      "volatilityMultiplier": 1.5,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_023",
    "headline": "📈 RELIANCE Q3 Earnings: Net Profit Jumps 7.5%, Beats Estimates on Record Margin Expansion",
    "description": "Reliance Industries reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ONGC",
        "NTPC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_024",
    "headline": "📈 ONGC Q4 Earnings: Net Profit Jumps 8.8%, Beats Estimates on Record Margin Expansion",
    "description": "Oil & Natural Gas Corp reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_025",
    "headline": "📈 NTPC Q1 Earnings: Net Profit Jumps 6.2%, Beats Estimates on Record Margin Expansion",
    "description": "NTPC Limited reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "NTPC",
        "POWERGRID"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_026",
    "headline": "📈 POWERGRID Q2 Earnings: Net Profit Jumps 5.4%, Beats Estimates on Record Margin Expansion",
    "description": "Power Grid Corporation reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "POWERGRID",
        "NTPC"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.4,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_027",
    "headline": "📈 COALINDIA Q3 Earnings: Net Profit Jumps 7%, Beats Estimates on Record Margin Expansion",
    "description": "Coal India Limited reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "COALINDIA",
        "NTPC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_028",
    "headline": "📉 RELIANCE Q4 Earnings: Net Profit Drops 5.5%, Misses Street Target as Operating Margins Contract",
    "description": "Reliance Industries reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ONGC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_029",
    "headline": "📉 ONGC Q1 Earnings: Net Profit Drops 7.2%, Misses Street Target as Operating Margins Contract",
    "description": "Oil & Natural Gas Corp reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -7.2,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_030",
    "headline": "📉 POWERGRID Q2 Earnings: Net Profit Drops 4.2%, Misses Street Target as Operating Margins Contract",
    "description": "Power Grid Corporation reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "POWERGRID",
        "NTPC"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.2,
      "volatilityMultiplier": 1.1,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_031",
    "headline": "📈 TATAMOTORS Q3 Earnings: Net Profit Jumps 9.8%, Beats Estimates on Record Margin Expansion",
    "description": "Tata Motors reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9.8,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "MARUTI",
        "M&M"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9.8,
      "volatilityMultiplier": 1.5,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_032",
    "headline": "📈 MARUTI Q4 Earnings: Net Profit Jumps 6.5%, Beats Estimates on Record Margin Expansion",
    "description": "Maruti Suzuki India reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "MARUTI",
        "TATAMOTORS"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_033",
    "headline": "📈 M&M Q1 Earnings: Net Profit Jumps 8.4%, Beats Estimates on Record Margin Expansion",
    "description": "Mahindra & Mahindra reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "M&M",
        "TATAMOTORS",
        "BAJAJ-AUTO"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.4,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_034",
    "headline": "📈 BAJAJ-AUTO Q2 Earnings: Net Profit Jumps 7%, Beats Estimates on Record Margin Expansion",
    "description": "Bajaj Auto reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "BAJAJ-AUTO",
        "EICHERMOT"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_035",
    "headline": "📈 EICHERMOT Q3 Earnings: Net Profit Jumps 6.2%, Beats Estimates on Record Margin Expansion",
    "description": "Eicher Motors reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "EICHERMOT",
        "BAJAJ-AUTO"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_036",
    "headline": "📉 TATAMOTORS Q4 Earnings: Net Profit Drops 8%, Misses Street Target as Operating Margins Contract",
    "description": "Tata Motors reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "MARUTI"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -8,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_037",
    "headline": "📉 MARUTI Q1 Earnings: Net Profit Drops 5.4%, Misses Street Target as Operating Margins Contract",
    "description": "Maruti Suzuki India reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "MARUTI",
        "M&M"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.4,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_038",
    "headline": "📉 M&M Q2 Earnings: Net Profit Drops 6.5%, Misses Street Target as Operating Margins Contract",
    "description": "Mahindra & Mahindra reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "M&M",
        "TATAMOTORS"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_039",
    "headline": "📈 ITC Q3 Earnings: Net Profit Jumps 5.8%, Beats Estimates on Record Margin Expansion",
    "description": "ITC Limited reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "ITC",
        "HINDUNILVR",
        "NESTLEIND"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_040",
    "headline": "📈 HINDUNILVR Q4 Earnings: Net Profit Jumps 5.2%, Beats Estimates on Record Margin Expansion",
    "description": "Hindustan Unilever reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "HINDUNILVR",
        "ITC",
        "BRITANNIA"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_041",
    "headline": "📉 NESTLEIND Q1 Earnings: Net Profit Drops 4.8%, Misses Street Target as Operating Margins Contract",
    "description": "Nestle India reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "NESTLEIND",
        "BRITANNIA"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.8,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_042",
    "headline": "📈 BRITANNIA Q2 Earnings: Net Profit Jumps 6.4%, Beats Estimates on Record Margin Expansion",
    "description": "Britannia Industries reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "BRITANNIA",
        "NESTLEIND"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_043",
    "headline": "📈 TITAN Q3 Earnings: Net Profit Jumps 8.6%, Beats Estimates on Record Margin Expansion",
    "description": "Titan Company reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.6,
    "affectedAssets": {
      "securities": [
        "TITAN",
        "ASIANPAINT"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.6,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_044",
    "headline": "📉 ASIANPAINT Q4 Earnings: Net Profit Drops 7.5%, Misses Street Target as Operating Margins Contract",
    "description": "Asian Paints reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "ASIANPAINT",
        "TITAN"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -7.5,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_045",
    "headline": "📉 ITC Q1 Earnings: Net Profit Drops 4.2%, Misses Street Target as Operating Margins Contract",
    "description": "ITC Limited reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "ITC",
        "HINDUNILVR"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.2,
      "volatilityMultiplier": 1.1,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_046",
    "headline": "📉 HINDUNILVR Q2 Earnings: Net Profit Drops 5%, Misses Street Target as Operating Margins Contract",
    "description": "Hindustan Unilever reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HINDUNILVR",
        "ITC"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5,
      "volatilityMultiplier": 1.2,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_047",
    "headline": "📈 SUNPHARMA Q3 Earnings: Net Profit Jumps 7.8%, Beats Estimates on Record Margin Expansion",
    "description": "Sun Pharma reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "DRREDDY",
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_048",
    "headline": "📈 DRREDDY Q4 Earnings: Net Profit Jumps 8.2%, Beats Estimates on Record Margin Expansion",
    "description": "Dr. Reddy Laboratories reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "DRREDDY",
        "SUNPHARMA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_049",
    "headline": "📉 CIPLA Q1 Earnings: Net Profit Drops 5.6%, Misses Street Target as Operating Margins Contract",
    "description": "Cipla Limited reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.6,
    "affectedAssets": {
      "securities": [
        "CIPLA",
        "SUNPHARMA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.6,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_050",
    "headline": "📈 DIVISLAB Q2 Earnings: Net Profit Jumps 9%, Beats Estimates on Record Margin Expansion",
    "description": "Divi Laboratories reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "DIVISLAB",
        "APOLLOHOSP"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.5,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_051",
    "headline": "📈 APOLLOHOSP Q3 Earnings: Net Profit Jumps 7.5%, Beats Estimates on Record Margin Expansion",
    "description": "Apollo Hospitals reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "APOLLOHOSP",
        "DIVISLAB"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_052",
    "headline": "📉 SUNPHARMA Q4 Earnings: Net Profit Drops 6.2%, Misses Street Target as Operating Margins Contract",
    "description": "Sun Pharma reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "DRREDDY"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_053",
    "headline": "📉 DRREDDY Q1 Earnings: Net Profit Drops 7%, Misses Street Target as Operating Margins Contract",
    "description": "Dr. Reddy Laboratories reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "DRREDDY",
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_054",
    "headline": "📈 LT Q2 Earnings: Net Profit Jumps 8.8%, Beats Estimates on Record Margin Expansion",
    "description": "Larsen & Toubro reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.8,
    "affectedAssets": {
      "securities": [
        "LT",
        "ADANIPORTS",
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_055",
    "headline": "📈 ADANIPORTS Q3 Earnings: Net Profit Jumps 7.6%, Beats Estimates on Record Margin Expansion",
    "description": "Adani Ports & SEZ reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.6,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS",
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_056",
    "headline": "📉 TATASTEEL Q4 Earnings: Net Profit Drops 8.2%, Misses Street Target as Operating Margins Contract",
    "description": "Tata Steel reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "TATASTEEL",
        "JSWSTEEL",
        "HINDALCO"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -8.2,
      "volatilityMultiplier": 1.5,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_057",
    "headline": "📈 JSWSTEEL Q1 Earnings: Net Profit Jumps 6.8%, Beats Estimates on Record Margin Expansion",
    "description": "JSW Steel reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "JSWSTEEL",
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_058",
    "headline": "📈 HINDALCO Q2 Earnings: Net Profit Jumps 7.4%, Beats Estimates on Record Margin Expansion",
    "description": "Hindalco Industries reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.4,
    "affectedAssets": {
      "securities": [
        "HINDALCO",
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_059",
    "headline": "📈 ULTRACEMCO Q3 Earnings: Net Profit Jumps 6%, Beats Estimates on Record Margin Expansion",
    "description": "UltraTech Cement reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ULTRACEMCO",
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.2,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_060",
    "headline": "📉 LT Q4 Earnings: Net Profit Drops 5.8%, Misses Street Target as Operating Margins Contract",
    "description": "Larsen & Toubro reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "LT",
        "ADANIPORTS"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_061",
    "headline": "📈 AAPL Q1 Earnings: Net Profit Jumps 6.4%, Beats Estimates on Record Margin Expansion",
    "description": "Apple Inc. reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "AAPL",
        "MSFT",
        "GOOGL"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_EARN_062",
    "headline": "📈 MSFT Q2 Earnings: Net Profit Jumps 7.8%, Beats Estimates on Record Margin Expansion",
    "description": "Microsoft Corporation reports its Q2 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q2_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "MSFT",
        "AAPL",
        "NVDA"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_063",
    "headline": "📈 NVDA Q3 Earnings: Net Profit Jumps 12.5%, Beats Estimates on Record Margin Expansion",
    "description": "NVIDIA Corporation reports its Q3 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q3_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 12.5,
    "affectedAssets": {
      "securities": [
        "NVDA",
        "MSFT",
        "AAPL"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 12.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_064",
    "headline": "📉 GOOGL Q4 Earnings: Net Profit Drops 6.8%, Misses Street Target as Operating Margins Contract",
    "description": "Alphabet Inc. reports its Q4 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin shrank by 210 bps due to input cost pressures and softer discretionary demand. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q4_RESULTS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "GOOGL",
        "MSFT"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_MISS",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_EARN_065",
    "headline": "📈 AMZN Q1 Earnings: Net Profit Jumps 8.2%, Beats Estimates on Record Margin Expansion",
    "description": "Amazon.com Inc. reports its Q1 financial results. Total consolidated revenue stood at seasonal expectations, while operating EBITDA margin expanded by 180 bps due to robust operational leverage and order inflows. Institutional desks adjust target valuation models.",
    "category": "Corporate earnings",
    "subcategory": "Q1_RESULTS",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "AMZN",
        "GOOGL"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "EARNINGS_BEAT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 35,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_001",
    "headline": "🤝 Reliance Retail Acquires 12.5% Strategic Stake in Consumer Distribution Consortium",
    "description": "Reliance Retail Acquires 12.5% Strategic Stake in Consumer Distribution Consortium. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "STRATEGIC_STAKE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ITC"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_002",
    "headline": "🤝 Tata Motors & Mahindra Form Landmark EV Battery Pack Joint Production Venture",
    "description": "Tata Motors & Mahindra Form Landmark EV Battery Pack Joint Production Venture. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "BATTERY_JV",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "M&M"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_003",
    "headline": "🤝 HDFC Bank Completes Integration of Rural Lending Fintech Book Worth ₹8,500 Cr",
    "description": "HDFC Bank Completes Integration of Rural Lending Fintech Book Worth ₹8,500 Cr. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "FINTECH_MERGER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "BAJFINANCE"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_004",
    "headline": "🤝 TCS Leads Multi-Vendor Sovereign Digital Infrastructure Consortium Deal",
    "description": "TCS Leads Multi-Vendor Sovereign Digital Infrastructure Consortium Deal. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CONSORTIUM_BID",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "WIPRO"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_005",
    "headline": "🤝 Larsen & Toubro and Adani Ports Ink ₹14,000 Cr Maritime Rail Freight Alliance",
    "description": "Larsen & Toubro and Adani Ports Ink ₹14,000 Cr Maritime Rail Freight Alliance. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "PORT_CORRIDOR",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "LT",
        "ADANIPORTS"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_006",
    "headline": "🤝 Sun Pharma Licenses Global Biosimilar Oncology Portfolio for Emerging Markets",
    "description": "Sun Pharma Licenses Global Biosimilar Oncology Portfolio for Emerging Markets. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "ONCOLOGY_LICENSING",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "CIPLA"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_007",
    "headline": "🤝 NTPC and Power Grid Jointly Float 10 GW Interstate Green Energy Transmission Unit",
    "description": "NTPC and Power Grid Jointly Float 10 GW Interstate Green Energy Transmission Unit. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "GREEN_GRID_JV",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "NTPC",
        "POWERGRID"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_008",
    "headline": "🤝 Titan Finalizes Acquisition of Premium Home Decor Retail Brand Network",
    "description": "Titan Finalizes Acquisition of Premium Home Decor Retail Brand Network. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "LIFESTYLE_RETAIL",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "TITAN",
        "ASIANPAINT"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_009",
    "headline": "🤝 Reliance Inks Definitive Agreement to Buy North Sea Deepwater Production Asset",
    "description": "Reliance Inks Definitive Agreement to Buy North Sea Deepwater Production Asset. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "OVERSEAS_ASSETS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ONGC"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_010",
    "headline": "🤝 Infosys Finalizes $1.4B Purchase of Silicon Valley Enterprise AI Studio",
    "description": "Infosys Finalizes $1.4B Purchase of Silicon Valley Enterprise AI Studio. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "US_ACQUISITION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.4,
    "affectedAssets": {
      "securities": [
        "INFY",
        "TCS"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_011",
    "headline": "🤝 Dr. Reddy Laboratories Acquires German Sterile Injectables Manufacturing Plant",
    "description": "Dr. Reddy Laboratories Acquires German Sterile Injectables Manufacturing Plant. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "EU_PHARMA_BUY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "DRREDDY",
        "SUNPHARMA"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_012",
    "headline": "🤝 Tata Steel Secures UK Sovereign Grant for Low-Carbon Arc Furnace Transition",
    "description": "Tata Steel Secures UK Sovereign Grant for Low-Carbon Arc Furnace Transition. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "UK_RESTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "TATASTEEL",
        "JSWSTEEL"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_013",
    "headline": "🤝 Maruti Suzuki Commissioning Dedicated 250,000 Unit Export Terminal in Western Port",
    "description": "Maruti Suzuki Commissioning Dedicated 250,000 Unit Export Terminal in Western Port. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "GLOBAL_EXPORT_HUB",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "MARUTI",
        "TATAMOTORS"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_014",
    "headline": "🤝 Bajaj Auto Consolidates Majority Stake in Brazilian Assembly Subsidiary",
    "description": "Bajaj Auto Consolidates Majority Stake in Brazilian Assembly Subsidiary. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "LATAM_TAKEOVER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "BAJAJ-AUTO",
        "EICHERMOT"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_015",
    "headline": "🤝 Global Consumer Consortium Rumoured Drafting Unsolicited Cash Offer for ITC FMCG Unit",
    "description": "Global Consumer Consortium Rumoured Drafting Unsolicited Cash Offer for ITC FMCG Unit. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "HOSTILE_BID",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 11.2,
    "affectedAssets": {
      "securities": [
        "ITC",
        "HINDUNILVR"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 11.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_016",
    "headline": "🤝 Vodafone Idea Debt-Equity Conversion Hits Stiff Bondholder Resistance in Mumbai",
    "description": "Vodafone Idea Debt-Equity Conversion Hits Stiff Bondholder Resistance in Mumbai. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "DEBT_RESTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 9.5,
    "affectedAssets": {
      "securities": [
        "IDEA",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -9.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_017",
    "headline": "🤝 Activist Hedge Fund Files Resolution Seeking Complete Board Dismissal at Delta AI",
    "description": "Activist Hedge Fund Files Resolution Seeking Complete Board Dismissal at Delta AI. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "ACTIVIST_BOARD",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 12,
    "affectedAssets": {
      "securities": [
        "DTAI",
        "TECHM"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -12,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_018",
    "headline": "🤝 Wipro Board Approves Staggered Rights Issue to Counter Unfriendly Block Accumulation",
    "description": "Wipro Board Approves Staggered Rights Issue to Counter Unfriendly Block Accumulation. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "TAKEOVER_DEFENSE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "WIPRO",
        "INFY"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_019",
    "headline": "🤝 Adani Ports Wins Contested Legal Battle Over Major Deep-Water Terminal Concession",
    "description": "Adani Ports Wins Contested Legal Battle Over Major Deep-Water Terminal Concession. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CONTESTED_CONCESSION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS",
        "LT"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_020",
    "headline": "🤝 Infosys Board Unanimously Appoints Global Cloud Veteran as Next Managing Director & CEO",
    "description": "Infosys Board Unanimously Appoints Global Cloud Veteran as Next Managing Director & CEO. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CEO_APPOINTMENT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "INFY",
        "TCS"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_021",
    "headline": "🤝 HDFC Bank Announces Smooth Board Chairmanship Succession Ahead of Five-Year Growth Phase",
    "description": "HDFC Bank Announces Smooth Board Chairmanship Succession Ahead of Five-Year Growth Phase. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CHAIRMAN_SUCCESSION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_022",
    "headline": "🤝 ICICI Bank Executive Director Steps Down to Pursue Venture Opportunities in AI Finance",
    "description": "ICICI Bank Executive Director Steps Down to Pursue Venture Opportunities in AI Finance. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "KEY_EXEC_EXIT",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "ICICIBANK",
        "AXISBANK"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.4,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_023",
    "headline": "🤝 Tata Motors Appoints Former Formula-1 Powertrain Chief to Lead Global EV Engineering",
    "description": "Tata Motors Appoints Former Formula-1 Powertrain Chief to Lead Global EV Engineering. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CTO_HIRE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "MARUTI"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_024",
    "headline": "🤝 Government Formally Approves Elevation of Senior Banker as SBI Managing Director",
    "description": "Government Formally Approves Elevation of Senior Banker as SBI Managing Director. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "MANAGING_DIR_ELEVATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "SBIN",
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_025",
    "headline": "🤝 Cipla Founding Family Unveils Professional Management Charter and Succession Roadmap",
    "description": "Cipla Founding Family Unveils Professional Management Charter and Succession Roadmap. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "PROMOTER_SUCCESSION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "CIPLA",
        "DRREDDY"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_026",
    "headline": "🤝 ITC Names Veteran Hospitality Chief to Lead Newly Demerged ITC Hotels Listing",
    "description": "ITC Names Veteran Hospitality Chief to Lead Newly Demerged ITC Hotels Listing. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "HOTEL_DEMERGER_LEAD",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ITC",
        "NESTLEIND"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_027",
    "headline": "🤝 Delta AI Labs CFO Resigns Abruptly Citing Disagreements Over Revenue Recognition Policies",
    "description": "Delta AI Labs CFO Resigns Abruptly Citing Disagreements Over Revenue Recognition Policies. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "SUDDEN_CFO_EXIT",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 14.2,
    "affectedAssets": {
      "securities": [
        "DTAI",
        "WIPRO"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -14.2,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_028",
    "headline": "🤝 Reliance Fixes Record Date for Multi-Billion Retail & Digital Services Demerger",
    "description": "Reliance Fixes Record Date for Multi-Billion Retail & Digital Services Demerger. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "DEMERGER_RECORD_DATE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ONGC"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_029",
    "headline": "🤝 Tata Motors NCLT Bench Formally Clears Division into Pure Commercial & Passenger EV Firms",
    "description": "Tata Motors NCLT Bench Formally Clears Division into Pure Commercial & Passenger EV Firms. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "CV_PV_DEMERGER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "M&M"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_030",
    "headline": "🤝 Larsen & Toubro Unlocks ₹4,200 Cr Value from Non-Core Engineering Services Carve-Out",
    "description": "Larsen & Toubro Unlocks ₹4,200 Cr Value from Non-Core Engineering Services Carve-Out. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "TECH_SUBSIDIARY_DIVEST",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "LT",
        "TCS"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_031",
    "headline": "🤝 ITC Explores Separate Listing for ₹15,000 Cr Agri-Commodity and Sourcing Infrastructure Unit",
    "description": "ITC Explores Separate Listing for ₹15,000 Cr Agri-Commodity and Sourcing Infrastructure Unit. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "AGRI_BUSINESS_SPINOFF",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.6,
    "affectedAssets": {
      "securities": [
        "ITC",
        "HINDUNILVR"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_032",
    "headline": "🤝 NTPC Green Energy Receives Regulatory Sanction for Landmark ₹10,000 Cr Spinoff IPO",
    "description": "NTPC Green Energy Receives Regulatory Sanction for Landmark ₹10,000 Cr Spinoff IPO. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "GREEN_ENERGY_LISTING",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "NTPC",
        "POWERGRID"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_033",
    "headline": "🤝 Tata Steel and JSW Form Shared Iron Ore Coastal Barging Consortium to Reduce Logistics Costs",
    "description": "Tata Steel and JSW Form Shared Iron Ore Coastal Barging Consortium to Reduce Logistics Costs. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "MINING_LOGISTICS_JV",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "TATASTEEL",
        "JSWSTEEL"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MNA_034",
    "headline": "🤝 Asian Paints Signs Exclusive Retail Licensing Tie-Up with European Architectural Surfaces Leader",
    "description": "Asian Paints Signs Exclusive Retail Licensing Tie-Up with European Architectural Surfaces Leader. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "LUXURY_COATINGS_ALLIANCE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.6,
    "affectedAssets": {
      "securities": [
        "ASIANPAINT",
        "TITAN"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MNA_035",
    "headline": "🤝 Sun Pharma and Divi Laboratories Commission Joint Active Pharmaceutical Ingredient Facility",
    "description": "Sun Pharma and Divi Laboratories Commission Joint Active Pharmaceutical Ingredient Facility. Corporate management and investment banking advisors confirm that formal documentation has been filed with exchange surveillance desks. The transaction is projected to alter balance sheet composition and operating earnings per share over the medium term.",
    "category": "M&A / leadership",
    "subcategory": "ACTIVE_INGREDIENT_JV",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "DIVISLAB"
      ],
      "sectors": [
        "Financial Services",
        "Technology",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MNA_TRANSACTION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 500000
    },
    "duration": 45,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_001",
    "headline": "🚀 OpenAI Global Hyperscale (OAI) Files Formal Dual-Listing DRHP Seeking $12B Compute Capital",
    "description": "OpenAI Global Hyperscale (OAI) Files Formal Dual-Listing DRHP Seeking $12B Compute Capital. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DRHP",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DRHP",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_002",
    "headline": "🚀 IPO Rumour: Sovereign Wealth Funds Lead Syndicate Overbidding for OpenAI Anchor Allocation",
    "description": "IPO Rumour: Sovereign Wealth Funds Lead Syndicate Overbidding for OpenAI Anchor Allocation. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_RUMOUR",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_003",
    "headline": "🚀 Market Speculation: Analysts Debate $150B Secondary Market Valuation Multiples for OAI",
    "description": "Market Speculation: Analysts Debate $150B Secondary Market Valuation Multiples for OAI. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SPECULATION",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SPECULATION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_004",
    "headline": "🚀 SEBI and US SEC Greenlight Landmark OpenAI Initial Public Offering at $180 Offer Price",
    "description": "SEBI and US SEC Greenlight Landmark OpenAI Initial Public Offering at $180 Offer Price. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 12,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 12,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_005",
    "headline": "🚀 Primary Bookbuilding Open: Institutional & Retail Tranches Live for OpenAI (OAI) Bidding",
    "description": "Primary Bookbuilding Open: Institutional & Retail Tranches Live for OpenAI (OAI) Bidding. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 14,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 14,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_006",
    "headline": "🚀 OpenAI IPO Finalized: 4.8x Oversubscription Drives Pro-Rata Share Allotment and Refunds",
    "description": "OpenAI IPO Finalized: 4.8x Oversubscription Drives Pro-Rata Share Allotment and Refunds. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ALLOTMENT",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 18,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ALLOTMENT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 18,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_007",
    "headline": "🚀 OpenAI Lists on SAAMX Trading Floor: Opening Trade Prints at $237.60 (+32% Listing Pop)",
    "description": "OpenAI Lists on SAAMX Trading Floor: Opening Trade Prints at $237.60 (+32% Listing Pop). The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 32,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 32,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_008",
    "headline": "🚀 Fintech Flagship Stripe (STRP) Submits Draft Prospectus for $6B Cross-Border Public Listing",
    "description": "Fintech Flagship Stripe (STRP) Submits Draft Prospectus for $6B Cross-Border Public Listing. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DRHP",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DRHP",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_009",
    "headline": "🚀 Whispers from Wall Street Suggest Visa and Mastercard Anchoring Substantial STRP Allocation",
    "description": "Whispers from Wall Street Suggest Visa and Mastercard Anchoring Substantial STRP Allocation. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_RUMOUR",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_010",
    "headline": "🚀 Investment Banking Desks Model 22% Margin Expansion on Stripe Global Payment Rails",
    "description": "Investment Banking Desks Model 22% Margin Expansion on Stripe Global Payment Rails. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SPECULATION",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SPECULATION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_011",
    "headline": "🚀 Stripe IPO Formally Scheduled: Price Band Set at $92 to $95 per Share with T+2 Listing",
    "description": "Stripe IPO Formally Scheduled: Price Band Set at $92 to $95 per Share with T+2 Listing. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_012",
    "headline": "🚀 Stripe Subscription Window Now Open: Multi-Currency Payment Giant Sees High Day-1 Demand",
    "description": "Stripe Subscription Window Now Open: Multi-Currency Payment Giant Sees High Day-1 Demand. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 11,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 11,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_013",
    "headline": "🚀 Stripe Share Allotment Completed: Pro-Rata Ratio Finalized; Unallotted Cash Balances Restored",
    "description": "Stripe Share Allotment Completed: Pro-Rata Ratio Finalized; Unallotted Cash Balances Restored. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ALLOTMENT",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 13,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ALLOTMENT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 13,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_014",
    "headline": "🚀 Stripe Rings Opening Bell: Secondary Trades Kick Off at $106.40 (+12% Listing Gain)",
    "description": "Stripe Rings Opening Bell: Secondary Trades Kick Off at $106.40 (+12% Listing Gain). The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 15,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 15,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_015",
    "headline": "🚀 Creative Software SaaS Unicorn Canva (CNVA) Submits Formal Listing Application",
    "description": "Creative Software SaaS Unicorn Canva (CNVA) Submits Formal Listing Application. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DRHP",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DRHP",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_016",
    "headline": "🚀 Fund Managers Weigh Canva Enterprise Growth Metrics Against Legacy Creative Suites",
    "description": "Fund Managers Weigh Canva Enterprise Growth Metrics Against Legacy Creative Suites. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SPECULATION",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SPECULATION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_017",
    "headline": "🚀 Canva IPO Pricing Declared: $62 Per Share Offer Price Approved by Global Syndicate",
    "description": "Canva IPO Pricing Declared: $62 Per Share Offer Price Approved by Global Syndicate. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_018",
    "headline": "🚀 Canva Public Bidding Begins: Creative Enterprise Platform Receives Robust Digital Order Flow",
    "description": "Canva Public Bidding Begins: Creative Enterprise Platform Receives Robust Digital Order Flow. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_019",
    "headline": "🚀 Canva Pro-Rata Allocation Published: Eligible Participants Receive Shares in Demat Wallets",
    "description": "Canva Pro-Rata Allocation Published: Eligible Participants Receive Shares in Demat Wallets. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ALLOTMENT",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 12,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ALLOTMENT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 12,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_020",
    "headline": "🚀 Canva Commands Strong Premium: Stock Debuts at $74.40 (+20% First-Day Trading Pop)",
    "description": "Canva Commands Strong Premium: Stock Debuts at $74.40 (+20% First-Day Trading Pop). The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 20,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 20,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_021",
    "headline": "🚀 Community Messaging Platform Discord (DISC) Initiates Primary Public Offering Procedures",
    "description": "Community Messaging Platform Discord (DISC) Initiates Primary Public Offering Procedures. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DRHP",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DRHP",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_022",
    "headline": "🚀 Floor Speculation: Gaming Publisher Consortia Aiming for Cornerstone Stake in Discord",
    "description": "Floor Speculation: Gaming Publisher Consortia Aiming for Cornerstone Stake in Discord. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_RUMOUR",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_023",
    "headline": "🚀 Discord Offer Document Finalized: Fixed Price of $48 per Share across Institutional Tranches",
    "description": "Discord Offer Document Finalized: Fixed Price of $48 per Share across Institutional Tranches. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_024",
    "headline": "🚀 Discord IPO Bidding Live: Community Platform Attracts Heavy Retail & Student House Orders",
    "description": "Discord IPO Bidding Live: Community Platform Attracts Heavy Retail & Student House Orders. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_025",
    "headline": "🚀 Discord Allotment Run Complete: Clearing House Executes Systematic Pro-Rata Apportionment",
    "description": "Discord Allotment Run Complete: Clearing House Executes Systematic Pro-Rata Apportionment. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ALLOTMENT",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 10.5,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ALLOTMENT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_026",
    "headline": "🚀 Discord Starts Secondary Market Journey: Opening Quotes Settle at $51.84 (+8% Listing Pop)",
    "description": "Discord Starts Secondary Market Journey: Opening Quotes Settle at $51.84 (+8% Listing Pop). The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "DISC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_027",
    "headline": "🚀 Decentralized Forecasting Engine Polymarket (POLY) Files for Novel Derivatives Public Listing",
    "description": "Decentralized Forecasting Engine Polymarket (POLY) Files for Novel Derivatives Public Listing. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DRHP",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DRHP",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_028",
    "headline": "🚀 Market Analysts Highlight Polymarket Surging Trading Volumes During High-Stakes Macro Cycles",
    "description": "Market Analysts Highlight Polymarket Surging Trading Volumes During High-Stakes Macro Cycles. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SPECULATION",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SPECULATION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_029",
    "headline": "🚀 Polymarket IPO Official Terms Released: $35 per Share with Dual Dollar-Clearing Clearance",
    "description": "Polymarket IPO Official Terms Released: $35 per Share with Dual Dollar-Clearing Clearance. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 11,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 11,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_030",
    "headline": "🚀 Polymarket Bidding Opens on SAAMX: Quantitative Desks Submit Maximum Lot Reservations",
    "description": "Polymarket Bidding Opens on SAAMX: Quantitative Desks Submit Maximum Lot Reservations. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 13,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 13,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_031",
    "headline": "🚀 Polymarket Allotment Verified: Oversubscribed 5.2x with Full Automated Excess Refunds",
    "description": "Polymarket Allotment Verified: Oversubscribed 5.2x with Full Automated Excess Refunds. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ALLOTMENT",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 15,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_ALLOTMENT",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 15,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_032",
    "headline": "🚀 Polymarket Explodes on Listing: First Trades Match at $44.80 (+28% First-Day Trading Pop)",
    "description": "Polymarket Explodes on Listing: First Trades Match at $44.80 (+28% First-Day Trading Pop). The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 28,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 28,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_033",
    "headline": "🚀 Swiggy Sets ₹11,300 Cr Public Issue Price Band at ₹371 to ₹390 per Share",
    "description": "Swiggy Sets ₹11,300 Cr Public Issue Price Band at ₹371 to ₹390 per Share. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "SWIGGY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_034",
    "headline": "🚀 Swiggy Subscription Book Opens: Quick-Commerce Dark Store Unit Attracts High Bids",
    "description": "Swiggy Subscription Book Opens: Quick-Commerce Dark Store Unit Attracts High Bids. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "SUBSCRIPTION_OPEN",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 9.5,
    "affectedAssets": {
      "securities": [
        "SWIGGY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_SUBSCRIPTION_OPEN",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_035",
    "headline": "🚀 Swiggy Debuts on Exchange Floor: Shares Trade at 12% Premium over Upper Offer Band",
    "description": "Swiggy Debuts on Exchange Floor: Shares Trade at 12% Premium over Upper Offer Band. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 12,
    "affectedAssets": {
      "securities": [
        "SWIGGY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 12,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_036",
    "headline": "🚀 Ola Electric Mobility Finalizes Pure EV Two-Wheeler Public Offering Terms",
    "description": "Ola Electric Mobility Finalizes Pure EV Two-Wheeler Public Offering Terms. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "OLA-ELEC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_037",
    "headline": "🚀 Ola Electric Lists Flat, Surges 15% on First Day as Giga-Factory Cell Production Greenlit",
    "description": "Ola Electric Lists Flat, Surges 15% on First Day as Giga-Factory Cell Production Greenlit. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 15,
    "affectedAssets": {
      "securities": [
        "OLA-ELEC"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 15,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_038",
    "headline": "🚀 NSDL Receives SEBI Approval for Landmark Demat Infrastructure Share Sale",
    "description": "NSDL Receives SEBI Approval for Landmark Demat Infrastructure Share Sale. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "NSDL"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_039",
    "headline": "🚀 NSDL Records Resounding 22% Listing Gain on Unprecedented Institutional Demand",
    "description": "NSDL Records Resounding 22% Listing Gain on Unprecedented Institutional Demand. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 22,
    "affectedAssets": {
      "securities": [
        "NSDL"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 22,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_040",
    "headline": "🚀 Ather Energy Files Red Herring Document for ₹3,100 Cr Factory Expansion Issue",
    "description": "Ather Energy Files Red Herring Document for ₹3,100 Cr Factory Expansion Issue. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "ANNOUNCED",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "ATHER"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_ANNOUNCED",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_041",
    "headline": "🚀 Ather Energy Shares List at ₹344, Bolstering Clean Mobility Sector Benchmarks",
    "description": "Ather Energy Shares List at ₹344, Bolstering Clean Mobility Sector Benchmarks. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 11,
    "affectedAssets": {
      "securities": [
        "ATHER"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 11,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_042",
    "headline": "🚀 FirstCry Opens at 14.5% Listing Day Premium Following Resilient Multi-City Demand",
    "description": "FirstCry Opens at 14.5% Listing Day Premium Following Resilient Multi-City Demand. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LISTING",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 14.5,
    "affectedAssets": {
      "securities": [
        "FIRSTCRY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "INR",
        "INR"
      ]
    },
    "eventType": "IPO_LISTING",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 14.5,
      "volatilityMultiplier": 2.2,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_043",
    "headline": "🚀 OpenAI 30-Day Anchor Investor Lock-In Window Expires with Modest Institutional Rebalancing",
    "description": "OpenAI 30-Day Anchor Investor Lock-In Window Expires with Modest Institutional Rebalancing. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "LOCKIN_EXPIRY",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_LOCKIN_EXPIRY",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.5,
      "volatilityMultiplier": 1.4,
      "demandShift": -20,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_IPO_044",
    "headline": "🚀 Stripe Fast-Tracked for Early Inclusion into Global Fintech & Cloud Benchmark Indices",
    "description": "Stripe Fast-Tracked for Early Inclusion into Global Fintech & Cloud Benchmark Indices. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "INDEX_INCLUSION",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_INDEX_INCLUSION",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_IPO_045",
    "headline": "🚀 Exchange Approves Commencement of Cash-Settled Futures & Options Contracts on POLY",
    "description": "Exchange Approves Commencement of Cash-Settled Futures & Options Contracts on POLY. The primary market syndicate notes that capital allocations comply with exchange subscription guidelines. Participants are reminded that allotment follows the verified pro-rata engine under clearing house rules.",
    "category": "IPOs / new listings",
    "subcategory": "DERIVATIVES_LAUNCH",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "IPO_DERIVATIVES_LAUNCH",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 50,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_001",
    "headline": "🤫 Market Whispers: Multinational Tobacco Giant Formulating ₹480/Share Cash Bid for ITC",
    "description": "Unverified dealing desk chatter suggests an offshore private equity consortium is accumulating blocks ahead of a hostile takeover bid for ITC Limited. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 11.5,
    "affectedAssets": {
      "securities": [
        "ITC"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": 11.5,
      "volatilityMultiplier": 2.2,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_002",
    "headline": "🛑 ITC Board Formally Denies Hostile Takeover Speculation as Completely Groundless",
    "description": "In an urgent regulatory disclosure to the exchange, the Board of ITC categorically refutes any acquisition approach and confirms no discussions are underway. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 11.5,
    "affectedAssets": {
      "securities": [
        "ITC"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": -11.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_001",
      "reversalFactor": 1,
      "officialClarification": "In an urgent regulatory disclosure to the exchange, the Board of ITC categorically refutes any acquisition approach and confirms no discussions are underway."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_003",
    "headline": "🤫 Offshore Media Report: Aramco In Revived Talks for 25% Stake in Reliance O2C Division",
    "description": "Global wire reports quote anonymous sources claiming Gulf sovereign energy funds are finalizing a multi-billion dollar stake purchase in Reliance oil-to-chemicals. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 9.8,
    "affectedAssets": {
      "securities": [
        "RELIANCE"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": 9.8,
      "volatilityMultiplier": 2.2,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_004",
    "headline": "🛑 Clarification: Reliance Disclaims Media Speculation Concerning Oil-to-Chemicals Stake Sale",
    "description": "Company issues formal statement via corporate secretary: Media reports are speculative and inaccurate; company routinely evaluates growth avenues without definitive agreements. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 9.8,
    "affectedAssets": {
      "securities": [
        "RELIANCE"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": -9.8,
      "volatilityMultiplier": 1.6,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_003",
      "reversalFactor": 1,
      "officialClarification": "Company issues formal statement via corporate secretary: Media reports are speculative and inaccurate; company routinely evaluates growth avenues without definitive agreements."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_005",
    "headline": "🤫 Anonymous Whistleblower Dossier Leaked Alleging Inflated AI Software Billings at Delta AI",
    "description": "Circulating document across social channels claims offshore revenue recognition practices at Delta AI Labs contain fictitious channel inventory padding. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 16,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -16,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_006",
    "headline": "🛑 Statutory Auditors Issue Unconditional Clean Interim Clearance Report for Delta AI Accounts",
    "description": "Independent forensic audit conducted by top tier accounting firm confirms all enterprise billing entries are backed by verified bank remittances and deliverables. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 16,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 16,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_005",
      "reversalFactor": 1,
      "officialClarification": "Independent forensic audit conducted by top tier accounting firm confirms all enterprise billing entries are backed by verified bank remittances and deliverables."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_007",
    "headline": "🤫 Unconfirmed Social Clips Claim Widespread Battery Thermal Runaway in Commercial EV Fleet",
    "description": "Viral video allegations suggest municipal transit authorities are considering grounding entire electric bus fleets following an unexplained battery overheating event. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -8.5,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_008",
    "headline": "🛑 Transport Safety Authority Concludes Battery Incident Was Isolated External Physical Impact",
    "description": "Official technical inspection report reveals battery pack integrity was compromised by roadside metallic debris, clearing manufacturer BMS software and cells. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_007",
      "reversalFactor": 1,
      "officialClarification": "Official technical inspection report reveals battery pack integrity was compromised by roadside metallic debris, clearing manufacturer BMS software and cells."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_009",
    "headline": "🤫 Rumour: RBI Contemplating Heavy Monetary Penalty and Digital Onboarding Curbs on HDFC Bank",
    "description": "Unattributed news blog hints at central bank dissatisfaction regarding weekend core banking digital maintenance outages. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -7.2,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_010",
    "headline": "🛑 RBI Clarification: Routine Supervisory Dialogue Completed with Zero Enforcement Actions",
    "description": "Regulator confirms annual supervisory inspection closed smoothly with no punitive restrictions, onboarding limits, or fines imposed on HDFC Bank. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_009",
      "reversalFactor": 1,
      "officialClarification": "Regulator confirms annual supervisory inspection closed smoothly with no punitive restrictions, onboarding limits, or fines imposed on HDFC Bank."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_011",
    "headline": "🤫 Dealing Room Buzz: European Telecom Conglomerate Scraps $1.5B Transformation Mandate",
    "description": "Traders report heavy aggressive short positioning in Infosys derivatives amid speculation that a flagship European customer has paused vendor spending. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -9,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_012",
    "headline": "🛑 Infosys Reaffirms Active Multi-Year Customer Relationship with Zero Scope Reductions",
    "description": "Enterprise customer and Infosys release joint press release affirming full contractual commitment and continued sprint milestones across all operational hubs. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_011",
      "reversalFactor": 1,
      "officialClarification": "Enterprise customer and Infosys release joint press release affirming full contractual commitment and continued sprint milestones across all operational hubs."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_013",
    "headline": "🤫 Speculation Mounts Over Serious Form 483 Observations at Sun Pharma Halol Injectable Plant",
    "description": "Market rumours suggest US health inspectors issued critical data integrity warnings during unannounced facility reinspection. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 10.5,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -10.5,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_014",
    "headline": "🛑 US FDA Formally Concludes Inspection with Zero Critical Observations (VAI Classification)",
    "description": "Sun Pharma receives formal Establishment Inspection Report (EIR) from US FDA designating inspection status Voluntary Action Indicated without any supply disruptions. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 10.5,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 10.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_013",
      "reversalFactor": 1,
      "officialClarification": "Sun Pharma receives formal Establishment Inspection Report (EIR) from US FDA designating inspection status Voluntary Action Indicated without any supply disruptions."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_015",
    "headline": "🤫 Media Leak Hints GST Council Planning Emergency 10% Rate Cut on Small Hybrid Passenger Cars",
    "description": "Leaked policy memorandum suggests finance ministry is drafting clean fuel incentive package reducing tax burden on entry hybrid vehicles. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "MARUTI"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 2.2,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_016",
    "headline": "🛑 Ministry of Finance Refutes Leaked Note: No Revisions to Automobile GST Tax Slabs Planned",
    "description": "Official spokesperson confirms GST Council agenda contains no rate cuts for hybrid passenger vehicles, maintaining status quo duty framework. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "MARUTI"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": -8.2,
      "volatilityMultiplier": 1.6,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_015",
      "reversalFactor": 1,
      "officialClarification": "Official spokesperson confirms GST Council agenda contains no rate cuts for hybrid passenger vehicles, maintaining status quo duty framework."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_017",
    "headline": "🤫 Rumour: State Government Seeks Cancellation of ₹12,000 Cr Express Freight Corridor Segment",
    "description": "Speculation regarding right-of-way land acquisition disputes triggers rumors that key infrastructure packages awarded to L&T may face cancellation. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -7.8,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_018",
    "headline": "🛑 National High Speed Rail Corp Reaffirms 100% Land Clearances and Accelerated Project Timelines",
    "description": "Authorities confirm project financing and civil construction packages remain fully funded and operational with work progressing on schedule. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_017",
      "reversalFactor": 1,
      "officialClarification": "Authorities confirm project financing and civil construction packages remain fully funded and operational with work progressing on schedule."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_019",
    "headline": "🤫 Rumour: Unanticipated Corporate Steel Default Threatens ₹4,000 Cr Provisioning at SBI",
    "description": "Market whispers suggest a mid-tier infrastructure conglomerate has entered debt standstill, forcing state-run lenders to take steep haircuts. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "SBIN"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_020",
    "headline": "🛑 SBI Management Clarifies: Stressed Account 100% Collateralized with Zero Additional Provisions",
    "description": "Bank leadership assures investors that exposure is ring-fenced with high-quality tangible asset security, ensuring zero slippages in the current quarter. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "SBIN"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_019",
      "reversalFactor": 1,
      "officialClarification": "Bank leadership assures investors that exposure is ring-fenced with high-quality tangible asset security, ensuring zero slippages in the current quarter."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_021",
    "headline": "🤫 Surveillance Chatter: Regulatory Directorate Initiates Inquiry into Port Tariff Concessions",
    "description": "Brokers report aggressive put buying following social media claims of an unannounced regulatory scrutiny notice. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 11,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -11,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_022",
    "headline": "🛑 Statutory Port Regulator Confirms All Terminal Tariffs Comply Fully with Tariff Orders",
    "description": "Regulatory agency confirms operations operate strictly under approved multi-year tariff indexation guidelines, dismissing inquiry claims. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 11,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 11,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_021",
      "reversalFactor": 1,
      "officialClarification": "Regulatory agency confirms operations operate strictly under approved multi-year tariff indexation guidelines, dismissing inquiry claims."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_023",
    "headline": "🤫 Speculation: Promoter Trust Considering Selling 8% Stake to Global Private Equity Group",
    "description": "Chatter across institutional trading desks claims offshore buyouts firm is negotiating large block accumulation in IT services major. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "WIPRO"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 2.2,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_024",
    "headline": "🛑 Wipro Promoter Trust Issues Stern Denial: Long-Term Commitment to Company Unwavering",
    "description": "Promoter entity confirms zero discussions regarding share sale and states intention to remain long-term anchor stewards of Wipro Limited. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "WIPRO"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": -7.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_023",
      "reversalFactor": 1,
      "officialClarification": "Promoter entity confirms zero discussions regarding share sale and states intention to remain long-term anchor stewards of Wipro Limited."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_025",
    "headline": "🤫 European Wire Rumour: Host Government Eyeing Strategic Nationalization of Blast Furnaces",
    "description": "Overseas political rumors suggest sovereign administrators are preparing emergency legislation to take control of heavy industrial steelworks. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -8,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_026",
    "headline": "🛑 Tata Steel Confirms Transition Partnership Agreement with Full Sovereign Grant Funding",
    "description": "UK and European authorities reaffirm collaborative green steel joint funding deal, confirming private corporate governance remains untouched. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_025",
      "reversalFactor": 1,
      "officialClarification": "UK and European authorities reaffirm collaborative green steel joint funding deal, confirming private corporate governance remains untouched."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_027",
    "headline": "🤫 Unverified Report: Anti-Corruption Agency Probing Past Corporate Loan Sanctions at ICICI",
    "description": "Traders dump private banking stocks as unauthenticated documents circulate claiming senior management inquiry. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -8.5,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_028",
    "headline": "🛑 Investigative Agency Dismisses Purported Inquiry Document as Completely Fabricated",
    "description": "Law enforcement and bank compliance verify that document circulating on messaging apps is forged; legal proceedings initiated against bad actors. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "ICICIBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_027",
      "reversalFactor": 1,
      "officialClarification": "Law enforcement and bank compliance verify that document circulating on messaging apps is forged; legal proceedings initiated against bad actors."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_029",
    "headline": "🤫 Whispers: Cyber Unit Discovers Phishing Syndicate Operating Mule Accounts at Axis Bank",
    "description": "Rumours of regulatory audit findings concerning automated digital KYC controls cause selloff in bank shares. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "AXISBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_030",
    "headline": "🛑 Axis Bank Confirms Robust Proactive AI Fraud Detection Stopped Isolated Unauthorized Attempts",
    "description": "Bank clarifies its automated surveillance blocked suspicious activity before any customer funds were compromised; zero material loss reported. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "AXISBANK"
      ],
      "sectors": [
        "Financial Services"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_029",
      "reversalFactor": 1,
      "officialClarification": "Bank clarifies its automated surveillance blocked suspicious activity before any customer funds were compromised; zero material loss reported."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_031",
    "headline": "🤫 Rumour: Competition Commission Imposing Record Anti-Trust Penalty on Cement Producers",
    "description": "Market gossip anticipates severe CCI orders against major building material manufacturers for alleged coordination in freight pricing. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 9.2,
    "affectedAssets": {
      "securities": [
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -9.2,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_032",
    "headline": "🛑 CCI Releases Industry Market Study: Finds Cement Pricing Fully Driven by Market Dynamics",
    "description": "Antitrust authority report concludes regional cement price variations reflect freight fuel costs and monsoon seasonality rather than collusive cartels. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 9.2,
    "affectedAssets": {
      "securities": [
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 9.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_031",
      "reversalFactor": 1,
      "officialClarification": "Antitrust authority report concludes regional cement price variations reflect freight fuel costs and monsoon seasonality rather than collusive cartels."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_033",
    "headline": "🤫 Rumour: Monomer Chemical Supplier Outage Paralyses Asian Paints Primary Manufacturing Plant",
    "description": "Traders fear supply chain bottleneck will choke festive season distribution across northern dealer networks. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ASIANPAINT"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_034",
    "headline": "🛑 Asian Paints Assures Robust Multi-Sourced Raw Material Inventories and Uninterrupted Output",
    "description": "Company management confirms all key production facilities are operating at optimum utilization with multi-month strategic buffer stocks. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ASIANPAINT"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_033",
      "reversalFactor": 1,
      "officialClarification": "Company management confirms all key production facilities are operating at optimum utilization with multi-month strategic buffer stocks."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_035",
    "headline": "🤫 Patent Court Whispers: Generic Rival Wins Early Invalidation of Dr. Reddy Blockbuster Drug",
    "description": "Unverified US court docket extract suggests patent exclusivity on core specialty formulation has been revoked. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8.8,
    "affectedAssets": {
      "securities": [
        "DRREDDY"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -8.8,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_036",
    "headline": "🛑 US District Court Affirms Validity of Dr. Reddy Core Formulation Patent Through 2031",
    "description": "Formal judicial decree published validating patent claims and issuing injunction against generic infringers, protecting company commercial exclusivity. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.8,
    "affectedAssets": {
      "securities": [
        "DRREDDY"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 8.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_035",
      "reversalFactor": 1,
      "officialClarification": "Formal judicial decree published validating patent claims and issuing injunction against generic infringers, protecting company commercial exclusivity."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_037",
    "headline": "🤫 Rumour: Major Offshore Production Rig Suffers Catastrophic Hydrocarbon Leak in KG Basin",
    "description": "Social media posts suggest offshore operations have been evacuated, threatening immediate crude production targets. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "ONGC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -10,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_038",
    "headline": "🛑 ONGC Issues Operational Statement: Offshore Assets Fully Intact, Zero Incidents Occurred",
    "description": "Director of Offshore Operations confirms normal production operations across all western and eastern offshore fields; dismisses rumors. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "ONGC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 10,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_037",
      "reversalFactor": 1,
      "officialClarification": "Director of Offshore Operations confirms normal production operations across all western and eastern offshore fields; dismisses rumors."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_039",
    "headline": "🤫 Rumour: Automotive Testing Agency Mandates Suspension of Chetak Electric Deliveries",
    "description": "Speculation over software glitch in electric two-wheelers creates temporary selling pressure. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "BAJAJ-AUTO"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_040",
    "headline": "🛑 ARAI Issues Compliance Certification: Bajaj Auto Electric Vehicles Meet All Safety Standards",
    "description": "Testing agency confirms all models comply fully with updated AIS-156 safety amendments; zero stop-delivery orders issued. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "BAJAJ-AUTO"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_039",
      "reversalFactor": 1,
      "officialClarification": "Testing agency confirms all models comply fully with updated AIS-156 safety amendments; zero stop-delivery orders issued."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_041",
    "headline": "🤫 Rumour: Finance Ministry Imposing Retroactive Customs Duty on NTPC Solar Inverters",
    "description": "Reports of customs classification disputes create concern over capital expenditure overruns in green energy projects. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "NTPC"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -5.5,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_042",
    "headline": "🛑 Customs Clarification: Solar Power Plant Equipment Retains Grandfathered Concessional Duty",
    "description": "Department of Revenue issues circular affirming grandfathered duty benefits for ongoing public sector solar park contracts. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "NTPC"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_041",
      "reversalFactor": 1,
      "officialClarification": "Department of Revenue issues circular affirming grandfathered duty benefits for ongoing public sector solar park contracts."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_043",
    "headline": "🤫 Trade Union Rumour: Indefinite Multi-Mine Strike Threatens Daily Coal Evacuation",
    "description": "Reports of breakdown in wage negotiations lead to fears of fuel shortages at thermal power stations. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "COALINDIA"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_044",
    "headline": "🛑 Coal India Reaches Amicable Wage Agreement with Recognized National Worker Federations",
    "description": "Management and union leaders sign comprehensive memorandum of understanding; production and dispatch continue at record pace. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "COALINDIA"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_043",
      "reversalFactor": 1,
      "officialClarification": "Management and union leaders sign comprehensive memorandum of understanding; production and dispatch continue at record pace."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_045",
    "headline": "🤫 Rumour: DRI Investigating Bullion Procurement Channels at Leading Jewelry Chain",
    "description": "Unsubstantiated messaging reports create sharp decline in luxury consumer discretionary shares. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "TITAN"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": -8.4,
      "volatilityMultiplier": 2.2,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_046",
    "headline": "🛑 Titan Clarifies: 100% Bullion Procured Through Nominated Banks Under Official RBI Guidelines",
    "description": "Company confirms full adherence to statutory banking channels and gold monetization schemes, refuting involvement in unauthorized supply. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "TITAN"
      ],
      "sectors": [
        "Consumer Durables"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": 8.4,
      "volatilityMultiplier": 1.6,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_045",
      "reversalFactor": 1,
      "officialClarification": "Company confirms full adherence to statutory banking channels and gold monetization schemes, refuting involvement in unauthorized supply."
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_047",
    "headline": "🤫 Rumour: Global Healthcare Private Equity Giant Finalizing ₹38,000 Cr Buyout of Cipla",
    "description": "Brokers report heavy institutional accumulation on rumors of an imminent open offer announcement. Market participants are cautioned that unverified whispers often introduce heightened volatility before statutory confirmation is issued.",
    "category": "Speculation / rumours",
    "subcategory": "MARKET_RUMOUR",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 9.5,
    "affectedAssets": {
      "securities": [
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "rumour",
    "impactParameters": {
      "priceImpactPercent": 9.5,
      "volatilityMultiplier": 2.2,
      "demandShift": 40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 20,
      "autoRevert": true,
      "revertFactor": 0.85
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_048",
    "headline": "🛑 Cipla Promoter Group Confirms No Agreement Has Been Signed to Relinquish Company Control",
    "description": "Promoter family clarifies that while strategic partnerships are evaluated periodically, no binding agreements or open offer triggers exist. Exchange surveillance authorities advise traders to consult statutory regulatory disclosures when evaluating orderbook positioning.",
    "category": "Speculation / rumours",
    "subcategory": "OFFICIAL_CLARIFICATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 9.5,
    "affectedAssets": {
      "securities": [
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "OFFICIAL_CORRECTION",
    "classification": "correction",
    "impactParameters": {
      "priceImpactPercent": -9.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": "NEWS_RUMOR_047",
      "reversalFactor": 1,
      "officialClarification": "Promoter family clarifies that while strategic partnerships are evaluated periodically, no binding agreements or open offer triggers exist."
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_RUMOR_049",
    "headline": "🤫 Speculation: Tech Hyperscaler Readying $5B Unannounced Specialized ASIC Order with Nvidia",
    "description": "Market participants discuss unverified reports regarding NVDA. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "NVDA"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_050",
    "headline": "🤫 Supply Chain Rumour: Next-Gen Smartphone Production Run Stepped Up by 15% in India Facilities",
    "description": "Market participants discuss unverified reports regarding AAPL. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "AAPL"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_051",
    "headline": "🤫 Deal Whisper: Enterprise Cloud Giant In Discussions to Anchor Decentralized AI Compute Network",
    "description": "Market participants discuss unverified reports regarding MSFT. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "MSFT"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_052",
    "headline": "🤫 Speculation: European Regulators Considering Structural Remedies in AdTech Antitrust Case",
    "description": "Market participants discuss unverified reports regarding GOOGL. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "GOOGL"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.9,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_053",
    "headline": "🤫 Floor Chatter: Amazon Web Services Rolling Out Slashed Compute Tiers to Capture Start-Up AI Market",
    "description": "Market participants discuss unverified reports regarding AMZN. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "AMZN"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_054",
    "headline": "🤫 Rumour: High Net Worth Tech Entrepreneur Exploring Substantial Equity Injection in Telecom Asset",
    "description": "Market participants discuss unverified reports regarding IDEA. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 14.5,
    "affectedAssets": {
      "securities": [
        "IDEA"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 14.5,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_RUMOR_055",
    "headline": "🤫 Speculation: Frontier AI Lab Proposing Licensing Collaboration with Delta AI for Edge Robotics",
    "description": "Market participants discuss unverified reports regarding DTAI. Trading desks report heightened inquiry volume while official spokespersons maintain standard silence on speculative queries.",
    "category": "Speculation / rumours",
    "subcategory": "ANALYST_WHISPER",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 9.2,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology"
      ],
      "currencies": [
        "USD",
        "INR"
      ]
    },
    "eventType": "SPECULATIVE_WHISPER",
    "classification": "speculative",
    "impactParameters": {
      "priceImpactPercent": 9.2,
      "volatilityMultiplier": 1.9,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.1,
      "fxReserveDemand": 200000
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 25,
      "autoRevert": true,
      "revertFactor": 0.7
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_001",
    "headline": "🏛️ RBI MPC Surprises Markets with 25 bps Repo Rate Cut to 6.25% Amid Disinflation",
    "description": "RBI MPC Surprises Markets with 25 bps Repo Rate Cut to 6.25% Amid Disinflation. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "REPO_RATE_CUT",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_REPO_RATE_CUT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_002",
    "headline": "🏛️ RBI MPC Hikes Policy Repo Rate by 25 bps to 6.75% to Curb Resurgent Food Price Pressures",
    "description": "RBI MPC Hikes Policy Repo Rate by 25 bps to 6.75% to Curb Resurgent Food Price Pressures. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "REPO_RATE_HIKE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_REPO_RATE_HIKE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_003",
    "headline": "🏛️ RBI Holds Benchmark Rates Steady at 6.50%, Adopts Neutral Monetary Stance",
    "description": "RBI Holds Benchmark Rates Steady at 6.50%, Adopts Neutral Monetary Stance. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "POLICY_PAUSE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_POLICY_PAUSE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 3.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_004",
    "headline": "🏛️ RBI Reduces Cash Reserve Ratio (CRR) by 50 bps, Releasing ₹1.2 Lakh Cr Banking Liquidity",
    "description": "RBI Reduces Cash Reserve Ratio (CRR) by 50 bps, Releasing ₹1.2 Lakh Cr Banking Liquidity. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CRR_CUT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CRR_CUT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_005",
    "headline": "🏛️ RBI Impulses Incremental CRR of 10% to Impound Surplus Liquidity from Systemic Flows",
    "description": "RBI Impulses Incremental CRR of 10% to Impound Surplus Liquidity from Systemic Flows. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CRR_HIKE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CRR_HIKE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -4.8,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_006",
    "headline": "🏛️ RBI Conducts 14-Day VRR Auction Worth ₹75,000 Cr to Ease Systemic Cash Deficit",
    "description": "RBI Conducts 14-Day VRR Auction Worth ₹75,000 Cr to Ease Systemic Cash Deficit. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "SDF_OPERATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_SDF_OPERATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_007",
    "headline": "🏛️ RBI Announces $5B USD/INR Buy/Sell Swap Window to Anchor Exchange Rate Stability",
    "description": "RBI Announces $5B USD/INR Buy/Sell Swap Window to Anchor Exchange Rate Stability. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "FX_SWAP_WINDOW",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_FX_SWAP_WINDOW",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_008",
    "headline": "🏛️ RBI MPC Minutes Reveal Dovish Consensus and Optimism on Domestic Growth Trajectory",
    "description": "RBI MPC Minutes Reveal Dovish Consensus and Optimism on Domestic Growth Trajectory. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "MPC_MINUTES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_MPC_MINUTES",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 3,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_009",
    "headline": "🏛️ RBI Tightens Unsecured Consumer Credit Risk Weights by 25% for Non-Bank Financial Lenders",
    "description": "RBI Tightens Unsecured Consumer Credit Risk Weights by 25% for Non-Bank Financial Lenders. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "LENDING_NORMS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_LENDING_NORMS",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -5,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_010",
    "headline": "🏛️ RBI Intervenes Aggressively in NDF & Spot Currency Markets to Defend 83.20 Rupee Level",
    "description": "RBI Intervenes Aggressively in NDF & Spot Currency Markets to Defend 83.20 Rupee Level. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "FOREX_DEFENSE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_FOREX_DEFENSE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_011",
    "headline": "🏛️ India External Debt-to-GDP Ratio Drops to Record Low of 18.7%, Bolstering Sovereign Safety",
    "description": "India External Debt-to-GDP Ratio Drops to Record Low of 18.7%, Bolstering Sovereign Safety. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "EXTERNAL_DEBT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_EXTERNAL_DEBT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 3.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_012",
    "headline": "🏛️ RBI Expands Cross-Border UPI Linkages to Eurozone and Gulf Cooperation Council Economies",
    "description": "RBI Expands Cross-Border UPI Linkages to Eurozone and Gulf Cooperation Council Economies. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "PAYMENTS_VISION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_PAYMENTS_VISION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_013",
    "headline": "🏛️ India Retail CPI Inflation Drops to Multi-Year Low of 3.4%, Well Within RBI Tolerance Band",
    "description": "India Retail CPI Inflation Drops to Multi-Year Low of 3.4%, Well Within RBI Tolerance Band. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CPI_DISINFLATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CPI_DISINFLATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_014",
    "headline": "🏛️ Headline CPI Inflation Inches Up to 5.6% on Tomato & Vegetable Logistics Shock",
    "description": "Headline CPI Inflation Inches Up to 5.6% on Tomato & Vegetable Logistics Shock. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CPI_SPIKE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CPI_SPIKE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_015",
    "headline": "🏛️ Core CPI Inflation Prints at Tame 3.1%, Confirming Benign Non-Food Manufacturing Pressures",
    "description": "Core CPI Inflation Prints at Tame 3.1%, Confirming Benign Non-Food Manufacturing Pressures. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CORE_INFLATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CORE_INFLATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_016",
    "headline": "🏛️ Wholesale Price Index (WPI) Deflation Deepens to -0.8%, Easing Corporate Raw Material Costs",
    "description": "Wholesale Price Index (WPI) Deflation Deepens to -0.8%, Easing Corporate Raw Material Costs. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "WPI_DEFLATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_WPI_DEFLATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_017",
    "headline": "🏛️ WPI Inflation Accelerates to 2.8% Following Global Industrial Metal and Fuel Rate Spikes",
    "description": "WPI Inflation Accelerates to 2.8% Following Global Industrial Metal and Fuel Rate Spikes. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "WPI_SPIKE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_WPI_SPIKE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -4.5,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_018",
    "headline": "🏛️ Pulses and Edible Oil Prices Push Food Inflation Gauge to 7.8% YoY",
    "description": "Pulses and Edible Oil Prices Push Food Inflation Gauge to 7.8% YoY. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "FOOD_INFLATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_FOOD_INFLATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -5.5,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_019",
    "headline": "🏛️ Urban Disinflation Outpaces Rural Trends as Rent and Transport Costs Cool Significantly",
    "description": "Urban Disinflation Outpaces Rural Trends as Rent and Transport Costs Cool Significantly. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "URBAN_CPI",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_URBAN_CPI",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 3.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_020",
    "headline": "🏛️ Bumper Rabi Crop Harvest Brings Rural Real Wages Into Positive Territory for Third Consecutive Month",
    "description": "Bumper Rabi Crop Harvest Brings Rural Real Wages Into Positive Territory for Third Consecutive Month. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "RURAL_DEMAND",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_RURAL_DEMAND",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_021",
    "headline": "🏛️ Stronger US Dollar Adds 30 bps to Domestic Imported Fuel and Edible Oil Price Gauges",
    "description": "Stronger US Dollar Adds 30 bps to Domestic Imported Fuel and Edible Oil Price Gauges. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "IMPORTED_INFLATION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_IMPORTED_INFLATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -4,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_022",
    "headline": "🏛️ Cabinet Approves Cooking Gas Cylinder Subsidy Extension, Dampening Monthly Household CPI",
    "description": "Cabinet Approves Cooking Gas Cylinder Subsidy Extension, Dampening Monthly Household CPI. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "ENERGY_SUBSIDY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_ENERGY_SUBSIDY",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_023",
    "headline": "🏛️ India Q1 GDP Growth Smashes Consensus Estimates at Stellar 7.8%, Driven by Fixed Investment",
    "description": "India Q1 GDP Growth Smashes Consensus Estimates at Stellar 7.8%, Driven by Fixed Investment. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "GDP_BEAT",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_GDP_BEAT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_024",
    "headline": "🏛️ Q2 GDP Prints at 6.2%, Slowing Down as External Export Demand Weakens Across Advanced Economies",
    "description": "Q2 GDP Prints at 6.2%, Slowing Down as External Export Demand Weakens Across Advanced Economies. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "GDP_SLOWDOWN",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_GDP_SLOWDOWN",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_025",
    "headline": "🏛️ Gross Value Added (GVA) in Manufacturing Expands 9.2%, Highlighting Industrial Resurgence",
    "description": "Gross Value Added (GVA) in Manufacturing Expands 9.2%, Highlighting Industrial Resurgence. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "GVA_MANUFACTURING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_GVA_MANUFACTURING",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_026",
    "headline": "🏛️ Index of Industrial Production (IIP) Surges 6.8% YoY Led by Electricity Generation and Mining",
    "description": "Index of Industrial Production (IIP) Surges 6.8% YoY Led by Electricity Generation and Mining. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "IIP_INDEX_SURGE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_IIP_INDEX_SURGE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_027",
    "headline": "🏛️ IIP Drops to Modest 1.4% as Capital Goods Output Registers Transitory Lull",
    "description": "IIP Drops to Modest 1.4% as Capital Goods Output Registers Transitory Lull. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "IIP_CONTRACTION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_IIP_CONTRACTION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -4.2,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_028",
    "headline": "🏛️ Eight Core Infrastructure Industries Post Combined Growth of 7.2% in Latest Month",
    "description": "Eight Core Infrastructure Industries Post Combined Growth of 7.2% in Latest Month. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CORE_SECTORS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CORE_SECTORS",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_029",
    "headline": "🏛️ India Services PMI Hits Record 61.4, Marking 36 Consecutive Months of Robust Expansion",
    "description": "India Services PMI Hits Record 61.4, Marking 36 Consecutive Months of Robust Expansion. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "SERVICES_PMI",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_SERVICES_PMI",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_030",
    "headline": "🏛️ HSBC India Manufacturing PMI Advances to 58.8 on Surge in Domestic New Orders",
    "description": "HSBC India Manufacturing PMI Advances to 58.8 on Surge in Domestic New Orders. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "MANUFACTURING_PMI",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.9,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_MANUFACTURING_PMI",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.9,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_031",
    "headline": "🏛️ Union Budget Escalates Infrastructure Capex to Record ₹11.8 Lakh Cr (3.4% of GDP)",
    "description": "Union Budget Escalates Infrastructure Capex to Record ₹11.8 Lakh Cr (3.4% of GDP). Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CAPEX_ALLOCATION",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CAPEX_ALLOCATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_032",
    "headline": "🏛️ Government Trims Fiscal Deficit Target to 4.9% of GDP Ahead of Fiscal Consolidation Glidepath",
    "description": "Government Trims Fiscal Deficit Target to 4.9% of GDP Ahead of Fiscal Consolidation Glidepath. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "FISCAL_DEFICIT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_FISCAL_DEFICIT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.4,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_033",
    "headline": "🏛️ Gross Market Borrowing Pegged Lower Than Market Forecasts, Triggering G-Sec Bond Rally",
    "description": "Gross Market Borrowing Pegged Lower Than Market Forecasts, Triggering G-Sec Bond Rally. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "BORROWING_PROGRAM",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_BORROWING_PROGRAM",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_034",
    "headline": "🏛️ Cabinet Approves Strategic Minority Disinvestment Framework for Non-Strategic PSUs",
    "description": "Cabinet Approves Strategic Minority Disinvestment Framework for Non-Strategic PSUs. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "DISINVESTMENT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_DISINVESTMENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_035",
    "headline": "🏛️ Rationalization of Capital Gains Tax Framework Welcomed by Institutional Equity Desks",
    "description": "Rationalization of Capital Gains Tax Framework Welcomed by Institutional Equity Desks. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "TAX_REFORM",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_TAX_REFORM",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_036",
    "headline": "🏛️ Modernization Capex in Defence Budget Hiked by 16%, Prioritizing Domestic Procurement",
    "description": "Modernization Capex in Defence Budget Hiked by 16%, Prioritizing Domestic Procurement. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "DEFENCE_BUDGET",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_DEFENCE_BUDGET",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_037",
    "headline": "🏛️ Indian Railways Capital Outlay Set at ₹2.55 Lakh Cr for High-Speed Freight Corridors",
    "description": "Indian Railways Capital Outlay Set at ₹2.55 Lakh Cr for High-Speed Freight Corridors. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "RAILWAY_CAPEX",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_RAILWAY_CAPEX",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_038",
    "headline": "🏛️ Government Announces 3 Crore Affordable Urban Houses Under Expanded Housing Mission",
    "description": "Government Announces 3 Crore Affordable Urban Houses Under Expanded Housing Mission. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "HOUSING_SCHEME",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_HOUSING_SCHEME",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_039",
    "headline": "🏛️ S&P Upgrades India Sovereign Rating Outlook to Positive, Citing Robust Macro Fundamentals",
    "description": "S&P Upgrades India Sovereign Rating Outlook to Positive, Citing Robust Macro Fundamentals. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "RATING_UPGRADE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_RATING_UPGRADE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_040",
    "headline": "🏛️ Moody's Elevates India Credit Rating Stance on Sinking Fiscal Metrics and High Investment Yields",
    "description": "Moody's Elevates India Credit Rating Stance on Sinking Fiscal Metrics and High Investment Yields. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "MOODYS_UPGRADE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_MOODYS_UPGRADE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_041",
    "headline": "🏛️ Fitch Affirms India Rating at BBB- with Stable Outlook; Highlights Banking Sector Health",
    "description": "Fitch Affirms India Rating at BBB- with Stable Outlook; Highlights Banking Sector Health. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "FITCH_AFFIRMATION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_FITCH_AFFIRMATION",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_042",
    "headline": "🏛️ JPMorgan Global Emerging Market Bond Index Weights India at Maximum 10% Ceiling",
    "description": "JPMorgan Global Emerging Market Bond Index Weights India at Maximum 10% Ceiling. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "BOND_INDEX_WEIGHT",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_BOND_INDEX_WEIGHT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_043",
    "headline": "🏛️ Bloomberg Sovereign Bond Index Fully Integrates Indian Fully Accessible Route (FAR) Securities",
    "description": "Bloomberg Sovereign Bond Index Fully Integrates Indian Fully Accessible Route (FAR) Securities. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "BLOOMBERG_INDEX",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_BLOOMBERG_INDEX",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_044",
    "headline": "🏛️ Overseas Rating Agency Warns on Elevated General Government Debt-to-GDP Metrics",
    "description": "Overseas Rating Agency Warns on Elevated General Government Debt-to-GDP Metrics. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "RATING_DOWNGRADE_ALERT",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_RATING_DOWNGRADE_ALERT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 1.4,
      "demandShift": -30,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 500000
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_045",
    "headline": "🏛️ Monthly Gross GST Collections Breach Historic ₹2.10 Lakh Cr Mark, Up 12.4% YoY",
    "description": "Monthly Gross GST Collections Breach Historic ₹2.10 Lakh Cr Mark, Up 12.4% YoY. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "GST_RECORD",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_GST_RECORD",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_046",
    "headline": "🏛️ Direct Tax Net Collections Exceed Budget Estimates by ₹1.15 Lakh Cr on High Corporate Profits",
    "description": "Direct Tax Net Collections Exceed Budget Estimates by ₹1.15 Lakh Cr on High Corporate Profits. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "DIRECT_TAX",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_DIRECT_TAX",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_047",
    "headline": "🏛️ Corporate Advance Tax Inflows Rise 18.2% in Latest Tranche, Indicating Solid Earnings Health",
    "description": "Corporate Advance Tax Inflows Rise 18.2% in Latest Tranche, Indicating Solid Earnings Health. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "ADVANCE_TAX",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_ADVANCE_TAX",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_048",
    "headline": "🏛️ Electronic E-Way Bill Generation Reaches All-Time Monthly Record of 10.3 Crore Slips",
    "description": "Electronic E-Way Bill Generation Reaches All-Time Monthly Record of 10.3 Crore Slips. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CUSTOMS_MOMENTUM",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CUSTOMS_MOMENTUM",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_049",
    "headline": "🏛️ Government Abolishes Windfall Tax on Domestically Produced Crude Oil and Aviation Turbine Fuel",
    "description": "Government Abolishes Windfall Tax on Domestically Produced Crude Oil and Aviation Turbine Fuel. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "WINDFALL_TAX_CUT",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_WINDFALL_TAX_CUT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_050",
    "headline": "🏛️ Customs Duty on Gold Cut from 15% to 6%, Revitalizing Organized Retail Bullion Demand",
    "description": "Customs Duty on Gold Cut from 15% to 6%, Revitalizing Organized Retail Bullion Demand. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "CUSTOMS_DUTY_GOLD",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_CUSTOMS_DUTY_GOLD",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_051",
    "headline": "🏛️ Bank Credit Growth Expands 15.6% YoY Driven by Industrial Capex and Services Demand",
    "description": "Bank Credit Growth Expands 15.6% YoY Driven by Industrial Capex and Services Demand. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "BANK_CREDIT_GROWTH",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_BANK_CREDIT_GROWTH",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_052",
    "headline": "🏛️ Aggregate Banking Deposits Grow 12.8% YoY as Banks Mobilize Retail Term Deposits",
    "description": "Aggregate Banking Deposits Grow 12.8% YoY as Banks Mobilize Retail Term Deposits. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "DEPOSIT_GROWTH",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_DEPOSIT_GROWTH",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_053",
    "headline": "🏛️ Gross Non-Performing Assets of Indian Scheduled Commercial Banks Drop to 12-Year Low of 2.8%",
    "description": "Gross Non-Performing Assets of Indian Scheduled Commercial Banks Drop to 12-Year Low of 2.8%. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "GNPA_DECADE_LOW",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_GNPA_DECADE_LOW",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_MACRO_054",
    "headline": "🏛️ Systemic Provision Coverage Ratio (PCR) Surpasses 76%, Fortifying Balance Sheet Resilience",
    "description": "Systemic Provision Coverage Ratio (PCR) Surpasses 76%, Fortifying Balance Sheet Resilience. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "PROVISION_COVERAGE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_PROVISION_COVERAGE",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_MACRO_055",
    "headline": "🏛️ Net Banking System Liquidity Returns to Comfortable Surplus of ₹85,000 Cr Following Government Spending",
    "description": "Net Banking System Liquidity Returns to Comfortable Surplus of ₹85,000 Cr Following Government Spending. Economic research desks note that macro policy developments directly influence aggregate sovereign yield curves, credit availability, and currency valuations. Portfolio managers adjust risk parity asset allocations accordingly.",
    "category": "Macroeconomics / RBI",
    "subcategory": "LIQUIDITY_SURPLUS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.6,
    "affectedAssets": {
      "securities": [
        "HDFCBANK",
        "SBIN",
        "ICICIBANK",
        "TATAMOTORS",
        "LT",
        "RELIANCE"
      ],
      "sectors": [
        "Financial Services",
        "Infrastructure",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "INR",
        "USD"
      ]
    },
    "eventType": "MACRO_LIQUIDITY_SURPLUS",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.6,
      "volatilityMultiplier": 1.4,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.2,
      "fxReserveDemand": 0
    },
    "duration": 90,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_001",
    "headline": "⚡ Global Enterprise Cloud Spend Rebounds 18% as Generative AI Applications Move to Production",
    "description": "Global Enterprise Cloud Spend Rebounds 18% as Generative AI Applications Move to Production. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "WIPRO",
        "HCLTECH"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_002",
    "headline": "⚡ European Banking Consortium Signs Sovereign Distributed Data Cloud Framework with Indian IT",
    "description": "European Banking Consortium Signs Sovereign Distributed Data Cloud Framework with Indian IT. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_003",
    "headline": "⚡ North American Financial Institutions Enact Temporary Lull in Discretionary Legacy Tech Spending",
    "description": "North American Financial Institutions Enact Temporary Lull in Discretionary Legacy Tech Spending. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "WIPRO",
        "TECHM"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.4,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_004",
    "headline": "⚡ Semiconductor Design Services Mandates Surge 24% Following New Fab Construction Milestones",
    "description": "Semiconductor Design Services Mandates Surge 24% Following New Fab Construction Milestones. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "HCLTECH",
        "TCS"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_005",
    "headline": "⚡ Cybersecurity Architecture Outlays Jump as Multi-Cloud Zero-Trust Architectures Mandated",
    "description": "Cybersecurity Architecture Outlays Jump as Multi-Cloud Zero-Trust Architectures Mandated. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.6,
    "affectedAssets": {
      "securities": [
        "INFY",
        "WIPRO"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_006",
    "headline": "⚡ Telecom Network Virtualization Triggers Large Multi-Year Modernization Contracts in North America",
    "description": "Telecom Network Virtualization Triggers Large Multi-Year Modernization Contracts in North America. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "TECHM",
        "INFY"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_007",
    "headline": "⚡ Sovereign AI Compute Infrastructure Orders Boost Engineering Research & Development Desks",
    "description": "Sovereign AI Compute Infrastructure Orders Boost Engineering Research & Development Desks. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "TCS",
        "HCLTECH"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_008",
    "headline": "⚡ Cross-Currency Headwinds in Japanese Yen and Euro Trim Reported Rupee Revenue Growth",
    "description": "Cross-Currency Headwinds in Japanese Yen and Euro Trim Reported Rupee Revenue Growth. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFORMATION_TECHNOLOGY",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "WIPRO",
        "TECHM"
      ],
      "sectors": [
        "Information Technology"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_009",
    "headline": "⚡ US FDA Clears Expedited Approval Pathway for Indian Biosimilar Peptide and Inhaler Formulations",
    "description": "US FDA Clears Expedited Approval Pathway for Indian Biosimilar Peptide and Inhaler Formulations. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "DRREDDY",
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_010",
    "headline": "⚡ European Medicines Agency Approves Marketing Authorization for Five Key Complex Oncology Generics",
    "description": "European Medicines Agency Approves Marketing Authorization for Five Key Complex Oncology Generics. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "DRREDDY",
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_011",
    "headline": "⚡ National Pharmaceutical Pricing Authority Imposes Price Caps on 42 Essential Cardiac Medications",
    "description": "National Pharmaceutical Pricing Authority Imposes Price Caps on 42 Essential Cardiac Medications. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA",
        "DIVISLAB"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_012",
    "headline": "⚡ Medical Tourism Inflows Expand 32% as Tertiary Care Chains Expand Tier-1 Surgical Capacity",
    "description": "Medical Tourism Inflows Expand 32% as Tertiary Care Chains Expand Tier-1 Surgical Capacity. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "APOLLOHOSP",
        "DIVISLAB"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_013",
    "headline": "⚡ Domestic Chronic Therapies Segment Records Double-Digit Volume Expansion Across Metros",
    "description": "Domestic Chronic Therapies Segment Records Double-Digit Volume Expansion Across Metros. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "CIPLA",
        "SUNPHARMA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_014",
    "headline": "⚡ Global Innovator Big Pharma Signs Long-Term Custom Active Ingredient Supply Contracts",
    "description": "Global Innovator Big Pharma Signs Long-Term Custom Active Ingredient Supply Contracts. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "DIVISLAB",
        "DRREDDY"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_015",
    "headline": "⚡ Health Insurance Penetration Rises Following Cashless Everywhere Hospital Regulatory Initiative",
    "description": "Health Insurance Penetration Rises Following Cashless Everywhere Hospital Regulatory Initiative. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "HEALTHCARE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "APOLLOHOSP",
        "CIPLA"
      ],
      "sectors": [
        "Healthcare"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_016",
    "headline": "⚡ Government Disburses ₹4,800 Cr Under Automobile Production Linked Incentive (PLI) Scheme",
    "description": "Government Disburses ₹4,800 Cr Under Automobile Production Linked Incentive (PLI) Scheme. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8.4,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "MARUTI",
        "M&M"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_017",
    "headline": "⚡ Festive Season Automobile Bookings Touch Record 1.2 Million Units, Led by Compact SUVs",
    "description": "Festive Season Automobile Bookings Touch Record 1.2 Million Units, Led by Compact SUVs. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "MARUTI",
        "TATAMOTORS"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_018",
    "headline": "⚡ FAME-III Clean Mobility Subsidies Extended to Commercial EV Three-Wheelers and Freight Vans",
    "description": "FAME-III Clean Mobility Subsidies Extended to Commercial EV Three-Wheelers and Freight Vans. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "M&M"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_019",
    "headline": "⚡ Premium Motorcycle Registrations Above 250cc Expand 28% Across Urban Youth Demographic",
    "description": "Premium Motorcycle Registrations Above 250cc Expand 28% Across Urban Youth Demographic. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "BAJAJ-AUTO",
        "EICHERMOT"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_020",
    "headline": "⚡ Tractor and Agricultural Equipment Demand Rebounds Following Abundant Reservoir Storage",
    "description": "Tractor and Agricultural Equipment Demand Rebounds Following Abundant Reservoir Storage. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "M&M",
        "MARUTI"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_021",
    "headline": "⚡ Rare Earth Mineral Export Bans in Overseas Processing Hubs Raise Electric Motor Input Costs",
    "description": "Rare Earth Mineral Export Bans in Overseas Processing Hubs Raise Electric Motor Input Costs. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS",
        "BAJAJ-AUTO"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_022",
    "headline": "⚡ Auto Component Export Orders to Middle East and South America Touch New Quarterly Highs",
    "description": "Auto Component Export Orders to Middle East and South America Touch New Quarterly Highs. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "AUTOMOBILES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "MARUTI",
        "EICHERMOT"
      ],
      "sectors": [
        "Automobiles"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_023",
    "headline": "⚡ Cabinet Clears ₹45,000 Cr Gati Shakti High-Speed Multi-Modal Cargo Logistics Terminals",
    "description": "Cabinet Clears ₹45,000 Cr Gati Shakti High-Speed Multi-Modal Cargo Logistics Terminals. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8.6,
    "affectedAssets": {
      "securities": [
        "LT",
        "ADANIPORTS",
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_024",
    "headline": "⚡ National Highways Authority of India Awards 2,400 km of Express Corridors Ahead of Timelines",
    "description": "National Highways Authority of India Awards 2,400 km of Express Corridors Ahead of Timelines. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "LT",
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_025",
    "headline": "⚡ Container Port Throughput Climbs 14% as Turnaround Time at Coastal Docks Shrinks to 22 Hours",
    "description": "Container Port Throughput Climbs 14% as Turnaround Time at Coastal Docks Shrinks to 22 Hours. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS",
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_026",
    "headline": "⚡ Unseasonal Monsoon Inundation in Central Belt Causes Transitory Construction Delay",
    "description": "Unseasonal Monsoon Inundation in Central Belt Causes Transitory Construction Delay. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "ULTRACEMCO",
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_027",
    "headline": "⚡ Dedicated Freight Corridor Electrification Cuts Coastal Rail Cargo Transit Times by 40%",
    "description": "Dedicated Freight Corridor Electrification Cuts Coastal Rail Cargo Transit Times by 40%. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS",
        "ULTRACEMCO"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_028",
    "headline": "⚡ Mega Water Supply and Underground Urban Metro Contracts Awarded Under Smart Cities Mission",
    "description": "Mega Water Supply and Underground Urban Metro Contracts Awarded Under Smart Cities Mission. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "LT",
        "ADANIPORTS"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_029",
    "headline": "⚡ Institutional Housing Real Estate Pre-Sales Touch Historic Peak in Top 7 Metro Markets",
    "description": "Institutional Housing Real Estate Pre-Sales Touch Historic Peak in Top 7 Metro Markets. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "INFRASTRUCTURE",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ULTRACEMCO",
        "LT"
      ],
      "sectors": [
        "Infrastructure"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_030",
    "headline": "⚡ Union Cabinet Approves ₹24,000 Cr Advanced Green Hydrogen Production Tranche",
    "description": "Union Cabinet Approves ₹24,000 Cr Advanced Green Hydrogen Production Tranche. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "ENERGY",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "NTPC",
        "POWERGRID"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_031",
    "headline": "⚡ Peak Electricity Demand Touches Record 250 GW; Grid Frequency Maintained Resiliently",
    "description": "Peak Electricity Demand Touches Record 250 GW; Grid Frequency Maintained Resiliently. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "UTILITIES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "NTPC",
        "POWERGRID"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_032",
    "headline": "⚡ Inter-State Transmission Network Adds 8,500 Circuit Kilometers for Renewable Evacuation",
    "description": "Inter-State Transmission Network Adds 8,500 Circuit Kilometers for Renewable Evacuation. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "UTILITIES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "POWERGRID",
        "NTPC"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_033",
    "headline": "⚡ Rooftop Solar Program Surpasses 2 Million Household Installations in First 6 Months",
    "description": "Rooftop Solar Program Surpasses 2 Million Household Installations in First 6 Months. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "ENERGY",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "ONGC"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_034",
    "headline": "⚡ Pumped Hydro Storage Guidelines Finalized with 40-Year Concession Framework",
    "description": "Pumped Hydro Storage Guidelines Finalized with 40-Year Concession Framework. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "UTILITIES",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "NTPC",
        "COALINDIA"
      ],
      "sectors": [
        "Utilities"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_035",
    "headline": "⚡ Global Wind Turbine Component Certification Hurdles Slow Offshore Wind Auction Timelines",
    "description": "Global Wind Turbine Component Certification Hurdles Slow Offshore Wind Auction Timelines. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "ENERGY",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE"
      ],
      "sectors": [
        "Energy"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_036",
    "headline": "⚡ Ministry of Steel Imposes 12% Safeguard Duty on Subsidized Hot-Rolled Coil Imports",
    "description": "Ministry of Steel Imposes 12% Safeguard Duty on Subsidized Hot-Rolled Coil Imports. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "METALS_&_MINING",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.4,
    "affectedAssets": {
      "securities": [
        "TATASTEEL",
        "JSWSTEEL",
        "HINDALCO"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_037",
    "headline": "⚡ London Metal Exchange Aluminum Cash Settles Above $2,600/T on Smelter Power Cuts",
    "description": "London Metal Exchange Aluminum Cash Settles Above $2,600/T on Smelter Power Cuts. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "METALS_&_MINING",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "HINDALCO",
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_038",
    "headline": "⚡ Domestic Steel Rebar Demand Expands 11% Led by High-Density Urban Infrastructure",
    "description": "Domestic Steel Rebar Demand Expands 11% Led by High-Density Urban Infrastructure. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "METALS_&_MINING",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "JSWSTEEL",
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_039",
    "headline": "⚡ Commercial Coal Block Mine Allocations Exceed Annual Output Targets by 15 Million Tonnes",
    "description": "Commercial Coal Block Mine Allocations Exceed Annual Output Targets by 15 Million Tonnes. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "METALS_&_MINING",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "COALINDIA",
        "TATASTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_040",
    "headline": "⚡ Iron Ore Royalty Revisions by Mining Tribunals Modestly Elevate Primary Raw Material Sourcing Costs",
    "description": "Iron Ore Royalty Revisions by Mining Tribunals Modestly Elevate Primary Raw Material Sourcing Costs. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "METALS_&_MINING",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TATASTEEL",
        "JSWSTEEL"
      ],
      "sectors": [
        "Metals & Mining"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_041",
    "headline": "⚡ Rural Fast Moving Consumer Goods Volume Growth Outpaces Urban Demand for First Time in 3 Years",
    "description": "Rural Fast Moving Consumer Goods Volume Growth Outpaces Urban Demand for First Time in 3 Years. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "FMCG",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ITC",
        "HINDUNILVR",
        "NESTLEIND"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_042",
    "headline": "⚡ Palm Oil and Crude Derivative Packaging Costs Drop 14%, Expanding Operating Margins",
    "description": "Palm Oil and Crude Derivative Packaging Costs Drop 14%, Expanding Operating Margins. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "FMCG",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "HINDUNILVR",
        "BRITANNIA"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_043",
    "headline": "⚡ Packaged Health Foods and Premium Beverage Categories Register 22% Value Surge",
    "description": "Packaged Health Foods and Premium Beverage Categories Register 22% Value Surge. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "FMCG",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "NESTLEIND",
        "ITC"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_044",
    "headline": "⚡ Modern Trade and Quick-Commerce Delivery Channels Expand Direct Distribution Reach by 30%",
    "description": "Modern Trade and Quick-Commerce Delivery Channels Expand Direct Distribution Reach by 30%. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "FMCG",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "BRITANNIA",
        "HINDUNILVR"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_045",
    "headline": "⚡ Unseasonal Rains in Southern Coffee and Spice Growing Belts Push Procurement Spot Rates Up",
    "description": "Unseasonal Rains in Southern Coffee and Spice Growing Belts Push Procurement Spot Rates Up. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "FMCG",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "ITC",
        "NESTLEIND"
      ],
      "sectors": [
        "FMCG"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -4.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_046",
    "headline": "⚡ Telecom Regulatory Authority Recommends Industry-Wide Tariff Hike to Bolster Sector Average Revenue Per User",
    "description": "Telecom Regulatory Authority Recommends Industry-Wide Tariff Hike to Bolster Sector Average Revenue Per User. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "TELECOMMUNICATIONS",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "IDEA",
        "RELIANCE"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_047",
    "headline": "⚡ Nationwide 5G Fixed Wireless Access (FWA) Broadband Crosses 5 Million Enterprise Connections",
    "description": "Nationwide 5G Fixed Wireless Access (FWA) Broadband Crosses 5 Million Enterprise Connections. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "TELECOMMUNICATIONS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "IDEA",
        "TCS"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_048",
    "headline": "⚡ Universal Service Obligation Fund Clears ₹3,500 Cr Subsidy for Border Region Optical Fiber",
    "description": "Universal Service Obligation Fund Clears ₹3,500 Cr Subsidy for Border Region Optical Fiber. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "TELECOMMUNICATIONS",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "IDEA",
        "TECHM"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_SECT_049",
    "headline": "⚡ Heavy Right-of-Way Fiber Laying Charges Reimposed by Selected Municipal Corporations",
    "description": "Heavy Right-of-Way Fiber Laying Charges Reimposed by Selected Municipal Corporations. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "TELECOMMUNICATIONS",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE",
        "IDEA"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_SECT_050",
    "headline": "⚡ Department of Telecommunications Approves Staggered 10-Year Spectrum Payment Rescheduling",
    "description": "Department of Telecommunications Approves Staggered 10-Year Spectrum Payment Rescheduling. Industry analysts emphasize that broad sectoral catalysts reshape industry operating margins and drive sector-wide capital flows across peer competitors.",
    "category": "Sector developments",
    "subcategory": "TELECOMMUNICATIONS",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 9,
    "affectedAssets": {
      "securities": [
        "IDEA",
        "TECHM"
      ],
      "sectors": [
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "SECTOR_CATALYST",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 9,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_001",
    "headline": "🌐 Critical Suez Canal Transit Suspended Following Maritime Drone Incidents in Southern Red Sea",
    "description": "Critical Suez Canal Transit Suspended Following Maritime Drone Incidents in Southern Red Sea. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7.5,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_002",
    "headline": "🌐 Strait of Hormuz Tanker Escort Rules Tightened Amid Escalated Naval Patrol Inspections",
    "description": "Strait of Hormuz Tanker Escort Rules Tightened Amid Escalated Naval Patrol Inspections. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "AED",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_003",
    "headline": "🌐 Major European Rail Logistics Network Crippled by Targeted Industrial Cyber Attacks",
    "description": "Major European Rail Logistics Network Crippled by Targeted Industrial Cyber Attacks. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -8.2,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_004",
    "headline": "🌐 United Nations Security Council Mediates Temporary Ceasefire Guaranteeing Black Sea Grain Corridors",
    "description": "United Nations Security Council Mediates Temporary Ceasefire Guaranteeing Black Sea Grain Corridors. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_005",
    "headline": "🌐 English Channel Port Border Checks Experience 48-Hour Stoppages Due to System Glitches",
    "description": "English Channel Port Border Checks Experience 48-Hour Stoppages Due to System Glitches. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "GBP",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 1800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_006",
    "headline": "🌐 Malacca Strait Navigation Radar Outage Causes Container Vessel Congestion and Surcharges",
    "description": "Malacca Strait Navigation Radar Outage Causes Container Vessel Congestion and Surcharges. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "SGD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_007",
    "headline": "🌐 Diplomatic Accord Clears Commercial Air Freight Overflight Corridors Across Central Asia",
    "description": "Diplomatic Accord Clears Commercial Air Freight Overflight Corridors Across Central Asia. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_008",
    "headline": "🌐 Balkan Cross-Border Energy Interconnectors Severed Following Severe Hydroelectric Flooding",
    "description": "Balkan Cross-Border Energy Interconnectors Severed Following Severe Hydroelectric Flooding. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -8,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2600000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_009",
    "headline": "🌐 US Federal Reserve Cuts Fed Funds Rate by 50 bps, Signal End of Tightening Cycle",
    "description": "US Federal Reserve Cuts Fed Funds Rate by 50 bps, Signal End of Tightening Cycle. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 3000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_010",
    "headline": "🌐 FOMC Delivers Hawkish Hold, Dot Plot Projects Prolonged Higher Policy Rates Through Next Year",
    "description": "FOMC Delivers Hawkish Hold, Dot Plot Projects Prolonged Higher Policy Rates Through Next Year. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 3500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_011",
    "headline": "🌐 European Central Bank Initiates 25 bps Rate Reduction as Eurozone Disinflation Deepens",
    "description": "European Central Bank Initiates 25 bps Rate Reduction as Eurozone Disinflation Deepens. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 2400000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_012",
    "headline": "🌐 Bank of Japan Exits Negative Interest Rates and Yield Curve Control, Jolting Carry Trade Desks",
    "description": "Bank of Japan Exits Negative Interest Rates and Yield Curve Control, Jolting Carry Trade Desks. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "JPY",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 4000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_013",
    "headline": "🌐 Bank of England Lowers Bank Rate to 4.75% Following Subdued Core Services Price Data",
    "description": "Bank of England Lowers Bank Rate to 4.75% Following Subdued Core Services Price Data. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "GBP",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.4,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1600000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_014",
    "headline": "🌐 Reserve Bank of Australia Holds Rates Constant Amid Rebounding Mining Capital Inflows",
    "description": "Reserve Bank of Australia Holds Rates Constant Amid Rebounding Mining Capital Inflows. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "AUD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_015",
    "headline": "🌐 People’s Bank of China Trims Reserve Requirement Ratio by 50 bps to Support Real Estate Solvency",
    "description": "People’s Bank of China Trims Reserve Requirement Ratio by 50 bps to Support Real Estate Solvency. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "CNY",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_016",
    "headline": "🌐 US Treasury Lowers Quarterly Refunding Borrowing Estimates, Sparking Global Equity Relief Rally",
    "description": "US Treasury Lowers Quarterly Refunding Borrowing Estimates, Sparking Global Equity Relief Rally. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 2200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_017",
    "headline": "🌐 US Commerce Department Expands Advanced Semiconductor and Gate-All-Around Tool Export Restrictions",
    "description": "US Commerce Department Expands Advanced Semiconductor and Gate-All-Around Tool Export Restrictions. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -8.5,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 3200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_018",
    "headline": "🌐 US and Allies Sign Strategic Critical Minerals Supply Compact Guaranteeing Rare Earth Processing",
    "description": "US and Allies Sign Strategic Critical Minerals Supply Compact Guaranteeing Rare Earth Processing. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_019",
    "headline": "🌐 China Imposes Strict Export Licensing Controls on Gallium, Germanium, and Synthetic Graphite",
    "description": "China Imposes Strict Export Licensing Controls on Gallium, Germanium, and Synthetic Graphite. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "CNY",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7.2,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2600000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_020",
    "headline": "🌐 European Union Passes Critical Raw Materials Act with Subsidized Indigenous Refining Targets",
    "description": "European Union Passes Critical Raw Materials Act with Subsidized Indigenous Refining Targets. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_021",
    "headline": "🌐 Global Foundry Major Reports Three-Week Delay in EUV Lithography Tool Factory Deliveries",
    "description": "Global Foundry Major Reports Three-Week Delay in EUV Lithography Tool Factory Deliveries. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_022",
    "headline": "🌐 Japan Semiconductor Equipment Consortium Inks Multilateral Procurement Pact with Indian Fabs",
    "description": "Japan Semiconductor Equipment Consortium Inks Multilateral Procurement Pact with Indian Fabs. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "JPY",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1400000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_023",
    "headline": "🌐 Strategic Tech Export Review Restricts Cloud AI Model Weight Downloads to Non-Aligned States",
    "description": "Strategic Tech Export Review Restricts Cloud AI Model Weight Downloads to Non-Aligned States. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2400000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_024",
    "headline": "🌐 India and United Kingdom Finalize Landmark Comprehensive Free Trade and Investment Agreement",
    "description": "India and United Kingdom Finalize Landmark Comprehensive Free Trade and Investment Agreement. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "GBP",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 2000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_025",
    "headline": "🌐 India-EFTA Trade and Economic Partnership Agreement Ratified, Unlocking $100B Inward FDI Commitment",
    "description": "India-EFTA Trade and Economic Partnership Agreement Ratified, Unlocking $100B Inward FDI Commitment. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 2200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_026",
    "headline": "🌐 India-UAE CEPA Bilateral Non-Oil Trade Crosses $50B Milestone, Operating Under Rupee-Dirham Settlement",
    "description": "India-UAE CEPA Bilateral Non-Oil Trade Crosses $50B Milestone, Operating Under Rupee-Dirham Settlement. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "AED",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_027",
    "headline": "🌐 Overseas Protectionist Tariffs Announced on Exported Automotive Components and Steel Castings",
    "description": "Overseas Protectionist Tariffs Announced on Exported Automotive Components and Steel Castings. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_028",
    "headline": "🌐 Australia-India Economic Cooperation Pact Upgraded to Include Duty-Free Coking Coal Shipments",
    "description": "Australia-India Economic Cooperation Pact Upgraded to Include Duty-Free Coking Coal Shipments. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "AUD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1600000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_029",
    "headline": "🌐 Singapore-India Digital Finance Gateway Launches Real-Time Cross-Border Trade Receivables Clearance",
    "description": "Singapore-India Digital Finance Gateway Launches Real-Time Cross-Border Trade Receivables Clearance. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "SGD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_030",
    "headline": "🌐 Latin American Sovereign Restructuring Stalemate Sparks Transitory Risk-Off Sentiment in Emerging Debt",
    "description": "Latin American Sovereign Restructuring Stalemate Sparks Transitory Risk-Off Sentiment in Emerging Debt. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 7.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7.8,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 3000000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_031",
    "headline": "🌐 International Monetary Fund Concludes Successful Multilateral Sovereign Debt Relief Framework",
    "description": "International Monetary Fund Concludes Successful Multilateral Sovereign Debt Relief Framework. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1600000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_032",
    "headline": "🌐 Peripheral Eurozone Sovereign Yield Spreads Widen Modestly on Fiscal Deficit Trajectory Scrutiny",
    "description": "Peripheral Eurozone Sovereign Yield Spreads Widen Modestly on Fiscal Deficit Trajectory Scrutiny. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "EUR",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2200000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_033",
    "headline": "🌐 Global Foreign Direct Investment Inflows into South Asia Touch Record High of $72 Billion",
    "description": "Global Foreign Direct Investment Inflows into South Asia Touch Record High of $72 Billion. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1400000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_GEO_034",
    "headline": "🌐 Overseas Regional Bank Commercial Real Estate Write-Downs Trigger Brief Global Liquidity Flight",
    "description": "Overseas Regional Bank Commercial Real Estate Write-Downs Trigger Brief Global Liquidity Flight. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 1.8,
      "demandShift": -35,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_GEO_035",
    "headline": "🌐 World Bank Approves $1.5B Low-Interest Energy Transition Development Policy Financing for India",
    "description": "World Bank Approves $1.5B Low-Interest Energy Transition Development Policy Financing for India. Global macro events drive international cross-border portfolio shifts and currency conversion volumes across the 9 foreign currencies in the finite FX model. Central banks and commercial clearing institutions monitor settlement flows.",
    "category": "Global / geopolitical",
    "subcategory": "GEOPOLITICAL_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "TCS",
        "INFY",
        "TATAMOTORS",
        "MARUTI",
        "RELIANCE"
      ],
      "sectors": [
        "Information Technology",
        "Automobiles",
        "Energy"
      ],
      "currencies": [
        "USD",
        "INR",
        "USD"
      ]
    },
    "eventType": "GLOBAL_GEOPOLITICAL_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.8,
      "demandShift": 30,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1800000
    },
    "duration": 75,
    "expiryRules": {
      "decayHalfLife": 45,
      "autoRevert": true,
      "revertFactor": 0.5
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_001",
    "headline": "⚖️ SEBI Surveillance Adds Delta AI (DTAI) to Stage-IV Enhanced Surveillance Measure (ASM) Framework",
    "description": "SEBI Surveillance Adds Delta AI (DTAI) to Stage-IV Enhanced Surveillance Measure (ASM) Framework. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 15,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -15,
      "volatilityMultiplier": 2.5,
      "demandShift": -40,
      "tradingRestriction": "CIRCUIT_BREAKER_DOWN",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_002",
    "headline": "⚖️ Exchange Places Vodafone Idea Under Graded Surveillance Measure (GSM) Stage-II on Volatility",
    "description": "Exchange Places Vodafone Idea Under Graded Surveillance Measure (GSM) Stage-II on Volatility. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "IDEA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.3,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_003",
    "headline": "⚖️ SEBI Removes Tata Motors Securities from Short-Term Surveillance Framework After Orderly Trading",
    "description": "SEBI Removes Tata Motors Securities from Short-Term Surveillance Framework After Orderly Trading. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_004",
    "headline": "⚖️ Surveillance Desk Clears Normal Margin Limits for Mega Cap Conglomerate Derivative Tranches",
    "description": "Surveillance Desk Clears Normal Margin Limits for Mega Cap Conglomerate Derivative Tranches. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.5,
    "affectedAssets": {
      "securities": [
        "RELIANCE"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 3.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_005",
    "headline": "⚖️ Exchange Restores Standard 10% Price Band on Wipro Following Stable Settlement Reconciliations",
    "description": "Exchange Restores Standard 10% Price Band on Wipro Following Stable Settlement Reconciliations. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "WIPRO"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_006",
    "headline": "⚖️ SEBI Surveillance Closes Routine High-Frequency Trading Inquiries with Zero Irregularities Found",
    "description": "SEBI Surveillance Closes Routine High-Frequency Trading Inquiries with Zero Irregularities Found. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.8,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 3.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_007",
    "headline": "⚖️ Exchange Lifts Pre-Open Call Auction Constraints on ITC as Open Interest Distribution Normalizes",
    "description": "Exchange Lifts Pre-Open Call Auction Constraints on ITC as Open Interest Distribution Normalizes. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "ITC"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_008",
    "headline": "⚖️ Surveillance Desk Revises 100% Cash Margin Mandate on Intraday Speculative Derivative Contracts",
    "description": "Surveillance Desk Revises 100% Cash Margin Mandate on Intraday Speculative Derivative Contracts. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -5,
      "volatilityMultiplier": 1.3,
      "demandShift": -40,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_009",
    "headline": "⚖️ 🚨 SEBI Invokes Emergency Surveillance Powers: 1-Hour Trading Halt Imposed on Delta AI (DTAI)",
    "description": "🚨 SEBI Invokes Emergency Surveillance Powers: 1-Hour Trading Halt Imposed on Delta AI (DTAI). SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 20,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -20,
      "volatilityMultiplier": 2.5,
      "demandShift": -40,
      "tradingRestriction": "TRADING_HALT",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_010",
    "headline": "⚖️ Exchange Enforces Mandatory 45-Minute Circuit Breaker Trading Halt on Telecom Asset Following Severe Shock",
    "description": "Exchange Enforces Mandatory 45-Minute Circuit Breaker Trading Halt on Telecom Asset Following Severe Shock. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 14,
    "affectedAssets": {
      "securities": [
        "IDEA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -14,
      "volatilityMultiplier": 2.5,
      "demandShift": -40,
      "tradingRestriction": "TRADING_HALT",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 30,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_011",
    "headline": "⚖️ OpenAI (OAI) Hits Upper Circuit Limit of 20% in Frenetic Post-Listing Secondary Session",
    "description": "OpenAI (OAI) Hits Upper Circuit Limit of 20% in Frenetic Post-Listing Secondary Session. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 20,
    "affectedAssets": {
      "securities": [
        "OAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 20,
      "volatilityMultiplier": 2.5,
      "demandShift": 25,
      "tradingRestriction": "CIRCUIT_BREAKER_UP",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_012",
    "headline": "⚖️ Polymarket (POLY) Locked at 20% Upper Circuit Ceiling; Exchange Orders Match at Maximum Band",
    "description": "Polymarket (POLY) Locked at 20% Upper Circuit Ceiling; Exchange Orders Match at Maximum Band. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 20,
    "affectedAssets": {
      "securities": [
        "POLY"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 20,
      "volatilityMultiplier": 2.5,
      "demandShift": 25,
      "tradingRestriction": "CIRCUIT_BREAKER_UP",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_013",
    "headline": "⚖️ Exchange Reopens Trading Corridor on Stripe (STRP) After Orderly Circuit Breaker Cooling Period",
    "description": "Exchange Reopens Trading Corridor on Stripe (STRP) After Orderly Circuit Breaker Cooling Period. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 10,
    "affectedAssets": {
      "securities": [
        "STRP"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 10,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_014",
    "headline": "⚖️ Canva Normal Secondary Trading Resumes with Calibrated Volatility Limits Fully Enforced",
    "description": "Canva Normal Secondary Trading Resumes with Calibrated Volatility Limits Fully Enforced. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8,
    "affectedAssets": {
      "securities": [
        "CNVA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_015",
    "headline": "⚖️ SEBI Issues Comprehensive Show-Cause Notice to Delta AI Promoters Regarding Block Allocations",
    "description": "SEBI Issues Comprehensive Show-Cause Notice to Delta AI Promoters Regarding Block Allocations. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Negative",
    "impactMagnitude": 12,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": -12,
      "volatilityMultiplier": 2.5,
      "demandShift": -40,
      "tradingRestriction": "SHORT_SELLING_BAN",
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_016",
    "headline": "⚖️ SEBI Dismisses Public Interest Grievance Concerning State Bank Loan Syndication Disclosures",
    "description": "SEBI Dismisses Public Interest Grievance Concerning State Bank Loan Syndication Disclosures. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "SBIN"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_017",
    "headline": "⚖️ Regulatory Audit Affirms Complete Compliance of HDFC Bank Digital Clearing Architecture",
    "description": "Regulatory Audit Affirms Complete Compliance of HDFC Bank Digital Clearing Architecture. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "HDFCBANK"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_018",
    "headline": "⚖️ SEBI Surveillance Completes Review of Private Banking Executive Stock Option Grants with Full Clearance",
    "description": "SEBI Surveillance Completes Review of Private Banking Executive Stock Option Grants with Full Clearance. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "ICICIBANK"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_019",
    "headline": "⚖️ Exchange Arbitration Panel Resolves Minor Institutional Settlement Dispute in Axis Bank Favor",
    "description": "Exchange Arbitration Panel Resolves Minor Institutional Settlement Dispute in Axis Bank Favor. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.8,
    "affectedAssets": {
      "securities": [
        "AXISBANK"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 3.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_020",
    "headline": "⚖️ SEBI Commends Infrastructure Major for Transparent Disclosures in Cross-Border JV Filings",
    "description": "SEBI Commends Infrastructure Major for Transparent Disclosures in Cross-Border JV Filings. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "LT"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_021",
    "headline": "⚖️ Ministry of Corporate Affairs Formal Inquiry Closes with Clean Report on Tata Steel Restructuring",
    "description": "Ministry of Corporate Affairs Formal Inquiry Closes with Clean Report on Tata Steel Restructuring. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.6,
    "affectedAssets": {
      "securities": [
        "TATASTEEL"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_022",
    "headline": "⚖️ Exchange Confirms Reliance Quarterly Shareholding Pattern Conforms Fully to Minimum Public Float",
    "description": "Exchange Confirms Reliance Quarterly Shareholding Pattern Conforms Fully to Minimum Public Float. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "RELIANCE"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_023",
    "headline": "⚖️ SEBI Revises Equity Derivatives Lot Sizes: Market Lot for High-Value Stocks Calibrated for Retail Safety",
    "description": "SEBI Revises Equity Derivatives Lot Sizes: Market Lot for High-Value Stocks Calibrated for Retail Safety. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "HDFCBANK"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_024",
    "headline": "⚖️ Exchange Mandates Stricter Intraday Index Option Position Limits to Curtail Expiry Day Speculation",
    "description": "Exchange Mandates Stricter Intraday Index Option Position Limits to Curtail Expiry Day Speculation. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.8,
    "affectedAssets": {
      "securities": [
        "TCS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.8,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_025",
    "headline": "⚖️ SEBI Introduces Real-Time Extreme Loss Margin (ELM) Surcharge During High-Impact Macro Broadcasts",
    "description": "SEBI Introduces Real-Time Extreme Loss Margin (ELM) Surcharge During High-Impact Macro Broadcasts. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.5,
    "affectedAssets": {
      "securities": [
        "INFY"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_026",
    "headline": "⚖️ Clearing Corporation Enhances Core Settlement Guarantee Fund (SGF) to Record ₹12,000 Crore",
    "description": "Clearing Corporation Enhances Core Settlement Guarantee Fund (SGF) to Record ₹12,000 Crore. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "RELIANCE"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_027",
    "headline": "⚖️ SEBI Mandates Single Weekly Derivative Expiry Per Exchange, Curbing Speculative Volatility Runs",
    "description": "SEBI Mandates Single Weekly Derivative Expiry Per Exchange, Curbing Speculative Volatility Runs. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.6,
    "affectedAssets": {
      "securities": [
        "TATAMOTORS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_028",
    "headline": "⚖️ SEBI Issues Exemplary Governance Rating to ITC for Comprehensive Board Diversity and Audit Controls",
    "description": "SEBI Issues Exemplary Governance Rating to ITC for Comprehensive Board Diversity and Audit Controls. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.2,
    "affectedAssets": {
      "securities": [
        "ITC"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_029",
    "headline": "⚖️ Infosys Ranked Top Corporate ESG Reporter by Securities Advisory Committee for Carbon Neutrality",
    "description": "Infosys Ranked Top Corporate ESG Reporter by Securities Advisory Committee for Carbon Neutrality. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4,
    "affectedAssets": {
      "securities": [
        "INFY"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_030",
    "headline": "⚖️ Tata Consultancy Services Receives Golden Peacock Award for Corporate Stewardship and Compliance",
    "description": "Tata Consultancy Services Receives Golden Peacock Award for Corporate Stewardship and Compliance. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 4.4,
    "affectedAssets": {
      "securities": [
        "TCS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 4.4,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_031",
    "headline": "⚖️ Sun Pharma Board Approves Voluntary Enhanced Related-Party Transaction Disclosure Thresholds",
    "description": "Sun Pharma Board Approves Voluntary Enhanced Related-Party Transaction Disclosure Thresholds. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 3.9,
    "affectedAssets": {
      "securities": [
        "SUNPHARMA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 3.9,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_032",
    "headline": "⚖️ Securities Appellate Tribunal (SAT) Grants Full Stay on Procedural Penalty Imposed on Telecom Carrier",
    "description": "Securities Appellate Tribunal (SAT) Grants Full Stay on Procedural Penalty Imposed on Telecom Carrier. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 8.5,
    "affectedAssets": {
      "securities": [
        "IDEA"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 8.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_033",
    "headline": "⚖️ SAT Directs SEBI to Provide Unredacted Copy of Surveillance Inspection Report to Delta AI",
    "description": "SAT Directs SEBI to Provide Unredacted Copy of Surveillance Inspection Report to Delta AI. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "DTAI"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_REG_034",
    "headline": "⚖️ Supreme Court Panel Affirms Port Concession Award Integrity, Rejecting Competitor Legal Challenge",
    "description": "Supreme Court Panel Affirms Port Concession Award Integrity, Rejecting Competitor Legal Challenge. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ADANIPORTS"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_REG_035",
    "headline": "⚖️ Commercial High Court Dismisses Frivolous Public Interest Petition Against High-Speed Rail Project",
    "description": "Commercial High Court Dismisses Frivolous Public Interest Petition Against High-Speed Rail Project. SEBI and exchange surveillance enforcement actions maintain orderly market functioning, prevent insider abuse, and protect student trading floor clearing integrity. Participants must comply with updated operational rules.",
    "category": "Regulatory / SEBI",
    "subcategory": "SURVEILLANCE_ACTION",
    "priority": "IMPORTANT",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "LT"
      ],
      "sectors": [
        "Technology",
        "Financial Services",
        "Telecommunications"
      ],
      "currencies": [
        "INR"
      ]
    },
    "eventType": "REGULATORY_SURVEILLANCE",
    "classification": "confirmed",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.3,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0,
      "fxReserveDemand": 0
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 0,
      "autoRevert": false,
      "revertFactor": 0
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_001",
    "headline": "🛢️ Brent Crude Spikes 8.2% to $94/bbl Following Unscheduled OPEC+ Emergency Output Reduction",
    "description": "Brent Crude Spikes 8.2% to $94/bbl Following Unscheduled OPEC+ Emergency Output Reduction. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 8.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -8.2,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 1.4,
      "fxReserveDemand": 3000000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_002",
    "headline": "🛢️ Crude Oil Benchmarks Slump 7% as Global Inventories Swell and Non-OPEC Production Surges",
    "description": "Crude Oil Benchmarks Slump 7% as Global Inventories Swell and Non-OPEC Production Surges. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 7,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -1.2,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_003",
    "headline": "🛢️ Strait of Malacca Freight Surcharge Adds $3/bbl to Asian Crude Delivery Landing Premiums",
    "description": "Strait of Malacca Freight Surcharge Adds $3/bbl to Asian Crude Delivery Landing Premiums. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 1,
      "fxReserveDemand": 2500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_004",
    "headline": "🛢️ International Energy Agency Releases 60 Million Barrels from Strategic Petroleum Reserves",
    "description": "International Energy Agency Releases 60 Million Barrels from Strategic Petroleum Reserves. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.8,
      "fxReserveDemand": 1200000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_005",
    "headline": "🛢️ Severe Hurricane Shuts Down 45% of Gulf of Mexico Refining Capacity for 10 Days",
    "description": "Severe Hurricane Shuts Down 45% of Gulf of Mexico Refining Capacity for 10 Days. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Negative",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -7.5,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 1.2,
      "fxReserveDemand": 2800000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_006",
    "headline": "🛢️ Major New Methane Gas Basin Commercialized Ahead of Schedule in Western Offshore Shelf",
    "description": "Major New Methane Gas Basin Commercialized Ahead of Schedule in Western Offshore Shelf. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.9,
      "fxReserveDemand": 1400000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_007",
    "headline": "🛢️ Gold Touches All-Time High of $2,780/oz as Central Banks Continue Record Reserve Buying",
    "description": "Gold Touches All-Time High of $2,780/oz as Central Banks Continue Record Reserve Buying. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.5,
      "fxReserveDemand": 1800000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_008",
    "headline": "🛢️ Silver Rallies 12% to 12-Year High on Explosive Industrial Photovoltaic Solar Demand",
    "description": "Silver Rallies 12% to 12-Year High on Explosive Industrial Photovoltaic Solar Demand. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.6,
      "fxReserveDemand": 1600000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_009",
    "headline": "🛢️ Gold Price Undergoes Sharp 4% Correction Following Strong US Jobs Report and Dollar Rally",
    "description": "Gold Price Undergoes Sharp 4% Correction Following Strong US Jobs Report and Dollar Rally. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -5.4,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.4,
      "fxReserveDemand": 1200000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_010",
    "headline": "🛢️ Platinum Benchmarks Advance 8% on Supply Chokepoints in Southern African Deep Mines",
    "description": "Platinum Benchmarks Advance 8% on Supply Chokepoints in Southern African Deep Mines. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_011",
    "headline": "🛢️ India Gold Import Bill Drops in Volume as Domestic Gold Recycling Hits Multi-Year Highs",
    "description": "India Gold Import Bill Drops in Volume as Domestic Gold Recycling Hits Multi-Year Highs. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.5,
      "fxReserveDemand": 1400000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_012",
    "headline": "🛢️ Copper Cash Surges Past $10,500/T on Acute Global Concentrate Smelting Capacity Deficits",
    "description": "Copper Cash Surges Past $10,500/T on Acute Global Concentrate Smelting Capacity Deficits. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "CRITICAL",
    "sentiment": "Positive",
    "impactMagnitude": 7.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 7.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.6,
      "fxReserveDemand": 2000000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_013",
    "headline": "🛢️ Lithium Carbonate Spot Plunges 8% as Battery Recycling Breakthroughs Boost Available Supply",
    "description": "Lithium Carbonate Spot Plunges 8% as Battery Recycling Breakthroughs Boost Available Supply. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.8,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_014",
    "headline": "🛢️ Nickel Prices Spike on Unexpected Mine Concession Suspension in Southeast Asian Archipelago",
    "description": "Nickel Prices Spike on Unexpected Mine Concession Suspension in Southeast Asian Archipelago. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.4,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.4,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.5,
      "fxReserveDemand": 1800000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_015",
    "headline": "🛢️ High-Purity Zinc Stocks in London Metal Exchange Warehouses Drop to Critical Multi-Week Lows",
    "description": "High-Purity Zinc Stocks in London Metal Exchange Warehouses Drop to Critical Multi-Week Lows. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.3,
      "fxReserveDemand": 1600000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_016",
    "headline": "🛢️ US Dollar Index (DXY) Climbs to 106.8, Triggering Currency Strain Across Asian Deficit Economies",
    "description": "US Dollar Index (DXY) Climbs to 106.8, Triggering Currency Strain Across Asian Deficit Economies. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 1.8,
      "fxReserveDemand": 4000000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_017",
    "headline": "🛢️ RBI Executes Coordinated $3B Interventions in Spot FX Markets, Fortifying Rupee Exchange Stability",
    "description": "RBI Executes Coordinated $3B Interventions in Spot FX Markets, Fortifying Rupee Exchange Stability. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -1.5,
      "fxReserveDemand": 2000000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_018",
    "headline": "🛢️ India Foreign Exchange Reserves Rise to Historic Peak of $705 Billion, Ranking 4th Globally",
    "description": "India Foreign Exchange Reserves Rise to Historic Peak of $705 Billion, Ranking 4th Globally. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.4,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.4,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -1,
      "fxReserveDemand": 1800000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_019",
    "headline": "🛢️ Japanese Yen Weakens Past 158/USD, Prompting Ministry of Finance Emergency Currency Jawboning",
    "description": "Japanese Yen Weakens Past 158/USD, Prompting Ministry of Finance Emergency Currency Jawboning. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 5.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -5.8,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 1.4,
      "fxReserveDemand": 3500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_020",
    "headline": "🛢️ Euro Rebounds 1.2% Against Greenback as European Industrial Sentiment Indicators Turn Positive",
    "description": "Euro Rebounds 1.2% Against Greenback as European Industrial Sentiment Indicators Turn Positive. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.8,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_021",
    "headline": "🛢️ UAE Dirham Local Currency Bilateral Trade Settlement Reaches ₹30,000 Cr Milestone In First Year",
    "description": "UAE Dirham Local Currency Bilateral Trade Settlement Reaches ₹30,000 Cr Milestone In First Year. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.2,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.7,
      "fxReserveDemand": 1600000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_022",
    "headline": "🛢️ India 10-Year Benchmark G-Sec Yield Drops Below 6.95% on Heavy Foreign Institutional Inflows",
    "description": "India 10-Year Benchmark G-Sec Yield Drops Below 6.95% on Heavy Foreign Institutional Inflows. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 6.8,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 6.8,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.6,
      "fxReserveDemand": 1500000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  },
  {
    "id": "NEWS_COMM_023",
    "headline": "🛢️ US 10-Year Treasury Yield Surges to 4.55% as Bond Traders Price in Sticky Inflation prints",
    "description": "US 10-Year Treasury Yield Surges to 4.55% as Bond Traders Price in Sticky Inflation prints. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Negative",
    "impactMagnitude": 6.2,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": -6.2,
      "volatilityMultiplier": 1.6,
      "demandShift": -25,
      "tradingRestriction": null,
      "fxImpactPercent": 0.8,
      "fxReserveDemand": 2200000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_024",
    "headline": "🛢️ State Development Loans (SDL) Spread Over G-Sec Compresses to 32 bps on Robust Fiscal Management",
    "description": "State Development Loans (SDL) Spread Over G-Sec Compresses to 32 bps on Robust Fiscal Management. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5.5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5.5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.5,
      "fxReserveDemand": 1400000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": false
  },
  {
    "id": "NEWS_COMM_025",
    "headline": "🛢️ Sovereign Green Bond Tranche Oversubscribed 3.4x at Concessional Greenium Pricing",
    "description": "Sovereign Green Bond Tranche Oversubscribed 3.4x at Concessional Greenium Pricing. Commodity shocks and foreign exchange rate moves trigger adjustments on the FX Desk. The scarcity pricing engine modulates bid/ask spreads while preserving finite reserve solvency.",
    "category": "Commodities / forex / rates",
    "subcategory": "COMMODITY_FOREX_SHOCK",
    "priority": "BREAKING",
    "sentiment": "Positive",
    "impactMagnitude": 5,
    "affectedAssets": {
      "securities": [
        "ONGC",
        "RELIANCE",
        "ASIANPAINT",
        "MARUTI",
        "HDFCBANK"
      ],
      "sectors": [
        "Energy",
        "Chemicals",
        "Automobiles",
        "Financial Services"
      ],
      "currencies": [
        "USD",
        "INR",
        "EUR",
        "GBP"
      ]
    },
    "eventType": "COMMODITY_FX_EVENT",
    "classification": "macroeconomic",
    "impactParameters": {
      "priceImpactPercent": 5,
      "volatilityMultiplier": 1.6,
      "demandShift": 25,
      "tradingRestriction": null,
      "fxImpactPercent": -0.4,
      "fxReserveDemand": 1200000
    },
    "duration": 60,
    "expiryRules": {
      "decayHalfLife": 30,
      "autoRevert": true,
      "revertFactor": 0.6
    },
    "correctionRules": {
      "linkedRumourId": null,
      "reversalFactor": 1,
      "officialClarification": null
    },
    "trainingEligibility": true
  }
];

// Pre-indexed lookup maps for high-performance retrieval
export const NEWS_PRESETS_BY_ID = new Map(NEWS_PRESETS_LIBRARY.map(p => [p.id, p]));

export const NEWS_PRESETS_BY_CATEGORY = NEWS_PRESET_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = NEWS_PRESETS_LIBRARY.filter(p => p.category === cat);
  return acc;
}, {});

export const NEWS_PRESETS_BY_CLASSIFICATION = ['confirmed', 'macroeconomic', 'speculative', 'rumour', 'correction'].reduce((acc, cls) => {
  acc[cls] = NEWS_PRESETS_LIBRARY.filter(p => p.classification === cls);
  return acc;
}, {});

export const TRAINING_NEWS_PRESETS = NEWS_PRESETS_LIBRARY.filter(p => p.trainingEligibility === true);

// Aliases for consumer flexibility
export const NEWS_CATEGORIES = NEWS_PRESET_CATEGORIES;
export const PRESETS_BY_CATEGORY = NEWS_PRESETS_BY_CATEGORY;
export const PRESETS_BY_ID = NEWS_PRESETS_BY_ID;

export const RUMOUR_CORRECTION_MAP = new Map(
  NEWS_PRESETS_LIBRARY
    .filter(p => p.correctionRules && p.correctionRules.linkedRumourId)
    .map(p => [p.correctionRules.linkedRumourId, p])
);

// Lookup & validation helper functions
export function getPresetById(id) {
  return NEWS_PRESETS_BY_ID.get(id) || null;
}

export function getPresetsByCategory(category) {
  return NEWS_PRESETS_BY_CATEGORY[category] || [];
}

export function getTrainingEligiblePresets() {
  return TRAINING_NEWS_PRESETS;
}

export function getPresetsBySearch(query) {
  if (!query || typeof query !== 'string') return NEWS_PRESETS_LIBRARY;
  const q = query.toLowerCase().trim();
  return NEWS_PRESETS_LIBRARY.filter(p => {
    return (
      p.headline.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q) ||
      p.affectedAssets.securities.some(s => s.toLowerCase().includes(q)) ||
      p.affectedAssets.sectors.some(sec => sec.toLowerCase().includes(q)) ||
      p.affectedAssets.currencies.some(cur => cur.toLowerCase().includes(q))
    );
  });
}

export function getLinkedCorrection(rumourId) {
  return RUMOUR_CORRECTION_MAP.get(rumourId) || null;
}

export function validateNewsPreset(preset) {
  const errors = [];
  if (!preset) return { valid: false, errors: ['Preset is null or undefined'] };

  const requiredFields = [
    'id', 'headline', 'description', 'category', 'subcategory', 'priority',
    'sentiment', 'impactMagnitude', 'affectedAssets', 'eventType', 'classification',
    'impactParameters', 'duration', 'expiryRules', 'correctionRules', 'trainingEligibility'
  ];

  for (const field of requiredFields) {
    if (preset[field] === undefined || preset[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (preset.headline && (preset.headline.length < 10 || preset.headline.length > 200)) {
    errors.push('Headline must be between 10 and 200 characters');
  }

  if (preset.description && (preset.description.length < 20 || preset.description.length > 1000)) {
    errors.push('Description must be between 20 and 1000 characters');
  }

  if (preset.category && !NEWS_PRESET_CATEGORIES.includes(preset.category)) {
    errors.push(`Invalid category: ${preset.category}`);
  }

  if (preset.priority && !['CRITICAL', 'BREAKING', 'IMPORTANT', 'INFORMATION'].includes(preset.priority)) {
    errors.push(`Invalid priority: ${preset.priority}`);
  }

  if (preset.sentiment && !['Positive', 'Negative', 'Neutral'].includes(preset.sentiment)) {
    errors.push(`Invalid sentiment: ${preset.sentiment}`);
  }

  if (preset.classification && !['confirmed', 'macroeconomic', 'speculative', 'rumour', 'correction'].includes(preset.classification)) {
    errors.push(`Invalid classification: ${preset.classification}`);
  }

  if (preset.affectedAssets) {
    if (!Array.isArray(preset.affectedAssets.securities) || !Array.isArray(preset.affectedAssets.sectors) || !Array.isArray(preset.affectedAssets.currencies)) {
      errors.push('affectedAssets must contain securities, sectors, and currencies arrays');
    }
  }

  if (preset.impactParameters) {
    const p = preset.impactParameters;
    if (typeof p.priceImpactPercent !== 'number') errors.push('impactParameters.priceImpactPercent must be a number');
    if (typeof p.volatilityMultiplier !== 'number' || p.volatilityMultiplier < 1.0) errors.push('impactParameters.volatilityMultiplier must be >= 1.0');
    if (typeof p.demandShift !== 'number') errors.push('impactParameters.demandShift must be a number');
    if (typeof p.fxImpactPercent !== 'number') errors.push('impactParameters.fxImpactPercent must be a number');
    if (typeof p.fxReserveDemand !== 'number') errors.push('impactParameters.fxReserveDemand must be a number');
  }

  if (preset.expiryRules) {
    const e = preset.expiryRules;
    if (typeof e.decayHalfLife !== 'number') errors.push('expiryRules.decayHalfLife must be a number');
    if (typeof e.autoRevert !== 'boolean') errors.push('expiryRules.autoRevert must be a boolean');
    if (typeof e.revertFactor !== 'number' || e.revertFactor < 0 || e.revertFactor > 1.0) errors.push('expiryRules.revertFactor must be between 0.0 and 1.0');
  }

  if (preset.correctionRules) {
    const c = preset.correctionRules;
    if (typeof c.reversalFactor !== 'number' || c.reversalFactor < 0) errors.push('correctionRules.reversalFactor must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
