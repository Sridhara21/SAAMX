import { useEffect, useState, useRef } from 'react';
import { db, ref, onValue, off } from '../lib/firebase';
import { getApiBaseUrl } from '../lib/api';

export function useFirebaseState() {
  const [state, setState] = useState(() => ({
    securities: [],
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
    // 1. Immediate backend fetch to ensure zero-lag instant bootstrap with all securities
    const fetchInitialApiState = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const apiUrl = baseUrl ? `${baseUrl}/api/state` : '/api/state';
        const res = await fetch(apiUrl);
        if (res.ok) {
          const apiData = await res.json();
          const serverState = apiData.state || apiData;
          if (serverState && serverState.securities) {
            const rawSecs = serverState.securities;
            const secCount = Array.isArray(rawSecs) ? rawSecs.length : Object.keys(rawSecs).length;
            if (secCount > 0) {
              setState(prevState => ({
                ...(prevState || {}),
                ...serverState,
                securities: rawSecs
              }));
              setLastUpdated(Date.now());
              return;
            }
          }
        }
      } catch (err) {
        // Fallback to offline universe data if local server unreachable
      }

      // Offline standalone fallback: lazily import full dataset without blocking initial bundle
      try {
        const { ALL_SECURITIES_DATA } = await import('../../universe_data.js');
        const { NEW_SIMULATED_IPOS } = await import('../../universe_generator.js');
        const fallbackList = [...ALL_SECURITIES_DATA, ...NEW_SIMULATED_IPOS];
        setState(prevState => {
          if (prevState.securities && prevState.securities.length > 0) return prevState;
          return {
            ...prevState,
            securities: fallbackList
          };
        });
        setLastUpdated(Date.now());
      } catch (e) {}
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
          let secObj = localState.securities;
          let secCount = 0;
          
          if (secObj) {
            secCount = Array.isArray(secObj) ? secObj.length : Object.keys(secObj).length;
          }

          if (secCount === 0) {
            console.warn(`[useFirebaseState] Firebase RTDB securities count is 0.`);
          }

          const hasSecurities = secObj && (Array.isArray(secObj) ? secObj.length > 0 : Object.keys(secObj).length > 0);
          const hasTeams = localState.teams && Object.keys(localState.teams).length > 0;

          if (hasSecurities && hasTeams) {
            hasBeenSeeded = true;
            lastGoodSecurities = localState.securities;
            lastGoodTeams = localState.teams;
          }

          if (!hasBeenSeeded && !hasSecurities) {
            setState(prevState => ({ ...(prevState || {}), isEmpty: true }));
          } else {
            setState(prevState => {
              const prevSec = (prevState && prevState.securities) || [];
              const finalSecurities = (localState.securities && secCount > 0)
                ? localState.securities
                : (lastGoodSecurities || prevSec);
              return {
                ...(prevState || {}),
                ...localState,
                securities: finalSecurities,
                teams: localState.teams || lastGoodTeams || (prevState && prevState.teams) || {}
              };
            });
            setLastUpdated(Date.now());
          }
        }
      }, () => {
        // Silently handle read permission denial under Phase 4 hardened rules
      });
      unsubs.push({ ref: keyRef, unsub });
    });

    // 2b. Listen to public live prices stream from Throttled Delta Publisher (Phase 4.4)
    const publicPricesRef = ref(db, 'public/live_prices');
    const publicPricesUnsub = onValue(publicPricesRef, (snapshot) => {
      const liveTicks = snapshot.val();
      if (!liveTicks || typeof liveTicks !== 'object') return;

      setState(prevState => {
        if (!prevState || !prevState.securities) return prevState;
        const isArr = Array.isArray(prevState.securities);
        if (isArr) {
          let hasChange = false;
          const updated = prevState.securities.map(s => {
            const tick = liveTicks[s.ticker];
            if (!tick) return s;
            hasChange = true;
            return {
              ...s,
              currentPrice: tick.currentPrice !== undefined ? tick.currentPrice : s.currentPrice,
              dayChange: tick.dayChange !== undefined ? tick.dayChange : s.dayChange,
              dayChangePercent: tick.dayChangePercent !== undefined ? tick.dayChangePercent : s.dayChangePercent,
              dayHigh: tick.dayHigh !== undefined ? tick.dayHigh : s.dayHigh,
              dayLow: tick.dayLow !== undefined ? tick.dayLow : s.dayLow,
              tradingVolume: tick.tradingVolume !== undefined ? tick.tradingVolume : s.tradingVolume,
              status: tick.status || s.status
            };
          });
          return hasChange ? { ...prevState, securities: updated } : prevState;
        } else {
          let hasChange = false;
          const updated = { ...prevState.securities };
          for (const [ticker, tick] of Object.entries(liveTicks)) {
            if (updated[ticker] && tick) {
              hasChange = true;
              updated[ticker] = {
                ...updated[ticker],
                currentPrice: tick.currentPrice !== undefined ? tick.currentPrice : updated[ticker].currentPrice,
                dayChange: tick.dayChange !== undefined ? tick.dayChange : updated[ticker].dayChange,
                dayChangePercent: tick.dayChangePercent !== undefined ? tick.dayChangePercent : updated[ticker].dayChangePercent,
                dayHigh: tick.dayHigh !== undefined ? tick.dayHigh : updated[ticker].dayHigh,
                dayLow: tick.dayLow !== undefined ? tick.dayLow : updated[ticker].dayLow,
                tradingVolume: tick.tradingVolume !== undefined ? tick.tradingVolume : updated[ticker].tradingVolume,
                status: tick.status || updated[ticker].status
              };
            }
          }
          return hasChange ? { ...prevState, securities: updated } : prevState;
        }
      });
      setLastUpdated(Date.now());
    }, () => {});
    unsubs.push({ ref: publicPricesRef, unsub: publicPricesUnsub });

    // 3. Connect to WebSocket server with auto-reconnection and state resync
    let ws = null;
    let reconnectTimeout = null;
    let isUnmounted = false;
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      if (typeof window === 'undefined' || !window.WebSocket) return;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl;
        
        // Phase B: WebSocket routing configuration
        // Firebase Hosting CDN does not support WebSocket protocol upgrades (Upgrade: websocket).
        // In production cloud environments, WebSockets must route directly to Cloud Run (api.saamx.in)
        // or to an explicitly configured WebSocket host.
        const envWsHost = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_HOST;
        const windowWsHost = typeof window !== 'undefined' && window.__SAAMX_WS_HOST__;
        const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL;

        if (envWsHost) {
          wsUrl = `${protocol}//${envWsHost}`;
        } else if (windowWsHost) {
          wsUrl = `${protocol}//${windowWsHost}`;
        } else if (envApiUrl) {
          try {
            const parsed = new URL(envApiUrl);
            wsUrl = `${protocol}//${parsed.host}`;
          } catch (e) {
            wsUrl = `${protocol}//${envApiUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`;
          }
        } else if (
          window.location.hostname === 'saamx.in' ||
          window.location.hostname === 'www.saamx.in' ||
          window.location.hostname === 'fmos-a6573.web.app' ||
          window.location.hostname === 'fmos-a6573.firebaseapp.com' ||
          window.location.hostname === 'fmos.web.app' ||
          window.location.hostname === 'fmos.firebaseapp.com' ||
          window.location.hostname === 'saamx26.web.app' ||
          window.location.hostname === 'saamx26.firebaseapp.com'
        ) {
          // Direct backend domain for WebSocket upgrades
          wsUrl = `${protocol}//saamx-backend-production.up.railway.app`;
        } else if (window.location.port === '5173') {
          // Vite dev server local proxy
          wsUrl = `${protocol}//${window.location.hostname || 'localhost'}:3000`;
        } else if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
          // Explicit custom non-standard port
          wsUrl = `${protocol}//${window.location.hostname || 'localhost'}:${window.location.port}`;
        } else {
          // Production cloud domain fallback
          wsUrl = `${protocol}//${window.location.host}`;
        }
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          reconnectAttempts = 0;
          setConnected(true);
          // Send AUTH if session token exists
          const token = sessionStorage.getItem('saamx_token') || sessionStorage.getItem('fms_token');
          if (token && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'AUTH', token }));
            } catch (err) {}
          }
          // Catch up on any state changes that happened while disconnected
          fetchInitialApiState();
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'PRICE_UPDATE' && payload.priceUpdates) {
              setState(prevState => {
                if (!prevState || !prevState.securities) return prevState;
                const updates = payload.priceUpdates;
                const isArr = Array.isArray(prevState.securities);
                let updatedSecurities;
                if (isArr) {
                  updatedSecurities = prevState.securities.map(s => {
                    const u = updates[s.ticker];
                    if (!u) return s;
                    let newHistory = s.priceHistory;
                    if (u.newPoint && s.priceHistory) {
                      newHistory = [...s.priceHistory, u.newPoint];
                      if (newHistory.length > 200) newHistory = newHistory.slice(-200);
                    }
                    return {
                      ...s,
                      currentPrice: u.currentPrice !== undefined ? u.currentPrice : s.currentPrice,
                      dayHigh: u.dayHigh !== undefined ? Math.max(s.dayHigh || 0, u.dayHigh) : s.dayHigh,
                      dayLow: u.dayLow !== undefined ? (s.dayLow ? Math.min(s.dayLow, u.dayLow) : u.dayLow) : s.dayLow,
                      priceHistory: newHistory
                    };
                  });
                } else {
                  updatedSecurities = { ...prevState.securities };
                  for (const [ticker, u] of Object.entries(updates)) {
                    if (updatedSecurities[ticker]) {
                      const s = updatedSecurities[ticker];
                      let newHistory = s.priceHistory;
                      if (u.newPoint && s.priceHistory) {
                        newHistory = [...s.priceHistory, u.newPoint];
                        if (newHistory.length > 200) newHistory = newHistory.slice(-200);
                      }
                      updatedSecurities[ticker] = {
                        ...s,
                        currentPrice: u.currentPrice !== undefined ? u.currentPrice : s.currentPrice,
                        dayHigh: u.dayHigh !== undefined ? Math.max(s.dayHigh || 0, u.dayHigh) : s.dayHigh,
                        dayLow: u.dayLow !== undefined ? (s.dayLow ? Math.min(s.dayLow, u.dayLow) : u.dayLow) : s.dayLow,
                        priceHistory: newHistory
                      };
                    }
                  }
                }
                return {
                  ...prevState,
                  securities: updatedSecurities,
                  marketIndices: payload.marketIndices || prevState.marketIndices,
                  marketState: payload.marketState || prevState.marketState
                };
              });
              setLastUpdated(Date.now());
            } else if (payload.state) {
              setState(prevState => ({
                ...(prevState || {}),
                ...payload.state
              }));
              setLastUpdated(Date.now());
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          setConnected(false);
          if (!isUnmounted) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          }
        };

        ws.onerror = () => {
          // Handled via onclose
        };
      } catch (e) {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      connectedUnsub();
      unsubs.forEach(({ ref: r, unsub: u }) => {
        if (typeof u === 'function') u();
        else off(r);
      });
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, []);

  return { state, connected, lastUpdated };
}
