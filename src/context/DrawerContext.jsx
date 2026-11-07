import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const DRAWER_TYPES = {
  PORTALS: 'PORTALS_DRAWER',
  SEARCH: 'SEARCH_DRAWER',
  PORTFOLIO: 'PORTFOLIO_DRAWER',
  DESK_ACTIONS: 'DESK_DRAWER'
};

const normalizeDrawerId = (id) => {
  if (!id) return null;
  if (id === 'portals' || id === DRAWER_TYPES.PORTALS) return DRAWER_TYPES.PORTALS;
  if (id === 'search' || id === DRAWER_TYPES.SEARCH) return DRAWER_TYPES.SEARCH;
  if (id === 'portfolio' || id === DRAWER_TYPES.PORTFOLIO) return DRAWER_TYPES.PORTFOLIO;
  if (id === 'desk' || id === 'desk_actions' || id === DRAWER_TYPES.DESK_ACTIONS) return DRAWER_TYPES.DESK_ACTIONS;
  return id;
};

export const DrawerContext = createContext({
  activeDrawer: null,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
  isDrawerOpen: () => false
});

export function DrawerProvider({ children }) {
  const [activeDrawer, setActiveDrawer] = useState(null);

  const openDrawer = useCallback((drawerId) => {
    setActiveDrawer(normalizeDrawerId(drawerId));
  }, []);

  const closeDrawer = useCallback(() => {
    setActiveDrawer(null);
  }, []);

  const toggleDrawer = useCallback((drawerId) => {
    const normalized = normalizeDrawerId(drawerId);
    setActiveDrawer(prev => (prev === normalized ? null : normalized));
  }, []);

  const isDrawerOpen = useCallback((drawerId) => {
    if (!drawerId) return Boolean(activeDrawer);
    return activeDrawer === normalizeDrawerId(drawerId);
  }, [activeDrawer]);

  // Lock body scroll while any drawer is open
  useEffect(() => {
    if (activeDrawer) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeDrawer]);

  // Listen to external custom events for opening/closing drawers
  useEffect(() => {
    const handleOpenDrawerEvent = (e) => {
      if (e.detail?.drawer) {
        openDrawer(e.detail.drawer);
      }
    };
    const handleCloseDrawerEvent = () => {
      closeDrawer();
    };
    const handleToggleDrawerEvent = (e) => {
      if (e.detail?.drawer) {
        toggleDrawer(e.detail.drawer);
      }
    };

    window.addEventListener('saamx_open_drawer', handleOpenDrawerEvent);
    window.addEventListener('saamx_close_drawer', handleCloseDrawerEvent);
    window.addEventListener('saamx_toggle_drawer', handleToggleDrawerEvent);

    return () => {
      window.removeEventListener('saamx_open_drawer', handleOpenDrawerEvent);
      window.removeEventListener('saamx_close_drawer', handleCloseDrawerEvent);
      window.removeEventListener('saamx_toggle_drawer', handleToggleDrawerEvent);
    };
  }, [openDrawer, closeDrawer, toggleDrawer]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        if (activeDrawer) {
          e.preventDefault();
          closeDrawer();
        }
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey;

      if (hasModifier) {
        const key = e.key.toLowerCase();

        // Ctrl+K / Cmd+K always available to open search palette
        if (key === 'k') {
          e.preventDefault();
          toggleDrawer(DRAWER_TYPES.SEARCH);
          return;
        }

        // If user is editing text in an input or form field, do not hijack other shortcuts
        if (isInput) return;

        if (key === 'b') {
          e.preventDefault();
          toggleDrawer(DRAWER_TYPES.PORTALS);
        } else if (key === 'p') {
          e.preventDefault();
          toggleDrawer(DRAWER_TYPES.PORTFOLIO);
        } else if (key === 'd') {
          e.preventDefault();
          toggleDrawer(DRAWER_TYPES.DESK_ACTIONS);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawer, closeDrawer, toggleDrawer]);

  return (
    <DrawerContext.Provider value={{ activeDrawer, openDrawer, closeDrawer, toggleDrawer, isDrawerOpen }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    return {
      activeDrawer: null,
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      isDrawerOpen: () => false
    };
  }
  return context;
}
