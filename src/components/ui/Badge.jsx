import React from 'react';
import './primitives.css';
import { IconBuilding, IconX, IconLogOut, IconUser, IconShieldCheck } from '../../lib/icons.jsx';

/**
 * Standard Status Badge Primitive
 * Pairs semantic colors with explicit text and optional icons (Colorblind redundant).
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon = null,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <span
      className={`saamx-badge saamx-badge-${variant} saamx-badge-${size} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * Specialized Order Lifecycle Status Badge
 * Enforces standardized icons and colors across all trading consoles.
 */
export function OrderStatusBadge({ status = 'QUEUED', size = 'md', className = '', style = {} }) {
  const normalized = (status || '').toUpperCase().trim();

  const statusConfigs = {
    AWAITING_PHYSICAL_SLIP: {
      variant: 'warn',
      icon: <span style={{ fontWeight: 800 }}>•</span>,
      label: 'AWAITING PHYSICAL SLIP'
    },
    VERIFYING_AT_EXCHANGE: {
      variant: 'info',
      icon: <IconUser size={12} />,
      label: 'EXCHANGE VERIFYING'
    },
    EXCHANGE_APPROVED: {
      variant: 'gain',
      icon: <span style={{ fontSize: '0.85em' }}>★</span>,
      label: 'EXCHANGE APPROVED',
      customStyle: {
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        color: '#059669',
        borderColor: 'rgba(5, 150, 105, 0.4)'
      }
    },
    AWAITING_BANK_SETTLEMENT: {
      variant: 'warn',
      icon: <IconBuilding size={12} />,
      label: 'AWAITING BANK SETTLEMENT',
      customStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#D97706',
        borderColor: 'rgba(245, 158, 11, 0.4)'
      }
    },
    VERIFYING_AT_BANK: {
      variant: 'info',
      icon: <IconBuilding size={12} />,
      label: 'BANK VERIFYING',
      customStyle: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        color: '#2563EB',
        borderColor: 'rgba(59, 130, 246, 0.4)'
      }
    },
    HELD_FOR_REVIEW: {
      variant: 'warn',
      icon: <span style={{ fontSize: '0.85em' }}>⏸</span>,
      label: 'HELD FOR REVIEW',
      customStyle: {
        backgroundColor: 'rgba(234, 88, 12, 0.15)',
        color: '#EA580C',
        borderColor: 'rgba(234, 88, 12, 0.4)'
      }
    },
    RETURNED_FOR_CORRECTION: {
      variant: 'neutral',
      icon: <IconLogOut size={12} />,
      label: 'RETURNED FOR CORRECTION',
      customStyle: {
        backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))',
        color: 'var(--color-warn, #D97706)',
        borderColor: 'rgba(217, 119, 6, 0.3)'
      }
    },
    REJECTED_BY_EXCHANGE: {
      variant: 'loss',
      icon: <IconX size={12} />,
      label: 'EXCHANGE REJECTED'
    },
    REJECTED_BY_BANK: {
      variant: 'loss',
      icon: <IconX size={12} />,
      label: 'BANK REJECTED'
    },
    QUEUED: {
      variant: 'warn',
      icon: <span style={{ fontWeight: 800 }}>•</span>,
      label: 'IN QUEUE'
    },
    CLAIMED: {
      variant: 'info',
      icon: <IconUser size={12} />,
      label: 'DESK CLAIMED'
    },
    VALIDATED: {
      variant: 'gain',
      icon: <IconShieldCheck size={12} />,
      label: 'VALIDATED'
    },
    EXECUTED: {
      variant: 'gain',
      icon: <span style={{ fontSize: '0.85em' }}>★</span>,
      label: 'EXECUTED',
      customStyle: {
        backgroundColor: 'var(--color-gain, #059669)',
        color: '#FFFFFF',
        borderColor: 'var(--color-gain, #059669)'
      }
    },
    EXECUTED_PENDING_SETTLEMENT: {
      variant: 'warn',
      icon: <IconBuilding size={12} />,
      label: 'AWAITING BANK SETTLEMENT',
      customStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#D97706',
        borderColor: 'rgba(245, 158, 11, 0.4)'
      }
    },
    PENDING_SETTLEMENT: {
      variant: 'warn',
      icon: <IconBuilding size={12} />,
      label: 'AWAITING BANK SETTLEMENT',
      customStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#D97706',
        borderColor: 'rgba(245, 158, 11, 0.4)'
      }
    },
    SETTLED: {
      variant: 'gain',
      icon: <span style={{ fontSize: '0.85em' }}>✓</span>,
      label: 'BANK SETTLED',
      customStyle: {
        backgroundColor: 'var(--color-gain, #059669)',
        color: '#FFFFFF',
        borderColor: 'var(--color-gain, #059669)'
      }
    },
    SETTLEMENT_REJECTED: {
      variant: 'loss',
      icon: <IconX size={12} />,
      label: 'BANK REJECTED'
    },
    RETURNED: {
      variant: 'neutral',
      icon: <IconLogOut size={12} />,
      label: 'RETURNED TO TEAM',
      customStyle: {
        backgroundColor: 'var(--color-warn-subtle, rgba(217, 119, 6, 0.1))',
        color: 'var(--color-warn, #D97706)',
        borderColor: 'rgba(217, 119, 6, 0.3)'
      }
    },
    REJECTED: {
      variant: 'loss',
      icon: <IconX size={12} />,
      label: 'REJECTED'
    }
  };

  const config = statusConfigs[normalized] || {
    variant: 'neutral',
    icon: <span>•</span>,
    label: normalized || 'UNKNOWN'
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={config.icon}
      className={`saamx-order-status-badge ${className}`.trim()}
      style={{ ...config.customStyle, ...style }}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Physical Desk Station Identifier Badge
 */
export function StationBadge({ deskId = 'DESK_1', clerkName = null, size = 'md', style = {} }) {
  return (
    <span
      className="saamx-station-badge"
      style={{
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '0.72rem' : '0.80rem',
        ...style
      }}
    >
      <IconBuilding size={14} aria-hidden="true" />
      <span>{deskId}</span>
      {clerkName && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--color-ink-secondary)',
            borderLeft: '1px solid var(--color-border)',
            paddingLeft: '6px',
            marginLeft: '2px'
          }}
        >
          {clerkName}
        </span>
      )}
    </span>
  );
}

export default Badge;
