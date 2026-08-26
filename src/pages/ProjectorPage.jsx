import React, { useState, useEffect } from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';
import { db, ref, onValue } from '../lib/firebase.js';

// SVG Sparkline drawing from price history
function Sparkline({ history, isUp, width = 45, height = 16 }) {
  if (!history || history.length < 2) {
    const mockPoints = isUp ? "0,14 15,10 30,12 45,3" : "0,3 15,6 30,4 45,14";
    return (
      <svg width={width} height={height} style={{ stroke: isUp ? '#15694f' : '#9b2b25', strokeWidth: 1.5, fill: 'none' }}>
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
    <svg width={width} height={height} style={{ stroke: isUp ? '#15694f' : '#9b2b25', strokeWidth: 1.5, fill: 'none' }}>
      <polyline points={points} />
    </svg>
  );
}

// Sentiment Meter Semi-Circle SVG Gauge
function SentimentGaugeDial({ advances, declines }) {
  const total = advances + declines;
  const pct = total > 0 ? (advances / total) * 100 : 68;
  let label = 'GREED';
  let color = '#15694f';
  if (pct < 40) {
    label = 'FEAR';
    color = '#9b2b25';
  } else if (pct >= 40 && pct < 60) {
    label = 'NEUTRAL';
    color = '#9b6f1e';
  }

  const angle = -135 + (pct / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = 42 + 22 * Math.cos(rad);
  const needleY = 36 + 22 * Math.sin(rad);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width="84" height="42" viewBox="0 0 84 42">
        <path d="M 12 36 A 30 30 0 0 1 72 36" fill="none" stroke="#e2ddd4" strokeWidth="6" strokeLinecap="round" />
        <path d="M 52 11 A 30 30 0 0 1 72 36" fill="none" stroke="#15694f" strokeWidth="6" strokeLinecap="round" />
        <path d="M 12 36 A 30 30 0 0 1 32 11" fill="none" stroke="#9b2b25" strokeWidth="6" strokeLinecap="round" />
        <line x1="42" y1="36" x2={needleX} y2={needleY} stroke="#17191c" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="42" cy="36" r="3.5" fill="#17191c" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '900', color, fontFamily: 'var(--font-mono)' }}>{label}</span>
        <span style={{ fontSize: '0.65rem', color: '#6b6863', fontWeight: 'bold' }}>{Math.round(pct)}/100</span>
      </div>
    </div>
  );
}

