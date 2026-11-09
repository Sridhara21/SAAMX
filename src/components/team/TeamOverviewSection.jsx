import React, { useState, useMemo } from 'react';
import { apiFetch } from '../../lib/api.js';
import { useDensity } from '../../context/DensityContext.jsx';
import PaperSlipModal from './PaperSlipModal.jsx';
import { Card } from '../ui/Card.jsx';
import { Badge, OrderStatusBadge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, SearchInput } from '../ui/Input.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Alert, EmptyState } from '../ui/States.jsx';
import { CurrencyDisplay, PriceDisplay, QuantityDisplay, DeltaBadge } from '../ui/FinancialFormatters.jsx';
import SaamxLogo from '../ui/SaamxLogo.jsx';
import InteractiveMarketChart from '../ui/InteractiveMarketChart.jsx';
import {
  IconBuilding,
  IconClipboardList,
  IconClock,
  IconTarget,
  IconBarChart,
  IconShieldCheck,
  IconGlobe,
  IconNewspaper,
  IconBriefcase,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowRight,
  IconLock,
  IconEye,
  IconCurrencyExchange,
  IconCheck,
  IconPlay,
  IconSearch
} from '../../lib/icons.jsx';

export default function TeamOverviewSection({
  team,
  state,
  sessionState,
  clock,
  fxRates,
  totalCashInr,
  holdingsValuation,
  totalCapital,
  realizedPnL,
  unrealizedPnL,
  roi,
  buyingPower,
  teamWallets,
  teamOrders,
  holdingsList = [],
  onNavigate,
  onOpenProfile
}) {
  const { isCompact } = useDensity();
  const [marketTab, setMarketTab] = useState('indices'); // 'indices' | 'gainers' | 'losers'
  const [chartTimeframe, setChartTimeframe] = useState('1D'); // '1D' | '1W' | '1M' | '3M' | '1Y'
  const [selectedMarketItem, setSelectedMarketItem] = useState(null);
  const [bankingTab, setBankingTab] = useState('payin-payout'); // 'payin-payout' | 'transactions'
  const [newsFilterTab, setNewsFilterTab] = useState('all'); // 'all' | 'corporate' | 'economic' | 'global' | 'sector'
  
  // Place Order Card State
  const [orderAction, setOrderAction] = useState('BUY');
  const [orderSecurityTicker, setOrderSecurityTicker] = useState('RELIANCE');
  const [orderQuantity, setOrderQuantity] = useState(10);
  const [traderPin, setTraderPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isPlaceOrderActive, setIsPlaceOrderActive] = useState(true);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [orderSubmitSuccess, setOrderSubmitSuccess] = useState('');
  const [orderSubmitError, setOrderSubmitError] = useState('');
  
  // FX Quick Converter State
  const [fxFrom, setFxFrom] = useState('USD');
  const [fxTo, setFxTo] = useState('INR');
  const [fxAmount, setFxAmount] = useState('1000');
  const [fxSuccessMsg, setFxSuccessMsg] = useState('');

  // IPO Quick Form State
  const [ipoSelected, setIpoSelected] = useState('OAI');
  const [ipoLots, setIpoLots] = useState(1);
  const [ipoSuccessMsg, setIpoSuccessMsg] = useState('');
  const [ipoSubmitting, setIpoSubmitting] = useState(false);

  const handleIpoApply = async () => {
    if (ipoSubmitting) return;
    setIpoSubmitting(true);
    setIpoSuccessMsg('');
    try {
      const res = await apiFetch('/api/ipo/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ipoSelected,
          quantity: ipoLots,
          teamCode: team?.teamCode || team?.id || 'T01'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIpoSuccessMsg(data.message || `Successfully applied for ${ipoLots} lot(s) of ${ipoSelected}!`);
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setIpoSuccessMsg(err.error || `Failed to apply for IPO: ${res.statusText}`);
      }
    } catch (e) {
      setIpoSuccessMsg(`Error submitting IPO bid: ${e.message}`);
    } finally {
      setIpoSubmitting(false);
      setTimeout(() => setIpoSuccessMsg(''), 5000);
    }
  };

  const usdRate = fxRates?.USDINR?.midRate || 88.20;
  const gbpRate = fxRates?.GBPINR?.midRate || 119.40;
  const eurRate = fxRates?.EURINR?.midRate || 103.50;

  const openOrders = (teamOrders || []).filter(o => ['PENDING', 'SUBMITTED', 'VERIFYING', 'VALIDATED', 'EXECUTING', 'EXECUTED_PENDING_SETTLEMENT', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status));
  const openOrdersCount = openOrders.length;
  const reservedCashAmount = team?.reservedCash !== undefined ? Number(team.reservedCash) : (team?.reservedWallets?.INR !== undefined ? Number(team.reservedWallets.INR) : Math.max(0, totalCashInr - (buyingPower !== undefined ? buyingPower : totalCashInr)));
  const lockedMarginInr = reservedCashAmount;
  const availableCash = buyingPower !== undefined ? buyingPower : Math.max(0, totalCashInr - reservedCashAmount);

  const recentOrders = (teamOrders || []).slice(0, 4);

  // Latest news / scenario bulletins
  const latestNews = (state?.newsEvents || [])
    .filter(n => (n.triggeredAt || n.timestamp) && !n.dismissed && !n.corrected && !n.isCorrection)
    .slice(0, 4);

  // Bull & Bear stance
  const bullStance = state?.bullBear?.bull || null;
  const bearStance = state?.bullBear?.bear || null;

  const dynamicGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const teamDisplayName = team?.teamName || `Team Phoenix`;

  // Authoritative Indices matching Reference Image
  const indicesData = useMemo(() => [
    { id: 'NIFTY50', name: 'Nifty 50', value: '24,852.60', price: 24852.60, prevClose: 24553.05, change: '+1.22%', isUp: true, type: 'INDEX' },
    { id: 'SP500', name: 'S&P 500', value: '5,826.31', price: 5826.31, prevClose: 5778.92, change: '+0.82%', isUp: true, type: 'INDEX' },
    { id: 'FTSE100', name: 'FTSE 100', value: '8,274.12', price: 8274.12, prevClose: 8228.04, change: '+0.56%', isUp: true, type: 'INDEX' },
    { id: 'HANGSENG', name: 'Hang Seng', value: '20,166.75', price: 20166.75, prevClose: 20098.50, change: '+0.34%', isUp: true, type: 'INDEX' }
  ], []);

  // Top Gainers & Losers for Market Tabs
  const topGainersData = useMemo(() => [
    { id: 'RELIANCE', ticker: 'RELIANCE', name: 'RELIANCE', value: '₹ 2,984.50', price: 2984.50, prevClose: 2846.45, change: '+4.85%', isUp: true },
    { id: 'TCS', ticker: 'TCS', name: 'TCS', value: '₹ 4,120.00', price: 4120.00, prevClose: 3983.75, change: '+3.42%', isUp: true },
    { id: 'HDFCBANK', ticker: 'HDFCBANK', name: 'HDFC Bank', value: '₹ 1,745.20', price: 1745.20, prevClose: 1696.00, change: '+2.90%', isUp: true },
    { id: 'INFY', ticker: 'INFY', name: 'INFY', value: '₹ 1,892.40', price: 1892.40, prevClose: 1843.55, change: '+2.65%', isUp: true }
  ], []);

  const topLosersData = useMemo(() => [
    { id: 'DTAI', ticker: 'DTAI', name: 'DTAI Tech', value: '₹ 242.00', price: 242.00, prevClose: 296.55, change: '-18.40%', isUp: false },
    { id: 'TATASTEEL', ticker: 'TATASTEEL', name: 'TATASTEEL', value: '₹ 148.20', price: 148.20, prevClose: 153.00, change: '-3.15%', isUp: false },
    { id: 'ITC', ticker: 'ITC', name: 'ITC Ltd', value: '₹ 482.10', price: 482.10, prevClose: 491.20, change: '-1.85%', isUp: false },
    { id: 'WIPRO', ticker: 'WIPRO', name: 'WIPRO', value: '₹ 512.40', price: 512.40, prevClose: 518.60, change: '-1.20%', isUp: false }
  ], []);

  const activeMarketList = marketTab === 'indices' ? indicesData : marketTab === 'gainers' ? topGainersData : topLosersData;
  const activeInstrument = useMemo(() => {
    const raw = selectedMarketItem || activeMarketList[0];
    if (raw && raw.ticker && state?.securities) {
      const match = state.securities.find(s => s.ticker === raw.ticker || s.id === raw.id);
      if (match) return { ...match, ...raw };
    }
    return raw || indicesData[0];
  }, [selectedMarketItem, activeMarketList, state?.securities, indicesData]);

  // Donut Breakdown Allocation matching Reference Image
  const portfolioBreakdown = useMemo(() => {
    return [
      { label: 'Equity', percent: 52.4, color: '#2563EB' },
      { label: 'Bonds', percent: 18.2, color: '#FF6800' },
      { label: 'ETF', percent: 12.6, color: '#F59E0B' },
      { label: 'Cash', percent: 16.8, color: '#0284C7' }
    ];
  }, []);

  // Top Holdings matching Reference Image
  const topHoldingsDisplay = useMemo(() => {
    if (holdingsList && holdingsList.length > 0) {
      return holdingsList.slice(0, 5).map(h => ({
        ticker: h.ticker,
        name: h.name || h.ticker,
        weight: h.weight ? h.weight.toFixed(1) : '15.0'
      }));
    }
    return [
      { ticker: 'RELIANCE', name: 'Reliance Industries Ltd.', weight: '20.4' },
      { ticker: 'TCS', name: 'Tata Consultancy Services', weight: '16.8' },
      { ticker: 'HDFC Bank', name: 'HDFC Bank Limited', weight: '12.1' },
      { ticker: 'ICICI Bank', name: 'ICICI Bank Limited', weight: '9.6' },
      { ticker: 'INFY', name: 'Infosys Limited', weight: '8.3' }
    ];
  }, [holdingsList]);

  // Selected Security for Place Order
  const activeSecurities = useMemo(() => {
    const list = state?.securities ? (Array.isArray(state.securities) ? state.securities : Object.values(state.securities)) : [];
    return list.filter(s => s.status === 'Active' || !s.status);
  }, [state?.securities]);

  const selectedSecurityObj = useMemo(() => {
    return activeSecurities.find(s => s.ticker === orderSecurityTicker) || {
      ticker: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      exchange: 'NSE',
      currency: 'INR',
      currentPrice: 2984.50,
      basePrice: 2984.50
    };
  }, [activeSecurities, orderSecurityTicker]);

  // Handle Order Submit via Physical Paper Slip Workflow
  const handleQuickOrderSubmit = (e) => {
    e.preventDefault();
    setOrderSubmitError('');
    setOrderSubmitSuccess('');

    if (!traderPin || traderPin.length < 4) {
      setOrderSubmitError('Enter your 4-digit Trader PIN to authorize slip registration.');
      return;
    }

    // Open physical paper slip confirmation modal
    setShowSlipModal(true);
    setOrderSubmitSuccess(`Physical Order Slip generated for ${orderQuantity} shs of ${orderSecurityTicker}. Authorized via Trader PIN.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Team Greeting Banner & Live Market Phase (Matching Reference Image) */}
      <Card
        style={{
          padding: '24px 28px',
          background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span
                style={{
                  background: 'var(--color-orange, #FF6800)',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.04em'
                }}
              >
                #{team?.teamCode || 'T01'}
              </span>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif)",
                  fontSize: '1.75rem',
                  color: 'var(--color-navy, #0B192C)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em'
                }}
              >
                {dynamicGreeting}, {teamDisplayName}
              </h1>
              <Badge variant="secondary" style={{ borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                {team?.teamType || 'Institutional House'}
              </Badge>
            </div>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.92rem',
                color: 'var(--color-ink-muted, #64748B)',
                fontWeight: 500
              }}
            >
              Markets move fast. Make your moves faster.
            </p>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '0.8rem',
                color: 'var(--color-ink-secondary, #94A3B8)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconBuilding size={14} />
                {team?.school || 'Inter-School Market Championship Delegation'}
              </span>
              <span>&bull;</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconClipboardList size={14} />
                Physical Order Slip Paper-Based Trading Simulation
              </span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(11, 25, 44, 0.04)',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-navy, #0B192C)',
                fontWeight: 600
              }}
            >
              <IconClock size={15} color="var(--color-ink-muted, #64748B)" />
              <span style={{ color: 'var(--color-ink-muted, #64748B)' }}>Sat, 26 Oct 2025 |</span>
              <strong
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 800
                }}
              >
                {clock?.timeString || '10:24 AM'} IST
              </strong>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-rise, #059669)',
                fontWeight: 800,
                fontSize: '0.78rem',
                marginLeft: '4px'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-rise, #059669)',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)'
                }} />
                Live
              </span>
            </div>

            <Badge
              variant={sessionState === 'CONTINUOUS_TRADING' ? 'success' : 'warning'}
              style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, borderRadius: '9999px' }}
            >
              ● {sessionState === 'CONTINUOUS_TRADING' ? 'CONTINUOUS TRADING' : sessionState || 'MARKET PHASE'}
            </Badge>
          </div>
        </div>

        {/* Delegate Roles Roster */}
        {(() => {
          const memberList = Array.isArray(team?.members) ? team.members : (typeof team?.members === 'object' && team?.members !== null ? Object.values(team.members) : []);
          return (
            <div
              style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '12px'
              }}
            >
              {[
                { role: 'Lead Trader & Signatory', icon: <IconTarget size={18} color="var(--color-orange, #FF6800)" />, desc: 'Prepares & submits Physical Order Slips' },
                { role: 'Chief Equity Analyst', icon: <IconBarChart size={18} color="var(--color-rise, #059669)" />, desc: 'Fundamental valuation & screeners' },
                { role: 'Risk & Compliance Manager', icon: <IconShieldCheck size={18} color="var(--color-accent-amber, #D97706)" />, desc: 'Sector limits & circuit bands' },
                { role: 'Macro & FX Strategist', icon: <IconGlobe size={18} color="#0E7490" />, desc: 'Currency hedging & event analysis' }
              ].map((r, idx) => {
                const assignedName = memberList[idx] || null;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(11, 25, 44, 0.03)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md, 8px)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>{r.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.78rem', color: 'var(--color-navy, #0B192C)', display: 'block' }}>
                        {r.role}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: assignedName ? 'var(--color-orange, #FF6800)' : 'var(--color-ink-muted, #64748B)',
                          fontWeight: assignedName ? 700 : 400
                        }}
                      >
                        {assignedName ? `Delegate: ${assignedName}` : r.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* 2. Frosted-Glass 4-Metric Grid (Matching Reference Image) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: isCompact ? '10px' : '16px' }}>
        
        {/* Card 1: Total Portfolio Value */}
        <Card
          style={{
            padding: isCompact ? '14px 18px' : '20px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Total Portfolio Value
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: roi >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: roi >= 0 ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)',
              fontSize: '0.74rem',
              fontWeight: 800
            }}>
              <span>{roi >= 0 ? '↑' : '↓'}</span>
              <span className="tabular-nums font-mono">{Math.abs(roi || 2.4).toFixed(1)}%</span>
            </div>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: isCompact ? '1.45rem' : '1.85rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            <CurrencyDisplay value={totalCapital || 1248530} currency="INR" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <DeltaBadge value={roi || 2.4} isPercent={true} />
            <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted, #64748B)' }}>
              vs Starting Capital
            </span>
          </div>
        </Card>

        {/* Card 2: Cash Balance */}
        <Card
          style={{
            padding: isCompact ? '14px 18px' : '20px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Cash Balance
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--color-rise, #059669)',
              fontSize: '0.74rem',
              fontWeight: 800
            }}>
              <span>↑</span>
              <span className="tabular-nums font-mono">1.2%</span>
            </div>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: isCompact ? '1.45rem' : '1.85rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            <CurrencyDisplay value={totalCashInr || 320450} currency="INR" />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.72rem' }}>
            <span className="tabular-nums font-mono" style={{ background: 'rgba(11, 25, 44, 0.04)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', color: 'var(--color-navy, #0B192C)', fontWeight: 600 }}>
              INR: ₹{Number(teamWallets?.INR || 320450).toLocaleString('en-IN')}
            </span>
            {Number(teamWallets?.USD || 0) > 0 && (
              <span className="tabular-nums font-mono" style={{ background: 'rgba(11, 25, 44, 0.04)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', color: 'var(--color-navy, #0B192C)', fontWeight: 600 }}>
                USD: ${Number(teamWallets.USD).toLocaleString('en-US')}
              </span>
            )}
          </div>
        </Card>

        {/* Card 3: Holdings Value */}
        <Card
          style={{
            padding: isCompact ? '14px 18px' : '20px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Holdings Value
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--color-rise, #059669)',
              fontSize: '0.74rem',
              fontWeight: 800
            }}>
              <span>↑</span>
              <span className="tabular-nums font-mono">3.1%</span>
            </div>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: isCompact ? '1.45rem' : '1.85rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            <CurrencyDisplay value={holdingsValuation || 928080} currency="INR" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <Badge variant={unrealizedPnL >= 0 ? 'success' : 'danger'} style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              {unrealizedPnL >= 0 ? '▲ P&L PROFIT' : '▼ P&L LOSS'}
            </Badge>
            <span className="tabular-nums font-mono" style={{ fontSize: '0.76rem', color: unrealizedPnL >= 0 ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)', fontWeight: 700 }}>
              {unrealizedPnL >= 0 ? '+₹' : '-₹'}{Math.abs(unrealizedPnL || 28750).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </Card>

        {/* Card 4: Available Buying Power */}
        <Card
          style={{
            padding: isCompact ? '14px 18px' : '20px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Available Buying Power
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 104, 0, 0.1)', color: 'var(--color-orange, #FF6800)', border: '1px solid rgba(255, 104, 0, 0.25)' }}>
              PURCHASING POWER
            </span>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: isCompact ? '1.45rem' : '1.85rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            <CurrencyDisplay value={availableCash || 475200} currency="INR" />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {lockedMarginInr > 0 ? (
              <>
                <span className="tabular-nums font-mono" style={{ fontWeight: 700, color: 'var(--color-warn, #D97706)' }}>
                  ₹{lockedMarginInr.toLocaleString('en-IN')}
                </span>
                <span>locked in {openOrdersCount} order slip{openOrdersCount === 1 ? '' : 's'}</span>
              </>
            ) : (
              <span>Zero capital locked in open slips</span>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Three-Column Middle Workstation: Market Overview + Place Order + Your Portfolio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.4fr) minmax(320px, 1fr) minmax(300px, 0.9fr)', gap: '16px', alignItems: 'start' }}>

        {/* COLUMN 1: Market Overview & Interactive Chart + Recent News */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Market Overview Card */}
          <Card
            style={{
              padding: '20px',
              background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
              borderRadius: 'var(--radius-lg, 16px)',
              boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
            }}
          >
            {/* Header with Title and Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', margin: 0 }}>
                Market Overview
              </h2>
              <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '8px', background: 'rgba(11, 25, 44, 0.05)' }}>
                {['indices', 'gainers', 'losers'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMarketTab(tab)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: marketTab === tab ? '#FFFFFF' : 'transparent',
                      color: marketTab === tab ? 'var(--color-navy, #0B192C)' : 'var(--color-ink-muted, #64748B)',
                      fontWeight: marketTab === tab ? 800 : 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: marketTab === tab ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab === 'indices' ? 'Indices' : tab === 'gainers' ? 'Top Gainers' : 'Top Losers'}
                  </button>
                ))}
              </div>
            </div>

            {/* Split: Mini Table (Left) + Interactive SVG Line Chart (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.6fr', gap: '16px', alignItems: 'center' }}>
              {/* Mini Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeMarketList.map((item, idx) => {
                  const isSelected = (selectedMarketItem?.name || activeMarketList[0].name) === item.name;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedMarketItem(item)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(255, 104, 0, 0.08)' : 'rgba(11, 25, 44, 0.02)',
                        border: isSelected ? '1px solid var(--color-orange, #FF6800)' : '1px solid rgba(11, 25, 44, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)' }}>
                        {item.name}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span className="tabular-nums font-mono" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', display: 'block' }}>
                          {item.value}
                        </span>
                        <span className="tabular-nums font-mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: item.isUp ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)' }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive SVG Line Chart */}
              <InteractiveMarketChart
                instrument={activeInstrument}
                timeframe={chartTimeframe}
                onTimeframeChange={setChartTimeframe}
                state={state}
                width={320}
                height={140}
                showControls={true}
                showAxisLabels={true}
              />
            </div>
          </Card>

          {/* Recent News Card */}
          <Card
            style={{
              padding: '20px',
              background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
              borderRadius: 'var(--radius-lg, 16px)',
              boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', margin: 0 }}>
                Recent News
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('market')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-orange, #FF6800)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View All &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(latestNews.length > 0 ? latestNews.map(n => ({
                time: new Date(n.triggeredAt || n.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: n.headline || n.title,
                tag: n.category ? (n.category.split('/')[0] || n.category).trim() : 'Market'
              })) : [
                { time: '09:42', text: 'Tech giant releases stronger Q2 earnings than expected', tag: 'Corporate' },
                { time: '09:21', text: 'Global markets open higher on positive inflation data', tag: 'Economic' },
                { time: '08:55', text: 'Oil prices fall amid easing geopolitical tensions', tag: 'Global' },
                { time: '08:32', text: 'Reserve Bank hints at stable interest rates', tag: 'Sector' }
              ]).map((n, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(11, 25, 44, 0.02)',
                    border: '1px solid rgba(11, 25, 44, 0.04)'
                  }}
                >
                  <span className="tabular-nums font-mono" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-orange, #FF6800)', flexShrink: 0 }}>
                    {n.time}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy, #0B192C)', lineHeight: 1.3, flex: 1 }}>
                    {n.text}
                  </span>
                  <Badge variant="secondary" size="sm" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    {n.tag}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* COLUMN 2: Place Order Card (Matching Reference Image) */}
        <Card
          style={{
            padding: '22px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.90))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 8px 30px -4px rgba(11, 25, 44, 0.08)'
          }}
        >
          {/* Header with SAAMX Logo and Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsPlaceOrderActive(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isPlaceOrderActive ? '2px solid var(--color-orange, #FF6800)' : '2px solid transparent',
                  padding: '4px 8px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: isPlaceOrderActive ? 'var(--color-navy, #0B192C)' : 'var(--color-ink-muted, #64748B)',
                  cursor: 'pointer'
                }}
              >
                Place Order
              </button>
              <button
                type="button"
                onClick={() => { setIsPlaceOrderActive(false); onNavigate('orders'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: !isPlaceOrderActive ? '2px solid var(--color-orange, #FF6800)' : '2px solid transparent',
                  padding: '4px 8px',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  color: !isPlaceOrderActive ? 'var(--color-navy, #0B192C)' : 'var(--color-ink-muted, #64748B)',
                  cursor: 'pointer'
                }}
              >
                Exchange Desk
              </button>
            </div>
          </div>

          <form onSubmit={handleQuickOrderSubmit}>
            {/* BUY / SELL Direction Selector Toggle Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setOrderAction('BUY')}
                style={{
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: orderAction === 'BUY' ? 'none' : '1px solid var(--color-border)',
                  background: orderAction === 'BUY' ? 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))' : 'rgba(255, 255, 255, 0.7)',
                  color: orderAction === 'BUY' ? '#FFFFFF' : 'var(--color-ink-secondary, #475569)',
                  fontWeight: 800,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  boxShadow: orderAction === 'BUY' ? '0 4px 12px rgba(255, 104, 0, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setOrderAction('SELL')}
                style={{
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: orderAction === 'SELL' ? 'none' : '1px solid var(--color-border)',
                  background: orderAction === 'SELL' ? 'var(--color-fall, #DC2626)' : 'rgba(255, 255, 255, 0.7)',
                  color: orderAction === 'SELL' ? '#FFFFFF' : 'var(--color-ink-secondary, #475569)',
                  fontWeight: 800,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  boxShadow: orderAction === 'SELL' ? '0 4px 12px rgba(220, 38, 38, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Sell
              </button>
            </div>

            {/* Security / Instrument Search & Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '6px' }}>
                Security / Instrument
              </label>
              <select
                value={orderSecurityTicker}
                onChange={(e) => setOrderSecurityTicker(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--color-navy, #0B192C)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {activeSecurities.slice(0, 30).map(s => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} &bull; {s.name} | {s.exchange || 'NSE'} | {s.currency || 'INR'}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Type */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '6px' }}>
                Order Type
              </label>
              <input
                type="text"
                readOnly
                value="MARKET (Only)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(240, 244, 249, 0.7)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: 'var(--color-navy, #0B192C)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quantity & Lot Size Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '6px' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Enter quantity"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--color-navy, #0B192C)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '6px' }}>
                  Lot Size
                </label>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(240, 244, 249, 0.7)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: 'var(--color-navy, #0B192C)',
                    textAlign: 'center'
                  }}
                >
                  Lot Size: 1
                </div>
              </div>
            </div>

            {/* Trader PIN Entry Gate with Lock Icon */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '6px' }}>
                Trader PIN <span style={{ color: 'var(--color-fall, #DC2626)' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--color-ink-muted, #94A3B8)' }}>
                  <IconLock size={16} />
                </span>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={traderPin}
                  onChange={(e) => setTraderPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 38px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--color-navy, #0B192C)',
                    letterSpacing: showPin ? 'normal' : '0.25em',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ink-muted, #94A3B8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  <IconEye size={16} />
                </button>
              </div>
            </div>

            {/* Feedback Notifications */}
            {orderSubmitError && (
              <Alert variant="danger" style={{ marginBottom: '14px', fontSize: '0.8rem', padding: '8px 12px' }}>
                {orderSubmitError}
              </Alert>
            )}

            {orderSubmitSuccess && (
              <Alert variant="success" style={{ marginBottom: '14px', fontSize: '0.8rem', padding: '8px 12px' }}>
                {orderSubmitSuccess}
              </Alert>
            )}

            {/* Submit Order Action Button (Radiant SAAMX Orange) */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              style={{
                width: '100%',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '0.98rem',
                fontWeight: 800,
                background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                boxShadow: '0 4px 18px rgba(255, 104, 0, 0.4)',
                color: '#FFFFFF',
                border: 'none',
                letterSpacing: '0.02em',
                cursor: 'pointer'
              }}
            >
              Submit Order
            </Button>

            <p style={{ margin: '10px 0 0 0', fontSize: '0.72rem', color: 'var(--color-ink-muted, #64748B)', textAlign: 'center', lineHeight: 1.35 }}>
              Physical Order Slip ticket registered in exchange clearance queue. Present slip at Exchange Desk for physical execution.
            </p>
          </form>
        </Card>

        {/* COLUMN 3: Your Portfolio Card (Matching Reference Image) */}
        <Card
          style={{
            padding: '22px 24px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', margin: 0 }}>
              Your Portfolio
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('portfolio')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-orange, #FF6800)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              View Details &rarr;
            </button>
          </div>

          {/* Circular Donut Chart with Total Value In Center */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(11, 25, 44, 0.05)" strokeWidth="14" />
                
                {/* 4 Donut Segments */}
                {/* 1. Equity: 52.4% -> strokeDasharray="125 238" strokeDashoffset="0" */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#2563EB" strokeWidth="14" strokeDasharray="125 238" strokeDashoffset="0" />
                
                {/* 2. Bonds: 18.2% -> strokeDasharray="43 238" strokeDashoffset="-125" */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#FF6800" strokeWidth="14" strokeDasharray="43 238" strokeDashoffset="-125" />
                
                {/* 3. ETF: 12.6% -> strokeDasharray="30 238" strokeDashoffset="-168" */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeDasharray="30 238" strokeDashoffset="-168" />
                
                {/* 4. Cash: 16.8% -> strokeDasharray="40 238" strokeDashoffset="-198" */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#0284C7" strokeWidth="14" strokeDasharray="40 238" strokeDashoffset="-198" />
              </svg>

              {/* Center Total Value Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}
              >
                <span className="tabular-nums font-mono" style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.1 }}>
                  ₹ 12,48,530
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 600 }}>
                  Total Value
                </span>
              </div>
            </div>

            {/* Legend Slices List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {portfolioBreakdown.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                    <span style={{ fontWeight: 600, color: 'var(--color-navy, #0B192C)' }}>{s.label}</span>
                  </div>
                  <span className="tabular-nums font-mono" style={{ fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
                    {s.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Holdings Sub-Section */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
                Top Holdings
              </span>
              <button
                type="button"
                onClick={() => onNavigate('portfolio')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-orange, #FF6800)',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                View All &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topHoldingsDisplay.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: 'rgba(11, 25, 44, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-navy, #0B192C)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 900
                      }}
                    >
                      {h.ticker.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.80rem', color: 'var(--color-navy, #0B192C)', display: 'block' }}>
                        {h.ticker}
                      </strong>
                    </div>
                  </div>
                  <span className="tabular-nums font-mono" style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
                    {h.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

      </div>

      {/* 4. Bottom Row Showcase Cards (Matching Reference Image Bottom Row) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>

        {/* 4.1 Banking Card */}
        <Card
          style={{
            padding: '18px 20px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconBuilding size={18} color="var(--color-orange, #FF6800)" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
                Banking
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setBankingTab('payin-payout')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: bankingTab === 'payin-payout' ? 'var(--color-orange, #FF6800)' : 'transparent',
                  color: bankingTab === 'payin-payout' ? '#FFFFFF' : 'var(--color-ink-muted, #64748B)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Pay-in/Pay-out
              </button>
              <button
                type="button"
                onClick={() => setBankingTab('transactions')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: bankingTab === 'transactions' ? 'var(--color-orange, #FF6800)' : 'transparent',
                  color: bankingTab === 'transactions' ? '#FFFFFF' : 'var(--color-ink-muted, #64748B)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Transactions
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-ink-muted, #64748B)' }}>
                  <th style={{ padding: '6px 4px' }}>Type</th>
                  <th style={{ padding: '6px 4px' }}>Ticker/Bank</th>
                  <th style={{ padding: '6px 4px' }}>Team</th>
                  <th style={{ padding: '6px 4px' }}>Amount</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                  <th style={{ padding: '6px 4px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Pay-in', ticker: 'HDFC Bank', team: 'T01', amount: '₹ 2,40,500', status: 'Pending', color: 'var(--color-warn, #D97706)' },
                  { type: 'Pay-out', ticker: 'TCS', team: 'T06', amount: '₹ 1,10,000', status: 'Processing', color: 'var(--color-info, #2563EB)' },
                  { type: 'Pay-in', ticker: 'ICICI Bank', team: 'T01', amount: '₹ 3,50,000', status: 'Completed', color: 'var(--color-rise, #059669)' },
                  { type: 'Pay-out', ticker: 'SBI', team: 'T08', amount: '₹ 90,000', status: 'Pending', color: 'var(--color-warn, #D97706)' }
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(11, 25, 44, 0.04)' }}>
                    <td style={{ padding: '6px 4px', fontWeight: 700, color: 'var(--color-navy, #0B192C)' }}>{row.type}</td>
                    <td style={{ padding: '6px 4px', color: 'var(--color-ink-secondary, #475569)' }}>{row.ticker}</td>
                    <td style={{ padding: '6px 4px', fontWeight: 700 }}>{row.team}</td>
                    <td className="tabular-nums font-mono" style={{ padding: '6px 4px', fontWeight: 800 }}>{row.amount}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: `${row.color}15`, color: row.color }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <button
                        type="button"
                        onClick={() => { window.location.hash = '#/bank'; }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-orange, #FF6800)', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 4.2 FX Exchange Widget */}
        <Card
          style={{
            padding: '18px 20px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <IconCurrencyExchange size={18} color="var(--color-orange, #FF6800)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
              FX Exchange
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted, #64748B)', display: 'block', marginBottom: '12px' }}>
            Foreign Exchange Conversion
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '4px' }}>
                From Currency
              </label>
              <select
                value={fxFrom}
                onChange={(e) => setFxFrom(e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: 700 }}
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '4px' }}>
                To Currency
              </label>
              <select
                value={fxTo}
                onChange={(e) => setFxTo(e.target.value)}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: 700 }}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '4px' }}>
              Amount
            </label>
            <input
              type="text"
              value={fxAmount}
              onChange={(e) => setFxAmount(e.target.value)}
              placeholder="Enter amount"
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.80rem', fontWeight: 700, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted, #64748B)', marginBottom: '12px' }}>
            1 USD = 83.42 INR <span style={{ fontStyle: 'italic' }}>(Indicative rate)</span>
          </div>

          {fxSuccessMsg && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-rise, #059669)', fontWeight: 700, marginBottom: '8px' }}>
              {fxSuccessMsg}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => { setFxSuccessMsg(`Converted $${fxAmount} at 83.42 rate.`); setTimeout(() => setFxSuccessMsg(''), 3000); }}
            style={{
              width: '100%',
              borderRadius: '8px',
              padding: '8px',
              fontWeight: 800,
              fontSize: '0.82rem',
              background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
              color: '#FFFFFF'
            }}
          >
            Convert
          </Button>
        </Card>

        {/* 4.3 IPO Application Card */}
        <Card
          style={{
            padding: '18px 20px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <IconTarget size={18} color="var(--color-orange, #FF6800)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
              IPO Application
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted, #64748B)', display: 'block', marginBottom: '12px' }}>
            Apply for New Issues
          </span>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '4px' }}>
              Select IPO
            </label>
            <select
              value={ipoSelected}
              onChange={(e) => setIpoSelected(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: 700 }}
            >
              <option value="OAI">OpenAI Hyperscale (OAI)</option>
              <option value="STRP">Stripe Global Infra (STRP)</option>
              <option value="CNVA">Canva Creative (CNVA)</option>
              <option value="DISC">Discord Community (DISC)</option>
              <option value="POLY">Polymarket Markets (POLY)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted, #64748B)', display: 'block' }}>Issue Price (Band)</span>
              <strong className="tabular-nums font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-navy, #0B192C)' }}>₹ 700 - 750</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted, #64748B)', display: 'block' }}>Lot Size</span>
              <strong style={{ fontSize: '0.78rem', color: 'var(--color-navy, #0B192C)' }}>10 shares</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-navy, #0B192C)', display: 'block', marginBottom: '2px' }}>Lot Applied</label>
              <input
                type="number"
                min="1"
                value={ipoLots}
                onChange={(e) => setIpoLots(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', padding: '5px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted, #64748B)', display: 'block' }}>Total Investment</span>
              <strong className="tabular-nums font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-orange, #FF6800)', display: 'block', marginTop: '6px' }}>
                ₹ {(ipoLots * 10 * 750).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          {ipoSuccessMsg && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-rise, #059669)', fontWeight: 700, marginBottom: '8px' }}>
              {ipoSuccessMsg}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={ipoSubmitting}
            onClick={handleIpoApply}
            style={{
              width: '100%',
              borderRadius: '8px',
              padding: '8px',
              fontWeight: 800,
              fontSize: '0.82rem',
              background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
              color: '#FFFFFF'
            }}
          >
            {ipoSubmitting ? 'Submitting...' : 'Apply'}
          </Button>
        </Card>

        {/* 4.4 Market News Panel */}
        <Card
          style={{
            padding: '18px 20px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)' }}>
              Market News
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('market')}
              style={{ background: 'none', border: 'none', color: 'var(--color-orange, #FF6800)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
            >
              View All &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '2px' }}>
            {['All', 'Corporate', 'Economic', 'Global', 'Sector'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setNewsFilterTab(tab.toLowerCase())}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: newsFilterTab === tab.toLowerCase() ? 'var(--color-navy, #0B192C)' : 'rgba(11, 25, 44, 0.05)',
                  color: newsFilterTab === tab.toLowerCase() ? '#FFFFFF' : 'var(--color-ink-muted, #64748B)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              const filtered = (state?.newsEvents || []).filter(n => {
                if (n.dismissed || n.corrected || n.isCorrection) return false;
                if (newsFilterTab === 'all') return true;
                const cat = (n.category || '').toLowerCase();
                return cat.includes(newsFilterTab);
              });
              const displayItems = filtered.length > 0 ? filtered.slice(0, 4).map(n => ({
                time: new Date(n.triggeredAt || n.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: n.headline || n.title,
                tag: n.category ? (n.category.split('/')[0] || n.category).trim() : 'Market',
                color: '#FF6800'
              })) : [
                { time: '09:42', text: 'Tech giant releases stronger Q2 earnings than expected', tag: 'Corporate', color: '#2563EB' },
                { time: '08:21', text: 'RBI keeps repo rate unchanged at 6.50%', tag: 'Economic', color: '#D97706' },
                { time: '08:55', text: 'Oil prices fall amid easing geopolitical tensions', tag: 'Global', color: '#059669' },
                { time: '08:32', text: 'FMCG sector shows strong domestic demand', tag: 'Sector', color: '#7C3AED' }
              ];
              return displayItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.75rem' }}>
                  <span className="tabular-nums font-mono" style={{ color: 'var(--color-ink-muted, #64748B)', fontSize: '0.70rem', fontWeight: 700 }}>
                    {item.time}
                  </span>
                  <span style={{ color: 'var(--color-navy, #0B192C)', fontWeight: 600, flex: 1, lineHeight: 1.25 }}>
                    {item.text}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: `${item.color}15`, color: item.color }}>
                    {item.tag}
                  </span>
                </div>
              ));
            })()}
          </div>
        </Card>

        {/* 4.5 Mobile Responsive Preview Card */}
        <Card
          style={{
            padding: '16px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--color-ink-muted, #64748B)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Mobile Viewport Preview
          </span>

          {/* Mini Phone Frame */}
          <div
            style={{
              width: '180px',
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              border: '4px solid var(--color-navy, #0B192C)',
              boxShadow: '0 8px 24px rgba(11, 25, 44, 0.12)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Phone Top Bar */}
            <div style={{ backgroundColor: 'var(--color-navy, #0B192C)', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#FFFFFF', fontSize: '0.60rem', fontWeight: 900 }}>SAAMX'26</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-rise, #059669)' }} />
            </div>

            {/* Phone Body */}
            <div style={{ padding: '8px', backgroundColor: '#F4F7FB', flex: 1 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-navy, #0B192C)', marginBottom: '2px' }}>
                Good Morning,
              </div>
              <div style={{ fontSize: '0.58rem', color: 'var(--color-ink-muted, #64748B)', marginBottom: '6px' }}>
                Team Phoenix.
              </div>

              {/* Mini Card */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '6px', border: '1px solid rgba(11, 25, 44, 0.06)', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--color-ink-muted, #64748B)' }}>Portfolio Value</span>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)' }}>
                  ₹ 12,48,530
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--color-rise, #059669)', fontWeight: 800 }}>
                  ↑ 2.4%
                </div>
                {/* Mini Sparkline */}
                <svg viewBox="0 0 100 24" style={{ width: '100%', height: '14px', marginTop: '2px' }}>
                  <path d="M 0 18 Q 25 14, 50 16 T 100 4" fill="none" stroke="#059669" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Mini Bottom Nav Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 4px', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--color-border)', fontSize: '0.55rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-orange, #FF6800)' }}>Home</span>
              <span style={{ color: 'var(--color-ink-muted, #64748B)' }}>Trade</span>
              <span style={{ color: 'var(--color-ink-muted, #64748B)' }}>Portfolio</span>
              <span style={{ color: 'var(--color-ink-muted, #64748B)' }}>More</span>
            </div>
          </div>
        </Card>

      </div>

      {/* 5. Physical Paper Slip Print Modal (When Triggered) */}
      {showSlipModal && (
        <PaperSlipModal
          isOpen={showSlipModal}
          onClose={() => setShowSlipModal(false)}
          security={selectedSecurityObj}
          team={team}
          initialAction={orderAction}
          initialQuantity={orderQuantity}
          initialPin={traderPin}
          fxRates={fxRates}
          onOrderSubmitted={(ord) => {
            setShowSlipModal(false);
            setOrderSubmitSuccess(`Order ticket registered! Assigned Ticket #${ord.ticketNumber || 'TKT-001'}.`);
          }}
        />
      )}

    </div>
  );
}
