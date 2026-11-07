import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { Card, CardHeader } from './ui/Card.jsx';
import { Badge, OrderStatusBadge } from './ui/Badge.jsx';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import {
  IconRefreshCw,
  IconShieldCheck,
  IconClock,
  IconCheck,
  IconX,
  IconBuilding,
  IconLayers,
  IconUser,
  IconSearch,
  IconAlertTriangle,
  IconLock,
  IconFileText
} from '../lib/icons.jsx';

export default function DeskQueueDashboard({ state = {}, isEmbedded = false, onOpenProfile }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Active Desk Tab Filter: 'ALL' | 'EXCHANGE' | 'BANK' | 'FX' | specific desk ID (e.g. 'DESK_1')
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  // Interactive Verification Form State in Modal
  const [physicalSlipChecked, setPhysicalSlipChecked] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReturnInput, setShowReturnInput] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/desk-queue-dashboard');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDashboardData(data);
        setLastRefreshed(Date.now());
      } else {
        setError(data?.error || `HTTP ${res.status}: Failed to load queue dashboard`);
      }
    } catch (err) {
      console.error('[DeskQueueDashboard] fetch error:', err);
      setError(err.message || 'Network error fetching desk queue dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 4000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Real-time synchronization: immediately refresh telemetry whenever WebSocket pushes updates
  useEffect(() => {
    fetchDashboard();
  }, [state?.orders, state?.settlements, state?.fxQueue, fetchDashboard]);

  // Build unified desk list including Exchange desks, Bank desks, and FX desk
  const { allDesks, fxDeskData } = useMemo(() => {
    let exchangeList = [];
    let bankList = [];
    let fxDesk = dashboardData?.fxDesk || null;

    if (dashboardData?.desks) {
      exchangeList = dashboardData.desks;
    } else {
      // Fallback from state
      const orderDesks = state?.orderDesks || {
        DESK_1: { id: 'DESK_1', name: 'Exchange Desk 1 (Blue)', color: '#3B82F6' },
        DESK_2: { id: 'DESK_2', name: 'Exchange Desk 2 (Amber)', color: '#F59E0B' },
        DESK_3: { id: 'DESK_3', name: 'Exchange Desk 3 (Emerald)', color: '#10B981' },
        DESK_4: { id: 'DESK_4', name: 'Exchange Desk 4 (Purple)', color: '#8B5CF6' },
        DESK_5: { id: 'DESK_5', name: 'Exchange Desk 5 (Crimson)', color: '#EC4899' }
      };
      const orders = Array.isArray(state?.orders) ? state.orders : Object.values(state?.orders || {});
      exchangeList = Object.keys(orderDesks).map(dId => {
        const deskNum = dId.replace('DESK_', '');
        const assigned = orders.filter(o =>
          (o.lockedByDesk ? o.lockedByDesk === dId : o.deskId === dId) &&
          ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'VERIFYING', 'BEING_VERIFIED', 'VALIDATED', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE'].includes(o.status)
        );
        return {
          id: dId,
          deskName: orderDesks[dId]?.name || `Exchange Desk ${deskNum}`,
          name: orderDesks[dId]?.name || `Exchange Desk ${deskNum}`,
          deskType: 'EXCHANGE',
          type: 'EXCHANGE',
          deskIdentifier: `Desk ${deskNum}`,
          identifier: `Desk ${deskNum}`,
          color: orderDesks[dId]?.color || '#3B82F6',
          operator: orderDesks[dId]?.operator || 'Unassigned',
          queueCount: assigned.length,
          activeQueueCount: assigned.length,
          pendingCount: assigned.filter(o => ['PENDING', 'SUBMITTED', 'QUEUED', 'RESUBMITTED', 'AWAITING_PHYSICAL_SLIP'].includes(o.status)).length,
          processingTicket: assigned.find(o => o.status === 'VERIFYING_AT_EXCHANGE' || o.status === 'VERIFYING') || null,
          averageWaitTimeMs: 0,
          completedCount: orderDesks[dId]?.totalProcessed || 0,
          rejectedCount: 0,
          operationalStatus: 'ACTIVE',
          orderIds: assigned.map(o => o.id),
          isEmpty: assigned.length === 0,
          assignedOrders: assigned.map(o => ({
            id: o.id,
            orderId: o.id,
            ticketNumber: o.ticketNumber || `TKN-${o.id.slice(-6)}`,
            voucherReference: o.voucherReference || null,
            status: o.status,
            statusDisplay: o.status === 'VERIFYING_AT_EXCHANGE' ? 'Verifying at exchange' : o.status === 'VALIDATED' ? 'Validated' : 'Awaiting review',
            assignmentTime: o.assignedAt || o.submittedAt || o.timestamp,
            teamCode: o.teamCode,
            ticker: o.ticker,
            action: o.action,
            quantity: o.quantity,
            price: o.executionPrice || o.currentPrice,
            totalValue: o.executionValue || o.requestedValue,
            operator: o.operator || orderDesks[dId]?.operator || 'Unassigned',
            lockedByDesk: o.lockedByDesk,
            physicalSlipChecked: Boolean(o.physicalSlipChecked)
          }))
        };
      });
    }

    if (dashboardData?.bankDesks) {
      bankList = dashboardData.bankDesks;
    } else {
      const bankDesks = state?.bankDesks || {
        BANK_1: { id: 'BANK_1', name: 'Bank Desk 1', color: '#10B981', deskType: 'BANK', type: 'BANK', identifier: 'Desk 1', deskIdentifier: 'Desk 1', operator: 'Bank Teller 1' },
        BANK_2: { id: 'BANK_2', name: 'Bank Desk 2', color: '#059669', deskType: 'BANK', type: 'BANK', identifier: 'Desk 2', deskIdentifier: 'Desk 2', operator: 'Bank Teller 2' }
      };
      const orders = Array.isArray(state?.orders) ? state.orders : Object.values(state?.orders || {});
      bankList = Object.keys(bankDesks).map(bId => {
        const bNum = bId.replace('BANK_', '');
        const assignedBankOrders = orders.filter(o =>
          (o.bankDeskId === bId || (!o.bankDeskId && bId === 'BANK_1')) &&
          (o.status === 'EXECUTED_PENDING_SETTLEMENT' || (o.settlementStatus === 'PENDING' && !['REJECTED', 'SETTLEMENT_REJECTED', 'CANCELLED', 'SETTLED'].includes(o.status)))
        );
        return {
          id: bId,
          deskName: bankDesks[bId]?.name || `Bank Desk ${bNum}`,
          name: bankDesks[bId]?.name || `Bank Desk ${bNum}`,
          deskType: 'BANK',
          type: 'BANK',
          deskIdentifier: `Desk ${bNum}`,
          identifier: `Desk ${bNum}`,
          color: bankDesks[bId]?.color || '#10B981',
          operator: bankDesks[bId]?.operator || 'Bank Teller',
          queueCount: assignedBankOrders.length,
          activeQueueCount: assignedBankOrders.length,
          pendingCount: assignedBankOrders.length,
          processingTicket: null,
          averageWaitTimeMs: 0,
          completedCount: 0,
          rejectedCount: 0,
          operationalStatus: 'ACTIVE',
          orderIds: assignedBankOrders.map(o => o.id),
          isEmpty: assignedBankOrders.length === 0,
          assignedOrders: assignedBankOrders.map(o => ({
            id: o.id,
            orderId: o.id,
            ticketNumber: o.ticketNumber || `TKN-${o.id.slice(-6)}`,
            voucherReference: o.voucherReference || null,
            status: o.status,
            statusDisplay: 'Awaiting bank settlement',
            assignmentTime: o.bankAssignedAt || o.executedAt || o.timestamp,
            teamCode: o.teamCode,
            ticker: o.ticker,
            action: o.action,
            quantity: o.quantity,
            price: o.executionPrice || o.currentPrice,
            totalValue: o.executionValue || o.requestedValue,
            operator: o.operator || bankDesks[bId]?.operator || 'Bank Teller',
            lockedByDesk: o.lockedByDesk,
            physicalSlipChecked: Boolean(o.physicalSlipChecked)
          }))
        };
      });
    }

    if (!fxDesk && state?.fxQueue) {
      const fxQueue = state.fxQueue || [];
      const pending = fxQueue.filter(q => ['QUEUED', 'PENDING', 'SUBMITTED'].includes(q.status));
      fxDesk = {
        id: 'FX_DESK_1',
        name: 'FX Currency Desk',
        deskName: 'FX Currency Desk',
        deskType: 'FX',
        type: 'FX',
        deskIdentifier: 'FX Desk',
        identifier: 'FX Desk',
        color: '#8B5CF6',
        operator: 'FX Operator',
        queueCount: pending.length,
        activeQueueCount: pending.length,
        pendingCount: pending.length,
        processingTicket: fxQueue.find(q => ['PROCESSING', 'RATE_CHECK', 'CLAIMED'].includes(q.status)) || null,
        averageWaitTimeMs: 0,
        completedCount: fxQueue.filter(q => q.status === 'SETTLED').length,
        rejectedCount: fxQueue.filter(q => ['REJECTED', 'CANCELLED'].includes(q.status)).length,
        operationalStatus: 'ACTIVE',
        isEmpty: pending.length === 0,
        reserves: state.fxReserves || {},
        assignedOrders: fxQueue.map(q => ({
          id: q.id || q.requestId,
          orderId: q.id || q.requestId,
          ticketNumber: q.ticketNumber || `TKN-FX-${(q.id || '').slice(-4)}`,
          status: q.status,
          statusDisplay: q.status === 'PROCESSING' ? 'Processing conversion' : 'Queued',
          assignmentTime: q.timestamp || q.createdAt,
          teamCode: q.teamCode,
          ticker: `${q.fromCurrency}/${q.toCurrency}`,
          action: `FX ${q.fromCurrency} -> ${q.toCurrency}`,
          quantity: q.fromAmount,
          price: q.rate || 1.0,
          totalValue: q.fromAmount,
          operator: q.operator || 'FX Operator'
        }))
      };
    }

    const combined = [...exchangeList, ...bankList];
    if (fxDesk) combined.push(fxDesk);

    return { allDesks: combined, fxDeskData: fxDesk };
  }, [dashboardData, state]);

  // Tab Filtering & Search Logic
  const filteredDesks = useMemo(() => {
    return allDesks.filter(desk => {
      const dType = (desk.deskType || desk.type || '').toUpperCase();
      const dId = desk.id;

      if (activeTab === 'ALL') {
        // show all desks
      } else if (activeTab === 'EXCHANGE') {
        if (dType !== 'EXCHANGE') return false;
      } else if (activeTab === 'BANK') {
        if (dType !== 'BANK') return false;
      } else if (activeTab === 'FX') {
        if (dType !== 'FX') return false;
      } else {
        // Specific desk ID tab (e.g. 'DESK_1')
        if (dId !== activeTab) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (desk.deskName || desk.name || '').toLowerCase().includes(q);
        const matchesIdent = (desk.deskIdentifier || desk.identifier || '').toLowerCase().includes(q);
        const matchesOrders = (desk.assignedOrders || []).some(o =>
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.ticketNumber && String(o.ticketNumber).toLowerCase().includes(q)) ||
          (o.voucherReference && String(o.voucherReference).toLowerCase().includes(q)) ||
          (o.teamCode && o.teamCode.toLowerCase().includes(q)) ||
          (o.ticker && o.ticker.toLowerCase().includes(q))
        );
        return matchesName || matchesIdent || matchesOrders;
      }
      return true;
    });
  }, [allDesks, activeTab, searchQuery]);

  // Overall aggregate metrics across desks
  const metrics = useMemo(() => {
    let pendingTotal = 0;
    let completedTotal = 0;
    let rejectedTotal = 0;
    let processingTotal = 0;
    let waitSum = 0;
    let waitCount = 0;

    allDesks.forEach(d => {
      pendingTotal += d.pendingCount || 0;
      completedTotal += d.completedCount || 0;
      rejectedTotal += d.rejectedCount || 0;
      if (d.processingTicket) processingTotal++;
      if (d.averageWaitTimeMs && d.averageWaitTimeMs > 0) {
        waitSum += d.averageWaitTimeMs;
        waitCount++;
      }
    });

    const avgWaitMs = waitCount > 0 ? Math.round(waitSum / waitCount) : 0;
    const avgWaitSec = Math.round(avgWaitMs / 1000);

    return {
      pendingTotal,
      processingTotal,
      completedTotal,
      rejectedTotal,
      avgWaitSec,
      totalStations: allDesks.length
    };
  }, [allDesks]);

  const handleInspectOrder = (order) => {
    const ordersList = Array.isArray(state?.orders) ? state.orders : Object.values(state?.orders || {});
    const teamsList = Array.isArray(state?.teams) ? state.teams : Object.values(state?.teams || {});
    const secsList = Array.isArray(state?.securities) ? state.securities : Object.values(state?.securities || {});

    const fullOrder = ordersList.find(o => o.id === order.id) || order;
    const team = teamsList.find(t => t.teamCode === fullOrder.teamCode || t.id === fullOrder.teamCode);
    const sec = secsList.find(s => s.ticker === fullOrder.ticker || s.id === fullOrder.securityId);

    setSelectedOrder({
      ...fullOrder,
      teamDetails: team,
      securityDetails: sec
    });
    setPhysicalSlipChecked(Boolean(fullOrder.physicalSlipChecked));
    setReturnReason('');
    setRejectionReason('');
    setShowReturnInput(false);
    setShowRejectInput(false);
    setActionError(null);
    setActionSuccess(null);
    setInspectModalOpen(true);
  };

  // Workflow Handlers
  const handleClaimOrder = async () => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await apiFetch('/api/order/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          deskId: selectedOrder.deskId || 'DESK_1'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccess(`Order claimed successfully by desk ${data.order?.lockedByDesk || 'Exchange'}.`);
        setSelectedOrder(prev => ({
          ...prev,
          ...data.order,
          lockedByDesk: data.order?.lockedByDesk,
          status: data.order?.status
        }));
        fetchDashboard();
      } else {
        setActionError(data.error || `Failed to claim order: HTTP ${res.status}`);
      }
    } catch (err) {
      setActionError(err.message || 'Error executing claim action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidateOrder = async () => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          actionType: 'VALIDATE'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccess('Risk controls and portfolio limits validated.');
        setSelectedOrder(prev => ({ ...prev, ...data.order, status: data.order?.status || 'VALIDATED' }));
        fetchDashboard();
      } else {
        setActionError(data.error || `Validation failed: HTTP ${res.status}`);
      }
    } catch (err) {
      setActionError(err.message || 'Error validating order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!selectedOrder) return;
    if (!physicalSlipChecked) {
      setActionError('Physical paper slip must be verified against digital order book before approval.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          actionType: 'ACCEPT',
          physicalSlipChecked: true,
          deskId: selectedOrder.deskId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccess(`Approved! Bank voucher issued: ${data.voucherReference || data.order?.voucherReference}. Routed to Bank Desk.`);
        setSelectedOrder(prev => ({
          ...prev,
          ...data.order,
          status: 'EXCHANGE_APPROVED',
          voucherReference: data.voucherReference || data.order?.voucherReference
        }));
        fetchDashboard();
      } else {
        setActionError(data.error || `Approval failed: HTTP ${res.status}`);
      }
    } catch (err) {
      setActionError(err.message || 'Error approving order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnOrder = async () => {
    if (!selectedOrder) return;
    if (!returnReason.trim()) {
      setActionError('Return reason is required.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          actionType: 'RETURN_FOR_CORRECTION',
          returnReason: returnReason.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccess('Order returned for participant correction.');
        setSelectedOrder(prev => ({ ...prev, ...data.order, status: 'RETURNED_FOR_CORRECTION', lockedByDesk: null }));
        setShowReturnInput(false);
        fetchDashboard();
      } else {
        setActionError(data.error || `Return failed: HTTP ${res.status}`);
      }
    } catch (err) {
      setActionError(err.message || 'Error returning order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;
    if (!rejectionReason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          actionType: 'REJECT',
          rejectionReason: rejectionReason.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActionSuccess('Order rejected and cash reservation unreserved.');
        setSelectedOrder(prev => ({ ...prev, ...data.order, status: 'REJECTED_BY_EXCHANGE', lockedByDesk: null }));
        setShowRejectInput(false);
        fetchDashboard();
      } else {
        setActionError(data.error || `Rejection failed: HTTP ${res.status}`);
      }
    } catch (err) {
      setActionError(err.message || 'Error rejecting order.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  const formatCurrency = (val, cur = 'INR') => {
    if (val === undefined || val === null || isNaN(val)) return '₹0.00';
    const sym = cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : '₹';
    return `${sym}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: isEmbedded ? '0' : '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconLayers size={24} style={{ color: 'var(--color-accent, #3B82F6)' }} />
            <span>Multi-Desk Assignment &amp; Live Order Queue Screen</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
            Real-time multi-desk queue telemetry, distinct identifier tracking, and decoupled slip verification.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconClock size={14} />
            <span>Updated: {new Date(lastRefreshed).toLocaleTimeString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            loading={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Real-Time Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <Card padding="sm" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            Pending Tickets
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3B82F6', marginTop: '4px' }}>
            {metrics.pendingTotal} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>awaiting review</span>
          </div>
        </Card>

        <Card padding="sm" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            Currently Processing
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>
            {metrics.processingTotal} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>active claim</span>
          </div>
        </Card>

        <Card padding="sm" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            Average Wait Time
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8B5CF6', marginTop: '4px' }}>
            {metrics.avgWaitSec > 60 ? `${Math.floor(metrics.avgWaitSec / 60)}m ${metrics.avgWaitSec % 60}s` : `${metrics.avgWaitSec}s`}
          </div>
        </Card>

        <Card padding="sm" style={{ borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            Completed / Settled
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
            {metrics.completedTotal} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>orders</span>
          </div>
        </Card>

        <Card padding="sm" style={{ borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            Rejected / Returned
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#EF4444', marginTop: '4px' }}>
            {metrics.rejectedTotal}
          </div>
        </Card>
      </div>

      {/* Dynamic Tabs Navigation Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-surface-subtle)', padding: '8px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          <Button
            size="sm"
            variant={activeTab === 'ALL' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('ALL')}
            style={{ fontWeight: 800 }}
          >
            All Stations ({allDesks.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'EXCHANGE' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('EXCHANGE')}
            style={{ fontWeight: 800, borderColor: '#3B82F6' }}
          >
            Exchange Desks ({allDesks.filter(d => (d.deskType || d.type) === 'EXCHANGE').length})
          </Button>

          {/* Sub-tabs for individual Exchange Desks */}
          {allDesks.filter(d => (d.deskType || d.type) === 'EXCHANGE').map(ed => (
            <Button
              key={ed.id}
              size="sm"
              variant={activeTab === ed.id ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(ed.id)}
              style={{
                fontSize: '0.78rem',
                padding: '4px 8px',
                border: activeTab === ed.id ? '2px solid #3B82F6' : '1px dashed var(--color-border)'
              }}
            >
              {ed.identifier || ed.id} ({ed.queueCount || 0})
            </Button>
          ))}

          <Button
            size="sm"
            variant={activeTab === 'BANK' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('BANK')}
            style={{ fontWeight: 800, borderColor: '#10B981' }}
          >
            Bank Desks ({allDesks.filter(d => (d.deskType || d.type) === 'BANK').length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'FX' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('FX')}
            style={{ fontWeight: 800, borderColor: '#8B5CF6' }}
          >
            FX Currency Desk ({fxDeskData?.queueCount || 0})
          </Button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <input
            type="text"
            placeholder="Search Token (TKN-), Order (ORD-), Voucher (BNK-), Team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
          <IconSearch
            size={16}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '8px', color: '#EF4444', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Operational Desks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
        {filteredDesks.map(desk => {
          const deskType = (desk.deskType || desk.type || 'EXCHANGE').toUpperCase();
          const deskIdent = desk.deskIdentifier || desk.identifier || desk.id;
          const isBank = deskType === 'BANK';
          const isFx = deskType === 'FX';
          const queueCount = desk.queueCount !== undefined ? desk.queueCount : (desk.assignedOrders?.length || 0);
          const isEmpty = queueCount === 0;
          const accentColor = isBank ? '#10B981' : isFx ? '#8B5CF6' : (desk.color || '#3B82F6');

          return (
            <Card
              key={desk.id}
              style={{
                borderTop: `4px solid ${accentColor}`,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}
            >
              <CardHeader
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                        {deskType} — {deskIdent}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge
                        variant={desk.operationalStatus === 'SATURATED' ? 'danger' : desk.operationalStatus === 'PAUSED' ? 'warn' : 'success'}
                        size="sm"
                        style={{ fontWeight: 800 }}
                      >
                        {desk.operationalStatus || 'ACTIVE'}
                      </Badge>
                      <Badge
                        variant={isBank ? 'success' : isFx ? 'warning' : 'primary'}
                        size="sm"
                        style={{ fontWeight: 800 }}
                      >
                        {deskType}
                      </Badge>
                    </div>
                  </div>
                }
                subtitle={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    <span>{desk.deskName || desk.name || desk.id}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IconUser size={13} />
                      <span style={{ fontWeight: 600 }}>{desk.operator || 'Unassigned'}</span>
                    </span>
                  </div>
                }
              />

              <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                {/* Desk Metrics Micro-Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '8px 10px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Pending</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                      {desk.pendingCount !== undefined ? desk.pendingCount : queueCount}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Completed</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10B981' }}>
                      {desk.completedCount || 0}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Rejected</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#EF4444' }}>
                      {desk.rejectedCount || 0}
                    </div>
                  </div>
                </div>

                {/* Currently Processing Ticket Highlight */}
                {desk.processingTicket && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid #F59E0B',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconLock size={12} />
                        <span>PROCESSING TICKET</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        Operator: {desk.processingTicket.operator || desk.operator}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                      Ticket #{desk.processingTicket.ticketNumber || desk.processingTicket.id}
                    </div>
                  </div>
                )}

                {/* Assigned Queue Orders List */}
                {isEmpty ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px 12px',
                      color: 'var(--color-text-tertiary)',
                      textAlign: 'center',
                      backgroundColor: 'var(--color-surface-subtle)',
                      borderRadius: '6px',
                      border: '1px dashed var(--color-border)'
                    }}
                  >
                    <IconCheck size={28} style={{ opacity: 0.4, marginBottom: '6px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Queue is empty</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                      {isBank ? 'No vouchers awaiting clearance' : isFx ? 'No spot conversions in queue' : 'No order slips awaiting verification'}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {(desk.assignedOrders || []).map(order => {
                      const isLocked = Boolean(order.lockedByDesk || order.status === 'VERIFYING_AT_EXCHANGE');
                      const isBuy = order.action === 'BUY' || String(order.action).startsWith('BUY');

                      return (
                        <div
                          key={order.id || order.orderId}
                          onClick={() => handleInspectOrder(order)}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-surface)',
                            border: `1px solid ${isLocked ? '#F59E0B' : 'var(--color-border)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = accentColor;
                            e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, rgba(0,0,0,0.02))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isLocked ? '#F59E0B' : 'var(--color-border)';
                            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                          }}
                          title="Click to inspect and process ticket"
                        >
                          {/* Distinct Identifier Badges Strip */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            {/* Token Badge */}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#D97706',
                                fontFamily: 'monospace'
                              }}
                            >
                              🎫 {order.ticketNumber || 'TKN-000'}
                            </span>

                            {/* Order Badge */}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#2563EB',
                                fontFamily: 'monospace'
                              }}
                            >
                              ⚡ {order.id || order.orderId}
                            </span>

                            {/* Voucher Badge if approved or present */}
                            {order.voucherReference ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 6px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: '#059669',
                                  fontFamily: 'monospace'
                                }}
                              >
                                🏦 {order.voucherReference}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 6px',
                                  backgroundColor: 'rgba(156, 163, 175, 0.1)',
                                  border: '1px dashed rgba(156, 163, 175, 0.4)',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  color: 'var(--color-text-tertiary)'
                                }}
                              >
                                🏦 Voucher: Pending Approval
                              </span>
                            )}
                          </div>

                          {/* Order Action & Team Details */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: isBuy ? '#10B981' : '#EF4444' }}>
                                {order.action} {order.quantity}× {order.ticker}
                              </span>
                              <span style={{ color: 'var(--color-text-tertiary)' }}>•</span>
                              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{order.teamCode}</span>
                            </div>
                            <OrderStatusBadge status={order.status} size="sm" />
                          </div>

                          {/* Operator Mutex Lock Indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '2px' }}>
                            {isLocked ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 700 }}>
                                <IconLock size={12} />
                                <span>LOCKED by {order.operator || desk.operator} ({order.lockedByDesk || desk.id})</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-tertiary)' }}>
                                <IconCheck size={12} />
                                <span>UNLOCKED — Ready to claim</span>
                              </span>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-tertiary)' }}>
                              <IconClock size={12} />
                              <span>{formatTimestamp(order.assignmentTime || order.submittedAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Interactive Verification Workflow Modal */}
      {selectedOrder && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Order Verification Slip — ${selectedOrder.ticketNumber || selectedOrder.id}`}
          subtitle={`Desk: ${selectedOrder.deskId || selectedOrder.bankDeskId || 'Clearance Desk'} • Status: ${selectedOrder.status}`}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClaimOrder}
                  loading={actionLoading}
                  disabled={Boolean(selectedOrder.lockedByDesk && selectedOrder.status === 'VERIFYING_AT_EXCHANGE')}
                >
                  <IconLock size={14} />
                  <span>Claim Order</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateOrder}
                  loading={actionLoading}
                >
                  <IconShieldCheck size={14} />
                  <span>Validate Limits</span>
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  disabled={actionLoading}
                >
                  <IconX size={14} />
                  <span>Reject</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowReturnInput(!showReturnInput)}
                  disabled={actionLoading}
                >
                  <span>Return for Correction</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApproveOrder}
                  loading={actionLoading}
                  disabled={!physicalSlipChecked}
                  style={{ fontWeight: 800 }}
                >
                  <IconCheck size={14} />
                  <span>Approve &amp; Issue Voucher</span>
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Decoupled Settlement Invariant Banner */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IconFileText size={18} />
              <span>
                <strong>DECOUPLED VERIFICATION INVARIANT:</strong> Exchange verification approves the physical slip against digital order specifications and generates a Bank Settlement Voucher (<code>BNK-PAY-...</code> / <code>BNK-REC-...</code>). Cash deduction and share delivery remain strictly with the Bank Desk teller.
              </span>
            </div>

            {/* Notification messages */}
            {actionError && (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '6px', color: '#EF4444', fontSize: '0.84rem' }}>
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '6px', color: '#059669', fontSize: '0.84rem', fontWeight: 700 }}>
                {actionSuccess}
              </div>
            )}

            {/* Identifier Triad Display Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Token Number</span>
                <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#D97706', fontFamily: 'monospace', marginTop: '2px' }}>
                  🎫 {selectedOrder.ticketNumber || 'TKN-000'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Order Number</span>
                <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#2563EB', fontFamily: 'monospace', marginTop: '2px' }}>
                  ⚡ {selectedOrder.id || selectedOrder.orderId}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Voucher Number</span>
                <div style={{ fontWeight: 900, fontSize: '0.96rem', color: selectedOrder.voucherReference ? '#059669' : 'var(--color-text-tertiary)', fontFamily: 'monospace', marginTop: '2px' }}>
                  🏦 {selectedOrder.voucherReference || 'Awaiting Approval'}
                </div>
              </div>
            </div>

            {/* Side-by-Side Slip vs Digital Order Verification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
              {/* Physical Paper Slip Parameters */}
              <div style={{ padding: '12px', border: '1px solid #F59E0B', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.03)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#D97706' }}>
                  Physical Slip Intake Parameters
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Physical Ticket #:</span>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{selectedOrder.ticketNumber || 'TKN-000'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Participant Team:</span>
                    <span style={{ fontWeight: 800 }}>Team {selectedOrder.teamCode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Target Ticker:</span>
                    <span style={{ fontWeight: 800 }}>{selectedOrder.ticker}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Trade Action:</span>
                    <span style={{ fontWeight: 800, color: selectedOrder.action === 'BUY' ? '#10B981' : '#EF4444' }}>{selectedOrder.action}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Quantity:</span>
                    <span style={{ fontWeight: 800 }}>{selectedOrder.quantity} units</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Assigned Desk:</span>
                    <span style={{ fontWeight: 700 }}>{selectedOrder.deskId || 'DESK_1'}</span>
                  </div>
                </div>
              </div>

              {/* Digital Order Book Parameters */}
              <div style={{ padding: '12px', border: '1px solid #3B82F6', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.03)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#2563EB' }}>
                  Digital Order Book Specifications
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Reference/Limit Price:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(selectedOrder.executionPrice || selectedOrder.price || selectedOrder.securityDetails?.currentPrice, selectedOrder.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Order Value:</span>
                    <span style={{ fontWeight: 800 }}>{formatCurrency(selectedOrder.executionValue || selectedOrder.totalValue || selectedOrder.requestedValue, selectedOrder.currency)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Available Cash:</span>
                    <span style={{ fontWeight: 700, color: '#10B981' }}>{formatCurrency(selectedOrder.teamDetails?.cashWallets?.INR || selectedOrder.teamDetails?.cashBalance || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Holdings ({selectedOrder.ticker}):</span>
                    <span style={{ fontWeight: 700 }}>{selectedOrder.teamDetails?.holdings?.[selectedOrder.ticker] || 0} units</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Submission Time:</span>
                    <span style={{ fontWeight: 600 }}>{formatTimestamp(selectedOrder.submittedAt || selectedOrder.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory Physical Slip Check Confirmation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: physicalSlipChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface-subtle)',
                border: `1px solid ${physicalSlipChecked ? '#10B981' : 'var(--color-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => setPhysicalSlipChecked(!physicalSlipChecked)}
            >
              <input
                type="checkbox"
                checked={physicalSlipChecked}
                onChange={(e) => setPhysicalSlipChecked(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                I confirm that the physical paper runner slip has been inspected and matches digital order specifications.
              </span>
            </div>

            {/* Return for Correction Input */}
            {showReturnInput && (
              <div style={{ padding: '12px', border: '1px solid #F59E0B', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#D97706' }}>
                  Mandatory Return for Correction Reason:
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Signature missing on physical slip, quantity discrepancy..."
                  style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button size="sm" variant="secondary" onClick={handleReturnOrder} loading={actionLoading}>
                    Confirm Return
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Input */}
            {showRejectInput && (
              <div style={{ padding: '12px', border: '1px solid #EF4444', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#EF4444' }}>
                  Mandatory Order Rejection Reason:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Counterfeit runner token, fraudulent submission..."
                  style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button size="sm" variant="danger" onClick={handleRejectOrder} loading={actionLoading}>
                    Confirm Rejection &amp; Unreserve Cash
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