// Security Card Cell matching reference image design
function ProjectorCell({ security, totalTransactions }) {
  const [prevPrice, setPrevPrice] = useState(security ? security.currentPrice : 0);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (security && security.currentPrice !== prevPrice) {
      if (security.currentPrice > prevPrice) {
        setFlashClass('cell-flash-up');
      } else {
        setFlashClass('cell-flash-down');
      }
      setPrevPrice(security.currentPrice);
      const timer = setTimeout(() => setFlashClass(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [security, prevPrice]);

  if (!security) return null;

  const priceChange = security.currentPrice - security.basePrice;
  const priceChangePct = security.basePrice > 0 ? (priceChange / security.basePrice) * 100 : 0;
  const isUp = priceChangePct >= 0;

  const volume = (totalTransactions || [])
    .filter(tx => tx.ticker === security.ticker && !tx.voided)
    .reduce((sum, tx) => sum + tx.quantity, 0);

  const volStr = volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : `${volume}`;

  const isHalted = security.status === 'Halted';
  const isPending = security.status === 'IPO_PENDING';

  return (
    <div
      className={`projector-cell ${flashClass}`}
      style={{
        padding: '5px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: isHalted ? '#FAE0DE' : isPending ? '#F5E6C8' : '#faf8f5',
        border: isHalted ? '1.5px solid #9b2b25' : isPending ? '1.5px solid #9b6f1e' : '1px solid #e5e0d8',
        borderRadius: '3px',
        height: '62px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 900, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isPending ? '#9b6f1e' : '#17191c' }}>
          {security.ticker}
        </span>
        <span style={{ fontWeight: 800, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isHalted ? '#9b2b25' : isPending ? '#9b6f1e' : isUp ? '#15694f' : '#9b2b25' }}>
          {isHalted ? 'HALTED' : isPending ? 'STAGED' : `₹${security.currentPrice.toFixed(2)}`}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: isHalted ? '#9b2b25' : isPending ? '#9b6f1e' : isUp ? '#15694f' : '#9b2b25' }}>
          {isHalted ? '🛑 SUSPENDED' : isPending ? '⏳ IPO PENDING' : `${isUp ? '▲' : '▼'} ${Math.abs(priceChangePct).toFixed(2)}%`}
        </span>
        {!isHalted && !isPending && <Sparkline history={security.priceHistory} isUp={isUp} width={40} height={14} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', color: '#6b6863' }}>
        <span>Vol: {volStr}</span>
        <span>Units: {security.availableUnits}</span>
      </div>
    </div>
  );
}

// Scrolling Marquee Ticker Header
function ScrollingTicker({ securities }) {
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#0a0b0d',
      color: '#fff',
      borderBottom: '1px solid #22252e',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      height: '36px',
      position: 'relative'
    }}>
      <div style={{
        backgroundColor: '#9b6f1e',
        color: '#ffffff',
        padding: '0 16px',
        fontWeight: 900,
        fontSize: '0.8rem',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'var(--font-display)',
        boxShadow: '4px 0 8px rgba(0,0,0,0.4)',
        letterSpacing: '0.05em'
      }}>
        SAAMX LIVE
      </div>
      <div className="ticker-scroll" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '32px',
        paddingLeft: '20px',
        animation: 'marquee 150s linear infinite'
      }}>
        {[...securities, ...securities].map((sec, idx) => {
          const priceChange = sec.currentPrice - sec.basePrice;
          const priceChangePct = sec.basePrice > 0 ? (priceChange / sec.basePrice) * 100 : 0;
          const isUp = priceChangePct >= 0;

          return (
            <span key={`${sec.id}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 'bold' }}>
              <span style={{ color: '#d4af37' }}>{sec.ticker}</span>
              <span style={{ color: '#ffffff' }}>₹{sec.currentPrice.toFixed(2)}</span>
              <span style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
                {isUp ? '▲' : '▼'}{Math.abs(priceChangePct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}

export default function ProjectorPage({ state, takeoverEvent }) {
  const [timeLeft, setTimeLeft] = useState('60:00');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  const [latestNews, setLatestNews] = useState(null);
  const [niftyHistory, setNiftyHistory] = useState([24150, 24180, 24200, 24250.8]);

  // Interactive controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [activeModal, setActiveModal] = useState(null);
  const [showAllGridOnly, setShowAllGridOnly] = useState(false);

  // Render takeover overlay for Opening/Closing bell & alerts
  const renderTakeoverOverlay = () => {
    if (!takeoverEvent) return null;
    const { type, ticker, name, ipoPrice, availableUnits } = takeoverEvent;
    switch (type) {
      case 'OPENING_BELL':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: '#0a0b0d', color: '#ffffff', zIndex: 100000, border: '8px solid #26a69a' }}>
            <div className="takeover-card bell" style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', color: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <span style={{ fontSize: '5rem', display: 'inline-block', animation: 'shake 1.2s infinite' }}>🔔</span>
              <h2 className="takeover-title text-up" style={{ color: '#26a69a', fontSize: '3rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>MARKET OPEN</h2>
              <p className="takeover-desc" style={{ color: '#848e9c', fontSize: '1.2rem' }}>The central exchange trading floor is now open. Trading terminals are active.</p>
            </div>
            <style>{`
              @keyframes shake {
                0% { transform: rotate(0); }
                15% { transform: rotate(15deg); }
                30% { transform: rotate(-15deg); }
                45% { transform: rotate(10deg); }
                60% { transform: rotate(-10deg); }
                75% { transform: rotate(4deg); }
                100% { transform: rotate(0); }
              }
            `}</style>
          </div>
        );
      case 'CLOSING_BELL':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: '#0a0b0d', color: '#ffffff', zIndex: 100000, border: '8px solid #ef5350' }}>
            <div className="takeover-card" style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', color: '#ffffff', borderTop: '6px solid #ef5350', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <span style={{ fontSize: '5rem' }}>🔕</span>
              <h2 className="takeover-title text-down" style={{ color: '#ef5350', fontSize: '3rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>MARKET CLOSED</h2>
              <p className="takeover-desc" style={{ color: '#848e9c', fontSize: '1.2rem' }}>Trading has concluded for the current session. Financial ledgers are frozen.</p>
            </div>
          </div>
        );
      case 'BANKRUPTCY':
      case 'INSOLVENCY':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'rgba(15, 11, 11, 0.96)', color: '#ffffff', zIndex: 100000, border: '8px solid #ef5350' }}>
            <div className="takeover-card" style={{ backgroundColor: '#131722', border: '2px solid #ef5350', color: '#ffffff', boxShadow: '0 8px 32px rgba(239,83,80,0.3)' }}>
              <span style={{ fontSize: '5rem' }}>⚖️</span>
              <h2 className="takeover-title text-down" style={{ color: '#ef5350', fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>ASSETS LIQUIDATED</h2>
              <p className="takeover-desc" style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 'bold' }}>
                {ticker} &mdash; {name}
              </p>
              <p style={{ color: '#848e9c', marginTop: '12px' }}>This company has been declared bankrupt by the NCLT. Share value adjusted to ₹0.00.</p>
            </div>
          </div>
        );
      case 'MARKET_HALT':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'rgba(20, 16, 8, 0.96)', color: '#ffffff', zIndex: 100000, border: '8px solid #f59e0b' }}>
            <div className="takeover-card" style={{ backgroundColor: '#131722', border: '2px solid #f59e0b', color: '#ffffff', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
              <span style={{ fontSize: '5rem', display: 'inline-block', animation: 'pulse-slow 1.5s infinite' }}>⚠️</span>
              <h2 className="takeover-title" style={{ color: '#f59e0b', fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>TRADING HALTED</h2>
              <p className="takeover-desc" style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 'bold' }}>
                Regulatory circuit breaker triggered on: {ticker}
              </p>
              <p style={{ color: '#848e9c', marginTop: '12px' }}>Order execution suspended temporarily by SEBI. Pending investigation.</p>
            </div>
            <style>{`
              @keyframes pulse-slow {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
            `}</style>
          </div>
        );
      case 'IPO_LAUNCH':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'rgba(11, 20, 15, 0.96)', color: '#ffffff', zIndex: 100000, border: '8px solid #26a69a' }}>
            <div className="takeover-card bell" style={{ backgroundColor: '#131722', border: '2px solid #26a69a', color: '#ffffff', boxShadow: '0 8px 32px rgba(38,166,154,0.3)' }}>
              <span style={{ fontSize: '5rem', display: 'inline-block', animation: 'bounce-up 1.2s infinite' }}>🚀</span>
              <h2 className="takeover-title text-up" style={{ color: '#26a69a', fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>IPO LISTED & ACTIVE</h2>
              <p className="takeover-desc" style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 'bold' }}>
                {ticker} &mdash; {name}
              </p>
              <p style={{ color: '#848e9c', marginTop: '12px' }}>Bidding subscription window closed. Listing is now live and trading on the exchange floor.</p>
            </div>
            <style>{`
              @keyframes bounce-up {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-15px); }
              }
            `}</style>
          </div>
        );
      case 'IPO_PENDING':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'rgba(20, 18, 11, 0.96)', color: '#ffffff', zIndex: 100000, border: '8px solid #d4af37' }}>
            <div className="takeover-card" style={{ backgroundColor: '#131722', border: '2px solid #d4af37', color: '#ffffff', boxShadow: '0 8px 32px rgba(212,175,55,0.3)' }}>
              <span style={{ fontSize: '5rem' }}>⏳</span>
              <h2 className="takeover-title" style={{ color: '#d4af37', fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '16px 0' }}>IPO STAGING</h2>
              <p className="takeover-desc" style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 'bold' }}>
                Upcoming Listing: {ticker} &mdash; {name}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px' }}>
                <div>
                  <span style={{ color: '#848e9c', fontSize: '0.75rem', display: 'block' }}>BASE ISSUE PRICE</span>
                  <strong style={{ fontSize: '1.3rem', color: '#ffffff' }}>₹{ipoPrice || 285}</strong>
                </div>
                <div style={{ borderLeft: '1px solid #2a2e39', paddingLeft: '24px' }}>
                  <span style={{ color: '#848e9c', fontSize: '0.75rem', display: 'block' }}>TOTAL OFFERING SIZE</span>
                  <strong style={{ fontSize: '1.3rem', color: '#ffffff' }}>{availableUnits || 18000} Units</strong>
                </div>
              </div>
              <p style={{ color: '#848e9c', marginTop: '20px' }}>Subscription channel staged. Listing goes active shortly.</p>
            </div>
          </div>
        );
      case 'NEWS_FLASH':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'rgba(9, 10, 15, 0.97)', color: '#ffffff', zIndex: 100000, border: '8px solid #ef5350' }}>
            <div className="takeover-card" style={{ backgroundColor: '#131722', border: '2px solid #ef5350', color: '#ffffff', boxShadow: '0 8px 32px rgba(239,83,80,0.3)', width: '80%', maxWidth: '900px', padding: '40px' }}>
              <span className="flash-badge" style={{ backgroundColor: '#ef5350', color: '#ffffff', padding: '6px 16px', borderRadius: '4px', fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', display: 'inline-block', marginBottom: '24px', animation: 'blink 1s infinite' }}>⚡ BREAKING NEWS</span>
              <h1 className="takeover-title" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', margin: '0 0 20px 0', color: '#ffffff', lineHeight: '1.3' }}>{name}</h1>
              <p className="takeover-desc" style={{ color: '#848e9c', fontSize: '1.2rem', lineHeight: '1.6', margin: 0 }}>{ticker}</p>
            </div>
            <style>{`
              @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
            `}</style>
          </div>
        );
      default:
        return null;
    }
  };

  // Session Clock countdown logic
  useEffect(() => {
    const status = state.marketState.status;
    const startTime = state.marketState.simulationStartTime;
    const durationMins = state.marketState.simulationDurationMinutes;
    const pauseOffset = state.marketState.pauseTimeOffset || 0;
    const pausedAt = state.marketState.pausedAt;

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
  }, [state.marketState.status, state.marketState.simulationStartTime, state.marketState.simulationDurationMinutes, state.marketState.pauseTimeOffset, state.marketState.pausedAt, serverTimeOffset]);

  // Track latest news
  useEffect(() => {
    const triggeredNews = [...state.newsEvents]
      .filter(n => n.triggeredAt)
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
    if (triggeredNews.length > 0) {
      setLatestNews(triggeredNews[0]);
    }
  }, [state.newsEvents]);

  // Filtered Securities list based on search and sector filter
  const filteredSecurities = state.securities
    .filter(s => s.status !== 'Bankrupt' && s.status !== 'Delisted')
    .filter(s => {
      const matchesSearch = searchQuery === '' || 
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
      return matchesSearch && matchesSector;
    })
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  // Team leaderboard (Sorted by Portfolio Value)
  const leaderboard = state.teams
    .filter(t => t.isActive)
    .sort((a, b) => (b.portfolioValue || 0) - (a.portfolioValue || 0));

  // Market overview stats
  const totalSecs = state.securities.filter(s => s.status === 'Active');
  const advances = totalSecs.filter(s => s.currentPrice > s.basePrice).length;
  const declines = totalSecs.filter(s => s.currentPrice < s.basePrice).length;
  const totalVolume = (state.transactions || [])
    .filter(t => !t.voided)
    .reduce((acc, t) => acc + t.quantity, 0);
  const totalTrades = (state.transactions || []).filter(t => !t.voided).length;
  const marketCap = Object.values(state.securities).reduce((acc, s) => acc + ((s.totalUnits || 0) * s.currentPrice), 0);

  const totalAdvDec = advances + declines;
  const advPct = totalAdvDec > 0 ? (advances / totalAdvDec) * 100 : 50;
  const decPct = totalAdvDec > 0 ? (declines / totalAdvDec) * 100 : 50;

  const sensexVal = 79850.20 * (1 + (state.marketState.marketIndex || 0) / 100);
  const niftyVal = 24250.80 * (1 + (state.marketState.marketIndex || 0) / 100);

  // Most active stocks
  const activeSecsWithVol = state.securities
    .filter(s => s.status !== 'Bankrupt' && s.status !== 'Delisted')
    .map(s => {
      const vol = (state.transactions || [])
        .filter(tx => tx.ticker === s.ticker && !tx.voided)
        .reduce((sum, tx) => sum + tx.quantity, 0);
      return { ...s, tradedVolume: vol };
    })
    .sort((a, b) => b.tradedVolume - a.tradedVolume);

  // Sector list for filter options
  const sectorList = ['ALL', ...Array.from(new Set(state.securities.map(s => s.sector).filter(Boolean)))];

  // Bottom Dashboard Logs
  const bottomNewsLog = [...state.newsEvents]
    .filter(n => n.triggeredAt)
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  const bottomOrderLog = (state.transactions || [])
    .filter(t => !t.voided)
    .sort((a, b) => b.timestamp - a.timestamp);

  const bottomRegulatoryLog = [...state.corporateActions]
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  // Dynamic Sector Heatmap calculation based on securities in state
  const sectorsListCalculated = ['Financials', 'Technology', 'Healthcare', 'Energy', 'Infrastructure', 'Consumer Goods'];
  const sectorsMappingShort = {
    'Financials': 'BANKING',
    'Technology': 'IT',
    'Healthcare': 'PHARMA',
    'Energy': 'ENERGY',
    'Infrastructure': 'INFRA',
    'Consumer Goods': 'RETAIL'
  };
  const sectors = sectorsListCalculated.map(secName => {
    const sectorSecs = state.securities.filter(s => s.sector === secName && s.status === 'Active');
    let avgChange = 0;
    if (sectorSecs.length > 0) {
      const totalChange = sectorSecs.reduce((sum, s) => {
        const pct = s.basePrice > 0 ? ((s.currentPrice - s.basePrice) / s.basePrice) * 100 : 0;
        return sum + pct;
      }, 0);
      avgChange = totalChange / sectorSecs.length;
    }
    return {
      name: sectorsMappingShort[secName] || secName.toUpperCase(),
      change: parseFloat(avgChange.toFixed(2))
    };
  });

  const marketStatusText = state.marketState.status === 'Open' ? 'MARKET OPEN' : 'MARKET CLOSED';

  if (showAllGridOnly) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0a0b0d', color: '#e1e3e6', fontFamily: 'var(--font-sans)', padding: 0 }}>
        {/* 1. Scrolling Marquee Header */}
        <ScrollingTicker securities={state.securities} />

        {/* Session ID & Active Teams Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0a0b0d',
          color: '#fff',
          padding: '6px 16px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          borderBottom: '1px solid #22252e'
        }}>
          <span>SESSION: <strong style={{ color: '#d4af37' }}>{state.marketState?.sessionId || 'NOT INITIALIZED'}</strong></span>
          <span>PARTICIPANTS: <strong style={{ color: '#d4af37' }}>{state.marketState?.activeTeamCount || 10} ACTIVE TEAMS</strong></span>
          <span>MARKET STATUS: <strong style={{ color: state.marketState?.status === 'Open' ? '#22c55e' : '#ef4444' }}>{state.marketState?.status?.toUpperCase() || 'CLOSED'}</strong></span>
        </div>

        {/* 2. Expanded All Securities Grid View */}
        <div style={{
          flex: 1,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e0d8',
          margin: '12px',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Header Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f0ede6', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#9b6f1e', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                SAAMX SECURITIES UNIVERSE
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6b6863', fontWeight: 700 }}>
                ({filteredSecurities.length} / {state.securities.length} COMPANIES)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search Company / Symbol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #e2ddd4',
                  fontSize: '0.8rem',
                  outline: 'none',
                  width: '240px'
                }}
              />
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #e2ddd4', backgroundColor: '#faf8f5', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {sectorList.map(sec => (
                  <option key={sec} value={sec}>{sec === 'ALL' ? '⚙ ALL SECTORS' : sec}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAllGridOnly(false)}
                style={{
                  backgroundColor: '#9b6f1e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                ← BACK TO DASHBOARD
              </button>
            </div>
          </div>

          {/* Watch Cards Grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(11, 1fr)',
            gridAutoRows: '62px',
            gap: '6px',
            overflowY: 'auto',
            paddingRight: '4px',
            boxSizing: 'border-box'
          }}>
            {filteredSecurities.map((s, idx) => (
              <ProjectorCell key={s ? s.id : `empty-${idx}`} security={s} totalTransactions={state.transactions} />
            ))}
          </div>
        </div>

        {/* 3. Footer Disclaimer */}
        <div style={{
          backgroundColor: '#0a0b0d',
          borderTop: '1px solid #1e222d',
          padding: '4px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.55rem',
          color: '#848e9c',
          boxSizing: 'border-box',
          height: '24px'
        }}>
          <span>Prices shown are for simulation purposes only and do not represent real market data.</span>
          <span>Powered by SAAMX - Student Academic Asset Market eXchange</span>
          <span style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
            LIVE DATA
          </span>
        </div>

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0a0b0d', color: '#e1e3e6', fontFamily: 'var(--font-sans)', padding: 0 }}>
      
      {/* 1. Scrolling Marquee Header */}
      <ScrollingTicker securities={state.securities} />

      {/* Session ID & Active Teams Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0a0b0d',
        color: '#fff',
        padding: '6px 16px',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        borderBottom: '1px solid #22252e'
      }}>
        <span>SESSION: <strong style={{ color: '#d4af37' }}>{state.marketState?.sessionId || 'NOT INITIALIZED'}</strong></span>
        <span>PARTICIPANTS: <strong style={{ color: '#d4af37' }}>{state.marketState?.activeTeamCount || 10} ACTIVE TEAMS</strong></span>
        <span>MARKET STATUS: <strong style={{ color: state.marketState?.status === 'Open' ? '#22c55e' : '#ef4444' }}>{state.marketState?.status?.toUpperCase() || 'CLOSED'}</strong></span>
      </div>

      {/* 2. Top Stats Header Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 1.2fr 1.2fr 1.2fr 1.3fr',
        gap: '10px',
        padding: '8px 12px',
        backgroundColor: '#0a0b0d',
        boxSizing: 'border-box'
      }}>
        <div style={{ backgroundColor: '#ffffff', color: '#17191c', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#6b6863', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>SESSION CLOCK</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>{timeLeft}</div>
            <span style={{ fontSize: '0.55rem', color: '#8c8881', fontWeight: 600 }}>MARKET HOURS</span>
          </div>
          <span style={{ backgroundColor: '#d6f0e8', color: '#15694f', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#15694f', borderRadius: '50%', display: 'inline-block' }} />
            LIVE
          </span>
        </div>

        <div style={{ backgroundColor: '#ffffff', color: '#17191c', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e0d8', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.8rem', color: '#9b6f1e' }}>🏛️</span>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#6b6863', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>EXCHANGE STATUS</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: state.marketState.status === 'Open' ? '#15694f' : '#9b2b25', lineHeight: 1.1 }}>
              {marketStatusText}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', color: '#17191c', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#6b6863', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>INIFTY 50</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>{niftyVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15694f' }}>▲ 0.86%</span>
          </div>
          <Sparkline history={niftyHistory} isUp={true} width={50} height={20} />
        </div>

        <div style={{ backgroundColor: '#ffffff', color: '#17191c', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.55rem', color: '#6b6863', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>SENSEX</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>{sensexVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15694f' }}>▲ 0.72%</span>
          </div>
          <Sparkline history={niftyHistory} isUp={true} width={50} height={20} />
        </div>

        <div style={{ backgroundColor: '#ffffff', color: '#17191c', padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SentimentGaugeDial advances={advances} declines={declines} />
        </div>
      </div>

      {/* 3. Breaking News Banner */}
      <div style={{
        backgroundColor: '#4a0808',
        borderTop: '1px solid #7f1d1d',
        borderBottom: '1px solid #7f1d1d',
        padding: '4px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '3px', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            ⚡ BREAKING NEWS
          </span>
          <span style={{ fontSize: '0.7rem', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>02:01:40 PM</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
            {latestNews ? `${latestNews.headline} — ${latestNews.description}` : 'RBI RAISES REPO RATE BY 50 BASIS POINTS — Higher borrowing costs expected to impact banking and real estate sectors.'}
          </span>
        </div>
        <button
          onClick={() => setActiveModal('NEWS')}
          style={{ backgroundColor: '#7f1d1d', color: '#ffffff', border: 'none', padding: '3px 8px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
        >
          VIEW ALL NEWS
        </button>
      </div>

      {/* 4. Main Middle Section: Sidebar + Market Watch */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', padding: '10px 12px', overflow: 'hidden', boxSizing: 'border-box' }}>
        
        {/* Left Sidebar (Dark Theme) */}
        <div style={{ width: '22%', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
          
          {/* Team Leaderboard Card */}
          <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2e39', pb: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#d4af37', letterSpacing: '0.05em' }}>🏆 TEAM LEADERBOARD</span>
              <span style={{ fontSize: '0.6rem', color: '#848e9c' }}>⚙</span>
            </div>
            <table style={{ width: '100%', fontSize: '0.62rem', borderCollapse: 'collapse', color: '#d1d4dc' }}>
              <thead>
                <tr style={{ color: '#848e9c', borderBottom: '1px solid #2a2e39' }}>
                  <th align="left">RANK</th>
                  <th align="left">TEAM</th>
                  <th align="right">VALUE</th>
                  <th align="right">P/L %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 8).map((t, idx) => {
                  const isUp = (t.plPercent || 0) >= 0;
                  return (
                    <tr key={t.id || idx} style={{ borderBottom: '1px dashed #22252e', height: '18px' }}>
                      <td style={{ fontWeight: 'bold', color: '#848e9c' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 800, color: '#ffffff' }}>{t.name}</td>
                      <td align="right" style={{ fontFamily: 'var(--font-mono)' }}>₹{Math.round(t.portfolioValue !== undefined ? t.portfolioValue : (state.settings?.startingCapitalRetail || 1000000)).toLocaleString()}</td>
                      <td align="right" style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                        {isUp ? '+' : ''}{(t.plPercent || 0).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              onClick={() => setActiveModal('LEADERBOARD')}
              style={{ backgroundColor: '#1e222d', color: '#d1d4dc', border: '1px solid #2a2e39', padding: '4px', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', marginTop: '2px' }}
            >
              VIEW FULL LEADERBOARD
            </button>
          </div>

          {/* Market Overview Card */}
          <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#d4af37', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>📊 MARKET OVERVIEW</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.65rem' }}>
                <div>
                  <span style={{ color: '#848e9c', display: 'block' }}>Total Companies</span>
                  <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>{state.securities.length || 120}</strong>
                </div>
                <div>
                  <span style={{ color: '#848e9c', display: 'block' }}>Total Traded Volume</span>
                  <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>{totalVolume.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: '#848e9c', display: 'block' }}>Total Trades</span>
                  <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>{totalTrades}</strong>
                </div>
                <div>
                  <span style={{ color: '#848e9c', display: 'block' }}>Market Capitalization</span>
                  <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>₹{(marketCap / 10000000).toFixed(2)} Cr</strong>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 800, marginBottom: '2px' }}>
                <span style={{ color: '#22c55e' }}>Advances ▲ {advances}</span>
                <span style={{ color: '#ef4444' }}>Declines ▼ {declines}</span>
              </div>
              <div style={{ display: 'flex', height: '6px', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${advPct}%`, backgroundColor: '#22c55e' }} />
                <div style={{ width: `${decPct}%`, backgroundColor: '#ef4444' }} />
              </div>
            </div>
          </div>

        </div>

        {/* Right Main Watch Area */}
        <div style={{
          width: '78%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e0d8',
          borderRadius: '4px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Header Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #f0ede6', pb: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#9b6f1e', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                LIVE MARKET WATCH
              </span>
              <span style={{ fontSize: '0.7rem', color: '#6b6863', fontWeight: 700 }}>({filteredSecurities.length} / {state.securities.length} COMPANIES)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search Company / Symbol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '3px',
                  border: '1px solid #e2ddd4',
                  fontSize: '0.65rem',
                  outline: 'none',
                  width: '160px'
                }}
              />
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                style={{ padding: '3px 6px', borderRadius: '3px', border: '1px solid #e2ddd4', backgroundColor: '#faf8f5', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {sectorList.map(sec => (
                  <option key={sec} value={sec}>{sec === 'ALL' ? '⚙ ALL SECTORS' : sec}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Watch Cards Grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gridAutoRows: '62px',
            gap: '6px',
            overflowY: 'auto',
            paddingRight: '4px',
            boxSizing: 'border-box'
          }}>
            {filteredSecurities.map((s, idx) => (
              <ProjectorCell key={s ? s.id : `empty-${idx}`} security={s} totalTransactions={state.transactions} />
            ))}
          </div>

          {/* Footer View All Toggle */}
          <div style={{ textAlign: 'center', paddingTop: '4px', borderTop: '1px solid #f0ede6', marginTop: '4px' }}>
            <span
              onClick={() => { setShowAllGridOnly(true); setSearchQuery(''); setSelectedSector('ALL'); }}
              style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9b6f1e', cursor: 'pointer' }}
            >
              SHOW ALL {state.securities.length} COMPANIES ∨
            </span>
          </div>
        </div>

      </div>

      {/* 5. Bottom Dashboard (5 Equal Dark Columns) */}
      <div style={{
        height: '165px',
        backgroundColor: '#0a0b0d',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        padding: '0 12px 8px 12px',
        boxSizing: 'border-box'
      }}>
        {/* Col 1: LIVE MARKET NEWS */}
        <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d4af37', marginBottom: '4px' }}>📰 LIVE MARKET NEWS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {bottomNewsLog.slice(0, 4).map((n, i) => (
                <div key={i} style={{ fontSize: '0.52rem', color: '#d1d4dc', borderBottom: '1px dashed #22252e', padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    <span style={{ color: '#848e9c', fontFamily: 'var(--font-mono)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —
                    </span>{' '}
                    <strong>{n.headline}</strong>
                  </span>
                  <span style={{
                    backgroundColor: n.sentiment === 'Positive' ? '#143828' : n.sentiment === 'Negative' ? '#3d1616' : '#2a2e39',
                    color: n.sentiment === 'Positive' ? '#4ade80' : n.sentiment === 'Negative' ? '#f87171' : '#d1d4dc',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    fontSize: '0.45rem',
                    fontWeight: 'bold'
                  }}>
                    {n.sentiment?.toUpperCase() || 'NEUTRAL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <span onClick={() => setActiveModal('NEWS')} style={{ fontSize: '0.58rem', fontWeight: 800, color: '#d4af37', cursor: 'pointer', textAlign: 'center', display: 'block', marginTop: '2px' }}>VIEW ALL NEWS</span>
        </div>

        {/* Col 2: LIVE ORDER BOOK */}
        <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d4af37', marginBottom: '4px' }}>⚡ LIVE ORDER BOOK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {bottomOrderLog.slice(0, 4).map((t, i) => (
                <div key={i} style={{ fontSize: '0.52rem', display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 1fr 2.5fr', color: '#d1d4dc', borderBottom: '1px dashed #22252e', padding: '2px 0' }}>
                  <span style={{ color: '#848e9c', fontFamily: 'var(--font-mono)' }}>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.teamCode || 'Team'}</span>
                  <span style={{ color: t.action === 'BUY' ? '#26a69a' : '#ef5350', fontWeight: 'bold' }}>{t.action}</span>
                  <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{t.ticker}</span>
                  <span style={{ textAlign: 'right' }}>{t.quantity} @ ₹{t.priceAtExecution?.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
          <span onClick={() => setActiveModal('TRADES')} style={{ fontSize: '0.58rem', fontWeight: 800, color: '#d4af37', cursor: 'pointer', textAlign: 'center', display: 'block', marginTop: '2px' }}>VIEW ALL TRADES</span>
        </div>

        {/* Col 3: MOST ACTIVE STOCKS */}
        <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d4af37', marginBottom: '4px' }}>🔥 MOST ACTIVE STOCKS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {activeSecsWithVol.slice(0, 4).map((s, idx) => {
                const priceChange = s.currentPrice - s.basePrice;
                const priceChangePct = s.basePrice > 0 ? (priceChange / s.basePrice) * 100 : 0;
                const isUp = priceChangePct >= 0;
                const volStr = s.tradedVolume >= 1000 ? `${(s.tradedVolume / 1000).toFixed(1)}K` : `${s.tradedVolume}`;
                return (
                  <div key={idx} style={{ fontSize: '0.52rem', display: 'grid', gridTemplateColumns: '0.6fr 1.4fr 2.5fr 1.5fr', color: '#d1d4dc', borderBottom: '1px dashed #22252e', padding: '2px 0' }}>
                    <span style={{ color: '#848e9c', fontWeight: 'bold' }}>{idx + 1}</span>
                    <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{s.ticker}</span>
                    <span>Volume: {volStr}</span>
                    <span style={{ color: isUp ? '#26a69a' : '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                      {isUp ? '▲' : '▼'}{Math.abs(priceChangePct).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <span onClick={() => setActiveModal('ACTIVE')} style={{ fontSize: '0.58rem', fontWeight: 800, color: '#d4af37', cursor: 'pointer', textAlign: 'center', display: 'block', marginTop: '2px' }}>VIEW ALL</span>
        </div>

        {/* Col 4: REGULATORY ACTIONS */}
        <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d4af37', marginBottom: '4px' }}>⚖️ REGULATORY ACTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {bottomRegulatoryLog.slice(0, 4).map((r, i) => (
                <div key={i} style={{ fontSize: '0.52rem', color: '#d1d4dc', borderBottom: '1px dashed #22252e', padding: '2.5px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#848e9c', fontFamily: 'var(--font-mono)' }}>{new Date(r.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — </span>
                  <span style={{ fontWeight: 'bold', color: r.actionType === 'CircuitBreaker' ? '#ef5350' : '#ffffff' }}>
                    {r.actionType === 'CircuitBreaker' ? `Halted: ${r.securityId}` : r.details || r.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <span onClick={() => setActiveModal('ACTIONS')} style={{ fontSize: '0.58rem', fontWeight: 800, color: '#d4af37', cursor: 'pointer', textAlign: 'center', display: 'block', marginTop: '2px' }}>VIEW ALL ACTIONS</span>
        </div>

        {/* Col 5: MARKET HEATMAP */}
        <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '4px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#d4af37', marginBottom: '4px' }}>🗂 MARKET HEATMAP</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
              {sectors.map((sec, idx) => (
                <div key={idx} style={{
                  backgroundColor: sec.change >= 0 ? '#143828' : '#3d1616',
                  color: sec.change >= 0 ? '#4ade80' : '#f87171',
                  borderRadius: '2px',
                  padding: '2px',
                  textAlign: 'center',
                  fontSize: '0.52rem',
                  fontWeight: 900
                }}>
                  <div>{sec.name}</div>
                  <div style={{ fontSize: '0.58rem', marginTop: '1px' }}>{sec.change >= 0 ? '+' : ''}{sec.change}%</div>
                </div>
              ))}
            </div>
          </div>
          <span onClick={() => setActiveModal('HEATMAP')} style={{ fontSize: '0.58rem', fontWeight: 800, color: '#d4af37', cursor: 'pointer', textAlign: 'center', display: 'block', marginTop: '2px' }}>VIEW HEATMAP</span>
        </div>

      </div>

      {/* 6. Footer Disclaimer & Credit Bar */}
      <div style={{
        backgroundColor: '#0a0b0d',
        borderTop: '1px solid #1e222d',
        padding: '4px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.55rem',
        color: '#848e9c',
        boxSizing: 'border-box',
        height: '24px'
      }}>
        <span>Prices shown are for simulation purposes only and do not represent real market data.</span>
        <span>Powered by SAAMX - Student Academic Asset Market eXchange</span>
        <span style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '5px', height: '5px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
          LIVE DATA
        </span>
      </div>

      {/* Modal Popup Overlay */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#131722', border: '1px solid #2a2e39', borderRadius: '8px', padding: '20px', width: '600px', maxHeight: '80vh', overflowY: 'auto', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2e39', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#d4af37' }}>
                {activeModal === 'LEADERBOARD' && '🏆 FULL TEAM LEADERBOARD'}
                {activeModal === 'NEWS' && '📰 ALL MARKET NEWS DISPATCHES'}
                {activeModal === 'TRADES' && '⚡ LIVE ORDER BOOK LOGS'}
                {activeModal === 'ACTIONS' && '⚖️ SEBI & REGULATORY ACTIONS'}
                {activeModal === 'HEATMAP' && '🗂 DETAILED SECTOR HEATMAP'}
                {activeModal === 'ACTIVE' && '🔥 MOST ACTIVE STOCKS'}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ backgroundColor: '#2a2e39', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✕ CLOSE</button>
            </div>

            {activeModal === 'LEADERBOARD' && (
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#848e9c', borderBottom: '1px solid #2a2e39' }}>
                    <th align="left">RANK</th>
                    <th align="left">TEAM CODE</th>
                    <th align="left">TEAM NAME</th>
                    <th align="right">PORTFOLIO VALUE</th>
                    <th align="right">P/L %</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: '1px dashed #2a2e39', height: '24px' }}>
                      <td>{idx + 1}</td>
                      <td>{t.teamCode}</td>
                      <td style={{ fontWeight: 'bold' }}>{t.name}</td>
                      <td align="right">₹{Math.round(t.portfolioValue || 1000000).toLocaleString()}</td>
                      <td align="right" style={{ color: (t.plPercent || 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                        {(t.plPercent || 0) >= 0 ? '+' : ''}{(t.plPercent || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeModal === 'NEWS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bottomNewsLog.map((n, i) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #2a2e39', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: '#d4af37' }}>{n.headline}</div>
                    <div style={{ fontSize: '0.75rem', color: '#848e9c', marginTop: '4px' }}>{n.description}</div>
                  </div>
                ))}
              </div>
            )}

            {activeModal === 'TRADES' && (
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#848e9c', borderBottom: '1px solid #2a2e39' }}>
                    <th align="left">TIME</th>
                    <th align="left">TEAM</th>
                    <th align="left">ACTION</th>
                    <th align="left">TICKER</th>
                    <th align="right">QUANTITY</th>
                    <th align="right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {bottomOrderLog.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px dashed #2a2e39', height: '24px' }}>
                      <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                      <td>{t.teamCode || 'Team'}</td>
                      <td style={{ color: t.action === 'BUY' ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{t.action}</td>
                      <td>{t.ticker}</td>
                      <td align="right">{t.quantity}</td>
                      <td align="right">₹{t.priceAtExecution?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeModal === 'ACTIONS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bottomRegulatoryLog.map((r, i) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #2a2e39', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', color: '#ef4444' }}>{r.actionType || 'ALERT'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#d1d4dc', marginTop: '2px' }}>{r.details || r.description}</div>
                  </div>
                ))}
              </div>
            )}

            {activeModal === 'HEATMAP' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {sectors.map((sec, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRadius: '6px', backgroundColor: sec.change >= 0 ? '#143828' : '#3d1616', color: sec.change >= 0 ? '#4ade80' : '#f87171', textAlign: 'center', fontWeight: 'bold' }}>
                    <div style={{ fontSize: '1.1rem' }}>{sec.name}</div>
                    <div style={{ fontSize: '1.4rem', marginTop: '6px' }}>{sec.change >= 0 ? '+' : ''}{sec.change}%</div>
                  </div>
                ))}
              </div>
            )}

            {activeModal === 'ACTIVE' && (
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#848e9c', borderBottom: '1px solid #2a2e39' }}>
                    <th align="left">RANK</th>
                    <th align="left">TICKER</th>
                    <th align="left">NAME</th>
                    <th align="right">TRADED VOLUME</th>
                    <th align="right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSecsWithVol.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px dashed #2a2e39', height: '24px' }}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold', color: '#d4af37' }}>{s.ticker}</td>
                      <td>{s.name}</td>
                      <td align="right">{s.tradedVolume}</td>
                      <td align="right">₹{s.currentPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      {renderTakeoverOverlay()}
    </div>
  );
}
