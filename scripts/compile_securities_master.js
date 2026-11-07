import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve('SAAMX_Securities_Universe.xlsx');
console.log('Loading workbook from:', WORKBOOK_PATH);

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
  const name = String(row['Name'] || row['name']).trim();
  const ticker = String(row['Ticker / Symbol'] || row['ticker'] || row['Ticker']).trim();
  const assetType = String(row['Asset Type'] || row['type'] || row['assetType']).trim();
  const currency = String(row['Currency'] || row['currency']).trim();
  const exchange = String(row['Exchange / Market'] || row['exchange']).trim();
  const sector = String(row['Sector'] || '').trim();
  const industry = String(row['Industry'] || '').trim();
  const country = String(row['Country'] || '').trim();
  const region = String(row['Region'] || '').trim();

  const openPrice = Number(row['Opening Price']);
  const currPrice = Number(row['Current Price'] !== undefined ? row['Current Price'] : openPrice);
  const prevClose = Number(row['Previous Close'] !== undefined ? row['Previous Close'] : openPrice);
  const dayHigh = Number(row['Day High'] !== undefined ? row['Day High'] : openPrice);
  const dayLow = Number(row['Day Low'] !== undefined ? row['Day Low'] : openPrice);

  const availUnits = Number(row['Available Units']);
  const totalUnits = Number(row['Total Units']);
  const tickSize = Number(row['Tick Size']);
  const lotSize = Number(row['Lot Size']);
  const minOrderQty = Number(row['Min Order Qty'] || lotSize);

  const seedTradingVolume = Number(row['Seed Trading Volume'] || 0);
  const volatility = Number(row['Volatility'] || 1.0);
  const riskRating = String(row['Risk Rating'] || 'Medium').trim();
  const marketCapTier = String(row['Market Cap Tier'] || '').trim();
  const status = String(row['Status'] || 'Active').trim();
  const ipoStatus = String(row['IPO Status'] || 'NONE').trim();
  const googleFinanceLink = String(row['Google Finance Link'] || '').trim();
  const description = String(row['Description'] || '').trim();

  if (!id || idSet.has(id)) {
    throw new Error(`Duplicate or invalid Security ID at row ${idx + 2}: ${id}`);
  }
  idSet.add(id);

  assetTypeCounts[assetType] = (assetTypeCounts[assetType] || 0) + 1;
  currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;

  // Build normalized base security object
  const sec = {
    id,
    ticker,
    name,
    assetType,
    type: assetType, // Universal type property
    currency,
    openingPrice: openPrice,
    basePrice: openPrice,
    referencePrice: openPrice,
    currentPrice: currPrice,
    previousClose: prevClose,
    dayHigh,
    dayLow,
    availableUnits: availUnits,
    availableFloat: availUnits,
    totalUnits,
    tickSize,
    lotSize,
    minOrderQty,
    exchange,
    sector,
    industry,
    country,
    region,
    tradingVolume: seedTradingVolume,
    seedTradingVolume,
    volatility,
    riskRating,
    marketCapTier,
    marketCategory: marketCapTier,
    status,
    ipoStatus,
    googleFinanceLink,
    financeUrl: googleFinanceLink,
    description,
    priceHistory: [
      { timestamp: 1792340000000, price: currPrice }
    ]
  };

  // Derive standardized assetClass
  if (assetType === 'Equity') {
    sec.assetClass = 'Equity';
  } else if (assetType === 'ETF') {
    sec.assetClass = 'ETF';
  } else if (assetType === 'Mutual Fund') {
    sec.assetClass = 'Mutual Fund';
  } else if (assetType.includes('Bond')) {
    sec.assetClass = 'Bond';
  } else if (assetType === 'REIT') {
    sec.assetClass = 'REIT';
  } else if (assetType === 'InvIT') {
    sec.assetClass = 'InvIT';
  } else {
    sec.assetClass = assetType;
  }

  // Extract specialized metadata from descriptions
  if (assetType === 'Government Bond') {
    const m = description.match(/issued by ([^,]+), maturing ([^,]+), carrying a coupon of ([0-9.]+)%/);
    if (m) {
      sec.issuer = m[1].trim();
      sec.issuerType = 'Sovereign';
      sec.maturityDate = m[2].trim();
      sec.couponRate = Number(m[3]);
      sec.creditRating = 'AAA (Sovereign)';
    }
  } else if (assetType === 'Corporate Bond') {
    const m = description.match(/issued by ([^,]+), rated ([^.]+)\. This instrument offers a fixed coupon of ([0-9.]+)%/);
    if (m) {
      sec.issuer = m[1].trim();
      sec.issuerType = 'Corporate';
      sec.creditRating = m[2].trim();
      sec.couponRate = Number(m[3]);
    }
  } else if (assetType === 'Mutual Fund') {
    const m = description.match(/offered by ([^,]+), managed by ([^.]+)\./);
    if (m) {
      sec.fundHouse = m[1].trim();
      sec.fundManager = m[2].trim();
    }
    sec.investmentCategory = sector || 'Mutual Fund';
  } else if (assetType === 'ETF') {
    const m = description.match(/managed by ([^,]+), tracking the (.+?)\. It offers/);
    if (m) {
      sec.fundManager = m[1].trim();
      sec.underlyingIndex = m[2].trim();
    }
  } else if (assetType === 'REIT' || assetType === 'InvIT') {
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
console.log('Asset Type breakdown:', assetTypeCounts);
console.log('Currency breakdown:', currencyCounts);

// Write parsed_universe.json
const jsonOutput = JSON.stringify(compiledSecurities, null, 2);
fs.writeFileSync('parsed_universe.json', jsonOutput, 'utf8');
console.log(`✓ Wrote parsed_universe.json (${Buffer.byteLength(jsonOutput)} bytes).`);

// Write universe_data.js
const jsContent = `/**
 * SAAMX 2026 — Master Global Universe Dataset (Authoritative 2,849 Securities)
 * Compiled directly from SAAMX_Securities_Universe.xlsx
 * Total Instruments: 2,849 across 7 asset types and 10 verified currencies.
 */

export const ALL_SECURITIES_DATA = ${jsonOutput};

export default ALL_SECURITIES_DATA;
`;

fs.writeFileSync('universe_data.js', jsContent, 'utf8');
console.log(`✓ Wrote universe_data.js (${Buffer.byteLength(jsContent)} bytes).`);

// Generate SAAMX_SECURITIES_DIRECTORY.csv
const csvHeaders = [
  'Security ID', 'Ticker', 'Name', 'Asset Type', 'Currency',
  'Opening Price', 'Tick Size', 'Lot Size', 'Exchange',
  'Sector', 'Industry', 'Country', 'Region', 'Risk Rating', 'Market Cap Tier'
];

const csvRows = compiledSecurities.map(s => [
  `"${s.id}"`,
  `"${s.ticker}"`,
  `"${s.name.replace(/"/g, '""')}"`,
  `"${s.assetType}"`,
  `"${s.currency}"`,
  s.openingPrice,
  s.tickSize,
  s.lotSize,
  `"${s.exchange}"`,
  `"${s.sector.replace(/"/g, '""')}"`,
  `"${s.industry.replace(/"/g, '""')}"`,
  `"${s.country}"`,
  `"${s.region}"`,
  `"${s.riskRating}"`,
  `"${s.marketCapTier}"`
].join(','));

const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
fs.writeFileSync('SAAMX_SECURITIES_DIRECTORY.csv', csvContent, 'utf8');
console.log(`✓ Wrote SAAMX_SECURITIES_DIRECTORY.csv (${Buffer.byteLength(csvContent)} bytes).`);

console.log('\nCompilation completed successfully!');
