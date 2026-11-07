import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { NAVIGATION_SECTIONS, getFilteredNavSections, isItemActive } from '../lib/navigationConfig.js';
import ThemeToggle from './ThemeToggle.jsx';
import SaamxLogo from './ui/SaamxLogo.jsx';
import {
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconUser,
  IconCrown,
  IconLogOut,
  NavIcon
} from '../lib/icons.jsx';

export { NAVIGATION_SECTIONS, getFilteredNavSections, isItemActive };

export default function Sidebar({
  currentRoute,
  userRole,
  sessionUsername,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  grantedPermissions = [],
  grantedPages = []
}) {
  const sections = getFilteredNavSections(userRole, grantedPermissions, grantedPages);
  const isMaster = sessionUsername?.toLowerCase() === 'sridhara' || sessionStorage.getItem('saamx_is_master') === 'true';

  // Handle escape key on mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile?.();
      }
      // Ctrl+B shortcut to toggle sidebar collapse on desktop
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleCollapse?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile, onToggleCollapse]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="saamx-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Primary Sidebar Rail/Drawer */}
      <aside
        className={`saamx-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Application Navigation"
        role="navigation"
      >
        {/* Brand / Logo Header */}
        <div className="saamx-sidebar-header">
          <a
            href={userRole === 'team' ? '#/team' : '#/exchange'}
            className="saamx-sidebar-brand"
            onClick={onCloseMobile}
            title="SAAMX '26 — Student Academic Asset Market eXchange"
            style={{ textDecoration: 'none' }}
          >
            {isCollapsed ? (
              <div className="saamx-brand-avatar" aria-hidden="true">
                <SaamxLogo size="sm" showSubtitle={false} />
              </div>
            ) : (
              <SaamxLogo size="md" showSubtitle={false} />
            )}
          </a>

          {/* Desktop Collapse Toggle (Top) */}
          <button
            type="button"
            className="saamx-sidebar-toggle-btn desktop-only"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="saamx-sidebar-close-mobile mobile-only"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* User Identity Chip */}
        <div className={`saamx-sidebar-user-chip ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="saamx-user-avatar" aria-hidden="true">
            {isMaster ? (
              <IconCrown size={18} className="saamx-user-crown-icon" />
            ) : (
              <IconUser size={18} className="saamx-user-icon" />
            )}
          </div>
          {!isCollapsed && (
            <div className="saamx-user-meta">
              <span className="saamx-user-name">
                {sessionUsername || userRole?.toUpperCase() || 'Participant'}
              </span>
              <span className={`saamx-user-role-badge ${isMaster ? 'master' : ''}`}>
                {isMaster ? 'MASTER ADMIN' : (userRole || 'ANONYMOUS').toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Section Groups */}
        <div className="saamx-sidebar-nav-scroll">
          {sections.map(section => (
            <div key={section.id} className="saamx-nav-section">
              {!isCollapsed && (
                <div className="saamx-section-heading">
                  {section.title}
                </div>
              )}
              {isCollapsed && (
                <div className="saamx-section-divider" aria-hidden="true" />
              )}

              <ul className="saamx-nav-list" role="list">
                {section.items.map(item => {
                  const active = isItemActive(item, currentRoute);
                  return (
                    <li key={item.id} className="saamx-nav-item">
                      <a
                        href={item.path}
                        className={`saamx-nav-link ${active ? 'active' : ''}`}
                        onClick={onCloseMobile}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="saamx-nav-icon" aria-hidden="true">
                          <NavIcon name={item.icon} size={18} />
                        </span>
                        {!isCollapsed && (
                          <span className="saamx-nav-label-wrapper">
                            <span className="saamx-nav-label">{item.name}</span>
                            {item.badge && (
                              <span className={`saamx-item-badge ${item.badge.toLowerCase()}`}>
                                {item.badge}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Floating Tooltip in Collapsed Mode */}
                        {isCollapsed && (
                          <div className="saamx-tooltip" role="tooltip">
                            <div className="saamx-tooltip-title">
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="saamx-tooltip-badge">{item.badge}</span>
                              )}
                            </div>
                            <div className="saamx-tooltip-desc">{item.description}</div>
                          </div>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Actions & Sign Out */}
        <div className="saamx-sidebar-footer">
          <div className="saamx-sidebar-theme-wrapper">
            <ThemeToggle compact={isCollapsed} style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }} />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className={`saamx-sidebar-logout-btn ${isCollapsed ? 'collapsed' : ''}`}
            aria-label="Sign out of terminal"
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <span className="saamx-logout-icon" aria-hidden="true">
              <IconLogOut size={16} />
            </span>
            {!isCollapsed && <span className="saamx-logout-label">Sign Out</span>}
            {isCollapsed && (
              <div className="saamx-tooltip" role="tooltip">
                <div className="saamx-tooltip-title">Sign Out</div>
                <div className="saamx-tooltip-desc">End active terminal session</div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
