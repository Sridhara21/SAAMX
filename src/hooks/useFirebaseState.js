import { useEffect, useState, useRef } from 'react';
import { db, ref, onValue, off, set } from '../lib/firebase';
import { ALL_SECURITIES_DATA } from '../../universe_data.js';
import { NEW_SIMULATED_IPOS } from '../../universe_generator.js';

// Build the pristine 2,061 baseline dictionary
function getPristineSecuritiesMap() {
  const map = {};
  ALL_SECURITIES_DATA.forEach(s => {
    map[s.ticker] = { ...s };
  });
  NEW_SIMULATED_IPOS.forEach(ipo => {
    map[ipo.ticker] = { ...ipo };
  });
  return map;
}

const PRISTINE_SECURITIES_MAP = getPristineSecuritiesMap();
const PRISTINE_SECURITIES_ARRAY = Object.values(PRISTINE_SECURITIES_MAP);

export function useFirebaseState() {
  const [state, setState] = useState(() => ({
    securities: PRISTINE_SECURITIES_MAP,
    teams: {},
    transactions: {},
    orders: {},
    newsEvents: {},
    corporateActions: {},
    marketState: { status: 'Open', sessionState: 'AFTERNOON_SESSION', mode: 'EVENT' }
  }));
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const syncedToRemoteRef = useRef(false);

  useEffect(() => {
    // 1. Immediate backend fetch to ensure zero-lag instant bootstrap with all 2,061 securities
    const fetchInitialApiState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const apiData = await res.json();
          const serverState = apiData.state || apiData;
          if (serverState && serverState.securities) {
            const rawSecs = serverState.securities;
            const secCount = Array.isArray(rawSecs) ? rawSecs.length : Object.keys(rawSecs).length;
            if (secCount >= 2000) {
              setState(prevState => ({
                ...(prevState || {}),
                ...serverState,
                securities: rawSecs
              }));
              setLastUpdated(Date.now());
            }
          }
        }
      } catch (err) {
        // Backend fetch fallback
      }
    };

    fetchInitialApiState();

    // 2. Listen to Firebase connection status
    const connectedRef = ref(db, '.info/connected');
    const connectedUnsub = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    const subKeys = [
      'marketState',
      'securities',
      'teams',
      'fxRates',
      'fxTransactions',
      'newsEvents',
      'corporateActions',
      'firedPhoenixActs',
      'velocities',
      'settings',
      'transactions',
      'lastResetReport'
    ];

    const unsubs = [];
    let localState = {};
    const loadedKeys = new Set();
    let hasBeenSeeded = false;
    let lastGoodSecurities = PRISTINE_SECURITIES_ARRAY;
    let lastGoodTeams = null;

    subKeys.forEach((key) => {
      const keyRef = ref(db, `fms/${key}`);
      const unsub = onValue(keyRef, (snapshot) => {
        const val = snapshot.val();
        localState = {
          ...localState,
          [key]: val
        };

        loadedKeys.add(key);

        if (loadedKeys.size === subKeys.length) {
          let secObj = localState.securities;
          let secCount = 0;
          
          if (secObj) {
            secCount = Array.isArray(secObj) ? secObj.length : Object.keys(secObj).length;
          }

          // HARDCORE SAFEGUARD: If Firebase RTDB has fewer than 2,000 securities or is empty,
          // NEVER allow an old/truncated list to override the full universe!
          if (secCount < 2000) {
            console.warn(`[useFirebaseState] Firebase RTDB securities count is ${secCount} (< 2000). Enforcing 2,061 full universe baseline.`);
            localState.securities = PRISTINE_SECURITIES_MAP;
            secObj = PRISTINE_SECURITIES_MAP;

            // Auto-heal Firebase RTDB with all 2,061 securities so the remote cloud DB is permanently fixed!
            if (!syncedToRemoteRef.current) {
              syncedToRemoteRef.current = true;
              try {
                set(ref(db, 'fms/securities'), PRISTINE_SECURITIES_MAP).catch(err => {
                  console.warn('[useFirebaseState] Auto-heal sync notice:', err.message);
                });
              } catch (e) {}
            }
          }

          const hasSecurities = secObj && (Array.isArray(secObj) ? secObj.length >= 2000 : Object.keys(secObj).length >= 2000);
          const hasTeams = localState.teams && Object.keys(localState.teams).length > 0;

          if (hasSecurities && hasTeams) {
            hasBeenSeeded = true;
            lastGoodSecurities = localState.securities;
            lastGoodTeams = localState.teams;
          }

          if (!hasBeenSeeded && !hasSecurities) {
            setState({ isEmpty: true });
          } else {
            const finalSecurities = localState.securities || lastGoodSecurities || PRISTINE_SECURITIES_MAP;
            const safeState = {
              ...localState,
              securities: finalSecurities,
              teams: localState.teams || lastGoodTeams || {}
            };
            setState(safeState);
            setLastUpdated(Date.now());
          }
        }
      }, (error) => {
        console.warn(`[useFirebaseState] Firebase listener warning on ${key}:`, error.message);
        // Do not crash the local UI if backend and local floor engine are running
      });
      unsubs.push({ ref: keyRef, unsub });
    });

    // 3. Connect to WebSocket server for instantaneous local floor synchronization
    let ws = null;
    if (typeof window !== 'undefined' && window.WebSocket) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = window.location.port === '5173' ? '3000' : (window.location.port || '3000');
        const wsUrl = `${protocol}//${host}:${port}`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.state) {
              setState(prevState => ({
                ...(prevState || {}),
                ...payload.state
              }));
              setLastUpdated(Date.now());
            }
          } catch (e) {}
        };
        ws.onerror = () => {};
      } catch (e) {}
    }

    // Cleanup on component unmount
    return () => {
      connectedUnsub();
      unsubs.forEach(({ ref: r }) => off(r));
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return { state, connected, lastUpdated };
}
