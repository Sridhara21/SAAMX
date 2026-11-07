import React from 'react';
import './primitives.css';

/**
 * Primitive Table Wrapper
 */
export function Table({
  children,
  className = '',
  style = {},
  density, // optional 'comfortable' | 'compact'
  stickyHeader = false,
  maxHeight,
  wrapperClassName = '',
  wrapperStyle = {},
  ...rest
}) {
  const mergedWrapperStyle = {
    ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
    ...wrapperStyle,
    ...style
  };

  return (
    <div
      className={`saamx-table-wrapper ${stickyHeader ? 'has-sticky-header' : ''} ${wrapperClassName} ${className}`.trim()}
      data-density={density || undefined}
      style={mergedWrapperStyle}
    >
      <table className="saamx-table" {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', style = {}, ...rest }) {
  return (
    <thead
      className={`saamx-table-head ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', style = {}, ...rest }) {
  return (
    <tbody className={`saamx-table-body ${className}`.trim()} style={style} {...rest}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, isSelected = false, className = '', style = {}, ...rest }) {
  return (
    <tr
      className={`saamx-table-row ${isSelected ? 'selected' : ''} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  align = 'left',
  sortable = false,
  sortDirection = null, // 'asc' | 'desc' | null
  onSort,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <th
      scope="col"
      onClick={sortable ? onSort : undefined}
      className={`saamx-table-th ${sortable ? 'sortable' : ''} ${className}`.trim()}
      style={{
        textAlign: align,
        ...style
      }}
      {...rest}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          gap: '6px',
          width: '100%'
        }}
      >
        <span>{children}</span>
        {sortable && (
          <span
            aria-hidden="true"
            style={{
              fontSize: '0.80em',
              color: sortDirection ? 'var(--color-accent, #2563EB)' : 'var(--color-ink-muted, #94A3B8)'
            }}
          >
            {sortDirection === 'asc' ? '▲' : sortDirection === 'desc' ? '▼' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

export function TableCell({ children, align = 'left', className = '', style = {}, ...rest }) {
  return (
    <td
      className={`saamx-table-td ${className}`.trim()}
      style={{
        textAlign: align,
        ...style
      }}
      {...rest}
    >
      {children}
    </td>
  );
}

/**
 * Specialized Financial Table Cell
 * Enforces tabular numerals, right alignment, and tokenized gain/loss/neutral coloring.
 */
export function FinancialCell({
  value,
  trend = 'neutral', // 'gain' | 'loss' | 'neutral'
  prefix = '',
  suffix = '',
  children,
  className = '',
  style = {},
  ...rest
}) {
  const trendColor = {
    gain: 'var(--color-gain-text, var(--color-rise, #10B981))',
    loss: 'var(--color-loss-text, var(--color-fall, #EF4444))',
    neutral: 'var(--color-ink)'
  }[trend] || 'var(--color-ink)';

  return (
    <TableCell
      align="right"
      className={`saamx-financial-cell font-mono tabular-nums ${className}`.trim()}
      style={{
        color: trendColor,
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        fontWeight: 600,
        ...style
      }}
      {...rest}
    >
      {children !== undefined ? children : `${prefix}${value ?? ''}${suffix}`}
    </TableCell>
  );
}

/**
 * Standard Declarative Data Table Component
 */
export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No records found.',
  className = '',
  style = {},
  density,
  stickyHeader,
  maxHeight
}) {
  return (
    <Table
      className={className}
      style={style}
      density={density}
      stickyHeader={stickyHeader}
      maxHeight={maxHeight}
    >
      <TableHeader>
        <TableRow>
          {columns.map((col, idx) => (
            <TableHead
              key={col.key || idx}
              align={col.align || 'left'}
              sortable={col.sortable}
              sortDirection={sortColumn === col.key ? sortDirection : null}
              onSort={() => onSort?.(col.key)}
              style={col.headerStyle}
            >
              {col.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-ink-muted, #94A3B8)' }}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIdx) => {
            const rowKey = row[keyField] ?? rowIdx;
            return (
              <TableRow key={rowKey}>
                {columns.map((col, colIdx) => {
                  const cellVal = row[col.key];
                  return (
                    <TableCell
                      key={col.key || colIdx}
                      align={col.align || 'left'}
                      style={col.cellStyle}
                    >
                      {col.render ? col.render(cellVal, row) : cellVal}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export default Table;
