/**
 * SAAMX 2026 — Master Market Event & Narrative Execution Engine
 * Handles multi-asset pricing, cross-currency impact, IPO lifecycles,
 * Bull/Bear stance publishing, Polling engine, and Corporate Crisis state machines.
 */

export function calculateEventImpact(event, fmsState, options = {}) {
  const { impactMultiplier = 1.0, actor = 'Admin' } = options;
  const now = Date.now();

  const nextState = {
    securities: { ...(fmsState?.securities || {}) },
    fxRates: { ...(fmsState?.fxRates || {}) },
    newsEvents: { ...(fmsState?.newsEvents || {}) },
    events: { ...(fmsState?.events || {}) },
    marketState: { ...(fmsState?.marketState || {}) },
    auditLog: [...(fmsState?.auditLog || [])]
  };

  const modifiedSecurities = [];

  // 1. Apply Affected Securities Pricing Impact
  if (event.affectedSecurities && Array.isArray(event.affectedSecurities)) {
    event.affectedSecurities.forEach(item => {
      const ticker = item.ticker;
      const baseImpactPct = (item.impactPercent || 0) * impactMultiplier;
      const sec = nextState.securities[ticker];

      if (sec && sec.status !== 'UNLISTED' && sec.status !== 'Halted' && sec.status !== 'Bankrupt') {
        const prevPrice = Number(sec.currentPrice || sec.basePrice || 100);
        const delta = prevPrice * (baseImpactPct / 100);
        const newPrice = Math.max(0.01, Number((prevPrice + delta).toFixed(2)));

        const priceDriver = {
          timestamp: now,
          previousPrice: prevPrice,
          newPrice: newPrice,
          impactPercent: baseImpactPct,
          reason: 'MARKET_EVENT',
          eventId: event.id,
          headline: event.title || event.headline || 'Market News Update'
        };

        const existingDrivers = sec.priceDrivers || [];
        const updatedDrivers = [priceDriver, ...existingDrivers].slice(0, 15);

        nextState.securities[ticker] = {
          ...sec,
          currentPrice: newPrice,
          previousPrice: prevPrice,
          priceDrivers: updatedDrivers,
          lastUpdated: now
        };

        modifiedSecurities.push({ ticker, prevPrice, newPrice, impactPercent: baseImpactPct });
      }
    });
  }

  // 2. Apply Currency / FX Rate Impact if specified
  if (event.affectedCurrencies && Array.isArray(event.affectedCurrencies)) {
    event.affectedCurrencies.forEach(curr => {
      if (curr === 'USD' && nextState.fxRates.USDINR) {
        const mid = nextState.fxRates.USDINR.midRate || 88.20;
        const fxDeltaPct = (event.fxImpactPercent || (event.marketImpact === 'POSITIVE' ? 0.3 : -0.3)) * impactMultiplier;
        const newMid = Number((mid * (1 + fxDeltaPct / 100)).toFixed(2));
        nextState.fxRates.USDINR = {
          ...nextState.fxRates.USDINR,
          midRate: newMid,
          buyRate: Number((newMid * 1.0045).toFixed(2)),
          sellRate: Number((newMid * 0.9955).toFixed(2)),
          lastUpdated: now
        };
      } else if (curr === 'GBP' && nextState.fxRates.GBPINR) {
        const mid = nextState.fxRates.GBPINR.midRate || 119.40;
        const fxDeltaPct = (event.fxImpactPercent || 0.2) * impactMultiplier;
        const newMid = Number((mid * (1 + fxDeltaPct / 100)).toFixed(2));
        nextState.fxRates.GBPINR = {
          ...nextState.fxRates.GBPINR,
          midRate: newMid,
          buyRate: Number((newMid * 1.0045).toFixed(2)),
          sellRate: Number((newMid * 0.9955).toFixed(2)),
          lastUpdated: now
        };
      } else if (curr === 'EUR' && nextState.fxRates.EURINR) {
        const mid = nextState.fxRates.EURINR.midRate || 103.50;
        const fxDeltaPct = (event.fxImpactPercent || 0.2) * impactMultiplier;
        const newMid = Number((mid * (1 + fxDeltaPct / 100)).toFixed(2));
        nextState.fxRates.EURINR = {
          ...nextState.fxRates.EURINR,
          midRate: newMid,
          buyRate: Number((newMid * 1.0045).toFixed(2)),
          sellRate: Number((newMid * 0.9955).toFixed(2)),
          lastUpdated: now
        };
      }
    });
  }

  // 3. Create News Event entry in fms/newsEvents & fms/events
  const newsId = `NEWS_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newsEntry = {
    id: newsId,
    eventId: event.id,
    sequence: event.sequence || Object.keys(nextState.newsEvents).length + 1,
    headline: event.title || event.headline,
    title: event.title || event.headline,
    shortHeadline: event.shortHeadline || event.title,
    body: event.description,
    description: event.description,
    category: event.category || 'CORPORATE',
    tier: event.tier || 'TIER_3',
    severity: event.tier === 'TIER_1' ? 'CRITICAL' : event.tier === 'TIER_2' ? 'HIGH' : 'MEDIUM',
    marketImpact: event.marketImpact || 'NEUTRAL',
    affectedAssets: event.affectedSecurities?.map(s => s.ticker) || [],
    affectedSecurities: event.affectedSecurities || [],
    affectedCurrencies: event.affectedCurrencies || [],
    affectedSectors: event.affectedSectors || [],
    affectedCountries: event.affectedCountries || [],
    triggeredAt: now,
    audioCue: event.audioCue || 'breaking_news',
    storyline: event.storyline || 'GENERAL_MARKET',
    source: 'SAAMX GLOBAL INTELLIGENCE WIRE'
  };

  nextState.newsEvents[newsId] = newsEntry;
  nextState.events[event.id] = {
    ...event,
    status: 'COMPLETED',
    deployedAt: now,
    modifiedSecurities
  };

  // 4. If Tier 1 or Projector Priority, trigger Takeover on Projector
  if (event.tier === 'TIER_1' || event.projectorPriority) {
    nextState.marketState.takeoverEvent = {
      id: newsId,
      eventId: event.id,
      headline: event.title || event.headline,
      description: event.description,
      tier: event.tier,
      category: event.category,
      audioCue: event.audioCue || 'breaking_news',
      triggeredAt: now,
      affectedAssets: newsEntry.affectedAssets,
      affectedSecurities: newsEntry.affectedSecurities
    };
  }

  // 5. Audit Log Entry
  const auditEntry = {
    id: `AUD_${now}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now,
    actor,
    role: 'admin',
    action: 'DEPLOY_MARKET_EVENT',
    target: event.id,
    reason: `Deployed event ${event.id}: ${event.title}`,
    modifiedCount: modifiedSecurities.length
  };
  nextState.auditLog.unshift(auditEntry);
  if (nextState.auditLog.length > 500) nextState.auditLog.pop();

  return { nextState, newsEntry, modifiedSecurities };
}

