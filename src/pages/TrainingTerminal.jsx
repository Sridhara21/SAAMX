import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import TrainingPage from './TrainingPage.jsx';
import {
  Card,
  Badge,
  Button,
  Modal,
  Alert
} from '../components/ui/index.js';
import { DigitalTradeOrderSlip, DigitalBankSlip } from '../components/DigitalForms.jsx';
import {
  IconTarget,
  IconPlay,
  IconPause,
  IconRefreshCw,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconFlame,
  IconTrendingUp,
  IconDownload,
  IconBarChart,
  IconBuilding,
  IconFileText,
  IconActivity,
  IconExchange
} from '../lib/icons.jsx';

// Default fallback sandbox fixtures for offline / instant render
const DEFAULT_FALLBACK_SANDBOX = {
  version: '1.0.0-sandbox',
  drillStatus: 'idle',
  teams: [
    {
      id: 'TRAIN_T01',
      teamCode: 'TRAIN_T01',
      teamName: 'Alpha Capital (Practice)',
      cashBalance: 10000000,
      cashWallets: { INR: 10000000, USD: 100000, EUR: 50000, GBP: 50000 },
      reservedCash: { INR: 0, USD: 0 },
      holdings: { RELIANCE: 500, TATASTEEL: 1000, INFY: 400, TCS: 300, HDFCBANK: 600 },
      lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
      assignedDesk: 'DESK_1'
    },
    {
      id: 'TRAIN_T02',
      teamCode: 'TRAIN_T02',
      teamName: 'Beta Investments (Practice)',
      cashBalance: 10000000,
      cashWallets: { INR: 10000000, USD: 100000, EUR: 50000, GBP: 50000 },
      reservedCash: { INR: 0, USD: 0 },
      holdings: { RELIANCE: 200, TATASTEEL: 500, INFY: 300, TCS: 150, HDFCBANK: 400 },
      lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
      assignedDesk: 'DESK_2'
    },
    {
      id: 'TRAIN_T03',
      teamCode: 'TRAIN_T03',
      teamName: 'Gamma Asset Management (Practice)',
      cashBalance: 10000000,
      cashWallets: { INR: 10000000, USD: 100000, EUR: 50000, GBP: 50000 },
      reservedCash: { INR: 0, USD: 0 },
      holdings: { RELIANCE: 800, TATASTEEL: 1500, INFY: 600, TCS: 500, HDFCBANK: 900 },
      lockedHoldings: { RELIANCE: 0, TATASTEEL: 0, INFY: 0, TCS: 0, HDFCBANK: 0 },
      assignedDesk: 'DESK_3'
    }
  ],
  orders: [],
  vouchers: [],
  transactions: [],
  fxReserves: {
    USD: { currency: 'USD', availableReserve: 500000, currentInventory: 500000 },
    EUR: { currency: 'EUR', availableReserve: 400000, currentInventory: 400000 },
    GBP: { currency: 'GBP', availableReserve: 300000, currentInventory: 300000 },
    JPY: { currency: 'JPY', availableReserve: 50000000, currentInventory: 50000000 },
    AED: { currency: 'AED', availableReserve: 600000, currentInventory: 600000 },
    SGD: { currency: 'SGD', availableReserve: 250000, currentInventory: 250000 }
  },
  fxTransactions: [],
  newsEvents: [],
  scorecards: {}
};

