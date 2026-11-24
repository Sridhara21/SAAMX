import React, { useState, useMemo } from 'react';

export default function PortfolioPage({ state, onOpenProfile }) {
  const [teamQuery, setTeamQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [txFilter, setTxFilter] = useState('ALL'); // ALL, BUY, SELL
  const [txSort, setTxSort] = useState('LATEST'); // LATEST, OLDEST, VALUE_DESC

  const teamsList = useMemo(() => {
    if (!state?.teams) return [];
    return Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
  }, [state?.teams]);

  const securitiesList = useMemo(() => {
    if (!state?.securities) return [];
    return Array.isArray(state.securities) ? state.securities : Object.values(state.securities);
  }, [state?.securities]);

  const matchedTeams = teamQuery.trim() !== '' && !selectedTeam ? teamsList
    .filter(t => t && t.isActive)
    .filter(t => 
      (t.teamCode && t.teamCode.toLowerCase().startsWith(teamQuery.toLowerCase())) ||
      (t.teamName && t.teamName.toLowerCase().includes(teamQuery.toLowerCase()))
    ).slice(0, 6) : [];

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setTeamQuery(`${team.teamCode} - ${team.teamName}`);
  };

  const getStartingCapital = () => {
    return state?.settings?.startingCapitalRetail || 10000000; // ₹1,00,00,000 (₹1 Crore)
  };

  const currentTeam = selectedTeam ? teamsList.find(t => t && t.id === selectedTeam.id && t.isActive) : null;

  const getTeamStats = () => {
    if (!currentTeam) return null;

    const startCapital = getStartingCapital(currentTeam.teamType);
    let portfolioValue = currentTeam.cashBalance || 0;
    let totalHeldValue = 0;
    const sectorsCount = new Set(securitiesList.map(s => s.sector).filter(Boolean)).size || 1;
    const heldSectors = new Set();
    const holdingsList = [];

    Object.entries(currentTeam.holdings || {}).forEach(([secId, qty]) => {
      const sec = securitiesList.find(s => s && (s.id === secId || s.ticker === secId));
      if (sec && qty > 0) {
        const curPrice = sec.currentPrice || sec.basePrice || sec.ltp || 0;
        const value = qty * curPrice;
        portfolioValue += value;
        totalHeldValue += value;
        if (sec.sector) heldSectors.add(sec.sector);

        holdingsList.push({
          ...sec,
          quantity: qty,
          value,
        });
      }
    });

    const roi = ((portfolioValue - startCapital) / startCapital) * 100;
    const divScore = parseFloat(((heldSectors.size / sectorsCount) * 10).toFixed(1));

    return {
      portfolioValue,
      roi,
      divScore,
      holdingsList,
      totalHeldValue
    };
  };

  const stats = getTeamStats();

  // Get filtered and sorted transactions
  const getProcessedTransactions = () => {
    if (!currentTeam) return [];
    let txs = state.transactions.filter(t => t.teamId === currentTeam.id);

    if (txFilter !== 'ALL') {
      txs = txs.filter(t => t.action === txFilter);
    }

    if (txSort === 'LATEST') {
      txs.sort((a, b) => b.timestamp - a.timestamp);
    } else if (txSort === 'OLDEST') {
      txs.sort((a, b) => a.timestamp - b.timestamp);
    } else if (txSort === 'VALUE_DESC') {
      txs.sort((a, b) => b.totalValue - a.totalValue);
    }

    return txs;
  };

  const processedTxs = getProcessedTransactions();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px' }}>
      
      {/* Search Header Selector */}
      <div className="glass card" style={{ position: 'relative' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-ink)', marginBottom: '8px' }}>
          Team Portfolio Workspace
        </h2>
        <p style={{ color: 'var(--color-ink-2)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Staff inspection ledger module. Enter team details below.
        </p>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Type team code or name (e.g. T01)"
            value={teamQuery}
            onChange={e => {
              setTeamQuery(e.target.value);
              if (selectedTeam) setSelectedTeam(null);
            }}
            autoComplete="off"
          />
          {matchedTeams.length > 0 && (
            <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-l2)' }}>
              {matchedTeams.map(t => (
                <div
                  key={t.id}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => handleTeamSelect(t)}
                >
                  <span style={{ fontWeight: 700 }}>{t.teamCode} &mdash; {t.teamName}</span>
                  <span className="badge badge-public">{t.teamType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {currentTeam && stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Key Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <div className="glass card">
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 600, display: 'block' }}>PORTFOLIO NET VALUE</span>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: '4px', color: 'var(--color-ink)' }}>
                ₹{stats.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="glass card">
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 600, display: 'block' }}>NET PERFORMANCE (ROI)</span>
              <h2 className={`font-data ${stats.roi >= 0 ? 'text-up' : 'text-down'}`} style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '4px' }}>
                {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
              </h2>
            </div>
            <div className="glass card">
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 600, display: 'block' }}>CASH RESERVES LIQUID</span>
              <h2 className="font-data" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-brass)' }}>
                ₹{currentTeam.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="glass card">
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 600, display: 'block' }}>DIVERSIFICATION SCORE</span>
              <h2 className="font-data" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-ink)' }}>
                {stats.divScore} <span style={{ fontSize: '1rem', color: 'var(--color-ink-2)' }}>/ 10</span>
              </h2>
            </div>
          </div>

          {/* Holdings Inventory */}
          <div className="glass card">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
              Active Securities Positions
            </h3>
            {stats.holdingsList.length === 0 ? (
              <p style={{ color: 'var(--color-ink-3)', fontSize: '0.95rem' }}>
                No active assets held in portfolio.
              </p>
            ) : (
              <table className="fms-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Market Price</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.holdingsList.map(h => {
                    const allocation = stats.portfolioValue > 0 ? ((h.value / stats.portfolioValue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={h.id} style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(h.id)}>
                        <td>
                          <strong className="font-data" style={{ color: 'var(--color-brass)' }}>{h.ticker}</strong>
                          <span style={{ color: 'var(--color-ink-2)', fontSize: '0.85rem', marginLeft: '6px' }}>{h.name}</span>
                        </td>
                        <td><span className="badge badge-public">{h.sector}</span></td>
                        <td className="font-data" style={{ textAlign: 'right' }}>{h.quantity}</td>
                        <td className="font-data" style={{ textAlign: 'right' }}>₹{h.currentPrice}</td>
                        <td className="font-data" style={{ textAlign: 'right', fontWeight: 700 }}>₹{h.value.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <span className="font-data" style={{ width: '40px' }}>{allocation}%</span>
                            <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${allocation}%`, backgroundColor: 'var(--color-brass)' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Audit Ledger */}
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
                Desk Transaction Audits
              </h3>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <select className="input-field" style={{ width: '120px', padding: '6px 12px' }} value={txFilter} onChange={e => setTxFilter(e.target.value)}>
                  <option value="ALL">All Actions</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
                
                <select className="input-field" style={{ width: '150px', padding: '6px 12px' }} value={txSort} onChange={e => setTxSort(e.target.value)}>
                  <option value="LATEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="VALUE_DESC">Highest Value</option>
                </select>
              </div>
            </div>

            {processedTxs.length === 0 ? (
              <p style={{ color: 'var(--color-ink-3)', fontSize: '0.9rem' }}>No matching transaction logs found.</p>
            ) : (
              <table className="fms-table">
                <thead>
                  <tr>
                    <th>TXID</th>
                    <th>Time</th>
                    <th>Asset</th>
                    <th>Action</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedTxs.map(tx => (
                    <tr key={tx.id} style={{ opacity: tx.voided ? 0.45 : 1 }}>
                      <td className="font-data" style={{ fontWeight: 700 }}>{tx.id}</td>
                      <td className="font-data" style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="font-data">{tx.ticker}</td>
                      <td className={tx.action === 'BUY' ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>{tx.action}</td>
                      <td className="font-data" style={{ textAlign: 'right' }}>{tx.quantity}</td>
                      <td className="font-data" style={{ textAlign: 'right' }}>₹{tx.priceAtExecution}</td>
                      <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>₹{tx.totalValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        {tx.voided ? (
                          <span className="badge badge-protected" style={{ fontSize: '0.65rem' }}>VOIDED</span>
                        ) : (
                          <span className="badge badge-public" style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)' }}>PROCESSED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      ) : (
        <div className="glass card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-ink-3)' }}>
          Please search and select a Team Code in the autocomplete selector above to review its holding ledger.
        </div>
      )}

    </div>
  );
}
