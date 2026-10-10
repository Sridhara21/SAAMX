import React, { useState, useMemo } from 'react';

export default function BullBearDebatePage({ state }) {
  const [selectedTicker, setSelectedTicker] = useState('INFY');
  
  const securities = useMemo(() => Object.values(state?.securities || {}), [state?.securities]);
  const marketIndices = state?.marketIndices || {};
  const newsEvents = useMemo(() => Object.values(state?.newsEvents || []).filter(n => n.triggeredAt).sort((a, b) => b.triggeredAt - a.triggeredAt), [state?.newsEvents]);

  const selectedSecurity = useMemo(() => {
    return securities.find(s => s.ticker === selectedTicker) || securities[0] || null;
  }, [securities, selectedTicker]);

  const curPrice = selectedSecurity?.currentPrice || selectedSecurity?.basePrice || 100;
  const openPrice = selectedSecurity?.openingPrice || selectedSecurity?.basePrice || curPrice;
  const pctChange = openPrice > 0 ? ((curPrice - openPrice) / openPrice) * 100 : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F3',
      color: '#1E232B',
      padding: '24px 36px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #845508',
        paddingBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #065F3E, #931913)',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '1.2rem',
            padding: '6px 14px',
            borderRadius: '6px',
            fontFamily: 'Cinzel, serif',
            letterSpacing: '1px'
          }}>
            SAAMX ARENA
          </div>
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', margin: 0, color: '#1E232B', fontWeight: 900 }}>
              BULL VS. BEAR &bull; MARKET DEBATE SCREEN
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#845508', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 800 }}>
              "Experience the Market. Don’t Just Learn It." &bull; THESIS VS. ANTITHESIS
            </span>
          </div>
        </div>

        {/* Quick Back Navigation */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="#/bull" className="btn btn-secondary" style={{ color: '#065F3E', fontWeight: 800 }}>🐂 Bull Terminal</a>
          <a href="#/bear" className="btn btn-secondary" style={{ color: '#931913', fontWeight: 800 }}>🐻 Bear Terminal</a>
        </div>
      </div>

      {/* Indices Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'SAAMX GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
          { label: 'SAAMX INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
          { label: 'SAAMX US 100', val: marketIndices.US100?.currentValue || 8000, chg: marketIndices.US100?.changePercent || 0 },
          { label: 'SAAMX UK 100', val: marketIndices.UK100?.currentValue || 4000, chg: marketIndices.UK100?.changePercent || 0 }
        ].map((idx, i) => (
          <div key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2DBD0', borderRadius: '8px', padding: '10px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B6863', display: 'block' }}>{idx.label}</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', color: '#1E232B' }}>
              {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: idx.chg >= 0 ? '#065F3E' : '#931913' }}>
              {idx.chg >= 0 ? '▲ +' : '▼ '}{Math.abs(idx.chg).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Active Debate Round & Common Facts Pack */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #845508',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#845508', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
              ROUND {state?.bullBearDebate?.activeRound || 1}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1E232B' }}>
              Topic: {state?.bullBearDebate?.topic || 'AI Megacap Valuations vs Debt Sustainability'}
            </h3>
          </div>
          <span style={{ background: state?.bullBearDebate?.status === 'ACTIVE' ? '#065F3E' : '#854D0E', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem' }}>
            ● {state?.bullBearDebate?.status || 'ACTIVE DEBATE'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#6B6863', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            ESTABLISHED COMMON FACTS PACK (AUDITORIUM FOUNDATION):
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {(state?.bullBearDebate?.commonFacts || [
              'Global hyperscaler capex grew 48% YoY in current fiscal year.',
              'Aggregate corporate debt refinancing obligations reach 5-year highs this quarter.',
              'Benchmark 10-year sovereign yields sit at 4.25% with sticky core inflation metrics.'
            ]).map((fact, idx) => (
              <div key={idx} style={{ background: '#FAF8F3', border: '1px solid #E2DBD0', borderRadius: '6px', padding: '8px 12px', fontSize: '0.78rem', color: '#4A5568' }}>
                <strong style={{ color: '#845508' }}>Fact #{idx + 1}:</strong> {fact}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Centerpiece: Asset Spotlight & Ticker Selector */}
      {selectedSecurity && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #845508',
          borderRadius: '12px',
          padding: '20px 28px',
          boxShadow: '0 4px 18px rgba(132, 85, 8, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{ backgroundColor: '#845508', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                SPOTLIGHT ASSET
              </span>
              <select
                value={selectedTicker}
                onChange={e => setSelectedTicker(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2DBD0', fontSize: '0.9rem', fontWeight: 800, backgroundColor: '#FAF8F3' }}
              >
                {securities.slice(0, 30).map(s => (
                  <option key={s.ticker} value={s.ticker}>{s.ticker} &mdash; {s.name}</option>
                ))}
              </select>
            </div>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.8rem', color: '#1E232B', margin: 0 }}>
              {selectedSecurity.name} ({selectedSecurity.ticker})
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#6B6863' }}>Sector: {selectedSecurity.sector || 'Equities'} &bull; Exchange: {selectedSecurity.exchange || 'NSE'}</span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'monospace', color: '#1E232B' }}>
              ₹{curPrice}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: pctChange >= 0 ? '#065F3E' : '#931913' }}>
              {pctChange >= 0 ? '▲ +' : '▼ '}{Math.abs(pctChange).toFixed(2)}% Intraday
            </div>
          </div>
        </div>
      )}

      {/* Arena Split: BULL CASE vs. BEAR CASE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
        
        {/* BULL CORNER */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid #065F3E',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(6, 95, 62, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid rgba(6, 95, 62, 0.2)', paddingBottom: '10px' }}>
            <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: '#065F3E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🐂</span> BULL ARGUMENTS & CATALYSTS
            </h2>
            <span style={{ backgroundColor: '#065F3E', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 900 }}>
              GROWTH THESIS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem', lineHeight: 1.5, color: '#1E232B' }}>
            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #065F3E' }}>
              <strong>1. Strong Demand & Institutional Order Flow:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                Floor trade velocity reflects aggressive long accumulation from top-performing teams. High liquidity depth protects price floors.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #065F3E' }}>
              <strong>2. Sector Outperformance & Macro Tailwind:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                {selectedSecurity?.sector || 'Technology'} constituents are benefiting from positive global headline momentum and multi-currency capital inflows.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #065F3E' }}>
              <strong>3. Favorable Risk/Reward Horizon:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                Upside potential outweighs intraday pullbacks. Positioning early ahead of closing session reconciliation maximizes tournament ROI.
              </p>
            </div>
          </div>
        </div>

        {/* BEAR CORNER */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid #931913',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(147, 25, 19, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid rgba(147, 25, 19, 0.2)', paddingBottom: '10px' }}>
            <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: '#931913', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🐻</span> BEAR ARGUMENTS & RISKS
            </h2>
            <span style={{ backgroundColor: '#931913', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 900 }}>
              DOWNSIDE ANTITHESIS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem', lineHeight: 1.5, color: '#1E232B' }}>
            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #931913' }}>
              <strong>1. Overextended Valuations & Bubble Risk:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                Asset has experienced rapid intraday inflation without fundamental earnings expansion. Reversion to mean price is imminent upon institutional profit taking.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #931913' }}>
              <strong>2. Volatility & Circuit Breaker Exposure:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                High-beta order clusters expose holding teams to sudden SEBI circuit breaker suspensions and liquidity locks.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.05)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #931913' }}>
              <strong>3. Foreign Exchange & Concentration Drag:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#4A5568' }}>
                Foreign asset holdings face currency conversion friction and spread drag upon final tournament portfolio reconciliation.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
