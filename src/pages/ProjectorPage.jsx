import React, { useState, useEffect, useMemo } from 'react';
import { db, ref, onValue } from '../lib/firebase.js';
import { apiFetch } from '../lib/api.js';
import { Card, Badge, Button } from '../components/ui/index.js';
import {
  IconBuilding,
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyExchange,
  IconBarChart,
  IconZap,
  IconActivity,
  IconAlertTriangle,
  IconShieldAlert,
  IconScale,
  IconRadio,
  IconFileText,
  IconLayers,
  IconMegaphone,
  IconClock,
  IconGlobe,
  IconTrophy,
  IconX
} from '../lib/icons.jsx';

// SVG Sparkline drawing from price history
function Sparkline({ history, isUp, width = 48, height = 18 }) {
  if (!history || history.length < 2) {
    const mockPoints = isUp ? "0,15 16,11 32,13 48,3" : "0,3 16,7 32,5 48,15";
    return (
      <svg width={width} height={height} style={{ stroke: isUp ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', strokeWidth: 1.8, fill: 'none' }}>
        <polyline points={mockPoints} />
      </svg>
    );
  }
  const prices = history.map(h => typeof h === 'number' ? h : h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min === 0 ? 1 : max - min;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ stroke: isUp ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', strokeWidth: 1.8, fill: 'none' }}>
      <polyline points={points} />
    </svg>
  );
}

// Market Pulse Semi-Circle Gauge Dial
function MarketPulseGauge({ score, label, color }) {
  const angle = -135 + (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = 46 + 26 * Math.cos(rad);
  const needleY = 40 + 26 * Math.sin(rad);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <svg width="92" height="48" viewBox="0 0 92 48">
        <path d="M 12 40 A 34 34 0 0 1 80 40" fill="none" stroke="var(--color-border, #E2DBD0)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 58 12 A 34 34 0 0 1 80 40" fill="none" stroke="var(--color-rise, #065F3E)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 12 40 A 34 34 0 0 1 34 12" fill="none" stroke="var(--color-fall, #931913)" strokeWidth="7" strokeLinecap="round" />
        <line x1="46" y1="40" x2={needleX} y2={needleY} stroke="var(--color-ink, #1E232B)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="46" cy="40" r="4.5" fill="var(--color-brass, #845508)" />
      </svg>
      <div>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
          {label}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #4A5568)', fontWeight: 700 }}>
          Breadth Index: <span className="font-mono tabular-nums">{score}</span>/100
        </div>
      </div>
    </div>
  );
}

export default function ProjectorPage({
  state,
  takeoverEvent,
  onOpenProfile,
  connected = true,
  isCoordinatorOffline = false
}) {
  const [timeLeft, setTimeLeft] = useState('60:00');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [activeTakeover, setActiveTakeover] = useState(null);

  const handleDismissTakeover = (e) => {
    if (e) e.stopPropagation();
    const currentId = activeTakeover?.id || activeTakeover?.newsId || takeoverEvent?.id;
    if (currentId) {
      try {
        const dismissed = JSON.parse(localStorage.getItem('saamx_dismissed_takeovers') || '[]');
        if (!dismissed.includes(currentId)) {
          dismissed.push(currentId);
          localStorage.setItem('saamx_dismissed_takeovers', JSON.stringify(dismissed.slice(-100)));
        }
      } catch (err) {}
    }
    setActiveTakeover(null);
    // Notify server to clear visual takeover banner ONLY without canceling market effect
    apiFetch('/api/news/dismiss-takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newsId: currentId, visualOnly: true })
    }).catch(() => {});
  };

  // Auto-dismiss breaking overlays after 8 seconds (in the 5-10s window) while keeping market impact active
  useEffect(() => {
    if (takeoverEvent && (takeoverEvent.headline || takeoverEvent.name || takeoverEvent.type || takeoverEvent.title)) {
      const eventKey = takeoverEvent.id || takeoverEvent.eventId || `${takeoverEvent.headline}_${takeoverEvent.triggeredAt}`;
      try {
        const dismissed = JSON.parse(localStorage.getItem('saamx_dismissed_takeovers') || '[]');
        if (dismissed.includes(eventKey)) {
          setActiveTakeover(null);
          return;
        }
      } catch (err) {}

      const normalized = {
        ...takeoverEvent,
        id: eventKey,
        headline: takeoverEvent.headline || takeoverEvent.title || takeoverEvent.name,
        type: takeoverEvent.type || 'NEWS_FLASH'
      };
      setActiveTakeover(normalized);
      // Auto-dismiss after 8 seconds on projector
      const timer = setTimeout(() => {
        handleDismissTakeover();
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setActiveTakeover(null);
    }
  }, [takeoverEvent]);

  // Keyboard shortcut: ESC to dismiss takeover overlay
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleDismissTakeover();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTakeover]);

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  // Update digital clock time string in Asia/Kolkata timezone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date(Date.now() + serverTimeOffset);
      try {
        setCurrentTimeStr(new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(now));
      } catch (e) {
        setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset]);

  // Session Clock countdown logic (Supports SCHEDULE_SYNC and COUNTDOWN)
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

    // COUNTDOWN MODE
    if (status === 'NotStarted' || !startTime) {
      const minutesStr = String(durationMins).padStart(2, '0');
      setTimeLeft(`${minutesStr}:00`);
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

  // Normalization of securities and state entities
  const securities = useMemo(() => {
    return Object.values(state?.securities || {});
  }, [state?.securities]);

  const transactions = useMemo(() => {
    return Object.values(state?.transactions || []).filter(t => !t.voided);
  }, [state?.transactions]);

  const newsEvents = useMemo(() => {
    return Object.values(state?.newsEvents || [])
      .filter(n => !n.dismissed && !n.corrected && !n.isCorrection)
      .sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0));
  }, [state?.newsEvents]);

  const latestNews = useMemo(() => {
    const triggered = newsEvents.filter(n => n.triggeredAt && !n.dismissed);
    return triggered.length > 0 ? triggered[0] : null;
  }, [newsEvents]);

  const fxRates = useMemo(() => {
    return state?.fxRates || {
      USDINR: { pair: 'USD/INR', midRate: 88.20, spreadPercent: 0.45 },
      GBPINR: { pair: 'GBP/INR', midRate: 119.40, spreadPercent: 0.45 },
      EURINR: { pair: 'EUR/INR', midRate: 103.50, spreadPercent: 0.45 }
    };
  }, [state?.fxRates]);

  const marketIndices = useMemo(() => {
    return state?.marketIndices || {
      GLOBAL100: { currentValue: 1000.0, openingValue: 1000.0, changePercent: 0.0 },
      INDIA50: { currentValue: 5000.0, openingValue: 5000.0, changePercent: 0.0 },
      US100: { currentValue: 8000.0, openingValue: 8000.0, changePercent: 0.0 },
      UK100: { currentValue: 4000.0, openingValue: 4000.0, changePercent: 0.0 }
    };
  }, [state?.marketIndices]);

  // Comprehensive Market Breadth
  const breadth = useMemo(() => {
    const active = securities.filter(s => s.status !== 'UNLISTED');
    let adv = 0;
    let dec = 0;
    let unc = 0;

    active.forEach(s => {
      const cur = s.currentPrice || s.basePrice || 0;
      const open = s.openingPrice || s.basePrice || cur;
      if (cur > open) adv++;
      else if (cur < open) dec++;
      else unc++;
    });

    const ratio = dec > 0 ? (adv / dec).toFixed(2) : adv > 0 ? (adv / 1).toFixed(2) : '1.00';
    const total = active.length || 2000;
    const advPct = total > 0 ? (adv / total) * 100 : 50;
    const decPct = total > 0 ? (dec / total) * 100 : 50;

    return { adv, dec, unc, ratio, total, advPct, decPct };
  }, [securities]);

  // Deterministic Market Pulse / Sentiment Score (0 - 100)
  const marketPulse = useMemo(() => {
    const advRatio = breadth.total > 0 ? breadth.adv / breadth.total : 0.5;
    const globalIdxChg = marketIndices.GLOBAL100?.changePercent || 0;
    const indiaIdxChg = marketIndices.INDIA50?.changePercent || 0;
    const avgIdxChg = (globalIdxChg + indiaIdxChg) / 2;

    let score = Math.round(advRatio * 70 + Math.max(-15, Math.min(15, avgIdxChg * 5)) + 15);
    score = Math.max(5, Math.min(95, score));

    let label = 'NEUTRAL / MIXED';
    let color = 'var(--color-brass, #845508)';

    if (score >= 70) {
      label = 'BULLISH';
      color = 'var(--color-rise, #065F3E)';
    } else if (score >= 56) {
      label = 'MILDLY BULLISH';
      color = '#0A7A50';
    } else if (score <= 30) {
      label = 'STRONGLY BEARISH';
      color = 'var(--color-fall, #931913)';
    } else if (score <= 44) {
      label = 'BEARISH';
      color = '#B91C1C';
    } else {
      label = 'BALANCED';
      color = 'var(--color-brass, #845508)';
    }

    return { score, label, color };
  }, [breadth, marketIndices]);

  // Top Gainers
  const topGainers = useMemo(() => {
    return [...securities]
      .filter(s => s.status !== 'UNLISTED' && s.status !== 'Bankrupt')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const chgVal = cur - open;
        const chgPct = open > 0 ? (chgVal / open) * 100 : 0;
        return { ...s, cur, open, chgVal, chgPct };
      })
      .sort((a, b) => b.chgPct - a.chgPct)
      .slice(0, 6);
  }, [securities]);

  // Top Losers
  const topLosers = useMemo(() => {
    return [...securities]
      .filter(s => s.status !== 'UNLISTED' && s.status !== 'Bankrupt')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const chgVal = cur - open;
        const chgPct = open > 0 ? (chgVal / open) * 100 : 0;
        return { ...s, cur, open, chgVal, chgPct };
      })
      .sort((a, b) => a.chgPct - b.chgPct)
      .slice(0, 6);
  }, [securities]);

  // Top Most Active by Volume
  const mostActive = useMemo(() => {
    const volMap = {};
    transactions.forEach(tx => {
      volMap[tx.ticker] = (volMap[tx.ticker] || 0) + (tx.quantity || 0);
    });

    return [...securities]
      .filter(s => s.status !== 'UNLISTED' && s.status !== 'Bankrupt')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const chgVal = cur - open;
        const chgPct = open > 0 ? (chgVal / open) * 100 : 0;
        const tradedVolume = volMap[s.ticker] || Math.floor((s.currentPrice || 100) * 12);
        return { ...s, cur, open, chgPct, tradedVolume };
      })
      .sort((a, b) => b.tradedVolume - a.tradedVolume)
      .slice(0, 6);
  }, [securities, transactions]);

  // Sector Performance Aggregation
  const sectorPerformance = useMemo(() => {
    const map = {};
    securities.forEach(s => {
      if (!s.sector || s.status === 'UNLISTED') return;
      if (!map[s.sector]) map[s.sector] = { name: s.sector, totalPct: 0, count: 0 };
      const cur = s.currentPrice || s.basePrice || 0;
      const open = s.openingPrice || s.basePrice || cur;
      const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
      map[s.sector].totalPct += pct;
      map[s.sector].count += 1;
    });

    return Object.values(map)
      .map(sec => ({ ...sec, avgPct: sec.count > 0 ? sec.totalPct / sec.count : 0 }))
      .sort((a, b) => b.avgPct - a.avgPct);
  }, [securities]);

  // Dynamic Market Narrative Statements
  const marketNarrative = useMemo(() => {
    const topSec = sectorPerformance[0];
    const lines = [];

    if (topSec && topSec.avgPct > 0) {
      lines.push(`${topSec.name} sector outperforming the floor with +${topSec.avgPct.toFixed(2)}% average gain across ${topSec.count} constituents.`);
    }
    if (breadth.adv > breadth.dec) {
      lines.push(`Market breadth positive with ${breadth.adv} advancing securities against ${breadth.dec} decliners.`);
    } else {
      lines.push(`Defensive posture across floor desks: ${breadth.dec} decliners exerting downward pressure.`);
    }
    if (latestNews) {
      lines.push(`Recent wire: "${latestNews.headline}" actively driving asset valuations.`);
    } else {
      lines.push(`Continuous order book matching active across all 20 institutional team desks.`);
    }

    return lines;
  }, [sectorPerformance, breadth, latestNews]);

  // Timeline of Today's Storyline Events
  const storylineTimeline = useMemo(() => {
    const defaultTimeline = [
      { time: '09:15', title: 'Market Session Opens', status: 'PAST' },
      { time: '09:35', title: 'Central Bank Policy Surprise', status: 'PAST' },
      { time: '10:10', title: 'Technology AI Breakthrough', status: 'ACTIVE' },
      { time: '10:45', title: 'Primary IPO Subscription Opens', status: 'UPCOMING' },
      { time: '11:20', title: 'Global Energy Supply Shock', status: 'UPCOMING' },
      { time: '11:50', title: 'Closing Session & Reconciliation', status: 'UPCOMING' }
    ];

    if (newsEvents.length > 0) {
      return newsEvents.slice(0, 5).map((n, idx) => ({
        time: new Date(n.triggeredAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: n.headline,
        status: idx === 0 ? 'ACTIVE' : 'PAST'
      }));
    }

    return defaultTimeline;
  }, [newsEvents]);

  // Currency helper
  const currencySymbol = (sec) => {
    const curr = sec?.currency || 'INR';
    if (curr === 'USD') return '$';
    if (curr === 'GBP') return '£';
    if (curr === 'EUR') return '€';
    return '₹';
  };

  const marketStatus = state?.marketState?.status || 'Open';
  const sessionState = state?.marketState?.sessionState || (marketStatus === 'Open' ? 'CONTINUOUS_TRADING' : 'PRE_OPEN');
  const leaderboard = useMemo(() => {
    const raw = state?.leaderboard;
    const list = Array.isArray(raw) ? raw : Object.values(raw || {});
    return [...list].sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  }, [state?.leaderboard]);

  // =========================================================================
  // HIGH-SEVERITY NEWS & TAKEOVER OVERLAYS
  // =========================================================================
  const renderTakeoverOverlay = () => {
    if (!activeTakeover) return null;
    const { type, name, ticker, headline, description, category, impactPercent, severity } = activeTakeover;

    switch (type) {
      case 'NEWS_FLASH':
      case 'BREAKING_NEWS':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(10, 13, 20, 0.92)',
              backdropFilter: 'blur(10px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: `4px solid ${severity === 'CRITICAL' || Math.abs(impactPercent || 0) >= 10 ? 'var(--color-fall, #931913)' : 'var(--color-brass, #845508)'}`,
                borderRadius: '16px',
                maxWidth: '880px',
                width: '100%',
                padding: '36px 44px',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7)',
                position: 'relative',
                animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    backgroundColor: severity === 'CRITICAL' || Math.abs(impactPercent || 0) >= 10 ? 'var(--color-fall, #931913)' : 'var(--color-brass, #845508)',
                    color: '#FFFFFF',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    letterSpacing: '1px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <IconZap size={16} color="#FFFFFF" /> 🚨 BREAKING NEWS
                  </span>
                  {(activeTakeover.presetId || activeTakeover.sequence) && (
                    <span style={{
                      backgroundColor: 'var(--color-surface-sunken, #F1F5F9)',
                      color: 'var(--color-brass, #845508)',
                      border: '1.5px solid var(--color-border, #CBD5E1)',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontWeight: 900,
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.88rem'
                    }}>
                      {activeTakeover.presetId || `NEWS-${String(activeTakeover.sequence).padStart(3, '0')}`}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--color-brass, #845508)', fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  CATEGORY: {category || 'GLOBAL MACRO'}
                </span>
              </div>

              <h1 style={{
                fontSize: '2.4rem',
                fontFamily: "var(--font-display, 'Cinzel', serif)",
                fontWeight: 900,
                color: 'var(--color-ink, #1E232B)',
                lineHeight: 1.25,
                margin: '0 0 16px 0'
              }}>
                {headline || name}
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: 'var(--color-ink-muted, #4A5568)',
                lineHeight: 1.5,
                margin: '0 0 24px 0'
              }}>
                {description || activeTakeover.summary || ticker}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1.5px solid var(--color-border, #E2DBD0)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-brass, #845508)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  ⚡ SAAMX GLOBAL WIRE DISPATCH
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted, #94A3B8)', fontWeight: 600 }}>
                  ⏱️ Projector display (~8s) &bull; Press [ESC] to dismiss
                </div>
              </div>
            </div>
          </div>
        );

      case 'MARKET_HALT':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(8, 10, 14, 0.90)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '3px solid var(--color-warning, #D97706)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                maxWidth: '700px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <IconAlertTriangle size={56} color="var(--color-warning, #D97706)" />
              </div>
              <h1 style={{ color: 'var(--color-warning, #D97706)', fontSize: '2.3rem', fontFamily: "var(--font-display, 'Cinzel', serif)", margin: '0 0 10px 0' }}>
                TRADING HALTED &bull; REGULATORY BREAKER
              </h1>
              <p style={{ color: 'var(--color-ink, #1E232B)', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 14px 0' }}>
                Asset / Listing: {ticker} {name ? `(${name})` : ''}
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1rem', lineHeight: 1.5, margin: 0 }}>
                Order execution temporarily suspended by SEBI Exchange Regulators. Floor desks are locked.
              </p>
            </div>
          </div>
        );

      case 'IPO_PENDING':
      case 'IPO_STAGED':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(10, 15, 26, 0.90)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '4px solid var(--color-brass, #845508)',
                borderRadius: '16px',
                maxWidth: '780px',
                width: '90%',
                padding: '36px 44px',
                textAlign: 'center',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <IconActivity size={56} color="var(--color-brass, #845508)" />
              </div>
              <div>
                <span style={{ backgroundColor: 'var(--color-brass, #845508)', color: '#FFF', padding: '6px 16px', borderRadius: '6px', fontWeight: 900, fontSize: '0.88rem', letterSpacing: '1px' }}>
                  PRIMARY IPO SUBSCRIPTION OPEN
                </span>
              </div>
              <h1 style={{ fontSize: '2.4rem', fontFamily: "var(--font-display, 'Cinzel', serif)", color: 'var(--color-ink, #1E232B)', margin: '16px 0 8px 0' }}>
                {name || headline || ticker}
              </h1>
              <p className="font-mono tabular-nums" style={{ color: 'var(--color-brass, #845508)', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 16px 0' }}>
                Ticker: {ticker} &bull; Issue Price: ₹{activeTakeover.ipoPrice || activeTakeover.offerPrice || 100}
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1.05rem', lineHeight: 1.5, margin: 0 }}>
                Primary bidding window is now active across institutional terminals. Order matching opens shortly.
              </p>
            </div>
          </div>
        );

      case 'IPO_LAUNCH':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(6, 40, 26, 0.90)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '4px solid var(--color-rise, #065F3E)',
                borderRadius: '16px',
                maxWidth: '780px',
                width: '90%',
                padding: '36px 44px',
                textAlign: 'center',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <IconTrendingUp size={56} color="var(--color-rise, #065F3E)" />
              </div>
              <div>
                <span style={{ backgroundColor: 'var(--color-rise, #065F3E)', color: '#FFF', padding: '6px 16px', borderRadius: '6px', fontWeight: 900, fontSize: '0.88rem', letterSpacing: '1px' }}>
                  IPO LISTED & ACTIVE TRADING LIVE
                </span>
              </div>
              <h1 style={{ fontSize: '2.4rem', fontFamily: "var(--font-display, 'Cinzel', serif)", color: 'var(--color-ink, #1E232B)', margin: '16px 0 8px 0' }}>
                {name || ticker} ({ticker})
              </h1>
              <p style={{ color: 'var(--color-rise, #065F3E)', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px 0' }}>
                Listing Allotments Finalized &bull; Continuous Secondary Market Trading Live
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1.05rem', lineHeight: 1.5, margin: 0 }}>
                Allotments credited to institutional participant portfolios. Secondary market orders active.
              </p>
            </div>
          </div>
        );

      case 'BANKRUPTCY':
      case 'INSOLVENCY':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(30, 8, 8, 0.92)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '4px solid var(--color-fall, #931913)',
                borderRadius: '16px',
                maxWidth: '780px',
                width: '90%',
                padding: '36px 44px',
                textAlign: 'center',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <IconScale size={56} color="var(--color-fall, #931913)" />
              </div>
              <div>
                <span style={{ backgroundColor: 'var(--color-fall, #931913)', color: '#FFF', padding: '6px 16px', borderRadius: '6px', fontWeight: 900, fontSize: '0.88rem', letterSpacing: '1px' }}>
                  NCLT INSOLVENCY DECREE &bull; LIQUIDATION
                </span>
              </div>
              <h1 style={{ fontSize: '2.4rem', fontFamily: "var(--font-display, 'Cinzel', serif)", color: 'var(--color-fall, #931913)', margin: '16px 0 8px 0' }}>
                {ticker} &mdash; {name || 'Asset Insolvent'}
              </h1>
              <p className="font-mono tabular-nums" style={{ color: 'var(--color-ink, #1E232B)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0' }}>
                Share Value Declared Worthless (₹0.00) &bull; Floating Units Revoked
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1.05rem', lineHeight: 1.5, margin: 0 }}>
                Regulatory tribunal has mandated winding up. Trading is permanently suspended and positions liquidated.
              </p>
            </div>
          </div>
        );

      case 'OPENING_BELL':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(6, 40, 26, 0.92)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '4px solid var(--color-rise, #065F3E)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                maxWidth: '700px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <IconActivity size={56} color="var(--color-rise, #065F3E)" />
              </div>
              <h1 style={{ color: 'var(--color-rise, #065F3E)', fontSize: '2.6rem', fontFamily: "var(--font-display, 'Cinzel', serif)", margin: '0 0 10px 0' }}>
                SAAMX FLOOR OPEN
              </h1>
              <p style={{ color: 'var(--color-ink, #1E232B)', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 14px 0' }}>
                Continuous Institutional Trading Session is Active
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1rem', margin: 0 }}>
                Order matching engines, currency exchange desks, and primary IPO portals are open.
              </p>
            </div>
          </div>
        );

      case 'CLOSING_BELL':
        return (
          <div
            className="takeover-overlay"
            onClick={handleDismissTakeover}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(30, 8, 8, 0.92)',
              backdropFilter: 'blur(8px)',
              zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '4px solid var(--color-fall, #931913)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                maxWidth: '700px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                position: 'relative',
                cursor: 'default'
              }}
            >
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <IconClock size={56} color="var(--color-fall, #931913)" />
              </div>
              <h1 style={{ color: 'var(--color-fall, #931913)', fontSize: '2.6rem', fontFamily: "var(--font-display, 'Cinzel', serif)", margin: '0 0 10px 0' }}>
                TRADING CONCLUDED
              </h1>
              <p style={{ color: 'var(--color-ink, #1E232B)', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 14px 0' }}>
                Session Closed &bull; Portfolios Locked for Reconciliation
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1rem', margin: 0 }}>
                Order execution is frozen. SEBI Reconciliation Desk is computing authoritative leaderboard standings.
              </p>
            </div>
          </div>
        );

      case 'STOCK_SPLIT':
        return (
          <div className="takeover-overlay" onClick={handleDismissTakeover} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10, 15, 26, 0.90)',
            zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '4px solid #0A7A50',
              borderRadius: '16px',
              padding: '36px 44px',
              textAlign: 'center',
              maxWidth: '700px',
              width: '90%',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <IconLayers size={56} color="#0A7A50" />
              </div>
              <h1 style={{ color: '#0A7A50', fontSize: '2.2rem', fontFamily: "var(--font-display, 'Cinzel', serif)", margin: '0 0 8px 0' }}>
                2-FOR-1 STOCK SPLIT EXECUTED
              </h1>
              <p style={{ color: 'var(--color-ink, #1E232B)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 12px 0' }}>
                Asset: {ticker} {name ? `(${name})` : ''}
              </p>
              <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1rem', margin: 0 }}>
                Share price has halved and all participant holdings have doubled.
              </p>
            </div>
          </div>
        );

      default:
        if (!headline && !name) return null;
        return (
          <div className="takeover-overlay" onClick={handleDismissTakeover} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10, 13, 20, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: `4px solid ${severity === 'CRITICAL' || category === 'CRISIS' ? 'var(--color-fall, #DC2626)' : 'var(--color-brass, #845508)'}`,
              borderRadius: '16px',
              maxWidth: '840px',
              width: '100%',
              padding: '36px 44px',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              textAlign: 'center',
              animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <button
                type="button"
                onClick={handleDismissTakeover}
                style={{
                  position: 'absolute', top: '16px', right: '20px',
                  background: 'var(--color-surface-sunken, #F1F5F9)', border: '1px solid var(--color-border, #CBD5E1)',
                  borderRadius: '6px', padding: '6px 12px',
                  fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #475569)',
                  cursor: 'pointer'
                }}
              >
                ✕ CLOSE [ESC]
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                {type === 'DEBATE_SHOWDOWN' ? (
                  <IconActivity size={56} color="var(--color-brass, #845508)" />
                ) : category === 'CRISIS' ? (
                  <IconShieldAlert size={56} color="var(--color-fall, #DC2626)" />
                ) : category === 'IPO' ? (
                  <IconTrendingUp size={56} color="var(--color-rise, #065F3E)" />
                ) : (
                  <IconMegaphone size={56} color="var(--color-brass, #845508)" />
                )}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  backgroundColor: severity === 'CRITICAL' || category === 'CRISIS' ? 'var(--color-fall, #DC2626)' : 'var(--color-brass, #845508)',
                  color: '#FFFFFF',
                  padding: '4px 14px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  letterSpacing: '1px'
                }}>
                  {type === 'DEBATE_SHOWDOWN' ? 'LIVE BULL VS BEAR SHOWDOWN' : `${category || 'MARKET'} BULLETIN`}
                </span>
              </div>
              <h1 style={{
                fontSize: '2.2rem',
                fontFamily: "var(--font-display, 'Cinzel', serif)",
                fontWeight: 900,
                color: 'var(--color-ink, #1E232B)',
                lineHeight: 1.25,
                margin: '0 0 14px 0'
              }}>
                {headline || name}
              </h1>
              <p style={{
                fontSize: '1.15rem',
                color: 'var(--color-ink-muted, #4A5568)',
                lineHeight: 1.5,
                margin: '0 0 20px 0'
              }}>
                {description || ticker}
              </p>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--color-brass, #845508)',
                letterSpacing: '0.5px'
              }}>
                SAAMX GLOBAL MARKET WIRE &bull; DISPATCHED TO ALL TRADING DESKS
              </div>
            </div>
          </div>
        );
    }
  };

  // =========================================================================
  // RESULTS CEREMONY VIEW
  // =========================================================================
  if (sessionState === 'RESULTS' || state?.marketState?.sessionState === 'RESULTS') {
    const isOfficial = state?.resultsLifecycle === 'PUBLISHED';
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface-sunken, #FAF8F3)',
        color: 'var(--color-ink, #1E232B)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        boxSizing: 'border-box',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif)"
      }}>
        {/* Offline / Stale telemetry indicator banner */}
        {!connected && (
          <div style={{
            backgroundColor: 'var(--color-fall, #931913)',
            color: '#FFFFFF',
            textAlign: 'center',
            padding: '8px 16px',
            fontWeight: 800,
            fontSize: '0.85rem',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <IconAlertTriangle size={16} /> CONNECTION INTERRUPTED — DISPLAYING LAST KNOWN STANDINGS
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-brass, #845508)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            SAAMX OFFICIAL CEREMONY &bull; "Experience the Market. Don’t Just Learn It."
          </div>
          <h1 style={{ fontSize: '2.8rem', fontFamily: "var(--font-display, 'Cinzel', serif)", color: 'var(--color-ink, #1E232B)', margin: '4px 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isOfficial ? 'var(--color-rise, #065F3E)' : 'var(--color-warning, #D97706)' }} />
            {isOfficial ? 'OFFICIAL FINAL COMPETITION RESULTS' : 'PROVISIONAL LEADERBOARD (PENDING FINAL AUDIT & APPROVAL)'}
          </h1>
          <p style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '1rem', margin: 0 }}>
            Comprehensive 1,000-Point Rubric &bull; Risk &bull; Returns &bull; Diversification &bull; Decision-Making &bull; Future Potential
          </p>
        </div>

        {/* Top 3 Podium Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
          {leaderboard.slice(0, 3).map((team, idx) => (
            <Card key={team.teamCode || idx} variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: `2px solid ${idx === 0 ? 'var(--color-brass, #845508)' : idx === 1 ? '#94a3b8' : '#cd7f32'}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: idx === 0 ? '0 8px 30px rgba(132, 85, 8, 0.2)' : '0 4px 16px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '2.8rem' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-brass, #845508)', marginTop: '6px', textTransform: 'uppercase' }}>
                RANK {idx + 1}
              </div>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--color-ink, #1E232B)', margin: '6px 0' }}>
                {team.teamCode} &bull; {team.teamName}
              </h2>
              <div className="font-mono tabular-nums" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>
                ₹{Number(team.portfolioValue || 10000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="font-mono tabular-nums" style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: (team.roi || 0) >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)',
                marginTop: '4px'
              }}>
                {(team.roi || 0) >= 0 ? '+' : ''}{(team.roi || 0).toFixed(2)}% ROI
              </div>
            </Card>
          ))}
        </div>

        {/* Full Team Standings Table */}
        {leaderboard.length > 3 && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            borderRadius: '10px',
            border: '1px solid var(--color-border, #E2DBD0)',
            padding: '16px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--color-ink, #1E232B)' }}>
              Complete Institutional Directory Standings
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border, #E2DBD0)', textAlign: 'left', color: 'var(--color-ink-muted, #6B6863)' }}>
                  <th style={{ padding: '8px 12px' }}>RANK</th>
                  <th style={{ padding: '8px 12px' }}>TEAM CODE</th>
                  <th style={{ padding: '8px 12px' }}>INSTITUTIONAL HOUSE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>VALUATION</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>NET ROI</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((team, idx) => (
                  <tr key={team.teamCode || idx} style={{ borderBottom: '1px solid var(--color-border, #FAF8F3)' }}>
                    <td className="font-mono tabular-nums" style={{ padding: '8px 12px', fontWeight: 800 }}>#{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-brass, #845508)' }}>{team.teamCode}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{team.teamName}</td>
                    <td className="font-mono tabular-nums" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800 }}>
                      ₹{Number(team.portfolioValue || 10000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="font-mono tabular-nums" style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: (team.roi || 0) >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)'
                    }}>
                      {(team.roi || 0) >= 0 ? '+' : ''}{(team.roi || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STANDARD MARKET INTELLIGENCE COMMAND VIEW
  // =========================================================================
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--color-surface-sunken, #FAF8F3)',
      color: 'var(--color-ink, #1E232B)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif)",
      boxSizing: 'border-box'
    }}>

      {/* Disconnected / Stale Telemetry Notification Bar */}
      {!connected && (
        <div style={{
          backgroundColor: 'var(--color-fall, #931913)',
          color: '#FFFFFF',
          textAlign: 'center',
          padding: '6px 16px',
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '0.5px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <IconAlertTriangle size={16} /> TELEMETRY DISCONNECTED — RECONNECTING TO EXCHANGE (DISPLAYING LAST KNOWN STATE)
        </div>
      )}

      {isCoordinatorOffline && connected && (
        <div style={{
          backgroundColor: 'var(--color-warning, #D97706)',
          color: '#FFFFFF',
          textAlign: 'center',
          padding: '6px 16px',
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '0.5px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <IconAlertTriangle size={16} /> COORDINATOR OFFLINE — SCHEDULED NEWS & AUTOMATION SUSPENDED
        </div>
      )}

      {/* 1. TOP INSTITUTIONAL COMMAND HEADER */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        padding: '8px 24px',
        borderBottom: '2px solid var(--color-brass, #845508)',
        boxSizing: 'border-box',
        height: '56px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/gatik-logo.png"
            alt="Gatik Junior College"
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/saamx-logo.png"
            alt="SAAMX '26"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/cadfem-partner-logo.png"
            alt="Industry Partner CADFEM"
            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ borderLeft: '1px solid var(--color-border, #E2DBD0)', paddingLeft: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                fontFamily: "var(--font-display, 'Cinzel', serif)",
                color: 'var(--color-ink, #1E232B)',
                margin: 0,
                letterSpacing: '0.04em'
              }}>
                SAAMX LIVE MARKET
              </h1>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-brass, #845508)', fontWeight: 800, letterSpacing: '0.04em' }}>
                &bull; "Experience the Market. Don’t Just Learn It."
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #6B6863)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              OFFICIAL EXCHANGE DISPLAY &bull; 2,800+ CONSTITUENTS &bull; GLOBAL MULTI-CURRENCY
            </span>
          </div>
        </div>

        {/* Center Live Session & Telemetry Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Market Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: marketStatus === 'Open' ? 'rgba(6, 95, 62, 0.08)' : 'rgba(147, 25, 19, 0.08)',
            border: `1px solid ${marketStatus === 'Open' ? 'rgba(6, 95, 62, 0.3)' : 'rgba(147, 25, 19, 0.3)'}`,
            padding: '3px 10px',
            borderRadius: '20px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: marketStatus === 'Open' ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)',
              animation: 'pulseBlink 1.5s infinite'
            }} />
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              color: marketStatus === 'Open' ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)',
              letterSpacing: '0.5px'
            }}>
              MARKET {marketStatus?.toUpperCase() || 'OPEN'}
            </span>
          </div>

          {/* Current Session */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--color-surface-sunken, #FAF8F3)',
            border: '1px solid var(--color-border, #E2DBD0)',
            padding: '3px 10px',
            borderRadius: '20px'
          }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: 'var(--color-ink, #1E232B)',
              letterSpacing: '0.5px'
            }}>
              SESSION: {sessionState.replace(/_/g, ' ')}
            </span>
          </div>

          {/* News Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: state?.newsEngineState?.status === 'PAUSED' ? 'rgba(147, 25, 19, 0.08)' : 'rgba(132, 85, 8, 0.08)',
            border: `1px solid ${state?.newsEngineState?.status === 'PAUSED' ? 'rgba(147, 25, 19, 0.3)' : 'rgba(132, 85, 8, 0.3)'}`,
            padding: '3px 10px',
            borderRadius: '20px'
          }}>
            <IconZap size={13} color="var(--color-brass, #845508)" />
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: state?.newsEngineState?.status === 'PAUSED' ? 'var(--color-fall, #931913)' : 'var(--color-brass, #845508)',
              letterSpacing: '0.5px'
            }}>
              NEWS: {state?.newsEngineState?.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Right Synchronized Digital Clocks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-muted, #6B6863)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>MARKET CLOCK (IST)</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
              {currentTimeStr || '11:42:18 AM'}
            </span>
          </div>
          <div style={{ borderLeft: '1.5px solid var(--color-border, #E2DBD0)', paddingLeft: '16px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-muted, #6B6863)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>TIME REMAINING</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>
              {timeLeft}
            </span>
          </div>
        </div>
      </header>

      {/* 2. GLOBAL INDICES TELEMETRY BAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        padding: '8px 24px',
        backgroundColor: 'var(--color-surface-sunken, #FAF8F3)',
        borderBottom: '1px solid var(--color-border, #E2DBD0)',
        boxSizing: 'border-box'
      }}>
        {[
          { key: 'GLOBAL100', label: 'SAAMX GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, open: marketIndices.GLOBAL100?.openingValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
          { key: 'INDIA50', label: 'SAAMX INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, open: marketIndices.INDIA50?.openingValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
          { key: 'US100', label: 'SAAMX US 100', val: marketIndices.US100?.currentValue || 8000, open: marketIndices.US100?.openingValue || 8000, chg: marketIndices.US100?.changePercent || 0 },
          { key: 'UK100', label: 'SAAMX UK 100', val: marketIndices.UK100?.currentValue || 4000, open: marketIndices.UK100?.openingValue || 4000, chg: marketIndices.UK100?.changePercent || 0 }
        ].map(idx => {
          const isUp = idx.chg > 0;
          const isDown = idx.chg < 0;
          const absDiff = (idx.val - idx.open).toFixed(2);
          const color = isUp ? 'var(--color-rise, #065F3E)' : isDown ? 'var(--color-fall, #931913)' : 'var(--color-ink-muted, #6B6863)';

          return (
            <div key={idx.key} style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '8px',
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-ink-muted, #6B6863)', letterSpacing: '0.5px', display: 'block' }}>
                  {idx.label}
                </span>
                <div className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-ink, #1E232B)', lineHeight: 1.1 }}>
                  {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="font-mono tabular-nums" style={{ fontSize: '0.74rem', fontWeight: 800, color, marginTop: '2px' }}>
                  {isUp ? '▲ +' : isDown ? '▼ ' : '— '}{Math.abs(idx.chg).toFixed(2)}% ({isUp ? '+' : ''}{absDiff})
                </div>
              </div>
              <Sparkline isUp={isUp} width={44} height={18} />
            </div>
          );
        })}
      </div>

      {/* 3. SPOT FX TELEMETRY STRIP */}
      <div style={{
        backgroundColor: 'rgba(132, 85, 8, 0.05)',
        borderBottom: '1px solid var(--color-border, #E2DBD0)',
        padding: '5px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: 'var(--color-brass, #845508)', fontWeight: 900, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconCurrencyExchange size={15} color="var(--color-brass, #845508)" style={{ verticalAlign: '-2px' }} /> SPOT FX DESK:
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink, #1E232B)' }}>
            USD / INR: <strong style={{ color: 'var(--color-rise, #065F3E)' }}>₹{(fxRates.USDINR?.midRate || 88.20).toFixed(2)}</strong> (Spread: {fxRates.USDINR?.spreadPercent || 0.45}%)
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink, #1E232B)' }}>
            GBP / INR: <strong style={{ color: 'var(--color-rise, #065F3E)' }}>₹{(fxRates.GBPINR?.midRate || 119.40).toFixed(2)}</strong> (Spread: {fxRates.GBPINR?.spreadPercent || 0.45}%)
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink, #1E232B)' }}>
            EUR / INR: <strong style={{ color: 'var(--color-rise, #065F3E)' }}>₹{(fxRates.EURINR?.midRate || 103.50).toFixed(2)}</strong> (Spread: {fxRates.EURINR?.spreadPercent || 0.45}%)
          </span>
        </div>
        <div style={{ color: 'var(--color-brass, #845508)', fontSize: '0.7rem', fontWeight: 700 }}>
          ● MULTI-CURRENCY CONVERSIONS LIVE &bull; 0.45% SPREAD
        </div>
      </div>

      {/* 4. MAIN COMMAND GRID (3-Column Layout) */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1.35fr 1.05fr',
        gap: '12px',
        padding: '10px 24px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>

        {/* COLUMN 1: MARKET BREADTH, SENTIMENT PULSE & SECTORS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>

          {/* Market Breadth Card */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconBarChart size={15} color="var(--color-brass, #845508)" style={{ verticalAlign: '-2px' }} /> MARKET BREADTH & SENTIMENT
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #6B6863)', fontWeight: 700 }}>
                {breadth.total} TOTAL SECURITIES
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border, #E2DBD0)' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>ADVANCES</span>
                <strong className="font-mono tabular-nums" style={{ fontSize: '1.1rem', color: 'var(--color-rise, #065F3E)' }}>{breadth.adv}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border, #E2DBD0)' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>DECLINES</span>
                <strong className="font-mono tabular-nums" style={{ fontSize: '1.1rem', color: 'var(--color-fall, #931913)' }}>{breadth.dec}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border, #E2DBD0)' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>UNCHANGED</span>
                <strong className="font-mono tabular-nums" style={{ fontSize: '1.1rem', color: 'var(--color-ink-muted, #4A5568)' }}>{breadth.unc}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border, #E2DBD0)' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>A / D RATIO</span>
                <strong className="font-mono tabular-nums" style={{ fontSize: '1.1rem', color: 'var(--color-brass, #845508)' }}>{breadth.ratio}</strong>
              </div>
            </div>

            <div style={{ height: '7px', borderRadius: '4px', overflow: 'hidden', display: 'flex', backgroundColor: 'var(--color-border, #E2DBD0)', marginBottom: '12px' }}>
              <div style={{ width: `${breadth.advPct}%`, backgroundColor: 'var(--color-rise, #065F3E)' }} />
              <div style={{ width: `${breadth.decPct}%`, backgroundColor: 'var(--color-fall, #931913)' }} />
            </div>

            <div style={{ borderTop: '1px solid var(--color-border, #E2DBD0)', paddingTop: '10px' }}>
              <MarketPulseGauge score={marketPulse.score} label={marketPulse.label} color={marketPulse.color} />
            </div>
          </Card>

          {/* Sector Performance Heatmap */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '12px 16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconLayers size={15} color="var(--color-brass, #845508)" style={{ verticalAlign: '-2px' }} /> SECTOR PERFORMANCE HEATMAP
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-muted, #6B6863)', fontWeight: 600 }}>AVERAGE MOVEMENT</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sectorPerformance.slice(0, 7).map(s => {
                const isUp = s.avgPct > 0;
                const isDown = s.avgPct < 0;
                const color = isUp ? 'var(--color-rise, #065F3E)' : isDown ? 'var(--color-fall, #931913)' : 'var(--color-ink-muted, #4A5568)';
                return (
                  <div key={s.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    background: 'var(--color-surface-sunken, #FAF8F3)',
                    border: '1px solid var(--color-border, #E2DBD0)',
                    borderRadius: '5px',
                    fontSize: '0.74rem'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-ink, #1E232B)' }}>{s.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink-muted, #6B6863)', fontSize: '0.65rem' }}>{s.count} Assets</span>
                      <strong className="font-mono tabular-nums" style={{ color, minWidth: '54px', textAlign: 'right' }}>
                        {isUp ? '+' : ''}{s.avgPct.toFixed(2)}%
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>

        {/* COLUMN 2: CENTERPIECE — "WHAT'S MOVING THE MARKET?" & TOP LEADERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>

          {/* CENTERPIECE: WHAT'S MOVING THE MARKET? */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-surface, #FFFFFF) 0%, var(--color-surface-sunken, #FFFDF9) 100%)',
            border: '2px solid var(--color-brass, #845508)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 4px 14px rgba(132, 85, 8, 0.08)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconZap size={16} /> WHAT'S MOVING THE MARKET?
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-rise, #065F3E)', fontWeight: 800, background: 'rgba(6, 95, 62, 0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                ● LIVE FORCES
              </span>
            </div>

            {latestNews ? (
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', borderLeft: '4px solid var(--color-brass, #845508)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--color-ink, #1E232B)' }}>{latestNews.headline}</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-brass, #845508)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {latestNews.category || 'MACRO'}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: 'var(--color-ink-muted, #4A5568)', lineHeight: 1.35 }}>
                  {latestNews.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--color-ink-muted, #6B6863)' }}>
                  <span style={{ color: 'var(--color-brass, #845508)', fontWeight: 700 }}>SAAMX Wire</span>
                  <span>Time: <strong className="font-mono tabular-nums" style={{ color: 'var(--color-ink, #1E232B)' }}>{new Date(latestNews.triggeredAt).toLocaleTimeString()}</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', borderLeft: '4px solid var(--color-rise, #065F3E)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                <strong style={{ color: 'var(--color-ink, #1E232B)' }}>Continuous Global Order Book Matching</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-ink-muted, #4A5568)' }}>
                  Cross-asset trading flows across 2,000+ constituents driving intraday valuation discovery.
                </p>
              </div>
            )}
          </div>

          {/* Top Gainers & Losers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1, minHeight: 0 }}>

            {/* Top Gainers */}
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IconTrendingUp size={15} /> TOP GAINERS
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)' }}>UNIVERSE</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <tbody>
                  {topGainers.map(s => (
                    <tr
                      key={s.ticker}
                      onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                      style={{ borderBottom: '1px solid var(--color-surface-sunken, #FAF8F3)', height: '24px', cursor: onOpenProfile ? 'pointer' : 'default' }}
                    >
                      <td style={{ fontWeight: 900, color: 'var(--color-brass, #845508)', width: '50px' }}>{s.ticker}</td>
                      <td style={{ color: 'var(--color-ink, #1E232B)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.name}</td>
                      <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
                        {currencySymbol(s)}{s.cur.toFixed(1)}
                      </td>
                      <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 900, color: 'var(--color-rise, #065F3E)', width: '52px' }}>
                        +{s.chgPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Top Losers */}
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IconTrendingDown size={15} /> TOP LOSERS
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)' }}>UNIVERSE</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <tbody>
                  {topLosers.map(s => (
                    <tr
                      key={s.ticker}
                      onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                      style={{ borderBottom: '1px solid var(--color-surface-sunken, #FAF8F3)', height: '24px', cursor: onOpenProfile ? 'pointer' : 'default' }}
                    >
                      <td style={{ fontWeight: 900, color: 'var(--color-brass, #845508)', width: '50px' }}>{s.ticker}</td>
                      <td style={{ color: 'var(--color-ink, #1E232B)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.name}</td>
                      <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
                        {currencySymbol(s)}{s.cur.toFixed(1)}
                      </td>
                      <td className="font-mono tabular-nums" style={{ textAlign: 'right', fontWeight: 900, color: 'var(--color-fall, #931913)', width: '52px' }}>
                        {s.chgPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>

          {/* Most Active Leaders */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0284C7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconActivity size={15} /> MOST ACTIVE VOLUME LEADERS
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)' }}>REAL-TIME TURNOVER</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {mostActive.slice(0, 3).map(s => (
                <div
                  key={s.ticker}
                  onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                  style={{
                    background: 'var(--color-surface-sunken, #FAF8F3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border, #E2DBD0)',
                    fontSize: '0.7rem',
                    cursor: onOpenProfile ? 'pointer' : 'default'
                  }}
                >
                  <strong style={{ color: 'var(--color-brass, #845508)' }}>{s.ticker}</strong>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink-muted, #6B6863)', display: 'block', fontSize: '0.62rem' }}>{s.tradedVolume.toLocaleString()} Vol</span>
                  <span className="font-mono tabular-nums" style={{ color: s.chgPct >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', fontWeight: 800 }}>
                    {s.chgPct >= 0 ? '+' : ''}{s.chgPct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* COLUMN 3: LIVE MARKET NARRATIVE & STORYLINE TIMELINE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>

          {/* Live Market Narrative (Market Pulse) */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconRadio size={15} /> MARKET PULSE & NARRATIVE
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-rise, #065F3E)', fontWeight: 800 }}>LIVE SYNTHESIS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {marketNarrative.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.74rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.35 }}>
                  <span style={{ color: 'var(--color-brass, #845508)', fontWeight: 900 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's Market Story (Timeline) */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '12px 14px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconFileText size={15} /> TODAY'S MARKET STORY
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #6B6863)' }}>SEQUENCE</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {storylineTimeline.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: item.status === 'ACTIVE' ? 'rgba(132, 85, 8, 0.08)' : 'var(--color-surface-sunken, #FAF8F3)',
                  border: item.status === 'ACTIVE' ? '1px solid var(--color-brass, #845508)' : '1px solid var(--color-border, #E2DBD0)',
                  opacity: item.status === 'UPCOMING' ? 0.6 : 1
                }}>
                  <div className="font-mono tabular-nums" style={{ fontWeight: 800, fontSize: '0.72rem', color: item.status === 'ACTIVE' ? 'var(--color-brass, #845508)' : 'var(--color-ink-muted, #6B6863)' }}>
                    {item.time}
                  </div>
                  <div style={{ flex: 1, fontSize: '0.73rem', fontWeight: item.status === 'ACTIVE' ? 800 : 600, color: 'var(--color-ink, #1E232B)' }}>
                    {item.title}
                  </div>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: item.status === 'ACTIVE' ? 'var(--color-brass, #845508)' : item.status === 'PAST' ? 'var(--color-border, #E2DBD0)' : 'transparent',
                    color: item.status === 'ACTIVE' ? '#FFF' : 'var(--color-ink-muted, #6B6863)'
                  }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>

      {/* Render Universal Takeover Overlays */}
      {renderTakeoverOverlay()}

      {/* Global CSS animation */}
      <style>{`
        @keyframes pulseBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes slideUpModal {
          from { transform: translateY(30px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
