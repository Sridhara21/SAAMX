import React, { useState, useMemo } from 'react';

export default function NewsAnchorConsole({ state }) {
  const [activeRundown, setActiveRundown] = useState('OPENING'); // 'OPENING' (10 AM) or 'CLOSING' (3 PM)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState({});

  const newsEvents = useMemo(() => Object.values(state?.newsEvents || []).filter(n => n.triggeredAt).sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0)), [state?.newsEvents]);
  const marketIndices = state?.marketIndices || {};
  const fxRates = state?.fxRates || {};

  // 10:00 AM Opening Broadcast Rundown (10 Public Headlines)
  const openingRundown = [
    {
      id: 'OP_1',
      category: 'MARKET OPENING',
      headline: 'Central Exchange Rings the Bell: SAAMX Global Trading Floor Now Live',
      body: 'Good morning ladies and gentlemen, welcome to the opening broadcast of SAAMX. Twenty collegiate trading teams have taken their desks with ₹1 Crore in starting capital across a curated universe of 1,800 global securities.',
      relevance: 'All desks active &bull; Continuous order matching enabled'
    },
    {
      id: 'OP_2',
      category: 'GLOBAL INDICES',
      headline: 'Global Indices Open Steady: SAAMX Global 100 Anchored at 1,000 Points',
      body: 'Our four flagship indices—the Global 100, India 50, US 100, and UK 100—open in balanced territory as participants begin price discovery across domestic and foreign exchange counters.',
      relevance: 'Baseline index values established'
    },
    {
      id: 'OP_3',
      category: 'CURRENCY DESK',
      headline: 'Foreign Exchange Desk Initiates Multi-Currency Conversions at 0.45% Spread',
      body: 'Teams seeking exposure to NASDAQ and London Stock Exchange constituents are actively visiting the Currency Exchange Desk. USD/INR is quoting at ₹88.20 spot with a tight 0.45% bid/ask spread.',
      relevance: 'FX Desk open under Mr. X / Sridhara supervision'
    },
    {
      id: 'OP_4',
      category: 'PRIMARY MARKET',
      headline: 'Primary Market Radar: 4 High-Intensity IPOs Staged for Subscription',
      body: 'Floor interest is mounting around four focused IPO listings: IndiaStack Fintech, Anthropic AI India, GreenHydra Clean Energy, and SpaceQ Propulsion. Subscription windows will open during continuous trading.',
      relevance: 'Primary capital allocation opportunity for growth funds'
    },
    {
      id: 'OP_5',
      category: 'MACRO OUTLOOK',
      headline: 'Central Bank Policy Expectations Drive Domestic Financials',
      body: 'Market analysts are forecasting steady monetary policy from the Reserve Bank, lending early structural support to banking and infrastructure counters.',
      relevance: 'Watch financial sector order volumes'
    },
    {
      id: 'OP_6',
      category: 'TECHNOLOGY',
      headline: 'Technology Large-Caps See Early Institutional Inquiry',
      body: 'IT majors including Infosys, TCS, Microsoft, and Apple are witnessing initial bid-ask formulation as teams position portfolios for sector momentum.',
      relevance: 'High volume expected in tech counters'
    },
    {
      id: 'OP_7',
      category: 'SURVEILLANCE',
      headline: 'SEBI Regulatory Console Establishes Floor Circuit Limits at ±30%',
      body: 'Exchange surveillance officials confirm that automatic circuit limits and order clearance gates are active to prevent abnormal volatility and ensure market integrity.',
      relevance: 'Surveillance desk monitoring floor velocity'
    },
    {
      id: 'OP_8',
      category: 'BROKER DESKS',
      headline: 'Floor Advisors and Bull/Bear Analysts Open Consultations',
      body: 'Participant teams are consulting dedicated Broker Advisors on the floor, balancing aggressive momentum strategies against disciplined risk management.',
      relevance: 'Advisory desks available for team consultations'
    },
    {
      id: 'OP_9',
      category: 'ENERGY & COMMODITIES',
      headline: 'Energy & Industrials Watch Global Supply Signals',
      body: 'Crude and renewable energy counters remain steady in early trade, providing diversification options for balanced retail portfolios.',
      relevance: 'Sector rotation potential later in the session'
    },
    {
      id: 'OP_10',
      category: 'FLOOR DIRECTIVE',
      headline: 'Trading Desks Urged to Monitor Real-Time Breaking Wires',
      body: 'With continuous trading now in full swing, participants are reminded that live news flashes will appear dynamically on the central projector. Stay sharp and trade wisely.',
      relevance: 'Live intelligence feed running throughout the day'
    }
  ];

  // 3:00 PM Closing Broadcast Rundown (10 Summary Headlines)
  const closingRundown = [
    {
      id: 'CL_1',
      category: 'CLOSING BELL',
      headline: 'Trading Concludes on SAAMX Floor: Order Matching Engines Locked',
      body: 'The final bell has rung on today\'s global market simulation. Over several hours of intense trading, hundreds of paper transactions have been validated and cleared across our multi-currency universe.',
      relevance: 'Trading session officially closed'
    },
    {
      id: 'CL_2',
      category: 'MARKET RECONCILIATION',
      headline: 'Exchange Operations Initiates Authoritative Multi-Currency Reconciliation',
      body: 'Auditors and exchange officials are now reconciling team cash reserves, open equity lots, and foreign currency balances to calculate final net worths and tournament rankings.',
      relevance: 'Atomic ledger reconciliation in progress'
    },
    {
      id: 'CL_3',
      category: 'INDEX PERFORMANCE',
      headline: 'Global Indices Snapshot: Technology & Domestic Equities Lead Day\'s Return',
      body: `Final session figures show the SAAMX Global 100 at ${Number(marketIndices.GLOBAL100?.currentValue || 1000).toFixed(1)} points and India 50 at ${Number(marketIndices.INDIA50?.currentValue || 5000).toFixed(1)} points, reflecting dynamic intraday price discovery.`,
      relevance: 'Composite index benchmarks finalized'
    },
    {
      id: 'CL_4',
      category: 'SECTOR HIGHLIGHT',
      headline: 'Technology and Clean Energy Outperform During Continuous Trading',
      body: 'Strong momentum behind artificial intelligence and renewable power counters rewarded early bull positioning, while defensive cash preservation proved crucial during afternoon volatility.',
      relevance: 'Sector leadership analysis'
    },
    {
      id: 'CL_5',
      category: 'IPO SUMMARY',
      headline: 'Primary Market Listings Deliver Heavy Turnover Across Desks',
      body: 'The listing of newly floated IPO assets provided significant trading spikes, with oversubscription demand creating active secondary market depth.',
      relevance: 'Primary-to-secondary market transition complete'
    },
    {
      id: 'CL_6',
      category: 'FX SUMMARY',
      headline: 'Currency Desk Records Robust Multi-Currency Conversion Volume',
      body: `The Foreign Exchange Desk processed substantial volume across USD, GBP, and EUR pairs, with USD/INR closing the session near ₹${(fxRates.USDINR?.midRate || 88.20).toFixed(2)}.`,
      relevance: 'Multi-currency settlement finalized'
    },
    {
      id: 'CL_7',
      category: 'VOLATILITY & REGULATION',
      headline: 'SEBI Surveillance Successfully Manages High-Beta Market Moves',
      body: 'Regulatory intervention, orderly circuit breaker enforcement, and prompt audit checks maintained fair execution across all participating teams.',
      relevance: 'Floor integrity maintained without systemic failure'
    },
    {
      id: 'CL_8',
      category: 'DEBATE & ADVISORY',
      headline: 'Bull and Bear Desks Clash in High-Stakes Afternoon Forum',
      body: 'Collegiate analysts presented compelling theses throughout the day, testing market theories against real simulated price action.',
      relevance: 'Advisory engagement enriched student strategy'
    },
    {
      id: 'CL_9',
      category: 'TEAM ACCOMPLISHMENT',
      headline: 'Twenty Trading Desks Demonstrate Exceptional Analytical Rigor',
      body: 'From retail stock-pickers to institutional funds, all teams executed disciplined strategies, navigating macro shocks and corporate actions with professionalism.',
      relevance: 'All teams successfully cleared ledger audits'
    },
    {
      id: 'CL_10',
      category: 'TOURNAMENT PODIUM',
      headline: 'Official Podium Results & Honor Awards Ready for Unveiling',
      body: 'With all portfolios reconciled and ranked, we now direct everyone\'s attention to the main auditorium projector for the official SAAMX Awards Ceremony.',
      relevance: 'Direct audience to #/results'
    }
  ];

  const currentRundown = activeRundown === 'OPENING' ? openingRundown : closingRundown;
  const currentItem = currentRundown[currentIndex] || currentRundown[0];

  const toggleComplete = (id) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F131C',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box'
    }}>
      
      {/* 1. Newsroom Header */}
      <header style={{
        backgroundColor: '#161C28',
        borderBottom: '2px solid #D4AF37',
        padding: '12px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #D4AF37, #845508)',
            color: '#000',
            fontWeight: 900,
            fontSize: '1rem',
            padding: '4px 10px',
            borderRadius: '4px',
            fontFamily: 'Cinzel, serif'
          }}>
            SAAMX NEWSROOM
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', margin: 0, fontFamily: 'Cinzel, serif', color: '#FFF' }}>
              🎙️ News Anchor & Broadcast Teleprompter
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              "Experience the Market. Don’t Just Learn It." &bull; OFFICIAL BROADCAST RUNDOWN &bull; LIVE TELEPROMPTER CONSOLE
            </span>
          </div>
        </div>

        {/* Rundown Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setActiveRundown('OPENING'); setCurrentIndex(0); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeRundown === 'OPENING' ? '2px solid #D4AF37' : '1px solid #2A3547',
              backgroundColor: activeRundown === 'OPENING' ? '#D4AF37' : '#1A2232',
              color: activeRundown === 'OPENING' ? '#000' : '#FFF',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🌅 10:00 AM Opening Rundown
          </button>
          <button
            onClick={() => { setActiveRundown('CLOSING'); setCurrentIndex(0); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeRundown === 'CLOSING' ? '2px solid #D4AF37' : '1px solid #2A3547',
              backgroundColor: activeRundown === 'CLOSING' ? '#D4AF37' : '#1A2232',
              color: activeRundown === 'CLOSING' ? '#000' : '#FFF',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🌇 3:00 PM Closing Rundown
          </button>
        </div>
      </header>

      {/* 2. Main Studio Split View */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: '20px',
        padding: '20px 28px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        
        {/* Left: Rundown Item List */}
        <div style={{
          backgroundColor: '#161C28',
          border: '1px solid #2A3547',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #2A3547', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase' }}>
              {activeRundown} RUNDOWN ({currentRundown.length} ITEMS)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#848E9C' }}>
              Item {currentIndex + 1} of {currentRundown.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentRundown.map((item, idx) => {
              const isSelected = currentIndex === idx;
              const isDone = completedItems[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.15)' : isDone ? 'rgba(16, 185, 129, 0.08)' : '#1E2638',
                    border: `1px solid ${isSelected ? '#D4AF37' : isDone ? '#10B981' : '#2A3547'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#D4AF37' : '#848E9C' }}>
                      #{idx + 1} &bull; {item.category}
                    </span>
                    {isDone && <span style={{ fontSize: '0.7rem', color: '#10B981' }}>✓ AIRED</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? '#FFF' : '#C5C9D3', lineHeight: 1.3 }}>
                    {item.headline}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Teleprompter Reader Pane */}
        <div style={{
          backgroundColor: '#161C28',
          border: '1px solid #2A3547',
          borderRadius: '12px',
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          
          <div>
            {/* Top Teleprompter Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{
                backgroundColor: '#D4AF37',
                color: '#000',
                padding: '4px 12px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '0.8rem',
                letterSpacing: '1px'
              }}>
                HEADLINE #{currentIndex + 1} &mdash; {currentItem.category}
              </span>
              <span style={{ color: '#848E9C', fontSize: '0.82rem' }}>
                Relevance: <strong style={{ color: '#FFF' }}>{currentItem.relevance}</strong>
              </span>
            </div>

            {/* Giant Prompter Headline */}
            <h2 style={{
              fontSize: '2rem',
              fontFamily: 'Cinzel, serif',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.3,
              margin: '0 0 24px 0',
              letterSpacing: '0.02em'
            }}>
              {currentItem.headline}
            </h2>

            {/* Large Prompter Reading Text */}
            <p style={{
              fontSize: '1.45rem',
              color: '#E1E4EA',
              lineHeight: 1.6,
              margin: 0,
              fontWeight: 500,
              backgroundColor: '#0F131C',
              padding: '24px',
              borderRadius: '10px',
              border: '1px solid #2A3547'
            }}>
              "{currentItem.body}"
            </p>
          </div>

          {/* Teleprompter Navigation Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #2A3547'
          }}>
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: currentIndex === 0 ? '#1E2638' : '#2A3547',
                color: currentIndex === 0 ? '#5A6376' : '#FFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ⬅️ PREVIOUS STORY
            </button>

            <button
              onClick={() => toggleComplete(currentItem.id)}
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                backgroundColor: completedItems[currentItem.id] ? '#10B981' : '#D4AF37',
                color: '#000',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {completedItems[currentItem.id] ? '✓ STORY AIRED (COMPLETED)' : '🎙️ MARK STORY AS AIRED'}
            </button>

            <button
              onClick={() => setCurrentIndex(Math.min(currentRundown.length - 1, currentIndex + 1))}
              disabled={currentIndex === currentRundown.length - 1}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: currentIndex === currentRundown.length - 1 ? '#1E2638' : '#2A3547',
                color: currentIndex === currentRundown.length - 1 ? '#5A6376' : '#FFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: currentIndex === currentRundown.length - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              NEXT STORY ➡️
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
