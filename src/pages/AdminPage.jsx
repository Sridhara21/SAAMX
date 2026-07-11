import React, { useState, useEffect } from 'react';

export default function AdminPage({ state, onOpenProfile, adminPassword, activeAlerts = [] }) {
  // Navigation tabs inside admin
  const [activeTab, setActiveTab] = useState('surveillance'); // surveillance, securities, teams, ledger, settings

  // Search & Filter state
  const [secSearch, setSecSearch] = useState('');
  const [secSector, setSecSector] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 12;

  // Inline pricing edits
  const [editingSecId, setEditingSecId] = useState(null);
  const [editPrice, setEditPrice] = useState('0');
  const [editUnits, setEditUnits] = useState('0');

  // Manual price override state
  const [overrideSecId, setOverrideSecId] = useState('');
  const [overrideType, setOverrideType] = useState('Absolute');
  const [overrideVal, setOverrideVal] = useState('');

  // Velocity override state
  const [velocitySecId, setVelocitySecId] = useState('');
  const [velocityTarget, setVelocityTarget] = useState('');
  const [velocityDuration, setVelocityDuration] = useState('120'); // 2 minutes default

  // Staged Bankruptcy workflow states
  const [stageSecId, setStageSecId] = useState('');
  const [stageConfirmState, setStageConfirmState] = useState(false);
  const [investigatingSecIds, setInvestigatingSecIds] = useState({});

  // Narrative Templates state
  const [previewHeadline, setPreviewHeadline] = useState('');
  const [previewDesc, setPreviewDesc] = useState('');
  const [previewImpact, setPreviewImpact] = useState('15');
  const [previewSentiment, setPreviewSentiment] = useState('Negative');
  const [previewTargetSecId, setPreviewTargetSecId] = useState('');

  // AI Chat Assistant state
  const [showAIChat, setShowAIChat] = useState(true);
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState([
    { sender: 'AI', text: 'System initialized. I have full read-access to the securities ledger and order books. Describe any market intervention: "Make RELI go up 20% over 2 minutes", "Crash the banking sector", or "Fire Act 4 of Project Phoenix".' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedPhoenixAct, setSelectedPhoenixAct] = useState('1');

  // Settings
  const [startingRetail, setStartingRetail] = useState(state.settings.startingCapitalRetail);
  const [startingMutual, setStartingMutual] = useState(state.settings.startingCapitalMutualFund);
  const [startingHedge, setStartingHedge] = useState(state.settings.startingCapitalHedgeFund);
  const [simDuration, setSimDuration] = useState(state.marketState.simulationDurationMinutes);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Client-driven velocity ticks (every 3 seconds)
  useEffect(() => {
    if (!state || !state.velocities) return;
    const activeVelocities = Object.values(state.velocities).filter(v => v.active);
    if (activeVelocities.length === 0) return;

    const interval = setInterval(async () => {
      for (const vel of activeVelocities) {
        const elapsed = Date.now() - vel.startTime;
        const progress = Math.min(1, elapsed / vel.durationMs);
        const targetPrice = vel.targetPrice;
        const startPrice = vel.startPrice;
        const currentTargetPrice = parseFloat((startPrice + (targetPrice - startPrice) * progress).toFixed(2));

        // Call price override to step currentPrice
        await fetch('/api/price-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-fms-password': adminPassword },
          body: JSON.stringify({
            securityId: vel.ticker,
            type: 'Instant',
            price: currentTargetPrice
          })
        }).catch(() => {});

        if (progress >= 1) {
          // Deactivate/stop velocity configuration in Firebase
          await fetch('/api/price-override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-fms-password': adminPassword },
            body: JSON.stringify({
              securityId: vel.ticker,
              type: 'StopVelocity'
            })
          }).catch(() => {});
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state ? state.velocities : null, adminPassword]);

  // Client-driven sentiment drift engine (every 60 seconds when market is open)
  useEffect(() => {
    if (!state || state.marketState?.status !== 'Open') return;

    const interval = setInterval(async () => {
      const activeSecurities = Object.values(state.securities || {}).filter(s => s.status === 'Active' && s.sentimentOverride);
      for (const sec of activeSecurities) {
        const drift = sec.sentimentOverride * 0.45; // drifts up to 0.9%
        await fetch('/api/price-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-fms-password': adminPassword },
          body: JSON.stringify({
            securityId: sec.ticker,
            type: 'Shift',
            percentChange: drift
          })
        }).catch(() => {});
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [state ? state.marketState?.status : null, state ? state.securities : null, adminPassword]);

  // Security Form Modal
  const [showSecModal, setShowSecModal] = useState(false);
  const [newSec, setNewSec] = useState({
    ticker: '', name: '', sector: 'Technology', basePrice: 100, totalUnits: 100, volatility: 0.5
  });

  // Team Form Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    teamCode: '', teamName: '', teamType: 'Retail'
  });

  // Void manual price adjustment overrides
  const [voidPriceOverrides, setVoidPriceOverrides] = useState({});

  const downloadCSV = (headers, data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSeedData = async () => {
    if (window.confirm('This will purge the active securities and seed the default list. Proceed?')) {
      try {
        await fetch('/api/admin/seed', { method: 'POST', headers: { 'X-FMS-Password': adminPassword } });
        alert('Starter data seeded successfully.');
      } catch (err) {
        alert('Seed failed: ' + err.message);
      }
    }
  };

  const handleReset = async () => {
    if (resetConfirmText !== 'RESET') {
      alert('Please type "RESET" in the settings confirmation field.');
      return;
    }
    try {
      await fetch('/api/admin/reset', { method: 'POST', headers: { 'X-FMS-Password': adminPassword } });
      setResetConfirmText('');
      alert('FULL SYSTEM RESET COMPLETE. All assets restored to base prices, cash balances reset, and logs purged.');
    } catch (err) {
      alert('Reset failed: ' + err.message);
    }
  };

  const handlePrintDirectory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `
      <html>
        <head>
          <title>FMS Securities Directory</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 40px;
              line-height: 1.5;
            }
            h1 {
              font-size: 2.2rem;
              margin-bottom: 5px;
              color: #a47c32;
            }
            .subtitle {
              color: #666;
              font-size: 1.1rem;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px 12px;
              text-align: left;
            }
            th {
              background-color: #f7f5f0;
              color: #333;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 0.8rem;
            }
            tr:nth-child(even) {
              background-color: #faf9f6;
            }
            .ticker {
              font-weight: bold;
              color: #a47c32;
            }
            .details {
              font-size: 0.85rem;
              color: #444;
              margin-top: 5px;
            }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1>FMS Securities Directory</h1>
              <div class="subtitle">Official Research Note & Security Universe Reference</div>
            </div>
            <button onclick="window.print()" style="padding: 10px 20px; background: #a47c32; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Print Sheet</button>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 120px;">Ticker & Name</th>
                <th>Sector & Type</th>
                <th style="text-align: right; width: 100px;">Start Price</th>
                <th style="text-align: right; width: 100px;">Units Available</th>
                <th style="width: 100px;">Risk Rating</th>
                <th>Key Specifications / Details</th>
              </tr>
            </thead>
            <tbody>
    `;

    state.securities.forEach(s => {
      const details = s.profileDetails || {};
      const factsStr = (details.facts || []).map(f => `<strong>${f.label}:</strong> ${f.value}`).join(' | ');
      const holdingsStr = (details.holdings || []).map(h => `<strong>${h.name}:</strong> ${h.value}`).join('<br/>');

      let specHtml = `<div class="details">${s.description || ''}</div>`;
      if (factsStr) {
        specHtml += `<div class="details" style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #eee;">${factsStr}</div>`;
      }
      if (holdingsStr) {
        specHtml += `<div class="details" style="margin-top: 4px; background: #fdfcf9; padding: 6px; border-radius: 4px;">${holdingsStr}</div>`;
      }

      html += `
        <tr>
          <td>
            <span class="ticker">${s.ticker}</span><br/>
            <span style="font-size: 0.9rem;">${s.name}</span>
          </td>
          <td>
            <span style="font-size: 0.9rem; font-weight: 600;">${s.sector}</span><br/>
            <span style="font-size: 0.8rem; color: #666;">${s.type}</span>
          </td>
          <td style="text-align: right; font-weight: bold;">₹${s.basePrice.toLocaleString()}</td>
          <td style="text-align: right;">${s.totalUnits.toLocaleString()}</td>
          <td>
            <span style="font-weight: 600; color: ${s.riskRating === 'High' ? '#d9534f' : s.riskRating === 'Medium' ? '#f0ad4e' : '#5cb85c'}">${s.riskRating}</span>
          </td>
          <td>
            ${specHtml}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          settings: {
            startingCapitalRetail: Number(startingRetail),
            startingCapitalMutualFund: Number(startingMutual),
            startingCapitalHedgeFund: Number(startingHedge)
          }
        })
      });
      if (res.ok) alert('Platform settings saved.');
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleCreateSecurity = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/securities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify(newSec)
      });
      if (res.ok) {
        setShowSecModal(false);
        setNewSec({ ticker: '', name: '', sector: 'Technology', basePrice: 100, totalUnits: 100, volatility: 0.5 });
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Error creating security: ' + err.message);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify(newTeam)
      });
      if (res.ok) {
        setShowTeamModal(false);
        setNewTeam({ teamCode: '', teamName: '', teamType: 'Retail' });
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert('Error creating team: ' + err.message);
    }
  };

  const handleVoidTx = async (id) => {
    if (window.confirm('Void this transaction? (Reverses cash balances and available unit pools. Asset prices must be adjusted manually.)')) {
      try {
        await fetch('/api/transactions/void', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        alert('Void failed: ' + err.message);
      }
    }
  };

  const handleManualPriceOverride = async (e) => {
    e.preventDefault();
    if (!overrideSecId || !overrideVal) {
      alert('Select security and enter value.');
      return;
    }

    const sec = state.securities.find(s => s.id === overrideSecId);
    if (!sec) return;

    let targetPrice = Number(overrideVal);
    if (overrideType === 'Percentage') {
      const pct = Number(overrideVal);
      targetPrice = parseFloat((sec.currentPrice * (1 + pct / 100)).toFixed(2));
    }

    try {
      const res = await fetch(`/api/securities/${overrideSecId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ currentPrice: targetPrice })
      });
      if (res.ok) {
        setOverrideVal('');
        alert(`Updated ${sec.ticker} to ₹${targetPrice}`);
      }
    } catch (err) {
      alert('Override failed: ' + err.message);
    }
  };

  const handleVelocityControl = async (e) => {
    e.preventDefault();
    if (!velocitySecId || !velocityTarget) {
      alert('Select security and enter target price.');
      return;
    }
    try {
      const res = await fetch('/api/admin/velocity-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          securityId: velocitySecId,
          targetPrice: Number(velocityTarget),
          durationSeconds: Number(velocityDuration)
        })
      });
      if (res.ok) {
        setVelocityTarget('');
        alert('Velocity target price adjustment set successfully.');
      }
    } catch (err) {
      alert('Velocity setting failed: ' + err.message);
    }
  };

  const handleGlobalControl = async (action) => {
    try {
      const res = await fetch('/api/admin/global-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Global emergency action executed: ${action}`);
      }
    } catch (err) {
      alert('Global override failed: ' + err.message);
    }
  };

  const handlePhoenixAct = async (actNum) => {
    try {
      const res = await fetch('/api/admin/phoenix-act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ actNumber: Number(actNum) })
      });
      if (res.ok) {
        alert(`Project Phoenix Act ${actNum} fired successfully!`);
      }
    } catch (err) {
      alert('Act activation failed: ' + err.message);
    }
  };

  const handleTargetInstantPrice = async (ticker, percentageChange) => {
    const sec = state.securities.find(s => s.ticker === ticker);
    if (!sec) return;
    const targetPrice = parseFloat((sec.currentPrice * (1 + percentageChange / 100)).toFixed(2));
    try {
      const res = await fetch(`/api/securities/${sec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ currentPrice: targetPrice })
      });
      if (res.ok) {
        alert(`Target ${ticker} adjusted by ${percentageChange}% to ₹${targetPrice}`);
      }
    } catch (err) {
      alert('Override failed: ' + err.message);
    }
  };

  const handleTargetHalt = async (ticker, actionType) => {
    const sec = state.securities.find(s => s.ticker === ticker);
    if (!sec) return;
    try {
      const res = await fetch('/api/corporate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          securityId: sec.id,
          actionType: actionType,
          details: `Manual status shift on target asset: ${actionType}`
        })
      });
      if (res.ok) {
        alert(`Target ${ticker} set to ${actionType}`);
      }
    } catch (err) {
      alert('Target operation failed: ' + err.message);
    }
  };

  const handleApplyVoidOverridePrice = async (secId, overrideVal) => {
    try {
      const res = await fetch(`/api/securities/${secId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ currentPrice: Number(overrideVal) })
      });
      if (res.ok) {
        alert('Manual correction applied successfully.');
        setVoidPriceOverrides(prev => {
          const next = { ...prev };
          delete next[secId];
          return next;
        });
      }
    } catch (err) {
      alert('Correction failed: ' + err.message);
    }
  };

  // Staged Bankruptcy stepper actions
  const handleStage1OpenInvestigation = async (sec) => {
    setInvestigatingSecIds({ ...investigatingSecIds, [sec.id]: true });
    const payload = {
      headline: `SEBI Opens Investigation into ${sec.name}`,
      description: `Surveillance desks initiate forensic audits citing accounting and reporting discrepancies. Asset remains tradable.`,
      sentiment: 'Negative',
      impactPercent: 20,
      category: 'Scandal',
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
      actionType: 'HALT',
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

  const handleFireNarrative = async (e) => {
    e.preventDefault();
    if (!previewHeadline.trim()) return;
    const payload = {
      headline: previewHeadline,
      description: previewDesc,
      sentiment: previewSentiment,
      impactPercent: Number(previewImpact),
      category: 'Scandal',
      affectedSector: null,
      affectedSecurityIds: previewTargetSecId ? [previewTargetSecId] : []
    };
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
      body: JSON.stringify(payload)
    });
    setPreviewHeadline('');
    setPreviewDesc('');
    setPreviewTargetSecId('');
    alert('Narrative Dispatched successfully!');
  };

  const handleSendAIMessage = async (e) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setAiMessage('');
    setAiHistory(prev => [...prev, { sender: 'Admin', text: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setAiHistory(prev => [...prev, { sender: 'AI', text: data.response }]);
      } else {
        alert('AI Chat assistant query failed.');
      }
    } catch (err) {
      alert('AI assistant connection error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const narrativeTemplates = [
    { name: "Scandal Probe", headline: "Accounting Irregularities Uncovered", description: "SEBI orders forensic audit of accounts following suspected financial misreporting in company filings.", sentiment: "Negative", impactPercent: 20 },
    { name: "Insider Trading", headline: "Insider Trading Investigation Launched", description: "Regulatory authorities freeze trading accounts linked to corporate insiders on suspected disclosures leak.", sentiment: "Negative", impactPercent: 15 },
    { name: "Auditor Resignation", headline: "Auditor Resigns Citing Disclosure Concerns", description: "Company statutory auditors resign abruptly, citing lack of transparency in asset valuations.", sentiment: "Negative", impactPercent: 25 },
    { name: "Credit Downgrade", headline: "Credit Agency Downgrades Corporate Debt Outlook", description: "Rating agencies downgrade credit profile following debt servicing concerns. Volatility elevated.", sentiment: "Negative", impactPercent: 10 },
    { name: "Merger Rumors", headline: "Competitor Merger Talks Collapsed", description: "Negotiation tables break off due to asset valuation discrepancies.", sentiment: "Negative", impactPercent: 12 }
  ];

  // Asset Exposure Map calculations
  const calculateExposure = () => {
    const exposureMap = {};
    state.securities.forEach(s => {
      exposureMap[s.id] = { ticker: s.ticker, name: s.name, unitsHeld: 0, distinctTeams: new Set(), totalCapital: 0 };
    });
    state.teams.forEach(t => {
      Object.entries(t.holdings).forEach(([secId, qty]) => {
        const sec = state.securities.find(s => s.id === secId);
        if (sec && qty > 0) {
          exposureMap[secId].unitsHeld += qty;
          exposureMap[secId].distinctTeams.add(t.id);
          exposureMap[secId].totalCapital += qty * sec.currentPrice;
        }
      });
    });
    return Object.values(exposureMap).sort((a, b) => b.totalCapital - a.totalCapital);
  };

  const exposureList = calculateExposure();

  // Standings calculation sorted by Portfolio Value
  const standingsList = [...state.teams].map(t => {
    let holdingsValue = 0;
    Object.entries(t.holdings).forEach(([secId, qty]) => {
      const sec = state.securities.find(s => s.id === secId);
      if (sec) holdingsValue += qty * sec.currentPrice;
    });
    const totalPort = holdingsValue + t.cashBalance;
    const initial = t.teamType === 'HedgeFund' ? state.settings.startingCapitalHedgeFund : t.teamType === 'MutualFund' ? state.settings.startingCapitalMutualFund : state.settings.startingCapitalRetail;
    const roi = ((totalPort - initial) / initial) * 100;
    return { ...t, portfolioValue: totalPort, roi };
  }).sort((a, b) => b.portfolioValue - a.portfolioValue);

  const dtaiSecurity = state.securities.find(s => s.ticker === 'DTAI') || { currentPrice: 0, status: 'Active' };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showAIChat ? '240px 1fr 340px' : '240px 1fr',
      gap: '24px',
      minHeight: 'calc(100vh - 120px)',
      padding: '12px',
      position: 'relative',
      transition: 'grid-template-columns 0.3s ease'
    }}>

      {/* Toggle chat assistant button */}
      <button 
        onClick={() => setShowAIChat(!showAIChat)}
        style={{
          position: 'fixed',
          right: showAIChat ? '355px' : '20px',
          bottom: '20px',
          zIndex: 99,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-brass)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          transition: 'all 0.3s ease'
        }}
      >
        {showAIChat ? '💬' : '🤖'}
      </button>

      {/* Sidebar Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '16px', color: 'var(--color-brass)' }}>
          Simulation Control
        </h4>
        <button className="btn" style={{ justifyContent: 'flex-start', backgroundColor: activeTab === 'surveillance' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'surveillance' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('surveillance')}>
          📊 Surveillance Desk
        </button>
        <button className="btn" style={{ justifyContent: 'flex-start', backgroundColor: activeTab === 'securities' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'securities' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('securities')}>
          💼 Securities CRUD
        </button>
        <button className="btn" style={{ justifyContent: 'flex-start', backgroundColor: activeTab === 'teams' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'teams' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('teams')}>
          👥 Teams CRUD
        </button>
        <button className="btn" style={{ justifyContent: 'flex-start', backgroundColor: activeTab === 'ledger' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'ledger' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('ledger')}>
          📜 Transaction Ledger
        </button>
        <button className="btn" style={{ justifyContent: 'flex-start', backgroundColor: activeTab === 'settings' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'settings' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('settings')}>
          ⚙️ Platform Settings
        </button>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={handleSeed}>Quick Seed Assets</button>
          <button className="btn btn-secondary" style={{ padding: '8px', backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }} onClick={handlePrintDirectory}>Print Directory</button>
          <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '8px' }} onClick={handleReset}>Reset Database</button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div style={{ overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Tab 1: Surveillance Dashboard */}
        {activeTab === 'surveillance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* EMERGENCY MASTER CONTROLS */}
            <div className="glass card" style={{ borderLeft: '4px solid var(--color-fall)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚨 EMERGENCY GLOBAL SYSTEM CONTROL
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button className="btn" style={{ backgroundColor: 'var(--color-rise)', color: '#fff', fontWeight: 'bold' }} onClick={() => handleGlobalControl('BULL_RUN')}>
                  📈 GLOBAL BULL RUN (+2 Sentiment)
                </button>
                <button className="btn" style={{ backgroundColor: 'var(--color-fall)', color: '#fff', fontWeight: 'bold' }} onClick={() => handleGlobalControl('CRASH')}>
                  📉 SYSTEMIC MARKET CRASH (-2 Sentiment)
                </button>
                <button className="btn btn-secondary" onClick={() => handleGlobalControl('RESET_SENTIMENT')}>
                  🔄 Reset Sentiment to Neutral
                </button>
                <button className="btn" style={{ backgroundColor: 'var(--color-brass)', color: '#fff' }} onClick={() => handleGlobalControl('FREEZE_ALL')}>
                  ⏸ FREEZE ALL TRADING
                </button>
                <button className="btn btn-primary" onClick={() => handleGlobalControl('RESUME_ALL')}>
                  ▶ RESUME ALL TRADING
                </button>
              </div>
            </div>

            {/* TARGET COMPANY CONTROL PANEL (PROJECT PHOENIX) */}
            <div className="glass card" style={{ borderLeft: '4px solid var(--color-brass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.2rem' }}>
                    🔥 Target Company Control Strip: DTAI (Delta AI Labs)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                    Current status: <strong style={{ color: dtaiSecurity.status === 'Active' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{dtaiSecurity.status}</strong> | Last Traded: <strong>₹{dtaiSecurity.currentPrice}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn" style={{ backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)', padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleTargetInstantPrice('DTAI', 15)}>
                    ▲ Pump (+15%)
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleTargetInstantPrice('DTAI', -15)}>
                    ▼ Dump (-15%)
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleTargetHalt('DTAI', dtaiSecurity.status === 'Halted' ? 'UNHALT' : 'CircuitBreaker')}>
                    {dtaiSecurity.status === 'Halted' ? '▶ Unhalt' : '⏸ Halt'}
                  </button>
                  <button className="btn" style={{ backgroundColor: '#000', color: '#fff', padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleTargetHalt('DTAI', 'Bankruptcy')}>
                    💀 Insolvency
                  </button>
                </div>
              </div>

              {/* SCRIPTED ACTS BOARD */}
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-ink)' }}>Project Phoenix Script Acts:</span>
                <select className="input-field" style={{ width: '280px', padding: '6px 10px', fontSize: '0.85rem' }} value={selectedPhoenixAct} onChange={e => setSelectedPhoenixAct(e.target.value)}>
                  <option value="1">T+08m - Act 1: DTAI Loss (-22%)</option>
                  <option value="2">T+14m - Act 2: DTAI Mystery Buy (₹210)</option>
                  <option value="3">T+16m - IPO 1: IndiaStack Fintech (ISFT)</option>
                  <option value="4">T+19m - Act 3: DTAI CEO Resigns (-8%)</option>
                  <option value="5">T+22m - Act 4: DTAI Goldman Pump (₹280)</option>
                  <option value="6">T+23m - Act 5: Anthropic IPO 60s Warning</option>
                  <option value="7">T+24m - IPO 2: Anthropic AI India (ANTH)</option>
                  <option value="8">T+25m - Act 6: Anthropic IPO Day Pop (+12%)</option>
                  <option value="9">T+30m - Act 7: SEBI DTAI Forensic Probe (₹220)</option>
                  <option value="10">T+34m - Act 8: DTAI Insider Scandal (-30%)</option>
                  <option value="11">T+35m - Act 9: ANTH Sector Rally (+10%)</option>
                  <option value="12">T+36m - Act 10: SEBI Suspends DTAI Trading</option>
                  <option value="13">T+38m - Act 11: DTAI Insolvency & Ruin (₹0)</option>
                  <option value="14">T+40m - Act 12: Market Recovery Rally</option>
                  <option value="15">T+45m - Act 13: ANTH Defense Contract (+8%)</option>
                </select>
                <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => handlePhoenixAct(selectedPhoenixAct)}>
                  ⚡ FIRE ACT DISPATCH
                </button>
              </div>
            </div>

            {/* Live Standings & Exposure Map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              <div className="glass card">
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
                  Live Roster Standings
                </h3>
                <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                  <table className="fms-table" style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Team Name</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>ROI%</th>
                        <th style={{ textAlign: 'right' }}>Capital Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standingsList.map((t, idx) => (
                        <tr key={t.id}>
                          <td className="font-data" style={{ fontWeight: 700 }}>
                            {idx === 0 ? '🏆 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}{t.teamCode}
                          </td>
                          <td>{t.teamName}</td>
                          <td><span className="badge badge-public">{t.teamType}</span></td>
                          <td className={`font-data ${t.roi >= 0 ? 'text-up' : 'text-down'}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                            {t.roi >= 0 ? '+' : ''}{t.roi.toFixed(1)}%
                          </td>
                          <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{t.portfolioValue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass card">
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
                  Systemic Risk & Exposure Map
                </h3>
                <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                  <table className="fms-table" style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th style={{ textAlign: 'right' }}>Units Held</th>
                        <th style={{ textAlign: 'right' }}>Exposure (₹)</th>
                        <th style={{ textAlign: 'right' }}>Teams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exposureList.map(e => {
                        const isDtai = e.ticker === 'DTAI';
                        return (
                          <tr key={e.ticker} style={isDtai ? { backgroundColor: 'rgba(217, 83, 79, 0.15)', border: '2px solid var(--color-fall)' } : {}}>
                            <td className="font-data" style={{ fontWeight: 700, color: isDtai ? 'var(--color-fall)' : 'inherit' }}>
                              {e.ticker} {isDtai && '🔥'}
                            </td>
                            <td className="font-data" style={{ textAlign: 'right' }}>{e.unitsHeld.toLocaleString()}</td>
                            <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>
                              ₹{e.totalCapital.toLocaleString()}
                            </td>
                            <td className="font-data" style={{ textAlign: 'right' }}>
                              <span className="badge" style={{ backgroundColor: isDtai ? 'var(--color-fall)' : 'var(--color-brass-light)', color: isDtai ? '#fff' : 'var(--color-brass)' }}>
                                {e.distinctTeams.size} Teams
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Stepper Bankruptcy and Overrides */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Bankruptcy Stepper */}
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
                          <button className="btn btn-secondary" disabled={step1Done} onClick={() => handleStage1OpenInvestigation(sec)}>
                            Step 1: Open Investigation
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)' }}>Broadcasts SEBI warning, triggers selloff</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <button className="btn btn-secondary" disabled={!step1Done || step2Done} onClick={() => handleStage2SuspendTrading(sec)}>
                            Step 2: Suspend Trading
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)' }}>Freezes trading, shows halt banner</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <button className="btn" style={{ backgroundColor: 'var(--color-fall)', color: 'var(--color-surface)' }} disabled={!step2Done} onClick={() => handleStage3Liquidate(sec)}>
                            {stageConfirmState ? '⚠️ CONFIRM LIQUIDATION' : 'Step 3: Liquidate Asset'}
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-fall)', fontWeight: 600 }}>Sets asset to ₹0. Permanent halt.</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Overrides & Velocity Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Instant Overrides */}
                <div className="glass card">
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', marginBottom: '12px' }}>
                    Instant Price Override
                  </h3>
                  <form onSubmit={handleManualPriceOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <select className="input-field" style={{ padding: '6px' }} value={overrideSecId} onChange={e => setOverrideSecId(e.target.value)}>
                        <option value="">Select Asset...</option>
                        {state.securities.map(s => <option key={s.id} value={s.id}>{s.ticker} - {s.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                      <select className="input-field" style={{ padding: '6px' }} value={overrideType} onChange={e => setOverrideType(e.target.value)}>
                        <option value="Absolute">Absolute Price</option>
                        <option value="Percentage">Percentage Shift</option>
                      </select>
                      <input type="number" className="input-field font-data" style={{ padding: '6px' }} placeholder="Value" value={overrideVal} onChange={e => setOverrideVal(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '6px' }}>Apply Instant Override</button>
                  </form>
                </div>

                {/* Velocity Control */}
                <div className="glass card">
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', marginBottom: '12px' }}>
                    Velocity Price Control (Organic Movement)
                  </h3>
                  <form onSubmit={handleVelocityControl} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <select className="input-field" style={{ padding: '6px' }} value={velocitySecId} onChange={e => setVelocitySecId(e.target.value)}>
                        <option value="">Select Asset...</option>
                        {state.securities.map(s => <option key={s.id} value={s.id}>{s.ticker} - {s.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                      <input type="number" className="input-field font-data" style={{ padding: '6px' }} placeholder="Target Price (₹)" value={velocityTarget} onChange={e => setVelocityTarget(e.target.value)} />
                      <select className="input-field" style={{ padding: '6px' }} value={velocityDuration} onChange={e => setVelocityDuration(e.target.value)}>
                        <option value="30">FAST (30s)</option>
                        <option value="120">MED (2 min)</option>
                        <option value="300">SLOW (5 min)</option>
                      </select>
                    </div>
                    <button type="submit" className="btn" style={{ backgroundColor: 'var(--color-brass)', color: '#fff', padding: '6px' }}>Set Velocity Target</button>
                  </form>
                </div>
              </div>

            </div>

            {/* Narrative Bulletins dispatcher templates */}
            <div className="glass card">
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
                Scripted Narrative Dispatch
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {narrativeTemplates.map(tpl => (
                    <button
                      key={tpl.name}
                      className="btn btn-secondary"
                      style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}
                      onClick={() => {
                        setPreviewHeadline(tpl.headline);
                        setPreviewDesc(tpl.description);
                        setPreviewImpact(String(tpl.impactPercent));
                        setPreviewSentiment(tpl.sentiment);
                      }}
                    >
                      <span>{tpl.name}</span>
                      <span className={tpl.sentiment === 'Positive' ? 'text-up' : 'text-down'}>{tpl.sentiment === 'Positive' ? '+' : '-'}{tpl.impactPercent}%</span>
                    </button>
                  ))}
                </div>
                
                <form onSubmit={handleFireNarrative} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
                  <div className="form-group">
                    <label>Headline Preview</label>
                    <input type="text" className="input-field" value={previewHeadline} onChange={e => setPreviewHeadline(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Description Preview</label>
                    <textarea className="input-field" rows="2" style={{ resize: 'none' }} value={previewDesc} onChange={e => setPreviewDesc(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Target Security (Optional)</label>
                      <select className="input-field" value={previewTargetSecId} onChange={e => setPreviewTargetSecId(e.target.value)}>
                        <option value="">Global Impact</option>
                        {state.securities.map(s => <option key={s.id} value={s.id}>{s.ticker}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Impact Value (%)</label>
                      <input type="number" className="input-field font-data" value={previewImpact} onChange={e => setPreviewImpact(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>Dispatch Bulletin</button>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Securities CRUD */}
        {activeTab === 'securities' && (
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Listing Directory Directory ({state.securities.length} Entries)</h3>
              <button className="btn btn-primary" onClick={() => setShowSecModal(true)}>Add New Security</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <input type="text" className="input-field" placeholder="Search by ticker or name..." value={secSearch} onChange={e => setSecSearch(e.target.value)} />
              <select className="input-field" value={secSector} onChange={e => setSecSector(e.target.value)}>
                <option value="">All Sectors</option>
                {Array.from(new Set(state.securities.map(s => s.sector))).map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="fms-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'right' }}>Price (₹)</th>
                    <th style={{ textAlign: 'right' }}>Total Float</th>
                    <th style={{ textAlign: 'right' }}>Units Available</th>
                    <th>Risk</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.securities
                    .filter(s => s.ticker.toLowerCase().includes(secSearch.toLowerCase()) || s.name.toLowerCase().includes(secSearch.toLowerCase()))
                    .filter(s => !secSector || s.sector === secSector)
                    .map(s => (
                      <tr key={s.id} style={{ opacity: s.status === 'Active' ? 1 : 0.6 }}>
                        <td className="font-data" style={{ fontWeight: 700 }}>{s.ticker}</td>
                        <td>{s.name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{s.sector}</td>
                        <td className="font-data" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {editingSecId === s.id ? (
                            <input type="number" className="input-field font-data" style={{ width: '80px', padding: '2px 4px', fontSize: '0.85rem' }} value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                          ) : (
                            `₹${s.currentPrice}`
                          )}
                        </td>
                        <td className="font-data" style={{ textAlign: 'right' }}>{s.totalUnits.toLocaleString()}</td>
                        <td className="font-data" style={{ textAlign: 'right' }}>
                          {editingSecId === s.id ? (
                            <input type="number" className="input-field font-data" style={{ width: '80px', padding: '2px 4px', fontSize: '0.85rem' }} value={editUnits} onChange={e => setEditUnits(e.target.value)} />
                          ) : (
                            s.availableUnits.toLocaleString()
                          )}
                        </td>
                        <td><span className={`badge ${s.riskRating === 'High' ? 'badge-protected' : 'badge-public'}`}>{s.riskRating}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {editingSecId === s.id ? (
                              <>
                                <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                                  try {
                                    await fetch(`/api/securities/${s.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
                                      body: JSON.stringify({ currentPrice: Number(editPrice), availableUnits: Number(editUnits) })
                                    });
                                    setEditingSecId(null);
                                  } catch (err) { alert(err.message); }
                                }}>Save</button>
                                <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setEditingSecId(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => {
                                  setEditingSecId(s.id);
                                  setEditPrice(String(s.currentPrice));
                                  setEditUnits(String(s.availableUnits));
                                }}>Edit</button>
                                <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => onOpenProfile(s)}>View Profile</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Teams CRUD */}
        {activeTab === 'teams' && (
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Participant Roster Registry</h3>
              <button className="btn btn-primary" onClick={() => setShowTeamModal(true)}>Add New Team</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input type="text" className="input-field" placeholder="Search by team code or name..." value={teamSearch} onChange={e => setTeamSearch(e.target.value)} />
            </div>

            <table className="fms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Team Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Cash Balance</th>
                </tr>
              </thead>
              <tbody>
                {state.teams
                  .filter(t => t.teamCode.toLowerCase().includes(teamSearch.toLowerCase()) || t.teamName.toLowerCase().includes(teamSearch.toLowerCase()))
                  .map(t => (
                    <tr key={t.id}>
                      <td className="font-data" style={{ fontWeight: 700 }}>{t.teamCode}</td>
                      <td>{t.teamName}</td>
                      <td><span className="badge badge-public">{t.teamType}</span></td>
                      <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>₹{t.cashBalance.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Transaction Ledger */}
        {activeTab === 'ledger' && (
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Transaction Ledger Log</h3>
              <button className="btn btn-secondary" onClick={() => {
                const headers = ['TXID', 'Timestamp', 'TeamCode', 'Action', 'Ticker', 'Qty', 'Price', 'Total', 'Voided'];
                const rows = state.transactions.map(tx => [tx.id, new Date(tx.timestamp).toISOString(), tx.teamCode, tx.action, tx.ticker, tx.quantity, tx.priceAtExecution, tx.totalValue, tx.voided ? 'Yes' : 'No']);
                downloadCSV(headers, rows, 'fms_ledger.csv');
              }}>Export CSV</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input type="text" className="input-field" placeholder="Search by TXID, Team code, or Ticker..." value={txSearch} onChange={e => setTxSearch(e.target.value)} />
            </div>

            <table className="fms-table">
              <thead>
                <tr>
                  <th>TXID</th>
                  <th>Team</th>
                  <th>Action</th>
                  <th>Asset</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.transactions
                  .filter(tx => 
                    tx.id.toLowerCase().includes(txSearch.toLowerCase()) ||
                    tx.teamCode.toLowerCase().includes(txSearch.toLowerCase()) ||
                    tx.ticker.toLowerCase().includes(txSearch.toLowerCase())
                  )
                  .slice((txPage - 1) * txPerPage, txPage * txPerPage)
                  .map(tx => (
                    <tr key={tx.id} style={{ opacity: tx.voided ? 0.5 : 1 }}>
                      <td className="font-data" style={{ fontWeight: 700 }}>{tx.id}</td>
                      <td className="font-data">{tx.teamCode}</td>
                      <td className={tx.action === 'BUY' ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>{tx.action}</td>
                      <td className="font-data">{tx.ticker}</td>
                      <td className="font-data" style={{ textAlign: 'right' }}>{tx.quantity}</td>
                      <td className="font-data" style={{ textAlign: 'right' }}>₹{tx.priceAtExecution}</td>
                      <td className="font-data text-brass" style={{ textAlign: 'right', fontWeight: 700 }}>₹{tx.totalValue.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        {tx.voided ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <span className="badge badge-protected" style={{ fontSize: '0.65rem' }}>VOIDED</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>Correct price if needed:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="number"
                                className="input-field font-data"
                                style={{ width: '80px', padding: '2px 4px', fontSize: '0.75rem' }}
                                placeholder="Price"
                                value={voidPriceOverrides[tx.securityId] || ''}
                                onChange={e => setVoidPriceOverrides({ ...voidPriceOverrides, [tx.securityId]: e.target.value })}
                              />
                              <button
                                className="btn btn-primary"
                                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                onClick={() => handleApplyVoidOverridePrice(tx.securityId, voidPriceOverrides[tx.securityId])}
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleVoidTx(tx.id)}>
                            Void Tx
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button className="btn btn-secondary" style={{ padding: '4px 10px' }} disabled={txPage === 1} onClick={() => setTxPage(txPage - 1)}>Prev</button>
              <span className="font-data">Page {txPage} of {Math.ceil(state.transactions.length / txPerPage) || 1}</span>
              <button className="btn btn-secondary" style={{ padding: '4px 10px' }} disabled={txPage >= Math.ceil(state.transactions.length / txPerPage)} onClick={() => setTxPage(txPage + 1)}>Next</button>
            </div>
          </div>
        )}

        {/* Tab 5: Platform Settings */}
        {activeTab === 'settings' && (
          <div className="glass card">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.25rem', marginBottom: '16px' }}>
              Platform System Settings
            </h3>
            
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              <div className="form-group">
                <label>Retail Starting Capital — ₹10,00,000 (Ten Lakhs)</label>
                <input type="number" className="input-field font-data" value={startingRetail} onChange={e => setStartingRetail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mutual Fund Starting Capital</label>
                <input type="number" className="input-field font-data" value={startingMutual} onChange={e => setStartingMutual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hedge Fund Starting Capital</label>
                <input type="number" className="input-field font-data" value={startingHedge} onChange={e => setStartingHedge(e.target.value)} />
              </div>
              
              <button type="submit" className="btn btn-primary">Save Settings Configuration</button>
            </form>

            <div style={{ marginTop: '32px', borderTop: '2px solid var(--color-border)', paddingTop: '24px' }}>
              <h4 style={{ color: 'var(--color-fall)', fontSize: '1.1rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Danger Zone</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginBottom: '16px' }}>
                Performing a full system reset will restore all initial securities to their base prices, clear all holdings, balances, transactions, and news events. This action is irreversible.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  className="input-field font-data"
                  style={{ width: '180px', borderColor: 'var(--color-fall)' }}
                  placeholder="Type RESET to confirm"
                  value={resetConfirmText}
                  onChange={e => setResetConfirmText(e.target.value)}
                />
                <button
                  className="btn"
                  style={{
                    backgroundColor: resetConfirmText === 'RESET' ? 'var(--color-fall)' : 'var(--color-border)',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: resetConfirmText === 'RESET' ? 'pointer' : 'not-allowed'
                  }}
                  disabled={resetConfirmText !== 'RESET'}
                  onClick={handleReset}
                >
                  ☢ FULL SYSTEM RESET
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: AI Market Operations Assistant (Collapsible) */}
      {showAIChat && (
        <div style={{
          borderLeft: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(232, 230, 223, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#5cb85c',
                animation: 'pulse 1.5s infinite'
              }}></div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--color-ink)' }}>
                AI War Assistant
              </h3>
            </div>
            <button 
              onClick={() => setShowAIChat(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                color: 'var(--color-ink-2)'
              }}
            >
              ✕
            </button>
          </div>

          {/* Chat History */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {aiHistory.map((h, i) => (
              <div 
                key={i} 
                style={{
                  alignSelf: h.sender === 'Admin' ? 'flex-end' : 'flex-start',
                  backgroundColor: h.sender === 'Admin' ? 'var(--color-brass-light)' : '#fdfcf9',
                  color: 'var(--color-ink)',
                  border: h.sender === 'Admin' ? '1px solid var(--color-brass-light)' : '1px solid var(--color-border)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '0.8rem',
                  lineHeight: '1.4'
                }}
              >
                <strong style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-ink-2)', marginBottom: '3px' }}>
                  {h.sender.toUpperCase()}
                </strong>
                {h.text}
              </div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--color-ink-2)', fontSize: '0.8rem', display: 'flex', gap: '6px' }}>
                <span className="spinner" style={{ animation: 'rotate 1s linear infinite' }}>⏳</span> Parsing command intent...
              </div>
            )}
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSendAIMessage}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: '#faf9f6',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input 
              type="text" 
              className="input-field" 
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }} 
              placeholder="e.g. Pump DTAI by 45% over 5m"
              value={aiMessage}
              onChange={e => setAiMessage(e.target.value)}
              disabled={aiLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              disabled={aiLoading}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Securities CRUD Add Modal */}
      {showSecModal && (
        <div className="takeover-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <form className="takeover-card" onSubmit={handleCreateSecurity} style={{ maxWidth: '500px', padding: '24px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '1.25rem' }}>Add New Security Listing</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Ticker Prefix</label>
                <input type="text" className="input-field" placeholder="e.g. RELI" required value={newSec.ticker} onChange={e => setNewSec({ ...newSec, ticker: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Company Name</label>
                <input type="text" className="input-field" placeholder="e.g. Reliance Industries" required value={newSec.name} onChange={e => setNewSec({ ...newSec, name: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Sector</label>
                <select className="input-field" value={newSec.sector} onChange={e => setNewSec({ ...newSec, sector: e.target.value })}>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Energy">Energy</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>
              <div className="form-group">
                <label>Base Price (₹)</label>
                <input type="number" className="input-field font-data" required value={newSec.basePrice} onChange={e => setNewSec({ ...newSec, basePrice: Number(e.target.value) })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSecModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Listing</button>
            </div>
          </form>
        </div>
      )}

      {/* Team CRUD Add Modal */}
      {showTeamModal && (
        <div className="takeover-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <form className="takeover-card" onSubmit={handleCreateTeam} style={{ maxWidth: '400px', padding: '24px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '1.25rem' }}>Create Participant Team</h4>
            <div className="form-group">
              <label>Team Code</label>
              <input type="text" className="input-field" placeholder="e.g. T01" required value={newTeam.teamCode} onChange={e => setNewTeam({ ...newTeam, teamCode: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Team Name</label>
              <input type="text" className="input-field" placeholder="e.g. Bullish Bears" required value={newTeam.teamName} onChange={e => setNewTeam({ ...newTeam, teamName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Team Category</label>
              <select className="input-field" value={newTeam.teamType} onChange={e => setNewTeam({ ...newTeam, teamType: e.target.value })}>
                <option value="Retail">Retail</option>
                <option value="MutualFund">Mutual Fund</option>
                <option value="HedgeFund">Hedge Fund</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowTeamModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Register Team</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
