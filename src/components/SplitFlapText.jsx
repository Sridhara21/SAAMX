import React, { useState, useEffect } from 'react';

// Single Character physical mechanical flap card
function SplitFlapChar({ char, small }) {
  const [prevChar, setPrevChar] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check accessibility reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (char !== prevChar) {
      if (reducedMotion) {
        setPrevChar(char);
        setIsFlipping(true);
        const timer = setTimeout(() => setIsFlipping(false), 200);
        return () => clearTimeout(timer);
      } else {
        setIsFlipping(true);
        const timer = setTimeout(() => {
          setPrevChar(char);
          setIsFlipping(false);
        }, 220); // Fast flip completion (< 300ms)
        return () => clearTimeout(timer);
      }
    }
  }, [char, prevChar, reducedMotion]);

  if (reducedMotion) {
    return (
      <span
        className="font-data"
        style={{
          display: 'inline-block',
          width: '0.65em',
          textAlign: 'center',
          color: isFlipping ? 'var(--color-brass)' : 'var(--color-ink)',
          transition: 'color 0.2s ease'
        }}
      >
        {char}
      </span>
    );
  }

  const width = small ? '13px' : '18px';
  const height = small ? '22px' : '30px';
  const fontSize = small ? '13px' : '18px';
  const lineHeight = small ? '22px' : '30px';

  return (
    <span style={{
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      width: width,
      height: height,
      fontSize: fontSize,
      lineHeight: lineHeight,
      textAlign: 'center',
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-border)',
      borderRadius: '4px',
      margin: '0 1px',
      perspective: '150px',
      overflow: 'hidden',
      verticalAlign: 'middle',
      boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
    }}>
      {/* Top half static */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        backgroundColor: 'var(--color-surface)'
      }}>
        <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '200%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {char}
        </span>
      </span>

      {/* Bottom half static */}
      <span style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)'
      }}>
        <span style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '200%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {prevChar}
        </span>
      </span>

      {/* Flipping plate */}
      {isFlipping && (
        <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          transformOrigin: 'bottom center',
          animation: 'flap-animation 0.22s linear forwards',
          backfaceVisibility: 'hidden',
          zIndex: 5
        }}>
          <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '200%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {prevChar}
          </span>
        </span>
      )}

      {/* Styles for flip 3D animation */}
      <style>{`
        @keyframes flap-animation {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-180deg); }
        }
      `}</style>
    </span>
  );
}

export default function SplitFlapText({ text, small }) {
  const chars = String(text).split('');
  return (
    <span className="font-data" style={{ display: 'inline-flex', alignItems: 'center' }}>
      {chars.map((c, i) => (
        <SplitFlapChar key={i} char={c} small={small} />
      ))}
    </span>
  );
}
