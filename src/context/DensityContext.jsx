import React, { createContext, useContext, useState, useEffect } from 'react';

export const DensityContext = createContext({
  density: 'comfortable',
  isCompact: false,
  isComfortable: true,
  toggleDensity: () => {},
  setDensity: () => {}
});

export function DensityProvider({ children, initialDensity }) {
  const [density, setDensityState] = useState(() => {
    if (initialDensity === 'compact' || initialDensity === 'comfortable') {
      return initialDensity;
    }
    try {
      const saved = localStorage.getItem('saamx_density');
      if (saved === 'compact' || saved === 'comfortable') {
        return saved;
      }
      if (typeof document !== 'undefined') {
        const attr = document.documentElement.getAttribute('data-density');
        if (attr === 'compact' || attr === 'comfortable') return attr;
      }
      return 'comfortable';
    } catch (e) {
      return 'comfortable';
    }
  });

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-density', density);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('saamx_density', density);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('saamx_density_changed', { detail: { density } }));
      }
    } catch (e) {
      console.warn('Failed to persist density setting:', e);
    }
  }, [density]);

  // Synchronize across browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'saamx_density' && (e.newValue === 'comfortable' || e.newValue === 'compact')) {
        setDensityState(e.newValue);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  const setDensity = (newDensity) => {
    if (newDensity === 'comfortable' || newDensity === 'compact') {
      setDensityState(newDensity);
    }
  };

  const toggleDensity = () => {
    setDensityState(prev => (prev === 'compact' ? 'comfortable' : 'compact'));
  };

  const value = {
    density,
    isCompact: density === 'compact',
    isComfortable: density === 'comfortable',
    toggleDensity,
    setDensity
  };

  return (
    <DensityContext.Provider value={value}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    return {
      density: 'comfortable',
      isCompact: false,
      isComfortable: true,
      toggleDensity: () => {},
      setDensity: () => {}
    };
  }
  return context;
}

export default DensityContext;
