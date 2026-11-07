import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, calculateMarketClock } from '../lib/api.js';
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
  IconActivity,
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconMegaphone,
  IconPause,
  IconPlay,
  IconShieldAlert,
  IconArrowRight,
  IconZap
} from '../lib/icons.jsx';

export default function FloorOperationsDashboard({ state, connected }) {
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [desksData, setDesksData] = useState([]);
  const [fxQueue, setFxQueue] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [toasts, setToasts] = useState([]);

  // Operational Control Modals
  const [showControlModal, setShowControlModal] = useState(null); // 'PAUSE', 'RESUME', 'DIRECTIVE'
  const [directiveHeadline, setDirectiveHeadline] = useState('');
  const [directiveBody, setDirectiveBody] = useState('');
  const [directiveSeverity, setDirectiveSeverity] = useState('HIGH');
  const [isSubmittingControl, setIsSubmittingControl] = useState(false);

  const userRole = (sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role') || '').toLowerCase();
  const userName = sessionStorage.getItem('saamx_username') || sessionStorage.getItem('fms_username') || 'Floor Operator';
  const canControlMarket = ['admin', 'operator_x', 'super_admin'].includes(userRole);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date(Date.now() + serverTimeOffset);
      setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Fetch desks and FX queue periodically
  useEffect(() => {
    const fetchOpsData = async () => {
      try {
        const [desksDataJson, fxDataJson] = await Promise.all([
          apiFetch('/api/order-desks').then(r => r.json()).catch(() => null),
          apiFetch('/api/fx/queue').then(r => r.json()).catch(() => null)
        ]);
        if (desksDataJson?.desks) setDesksData(desksDataJson.desks);
        if (fxDataJson?.queue) setFxQueue(fxDataJson.queue);
        setLastRefresh(Date.now());
      } catch (e) {
        console.error('Error fetching ops data:', e);
      }
    };

    fetchOpsData();
    const interval = setInterval(fetchOpsData, 3000);
    return () => clearInterval(interval);
  }, []);

  const marketClock = useMemo(() => {
    return calculateMarketClock(state?.marketState, serverTimeOffset);
  }, [state?.marketState, serverTimeOffset]);

  const sessionStatus = state?.marketState?.status || 'Closed';
  const sessionPhase = state?.marketState?.sessionState || 'PRE_OPEN';
  const isMarketOpen = sessionStatus === 'Open' || sessionPhase === 'CONTINUOUS_TRADING';
  const isMarketPaused = sessionStatus === 'Paused' || state?.marketState?.isFrozen;

  // Team counts & lifecycle metrics
  const teamsList = useMemo(() => {
    if (!state?.teams) return [];
    return Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
  }, [state?.teams]);

  const investmentHouses = useMemo(() => {
    if (!state?.investmentHouses) return [];
    return Array.isArray(state.investmentHouses) ? state.investmentHouses : Object.values(state.investmentHouses);
  }, [state?.investmentHouses]);

  const registeredCount = investmentHouses.length || teamsList.length;
  const verifiedCount = investmentHouses.filter(h => h.verificationStatus === 'VERIFIED').length || teamsList.filter(t => t.isActive).length;
  const readyCount = investmentHouses.filter(h => h.participantLifecycle === 'READY' || h.participantLifecycle === 'MARKET_ACTIVE').length || teamsList.filter(t => t.isActive).length;
  const activeTradingCount = teamsList.filter(t => t.isActive && t.status !== 'LOCKED').length;

  // Order Queue metrics
  const allOrders = useMemo(() => {
    if (!state?.orders) return [];
    return Array.isArray(state.orders) ? state.orders : Object.values(state.orders);
  }, [state?.orders]);

  const ordersInQueue = allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length;
  const ordersAwaitingVerification = allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING'].includes(o.status)).length;
  const ordersInVerification = allOrders.filter(o => o.status === 'VERIFYING').length;
  const ordersValidatedReady = allOrders.filter(o => o.status === 'VALIDATED').length;
  const ordersExecutedTotal = allOrders.filter(o => ['EXECUTED', 'SETTLED', 'EXECUTED_PENDING_SETTLEMENT'].includes(o.status)).length;
  const ordersReturnedTotal = allOrders.filter(o => o.status === 'RETURNED_FOR_CORRECTION').length;

  // FX Queue metrics
  const activeFxCount = fxQueue.filter(f => ['QUEUED', 'RATE_CHECK', 'PROCESSING'].includes(f.status)).length;
  const settledFxCount = fxQueue.filter(f => f.status === 'SETTLED').length;

  // Next scheduled event / narrative milestone
  const nextScheduledEvent = useMemo(() => {
    const elapsedMinutes = marketClock.elapsedMinutes || 0;
    const acts = [
      { minute: 8, label: 'DTAI Loss Announcement (-22%)', code: 'ACT_1' },
      { minute: 16, label: 'OpenAI Hyperscale IPO (OAI) Listing', code: 'IPO_1' },
      { minute: 20, label: 'Mystery Buyer Recovery Surge (+12%)', code: 'ACT_2' },
      { minute: 25, label: 'Leadership Upheaval CEO Resignation (-8%)', code: 'ACT_3' },
      { minute: 30, label: 'Stripe Global Infra IPO (STRP) Listing', code: 'IPO_2' },
      { minute: 32, label: 'Pump Phase: Velocity Spike to ₹420', code: 'ACT_4' },
      { minute: 35, label: 'Tata Strategic Acquisition Rumour (+8%)', code: 'ACT_5' },
      { minute: 47, label: 'SEBI Regulatory Notice / Hint', code: 'HINT' },
      { minute: 50, label: 'SEBI Enforcement Investigation (-25%)', code: 'ACT_6' },
      { minute: 54, label: 'Floor Trading Halt & Circuit Freeze', code: 'ACT_7' },
      { minute: 56, label: 'Bankruptcy Declaration & Final Liquidation', code: 'ACT_8' }
    ];
    return acts.find(a => a.minute > elapsedMinutes) || { minute: 60, label: 'Market Closing Bell & Multi-Currency Settlement', code: 'CLOSE' };
  }, [marketClock.elapsedMinutes]);

  const currentEvent = (state?.events || []).find(e => e.eventId === state?.currentEventId) || state?.events?.[0];

  // Recent operational audit logs
  const recentAuditLogs = useMemo(() => {
    const logs = state?.auditLog || [];
    return [...logs].reverse().slice(0, 8);
  }, [state?.auditLog]);

  // Handle Market Pause / Resume Action
  const handleMarketAction = async (actionType) => {
    setIsSubmittingControl(true);
    try {
      const res = await apiFetch('/api/market/control', {
        method: 'POST',
        body: JSON.stringify({ action: actionType })
      });
      if (res.error) {
        addToast(`Market Control Failed: ${res.error}`, 'error');
      } else {
        addToast(`Market successfully updated: ${actionType}`, 'success');
        setShowControlModal(null);
      }
    } catch (e) {
      console.error(e);
      addToast('Network error updating market status', 'error');
    } finally {
      setIsSubmittingControl(false);
    }
  };

  // Dispatch Urgent Floor Directive
  const handleDispatchDirective = async (e) => {
    e.preventDefault();
    if (!directiveHeadline.trim()) {
      addToast('Directive headline is required', 'error');
      return;
    }
    setIsSubmittingControl(true);
    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        body: JSON.stringify({
          headline: `[OPERATIONAL DIRECTIVE] ${directiveHeadline.trim()}`,
          description: directiveBody.trim() || 'Floor instruction issued by Exchange Controller.',
          category: 'Exchange',
          sentiment: 'Neutral',
          severity: directiveSeverity,
          impactPercent: 0,
          isCustom: true
        })
      });
      if (res.ok || res.success) {
        addToast('Operational Directive broadcasted to all screens!', 'success');
        setDirectiveHeadline('');
        setDirectiveBody('');
        setShowControlModal(null);
      } else {
        addToast('Failed to broadcast directive', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error broadcasting directive', 'error');
    } finally {
      setIsSubmittingControl(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
      
      {/* Toast Notification Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />

      {/* Top Operations Header */}
      <div className="card-primary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: '6px solid var(--color-brass)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #1E232B, #333d4b)', 
              color: '#D4AF37', 
              fontSize: '0.72rem', 
              fontWeight: 900, 
              padding: '3px 8px', 
              borderRadius: '4px', 
              letterSpacing: '0.06em' 
            }}>
              INTERNAL FLOOR STAFF ONLY
            </span>
            <span style={{ fontSize: '0.8rem', color: connected ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 700 }}>
              ● {connected ? 'TELEMETRY SYNCED' : 'DISCONNECTED'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
              Operator: <strong>{userName}</strong> ({userRole.toUpperCase()})
            </span>
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, fontFamily: 'var(--font-brand)', margin: '4px 0 2px 0', color: 'var(--color-ink)' }}>
            SAAMX Floor Operations Radar
          </h1>

          <div style={{ fontSize: '0.82rem', color: 'var(--color-ink-2)' }}>
            {currentEvent?.eventName || 'SAAMX Live Championship'} &bull; Floor Mode: <strong style={{ color: currentEvent?.eventMode === 'REHEARSAL' ? 'var(--color-brass)' : 'var(--color-rise)' }}>{currentEvent?.eventMode || 'LIVE'}</strong>
          </div>
        </div>

        {/* Real-time Exchange Clock & Session State */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>EXCHANGE CLOCK</div>
            <div className="font-data font-mono tabular-nums" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-ink)', lineHeight: 1.1 }}>
              {currentTimeStr || '09:15:00 AM'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)' }}>Session: {marketClock.timeString}</div>
          </div>

          <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>SESSION STATUS</div>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 900, 
              color: isMarketPaused ? 'var(--color-fall)' : isMarketOpen ? 'var(--color-rise)' : 'var(--color-brass)',
              lineHeight: 1.2
            }}>
              {isMarketPaused ? 'PAUSED / FROZEN' : isMarketOpen ? 'CONTINUOUS TRADING' : sessionPhase}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Remaining: <strong className="font-mono tabular-nums">{marketClock.timeLeftString}</strong></div>
          </div>

          {/* Quick Authorized Control Buttons */}
          {canControlMarket && (
            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
              {isMarketOpen && !isMarketPaused ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowControlModal('PAUSE')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconPause size={14} />
                    <span>Pause Trading</span>
                  </span>
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowControlModal('RESUME')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconPlay size={14} />
                    <span>Resume Trading</span>
                  </span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowControlModal('DIRECTIVE')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconMegaphone size={14} />
                  <span>Broadcast Directive</span>
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Urgent System Condition Banner */}
      {(state?.marketState?.isFrozen || ordersAwaitingVerification >= 10 || !connected) && (
        <div style={{ 
          background: state?.marketState?.isFrozen ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', 
          border: `1.5px solid ${state?.marketState?.isFrozen ? 'var(--color-fall)' : 'var(--color-brass)'}`, 
          borderRadius: '8px', 
          padding: '14px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ color: state?.marketState?.isFrozen ? 'var(--color-fall)' : 'var(--color-brass)', fontWeight: 900, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {state?.marketState?.isFrozen ? (
                <>
                  <IconAlertTriangle size={18} />
                  <span>EMERGENCY MARKET FREEZE ACTIVE</span>
                </>
              ) : ordersAwaitingVerification >= 10 ? (
                <>
                  <IconZap size={18} />
                  <span>HIGH TICKET QUEUE BACKLOG ON FLOOR</span>
                </>
              ) : (
                <>
                  <IconAlertTriangle size={18} />
                  <span>TELEMETRY CONNECTION LOST</span>
                </>
              )}
            </div>
            <div style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', marginTop: '2px' }}>
              {state?.marketState?.isFrozen 
                ? 'All secondary trading desks and FX operations locked by Executive Controller.' 
                : ordersAwaitingVerification >= 10 
                  ? `${ordersAwaitingVerification} paper order slips are currently awaiting clerk claim across the 5 exchange desks.` 
                  : 'Reconnecting to live simulation event stream...'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="#/exchange" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                Clear Order Slips →
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Main Operational KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        
        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>REGISTERED HOUSES</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-brass)', margin: '4px 0' }}>{registeredCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>{verifiedCount} verified on ledger</div>
        </div>

        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>ACTIVE FLOOR TEAMS</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-rise)', margin: '4px 0' }}>{activeTradingCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>{readyCount} ready for clearance</div>
        </div>

        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>ORDERS IN QUEUE</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: ordersInQueue > 0 ? 'var(--color-brass)' : 'var(--color-ink-3)', margin: '4px 0' }}>{ordersInQueue}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
            <span style={{ color: ordersAwaitingVerification > 0 ? 'var(--color-fall)' : 'var(--color-rise)', fontWeight: 700 }}>
              {ordersAwaitingVerification} unverified
            </span> &bull; {ordersInVerification} verifying
          </div>
        </div>

        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>EXECUTED ORDERS</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-rise)', margin: '4px 0' }}>{ordersExecutedTotal}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>{ordersValidatedReady} ready for execution</div>
        </div>

        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>RETURNED FOR CORRECTION</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: ordersReturnedTotal > 0 ? 'var(--color-fall)' : 'var(--color-ink-3)', margin: '4px 0' }}>{ordersReturnedTotal}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Awaiting team slip correction</div>
        </div>

        <div className="card-data" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>FX CLEARANCE QUEUE</div>
          <div className="font-data font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 900, color: activeFxCount > 0 ? 'var(--color-brass)' : 'var(--color-ink-3)', margin: '4px 0' }}>
            {activeFxCount} <span style={{ fontSize: '1rem', color: 'var(--color-ink-3)' }}>/ {settledFxCount}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Multi-currency spot desk</div>
        </div>
      </div>

      {/* Middle Section: 5 Order Desks Distribution & Event Milestone Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* 5 Simultaneous Physical Order Desks Status */}
        <div className="card-primary" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: 'var(--color-ink)' }}>
                Simultaneous Order Desks (5 Physical Clearance Desks)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                Live workload distribution across authorized exchange clerks.
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)' }}>
              Auto-synced: {new Date(lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'].map(dId => {
              const live = desksData.find(x => x.id === dId);
              const stateDesk = state?.orderDesks?.[dId];
              const name = live?.name || stateDesk?.name || `Desk ${dId.replace('DESK_', '')}`;
              const operator = live?.operator || stateDesk?.operatorDisplayName || stateDesk?.operator || 'Unassigned';
              const color = live?.color || stateDesk?.color || (dId === 'DESK_1' ? '#3B82F6' : dId === 'DESK_2' ? '#F59E0B' : dId === 'DESK_3' ? '#10B981' : dId === 'DESK_4' ? '#8B5CF6' : '#EC4899');
              const inFlight = live?.activeQueueCount ?? allOrders.filter(o => o.deskId === dId && ['VERIFYING', 'VALIDATED'].includes(o.status)).length;
              const totalDone = live?.totalProcessed ?? allOrders.filter(o => o.executedByDesk === dId && o.status === 'EXECUTED').length;

              return (
                <div 
                  key={dId} 
                  style={{ 
                    background: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', 
                    borderTop: `4px solid ${color}`, 
                    borderRadius: '8px', 
                    padding: '12px 10px', 
                    textAlign: 'center' 
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: color }}>{name.toUpperCase()}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-ink)', fontWeight: 700, margin: '2px 0 8px 0' }}>{operator}</div>
                  
                  <div style={{ background: 'var(--color-surface-2)', padding: '6px', borderRadius: '4px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.66rem', color: 'var(--color-ink-3)', fontWeight: 800 }}>IN-FLIGHT</div>
                    <div className="font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: inFlight > 0 ? 'var(--color-brass)' : 'var(--color-ink-3)' }}>{inFlight}</div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)' }}>
                    Settled: <strong style={{ color: 'var(--color-rise)' }}>{totalDone}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
              Unassigned Paper Slips: <strong style={{ color: ordersAwaitingVerification > 0 ? 'var(--color-fall)' : 'var(--color-rise)' }}>{ordersAwaitingVerification}</strong> awaiting clerk claim
            </span>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <a href="#/desk-dashboard" style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none' }}>
                Open Queue Dashboard →
              </a>
              <a href="#/exchange" style={{ color: 'var(--color-brass)', fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none' }}>
                Open Exchange Desks →
              </a>
            </div>
          </div>
        </div>

        {/* Narrative Milestone Radar */}
        <div className="card-primary" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 12px 0', color: 'var(--color-ink)' }}>
            Event Timeline Radar
          </h3>
          
          <div style={{ background: 'var(--color-surface-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-brass)', fontWeight: 800, letterSpacing: '0.05em' }}>NEXT UPCOMING SCENARIO</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-ink)', margin: '4px 0 2px 0' }}>
              {nextScheduledEvent.label}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-brass)' }}>
              Scheduled at T+{nextScheduledEvent.minute} min (Elapsed: {Math.floor(marketClock.elapsedMinutes || 0)} min)
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>&bull; Circuit Breaker Limit: <strong>&plusmn;30% / 5 min</strong></div>
            <div>&bull; Max Position Allocation: <strong>35% of Capital</strong></div>
            <div>&bull; Short Selling: <strong style={{ color: state?.riskControls?.allowShortSelling ? 'var(--color-rise)' : 'var(--color-fall)' }}>{state?.riskControls?.allowShortSelling ? 'ALLOWED' : 'PROHIBITED'}</strong></div>
            <div>&bull; Physical Paper Intake: <strong style={{ color: 'var(--color-rise)' }}>ACTIVE (5 CLERK DESKS)</strong></div>
          </div>
        </div>
      </div>

      {/* Bottom Operational Feeds: Active Slip Queue & Live Audit Log Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Active Inbound Paper Orders Queue */}
        <div className="card-primary" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-ink)' }}>
              Live Inbound Order Queue ({ordersInQueue})
            </h4>
            <a href="#/exchange" style={{ fontSize: '0.76rem', color: 'var(--color-brass)', fontWeight: 800, textDecoration: 'none' }}>
              Process in Exchange Desk →
            </a>
          </div>

          {allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <IconCheck size={16} color="var(--color-rise)" />
              <span>All paper order slips have been verified and settled. Clearance queue is clear.</span>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).slice(0, 10).map(o => (
                <div 
                  key={o.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'var(--color-surface)', 
                    padding: '10px 14px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--color-border)', 
                    fontSize: '0.8rem' 
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 900, color: 'var(--color-brass)', fontFamily: 'monospace' }}>#{o.ticketNumber}</span> &bull; <strong style={{ color: 'var(--color-ink)' }}>Team {o.teamCode}</strong>
                    <div style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', marginTop: '2px' }}>
                      <span style={{ color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 800 }}>{o.action}</span> {o.quantity} {o.ticker} ({o.orderType})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      background: o.status === 'VALIDATED' ? 'rgba(16,185,129,0.15)' : o.status === 'VERIFYING' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', 
                      color: o.status === 'VALIDATED' ? 'var(--color-rise)' : o.status === 'VERIFYING' ? '#3B82F6' : 'var(--color-brass)' 
                    }}>
                      {o.status}
                    </span>
                    {o.deskId && <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-3)', marginTop: '2px' }}>Locked: {o.deskId}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Operational Action & Audit Stream */}
        <div className="card-primary" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShieldAlert size={16} color="var(--color-brass)" />
              <span>Live Operational Actions & Audit Stream</span>
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)' }}>Immutable Ledger</span>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>
              No operational actions logged in current session.
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentAuditLogs.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    background: 'var(--color-surface)', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--color-border)', 
                    fontSize: '0.76rem' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-brass)' }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--color-ink-3)', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                    Actor: {log.actor} ({log.role || 'system'}) &bull; Target: {log.target}
                  </div>
                  {log.reason && (
                    <div style={{ color: 'var(--color-ink-3)', fontSize: '0.72rem', marginTop: '2px' }}>
                      {log.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Control Modals: Pause, Resume, Directive */}
      <Modal
        isOpen={showControlModal === 'PAUSE'}
        onClose={() => setShowControlModal(null)}
        title="Confirm Market Pause"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setShowControlModal(null)}>Cancel</Button>
            <Button 
              variant="danger" 
              disabled={isSubmittingControl}
              onClick={() => handleMarketAction('PAUSE')}
            >
              {isSubmittingControl ? 'Pausing...' : 'Confirm Pause'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: 1.4 }}>
          Are you sure you want to pause continuous trading? Order matching will halt, and desk clerks will not be able to execute slips until resumed.
        </p>
      </Modal>

      <Modal
        isOpen={showControlModal === 'RESUME'}
        onClose={() => setShowControlModal(null)}
        title="Confirm Market Resume"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setShowControlModal(null)}>Cancel</Button>
            <Button 
              variant="success" 
              disabled={isSubmittingControl}
              onClick={() => handleMarketAction('START')}
            >
              {isSubmittingControl ? 'Resuming...' : 'Confirm Resume'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: 1.4 }}>
          Are you sure you want to resume continuous trading? Desks will immediately be unlocked to clear verified paper slips.
        </p>
      </Modal>

      <Modal
        isOpen={showControlModal === 'DIRECTIVE'}
        onClose={() => setShowControlModal(null)}
        title="Broadcast Operational Floor Directive"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setShowControlModal(null)}>Cancel</Button>
            <Button 
              type="button" 
              variant="primary" 
              disabled={isSubmittingControl}
              onClick={handleDispatchDirective}
            >
              {isSubmittingControl ? 'Broadcasting...' : 'Broadcast to Floor →'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDispatchDirective} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-ink-2)' }}>
            This will immediately dispatch a high-priority operational notice to all connected trading desks, central projectors, and participant terminals.
          </p>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>Directive Headline</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. DESK 3 ROTATION — RUNNERS DISPATCH TO DESK 1"
              value={directiveHeadline}
              onChange={(e) => setDirectiveHeadline(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>Instructions / Details</label>
            <textarea
              className="input-field"
              style={{ height: '70px', resize: 'none' }}
              placeholder="Provide specific floor details for runners, clerks, or teams..."
              value={directiveBody}
              onChange={(e) => setDirectiveBody(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>Severity</label>
            <select
              className="input-field"
              value={directiveSeverity}
              onChange={(e) => setDirectiveSeverity(e.target.value)}
            >
              <option value="CRITICAL">CRITICAL (Immediate Audio/Visual Alert)</option>
              <option value="HIGH">HIGH (Standard Urgent Floor Directive)</option>
              <option value="INFO">INFO (Informational Logistics Notice)</option>
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
