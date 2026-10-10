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

  return (
    <div style={{
      backgroundColor: '#1A1E26',
      borderBottom: '1px solid #2C323F',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      padding: '7px 0',
      display: 'flex',
      alignItems: 'center',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#845508',
        color: '#FFFFFF',
        fontWeight: 900,
        fontSize: '0.68rem',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 5,
        letterSpacing: '0.08em',
        boxShadow: '2px 0 6px rgba(0,0,0,0.3)'
      }}>
        LIVE TAPE
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '24px',
        paddingLeft: '100px',
        animation: 'ticker-scroll 45s linear infinite'
      }}>
        {/* FX Telemetry Ribbon */}
        {state?.fxRates && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', background: 'rgba(132, 85, 8, 0.25)', padding: '2px 10px', borderRadius: '4px', border: '1px solid rgba(132, 85, 8, 0.5)' }}>
            <span style={{ color: 'var(--gold-royal)', fontWeight: 900, fontSize: '0.74rem' }}>💱 SPOT FX:</span>
            <span style={{ fontSize: '0.76rem', color: '#fff', fontFamily: 'monospace' }}>
              USD/INR: <strong>₹{(state.fxRates.USDINR?.midRate || 88.20).toFixed(2)}</strong>
            </span>
            <span style={{ fontSize: '0.76rem', color: '#fff', fontFamily: 'monospace' }}>
              GBP/INR: <strong>₹{(state.fxRates.GBPINR?.midRate || 119.40).toFixed(2)}</strong>
            </span>
            <span style={{ fontSize: '0.76rem', color: '#fff', fontFamily: 'monospace' }}>
              EUR/INR: <strong>₹{(state.fxRates.EURINR?.midRate || 103.50).toFixed(2)}</strong>
            </span>
          </div>
        )}

        <span style={{ color: '#454C5B' }}>•</span>

        {/* Market Indices */}
        {indicesList.map(idx => {
          const isUp = idx.chg >= 0;
          return (
            <div key={idx.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <span style={{ color: '#E0D9CB', fontWeight: 800 }}>{idx.name}:</span>
              <span className="font-data" style={{ color: '#FFFFFF', fontWeight: 700 }}>
                {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="font-data" style={{
                color: isUp ? '#10B981' : '#EF4444',
                fontWeight: 800,
                fontSize: '0.74rem'
              }}>
                {isUp ? '▲' : '▼'} {Math.abs(idx.chg).toFixed(2)}%
              </span>
            </div>
          );
        })}

        <span style={{ color: '#454C5B' }}>•</span>

        {/* Featured Securities */}
        {featuredSecurities.map(sec => {
          const price = sec.currentPrice || sec.basePrice || 0;
          const openPrice = sec.openingPrice || sec.basePrice || price;
          const changePct = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;
          const isUp = changePct >= 0;
          const cur = getCurrencySymbol(sec);

          return (
            <div
              key={sec.ticker || sec.id}
              onClick={() => onOpenProfile && onOpenProfile(sec.ticker || sec.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                cursor: onOpenProfile ? 'pointer' : 'default',
                padding: '2px 6px',
                borderRadius: '4px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ color: '#D4AF37', fontWeight: 800 }}>{sec.ticker}</span>
              <span className="font-data" style={{ color: '#FFFFFF', fontWeight: 600 }}>
                {cur}{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="font-data" style={{
                color: isUp ? '#10B981' : '#EF4444',
                fontWeight: 800,
                fontSize: '0.74rem'
              }}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
