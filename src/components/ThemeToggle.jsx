import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { IconSun, IconMoon } from '../lib/icons.jsx';

export default function ThemeToggle({ compact = false, className = '', style = {} }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${compact ? 'compact' : ''} ${className}`.trim()}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme (currently ${theme})`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: compact ? '6px 8px' : '6px 12px',
        borderRadius: '8px',
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-ink)',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all var(--transition-fast, 0.15s ease)',
        outline: 'none',
        userSelect: 'none',
        ...style
      }}
    >
      <span className="theme-toggle-icon-wrapper" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
      </span>
      {!compact && (
        <span className="theme-toggle-label" style={{ fontSize: '0.78rem', textTransform: 'capitalize', fontWeight: 700 }}>
          {theme}
        </span>
      )}
    </button>
  );
}
