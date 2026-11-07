import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { Button } from '../components/ui/Button.jsx';
import SaamxLogo from '../components/ui/SaamxLogo.jsx';
import {
  IconBuilding,
  IconLock,
  IconUser,
  IconArrowRight,
  IconShieldCheck,
  IconShieldAlert,
  IconChevronLeft
} from '../lib/icons.jsx';

const QUICK_FILL_PRESETS = {
  TEAM: [
    { label: 'T01 (Apex)', username: 'T01', password: 'saamx-team-01', color: 'var(--color-rise, #10B981)' },
    { label: 'T02 (Beacon)', username: 'T02', password: 'saamx-team-02', color: 'var(--color-rise, #10B981)' },
    { label: 'T03 (Citadel)', username: 'T03', password: 'saamx-team-03', color: 'var(--color-rise, #10B981)' },
    { label: 'Delegate (Aarav)', username: 'Aarav Mehta', password: 'password123', color: 'var(--color-accent, #00E5FF)' }
  ],
  STAFF: [
    { label: 'Admin', username: 'admin', password: 'saamx-event-2026', color: 'var(--color-fall, #EF4444)' },
    { label: 'Exchange', username: 'exchange', password: 'exchange-event-2026', color: 'var(--color-accent, #00E5FF)' },
    { label: 'Verification', username: 'verification', password: 'verification-desk-2026', color: 'var(--color-info, #3B82F6)' },
    { label: 'SEBI', username: 'sebi', password: 'sebi-event-2026', color: 'var(--color-warn, #F59E0B)' },
    { label: 'Advisor', username: 'advisor', password: 'advisor-desk-2026', color: '#8B5CF6' },
    { label: 'Journalist', username: 'journalist', password: 'press-wire-2026', color: '#EC4899' },
    { label: 'Super Admin', username: 'sridhara', password: '21112009', color: 'var(--color-warn, #F59E0B)' }
  ]
};

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [portalMode, setPortalMode] = useState('TEAM'); // 'TEAM' | 'STAFF'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingRegistrationInfo, setPendingRegistrationInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleQuickFill = (preset) => {
    setUsername(preset.username);
    setPassword(preset.password || '');
    setError('');
    setPendingRegistrationInfo(null);
  };

  // Extract redirect parameter from hash if present (e.g. #/login?redirect=%23%2Fverification)
  const getRedirectDestination = (userRole) => {
    try {
      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const query = new URLSearchParams(hash.substring(queryIdx + 1));
        const redirect = query.get('redirect');
        if (redirect && redirect.startsWith('#/')) {
          const safeDesks = {
            admin: true,
            team: ['#/team', '#/advisor', '#/market-watch', '#/market-intelligence', '#/results', '#/projector'],
            verification: ['#/exchange', '#/verification', '#/verification-desk', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/projector'],
            operator_x: ['#/exchange', '#/fx', '#/floor-ops', '#/verification', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/projector'],
            bank_teller: ['#/bank', '#/bank-desk', '#/settlement', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/projector'],
            advisor: ['#/advisor', '#/broker', '#/market-watch', '#/results', '#/projector'],
            sebi: ['#/sebi', '#/audit-log', '#/market-watch', '#/floor-ops', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/results', '#/projector'],
            journalist: ['#/journalist', '#/news', '#/market-watch', '#/results', '#/projector'],
            judge: ['#/results', '#/projector'],
            portfolio: ['#/portfolio', '#/floor-ops', '#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue', '#/market-watch', '#/results', '#/projector']
          };

          const allowed = safeDesks[userRole];
          if (allowed === true || (Array.isArray(allowed) && allowed.some(p => redirect.startsWith(p)))) {
            return redirect;
          }
        }
      }
    } catch (e) {}

    // Default destinations per role
    switch (userRole) {
      case 'team': return '#/team';
      case 'admin': return '#/admin';
      case 'verification': return '#/exchange';
      case 'operator_x': return '#/exchange';
      case 'bank_teller': return '#/bank';
      case 'advisor': return '#/advisor';
      case 'sebi': return '#/sebi';
      case 'journalist': return '#/journalist';
      case 'judge': return '#/results';
      case 'portfolio': return '#/portfolio';
      default: return '#/team';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError('Please provide both username/team code and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          teamCode: u,
          password: p
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.isPendingVerification) {
          setPendingRegistrationInfo({
            teamCode: data.teamCode,
            assignedDesk: data.assignedDesk,
            message: data.error || data.message
          });
        } else {
          setPendingRegistrationInfo(null);
        }
        setError(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }
      setPendingRegistrationInfo(null);

      // Persist server-verified session
      sessionStorage.setItem('saamx_token', data.token);
      sessionStorage.setItem('saamx_role', data.role);
      sessionStorage.setItem('saamx_username', data.username);
      if (data.isMaster || data.username?.toLowerCase() === 'sridhara') {
        sessionStorage.setItem('saamx_is_master', 'true');
      } else {
        sessionStorage.removeItem('saamx_is_master');
      }
      if (data.teamCode) {
        sessionStorage.setItem('saamx_team_code', data.teamCode);
      } else {
        sessionStorage.removeItem('saamx_team_code');
      }

      if (data.assignedDesk) {
        sessionStorage.setItem('saamx_assigned_desk', data.assignedDesk);
      } else {
        sessionStorage.removeItem('saamx_assigned_desk');
      }

      if (Array.isArray(data.permissions)) {
        sessionStorage.setItem('saamx_permissions', JSON.stringify(data.permissions));
      } else {
        sessionStorage.removeItem('saamx_permissions');
      }
      if (Array.isArray(data.selectedPages)) {
        sessionStorage.setItem('saamx_selected_pages', JSON.stringify(data.selectedPages));
      } else {
        sessionStorage.removeItem('saamx_selected_pages');
      }

      // Legacy compatibility
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_role', data.role);
      sessionStorage.setItem('fms_username', data.username);
      sessionStorage.setItem('fms_password', p);

      if (onLoginSuccess) {
        onLoginSuccess(data);
      }

      const destination = (Array.isArray(data.selectedPages) && data.selectedPages.length > 0)
        ? data.selectedPages[0]
        : getRedirectDestination(data.role);
      window.location.hash = destination;
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to reach authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #080D1A)',
        color: 'var(--color-ink, #F8FAFC)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        backgroundImage: 'radial-gradient(circle at 50% 0%, var(--color-surface-hover, rgba(0, 229, 255, 0.05)) 0%, transparent 70%)',
        transition: 'background-color var(--transition-normal, 0.25s ease), color var(--transition-normal, 0.25s ease)'
      }}
    >
      {/* Top Utility Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
        <a
          href="#/"
          style={{
            color: 'var(--color-accent, #00E5FF)',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            backgroundColor: 'var(--color-surface-2, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
            transition: 'all var(--transition-fast, 0.15s ease)'
          }}
          className="saamx-login-back-link"
        >
          <IconChevronLeft size={16} />
          <span>Return to Public Overview</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--color-surface-2, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary, #94A3B8)'
            }}
            className="desktop-only"
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-rise, #10B981)',
                display: 'inline-block'
              }}
            />
            <span>GATEWAY ONLINE</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Center Login Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box'
        }}
      >
        <div
          className="saamx-login-card saamx-card saamx-card-glass"
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl, 24px)',
            padding: '36px 32px',
            boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.03)',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Orange Glow Top Hairline */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))'
            }}
          />

          {/* SAAMX Brand Logo & Welcome Heading matching reference */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <SaamxLogo size="md" />
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                margin: '0 0 6px',
                fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
                letterSpacing: '-0.02em',
                color: 'var(--color-navy, #0B192C)'
              }}
            >
              Welcome Back!
            </h1>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-ink-secondary, #475569)',
                margin: 0,
                lineHeight: 1.5,
                fontFamily: "var(--font-body, 'Inter', sans-serif)"
              }}
            >
              Log in to continue your market journey.
            </p>
          </div>

          {/* Segmented Mode Tabs (Apple-style) */}
          <div
            role="tablist"
            aria-label="Terminal Access Mode"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              backgroundColor: 'var(--color-surface-2, #161D2B)',
              padding: '4px',
              borderRadius: 'var(--radius-md, 10px)',
              marginBottom: '18px',
              border: '1px solid var(--color-border)'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={portalMode === 'TEAM'}
              onClick={() => { setPortalMode('TEAM'); setError(''); setPendingRegistrationInfo(null); }}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
                backgroundColor: portalMode === 'TEAM' ? 'var(--color-surface, #121722)' : 'transparent',
                color: portalMode === 'TEAM' ? 'var(--color-accent, #00E5FF)' : 'var(--color-text-secondary, #94A3B8)',
                boxShadow: portalMode === 'TEAM' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Participant Station
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portalMode === 'STAFF'}
              onClick={() => { setPortalMode('STAFF'); setError(''); setPendingRegistrationInfo(null); }}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
                backgroundColor: portalMode === 'STAFF' ? 'var(--color-surface, #121722)' : 'transparent',
                color: portalMode === 'STAFF' ? 'var(--color-accent, #00E5FF)' : 'var(--color-text-secondary, #94A3B8)',
                boxShadow: portalMode === 'STAFF' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Staff & Officials
            </button>
          </div>

          {/* Quick-Fill Station Credentials Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted, #64748B)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>Quick-Fill Station Credentials</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--color-text-tertiary, #475569)' }}>Testing Shortcut</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {QUICK_FILL_PRESETS[portalMode].map((preset) => (
                <button
                  key={preset.username}
                  type="button"
                  onClick={() => handleQuickFill(preset)}
                  title={`Fill ${preset.label} credentials`}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    backgroundColor: username === preset.username ? 'var(--color-surface-hover, #1A2234)' : 'var(--color-surface-2, #161D2B)',
                    border: username === preset.username ? '1px solid var(--color-accent, #00E5FF)' : '1px solid var(--color-border)',
                    color: username === preset.username ? 'var(--color-accent, #00E5FF)' : 'var(--color-text-secondary, #94A3B8)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: preset.color }} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pending Registration Guidance Card */}
          {pendingRegistrationInfo && (
            <div
              style={{
                backgroundColor: 'var(--color-warn-bg, rgba(245, 158, 11, 0.12))',
                border: '1.5px solid var(--color-warn-border, rgba(245, 158, 11, 0.35))',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '18px'
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--color-warn, #F59E0B)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem' }}>
                <IconShieldAlert size={16} />
                <span>REGISTRATION PENDING CLEARANCE</span>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: 'var(--color-text-primary, #F8FAFC)', lineHeight: 1.5 }}>
                {pendingRegistrationInfo.message}
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary, #94A3B8)' }}>
                <strong>Allocated Code:</strong> {pendingRegistrationInfo.teamCode} &bull; <strong>Assigned Desk:</strong> {pendingRegistrationInfo.assignedDesk || 'Floor Desk'}
              </div>
            </div>
          )}

          {/* Error Notification */}
          {error && !pendingRegistrationInfo && (
            <div
              id="login-error-alert"
              role="alert"
              aria-live="assertive"
              style={{
                backgroundColor: 'var(--color-loss-bg, rgba(239, 68, 68, 0.12))',
                border: '1px solid var(--color-loss-border, rgba(239, 68, 68, 0.3))',
                color: 'var(--color-loss-text, #F87171)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 6px)',
                fontSize: '0.86rem',
                marginBottom: '20px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <span style={{ color: 'var(--color-loss, #EF4444)', marginTop: '2px', flexShrink: 0 }} aria-hidden="true">
                <IconShieldAlert size={18} />
              </span>
              <span style={{ flex: 1, lineHeight: 1.45 }}>{error}</span>
            </div>
          )}

          {/* Form Inputs with Explicit Label Matching and ARIA Binding */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="saamx-form-group" style={{ marginBottom: '18px' }}>
              <label htmlFor="login-username" className="saamx-label" style={{ color: 'var(--color-navy, #0B192C)' }}>
                {portalMode === 'TEAM' ? 'Email / Username or Team Code' : 'Staff Username or Identifier'}{' '}
                <span className="saamx-label-required">*</span>
              </label>
              <div className={`saamx-input-wrapper ${error ? 'has-error' : ''}`} style={{ backgroundColor: 'var(--color-surface, #FFFFFF)', borderRadius: '12px' }}>
                <span aria-hidden="true" className="saamx-input-prefix" style={{ color: 'var(--color-ink-muted, #94A3B8)' }}>
                  <IconUser size={18} />
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                  placeholder={portalMode === 'TEAM' ? 'Enter Team Code (e.g. T01)' : 'e.g. admin, exchange, sebi'}
                  autoFocus
                  required
                  autoComplete="username"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error-alert' : undefined}
                  className="saamx-input-control"
                  style={{
                    fontFamily: username ? "var(--font-mono, monospace)" : "inherit",
                    padding: '12px 14px',
                    fontSize: '0.94rem'
                  }}
                />
              </div>
            </div>

            <div className="saamx-form-group" style={{ marginBottom: '18px' }}>
              <label htmlFor="login-password" className="saamx-label" style={{ color: 'var(--color-navy, #0B192C)' }}>
                {portalMode === 'TEAM' ? 'Password or Access PIN' : 'Access Key or Official PIN'}{' '}
                <span className="saamx-label-required">*</span>
              </label>
              <div className={`saamx-input-wrapper ${error ? 'has-error' : ''}`} style={{ backgroundColor: 'var(--color-surface, #FFFFFF)', borderRadius: '12px' }}>
                <span aria-hidden="true" className="saamx-input-prefix" style={{ color: 'var(--color-ink-muted, #94A3B8)' }}>
                  <IconLock size={18} />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                  placeholder={portalMode === 'TEAM' ? 'Enter 4-digit PIN or password' : 'Enter Official Access Key'}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error-alert' : undefined}
                  className="saamx-input-control"
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.94rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 12px',
                    cursor: 'pointer',
                    color: 'var(--color-ink-muted, #94A3B8)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row matching reference */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                fontSize: '0.84rem'
              }}
            >
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-ink-secondary, #475569)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--color-orange, #FF6800)', cursor: 'pointer', width: '15px', height: '15px' }}
                />
                <span>Remember me</span>
              </label>

              <a
                href="#/register"
                onClick={(e) => {
                  e.preventDefault();
                  alert("To recover credentials, please refer to your physical registration receipt or contact the Floor Desk.");
                }}
                style={{
                  color: 'var(--color-orange, #FF6800)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              icon={<IconArrowRight size={16} />}
              iconPosition="right"
              style={{
                width: '100%',
                fontWeight: 800,
                fontSize: '1rem',
                letterSpacing: '0.02em',
                borderRadius: '9999px',
                padding: '14px',
                background: 'var(--color-orange-gradient, linear-gradient(135deg, #FF7700 0%, #EA580C 100%))',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 6px 20px -2px rgba(255, 104, 0, 0.45)'
              }}
            >
              {loading ? 'Verifying Session...' : 'Login →'}
            </Button>
          </form>

          {/* Registration Navigation Link */}
          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '0.86rem', color: 'var(--color-ink-secondary, #475569)' }}>
            Don't have an account?{' '}
            <a
              href="#/register"
              style={{
                color: 'var(--color-orange, #FF6800)',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Register here
            </a>
          </div>

          {/* Institutional Credentials Reference */}
          <div
            style={{
              marginTop: '22px',
              padding: '14px 16px',
              backgroundColor: 'var(--color-surface-2, #161D2B)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.76rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.55
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-accent, #00E5FF)',
                fontWeight: 700,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: '0.72rem'
              }}
            >
              <IconShieldCheck size={14} />
              <span>Institutional Credentials Guide</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Team Stations:</strong> Code{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>T01</code>–
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>T20</code> + designated PIN.
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Exchange Desks:</strong>{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>verification</code>,{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>exchange</code>.
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Regulator & Press:</strong>{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>sebi</code>,{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>journalist</code>,{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>advisor</code>.
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Administration:</strong>{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>admin</code> or{' '}
                <code style={{ fontFamily: 'var(--font-mono)', padding: '1px 4px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', border: '1px solid var(--color-border)' }}>sridhara</code>.
              </div>
            </div>
          </div>
        </div>

        {/* Security Watermark & Audit Notice */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            color: 'var(--color-text-muted, #64748B)',
            textAlign: 'center'
          }}
        >
          <IconShieldCheck size={14} color="var(--color-accent, #00E5FF)" />
          <span>SAAMX Security Gateway • All authentication events are cryptographically recorded in the audit ledger.</span>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: 'var(--color-text-muted, #64748B)',
          boxSizing: 'border-box'
        }}
        className="saamx-login-footer"
      >
        <span>Student Academic Asset Market eXchange (SAAMX)</span>
        <span>Institutional Financial Simulator</span>
      </footer>
    </div>
  );
}
