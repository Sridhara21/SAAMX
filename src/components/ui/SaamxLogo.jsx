import React from 'react';

/**
 * SaamxLogo Component
 * Premium Light Glassmorphism Brand Identity matching SAAMX '26 reference design.
 * Features speed streaks / velocity lines, deep navy "SAAMX", and SAAMX orange "'26".
 */
export default function SaamxLogo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle = false,
  subtitleText = "Student Academic Asset Market eXchange",
  variant = 'default', // 'default' | 'inverted' | 'white'
  style = {},
  className = ''
}) {
  const sizeMap = {
    sm: { height: 24, fontSize: '1.05rem', tagSize: '0.62rem', streakWidth: 20 },
    md: { height: 32, fontSize: '1.35rem', tagSize: '0.68rem', streakWidth: 26 },
    lg: { height: 44, fontSize: '1.85rem', tagSize: '0.78rem', streakWidth: 34 },
    xl: { height: 56, fontSize: '2.4rem', tagSize: '0.88rem', streakWidth: 42 }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const isDarkSurface = variant === 'inverted' || variant === 'white';
  const navyColor = isDarkSurface ? '#FFFFFF' : 'var(--color-navy, #0B192C)';
  const orangeColor = 'var(--color-orange, #FF6800)';

  return (
    <div
      className={`saamx-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Dynamic Speed-Lines SVG Glyph */}
      <svg
        width={currentSize.streakWidth}
        height={currentSize.height}
        viewBox="0 0 34 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        {/* Top motion streak */}
        <path
          d="M2 7H24L21 11H5L2 7Z"
          fill={navyColor}
          fillOpacity={isDarkSurface ? 0.9 : 0.8}
        />
        {/* Middle accent streak (orange highlight) */}
        <path
          d="M6 14H32L29 18H9L6 14Z"
          fill={orangeColor}
        />
        {/* Bottom motion streak */}
        <path
          d="M0 21H22L19 25H3L0 21Z"
          fill={navyColor}
          fillOpacity={isDarkSurface ? 0.9 : 0.8}
        />
      </svg>

      {/* Typography: SAAMX '26 */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: "var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif)",
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: '-0.03em',
            fontSize: currentSize.fontSize
          }}
        >
          <span style={{ color: navyColor }}>SAAMX</span>
          <span style={{ color: orangeColor, marginLeft: '2px' }}>’26</span>
        </div>

        {showSubtitle && (
          <span
            style={{
              fontSize: currentSize.tagSize,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDarkSurface ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-ink-muted, #64748B)',
              marginTop: '4px',
              fontFamily: "var(--font-body, 'Inter', sans-serif)"
            }}
          >
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
}
