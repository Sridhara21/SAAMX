import React, { useEffect } from 'react';
import ExchangePage from './ExchangePage.jsx';

/**
 * SAAMX 2.0 — Merged Verification & Exchange Desk Canonical Component
 * 
 * In accordance with Requirement 1:
 * "Merge Verification and Exchange Desks into one operational desk.
 * Prevents separate/duplicate verification workflows."
 * 
 * Standalone verification has been permanently merged into ExchangePage.jsx.
 * Any legacy accesses or component references seamlessly render the merged desk.
 */
export default function VerificationPage(props) {
  useEffect(() => {
    if (window.location.hash === '#/verification' || window.location.hash === '#/verification-desk') {
      window.location.hash = '#/exchange';
    }
  }, []);

  return <ExchangePage {...props} />;
}
