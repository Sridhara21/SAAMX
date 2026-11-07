import React, { useState, useEffect } from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';
import { apiFetch } from '../lib/api.js';
import { useDensity } from '../context/DensityContext.jsx';
import { NEWS_PRESETS } from '../lib/newsPresets.js';
import { db, ref, onValue } from '../lib/firebase.js';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SectionHeader,
  Badge,
  Alert,
  EmptyState
} from '../components/ui/index.js';
import {
  IconBuilding,
  IconTrophy,
  IconRefreshCw,
  IconAlertTriangle,
  IconDatabase,
  IconScale,
  IconClipboardList,
  IconFileText,
  IconSend,
  IconCheck,
  IconX,
  IconPlay,
  IconPause,
  IconSlash,
  IconRadio,
  IconLayers,
  IconTrendingUp,
  IconShieldAlert,
  IconZap,
  IconDownload,
  IconClock
} from '../lib/icons.jsx';

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
  const { density } = useDensity();
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
    const status = state?.marketState?.status || 'NotStarted';
    const startTime = state?.marketState?.simulationStartTime;
    const durationMins = state?.marketState?.simulationDurationMinutes || 360;
    const mode = state?.marketState?.timerMode || 'SCHEDULE_SYNC';
    const pauseOffset = state?.marketState?.pauseTimeOffset || 0;
    const pausedAt = state?.marketState?.pausedAt;

    if (status === 'Closed') {
      setTimeLeft('00:00');
      return;
    }

    if (mode === 'SCHEDULE_SYNC') {
      const updateScheduleClock = () => {
        const currentServerTime = Date.now() + serverTimeOffset;
        let curHours = 9, curMins = 30, curSecs = 0;
        try {
          const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).formatToParts(new Date(currentServerTime));
          curHours = parseInt(parts.find(p => p.type === 'hour')?.value || '9', 10);
          curMins = parseInt(parts.find(p => p.type === 'minute')?.value || '30', 10);
          curSecs = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
        } catch (e) {
          const d = new Date(currentServerTime);
          curHours = d.getHours();
          curMins = d.getMinutes();
          curSecs = d.getSeconds();
        }
        const curTotalMins = curHours * 60 + curMins;

        if (curTotalMins >= 15 * 60 + 30) {
          setTimeLeft('00:00');
          return;
        }

        let targetMins = 15 * 60 + 30;
        if (curTotalMins < 9 * 60 + 30) {
          targetMins = 9 * 60 + 30;
        } else if (curTotalMins >= 12 * 60 && curTotalMins < 13 * 60) {
          targetMins = 13 * 60;
        }

        const diffMins = Math.max(0, targetMins - curTotalMins);
        const diffSecs = (60 - curSecs) % 60;
        const displayMins = diffSecs === 0 ? diffMins : Math.max(0, diffMins - 1);
        const displayHours = Math.floor(displayMins / 60);
        const remMins = displayMins % 60;
        const formatted = displayHours > 0
          ? `${String(displayHours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`
          : `${String(remMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
        setTimeLeft(formatted);
      };

      updateScheduleClock();
      const interval = setInterval(updateScheduleClock, 1000);
      return () => clearInterval(interval);
    }

    if (status === 'NotStarted' || !startTime) {
      setTimeLeft(`${String(durationMins).padStart(2, '0')}:00`);
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
        alert(`MARKET RECONCILED & RESULTS PUBLISHED!\n\nRank 1: Team ${data.leaderboard?.[0]?.teamId} (₹${data.leaderboard?.[0]?.portfolioValue?.toLocaleString()})\nRank 2: Team ${data.leaderboard?.[1]?.teamId} (₹${data.leaderboard?.[1]?.portfolioValue?.toLocaleString()})\nRank 3: Team ${data.leaderboard?.[2]?.teamId} (₹${data.leaderboard?.[2]?.portfolioValue?.toLocaleString()})\n\nSession state has been transitioned to 'RESULTS'. All trading remains securely frozen.`);
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
      // 1. Authoritative Backend Claim (strictly validated by server RBAC)
      const token = localStorage.getItem('token') || localStorage.getItem('saamx_token');
      const headers = { 'Content-Type': 'application/json' };
      await apiFetch('/api/coordinator/claim', {
        method: 'POST',
        body: JSON.stringify({
          sessionUuid: mySessionUuid,
          role: 'sebi'
        })
      });

      // Coordinator claimed authoritatively via backend POST /api/coordinator/claim; RTDB heartbeat mirrored at ref(db, 'fms/coordinator')

      alert('Coordinator status claimed successfully via authoritative backend!');
    } catch (e) {
      alert('Failed to claim coordinator: ' + e.message);
    }
  };

  // Staged Stepper Handlers
  const handleStage1OpenInvestigation = async (sec) => {
    setInvestigatingSecIds({ ...investigatingSecIds, [sec.id]: true });
    const refNum = `SEBI/SAAMX/2026/${state.newsEvents.length + 1001}`;
    const payload = {
      headline: `[SEBI INVESTIGATION] Formal Investigation Opened into ${sec.name} (${sec.ticker})`,
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
    const fullHeadline = `[SEBI ${noticeType.toUpperCase()}] ${headline}`;
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
    const fullHeadline = `[SEBI ${notice.type.toUpperCase()}] ${notice.headline}`;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '18px', padding: density === 'compact' ? '12px 16px 104px' : '20px 24px 104px', maxWidth: '1680px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Institutional SEBI Desk Header */}
      <Card variant="frosted" density={density} style={{ borderLeft: '6px solid var(--color-warning)', padding: density === 'compact' ? '14px 18px' : '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              <IconBuilding size={14} color="var(--color-warning)" />
              <span>SECURITIES & EXCHANGE BOARD SURVEILLANCE</span>
            </div>
            <h1 style={{ fontSize: density === 'compact' ? '1.6rem' : '2rem', fontWeight: 900, fontFamily: 'var(--font-brand)', margin: 0, color: 'var(--color-text-primary)' }}>
              SEBI Regulatory Command Console
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: density === 'compact' ? '0.82rem' : '0.88rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Market oversight, circuit breaker intervention, regulatory announcements & audit reconciliation.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={handleReconcileMarket}
              style={{ padding: density === 'compact' ? '8px 14px' : '10px 18px', fontSize: '0.88rem', fontWeight: 800 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <IconTrophy size={16} />
                <span>Reconcile & Publish Results</span>
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Mode Control & Health Status Matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: density === 'compact' ? '12px' : '16px'
      }}>
        {/* Simulation Mode Toggle card */}
        <Card variant="frosted" density={density} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SIMULATION MODE</strong>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-display" style={{ fontSize: '1.2rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>
              {state.marketState?.mode || 'DEMO'} MODE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetMode((state.marketState?.mode || 'DEMO') === 'DEMO' ? 'EVENT' : 'DEMO')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconRefreshCw size={14} />
                <span>Switch to {(state.marketState?.mode || 'DEMO') === 'DEMO' ? 'EVENT' : 'DEMO'}</span>
              </span>
            </Button>
          </div>
        </Card>

        {/* Health check panel */}
        <Card variant="frosted" density={density} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CORE DESK HEALTH</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.8rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connected ? 'var(--color-rise)' : 'var(--color-fall)', display: 'inline-block' }}></span>
              {connected ? 'Firebase Online' : 'Firebase Offline'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: !isCoordinatorOffline ? 'var(--color-rise)' : 'var(--color-fall)', display: 'inline-block' }}></span>
              {!isCoordinatorOffline ? 'Coordinator Heartbeat Active' : 'Coordinator Heartbeat Missing'}
            </span>
            {isCoordinatorOffline && (
              <Button
                variant="danger"
                size="sm"
                style={{ padding: '4px 8px', fontSize: '0.65rem' }}
                onClick={handleClaimCoordinator}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconAlertTriangle size={12} />
                  <span>Claim Coordinator</span>
                </span>
              </Button>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
              <IconDatabase size={14} />
              <span>Backups: <strong className="font-mono tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{Object.keys(state.backups || {}).length}</strong></span>
            </span>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: density === 'compact' ? '16px' : '24px' }}>
      
      {/* Column 1: Bulletin Composer & History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '16px' : '24px' }}>
        
        {/* Panel 1: Broadcast bulletin news composer */}
        <Card variant="frosted" density={density}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-warning)', fontSize: '1.4rem', marginBottom: '16px', fontWeight: 800 }}>
            SEBI Regulatory Notice Composer
          </h3>
          
          <form onSubmit={handleBroadcastNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Notice Type</label>
                <select
                  value={noticeType}
                  onChange={e => setNoticeType(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                >
                  <option value="Circular">Circular</option>
                  <option value="Advisory">Advisory</option>
                  <option value="Show Cause Notice">Show Cause Notice</option>
                  <option value="Interim Order">Interim Order</option>
                  <option value="Final Order">Final Order</option>
                  <option value="Press Release">Press Release</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Reference Number (Auto)</label>
                <input
                  type="text"
                  className="font-data tabular-nums"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'not-allowed'
                  }}
                  disabled
                  value={refNum}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Announcement Headline</label>
              <input
                type="text"
                required
                placeholder="Enter regulatory notice headline..."
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Official Details & Context</label>
              <textarea
                rows="4"
                placeholder="Provide official regulatory bulletin text..."
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.88rem',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)'
                }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" style={{ width: '100%', padding: '12px', fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <IconScale size={16} />
                <span>Issue Official Notice</span>
              </span>
            </Button>
          </form>
        </Card>

        {/* Panel: Staged Regulatory Notices Deck */}
        <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-brand)', color: 'var(--color-text-primary)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 800 }}>
            <IconClipboardList size={18} color="var(--color-warning)" />
            <span>Staged Regulatory Bulletins</span>
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0 }}>
            Select a staged regulatory template to draft or broadcast it directly to the scrolling ticker.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {PRE_GENERATED_SEBI_NOTICES.map((notice, idx) => (
              <div key={idx} style={{ padding: '12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-warning)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{notice.headline}</strong>
                  <span className="badge badge-public" style={{ fontSize: '0.65rem' }}>{notice.type}</span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', margin: 0 }}>{notice.description}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Button variant="secondary" size="sm" onClick={() => handleApplySebiNotice(notice)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <IconFileText size={12} />
                      <span>Draft Notice</span>
                    </span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleQuickPublishSebiNotice(notice)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <IconSend size={12} />
                      <span>Broadcast Live</span>
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dispatch History List */}
        <Card variant="frosted" density={density}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.25rem', marginBottom: '16px', fontWeight: 800 }}>
            Historical Bulletin Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
            {broadcastedNews.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No bulletins broadcasted yet this session.</div>
            ) : (
              broadcastedNews.map(n => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                      {n.headline}
                    </span>
                    <span className="font-data tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{n.description}</p>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* Column 2: Clock Timeline Control & Freeze Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '16px' : '24px' }}>
        
        {/* Panel 2: Simulation Control Deck */}
        <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
              Simulation Control Deck
            </h3>
            <Badge variant={state.marketState.status === 'Open' ? 'success' : state.marketState.status === 'Paused' ? 'warning' : 'neutral'}>
              {state.marketState.status || 'NotStarted'}
            </Badge>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
            padding: density === 'compact' ? '12px' : '16px',
            borderRadius: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>SIMULATED CLOCK</span>
              <SplitFlapText text={state.marketState.timeString || '09:00 AM'} />
              <span className="font-data tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                REMAINING: {timeLeft || state.marketState.timeLeftString || '00:00'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>SESSION PHASE</span>
              <SplitFlapText text={state.marketState.sessionState || 'PRE_OPEN'} />
              <span className="font-data tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                STATUS: {state.marketState.status || 'NotStarted'}
              </span>
            </div>
          </div>

          {state.marketState.status === 'NotStarted' && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <IconClipboardList size={16} color="var(--color-warning)" />
                <strong style={{ color: 'var(--color-text-primary)' }}>PRE-OPEN INTEGRITY CHECKLIST</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.firebaseConnected ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.firebaseConnected ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Firebase connected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.sessionInitialized ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.sessionInitialized ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Session initialized</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.activeTeamCountConfigured ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.activeTeamCountConfigured ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span className="tabular-nums">Active team count configured ({state.marketState?.activeTeamCount || 10} Teams)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.expectedTeamsPresent ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.expectedTeamsPresent ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Expected teams present</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.startingCapitalVerified ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.startingCapitalVerified ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Starting cash & portfolio value verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.startingHoldingsVerified ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.startingHoldingsVerified ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Starting holdings verified empty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.teamPortfoliosReset ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.teamPortfoliosReset ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Team portfolios reset</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.transactionHistoryEmpty ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.transactionHistoryEmpty ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>Transaction history empty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.newsFeedEmpty ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.newsFeedEmpty ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>News feed empty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.noBankruptcies ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.noBankruptcies ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>No bankruptcies</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: preOpenChecks.noActiveOverrides ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {preOpenChecks.noActiveOverrides ? <IconCheck size={14} color="var(--color-rise)" /> : <IconX size={14} color="var(--color-fall)" />}
                <span>No active overrides or velocity targets</span>
              </div>

              {!isMarketReady && (
                <div style={{
                  color: 'var(--color-fall)',
                  fontWeight: 'bold',
                  marginTop: '8px',
                  borderTop: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
                  paddingTop: '8px',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <IconAlertTriangle size={14} color="var(--color-fall)" />
                  <span>INTEGRITY CHECK FAILED. You must complete a MASTER RESET from the Admin page before starting the session.</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {state.marketState.status === 'NotStarted' ? (
              <Button
                variant="primary"
                style={{
                  gridColumn: 'span 2',
                  backgroundColor: isMarketReady ? 'var(--color-rise)' : 'var(--color-border-subtle, rgba(255, 255, 255, 0.1))',
                  cursor: isMarketReady ? 'pointer' : 'not-allowed',
                  opacity: isMarketReady ? 1 : 0.6
                }}
                disabled={!isMarketReady}
                onClick={() => handleMarketControl('START')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <IconPlay size={16} />
                  <span>Start Session</span>
                </span>
              </Button>
            ) : (
              <>
                {state.marketState.status === 'Open' ? (
                  <Button variant="secondary" onClick={() => handleMarketControl('PAUSE')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconPause size={14} />
                      <span>Pause Session</span>
                    </span>
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => handleMarketControl('RESUME')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconPlay size={14} />
                      <span>Resume Session</span>
                    </span>
                  </Button>
                )}
                <Button variant="danger" onClick={() => handleMarketControl('CLOSE')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconSlash size={14} />
                    <span>Stop/Close Session</span>
                  </span>
                </Button>
              </>
            )}
          </div>

          {/* Emergency Action Matrix */}
          <div style={{
            borderTop: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
            paddingTop: '16px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--color-fall)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <IconAlertTriangle size={18} color="var(--color-fall)" />
              <span>Emergency Action Console</span>
            </h4>
            
            {/* Market-wide Halts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Button
                variant="danger"
                style={{ fontWeight: 700, fontSize: '0.8rem', padding: '8px' }}
                onClick={() => handleMarketWideAction('HALT_ALL_TRADING')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconPause size={14} />
                  <span>Halt All Trading</span>
                </span>
              </Button>
              <Button
                variant="success"
                style={{ fontWeight: 700, fontSize: '0.8rem', padding: '8px' }}
                onClick={() => handleMarketWideAction('RESUME_ALL_TRADING')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconPlay size={14} />
                  <span>Resume All Trading</span>
                </span>
              </Button>
            </div>

            {/* Sector Halts */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="input-field"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
                  borderRadius: '8px',
                  outline: 'none'
                }}
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
              <Button
                type="button"
                variant="danger"
                size="sm"
                style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                onClick={() => handleSectorHalt('PAUSE_SECTOR', selectedEmergencySector)}
              >
                Freeze
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                onClick={() => handleSectorHalt('RESUME_SECTOR', selectedEmergencySector)}
              >
                Unfreeze
              </Button>
            </div>

            {/* Session State Transitions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="input-field"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
                  borderRadius: '8px',
                  outline: 'none'
                }}
                value={selectedSessionState}
                onChange={e => setSelectedSessionState(e.target.value)}
              >
                <option value="PRE_OPEN">PRE_OPEN</option>
                <option value="CONTINUOUS_TRADING">CONTINUOUS_TRADING</option>
                <option value="CLOSING">CLOSING (Reconciliation)</option>
                <option value="MARKET_CLOSED">MARKET_CLOSED</option>
                <option value="RESULTS">RESULTS</option>
              </select>
              <Button
                type="button"
                variant="primary"
                size="sm"
                style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                onClick={() => handleTransitionSession(selectedSessionState)}
              >
                Transition Phase
              </Button>
            </div>
          </div>
        </Card>

        {/* Panel: SAAMX Event Scenario Sequence Player */}
        {(() => {
          const currentPreset = NEWS_PRESETS.find(p => p.step === currentNewsStep) || null;
          return (
            <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '16px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-warning)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 700 }}>
                  <IconRadio size={18} color="var(--color-warning)" />
                  <span>SAAMX Event Scenario Wire</span>
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResetStep}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconRefreshCw size={12} />
                    <span>Reset to Step 1</span>
                  </span>
                </Button>
              </div>

              {currentPreset ? (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: density === 'compact' ? '12px' : '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--color-warning)',
                  borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                  borderRight: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                  borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-data tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
                      NEXT NEWS: STEP {currentNewsStep} / {NEWS_PRESETS.length}
                    </span>
                    <Badge variant={currentPreset.sentiment === 'Positive' ? 'success' : currentPreset.sentiment === 'Negative' ? 'danger' : 'neutral'}>
                      {currentPreset.sentiment} ({currentPreset.impactPercent > 0 ? `+${currentPreset.impactPercent}%` : `${currentPreset.impactPercent}%`})
                    </Badge>
                  </div>

                  <strong style={{ color: 'var(--color-text-primary)', fontSize: '1.05rem', display: 'block' }}>
                    {currentPreset.headline}
                  </strong>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                    {currentPreset.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))', paddingTop: '10px', marginTop: '4px' }}>
                    <span><strong style={{ color: 'var(--color-text-secondary)' }}>Sector:</strong> {currentPreset.affectedSector || 'Macro / Universal'}</span>
                    {currentPreset.affectedSecurityIds && currentPreset.affectedSecurityIds.length > 0 && (
                      <span><strong style={{ color: 'var(--color-text-secondary)' }}>Targets:</strong> {currentPreset.affectedSecurityIds.join(', ')}</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      backgroundColor: 'var(--color-warning)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      padding: '10px 14px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                    }}
                    onClick={() => handleBroadcastStep(currentNewsStep)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <IconSend size={16} />
                      <span>BROADCAST STEP {currentNewsStep} NEWS</span>
                    </span>
                  </Button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-rise)', fontWeight: 'bold', backgroundColor: 'var(--color-rise-light, rgba(16, 185, 129, 0.1))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <IconCheck size={18} color="var(--color-rise)" />
                  <span>All 80 Scheduled Event Scenario News Items Have Been Successfully Broadcasted!</span>
                </div>
              )}

              {/* Scrollable list of all steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconLayers size={14} />
                  <span>SCENARIO TIMELINE DIRECTORY ({NEWS_PRESETS.length} STEPS)</span>
                </span>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '6px' }}>
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
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.05))',
                          backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '75%' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: isBroadcasted ? 'var(--color-rise)' : isCurrent ? 'var(--color-warning)' : 'var(--color-text-muted)',
                            minWidth: '65px',
                            fontFamily: 'var(--font-mono)'
                          }} className="tabular-nums font-data">
                            {isBroadcasted ? '[DONE] ' : isCurrent ? '[NEXT] ' : '       '}Step {preset.step}
                          </span>
                          <span style={{
                            color: isBroadcasted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                            textDecoration: isBroadcasted ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={preset.headline}>
                            {preset.headline}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                          onClick={() => handleBroadcastStep(preset.step)}
                        >
                          Trigger
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })()}

        {/* Panel: Blockbuster IPO Launch Deck */}
        {(() => {
          const pendingIpos = state.securities.filter(s => s.status === 'IPO_PENDING');
          if (pendingIpos.length === 0) return null;
          return (
            <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-warning)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 700 }}>
                <IconTrendingUp size={18} color="var(--color-warning)" />
                <span>Blockbuster IPO Launch Deck</span>
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                The following startup companies are registered with SEBI in staged (pending) status. Click launch to open active trading.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingIpos.map(sec => (
                  <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <strong className="font-data" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{sec.ticker}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>{sec.name} (Base: ₹<span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{sec.basePrice}</span>)</span>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={async () => {
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
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <IconTrendingUp size={14} />
                        <span>Launch IPO</span>
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Panel 3: Bankruptcy Stepper */}
        <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
            Staged Bankruptcy Stepper
          </h3>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Select Target Security</label>
            <select
              className="input-field"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
                borderRadius: '8px',
                outline: 'none'
              }}
              value={stageSecId}
              onChange={e => { setStageSecId(e.target.value); setStageConfirmState(false); }}
            >
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Button variant="secondary" size="sm" disabled={step1Done} onClick={() => handleStage1OpenInvestigation(sec)}>
                      Step 1: Open Investigation
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Button variant="secondary" size="sm" disabled={!step1Done || step2Done} onClick={() => handleStage2SuspendTrading(sec)}>
                      Step 2: Suspend Trading
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Button variant="danger" size="sm" disabled={!step2Done} onClick={() => handleStage3Liquidate(sec)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {stageConfirmState && <IconAlertTriangle size={14} />}
                        <span>{stageConfirmState ? 'CONFIRM LIQUIDATION' : 'Step 3: Liquidate Asset'}</span>
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })()
          )}
        </Card>

        {/* Panel 4: Circuit Breaker Monitor */}
        <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
            Circuit Breaker Dashboard
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeCircuitBreakers.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--color-border-subtle, rgba(255,255,255,0.1))', borderRadius: '6px' }}>
                No circuit breakers active — market conditions normal.
              </div>
            ) : (
              activeCircuitBreakers.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <strong className="font-data" style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-mono)' }}>{s.ticker}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block' }}>{s.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={s.status === 'Halted' ? 'success' : 'danger'}
                    onClick={() => handleFreezeToggle(s)}
                  >
                    {s.status === 'Halted' ? 'UNFREEZE' : 'FREEZE'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Panel: Staged Scenario Storyline Deck & Interventions */}
        <Card variant="frosted" density={density} style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fall)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 700 }}>
              <IconShieldAlert size={18} color="var(--color-fall)" />
              <span>Simulation Storyline & Staged Events Deck</span>
            </h3>
            <Badge variant="warning">
              <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>
                {Object.keys(state.firedPhoenixActs || {}).length} / {STAGED_INTERVENTION_PROTOCOLS.length} FIRED
              </span>
            </Badge>
          </div>

          {/* Storyline Status Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))', padding: '12px', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Active Phase</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-rise)', marginTop: '2px' }}>
                {[...STAGED_INTERVENTION_PROTOCOLS].reverse().find(a => state.firedPhoenixActs && state.firedPhoenixActs[a.actNumber])?.label || 'Pre-Market / Initial State'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Next Scheduled Event</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-warning)', marginTop: '2px' }}>
                {STAGED_INTERVENTION_PROTOCOLS.find(a => !state.firedPhoenixActs || !state.firedPhoenixActs[a.actNumber])?.label || 'All Storyline Events Completed'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="input-field"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
                borderRadius: '8px',
                outline: 'none'
              }}
              value={selectedAct}
              onChange={e => setSelectedAct(Number(e.target.value))}
            >
              {STAGED_INTERVENTION_PROTOCOLS.map((act) => {
                const fired = state.firedPhoenixActs && state.firedPhoenixActs[act.actNumber];
                return (
                  <option key={act.id} value={act.actNumber} disabled={fired}>
                    T+{String(act.triggerMinute).padStart(2, '0')}m — {act.label} {fired ? '(FIRED)' : ''}
                  </option>
                );
              })}
            </select>
            <Button
              variant="danger"
              style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800 }}
              onClick={() => handleFireAct(selectedAct)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconZap size={14} />
                <span>FIRE STAGE</span>
              </span>
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconLayers size={14} />
              <span>SCENARIO STAGES DIRECTORY</span>
            </span>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '6px' }}>
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
                      borderBottom: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05))',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: fired ? 'var(--color-rise)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }} className="tabular-nums font-data">
                        {fired ? <IconCheck size={12} color="var(--color-rise)" /> : <IconClock size={12} />}
                        <span>{fired ? 'Active' : 'Staged'} (T+{act.triggerMinute}m)</span>
                      </span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{act.label}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={fired}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        cursor: fired ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => handleFireAct(act.actNumber)}
                    >
                      Fire
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Panel: Final Market Reconciliation & Leaderboard Publication */}
        <Card
          variant="frosted"
          density={density}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(20, 20, 28, 0.6) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-warning)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 700 }}>
              <IconTrophy size={18} color="var(--color-warning)" />
              <span>Market Reconciliation & Results Publishing</span>
            </h3>
            <Badge variant="warning">
              PHASE 5 RECONCILIATION
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
            At session end (15:30), SEBI triggers atomic market reconciliation. This securely locks all orders, values holdings at final prices, determines official team ranks, computes all 9 special awards, and saves an immutable results ledger.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
            <Button
              variant="primary"
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                backgroundColor: 'var(--color-warning)',
                color: '#000',
                letterSpacing: '0.04em'
              }}
              onClick={handleReconcileMarket}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <IconTrophy size={16} />
                <span>RECONCILE MARKET & PUBLISH FINAL LEADERBOARD</span>
              </span>
            </Button>
            <Button
              variant="secondary"
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconDownload size={14} />
                <span>Save Snapshot</span>
              </span>
            </Button>
          </div>
        </Card>

      </div>

    </div>
    </div>
  );
}
