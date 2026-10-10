import React, { useState, useMemo } from 'react';
import CompanyProfileModal from '../components/CompanyProfileModal.jsx';
import { apiFetch } from '../lib/api.js';

export default function BrokerAdvisoryTerminal({ state, onOpenProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [advisorName, setAdvisorName] = useState(sessionStorage.getItem('fms_username') || 'Senior Floor Advisor');
  const [signalLoadingId, setSignalLoadingId] = useState(null);
  const [signalNotice, setSignalNotice] = useState('');
  
  // Broker Notes State
  const [noteText, setNoteText] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [brokerNotes, setBrokerNotes] = useState([
    {
      id: 'N1',
      author: 'Senior Advisor (Floor 1)',
      time: '10:15 AM',
      text: 'Technology large-caps exhibiting strong momentum post sector news. Watching semiconductor valuations closely.',
      isPublic: true
    },
    {
      id: 'N2',
      author: 'Macro Advisor',
      time: '11:05 AM',
      text: 'USD/INR strengthening towards ₹88.60. Teams with unhedged import-heavy equities should consider defensive cash allocation.',
      isPublic: true
    }
  ]);

  const referrals = useMemo(() => {
    return Array.isArray(state?.advisorReferrals) ? state.advisorReferrals : Object.values(state?.advisorReferrals || {});
  }, [state?.advisorReferrals]);

  const pendingReferrals = useMemo(() => {
    return referrals.filter(r => r.status === 'PENDING').reverse();
  }, [referrals]);

  const completedReferrals = useMemo(() => {
    return referrals.filter(r => r.status === 'COMPLETED').reverse().slice(0, 10);
  }, [referrals]);

  const handlePublishSignal = async (referralId, signal) => {
    setSignalLoadingId(referralId);
    try {
      const res = await apiFetch('/api/advisor/signal', {
        method: 'POST',
        body: JSON.stringify({
          referralId,
          signal,
          advisorName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch signal');
      setSignalNotice(`✓ Successfully published ${signal} signal for referral #${referralId.slice(-6)}`);
      setTimeout(() => setSignalNotice(''), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSignalLoadingId(null);
    }
  };

  const securities = useMemo(() => Object.values(state?.securities || {}), [state?.securities]);
  const newsEvents = useMemo(() => Object.values(state?.newsEvents || []).sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0)), [state?.newsEvents]);
  const marketIndices = state?.marketIndices || {};
  const fxRates = state?.fxRates || {};

  const sectorList = useMemo(() => {
    return ['ALL', ...Array.from(new Set(securities.map(s => s.sector).filter(Boolean)))];
  }, [securities]);

  // Filtered Securities
  const filteredSecurities = useMemo(() => {
    return securities.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || s.ticker?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
      const matchSector = selectedSector === 'ALL' || s.sector === selectedSector;
      return matchQuery && matchSector && s.status !== 'UNLISTED';
    });
  }, [securities, searchQuery, selectedSector]);

  // Top Movers for Quick Advisory
  const topGainers = useMemo(() => {
    return [...securities]
      .filter(s => s.status === 'Active')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
        return { ...s, pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [securities]);

  const topLosers = useMemo(() => {
    return [...securities]
      .filter(s => s.status === 'Active')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
        return { ...s, pct };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, [securities]);

  // Analytical Bull / Bear thesis generation based on publicly visible data
  const getSecurityThesis = (sec) => {
    if (!sec) return { bull: [], bear: [] };
    const cur = sec.currentPrice || sec.basePrice || 100;
    const open = sec.openingPrice || sec.basePrice || cur;
    const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
    const isUp = pct >= 0;

    const bull = [
      `Sector Momentum: ${sec.sector || 'Equities'} trading with positive structural demand on the central exchange.`,
      `Price Discovery: Traded at ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% over base price (₹${open}).`,
      `Valuation Catalyst: Strong institutional order clearance and steady market depth.`
    ];

    const bear = [
      `Downside Exposure: High intraday volatility with regulatory circuit limits active at ±30%.`,
      `Macro Risks: Currency and interest-rate sensitivity may compress near-term profit multiples.`,
      `Overextension Risk: Rapid price appreciation increases the likelihood of sudden institutional profit taking.`
    ];

    return { bull, bear };
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const newNote = {
      id: `N_${Date.now()}`,
      author: 'Floor Broker Advisor',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: noteText,
      isPublic: isPublished
    };
    setBrokerNotes([newNote, ...brokerNotes]);
    setNoteText('');
    setIsPublished(false);
  };

  const activeThesis = selectedSecurity ? getSecurityThesis(selectedSecurity) : null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'linear-gradient(135deg, #1E232B, #333d4b)', color: '#D4AF37', padding: '4px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.85rem' }}>
              SAAMX
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--color-ink)', margin: 0 }}>
              💼 Broker & Market Advisor Terminal
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>
            "Experience the Market. Don’t Just Learn It." &bull; Strategic Floor Research &bull; Bull/Bear Theses &bull; Strictly Non-Execution
          </p>
        </div>

        {/* Live FX & Status Pill */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ background: 'var(--color-paper-subtle)', border: '1px solid var(--color-border)', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem' }}>
            USD/INR: <strong style={{ color: 'var(--color-rise)' }}>₹{(fxRates.USDINR?.midRate || 88.20).toFixed(2)}</strong>
          </div>
          <span className="badge badge-rise" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            ● Advisory Active (Zero Order Execution)
          </span>
        </div>
      </div>

      {/* 4 Dedicated Advisory Desks Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {[
          { title: 'Domestic Equity Advisor', name: 'Rahul Sen', focus: 'NSE/BSE Bluechips & Midcap Alpha', status: 'Available', icon: '🏛️' },
          { title: 'Global Equity Advisor', name: 'Elena Rostova', focus: 'US/UK Megacaps & Tech ADRs', status: 'Available', icon: '🌐' },
          { title: 'FX / Macro Advisor', name: 'Marcus Vance', focus: 'USD/INR Hedging & Rate Curves', status: 'Available', icon: '💱' },
          { title: 'Risk & Compliance Advisor', name: 'Sunita Agarwal', focus: 'Drawdown Limits & Circuit Bands', status: 'Active', icon: '🛡️' }
        ].map((adv, idx) => (
          <div key={idx} style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', fontWeight: 800 }}>{adv.icon} {adv.title.toUpperCase()}</span>
              <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 900, background: '#ECFDF5', padding: '1px 6px', borderRadius: '3px' }}>● {adv.status}</span>
            </div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>{adv.name}</strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)' }}>Focus: {adv.focus}</span>
          </div>
        ))}
      </div>

      {/* 2. Top Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {[
          { label: 'GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
          { label: 'INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
          { label: 'US 100', val: marketIndices.US100?.currentValue || 8000, chg: marketIndices.US100?.changePercent || 0 },
          { label: 'UK 100', val: marketIndices.UK100?.currentValue || 4000, chg: marketIndices.UK100?.changePercent || 0 }
        ].map((idx, i) => {
          const isUp = idx.chg >= 0;
          return (
            <div key={i} className="card-metric" style={{ padding: '12px 16px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', fontWeight: 800 }}>SAAMX {idx.label}</span>
              <div className="font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-ink)', lineHeight: 1.2 }}>
                {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isUp ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                {isUp ? '▲ +' : '▼ '}{Math.abs(idx.chg).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* 2.5 INCOMING TEAM STOCK REFERRALS QUEUE (Strict BUY / HOLD / SELL Signal Dispatch) */}
      <div style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>📢</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                Incoming Stock Referrals Queue ({pendingReferrals.length} Pending)
              </h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-ink-2)' }}>
              Investment Houses refer securities for rapid Floor Advisor review. Advisors provide strictly ONE signal: BUY, HOLD, or SELL.
            </p>
          </div>
          {signalNotice && (
            <div style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              {signalNotice}
            </div>
          )}
        </div>

        {pendingReferrals.length === 0 ? (
          <div style={{ background: 'var(--color-paper-subtle)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>
            No pending stock referrals from Investment Houses at this time.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {pendingReferrals.map(ref => (
              <div
                key={ref.id}
                style={{
                  background: 'var(--color-paper-subtle)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '5px solid var(--color-brass)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-brass)' }}>
                      HOUSE {ref.teamCode}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '2px 0 0', color: 'var(--color-ink)' }}>
                      {ref.ticker}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                      {ref.securityName || ref.ticker}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>
                    {new Date(ref.submittedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '4px' }}>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'BUY')}
                    style={{
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 0',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                    }}
                  >
                    🟢 BUY
                  </button>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'HOLD')}
                    style={{
                      background: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 0',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                    }}
                  >
                    🟡 HOLD
                  </button>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'SELL')}
                    style={{
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 0',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                    }}
                  >
                    🔴 SELL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently published signals strip */}
        {completedReferrals.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-ink-2)', textTransform: 'uppercase' }}>
              Recently Dispatched Signals
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {completedReferrals.map(cr => (
                <div
                  key={cr.id}
                  style={{
                    background: 'var(--color-paper-subtle)',
                    border: '1px solid var(--color-border)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <strong style={{ color: 'var(--color-ink)' }}>{cr.teamCode}</strong>: {cr.ticker} ➔
                  <span style={{
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    background: cr.signal === 'BUY' ? '#059669' : cr.signal === 'HOLD' ? '#D97706' : '#DC2626'
                  }}>
                    {cr.signal}
                  </span>
                  <span style={{ color: 'var(--color-ink-2)', fontSize: '0.68rem' }}>
                    ({cr.advisorName || 'Advisor'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Security Search & Advisory Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: '20px' }}>
        
        {/* Left Column: Securities Directory & Top Movers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Search Card */}
          <div className="card-data" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              🔍 Security Research Directory
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search Ticker (e.g. INFY, AAPL)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              >
                {sectorList.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>
                ))}
              </select>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)', background: 'var(--color-paper-subtle)' }}>
                    <th style={{ padding: '6px 8px' }}>TICKER</th>
                    <th style={{ padding: '6px 8px' }}>NAME</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>PRICE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSecurities.slice(0, 40).map(s => (
                    <tr
                      key={s.ticker}
                      onClick={() => setSelectedSecurity(s)}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        backgroundColor: selectedSecurity?.ticker === s.ticker ? 'var(--color-paper-subtle)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: 900, color: 'var(--color-brass)' }}>{s.ticker}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--color-ink)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        ₹{s.currentPrice || s.basePrice}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenProfile) onOpenProfile(s.ticker);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                        >
                          Dossier ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Movers Mini-Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="card-data" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-rise)', display: 'block', marginBottom: '8px' }}>
                🚀 Top Floor Gainers
              </span>
              {topGainers.map(s => (
                <div key={s.ticker} onClick={() => setSelectedSecurity(s)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px dashed var(--color-border)', cursor: 'pointer' }}>
                  <strong style={{ color: 'var(--color-brass)' }}>{s.ticker}</strong>
                  <span style={{ color: 'var(--color-rise)', fontWeight: 800 }}>+{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            <div className="card-data" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-fall)', display: 'block', marginBottom: '8px' }}>
                🔻 Top Floor Losers
              </span>
              {topLosers.map(s => (
                <div key={s.ticker} onClick={() => setSelectedSecurity(s)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px dashed var(--color-border)', cursor: 'pointer' }}>
                  <strong style={{ color: 'var(--color-brass)' }}>{s.ticker}</strong>
                  <span style={{ color: 'var(--color-fall)', fontWeight: 800 }}>{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Advisory Intelligence Dossier & Bull/Bear Cases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {selectedSecurity ? (
            <div className="card-data" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <span className="badge badge-rise" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{selectedSecurity.sector || 'General Sector'}</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-ink)', margin: 0 }}>
                    {selectedSecurity.name} ({selectedSecurity.ticker})
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Exchange: {selectedSecurity.exchange || 'NSE'} &bull; Currency: {selectedSecurity.currency || 'INR'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-data" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-ink)' }}>
                    ₹{selectedSecurity.currentPrice || selectedSecurity.basePrice}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                    Base Price: ₹{selectedSecurity.basePrice}
                  </span>
                </div>
              </div>

              {/* Bull vs Bear Thesis Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                
                {/* Bull Thesis */}
                <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.05)', border: '1px solid rgba(6, 95, 62, 0.25)', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-rise)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span>🐂</span> BULL CASE & CATALYSTS
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--color-ink)', lineHeight: 1.45 }}>
                    {activeThesis?.bull.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Bear Thesis */}
                <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.05)', border: '1px solid rgba(147, 25, 19, 0.25)', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-fall)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span>🐻</span> BEAR CASE & RISKS
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--color-ink)', lineHeight: 1.45 }}>
                    {activeThesis?.bear.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                    ))}
                  </ul>
                </div>

              </div>

              <button
                onClick={() => onOpenProfile && onOpenProfile(selectedSecurity.ticker)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                📑 Open Complete Security Research Dossier
              </button>
            </div>
          ) : (
            <div className="card-data" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-2)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🔍</span>
              <h3 style={{ color: 'var(--color-ink)', margin: '0 0 6px 0' }}>No Security Selected</h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Select any security from the directory on the left to inspect live advisory intelligence and Bull/Bear catalysts.
              </p>
            </div>
          )}

          {/* Broker Notes & Market Insights */}
          <div className="card-data" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              ✍️ Broker Advisory Notes & Insights
            </h3>

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <textarea
                rows={2}
                placeholder="Compose market advisory note or floor recommendation..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                  />
                  Publish as Public Floor Insight
                </label>
                <button type="submit" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                  Save Note
                </button>
              </div>
            </form>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brokerNotes.map(n => (
                <div key={n.id} style={{ background: 'var(--color-paper-subtle)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.72rem' }}>
                    <strong style={{ color: 'var(--color-brass)' }}>{n.author}</strong>
                    <span style={{ color: 'var(--color-ink-2)' }}>{n.time} {n.isPublic && '• 🌐 Public'}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink)', lineHeight: 1.35 }}>
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
