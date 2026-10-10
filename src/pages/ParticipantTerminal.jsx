import React, { useState, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';
import MarketIntelligencePage from './MarketIntelligencePage.jsx';

export default function ParticipantTerminal({ state, teamCode, onOpenProfile, connected, isCoordinatorOffline }) {
  const sessionState = state?.marketState?.sessionState || 'PRE_OPEN';
  const isTradingDisabled = !connected || isCoordinatorOffline || sessionState !== 'CONTINUOUS_TRADING';

  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio', 'intelligence', 'directory', 'orders', 'analytics', 'ipo'
  const [secSearch, setSecSearch] = useState('');
  const [secExchange, setSecExchange] = useState('ALL');
  const [secCountry, setSecCountry] = useState('ALL');
  const [secSector, setSecSector] = useState('ALL');
  const [secType, setSecType] = useState('ALL');
  const [secStatus, setSecStatus] = useState('ALL');
  const [secSortBy, setSecSortBy] = useState('ticker');
  const [secSortOrder, setSecSortOrder] = useState('asc');
  const [secPage, setSecPage] = useState(1);
  const itemsPerPage = 20;

  // Selected Security for Advanced 4-Step Flow: RESEARCH -> ANALYSIS -> DECISION -> ORDER
  const [focusedSecurity, setFocusedSecurity] = useState(null);
  const [activeFlowStep, setActiveFlowStep] = useState('RESEARCH'); // 'RESEARCH', 'ANALYSIS', 'DECISION', 'ORDER'
  const [orderAction, setOrderAction] = useState('BUY');
  const [orderQty, setOrderQty] = useState(100);
  const [orderType, setOrderType] = useState('MARKET');
  const [orderLimitPrice, setOrderLimitPrice] = useState('');
  const [orderDeskSelection, setOrderDeskSelection] = useState('DESK_1');
  const [orderSubmitStatus, setOrderSubmitStatus] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Order Book filters & Modal state
  const [orderFilter, setOrderFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'RETURNED', 'EXECUTED', 'REJECTED'
  const [resubmittingOrder, setResubmittingOrder] = useState(null);
  const [resubmitQty, setResubmitQty] = useState('');
  const [resubmitLimitPrice, setResubmitLimitPrice] = useState('');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  // Referral Modal state
  const [showReferModal, setShowReferModal] = useState(false);
  const [referTickerInput, setReferTickerInput] = useState('');
  const [referLoading, setReferLoading] = useState(false);
  const [referSuccess, setReferSuccess] = useState('');
  const [referError, setReferError] = useState('');

  // Audit trail modal
  const [inspectedOrder, setInspectedOrder] = useState(null);

  // IPO Bid parameters
  const [ipoQty, setIpoQty] = useState('');
  const [selectedIpoTicker, setSelectedIpoTicker] = useState('');
  const [ipoMessage, setIpoMessage] = useState('');
  const [ipoError, setIpoError] = useState('');
  const [isSubmittingIpo, setIsSubmittingIpo] = useState(false);

  // Find this team's details
  const team = useMemo(() => {
    const list = state?.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
    return list.find(t => t.teamCode === teamCode || t.id === teamCode);
  }, [state?.teams, teamCode]);

  if (!team) {
    return (
      <div className="card-primary" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--color-fall)', marginBottom: '12px' }}>Investment House Profile Error</h3>
        <p style={{ color: '#1E232B' }}>Could not find authenticated data for Investment House {teamCode}.</p>
      </div>
    );
  }

  // FX Rates & Multi-Currency Wallets
  const fxRates = useMemo(() => {
    if (state?.fxRates) return state.fxRates;
    return {
      USDINR: { midRate: 88.20 },
      GBPINR: { midRate: 119.40 },
      EURINR: { midRate: 103.50 }
    };
  }, [state?.fxRates]);

  const usdRate = fxRates.USDINR?.midRate || 88.20;
  const gbpRate = fxRates.GBPINR?.midRate || 119.40;
  const eurRate = fxRates.EURINR?.midRate || 103.50;

  const teamWallets = useMemo(() => {
    return team.cashWallets || {
      INR: Number(team.cashBalance) || 0,
      USD: 0,
      GBP: 0,
      EUR: 0
    };
  }, [team.cashWallets, team.cashBalance]);

  const inrCash = Number(teamWallets.INR || 0);
  const usdCashInr = Number(teamWallets.USD || 0) * usdRate;
  const gbpCashInr = Number(teamWallets.GBP || 0) * gbpRate;
  const eurCashInr = Number(teamWallets.EUR || 0) * eurRate;
  const totalCashInr = inrCash + usdCashInr + gbpCashInr + eurCashInr;

  // Normalize securities list to always be an Array
  const rawSecuritiesList = useMemo(() => {
    if (!state?.securities) return [];
    return Array.isArray(state.securities) ? state.securities : Object.values(state.securities);
  }, [state?.securities]);

  // Visible securities for participant
  const securitiesList = useMemo(() => {
    return rawSecuritiesList.filter(s => {
      if (s.visibleToParticipants === false || s.ipoStage === 'HIDDEN' || s.ipoStatus === 'HIDDEN') return false;
      return true;
    });
  }, [rawSecuritiesList]);

  // Filter orders and transactions for this team
  const teamOrders = useMemo(() => {
    const list = state?.orders ? (Array.isArray(state.orders) ? state.orders : Object.values(state.orders)) : [];
    return list.filter(o => o.teamCode === teamCode).reverse();
  }, [state?.orders, teamCode]);

  const openOrders = useMemo(() => {
    return teamOrders.filter(o => ['PENDING', 'SUBMITTED', 'QUEUED', 'BEING_VERIFIED', 'RETURNED_FOR_CORRECTION', 'RESUBMITTED', 'VERIFIED_AWAITING_EXCHANGE', 'UNDER_EXCHANGE_REVIEW', 'VALIDATED', 'EXECUTING'].includes(o.status));
  }, [teamOrders]);

  const returnedOrders = useMemo(() => {
    return teamOrders.filter(o => o.status === 'RETURNED_FOR_CORRECTION');
  }, [teamOrders]);

  const executedOrders = useMemo(() => {
    return teamOrders.filter(o => o.status === 'EXECUTED');
  }, [teamOrders]);

  const rejectedOrders = useMemo(() => {
    return teamOrders.filter(o => ['REJECTED', 'CANCELLED'].includes(o.status));
  }, [teamOrders]);

  const teamAdvisorReferrals = useMemo(() => {
    const list = state?.advisorReferrals ? (Array.isArray(state.advisorReferrals) ? state.advisorReferrals : Object.values(state.advisorReferrals)) : [];
    return list.filter(r => r.teamCode === teamCode).reverse();
  }, [state?.advisorReferrals, teamCode]);

  const filteredTeamOrders = useMemo(() => {
    return teamOrders.filter(o => {
      if (orderFilter === 'ACTIVE') {
        return ['PENDING', 'SUBMITTED', 'QUEUED', 'BEING_VERIFIED', 'RESUBMITTED', 'VERIFIED_AWAITING_EXCHANGE', 'UNDER_EXCHANGE_REVIEW', 'VALIDATED', 'EXECUTING'].includes(o.status);
      }
      if (orderFilter === 'RETURNED') {
        return o.status === 'RETURNED_FOR_CORRECTION';
      }
      if (orderFilter === 'EXECUTED') {
        return o.status === 'EXECUTED';
      }
      if (orderFilter === 'REJECTED') {
        return ['REJECTED', 'CANCELLED'].includes(o.status);
      }
      return true;
    });
  }, [teamOrders, orderFilter]);

  const teamTransactions = useMemo(() => {
    const list = state?.transactions ? (Array.isArray(state.transactions) ? state.transactions : Object.values(state.transactions)) : [];
    return list.filter(tx => tx.teamCode === teamCode).reverse();
  }, [state?.transactions, teamCode]);

  // Compile holdings metrics with dual P&L
  const holdingsList = useMemo(() => {
    const list = [];
    if (!team.holdings) return list;

    Object.entries(team.holdings).forEach(([ticker, qty]) => {
      const security = securitiesList.find(s => s.ticker === ticker || s.id === ticker);
      if (security && qty > 0) {
        const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' ? 'EUR' : 'INR');
        const curSym = secCurrency === 'USD' ? '$' : secCurrency === 'GBP' ? '£' : secCurrency === 'EUR' ? '€' : '₹';
        const fxRate = secCurrency === 'USD' ? usdRate : secCurrency === 'GBP' ? gbpRate : secCurrency === 'EUR' ? eurRate : 1.0;

        const currentPrice = security.currentPrice || security.basePrice || 0;
        const avgCost = security.basePrice || currentPrice;
        const nativeValuation = qty * currentPrice;
        const inrValuation = nativeValuation * fxRate;
        const nativeCostBasis = qty * avgCost;
        const inrCostBasis = nativeCostBasis * fxRate;

        const nativePnl = nativeValuation - nativeCostBasis;
        const inrPnl = inrValuation - inrCostBasis;
        const pnlPercent = nativeCostBasis > 0 ? (nativePnl / nativeCostBasis) * 100 : 0;

        list.push({
          ticker,
          name: security.name,
          exchange: security.exchange || 'NSE',
          currency: secCurrency,
          curSym,
          fxRate,
          sector: security.sector || 'Unclassified',
          qty,
          avgCost,
          currentPrice,
          nativeValuation,
          inrValuation,
          valuation: inrValuation,
          pnl: inrPnl,
          nativePnl,
          pnlPercent,
          weight: 0
        });
      }
    });

    const totalVal = list.reduce((acc, h) => acc + h.inrValuation, 0);
    list.forEach(h => {
      h.weight = totalVal > 0 ? (h.inrValuation / totalVal) * 100 : 0;
    });

    return list.sort((a, b) => b.inrValuation - a.inrValuation);
  }, [team.holdings, securitiesList, usdRate, gbpRate, eurRate]);

  const holdingsValuation = useMemo(() => {
    return holdingsList.reduce((acc, h) => acc + h.inrValuation, 0);
  }, [holdingsList]);

  // Overall Financial Performance Metrics
  const totalCapital = totalCashInr + holdingsValuation;
  const initialCapital = Number(team.startingCapital) || 10000000; // ₹1 Crore default starting capital
  const totalPnL = totalCapital - initialCapital;
  const roi = initialCapital > 0 ? ((totalCapital - initialCapital) / initialCapital) * 100 : 0;

  const unrealizedPnL = holdingsList.reduce((acc, h) => acc + h.pnl, 0);
  const realizedPnL = totalPnL - unrealizedPnL;

  // Buying Power (Cash minus open reserved commitments)
  const openBuyCommitmentInr = useMemo(() => {
    return openOrders.filter(o => o.action === 'BUY').reduce((acc, o) => {
      const sec = securitiesList.find(s => s.ticker === o.ticker);
      const price = o.limitPrice || sec?.currentPrice || 0;
      const secCcy = sec?.currency || 'INR';
      const fxR = secCcy === 'USD' ? usdRate : secCcy === 'GBP' ? gbpRate : secCcy === 'EUR' ? eurRate : 1.0;
      return acc + (o.quantity * price * fxR);
    }, 0);
  }, [openOrders, securitiesList, usdRate, gbpRate, eurRate]);

  const buyingPower = Math.max(0, totalCashInr - openBuyCommitmentInr);

  // Top Contributors & Detractors
  const topContributors = useMemo(() => {
    return [...holdingsList].filter(h => h.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 3);
  }, [holdingsList]);

  const topDetractors = useMemo(() => {
    return [...holdingsList].filter(h => h.pnl < 0).sort((a, b) => a.pnl - b.pnl).slice(0, 3);
  }, [holdingsList]);

  // Sector Exposure Breakdown
  const sectorExposure = useMemo(() => {
    const map = {};
    holdingsList.forEach(h => {
      const s = h.sector || 'Other';
      map[s] = (map[s] || 0) + h.inrValuation;
    });
    return Object.entries(map).map(([sector, val]) => ({
      sector,
      val,
      pct: holdingsValuation > 0 ? (val / holdingsValuation) * 100 : 0
    })).sort((a, b) => b.val - a.val);
  }, [holdingsList, holdingsValuation]);

  // Currency Exposure Breakdown (Holdings + Cash Wallets)
  const currencyExposure = useMemo(() => {
    const ccyVals = { INR: inrCash, USD: usdCashInr, GBP: gbpCashInr, EUR: eurCashInr };
    holdingsList.forEach(h => {
      ccyVals[h.currency] = (ccyVals[h.currency] || 0) + h.inrValuation;
    });
    return Object.entries(ccyVals).map(([ccy, val]) => ({
      ccy,
      val,
      pct: totalCapital > 0 ? (val / totalCapital) * 100 : 0
    })).sort((a, b) => b.val - a.val);
  }, [inrCash, usdCashInr, gbpCashInr, eurCashInr, holdingsList, totalCapital]);

  // Portfolio Concentration (Top 3 Holdings Concentration Ratio)
  const concentrationRatio = useMemo(() => {
    if (holdingsList.length === 0) return 0;
    const top3 = holdingsList.slice(0, 3).reduce((acc, h) => acc + h.weight, 0);
    return top3;
  }, [holdingsList]);

  // Handle Order Slip Submission from Terminal
  const handlePlaceOrderSlip = async (e) => {
    e.preventDefault();
    if (!focusedSecurity) return;

    setIsSubmittingOrder(true);
    setOrderSubmitStatus(null);

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await apiFetch('/api/orders/submit', {
        method: 'POST',
        body: JSON.stringify({
          ticketNumber,
          teamCode,
          ticker: focusedSecurity.ticker,
          action: orderAction,
          quantity: Number(orderQty),
          orderType,
          limitPrice: orderType === 'LIMIT' ? parseFloat(orderLimitPrice) : null,
          brokerDeskId: orderDeskSelection,
          enteredBy: teamCode
        })
      });

      const data = typeof res.json === 'function' ? await res.json() : res;

      if (!res.ok || data.error) {
        setOrderSubmitStatus({ type: 'error', text: data.error || 'Failed to submit order slip' });
      } else {
        setOrderSubmitStatus({
          type: 'success',
          text: `✓ Order Ticket #${ticketNumber} logged into verification queue for ${orderAction} ${orderQty} ${focusedSecurity.ticker}. Present physical slip to Verification Desk!`
        });
        setOrderQty(100);
      }
    } catch (err) {
      console.error(err);
      setOrderSubmitStatus({ type: 'error', text: 'Network connection failed while queuing order slip.' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Resubmit Handler for Returned Tickets
  const handleOpenResubmit = (order) => {
    setResubmittingOrder(order);
    setResubmitQty(order.quantity);
    setResubmitLimitPrice(order.limitPrice || '');
    setResubmitNotes(order.notes || '');
    setResubmitError('');
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!resubmittingOrder) return;
    setResubmitLoading(true);
    setResubmitError('');
    try {
      const res = await apiFetch('/api/orders/resubmit', {
        method: 'POST',
        body: JSON.stringify({
          orderId: resubmittingOrder.id,
          teamCode,
          quantity: Number(resubmitQty),
          limitPrice: resubmittingOrder.orderType === 'LIMIT' && resubmitLimitPrice ? Number(resubmitLimitPrice) : null,
          notes: resubmitNotes
        })
      });
      const data = typeof res.json === 'function' ? await res.json() : res;
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to resubmit order');
      setResubmittingOrder(null);
    } catch (err) {
      setResubmitError(err.message);
    } finally {
      setResubmitLoading(false);
    }
  };

  // Cancel Handler
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order ticket?')) return;
    try {
      const res = await apiFetch('/api/orders/cancel', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          teamCode,
          reason: 'Cancelled by Investment House'
        })
      });
      const data = typeof res.json === 'function' ? await res.json() : res;
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to cancel order');
    } catch (err) {
      alert(err.message);
    }
  };

  // Referral Submit Handler
  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (!referTickerInput) return;
    setReferLoading(true);
    setReferError('');
    setReferSuccess('');
    try {
      const res = await apiFetch('/api/advisor/refer', {
        method: 'POST',
        body: JSON.stringify({
          ticker: referTickerInput.trim().toUpperCase(),
          teamCode
        })
      });
      const data = typeof res.json === 'function' ? await res.json() : res;
      if (!res.ok || data.error) throw new Error(data.error || 'Referral request failed');
      setReferSuccess(`✓ Referral for ${referTickerInput.toUpperCase()} submitted to Floor Broker Advisor!`);
      setReferTickerInput('');
      setTimeout(() => {
        setShowReferModal(false);
        setReferSuccess('');
      }, 2000);
    } catch (err) {
      setReferError(err.message);
    } finally {
      setReferLoading(false);
    }
  };

  // IPO Bid Handler
  const handleIpoBid = async (e) => {
    e.preventDefault();
    if (!selectedIpoTicker || !ipoQty) {
      setIpoError('Please select an IPO and enter bid quantity.');
      return;
    }
    setIpoError('');
    setIpoMessage('');
    setIsSubmittingIpo(true);

    try {
      const res = await apiFetch('/api/ipo/bid', {
        method: 'POST',
        body: JSON.stringify({
          ticker: selectedIpoTicker,
          quantity: Number(ipoQty),
          teamCode
        })
      });
      if (res.error) {
        setIpoError(res.error);
      } else {
        setIpoMessage(res.message || 'Subscription lot bid submitted successfully.');
        setIpoQty('');
        setSelectedIpoTicker('');
      }
    } catch (err) {
      console.error(err);
      setIpoError('Network error while placing bid.');
    } finally {
      setIsSubmittingIpo(false);
    }
  };

  // Filtered Securities Catalog
  const filteredSecurities = useMemo(() => {
    return securitiesList.filter(s => {
      if (s.status === 'UNLISTED') return false;
      const searchMatch = !secSearch ||
        s.ticker?.toLowerCase().includes(secSearch.toLowerCase()) ||
        s.name?.toLowerCase().includes(secSearch.toLowerCase());
      const exchangeMatch = secExchange === 'ALL' || s.exchange === secExchange;
      const countryMatch = secCountry === 'ALL' || s.country === secCountry;
      const sectorMatch = secSector === 'ALL' || s.sector === secSector;
      const typeMatch = secType === 'ALL' || s.type === secType;
      const statusMatch = secStatus === 'ALL' || s.status === secStatus;

      return searchMatch && exchangeMatch && countryMatch && sectorMatch && typeMatch && statusMatch;
    }).sort((a, b) => {
      let valA = a[secSortBy];
      let valB = b[secSortBy];

      if (secSortBy === 'price') {
        valA = a.currentPrice || a.basePrice || 0;
        valB = b.currentPrice || b.basePrice || 0;
      } else if (secSortBy === 'change') {
        const changeA = a.openingPrice ? ((a.currentPrice - a.openingPrice) / a.openingPrice) * 100 : 0;
        const changeB = b.openingPrice ? ((b.currentPrice - b.openingPrice) / b.openingPrice) * 100 : 0;
        return secSortOrder === 'asc' ? changeA - changeB : changeB - changeA;
      } else if (secSortBy === 'volume') {
        valA = a.tradingVolume || a.volume || 0;
        valB = b.tradingVolume || b.volume || 0;
      }

      if (typeof valA === 'string') {
        return secSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return secSortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
  }, [securitiesList, secSearch, secExchange, secCountry, secSector, secType, secStatus, secSortBy, secSortOrder]);

  const totalSecPages = Math.ceil(filteredSecurities.length / itemsPerPage) || 1;
  const paginatedSecurities = useMemo(() => {
    const start = (secPage - 1) * itemsPerPage;
    return filteredSecurities.slice(start, start + itemsPerPage);
  }, [filteredSecurities, secPage]);

  // Open IPOs
  const activeIpos = useMemo(() => {
    return securitiesList.filter(s =>
      s.status === 'IPO_PENDING' ||
      s.status === 'IPO_STAGED' ||
      s.ipoStatus === 'SUBSCRIPTION_OPEN' ||
      s.ipoStatus === 'SUBSCRIPTION_CLOSING_SOON'
    );
  }, [securitiesList]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 20px', color: 'var(--navy-900)' }}>
      
      {/* 1. Header Banner & Investment House Identity */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-soft)',
        borderLeft: '6px solid var(--gold-royal)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--gold-royal)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            <span>🏛️ INVESTMENT HOUSE COMMAND CENTRE</span>
            <span>&bull;</span>
            <span>STATUS: {team.registrationStatus || team.status || 'READY'}</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, fontFamily: 'Cinzel, serif', color: 'var(--navy-900)' }}>
            {team.teamName || team.investmentHouseName || `House ${teamCode}`}{' '}
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>
              ({team.teamCode || teamCode})
            </span>
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            School / Affiliate: <strong>{team.schoolName || 'Collegiate Division'}</strong> &bull; Delegates: {team.members?.length || team.teamSize || 3} Members
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn ${activeTab === 'portfolio' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('portfolio')}
          >
            📊 Portfolio & P&L
          </button>
          <button
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Risk & Exposures
          </button>
          <button
            className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('directory')}
          >
            🔍 Securities Universe
          </button>
          <button
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('orders')}
          >
            📋 Orders & Desks {openOrders.length > 0 && <span className="badge badge-rise" style={{ marginLeft: '4px' }}>{openOrders.length}</span>}
          </button>
          <button
            className={`btn ${activeTab === 'intelligence' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('intelligence')}
          >
            🧠 Market Intel
          </button>
          <button
            className={`btn ${activeTab === 'ipo' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => setActiveTab('ipo')}
          >
            🚀 IPO Hub
          </button>
          <a
            href="#/fx"
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', color: 'var(--gold-royal)' }}
          >
            💱 FX Desk ➔
          </a>
        </div>
      </div>

      {/* 2. Primary Financial Telemetry Bar (Cash, Net Worth, Realized, Unrealized, Total P&L, ROI, Buying Power) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {/* Total Capital / Net Worth */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Portfolio Net Worth</span>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--navy-900)', marginTop: '4px' }}>
            ₹{totalCapital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Holdings: ₹{holdingsValuation.toLocaleString()}
          </span>
        </div>

        {/* Buying Power */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Available Buying Power</span>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--green-emerald)', marginTop: '4px' }}>
            ₹{buyingPower.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Total Cash: ₹{totalCashInr.toLocaleString()}
          </span>
        </div>

        {/* Total P&L and ROI */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Total P&L / ROI</span>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: totalPnL >= 0 ? 'var(--green-emerald)' : 'var(--red-crimson)', marginTop: '4px' }}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: roi >= 0 ? 'var(--green-emerald)' : 'var(--red-crimson)' }}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}% Net ROI
          </span>
        </div>

        {/* Realized P&L */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Realized P&L</span>
          <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: realizedPnL >= 0 ? 'var(--navy-900)' : 'var(--red-crimson)', marginTop: '4px' }}>
            {realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Closed Positions</span>
        </div>

        {/* Unrealized P&L */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Unrealized P&L</span>
          <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: unrealizedPnL >= 0 ? 'var(--green-emerald)' : 'var(--red-crimson)', marginTop: '4px' }}>
            {unrealizedPnL >= 0 ? '+' : ''}₹{unrealizedPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Open Positions</span>
        </div>

        {/* Active Open Orders */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Orders In Flight</span>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--gold-royal)', marginTop: '4px' }}>
            {openOrders.length}{' '}
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {executedOrders.length} Executed Trades
          </span>
        </div>
      </div>

      {/* 3. Multi-Currency Cash Wallets Ribbon */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-soft)',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💱</span>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Multi-Currency Liquid Reserves
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>INR: </span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--navy-900)' }}>₹{inrCash.toLocaleString()}</strong>
          </div>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>USD: </span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--navy-900)' }}>${Number(teamWallets.USD || 0).toLocaleString()}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> (≈ ₹{usdCashInr.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
          </div>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>GBP: </span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--navy-900)' }}>£{Number(teamWallets.GBP || 0).toLocaleString()}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> (≈ ₹{gbpCashInr.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
          </div>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>EUR: </span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--navy-900)' }}>€{Number(teamWallets.EUR || 0).toLocaleString()}</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> (≈ ₹{eurCashInr.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
          </div>
        </div>
      </div>

      {/* 4. TAB CONTENT ROUTING */}

      {/* TAB 1: PORTFOLIO & HOLDINGS */}
      {activeTab === 'portfolio' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.8fr) minmax(320px, 1.2fr)', gap: '20px' }}>
          {/* Left: Active Positions Table */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--navy-900)' }}>
                  Active Securities Positions
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mark-to-market holdings with native currency valuation and INR equivalent
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--bg-warm)', padding: '4px 8px', borderRadius: '4px' }}>
                {holdingsList.length} Active Positions
              </span>
            </div>

            {holdingsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-warm)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No open positions in this fund yet. Explore the universe to find research opportunities.
                </p>
                <button className="btn btn-primary" onClick={() => setActiveTab('directory')}>
                  Browse 2,000+ Instruments →
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                      <th style={{ padding: '8px 10px' }}>Ticker</th>
                      <th style={{ padding: '8px 10px' }}>Exchange</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Native Price</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>INR Valuation</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>P&L (Return)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Weight</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdingsList.map(h => (
                      <tr key={h.ticker} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: 'var(--gold-royal)', cursor: 'pointer' }} onClick={() => onOpenProfile(h.ticker)}>
                            {h.ticker}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.name}</div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--bg-warm)', padding: '2px 6px', borderRadius: '4px' }}>
                            {h.exchange} &bull; {h.currency}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {h.qty.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {h.curSym}{h.currentPrice.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          ₹{h.inrValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          <span style={{ color: h.pnl >= 0 ? 'var(--green-emerald)' : 'var(--red-crimson)', fontWeight: 800 }}>
                            {h.pnl >= 0 ? '+' : ''}₹{h.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <div style={{ fontSize: '10px', color: h.pnl >= 0 ? 'var(--green-emerald)' : 'var(--red-crimson)' }}>
                            ({h.pnl >= 0 ? '+' : ''}{h.pnlPercent.toFixed(1)}%)
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {h.weight.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => {
                              const s = securitiesList.find(x => x.ticker === h.ticker);
                              if (s) {
                                setFocusedSecurity(s);
                                setActiveFlowStep('ORDER');
                                setOrderAction('SELL');
                              }
                            }}
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Contributors & Detractors Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Contributors */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px', color: 'var(--green-emerald)', textTransform: 'uppercase' }}>
                🏆 Top Value Contributors
              </h3>
              {topContributors.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No positive return holdings yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topContributors.map(c => (
                    <div key={c.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <strong style={{ color: 'var(--navy-900)' }}>{c.ticker}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>{c.weight.toFixed(1)}% wt</span>
                      </div>
                      <span style={{ color: 'var(--green-emerald)', fontWeight: 800, fontFamily: 'monospace' }}>
                        +₹{c.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Detractors */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px', color: 'var(--red-crimson)', textTransform: 'uppercase' }}>
                ⚠️ Top Detractors & Drawdowns
              </h3>
              {topDetractors.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No negative return holdings.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topDetractors.map(d => (
                    <div key={d.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <strong style={{ color: 'var(--navy-900)' }}>{d.ticker}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>{d.weight.toFixed(1)}% wt</span>
                      </div>
                      <span style={{ color: 'var(--red-crimson)', fontWeight: 800, fontFamily: 'monospace' }}>
                        -₹{Math.abs(d.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Concentration & Concentration Warning */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 6px', color: 'var(--navy-900)', textTransform: 'uppercase' }}>
                🎯 Portfolio Concentration
              </h3>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: concentrationRatio > 65 ? 'var(--red-crimson)' : 'var(--navy-900)' }}>
                {concentrationRatio.toFixed(1)}%
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Top 3 holdings weight. {concentrationRatio > 65 ? '⚠️ High concentration alert: Consider diversification.' : 'Balanced distribution.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RISK & EXPOSURE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Sector Exposure */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px', color: 'var(--navy-900)' }}>
              🏭 Sector Allocation & Exposure
            </h3>
            {sectorExposure.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No holdings to calculate sector exposure.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sectorExposure.map(s => (
                  <div key={s.sector}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700 }}>{s.sector}</span>
                      <span style={{ fontFamily: 'monospace' }}>
                        {s.pct.toFixed(1)}% (₹{s.val.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-warm)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--gold-royal)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currency Exposure */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px', color: 'var(--navy-900)' }}>
              💱 Total Net Worth Currency Exposure
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currencyExposure.map(c => (
                <div key={c.ccy}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700 }}>{c.ccy} Asset Base</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      {c.pct.toFixed(1)}% (₹{c.val.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-warm)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${c.pct}%`,
                      height: '100%',
                      background: c.ccy === 'INR' ? '#059669' : c.ccy === 'USD' ? '#2563eb' : c.ccy === 'GBP' ? '#7c3aed' : '#d97706'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITIES UNIVERSE & ADVANCED 4-STEP FLOW */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Advanced Security Workflow Drawer if security selected */}
          {focusedSecurity && (
            <div style={{
              background: 'var(--card-bg)',
              border: '2px solid var(--gold-royal)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--gold-royal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ADVANCED SECURITY TERMINAL &bull; 4-STEP WORKFLOW
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: 'var(--navy-900)' }}>
                    {focusedSecurity.ticker} — {focusedSecurity.name}
                  </h2>
                </div>
                <button
                  onClick={() => setFocusedSecurity(null)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* 4 Steps Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { step: 'RESEARCH', icon: '🔍', label: '1. Research' },
                  { step: 'ANALYSIS', icon: '📈', label: '2. Analysis' },
                  { step: 'DECISION', icon: '⚖️', label: '3. Decision' },
                  { step: 'ORDER', icon: '📝', label: '4. Order Slip' }
                ].map(s => (
                  <button
                    key={s.step}
                    onClick={() => setActiveFlowStep(s.step)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: activeFlowStep === s.step ? '2px solid var(--gold-royal)' : '1px solid var(--border-soft)',
                      background: activeFlowStep === s.step ? 'rgba(132, 85, 8, 0.08)' : 'var(--bg-warm)',
                      color: activeFlowStep === s.step ? 'var(--navy-900)' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* Step 1: RESEARCH */}
              {activeFlowStep === 'RESEARCH' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '12px' }}>
                  <div style={{ background: 'var(--bg-warm)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Current Spot Price</span>
                    <strong style={{ fontSize: '18px', fontFamily: 'monospace' }}>
                      {focusedSecurity.currency === 'USD' ? '$' : focusedSecurity.currency === 'GBP' ? '£' : focusedSecurity.currency === 'EUR' ? '€' : '₹'}
                      {focusedSecurity.currentPrice || focusedSecurity.basePrice}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--bg-warm)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Exchange & Country</span>
                    <strong style={{ fontSize: '14px' }}>{focusedSecurity.exchange || 'NSE'} ({focusedSecurity.country || 'India'})</strong>
                  </div>
                  <div style={{ background: 'var(--bg-warm)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Sector / Industry</span>
                    <strong style={{ fontSize: '14px' }}>{focusedSecurity.sector}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-warm)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Trading Status</span>
                    <span className={`badge ${focusedSecurity.status === 'Active' ? 'badge-rise' : 'badge-fall'}`}>
                      {focusedSecurity.status}
                    </span>
                  </div>
                  <div style={{ gridColumn: '1 / -1', background: 'var(--bg-warm)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Mandate / Profile</span>
                    <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
                      {focusedSecurity.description || `${focusedSecurity.name} is a listed constituent on ${focusedSecurity.exchange}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: ANALYSIS */}
              {activeFlowStep === 'ANALYSIS' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', fontSize: '12px' }}>
                  <div style={{ background: 'var(--bg-warm)', padding: '14px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px' }}>Price Range & Volatility Metrics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>52-Wk Low: <strong>₹{((focusedSecurity.currentPrice || 100) * 0.8).toFixed(1)}</strong></div>
                      <div>52-Wk High: <strong>₹{((focusedSecurity.currentPrice || 100) * 1.35).toFixed(1)}</strong></div>
                      <div>Volatility Beta: <strong>{((focusedSecurity.volatility || 0.45) * 100).toFixed(0)}%</strong></div>
                      <div>Trading Volume: <strong>{(focusedSecurity.tradingVolume || 0).toLocaleString()} units</strong></div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-warm)', padding: '14px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px' }}>Market Events / Catalysts</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Monitor the Market Intelligence Hub for specific scenario press wire bulletins impacting {focusedSecurity.ticker}.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: DECISION */}
              {activeFlowStep === 'DECISION' && (
                <div style={{ background: 'var(--bg-warm)', padding: '16px', borderRadius: '8px', fontSize: '12px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Risk Evaluation & Portfolio Impact</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li>Position will be funded from <strong>{focusedSecurity.currency || 'INR'}</strong> cash wallet.</li>
                    <li>Price band circuit limit: &plusmn;20% from reference opening price.</li>
                    <li>Cash Available in wallet: {currencySymbols[focusedSecurity.currency || 'INR']}{Number(teamWallets[focusedSecurity.currency || 'INR'] || 0).toLocaleString()}</li>
                  </ul>
                  <div style={{ marginTop: '12px' }}>
                    <button className="btn btn-primary" onClick={() => setActiveFlowStep('ORDER')}>
                      Proceed to Order Slip Generation →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: ORDER SLIP */}
              {activeFlowStep === 'ORDER' && (
                <form onSubmit={handlePlaceOrderSlip} style={{ background: 'var(--bg-warm)', padding: '16px', borderRadius: '8px' }}>
                  {orderSubmitStatus && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: orderSubmitStatus.type === 'success' ? 'rgba(6, 95, 62, 0.1)' : 'rgba(147, 25, 19, 0.1)',
                      color: orderSubmitStatus.type === 'success' ? 'var(--green-emerald)' : 'var(--red-crimson)'
                    }}>
                      {orderSubmitStatus.text}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Action</label>
                      <select
                        value={orderAction}
                        onChange={(e) => setOrderAction(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontWeight: 800 }}
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontWeight: 700 }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Order Type</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontWeight: 700 }}
                      >
                        <option value="MARKET">MARKET</option>
                        <option value="LIMIT">LIMIT</option>
                      </select>
                    </div>

                    {orderType === 'LIMIT' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Limit Price</label>
                        <input
                          type="number"
                          step="any"
                          value={orderLimitPrice}
                          onChange={(e) => setOrderLimitPrice(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontWeight: 700 }}
                          placeholder="Price"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Target Order Desk</label>
                      <select
                        value={orderDeskSelection}
                        onChange={(e) => setOrderDeskSelection(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontWeight: 700 }}
                      >
                        <option value="DESK_1">Desk 1 (Institutional)</option>
                        <option value="DESK_2">Desk 2 (Equities A)</option>
                        <option value="DESK_3">Desk 3 (Equities B)</option>
                        <option value="DESK_4">Desk 4 (Global / FX)</option>
                        <option value="DESK_5">Desk 5 (Derivatives/Bonds)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingOrder || isTradingDisabled}
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 800 }}
                  >
                    {isSubmittingOrder ? 'Submitting Order Slip...' : `Queue Physical Order Slip for ${orderAction} ${orderQty} units →`}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Securities Universe Table */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--navy-900)' }}>
                  Securities Universe Catalog (2,000+ Assets)
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Multi-Currency Equities, ETFs, Bonds, Commodities & REITs
                </span>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search ticker / name..."
                  value={secSearch}
                  onChange={(e) => { setSecSearch(e.target.value); setSecPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}
                />
                <select
                  value={secSector}
                  onChange={(e) => { setSecSector(e.target.value); setSecPage(1); }}
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}
                >
                  <option value="ALL">All Sectors</option>
                  {Array.from(new Set(securitiesList.map(s => s.sector).filter(Boolean))).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                    <th style={{ padding: '8px 10px' }}>Ticker</th>
                    <th style={{ padding: '8px 10px' }}>Company / Asset</th>
                    <th style={{ padding: '8px 10px' }}>Exchange</th>
                    <th style={{ padding: '8px 10px' }}>Sector</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Workflow</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSecurities.map(s => {
                    const cur = s.currentPrice || s.basePrice || 0;
                    const sCcy = s.currency || 'INR';
                    const sym = sCcy === 'USD' ? '$' : sCcy === 'GBP' ? '£' : sCcy === 'EUR' ? '€' : '₹';

                    return (
                      <tr key={s.ticker} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: 'var(--gold-royal)', cursor: 'pointer' }} onClick={() => onOpenProfile(s.ticker)}>
                            {s.ticker}
                          </strong>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ background: 'var(--bg-warm)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                            {s.exchange || 'NSE'} &bull; {sCcy}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>{s.sector}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {sym}{cur.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                            onClick={() => {
                              setFocusedSecurity(s);
                              setActiveFlowStep('RESEARCH');
                            }}
                          >
                            Analyze & Trade ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-soft)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Page {secPage} of {totalSecPages} ({filteredSecurities.length} results)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={secPage === 1}
                  onClick={() => setSecPage(p => p - 1)}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Prev
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={secPage === totalSecPages}
                  onClick={() => setSecPage(p => p + 1)}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: ORDERS & TRANSACTION HISTORY */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Action-Required Banner: Returned Tickets */}
          {returnedOrders.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(194, 65, 12, 0.06) 100%)',
              border: '2px solid #EA580C',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <strong style={{ fontSize: '15px', color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Required: {returnedOrders.length} Order Slip{returnedOrders.length > 1 ? 's' : ''} Returned for Correction
                </strong>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--navy-900)' }}>
                The Verification Officer flagged discrepancies on your physical paper slip. Please review the officer's feedback below and submit your corrections immediately:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {returnedOrders.map(ro => (
                  <div key={ro.id} style={{
                    background: '#FFFFFF',
                    border: '1px solid #FDBA74',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--gold-royal)' }}>
                          Ticket #{ro.ticketNumber}
                        </span>
                        <span style={{ fontWeight: 800 }}>{ro.ticker}</span>
                        <span className={`badge ${ro.action === 'BUY' ? 'badge-rise' : 'badge-fall'}`}>
                          {ro.action} {ro.quantity.toLocaleString()} units
                        </span>
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#C2410C' }}>
                        <strong>Officer Note:</strong> {ro.returnReason || 'Details need clarification.'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenResubmit(ro)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 800, background: '#EA580C', borderColor: '#C2410C' }}
                    >
                      ✏️ Correct & Resubmit Ticket
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Order Book Card */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--navy-900)' }}>
                  Institutional Order Book & Lifecycle Tracking ({filteredTeamOrders.length})
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Live stage tracking from paper slip intake, verification, exchange execution, to settlement.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => setShowReferModal(true)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--gold-royal)' }}
                >
                  📢 Consult Floor Advisor
                </button>
                <a
                  href="/api/reports/orders/csv"
                  download="saamx_orders_report.csv"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
                >
                  📥 Export Orders CSV
                </a>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
              {[
                { id: 'ALL', label: `All Orders (${teamOrders.length})` },
                { id: 'ACTIVE', label: `Active In Queue (${openOrders.length})` },
                { id: 'RETURNED', label: `Returned (${returnedOrders.length})` },
                { id: 'EXECUTED', label: `Executed (${executedOrders.length})` },
                { id: 'REJECTED', label: `Rejected / Cancelled (${rejectedOrders.length})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={`btn ${orderFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredTeamOrders.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No order tickets match the selected status filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                      <th style={{ padding: '8px 10px' }}>Ticket #</th>
                      <th style={{ padding: '8px 10px' }}>Security</th>
                      <th style={{ padding: '8px 10px' }}>Side</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px 10px' }}>Type</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Req Value</th>
                      <th style={{ padding: '8px 10px' }}>Stage & Status</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamOrders.map(o => {
                      const isReturned = o.status === 'RETURNED_FOR_CORRECTION';
                      const isExecuted = o.status === 'EXECUTED';
                      const isRejected = o.status === 'REJECTED' || o.status === 'CANCELLED';
                      return (
                        <tr key={o.id} style={{
                          borderBottom: '1px solid var(--border-soft)',
                          backgroundColor: isReturned ? 'rgba(234, 88, 12, 0.04)' : 'transparent'
                        }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold-royal)' }}>
                            #{o.ticketNumber || o.id}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <strong style={{ display: 'block', color: 'var(--navy-900)' }}>{o.ticker}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.securityName || o.ticker}</span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge ${o.action === 'BUY' ? 'badge-rise' : 'badge-fall'}`}>
                              {o.action}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                            {o.quantity?.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {o.orderType} {o.limitPrice ? `@ ₹${o.limitPrice}` : ''}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                            ₹{(o.requestedValue || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {isReturned ? (
                              <div>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', background: '#FFEDD5', color: '#C2410C', display: 'inline-block' }}>
                                  ⚠️ Returned for Correction
                                </span>
                                {o.returnReason && (
                                  <span style={{ display: 'block', fontSize: '11px', color: '#EA580C', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {o.returnReason}
                                  </span>
                                )}
                              </div>
                            ) : isExecuted ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', background: '#D1FAE5', color: '#065F46' }}>
                                ✓ Executed @ ₹{o.executionPrice || o.priceAtExecution}
                              </span>
                            ) : isRejected ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', background: '#FFE4E6', color: '#9F1239' }}>
                                ✕ {o.status}
                              </span>
                            ) : o.status === 'VERIFIED_AWAITING_EXCHANGE' ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', background: '#ECFDF5', color: '#047857' }}>
                                ● Verified (In Exchange Queue)
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8' }}>
                                ● {o.workflowStage || o.status}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {isReturned && (
                                <button
                                  onClick={() => handleOpenResubmit(o)}
                                  className="btn btn-primary"
                                  style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 800, background: '#EA580C' }}
                                >
                                  Resubmit
                                </button>
                              )}
                              {!isExecuted && !isRejected && (
                                <button
                                  onClick={() => handleCancelOrder(o.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '10px', color: 'var(--red-crimson)' }}
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => setInspectedOrder(o)}
                                className="btn btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '10px' }}
                              >
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Broker Advisor Signals Widget */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📢</span>
                  <span>Floor Broker Advisor Signals ({teamAdvisorReferrals.length})</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Authoritative BUY, HOLD, or SELL signals dispatched by floor advisors upon team referral.
                </span>
              </div>
              <button
                onClick={() => setShowReferModal(true)}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 800 }}
              >
                + Refer Stock to Advisor
              </button>
            </div>

            {teamAdvisorReferrals.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-warm)', borderRadius: '8px', fontSize: '12px' }}>
                No stock referrals submitted yet. Click "+ Refer Stock to Advisor" to request a directional signal.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {teamAdvisorReferrals.map(ref => {
                  const isDone = ref.status === 'COMPLETED';
                  const sig = ref.signal;
                  return (
                    <div key={ref.id} style={{
                      background: 'var(--bg-warm)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      borderLeft: `5px solid ${sig === 'BUY' ? '#059669' : sig === 'HOLD' ? '#D97706' : sig === 'SELL' ? '#DC2626' : 'var(--gold-royal)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: 'var(--navy-900)' }}>{ref.ticker}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {ref.securityName || ref.ticker}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(ref.submittedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Advisor Signal:</span>
                          {isDone ? (
                            <span style={{
                              fontWeight: 900,
                              fontSize: '13px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              color: '#FFFFFF',
                              background: sig === 'BUY' ? '#059669' : sig === 'HOLD' ? '#D97706' : '#DC2626'
                            }}>
                              {sig}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 800 }}>
                              ⏳ Pending Review
                            </span>
                          )}
                        </div>
                        {ref.advisorName && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            By {ref.advisorName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Executed & Cleared Trades Ledger */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: 'var(--navy-900)' }}>
              Executed Transactions & Settlement Ledger ({teamTransactions.length})
            </h2>
            {teamTransactions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No cleared trades recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                      <th style={{ padding: '8px 10px' }}>TX ID</th>
                      <th style={{ padding: '8px 10px' }}>Ticker</th>
                      <th style={{ padding: '8px 10px' }}>Action</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Value</th>
                      <th style={{ padding: '8px 10px' }}>Desk</th>
                      <th style={{ padding: '8px 10px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamTransactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {tx.id?.slice(-8)}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 800 }}>{tx.ticker}</td>
                        <td style={{ padding: '10px' }}>
                          <span className={`badge ${tx.action === 'BUY' ? 'badge-rise' : 'badge-fall'}`}>
                            {tx.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {tx.quantity?.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          ₹{tx.priceAtExecution?.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          ₹{tx.totalValue?.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                          {tx.enteredBy || 'Exchange Desk'}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MARKET INTELLIGENCE HUB */}
      {activeTab === 'intelligence' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
          <MarketIntelligencePage
            state={state}
            teamCode={teamCode}
            onOpenProfile={onOpenProfile}
            connected={connected}
          />
        </div>
      )}

      {/* TAB 6: IPO PRIMARY MARKET */}
      {activeTab === 'ipo' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 14px', color: 'var(--navy-900)' }}>
            Primary Market IPO Radar & Subscription Desk
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
            <div>
              {activeIpos.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-warm)', borderRadius: '8px' }}>
                  No open IPO offerings currently accepting subscription bids.
                </div>
              ) : (
                activeIpos.map(s => (
                  <div key={s.ticker} style={{ background: 'var(--bg-warm)', padding: '16px', borderRadius: '8px', marginBottom: '12px', borderLeft: '4px solid var(--green-emerald)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '16px', color: 'var(--navy-900)' }}>{s.ticker} — {s.name}</strong>
                      <span className="badge badge-rise">Subscription Open</span>
                    </div>
                    <p style={{ margin: '6px 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                      <div>Offer Price: <strong>{s.currency === 'USD' ? '$' : '₹'}{s.offerPrice || s.basePrice || 100}</strong></div>
                      <div>Lot Size: <strong>{s.lotSize || 1} shares</strong></div>
                      <div>Currency: <strong>{s.currency || 'USD'}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Submission Form */}
            <div style={{ background: 'var(--bg-warm)', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', color: 'var(--navy-900)' }}>
                Place Primary IPO Lot Bid
              </h3>
              <form onSubmit={handleIpoBid}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Target IPO</label>
                  <select
                    value={selectedIpoTicker}
                    onChange={(e) => setSelectedIpoTicker(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}
                  >
                    <option value="">-- Choose IPO --</option>
                    {activeIpos.map(s => (
                      <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Bid Quantity</label>
                  <input
                    type="number"
                    value={ipoQty}
                    onChange={(e) => setIpoQty(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}
                    placeholder="Lot multiple"
                  />
                </div>

                {ipoError && <div style={{ color: 'var(--red-crimson)', fontSize: '12px', marginBottom: '8px' }}>⚠️ {ipoError}</div>}
                {ipoMessage && <div style={{ color: 'var(--green-emerald)', fontSize: '12px', marginBottom: '8px' }}>✓ {ipoMessage}</div>}

                <button
                  type="submit"
                  disabled={isSubmittingIpo || !selectedIpoTicker || !ipoQty || isTradingDisabled}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 800 }}
                >
                  {isSubmittingIpo ? 'Placing Bid...' : 'Submit Primary Subscription Bid →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CORRECT & RESUBMIT ORDER */}
      {resubmittingOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: 'var(--card-bg)', border: '2px solid #EA580C', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#EA580C' }}>
                ✏️ Correct & Resubmit Ticket #{resubmittingOrder.ticketNumber}
              </h3>
              <button
                onClick={() => setResubmittingOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Officer's note banner */}
            <div style={{ background: '#FFEDD5', border: '1px solid #FDBA74', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#9A3412' }}>
              <strong>Verification Officer Reason:</strong>
              <div style={{ marginTop: '2px' }}>{resubmittingOrder.returnReason || 'Details need correction.'}</div>
            </div>

            <form onSubmit={handleResubmitSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Quantity ({resubmittingOrder.ticker})
                </label>
                <input
                  type="number"
                  value={resubmitQty}
                  onChange={(e) => setResubmitQty(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '13px', fontWeight: 700 }}
                  required
                />
              </div>

              {resubmittingOrder.orderType === 'LIMIT' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Limit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={resubmitLimitPrice}
                    onChange={(e) => setResubmitLimitPrice(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '13px' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Clarification / Counter-Signature Notes
                </label>
                <textarea
                  rows="3"
                  value={resubmitNotes}
                  onChange={(e) => setResubmitNotes(e.target.value)}
                  placeholder="Explain corrections made or confirm physical slip signature..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}
                />
              </div>

              {resubmitError && (
                <div style={{ color: 'var(--red-crimson)', fontSize: '12px', marginBottom: '12px', fontWeight: 700 }}>
                  ⚠️ {resubmitError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setResubmittingOrder(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitLoading}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 800, background: '#EA580C', borderColor: '#C2410C' }}
                >
                  {resubmitLoading ? 'Submitting...' : 'Confirm & Resubmit →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONSULT FLOOR ADVISOR */}
      {showReferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: 'var(--card-bg)', border: '2px solid var(--gold-royal)', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--navy-900)' }}>
                📢 Consult Floor Broker Advisor
              </h3>
              <button
                onClick={() => setShowReferModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Refer any security to the Floor Advisory Desk. An advisor will review current market catalysts and return strictly ONE directional signal: <strong>BUY</strong>, <strong>HOLD</strong>, or <strong>SELL</strong>.
            </p>

            <form onSubmit={handleReferralSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Target Security Ticker
                </label>
                <input
                  type="text"
                  placeholder="e.g. RELIANCE, TCS, AAPL, MSFT..."
                  value={referTickerInput}
                  onChange={(e) => setReferTickerInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}
                  required
                />
              </div>

              {referError && (
                <div style={{ color: 'var(--red-crimson)', fontSize: '12px', marginBottom: '12px', fontWeight: 700 }}>
                  ⚠️ {referError}
                </div>
              )}

              {referSuccess && (
                <div style={{ color: '#059669', fontSize: '12px', marginBottom: '12px', fontWeight: 700 }}>
                  {referSuccess}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowReferModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={referLoading || !referTickerInput}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 800 }}
                >
                  {referLoading ? 'Sending...' : 'Submit Referral →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT TRAIL MODAL */}
      {inspectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--navy-900)' }}>
                  Order Ticket Audit History
                </h3>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--gold-royal)' }}>
                  #{inspectedOrder.ticketNumber} &bull; {inspectedOrder.action} {inspectedOrder.quantity} {inspectedOrder.ticker}
                </span>
              </div>
              <button
                onClick={() => setInspectedOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {(inspectedOrder.statusHistory || [
                { stage: inspectedOrder.status, timestamp: inspectedOrder.timestamp || inspectedOrder.submittedAt, actor: 'Desk', note: 'Order logged' }
              ]).map((step, idx) => (
                <div key={idx} style={{ background: 'var(--bg-warm)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--navy-900)' }}>● {step.stage}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{step.note}</div>
                  <span style={{ fontSize: '10px', color: 'var(--gold-royal)', display: 'block', marginTop: '3px' }}>
                    Actor: {step.actor}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setInspectedOrder(null)}
                className="btn btn-secondary"
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
