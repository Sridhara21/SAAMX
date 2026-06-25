import React, { useState, useEffect, useRef } from 'react';
import AdminPage from './pages/AdminPage.jsx';
import ExchangePage from './pages/ExchangePage.jsx';
import SebiPage from './pages/SebiPage.jsx';
import ProjectorPage from './pages/ProjectorPage.jsx';
import JournalistPage from './pages/JournalistPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import CompanyProfileModal from './components/CompanyProfileModal.jsx';

const ADMIN_PASSWORD = 'fms-event-2026';
const JOURNALIST_PASSWORD = 'journalist-event-2026';

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [state, setState] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  
  // Selected security for Company Profile Modal
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);

  // Takeover animation state
  const [takeoverEvent, setTakeoverEvent] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000);

  // Hash Router
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
      setAuthError('');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch full state REST fallback & sync
  const fetchCurrentState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setActiveAlerts(data.activeAlerts);
      }
    } catch (err) {
      console.error('Error fetching state via REST:', err);
    }
  };

  // WebSocket connection & management
  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setConnected(true);
      setReconnecting(false);
      reconnectDelayRef.current = 1000;
      fetchCurrentState();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.state) {
        setState(message.state);
      }
      if (message.activeAlerts) {
        setActiveAlerts(message.activeAlerts);
      }

      // Handle Takeover Animations
      const animations = [
        'OPENING_BELL', 'CLOSING_BELL', 'MARKET_HALT', 
        'BANKRUPTCY', 'IPO_LAUNCH', 'DIVIDEND_ANNOUNCEMENT', 'STOCK_SPLIT'
      ];
      if (animations.includes(message.type)) {
        setTakeoverEvent(message);
        setTimeout(() => setTakeoverEvent(null), 6000); // 6 seconds duration
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket connection closed.');
      setConnected(false);
      setReconnecting(true);
      
      const nextDelay = Math.min(reconnectDelayRef.current * 2, 10000);
      reconnectDelayRef.current = nextDelay;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, nextDelay);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
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

  // Helper to open company profile
  const openCompanyProfile = (id) => {
    setSelectedSecurityId(id);
  };

  if (!state) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-paper)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-brass)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Loading FMS Terminal...</h2>
          <div style={{ color: 'var(--color-ink-2)' }}>Syncing real-time market engine</div>
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

  // Render Page Content
  const renderContent = () => {
    // Role boundary checks for Journalist
    if (isJournalistSession && ['#/admin', '#/exchange', '#/sebi', '#/portfolio'].includes(route)) {
      return (
        <div className="glass card" style={{ maxWidth: '500px', margin: '80px auto', padding: '32px', textAlign: 'center', borderTop: '6px solid var(--color-fall)' }}>
          <h2 style={{ color: 'var(--color-fall)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '2rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-ink-2)', marginBottom: '24px' }}>Your session is authenticated under the <strong>Journalist</strong> role, which does not have access to this desk console.</p>
          <a href="#/" className="btn btn-primary">Return to Gateway</a>
        </div>
      );
    }

    switch (route) {
      case '#/admin':
        return <AdminPage state={state} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} activeAlerts={activeAlerts} />;
      case '#/exchange':
        return <ExchangePage state={state} onOpenProfile={openCompanyProfile} adminPassword={currentPassword} />;
      case '#/sebi':
        return <SebiPage state={state} onOpenProfile={openCompanyProfile} activeAlerts={activeAlerts} adminPassword={currentPassword} />;
      case '#/projector':
        return <ProjectorPage state={state} takeoverEvent={takeoverEvent} onOpenProfile={openCompanyProfile} />;
      case '#/journalist':
        return <JournalistPage state={state} adminPassword={currentPassword} />;
      case '#/portfolio':
        return <PortfolioPage state={state} onOpenProfile={openCompanyProfile} />;
      case '#/results':
        return <ResultsPage state={state} />;
      case '#/home':
      case '#/':
      default:
        return <HomePage state={state} />;
    }
  };

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

      {/* Global Company Profile Modal */}
      {selectedSecurityId && (
        <CompanyProfileModal
          securityId={selectedSecurityId}
          securities={state.securities}
          newsEvents={state.newsEvents}
          onClose={() => setSelectedSecurityId(null)}
        />
      )}

      {/* Disconnect indicator */}
      {reconnecting && (
        <div className="reconnection-indicator">
          <span>⚠️</span> Reconnecting to FMS Engine...
        </div>
      )}
    </div>
  );
}
