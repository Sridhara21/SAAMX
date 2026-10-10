import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract redirect parameter from hash if present (e.g. #/login?redirect=%23%2Fverification)
  const getRedirectDestination = (userRole) => {
    try {
      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const query = new URLSearchParams(hash.substring(queryIdx + 1));
        const redirect = query.get('redirect');
        if (redirect && redirect.startsWith('#/')) {
          // Check if userRole is authorized for the requested destination
          const safeDesks = {
            admin: true,
            team: ['#/team', '#/advisor', '#/market-watch', '#/market-intelligence', '#/results', '#/projector'],
            verification: ['#/verification', '#/verification-desk', '#/market-watch', '#/results', '#/projector'],
            operator_x: ['#/exchange', '#/fx', '#/floor-ops', '#/verification', '#/market-watch', '#/results', '#/projector'],
            advisor: ['#/advisor', '#/broker', '#/market-watch', '#/results', '#/projector'],
            sebi: ['#/sebi', '#/audit-log', '#/market-watch', '#/floor-ops', '#/results', '#/projector'],
            journalist: ['#/journalist', '#/news', '#/market-watch', '#/results', '#/projector'],
            judge: ['#/results', '#/projector']
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
      case 'verification': return '#/verification';
      case 'operator_x': return '#/exchange';
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
        setError(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Persist server-verified session
      sessionStorage.setItem('saamx_token', data.token);
      sessionStorage.setItem('saamx_role', data.role);
      sessionStorage.setItem('saamx_username', data.username);
      if (data.teamCode) {
        sessionStorage.setItem('saamx_team_code', data.teamCode);
      } else {
        sessionStorage.removeItem('saamx_team_code');
      }

      // Legacy compatibility
      sessionStorage.setItem('fms_authenticated', 'true');
      sessionStorage.setItem('fms_role', data.role);
      sessionStorage.setItem('fms_username', data.username);
      sessionStorage.setItem('fms_password', p);

      if (onLoginSuccess) {
        onLoginSuccess(data);
      }

      const destination = getRedirectDestination(data.role);
      window.location.hash = destination;
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to reach authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#070A0F',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px 16px',
      color: '#FAF8F5',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
    }}>
      {/* Top back link */}
      <div style={{ marginBottom: '24px' }}>
        <a
          href="#/"
          style={{
            color: '#D4AF37',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Return to Public Overview
        </a>
      </div>

      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#101622',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Emblem & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #845508 0%, #D4AF37 50%, #845508 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)'
          }}>
            🏛️
          </div>
          <h2 style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            margin: '0 0 6px',
            fontFamily: "'Cinzel', 'Fraunces', serif",
            letterSpacing: '0.04em',
            color: '#FFFFFF'
          }}>
            SAAMX Gateway
          </h2>
          <p style={{
            fontSize: '0.84rem',
            color: '#9CA3AF',
            margin: 0,
            lineHeight: 1.5
          }}>
            Enter your Investment House Code or Staff Access Key to enter the trading floor.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(147, 25, 19, 0.15)',
            border: '1px solid rgba(189, 36, 29, 0.4)',
            color: '#FCD8D5',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            marginBottom: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#D4AF37',
              marginBottom: '8px'
            }}>
              Console Identifier
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. T01, admin, verification, exchange"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '0.95rem',
                backgroundColor: '#070A0F',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#FAF8F5',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div style={{ marginBottom: '26px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#D4AF37',
              marginBottom: '8px'
            }}>
              Password or Access PIN
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Access Key or Team PIN"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '0.95rem',
                backgroundColor: '#070A0F',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#FAF8F5',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#070A0F',
              background: 'linear-gradient(135deg, #F7E4B2 0%, #D4AF37 50%, #9C6A12 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Verifying Session...' : 'AUTHORIZE & ENTER FLOOR →'}
          </button>
        </form>

        {/* Quick Guide */}
        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.76rem',
          color: '#8A8275',
          lineHeight: 1.5
        }}>
          <div><strong>Teams:</strong> Enter Team ID (e.g. <code>T01</code>) and team password.</div>
          <div style={{ marginTop: '4px' }}><strong>Staff:</strong> Enter designated console name (<code>admin</code>, <code>verification</code>, <code>exchange</code>, etc.) and event access key.</div>
        </div>
      </div>
    </div>
  );
}
