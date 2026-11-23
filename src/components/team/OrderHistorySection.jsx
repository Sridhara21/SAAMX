import React, { useState, useMemo } from 'react';
import { useDensity } from '../../context/DensityContext.jsx';
import { apiFetch } from '../../lib/api.js';
import { Card, CardHeader, CardTitle } from '../ui/Card.jsx';
import { Badge, OrderStatusBadge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, SearchInput } from '../ui/Input.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Alert, EmptyState } from '../ui/States.jsx';
import { CurrencyDisplay, PriceDisplay, QuantityDisplay } from '../ui/FinancialFormatters.jsx';
import { DigitalTradeOrderSlip, DigitalBankSlip } from '../DigitalForms.jsx';
import {
  IconClipboardList,
  IconClock,
  IconCheck,
  IconShieldAlert,
  IconX,
  IconSend,
  IconFileText,
  IconChevronDown,
  IconChevronUp,
  IconFilter
} from '../../lib/icons.jsx';

function OrderLifecycleBar({ status, isCompact }) {
  const stages = [
    { id: 'submitted', label: '1. Submitted', sublabel: 'Slip Queued' },
    { id: 'verified', label: '2. Verified', sublabel: 'Desk Validated' },
    { id: 'matched', label: '3. Matched', sublabel: 'Floor Execution' },
    { id: 'settled', label: '4. Settled', sublabel: 'Ledger Reconciled' }
  ];

  const isReturned = status === 'RETURNED_FOR_CORRECTION';
  const isRejected = ['REJECTED', 'CANCELLED', 'SETTLEMENT_REJECTED', 'REJECTED_BY_EXCHANGE', 'REJECTED_BY_BANK'].includes(status);
  const isExecuted = ['EXECUTED', 'SETTLED'].includes(status);
  const isMatching = ['EXECUTING', 'EXECUTED_PENDING_SETTLEMENT', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(status);
  const isVerifying = ['VERIFYING', 'VALIDATED', 'VERIFYING_AT_EXCHANGE'].includes(status);
  const isSubmitted = ['PENDING', 'SUBMITTED', 'AWAITING_PHYSICAL_SLIP'].includes(status);

  let stageStates = ['pending', 'pending', 'pending', 'pending'];
  if (isExecuted) {
    stageStates = ['done', 'done', 'done', 'done'];
  } else if (isMatching) {
    stageStates = ['done', 'done', 'active', 'pending'];
  } else if (isVerifying) {
    stageStates = ['done', 'active', 'pending', 'pending'];
  } else if (isSubmitted) {
    stageStates = ['active', 'pending', 'pending', 'pending'];
  } else if (isReturned) {
    stageStates = ['done', 'returned', 'pending', 'pending'];
  } else if (isRejected) {
    stageStates = ['done', 'rejected', 'pending', 'pending'];
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: isCompact ? '4px' : '8px',
      margin: isCompact ? '6px 0' : '10px 0',
      padding: isCompact ? '6px 8px' : '8px 12px',
      background: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.03))',
      borderRadius: 'var(--radius-sm, 6px)',
      border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.06))'
    }}>
      {stages.map((stg, i) => {
        const state = stageStates[i];
        let bgColor = 'rgba(255, 255, 255, 0.03)';
        let textColor = 'var(--color-text-muted)';
        let borderColor = 'var(--color-border-subtle)';
        let iconSymbol = (i + 1).toString();

        if (state === 'done') {
          bgColor = 'rgba(16, 185, 129, 0.12)';
          textColor = 'var(--color-rise, #10B981)';
          borderColor = 'rgba(16, 185, 129, 0.3)';
          iconSymbol = '✓';
        } else if (state === 'active') {
          bgColor = 'rgba(59, 130, 246, 0.15)';
          textColor = 'var(--color-primary, #3B82F6)';
          borderColor = 'var(--color-primary, #3B82F6)';
          iconSymbol = '●';
        } else if (state === 'returned') {
          bgColor = 'rgba(245, 158, 11, 0.15)';
          textColor = 'var(--color-warning, #F59E0B)';
          borderColor = 'var(--color-warning, #F59E0B)';
          iconSymbol = '!';
        } else if (state === 'rejected') {
          bgColor = 'rgba(239, 68, 68, 0.15)';
          textColor = 'var(--color-fall, #EF4444)';
          borderColor = 'var(--color-fall, #EF4444)';
          iconSymbol = '✕';
        }

        return (
          <div
            key={stg.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCompact ? '4px' : '8px',
              padding: isCompact ? '3px 6px' : '5px 8px',
              borderRadius: 'var(--radius-sm, 4px)',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              minWidth: 0
            }}
          >
            <div style={{
              width: isCompact ? '18px' : '22px',
              height: isCompact ? '18px' : '22px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isCompact ? '0.65rem' : '0.72rem',
              fontWeight: 800,
              color: textColor,
              background: 'rgba(0, 0, 0, 0.25)',
              flexShrink: 0
            }}>
              {iconSymbol}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontSize: isCompact ? '0.67rem' : '0.74rem',
                fontWeight: 700,
                color: textColor,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>
                {stg.label}
              </div>
              {!isCompact && (
                <div style={{
                  fontSize: '0.62rem',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {state === 'returned' ? 'Correction Needed' : state === 'rejected' ? 'Surveillance Void' : stg.sublabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderHistorySection({
  teamOrders,
  teamCode,
  onNavigate
}) {
  const { isCompact } = useDensity();
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'EXECUTED', 'RETURNED', 'REJECTED'
  const [actionFilter, setActionFilter] = useState('ALL'); // 'ALL', 'BUY', 'SELL'
  
  // Expandable audit trail IDs
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  // Resubmission Modal for RETURNED_FOR_CORRECTION
  const [resubmittingOrder, setResubmittingOrder] = useState(null);
  const [resubmitQty, setResubmitQty] = useState('');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState('');
  const [resubmitSuccess, setResubmitSuccess] = useState('');

  // Selected Order for Digital Slip/Voucher View
  const [activeDigitalSlip, setActiveDigitalSlip] = useState(null);
  const [activeBankVoucher, setActiveBankVoucher] = useState(null);

  // Summary Metrics
  const metrics = useMemo(() => {
    let pending = 0, executed = 0, returned = 0, rejected = 0;
    (teamOrders || []).forEach(o => {
      if (['PENDING', 'SUBMITTED', 'VERIFYING', 'VALIDATED', 'EXECUTING', 'EXECUTED_PENDING_SETTLEMENT', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status)) pending++;
      else if (o.status === 'EXECUTED' || o.status === 'SETTLED') executed++;
      else if (o.status === 'RETURNED_FOR_CORRECTION') returned++;
      else if (['REJECTED', 'CANCELLED', 'SETTLEMENT_REJECTED', 'REJECTED_BY_EXCHANGE', 'REJECTED_BY_BANK'].includes(o.status)) rejected++;
    });
    return { pending, executed, returned, rejected, total: (teamOrders || []).length };
  }, [teamOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return (teamOrders || []).filter(o => {
      // Search by ticketNumber, id, ticker, securityName
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matches = (o.ticketNumber && String(o.ticketNumber).toLowerCase().includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.ticker && o.ticker.toLowerCase().includes(q)) ||
          (o.securityName && o.securityName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE') {
        if (!['PENDING', 'SUBMITTED', 'VERIFYING', 'VALIDATED', 'EXECUTING', 'EXECUTED_PENDING_SETTLEMENT', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status)) return false;
      } else if (statusFilter === 'EXECUTED') {
        if (o.status !== 'EXECUTED' && o.status !== 'SETTLED') return false;
      } else if (statusFilter === 'RETURNED') {
        if (o.status !== 'RETURNED_FOR_CORRECTION') return false;
      } else if (statusFilter === 'REJECTED') {
        if (!['REJECTED', 'CANCELLED', 'SETTLEMENT_REJECTED', 'REJECTED_BY_EXCHANGE', 'REJECTED_BY_BANK'].includes(o.status)) return false;
      }

      // Action filter
      if (actionFilter !== 'ALL') {
        if ((o.action || '').toUpperCase() !== actionFilter) return false;
      }

      return true;
    });
  }, [teamOrders, orderSearch, statusFilter, actionFilter]);

  const toggleExpand = (id) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenResubmit = (order) => {
    setResubmittingOrder(order);
    setResubmitQty(String(order.quantity));
    setResubmitNotes(order.notes || '');
    setResubmitError('');
    setResubmitSuccess('');
  };

  const handleConfirmResubmit = async (e) => {
    e.preventDefault();
    if (!resubmittingOrder) return;
    const q = parseInt(resubmitQty, 10);
    if (isNaN(q) || q <= 0) {
      setResubmitError('Please enter a valid positive integer quantity.');
      return;
    }

    setResubmitLoading(true);
    setResubmitError('');
    setResubmitSuccess('');

    try {
      const res = await apiFetch('/api/orders/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: resubmittingOrder.id,
          quantity: q,
          orderType: 'MARKET',
          limitPrice: null,
          notes: resubmitNotes,
          teamCode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resubmission failed');

      setResubmitSuccess('Corrected order slip successfully resubmitted to Exchange Desk queue.');
      setTimeout(() => {
        setResubmittingOrder(null);
      }, 1500);
    } catch (err) {
      setResubmitError(err.message);
    } finally {
      setResubmitLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '12px' : '20px' }}>
      
      {/* 1. Order Lifecycle Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        
        <Card variant="default" style={{ padding: '14px 18px', borderLeft: '4px solid var(--color-text-muted)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: '0.04em' }}>TOTAL TICKETS LOGGED</span>
          <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            {metrics.total}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Physical Paper Slips</span>
        </Card>

        <Card variant="default" style={{ padding: '14px 18px', borderLeft: '4px solid var(--color-primary)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: '0.04em' }}>IN VERIFICATION / QUEUED</span>
          <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>
            {metrics.pending}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Awaiting Desk Execution</span>
        </Card>

        <Card variant="default" style={{ padding: '14px 18px', borderLeft: '4px solid var(--color-rise)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: '0.04em' }}>EXECUTED & SETTLED</span>
          <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-rise)', marginTop: '2px' }}>
            {metrics.executed}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-rise)', fontWeight: 700 }}>Confirmed on Ledger</span>
        </Card>

        <Card variant="default" style={{ padding: '14px 18px', borderLeft: '4px solid var(--color-warning, #D97706)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: '0.04em' }}>RETURNED FOR CORRECTION</span>
          <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning, #D97706)', marginTop: '2px' }}>
            {metrics.returned}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-warning, #D97706)', fontWeight: 700 }}>Action Required by Team</span>
        </Card>

        <Card variant="default" style={{ padding: '14px 18px', borderLeft: '4px solid var(--color-fall)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 800, letterSpacing: '0.04em' }}>REJECTED BY SURVEILLANCE</span>
          <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-fall)', marginTop: '2px' }}>
            {metrics.rejected}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-fall)', fontWeight: 700 }}>Voided / Margin Limit</span>
        </Card>

      </div>

      {/* 2. Educational Physical Workflow Guide Banner */}
      <Alert variant="info" title="Physical Paper Order Slip Processing">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
          <div>
            1. Prepare physical paper order slips with ticket number, side, quantity, and limit price.
          </div>
          <div>
            2. Designated runner submits the paper slip to your assigned Exchange Desk station.
          </div>
          <div>
            3. Exchange clerks verify signatures, match allocations, and execute orders directly into the authoritative market ledger.
          </div>
        </div>
      </Alert>

      {/* 3. Search & Filters Bar */}
      <Card variant="default" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
              Order History & Paper Slip Queue ({filteredOrders.length} records)
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Authoritative record of all physical order slips logged for Investment House {teamCode}.
            </p>
          </div>

          <div style={{ width: '280px' }}>
            <SearchInput
              placeholder="Search ticket #, ticker, or order ID..."
              value={orderSearch}
              onChange={setOrderSearch}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'ACTIVE', label: 'In Verification' },
            { id: 'EXECUTED', label: 'Executed' },
            { id: 'RETURNED', label: 'Returned for Correction' },
            { id: 'REJECTED', label: 'Rejected' }
          ].map(f => (
            <Button
              key={f.id}
              variant={statusFilter === f.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}

          <span style={{ color: 'var(--color-text-muted)', marginLeft: '10px' }}>Action:</span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'BUY', label: 'BUY' },
            { id: 'SELL', label: 'SELL' }
          ].map(a => (
            <Button
              key={a.id}
              variant={actionFilter === a.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActionFilter(a.id)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* 4. Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<IconFileText size={36} style={{ color: 'var(--color-text-muted)' }} />}
          title="No Orders Match Selected Filters"
          description="Submit physical paper order slips to authorized Exchange Desk clerks to initiate trades."
          action={
            <Button
              variant="secondary"
              onClick={() => { setOrderSearch(''); setStatusFilter('ALL'); setActionFilter('ALL'); }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredOrders.map(order => {
            const isBuy = order.action === 'BUY';
            const isExecuted = order.status === 'EXECUTED' || order.status === 'SETTLED';
            const isReturned = order.status === 'RETURNED_FOR_CORRECTION';
            const isRejected = ['REJECTED', 'CANCELLED'].includes(order.status);
            const isExpanded = expandedOrderIds.has(order.id);

            return (
              <Card 
                key={order.id}
                variant="default"
                style={{ 
                  padding: '16px 20px', 
                  borderLeft: `4px solid ${
                    isExecuted ? 'var(--color-rise)' :
                    isReturned ? 'var(--color-warning, #D97706)' :
                    isRejected ? 'var(--color-fall)' : 'var(--color-primary)'
                  }` 
                }}
              >
                {/* Order Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={isBuy ? 'gain' : 'loss'} size="md">
                      {order.action}
                    </Badge>

                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                        {order.ticker}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
                        {order.securityName || order.ticker}
                      </span>
                    </div>

                    <span className="tabular-nums font-data" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.1))', padding: '2px 8px', borderRadius: 'var(--radius-sm, 4px)', fontWeight: 700 }}>
                      Ticket #{order.ticketNumber || 'N/A'}
                    </span>
                    <span className="tabular-nums font-data" style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-sm, 4px)', fontWeight: 700, fontFamily: 'monospace' }}>
                      {order.id}
                    </span>
                    {order.deskId && (
                      <span style={{ fontSize: '0.73rem', color: '#3B82F6', fontWeight: 700 }}>
                        {order.deskId.replace('DESK_', 'Desk ')}
                      </span>
                    )}
                    {(order.bankDeskId || (['EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'SETTLED'].includes(order.status) && order.teamCode)) && (
                      <span style={{ fontSize: '0.73rem', color: '#10B981', fontWeight: 700 }}>
                        {(order.bankDeskId || `BANK_${(((parseInt(String(order.teamCode).replace(/\D/g, '') || 1) - 1) % 4) + 1)}`).replace('BANK_', 'Bank ')}
                      </span>
                    )}
                  </div>

                  {/* Status Badge, Digital Slip & Resubmit Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <OrderStatusBadge status={order.status} />

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveDigitalSlip(order)}
                      style={{ fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="View Official Digital Trade Order Slip"
                    >
                      <IconFileText size={13} />
                      <span>View Slip</span>
                    </Button>

                    {(order.voucherReference || order.status === 'EXCHANGE_APPROVED' || order.status === 'AWAITING_BANK_SETTLEMENT' || order.status === 'SETTLED') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveBankVoucher(order)}
                        style={{ fontWeight: 800, fontSize: '0.75rem', color: '#047857', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="View Official Bank Pay-In / Pay-Out Slip"
                      >
                        <IconFileText size={13} />
                        <span>Bank Slip</span>
                      </Button>
                    )}

                    {isReturned && (
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveDigitalSlip(order);
                          }}
                          style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View Digital Paper Slip"
                        >
                          <IconFileText size={13} />
                          <span>View Slip</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenResubmit(order)}
                          style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Correct & Resubmit</span>
                          <IconSend size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Parameters Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '0.76rem', background: 'var(--color-surface-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm, 4px)', marginBottom: '8px', border: '1px solid var(--color-border-subtle)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>Requested Quantity</span>
                    <strong className="tabular-nums font-data" style={{ color: 'var(--color-text-primary)' }}>
                      <QuantityDisplay value={order.quantity} /> shares
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>Order Type & Limit</span>
                    <strong className="tabular-nums font-data" style={{ color: 'var(--color-text-primary)' }}>
                      {order.orderType || 'MARKET'} {order.limitPrice ? `@ ₹${Number(order.limitPrice).toFixed(2)}` : ''}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>Requested Value</span>
                    <strong className="tabular-nums font-data" style={{ color: 'var(--color-text-primary)' }}>
                      {order.requestedValue ? <CurrencyDisplay value={order.requestedValue} currency="INR" /> : 'N/A'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.68rem' }}>Logged Timestamp</span>
                    <span className="tabular-nums font-data" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(order.submittedAt || order.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Execution or Rejection Details Banner */}
                {isExecuted && (
                  <div style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid var(--color-rise)', padding: '8px 12px', borderRadius: 'var(--radius-sm, 4px)', fontSize: '0.74rem', color: 'var(--color-rise)', marginBottom: '8px' }}>
                    <strong>Execution Settlement:</strong> Executed {order.executionQuantity || order.quantity} shares @ ₹{Number(order.executionPrice || 0).toFixed(2)} (Total: ₹{Number(order.executionValue || (order.quantity * (order.executionPrice || 0))).toLocaleString('en-IN')}) by Desk {order.executedByDesk || order.deskId || '1'} &bull; Operator: {order.executedByOperator || order.operator || 'Exchange Officer'}.
                  </div>
                )}

                {isReturned && order.returnReason && (
                  <div style={{ background: 'rgba(217, 119, 6, 0.08)', border: '1px solid var(--color-warning, #D97706)', padding: '8px 12px', borderRadius: 'var(--radius-sm, 4px)', fontSize: '0.75rem', color: 'var(--color-warning, #D97706)', marginBottom: '8px' }}>
                    <strong>Clerk Return Reason:</strong> "{order.returnReason}". Please correct the physical slip and resubmit.
                  </div>
                )}

                {isRejected && order.rejectionReason && (
                  <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid var(--color-fall)', padding: '8px 12px', borderRadius: 'var(--radius-sm, 4px)', fontSize: '0.74rem', color: 'var(--color-fall)', marginBottom: '8px' }}>
                    <strong>Rejection Notice:</strong> "{order.rejectionReason}". Order voided by Exchange Surveillance.
                  </div>
                )}

                {/* Toggle Audit Timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', fontSize: '0.72rem' }}>
                  <span className="tabular-nums font-data" style={{ color: 'var(--color-text-muted)' }}>
                    ID: {order.id}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <span>{isExpanded ? 'Hide Processing Timeline' : 'View Processing Timeline'}</span>
                    {isExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                  </button>
                </div>

                {/* Expandable Processing Audit Timeline */}
                {isExpanded && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--color-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--color-text-primary)' }}>Processing Progression Timeline:</strong>
                    
                    {order.statusHistory && order.statusHistory.length > 0 ? (
                      order.statusHistory.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
                          <span className="tabular-nums font-data" style={{ color: 'var(--color-text-muted)', minWidth: '70px' }}>
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                            [{step.stage}]
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {step.note || step.status}
                          </span>
                          {step.actor && (
                            <span style={{ color: 'var(--color-text-muted)' }}>({step.actor})</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="tabular-nums font-data" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Logged into exchange queue at {new Date(order.submittedAt || order.timestamp || Date.now()).toLocaleTimeString()}.
                      </div>
                    )}
                  </div>
                )}

              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Accessible Resubmission Modal */}
      {resubmittingOrder && (
        <Modal
          isOpen={true}
          onClose={() => setResubmittingOrder(null)}
          title={`Resubmit Corrected Slip — Ticket #${resubmittingOrder.ticketNumber}`}
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Ticket <strong>#{resubmittingOrder.ticketNumber}</strong> ({resubmittingOrder.action} {resubmittingOrder.ticker}) was returned:
            </p>

            <Alert variant="warning" title="Clerk Feedback">
              "{resubmittingOrder.returnReason}"
            </Alert>

            {resubmitError && (
              <Alert variant="danger">
                {resubmitError}
              </Alert>
            )}

            {resubmitSuccess && (
              <Alert variant="success">
                {resubmitSuccess}
              </Alert>
            )}

            <form onSubmit={handleConfirmResubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Corrected Quantity:"
                  type="number"
                  min="1"
                  value={resubmitQty}
                  onChange={e => setResubmitQty(e.target.value)}
                  required
                  numeric={true}
                />

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Execution Type:
                  </label>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      backgroundColor: 'var(--color-surface-2, #161D2B)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-accent, #00E5FF)',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    ⚡ MARKET (Instant)
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Correction Clarification Notes for Clerk:
                </label>
                <textarea
                  rows={2}
                  value={resubmitNotes}
                  onChange={e => setResubmitNotes(e.target.value)}
                  placeholder="e.g. Adjusted share count to fit available cash allocation..."
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm, 6px)', 
                    border: '1px solid var(--color-border)', 
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.82rem', 
                    boxSizing: 'border-box' 
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setResubmittingOrder(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={resubmitLoading}
                  style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Submit Corrected Slip</span>
                  <IconSend size={14} />
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Digital Trade Order Slip Modal */}
      {activeDigitalSlip && (
        <Modal
          isOpen={!!activeDigitalSlip}
          onClose={() => setActiveDigitalSlip(null)}
          title="Official Trade Order Slip (TOS)"
          maxWidth="720px"
        >
          <DigitalTradeOrderSlip
            order={activeDigitalSlip}
            onClose={() => setActiveDigitalSlip(null)}
          />
        </Modal>
      )}

      {/* Digital Bank Pay-In / Pay-Out Slip Modal */}
      {activeBankVoucher && (
        <Modal
          isOpen={!!activeBankVoucher}
          onClose={() => setActiveBankVoucher(null)}
          title="Official Bank Pay-In / Pay-Out Slip (PIS/POS)"
          maxWidth="720px"
        >
          <DigitalBankSlip
            voucher={activeBankVoucher}
            onClose={() => setActiveBankVoucher(null)}
          />
        </Modal>
      )}

    </div>
  );
}
