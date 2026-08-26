import fs from 'fs';

const STATE_PATH = './state.json';
const OUTPUT_PATH = './simulation_report_1hr.md';

const compileReport = () => {
  if (!fs.existsSync(STATE_PATH)) {
    console.error('State file not found.');
    return;
  }

  const raw = fs.readFileSync(STATE_PATH);
  const data = JSON.parse(raw);
  const state = data.state || data;

  const getStartingCapital = (teamType) => {
    switch (teamType) {
      case 'HedgeFund': return state.settings.startingCapitalHedgeFund || 1000000;
      case 'MutualFund': return state.settings.startingCapitalMutualFund || 1000000;
      default: return state.settings.startingCapitalRetail || 1000000;
    }
  };

  // 1. Securities Catalog Breakdown
  const securitiesList = state.securities || [];

  // 2. Broadcasted News Log
  const newsLog = (state.newsEvents || [])
    .filter(n => n.triggeredAt)
    .sort((a, b) => a.triggeredAt - b.triggeredAt);

  // 3. Teams Portfolio Values & Holdings Breakdown
  const teamStandings = state.teams.map(team => {
    const startCapital = getStartingCapital(team.teamType);
    let holdingsValue = 0;
    const holdingsDetail = [];

    Object.entries(team.holdings || {}).forEach(([secId, qty]) => {
      const sec = state.securities.find(s => s.id === secId || s.ticker === secId);
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

  // 4. Full Trade History Log
  const transactions = state.transactions || [];

  // Generate Markdown
  let markdown = `# FMS Live 1-Hour Calibrated Simulation Audit Report

## 📊 Executive Summary
- **Start Time**: ${new Date().toLocaleString()}
- **Duration**: 1 hour
- **Initial Capital Per Team**: ₹10,00,000 (10 Lakhs)
- **Total Trades Executed**: ${transactions.length}
- **Narrative Events Broadcasted**: ${newsLog.length}

---

## 📢 Broadcasted News Bulletins & Volatility Impact
Chronological log of all narrative news events released across the press wire during the simulation.

| Dispatch Time | Headline | Sentiment Direction | Target Asset Scope | Impact Factor | Description & Volatility Impact |
|---------------|----------|---------------------|--------------------|---------------|---------------------------------|
${newsLog.map(n => {
  const timeStr = new Date(n.triggeredAt).toLocaleTimeString();
  const sentimentEmoji = n.sentiment === 'Positive' ? '📈 POSITIVE (Rise)' : n.sentiment === 'Negative' ? '📉 NEGATIVE (Fall)' : '⚖️ NEUTRAL';
  let targetStr = 'Global / Sector';
  if (n.affectedSecurityIds && n.affectedSecurityIds.length > 0) {
    const tickers = n.affectedSecurityIds.map(id => {
      const sec = state.securities.find(s => s.id === id || s.ticker === id);
      return sec ? sec.ticker : id;
    });
    targetStr = `Asset: ${tickers.join(', ')}`;
  } else if (n.affectedSector) {
    targetStr = `Sector: ${n.affectedSector}`;
  }
  return `| ${timeStr} | **${n.headline}** | ${sentimentEmoji} | ${targetStr} | ${n.impactPercent}% | ${n.description} |`;
}).join('\n')}

---

## 📈 FMS Securities & Asset Directory
Below is the directory of all stocks, bonds, and ETFs active on the exchange matching desk, showing base prices (initial values), final prices, volatility levels, and unit capacities.

| Ticker | Company Name | Sector | Asset Type | Initial Price | Final Price | Total Units | Volatility | Status |
|--------|--------------|--------|------------|---------------|-------------|-------------|------------|--------|
${securitiesList.map(s => {
  return `| **${s.ticker}** | ${s.name} | ${s.sector} | ${s.type} | ₹${s.basePrice} | ₹${s.currentPrice} | ${s.totalUnits.toLocaleString()} | ${(s.volatility * 100).toFixed(0)}% | ${s.status === 'Active' ? '🟢 Active' : '🔴 Halted'} |`;
}).join('\n')}

---

## 🏆 Final Standings & Team Leaderboard
Below is the verified standings ledger indicating liquid cash reserves, total held assets value, net portfolio valuation, and the final ROI breakdown for each of the participant teams.

| Rank | Code | Team Name | Cash Balance | Holdings Value | Total Net Value | ROI % |
|------|------|-----------|--------------|----------------|-----------------|-------|
${teamStandings.map((t, idx) => {
  return `| ${idx + 1} | ${t.teamCode} | ${t.teamName} | ₹${t.cashBalance.toLocaleString(undefined, {minimumFractionDigits:2})} | ₹${t.holdingsValue.toLocaleString(undefined, {minimumFractionDigits:2})} | ₹${t.portfolioValue.toLocaleString(undefined, {minimumFractionDigits:2})} | ${t.roi >= 0 ? '+' : ''}${t.roi.toFixed(2)}% |`;
}).join('\n')}

---

## 💼 Detailed Team Portfolio Inventories
Holdings breakdowns for all registered participant desks:

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
A chronological list of all trades executed on the Central Exchange matching desk during the simulation.

| TXID | Timestamp | Team | Asset | Action | Quantity | Price | Total Value | Desk Source | Status |
|------|-----------|------|-------|--------|----------|-------|-------------|-------------|--------|
${transactions.map(tx => {
  const timeStr = new Date(tx.timestamp).toLocaleTimeString();
  const statusStr = tx.voided ? '🔴 VOIDED' : '🟢 PROCESSED';
  return `| ${tx.id} | ${timeStr} | ${tx.teamCode} | ${tx.ticker} | ${tx.action} | ${tx.quantity} | ₹${tx.priceAtExecution} | ₹${tx.totalValue.toLocaleString()} | ${tx.enteredBy} | ${statusStr} |`;
}).join('\n')}
`;

  fs.writeFileSync(OUTPUT_PATH, markdown);
  console.log(`Consolidated report successfully saved to: ${OUTPUT_PATH}`);
};

compileReport();
