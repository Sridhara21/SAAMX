import React, { useState, useEffect } from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';

// Component for single security board cell with 800ms flash on update
function ProjectorCell({ security, denseMode }) {
  const [prevPrice, setPrevPrice] = useState(security.currentPrice);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (security.currentPrice !== prevPrice) {
      if (security.currentPrice > prevPrice) {
        setFlashClass('cell-flash-up');
      } else {
        setFlashClass('cell-flash-down');
      }
      setPrevPrice(security.currentPrice);
      const timer = setTimeout(() => setFlashClass(''), 800);
      return () => clearTimeout(timer);
    }
  }, [security.currentPrice, prevPrice]);

  const priceChange = security.currentPrice - security.basePrice;
  const priceChangePct = (priceChange / security.basePrice) * 100;
  const isUp = priceChangePct >= 0;

  return (
    <div
      className={`glass ${flashClass}`}
      style={{
        padding: denseMode ? '4px 8px' : '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        transition: 'background-color 0.8s ease',
        minHeight: '0px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 800, fontSize: denseMode ? '0.85rem' : '1rem', fontFamily: 'var(--font-mono)' }} className="font-data">
            {security.ticker}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 600 }}>
            {security.sector.substring(0, 3)}
          </span>
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: denseMode ? '75px' : '100px' }}>
          {security.name}
        </span>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
        <SplitFlapText text={`₹${security.currentPrice}`} small={denseMode} />
        <span className={`font-data ${isUp ? 'text-up' : 'text-down'}`} style={{ fontSize: denseMode ? '0.75rem' : '0.8rem', fontWeight: 700, marginTop: '2px' }}>
          {isUp ? '▲' : '▼'}{Math.abs(priceChangePct).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function ProjectorPage({ state, takeoverEvent }) {
  const [timeLeft, setTimeLeft] = useState('60:00');
  const [latestNews, setLatestNews] = useState(null);
  const [showNewsBanner, setShowNewsBanner] = useState(false);

  // Clock countdown timer logic
  useEffect(() => {
    if (state.marketState.status !== 'Open' || !state.marketState.simulationStartTime) {
      const minutesStr = String(state.marketState.simulationDurationMinutes).padStart(2, '0');
      setTimeLeft(`${minutesStr}:00`);
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - state.marketState.simulationStartTime - (state.marketState.pauseTimeOffset || 0);
      const durationMs = state.marketState.simulationDurationMinutes * 60 * 1000;
      const remainingMs = Math.max(0, durationMs - elapsedMs);

      if (remainingMs === 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.marketState.status, state.marketState.simulationStartTime, state.marketState.simulationDurationMinutes, state.marketState.pauseTimeOffset]);

  // Track triggered news events to trigger 12s slide-in banners
  useEffect(() => {
    const triggeredNews = [...state.newsEvents]
      .filter(n => n.triggeredAt)
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
    
    if (triggeredNews.length > 0) {
      const topNews = triggeredNews[0];
      if (!latestNews || latestNews.id !== topNews.id) {
        setLatestNews(topNews);
        setShowNewsBanner(true);
        const timer = setTimeout(() => {
          setShowNewsBanner(false);
        }, 12000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.newsEvents, latestNews]);

  // Filter and sort active securities alphabetically by ticker
  const activeSecurities = state.securities
    .filter(s => s.status !== 'Bankrupt' && s.status !== 'Delisted')
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  // News Column events list (last 10 events)
  const newsLog = [...state.newsEvents]
    .filter(n => n.triggeredAt)
    .sort((a, b) => b.triggeredAt - a.triggeredAt)
    .slice(0, 10);

  // Determine grid columns dynamically based on density
  const gridColumnsCount = activeSecurities.length > 60 ? 6 : activeSecurities.length > 40 ? 5 : 4;
  const denseMode = activeSecurities.length > 45;

  // Render takeover overlay
  const renderTakeoverOverlay = () => {
    if (!takeoverEvent) return null;

    const { type, ticker, name } = takeoverEvent;

    switch (type) {
      case 'OPENING_BELL':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="takeover-card bell">
              <span style={{ fontSize: '5rem' }}>🔔</span>
              <h2 className="takeover-title text-up" style={{ color: 'var(--color-rise)' }}>MARKET OPEN</h2>
              <p className="takeover-desc">The central exchange trading floor is now open. Secondary terminals active.</p>
            </div>
          </div>
        );
      case 'CLOSING_BELL':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="takeover-card">
              <span style={{ fontSize: '5rem' }}>🔕</span>
              <h2 className="takeover-title text-down" style={{ color: 'var(--color-fall)' }}>MARKET CLOSED</h2>
              <p className="takeover-desc">Simulation session finished. Transaction ledgers locked permanently.</p>
            </div>
          </div>
        );
      case 'MARKET_HALT':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="takeover-card" style={{ borderColor: 'var(--color-brass)' }}>
              <span style={{ fontSize: '5rem' }}>⚠️</span>
              <h2 className="takeover-title text-brass">CIRCUIT BREAKER ACTIVATED</h2>
              <p className="takeover-desc">
                SEBI has halted trading for security: <strong style={{ color: 'var(--color-ink)' }}>{ticker} ({name})</strong>.
              </p>
            </div>
          </div>
        );
      case 'BANKRUPTCY':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'var(--color-fall-light)' }}>
            <div className="takeover-card bankruptcy">
              <span style={{ fontSize: '5rem' }}>☠️</span>
              <h2 className="takeover-title text-down" style={{ color: 'var(--color-fall)' }}>TRADING HALTED — ASSETS LIQUIDATED</h2>
              <p className="takeover-desc">
                <strong>{ticker} ({name})</strong> has filed for insolvency. Holdings wiped.
              </p>
            </div>
          </div>
        );
      case 'IPO_LAUNCH':
        return (
          <div className="takeover-overlay" style={{ backgroundColor: 'var(--color-rise-light)' }}>
            <div className="takeover-card bell">
              <span style={{ fontSize: '5rem' }}>🚀</span>
              <h2 className="takeover-title text-up" style={{ color: 'var(--color-rise)' }}>NOW TRADING</h2>
              <p className="takeover-desc">
                IPO Listing Launched: <strong>{ticker} ({name})</strong> is now trading.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const marketStatus = state.marketState.status;

  return (
    <div className="projector-view" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-paper)' }}>
      
      {/* Session stats board header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>SESSION CLOCK</span>
          <SplitFlapText text={timeLeft} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>EXCHANGE STATUS</span>
          <SplitFlapText text={marketStatus} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>NIFTY FMS INDEX</span>
          <span className={`font-data ${state.marketState.marketIndex >= 0 ? 'text-up' : 'text-down'}`} style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>
            {state.marketState.marketIndex >= 0 ? '+' : ''}{state.marketState.marketIndex.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Breaking News Dispatch Banner */}
      <div style={{
        maxHeight: showNewsBanner && latestNews ? '60px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.4s ease-in-out',
        backgroundColor: latestNews?.sentiment === 'Positive' ? 'var(--color-rise-light)' : latestNews?.sentiment === 'Negative' ? 'var(--color-fall-light)' : 'var(--color-brass-light)',
        borderBottom: showNewsBanner && latestNews ? '1px solid var(--color-border)' : 'none'
      }}>
        {latestNews && (
          <div style={{
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.95rem'
          }}>
            <strong style={{
              color: latestNews.sentiment === 'Positive' ? 'var(--color-rise)' : latestNews.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-brass)',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              letterSpacing: '0.05em'
            }}>📢 WIRE FLASH:</strong>
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{latestNews.headline}</span>
            <span style={{ color: 'var(--color-ink-2)' }}>&mdash; {latestNews.description}</span>
          </div>
        )}
      </div>

      {/* Double Column Area: Securities Grid (75%) + Market News Column (25%) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Area: Security Grid (75%) */}
        <div style={{ width: '75%', padding: '16px', overflowY: 'auto', borderRight: '1px solid var(--color-border)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumnsCount}, 1fr)`,
            gap: '8px',
            alignContent: 'start'
          }}>
            {activeSecurities.map((s) => (
              <ProjectorCell key={s.id} security={s} denseMode={denseMode} />
            ))}
          </div>
        </div>

        {/* Right Area: Market News Column (25%) */}
        <div style={{ width: '25%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(232, 230, 223, 0.02)' }}>
            <h3 style={{ margin: 0, fontFamily: 'Fraunces, var(--font-display)', fontSize: '1.15rem', color: 'var(--color-brass)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📰 MARKET NEWS
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newsLog.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>
                No news dispatches recorded.
              </div>
            ) : (
              newsLog.map((n, idx) => {
                const isNotice = n.headline.startsWith('⚖') || n.category === 'Scandal' || n.category === 'Policy';
                const timeStr = new Date(n.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const opacity = idx === 0 ? 1.0 : Math.max(0.6, 1.0 - idx * 0.05);
                const scale = idx === 0 ? 'scale(1.02)' : 'scale(1)';

                // Border color coding
                let borderColor = 'var(--color-brass)';
                if (!isNotice) {
                  borderColor = n.sentiment === 'Positive' ? 'var(--color-rise)' : n.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-brass)';
                }

                return (
                  <div
                    key={n.id}
                    className="glass"
                    style={{
                      padding: '12px 16px',
                      borderLeft: `4px solid ${borderColor}`,
                      opacity,
                      transform: scale,
                      transition: 'all 0.4s ease',
                      backgroundColor: 'rgba(232, 230, 223, 0.01)',
                      animation: idx === 0 ? 'slideInNews 0.5s ease-out' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: borderColor }}>
                        {isNotice ? '⚖ SEBI NOTICE' : `⚡ ${timeStr}`}
                      </span>
                      {isNotice && <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-2)' }}>Ref: {n.id}</span>}
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)', lineHeight: '1.4' }}>
                      {n.headline}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-ink-2)', lineHeight: '1.4' }}>
                      {n.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {renderTakeoverOverlay()}

    </div>
  );
}
