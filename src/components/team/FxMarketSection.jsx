import React, { useState, useMemo } from 'react';
import { apiFetch } from '../../lib/api.js';
import { Card, Badge, Button, Alert } from '../ui/index.js';
import {
  IconCurrencyExchange,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconFileText,
  IconArrowRight,
  IconRefreshCw
} from '../../lib/icons.jsx';
import {
  CURRENCY_DIRECTORY,
  CURRENCY_SYMBOLS,
  DEFAULT_FX_RATES,
  ACTIVE_FOREIGN_CURRENCIES,
  formatCurrency,
  roundCurrency
} from '../../lib/formatters.js';
import { DigitalForexSlip } from '../DigitalForms.jsx';

export default function FxMarketSection({ state, teamCode, onOpenProfile }) {
  const [direction, setDirection] = useState('BUY'); // 'BUY' = Pay INR, Receive Foreign | 'SELL' = Pay Foreign, Receive INR
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [amountInput, setAmountInput] = useState('100000');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeSlipItem, setActiveSlipItem] = useState(null);

  // Authoritative team record
  const team = useMemo(() => {
    const list = state?.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
    return list.find(t => (t.teamCode || '').toUpperCase() === (teamCode || 'T02').toUpperCase() || (t.id || '').toUpperCase() === (teamCode || 'T02').toUpperCase()) || list[0];
  }, [state?.teams, teamCode]);

  // Market status & rates
  const fxMarketState = state?.fxMarketState || { status: 'ACTIVE' };
  const isMarketPaused = fxMarketState.status === 'PAUSED';

  const fxRates = useMemo(() => {
    return state?.fxRates || DEFAULT_FX_RATES;
  }, [state?.fxRates]);

  // Tradable currencies list (active non-INR currencies)
  const tradableCurrencies = useMemo(() => {
    return ACTIVE_FOREIGN_CURRENCIES.map(code => CURRENCY_DIRECTORY[code] || { code, name: code, symbol: code });
  }, []);

  // Team wallets
  const teamWallets = useMemo(() => {
    if (!team) return { INR: 10000000 };
    return team.cashWallets || {
      INR: Number(team.cashBalance) || 10000000
    };
  }, [team]);

  const teamReserved = useMemo(() => {
    return team?.reservedCash || {};
  }, [team]);

  // Active Desk Queues
  const fxDesks = useMemo(() => {
    const desks = state?.fxDesks || { FX_1: { status: 'ACTIVE' }, FX_2: { status: 'ACTIVE' } };
    return Object.entries(desks).map(([id, d]) => ({
      id,
      name: id === 'FX_1' ? 'FX Desk 1' : 'FX Desk 2',
      status: d.status || 'ACTIVE'
    }));
  }, [state?.fxDesks]);

  // Live Conversion Quote
  const quote = useMemo(() => {
    const fromCur = direction === 'BUY' ? 'INR' : selectedCurrency;
    const toCur = direction === 'BUY' ? selectedCurrency : 'INR';
    const rawAmt = parseFloat(amountInput) || 0;

    const pairKey = `${selectedCurrency}INR`;
    const pairData = fxRates[pairKey] || DEFAULT_FX_RATES[pairKey] || { midRate: 88.20, spreadPercent: 0.45 };
    const midRate = Number(pairData.midRate) || 88.20;
    const spreadPct = Number(pairData.spreadPercent !== undefined ? pairData.spreadPercent : 0.45);
    const halfSpread = (spreadPct / 100) / 2;

    let effectiveRate = midRate;
    let toAmount = 0;

    if (direction === 'BUY') {
      // Team pays INR to buy Foreign Currency
      // Exchange sells FX at Ask: midRate * (1 + halfSpread)
      const askRate = midRate * (1 + halfSpread);
      effectiveRate = parseFloat(askRate.toFixed(4));
      toAmount = effectiveRate > 0 ? parseFloat((rawAmt / effectiveRate).toFixed(2)) : 0;
    } else {
      // Team sells Foreign Currency to receive INR
      // Exchange buys FX at Bid: midRate * (1 - halfSpread)
      const bidRate = midRate * (1 - halfSpread);
      effectiveRate = parseFloat(bidRate.toFixed(4));
      toAmount = parseFloat((rawAmt * effectiveRate).toFixed(2));
    }

    const availableBal = Number(teamWallets[fromCur] || 0);
    const reservedBal = Number(teamReserved[fromCur] || 0);
    const unreservedBal = Math.max(0, availableBal - reservedBal);
    const hasSufficient = unreservedBal >= rawAmt && rawAmt > 0;

    return {
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: rawAmt,
      toAmount,
      midRate,
      effectiveRate,
      spreadPercent: spreadPct,
      availableBal,
      unreservedBal,
      hasSufficient,
      valid: hasSufficient && rawAmt > 0 && !isMarketPaused
    };
  }, [direction, selectedCurrency, amountInput, fxRates, teamWallets, teamReserved, isMarketPaused]);

  // Handle FX Request Submission
  const handleSubmitRequest = async (e) => {
    if (e) e.preventDefault();
    if (!quote.valid || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await apiFetch('/api/fx/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode: team.teamCode || teamCode,
          fromCurrency: quote.fromCurrency,
          toCurrency: quote.toCurrency,
          fromAmount: quote.fromAmount,
          notes: notes || `Team ${team.teamCode || teamCode} FX Conversion Request`,
          operatorId: 'TEAM_TERMINAL'
        })
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        const item = res.request || res;
        const ticketNum = item.ticketNumber || item.id || `FX-${Date.now().toString().slice(-4)}`;

        const slipData = {
          fcfNumber: ticketNum,
          teamCode: team.teamCode || teamCode,
          teamName: team.teamName || team.name || `Investment House ${team.teamCode || teamCode}`,
          fromCurrency: quote.fromCurrency,
          toCurrency: quote.toCurrency,
          fromAmount: quote.fromAmount,
          toAmount: quote.toAmount,
          rate: quote.effectiveRate,
          representative: notes || `Authorized Trader (${team.teamCode || teamCode})`,
          createdAt: Date.now(),
          status: 'QUEUED'
        };

        setActiveSlipItem(slipData);
        setStatusMessage({
          type: 'success',
          text: `✓ FX CONVERSION TICKET SUBMITTED: #${ticketNum}. Queued for physical desk verification.`
        });
        setNotes('');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Network failure while submitting FX request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Team's submitted FX requests from state
  const teamFxRequests = useMemo(() => {
    const queue = state?.fxQueue ? (Array.isArray(state.fxQueue) ? state.fxQueue : Object.values(state.fxQueue)) : [];
    const tCode = (team?.teamCode || teamCode || '').toUpperCase();
    return queue
      .filter(item => (item.teamCode || '').toUpperCase() === tCode)
      .reverse();
  }, [state?.fxQueue, team, teamCode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. Header Banner & Market Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--color-surface, #FFFFFF)',
        border: '1.5px solid var(--color-border, #E2DBD0)',
        borderRadius: '12px',
        padding: '16px 20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-brass, #845508) 0%, #B27A1B 100%)',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(132, 85, 8, 0.2)'
          }}>
            <IconCurrencyExchange size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-ink, #1E232B)' }}>
                Foreign Exchange (FX) Currency Market
              </h2>
              <Badge variant={isMarketPaused ? 'danger' : 'success'} style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                {isMarketPaused ? 'FX MARKET PAUSED' : 'FX MARKET ACTIVE'}
              </Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--color-ink-muted, #6B6863)' }}>
              Official SAAMX Multi-Currency Clearing Desk &bull; 9 Tradable Sovereign Currencies &bull; Dynamic Spread Matching
            </p>
          </div>
        </div>

        {/* Desk Status Indicators */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {fxDesks.map(d => (
            <div key={d.id} style={{
              background: 'var(--color-surface-sunken, #FAF8F3)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: d.status === 'ACTIVE' ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)'
              }} />
              <strong style={{ color: 'var(--color-ink, #1E232B)' }}>{d.name}:</strong>
              <span style={{ color: d.status === 'ACTIVE' ? 'var(--color-rise, #065F3E)' : 'var(--color-fall, #931913)', fontWeight: 800 }}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Paused Alert Warning */}
      {isMarketPaused && (
        <Alert variant="warning" title="FX Market Halted" icon={<IconAlertTriangle size={20} />}>
          {fxMarketState.pausedReason || 'The Foreign Exchange Desk is temporarily paused for central bank reserve adjustments. New currency exchange requests cannot be submitted at this time.'}
        </Alert>
      )}

      {/* Status Notification Message */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'danger' : 'success'}
          title={statusMessage.type === 'error' ? 'FX Request Declined' : 'FX Request Cleared'}
        >
          {statusMessage.text}
        </Alert>
      )}

      {/* 2. Main Workstation Grid: Rates Board & Conversion Terminal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>

        {/* Left: Live Currency Exchange Rates Board */}
        <Card variant="elevated" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
              🏛️ Official Sovereign Exchange Rates
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #6B6863)', fontWeight: 700 }}>
              BASE: INR (₹)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border, #E2DBD0)', textAlign: 'left', color: 'var(--color-ink-muted, #6B6863)' }}>
                  <th style={{ padding: '8px 6px', fontWeight: 800 }}>CURRENCY</th>
                  <th style={{ padding: '8px 6px', fontWeight: 800, textAlign: 'right' }}>MID RATE</th>
                  <th style={{ padding: '8px 6px', fontWeight: 800, textAlign: 'right' }}>WE BUY (BID)</th>
                  <th style={{ padding: '8px 6px', fontWeight: 800, textAlign: 'right' }}>WE SELL (ASK)</th>
                  <th style={{ padding: '8px 6px', fontWeight: 800, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {tradableCurrencies.map(c => {
                  const pairKey = `${c.code}INR`;
                  const pData = fxRates[pairKey] || DEFAULT_FX_RATES[pairKey] || { midRate: 88.20, spreadPercent: 0.45 };
                  const mid = Number(pData.midRate) || 88.20;
                  const spread = Number(pData.spreadPercent !== undefined ? pData.spreadPercent : 0.45);
                  const half = (spread / 100) / 2;
                  const bid = mid * (1 - half);
                  const ask = mid * (1 + half);
                  const isSelected = selectedCurrency === c.code;

                  return (
                    <tr
                      key={c.code}
                      onClick={() => setSelectedCurrency(c.code)}
                      style={{
                        borderBottom: '1px solid var(--color-border, #E2DBD0)',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(132, 85, 8, 0.08)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--color-brass, #845508)',
                            fontSize: '0.9rem'
                          }}>
                            {c.code}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted, #6B6863)' }}>
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 800 }}>
                        ₹{mid.toFixed(2)}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--color-rise, #065F3E)', fontWeight: 700 }}>
                        ₹{bid.toFixed(2)}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--color-fall, #931913)', fontWeight: 700 }}>
                        ₹{ask.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-xs"
                          style={{
                            background: isSelected ? 'var(--color-brass, #845508)' : 'transparent',
                            color: isSelected ? '#FFFFFF' : 'var(--color-brass, #845508)',
                            border: '1px solid var(--color-brass, #845508)',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            borderRadius: '4px'
                          }}
                        >
                          {isSelected ? 'SELECTED' : 'TRADE'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Team Currency Holdings Summary */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1.5px solid var(--color-border, #E2DBD0)' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-ink-muted, #6B6863)', textTransform: 'uppercase' }}>
              Your House Currency Wallets
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '10px' }}>
              <div style={{ background: 'var(--color-surface-sunken, #FAF8F3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border, #E2DBD0)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted, #6B6863)', fontWeight: 700 }}>INR Cash</span>
                <strong className="font-mono tabular-nums" style={{ display: 'block', fontSize: '0.92rem', color: 'var(--color-ink, #1E232B)' }}>
                  ₹{Number(teamWallets.INR || 0).toLocaleString('en-IN')}
                </strong>
              </div>
              {tradableCurrencies.map(c => {
                const bal = Number(teamWallets[c.code] || 0);
                if (bal === 0 && selectedCurrency !== c.code) return null;
                return (
                  <div key={c.code} style={{
                    background: selectedCurrency === c.code ? 'rgba(132, 85, 8, 0.08)' : 'var(--color-surface-sunken, #FAF8F3)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${selectedCurrency === c.code ? 'var(--color-brass, #845508)' : 'var(--color-border, #E2DBD0)'}`
                  }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted, #6B6863)', fontWeight: 700 }}>{c.code} ({c.symbol})</span>
                    <strong className="font-mono tabular-nums" style={{ display: 'block', fontSize: '0.92rem', color: bal > 0 ? 'var(--color-rise, #065F3E)' : 'var(--color-ink, #1E232B)' }}>
                      {c.symbol}{bal.toLocaleString()}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Right: Forex Conversion Request Order Ticket */}
        <Card variant="elevated" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
              ⚡ Submit Forex Conversion Request
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'var(--color-surface-sunken, #FAF8F3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-border, #E2DBD0)', fontWeight: 700 }}>
              FCF SLIP
            </span>
          </div>

          {/* Direction Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setDirection('BUY')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: direction === 'BUY' ? '2px solid var(--color-rise, #065F3E)' : '1px solid var(--color-border, #E2DBD0)',
                background: direction === 'BUY' ? 'rgba(6, 95, 62, 0.08)' : 'var(--color-surface, #FFFFFF)',
                color: direction === 'BUY' ? 'var(--color-rise, #065F3E)' : 'var(--color-ink, #1E232B)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🟢 BUY {selectedCurrency} (Pay INR)
            </button>
            <button
              type="button"
              onClick={() => setDirection('SELL')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: direction === 'SELL' ? '2px solid var(--color-brass, #845508)' : '1px solid var(--color-border, #E2DBD0)',
                background: direction === 'SELL' ? 'rgba(132, 85, 8, 0.08)' : 'var(--color-surface, #FFFFFF)',
                color: direction === 'SELL' ? 'var(--color-brass, #845508)' : 'var(--color-ink, #1E232B)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🔁 SELL {selectedCurrency} (Get INR)
            </button>
          </div>

          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Currency Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-ink, #1E232B)' }}>
                Foreign Currency Target
              </label>
              <select
                className="input-field"
                value={selectedCurrency}
                onChange={e => setSelectedCurrency(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem', borderRadius: '6px' }}
              >
                {tradableCurrencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
                  Amount to Pay ({quote.fromCurrency})
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted, #6B6863)' }}>
                  Unreserved Avail: <strong className="font-mono">{quote.fromCurrency === 'INR' ? '₹' : ''}{quote.unreservedBal.toLocaleString()}</strong>
                </span>
              </div>
              <input
                type="number"
                min="1"
                step="any"
                className="input-field"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                placeholder="Enter conversion amount..."
                style={{ width: '100%', padding: '8px 12px', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', borderRadius: '6px' }}
              />

              {/* Quick Percentage Chips */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[0.25, 0.50, 0.75, 1.0].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const calculated = Math.floor(quote.unreservedBal * pct);
                      setAmountInput(String(calculated));
                    }}
                    style={{
                      flex: 1,
                      padding: '3px 0',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      background: 'var(--color-surface-sunken, #FAF8F3)',
                      border: '1px solid var(--color-border, #E2DBD0)',
                      cursor: 'pointer'
                    }}
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Live Quote Breakdown Card */}
            <div style={{
              background: 'var(--color-surface-sunken, #FAF8F3)',
              border: '1px solid var(--color-border, #E2DBD0)',
              borderRadius: '8px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-ink-muted, #6B6863)' }}>Effective Rate:</span>
                <span className="font-mono tabular-nums" style={{ fontWeight: 800 }}>
                  1 {selectedCurrency} = ₹{quote.effectiveRate.toFixed(4)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-ink-muted, #6B6863)' }}>Spread Factor:</span>
                <span style={{ color: 'var(--color-brass, #845508)', fontWeight: 700 }}>
                  {quote.spreadPercent.toFixed(2)}% Clearing Buffer
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '8px',
                borderTop: '1px dashed var(--color-border, #E2DBD0)'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
                  You Will Receive:
                </span>
                <span className="font-mono tabular-nums" style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--color-rise, #065F3E)'
                }}>
                  {quote.toCurrency === 'INR' ? '₹' : (CURRENCY_SYMBOLS[quote.toCurrency] || '')}
                  {quote.toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quote.toCurrency}
                </span>
              </div>
            </div>

            {/* Notes / Authorized Representative */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-ink, #1E232B)' }}>
                Authorized Delegate / Notes
              </label>
              <input
                type="text"
                className="input-field"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={`Trader representative for ${team.teamCode || teamCode}...`}
                style={{ width: '100%', padding: '6px 10px', fontSize: '0.82rem', borderRadius: '6px' }}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!quote.valid || isSubmitting || isMarketPaused}
              style={{ width: '100%', fontWeight: 900, marginTop: '4px' }}
            >
              {isSubmitting ? 'Routing to FX Desk...' : isMarketPaused ? 'FX Market Halted' : !quote.hasSufficient ? 'Insufficient Unreserved Cash' : '⚡ Submit Forex Conversion Slip'}
            </Button>
          </form>
        </Card>
      </div>

      {/* 3. Team FX Request Queue & Order History */}
      <Card variant="elevated" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink, #1E232B)' }}>
              📋 Your House Forex Conversion Tickets & Queue
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted, #6B6863)' }}>
              Real-time audit record of currency conversions and desk verification status.
            </span>
          </div>
          <Badge variant="outline">
            {teamFxRequests.length} Total Requests
          </Badge>
        </div>

        {teamFxRequests.length === 0 ? (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            color: 'var(--color-ink-muted, #6B6863)',
            background: 'var(--color-surface-sunken, #FAF8F3)',
            borderRadius: '8px',
            border: '1px dashed var(--color-border, #E2DBD0)'
          }}>
            <IconCurrencyExchange size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No Currency Conversion Tickets Submitted Yet</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              Submit a conversion request above to exchange currencies at the official SAAMX desk.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border, #E2DBD0)', textAlign: 'left', color: 'var(--color-ink-muted, #6B6863)' }}>
                  <th style={{ padding: '8px 8px', fontWeight: 800 }}>TICKET #</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800 }}>CONVERSION PAIR</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'right' }}>PAID (FROM)</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'right' }}>RECEIVED (TO)</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>RATE</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>DESK</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>DIGITAL SLIP</th>
                </tr>
              </thead>
              <tbody>
                {teamFxRequests.map(item => {
                  const ticket = item.ticketNumber || item.id;
                  const isSettled = item.status === 'SETTLED' || item.status === 'settled';
                  const isRejected = item.status === 'REJECTED' || item.status === 'rejected';

                  return (
                    <tr key={ticket} style={{ borderBottom: '1px solid var(--color-border, #E2DBD0)' }}>
                      <td className="font-mono" style={{ padding: '10px 8px', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>
                        #{ticket}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <strong style={{ color: 'var(--color-ink, #1E232B)' }}>
                          {item.fromCurrency} &rarr; {item.toCurrency}
                        </strong>
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(item.fromAmount || 0).toLocaleString()} {item.fromCurrency}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-rise, #065F3E)' }}>
                        {Number(item.estimatedToAmount || item.toAmount || item.receivedAmount || 0).toLocaleString()} {item.toCurrency}
                      </td>
                      <td className="font-mono tabular-nums" style={{ padding: '10px 8px', textAlign: 'center', fontSize: '0.8rem' }}>
                        {item.effectiveRate || item.rate || 'Market'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-ink-muted, #6B6863)' }}>
                        {item.deskId || 'FX_1'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <Badge variant={isSettled ? 'success' : isRejected ? 'danger' : 'warning'} style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                          {item.status || 'QUEUED'}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setActiveSlipItem({
                              fcfNumber: ticket,
                              teamCode: item.teamCode || team.teamCode || teamCode,
                              teamName: team.teamName || `House ${item.teamCode || teamCode}`,
                              fromCurrency: item.fromCurrency,
                              toCurrency: item.toCurrency,
                              fromAmount: item.fromAmount,
                              toAmount: item.estimatedToAmount || item.toAmount,
                              rate: item.effectiveRate || item.rate,
                              representative: item.notes || `Representative (${item.teamCode || teamCode})`,
                              createdAt: item.createdAt || item.timestamp,
                              status: item.status
                            });
                          }}
                          style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconFileText size={13} /> View Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Digital Forex Conversion Slip Modal */}
      {activeSlipItem && (
        <DigitalForexSlip
          fxItem={activeSlipItem}
          onClose={() => setActiveSlipItem(null)}
        />
      )}

    </div>
  );
}
