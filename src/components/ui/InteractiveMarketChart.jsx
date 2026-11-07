import React, { useState, useMemo } from 'react';
import { generateTimeframeData, generateSmoothSvgPath } from '../../lib/chartTimeframeEngine.js';

export default function InteractiveMarketChart({
  instrument,
  timeframe = '1D',
  onTimeframeChange,
  width = 320,
  height = 140,
  state = null,
  showControls = true,
  showAxisLabels = true,
  strokeColor = '#FF6800',
  className = ''
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Compute points and geometry for the active instrument & timeframe
  const chartData = useMemo(() => {
    return generateTimeframeData(instrument, timeframe, state);
  }, [instrument, timeframe, state]);

  const geometry = useMemo(() => {
    return generateSmoothSvgPath(chartData.points, width, height, {
      top: 24,
      bottom: 20,
      left: 12,
      right: 12
    });
  }, [chartData.points, width, height]);

  const activeVertex = hoveredIndex !== null && geometry.vertices[hoveredIndex]
    ? geometry.vertices[hoveredIndex]
    : geometry.vertices[geometry.vertices.length - 1] || { x: width - 20, y: height / 2, price: chartData.lastPrice };

  const activePriceStr = typeof activeVertex.price === 'number'
    ? activeVertex.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(chartData.lastPrice);

  const gradientId = useMemo(() => {
    const id = instrument?.id || instrument?.ticker || instrument?.name || 'chart';
    return `grad-${id.replace(/[^a-zA-Z0-9]/g, '_')}-${timeframe}`;
  }, [instrument, timeframe]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }} className={className}>
      {/* Header Controls (if requested) */}
      {showControls && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['1D', '1W', '1M', '3M', '1Y'].map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: timeframe === tf ? 'var(--color-orange, #FF6800)' : 'transparent',
                  color: timeframe === tf ? '#FFFFFF' : 'var(--color-ink-muted, #64748B)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-ink-muted, #64748B)',
                fontWeight: 600,
                display: 'inline-block'
              }}
              title={chartData.sourceLabel}
            >
              {chartData.sourceLabel}
            </span>
            {chartData.isLive ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--color-rise, #059669)', fontWeight: 800 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-rise, #059669)', boxShadow: '0 0 6px var(--color-rise, #059669)' }} />
                Live
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: 'var(--color-ink-muted, #64748B)', background: 'rgba(100, 116, 139, 0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(100, 116, 139, 0.15)' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-ink-muted, #64748B)' }} />
                Simulated Model
              </span>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div
        style={{ position: 'relative', height: `${height}px`, width: '100%' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            // Find closest vertex by x
            let closestIdx = 0;
            let minDist = Infinity;
            geometry.vertices.forEach((v, idx) => {
              const dist = Math.abs(v.x - relX);
              if (dist < minDist) {
                minDist = dist;
                closestIdx = idx;
              }
            });
            setHoveredIndex(closestIdx);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Subtle Gridlines */}
          <line x1="0" y1="30" x2={width} y2="30" stroke="rgba(11, 25, 44, 0.06)" strokeDasharray="3 3" />
          <line x1="0" y1="70" x2={width} y2="70" stroke="rgba(11, 25, 44, 0.06)" strokeDasharray="3 3" />
          <line x1="0" y1="110" x2={width} y2="110" stroke="rgba(11, 25, 44, 0.06)" strokeDasharray="3 3" />

          {/* Area Gradient */}
          {geometry.areaD && (
            <path
              d={geometry.areaD}
              fill={`url(#${gradientId})`}
            />
          )}

          {/* Trendline */}
          {geometry.pathD && (
            <path
              d={geometry.pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && activeVertex && (
            <line
              x1={activeVertex.x}
              y1={20}
              x2={activeVertex.x}
              y2={height - 20}
              stroke="rgba(11, 25, 44, 0.25)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* Active Vertex Dot */}
          {activeVertex && (
            <circle
              cx={activeVertex.x}
              cy={activeVertex.y}
              r="4.5"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
          )}

          {/* Floating Tooltip Quote Badge */}
          {activeVertex && (
            <g transform={`translate(${Math.max(10, Math.min(width - 70, activeVertex.x - 30))}, ${Math.max(4, activeVertex.y - 32)})`}>
              <rect x="0" y="0" width="64" height="20" rx="4" fill="var(--color-navy, #0B192C)" />
              <text x="32" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="monospace">
                {activePriceStr}
              </text>
            </g>
          )}
        </svg>

        {/* Axis Time / Date Indicators */}
        {showAxisLabels && chartData.xAxisLabels && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: 'var(--color-ink-muted, #64748B)',
              marginTop: '4px',
              fontFamily: 'var(--font-mono, monospace)',
              padding: '0 8px'
            }}
          >
            {chartData.xAxisLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
