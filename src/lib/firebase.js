import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, get, off } from 'firebase/database';

const savedDbUrl = typeof window !== 'undefined' ? localStorage.getItem('fms_db_url') : null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyACK17SbwDDe76mVj_cT36DxETn8_f_Rzs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fmos-a6573.firebaseapp.com",
  databaseURL: savedDbUrl || import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://fmos-a6573-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fmos-a6573",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fmos-a6573.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351990440235",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:351990440235:web:7fdc7e7c9113e67123256e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-E8KG4PP4N7"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, onValue, set, update, push, get, off };
