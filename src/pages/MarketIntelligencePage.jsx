import React, { useState, useMemo } from 'react';
import { calculateMarketClock, apiFetch } from '../lib/api.js';

// SVG Sparkline
function Sparkline({ isUp, width = 48, height = 18 }) {
  const points = isUp 
    ? "0,14 10,12 20,13 30,8 40,5 48,2" 
    : "0,2 10,6 20,5 30,12 40,14 48,16";
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={isUp ? 'var(--color-rise)' : 'var(--color-fall)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function MarketIntelligencePage({ state, teamCode, onOpenProfile, connected }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  // 'OVERVIEW', 'NEWS', 'BULL_BEAR', 'BROKER', 'SENTIMENT', 'IPO', 'REGULATORY', 'HISTORY'

  const [newsCategoryFilter, setNewsCategoryFilter] = useState('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('ALL');
  const [selectedMoverTab, setSelectedMoverTab] = useState('gainers'); // 'gainers' | 'losers' | 'volume' | 'volatility'

  const marketState = state?.marketState || {};
  const sessionState = marketState.sessionState || 'PRE_OPEN';
  const marketStatus = marketState.status || 'NotStarted';
  const marketIndices = state?.marketIndices || {};
  const bullBear = state?.bullBear || {};
  const brokerRecs = Object.values(state?.brokerRecommendations || {}).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  const polls = Object.values(state?.polls || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const activeDebate = bullBear.activeDebate || null;

  const fxRates = state?.fxRates || {
    USDINR: { midRate: 88.20, spreadPercent: 0.45 },
    GBPINR: { midRate: 119.40, spreadPercent: 0.45 },
    EURINR: { midRate: 103.50, spreadPercent: 0.45 }
  };
  const usdRate = fxRates.USDINR?.midRate || 88.20;
  const gbpRate = fxRates.GBPINR?.midRate || 119.40;
  const eurRate = fxRates.EURINR?.midRate || 103.50;

  const clock = useMemo(() => calculateMarketClock(marketState), [marketState]);
  const securities = useMemo(() => Object.values(state?.securities || {}), [state?.securities]);
  
  // Public-only news events
  const newsEvents = useMemo(() => {
    return Object.values(state?.newsEvents || [])
      .filter(n => n.triggeredAt && n.triggeredAt > 0)
      .sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0));
  }, [state?.newsEvents]);

  // Current Team Data
  const team = useMemo(() => {
    return (state?.teams || []).find(t => t.teamCode === teamCode);
  }, [state?.teams, teamCode]);

  // Five Landmark IPOs
  const ipoList = useMemo(() => [
    { ticker: 'OAI', name: 'OpenAI Inc', sector: 'Artificial Intelligence', exchange: 'NASDAQ', currency: 'USD', basePrice: 420.00 },
    { ticker: 'STRP', name: 'Stripe Payments', sector: 'Financial Technology', exchange: 'NYSE', currency: 'USD', basePrice: 115.00 },
    { ticker: 'CNVA', name: 'Canva Design Tech', sector: 'SaaS / Design', exchange: 'NASDAQ', currency: 'USD', basePrice: 88.00 },
    { ticker: 'DISC', name: 'Discord Platforms', sector: 'Consumer Internet', exchange: 'NYSE', currency: 'USD', basePrice: 64.00 },
    { ticker: 'POLY', name: 'Polymarket Protocol', sector: 'Prediction Tech', exchange: 'NASDAQ', currency: 'USD', basePrice: 45.00 }
  ], []);

  // Market Breadth & Sentiment Calculations
  const { advancers, decliners, unchanged, totalVolume, totalTrades, marketSentiment } = useMemo(() => {
    let adv = 0, dec = 0, unc = 0, vol = 0;

    securities.forEach(s => {
      if (s.status === 'Active' || s.status === 'Halted') {
        const cur = s.currentPrice || s.basePrice || 0;
        const op = s.openingPrice || s.basePrice || cur;
        vol += (s.tradingVolume || s.volume || 0);
        if (cur > op) adv++;
        else if (cur < op) dec++;
        else unc++;
      }
    });

    const trades = state?.transactions?.length || 0;
    const global100Chg = marketIndices.GLOBAL100?.changePercent || 0;

    let sentiment = { label: 'Neutral', badge: '⚪ Neutral', color: '#6B6863', bg: 'rgba(107, 104, 99, 0.08)' };
    if (adv > dec * 1.5 && global100Chg > 0.3) {
      sentiment = { label: 'Strong Bullish', badge: '🟢 Strong Bullish', color: 'var(--color-rise)', bg: 'rgba(6, 95, 62, 0.08)' };
    } else if (dec > adv * 1.5 && global100Chg < -0.3) {
      sentiment = { label: 'Bearish Wave', badge: '🔴 Bearish Wave', color: 'var(--color-fall)', bg: 'rgba(147, 25, 19, 0.08)' };
    } else if (adv > dec) {
      sentiment = { label: 'Mildly Bullish', badge: '🟢 Mild Bullish', color: 'var(--color-rise)', bg: 'rgba(6, 95, 62, 0.05)' };
    } else if (dec > adv) {
      sentiment = { label: 'Mixed / Defensive', badge: '🟡 Mixed / Defensive', color: 'var(--color-brass)', bg: 'rgba(132, 85, 8, 0.05)' };
    }

    return { advancers: adv, decliners: dec, unchanged: unc, totalVolume: vol, totalTrades: trades, marketSentiment: sentiment };
  }, [securities, state?.transactions, marketIndices]);

  // Market Movers
  const activeSecs = useMemo(() => securities.filter(s => s.status === 'Active'), [securities]);

  const topGainers = useMemo(() => {
    return [...activeSecs]
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const op = s.openingPrice || s.basePrice || cur;
        const pct = op > 0 ? ((cur - op) / op) * 100 : 0;
        return { ...s, pct, cur, op };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [activeSecs]);

  const topLosers = useMemo(() => {
    return [...activeSecs]
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const op = s.openingPrice || s.basePrice || cur;
        const pct = op > 0 ? ((cur - op) / op) * 100 : 0;
        return { ...s, pct, cur, op };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
  }, [activeSecs]);

  // Broker Consensus Map
  const brokerConsensus = useMemo(() => {
    const map = {};
    brokerRecs.forEach(r => {
      if (!map[r.ticker]) map[r.ticker] = { BUY: 0, SELL: 0, HOLD: 0, total: 0, calls: [] };
      map[r.ticker][r.recommendation] = (map[r.ticker][r.recommendation] || 0) + 1;
      map[r.ticker].total += 1;
      map[r.ticker].calls.push(r);
    });
    return map;
  }, [brokerRecs]);

  const handleVotePoll = async (pollId, optionId) => {
    try {
      await apiFetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, teamCode: teamCode || 'T01', optionId })
      });
      alert('Your team vote has been recorded!');
    } catch (e) {
      alert('Voting error: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--color-ink)' }}>
      
      {/* 1. Header & Live Clock Strip */}
      <div className="card-data" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F3 100%)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'var(--color-brass)', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              SAAMX MARKET INTELLIGENCE HUB
            </span>
            <span className="badge" style={{ backgroundColor: marketSentiment.bg, color: marketSentiment.color, fontWeight: 900, border: `1px solid ${marketSentiment.color}`, fontSize: '0.75rem' }}>
              {marketSentiment.badge}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', color: 'var(--color-ink)', margin: '6px 0 0 0', fontWeight: 900 }}>
            Real-Time Market Telemetry & Surveillance Wires
          </h1>
          <p style={{ margin: '3px 0 0 0', color: 'var(--color-ink-2)', fontSize: '0.82rem' }}>
            Authoritative Cross-Asset Telemetry &bull; Broker Consensus &bull; Bull/Bear Arena &bull; Primary IPO Radar
          </p>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '8px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>SIMULATED MARKET CLOCK</span>
            <div className="font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-ink)' }}>
              {clock.timeString || '10:00 AM IST'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-brass)', fontWeight: 800, display: 'block' }}>
              ⏳ {clock.timeLeftString || 'ACTIVE SESSION'}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-rise)', fontWeight: 700 }}>
              Phase: {sessionState.replace('_', ' ')}
            </span>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '8px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>MARKET SCHEDULE</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0284C7', marginTop: '2px' }}>
              09:30 Open &bull; 12:00 Lunch &bull; 15:30 Freeze
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', fontWeight: 700 }}>
              Reconciliation: 15:30–15:45 &bull; Results: 16:00
            </span>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '8px', textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>FEED STATUS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
              <span className={`status-pulse-dot ${marketStatus === 'Open' ? '' : 'closed'}`} />
              <span style={{ fontWeight: 900, fontSize: '1.1rem', color: marketStatus === 'Open' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {marketStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Indices Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {[
          { key: 'GLOBAL100', name: 'GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, op: marketIndices.GLOBAL100?.openingValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0, desc: 'World Benchmark' },
          { key: 'INDIA50', name: 'INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, op: marketIndices.INDIA50?.openingValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0, desc: 'NSE/BSE Bluechips' },
          { key: 'US100', name: 'US 100', val: marketIndices.US100?.currentValue || 8000, op: marketIndices.US100?.openingValue || 8000, chg: marketIndices.US100?.changePercent || 0, desc: 'NASDAQ/NYSE Giants' },
          { key: 'UK100', name: 'UK 100', val: marketIndices.UK100?.currentValue || 4000, op: marketIndices.UK100?.openingValue || 4000, chg: marketIndices.UK100?.changePercent || 0, desc: 'FTSE Constituents' }
        ].map(idx => {
          const isUp = idx.chg >= 0;
          return (
            <div key={idx.key} className="card-metric" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', fontWeight: 800 }}>SAAMX {idx.name}</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-ink)', lineHeight: 1.2 }}>
                  {Number(idx.val).toFixed(1)}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isUp ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                  {isUp ? '▲ +' : '▼ '}{Math.abs(idx.chg).toFixed(2)}%
                </span>
              </div>
              <Sparkline isUp={isUp} width={52} height={22} />
            </div>
          );
        })}
      </div>

      {/* 3. Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '2px solid var(--color-border)', paddingBottom: '2px' }}>
        {[
          { id: 'OVERVIEW', label: '📊 Market Overview' },
          { id: 'NEWS', label: '📢 Live News & Wires' },
          { id: 'BULL_BEAR', label: '🐂 Bull vs Bear Arena' },
          { id: 'BROKER', label: '💼 Broker Advisory Desk' },
          { id: 'SENTIMENT', label: '📈 Sentiment & Breadth' },
          { id: 'IPO', label: '🚀 IPO Radar' },
          { id: 'REGULATORY', label: '🏛 Regulatory Watch' },
          { id: 'HISTORY', label: '📜 News Archive & History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === tab.id ? 'var(--color-brass)' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-ink-2)',
              border: 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Debate / Breaking Alert Banner if active */}
          {activeDebate && activeDebate.active && (
            <div style={{ background: 'linear-gradient(90deg, #1E293B 0%, #0F172A 100%)', border: '2px solid #F59E0B', borderRadius: '10px', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ background: '#D97706', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontWeight: 900, fontSize: '0.7rem' }}>
                  LIVE FLOOR DEBATE ACTIVE
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '6px 0 2px 0' }}>
                  ⚔️ Bull 🐂 vs Bear 🐻 Showdown: {activeDebate.topic}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#CBD5E1' }}>
                  Visit the Bull vs Bear tab to inspect physical floor arguments and cast your team vote.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('BULL_BEAR')}
                style={{ padding: '8px 16px', background: '#F59E0B', color: '#000', fontWeight: 900, fontSize: '0.82rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Go to Debate Arena ➔
              </button>
            </div>
          )}

          {/* Breadth & Movers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Market Movers Card */}
            <div className="card-data" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  ⚡ Market Movers & Top Gainers
                </h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['gainers', 'losers'].map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMoverTab(m)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: selectedMoverTab === m ? 'var(--color-brass)' : 'var(--color-paper-subtle)',
                        color: selectedMoverTab === m ? '#fff' : 'var(--color-ink)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedMoverTab === 'gainers' ? topGainers : topLosers).map(s => (
                  <div
                    key={s.ticker}
                    onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-paper-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    <div>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--color-ink)' }}>{s.ticker}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', marginLeft: '8px' }}>{s.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>₹{s.cur.toFixed(2)}</span>
                      <span style={{ marginLeft: '8px', fontWeight: 800, fontSize: '0.78rem', color: s.pct >= 0 ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                        {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Breadth & Turnover Card */}
            <div className="card-data" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                  📊 Floor Breadth Telemetry
                </h3>

                <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: `${(advancers / Math.max(1, advancers + decliners + unchanged)) * 100}%`, backgroundColor: 'var(--color-rise)' }} />
                  <div style={{ width: `${(unchanged / Math.max(1, advancers + decliners + unchanged)) * 100}%`, backgroundColor: '#A0AEC0' }} />
                  <div style={{ width: `${(decliners / Math.max(1, advancers + decliners + unchanged)) * 100}%`, backgroundColor: 'var(--color-fall)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--color-rise)' }}>🟢 {advancers} Advancers</span>
                  <span style={{ color: '#718096' }}>⚪ {unchanged} Unchanged</span>
                  <span style={{ color: 'var(--color-fall)' }}>🔴 {decliners} Decliners</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                  <div style={{ background: 'var(--color-paper-subtle)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', display: 'block' }}>TOTAL TRADES</span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{totalTrades}</strong>
                  </div>
                  <div style={{ background: 'var(--color-paper-subtle)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', display: 'block' }}>VOLUME</span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{totalVolume.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '10px 14px', background: marketSentiment.bg, borderRadius: '6px', border: `1px solid ${marketSentiment.color}`, fontSize: '0.78rem', color: marketSentiment.color, fontWeight: 800 }}>
                Consensus Sentiment: {marketSentiment.label} &bull; Real-time cross-asset equilibrium
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: LIVE NEWS */}
      {activeTab === 'NEWS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'CORPORATE', 'GLOBAL_MACRO', 'GOVERNMENT', 'REGULATORY', 'CURRENCY', 'IPO', 'CRISIS'].map(cat => (
              <button
                key={cat}
                onClick={() => setNewsCategoryFilter(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: newsCategoryFilter === cat ? 'var(--color-brass)' : '#fff',
                  color: newsCategoryFilter === cat ? '#fff' : 'var(--color-ink)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer'
                }}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* News Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newsEvents
              .filter(n => newsCategoryFilter === 'ALL' || n.category?.toUpperCase() === newsCategoryFilter)
              .map(n => (
                <div key={n.id} className="card-data" style={{ padding: '16px 20px', borderLeft: `5px solid ${n.tier === 'TIER_1' ? '#DC2626' : n.tier === 'TIER_2' ? '#D97706' : '#2563EB'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '2px 6px', borderRadius: '3px', background: n.tier === 'TIER_1' ? '#DC2626' : n.tier === 'TIER_2' ? '#D97706' : '#2563EB', color: '#fff' }}>
                        {n.tier || 'TIER_3'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)', fontWeight: 700 }}>
                        {n.category}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 6px 0', color: 'var(--color-ink)' }}>
                    {n.headline || n.title}
                  </h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: '1.45' }}>
                    {n.description || n.body}
                  </p>

                  {n.affectedAssets && n.affectedAssets.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', fontWeight: 800 }}>AFFECTED ASSETS:</span>
                      {n.affectedAssets.map(t => (
                        <span key={t} onClick={() => onOpenProfile && onOpenProfile(t)} style={{ padding: '2px 6px', borderRadius: '3px', background: 'var(--color-paper-subtle)', border: '1px solid var(--color-border)', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'monospace' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: BULL VS BEAR */}
      {activeTab === 'BULL_BEAR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Bull Perspective */}
            <div className="card-data" style={{ padding: '20px', borderTop: '4px solid var(--color-rise)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-rise)' }}>🐂 BULL PERSPECTIVE</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-rise)', background: 'rgba(6, 95, 62, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  Confidence: {bullBear.bull?.confidence || 85}%
                </span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                Outlook: <strong>{bullBear.bull?.stance || 'STRONGLY BULLISH'}</strong>
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                "{bullBear.bull?.statement || 'Current market weakness presents an exceptional accumulation window in hyperscale AI and financial leaders.'}"
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                Target Sectors: <strong>{(bullBear.bull?.targetSectors || ['Technology', 'Financials']).join(', ')}</strong>
              </div>
            </div>

            {/* Bear Perspective */}
            <div className="card-data" style={{ padding: '20px', borderTop: '4px solid var(--color-fall)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-fall)' }}>🐻 BEAR PERSPECTIVE</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-fall)', background: 'rgba(147, 25, 19, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  Confidence: {bullBear.bear?.confidence || 78}%
                </span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                Outlook: <strong>{bullBear.bear?.stance || 'DEFENSIVE / BEARISH'}</strong>
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                "{bullBear.bear?.statement || 'Stretched valuations and refinancing vulnerabilities suggest participants should maintain defensive cash buffers.'}"
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                Risk Areas: <strong>{(bullBear.bear?.riskAreas || ['Telecom', 'High Multiple Tech']).join(', ')}</strong>
              </div>
            </div>

          </div>

          {/* Interactive Sentiment Poll Widget */}
          {polls.length > 0 && (
            <div className="card-data" style={{ padding: '20px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--color-ink)' }}>
                🗳 Active Market Sentiment Poll: {polls[0].question}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(polls[0].options || []).map(opt => {
                  const totalVotes = Object.values(polls[0].votes || {}).length;
                  const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                  const alreadyVoted = polls[0].votes?.[teamCode] !== undefined;

                  return (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        disabled={alreadyVoted || polls[0].status !== 'OPEN'}
                        onClick={() => handleVotePoll(polls[0].id, opt.id)}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          background: '#fff',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          cursor: alreadyVoted ? 'default' : 'pointer'
                        }}
                      >
                        {opt.text}
                      </button>
                      <span style={{ minWidth: '70px', fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-brass)' }}>
                        {pct}% ({opt.votes || 0})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: BROKER DESK */}
      {activeTab === 'BROKER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card-data" style={{ padding: '16px 20px', background: 'var(--color-paper-subtle)', borderLeft: '4px solid var(--color-brass)' }}>
            <strong style={{ fontSize: '0.85rem' }}>ℹ️ Advisory Disclaimer:</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', marginLeft: '6px' }}>
              Broker recommendations represent floor advisor analysis and opinions. They are non-binding and do not guarantee future returns.
            </span>
          </div>

          {/* Broker Consensus Breakdown */}
          <div className="card-data" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem' }}>🏢 Institutional Broker Consensus Ratings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {Object.keys(brokerConsensus).map(ticker => {
                const data = brokerConsensus[ticker];
                const buyPct = Math.round((data.BUY / data.total) * 100);
                const sellPct = Math.round((data.SELL / data.total) * 100);
                const holdPct = Math.round((data.HOLD / data.total) * 100);

                return (
                  <div key={ticker} style={{ background: 'var(--color-paper-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-ink)' }}>{ticker}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>{data.total} Reports</span>
                    </div>

                    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', margin: '10px 0 6px 0' }}>
                      <div style={{ width: `${buyPct}%`, background: 'var(--color-rise)' }} />
                      <div style={{ width: `${holdPct}%`, background: 'var(--color-brass)' }} />
                      <div style={{ width: `${sellPct}%`, background: 'var(--color-fall)' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800 }}>
                      <span style={{ color: 'var(--color-rise)' }}>BUY: {buyPct}%</span>
                      <span style={{ color: 'var(--color-brass)' }}>HOLD: {holdPct}%</span>
                      <span style={{ color: 'var(--color-fall)' }}>SELL: {sellPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Analyst Notes */}
          <div className="card-data" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem' }}>📋 Floor Analyst Research Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {brokerRecs.map(r => (
                <div key={r.id} style={{ padding: '12px 16px', background: 'var(--color-paper-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--color-ink)' }}>{r.ticker}</strong>
                      <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 900, background: r.recommendation === 'BUY' ? 'var(--color-rise)' : r.recommendation === 'SELL' ? 'var(--color-fall)' : 'var(--color-brass)', color: '#fff' }}>
                        {r.recommendation} ({r.confidence}%)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>by {r.brokerName}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>
                      {new Date(r.publishedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--color-ink-2)' }}>
                    {r.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: SENTIMENT & BREADTH */}
      {activeTab === 'SENTIMENT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-data" style={{ padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 800 }}>REAL-TIME SENTIMENT METER</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: marketSentiment.color, margin: '10px 0' }}>
              {marketSentiment.badge}
            </div>
            <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '0.85rem', color: 'var(--color-ink-2)' }}>
              Dynamically derived from ratio of advancers vs decliners ({advancers}:{decliners}), global index momentum, trade velocity, and participant debate polling.
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: IPO RADAR */}
      {activeTab === 'IPO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-data" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🚀 Primary Capital Markets & IPO Radar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ipoList.map(ipo => {
                const liveSec = securities.find(s => s.ticker === ipo.ticker) || {};
                const stage = liveSec.ipoStage || (liveSec.status === 'Active' ? 'LISTED' : 'RUMOUR');

                return (
                  <div key={ipo.ticker} style={{ background: 'var(--color-paper-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{ipo.ticker}</strong> &bull; <span>{ipo.name}</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', marginTop: '4px' }}>
                          Issue Price: {ipo.currency === 'USD' ? '$' : '₹'}{ipo.basePrice} &bull; Sector: {ipo.sector}
                        </div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--color-brass)', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>
                        STAGE: {stage}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: REGULATORY WATCH */}
      {activeTab === 'REGULATORY' && (
        <div className="card-data" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>🏛 SEBI Surveillance Orders & Active Halts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {securities.filter(s => s.status === 'Halted' || s.status === 'Bankrupt').map(s => (
              <div key={s.ticker} style={{ padding: '12px 16px', background: 'rgba(147, 25, 19, 0.08)', border: '1px solid var(--color-fall)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--color-fall)' }}>{s.ticker} &bull; {s.name}</strong>
                  <span style={{ padding: '2px 6px', borderRadius: '3px', background: 'var(--color-fall)', color: '#fff', fontWeight: 900, fontSize: '0.7rem' }}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  Order matching suspended under SEBI emergency surveillance provisions.
                </p>
              </div>
            ))}
            {securities.filter(s => s.status === 'Halted' || s.status === 'Bankrupt').length === 0 && (
              <p style={{ color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>No securities currently under surveillance halt.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: NEWS HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="card-data" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📜 Full Market News History & Chronology</h3>
            <input
              type="text"
              placeholder="Search news wire archive..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {newsEvents
              .filter(n => !historySearch || n.headline?.toLowerCase().includes(historySearch.toLowerCase()) || n.description?.toLowerCase().includes(historySearch.toLowerCase()))
              .map(n => (
                <div key={n.id} style={{ padding: '12px 16px', background: 'var(--color-paper-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-brass)', fontWeight: 800 }}>[{n.category}]</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>{new Date(n.triggeredAt).toLocaleTimeString()}</span>
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>{n.headline || n.title}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-ink-2)' }}>{n.description || n.body}</p>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
