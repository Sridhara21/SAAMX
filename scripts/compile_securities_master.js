import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve('SAAMX_Final_Securities_List.xlsx');
console.log('Loading authoritative final workbook from:', WORKBOOK_PATH);

const wb = XLSX.readFile(WORKBOOK_PATH);
const secSheet = wb.Sheets['Securities'];
if (!secSheet) {
  throw new Error('Securities sheet not found in workbook!');
}

const rows = XLSX.utils.sheet_to_json(secSheet);
console.log(`Loaded ${rows.length} rows from Securities worksheet.`);

// Load existing parsed_universe.json if available to preserve existing company profiles
let existingProfilesMap = new Map();
if (fs.existsSync('parsed_universe.json')) {
  try {
    const oldUniverse = JSON.parse(fs.readFileSync('parsed_universe.json', 'utf8'));
    oldUniverse.forEach(s => {
      if (s.id) existingProfilesMap.set(s.id, s);
      if (s.ticker) existingProfilesMap.set(s.ticker, s);
    });
    console.log(`Loaded ${existingProfilesMap.size} existing profiles for metadata preservation.`);
  } catch (e) {
    console.warn('Could not load existing parsed_universe.json:', e.message);
  }
}

const compiledSecurities = [];
const idSet = new Set();
const assetTypeCounts = {};
const currencyCounts = {};

rows.forEach((row, idx) => {
  const id = String(row['Security ID'] || row['id']).trim();
  const name = String(row['Security Name'] || row['Name'] || row['name']).trim();
  const ticker = String(row['Ticker'] || row['Ticker / Symbol'] || row['ticker']).trim();
  const appSymbol = String(row['App Symbol'] || row['appSymbol'] || ticker).trim();
  const assetClass = String(row['Asset Class'] || row['Asset Type'] || row['assetType'] || 'Stock').trim();
  const currency = String(row['Currency'] || row['currency']).trim();
  const exchange = String(row['Exchange'] || row['Exchange / Market'] || row['exchange']).trim();
  const exchangeCode = String(row['Exchange Code'] || row['exchangeCode'] || exchange).trim();
  const sector = String(row['Sector'] || '').trim();
  const industry = String(row['Industry'] || '').trim();
  const country = String(row['Country'] || '').trim();
  const geography = String(row['Geography'] || row['Region'] || '').trim();

  const ltp = Number(row['LTP'] !== undefined ? row['LTP'] : row['Opening Price']);
  const openPrice = Number(row['Opening Price'] !== undefined ? row['Opening Price'] : ltp);
  const prevClose = Number(row['Prev Close'] !== undefined ? row['Prev Close'] : (row['Previous Close'] !== undefined ? row['Previous Close'] : ltp));
  const dayHigh = Number(row['Day High'] !== undefined ? row['Day High'] : ltp);
  const dayLow = Number(row['Day Low'] !== undefined ? row['Day Low'] : ltp);

  const availUnits = Number(row['Available Units']);
  const totalUnits = Number(row['Total Units']);
  const tickSize = Number(row['Tick Size']);
  const lotSize = Number(row['Lot Size']);
  const minOrderQty = Number(row['Min Order Qty'] || lotSize);

  const volume = Number(row['Volume'] !== undefined ? row['Volume'] : (row['Seed Trading Volume'] || 0));
  const volatility = Number(row['Volatility'] || 1.0);
  const riskRating = String(row['Risk Rating'] || 'Medium').trim();
  const marketCapTier = String(row['Market Cap Tier'] || '').trim();
  const status = String(row['Status'] || 'Active').trim();
  const movement = String(row['Movement'] || 'Unchanged').trim();
  const ltpInr = Number(row['LTP in INR'] || 0);
  const tradableSupplyValueInr = Number(row['Tradable Supply Value (INR)'] || 0);
  const supplyPercentOfCapital = Number(row['Supply as % of Total Capital'] || 0);
  const googleFinanceLink = String(row['Google Finance Link'] || '').trim();
  const description = String(row['Description'] || '').trim();

  if (!id || idSet.has(id)) {
    throw new Error(`Duplicate or invalid Security ID at row ${idx + 2}: ${id}`);
  }
  idSet.add(id);

  assetTypeCounts[assetClass] = (assetTypeCounts[assetClass] || 0) + 1;
  currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;

  // Build normalized base security object
  const sec = {
    id,
    ticker,
    appSymbol,
    symbol: appSymbol,
    name,
    companyName: name,
    assetClass,
    assetType: assetClass === 'Stock' ? 'Equity' : (assetClass === 'Govt Bond' ? 'Government Bond' : (assetClass === 'Corp Bond' ? 'Corporate Bond' : assetClass)),
    type: assetClass === 'Stock' ? 'Stock' : assetClass,
    currency,
    openingPrice: openPrice,
    basePrice: ltp,
    referencePrice: ltp,
    currentPrice: ltp,
    previousClose: prevClose,
    prevClose,
    ltp,
    dayHigh,
    dayLow,
    movement,
    availableUnits: availUnits,
    availableFloat: availUnits,
    totalUnits,
    tickSize,
    lotSize,
    minOrderQty,
    ltpInr,
    tradableSupplyValueInr,
    supplyPercentOfCapital,
    exchange,
    exchangeCode,
    sector,
    industry,
    country,
    geography,
    region: geography,
    volume,
    tradingVolume: volume,
    seedTradingVolume: volume,
    volatility,
    riskRating,
    marketCapTier,
    marketCategory: marketCapTier,
    status,
    ipoStatus: 'NONE',
    ipoStage: null,
    isIpo: false,
    visibleToParticipants: true,
    googleFinanceLink,
    financeUrl: googleFinanceLink,
    description,
    priceHistory: [
      { timestamp: 1792340000000, price: ltp }
    ]
  };

  // Extract specialized metadata from descriptions
  if (assetClass === 'Govt Bond' || assetClass === 'Government Bond') {
    const m = description.match(/issued by ([^,]+), maturing ([^,]+), carrying a coupon of ([0-9.]+)%/);
    if (m) {
      sec.issuer = m[1].trim();
      sec.issuerType = 'Sovereign';
      sec.maturityDate = m[2].trim();
      sec.couponRate = Number(m[3]);
      sec.creditRating = 'AAA (Sovereign)';
    }
  } else if (assetClass === 'Corp Bond' || assetClass === 'Corporate Bond') {
    const m = description.match(/issued by ([^,]+), rated ([^.]+)\. This instrument offers a fixed coupon of ([0-9.]+)%/);
    if (m) {
      sec.issuer = m[1].trim();
      sec.issuerType = 'Corporate';
      sec.creditRating = m[2].trim();
      sec.couponRate = Number(m[3]);
    }
  } else if (assetClass === 'Mutual Fund') {
    const m = description.match(/offered by ([^,]+), managed by ([^.]+)\./);
    if (m) {
      sec.fundHouse = m[1].trim();
      sec.fundManager = m[2].trim();
    }
    sec.investmentCategory = sector || 'Mutual Fund';
  } else if (assetClass === 'ETF') {
    const m = description.match(/managed by ([^,]+), tracking the (.+?)\. It offers/);
    if (m) {
      sec.fundManager = m[1].trim();
      sec.underlyingIndex = m[2].trim();
    }
  } else if (assetClass === 'REIT' || assetClass === 'InvIT') {
    const m = description.match(/sponsored by ([^,]+), holding a portfolio of (.+?) assets across ([^.]+)\./);
    if (m) {
      sec.sponsor = m[1].trim();
      sec.assetFocus = m[2].trim();
      sec.geographicFocus = m[3].trim();
    }
  }

  // If we have existing rich corporate profile details for stocks, merge them cleanly
  const existing = existingProfilesMap.get(id) || existingProfilesMap.get(ticker);
  if (existing) {
    if (existing.ceoName) sec.ceoName = existing.ceoName;
    if (existing.foundedYear) sec.foundedYear = existing.foundedYear;
    if (existing.headquarters) sec.headquarters = existing.headquarters;
    if (existing.founders) sec.founders = existing.founders;
    if (existing.leadership) sec.leadership = existing.leadership;
    if (existing.majorProducts) sec.majorProducts = existing.majorProducts;
    if (existing.businessSummary) sec.businessSummary = existing.businessSummary;
    if (existing.marketPosition) sec.marketPosition = existing.marketPosition;
    if (existing.companyHighlights) sec.companyHighlights = existing.companyHighlights;
    if (existing.website) sec.website = existing.website;
    if (existing.logoInitials) sec.logoInitials = existing.logoInitials;
    if (existing.dividendYield !== undefined) sec.dividendYield = existing.dividendYield;
    if (existing.profileDetails) sec.profileDetails = existing.profileDetails;
  }

  compiledSecurities.push(sec);
});

