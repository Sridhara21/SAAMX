import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, calculateMarketClock } from '../lib/api.js';

export default function FloorOperationsDashboard({ state, connected }) {
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [desksData, setDesksData] = useState([]);
  const [fxQueue, setFxQueue] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

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
        const [desksRes, fxRes] = await Promise.all([
          apiFetch('/api/order-desks').catch(() => null),
          apiFetch('/api/fx/queue').catch(() => null)
        ]);
        if (desksRes?.desks) setDesksData(desksRes.desks);
        if (fxRes?.queue) setFxQueue(fxRes.queue);
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
  const ordersExecutedTotal = allOrders.filter(o => o.status === 'EXECUTED').length;

  // FX Queue metrics
  const activeFxCount = fxQueue.filter(f => ['QUEUED', 'RATE_CHECK', 'PROCESSING'].includes(f.status)).length;
  const settledFxCount = fxQueue.filter(f => f.status === 'SETTLED').length;

  // Next scheduled event / narrative milestone
  const nextScheduledEvent = useMemo(() => {
    const elapsedMinutes = marketClock.elapsedMinutes || 0;
    const acts = [
      { minute: 8, label: 'DTAI Loss Announcement (-22%)' },
      { minute: 16, label: 'OpenAI Hyperscale IPO (OAI)' },
      { minute: 20, label: 'Mystery Buyer Recovery Surge' },
      { minute: 25, label: 'Leadership Upheaval (-8%)' },
      { minute: 30, label: 'Stripe Global Infra IPO (STRP)' },
      { minute: 32, label: 'Goldman Pump Velocity to ₹420' },
      { minute: 35, label: 'Tata Acquisition Rumour (+8%)' },
      { minute: 47, label: 'SEBI Regulatory Notice Hint' },
      { minute: 50, label: 'SEBI Investigation Opened (-25%)' },
      { minute: 54, label: 'Trading Suspension (Halt)' },
      { minute: 56, label: 'Bankruptcy Declaration' }
    ];
    return acts.find(a => a.minute > elapsedMinutes) || { minute: 60, label: 'Market Closing & Final Settlement' };
  }, [marketClock.elapsedMinutes]);

  const currentEvent = (state?.events || []).find(e => e.eventId === state?.currentEventId) || state?.events?.[0];

  return (
    <div style={{ backgroundColor: '#090D14', color: '#E2E8F0', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Top Operations Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ background: '#3B82F6', color: '#FFF', fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>
              INTERNAL FLOOR STAFF ONLY
            </span>
            <span style={{ fontSize: '0.85rem', color: connected ? '#10B981' : '#EF4444', fontWeight: 600 }}>
              ● {connected ? 'TELEMETRY SYNCED' : 'DISCONNECTED'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '6px 0 2px 0' }}>
            SAAMX Floor Operations Radar
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            {currentEvent?.eventName || 'SAAMX Live Championship'} • Mode: <strong style={{ color: currentEvent?.eventMode === 'REHEARSAL' ? '#F59E0B' : '#10B981' }}>{currentEvent?.eventMode || 'LIVE'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>EXCHANGE CLOCK</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', fontFamily: 'monospace' }}>
              {currentTimeStr || '09:15:00 AM'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>SESSION STATUS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: state?.marketState?.status === 'Open' ? '#10B981' : state?.marketState?.status === 'Paused' ? '#F59E0B' : '#EF4444' }}>
              {state?.marketState?.status?.toUpperCase() || 'NOT STARTED'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{marketClock.timeLeftString}</div>
          </div>
        </div>
      </div>

      {/* Emergency Freeze Alert Banner if market is frozen */}
      {state?.marketState?.isFrozen && (
        <div style={{ background: 'rgba(239, 68, 68, 0.25)', border: '2px solid #EF4444', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#FCA5A5', fontWeight: 800, fontSize: '1.1rem' }}>⚠️ EMERGENCY MARKET FREEZE ACTIVE</div>
            <div style={{ color: '#FECACA', fontSize: '0.85rem' }}>All 5 order desks and FX trading queues are locked by the Executive Controller.</div>
          </div>
          <a href="#/admin" style={{ padding: '8px 16px', background: '#EF4444', color: '#FFF', borderRadius: '4px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
            Manage in Admin Console →
          </a>
        </div>
      )}

      {/* Main KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>REGISTERED HOUSES</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38BDF8', margin: '4px 0' }}>{registeredCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Total delegations logged</div>
        </div>

        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>VERIFIED TEAMS</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981', margin: '4px 0' }}>{verifiedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Cleared by Admin desk</div>
        </div>

        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>READY / ACTIVE TEAMS</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B', margin: '4px 0' }}>{readyCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{activeTradingCount} live on floor</div>
        </div>

        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>ORDERS IN QUEUE</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: ordersInQueue > 0 ? '#F97316' : '#94A3B8', margin: '4px 0' }}>{ordersInQueue}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{ordersAwaitingVerification} unverified</div>
        </div>

        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>EXECUTED ORDERS</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981', margin: '4px 0' }}>{ordersExecutedTotal}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Total tickets matched</div>
        </div>

        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>FX QUEUE / SETTLED</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: activeFxCount > 0 ? '#EAB308' : '#94A3B8', margin: '4px 0' }}>
            {activeFxCount} <span style={{ fontSize: '1rem', color: '#64748B' }}>/ {settledFxCount}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Multi-currency requests</div>
        </div>
      </div>

      {/* Middle Operational Section: 5 Order Desks & Event Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* 5 Simultaneous Order Desks Status */}
        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
              Simultaneous Order Desks (5 Physical Desks)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Auto-refreshed: {new Date(lastRefresh).toLocaleTimeString()}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {[
              { id: 'DESK_1', name: 'Desk 1', operator: 'Sandesh', color: '#3B82F6' },
              { id: 'DESK_2', name: 'Desk 2', operator: 'Akshay', color: '#F59E0B' },
              { id: 'DESK_3', name: 'Desk 3', operator: 'Aarush', color: '#10B981' },
              { id: 'DESK_4', name: 'Desk 4', operator: 'Sridhara', color: '#8B5CF6' },
              { id: 'DESK_5', name: 'Desk 5', operator: 'Aksharaa', color: '#EC4899' }
            ].map(d => {
              const live = desksData.find(x => x.id === d.id);
              const inFlight = live?.activeQueueCount || allOrders.filter(o => o.deskId === d.id && ['VERIFYING', 'VALIDATED'].includes(o.status)).length;
              const totalDone = live?.totalProcessed || allOrders.filter(o => o.executedByDesk === d.id && o.status === 'EXECUTED').length;

              return (
                <div key={d.id} style={{ background: '#0B0F17', border: `1px solid ${d.color}40`, borderTop: `4px solid ${d.color}`, borderRadius: '6px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: d.color }}>{d.name.toUpperCase()}</div>
                  <div style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 600, margin: '2px 0 8px 0' }}>{d.operator}</div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>IN-FLIGHT</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: inFlight > 0 ? '#F59E0B' : '#94A3B8' }}>{inFlight}</div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Done: <strong style={{ color: '#10B981' }}>{totalDone}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Unassigned Floor Tickets: <strong style={{ color: ordersAwaitingVerification > 0 ? '#F59E0B' : '#10B981' }}>{ordersAwaitingVerification}</strong> awaiting desk claim
            </span>
            <a href="#/exchange" style={{ color: '#38BDF8', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
              Open Exchange Validation Desks →
            </a>
          </div>
        </div>

        {/* Next Scheduled Scenario Milestone */}
        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px 0', color: '#F8FAFC' }}>
            Event Timeline Radar
          </h3>
          
          <div style={{ background: '#0B0F17', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 800, letterSpacing: '0.05em' }}>NEXT UPCOMING SCENARIO</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', margin: '4px 0' }}>
              {nextScheduledEvent.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#F59E0B' }}>
              Scheduled at T+{nextScheduledEvent.minute} min (Elapsed: {Math.floor(marketClock.elapsedMinutes || 0)} min)
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>• Regulatory Circuit Breaker: <strong>±30% / 5 min</strong></div>
            <div>• Security Price Bands: <strong>±20%</strong></div>
            <div>• Maximum Position Limit: <strong>35% of Portfolio</strong></div>
            <div>• Short Selling: <strong style={{ color: state?.riskControls?.allowShortSelling ? '#10B981' : '#EF4444' }}>{state?.riskControls?.allowShortSelling ? 'ALLOWED' : 'PROHIBITED'}</strong></div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Active Queues (Orders & FX) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Active Inbound Orders Queue */}
        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#F8FAFC' }}>Active Order Queue ({ordersInQueue})</h4>
            <a href="#/exchange" style={{ fontSize: '0.75rem', color: '#38BDF8', textDecoration: 'none' }}>Process Tickets</a>
          </div>

          {allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              ✓ All order tickets have been cleared and executed. Queue empty.
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allOrders.filter(o => ['QUEUED', 'SUBMITTED', 'PENDING', 'VERIFYING', 'VALIDATED'].includes(o.status)).slice(0, 10).map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0F17', padding: '10px 14px', borderRadius: '6px', border: '1px solid #1E293B', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#FFF' }}>#{o.ticketNumber}</span> • <span style={{ color: '#F59E0B' }}>{o.teamCode}</span>
                    <div style={{ color: '#94A3B8' }}>{o.action} {o.quantity} {o.ticker} ({o.orderType})</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: o.status === 'VALIDATED' ? 'rgba(16,185,129,0.2)' : o.status === 'VERIFYING' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)', color: o.status === 'VALIDATED' ? '#10B981' : o.status === 'VERIFYING' ? '#38BDF8' : '#F59E0B' }}>
                      {o.status}
                    </span>
                    {o.deskId && <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>{o.deskId}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active FX Queue */}
        <div style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#F8FAFC' }}>Active FX Clearance Queue ({activeFxCount})</h4>
            <a href="#/fx" style={{ fontSize: '0.75rem', color: '#38BDF8', textDecoration: 'none' }}>Open Currency Desk</a>
          </div>

          {activeFxCount === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              ✓ All multi-currency conversion requests cleared. Queue empty.
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fxQueue.filter(f => ['QUEUED', 'RATE_CHECK', 'PROCESSING'].includes(f.status)).map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0F17', padding: '10px 14px', borderRadius: '6px', border: '1px solid #1E293B', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#FFF' }}>{f.teamCode}</span> • <span style={{ color: '#EAB308' }}>{f.fromAmount?.toLocaleString()} {f.fromCurrency} → {f.toAmount?.toLocaleString()} {f.toCurrency}</span>
                    <div style={{ color: '#94A3B8' }}>Rate: {f.quoteRate} (Spread: {f.spreadPercent}%)</div>
                  </div>
                  <div>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(234,179,8,0.2)', color: '#EAB308' }}>
                      {f.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
