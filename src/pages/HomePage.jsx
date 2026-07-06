import React from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';

export default function HomePage({ state }) {
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
              NIFTY FMS Simulation OS
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
              borderLeft: '4px solid transparent',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderLeftColor = 'var(--color-brass)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderLeftColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                  {portal.title}
                </h3>
                <span className={`badge ${portal.isProtected ? 'badge-protected' : 'badge-public'}`}>
                  {portal.isProtected ? 'PROTECTED' : 'PUBLIC'}
                </span>
              </div>
              <p style={{ color: 'var(--color-ink-2)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {portal.desc}
              </p>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-brass)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enter Console →
            </div>
          </a>
        ))}
      </div>

      {/* Footer Network Desk Details */}
      <div className="glass card" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', fontSize: '0.85rem', borderLeft: '4px solid var(--color-brass)' }}>
        <div>
          <h4 style={{ fontSize: '1rem', marginBottom: '8px', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Venue Host Coordinator</h4>
          <p style={{ color: 'var(--color-ink-2)', lineHeight: '1.6' }}>
            Ensure all secondary terminals connect to the same local area network subnet. Access endpoints by consulting the <a href="file:///c:/Users/user/3D%20Objects/New%20folder/fms-platform/SETUP.md" style={{ color: 'var(--color-brass)', textDecoration: 'underline' }}>SETUP.md</a> guidelines.
          </p>
        </div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '32px' }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '8px', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Administrative Authentication</h4>
          <p style={{ color: 'var(--color-ink-2)', lineHeight: '1.6' }}>
            DESK execution terminals, SEBI, and Newsroom editors are password-protected. Input the administrative code `fms-event-2026` once to gain full session clearance across all console screens.
          </p>
        </div>
      </div>

    </div>
  );
}
