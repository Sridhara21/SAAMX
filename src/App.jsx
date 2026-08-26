import React, { useState, useEffect } from 'react';
import AdminPage from './pages/AdminPage.jsx';
import ExchangePage from './pages/ExchangePage.jsx';
import SebiPage from './pages/SebiPage.jsx';
import ProjectorPage from './pages/ProjectorPage.jsx';
import JournalistPage from './pages/JournalistPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import TrainingPage from './pages/TrainingPage.jsx';
import CompanyProfileModal from './components/CompanyProfileModal.jsx';
import { useFirebaseState } from './hooks/useFirebaseState.js';
import { ConnectionIndicator } from './components/ConnectionIndicator.jsx';
import { apiFetch } from './lib/api.js';
import { db, ref, onValue, update } from './lib/firebase.js';
import { NEWS_PRESETS } from './lib/newsPresets.js';

const PROJECT_PHOENIX_ACTS = [
  { id: 'ACT_1', triggerMinute: 8, label: 'Act 1: DTAI Loss Announcement (-22%)', actNumber: 1, type: 'news' },
  { id: 'IPO_1', triggerMinute: 16, label: 'IPO 1: IndiaStack Fintech IPO (ISFT)', actNumber: 3, type: 'ipo' },
  { id: 'ACT_2', triggerMinute: 20, label: 'Act 2: Mystery Buyer Recovery', actNumber: 2, type: 'news' },
  { id: 'ACT_3', triggerMinute: 25, label: 'Act 3: Leadership Upheaval CEO Resigns (-8%)', actNumber: 4, type: 'news' },
  { id: 'ACT_4', triggerMinute: 32, label: 'Act 4: PUMP PHASE — Velocity to ₹420 (Goldman Pump)', actNumber: 5, type: 'velocity' },
  { id: 'IPO_2', triggerMinute: 30, label: 'IPO 2: Anthropic AI India IPO (ANTH)', actNumber: 7, type: 'ipo' },
  { id: 'ACT_5', triggerMinute: 35, label: 'Act 5: Tata Acquisition Rumour (+8%)', actNumber: 8, type: 'news' },
  { id: 'HINT', triggerMinute: 47, label: 'SEBI Hint: SEBI Monitoring DTAI', actNumber: 6, type: 'news' },
  { id: 'ACT_6', triggerMinute: 50, label: 'Act 6: SEBI Opens Investigation (-25%)', actNumber: 9, type: 'sebi_notice' },
  { id: 'ACT_7', triggerMinute: 52, label: 'Act 7: Insider Trading Scandal (-30%)', actNumber: 10, type: 'news' },
  { id: 'ACT_8', triggerMinute: 54, label: 'Act 8: Trading Suspended (Halt)', actNumber: 12, type: 'halt' },
  { id: 'ACT_9', triggerMinute: 56, label: 'Act 9: BANKRUPTCY DECLARED', actNumber: 13, type: 'bankruptcy' }
];

const ADMIN_HASH = 'd00bdb077d8d916aece9a019596e5982c433f5ed4505c3b0c45c772c36c73c5b'; // saamx-event-2026
const JOURNALIST_HASH = '94fa84a6de0ca14745c881783df2f76fe363a72b2256f5c98837df99578a8f14'; // journalist-event-2026
const SEBI_HASH = '70ffd6d7a8e810257d2956fe37271a4303605dcaa84f68b3c1a31324b1dcf237'; // sebi-event-2026
const EXCHANGE_HASH = '49ddb1c95c0bd3cde6fc6c66a321508bc926a90f1697be0869058a2cfd14441f'; // exchange-event-2026
const PORTFOLIO_HASH = '3776a910d46826ee1add169992b84e7912a5d646993beb6cd7a2a4d027ccbe6d'; // portfolio-event-2026

