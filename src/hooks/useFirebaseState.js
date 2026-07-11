import { useEffect, useState } from 'react';
import { db, ref, onValue, off } from '../lib/firebase';

export function useFirebaseState() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Listen to entire simulation state
    const stateRef = ref(db, 'fms');
    
    // Listen to Firebase connection status
    const connectedRef = ref(db, '.info/connected');
    const connectedUnsub = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    // Listen to full simulation state
    const stateUnsub = onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        setState(snapshot.val());
        setLastUpdated(Date.now());
      } else {
        // Set sentinel value to indicate unseeded database
        setState({ isEmpty: true });
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      setState({ isError: true, errorMessage: error.message });
    });

    // Cleanup on component unmount
    return () => {
      off(stateRef);
      off(connectedRef);
    };
  }, []);

  return { state, connected, lastUpdated };
}
