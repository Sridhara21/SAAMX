import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import { db, ref, onValue, update } from '../lib/firebase.js';
import { runTransaction } from 'firebase/database';
import { NEWS_PRESETS } from '../lib/newsPresets.js';

const PROJECT_PHOENIX_ACTS = [
  { id: 'ACT_1', triggerMinute: 8, label: 'Act 1: DTAI Loss Announcement (-22%)', actNumber: 1, type: 'news' },
  { id: 'IPO_1', triggerMinute: 16, label: 'IPO 1: IndiaStack Fintech IPO (ISFT)', actNumber: 3, type: 'ipo' },
  { id: 'ACT_2', triggerMinute: 20, label: 'Act 2: Mystery Buyer Recovery', actNumber: 2, type: 'news' },
  { id: 'ACT_3', triggerMinute: 25, label: 'Act 3: Leadership Upheaval CEO Resigns (-8%)', actNumber: 4, type: 'news' },
  { id: 'ACT_4', triggerMinute: 32, label: 'Act 4: PUMP PHASE — Velocity to ₹420 (Goldman Pump)', actNumber: 5, type: 'velocity' },
  { id: 'IPO_2', triggerMinute: 30, label: 'IPO 2: Anthropic AI India IPO (ANTH)', actNumber: 7, type: 'ipo' },
  { id: 'ACT_5', triggerMinute: 35, label: 'Act 5: Tata Acquisition Rumour (+8%)', actNumber: 8, type: 'news' },
  { id: 'HINT', triggerMinute: 47, label: 'SEBI Hint: SEBI Monitoring DTAI', actNumber: 6, type: 'news' },
  { id: 'ACT_6', triggerMinute: 50, label: 'Act 6: SEBI Opens Investigation (-25%)', actNumber: 9, type: 'sebi_notice' },
  { id: 'ACT_7', triggerMinute: 52, label: 'Act 7: Insider Trading Scandal (-30%)', actNumber: 10, type: 'news' },
  { id: 'ACT_8', triggerMinute: 54, label: 'Act 8: Trading Suspended (Halt)', actNumber: 12, type: 'halt' },
  { id: 'ACT_9', triggerMinute: 56, label: 'Act 9: BANKRUPTCY DECLARED', actNumber: 13, type: 'bankruptcy' }
];