const SRIDHARA_HASH = '432cb5d1a3cb8c6cff6dccb85d9711b99abd0db8492ca2ecb45f56befb538461'; // 21112009
const AKSHAY_HASH = '9a61e9aa78ad7fc3a5bdafa30e18f9692dfa85cab45947fcb29032ea5c96e7a5'; // 19102009
const AARUSH_HASH = 'baeb9189142e5d530ae443d473e04a11b073a77b7288cd19f4256207dac5ddbf'; // 20122009
const SANDESH_HASH = 'c827c745f353aab0d2ba354ed86e382562dd4869cbe2b2f76e404658736843dd'; // 11062009
const AKSHARAA_HASH = 'dbf42b85df3130095ffbe9ec8924eabdda957a5e1ffbf55c613d719e86fcd56c'; // 24022009

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const { state, connected } = useFirebaseState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);
  const [apiBaseInput, setApiBaseInput] = useState(localStorage.getItem('fms_api_base') || '');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState(localStorage.getItem('fms_db_url') || '');

  // Timeout to show troubleshoot config
  const [missingEnvVars, setMissingEnvVars] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshooting(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Startup check for required environment variables
  useEffect(() => {
    const required = ['VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'];
    const missing = required.filter(k => !import.meta.env[k]);
    if (missing.length > 0) {
      console.error('MISSING ENV VARS:', missing);
      setMissingEnvVars(missing);
    }
  }, []);

  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Sync server clock offset
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsub();
  }, []);

  // Root Background Simulation Scheduler (Runs on any active client context when market is Open)
  useEffect(() => {
    if (!state || !state.marketState || state.marketState.status !== 'Open' || !state.marketState.simulationStartTime) return;

    const schedulerInterval = setInterval(async () => {
      const currentServerTime = Date.now() + serverTimeOffset;
      const elapsedMs = currentServerTime - state.marketState.simulationStartTime - (state.marketState.pauseTimeOffset || 0);
      const elapsedMinutes = elapsedMs / 60000;

      const firedActs = state.firedPhoenixActs || {};

      // 1. Fire Project Phoenix acts based on elapsed minutes
      for (const act of PROJECT_PHOENIX_ACTS) {
        if (elapsedMinutes >= act.triggerMinute && !firedActs[act.actNumber]) {
          console.log(`Scheduler auto-firing act: ${act.label}`);
          await apiFetch('/api/admin/phoenix-act', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actNumber: act.actNumber })
          }).catch(() => {});
        }
      }

      // 1b. Auto-Release Scenario News Bulletins every 40-50 seconds (if autoNewsEnabled is true, transactional and safe)
      const currentSettings = state?.settings || {};
      if (currentSettings.autoNewsEnabled) {
        await apiFetch('/api/admin/tick-news', { method: 'POST' }).catch(() => {});
      }

      // 2. Auto-activate pending IPOs after 90 seconds of staging
      const securitiesList = state.securities ? Object.values(state.securities) : [];
      const pendingIpos = securitiesList.filter(s => s.status === 'IPO_PENDING');
      for (const sec of pendingIpos) {
        const actionMatch = (state.corporateActions ? Object.values(state.corporateActions) : [])
          .find(a => a.securityId === sec.ticker && a.actionType === 'IPO');
        if (actionMatch && currentServerTime - actionMatch.triggeredAt >= 90000) {
          await apiFetch(`/api/securities/${sec.ticker}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Active' })
          }).catch(() => {});
        }
      }
    }, 5000);

    return () => clearInterval(schedulerInterval);
  }, [state?.marketState?.status, state?.marketState?.simulationStartTime, state?.marketState?.pauseTimeOffset, state?.firedPhoenixActs, state?.securities, state?.corporateActions, state?.settings?.autoNewsEnabled, state?.settings?.currentNewsStep, serverTimeOffset]);


  // Hash Router
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
      setAuthError('');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const hash = await sha256(passwordInput);
      const userLower = usernameInput.trim().toLowerCase();

      if ((userLower === 'admin' && hash === ADMIN_HASH) || (userLower === 'sridhara' && hash === SRIDHARA_HASH)) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'admin');
        sessionStorage.setItem('fms_username', usernameInput.trim());
        sessionStorage.setItem('fms_password', passwordInput);
        setUsernameInput('');
        setPasswordInput('');
        setAuthError('');
      } else if (
        ((userLower === 'mr_x' || userLower === 'mr. x' || userLower === 'mrx') && hash === EXCHANGE_HASH) ||
        (userLower === 'akshay' && hash === AKSHAY_HASH) ||
        (userLower === 'aarush' && hash === AARUSH_HASH) ||
        (userLower === 'sandesh' && hash === SANDESH_HASH) ||
        (userLower === 'aksharaa' && hash === AKSHARAA_HASH)
      ) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'operator_x');
        sessionStorage.setItem('fms_username', usernameInput.trim());
        sessionStorage.setItem('fms_password', passwordInput);
        setUsernameInput('');
        setPasswordInput('');
        setAuthError('');
      } else if (userLower === 'sebi' && hash === SEBI_HASH) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'sebi');
        sessionStorage.setItem('fms_username', usernameInput.trim());
        sessionStorage.setItem('fms_password', passwordInput);
        setUsernameInput('');
        setPasswordInput('');
        setAuthError('');
      } else if (userLower === 'journalist' && hash === JOURNALIST_HASH) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'journalist');
        sessionStorage.setItem('fms_username', usernameInput.trim());
        sessionStorage.setItem('fms_password', passwordInput);
        setUsernameInput('');
        setPasswordInput('');
        setAuthError('');
      } else if (userLower === 'portfolio' && hash === PORTFOLIO_HASH) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'portfolio');
        sessionStorage.setItem('fms_username', usernameInput.trim());
        sessionStorage.setItem('fms_password', passwordInput);
        setUsernameInput('');
        setPasswordInput('');
        setAuthError('');
      } else {
        setAuthError('Incorrect Console Access Username or Password');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Authentication error. Try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fms_authenticated');
    sessionStorage.removeItem('fms_role');
    sessionStorage.removeItem('fms_username');
    sessionStorage.removeItem('fms_password');
    setUsernameInput('');
    setPasswordInput('');
    window.location.hash = '#/';
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('fms_authenticated');
    if (cached === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (route === '#/projector') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [route]);

  const requiresAuth = ['#/admin', '#/exchange', '#/sebi', '#/journalist', '#/portfolio', '#/training'].includes(route);
  const authorized = isAuthenticated;

  const openCompanyProfile = (id) => {
    setSelectedSecurityId(id);
  };

  if (!state) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-paper)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <h2 style={{ color: 'var(--color-brass)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Loading SAAMX Terminal...</h2>
          <div style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Syncing real-time market engine</div>
          
          {showTroubleshooting && (
            <div className="glass card" style={{ padding: '24px', textAlign: 'left', borderTop: '4px solid var(--color-brass)', marginTop: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--color-ink)' }}>Troubleshoot Database Connection</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginBottom: '16px', lineHeight: '1.5' }}>
                If this screen hangs, it means the app is unable to reach your Firebase Realtime Database. Please verify:
                <br />1. You have clicked **Create Database** in your Firebase console under *Realtime Database*.
                <br />2. If your database URL is different, paste the exact URL from your Firebase console below:
              </p>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="https://your-project-default-rtdb.firebaseio.com"
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#000' }}
                  value={customDbUrl}
                  onChange={(e) => setCustomDbUrl(e.target.value)}
                />
                <button
                  onClick={() => {
                    localStorage.setItem('fms_db_url', customDbUrl.trim());
                    window.location.reload();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Save & Retry
                </button>
              </div>
              
              {localStorage.getItem('fms_db_url') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('fms_db_url');
                    window.location.reload();
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-fall)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                >
                  Reset to default Singapore URL
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Firebase Connection Error Screen
  if (state.isError) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-paper)', padding: '24px' }}>
        <div className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '2rem' }}>Connection Error</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px', lineHeight: '1.6' }}>
            Failed to connect to Firebase Realtime Database.
          </p>
          <div style={{ textAlign: 'left', background: 'rgba(250, 224, 222, 0.5)', border: '1px solid #9B2B25', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#9B2B25', fontFamily: 'monospace', marginBottom: '24px' }}>
            Error: {state.errorMessage}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', marginBottom: '24px', textAlign: 'left' }}>
            Please make sure:
            <br />1. Your database is created in the Firebase console.
            <br />2. The **Database URL** is correct in `src/lib/firebase.js`.
            <br />3. The **Rules** are set to `.read: true` and `.write: true`.
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ width: '100%' }}>🔄 Retry Connection</button>
        </div>
      </div>
    );
  }

  // Render empty database initialization screen
  if (state.isEmpty) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--color-paper)', padding: '24px'
      }}>
        <div className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-brass)' }}>
          <h2 style={{ color: 'var(--color-brass)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '2rem' }}>Initialization Required</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px', lineHeight: '1.6' }}>
            The Firebase Realtime Database for project <strong>fmos-a6573</strong> is currently empty. Initialize it now with the complete 112-security universe and retail teams.
          </p>

          <button
            onClick={async () => {
              try {
                const res = await apiFetch('/api/admin/seed', { method: 'POST' });
                if (res.ok) {
                  alert('Database initialized and seeded successfully!');
                  window.location.reload();
                } else {
                  alert('Initialization failed. Check API Base URL and credentials.');
                }
              } catch (e) {
                alert('Connection error initializing database.');
              }
            }}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            🚀 Initialize & Seed Database
          </button>
        </div>
      </div>
    );
  }

  // Render Authentication Gate if needed
  if (requiresAuth && !authorized) {
    return (
      <div className="password-gate-container" style={{ backgroundColor: 'var(--color-paper)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form className="password-card glass" onSubmit={handleAuth} style={{ width: '100%', maxWidth: '400px', padding: '32px', borderTop: '6px solid var(--color-brass)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--color-ink)', fontSize: '2rem' }}>Console Authorization</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Please authenticate to enter the <strong>{route.replace('#/', '').toUpperCase()}</strong> console.
          </p>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Console Username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <input
              type="password"
              className="input-field"
              placeholder="Console Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
          </div>
          {authError && <div style={{ color: 'var(--color-fall)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {authError}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enter Dashboard</button>
        </form>
      </div>
    );
  }

  const currentPassword = sessionStorage.getItem('fms_password') || 'saamx-event-2026';
  const userRole = sessionStorage.getItem('fms_role') || '';
  const isJournalistSession = userRole === 'journalist';
  const isSebiSession = userRole === 'sebi';
  const isAksharaaSession = (sessionStorage.getItem('fms_username') || '').trim().toLowerCase() === 'aksharaa';
  const isOperatorXSession = userRole === 'operator_x' && !isAksharaaSession;
  const isPortfolioSession = userRole === 'portfolio';

  const renderContent = () => {
    if (isAksharaaSession && ['#/admin', '#/sebi', '#/exchange', '#/training'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under a role which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    if (isJournalistSession && ['#/admin', '#/exchange', '#/sebi', '#/portfolio', '#/training'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>Journalist</strong> role, which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    if (isSebiSession && ['#/admin', '#/exchange', '#/journalist', '#/training'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>SEBI</strong> role, which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    if (isOperatorXSession && ['#/admin', '#/sebi', '#/journalist', '#/training'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>Mr. X (Exchange)</strong> role, which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    if (isPortfolioSession && ['#/admin', '#/sebi', '#/journalist', '#/exchange', '#/training'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>Portfolio</strong> role, which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    const normalizedState = {
      ...state,
      securities: Object.values(state.securities || {}),
      teams: Object.values(state.teams || {}),
      transactions: Object.values(state.transactions || {}),
      newsEvents: Object.values(state.newsEvents || {}),
      corporateActions: Object.values(state.corporateActions || {})
    };

    switch (route) {
      case '#/admin':
        return <AdminPage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} />;
      case '#/exchange':
        return <ExchangePage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} />;
      case '#/sebi':
        return <SebiPage state={normalizedState} connected={connected} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} />;
      case '#/projector':
        return <ProjectorPage state={normalizedState} takeoverEvent={normalizedState?.marketState?.takeoverEvent || null} onOpenProfile={openCompanyProfile} />;
      case '#/journalist':
        return <JournalistPage state={normalizedState} adminPassword={currentPassword} />;
      case '#/portfolio':
        return <PortfolioPage state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/training':
        return <TrainingPage state={normalizedState} />;
      case '#/results':
        return <ResultsPage state={normalizedState} />;
      case '#/home':
      case '#/':
      default:
        return <HomePage state={normalizedState} connected={connected} />;
    }
  };

  const renderNavTabs = () => {
    const tabs = [
      { name: 'Home', path: '#/', routes: ['#/', '#/home'] },
      { name: 'Projector', path: '#/projector', routes: ['#/projector'] },
      { name: 'Portfolios', path: '#/portfolio', routes: ['#/portfolio'] },
      { name: 'Exchange', path: '#/exchange', routes: ['#/exchange'] },
      { name: 'SEBI', path: '#/sebi', routes: ['#/sebi'] },
      { name: 'Journalist', path: '#/journalist', routes: ['#/journalist'] },
      { name: 'Admin', path: '#/admin', routes: ['#/admin'] },
      { name: 'Results', path: '#/results', routes: ['#/results'] }
    ];

    return tabs.map(tab => {
      let hasAccess = false;
      if (userRole === 'admin') {
        hasAccess = true;
      } else if (isAksharaaSession && ['Home', 'Projector', 'Portfolios', 'Journalist', 'Results'].includes(tab.name)) {
        hasAccess = true;
      } else if (userRole === 'operator_x' && ['Home', 'Projector', 'Portfolios', 'Exchange', 'Results'].includes(tab.name)) {
        hasAccess = true;
      } else if (userRole === 'sebi' && ['Home', 'Projector', 'Portfolios', 'SEBI', 'Results'].includes(tab.name)) {
        hasAccess = true;
      } else if (userRole === 'journalist' && ['Home', 'Projector', 'Journalist', 'Results'].includes(tab.name)) {
        hasAccess = true;
      } else if (userRole === 'portfolio' && ['Home', 'Projector', 'Portfolios', 'Results'].includes(tab.name)) {
        hasAccess = true;
      }

      if (!hasAccess) return null;

      const isActive = tab.routes.includes(route);
      return (
        <a key={tab.name} href={tab.path} className={`nav-link ${isActive ? 'active' : ''}`}>
          {tab.name}
        </a>
      );
    });
  };

  const showIndicator = ['#/projector', '#/exchange', '#/sebi', '#/admin', '#/journalist', '#/training'].includes(route);

  return (
    <div className="app-container">
      {missingEnvVars.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-fall)',
          color: '#fff',
          padding: '12px',
          fontWeight: 800,
          textAlign: 'center',
          fontSize: '0.9rem',
          zIndex: 99999
        }}>
          ⚠️ MISSING ENV VARS IN HOSTING: {missingEnvVars.join(', ')} — check Firebase console configuration!
        </div>
      )}

      {route !== '#/projector' && (
        <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="logo-area">
              <div className="logo-avatar">S</div>
              <div className="logo-title">SAAMX Platform</div>
            </div>
            <nav className="nav-tabs">
              {renderNavTabs()}
            </nav>
          </div>
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                👤 <strong>{sessionStorage.getItem('fms_username') || userRole.toUpperCase()}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--color-fall-light)',
                  color: 'var(--color-fall)',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                LOGOUT ↩
              </button>
            </div>
          )}
        </header>
      )}

      <main className="main-content" style={route === '#/projector' ? { padding: 0, maxWidth: '100%' } : {}}>
        {renderContent()}
      </main>

      {selectedSecurityId && state.securities && (
        <CompanyProfileModal
          securityId={selectedSecurityId}
          securities={Object.values(state.securities)}
          newsEvents={Object.values(state.newsEvents || {})}
          onClose={() => setSelectedSecurityId(null)}
        />
      )}

      {showIndicator && (
        <ConnectionIndicator connected={connected} />
      )}
    </div>
  );
}
