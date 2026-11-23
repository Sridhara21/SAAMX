import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Alert } from '../components/ui/States.jsx';
import {
  IconEye,
  IconSlash,
  IconCheck,
  IconAlertTriangle,
  IconTrendingUp,
  IconLayers,
  IconRefreshCw,
  IconShieldCheck,
  IconLock,
  IconCrown
} from '../lib/icons.jsx';
import { CURRENCY_SYMBOLS, formatCurrency } from '../lib/formatters.js';

const LANDMARK_IPOS = [
  {
    ticker: 'OAI',
    name: 'OpenAI Global Hyperscale IPO',
    companyName: 'OpenAI Inc',
    sector: 'Technology & AI',
    industry: 'Generative AI & Large Frontier Models',
    offerPrice: 180,
    lotSize: 1,
    totalUnits: 1000,
    currency: 'USD',
    exchange: 'NASDAQ',
    description: 'Pioneering frontier foundation models (GPT-4o, ChatGPT, Sora) and developer cloud APIs.'
  },
  {
    ticker: 'STRP',
    name: 'Stripe Global Financial Infra IPO',
    companyName: 'Stripe Payments',
    sector: 'Financial Technology',
    industry: 'Global Payments, Treasury & Billing',
    offerPrice: 95,
    lotSize: 1,
    totalUnits: 1000,
    currency: 'USD',
    exchange: 'NYSE',
    description: 'Core financial payment rail infrastructure powering millions of internet businesses globally.'
  },
  {
    ticker: 'CNVA',
    name: 'Canva Visual Suite IPO',
    companyName: 'Canva Design Tech',
    sector: 'Design & SaaS',
    industry: 'Collaborative Visual Workspace & Enterprise Publishing',
    offerPrice: 42,
    lotSize: 1,
    totalUnits: 1000,
    currency: 'USD',
    exchange: 'NASDAQ',
    description: 'Visual communication software democratizing enterprise design and interactive brand publishing.'
  },
  {
    ticker: 'DISC',
    name: 'Discord Real-Time Network IPO',
    companyName: 'Discord Platforms',
    sector: 'Communications',
    industry: 'Real-Time Voice, Chat & Developer Communities',
    offerPrice: 35,
    lotSize: 1,
    totalUnits: 1000,
    currency: 'USD',
    exchange: 'NYSE',
    description: 'Real-time group messaging and voice protocol for 200M+ monthly active developer communities.'
  },
  {
    ticker: 'POLY',
    name: 'Polymarket Decentralized Protocol IPO',
    companyName: 'Polymarket Protocol',
    sector: 'Information Markets',
    industry: 'Event Probability Forecasts & Information Markets',
    offerPrice: 18,
    lotSize: 1,
    totalUnits: 1000,
    currency: 'USD',
    exchange: 'NASDAQ',
    description: 'Decentralized prediction market and event-arbitrage probability forecasting protocol.'
  }
];

