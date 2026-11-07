import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const envPath = path.resolve('.env');
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
  projectId: env.VITE_FIREBASE_PROJECT_ID || "fmos-a6573"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const backupFile = path.resolve('backups/firebase-pre-deploy-1791644107672.json');
if (!fs.existsSync(backupFile)) {
  console.error('Backup file not found:', backupFile);
  process.exit(1);
}

const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

async function restore() {
  try {
    console.log('Restoring Firebase RTDB from pre-deploy backup...');
    console.log(`Backup data keys: ${Object.keys(backupData).join(', ')}`);
    
    // Set fms root directly
    await set(ref(db, 'fms'), backupData);
    console.log('✓ Successfully restored fms root in Firebase RTDB');

    // Verify
    const verifyState = (await get(ref(db, 'fms/marketState'))).val();
    const verifySecs = (await get(ref(db, 'fms/securities'))).val();
    const verifyTeams = (await get(ref(db, 'fms/teams'))).val();

    console.log(`Verified Mode: ${verifyState?.mode}`);
    console.log(`Verified Securities Count: ${Object.keys(verifySecs || {}).length}`);
    console.log(`Verified Teams Count: ${Object.keys(verifyTeams || {}).length}`);
    console.log('🎉 Firebase RTDB restored to pre-deploy state.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to restore backup:', err);
    process.exit(1);
  }
}

restore();
