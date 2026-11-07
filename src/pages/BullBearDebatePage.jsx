import React, { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Button } from '../components/ui/index.js';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconClock,
  IconSettings,
  IconCheck,
  IconFileText,
  IconActivity,
  IconScale,
  IconBuilding,
  IconZap,
  IconShieldAlert
} from '../lib/icons.jsx';

export default function BullBearDebatePage({ state }) {
  const [selectedTicker, setSelectedTicker] = useState('INFY');
  const [userVote, setUserVote] = useState(null);
  const [localTimer, setLocalTimer] = useState(300);

  const securities = useMemo(() => {
    const list = Object.values(state?.securities || {});
    return list.filter(s => s.status === 'Active');
  }, [state?.securities]);

  const marketIndices = state?.marketIndices || {};
  const debateState = state?.bullBearDebate || {
    activeRound: 1,
    topic: 'Global Tech Equity Valuations & AI Monetization Models',
    status: 'ACTIVE DEBATE',
    timerSeconds: 300
  };

  // Timer countdown simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimer(prev => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedSecurity = useMemo(() => {
    return securities.find(s => s.ticker === selectedTicker) || securities[0] || null;
  }, [securities, selectedTicker]);

  const curPrice = selectedSecurity?.currentPrice || selectedSecurity?.basePrice || 100;
  const openPrice = selectedSecurity?.openingPrice || selectedSecurity?.basePrice || curPrice;
  const pctChange = openPrice > 0 ? ((curPrice - openPrice) / openPrice) * 100 : 0;

  const timerMin = Math.floor(localTimer / 60);
  const timerSec = String(localTimer % 60).padStart(2, '0');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg, #070A0F)',
      color: 'var(--color-ink, #EDE7DB)',
      padding: '24px 32px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: "var(--font-body, 'Inter', system-ui, sans-serif)"
    }}>

      {/* 1. Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--color-border, rgba(132, 85, 8, 0.25))',
        paddingBottom: '18px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-rise, #065F3E) 0%, var(--color-brass, #845508) 50%, var(--color-fall, #931913) 100%)',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '1.25rem',
            padding: '8px 16px',
            borderRadius: '8px',
            letterSpacing: '1px',
            fontFamily: "var(--font-display, 'Cinzel', serif)",
            boxShadow: '0 4px 14px rgba(132, 85, 8, 0.2)'
          }}>
            SAAMX ARENA
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontSize: '1.85rem',
                margin: 0,
                color: 'var(--color-ink, #FAF8F5)',
                fontWeight: 900,
                letterSpacing: '0.5px',
                fontFamily: "var(--font-display, 'Cinzel', serif)",
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <IconScale size={26} color="var(--color-brass, #845508)" />
                BULL VS. BEAR &bull; AUDITORIUM DEBATE SCREEN
              </h1>
              <Badge
                variant={debateState.status === 'ACTIVE' || debateState.status === 'ACTIVE DEBATE' ? 'success' : 'warning'}
                style={{ padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}
              >
                ● {debateState.status || 'ACTIVE DEBATE'}
              </Badge>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-brass, #845508)', letterSpacing: '0.06em', textTransform: 'none', fontWeight: 700 }}>
              Bull vs Bear Debate Arena &bull; Debate Timer &bull; Bull Stance &amp; Bear Stance &bull; "Experience the market, don't just plan it."
            </span>
          </div>
        </div>

        {/* Quick Navigation & Round Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--color-surface, #0F172A)',
            border: '1px solid var(--color-border, rgba(132, 85, 8, 0.3))',
            borderRadius: '8px',
            padding: '6px 14px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-muted, #94A3B8)', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              ROUND TIMER
            </span>
            <div className="font-mono tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <IconClock size={16} /> {timerMin}:{timerSec}
            </div>
          </div>
          <a
            href="#/bull"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'rgba(6, 95, 62, 0.15)',
              border: '1px solid var(--color-rise, #065F3E)',
              color: 'var(--color-rise, #065F3E)',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconTrendingUp size={16} /> Bull Terminal →
          </a>
          <a
            href="#/bear"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'rgba(147, 25, 19, 0.15)',
              border: '1px solid var(--color-fall, #931913)',
              color: 'var(--color-fall, #931913)',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconTrendingDown size={16} /> Bear Terminal →
          </a>
          <a
            href="#/admin"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--color-surface-sunken, #1E293B)',
              border: '1px solid var(--color-border, #334155)',
              color: 'var(--color-ink-muted, #CBD5E1)',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconSettings size={16} /> Admin Control
          </a>
        </div>
      </div>

      {/* 2. Global Indices Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {[
          { label: 'SAAMX GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
          { label: 'SAAMX INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
          { label: 'SAAMX US 100', val: marketIndices.US100?.currentValue || 8000, chg: marketIndices.US100?.changePercent || 0 },
          { label: 'SAAMX UK 100', val: marketIndices.UK100?.currentValue || 4000, chg: marketIndices.UK100?.changePercent || 0 }
        ].map((idx, i) => (
          <Card key={i} variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #0F172A)',
            border: '1px solid var(--color-border, #334155)',
            borderRadius: '8px',
            padding: '12px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-ink-muted, #94A3B8)', display: 'block', textTransform: 'uppercase' }}>
              {idx.label}
            </span>
            <div className="font-mono tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-ink, #FAF8F5)', margin: '4px 0' }}>
              {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="font-mono tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 900, color: idx.chg >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)' }}>
              {idx.chg >= 0 ? '▲ +' : '▼ '}{Math.abs(idx.chg).toFixed(2)}%
            </span>
          </Card>
        ))}
      </div>

      {/* 3. Active Debate Topic & Common Facts Pack */}
      <Card variant="elevated" style={{
        backgroundColor: 'var(--color-surface, #0F172A)',
        border: '1.5px solid var(--color-brass, rgba(132, 85, 8, 0.35))',
        borderRadius: '12px',
        padding: '18px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: 'var(--color-brass, #845508)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '4px',
              fontWeight: 900,
              fontSize: '0.75rem',
              letterSpacing: '0.5px'
            }}>
              ROUND {debateState.activeRound || 1}
            </span>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-ink, #FAF8F5)' }}>
              Topic: {debateState.topic || 'Global Tech Equity Valuations & AI Monetization Models'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted, #94A3B8)' }}>Floor Stance:</span>
            <button
              onClick={() => setUserVote('BULL')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: userVote === 'BULL' ? 'var(--color-rise, #065F3E)' : 'rgba(6, 95, 62, 0.15)',
                border: '1px solid var(--color-rise, #065F3E)',
                color: userVote === 'BULL' ? '#FFFFFF' : 'var(--color-rise, #065F3E)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <IconTrendingUp size={14} /> Vote Bull
            </button>
            <button
              onClick={() => setUserVote('BEAR')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: userVote === 'BEAR' ? 'var(--color-fall, #931913)' : 'rgba(147, 25, 19, 0.15)',
                border: '1px solid var(--color-fall, #931913)',
                color: userVote === 'BEAR' ? '#FFFFFF' : 'var(--color-fall, #931913)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <IconTrendingDown size={14} /> Vote Bear
            </button>
            {userVote && (
              <span style={{ fontSize: '0.75rem', color: '#38BDF8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconCheck size={14} /> Voted {userVote}
              </span>
            )}
          </div>
        </div>

        <div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 900,
            color: 'var(--color-brass, #845508)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '6px',
            letterSpacing: '0.04em'
          }}>
            ESTABLISHED COMMON FACTS PACK (AUDITORIUM FOUNDATION):
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {(debateState.commonFacts || [
              'Global hyperscaler capex grew 48% YoY in current fiscal year.',
              'Aggregate corporate debt refinancing obligations reach 5-year highs this quarter.',
              'Benchmark 10-year sovereign yields sit at 4.25% with sticky core inflation metrics.'
            ]).map((fact, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--color-surface-sunken, #1E293B)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--color-ink-muted, #CBD5E1)',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <IconFileText size={16} color="var(--color-brass, #845508)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-brass, #845508)' }}>Fact #{idx + 1}:</strong> {fact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. Asset Spotlight & Ticker Selector */}
      {selectedSecurity && (
        <Card variant="elevated" style={{
          backgroundColor: 'var(--color-surface, #0F172A)',
          border: '1px solid var(--color-border, rgba(132, 85, 8, 0.4))',
          borderRadius: '12px',
          padding: '18px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: 'var(--color-brass, #845508)',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.5px'
              }}>
                SPOTLIGHT ASSET
              </span>
              <select
                value={selectedTicker}
                onChange={e => setSelectedTicker(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #334155)',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  backgroundColor: 'var(--color-surface-sunken, #1E293B)',
                  color: 'var(--color-ink, #FAF8F5)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {securities.slice(0, 50).map(s => (
                  <option key={s.ticker} value={s.ticker}>{s.ticker} &mdash; {s.name} ({s.sector || 'Equities'})</option>
                ))}
              </select>
            </div>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--color-ink, #FAF8F5)', margin: 0, fontWeight: 900 }}>
              {selectedSecurity.name} ({selectedSecurity.ticker})
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-ink-muted, #94A3B8)' }}>
              Sector: {selectedSecurity.sector || 'Equities'} &bull; Exchange: {selectedSecurity.exchange || 'NSE'} &bull; Base Currency: {selectedSecurity.currency || 'INR'}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="font-mono tabular-nums" style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--color-ink, #FAF8F5)' }}>
              ₹{curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="font-mono tabular-nums" style={{ fontSize: '1rem', fontWeight: 900, color: pctChange >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)' }}>
              {pctChange >= 0 ? '▲ +' : '▼ '}{Math.abs(pctChange).toFixed(2)}% Intraday
            </div>
          </div>
        </Card>
      )}

      {/* 5. Arena Split: BULL CASE vs. BEAR CASE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', flex: 1 }}>

        {/* BULL CORNER */}
        <Card variant="elevated" style={{
          backgroundColor: 'var(--color-surface, #0F172A)',
          border: '2px solid var(--color-rise, #065F3E)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(6, 95, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(6, 95, 62, 0.3)', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
              <IconTrendingUp size={22} color="var(--color-rise, #065F3E)" />
              BULL ARGUMENTS & CATALYSTS
            </h2>
            <Badge variant="success" style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 900 }}>
              GROWTH THESIS
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-ink, #E2E8F0)' }}>
            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-rise, #065F3E)' }}>
              <strong style={{ color: 'var(--color-rise, #065F3E)' }}>1. Strong Demand & Institutional Order Flow:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                Floor trade velocity reflects sustained long accumulation from top collegiate investment houses. High liquidity depth provides a solid floor against short-term pullbacks.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-rise, #065F3E)' }}>
              <strong style={{ color: 'var(--color-rise, #065F3E)' }}>2. Sector Outperformance & Macro Tailwind:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                {selectedSecurity?.sector || 'Technology'} constituents are capitalizing on structural global tailwinds, favorable currency exchange rates, and accelerating capital deployment.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-rise, #065F3E)' }}>
              <strong style={{ color: 'var(--color-rise, #065F3E)' }}>3. Asymmetric Risk/Reward Upside:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                Long exposures offer superior expected value leading into official closing reconciliation. Capitalizing on intraday momentum positions funds for tournament championship honors.
              </p>
            </div>
          </div>
        </Card>

        {/* BEAR CORNER */}
        <Card variant="elevated" style={{
          backgroundColor: 'var(--color-surface, #0F172A)',
          border: '2px solid var(--color-fall, #931913)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(147, 25, 19, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(147, 25, 19, 0.3)', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
              <IconTrendingDown size={22} color="var(--color-fall, #931913)" />
              BEAR ARGUMENTS & RISKS
            </h2>
            <Badge variant="destructive" style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 900 }}>
              DOWNSIDE ANTITHESIS
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-ink, #E2E8F0)' }}>
            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-fall, #931913)' }}>
              <strong style={{ color: 'var(--color-fall, #931913)' }}>1. Overextended Valuations & Bubble Risk:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                Asset has experienced rapid intraday inflation without fundamental corporate earnings justification. Reversion to fundamental mean is imminent once institutional profit-taking initiates.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-fall, #931913)' }}>
              <strong style={{ color: 'var(--color-fall, #931913)' }}>2. Volatility & Circuit Breaker Vulnerability:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                High-beta order clusters expose holding houses to abrupt SEBI circuit limits, freezing exit liquidity and creating immediate portfolio drawdown penalties.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.08)', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid var(--color-fall, #931913)' }}>
              <strong style={{ color: 'var(--color-fall, #931913)' }}>3. Foreign Exchange Friction & Concentration Drag:</strong>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-ink-muted, #CBD5E1)' }}>
                Unhedged cross-border holdings face FX spread drag upon final 15:30 closing valuation freeze, eroding nominal paper gains during certified judge auditing.
              </p>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
