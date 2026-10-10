import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';

export default function VerificationPage({ state, connected }) {
  // Verification Officer & Desk configuration
  const [officerName, setOfficerName] = useState('Verification Officer 1');
  const [deskId, setDeskId] = useState('VERIFY_1');

  useEffect(() => {
    const storedUser = sessionStorage.getItem('fms_username') || sessionStorage.getItem('saamx_username') || '';
    if (storedUser) {
      setOfficerName(storedUser);
    }
  }, []);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('AWAITING'); // 'ALL', 'AWAITING', 'BEING_VERIFIED', 'RETURNED', 'VERIFIED', 'EXECUTED', 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returningOrderId, setReturningOrderId] = useState(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState(null);

  // Physical slip confirmation state for claiming/verifying
  const [physicalSlipChecked, setPhysicalSlipChecked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type, id: Date.now() });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const orders = useMemo(() => {
    return Array.isArray(state?.orders) ? state.orders : [];
  }, [state?.orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Status filter
      if (statusFilter === 'AWAITING') {
        if (o.status !== 'PENDING' && o.workflowStage !== 'AWAITING_VERIFICATION') return false;
      } else if (statusFilter === 'BEING_VERIFIED') {
        if (o.status !== 'BEING_VERIFIED') return false;
      } else if (statusFilter === 'RETURNED') {
        if (o.status !== 'RETURNED_FOR_CORRECTION') return false;
      } else if (statusFilter === 'VERIFIED') {
        if (o.status !== 'VERIFIED_AWAITING_EXCHANGE') return false;
      } else if (statusFilter === 'EXECUTED') {
        if (o.status !== 'EXECUTED') return false;
      } else if (statusFilter === 'REJECTED') {
        if (o.status !== 'REJECTED') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tkt = (o.ticketNumber || '').toLowerCase();
        const tm = (o.teamCode || '').toLowerCase();
        const tk = (o.ticker || '').toLowerCase();
        const sec = (o.securityName || '').toLowerCase();
        if (!tkt.includes(q) && !tm.includes(q) && !tk.includes(q) && !sec.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => (b.submittedAt || b.timestamp || 0) - (a.submittedAt || a.timestamp || 0));
  }, [orders, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let awaiting = 0;
    let beingVerified = 0;
    let returned = 0;
    let verified = 0;
    let executed = 0;
    let rejected = 0;

    orders.forEach(o => {
      if (o.status === 'PENDING' || o.workflowStage === 'AWAITING_VERIFICATION') awaiting++;
      else if (o.status === 'BEING_VERIFIED') beingVerified++;
      else if (o.status === 'RETURNED_FOR_CORRECTION') returned++;
      else if (o.status === 'VERIFIED_AWAITING_EXCHANGE') verified++;
      else if (o.status === 'EXECUTED') executed++;
      else if (o.status === 'REJECTED') rejected++;
    });

    return { total: orders.length, awaiting, beingVerified, returned, verified, executed, rejected };
  }, [orders]);

  // Handlers
  const handleClaim = async (order) => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/verification/claim', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          officerName,
          deskId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim order');
      showToast(`Ticket #${order.ticketNumber} locked for review by ${officerName}`, 'success');
      setSelectedOrder(data.order || order);
      setPhysicalSlipChecked(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (order) => {
    if (!physicalSlipChecked) {
      showToast('You must inspect the physical slip and check the verification box before approving.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/verification/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          officerName,
          physicalSlipChecked: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify order');
      showToast(`Ticket #${order.ticketNumber} verified and forwarded to Exchange Queue!`, 'success');
      setSelectedOrder(null);
      setPhysicalSlipChecked(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openReturnModal = (order) => {
    setReturningOrderId(order.id);
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      showToast('A clear, actionable return reason is mandatory.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/verification/return', {
        method: 'POST',
        body: JSON.stringify({
          orderId: returningOrderId,
          officerName,
          returnReason: returnReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to return order');
      showToast('Order returned to Investment House for correction.', 'info');
      setShowReturnModal(false);
      setSelectedOrder(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (order) => {
    setRejectingOrderId(order.id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showToast('Rejection reason is mandatory.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/order/action', {
        method: 'POST',
        body: JSON.stringify({
          orderId: rejectingOrderId,
          actionType: 'REJECT',
          rejectionReason: rejectReason.trim(),
          operator: officerName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');
      showToast('Order permanently rejected.', 'error');
      setShowRejectModal(false);
      setSelectedOrder(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">Awaiting Verification</span>;
      case 'BEING_VERIFIED':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">Being Verified</span>;
      case 'RETURNED_FOR_CORRECTION':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">Returned for Correction</span>;
      case 'VERIFIED_AWAITING_EXCHANGE':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Verified (Ready for Exchange)</span>;
      case 'VALIDATED':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">Risk Validated</span>;
      case 'EXECUTED':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">Executed</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">Rejected</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-500/20 text-slate-300 border border-slate-500/40">Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center space-x-3 transition-all ${
          toastMessage.type === 'error' ? 'bg-rose-950/90 border-rose-600 text-rose-200' :
          toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-600 text-amber-200' :
          toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200' :
          'bg-slate-900/90 border-sky-600 text-sky-200'
        }`}>
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              Verification Officer Portal
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Physical Order Slip Intake, Signature Inspection & Pre-Exchange Audit Verification
          </p>
        </div>

        {/* Officer & Desk Identity Badge */}
        <div className="flex items-center space-x-4 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-semibold uppercase">Desk:</label>
            <select
              value={deskId}
              onChange={(e) => setDeskId(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="VERIFY_1">Verification Desk 1</option>
              <option value="VERIFY_2">Verification Desk 2</option>
              <option value="VERIFY_3">Verification Desk 3</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-semibold uppercase">Officer:</label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 w-32 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <a
            href="/api/reports/orders/csv"
            download="saamx_orders_report.csv"
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded text-slate-300 transition-colors flex items-center space-x-1"
          >
            <span>📥 Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <span className="text-xs text-slate-400">Total Logged</span>
          <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
        </div>
        <div
          onClick={() => setStatusFilter('AWAITING')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === 'AWAITING' ? 'bg-amber-950/40 border-amber-500' : 'bg-slate-900/70 border-slate-800/80 hover:border-amber-500/50'
          }`}
        >
          <span className="text-xs text-amber-400 font-semibold">Awaiting Intake</span>
          <p className="text-2xl font-bold text-amber-300">{stats.awaiting}</p>
        </div>
        <div
          onClick={() => setStatusFilter('BEING_VERIFIED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === 'BEING_VERIFIED' ? 'bg-sky-950/40 border-sky-500' : 'bg-slate-900/70 border-slate-800/80 hover:border-sky-500/50'
          }`}
        >
          <span className="text-xs text-sky-400 font-semibold">Being Verified</span>
          <p className="text-2xl font-bold text-sky-300">{stats.beingVerified}</p>
        </div>
        <div
          onClick={() => setStatusFilter('RETURNED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === 'RETURNED' ? 'bg-orange-950/40 border-orange-500' : 'bg-slate-900/70 border-slate-800/80 hover:border-orange-500/50'
          }`}
        >
          <span className="text-xs text-orange-400 font-semibold">Returned for Correction</span>
          <p className="text-2xl font-bold text-orange-300">{stats.returned}</p>
        </div>
        <div
          onClick={() => setStatusFilter('VERIFIED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === 'VERIFIED' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/50'
          }`}
        >
          <span className="text-xs text-emerald-400 font-semibold">Verified for Exchange</span>
          <p className="text-2xl font-bold text-emerald-300">{stats.verified}</p>
        </div>
        <div
          onClick={() => setStatusFilter('EXECUTED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === 'EXECUTED' ? 'bg-teal-950/40 border-teal-500' : 'bg-slate-900/70 border-slate-800/80 hover:border-teal-500/50'
          }`}
        >
          <span className="text-xs text-teal-400 font-semibold">Executed</span>
          <p className="text-2xl font-bold text-teal-300">{stats.executed}</p>
        </div>
      </div>

      {/* Main Content Layout: Queue List + Order Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue Table (8 cols on large) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            {/* Filter pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'AWAITING', 'BEING_VERIFIED', 'RETURNED', 'VERIFIED', 'EXECUTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === f
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f === 'ALL' ? 'All Orders' :
                   f === 'AWAITING' ? 'Awaiting' :
                   f === 'BEING_VERIFIED' ? 'In Review' :
                   f === 'RETURNED' ? 'Returned' :
                   f === 'VERIFIED' ? 'Verified' : 'Executed'}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search ticket, team, ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Ticket #</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Security</th>
                    <th className="p-3">Side</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Requested Val</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500">
                        No order slips matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                      const isSelected = selectedOrder?.id === order.id;
                      const isBuy = order.action === 'BUY';
                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrder(order);
                            setPhysicalSlipChecked(Boolean(order.physicalSlipChecked));
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-slate-200">
                            #{order.ticketNumber}
                          </td>
                          <td className="p-3 font-semibold text-emerald-400">
                            {order.teamCode}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-100">{order.ticker}</span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[120px]">
                              {order.securityName || order.ticker}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {order.action}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-slate-200">
                            {order.quantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-300">
                            ₹{(order.requestedValue || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-3 text-center">
                            {order.status === 'PENDING' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleClaim(order); }}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-slate-100 font-semibold rounded text-xs transition-colors"
                              >
                                Claim
                              </button>
                            )}
                            {order.status === 'BEING_VERIFIED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setPhysicalSlipChecked(false);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold rounded text-xs transition-colors"
                              >
                                Review
                              </button>
                            )}
                            {order.status === 'RETURNED_FOR_CORRECTION' && (
                              <span className="text-[11px] text-orange-400 italic">With Team</span>
                            )}
                            {order.status === 'VERIFIED_AWAITING_EXCHANGE' && (
                              <span className="text-[11px] text-emerald-400 font-medium">In Exchange Queue</span>
                            )}
                            {order.status === 'EXECUTED' && (
                              <span className="text-[11px] text-teal-400 font-medium">Filled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Inspection & Action Drawer (4 cols on large) */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 sticky top-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-200 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Order Verification Desk</span>
              {selectedOrder && (
                <span className="text-xs font-mono text-slate-400">
                  {selectedOrder.id.slice(-8)}
                </span>
              )}
            </h2>

            {selectedOrder ? (
              <div className="mt-4 space-y-4">
                {/* Status & Side Banner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Ticket #</span>
                    <span className="text-lg font-mono font-bold text-slate-100">#{selectedOrder.ticketNumber}</span>
                  </div>
                  <div>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>

                {/* Key Details */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Investment House</span>
                    <span className="font-bold text-emerald-400 text-sm">{selectedOrder.teamCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Security Ticker</span>
                    <span className="font-bold text-slate-100 text-sm">{selectedOrder.ticker}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Action Side</span>
                    <span className={`font-bold text-sm ${selectedOrder.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedOrder.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Order Type</span>
                    <span className="font-semibold text-slate-200">
                      {selectedOrder.orderType} {selectedOrder.limitPrice ? `@ ₹${selectedOrder.limitPrice}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quantity</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {selectedOrder.quantity.toLocaleString()} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Requested Value</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      ₹{(selectedOrder.requestedValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Return Reason Warning (if currently returned) */}
                {selectedOrder.returnReason && (
                  <div className="p-3 bg-orange-950/40 border border-orange-600/50 rounded-lg text-xs">
                    <span className="font-bold text-orange-400 block mb-1">⚠️ Return for Correction Reason:</span>
                    <p className="text-orange-200">{selectedOrder.returnReason}</p>
                  </div>
                )}

                {/* Rejection Reason (if rejected) */}
                {selectedOrder.rejectionReason && (
                  <div className="p-3 bg-rose-950/40 border border-rose-600/50 rounded-lg text-xs">
                    <span className="font-bold text-rose-400 block mb-1">⛔ Rejection Reason:</span>
                    <p className="text-rose-200">{selectedOrder.rejectionReason}</p>
                  </div>
                )}

                {/* Verification Actions Box */}
                {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'BEING_VERIFIED') && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                      Physical Inspection Sign-Off
                    </h3>

                    {/* Mandatory Confirmation Checkbox */}
                    <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={physicalSlipChecked}
                        onChange={(e) => setPhysicalSlipChecked(e.target.checked)}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>
                        I confirm that I have physically inspected the paper slip, checked the team signature, and verified the ticket details.
                      </span>
                    </label>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col space-y-2">
                      <button
                        onClick={() => handleVerify(selectedOrder)}
                        disabled={!physicalSlipChecked || actionLoading}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg ${
                          physicalSlipChecked && !actionLoading
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        ✓ Mark Verified & Send to Exchange
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openReturnModal(selectedOrder)}
                          disabled={actionLoading}
                          className="py-2 bg-orange-600/80 hover:bg-orange-500 text-slate-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ↩ Return for Correction
                        </button>
                        <button
                          onClick={() => openRejectModal(selectedOrder)}
                          disabled={actionLoading}
                          className="py-2 bg-rose-600/80 hover:bg-rose-500 text-slate-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ✕ Reject Order
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Trail Timeline */}
                <div className="pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Order Audit Trail</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(selectedOrder.statusHistory || []).map((h, i) => (
                      <div key={i} className="text-[11px] p-2 bg-slate-950/70 rounded border border-slate-800/80">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="font-semibold text-emerald-400">{h.stage}</span>
                          <span className="text-[10px]">{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300 mt-1">{h.note}</p>
                        <span className="text-[10px] text-slate-500 italic block mt-0.5">By {h.actor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                Select an order slip from the queue to review details and perform verification.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return for Correction Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-orange-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-orange-400 mb-2">
              Return Order Slip for Correction
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Specify the exact reason the order slip cannot be cleared (e.g. missing CIO counter-signature, illegible quantity, incorrect ticker).
            </p>
            <form onSubmit={handleReturnSubmit}>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Enter detailed reason for the Investment House..."
                rows="4"
                className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-lg p-3 text-xs focus:outline-none focus:border-orange-500"
                required
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Return to Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-400 mb-2">
              Reject Order Slip
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Provide an official rejection reason. This action terminates the order permanently and logs an immutable audit event.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter regulatory or compliance rejection reason..."
                rows="4"
                className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-lg p-3 text-xs focus:outline-none focus:border-rose-500"
                required
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-100 text-xs font-bold rounded-lg transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
