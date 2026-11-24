import React, { useState, useEffect, useMemo, useRef } from 'react';
import './DrawerManager.css';
import { useDrawer, DRAWER_TYPES } from '../context/DrawerContext.jsx';
import { NAVIGATION_SECTIONS, getFilteredNavSections, isItemActive } from '../lib/navigationConfig.js';
import { CURRENCY_DIRECTORY, CURRENCY_SYMBOLS, DEFAULT_FX_RATES, formatCurrency } from '../lib/formatters.js';
import { CurrencyDisplay, PriceDisplay, DeltaBadge } from './ui/FinancialFormatters.jsx';
import { useDensity } from '../context/DensityContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import {
  IconBuilding,
  IconSearch,
  IconX,
  IconUser,
  IconCrown,
  IconLogOut,
  IconTrendingUp,
  IconTrendingDown,
  IconBriefcase,
  IconShieldCheck,
  IconCheck,
  IconClock,
  IconZap,
  IconArrowRight,
  IconFileText,
  IconAlertTriangle,
  IconRefreshCw,
  IconFilter,
  NavIcon
} from '../lib/icons.jsx';

export { DRAWER_TYPES };

export default function DrawerManager({
  activeDrawer: propActiveDrawer,
  onClose: propOnClose,
  userRole,
  sessionUsername,
  currentRoute,
  state = {},
  grantedPermissions = [],
  grantedPages = [],
  onNavigate,
  onSelectSecurity,
  onLogout
}) {
  const drawerCtx = useDrawer();
  const activeDrawer = propActiveDrawer !== undefined ? propActiveDrawer : drawerCtx.activeDrawer;
  const closeDrawer = propOnClose || drawerCtx.closeDrawer;

  const { density, toggleDensity } = useDensity();
  const { theme, toggleTheme } = useTheme();

  // Route navigation helper
  const handleNav = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
    closeDrawer();
  };

  // Prevent background scrolling while any drawer is open
  useEffect(() => {
    if (activeDrawer) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeDrawer]);

  // Master Admin Flag
  const isMaster = sessionUsername?.toLowerCase() === 'sridhara' || sessionStorage.getItem('saamx_is_master') === 'true';

  // --------------------------------------------------------------------------
  // 1. PORTAL NAVIGATION DRAWER STATE
  // --------------------------------------------------------------------------
  const [navSearch, setNavSearch] = useState('');
  const navSections = useMemo(() => {
    const rawSections = getFilteredNavSections(userRole, grantedPermissions, grantedPages);
    if (!navSearch.trim()) return rawSections;
    const query = navSearch.toLowerCase().trim();
    return rawSections.map(section => {
      const filteredItems = section.items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.badge && item.badge.toLowerCase().includes(query)) ||
        item.path.toLowerCase().includes(query)
      );
      if (filteredItems.length === 0) return null;
      return { ...section, items: filteredItems };
    }).filter(Boolean);
  }, [userRole, grantedPermissions, grantedPages, navSearch]);

  // --------------------------------------------------------------------------
  // 2. GLOBAL COMMAND & SEARCH PALETTE STATE
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('ALL'); // 'ALL' | 'SECURITIES' | 'DESKS' | 'ACTIONS'
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Focus search input on open
  useEffect(() => {
    if (activeDrawer === DRAWER_TYPES.SEARCH || activeDrawer === 'SEARCH_DRAWER' || activeDrawer === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [activeDrawer]);

  // Normalized securities universe (handles array or dictionary)
  const allSecurities = useMemo(() => {
    if (!state?.securities) return [];
    return Array.isArray(state.securities) ? state.securities : Object.values(state.securities);
  }, [state?.securities]);

  // Search Results Engine (Fast Fuzzy Match across 2,849 Tickers + Desks + Actions)
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const results = { securities: [], desks: [], actions: [] };

    // A. Securities Search
    if (searchCategory === 'ALL' || searchCategory === 'SECURITIES') {
      if (!query) {
        // Show prominent securities or active IPOs
        results.securities = allSecurities.slice(0, 8);
      } else {
        const matches = [];
        for (const sec of allSecurities) {
          const ticker = (sec.ticker || '').toLowerCase();
          const name = (sec.name || '').toLowerCase();
          const sector = (sec.sector || '').toLowerCase();
          if (ticker === query) {
            matches.unshift(sec); // Exact match at top
          } else if (ticker.startsWith(query) || name.includes(query) || sector.includes(query)) {
            matches.push(sec);
          }
          if (matches.length >= 15) break; // Limit for 60fps rendering
        }
        results.securities = matches;
      }
    }

    // B. Desks & Portals Search
    if (searchCategory === 'ALL' || searchCategory === 'DESKS') {
      const allDeskItems = NAVIGATION_SECTIONS.flatMap(s => s.items);
      if (!query) {
        results.desks = allDeskItems.slice(0, 6);
      } else {
        results.desks = allDeskItems.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query)
        ).slice(0, 6);
      }
    }

    // C. Quick Actions
    if (searchCategory === 'ALL' || searchCategory === 'ACTIONS') {
      const quickActionsList = [
        ...(isMaster ? [
          { id: 'act_ipo', label: 'Primary Market & IPO Command Hub', icon: 'trending-up', run: () => handleNav('#/ipo') },
          { id: 'act_training', label: 'Floor Speed-Training Terminal (Sridhara)', icon: 'target', run: () => handleNav('#/training') }
        ] : []),
        { id: 'act_density', label: `Switch to ${density === 'compact' ? 'Comfortable Studio' : 'Compact Terminal'} Density`, icon: 'sliders', run: toggleDensity },
        { id: 'act_nav', label: 'Open Navigation Drawer (Ctrl+B)', icon: 'dock', run: () => drawerCtx.openDrawer(DRAWER_TYPES.PORTALS) },
        { id: 'act_portfolio', label: 'Inspect Portfolio & 12 Currencies (Ctrl+P)', icon: 'briefcase', run: () => drawerCtx.openDrawer(DRAWER_TYPES.PORTFOLIO) },
        { id: 'act_projector', label: 'Auditorium Big-Screen Projector', icon: 'monitor', run: () => handleNav('#/projector') },
        { id: 'act_logout', label: 'Sign Out of Terminal', icon: 'logout', run: onLogout }
      ];

      if (!query) {
        results.actions = quickActionsList;
      } else {
        results.actions = quickActionsList.filter(a => a.label.toLowerCase().includes(query));
      }
    }

    return results;
  }, [searchQuery, searchCategory, allSecurities, theme, density, toggleTheme, toggleDensity, drawerCtx, onLogout]);

  // Flattened items for keyboard navigation
  const flatSearchResults = useMemo(() => {
    const list = [];
    searchResults.securities.forEach(item => list.push({ type: 'security', data: item }));
    searchResults.desks.forEach(item => list.push({ type: 'desk', data: item }));
    searchResults.actions.forEach(item => list.push({ type: 'action', data: item }));
    return list;
  }, [searchResults]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % Math.max(1, flatSearchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + flatSearchResults.length) % Math.max(1, flatSearchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatSearchResults[highlightedIndex];
      if (current) {
        if (current.type === 'security') {
          onSelectSecurity?.(current.data.id || current.data.ticker);
          closeDrawer();
        } else if (current.type === 'desk') {
          handleNav(current.data.path);
        } else if (current.type === 'action') {
          current.data.run();
          closeDrawer();
        }
      }
    }
  };

  // --------------------------------------------------------------------------
  // 3. PORTFOLIO INSPECTION DRAWER STATE
  // --------------------------------------------------------------------------
  const allTeams = useMemo(() => {
    if (!state?.teams) return [];
    return Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
  }, [state?.teams]);

  // Active inspected team code (defaults to logged-in user or first team)
  const defaultTeamCode = useMemo(() => {
    if (userRole === 'team') {
      const match = allTeams.find(t => (t.teamCode || t.id)?.toLowerCase() === sessionUsername?.toLowerCase());
      return match ? (match.teamCode || match.id) : (sessionUsername || 'T02');
    }
    return allTeams[0]?.teamCode || allTeams[0]?.id || 'T02';
  }, [userRole, sessionUsername, allTeams]);

  const [selectedTeamCode, setSelectedTeamCode] = useState(defaultTeamCode);

  useEffect(() => {
    if (defaultTeamCode) setSelectedTeamCode(defaultTeamCode);
  }, [defaultTeamCode]);

  const inspectedTeam = useMemo(() => {
    return allTeams.find(t => t.teamCode === selectedTeamCode || t.id === selectedTeamCode) || null;
  }, [allTeams, selectedTeamCode]);

  // 12 Currencies live balance calculation
  const teamWallets = useMemo(() => {
    const wallets = {};
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      wallets[cur] = 0;
    }
    if (!inspectedTeam) return wallets;
    const base = inspectedTeam.cashWallets || { INR: Number(inspectedTeam.cashBalance) || 0 };
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      wallets[cur] = base[cur] !== undefined ? Number(base[cur]) : 0;
    }
    return wallets;
  }, [inspectedTeam]);

  const teamReserved = useMemo(() => {
    const reserved = {};
    for (const cur of Object.keys(CURRENCY_DIRECTORY)) {
      reserved[cur] = 0;
    }
    if (!inspectedTeam?.reservedCash) return reserved;
    return { ...reserved, ...inspectedTeam.reservedCash };
  }, [inspectedTeam]);

  // Pending settlement vouchers
  const pendingOrders = useMemo(() => {
    if (!state?.orders) return [];
    const list = Array.isArray(state.orders) ? state.orders : Object.values(state.orders);
    return list.filter(ord =>
      (ord.teamId === selectedTeamCode || ord.teamCode === selectedTeamCode) &&
      ['PENDING_BANK', 'PENDING_EXCHANGE', 'QUEUED'].includes(ord.status)
    );
  }, [state?.orders, selectedTeamCode]);

  // Active Holdings
  const activeHoldings = useMemo(() => {
    if (!inspectedTeam?.holdings) return [];
    const hMap = inspectedTeam.holdings;
    return Object.entries(hMap).map(([ticker, qty]) => {
      const sec = allSecurities.find(s => s.ticker === ticker || s.id === ticker) || {};
      const curPrice = Number(sec.price || sec.currentPrice || 0);
      const buyPrice = Number(sec.basePrice || curPrice);
      const totalVal = Number(qty) * curPrice;
      const pnl = totalVal - (Number(qty) * buyPrice);
      const pnlPercent = buyPrice > 0 ? (pnl / (Number(qty) * buyPrice)) * 100 : 0;
      return {
        ticker,
        name: sec.name || ticker,
        quantity: qty,
        price: curPrice,
        totalVal,
        pnl,
        pnlPercent
      };
    }).filter(h => h.quantity > 0);
  }, [inspectedTeam, allSecurities]);

  // Total Portfolio Estimated Value (INR)
  const totalValuationINR = useMemo(() => {
    let cashINR = Number(teamWallets.INR || 0);
    // Convert foreign balances using mid rates
    const fxRates = state?.fxRates || DEFAULT_FX_RATES;
    for (const [cur, amt] of Object.entries(teamWallets)) {
      if (cur !== 'INR' && amt > 0) {
        const pairKey = `${cur}INR`;
        const rate = fxRates[pairKey]?.midRate || CURRENCY_DIRECTORY[cur]?.defaultMidRate || 1;
        cashINR += amt * rate;
      }
    }
    const holdingsVal = activeHoldings.reduce((sum, h) => sum + h.totalVal, 0);
    return cashINR + holdingsVal;
  }, [teamWallets, activeHoldings, state?.fxRates]);

  // --------------------------------------------------------------------------
  // 4. DESK ACTION DRAWER CONFIGURATION
  // --------------------------------------------------------------------------
  const deskShortcuts = useMemo(() => {
    const route = currentRoute || window.location.hash;
    if (route.startsWith('#/team')) {
      return {
        title: 'Team Terminal Actions',
        deskName: 'Participant Floor',
        actions: [
          { id: 'new_slip', title: 'Generate Paper Order Slip', desc: 'Create physical buy/sell trading ticket', icon: 'file-text', primary: true },
          { id: 'fx_req', title: 'Request Currency Swap', desc: 'Convert foreign reserves to INR at FX counter', icon: 'currency' },
          { id: 'export_csv', title: 'Export Holdings Statement', desc: 'Download timestamped CSV balance slip', icon: 'download' },
          { id: 'scanner', title: 'Scan Bull Momentum Stocks', desc: 'Filter high-velocity trading catalysts', icon: 'trending-up' }
        ]
      };
    }
    if (route.startsWith('#/exchange')) {
      return {
        title: 'Exchange Desk Operations',
        deskName: 'Execution & Matching',
        actions: [
          { id: 'intake', title: 'Intake Physical Runner Slip', desc: 'Scan and match floor runner order', icon: 'clipboard-list', primary: true },
          { id: 'match_top', title: 'Fast Priority Match', desc: 'Execute top pending bid-ask order', icon: 'zap' },
          { id: 'halt_sec', title: 'Circuit Limit Trading Halt', desc: 'Halt volatile ticker for surveillance', icon: 'alert-triangle' },
          { id: 'tape_export', title: 'Download Full Tape Audit', desc: 'Export executed exchange transactions', icon: 'database' }
        ]
      };
    }
    if (route.startsWith('#/bank')) {
      return {
        title: 'Bank Desk Clearance',
        deskName: 'Settlement Counter',
        actions: [
          { id: 'settle_slip', title: 'Settle Cash Order Slip', desc: 'Release escrowed cash reserves to buyer', icon: 'check', primary: true },
          { id: 'credit_team', title: 'Manual Team Balance Credit', desc: 'Deposit physical emergency cash ledger', icon: 'briefcase' },
          { id: 'clear_fx', title: 'Clear Pending FX Queue', desc: 'Finalize multi-currency swap vouchers', icon: 'currency' }
        ]
      };
    }
    if (route.startsWith('#/sebi')) {
      return {
        title: 'SEBI Surveillance Controls',
        deskName: 'Market Oversight',
        actions: [
          { id: 'flag_wash', title: 'Flag Wash Trading Anomaly', desc: 'Log suspicious cross-house volume', icon: 'shield-check', primary: true },
          { id: 'penalize', title: 'Levy Regulatory Team Fine', desc: 'Impose penalty voucher on offending team', icon: 'scale' },
          { id: 'market_halt', title: 'Trigger Market Circuit Halt', desc: 'Emergency freeze on all floor trading', icon: 'alert-triangle' }
        ]
      };
    }
    return {
      title: 'Active Desk Shortcuts',
      deskName: 'Universal Operations',
      actions: [
        { id: 'open_market', title: 'Jump to Market Watch', desc: 'Monitor 2,849 live securities quotes', icon: 'bar-chart', run: () => handleNav('#/market-watch') },
        { id: 'open_projector', title: 'Auditorium Projector View', desc: 'Full-screen split-flap big screen', icon: 'monitor', run: () => handleNav('#/projector') },
        { id: 'refresh_ws', title: 'Synchronize Realtime Clock', desc: 'Force re-sync of Firebase clock offset', icon: 'refresh-cw' }
      ]
    };
  }, [currentRoute]);

  if (!activeDrawer) return null;

  return (
    <div className="saamx-drawer-system" role="dialog" aria-modal="true" aria-label="System Navigation Drawers">
      {/* Semi-transparent Backdrop Overlay */}
      <div
        className="saamx-drawer-backdrop"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* --------------------------------------------------------------------
         DRAWER 1: PORTAL NAVIGATION DRAWER (Slides in from Left)
         -------------------------------------------------------------------- */}
      {(activeDrawer === DRAWER_TYPES.PORTALS || activeDrawer === 'PORTALS_DRAWER' || activeDrawer === 'portals') && (
        <aside className="saamx-drawer saamx-drawer-left saamx-nav-drawer" aria-label="Portal Navigation">
          <div className="saamx-drawer-header">
            <div className="saamx-drawer-brand">
              <div className="saamx-brand-avatar">
                <IconBuilding size={20} />
              </div>
              <div>
                <div className="saamx-drawer-brand-title">SAAMX</div>
                <div className="saamx-drawer-brand-sub">Asset eXchange Desks</div>
              </div>
            </div>
            <button type="button" className="saamx-drawer-close-btn" onClick={closeDrawer} aria-label="Close Drawer">
              <IconX size={18} />
            </button>
          </div>

          {/* User Identity Chip */}
          <div className="saamx-drawer-user-card">
            <div className="saamx-user-avatar">
              {isMaster ? <IconCrown size={18} style={{ color: '#FCD34D' }} /> : <IconUser size={18} />}
            </div>
            <div className="saamx-user-info">
              <div className="saamx-user-name">{sessionUsername || userRole?.toUpperCase() || 'Participant'}</div>
              <div className={`saamx-user-badge ${isMaster ? 'master' : ''}`}>
                {isMaster ? 'MASTER ADMIN' : (userRole || 'ANONYMOUS').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Search Filter for Desks */}
          <div className="saamx-drawer-search-wrap">
            <IconSearch size={15} className="saamx-drawer-search-icon" />
            <input
              type="text"
              className="saamx-drawer-search-input"
              placeholder="Filter portals & desks..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Nav Sections Scroll Container */}
          <div className="saamx-drawer-scroll-body">
            {navSections.map(section => (
              <div key={section.id} className="saamx-nav-group">
                <div className="saamx-nav-group-title">{section.title}</div>
                <div className="saamx-nav-group-items">
                  {section.items.map(item => {
                    const active = isItemActive(item, currentRoute);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`saamx-nav-row ${active ? 'active' : ''}`}
                        onClick={() => handleNav(item.path)}
                      >
                        <div className="saamx-nav-row-icon">
                          <NavIcon name={item.icon} size={18} />
                        </div>
                        <div className="saamx-nav-row-content">
                          <div className="saamx-nav-row-title">
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className={`saamx-item-pill ${item.badge.toLowerCase()}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="saamx-nav-row-desc">{item.description}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer Controls */}
          <div className="saamx-drawer-footer">
            <div className="saamx-drawer-footer-actions">
              <button
                type="button"
                className="saamx-btn-compact-mode"
                onClick={toggleDensity}
                title={`Toggle Density (Currently ${density})`}
              >
                {density === 'compact' ? 'Studio Mode' : 'Compact Terminal'}
              </button>
              
            </div>
            {onLogout && (
              <button type="button" className="saamx-drawer-logout-btn" onClick={onLogout}>
                <IconLogOut size={15} /> Sign Out
              </button>
            )}
          </div>
        </aside>
      )}

      {/* --------------------------------------------------------------------
         DRAWER 2: GLOBAL SEARCH / COMMAND PALETTE (Modal Palette — Ctrl+K)
         -------------------------------------------------------------------- */}
      {(activeDrawer === DRAWER_TYPES.SEARCH || activeDrawer === 'SEARCH_DRAWER' || activeDrawer === 'search') && (
        <div className="saamx-command-palette-modal" aria-label="Command Search Palette">
          {/* Search Header */}
          <div className="saamx-palette-search-header">
            <IconSearch size={20} className="saamx-palette-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="saamx-palette-input font-mono"
              placeholder="Search 2,849 securities, desks, or actions (↑↓ navigate, ↵ select)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
            />
            <span className="saamx-kbd-badge">ESC</span>
          </div>

          {/* Category Filter Pills */}
          <div className="saamx-palette-pills">
            {['ALL', 'SECURITIES', 'DESKS', 'ACTIONS'].map(cat => (
              <button
                key={cat}
                type="button"
                className={`saamx-pill-btn ${searchCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setSearchCategory(cat);
                  setHighlightedIndex(0);
                }}
              >
                {cat === 'SECURITIES' ? 'Securities (2,849)' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="saamx-palette-results">
            {flatSearchResults.length === 0 ? (
              <div className="saamx-palette-empty">
                No matching securities, portals, or actions found for "{searchQuery}".
              </div>
            ) : (
              flatSearchResults.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                if (item.type === 'security') {
                  const sec = item.data;
                  return (
                    <div
                      key={`sec_${sec.id || sec.ticker}`}
                      className={`saamx-palette-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectSecurity?.(sec.id || sec.ticker);
                        closeDrawer();
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="saamx-palette-item-left">
                        <span className="saamx-ticker-pill font-mono">{sec.ticker}</span>
                        <div className="saamx-item-text">
                          <div className="saamx-item-title">{sec.name}</div>
                          <div className="saamx-item-sub">{sec.sector || 'Equities'} • ISIN: {sec.isin || 'INE-SAAMX'}</div>
                        </div>
                      </div>
                      <div className="saamx-palette-item-right">
                        <PriceDisplay price={sec.price || sec.currentPrice} />
                        <DeltaBadge delta={sec.change || 0} deltaPercent={sec.changePercent || 0} />
                      </div>
                    </div>
                  );
                }

                if (item.type === 'desk') {
                  const desk = item.data;
                  return (
                    <div
                      key={`desk_${desk.id}`}
                      className={`saamx-palette-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleNav(desk.path)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="saamx-palette-item-left">
                        <div className="saamx-palette-icon-box">
                          <NavIcon name={desk.icon} size={16} />
                        </div>
                        <div className="saamx-item-text">
                          <div className="saamx-item-title">{desk.name}</div>
                          <div className="saamx-item-sub">{desk.description}</div>
                        </div>
                      </div>
                      <div className="saamx-palette-item-right">
                        <span className="saamx-portal-badge font-mono">{desk.path}</span>
                      </div>
                    </div>
                  );
                }

                if (item.type === 'action') {
                  const action = item.data;
                  return (
                    <div
                      key={`action_${action.id}`}
                      className={`saamx-palette-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        action.run();
                        closeDrawer();
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="saamx-palette-item-left">
                        <div className="saamx-palette-icon-box action">
                          <IconZap size={16} />
                        </div>
                        <div className="saamx-item-text">
                          <div className="saamx-item-title">{action.label}</div>
                          <div className="saamx-item-sub">Instant Operational Shortcut</div>
                        </div>
                      </div>
                      <div className="saamx-palette-item-right">
                        <IconArrowRight size={14} />
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>

          <div className="saamx-palette-footer">
            <span className="saamx-shortcut-hint"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span className="saamx-shortcut-hint"><kbd>↵</kbd> to select</span>
            <span className="saamx-shortcut-hint"><kbd>ESC</kbd> to dismiss</span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
         DRAWER 3: PORTFOLIO INSPECTION DRAWER (Slides in from Right)
         -------------------------------------------------------------------- */}
      {(activeDrawer === DRAWER_TYPES.PORTFOLIO || activeDrawer === 'PORTFOLIO_DRAWER' || activeDrawer === 'portfolio') && (
        <aside className="saamx-drawer saamx-drawer-right saamx-portfolio-drawer" aria-label="Portfolio Inspection">
          <div className="saamx-drawer-header">
            <div>
              <div className="saamx-drawer-brand-title">Portfolio Inspection</div>
              <div className="saamx-drawer-brand-sub">Live 12-Currency Wallets & Positions</div>
            </div>
            <button type="button" className="saamx-drawer-close-btn" onClick={closeDrawer} aria-label="Close Drawer">
              <IconX size={18} />
            </button>
          </div>

          {/* Team Selector (for Admin/Officials) or Team Badge (for Traders) */}
          <div className="saamx-portfolio-team-bar">
            {['admin', 'super_admin', 'coordinator', 'operator_x', 'exchange', 'verification', 'bank_teller', 'sebi'].includes((userRole || '').toLowerCase()) ? (
              <div className="saamx-team-picker-wrap">
                <label className="saamx-label-sub">Inspect Trading House:</label>
                <select
                  className="saamx-team-select font-mono"
                  value={selectedTeamCode}
                  onChange={(e) => setSelectedTeamCode(e.target.value)}
                >
                  {allTeams.map(t => (
                    <option key={t.id || t.teamCode} value={t.teamCode || t.id}>
                      {t.teamCode || t.id} — {t.teamName || t.name || 'Participant House'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="saamx-team-chip font-mono">
                <strong>{inspectedTeam?.teamCode || selectedTeamCode}</strong> • {inspectedTeam?.teamName || 'Investment House'}
              </div>
            )}
          </div>

          <div className="saamx-drawer-scroll-body">
            {/* Net Worth Summary Card */}
            <div className="saamx-valuation-card">
              <div className="saamx-valuation-label">Estimated Total Net Worth</div>
              <div className="saamx-valuation-amount font-mono">
                <CurrencyDisplay amount={totalValuationINR} currency="INR" compact={false} />
              </div>
              <div className="saamx-valuation-pnl">
                <span>Total Cash + Holdings Ledger</span>
                <span className="saamx-badge-success">LIVE VALUATION</span>
              </div>
            </div>

            {/* 12-Currencies Balance Grid */}
            <div className="saamx-section-header">
              <span className="saamx-section-title">12-Currency Live Wallets</span>
              <span className="saamx-section-badge font-mono">12 CURRENCIES</span>
            </div>

            <div className="saamx-currencies-grid">
              {Object.entries(CURRENCY_DIRECTORY).map(([curCode, meta]) => {
                const bal = teamWallets[curCode] || 0;
                const res = teamReserved[curCode] || 0;
                const avail = Math.max(0, bal - res);
                return (
                  <div key={curCode} className={`saamx-currency-card ${bal > 0 ? 'has-balance' : ''}`}>
                    <div className="saamx-cur-card-header">
                      <span className="saamx-cur-flag">{meta.flag}</span>
                      <span className="saamx-cur-code font-mono">{curCode}</span>
                    </div>
                    <div className="saamx-cur-amount font-mono">
                      {meta.symbol}{formatCurrency(avail, curCode, { showSymbol: false, compact: true })}
                    </div>
                    {res > 0 && (
                      <div className="saamx-cur-res font-mono" title="Reserved Collateral">
                        🔒 {meta.symbol}{formatCurrency(res, curCode, { showSymbol: false, compact: true })} res.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Holdings Table */}
            <div className="saamx-section-header" style={{ marginTop: '24px' }}>
              <span className="saamx-section-title">Active Equity Holdings</span>
              <span className="saamx-section-badge font-mono">{activeHoldings.length} POSITIONS</span>
            </div>

            {activeHoldings.length === 0 ? (
              <div className="saamx-empty-state">No open equity positions held.</div>
            ) : (
              <div className="saamx-holdings-list">
                {activeHoldings.map(h => (
                  <div key={h.ticker} className="saamx-holding-row">
                    <div className="saamx-holding-left">
                      <span className="saamx-ticker-pill font-mono">{h.ticker}</span>
                      <span className="saamx-holding-qty font-mono">× {h.quantity}</span>
                    </div>
                    <div className="saamx-holding-right">
                      <CurrencyDisplay amount={h.totalVal} currency="INR" compact={true} />
                      <DeltaBadge delta={h.pnl} deltaPercent={h.pnlPercent} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Settlement Vouchers */}
            <div className="saamx-section-header" style={{ marginTop: '24px' }}>
              <span className="saamx-section-title">Pending Settlement Vouchers</span>
              <span className="saamx-section-badge font-mono">{pendingOrders.length} QUEUED</span>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="saamx-empty-state">All tickets settled. Zero pending vouchers.</div>
            ) : (
              <div className="saamx-vouchers-list">
                {pendingOrders.map(ord => (
                  <div key={ord.id} className="saamx-voucher-row">
                    <div className="saamx-voucher-left">
                      <div className="saamx-voucher-tkt font-mono">{ord.id}</div>
                      <div className="saamx-voucher-detail font-mono">
                        {ord.side?.toUpperCase()} {ord.quantity} × {ord.ticker}
                      </div>
                    </div>
                    <div className="saamx-voucher-right">
                      <span className="saamx-status-pill warning">{ord.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* --------------------------------------------------------------------
         DRAWER 4: CONTEXTUAL DESK ACTION DRAWER (Slides in from Right)
         -------------------------------------------------------------------- */}
      {(activeDrawer === DRAWER_TYPES.DESK_ACTIONS || activeDrawer === 'DESK_DRAWER' || activeDrawer === 'desk') && (
        <aside className="saamx-drawer saamx-drawer-right saamx-action-drawer" aria-label="Desk Actions">
          <div className="saamx-drawer-header">
            <div>
              <div className="saamx-drawer-brand-title">{deskShortcuts.title}</div>
              <div className="saamx-drawer-brand-sub">{deskShortcuts.deskName} Quick Actions</div>
            </div>
            <button type="button" className="saamx-drawer-close-btn" onClick={closeDrawer} aria-label="Close Drawer">
              <IconX size={18} />
            </button>
          </div>

          <div className="saamx-drawer-scroll-body">
            <div className="saamx-action-list">
              {deskShortcuts.actions.map(act => (
                <button
                  key={act.id}
                  type="button"
                  className={`saamx-action-card ${act.primary ? 'primary' : ''}`}
                  onClick={() => {
                    if (act.run) act.run();
                    closeDrawer();
                  }}
                >
                  <div className="saamx-action-card-icon">
                    <NavIcon name={act.icon} size={20} />
                  </div>
                  <div className="saamx-action-card-text">
                    <div className="saamx-action-card-title">{act.title}</div>
                    <div className="saamx-action-card-desc">{act.desc}</div>
                  </div>
                  <div className="saamx-action-arrow">
                    <IconArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
