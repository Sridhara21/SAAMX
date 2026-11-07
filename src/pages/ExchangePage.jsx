import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  OrderStatusBadge,
  StationBadge,
  Modal,
  ToastContainer,
  CurrencyDisplay,
  PriceDisplay,
  QuantityDisplay,
  EmptyState,
  Alert,
  Spinner
} from '../components/ui/index.js';
import {
  IconBuilding,
  IconLock,
  IconFileText,
  IconZap,
  IconX,
  IconShieldCheck,
  IconCheck,
  IconBarChart,
  IconClipboardList,
  IconClock,
  IconSearch,
  IconLogOut,
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconFilter,
  IconPrinter
} from '../lib/icons.jsx';
import { CURRENCY_SYMBOLS } from '../lib/formatters.js';
import PrintableVoucherModal from '../components/PrintableVoucherModal.jsx';

export default function ExchangePage({ state, onOpenProfile, adminPassword, connected, isCoordinatorOffline }) {
  const { density } = useDensity();
  const sessionState = state?.marketState?.sessionState || 'PRE_OPEN';
  const isTradingDisabled = !connected || isCoordinatorOffline || sessionState !== 'CONTINUOUS_TRADING';

  const [activeDeskId, setActiveDeskId] = useState('DESK_1');
  const [staffName, setStaffName] = useState('Desk Operator');
  const [assignedDesk, setAssignedDesk] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const DESK_META = {
    DESK_1: { name: 'Order Desk 1 (Blue)', color: '#3B82F6' },
    DESK_2: { name: 'Order Desk 2 (Amber)', color: '#F59E0B' },
    DESK_3: { name: 'Order Desk 3 (Emerald)', color: '#10B981' },
    DESK_4: { name: 'Order Desk 4 (Purple)', color: '#8B5CF6' },
    DESK_5: { name: 'Order Desk 5 (Crimson)', color: '#EC4899' }
  };

  const dynamicDesks = useMemo(() => {
    const dObj = {};
    ['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'].forEach(dId => {
      const stateDesk = state?.orderDesks?.[dId];
      const meta = DESK_META[dId];
      dObj[dId] = {
        id: dId,
        name: stateDesk?.name || meta.name,
        color: stateDesk?.color || meta.color,
        operator: stateDesk?.operatorDisplayName || stateDesk?.operator || 'Unassigned',
        operatorUsername: stateDesk?.operatorUsername || null,
        totalProcessed: stateDesk?.totalProcessed || 0
      };
    });
    return dObj;
  }, [state?.orderDesks]);

  // Dynamic session resolution & strict desk station binding
  useEffect(() => {
    const initAuth = async () => {
      const storedRole = sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role');
      const storedUsername = sessionStorage.getItem('saamx_username') || sessionStorage.getItem('fms_username');
      const storedDesk = sessionStorage.getItem('saamx_assigned_desk');
      const isMaster = sessionStorage.getItem('saamx_is_master') === 'true' || storedUsername?.toLowerCase() === 'sridhara';

      let perms = [];
      try {
        const rawP = sessionStorage.getItem('saamx_permissions');
        if (rawP) perms = JSON.parse(rawP);
      } catch (e) {}

      const hasSupervisoryAccess = isMaster || storedRole === 'admin' || storedRole === 'super_admin' || perms.includes('desks.cross_operate');
      setIsSupervisor(hasSupervisoryAccess);

      try {
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated) {
            const userDesk = meData.assignedDesk;
            setAssignedDesk(userDesk);
            const supervisorCheck = meData.role === 'admin' || meData.role === 'super_admin' || meData.username?.toLowerCase() === 'sridhara' || (meData.permissions || []).includes('desks.cross_operate');
            setIsSupervisor(supervisorCheck);
            if (userDesk) {
              setActiveDeskId(userDesk);
              sessionStorage.setItem('saamx_assigned_desk', userDesk);
            } else if (!supervisorCheck) {
              setActiveDeskId('UNASSIGNED');
            }
            setStaffName(meData.displayName || meData.username || 'Desk Operator');
            return;
          }
        }
      } catch (err) {}

      if (storedDesk) {
        setAssignedDesk(storedDesk);
        setActiveDeskId(storedDesk);
      } else if (!hasSupervisoryAccess) {
        setActiveDeskId('UNASSIGNED');
      }
      setStaffName(sessionStorage.getItem('fms_displayName') || storedUsername || 'Desk Operator');
    };
    initAuth();
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

  // Review & Verification Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [physicalSlipChecked, setPhysicalSlipChecked] = useState(false);

  // Return for Correction Modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returningOrder, setReturningOrder] = useState(null);

  // Rejection Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingOrder, setRejectingOrder] = useState(null);

  // Settlement Voucher Printable Modal state
  const [voucherModalItem, setVoucherModalItem] = useState(null);

  // Form errors & feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [toasts, setToasts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-order in-flight processing state to prevent duplicate clicks and race conditions
  const [processingOrderIds, setProcessingOrderIds] = useState(new Set());

  const setOrderProcessing = (orderId, isProc) => {
    setProcessingOrderIds(prev => {
      const next = new Set(prev);
      if (isProc) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  };

  // Keyboard shortcut listener for Escape key to close active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowReviewModal(false);
        setShowReturnModal(false);
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // References
  const ticketRef = useRef(null);
  const tickerRef = useRef(null);
  const qtyRef = useRef(null);

  // Security selector helper matching search queries (optimized with early break)
  const matchedSecurities = useMemo(() => {
    const q = tickerQuery.trim().toLowerCase();
    if (!q || selectedSec) return [];
    const secs = Array.isArray(state?.securities) ? state.securities : Object.values(state?.securities || {});
    const matches = [];
    for (let i = 0; i < secs.length && matches.length < 8; i++) {
      const s = secs[i];
      if (s.ticker?.toLowerCase().startsWith(q) || s.name?.toLowerCase().includes(q)) {
        matches.push(s);
      }
    }
    return matches;
  }, [tickerQuery, selectedSec, state?.securities]);

  const handleSecSelect = (sec) => {
    setSelectedSec(sec);
    setTickerQuery(`${sec.ticker} — ${sec.name}`);
    setErrorMsg('');
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Submit Paper Ticket Order
  const handleOrderSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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

    setIsSubmitting(true);
    const orderBody = {
      ticketNumber: ticketNumber.trim(),
      teamCode: teamCode.trim().toUpperCase(),
      ticker: selectedSec.ticker,
      action,
      quantity: Number(quantity),
      orderType: 'MARKET',
      limitPrice: null,
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
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setErrorMsg(data.error || `HTTP ${res.status}: Submission failed`);
      } else {
        addToast(`Physical Ticket #${data.order?.ticketNumber || ticketNumber} logged to ${activeDeskId}!`, 'success');
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
    if (processingOrderIds.has(orderId)) return;
    setOrderProcessing(orderId, true);
    try {
      const res = await apiFetch('/api/order/claim', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          deskId: activeDeskId,
          operator: staffName
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Claim Failed: ${data.error || res.statusText}`, 'error');
      } else {
        addToast(`Order claimed by ${dynamicDesks[activeDeskId]?.name || activeDeskId}!`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error claiming order.', 'error');
    } finally {
      setOrderProcessing(orderId, false);
    }
  };

  // Open detailed review & physical slip inspection modal
  const openReviewModal = (order) => {
    setReviewOrder(order);
    setPhysicalSlipChecked(Boolean(order.physicalSlipChecked));
    setShowReviewModal(true);
  };

  // 2. Validate Order against Risk Controls (authoritative server validation)
  const handleValidateOrder = async (orderId, confirmedSlip = null) => {
    if (processingOrderIds.has(orderId)) return;
    setOrderProcessing(orderId, true);
    const isSlipConfirmed = confirmedSlip !== null ? confirmedSlip : physicalSlipChecked;
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'VALIDATE',
          deskId: activeDeskId,
          operator: staffName,
          physicalSlipChecked: isSlipConfirmed
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Validation Failed: ${data.error || res.statusText}`, 'error');
      } else {
        addToast(`Ticket #${reviewOrder?.ticketNumber || 'Slip'} verified & validated! Ready for floor execution.`, 'success');
        setShowReviewModal(false);
        setReviewOrder(null);
      }
    } catch (err) {
      console.error(err);
      addToast('Network error validating order.', 'error');
    } finally {
      setOrderProcessing(orderId, false);
    }
  };

  // 3. Execute Order from Queue (Atomic Execution)
  const handleExecuteOrder = async (orderId, confirmedSlip = null) => {
    if (processingOrderIds.has(orderId)) return;
    setOrderProcessing(orderId, true);
    const isSlipConfirmed = confirmedSlip !== null ? confirmedSlip : physicalSlipChecked;
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'EXECUTE',
          deskId: activeDeskId,
          operator: staffName,
          physicalSlipChecked: isSlipConfirmed
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Execution Failed: ${data.error || res.statusText}`, 'error');
      } else {
        const voucherNotice = data.settlement?.voucherReference ? ` [Voucher: ${data.settlement.voucherReference}]` : '';
        addToast(`Order executed successfully! TX: ${data.transaction?.id || 'OK'}${voucherNotice}`, 'success');
        if (showReviewModal) {
          setShowReviewModal(false);
          setReviewOrder(null);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Network error executing order.', 'error');
    } finally {
      setOrderProcessing(orderId, false);
    }
  };

  // 3b. Accept Order & Route to Bank (Merged Desk Review)
  const handleAcceptOrder = async (orderId, confirmedSlip = null) => {
    if (processingOrderIds.has(orderId)) return;
    setOrderProcessing(orderId, true);
    const isSlipConfirmed = confirmedSlip !== null ? confirmedSlip : physicalSlipChecked;
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'ACCEPT',
          deskId: activeDeskId,
          operator: staffName,
          physicalSlipChecked: isSlipConfirmed
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Accept Failed: ${data.error || res.statusText}`, 'error');
      } else {
        const bankNotice = data.settlement?.bankDeskId ? ` [Routed to ${data.settlement.bankDeskId}]` : ' [Routed to Bank]';
        addToast(`Order accepted & routed to bank review! TX: ${data.transaction?.id || 'OK'}${bankNotice}`, 'success');
        
        // Open printable floor voucher modal atomically
        if (data.settlement) {
          setVoucherModalItem(data.settlement);
        } else if (data.voucherReference) {
          const ord = (state?.orders || []).find(o => o.id === orderId) || reviewOrder;
          setVoucherModalItem({
            voucherReference: data.voucherReference,
            orderId,
            bankDeskId: data.bankDeskId || data.settlement?.bankDeskId || 'BANK_1',
            ticketNumber: ord?.ticketNumber,
            teamCode: ord?.teamCode,
            action: ord?.action,
            direction: ord?.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT',
            ticker: ord?.ticker,
            quantity: ord?.quantity,
            price: data.transaction?.price || ord?.price,
            totalAmount: data.transaction?.totalConsideration || ((ord?.price || 0) * (ord?.quantity || 0)),
            currency: ord?.currency || 'INR',
            status: 'PENDING'
          });
        }

        if (showReviewModal) {
          setShowReviewModal(false);
          setReviewOrder(null);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Network error accepting order.', 'error');
    } finally {
      setOrderProcessing(orderId, false);
    }
  };

  // 4. Return for Correction Modal Handlers
  const openReturnModal = (order) => {
    setReturningOrder(order);
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!returnReason || !returnReason.trim()) {
      addToast('A mandatory return reason detailing the needed correction is required.', 'error');
      return;
    }

    const orderId = returningOrder?.id;
    if (orderId && processingOrderIds.has(orderId)) return;
    if (orderId) setOrderProcessing(orderId, true);

    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'RETURN_FOR_CORRECTION',
          returnReason: returnReason.trim(),
          deskId: activeDeskId,
          operator: staffName
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Return Failed: ${data.error || res.statusText}`, 'error');
      } else {
        addToast(`Ticket #${returningOrder.ticketNumber} returned to Team ${returningOrder.teamCode} for correction.`, 'info');
        setShowReturnModal(false);
        setShowReviewModal(false);
        setReturningOrder(null);
      }
    } catch (err) {
      console.error(err);
      addToast('Network error returning order.', 'error');
    } finally {
      if (orderId) setOrderProcessing(orderId, false);
    }
  };

  // 5. Reject Order Modal Handlers
  const openRejectModal = (order) => {
    setRejectingOrder(order);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rejectReason || !rejectReason.trim()) {
      addToast('A mandatory rejection reason is required.', 'error');
      return;
    }

    const orderId = rejectingOrder?.id;
    if (orderId && processingOrderIds.has(orderId)) return;
    if (orderId) setOrderProcessing(orderId, true);

    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          actionType: 'REJECT',
          rejectionReason: rejectReason.trim(),
          deskId: activeDeskId,
          operator: staffName
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        addToast(`Rejection Failed: ${data.error || res.statusText}`, 'error');
      } else {
        addToast(`Order #${rejectingOrder.ticketNumber} marked as REJECTED.`, 'error');
        setShowRejectModal(false);
        setShowReviewModal(false);
        setRejectingOrder(null);
      }
    } catch (err) {
      console.error(err);
      addToast('Network error rejecting order.', 'error');
    } finally {
      if (orderId) setOrderProcessing(orderId, false);
    }
  };

  // Filter queue orders
  const filteredOrders = useMemo(() => {
    return (state?.orders || []).filter(o => {
      let statusMatch = queueStatusFilter === 'ALL';
      if (queueStatusFilter === 'PENDING') statusMatch = ['QUEUED', 'SUBMITTED', 'PENDING', 'AWAITING_PHYSICAL_SLIP'].includes(o.status);
      else if (queueStatusFilter === 'VERIFYING') statusMatch = ['VERIFYING', 'BEING_VERIFIED', 'VERIFYING_AT_EXCHANGE'].includes(o.status);
      else if (queueStatusFilter === 'RETURNED_FOR_CORRECTION') statusMatch = o.status === 'RETURNED_FOR_CORRECTION';
      else if (queueStatusFilter === 'VALIDATED') statusMatch = ['VALIDATED', 'VERIFIED_AWAITING_EXCHANGE'].includes(o.status);
      else if (queueStatusFilter === 'EXECUTED') statusMatch = ['EXECUTED', 'SETTLED', 'EXECUTED_PENDING_SETTLEMENT', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status);
      else if (queueStatusFilter === 'REJECTED') statusMatch = ['REJECTED', 'SETTLEMENT_REJECTED', 'CANCELLED', 'REJECTED_BY_EXCHANGE', 'REJECTED_BY_BANK'].includes(o.status);
      else if (!statusMatch) statusMatch = o.status === queueStatusFilter;

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
  }, [state?.orders, queueStatusFilter, deskFilter, queueSearch, activeDeskId]);

  const queueCounts = useMemo(() => {
    const list = state?.orders || [];
    const pending = list.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'AWAITING_PHYSICAL_SLIP'].includes(o.status)).length;
    const verifying = list.filter(o => ['VERIFYING', 'BEING_VERIFIED', 'VERIFYING_AT_EXCHANGE'].includes(o.status)).length;
    const returned = list.filter(o => o.status === 'RETURNED_FOR_CORRECTION').length;
    const validated = list.filter(o => ['VALIDATED', 'VERIFIED_AWAITING_EXCHANGE'].includes(o.status)).length;
    const executed = list.filter(o => ['EXECUTED', 'SETTLED', 'EXECUTED_PENDING_SETTLEMENT', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status)).length;
    const rejected = list.filter(o => ['REJECTED', 'SETTLEMENT_REJECTED', 'CANCELLED', 'REJECTED_BY_EXCHANGE', 'REJECTED_BY_BANK'].includes(o.status)).length;
    return { total: list.length, pending, verifying, returned, validated, executed, rejected };
  }, [state?.orders]);

  const liveSecDetails = selectedSec ? (state?.securities || []).find(s => s.ticker === selectedSec.ticker) : null;
  const estimatedTotal = (liveSecDetails && quantity) ? (Number(quantity) * (liveSecDetails.currentPrice || liveSecDetails.basePrice || 0)) : 0;

  return (
    <div style={{ width: '100%', maxWidth: '1720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '20px', padding: density === 'compact' ? '8px 16px 104px' : '16px 24px 104px' }}>
      
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header & Operational Status Banner */}
      <Card variant="frosted" density={density} style={{ borderLeft: '6px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              <IconBuilding size={14} />
              <span>PHYSICAL TRADING FLOOR CLEARANCE</span>
              <span>•</span>
              <Badge variant={sessionState === 'CONTINUOUS_TRADING' ? 'gain' : 'warn'} size="sm">
                {sessionState.replace(/_/g, ' ')}
              </Badge>
            </div>
            <h1 style={{ fontSize: density === 'compact' ? '1.5rem' : '1.85rem', fontWeight: 900, fontFamily: 'var(--font-display, sans-serif)', margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Merged Verification &amp; Exchange Desk
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { window.location.hash = '#/desk-dashboard'; }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              title="Open Operator Queue &amp; Desk Telemetry Dashboard"
            >
              <IconClipboardList size={14} />
              <span>Queue Dashboard</span>
            </Button>
            <StationBadge deskId={activeDeskId} clerkName={staffName} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: density === 'compact' ? '4px 10px' : '6px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: (queueCounts.pending + queueCounts.verifying) > 0 ? 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))' : 'var(--color-surface-subtle)', border: `1px solid ${(queueCounts.pending + queueCounts.verifying) > 0 ? 'var(--color-warning, #D97706)' : 'var(--color-border-subtle)'}` }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>QUEUED TICKETS:</span>
              <span className="tabular-nums font-data" style={{ fontSize: '0.95rem', color: (queueCounts.pending + queueCounts.verifying) > 0 ? 'var(--color-warning, #D97706)' : 'var(--color-text-primary)', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                {queueCounts.pending + queueCounts.verifying}
              </span>
            </div>

            {queueCounts.returned > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: density === 'compact' ? '4px 10px' : '6px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: 'var(--color-fall-subtle, rgba(225, 29, 72, 0.1))', border: '1px solid var(--color-fall)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-fall)', fontWeight: 800 }}>RETURNED:</span>
                <span className="tabular-nums font-data" style={{ fontSize: '0.95rem', color: 'var(--color-fall)', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                  {queueCounts.returned}
                </span>
              </div>
            )}

            {queueCounts.validated > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: density === 'compact' ? '4px 10px' : '6px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: 'var(--color-rise-subtle, rgba(5, 150, 105, 0.1))', border: '1px solid var(--color-rise)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-rise)', fontWeight: 800 }}>READY TO EXECUTE:</span>
                <span className="tabular-nums font-data" style={{ fontSize: '0.95rem', color: 'var(--color-rise)', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                  {queueCounts.validated}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Unassigned Warning Alert if Operator Has No Station */}
      {activeDeskId === 'UNASSIGNED' && !isSupervisor && (
        <Alert variant="warning" title="Station Not Assigned">
          You have not been assigned to an active order desk. Please contact a floor supervisor or floor coordinator to assign your desk in Personnel Management.
        </Alert>
      )}

      {/* 5 Dynamic Desks Switcher Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: density === 'compact' ? '8px' : '10px' }}>
        {Object.values(dynamicDesks).map(d => {
          const isSelected = activeDeskId === d.id;
          const assignedOrders = (state?.orders || []).filter(o => o.deskId === d.id && ['VERIFYING', 'VALIDATED', 'VERIFYING_AT_EXCHANGE'].includes(o.status));
          const isMyStation = assignedDesk === d.id;
          const isDisabled = !isSupervisor && assignedDesk && assignedDesk !== d.id;

          return (
            <button
              key={d.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                setActiveDeskId(d.id);
                setStaffName(d.operator);
              }}
              style={{
                padding: density === 'compact' ? '8px 12px' : '12px 14px',
                borderRadius: 'var(--radius-md, 10px)',
                border: isSelected ? `2px solid ${d.color}` : '1px solid var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-surface)' : isDisabled ? 'var(--color-surface-subtle)' : 'var(--color-surface-elevated, var(--color-surface))',
                boxShadow: isSelected ? `0 2px 12px ${d.color}35` : 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.55 : 1,
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: d.color, letterSpacing: '0.04em' }}>
                  {d.name.toUpperCase()}
                </span>
                {assignedOrders.length > 0 && (
                  <span className="tabular-nums font-data" style={{ backgroundColor: d.color, color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 900, padding: '2px 7px', borderRadius: '10px', fontFamily: 'var(--font-mono)' }}>
                    {assignedOrders.length} ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {d.operator} {isMyStation ? '• (YOUR DESK)' : isSelected ? '• ACTIVE' : ''}
              </div>
              {isDisabled && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconLock size={12} />
                  <span>Station Locked</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3-Column Execution Desk Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 1.15fr) minmax(380px, 1.55fr) minmax(290px, 0.95fr)', gap: density === 'compact' ? '12px' : '18px', alignItems: 'start' }}>
        
        {/* COLUMN 1: Paper Order Intake Terminal */}
        <Card variant="frosted" density={density}>
          <CardHeader
            title="Physical Slip Intake"
            subtitle="Paper Ticket Logging & Desk Queue Assignment"
            action={<Badge variant="primary" size="sm">PHYSICAL SLIP</Badge>}
            icon={<IconFileText size={18} style={{ color: 'var(--color-primary)' }} />}
          />

          <form
            onSubmit={handleOrderSubmit}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleOrderSubmit(e);
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Ticket Number #"
                placeholder="e.g. 1042"
                numeric
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                ref={ticketRef}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px', width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Team Code <span style={{ color: 'var(--color-fall)' }}>*</span>
                </label>
                <select
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.90rem',
                    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select Team --</option>
                  {(state?.teams || []).map(t => (
                    <option key={t.teamCode || t.id} value={t.teamCode || t.id}>
                      {t.teamCode || t.id} — {t.teamName || t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset Search Input with Autocomplete Dropdown */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Search Security / Listing <span style={{ color: 'var(--color-fall)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Type ticker or company (e.g. RELI, INFY, AAPL)..."
                value={tickerQuery}
                onChange={(e) => {
                  setTickerQuery(e.target.value);
                  if (selectedSec) setSelectedSec(null);
                }}
                ref={tickerRef}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.90rem',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  outline: 'none'
                }}
              />

              {matchedSecurities.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 25,
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {matchedSecurities.map(s => (
                    <div
                      key={s.id || s.ticker}
                      style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-subtle)', fontSize: '0.86rem' }}
                      onClick={() => handleSecSelect(s)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <strong style={{ color: 'var(--color-primary)' }}>{s.ticker}</strong> — {s.name} ({s.exchange || 'SAAMX'})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BUY / SELL Action Toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Order Direction
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Button
                  type="button"
                  variant={action === 'BUY' ? 'success' : 'secondary'}
                  onClick={() => setAction('BUY')}
                  style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <IconTrendingUp size={15} />
                  <span>BUY (Long)</span>
                </Button>
                <Button
                  type="button"
                  variant={action === 'SELL' ? 'destructive' : 'secondary'}
                  onClick={() => setAction('SELL')}
                  style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <IconTrendingDown size={15} />
                  <span>SELL (Short)</span>
                </Button>
              </div>
            </div>

            {/* Quantity & Order Type Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={selectedSec?.lotSize && selectedSec.lotSize > 1 ? `Quantity (Units) [Lot: ${selectedSec.lotSize}]` : 'Quantity (Units)'}
                placeholder={selectedSec?.lotSize ? `Multiple of ${selectedSec.lotSize}` : 'e.g. 100'}
                numeric
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                ref={qtyRef}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px', width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Type
                </label>
                <div
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                    fontWeight: 700,
                    color: 'var(--color-rise, #10B981)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid var(--color-rise, #10B981)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚡ MARKET (Instant Execution)
                </div>
              </div>
            </div>

            {/* Estimated Consideration Widget */}
            {estimatedTotal > 0 && (
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Estimated Order Consideration ({selectedSec?.currency || 'INR'})
                </div>
                <div className="tabular-nums font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  <CurrencyDisplay value={estimatedTotal} currency={selectedSec?.currency || 'INR'} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Desk Notes (Optional)
              </label>
              <textarea
                placeholder="Paper slip notes, special desk annotations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
                  padding: '8px 12px',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {errorMsg && (
              <Alert variant="danger" title="Validation Error">
                {errorMsg}
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isTradingDisabled}
              style={{ width: '100%', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>Log & Clear Paper Order</span>
              <IconArrowRight size={16} />
            </Button>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '8px' }}>
              💡 Keyboard shortcut: Press <strong style={{ color: 'var(--color-primary)' }}>Ctrl + Enter</strong> to submit intake
            </div>
          </form>
        </Card>

        {/* COLUMN 2: Order Clearance & Execution Queue */}
        <Card variant="frosted" density={density}>
          <CardHeader
            title={`Clearance Queue (${filteredOrders.length})`}
            subtitle="Paper Slips Awaiting Desk Claim, Validation & Execution"
            icon={<IconClock size={18} style={{ color: 'var(--color-primary)' }} />}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={deskFilter}
                onChange={(e) => setDeskFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Desks</option>
                <option value="MY_DESK">My Desk ({dynamicDesks[activeDeskId]?.name || activeDeskId})</option>
                <option value="UNASSIGNED">Unassigned Queue</option>
                {Object.values(dynamicDesks).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses ({queueCounts.total})</option>
                <option value="PENDING">Awaiting Review ({queueCounts.pending})</option>
                <option value="VERIFYING">Under Desk Review ({queueCounts.verifying})</option>
                <option value="RETURNED_FOR_CORRECTION">Returned ({queueCounts.returned})</option>
                <option value="VALIDATED">Validated & Ready ({queueCounts.validated})</option>
                <option value="EXECUTED">Executed Trades ({queueCounts.executed})</option>
                <option value="REJECTED">Rejected Slips ({queueCounts.rejected})</option>
              </select>
            </div>
          </CardHeader>

          {/* Quick Queue Text Search */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="search"
              placeholder="Filter queue by slip #, team code, or ticker..."
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.84rem',
                backgroundColor: 'var(--color-surface-subtle)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm, 6px)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ maxHeight: density === 'compact' ? '680px' : '620px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '6px' : '10px' }}>
            {filteredOrders.length === 0 ? (
              <EmptyState
                icon={<IconFileText size={36} style={{ color: 'var(--color-text-muted)' }} />}
                title="No Orders in Queue"
                description="There are no physical order slips matching the selected queue filter."
              />
            ) : (
              filteredOrders.map(o => {
                const isClaimedByMe = o.deskId === activeDeskId;
                const isLockedByOther = o.lockedByDesk && o.lockedByDesk !== activeDeskId;
                const deskColor = o.deskId ? (dynamicDesks[o.deskId]?.color || '#3B82F6') : '#64748B';
                const isProcessing = processingOrderIds.has(o.id);

                return (
                  <Card
                    key={o.id}
                    variant="frosted"
                    density={density}
                    padding="sm"
                    style={{
                      borderLeft: `5px solid ${o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)'}`,
                      backgroundColor: 'var(--color-surface)',
                      padding: density === 'compact' ? '6px 10px' : '12px 16px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Slip Header & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: density === 'compact' ? '4px' : '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="tabular-nums font-data" style={{ fontSize: density === 'compact' ? '0.92rem' : '1rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                          #{o.ticketNumber}
                        </span>
                        <Badge variant="primary" size="sm">Team {o.teamCode}</Badge>
                        {o.deskId && (
                          <span style={{ fontSize: '0.70rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: `${deskColor}20`, color: deskColor }}>
                            {dynamicDesks[o.deskId]?.name || o.deskId}
                          </span>
                        )}
                      </div>
                      <OrderStatusBadge status={o.status} size="sm" />
                    </div>

                    {/* Order Details Body */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ fontWeight: 900, color: 'var(--color-primary)' }}>{o.ticker}</span>
                        <span style={{ margin: '0 6px', color: 'var(--color-border)' }}>•</span>
                        <span style={{ fontWeight: 800, color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                          {o.action}
                        </span>
                        <span style={{ margin: '0 6px', color: 'var(--color-border)' }}>•</span>
                        <QuantityDisplay value={o.quantity} suffix="units" />
                        {o.orderType === 'LIMIT' && o.limitPrice && (
                          <span className="tabular-nums font-data" style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                            (Limit ₹{o.limitPrice})
                          </span>
                        )}
                      </div>
                      <span className="tabular-nums font-data" style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(o.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Rejection / Return Reason Alerts */}
                    {o.rejectionReason && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-fall)', backgroundColor: 'var(--color-fall-subtle, rgba(225, 29, 72, 0.1))', padding: '6px 10px', borderRadius: '4px', marginTop: '8px', border: '1px solid var(--color-fall)' }}>
                        <strong>Rejection Reason:</strong> {o.rejectionReason}
                      </div>
                    )}

                    {o.status === 'RETURNED_FOR_CORRECTION' && (
                      <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))', borderRadius: '6px', border: '1px solid var(--color-warning, #D97706)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-warning, #D97706)' }}>
                          <IconLogOut size={13} />
                          <span>RETURNED FOR CORRECTION</span>
                          <span style={{ fontWeight: 600 }}>• Waiting for Team {o.teamCode} to resubmit</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                          <strong>Correction Required:</strong> {o.returnReason || 'Defect specified by desk operator'}
                        </div>
                      </div>
                    )}

                    {/* Stage 1: Awaiting Intake / Claim */}
                    {['QUEUED', 'SUBMITTED', 'PENDING', 'AWAITING_PHYSICAL_SLIP'].includes(o.status) && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isProcessing}
                          disabled={isTradingDisabled}
                          onClick={() => handleClaimOrder(o.id)}
                          style={{ flex: 1, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <IconZap size={14} />
                          <span>Claim Ticket ({dynamicDesks[activeDeskId]?.name || activeDeskId})</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => openReviewModal(o)}
                          style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Inspect digital order slip and team balance"
                        >
                          <IconFileText size={14} />
                          <span>Inspect</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => openRejectModal(o)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconX size={14} />
                          <span>Reject</span>
                        </Button>
                      </div>
                    )}

                    {/* Stage 2: Under Desk Review (Physical Slip Inspection) */}
                    {['VERIFYING', 'BEING_VERIFIED', 'VERIFYING_AT_EXCHANGE'].includes(o.status) && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                        {isClaimedByMe || !o.deskId ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              loading={isProcessing}
                              onClick={() => openReviewModal(o)}
                              style={{ flex: 1, minWidth: '150px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <IconShieldCheck size={14} />
                              <span>Review & Validate Slip</span>
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => openReturnModal(o)}
                              style={{ backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))', color: 'var(--color-warning, #D97706)', borderColor: 'var(--color-warning, #D97706)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <IconLogOut size={13} />
                              <span>Return</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => openRejectModal(o)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <IconX size={14} />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconLock size={13} />
                            <span>Ticket verification locked by {o.deskId} ({o.operator})</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stage 3: Slip Validated -> Ready for Floor Execution & Bank Routing */}
                    {['VALIDATED', 'VERIFIED_AWAITING_EXCHANGE'].includes(o.status) && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                        {!isLockedByOther ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-rise)', fontWeight: 800, marginBottom: '6px' }}>
                              <IconCheck size={14} />
                              <span>PHYSICAL SLIP INSPECTED & RISK-VALIDATED</span>
                              <span>• Ready for floor execution & bank routing</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <Button
                                variant="success"
                                size="sm"
                                loading={isProcessing}
                                disabled={isTradingDisabled}
                                onClick={() => handleAcceptOrder(o.id)}
                                style={{ flex: 1, minWidth: '160px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <IconCheck size={15} />
                                <span>Accept &amp; Route to Bank ({o.action} {o.quantity} {o.ticker})</span>
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => openReturnModal(o)}
                                style={{ backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))', color: 'var(--color-warning, #D97706)', borderColor: 'var(--color-warning, #D97706)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <IconLogOut size={13} />
                                <span>Return</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => openRejectModal(o)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <IconX size={14} />
                                <span>Reject</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconLock size={13} />
                            <span>Order assigned to {o.deskId} for execution</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stage 4: Routed to Bank Review (Awaiting Physical Settlement) */}
                    {['EXECUTED_PENDING_SETTLEMENT', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status) && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#059669', fontWeight: 800 }}>
                          <IconBuilding size={14} />
                          <span>ROUTED TO BANK REVIEW</span>
                          <span>• Awaiting physical settlement at {o.bankDeskId ? o.bankDeskId.replace('BANK_', 'Bank Desk ') : 'Bank Desk'}</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const rawSettlements = Array.isArray(state?.settlements) ? state.settlements : Object.values(state?.settlements || {});
                            const matchingSettlement = rawSettlements.find(s => s.orderId === o.id || s.ticketNumber === o.ticketNumber || s.voucherReference === o.voucherReference);
                            if (matchingSettlement) {
                              setVoucherModalItem(matchingSettlement);
                            } else {
                              setVoucherModalItem({
                                voucherReference: o.voucherReference || o.settlementVoucher?.voucherReference || `BNK-${o.id?.slice(0, 8)}`,
                                orderId: o.id,
                                ticketNumber: o.ticketNumber,
                                teamCode: o.teamCode,
                                action: o.action,
                                direction: o.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT',
                                ticker: o.ticker,
                                quantity: o.quantity,
                                price: o.price || o.limitPrice,
                                totalAmount: (o.price || 0) * (o.quantity || 0),
                                currency: o.currency || 'INR',
                                bankDeskId: o.bankDeskId || 'BANK_1',
                                status: 'PENDING'
                              });
                            }
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                        >
                          <IconPrinter size={13} />
                          <span>View Voucher</span>
                        </Button>
                      </div>
                    )}

                    {/* Stage 5: Fully Settled & Allotted */}
                    {o.status === 'SETTLED' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-rise)', fontWeight: 800 }}>
                          <IconCheck size={14} />
                          <span>ORDER FULLY SETTLED & ALLOTTED</span>
                          <span>• Cash &amp; securities ledger confirmed</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const rawSettlements = Array.isArray(state?.settlements) ? state.settlements : Object.values(state?.settlements || {});
                            const matchingSettlement = rawSettlements.find(s => s.orderId === o.id || s.ticketNumber === o.ticketNumber || s.voucherReference === o.voucherReference);
                            if (matchingSettlement) {
                              setVoucherModalItem(matchingSettlement);
                            } else {
                              setVoucherModalItem({
                                voucherReference: o.voucherReference || o.settlementVoucher?.voucherReference || `BNK-${o.id?.slice(0, 8)}`,
                                orderId: o.id,
                                ticketNumber: o.ticketNumber,
                                teamCode: o.teamCode,
                                action: o.action,
                                direction: o.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT',
                                ticker: o.ticker,
                                quantity: o.quantity,
                                price: o.price || o.limitPrice,
                                totalAmount: (o.price || 0) * (o.quantity || 0),
                                currency: o.currency || 'INR',
                                bankDeskId: o.bankDeskId || 'BANK_1',
                                status: 'SETTLED'
                              });
                            }
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                        >
                          <IconPrinter size={13} />
                          <span>View Voucher</span>
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </Card>

        {/* COLUMN 3: Live Security Telemetry & Executed Trades Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? '12px' : '18px' }}>
          
          <Card variant="frosted" density={density}>
            <CardHeader
              title="Live Security Quote"
              subtitle="Real-Time Price & Float Depth"
              icon={<IconBarChart size={18} style={{ color: 'var(--color-primary)' }} />}
            />

            {liveSecDetails ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-primary)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>
                      {liveSecDetails.ticker}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{liveSecDetails.name}</div>
                  </div>
                  <Badge variant="primary" size="sm">{liveSecDetails.exchange || 'SAAMX'}</Badge>
                </div>

                <div className="tabular-nums font-data" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text-primary)', margin: '8px 0' }}>
                  <PriceDisplay value={liveSecDetails.currentPrice} currency="INR" prefix="₹" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '0.80rem' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>OPEN PRICE</div>
                    <div className="tabular-nums font-data" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>₹{liveSecDetails.openingPrice || liveSecDetails.basePrice}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>AVAILABLE FLOAT</div>
                    <div className="tabular-nums font-data" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{liveSecDetails.availableUnits?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>DAY HIGH / LOW</div>
                    <div className="tabular-nums font-data" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>₹{liveSecDetails.dayHigh || liveSecDetails.currentPrice} / ₹{liveSecDetails.dayLow || liveSecDetails.currentPrice}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>VOLUME</div>
                    <div className="tabular-nums font-data" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{(liveSecDetails.tradingVolume || liveSecDetails.volume || 0).toLocaleString()}</div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  style={{ width: '100%', marginTop: '14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => onOpenProfile?.(liveSecDetails.ticker)}
                >
                  <span>Full Company Dossier</span>
                  <IconArrowRight size={14} />
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={<IconSearch size={32} style={{ color: 'var(--color-text-muted)' }} />}
                title="No Security Selected"
                description="Search or select any security listing in the intake ticket to inspect live quotes."
              />
            )}
          </Card>

          {/* Recent Executed Trades Stream */}
          <Card variant="frosted" density={density}>
            <CardHeader
              title="Executed Trades Feed"
              subtitle="Floor Matching Settlements"
              icon={<IconClipboardList size={18} style={{ color: 'var(--color-primary)' }} />}
            />
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(state?.transactions || []).slice(-6).reverse().map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.80rem', padding: '8px 10px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--color-border-subtle)' }}>
                  <div>
                    <span style={{ fontWeight: 900, color: 'var(--color-primary)' }}>{tx.ticker}</span>
                    <span style={{ margin: '0 4px', color: 'var(--color-border)' }}>•</span>
                    <span style={{ fontWeight: 800, color: tx.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{tx.action}</span>
                    <span style={{ margin: '0 4px', color: 'var(--color-border)' }}>•</span>
                    <span className="tabular-nums font-data">{tx.quantity}u</span>
                  </div>
                  <span className="tabular-nums font-data" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    ₹{tx.priceAtExecution}
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>

      {/* 1. PHYSICAL SLIP REVIEW & VALIDATION MODAL */}
      <Modal
        isOpen={showReviewModal && Boolean(reviewOrder)}
        onClose={() => setShowReviewModal(false)}
        title={`PHYSICAL ORDER SLIP REVIEW — Ticket #${reviewOrder?.ticketNumber}`}
        subtitle="Mandatory Pre-Execution Risk Checks & Floor Seal Verification"
        size="lg"
        style={{ backgroundColor: 'var(--color-surface)' }}
        footer={
          reviewOrder && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
              <Button
                variant="secondary"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                style={{ backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))', color: 'var(--color-warning, #D97706)', borderColor: 'var(--color-warning, #D97706)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => openReturnModal(reviewOrder)}
              >
                <IconLogOut size={13} />
                <span>Return for Correction</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => openRejectModal(reviewOrder)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <IconX size={14} />
                <span>Reject Slip</span>
              </Button>
              <Button
                variant="outline"
                style={{ fontWeight: 700, opacity: physicalSlipChecked ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                disabled={!physicalSlipChecked || isTradingDisabled || processingOrderIds.has(reviewOrder.id)}
                loading={processingOrderIds.has(reviewOrder.id)}
                onClick={() => handleValidateOrder(reviewOrder.id, true)}
                title="Validate slip and leave in queue for floor matching"
              >
                <IconCheck size={14} />
                <span>Validate Only</span>
              </Button>
              <Button
                variant="success"
                style={{ fontWeight: 900, opacity: physicalSlipChecked ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                disabled={!physicalSlipChecked || isTradingDisabled || processingOrderIds.has(reviewOrder.id)}
                loading={processingOrderIds.has(reviewOrder.id)}
                onClick={() => handleAcceptOrder(reviewOrder.id, true)}
                title="Merged Desk Review: Validate slip, execute market order, and route directly to Bank Desk for review and settlement"
              >
                <IconZap size={16} />
                <span>Accept &amp; Route to Bank</span>
              </Button>
            </div>
          )
        }
      >
        {reviewOrder && (() => {
          const team = (state?.teams || []).find(t => t.teamCode === reviewOrder.teamCode || t.id === reviewOrder.teamCode);
          const sec = (state?.securities || []).find(s => s.ticker === reviewOrder.ticker);
          const refP = reviewOrder.orderType === 'LIMIT' && reviewOrder.limitPrice ? reviewOrder.limitPrice : (sec?.currentPrice || 100);
          const grossVal = reviewOrder.requestedValue || (reviewOrder.quantity * refP);
          const nativeCash = Number(team?.cashWallets?.INR || team?.cashBalance || 0);
          const hasSufficientCash = reviewOrder.action === 'SELL' || nativeCash >= grossVal;
          const hasFloat = reviewOrder.action === 'SELL' || (sec?.availableUnits || 0) >= reviewOrder.quantity;
          const currentHolding = Number(team?.holdings?.[reviewOrder.ticker] || 0);
          const hasHolding = reviewOrder.action === 'BUY' || currentHolding >= reviewOrder.quantity;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--color-border-subtle)', fontSize: '0.86rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Investment House:</span>
                  <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    Team {reviewOrder.teamCode} {team?.teamName ? `(${team.teamName})` : ''}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Instrument:</span>
                  <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {reviewOrder.ticker} — {sec?.name || reviewOrder.securityName}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Action & Quantity:</span>
                  <div style={{ fontWeight: 800, color: reviewOrder.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                    {reviewOrder.action} {reviewOrder.quantity.toLocaleString()} units ({reviewOrder.orderType})
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Order Consideration:</span>
                  <div className="tabular-nums font-data" style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>
                    <CurrencyDisplay value={grossVal} currency="INR" />
                  </div>
                </div>
              </div>

              {/* Pre-Execution Risk Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                  Authoritative Pre-Execution Checks:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: hasSufficientCash ? 'var(--color-rise-subtle, rgba(5, 150, 105, 0.1))' : 'var(--color-fall-subtle, rgba(225, 29, 72, 0.1))', border: `1px solid ${hasSufficientCash ? 'var(--color-rise)' : 'var(--color-fall)'}` }}>
                  <span>Cash Wallet Availability (INR ₹{nativeCash.toLocaleString()}):</span>
                  <strong style={{ color: hasSufficientCash ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                    {hasSufficientCash ? '✓ SUFFICIENT' : '⚠ INSUFFICIENT DEFICIT'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: (hasFloat && hasHolding) ? 'var(--color-rise-subtle, rgba(5, 150, 105, 0.1))' : 'var(--color-fall-subtle, rgba(225, 29, 72, 0.1))', border: `1px solid ${(hasFloat && hasHolding) ? 'var(--color-rise)' : 'var(--color-fall)'}` }}>
                  <span>Float / Holdings Check ({reviewOrder.action === 'BUY' ? `Float: ${sec?.availableUnits || 0}` : `Holding: ${currentHolding}`}):</span>
                  <strong style={{ color: (hasFloat && hasHolding) ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                    {(hasFloat && hasHolding) ? '✓ VALID' : '⚠ LIMIT BREACH'}
                  </strong>
                </div>
              </div>

              {/* Physical Paper Slip Checkbox */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                backgroundColor: physicalSlipChecked ? 'var(--color-rise-subtle, rgba(5, 150, 105, 0.1))' : 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-sm, 6px)',
                border: `1.5px solid ${physicalSlipChecked ? 'var(--color-rise)' : 'var(--color-border)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                  checked={physicalSlipChecked}
                  onChange={(e) => setPhysicalSlipChecked(e.target.checked)}
                />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  I confirm that I have physically verified the paper order slip, inspected the runner signature, and confirmed the team authorization seal.
                </span>
              </label>
            </div>
          );
        })()}
      </Modal>

      {/* 2. RETURN FOR CORRECTION MODAL */}
      <Modal
        isOpen={showReturnModal && Boolean(returningOrder)}
        onClose={() => setShowReturnModal(false)}
        title={`Return Ticket #${returningOrder?.ticketNumber} for Correction`}
        subtitle="Mandatory Defect Feedback & Investment House Instructions"
        size="md"
        style={{ backgroundColor: 'var(--color-surface)' }}
        footer={
          returningOrder && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                variant="secondary"
                onClick={() => setShowReturnModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                style={{ backgroundColor: 'var(--color-warning, #D97706)', borderColor: 'var(--color-warning, #D97706)', color: '#FFFFFF', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                loading={processingOrderIds.has(returningOrder.id)}
                onClick={handleReturnSubmit}
              >
                <IconLogOut size={14} />
                <span>Confirm & Return Slip</span>
              </Button>
            </div>
          )
        }
      >
        {returningOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Specify the exact correction needed. The ticket will enter <strong>RETURNED_FOR_CORRECTION</strong> status, alerting Team <strong>{returningOrder.teamCode}</strong> on their terminal to amend and resubmit without losing priority.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Mandatory Correction Feedback / Instructions:
              </label>
              <textarea
                style={{
                  width: '100%',
                  height: '90px',
                  padding: '10px 12px',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  resize: 'none',
                  outline: 'none'
                }}
                placeholder="e.g. Quantity exceeds lot size; missing captain signature; limit price outside permitted circuit band..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 3. REJECT ORDER SLIP MODAL */}
      <Modal
        isOpen={showRejectModal && Boolean(rejectingOrder)}
        onClose={() => setShowRejectModal(false)}
        title={`Permanent Rejection — Ticket #${rejectingOrder?.ticketNumber}`}
        subtitle="Forensic Rejection Logging & Order Queue Eviction"
        size="md"
        style={{ backgroundColor: 'var(--color-surface)' }}
        footer={
          rejectingOrder && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                variant="secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={processingOrderIds.has(rejectingOrder.id)}
                onClick={handleRejectSubmit}
                style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <IconX size={14} />
                <span>Confirm Permanent Rejection</span>
              </Button>
            </div>
          )
        }
      >
        {rejectingOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-fall)', lineHeight: 1.4 }}>
              This will permanently mark the ticket as <strong>REJECTED</strong>. A permanent forensic audit log entry will be recorded in the system ledger.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Mandatory Rejection Reason:
              </label>
              <textarea
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '10px 12px',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-fall)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  resize: 'none',
                  outline: 'none'
                }}
                placeholder="e.g. Counterfeit slip; regulatory trading halt active on ticker; unauthorized team..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Floor Voucher Modal */}
      <PrintableVoucherModal
        isOpen={Boolean(voucherModalItem)}
        onClose={() => setVoucherModalItem(null)}
        voucher={voucherModalItem}
      />

    </div>
  );
}
