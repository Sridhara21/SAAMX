import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseState } from '../hooks/useFirebaseState';
import { apiFetch } from '../lib/api';

export default function CurrencyExchangePage() {
  const { state, connected } = useFirebaseState();
  const [selectedTeam, setSelectedTeam] = useState('T01');
  const [fromCurrency, setFromCurrency] = useState('INR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('500000');
  const [operatorId, setOperatorId] = useState('FX-DESK-01');
  const [notes, setNotes] = useState('Physical order slip request');
  const [simulationDurationSec, setSimulationDurationSec] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [lastTicket, setLastTicket] = useState(null);
  const [queueFilter, setQueueFilter] = useState('ACTIVE'); // 'ACTIVE', 'ALL', 'SETTLED'

  // SEBI Rate Change Modal State
  const [showRateModal, setShowRateModal] = useState(false);
  const [modPair, setModPair] = useState('USDINR');
  const [newMidRate, setNewMidRate] = useState('88.20');
  const [newSpread, setNewSpread] = useState('0.45');
  const [rateChangeReason, setRateChangeReason] = useState('Central bank monetary policy shift');

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
    return {
      USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
      GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
      EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
    };
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
      return fxQueue.filter(q => ['QUEUED', 'RATE_CHECK', 'PROCESSING'].includes(q.status));
    }
    if (queueFilter === 'SETTLED') {
      return fxQueue.filter(q => q.status === 'SETTLED');
    }
    return fxQueue;
  }, [fxQueue, queueFilter]);

  // Wallets of Selected Team
  const teamWallets = useMemo(() => {
    if (!activeTeamObj) return { INR: 0, USD: 0, GBP: 0, EUR: 0 };
    return activeTeamObj.cashWallets || {
      INR: Number(activeTeamObj.cashBalance) || 0,
      USD: 0,
      GBP: 0,
      EUR: 0
    };
  }, [activeTeamObj]);

  // Live Conversion Calculation
  const conversionQuote = useMemo(() => {
    const amount = parseFloat(fromAmount) || 0;
    if (amount <= 0 || fromCurrency === toCurrency) {
      return { toAmount: 0, effectiveRate: 1, spreadPercent: 0, valid: false };
    }

    let effectiveRate = 1.0;
    let toAmount = 0;
    let spreadPercent = 0.45;

    if (fromCurrency === 'INR') {
      const pairKey = `${toCurrency}INR`;
      const fx = fxRates[pairKey] || { buyRate: toCurrency === 'USD' ? 88.60 : toCurrency === 'GBP' ? 119.95 : 103.95, spreadPercent: 0.45 };
      effectiveRate = fx.buyRate;
      spreadPercent = fx.spreadPercent || 0.45;
      toAmount = parseFloat((amount / effectiveRate).toFixed(2));
    } else if (toCurrency === 'INR') {
      const pairKey = `${fromCurrency}INR`;
      const fx = fxRates[pairKey] || { sellRate: fromCurrency === 'USD' ? 87.80 : fromCurrency === 'GBP' ? 118.85 : 103.05, spreadPercent: 0.45 };
      effectiveRate = fx.sellRate;
      spreadPercent = fx.spreadPercent || 0.45;
      toAmount = parseFloat((amount * effectiveRate).toFixed(2));
    } else {
      const fromPair = fxRates[`${fromCurrency}INR`] || { sellRate: 87.80, spreadPercent: 0.45 };
      const toPair = fxRates[`${toCurrency}INR`] || { buyRate: 103.95, spreadPercent: 0.45 };
      const inrVal = amount * fromPair.sellRate;
      toAmount = parseFloat((inrVal / toPair.buyRate).toFixed(2));
      effectiveRate = parseFloat((fromPair.sellRate / toPair.buyRate).toFixed(4));
      spreadPercent = Math.max(fromPair.spreadPercent || 0.45, toPair.spreadPercent || 0.45);
    }

    const available = Number(teamWallets[fromCurrency] || 0);
    const hasSufficient = available >= amount;

    return {
      toAmount,
      effectiveRate,
      spreadPercent,
      hasSufficient,
      available,
      valid: hasSufficient && amount > 0
    };
  }, [fromAmount, fromCurrency, toCurrency, fxRates, teamWallets]);

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
  const handleQueueAction = async (requestId, action, payload = {}) => {
    try {
      const res = await apiFetch('/api/fx/queue-action', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
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

  const currencySymbols = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };

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
              Full FX Workflow: FX REQUEST ➔ QUEUED ➔ RATE CHECK ➔ PROCESSING ➔ SETTLED (INR, USD, GBP, EUR)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sim Clearance:</span>
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
                <option value={0}>Instant (0s)</option>
                <option value={5}>5 Seconds</option>
                <option value={15}>15 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
              </select>
            </div>

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

                {/* Team Multi-Currency Balances */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: 'var(--bg-warm)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>INR:</span>{' '}
                    <strong style={{ color: 'var(--navy-900)' }}>₹{Number(teamWallets.INR || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>USD:</span>{' '}
                    <strong style={{ color: 'var(--navy-900)' }}>${Number(teamWallets.USD || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>GBP:</span>{' '}
                    <strong style={{ color: 'var(--navy-900)' }}>£{Number(teamWallets.GBP || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>EUR:</span>{' '}
                    <strong style={{ color: 'var(--navy-900)' }}>€{Number(teamWallets.EUR || 0).toLocaleString()}</strong>
                  </div>
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
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
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
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
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
                    Max: {currencySymbols[fromCurrency]}{Number(teamWallets[fromCurrency] || 0).toLocaleString()}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Spot Rate:</span>
                  <strong>
                    {fromCurrency === 'INR'
                      ? `1 ${toCurrency} = ₹${conversionQuote.effectiveRate.toFixed(2)}`
                      : toCurrency === 'INR'
                      ? `1 ${fromCurrency} = ₹${conversionQuote.effectiveRate.toFixed(2)}`
                      : `Rate: ${conversionQuote.effectiveRate.toFixed(4)}`}
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
                  disabled={!conversionQuote.valid || isSubmitting}
                  style={{
                    width: '100%',
                    background: conversionQuote.valid ? 'var(--navy-900)' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: conversionQuote.valid ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : `➔ Submit to FX Queue (Sim Duration: ${simulationDurationSec}s)`}
                </button>

                <button
                  type="button"
                  onClick={handleInstantExecution}
                  disabled={!conversionQuote.valid || isSubmitting}
                  style={{
                    width: '100%',
                    background: conversionQuote.valid ? 'var(--gold-royal)' : '#e5e7eb',
                    color: conversionQuote.valid ? '#fff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: conversionQuote.valid ? 'pointer' : 'not-allowed'
                  }}
                >
                  ⚡ Direct Clearance (Instant Spot Execution)
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
                          QUEUED: '#d97706',
                          RATE_CHECK: '#2563eb',
                          PROCESSING: '#7c3aed',
                          SETTLED: '#059669',
                          REJECTED: '#dc2626'
                        };

                        const isProcessing = item.status === 'PROCESSING';
                        const clearsAt = item.clearsAt || 0;
                        const isTimeElapsed = clearsAt > 0 && Date.now() >= clearsAt;

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
                              {isProcessing && clearsAt > 0 && (
                                <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px', fontWeight: '600' }}>
                                  {isTimeElapsed ? 'Ready to settle' : `Clearing...`}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                {item.status === 'QUEUED' && (
                                  <button
                                    onClick={() => handleQueueAction(item.id, 'RATE_CHECK', {
                                      rate: conversionQuote.effectiveRate,
                                      spread: conversionQuote.spreadPercent
                                    })}
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
                                    1. Rate Check
                                  </button>
                                )}

                                {item.status === 'RATE_CHECK' && (
                                  <button
                                    onClick={() => handleQueueAction(item.id, 'PROCESS', {
                                      durationSec: simulationDurationSec
                                    })}
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
                                    2. Start Clearance
                                  </button>
                                )}

                                {item.status === 'PROCESSING' && (
                                  <button
                                    onClick={() => handleQueueAction(item.id, 'SETTLE')}
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
                                    3. Settle Trade
                                  </button>
                                )}

                                {item.status !== 'SETTLED' && item.status !== 'REJECTED' && (
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Enter rejection reason:');
                                      if (reason) handleQueueAction(item.id, 'REJECT', { reason });
                                    }}
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
                                )}

                                {item.status === 'SETTLED' && (
                                  <span style={{ fontSize: '11px', color: 'var(--green-emerald)', fontWeight: '700' }}>
                                    ✓ Cleared
                                  </span>
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
                            {tx.ticketNumber || tx.id}
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
      {showRateModal && (
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
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--navy-800)', marginBottom: '4px' }}>
                    New Mid Spot Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
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
    </div>
  );
}
