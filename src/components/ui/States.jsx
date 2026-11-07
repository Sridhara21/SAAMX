import React from 'react';
import './primitives.css';
import Button from './Button.jsx';
import { IconFolderOpen, IconShieldCheck, IconX } from '../../lib/icons.jsx';

/**
 * Standard Loading Spinner
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  className = '',
  style = {},
  ...rest
}) {
  const dimensionMap = {
    sm: '16px',
    md: '24px',
    lg: '36px'
  };

  const dim = dimensionMap[size] || '24px';

  const colorMap = {
    primary: 'var(--color-accent, #2563EB)',
    brass: 'var(--color-accent, #2563EB)',
    neutral: 'var(--color-ink-muted, #94A3B8)',
    white: '#FFFFFF'
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`saamx-spinner ${className}`.trim()}
      style={{
        width: dim,
        height: dim,
        borderTopColor: colorMap[variant] || colorMap.primary,
        ...style
      }}
      {...rest}
    />
  );
}

/**
 * Skeleton Placeholder for Loading Views
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm, 6px)',
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      aria-hidden="true"
      className={`saamx-skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
      {...rest}
    />
  );
}

/**
 * Standard Empty State Component
 */
export function EmptyState({
  icon = null,
  title = 'No Data Found',
  description = 'There are no active records to display at this time.',
  action = null,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      className={`saamx-empty-state ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div className="saamx-empty-state-icon" aria-hidden="true">
        {icon ? icon : <IconFolderOpen size={42} />}
      </div>
      <h4 className="saamx-empty-state-title">
        {title}
      </h4>
      {description && (
        <p className="saamx-empty-state-desc">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Standard Feedback Alert Banner
 */
export function Alert({
  variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
  title = null,
  children,
  icon = null,
  onClose = null,
  className = '',
  style = {},
  ...rest
}) {
  const defaultIcons = {
    info: <IconShieldCheck size={18} />,
    success: <span style={{ fontWeight: 800, fontSize: '1rem' }}>✓</span>,
    warning: <span style={{ fontWeight: 800, fontSize: '1rem' }}>⚠</span>,
    danger: <IconX size={16} />
  };

  return (
    <div
      role="alert"
      className={`saamx-alert saamx-alert-${variant} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <span aria-hidden="true" className="saamx-alert-icon">
        {icon || defaultIcons[variant] || defaultIcons.info}
      </span>
      <div className="saamx-alert-content">
        {title && <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 800 }}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className="saamx-alert-close-btn"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Standard Error Boundary State Component
 */
export function ErrorBoundaryState({
  error,
  onRetry,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`saamx-error-boundary ${className}`.trim()}
      style={style}
    >
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
        <IconShieldCheck size={42} />
      </div>
      <h3 className="saamx-error-boundary-title">
        Interface Rendering Interrupted
      </h3>
      <p style={{ margin: '8px 0 16px 0', fontSize: '0.85rem', maxWidth: '450px', lineHeight: 1.45 }}>
        {error?.message || 'An unexpected rendering error occurred while loading this section.'}
      </p>
      {onRetry && (
        <Button variant="destructive" onClick={onRetry} size="sm">
          Retry Component
        </Button>
      )}
    </div>
  );
}

export default Spinner;
