import React, { useState } from 'react';
import { SaamxLogo } from '../components/ui/index.js';
import {
  IconBuilding,
  IconTrendingUp,
  IconCurrencyExchange,
  IconShieldCheck,
  IconNewspaper,
  IconTrophy,
  IconArrowRight,
  IconTarget,
  IconBriefcase,
  IconBarChart,
  IconCheck,
  IconX
} from '../lib/icons.jsx';

export default function PublicLandingPage() {
  const [showExploreModal, setShowExploreModal] = useState(false);

  // Exact Official Event Schedule from Authoritative Visual Reference
  const officialSchedule = [
    {
      time: '8:00 AM – 8:30 AM',
      activity: 'Registration and participant verification'
    },
    {
      time: '8:30 AM – 9:00 AM',
      activity: 'Seating, team verification and platform briefing'
    },
    {
      time: '9:00 AM – 9:30 AM',
      activity: 'Opening ceremony and official instructions'
    },
    {
      time: '9:30 AM – 12:15 PM',
      activity: 'Opening market session'
    },
    {
      time: '12:15 PM – 12:45 PM',
      activity: 'Lunch break'
    },
    {
      time: '12:45 PM – 3:30 PM',
      activity: 'Afternoon market session'
    },
    {
      time: '3:30 PM – 4:00 PM',
      activity: 'Reconciliation, results announcement and post-event sessions'
    }
  ];

  // 4 Core Stages of Student Experience
  const studentJourney = [
    {
      step: '01',
      title: 'LEARN',
      tagline: 'Understand the Foundations',
      desc: 'Explore real-world market structures, multi-asset security valuation, capital allocation principles, and the role of regulatory oversight.'
    },
    {
      step: '02',
      title: 'ANALYZE',
      tagline: 'Interpret Real-Time Signals',
      desc: 'Examine live quotes across 3,000+ securities, synthesize breaking macroeconomic bulletins, evaluate corporate fundamentals, and assess risk.'
    },
    {
      step: '03',
      title: 'DECIDE',
      tagline: 'Formulate Floor Strategy',
      desc: 'Collaborate as an Investment House team, allocate starting capital, weigh advice from Floor Advisors, and formulate agile responses to catalysts.'
    },
    {
      step: '04',
      title: 'TRADE',
      tagline: 'Execute Physical & Digital Orders',
      desc: 'Deploy orders through Exchange matching desks, negotiate currency conversions at the FX counter, and clear physical settlement vouchers with the Bank.'
    }
  ];

  // Market Ecosystem supported by SAAMX
  const marketEcosystem = [
    { name: 'Equities', desc: 'Domestic & global blue-chip equities with real-time liquidity and price depth.' },
    { name: 'ETFs', desc: 'Diversified thematic & index exchange-traded funds tracking international indices.' },
    { name: 'Mutual Funds', desc: 'Active & passive institutional funds providing sectoral exposure.' },
    { name: 'Corporate Bonds', desc: 'Fixed-income debentures with distinct yield curves and credit ratings.' },
    { name: 'Government Bonds', desc: 'Sovereign treasury instruments providing capital stability.' },
    { name: 'REITs & InvITs', desc: 'Real estate investment trusts and infrastructure investment trusts.' },
    { name: 'Currency Exchange', desc: 'Live spot FX conversions across INR, USD, EUR, GBP, JPY, and AED.' },
    { name: 'Primary IPOs', desc: 'Exclusive initial public offerings with subscription windows and allotment.' },
    { name: 'Market News Wire', desc: 'Macro bulletins, corporate developments, and flash regulatory advisories.' },
    { name: 'Floor Advisors', desc: 'Specialist floor advisors available for institutional research and second opinions.' }
  ];

  // Physical Floor Journey
  const physicalFlow = [
    {
      badge: 'Step 1',
      title: 'Team Strategy & Order Slip',
      desc: 'Teams analyze the market, select instruments, and prepare authorized physical order slips with execution parameters.'
    },
    {
      badge: 'Step 2',
      title: 'Exchange Order Desk',
      desc: 'Floor runners deliver slips to 5 physical Exchange Desks for compliance checking, price verification, and electronic entry.'
    },
    {
      badge: 'Step 3',
      title: 'Bank & Settlement Counter',
      desc: 'Approved execution vouchers transfer to Bank Counters for cash settlement, funds verification, and portfolio reconciliation.'
    },
    {
      badge: 'Step 4',
      title: 'Portfolio & Market Impact',
      desc: 'Holdings and balances update instantaneously in the team terminal while trade volume feeds market price action.'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0B192C',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* 1. Header / Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 2px 12px rgba(11, 25, 44, 0.04)',
          padding: '14px 28px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px'
          }}
        >
          {/* Brand Logo */}
          <a href="#/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <SaamxLogo size="md" showSubtitle={false} />
          </a>

          {/* Simple Clean Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px'
            }}
            className="desktop-only"
          >
            <a
              href="#/"
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#0B192C',
                textDecoration: 'none'
              }}
            >
              Home
            </a>
            <button
              type="button"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#475569',
                transition: 'color 0.15s'
              }}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#475569',
                transition: 'color 0.15s'
              }}
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('desks')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#475569',
                transition: 'color 0.15s'
              }}
            >
              Desks
            </button>
          </nav>

          {/* Primary Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a href="#/login" style={{ textDecoration: 'none' }} className="desktop-only">
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: '6px'
                }}
              >
                Sign In
              </span>
            </a>
            <a
              href="#/login"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                backgroundColor: '#FF6800',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.92rem',
                boxShadow: '0 4px 14px rgba(255, 104, 0, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Enter Event Portal</span>
              <IconArrowRight size={15} />
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '64px 28px 72px',
          maxWidth: '1240px',
          margin: '0 auto'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Event Identity & Clear Purpose */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              Official Inter-School Financial Market Championship
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.8rem, 5vw, 4.2rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: '#0B192C',
                margin: '0 0 12px 0'
              }}
            >
              SAAMX&apos;26
            </h1>

            <div
              style={{
                fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
                fontWeight: 800,
                color: '#FF6800',
                lineHeight: 1.3,
                marginBottom: '16px'
              }}
            >
              Student Academic Asset Market eXchange
            </div>

            <div
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                backgroundColor: 'rgba(255, 104, 0, 0.08)',
                borderLeft: '4px solid #FF6800',
                borderRadius: '0 8px 8px 0',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0B192C',
                marginBottom: '22px'
              }}
            >
              &ldquo;Experience the market, don&apos;t just plan it.&rdquo;
            </div>

            <p
              style={{
                fontSize: '1.08rem',
                lineHeight: 1.68,
                color: '#475569',
                margin: '0 0 32px 0',
                maxWidth: '560px'
              }}
            >
              A live financial-market simulation where student teams analyze securities, react to market events, manage portfolios and make decisions under changing market conditions.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href="#/login"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 30px',
                  backgroundColor: '#FF6800',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  boxShadow: '0 6px 20px rgba(255, 104, 0, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>Enter Event Portal</span>
                <IconArrowRight size={16} />
              </a>

              <button
                type="button"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0B192C',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(11, 25, 44, 0.04)'
                }}
              >
                <span>Explore SAAMX</span>
                <span style={{ fontSize: '1.1rem' }}>&darr;</span>
              </button>
            </div>
          </div>

          {/* Right Column: Refined Live Market Experience Composition */}
          <div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 20px 40px -12px rgba(11, 25, 44, 0.1)',
                padding: '24px',
                position: 'relative'
              }}
            >
              {/* Card Header: Live Trading Floor Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '16px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Exchange Floor Status
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0B192C' }}>
                      Continuous Trading &bull; Session Active
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0B192C'
                  }}
                >
                  SAAMX-INDIA-50
                </div>
              </div>

              {/* Visual Flow: Live Market -> News -> Decision -> Trade -> Portfolio */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Operational Loop
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 14px'
                  }}
                >
                  {['LIVE MARKET', 'NEWS', 'DECISION', 'TRADE', 'PORTFOLIO'].map((step, idx) => (
                    <React.Fragment key={step}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: idx === 2 || idx === 3 ? '#FF6800' : '#0B192C',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {step}
                      </span>
                      {idx < 4 && <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>&rarr;</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Sample Market Indicator Strips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                      EQUITY
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0B192C' }}>RELIANCE</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '6px' }}>Reliance Industries Ltd</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0B192C' }}>₹2,845.50</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981' }}>+1.85% &uarr;</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                      SPOT FX
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0B192C' }}>USD / INR</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '6px' }}>Reserve Counter 1</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0B192C' }}>₹86.42</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6' }}>Spread 0.45%</div>
                  </div>
                </div>

                {/* Simulated Order Slip Badge */}
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#FFFBEB',
                    borderRadius: '8px',
                    border: '1px dashed #F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                      ORDER SLIP
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#78350F' }}>
                      BUY &bull; 100 INFY &bull; Exchange Desk 2
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>
                    Verified &bull; Bank Settled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Authoritative Core Statistics Strip */}
      <section
        style={{
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '28px 28px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0B192C', fontFamily: 'monospace', lineHeight: 1.1 }}>
              3,000+
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
              Securities Universe
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FF6800', fontFamily: 'monospace', lineHeight: 1.1 }}>
              10
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
              Investment Houses
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10B981', fontFamily: 'monospace', lineHeight: 1.1 }}>
              ₹1 CRORE
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
              Starting Capital / Team
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#2563EB', fontFamily: 'monospace', lineHeight: 1.1 }}>
              5
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
              Physical Exchange Desks
            </div>
          </div>
        </div>
      </section>

      {/* 4. The Complete Student Journey: Learn -> Analyze -> Decide -> Trade */}
      <section
        id="how-it-works"
        style={{
          padding: '80px 28px',
          maxWidth: '1240px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div
            style={{
              color: '#FF6800',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            The Participant Experience
          </div>
          <h2
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              color: '#0B192C',
              margin: '0 0 12px 0'
            }}
          >
            Learn &bull; Analyze &bull; Decide &bull; Trade
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            SAAMX immerses student teams in an end-to-end simulated market experience where textbook theory meets dynamic decision-making.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}
        >
          {studentJourney.map((card) => (
            <div
              key={card.step}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '30px 24px',
                boxShadow: '0 4px 12px rgba(11, 25, 44, 0.03)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  color: '#FF6800',
                  letterSpacing: '0.06em',
                  marginBottom: '12px'
                }}
              >
                PHASE {card.step}
              </div>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#0B192C',
                  margin: '0 0 6px 0'
                }}
              >
                {card.title}
              </h3>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#2563EB',
                  marginBottom: '14px'
                }}
              >
                {card.tagline}
              </div>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: '#64748B',
                  lineHeight: 1.6,
                  margin: 0
                }}
              >
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. The Market is Live */}
      <section
        style={{
          backgroundColor: '#0B192C',
          color: '#FFFFFF',
          padding: '80px 28px'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '720px', marginBottom: '40px' }}>
            <div
              style={{
                color: '#FF6800',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}
            >
              Real-Time Simulation Dynamic
            </div>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 16px 0',
                lineHeight: 1.15
              }}
            >
              The Market is Live.
            </h2>
            <p
              style={{
                fontSize: '1.08rem',
                color: '#94A3B8',
                lineHeight: 1.68,
                margin: 0
              }}
            >
              Market prices are never static. In SAAMX, participant portfolios and positions continuously adapt as the trading environment reacts to dynamic events:
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px'
            }}
          >
            {[
              { title: 'Market Movements', desc: 'Price discovery driven by continuous institutional trading volume and market depth.' },
              { title: 'Macro News Catalysts', desc: 'Fast-moving economic developments and corporate reports released to the market wire.' },
              { title: 'Active Portfolio Positions', desc: 'Holdings fluctuate in value, requiring teams to manage cash reserves and sector exposure.' },
              { title: 'Currency Fluctuations', desc: 'Dynamic exchange rates impacting international securities and cross-border settlement.' },
              { title: 'Primary IPO Windows', desc: 'High-conviction tender opportunities with limited subscription windows.' },
              { title: 'Changing Conditions', desc: 'Circuit breakers, regulatory notices, and changing liquidity across sectors.' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#1E293B',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  padding: '22px 20px'
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.90rem', color: '#94A3B8', lineHeight: 1.55 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Physical Floor Experience: Desks & Settlement Flow */}
      <section
        id="desks"
        style={{
          padding: '80px 28px',
          maxWidth: '1240px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div
            style={{
              color: '#FF6800',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            Authentic Trading Floor Flow
          </div>
          <h2
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              color: '#0B192C',
              margin: '0 0 12px 0'
            }}
          >
            Physical Floor &amp; Settlement Architecture
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            SAAMX combines electronic decision terminals with physical floor desks, mirroring authentic institutional trading.
          </p>
        </div>

        {/* 4-Step Physical Flow */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}
        >
          {physicalFlow.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '26px 22px',
                boxShadow: '0 4px 12px rgba(11, 25, 44, 0.03)'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  marginBottom: '14px'
                }}
              >
                {step.badge}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B192C', margin: '0 0 8px 0' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.90rem', color: '#64748B', lineHeight: 1.55, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Specialized Desks Breakdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px'
          }}
        >
          {[
            {
              title: 'Exchange Desks (1–5)',
              tag: 'Order Verification',
              desc: 'Physical slip inspection, stamp checks, and electronic queue matching.'
            },
            {
              title: 'Bank Counters (1–4)',
              tag: 'Cash & Settlement',
              desc: 'Trade clearance, voucher settlement, and portfolio cash debits/credits.'
            },
            {
              title: 'Forex Desk (FX 1–2)',
              tag: 'Currency Conversion',
              desc: 'Spot currency exchange across 6 foreign currencies with finite reserves.'
            },
            {
              title: 'IPO Order Desk',
              tag: 'Primary Allotments',
              desc: 'Dedicated subscription counters for primary public tenders and bids.'
            }
          ].map((desk, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '20px 18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B192C' }}>{desk.title}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FF6800', backgroundColor: 'rgba(255, 104, 0, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                  {desk.tag}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                {desk.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Market Ecosystem Supported by SAAMX */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
          padding: '80px 28px'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div
              style={{
                color: '#FF6800',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}
            >
              Authorized Asset Classes
            </div>
            <h2
              style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                color: '#0B192C',
                margin: '0 0 12px 0'
              }}
            >
              The SAAMX Market Ecosystem
            </h2>
            <p
              style={{
                fontSize: '1.02rem',
                color: '#64748B',
                maxWidth: '620px',
                margin: '0 auto',
                lineHeight: 1.6
              }}
            >
              A multi-asset universe providing comprehensive exposure to modern capital markets.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            {marketEcosystem.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '20px 18px'
                }}
              >
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0B192C', marginBottom: '6px' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Official Event Schedule (Exact Official Format) */}
      <section
        id="schedule"
        style={{
          padding: '80px 28px',
          maxWidth: '1020px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              color: '#FF6800',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            Official Competition Timeline
          </div>
          <h2
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              color: '#0B192C',
              margin: '0 0 10px 0'
            }}
          >
            Official Event Schedule
          </h2>
          <p
            style={{
              fontSize: '0.98rem',
              color: '#64748B',
              margin: 0
            }}
          >
            Standard Indian Standard Time (IST) operational sequence for the SAAMX championship floor.
          </p>
        </div>

        {/* Schedule Table/Timeline - Exact Visual Match to Official Specification Graphic */}
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '2px solid #7E8B9B',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(11, 25, 44, 0.06)'
          }}
        >
          {/* Header Bar with Exact Navy + Orange Tabs matching graphic */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              borderBottom: '2px solid #7E8B9B',
              backgroundColor: '#FFFFFF'
            }}
          >
            {/* Time (IST) Navy Block */}
            <div
              className="saamx-schedule-tab-time"
              style={{
                width: '320px',
                backgroundColor: '#172A4E',
                color: '#FFFFFF',
                padding: '14px 24px',
                fontWeight: 800,
                fontSize: '1.35rem',
                textAlign: 'center',
                letterSpacing: '0.02em',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Time (IST)
            </div>

            {/* Activity Orange Tab */}
            <div
              className="saamx-schedule-tab-activity"
              style={{
                padding: '14px 42px',
                backgroundColor: '#EB5220',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '1.35rem',
                borderRadius: '12px 12px 0 0',
                letterSpacing: '0.02em',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Activity
            </div>

            {/* Remaining empty space to the right */}
            <div style={{ flex: 1 }} />
          </div>

          {/* Schedule Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {officialSchedule.map((row, idx) => (
              <div
                key={idx}
                className="saamx-schedule-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '320px 1fr',
                  padding: '18px 28px',
                  borderBottom: idx < officialSchedule.length - 1 ? '1px solid #CBD5E1' : 'none',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontWeight: 500,
                    fontSize: '1.1rem',
                    color: '#0F172A'
                  }}
                >
                  {row.time}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    fontWeight: 500,
                    fontSize: '1.1rem',
                    color: '#0F172A',
                    paddingLeft: '16px'
                  }}
                >
                  {row.activity}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authoritative Operational Market Milestones */}
        <div style={{ maxWidth: '960px', margin: '32px auto 0' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FF6800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '12px',
              textAlign: 'center'
            }}
          >
            Authoritative Operational Market Milestones
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}
          >
            {[
              { time: '09:30 AM', title: 'Market Opens', desc: 'Opening Bell' },
              { time: '10:00 AM', title: 'Morning News', desc: 'Prep from 09:15' },
              { time: '11:45 AM', title: 'Floor Debate', desc: 'Prep from 11:30' },
              { time: '03:00 PM', title: 'Evening News', desc: 'Prep from 02:45' },
              { time: '03:30 PM', title: 'Market Closes', desc: 'Valuation Freeze' },
              { time: '04:00 PM', title: 'Championship Results', desc: 'Final Lock' }
            ].map((m, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(11, 25, 44, 0.04)'
                }}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.98rem', color: '#FF6800', marginBottom: '4px' }}>
                  {m.time}
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0B192C', marginBottom: '2px' }}>
                  {m.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 640px) {
            .saamx-schedule-tab-time { width: 44% !important; font-size: 1.05rem !important; padding: 10px 14px !important; }
            .saamx-schedule-tab-activity { padding: 10px 24px !important; font-size: 1.05rem !important; }
            .saamx-schedule-row { grid-template-columns: 44% 56% !important; padding: 12px 14px !important; }
            .saamx-schedule-row > div { font-size: 0.92rem !important; }
          }
        `}</style>
      </section>

      {/* 9. Final Call to Action */}
      <section
        style={{
          padding: '80px 28px',
          backgroundColor: '#0B192C',
          color: '#FFFFFF',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 16px 0'
            }}
          >
            Enter the SAAMX Trading Floor
          </h2>
          <p
            style={{
              fontSize: '1.08rem',
              color: '#94A3B8',
              lineHeight: 1.6,
              marginBottom: '36px'
            }}
          >
            Authorized student investment houses, floor runners, exchange operators, and regulatory overseers may sign in to access their assigned stations.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#/login"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 34px',
                backgroundColor: '#FF6800',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 4px 16px rgba(255, 104, 0, 0.4)'
              }}
            >
              <span>Enter Event Portal</span>
              <IconArrowRight size={16} />
            </a>

            <a
              href="#/portals"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              <span>Desks Directory</span>
              <IconArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 10. Clean Authoritative Footer */}
      <footer
        style={{
          padding: '36px 28px 28px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          fontSize: '0.85rem',
          color: '#64748B'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <SaamxLogo size="sm" />
            <div>
              <div style={{ fontWeight: 800, color: '#0B192C' }}>
                Student Academic Asset Market eXchange
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                Technical Directorate &bull; Official Inter-School Financial Simulation
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#/login" style={{ color: '#FF6800', textDecoration: 'none', fontWeight: 700 }}>
              Event Portal
            </a>
            <a href="#/portals" style={{ color: '#0B192C', textDecoration: 'none', fontWeight: 600 }}>
              Desks Directory
            </a>
            <a href="#/projector" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
              Live Projector
            </a>
            <span style={{ color: '#CBD5E1' }}>&bull;</span>
            <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
              SAAMX 2026
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
