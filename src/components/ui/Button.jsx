import React from 'react';
import './primitives.css';

/**
 * SAAMX Standard Button Primitive
 * Standardized institutional button with robust focus visible states,
 * keyboard accessibility, loading state indicator, and theme tokens.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  style = {},
  type = 'button',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`saamx-btn saamx-btn-${variant} saamx-btn-${size} ${loading ? 'saamx-btn-loading' : ''} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="saamx-spinner"
            role="status"
            aria-label="Loading"
            style={{
              width: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
              height: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
              borderWidth: '2px',
              borderTopColor: 'currentColor',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              marginRight: children ? '6px' : 0
            }}
          />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="saamx-btn-icon-left" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="saamx-btn-icon-right" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

/**
 * Standard Icon-Only Button
 * Enforces accessible name via aria-label and standardized square dimensions.
 */
export function IconButton({
  icon,
  'aria-label': ariaLabel,
  title,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style = {},
  type = 'button',
  onClick,
  ...rest
}) {
  if (!ariaLabel && !title) {
    console.warn('IconButton: aria-label or title is required for accessibility.');
  }

  const dimensionMap = {
    sm: '28px',
    md: '36px',
    lg: '44px'
  };

  const dim = dimensionMap[size] || '36px';

  return (
    <Button
      variant={variant}
      disabled={disabled}
      loading={loading}
      type={type}
      onClick={onClick}
      aria-label={ariaLabel || title}
      title={title || ariaLabel}
      className={`saamx-icon-btn ${className}`.trim()}
      style={{
        width: dim,
        height: dim,
        padding: 0,
        ...style
      }}
      {...rest}
    >
      {!loading && (
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
      )}
    </Button>
  );
}

export default Button;
