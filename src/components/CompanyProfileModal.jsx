import React, { useState, useEffect, useMemo } from 'react';
import { db, ref, onValue } from '../lib/firebase.js';
import { apiFetch } from '../lib/api.js';

export default function CompanyProfileModal({ securityId, securities, newsEvents, onClose }) {
  const security = (securities || []).find(s => s.id === securityId || s.ticker === securityId);
  if (!security) return null;

  // Active Tab state inside Modal Drawer
  const [activeModalTab, setActiveModalTab] = useState('chart'); // 'chart', 'fundamentals', 'news', 'calculator'

  // Advisor Referral State
  const [referStatus, setReferStatus] = useState(null);
  const [referLoading, setReferLoading] = useState(false);

  const handleReferToAdvisor = async () => {
    const teamCode = sessionStorage.getItem('fms_username') || sessionStorage.getItem('saamx_team_code') || 'T01';
    setReferLoading(true);
    setReferStatus(null);
    try {
      const res = await apiFetch('/api/advisor/refer', {
        method: 'POST',
        body: JSON.stringify({
          ticker: security.ticker,
          teamCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Referral failed');
      setReferStatus('✓ Referral submitted to Floor Advisor for BUY/HOLD/SELL review');
      setTimeout(() => setReferStatus(null), 4000);
    } catch (e) {
      setReferStatus(`⚠️ ${e.message}`);
      setTimeout(() => setReferStatus(null), 4000);
    } finally {
      setReferLoading(false);
    }
  };

  // Trade Calculator state
  const [calcAction, setCalcAction] = useState('BUY');
  const [calcQty, setCalcQty] = useState(100);
  const [calcOrderType, setCalcOrderType] = useState('MARKET');
  const [calcLimitPrice, setCalcLimitPrice] = useState(security.currentPrice || security.basePrice || 100);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Lazy-load price history from Firebase RTDB
  const [history, setHistory] = useState([]);
  const [fxRates, setFxRates] = useState({
    USDINR: { midRate: 88.20 },
    GBPINR: { midRate: 119.40 },
    EURINR: { midRate: 103.50 }
  });

  useEffect(() => {
    const historyRef = ref(db, `fms/priceHistory/${security.ticker}`);
    const unsubHistory = onValue(historyRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const ticks = Object.entries(val).map(([ts, tick]) => ({
          timestamp: Number(ts),
          price: tick.price
        })).sort((a, b) => a.timestamp - b.timestamp);
        setHistory(ticks);
      } else {
        setHistory(security.priceHistory || [{ timestamp: Date.now(), price: security.currentPrice || security.basePrice }]);
      }
    });

    const fxRef = ref(db, 'fms/fxRates');
    const unsubFx = onValue(fxRef, (snap) => {
      if (snap.exists()) {
        setFxRates(snap.val());
      }
    });

    return () => {
      unsubHistory();
      unsubFx();
    };
  }, [security.ticker]);

  // Keyboard shortcut: close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter news events targeting this security
  const companyNews = (newsEvents || []).filter(news => 
    (news.affectedSecurityIds && news.affectedSecurityIds.includes(security.id)) ||
    (news.affectedSector && news.affectedSector === security.sector)
  ).slice(0, 8);

  const currentPrice = security.currentPrice || security.basePrice || 0;
  const openingPrice = security.openingPrice || security.basePrice || currentPrice;
  const previousClose = security.previousClose || security.basePrice || openingPrice;
  const dayHigh = security.dayHigh || Math.max(currentPrice, openingPrice);
  const dayLow = security.dayLow || Math.min(currentPrice, openingPrice);
  const priceDiff = currentPrice - openingPrice;
  const percentChange = openingPrice > 0 ? ((priceDiff / openingPrice) * 100).toFixed(2) : '0.00';
  const isPriceUp = priceDiff >= 0;

  // Currency Resolution & FX Conversion
  const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' || security.exchange === 'Euronext' ? 'EUR' : 'INR');
  const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
  const isForeign = secCurrency !== 'INR';

  const currentFxRate = useMemo(() => {
    if (!isForeign) return 1.0;
    const pairKey = `${secCurrency}INR`;
    return fxRates[pairKey]?.midRate || (secCurrency === 'USD' ? 88.20 : secCurrency === 'GBP' ? 119.40 : 103.50);
  }, [secCurrency, isForeign, fxRates]);

  const approxInrPrice = useMemo(() => {
    return currentPrice * currentFxRate;
  }, [currentPrice, currentFxRate]);

  // Day Range calculation
  const dayRangeSpread = dayHigh - dayLow;
  const dayRangePosition = dayRangeSpread > 0 ? Math.max(0, Math.min(100, ((currentPrice - dayLow) / dayRangeSpread) * 100)) : 50;

  // Render SVG Price Chart
  const renderPriceChart = () => {
    if (history.length < 2) {
      return (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>
          No intraday price ticks recorded yet.
        </div>
      );
    }

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices) * 0.985;
    const maxPrice = Math.max(...prices) * 1.015;
    const priceRange = maxPrice - minPrice || 1;

    const width = 560;
    const height = 160;
    const points = history.map((item, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((item.price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    }).join(' ');

    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || lastPrice;
    const isUp = lastPrice >= prevPrice;
    const strokeColor = isUp ? '#10B981' : '#EF4444';
    const areaGradientId = `grad-${security.id || security.ticker}`;

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '160px', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.30"/>
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <line x1="0" y1="20" x2={width} y2="20" stroke="#2B3342" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="0" y1="80" x2={width} y2="80" stroke="#2B3342" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="0" y1="140" x2={width} y2="140" stroke="#2B3342" strokeDasharray="3 3" strokeWidth="1" />

          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={`url(#${areaGradientId})`}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            points={points}
          />
          <circle
            cx={width}
            cy={height - ((lastPrice - minPrice) / priceRange) * height}
            r="5"
            fill={strokeColor}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: '#94A3B8' }} className="font-data">
          <span>Low: {curSym}{Math.min(...prices).toFixed(1)}</span>
          <span>{history.length} Intraday Ticks</span>
          <span>High: {curSym}{Math.max(...prices).toFixed(1)}</span>
        </div>
      </div>
    );
  };

  // Simulated 5-Level Depth Book
  const depth = useMemo(() => {
    const spread = (currentPrice * 0.003).toFixed(2);
    const bids = [
      { price: (currentPrice - spread * 0.5).toFixed(2), qty: Math.floor(Math.random() * 80) + 20 },
      { price: (currentPrice - spread * 1.2).toFixed(2), qty: Math.floor(Math.random() * 120) + 40 },
      { price: (currentPrice - spread * 2.0).toFixed(2), qty: Math.floor(Math.random() * 160) + 60 },
      { price: (currentPrice - spread * 3.1).toFixed(2), qty: Math.floor(Math.random() * 200) + 80 },
      { price: (currentPrice - spread * 4.5).toFixed(2), qty: Math.floor(Math.random() * 300) + 100 }
    ];
    const asks = [
      { price: (currentPrice + spread * 0.5).toFixed(2), qty: Math.floor(Math.random() * 70) + 15 },
      { price: (currentPrice + spread * 1.3).toFixed(2), qty: Math.floor(Math.random() * 110) + 35 },
      { price: (currentPrice + spread * 2.2).toFixed(2), qty: Math.floor(Math.random() * 150) + 55 },
      { price: (currentPrice + spread * 3.4).toFixed(2), qty: Math.floor(Math.random() * 190) + 75 },
      { price: (currentPrice + spread * 4.8).toFixed(2), qty: Math.floor(Math.random() * 280) + 95 }
    ];
    return { bids, asks, spread };
  }, [currentPrice]);

  const profile = security.profileDetails || {};

  // Calculator Gross Values
  const effectivePrice = calcOrderType === 'MARKET' ? currentPrice : Number(calcLimitPrice) || currentPrice;
  const calcGrossNative = calcQty * effectivePrice;
  const calcGrossINR = calcGrossNative * currentFxRate;
  const calcImpactPercent = ((calcQty / (security.totalUnits || 100000)) * (security.volatility || 0.5) * 100).toFixed(2);

  const handleCopyOrderSummary = () => {
    const text = `ORDER SLIP: ${calcAction} ${calcQty}x ${security.ticker} @ ${curSym}${effectivePrice} [${calcOrderType}] | Gross: ${curSym}${calcGrossNative.toLocaleString()} (~₹${calcGrossINR.toLocaleString()})`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 10, 14, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'background-color 0.2s ease'
      }}
      onClick={onClose}
    >
      {/* Right-Side Drawer Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '660px',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          boxShadow: '-8px 0 36px rgba(0, 0, 0, 0.25)',
          borderLeft: '1px solid var(--color-border)',
          padding: '24px 28px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dossier"
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '1rem',
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'; }}
        >
          ✕
        </button>

        {/* 1. Header Section: Corporate Identity, Ticker & Badges */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px', paddingRight: '48px' }}>
          <div style={{
            background: 'var(--color-brass-gradient)',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '1.4rem',
            minWidth: '52px',
            height: '52px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(132, 85, 8, 0.3)'
          }}>
            {security.logoInitials || security.ticker?.slice(0, 2)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-brand)', color: 'var(--color-ink)' }}>
                {security.name}
              </h2>
              <span className="badge badge-public" style={{ fontSize: '0.84rem', padding: '2px 8px', fontWeight: 900 }}>
                {security.ticker}
              </span>
              <span className="badge" style={{ backgroundColor: 'var(--color-surface-2)', color: '#1E232B', border: '1px solid var(--color-border)', fontSize: '0.76rem' }}>
                {security.exchange || 'NSE'} &bull; {security.country || 'Global'}
              </span>
              <span className={`badge ${security.status === 'Active' ? 'badge-rise' : 'badge-fall'}`} style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                ● {security.status || 'Active'}
              </span>
              {security.riskRating && (
                <span className={`badge ${
                  security.riskRating === 'Low' ? 'badge-rise' :
                  security.riskRating === 'High' ? 'badge-fall' : 'badge-public'
                }`} style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  {security.riskRating === 'Low' ? '🛡️ Low' : security.riskRating === 'High' ? '⚡ High' : '⚖️ Med'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--color-brass)', fontSize: '0.84rem', margin: '3px 0 0 0', fontWeight: 700 }}>
              {profile.tagline || `${security.sector} Constituent Asset`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={handleReferToAdvisor}
                disabled={referLoading}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>📢</span>
                <span>Refer to Floor Advisor</span>
              </button>
              {referStatus && (
                <span style={{ fontSize: '0.72rem', color: referStatus.startsWith('✓') ? '#059669' : '#DC2626', fontWeight: 600 }}>
                  {referStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4-Step Financial Analysis Flow Banner */}
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          fontWeight: 800
        }}>
          <span style={{ color: activeModalTab === 'fundamentals' ? 'var(--color-brass)' : '#94A3B8' }}>
            1. RESEARCH {activeModalTab === 'fundamentals' ? '●' : ''}
          </span>
          <span style={{ color: 'var(--color-border)' }}>➔</span>
          <span style={{ color: activeModalTab === 'chart' ? 'var(--color-brass)' : '#94A3B8' }}>
            2. ANALYSIS {activeModalTab === 'chart' ? '●' : ''}
          </span>
          <span style={{ color: 'var(--color-border)' }}>➔</span>
          <span style={{ color: activeModalTab === 'news' ? 'var(--color-brass)' : '#94A3B8' }}>
            3. DECISION {activeModalTab === 'news' ? '●' : ''}
          </span>
          <span style={{ color: 'var(--color-border)' }}>➔</span>
          <span style={{ color: activeModalTab === 'calculator' ? 'var(--color-brass)' : '#94A3B8' }}>
            4. ORDER SLIP {activeModalTab === 'calculator' ? '●' : ''}
          </span>
        </div>

        {/* 2. Global Price & Foreign Exchange Conversion Strip */}
        <div style={{ 
          padding: '16px 20px', 
          backgroundColor: '#FAF8F3', 
          border: '1.5px solid rgba(132, 85, 8, 0.3)', 
          borderRadius: '12px', 
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            {/* Native Price */}
            <div>
              <span style={{ fontSize: '0.7rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                NATIVE MARKET PRICE ({secCurrency})
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="font-data" style={{ color: 'var(--color-ink)', fontSize: '1.75rem', fontWeight: 900 }}>
                  {curSym}{currentPrice.toLocaleString()}
                </span>
                <span className="font-data" style={{ color: isPriceUp ? 'var(--color-rise)' : 'var(--color-fall)', fontSize: '0.95rem', fontWeight: 800 }}>
                  {isPriceUp ? '▲ +' : '▼ '}{curSym}{Math.abs(priceDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({isPriceUp ? '+' : ''}{percentChange}%)
                </span>
              </div>
            </div>

            {/* INR Equivalent & FX Pill */}
            {isForeign ? (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--gold-royal)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                  CONSOLIDATED INR VALUE
                </span>
                <div className="font-data" style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--navy-900)' }}>
                  ≈ ₹{approxInrPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                  Spot FX: 1 {secCurrency} = ₹{currentFxRate.toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: 'rgba(6, 95, 62, 0.1)',
                  color: 'var(--green-emerald)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  PRIMARY DOMESTIC ASSET
                </span>
              </div>
            )}
          </div>

          {/* Intraday Range Bar + 52-Wk High/Low */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(132, 85, 8, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#4A5568', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              <span>Day Low: {curSym}{dayLow}</span>
              <span style={{ color: 'var(--gold-royal)' }}>52-Wk: {curSym}{(currentPrice * 0.8).toFixed(1)} – {curSym}{(currentPrice * 1.35).toFixed(1)}</span>
              <span>Day High: {curSym}{dayHigh}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E2DBD0', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${dayRangePosition}%`,
                background: 'var(--color-brass-gradient)',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </div>

        {/* 3. Internal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: 'var(--color-surface-2)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            className={`btn ${activeModalTab === 'fundamentals' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 10px', fontSize: '0.76rem', flex: 1, fontWeight: 700 }}
            onClick={() => setActiveModalTab('fundamentals')}
          >
            1. Research
          </button>
          <button
            type="button"
            className={`btn ${activeModalTab === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 10px', fontSize: '0.76rem', flex: 1, fontWeight: 700 }}
            onClick={() => setActiveModalTab('chart')}
          >
            2. Analysis
          </button>
          <button
            type="button"
            className={`btn ${activeModalTab === 'news' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 10px', fontSize: '0.76rem', flex: 1, fontWeight: 700 }}
            onClick={() => setActiveModalTab('news')}
          >
            3. Decision {companyNews.length > 0 && <span className="badge badge-rise" style={{ marginLeft: '4px', padding: '1px 5px', fontSize: '0.65rem' }}>{companyNews.length}</span>}
          </button>
          <button
            type="button"
            className={`btn ${activeModalTab === 'calculator' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 10px', fontSize: '0.76rem', flex: 1, fontWeight: 700 }}
            onClick={() => setActiveModalTab('calculator')}
          >
            4. Order Slip
          </button>
        </div>

        {/* TAB 1: Technical Chart & Market Depth */}
        {activeModalTab === 'chart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Chart Container */}
            <div style={{
              padding: '16px',
              backgroundColor: '#12161F',
              borderRadius: '12px',
              border: '1px solid #2B3342',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.76rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                  Intraday Tick Trajectory ({secCurrency})
                </span>
                <span className="badge" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', fontWeight: 800, fontSize: '0.72rem' }}>
                  {history.length} Live Samples
                </span>
              </div>
              {renderPriceChart()}

              {profile.note && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderLeft: '4px solid #EF4444',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  color: '#FCA5A5',
                  lineHeight: '1.4'
                }}>
                  ⚠️ <strong>Notice:</strong> {profile.note}
                </div>
              )}
            </div>

            {/* Simulated 5-Level Depth Book */}
            <div className="card-primary" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0, textTransform: 'uppercase' }}>
                  📊 5-Level Order Depth Book
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#242C38', fontWeight: 800 }}>
                  Spread: {curSym}{depth.spread}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }} className="font-data">
                {/* Bids */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-rise)', fontWeight: 900, borderBottom: '1px solid var(--color-border)', paddingBottom: '3px' }}>
                    BUY BIDS ({secCurrency}) &bull; QTY
                  </div>
                  {depth.bids.map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: 'var(--color-rise)', fontWeight: 800 }}>{curSym}{b.price}</span>
                      <span style={{ color: '#242C38' }}>{b.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Asks */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-fall)', fontWeight: 900, borderBottom: '1px solid var(--color-border)', paddingBottom: '3px' }}>
                    SELL ASKS ({secCurrency}) &bull; QTY
                  </div>
                  {depth.asks.map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: 'var(--color-fall)', fontWeight: 800 }}>{curSym}{a.price}</span>
                      <span style={{ color: '#242C38' }}>{a.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Corporate Fundamentals & Profile */}
        {activeModalTab === 'fundamentals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card-primary" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-ink)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                🏢 Instrument Overview & Mandate
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#1E232B', lineHeight: '1.5', margin: 0 }}>
                {security.description || profile.about || `${security.name} is an active constituent in the ${security.sector} sector.`}
              </p>
            </div>

            {/* Key Trading Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Primary Exchange</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{security.exchange || 'NSE'} ({security.country || 'India'})</strong>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Asset Class</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{security.type || 'Stock'}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Trading Currency</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{secCurrency} ({curSym})</strong>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Total Float Units</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{(security.totalUnits || 100000).toLocaleString()}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Available Float</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-rise)' }}>{(security.availableUnits || 0).toLocaleString()}</strong>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.68rem', color: '#4A5568', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Volatility Coeff</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-ink)' }}>{((security.volatility || 0.5) * 100).toFixed(0)}%</strong>
              </div>
            </div>

            {/* Asset Specific Intelligence: STOCKS */}
            {(security.type === 'Stock' || security.type === 'Equity') && (
              <div className="card-primary" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0, textTransform: 'uppercase' }}>
                  🏛️ Executive Leadership & Company Intel
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  {(security.leadership?.ceo || security.ceoName) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>CEO / MD</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.leadership?.ceo || security.ceoName}</strong>
                    </div>
                  )}
                  {security.leadership?.chairperson && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Chairperson</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.leadership.chairperson}</strong>
                    </div>
                  )}
                  {security.headquarters && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Headquarters</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.headquarters}</strong>
                    </div>
                  )}
                  {security.foundedYear && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Founded</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.foundedYear}</strong>
                    </div>
                  )}
                  {security.marketCategory && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Market Tier</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.marketCategory}</strong>
                    </div>
                  )}
                  {security.website && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Official Portal</span>
                      <a href={security.website.startsWith('http') ? security.website : `https://${security.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-rise)', fontWeight: 800, textDecoration: 'none' }}>
                        {security.website} ↗
                      </a>
                    </div>
                  )}
                </div>

                {security.founders && security.founders.length > 0 && (
                  <div style={{ fontSize: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Founders: </span>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{security.founders.join(', ')}</span>
                  </div>
                )}

                {security.majorProducts && security.majorProducts.length > 0 && (
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Flagship Products: </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {security.majorProducts.map((p, idx) => (
                        <span key={idx} className="badge" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink)', border: '1px solid var(--color-border)', fontSize: '0.74rem' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {security.companyHighlights && security.companyHighlights.length > 0 && (
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Market Highlights: </span>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--color-ink)' }}>
                      {security.companyHighlights.map((h, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Asset Specific Intelligence: BONDS */}
            {(security.type === 'CorporateBond' || security.type === 'GovernmentBond' || security.type === 'Corporate Bond' || security.type === 'Government Bond') && (
              <div className="card-primary" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0, textTransform: 'uppercase' }}>
                  📜 Fixed Income & Credit Terms
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Issuer</span>
                    <strong style={{ color: 'var(--color-ink)' }}>{security.issuer || security.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Credit Rating</span>
                    <strong style={{ color: 'var(--color-rise)' }}>{security.creditRating || 'AAA Sovereign'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Coupon Rate</span>
                    <strong style={{ color: 'var(--color-ink)' }}>{security.couponRate ? `${security.couponRate}% p.a.` : 'Benchmark'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                    <span style={{ color: '#4A5568', fontWeight: 700 }}>Maturity Date</span>
                    <strong style={{ color: 'var(--color-ink)' }}>{security.maturityDate || '2031-12-31'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Asset Specific Intelligence: MUTUAL FUNDS & ETFs */}
            {(security.type === 'MutualFund' || security.type === 'Mutual Fund' || security.type === 'ETF') && (
              <div className="card-primary" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0, textTransform: 'uppercase' }}>
                  📊 Fund House & Portfolio Structure
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  {security.fundHouse && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Fund House</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.fundHouse}</strong>
                    </div>
                  )}
                  {security.fundManager && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Fund Manager</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.fundManager}</strong>
                    </div>
                  )}
                  {security.underlyingIndex && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Underlying Index</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.underlyingIndex}</strong>
                    </div>
                  )}
                  {security.investmentCategory && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Category</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.investmentCategory}</strong>
                    </div>
                  )}
                </div>
                {security.investmentObjective && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#4A5568', lineHeight: '1.4' }}>
                    <strong>Objective: </strong>{security.investmentObjective}
                  </p>
                )}
              </div>
            )}

            {/* Asset Specific Intelligence: REITs & InvITs */}
            {(security.type === 'REIT' || security.type === 'InvIT') && (
              <div className="card-primary" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0, textTransform: 'uppercase' }}>
                  🏗️ Trust Sponsorship & Real Assets
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  {security.sponsor && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Principal Sponsor</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.sponsor}</strong>
                    </div>
                  )}
                  {security.assetFocus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Asset Class</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.assetFocus}</strong>
                    </div>
                  )}
                  {security.geographicFocus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                      <span style={{ color: '#4A5568', fontWeight: 700 }}>Geographic Footprint</span>
                      <strong style={{ color: 'var(--color-ink)' }}>{security.geographicFocus}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {security.financeUrl && (
              <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                <a href={security.financeUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  🌐 View {security.ticker} on Google Finance ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Wire Bulletins */}
        {activeModalTab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {companyNews.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No active regulatory or corporate wire dispatches for this security yet.
              </div>
            ) : (
              companyNews.map((n, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${n.sentiment === 'Positive' ? 'var(--green-emerald)' : 'var(--red-crimson)'}`,
                  background: 'var(--bg-warm)',
                  border: '1px solid var(--border-soft)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--navy-900)' }}>{n.headline}</strong>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: n.sentiment === 'Positive' ? 'var(--green-emerald)' : 'var(--red-crimson)'
                    }}>
                      {n.sentiment === 'Positive' ? '▲ POSITIVE' : '▼ NEGATIVE'} ({n.impactPercent}%)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {n.description}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Fast Trade Calculator */}
        {activeModalTab === 'calculator' && (
          <div className="card-primary" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-ink)', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
              🧮 Fast Trade Margin Estimator
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#4A5568', marginBottom: '4px' }}>
                  ACTION
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCalcAction('BUY')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: calcAction === 'BUY' ? 'var(--green-emerald)' : 'var(--color-surface-2)',
                      color: calcAction === 'BUY' ? '#fff' : 'var(--navy-900)',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcAction('SELL')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: calcAction === 'SELL' ? 'var(--red-crimson)' : 'var(--color-surface-2)',
                      color: calcAction === 'SELL' ? '#fff' : 'var(--navy-900)',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#4A5568', marginBottom: '4px' }}>
                  QUANTITY (UNITS)
                </label>
                <input
                  type="number"
                  min="1"
                  value={calcQty}
                  onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            {/* Breakdown Result */}
            <div style={{
              background: 'var(--bg-warm)',
              border: '1px solid var(--border-soft)',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Native Order Value ({secCurrency}):</span>
                <strong style={{ color: 'var(--navy-900)' }}>{curSym}{calcGrossNative.toLocaleString()}</strong>
              </div>
              {isForeign && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Consolidated INR Margin:</span>
                  <strong style={{ color: 'var(--gold-royal)' }}>≈ ₹{calcGrossINR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Price Impact:</span>
                <span style={{ color: 'var(--navy-900)', fontWeight: 700 }}>~{calcImpactPercent}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyOrderSummary}
              style={{
                width: '100%',
                background: 'var(--navy-900)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {copiedNotification ? '✓ Order Summary Copied to Clipboard!' : '📋 Copy Order Slip Configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
