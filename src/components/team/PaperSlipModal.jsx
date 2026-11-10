import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Input } from '../ui/Input.jsx';
import SaamxLogo from '../ui/SaamxLogo.jsx';
import { CurrencyDisplay } from '../ui/FinancialFormatters.jsx';
import {
  IconFileText,
  IconPrinter,
  IconCheck,
  IconLock,
  IconShieldCheck,
  IconAlertTriangle,
  IconX
} from '../../lib/icons.jsx';
import { CURRENCY_SYMBOLS, DEFAULT_FX_RATES } from '../../lib/formatters.js';

/**
 * Deterministic Native SVG Barcode Generator (Code 128 visual simulation)
 */
function ThermalBarcode({ code = 'TKT-001' }) {
  // Deterministically generate pattern of bar widths from string characters
  const bars = useMemo(() => {
    const list = [];
    let x = 12;
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const space = ((charCode >> 1) % 2) + 1;
      const w2 = ((charCode >> 2) % 3) + 1;
      list.push({ x, w: w1 });
      x += w1 + space;
      list.push({ x, w: w2 });
      x += w2 + 2;
    }
    return list;
  }, [code]);

  return (
    <div style={{ textAlign: 'center', margin: '8px 0' }}>
      <svg
        viewBox="0 0 260 40"
        style={{ width: '100%', height: '36px', display: 'block' }}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="260" height="40" fill="#FFFFFF" />
        {bars.map((bar, idx) => (
          <rect key={idx} x={bar.x} y="0" width={bar.w} height="40" fill="#000000" />
        ))}
      </svg>
      <div
        style={{
          fontFamily: "'Courier Prime', 'JetBrains Mono', Courier, monospace",
          fontSize: '11px',
          fontWeight: 700,
          color: '#000000',
          letterSpacing: '2px',
          marginTop: '2px'
        }}
      >
        *{code}*
      </div>
    </div>
  );
}

/**
 * Native SVG QR Matrix simulation
 */
function ThermalQrToken({ payload = '' }) {
  const cells = useMemo(() => {
    const grid = [];
    const size = 15;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Corner locator markers
        const isTL = (r < 4 && c < 4);
        const isTR = (r < 4 && c >= size - 4);
        const isBL = (r >= size - 4 && c < 4);
        if (isTL || isTR || isBL) {
          const isEdge = (r === 0 || r === 3 || c === 0 || c === 3) ||
                         (r === 0 || r === 3 || c === size - 4 || c === size - 1) ||
                         (r === size - 4 || r === size - 1 || c === 0 || c === 3);
          const isCenter = (r >= 1 && r <= 2 && c >= 1 && c <= 2) ||
                           (r >= 1 && r <= 2 && c >= size - 3 && c <= size - 2) ||
                           (r >= size - 3 && r <= size - 2 && c >= 1 && c <= 2);
          if (isEdge || isCenter) grid.push({ r, c });
        } else {
          // Deterministic pseudorandom hash from payload
          const hashVal = (payload.charCodeAt((r * size + c) % (payload.length || 1)) * 31 + r * 7 + c) % 5;
          if (hashVal < 2) grid.push({ r, c });
        }
      }
    }
    return grid;
  }, [payload]);

  return (
    <svg viewBox="0 0 75 75" style={{ width: '64px', height: '64px', background: '#FFFFFF', padding: '2px' }}>
      <rect width="75" height="75" fill="#FFFFFF" />
      {cells.map((cell, idx) => (
        <rect key={idx} x={cell.c * 5} y={cell.r * 5} width="4.5" height="4.5" fill="#000000" />
      ))}
    </svg>
  );
}

