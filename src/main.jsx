import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import './components/ui/primitives.css';
import { apiFetch } from './lib/api.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { DensityProvider } from './context/DensityContext.jsx';

// Global Fetch Interceptor to route server api paths to local client-side firebase adapter
const originalFetch = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : null;
if (typeof window !== 'undefined') {
  window.__nativeFetch = originalFetch;
}

window.fetch = async function (input, init) {
  if (init && init._skipApiIntercept) {
    return originalFetch ? originalFetch(input, init) : Promise.reject(new Error('Fetch unavailable'));
  }
  const url = typeof input === 'string' ? input : input?.url;
  if (url && (url.startsWith('/api/') || url.includes('/api/'))) {
    const apiPath = url.substring(url.indexOf('/api/'));
    return apiFetch(apiPath, init);
  }
  return originalFetch ? originalFetch.apply(this, arguments) : Promise.reject(new Error('Fetch unavailable'));
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <DensityProvider>
          <App />
        </DensityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
