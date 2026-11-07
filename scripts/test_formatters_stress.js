import assert from 'assert';
import {
  formatCurrency,
  formatPrice,
  formatDelta,
  formatQuantity
} from '../src/lib/formatters.js';

console.log('--- Stress Testing Financial Formatters Edge Cases ---');

// 1. Currency
console.log('Testing formatCurrency with edge cases...');
assert.strictEqual(formatCurrency(0, 'INR', { showSymbol: true }), '₹0.00');
assert.strictEqual(formatCurrency(null, 'INR'), '—');
assert.strictEqual(formatCurrency(undefined, 'INR'), '—');
assert.strictEqual(formatCurrency('invalid_num', 'INR'), '—');
assert.strictEqual(formatCurrency(-50000, 'INR', { showSymbol: true }), '-₹50,000.00');
assert.strictEqual(formatCurrency(1e12, 'INR', { showSymbol: true, compact: true }), '₹100000.00 Cr');

// 2. Price
console.log('Testing formatPrice with edge cases...');
assert.strictEqual(formatPrice(0), '0.00');
assert.strictEqual(formatPrice(null), '—');
assert.strictEqual(formatPrice(undefined), '—');
assert.strictEqual(formatPrice(NaN), '—');
assert.strictEqual(formatPrice('abc'), '—');
assert.strictEqual(formatPrice(99.999), '100.00');
assert.strictEqual(formatPrice(-12.5), '-12.50');

// 3. Delta
console.log('Testing formatDelta with edge cases...');
const dNull = formatDelta(null);
assert.strictEqual(dNull.arrow, '—');
assert.strictEqual(dNull.text, '—');
assert.strictEqual(dNull.direction, 'neutral');

const dUndef = formatDelta(undefined);
assert.strictEqual(dUndef.arrow, '—');
assert.strictEqual(dUndef.text, '—');

const dZero = formatDelta(0);
assert.strictEqual(dZero.arrow, '—');
assert.strictEqual(dZero.direction, 'neutral');
assert.strictEqual(dZero.text, '0.00%');

const dPos = formatDelta(0.0001);
assert.strictEqual(dPos.direction, 'gain');
assert.strictEqual(dPos.arrow, '▲');

const dNeg = formatDelta(-0.0001);
assert.strictEqual(dNeg.direction, 'loss');
assert.strictEqual(dNeg.arrow, '▼');

// 4. Quantity
console.log('Testing formatQuantity with edge cases...');
assert.strictEqual(formatQuantity(0), '0');
assert.strictEqual(formatQuantity(null), '0');
assert.strictEqual(formatQuantity(undefined), '0');
assert.strictEqual(formatQuantity(-1000), '-1,000');
assert.strictEqual(formatQuantity(10000000), '10,000,000');

console.log('✓ All financial formatter edge cases survived gracefully without throwing!');