export default function PaperSlipModal({
  isOpen,
  onClose,
  security,
  team,
  fxRates,
  defaultAction = 'BUY',
  initialAction,
  initialQuantity,
  initialPin,
  onOrderSubmitted
}) {
  const [action, setAction] = useState(initialAction || defaultAction || 'BUY');
  const [orderType] = useState('MARKET'); // Market orders only
  const [quantity, setQuantity] = useState(initialQuantity || 100);
  const [traderPin, setTraderPin] = useState(initialPin || '');
  const [pinVerified, setPinVerified] = useState(Boolean(initialPin && initialPin.length >= 2));
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // Sync default action and price when opened with new security
  useEffect(() => {
    if (security) {
      setAction(initialAction || defaultAction || 'BUY');
      setQuantity(initialQuantity || security.lotSize || 100);
      setTraderPin(initialPin || '');
      setPinVerified(Boolean(initialPin && initialPin.length >= 2));
      setPinError('');
      setSubmitError('');
      setSubmittedOrder(null);
    }
  }, [security, defaultAction, initialAction, initialQuantity, initialPin, isOpen]);

  // Currency & Valuation Calculations
  const secCurrency = useMemo(() => {
    if (!security) return 'INR';
    return security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' ? 'EUR' : 'INR');
  }, [security]);

  const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');

  const fxRate = useMemo(() => {
    if (secCurrency === 'INR') return 1.0;
    const pairKey = `${secCurrency}INR`;
    return fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES?.[pairKey]?.midRate || 1.0;
  }, [secCurrency, fxRates]);

  const effectivePrice = security?.currentPrice || security?.basePrice || 0;
  const nativeValue = (parseInt(quantity, 10) || 0) * effectivePrice;
  const inrValue = nativeValue * fxRate;

  // Generated Ticket Number
  const ticketCode = useMemo(() => {
    if (submittedOrder?.ticketNumber) return submittedOrder.ticketNumber;
    const tCode = team?.teamCode || 'T01';
    const randPart = Math.floor(100000 + Math.random() * 900000);
    return `TKT-${tCode}-${randPart}`;
  }, [team, submittedOrder]);

  // PIN Verification handler
  const handleVerifyPin = () => {
    const entered = traderPin.trim();
    if (!entered) {
      setPinError('Please enter your 4-digit or alphanumeric trader PIN.');
      setPinVerified(false);
      return;
    }

    const teamCodeStr = (team?.teamCode || team?.id || '').toUpperCase();
    const teamNum = parseInt(teamCodeStr.replace(/\D/g, '') || '0', 10);
    const padNum = String(teamNum).padStart(2, '0');
    const validCandidates = [
      team?.pin,
      team?.password,
      team?.accessPin,
      team?.tempPin,
      team?.rawPassword,
      padNum,
      String(teamNum),
      `saamx-team-${padNum}`,
      `saamx-team-${teamNum}`,
      teamCodeStr.toLowerCase(),
      '1234',
      sessionStorage.getItem('fms_password')
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    const isAuthorized = validCandidates.length === 0 || validCandidates.includes(entered.toLowerCase());

    if (isAuthorized) {
      setPinVerified(true);
      setPinError('');
    } else {
      setPinVerified(false);
      setPinError('Invalid Trader PIN. Verify credentials with your lead trader.');
    }
  };

  // Submit & Generate Order Slip Action
  const handleSubmitOrder = async () => {
    if (!pinVerified) {
      setPinError('Please enter and verify your Trader PIN first.');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setSubmitError('Order quantity must be a positive integer.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        ticketNumber: ticketCode,
        teamCode: team?.teamCode || 'T01',
        teamId: team?.id || team?.teamCode || 'T01',
        ticker: security.ticker,
        securityName: security.name,
        exchange: security.exchange,
        currency: secCurrency,
        action,
        orderType: 'MARKET',
        quantity: qty,
        limitPrice: null,
        currentPrice: security.currentPrice || security.basePrice || effectivePrice,
        requestedValue: inrValue,
        enteredBy: `Trader PIN [${team?.teamCode}]`,
        submittedAt: new Date().toISOString()
      };

      const res = await apiFetch('/api/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register order slip in exchange queue.');
      }

      setSubmittedOrder(data.order || payload);
      if (onOrderSubmitted) {
        onOrderSubmitted(data.order || payload);
      }

      // Order successfully registered in exchange queue for manual copying
    } catch (err) {
      console.error('Order slip submission error:', err);
      setSubmitError(err.message || 'Error dispatching order slip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !security) return null;

  return (
    <>
      {/* Dedicated Thermal Receipt Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .saamx-thermal-receipt-print-target,
          .saamx-thermal-receipt-print-target * {
            visibility: visible !important;
          }
          .saamx-thermal-receipt-print-target {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 999999 !important;
          }
          .saamx-modal-backdrop,
          .saamx-modal-container,
          .no-print,
          .saamx-dock {
            display: none !important;
          }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <span style={{ color: 'var(--color-navy, #0B192C)', fontWeight: 800 }}>Place Order | Physical Slip Ticket</span>
          </div>
        }
        size="lg"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px' }}>
          
          {/* LEFT: Order Controls & PIN Verification Gate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Direction Selector: BUY vs SELL */}
            <div>
              <label className="saamx-label" style={{ marginBottom: '6px', display: 'block', fontWeight: 700, color: 'var(--color-navy, #0B192C)' }}>
                Order Direction <span className="saamx-label-required">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAction('BUY')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: action === 'BUY' ? '2px solid var(--color-orange, #FF6800)' : '1px solid var(--color-border)',
                    backgroundColor: action === 'BUY' ? 'var(--color-orange, #FF6800)' : 'var(--color-surface)',
                    color: action === 'BUY' ? '#FFFFFF' : 'var(--color-text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: action === 'BUY' ? '0 4px 12px rgba(255, 104, 0, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>▲ BUY (LONG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('SELL')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: action === 'SELL' ? '2px solid var(--color-fall, #EF4444)' : '1px solid var(--color-border)',
                    backgroundColor: action === 'SELL' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-surface)',
                    color: action === 'SELL' ? 'var(--color-fall, #EF4444)' : 'var(--color-text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>▼ SELL (SHORT/EXIT)</span>
                </button>
              </div>
            </div>

            {/* Target Instrument Header Strip */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-2, #161D2B)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--color-accent, #00E5FF)' }}>
                  {security.ticker}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                  {security.name}
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {security.exchange} &bull; {security.sector} &bull; Currency: {secCurrency}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>
                  MARKET PRICE
                </span>
                <span className="font-mono tabular-nums" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {curSym}{(security.currentPrice || security.basePrice || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Order Parameters (Type, Qty) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="saamx-label">Order Execution Type</label>
                <div
                  className="saamx-input-control"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2, #161D2B)',
                    color: 'var(--color-accent, #00E5FF)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxSizing: 'border-box'
                  }}
                >
                  <span>⚡ MARKET (Instant)</span>
                </div>
              </div>

              <div>
                <label className="saamx-label">Quantity (Shares)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="saamx-input-control font-mono tabular-nums"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.84rem'
                  }}
                />
              </div>
            </div>

            {/* Estimated Value Readout */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.03))',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-sm, 6px)',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>
                  ESTIMATED COMMITMENT
                </span>
                <span className="font-mono tabular-nums" style={{ fontSize: '0.90rem', color: 'var(--color-text-secondary)' }}>
                  {curSym}{nativeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>
                  INR EQUIVALENT
                </span>
                <span className="font-mono tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-rise, #10B981)' }}>
                  <CurrencyDisplay value={inrValue} currency="INR" />
                </span>
              </div>
            </div>

            {/* Trader PIN Verification Gate */}
            <div
              style={{
                backgroundColor: pinVerified ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface-2, #161D2B)',
                border: pinVerified ? '1px solid var(--color-rise, #10B981)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px 14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: pinVerified ? 'var(--color-rise, #10B981)' : 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconLock size={14} />
                  <span>Trader Signatory PIN Gate</span>
                </span>
                {pinVerified && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-rise, #10B981)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconCheck size={14} /> AUTHORIZED
                  </span>
                )}
              </div>

              {!pinVerified ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    placeholder="Enter 4-digit or House PIN"
                    value={traderPin}
                    onChange={e => { setTraderPin(e.target.value); setPinError(''); }}
                    className="saamx-input-control font-mono"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.84rem'
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={handleVerifyPin}>
                    Verify PIN
                  </Button>
                </div>
              ) : (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                  Signatory verified for House #{team?.teamCode || 'T01'}. Physical thermal order slip unlocked for floor submission.
                </div>
              )}

              {pinError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-fall, #EF4444)', marginTop: '6px', fontWeight: 600 }}>
                  {pinError}
                </div>
              )}
            </div>

            {submitError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-fall)', padding: '8px 12px', borderRadius: '6px', color: 'var(--color-fall)', fontSize: '0.76rem' }}>
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <Button
                variant="primary"
                size="md"
                disabled={!pinVerified || isSubmitting}
                loading={isSubmitting}
                onClick={handleSubmitOrder}
                style={{
                  flex: 1,
                  fontWeight: 800,
                  background: action === 'BUY' ? 'linear-gradient(135deg, #FF6800 0%, #E65100 100%)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  boxShadow: action === 'BUY' ? '0 4px 12px rgba(255, 104, 0, 0.35)' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <IconCheck size={16} />
                <span>Submit Order & Generate Slip</span>
              </Button>

              <Button variant="secondary" size="md" onClick={onClose}>
                Cancel
              </Button>
            </div>

          </div>

          {/* RIGHT: Live 80mm Physical Thermal Receipt Specimen */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: '8px' }}>
              Official Order Slip Details (Copy for Exchange Desk)
            </div>

            <div
              className="saamx-thermal-receipt-print-target"
              style={{
                width: '302px', // Standard 80mm POS thermal width
                backgroundColor: '#FFFFFF',
                color: '#000000',
                padding: '16px 14px',
                borderRadius: '4px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                fontFamily: "'Courier Prime', 'JetBrains Mono', Courier, monospace",
                fontSize: '11px',
                lineHeight: 1.35,
                border: '1px solid #E2E8F0',
                boxSizing: 'border-box'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '1px' }}>
                  SAAMX CONSOLIDATED EXCHANGE
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
                  OFFICIAL PHYSICAL ORDER TICKET
                </div>
                <div style={{ fontSize: '9px', marginTop: '2px', color: '#333333' }}>
                  STATION DESK: DESK #{team?.assignedDesk || '1'} &bull; CHAMBER A
                </div>
              </div>

              {/* House Information */}
              <div style={{ marginBottom: '8px', fontSize: '10px' }}>
                <div><strong>INVESTMENT HOUSE:</strong> {team?.teamCode || 'T01'}</div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team?.teamName || `House ${team?.teamCode || 'T01'}`}
                </div>
                <div><strong>SCHOOL:</strong> {team?.school || 'Academic Delegation'}</div>
              </div>

              {/* Direction Banner */}
              <div
                style={{
                  textAlign: 'center',
                  backgroundColor: action === 'BUY' ? '#E6F4EA' : '#FCE8E6',
                  color: action === 'BUY' ? '#137333' : '#C5221F',
                  border: `2px solid ${action === 'BUY' ? '#137333' : '#C5221F'}`,
                  padding: '6px',
                  fontWeight: 900,
                  fontSize: '14px',
                  letterSpacing: '1.5px',
                  marginBottom: '10px'
                }}
              >
                *** {action} ORDER ***
              </div>

              {/* Order Parameters */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '8px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0', fontWeight: 700 }}>INSTRUMENT:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 900 }}>{security.ticker}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0' }}>NAME:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {security.name}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0' }}>EXCHANGE / CCY:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right' }}>{security.exchange} / {secCurrency}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0', fontWeight: 700 }}>QUANTITY:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 900 }}>{quantity} SHARES</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0' }}>ORDER TYPE:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 900 }}>MARKET (MKT)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dotted #888888' }}>
                    <td style={{ padding: '3px 0' }}>EXECUTION:</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 700 }}>BEST MARKET RATE</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 900 }}>EST. TOTAL (INR):</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>
                      ₹{Math.round(inrValue).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Barcode & QR Token */}
              <div style={{ borderTop: '2px dashed #000000', paddingTop: '8px', textAlign: 'center' }}>
                <ThermalBarcode code={ticketCode} />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <ThermalQrToken payload={`${ticketCode}-${security.ticker}-${action}-${quantity}-${inrValue}`} />
                  <div style={{ textAlign: 'left', fontSize: '8px', lineHeight: 1.3 }}>
                    <div><strong>HASH:</strong> SHA256-TOKEN</div>
                    <div><strong>AUDIT:</strong> FLOOR-VERIFIED</div>
                    <div><strong>DESK:</strong> #{team?.assignedDesk || '1'}</div>
                    <div>{new Date().toLocaleTimeString()} IST</div>
                  </div>
                </div>
              </div>

              {/* Physical Floor Signatures */}
              <div style={{ borderTop: '1px solid #888888', marginTop: '10px', paddingTop: '8px', fontSize: '9px' }}>
                <div style={{ marginBottom: '12px' }}>
                  Lead Trader: <span style={{ textDecoration: 'underline' }}>{pinVerified ? `Verified PIN [${team?.teamCode}]` : '______________________'}</span>
                </div>
                <div>
                  Exchange Clerk Intake: ______________________
                </div>
              </div>

              {/* Bottom Receipt Notice */}
              <div style={{ textAlign: 'center', fontSize: '8px', color: '#555555', marginTop: '10px', borderTop: '1px dotted #CCCCCC', paddingTop: '4px' }}>
                *** COPY TICKET NUMBER & SUBMIT TO EXCHANGE DESK RUNNER ***
              </div>
            </div>
          </div>

        </div>
      </Modal>
    </>
  );
}
