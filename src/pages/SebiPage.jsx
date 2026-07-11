import React, { useState, useEffect } from 'react';
import SplitFlapText from '../components/SplitFlapText.jsx';

export default function SebiPage({ state, onOpenProfile, adminPassword }) {
  const [timeLeft, setTimeLeft] = useState('60:00');
  const [pendingFreezeId, setPendingFreezeId] = useState(null);

  // Clock countdown timer logic
  useEffect(() => {
    if (state.marketState.status !== 'Open' || !state.marketState.simulationStartTime) {
      const minutesStr = String(state.marketState.simulationDurationMinutes).padStart(2, '0');
      setTimeLeft(`${minutesStr}:00`);
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - state.marketState.simulationStartTime - (state.marketState.pauseTimeOffset || 0);
      const durationMs = state.marketState.simulationDurationMinutes * 60 * 1000;
      const remainingMs = Math.max(0, durationMs - elapsedMs);

      if (remainingMs === 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.marketState.status, state.marketState.simulationStartTime, state.marketState.simulationDurationMinutes, state.marketState.pauseTimeOffset]);

  // news composer states
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [noticeType, setNoticeType] = useState('Circular'); // Circular | Advisory | Show Cause Notice | Interim Order | Final Order | Press Release

  // Staged Bankruptcy Stepper states
  const [stageSecId, setStageSecId] = useState('');
  const [stageConfirmState, setStageConfirmState] = useState(false);
  const [investigatingSecIds, setInvestigatingSecIds] = useState({});

  // Market Controls
  const handleMarketControl = async (action) => {
    if (action === 'PAUSE' || action === 'CLOSE') {
      const confirmAction = window.confirm(`Are you sure you want to ${action.toLowerCase()} the simulation session?`);
      if (!confirmAction) return;
    }

    try {
      const res = await fetch('/api/market/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({ action, duration: 60 })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to trigger market command.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Staged Stepper Handlers
  const handleStage1OpenInvestigation = async (sec) => {
    setInvestigatingSecIds({ ...investigatingSecIds, [sec.id]: true });
    const refNum = `SEBI/FMS/2026/${state.newsEvents.length + 1001}`;
    const payload = {
      headline: `⚖️ SEBI Opens Formal Investigation into ${sec.name} (${sec.ticker})`,
      description: `Ref No: ${refNum}\n\nRegulatory desks initiate forensic audit citing accounting and reporting irregularities. Asset remains tradable pending findings.`,
      sentiment: 'Neutral',
      impactPercent: 0,
      category: 'Policy',
      affectedSector: null,
      affectedSecurityIds: [sec.id]
    };
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    alert(`Step 1 Complete: Formal Investigation Opened for ${sec.ticker}`);
  };

  const handleStage2SuspendTrading = async (sec) => {
    const payload = {
      securityId: sec.id,
      actionType: 'CircuitBreaker',
      details: 'SEBI suspended trading pending accounting investigation.'
    };
    await fetch('/api/corporate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    alert(`Step 2 Complete: Trading Frozen on ${sec.ticker}`);
  };

  const handleStage3Liquidate = async (sec) => {
    if (!stageConfirmState) {
      setStageConfirmState(true);
      return;
    }
    const payload = {
      securityId: sec.id,
      actionType: 'Bankruptcy',
      details: `SEBI declared bankruptcy and liquidation on ${sec.name}`
    };
    await fetch('/api/corporate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    setStageConfirmState(false);
    setStageSecId('');
    alert(`Step 3 Complete: ${sec.ticker} Bankrupt & Liquidated!`);
  };

  // Broadcast news trigger
  const handleBroadcastNews = async (e) => {
    e.preventDefault();
    if (!headline.trim()) {
      alert('Headline is required.');
      return;
    }

    const refNum = `SEBI/FMS/2026/${state.newsEvents.length + 1001}`;
    const fullHeadline = `⚖️ [SEBI ${noticeType}] ${headline}`;
    const fullDesc = `Ref No: ${refNum}\n\n${description}`;

    const payload = {
      headline: fullHeadline,
      description: fullDesc,
      sentiment: 'Neutral',
      impactPercent: 0,
      category: 'Policy',
      affectedSector: null,
      affectedSecurityIds: []
    };

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setHeadline('');
        setDescription('');
        alert('SEBI Announcement Broadcasted successfully!');
      }
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    }
  };

  // Freeze / Unfreeze toggle for manual circuit breaker overriding
  const handleFreezeToggle = async (security) => {
    const isHalted = security.status === 'Halted';
    try {
      await fetch('/api/corporate-action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          securityId: security.id,
          actionType: isHalted ? 'UNHALT' : 'CircuitBreaker',
          details: isHalted ? 'SEBI lifted trading halt' : 'SEBI suspended trading due to high volatility'
        })
      });
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  // News history feed
  const broadcastedNews = [...state.newsEvents]
    .filter(n => n.triggeredAt && n.headline.includes('SEBI'))
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  // Active Circuit Breakers: Moved +/- 30% in last 5 minutes
  const getCircuitBreakers = () => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return state.securities.filter(s => {
      const history = s.priceHistory || [];
      const recentPoints = history.filter(p => p.timestamp >= cutoff);
      if (recentPoints.length < 2) return false;
      const minPrice = Math.min(...recentPoints.map(p => p.price));
      const maxPrice = Math.max(...recentPoints.map(p => p.price));
      if (minPrice === 0) return false;
      const changePct = ((maxPrice - minPrice) / minPrice) * 100;
      return changePct >= 30;
    });
  };

  const activeCircuitBreakers = getCircuitBreakers();
  const refNum = `SEBI/FMS/2026/${state.newsEvents.length + 1001}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '12px' }}>
      
      {/* Column 1: Bulletin Composer & History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Panel 1: Broadcast bulletin news composer */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.5rem', marginBottom: '16px' }}>
            SEBI Regulatory Notice Composer
          </h3>
          
          <form onSubmit={handleBroadcastNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Notice Type</label>
                <select className="input-field" value={noticeType} onChange={e => setNoticeType(e.target.value)}>
                  <option value="Circular">Circular</option>
                  <option value="Advisory">Advisory</option>
                  <option value="Show Cause Notice">Show Cause Notice</option>
                  <option value="Interim Order">Interim Order</option>
                  <option value="Final Order">Final Order</option>
                  <option value="Press Release">Press Release</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number (Auto)</label>
                <input
                  type="text"
                  className="input-field font-data"
                  style={{ backgroundColor: 'var(--color-surface-2)', cursor: 'not-allowed' }}
                  disabled
                  value={refNum}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Announcement Headline</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="Enter regulatory notice headline..."
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Official Details & Context</label>
              <textarea
                className="input-field font-data"
                rows="4"
                placeholder="Provide official regulatory bulletin text..."
                style={{ resize: 'none' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}>
              ⚖️ Issue Official Notice
            </button>
          </form>
        </div>

        {/* Dispatch History List */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Historical Bulletin Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
            {broadcastedNews.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>No bulletins broadcasted yet this session.</div>
            ) : (
              broadcastedNews.map(n => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-brass)' }}>
                      {n.headline}
                    </span>
                    <span className="font-data" style={{ fontSize: '0.7rem', color: 'var(--color-ink-3)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{n.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Column 2: Clock Timeline Control & Freeze Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Panel 2: Timeline Controls */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Simulation Control Deck
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>SESSION CLOCK</span>
              <SplitFlapText text={timeLeft} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>EXCHANGE STATUS</span>
              <SplitFlapText text={state.marketState.status} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {state.marketState.status === 'NotStarted' ? (
              <button className="btn btn-primary" style={{ gridColumn: 'span 2' }} onClick={() => handleMarketControl('START')}>
                🚀 Start Session
              </button>
            ) : (
              <>
                {state.marketState.status === 'Open' ? (
                  <button className="btn btn-secondary" style={{ backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }} onClick={() => handleMarketControl('PAUSE')}>
                    ⏸ Pause Session
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleMarketControl('RESUME')}>
                    ▶ Resume Session
                  </button>
                )}
                <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)' }} onClick={() => handleMarketControl('CLOSE')}>
                  ⏹ Stop/Close Session
                </button>
              </>
            )}
          </div>
        </div>

        {/* Panel 3: Bankruptcy Stepper */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Staged Bankruptcy Stepper
          </h3>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Select Target Security</label>
            <select className="input-field" value={stageSecId} onChange={e => { setStageSecId(e.target.value); setStageConfirmState(false); }}>
              <option value="">Choose Asset...</option>
              {state.securities
                .filter(s => s.status !== 'Bankrupt' && s.status !== 'Delisted')
                .map(s => <option key={s.id} value={s.id}>{s.ticker} - {s.name}</option>)
              }
            </select>
          </div>

          {stageSecId && (
            (() => {
              const sec = state.securities.find(s => s.id === stageSecId);
              if (!sec) return null;
              const step1Done = investigatingSecIds[sec.id] || sec.status === 'Halted';
              const step2Done = sec.status === 'Halted';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={step1Done} onClick={() => handleStage1OpenInvestigation(sec)}>
                      Step 1: Open Investigation
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} disabled={!step1Done || step2Done} onClick={() => handleStage2SuspendTrading(sec)}>
                      Step 2: Suspend Trading
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button className="btn" style={{ backgroundColor: 'var(--color-fall)', color: 'var(--color-surface)', fontSize: '0.85rem' }} disabled={!step2Done} onClick={() => handleStage3Liquidate(sec)}>
                      {stageConfirmState ? '⚠️ CONFIRM LIQUIDATION' : 'Step 3: Liquidate Asset'}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Panel 4: Circuit Breaker Monitor */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Circuit Breaker Dashboard
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeCircuitBreakers.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--color-border)', borderRadius: '6px' }}>
                No circuit breakers active — market conditions normal.
              </div>
            ) : (
              activeCircuitBreakers.map(s => (
                <div
                  key={s.id}
                  className="glass"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--color-fall)'
                  }}
                >
                  <div>
                    <strong className="font-data" style={{ color: 'var(--color-fall)' }}>{s.ticker}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block' }}>{s.name}</span>
                  </div>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: s.status === 'Halted' ? 'var(--color-rise)' : 'var(--color-fall)',
                      color: 'var(--color-surface)'
                    }}
                    onClick={() => handleFreezeToggle(s)}
                  >
                    {s.status === 'Halted' ? 'UNFREEZE' : 'FREEZE'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