export default function TrainingTerminal({ state }) {
  // Navigation Tabs: 'drill', 'exchange', 'bank', 'fx', 'team', 'journalist', 'scorecard'
  const [activeTab, setActiveTab] = useState('drill');
  const [sandboxState, setSandboxState] = useState(DEFAULT_FALLBACK_SANDBOX);
  const [loading, setLoading] = useState(false);
  const [currentOperator, setCurrentOperator] = useState('Operator 1');
  const [notification, setNotification] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);

  // Exchange Operator Form State
  const [returnModal, setReturnModal] = useState({ open: false, orderId: null, reason: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, orderId: null, reason: '' });

  // Bank Teller State
  const [holdModal, setHoldModal] = useState({ open: false, voucherReference: null, notes: '' });
  const [cashVerifiedMap, setCashVerifiedMap] = useState({});

  // FX Desk State
  const [fxForm, setFxForm] = useState({
    teamCode: 'TRAIN_T01',
    fromCurrency: 'INR',
    toCurrency: 'USD',
    amount: '88600'
  });

  // Team Practice State
  const [selectedTeamCode, setSelectedTeamCode] = useState('TRAIN_T01');
  const [orderForm, setOrderForm] = useState({
    ticker: 'RELIANCE',
    action: 'BUY',
    quantity: '10',
    orderType: 'MARKET'
  });

  // Journalist State
  const [newsForm, setNewsForm] = useState({
    headline: '',
    description: '',
    category: 'Corporate',
    sentiment: 'Positive',
    impactMagnitude: '3.5',
    affectedSecurityIds: 'RELIANCE'
  });

  // Automated Scenario Generator State
  const [scenariosList, setScenariosList] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('SCN_BUY_STANDARD');
  const [generatingScenario, setGeneratingScenario] = useState(false);

  // Show temporary toast notification
  const notify = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Poll sandbox state from backend
  const fetchSandboxState = async () => {
    try {
      const res = await apiFetch(`/api/training/state?operator=${encodeURIComponent(currentOperator)}`);
      if (res && res.success && res.sandbox) {
        setSandboxState(res.sandbox);
      }
    } catch (e) {
      // Backend may be offline or in mock browser mode; keep local state
    }
  };

  useEffect(() => {
    fetchSandboxState();
    const interval = setInterval(fetchSandboxState, 4000);
    return () => clearInterval(interval);
  }, [currentOperator]);

  // Fetch Automated Training Scenarios
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await apiFetch('/api/training/scenarios');
        if (res && res.success && Array.isArray(res.scenarios)) {
          setScenariosList(res.scenarios);
          if (res.scenarios[0] && !selectedScenarioId) {
            setSelectedScenarioId(res.scenarios[0].id);
          }
        }
      } catch (e) {}
    };
    fetchScenarios();
  }, []);

  // Handle Triggering Automated Training Scenario Task
  const handleTriggerScenario = async (targetScenarioId = selectedScenarioId) => {
    setGeneratingScenario(true);
    try {
      const res = await apiFetch('/api/training/scenario/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: targetScenarioId,
          deskId: 'DESK_1',
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify(`Scenario order(s) generated! ${res.message}`, 'success');
        fetchSandboxState();
      } else {
        notify(res?.error || 'Failed to trigger training scenario', 'danger');
      }
    } catch (e) {
      notify(e.message || 'Error generating scenario task', 'danger');
    } finally {
      setGeneratingScenario(false);
    }
  };

  // Handle Reset Sandbox
  const handleResetSandbox = async () => {
    if (!window.confirm('Are you sure you want to reset the training sandbox? This clears only simulated rehearsal orders, vouchers, and mock news. Live market data is strictly untouched.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/training/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveScorecards: true })
      });
      if (res && res.success) {
        notify('Sandbox training state reset successfully. Live event state preserved.', 'success');
        fetchSandboxState();
      }
    } catch (e) {
      setSandboxState(DEFAULT_FALLBACK_SANDBOX);
      notify('Local sandbox reset completed.', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Scorecard Metrics
  const scorecard = useMemo(() => {
    const sc = sandboxState.scorecards?.[currentOperator] || {};
    return {
      totalOperations: sc.totalOperations ?? 0,
      completedOperations: sc.completedOperations ?? 0,
      averageLatencySeconds: sc.averageLatencySeconds ?? 0,
      accuracyRate: sc.accuracyRate ?? 100,
      errorRate: sc.errorRate ?? 0,
      complianceScore: sc.complianceScore ?? 100,
      statusBadge: sc.statusBadge || 'EVENT READY'
    };
  }, [sandboxState.scorecards, currentOperator]);

  // Selected Team Details
  const activeTeam = useMemo(() => {
    return sandboxState.teams?.find(t => t.teamCode === selectedTeamCode || t.id === selectedTeamCode) || sandboxState.teams?.[0] || null;
  }, [sandboxState.teams, selectedTeamCode]);

  // -------------------------------------------------------------
  // EXCHANGE OPERATOR ACTIONS
  // -------------------------------------------------------------
  const handleClaimOrder = async (orderId) => {
    try {
      const res = await apiFetch('/api/training/order/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, deskId: 'DESK_1', operator: currentOperator })
      });
      if (res && res.success) {
        notify(`Order ${orderId} claimed by ${currentOperator}`, 'success');
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Failed to claim order', 'danger');
    }
  };

  const handleCheckSlip = async (orderId) => {
    try {
      const res = await apiFetch('/api/training/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, actionType: 'CHECK_SLIP', operator: currentOperator })
      });
      if (res && res.success) {
        notify('Physical slip verified and stamped', 'success');
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Slip check failed', 'danger');
    }
  };

  const handleApproveOrder = async (orderId, physicalSlipChecked) => {
    try {
      const res = await apiFetch('/api/training/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          actionType: 'ACCEPT',
          deskId: 'DESK_1',
          operator: currentOperator,
          physicalSlipChecked: physicalSlipChecked === true
        })
      });
      if (res && res.success) {
        notify(`Order approved! Settlement voucher ${res.voucher?.voucherReference} generated and routed to Bank Desk.`, 'success');
        fetchSandboxState();
      } else {
        notify(res?.error || 'Approval rejected by validation rules', 'warn');
      }
    } catch (e) {
      notify(e.message || 'Approval failed. Complete physical slip checklist first.', 'danger');
    }
  };

  const handleReturnOrderSubmit = async () => {
    if (!returnModal.reason.trim()) {
      notify('Return reason is mandatory', 'warn');
      return;
    }
    try {
      const res = await apiFetch('/api/training/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: returnModal.orderId,
          actionType: 'RETURN',
          returnReason: returnModal.reason,
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify(`Order returned to team with reason: "${returnModal.reason}"`, 'info');
        setReturnModal({ open: false, orderId: null, reason: '' });
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Return action failed', 'danger');
    }
  };

  const handleRejectOrderSubmit = async () => {
    if (!rejectModal.reason.trim()) {
      notify('Rejection reason is mandatory', 'warn');
      return;
    }
    try {
      const res = await apiFetch('/api/training/order/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: rejectModal.orderId,
          actionType: 'REJECT',
          rejectionReason: rejectModal.reason,
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify(`Order rejected: "${rejectModal.reason}". Locked resources released.`, 'info');
        setRejectModal({ open: false, orderId: null, reason: '' });
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Reject action failed', 'danger');
    }
  };

  // -------------------------------------------------------------
  // BANK TELLER ACTIONS
  // -------------------------------------------------------------
  const handleBankClaim = async (voucherReference) => {
    try {
      const res = await apiFetch('/api/training/bank/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherReference, bankDeskId: 'BANK_1', tellerName: currentOperator })
      });
      if (res && res.success) {
        notify(`Voucher ${voucherReference} claimed at Bank Desk`, 'success');
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Bank claim failed', 'danger');
    }
  };

  const handleBankSettle = async (voucherReference) => {
    try {
      const res = await apiFetch('/api/training/bank/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherReference, action: 'SETTLE', bankDeskId: 'BANK_1', tellerName: currentOperator })
      });
      if (res && res.success) {
        notify(`Voucher ${voucherReference} SETTLED! Funds & shares transferred in sandbox.`, 'success');
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Settlement failed', 'danger');
    }
  };

  const handleBankReject = async (voucherReference) => {
    try {
      const res = await apiFetch('/api/training/bank/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherReference, action: 'REJECT', bankDeskId: 'BANK_1', tellerName: currentOperator })
      });
      if (res && res.success) {
        notify(`Voucher ${voucherReference} rejected. Pre-reserved cash/shares released.`, 'info');
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Rejection failed', 'danger');
    }
  };

  const handleBankHoldSubmit = async () => {
    if (!holdModal.notes.trim()) {
      notify('Mandatory notes required when holding voucher for review.', 'warn');
      return;
    }
    try {
      const res = await apiFetch('/api/training/bank/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherReference: holdModal.voucherReference,
          bankDeskId: 'BANK_1',
          tellerName: currentOperator,
          notes: holdModal.notes
        })
      });
      if (res && res.success) {
        notify(`Voucher placed on hold: "${holdModal.notes}"`, 'info');
        setHoldModal({ open: false, voucherReference: null, notes: '' });
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'Hold failed', 'danger');
    }
  };

  // -------------------------------------------------------------
  // FX OPERATOR ACTIONS
  // -------------------------------------------------------------
  const handleFxConvert = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/training/fx/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode: fxForm.teamCode,
          fromCurrency: fxForm.fromCurrency,
          toCurrency: fxForm.toCurrency,
          amount: parseFloat(fxForm.amount),
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify(`FX conversion executed! Received ${res.transaction?.toAmount} ${fxForm.toCurrency}. Sandbox reserve updated.`, 'success');
        fetchSandboxState();
      } else {
        notify(res?.error || 'FX Conversion rejected by reserve guard', 'warn');
      }
    } catch (e) {
      notify(e.message || 'Conversion failed. Check team wallet and sandbox reserves.', 'danger');
    }
  };

  // -------------------------------------------------------------
  // TEAM PARTICIPANT ACTIONS
  // -------------------------------------------------------------
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/training/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode: selectedTeamCode,
          ticker: orderForm.ticker,
          action: orderForm.action,
          quantity: parseInt(orderForm.quantity, 10),
          orderType: orderForm.orderType,
          deskId: activeTeam?.assignedDesk || 'DESK_1',
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify(`Mock order created (${res.order?.ticketNumber})! ${res.order?.action === 'BUY' ? 'Pre-reserved cash +5% buffer' : 'Locked deliverable shares'}.`, 'success');
        fetchSandboxState();
      } else {
        notify(res?.error || 'Order rejected by risk guard', 'warn');
      }
    } catch (e) {
      notify(e.message || 'Order creation failed. Check available balance.', 'danger');
    }
  };

  // -------------------------------------------------------------
  // JOURNALIST ACTIONS
  // -------------------------------------------------------------
  const handlePublishNews = async (e) => {
    e.preventDefault();
    if (!newsForm.headline.trim() || newsForm.headline.trim().length < 5) {
      notify('Headline must be at least 5 characters.', 'warn');
      return;
    }
    try {
      const res = await apiFetch('/api/training/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: newsForm.headline,
          description: newsForm.description,
          category: newsForm.category,
          sentiment: newsForm.sentiment,
          impactMagnitude: parseFloat(newsForm.impactMagnitude) || 2.5,
          affectedSecurityIds: newsForm.affectedSecurityIds.split(',').map(s => s.trim()).filter(Boolean),
          operator: currentOperator
        })
      });
      if (res && res.success) {
        notify('Simulated news broadcast published strictly to Training Wire!', 'success');
        setNewsForm({
          headline: '',
          description: '',
          category: 'Corporate',
          sentiment: 'Positive',
          impactMagnitude: '3.5',
          affectedSecurityIds: 'RELIANCE'
        });
        fetchSandboxState();
      }
    } catch (e) {
      notify(e.message || 'News publication failed', 'danger');
    }
  };

  return (
    <div className="saamx-training-terminal min-h-screen p-4 md:p-6 bg-slate-950 text-slate-100 font-sans">
      {/* 1. TOP SANDBOX ISOLATION BANNER */}
      <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 shadow-lg shadow-amber-950/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wide uppercase text-amber-400 text-sm">
                SANDBOX ENVIRONMENT — ZERO LIVE IMPACT
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SANDBOX ISOLATION ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Practice simulation mode: mock wallets, sandbox reserves, and simulated news wire. Zero mutation to live event data or state.json.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Operator:</span>
            <input
              type="text"
              value={currentOperator}
              onChange={e => setCurrentOperator(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              placeholder="Operator ID"
            />
          </div>
          <button
            onClick={handleResetSandbox}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 transition flex items-center gap-1.5"
          >
            <IconRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reset Sandbox</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
          notification.type === 'danger' ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' :
          notification.type === 'warn' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' :
          'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
        }`}>
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white ml-4">✕</button>
        </div>
      )}

      {/* 2. OPERATOR PERFORMANCE SCORECARD PANEL */}
      <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <IconTarget size={16} className="text-amber-400" />
              <span>Operator Performance Scorecard & Telemetry</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live operational metrics for operator: <strong className="text-amber-300 font-mono">{currentOperator}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Readiness Tier:</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded border ${
              scorecard.complianceScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              scorecard.complianceScore >= 75 ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
              scorecard.complianceScore >= 60 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {scorecard.statusBadge}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Operations</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">{scorecard.totalOperations}</div>
            <div className="text-[10px] text-slate-500">{scorecard.completedOperations} completed</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Processing Speed</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{scorecard.averageLatencySeconds}s</div>
            <div className="text-[10px] text-slate-500">Average latency per action</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Accuracy Rate</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{scorecard.accuracyRate}%</div>
            <div className="text-[10px] text-slate-500">Protocol compliant</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Error Rate</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">{scorecard.errorRate}%</div>
            <div className="text-[10px] text-slate-500">Violations & rejections</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Compliance Score</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{scorecard.complianceScore} / 100</div>
            <div className="text-[10px] text-slate-500">Procedural fidelity</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Sandbox Fixtures</div>
            <div className="text-xs text-slate-300 font-mono">
              {sandboxState.orders?.length || 0} Orders<br />
              {sandboxState.vouchers?.length || 0} Vouchers
            </div>
            <div className="text-[10px] text-emerald-400">● Isolated in-memory</div>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE TAB SELECTOR BAR */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('drill')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'drill'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span>⚡ Floor Speed-Training Drill</span>
        </button>

        <button
          onClick={() => setActiveTab('exchange')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'exchange'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <IconExchange size={14} />
          <span>Exchange Operator Practice</span>
          {(sandboxState.orders?.length || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-current">
              {sandboxState.orders?.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <IconBuilding size={14} />
          <span>Bank Teller Practice</span>
          {(sandboxState.vouchers?.length || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/40 text-current">
              {sandboxState.vouchers?.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('fx')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'fx'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <IconActivity size={14} />
          <span>FX Desk Operator Practice</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'team'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <IconTrendingUp size={14} />
          <span>Team Participant Practice</span>
        </button>

        <button
          onClick={() => setActiveTab('journalist')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'journalist'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <IconFileText size={14} />
          <span>Journalist / News Wire Practice</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 0: SPEED REHEARSAL DRILL (Preserving M0 Desks 1-3) */}
      {activeTab === 'drill' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
            <strong className="text-amber-400">M0 Rehearsal Workstation:</strong> Staff drill simulator with live latency timer across Desks 1, 2, and 3. Automated rehearsal pacing adapts to simulated market activity.
          </div>
          <TrainingPage state={state} />
        </div>
      )}

      {/* TAB 1: EXCHANGE OPERATOR PRACTICE */}
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <IconExchange size={18} className="text-amber-400" />
                <span>Exchange Desk Practice Console (Intake, Verification & Bank Routing)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Operators inspect incoming practice tickets, perform mandatory physical slip checklist checks, and accept (route to Bank Desk) or reject/return with mandatory justification.
              </p>
            </div>
            <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-amber-300">
              Active Desk: DESK_1
            </div>
          </div>

          {/* AUTOMATED TRAINING SCENARIOS & TASK GENERATOR */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 border border-amber-500/30">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 uppercase tracking-wider">
                    Automated Training Simulator
                  </span>
                  <span className="text-xs text-slate-400">Zero manual order typing required</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-1">
                  Inject Realistic Scenario Tasks Directly into Exchange Queue
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a pre-configured market scenario. The simulation engine dispatches valid BUY/SELL slips, physical discrepancy challenges, or risk limit triggers directly into your triage queue.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select
                  value={selectedScenarioId}
                  onChange={e => setSelectedScenarioId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-amber-300 font-semibold focus:border-amber-400 focus:outline-none"
                >
                  {(scenariosList.length > 0 ? scenariosList : [
                    { id: 'SCN_BUY_STANDARD', title: 'Standard Institutional BUY Order' },
                    { id: 'SCN_SELL_STANDARD', title: 'Standard Institutional SELL Order' },
                    { id: 'SCN_CORRECTION_REQ', title: 'Physical Slip Discrepancy' },
                    { id: 'SCN_INSUFFICIENT_FUNDS', title: 'Capital Limit Breach' },
                    { id: 'SCN_INSUFFICIENT_HOLDINGS', title: 'Short Selling Breach' },
                    { id: 'SCN_MULTI_ORDER_RUSH', title: 'Multi-Desk Trading Floor Rush' }
                  ]).map(scn => (
                    <option key={scn.id} value={scn.id}>{scn.title}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleTriggerScenario(selectedScenarioId)}
                  disabled={generatingScenario}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <IconPlay size={13} />
                  <span>{generatingScenario ? 'Injecting Order...' : 'Generate Simulated Task / Order'}</span>
                </button>
              </div>
            </div>

            {/* Active Selected Scenario Details Preview */}
            {(() => {
              const activeScn = scenariosList.find(s => s.id === selectedScenarioId);
              if (!activeScn) return null;
              return (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-slate-400">
                    <strong className="text-slate-200">Objective:</strong> {activeScn.learningObjective}
                  </span>
                  <span className="text-slate-400">
                    <strong className="text-slate-200">Expected Action:</strong> <code className="text-amber-400 font-mono">{activeScn.expectedOutcome}</code>
                  </span>
                  {activeScn.simulatedDiscrepancy && (
                    <span className="text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/40">
                      Discrepancy Injected: {activeScn.simulatedDiscrepancy}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Orders Queue */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sandbox Order Queue ({(sandboxState.orders || []).length} Orders)
            </h4>

            {(!sandboxState.orders || sandboxState.orders.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-500 text-sm">
                No active orders in sandbox queue. Switch to the <strong>Team Participant Practice</strong> tab to submit practice orders.
              </div>
            ) : (
              <div className="grid gap-3">
                {sandboxState.orders.map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">{order.ticketNumber || order.id}</span>
                        <button
                          type="button"
                          onClick={() => setViewingForm({ type: 'TOS', data: order })}
                          className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700 rounded hover:bg-slate-700 transition"
                          title="Inspect Digital Trade Order Slip"
                        >
                          📄 Digital Slip
                        </button>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                          order.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {order.action} {order.quantity} × {order.ticker}
                        </span>
                        <span className="text-xs font-mono text-slate-400">@ ₹{order.price}</span>
                        <span className="text-xs font-mono text-slate-300 font-bold">(₹{(order.requestedValue || 0).toLocaleString()})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Team: <strong className="text-slate-200">{order.teamCode}</strong></span>
                        <span>•</span>
                        <span>Desk: <strong className="text-slate-200">{order.deskId || 'DESK_1'}</strong></span>
                        <span>•</span>
                        <span>
                          Physical Slip: {order.physicalSlipChecked ? (
                            <strong className="text-emerald-400 font-bold">✓ CHECKED & STAMPED</strong>
                          ) : (
                            <strong className="text-amber-400">⚠️ Awaiting Verification</strong>
                          )}
                        </span>
                        <span>•</span>
                        <span>Status: <strong className="text-cyan-400 font-mono">{order.status}</strong></span>
                      </div>
                    </div>

                    {/* Operator Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {order.status === 'AWAITING_PHYSICAL_SLIP' && (
                        <button
                          onClick={() => handleClaimOrder(order.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition"
                        >
                          Claim Order
                        </button>
                      )}

                      {!order.physicalSlipChecked && (
                        <button
                          onClick={() => handleCheckSlip(order.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition flex items-center gap-1"
                        >
                          <span>✓ Check Physical Slip</span>
                        </button>
                      )}

                      {order.status !== 'SETTLED' && order.status !== 'REJECTED' && (
                        <>
                          <button
                            onClick={() => handleApproveOrder(order.id, order.physicalSlipChecked)}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 text-slate-950 hover:bg-emerald-500 transition shadow"
                          >
                            Approve Order
                          </button>
                          <button
                            onClick={() => setReturnModal({ open: true, orderId: order.id, reason: '' })}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-900/30 text-amber-300 border border-amber-700/40 hover:bg-amber-900/50 transition"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, orderId: order.id, reason: '' })}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-900/30 text-rose-300 border border-rose-700/40 hover:bg-rose-900/50 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BANK TELLER PRACTICE */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <IconBuilding size={18} className="text-amber-400" />
                <span>Bank Settlement Desk Practice Console</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Bank Tellers receive approved settlement vouchers, verify physical cash/token exchanges, and execute two-phase delivery versus payment (DvP) in sandbox.
              </p>
            </div>
            <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-emerald-300">
              Bank Desk: BANK_1
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Settlement Vouchers Queue ({(sandboxState.vouchers || []).length} Vouchers)
            </h4>

            {(!sandboxState.vouchers || sandboxState.vouchers.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-500 text-sm">
                No vouchers in bank queue. Approve practice orders on the <strong>Exchange Operator Practice</strong> tab to route vouchers here.
              </div>
            ) : (
              <div className="grid gap-3">
                {sandboxState.vouchers.map(v => (
                  <div
                    key={v.id || v.voucherReference}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-emerald-400">{v.voucherReference}</span>
                        <button
                          type="button"
                          onClick={() => setViewingForm({ type: 'PIS', data: v })}
                          className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-emerald-300 border border-slate-700 rounded hover:bg-slate-700 transition"
                          title="Inspect Digital Bank Slip"
                        >
                          📄 Bank Voucher Slip
                        </button>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                          v.action === 'BUY' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {v.action === 'BUY' ? 'PAY_IN (Team Pays Cash)' : 'PAY_OUT (Disburse Proceeds)'}
                        </span>
                        <span className="text-xs font-bold text-slate-200">₹{(v.amount || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Team: <strong className="text-slate-200">{v.teamCode}</strong></span>
                        <span>•</span>
                        <span>Security: <strong className="text-slate-200">{v.quantity} × {v.ticker}</strong></span>
                        <span>•</span>
                        <span>Status: <strong className="text-amber-300 font-mono">{v.status}</strong></span>
                        {v.holdNotes && <span className="text-rose-300 italic">• Note: {v.holdNotes}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {v.status === 'PENDING' && (
                        <button
                          onClick={() => handleBankClaim(v.voucherReference)}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30"
                        >
                          Claim Voucher
                        </button>
                      )}

                      {v.status !== 'SETTLED' && v.status !== 'SETTLEMENT_REJECTED' && (
                        <>
                          <button
                            onClick={() => handleBankSettle(v.voucherReference)}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 text-slate-950 hover:bg-emerald-500 transition shadow"
                          >
                            ✓ Confirm Settle
                          </button>
                          <button
                            onClick={() => setHoldModal({ open: true, voucherReference: v.voucherReference, notes: '' })}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-900/30 text-amber-300 border border-amber-700/40 hover:bg-amber-900/50"
                          >
                            Hold for Review
                          </button>
                          <button
                            onClick={() => handleBankReject(v.voucherReference)}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-900/30 text-rose-300 border border-rose-700/40 hover:bg-rose-900/50"
                          >
                            Reject Settlement
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FX DESK OPERATOR PRACTICE */}
      {activeTab === 'fx' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <IconActivity size={18} className="text-amber-400" />
              <span>Currency FX Desk Practice Console</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Operators monitor finite sandbox foreign currency inventories and process spot currency conversions with dynamic bid/ask spreads.
            </p>
          </div>

          {/* Finite Reserves Inventory Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Finite Sandbox FX Desk Reserves
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(sandboxState.fxReserves || {}).map(([currency, resObj]) => {
                const avail = resObj?.availableReserve ?? (typeof resObj === 'number' ? resObj : 0);
                return (
                  <div key={currency} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs font-bold text-amber-400 font-mono">{currency}</div>
                    <div className="text-base font-bold font-mono text-slate-100 mt-1">
                      {avail.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">Available reserve</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FX Conversion Form */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 max-w-xl">
            <h4 className="text-sm font-bold text-slate-200 mb-3">Practice Currency Conversion</h4>
            <form onSubmit={handleFxConvert} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Team</label>
                  <select
                    value={fxForm.teamCode}
                    onChange={e => setFxForm({ ...fxForm, teamCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                  >
                    {(sandboxState.teams || []).map(t => (
                      <option key={t.teamCode} value={t.teamCode}>{t.teamCode} - {t.teamName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">From Currency</label>
                  <select
                    value={fxForm.fromCurrency}
                    onChange={e => setFxForm({ ...fxForm, fromCurrency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="INR">INR (Indian Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">To Currency</label>
                  <select
                    value={fxForm.toCurrency}
                    onChange={e => setFxForm({ ...fxForm, toCurrency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="JPY">JPY (Japanese Yen)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SGD">SGD (Singapore Dollar)</option>
                    <option value="INR">INR (Indian Rupee)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount</label>
                  <input
                    type="number"
                    value={fxForm.amount}
                    onChange={e => setFxForm({ ...fxForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                    placeholder="500000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
              >
                Execute Practice FX Conversion
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: TEAM PARTICIPANT PRACTICE */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <IconTrendingUp size={18} className="text-amber-400" />
                <span>Team Participant Practice Terminal</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Investment Houses submit practice orders, monitor 5% execution buffer pre-reservations, lock deliverable shares on sell, and track paper order slips.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Practicing Team:</span>
              <select
                value={selectedTeamCode}
                onChange={e => setSelectedTeamCode(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-amber-400 font-bold"
              >
                {(sandboxState.teams || []).map(t => (
                  <option key={t.teamCode} value={t.teamCode}>{t.teamCode} - {t.teamName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Team Wallets & Holdings Overview */}
          {activeTeam && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Sandbox Wallets & Cash
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">INR Balance:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{(activeTeam.cashWallets?.INR || activeTeam.cashBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Reserved Cash Buffer:</span>
                    <span className="font-mono font-bold text-amber-400">
                      ₹{(activeTeam.reservedCash?.INR || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">USD Wallet:</span>
                    <span className="font-mono text-slate-200">${(activeTeam.cashWallets?.USD || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">EUR Wallet:</span>
                    <span className="font-mono text-slate-200">€{(activeTeam.cashWallets?.EUR || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Deliverable Equity Holdings
                </h4>
                <div className="space-y-2 text-xs">
                  {Object.entries(activeTeam.holdings || {}).map(([ticker, qty]) => {
                    const locked = activeTeam.lockedHoldings?.[ticker] || 0;
                    return (
                      <div key={ticker} className="flex justify-between py-1 border-b border-slate-800">
                        <span className="font-bold text-slate-300">{ticker}:</span>
                        <div className="font-mono">
                          <span className="text-slate-200 font-bold">{qty} units</span>
                          {locked > 0 && <span className="text-rose-400 ml-2">({locked} locked)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Practice Order Entry & Automated Scenario Generator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-200">Submit Manual Practice Slip</h4>
                <span className="text-[11px] text-slate-400 font-medium">Optional Custom Slip</span>
              </div>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Security Ticker</label>
                    <select
                      value={orderForm.ticker}
                      onChange={e => setOrderForm({ ...orderForm, ticker: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="RELIANCE">RELIANCE (Reliance Industries)</option>
                      <option value="TCS">TCS (Tata Consultancy Services)</option>
                      <option value="INFY">INFY (Infosys Limited)</option>
                      <option value="HDFCBANK">HDFCBANK (HDFC Bank Ltd)</option>
                      <option value="TATASTEEL">TATASTEEL (Tata Steel Ltd)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Action</label>
                    <select
                      value={orderForm.action}
                      onChange={e => setOrderForm({ ...orderForm, action: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="BUY">BUY (+5% Cash Buffer)</option>
                      <option value="SELL">SELL (Lock Shares)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Order Type</label>
                    <select
                      value={orderForm.orderType}
                      onChange={e => setOrderForm({ ...orderForm, orderType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="LIMIT">LIMIT</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                >
                  Submit Manual Practice Slip
                </button>
              </form>
            </div>

            {/* Automated Scenario Drill Generator for Practice Teams */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900/80 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 uppercase tracking-wider">
                    Automated Task Generator
                  </span>
                  <span className="text-[11px] text-amber-300 font-semibold">Zero Manual Typing</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100">
                  Auto-Dispatch Realistic Scenario Task
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Start an automated training scenario to practice standard order verification, capital buffer checks, or error handling. Instantly creates a realistic simulated order under <strong>{selectedTeamCode}</strong> with zero live impact.
                </p>

                <div className="mt-4 space-y-2">
                  <label className="text-xs text-slate-400 block font-medium">Select Training Drill Scenario:</label>
                  <select
                    value={selectedScenarioId}
                    onChange={e => setSelectedScenarioId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-amber-300 font-semibold focus:border-amber-400 focus:outline-none"
                  >
                    {(scenariosList.length > 0 ? scenariosList : [
                      { id: 'SCN_BUY_STANDARD', title: 'Standard Institutional BUY Order' },
                      { id: 'SCN_SELL_STANDARD', title: 'Standard Institutional SELL Order' },
                      { id: 'SCN_CORRECTION_REQ', title: 'Physical Slip Discrepancy' },
                      { id: 'SCN_INSUFFICIENT_FUNDS', title: 'Capital Limit Breach' },
                      { id: 'SCN_INSUFFICIENT_HOLDINGS', title: 'Short Selling Breach' },
                      { id: 'SCN_MULTI_ORDER_RUSH', title: 'Multi-Desk Trading Floor Rush' }
                    ]).map(scn => (
                      <option key={scn.id} value={scn.id}>{scn.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => handleTriggerScenario(selectedScenarioId)}
                  disabled={generatingScenario}
                  className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <IconPlay size={14} />
                  <span>{generatingScenario ? 'Dispatching Simulated Task...' : 'Start Scenario & Auto-Dispatch Order'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Team Practice Orders & Ledger Status */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Team {selectedTeamCode} Practice Orders & Triage Status
            </h4>
            {(() => {
              const teamOrders = (sandboxState.orders || []).filter(o => o.teamCode === selectedTeamCode);
              if (teamOrders.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No orders in practice queue yet. Click "Start Scenario & Auto-Dispatch Order" above to practice!
                  </div>
                );
              }
              return (
                <div className="divide-y divide-slate-800 text-xs">
                  {teamOrders.map(o => (
                    <div key={o.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{o.ticketNumber || o.id}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          o.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {o.action} {o.quantity} {o.ticker}
                        </span>
                        <span className="font-mono text-slate-400">@ ₹{o.price}</span>
                        <span className="text-slate-400">(₹{(o.requestedValue || 0).toLocaleString()})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">Desk: <strong className="text-slate-200">{o.deskId}</strong></span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                          o.status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-300' :
                          o.status === 'REJECTED' || o.status === 'SETTLEMENT_REJECTED' ? 'bg-rose-500/20 text-rose-300' :
                          o.status === 'RETURNED_TO_TEAM' ? 'bg-amber-500/20 text-amber-300' :
                          o.status === 'EXCHANGE_APPROVED' ? 'bg-cyan-500/20 text-cyan-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 5: JOURNALIST / NEWS WIRE PRACTICE */}
      {activeTab === 'journalist' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <IconFileText size={18} className="text-amber-400" />
              <span>Journalist & News Wire Practice Console</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Press correspondents draft and publish simulated market-moving news catalysts directly into the sandbox news feed. Strictly segregated with zero leakage into live market tickers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* News Drafting Form */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 mb-3">Compose Simulated Breaking News</h4>
              <form onSubmit={handlePublishNews} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Headline (Min. 5 characters)</label>
                  <input
                    type="text"
                    value={newsForm.headline}
                    onChange={e => setNewsForm({ ...newsForm, headline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    placeholder="e.g. RBI Announces Regulatory Liquidity Enhancement"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description / Lead Story</label>
                  <textarea
                    value={newsForm.description}
                    onChange={e => setNewsForm({ ...newsForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    rows="3"
                    placeholder="Provide contextual simulated facts for analyst and trader rehearsal."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Category</label>
                    <select
                      value={newsForm.category}
                      onChange={e => setNewsForm({ ...newsForm, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="Corporate">Corporate Earnings</option>
                      <option value="Macro">Macroeconomic Policy</option>
                      <option value="Regulatory">SEBI / Regulatory Action</option>
                      <option value="Sector">Sector Trends</option>
                      <option value="Crisis">Crisis Act / Breaking</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Sentiment</label>
                    <select
                      value={newsForm.sentiment}
                      onChange={e => setNewsForm({ ...newsForm, sentiment: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="Positive">Positive / Bullish</option>
                      <option value="Negative">Negative / Bearish</option>
                      <option value="Neutral">Neutral</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Impact Magnitude (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newsForm.impactMagnitude}
                      onChange={e => setNewsForm({ ...newsForm, impactMagnitude: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Affected Tickers (comma-separated)</label>
                    <input
                      type="text"
                      value={newsForm.affectedSecurityIds}
                      onChange={e => setNewsForm({ ...newsForm, affectedSecurityIds: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  Broadcast News to Sandbox Feed
                </button>
              </form>
            </div>

            {/* Sandbox News Feed */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <span>Sandbox News Wire</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TRAINING / SANDBOX NEWS
                </span>
              </h4>

              {(!sandboxState.newsEvents || sandboxState.newsEvents.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No simulated news published yet. Draft and broadcast a practice article to see it appear here.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {sandboxState.newsEvents.map(item => (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-100">{item.headline}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                          item.sentiment === 'Positive' || item.sentiment === 'Bullish' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.sentiment === 'Negative' || item.sentiment === 'Bearish' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {item.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                        <span>Category: {item.category}</span>
                        <span>•</span>
                        <span>Impact: ±{item.impactMagnitude}%</span>
                        <span>•</span>
                        <span>By: {item.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RETURN ORDER FOR CORRECTION */}
      {returnModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-amber-300">Return Order for Correction</h4>
            <p className="text-xs text-slate-400">
              Enter mandatory defect justification before returning ticket to team.
            </p>
            <textarea
              value={returnModal.reason}
              onChange={e => setReturnModal({ ...returnModal, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
              rows="3"
              placeholder="e.g. Signature missing on physical paper slip"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReturnModal({ open: false, orderId: null, reason: '' })}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnOrderSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded hover:bg-amber-400"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT ORDER */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-rose-300">Reject Practice Order</h4>
            <p className="text-xs text-slate-400">
              Enter mandatory rejection reason. Pre-reserved cash or locked shares will be released back to the team.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
              rows="3"
              placeholder="e.g. Counterparty risk limit exceeded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModal({ open: false, orderId: null, reason: '' })}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectOrderSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded hover:bg-rose-500"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HOLD BANK VOUCHER */}
      {holdModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-amber-300">Place Settlement Voucher on Hold</h4>
            <p className="text-xs text-slate-400">
              Mandatory hold notes required by bank audit regulations.
            </p>
            <textarea
              value={holdModal.notes}
              onChange={e => setHoldModal({ ...holdModal, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
              rows="3"
              placeholder="e.g. Physical token discrepancy under teller investigation"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setHoldModal({ open: false, voucherReference: null, notes: '' })}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBankHoldSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded hover:bg-amber-400"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DIGITAL PRACTICE FORM INSPECTION MODAL */}
      {viewingForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-4 shadow-2xl">
            {viewingForm.type === 'TOS' ? (
              <DigitalTradeOrderSlip order={viewingForm.data} onClose={() => setViewingForm(null)} />
            ) : (
              <DigitalBankSlip voucher={viewingForm.data} onClose={() => setViewingForm(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { TrainingTerminal };
