import React, { useState } from 'react';

export default function ResultsPage({ state }) {
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Table controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortCol, setSortCol] = useState('roi');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Starting Capital helper by team type
  const getStartingCapital = (teamType) => {
    switch (teamType) {
      case 'HedgeFund': return state.settings.startingCapitalHedgeFund;
      case 'MutualFund': return state.settings.startingCapitalMutualFund;
      default: return state.settings.startingCapitalRetail;
    }
  };

  // Compile team performance details
  const processedTeams = state.teams.map(team => {
    const startCapital = getStartingCapital(team.teamType);
    let portfolioValue = team.cashBalance;
    let riskPoints = 0;
    let totalHeldValue = 0;
    const sectorsCount = new Set(state.securities.map(s => s.sector)).size || 1;
    const heldSectors = new Set();

    Object.entries(team.holdings).forEach(([secId, qty]) => {
      const sec = state.securities.find(s => s.id === secId);
      if (sec && qty > 0) {
        const value = qty * sec.currentPrice;
        portfolioValue += value;
        totalHeldValue += value;
        heldSectors.add(sec.sector);

        const rWeight = sec.riskRating === 'High' ? 3 : sec.riskRating === 'Medium' ? 2 : 1;
        riskPoints += rWeight * value;
      }
    });

    const roi = ((portfolioValue - startCapital) / startCapital) * 100;
    const divScore = parseFloat(((heldSectors.size / sectorsCount) * 10).toFixed(1));
    const riskScore = totalHeldValue > 0 ? parseFloat((riskPoints / totalHeldValue).toFixed(1)) : 1.0;
    const cashUtilization = (((startCapital - team.cashBalance) / startCapital) * 100);

    const txCount = state.transactions.filter(t => t.teamId === team.id && !t.voided).length;

    return {
      ...team,
      portfolioValue,
      roi,
      divScore,
      riskScore,
      cashUtilization: Math.max(0, Math.min(100, cashUtilization)),
      txCount
    };
  });

  const sortedByROI = [...processedTeams].sort((a, b) => b.roi - a.roi);

  // Award calculations
  const highestROI = sortedByROI[0];
  const bestDiv = [...processedTeams].sort((a, b) => b.divScore - a.divScore)[0];
  const lowestRisk = [...processedTeams].filter(t => Object.keys(t.holdings).length > 0).sort((a, b) => a.riskScore - b.riskScore)[0];
  const mostActive = [...processedTeams].sort((a, b) => b.txCount - a.txCount)[0];

  // Specific selected team analysis details
  const currentTeam = processedTeams.find(t => t.id === selectedTeamId);
  const teamTxs = currentTeam ? state.transactions.filter(t => t.teamId === currentTeam.id) : [];

  // Best/Worst Trade decisions
  const getTradeDecisions = () => {
    if (!currentTeam) return { best: null, worst: null };
    const validTxs = teamTxs.filter(t => !t.voided);
    if (validTxs.length === 0) return { best: null, worst: null };

    const evaluated = validTxs.map(t => {
      const sec = state.securities.find(s => s.id === t.securityId);
      if (!sec) return { ...t, pctGain: 0 };

      const currentPrice = sec.currentPrice;
      const pctGain = t.action === 'BUY' ? 
        ((currentPrice - t.priceAtExecution) / t.priceAtExecution) * 100 :
        ((t.priceAtExecution - currentPrice) / t.priceAtExecution) * 100;

      return { ...t, pctGain };
    });

    const sortedDec = [...evaluated].sort((a, b) => b.pctGain - a.pctGain);
    return {
      best: sortedDec[0],
      worst: sortedDec[sortedDec.length - 1]
    };
  };

  const { best: bestDec, worst: worstDec } = getTradeDecisions();

  // CSV Export utility
  const downloadLeaderboardCSV = () => {
    const headers = ['Rank', 'Team Code', 'Team Name', 'Type', 'Starting Capital', 'Ending Portfolio Value', 'ROI %', 'Diversification', 'Risk Profile'];
    const data = sortedByROI.map((team, idx) => [
      idx + 1,
      team.teamCode,
      team.teamName,
      team.teamType,
      getStartingCapital(team.teamType),
      team.portfolioValue,
      team.roi,
      team.divScore,
      team.riskScore
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "final-leaderboard.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort calculations for display table
  const filteredTeams = processedTeams
    .filter(t => {
      const matchSearch = t.teamCode.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterType === '' || t.teamType === filterType;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'startingCapital') {
        valA = getStartingCapital(a.teamType);
        valB = getStartingCapital(b.teamType);
      }

      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage) || 1;
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px' }}>
      
      {/* Simulation Result Header */}
      <div className="glass card" style={{ textAlign: 'center', borderTop: '6px solid var(--color-brass)' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          Simulation Event Closing & Awards
        </h2>
        <p style={{ color: 'var(--color-ink-2)', marginTop: '4px' }}>
          Final portfolios locked &bull; Leaderboard verified snapshots
        </p>
      </div>

      {/* Awards section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
        
        <div className="glass card" style={{ borderLeft: '4px solid var(--color-brass)', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
          <div>
            <span style={{ fontSize: '2rem' }}>🏆</span>
            <h4 style={{ color: 'var(--color-brass)', margin: '8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Return (ROI)</h4>
            {highestROI ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{highestROI.teamName}</h3>
                <span className="font-data text-up" style={{ fontSize: '1.2rem', fontWeight: 700 }}>+{highestROI.roi.toFixed(1)}% ROI</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-ink-3)' }}>No data</span>
            )}
          </div>
        </div>

        <div className="glass card" style={{ borderLeft: '4px solid var(--color-rise)', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
          <div>
            <span style={{ fontSize: '2rem' }}>🌿</span>
            <h4 style={{ color: 'var(--color-rise)', margin: '8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Diversification</h4>
            {bestDiv ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{bestDiv.teamName}</h3>
                <span className="font-data text-up" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Score: {bestDiv.divScore} / 10</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-ink-3)' }}>No data</span>
            )}
          </div>
        </div>

        <div className="glass card" style={{ borderLeft: '4px solid var(--color-fall)', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
          <div>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <h4 style={{ color: 'var(--color-fall)', margin: '8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lowest Risk Exposure</h4>
            {lowestRisk ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{lowestRisk.teamName}</h3>
                <span className="font-data text-down" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Risk Index: {lowestRisk.riskScore}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-ink-3)' }}>No data</span>
            )}
          </div>
        </div>

        <div className="glass card" style={{ borderLeft: '4px solid var(--color-brass)', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
          <div>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h4 style={{ color: 'var(--color-brass)', margin: '8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Active Trader</h4>
            {mostActive ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{mostActive.teamName}</h3>
                <span className="font-data" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-ink)' }}>{mostActive.txCount} Orders</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-ink-3)' }}>No data</span>
            )}
          </div>
        </div>

      </div>

      {/* Leaderboard Table */}
      <div className="glass card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Final Leaderboard Standings</h3>
          <button className="btn btn-secondary" onClick={downloadLeaderboardCSV}>Export CSV</button>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by team code or name..." 
            value={searchQuery} 
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
          />
          <select 
            className="input-field" 
            style={{ width: '200px' }} 
            value={filterType} 
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Types</option>
            <option value="Retail">Retail</option>
            <option value="MutualFund">Mutual Fund</option>
            <option value="HedgeFund">Hedge Fund</option>
          </select>
        </div>

        <table className="fms-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('portfolioValue')} style={{ cursor: 'pointer' }}>Rank</th>
              <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>Team</th>
              <th onClick={() => handleSort('teamType')} style={{ cursor: 'pointer' }}>Fund Type</th>
              <th onClick={() => handleSort('startingCapital')} style={{ cursor: 'pointer', textAlign: 'right' }}>Starting Capital</th>
              <th onClick={() => handleSort('portfolioValue')} style={{ cursor: 'pointer', textAlign: 'right' }}>Ending Capital Net</th>
              <th onClick={() => handleSort('roi')} style={{ cursor: 'pointer', textAlign: 'right' }}>ROI %</th>
              <th onClick={() => handleSort('divScore')} style={{ cursor: 'pointer', textAlign: 'right' }}>Diversification</th>
              <th onClick={() => handleSort('riskScore')} style={{ cursor: 'pointer', textAlign: 'right' }}>Risk Profile</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTeams.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--color-ink-3)' }}>No matching teams found.</td>
              </tr>
            ) : paginatedTeams.map((team) => {
              const globalRank = sortedByROI.findIndex(t => t.id === team.id) + 1;
              return (
                <tr key={team.id}>
                  <td className="font-data" style={{ fontWeight: 700 }}>{globalRank}</td>
                  <td>
                    <strong>{team.teamName}</strong> <span style={{ color: 'var(--color-ink-2)' }}>({team.teamCode})</span>
                  </td>
                  <td><span className="badge badge-public">{team.teamType}</span></td>
                  <td className="font-data" style={{ textAlign: 'right' }}>₹{getStartingCapital(team.teamType).toLocaleString()}</td>
                  <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>₹{team.portfolioValue.toLocaleString()}</td>
                  <td className={`font-data ${team.roi >= 0 ? 'text-up' : 'text-down'}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                    {team.roi >= 0 ? '+' : ''}{team.roi.toFixed(1)}%
                  </td>
                  <td className="font-data" style={{ textAlign: 'right' }}>{team.divScore} / 10</td>
                  <td className="font-data" style={{ textAlign: 'right' }}>
                    <span className={team.riskScore > 2.2 ? 'text-down' : team.riskScore > 1.5 ? 'text-brass' : 'text-up'} style={{ fontWeight: 700 }}>
                      {team.riskScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)' }}>Showing Page {currentPage} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button className="btn btn-secondary" style={{ padding: '6px 12px' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* Drill-down team stats & chronological logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Team Analysis Details */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Individual Team Audit
          </h3>
          <div className="form-group">
            <label>Select Team to Inspect</label>
            <select className="input-field" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
              <option value="">Select Team...</option>
              {state.teams.map(t => (
                <option key={t.id} value={t.id}>{t.teamCode} &mdash; {t.teamName}</option>
              ))}
            </select>
          </div>

          {currentTeam ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass" style={{ padding: '12px 16px', backgroundColor: 'var(--color-surface-2)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>Capital Deployed</span>
                  <div className="font-data" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{currentTeam.cashUtilization.toFixed(1)}%</div>
                </div>
                <div className="glass" style={{ padding: '12px 16px', backgroundColor: 'var(--color-surface-2)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>Cash Kept Liquid</span>
                  <div className="font-data" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-brass)' }}>₹{currentTeam.cashBalance.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass" style={{ padding: '12px 16px', borderLeft: '3px solid var(--color-rise)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>Best Decision Yield</span>
                  {bestDec ? (
                    <div style={{ marginTop: '4px' }}>
                      <strong style={{ fontSize: '1rem' }}>{bestDec.ticker}</strong>
                      <div className="font-data text-up" style={{ fontWeight: 700 }}>+{bestDec.pctGain.toFixed(1)}% gain</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-ink-3)' }}>None</div>
                  )}
                </div>
                <div className="glass" style={{ padding: '12px 16px', borderLeft: '3px solid var(--color-fall)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>Worst Decision Yield</span>
                  {worstDec ? (
                    <div style={{ marginTop: '4px' }}>
                      <strong style={{ fontSize: '1rem' }}>{worstDec.ticker}</strong>
                      <div className="font-data text-down" style={{ fontWeight: 700 }}>{worstDec.pctGain.toFixed(1)}% yield</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-ink-3)' }}>None</div>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--color-ink-2)' }}>Audit Orders</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {teamTxs.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-3)' }}>No transactions logged.</p>
                  ) : (
                    teamTxs.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem', opacity: t.voided ? 0.45 : 1 }}>
                        <span>
                          <strong className="font-data">{t.id}</strong> &bull; <span className={t.action === 'BUY' ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>{t.action}</span> {t.quantity} {t.ticker}
                        </span>
                        <span className="font-data">₹{t.totalValue.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-ink-3)', fontSize: '0.9rem', marginTop: '16px', textAlign: 'center' }}>
              Select a team from the dropdown to audit metrics.
            </p>
          )}
        </div>

        {/* Chronological Event Timeline */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Chronological Event Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {state.corporateActions.length === 0 && state.newsEvents.length === 0 ? (
              <p style={{ color: 'var(--color-ink-3)', fontSize: '0.9rem', textAlign: 'center' }}>No historical announcements recorded.</p>
            ) : (
              [
                ...state.newsEvents.filter(n => n.isCustom || n.triggeredAt).map(n => ({ ...n, type: 'News' })),
                ...state.corporateActions.map(c => ({ ...c, type: 'Corporate' }))
              ]
                .sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0))
                .map((event, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-brass)' }}>
                        {event.type} &mdash; {event.actionType || event.category}
                      </span>
                      <span className="font-data" style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                        {formatTime(event.triggeredAt)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{event.headline || event.details}</div>
                    {event.description && <div style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem', marginTop: '2px' }}>{event.description}</div>}
                  </div>
                ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
