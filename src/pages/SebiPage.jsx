import React, { useState, useEffect } from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';
import { apiFetch } from '../lib/api.js';
import { NEWS_PRESETS } from '../lib/newsPresets.js';
import { db, ref, onValue } from '../lib/firebase.js';

const STAGED_INTERVENTION_PROTOCOLS = [
  { id: 'ACT_1', triggerMinute: 8, label: 'Stage 1: DTAI Loss Announcement (-22%)', actNumber: 1, type: 'news' },
  { id: 'IPO_1', triggerMinute: 16, label: 'IPO 1: OpenAI Hyperscale IPO (OAI)', actNumber: 3, type: 'ipo' },
  { id: 'ACT_2', triggerMinute: 20, label: 'Stage 2: Mystery Buyer Recovery', actNumber: 2, type: 'news' },
  { id: 'ACT_3', triggerMinute: 25, label: 'Stage 3: Leadership Upheaval CEO Resigns (-8%)', actNumber: 4, type: 'news' },
  { id: 'IPO_2', triggerMinute: 30, label: 'IPO 2: Stripe Global Infra IPO (STRP)', actNumber: 7, type: 'ipo' },
  { id: 'ACT_4', triggerMinute: 32, label: 'Stage 4: PUMP PHASE — Velocity to ₹420 (Goldman Pump)', actNumber: 5, type: 'velocity' },
  { id: 'ACT_5', triggerMinute: 35, label: 'Stage 5: Tata Acquisition Rumour (+8%)', actNumber: 8, type: 'news' },
  { id: 'HINT', triggerMinute: 47, label: 'SEBI Hint: SEBI Monitoring DTAI', actNumber: 6, type: 'news' },
  { id: 'ACT_6', triggerMinute: 50, label: 'Stage 6: SEBI Opens Investigation (-25%)', actNumber: 9, type: 'sebi_notice' },
  { id: 'ACT_7', triggerMinute: 52, label: 'Stage 7: Insider Trading Scandal (-30%)', actNumber: 10, type: 'news' },
  { id: 'ACT_8', triggerMinute: 54, label: 'Stage 8: Trading Suspended (Halt)', actNumber: 12, type: 'halt' },
  { id: 'ACT_9', triggerMinute: 56, label: 'Stage 9: BANKRUPTCY DECLARED', actNumber: 13, type: 'bankruptcy' }
];


