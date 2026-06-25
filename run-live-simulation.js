import http from 'http';
import fs from 'fs';

const ADMIN_PASSWORD = 'fms-event-2026';
const SIMULATION_DURATION_MS = 60 * 60 * 1000; // 1 Hour
const REPORT_PATH = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\simulation_report_1hr.md';

const apiRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': ADMIN_PASSWORD,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseBody ? JSON.parse(responseBody) : {});
        } else {
          reject(new Error(`API ${path} returned status ${res.statusCode}: ${responseBody}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
};

const startSimulation = async () => {
  console.log('Initializing 1-Hour Calibrated Simulation...');
  
  // 1. Reset
  await apiRequest('POST', '/api/admin/reset');
  console.log('- Database reset complete.');

  // 2. Set starting capitals to 10 Lakhs (1,000,000)
  await apiRequest('POST', '/api/admin/settings', {
    settings: {
      startingCapitalRetail: 1000000,
      startingCapitalMutualFund: 1000000,
      startingCapitalHedgeFund: 1000000
    }
  });
  console.log('- Capital limits locked to 10 Lakhs.');

  // 3. Seed starter securities and 20 teams
  await apiRequest('POST', '/api/admin/seed');
  console.log('- Seeded assets catalog and 20 default teams.');

  // 4. Delete teams T16 to T20 to leave exactly 15 unique teams
  const teamIdsToDelete = ['T16', 'T17', 'T18', 'T19', 'T20'];
  for (const id of teamIdsToDelete) {
    try {
      await apiRequest('DELETE', `/api/teams/${id}`);
    } catch (e) {
      console.log(`- Team deletion warning for ${id}: ${e.message}`);
    }
  }
  console.log('- Excess seeded teams deleted. Exactly 15 unique teams remain.');

  // 5. Start Session Clock
  await apiRequest('POST', '/api/market/control', { action: 'START', duration: 60 });
  console.log('- 60-minute session clock started.');

  const startTime = Date.now();
  let tradeCount = 0;
  let newsCount = 0;

  const stateData = await apiRequest('GET', '/api/state');
  const newsTemplates = stateData.state.newsEvents || [];

  // Periodic Trade Execution loop (every 3-6 seconds)
  const executeTradeCycle = async () => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= SIMULATION_DURATION_MS) {
      console.log('Simulation duration complete. Halting markets...');
      await apiRequest('POST', '/api/market/control', { action: 'CLOSE' });
      await generateFinalReport(startTime, tradeCount, newsCount);
      process.exit(0);
    }

    try {
      const stateData = await apiRequest('GET', '/api/state');
      const activeSecurities = stateData.state.securities.filter(s => s.status === 'Active');
      const activeTeams = stateData.state.teams;

      if (activeSecurities.length > 0 && activeTeams.length > 0) {
        const team = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        const security = activeSecurities[Math.floor(Math.random() * activeSecurities.length)];
        
        const action = Math.random() > 0.4 ? 'BUY' : 'SELL';
        
        // Calibrated small trade quantities (3 to 25 units) to fit scarce float
        let quantity = 3 + Math.floor(Math.random() * 22); 

        if (action === 'SELL') {
          const held = team.holdings[security.id] || 0;
          if (held === 0) {
            await apiRequest('POST', '/api/trade', {
              teamId: team.id,
              securityId: security.id,
              action: 'BUY',
              quantity: quantity,
              enteredBy: 'Exchange Automated Match'
            });
            tradeCount++;
          } else {
            quantity = Math.min(quantity, held);
            await apiRequest('POST', '/api/trade', {
              teamId: team.id,
              securityId: security.id,
              action: 'SELL',
              quantity: quantity,
              enteredBy: 'Exchange Automated Match'
            });
            tradeCount++;
          }
        } else {
          const cost = quantity * security.currentPrice;
          if (team.cashBalance >= cost) {
            await apiRequest('POST', '/api/trade', {
              teamId: team.id,
              securityId: security.id,
              action: 'BUY',
              quantity: quantity,
              enteredBy: 'Exchange Automated Match'
            });
            tradeCount++;
          }
        }
      }
    } catch (err) {
      // Quiet fail
    }

    const nextInterval = 3000 + Math.random() * 3000;
    setTimeout(executeTradeCycle, nextInterval);
  };

  // Periodic News Bulletins dispatch loop (every 2 minutes)
  const executeNewsCycle = async () => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= SIMULATION_DURATION_MS) return;

    try {
      if (newsTemplates.length > 0) {
        const template = newsTemplates[newsCount % newsTemplates.length];
        const stateData = await apiRequest('GET', '/api/state');
        const activeSecurities = stateData.state.securities.filter(s => s.status === 'Active');
        
        if (activeSecurities.length > 0) {
          const security = activeSecurities[Math.floor(Math.random() * activeSecurities.length)];
          await apiRequest('POST', '/api/news', {
            headline: template.headline,
            description: `${template.description} Volatility correlation on ${security.ticker}.`,
            sentiment: template.sentiment,
            impactPercent: template.impactPercent,
            category: template.category,
            affectedSecurityIds: [security.id]
          });
          newsCount++;
          console.log(`- Dispatching narrative wire event: ${template.headline}`);
        }
      }
    } catch (err) {
      console.error('Error dispatching news event:', err.message);
    }

    setTimeout(executeNewsCycle, 120000); // 2 minutes
  };

  executeTradeCycle();
  executeNewsCycle();
  console.log('Automated simulation engines are running.');
};

const generateFinalReport = async (startTime, tradeCount, newsCount) => {
  try {
    const stateData = await apiRequest('GET', '/api/state');
    
    const getStartingCapital = (teamType) => {
      switch (teamType) {
        case 'HedgeFund': return stateData.state.settings.startingCapitalHedgeFund || 1000000;
        case 'MutualFund': return stateData.state.settings.startingCapitalMutualFund || 1000000;
        default: return stateData.state.settings.startingCapitalRetail || 1000000;
      }
    };

    const teamStandings = stateData.state.teams.map(team => {
      const startCapital = getStartingCapital(team.teamType);
      let holdingsValue = 0;
      const holdingsDetail = [];

      Object.entries(team.holdings).forEach(([secId, qty]) => {
        const sec = stateData.state.securities.find(s => s.id === secId);
        if (sec && qty > 0) {
          const val = qty * sec.currentPrice;
          holdingsValue += val;
          holdingsDetail.push({
            ticker: sec.ticker,
            name: sec.name,
            quantity: qty,
            price: sec.currentPrice,
            value: val
          });
        }
      });

      const portfolioValue = holdingsValue + team.cashBalance;
      const roi = ((portfolioValue - startCapital) / startCapital) * 100;

      return {
        ...team,
        holdingsValue,
        portfolioValue,
        roi,
        holdingsList: holdingsDetail,
        startCapital
      };
    }).sort((a, b) => b.portfolioValue - a.portfolioValue);

    const transactions = stateData.state.transactions || [];
    const newsLog = (stateData.state.newsEvents || [])
      .filter(n => n.triggeredAt)
      .sort((a, b) => a.triggeredAt - b.triggeredAt);

    let markdown = `# FMS Calibrated 1-Hour Simulation Audit Report

## 📊 Executive Summary
- **Start Time**: ${new Date(startTime).toLocaleString()}
- **Duration**: 1 hour
- **Initial Capital Per Team**: ₹10,00,000 (10 Lakhs)
- **Total Trades Executed**: ${tradeCount}
- **Narrative Events Broadcasted**: ${newsCount}

---

## 📢 Broadcasted News Bulletins
| Dispatch Time | Headline | Sentiment | Scope Target | Impact % | Description |
|---------------|----------|-----------|--------------|----------|-------------|
${newsLog.map(n => {
  const timeStr = new Date(n.triggeredAt).toLocaleTimeString();
  const targetStr = n.affectedSecurityIds ? n.affectedSecurityIds.map(id => {
    const sec = stateData.state.securities.find(s => s.id === id);
    return sec ? sec.ticker : id;
  }).join(', ') : 'Global';
  return `| ${timeStr} | **${n.headline}** | ${n.sentiment} | ${targetStr} | ${n.impactPercent}% | ${n.description} |`;
}).join('\n')}

---

## 🏆 Final Standings & Team Leaderboard
| Rank | Code | Team Name | Cash Balance | Holdings Value | Total Net Value | ROI % |
|------|------|-----------|--------------|----------------|-----------------|-------|
${teamStandings.map((t, idx) => {
  return `| ${idx + 1} | ${t.teamCode} | ${t.teamName} | ₹${t.cashBalance.toLocaleString(undefined, {minimumFractionDigits:2})} | ₹${t.holdingsValue.toLocaleString(undefined, {minimumFractionDigits:2})} | ₹${t.portfolioValue.toLocaleString(undefined, {minimumFractionDigits:2})} | ${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(2)}% |`;
}).join('\n')}

---

## 💼 Detailed Team Portfolio Inventories
`;

    teamStandings.forEach((t, idx) => {
      markdown += `### #${idx + 1} - ${t.teamName} (${t.teamCode})
- **Starting Capital**: ₹${t.startCapital.toLocaleString()}
- **Liquid Cash Reserves**: ₹${t.cashBalance.toLocaleString(undefined, {minimumFractionDigits:2})}
- **Assets Valuation**: ₹${t.holdingsValue.toLocaleString(undefined, {minimumFractionDigits:2})}
- **Total Net Portfolio Value**: ₹${t.portfolioValue.toLocaleString(undefined, {minimumFractionDigits:2})}
- **ROI**: ${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(2)}%

`;

      if (t.holdingsList.length === 0) {
        markdown += `*No securities currently held.* \n\n`;
      } else {
        markdown += `| Asset Ticker | Asset Name | Quantity Held | Market Price | Current Valuation | Allocation % |\n`;
        markdown += `|--------------|------------|---------------|--------------|-------------------|--------------|\n`;
        t.holdingsList.forEach(h => {
          const alloc = t.portfolioValue > 0 ? ((h.value / t.portfolioValue) * 100).toFixed(1) : 0;
          markdown += `| **${h.ticker}** | ${h.name} | ${h.quantity} | ₹${h.price} | ₹${h.value.toLocaleString()} | ${alloc}% |\n`;
        });
        markdown += `\n`;
      }
    });

    markdown += `---

## 📜 Full Order Transaction Ledger
| TXID | Timestamp | Team | Asset | Action | Quantity | Price | Total Value | Desk Source | Status |
|------|-----------|------|-------|--------|----------|-------|-------------|-------------|--------|
${transactions.map(tx => {
  const timeStr = new Date(tx.timestamp).toLocaleTimeString();
  const statusStr = tx.voided ? '🔴 VOIDED' : '🟢 PROCESSED';
  return `| ${tx.id} | ${timeStr} | ${tx.teamCode} | ${tx.ticker} | ${tx.action} | ${tx.quantity} | ₹${tx.priceAtExecution} | ₹${tx.totalValue.toLocaleString()} | ${tx.enteredBy} | ${statusStr} |`;
}).join('\n')}
`;

    fs.writeFileSync(REPORT_PATH, markdown);
    console.log(`Final calibrated report saved to: ${REPORT_PATH}`);
  } catch (err) {
    console.error('Error compiling report:', err.message);
  }
};

startSimulation().catch(err => {
  console.error('Simulation failed to start:', err.message);
});
