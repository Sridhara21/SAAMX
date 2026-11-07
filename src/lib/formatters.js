/**
 * Universal Financial & Number Formatting Utilities
 * Pure JavaScript module: usable in both frontend components and Node.js environments.
 */

export const CURRENCY_DIRECTORY = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', precision: 2, flag: '🇮🇳', defaultMidRate: 1.0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2, flag: '🇺🇸', defaultMidRate: 88.20 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', precision: 2, flag: '🇬🇧', defaultMidRate: 119.40 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', precision: 2, flag: '🇪🇺', defaultMidRate: 103.50 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', precision: 0, flag: '🇯🇵', defaultMidRate: 0.58 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', precision: 2, flag: '🇦🇪', defaultMidRate: 24.01 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', precision: 2, flag: '🇸🇬', defaultMidRate: 66.80 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥', precision: 2, flag: '🇨🇳', defaultMidRate: 12.25 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', precision: 2, flag: '🇦🇺', defaultMidRate: 55.50 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', precision: 0, flag: '🇰🇷', defaultMidRate: 0.062 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', precision: 2, flag: '🇨🇦', defaultMidRate: 64.50, isLegacy: true, tradable: false },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF ', precision: 2, flag: '🇨🇭', defaultMidRate: 99.10, isLegacy: true, tradable: false }
};

export const ACTIVE_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];
export const ACTIVE_FOREIGN_CURRENCIES = ['USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
  AED: 'AED ',
  SGD: 'S$',
  CNY: 'CN¥',
  AUD: 'A$',
  KRW: '₩',
  CAD: 'C$',
  CHF: 'CHF '
};

export const DEFAULT_FX_RATES = {
  USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  JPYINR: { pair: 'JPY/INR', base: 'JPY', quote: 'INR', midRate: 0.58, buyRate: 0.583, sellRate: 0.577, spreadPercent: 0.52, label: 'Simulation Reference Rate' },
  AEDINR: { pair: 'AED/INR', base: 'AED', quote: 'INR', midRate: 24.01, buyRate: 24.12, sellRate: 23.90, spreadPercent: 0.46, label: 'Simulation Reference Rate' },
  SGDINR: { pair: 'SGD/INR', base: 'SGD', quote: 'INR', midRate: 66.80, buyRate: 67.10, sellRate: 66.50, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  CNYINR: { pair: 'CNY/INR', base: 'CNY', quote: 'INR', midRate: 12.25, buyRate: 12.31, sellRate: 12.19, spreadPercent: 0.49, label: 'Simulation Reference Rate' },
  AUDINR: { pair: 'AUD/INR', base: 'AUD', quote: 'INR', midRate: 55.50, buyRate: 55.75, sellRate: 55.25, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  KRWINR: { pair: 'KRW/INR', base: 'KRW', quote: 'INR', midRate: 0.062, buyRate: 0.0623, sellRate: 0.0617, spreadPercent: 0.48, label: 'Simulation Reference Rate' },
  CADINR: { pair: 'CAD/INR', base: 'CAD', quote: 'INR', midRate: 64.50, buyRate: 64.79, sellRate: 64.21, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  CHFINR: { pair: 'CHF/INR', base: 'CHF', quote: 'INR', midRate: 99.10, buyRate: 99.55, sellRate: 98.65, spreadPercent: 0.45, label: 'Simulation Reference Rate' }
};

export function getCurrencyDecimals(currency = 'INR') {
  return CURRENCY_DIRECTORY[currency]?.precision ?? 2;
}

export function roundCurrency(amount, currency = 'INR') {
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) {
    return Math.round(Number(amount) || 0);
  }
  return parseFloat((Number(amount) || 0).toFixed(decimals));
}

/**
 * Universal Currency Formatter
 * Supports explicit currency codes and handles INR formatting (lakh/crore) when requested.
 * Respects currency-specific precision (e.g. JPY has 0 decimals).
 */
export function formatCurrency(value, currency = 'INR', options = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';

  const curMeta = CURRENCY_DIRECTORY[currency] || { precision: 2, symbol: currency };
  const decimals = options.decimals !== undefined ? options.decimals : curMeta.precision;
  const { compact = false, showSymbol = true } = options;

  const isNeg = num < 0;
  const sign = isNeg ? '-' : '';
  const absNum = Math.abs(num);

  // Indian Rupee custom symbol & formatting
  if (currency === 'INR') {
    const symbol = showSymbol ? '₹' : '';
    if (compact) {
      if (absNum >= 1e7) {
        return `${sign}${symbol}${(absNum / 1e7).toFixed(decimals)} Cr`;
      }
      if (absNum >= 1e5) {
        return `${sign}${symbol}${(absNum / 1e5).toFixed(decimals)} L`;
      }
      if (absNum >= 1e3) {
        return `${sign}${symbol}${(absNum / 1e3).toFixed(decimals)} k`;
      }
    }

    // Format with standard locale if possible
    try {
      const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(absNum);
      return `${sign}${symbol}${formatted}`;
    } catch {
      return `${sign}${symbol}${absNum.toFixed(decimals)}`;
    }
  }

  // Japanese Yen & South Korean Won (0 decimals by default)
  if (currency === 'JPY' || currency === 'KRW') {
    const defaultSym = currency === 'KRW' ? '₩' : '¥';
    const symbol = showSymbol ? (CURRENCY_SYMBOLS[currency] || defaultSym) : '';
    const locale = currency === 'KRW' ? 'ko-KR' : 'ja-JP';
    try {
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(absNum);
      return `${sign}${symbol}${formatted}`;
    } catch {
      return `${sign}${symbol}${Math.round(absNum).toLocaleString()}`;
    }
  }

  // General ISO Currency
  try {
    return new Intl.NumberFormat('en-US', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency || 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch {
    const sym = showSymbol ? (CURRENCY_SYMBOLS[currency] || `${currency} `) : '';
    return `${sign}${sym}${absNum.toFixed(decimals)}`;
  }
}

/**
 * Universal Stock / Asset Price Formatter
 */
export function formatPrice(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  return num.toFixed(decimals);
}

/**
 * Percentage / Numeric Delta Formatter
 */
export function formatDelta(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return { text: '—', direction: 'neutral', arrow: '—' };
  }
  const num = Number(value);
  if (isNaN(num)) return { text: '—', direction: 'neutral', arrow: '—' };

  const { decimals = 2, isPercentage = true } = options;
  const suffix = isPercentage ? '%' : '';

  if (num > 0.00001) {
    return {
      text: `+${num.toFixed(decimals)}${suffix}`,
      direction: 'gain',
      arrow: '▲'
    };
  } else if (num < -0.00001) {
    return {
      text: `${num.toFixed(decimals)}${suffix}`,
      direction: 'loss',
      arrow: '▼'
    };
  }
  return {
    text: `0.00${suffix}`,
    direction: 'neutral',
    arrow: '—'
  };
}

/**
 * Share Quantity / Volume Formatter
 */
export function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
}
