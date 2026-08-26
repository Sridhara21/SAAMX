import React from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';

export default function HomePage({ state, connected }) {
  const portals = [
    { title: 'Projector Display', path: '#/projector', desc: 'Public display board. Shows live security grids, countdown clock, index shifts, and fullscreen event takeovers.', isProtected: false },
    { title: 'Exchange Desk Terminal', path: '#/exchange', desc: 'Main transaction desk. Rapid search auto-complete lookups, live quotes, and order execution.', isProtected: true },
    { title: 'SEBI Command Center', path: '#/sebi', desc: 'Regulatory and operations console. Market state controllers (start/pause/close), news composer, and trading freezes.', isProtected: true },
    { title: 'Portfolio Desk Lookup', path: '#/portfolio', desc: 'Staff portfolio inspection utility. Select any team code to view active holdings, cash reserves, and order audits.', isProtected: true },
    { title: 'Newsroom Desk', path: '#/journalist', desc: 'Press wire composer. Write custom bulletins or publish pre-written templates to direct market price swings.', isProtected: true },
    { title: 'Operations Control (Admin)', path: '#/admin', desc: 'Coordinators configuration panel. CRUD directory tables, settings overrides, and void transaction ledger adjustments.', isProtected: true },
    { title: 'Debrief & Awards Results', path: '#/results', desc: 'Closing analytics board. Show final rankings, awards statistics, and chronological event logs.', isProtected: false }
  ];

  const totalTrades = state.transactions?.length || 0;
  const marketStatus = state.marketState?.status || 'NotStarted';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', padding: '24px 16px' }}>
      
      {/* Full-width Mission Control Hero */}
      <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: '1.1', color: 'var(--color-ink)' }}>
              SAAMX - Student Academic Asset Market eXchange
            </h1>
            <p style={{ color: 'var(--color-ink-2)', fontSize: '1.05rem', marginTop: '8px' }}>
              Central exchange engine and coordinate operator terminals.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', padding: '16px 24px', borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>EXCHANGE STATUS</span>
              <SplitFlapText text={marketStatus} />
            </div>
            {marketStatus === 'Open' && (
              <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL TRADES LOGGED</span>
                <span className="font-data" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-brass)' }}>
                  {totalTrades}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid of Portals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {portals.map((portal, idx) => (
          <a
            key={idx}
            href={portal.path}
            className="glass card"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '140px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)' }}>{portal.title}</h3>
              {portal.isProtected && (
                <span style={{ fontSize: '0.65rem', backgroundColor: '#FAE0DE', color: '#9B2B25', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>🔒 SECURE</span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', flexGrow: 1, lineHeight: '1.5' }}>{portal.desc}</p>
            <div style={{ alignSelf: 'flex-end', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brass)', marginTop: '12px' }}>
              OPEN DESK →
            </div>
          </a>
        ))}
      </div>



      {/* Connection Diagnostic Footer */}
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--color-ink-3)',
        textAlign: 'center',
        padding: '12px 8px',
        borderTop: '1px solid var(--color-border)',
        marginTop: '16px'
      }}>
        Firebase: <strong>{import.meta.env.VITE_FIREBASE_DATABASE_URL || 'NOT CONFIGURED'}</strong> 
        {' '}| DB Status: <span style={{ color: connected ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 700 }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

    </div>
  );
}
