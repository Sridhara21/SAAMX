import React from 'react';

export default function MarketTicker({ state, onOpenProfile }) {
  const securities = Object.values(state?.securities || {});
  const marketIndices = state?.marketIndices || {};

  const indicesList = [
    { key: 'GLOBAL100', name: 'GLOBAL 100', val: marketIndices.GLOBAL100?.value || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
    { key: 'INDIA50', name: 'INDIA 50', val: marketIndices.INDIA50?.value || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
    { key: 'US100', name: 'US 100', val: marketIndices.US100?.value || 8000, chg: marketIndices.US100?.changePercent || 0 },
    { key: 'UK100', name: 'UK 100', val: marketIndices.UK100?.value || 4000, chg: marketIndices.UK100?.changePercent || 0 }
  ];

  // Select top active & moving securities for ticker tape
  const featuredSecurities = [...securities]
    .filter(s => s.status !== 'UNLISTED')
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 16);

  const getCurrencySymbol = (sec) => {
    if (sec.currency === 'USD' || ['NASDAQ', 'NYSE'].includes(sec.exchange)) return '$';
    if (sec.currency === 'GBP' || sec.exchange === 'LSE') return '£';
    if (sec.currency === 'EUR' || sec.exchange === 'LuxSE') return '€';
    return '₹';
  };

  // Reusable sub-track content renderer to achieve a mathematically seamless infinite loop
  const renderTickerContent = (keyPrefix = 'track') => (
    <>
      {/* FX Telemetry Ribbon */}
      {state?.fxRates && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--color-surface, #121722)',
          padding: '2px 10px',
          borderRadius: '9999px',
          border: '1px solid var(--color-accent-border, rgba(0, 229, 255, 0.30))'
        }}>
          <span style={{ color: 'var(--color-accent, #00E5FF)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
            💱 SPOT FX:
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-ink, #F8FAFC)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            USD/INR: <strong style={{ color: 'var(--color-accent, #00E5FF)' }}>₹{(state.fxRates.USDINR?.midRate || 88.20).toFixed(2)}</strong>
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-ink, #F8FAFC)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            GBP/INR: <strong style={{ color: 'var(--color-accent, #00E5FF)' }}>₹{(state.fxRates.GBPINR?.midRate || 119.40).toFixed(2)}</strong>
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-ink, #F8FAFC)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            EUR/INR: <strong style={{ color: 'var(--color-accent, #00E5FF)' }}>₹{(state.fxRates.EURINR?.midRate || 103.50).toFixed(2)}</strong>
          </span>
        </div>
      )}

      <span style={{ color: 'var(--color-border-strong, #2D3748)', fontSize: '0.7rem' }}>•</span>

      {/* Market Indices */}
      {indicesList.map(idx => {
        const isUp = idx.chg >= 0;
        return (
          <div key={`${keyPrefix}-${idx.key}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--color-text-secondary, #94A3B8)', fontWeight: 800, fontSize: '0.72rem' }}>{idx.name}:</span>
            <span style={{
              color: 'var(--color-ink, #F8FAFC)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum" 1'
            }}>
              {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span style={{
              color: isUp ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)',
              fontWeight: 800,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {isUp ? '▲' : '▼'} {Math.abs(idx.chg).toFixed(2)}%
            </span>
          </div>
        );
      })}

      <span style={{ color: 'var(--color-border-strong, #2D3748)', fontSize: '0.7rem' }}>•</span>

      {/* Featured Securities */}
      {featuredSecurities.map((sec, index) => {
        const price = sec.currentPrice || sec.basePrice || 0;
        const openPrice = sec.openingPrice || sec.basePrice || price;
        const changePct = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;
        const isUp = changePct >= 0;
        const cur = getCurrencySymbol(sec);

        return (
          <div
            key={`${keyPrefix}-${sec.ticker || sec.id}-${index}`}
            onClick={() => onOpenProfile && onOpenProfile(sec.ticker || sec.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              cursor: onOpenProfile ? 'pointer' : 'default',
              padding: '2px 8px',
              borderRadius: '6px',
              transition: 'background-color var(--transition-fast, 0.15s ease)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, #1A2234)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ color: 'var(--color-accent, #00E5FF)', fontWeight: 800, letterSpacing: '0.04em' }}>
              {sec.ticker}
            </span>
            <span style={{
              color: 'var(--color-ink, #F8FAFC)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum" 1'
            }}>
              {cur}{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{
              color: isUp ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)',
              fontWeight: 800,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </>
  );

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-2, #161D2B)',
      borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      padding: '6px 0',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      height: '36px',
      transition: 'background-color var(--transition-smooth, 0.22s ease), border-color var(--transition-smooth, 0.22s ease)'
    }}>
      {/* Sleek Dark Pill Live Tape Badge */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'var(--color-surface, #121722)',
        borderRight: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        color: 'var(--color-accent, #00E5FF)',
        fontWeight: 800,
        fontSize: '0.68rem',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10,
        letterSpacing: '0.08em',
        boxShadow: '4px 0 12px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)'
      }}>
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-rise, #10B981)',
          boxShadow: '0 0 8px var(--color-rise, #10B981)'
        }} />
        <span>LIVE TAPE</span>
      </div>

      {/* Seamless Infinite Marquee Track with Hover Pause */}
      <div
        className="market-ticker-track"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: 'ticker-scroll 50s linear infinite',
          willChange: 'transform',
          paddingLeft: '110px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = 'paused'; }}
        onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = 'running'; }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', paddingRight: '24px' }}>
          {renderTickerContent('track-a')}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', paddingRight: '24px' }}>
          {renderTickerContent('track-b')}
        </div>
      </div>
    </div>
  );
}
