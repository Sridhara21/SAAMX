import React from 'react';
import './primitives.css';
import { IconSearch, IconX } from '../../lib/icons.jsx';

/**
 * Standard Form Text and Numeric Input Primitive
 */
export function Input({
  id,
  name,
  label,
  error,
  helperText,
  prefix,
  suffix,
  numeric = false,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  inputStyle = {},
  style = {},
  ...rest
}) {
  const inputId = id || (name ? `input-${name}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div
      className={`saamx-form-group ${containerClassName}`.trim()}
      style={style}
    >
      {label && (
        <label htmlFor={inputId} className="saamx-label">
          {label}
          {required && <span className="saamx-label-required">*</span>}
        </label>
      )}

      <div className={`saamx-input-wrapper ${error ? 'has-error' : ''}`}>
        {prefix && (
          <span
            aria-hidden="true"
            className="saamx-input-prefix"
            style={{ fontFamily: numeric ? 'var(--font-mono, monospace)' : 'inherit' }}
          >
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`saamx-input-control ${numeric ? 'numeric' : ''} ${className}`.trim()}
          style={inputStyle}
          {...rest}
        />

        {suffix && (
          <span
            aria-hidden="true"
            className="saamx-input-suffix"
            style={{ fontFamily: numeric ? 'var(--font-mono, monospace)' : 'inherit' }}
          >
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <span id={errorId} role="alert" className="saamx-input-error">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="saamx-input-helper">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Standard Search Input with Shortcut and Clear Button
 */
export function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search stocks, symbols, teams...',
  shortcutBadge = 'Ctrl + K',
  className = '',
  style = {},
  ...rest
}) {
  const handleChange = (e) => {
    if (!onChange) return;
    const strVal = (e && e.target !== undefined) ? e.target.value : (typeof e === 'string' ? e : '');
    onChange(strVal, e);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange('', null);
    }
  };

  const displayVal = (typeof value === 'string' || typeof value === 'number') ? value : '';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...style
      }}
    >
      <span aria-hidden="true" className="saamx-search-icon">
        <IconSearch size={16} />
      </span>

      <input
        type="search"
        value={displayVal}
        onChange={handleChange}
        placeholder={placeholder}
        className={`saamx-search-input ${className}`.trim()}
        {...rest}
      />

      {displayVal ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="saamx-search-clear-btn"
        >
          <IconX size={14} />
        </button>
      ) : shortcutBadge ? (
        <span aria-hidden="true" className="saamx-search-badge">
          {shortcutBadge}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Standard Themed Select Primitive
 */
export function Select({
  id,
  name,
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  style = {},
  ...rest
}) {
  const selectId = id || (name ? `select-${name}` : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div className="saamx-form-group" style={style}>
      {label && (
        <label htmlFor={selectId} className="saamx-label">
          {label}
          {required && <span className="saamx-label-required">*</span>}
        </label>
      )}

      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`saamx-select-control ${error ? 'has-error' : ''} ${className}`.trim()}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>

      {error ? (
        <span id={errorId} role="alert" className="saamx-input-error">
          {error}
        </span>
      ) : helperText ? (
        <span className="saamx-input-helper">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export default Input;
