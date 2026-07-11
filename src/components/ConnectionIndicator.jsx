import React from 'react';

export function ConnectionIndicator({ connected }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      borderRadius: 20,
      background: connected ? '#D6F0E8' : '#FAE0DE',
      border: `1px solid ${connected ? '#15694F' : '#9B2B25'}`,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace',
      color: connected ? '#15694F' : '#9B2B25',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: connected ? '#15694F' : '#9B2B25',
        animation: connected ? 'none' : 'pulse 1s infinite'
      }} />
      {connected ? '● LIVE' : '⚠ RECONNECTING...'}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
