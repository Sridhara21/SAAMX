import React, { useState, useEffect, useRef } from 'react';
import PublicLandingPage from './pages/PublicLandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ExchangePage from './pages/ExchangePage.jsx';
import SebiPage from './pages/SebiPage.jsx';
import ProjectorPage from './pages/ProjectorPage.jsx';
import JournalistPage from './pages/JournalistPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import ParticipantTerminal from './pages/ParticipantTerminal.jsx';
import TrainingPage from './pages/TrainingPage.jsx';
import CurrencyExchangePage from './pages/CurrencyExchangePage.jsx';
import BrokerAdvisoryTerminal from './pages/BrokerAdvisoryTerminal.jsx';
import BullTerminal from './pages/BullTerminal.jsx';
import BearTerminal from './pages/BearTerminal.jsx';
import BullBearDebatePage from './pages/BullBearDebatePage.jsx';
import NewsAnchorConsole from './pages/NewsAnchorConsole.jsx';
import MarketIntelligencePage from './pages/MarketIntelligencePage.jsx';
import MarketWatchPage from './pages/MarketWatchPage.jsx';
import RegistrationPage from './pages/RegistrationPage.jsx';
import FloorOperationsDashboard from './pages/FloorOperationsDashboard.jsx';
import VerificationPage from './pages/VerificationPage.jsx';
import CompanyProfileModal from './components/CompanyProfileModal.jsx';
import { useFirebaseState } from './hooks/useFirebaseState.js';
import { ConnectionIndicator } from './components/ConnectionIndicator.jsx';
import MarketStatusBar from './components/MarketStatusBar.jsx';
import MarketTicker from './components/MarketTicker.jsx';
import { apiFetch, calculateMarketClock } from './lib/api.js';
import { db, ref, onValue, update } from './lib/firebase.js';
import { NEWS_PRESETS } from './lib/newsPresets.js';

const PROJECT_PHOENIX_ACTS = [
  { id: 'ACT_1', triggerMinute: 8, label: 'Act 1: DTAI Loss Announcement (-22%)', actNumber: 1, type: 'news' },
  { id: 'IPO_1', triggerMinute: 16, label: 'IPO 1: OpenAI Hyperscale IPO (OAI)', actNumber: 3, type: 'ipo' },
  { id: 'ACT_2', triggerMinute: 20, label: 'Act 2: Mystery Buyer Recovery', actNumber: 2, type: 'news' },
  { id: 'ACT_3', triggerMinute: 25, label: 'Act 3: Leadership Upheaval CEO Resigns (-8%)', actNumber: 4, type: 'news' },
  { id: 'ACT_4', triggerMinute: 32, label: 'Act 4: PUMP PHASE — Velocity to ₹420 (Goldman Pump)', actNumber: 5, type: 'velocity' },
  { id: 'IPO_2', triggerMinute: 30, label: 'IPO 2: Stripe Global Infra IPO (STRP)', actNumber: 7, type: 'ipo' },
  { id: 'ACT_5', triggerMinute: 35, label: 'Act 5: Tata Acquisition Rumour (+8%)', actNumber: 8, type: 'news' },
  { id: 'HINT', triggerMinute: 47, label: 'SEBI Hint: SEBI Monitoring DTAI', actNumber: 6, type: 'news' },
  { id: 'ACT_6', triggerMinute: 50, label: 'Act 6: SEBI Opens Investigation (-25%)', actNumber: 9, type: 'sebi_notice' },
  { id: 'ACT_7', triggerMinute: 52, label: 'Act 7: Insider Trading Scandal (-30%)', actNumber: 10, type: 'news' },
  { id: 'ACT_8', triggerMinute: 54, label: 'Act 8: Trading Suspended (Halt)', actNumber: 12, type: 'halt' },
  { id: 'ACT_9', triggerMinute: 56, label: 'Act 9: BANKRUPTCY DECLARED', actNumber: 13, type: 'bankruptcy' }
];

