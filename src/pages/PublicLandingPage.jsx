import React, { useState } from 'react';
import { Card, Badge, Button, SaamxLogo } from '../components/ui/index.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {
  IconBuilding,
  IconTrendingUp,
  IconCurrencyExchange,
  IconShieldCheck,
  IconNewspaper,
  IconTrophy,
  IconClipboardList,
  IconArrowRight,
  IconTarget,
  IconBriefcase,
  IconCheck,
  IconPlay,
  IconX,
  IconBarChart
} from '../lib/icons.jsx';

export default function PublicLandingPage() {
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const scheduleEvents = [
    { time: '08:00', title: 'Reporting & Delegate Registration', desc: 'Teams receive physical trading kits, badge allocations, and initial credentials.' },
    { time: '08:00 – 09:00', title: 'Floor Briefing & Strategic Setup', desc: 'Orientation on physical paper order execution, currency rules, and trading conduct.' },
    { time: '09:00 – 09:30', title: 'Pre-Market Price Discovery', desc: 'Observation of market depth, baseline quotes, and corporate filings across floor monitors.' },
    { time: '09:30', title: 'Official Market Opening Bell', desc: 'Commencement of live floor trading across all equity and debt counters.' },
    { time: '10:00 – 12:00', title: 'Morning Trading Session', desc: 'Active execution of physical equity, foreign exchange spot, and institutional debt orders.' },
    { time: '12:00 – 13:00', title: 'Market Recess & Mid-Day Rehearsal', desc: 'Order intake suspended; teams review book values, sector news, and cash reserves.' },
    { time: '13:00 – 15:30', title: 'Afternoon Trading & Corporate Actions', desc: 'High-volatility phase: dynamic corporate bulletins, IPO tenders, and debate showdowns.' },
    { time: '15:30', title: 'Final Bell & Immutable Valuation Freeze', desc: 'Trading halted. Portfolios snapshotted for certified reconciliation.' },
    { time: '15:30 – 16:00', title: 'Audit Reconciliation & Regulatory Deliberation', desc: 'Regulatory compliance review, penalty adjudication, and score tabulation by SEBI.' },
    { time: '16:00', title: 'Valediction & Champion Awards', desc: 'Announcement of overall return champions, best portfolio strategy, and awards.' }
  ];

  const featureCards = [
    {
      title: 'Trade',
      subtitle: 'Financial Instruments',
      icon: <IconTrendingUp size={20} />,
      color: '#FF6800'
    },
    {
      title: 'Banking & Settlements',
      subtitle: 'Physical Cash & Clearance',
      icon: <IconBuilding size={20} />,
      color: '#2563EB'
    },
    {
      title: 'Currency Exchange',
      subtitle: 'Spot Multi-Currency FX',
      icon: <IconCurrencyExchange size={20} />,
      color: '#0284C7'
    },
    {
      title: 'IPO Applications',
      subtitle: 'Primary Market Bidding',
      icon: <IconTarget size={20} />,
      color: '#10B981'
    },
    {
      title: 'Advisors & Fund Managers',
      subtitle: 'Research & Guidance',
      icon: <IconBriefcase size={20} />,
      color: '#8B5CF6'
    }
  ];

  const pillars = [
    {
      icon: <IconBuilding size={24} />,
      title: 'Institutional Universe',
      desc: 'Trade across an institutional universe of 2,000+ securities encompassing equities, sovereign debt, ETFs, and REITs.'
    },
    {
      icon: <IconClipboardList size={24} />,
      title: 'Physical Paper Desks',
      desc: 'True-to-life floor operations. Floor runners deliver standardized physical order slips to 5 synchronized Exchange Desks for atomic matching.'
    },
    {
      icon: <IconCurrencyExchange size={24} />,
      title: 'Multi-Currency Settlement',
      desc: 'Active foreign exchange spot conversions across INR, USD, GBP, and EUR to manage international equity positions and currency risks.'
    },
    {
      icon: <IconShieldCheck size={24} />,
      title: 'SEBI Regulatory Watch',
      desc: 'Independent surveillance monitoring price-band circuit breakers, insider trade flags, front-running anomalies, and formal audits.'
    },
    {
      icon: <IconNewspaper size={24} />,
      title: 'Macro Intelligence Wire',
      desc: 'Breaking news flashes, crisis acts, corporate mergers, and analyst bulletins that shift market sentiment in real time.'
    },
    {
      icon: <IconTrophy size={24} />,
      title: 'Certified Valuation Freeze',
      desc: 'Idempotent 15:30 closing snapshots ensure zero post-bell tampering, producing audited scorecards for judicial evaluation.'
    }
  ];

  const highlights = [
    { value: '2,000+', label: 'Securities Directory', color: 'var(--color-navy, #0B192C)' },
    { value: '10', label: 'Investment Houses', color: 'var(--color-orange, #FF6800)' },
    { value: '₹1 Crore', label: 'Starting Capital / Team', color: 'var(--color-gain, #059669)' },
    { value: '5', label: 'Physical Order Desks', color: 'var(--color-navy, #0B192C)' },
    { value: 'SEBI', label: 'Surveillance & Oversight', color: '#0284C7' }
  ];

  const onboardingSteps = [
    {
      title: 'Trade diverse financial instruments',
      desc: 'Stocks, ETFs, Bonds, Derivatives',
      icon: <IconTrendingUp size={18} />
    },
    {
      title: 'Manage your portfolio',
      desc: 'Track & Analyse real-time holdings and returns',
      icon: <IconBarChart size={18} />
    },
    {
      title: 'Respond to live market news',
      desc: 'Real-time updates, flash catalysts & events',
      icon: <IconNewspaper size={18} />
    },
    {
      title: 'Work with industry-like desks',
      desc: 'Exchange, Bank, FX, and IPO counters',
      icon: <IconBuilding size={18} />
    },
    {
      title: 'Compete with teams across schools',
      desc: 'Strategy, performance metrics & rankings',
      icon: <IconTrophy size={18} />
    },
    {
      title: 'Build real-world financial skills',
      desc: 'Research, quantitative analysis & decision-making',
      icon: <IconBriefcase size={18} />
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-canvas, #F4F7FB)',
        backgroundImage: 'radial-gradient(circle at 80% 10%, rgba(255, 104, 0, 0.05) 0%, transparent 45%), radial-gradient(circle at 20% 40%, rgba(37, 99, 235, 0.05) 0%, transparent 45%)',
        color: 'var(--color-ink, #0F172A)',
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
        overflowX: 'hidden',
        transition: 'background-color 0.25s ease, color 0.25s ease'
      }}
    >
      {/* Top Public Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border, #E2E8F0)',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)',
          padding: '14px 28px'
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px'
          }}
        >
          {/* Logo & Brand Identity */}
          <a href="#/" style={{ textDecoration: 'none' }}>
            <SaamxLogo size="md" showSubtitle={false} />
          </a>

          {/* Center Navigation Links matching reference */}
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
                fontSize: '0.90rem',
                fontWeight: 700,
                color: 'var(--color-navy, #0B192C)',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              Home
            </a>
            <button
              type="button"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.90rem',
                fontWeight: 600,
                color: 'var(--color-ink-secondary, #475569)',
                transition: 'color 0.15s ease'
              }}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.90rem',
                fontWeight: 600,
                color: 'var(--color-ink-secondary, #475569)',
                transition: 'color 0.15s ease'
              }}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.90rem',
                fontWeight: 600,
                color: 'var(--color-ink-secondary, #475569)',
                transition: 'color 0.15s ease'
              }}
            >
              Schedule
            </button>
            <a
              href="#/portals"
              style={{
                fontSize: '0.90rem',
                fontWeight: 600,
                color: 'var(--color-ink-secondary, #475569)',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
            >
              Desks Directory
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="#/login" style={{ textDecoration: 'none' }} className="desktop-only">
              <Button
                variant="secondary"
                size="sm"
                style={{
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  padding: '7px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderColor: 'var(--color-border)'
                }}
              >
                Login
              </Button>
            </a>

            <a href="#/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="sm"
                icon={<IconArrowRight size={14} />}
                iconPosition="right"
                style={{
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  padding: '8px 20px',
                  background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                  boxShadow: '0 4px 14px -2px rgba(255, 104, 0, 0.35)',
                  color: '#FFFFFF'
                }}
              >
                Get Started
              </Button>
            </a>

            
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '60px 28px 70px',
          maxWidth: '1360px',
          margin: '0 auto'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Heading, Subtitle & Primary Actions */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-navy, #0B192C)',
                marginBottom: '16px',
                padding: '4px 14px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
              }}
            >
              SIMULATE &bull; TRADE &bull; INVEST &bull; LEAD
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                fontWeight: 900,
                lineHeight: 1.14,
                color: 'var(--color-navy, #0B192C)',
                fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
                letterSpacing: '-0.03em',
                marginBottom: '18px'
              }}
            >
              The Simulated Market.<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF6800 0%, #EA580C 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block'
                }}
              >
                Real Decisions.
              </span>
            </h1>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 700, color: '#0B192C', marginBottom: '16px', padding: '6px 14px', borderRadius: '8px', backgroundColor: 'rgba(255, 104, 0, 0.08)', border: '1px solid rgba(255, 104, 0, 0.2)' }}><span style={{ color: '#FF6800' }}>&ldquo;Experience the market, don&apos;t just plan it.&rdquo;</span></div>

            <p
              style={{
                fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
                lineHeight: 1.65,
                color: 'var(--color-ink-secondary, #475569)',
                maxWidth: '620px',
                marginBottom: '32px',
                fontWeight: 400
              }}
            >
              SAAMX is an inter-school financial market where student teams trade, invest and manage virtual capital across multiple asset classes — from stocks and bonds to currencies, IPOs and more.
            </p>

            {/* CTAs matching reference */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
              <a href="#/login" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<IconArrowRight size={16} />}
                  iconPosition="right"
                  style={{
                    borderRadius: '9999px',
                    padding: '14px 34px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                    boxShadow: '0 6px 20px -2px rgba(255, 104, 0, 0.45)',
                    color: '#FFFFFF'
                  }}
                >
                  Enter Event Portal
                </Button>
              </a>

              <button
                type="button"
                onClick={() => setShowOnboardingModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '9999px',
                  padding: '13px 26px',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--color-navy, #0B192C)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                className="saamx-btn-glass"
              >
                <span>Explore the Event</span>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(11, 25, 44, 0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '2px'
                  }}
                >
                  <IconPlay size={12} style={{ fill: 'currentColor', marginLeft: '1px' }} />
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Architectural Cityscape Graphic with Upward Orange Line & Glass Quote */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div
              className="saamx-glass-panel"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '540px',
                height: '420px',
                borderRadius: '24px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8)'
              }}
            >
              <img
                src="/saamx-concept-hero.jpg"
                alt="SAAMX Financial Simulation"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />

              {/* Floating Glass Quote Card matching reference bottom right */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '24px',
                  padding: '14px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.15)',
                  maxWidth: '260px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF6800' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    LIVE FLOOR SIMULATION
                  </span>
                </div>
                <div style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--color-ink, #0F172A)', lineHeight: 1.3 }}>
                  Experience the market, don't just plan it.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Row of 5 Frosted Glass Feature Cards matching reference */}
        <div
          id="features"
          style={{
            marginTop: '50px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}
        >
          {featureCards.map((c, idx) => (
            <div
              key={idx}
              className="saamx-glass-panel"
              style={{
                padding: '22px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer'
              }}
              onClick={() => setShowOnboardingModal(true)}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  color: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                  flexShrink: 0
                }}
              >
                {c.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: 'var(--color-navy, #0B192C)',
                    lineHeight: 1.2,
                    marginBottom: '2px'
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-ink-muted, #64748B)',
                    fontWeight: 500
                  }}
                >
                  {c.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Championship Metrics Strip */}
      <section
        style={{
          padding: '0 28px 60px',
          maxWidth: '1360px',
          margin: '0 auto'
        }}
      >
        <div
          className="saamx-glass-panel"
          style={{
            padding: '28px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)'
          }}
        >
          {highlights.map((h, idx) => (
            <div key={idx} style={{ textAlign: 'center' }}>
              <div
                className="tabular-nums"
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  color: h.color,
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1.15
                }}
              >
                {h.value}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-ink-secondary, #475569)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '6px'
                }}
              >
                {h.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How The SAAMX Exchange Operates (Pillars) */}
      <section
        id="how-it-works"
        style={{
          padding: '40px 28px 70px',
          maxWidth: '1360px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              color: 'var(--color-orange, #FF6800)',
              fontSize: '0.80rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            Engineered For Authenticity
          </div>
          <h2
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              color: 'var(--color-navy, #0B192C)',
              fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            How The SAAMX Exchange Operates
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}
        >
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="saamx-glass-panel"
              style={{
                padding: '30px 26px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 104, 0, 0.08)',
                  border: '1px solid rgba(255, 104, 0, 0.2)',
                  color: 'var(--color-orange, #FF6800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}
              >
                {p.icon}
              </div>
              <h3
                style={{
                  fontSize: '1.22rem',
                  fontWeight: 800,
                  color: 'var(--color-navy, #0B192C)',
                  fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
                  marginBottom: '10px'
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--color-ink-secondary, #475569)',
                  lineHeight: 1.6,
                  margin: 0
                }}
              >
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Master Event Schedule & Canonical Rules */}
      <section
        id="schedule"
        style={{
          padding: '60px 28px',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div
              style={{
                color: 'var(--color-orange, #FF6800)',
                fontSize: '0.80rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              Canonical Competition Protocol
            </div>
            <h2
              style={{
                fontSize: '2.3rem',
                fontWeight: 800,
                color: 'var(--color-navy, #0B192C)',
                fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
                letterSpacing: '-0.02em',
                margin: '0 0 8px 0'
              }}
            >
              Official Event Schedule
            </h2>
            <p
              style={{
                color: 'var(--color-ink-secondary, #475569)',
                fontSize: '0.90rem',
                margin: 0
              }}
            >
              Host Institution & Campus Date: Subject to Event Secretariat Announcement. Timings below indicate canonical operational flow.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scheduleEvents.map((item, idx) => (
              <div
                key={idx}
                className="saamx-glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  padding: '18px 24px',
                  flexWrap: 'wrap',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }}
              >
                <div
                  className="tabular-nums"
                  style={{
                    minWidth: '130px',
                    fontWeight: 800,
                    fontSize: '0.94rem',
                    color: 'var(--color-navy, #0B192C)',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}
                >
                  {item.time}
                </div>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--color-navy, #0B192C)',
                      marginBottom: '3px'
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--color-ink-secondary, #475569)',
                      lineHeight: 1.5
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Entry CTA Banner */}
      <section
        style={{
          padding: '80px 28px',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.6rem',
              fontWeight: 900,
              color: 'var(--color-navy, #0B192C)',
              fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
              letterSpacing: '-0.02em',
              marginBottom: '16px'
            }}
          >
            Ready For Market Open?
          </h2>
          <p
            style={{
              color: 'var(--color-ink-secondary, #475569)',
              fontSize: '1.05rem',
              lineHeight: 1.6,
              marginBottom: '36px'
            }}
          >
            Registered Investment Houses, Verification Officers, Exchange Operators, and Regulatory Observers may access the floor below.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="#/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="lg"
                icon={<IconArrowRight size={16} />}
                iconPosition="right"
                style={{
                  borderRadius: '9999px',
                  padding: '15px 36px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                  boxShadow: '0 6px 20px -2px rgba(255, 104, 0, 0.45)',
                  color: '#FFFFFF'
                }}
              >
                Enter Event Portal
              </Button>
            </a>
            <a href="#/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="secondary"
                size="lg"
                style={{
                  borderRadius: '9999px',
                  padding: '15px 32px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-navy, #0B192C)'
                }}
              >
                Floor Gateway Access →
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Onboarding Interactive Modal matching top right reference image */}
      {showOnboardingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            backgroundColor: 'rgba(11, 25, 44, 0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowOnboardingModal(false)}
        >
          <div
            className="saamx-glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with SAAMX logo and Skip button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <SaamxLogo size="sm" />
              <button
                type="button"
                onClick={() => setShowOnboardingModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-ink-muted, #64748B)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Skip</span>
                <IconX size={16} />
              </button>
            </div>

            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 900,
                color: 'var(--color-navy, #0B192C)',
                fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
                lineHeight: 1.2,
                marginBottom: '24px'
              }}
            >
              More than a simulation.<br />
              A real-world experience.
            </h2>

            {/* List of 6 items with circular icons matching reference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              {onboardingSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(240, 244, 249, 0.5)'
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-navy, #0B192C)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted, #64748B)' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href="#/login"
                onClick={() => setShowOnboardingModal(false)}
                style={{
                  fontSize: '0.90rem',
                  fontWeight: 700,
                  color: 'var(--color-orange, #FF6800)',
                  textDecoration: 'none'
                }}
              >
                Register Your Team →
              </a>

              <a
                href="#/login"
                onClick={() => setShowOnboardingModal(false)}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px -2px rgba(255, 104, 0, 0.45)'
                }}
                title="Enter Market Gateway"
              >
                <IconArrowRight size={20} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          padding: '36px 32px 28px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.84rem',
          color: 'var(--color-ink-secondary, #475569)'
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
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
              <div style={{ fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
                Student Academic Asset Market eXchange
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted, #64748B)' }}>
                Technical Directorate & Event Secretariat | Copyright © 2026 Medam Sridhara. All Rights Reserved.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#/login" style={{ color: 'var(--color-orange, #FF6800)', textDecoration: 'none', fontWeight: 700 }}>Floor Access</a>
            <a href="#/login" style={{ color: 'var(--color-navy, #0B192C)', textDecoration: 'none', fontWeight: 600 }}>Staff & Team Login</a>
            <a href="#/projector" style={{ color: 'var(--color-ink-secondary, #475569)', textDecoration: 'none', fontWeight: 600 }}>Public Projector</a>
            <a href="#/portals" style={{ color: 'var(--color-ink-secondary, #475569)', textDecoration: 'none', fontWeight: 600 }}>Desks & Portals</a>
            <span style={{ color: 'var(--color-ink-muted, #94A3B8)' }}>Private Academic Simulation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
