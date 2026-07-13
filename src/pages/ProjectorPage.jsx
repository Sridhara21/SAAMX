import React, { useState, useEffect } from 'react';

// Simplified component displaying only ticker and price with transition flash indicator
function ProjectorCell({ security }) {
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
      const timer = setTimeout(() => setFlashClass(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [security.currentPrice, prevPrice]);

  return (
    <div
      className={`glass ${flashClass}`}
      style={{
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        transition: 'background-color 1s ease, border-color 0.3s ease',
        minHeight: '0px',
        boxSizing: 'border-box',
        borderRadius: '4px'
      }}
    >
      <span style={{ fontWeight: 900, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
        {security.ticker}
      </span>
      <span style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--color-brass)' }}>
        ₹{security.currentPrice}
      </span>
    </div>
  );
}

// Scrolling Ticker tape component (NSE/BSE style)
function ScrollingTicker({ securities }) {
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#111',
      color: '#fff',
      borderBottom: '2px solid var(--color-brass)',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      height: '38px',
      position: 'relative'
    }}>
      <div style={{
        backgroundColor: 'var(--color-brass)',
        color: '#fff',
        padding: '0 14px',
        fontWeight: '900',
        fontSize: '0.85rem',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'var(--font-display)',
        boxShadow: '4px 0 8px rgba(0,0,0,0.5)',
        textTransform: 'uppercase'
      }}>
        NSE / BSE LIVE
      </div>
      <div className="ticker-scroll" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '32px',
        paddingLeft: '20px',
        animation: 'marquee 90s linear infinite'
      }}>
        {/* Render twice for seamless looping */}
        {[...securities, ...securities].map((sec, idx) => {
          const priceChange = sec.currentPrice - sec.basePrice;
          const priceChangePct = (priceChange / sec.basePrice) * 100;
          const isUp = priceChangePct >= 0;

          return (
            <span key={`${sec.id}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <span style={{ color: 'var(--color-brass)' }}>{sec.ticker}</span>
              <span>₹{sec.currentPrice}</span>
              <span style={{ color: isUp ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {isUp ? '▲' : '▼'}{Math.abs(priceChangePct).toFixed(1)}%
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

  // News Column events list (last 12 events to perfectly fill 25% height)
  const newsLog = [...state.newsEvents]
    .filter(n => n.triggeredAt)
    .sort((a, b) => b.triggeredAt - a.triggeredAt)
    .slice(0, 12);

  // We want to fit exactly into a single page with NO scrolling.
  // 10 columns fits 100 securities exactly in a 10x10 grid matrix.
  const gridColumnsCount = 10;

  // Render takeover overlay
  const renderTakeoverOverlay = () => {
    if (!takeoverEvent) return null;

    const { type } = takeoverEvent;

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
              <p className="takeover-desc">Trading has concluded for the current session. Financial books have been frozen.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const marketStatus = state.marketState.status === 'Open' ? 'TRADING ACTIVE' : 'MARKET CLOSED';

  return (
    <div className="projector-view" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-paper)' }}>
      
      {/* 1. Scrolling Ticker tape header */}
      <ScrollingTicker securities={state.securities} />

      {/* 2. Session stats board header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'center',
        padding: '8px 24px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        minHeight: '52px'
      }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>SESSION CLOCK</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>{timeLeft}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>EXCHANGE STATUS</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: state.marketState.status === 'Open' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{marketStatus}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>NIFTY FMS INDEX</span>
          <span className={`font-data ${state.marketState.marketIndex >= 0 ? 'text-up' : 'text-down'}`} style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>
            {state.marketState.marketIndex >= 0 ? '+' : ''}{state.marketState.marketIndex.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Breaking News Banner */}
      <div style={{
        maxHeight: showNewsBanner && latestNews ? '40px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.4s ease-in-out',
        backgroundColor: latestNews?.sentiment === 'Positive' ? 'var(--color-rise-light)' : latestNews?.sentiment === 'Negative' ? 'var(--color-fall-light)' : 'var(--color-brass-light)',
        borderBottom: showNewsBanner && latestNews ? '1px solid var(--color-border)' : 'none'
      }}>
        {latestNews && (
          <div style={{
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.85rem'
          }}>
            <strong style={{
              color: latestNews.sentiment === 'Positive' ? 'var(--color-rise)' : latestNews.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-brass)',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.05em'
            }}>📢 WIRE FLASH:</strong>
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{latestNews.headline}</span>
            <span style={{ color: 'var(--color-ink-2)' }}>&mdash; {latestNews.description}</span>
          </div>
        )}
      </div>

      {/* Main Split Layout: 75% Securities Grid + 25% News Column */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', boxSizing: 'border-box' }}>
        
        {/* Left Area: Security Grid (75% width) */}
        <div style={{
          width: '75%',
          padding: '8px',
          overflow: 'hidden',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumnsCount}, 1fr)`,
            gridAutoRows: '1fr',
            gap: '4px',
            height: '100%',
            boxSizing: 'border-box'
          }}>
            {activeSecurities.map((s) => (
              <ProjectorCell key={s.id} security={s} />
            ))}
          </div>
        </div>

        {/* Right Area: Market News Column (25% width) */}
        <div style={{
          width: '25%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'rgba(232, 230, 223, 0.02)'
          }}>
            <h3 style={{ margin: 0, fontFamily: 'Fraunces, var(--font-display)', fontSize: '0.9rem', color: 'var(--color-brass)', letterSpacing: '0.05em' }}>
              📰 MARKET NEWS FEED
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'hidden', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {newsLog.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-ink-2)', fontSize: '0.8rem' }}>
                No news dispatches recorded.
              </div>
            ) : (
              newsLog.map((n, idx) => {
                const isNotice = n.headline.startsWith('⚖') || n.category === 'Scandal' || n.category === 'Policy';
                const timeStr = new Date(n.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const opacity = idx === 0 ? 1.0 : Math.max(0.6, 1.0 - idx * 0.05);

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
                      padding: '8px 10px',
                      borderLeft: `4px solid ${borderColor}`,
                      opacity,
                      backgroundColor: 'rgba(232, 230, 223, 0.01)',
                      animation: idx === 0 ? 'slideInNews 0.5s ease-out' : 'none',
                      flexShrink: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: borderColor }}>
                        {isNotice ? '⚖ SEBI NOTICE' : `⚡ ${timeStr}`}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-ink)', lineHeight: '1.3' }}>
                      {n.headline}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-ink-2)', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
