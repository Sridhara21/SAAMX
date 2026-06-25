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
  const [sentiment, setSentiment] = useState('Neutral'); // Positive, Negative, Neutral
  const [impactPercent, setImpactPercent] = useState('0');
  const [targetScope, setTargetScope] = useState('Whole Sector'); // 'Whole Sector' or 'Specific Asset'
  const [targetSector, setTargetSector] = useState('');
  const [targetSecurityId, setTargetSecurityId] = useState('');

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

  // Broadcast news trigger
  const handleBroadcastNews = async (e) => {
    e.preventDefault();
    if (!headline.trim()) {
      alert('Headline is required.');
      return;
    }

    const payload = {
      headline,
      description,
      sentiment,
      impactPercent: Number(impactPercent) || 0,
      category: 'Policy',
      affectedSector: targetScope === 'Whole Sector' && targetSector ? targetSector : null,
      affectedSecurityIds: targetScope === 'Specific Asset' && targetSecurityId ? [targetSecurityId] : []
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
        setImpactPercent('0');
        setTargetSecurityId('');
        alert('SEBI Announcement Broadcasted successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch bulletin.');
      }
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    }
  };

  // Freeze / Unfreeze
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
          actionType: isHalted ? 'UNHALT' : 'HALT',
          details: isHalted ? 'SEBI lifted trading halt' : 'SEBI suspended trading due to high volatility'
        })
      });
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  // Get distinct sectors
  const sectors = [...new Set(state.securities.map(s => s.sector))];

  // News history feed
  const broadcastedNews = [...state.newsEvents]
    .filter(n => n.triggeredAt)
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  const activeSecurities = state.securities.filter(s => s.status !== 'Halted' && s.status !== 'Delisted');
  const frozenSecurities = state.securities.filter(s => s.status === 'Halted');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '12px' }}>
      
      {/* Column 1: Bulletin Composer & History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Panel 1: Broadcast bulletin news composer */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.5rem', marginBottom: '16px' }}>
            SEBI Regulatory News Dispatcher
          </h3>
          
          <form onSubmit={handleBroadcastNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Announcement Headline</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="e.g. SEBI Mandates Higher Leverage Limits"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Official Details & Context</label>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Enter regulatory bulletin context..."
                style={{ resize: 'none' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Sentiment Impact</label>
                <select className="input-field" value={sentiment} onChange={e => setSentiment(e.target.value)}>
                  <option value="Neutral">Neutral</option>
                  <option value="Positive">Positive (Market Rise)</option>
                  <option value="Negative">Negative (Market Fall)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Impact Factor (%)</label>
                <input
                  type="number"
                  className="input-field font-data"
                  value={impactPercent}
                  onChange={e => setImpactPercent(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Target Asset Scope</label>
                <select className="input-field" value={targetScope} onChange={e => setTargetScope(e.target.value)}>
                  <option value="Whole Sector">Whole Sector</option>
                  <option value="Specific Asset">Specific Asset</option>
                </select>
              </div>
              
              {targetScope === 'Whole Sector' ? (
                <div className="form-group">
                  <label>Affected Sector</label>
                  <select className="input-field" value={targetSector} onChange={e => setTargetSector(e.target.value)}>
                    <option value="">Select Sector (Optional)</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Affected Security</label>
                  <select className="input-field" value={targetSecurityId} onChange={e => setTargetSecurityId(e.target.value)}>
                    <option value="">Select Asset...</option>
                    {state.securities.map(s => <option key={s.id} value={s.id}>{s.ticker} - {s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Broadcast Bulletin
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
                <div key={n.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justify: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: n.sentiment === 'Positive' ? 'var(--color-rise)' : n.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-brass)' }}>
                      {n.headline}
                    </span>
                    <span className="font-data" style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', marginTop: '4px' }}>{n.description}</p>
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

        {/* Panel 3: Freeze / Volatility Freeze controller */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Circuit Breaker Dashboard
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Section 1: Active Securities */}
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                Active Securities
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeSecurities.length === 0 ? (
                  <div style={{ color: 'var(--color-ink-3)', fontSize: '0.8rem', padding: '4px' }}>No active securities.</div>
                ) : (
                  activeSecurities.map(s => {
                    const isPending = pendingFreezeId === s.id;
                    return (
                      <div
                        key={s.id}
                        className="glass"
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ minWidth: '90px' }}>
                          <strong className="font-data">{s.ticker}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', marginLeft: '6px', display: 'block' }}>
                            {s.name}
                          </span>
                        </div>
                        
                        {isPending ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-fall)', fontWeight: 600 }}>Freeze {s.ticker}?</span>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-fall)' }}
                              onClick={() => {
                                handleFreezeToggle(s);
                                setPendingFreezeId(null);
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={() => setPendingFreezeId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn"
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              backgroundColor: 'var(--color-fall)',
                              color: 'var(--color-surface)'
                            }}
                            onClick={() => setPendingFreezeId(s.id)}
                          >
                            FREEZE
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Section 2: Currently Frozen */}
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-fall)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                Currently Frozen
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {frozenSecurities.length === 0 ? (
                  <div style={{ color: 'var(--color-ink-3)', fontSize: '0.8rem', padding: '4px' }}>No currently frozen securities.</div>
                ) : (
                  frozenSecurities.map(s => (
                    <div
                      key={s.id}
                      className="glass"
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--color-fall-light)',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      <div>
                        <strong className="font-data" style={{ color: 'var(--color-fall)' }}>{s.ticker}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', marginLeft: '6px', display: 'block' }}>
                          {s.name}
                        </span>
                      </div>
                      
                      <button
                        className="btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-rise)',
                          color: 'var(--color-surface)'
                        }}
                        onClick={() => handleFreezeToggle(s)}
                      >
                        UNFREEZE
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
