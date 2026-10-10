import React from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';

export default function HomePage({ state, connected }) {
  const primaryPortals = [
    {
      category: 'Event Onboarding',
      title: '🏛️ Event Registration Portal',
      path: '#/register',
      desc: 'Collegiate onboarding portal. Register School Profile, Investment House identity, delegate roster, and receive dynamic credentials & PIN.',
      isProtected: false,
      badge: 'Open Registration',
      badgeClass: 'badge-rise',
      primary: true,
      action: 'REGISTER INVESTMENT HOUSE →'
    },
    {
      category: 'Participant Trading Floor',
      title: '🎓 Investment House Terminal',
      path: '#/team',
      desc: 'Active participant command centre. Live portfolio valuations, multi-currency universe directory, order queues, and risk exposure analytics.',
      isProtected: true,
      badge: 'Investment Houses',
      badgeClass: 'badge-rise',
      primary: true,
      action: 'ACCESS TRADING FLOOR →'
    },
    {
      category: 'Floor Operations',
      title: '🧭 Floor Operations Dashboard',
      path: '#/floor-ops',
      desc: 'Staff operational telemetry. Real-time monitoring of 5 simultaneous Order Desks, queue throughput, FX requests, and team readiness.',
      isProtected: false,
      badge: 'Staff & Operations',
      badgeClass: 'badge-protected',
      primary: true,
      action: 'OPEN FLOOR OPERATIONS →'
    },
    {
      category: 'Participant Intelligence',
      title: '🧠 Market Intelligence Hub',
      path: '#/market-intelligence',
      desc: 'Team live intelligence center. Priority breaking news, market movers, breadth analytics, Bull vs Bear views, FX rates, and personal exposure.',
      isProtected: false,
      badge: 'Teams & Public',
      badgeClass: 'badge-rise',
      primary: true,
      action: 'OPEN INTELLIGENCE HUB →'
    },
    {
      category: 'Public Big-Screen',
      title: '📊 Auditorium Projector Broadcast',
      path: '#/projector',
      desc: 'Public big-screen board. Real-time market indices, animated market breadth, and cinematic event takeovers.',
      isProtected: false,
      badge: 'Public Broadcast',
      badgeClass: 'badge-public',
      primary: true,
      action: 'LAUNCH BROADCAST →'
    },
    {
      category: 'Broker Operations',
      title: '💼 5-Desk Order Clearance',
      path: '#/exchange',
      desc: 'Physical paper-ticket clearance terminal across 5 simultaneous order desks. Ticket claim locking, risk limits, and duplicate protection.',
      isProtected: true,
      badge: 'Mr. X Console',
      badgeClass: 'badge-protected',
      primary: true,
      action: 'OPEN EXECUTION DESK →'
    }
  ];

  const operationalPortals = [
    {
      category: 'Participant Advisory',
      title: '💼 Broker Advisory Terminal',
      path: '#/advisor',
      desc: 'Floor advisor console. Security research, public Bull/Bear catalysts, intraday valuation metrics, and publishable broker notes.',
      isProtected: false,
      badge: 'Advisory Desk',
      badgeClass: 'badge-info'
    },
    {
      category: 'Market Perspectives',
      title: '🐂 Bull Intelligence Terminal',
      path: '#/bull',
      desc: 'Bull strategy console. Top gainers, positive catalyst wire, momentum discoveries, and debate talking points for consultations.',
      isProtected: false,
      badge: 'Bull Role',
      badgeClass: 'badge-rise'
    },
    {
      category: 'Risk & Vulnerability',
      title: '🐻 Bear Intelligence Terminal',
      path: '#/bear',
      desc: 'Bear risk console. Vulnerability scans, overextended equity alerts, circuit risks, and bearish debate arguments.',
      isProtected: false,
      badge: 'Bear Role',
      badgeClass: 'badge-fall'
    },
    {
      category: 'Auditorium Arena',
      title: '⚔️ Bull vs Bear Debate Screen',
      path: '#/debate',
      desc: 'Shared auditorium debate presentation display. Live indices, spotlight security research, and side-by-side Bull vs Bear arguments.',
      isProtected: false,
      badge: 'Public Screen',
      badgeClass: 'badge-public'
    },
    {
      category: 'Broadcast Studio',
      title: '🎙️ News Anchor Teleprompter',
      path: '#/news',
      desc: 'Live studio teleprompter. 10:00 AM Opening Market Rundown & 3:00 PM Closing Market Summary rundowns for broadcast anchors.',
      isProtected: false,
      badge: 'News Anchor',
      badgeClass: 'badge-info'
    },
    {
      category: 'Market Surveillance',
      title: '🏛️ SEBI Regulatory Command',
      path: '#/sebi',
      desc: 'Surveillance command. Storyline sequence triggers, circuit breaker circuit halts, sector freezes, and reconciliation engine.',
      isProtected: true,
      badge: 'SEBI Desk',
      badgeClass: 'badge-protected'
    },
    {
      category: 'Press & Media',
      title: '📰 Journalist Press Wire',
      path: '#/journalist',
      desc: 'Press wire composer. Publish breaking bulletins, market rumors, and scenario events to shift trading sentiment in real-time.',
      isProtected: true,
      badge: 'Press Role',
      badgeClass: 'badge-info'
    },
    {
      category: 'Surveillance Audit',
      title: '🔍 Global Portfolio Surveillance',
      path: '#/portfolio',
      desc: 'Staff inspection utility. View team asset distributions, cash reserves, and trade logs with strict privacy separation.',
      isProtected: true,
      badge: 'Audit Desk',
      badgeClass: 'badge-protected'
    },
    {
      category: 'Foreign Exchange',
      title: '💱 Currency Exchange Desk',
      path: '#/fx',
      desc: 'Physical FX Conversion Desk. Execute foreign currency ticket orders (USD, GBP, EUR) for teams with atomic ledger settlement.',
      isProtected: true,
      badge: 'Mr. X / Sridhara',
      badgeClass: 'badge-protected'
    },
    {
      category: 'System Control',
      title: '⚙️ Admin War Room',
      path: '#/admin',
      desc: 'Root operations panel. Market lifecycle transition controls, universe seeding, disaster recovery backups, and audit logs.',
      isProtected: true,
      badge: 'Root Access',
      badgeClass: 'badge-protected'
    }
  ];

  const resultsPortal = {
    category: 'Tournament Finale',
    title: '🏆 Tournament Podium & Final Results',
    path: '#/results',
    desc: 'Official tournament debrief. 3D Top-3 podium, 9 honor tournament badges, final portfolio net worths, and printable debrief report.',
    isProtected: false,
    badge: 'Final Standings',
    badgeClass: 'badge-public'
  };

  const totalTrades = state.transactions?.length || 0;
  const marketStatus = state.marketState?.status || 'NotStarted';
  const sessionState = state.marketState?.sessionState || 'PRE_OPEN';
  const securities = Object.values(state.securities || {});
  const securitiesCount = securities.length || 1200;
  const teamsCount = Object.keys(state.teams || {}).length || 20;
  const marketIndices = state.marketIndices || {};

  // Market Breadth Calculations
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let totalVolume = 0;

  securities.forEach(s => {
    const cur = s.currentPrice || s.basePrice || 0;
    const op = s.openingPrice || s.basePrice || cur;
    totalVolume += (s.volume || 0);
    if (cur > op) advancers++;
    else if (cur < op) decliners++;
    else unchanged++;
  });

  const indicesList = [
    { key: 'GLOBAL100', name: 'GLOBAL 100', val: marketIndices.GLOBAL100?.value || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0, color: '#D4AF37' },
    { key: 'INDIA50', name: 'INDIA 50', val: marketIndices.INDIA50?.value || 5000, chg: marketIndices.INDIA50?.changePercent || 0, color: '#065F3E' },
    { key: 'US100', name: 'US 100', val: marketIndices.US100?.value || 8000, chg: marketIndices.US100?.changePercent || 0, color: '#134B8E' },
    { key: 'UK100', name: 'UK 100', val: marketIndices.UK100?.value || 4000, chg: marketIndices.UK100?.changePercent || 0, color: '#845508' }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px 0' }}>
      
      {/* 1. Full-width Mission Control Hero */}
      <div className="card-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: 'var(--color-brass-light)', color: '#6C4404', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', border: '1px solid rgba(132, 85, 8, 0.3)' }}>
              <span>🏛️ OFFICIAL FINANCIAL MARKET SIMULATION</span>
            </div>
            <h1 style={{ fontSize: '2.6rem', fontWeight: 900, fontFamily: 'var(--font-brand)', lineHeight: '1.15', color: 'var(--color-ink)', letterSpacing: '0.02em' }}>
              SAAMX
            </h1>
            <p style={{ color: 'var(--color-ink-2)', fontSize: '1.05rem', marginTop: '10px', lineHeight: '1.55', maxWidth: '680px', fontWeight: 500 }}>
              An immersive financial-market simulation built for strategic decision-making, market intelligence, high-stakes trade clearance, and disciplined collegiate investing.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#FAF8F3', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--color-border)', minWidth: '150px' }}>
              <span style={{ fontSize: '0.7rem', color: '#242C38', display: 'block', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>EXCHANGE STATUS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-pulse-dot ${marketStatus === 'Open' ? '' : 'closed'}`} />
                <span style={{ fontWeight: 900, fontSize: '1.15rem', color: marketStatus === 'Open' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                  {marketStatus.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#1E232B', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                Phase: {sessionState}
              </span>
            </div>

            <div style={{ backgroundColor: '#FAF8F3', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--color-border)', minWidth: '150px' }}>
              <span style={{ fontSize: '0.7rem', color: '#242C38', display: 'block', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>UNIVERSE</span>
              <div className="font-data" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-ink)' }}>
                {securitiesCount}+ <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#242C38' }}>Securities</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#1E232B', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                {teamsCount} Active Teams
              </span>
            </div>

            {totalTrades > 0 && (
              <div style={{ backgroundColor: '#FAF8F3', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--color-border)', minWidth: '140px' }}>
                <span style={{ fontSize: '0.7rem', color: '#242C38', display: 'block', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>CLEARED TRADES</span>
                <span className="font-data" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-brass)' }}>
                  {totalTrades.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#1E232B', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                  Vol: {totalVolume.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Live Market Snapshot Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📈 LIVE MARKET SNAPSHOT
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#242C38', fontWeight: 700 }}>
            Real-time simulated indices & market breadth
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {indicesList.map(idx => {
            const isUp = idx.chg >= 0;
            return (
              <div key={idx.key} className="card-metric">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#242C38', textTransform: 'uppercase' }}>{idx.name}</span>
                  <span className={`badge ${isUp ? 'badge-rise' : 'badge-fall'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(idx.chg).toFixed(2)}%
                  </span>
                </div>
                <div className="font-data" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-ink)' }}>
                  {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Market Breadth Strip */}
        <div className="card-data" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#242C38' }}>ADVANCERS:</span>
            <span className="font-data" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-rise)' }}>
              {advancers}
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#242C38' }}>DECLINERS:</span>
            <span className="font-data" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-fall)' }}>
              {decliners}
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#242C38' }}>UNCHANGED:</span>
            <span className="font-data" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-ink)' }}>
              {unchanged}
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#242C38' }}>TOTAL TURNOVER:</span>
            <span className="font-data" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-brass)' }}>
              {totalTrades} Trades ({totalVolume.toLocaleString()} units)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary Command Terminals (Large Cards) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎯 PRIMARY OPERATIONAL WORKSTATIONS
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#242C38', fontWeight: 700 }}>
            Core trading, broadcast & clearance desks
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {primaryPortals.map((portal, idx) => (
            <a
              key={idx}
              href={portal.path}
              className="card-primary glass-interactive"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '190px',
                padding: '24px 28px',
                border: '2px solid rgba(132, 85, 8, 0.45)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF8F2 100%)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#242C38', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {portal.category}
                  </span>
                  <span className={`badge ${portal.badgeClass}`}>
                    {portal.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-ink)', marginBottom: '8px' }}>
                  {portal.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#1A202C', lineHeight: '1.55', fontWeight: 500 }}>
                  {portal.desc}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '14px', borderTop: '1.5px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', color: '#242C38', fontWeight: 800 }}>
                  {portal.isProtected ? '🔒 Auth Protected' : '🌐 Open Access'}
                </span>
                <span style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-brass)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {portal.action}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 4. Operations & Regulatory Control */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏛️ REGULATORY & MISSION CONTROL
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#242C38', fontWeight: 800 }}>
            Market oversight, press wire & administrative panels
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {operationalPortals.map((portal, idx) => (
            <a
              key={idx}
              href={portal.path}
              className="card-metric"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '150px',
                padding: '18px 20px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#242C38', fontWeight: 800, textTransform: 'uppercase' }}>
                    {portal.category}
                  </span>
                  <span className={`badge ${portal.badgeClass}`} style={{ fontSize: '0.7rem', padding: '3px 7px' }}>
                    {portal.badge}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.08rem', fontWeight: 900, color: 'var(--color-ink)', marginBottom: '6px' }}>
                  {portal.title}
                </h4>
                <p style={{ fontSize: '0.86rem', color: '#1A202C', lineHeight: '1.5', fontWeight: 500 }}>
                  {portal.desc}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-brass)' }}>
                  OPEN →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 5. Tournament Finale Banner */}
      <a
        href={resultsPortal.path}
        className="card-primary glass-interactive"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          border: '2px solid #D4AF37',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FBF6E9 100%)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span className="badge badge-public">CLOSING CEREMONY</span>
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-ink)', marginBottom: '4px' }}>
            {resultsPortal.title}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-2)', fontWeight: 500 }}>
            {resultsPortal.desc}
          </p>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-brass)', padding: '10px 20px', borderRadius: '8px', border: '2px solid var(--color-brass)', backgroundColor: '#FFFFFF' }}>
          VIEW PODIUM & LEADERBOARD 🏆
        </div>
      </a>

      {/* 6. Connection Diagnostic Footer */}
      <div style={{
        fontSize: '0.8rem',
        color: '#242C38',
        textAlign: 'center',
        padding: '16px 8px',
        borderTop: '1px solid var(--color-border)',
        marginTop: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        fontWeight: 600
      }}>
        <span>SAAMX Platform Engine Core • 2026 Event Edition</span>
        <span>•</span>
        <span>
          Realtime Link:{' '}
          <span style={{ color: connected ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 900 }}>
            {connected ? '● Connected & Active' : '○ Offline / Reconnecting'}
          </span>
        </span>
      </div>

    </div>
  );
}