export default function AdminPage({ state, onOpenProfile, adminPassword, activeAlerts = [] }) {
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  // Navigation tabs inside admin
  const [activeTab, setActiveTab] = useState('warroom'); // warroom, securities, teams, ledger, settings, corporate
  const [surveillanceSubTab, setSurveillanceSubTab] = useState('metrics'); // metrics, warroom, sentiment

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
    { sender: 'AI', text: 'System initialized. I have full read-access to the securities ledger and order books. Describe any market intervention: "Make RELI go up 20% over 2 minutes", "Crash the banking sector", or "Fire Act 4 of Staged Interventions".' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedPhoenixAct, setSelectedPhoenixAct] = useState('1');

  // Settings
  const adminSettings = state.settings || {
    startingCapitalRetail: 1000000,
    startingCapitalMutualFund: 1000000,
    startingCapitalHedgeFund: 1000000
  };
  const [startingRetail, setStartingRetail] = useState(adminSettings.startingCapitalRetail || 1000000);
  const [startingMutual, setStartingMutual] = useState(adminSettings.startingCapitalMutualFund || 1000000);
  const [startingHedge, setStartingHedge] = useState(adminSettings.startingCapitalHedgeFund || 1000000);
  const [simDuration, setSimDuration] = useState(state.marketState?.simulationDurationMinutes || 60);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetMode, setResetMode] = useState('TEST'); // TEST or EVENT
  const [activeTeamCount, setActiveTeamCount] = useState(10);
  const [eventCheckboxConfirmed, setEventCheckboxConfirmed] = useState(false);
  const [corpSecId, setCorpSecId] = useState('');
  const [corpActionType, setCorpActionType] = useState('StockSplit');
  const [corpDetails, setCorpDetails] = useState('');

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
        await apiFetch('/api/price-override', {
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
          await apiFetch('/api/price-override', {
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

  // Organic market noise drift heartbeat (every 8s for live projector dynamism)
  useEffect(() => {
    if (!state || !state.marketState || state.marketState.status !== 'Open') return;

    const heartbeat = setInterval(async () => {
      try {
        await runTransaction(ref(db, 'fms/securities'), (securities) => {
          if (!securities) return securities;
          
          Object.keys(securities).forEach(key => {
            const security = securities[key];
            if (security.status !== 'Active') return;

            let drift = 0;
            if (security.sentimentOverride !== undefined && security.sentimentOverride !== 0) {
              const rates = { '-2': -0.04, '-1': -0.015, '0': 0, '1': 0.015, '2': 0.04 };
              const baseRate = rates[String(security.sentimentOverride)] || 0;
              const noise = (Math.random() - 0.5) * 0.005;
              drift = baseRate + noise;
            } else {
              const magnitude = (security.volatility || 0.5) * 0.008;
              drift = (Math.random() - 0.48) * magnitude; // slight upward bias
            }

            if (Math.abs(drift) < 0.001) return;

            const oldPrice = security.currentPrice;
            const newPrice = parseFloat(Math.max(1, oldPrice * (1 + drift)).toFixed(2));
            
            if (newPrice !== oldPrice) {
              security.currentPrice = newPrice;
              if (!security.priceHistory) security.priceHistory = [];
              security.priceHistory.push({ timestamp: Date.now(), price: newPrice });
              if (security.priceHistory.length > 100) security.priceHistory.shift();
            }
          });

          return securities;
        });
      } catch (err) {
        console.error('Error running price drift heartbeat:', err);
      }
    }, 8000);

    return () => clearInterval(heartbeat);
  }, [state?.marketState?.status]);



  // Ambient news generator loop (every 2-3m)
  useEffect(() => {
    if (!state || !state.marketState || state.marketState.status !== 'Open') return;

    let timerId = null;

    const scheduleNextAutoNews = () => {
      const delay = 120000 + Math.random() * 60000; // 2 to 3 minutes
      
      timerId = setTimeout(async () => {
        const newsItems = Object.values(state.newsEvents || {});
        const recentNews = newsItems.filter(n => Date.now() - n.triggeredAt < 120000);

        if (recentNews.length === 0) {
          await dispatchAutoNews();
        }

        scheduleNextAutoNews();
      }, delay);
    };

    scheduleNextAutoNews();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [state?.marketState?.status, state?.newsEvents]);

  const dispatchAutoNews = async () => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'dangerouslyAllowBrowser': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 200,
            system: "You are a financial news wire service for a stock market simulation. Generate ONE realistic short market news item that would move stock prices. Respond ONLY with valid JSON containing keys: headline, description, sentiment ('Positive'/'Negative'/'Neutral'), impactPercent (number between 5 and 15), affectedSector (null or string), affectedSecurityIds (array of strings, e.g. ['RELI']), category ('Corporate'/'Macro'/'Scandal').",
            messages: [{ role: 'user', content: 'Generate the next ambient market news event.' }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newsData = JSON.parse(data.content[0].text.trim());
          await apiFetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
            body: JSON.stringify({ ...newsData, isAutoGenerated: true })
          });
          return;
        }
      } catch (e) {
        console.error('Claude news generation failed, falling back...', e);
      }
    }

    const fallbackNews = generateFallbackNews();
    if (fallbackNews) {
      await apiFetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ ...fallbackNews, isAutoGenerated: true })
      });
    }
  };

  const generateFallbackNews = () => {
    if (!state.securities || state.securities.length === 0) return null;
    const activeSecurities = state.securities.filter(s => s.status === 'Active');
    if (activeSecurities.length === 0) return null;
    const sec = activeSecurities[Math.floor(Math.random() * activeSecurities.length)];

    const templates = [
      {
        sentiment: 'Positive',
        category: 'Corporate',
        headline: `${sec.name} Secures Multi-Million Dollar Order`,
        description: `${sec.name} has bagged a major long-term procurement contract, driving bullish forecasts.`,
        impactPercent: Math.floor(Math.random() * 8) + 4
      },
      {
        sentiment: 'Positive',
        category: 'Macro',
        headline: `Strong Institutional Buy-In Lifts ${sec.ticker}`,
        description: `Mutual Fund houses increased allocations to ${sec.name} following optimistic growth estimates.`,
        impactPercent: Math.floor(Math.random() * 5) + 3
      },
      {
        sentiment: 'Negative',
        category: 'Disaster',
        headline: `${sec.ticker} Production Briefly Disrupted`,
        description: `Operational delays at the primary facility temporarily affect product rollout times.`,
        impactPercent: Math.floor(Math.random() * 7) + 5
      },
      {
        sentiment: 'Negative',
        category: 'Scandal',
        headline: `Speculative Shorting Wave Hits ${sec.ticker}`,
        description: `Brief consolidation trading dials see active short positions stack up on ${sec.name}.`,
        impactPercent: Math.floor(Math.random() * 6) + 4
      },
      {
        sentiment: 'Neutral',
        category: 'Policy',
        headline: `Sector Policy Review Details Anticipated`,
        description: `Regulators prepare outline changes to licensing terms; ${sec.name} management monitors.`,
        impactPercent: 0
      }
    ];

    const tpl = templates[Math.floor(Math.random() * templates.length)];
    return {
      headline: tpl.headline,
      description: tpl.description,
      sentiment: tpl.sentiment,
      impactPercent: tpl.impactPercent,
      affectedSector: null,
      affectedSecurityIds: [sec.ticker],
      category: tpl.category
    };
  };





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
        await apiFetch('/api/admin/seed', { method: 'POST', headers: { 'X-FMS-Password': adminPassword } });
        alert('Starter data seeded successfully.');
        window.location.reload();
      } catch (err) {
        alert('Seed failed: ' + err.message);
      }
    }
  };

  const handleReset = async () => {
    const expectedConfirm = `RESET ${resetMode}`;
    if (resetConfirmText !== expectedConfirm) {
      alert(`Please type "${expectedConfirm}" to confirm the reset.`);
      return;
    }

    if (resetMode === 'EVENT' && !eventCheckboxConfirmed) {
      alert('Please check the confirmation box to proceed with the EVENT reset.');
      return;
    }

    if (state.marketState?.status === 'Open') {
      alert('MARKET IS CURRENTLY OPEN. CLOSE THE MARKET BEFORE MASTER RESET.');
      return;
    }

    try {
      const res = await apiFetch('/api/admin/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword 
        },
        body: JSON.stringify({
          mode: resetMode,
          confirmText: resetConfirmText,
          activeTeamCount: Number(activeTeamCount)
        })
      });

      const data = await res.json();

      if (res.ok) {
        setResetConfirmText('');
        setEventCheckboxConfirmed(false);
        alert(`Master Reset Successful!\nSession ID: ${data.report.sessionId}\nReady for ${resetMode === 'TEST' ? 'test run' : 'event'}.`);
      } else {
        alert('Reset failed: ' + (data.error || 'Unknown error'));
      }
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
          <title>SAAMX Securities Directory</title>
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
              <h1>SAAMX Securities Directory</h1>
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
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          settings: {
            startingCapitalRetail: Number(startingRetail)
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
      const res = await apiFetch('/api/securities', {
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
      const res = await apiFetch('/api/teams', {
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
        await apiFetch('/api/transactions/void', {
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
      const res = await apiFetch(`/api/securities/${overrideSecId}`, {
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
      const res = await apiFetch('/api/admin/velocity-control', {
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
      const res = await apiFetch('/api/admin/global-control', {
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
      const res = await apiFetch('/api/admin/phoenix-act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ actNumber: Number(actNum) })
      });
      if (res.ok) {
        alert(`Scenario stage ${actNum} fired successfully!`);
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
      const res = await apiFetch(`/api/securities/${sec.id}`, {
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
      const res = await apiFetch('/api/corporate-action', {
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
      const res = await apiFetch(`/api/securities/${secId}`, {
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
    await apiFetch('/api/news', {
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
    await apiFetch('/api/corporate-action', {
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
    await apiFetch('/api/corporate-action', {
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
    await apiFetch('/api/news', {
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
      const res = await apiFetch('/api/admin/ai-chat', {
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
      Object.entries(t.holdings || {}).forEach(([secId, qty]) => {
        const sec = state.securities.find(s => s.id === secId || s.ticker === secId);
        if (sec && qty > 0) {
          exposureMap[sec.id].unitsHeld += qty;
          exposureMap[sec.id].distinctTeams.add(t.id);
          exposureMap[sec.id].totalCapital += qty * sec.currentPrice;
        }
      });
    });
    return Object.values(exposureMap).sort((a, b) => b.totalCapital - a.totalCapital);
  };

  const exposureList = calculateExposure();

  // Standings calculation sorted by Portfolio Value
  const standingsList = [...state.teams].map(t => {
    let holdingsValue = 0;
    Object.entries(t.holdings || {}).forEach(([secId, qty]) => {
      const sec = state.securities.find(s => s.id === secId || s.ticker === secId);
      if (sec) holdingsValue += qty * sec.currentPrice;
    });
    const totalPort = holdingsValue + t.cashBalance;
    const settings = state.settings || {
      startingCapitalRetail: 1000000,
      startingCapitalMutualFund: 1000000,
      startingCapitalHedgeFund: 1000000
    };
    const initial = t.teamType === 'HedgeFund' ? (settings.startingCapitalHedgeFund || 1000000) : t.teamType === 'MutualFund' ? (settings.startingCapitalMutualFund || 1000000) : (settings.startingCapitalRetail || 1000000);
    const roi = ((totalPort - initial) / initial) * 100;
    return { ...t, portfolioValue: totalPort, roi };
  }).sort((a, b) => b.portfolioValue - a.portfolioValue);

  const dtaiSecurity = state.securities.find(s => s.ticker === 'DTAI') || { currentPrice: 0, status: 'Active' };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: 'calc(100vh - 100px)',
      padding: '12px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* Session ID & Active Teams Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0a0b0d',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontFamily: 'var(--font-mono)',
        border: '1px solid #22252e',
        marginBottom: '4px'
      }}>
        <span>SESSION: <strong style={{ color: '#d4af37' }}>{state.marketState?.sessionId || 'NOT INITIALIZED'}</strong></span>
        <span>PARTICIPANTS: <strong style={{ color: '#d4af37' }}>{state.marketState?.activeTeamCount || 10} ACTIVE TEAMS</strong></span>
        <span>MARKET STATUS: <strong style={{ color: state.marketState?.status === 'Open' ? '#22c55e' : '#ef4444' }}>{state.marketState?.status?.toUpperCase() || 'CLOSED'}</strong></span>
      </div>

      {/* Horizontal Six-Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'warroom' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'warroom' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('warroom')}>
          🎯 WAR ROOM
        </button>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'securities' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'securities' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('securities')}>
          📈 SECURITIES
        </button>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'teams' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'teams' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('teams')}>
          👥 TEAMS
        </button>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'ledger' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'ledger' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('ledger')}>
          📋 LEDGER
        </button>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'settings' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'settings' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('settings')}>
          ⚙️ SETTINGS
        </button>
        <button className="btn" style={{ fontWeight: 'bold', backgroundColor: activeTab === 'corporate' ? 'var(--color-brass-light)' : 'transparent', color: activeTab === 'corporate' ? 'var(--color-brass)' : 'var(--color-ink)' }} onClick={() => setActiveTab('corporate')}>
          🏛️ CORP ACTIONS
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={handleSeedData}>Quick Seed</button>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={handlePrintDirectory}>Print Directory</button>
          <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '4px 10px', fontSize: '0.85rem' }} onClick={handleReset}>Reset DB</button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        
        {/* Tab 1: War Room */}
        {activeTab === 'warroom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            
            {/* Top Row: Three Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '16px', flex: 1, minHeight: 0 }}>
              
              {/* Left Panel: EMERGENCY CONTROLS & VELOCITY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', padding: '16px' }} className="glass card">
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  🚨 EMERGENCY CONTROLS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn" style={{ backgroundColor: 'var(--color-rise)', color: '#fff', fontSize: '0.85rem', padding: '8px', fontWeight: 'bold' }} onClick={() => handleGlobalControl('BULL_RUN')}>
                    📈 GLOBAL BULL RUN (+2)
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--color-fall)', color: '#fff', fontSize: '0.85rem', padding: '8px', fontWeight: 'bold' }} onClick={() => handleGlobalControl('CRASH')}>
                    📉 SYSTEMIC CRASH (-2)
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px' }} onClick={() => handleGlobalControl('RESET_SENTIMENT')}>
                    🔄 Reset Sentiment to Neutral
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--color-brass)', color: '#fff', fontSize: '0.85rem', padding: '8px', fontWeight: 'bold' }} onClick={() => handleGlobalControl('FREEZE_ALL')}>
                    ⏸ FREEZE ALL TRADING
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px', fontWeight: 'bold' }} onClick={() => handleGlobalControl('RESUME_ALL')}>
                    ▶ RESUME ALL TRADING
                  </button>
                </div>

                <h3 style={{ margin: '12px 0 0 0', fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  ⚡ VELOCITY CONTROL
                </h3>
                <form onSubmit={handleVelocityControl} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Asset</label>
                    <select className="input-field" style={{ padding: '6px' }} value={velocitySecId} onChange={e => setVelocitySecId(e.target.value)}>
                      <option value="">Select Asset...</option>
                      {state.securities.map(s => <option key={s.id} value={s.id}>{s.ticker}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem' }}>Target (₹)</label>
                      <input type="number" className="input-field font-data" style={{ padding: '6px' }} value={velocityTarget} onChange={e => setVelocityTarget(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem' }}>Duration</label>
                      <select className="input-field" style={{ padding: '6px' }} value={velocityDuration} onChange={e => setVelocityDuration(e.target.value)}>
                        <option value="30">FAST (30s)</option>
                        <option value="120">MED (2 min)</option>
                        <option value="300">SLOW (5 min)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn" style={{ flex: 1, backgroundColor: 'var(--color-brass)', color: '#fff', padding: '6px', fontWeight: 'bold' }}>▶ Start</button>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '6px', fontWeight: 'bold' }}
                      onClick={async () => {
                        if (!velocitySecId) {
                          alert('Please select a security to stop velocity control.');
                          return;
                        }
                        try {
                          await apiFetch('/api/price-override', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-fms-password': adminPassword },
                            body: JSON.stringify({ securityId: velocitySecId, type: 'StopVelocity' })
                          });
                          alert(`Velocity control halted for ${velocitySecId}`);
                        } catch (e) { alert(e.message); }
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </form>
              </div>

              {/* Middle Panel: DTAI SCENARIO STAGES & LIVE STANDINGS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', padding: '16px' }} className="glass card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1rem' }}>
                    🎯 DTAI (Scenario Interventions)
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: dtaiSecurity.status === 'Active' ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                    {dtaiSecurity.status} | ₹{Number(dtaiSecurity.currentPrice).toFixed(2)}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button className="btn" style={{ backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)', padding: '6px', fontSize: '0.75rem', fontWeight: 'bold' }} onClick={() => handleTargetInstantPrice('DTAI', 15)}>
                    ▲ Pump (+15%)
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)', padding: '6px', fontSize: '0.75rem', fontWeight: 'bold' }} onClick={() => handleTargetInstantPrice('DTAI', -15)}>
                    ▼ Dump (-15%)
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem' }} onClick={() => handleTargetHalt('DTAI', dtaiSecurity.status === 'Halted' ? 'UNHALT' : 'CircuitBreaker')}>
                    {dtaiSecurity.status === 'Halted' ? '▶ Unhalt' : '⏸ Halt'}
                  </button>
                  <button className="btn" style={{ backgroundColor: '#000', color: '#fff', padding: '6px', fontSize: '0.75rem', fontWeight: 'bold' }} onClick={() => handleTargetHalt('DTAI', 'Bankruptcy')}>
                    💀 Insolvency
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Schedule Acts Board</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select className="input-field" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }} value={selectedPhoenixAct} onChange={e => setSelectedPhoenixAct(e.target.value)}>
                      {PROJECT_PHOENIX_ACTS.map((act) => {
                        const fired = state.firedPhoenixActs && state.firedPhoenixActs[act.actNumber];
                        return (
                          <option key={act.id} value={act.actNumber} disabled={fired}>
                            T+{String(act.triggerMinute).padStart(2, '0')}m — {act.label} {fired ? '✓' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.8rem', fontWeight: 'bold' }} onClick={() => handlePhoenixAct(selectedPhoenixAct)}>
                      ⚡ FIRE
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '4px 0', fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '0.95rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                    🏆 Live Standings
                  </h3>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="fms-table" style={{ marginTop: 0, fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Code</th>
                          <th>ROI%</th>
                          <th style={{ textAlign: 'right' }}>Capital Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standingsList.map((t, idx) => (
                          <tr key={t.id}>
                            <td>{idx + 1}</td>
                            <td className="font-data" style={{ fontWeight: 700 }}>
                              {t.teamCode}
                            </td>
                            <td className={`font-data ${t.roi >= 0 ? 'text-up' : 'text-down'}`} style={{ fontWeight: 700 }}>
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
              </div>

              {/* Right Panel: AI ASSISTANT CHAT */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 }} className="glass card">
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(232, 230, 223, 0.02)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5cb85c' }}></div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                    🤖 AI War Assistant
                  </h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiHistory.map((h, i) => (
                    <div 
                      key={i} 
                      style={{
                        alignSelf: h.sender === 'Admin' ? 'flex-end' : 'flex-start',
                        backgroundColor: h.sender === 'Admin' ? 'var(--color-brass-light)' : '#fdfcf9',
                        color: 'var(--color-ink)',
                        border: h.sender === 'Admin' ? '1px solid var(--color-brass-light)' : '1px solid var(--color-border)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        maxWidth: '85%',
                        fontSize: '0.75rem',
                        lineHeight: '1.4'
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.6rem', color: 'var(--color-ink-2)', marginBottom: '2px' }}>
                        {h.sender.toUpperCase()}
                      </strong>
                      {h.text}
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ alignSelf: 'flex-start', color: 'var(--color-ink-2)', fontSize: '0.75rem' }}>
                      ⏳ Analyzing command...
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendAIMessage} style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)', backgroundColor: '#faf9f6', display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }} 
                    placeholder="e.g. Pump DTAI to 300"
                    value={aiMessage}
                    onChange={e => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} disabled={aiLoading}>
                    Send
                  </button>
                </form>
              </div>

            </div>

            {/* Bottom Row: Sector Overrides */}
            <div style={{ padding: '12px 16px', flexShrink: 0 }} className="glass card">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Sector Commands:</span>
                <select className="input-field" style={{ width: '160px', padding: '4px' }} id="sectorCommandSelector">
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Energy">Energy</option>
                  <option value="Retail">Retail</option>
                </select>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--color-fall)', color: '#fff' }} onClick={async () => {
                    const secVal = document.getElementById('sectorCommandSelector').value;
                    try {
                      for (const s of state.securities.filter(s => s.sector === secVal)) {
                        await apiFetch('/api/sentiment-override', { method: 'POST', body: { securityId: s.ticker, sentiment: -2 } });
                      }
                      alert(`Set ${secVal} sector to Crash`);
                    } catch (e) { alert(e.message); }
                  }}>🔴 Crash</button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'orange', color: '#fff' }} onClick={async () => {
                    const secVal = document.getElementById('sectorCommandSelector').value;
                    try {
                      for (const s of state.securities.filter(s => s.sector === secVal)) {
                        await apiFetch('/api/sentiment-override', { method: 'POST', body: { securityId: s.ticker, sentiment: -1 } });
                      }
                      alert(`Set ${secVal} sector to Bear`);
                    } catch (e) { alert(e.message); }
                  }}>🟠 Bear</button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }} onClick={async () => {
                    const secVal = document.getElementById('sectorCommandSelector').value;
                    try {
                      for (const s of state.securities.filter(s => s.ticker === secVal)) {
                        await apiFetch('/api/sentiment-override', { method: 'POST', body: { securityId: s.ticker, sentiment: 0 } });
                      }
                      alert(`Reset ${secVal} sector to Neutral`);
                    } catch (e) { alert(e.message); }
                  }}>⚪ Neutral</button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--color-rise)', color: '#fff' }} onClick={async () => {
                    const secVal = document.getElementById('sectorCommandSelector').value;
                    try {
                      for (const s of state.securities.filter(s => s.sector === secVal)) {
                        await apiFetch('/api/sentiment-override', { method: 'POST', body: { securityId: s.ticker, sentiment: 1 } });
                      }
                      alert(`Set ${secVal} sector to Bull`);
                    } catch (e) { alert(e.message); }
                  }}>🟢 Bull</button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#5cb85c', color: '#fff' }} onClick={async () => {
                    const secVal = document.getElementById('sectorCommandSelector').value;
                    try {
                      for (const s of state.securities.filter(s => s.sector === secVal)) {
                        await apiFetch('/api/sentiment-override', { method: 'POST', body: { securityId: s.ticker, sentiment: 2 } });
                      }
                      alert(`Set ${secVal} sector to Rocket`);
                    } catch (e) { alert(e.message); }
                  }}>💚 Rocket</button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Securities CRUD */}
        {activeTab === 'securities' && (
          <div className="glass card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Securities Listing Directory ({state.securities.length} Entries)</h3>
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
                    <th style={{ textAlign: 'right', minWidth: '120px' }}>BASE PRICE</th>
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
                        <td className="font-data" style={{ textAlign: 'right', fontWeight: 700, minWidth: '120px' }}>
                          {editingSecId === s.id ? (
                            <input type="number" className="input-field font-data" style={{ width: '80px', padding: '2px 4px', fontSize: '0.85rem' }} value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                          ) : (
                            `₹${Number(s.currentPrice).toLocaleString('en-IN')}`
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
                                    await apiFetch(`/api/securities/${s.id}`, {
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
              
              <button type="submit" className="btn btn-primary">Save Settings Configuration</button>
            </form>

            <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
              <h4 style={{ color: 'var(--color-brass)', fontSize: '1.1rem', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>Automated Intervention Schedulers</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <input 
                  type="checkbox" 
                  id="autoNewsEnabled" 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  checked={adminSettings.autoNewsEnabled || false} 
                  onChange={async (e) => {
                    await apiFetch('/api/admin/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
                      body: JSON.stringify({
                        settings: {
                          ...adminSettings,
                          autoNewsEnabled: e.target.checked
                        }
                      })
                    });
                  }} 
                />
                <div>
                  <label htmlFor="autoNewsEnabled" style={{ fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'block' }}>🤖 Auto-Release News Sequence</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Releases one preset scenario wire news item automatically every 40-50 seconds.</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-border)', paddingTop: '20px' }}>
              <h4 style={{ color: 'var(--color-brass)', fontSize: '1.1rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Rehearsals & Drills</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginBottom: '12px' }}>
                Launch a speed training simulation drill for exchange desk operators.
              </p>
              <a href="#/training" className="btn btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                🎯 Staff Training Drill &rarr;
              </a>
            </div>

            <div style={{ marginTop: '32px', borderTop: '2px solid var(--color-border)', paddingTop: '24px' }}>
              <h4 style={{ color: 'var(--color-fall)', fontSize: '1.25rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                ☢️ Master Reset & Event Initialization Desk
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginBottom: '16px', lineHeight: '1.5' }}>
                Restore the entire SAAMX database to a clean, deterministic starting state. Purges all transaction logs, news flashes, velocities, corporate actions, and re-initializes assets and participant capital.
              </p>

              {state.marketState?.status === 'Open' ? (
                <div style={{
                  backgroundColor: '#FAE0DE',
                  border: '1.5px solid #9B2B25',
                  padding: '16px',
                  borderRadius: '6px',
                  color: '#9B2B25',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  marginBottom: '20px'
                }}>
                  ⚠️ MARKET IS CURRENTLY OPEN. CLOSE THE MARKET FROM THE SEBI COMMAND PANEL BEFORE PERFORMING A MASTER RESET.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--color-surface-2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
                  
                  {/* Mode Selector */}
                  <div className="form-group">
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>RESET MODE</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          flex: 1,
                          fontWeight: 'bold',
                          backgroundColor: resetMode === 'TEST' ? 'var(--color-brass-light)' : 'var(--color-paper)',
                          color: resetMode === 'TEST' ? 'var(--color-brass)' : 'var(--color-ink)',
                          border: resetMode === 'TEST' ? '2.5px solid var(--color-brass)' : '1px solid var(--color-border)',
                          padding: '10px'
                        }}
                        onClick={() => { setResetMode('TEST'); setResetConfirmText(''); }}
                      >
                        🔬 MODE A: TEST RESET
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          flex: 1,
                          fontWeight: 'bold',
                          backgroundColor: resetMode === 'EVENT' ? 'var(--color-fall-light)' : 'var(--color-paper)',
                          color: resetMode === 'EVENT' ? 'var(--color-fall)' : 'var(--color-ink)',
                          border: resetMode === 'EVENT' ? '2.5px solid var(--color-fall)' : '1px solid var(--color-border)',
                          padding: '10px'
                        }}
                        onClick={() => { setResetMode('EVENT'); setResetConfirmText(''); }}
                      >
                        🏛️ MODE B: EVENT RESET
                      </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', marginTop: '6px' }}>
                      {resetMode === 'TEST'
                        ? 'Clears session data and sets a clean test session. Used repeatedly during rehearsal drills.'
                        : 'Generates a clean session ID, backs up previous session data to fms_backups/, clears all history, and prepares for the real event.'}
                    </span>
                  </div>

                  {/* Active Team Count Selector */}
                  <div className="form-group" style={{ maxWidth: '300px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ACTIVE TEAMS: [ {activeTeamCount} ]</label>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      step="1"
                      className="input-field"
                      style={{ padding: 0, height: '10px', cursor: 'pointer' }}
                      value={activeTeamCount}
                      onChange={e => setActiveTeamCount(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', display: 'block', marginTop: '4px' }}>
                      Select the number of teams participating in this simulation (10–20).
                    </span>
                  </div>

                  {/* Confirmation Checkbox for Event Reset */}
                  {resetMode === 'EVENT' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'rgba(239,83,80,0.1)', border: '1px solid var(--color-fall)', borderRadius: '4px' }}>
                      <input
                        type="checkbox"
                        id="event-confirm-check"
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        checked={eventCheckboxConfirmed}
                        onChange={e => setEventCheckboxConfirmed(e.target.checked)}
                      />
                      <label htmlFor="event-confirm-check" style={{ fontSize: '0.8rem', color: 'var(--color-fall)', fontWeight: 'bold', cursor: 'pointer' }}>
                        I confirm that this is the final event reset and all previous data must be backed up and wiped.
                      </label>
                    </div>
                  )}

                  {/* Text Confirmation & Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <input
                        type="text"
                        className="input-field font-data"
                        style={{ borderColor: resetMode === 'EVENT' ? 'var(--color-fall)' : 'var(--color-brass)' }}
                        placeholder={`Type "RESET ${resetMode}" to confirm`}
                        value={resetConfirmText}
                        onChange={e => setResetConfirmText(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        backgroundColor: resetConfirmText === `RESET ${resetMode}` && (resetMode === 'TEST' || eventCheckboxConfirmed)
                          ? (resetMode === 'EVENT' ? 'var(--color-fall)' : 'var(--color-brass)')
                          : 'var(--color-border)',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: resetConfirmText === `RESET ${resetMode}` && (resetMode === 'TEST' || eventCheckboxConfirmed) ? 'pointer' : 'not-allowed',
                        padding: '12px 24px'
                      }}
                      disabled={resetConfirmText !== `RESET ${resetMode}` || (resetMode === 'EVENT' && !eventCheckboxConfirmed)}
                      onClick={handleReset}
                    >
                      ☢️ RUN {resetMode} RESET
                    </button>
                  </div>

                </div>
              )}

              {/* Master Reset Report */}
              {state.lastResetReport && (
                <div className="glass" style={{
                  padding: '20px',
                  borderRadius: '8px',
                  borderTop: '5px solid var(--color-rise)',
                  backgroundColor: 'var(--color-paper)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-rise)' }}>SAAMX MASTER RESET REPORT</strong>
                    <span style={{ backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {state.lastResetReport.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    <div>SESSION ID: <strong style={{ color: 'var(--color-brass)' }}>{state.lastResetReport.sessionId}</strong></div>
                    <div>ACTIVE TEAMS: <strong>{state.lastResetReport.activeTeamCount} / {state.lastResetReport.teamsCount}</strong></div>
                    <div>SECURITIES UNIVERSE: <strong>{state.lastResetReport.securitiesCount}</strong></div>
                    <div>TRANSACTIONS PURGED: <strong>{state.lastResetReport.transactionsCleared}</strong></div>
                    <div>NEWS EVENTS CLEARED: <strong>{state.lastResetReport.newsCleared}</strong></div>
                    <div>BANKRUPTCIES RESET: <strong>{state.lastResetReport.bankruptciesReset}</strong></div>
                    <div>PRICE OVERRIDES CLEARED: <strong>{state.lastResetReport.overridesCleared}</strong></div>
                    <div>STARTING CAPITAL: <strong>₹{state.lastResetReport.startingCapital?.toLocaleString('en-IN')}</strong></div>
                    <div>MARKET STATUS: <strong>{state.lastResetReport.marketState}</strong></div>
                    <div>TIMESTAMP: <strong>{new Date(state.lastResetReport.timestamp).toLocaleString()}</strong></div>
                  </div>
                  <div style={{
                    marginTop: '16px',
                    padding: '10px',
                    backgroundColor: 'var(--color-rise-light)',
                    color: 'var(--color-rise)',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    ✓ READY FOR {state.lastResetReport.sessionId?.includes('EVENT') ? 'EVENT DAY' : 'TEST RUN'}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === 'corporate' && (
          <div className="glass card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '8px' }}>
              📢 Corporate Action Dispatch Desk
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginTop: '-8px' }}>
              Announce stock splits, bonus share issues, dividends, or execute circuit breakers on active securities. All changes will replicate instantly to the ledger, participant portfolios, and projector screens.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              <div className="form-group">
                <label style={{ fontWeight: '600' }}>Select Target Security</label>
                <select 
                  className="input-field font-data"
                  value={corpSecId}
                  onChange={e => setCorpSecId(e.target.value)}
                >
                  <option value="">-- Choose Security --</option>
                  {(state.securities || []).map(sec => (
                    <option key={sec.id} value={sec.ticker}>
                      {sec.ticker} - {sec.name} (₹{sec.currentPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '600' }}>Action Type</label>
                <select 
                  className="input-field"
                  value={corpActionType}
                  onChange={e => setCorpActionType(e.target.value)}
                >
                  <option value="StockSplit">✂️ Stock Split (2-for-1)</option>
                  <option value="BonusIssue">🎁 Bonus Issue (1-for-1)</option>
                  <option value="Dividend">💰 Dividend Payout (₹ per Share)</option>
                  <option value="CircuitBreaker">🛑 Circuit Breaker (Halt Trading)</option>
                  <option value="UNHALT">▶️ Resume Trading (Unhalt)</option>
                  <option value="Bankruptcy">💀 Insolvency / Bankruptcy (Crash to ₹0)</option>
                  <option value="Delisting">❌ Delist Ticker</option>
                </select>
              </div>

              {corpActionType === 'Dividend' && (
                <div className="form-group">
                  <label style={{ fontWeight: '600' }}>Dividend Amount (₹ per Share)</label>
                  <input 
                    type="number" 
                    className="input-field font-data" 
                    placeholder="e.g. 10" 
                    value={corpDetails} 
                    onChange={e => setCorpDetails(e.target.value)} 
                  />
                </div>
              )}

              <button 
                type="button" 
                className="btn btn-primary"
                onClick={async () => {
                  if (!corpSecId) {
                    alert('Please select a target security first.');
                    return;
                  }
                  try {
                    const res = await apiFetch('/api/corporate-action', {
                      method: 'POST',
                      body: {
                        securityId: corpSecId,
                        actionType: corpActionType,
                        details: corpActionType === 'Dividend' ? corpDetails : ''
                      }
                    });
                    if (res && res.success) {
                      alert(`Successfully executed ${corpActionType} for ${corpSecId}!`);
                      setCorpDetails('');
                    } else {
                      alert('Failed to execute corporate action.');
                    }
                  } catch (err) {
                    alert('Error executing action: ' + err.message);
                  }
                }}
              >
                🚀 Dispatch Corporate Action
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Page-level Chat Assistant removed - now integrated directly inside War Room tab */}

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
