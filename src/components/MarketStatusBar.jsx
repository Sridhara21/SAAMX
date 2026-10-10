import React from 'react';
import { calculateMarketClock } from '../lib/api.js';

export default function MarketStatusBar({ state, serverTimeOffset = 0, connected = true, coordinator = null, isCoordinatorOffline = false }) {
  const marketState = state?.marketState || {};
  const clock = calculateMarketClock(marketState, serverTimeOffset);
  const teamsCount = Object.keys(state?.teams || {}).length || 20;
  const sessionId = marketState.sessionId || 'SAAMX-2026-LIVE';
  const mode = marketState.mode || 'DEMO';
  const status = marketState.status || 'NotStarted';

  let statusBg = 'var(--color-brass-light)';
  let statusColor = 'var(--color-brass)';
  let statusText = clock.sessionState.replace(/_/g, ' ');

  if (status === 'Open' || clock.sessionState === 'CONTINUOUS_TRADING') {
    statusBg = 'var(--color-rise-light)';
    statusColor = 'var(--color-rise)';
  } else if (status === 'Paused' || marketState.haltReason) {
    statusBg = 'var(--color-fall-light)';
    statusColor = 'var(--color-fall)';
    statusText = 'HALTED / PAUSED';
  } else if (clock.sessionState === 'RESULTS') {
    statusBg = 'var(--color-brass-light)';
    statusColor = 'var(--color-brass)';
    statusText = 'RESULTS PUBLISHED';
  } else if (status === 'Closed' || clock.sessionState === 'MARKET_CLOSED') {
    statusBg = 'var(--color-surface-2)';
    statusColor = 'var(--color-ink-2)';
    statusText = 'MARKET CLOSED';
  }

  return (
    <div className="market-status-bar" style={{
      backgroundColor: '#111419',
      color: '#FFFFFF',
      padding: '8px 24px',
      fontSize: '0.8rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      borderBottom: '2px solid #845508',
      letterSpacing: '0.03em'
    }}>
      {/* Left: Session ID & Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#CBD5E1', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>SESSION</span>
          <span className="font-data" style={{ color: '#F6ECD5', fontWeight: 800 }}>{sessionId}</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: '#333842' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#CBD5E1', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>TEAMS</span>
          <span className="font-data" style={{ color: '#FFFFFF', fontWeight: 700 }}>{teamsCount} ACTIVE</span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: '#333842' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#CBD5E1', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>MODE</span>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: mode === 'EVENT' ? 'rgba(132, 85, 8, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            color: mode === 'EVENT' ? '#F6ECD5' : '#D1D5DB'
          }}>
            {mode}
          </span>
        </div>
      </div>

      {/* Center: Phase Status & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '4px',
          backgroundColor: statusBg,
          color: statusColor,
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          <span className={`status-pulse-dot ${status === 'Open' ? '' : 'closed'}`} style={{ width: '7px', height: '7px' }} />
          <span>{statusText}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#CBD5E1', fontSize: '0.7rem', fontWeight: 800 }}>CLOCK</span>
          <span className="font-data" style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.9rem' }}>
            {clock.timeString}
          </span>
          {clock.timeLeftString && (
            <span style={{ color: '#B38027', fontSize: '0.72rem', fontWeight: 700, marginLeft: '4px' }}>
              ({clock.timeLeftString})
            </span>
          )}
        </div>
      </div>

      {/* Right: Telemetry & Link Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {isCoordinatorOffline ? (
          <span style={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ⚠ COORD OFFLINE
          </span>
        ) : (
          <span style={{ color: '#10B981', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ● COORD ACTIVE
          </span>
        )}

        <div style={{ width: '1px', height: '14px', backgroundColor: '#333842' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: connected ? '#10B981' : '#EF4444'
          }} />
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: connected ? '#10B981' : '#EF4444'
          }}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}
