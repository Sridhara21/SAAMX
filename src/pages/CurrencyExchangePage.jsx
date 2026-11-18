import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { CURRENCY_DIRECTORY, CURRENCY_SYMBOLS, DEFAULT_FX_RATES, ACTIVE_CURRENCIES, ACTIVE_FOREIGN_CURRENCIES, formatCurrency, roundCurrency } from '../lib/formatters';
import { DigitalForexSlip } from '../components/DigitalForms.jsx';

export default function CurrencyExchangePage({ state, connected = true }) {
  const userRole = (sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role') || '').toLowerCase();
  const isStaffOperator = userRole === 'admin' || userRole === 'super_admin' || userRole === 'sebi' || userRole === 'operator_x' || userRole === 'exchange' || userRole === 'desk';
  const isTeamStudent = userRole === 'team';

  const [selectedTeam, setSelectedTeam] = useState('T01');
  const [fromCurrency, setFromCurrency] = useState('INR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('500000');
  const [operatorId, setOperatorId] = useState('FX-DESK-01');
  const [notes, setNotes] = useState('Physical order slip request');
  const [simulationDurationSec, setSimulationDurationSec] = useState(120); // Phase D: 1-5 minute operational delay window (default 2 min)
  const [now, setNow] = useState(Date.now());
  const [activeFxSlip, setActiveFxSlip] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null, // 'HOLD' | 'REJECT' | 'RETURN_FOR_CORRECTION'
    item: null,
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [lastTicket, setLastTicket] = useState(null);
  const [queueFilter, setQueueFilter] = useState('ACTIVE'); // 'ACTIVE', 'ALL', 'SETTLED', 'REJECTED'

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // SEBI Rate Change Modal State
  const [showRateModal, setShowRateModal] = useState(false);
  const [modPair, setModPair] = useState('USDINR');
  const [newMidRate, setNewMidRate] = useState('88.20');
  const [newSpread, setNewSpread] = useState('0.45');
  const [rateChangeReason, setRateChangeReason] = useState('Central bank monetary policy shift');

  // Authorized FX Reserve Replenishment Modal State
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [replenishCurrency, setReplenishCurrency] = useState('USD');
  const [replenishAmount, setReplenishAmount] = useState('1000000');
  const [replenishReason, setReplenishReason] = useState('Central bank liquidity support');
  const [isReplenishing, setIsReplenishing] = useState(false);

  // FX Market Control & Pause/Resume
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Liquidity adjustment');
  const [isPausing, setIsPausing] = useState(false);

  // Market-Wide Transaction Limit Modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [globalLimitInput, setGlobalLimitInput] = useState('');
  const [isSettingLimit, setIsSettingLimit] = useState(false);

  // Reserve Intervention Modal (ADD & REDUCE)
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [interventionCurrency, setInterventionCurrency] = useState('USD');
  const [interventionAction, setInterventionAction] = useState('ADD'); // 'ADD' | 'REDUCE'
  const [interventionAmount, setInterventionAmount] = useState('50000');
  const [interventionReason, setInterventionReason] = useState('Central bank market intervention');
  const [isIntervening, setIsIntervening] = useState(false);

  // Tradable active reference currencies (excluding legacy CAD/CHF)
  const tradableCurrencies = useMemo(() => {
    return Object.values(CURRENCY_DIRECTORY).filter(c => !c.isLegacy && c.tradable !== false);
  }, []);

  const foreignTradableCurrencies = useMemo(() => {
    return tradableCurrencies.filter(c => c.code !== 'INR');
  }, [tradableCurrencies]);

  const fxReserves = useMemo(() => {
    return state?.fxReserves || {};
  }, [state?.fxReserves]);

  // Active teams in state
  const teams = useMemo(() => {
    if (!state?.teams) return [];
    const list = Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
    return list.filter(t => t.isActive !== false);
  }, [state?.teams]);

  // Set default selected team if available and not set
  useEffect(() => {
    if (teams.length > 0 && (!selectedTeam || !teams.some(t => t.teamCode === selectedTeam))) {
      setSelectedTeam(teams[0].teamCode || teams[0].id);
    }
  }, [teams, selectedTeam]);

  const activeTeamObj = useMemo(() => {
    if (!state?.teams) return null;
    const list = Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
    return list.find(t => t.teamCode === selectedTeam || t.id === selectedTeam) || null;
  }, [state?.teams, selectedTeam]);

  const fxRates = useMemo(() => {
    if (state?.fxRates) return state.fxRates;
    return DEFAULT_FX_RATES;
  }, [state?.fxRates]);

  // FX Transactions Ledger
  const fxTransactions = useMemo(() => {
    if (!state?.fxTransactions) return [];
    const list = Array.isArray(state.fxTransactions) ? state.fxTransactions : Object.values(state.fxTransactions);
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [state?.fxTransactions]);

  // FX Queue for Workflow: FX REQUEST -> QUEUED -> RATE CHECK -> PROCESSING -> SETTLED
  const rawFxQueue = useMemo(() => {
    if (!state?.fxQueue) return [];
    return Array.isArray(state.fxQueue) ? state.fxQueue : Object.values(state.fxQueue);
  }, [state?.fxQueue]);

  const fxQueue = useMemo(() => {
    return [...rawFxQueue].sort((a, b) => (b.submittedAt || b.timestamp || 0) - (a.submittedAt || a.timestamp || 0));
  }, [rawFxQueue]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'ACTIVE') {
      return fxQueue.filter(q => ['pending', 'QUEUED', 'CLAIMED', 'processing', 'PROCESSING', 'RATE_CHECK', 'on_hold', 'ON_HOLD'].includes(q.status));
    }
    if (queueFilter === 'SETTLED') {
      return fxQueue.filter(q => ['approved', 'SETTLED', 'settled'].includes(q.status));
    }
    if (queueFilter === 'REJECTED') {
      return fxQueue.filter(q => ['rejected', 'REJECTED', 'cancelled', 'CANCELLED', 'expired', 'EXPIRED'].includes(q.status));
    }
    return fxQueue;
  }, [fxQueue, queueFilter]);

  // Phase D: Aggregate Foreign Currency Demand vs Reserve Pool
  const aggregateDemand = useMemo(() => {
    const demand = {};
    for (const c of foreignTradableCurrencies) {
      demand[c.code] = {
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        flag: c.flag,
        precision: c.precision,
        queuedDemand: 0,
        ticketCount: 0,
        availableReserve: Number(fxReserves[c.code]?.availableReserve ?? 0),
        currentInventory: Number(fxReserves[c.code]?.currentInventory ?? 0),
        reservedInventory: Number(fxReserves[c.code]?.reservedInventory ?? 0)
      };
    }
    rawFxQueue.forEach(q => {
      const activeStatuses = ['pending', 'QUEUED', 'CLAIMED', 'processing', 'PROCESSING', 'on_hold', 'ON_HOLD', 'RATE_CHECK'];
      if (activeStatuses.includes(q.status) && demand[q.toCurrency]) {
        const amt = Number(q.toAmount || q.estimatedToAmount || 0);
        demand[q.toCurrency].queuedDemand += amt;
        demand[q.toCurrency].ticketCount += 1;
      }
    });
    return demand;
  }, [foreignTradableCurrencies, fxReserves, rawFxQueue]);

  // Wallets of Selected Team across all 10 currencies
  const teamWallets = useMemo(() => {
    const defaultWallets = {};
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      defaultWallets[cur] = 0;
    }
    if (!activeTeamObj) return defaultWallets;
    const base = activeTeamObj.cashWallets || { INR: Number(activeTeamObj.cashBalance) || 0 };
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      if (base[cur] === undefined) base[cur] = 0;
    }
    return base;
  }, [activeTeamObj]);

  const teamReserved = useMemo(() => {
    const defaultRes = {};
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      defaultRes[cur] = 0;
    }
    if (!activeTeamObj?.reservedCash) return defaultRes;
    return { ...defaultRes, ...activeTeamObj.reservedCash };
  }, [activeTeamObj]);

  // Live Conversion Calculation with unreserved balance validation & precision support
  const conversionQuote = useMemo(() => {
    const amount = parseFloat(fromAmount) || 0;
    if (amount <= 0 || fromCurrency === toCurrency) {
      return { toAmount: 0, effectiveRate: 1, spreadPercent: 0, valid: false, unreservedAvailable: 0, reservedAmount: 0 };
    }

    let effectiveRate = 1.0;
    let rawToAmount = 0;
    let spreadPercent = 0.45;

    if (fromCurrency === 'INR') {
      const pairKey = `${toCurrency}INR`;
      const fx = fxRates[pairKey] || DEFAULT_FX_RATES[pairKey];
      effectiveRate = fx?.buyRate || 1.0;
      spreadPercent = fx?.spreadPercent || 0.45;
      rawToAmount = amount / effectiveRate;
    } else if (toCurrency === 'INR') {
      const pairKey = `${fromCurrency}INR`;
      const fx = fxRates[pairKey] || DEFAULT_FX_RATES[pairKey];
      effectiveRate = fx?.sellRate || 1.0;
      spreadPercent = fx?.spreadPercent || 0.45;
      rawToAmount = amount * effectiveRate;
    } else {
      const fromPair = fxRates[`${fromCurrency}INR`] || DEFAULT_FX_RATES[`${fromCurrency}INR`];
      const toPair = fxRates[`${toCurrency}INR`] || DEFAULT_FX_RATES[`${toCurrency}INR`];
      const inrVal = amount * (fromPair?.sellRate || 1.0);
      rawToAmount = inrVal / (toPair?.buyRate || 1.0);
      effectiveRate = parseFloat(((fromPair?.sellRate || 1.0) / (toPair?.buyRate || 1.0)).toFixed(6));
      spreadPercent = Math.max(fromPair?.spreadPercent || 0.45, toPair?.spreadPercent || 0.45);
    }

    const toAmount = roundCurrency(rawToAmount, toCurrency);
    const totalHeld = Number(teamWallets[fromCurrency] || 0);
    const reservedAmount = Number(teamReserved[fromCurrency] || 0);
    const unreservedAvailable = Math.max(0, totalHeld - reservedAmount);
    const hasSufficient = unreservedAvailable >= amount;

    return {
      toAmount,
      effectiveRate,
      spreadPercent,
      hasSufficient,
      available: totalHeld,
      unreservedAvailable,
      reservedAmount,
      valid: hasSufficient && amount > 0
    };
  }, [fromAmount, fromCurrency, toCurrency, fxRates, teamWallets, teamReserved]);

  // Submit into Workflow Queue (FX REQUEST -> QUEUED)
  const handleQueueRequest = async (e) => {
    e.preventDefault();
    if (!conversionQuote.valid) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await apiFetch('/api/fx/request', {
        method: 'POST',
        body: JSON.stringify({
          teamCode: selectedTeam,
          fromCurrency,
          toCurrency,
          fromAmount: parseFloat(fromAmount),
          operatorId,
          notes,
          estimatedToAmount: conversionQuote.toAmount,
          effectiveRate: conversionQuote.effectiveRate,
          spreadPercent: conversionQuote.spreadPercent,
          simulationDurationSec: Number(simulationDurationSec)
        })
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        const item = res.request || res;
        setActiveFxSlip({
          fcfNumber: item.ticketNumber || item.id,
          teamCode: selectedTeam,
          fromCurrency,
          toCurrency,
          fromAmount: parseFloat(fromAmount),
          toAmount: conversionQuote.toAmount,
          rate: conversionQuote.effectiveRate,
          representative: notes || `Representative (${selectedTeam})`,
          createdAt: Date.now(),
          deskId: operatorId
        });
        setStatusMessage({
          type: 'success',
          text: `✓ FX TICKET QUEUED: #${item.ticketNumber || item.id} for Team ${selectedTeam}. Workflow Stage: QUEUED.`
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Network connection failed while queuing FX request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Physical Spot Execution (Direct to SETTLED)
  const handleInstantExecution = async () => {
    if (!conversionQuote.valid) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const ticketNumber = `FX-${Date.now().toString().slice(-4)}`;

    try {
      const res = await apiFetch('/api/fx/exchange', {
        method: 'POST',
        body: JSON.stringify({
          teamCode: selectedTeam,
          fromCurrency,
          toCurrency,
          fromAmount: parseFloat(fromAmount),
          operatorId,
          notes,
          ticketNumber
        })
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        const tx = res.fxTransaction || res;
        setLastTicket(tx);
        setActiveFxSlip({
          fcfNumber: tx.ticketNumber || ticketNumber,
          teamCode: selectedTeam,
          fromCurrency,
          toCurrency,
          fromAmount: parseFloat(fromAmount),
          toAmount: conversionQuote.toAmount,
          rate: conversionQuote.effectiveRate,
          representative: notes || `Representative (${selectedTeam})`,
          createdAt: Date.now(),
          deskId: operatorId
        });
        setStatusMessage({
          type: 'success',
          text: `✓ SPOT FX CLEARED IMMEDIATELY: Ticket ${tx.ticketNumber || ticketNumber} — ${fromCurrency} ${Number(fromAmount).toLocaleString()} ➔ ${toCurrency} ${Number(conversionQuote.toAmount).toLocaleString()}`
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Execution error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move request through workflow actions: RATE_CHECK -> PROCESS -> SETTLE -> REJECT
  // Move request through workflow actions: CLAIM -> START_PROCESSING -> HOLD -> APPROVE -> REJECT / RETURN / CANCEL
  const handleQueueAction = async (requestId, action, payload = {}) => {
    try {
      const res = await apiFetch('/api/fx/queue-action', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          actionType: action,
          action,
          operatorId,
          ...payload
        })
      });

      if (res.error) {
        alert(`Action failed: ${res.error}`);
      } else {
        setStatusMessage({
          type: 'success',
          text: `✓ FX Request updated: Stage ${action} recorded for #${requestId.slice(-6)}`
        });
      }
    } catch (err) {
      console.error(err);
      alert('Network error advancing FX request.');
    }
  };

  const handleConfirmActionModal = async (e) => {
    e.preventDefault();
    if (!actionModal.reason || actionModal.reason.trim().length < 3) {
      alert('Please enter a valid reason (minimum 3 characters required).');
      return;
    }
    const reasonText = actionModal.reason.trim();
    const payload = { reason: reasonText };
    if (actionModal.action === 'HOLD') {
      payload.holdReason = reasonText;
    } else if (actionModal.action === 'REJECT') {
      payload.rejectionReason = reasonText;
    } else if (actionModal.action === 'RETURN_FOR_CORRECTION') {
      payload.returnReason = reasonText;
    }
    await handleQueueAction(actionModal.item.id, actionModal.action, payload);
    setActionModal({ isOpen: false, action: null, item: null, reason: '' });
  };

  const handleUpdateFxRate = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/fx/rates', {
        method: 'POST',
        body: JSON.stringify({
          pair: modPair,
          midRate: parseFloat(newMidRate),
          spreadPercent: parseFloat(newSpread),
          actor: 'SEBI FX Desk',
          reason: rateChangeReason
        })
      });

      if (res.error) {
        alert(`Failed to update rate: ${res.error}`);
      } else {
        setShowRateModal(false);
        setStatusMessage({
          type: 'success',
          text: `✓ FX Rate for ${modPair} adjusted to ₹${parseFloat(newMidRate).toFixed(2)} (Spread: ${newSpread}%)`
        });
      }
    } catch (err) {
      alert('Network error updating FX rate.');
    }
  };

  const handleReplenishReserve = async (e) => {
    e.preventDefault();
    const qty = parseFloat(replenishAmount);
    if (!qty || qty <= 0) {
      alert('Replenishment amount must be a positive number.');
      return;
    }
    if (!replenishReason || replenishReason.trim().length < 5) {
      alert('A valid reason (minimum 5 characters) is required for authorized replenishment.');
      return;
    }
    setIsReplenishing(true);
    try {
      const res = await apiFetch('/api/fx/reserves/replenish', {
        method: 'POST',
        headers: {
          'x-role': 'sebi'
        },
        body: JSON.stringify({
          currency: replenishCurrency,
          amount: qty,
          reason: replenishReason.trim(),
          actor: operatorId || 'SEBI FX Desk'
        })
      });
      if (res.error) {
        alert(`Replenishment rejected: ${res.error}`);
      } else {
        setShowReplenishModal(false);
        setStatusMessage({
          type: 'success',
          text: `✓ FX RESERVE REPLENISHED: +${CURRENCY_SYMBOLS[replenishCurrency] || ''}${qty.toLocaleString()} added to ${replenishCurrency} pool. (Ledger ref: ${res.auditLogId || 'REPL-OK'})`
        });
      }
    } catch (err) {
      console.error(err);
      alert('Network error during reserve replenishment.');
    } finally {
      setIsReplenishing(false);
    }
  };

  const currencySymbols = CURRENCY_SYMBOLS;

  const isFxMarketPaused = state?.fxMarketState?.status === 'PAUSED';
  const fxMarketReason = state?.fxMarketState?.pausedReason;
  const fxMarketPausedAt = state?.fxMarketState?.pausedAt;
  const marketWideLimit = state?.fxMarketState?.marketWideTransactionLimitINR;

  const fx1Active = state?.deskAvailability?.FX_1 !== 'INACTIVE' && state?.fxDesks?.FX_1?.availability !== 'INACTIVE';
  const fx2Active = state?.deskAvailability?.FX_2 !== 'INACTIVE' && state?.fxDesks?.FX_2?.availability !== 'INACTIVE';

  const handlePauseMarket = async (e) => {
    e.preventDefault();
    if (!pauseReason || pauseReason.trim().length < 3) {
      alert('Please provide a valid pause reason (minimum 3 characters).');
      return;
    }
    setIsPausing(true);
    try {
      const res = await apiFetch('/api/fx/market-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'PAUSE', reason: pauseReason.trim() })
      });
      if (res.error) {
        alert(`Failed to pause FX market: ${res.error}`);
      } else {
        setShowPauseModal(false);
        setStatusMessage({ type: 'warning', text: `⏸ FX MARKET PAUSED: ${pauseReason.trim()}` });
      }
    } catch (err) {
      alert('Network error pausing FX market.');
    } finally {
      setIsPausing(false);
    }
  };

  const handleResumeMarket = async () => {
    if (!window.confirm('Resume FX Market now? Normal conversions will be accepted.')) return;
    try {
      const res = await apiFetch('/api/fx/market-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'RESUME' })
      });
      if (res.error) {
        alert(`Failed to resume FX market: ${res.error}`);
      } else {
        setStatusMessage({ type: 'success', text: '▶ FX MARKET RESUMED: Normal conversions are now active.' });
      }
    } catch (err) {
      alert('Network error resuming FX market.');
    }
  };

  const handleSetLimit = async (e) => {
    e.preventDefault();
    setIsSettingLimit(true);
    try {
      const val = globalLimitInput.trim() === '' ? null : Number(globalLimitInput);
      const res = await apiFetch('/api/fx/market-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'SET_TRANSACTION_LIMIT', limit: val })
      });
      if (res.error) {
        alert(`Failed to set limit: ${res.error}`);
      } else {
        setShowLimitModal(false);
        setStatusMessage({
          type: 'success',
          text: val ? `✓ FX Market Transaction Cap set to ₹${val.toLocaleString('en-IN')}` : '✓ FX Market Transaction Cap cleared (unrestricted).'
        });
      }
    } catch (err) {
      alert('Network error updating FX transaction limit.');
    } finally {
      setIsSettingLimit(false);
    }
  };

  const handleToggleDesk = async (deskId) => {
    try {
      const currentActive = deskId === 'FX_1' ? fx1Active : fx2Active;
      const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';
      const res = await apiFetch('/api/desks/assign', {
        method: 'POST',
        body: JSON.stringify({ action: 'TOGGLE_AVAILABILITY', deskId, availability: nextStatus })
      });
      if (res.error) {
        alert(`Failed to toggle desk: ${res.error}`);
      } else {
        setStatusMessage({
          type: 'success',
          text: `✓ Desk ${deskId} is now ${nextStatus}`
        });
      }
    } catch (err) {
      alert(`Network error toggling desk ${deskId}`);
    }
  };

  const handleReserveIntervention = async (e) => {
    e.preventDefault();
    const qty = parseFloat(interventionAmount);
    if (!qty || qty <= 0) {
      alert('Intervention amount must be a positive number.');
      return;
    }
    if (!interventionReason || interventionReason.trim().length < 3) {
      alert('A valid reason (minimum 3 characters) is required for authorized reserve adjustments.');
      return;
    }

    const resObj = fxReserves[interventionCurrency] || {};
    const avail = Number(resObj.availableReserve ?? 0);
    if (interventionAction === 'REDUCE' && qty > avail) {
      alert(`Cannot reduce ${interventionCurrency} reserve by ${qty.toLocaleString()}. Maximum allowable reduction is ${avail.toLocaleString()} to preserve committed liquidity for pending conversions.`);
      return;
    }

    setIsIntervening(true);
    try {
      const res = await apiFetch('/api/fx/reserves/adjust', {
        method: 'POST',
        body: JSON.stringify({
          currency: interventionCurrency,
          action: interventionAction,
          amount: qty,
          reason: interventionReason.trim()
        })
      });
      if (res.error) {
        alert(`Reserve adjustment rejected: ${res.error}`);
      } else {
        setShowInterventionModal(false);
        setStatusMessage({
          type: 'success',
          text: `✓ FX RESERVE ${interventionAction === 'ADD' ? 'INCREASED' : 'REDUCED'}: ${interventionAction === 'ADD' ? '+' : '-'}${CURRENCY_SYMBOLS[interventionCurrency] || ''}${qty.toLocaleString()} (${interventionCurrency}).`
        });
      }
    } catch (err) {
      alert('Network error adjusting FX reserve.');
    } finally {
      setIsIntervening(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-warm)', color: 'var(--navy-900)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
        
        {/* Header Ribbon */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>💱</span>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '22px', fontWeight: '700', margin: 0, color: 'var(--navy-900)' }}>
                SAAMX Currency Exchange Desk
              </h1>
              <span style={{
                background: 'rgba(132, 85, 8, 0.1)',
                color: 'var(--gold-royal)',
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}>
                MULTI-STAGE CLEARANCE SYSTEM
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Full FX Workflow: FX REQUEST ➔ QUEUED ➔ RATE CHECK ➔ PROCESSING ➔ SETTLED (10 Active Reference Currencies: INR, USD, GBP, EUR, JPY, AED, SGD, CNY, AUD, KRW)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ color: 'var(--text-muted)' }}>Operational Delay:</span>
              <select
                value={simulationDurationSec}
                onChange={(e) => setSimulationDurationSec(Number(e.target.value))}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-soft)',
                  background: '#fff',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <option value={60}>1 Min (60s)</option>
                <option value={120}>2 Min (120s)</option>
                <option value={180}>3 Min (180s)</option>
                <option value={240}>4 Min (240s)</option>
                <option value={300}>5 Min (300s)</option>
              </select>
            </div>

            {isStaffOperator && (
              <>
                <button
                  onClick={() => {
                    setModPair('USDINR');
                    setNewMidRate(String(fxRates.USDINR?.midRate || 88.20));
                    setShowRateModal(true);
                  }}
                  style={{
                    background: 'var(--navy-900)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚙️ Modify FX Rates
                </button>

                <button
                  onClick={() => {
                    setReplenishCurrency('USD');
                    setReplenishAmount('1000000');
                    setReplenishReason('Central bank liquidity support');
                    setShowReplenishModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🏦 Authorized Replenish
                </button>
              </>
            )}

            <div style={{
              background: connected ? 'rgba(6, 95, 62, 0.08)' : 'rgba(147, 25, 19, 0.08)',
              border: `1px solid ${connected ? 'rgba(6, 95, 62, 0.2)' : 'rgba(147, 25, 19, 0.2)'}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              color: connected ? 'var(--green-emerald)' : 'var(--red-crimson)'
            }}>
              {connected ? '● LIVE SYNC' : '○ CONNECTING'}
            </div>
          </div>
        </div>

        {/* FX Market Status Banner when PAUSED */}
        {isFxMarketPaused && (
          <div style={{
            background: '#FEF2F2',
            border: '2px solid #EF4444',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '28px' }}>⏸️</span>
              <div>
                <div style={{ fontWeight: '800', color: '#991B1B', fontSize: '16px', letterSpacing: '0.02em' }}>
                  FX MARKET TEMPORARILY PAUSED
                </div>
                <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
                  <strong>Reason:</strong> {fxMarketReason || 'Operational halt / Liquidity recalibration'}
                  {fxMarketPausedAt && (
                    <span style={{ marginLeft: '12px' }}>
                      <strong>Paused at:</strong> {new Date(fxMarketPausedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                  New currency conversion requests cannot be submitted at this time. Outstanding queued tickets remain safe and continue to drain.
                </div>
              </div>
            </div>
            <span style={{
              background: '#DC2626',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.5px'
            }}>
              CONVERSIONS SUSPENDED
            </span>
          </div>
        )}

        {/* Authorized FX Staff Control Bar */}
        {isStaffOperator && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            {/* FX Market Status & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  FX Market:
                </span>
                <span style={{
                  background: isFxMarketPaused ? '#FEE2E2' : '#DCFCE7',
                  color: isFxMarketPaused ? '#991B1B' : '#166534',
                  border: `1px solid ${isFxMarketPaused ? '#FCA5A5' : '#86EFAC'}`,
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {isFxMarketPaused ? '● PAUSED' : '● OPEN'}
                </span>
              </div>

              {isFxMarketPaused ? (
                <button
                  type="button"
                  onClick={handleResumeMarket}
                  style={{
                    background: '#16A34A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ▶ Resume FX Market
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPauseReason('Liquidity adjustment');
                    setShowPauseModal(true);
                  }}
                  style={{
                    background: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⏸ Pause FX Market
                </button>
              )}

              {/* Market-wide Transaction Limit */}
              <button
                type="button"
                onClick={() => {
                  setGlobalLimitInput(marketWideLimit ? String(marketWideLimit) : '');
                  setShowLimitModal(true);
                }}
                style={{
                  background: marketWideLimit ? '#FEF3C7' : 'var(--bg-warm)',
                  color: marketWideLimit ? '#92400E' : 'var(--navy-900)',
                  border: `1px solid ${marketWideLimit ? '#FCD34D' : 'var(--border-soft)'}`,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🛡 {marketWideLimit ? `Global Cap: ₹${Number(marketWideLimit).toLocaleString('en-IN')}` : 'Global Cap: None (Configure)'}
              </button>
            </div>

            {/* FX Desks Active/Inactive Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                FX Desks:
              </span>
              
              {/* Desk 1 */}
              <button
                type="button"
                onClick={() => handleToggleDesk('FX_1')}
                style={{
                  background: fx1Active ? '#EFF6FF' : '#F3F4F6',
                  color: fx1Active ? '#1D4ED8' : '#6B7280',
                  border: `1px solid ${fx1Active ? '#93C5FD' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>FX 1 (Primary):</span>
                <strong style={{ color: fx1Active ? '#15803D' : '#DC2626' }}>{fx1Active ? 'ACTIVE' : 'INACTIVE'}</strong>
              </button>

              {/* Desk 2 */}
              <button
                type="button"
                onClick={() => handleToggleDesk('FX_2')}
                style={{
                  background: fx2Active ? '#FAF5FF' : '#F3F4F6',
                  color: fx2Active ? '#7E22CE' : '#6B7280',
                  border: `1px solid ${fx2Active ? '#D8B4FE' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>FX 2 (Secondary):</span>
                <strong style={{ color: fx2Active ? '#15803D' : '#DC2626' }}>{fx2Active ? 'ACTIVE' : 'INACTIVE'}</strong>
              </button>

              {/* Reserve Intervention Trigger */}
              <button
                type="button"
                onClick={() => {
                  setInterventionCurrency('USD');
                  setInterventionAction('ADD');
                  setInterventionAmount('50000');
                  setInterventionReason('Central bank market intervention');
                  setShowInterventionModal(true);
                }}
                style={{
                  background: 'var(--navy-900)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ⚖️ Reserve Intervention
              </button>
            </div>
          </div>
        )}

        {/* Live FX Rates Board */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {Object.entries(fxRates).map(([pairKey, fx]) => (
            <div key={pairKey} style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-soft)',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--navy-900)' }}>
                  {fx.pair || `${pairKey.slice(0,3)}/${pairKey.slice(3)}`}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-warm)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Spread: {fx.spreadPercent || 0.45}%
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--navy-900)' }}>
                  ₹{(fx.midRate || 88.20).toFixed(2)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spot Mid</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-soft)',
                fontSize: '11px'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Desk Sells (Buy)</div>
                  <div style={{ fontWeight: '700', color: 'var(--red-crimson)', fontFamily: 'monospace' }}>
                    ₹{(fx.buyRate || fx.midRate * 1.0045).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Desk Buys (Sell)</div>
                  <div style={{ fontWeight: '700', color: 'var(--green-emerald)', fontFamily: 'monospace' }}>
                    ₹{(fx.sellRate || fx.midRate * 0.9955).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Finite FX Desk Reserves & Scarcity Monitor */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🏦</span>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--navy-900)' }}>
                  Finite FX Desk Reserves & Scarcity Monitor
                </h2>
                <span style={{
                  background: 'rgba(6, 95, 62, 0.1)',
                  color: 'var(--green-emerald)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  SOLVENCY INVARIANT ACTIVE (A + Res = I)
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Desk Domestic INR Cash: <strong>₹{Number(fxReserves.INR?.availableReserve ?? fxReserves.INR?.currentInventory ?? 5000000000).toLocaleString('en-IN')}</strong> &bull; Utilization curve dynamically widens spreads and applies mid-rate scarcity premiums beyond 50% pool drawdown.
              </p>
            </div>

            <button
              onClick={() => {
                setReplenishCurrency('USD');
                setReplenishAmount('1000000');
                setReplenishReason('Central bank liquidity support');
                setShowReplenishModal(true);
              }}
              style={{
                background: 'var(--navy-900)',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              + Authorized Replenishment
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {foreignTradableCurrencies.map(c => {
              const res = fxReserves[c.code] || {};
              const avail = Number(res.availableReserve ?? 0);
              const reserved = Number(res.reservedInventory ?? 0);
              const currentInv = Number(res.currentInventory ?? (avail + reserved));
              const initialOpening = Number(res.openingReserve ?? 0);
              const isZeroDec = c.code === 'JPY' || c.code === 'KRW';
              const pairKey = `${c.code}INR`;
              const pairMidRate = Number(fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
              const inrEquivalent = Math.round(currentInv * pairMidRate);

              const utilization = currentInv > 0 ? (reserved / currentInv) : 0;
              const uPct = (utilization * 100).toFixed(1);
              const isCritical = avail <= 0;
              const isElevated = utilization > 0.50 && !isCritical;

              return (
                <div key={c.code} style={{
                  background: 'var(--bg-warm)',
                  border: isCritical ? '1px solid rgba(220, 38, 38, 0.4)' : isElevated ? '1px solid rgba(255, 104, 0, 0.3)' : '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{c.flag}</span>
                      <strong style={{ fontSize: '13px', color: 'var(--navy-900)' }}>{c.code}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({c.symbol})</span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isFxMarketPaused ? 'rgba(239, 68, 68, 0.15)' : (isCritical ? 'rgba(220, 38, 38, 0.15)' : isElevated ? 'rgba(255, 104, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                      color: isFxMarketPaused ? '#DC2626' : (isCritical ? 'var(--red-crimson)' : isElevated ? '#D97706' : 'var(--green-emerald)')
                    }}>
                      {isFxMarketPaused ? 'PAUSED' : isCritical ? `DEPLETED` : isElevated ? `HIGH DEMAND` : `NORMAL`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Available Reserve</div>
                      <div style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--navy-900)', fontSize: '12px' }}>
                        {c.symbol}{avail.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Reserved / In Queue</div>
                      <div style={{ fontWeight: '800', fontFamily: 'monospace', color: reserved > 0 ? '#B45309' : 'var(--text-muted)', fontSize: '12px' }}>
                        {c.symbol}{reserved.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Current Total</div>
                      <div style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--navy-900)' }}>
                        {c.symbol}{currentInv.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Initial Event Reserve</div>
                      <div style={{ fontWeight: '600', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {c.symbol}{initialOpening.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-soft)',
                    fontSize: '10px'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Mid: <strong>₹{pairMidRate.toFixed(2)}</strong> &nbsp;|&nbsp;
                      INR Eq: <strong>₹{inrEquivalent.toLocaleString('en-IN')}</strong>
                    </span>
                    {isStaffOperator && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setInterventionCurrency(c.code);
                            setInterventionAction('ADD');
                            setInterventionAmount(isZeroDec ? '1000000' : '10000');
                            setInterventionReason('Market liquidity injection');
                            setShowInterventionModal(true);
                          }}
                          style={{
                            background: '#DCFCE7',
                            border: '1px solid #86EFAC',
                            borderRadius: '4px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#15803D',
                            cursor: 'pointer'
                          }}
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInterventionCurrency(c.code);
                            setInterventionAction('REDUCE');
                            setInterventionAmount(isZeroDec ? '500000' : '5000');
                            setInterventionReason('Market liquidity absorption');
                            setShowInterventionModal(true);
                          }}
                          style={{
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '4px',
                            padding: '3px 7px',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#B91C1C',
                            cursor: 'pointer'
                          }}
                        >
                          - Reduce
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase D: Aggregate Foreign Currency Demand vs Reserve Pool Panel */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--navy-900)' }}>
                  Aggregate Foreign Currency Demand vs Reserve Pool
                </h2>
                <span style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  REAL-TIME QUEUE LIQUIDITY COVERAGE
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Aggregates pending and processing demand slips across active tickets against available desk reserve liquidity.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: '700' }}>
              <span style={{ background: 'var(--bg-warm)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
                Active Slips: {rawFxQueue.filter(q => ['pending', 'QUEUED', 'CLAIMED', 'processing', 'PROCESSING', 'on_hold', 'ON_HOLD', 'RATE_CHECK'].includes(q.status)).length}
              </span>
              <span style={{ background: 'var(--bg-warm)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
                Currencies with Demand: {Object.values(aggregateDemand).filter(d => d.queuedDemand > 0).length} / 9
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {Object.values(aggregateDemand).map(d => {
              const isZeroDec = d.code === 'JPY' || d.code === 'KRW';
              const coverageRatio = d.availableReserve > 0 ? (d.queuedDemand / d.availableReserve) * 100 : (d.queuedDemand > 0 ? 100 : 0);
              const isDeficit = d.queuedDemand > d.availableReserve;
              const isHighPressure = !isDeficit && coverageRatio > 60;

              return (
                <div key={d.code} style={{
                  background: 'var(--bg-warm)',
                  border: isDeficit ? '1px solid rgba(220, 38, 38, 0.5)' : isHighPressure ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px' }}>{d.flag}</span>
                      <strong style={{ fontSize: '13px', color: 'var(--navy-900)' }}>{d.code}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({d.name})</span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isDeficit ? 'rgba(220, 38, 38, 0.15)' : isHighPressure ? 'rgba(245, 158, 11, 0.15)' : d.queuedDemand > 0 ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: isDeficit ? 'var(--red-crimson)' : isHighPressure ? '#b45309' : d.queuedDemand > 0 ? '#2563eb' : 'var(--green-emerald)'
                    }}>
                      {isDeficit ? 'DEFICIT ALERT' : isHighPressure ? 'HIGH PRESSURE' : d.queuedDemand > 0 ? 'COVERED' : 'NO DEMAND'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Queued Demand</div>
                      <div style={{ fontWeight: '800', fontFamily: 'monospace', color: d.queuedDemand > 0 ? (isDeficit ? 'var(--red-crimson)' : 'var(--navy-900)') : 'var(--text-muted)' }}>
                        {d.symbol}{d.queuedDemand.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.ticketCount} active ticket{d.ticketCount === 1 ? '' : 's'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Available Reserve</div>
                      <div style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--green-emerald)' }}>
                        {d.symbol}{d.availableReserve.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total: {d.symbol}{d.currentInventory.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}</div>
                    </div>
                  </div>

                  {/* Liquidity Utilization Bar */}
                  <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, coverageRatio)}%`,
                      background: isDeficit ? 'var(--red-crimson)' : isHighPressure ? '#f59e0b' : '#2563eb',
                      borderRadius: '3px'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Demand / Available Reserve:</span>
                    <strong style={{ color: isDeficit ? 'var(--red-crimson)' : 'var(--navy-900)' }}>
                      {coverageRatio.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMessage && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: '600',
            background: statusMessage.type === 'success' ? 'rgba(6, 95, 62, 0.08)' : 'rgba(147, 25, 19, 0.08)',
            color: statusMessage.type === 'success' ? 'var(--green-emerald)' : 'var(--red-crimson)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(6, 95, 62, 0.2)' : 'rgba(147, 25, 19, 0.2)'}`
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Main Workstation: Left Column Form, Right Column Workflow Queue & History */}
        <div style={{ display: 'grid', gridTemplateColumns: '420px minmax(0, 1fr)', gap: '20px' }}>
          
          {/* LEFT: FX Conversion Slip Intake */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            height: 'fit-content'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 14px', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> Issue FX Slip / Request
            </h2>

            <form onSubmit={handleQueueRequest}>
              {/* Participant Team Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '5px' }}>
                  Target Investment House / Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    background: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--navy-900)'
                  }}
                >
                  {teams.map(t => (
                    <option key={t.teamCode || t.id} value={t.teamCode || t.id}>
                      {t.teamCode || t.id} — {t.teamName || t.investmentHouseName || 'Collegiate House'}
                    </option>
                  ))}
                </select>

                {/* Team Multi-Currency Balances (10 Currencies) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: 'var(--bg-warm)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}>
                  {tradableCurrencies.map(c => {
                    const total = Number(teamWallets[c.code] || 0);
                    const res = Number(teamReserved[c.code] || 0);
                    const unres = Math.max(0, total - res);
                    return (
                      <div key={c.code} style={{ padding: '3px 4px', borderRight: '1px solid var(--border-soft)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{c.flag} {c.code}:</span>{' '}
                        <strong style={{ color: 'var(--navy-900)' }}>
                          {CURRENCY_SYMBOLS[c.code]}{total.toLocaleString()}
                        </strong>
                        {res > 0 && (
                          <div style={{ fontSize: '9px', color: 'var(--gold-royal)' }}>
                            Unres: {CURRENCY_SYMBOLS[c.code]}{unres.toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Currency Pair Direction */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    Sold (From)
                  </label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      background: '#fff',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >
                    {tradableCurrencies.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ textAlign: 'center', paddingTop: '14px', fontSize: '16px', color: 'var(--text-muted)' }}>
                  ➔
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    Bought (To)
                  </label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      background: '#fff',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >
                    {tradableCurrencies.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)' }}>
                    Amount to Sell ({fromCurrency})
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Max Unreserved: {currencySymbols[fromCurrency]}{Number(conversionQuote.unreservedAvailable || 0).toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '15px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: 'var(--navy-900)'
                  }}
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Real-time Rate Breakdown Box */}
              <div style={{
                background: 'rgba(132, 85, 8, 0.04)',
                border: '1px dashed var(--gold-royal)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px'
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--gold-royal)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Simulation Reference Rate (Central Bank Seed)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Spot Rate:</span>
                  <strong>
                    {fromCurrency === 'INR'
                      ? `1 ${toCurrency} = ₹${(toCurrency === 'JPY' || toCurrency === 'KRW') ? conversionQuote.effectiveRate.toFixed(4) : conversionQuote.effectiveRate.toFixed(2)}`
                      : toCurrency === 'INR'
                      ? `1 ${fromCurrency} = ₹${(fromCurrency === 'JPY' || fromCurrency === 'KRW') ? conversionQuote.effectiveRate.toFixed(4) : conversionQuote.effectiveRate.toFixed(2)}`
                      : `Rate: ${conversionQuote.effectiveRate.toFixed(6)}`}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Spread:</span>
                  <span>{conversionQuote.spreadPercent}% Included</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(132, 85, 8, 0.2)',
                  marginTop: '6px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--navy-900)' }}>Estimated Proceeds:</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--green-emerald)' }}>
                    {currencySymbols[toCurrency]}{conversionQuote.toAmount.toLocaleString()}
                  </span>
                </div>
                {conversionQuote.reservedAmount > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    🔒 Reserved: {currencySymbols[fromCurrency]}{conversionQuote.reservedAmount.toLocaleString()} | Available unreserved: {currencySymbols[fromCurrency]}{conversionQuote.unreservedAvailable.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Operator Identification */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Desk Operator ID & Physical Slip Notes
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '11px'
                    }}
                    placeholder="Operator ID"
                  />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '11px'
                    }}
                    placeholder="Physical Slip #"
                  />
                </div>
              </div>

              {/* Action Buttons: Queue into Workflow vs Immediate Execution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={!conversionQuote.valid || isSubmitting || isFxMarketPaused}
                  style={{
                    width: '100%',
                    background: isFxMarketPaused ? '#9CA3AF' : (conversionQuote.valid ? 'linear-gradient(135deg, #FF6800 0%, #E65100 100%)' : '#ccc'),
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: (!isFxMarketPaused && conversionQuote.valid) ? 'pointer' : 'not-allowed',
                    boxShadow: (!isFxMarketPaused && conversionQuote.valid) ? '0 4px 14px rgba(255, 104, 0, 0.35)' : 'none',
                    transition: 'all 0.2s',
                    letterSpacing: '0.02em'
                  }}
                >
                  {isFxMarketPaused
                    ? '⏸ FX Market Paused — Submissions Suspended'
                    : isSubmitting
                      ? 'Submitting...'
                      : `Convert & Submit to FX Queue (${simulationDurationSec}s)`}
                </button>

                <button
                  type="button"
                  onClick={handleInstantExecution}
                  disabled={!conversionQuote.valid || isSubmitting || isFxMarketPaused}
                  style={{
                    width: '100%',
                    background: (!isFxMarketPaused && conversionQuote.valid) ? 'var(--color-navy, #0B192C)' : '#e5e7eb',
                    color: (!isFxMarketPaused && conversionQuote.valid) ? '#fff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: (!isFxMarketPaused && conversionQuote.valid) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isFxMarketPaused ? '⏸ FX Market Paused' : '⚡ Direct Clearance (Instant Spot Execution)'}
                </button>
              </div>

              {!conversionQuote.hasSufficient && parseFloat(fromAmount) > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--red-crimson)', textAlign: 'center', fontWeight: '600' }}>
                  ⚠️ Insufficient {fromCurrency} balance.
                </div>
              )}
            </form>
          </div>

          {/* RIGHT: LIVE FX WORKFLOW QUEUE & SETTLED LEDGER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Live Workflow Queue Table */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-soft)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⏳</span> Simulated FX Operations Queue (5-Stage Workflow)
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Stages: FX REQUEST ➔ QUEUED ➔ RATE CHECK ➔ PROCESSING ➔ SETTLED
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {['ACTIVE', 'ALL', 'SETTLED'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setQueueFilter(tab)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-soft)',
                        background: queueFilter === tab ? 'var(--navy-900)' : 'var(--bg-warm)',
                        color: queueFilter === tab ? '#fff' : 'var(--navy-900)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Ticket #</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Team</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Pair / Direction</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Amount Sold</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Proceeds</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Rate & Spread</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)' }}>Stage Status</th>
                      <th style={{ padding: '8px 10px', color: 'var(--navy-900)', textAlign: 'right' }}>Workflow Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No FX requests matching filter "{queueFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map(item => {
                        const statusColors = {
                          pending: '#d97706',
                          QUEUED: '#d97706',
                          CLAIMED: '#2563eb',
                          RATE_CHECK: '#2563eb',
                          processing: '#7c3aed',
                          PROCESSING: '#7c3aed',
                          on_hold: '#f59e0b',
                          ON_HOLD: '#f59e0b',
                          approved: '#059669',
                          SETTLED: '#059669',
                          rejected: '#dc2626',
                          REJECTED: '#dc2626',
                          cancelled: '#6b7280',
                          CANCELLED: '#6b7280',
                          expired: '#9ca3af',
                          EXPIRED: '#9ca3af'
                        };

                        const isProcessing = item.status === 'processing' || item.status === 'PROCESSING';
                        const clearsAt = item.clearsAt || 0;
                        const remainingSec = Math.max(0, Math.ceil((clearsAt - now) / 1000));
                        const isTimeElapsed = clearsAt > 0 && now >= clearsAt;
                        const isTerminal = ['approved', 'SETTLED', 'settled', 'rejected', 'REJECTED', 'cancelled', 'CANCELLED', 'expired', 'EXPIRED'].includes(item.status);

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--gold-royal)' }}>
                              {item.ticketNumber || item.id?.slice(-6)}
                            </td>
                            <td style={{ padding: '10px', fontWeight: '700' }}>
                              {item.teamCode}
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                background: 'var(--bg-warm)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                fontSize: '11px'
                              }}>
                                {item.fromCurrency} ➔ {item.toCurrency}
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace' }}>
                              {currencySymbols[item.fromCurrency]}{Number(item.fromAmount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--green-emerald)' }}>
                              {currencySymbols[item.toCurrency]}{Number(item.estimatedToAmount || item.toAmount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px' }}>
                              <div>{item.effectiveRate ? item.effectiveRate : 'Market'}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.spreadPercent || 0.45}% spread</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                background: `${statusColors[item.status] || '#666'}15`,
                                color: statusColors[item.status] || '#666',
                                border: `1px solid ${statusColors[item.status] || '#666'}40`,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: '800',
                                fontSize: '10px',
                                display: 'inline-block'
                              }}>
                                ● {item.status}
                              </span>

                              {/* Phase D: Live Countdown Timer with Simulated Delay Notice (No Auto-Settlement) */}
                              {isProcessing && clearsAt > 0 && (
                                <div style={{ marginTop: '4px', fontSize: '10px' }}>
                                  {!isTimeElapsed ? (
                                    <>
                                      <span style={{
                                        background: 'rgba(124, 58, 237, 0.12)',
                                        color: '#7c3aed',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        ⏱️ {Math.floor(remainingSec / 60)}:{(remainingSec % 60).toString().padStart(2, '0')} remaining
                                      </span>
                                      <div style={{ color: '#6b7280', fontSize: '9px', marginTop: '2px' }}>
                                        Simulated Delay &bull; No Auto-Settlement
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#059669',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        ⏱️ Elapsed (00:00)
                                      </span>
                                      <div style={{ color: '#059669', fontSize: '9px', marginTop: '2px', fontWeight: '600' }}>
                                        Ready for Operator Review (No Auto-Settlement)
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {item.status === 'on_hold' && (
                                <div style={{ fontSize: '10px', color: '#b45309', marginTop: '3px', fontWeight: '600' }}>
                                  Reason: {item.holdReason || 'Hold applied by operator'}
                                </div>
                              )}

                              {(item.status === 'rejected' || item.status === 'REJECTED') && item.rejectionReason && (
                                <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '3px' }}>
                                  {item.rejectionReason}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setActiveFxSlip({
                                    fcfNumber: item.ticketNumber || item.id,
                                    teamCode: item.teamCode,
                                    fromCurrency: item.fromCurrency,
                                    toCurrency: item.toCurrency,
                                    fromAmount: item.fromAmount,
                                    toAmount: item.toAmount || item.estimatedToAmount,
                                    rate: item.effectiveRate || item.rate,
                                    representative: item.notes || `Representative (${item.teamCode})`,
                                    createdAt: item.submittedAt || item.timestamp,
                                    deskId: item.deskId || item.lockedByOperator || 'FX-DESK'
                                  })}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#f1f5f9',
                                    color: '#0f172a',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title="View Forex Conversion Form (FCF)"
                                >
                                  📄 Slip
                                </button>
                                {isTerminal ? (
                                  <div>
                                    {['approved', 'SETTLED', 'settled'].includes(item.status) && (
                                      <span style={{ fontSize: '11px', color: 'var(--green-emerald)', fontWeight: '700' }}>
                                        ✓ Approved & Settled
                                      </span>
                                    )}
                                    {['rejected', 'REJECTED'].includes(item.status) && (
                                      <span style={{ fontSize: '11px', color: 'var(--red-crimson)', fontWeight: '700' }}>
                                        ✕ Rejected
                                      </span>
                                    )}
                                    {['cancelled', 'CANCELLED'].includes(item.status) && (
                                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700' }}>
                                        ⊘ Cancelled
                                      </span>
                                    )}
                                    {['expired', 'EXPIRED'].includes(item.status) && (
                                      <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '700' }}>
                                        ⌛ Expired
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    {/* 1. Claim Operator Control */}
                                    {!item.lockedByOperator ? (
                                      <button
                                        onClick={() => handleQueueAction(item.id, 'CLAIM')}
                                        style={{
                                          padding: '4px 8px',
                                          background: '#2563eb',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Claim
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: '#4b5563', padding: '2px 4px', background: '#e5e7eb', borderRadius: '4px', fontWeight: '600' }}>
                                        🔒 {item.lockedByOperator}
                                      </span>
                                    )}

                                    {/* 2. Start Clearance / Process */}
                                    {(['pending', 'QUEUED', 'CLAIMED', 'RATE_CHECK'].includes(item.status)) && (
                                      <button
                                        onClick={() => handleQueueAction(item.id, 'START_PROCESSING', { durationSec: simulationDurationSec })}
                                        style={{
                                          padding: '4px 8px',
                                          background: '#7c3aed',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Start Clearance
                                      </button>
                                    )}

                                    {/* 3. Approve / Settle Trade */}
                                    {(isProcessing || item.status === 'on_hold') && (
                                      <button
                                        onClick={() => handleQueueAction(item.id, 'APPROVE')}
                                        style={{
                                          padding: '4px 8px',
                                          background: '#059669',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Approve
                                      </button>
                                    )}

                                    {/* 4. Hold Operator Control */}
                                    {item.status !== 'on_hold' ? (
                                      <button
                                        onClick={() => setActionModal({ isOpen: true, action: 'HOLD', item, reason: '' })}
                                        style={{
                                          padding: '4px 8px',
                                          background: '#f59e0b',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Hold
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleQueueAction(item.id, 'START_PROCESSING', { durationSec: simulationDurationSec })}
                                        style={{
                                          padding: '4px 8px',
                                          background: '#7c3aed',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Resume
                                      </button>
                                    )}

                                    {/* 5. Return for Correction */}
                                    <button
                                      onClick={() => setActionModal({ isOpen: true, action: 'RETURN_FOR_CORRECTION', item, reason: '' })}
                                      style={{
                                        padding: '4px 8px',
                                        background: 'transparent',
                                        color: '#ea580c',
                                        border: '1px solid #ea580c',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Return
                                    </button>

                                    {/* 6. Reject Operator Control */}
                                    <button
                                      onClick={() => setActionModal({ isOpen: true, action: 'REJECT', item, reason: '' })}
                                      style={{
                                        padding: '4px 8px',
                                        background: 'transparent',
                                        color: 'var(--red-crimson)',
                                        border: '1px solid var(--red-crimson)',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Reject
                                    </button>

                                    {/* 7. Cancel Control */}
                                    <button
                                      onClick={() => handleQueueAction(item.id, 'CANCEL')}
                                      style={{
                                        padding: '4px 8px',
                                        background: 'transparent',
                                        color: '#6b7280',
                                        border: '1px solid #9ca3af',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authoritative Historical Clearance Ledger */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-soft)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span> Settled FX Transactions Ledger
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {fxTransactions.length} Cleared Transactions
                </span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-warm)', textAlign: 'left', borderBottom: '2px solid var(--border-soft)' }}>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Ticket #</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Team</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Direction</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Sold</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Proceeds</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Rate</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Desk Operator</th>
                      <th style={{ padding: '6px 8px', color: 'var(--navy-900)' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fxTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No settled FX conversions on record yet.
                        </td>
                      </tr>
                    ) : (
                      fxTransactions.map((tx) => (
                        <tr key={tx.id || tx.ticketNumber} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--gold-royal)' }}>
                            <button
                              type="button"
                              onClick={() => setActiveFxSlip({
                                fcfNumber: tx.ticketNumber || tx.id,
                                teamCode: tx.teamCode,
                                fromCurrency: tx.fromCurrency,
                                toCurrency: tx.toCurrency,
                                fromAmount: tx.fromAmount,
                                toAmount: tx.toAmount,
                                rate: tx.effectiveRate,
                                representative: tx.notes || `Representative (${tx.teamCode})`,
                                createdAt: tx.timestamp,
                                deskId: tx.operatorId || 'FX-DESK'
                              })}
                              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                              title="View Forex Conversion Slip (FCF)"
                            >
                              📄 {tx.ticketNumber || tx.id}
                            </button>
                          </td>
                          <td style={{ padding: '8px', fontWeight: '700' }}>
                            {tx.teamCode}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              background: 'var(--bg-warm)',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '11px'
                            }}>
                              {tx.fromCurrency} ➔ {tx.toCurrency}
                            </span>
                          </td>
                          <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                            {currencySymbols[tx.fromCurrency]}{Number(tx.fromAmount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--green-emerald)' }}>
                            {currencySymbols[tx.toCurrency]}{Number(tx.toAmount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                            {tx.effectiveRate}
                          </td>
                          <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {tx.operatorId || 'FX-DESK'}
                          </td>
                          <td style={{ padding: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                            {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Regulatory FX Rate Modification Modal */}
      {showRateModal && isStaffOperator && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(8, 10, 14, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Regulatory Spot Rate Adjustment
            </h3>

            <form onSubmit={handleUpdateFxRate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                  Target Currency Pair
                </label>
                <select
                  value={modPair}
                  onChange={(e) => {
                    setModPair(e.target.value);
                    setNewMidRate(String(fxRates[e.target.value]?.midRate || 88.20));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  <option value="USDINR">USD / INR (US Dollar)</option>
                  <option value="GBPINR">GBP / INR (British Pound)</option>
                  <option value="EURINR">EUR / INR (Eurozone Euro)</option>
                  <option value="JPYINR">JPY / INR (Japanese Yen)</option>
                  <option value="AEDINR">AED / INR (UAE Dirham)</option>
                  <option value="SGDINR">SGD / INR (Singapore Dollar)</option>
                  <option value="CNYINR">CNY / INR (Chinese Yuan)</option>
                  <option value="AUDINR">AUD / INR (Australian Dollar)</option>
                  <option value="KRWINR">KRW / INR (South Korean Won)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                    New Mid Spot Rate (₹)
                  </label>
                  <input
                    type="number"
                    step={(modPair === 'JPYINR' || modPair === 'KRWINR') ? '0.0001' : '0.01'}
                    value={newMidRate}
                    onChange={(e) => setNewMidRate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                    Spread Percent (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newSpread}
                    onChange={(e) => setNewSpread(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                  Policy Reason / Narrative Signal
                </label>
                <input
                  type="text"
                  value={rateChangeReason}
                  onChange={(e) => setRateChangeReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '13px'
                  }}
                  placeholder="e.g. Monetary policy update"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  style={{
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--navy-900)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Publish New Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorized Reserve Intervention Modal (ADD & REDUCE with Commitment Protection) */}
      {showInterventionModal && isStaffOperator && (() => {
        const selectedRes = fxReserves[interventionCurrency] || {};
        const avail = Number(selectedRes.availableReserve ?? 0);
        const committed = Number(selectedRes.reservedInventory ?? 0);
        const currentInv = Number(selectedRes.currentInventory ?? (avail + committed));
        const isZeroDec = interventionCurrency === 'JPY' || interventionCurrency === 'KRW';
        const numAmount = parseFloat(interventionAmount) || 0;
        const isUnsafeReduction = interventionAction === 'REDUCE' && numAmount > avail;

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-soft)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '17px', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚖️</span> FX Reserve Intervention Control
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Authorized central desk intervention to increase or decrease foreign currency liquidity. Every change is audited as a market event.
              </p>

              <form onSubmit={handleReserveIntervention}>
                {/* Intervention Direction (ADD vs REDUCE) */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Intervention Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setInterventionAction('ADD')}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: interventionAction === 'ADD' ? '2px solid #16A34A' : '1px solid var(--border-soft)',
                        background: interventionAction === 'ADD' ? '#DCFCE7' : 'var(--bg-warm)',
                        color: interventionAction === 'ADD' ? '#15803D' : 'var(--navy-900)',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      + ADD RESERVE (Inject)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterventionAction('REDUCE')}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: interventionAction === 'REDUCE' ? '2px solid #DC2626' : '1px solid var(--border-soft)',
                        background: interventionAction === 'REDUCE' ? '#FEE2E2' : 'var(--bg-warm)',
                        color: interventionAction === 'REDUCE' ? '#991B1B' : 'var(--navy-900)',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      - REDUCE RESERVE (Absorb)
                    </button>
                  </div>
                </div>

                {/* Target Foreign Currency */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Target Currency
                  </label>
                  <select
                    value={interventionCurrency}
                    onChange={(e) => setInterventionCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >
                    {foreignTradableCurrencies.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Reserve State Display */}
                <div style={{
                  background: 'var(--bg-warm)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  border: '1px solid var(--border-soft)',
                  fontSize: '11px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Total:</span>{' '}
                    <strong>{CURRENCY_SYMBOLS[interventionCurrency]}{currentInv.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Committed / In Queue:</span>{' '}
                    <strong style={{ color: committed > 0 ? '#B45309' : 'inherit' }}>{CURRENCY_SYMBOLS[interventionCurrency]}{committed.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-soft)', paddingTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Maximum Safe Reduction:</span>{' '}
                    <strong style={{ color: '#16A34A' }}>{CURRENCY_SYMBOLS[interventionCurrency]}{avail.toLocaleString('en-US', { maximumFractionDigits: isZeroDec ? 0 : 2 })}</strong>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Intervention Amount ({interventionCurrency})
                  </label>
                  <input
                    type="number"
                    step={isZeroDec ? '1' : '0.01'}
                    value={interventionAmount}
                    onChange={(e) => setInterventionAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isUnsafeReduction ? '2px solid #DC2626' : '1px solid var(--border-soft)',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                  {isUnsafeReduction && (
                    <div style={{ marginTop: '5px', fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>
                      ⚠️ Unsafe Reduction: Amount exceeds available reserve ({avail.toLocaleString()}). Reduction cannot violate committed liquidity ({committed.toLocaleString()} reserved for pending conversions).
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Audit Justification / Market Reason (Mandatory)
                  </label>
                  <input
                    type="text"
                    value={interventionReason}
                    onChange={(e) => setInterventionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-soft)',
                      fontSize: '13px'
                    }}
                    placeholder="e.g. Central bank liquidity support"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowInterventionModal(false)}
                    disabled={isIntervening}
                    style={{
                      background: 'var(--bg-warm)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isIntervening || isUnsafeReduction}
                    style={{
                      background: isUnsafeReduction ? '#9CA3AF' : (interventionAction === 'ADD' ? '#16A34A' : '#DC2626'),
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: (isIntervening || isUnsafeReduction) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isIntervening ? 'Executing...' : (interventionAction === 'ADD' ? 'Authorize Reserve Increase' : 'Authorize Safe Reduction')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Market Pause Modal */}
      {showPauseModal && isStaffOperator && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '17px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏸️</span> Pause Foreign Exchange Market
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: '1.4' }}>
              Temporarily halt all new foreign exchange conversions across SAAMX. Outstanding queue requests remain intact and will continue to drain and settle normally.
            </p>

            <form onSubmit={handlePauseMarket}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Pause Reason (Visible to Teams & Logged in Audit)
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '13px'
                  }}
                  placeholder="e.g. Liquidity adjustment / Central bank rate check"
                  required
                />
                {/* Reason Quick Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {['Liquidity adjustment', 'Rate recalibration', 'Market event', 'Temporary operational halt', 'Reserve intervention'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPauseReason(r)}
                      style={{
                        background: pauseReason === r ? 'var(--navy-900)' : 'var(--bg-warm)',
                        color: pauseReason === r ? '#fff' : 'var(--navy-900)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  disabled={isPausing}
                  style={{
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPausing}
                  style={{
                    background: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: isPausing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPausing ? 'Pausing...' : 'Confirm Market Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Market-Wide Transaction Limit Modal */}
      {showLimitModal && isStaffOperator && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '17px', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> Market-Wide FX Transaction Limit
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: '1.4' }}>
              Configure a global per-transaction cap in INR applied equally to all participant teams. By default, there is NO cap. Enter 0 or leave empty to disable.
            </p>

            <form onSubmit={handleSetLimit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--navy-800)', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Maximum Transaction Value (INR)
                </label>
                <input
                  type="number"
                  value={globalLimitInput}
                  onChange={(e) => setGlobalLimitInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: 'monospace'
                  }}
                  placeholder="e.g. 5000000 (or empty for unrestricted)"
                />
                {/* Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {[
                    { label: '₹25 Lakh', val: '2500000' },
                    { label: '₹50 Lakh', val: '5000000' },
                    { label: '₹1 Crore', val: '10000000' },
                    { label: 'No Limit (Clear)', val: '' }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setGlobalLimitInput(p.val)}
                      style={{
                        background: globalLimitInput === p.val ? 'var(--navy-900)' : 'var(--bg-warm)',
                        color: globalLimitInput === p.val ? '#fff' : 'var(--navy-900)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  disabled={isSettingLimit}
                  style={{
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettingLimit}
                  style={{
                    background: 'var(--navy-900)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: isSettingLimit ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSettingLimit ? 'Applying...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operator Reason Modal for HOLD, REJECT, and RETURN_FOR_CORRECTION */}
      {actionModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{actionModal.action === 'HOLD' ? '⏸️' : actionModal.action === 'RETURN_FOR_CORRECTION' ? '↩️' : '🚫'}</span>
              <span>
                {actionModal.action === 'HOLD' && 'Hold FX Conversion Request'}
                {actionModal.action === 'REJECT' && 'Reject FX Conversion Request'}
                {actionModal.action === 'RETURN_FOR_CORRECTION' && 'Return FX Slip for Correction'}
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '-10px 0 16px' }}>
              {actionModal.action === 'HOLD' && 'Place request on hold. Client funds and desk inventory reservations will remain held.'}
              {actionModal.action === 'REJECT' && 'Reject request. Client funds and desk inventory reservations will be released cleanly (0% leakage).'}
              {actionModal.action === 'RETURN_FOR_CORRECTION' && 'Return request for correction. Client funds and desk reservations will be released cleanly.'}
            </p>

            <form onSubmit={handleConfirmActionModal}>
              <div style={{ marginBottom: '14px', background: 'var(--bg-warm)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px' }}>
                <div><strong>Ticket:</strong> {actionModal.item?.ticketNumber || actionModal.item?.id?.slice(-6)}</div>
                <div><strong>Team:</strong> {actionModal.item?.teamCode}</div>
                <div><strong>Pair:</strong> {actionModal.item?.fromCurrency} ➔ {actionModal.item?.toCurrency}</div>
                <div><strong>Amount:</strong> {actionModal.item?.fromAmount} {actionModal.item?.fromCurrency} ➔ {actionModal.item?.toAmount} {actionModal.item?.toCurrency}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                  Mandatory Justification Reason (min 3 characters) *
                </label>
                <textarea
                  value={actionModal.reason}
                  onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder={
                    actionModal.action === 'HOLD'
                      ? 'e.g. Awaiting KYC document verification or desk compliance review'
                      : actionModal.action === 'RETURN_FOR_CORRECTION'
                      ? 'e.g. Slip amount does not match treasury ledger requisition'
                      : 'e.g. Exceeds single-session foreign currency procurement cap'
                  }
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, action: null, item: null, reason: '' })}
                  style={{
                    background: 'var(--bg-warm)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: actionModal.action === 'HOLD' ? '#f59e0b' : actionModal.action === 'RETURN_FOR_CORRECTION' ? '#ea580c' : '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Confirm {actionModal.action === 'HOLD' ? 'Hold' : actionModal.action === 'RETURN_FOR_CORRECTION' ? 'Return' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DIGITAL FOREX CONVERSION FORM MODAL */}
      {activeFxSlip && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: '12px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <DigitalForexSlip fxItem={activeFxSlip} onClose={() => setActiveFxSlip(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
