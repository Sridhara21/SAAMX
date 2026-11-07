import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import PublicLandingPage from './pages/PublicLandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Lazy-loaded desk consoles for code splitting and runtime responsiveness
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const ExchangePage = lazy(() => import('./pages/ExchangePage.jsx'));
const SebiPage = lazy(() => import('./pages/SebiPage.jsx'));
const ProjectorPage = lazy(() => import('./pages/ProjectorPage.jsx'));
const JournalistPage = lazy(() => import('./pages/JournalistPage.jsx'));
const ResultsPage = lazy(() => import('./pages/ResultsPage.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx'));
const ParticipantTerminal = lazy(() => import('./pages/ParticipantTerminal.jsx'));
const TrainingTerminal = lazy(() => import('./pages/TrainingTerminal.jsx'));
const TrainingPage = lazy(() => import('./pages/TrainingPage.jsx'));
const CurrencyExchangePage = lazy(() => import('./pages/CurrencyExchangePage.jsx'));
const BrokerAdvisoryTerminal = lazy(() => import('./pages/BrokerAdvisoryTerminal.jsx'));
const BullTerminal = lazy(() => import('./pages/BullTerminal.jsx'));
const BearTerminal = lazy(() => import('./pages/BearTerminal.jsx'));
const BullBearDebatePage = lazy(() => import('./pages/BullBearDebatePage.jsx'));
const NewsAnchorConsole = lazy(() => import('./pages/NewsAnchorConsole.jsx'));
const MarketIntelligencePage = lazy(() => import('./pages/MarketIntelligencePage.jsx'));
const MarketWatchPage = lazy(() => import('./pages/MarketWatchPage.jsx'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage.jsx'));
const FloorOperationsDashboard = lazy(() => import('./pages/FloorOperationsDashboard.jsx'));
const PersonnelManagementPage = lazy(() => import('./pages/PersonnelManagementPage.jsx'));
const BankPage = lazy(() => import('./pages/BankPage.jsx'));
const DeskQueueDashboard = lazy(() => import('./pages/DeskQueueDashboard.jsx'));
const TechOpsMonitoringPage = lazy(() => import('./pages/TechOpsMonitoringPage.jsx'));
const NewsControllerConsole = lazy(() => import('./pages/NewsControllerConsole.jsx'));
import { DrawerProvider } from './context/DrawerContext.jsx';
import DrawerManager, { DRAWER_TYPES } from './components/DrawerManager.jsx';
import FloatingCommandDock from './components/FloatingCommandDock.jsx';
import CompanyProfileModal from './components/CompanyProfileModal.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import SaamxLogo from './components/ui/SaamxLogo.jsx';
import { IconMenu, IconUser, IconCrown, IconLogOut, IconSearch, IconBell } from './lib/icons.jsx';
import { useFirebaseState } from './hooks/useFirebaseState.js';
import { ConnectionIndicator } from './components/ConnectionIndicator.jsx';
import MarketStatusBar from './components/MarketStatusBar.jsx';
import MarketTicker from './components/MarketTicker.jsx';
import { apiFetch, calculateMarketClock } from './lib/api.js';
import { db, ref, onValue } from './lib/firebase.js';
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

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        color: 'var(--color-ink-secondary, #64748B)'
      }}
    >
      <div
        className="saamx-spinner"
        style={{
          width: '38px',
          height: '38px',
          border: '3px solid var(--color-border, #CBD5E1)',
          borderTopColor: 'var(--color-accent, #2563EB)',
          borderRadius: '50%',
          animation: 'saamx-spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: '0.86rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)' }}>
        INITIALIZING TERMINAL...
      </span>
    </div>
  );
}

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
  const [grantedPermissions, setGrantedPermissions] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('saamx_permissions') || '[]');
    } catch (e) { return []; }
  });
  const [grantedPages, setGrantedPages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('saamx_selected_pages') || '[]');
    } catch (e) { return []; }
  });
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);
  const [apiBaseInput, setApiBaseInput] = useState(localStorage.getItem('fms_api_base') || '');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState(localStorage.getItem('fms_db_url') || '');

  // Responsive Sidebar Navigation state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('saamx_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('saamx_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Close mobile drawer upon route transition
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [route]);

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
    }, () => {
      // Handled gracefully under Phase 4 zero-trust isolation
    });
    return () => unsub();
  }, []);

  // Heartbeat loop for active Admin/SEBI role
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'sebi') return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/coordinator/claim', {
          method: 'POST',
          body: JSON.stringify({
            role: userRole,
            sessionUuid: MY_SESSION_UUID
          })
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.coordinator) {
            setCoordinator(data.coordinator);
          }
        }
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    }, 2000);

    return () => clearInterval(heartbeatInterval);
  }, [userRole, serverTimeOffset, coordinator?.claimedAt]);

  const currentServerTime = Date.now() + serverTimeOffset;
  const isCoordinatorOffline = state?.marketState?.status === 'Open' &&
    !dbConnected &&
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

        await apiFetch('/api/market/control', {
          method: 'POST',
          body: JSON.stringify({
            status: updatedStatus,
            sessionState: clock.sessionState
          })
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

        // C. Auto-activate pending IPOs after 90 seconds of staging (only legacy unstaged IPOs)
        const securitiesList = state.securities ? Object.values(state.securities) : [];
        const pendingIpos = securitiesList.filter(s => s.status === 'IPO_PENDING' && !s.isIpo && !s.ipoStage);
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
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (authData) => {
    setIsAuthenticated(true);
    setUserRole(authData.role);
    setSessionUsername(authData.username || authData.teamCode || authData.role);
    if (Array.isArray(authData.permissions)) {
      setGrantedPermissions(authData.permissions);
      sessionStorage.setItem('saamx_permissions', JSON.stringify(authData.permissions));
    }
    if (Array.isArray(authData.selectedPages)) {
      setGrantedPages(authData.selectedPages);
      sessionStorage.setItem('saamx_selected_pages', JSON.stringify(authData.selectedPages));
    }
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
    setGrantedPermissions([]);
    setGrantedPages([]);
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
            if (Array.isArray(data.permissions)) {
              setGrantedPermissions(data.permissions);
              sessionStorage.setItem('saamx_permissions', JSON.stringify(data.permissions));
            }
            if (Array.isArray(data.selectedPages)) {
              setGrantedPages(data.selectedPages);
              sessionStorage.setItem('saamx_selected_pages', JSON.stringify(data.selectedPages));
            }
          }
        })
        .catch(() => {
          sessionStorage.removeItem('saamx_token');
          sessionStorage.removeItem('saamx_role');
          sessionStorage.removeItem('saamx_username');
          sessionStorage.removeItem('saamx_team_code');
          sessionStorage.removeItem('saamx_permissions');
          sessionStorage.removeItem('saamx_selected_pages');
          sessionStorage.removeItem('fms_authenticated');
          setIsAuthenticated(false);
          setUserRole('');
          setSessionUsername('');
          setGrantedPermissions([]);
          setGrantedPages([]);
        });
    }
  }, []);

  const getDefaultDeskForRole = (role) => {
    if (grantedPages && grantedPages.length > 0) {
      return grantedPages[0];
    }
    switch (role) {
      case 'team': return '#/team';
      case 'admin': return '#/admin';
      case 'bank_teller': return '#/bank';
      case 'verification': return '#/exchange';
      case 'operator_x': return '#/exchange';
      case 'advisor': return '#/advisor';
      case 'sebi': return '#/sebi';
      case 'news_controller': return '#/news-controller';
      case 'journalist': return '#/journalist';
      case 'judge': return '#/results';
      case 'portfolio': return '#/portfolio';
      default: return '#/';
    }
  };

  const isRouteAuthorized = (role, currentRoute) => {
    if (role === 'admin' || role === 'super_admin') return true;

    // Public portals & directory are authorized for all roles
    if (currentRoute === '#/portals' || currentRoute === '#portals' ||
        currentRoute.startsWith('#/portals?') || currentRoute.startsWith('#/portals/') ||
        currentRoute === '#/directory' || currentRoute === '#directory' ||
        currentRoute.startsWith('#/directory?') || currentRoute.startsWith('#/directory/')) {
      return true;
    }

    // Training sandbox terminal is authorized for all authenticated roles
    if (currentRoute === '#/training' || currentRoute === '#training' ||
        currentRoute.startsWith('#/training?') || currentRoute.startsWith('#/training/')) {
      return true;
    }

    // Multi-page staff access override: if explicitly granted this page
    if (grantedPages && grantedPages.length > 0) {
      if (grantedPages.some(p => currentRoute === p || currentRoute.startsWith(p + '/') || currentRoute.startsWith(p + '?'))) {
        return true;
      }
    }

    const roleDeskMap = {
      team: ['#/team', '#/bank', '#/bank-desk', '#/settlement', '#/advisor', '#/broker', '#/bull', '#/bear', '#/bull-terminal', '#/bear-terminal', '#/market-watch', '#/market-intelligence', '#/results', '#/training'],
      bank_teller: ['#/bank', '#/bank-desk', '#/settlement', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/training'],
      verification: ['#/exchange', '#/verification', '#/verification-desk', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/training'],
      operator_x: ['#/exchange', '#/fx', '#/floor-ops', '#/verification', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/portfolio', '#/results', '#/training'],
      advisor: ['#/advisor', '#/broker', '#/bull', '#/bear', '#/bull-terminal', '#/bear-terminal', '#/debate', '#/market-watch', '#/results', '#/training'],
      sebi: ['#/sebi', '#/tech-ops', '#/monitoring', '#/bank', '#/bank-desk', '#/settlement', '#/floor-ops', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/portfolio', '#/results', '#/training'],
      news_controller: ['#/news-controller', '#/news-control', '#/journalist', '#/news', '#/anchor', '#/market-watch', '#/results', '#/training'],
      journalist: ['#/journalist', '#/news', '#/newsroom', '#/news-room', '#/anchor', '#/market-watch', '#/results', '#/training'],
      judge: ['#/results', '#/market-watch', '#/training'],
      portfolio: ['#/portfolio', '#/floor-ops', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/training']
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
            The Firebase Realtime Database for project <strong>fmos-a6573</strong> is currently empty. Initialize it now with the complete 2,000+ securities universe and retail teams.
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

  const currentPassword = sessionStorage.getItem('fms_password') || '';

  const isPublicRoute = route === '#/' || route === '' || route === '#/home' || route === '#home';
  const isPortalsRoute = route === '#/portals' || route === '#portals' || route.startsWith('#/portals?') || route.startsWith('#/portals/') ||
                         route === '#/directory' || route === '#directory' || route.startsWith('#/directory?') || route.startsWith('#/directory/');
  const isLoginRoute = route === '#/login' || route.startsWith('#/login?') || route.startsWith('#/login/');
  const isProjectorRoute = route === '#/projector' || route.startsWith('#/projector?') || route.startsWith('#/projector/');
  const isRegisterRoute = route === '#/register' || route.startsWith('#/register?') || route.startsWith('#/register/');
  const isPublicShell = isPublicRoute || isPortalsRoute || isLoginRoute || isProjectorRoute || isRegisterRoute;

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
    let content = null;

    // 1. Root / Public Landing Page
    if (isPublicRoute) {
      content = <PublicLandingPage />;
    } else if (isPortalsRoute) {
      // 1b. Public Portals Directory (Feature 16: Accessible to unauthenticated visitors)
      content = <HomePage state={normalizedState} connected={dbConnected} />;
    } else if (isLoginRoute) {
      // 2. Authentication Gateway Page
      content = <LoginPage onLoginSuccess={handleLoginSuccess} />;
    } else if (isProjectorRoute) {
      // 3. Public Projector Broadcast
      content = (
        <ProjectorPage
          state={normalizedState}
          takeoverEvent={normalizedState?.marketState?.takeoverEvent || null}
          onOpenProfile={openCompanyProfile}
          connected={dbConnected}
          isCoordinatorOffline={isCoordinatorOffline}
        />
      );
    } else if (isRegisterRoute) {
      // 3b. Public Team Registration Page
      content = <RegistrationPage state={normalizedState} onNavigateHome={() => { window.location.hash = '#/'; }} />;
    } else if (!isAuthenticated) {
      // 4. All Other Internal Routes Require Authentication
      content = <LoginPage onLoginSuccess={handleLoginSuccess} />;
    } else if (!isRouteAuthorized(userRole, route)) {
      // 5. Role-Based Route Authorization Gate
      content = (
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
    } else {
      // 6. Authorized Desk Routing
      switch (route) {
        case '#/tech-ops':
        case '#/monitoring':
          content = <TechOpsMonitoringPage state={normalizedState} connected={dbConnected} />;
          break;
        case '#/admin':
          content = <AdminPage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} connected={dbConnected} coordinator={coordinator} isCoordinatorOffline={isCoordinatorOffline} mySessionUuid={MY_SESSION_UUID} />;
          break;
        case '#/exchange':
        case '#/verification':
        case '#/verification-desk':
          content = <ExchangePage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} connected={dbConnected} isCoordinatorOffline={isCoordinatorOffline} />;
          break;
        case '#/sebi':
          content = <SebiPage state={normalizedState} connected={dbConnected} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} coordinator={coordinator} isCoordinatorOffline={isCoordinatorOffline} mySessionUuid={MY_SESSION_UUID} />;
          break;
        case '#/news-controller':
        case '#/news-control':
          content = <NewsControllerConsole state={normalizedState} adminPassword={currentPassword} />;
          break;
        case '#/journalist':
          content = <JournalistPage state={normalizedState} adminPassword={currentPassword} />;
          break;
        case '#/portfolio':
          content = <PortfolioPage state={normalizedState} onOpenProfile={openCompanyProfile} />;
          break;
        case '#/advisor':
        case '#/broker-desk':
        case '#/broker':
          content = <BrokerAdvisoryTerminal state={normalizedState} onOpenProfile={openCompanyProfile} initialView="advisory" />;
          break;
        case '#/bull':
        case '#/bull-terminal':
          content = <BrokerAdvisoryTerminal state={normalizedState} onOpenProfile={openCompanyProfile} initialView="bull" />;
          break;
        case '#/bear':
        case '#/bear-terminal':
          content = <BrokerAdvisoryTerminal state={normalizedState} onOpenProfile={openCompanyProfile} initialView="bear" />;
          break;
        case '#/debate':
          content = <BullBearDebatePage state={normalizedState} />;
          break;
        case '#/bull-bear':
          content = <BrokerAdvisoryTerminal state={normalizedState} onOpenProfile={openCompanyProfile} initialView="bull" />;
          break;
        case '#/news':
        case '#/news-room':
        case '#/newsroom':
        case '#/anchor':
          content = <JournalistPage state={normalizedState} adminPassword={currentPassword} initialMode="anchor" />;
          break;
        case '#/training':
          content = <TrainingTerminal state={normalizedState} />;
          break;
        case '#/fx':
          content = <CurrencyExchangePage state={normalizedState} connected={dbConnected} />;
          break;
        case '#/bank':
        case '#/bank-desk':
        case '#/settlement':
          content = <BankPage state={normalizedState} connected={dbConnected} />;
          break;
        case '#/market-watch':
          content = <MarketWatchPage state={normalizedState} onOpenProfile={openCompanyProfile} connected={dbConnected} />;
          break;
        case '#/market-intelligence':
          content = <MarketIntelligencePage state={normalizedState} teamCode={sessionUsername || sessionStorage.getItem('fms_username') || 'T01'} onOpenProfile={openCompanyProfile} connected={dbConnected} />;
          break;
        case '#/team':
        case '#/terminal':
          content = <ParticipantTerminal state={normalizedState} teamCode={sessionUsername || sessionStorage.getItem('fms_username')} onOpenProfile={openCompanyProfile} connected={dbConnected} isCoordinatorOffline={isCoordinatorOffline} />;
          break;
        case '#/register':
          content = <RegistrationPage state={normalizedState} onNavigateHome={() => { window.location.hash = '#/'; }} />;
          break;
        case '#/floor-ops':
          content = <FloorOperationsDashboard state={normalizedState} />;
          break;
        case '#/desk-queues':
        case '#/desk-dashboard':
        case '#/queue-dashboard':
        case '#/desk-queue':
          content = <DeskQueueDashboard state={normalizedState} connected={dbConnected} isCoordinatorOffline={isCoordinatorOffline} onOpenProfile={openCompanyProfile} />;
          break;
        case '#/personnel':
        case '#/personnel-management':
          content = <PersonnelManagementPage state={normalizedState} adminPassword={currentPassword} />;
          break;
        case '#/results':
          content = <ResultsPage state={normalizedState} />;
          break;
        case '#/portals':
        case '#/directory':
          content = <HomePage state={normalizedState} connected={dbConnected} />;
          break;
        case '#/home':
        case '#/':
        default:
          content = <PublicLandingPage />;
          break;
      }
    }

    return (
      <Suspense fallback={<PageLoadingFallback />}>
        {content}
      </Suspense>
    );
  };

  const showIndicator = ['#/projector', '#/exchange', '#/sebi', '#/admin', '#/journalist', '#/training', '#/team'].includes(route);

  return (
    <DrawerProvider>
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
            <DrawerManager
              userRole={userRole}
              sessionUsername={sessionUsername}
              currentRoute={route}
              state={state}
              grantedPermissions={grantedPermissions}
              grantedPages={grantedPages}
              onNavigate={(newRoute) => {
                window.location.hash = newRoute;
              }}
              onSelectSecurity={(secId) => {
                openCompanyProfile(secId);
              }}
              onLogout={handleLogout}
            />

            <div className="saamx-app-shell">
              <MarketStatusBar
                state={state}
                serverTimeOffset={serverTimeOffset}
                connected={dbConnected}
                coordinator={coordinator}
                isCoordinatorOffline={isCoordinatorOffline}
              />

              <header className="app-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px',
                background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--color-border)',
                gap: '16px',
                zIndex: 100
              }}>
                {/* Left: Mobile Toggle & Brand / Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="saamx-mobile-menu-btn mobile-only"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('saamx_open_drawer', { detail: { drawer: DRAWER_TYPES.PORTALS } }));
                    }}
                    aria-label="Toggle navigation drawer"
                  >
                    <IconMenu size={18} />
                  </button>

                  <a href="#/team" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <SaamxLogo size="sm" showSubtitle={false} />
                  </a>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(11, 25, 44, 0.04)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}>
                    <span className={`status-pulse-dot ${state?.marketState?.status === 'Open' ? '' : 'closed'}`} />
                    <span style={{ color: state?.marketState?.status === 'Open' ? 'var(--color-rise)' : 'var(--color-ink-2)' }}>
                      {state?.marketState?.status === 'Open' ? 'MARKET OPEN' : (state?.marketState?.sessionState || 'PRE-OPEN')}
                    </span>
                  </div>
                </div>

                {/* Center: Global Securities & Intelligence Search Bar */}
                <div
                  style={{
                    flex: '1 1 auto',
                    maxWidth: '480px',
                    margin: '0 8px',
                    position: 'relative'
                  }}
                >
                  <div
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('saamx_open_drawer', { detail: { drawer: DRAWER_TYPES.SEARCH } }));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 2px 8px rgba(11, 25, 44, 0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Search securities, tickers, or companies"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        window.dispatchEvent(new CustomEvent('saamx_open_drawer', { detail: { drawer: DRAWER_TYPES.SEARCH } }));
                      }
                    }}
                  >
                    <IconSearch size={16} color="var(--color-ink-muted, #94A3B8)" />
                    <span style={{
                      fontSize: '0.84rem',
                      color: 'var(--color-ink-muted, #94A3B8)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      Search securities, tickers, or companies...
                    </span>
                    <kbd style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(11, 25, 44, 0.06)',
                      color: 'var(--color-ink-secondary, #64748B)',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      Ctrl+K
                    </kbd>
                  </div>
                </div>

                {/* Right: Actions, Notifications, Theme, Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {/* Notification Bell */}
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('saamx_open_drawer', { detail: { drawer: DRAWER_TYPES.PORTALS } }));
                    }}
                    style={{
                      background: 'rgba(11, 25, 44, 0.04)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      color: 'var(--color-navy, #0B192C)'
                    }}
                    aria-label="View announcements and notifications"
                    title="View announcements"
                  >
                    <IconBell size={17} />
                    {(state?.newsEvents && Object.keys(state.newsEvents).length > 0) && (
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '7px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-orange, #FF6800)',
                        boxShadow: '0 0 0 2px var(--color-surface, #FFFFFF)'
                      }} />
                    )}
                  </button>

                  <ThemeToggle />

                  {isAuthenticated && (() => {
                    const isMaster = sessionUsername?.toLowerCase() === 'sridhara' || sessionStorage.getItem('saamx_is_master') === 'true';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          backgroundColor: isMaster ? 'rgba(212, 175, 55, 0.15)' : 'rgba(11, 25, 44, 0.04)',
                          border: isMaster ? '1px solid #D4AF37' : '1px solid var(--color-border)',
                          boxShadow: isMaster ? '0 0 12px rgba(212, 175, 55, 0.25)' : 'none'
                        }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: isMaster ? '#D4AF37' : 'var(--color-navy, #0B192C)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.72rem'
                          }}>
                            {isMaster ? <IconCrown size={14} style={{ color: '#070A0F' }} /> : (sessionUsername ? sessionUsername.charAt(0).toUpperCase() : 'U')}
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: isMaster ? '#B45309' : 'var(--color-navy, #0B192C)', fontWeight: 800 }}>
                            {sessionUsername || userRole.toUpperCase()}
                          </span>
                          <span className={isMaster ? 'badge' : 'badge badge-public'} style={{
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            backgroundColor: isMaster ? '#D4AF37' : 'rgba(11, 25, 44, 0.08)',
                            color: isMaster ? '#070A0F' : 'var(--color-navy, #0B192C)',
                            fontWeight: 800
                          }}>
                            {isMaster ? 'MASTER' : userRole.toUpperCase()}
                          </span>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="saamx-btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-ink-secondary, #64748B)'
                          }}
                        >
                          LOGOUT <IconLogOut size={12} />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </header>

              <MarketTicker state={state} onOpenProfile={openCompanyProfile} />

              <main className="main-content">
                {renderContent()}
              </main>
            </div>

            <FloatingCommandDock
              activeRoute={route}
              userRole={userRole}
              sessionUsername={sessionUsername}
              dbConnected={dbConnected}
              serverTimeOffset={serverTimeOffset}
              onLogout={handleLogout}
            />
          </>
        )}

        {isPublicShell && (
          <main className="main-content" style={{ padding: 0, maxWidth: '100%' }}>
            {renderContent()}
          </main>
        )}

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
    </DrawerProvider>
  );
}
