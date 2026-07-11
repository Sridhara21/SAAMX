import React, { useState, useEffect, useRef } from 'react';

export default function ExchangePage({ state, onOpenProfile, adminPassword }) {
  const [teamQuery, setTeamQuery] = useState('');
  const [secQuery, setSecQuery] = useState('');
  const [action, setAction] = useState('BUY'); // BUY or SELL
  const [quantity, setQuantity] = useState('');
  const [staffName, setStaffName] = useState('Staff Desk 1');

  // Selected entities
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSec, setSelectedSec] = useState(null);

  // Status & Feedback alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [flashColor, setFlashColor] = useState(null); // 'var(--color-rise)' or 'var(--color-fall)'
  const [toasts, setToasts] = useState([]);

  // Focus references for speed entry
  const teamInputRef = useRef(null);
  const secInputRef = useRef(null);
  const qtyInputRef = useRef(null);

  // Filter queries matching on prefix or name substring (case-insensitive)
  const matchedTeams = teamQuery.trim() !== '' && !selectedTeam ? state.teams.filter(t => 
    t.teamCode.toLowerCase().startsWith(teamQuery.toLowerCase()) ||
    t.teamName.toLowerCase().includes(teamQuery.toLowerCase())
  ).slice(0, 6) : [];

  const matchedSecurities = secQuery.trim() !== '' && !selectedSec ? state.securities.filter(s => 
    s.status !== 'Delisted' && (
      s.ticker.toLowerCase().startsWith(secQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(secQuery.toLowerCase())
    )
  ).slice(0, 6) : [];

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setTeamQuery(`${team.teamCode} - ${team.teamName}`);
    setErrorMsg('');
    setTimeout(() => secInputRef.current?.focus(), 50);
  };

  const handleSecSelect = (sec) => {
    setSelectedSec(sec);
    setSecQuery(`${sec.ticker} - ${sec.name}`);
    setErrorMsg('');
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // Add toast notification helper
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleTradeSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!selectedTeam) {
      setErrorMsg('Please select a valid Team.');
      return;
    }
    if (!selectedSec) {
      setErrorMsg('Please select a valid Security.');
      return;
    }
    
    // Live security check
    const currentSec = state.securities.find(s => s.id === selectedSec.id);
    if (!currentSec) {
      setErrorMsg('Security not found.');
      return;
    }

    if (currentSec.status !== 'Active') {
      setErrorMsg(`${currentSec.ticker} is currently ${currentSec.status} — trading suspended`);
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      return;
    }

    const qty = Number(quantity);
    const cost = qty * currentSec.currentPrice;

    // Client-side validations
    if (action === 'BUY') {
      if (qty > currentSec.availableUnits) {
        setErrorMsg(`Only ${currentSec.availableUnits} units available — you entered ${qty}`);
        return;
      }
      if (cost > selectedTeam.cashBalance) {
        setErrorMsg(`${selectedTeam.teamCode} has ₹${selectedTeam.cashBalance.toLocaleString()} — this order costs ₹${cost.toLocaleString()}`);
        return;
      }
    } else {
      const currentHolding = selectedTeam.holdings[currentSec.id] || 0;
      if (currentHolding <= 0) {
        setErrorMsg(`${selectedTeam.teamCode} holds 0 units of ${currentSec.ticker} — cannot sell`);
        return;
      }
      if (qty > currentHolding) {
        setErrorMsg(`Only ${currentHolding} units held by team — cannot sell ${qty}`);
        return;
      }
    }

    const tradeBody = {
      teamId: selectedTeam.teamCode,
      securityId: selectedSec.ticker,
      action,
      quantity: qty,
      enteredBy: staffName
    };

    // Trigger visual flash immediately
    setFlashColor(action === 'BUY' ? 'var(--color-rise-light)' : 'var(--color-fall-light)');
    setTimeout(() => setFlashColor(null), 850);

    // Optimistically announce the execution toast
    const optimisticMessage = `✓ [Optimistic] ${selectedTeam.teamCode} ${action === 'BUY' ? 'buying' : 'selling'} ${qty} ${currentSec.ticker} @ ₹${currentSec.currentPrice.toLocaleString('en-IN')}`;
    addToast(optimisticMessage);

    // Reset inputs immediately so operator is unblocked
    setTeamQuery('');
    setSecQuery('');
    setQuantity('');
    setSelectedTeam(null);
    setSelectedSec(null);
    setTimeout(() => teamInputRef.current?.focus(), 50);

    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(tradeBody)
      });

      if (res.ok) {
        const data = await res.json();
        addToast(`✓ Confirmed: ${tradeBody.teamId} ${action === 'BUY' ? 'bought' : 'sold'} ${qty} ${tradeBody.securityId} @ ₹${data.executionPrice.toLocaleString('en-IN')}`);
      } else {
        const data = await res.json();
        addToast(`❌ Failed: ${tradeBody.teamId} order for ${qty} ${tradeBody.securityId} rejected: ${data.error}`);
      }
    } catch (err) {
      addToast(`❌ Network error executing ${tradeBody.teamId} trade on ${tradeBody.securityId}.`);
    }
  };

  const getTeamHolding = (team, sec) => {
    if (!team || !sec) return 0;
    const liveTeam = state.teams.find(t => t.id === team.id);
    return liveTeam?.holdings[sec.id] || 0;
  };

  const getLiveSecDetails = (sec) => {
    if (!sec) return null;
    return state.securities.find(s => s.id === sec.id);
  };

  const liveSec = getLiveSecDetails(selectedSec);
  const liveTeamDetails = selectedTeam ? state.teams.find(t => t.id === selectedTeam.id) : null;

  // Handle enter keyboard shortcut when quantity focused
  const handleQtyKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTradeSubmit();
    }
  };

  // Recent 8 trades newest first
  const recentTrades = [...state.transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return (
    <div style={{ height: 'calc(100vh - 100px)', overflow: 'hidden', padding: '12px' }}>
      
      {/* Fullscreen Peripheral Flash Overlay */}
      {flashColor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          pointerEvents: 'none',
          border: `16px solid ${flashColor}`,
          animation: 'peripheral-flash 0.8s ease-out forwards'
        }} />
      )}

      {/* Styles for peripheral flash */}
      <style>{`
        @keyframes peripheral-flash {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Dual Column Execution Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', height: '100%' }}>
        
        {/* Left Column: Trade Form */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.6rem' }}>
              Exchange Execution Terminal
            </h3>
            <input
              type="text"
              className="input-field"
              style={{ width: '150px', margin: 0, padding: '6px 12px', fontSize: '0.85rem' }}
              placeholder="Staff Desk Name"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
            />
          </div>

          {state.marketState.status !== 'Open' && (
            <div style={{ padding: '12px', background: 'var(--color-fall-light)', borderRadius: '8px', color: 'var(--color-fall)', marginBottom: '16px', fontWeight: 700, textAlign: 'center' }}>
              ⚠️ EXCHANGE HALTED: Market session is currently {state.marketState.status}.
            </div>
          )}

          <form onSubmit={handleTradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Team Selector */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Team Selector (Type Code or Name)</label>
              <input
                type="text"
                ref={teamInputRef}
                className="input-field"
                placeholder="Type code or team name (e.g. T01)"
                value={teamQuery}
                onChange={e => {
                  setTeamQuery(e.target.value);
                  if (selectedTeam) setSelectedTeam(null);
                }}
                autoComplete="off"
                autoFocus
              />
              {matchedTeams.length > 0 && (
                <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-l2)' }}>
                  {matchedTeams.map(t => (
                    <div
                      key={t.id}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => handleTeamSelect(t)}
                    >
                      <span>
                        <strong className="font-data" style={{ color: 'var(--color-brass)' }}>{t.teamCode}</strong> &mdash; {t.teamName}
                      </span>
                      <span className="badge badge-public" style={{ fontSize: '0.65rem' }}>
                        ₹{t.cashBalance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Selector */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Security Selector (Type Ticker or Name)</label>
              <input
                type="text"
                ref={secInputRef}
                className="input-field"
                placeholder="Type ticker prefix or name substring"
                value={secQuery}
                disabled={!selectedTeam}
                onChange={e => {
                  setSecQuery(e.target.value);
                  if (selectedSec) setSelectedSec(null);
                }}
                autoComplete="off"
              />
              {matchedSecurities.length > 0 && (
                <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-l2)' }}>
                  {matchedSecurities.map(s => (
                    <div
                      key={s.id}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => handleSecSelect(s)}
                    >
                      <div>
                        <strong className="font-data">{s.ticker}</strong> &mdash; {s.name}
                      </div>
                      <span className="font-data" style={{ fontWeight: 700 }}>
                        ₹{s.currentPrice} ({s.availableUnits} left)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High Contrast Selected Quote Panel */}
            {selectedTeam && selectedSec && liveSec && liveTeamDetails && (
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-surface-2)',
                borderLeft: '4px solid var(--color-brass)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    {liveSec.name} ({liveSec.ticker})
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1.5rem', marginTop: '4px' }} className="font-data text-brass">
                    ₹{liveSec.currentPrice.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                    Available Units: <strong>{liveSec.availableUnits}</strong>
                  </span>
                </div>
                <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    {liveTeamDetails.teamCode} Balances
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1.5rem', marginTop: '4px' }} className="font-data">
                    ₹{liveTeamDetails.cashBalance.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                    Positions Held: <strong>{getTeamHolding(liveTeamDetails, liveSec)}</strong> Units
                  </span>
                </div>
              </div>
            )}

            {/* Transaction Action Toggles */}
            <div className="form-group">
              <label>Transaction Action</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: action === 'BUY' ? 'var(--color-rise)' : 'var(--color-surface-2)',
                    color: action === 'BUY' ? 'var(--color-surface)' : 'var(--color-ink-2)',
                    opacity: action === 'BUY' ? 1 : 0.45,
                    border: action === 'BUY' ? 'none' : '1px solid var(--color-border)'
                  }}
                  onClick={() => setAction('BUY')}
                >
                  BUY (Add Position)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: action === 'SELL' ? 'var(--color-fall)' : 'var(--color-surface-2)',
                    color: action === 'SELL' ? 'var(--color-surface)' : 'var(--color-ink-2)',
                    opacity: action === 'SELL' ? 1 : 0.45,
                    border: action === 'SELL' ? 'none' : '1px solid var(--color-border)'
                  }}
                  onClick={() => setAction('SELL')}
                >
                  SELL (Liquidate Position)
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label>Trade Quantity</label>
              <input
                type="number"
                ref={qtyInputRef}
                className="input-field font-data"
                placeholder="Enter unit counts to trade"
                value={quantity}
                disabled={!selectedSec}
                onChange={e => {
                  setQuantity(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={handleQtyKeyDown}
              />
            </div>

            {/* Estimated Value Quote summary */}
            {selectedSec && liveSec && quantity && Number(quantity) > 0 && liveTeamDetails && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-ink-2)', fontWeight: 500 }}>Estimated Value Cost</span>
                <span className="font-data" style={{ fontWeight: 800, fontSize: '1.3rem', color: action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                  ₹{(Number(quantity) * liveSec.currentPrice).toLocaleString()}
                </span>
              </div>
            )}

            {/* Submission Alerts */}
            {errorMsg && (
              <div style={{ color: 'var(--color-fall)', fontWeight: 700, fontSize: '0.95rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', background: action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)', color: 'var(--color-surface)' }}
              disabled={state.marketState.status !== 'Open'}
            >
              Execute Order
            </button>
          </form>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Live Transaction Stream
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTrades.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', textAlign: 'center', marginTop: '40px', fontSize: '0.9rem' }}>
                No trades executed yet &mdash; market is opening.
              </div>
            ) : (
              recentTrades.map((tx) => (
                <div
                  key={tx.id}
                  className="glass"
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid ${tx.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)'}`,
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-l1)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-public" style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink)' }}>
                        {tx.teamCode}
                      </span>
                      <span className={tx.action === 'BUY' ? 'text-up' : 'text-down'} style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {tx.action}
                      </span>
                      <strong className="font-data" style={{ fontSize: '0.9rem' }}>{tx.ticker}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', marginTop: '2px' }}>
                      {tx.quantity} units @ ₹{tx.priceAtExecution} &bull; {tx.enteredBy}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="font-data" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      ₹{tx.totalValue.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-3)', display: 'block' }}>
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Render local toast alerts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderLeftColor: t.type === 'error' ? 'var(--color-fall)' : 'var(--color-rise)' }}>
            {t.message}
          </div>
        ))}
      </div>

    </div>
  );
}
