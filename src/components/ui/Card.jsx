import React from 'react';
import './primitives.css';

/**
 * Standard Surface Card Primitive
 * Clean institutional surface container with tokenized hierarchy.
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  density, // optional 'comfortable' | 'compact'
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      className={`saamx-card saamx-card-${variant} saamx-card-padding-${padding} ${className}`.trim()}
      data-density={density || undefined}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Card Header with Title, Subtitle, and Optional Action Slot
 */
export function CardHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      className={`saamx-card-header ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children ? (
        children
      ) : (
        <>
          <div style={{ flex: 1 }}>
            {title && (
              <h3 className="saamx-card-title">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="saamx-card-subtitle">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {action}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CardTitle({ children, className = '', style = {}, ...rest }) {
  return (
    <h3
      className={`saamx-card-title ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardBody({ children, className = '', style = {}, ...rest }) {
  return (
    <div
      className={`saamx-card-body ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style = {}, ...rest }) {
  return (
    <div
      className={`saamx-card-footer ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Top-Level Section / Page Header Primitive
 */
export function SectionHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      className={`saamx-section-header ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 className="saamx-section-header-title">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="saamx-section-header-sub">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default Card;
