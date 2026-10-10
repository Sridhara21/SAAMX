import React from 'react';

export default function PublicLandingPage() {
  const scheduleEvents = [
    { time: '08:00', title: 'Reporting & Delegate Registration', desc: 'Teams receive trading kits, badge allocations, and initial credentials.' },
    { time: '08:00 – 09:00', title: 'Floor Briefing & Strategic Setup', desc: 'Orientation on order execution mechanics, currency rules, and code of conduct.' },
    { time: '09:00 – 09:30', title: 'Pre-Market Price Discovery', desc: 'Observation of market depth, baseline quotes, and corporate filings.' },
    { time: '09:30', title: 'Official Market Opening Bell', desc: 'Commencement of live floor trading across all asset classes.' },
    { time: '10:00 – 12:00', title: 'Morning Trading Session', desc: 'Active execution of equity, global currency, and institutional debt orders.' },
    { time: '12:00 – 13:00', title: 'Market Recess & Mid-Day Rehearsal', desc: 'Order intake suspended; teams review book values and sector news.' },
    { time: '13:00 – 15:30', title: 'Afternoon Trading & Corporate Actions', desc: 'High-volatility phase: dynamic corporate bulletins, IPO tenders, and debate rounds.' },
    { time: '15:30', title: 'Final Bell & Immutable Valuation Freeze', desc: 'Trading halted. Portfolios snapshotted for certified reconciliation.' },
    { time: '15:30 – 16:00', title: 'Audit Reconciliation & Jury Deliberation', desc: 'Regulatory compliance review, penalty adjudication, and score tabulation.' },
    { time: '16:00', title: 'Valediction & Champion Awards', desc: 'Announcement of overall return champions, best portfolio strategy, and awards.' }
  ];

  const pillars = [
    {
      icon: '🏛️',
      title: 'Institutional Universe',
      desc: 'Trade across a curated 2,061-security master directory encompassing NSE/BSE equities, global counters, sovereign debt, ETFs, and REITs.'
    },
    {
      icon: '📝',
      title: 'Physical Order Desks',
      desc: 'True-to-life floor operations. Floor runners deliver standardized order-slips to 5 synchronized Exchange Desks for atomic matching.'
    },
    {
      icon: '💱',
      title: 'Multi-Currency Settlement',
      desc: 'Active foreign exchange spot conversions across INR, USD, GBP, and EUR to manage international equity positions and currency risks.'
    },
    {
      icon: '⚖️',
      title: 'SEBI Regulatory Watch',
      desc: 'Independent surveillance monitoring price-band circuit breakers, insider trade flags, front-running anomalies, and formal audits.'
    },
    {
      icon: '📰',
      title: 'Macro Intelligence Wire',
      desc: 'Breaking news flashes, crisis acts, corporate mergers, and analyst bulletins that shift market sentiment in real time.'
    },
    {
      icon: '🏆',
      title: 'Certified Valuation Freeze',
      desc: 'Idempotent 15:30 closing snapshots ensure zero post-bell tampering, producing audited scorecards for judicial evaluation.'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070A0F',
      color: '#EDE7DB',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      overflowX: 'hidden'
    }}>
      {/* Top Public Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(7, 10, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        padding: '16px 32px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #845508 0%, #D4AF37 50%, #845508 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)'
            }}>
              🏛️
            </div>
            <div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: '#FAF8F5',
                fontFamily: "'Cinzel', 'Fraunces', serif"
              }}>
                SAAMX
              </div>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#D4AF37',
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}>
                Student Academic Asset Market eXchange
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="#/projector"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#EDE7DB',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Auditorium Screen
            </a>
            <a
              href="#/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#070A0F',
                background: 'linear-gradient(135deg, #E6C875 0%, #D4AF37 50%, #AA8022 100%)',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              🔑 Participant & Staff Login →
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '90px 24px 70px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(132, 85, 8, 0.25) 0%, rgba(7, 10, 15, 0) 70%)'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '24px',
            backgroundColor: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#E6C875',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '24px'
          }}>
            ✦ Inter-School Asset Simulation & Trading Championship ✦
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            color: '#FFFFFF',
            fontFamily: "'Cinzel', 'Fraunces', serif",
            letterSpacing: '0.02em',
            marginBottom: '20px'
          }}>
            Experience the Market.<br />
            <span style={{
              background: 'linear-gradient(135deg, #F7E4B2 0%, #D4AF37 50%, #9C6A12 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Don’t Just Learn It.
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
            lineHeight: 1.65,
            color: '#BFB7A8',
            maxWidth: '780px',
            margin: '0 auto 36px',
            fontWeight: 400
          }}>
            The premier high-fidelity simulated financial exchange designed for competitive collegiate trading.
            Equips teams with ₹1 Crore institutional capital to navigate real-world volatility, physical desk matching,
            currency fluctuations, and regulatory scrutiny.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 36px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#070A0F',
                background: 'linear-gradient(135deg, #F7E4B2 0%, #D4AF37 50%, #9C6A12 100%)',
                borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              🏛️ ENTER SAAMX FLOOR →
            </a>
            <a
              href="#/projector"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 28px',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#EDE7DB',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textDecoration: 'none'
              }}
            >
              📊 Public Projector Display
            </a>
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div style={{
          maxWidth: '1120px',
          margin: '60px auto 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'rgba(17, 24, 39, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(212, 175, 55, 0.2)'
        }}>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#D4AF37', fontFamily: 'monospace' }}>2,061</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Securities Directory</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#D4AF37', fontFamily: 'monospace' }}>20</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Houses</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#06A868', fontFamily: 'monospace' }}>₹1 Crore</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Starting Capital per Team</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#D4AF37', fontFamily: 'monospace' }}>5</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Order Desks</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>SEBI</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Surveillance & Oversight</div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section style={{
        padding: '70px 24px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ color: '#D4AF37', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Engineered For Authenticity
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FAF8F5', fontFamily: "'Cinzel', 'Fraunces', serif" }}>
            How The SAAMX Exchange Operates
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {pillars.map((p, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'rgba(16, 22, 34, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '28px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{p.icon}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FAF8F5', marginBottom: '10px' }}>{p.title}</h3>
              <p style={{ fontSize: '0.92rem', color: '#A39D90', lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Master Event Schedule */}
      <section style={{
        padding: '70px 24px',
        backgroundColor: 'rgba(12, 17, 26, 0.85)',
        borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)'
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '46px' }}>
            <div style={{ color: '#D4AF37', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Canonical Competition Protocol
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FAF8F5', fontFamily: "'Cinzel', 'Fraunces', serif" }}>
              Official Event Schedule
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {scheduleEvents.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  backgroundColor: 'rgba(19, 27, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{
                  minWidth: '120px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  color: '#D4AF37',
                  fontFamily: 'monospace'
                }}>
                  {item.time}
                </div>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Entry CTA Banner */}
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(132, 85, 8, 0.2) 0%, rgba(7, 10, 15, 0) 70%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#FAF8F5',
            fontFamily: "'Cinzel', 'Fraunces', serif",
            marginBottom: '16px'
          }}>
            Ready For Market Open?
          </h2>
          <p style={{ color: '#BFB7A8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px' }}>
            Registered Investment Houses, Verification Officers, Exchange Operators, and Regulatory Observers may log in below.
          </p>
          <a
            href="#/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 42px',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#070A0F',
              background: 'linear-gradient(135deg, #F7E4B2 0%, #D4AF37 50%, #9C6A12 100%)',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 8px 30px rgba(212, 175, 55, 0.4)'
            }}
          >
            🔑 PARTICIPANT & STAFF LOGIN →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 32px 30px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#05070B',
        fontSize: '0.82rem',
        color: '#8A8275'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontWeight: 800, color: '#EDE7DB', marginBottom: '4px' }}>
              SAAMX — Student Academic Asset Market eXchange
            </div>
            <div>
              Technical Directorate & Event Secretariat | Copyright © 2026 Medam Sridhara. All Rights Reserved.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#/login" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Staff & Team Login</a>
            <a href="#/projector" style={{ color: '#EDE7DB', textDecoration: 'none', fontWeight: 600 }}>Public Projector</a>
            <span style={{ color: '#576070' }}>Private Academic Simulation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
