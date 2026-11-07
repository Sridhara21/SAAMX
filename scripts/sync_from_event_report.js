import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const reportPath = 'C:\\Users\\Lapcarts Electronics\\.gemini\\antigravity-ide\\brain\\199bc4ee-42c5-46ea-b903-ed989eb94b72\\event_report.md';
const content = fs.readFileSync(reportPath, 'utf8');

console.log('Report loaded, length:', content.length);

function hashPw(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 1. Parse News Bulletins
const newsEvents = [];
const newsSection = content.split('## 📢 Broadcasted News Bulletins & Volatility Impact')[1]?.split('## 📈 FMS Securities & Asset Directory')[0] || '';
const newsRows = newsSection.split('\n');
let newsIdx = 1;
for (const row of newsRows) {
  const parts = row.split('|').map(p => p.trim());
  if (parts.length >= 7 && parts[1] && !parts[1].startsWith('---') && parts[1] !== 'Dispatch Time') {
    const time = parts[1];
    const headline = parts[2].replace(/\*\*/g, '').trim();
    const sentiment = parts[3];
    const targetScope = parts[4];
    const impactFactor = parts[5];
    const description = parts[6];

    const nId = `NEWS_${String(newsIdx++).padStart(3, '0')}`;
    const item = {
      id: nId,
      title: headline,
      headline,
      time,
      timestamp: time,
      sentiment,
      scope: targetScope,
      impact: impactFactor,
      content: description,
      description,
      publishedAt: '2026-08-18 ' + time
    };
    newsEvents.push(item);
  }
}
console.log('Parsed news bulletins count:', newsEvents.length);

// 2. Parse Securities Directory
const securities = [];
const secSection = content.split('## 📈 FMS Securities & Asset Directory')[1]?.split('## 🏆 Final Standings & Team Leaderboard')[0] || '';
const secRows = secSection.split('\n');
for (const row of secRows) {
  const parts = row.split('|').map(p => p.trim());
  if (parts.length >= 10 && parts[1] && !parts[1].startsWith('---') && parts[1] !== 'Ticker') {
    const ticker = parts[1].replace(/\*\*/g, '').trim();
    const companyName = parts[2];
    const sector = parts[3];
    const assetType = parts[4];
    const initialPrice = parseFloat(parts[5].replace(/[₹,]/g, '')) || 0;
    const finalPrice = parseFloat(parts[6].replace(/[₹,]/g, '')) || 0;
    const totalUnits = parseInt(parts[7].replace(/,/g, ''), 10) || 0;
    const volatilityStr = parts[8];
    const status = parts[9];

    const changePct = initialPrice > 0 ? (((finalPrice - initialPrice) / initialPrice) * 100) : 0;

    securities.push({
      id: ticker,
      ticker,
      name: companyName,
      companyName,
      sector,
      assetType,
      type: assetType,
      initialPrice,
      basePrice: initialPrice,
      currentPrice: finalPrice,
      price: finalPrice,
      lastPrice: finalPrice,
      changePct: parseFloat(changePct.toFixed(2)),
      capacity: totalUnits,
      unitCapacity: totalUnits,
      totalUnits,
      volatility: volatilityStr,
      status: status.includes('Active') ? 'Active' : (status.includes('Halted') ? 'Halted' : 'Active'),
      currency: ticker.endsWith('.US') || ['AAPL', 'AMZN', 'BRKB', 'GOOGL', 'JPM', 'MSFT', 'NVDA', 'TSLA', 'VISA'].includes(ticker) ? 'USD' : 'INR'
    });
  }
}
console.log('Parsed securities count:', securities.length);

// 3. Parse Team Leaderboard
const teams = [];
const teamsMap = {};
const leadSection = content.split('## 🏆 Final Standings & Team Leaderboard')[1]?.split('## 💼 Detailed Team Portfolio Inventories')[0] || '';
const leadRows = leadSection.split('\n');
for (const row of leadRows) {
  const parts = row.split('|').map(p => p.trim());
  if (parts.length >= 8 && parts[1] && !parts[1].startsWith('---') && parts[1] !== 'Rank') {
    const rank = parseInt(parts[1], 10);
    const teamCode = parts[2];
    const teamName = parts[3];
    const cashBalance = parseFloat(parts[4].replace(/[₹,]/g, '')) || 0;
    const holdingsValue = parseFloat(parts[5].replace(/[₹,]/g, '')) || 0;
    const totalNetValue = parseFloat(parts[6].replace(/[₹,]/g, '')) || 0;
    const roiPct = parseFloat(parts[7].replace(/[+%\s]/g, '')) || 0;

    const teamNum = parseInt(teamCode.replace(/\D/g, ''), 10) || 1;
    const defaultPw = `saamx-team-${String(teamNum).padStart(2, '0')}`;

    const teamObj = {
      id: teamCode,
      code: teamCode,
      teamCode,
      name: teamName,
      teamName,
      houseName: teamName,
      teamType: 'Retail',
      isActive: true,
      startingCapital: 1000000,
      cashBalance,
      cashWallets: { INR: cashBalance, USD: 0, GBP: 0, EUR: 0 },
      holdingsValue,
      totalNetValue,
      portfolioValue: totalNetValue,
      netWorth: totalNetValue,
      roi: roiPct,
      roiPct,
      rank,
      passwordHash: hashPw(defaultPw),
      plainPassword: defaultPw,
      holdings: {},
      portfolio: {}
    };

    teams.push(teamObj);
    teamsMap[teamCode] = teamObj;
  }
}
console.log('Parsed teams leaderboard count:', teams.length);

// 4. Parse Team Portfolio Inventories
const inventorySection = content.split('## 💼 Detailed Team Portfolio Inventories')[1]?.split('## 📜 Full Order Transaction Ledger')[0] || '';
const teamBlocks = inventorySection.split('### #');
for (let i = 1; i < teamBlocks.length; i++) {
  const block = teamBlocks[i];
  const headerMatch = block.match(/^\d+\s*-\s*[^(]+\((T\d+)\)/);
  if (!headerMatch) continue;
  const teamCode = headerMatch[1];
  if (!teamsMap[teamCode]) continue;

  const lines = block.split('\n');
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 7 && parts[1] && !parts[1].startsWith('---') && parts[1] !== 'Asset Ticker') {
      const ticker = parts[1].replace(/\*\*/g, '').trim();
      const assetName = parts[2];
      const qty = parseInt(parts[3].replace(/,/g, ''), 10) || 0;
      const mktPrice = parseFloat(parts[4].replace(/[₹,]/g, '')) || 0;
      const curVal = parseFloat(parts[5].replace(/[₹,]/g, '')) || 0;

      teamsMap[teamCode].holdings[ticker] = qty;
      teamsMap[teamCode].portfolio[ticker] = {
        ticker,
        assetName,
        quantity: qty,
        shares: qty,
        currentPrice: mktPrice,
        valuation: curVal,
        averagePrice: mktPrice
      };
    }
  }
}
console.log('Parsed holdings for teams. Sample T04 holdings:', teamsMap['T04']?.holdings);
console.log('Sample T08 holdings count:', Object.keys(teamsMap['T08']?.holdings || {}).length);
console.log('Sample T10 holdings count:', Object.keys(teamsMap['T10']?.holdings || {}).length);