const MY_SESSION_UUID = Math.random().toString(36).substring(2);

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const { state } = useFirebaseState();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(sessionStorage.getItem('saamx_token') || sessionStorage.getItem('fms_authenticated') === 'true');
  });
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role') || '';
  });
  const [sessionUsername, setSessionUsername] = useState(() => {
    return sessionStorage.getItem('saamx_username') || sessionStorage.getItem('fms_username') || '';
  });
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);
  const [apiBaseInput, setApiBaseInput] = useState(localStorage.getItem('fms_api_base') || '');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState(localStorage.getItem('fms_db_url') || '');

  // Connection & Coordinator state variables
  const [dbConnected, setDbConnected] = useState(true);
  const [coordinator, setCoordinator] = useState(null);
  const lastAutoBackupRef = useRef(0);

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

  // Connection listener (.info/connected)
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      setDbConnected(snap.val() === true);
    });
    return () => unsub();
  }, []);

  // Coordinator state listener
  useEffect(() => {
    const coordRef = ref(db, 'fms/coordinator');
    const unsub = onValue(coordRef, (snap) => {
      setCoordinator(snap.val());
    });
    return () => unsub();
  }, []);

  // Heartbeat loop for active Admin/SEBI role
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'sebi') return;

    const heartbeatInterval = setInterval(async () => {
      await set(ref(db, 'fms/coordinator'), {
        owner: userRole,
        lastActive: Date.now() + serverTimeOffset,
        claimedAt: coordinator?.claimedAt || (Date.now() + serverTimeOffset),
        id: MY_SESSION_UUID
      }).catch(e => console.error("Heartbeat error:", e));
    }, 2000);

    return () => clearInterval(heartbeatInterval);
  }, [userRole, serverTimeOffset, coordinator?.claimedAt]);

  const currentServerTime = Date.now() + serverTimeOffset;
  const isCoordinatorOffline = state?.marketState?.status === 'Open' &&
    (!coordinator || currentServerTime - (coordinator.lastActive || 0) > 8000);

  // Root Background Simulation Scheduler (Runs ONLY on the active Coordinator context)
  useEffect(() => {
    if (!state || !state.marketState || !state.marketState.simulationStartTime) return;
    
    // Lock background tasks to active coordinator ID to prevent race conditions
    if (!coordinator || coordinator.id !== MY_SESSION_UUID) return;

    const schedulerInterval = setInterval(async () => {
      const currentServerTime = Date.now() + serverTimeOffset;

      // 1. Calculate clock mappings and session state transition
      const clock = calculateMarketClock(state.marketState, serverTimeOffset);
      
      // Update session clock mappings in database if they changed
      if (
        clock.sessionState !== state.marketState.sessionState ||
        clock.timeString !== state.marketState.timeString ||
        clock.timeLeftString !== state.marketState.timeLeftString
      ) {
        let updatedStatus = state.marketState.status;
        if (clock.sessionState === 'CONTINUOUS_TRADING') {
          updatedStatus = 'Open';
        } else if (clock.sessionState === 'CLOSING' || clock.sessionState === 'MARKET_CLOSED' || clock.sessionState === 'RESULTS') {
          updatedStatus = 'Closed';
        }

        await update(ref(db, 'fms/marketState'), {
          status: updatedStatus,
          sessionState: clock.sessionState,
          timeString: clock.timeString,
          timeLeftString: clock.timeLeftString
        }).catch(e => console.error("Failed to sync sessionState clock:", e));
      }

      // If we are in CONTINUOUS TRADING, handle news and pending IPO transitions
      if (state.marketState.status === 'Open') {
        const elapsedMinutes = clock.elapsedMinutes;

        // B. Auto-Release Scenario News Bulletins every 40-50 seconds
        const currentSettings = state?.settings || {};
        if (currentSettings.autoNewsEnabled) {
          await apiFetch('/api/admin/tick-news', { method: 'POST' }).catch(() => {});
        }

        // C. Auto-activate pending IPOs after 90 seconds of staging
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

        // D. Periodic Auto-Backup (every 5 min in EVENT mode, every 2 min in DEMO mode)
        const isEventMode = state.marketState?.mode === 'EVENT';
        const backupIntervalMs = isEventMode ? 5 * 60 * 1000 : 2 * 60 * 1000;
        if (!lastAutoBackupRef.current || (currentServerTime - lastAutoBackupRef.current >= backupIntervalMs)) {
          lastAutoBackupRef.current = currentServerTime;
          await apiFetch('/api/admin/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(e => console.error("Periodic auto-backup notice:", e));
        }
      }
    }, 4000);

    return () => clearInterval(schedulerInterval);
  }, [state?.marketState, coordinator, serverTimeOffset, state?.firedPhoenixActs, state?.securities, state?.corporateActions, state?.settings?.autoNewsEnabled]);


  // Hash Router
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
      setAuthError('');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (authData) => {
    setIsAuthenticated(true);
    setUserRole(authData.role);
    setSessionUsername(authData.username || authData.teamCode || authData.role);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (e) {}
    sessionStorage.clear();
    localStorage.removeItem('saamx_token');
    setIsAuthenticated(false);
    setUserRole('');
    setSessionUsername('');
    window.location.hash = '#/';
  };

  // Verify server-side session token on load / refresh
  useEffect(() => {
    const token = sessionStorage.getItem('saamx_token');
    if (token) {
      apiFetch('/api/auth/me')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUserRole(data.role);
            setSessionUsername(data.username || data.teamCode || data.role);
            sessionStorage.setItem('saamx_role', data.role);
            sessionStorage.setItem('fms_role', data.role);
            sessionStorage.setItem('fms_authenticated', 'true');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('saamx_token');
          sessionStorage.removeItem('saamx_role');
          sessionStorage.removeItem('saamx_username');
          sessionStorage.removeItem('saamx_team_code');
          sessionStorage.removeItem('fms_authenticated');
          setIsAuthenticated(false);
          setUserRole('');
          setSessionUsername('');
        });
    }
  }, []);

  const getDefaultDeskForRole = (role) => {
    switch (role) {
      case 'team': return '#/team';
      case 'admin': return '#/admin';
      case 'verification': return '#/verification';
      case 'operator_x': return '#/exchange';
      case 'advisor': return '#/advisor';
      case 'sebi': return '#/sebi';
      case 'journalist': return '#/journalist';
      case 'judge': return '#/results';
      case 'portfolio': return '#/portfolio';
      default: return '#/';
    }
  };

  const isRouteAuthorized = (role, currentRoute) => {
    if (role === 'admin') return true;

    const roleDeskMap = {
      team: ['#/team', '#/advisor', '#/broker', '#/market-watch', '#/market-intelligence', '#/results'],
      verification: ['#/verification', '#/verification-desk', '#/market-watch', '#/results'],
      operator_x: ['#/exchange', '#/fx', '#/floor-ops', '#/verification', '#/market-watch', '#/portfolio', '#/results'],
      advisor: ['#/advisor', '#/broker', '#/market-watch', '#/results'],
      sebi: ['#/sebi', '#/floor-ops', '#/market-watch', '#/portfolio', '#/results'],
      journalist: ['#/journalist', '#/news', '#/newsroom', '#/news-room', '#/market-watch', '#/results'],
      judge: ['#/results', '#/market-watch'],
      portfolio: ['#/portfolio', '#/floor-ops', '#/market-watch', '#/results']
    };

    const allowedRoutes = roleDeskMap[role] || [];
    return allowedRoutes.some(p => currentRoute === p || currentRoute.startsWith(p + '/') || currentRoute.startsWith(p + '?'));
  };

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

  const currentPassword = sessionStorage.getItem('fms_password') || 'saamx-event-2026';

  const isPublicRoute = route === '#/' || route === '' || route === '#/home';
  const isLoginRoute = route === '#/login' || route.startsWith('#/login?') || route.startsWith('#/login/');
  const isProjectorRoute = route === '#/projector' || route.startsWith('#/projector?') || route.startsWith('#/projector/');
  const isPublicShell = isPublicRoute || isLoginRoute || isProjectorRoute;

  const normalizedState = {
    ...state,
    securities: Object.values(state?.securities || {}),
    teams: Object.values(state?.teams || {}),
    orders: Object.values(state?.orders || {}),
    transactions: Object.values(state?.transactions || {}),
    newsEvents: Object.values(state?.newsEvents || {}),
    corporateActions: Object.values(state?.corporateActions || {})
  };

  const renderContent = () => {
    // 1. Root / Public Landing Page
    if (isPublicRoute) {
      return <PublicLandingPage />;
    }

    // 2. Authentication Gateway Page
    if (isLoginRoute) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    // 3. Public Projector Broadcast
    if (isProjectorRoute) {
      return (
        <ProjectorPage
          state={normalizedState}
          takeoverEvent={normalizedState?.marketState?.takeoverEvent || null}
          onOpenProfile={openCompanyProfile}
        />
      );
    }

    // 4. All Other Internal Routes Require Authentication
    if (!isAuthenticated) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    // 5. Role-Based Route Authorization Gate
    if (!isRouteAuthorized(userRole, route)) {
      return (
        <div
          className="glass card"
          style={{
            maxWidth: '540px',
            margin: '80px auto',
            padding: '40px 32px',
            textAlign: 'center',
            borderTop: '6px solid var(--color-fall)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ fontSize: '2.8rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2.1rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.98rem' }}>
            Your session is authenticated as <strong>{(userRole || 'ANONYMOUS').toUpperCase()}</strong>, which does not have permission to access the <strong>{route.replace('#/', '').toUpperCase()}</strong> desk console.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={getDefaultDeskForRole(userRole)} className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 800 }}>
              Return to {(userRole || 'Home').toUpperCase()} Desk →
            </a>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '10px 20px', fontWeight: 700 }}>
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    // 6. Authorized Desk Routing
    switch (route) {
      case '#/admin':
        return <AdminPage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} connected={dbConnected} coordinator={coordinator} isCoordinatorOffline={isCoordinatorOffline} mySessionUuid={MY_SESSION_UUID} />;
      case '#/exchange':
        return <ExchangePage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} connected={dbConnected} isCoordinatorOffline={isCoordinatorOffline} />;
      case '#/verification':
      case '#/verification-desk':
        return <VerificationPage state={normalizedState} connected={dbConnected} />;
      case '#/sebi':
        return <SebiPage state={normalizedState} connected={dbConnected} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} coordinator={coordinator} isCoordinatorOffline={isCoordinatorOffline} mySessionUuid={MY_SESSION_UUID} />;
      case '#/journalist':
        return <JournalistPage state={normalizedState} adminPassword={currentPassword} />;
      case '#/portfolio':
        return <PortfolioPage state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/advisor':
      case '#/broker-desk':
      case '#/broker':
        return <BrokerAdvisoryTerminal state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/bull':
        return <BullTerminal state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/bear':
        return <BearTerminal state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/debate':
      case '#/bull-bear':
        return <BullBearDebatePage state={normalizedState} />;
      case '#/news':
      case '#/news-room':
      case '#/newsroom':
        return <NewsAnchorConsole state={normalizedState} />;
      case '#/training':
        return <TrainingPage state={normalizedState} />;
      case '#/fx':
        return <CurrencyExchangePage state={normalizedState} />;
      case '#/market-watch':
        return <MarketWatchPage state={normalizedState} onOpenProfile={openCompanyProfile} connected={dbConnected} />;
      case '#/market-intelligence':
        return <MarketIntelligencePage state={normalizedState} teamCode={sessionUsername || sessionStorage.getItem('fms_username') || 'T01'} onOpenProfile={openCompanyProfile} connected={dbConnected} />;
      case '#/team':
        return <ParticipantTerminal state={normalizedState} teamCode={sessionUsername || sessionStorage.getItem('fms_username')} onOpenProfile={openCompanyProfile} connected={dbConnected} isCoordinatorOffline={isCoordinatorOffline} />;
      case '#/register':
        return <RegistrationPage state={normalizedState} />;
      case '#/floor-ops':
        return <FloorOperationsDashboard state={normalizedState} />;
      case '#/results':
        return <ResultsPage state={normalizedState} />;
      case '#/home':
      case '#/':
      default:
        return <PublicLandingPage />;
    }
  };

  const renderNavTabs = () => {
    if (!isAuthenticated) return null;

    const tabs = [
      { name: 'Team Terminal', path: '#/team', routes: ['#/team'] },
      { name: 'Verification Desk', path: '#/verification', routes: ['#/verification', '#/verification-desk'] },
      { name: 'Exchange Desk', path: '#/exchange', routes: ['#/exchange'] },
      { name: 'Broker Advisor', path: '#/advisor', routes: ['#/advisor', '#/broker'] },
      { name: 'SEBI Surveillance', path: '#/sebi', routes: ['#/sebi'] },
      { name: 'Journalist Press', path: '#/journalist', routes: ['#/journalist'] },
      { name: 'Floor Director (Admin)', path: '#/admin', routes: ['#/admin'] },
      { name: 'Currency Desk', path: '#/fx', routes: ['#/fx'] },
      { name: 'Floor Operations', path: '#/floor-ops', routes: ['#/floor-ops'] },
      { name: 'Portfolios', path: '#/portfolio', routes: ['#/portfolio'] },
      { name: 'Market Watch', path: '#/market-watch', routes: ['#/market-watch'] },
      { name: 'Market Intelligence', path: '#/market-intelligence', routes: ['#/market-intelligence'] },
      { name: 'Competition Results', path: '#/results', routes: ['#/results'] },
      { name: 'Auditorium Projector', path: '#/projector', routes: ['#/projector'] }
    ];

    return tabs.map(tab => {
      let hasAccess = false;
      if (userRole === 'admin') {
        hasAccess = true;
      } else if (userRole === 'team') {
        hasAccess = ['Team Terminal', 'Market Watch', 'Market Intelligence', 'Broker Advisor', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'verification') {
        hasAccess = ['Verification Desk', 'Market Watch', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'advisor') {
        hasAccess = ['Broker Advisor', 'Market Watch', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'operator_x') {
        hasAccess = ['Exchange Desk', 'Currency Desk', 'Verification Desk', 'Floor Operations', 'Portfolios', 'Market Watch', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'sebi') {
        hasAccess = ['SEBI Surveillance', 'Floor Operations', 'Verification Desk', 'Portfolios', 'Market Watch', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'journalist') {
        hasAccess = ['Journalist Press', 'Market Watch', 'Market Intelligence', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'judge') {
        hasAccess = ['Competition Results', 'Market Watch', 'Auditorium Projector'].includes(tab.name);
      } else if (userRole === 'portfolio') {
        hasAccess = ['Portfolios', 'Floor Operations', 'Market Watch', 'Competition Results', 'Auditorium Projector'].includes(tab.name);
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

  const showIndicator = ['#/projector', '#/exchange', '#/sebi', '#/admin', '#/journalist', '#/training', '#/team'].includes(route);

  return (
    <div className="app-container" style={{ paddingTop: (!dbConnected || isCoordinatorOffline) ? '40px' : '0' }}>
      {!dbConnected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#b91c1c',
          color: '#ffffff',
          textAlign: 'center',
          padding: '8px',
          fontWeight: 'bold',
          zIndex: 99999,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          ⚠ Connection Interrupted — Trading Controls Disabled
        </div>
      )}

      {isCoordinatorOffline && dbConnected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#d97706',
          color: '#ffffff',
          textAlign: 'center',
          padding: '8px',
          fontWeight: 'bold',
          zIndex: 99999,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          ⚠ Coordinator Offline — Scheduled Tasks Suspended
        </div>
      )}

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

      {!isPublicShell && (
        <>
          <MarketStatusBar
            state={state}
            serverTimeOffset={serverTimeOffset}
            connected={dbConnected}
            coordinator={coordinator}
            isCoordinatorOffline={isCoordinatorOffline}
          />
          <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <a href={userRole ? getDefaultDeskForRole(userRole) : '#/'} className="logo-area">
                <div className="logo-avatar">🏛️</div>
                <div>
                  <div className="logo-title">SAAMX</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Student Asset Exchange
                  </div>
                </div>
              </a>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700 }}>
                <span className={`status-pulse-dot ${state?.marketState?.status === 'Open' ? '' : 'closed'}`} />
                <span style={{ color: state?.marketState?.status === 'Open' ? 'var(--color-rise)' : 'var(--color-ink-2)' }}>
                  {state?.marketState?.status === 'Open' ? 'MARKET OPEN' : (state?.marketState?.sessionState || 'PRE-OPEN')}
                </span>
              </div>

              <nav className="nav-tabs">
                {renderNavTabs()}
              </nav>
            </div>

            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '8px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-ink)' }}>
                    👤 <strong>{sessionUsername || userRole.toUpperCase()}</strong>
                  </span>
                  <span className="badge badge-public" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {userRole.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  LOGOUT ↩
                </button>
              </div>
            )}
          </header>
          <MarketTicker state={state} onOpenProfile={openCompanyProfile} />
        </>
      )}

      <main className="main-content" style={isPublicShell ? { padding: 0, maxWidth: '100%' } : {}}>
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
        <ConnectionIndicator connected={dbConnected} />
      )}
    </div>
  );
}
