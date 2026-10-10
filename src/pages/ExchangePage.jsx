import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';

export default function ExchangePage({ state, onOpenProfile, adminPassword, connected, isCoordinatorOffline }) {
  const sessionState = state?.marketState?.sessionState || 'PRE_OPEN';
  const isTradingDisabled = !connected || isCoordinatorOffline || sessionState !== 'CONTINUOUS_TRADING';

  const [activeDeskId, setActiveDeskId] = useState('DESK_1');
  const [staffName, setStaffName] = useState('Sandesh');

  const DESK_CONFIG = {
    DESK_1: { id: 'DESK_1', name: 'Order Desk 1', operator: 'Sandesh', color: '#3B82F6' },
    DESK_2: { id: 'DESK_2', name: 'Order Desk 2', operator: 'Akshay', color: '#F59E0B' },
    DESK_3: { id: 'DESK_3', name: 'Order Desk 3', operator: 'Aarush', color: '#10B981' },
    DESK_4: { id: 'DESK_4', name: 'Order Desk 4', operator: 'Sridhara', color: '#8B5CF6' },
    DESK_5: { id: 'DESK_5', name: 'Order Desk 5', operator: 'Aksharaa', color: '#EC4899' }
  };

  // Initialize staffName & desk based on logged-in user
  useEffect(() => {
    const user = (sessionStorage.getItem('fms_username') || '').trim().toLowerCase();
    if (user === 'sandesh') { setStaffName('Sandesh'); setActiveDeskId('DESK_1'); }
    else if (user === 'akshay') { setStaffName('Akshay'); setActiveDeskId('DESK_2'); }
    else if (user === 'aarush') { setStaffName('Aarush'); setActiveDeskId('DESK_3'); }
    else if (user === 'sridhara') { setStaffName('Sridhara'); setActiveDeskId('DESK_4'); }
    else if (user === 'aksharaa') { setStaffName('Aksharaa'); setActiveDeskId('DESK_5'); }
    else { setStaffName('Sandesh'); setActiveDeskId('DESK_1'); }
  }, []);

  // Form Fields
  const [ticketNumber, setTicketNumber] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [tickerQuery, setTickerQuery] = useState('');
  const [selectedSec, setSelectedSec] = useState(null);
  const [action, setAction] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [brokerId, setBrokerId] = useState('B01');
  const [notes, setNotes] = useState('');

  // Queue filters
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [deskFilter, setDeskFilter] = useState('ALL');
  const [queueSearch, setQueueSearch] = useState('');

  // Form errors & feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [toasts, setToasts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References
  const ticketRef = useRef(null);
  const tickerRef = useRef(null);
  const qtyRef = useRef(null);

  // Security selector helper matching search queries
  const matchedSecurities = useMemo(() => {
    if (tickerQuery.trim() === '' || selectedSec) return [];
    return (state.securities || []).filter(s =>
      s.ticker?.toLowerCase().startsWith(tickerQuery.toLowerCase()) ||
      s.name?.toLowerCase().includes(tickerQuery.toLowerCase())
    ).slice(0, 6);
  }, [tickerQuery, selectedSec, state.securities]);

  const handleSecSelect = (sec) => {
    setSelectedSec(sec);
    setTickerQuery(`${sec.ticker} — ${sec.name}`);
    setErrorMsg('');
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Submit Paper Ticket Order
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!ticketNumber) {
      setErrorMsg('Please enter physical ticket number.');
      return;
    }
    if (!teamCode) {
      setErrorMsg('Please select a team.');
      return;
    }
    if (!selectedSec) {
      setErrorMsg('Please select a valid listing ticker.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('Please enter a valid quantity.');
      return;
    }
    if (orderType === 'LIMIT' && (!limitPrice || Number(limitPrice) <= 0)) {
      setErrorMsg('Please enter a valid limit price.');
      return;
    }

    setIsSubmitting(true);
    const orderBody = {
      ticketNumber: ticketNumber.trim(),
      teamCode: teamCode.trim().toUpperCase(),
      ticker: selectedSec.ticker,
      action,
      quantity: Number(quantity),
      orderType,
      limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : null,
      brokerId,
      notes: notes.trim(),
      enteredBy: staffName,
      deskId: activeDeskId
    };

    try {
      const res = await apiFetch('/api/orders/submit', {
        method: 'POST',
        body: JSON.stringify(orderBody)
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        addToast(`Physical Ticket #${res.order?.ticketNumber || ticketNumber} logged to ${activeDeskId}!`, 'success');
        setTicketNumber('');
        setQuantity('');
        setLimitPrice('');
        setNotes('');
        setSelectedSec(null);
        setTickerQuery('');
        setTimeout(() => ticketRef.current?.focus(), 50);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Claim Order for Verification at Active Desk (Atomic Lock)
  const handleClaimOrder = async (orderId) => {
    try {
      const res = await apiFetch('/api/order/claim', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          deskId: activeDeskId,
          operator: staffName
        })
      });

      if (res.error) {
        addToast(`Claim Failed: ${res.error}`, 'error');
      } else {
        addToast(`Order claimed by ${DESK_CONFIG[activeDeskId]?.name || activeDeskId}!`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error claiming order.', 'error');
    }
  };

  // 2. Validate Order against Risk Controls
  const handleValidateOrder = async (orderId) => {
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'VALIDATE',
          deskId: activeDeskId,
          operator: staffName
        })
      });

      if (res.error) {
        addToast(`Validation Failed: ${res.error}`, 'error');
      } else {
        addToast(`Order validated! Ready for floor execution.`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error validating order.', 'error');
    }
  };

  // 3. Execute Order from Queue (Atomic Execution)
  const handleExecuteOrder = async (orderId) => {
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'EXECUTE',
          deskId: activeDeskId,
          operator: staffName
        })
      });

      if (res.error) {
        addToast(`Execution Failed: ${res.error}`, 'error');
      } else {
        addToast(`Order executed successfully! TX: ${res.transaction?.id || 'OK'}`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error executing order.', 'error');
    }
  };

  // 4. Reject Order from Queue (Mandatory Reason)
  const handleRejectOrder = async (orderId) => {
    const reason = window.prompt('Enter mandatory rejection reason (e.g. Signature mismatch / Margin deficit / Price band breach):', 'Order slip rejected by desk');
    if (reason === null || !reason.trim()) return;

    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'REJECT',
          rejectionReason: reason.trim(),
          deskId: activeDeskId,
          operator: staffName
        })
      });

      if (res.error) {
        addToast(`Rejection Failed: ${res.error}`, 'error');
      } else {
        addToast('Order marked as REJECTED', 'info');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error rejecting order.', 'error');
    }
  };

  // Filter queue orders
  const filteredOrders = useMemo(() => {
    return (state.orders || []).filter(o => {
      const statusMatch = queueStatusFilter === 'ALL' || o.status === queueStatusFilter;
      const deskMatch = deskFilter === 'ALL' ||
        (deskFilter === 'UNASSIGNED' && !o.deskId) ||
        (deskFilter === 'MY_DESK' && o.deskId === activeDeskId) ||
        (o.deskId === deskFilter);
      const searchMatch = !queueSearch ||
        o.ticketNumber?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        o.teamCode?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        o.ticker?.toLowerCase().includes(queueSearch.toLowerCase());
      return statusMatch && deskMatch && searchMatch;
    }).reverse();
  }, [state.orders, queueStatusFilter, deskFilter, queueSearch, activeDeskId]);

  const pendingCount = (state.orders || []).filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length;
  const liveSecDetails = selectedSec ? (state.securities || []).find(s => s.ticker === selectedSec.ticker) : null;
  const estimatedTotal = (liveSecDetails && quantity) ? (Number(quantity) * (orderType === 'LIMIT' ? (Number(limitPrice) || liveSecDetails.currentPrice) : liveSecDetails.currentPrice)) : 0;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px 0' }}>
      
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderLeftColor: t.type === 'error' ? 'var(--color-fall)' : 'var(--color-brass)' }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header Banner */}
      <div className="card-primary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: '6px solid var(--color-brass)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#6C4404', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            <span>💼 PHYSICAL TRADING FLOOR CLEARANCE</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-brand)', margin: 0, color: 'var(--color-ink)' }}>
            Exchange & Broker Execution Desks
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.8rem', color: '#242C38', fontWeight: 700 }}>ACTIVE DESK:</span>
            <span style={{ fontSize: '0.85rem', color: DESK_CONFIG[activeDeskId]?.color || 'var(--color-ink)', fontWeight: 900 }}>
              {DESK_CONFIG[activeDeskId]?.name} ({staffName})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', backgroundColor: pendingCount > 0 ? 'var(--color-fall-light)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.8rem', color: pendingCount > 0 ? 'var(--color-fall)' : '#242C38', fontWeight: 800 }}>QUEUED TICKETS:</span>
            <span className="font-data" style={{ fontSize: '1rem', color: pendingCount > 0 ? 'var(--color-fall)' : 'var(--color-ink)', fontWeight: 900 }}>
              {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* 5 Simultaneous Order Desks Switcher Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {Object.values(DESK_CONFIG).map(d => {
          const isSelected = activeDeskId === d.id;
          const assignedOrders = (state.orders || []).filter(o => o.deskId === d.id && ['VERIFYING', 'VALIDATED'].includes(o.status));
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => { setActiveDeskId(d.id); setStaffName(d.operator); }}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: isSelected ? `2px solid ${d.color}` : '1px solid var(--color-border)',
                background: isSelected ? '#FFFFFF' : 'var(--color-surface-2)',
                boxShadow: isSelected ? `0 2px 8px ${d.color}25` : 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: d.color }}>{d.name.toUpperCase()}</span>
                {assignedOrders.length > 0 && (
                  <span style={{ background: d.color, color: '#FFF', fontSize: '0.7rem', fontWeight: 900, padding: '2px 7px', borderRadius: '10px' }}>
                    {assignedOrders.length} IN-FLIGHT
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '4px' }}>
                {d.operator} {isSelected ? '• CURRENT' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3-Column Execution Desk Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(360px, 1.5fr) minmax(280px, 0.9fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* COLUMN 1: Order Entry Ticket */}
        <div className="card-primary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0 }}>
              📝 Paper Ticket Entry
            </h3>
            <span className="badge badge-public">Physical Slip</span>
          </div>

          <form onSubmit={handleOrderSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Ticket Number #</label>
                <input
                  type="text"
                  placeholder="e.g. 1042"
                  className="input-field font-data"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  ref={ticketRef}
                  required
                />
              </div>

              <div className="form-group">
                <label>Team Code</label>
                <select
                  className="input-field"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  required
                >
                  <option value="">-- Select Team --</option>
                  {(state.teams || []).map(t => (
                    <option key={t.teamCode} value={t.teamCode}>
                      {t.teamCode} — {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset Search */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Search Security / Listing</label>
              <input
                type="text"
                placeholder="Type ticker (e.g. RELI, INFY, AAPL)..."
                className="input-field"
                value={tickerQuery}
                onChange={(e) => {
                  setTickerQuery(e.target.value);
                  if (selectedSec) setSelectedSec(null);
                }}
                ref={tickerRef}
                required
              />

              {matchedSecurities.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-card)',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {matchedSecurities.map(s => (
                    <div
                      key={s.id || s.ticker}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onClick={() => handleSecSelect(s)}
                      className="glass-interactive"
                    >
                      <strong style={{ color: 'var(--color-brass)' }}>{s.ticker}</strong> — {s.name} ({s.exchange})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BUY / SELL Action Toggle */}
            <div className="form-group">
              <label>Order Action</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: action === 'BUY' ? 'var(--color-rise)' : 'var(--color-surface-2)',
                    color: action === 'BUY' ? '#FFFFFF' : '#1E232B',
                    border: '1px solid',
                    borderColor: action === 'BUY' ? 'var(--color-rise)' : 'var(--color-border)',
                    fontWeight: 900
                  }}
                  onClick={() => setAction('BUY')}
                >
                  🟢 BUY
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    backgroundColor: action === 'SELL' ? 'var(--color-fall)' : 'var(--color-surface-2)',
                    color: action === 'SELL' ? '#FFFFFF' : '#1E232B',
                    border: '1px solid',
                    borderColor: action === 'SELL' ? 'var(--color-fall)' : 'var(--color-border)',
                    fontWeight: 900
                  }}
                  onClick={() => setAction('SELL')}
                >
                  🔴 SELL
                </button>
              </div>
            </div>

            {/* Quantity & Order Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Quantity (Units)</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="input-field font-data"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  ref={qtyRef}
                  required
                />
              </div>

              <div className="form-group">
                <label>Order Type</label>
                <select
                  className="input-field"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>
            </div>

            {orderType === 'LIMIT' && (
              <div className="form-group">
                <label>Limit Price (₹)</label>
                <input
                  type="number"
                  placeholder="Price per unit"
                  className="input-field font-data"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Estimated Value Widget */}
            {estimatedTotal > 0 && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FAF8F3', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#242C38', textTransform: 'uppercase' }}>
                  Estimated Order Consideration ({selectedSec?.currency || 'INR'})
                </div>
                <div className="font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-ink)' }}>
                  {selectedSec?.currency === 'USD' ? '$' : selectedSec?.currency === 'GBP' ? '£' : selectedSec?.currency === 'EUR' ? '€' : '₹'}
                  {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {selectedSec?.currency && selectedSec.currency !== 'INR' && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--gold-royal)', fontWeight: 700, marginTop: '2px' }}>
                    ≈ ₹{(estimatedTotal * (state.fxRates?.[`${selectedSec.currency}INR`]?.midRate || (selectedSec.currency === 'USD' ? 88.20 : 119.40))).toLocaleString(undefined, { maximumFractionDigits: 0 })} INR Equivalent
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Desk Notes (Optional)</label>
              <textarea
                placeholder="Paper slip notes, special desk annotations..."
                className="input-field"
                style={{ height: '60px', resize: 'none' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--color-fall)', fontSize: '0.84rem', fontWeight: 800, marginBottom: '14px', padding: '8px 12px', backgroundColor: 'var(--color-fall-light)', borderRadius: '6px', border: '1px solid rgba(147,25,19,0.3)' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              disabled={isSubmitting || isTradingDisabled}
            >
              {isSubmitting ? 'Logging Ticket...' : 'Log & Clear Paper Order →'}
            </button>
          </form>
        </div>

        {/* COLUMN 2: Pending Order Queue & Clearance */}
        <div className="card-primary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)', margin: 0 }}>
              ⚡ Clearance Queue ({filteredOrders.length})
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                className="input-field"
                style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
                value={deskFilter}
                onChange={(e) => setDeskFilter(e.target.value)}
              >
                <option value="ALL">All Desks</option>
                <option value="MY_DESK">My Desk ({DESK_CONFIG[activeDeskId]?.name})</option>
                <option value="UNASSIGNED">Unassigned Queue</option>
                <option value="DESK_1">Desk 1 (Sandesh)</option>
                <option value="DESK_2">Desk 2 (Akshay)</option>
                <option value="DESK_3">Desk 3 (Aarush)</option>
                <option value="DESK_4">Desk 4 (Sridhara)</option>
                <option value="DESK_5">Desk 5 (Aksharaa)</option>
              </select>
              <select
                className="input-field"
                style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="QUEUED">QUEUED</option>
                <option value="VERIFYING">VERIFYING</option>
                <option value="VALIDATED">VALIDATED</option>
                <option value="EXECUTED">EXECUTED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: '580px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#242C38', backgroundColor: '#FAF8F3', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>No orders in this queue filter view.</p>
              </div>
            ) : (
              filteredOrders.map(o => {
                const isClaimedByMe = o.deskId === activeDeskId;
                const isLockedByOther = o.lockedByDesk && o.lockedByDesk !== activeDeskId;
                const deskColor = o.deskId ? (DESK_CONFIG[o.deskId]?.color || '#3B82F6') : '#64748B';

                return (
                  <div
                    key={o.id}
                    className="card-data"
                    style={{
                      padding: '12px 16px',
                      borderLeft: `4px solid ${o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--color-ink)' }}>#{o.ticketNumber}</strong>
                        <span className="badge badge-public">Team {o.teamCode}</span>
                        {o.deskId && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: `${deskColor}20`, color: deskColor }}>
                            {DESK_CONFIG[o.deskId]?.name || o.deskId}
                          </span>
                        )}
                      </div>
                      <span className={`badge ${
                        o.status === 'EXECUTED' ? 'badge-rise' :
                        o.status === 'REJECTED' ? 'badge-fall' :
                        o.status === 'VALIDATED' ? 'badge-rise' :
                        o.status === 'VERIFYING' ? 'badge-public' : 'badge-public'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ fontWeight: 900, color: 'var(--color-brass)' }}>{o.ticker}</span>
                        <span style={{ margin: '0 6px', color: '#8C929E' }}>•</span>
                        <span style={{ fontWeight: 800, color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{o.action}</span>
                        <span style={{ margin: '0 6px', color: '#8C929E' }}>•</span>
                        <span className="font-data" style={{ fontWeight: 700 }}>{o.quantity?.toLocaleString()} units</span>
                        {o.orderType === 'LIMIT' && o.limitPrice && (
                          <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px' }}>(Limit ₹{o.limitPrice})</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#242C38' }}>
                        {new Date(o.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {o.rejectionReason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-fall)', background: 'var(--color-fall-light)', padding: '4px 8px', borderRadius: '4px', marginTop: '6px' }}>
                        Rejection reason: {o.rejectionReason}
                      </div>
                    )}

                    {/* Step-by-Step Desk Actions */}
                    {['QUEUED', 'SUBMITTED', 'PENDING'].includes(o.status) && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleClaimOrder(o.id)}
                          disabled={isTradingDisabled}
                        >
                          ⚡ Claim Ticket ({DESK_CONFIG[activeDeskId]?.name})
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleRejectOrder(o.id)}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}

                    {o.status === 'VERIFYING' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        {isClaimedByMe || !o.deskId ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-success"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleValidateOrder(o.id)}
                              disabled={isTradingDisabled}
                            >
                              ✓ Validate Ticket Details
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleRejectOrder(o.id)}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, padding: '4px 0' }}>
                            🔒 Ticket verification locked by {o.deskId} ({o.operator})
                          </div>
                        )}
                      </div>
                    )}

                    {o.status === 'VALIDATED' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        {!isLockedByOther ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-success"
                              style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', fontWeight: 900 }}
                              onClick={() => handleExecuteOrder(o.id)}
                              disabled={isTradingDisabled}
                            >
                              🚀 Execute Trade ({o.action} {o.quantity} {o.ticker})
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleRejectOrder(o.id)}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, padding: '4px 0' }}>
                            🔒 Order assigned to {o.deskId} for execution
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: Selected Security Live Quote & Market Depth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card-primary">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-ink)', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              📊 Security Live Quote
            </h4>

            {liveSecDetails ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-brass)', margin: 0 }}>
                      {liveSecDetails.ticker}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#242C38', fontWeight: 600 }}>{liveSecDetails.name}</div>
                  </div>
                  <span className="badge badge-public">{liveSecDetails.exchange}</span>
                </div>

                <div className="font-data" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-ink)', margin: '8px 0' }}>
                  ₹{liveSecDetails.currentPrice?.toLocaleString()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: '#242C38', fontWeight: 800 }}>OPEN PRICE</div>
                    <div className="font-data" style={{ fontWeight: 800 }}>₹{liveSecDetails.openingPrice || liveSecDetails.basePrice}</div>
                  </div>
                  <div>
                    <div style={{ color: '#242C38', fontWeight: 800 }}>AVAILABLE FLOAT</div>
                    <div className="font-data" style={{ fontWeight: 800 }}>{liveSecDetails.availableUnits?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#242C38', fontWeight: 800 }}>DAY HIGH / LOW</div>
                    <div className="font-data" style={{ fontWeight: 800 }}>₹{liveSecDetails.dayHigh || liveSecDetails.currentPrice} / ₹{liveSecDetails.dayLow || liveSecDetails.currentPrice}</div>
                  </div>
                  <div>
                    <div style={{ color: '#242C38', fontWeight: 800 }}>VOLUME</div>
                    <div className="font-data" style={{ fontWeight: 800 }}>{(liveSecDetails.tradingVolume || liveSecDetails.volume || 0).toLocaleString()}</div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '14px', padding: '8px' }}
                  onClick={() => onOpenProfile(liveSecDetails.ticker)}
                >
                  Full Company Dossier →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#242C38', backgroundColor: '#FAF8F3', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '0.86rem' }}>Select or search any security in the order ticket to inspect live quotes.</p>
              </div>
            )}
          </div>

          {/* Recent Executed Trades Stream */}
          <div className="card-primary">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-ink)', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              📜 Recent Executed Trades
            </h4>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(state.transactions || []).slice(-6).reverse().map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', backgroundColor: '#FAF8F3', borderRadius: '4px' }}>
                  <div>
                    <span style={{ fontWeight: 900, color: 'var(--color-brass)' }}>{tx.ticker}</span>
                    <span style={{ margin: '0 4px', color: '#8C929E' }}>•</span>
                    <span style={{ fontWeight: 800, color: tx.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{tx.action}</span>
                    <span style={{ margin: '0 4px', color: '#8C929E' }}>•</span>
                    <span className="font-data">{tx.quantity}u</span>
                  </div>
                  <span className="font-data" style={{ fontWeight: 800, color: 'var(--color-ink)' }}>
                    ₹{tx.priceAtExecution}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
