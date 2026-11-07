import React from 'react';
import {
  formatCurrency,
  formatPrice,
  formatDelta,
  formatQuantity
} from '../../lib/formatters.js';

export {
  formatCurrency,
  formatPrice,
  formatDelta,
  formatQuantity
};

/**
 * Currency Amount Display Component
 */
export function CurrencyDisplay({
  amount,
  value,
  currency = 'INR',
  decimals = 2,
  compact = false,
  signed = false,
  hideSymbol = false,
  showSymbol = true,
  className = '',
  style = {}
}) {
  const val = amount !== undefined ? amount : value;
  const shouldShowSymbol = hideSymbol ? false : showSymbol;
  let formatted = formatCurrency(val, currency, { decimals, compact, showSymbol: shouldShowSymbol });
  if (signed && Number(val) > 0 && !formatted.startsWith('+')) {
    formatted = `+${formatted}`;
  }

  return (
    <span
      className={`saamx-currency-display font-mono tabular-nums ${className}`}
      style={{
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        fontWeight: 700,
        ...style
      }}
    >
      {formatted}
    </span>
  );
}

/**
 * Single Price Display Component
 */
export function PriceDisplay({
  price,
  value,
  previousPrice,
  currency = 'INR',
  decimals = 2,
  prefix = null,
  className = '',
  style = {}
}) {
  const val = price !== undefined ? price : value;
  const symbol = prefix !== null ? prefix : currency === 'INR' ? '₹' : '';
  const formattedPrice = formatPrice(val, decimals);

  let priceColor = 'inherit';
  if (previousPrice !== undefined && previousPrice !== null) {
    if (Number(val) > Number(previousPrice)) priceColor = 'var(--color-rise, #10B981)';
    else if (Number(val) < Number(previousPrice)) priceColor = 'var(--color-fall, #EF4444)';
  }

  return (
    <span
      className={`saamx-price-display font-mono tabular-nums ${className}`}
      style={{
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        fontWeight: 700,
        color: priceColor,
        ...style
      }}
    >
      {symbol && <span style={{ opacity: 0.85, marginRight: '2px' }}>{symbol}</span>}
      {formattedPrice}
    </span>
  );
}

/**
 * Delta Badge (Percentage Change with Directional Arrow)
 * Never relies on color alone (includes ▲, ▼, — symbols).
 */
export function DeltaBadge({
  delta,
  deltaPercent,
  value,
  isPercentage = true,
  decimals = 2,
  size = 'md',
  inverted = false,
  className = '',
  style = {}
}) {
  const rawVal = delta !== undefined ? delta : deltaPercent !== undefined ? deltaPercent : value;
  const { text, direction: rawDir, arrow: rawArrow } = formatDelta(rawVal, { decimals, isPercentage });

  let direction = rawDir;
  let arrow = rawArrow;
  if (inverted && rawDir !== 'neutral') {
    direction = rawDir === 'gain' ? 'loss' : 'gain';
  }

  const colorStyles = {
    gain: {
      color: 'var(--color-gain-text, #34D399)',
      backgroundColor: 'var(--color-gain-bg, rgba(16, 185, 129, 0.12))',
      border: '1px solid var(--color-gain-border, rgba(16, 185, 129, 0.3))'
    },
    loss: {
      color: 'var(--color-loss-text, #F87171)',
      backgroundColor: 'var(--color-loss-bg, rgba(239, 68, 68, 0.12))',
      border: '1px solid var(--color-loss-border, rgba(239, 68, 68, 0.3))'
    },
    neutral: {
      color: 'var(--color-ink-muted, #94A3B8)',
      backgroundColor: 'var(--color-surface-2, #161D2B)',
      border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))'
    }
  }[direction] || {
    color: 'var(--color-ink-muted, #94A3B8)',
    backgroundColor: 'var(--color-surface-2, #161D2B)',
    border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))'
  };

  return (
    <span
      className={`saamx-delta-badge saamx-delta-${direction} font-mono tabular-nums ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        borderRadius: 'var(--radius-sm, 6px)',
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        fontSize: size === 'sm' ? '0.72rem' : '0.80rem',
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...colorStyles,
        ...style
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.85em' }}>{arrow}</span>
      <span>{text}</span>
    </span>
  );
}

/**
 * Share Quantity Display Component
 */
export function QuantityDisplay({
  quantity,
  value,
  unit,
  suffix = 'QTY',
  className = '',
  style = {}
}) {
  const val = quantity !== undefined ? quantity : value;
  const unitLabel = unit !== undefined ? unit : suffix;
  const formatted = formatQuantity(val);

  return (
    <span
      className={`saamx-quantity-display font-mono tabular-nums ${className}`}
      style={{
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        fontWeight: 600,
        ...style
      }}
    >
      <span>{formatted}</span>
      {unitLabel && (
        <span
          style={{
            fontSize: '0.75em',
            color: 'var(--color-ink-muted, #94A3B8)',
            marginLeft: '4px',
            fontWeight: 700
          }}
        >
          {unitLabel}
        </span>
      )}
    </span>
  );
}