export default function IpoPage({ state }) {
  const [loadingTicker, setLoadingTicker] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: 'info' });
  const [testTeamCode, setTestTeamCode] = useState('T01');
  const [testQuantity, setTestQuantity] = useState(50);
  const [activeTab, setActiveTab] = useState('all');

  // Authorize check
  const storedUser = (typeof window !== 'undefined' ? (sessionStorage.getItem('saamx_username') || sessionStorage.getItem('fms_username') || '') : '').toLowerCase();
  const isMaster = storedUser === 'sridhara' || (typeof window !== 'undefined' && sessionStorage.getItem('saamx_is_master') === 'true');

  const ipoList = useMemo(() => {
    const rawIpos = Array.isArray(state?.ipos) ? state.ipos : [];
    const securities = Array.isArray(state?.securities) ? state.securities : Object.values(state?.securities || {});

    return LANDMARK_IPOS.map(def => {
      const liveFromIpos = rawIpos.find(i => i.ticker === def.ticker);
      const liveFromSec = securities.find(s => s.ticker === def.ticker);
      const live = liveFromIpos || liveFromSec || {};

      const currentStage = live.ipoStage || live.ipoStatus || (live.status === 'Active' ? 'LISTING' : 'DRAFT');
      const isVisible = live.visibleToParticipants !== false && currentStage !== 'HIDDEN' && currentStage !== 'DRAFT';
      const bids = live.bids || {};
      const bidsCount = Object.keys(bids).length;
      const totalSub = live.totalSubscription || 0;
      const totalUnits = live.availableFloat || live.totalUnits || def.totalUnits;
      const subMultiple = live.subscriptionMultiple || (totalUnits ? (totalSub / totalUnits).toFixed(2) : '0.00');

      return {
        ...def,
        ...live,
        currentStage,
        isVisible,
        bids,
        bidsCount,
        totalSub,
        totalUnits,
        subMultiple,
        offerPrice: live.offerPrice || live.basePrice || def.offerPrice,
        currency: live.currency || def.currency
      };
    });
  }, [state?.ipos, state?.securities]);

  const teams = useMemo(() => {
    if (!state?.teams) return [];
    return Array.isArray(state.teams) ? state.teams : Object.values(state.teams);
  }, [state?.teams]);

  // Stage advancement handler
  const handleAdvanceStage = async (ticker, stageName, visible = true) => {
    setLoadingTicker(ticker);
    setFeedback({ message: '', type: 'info' });

    try {
      if (stageName === 'ALLOTMENT') {
        const confirmAllot = window.confirm(`Execute authoritative IPO Allotment for ${ticker}? This processes double-entry ledger settlements, deposits shares, and refunds excess capital.`);
        if (!confirmAllot) {
          setLoadingTicker(null);
          return;
        }

        const res = await apiFetch('/api/ipo/allot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to allot IPO.');
        setFeedback({ message: `Successfully executed allotment for ${ticker}! ${data.message || ''}`, type: 'success' });
      } else {
        const res = await apiFetch('/api/ipo/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, stageName, visibleToParticipants: visible })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to advance stage.');
        setFeedback({ message: `IPO ${ticker} advanced to stage ${stageName.replace(/_/g, ' ')}.`, type: 'success' });
      }
    } catch (err) {
      setFeedback({ message: `Error: ${err.message}`, type: 'danger' });
    } finally {
      setLoadingTicker(null);
    }
  };

  // Visibility toggle handler
  const handleToggleVisibility = async (ticker, currentVal) => {
    setLoadingTicker(ticker);
    try {
      const nextVal = !currentVal;
      const res = await apiFetch('/api/ipo/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, visibleToParticipants: nextVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update visibility.');
      setFeedback({ message: `IPO ${ticker} is now ${nextVal ? 'VISIBLE' : 'HIDDEN'} to participants.`, type: 'success' });
    } catch (err) {
      setFeedback({ message: `Error: ${err.message}`, type: 'danger' });
    } finally {
      setLoadingTicker(null);
    }
  };

  // Bulk visibility
  const handleBulkVisibility = async (makeVisible) => {
    setLoadingTicker('BULK');
    try {
      for (const ipo of LANDMARK_IPOS) {
        await apiFetch('/api/ipo/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: ipo.ticker, visibleToParticipants: makeVisible })
        });
      }
      setFeedback({ message: `All 5 IPOs are now ${makeVisible ? 'VISIBLE' : 'HIDDEN'} to participants.`, type: 'success' });
    } catch (err) {
      setFeedback({ message: `Error updating bulk visibility: ${err.message}`, type: 'danger' });
    } finally {
      setLoadingTicker(null);
    }
  };

  // Test Bid Submission
  const handleTestBid = async (ticker) => {
    setLoadingTicker(ticker);
    try {
      const res = await apiFetch('/api/ipo/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          quantity: Number(testQuantity),
          teamCode: testTeamCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit test bid.');
      setFeedback({ message: `Test subscription registered: ${data.message}`, type: 'success' });
    } catch (err) {
      setFeedback({ message: `Bid Error: ${err.message}`, type: 'danger' });
    } finally {
      setLoadingTicker(null);
    }
  };

  const stages = [
    { key: 'HIDDEN', label: 'Hidden (Offline)', bg: '#475569' },
    { key: 'RUMOUR', label: '1. Rumour', bg: '#64748B' },
    { key: 'ANNOUNCED', label: '2. Announced', bg: '#2563EB' },
    { key: 'SUBSCRIPTION_OPEN', label: '3. Subscription Open', bg: '#D97706' },
    { key: 'SUBSCRIPTION_CLOSED', label: '4. Closed', bg: '#EA580C' },
    { key: 'ALLOTMENT', label: '5. Allotment', bg: '#7C3AED' },
    { key: 'LISTING', label: '6. Floor Listing', bg: '#059669' }
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '24px', backgroundColor: '#0B132B', color: '#F8FAFC', fontFamily: 'var(--font-sans, system-ui)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Strip */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#0B132B',
                fontWeight: 900,
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <IconCrown size={12} />
                MASTER DIRECTOR // SRIDHARA
              </span>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 800,
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                PRIMARY CAPITAL MARKETS
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Primary Market & IPO Command Center
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#94A3B8' }}>
              Full lifecycle stage switcher, floor visibility controller, subscription book & allotment engine for the 5 landmark venture IPOs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBulkVisibility(false)}
              disabled={loadingTicker !== null}
              style={{ fontWeight: 800 }}
            >
              <IconSlash size={14} />
              <span>Hide All IPOs</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleBulkVisibility(true)}
              disabled={loadingTicker !== null}
              style={{ fontWeight: 800, background: '#059669', borderColor: '#059669' }}
            >
              <IconEye size={14} />
              <span>Make All Visible</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
              style={{ fontWeight: 800 }}
            >
              <IconRefreshCw size={14} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <Alert variant={feedback.type} title={feedback.type === 'success' ? 'Execution Completed' : 'System Notice'}>
            {feedback.message}
          </Alert>
        )}

        {/* Global Telemetry Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Card style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800 }}>Simulated IPO Catalog</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
              5 High-Impact Assets
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>OpenAI, Stripe, Canva, Discord, Polymarket</span>
          </Card>

          <Card style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800 }}>Open Subscription Windows</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>
              {ipoList.filter(i => i.currentStage === 'SUBSCRIPTION_OPEN').length} Active Windows
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Investment houses can currently place floor bids</span>
          </Card>

          <Card style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800 }}>Listed for Secondary Trading</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
              {ipoList.filter(i => i.currentStage === 'LISTING' || i.currentStage === 'LISTED').length} Listed Assets
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Fully visible in Market Watch and exchange desks</span>
          </Card>

          <Card style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800 }}>Authoritative Float Supply</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E2E8F0', marginTop: '4px' }}>
              5,000 Units (~$3.7M)
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>ACID double-entry capital settlement bound</span>
          </Card>
        </div>

        {/* 5 Landmark IPO Controller Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {ipoList.map(ipo => {
            const sym = CURRENCY_SYMBOLS[ipo.currency] || '$';
            const isSubOpen = ipo.currentStage === 'SUBSCRIPTION_OPEN';
            const isListed = ipo.currentStage === 'LISTING' || ipo.currentStage === 'LISTED';
            const isAllotted = ipo.currentStage === 'ALLOTMENT';

            return (
              <Card
                key={ipo.ticker}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: `2px solid ${ipo.isVisible ? '#10B981' : '#334155'}`,
                  borderRadius: '14px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  boxShadow: ipo.isVisible ? '0 8px 30px rgba(16, 185, 129, 0.12)' : 'none'
                }}
              >
                {/* Top Row: Asset Ticker, Name, Badges & Visibility Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '1.35rem',
                      color: '#00E5FF',
                      backgroundColor: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {ipo.ticker}
                    </span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF' }}>
                        {ipo.name}
                      </h2>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                        {ipo.sector} &bull; {ipo.industry} &bull; {ipo.exchange} ({ipo.currency})
                      </span>
                    </div>
                  </div>

                  {/* Stage and Visibility Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(ipo.ticker, ipo.isVisible)}
                      disabled={loadingTicker === ipo.ticker}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        background: ipo.isVisible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: ipo.isVisible ? '#34D399' : '#F87171',
                        border: `1.5px solid ${ipo.isVisible ? '#10B981' : '#EF4444'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Toggle visibility to participant terminals"
                    >
                      {ipo.isVisible ? <IconEye size={14} /> : <IconSlash size={14} />}
                      <span>{ipo.isVisible ? 'VISIBLE TO TEAMS' : 'HIDDEN FROM TEAMS'}</span>
                    </button>

                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: isListed ? '#059669' : isSubOpen ? '#D97706' : isAllotted ? '#7C3AED' : '#2563EB',
                      color: '#FFFFFF',
                      letterSpacing: '0.04em'
                    }}>
                      STAGE: {ipo.currentStage.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#CBD5E1', lineHeight: 1.45 }}>
                  {ipo.description}
                </p>

                {/* Telemetry Metrics Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'rgba(2, 6, 23, 0.5)',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Issue Offer Price</span>
                    <strong style={{ fontSize: '1.05rem', color: '#FFFFFF', fontFamily: 'monospace' }}>
                      {sym}{Number(ipo.offerPrice).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Total Float Supply</span>
                    <strong style={{ fontSize: '1.05rem', color: '#FFFFFF', fontFamily: 'monospace' }}>
                      {Number(ipo.totalUnits).toLocaleString()} Units
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Bidding Houses</span>
                    <strong style={{ fontSize: '1.05rem', color: '#38BDF8', fontFamily: 'monospace' }}>
                      {ipo.bidsCount} Teams
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Total Demand Units</span>
                    <strong style={{ fontSize: '1.05rem', color: '#FCD34D', fontFamily: 'monospace' }}>
                      {Number(ipo.totalSub).toLocaleString()} Shs
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Oversubscription</span>
                    <strong style={{ fontSize: '1.05rem', color: Number(ipo.subMultiple) >= 1 ? '#10B981' : '#F59E0B', fontFamily: 'monospace' }}>
                      {ipo.subMultiple}x Multiple
                    </strong>
                  </div>
                </div>

                {/* Stage Transition Control Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Set Lifecycle Transition Stage:
                    </span>
                    {loadingTicker === ipo.ticker && (
                      <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
                        Applying floor transition...
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {stages.map(stg => {
                      const isCurrent = ipo.currentStage === stg.key;
                      return (
                        <button
                          key={stg.key}
                          type="button"
                          onClick={() => handleAdvanceStage(ipo.ticker, stg.key, stg.key !== 'HIDDEN')}
                          disabled={loadingTicker !== null}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            background: isCurrent ? stg.bg : 'rgba(30, 41, 59, 0.8)',
                            color: '#FFFFFF',
                            border: isCurrent ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            boxShadow: isCurrent ? '0 0 14px rgba(255, 255, 255, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {stg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Bids Book & Test Subscription Sandbox */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '14px',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '20px'
                }}>
                  {/* Left: Registered Floor Bids Table */}
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Registered Bids Book ({ipo.bidsCount} Teams)
                    </span>
                    {ipo.bidsCount === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', padding: '10px 0' }}>
                        No bids received yet. Open subscription stage to accept floor applications.
                      </div>
                    ) : (
                      <div style={{ maxHeight: '130px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                              <th style={{ padding: '4px 6px' }}>Team</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Bid Units</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Capital Reserved</th>
                              <th style={{ padding: '4px 6px', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(ipo.bids).map(([tCode, bidData]) => {
                              const bUnits = typeof bidData === 'object' ? (bidData.quantity || bidData.units) : bidData;
                              const bCost = bUnits * ipo.offerPrice;
                              return (
                                <tr key={tCode} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '4px 6px', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace' }}>#{tCode}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(bUnits).toLocaleString()}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#FCD34D' }}>{sym}{bCost.toLocaleString()}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <Badge variant={isAllotted ? 'rise' : 'secondary'} size="sm">
                                      {isAllotted ? 'Allotted' : 'Pending Allotment'}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right: Master Test Bid Submitter */}
                  <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '12px 14px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Floor Simulation Bid Injector
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Target Team</label>
                        <select
                          value={testTeamCode}
                          onChange={e => setTestTeamCode(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '0.76rem', borderRadius: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155' }}
                        >
                          {(teams.length > 0 ? teams : [{ teamCode: 'T01' }, { teamCode: 'T02' }, { teamCode: 'T03' }]).map(t => (
                            <option key={t.teamCode || t.id} value={t.teamCode || t.id}>
                              #{t.teamCode || t.id} ({t.name || t.teamName || 'House'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>Quantity (Units)</label>
                        <input
                          type="number"
                          min="1"
                          step="10"
                          value={testQuantity}
                          onChange={e => setTestQuantity(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '0.76rem', borderRadius: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTestBid(ipo.ticker)}
                      disabled={loadingTicker !== null}
                      style={{ width: '100%', fontWeight: 800, fontSize: '0.74rem' }}
                    >
                      <span>⚡ Submit Test Subscription as #{testTeamCode}</span>
                    </Button>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>

      </div>
    </div>
  );
}
