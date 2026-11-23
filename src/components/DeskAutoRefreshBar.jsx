import React, { useState, useEffect, useRef } from 'react';

/**
 * Universal Desk Auto-Refresh & Synchronization Controller
 * Provides real-time heartbeat and automated non-blocking polling sync
 * across Exchange, Bank, FX, and Broker Advisory desks.
 */
export default function DeskAutoRefreshBar({ 
  deskLabel = 'Desk', 
  defaultInterval = 3, 
  onRefresh = null,
  style = {} 
}) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [intervalSec, setIntervalSec] = useState(defaultInterval);
  const [countdown, setCountdown] = useState(defaultInterval);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [timeAgoText, setTimeAgoText] = useState('Just now');
  const timerRef = useRef(null);

  // Trigger state refresh without reloading browser or resetting form input
  const executeRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
      if (typeof window.__saamx_refreshState === 'function') {
        await window.__saamx_refreshState();
      } else {
        window.dispatchEvent(new CustomEvent('saamx_trigger_refresh'));
      }
      setLastRefreshedAt(Date.now());
      setCountdown(intervalSec);
    } catch (e) {
      console.warn('Auto-refresh error:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  // Main countdown and auto-refresh interval effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          executeRefresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshEnabled, intervalSec]);

  // Relative timestamp updater
  useEffect(() => {
    const timeAgoTimer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastRefreshedAt) / 1000);
      if (elapsedSec < 3) setTimeAgoText('Just now');
      else if (elapsedSec < 60) setTimeAgoText(`${elapsedSec}s ago`);
      else setTimeAgoText(`${Math.floor(elapsedSec / 60)}m ago`);
    }, 1000);

    return () => clearInterval(timeAgoTimer);
  }, [lastRefreshedAt]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 12px',
        borderRadius: '8px',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        border: '1px solid var(--color-border, #CBD5E1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        fontSize: '0.78rem',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: 'var(--color-ink, #0F172A)',
        ...style
      }}
    >
      {/* Pulse Status Dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: autoRefreshEnabled ? '#10B981' : '#94A3B8',
          boxShadow: autoRefreshEnabled ? '0 0 0 2px rgba(16, 185, 129, 0.25)' : 'none',
          display: 'inline-block',
          transition: 'all 0.2s'
        }}
      />

      <span style={{ fontWeight: 700, color: 'var(--color-ink-2, #64748B)' }}>
        {deskLabel} Auto-Sync:
      </span>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => {
          const next = !autoRefreshEnabled;
          setAutoRefreshEnabled(next);
          if (next) setCountdown(intervalSec);
        }}
        style={{
          background: autoRefreshEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.15)',
          border: `1px solid ${autoRefreshEnabled ? '#10B981' : '#CBD5E1'}`,
          color: autoRefreshEnabled ? '#059669' : '#64748B',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 800,
          cursor: 'pointer'
        }}
        title={autoRefreshEnabled ? 'Click to Pause Auto-Refresh' : 'Click to Enable Auto-Refresh'}
      >
        {autoRefreshEnabled ? `ON (${countdown}s)` : 'PAUSED'}
      </button>

      {/* Interval Selector */}
      {autoRefreshEnabled && (
        <select
          value={intervalSec}
          onChange={(e) => {
            const val = Number(e.target.value);
            setIntervalSec(val);
            setCountdown(val);
          }}
          style={{
            padding: '2px 4px',
            borderRadius: '4px',
            border: '1px solid var(--color-border, #CBD5E1)',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'transparent',
            color: 'var(--color-ink, #0F172A)',
            cursor: 'pointer'
          }}
          title="Auto-refresh interval"
        >
          <option value={2}>2s</option>
          <option value={3}>3s</option>
          <option value={5}>5s</option>
          <option value={10}>10s</option>
        </select>
      )}

      {/* Manual Refresh Now Button */}
      <button
        type="button"
        onClick={executeRefresh}
        disabled={isRefreshing}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          padding: '2px 6px',
          borderRadius: '4px',
          cursor: isRefreshing ? 'wait' : 'pointer',
          color: 'var(--color-primary, #FF6800)',
          fontWeight: 800,
          fontSize: '0.74rem'
        }}
        title="Immediate Manual Sync"
      >
        <span
          style={{
            display: 'inline-block',
            transform: isRefreshing ? 'rotate(360deg)' : 'none',
            transition: 'transform 0.4s ease'
          }}
        >
          🔄
        </span>
        <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
      </button>

      {/* Last Synced pill */}
      <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-3, #94A3B8)', marginLeft: '2px' }}>
        ({timeAgoText})
      </span>
    </div>
  );
}
