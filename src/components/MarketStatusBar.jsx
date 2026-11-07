import React from 'react';
import { calculateMarketClock } from '../lib/api.js';

export default function MarketStatusBar({ state, serverTimeOffset = 0, connected = true, coordinator = null, isCoordinatorOffline = false }) {
  const marketState = state?.marketState || {};
  const clock = calculateMarketClock(marketState, serverTimeOffset);
  const teamsCount = Object.keys(state?.teams || {}).length || 20;
  const sessionId = marketState.sessionId || 'SAAMX-2026-LIVE';
  const mode = marketState.mode || 'DEMO';
  const status = marketState.status || 'NotStarted';

  let statusBg = 'var(--color-accent-light, rgba(0, 229, 255, 0.12))';
  let statusColor = 'var(--color-accent, #00E5FF)';
  let statusBorder = '1px solid var(--color-accent-border, rgba(0, 229, 255, 0.30))';
  let statusText = clock.sessionState.replace(/_/g, ' ');

  if (status === 'Open' || clock.sessionState === 'CONTINUOUS_TRADING') {
    statusBg = 'var(--color-rise-light, rgba(16, 185, 129, 0.14))';
    statusColor = 'var(--color-rise, #10B981)';
    statusBorder = '1px solid rgba(16, 185, 129, 0.30)';
  } else if (status === 'Paused' || marketState.haltReason) {
    statusBg = 'var(--color-fall-light, rgba(239, 68, 68, 0.14))';
    statusColor = 'var(--color-fall, #EF4444)';
    statusBorder = '1px solid rgba(239, 68, 68, 0.30)';
    statusText = 'HALTED / PAUSED';
  } else if (clock.sessionState === 'RESULTS') {
    statusBg = 'var(--color-accent-light, rgba(0, 229, 255, 0.12))';
    statusColor = 'var(--color-accent, #00E5FF)';
    statusBorder = '1px solid var(--color-accent-border, rgba(0, 229, 255, 0.30))';
    statusText = 'RESULTS PUBLISHED';
  } else if (status === 'Closed' || clock.sessionState === 'MARKET_CLOSED') {
    statusBg = 'var(--color-surface-2, #161D2B)';
    statusColor = 'var(--color-text-secondary, #94A3B8)';
    statusBorder = '1px solid var(--color-border, rgba(255, 255, 255, 0.08))';
    statusText = 'MARKET CLOSED';
  }

  return (
    <div className="market-status-bar" style={{
      backgroundColor: 'var(--color-surface, #121722)',
      color: 'var(--color-ink, #F8FAFC)',
      padding: '8px 24px',
      fontSize: '0.8rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
      letterSpacing: '0.02em',
      transition: 'background-color var(--transition-smooth, 0.22s ease), border-color var(--transition-smooth, 0.22s ease)'
    }}>
      {/* Left: Session ID, Active Teams & Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SESSION</span>
          <span style={{
            color: 'var(--color-accent, #00E5FF)',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum" 1',
            letterSpacing: '0.04em'
          }}>{sessionId}</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border, rgba(255, 255, 255, 0.08))' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TEAMS</span>
          <span style={{
            color: 'var(--color-ink, #F8FAFC)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum" 1'
          }}>{teamsCount} ACTIVE</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border, rgba(255, 255, 255, 0.08))' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODE</span>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: mode === 'EVENT' ? 'var(--color-accent-light, rgba(0, 229, 255, 0.12))' : 'var(--color-surface-2, #161D2B)',
            color: mode === 'EVENT' ? 'var(--color-accent, #00E5FF)' : 'var(--color-text-secondary, #94A3B8)',
            border: mode === 'EVENT' ? '1px solid var(--color-accent-border, rgba(0, 229, 255, 0.30))' : '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            letterSpacing: '0.05em'
          }}>
            {mode}
          </span>
        </div>
      </div>

      {/* Center: Phase Status & IST Tabular Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '6px',
          backgroundColor: statusBg,
          color: statusColor,
          border: statusBorder,
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          <span className={`status-pulse-dot ${status === 'Open' ? '' : 'closed'}`} style={{ width: '7px', height: '7px' }} />
          <span>{statusText}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLOCK</span>
          <span style={{
            color: 'var(--color-ink, #F8FAFC)',
            fontWeight: 800,
            fontSize: '0.9rem',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum" 1',
            letterSpacing: '0.02em'
          }}>
            {clock.timeString}
          </span>
          {clock.timeLeftString && (
            <span style={{
              color: 'var(--color-accent, #00E5FF)',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginLeft: '4px',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              ({clock.timeLeftString})
            </span>
          )}
        </div>
      </div>

      {/* Right: Telemetry & Link Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {isCoordinatorOffline ? (
          <span style={{ color: 'var(--color-fall, #EF4444)', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ⚠ COORD OFFLINE
          </span>
        ) : (
          <span style={{ color: 'var(--color-rise, #10B981)', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ● COORD ACTIVE
          </span>
        )}

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border, rgba(255, 255, 255, 0.08))' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: connected ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)',
            boxShadow: connected ? '0 0 6px rgba(16, 185, 129, 0.6)' : '0 0 6px rgba(239, 68, 68, 0.6)'
          }} />
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: connected ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)',
            letterSpacing: '0.04em'
          }}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}
