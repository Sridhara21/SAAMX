import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { apiFetch } from './lib/api.js';

// Global Fetch Interceptor to route server api paths to local client-side firebase adapter
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input?.url;
  if (url && (url.startsWith('/api/') || url.includes('/api/'))) {
    const apiPath = url.substring(url.indexOf('/api/'));
    return apiFetch(apiPath, init);
  }
  return originalFetch.apply(this, arguments);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
