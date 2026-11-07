import React, { createContext, useContext, useState } from 'react';
import './primitives.css';

const TabsContext = createContext({
  activeTab: '',
  setActiveTab: () => {}
});

/**
 * Standard Tabs Root Container
 */
export function Tabs({
  value,
  defaultValue,
  onChange,
  children,
  className = '',
  style = {},
  ...rest
}) {
  const [internalTab, setInternalTab] = useState(defaultValue || '');
  const activeTab = value !== undefined ? value : internalTab;

  const handleTabChange = (newTab) => {
    if (value === undefined) {
      setInternalTab(newTab);
    }
    if (onChange) {
      onChange(newTab);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={`saamx-tabs-container ${className}`.trim()} style={style} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tab List Navigation Container
 */
export function TabList({
  children,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <div
      role="tablist"
      className={`saamx-tab-list ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Individual Tab Trigger Button
 */
export function TabTrigger({
  value,
  children,
  icon = null,
  badge = null,
  disabled = false,
  className = '',
  style = {},
  ...rest
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => !disabled && setActiveTab(value)}
      className={`saamx-tab-trigger ${isActive ? 'active' : ''} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      <span>{children}</span>
      {badge && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Tab Content Panel
 */
export function TabContent({
  value,
  children,
  className = '',
  style = {},
  ...rest
}) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`saamx-tab-panel ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Tabs;
