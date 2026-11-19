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
  IconShieldAlert,
  IconHelpCircle
} from '../lib/icons.jsx';
import { DEBATE_BANK, getDebateById } from '../lib/debateBank.js';

export default function BullBearDebatePage({ state }) {
  const [selectedDebateId, setSelectedDebateId] = useState(DEBATE_BANK[0]?.id || 'DEBATE_001');
  const [scopeFilter, setScopeFilter] = useState('All');
  const [userVote, setUserVote] = useState(null);
  const [localTimer, setLocalTimer] = useState(300);

  const securities = useMemo(() => {
    const list = Object.values(state?.securities || {});
    return list.filter(s => s.status === 'Active');
  }, [state?.securities]);

  const marketIndices = state?.marketIndices || {};
  const currentDebate = useMemo(() => {
    return getDebateById(selectedDebateId) || DEBATE_BANK[0];
  }, [selectedDebateId]);

  const filteredDebates = useMemo(() => {
    if (scopeFilter === 'All') return DEBATE_BANK;
    return DEBATE_BANK.filter(d => d.scope.toUpperCase() === scopeFilter.toUpperCase());
  }, [scopeFilter]);

  // Timer countdown simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimer(prev => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Try to find matching security in state if applicable
  const matchingSecurity = useMemo(() => {
    if (!currentDebate) return null;
    const secOrSector = (currentDebate.securityOrSector || '').toUpperCase();
    return securities.find(s => 
      secOrSector.includes(s.ticker) || 
      (s.name && secOrSector.includes(s.name.toUpperCase())) ||
      (s.sector && secOrSector.includes(s.sector.toUpperCase()))
    ) || securities[0] || null;
  }, [securities, currentDebate]);

  const curPrice = matchingSecurity?.currentPrice || matchingSecurity?.basePrice || 100;
  const openPrice = matchingSecurity?.openingPrice || matchingSecurity?.basePrice || curPrice;
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
              <Badge variant="success" style={{ padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                ● 40 STRUCTURED TOPICS LIVE
              </Badge>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-brass, #845508)', letterSpacing: '0.06em', textTransform: 'none', fontWeight: 700 }}>
              Auditorium Debate Bank &bull; Multi-Asset Thesis &bull; India vs Global Macro &bull; "Experience the market, don't just plan it."
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
              DEBATE CLOCK
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

      {/* 3. TOPIC SELECTION CONTROL BAR */}
      <Card variant="elevated" style={{
        backgroundColor: 'var(--color-surface, #0F172A)',
        border: '1.5px solid var(--color-border, #334155)',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-brass, #845508)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SELECT DEBATE TOPIC ({DEBATE_BANK.length} IN BANK):
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'India', 'Global'].map(sc => (
              <button
                key={sc}
                onClick={() => setScopeFilter(sc)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: scopeFilter === sc ? 'var(--color-brass, #845508)' : 'transparent',
                  borderColor: scopeFilter === sc ? 'var(--color-brass, #845508)' : '#334155',
                  color: scopeFilter === sc ? '#FFFFFF' : 'var(--color-ink-muted, #94A3B8)'
                }}
              >
                {sc === 'All' ? `All (${DEBATE_BANK.length})` : sc === 'India' ? `India (21)` : `Global (19)`}
              </button>
            ))}
          </div>
        </div>

        <select
          value={selectedDebateId}
          onChange={e => {
            setSelectedDebateId(e.target.value);
            setUserVote(null);
          }}
          style={{
            minWidth: '320px',
            maxWidth: '520px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid var(--color-border, #475569)',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: 'var(--color-surface-sunken, #1E293B)',
            color: 'var(--color-ink, #FAF8F5)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {filteredDebates.map(d => (
            <option key={d.id} value={d.id}>
              [{d.id}] [{d.scope}] {d.category}: {d.topic.slice(0, 65)}...
            </option>
          ))}
        </select>
      </Card>

      {/* 4. Active Debate Header & Moderator Question */}
      <Card variant="elevated" style={{
        backgroundColor: 'var(--color-surface, #0F172A)',
        border: '2px solid var(--color-brass, #845508)',
        borderRadius: '12px',
        padding: '20px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 18px rgba(132, 85, 8, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: currentDebate.scope === 'INDIA' ? '#065F3E' : '#4F46E5',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.72rem',
                letterSpacing: '0.5px'
              }}>
                {currentDebate.scope} &bull; {currentDebate.category}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-brass, #845508)', fontWeight: 800 }}>
                TARGET: {currentDebate.securityOrSector}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-ink, #FAF8F5)', lineHeight: 1.3 }}>
              {currentDebate.topic}
            </h2>
          </div>

          {/* Voting Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setUserVote('BULL')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: userVote === 'BULL' ? 'var(--color-rise, #065F3E)' : 'rgba(6, 95, 62, 0.15)',
                border: '1.5px solid var(--color-rise, #065F3E)',
                color: userVote === 'BULL' ? '#FFFFFF' : 'var(--color-rise, #065F3E)',
                fontSize: '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <IconTrendingUp size={16} /> Bullish Stance
            </button>
            <button
              onClick={() => setUserVote('BEAR')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: userVote === 'BEAR' ? 'var(--color-fall, #931913)' : 'rgba(147, 25, 19, 0.15)',
                border: '1.5px solid var(--color-fall, #931913)',
                color: userVote === 'BEAR' ? '#FFFFFF' : 'var(--color-fall, #931913)',
                fontSize: '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <IconTrendingDown size={16} /> Bearish Stance
            </button>
            {userVote && (
              <Badge variant={userVote === 'BULL' ? 'success' : 'danger'} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 900 }}>
                <IconCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> VOTED {userVote}
              </Badge>
            )}
          </div>
        </div>

        {/* Highlighted Moderator Question */}
        <div style={{
          background: 'rgba(132, 85, 8, 0.12)',
          borderLeft: '4px solid var(--color-brass, #845508)',
          borderRadius: '6px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <IconHelpCircle size={22} color="var(--color-brass, #845508)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-brass, #845508)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              MODERATOR'S CORE DELIBERATION QUESTION FOR DELEGATES:
            </span>
            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink, #FAF8F5)', fontStyle: 'italic', lineHeight: 1.4 }}>
              {currentDebate.moderatorQuestion}
            </p>
          </div>
        </div>
      </Card>

      {/* 5. ARENA SPLIT: BULL CASE vs. BEAR CASE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', flex: 1 }}>

        {/* BULL CORNER */}
        <Card variant="elevated" style={{
          backgroundColor: 'var(--color-surface, #0F172A)',
          border: '2px solid var(--color-rise, #065F3E)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(6, 95, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(6, 95, 62, 0.3)', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
              <IconTrendingUp size={22} color="var(--color-rise, #065F3E)" />
              THE BULL THESIS & CATALYSTS
            </h2>
            <Badge variant="success" style={{ fontWeight: 800 }}>UPSIDE STANCE</Badge>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-rise, #065F3E)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              PRIMARY ARGUMENT:
            </span>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-ink, #FAF8F5)', lineHeight: 1.5, fontWeight: 600 }}>
              {currentDebate.bullArgument}
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-sunken, #1E293B)', borderRadius: '8px', padding: '14px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              SUPPORTING EMPIRICAL EVIDENCE:
            </span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted, #CBD5E1)', lineHeight: 1.4 }}>
              {currentDebate.supportingEvidence}
            </p>
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
          gap: '16px',
          boxShadow: '0 8px 24px rgba(147, 25, 19, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(147, 25, 19, 0.3)', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
              <IconTrendingDown size={22} color="var(--color-fall, #931913)" />
              THE BEAR THESIS & SKEPTICISM
            </h2>
            <Badge variant="danger" style={{ fontWeight: 800 }}>DOWNSIDE STANCE</Badge>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-fall, #931913)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              PRIMARY ARGUMENT:
            </span>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-ink, #FAF8F5)', lineHeight: 1.5, fontWeight: 600 }}>
              {currentDebate.bearArgument}
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-sunken, #1E293B)', borderRadius: '8px', padding: '14px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#F87171', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              KEY STRUCTURAL RISK:
            </span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted, #CBD5E1)', lineHeight: 1.4 }}>
              {currentDebate.keyRisk}
            </p>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-brass, #845508)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                BULL COUNTERARGUMENT:
              </span>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-ink-muted, #94A3B8)', fontStyle: 'italic' }}>
                "{currentDebate.counterargument}"
              </p>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
