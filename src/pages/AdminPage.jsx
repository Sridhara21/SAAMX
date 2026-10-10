import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';
import { db, ref, onValue } from '../lib/firebase.js';
import MarketStorylineTimeline from '../components/MarketStorylineTimeline.jsx';
import { MASTER_MARKET_EVENTS } from '../lib/marketEventsDataset.js';

// SVG Sparkline drawing for indices and securities
function Sparkline({ isUp, width = 44, height = 16 }) {
  const points = isUp ? "0,14 15,10 30,12 44,2" : "0,2 15,6 30,4 44,14";
  return (
    <svg width={width} height={height} style={{ stroke: isUp ? 'var(--color-rise)' : 'var(--color-fall)', strokeWidth: 1.8, fill: 'none' }}>
      <polyline points={points} />
    </svg>
  );
}

export default function AdminPage({ state, onOpenProfile, adminPassword, connected, coordinator, isCoordinatorOffline }) {
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [timeLeft, setTimeLeft] = useState('60:00');

  // Command Center Navigation Tabs
  const [activeTab, setActiveTab] = useState('timeline'); 
  // 'timeline', 'vodafone', 'ipo', 'bullbear', 'broker', 'newsroom', 'polls', 'fx', 'regulatory', 'securities', 'teams', 'ledger', 'audit'

  // Search & Filter States
  const [secSearch, setSecSearch] = useState('');
  const [secSector, setSecSector] = useState('ALL');
  const [teamSearch, setTeamSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');

  // Active Event & Multiplier
  const [activeEventId, setActiveEventId] = useState(null);
  const [impactMultiplier, setImpactMultiplier] = useState(1.0);
  const [inspectedEvent, setInspectedEvent] = useState(null);

  // Inline Price Edit State
  const [editingSecId, setEditingSecId] = useState(null);
  const [editPrice, setEditPrice] = useState('0');

  // Breaking News Composer State
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsDesc, setNewsDesc] = useState('');
  const [newsCategory, setNewsCategory] = useState('CORPORATE');
  const [newsSeverity, setNewsSeverity] = useState('HIGH');
  const [newsImpactPct, setNewsImpactPct] = useState('5');
  const [newsTargetTicker, setNewsTargetTicker] = useState('');

  // Bull & Bear Editor State
  const [bullStance, setBullStance] = useState('STRONGLY BULLISH');
  const [bullConf, setBullConf] = useState(85);
  const [bullSectors, setBullSectors] = useState('Technology, Financials, Clean Energy');
  const [bullStatement, setBullStatement] = useState('Accelerating institutional inflows and strong AI infrastructure demand provide robust upside momentum.');
  
  const [bearStance, setBearStance] = useState('DEFENSIVE / BEARISH');
  const [bearConf, setBearConf] = useState(78);
  const [bearRiskAreas, setBearRiskAreas] = useState('Telecom, Overvalued Tech, Forex Volatility');
  const [bearStatement, setBearStatement] = useState('Stretched multiples and systemic refinancing headwinds suggest defensive cash positioning.');
  const [debateTopic, setDebateTopic] = useState('AI Megacap Valuations vs Debt Sustainability');

  // Broker Advisory State
  const [brokerName, setBrokerName] = useState('Alpha Floor Advisory');
  const [brokerTicker, setBrokerTicker] = useState('NVDA');
  const [brokerRec, setBrokerRec] = useState('BUY');
  const [brokerConf, setBrokerConf] = useState(82);
  const [brokerReason, setBrokerReason] = useState('Dominant margin expansion and accelerating hyperscale purchase orders.');
  const [brokerRisk, setBrokerRisk] = useState('MEDIUM');

  // Polling Manager State
  const [pollQuestion, setPollQuestion] = useState('Who won the Bull vs Bear Debate Round?');
  const [pollOpt1, setPollOpt1] = useState('🐂 Bull (Growth & Momentum)');
  const [pollOpt2, setPollOpt2] = useState('🐻 Bear (Caution & Risk)');
  const [pollOpt3, setPollOpt3] = useState('⚖️ Neutral / Undecided');
  const [pollDuration, setPollDuration] = useState(180);

  // FX Rate Adjustment State
  const [fxPair, setFxPair] = useState('USDINR');
  const [fxNewRate, setFxNewRate] = useState('');
  const [fxNewSpread, setFxNewSpread] = useState('0.45');
  const [fxReason, setFxReason] = useState('Central bank interest rate adjustment');

  const [resetPhrase, setResetPhrase] = useState('');
  const [resetMode, setResetMode] = useState('EVENT');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Judging Console State
  const [selectedJudge, setSelectedJudge] = useState('judge_1');
  const [selectedHouseCode, setSelectedHouseCode] = useState('T01');
  const [judgeRatings, setJudgeRatings] = useState({
    responseToEvents: 4,
    decisionTiming: 4,
    adaptability: 4,
    riskRecognition: 4,
    forwardPositioning: 4,
    scenarioResilience: 4,
    riskReturnBalance: 3,
    growthAdaptability: 4
  });
  const [judgeNotes, setJudgeNotes] = useState('');
  const [judgeScorecardsList, setJudgeScorecardsList] = useState([]);

  // Penalties State
  const [penaltiesList, setPenaltiesList] = useState([]);
  const [penTeamCode, setPenTeamCode] = useState('T01');
  const [penCategory, setPenCategory] = useState('CARELESS_ORDERS');
  const [penPoints, setPenPoints] = useState(5);
  const [penReason, setPenReason] = useState('Repeated careless invalid orders');
  const [penRuleRef, setPenRuleRef] = useState('RULE-21.1');

  // Results Lifecycle & Analytics State
  const [lifecycleState, setLifecycleState] = useState('LIVE_SCORING');
  const [latestFrozenSnapshot, setLatestFrozenSnapshot] = useState(null);
  const [reconciliationLogs, setReconciliationLogs] = useState([]);
  const [analyticsReport, setAnalyticsReport] = useState(null);

  // Event Control & Configuration State
  const currentEventId = state?.currentEventId || 'EVT_LIVE_MAIN';
  const currentEvent = (state?.events && state?.events[currentEventId]) || {
    eventId: currentEventId,
    eventName: 'SAAMX Inter-Collegiate Market Championship',
    eventDate: '2026-10-15',
    venue: 'Central Financial Auditorium Floor',
    maximumInvestmentHouses: 20,
    teamSize: 3,
    startingCapital: 10000000,
    marketOpenTime: '09:30 AM',
    marketCloseTime: '03:30 PM',
    lunchBreak: '12:00 PM - 01:00 PM',
    resultsTime: '04:00 PM',
    eventStatus: 'REGISTRATION_OPEN',
    eventMode: 'LIVE'
  };

  const [cfgEventName, setCfgEventName] = useState(currentEvent.eventName || 'SAAMX Inter-Collegiate Market Championship');
  const [cfgVenue, setCfgVenue] = useState(currentEvent.venue || 'Central Financial Auditorium Floor');
  const [cfgEventDate, setCfgEventDate] = useState(currentEvent.eventDate || '2026-10-15');
  const [cfgMaxHouses, setCfgMaxHouses] = useState(currentEvent.maximumInvestmentHouses || 20);
  const [cfgTeamSize, setCfgTeamSize] = useState(currentEvent.teamSize || 3);
  const [cfgCapital, setCfgCapital] = useState(currentEvent.startingCapital || 10000000);
  const [cfgOpenTime, setCfgOpenTime] = useState(currentEvent.marketOpenTime || '09:30 AM');
  const [cfgCloseTime, setCfgCloseTime] = useState(currentEvent.marketCloseTime || '03:30 PM');

  // Risk Controls State
  const riskControls = state?.riskControls || {
    circuitBreakerPercent: 10,
    securityPriceBandPercent: 20,
    maxOrderValue: 5000000,
    maxPositionSizePercent: 30,
    concentrationThresholdPercent: 65,
    cashProtection: true,
    shortSellingAllowed: true
  };
  const [cfgCircuit, setCfgCircuit] = useState(riskControls.circuitBreakerPercent || 10);
  const [cfgPriceBand, setCfgPriceBand] = useState(riskControls.securityPriceBandPercent || 20);
  const [cfgMaxOrderVal, setCfgMaxOrderVal] = useState(riskControls.maxOrderValue || 5000000);
  const [cfgMaxPos, setCfgMaxPos] = useState(riskControls.maxPositionSizePercent || 30);
  const [cfgConcentration, setCfgConcentration] = useState(riskControls.concentrationThresholdPercent || 65);
  const [cfgShortSelling, setCfgShortSelling] = useState(riskControls.shortSellingAllowed !== false);

  // Snapshot State
  const [snapshotLabel, setSnapshotLabel] = useState('Pre-Market Baseline Checkpoint');
  const [snapshotType, setSnapshotType] = useState('PRE_MARKET');

  // Credential View Modal
  const [credentialSlipHouse, setCredentialSlipHouse] = useState(null);

  // Universal Confirm Modal
  const [activeModal, setActiveModal] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', action: null, isDangerous: false });

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  // Update digital clock time string
  useEffect(() => {
    const updateTime = () => {
      const now = new Date(Date.now() + serverTimeOffset);
      setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  // Session Clock countdown logic
  useEffect(() => {
    const status = state?.marketState?.status || 'NotStarted';
    const startTime = state?.marketState?.simulationStartTime;
    const durationMins = state?.marketState?.simulationDurationMinutes || 60;
    const pauseOffset = state?.marketState?.pauseTimeOffset || 0;
    const pausedAt = state?.marketState?.pausedAt;

    if (status === 'NotStarted' || !startTime) {
      const minutesStr = String(durationMins).padStart(2, '0');
      setTimeLeft(`${minutesStr}:00`);
      return;
    }

    if (status === 'Closed') {
      setTimeLeft('00:00');
      return;
    }

    const durationMs = durationMins * 60 * 1000;

    const updateClock = () => {
      let elapsedMs = 0;
      const currentServerTime = Date.now() + serverTimeOffset;
      if (status === 'Paused' && pausedAt) {
        elapsedMs = pausedAt - startTime - pauseOffset;
      } else {
        elapsedMs = currentServerTime - startTime - pauseOffset;
      }
      
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateClock();

    if (status === 'Open') {
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
    }
  }, [state?.marketState, serverTimeOffset]);

  // Normalized State Entities
  const securities = useMemo(() => Object.values(state?.securities || {}), [state?.securities]);
  const teams = useMemo(() => Object.values(state?.teams || {}), [state?.teams]);
  const transactions = useMemo(() => Object.values(state?.transactions || []).filter(t => !t.voided), [state?.transactions]);
  const newsEvents = useMemo(() => Object.values(state?.newsEvents || []).sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0)), [state?.newsEvents]);
  const auditLogs = useMemo(() => Object.values(state?.auditLog || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), [state?.auditLog]);
  const firedEvents = useMemo(() => state?.events || {}, [state?.events]);
  const bullBear = useMemo(() => state?.bullBear || {}, [state?.bullBear]);
  const brokerRecs = useMemo(() => Object.values(state?.brokerRecommendations || []).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)), [state?.brokerRecommendations]);
  const polls = useMemo(() => Object.values(state?.polls || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [state?.polls]);
  const vodafoneCrisis = useMemo(() => state?.vodafoneCrisis || { activeAct: 0, status: 'Active' }, [state?.vodafoneCrisis]);
  
  const fxRates = useMemo(() => state?.fxRates || {
    USDINR: { pair: 'USD/INR', midRate: 88.20, spreadPercent: 0.45 },
    GBPINR: { pair: 'GBP/INR', midRate: 119.40, spreadPercent: 0.45 },
    EURINR: { pair: 'EUR/INR', midRate: 103.50, spreadPercent: 0.45 }
  }, [state?.fxRates]);

  const marketIndices = useMemo(() => state?.marketIndices || {
    GLOBAL100: { currentValue: 1000.0, openingValue: 1000.0, changePercent: 0.0 },
    INDIA50: { currentValue: 5000.0, openingValue: 5000.0, changePercent: 0.0 },
    US100: { currentValue: 8000.0, openingValue: 8000.0, changePercent: 0.0 },
    UK100: { currentValue: 4000.0, openingValue: 4000.0, changePercent: 0.0 }
  }, [state?.marketIndices]);

  // Breadth & stats
  const breadth = useMemo(() => {
    const active = securities.filter(s => s.status !== 'UNLISTED');
    let adv = 0, dec = 0, unc = 0;
    active.forEach(s => {
      const cur = s.currentPrice || s.basePrice || 0;
      const open = s.openingPrice || s.basePrice || cur;
      if (cur > open) adv++;
      else if (cur < open) dec++;
      else unc++;
    });
    return { adv, dec, unc, total: active.length };
  }, [securities]);

  const totalTrades = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalTurnoverINR = transactions.reduce((sum, t) => sum + (t.inrEquivalent || (t.quantity * t.price * (t.fxRate || 1))), 0);

  // Five Landmark IPOs
  const ipoUniverse = useMemo(() => [
    { ticker: 'OAI', name: 'OpenAI Inc', sector: 'Artificial Intelligence', exchange: 'NASDAQ', currency: 'USD', basePrice: 420.00 },
    { ticker: 'STRP', name: 'Stripe Payments', sector: 'Financial Technology', exchange: 'NYSE', currency: 'USD', basePrice: 115.00 },
    { ticker: 'CNVA', name: 'Canva Design Tech', sector: 'SaaS / Design', exchange: 'NASDAQ', currency: 'USD', basePrice: 88.00 },
    { ticker: 'DISC', name: 'Discord Platforms', sector: 'Consumer Internet', exchange: 'NYSE', currency: 'USD', basePrice: 64.00 },
    { ticker: 'POLY', name: 'Polymarket Protocol', sector: 'Prediction Tech', exchange: 'NASDAQ', currency: 'USD', basePrice: 45.00 }
  ], []);

  // Operational Timeline Radar: NOW -> NEXT -> LATER
  const eventRadar = useMemo(() => {
    const firedIds = new Set([
      ...Object.keys(firedEvents || {}),
      ...newsEvents.map(n => n.id).filter(Boolean)
    ]);

    // NOW: Most recently triggered event
    let nowEvent = null;
    if (newsEvents.length > 0 && newsEvents[0]) {
      const topNews = newsEvents[0];
      nowEvent = {
        title: topNews.headline || topNews.title,
        description: topNews.description,
        tier: topNews.tier || 'TIER_1',
        category: topNews.category || 'MARKET_EVENT',
        triggeredAt: topNews.triggeredAt || Date.now()
      };
    } else {
      nowEvent = {
        title: 'SAAMX Global Pre-Open Session Active',
        description: 'Session parameters initialized across all desks. Ready for market open.',
        tier: 'TIER_1',
        category: 'GLOBAL_MACRO',
        triggeredAt: Date.now()
      };
    }

    // Unfired events from MASTER_MARKET_EVENTS
    const upcoming = (MASTER_MARKET_EVENTS || []).filter(e => !firedIds.has(e.id));
    const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
    const laterEvents = upcoming.slice(1, 4);

    return { nowEvent, nextEvent, laterEvents };
  }, [firedEvents, newsEvents]);

  const triggerConfirm = (title, message, action, isDangerous = false) => {
    setConfirmConfig({ title, message, action, isDangerous });
    setActiveModal('CONFIRM_MODAL');
  };

  // -------------------------------------------------------------
  // OPERATIONAL ACTION HANDLERS
  // -------------------------------------------------------------
  const handleStartSession = () => {
    triggerConfirm('Start Market Session', 'Open the central exchange for continuous trading across all desks?', async () => {
      await apiFetch('/api/admin/start-market', { method: 'POST', headers: { 'X-FMS-Password': adminPassword } });
    });
  };

  const handlePauseSession = () => {
    triggerConfirm('Pause Trading Session', 'Temporarily halt order execution on all participant desks?', async () => {
      await apiFetch('/api/admin/pause-market', { method: 'POST', headers: { 'X-FMS-Password': adminPassword } });
    });
  };

  const handleEmergencyHalt = () => {
    triggerConfirm('EMERGENCY MARKET HALT', '🚨 CRITICAL: Halt trading across all securities and suspend order execution immediately?', async () => {
      await apiFetch('/api/admin/market-wide-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action: 'FREEZE_ALL' })
      });
    }, true);
  };

  const handleTriggerEvent = async (evt) => {
    try {
      setActiveEventId(evt.id);
      await apiFetch('/api/events/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ event: evt, impactMultiplier, actor: 'Admin Command' })
      });
    } catch (e) {
      alert('Error deploying event: ' + e.message);
    }
  };

  const handleToggleTakeover = async (evt) => {
    try {
      await apiFetch('/api/admin/set-takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          headline: evt.title,
          description: evt.description,
          tier: evt.tier,
          category: evt.category
        })
      });
    } catch (e) {
      alert('Error triggering takeover: ' + e.message);
    }
  };

  const handleVodafoneAdvance = async (actNum, resolutionType = 'RECOVERY') => {
    triggerConfirm(
      `Advance Vodafone Idea to Act ${actNum}`,
      `Trigger ${actNum === 5 ? `Resolution (${resolutionType})` : `Act ${actNum}`} on Vodafone Idea (IDEA)?`,
      async () => {
        await apiFetch('/api/crisis/vodafone/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ actNumber: actNum, resolutionType })
        });
      },
      actNum >= 4
    );
  };

  const handleIpoAdvance = async (ticker, stageName, visible = undefined) => {
    try {
      await apiFetch('/api/ipo/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ ticker, stageName, visibleToParticipants: visible })
      });
    } catch (e) {
      alert('Error advancing IPO: ' + e.message);
    }
  };

  const handleToggleIpoVisibility = async (ticker, currentVal) => {
    try {
      const nextVal = !currentVal;
      await apiFetch('/api/ipo/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ ticker, visibleToParticipants: nextVal })
      });
    } catch (e) {
      alert('Error changing IPO visibility: ' + e.message);
    }
  };

  const handlePublishBullBear = async (role) => {
    try {
      const isBull = role === 'bull';
      await apiFetch('/api/bull-bear/statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          role,
          stance: isBull ? bullStance : bearStance,
          confidence: isBull ? bullConf : bearConf,
          targetSectors: isBull ? bullSectors.split(',').map(s => s.trim()) : [],
          riskAreas: !isBull ? bearRiskAreas.split(',').map(s => s.trim()) : [],
          statement: isBull ? bullStatement : bearStatement
        })
      });
      alert(`Published ${role.toUpperCase()} statement to Market Intelligence!`);
    } catch (e) {
      alert('Error publishing statement: ' + e.message);
    }
  };

  const handleTriggerDebate = async () => {
    triggerConfirm('Trigger Bull vs Bear Debate', `Broadcast live debate on topic: "${debateTopic}"?`, async () => {
      await apiFetch('/api/bull-bear/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ topic: debateTopic, round: 1, active: true })
      });
    });
  };

  const handleCreatePoll = async () => {
    try {
      const opts = [pollOpt1, pollOpt2, pollOpt3].filter(Boolean);
      await apiFetch('/api/polls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ question: pollQuestion, options: opts, durationSeconds: pollDuration })
      });
      alert('Market poll broadcast live to all participants!');
    } catch (e) {
      alert('Error creating poll: ' + e.message);
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await apiFetch('/api/polls/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ pollId })
      });
    } catch (e) {
      alert('Error closing poll: ' + e.message);
    }
  };

  const handlePublishBrokerRec = async () => {
    try {
      await apiFetch('/api/broker/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          brokerName,
          ticker: brokerTicker,
          recommendation: brokerRec,
          confidence: brokerConf,
          reasoning: brokerReason,
          riskLevel: brokerRisk
        })
      });
      alert(`Broker recommendation for ${brokerTicker} published!`);
    } catch (e) {
      alert('Error publishing recommendation: ' + e.message);
    }
  };

  const handlePublishCustomNews = async () => {
    if (!newsHeadline) return alert('Headline required.');
    try {
      const customEvt = {
        id: `CUSTOM_EVT_${Date.now()}`,
        title: newsHeadline,
        description: newsDesc || newsHeadline,
        category: newsCategory,
        tier: newsSeverity === 'CRITICAL' ? 'TIER_1' : newsSeverity === 'HIGH' ? 'TIER_2' : 'TIER_3',
        affectedSecurities: newsTargetTicker ? [{ ticker: newsTargetTicker.toUpperCase(), impactPercent: Number(newsImpactPct) || 0 }] : [],
        projectorPriority: newsSeverity === 'CRITICAL' || newsSeverity === 'HIGH'
      };

      await apiFetch('/api/events/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ event: customEvt, actor: 'Newsroom Admin' })
      });
      setNewsHeadline('');
      setNewsDesc('');
      alert('Breaking news dispatched to market wire!');
    } catch (e) {
      alert('Error dispatching news: ' + e.message);
    }
  };

  const handleFxShock = async (pair, deltaPct, reason) => {
    const rateObj = fxRates[pair];
    if (!rateObj) return;
    const newMid = Number((rateObj.midRate * (1 + deltaPct / 100)).toFixed(2));
    triggerConfirm(`FX Shock: ${pair} ${deltaPct > 0 ? '+' : ''}${deltaPct}%`, `Adjust ${pair} to ₹${newMid} (${reason})?`, async () => {
      await apiFetch('/api/admin/set-fx-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ pair, midRate: newMid, spreadPercent: 0.45, reason })
      });
    });
  };

  const handleMasterReset = () => {
    if (resetPhrase !== 'CONFIRM RESET') {
      alert('Please type CONFIRM RESET exactly to execute disaster recovery.');
      return;
    }
    triggerConfirm(
      '🚨 MASTER STATE RESET',
      `Erase active transactions and re-initialize the 2,061 security universe in ${resetMode} mode?`,
      async () => {
        await apiFetch('/api/admin/reset-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ mode: resetMode, resetPhrase })
        });
        setResetPhrase('');
        alert('Database state re-seeded successfully!');
      },
      true
    );
  };

  // Event Control Handlers
  const handleSaveEventConfig = async () => {
    try {
      const res = await apiFetch('/api/event/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          eventId: currentEventId,
          eventName: cfgEventName,
          venue: cfgVenue,
          eventDate: cfgEventDate,
          maximumInvestmentHouses: Number(cfgMaxHouses),
          teamSize: Number(cfgTeamSize),
          startingCapital: Number(cfgCapital),
          marketOpenTime: cfgOpenTime,
          marketCloseTime: cfgCloseTime
        })
      });
      if (res.error) alert(`Error: ${res.error}`);
      else alert('Event configuration saved successfully!');
    } catch (e) {
      alert(`Network error saving event: ${e.message}`);
    }
  };

  const handleSetEventLifecycle = async (newStatus) => {
    triggerConfirm(
      `Transition Event to ${newStatus}`,
      `Are you sure you want to transition the live event status to ${newStatus}?`,
      async () => {
        const res = await apiFetch('/api/event/lifecycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, status: newStatus })
        });
        if (res.error) alert(res.error);
        else alert(`Event transitioned to ${newStatus}`);
      }
    );
  };

  const handleSetEventMode = async (newMode) => {
    triggerConfirm(
      `Switch Event Mode to ${newMode}`,
      `Switching mode to ${newMode} isolates data between live and test executions. Proceed?`,
      async () => {
        const res = await apiFetch('/api/event/mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, mode: newMode })
        });
        if (res.error) alert(res.error);
        else alert(`Event mode updated to ${newMode}`);
      }
    );
  };

  const handleCreateSnapshot = async (type = snapshotType, label = snapshotLabel) => {
    try {
      const res = await apiFetch('/api/event/snapshot/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ eventId: currentEventId, snapshotType: type, label, createdBy: 'Admin' })
      });
      if (res.error) alert(`Snapshot error: ${res.error}`);
      else alert(`Snapshot created successfully: ${res.snapshot?.snapshotId}`);
    } catch (e) {
      alert(`Error creating snapshot: ${e.message}`);
    }
  };

  const handleRestoreSnapshot = async (snapshotId) => {
    triggerConfirm(
      `Restore Snapshot ${snapshotId}`,
      `⚠️ Restoring this snapshot will roll back market state, portfolios, and orders to this checkpoint. Proceed?`,
      async () => {
        const res = await apiFetch('/api/event/snapshot/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ snapshotId })
        });
        if (res.error) alert(`Restore failed: ${res.error}`);
        else alert(`Event restored successfully from snapshot ${snapshotId}!`);
      },
      true
    );
  };

  const handleSaveRiskControls = async () => {
    try {
      const res = await apiFetch('/api/admin/risk-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          circuitBreakerPercent: Number(cfgCircuit),
          securityPriceBandPercent: Number(cfgPriceBand),
          maxOrderValue: Number(cfgMaxOrderVal),
          maxPositionSizePercent: Number(cfgMaxPos),
          concentrationThresholdPercent: Number(cfgConcentration),
          shortSellingAllowed: Boolean(cfgShortSelling)
        })
      });
      if (res.error) alert(`Risk update failed: ${res.error}`);
      else alert('Risk controls updated successfully across all order desks!');
    } catch (e) {
      alert(`Network error: ${e.message}`);
    }
  };

  const handleSeedRehearsal = async () => {
    triggerConfirm(
      'Seed Rehearsal Environment',
      'Generate test schools, test Investment Houses, and test delegates in Rehearsal Mode without affecting live event data?',
      async () => {
        const res = await apiFetch('/api/admin/rehearsal/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ count: 5 })
        });
        if (res.error) alert(res.error);
        else alert(`Seeded ${res.createdHouses?.length || 5} rehearsal houses successfully!`);
      }
    );
  };

  const handleResetRehearsal = async () => {
    triggerConfirm(
      'Reset Rehearsal Data',
      'Wipe all test rehearsal schools and houses? Live event data will NOT be touched.',
      async () => {
        const res = await apiFetch('/api/admin/rehearsal/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword }
        });
        if (res.error) alert(res.error);
        else alert('Rehearsal environment reset cleanly.');
      },
      true
    );
  };

  const handleVerifyRegistration = async (registrationId, assignedCode) => {
    try {
      const res = await apiFetch('/api/admin/registration/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          registrationId,
          assignedTeamCode: assignedCode,
          verifiedBy: 'Chief Administrator'
        })
      });
      if (res.error) alert(res.error);
      else {
        alert(`Investment House verified! Team Code: ${res.investmentHouse?.teamCode}, PIN: ${res.investmentHouse?.credentials?.tempPin}`);
        if (res.investmentHouse) setCredentialSlipHouse(res.investmentHouse);
      }
    } catch (e) {
      alert(`Verification error: ${e.message}`);
    }
  };

  const handleParticipantLifecycle = async (investmentHouseId, status) => {
    try {
      const res = await apiFetch('/api/admin/participant/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ investmentHouseId, status, actor: 'Admin' })
      });
      if (res.error) alert(res.error);
      else alert(`Participant status updated to ${status}`);
    } catch (e) {
      alert(`Lifecycle update error: ${e.message}`);
    }
  };

  // Available house options
  const houseOptions = useMemo(() => {
    const list = [];
    if (state?.teams) {
      const teamsArr = Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
      teamsArr.forEach(t => {
        const c = t.teamCode || t.id;
        if (c && !list.some(x => x.code === c)) {
          list.push({ code: c, name: t.teamName || t.investmentHouseName || c });
        }
      });
    }
    if (state?.registrations) {
      Object.values(state.registrations).forEach(r => {
        const c = r.teamCode || r.investmentHouse?.teamCode;
        if (c && !list.some(x => x.code === c)) {
          list.push({ code: c, name: r.investmentHouseName || r.schoolName || c });
        }
      });
    }
    if (list.length === 0) {
      for (let i = 1; i <= 20; i++) {
        const c = `T${String(i).padStart(2, '0')}`;
        list.push({ code: c, name: `Investment House ${i}` });
      }
    }
    return list;
  }, [state?.teams, state?.registrations]);

  // Load Judging Scorecards
  const loadJudgingScorecards = async () => {
    try {
      const res = await apiFetch(`/api/judging/scorecards?eventId=${currentEventId}`);
      if (res && res.scorecards) {
        setJudgeScorecardsList(res.scorecards);
      }
    } catch (e) {
      console.warn('Error fetching scorecards:', e);
    }
  };

  // Save Judge Scorecard
  const handleSaveJudgeCard = async (status = 'SUBMITTED') => {
    try {
      const payload = {
        eventId: currentEventId,
        judgeId: selectedJudge,
        teamId: selectedHouseCode,
        teamCode: selectedHouseCode,
        decisionMakingRatings: {
          responseToEvents: Number(judgeRatings.responseToEvents),
          decisionTiming: Number(judgeRatings.decisionTiming),
          adaptability: Number(judgeRatings.adaptability),
          riskRecognition: Number(judgeRatings.riskRecognition)
        },
        futurePotentialRatings: {
          forwardPositioning: Number(judgeRatings.forwardPositioning),
          scenarioResilience: Number(judgeRatings.scenarioResilience),
          opportunityBalance: Number(judgeRatings.riskReturnBalance),
          capacityToAdapt: Number(judgeRatings.growthAdaptability)
        },
        notes: judgeNotes,
        status
      };
      const res = await apiFetch('/api/judging/scorecard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify(payload)
      });
      if (res.error) alert(res.error);
      else {
        alert(`Scorecard for ${selectedHouseCode} saved by ${selectedJudge}!`);
        loadJudgingScorecards();
      }
    } catch (e) {
      alert(`Save error: ${e.message}`);
    }
  };

  // Moderate Discrepancy
  const handleModerateScorecard = async (houseCode) => {
    const notes = prompt(`Chief Judge Moderation notes for House ${houseCode}:`, 'Harmonized judge ratings after panel discussion.');
    if (!notes) return;
    try {
      const res = await apiFetch('/api/judging/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          eventId: currentEventId,
          teamCode: houseCode,
          chiefJudgeId: 'chief_judge',
          moderationNotes: notes
        })
      });
      if (res.error) alert(res.error);
      else {
        alert(`Moderation recorded for House ${houseCode}!`);
        loadJudgingScorecards();
      }
    } catch (e) {
      alert(`Moderation error: ${e.message}`);
    }
  };

  // Load Penalties
  const loadPenalties = async () => {
    try {
      const res = await apiFetch(`/api/penalties?eventId=${currentEventId}`);
      if (res && res.penalties) {
        setPenaltiesList(res.penalties);
      }
    } catch (e) {
      console.warn('Error loading penalties:', e);
    }
  };

  // Apply Penalty
  const handleApplyPenalty = async () => {
    if (!penReason) return alert('Penalty reason is required.');
    try {
      const res = await apiFetch('/api/penalties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          eventId: currentEventId,
          teamCode: penTeamCode,
          category: penCategory,
          penaltyPoints: Number(penPoints),
          reason: penReason,
          ruleReference: penRuleRef,
          operator: 'Admin'
        })
      });
      if (res.error) alert(res.error);
      else {
        alert(`Penalty applied: -${penPoints} pts to ${penTeamCode}!`);
        setPenReason('');
        loadPenalties();
      }
    } catch (e) {
      alert(`Penalty error: ${e.message}`);
    }
  };

  // Resolve Appeal
  const handleResolvePenaltyAppeal = async (penaltyId, resolution) => {
    const reason = prompt(`Reason for ${resolution}:`, resolution === 'APPROVE_APPEAL' ? 'Operational misunderstanding resolved.' : 'Rule violation affirmed after review.');
    if (!reason) return;
    try {
      const res = await apiFetch('/api/penalties/resolve-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          penaltyId,
          resolution,
          resolutionReason: reason,
          reviewedBy: 'Chief Judge'
        })
      });
      if (res.error) alert(res.error);
      else {
        alert(`Appeal resolved: ${resolution}`);
        loadPenalties();
      }
    } catch (e) {
      alert(`Appeal resolution error: ${e.message}`);
    }
  };

  // Freeze Valuation Snapshot
  const handleFreezeValuation = async () => {
    triggerConfirm(
      '🔒 Freeze Closing Valuation Snapshot',
      'At 15:30 Market Close, freeze an immutable closing valuation snapshot across all Investment Houses. This snapshot will be cryptographically locked for scoring. Proceed?',
      async () => {
        const res = await apiFetch('/api/event/valuation/freeze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, reason: 'Official 15:30 Closing Freeze' })
        });
        if (res.error) alert(res.error);
        else {
          setLatestFrozenSnapshot(res.snapshot);
          setLifecycleState('VALUATION_FROZEN');
          alert(`Closing valuation snapshot frozen! Snapshot Hash: ${res.snapshot?.snapshotHash?.slice(0, 12)}... (${res.housesCount} houses locked)`);
        }
      }
    );
  };

  // Run Reconciliation
  const handleRunReconciliation = async () => {
    triggerConfirm(
      '⚖️ Run Settlement & Reconciliation',
      'Execute 15:30-15:45 trade ledger and cash reconciliation. Discrepancies will be logged to the audit trail without altering the immutable valuation snapshot. Proceed?',
      async () => {
        const res = await apiFetch('/api/event/reconciliation/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, notes: 'Post-market ledger audit and reconciliation' })
        });
        if (res.error) alert(res.error);
        else {
          setReconciliationLogs(res.reconciliationRecord?.adjustments || []);
          setLifecycleState('RECONCILIATION');
          alert(`Reconciliation complete! Discrepancies noted: ${res.discrepanciesCount || 0}. Audit record created.`);
        }
      }
    );
  };

  // Approve Results
  const handleApproveResults = async () => {
    triggerConfirm(
      '✅ Chief Judge Sign-off & Result Approval',
      'Confirm that judging scorecards, risk calculations, penalties, and reconciliations have been verified. Transition lifecycle to APPROVED?',
      async () => {
        const res = await apiFetch('/api/results/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, approver: 'Chief Judge', notes: 'All scores validated.' })
        });
        if (res.error) alert(res.error);
        else {
          setLifecycleState('APPROVED');
          alert('Official results successfully approved by Chief Judge!');
        }
      }
    );
  };

  // Publish Results
  const handlePublishResults = async () => {
    triggerConfirm(
      '🏆 Publish Official Competition Results',
      'Publish the official final results! The leaderboard will change from PROVISIONAL to OFFICIAL FINAL RESULTS and become visible on all public screens and projector. Proceed?',
      async () => {
        const res = await apiFetch('/api/results/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ eventId: currentEventId, publisher: 'Chief Judge' })
        });
        if (res.error) alert(res.error);
        else {
          setLifecycleState('PUBLISHED');
          alert('SAAMX Official Final Results are now LIVE and PUBLISHED!');
        }
      }
    );
  };

  // Reopen Results
  const handleReopenResults = async () => {
    const reason = prompt('State the official audit reason to reopen published results:');
    if (!reason) return;
    try {
      const res = await apiFetch('/api/results/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ eventId: currentEventId, reason })
      });
      if (res.error) alert(res.error);
      else {
        setLifecycleState('RECONCILIATION');
        alert(`Results reopened for revision: ${reason}`);
      }
    } catch (e) {
      alert(`Reopen error: ${e.message}`);
    }
  };

  // Load Event Analytics
  const loadEventAnalytics = async () => {
    try {
      const res = await apiFetch(`/api/analytics/event-report?eventId=${currentEventId}`);
      if (res && res.report) {
        setAnalyticsReport(res.report);
      }
    } catch (e) {
      console.warn('Analytics report error:', e);
    }
  };

  // Refresh tab data on change
  useEffect(() => {
    if (activeTab === 'judging') loadJudgingScorecards();
    if (activeTab === 'penalties') loadPenalties();
    if (activeTab === 'analytics') loadEventAnalytics();
  }, [activeTab, currentEventId]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px', color: '#F8FAFC' }}>
      
      {/* ========================================================================= */}
      {/* ZONE 1: COMMAND CENTER HEADER                                             */}
      {/* ========================================================================= */}
      <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              SAAMX OPERATIONS CONTROL
            </span>
            <span style={{ background: connected ? '#065F3E' : '#7F1D1D', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem' }}>
              {connected ? '● FIREBASE HEALTHY' : '○ DISCONNECTED'}
            </span>
            <span style={{ background: '#334155', color: '#E2E8F0', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.72rem' }}>
              COORDINATOR: {coordinator?.owner?.toUpperCase() || 'STANDBY'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'monospace', fontSize: '1.9rem', color: '#F8FAFC', margin: '6px 0 0 0', fontWeight: 900, letterSpacing: '0.5px' }}>
            SAAMX Market Command Center
          </h1>
          <p style={{ margin: '3px 0 0 0', color: '#94A3B8', fontSize: '0.82rem' }}>
            Central Executive Orchestrator &bull; Living Event Narrative &bull; Real-Time Multi-Asset Telemetry &bull; Surveillance Control
          </p>
        </div>

        {/* Live Telemetry Clocks & Session Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '8px 16px', borderRadius: '8px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>SIMULATION CLOCK</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>
              {currentTimeStr || '10:00:00 AM'}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 700 }}>
              REMAINING: {timeLeft}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleStartSession} style={{ padding: '7px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}>
                ▶ START MARKET
              </button>
              <button onClick={handlePauseSession} style={{ padding: '7px 12px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}>
                ⏸ PAUSE
              </button>
            </div>
            <button onClick={handleEmergencyHalt} style={{ padding: '6px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}>
              🛑 EMERGENCY HALT
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPERATIONAL RADAR: CURRENTLY LIVE (NOW) -> NEXT EVENT -> UPCOMING (LATER) */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        border: '1.5px solid #38BDF8',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              OPERATIONAL MISSION CONTROL — EVENT TIMELINE RADAR
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>
            Strict 3-Tier Execution &bull; Idempotent Broadcasts
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          
          {/* 1. CURRENTLY LIVE (NOW) */}
          <div style={{ background: '#090D16', border: '1px solid #059669', borderRadius: '8px', padding: '14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ background: '#059669', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                ● CURRENTLY LIVE (NOW)
              </span>
              <span style={{ color: '#34D399', fontSize: '0.72rem', fontWeight: 800 }}>
                {eventRadar.nowEvent?.tier || 'TIER_1'}
              </span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#F8FAFC', lineHeight: '1.3', margin: '6px 0 4px 0' }}>
              {eventRadar.nowEvent?.title}
            </div>
            <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              {eventRadar.nowEvent?.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                Category: {eventRadar.nowEvent?.category || 'MARKET'}
              </span>
              <button
                onClick={() => handleToggleTakeover({ title: eventRadar.nowEvent?.title, description: eventRadar.nowEvent?.description, tier: eventRadar.nowEvent?.tier, category: eventRadar.nowEvent?.category })}
                style={{ padding: '4px 10px', background: '#334155', color: '#38BDF8', border: '1px solid #475569', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Projector Takeover ⚡
              </button>
            </div>
          </div>

          {/* 2. NEXT EVENT */}
          <div style={{ background: '#090D16', border: '1px solid #D97706', borderRadius: '8px', padding: '14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ background: '#D97706', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                ⚡ NEXT SCHEDULED (NEXT)
              </span>
              <span style={{ color: '#FCD34D', fontSize: '0.72rem', fontWeight: 800 }}>
                {eventRadar.nextEvent ? `Seq #${eventRadar.nextEvent.sequence || 1} • ${eventRadar.nextEvent.tier || 'TIER_1'}` : 'QUEUE COMPLETED'}
              </span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#F8FAFC', lineHeight: '1.3', margin: '6px 0 4px 0' }}>
              {eventRadar.nextEvent?.title || 'All primary scheduled narrative events triggered'}
            </div>
            <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              {eventRadar.nextEvent?.description || 'The floor has completed all master timeline sequences.'}
            </p>
            {eventRadar.nextEvent && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                  Scheduled: {eventRadar.nextEvent.scheduledTime || `${eventRadar.nextEvent.triggerMinute || 0}m`}
                </span>
                <button
                  onClick={() => triggerConfirm(`Deploy Event #${eventRadar.nextEvent.sequence}`, `Trigger "${eventRadar.nextEvent.title}" immediately to all desks?`, () => handleTriggerEvent(eventRadar.nextEvent))}
                  style={{ padding: '5px 12px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  ⚡ DEPLOY NOW →
                </button>
              </div>
            )}
          </div>

          {/* 3. UPCOMING PIPELINE (LATER) */}
          <div style={{ background: '#090D16', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ background: '#334155', color: '#E2E8F0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                ⏳ UPCOMING PIPELINE (LATER)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                {eventRadar.laterEvents.length} queued
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eventRadar.laterEvents.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontStyle: 'italic' }}>No further pending events.</div>
              ) : (
                eventRadar.laterEvents.map((evt, idx) => (
                  <div key={evt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1E293B', padding: '6px 10px', borderRadius: '4px', fontSize: '0.72rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>
                      <span style={{ color: '#38BDF8', fontWeight: 800, marginRight: '6px' }}>#{evt.sequence || idx + 1}</span>
                      <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{evt.title}</span>
                    </div>
                    <span style={{ color: evt.tier === 'TIER_1' ? '#F87171' : '#FCD34D', fontWeight: 800, fontSize: '0.66rem' }}>
                      {evt.tier}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZONE 2: LIVE MARKET OVERVIEW (INDICES + FX + BREADTH)                     */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        
        {/* Breadth Card */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>MARKET BREADTH</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ color: '#34D399', fontWeight: 900, fontSize: '1.1rem' }}>🟢 {breadth.adv} ADV</span>
            <span style={{ color: '#F87171', fontWeight: 900, fontSize: '1.1rem' }}>🔴 {breadth.dec} DEC</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
            Unchanged: {breadth.unc} &bull; Universe: {breadth.total}
          </div>
        </div>

        {/* Global 100 Index */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>SAAMX GLOBAL 100</span>
            <Sparkline isUp={(marketIndices.GLOBAL100?.changePercent || 0) >= 0} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
            {(marketIndices.GLOBAL100?.currentValue || 1000).toFixed(1)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (marketIndices.GLOBAL100?.changePercent || 0) >= 0 ? '#34D399' : '#F87171' }}>
            {(marketIndices.GLOBAL100?.changePercent || 0) >= 0 ? '+' : ''}{(marketIndices.GLOBAL100?.changePercent || 0).toFixed(2)}%
          </span>
        </div>

        {/* India 50 Index */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>SAAMX INDIA 50</span>
            <Sparkline isUp={(marketIndices.INDIA50?.changePercent || 0) >= 0} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
            {(marketIndices.INDIA50?.currentValue || 5000).toFixed(1)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (marketIndices.INDIA50?.changePercent || 0) >= 0 ? '#34D399' : '#F87171' }}>
            {(marketIndices.INDIA50?.changePercent || 0) >= 0 ? '+' : ''}{(marketIndices.INDIA50?.changePercent || 0).toFixed(2)}%
          </span>
        </div>

        {/* US 100 Index */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>SAAMX US 100</span>
            <Sparkline isUp={(marketIndices.US100?.changePercent || 0) >= 0} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
            {(marketIndices.US100?.currentValue || 8000).toFixed(1)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (marketIndices.US100?.changePercent || 0) >= 0 ? '#34D399' : '#F87171' }}>
            {(marketIndices.US100?.changePercent || 0) >= 0 ? '+' : ''}{(marketIndices.US100?.changePercent || 0).toFixed(2)}%
          </span>
        </div>

        {/* USD / INR Spot */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>USD / INR SPOT</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
            ₹{(fxRates.USDINR?.midRate || 88.20).toFixed(2)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            Spread: {fxRates.USDINR?.spreadPercent || 0.45}%
          </span>
        </div>

        {/* Total Turnover */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800 }}>TOTAL FLOOR TURNOVER</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FCD34D', marginTop: '4px' }}>
            ₹{(totalTurnoverINR / 10000000).toFixed(2)} Cr
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            Trades: {totalTrades} &bull; Vol: {totalVolume.toLocaleString()}
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* COMMAND NAVIGATION TABS STRIP                                             */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'event-control', label: '🎛️ Event Control Centre' },
          { id: 'registrations', label: '🏛️ Registrations & Houses' },
          { id: 'judging', label: '⚖️ Judging Console' },
          { id: 'penalties', label: '🛡️ Penalties & Appeals' },
          { id: 'results-lifecycle', label: '🏆 Results & Publication' },
          { id: 'analytics', label: '📊 Event Analytics' },
          { id: 'timeline', label: '⏱ Master Timeline (315 Evts)' },
          { id: 'vodafone', label: '⚠️ Vodafone Idea Crisis' },
          { id: 'ipo', label: '🚀 IPO Command Center' },
          { id: 'bullbear', label: '🐂 Bull & Bear Arena' },
          { id: 'broker', label: '💼 Broker Intelligence' },
          { id: 'newsroom', label: '📢 Breaking News Wire' },
          { id: 'polls', label: '📊 Polling Engine' },
          { id: 'fx', label: '💱 Forex Command' },
          { id: 'regulatory', label: '🏛 SEBI Surveillance' },
          { id: 'securities', label: '📈 Securities Universe' },
          { id: 'teams', label: '👥 Teams & Portfolios' },
          { id: 'ledger', label: '📑 Trade Ledger' },
          { id: 'audit', label: '🛡 Audit & Reset' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === tab.id ? '#1E293B' : 'transparent',
              color: activeTab === tab.id ? '#38BDF8' : '#94A3B8',
              border: activeTab === tab.id ? '1px solid #334155' : '1px solid transparent',
              borderBottom: activeTab === tab.id ? '2px solid #38BDF8' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
        <a
          href="#/floor-ops"
          style={{
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.82rem',
            background: '#334155',
            color: '#FCD34D',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🧭 Floor Operations Desk ↗
        </a>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT PANELS                                                        */}
      {/* ========================================================================= */}

      {/* 1. MASTER STORYLINE TIMELINE */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Modifier Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1E293B', padding: '12px 18px', borderRadius: '8px', border: '1px solid #334155', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC' }}>GLOBAL IMPACT MULTIPLIER:</span>
              {[0.5, 1.0, 1.5, 2.0].map(mult => (
                <button
                  key={mult}
                  onClick={() => setImpactMultiplier(mult)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    background: impactMultiplier === mult ? '#2563EB' : '#0F172A',
                    color: impactMultiplier === mult ? '#fff' : '#94A3B8',
                    border: '1px solid #334155',
                    cursor: 'pointer'
                  }}
                >
                  {mult}x
                </button>
              ))}
            </div>

            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Select any event from the 315-signal library below to deploy live pricing & news updates.
            </span>
          </div>

          <MarketStorylineTimeline
            activeEventId={activeEventId}
            firedEvents={firedEvents}
            onTriggerEvent={handleTriggerEvent}
            onToggleTakeover={handleToggleTakeover}
            onInspectEvent={(evt) => setInspectedEvent(evt)}
            currentSimTime={currentTimeStr}
          />
        </div>
      )}

      {/* 2. VODAFONE IDEA CRISIS DECK */}
      {activeTab === 'vodafone' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#DC2626', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
                SAAMX SIMULATION SCENARIO
              </span>
              <span style={{ color: '#FCD34D', fontSize: '0.82rem', fontWeight: 800 }}>
                Hypothetical Corporate Distress Storyline
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              The Hidden Telecom Liquidity Crisis (Vodafone Idea — IDEA)
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Multi-act escalating corporate distress narrative teaching risk management, credit spreads, and asset diversification.
            </p>
          </div>

          {/* Crisis Acts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            
            {/* Act 1 */}
            <div style={{ background: '#0F172A', border: vodafoneCrisis.activeAct >= 1 ? '2px solid #38BDF8' : '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.75rem', color: '#38BDF8' }}>ACT 1 &bull; MORNING</span>
                <span style={{ fontSize: '0.68rem', color: '#F87171', fontWeight: 800 }}>IMPACT: -7.5%</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '8px 0 6px 0', color: '#fff' }}>Financial Liquidity Rumours</h3>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.4' }}>
                Unidentified telecom operator faces vendor payment delays and liquidity concerns.
              </p>
              <button
                onClick={() => handleVodafoneAdvance(1)}
                style={{ marginTop: '12px', width: '100%', padding: '6px', borderRadius: '4px', background: '#2563EB', color: '#fff', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                {vodafoneCrisis.activeAct >= 1 ? '✓ Deployed (Re-fire)' : 'Deploy Act 1'}
              </button>
            </div>

            {/* Act 2 */}
            <div style={{ background: '#0F172A', border: vodafoneCrisis.activeAct >= 2 ? '2px solid #38BDF8' : '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.75rem', color: '#FBBF24' }}>ACT 2 &bull; PRESSURE</span>
                <span style={{ fontSize: '0.68rem', color: '#F87171', fontWeight: 800 }}>IMPACT: -14%</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '8px 0 6px 0', color: '#fff' }}>Credit Rating Downgrade</h3>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.4' }}>
                Credit agencies downgrade debt outlook. Bond yields spike; heavy institutional selling.
              </p>
              <button
                onClick={() => handleVodafoneAdvance(2)}
                style={{ marginTop: '12px', width: '100%', padding: '6px', borderRadius: '4px', background: '#2563EB', color: '#fff', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                {vodafoneCrisis.activeAct >= 2 ? '✓ Deployed (Re-fire)' : 'Deploy Act 2'}
              </button>
            </div>

            {/* Act 3 */}
            <div style={{ background: '#0F172A', border: vodafoneCrisis.activeAct >= 3 ? '2px solid #38BDF8' : '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.75rem', color: '#F87171' }}>ACT 3 &bull; REVEAL</span>
                <span style={{ fontSize: '0.68rem', color: '#F87171', fontWeight: 800 }}>IMPACT: -22%</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '8px 0 6px 0', color: '#fff' }}>SEBI Surveillance Inquiry</h3>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.4' }}>
                Company formally identified as Vodafone Idea. Regulators monitor systemic banking exposure.
              </p>
              <button
                onClick={() => handleVodafoneAdvance(3)}
                style={{ marginTop: '12px', width: '100%', padding: '6px', borderRadius: '4px', background: '#DC2626', color: '#fff', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                {vodafoneCrisis.activeAct >= 3 ? '✓ Deployed (Re-fire)' : 'Deploy Act 3'}
              </button>
            </div>

            {/* Act 4 */}
            <div style={{ background: '#0F172A', border: vodafoneCrisis.activeAct >= 4 ? '2px solid #38BDF8' : '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.75rem', color: '#EF4444' }}>ACT 4 &bull; SUSPENSION</span>
                <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 800 }}>STATUS: HALTED</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '8px 0 6px 0', color: '#fff' }}>Regulatory Trading Halt</h3>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.4' }}>
                Emergency trading suspension on IDEA. Projector takeover warns trading floor.
              </p>
              <button
                onClick={() => handleVodafoneAdvance(4)}
                style={{ marginTop: '12px', width: '100%', padding: '6px', borderRadius: '4px', background: '#B91C1C', color: '#fff', fontWeight: 900, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
              >
                {vodafoneCrisis.activeAct >= 4 ? '✓ Deployed (Re-fire)' : 'Deploy Trading Halt'}
              </button>
            </div>

          </div>

          {/* Act 5: Selectable Resolution */}
          <div style={{ background: '#0F172A', border: '1px solid #475569', borderRadius: '8px', padding: '18px' }}>
            <span style={{ fontWeight: 900, fontSize: '0.8rem', color: '#FCD34D' }}>ACT 5 &bull; ADMIN RESOLUTION SELECTION</span>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: '4px 0 14px 0' }}>
              The Admin controls the final outcome of the scenario. Choose whether the company recovers via strategic restructuring or files for insolvency.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleVodafoneAdvance(5, 'RECOVERY')}
                style={{ flex: 1, minWidth: '220px', padding: '12px', borderRadius: '6px', background: '#065F3E', color: '#D1FAE5', border: '1px solid #10B981', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
              >
                🟢 RESOLUTION A: RESCUE & RESTRUCTURING (+35% Relief Rally)
              </button>

              <button
                onClick={() => handleVodafoneAdvance(5, 'BANKRUPTCY')}
                style={{ flex: 1, minWidth: '220px', padding: '12px', borderRadius: '6px', background: '#7F1D1D', color: '#FEE2E2', border: '1px solid #EF4444', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
              >
                🔴 RESOLUTION B: HYPOTHETICAL INSOLVENCY (-85% Collapse)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IPO COMMAND CENTER */}
      {activeTab === 'ipo' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ background: '#2563EB', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
                PRIMARY CAPITAL MARKETS
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
                SAAMX Primary Market & IPO Stage Control
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Full lifecycle stage switcher and participant visibility controllers for simulated IPOs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].forEach(tk => handleToggleIpoVisibility(tk, false));
                }}
                style={{ padding: '6px 12px', background: '#334155', color: '#CBD5E1', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                👁️ Hide All IPOs
              </button>
              <button
                onClick={() => {
                  ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].forEach(tk => handleToggleIpoVisibility(tk, true));
                }}
                style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                👁️ Make All Visible
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ipoUniverse.map(ipo => {
              const liveSec = securities.find(s => s.ticker === ipo.ticker) || {};
              const currentStage = liveSec.ipoStage || (liveSec.status === 'Active' ? 'LISTING' : 'HIDDEN');
              const isVisible = liveSec.visibleToParticipants !== false && currentStage !== 'HIDDEN';
              const bidsCount = liveSec.bids ? Object.keys(liveSec.bids).length : 0;
              const totalSub = liveSec.totalSubscription || 0;
              const subMultiple = liveSec.subscriptionMultiple || (liveSec.totalUnits ? (totalSub / liveSec.totalUnits).toFixed(2) : '0.00');

              return (
                <div key={ipo.ticker} style={{ background: '#0F172A', border: `1.5px solid ${isVisible ? '#059669' : '#475569'}`, borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.2rem', color: '#38BDF8', background: '#1E293B', padding: '2px 8px', borderRadius: '4px' }}>
                        {ipo.ticker}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                        {ipo.name}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#94A3B8', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                        {ipo.sector} &bull; {ipo.currency} &bull; Issue: {ipo.currency === 'USD' ? '$' : '₹'}{ipo.basePrice}
                      </span>
                    </div>

                    {/* Visibility & Stage Status Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleIpoVisibility(ipo.ticker, isVisible)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          background: isVisible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isVisible ? '#34D399' : '#F87171',
                          border: `1.5px solid ${isVisible ? '#10B981' : '#EF4444'}`
                        }}
                      >
                        {isVisible ? '👁️ VISIBLE TO TEAMS' : '🚫 HIDDEN FROM TEAMS'} (Click to Toggle)
                      </button>

                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: currentStage === 'LISTING' ? '#059669' : currentStage === 'SUBSCRIPTION_OPEN' ? '#D97706' : currentStage === 'HIDDEN' ? '#475569' : '#2563EB',
                        color: '#FFF'
                      }}>
                        STAGE: {currentStage.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#1E293B', padding: '10px 14px', borderRadius: '6px', fontSize: '0.76rem' }}>
                    <div><span style={{ color: '#94A3B8' }}>Status:</span> <strong style={{ color: '#FFF' }}>{liveSec.status || 'IPO_STAGED'}</strong></div>
                    <div><span style={{ color: '#94A3B8' }}>Offer Float:</span> <strong style={{ color: '#FFF' }}>{(liveSec.availableFloat || liveSec.totalUnits || 1000).toLocaleString()}</strong></div>
                    <div><span style={{ color: '#94A3B8' }}>Bidding Teams:</span> <strong style={{ color: '#38BDF8' }}>{bidsCount}</strong></div>
                    <div><span style={{ color: '#94A3B8' }}>Total Demand:</span> <strong style={{ color: '#FCD34D' }}>{totalSub.toLocaleString()} units ({subMultiple}x)</strong></div>
                  </div>

                  {/* Stage Advance Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
                      Set IPO Stage & Lifecycle Transition:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'HIDDEN', label: '🚫 Hidden (Offline)', bg: '#475569' },
                        { key: 'RUMOUR', label: '1. 🤫 Rumour', bg: '#64748B' },
                        { key: 'ANNOUNCED', label: '2. 📢 Announced', bg: '#2563EB' },
                        { key: 'SUBSCRIPTION_OPEN', label: '3. 🔔 Subscription Open', bg: '#D97706' },
                        { key: 'SUBSCRIPTION_CLOSED', label: '4. ⏳ Closed', bg: '#EA580C' },
                        { key: 'ALLOTMENT', label: '5. 📊 Allotment', bg: '#7C3AED' },
                        { key: 'LISTING', label: '6. 🚀 Floor Listing', bg: '#059669' }
                      ].map(stg => (
                        <button
                          key={stg.key}
                          onClick={() => handleIpoAdvance(ipo.ticker, stg.key, stg.key !== 'HIDDEN')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '5px',
                            fontWeight: 900,
                            fontSize: '0.74rem',
                            background: currentStage === stg.key ? stg.bg : '#334155',
                            color: '#fff',
                            border: currentStage === stg.key ? '2px solid #FFF' : '1px solid #475569',
                            cursor: 'pointer',
                            boxShadow: currentStage === stg.key ? '0 0 10px rgba(255,255,255,0.2)' : 'none'
                          }}
                        >
                          {stg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. BULL & BEAR ARENA */}
      {activeTab === 'bullbear' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#845508', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              FLOOR SENTIMENT ORCHESTRATOR
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Bull 🐂 vs Bear 🐻 Stance & Live Debate Console
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Publish market viewpoints from physical floor analysts and trigger interactive live debate showdowns.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Bull Console */}
            <div style={{ background: '#0F172A', border: '1px solid #10B981', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#34D399' }}>🐂 BULL OPERATOR CONSOLE</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34D399' }}>Confidence: {bullConf}%</span>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>BULL OUTLOOK STANCE</label>
                <input
                  type="text"
                  value={bullStance}
                  onChange={(e) => setBullStance(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>TARGET SECTORS</label>
                <input
                  type="text"
                  value={bullSectors}
                  onChange={(e) => setBullSectors(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>BULL STATEMENT & RATIONALE</label>
                <textarea
                  rows={3}
                  value={bullStatement}
                  onChange={(e) => setBullStatement(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <button
                onClick={() => handlePublishBullBear('bull')}
                style={{ padding: '10px', borderRadius: '6px', background: '#059669', color: '#fff', fontWeight: 900, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
              >
                📢 Publish Bull Stance to Wire
              </button>
            </div>

            {/* Bear Console */}
            <div style={{ background: '#0F172A', border: '1px solid #EF4444', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#F87171' }}>🐻 BEAR OPERATOR CONSOLE</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F87171' }}>Confidence: {bearConf}%</span>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>BEAR OUTLOOK STANCE</label>
                <input
                  type="text"
                  value={bearStance}
                  onChange={(e) => setBearStance(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>VULNERABLE / RISK SECTORS</label>
                <input
                  type="text"
                  value={bearRiskAreas}
                  onChange={(e) => setBearRiskAreas(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>BEAR STATEMENT & RATIONALE</label>
                <textarea
                  rows={3}
                  value={bearStatement}
                  onChange={(e) => setBearStatement(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <button
                onClick={() => handlePublishBullBear('bear')}
                style={{ padding: '10px', borderRadius: '6px', background: '#DC2626', color: '#fff', fontWeight: 900, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
              >
                📢 Publish Bear Stance to Wire
              </button>
            </div>

          </div>

          {/* Live Debate Trigger */}
          <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>LIVE DEBATE TOPIC</label>
              <input
                type="text"
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }}
              />
            </div>
            <button
              onClick={handleTriggerDebate}
              style={{ padding: '12px 20px', borderRadius: '6px', background: '#D97706', color: '#fff', fontWeight: 900, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
            >
              ⚔️ Trigger Floor Debate Showdown
            </button>
          </div>
        </div>
      )}

      {/* 5. BROKER INTELLIGENCE */}
      {activeTab === 'broker' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#0284C7', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              ADVISORY & BROKER INTELLIGENCE
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Stock Broker Advisory Terminal & Consensus Engine
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Publish advisory calls (BUY, SELL, HOLD) that feed directly into the Participant Market Intelligence Consensus.
            </p>
          </div>

          {/* New Recommendation Composer */}
          <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>BROKER DESK</label>
              <input type="text" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>TICKER</label>
              <input type="text" value={brokerTicker} onChange={(e) => setBrokerTicker(e.target.value.toUpperCase())} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px', fontFamily: 'monospace' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>CALL</label>
              <select value={brokerRec} onChange={(e) => setBrokerRec(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px', fontWeight: 800 }}>
                <option value="BUY">🟢 BUY</option>
                <option value="SELL">🔴 SELL</option>
                <option value="HOLD">🟡 HOLD</option>
                <option value="WATCHLIST">👀 WATCHLIST</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>CONFIDENCE %</label>
              <input type="number" value={brokerConf} onChange={(e) => setBrokerConf(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>ANALYTICAL RATIONALE</label>
              <input type="text" value={brokerReason} onChange={(e) => setBrokerReason(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
            </div>

            <button
              onClick={handlePublishBrokerRec}
              style={{ padding: '10px', borderRadius: '4px', background: '#0284C7', color: '#fff', fontWeight: 900, fontSize: '0.82rem', border: 'none', cursor: 'pointer', height: '36px' }}
            >
              Publish Call
            </button>
          </div>

          {/* Active Broker Calls Stream */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '10px', color: '#F8FAFC' }}>Recent Broker Advisory Reports ({brokerRecs.length})</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brokerRecs.map(rec => (
                <div key={rec.id} style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#38BDF8' }}>{rec.ticker}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.75rem', padding: '2px 6px', borderRadius: '3px', background: rec.recommendation === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : rec.recommendation === 'SELL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: rec.recommendation === 'BUY' ? '#34D399' : rec.recommendation === 'SELL' ? '#F87171' : '#FBBF24' }}>
                        {rec.recommendation} ({rec.confidence}%)
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>by {rec.brokerName}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '4px' }}>{rec.reasoning}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{new Date(rec.publishedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. BREAKING NEWS CONSOLE */}
      {activeTab === 'newsroom' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#DC2626', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              BREAKING NEWSROOM DESK
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Live Wire Headline Composer & Projector Takeover
            </h2>
          </div>

          <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 800 }}>BREAKING HEADLINE</label>
              <input type="text" placeholder="e.g. RBI Announces Unexpected 25 bps Repo Rate Cut" value={newsHeadline} onChange={(e) => setNewsHeadline(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 800, marginTop: '4px' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 800 }}>DETAILED WIRE BODY</label>
              <textarea rows={3} placeholder="Full market context and sector implications..." value={newsDesc} onChange={(e) => setNewsDesc(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '0.85rem', marginTop: '4px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>CATEGORY</label>
                <select value={newsCategory} onChange={(e) => setNewsCategory(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }}>
                  <option value="CORPORATE">Corporate</option>
                  <option value="GLOBAL_MACRO">Global Macro</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="REGULATORY">Regulatory</option>
                  <option value="CURRENCY">Currency</option>
                  <option value="IPO">IPO</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>SEVERITY (TAKEOVER TRIGGER)</label>
                <select value={newsSeverity} onChange={(e) => setNewsSeverity(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px', fontWeight: 800 }}>
                  <option value="MEDIUM">Medium (Wire Only)</option>
                  <option value="HIGH">High (Banner Alert)</option>
                  <option value="CRITICAL">Critical (Projector Full Takeover)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>TARGET TICKER (OPTIONAL)</label>
                <input type="text" placeholder="e.g. INFY" value={newsTargetTicker} onChange={(e) => setNewsTargetTicker(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px', fontFamily: 'monospace' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>PRICE IMPACT %</label>
                <input type="number" value={newsImpactPct} onChange={(e) => setNewsImpactPct(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
              </div>
            </div>

            <button
              onClick={handlePublishCustomNews}
              style={{ padding: '12px', borderRadius: '6px', background: '#DC2626', color: '#fff', fontWeight: 900, fontSize: '0.9rem', border: 'none', cursor: 'pointer', marginTop: '6px' }}
            >
              🚨 Broadcast Breaking News Wire
            </button>
          </div>
        </div>
      )}

      {/* 7. POLLING ENGINE */}
      {activeTab === 'polls' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#7C3AED', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              INTERACTIVE SENTIMENT POLLING
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Participant Sentiment Poll Engine
            </h2>
          </div>

          {/* New Poll Creator */}
          <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>POLL QUESTION</label>
              <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', marginTop: '4px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>OPTION 1</label>
                <input type="text" value={pollOpt1} onChange={(e) => setPollOpt1(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>OPTION 2</label>
                <input type="text" value={pollOpt2} onChange={(e) => setPollOpt2(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>OPTION 3</label>
                <input type="text" value={pollOpt3} onChange={(e) => setPollOpt3(e.target.value)} style={{ width: '100%', background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', marginTop: '4px' }} />
              </div>
            </div>

            <button
              onClick={handleCreatePoll}
              style={{ padding: '10px', borderRadius: '6px', background: '#7C3AED', color: '#fff', fontWeight: 900, fontSize: '0.85rem', border: 'none', cursor: 'pointer', marginTop: '6px' }}
            >
              🚀 Broadcast Live Sentiment Poll
            </button>
          </div>

          {/* Active Polls List */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '10px', color: '#F8FAFC' }}>Recent Market Polls ({polls.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {polls.map(p => {
                const totalVotes = Object.values(p.votes || {}).length;
                return (
                  <div key={p.id} style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px', background: p.status === 'OPEN' ? '#059669' : '#475569', color: '#fff' }}>
                          {p.status}
                        </span>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>{p.question}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                        {(p.options || []).map(opt => {
                          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                          return (
                            <span key={opt.id} style={{ fontSize: '0.78rem', color: '#38BDF8', fontWeight: 700 }}>
                              {opt.text}: <strong>{opt.votes || 0} ({pct}%)</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {p.status === 'OPEN' && (
                      <button
                        onClick={() => handleClosePoll(p.id)}
                        style={{ padding: '6px 12px', borderRadius: '4px', background: '#DC2626', color: '#fff', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                      >
                        Close Poll
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 8. FOREX & CURRENCY COMMAND */}
      {activeTab === 'fx' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#0D9488', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              CURRENCY & FX CONTROLLER
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Foreign Exchange Scenario & Rate Management
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {['USDINR', 'GBPINR', 'EURINR'].map(pair => {
              const obj = fxRates[pair] || {};
              return (
                <div key={pair} style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: '#38BDF8' }}>{obj.pair || pair}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Spread: {obj.spreadPercent || 0.45}%</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>
                    ₹{(obj.midRate || 88.20).toFixed(2)}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button onClick={() => handleFxShock(pair, 1.5, 'Foreign capital outflow shock')} style={{ flex: 1, padding: '6px', background: '#065F3E', color: '#D1FAE5', border: 'none', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                      +1.5% Appreciate
                    </button>
                    <button onClick={() => handleFxShock(pair, -1.5, 'Domestic currency strengthening')} style={{ flex: 1, padding: '6px', background: '#7F1D1D', color: '#FEE2E2', border: 'none', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                      -1.5% Depreciate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. REGULATORY SURVEILLANCE */}
      {activeTab === 'regulatory' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#B91C1C', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              SEBI SURVEILLANCE & CIRCUIT BREAKERS
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Market Surveillance & Emergency Intervention
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                triggerConfirm('Market-Wide Freeze', 'Freeze trading across all 2,061 securities?', async () => {
                  await apiFetch('/api/admin/market-wide-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
                    body: JSON.stringify({ action: 'FREEZE_ALL' })
                  });
                });
              }}
              style={{ flex: 1, minWidth: '220px', padding: '14px', borderRadius: '8px', background: '#7F1D1D', color: '#FEE2E2', border: '1px solid #EF4444', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              🛑 HALT ALL SECURITIES (MARKET-WIDE FREEZE)
            </button>

            <button
              onClick={() => {
                triggerConfirm('Resume All Securities', 'Lift halts and resume trading on all active securities?', async () => {
                  await apiFetch('/api/admin/market-wide-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
                    body: JSON.stringify({ action: 'RESUME_ALL' })
                  });
                });
              }}
              style={{ flex: 1, minWidth: '220px', padding: '14px', borderRadius: '8px', background: '#065F3E', color: '#D1FAE5', border: '1px solid #10B981', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              🟢 RESUME ALL TRADING (CLEAR SURVEILLANCE HALTS)
            </button>
          </div>
        </div>
      )}

      {/* 10. SECURITIES UNIVERSE TABLE */}
      {activeTab === 'securities' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>2,061 Master Securities Directory</h2>
            <input
              type="text"
              placeholder="Search ticker, company..."
              value={secSearch}
              onChange={(e) => setSecSearch(e.target.value)}
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '8px' }}>TICKER</th>
                  <th style={{ padding: '8px' }}>NAME</th>
                  <th style={{ padding: '8px' }}>TYPE</th>
                  <th style={{ padding: '8px' }}>SECTOR</th>
                  <th style={{ padding: '8px' }}>EXCHANGE</th>
                  <th style={{ padding: '8px' }}>PRICE</th>
                  <th style={{ padding: '8px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {securities
                  .filter(s => !secSearch || s.ticker?.toLowerCase().includes(secSearch.toLowerCase()) || s.name?.toLowerCase().includes(secSearch.toLowerCase()))
                  .slice(0, 100)
                  .map(s => (
                    <tr key={s.ticker} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800, color: '#38BDF8' }}>{s.ticker}</td>
                      <td style={{ padding: '8px', color: '#fff' }}>{s.name}</td>
                      <td style={{ padding: '8px', color: '#CBD5E1' }}>{s.assetClass || s.type}</td>
                      <td style={{ padding: '8px', color: '#94A3B8' }}>{s.sector}</td>
                      <td style={{ padding: '8px', color: '#94A3B8' }}>{s.exchange}</td>
                      <td style={{ padding: '8px', fontWeight: 800, color: '#34D399' }}>₹{(s.currentPrice || s.basePrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem', background: s.status === 'Active' ? '#065F3E' : '#7F1D1D', color: '#fff' }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. TEAMS DIRECTORY */}
      {activeTab === 'teams' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>Participant Desks & Portfolios (20 Teams)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {teams.map(t => (
              <div key={t.teamCode} style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, color: '#38BDF8', fontSize: '1rem', fontFamily: 'monospace' }}>{t.teamCode}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34D399' }}>
                    INR Cash: ₹{(t.cashWallets?.INR || t.cashBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '4px' }}>{t.teamName}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '6px' }}>
                  USD: ${(t.cashWallets?.USD || 0).toFixed(2)} &bull; GBP: £{(t.cashWallets?.GBP || 0).toFixed(2)} &bull; EUR: €{(t.cashWallets?.EUR || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. TRADE LEDGER */}
      {activeTab === 'ledger' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>Live Floor Trade Ledger ({transactions.length})</h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '8px' }}>TX ID</th>
                  <th style={{ padding: '8px' }}>TIME</th>
                  <th style={{ padding: '8px' }}>TEAM</th>
                  <th style={{ padding: '8px' }}>ACTION</th>
                  <th style={{ padding: '8px' }}>TICKER</th>
                  <th style={{ padding: '8px' }}>QTY</th>
                  <th style={{ padding: '8px' }}>PRICE</th>
                  <th style={{ padding: '8px' }}>TOTAL (₹)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 100).map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #1E293B' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94A3B8' }}>{tx.id}</td>
                    <td style={{ padding: '8px', color: '#CBD5E1' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#38BDF8' }}>{tx.teamCode}</td>
                    <td style={{ padding: '8px', fontWeight: 900, color: tx.action === 'BUY' ? '#34D399' : '#F87171' }}>{tx.action}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800, color: '#fff' }}>{tx.ticker}</td>
                    <td style={{ padding: '8px', color: '#fff' }}>{tx.quantity}</td>
                    <td style={{ padding: '8px', color: '#CBD5E1' }}>₹{tx.priceAtExecution || tx.price}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#FCD34D' }}>₹{(tx.inrEquivalent || tx.totalValue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 13. AUDIT & DISASTER RECOVERY */}
      {activeTab === 'audit' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ background: '#EF4444', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              DISASTER RECOVERY & AUDIT LOGS
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', margin: '8px 0 0 0' }}>
              Master State Re-Seed & Audit Trail
            </h2>
          </div>

          <div style={{ background: '#0F172A', border: '1px solid #EF4444', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontWeight: 900, color: '#F87171', fontSize: '0.95rem' }}>⚠️ DANGER ZONE: MASTER DATABASE RE-SEED</span>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Type <strong>CONFIRM RESET</strong> below to wipe all transactions and restore the full 2,061 security universe.
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Type CONFIRM RESET"
                value={resetPhrase}
                onChange={(e) => setResetPhrase(e.target.value)}
                style={{ flex: 1, background: '#1E293B', border: '1px solid #EF4444', color: '#fff', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace' }}
              />
              <select
                value={resetMode}
                onChange={(e) => setResetMode(e.target.value)}
                style={{ background: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '4px', fontWeight: 800 }}
              >
                <option value="EVENT">EVENT MODE (Full Day)</option>
                <option value="TEST">TEST / DEMO MODE</option>
              </select>
              <button
                onClick={handleMasterReset}
                style={{ padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 900, cursor: 'pointer' }}
              >
                EXECUTE RESET
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '10px', color: '#fff' }}>Audit Trail Logs ({auditLogs.length})</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '10px' }}>
              {auditLogs.map(log => (
                <div key={log.id} style={{ fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                  <span style={{ color: '#38BDF8', fontWeight: 700 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <strong style={{ color: '#fff' }}>{log.actor} ({log.role}):</strong> {log.action} &bull; {log.reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 0A. EVENT CONTROL CENTRE */}
      {activeTab === 'event-control' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Event Lifecycle State Machine */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>EVENT LIFECYCLE CONTROLLER</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: '4px 0 0' }}>
                  Current Status:{' '}
                  <span style={{ color: '#FCD34D', fontFamily: 'monospace' }}>
                    {currentEvent.eventStatus || 'REGISTRATION_OPEN'}
                  </span>
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>Mode: <strong>{currentEvent.eventMode || 'LIVE'}</strong></span>
                <button
                  onClick={() => handleSetEventMode(currentEvent.eventMode === 'LIVE' ? 'REHEARSAL' : 'LIVE')}
                  style={{ padding: '6px 12px', background: currentEvent.eventMode === 'LIVE' ? '#059669' : '#D97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Switch to {currentEvent.eventMode === 'LIVE' ? 'REHEARSAL' : 'LIVE'} Mode ➔
                </button>
              </div>
            </div>

            {/* Lifecycle Stages Buttons */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 0', borderTop: '1px solid #334155' }}>
              {[
                'DRAFT',
                'REGISTRATION_OPEN',
                'REGISTRATION_CLOSED',
                'PRE_EVENT',
                'MARKET_ACTIVE',
                'MARKET_CLOSED',
                'SETTLEMENT',
                'RESULTS',
                'ARCHIVED'
              ].map(st => {
                const isCurrent = (currentEvent.eventStatus || 'REGISTRATION_OPEN') === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleSetEventLifecycle(st)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isCurrent ? '2px solid #38BDF8' : '1px solid #334155',
                      background: isCurrent ? '#0F172A' : '#1E293B',
                      color: isCurrent ? '#38BDF8' : '#94A3B8',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isCurrent ? '● ' : ''}{st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Event Configuration & Schedule Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '0 0 14px' }}>
                ⚙️ Event Configuration Settings
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Event Name</label>
                  <input
                    type="text"
                    value={cfgEventName}
                    onChange={(e) => setCfgEventName(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Venue</label>
                  <input
                    type="text"
                    value={cfgVenue}
                    onChange={(e) => setCfgVenue(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Event Date</label>
                  <input
                    type="date"
                    value={cfgEventDate}
                    onChange={(e) => setCfgEventDate(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Max Investment Houses</label>
                  <input
                    type="number"
                    value={cfgMaxHouses}
                    onChange={(e) => setCfgMaxHouses(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Team Size (Members)</label>
                  <input
                    type="number"
                    value={cfgTeamSize}
                    onChange={(e) => setCfgTeamSize(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Starting Virtual Capital (₹)</label>
                  <input
                    type="number"
                    value={cfgCapital}
                    onChange={(e) => setCfgCapital(e.target.value)}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', marginBottom: '4px' }}>Market Schedule (Open - Close)</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={cfgOpenTime}
                      onChange={(e) => setCfgOpenTime(e.target.value)}
                      placeholder="09:30 AM"
                      style={{ width: '50%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px' }}
                    />
                    <input
                      type="text"
                      value={cfgCloseTime}
                      onChange={(e) => setCfgCloseTime(e.target.value)}
                      placeholder="03:30 PM"
                      style={{ width: '50%', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={handleSaveEventConfig}
                  style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Event Configuration
                </button>
              </div>
            </div>

            {/* Risk Controls Configurator */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '0 0 14px' }}>
                🛡️ Simulation Risk & Circuit Controls
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Market-Wide Circuit Breaker (%)</label>
                  <input
                    type="number"
                    value={cfgCircuit}
                    onChange={(e) => setCfgCircuit(e.target.value)}
                    style={{ width: '80px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Security Price Band Limit (&plusmn;%)</label>
                  <input
                    type="number"
                    value={cfgPriceBand}
                    onChange={(e) => setCfgPriceBand(e.target.value)}
                    style={{ width: '80px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Maximum Order Value (₹)</label>
                  <input
                    type="number"
                    value={cfgMaxOrderVal}
                    onChange={(e) => setCfgMaxOrderVal(e.target.value)}
                    style={{ width: '120px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Max Position Size (% Portfolio)</label>
                  <input
                    type="number"
                    value={cfgMaxPos}
                    onChange={(e) => setCfgMaxPos(e.target.value)}
                    style={{ width: '80px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Concentration Warning Threshold (%)</label>
                  <input
                    type="number"
                    value={cfgConcentration}
                    onChange={(e) => setCfgConcentration(e.target.value)}
                    style={{ width: '80px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#94A3B8' }}>Allow Short-Selling</label>
                  <input
                    type="checkbox"
                    checked={cfgShortSelling}
                    onChange={(e) => setCfgShortSelling(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={handleSaveRiskControls}
                  style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Update Risk Controls
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Rehearsal Mode Runner & Snapshot Checkpoint Architecture */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Rehearsal Sandbox */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FCD34D', margin: 0 }}>
                  🎭 Rehearsal Mode Test Environment
                </h3>
                <span style={{ fontSize: '0.72rem', background: 'rgba(252, 211, 77, 0.1)', color: '#FCD34D', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  ZERO CONTAMINATION GUARANTEE
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 14px' }}>
                Generate test schools, test Investment Houses, and test delegates. Rehearsal data is strictly isolated to prevent contamination of LIVE tournament records.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSeedRehearsal}
                  style={{ padding: '8px 14px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  🌱 Seed 5 Rehearsal Houses
                </button>
                <button
                  onClick={handleResetRehearsal}
                  style={{ padding: '8px 14px', background: '#7F1D1D', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  🧹 Wipe Rehearsal Data Only
                </button>
              </div>
            </div>

            {/* Snapshot & Recovery Architecture */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38BDF8', margin: '0 0 10px' }}>
                📸 Event Snapshots & Checkpoints
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: '0 0 12px' }}>
                Create pre-market, mid-market, or pre-settlement recovery checkpoints for zero data loss.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  onClick={() => handleCreateSnapshot('PRE_MARKET', 'Pre-Market Baseline Checkpoint')}
                  style={{ padding: '6px 12px', background: '#0F172A', border: '1px solid #38BDF8', color: '#38BDF8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Pre-Market Checkpoint
                </button>
                <button
                  onClick={() => handleCreateSnapshot('MID_MARKET', 'Mid-Market Checkpoint')}
                  style={{ padding: '6px 12px', background: '#0F172A', border: '1px solid #38BDF8', color: '#38BDF8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Mid-Market Checkpoint
                </button>
                <button
                  onClick={() => handleCreateSnapshot('PRE_SETTLEMENT', 'Pre-Settlement Checkpoint')}
                  style={{ padding: '6px 12px', background: '#0F172A', border: '1px solid #38BDF8', color: '#38BDF8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Pre-Settlement Checkpoint
                </button>
              </div>

              {/* Snapshots List */}
              <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#0F172A', borderRadius: '6px', padding: '8px', border: '1px solid #334155' }}>
                {Object.values(state?.eventSnapshots || {}).length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748B', textAlign: 'center', padding: '12px' }}>
                    No event snapshots created yet.
                  </div>
                ) : (
                  Object.values(state?.eventSnapshots || {}).map(s => (
                    <div key={s.snapshotId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', borderBottom: '1px solid #1E293B', fontSize: '0.74rem' }}>
                      <div>
                        <strong style={{ color: '#fff' }}>{s.label || s.snapshotType}</strong>
                        <div style={{ color: '#64748B', fontSize: '0.68rem' }}>{new Date(s.timestamp).toLocaleTimeString()} ({s.snapshotId})</div>
                      </div>
                      <button
                        onClick={() => handleRestoreSnapshot(s.snapshotId)}
                        style={{ padding: '3px 8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Restore ⟲
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 0B. REGISTRATIONS & INVESTMENT HOUSES */}
      {activeTab === 'registrations' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                Delegations & Investment Houses
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                Review school registrations, verify houses into active trading desks, and issue credentials
              </span>
            </div>
            <a
              href="#/register"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '6px 14px',
                background: '#2563EB',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              Open Public Registration Portal ↗
            </a>
          </div>

          {/* Registrations List */}
          <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '8px 10px' }}>Reg ID</th>
                  <th style={{ padding: '8px 10px' }}>School Name</th>
                  <th style={{ padding: '8px 10px' }}>Investment House</th>
                  <th style={{ padding: '8px 10px' }}>Team Code</th>
                  <th style={{ padding: '8px 10px' }}>Delegates</th>
                  <th style={{ padding: '8px 10px' }}>Verification Status</th>
                  <th style={{ padding: '8px 10px' }}>Participant Lifecycle</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(state?.registrations || {}).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                      No incoming school registrations. Direct teams to #/register or seed rehearsal houses.
                    </td>
                  </tr>
                ) : (
                  Object.values(state?.registrations || {}).map(reg => {
                    const house = reg.investmentHouse || {};
                    const isVerified = reg.verificationStatus === 'VERIFIED';
                    const lifecycle = house.registrationStatus || house.status || 'REGISTERED';

                    return (
                      <tr key={reg.registrationId} style={{ borderBottom: '1px solid #1E293B' }}>
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: '#FCD34D', fontWeight: 800 }}>
                          {reg.registrationId}
                        </td>
                        <td style={{ padding: '10px', color: '#fff' }}>
                          <strong>{reg.schoolName}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{reg.city} &bull; {reg.board}</div>
                        </td>
                        <td style={{ padding: '10px', color: '#38BDF8', fontWeight: 800 }}>
                          {reg.investmentHouseName}
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 900, color: '#34D399' }}>
                          {house.teamCode || reg.teamCode || 'PENDING'}
                        </td>
                        <td style={{ padding: '10px', color: '#CBD5E1' }}>
                          {reg.members?.length || 3} delegates
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            {reg.members?.map(m => m.name).join(', ')}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: isVerified ? 'rgba(52, 211, 153, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: isVerified ? '#34D399' : '#FCD34D'
                          }}>
                            {isVerified ? '✓ VERIFIED' : '⏳ PENDING REVIEW'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={lifecycle}
                            onChange={(e) => handleParticipantLifecycle(house.investmentHouseId || reg.registrationId, e.target.value)}
                            style={{
                              background: '#0F172A',
                              border: '1px solid #334155',
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            <option value="REGISTERED">REGISTERED</option>
                            <option value="VERIFIED">VERIFIED</option>
                            <option value="READY">READY</option>
                            <option value="MARKET_ACTIVE">MARKET_ACTIVE</option>
                            <option value="MARKET_CLOSED">MARKET_CLOSED</option>
                            <option value="SETTLED">SETTLED</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {!isVerified && (
                              <button
                                onClick={() => {
                                  const code = prompt('Assign Team Code:', house.teamCode || `IH${String(Object.keys(state?.teams || {}).length + 1).padStart(2, '0')}`);
                                  if (code) handleVerifyRegistration(reg.registrationId, code);
                                }}
                                style={{ padding: '4px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                              >
                                Approve & Verify
                              </button>
                            )}
                            <button
                              onClick={() => setCredentialSlipHouse(house)}
                              style={{ padding: '4px 10px', background: '#334155', color: '#38BDF8', border: '1px solid #475569', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                            >
                              Credential Slip 🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0C. JUDGING CONSOLE PANEL                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'judging' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#8B5CF6', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                  RUBRIC CRITERIA
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  ⚖️ Chief Judge & Adjudication Console
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.8rem' }}>
                Subjective Evaluation (Decision-Making & Adaptability: 150 pts &bull; Future Potential: 100 pts) &bull; Dual Independent Judges &bull; Discrepancy Moderation
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={loadJudgingScorecards}
                style={{ padding: '8px 14px', background: '#334155', color: '#38BDF8', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                🔄 Refresh Scorecards
              </button>
            </div>
          </div>

          {/* Active Judging Selector Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', background: '#0F172A', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94A3B8', fontWeight: 800, marginBottom: '6px' }}>
                ACTIVE JUDGE PERSONA
              </label>
              <select
                value={selectedJudge}
                onChange={e => setSelectedJudge(e.target.value)}
                style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '8px 12px', fontWeight: 800 }}
              >
                <option value="judge_1">Judge 1 (Panelist A - Markets & Strategy)</option>
                <option value="judge_2">Judge 2 (Panelist B - Risk & Portfolio Governance)</option>
                <option value="chief_judge">Chief Judge (Moderator & Supervisory Overrule)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94A3B8', fontWeight: 800, marginBottom: '6px' }}>
                TARGET INVESTMENT HOUSE
              </label>
              <select
                value={selectedHouseCode}
                onChange={e => setSelectedHouseCode(e.target.value)}
                style={{ width: '100%', background: '#1E293B', color: '#38BDF8', border: '1px solid #475569', borderRadius: '6px', padding: '8px 12px', fontWeight: 900 }}
              >
                {houseOptions.map(h => (
                  <option key={h.code} value={h.code}>
                    {h.code} — {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-Column Scorecard Rubric Editor */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            
            {/* Category 4: Decision-Making & Adaptability (150 pts) */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38BDF8', margin: 0 }}>
                    1. Decision-Making & Adaptability
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Maximum: 150 Points</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38BDF8' }}>
                  {Math.round(
                    (judgeRatings.responseToEvents / 5) * 45 +
                    (judgeRatings.decisionTiming / 5) * 35 +
                    (judgeRatings.adaptability / 5) * 35 +
                    (judgeRatings.riskRecognition / 5) * 35
                  )} / 150 pts
                </div>
              </div>

              {[
                { key: 'responseToEvents', label: 'Response to Market Events & Breaking News', max: 45, desc: 'Quality and discipline of execution following macroeconomic and corporate shocks' },
                { key: 'decisionTiming', label: 'Decision Timing & Order Execution Quality', max: 35, desc: 'Avoided panic execution; exhibited patient liquidity timing' },
                { key: 'adaptability', label: 'Adaptability Under Regime Shifts', max: 35, desc: 'Portfolio rebalancing agility when sector leadership reversed' },
                { key: 'riskRecognition', label: 'Recognition of Emerging Risks & Catalysts', max: 35, desc: 'Anticipated drawdown risks and preserved capital effectively' }
              ].map(crit => {
                const currentRating = judgeRatings[crit.key] ?? 3;
                const awarded = Math.round((currentRating / 5) * crit.max);
                return (
                  <div key={crit.key} style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#F8FAFC' }}>{crit.label}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 900 }}>
                        {awarded} / {crit.max} pts ({currentRating}/5)
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 8px 0', fontSize: '0.72rem', color: '#94A3B8' }}>{crit.desc}</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[0, 1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setJudgeRatings(prev => ({ ...prev, [crit.key]: rating }))}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            background: currentRating === rating ? '#0284C7' : '#0F172A',
                            color: currentRating === rating ? '#fff' : '#94A3B8',
                            border: currentRating === rating ? '1px solid #38BDF8' : '1px solid #334155',
                            cursor: 'pointer'
                          }}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category 5: Future Potential (100 pts) */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#A855F7', margin: 0 }}>
                    2. Future Potential
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Maximum: 100 Points</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#A855F7' }}>
                  {Math.round(
                    (judgeRatings.forwardPositioning / 5) * 35 +
                    (judgeRatings.scenarioResilience / 5) * 30 +
                    (judgeRatings.riskReturnBalance / 5) * 20 +
                    (judgeRatings.growthAdaptability / 5) * 15
                  )} / 100 pts
                </div>
              </div>

              {[
                { key: 'forwardPositioning', label: 'Forward-Looking Portfolio Positioning', max: 35, desc: 'Portfolio structure resilience for post-event simulated multi-month horizon' },
                { key: 'scenarioResilience', label: 'Resilience Under Alternative Macro Scenarios', max: 30, desc: 'Survival stress-testing against stagflation, rate hikes, or tech selloffs' },
                { key: 'riskReturnBalance', label: 'Opportunity vs Downside Asymmetry', max: 20, desc: 'Constructed upside optionality without unhedged existential tail risk' },
                { key: 'growthAdaptability', label: 'Capacity to Adapt Going Forward', max: 15, desc: 'Team maturity and flexibility in adjusting investment thesis over time' }
              ].map(crit => {
                const currentRating = judgeRatings[crit.key] ?? 3;
                const awarded = Math.round((currentRating / 5) * crit.max);
                return (
                  <div key={crit.key} style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#F8FAFC' }}>{crit.label}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#A855F7', fontWeight: 900 }}>
                        {awarded} / {crit.max} pts ({currentRating}/5)
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 8px 0', fontSize: '0.72rem', color: '#94A3B8' }}>{crit.desc}</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[0, 1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setJudgeRatings(prev => ({ ...prev, [crit.key]: rating }))}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            background: currentRating === rating ? '#9333EA' : '#0F172A',
                            color: currentRating === rating ? '#fff' : '#94A3B8',
                            border: currentRating === rating ? '1px solid #A855F7' : '1px solid #334155',
                            cursor: 'pointer'
                          }}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Adjudication Notes & Action Bar */}
          <div style={{ background: '#0F172A', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 800 }}>
              Adjudication Qualitative Notes & Deliberation Record
            </label>
            <textarea
              rows={2}
              value={judgeNotes}
              onChange={e => setJudgeNotes(e.target.value)}
              placeholder="Record justification for scores, notable strategy observations, and debate performance..."
              style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '10px', fontSize: '0.8rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => handleSaveJudgeCard('DRAFT')}
                style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSaveJudgeCard('SUBMITTED')}
                style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}
              >
                Submit Scorecard for {selectedHouseCode} ✓
              </button>
            </div>
          </div>

          {/* Scorecard Table & Discrepancy Moderation */}
          <div style={{ background: '#0F172A', borderRadius: '8px', border: '1px solid #334155', overflowX: 'auto', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 900 }}>
              Submitted Scorecards & Discrepancy Surveillance
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '8px' }}>House Code</th>
                  <th style={{ padding: '8px' }}>Judge 1 Score</th>
                  <th style={{ padding: '8px' }}>Judge 2 Score</th>
                  <th style={{ padding: '8px' }}>Discrepancy Status</th>
                  <th style={{ padding: '8px' }}>Avg / Moderated Total</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Chief Judge Action</th>
                </tr>
              </thead>
              <tbody>
                {houseOptions.map(h => {
                  const cardJ1 = judgeScorecardsList.find(c => (c.teamCode === h.code || c.teamId === h.code) && c.judgeId === 'judge_1');
                  const cardJ2 = judgeScorecardsList.find(c => (c.teamCode === h.code || c.teamId === h.code) && c.judgeId === 'judge_2');
                  const score1 = cardJ1 ? (cardJ1.decisionMakingScore || 0) + (cardJ1.futurePotentialScore || 0) : null;
                  const score2 = cardJ2 ? (cardJ2.decisionMakingScore || 0) + (cardJ2.futurePotentialScore || 0) : null;
                  const diff = (score1 !== null && score2 !== null) ? Math.abs(score1 - score2) : null;
                  const isDiscrepant = diff !== null && diff > 50; // > 20% of 250

                  return (
                    <tr key={h.code} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#38BDF8' }}>
                        {h.code} <span style={{ color: '#94A3B8', fontWeight: 500 }}>({h.name})</span>
                      </td>
                      <td style={{ padding: '8px', color: score1 !== null ? '#34D399' : '#64748B' }}>
                        {score1 !== null ? `${score1} / 250 pts` : 'Pending'}
                      </td>
                      <td style={{ padding: '8px', color: score2 !== null ? '#34D399' : '#64748B' }}>
                        {score2 !== null ? `${score2} / 250 pts` : 'Pending'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {isDiscrepant ? (
                          <span style={{ background: '#7F1D1D', color: '#FECACA', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.7rem' }}>
                            ⚠️ DISCREPANCY &gt; 20% ({diff} pts)
                          </span>
                        ) : diff !== null ? (
                          <span style={{ color: '#34D399', fontWeight: 800 }}>Aligned (Δ {diff} pts)</span>
                        ) : (
                          <span style={{ color: '#64748B' }}>Awaiting dual submission</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#FCD34D' }}>
                        {score1 !== null && score2 !== null ? `${Math.round((score1 + score2) / 2)} pts` : (score1 || score2 || '—')}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleModerateScorecard(h.code)}
                          style={{ padding: '4px 10px', background: '#334155', color: '#FCD34D', border: '1px solid #475569', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Moderate ⚖️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 0D. PENALTIES & APPEALS PANEL                                             */}
      {/* ========================================================================= */}
      {activeTab === 'penalties' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#DC2626', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                  GOVERNANCE
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  🛡️ Competition Penalties & Appeals Adjudication
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.8rem' }}>
                Rule-enforced score deductions &bull; Formal appeals adjudication &bull; System errors strictly exempt from penalty
              </p>
            </div>
            <button
              onClick={loadPenalties}
              style={{ padding: '8px 14px', background: '#334155', color: '#38BDF8', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
            >
              🔄 Refresh Penalties
            </button>
          </div>

          {/* Issue Penalty Card */}
          <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#F87171', margin: 0 }}>
              Issue Formal Rule Violation Penalty
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, marginBottom: '4px' }}>
                  TARGET INVESTMENT HOUSE
                </label>
                <select
                  value={penTeamCode}
                  onChange={e => setPenTeamCode(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '8px' }}
                >
                  {houseOptions.map(h => (
                    <option key={h.code} value={h.code}>{h.code} — {h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, marginBottom: '4px' }}>
                  VIOLATION CATEGORY
                </label>
                <select
                  value={penCategory}
                  onChange={e => {
                    const cat = e.target.value;
                    setPenCategory(cat);
                    if (cat === 'CARELESS_ORDERS') { setPenPoints(5); setPenRuleRef('RULE-21.1'); }
                    else if (cat === 'WORKFLOW_BYPASS') { setPenPoints(15); setPenRuleRef('RULE-21.2'); }
                    else if (cat === 'FALSIFICATION') { setPenPoints(30); setPenRuleRef('RULE-21.3'); }
                    else if (cat === 'UNAUTHORIZED_ACCESS') { setPenPoints(50); setPenRuleRef('RULE-21.4'); }
                    else if (cat === 'COLLUSION') { setPenPoints(100); setPenRuleRef('RULE-21.5'); }
                  }}
                  style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '8px' }}
                >
                  <option value="CARELESS_ORDERS">Repeated careless invalid orders (-5 pts)</option>
                  <option value="WORKFLOW_BYPASS">Unauthorized workflow / desk bypass (-15 pts)</option>
                  <option value="FALSIFICATION">Falsification of trade tickets / logs (-30 pts)</option>
                  <option value="UNAUTHORIZED_ACCESS">Unauthorized access to rival terminal (-50 pts)</option>
                  <option value="COLLUSION">Collusion or market manipulation (-100 pts)</option>
                  <option value="OTHER">Custom Operational Infraction</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, marginBottom: '4px' }}>
                  PENALTY DEDUCTION (POINTS)
                </label>
                <input
                  type="number"
                  value={penPoints}
                  onChange={e => setPenPoints(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', color: '#F87171', fontWeight: 900, border: '1px solid #475569', borderRadius: '6px', padding: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, marginBottom: '4px' }}>
                  RULE REFERENCE
                </label>
                <input
                  type="text"
                  value={penRuleRef}
                  onChange={e => setPenRuleRef(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '8px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, marginBottom: '4px' }}>
                DETAILED FACTUAL INCIDENT REASON & EVIDENCE
              </label>
              <textarea
                rows={2}
                value={penReason}
                onChange={e => setPenReason(e.target.value)}
                placeholder="Specify time, order ticket #, affected security, and verified violation details..."
                style={{ width: '100%', background: '#1E293B', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '8px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleApplyPenalty}
                style={{ padding: '8px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer' }}
              >
                Apply Penalty of -{penPoints} Points 🛑
              </button>
            </div>
          </div>

          {/* Penalties Audit Log & Appeals */}
          <div style={{ background: '#0F172A', borderRadius: '8px', border: '1px solid #334155', overflowX: 'auto', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 900 }}>
              Audit Log of Imposed Penalties & Appeals
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '8px' }}>Penalty ID</th>
                  <th style={{ padding: '8px' }}>House</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Points</th>
                  <th style={{ padding: '8px' }}>Rule Ref</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Reason / Appeal</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Adjudication Action</th>
                </tr>
              </thead>
              <tbody>
                {penaltiesList.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                      No formal penalties recorded. The trading floor remains in good regulatory compliance.
                    </td>
                  </tr>
                ) : (
                  penaltiesList.map(p => (
                    <tr key={p.id || p.penaltyId} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#FCD34D' }}>{p.id || p.penaltyId}</td>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#38BDF8' }}>{p.teamCode}</td>
                      <td style={{ padding: '8px', color: '#CBD5E1' }}>{p.category}</td>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#F87171' }}>-{p.penaltyPoints || p.points} pts</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94A3B8' }}>{p.ruleReference || p.ruleRef}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          background: p.status === 'RESOLVED_UPHELD' ? '#7F1D1D' : p.status === 'WAIVED' ? '#065F3E' : p.status === 'APPEALED' ? '#854D0E' : '#334155',
                          color: '#fff'
                        }}>
                          {p.status || 'APPLIED'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#CBD5E1', maxWidth: '280px' }}>
                        <div>{p.reason}</div>
                        {p.appealReason && (
                          <div style={{ fontSize: '0.7rem', color: '#FCD34D', marginTop: '3px' }}>
                            Appeal: "{p.appealReason}"
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {p.status === 'APPEALED' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleResolvePenaltyAppeal(p.id || p.penaltyId, 'APPROVE_APPEAL')}
                              style={{ padding: '3px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Waive ✓
                            </button>
                            <button
                              onClick={() => handleResolvePenaltyAppeal(p.id || p.penaltyId, 'REJECT_APPEAL')}
                              style={{ padding: '3px 8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Uphold ✗
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '0.7rem' }}>Finalized</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 0E. RESULTS LIFECYCLE & PUBLICATION PANEL                                */}
      {/* ========================================================================= */}
      {activeTab === 'results-lifecycle' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#059669', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                  STAGE {lifecycleState}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  🏆 Results Lifecycle & Official Publication
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.8rem' }}>
                Strict 8-Stage Publication Protocol: CONFIGURED ➔ LIVE_SCORING ➔ MARKET_CLOSED ➔ VALUATION_FROZEN ➔ JUDGING_COMPLETE ➔ RECONCILIATION ➔ APPROVED ➔ PUBLISHED
              </p>
            </div>
            <a
              href="#/results"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '8px 16px',
                background: '#2563EB',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 900,
                textDecoration: 'none'
              }}
            >
              Open Leaderboard Screen ↗
            </a>
          </div>

          {/* 8-Stage Visual Stepper */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '14px', background: '#0F172A', borderRadius: '8px', border: '1px solid #334155' }}>
            {[
              { id: 'CONFIGURED', label: '1. Configured' },
              { id: 'LIVE_SCORING', label: '2. Live Scoring' },
              { id: 'MARKET_CLOSED', label: '3. Market Closed' },
              { id: 'VALUATION_FROZEN', label: '4. Valuation Frozen' },
              { id: 'JUDGING_COMPLETE', label: '5. Judging Done' },
              { id: 'RECONCILIATION', label: '6. Reconciliation' },
              { id: 'APPROVED', label: '7. Approved' },
              { id: 'PUBLISHED', label: '8. Published' }
            ].map(step => {
              const isCurrent = lifecycleState === step.id;
              return (
                <div
                  key={step.id}
                  style={{
                    flex: 1,
                    minWidth: '110px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    background: isCurrent ? '#0284C7' : '#1E293B',
                    border: isCurrent ? '1.5px solid #38BDF8' : '1px solid #334155',
                    color: isCurrent ? '#fff' : '#94A3B8',
                    fontWeight: isCurrent ? 900 : 700,
                    fontSize: '0.74rem'
                  }}
                >
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* Core Lifecycle Controls Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* 1. 15:30 Closing Valuation Snapshot */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 900 }}>STAGE 4 CONTROL</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                  🔒 15:30 Freeze Valuation Snapshot
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                  At 15:30, take an immutable snapshot of all Investment House portfolio equities (cash balances, foreign exchange conversions, and marked-to-market positions). Frozen snapshot will be cryptographically locked for final scoring.
                </p>
                {latestFrozenSnapshot && (
                  <div style={{ marginTop: '10px', padding: '8px', background: '#065F3E', borderRadius: '4px', fontSize: '0.72rem', color: '#D1FAE5' }}>
                    ✓ Snapshot Locked: {new Date(latestFrozenSnapshot.frozenAt).toLocaleTimeString()} &bull; Hash: {latestFrozenSnapshot.snapshotHash?.slice(0, 10)}...
                  </div>
                )}
              </div>
              <button
                onClick={handleFreezeValuation}
                style={{ padding: '10px', background: '#0284C7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Execute 15:30 Closing Freeze 🔒
              </button>
            </div>

            {/* 2. 15:30-15:45 Settlement & Reconciliation */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 900 }}>STAGE 6 CONTROL</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                  ⚖️ Settlement & Reconciliation
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                  Reconcile executed trade tickets against desk logs, pending settlement obligations, and foreign exchange conversions. Generates an immutable audit trail without rewriting the frozen closing valuation.
                </p>
                {reconciliationLogs.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '8px', background: '#1E293B', borderRadius: '4px', fontSize: '0.72rem', color: '#FCD34D' }}>
                    Reconciliation adjustments audited: {reconciliationLogs.length} items
                  </div>
                )}
              </div>
              <button
                onClick={handleRunReconciliation}
                style={{ padding: '10px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Run Reconciliation (15:30–15:45) ⚖️
              </button>
            </div>

            {/* 3. Chief Judge Verification & Sign-off */}
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 900 }}>STAGE 7 CONTROL</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                  ✅ Chief Judge Sign-off & Approval
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                  Authorize the computed results. Validates that objective scoring (750 pts) matches formula rules, subjective scorecards (250 pts) are harmonized, and penalties are correctly factored.
                </p>
              </div>
              <button
                onClick={handleApproveResults}
                style={{ padding: '10px', background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Approve Competition Results ✓
              </button>
            </div>

            {/* 4. Official Publication */}
            <div style={{ background: '#0F172A', border: '1px solid #059669', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 900 }}>STAGE 8 FINALE</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34D399', margin: '4px 0' }}>
                  🏆 Publish Official Final Results
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                  Publish final standings to all auditoriums, live projector, and participant screens. Transitions leaderboard from PROVISIONAL to OFFICIAL FINAL RESULTS.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handlePublishResults}
                  style={{ flex: 1, padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Publish Official Results 🏆
                </button>
                <button
                  onClick={handleReopenResults}
                  style={{ padding: '10px 14px', background: '#334155', color: '#F87171', border: '1px solid #EF4444', borderRadius: '6px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  Reopen 🚨
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 0F. EVENT ANALYTICS & REPORTING PANEL                                     */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#38BDF8', color: '#0F172A', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                  TELEMETRY
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  📊 SAAMX Event Telemetry & Analytics Report
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.8rem' }}>
                Authoritative event-scoped metrics &bull; Real transaction volumes &bull; Risk distribution &bull; Operational exceptions
              </p>
            </div>
            <button
              onClick={loadEventAnalytics}
              style={{ padding: '8px 14px', background: '#334155', color: '#38BDF8', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
            >
              🔄 Refresh Analytics
            </button>
          </div>

          {/* Key Analytics Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            
            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>INVESTMENT HOUSES</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
                {analyticsReport?.participation?.totalHouses || houseOptions.length} Active
              </div>
              <span style={{ fontSize: '0.72rem', color: '#34D399' }}>
                Starting Capital: ₹1.00 Cr / House
              </span>
            </div>

            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>FLOOR TURNOVER</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FCD34D', marginTop: '4px' }}>
                ₹{((analyticsReport?.volume?.totalTurnoverINR || totalTurnoverINR) / 10000000).toFixed(2)} Cr
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Total Executed Volume: {(analyticsReport?.volume?.totalVolume || totalVolume).toLocaleString()}
              </span>
            </div>

            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>ORDERS EXECUTED & REJECTED</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34D399', marginTop: '4px' }}>
                {analyticsReport?.orders?.executed || totalTrades} Executed
              </div>
              <span style={{ fontSize: '0.72rem', color: '#F87171' }}>
                Rejected: {analyticsReport?.orders?.rejected || 0} &bull; Success: {analyticsReport?.orders?.executed ? `${Math.round((analyticsReport.orders.executed / (analyticsReport.orders.executed + (analyticsReport.orders.rejected || 0))) * 100)}%` : '100%'}
              </span>
            </div>

            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>CURRENCY & FX ACTIVITY</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#A855F7', marginTop: '4px' }}>
                ₹{((analyticsReport?.fx?.turnoverINR || 0) / 10000000).toFixed(2)} Cr
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                FX Trades: {analyticsReport?.fx?.transactionsCount || Object.keys(state?.fxTransactions || {}).length}
              </span>
            </div>

            <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>PENALTIES & AUDITS</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F87171', marginTop: '4px' }}>
                {penaltiesList.length} Applied
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Total Points Deducted: {penaltiesList.reduce((acc, p) => acc + (p.penaltyPoints || p.points || 0), 0)} pts
              </span>
            </div>

          </div>

          {/* Detailed Summary Table */}
          <div style={{ background: '#0F172A', borderRadius: '8px', border: '1px solid #334155', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#F8FAFC', fontWeight: 900 }}>
              Operational Exceptions & Reconciliation Summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8', fontWeight: 700 }}>Starting Capital Calibration:</span>
                <div style={{ color: '#fff', fontWeight: 900, marginTop: '2px' }}>₹1,00,00,000 (₹1 Crore) uniform opening equity</div>
              </div>
              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8', fontWeight: 700 }}>Scoring Rubric Version:</span>
                <div style={{ color: '#38BDF8', fontWeight: 900, marginTop: '2px' }}>v3.0 Official (1,000 Points Comprehensive)</div>
              </div>
              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8', fontWeight: 700 }}>Circuit Breaker Limit:</span>
                <div style={{ color: '#FCD34D', fontWeight: 900, marginTop: '2px' }}>{riskControls.circuitBreakerPercent}% price band check</div>
              </div>
              <div style={{ background: '#1E293B', padding: '12px', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8', fontWeight: 700 }}>Reconciliation Integrity:</span>
                <div style={{ color: '#34D399', fontWeight: 900, marginTop: '2px' }}>Zero unverified trades allowed into valuation</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* CREDENTIAL SLIP MODAL */}
      {credentialSlipHouse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', color: '#0F172A', borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #CBD5E1', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#845508', letterSpacing: '0.08em' }}>SAAMX OFFICIAL CREDENTIAL SLIP</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0 0', color: '#0F172A' }}>
                {credentialSlipHouse.investmentHouseName || credentialSlipHouse.teamName}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                {credentialSlipHouse.schoolName}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800 }}>ASSIGNED TEAM CODE</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', color: '#845508' }}>
                  {credentialSlipHouse.teamCode}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800 }}>AUTHENTICATION PIN</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', color: '#059669' }}>
                  {credentialSlipHouse.credentials?.tempPin || credentialSlipHouse.tempPin || '9482'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#64748B', textAlign: 'center', margin: '0 0 16px' }}>
              Present this physical slip to the Order Desk operator to claim execution tickets. Keep credentials confidential.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCredentialSlipHouse(null)}
                style={{ padding: '8px 16px', background: '#0F172A', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', width: '100%' }}
              >
                Close Credential Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL CONFIRM MODAL                                                   */}
      {/* ========================================================================= */}
      {activeModal === 'CONFIRM_MODAL' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1E293B', border: confirmConfig.isDangerous ? '2px solid #EF4444' : '1px solid #38BDF8', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: confirmConfig.isDangerous ? '#F87171' : '#38BDF8', margin: '0 0 8px 0' }}>
              {confirmConfig.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {confirmConfig.message}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setActiveModal(null);
                  if (confirmConfig.action) await confirmConfig.action();
                }}
                style={{ padding: '8px 16px', background: confirmConfig.isDangerous ? '#DC2626' : '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 900, cursor: 'pointer' }}
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
