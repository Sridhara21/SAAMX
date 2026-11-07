import React, { useState, useEffect, useCallback } from 'react';
import { useDensity } from '../context/DensityContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useDrawer, DRAWER_TYPES } from '../context/DrawerContext.jsx';
import {
  IconSearch,
  IconClock,
  IconSun,
  IconMoon,
  IconDensityCompact,
  IconDensityComfortable,
  IconUser,
  IconCrown,
  IconLogOut
} from '../lib/icons.jsx';
import './FloatingCommandDock.css';

/**
 * Native SVG Icon for Portal Drawer Grid (24x24, 1.75 stroke)
 */
export function IconGrid({ size = 18, strokeWidth = 1.75, className = '', color = 'currentColor', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`saamx-icon ${className}`.trim()}
      {...props}
    >
      <rect width="7" height="7" x="3" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="14" rx="1.5" />
      <rect width="7" height="7" x="3" y="14" rx="1.5" />
    </svg>
  );
}

/**
 * Native SVG Icon for Portfolio Inspection Drawer (24x24, 1.75 stroke)
 */
export function IconPieChart({ size = 18, strokeWidth = 1.75, className = '', color = 'currentColor', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`saamx-icon ${className}`.trim()}
      {...props}
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

/**
 * SAAMX Floating Command Dock (R2)
 * Inspired by iPadOS floating dock, One UI Edge, and Linear command bars.
 * 
 * Central fixed floating glass container providing universal navigation,
 * real-time telemetry, IST clock, theme & density controls, and session state.
 */
export default function FloatingCommandDock({
  activeRoute = '#/',
  userRole = '',
  sessionUsername = '',
  dbConnected = true,
  serverTimeOffset = 0,
  activeDrawer: propActiveDrawer,
  onToggleDrawer: propOnToggleDrawer,
  onLogout = () => {},
  className = '',
  style = {}
}) {
  const { density, toggleDensity, isCompact } = useDensity();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const drawerCtx = useDrawer();
  const activeDrawer = propActiveDrawer !== undefined ? propActiveDrawer : drawerCtx.activeDrawer;

  const handleToggleDrawer = useCallback((drawerId) => {
    if (propOnToggleDrawer) {
      propOnToggleDrawer(drawerId);
    } else {
      drawerCtx.toggleDrawer(drawerId);
    }
  }, [propOnToggleDrawer, drawerCtx]);

  // Live IST Clock synced with serverTimeOffset
  const [currentTime, setCurrentTime] = useState(() => Date.now() + serverTimeOffset);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now() + serverTimeOffset);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  const istTimeString = (() => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date(currentTime));
    } catch (e) {
      return new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  })();

  // Role permissions
  const normalizedRole = (userRole || '').toLowerCase();
  const isMaster = sessionUsername?.toLowerCase() === 'sridhara' || sessionStorage.getItem('saamx_is_master') === 'true';
  const canAccessPortfolio = ['team', 'admin', 'super_admin', 'portfolio', 'operator_x', 'sebi'].includes(normalizedRole);

  const isPortalsActive = activeDrawer === DRAWER_TYPES.PORTALS || activeDrawer === 'portals' || activeDrawer === 'PORTALS_DRAWER' || activeRoute === '#/portals' || activeRoute === '#/directory';
  const isSearchActive = activeDrawer === DRAWER_TYPES.SEARCH || activeDrawer === 'search' || activeDrawer === 'SEARCH_DRAWER';
  const isPortfolioActive = activeDrawer === DRAWER_TYPES.PORTFOLIO || activeDrawer === 'portfolio' || activeDrawer === 'PORTFOLIO_DRAWER' || activeRoute === '#/portfolio';

  return (
    <nav
      className={`saamx-command-dock-container ${className}`.trim()}
      role="toolbar"
      aria-label="Institutional Command Dock"
      style={style}
    >
      <div className="saamx-command-dock-glass">
        {/* ==================================================================
            GROUP 1: NAVIGATION DRAWERS (Portals, Search, Portfolio)
            ================================================================== */}
        <div className="dock-section dock-nav-group">
          {/* a) Portal Drawer Toggle Pip */}
          <button
            type="button"
            className={`dock-pip-btn ${isPortalsActive ? 'active' : ''}`}
            onClick={() => handleToggleDrawer(DRAWER_TYPES.PORTALS)}
            aria-label="Portals Directory (Ctrl+B)"
            aria-haspopup="dialog"
            aria-expanded={isPortalsActive}
          >
            <span className="dock-pip-icon" aria-hidden="true">
              <IconGrid size={18} />
            </span>
            <span className="dock-pip-tooltip" role="tooltip">
              Portals Directory <kbd>Ctrl+B</kbd>
            </span>
          </button>

          {/* b) Quick Search Pip */}
          <button
            type="button"
            className={`dock-pip-btn ${isSearchActive ? 'active' : ''}`}
            onClick={() => handleToggleDrawer(DRAWER_TYPES.SEARCH)}
            aria-label="Quick Command Search (Ctrl+K)"
            aria-haspopup="dialog"
            aria-expanded={isSearchActive}
          >
            <span className="dock-pip-icon" aria-hidden="true">
              <IconSearch size={18} />
            </span>
            <span className="dock-shortcut-badge">⌘K</span>
            <span className="dock-pip-tooltip" role="tooltip">
              Command Palette <kbd>Ctrl+K</kbd>
            </span>
          </button>

          {/* c) Portfolio Inspection Drawer Pip (Role-Gated) */}
          {canAccessPortfolio && (
            <button
              type="button"
              className={`dock-pip-btn ${isPortfolioActive ? 'active' : ''}`}
              onClick={() => handleToggleDrawer(DRAWER_TYPES.PORTFOLIO)}
              aria-label="Portfolio Inspection Drawer (Ctrl+P)"
              aria-haspopup="dialog"
              aria-expanded={isPortfolioActive}
            >
              <span className="dock-pip-icon" aria-hidden="true">
                <IconPieChart size={18} />
              </span>
              <span className="dock-pip-tooltip" role="tooltip">
                Portfolio Glance <kbd>Ctrl+P</kbd>
              </span>
            </button>
          )}
        </div>

        {/* Divider 1 */}
        <div className="dock-divider" aria-hidden="true" />

        {/* ==================================================================
            GROUP 2: REAL-TIME TELEMETRY & CLOCK
            ================================================================== */}
        <div className="dock-section dock-telemetry-group">
          {/* d) Live WebSocket Pulse Indicator */}
          <div
            className={`dock-telemetry-chip ${dbConnected ? 'connected' : 'reconnecting'}`}
            role="status"
            aria-label={dbConnected ? "WebSocket Live: Feed active" : "WebSocket Offline: Reconnecting"}
            tabIndex={0}
          >
            <span className="dock-pulse-beacon" aria-hidden="true">
              <span className="beacon-ring" />
              <span className="beacon-core" />
            </span>
            <span className="dock-telemetry-label font-mono">
              {dbConnected ? 'LIVE' : 'RECONNECTING'}
            </span>
            <span className="dock-pip-tooltip" role="tooltip">
              {dbConnected ? 'WebSocket Real-Time Feed Active' : 'WebSocket Reconnecting...'}
            </span>
          </div>

          {/* e) Live IST Monospace Tabular Clock */}
          <div
            className="dock-ist-clock-chip"
            role="timer"
            aria-label={`Indian Standard Time: ${istTimeString}`}
            tabIndex={0}
          >
            <span className="dock-clock-icon" aria-hidden="true">
              <IconClock size={13} />
            </span>
            <span className="dock-clock-time font-mono tabular-nums">
              {istTimeString}
            </span>
            <span className="dock-clock-zone">IST</span>
            <span className="dock-pip-tooltip" role="tooltip">
              Indian Standard Time (UTC+05:30)
            </span>
          </div>
        </div>

        {/* Divider 2 */}
        <div className="dock-divider" aria-hidden="true" />

        {/* ==================================================================
            GROUP 3: SYSTEM CONTROLS (Density & Theme)
            ================================================================== */}
        <div className="dock-section dock-controls-group">
          {/* f) Adaptive Density Switcher Button */}
          <button
            type="button"
            className="dock-pip-btn"
            onClick={toggleDensity}
            aria-label={`Layout density: currently ${density}. Click to switch to ${isCompact ? 'comfortable' : 'compact'} mode`}
          >
            <span className="dock-pip-icon" aria-hidden="true">
              {isCompact ? <IconDensityComfortable size={17} /> : <IconDensityCompact size={17} />}
            </span>
            <span className="dock-pip-tooltip" role="tooltip">
              {isCompact ? 'Comfortable Studio View (48px)' : 'Compact Terminal View (32px)'}
            </span>
          </button>

          {/* g) Theme Toggle Button */}
          <button
            type="button"
            className="dock-pip-btn"
            onClick={toggleTheme}
            aria-label={`Theme: currently ${theme}. Click to switch to ${isDark ? 'light' : 'dark'} mode (Ctrl+Shift+T)`}
          >
            <span className="dock-pip-icon" aria-hidden="true">
              {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
            </span>
            <span className="dock-pip-tooltip" role="tooltip">
              Switch to {isDark ? 'Light Mode' : 'Dark Mode'} <kbd>Ctrl+Shift+T</kbd>
            </span>
          </button>
        </div>

        {/* Divider 3 */}
        <div className="dock-divider" aria-hidden="true" />

        {/* ==================================================================
            GROUP 4: IDENTITY & SESSION CONTROL
            ================================================================== */}
        <div className="dock-section dock-identity-group">
          {/* h) User Identity Chip & Sign Out */}
          <div
            className={`dock-user-chip ${isMaster ? 'master' : ''}`}
            role="group"
            aria-label={`Logged in as ${sessionUsername || userRole.toUpperCase()}`}
          >
            <span className="dock-user-avatar" aria-hidden="true">
              {isMaster ? <IconCrown size={14} className="icon-crown" /> : <IconUser size={14} />}
            </span>
            <span className="dock-user-name">
              {sessionUsername || normalizedRole.toUpperCase()}
            </span>
            <span className={`dock-role-pill ${isMaster ? 'master' : ''}`}>
              {isMaster ? 'MASTER' : (normalizedRole || 'USER').toUpperCase()}
            </span>
          </div>

          <button
            type="button"
            className="dock-pip-btn dock-pip-logout"
            onClick={onLogout}
            aria-label="Sign out of SAAMX terminal"
          >
            <span className="dock-pip-icon" aria-hidden="true">
              <IconLogOut size={16} />
            </span>
            <span className="dock-pip-tooltip" role="tooltip">
              Sign Out Session
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
