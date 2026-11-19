import React, { useState, useMemo } from 'react';
import { useDensity } from '../../context/DensityContext.jsx';
import PaperSlipModal from './PaperSlipModal.jsx';
import { Card, CardHeader, CardTitle } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { SearchInput } from '../ui/Input.jsx';
import { Table, TableHeader, TableRow, TableCell, FinancialCell } from '../ui/Table.jsx';
import { DeltaBadge, PriceDisplay } from '../ui/FinancialFormatters.jsx';
import InteractiveMarketChart from '../ui/InteractiveMarketChart.jsx';
import { generateTimeframeData } from '../../lib/chartTimeframeEngine.js';
import { EmptyState, Alert } from '../ui/States.jsx';
import {
  IconSearch,
  IconBarChart,
  IconGlobe,
  IconClock,
  IconZap,
  IconTarget,
  IconArrowUpRight,
  IconX,
  IconFileText,
  IconRadio,
  IconTrendingUp,
  IconTrendingDown,
  IconNewspaper,
  IconBriefcase
} from '../../lib/icons.jsx';
import { CURRENCY_SYMBOLS } from '../../lib/formatters.js';

// Compact SVG Sparkline for indices and tickers
function Sparkline({ isUp, width = 56, height = 20 }) {
  const points = isUp 
    ? "0,16 12,14 24,15 36,9 48,6 56,2" 
    : "0,2 12,7 24,6 36,13 48,15 56,18";
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={isUp ? 'var(--color-rise)' : 'var(--color-fall)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function MarketOverviewIntelligenceSection({
  state,
  securitiesList,
  sessionState,
  clock,
  fxRates,
  onOpenProfile,
  teamCode,
  team,
  onNavigate
}) {
  const { isCompact } = useDensity();
  const [orderModalSecurity, setOrderModalSecurity] = useState(null);
  const [marketTab, setMarketTab] = useState('indices'); // 'indices' | 'gainers' | 'losers'
  const [marketTimeframe, setMarketTimeframe] = useState('1D'); // '1D' | '1W' | '1M' | '3M' | '1Y'

  // --- Search & Filters for Securities Explorer ---
  const [secSearch, setSecSearch] = useState('');
  const [secExchange, setSecExchange] = useState('ALL');
  const [secCountry, setSecCountry] = useState('ALL');
  const [secSector, setSecSector] = useState('ALL');
  const [secType, setSecType] = useState('ALL');
  const [secSortBy, setSecSortBy] = useState('ticker'); // 'ticker', 'name', 'price', 'change', 'volume'
  const [secSortOrder, setSecSortOrder] = useState('asc'); // 'asc', 'desc'
  const [secPage, setSecPage] = useState(1);
  const itemsPerPage = 20;

  // Selected Security for Contextual Detail Panel
  const [selectedSecurityId, setSelectedSecurityId] = useState(null);

  // --- Search & Filters for Unified Intelligence Feed ---
  const [feedSearch, setFeedSearch] = useState('');
  const [feedCategoryFilter, setFeedCategoryFilter] = useState('ALL'); // 'ALL', 'Corporate', 'Regulatory', 'Macro', 'Sector', 'Advisor', 'Exchange'
  const [feedSentimentFilter, setFeedSentimentFilter] = useState('ALL'); // 'ALL', 'Positive', 'Negative', 'Neutral'

  const marketIndices = state?.marketIndices || {};
  const [selectedChartInstrument, setSelectedChartInstrument] = useState(null);

  const indexCardsList = useMemo(() => [
    { id: 'INDIA50', name: marketIndices.INDIA50?.name || 'SAAMX INDIA 50', label: 'SAAMX INDIA 50', currentPrice: marketIndices.INDIA50?.currentValue || 5000.00, previousClose: (marketIndices.INDIA50?.currentValue || 5000.00) / (1 + (marketIndices.INDIA50?.changePercent || 0.42) / 100), val: marketIndices.INDIA50?.currentValue || 5000.00, chg: marketIndices.INDIA50?.changePercent || 0.42, type: 'INDEX' },
    { id: 'SP500', name: 'S&P 500', label: 'S&P 500', currentPrice: marketIndices.US100?.currentValue || 5815.20, previousClose: (marketIndices.US100?.currentValue || 5815.20) / (1 + (marketIndices.US100?.changePercent || 0.28) / 100), val: marketIndices.US100?.currentValue || 5815.20, chg: marketIndices.US100?.changePercent || 0.28, type: 'INDEX' },
    { id: 'FTSE100', name: 'FTSE 100', label: 'FTSE 100', currentPrice: marketIndices.UK100?.currentValue || 8245.50, previousClose: (marketIndices.UK100?.currentValue || 8245.50) / (1 + (marketIndices.UK100?.changePercent || -0.14) / 100), val: marketIndices.UK100?.currentValue || 8245.50, chg: marketIndices.UK100?.changePercent || -0.14, type: 'INDEX' },
    { id: 'GLOBAL100', name: 'GLOBAL 100', label: 'GLOBAL 100', currentPrice: marketIndices.GLOBAL100?.currentValue || 1000.00, previousClose: (marketIndices.GLOBAL100?.currentValue || 1000.00) / (1 + (marketIndices.GLOBAL100?.changePercent || 0.65) / 100), val: marketIndices.GLOBAL100?.currentValue || 1000.00, chg: marketIndices.GLOBAL100?.changePercent || 0.65, type: 'INDEX' }
  ], [marketIndices]);

  const activeChartInstrument = useMemo(() => {
    if (selectedChartInstrument) return selectedChartInstrument;
    return indexCardsList[0];
  }, [selectedChartInstrument, indexCardsList]);

  const activeChartData = useMemo(() => {
    return generateTimeframeData(activeChartInstrument, marketTimeframe, state);
  }, [activeChartInstrument, marketTimeframe, state]);
  const bullBear = state?.bullBear || {};
  const activeDebate = bullBear.activeDebate || null;

  const usdRate = fxRates?.USDINR?.midRate || 88.20;
  const gbpRate = fxRates?.GBPINR?.midRate || 119.40;
  const eurRate = fxRates?.EURINR?.midRate || 103.50;

  // 1. Market Breadth & Sentiment Analysis
  const { advancers, decliners, unchanged, marketSentiment, topGainers, topLosers } = useMemo(() => {
    let adv = 0, dec = 0, unc = 0;
    const activeSecs = (securitiesList || []).filter(s => s.status === 'Active' || s.status === 'Halted');

    activeSecs.forEach(s => {
      const cur = s.currentPrice || s.basePrice || 0;
      const op = s.openingPrice || s.basePrice || cur;
      if (cur > op) adv++;
      else if (cur < op) dec++;
      else unc++;
    });

    const global100Chg = marketIndices.GLOBAL100?.changePercent || 0;
    let sentiment = { label: 'Neutral / Balanced', badge: 'Neutral', color: 'var(--color-text-secondary)', bg: 'var(--color-surface-subtle)' };
    if (adv > dec * 1.5 && global100Chg > 0.2) {
      sentiment = { label: 'Strong Bullish Trend', badge: 'Strong Bullish', color: 'var(--color-rise)', bg: 'rgba(5, 150, 105, 0.12)' };
    } else if (dec > adv * 1.5 && global100Chg < -0.2) {
      sentiment = { label: 'Bearish Wave / Defensive', badge: 'Bearish Wave', color: 'var(--color-fall)', bg: 'rgba(225, 29, 72, 0.12)' };
    } else if (adv > dec) {
      sentiment = { label: 'Mild Bullish Momentum', badge: 'Mild Bullish', color: 'var(--color-rise)', bg: 'rgba(5, 150, 105, 0.08)' };
    } else if (dec > adv) {
      sentiment = { label: 'Mixed / Cautious Bias', badge: 'Cautious Bias', color: 'var(--color-primary)', bg: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.08))' };
    }

    const sortedByChg = [...activeSecs].sort((a, b) => {
      const chgA = ((a.currentPrice - (a.openingPrice || a.basePrice || a.currentPrice)) / (a.openingPrice || a.basePrice || 1)) * 100;
      const chgB = ((b.currentPrice - (b.openingPrice || b.basePrice || b.currentPrice)) / (b.openingPrice || b.basePrice || 1)) * 100;
      return chgB - chgA;
    });

    return {
      advancers: adv,
      decliners: dec,
      unchanged: unc,
      marketSentiment: sentiment,
      topGainers: sortedByChg.slice(0, 4),
      topLosers: sortedByChg.slice(-4).reverse()
    };
  }, [securitiesList, marketIndices]);

  // Landmark Venture IPOs (OAI, STRP, CNVA, DISC, POLY)
  const landmarkIpos = useMemo(() => {
    const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];
    return ipoTickers.map(ticker => {
      const found = (securitiesList || []).find(s => s.ticker === ticker);
      if (found) return found;
      const fallbacks = {
        OAI: { ticker: 'OAI', name: 'OpenAI Global Hyperscale IPO', currentPrice: 180, exchange: 'NASDAQ' },
        STRP: { ticker: 'STRP', name: 'Stripe Global Financial Infrastructure IPO', currentPrice: 95, exchange: 'NYSE' },
        CNVA: { ticker: 'CNVA', name: 'Canva Visual Communications IPO', currentPrice: 62, exchange: 'NASDAQ' },
        DISC: { ticker: 'DISC', name: 'Discord Real-Time Community Platform IPO', currentPrice: 48, exchange: 'NYSE' },
        POLY: { ticker: 'POLY', name: 'Polymarket Information Markets IPO', currentPrice: 35, exchange: 'NASDAQ' }
      };
      return fallbacks[ticker];
    });
  }, [securitiesList]);

  // 2. Filtered & Sorted Securities Explorer (2,062 securities)
  const filteredSecurities = useMemo(() => {
    let list = securitiesList || [];

    // Search by ticker or name
    if (secSearch.trim()) {
      const q = secSearch.toLowerCase();
      list = list.filter(s => 
        (s.ticker || '').toLowerCase().includes(q) || 
        (s.name || '').toLowerCase().includes(q) ||
        (s.sector || '').toLowerCase().includes(q)
      );
    }

    // Exchange filter
    if (secExchange !== 'ALL') {
      const exUpper = secExchange.toUpperCase();
      list = list.filter(s => {
        const sEx = (s.exchange || '').toUpperCase();
        return sEx === exUpper || sEx.includes(exUpper) || (exUpper === 'LSE' && sEx.includes('LONDON')) || (exUpper === 'XETRA' && sEx.includes('XETRA'));
      });
    }

    // Country filter
    if (secCountry !== 'ALL') {
      list = list.filter(s => (s.country || '').toLowerCase() === secCountry.toLowerCase());
    }

    // Sector filter
    if (secSector !== 'ALL') {
      list = list.filter(s => (s.sector || '').toLowerCase() === secSector.toLowerCase());
    }

    // Asset Class / Instrument filter
    if (secType !== 'ALL') {
      if (secType === 'IPOs') {
        list = list.filter(s => s.isIpo || s.ipoStage || s.assetClass === 'IPO');
      } else if (secType === 'ETFs') {
        list = list.filter(s => s.assetClass === 'ETF' || (s.ticker || '').includes('ETF'));
      } else if (secType === 'Commodities') {
        list = list.filter(s => s.assetClass === 'Commodity' || s.sector === 'Commodities');
      } else if (secType === 'Equities') {
        list = list.filter(s => s.assetClass === 'Equity' || !s.assetClass);
      }
    }

    // Sort
    return [...list].sort((a, b) => {
      let valA = a[secSortBy] || '';
      let valB = b[secSortBy] || '';

      if (secSortBy === 'price') {
        valA = a.currentPrice || a.basePrice || 0;
        valB = b.currentPrice || b.basePrice || 0;
      } else if (secSortBy === 'change') {
        const opA = a.openingPrice || a.basePrice || a.currentPrice || 1;
        const opB = b.openingPrice || b.basePrice || b.currentPrice || 1;
        valA = ((a.currentPrice - opA) / opA) * 100;
        valB = ((b.currentPrice - opB) / opB) * 100;
      } else if (secSortBy === 'volume') {
        valA = a.tradingVolume || a.volume || 0;
        valB = b.tradingVolume || b.volume || 0;
      }

      if (valA < valB) return secSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return secSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [securitiesList, secSearch, secExchange, secCountry, secSector, secType, secSortBy, secSortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSecurities.length / itemsPerPage));
  const currentSecPage = Math.min(secPage, totalPages);
  const pagedSecurities = useMemo(() => {
    const start = (currentSecPage - 1) * itemsPerPage;
    return filteredSecurities.slice(start, start + itemsPerPage);
  }, [filteredSecurities, currentSecPage]);

  // Selected Security Details
  const focusedSecurity = useMemo(() => {
    if (!selectedSecurityId) return null;
    return (securitiesList || []).find(s => s.id === selectedSecurityId || s.ticker === selectedSecurityId);
  }, [securitiesList, selectedSecurityId]);

  // 3. Unified Chronological Intelligence Feed (News + Regulatory + Macro + Advisor Intelligence)
  const unifiedFeedItems = useMemo(() => {
    const feed = [];

    // A. Official & Scenario News Bulletins
    (state?.newsEvents || []).forEach(n => {
      let cat = 'Corporate';
      const c = (n.category || '').toUpperCase();
      if (c.includes('POLICY') || c.includes('REGULATORY') || c.includes('SEBI') || c.includes('SCANDAL')) {
        cat = 'Regulatory';
      } else if (c.includes('MACRO') || c.includes('MONETARY') || c.includes('RBI') || c.includes('CENTRAL')) {
        cat = 'Macro';
      } else if (c.includes('SECTOR') || c.includes('INDUSTRY')) {
        cat = 'Sector';
      } else if (c.includes('ANALYST') || c.includes('ADVISOR')) {
        cat = 'Advisor';
      } else if (c.includes('EXCHANGE') || c.includes('HALT') || c.circuit || c.includes('CIRCUIT')) {
        cat = 'Exchange';
      }

      const textUpper = ((n.headline || n.title || '') + ' ' + (n.description || '')).toUpperCase();
      let authority = n.source;
      if (!authority) {
        if (textUpper.includes('SEBI') || c.includes('SCANDAL') || cat === 'Regulatory') {
          authority = 'SEBI (Securities & Exchange Board of India)';
        } else if (textUpper.includes('RBI') || textUpper.includes('REPO RATE') || cat === 'Macro') {
          authority = 'RBI (Reserve Bank of India) / MPC';
        } else if (textUpper.includes('GOVERNMENT') || textUpper.includes('MINISTRY') || textUpper.includes('TAX') || textUpper.includes('CUSTOMS') || c.includes('POLICY')) {
          authority = 'Ministry of Finance (MoF) / Govt of India';
        } else if (cat === 'Exchange') {
          authority = 'SAAMX Consolidated Exchange Surveillance';
        } else {
          authority = 'Financial Press Wire';
        }
      }

      let regStatus = 'EFFECTIVE';
      if (n.status) {
        regStatus = n.status.toUpperCase();
      } else if (c.includes('SCANDAL') || textUpper.includes('PROBE') || textUpper.includes('ALLEGATION')) {
        regStatus = 'NOTICE / ENFORCEMENT';
      } else if (textUpper.includes('PROPOSED') || textUpper.includes('UPCOMING') || (n.effectiveDate && new Date(n.effectiveDate) > Date.now())) {
        regStatus = 'UPCOMING';
      } else {
        regStatus = 'EFFECTIVE';
      }

      feed.push({
        id: n.id,
        feedType: 'NEWS',
        title: n.headline || n.title,
        body: n.description || n.summary || '',
        category: cat,
        rawCategory: n.category || 'General',
        sentiment: n.sentiment || 'Neutral',
        impactPercent: n.impactPercent || 0,
        severity: n.severity || (n.impactPercent >= 12 ? 'CRITICAL' : n.impactPercent >= 8 ? 'BREAKING' : 'IMPORTANT'),
        timestamp: n.triggeredAt || n.timestamp || Date.now(),
        effectiveDate: n.effectiveDate || null,
        issuingAuthority: authority,
        regulatoryStatus: regStatus,
        affectedSector: n.sector || null,
        affectedTickers: n.affectedTickers || (n.ticker ? [n.ticker] : []),
        isSimulated: true
      });
    });

    // B. Verified Advisor Stances
    if (bullBear.bull && bullBear.bull.statement) {
      feed.push({
        id: 'BULL_STANCE_LATEST',
        feedType: 'ADVISOR',
        title: `Bull Advisor Thesis: ${bullBear.bull.stance || 'ACCUMULATE GROWTH'}`,
        body: bullBear.bull.statement,
        category: 'Advisor',
        rawCategory: 'Bull Desk',
        sentiment: 'Positive',
        timestamp: bullBear.bull.publishedAt || Date.now() - 3600000,
        issuingAuthority: 'SAAMX Floor Bull Desk',
        advisorRole: 'Floor Bull Desk Lead',
        isSimulated: true
      });
    }

    if (bullBear.bear && bullBear.bear.statement) {
      feed.push({
        id: 'BEAR_STANCE_LATEST',
        feedType: 'ADVISOR',
        title: `Bear Advisor Thesis: ${bullBear.bear.stance || 'DEFENSIVE LIQUIDITY'}`,
        body: bullBear.bear.statement,
        category: 'Advisor',
        rawCategory: 'Bear Desk',
        sentiment: 'Negative',
        timestamp: bullBear.bear.publishedAt || Date.now() - 3600000,
        issuingAuthority: 'SAAMX Floor Bear Desk',
        advisorRole: 'Floor Bear Desk Lead',
        isSimulated: true
      });
    }

    // C. Live Debate Showdown
    if (activeDebate && activeDebate.active) {
      feed.push({
        id: `DEBATE_${activeDebate.startedAt || 1}`,
        feedType: 'ADVISOR',
        title: `Floor Debate: "${activeDebate.topic}"`,
        body: `Live Round ${activeDebate.round || 1} deliberation between Bullish Growth and Bearish Value desks. Review contrasting theses before physical slip execution.`,
        category: 'Advisor',
        rawCategory: 'Debate Round',
        sentiment: 'Neutral',
        timestamp: activeDebate.startedAt || Date.now() - 1800000,
        issuingAuthority: 'SAAMX Floor Debate Arena',
        advisorRole: 'Floor Debate Moderator',
        isSimulated: true
      });
    }

    // Filter by Category
    let result = feed;
    if (feedCategoryFilter !== 'ALL') {
      result = result.filter(item => item.category === feedCategoryFilter);
    }

    // Filter by Sentiment
    if (feedSentimentFilter !== 'ALL') {
      result = result.filter(item => item.sentiment === feedSentimentFilter);
    }

    // Search in Feed
    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.body.toLowerCase().includes(q) ||
        (item.affectedSector && item.affectedSector.toLowerCase().includes(q)) ||
        (item.affectedTickers && item.affectedTickers.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Sort newest first
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [state?.newsEvents, bullBear, activeDebate, feedCategoryFilter, feedSentimentFilter, feedSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Quick Market Switcher */}
      {onNavigate && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-surface, #FFFFFF)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid var(--color-border, #E2E8F0)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary, #64748B)' }}>
              Market Floor View:
            </span>
            <div style={{ display: 'inline-flex', background: 'var(--color-surface-subtle, #F1F5F9)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              <span
                style={{
                  background: 'var(--color-surface, #FFFFFF)',
                  color: 'var(--color-text-primary, #0F172A)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                📈 Securities Universe (Active)
              </span>
              <button
                type="button"
                onClick={() => onNavigate('fx')}
                style={{
                  background: 'transparent',
                  color: 'var(--color-primary, #2563EB)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💱 Foreign Exchange Desk &rarr;
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary, #64748B)' }}>
            Institutional FX: <strong style={{ color: 'var(--color-text-primary, #0F172A)' }}>USD ₹{Number(usdRate).toFixed(2)}</strong> &bull; <strong style={{ color: 'var(--color-text-primary, #0F172A)' }}>EUR ₹{Number(eurRate).toFixed(2)}</strong> &bull; <strong style={{ color: 'var(--color-text-primary, #0F172A)' }}>GBP ₹{Number(gbpRate).toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* 1. Market Overview Card & Live Interactive Area Chart (Reference Image Composition) */}
      <Card
        style={{
          padding: '24px',
          background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
        }}
      >
        {/* Card Header: Title, Segmented Tabs & Timeframe Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 900,
              fontFamily: "var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif)",
              color: 'var(--color-navy, #0B192C)',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <IconBarChart size={20} color="var(--color-orange, #FF6800)" />
              Market Overview
            </h2>

            {/* Segmented Filter Pills: Indices, Top Gainers, Top Losers */}
            <div style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(11, 25, 44, 0.05)',
              border: '1px solid var(--color-border)'
            }}>
              {[
                { id: 'indices', label: 'Indices' },
                { id: 'gainers', label: 'Top Gainers' },
                { id: 'losers', label: 'Top Losers' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMarketTab(tab.id)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: marketTab === tab.id ? 'var(--color-surface, #FFFFFF)' : 'transparent',
                    color: marketTab === tab.id ? 'var(--color-navy, #0B192C)' : 'var(--color-ink-muted, #64748B)',
                    fontWeight: marketTab === tab.id ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: marketTab === tab.id ? '0 2px 6px rgba(11, 25, 44, 0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Timeframe Toggles and Live Pulse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '8px',
              backgroundColor: 'rgba(11, 25, 44, 0.04)',
              border: '1px solid var(--color-border)'
            }}>
              {['1D', '1W', '1M', '3M', '1Y'].map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setMarketTimeframe(tf)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: marketTimeframe === tf ? 'var(--color-orange, #FF6800)' : 'transparent',
                    color: marketTimeframe === tf ? '#FFFFFF' : 'var(--color-ink-muted, #64748B)',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            <span
              style={{
                fontSize: '0.70rem',
                color: 'var(--color-ink-muted, #64748B)',
                fontWeight: 600,
                display: 'inline-block'
              }}
              title={activeChartData.sourceLabel}
            >
              {activeChartData.sourceLabel}
            </span>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: activeChartData.isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.08)',
              color: activeChartData.isLive ? 'var(--color-rise, #059669)' : 'var(--color-ink-muted, #64748B)',
              border: activeChartData.isLive ? 'none' : '1px solid rgba(100, 116, 139, 0.15)',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: activeChartData.isLive ? 'var(--color-rise, #059669)' : 'var(--color-ink-muted, #64748B)',
                boxShadow: activeChartData.isLive ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none'
              }} />
              {activeChartData.isLive ? 'Live' : 'Simulated Model'}
            </div>
          </div>
        </div>

        {/* Live Interactive SVG Area Line Chart */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '190px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(244, 247, 251, 0.6) 100%)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '12px 16px',
          overflow: 'hidden',
          marginBottom: '18px'
        }}>
          <InteractiveMarketChart
            instrument={activeChartInstrument}
            timeframe={marketTimeframe}
            onTimeframeChange={setMarketTimeframe}
            state={state}
            width={800}
            height={160}
            showControls={false}
            showAxisLabels={true}
          />
        </div>

        {/* 4 Major Indices Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {indexCardsList.map(idx => {
            const isUp = idx.chg >= 0;
            const isSelected = activeChartInstrument?.id === idx.id;
            return (
              <div
                key={idx.id}
                onClick={() => setSelectedChartInstrument(idx)}
                style={{
                  background: isSelected ? 'rgba(255, 104, 0, 0.08)' : 'rgba(255, 255, 255, 0.75)',
                  border: isSelected ? '1px solid var(--color-orange, #FF6800)' : '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: isSelected ? '0 4px 12px rgba(255, 104, 0, 0.15)' : '0 2px 8px rgba(11, 25, 44, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--color-orange, #FF6800)' : 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em' }}>
                    {idx.label} {isSelected ? '●' : ''}
                  </span>
                  <div className="tabular-nums font-data font-mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.2, marginTop: '2px' }}>
                    {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <DeltaBadge value={idx.chg} isPercent={true} />
                  </div>
                </div>
                <Sparkline isUp={isUp} width={50} height={20} />
              </div>
            );
          })}
        </div>

        {/* Notable Movers Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-ink-muted, #64748B)' }}>
          <strong style={{ fontSize: '0.75rem', color: 'var(--color-navy, #0B192C)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <IconZap size={14} style={{ color: 'var(--color-orange, #FF6800)' }} /> Notable Movers:
          </strong>
          
          <span style={{ color: 'var(--color-rise, #059669)', fontWeight: 800 }}>Gainers:</span>
          {topGainers.map(g => (
            <Button
              key={g.id || g.ticker}
              variant="secondary"
              size="sm"
              onClick={() => { setSecSearch(g.ticker); setSelectedSecurityId(g.ticker); }}
              style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--color-rise, #059669)', borderRadius: '6px' }}
            >
              <span className="tabular-nums font-data">
                {g.ticker} +{(((g.currentPrice - (g.openingPrice || g.basePrice || g.currentPrice)) / (g.openingPrice || g.basePrice || 1)) * 100).toFixed(1)}%
              </span>
            </Button>
          ))}

          <span style={{ color: 'var(--color-fall, #DC2626)', fontWeight: 800, marginLeft: '6px' }}>Losers:</span>
          {topLosers.map(l => (
            <Button
              key={l.id || l.ticker}
              variant="secondary"
              size="sm"
              onClick={() => { setSecSearch(l.ticker); setSelectedSecurityId(l.ticker); }}
              style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--color-fall, #DC2626)', borderRadius: '6px' }}
            >
              <span className="tabular-nums font-data">
                {l.ticker} {(((l.currentPrice - (l.openingPrice || l.basePrice || l.currentPrice)) / (l.openingPrice || l.basePrice || 1)) * 100).toFixed(1)}%
              </span>
            </Button>
          ))}
        </div>

        {/* Landmark Venture IPOs Spotlight Strip */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          flexWrap: 'wrap', 
          fontSize: '0.75rem', 
          color: 'var(--color-ink-muted, #64748B)',
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              background: 'rgba(255, 104, 0, 0.1)', 
              color: 'var(--color-orange, #FF6800)', 
              padding: '3px 8px', 
              borderRadius: '6px', 
              fontWeight: 800, 
              fontSize: '0.7rem',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <IconTarget size={13} /> STAGED IPO LAUNCHPAD
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted, #64748B)' }}>
              Secondary Float:
            </span>
          </div>

          {landmarkIpos.map(ipo => (
            <div
              key={ipo.ticker}
              style={{ 
                padding: '4px 10px', 
                fontSize: '0.72rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                borderRadius: '8px',
                border: selectedSecurityId === ipo.ticker ? '1px solid var(--color-orange, #FF6800)' : '1px solid var(--color-border)',
                background: selectedSecurityId === ipo.ticker ? 'rgba(255, 104, 0, 0.08)' : 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { 
                  setSecSearch(ipo.ticker); 
                  setSelectedSecurityId(ipo.ticker); 
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <strong style={{ color: 'var(--color-navy, #0B192C)', fontFamily: 'var(--font-mono)' }}>{ipo.ticker}</strong>
                <span className="tabular-nums font-data" style={{ color: 'var(--color-ink-muted, #64748B)' }}>${ipo.currentPrice || ipo.basePrice}</span>
              </Button>
              <button
                type="button"
                onClick={() => setOrderModalSecurity(ipo)}
                style={{
                  background: 'var(--color-orange, #FF6800)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Main Two-Column Cohesive Workspace: Left = Security Discovery, Right = Unified Intelligence Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: focusedSecurity ? '1.1fr 0.9fr' : '1.25fr 1fr', gap: '20px' }}>
        
        {/* --- LEFT COLUMN: Security Discovery & Contextual Fundamentals --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Securities Explorer Panel */}
          <Card variant="default" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconSearch size={18} style={{ color: 'var(--color-primary)' }} />
                  Securities Universe ({filteredSecurities.length} / {(securitiesList?.length || 2849).toLocaleString()})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  Search and evaluate equities, ETFs, commodities and simulated IPOs across covered exchanges.
                </p>
              </div>

              {/* Ticker Search Box */}
              <div style={{ width: '220px' }}>
                <SearchInput
                  placeholder="Search ticker, name or sector..."
                  value={secSearch}
                  onChange={val => { setSecSearch(val); setSecPage(1); }}
                />
              </div>
            </div>

            {/* Filter Strip */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {/* Exchange */}
              <select
                value={secExchange}
                onChange={e => { setSecExchange(e.target.value); setSecPage(1); }}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border)', fontSize: '0.74rem', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="ALL">All Exchanges (NSE, BSE, NASDAQ...)</option>
                <option value="NSE">NSE (India)</option>
                <option value="BSE">BSE (India)</option>
                <option value="NASDAQ">NASDAQ (US)</option>
                <option value="NYSE">NYSE (US)</option>
                <option value="LSE">LSE (UK)</option>
                <option value="XETRA">XETRA (Germany)</option>
              </select>

              {/* Country */}
              <select
                value={secCountry}
                onChange={e => { setSecCountry(e.target.value); setSecPage(1); }}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border)', fontSize: '0.74rem', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="ALL">All Jurisdictions</option>
                <option value="India">India (INR)</option>
                <option value="United States">United States (USD)</option>
                <option value="United Kingdom">United Kingdom (GBP)</option>
                <option value="Germany">Germany (EUR)</option>
              </select>

              {/* Sector */}
              <select
                value={secSector}
                onChange={e => { setSecSector(e.target.value); setSecPage(1); }}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border)', fontSize: '0.74rem', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="ALL">All Sectors</option>
                <option value="Technology">Technology & SaaS</option>
                <option value="Banking">Banking & Financials</option>
                <option value="Healthcare">Healthcare & Pharma</option>
                <option value="Energy">Energy & Utilities</option>
                <option value="Automobile">Automobile & EV</option>
                <option value="Consumer Goods">Consumer Goods</option>
                <option value="Materials">Materials & Mining</option>
                <option value="Telecommunications">Telecommunications</option>
              </select>

              {/* Asset Class */}
              <select
                value={secType}
                onChange={e => { setSecType(e.target.value); setSecPage(1); }}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border)', fontSize: '0.74rem', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="ALL">All Asset Classes</option>
                <option value="Equities">Equities</option>
                <option value="ETFs">ETFs</option>
                <option value="Commodities">Commodities</option>
                <option value="IPOs">Simulated Venture IPOs</option>
              </select>

              {/* Sort By */}
              <select
                value={secSortBy}
                onChange={e => setSecSortBy(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border)', fontSize: '0.74rem', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="ticker">Sort: Ticker</option>
                <option value="name">Sort: Company Name</option>
                <option value="price">Sort: Price</option>
                <option value="change">Sort: % Change</option>
                <option value="volume">Sort: Volume</option>
              </select>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSecSortOrder(secSortOrder === 'asc' ? 'desc' : 'asc')}
                title="Toggle sort direction"
              >
                {secSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </Button>
            </div>

            {/* Securities Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.74rem' : '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-subtle)', borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>TICKER</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>NAME</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>SECTOR / EXCH</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 700 }}>BID</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 700 }}>ASK</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 700 }}>PRICE</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 700 }}>DAY CHG</th>
                    <th style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: 700 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSecurities.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No securities found matching filters.
                      </td>
                    </tr>
                  ) : (
                    pagedSecurities.map(s => {
                      const curPrice = s.currentPrice || s.basePrice || 0;
                      const opPrice = s.openingPrice || s.basePrice || curPrice;
                      const chgPct = opPrice > 0 ? ((curPrice - opPrice) / opPrice) * 100 : 0;
                      const isUp = chgPct >= 0;
                      const secCcy = s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? 'USD' : s.exchange === 'LSE' ? 'GBP' : s.exchange === 'XETRA' ? 'EUR' : 'INR');
                      const curSym = CURRENCY_SYMBOLS[secCcy] || (secCcy === 'USD' ? '$' : '₹');
                      const isSelected = selectedSecurityId === s.ticker || selectedSecurityId === s.id;

                      const spreadPct = s.spreadPercent || 0.003;
                      const halfSpread = (curPrice * spreadPct) / 2;
                      const bidPrice = Math.max(0.01, curPrice - halfSpread);
                      const askPrice = curPrice + halfSpread;

                      return (
                        <tr 
                          key={s.id || s.ticker}
                          style={{ 
                            borderBottom: '1px solid var(--color-border-subtle)',
                            background: isSelected ? 'var(--color-primary-subtle, rgba(37, 99, 235, 0.08))' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onClick={() => setSelectedSecurityId(isSelected ? null : (s.ticker || s.id))}
                        >
                          <td style={{ padding: isCompact ? '6px 8px' : '8px 10px' }}>
                            <strong style={{ color: 'var(--color-primary, #38BDF8)', fontFamily: 'var(--font-mono)', fontSize: isCompact ? '0.78rem' : '0.82rem' }}>
                              {s.ticker}
                            </strong>
                          </td>
                          <td style={{ padding: isCompact ? '6px 8px' : '8px 10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{s.name}</span>
                          </td>
                          <td style={{ padding: isCompact ? '6px 8px' : '8px 10px', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                            {s.sector || 'General'} &bull; <span style={{ fontFamily: 'var(--font-mono)' }}>{s.exchange}</span>
                          </td>
                          <td className="tabular-nums font-mono font-data" style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-accent, #00E5FF)' }}>
                            {curSym}{bidPrice.toFixed(2)}
                          </td>
                          <td className="tabular-nums font-mono font-data" style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                            {curSym}{askPrice.toFixed(2)}
                          </td>
                          <td className="tabular-nums font-mono font-data" style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {curSym}{curPrice.toFixed(2)}
                          </td>
                          <td className="tabular-nums font-mono font-data" style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'right', fontWeight: 800, color: isUp ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                            {isUp ? '+' : ''}{chgPct.toFixed(2)}%
                          </td>
                          <td style={{ padding: isCompact ? '6px 8px' : '8px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderModalSecurity(s);
                                }}
                                title="Open Physical Order Slip Ticket Generator"
                                style={{ fontWeight: 800, padding: isCompact ? '2px 8px' : '3px 10px' }}
                              >
                                Order
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenProfile) onOpenProfile(s.ticker);
                                }}
                                title="Open Full Profile Modal"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: isCompact ? '2px 6px' : '3px 8px' }}
                              >
                                <span>Profile</span>
                                <IconArrowUpRight size={11} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <span className="tabular-nums font-data">
                Showing {((currentSecPage - 1) * itemsPerPage) + 1}–{Math.min(currentSecPage * itemsPerPage, filteredSecurities.length)} of {filteredSecurities.length}
              </span>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentSecPage <= 1}
                  onClick={() => setSecPage(p => Math.max(1, p - 1))}
                >
                  ◀ Prev
                </Button>
                <span className="tabular-nums font-data">Page {currentSecPage} of {totalPages}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentSecPage >= totalPages}
                  onClick={() => setSecPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ▶
                </Button>
              </div>
            </div>
          </Card>

          {/* Contextual Security Fundamentals Drawer (renders when security is clicked) */}
          {focusedSecurity && (
            <Card variant="default" style={{ padding: '18px 20px', border: '1px solid var(--color-primary)', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="primary" style={{ fontFamily: 'var(--font-mono)' }}>
                      {focusedSecurity.ticker}
                    </Badge>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                      {focusedSecurity.name}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    Exchange: <strong>{focusedSecurity.exchange}</strong> &bull; Sector: <strong>{focusedSecurity.sector}</strong> &bull; Currency: <strong>{focusedSecurity.currency || 'INR'}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenProfile && onOpenProfile(focusedSecurity.ticker)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Open Deep Profile</span>
                    <IconArrowUpRight size={13} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedSecurityId(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <IconX size={14} /> Close
                  </Button>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--color-surface-subtle)', padding: '8px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Current Price</span>
                  <strong className="tabular-nums font-data" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                    {focusedSecurity.currentPrice || focusedSecurity.basePrice}
                  </strong>
                </div>
                <div style={{ background: 'var(--color-surface-subtle)', padding: '8px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Day High / Low</span>
                  <strong className="tabular-nums font-data" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                    {focusedSecurity.dayHigh || '-'} / {focusedSecurity.dayLow || '-'}
                  </strong>
                </div>
                <div style={{ background: 'var(--color-surface-subtle)', padding: '8px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>P/E Ratio</span>
                  <strong className="tabular-nums font-data" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                    {focusedSecurity.peRatio ? Number(focusedSecurity.peRatio).toFixed(1) : '24.5'}x
                  </strong>
                </div>
                <div style={{ background: 'var(--color-surface-subtle)', padding: '8px', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Trading Volume</span>
                  <strong className="tabular-nums font-data" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                    {Number(focusedSecurity.tradingVolume || focusedSecurity.volume || 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Contextual Description */}
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: '0 0 12px 0' }}>
                {focusedSecurity.description || focusedSecurity.companyOverview || 'Constituent security actively quoted across SAAMX secondary trading desks.'}
              </p>

              {/* Physical Paper Trading Specimen Helper */}
              <div style={{ 
                background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.05))', 
                border: '1px dashed var(--color-primary)', 
                borderRadius: 'var(--radius-sm, 6px)', 
                padding: '10px 14px',
                fontSize: '0.74rem'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconFileText size={16} /> Physical Order Slip Specimen Guide for {focusedSecurity.ticker}
                </div>
                <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  To execute an order in <strong>{focusedSecurity.ticker}</strong>: write physical paper order slip with Ticket Number, Direction (BUY/SELL), Quantity, and Market/Limit Price ({focusedSecurity.currentPrice || focusedSecurity.basePrice}). Present the physical slip to an authorized clerk at the <strong>Exchange Desk</strong>.
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* --- RIGHT COLUMN: Unified Chronological Intelligence Feed --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <Card variant="default" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Feed Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconRadio size={18} style={{ color: 'var(--color-primary)' }} />
                  Unified Market Intelligence Feed
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Chronological dispatch of corporate, regulatory, macro events and advisor intelligence.
                </span>
              </div>

              <div style={{ width: '160px' }}>
                <SearchInput
                  placeholder="Search feed..."
                  value={feedSearch}
                  onChange={setFeedSearch}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {[
                { id: 'ALL', label: 'All Items' },
                { id: 'Corporate', label: 'Corporate' },
                { id: 'Regulatory', label: 'Regulatory (SEBI)' },
                { id: 'Macro', label: 'Macro & RBI' },
                { id: 'Sector', label: 'Sector Trends' },
                { id: 'Advisor', label: 'Advisor Theses' },
                { id: 'Exchange', label: 'Exchange Notices' }
              ].map(cat => (
                <Button
                  key={cat.id}
                  variant={feedCategoryFilter === cat.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFeedCategoryFilter(cat.id)}
                  style={{ fontWeight: 700 }}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Sentiment Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Sentiment:</span>
              {['ALL', 'Positive', 'Negative', 'Neutral'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedSentimentFilter(s)}
                  style={{
                    background: feedSentimentFilter === s ? 'var(--color-surface-subtle)' : 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm, 4px)',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: feedSentimentFilter === s ? 800 : 500,
                    cursor: 'pointer',
                    color: s === 'Positive' ? 'var(--color-rise)' : s === 'Negative' ? 'var(--color-fall)' : 'var(--color-text-primary)'
                  }}
                >
                  {s === 'ALL' ? 'All' : s === 'Positive' ? 'Bullish' : s === 'Negative' ? 'Bearish' : 'Neutral'}
                </button>
              ))}
            </div>

            {/* Feed Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '720px', overflowY: 'auto', paddingRight: '4px' }}>
              {unifiedFeedItems.length === 0 ? (
                <EmptyState
                  icon={<IconNewspaper size={32} style={{ color: 'var(--color-text-muted)' }} />}
                  title="No Intelligence Items Found"
                  description="No news, bulletins or advisor theses match the active search and filters."
                />
              ) : (
                unifiedFeedItems.map(item => {
                  const isAdvisor = item.feedType === 'ADVISOR';
                  const isPositive = item.sentiment === 'Positive';
                  const isNegative = item.sentiment === 'Negative';

                  return (
                    <div 
                      key={item.id}
                      style={{ 
                        background: 'var(--color-surface)', 
                        border: '1px solid var(--color-border)', 
                        borderRadius: 'var(--radius-md, 6px)', 
                        padding: '12px 14px',
                        borderLeft: isAdvisor 
                          ? (isPositive ? '4px solid var(--color-rise)' : '4px solid var(--color-fall)')
                          : (isPositive ? '3px solid var(--color-rise)' : isNegative ? '3px solid var(--color-fall)' : '3px solid var(--color-border)')
                      }}
                    >
                      {/* Item Top Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <Badge variant="secondary" size="sm">
                            {item.category.toUpperCase()}
                          </Badge>
                          
                          {item.severity && (
                            <span style={{ 
                              fontSize: '0.62rem', 
                              fontWeight: 800, 
                              color: item.severity === 'CRITICAL' ? 'var(--color-fall)' : item.severity === 'BREAKING' ? 'var(--color-primary)' : 'var(--color-text-muted)' 
                            }}>
                              [{item.severity}]
                            </span>
                          )}

                          {item.isSimulated && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-subtle)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--color-border-subtle)' }}>
                              SIMULATION
                            </span>
                          )}
                        </div>

                        <span className="tabular-nums font-data" style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Title & Body */}
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.35, display: 'block', marginBottom: '4px' }}>
                        {item.title}
                      </strong>

                      {/* Regulatory / Macro Status Strip */}
                      {(item.category === 'Regulatory' || item.category === 'Macro') && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          flexWrap: 'wrap',
                          gap: '6px', 
                          background: 'var(--color-surface-subtle)', 
                          padding: '6px 10px', 
                          borderRadius: 'var(--radius-sm, 4px)', 
                          fontSize: '0.7rem',
                          margin: '6px 0 8px 0',
                          border: '1px solid var(--color-border-subtle)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {item.category === 'Regulatory' ? 'Authority:' : 'Issuing Body:'}
                            </span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                              {item.issuingAuthority}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge
                              variant={item.regulatoryStatus === 'UPCOMING' ? 'warning' : item.regulatoryStatus?.includes('NOTICE') ? 'danger' : 'success'}
                              size="sm"
                            >
                              {item.regulatoryStatus || 'EFFECTIVE'}
                            </Badge>
                            <span className="tabular-nums font-data" style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem' }}>
                              Effective: {item.effectiveDate || 'Session T+0'}
                            </span>
                          </div>
                        </div>
                      )}

                      <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                        {item.body}
                      </p>

                      {/* Footer: Issuing Authority & Linked Securities / Tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '0.68rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          Source: <strong>{item.issuingAuthority}</strong>
                        </span>

                        {/* Clickable Affected Tickers */}
                        {item.affectedTickers && item.affectedTickers.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Relevant:</span>
                            {item.affectedTickers.map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setSecSearch(t); setSelectedSecurityId(t); }}
                                style={{
                                  background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.1))',
                                  color: 'var(--color-primary)',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '1px 6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  cursor: 'pointer'
                                }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </Card>

        </div>

      </div>

      {/* Physical Paper Slip Order Modal */}
      {orderModalSecurity && (
        <PaperSlipModal
          isOpen={!!orderModalSecurity}
          onClose={() => setOrderModalSecurity(null)}
          security={orderModalSecurity}
          team={team || { teamCode }}
          fxRates={fxRates}
        />
      )}

    </div>
  );
}