export default function SebiPage({ state, onOpenProfile, adminPassword, connected, coordinator, isCoordinatorOffline, mySessionUuid }) {
  const [timeLeft, setTimeLeft] = useState('60:00');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [selectedEmergencySector, setSelectedEmergencySector] = useState('');
  const [selectedSessionState, setSelectedSessionState] = useState('PRE_OPEN');

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  const runPreOpenCheck = () => {
    if (!state) return { passed: false, checks: {} };

    const startingCapital = Number(state.settings?.startingCapitalRetail) || 10000000; // ₹1,00,00,000 (₹1 Crore)
    const securitiesCount = state.securities ? Object.keys(state.securities).length : 0;

    const configuredActiveCount = state.marketState?.activeTeamCount || 10;
    const actualActiveCount = state.teams ? Object.values(state.teams).filter(t => t.isActive).length : 0;

    const checks = {
      firebaseConnected: connected === true,
      sessionInitialized: !!state.marketState?.sessionId,
      activeTeamCountConfigured: actualActiveCount === configuredActiveCount,
      expectedTeamsPresent: actualActiveCount >= 10 && actualActiveCount <= 20,
      startingCapitalVerified: state.teams && Object.values(state.teams).filter(t => t.isActive).every(t => t.cashBalance === startingCapital && t.portfolioValue === startingCapital),
      startingHoldingsVerified: state.teams && Object.values(state.teams).filter(t => t.isActive).every(t => !t.holdings || Object.keys(t.holdings).length === 0),
      teamPortfoliosReset: state.teams && Object.values(state.teams).filter(t => t.isActive).every(t => t.roi === 0 && t.tradeCount === 0 && t.pnl === 0 && t.realizedPnL === 0 && t.unrealizedPnL === 0),
      transactionHistoryEmpty: !state.transactions || Object.keys(state.transactions).length === 0,
      newsFeedEmpty: !state.newsEvents || Object.keys(state.newsEvents).length === 0,
      noBankruptcies: !state.securities || Object.values(state.securities).every(s => s.status !== 'Bankrupt'),
      noActiveOverrides: !state.securities || Object.values(state.securities).every(s => !s.sentimentOverride && (!state.velocities || !state.velocities[s.ticker]?.active))
    };

    const passed = Object.values(checks).every(val => val === true);
    return { passed, checks };
  };

  const { passed: isMarketReady, checks: preOpenChecks } = runPreOpenCheck();
  const [pendingFreezeId, setPendingFreezeId] = useState(null);

  // Clock countdown timer logic
  useEffect(() => {
    const status = state.marketState.status;
    const startTime = state.marketState.simulationStartTime;
    const durationMins = state.marketState.simulationDurationMinutes;
    const pauseOffset = state.marketState.pauseTimeOffset || 0;
    const pausedAt = state.marketState.pausedAt;

    if (status === 'NotStarted' || !startTime) {
      setTimeLeft(`${String(durationMins).padStart(2, '0')}:00`);
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
  }, [state.marketState.status, state.marketState.simulationStartTime, state.marketState.simulationDurationMinutes, state.marketState.pauseTimeOffset, state.marketState.pausedAt, serverTimeOffset]);

  // Preset news sequence player logic
  const currentNewsStep = state?.settings?.currentNewsStep || 1;

  const handleBroadcastStep = async (stepNum) => {
    const preset = NEWS_PRESETS.find(p => p.step === stepNum);
    if (!preset) {
      alert("Invalid step number or end of sequence reached.");
      return;
    }

    const confirmSend = window.confirm(`Broadcast Step ${stepNum} news to exchange?\n\n"${preset.headline}"`);
    if (!confirmSend) return;

    try {
      // 1. Dispatch news event via standard endpoint
      const resNews = await apiFetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          headline: preset.headline,
          description: preset.description,
          affectedSecurityIds: preset.affectedSecurityIds || [],
          affectedSector: preset.affectedSector || null,
          sentiment: preset.sentiment || 'Neutral',
          impactPercent: preset.impactPercent || 0,
          category: preset.category || 'Macro'
        })
      });

      if (!resNews.ok) {
        throw new Error("Failed to dispatch news bulletin.");
      }

      // 2. Increment step count in Firebase settings
      const nextStep = stepNum + 1;
      const currentSettings = state.settings || {};
      const resSettings = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            currentNewsStep: nextStep
          }
        })
      });

      if (!resSettings.ok) {
        throw new Error("News dispatched, but failed to update step counter in settings.");
      }

      alert(`Step ${stepNum} news broadcasted successfully! Next step is Step ${nextStep}.`);
    } catch (err) {
      alert(`Error broadcasting step: ${err.message}`);
    }
  };

  const handleResetStep = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset the news sequence back to Step 1?");
    if (!confirmReset) return;

    try {
      const currentSettings = state.settings || {};
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            currentNewsStep: 1
          }
        })
      });
      if (res.ok) {
        alert("News sequence reset to Step 1 successfully.");
      }
    } catch (err) {
      alert("Failed to reset news step: " + err.message);
    }
  };

  // news composer states
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [noticeType, setNoticeType] = useState('Circular'); // Circular | Advisory | Show Cause Notice | Interim Order | Final Order | Press Release
  const [selectedAct, setSelectedAct] = useState(1);

  // Staged Bankruptcy Stepper states
  const [stageSecId, setStageSecId] = useState('');
  const [stageConfirmState, setStageConfirmState] = useState(false);
  const [investigatingSecIds, setInvestigatingSecIds] = useState({});

  // Market Controls
  const handleMarketControl = async (action) => {
    if (action === 'PAUSE' || action === 'CLOSE') {
      const confirmAction = window.confirm(`Are you sure you want to ${action.toLowerCase()} the simulation session?`);
      if (!confirmAction) return;
    }

    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({ action, duration: 60 })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to trigger market command.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSetMode = async (mode) => {
    const confirm = window.confirm(`Switch simulation mode to ${mode}?`);
    if (!confirm) return;
    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action: 'SET_MODE', mode })
      });
      if (res.ok) {
        alert(`Simulation mode set to ${mode}!`);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleTransitionSession = async (sessionState) => {
    const confirm = window.confirm(`Force transition session state to ${sessionState}? This will override all timed schedules.`);
    if (!confirm) return;
    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action: 'TRANSITION_SESSION', sessionState })
      });
      if (res.ok) {
        alert(`Session successfully transitioned to ${sessionState}!`);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleReconcileMarket = async () => {
    const input = window.prompt('CRITICAL REGULATORY ACTION:\n\nType "RECONCILE MARKET" to lock all participant and broker trading, atomically compute final portfolio net worths, determine official standings, calculate all 9 achievement badges, and publish authoritative rankings to the Leaderboard:');
    if (input !== 'RECONCILE MARKET') {
      alert('Confirmation text mismatch. Market reconciliation cancelled.');
      return;
    }
    try {
      const res = await apiFetch('/api/admin/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`🏆 MARKET RECONCILED & RESULTS PUBLISHED!\n\nRank 1: Team ${data.leaderboard?.[0]?.teamId} (₹${data.leaderboard?.[0]?.portfolioValue?.toLocaleString()})\nRank 2: Team ${data.leaderboard?.[1]?.teamId} (₹${data.leaderboard?.[1]?.portfolioValue?.toLocaleString()})\nRank 3: Team ${data.leaderboard?.[2]?.teamId} (₹${data.leaderboard?.[2]?.portfolioValue?.toLocaleString()})\n\nSession state has been transitioned to 'RESULTS'. All trading remains securely frozen.`);
      } else {
        alert('Reconciliation failed: ' + (data.error || 'Unknown error occurred.'));
      }
    } catch (e) {
      alert('Network / API error: ' + e.message);
    }
  };

  const handleSectorHalt = async (action, sector) => {
    if (!sector) {
      alert('Please select a sector.');
      return;
    }
    const confirm = window.confirm(`Are you sure you want to ${action === 'PAUSE_SECTOR' ? 'FREEZE' : 'UNFREEZE'} trading for all ${sector} listings?`);
    if (!confirm) return;
    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action, sector })
      });
      if (res.ok) {
        alert(`Sector ${sector} successfully ${action === 'PAUSE_SECTOR' ? 'HALTED' : 'RESUMED'}!`);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleMarketWideAction = async (action) => {
    const expected = action === 'HALT_ALL_TRADING' ? 'HALT ALL' : 'RESUME ALL';
    const input = window.prompt(`CRITICAL ACTION: Type "${expected}" to confirm ${action === 'HALT_ALL_TRADING' ? 'halting all market trading' : 'resuming all market trading'}:`);
    if (input !== expected) {
      alert('Confirmation mismatch. Action aborted.');
      return;
    }
    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Market-wide ${action === 'HALT_ALL_TRADING' ? 'HALT' : 'RESUME'} triggered successfully!`);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleClaimCoordinator = async () => {
    try {
      const { set, ref } = await import('../lib/firebase.js');
      await set(ref(db, 'fms/coordinator'), {
        owner: 'sebi',
        lastActive: Date.now() + serverTimeOffset,
        claimedAt: Date.now() + serverTimeOffset,
        id: mySessionUuid
      });
      alert('Coordinator status claimed successfully!');
    } catch (e) {
      alert('Failed to claim coordinator: ' + e.message);
    }
  };

  // Staged Stepper Handlers
  const handleStage1OpenInvestigation = async (sec) => {
    setInvestigatingSecIds({ ...investigatingSecIds, [sec.id]: true });
    const refNum = `SEBI/SAAMX/2026/${state.newsEvents.length + 1001}`;
    const payload = {
      headline: `⚖️ SEBI Opens Formal Investigation into ${sec.name} (${sec.ticker})`,
      description: `Ref No: ${refNum}\n\nRegulatory desks initiate forensic audit citing accounting and reporting irregularities. Asset remains tradable pending findings.`,
      sentiment: 'Neutral',
      impactPercent: 0,
      category: 'Policy',
      affectedSector: null,
      affectedSecurityIds: [sec.id]
    };
    await apiFetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    alert(`Step 1 Complete: Formal Investigation Opened for ${sec.ticker}`);
  };

  const handleStage2SuspendTrading = async (sec) => {
    const payload = {
      securityId: sec.id,
      actionType: 'CircuitBreaker',
      details: 'SEBI suspended trading pending accounting investigation.'
    };
    await apiFetch('/api/corporate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    alert(`Step 2 Complete: Trading Frozen on ${sec.ticker}`);
  };

  const handleFireAct = async (actNum) => {
    try {
      const res = await apiFetch('/api/admin/phoenix-act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ actNumber: Number(actNum) })
      });
      if (res.ok) {
        alert(`Market scenario stage ${actNum} fired successfully!`);
      } else {
        alert('Failed to fire scenario stage.');
      }
    } catch (err) {
      alert('Failed to fire scenario stage: ' + err.message);
    }
  };

  const handleStage3Liquidate = async (sec) => {
    if (!stageConfirmState) {
      setStageConfirmState(true);
      return;
    }
    const payload = {
      securityId: sec.id,
      actionType: 'Bankruptcy',
      details: `SEBI declared bankruptcy and liquidation on ${sec.name}`
    };
    await apiFetch('/api/corporate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    setStageConfirmState(false);
    setStageSecId('');
    alert(`Step 3 Complete: ${sec.ticker} Bankrupt & Liquidated!`);
  };

  // Broadcast news trigger
  const handleBroadcastNews = async (e) => {
    e.preventDefault();
    if (!headline.trim()) {
      alert('Headline is required.');
      return;
    }

    const refNum = `SEBI/SAAMX/2026/${state.newsEvents.length + 1001}`;
    const fullHeadline = `⚖️ [SEBI ${noticeType}] ${headline}`;
    const fullDesc = `Ref No: ${refNum}\n\n${description}`;

    const payload = {
      headline: fullHeadline,
      description: fullDesc,
      sentiment: 'Neutral',
      impactPercent: 0,
      category: 'Policy',
      affectedSector: null,
      affectedSecurityIds: []
    };

    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to dispatch notice.');
      }
      setHeadline('');
      setDescription('');
      alert('SEBI Announcement Broadcasted successfully!');
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    }
  };

  const PRE_GENERATED_SEBI_NOTICES = [
    {
      type: "Circular",
      headline: "IPO Allotment Window Opens for IndiaStack Fintech (ISFT)",
      description: "Subscription bidding is now open for IndiaStack Fintech Ltd IPO. Bid price set at ₹285 per share. Trading desk staff are instructed to process buy/sell orders."
    },
    {
      type: "Circular",
      headline: "IPO Allotment Window Opens for Anthropic AI India (ANTH)",
      description: "Subscription bidding is now open for Anthropic AI India Ltd IPO. Price band set at ₹440 per share. Trading desk staff are instructed to process buy/sell orders."
    },
    {
      type: "Advisory",
      headline: "Surveillance Desk Deploys Real-Time Trade Velocity Filters",
      description: "In response to increased trading frequencies, SEBI has activated enhanced rate-limiting filters on the main Exchange Console desk. Staff are advised to verify large block trades."
    },
    {
      type: "Circular",
      headline: "Margin Requirements Increased for Technology Listings",
      description: "Effective immediately, minimum margin reserves for trading in Technology sector equities are elevated by 10% to curb speculative volatility."
    },
    {
      type: "Press Release",
      headline: "Surveillance Team Restructures Equity Exposure Limits",
      description: "SEBI publishes revised exposure thresholds for retail and mutual fund portfolios to prevent over-leverage in high-volatility securities."
    },
    {
      type: "Interim Order",
      headline: "Forensic Investigation Opened into Promoters of Volatile Tech Assets",
      description: "Surveillance desk orders audit on promoters following suspicious block trade transfers registered before quarterly earnings announcements."
    }
  ];

  const handleApplySebiNotice = (notice) => {
    setNoticeType(notice.type);
    setHeadline(notice.headline);
    setDescription(notice.description);
  };

  const handleQuickPublishSebiNotice = async (notice) => {
    const nextRefNum = `SEBI/SAAMX/2026/${state.newsEvents.length + 1001}`;
    const fullHeadline = `⚖️ [SEBI ${notice.type}] ${notice.headline}`;
    const fullDesc = `Ref No: ${nextRefNum}\n\n${notice.description}`;

    const payload = {
      headline: fullHeadline,
      description: fullDesc,
      sentiment: 'Neutral',
      impactPercent: 0,
      category: 'Policy',
      affectedSector: null,
      affectedSecurityIds: []
    };

    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to dispatch notice.');
      }
      alert('SEBI Announcement Broadcasted successfully!');
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    }
  };

  // Freeze / Unfreeze toggle for manual circuit breaker overriding
  const handleFreezeToggle = async (security) => {
    const isHalted = security.status === 'Halted';
    try {
      await apiFetch('/api/corporate-action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          securityId: security.id,
          actionType: isHalted ? 'UNHALT' : 'CircuitBreaker',
          details: isHalted ? 'SEBI lifted trading halt' : 'SEBI suspended trading due to high volatility'
        })
      });
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  // News history feed
  const broadcastedNews = [...state.newsEvents]
    .filter(n => n.triggeredAt && n.headline.includes('SEBI'))
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  // Active Circuit Breakers: Moved +/- 30% in last 5 minutes
  const getCircuitBreakers = () => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return state.securities.filter(s => {
      const history = s.priceHistory || [];
      const recentPoints = history.filter(p => p.timestamp >= cutoff);
      if (recentPoints.length < 2) return false;
      const minPrice = Math.min(...recentPoints.map(p => p.price));
      const maxPrice = Math.max(...recentPoints.map(p => p.price));
      if (minPrice === 0) return false;
      const changePct = ((maxPrice - minPrice) / minPrice) * 100;
      return changePct >= 30;
    });
  };

  const activeCircuitBreakers = getCircuitBreakers();
  const refNum = `SEBI/SAAMX/2026/${state.newsEvents.length + 1001}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px', boxSizing: 'border-box' }}>
      {/* Institutional SEBI Desk Header */}
      <div className="card-primary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: '6px solid var(--color-brass)', padding: '20px 24px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#6C4404', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            <span>🏛️ SECURITIES & EXCHANGE BOARD SURVEILLANCE</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-brand)', margin: 0, color: 'var(--color-ink)' }}>
            SEBI Regulatory Command Console
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#242C38', fontWeight: 500 }}>
            Market oversight, circuit breaker intervention, regulatory announcements & audit reconciliation.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleReconcileMarket}
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 800 }}
          >
            🏆 Reconcile & Publish Results
          </button>
        </div>
      </div>

      {/* Mode Control & Health Status Matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: '16px'
      }}>
        {/* Simulation Mode Toggle card */}
        <div className="glass card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SIMULATION MODE</strong>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-display" style={{ fontSize: '1.2rem', color: 'var(--color-brass)', fontWeight: 'bold' }}>
              {state.marketState?.mode || 'DEMO'} MODE
            </span>
            <button
              type="button"
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                backgroundColor: 'var(--color-surface-3)',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              onClick={() => handleSetMode((state.marketState?.mode || 'DEMO') === 'DEMO' ? 'EVENT' : 'DEMO')}
            >
              🔄 Switch to {(state.marketState?.mode || 'DEMO') === 'DEMO' ? 'EVENT' : 'DEMO'}
            </button>
          </div>
        </div>

        {/* Health check panel */}
        <div className="glass card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CORE DESK HEALTH</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.8rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }}></span>
              {connected ? 'Firebase Online' : 'Firebase Offline'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: !isCoordinatorOffline ? '#22c55e' : '#ef4444', display: 'inline-block' }}></span>
              {!isCoordinatorOffline ? 'Coordinator Heartbeat Active' : 'Coordinator Heartbeat Missing'}
            </span>
            {isCoordinatorOffline && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.65rem', backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={handleClaimCoordinator}
              >
                ⚠ Claim Coordinator
              </button>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-ink-2)' }}>
              📂 Backups: {Object.keys(state.backups || {}).length}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
      
      {/* Column 1: Bulletin Composer & History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Panel 1: Broadcast bulletin news composer */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.5rem', marginBottom: '16px' }}>
            SEBI Regulatory Notice Composer
          </h3>
          
          <form onSubmit={handleBroadcastNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Notice Type</label>
                <select className="input-field" value={noticeType} onChange={e => setNoticeType(e.target.value)}>
                  <option value="Circular">Circular</option>
                  <option value="Advisory">Advisory</option>
                  <option value="Show Cause Notice">Show Cause Notice</option>
                  <option value="Interim Order">Interim Order</option>
                  <option value="Final Order">Final Order</option>
                  <option value="Press Release">Press Release</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number (Auto)</label>
                <input
                  type="text"
                  className="input-field font-data"
                  style={{ backgroundColor: 'var(--color-surface-2)', cursor: 'not-allowed' }}
                  disabled
                  value={refNum}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Announcement Headline</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="Enter regulatory notice headline..."
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Official Details & Context</label>
              <textarea
                className="input-field font-data"
                rows="4"
                placeholder="Provide official regulatory bulletin text..."
                style={{ resize: 'none' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}>
              ⚖️ Issue Official Notice
            </button>
          </form>
        </div>

        {/* Panel: Staged Regulatory Notices Deck */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            📋 Staged Regulatory Bulletins
          </h3>
          <p style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', margin: 0 }}>
            Select a staged regulatory template to draft or broadcast it directly to the scrolling ticker.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {PRE_GENERATED_SEBI_NOTICES.map((notice, idx) => (
              <div key={idx} className="glass" style={{ padding: '12px', borderLeft: '4px solid var(--color-brass)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-ink)' }}>{notice.headline}</strong>
                  <span className="badge badge-public" style={{ fontSize: '0.6rem' }}>{notice.type}</span>
                </div>
                <p style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', margin: 0 }}>{notice.description}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleApplySebiNotice(notice)}>
                    📝 Draft Notice
                  </button>
                  <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)', border: 'none' }} onClick={() => handleQuickPublishSebiNotice(notice)}>
                    🚀 Broadcast Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dispatch History List */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Historical Bulletin Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
            {broadcastedNews.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>No bulletins broadcasted yet this session.</div>
            ) : (
              broadcastedNews.map(n => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-brass)' }}>
                      {n.headline}
                    </span>
                    <span className="font-data" style={{ fontSize: '0.7rem', color: 'var(--color-ink-3)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{n.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Column 2: Clock Timeline Control & Freeze Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Panel 2: Timeline Controls */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Simulation Control Deck
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>SIMULATED CLOCK</span>
              <SplitFlapText text={state.marketState.timeString || '09:00 AM'} />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-3)', display: 'block', marginTop: '4px' }}>
                REMAINING: {state.marketState.timeLeftString || '60:00'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>SESSION PHASE</span>
              <SplitFlapText text={state.marketState.sessionState || 'PRE_OPEN'} />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-3)', display: 'block', marginTop: '4px' }}>
                STATUS: {state.marketState.status || 'NotStarted'}
              </span>
            </div>
          </div>

          {state.marketState.status === 'NotStarted' && (
            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '12px'
            }}>
              <strong style={{ color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>📋 PRE-OPEN INTEGRITY CHECKLIST</strong>
              <div style={{ color: preOpenChecks.firebaseConnected ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.firebaseConnected ? '✓' : '✗'} Firebase connected
              </div>
              <div style={{ color: preOpenChecks.sessionInitialized ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.sessionInitialized ? '✓' : '✗'} Session initialized
              </div>
              <div style={{ color: preOpenChecks.activeTeamCountConfigured ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.activeTeamCountConfigured ? '✓' : '✗'} Active team count configured ({state.marketState?.activeTeamCount || 10} Teams)
              </div>
              <div style={{ color: preOpenChecks.expectedTeamsPresent ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.expectedTeamsPresent ? '✓' : '✗'} Expected teams present
              </div>
              <div style={{ color: preOpenChecks.startingCapitalVerified ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.startingCapitalVerified ? '✓' : '✗'} Starting cash & portfolio value verified
              </div>
              <div style={{ color: preOpenChecks.startingHoldingsVerified ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.startingHoldingsVerified ? '✓' : '✗'} Starting holdings verified empty
              </div>
              <div style={{ color: preOpenChecks.teamPortfoliosReset ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.teamPortfoliosReset ? '✓' : '✗'} Team portfolios reset
              </div>
              <div style={{ color: preOpenChecks.transactionHistoryEmpty ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.transactionHistoryEmpty ? '✓' : '✗'} Transaction history empty
              </div>
              <div style={{ color: preOpenChecks.newsFeedEmpty ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.newsFeedEmpty ? '✓' : '✗'} News feed empty
              </div>
              <div style={{ color: preOpenChecks.noBankruptcies ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.noBankruptcies ? '✓' : '✗'} No bankruptcies
              </div>
              <div style={{ color: preOpenChecks.noActiveOverrides ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.noActiveOverrides ? '✓' : '✗'} No active overrides or velocity targets
              </div>

              {!isMarketReady && (
                <div style={{
                  color: 'var(--color-fall)',
                  fontWeight: 'bold',
                  marginTop: '8px',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '8px',
                  fontSize: '0.75rem',
                  lineHeight: '1.4'
                }}>
                  ⚠️ INTEGRITY CHECK FAILED. You must complete a MASTER RESET from the Admin page before starting the session.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {state.marketState.status === 'NotStarted' ? (
              <button
                className="btn btn-primary"
                style={{
                  gridColumn: 'span 2',
                  backgroundColor: isMarketReady ? 'var(--color-rise)' : 'var(--color-border)',
                  cursor: isMarketReady ? 'pointer' : 'not-allowed',
                  opacity: isMarketReady ? 1 : 0.6
                }}
                disabled={!isMarketReady}
                onClick={() => handleMarketControl('START')}
              >
                🚀 Start Session
              </button>
            ) : (
              <>
                {state.marketState.status === 'Open' ? (
                  <button className="btn btn-secondary" style={{ backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }} onClick={() => handleMarketControl('PAUSE')}>
                    ⏸ Pause Session
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleMarketControl('RESUME')}>
                    ▶ Resume Session
                  </button>
                )}
                <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)' }} onClick={() => handleMarketControl('CLOSE')}>
                  ⏹ Stop/Close Session
                </button>
              </>
            )}
          </div>

          {/* Emergency Action Matrix */}
          <div style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-fall)' }}>
              🚨 Emergency Action Console
            </h4>
            
            {/* Market-wide Halts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: 'var(--color-fall)', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', padding: '8px' }}
                onClick={() => handleMarketWideAction('HALT_ALL_TRADING')}
              >
                🛑 Halt All Trading
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: 'var(--color-rise)', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', padding: '8px' }}
                onClick={() => handleMarketWideAction('RESUME_ALL_TRADING')}
              >
                🟢 Resume All Trading
              </button>
            </div>

            {/* Sector Halts */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="input-field"
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
                value={selectedEmergencySector}
                onChange={e => setSelectedEmergencySector(e.target.value)}
              >
                <option value="">Choose Sector to Halt...</option>
                <option value="Technology">Technology</option>
                <option value="Financials">Financials</option>
                <option value="Energy">Energy</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Industrials">Industrials</option>
                <option value="Consumer Goods">Consumer Goods</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Materials">Materials</option>
                <option value="Utilities">Utilities</option>
                <option value="Real Estate">Real Estate</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', border: 'none', fontWeight: 'bold' }}
                onClick={() => handleSectorHalt('PAUSE_SECTOR', selectedEmergencySector)}
              >
                Freeze
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)', border: 'none', fontWeight: 'bold' }}
                onClick={() => handleSectorHalt('RESUME_SECTOR', selectedEmergencySector)}
              >
                Unfreeze
              </button>
            </div>

            {/* Session State Transitions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="input-field"
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
                value={selectedSessionState}
                onChange={e => setSelectedSessionState(e.target.value)}
              >
                <option value="PRE_OPEN">PRE_OPEN</option>
                <option value="CONTINUOUS_TRADING">CONTINUOUS_TRADING</option>
                <option value="CLOSING">CLOSING (Reconciliation)</option>
                <option value="MARKET_CLOSED">MARKET_CLOSED</option>
                <option value="RESULTS">RESULTS</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--color-brass)', color: '#000', border: 'none', fontWeight: 'bold' }}
                onClick={() => handleTransitionSession(selectedSessionState)}
              >
                Transition Phase
              </button>
            </div>
          </div>
        </div>

        {/* Panel: SAAMX Event Scenario Sequence Player */}
        {(() => {
          const currentPreset = NEWS_PRESETS.find(p => p.step === currentNewsStep) || null;
          return (
            <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1.5px solid var(--color-brass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.25rem', margin: 0 }}>
                  🎭 SAAMX Event Scenario Wire
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onClick={handleResetStep}
                >
                  ⏪ Reset to Step 1
                </button>
              </div>

              {currentPreset ? (
                <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-brass)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-brass)' }}>
                      ▶ NEXT NEWS: STEP {currentNewsStep} / {NEWS_PRESETS.length}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: currentPreset.sentiment === 'Positive' ? 'var(--color-rise-light)' : currentPreset.sentiment === 'Negative' ? 'var(--color-fall-light)' : 'var(--color-border)',
                      color: currentPreset.sentiment === 'Positive' ? 'var(--color-rise)' : currentPreset.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-ink-2)'
                    }}>
                      {currentPreset.sentiment} ({currentPreset.impactPercent > 0 ? `+${currentPreset.impactPercent}%` : `${currentPreset.impactPercent}%`})
                    </span>
                  </div>

                  <strong style={{ color: 'var(--color-ink)', fontSize: '1.05rem', display: 'block' }}>
                    {currentPreset.headline}
                  </strong>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                    {currentPreset.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-ink-2)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '4px' }}>
                    <span><strong>Sector:</strong> {currentPreset.affectedSector || 'Macro / Universal'}</span>
                    {currentPreset.affectedSecurityIds && currentPreset.affectedSecurityIds.length > 0 && (
                      <span><strong>Targets:</strong> {currentPreset.affectedSecurityIds.join(', ')}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      backgroundColor: 'var(--color-brass)',
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      padding: '12px',
                      boxShadow: '0 4px 12px rgba(197, 160, 89, 0.2)',
                      cursor: 'pointer',
                      border: 'none',
                      borderRadius: '6px'
                    }}
                    onClick={() => handleBroadcastStep(currentNewsStep)}
                  >
                    🚀 BROADCAST STEP {currentNewsStep} NEWS
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-rise)', fontWeight: 'bold', backgroundColor: 'var(--color-rise-light)', borderRadius: '8px' }}>
                  ✓ All 80 Scheduled Event Scenario News Items Have Been Successfully Broadcasted!
                </div>
              )}

              {/* Scrollable list of all steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-ink-2)' }}>
                  📋 SCENARIO TIMELINE DIRECTORY ({NEWS_PRESETS.length} STEPS)
                </span>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-2)', padding: '6px' }}>
                  {NEWS_PRESETS.map((preset) => {
                    const isBroadcasted = preset.step < currentNewsStep;
                    const isCurrent = preset.step === currentNewsStep;

                    return (
                      <div
                        key={preset.step}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: isCurrent ? 'rgba(197, 160, 89, 0.08)' : 'transparent',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '75%' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: isBroadcasted ? 'var(--color-rise)' : isCurrent ? 'var(--color-brass)' : 'var(--color-ink-3)',
                            minWidth: '55px'
                          }}>
                            {isBroadcasted ? '✓ Step ' : isCurrent ? '▶ Step ' : '⏳ Step '}{preset.step}
                          </span>
                          <span style={{
                            color: isBroadcasted ? 'var(--color-ink-3)' : 'var(--color-ink)',
                            textDecoration: isBroadcasted ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={preset.headline}>
                            {preset.headline}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            backgroundColor: isBroadcasted ? 'var(--color-surface-3)' : 'var(--color-brass-light)',
                            color: isBroadcasted ? 'var(--color-ink-3)' : 'var(--color-brass)',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleBroadcastStep(preset.step)}
                        >
                          Trigger
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Panel: Blockbuster IPO Launch Deck */}
        {(() => {
          const pendingIpos = state.securities.filter(s => s.status === 'IPO_PENDING');
          if (pendingIpos.length === 0) return null;
          return (
            <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1.5px solid var(--color-brass)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.25rem', margin: 0 }}>
                🚀 Blockbuster IPO Launch Deck
              </h3>
              <p style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', margin: 0 }}>
                The following startup companies are registered with SEBI in staged (pending) status. Click launch to open active trading.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingIpos.map(sec => (
                  <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--color-ink)' }}>{sec.ticker}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', marginLeft: '6px' }}>{sec.name} (Base: ₹{sec.basePrice})</span>
                    </div>
                    <button type="button" className="btn" style={{ backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)', border: 'none', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 'bold' }} onClick={async () => {
                      const confirmLaunch = window.confirm(`Launch public IPO listing for ${sec.ticker}?`);
                      if (!confirmLaunch) return;
                      try {
                        const res = await apiFetch('/api/securities', {
                          method: 'PUT',
                          body: { ticker: sec.ticker, status: 'Active' }
                        });
                        if (res.ok) {
                          alert(`IPO Launch Successful! ${sec.ticker} is now active for trade processing.`);
                        }
                      } catch (err) {
                        alert('Launch failed: ' + err.message);
                      }
                    }}>
                      🚀 Launch IPO
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Panel 3: Bankruptcy Stepper */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Staged Bankruptcy Stepper
          </h3>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Select Target Security</label>
            <select className="input-field" value={stageSecId} onChange={e => { setStageSecId(e.target.value); setStageConfirmState(false); }}>
              <option value="">Choose Asset...</option>
              {state.securities
                .filter(s => s.status !== 'Bankrupt' && s.status !== 'Delisted')
                .map(s => <option key={s.id} value={s.id}>{s.ticker} - {s.name}</option>)
              }
            </select>
          </div>

          {stageSecId && (
            (() => {
              const sec = state.securities.find(s => s.id === stageSecId);
              if (!sec) return null;
              const step1Done = investigatingSecIds[sec.id] || sec.status === 'Halted';
              const step2Done = sec.status === 'Halted';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={step1Done} onClick={() => handleStage1OpenInvestigation(sec)}>
                      Step 1: Open Investigation
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={!step1Done || step2Done} onClick={() => handleStage2SuspendTrading(sec)}>
                      Step 2: Suspend Trading
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn" style={{ backgroundColor: 'var(--color-fall)', color: 'var(--color-surface)', fontSize: '0.85rem' }} disabled={!step2Done} onClick={() => handleStage3Liquidate(sec)}>
                      {stageConfirmState ? '⚠️ CONFIRM LIQUIDATION' : 'Step 3: Liquidate Asset'}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Panel 4: Circuit Breaker Monitor */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Circuit Breaker Dashboard
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeCircuitBreakers.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                No circuit breakers active — market conditions normal.
              </div>
            ) : (
              activeCircuitBreakers.map(s => (
                <div
                  key={s.id}
                  className="glass"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--color-fall)'
                  }}
                >
                  <div>
                    <strong className="font-data" style={{ color: 'var(--color-fall)' }}>{s.ticker}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block' }}>{s.name}</span>
                  </div>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: s.status === 'Halted' ? 'var(--color-rise)' : 'var(--color-fall)',
                      color: 'var(--color-surface)'
                    }}
                    onClick={() => handleFreezeToggle(s)}
                  >
                    {s.status === 'Halted' ? 'UNFREEZE' : 'FREEZE'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel: Staged Scenario Storyline Deck & Interventions */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1.5px solid var(--color-fall)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fall)', fontSize: '1.25rem', margin: 0 }}>
              🛡️ Simulation Storyline & Staged Events Deck
            </h3>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--color-surface-3)', color: 'var(--color-brass)', fontWeight: 'bold' }}>
              {Object.keys(state.firedPhoenixActs || {}).length} / {STAGED_INTERVENTION_PROTOCOLS.length} FIRED
            </span>
          </div>

          {/* Storyline Status Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--color-surface-2)', padding: '10px', borderRadius: '6px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', textTransform: 'uppercase' }}>Current Active Phase</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-rise)', marginTop: '2px' }}>
                {[...STAGED_INTERVENTION_PROTOCOLS].reverse().find(a => state.firedPhoenixActs && state.firedPhoenixActs[a.actNumber])?.label || 'Pre-Market / Initial State'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', textTransform: 'uppercase' }}>Next Scheduled Event</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-brass)', marginTop: '2px' }}>
                {STAGED_INTERVENTION_PROTOCOLS.find(a => !state.firedPhoenixActs || !state.firedPhoenixActs[a.actNumber])?.label || 'All Storyline Events Completed'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="input-field"
              style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}
              value={selectedAct}
              onChange={e => setSelectedAct(Number(e.target.value))}
            >
              {STAGED_INTERVENTION_PROTOCOLS.map((act) => {
                const fired = state.firedPhoenixActs && state.firedPhoenixActs[act.actNumber];
                return (
                  <option key={act.id} value={act.actNumber} disabled={fired}>
                    T+{String(act.triggerMinute).padStart(2, '0')}m — {act.label} {fired ? '✓' : ''}
                  </option>
                );
              })}
            </select>
            <button
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'var(--color-fall)', color: '#fff' }}
              onClick={() => handleFireAct(selectedAct)}
            >
              ⚡ FIRE STAGE
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-ink-2)' }}>
              📋 SCENARIO STAGES DIRECTORY
            </span>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-2)', padding: '6px' }}>
              {STAGED_INTERVENTION_PROTOCOLS.map((act) => {
                const fired = state.firedPhoenixActs && state.firedPhoenixActs[act.actNumber];
                return (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                      <span style={{ fontWeight: 'bold', color: fired ? 'var(--color-rise)' : 'var(--color-ink-2)' }}>
                        {fired ? '✓ Active' : '⏳ Staged'} (T+{act.triggerMinute}m)
                      </span>
                      <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{act.label}</span>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      disabled={fired}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        backgroundColor: fired ? 'var(--color-surface-3)' : 'var(--color-fall-light)',
                        color: fired ? 'var(--color-ink-3)' : 'var(--color-fall)',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: fired ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => handleFireAct(act.actNumber)}
                    >
                      Fire
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel: Final Market Reconciliation & Leaderboard Publication */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '2px solid var(--color-brass)', backgroundColor: 'rgba(212, 175, 55, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.25rem', margin: 0 }}>
              🏆 Market Reconciliation & Results Publishing
            </h3>
            <span className="badge" style={{ backgroundColor: 'var(--color-brass)', color: '#000', fontWeight: 'bold', fontSize: '0.7rem' }}>
              PHASE 5 RECONCILIATION
            </span>
          </div>
          <p style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
            At session end (15:30), SEBI triggers atomic market reconciliation. This securely locks all orders, values holdings at final prices, determines official team ranks, computes all 9 special awards, and saves an immutable results ledger.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '0.9rem',
                fontWeight: 800,
                backgroundColor: 'var(--color-brass)',
                color: '#000',
                letterSpacing: '0.04em'
              }}
              onClick={handleReconcileMarket}
            >
              🏁 RECONCILE MARKET & PUBLISH FINAL LEADERBOARD
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '10px 14px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
              onClick={async () => {
                try {
                  const res = await apiFetch('/api/admin/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword }
                  });
                  const d = await res.json();
                  if (res.ok) alert(`Backup Snapshot Created: ${d.backupId}`);
                } catch (e) {
                  alert('Backup failed: ' + e.message);
                }
              }}
            >
              💾 Save Snapshot
            </button>
          </div>
        </div>

      </div>

    </div>
    </div>
  );
}