/**
 * Advance Vodafone Idea Storyline (Acts 1 to 5)
 */
export function processVodafoneCrisisAct(actNumber, resolutionType = 'RECOVERY', fmsState, options = {}) {
  const now = Date.now();
  const nextState = {
    securities: { ...(fmsState?.securities || {}) },
    newsEvents: { ...(fmsState?.newsEvents || {}) },
    marketState: { ...(fmsState?.marketState || {}) },
    auditLog: [...(fmsState?.auditLog || [])],
    vodafoneCrisis: { ...(fmsState?.vodafoneCrisis || {}) }
  };

  const ticker = 'IDEA';
  const sec = nextState.securities[ticker] || { ticker: 'IDEA', name: 'Vodafone Idea Ltd', basePrice: 16.50, currentPrice: 16.50, status: 'Active' };
  let headline = '';
  let description = '';
  let priceDeltaPct = 0;
  let newStatus = sec.status || 'Active';
  let tier = 'TIER_2';

  switch (actNumber) {
    case 1:
      headline = '🚨 SAAMX SCENARIO: Financial Liquidity Pressure Mounts at Major Indian Telecom';
      description = 'Analysts report delayed vendor disbursements and working capital constraints at a prominent domestic cellular operator.';
      priceDeltaPct = -7.5;
      break;
    case 2:
      headline = '📉 SAAMX SCENARIO: Credit Rating Agencies Downgrade Debt Outlook on Telecommunications Heavyweight';
      description = 'Credit risk assessments cite refinancing vulnerabilities. Corporate bond yields spike while equity counters absorb sustained selling.';
      priceDeltaPct = -14.0;
      break;
    case 3:
      headline = '⚠️ SAAMX SCENARIO: SEBI Surveillance and Department of Telecom Initiate Urgent Inquiry';
      description = 'Regulatory authorities confirm close monitoring of counterparty exposures across banking syndicates and institutional mutual fund holdings.';
      priceDeltaPct = -22.0;
      tier = 'TIER_1';
      break;
    case 4:
      headline = '🛑 SAAMX SCENARIO: Regulatory Trading Halt Imposed on Vodafone Idea (IDEA)';
      description = 'Under SEBI emergency surveillance provisions, order matching in Vodafone Idea (IDEA) is temporarily suspended pending material disclosures.';
      newStatus = 'Halted';
      tier = 'TIER_1';
      break;
    case 5:
    default:
      if (resolutionType === 'RECOVERY') {
        headline = '🟢 SAAMX SCENARIO RESOLUTION: Strategic Sovereign Debt Equity Conversion & Rescue Package Finalized';
        description = 'Consortium agreement secures long-term spectrum debt deferral and fresh capital infusion. Trading resumes with relief rally.';
        newStatus = 'Active';
        priceDeltaPct = 35.0;
        tier = 'TIER_1';
      } else {
        headline = '🔴 SAAMX SCENARIO RESOLUTION: Inability to Refinance Triggers Formal Insolvency Filing for Vodafone Idea';
        description = 'Resolution professionals appointed under bankruptcy code. Equity value heavily impaired across institutional balance sheets.';
        newStatus = 'Bankrupt';
        priceDeltaPct = -85.0;
        tier = 'TIER_1';
      }
      break;
  }

  const prevPrice = Number(sec.currentPrice || sec.basePrice || 16.50);
  const newPrice = newStatus === 'Bankrupt' ? Math.max(0.50, Number((prevPrice * 0.15).toFixed(2))) : Math.max(0.10, Number((prevPrice * (1 + priceDeltaPct / 100)).toFixed(2)));

  nextState.securities[ticker] = {
    ...sec,
    status: newStatus,
    currentPrice: newPrice,
    previousPrice: prevPrice,
    lastUpdated: now,
    priceDrivers: [
      {
        timestamp: now,
        previousPrice: prevPrice,
        newPrice,
        impactPercent: priceDeltaPct,
        reason: 'CRISIS_STORYLINE',
        headline
      },
      ...(sec.priceDrivers || []).slice(0, 14)
    ]
  };

  const newsId = `NEWS_VODAFONE_ACT_${actNumber}_${now}`;
  const newsEntry = {
    id: newsId,
    headline,
    title: headline,
    body: description,
    description,
    category: 'CRISIS',
    tier,
    severity: tier === 'TIER_1' ? 'CRITICAL' : 'HIGH',
    marketImpact: priceDeltaPct >= 0 ? 'BULLISH' : 'BEARISH',
    affectedAssets: [ticker],
    affectedSecurities: [{ ticker, impactPercent: priceDeltaPct }],
    triggeredAt: now,
    storyline: 'VODAFONE_IDEA_CRISIS',
    isSimulationScenario: true
  };

  nextState.newsEvents[newsId] = newsEntry;
  nextState.vodafoneCrisis = {
    activeAct: actNumber,
    lastUpdated: now,
    status: newStatus,
    resolution: actNumber === 5 ? resolutionType : null
  };

  if (tier === 'TIER_1') {
    nextState.marketState.takeoverEvent = {
      id: newsId,
      headline,
      description,
      tier: 'TIER_1',
      category: 'CRISIS',
      triggeredAt: now,
      affectedAssets: [ticker]
    };
  }

  return { nextState, newsEntry };
}

