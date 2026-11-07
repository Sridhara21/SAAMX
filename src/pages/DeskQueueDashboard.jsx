import React, { useState } from 'react';
import DeskQueueDashboard from '../components/DeskQueueDashboard.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { IconLayers, IconWifi, IconClock } from '../lib/icons.jsx';

export default function DeskQueueDashboardPage({
  state = {},
  connected = true,
  isCoordinatorOffline = false,
  onOpenProfile
}) {
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
      {/* Portal Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg, 12px)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portals &gt;
            </span>
            <Badge variant="primary" size="sm" style={{ fontWeight: 800 }}>
              PORTAL #11
            </Badge>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
              Dedicated Order Queue Screen
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <IconLayers size={26} style={{ color: 'var(--color-accent, #3B82F6)' }} />
            <span>Dedicated Multi-Desk Order Queue</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: connected ? '#10B981' : '#EF4444'
            }}
          >
            <IconWifi size={14} />
            <span>{connected ? 'LIVE SYNC' : 'DISCONNECTED'}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--color-text-tertiary)'
            }}
          >
            <IconClock size={14} />
            <span>Auto-refresh active</span>
          </div>
        </div>
      </div>

      {/* Embedded Component */}
      <DeskQueueDashboard
        state={state}
        isEmbedded={false}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
}
