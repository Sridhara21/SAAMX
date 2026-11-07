import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve('SAAMX_Securities_Universe.xlsx');

console.log('Reading workbook:', WORKBOOK_PATH);
const workbook = XLSX.readFile(WORKBOOK_PATH);

console.log('Sheet Names:', workbook.SheetNames);

// 1. Inspect Summary
if (workbook.SheetNames.includes('Summary')) {
  console.log('\n--- SUMMARY SHEET ---');
  const summarySheet = workbook.Sheets['Summary'];
  const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
  summaryData.slice(0, 45).forEach(row => {
    if (row && row.length > 0 && row.some(cell => cell !== undefined && cell !== '')) {
      console.log(row.join(' | '));
    }
  });
}

// 2. Inspect Tick & Lot Rules
if (workbook.SheetNames.includes('Tick & Lot Rules')) {
  console.log('\n--- TICK & LOT RULES SHEET ---');
  const rulesSheet = workbook.Sheets['Tick & Lot Rules'];
  const rulesData = XLSX.utils.sheet_to_json(rulesSheet, { header: 1 });
  rulesData.forEach(row => {
    if (row && row.length > 0) {
      console.log(row.join(' | '));
    }
  });
}

// 3. Inspect Field Guide
if (workbook.SheetNames.includes('Field Guide')) {
  console.log('\n--- FIELD GUIDE SHEET ---');
  const guideSheet = workbook.Sheets['Field Guide'];
  const guideData = XLSX.utils.sheet_to_json(guideSheet, { header: 1 });
  guideData.forEach(row => {
    if (row && row.length > 0) {
      console.log(row.join(' | '));
    }
  });
}

// 4. Inspect Securities Sheet
const secSheet = workbook.Sheets['Securities'];
if (!secSheet) {
  throw new Error('Securities sheet not found in workbook!');
}

const rawSecurities = XLSX.utils.sheet_to_json(secSheet);
console.log(`\n--- SECURITIES SHEET: ${rawSecurities.length} ROWS LOADED ---`);

if (rawSecurities.length > 0) {
  console.log('Sample column names:', Object.keys(rawSecurities[0]));
}

// Tally counts
const assetTypes = {};
const currencies = {};
const regions = {};
const exchanges = {};
const idSet = new Set();
const duplicateIds = [];
const tickerMap = new Map(); // ticker -> array of { id, exchange, country }

let invalidRows = [];

rawSecurities.forEach((row, idx) => {
  const rowNum = idx + 2;
  const id = row['Security ID'] || row['id'];
  const ticker = row['Ticker / Symbol'] || row['ticker'] || row['Ticker'];
  const name = row['Name'] || row['name'];
  const assetType = row['Asset Type'] || row['type'] || row['assetType'];
  const currency = row['Currency'] || row['currency'];
  const exchange = row['Exchange / Market'] || row['exchange'];
  const region = row['Region'] || row['region'];
  const openPrice = Number(row['Opening Price']);
  const currPrice = Number(row['Current Price'] !== undefined ? row['Current Price'] : openPrice);
  const availUnits = Number(row['Available Units']);
  const totalUnits = Number(row['Total Units']);
  const tickSize = Number(row['Tick Size']);
  const lotSize = Number(row['Lot Size']);
  const minQty = Number(row['Min Order Qty'] || lotSize);
  const dayHigh = Number(row['Day High']);
  const dayLow = Number(row['Day Low']);

  assetTypes[assetType] = (assetTypes[assetType] || 0) + 1;
  currencies[currency] = (currencies[currency] || 0) + 1;
  regions[region] = (regions[region] || 0) + 1;
  exchanges[exchange] = (exchanges[exchange] || 0) + 1;

  if (!id) {
    invalidRows.push({ rowNum, reason: 'Missing Security ID' });
  } else if (idSet.has(id)) {
    duplicateIds.push(id);
  } else {
    idSet.add(id);
  }

  if (ticker) {
    if (!tickerMap.has(ticker)) tickerMap.set(ticker, []);
    tickerMap.get(ticker).push({ id, exchange, name, currency, assetType });
  } else {
    invalidRows.push({ rowNum, id, reason: 'Missing Ticker' });
  }

  if (!name) invalidRows.push({ rowNum, id, reason: 'Missing Name' });
  if (!currency) invalidRows.push({ rowNum, id, reason: 'Missing Currency' });
  if (isNaN(openPrice) || openPrice <= 0) invalidRows.push({ rowNum, id, reason: `Invalid Opening Price: ${openPrice}` });
  if (isNaN(availUnits) || availUnits < 0) invalidRows.push({ rowNum, id, reason: `Invalid Available Units: ${availUnits}` });
  if (isNaN(totalUnits) || totalUnits < availUnits) invalidRows.push({ rowNum, id, reason: `Available units (${availUnits}) exceed total (${totalUnits})` });
});

console.log('\n--- ASSET TYPE DISTRIBUTION ---');
console.table(assetTypes);

console.log('\n--- CURRENCY DISTRIBUTION ---');
console.table(currencies);

console.log('\n--- DUPLICATE ID CHECK ---');
console.log('Total unique IDs:', idSet.size);
console.log('Duplicate IDs count:', duplicateIds.length);
if (duplicateIds.length > 0) {
  console.log('Duplicates sample:', duplicateIds.slice(0, 10));
}

console.log('\n--- REPEATED TICKERS CHECK ---');
const repeatedTickers = Array.from(tickerMap.entries()).filter(([t, list]) => list.length > 1);
console.log(`Found ${repeatedTickers.length} repeated tickers across different exchanges/markets:`);
repeatedTickers.forEach(([t, list]) => {
  console.log(`  Ticker '${t}' (${list.length} occurrences):`, list.map(x => `${x.id} on ${x.exchange} (${x.currency}, ${x.assetType})`).join(' vs '));
});

console.log('\n--- INVALID ROWS CHECK ---');
console.log('Invalid rows count:', invalidRows.length);
if (invalidRows.length > 0) {
  console.log('Sample invalid rows:', invalidRows.slice(0, 10));
}
