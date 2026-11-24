import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SAAMX Uncaught React Error Trapped by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetToPortals = () => {
    window.location.hash = '#/portals';
    window.location.reload();
  };

  handleSignOut = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('saamx_token');
    } catch (e) {}
    window.location.hash = '#/login';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0B0F19',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛡️</div>
            <h1 style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#F8FAFC',
              marginBottom: '10px'
            }}>
              System Desk Recovered
            </h1>
            <p style={{
              fontSize: '0.92rem',
              color: '#94A3B8',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              An interface render error was intercepted to protect your market session.
              You can reload the current desk or return to the system gateway.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#0F172A',
                border: '1px solid #EF4444',
                borderRadius: '8px',
                padding: '12px 16px',
                textAlign: 'left',
                color: '#FCA5A5',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                overflowX: 'auto',
                marginBottom: '24px',
                maxHeight: '120px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ↻ Reload Desk
              </button>
              <button
                onClick={this.handleResetToPortals}
                style={{
                  backgroundColor: '#334155',
                  color: '#E2E8F0',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: '1px solid #475569',
                  cursor: 'pointer'
                }}
              >
                Portals Directory
              </button>
              <button
                onClick={this.handleSignOut}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  cursor: 'pointer'
                }}
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
