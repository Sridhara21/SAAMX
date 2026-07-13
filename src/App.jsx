import React, { useState, useEffect } from 'react';
import AdminPage from './pages/AdminPage.jsx';
import ExchangePage from './pages/ExchangePage.jsx';
import SebiPage from './pages/SebiPage.jsx';
import ProjectorPage from './pages/ProjectorPage.jsx';
import JournalistPage from './pages/JournalistPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import CompanyProfileModal from './components/CompanyProfileModal.jsx';
import { useFirebaseState } from './hooks/useFirebaseState.js';
import { ConnectionIndicator } from './components/ConnectionIndicator.jsx';
import { apiFetch } from './lib/api.js';

const ADMIN_PASSWORD = 'fms-event-2026';
const JOURNALIST_PASSWORD = 'journalist-event-2026';

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const { state, connected } = useFirebaseState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);
  const [apiBaseInput, setApiBaseInput] = useState(localStorage.getItem('fms_api_base') || '');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState(localStorage.getItem('fms_db_url') || '');

  // Takeover Event state for Projector Page
  const [takeoverEvent, setTakeoverEvent] = useState(null);
  const [prevMarketState, setPrevMarketState] = useState(null);
  const [prevCorporateActionsLength, setPrevCorporateActionsLength] = useState(0);
  const [shownPendingIpoTickers, setShownPendingIpoTickers] = useState(new Set());

  // Timeout to show troubleshoot config
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshooting(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Automated takeover animation triggers from state changes
  useEffect(() => {
    if (!state || !state.marketState) return;

    if (!prevMarketState) {
      setPrevMarketState(state.marketState);
      const initialActions = state.corporateActions ? Object.keys(state.corporateActions).length : 0;
      setPrevCorporateActionsLength(initialActions);
      return;
    }

    // Opening Bell
    if (prevMarketState.status !== 'Open' && state.marketState.status === 'Open') {
      setTakeoverEvent({ type: 'OPENING_BELL' });
      setTimeout(() => setTakeoverEvent(null), 6000);
    }

    // Closing Bell
    if (prevMarketState.status !== 'Closed' && state.marketState.status === 'Closed') {
      setTakeoverEvent({ type: 'CLOSING_BELL' });
      setTimeout(() => setTakeoverEvent(null), 6000);
    }

    // Bankruptcy or halts detection
    const currentActions = state.corporateActions ? Object.values(state.corporateActions) : [];
    if (currentActions.length > prevCorporateActionsLength) {
      const latestAction = [...currentActions].sort((a, b) => b.triggeredAt - a.triggeredAt)[0];
      if (latestAction) {
        if (latestAction.actionType === 'Bankruptcy') {
          const sec = state.securities ? Object.values(state.securities).find(s => s.ticker === latestAction.securityId) : null;
          setTakeoverEvent({ type: 'BANKRUPTCY', ticker: latestAction.securityId, name: sec ? sec.name : (latestAction.details || '') });
          setTimeout(() => setTakeoverEvent(null), 10000);
        } else if (latestAction.actionType === 'CircuitBreaker') {
          const sec = state.securities ? Object.values(state.securities).find(s => s.ticker === latestAction.securityId) : null;
          setTakeoverEvent({ type: 'MARKET_HALT', ticker: latestAction.securityId, name: sec ? sec.name : (latestAction.details || '') });
          setTimeout(() => setTakeoverEvent(null), 6000);
        } else if (latestAction.actionType === 'IPO') {
          setTakeoverEvent({ type: 'IPO_LAUNCH', ticker: latestAction.ticker, name: latestAction.details || '' });
          setTimeout(() => setTakeoverEvent(null), 8000);
        }
      }
    }

    // IPO Pending takeover
    if (state.securities) {
      Object.values(state.securities).forEach(s => {
        if (s.status === 'IPO_PENDING' && !shownPendingIpoTickers.has(s.ticker)) {
          setShownPendingIpoTickers(prev => {
            const next = new Set(prev);
            next.add(s.ticker);
            return next;
          });
          setTakeoverEvent({ type: 'IPO_PENDING', ticker: s.ticker, name: s.name, ipoPrice: s.basePrice, availableUnits: s.totalUnits });
          setTimeout(() => setTakeoverEvent(null), 8000);
        }
      });
    }

    setPrevMarketState(state.marketState);
    setPrevCorporateActionsLength(currentActions.length);
  }, [state, prevMarketState, prevCorporateActionsLength, shownPendingIpoTickers]);

  // Hash Router
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
      setAuthError('');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAuth = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD || passwordInput === JOURNALIST_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_password', passwordInput);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Incorrect Console Access Password');
    }
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

  const requiresAuth = ['#/admin', '#/exchange', '#/sebi', '#/journalist', '#/portfolio'].includes(route);
  const authorized = isAuthenticated;

  const openCompanyProfile = (id) => {
    setSelectedSecurityId(id);
  };

  if (!state) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-paper)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <h2 style={{ color: 'var(--color-brass)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Loading FMS Terminal...</h2>
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
          <div className="form-group">
            <input
              type="password"
              className="input-field"
              placeholder="Console Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
          </div>
          {authError && <div style={{ color: 'var(--color-fall)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {authError}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enter Dashboard</button>
        </form>
      </div>
    );
  }

  const currentPassword = sessionStorage.getItem('fms_password') || ADMIN_PASSWORD;
  const isJournalistSession = currentPassword === JOURNALIST_PASSWORD;

  const renderContent = () => {
    if (isJournalistSession && ['#/admin', '#/exchange', '#/sebi', '#/portfolio'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>Journalist</strong> role, which does not have access to this desk console.</p>
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
        return <SebiPage state={normalizedState} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} />;
      case '#/projector':
        return <ProjectorPage state={normalizedState} takeoverEvent={takeoverEvent} onOpenProfile={openCompanyProfile} />;
      case '#/journalist':
        return <JournalistPage state={normalizedState} adminPassword={currentPassword} />;
      case '#/portfolio':
        return <PortfolioPage state={normalizedState} onOpenProfile={openCompanyProfile} />;
      case '#/results':
        return <ResultsPage state={normalizedState} />;
      case '#/home':
      case '#/':
      default:
        return <HomePage state={normalizedState} />;
    }
  };

  const showIndicator = ['#/projector', '#/exchange', '#/sebi', '#/admin', '#/journalist'].includes(route);

  return (
    <div className="app-container">
      {route !== '#/projector' && (
        <header className="app-header">
          <div className="logo-area">
            <div className="logo-avatar">F</div>
            <div className="logo-title">FMS Platform</div>
          </div>
          <nav className="nav-tabs">
            <a href="#/" className={`nav-link ${route === '#/' || route === '#/home' ? 'active' : ''}`}>Home</a>
            <a href="#/projector" className={`nav-link ${route === '#/projector' ? 'active' : ''}`}>Projector</a>
            <a href="#/portfolio" className={`nav-link ${route === '#/portfolio' ? 'active' : ''}`}>Portfolios</a>
            <a href="#/exchange" className={`nav-link ${route === '#/exchange' ? 'active' : ''}`}>Exchange</a>
            <a href="#/sebi" className={`nav-link ${route === '#/sebi' ? 'active' : ''}`}>SEBI</a>
            <a href="#/journalist" className={`nav-link ${route === '#/journalist' ? 'active' : ''}`}>Journalist</a>
            <a href="#/admin" className={`nav-link ${route === '#/admin' ? 'active' : ''}`}>Admin</a>
            <a href="#/results" className={`nav-link ${route === '#/results' ? 'active' : ''}`}>Results</a>
          </nav>
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
