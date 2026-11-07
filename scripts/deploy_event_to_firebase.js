import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update } from 'firebase/database';

// 1. Read environment credentials
const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyACK17SbwDDe76mVj_cT36DxETn8_f_Rzs",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "fmos-a6573.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://fmos-a6573-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "fmos-a6573",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "fmos-a6573.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351990440235",
  appId: env.VITE_FIREBASE_APP_ID || "1:351990440235:web:7fdc7e7c9113e67123256e"
};

console.log('Connecting to Firebase RTDB:', firebaseConfig.databaseURL);
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. Read local state.json
const statePath = path.resolve('state.json');
if (!fs.existsSync(statePath)) {
  console.error('Error: state.json not found.');
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const rawSecurities = Array.isArray(state.securities) ? state.securities : Object.values(state.securities || {});
console.log(`Loaded state.json: ${rawSecurities.length} securities, ${state.teams?.length || 0} teams.`);

// Convert securities array to keyed dictionary
const securitiesMap = {};
for (const s of rawSecurities) {
  if (s && s.ticker) {
    securitiesMap[s.ticker] = {
      ticker: s.ticker,
      name: s.name || s.ticker,
      sector: s.sector || 'Equities',
      exchange: s.exchange || 'NSE',
      country: s.country || 'India',
      currency: s.currency || 'INR',
      basePrice: Number(s.basePrice || s.currentPrice || 100),
      currentPrice: Number(s.currentPrice || s.basePrice || 100),
      openingPrice: Number(s.openingPrice || s.basePrice || 100),
      dayHigh: Number(s.dayHigh || s.currentPrice || 100),
      dayLow: Number(s.dayLow || s.currentPrice || 100),
      volume: Number(s.volume || 0),
      status: s.status || 'Active',
      visibleToParticipants: s.visibleToParticipants !== undefined ? s.visibleToParticipants : true,
      circuitHalted: Boolean(s.circuitHalted)
    };
  }
}

// Prepare teams map (standardized to ₹1 Crore)
const teamsMap = {};
const teamList = state.teams || [];
for (let i = 1; i <= 20; i++) {
  const code = `T${String(i).padStart(2, '0')}`;
  const existing = teamList.find(t => (t.teamCode || '').toUpperCase() === code) || {};
  teamsMap[code] = {
    teamCode: code,
    name: existing.name || `Investment House ${i}`,
    school: existing.school || 'Collegiate Division',
    cashBalance: 10000000,
    startingCapital: 10000000,
    portfolioValue: 10000000,
    totalRealizedPnl: 0,
    totalUnrealizedPnl: 0,
    holdings: existing.holdings || {},
    isActive: true,
    lastActive: Date.now()
  };
}

// Master Admin registry
const masterAdmins = [
  { username: 'Sridhara', role: 'admin', accessLevel: 'MASTER', createdAt: Date.now() }
];

// Event Configuration
const eventConfig = [
  {
    id: 'EVT_LIVE_MAIN',
    name: 'Annual Inter-School Asset Market Championship',
    marketOpenTime: '09:30',
    lunchBreak: '12:00 - 13:00',
    resultsTime: '16:00',
    startingCapital: 10000000,
    mode: 'EVENT'
  }
];

// Settings
const settings = {
  startingCapitalRetail: 10000000,
  startingCapitalMutualFund: 10000000,
  startingCapitalHedgeFund: 10000000,
  defaultVolatility: 0.5,
  circuitBreakerThreshold: 30,
  circuitBreakerWindowMinutes: 5,
  fxProcessingDurationSec: 4,
  autoNewsEnabled: false
};

// Market State
const marketState = {
  mode: 'EVENT',
  status: 'NotStarted',
  sessionState: 'PRE_OPEN',
  sessionId: 'SAAMX-EVENT-2026',
  simulationStartTime: null,
  simulationDurationMinutes: 60,
  activeTeamCount: 20,
  totalTradesCount: 0,
  marketIndex: 0,
  pauseTimeOffset: 0,
  lastUpdated: Date.now(),
  timeString: '09:00 AM',
  timeLeftString: '60:00'
};

// FX Rates
const fxRates = state.fxRates || {
  USD: { rate: 88.20, spread: 0.0045 },
  GBP: { rate: 119.40, spread: 0.0045 },
  EUR: { rate: 103.50, spread: 0.0045 }
};

async function deploy() {
  try {
    console.log('\n--- 1. BACKING UP CURRENT CLOUD STATE ---');
    const existingSnap = await get(ref(db, 'fms'));
    if (existingSnap.exists()) {
      const backupDir = path.resolve('backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const bkpFile = path.join(backupDir, `firebase-pre-deploy-${Date.now()}.json`);
      fs.writeFileSync(bkpFile, JSON.stringify(existingSnap.val(), null, 2));
      console.log(`Saved pre-deploy backup to: ${bkpFile}`);
    } else {
      console.log('No prior cloud state existed.');
    }

    console.log('\n--- 2. DEPLOYING CORE EVENT CONFIGURATION ---');
    await set(ref(db, 'fms/settings'), settings);
    console.log('✓ fms/settings deployed (₹1 Crore baseline)');

    await set(ref(db, 'fms/marketState'), marketState);
    console.log('✓ fms/marketState deployed (Mode: EVENT)');

    await set(ref(db, 'fms/teams'), teamsMap);
    console.log(`✓ fms/teams deployed (20 teams initialized with ₹10,000,000)`);

    await set(ref(db, 'fms/masterAdmins'), masterAdmins);
    console.log('✓ fms/masterAdmins deployed (Sridhara registered as MASTER)');

    await set(ref(db, 'fms/events'), eventConfig);
    console.log('✓ fms/events deployed (EVT_LIVE_MAIN 09:30 schedule)');

    await set(ref(db, 'fms/fxRates'), fxRates);
    console.log('✓ fms/fxRates deployed (USD, GBP, EUR spreads)');

    console.log('\n--- 3. DEPLOYING SECURITIES UNIVERSE (2,061 ASSETS) ---');
    const tickers = Object.keys(securitiesMap);
    const batchSize = 250;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const chunk = tickers.slice(i, i + batchSize);
      const updates = {};
      for (const t of chunk) {
        updates[`fms/securities/${t}`] = securitiesMap[t];
      }
      await update(ref(db), updates);
      console.log(`✓ Uploaded securities batch: ${i + chunk.length} / ${tickers.length}`);
    }

    console.log('\n--- 4. CLOUD VERIFICATION READ-BACK ---');
    const verifyState = (await get(ref(db, 'fms/marketState'))).val();
    const verifySecs = (await get(ref(db, 'fms/securities'))).val();
    const verifyTeams = (await get(ref(db, 'fms/teams'))).val();
    const verifyAdmins = (await get(ref(db, 'fms/masterAdmins'))).val();

    console.log(`Verified Cloud Mode: ${verifyState?.mode} (Expected: EVENT)`);
    console.log(`Verified Cloud Securities: ${Object.keys(verifySecs || {}).length} (Expected: ${tickers.length})`);
    console.log(`Verified Cloud Teams: ${Object.keys(verifyTeams || {}).length} (Expected: 20)`);
    console.log(`Verified Team T01 Capital: ₹${Number(verifyTeams?.T01?.cashBalance || 0).toLocaleString()} (Expected: ₹1,00,00,000)`);
    console.log(`Verified Master Admin: ${verifyAdmins?.[0]?.username} (Access: ${verifyAdmins?.[0]?.accessLevel})`);

    console.log('\n======================================================');
    console.log('🎉 STABLE EVENT STATE DEPLOYED TO FIREBASE SUCCESSFULLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Fatal deployment error:', err);
    process.exit(1);
  }
}

deploy();
