import fs from 'fs';

const reportPath = 'C:/Users/Lapcarts Electronics/.gemini/antigravity-ide/brain/199bc4ee-42c5-46ea-b903-ed989eb94b72/event_report.md';
let content = fs.readFileSync(reportPath, 'utf8').replace(/\r\n/g, '\n');

console.log('Report loaded, length:', content.length);

// Helper to extract text between headers
function getSection(startHeader, endHeader) {
  const parts = content.split(startHeader);
  if (parts.length < 2) return '';
  if (!endHeader) return parts[1];
  return parts[1].split(endHeader)[0];
}

// 1. Parse News Bulletins
// | Dispatch Time | Headline | Sentiment Direction | Target Asset Scope | Impact Factor | Description & Volatility Impact |
const newsText = getSection('## 📢 Broadcasted News Bulletins & Volatility Impact', '## 📈 FMS Securities & Asset Directory');
const newsLines = newsText.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('Dispatch Time') && !l.includes('---'));
const news = newsLines.map((line, idx) => {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 6) return null;
  const headline = parts[1].replace(/\*\*/g, '').trim();
  const sentiment = parts[2].includes('POSITIVE') ? 'POSITIVE' : (parts[2].includes('NEGATIVE') ? 'NEGATIVE' : 'NEUTRAL');
  const scope = parts[3];
  const impactFactor = parseFloat(parts[4].replace('%', '')) || 0;
  const desc = parts[5];
  return {
    id: `N_${String(idx + 1).padStart(3, '0')}`,
    time: parts[0],
    headline,
    sentiment,
    scope,
    impactFactor,
    description: desc,
    timestamp: new Date().toISOString()
  };
}).filter(Boolean);

console.log(`Parsed News Bulletins: ${news.length}`);

// 2. Parse Securities Directory
// | Ticker | Company Name | Sector | Asset Type | Initial Price | Final Price | Total Units | Volatility | Status |
const secText = getSection('## 📈 FMS Securities & Asset Directory', '## 🏆 Final Standings & Team Leaderboard');
const secLines = secText.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('Ticker') && !l.includes('---'));
const securities = {};
secLines.forEach(line => {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 9) return;
  const ticker = parts[0].replace(/\*\*/g, '').trim();
  const name = parts[1];
  const sector = parts[2];
  const assetType = parts[3];
  const initialPrice = parseFloat(parts[4].replace(/[₹,]/g, '')) || 0;
  const finalPrice = parseFloat(parts[5].replace(/[₹,]/g, '')) || 0;
  const totalUnits = parseInt(parts[6].replace(/[,]/g, ''), 10) || 0;
  const volatility = parseFloat(parts[7].replace('%', '')) || 0;
  const status = parts[8].includes('Halted') ? 'Halted' : 'Active';

  securities[ticker] = {
    ticker,
    name,
    sector,
    assetType,
    basePrice: initialPrice,
    initialPrice,
    currentPrice: finalPrice,
    openingPrice: initialPrice,
    previousClose: initialPrice,
    dayHigh: Math.max(initialPrice, finalPrice),
    dayLow: Math.min(initialPrice, finalPrice),
    totalUnits,
    availableUnits: totalUnits,
    volatility,
    status,
    currency: 'INR'
  };
});

console.log(`Parsed Securities: ${Object.keys(securities).length}`);

// 3. Parse Final Standings
// | Rank | Code | Team Name | Cash Balance | Holdings Value | Total Net Value | ROI % |
const standingsText = getSection('## 🏆 Final Standings & Team Leaderboard', '## 💼 Detailed Team Portfolio Inventories');
const standingsLines = standingsText.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('Rank') && !l.includes('---'));
const teams = {};
standingsLines.forEach(line => {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 7) return;
  const rank = parseInt(parts[0], 10);
  const code = parts[1];
  const name = parts[2];
  const cash = parseFloat(parts[3].replace(/[₹,]/g, '')) || 0;
  const holdingsVal = parseFloat(parts[4].replace(/[₹,]/g, '')) || 0;
  const netVal = parseFloat(parts[5].replace(/[₹,]/g, '')) || 0;
  const roi = parseFloat(parts[6].replace(/[%+]/g, '')) || 0;

  teams[code] = {
    rank,
    code,
    name,
    teamName: name,
    cashBalance: cash,
    holdingsValue: holdingsVal,
    totalNetValue: netVal,
    netWorth: netVal,
    roi,
    startingCapital: 1000000,
    portfolio: {}
  };
});

console.log(`Parsed Teams: ${Object.keys(teams).length}`);

// 4. Parse Detailed Team Portfolio Inventories
const portfoliosText = getSection('## 💼 Detailed Team Portfolio Inventories', '## 📜 Full Order Transaction Ledger');
const teamBlocks = portfoliosText.split('### #').slice(1);
teamBlocks.forEach(block => {
  const codeMatch = block.match(/\((T\d+)\)/);
  if (!codeMatch) return;
  const code = codeMatch[1];
  const tableLines = block.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('Asset Ticker') && !l.includes('---'));
  
  if (teams[code]) {
    tableLines.forEach(line => {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length < 5) return;
      const ticker = parts[0].replace(/\*\*/g, '').trim();
      const qty = parseInt(parts[2].replace(/,/g, ''), 10) || 0;
      const marketPrice = parseFloat(parts[3].replace(/[₹,]/g, '')) || 0;
      const valuation = parseFloat(parts[4].replace(/[₹,]/g, '')) || 0;

      teams[code].portfolio[ticker] = {
        quantity: qty,
        shares: qty,
        avgBuyPrice: marketPrice,
        currentPrice: marketPrice,
        valuation
      };

      if (securities[ticker]) {
        securities[ticker].availableUnits = Math.max(0, (securities[ticker].availableUnits || securities[ticker].totalUnits) - qty);
      }
    });
  }
});

// 5. Parse Full Order Transaction Ledger
const ledgerText = getSection('## 📜 Full Order Transaction Ledger', null);
const ledgerLines = ledgerText.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('TXID') && !l.includes('---'));
const transactions = ledgerLines.map(line => {
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 10) return null;
  const txId = parts[0];
  const time = parts[1];
  const team = parts[2];
  const ticker = parts[3];
  const action = parts[4].toUpperCase();
  const quantity = parseInt(parts[5].replace(/,/g, ''), 10) || 0;
  const price = parseFloat(parts[6].replace(/[₹,]/g, '')) || 0;
  const totalValue = parseFloat(parts[7].replace(/[₹,]/g, '')) || 0;
  const desk = parts[8];
  const status = parts[9].includes('PROCESSED') ? 'PROCESSED' : 'PENDING';

  return {
    id: txId,
    txId,
    timestamp: time,
    teamId: team,
    teamCode: team,
    teamName: teams[team]?.teamName || team,
    securityId: ticker,
    ticker,
    type: action,
    action,
    quantity,
    price,
    totalValue,
    desk,
    status
  };
}).filter(Boolean);

console.log(`Parsed Transactions: ${transactions.length}`);

console.log('Sample Team T04:', JSON.stringify(teams.T04, null, 2));
console.log('Sample Security DTAI:', JSON.stringify(securities.DTAI, null, 2));
console.log('Sample News #1:', JSON.stringify(news[0], null, 2));