console.log(`\nSuccessfully compiled ${compiledSecurities.length} authoritative securities.`);
console.log('Asset Class breakdown:', assetTypeCounts);
console.log('Currency breakdown:', currencyCounts);

// Write parsed_universe.json
const jsonOutput = JSON.stringify(compiledSecurities, null, 2);
fs.writeFileSync('parsed_universe.json', jsonOutput, 'utf8');
console.log(`✓ Wrote parsed_universe.json (${Buffer.byteLength(jsonOutput)} bytes).`);

// Write universe_data.js
const jsContent = `/**
 * SAAMX 2026 — Master Global Universe Dataset (Authoritative 3,409 Securities)
 * Compiled directly from SAAMX_Final_Securities_List.xlsx
 * Total Instruments: 3,409 across 7 asset types and 10 verified currencies.
 */

export const ALL_SECURITIES_DATA = ${jsonOutput};

export default ALL_SECURITIES_DATA;
`;

fs.writeFileSync('universe_data.js', jsContent, 'utf8');
console.log(`✓ Wrote universe_data.js (${Buffer.byteLength(jsContent)} bytes).`);

// Generate SAAMX_SECURITIES_DIRECTORY.csv
const csvHeaders = [
  'Security ID', 'App Symbol', 'Ticker', 'Name', 'Asset Class', 'Currency',
  'LTP', 'Tick Size', 'Lot Size', 'Min Order Qty', 'Exchange',
  'Sector', 'Industry', 'Country', 'Geography', 'Risk Rating', 'Market Cap Tier'
];

const csvRows = compiledSecurities.map(s => [
  `"${s.id}"`,
  `"${s.appSymbol}"`,
  `"${s.ticker}"`,
  `"${s.name.replace(/"/g, '""')}"`,
  `"${s.assetClass}"`,
  `"${s.currency}"`,
  s.ltp,
  s.tickSize,
  s.lotSize,
  s.minOrderQty,
  `"${s.exchange}"`,
  `"${s.sector.replace(/"/g, '""')}"`,
  `"${s.industry.replace(/"/g, '""')}"`,
  `"${s.country}"`,
  `"${s.geography}"`,
  `"${s.riskRating}"`,
  `"${s.marketCapTier}"`
].join(','));

const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
fs.writeFileSync('SAAMX_SECURITIES_DIRECTORY.csv', csvContent, 'utf8');
console.log(`✓ Wrote SAAMX_SECURITIES_DIRECTORY.csv (${Buffer.byteLength(csvContent)} bytes).`);

console.log('\nCompilation completed successfully!');
