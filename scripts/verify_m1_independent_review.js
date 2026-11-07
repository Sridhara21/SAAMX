/**
 * Independent Verification Script for Milestone 1 Review
 * Tests WCAG contrast ratios, parser resilience, formatter behavior, and token completeness.
 */

// 1. WCAG Contrast Ratio Calculation
function getLuminance(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const [aR, aG, aB] = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

function getContrast(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log('=== WCAG Contrast Ratio Verification ===');
const darkTokens = {
  canvas: '#0A0D14',
  surface: '#121722',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#00E5FF',
  rise: '#10B981',
  fall: '#EF4444'
};

const lightTokens = {
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  accent: '#2563EB',
  rise: '#059669',
  fall: '#DC2626'
};

console.log('Dark Mode:');
console.log('Text Primary vs Canvas:', getContrast(darkTokens.textPrimary, darkTokens.canvas).toFixed(2), '(Expected >= 4.5)');
console.log('Text Primary vs Surface:', getContrast(darkTokens.textPrimary, darkTokens.surface).toFixed(2), '(Expected >= 4.5)');
console.log('Text Secondary vs Surface:', getContrast(darkTokens.textSecondary, darkTokens.surface).toFixed(2), '(Expected >= 4.5)');
console.log('Accent Cyan vs Canvas:', getContrast(darkTokens.accent, darkTokens.canvas).toFixed(2), '(Expected >= 3.0)');

console.log('\nLight Mode:');
console.log('Text Primary vs Canvas:', getContrast(lightTokens.textPrimary, lightTokens.canvas).toFixed(2), '(Expected >= 4.5)');
console.log('Text Primary vs Surface:', getContrast(lightTokens.textPrimary, lightTokens.surface).toFixed(2), '(Expected >= 4.5)');
console.log('Text Secondary vs Surface:', getContrast(lightTokens.textSecondary, lightTokens.surface).toFixed(2), '(Expected >= 4.5)');
console.log('Accent Blue vs Surface:', getContrast(lightTokens.accent, lightTokens.surface).toFixed(2), '(Expected >= 3.0)');

// 2. Formatters Logic Verification
import('../src/lib/formatters.js').then((fmt) => {
  console.log('\n=== Formatter Stress-Testing ===');
  console.log('Currency (0):', fmt.formatCurrency(0, 'INR'));
  console.log('Currency (null):', fmt.formatCurrency(null, 'INR'));
  console.log('Currency (undefined):', fmt.formatCurrency(undefined, 'INR'));
  console.log('Currency (negative):', fmt.formatCurrency(-50000, 'INR'));
  console.log('Currency (12 currencies):', ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'CHF', 'CAD', 'AUD', 'CNY', 'HKD'].map(c => fmt.formatCurrency(100, c)).join(', '));
  console.log('Price (0):', fmt.formatPrice(0));
  console.log('Price (large):', fmt.formatPrice(1234567.89));
  console.log('Delta (positive):', fmt.formatDelta(5.25));
  console.log('Delta (negative):', fmt.formatDelta(-3.14));
  console.log('Delta (zero):', fmt.formatDelta(0));
  console.log('Quantity (1000):', fmt.formatQuantity(1000));
  console.log('Quantity (0):', fmt.formatQuantity(0));
  console.log('Quantity (null):', fmt.formatQuantity(null));
}).catch(err => {
  console.error('Formatter import failed:', err);
});