/**
 * Advance IPO Lifecycle (Stages 1 to 8)
 */
export function processIpoStage(ticker, stageName, fmsState, options = {}) {
  const now = Date.now();
  const nextState = {
    securities: { ...(fmsState?.securities || {}) },
    newsEvents: { ...(fmsState?.newsEvents || {}) },
    marketState: { ...(fmsState?.marketState || {}) },
    ipoRegistry: { ...(fmsState?.ipoRegistry || {}) }
  };

  const sec = nextState.securities[ticker] || { ticker, name: ticker, basePrice: 100, currentPrice: 100, status: 'UNLISTED', isIpo: true };
  let status = sec.status;
  let ipoStatus = stageName;
  let visibleToParticipants = options.visibleToParticipants !== undefined ? options.visibleToParticipants : (stageName !== 'HIDDEN');
  let headline = '';
  let description = '';

  switch (stageName) {
    case 'HIDDEN':
      status = 'IPO_STAGED';
      ipoStatus = 'HIDDEN';
      visibleToParticipants = false;
      break;
    case 'RUMOUR':
      headline = `🤫 IPO Rumour Window: Investment Bankers Murmur Mega Listing for ${sec.name || ticker}`;
      description = `Anonymous floor intelligence signals early roadshows being coordinated for ${sec.name || ticker}.`;
      status = 'IPO_STAGED';
      ipoStatus = 'RUMOUR';
      break;
    case 'SPECULATION':
      headline = `📈 Market Speculation: Institutional Desks Assess Target Multiples for ${sec.name || ticker}`;
      description = `Broker commentary anticipates landmark institutional demand across primary technology funds.`;
      status = 'IPO_STAGED';
      ipoStatus = 'SPECULATION';
      break;
    case 'MARKET_CONFIRMATION':
    case 'OFFICIAL_ANNOUNCEMENT':
    case 'ANNOUNCED':
      headline = `📢 Official IPO Announcement: ${sec.name || ticker} to Open Primary Bookbuilding`;
      description = `Issue price set at ₹${sec.basePrice || 100}. Primary subscription window opening shortly on exchange desks.`;
      status = 'IPO_PENDING';
      ipoStatus = 'ANNOUNCED';
      break;
    case 'SUBSCRIPTION_OPEN':
      headline = `🔔 Primary Bookbuilding Open: Teams Can Bid for ${sec.name || ticker} IPO Shares`;
      description = `Subscription gates are active on participant trading desks. Float allotment subject to oversubscription.`;
      status = 'IPO_OPEN';
      ipoStatus = 'SUBSCRIPTION_OPEN';
      break;
    case 'SUBSCRIPTION_CLOSED':
      headline = `⏳ Subscription Books Closed for ${sec.name || ticker} IPO`;
      description = `Primary bidding has concluded. Exchange clearing house is calculating cumulative book oversubscription.`;
      status = 'IPO_CLOSED';
      ipoStatus = 'SUBSCRIPTION_CLOSED';
      break;
    case 'ALLOTMENT':
      headline = `📊 Share Allotment Finalized for ${sec.name || ticker} IPO`;
      description = `Pro-rata equity allocations credited to bidding participant accounts. Listing session commences imminently.`;
      status = 'IPO_ALLOTTED';
      ipoStatus = 'ALLOTMENT_FINALIZED';
      break;
    case 'LISTING':
    default:
      headline = `🚀 Landmark Listing: ${sec.name || ticker} Begins Secondary Trading on SAAMX`;
      description = `Opening auction crosses with explosive floor turnover. Continuous matching is active for all trading desks.`;
      status = 'Active';
      ipoStatus = 'LISTED';
      visibleToParticipants = true;
      break;
  }

  nextState.securities[ticker] = {
    ...sec,
    status,
    isIpo: true,
    ipoStatus,
    ipoStage: stageName,
    visibleToParticipants,
    lastUpdated: now
  };

  let newsEntry = null;
  if (stageName !== 'HIDDEN') {
    const newsId = `NEWS_IPO_${ticker}_${stageName}_${now}`;
    newsEntry = {
      id: newsId,
      headline,
      title: headline,
      body: description,
      description,
      category: 'IPO',
      tier: stageName === 'LISTING' || stageName === 'SUBSCRIPTION_OPEN' ? 'TIER_1' : 'TIER_2',
      severity: stageName === 'LISTING' ? 'CRITICAL' : 'HIGH',
      marketImpact: 'BULLISH',
      affectedAssets: [ticker],
      affectedSecurities: [{ ticker, impactPercent: stageName === 'LISTING' ? 15 : 0 }],
      triggeredAt: now,
      storyline: `IPO_${ticker}`
    };

    nextState.newsEvents[newsId] = newsEntry;
  }

  nextState.ipoRegistry[ticker] = {
    ticker,
    companyName: sec.name || ticker,
    currentStage: stageName,
    status,
    ipoStatus,
    visibleToParticipants,
    lastUpdated: now
  };

  if (stageName === 'LISTING' || stageName === 'SUBSCRIPTION_OPEN') {
    nextState.marketState.takeoverEvent = {
      id: `TAKEOVER_IPO_${ticker}_${now}`,
      headline,
      description,
      tier: 'TIER_1',
      category: 'IPO',
      triggeredAt: now,
      affectedAssets: [ticker]
    };
  }

  return { nextState, newsEntry };
}
