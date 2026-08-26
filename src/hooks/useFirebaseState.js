import { useEffect, useState } from 'react';
import { db, ref, onValue, off } from '../lib/firebase';

export function useFirebaseState() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Listen to Firebase connection status
    const connectedRef = ref(db, '.info/connected');
    const connectedUnsub = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    const subKeys = [
      'marketState',
      'securities',
      'teams',
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
    let lastGoodSecurities = null;
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
          const hasSecurities = localState.securities && Object.keys(localState.securities).length > 0;
          const hasTeams = localState.teams && Object.keys(localState.teams).length > 0;

          if (hasSecurities && hasTeams) {
            hasBeenSeeded = true;
            lastGoodSecurities = localState.securities;
            lastGoodTeams = localState.teams;
          }

          if (!hasBeenSeeded) {
            setState({ isEmpty: true });
          } else {
            // Keep previous securities and teams if they are momentarily null during transactions
            const safeState = {
              ...localState,
              securities: localState.securities || lastGoodSecurities || {},
              teams: localState.teams || lastGoodTeams || {}
            };
            setState(safeState);
            setLastUpdated(Date.now());
          }
        }
      }, (error) => {
        console.error(`Firebase listener error on ${key}:`, error);
        setState({ isError: true, errorMessage: error.message });
      });
      unsubs.push({ ref: keyRef, unsub });
    });

    // Cleanup on component unmount
    return () => {
      connectedUnsub();
      unsubs.forEach(({ ref: r }) => off(r));
    };
  }, []);

  return { state, connected, lastUpdated };
}
