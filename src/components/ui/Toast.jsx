import React, { useEffect } from 'react';
import './primitives.css';
import { IconX, IconShieldCheck } from '../../lib/icons.jsx';

/**
 * Standard Toast Notification Primitive
 */
export function Toast({
  id,
  message,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  duration = 4000,
  onDismiss,
  className = '',
  style = {}
}) {
  useEffect(() => {
    if (!duration || !onDismiss) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const defaultIcons = {
    success: <span style={{ fontWeight: 800, color: 'var(--color-gain, #059669)' }}>✓</span>,
    error: <IconX size={16} style={{ color: 'var(--color-loss, #DC2626)' }} />,
    warning: <span style={{ fontWeight: 800, color: 'var(--color-warn, #D97706)' }}>⚠</span>,
    info: <IconShieldCheck size={16} style={{ color: 'var(--color-accent, #2563EB)' }} />
  };

  return (
    <div
      role="status"
      className={`saamx-toast saamx-toast-${type} ${className}`.trim()}
      style={style}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {defaultIcons[type] || defaultIcons.info}
        </span>
        <span>{message}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="saamx-toast-close-btn"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Toast Container Shell
 */
export function ToastContainer({ toasts = [], onDismiss, style = {} }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="saamx-toast-container"
      style={style}
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          id={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export default Toast;
