import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';
import { useDensity } from '../context/DensityContext.jsx';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SectionHeader,
  Badge,
  Modal,
  Alert,
  EmptyState,
  ToastContainer
} from '../components/ui/index.js';
import {
  IconBuilding,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconSearch,
  IconClock,
  IconShieldAlert,
  IconArrowRight,
  IconCurrencyExchange,
  IconPrinter
} from '../lib/icons.jsx';
import PrintableVoucherModal from '../components/PrintableVoucherModal.jsx';
import { DigitalBankSlip } from '../components/DigitalForms.jsx';

export default function BankPage({ state, connected }) {
  const { density } = useDensity();
  const userRole = (sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role') || '').toLowerCase();
  const sessionTeamCode = (sessionStorage.getItem('saamx_team_code') || sessionStorage.getItem('fms_username') || '').toUpperCase();
  const sessionUsername = sessionStorage.getItem('saamx_username') || sessionStorage.getItem('fms_username') || 'Bank Desk';

  const isStaff = ['admin', 'super_admin', 'bank_teller', 'sebi', 'operator_x'].includes(userRole);
  const canSettle = ['admin', 'super_admin', 'bank_teller'].includes(userRole);
  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const isTeam = userRole === 'team';

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState(isTeam ? 'my-vouchers' : 'pending-payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [bankDeskFilter, setBankDeskFilter] = useState('ALL');
  const [toasts, setToasts] = useState([]);

  // Modals
  const [settleModalItem, setSettleModalItem] = useState(null);
  const [voucherSlipInput, setVoucherSlipInput] = useState('');
  const [settleNotesInput, setSettleNotesInput] = useState('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const [holdModalItem, setHoldModalItem] = useState(null);
  const [holdNotesInput, setHoldNotesInput] = useState('');
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);

  const [inspectModalItem, setInspectModalItem] = useState(null);
  const [printableVoucherItem, setPrintableVoucherItem] = useState(null);

  // Reconciliation state
  const [reconciliationData, setReconciliationData] = useState(null);
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(false);

  // Settlement Mode Toggle
  const currentMode = state?.settings?.settlementMode || 'INSTANT';
  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Settlements list extraction
  const rawSettlements = useMemo(() => {
    if (!state?.settlements) return [];
    return Array.isArray(state.settlements) ? state.settlements : Object.values(state.settlements);
  }, [state?.settlements]);

  // Scoped settlements based on caller role & bank desk filter
  const settlements = useMemo(() => {
    let list = rawSettlements;
    if (isTeam) {
      list = list.filter(s => (s.teamCode || '').toUpperCase() === sessionTeamCode);
    }
    if (bankDeskFilter !== 'ALL') {
      list = list.filter(s => s.bankDeskId === bankDeskFilter);
    }
    return list;
  }, [rawSettlements, isTeam, sessionTeamCode, bankDeskFilter]);

  // Tab Filtering
  const pendingPayments = useMemo(() => {
    return settlements.filter(s => ['PENDING', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(s.status) && s.action === 'BUY');
  }, [settlements]);

  const pendingProceeds = useMemo(() => {
    return settlements.filter(s => ['PENDING', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(s.status) && s.action === 'SELL');
  }, [settlements]);

  const filteredHistory = useMemo(() => {
    return settlements.filter(s => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (s.ticketNumber && String(s.ticketNumber).toLowerCase().includes(term)) ||
        (s.voucherReference && s.voucherReference.toLowerCase().includes(term)) ||
        (s.teamCode && s.teamCode.toLowerCase().includes(term)) ||
        (s.ticker && s.ticker.toLowerCase().includes(term)) ||
        (s.securityName && s.securityName.toLowerCase().includes(term)) ||
        (s.id && s.id.toLowerCase().includes(term))
      );
    });
  }, [settlements, statusFilter, searchTerm]);

  // Fetch reconciliation data on tab change
  const fetchReconciliation = async () => {
    setIsLoadingReconciliation(true);
    try {
      const res = await apiFetch('/api/bank/reconciliation');
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.error) {
        setReconciliationData(data);
      } else {
        addToast(data?.error || 'Failed to fetch reconciliation data.', 'error');
      }
    } catch (e) {
      addToast(e.message || 'Error loading reconciliation report.', 'error');
    } finally {
      setIsLoadingReconciliation(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reconciliation' && isStaff) {
      fetchReconciliation();
    }
  }, [activeTab, isStaff]);

  // Action: Confirm Settlement
  const handleConfirmSettle = async () => {
    if (!settleModalItem) return;
    setIsSubmittingSettle(true);
    try {
      const res = await apiFetch('/api/bank/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: settleModalItem.id,
          voucherReference: voucherSlipInput.trim() || settleModalItem.voucherReference,
          notes: settleNotesInput.trim()
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success || !data.error)) {
        addToast(`Settlement #${settleModalItem.ticketNumber || settleModalItem.id} confirmed successfully!`, 'success');
        setSettleModalItem(null);
        setVoucherSlipInput('');
        setSettleNotesInput('');
      } else {
        addToast(data?.error || 'Failed to confirm settlement.', 'error');
      }
    } catch (e) {
      addToast(e.message || 'Error executing settlement.', 'error');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Action: Reject Settlement
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    if (!rejectionReasonInput.trim()) {
      addToast('An explicit rejection reason is required.', 'error');
      return;
    }
    setIsSubmittingReject(true);
    try {
      const res = await apiFetch('/api/bank/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: rejectModalItem.id,
          reason: rejectionReasonInput.trim()
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success || !data.error)) {
        addToast(`Settlement #${rejectModalItem.ticketNumber || rejectModalItem.id} rejected. Reserved funds/units restored.`, 'warning');
        setRejectModalItem(null);
        setRejectionReasonInput('');
      } else {
        addToast(data?.error || 'Failed to reject settlement.', 'error');
      }
    } catch (e) {
      addToast(e.message || 'Error rejecting settlement.', 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Action: Hold Settlement
  const handleConfirmHold = async () => {
    if (!holdModalItem) return;
    if (!holdNotesInput.trim()) {
      addToast('A mandatory note explaining the hold reason is required.', 'error');
      return;
    }
    setIsSubmittingHold(true);
    try {
      const res = await apiFetch('/api/bank/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: holdModalItem.id,
          notes: holdNotesInput.trim()
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success || !data.error)) {
        addToast(`Settlement #${holdModalItem.ticketNumber || holdModalItem.id} placed on hold for review.`, 'warning');
        setHoldModalItem(null);
        setHoldNotesInput('');
      } else {
        addToast(data?.error || 'Failed to place voucher on hold.', 'error');
      }
    } catch (e) {
      addToast(e.message || 'Error holding settlement voucher.', 'error');
    } finally {
      setIsSubmittingHold(false);
    }
  };

  // Action: Toggle Mode (Admin Only)
  const handleToggleMode = async () => {
    const nextMode = currentMode === 'INSTANT' ? 'TWO_PHASE_BANK' : 'INSTANT';
    setIsTogglingMode(true);
    try {
      const res = await apiFetch('/api/admin/settlement-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || !data.error)) {
        addToast(`Settlement mode switched to ${nextMode}!`, 'success');
      } else {
        addToast(data?.error || 'Failed to update settlement mode.', 'error');
      }
    } catch (e) {
      addToast(e.message || 'Error updating settlement mode.', 'error');
    } finally {
      setIsTogglingMode(false);
    }
  };

  const getCurrencySymbol = (cur) => {
    switch (cur) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      case 'INR':
      default: return '₹';
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SETTLED':
        return <Badge variant="success">SETTLED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">PENDING BANK</Badge>;
      case 'HELD_FOR_REVIEW':
        return <Badge variant="warning" style={{ backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#F59E0B' }}>HELD FOR REVIEW</Badge>;
      case 'VERIFYING_AT_BANK':
        return <Badge variant="info">VERIFYING</Badge>;
      case 'REJECTED_BY_BANK':
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      case 'VOIDED':
        return <Badge variant="neutral">VOIDED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="saamx-page-container" style={{ padding: density === 'compact' ? '12px 16px 104px' : '20px 24px 104px', maxWidth: '1440px', margin: '0 auto' }}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: density === 'compact' ? '16px' : '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: density === 'compact' ? '38px' : '44px',
              height: density === 'compact' ? '38px' : '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-subtle, rgba(59, 130, 246, 0.1))',
              color: 'var(--color-primary, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              <IconBuilding size={density === 'compact' ? 20 : 24} />
            </div>
            <div>
              <h1 style={{ fontSize: density === 'compact' ? '1.45rem' : '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                {isTeam ? 'Investment House Bank Desk' : 'Physical Bank Desk & Settlement Workstation'}
              </h1>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: density === 'compact' ? '0.82rem' : '0.9rem' }}>
                {isTeam
                  ? `Voucher settlement portal for Investment House ${sessionTeamCode}`
                  : 'Floor banking clearance, paper voucher verification, cash collection & proceeds disbursement'}
              </p>
            </div>
          </div>
        </div>

        {/* Status / Settlement Mode Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: density === 'compact' ? '6px 12px' : '8px 16px',
            borderRadius: '8px',
            backgroundColor: currentMode === 'TWO_PHASE_BANK' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${currentMode === 'TWO_PHASE_BANK' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Settlement Engine:</span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: currentMode === 'TWO_PHASE_BANK' ? 'var(--color-primary, #3B82F6)' : 'var(--color-rise, #10B981)'
            }}>
              {currentMode === 'TWO_PHASE_BANK' ? 'TWO-PHASE (PHYSICAL BANK)' : 'INSTANT (AUTOMATIC)'}
            </span>
          </div>

          {isStaff && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: density === 'compact' ? '4px 8px' : '6px 12px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Desk Scope:</span>
              <select
                value={bankDeskFilter}
                onChange={(e) => setBankDeskFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Desks (BANK_1 &amp; BANK_2)</option>
                <option value="BANK_1">Bank Desk 1 Only</option>
                <option value="BANK_2">Bank Desk 2 Only</option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.hash = '#/desk-dashboard'; }}
            style={{ fontWeight: 700 }}
            title="Open Multi-Desk Queue Dashboard"
          >
            Desk Queue Dashboard
          </Button>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleMode}
              disabled={isTogglingMode}
            >
              {currentMode === 'INSTANT' ? '⚡ Switch to Two-Phase Bank' : '🔄 Switch to Instant'}
            </Button>
          )}
        </div>
      </div>

      {/* Mode Advisory Banner */}
      {currentMode === 'INSTANT' && isStaff && (
        <Alert variant="info" style={{ marginBottom: '20px' }}>
          <strong>Compatibility Mode Notice:</strong> SAAMX is currently operating in <strong>INSTANT</strong> settlement mode. Trades clear cash and transfer shares automatically upon exchange execution. Switch to <strong>TWO_PHASE_BANK</strong> mode to enforce the physical paper slip cash-settlement desk workflow for the event.
        </Alert>
      )}

      {isTeam && (
        <Alert variant="info" style={{ marginBottom: '20px' }}>
          <strong>Floor Trading Protocol:</strong> Bring your physical trade slips signed by your Investment House to the Central Bank Desk on the floor. For <strong>BUY</strong> orders, pay cash to receive your holdings. For <strong>SELL</strong> orders, present your voucher to collect your currency proceeds.
        </Alert>
      )}

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {!isTeam && (
          <>
            <button
              onClick={() => setActiveTab('pending-payments')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'pending-payments' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'pending-payments' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Pending Payments (Buy Slips)
              {pendingPayments.length > 0 && (
                <span className="tabular-nums font-data" style={{
                  marginLeft: '8px',
                  backgroundColor: 'var(--color-fall, #EF4444)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {pendingPayments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pending-proceeds')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'pending-proceeds' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'pending-proceeds' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Pending Proceeds (Sell Receipts)
              {pendingProceeds.length > 0 && (
                <span className="tabular-nums font-data" style={{
                  marginLeft: '8px',
                  backgroundColor: 'var(--color-primary, #3B82F6)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {pendingProceeds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'history' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Settlement History
            </button>

            <button
              onClick={() => setActiveTab('reconciliation')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'reconciliation' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'reconciliation' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Reconciliation Audit
            </button>
          </>
        )}

        {isTeam && (
          <>
            <button
              onClick={() => setActiveTab('my-vouchers')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'my-vouchers' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'my-vouchers' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Active Vouchers ({pendingPayments.length + pendingProceeds.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: density === 'compact' ? '8px 14px' : '10px 18px',
                fontWeight: 700,
                fontSize: density === 'compact' ? '0.85rem' : '0.92rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === 'history' ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              Settlement Records
            </button>
          </>
        )}
      </div>

      {/* TAB 1: PENDING PAYMENTS (BUY SLIPS) */}
      {activeTab === 'pending-payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Physical Cash Collection Queue ({pendingPayments.length})
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Teams must hand over cash before purchased securities are transferred.
            </span>
          </div>

          {pendingPayments.length === 0 ? (
            <Card variant="frosted" density={density}>
              <CardBody>
                <EmptyState
                  icon={IconCheck}
                  title="No Pending Payments"
                  description="All executed buy orders have been settled or no trades are currently awaiting payment."
                />
              </CardBody>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: density === 'compact' ? '10px' : '16px' }}>
              {pendingPayments.map(s => {
                const curSym = getCurrencySymbol(s.currency);
                return (
                  <Card key={s.id} variant="frosted" density={density} style={{ borderLeft: '5px solid var(--color-warning, #F59E0B)', backgroundColor: 'var(--color-surface)' }}>
                    <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Badge variant="warning">PAY_IN (Cash Collection)</Badge>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309' }}>
                          {s.bankDeskId === 'BANK_2' ? 'Bank Desk 2' : 'Bank Desk 1'}
                        </span>
                        <span className="tabular-nums font-data" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                          Ticket #{s.ticketNumber || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrintableVoucherItem(s)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '0.74rem', fontWeight: 700 }}
                          title="Print Floor Voucher"
                        >
                          <IconPrinter size={13} />
                          <span>Print</span>
                        </Button>
                        <span className="tabular-nums font-data" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(s.executedAt || s.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          Team {s.teamCode}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          BUY <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity?.toLocaleString()}</span> × {s.ticker} ({s.securityName})
                        </div>
                      </div>

                      <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-surface-subtle)',
                        marginBottom: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Execution Price:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{curSym}{s.price?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Amount to Collect:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-fall)', fontFamily: 'var(--font-mono)' }}>
                            {curSym}{s.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Voucher Ref:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{s.voucherReference}</span>
                        </div>
                      </div>

                      {s.notes && s.status === 'HELD_FOR_REVIEW' && (
                        <div style={{ marginBottom: '10px', padding: '6px 10px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '0.8rem', fontWeight: 600 }}>
                          Hold Notice: {s.notes}
                        </div>
                      )}
                      {canSettle && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="primary"
                            style={{ flex: 1, backgroundColor: 'var(--color-rise, #10B981)', borderColor: 'var(--color-rise, #10B981)', color: '#FFFFFF', fontWeight: 800 }}
                            onClick={() => {
                              setSettleModalItem(s);
                              setVoucherSlipInput(s.voucherReference);
                            }}
                          >
                            ✓ Confirm Cash Received
                          </Button>
                          <Button
                            variant="outline"
                            style={{ borderColor: 'var(--color-warn, #EA580C)', color: 'var(--color-warn, #EA580C)', fontWeight: 700 }}
                            onClick={() => {
                              setHoldModalItem(s);
                              setHoldNotesInput(s.notes || '');
                            }}
                          >
                            ⏸ Hold
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              setRejectModalItem(s);
                              setRejectionReasonInput('');
                            }}
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING PROCEEDS (SELL SLIPS) */}
      {activeTab === 'pending-proceeds' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Proceeds Disbursement Queue ({pendingProceeds.length})
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Disburse cash proceeds to teams presenting verified sale receipts.
            </span>
          </div>

          {pendingProceeds.length === 0 ? (
            <Card variant="frosted" density={density}>
              <CardBody>
                <EmptyState
                  icon={IconCheck}
                  title="No Pending Proceeds"
                  description="All executed sell orders have had their proceeds disbursed."
                />
              </CardBody>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: density === 'compact' ? '10px' : '16px' }}>
              {pendingProceeds.map(s => {
                const curSym = getCurrencySymbol(s.currency);
                return (
                  <Card key={s.id} variant="frosted" density={density} style={{ borderLeft: '5px solid var(--color-primary, #3B82F6)', backgroundColor: 'var(--color-surface)' }}>
                    <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Badge variant="primary">PAY_OUT (Disbursement)</Badge>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                          {s.bankDeskId === 'BANK_2' ? 'Bank Desk 2' : 'Bank Desk 1'}
                        </span>
                        <span className="tabular-nums font-data" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                          Ticket #{s.ticketNumber || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrintableVoucherItem(s)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '0.74rem', fontWeight: 700 }}
                          title="Print Floor Voucher"
                        >
                          <IconPrinter size={13} />
                          <span>Print</span>
                        </Button>
                        <span className="tabular-nums font-data" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(s.executedAt || s.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          Team {s.teamCode}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          SOLD <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity?.toLocaleString()}</span> × {s.ticker} ({s.securityName})
                        </div>
                      </div>

                      <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-surface-subtle)',
                        marginBottom: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Execution Price:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{curSym}{s.price?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Cash to Disburse:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-rise)', fontFamily: 'var(--font-mono)' }}>
                            {curSym}{s.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Voucher Ref:</span>
                          <span className="tabular-nums font-data" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{s.voucherReference}</span>
                        </div>
                      </div>

                      {s.notes && s.status === 'HELD_FOR_REVIEW' && (
                        <div style={{ marginBottom: '10px', padding: '6px 10px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '0.8rem', fontWeight: 600 }}>
                          Hold Notice: {s.notes}
                        </div>
                      )}
                      {canSettle && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="primary"
                            style={{ flex: 1, backgroundColor: 'var(--color-primary, #3B82F6)', color: '#FFFFFF', fontWeight: 800 }}
                            onClick={() => {
                              setSettleModalItem(s);
                              setVoucherSlipInput(s.voucherReference);
                            }}
                          >
                            💵 Disburse Cash Proceeds
                          </Button>
                          <Button
                            variant="outline"
                            style={{ borderColor: 'var(--color-warn, #EA580C)', color: 'var(--color-warn, #EA580C)', fontWeight: 700 }}
                            onClick={() => {
                              setHoldModalItem(s);
                              setHoldNotesInput(s.notes || '');
                            }}
                          >
                            ⏸ Hold
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              setRejectModalItem(s);
                              setRejectionReasonInput('');
                            }}
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: TEAM PARTICIPANT ACTIVE VOUCHERS */}
      {activeTab === 'my-vouchers' && isTeam && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
              Your Outstanding Bank Vouchers
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Take your signed trade slips to the physical Bank Desk on the floor to settle payments and collect cash.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: density === 'compact' ? '12px' : '20px' }}>
            {/* Payment Vouchers */}
            <Card variant="frosted" density={density}>
              <CardHeader>
                <CardTitle>To Pay (Buy Slips)</CardTitle>
              </CardHeader>
              <CardBody>
                {pendingPayments.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    No outstanding payments due. All buy orders settled.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingPayments.map(s => {
                      const curSym = getCurrencySymbol(s.currency);
                      return (
                        <div key={s.id} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface-subtle)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>BUY <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity}</span> {s.ticker}</span>
                            <Badge variant="warning">AWAITING PAYMENT</Badge>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Ticket #{s.ticketNumber} • Ref: <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.voucherReference}</span>
                          </div>
                          <div className="tabular-nums font-data" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-fall)', fontFamily: 'var(--font-mono)' }}>
                            Pay at Bank: {curSym}{s.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Proceeds Receipts */}
            <Card variant="frosted" density={density}>
              <CardHeader>
                <CardTitle>To Collect (Sale Receipts)</CardTitle>
              </CardHeader>
              <CardBody>
                {pendingProceeds.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    No proceeds awaiting collection.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingProceeds.map(s => {
                      const curSym = getCurrencySymbol(s.currency);
                      return (
                        <div key={s.id} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface-subtle)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>SOLD <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity}</span> {s.ticker}</span>
                            <Badge variant="primary">AWAITING COLLECTION</Badge>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            Ticket #{s.ticketNumber} • Ref: <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.voucherReference}</span>
                          </div>
                          <div className="tabular-nums font-data" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-rise)', fontFamily: 'var(--font-mono)' }}>
                            Collect Cash: {curSym}{s.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENT HISTORY */}
      {activeTab === 'history' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '240px' }}>
              <Input
                placeholder="Search by ticket #, voucher ref, team, ticker..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ width: '180px' }}>
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="SETTLED">Settled</option>
                <option value="PENDING">Pending</option>
                <option value="HELD_FOR_REVIEW">Held For Review</option>
                <option value="VERIFYING_AT_BANK">Verifying</option>
                <option value="REJECTED_BY_BANK">Rejected by Bank</option>
                <option value="REJECTED">Rejected</option>
                <option value="VOIDED">Voided</option>
              </Select>
            </div>
          </div>

          <Card variant="frosted" density={density}>
            <CardBody style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: density === 'compact' ? '0.82rem' : '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Ticket #</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Team</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Type</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Desk</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Security</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Voucher Ref</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Settled / Operator</th>
                      <th style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No settlement records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(s => {
                        const curSym = getCurrencySymbol(s.currency);
                        const dir = s.direction || (s.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT');
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td className="tabular-nums font-data" style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                              #{s.ticketNumber || 'N/A'}
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {s.teamCode}
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px' }}>
                              <Badge variant={dir === 'PAY_IN' ? 'warning' : 'primary'}>
                                {dir}
                              </Badge>
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: s.bankDeskId === 'BANK_2' ? '#DBEAFE' : '#FEF3C7', color: s.bankDeskId === 'BANK_2' ? '#1E40AF' : '#B45309' }}>
                                {s.bankDeskId || 'BANK_1'}
                              </span>
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{s.ticker}</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                                <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity?.toLocaleString()}</span> @ {curSym}<span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{s.price?.toLocaleString()}</span>
                              </span>
                            </td>
                            <td className="tabular-nums font-data" style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', textAlign: 'right', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                              {curSym}{s.totalAmount?.toLocaleString()}
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px' }}>
                              {renderStatusBadge(s.status)}
                            </td>
                            <td className="tabular-nums font-data" style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                              {s.voucherReference}
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                              {s.settledBy ? `${s.settledBy}` : s.rejectedBy ? `Rejected: ${s.rejectedBy}` : '—'}
                              {s.settledAt && <span className="tabular-nums font-data" style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{new Date(s.settledAt).toLocaleTimeString()}</span>}
                            </td>
                            <td style={{ padding: density === 'compact' ? '8px 12px' : '12px 16px', whiteSpace: 'nowrap' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setInspectModalItem(s)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPrintableVoucherItem(s)}
                                style={{ marginLeft: '6px' }}
                                title="Print Floor Voucher"
                              >
                                <IconPrinter size={13} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 4: RECONCILIATION AUDIT (STAFF ONLY) */}
      {activeTab === 'reconciliation' && isStaff && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Central Exchange vs Bank Desk Ledger Audit
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Automated continuous reconciliation detecting trade omissions, currency discrepancies, and unbacked settlements.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchReconciliation}
              disabled={isLoadingReconciliation}
            >
              🔄 Refresh Audit
            </Button>
          </div>

          {reconciliationData ? (
            <div>
              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: density === 'compact' ? '10px' : '16px', marginBottom: '24px' }}>
                <Card variant="frosted" density={density}>
                  <CardBody>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Audit Status</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: reconciliationData.status === 'HEALTHY' ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)' }}>
                      {reconciliationData.status === 'HEALTHY' ? '✓ HEALTHY' : '⚠ DISCREPANCY'}
                    </div>
                  </CardBody>
                </Card>

                <Card variant="frosted" density={density}>
                  <CardBody>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Trades Executed</div>
                    <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {reconciliationData.summary?.totalTradesExecuted}
                    </div>
                  </CardBody>
                </Card>

                <Card variant="frosted" density={density}>
                  <CardBody>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Settlements Created</div>
                    <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {reconciliationData.summary?.totalSettlements}
                    </div>
                  </CardBody>
                </Card>

                <Card variant="frosted" density={density}>
                  <CardBody>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Settled Vouchers</div>
                    <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-rise)', fontFamily: 'var(--font-mono)' }}>
                      {reconciliationData.summary?.settledCount}
                    </div>
                  </CardBody>
                </Card>

                <Card variant="frosted" density={density}>
                  <CardBody>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Pending Clearance</div>
                    <div className="tabular-nums font-data" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
                      {reconciliationData.summary?.pendingCount}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Settled Amounts by Currency */}
              <Card variant="frosted" density={density} style={{ marginBottom: '24px' }}>
                <CardHeader>
                  <CardTitle>Total Settled Amounts by Currency</CardTitle>
                </CardHeader>
                <CardBody>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {Object.entries(reconciliationData.summary?.settledAmountsByCurrency || {}).map(([cur, amt]) => {
                      const sym = getCurrencySymbol(cur);
                      return (
                        <div key={cur} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{cur} Wallet Clearance</span>
                          <div className="tabular-nums font-data" style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-text-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                            {sym}{Number(amt || 0).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>

              {/* Discrepancies Table */}
              <Card variant="frosted" density={density}>
                <CardHeader>
                  <CardTitle>
                    Detected Discrepancies ({reconciliationData.discrepancies?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {!reconciliationData.discrepancies || reconciliationData.discrepancies.length === 0 ? (
                    <EmptyState
                      icon={IconCheck}
                      title="All Ledgers Balanced"
                      description="Zero discrepancies detected between Central Exchange trade executions and Bank Desk settlements."
                    />
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                          <th style={{ padding: '10px' }}>Type</th>
                          <th style={{ padding: '10px' }}>Subject</th>
                          <th style={{ padding: '10px' }}>Discrepancy Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliationData.discrepancies.map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                            <td style={{ padding: '10px' }}>
                              <Badge variant="danger">{d.type}</Badge>
                            </td>
                            <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {d.transactionId || d.settlementId || d.teamCode || 'System'}
                            </td>
                            <td style={{ padding: '10px', color: 'var(--color-fall)' }}>
                              {d.detail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              Loading reconciliation report...
            </div>
          )}
        </div>
      )}

      {/* MODAL: CONFIRM SETTLEMENT */}
      {settleModalItem && (
        <Modal
          isOpen={Boolean(settleModalItem)}
          onClose={() => setSettleModalItem(null)}
          title={`Confirm Bank Settlement: Ticket #${settleModalItem.ticketNumber}`}
        >
          <div style={{ marginBottom: '16px' }}>
            <DigitalBankSlip voucher={settleModalItem} />
            <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
              Confirm physical processing for <strong>Team {settleModalItem.teamCode}</strong>:
            </p>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-surface-subtle)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-primary)' }}><strong>Action:</strong> {settleModalItem.action} <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{settleModalItem.quantity}</span> units of {settleModalItem.ticker}</div>
              <div style={{ color: 'var(--color-text-primary)', marginTop: '4px' }}><strong>Total Amount:</strong> <span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{getCurrencySymbol(settleModalItem.currency)}{settleModalItem.totalAmount?.toLocaleString()} {settleModalItem.currency}</span></div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}><strong>Settlement Type:</strong> {settleModalItem.type === 'PAYMENT_COLLECTION' ? 'Payment Collection (Cash from Team)' : 'Proceeds Disbursement (Cash to Team)'}</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                Bank Voucher Reference / Physical Receipt #:
              </label>
              <Input
                value={voucherSlipInput}
                onChange={e => setVoucherSlipInput(e.target.value)}
                placeholder="Enter physical voucher slip number..."
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                Teller Notes (Optional):
              </label>
              <Input
                value={settleNotesInput}
                onChange={e => setSettleNotesInput(e.target.value)}
                placeholder="e.g. Paid in cash 500x100 notes verified"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setSettleModalItem(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSettle}
              disabled={isSubmittingSettle}
            >
              {isSubmittingSettle ? 'Processing...' : 'Confirm & Complete Settlement'}
            </Button>
          </div>
        </Modal>
      )}

      {/* MODAL: REJECT SETTLEMENT */}
      {rejectModalItem && (
        <Modal
          isOpen={Boolean(rejectModalItem)}
          onClose={() => setRejectModalItem(null)}
          title={`Reject Settlement: Ticket #${rejectModalItem.ticketNumber}`}
        >
          <div style={{ marginBottom: '16px' }}>
            <Alert variant="warning" style={{ marginBottom: '14px' }}>
              Rejecting this settlement will restore the reserved cash (for BUY) or surrendered shares (for SELL) back to Team {rejectModalItem.teamCode}.
            </Alert>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                Reason for Rejection (Required):
              </label>
              <Input
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Team failed to present cash payment within 15 minutes"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setRejectModalItem(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={isSubmittingReject || !rejectionReasonInput.trim()}
            >
              {isSubmittingReject ? 'Rejecting...' : 'Reject Voucher'}
            </Button>
          </div>
        </Modal>
      )}

      {/* MODAL: HOLD VOUCHER FOR REVIEW */}
      {holdModalItem && (
        <Modal
          isOpen={Boolean(holdModalItem)}
          onClose={() => setHoldModalItem(null)}
          title={`Hold Voucher: #${holdModalItem.ticketNumber || holdModalItem.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Alert variant="warning">
              Placing this settlement voucher on hold pauses payout/collection processing until compliance or audit review is resolved.
              An explicit hold reason/note is required.
            </Alert>

            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                Settlement Target
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Ticket #{holdModalItem.ticketNumber || 'N/A'} • Team {holdModalItem.teamCode} • {holdModalItem.action} {holdModalItem.quantity} × {holdModalItem.ticker}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Hold Justification / Review Notes <span style={{ color: 'var(--color-loss)' }}>*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Physical slip signature mismatch, pending cash recount, compliance check..."
                value={holdNotesInput}
                onChange={e => setHoldNotesInput(e.target.value)}
                disabled={isSubmittingHold}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setHoldModalItem(null)} disabled={isSubmittingHold}>
                Cancel
              </Button>
              <Button
                variant="warning"
                onClick={handleConfirmHold}
                disabled={isSubmittingHold || !holdNotesInput.trim()}
                style={{ fontWeight: 800 }}
              >
                {isSubmittingHold ? 'Holding...' : 'Confirm Hold'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: INSPECT SETTLEMENT */}
      {inspectModalItem && (
        <Modal
          isOpen={Boolean(inspectModalItem)}
          onClose={() => setInspectModalItem(null)}
          title={`Settlement Details: ${inspectModalItem.voucherReference || inspectModalItem.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DigitalBankSlip voucher={inspectModalItem} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
              <span>{renderStatusBadge(inspectModalItem.status)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Physical Ticket:</span>
              <span className="tabular-nums font-data" style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>#{inspectModalItem.ticketNumber || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Team:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{inspectModalItem.teamCode}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Direction:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{inspectModalItem.action} ({inspectModalItem.type})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Instrument:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}><span className="tabular-nums font-data" style={{ fontFamily: 'var(--font-mono)' }}>{inspectModalItem.quantity?.toLocaleString()}</span> × {inspectModalItem.ticker}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Value:</span>
              <span className="tabular-nums font-data" style={{ fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                {getCurrencySymbol(inspectModalItem.currency)}{inspectModalItem.totalAmount?.toLocaleString()} {inspectModalItem.currency}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Executed At:</span>
              <span className="tabular-nums font-data" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{inspectModalItem.executedAt ? new Date(inspectModalItem.executedAt).toLocaleString() : '—'}</span>
            </div>
            {inspectModalItem.settledAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Settled At / By:</span>
                <span className="tabular-nums font-data" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{new Date(inspectModalItem.settledAt).toLocaleTimeString()} by {inspectModalItem.settledBy}</span>
              </div>
            )}
            {inspectModalItem.rejectionReason && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Rejection Reason:</span>
                <span style={{ color: 'var(--color-fall)' }}>{inspectModalItem.rejectionReason}</span>
              </div>
            )}
            {inspectModalItem.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Teller Notes:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{inspectModalItem.notes}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <Button
              variant="outline"
              onClick={() => {
                const item = inspectModalItem;
                setInspectModalItem(null);
                setPrintableVoucherItem(item);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <IconPrinter size={15} />
              <span>Print Slip</span>
            </Button>
            <Button variant="secondary" onClick={() => setInspectModalItem(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Printable Voucher Modal */}
      <PrintableVoucherModal
        isOpen={Boolean(printableVoucherItem)}
        onClose={() => setPrintableVoucherItem(null)}
        voucher={printableVoucherItem}
      />
    </div>
  );
}