// 5. Parse Transactions Ledger
const transactions = [];
const txSection = content.split('## 📜 Full Order Transaction Ledger')[1] || '';
const txRows = txSection.split('\n');
for (const row of txRows) {
  const parts = row.split('|').map(p => p.trim());
  if (parts.length >= 11 && parts[1] && !parts[1].startsWith('---') && parts[1] !== 'TXID') {
    const txId = parts[1];
    const timestamp = parts[2];
    const teamCode = parts[3];
    const assetTicker = parts[4];
    const action = parts[5];
    const qty = parseInt(parts[6].replace(/,/g, ''), 10) || 0;
    const price = parseFloat(parts[7].replace(/[₹,]/g, '')) || 0;
    const totalVal = parseFloat(parts[8].replace(/[₹,]/g, '')) || 0;
    const deskSource = parts[9];
    const status = parts[10];

    transactions.push({
      id: txId,
      txId,
      timestamp,
      time: timestamp,
      teamId: teamCode,
      teamCode,
      type: action,
      action,
      ticker: assetTicker,
      asset: assetTicker,
      quantity: qty,
      qty,
      price,
      total: totalVal,
      totalValue: totalVal,
      deskSource,
      status: 'PROCESSED'
    });
  }
}
console.log('Parsed transactions count:', transactions.length);

// 6. Build the Complete Calibrated State conforming to server.js schema
const calibratedState = {
  securities,
  teams,
  transactions,
  orders: [],
  newsEvents,
  news: newsEvents,
  corporateActions: [],
  auditLog: [],
  advisorReferrals: [],
  events: [
    {
      eventId: 'EVT_LIVE_MAIN',
      eventName: 'SAAMX Annual Inter-School Asset Market Championship',
      eventDate: '2026-10-15',
      venue: 'Main Trading Auditorium',
      registrationOpen: true,
      registrationClose: '2026-10-15T09:00:00Z',
      maximumInvestmentHouses: 40,
      teamSize: 4,
      startingCapital: 1000000,
      marketOpenTime: '09:30',
      marketCloseTime: '15:30',
      lunchBreak: '12:00 - 13:00',
      resultsTime: '16:00',
      eventStatus: 'MARKET_ACTIVE',
      eventMode: 'LIVE',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  currentEventId: 'EVT_LIVE_MAIN',
  schools: [],
  investmentHouses: [],
  registrations: [],
  eventSnapshots: [],
  eventClosingSnapshots: {},
  judgeScorecards: [],
  penalties: [],
  resultsLifecycle: 'PUBLISHED',
  reconciliationRecords: [],
  intelligenceFeed: [],
  marketState: {
    status: 'Open',
    sessionState: 'AFTERNOON_SESSION',
    activeSession: 'AFTERNOON',
    isLive: true,
    startTime: '18/8/2026, 8:38:00 pm',
    duration: '1 hour',
    totalTrades: transactions.length,
    tradesCount: transactions.length,
    newsCount: newsEvents.length,
    activeTeamCount: teams.length,
    marketStatus: 'Open',
    autonomousEnabled: true,
    simulationDurationMinutes: 60
  },
  settings: {
    startingCapitalRetail: 1000000,
    startingCapitalInstitutional: 1000000,
    maxTeams: 20,
    marketName: 'SAAMX Floor Simulation',
    currency: 'INR'
  },
  leaderboard: teams,
  publishedResults: {
    publishedAt: '2026-08-18T21:38:00.000Z',
    leaderboard: teams,
    topThree: teams.slice(0, 3),
    totalTrades: transactions.length,
    totalTurnoverINR: transactions.reduce((acc, t) => acc + t.total, 0)
  },
  fxRates: {
    INR: 1,
    USDINR: { midRate: 83.5, buyRate: 83.0, sellRate: 84.0 },
    GBPINR: { midRate: 105.0, buyRate: 104.0, sellRate: 106.0 },
    EURINR: { midRate: 90.0, buyRate: 89.0, sellRate: 91.0 }
  }
};

fs.writeFileSync('state.json', JSON.stringify(calibratedState, null, 2), 'utf8');
console.log('Successfully saved array-conforming state to state.json!');
