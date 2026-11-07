import React, { useState, useMemo, useEffect } from 'react';
import CompanyProfileModal from '../components/CompanyProfileModal.jsx';
import { apiFetch } from '../lib/api.js';
import { Card, Badge, Button, Input } from '../components/ui/index.js';
import {
  IconBriefcase,
  IconBuilding,
  IconGlobe,
  IconCurrencyExchange,
  IconShieldAlert,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconScale,
  IconSearch,
  IconFileText,
  IconMegaphone,
  IconTarget,
  IconActivity,
  IconEye,
  IconCheck
} from '../lib/icons.jsx';
import {
  getCompanyFundamentals,
  getCompanyRatios,
  getValuationAnalysis,
  getAnalyticalPerspectives,
  getSectorBenchmark
} from '../lib/companyFundamentals.js';

export default function BrokerAdvisoryTerminal({ state, onOpenProfile, initialView = 'advisory' }) {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('view=bull') || hash.includes('#/bull')) return 'bull';
      if (hash.includes('view=bear') || hash.includes('#/bear')) return 'bear';
    }
    return initialView;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [advisorName, setAdvisorName] = useState(sessionStorage.getItem('fms_username') || 'Senior Floor Advisor');
  const [signalLoadingId, setSignalLoadingId] = useState(null);
  const [signalNotice, setSignalNotice] = useState('');

  // Formal Research Recommendation Publisher State
  const [recTicker, setRecTicker] = useState('');
  const [recRecommendation, setRecRecommendation] = useState('BUY');
  const [recConfidence, setRecConfidence] = useState(85);
  const [recRiskLevel, setRecRiskLevel] = useState('MEDIUM');
  const [recTimeframe, setRecTimeframe] = useState('MEDIUM');
  const [recReasoning, setRecReasoning] = useState('');
  const [recPublishing, setRecPublishing] = useState(false);
  const [recNotice, setRecNotice] = useState('');

  // Synchronize ticker input when security selection changes
  useEffect(() => {
    if (selectedSecurity?.ticker) {
      setRecTicker(selectedSecurity.ticker);
    }
  }, [selectedSecurity]);

  // Bull & Bear Talking Points State
  const [bullPointText, setBullPointText] = useState('');
  const [bullPoints, setBullPoints] = useState([
    { id: 'BP1', title: 'Macro Tech Expansion', arg: 'Global technology constituents are experiencing strong momentum from cloud and semiconductor capital expenditure. Long positions in large-cap software provide superior upside exposure.' },
    { id: 'BP2', title: 'Primary IPO Upside', arg: 'Strong secondary market liquidity indicates high oversubscription appetites for upcoming IPOs (OAI, STRP, CNVA). Growth teams should aggressively bid for full float allotments in USD.' }
  ]);

  const [bearPointText, setBearPointText] = useState('');
  const [bearPoints, setBearPoints] = useState([
    { id: 'BE1', title: 'Overextended Valuations & Bubble Risk', arg: 'Multiple momentum equities are trading at unsustainable multiples relative to underlying book value. Teams overconcentrated in single-sector high-beta assets risk severe drawdowns upon profit taking.' },
    { id: 'BE2', title: 'Macro & Regulatory Headwinds', arg: 'Tightening foreign exchange spreads and SEBI surveillance on excessive intraday order velocity increase circuit-breaker risks. Capital preservation in cash or balanced defensive allocations is critical.' }
  ]);

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

  const publishedRecommendations = useMemo(() => {
    const list = state?.brokerRecommendations;
    if (Array.isArray(list)) return list;
    if (list && typeof list === 'object') return Object.values(list);
    return [];
  }, [state?.brokerRecommendations]);

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

  const handlePublishRecommendation = async (e) => {
    e.preventDefault();
    const tick = (recTicker || selectedSecurity?.ticker || '').toUpperCase().trim();
    if (!tick) {
      alert('Please select or enter a ticker symbol.');
      return;
    }
    setRecPublishing(true);
    try {
      const res = await apiFetch('/api/broker/recommendation', {
        method: 'POST',
        body: JSON.stringify({
          brokerName: advisorName,
          ticker: tick,
          recommendation: recRecommendation,
          confidence: Number(recConfidence) || 80,
          reasoning: recReasoning || `${recRecommendation} recommendation supported by fundamental valuation and margin profile.`,
          riskLevel: recRiskLevel,
          timeframe: recTimeframe
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish recommendation');
      setRecNotice(`✓ Successfully broadcast ${recRecommendation} recommendation for ${tick}`);
      setRecReasoning('');
      setTimeout(() => setRecNotice(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setRecPublishing(false);
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

  // Fundamental Calculations & Analytical Perspectives for Selected Security
  const fundamentals = useMemo(() => {
    return selectedSecurity ? getCompanyFundamentals(selectedSecurity) : null;
  }, [selectedSecurity]);

  const ratios = useMemo(() => {
    return selectedSecurity ? getCompanyRatios(selectedSecurity) : null;
  }, [selectedSecurity]);

  const valuation = useMemo(() => {
    return (selectedSecurity && ratios) ? getValuationAnalysis(selectedSecurity, ratios, fundamentals) : null;
  }, [selectedSecurity, ratios, fundamentals]);

  const perspectives = useMemo(() => {
    return (selectedSecurity && ratios && valuation) ? getAnalyticalPerspectives(selectedSecurity, ratios, valuation) : null;
  }, [selectedSecurity, ratios, valuation]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const newNote = {
      id: `N_${Date.now()}`,
      author: advisorName || 'Floor Broker Advisor',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: noteText,
      isPublic: isPublished
    };
    setBrokerNotes([newNote, ...brokerNotes]);
    setNoteText('');
    setIsPublished(false);
  };

  // Bullish Opportunities (Strongest Gainers & Positive Momentum)
  const topBullPicks = useMemo(() => {
    return [...securities]
      .filter(s => s.status === 'Active')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
        return { ...s, pct, cur };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [securities]);

  // Bearish & Vulnerable Picks (Biggest Losers & High Volatility)
  const topBearPicks = useMemo(() => {
    return [...securities]
      .filter(s => s.status === 'Active')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
        return { ...s, pct, cur };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8);
  }, [securities]);

  // Positive News Catalysts
  const positiveNews = useMemo(() => {
    return newsEvents.filter(n => n.sentiment === 'Positive' || (n.impactPercent || 0) > 0);
  }, [newsEvents]);

  // Negative News & Risk Feed
  const negativeNews = useMemo(() => {
    return newsEvents.filter(n => n.sentiment === 'Negative' || (n.impactPercent || 0) < 0 || n.category === 'REGULATORY');
  }, [newsEvents]);

  const handleAddBullPoint = (e) => {
    e.preventDefault();
    if (!bullPointText.trim()) return;
    setBullPoints([
      { id: `BP_${Date.now()}`, title: 'Bullish Thesis Note', arg: bullPointText },
      ...bullPoints
    ]);
    setBullPointText('');
  };

  const handleAddBearPoint = (e) => {
    e.preventDefault();
    if (!bearPointText.trim()) return;
    setBearPoints([
      { id: `BE_${Date.now()}`, title: 'Bearish Risk Warning', arg: bearPointText },
      ...bearPoints
    ]);
    setBearPointText('');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'linear-gradient(135deg, var(--color-brass, #845508), #b27a1b)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 900,
              fontSize: '0.85rem',
              letterSpacing: '1px'
            }}>
              SAAMX
            </span>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              fontFamily: "var(--font-display, 'Cinzel', serif)",
              color: 'var(--color-ink, #1E232B)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <IconBriefcase size={24} color="var(--color-brass, #845508)" />
              Broker & Market Advisor Terminal
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-ink-muted, #4A5568)', fontSize: '0.85rem' }}>
            "Experience the market, don't just plan it." &bull; Strategic Floor Research &bull; Bull/Bear Theses &bull; Strictly Non-Execution
          </p>
        </div>

        {/* Live FX & Status Pill */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            background: 'var(--color-surface-sunken, #FAF8F3)',
            border: '1px solid var(--color-border, #E2DBD0)',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <IconCurrencyExchange size={14} color="var(--color-brass, #845508)" />
            <span>USD/INR:</span>
            <strong className="font-mono tabular-nums" style={{ color: 'var(--color-rise, #065F3E)' }}>
              ₹{(fxRates.USDINR?.midRate || 88.20).toFixed(2)}
            </strong>
          </div>
          <Badge variant="success" style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
            ● Advisory Active (Zero Order Execution)
          </Badge>
        </div>
      </div>

      {/* Educational & Non-Execution Advisory Boundary Banner */}
      <div style={{
        background: 'rgba(132, 85, 8, 0.06)',
        border: '1.5px solid var(--color-brass, #845508)',
        borderRadius: '8px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconAlertTriangle size={24} color="var(--color-brass, #845508)" />
          <div>
            <strong style={{ color: 'var(--color-brass, #845508)', fontSize: '0.88rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Educational Advisory & Strategy Boundary &bull; Strictly Non-Execution
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted, #4A5568)' }}>
              Floor Advisors provide financial research, valuation metrics, and Bull/Bear strategic guidance. <strong>Advisors cannot place or execute trades.</strong> Participating Investment Houses must submit physical paper order slips to authorized clerks at the Consolidated Exchange Desk.
            </span>
          </div>
        </div>
        <Badge variant="outline" style={{
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          borderColor: 'var(--color-brass, #845508)',
          color: 'var(--color-brass, #845508)',
          fontWeight: 800,
          fontSize: '0.75rem',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <IconFileText size={14} />
          PAPER SLIP EXECUTION ONLY
        </Badge>
      </div>

      {/* Unified View Switcher: Advisory vs Bull vs Bear */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid var(--color-border, #E2DBD0)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveView('advisory')}
          className={`btn ${activeView === 'advisory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconBriefcase size={16} />
          Advisory & Client Consultations
        </button>
        <button
          onClick={() => setActiveView('bull')}
          className={`btn ${activeView === 'bull' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconTrendingUp size={16} />
          Bull Momentum Scanner
        </button>
        <button
          onClick={() => setActiveView('bear')}
          className={`btn ${activeView === 'bear' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconTrendingDown size={16} />
          Bear Vulnerability Scanner
        </button>
      </div>

      {/* Advisory Desks Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {[
          { name: 'Domestic Equity Desk', lead: 'Rahul Sen, Chief Domestic Strategist', coverage: 'NSE / BSE / Indian Bluechips' },
          { name: 'Global Equities Desk', lead: 'Elena Rostova, Global Asset Analyst', coverage: 'NYSE / NASDAQ / LSE Equities' },
          { name: 'Macro & FX Advisory', lead: 'Marcus Vance, FX Quantitative Desk', coverage: 'Currency Spreads & Macro Volatility' },
          { name: 'Risk & Compliance Desk', lead: 'Sunita Agarwal, Market Risk Officer', coverage: 'Circuit Limits & Drawdown Defense' }
        ].map((desk, idx) => (
          <div key={idx} style={{
            background: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--color-ink, #1E232B)', display: 'block' }}>{desk.name}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-brass, #845508)', fontWeight: 600, display: 'block' }}>{desk.lead}</span>
            <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted, #4A5568)' }}>Coverage: {desk.coverage}</span>
          </div>
        ))}
      </div>

      {/* Top Indices Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { name: 'SAAMX GLOBAL 100', val: marketIndices.global100 || 12450.80, change: +1.2 },
          { name: 'INDIA 50', val: marketIndices.india50 || 24680.15, change: +0.8 },
          { name: 'US 100', val: marketIndices.us100 || 18920.40, change: -0.4 },
          { name: 'UK 100', val: marketIndices.uk100 || 8210.60, change: +0.2 }
        ].map((idxData, i) => (
          <div key={i} style={{
            background: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink, #1E232B)' }}>{idxData.name}</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '0.82rem', fontWeight: 800, color: idxData.change >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)' }}>
              {typeof idxData.val === 'number' ? idxData.val.toFixed(2) : idxData.val} ({idxData.change >= 0 ? '+' : ''}{idxData.change}%)
            </span>
          </div>
        ))}
      </div>

      {/* 2. Stock Referrals Intake Queue */}
      <Card variant="elevated" style={{
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        border: '1px solid var(--color-border, #E2DBD0)',
        borderRadius: '10px',
        padding: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconMegaphone size={18} color="var(--color-brass, #845508)" />
              Incoming Stock Referrals Queue
              {pendingReferrals.length > 0 && (
                <span style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  {pendingReferrals.length} PENDING
                </span>
              )}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--color-ink-muted, #4A5568)' }}>
              Participating Teams request floor analyst guidance on specific tickers. Review and dispatch verified BUY / HOLD / SELL signals.
            </p>
          </div>
          {signalNotice && (
            <div style={{
              background: 'rgba(6, 95, 62, 0.1)',
              color: 'var(--color-rise, #065F3E)',
              border: '1px solid var(--color-rise, #065F3E)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              {signalNotice}
            </div>
          )}
        </div>

        {pendingReferrals.length === 0 ? (
          <div style={{
            background: 'var(--color-surface-sunken, #FAF8F3)',
            borderRadius: '6px',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--color-ink-muted, #4A5568)',
            fontSize: '0.85rem'
          }}>
            No pending stock referrals in queue. Teams can submit review tickets directly from their terminal.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {pendingReferrals.map(ref => (
              <div key={ref.id} style={{
                background: 'var(--color-surface-sunken, #FAF8F3)',
                border: '1.5px solid var(--color-border, #E2DBD0)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-brass, #845508)' }}>
                      HOUSE: {ref.teamCode}
                    </span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', color: 'var(--color-ink, #1E232B)' }}>
                      {ref.ticker}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      {ref.securityName || 'Listed Equity'}
                    </span>
                  </div>
                  <Badge variant="outline" style={{ fontSize: '0.7rem' }}>
                    {new Date(ref.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'BUY')}
                    style={{
                      flex: 1,
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: signalLoadingId === ref.id ? 0.6 : 1
                    }}
                  >
                    BUY ➔
                  </button>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'HOLD')}
                    style={{
                      flex: 1,
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: signalLoadingId === ref.id ? 0.6 : 1
                    }}
                  >
                    HOLD ➔
                  </button>
                  <button
                    disabled={signalLoadingId === ref.id}
                    onClick={() => handlePublishSignal(ref.id, 'SELL')}
                    style={{
                      flex: 1,
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: signalLoadingId === ref.id ? 0.6 : 1
                    }}
                  >
                    SELL ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently Answered Strip */}
        {completedReferrals.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border, #E2DBD0)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-ink-muted, #4A5568)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recently Dispatched Advisor Signals
            </span>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '8px', paddingBottom: '4px' }}>
              {completedReferrals.map(cr => (
                <div key={cr.id} style={{
                  background: 'var(--color-surface-sunken, #FAF8F3)',
                  border: '1px solid var(--color-border, #E2DBD0)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem'
                }}>
                  <strong style={{ color: 'var(--color-ink, #1E232B)' }}>{cr.teamCode}</strong>
                  <span>{cr.ticker}</span>
                  <Badge variant={cr.signal === 'BUY' ? 'success' : cr.signal === 'SELL' ? 'danger' : 'warning'} style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                    {cr.signal}
                  </Badge>
                  <span style={{ color: 'var(--color-ink-muted, #4A5568)', fontSize: '0.68rem' }}>
                    ({cr.advisorName || 'Advisor'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 3. Main Workspace: Render based on activeView */}
      {activeView === 'advisory' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.45fr', gap: '20px' }}>

        {/* Left Column: Securities Directory & Top Movers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Search Card */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSearch size={18} color="var(--color-brass, #845508)" />
              Security Research Directory
            </h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search Ticker (e.g. INFY, AAPL)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #E2DBD0)',
                  backgroundColor: 'var(--color-surface, #FFFFFF)',
                  color: 'var(--color-ink, #1E232B)',
                  fontSize: '0.85rem'
                }}
              />
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #E2DBD0)',
                  backgroundColor: 'var(--color-surface, #FFFFFF)',
                  color: 'var(--color-ink, #1E232B)',
                  fontSize: '0.85rem'
                }}
              >
                {sectorList.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>
                ))}
              </select>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border, #E2DBD0)', background: 'var(--color-surface-sunken, #FAF8F3)' }}>
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
                        borderBottom: '1px solid var(--color-border, #E2DBD0)',
                        cursor: 'pointer',
                        backgroundColor: selectedSecurity?.ticker === s.ticker ? 'var(--color-surface-sunken, #FAF8F3)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>{s.ticker}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--color-ink, #1E232B)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>
                        ₹{s.currentPrice || s.basePrice}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenProfile) onOpenProfile(s.ticker);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Dossier ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Movers Mini-Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Card variant="elevated" style={{ backgroundColor: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <IconTrendingUp size={14} /> TOP GAINERS
              </span>
              {topGainers.map(s => (
                <div key={s.ticker} onClick={() => setSelectedSecurity(s)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px dashed var(--color-border, #E2DBD0)', cursor: 'pointer' }}>
                  <strong style={{ color: 'var(--color-ink, #1E232B)' }}>{s.ticker}</strong>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--color-rise, #065F3E)', fontWeight: 800 }}>+{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </Card>

            <Card variant="elevated" style={{ backgroundColor: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <IconTrendingDown size={14} /> TOP LOSERS
              </span>
              {topLosers.map(s => (
                <div key={s.ticker} onClick={() => setSelectedSecurity(s)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px dashed var(--color-border, #E2DBD0)', cursor: 'pointer' }}>
                  <strong style={{ color: 'var(--color-ink, #1E232B)' }}>{s.ticker}</strong>
                  <span className="font-mono tabular-nums" style={{ color: 'var(--color-fall, #931913)', fontWeight: 800 }}>{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Research Report Composer & Broadcast */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconMegaphone size={18} color="var(--color-brass, #845508)" />
                Publish Research Report
              </h3>
              {recNotice && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-rise, #065F3E)', fontWeight: 800 }}>
                  {recNotice}
                </span>
              )}
            </div>

            <form onSubmit={handlePublishRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                    TARGET TICKER
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INFY"
                    value={recTicker}
                    onChange={e => setRecTicker(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border, #E2DBD0)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                    RECOMMENDATION
                  </label>
                  <select
                    value={recRecommendation}
                    onChange={e => setRecRecommendation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border, #E2DBD0)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="BUY">BUY (Long Allocation)</option>
                    <option value="HOLD">HOLD (Neutral Wait)</option>
                    <option value="SELL">SELL (Reduce / Short)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                    CONFIDENCE: {recConfidence}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={recConfidence}
                    onChange={e => setRecConfidence(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                    RISK LEVEL
                  </label>
                  <select
                    value={recRiskLevel}
                    onChange={e => setRecRiskLevel(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border, #E2DBD0)', fontSize: '0.78rem' }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                    TIMEFRAME
                  </label>
                  <select
                    value={recTimeframe}
                    onChange={e => setRecTimeframe(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border, #E2DBD0)', fontSize: '0.78rem' }}
                  >
                    <option value="SHORT">SHORT</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LONG">LONG</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', marginBottom: '3px' }}>
                  ANALYTICAL REASONING / THESIS
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide analytical reasoning, valuation multiple rationale, or catalyst..."
                  value={recReasoning}
                  onChange={e => setRecReasoning(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border, #E2DBD0)',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={recPublishing}
                className="btn btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <IconMegaphone size={16} />
                {recPublishing ? 'Broadcasting...' : 'Broadcast Floor Research Bulletin'}
              </button>
            </form>

            {/* Published Bulletins Feed */}
            {publishedRecommendations.length > 0 && (
              <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border, #E2DBD0)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-ink-muted, #4A5568)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Floor Research Bulletins ({publishedRecommendations.length})
                </span>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {publishedRecommendations.slice(0, 8).map((rec, i) => (
                    <div key={rec.id || i} style={{
                      background: 'var(--color-surface-sunken, #FAF8F3)',
                      border: '1px solid var(--color-border, #E2DBD0)',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--color-brass, #845508)' }}>
                          {rec.ticker} &bull; {rec.recommendation} ({rec.confidence || 80}% conf)
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                          {rec.brokerName || 'Floor Desk'}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-ink, #1E232B)', lineHeight: 1.3, fontSize: '0.72rem' }}>
                        {rec.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* Right Column: Complete Security Intelligence Dossier with Provenance Distinction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {selectedSecurity ? (
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>

              {/* Dossier Top Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border, #E2DBD0)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge variant="success" style={{ fontSize: '0.7rem' }}>
                      {selectedSecurity.sector || 'Equities'}
                    </Badge>
                    <Badge variant="outline" style={{ fontSize: '0.7rem' }}>
                      {selectedSecurity.industry || 'General Industry'}
                    </Badge>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      Exchange: {selectedSecurity.exchange || 'NSE'} &bull; Currency: {selectedSecurity.currency || 'INR'}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: 'var(--color-ink, #1E232B)', margin: 0 }}>
                    {selectedSecurity.name} ({selectedSecurity.ticker})
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--color-ink, #1E232B)' }}>
                    ₹{selectedSecurity.currentPrice || selectedSecurity.basePrice}
                  </div>
                  <span className="font-mono tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                    Base Price: ₹{selectedSecurity.basePrice} &bull; Day: ₹{selectedSecurity.dayLow || selectedSecurity.basePrice} - ₹{selectedSecurity.dayHigh || selectedSecurity.basePrice}
                  </span>
                </div>
              </div>

              {/* SECTION 1: FACTUAL FINANCIAL DATA (AUDITED REPORTING) */}
              <div
                data-provenance="factual"
                className="provenance-factual"
                style={{
                  background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconBuilding size={18} color="#38BDF8" />
                    <h3 style={{ margin: 0, fontSize: '0.92rem', letterSpacing: '0.5px', color: '#F1F5F9', fontWeight: 800 }}>
                      📊 FACTUAL FINANCIAL DATA (AUDITED REPORTING)
                    </h3>
                  </div>
                  <span style={{
                    background: '#0369A1',
                    color: '#E0F2FE',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    VERIFIED FINANCIAL STATEMENTS
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>SPOT PRICE</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: '#38BDF8' }}>
                      ₹{selectedSecurity.currentPrice || selectedSecurity.basePrice}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>FLOAT SHARES</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: '#F8FAFC' }}>
                      {(fundamentals?.sharesOutstanding || selectedSecurity.totalUnits || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>MARKET CAP</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: '#F8FAFC' }}>
                      {fundamentals?.marketCap ? (fundamentals.marketCap >= 1e7 ? `₹${(fundamentals.marketCap / 1e7).toFixed(1)} Cr` : `₹${fundamentals.marketCap.toLocaleString()}`) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>REVENUE</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: '#F8FAFC' }}>
                      {fundamentals?.revenue ? (fundamentals.revenue >= 1e7 ? `₹${(fundamentals.revenue / 1e7).toFixed(1)} Cr` : `₹${fundamentals.revenue.toLocaleString()}`) : 'N/A (Pre-Revenue)'}
                    </strong>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>OPERATING INCOME</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: (fundamentals?.operatingIncome || 0) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {fundamentals?.operatingIncome !== undefined ? (fundamentals.operatingIncome >= 1e7 || fundamentals.operatingIncome <= -1e7 ? `₹${(fundamentals.operatingIncome / 1e7).toFixed(1)} Cr` : `₹${fundamentals.operatingIncome.toLocaleString()}`) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>NET INCOME (PAT)</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: (fundamentals?.netIncome || 0) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {fundamentals?.netIncome !== undefined ? (fundamentals.netIncome >= 1e7 || fundamentals.netIncome <= -1e7 ? `₹${(fundamentals.netIncome / 1e7).toFixed(1)} Cr` : `₹${fundamentals.netIncome.toLocaleString()}`) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>SHAREHOLDER EQUITY</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: '#F8FAFC' }}>
                      {fundamentals?.shareholderEquity !== undefined ? (fundamentals.shareholderEquity >= 1e7 || fundamentals.shareholderEquity <= -1e7 ? `₹${(fundamentals.shareholderEquity / 1e7).toFixed(1)} Cr` : `₹${fundamentals.shareholderEquity.toLocaleString()}`) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>TOTAL DEBT</span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '0.95rem', color: fundamentals?.totalDebt === 0 ? '#4ADE80' : '#F8FAFC' }}>
                      {fundamentals?.totalDebt !== undefined ? (fundamentals.totalDebt === 0 ? '₹0.00 (Debt-Free)' : (fundamentals.totalDebt >= 1e7 ? `₹${(fundamentals.totalDebt / 1e7).toFixed(1)} Cr` : `₹${fundamentals.totalDebt.toLocaleString()}`)) : 'N/A'}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '0.68rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Source: Canonical Exchange Filing Repository & Financial Ledger</span>
                  <span>Reporting Currency: {selectedSecurity.currency || 'INR'}</span>
                </div>
              </div>

              {/* SECTION 2: SIMULATED ADVISORY PERSPECTIVE (FLOOR OPINION & VALUATION) */}
              <div
                data-provenance="simulated"
                className="provenance-simulated"
                style={{
                  background: 'rgba(132, 85, 8, 0.04)',
                  border: '1.5px dashed var(--color-brass, #845508)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(132, 85, 8, 0.2)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconScale size={18} color="var(--color-brass, #845508)" />
                    <h3 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-brass, #845508)', fontWeight: 900 }}>
                      🧠 SIMULATED ADVISORY PERSPECTIVE (FLOOR OPINION & VALUATION)
                    </h3>
                  </div>
                  <span style={{
                    background: 'rgba(132, 85, 8, 0.15)',
                    color: 'var(--color-brass, #845508)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-brass, #845508)',
                    textTransform: 'uppercase'
                  }}>
                    SIMULATED ADVISORY OPINION & PROJECTION
                  </span>
                </div>

                {/* 4 Financial Ratios Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '6px', padding: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', textTransform: 'uppercase' }}>
                      P/E RATIO
                    </span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '1.15rem', color: 'var(--color-ink, #1E232B)', display: 'block', margin: '2px 0' }}>
                      {ratios?.peRatioDisplay || 'N/A'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      Sector Median: {getSectorBenchmark(selectedSecurity.sector).medianPE}x
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '6px', padding: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', textTransform: 'uppercase' }}>
                      DEBT-TO-EQUITY
                    </span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '1.15rem', color: ratios?.debtToEquity === 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-ink, #1E232B)', display: 'block', margin: '2px 0' }}>
                      {ratios?.debtToEquityDisplay || 'N/A'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      Sector Median: {getSectorBenchmark(selectedSecurity.sector).medianDebtToEquity}x
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '6px', padding: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', textTransform: 'uppercase' }}>
                      OPERATING MARGIN
                    </span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '1.15rem', color: (ratios?.operatingMargin || 0) >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', display: 'block', margin: '2px 0' }}>
                      {ratios?.operatingMarginDisplay || 'N/A'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      Benchmark: +{getSectorBenchmark(selectedSecurity.sector).medianOperatingMargin}%
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-surface, #FFFFFF)', border: '1px solid var(--color-border, #E2DBD0)', borderRadius: '6px', padding: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-ink-muted, #4A5568)', display: 'block', textTransform: 'uppercase' }}>
                      RETURN ON EQUITY (ROE)
                    </span>
                    <strong className="font-mono tabular-nums" style={{ fontSize: '1.15rem', color: (ratios?.roe || 0) >= 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', display: 'block', margin: '2px 0' }}>
                      {ratios?.roeDisplay || 'N/A'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-ink-muted, #4A5568)' }}>
                      Benchmark: +{getSectorBenchmark(selectedSecurity.sector).medianROE}%
                    </span>
                  </div>
                </div>

                {/* Valuation Indicator Strip */}
                <div style={{
                  background: 'var(--color-surface, #FFFFFF)',
                  border: '1px solid var(--color-border, #E2DBD0)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-ink-muted, #4A5568)', display: 'block', textTransform: 'uppercase' }}>
                      INTRINSIC VALUATION INDICATOR
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{
                        backgroundColor: valuation?.status === 'UNDERVALUED' ? '#059669' : valuation?.status === 'OVERVALUED' ? '#DC2626' : '#D97706',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px'
                      }}>
                        {valuation?.status || 'FAIR VALUE'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink, #1E232B)' }}>
                        {valuation?.guidanceText}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-fall, #931913)', fontWeight: 700, display: 'block' }}>BEAR TARGET</span>
                      <strong className="font-mono tabular-nums" style={{ fontSize: '0.92rem' }}>
                        ₹{valuation?.bearTarget}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-brass, #845508)', fontWeight: 800, display: 'block' }}>FAIR ANCHOR</span>
                      <strong className="font-mono tabular-nums" style={{ fontSize: '1rem', color: 'var(--color-brass, #845508)' }}>
                        ₹{valuation?.fairValue}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-rise, #065F3E)', fontWeight: 700, display: 'block' }}>BULL TARGET</span>
                      <strong className="font-mono tabular-nums" style={{ fontSize: '0.92rem' }}>
                        ₹{valuation?.bullTarget}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bull vs Bear Thesis Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Bull Thesis */}
                  <div style={{ backgroundColor: 'rgba(6, 95, 62, 0.05)', border: '1px solid rgba(6, 95, 62, 0.25)', borderRadius: '6px', padding: '12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <IconTrendingUp size={16} />
                      BULL CASE & CATALYSTS
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.45 }}>
                      {(perspectives?.bullTheses || []).map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Bear Thesis */}
                  <div style={{ backgroundColor: 'rgba(147, 25, 19, 0.05)', border: '1px solid rgba(147, 25, 19, 0.25)', borderRadius: '6px', padding: '12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <IconTrendingDown size={16} />
                      BEAR CASE & RISKS
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.45 }}>
                      {(perspectives?.bearTheses || []).map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Educational Advisory Legal Disclaimer */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(132, 85, 8, 0.2)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '0.70rem',
                  color: 'var(--color-ink-muted, #4A5568)',
                  lineHeight: 1.35
                }}>
                  <strong>Compliance Notice:</strong> This terminal operates in Educational Advisory mode. Valuation targets, fair value estimates, and multi-factor catalysts represent simulated models for training simulation purposes only and do not constitute formal investment advice. <strong>Strictly Non-Execution:</strong> To execute trades, submit a physical paper slip to an authorized clerk at the Consolidated Exchange Desk.
                </div>
              </div>

              {/* Dossier Action Button */}
              <button
                onClick={() => onOpenProfile && onOpenProfile(selectedSecurity.ticker)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <IconFileText size={16} />
                Open Complete Security Research Dossier
              </button>
            </Card>
          ) : (
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-ink-muted, #4A5568)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <IconSearch size={40} color="var(--color-brass, #845508)" />
              </div>
              <h3 style={{ color: 'var(--color-ink, #1E232B)', margin: '0 0 6px 0' }}>No Security Selected</h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Select any security from the directory on the left to inspect live advisory intelligence, audited fundamentals, valuation indicator, and Bull/Bear catalysts.
              </p>
            </Card>
          )}

          {/* Broker Notes & Market Insights Scratchpad */}
          <Card variant="elevated" style={{
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border, #E2DBD0)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconFileText size={18} color="var(--color-brass, #845508)" />
              Broker Advisory Notes & Quick Scratchpad
            </h3>

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <textarea
                rows={2}
                placeholder="Compose market advisory note or floor scratchpad observation..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #E2DBD0)',
                  backgroundColor: 'var(--color-surface, #FFFFFF)',
                  color: 'var(--color-ink, #1E232B)',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-ink-muted, #4A5568)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                  />
                  Publish as Public Floor Insight
                </label>
                <button type="submit" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '4px', cursor: 'pointer' }}>
                  Save Note
                </button>
              </div>
            </form>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brokerNotes.map(n => (
                <div key={n.id} style={{
                  background: 'var(--color-surface-sunken, #FAF8F3)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #E2DBD0)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.72rem' }}>
                    <strong style={{ color: 'var(--color-brass, #845508)' }}>{n.author}</strong>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--color-ink-muted, #4A5568)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {n.time} {n.isPublic && <span style={{ color: 'var(--color-rise, #065F3E)', fontWeight: 800 }}>• Public</span>}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.35 }}>
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>
      )}

      {/* Bull Momentum Desk Workspace */}
      {activeView === 'bull' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left: Strongest Momentum & Growth Picks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-rise, #065F3E)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconTrendingUp size={18} color="var(--color-rise, #065F3E)" />
                High-Momentum Bullish Picks
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border, #E2DBD0)', background: 'var(--color-surface-sunken, #FAF8F3)' }}>
                    <th style={{ padding: '8px' }}>TICKER</th>
                    <th style={{ padding: '8px' }}>NAME</th>
                    <th style={{ padding: '8px' }}>SECTOR</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>PRICE</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>GAIN %</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {topBullPicks.map(s => (
                    <tr key={s.ticker} style={{ borderBottom: '1px solid var(--color-border, #E2DBD0)' }}>
                      <td style={{ padding: '8px', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>{s.ticker}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-ink, #1E232B)' }}>{s.name}</td>
                      <td style={{ padding: '8px', color: 'var(--color-ink-muted, #4A5568)' }}>{s.sector || 'Equities'}</td>
                      <td className="font-mono tabular-nums" style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>
                        ₹{s.cur}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-rise, #065F3E)' }}>
                        +{s.pct.toFixed(2)}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Positive Market Wire */}
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconFileText size={18} color="var(--color-rise, #065F3E)" />
                Positive Market Wire & Catalysts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {positiveNews.slice(0, 5).map(n => (
                  <div key={n.id} style={{
                    background: 'rgba(6, 95, 62, 0.04)',
                    borderLeft: '4px solid var(--color-rise, #065F3E)',
                    padding: '8px 12px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--color-ink, #1E232B)' }}>{n.headline}</strong>
                      <span className="font-mono tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-rise, #065F3E)', fontWeight: 800 }}>
                        +{n.impactPercent}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-ink-muted, #4A5568)' }}>{n.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Bull Talking Points for Debates & Teams */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconTarget size={18} color="var(--color-rise, #065F3E)" />
                Bull Talking Points (Debate & Team Consultations)
              </h3>
              <form onSubmit={handleAddBullPoint} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <textarea
                  rows={3}
                  placeholder="Formulate a new bullish market thesis or counter-argument for team consultations..."
                  value={bullPointText}
                  onChange={e => setBullPointText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #E2DBD0)',
                    backgroundColor: 'var(--color-surface, #FFFFFF)',
                    color: 'var(--color-ink, #1E232B)',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    alignSelf: 'flex-end',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Add Bull Talking Point
                </button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {bullPoints.map(tp => (
                  <div key={tp.id} style={{
                    background: 'var(--color-surface-sunken, #FAF8F3)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #E2DBD0)'
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-rise, #065F3E)', fontSize: '0.82rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconTrendingUp size={14} />
                      {tp.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.4 }}>
                      {tp.arg}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Bear Vulnerability Desk Workspace */}
      {activeView === 'bear' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left: Decliners & Vulnerability Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-fall, #931913)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconTrendingDown size={18} color="var(--color-fall, #931913)" />
                Vulnerable & Decliners Watchlist
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border, #E2DBD0)', background: 'var(--color-surface-sunken, #FAF8F3)' }}>
                    <th style={{ padding: '8px' }}>TICKER</th>
                    <th style={{ padding: '8px' }}>NAME</th>
                    <th style={{ padding: '8px' }}>SECTOR</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>PRICE</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>DROP %</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {topBearPicks.map(s => (
                    <tr key={s.ticker} style={{ borderBottom: '1px solid var(--color-border, #E2DBD0)' }}>
                      <td style={{ padding: '8px', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>{s.ticker}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-ink, #1E232B)' }}>{s.name}</td>
                      <td style={{ padding: '8px', color: 'var(--color-ink-muted, #4A5568)' }}>{s.sector || 'Equities'}</td>
                      <td className="font-mono tabular-nums" style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>
                        ₹{s.cur}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-fall, #931913)' }}>
                        {s.pct.toFixed(2)}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Negative News & Regulatory Risk Alerts */}
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconShieldAlert size={18} color="var(--color-fall, #931913)" />
                Market Risk & Regulatory Warning Feed
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {negativeNews.slice(0, 5).map(n => (
                  <div key={n.id} style={{
                    background: 'rgba(147, 25, 19, 0.04)',
                    borderLeft: '4px solid var(--color-fall, #931913)',
                    padding: '8px 12px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--color-ink, #1E232B)' }}>{n.headline}</strong>
                      <span className="font-mono tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-fall, #931913)', fontWeight: 800 }}>
                        {n.impactPercent}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-ink-muted, #4A5568)' }}>{n.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Bear Talking Points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card variant="elevated" style={{
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink, #1E232B)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconTarget size={18} color="var(--color-fall, #931913)" />
                Bear Talking Points (Debates & Risk Warning)
              </h3>
              <form onSubmit={handleAddBearPoint} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <textarea
                  rows={3}
                  placeholder="Formulate a new bearish risk warning or counter-argument for debate presentations..."
                  value={bearPointText}
                  onChange={e => setBearPointText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #E2DBD0)',
                    backgroundColor: 'var(--color-surface, #FFFFFF)',
                    color: 'var(--color-ink, #1E232B)',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{
                    alignSelf: 'flex-end',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    backgroundColor: 'var(--color-fall, #931913)',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Add Bear Talking Point
                </button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {bearPoints.map(tp => (
                  <div key={tp.id} style={{
                    background: 'var(--color-surface-sunken, #FAF8F3)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border, #E2DBD0)'
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-fall, #931913)', fontSize: '0.82rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconTrendingDown size={14} />
                      {tp.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink, #1E232B)', lineHeight: 1.4 }}>
                      {tp.arg}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
