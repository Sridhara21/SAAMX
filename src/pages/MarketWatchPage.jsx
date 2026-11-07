import React, { useState, useMemo, useEffect } from 'react';
import { calculateMarketClock } from '../lib/api.js';
import { CURRENCY_DIRECTORY, CURRENCY_SYMBOLS, DEFAULT_FX_RATES } from '../lib/formatters.js';

export default function MarketWatchPage({ state, onOpenProfile, connected }) {
  // Navigation Sub-tab inside Market Watch
  const [activeView, setActiveView] = useState('ALL_SECURITIES'); // ALL_SECURITIES, MOVERS, SECTORS, GLOBAL, FX_WATCH, TAPE, IPO_RADAR

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [geoFilter, setGeoFilter] = useState('ALL');
  const [assetClassFilter, setAssetClassFilter] = useState('ALL');
  const [exchangeFilter, setExchangeFilter] = useState('ALL');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [movementFilter, setMovementFilter] = useState('ALL'); // ALL, GAINERS, LOSERS, MOST_ACTIVE

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('ticker');
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Centralized Clock & Phase
  const clock = useMemo(() => {
    return calculateMarketClock(state?.marketState, 0);
  }, [state?.marketState]);

  // Normalized Securities List
  // Normalized Securities List (Excludes hidden/unreleased IPOs)
  const rawSecuritiesList = useMemo(() => {
    if (!state?.securities) return [];
    const raw = Array.isArray(state.securities) ? state.securities : Object.values(state.securities);
    return raw.map(s => {
      const currentPrice = Number(s.currentPrice || s.basePrice || 0);
      const openingPrice = Number(s.openingPrice || s.basePrice || currentPrice);
      const previousClose = Number(s.previousClose || s.basePrice || openingPrice);
      const dayHigh = Number(s.dayHigh || Math.max(currentPrice, openingPrice));
      const dayLow = Number(s.dayLow || Math.min(currentPrice, openingPrice));
      const priceDiff = currentPrice - openingPrice;
      const percentChange = openingPrice > 0 ? (priceDiff / openingPrice) * 100 : 0;
      const volume = Number(s.tradingVolume || s.volume || 0);
      const availableUnits = Number(s.availableUnits || 0);
      const currency = s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? 'USD' : s.exchange === 'LSE' ? 'GBP' : s.exchange === 'XETRA' || s.exchange === 'Euronext' ? 'EUR' : 'INR');
      const country = s.country || (currency === 'USD' ? 'United States' : currency === 'GBP' ? 'United Kingdom' : currency === 'EUR' ? 'Europe' : 'India');

      return {
        ...s,
        currentPrice,
        openingPrice,
        previousClose,
        dayHigh,
        dayLow,
        priceDiff,
        percentChange,
        volume,
        availableUnits,
        currency,
        country
      };
    });
  }, [state?.securities]);

  const securitiesList = useMemo(() => {
    return rawSecuritiesList.filter(s => {
      if (s.visibleToParticipants === false || s.ipoStage === 'HIDDEN' || s.ipoStatus === 'HIDDEN') return false;
      return true;
    });
  }, [rawSecuritiesList]);

  // FX Rates
  const fxRates = useMemo(() => {
    return state?.fxRates || {
      USDINR: { pair: 'USD/INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45 },
      GBPINR: { pair: 'GBP/INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45 },
      EURINR: { pair: 'EUR/INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45 }
    };
  }, [state?.fxRates]);

  const usdRate = fxRates.USDINR?.midRate || 88.20;
  const gbpRate = fxRates.GBPINR?.midRate || 119.40;
  const eurRate = fxRates.EURINR?.midRate || 103.50;

  // Market Indices
  const indices = useMemo(() => {
    if (state?.marketIndices) return state.marketIndices;
    return {
      INDIA50: { name: 'SAAMX INDIA 50', currentValue: 5000.0, openingValue: 5000.0, changePercent: 0.0, dayHigh: 5000.0, dayLow: 5000.0 },
      GLOBAL100: { name: 'SAAMX GLOBAL 100', currentValue: 1000.0, openingValue: 1000.0, changePercent: 0.0, dayHigh: 1000.0, dayLow: 1000.0 },
      US100: { name: 'SAAMX US 100', currentValue: 8000.0, openingValue: 8000.0, changePercent: 0.0, dayHigh: 8000.0, dayLow: 8000.0 },
      UK100: { name: 'SAAMX UK 100', currentValue: 4000.0, openingValue: 4000.0, changePercent: 0.0, dayHigh: 4000.0, dayLow: 4000.0 }
    };
  }, [state?.marketIndices]);

  // Market Breadth & Activity Metrics
  const breadth = useMemo(() => {
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let activeSecs = 0;
    let haltedSecs = 0;
    let totalVolume = 0;
    let totalTurnoverInr = 0;

    securitiesList.forEach(s => {
      if (s.status === 'Active') activeSecs++;
      if (s.status === 'Halted' || s.status === 'Suspended') haltedSecs++;

      if (s.percentChange > 0.01) advances++;
      else if (s.percentChange < -0.01) declines++;
      else unchanged++;

      totalVolume += s.volume;
      const rate = s.currency === 'INR' ? 1.0 : (state?.fxRates?.[`${s.currency}INR`]?.midRate || DEFAULT_FX_RATES[`${s.currency}INR`]?.midRate || 1.0);
      totalTurnoverInr += (s.volume * s.currentPrice) * rate;
    });

    const total = securitiesList.length || 1;
    const advancePct = ((advances / total) * 100).toFixed(1);
    const declinePct = ((declines / total) * 100).toFixed(1);

    const txs = Array.isArray(state?.transactions) ? state.transactions : Object.values(state?.transactions || {});
    const executedTradesCount = txs.length;

    // Highest Volume & Most Active
    const sortedByVol = [...securitiesList].sort((a, b) => b.volume - a.volume);
    const highestVolSec = sortedByVol[0] || null;

    return {
      advances,
      declines,
      unchanged,
      advancePct,
      declinePct,
      activeSecs,
      haltedSecs,
      totalSecurities: securitiesList.length,
      totalVolume,
      totalTurnoverInr,
      executedTradesCount,
      highestVolSec
    };
  }, [securitiesList, usdRate, gbpRate, eurRate, state?.transactions]);

  // Unique Filter Options
  const filterOptions = useMemo(() => {
    const exchanges = new Set();
    const sectors = new Set();
    const assetClasses = new Set();
    const currencies = new Set();

    securitiesList.forEach(s => {
      if (s.exchange) exchanges.add(s.exchange);
      if (s.sector) sectors.add(s.sector);
      if (s.type) assetClasses.add(s.type);
      if (s.currency) currencies.add(s.currency);
    });

    return {
      exchanges: Array.from(exchanges).sort(),
      sectors: Array.from(sectors).sort(),
      assetClasses: Array.from(assetClasses).sort(),
      currencies: Array.from(currencies).sort()
    };
  }, [securitiesList]);

  // Filtered & Sorted Securities List for Main Table
  const filteredSecurities = useMemo(() => {
    let list = securitiesList;

    // Search filter
    if (debouncedSearch) {
      list = list.filter(s =>
        (s.ticker && s.ticker.toLowerCase().includes(debouncedSearch)) ||
        (s.name && s.name.toLowerCase().includes(debouncedSearch)) ||
        (s.exchange && s.exchange.toLowerCase().includes(debouncedSearch)) ||
        (s.sector && s.sector.toLowerCase().includes(debouncedSearch)) ||
        (s.industry && s.industry.toLowerCase().includes(debouncedSearch))
      );
    }

    // Geography Filter
    if (geoFilter !== 'ALL') {
      if (geoFilter === 'India') list = list.filter(s => s.country === 'India' || s.currency === 'INR');
      else if (geoFilter === 'USA') list = list.filter(s => s.country === 'United States' || s.currency === 'USD');
      else if (geoFilter === 'UK') list = list.filter(s => s.country === 'United Kingdom' || s.currency === 'GBP');
      else if (geoFilter === 'Europe') list = list.filter(s => s.currency === 'EUR' || ['Germany', 'France', 'Netherlands', 'Europe'].includes(s.country));
      else if (geoFilter === 'APAC') list = list.filter(s => ['Japan', 'China', 'Hong Kong', 'Australia', 'Singapore', 'South Korea', 'Taiwan'].includes(s.country));
      else if (geoFilter === 'Other') list = list.filter(s => !['India', 'United States', 'United Kingdom'].includes(s.country));
    }

    // Asset Class Filter
    if (assetClassFilter !== 'ALL') {
      if (assetClassFilter === 'Stock') list = list.filter(s => s.type === 'Stock' || s.type === 'Equity');
      else if (assetClassFilter === 'Bond') list = list.filter(s => s.type === 'GovernmentBond' || s.type === 'CorporateBond' || (s.type && s.type.includes('Bond')));
      else if (assetClassFilter === 'IPO') list = list.filter(s => s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED' || s.simulationLabel || ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].includes(s.ticker));
      else list = list.filter(s => s.type === assetClassFilter);
    }

    // Exchange Filter
    if (exchangeFilter !== 'ALL') {
      list = list.filter(s => s.exchange === exchangeFilter);
    }

    // Currency Filter
    if (currencyFilter !== 'ALL') {
      list = list.filter(s => s.currency === currencyFilter);
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IPO') list = list.filter(s => s.status === 'IPO_PENDING' || s.status === 'IPO_STAGED' || ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'].includes(s.ticker));
      else list = list.filter(s => s.status === statusFilter);
    }

    // Sector Filter
    if (sectorFilter !== 'ALL') {
      list = list.filter(s => s.sector === sectorFilter);
    }

    // Movement Filter
    if (movementFilter === 'GAINERS') list = list.filter(s => s.percentChange > 0);
    else if (movementFilter === 'LOSERS') list = list.filter(s => s.percentChange < 0);
    else if (movementFilter === 'MOST_ACTIVE') list = list.filter(s => s.volume > 0);

    // Sorting
    list = [...list].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [securitiesList, debouncedSearch, geoFilter, assetClassFilter, exchangeFilter, currencyFilter, statusFilter, sectorFilter, movementFilter, sortBy, sortOrder]);

  // Paginated Slicing
  const totalPages = Math.ceil(filteredSecurities.length / pageSize) || 1;
  const paginatedSecurities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSecurities.slice(start, start + pageSize);
  }, [filteredSecurities, currentPage, pageSize]);

  // Top Movers: Gainers, Losers, Most Active, Biggest Value Movers
  const topGainers = useMemo(() => {
    return [...securitiesList]
      .filter(s => s.status === 'Active' && s.openingPrice > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 10);
  }, [securitiesList]);

  const topLosers = useMemo(() => {
    return [...securitiesList]
      .filter(s => s.status === 'Active' && s.openingPrice > 0)
      .sort((a, b) => a.percentChange - b.percentChange)
      .slice(0, 10);
  }, [securitiesList]);

  const mostActiveList = useMemo(() => {
    return [...securitiesList]
      .filter(s => s.status === 'Active')
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  }, [securitiesList]);

  const biggestValueMovers = useMemo(() => {
    return [...securitiesList]
      .filter(s => s.status === 'Active')
      .map(s => {
        const pairKey = `${s.currency}INR`;
        const rate = s.currency === 'INR' ? 1.0 : (state?.fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
        const absMovementInr = Math.abs(s.priceDiff) * rate;
        return { ...s, absMovementInr };
      })
      .sort((a, b) => b.absMovementInr - a.absMovementInr)
      .slice(0, 10);
  }, [securitiesList, state?.fxRates]);

  // Sector Performance Aggregation
  const sectorPerformance = useMemo(() => {
    const map = {};
    securitiesList.forEach(s => {
      const sec = s.sector || 'General';
      if (!map[sec]) {
        map[sec] = {
          sector: sec,
          count: 0,
          advances: 0,
          declines: 0,
          unchanged: 0,
          totalPct: 0,
          volume: 0,
          strongest: s,
          weakest: s
        };
      }
      map[sec].count++;
      map[sec].totalPct += s.percentChange;
      map[sec].volume += s.volume;
      if (s.percentChange > 0.01) map[sec].advances++;
      else if (s.percentChange < -0.01) map[sec].declines++;
      else map[sec].unchanged++;

      if (s.percentChange > map[sec].strongest.percentChange) map[sec].strongest = s;
      if (s.percentChange < map[sec].weakest.percentChange) map[sec].weakest = s;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        avgChange: item.count > 0 ? (item.totalPct / item.count) : 0
      }))
      .sort((a, b) => b.avgChange - a.avgChange);
  }, [securitiesList]);

  // Global Markets Aggregation
  const globalMarkets = useMemo(() => {
    const regions = [
      { id: 'INDIA', name: 'India', currency: 'INR', curSym: '₹', filterCountry: 'India' },
      { id: 'US', name: 'United States', currency: 'USD', curSym: '$', filterCountry: 'United States' },
      { id: 'UK', name: 'United Kingdom', currency: 'GBP', curSym: '£', filterCountry: 'United Kingdom' },
      { id: 'EUROPE', name: 'Europe', currency: 'EUR', curSym: '€', filterCountry: 'Europe' },
      { id: 'APAC', name: 'APAC & Global', currency: 'NATIVE', curSym: '🌐', filterCountry: 'APAC' }
    ];

    return regions.map(reg => {
      let secs = [];
      if (reg.id === 'INDIA') secs = securitiesList.filter(s => s.country === 'India' || s.currency === 'INR');
      else if (reg.id === 'US') secs = securitiesList.filter(s => s.country === 'United States' || s.currency === 'USD');
      else if (reg.id === 'UK') secs = securitiesList.filter(s => s.country === 'United Kingdom' || s.currency === 'GBP');
      else if (reg.id === 'EUROPE') secs = securitiesList.filter(s => s.currency === 'EUR' || ['Germany', 'France', 'Netherlands', 'Europe'].includes(s.country));
      else secs = securitiesList.filter(s => !['India', 'United States', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'Europe'].includes(s.country));

      const count = secs.length;
      let totalVol = 0;
      let totalPct = 0;
      let strongest = secs[0] || null;
      let weakest = secs[0] || null;

      secs.forEach(s => {
        totalVol += s.volume;
        totalPct += s.percentChange;
        if (!strongest || s.percentChange > strongest.percentChange) strongest = s;
        if (!weakest || s.percentChange < weakest.percentChange) weakest = s;
      });

      const avgChange = count > 0 ? (totalPct / count) : 0;
      return {
        ...reg,
        count,
        totalVol,
        avgChange,
        strongest,
        weakest
      };
    });
  }, [securitiesList]);

  // Live Market Tape: Public Feed of Executed Trades & News Bulletins
  const liveTapeEvents = useMemo(() => {
    const items = [];
    const txs = Array.isArray(state?.transactions) ? state.transactions : Object.values(state?.transactions || {});
    txs.slice(-20).reverse().forEach(tx => {
      items.push({
        id: tx.id || `TX_${tx.timestamp}`,
        type: 'TRADE',
        timestamp: tx.timestamp || Date.now(),
        ticker: tx.securityId || tx.ticker,
        title: `${tx.action} ${tx.quantity} units @ ₹${Number(tx.price || 0).toFixed(2)}`,
        subtitle: `Floor Execution | Order #${tx.orderId || tx.ticketNumber || tx.id}`,
        impact: 'NEUTRAL'
      });
    });

    const news = Array.isArray(state?.newsEvents) ? state.newsEvents : Object.values(state?.newsEvents || {});
    news.slice(-15).reverse().forEach(n => {
      items.push({
        id: n.id || `NEWS_${n.timestamp}`,
        type: 'NEWS',
        timestamp: n.timestamp || Date.now(),
        ticker: n.affectedSecurityIds?.[0] || n.affectedSector || 'MACRO',
        title: n.headline || n.title,
        subtitle: n.category || 'MARKET WIRE',
        impact: n.sentiment === 'BULLISH' || n.impactPercent > 0 ? 'POSITIVE' : n.sentiment === 'BEARISH' || n.impactPercent < 0 ? 'NEGATIVE' : 'NEUTRAL'
      });
    });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }, [state?.transactions, state?.newsEvents]);

  // IPO Radar: Visible Flagship Simulated IPOs
  const ipoOfferings = useMemo(() => {
    const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];
    const visibleList = [];
    ipoTickers.forEach(ticker => {
      const sec = rawSecuritiesList.find(s => s.ticker === ticker) || {};
      const isVisible = sec.visibleToParticipants !== false && sec.ipoStage !== 'HIDDEN' && sec.ipoStatus !== 'HIDDEN';
      if (!isVisible) return;

      const stage = sec.status === 'Active' || sec.ipoStatus === 'LISTED' 
        ? 'Trading' 
        : sec.ipoStatus === 'ALLOTMENT_FINALIZED' 
        ? 'Allotment' 
        : sec.ipoStatus === 'SUBSCRIPTION_OPEN' || sec.ipoStatus === 'SUBSCRIPTION_CLOSING_SOON' 
        ? 'Subscription Open' 
        : sec.status === 'IPO_PENDING' 
        ? 'Announced' 
        : 'Rumored';

      visibleList.push({
        ticker,
        name: sec.name || (ticker === 'OAI' ? 'OpenAI Hyperscale' : ticker === 'STRP' ? 'Stripe Global Infra' : ticker === 'CNVA' ? 'Canva Creative' : ticker === 'DISC' ? 'Discord Media' : 'Polymarket Protocol'),
        exchange: sec.exchange || 'NASDAQ',
        currency: sec.currency || 'USD',
        curSym: sec.currency === 'INR' ? '₹' : '$',
        issuePrice: sec.basePrice || sec.currentPrice || 100,
        lotSize: sec.ipoLotSize || (ticker === 'CNVA' ? 25 : ticker === 'POLY' ? 50 : 10),
        stage,
        multiple: sec.ipoSubscriptionMultiple || '1.0x',
        status: sec.status || 'IPO_STAGED',
        description: sec.description || 'Simulated academic IPO offering.'
      });
    });
    return visibleList;
  }, [rawSecuritiesList]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder(col === 'ticker' || col === 'name' ? 'asc' : 'desc');
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setGeoFilter('ALL');
    setAssetClassFilter('ALL');
    setExchangeFilter('ALL');
    setCurrencyFilter('ALL');
    setStatusFilter('ALL');
    setSectorFilter('ALL');
    setMovementFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '16px 20px 48px', color: 'var(--color-ink)' }}>
      {/* 1. TOP MARKET HEADER */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        padding: '16px 24px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'var(--color-brass-subtle)',
            color: 'var(--color-brass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            border: '1px solid var(--color-border)'
          }}>
            📈
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: 0, color: 'var(--color-ink)' }}>
                SAAMX MARKET WATCH
              </h1>
              <span style={{
                background: 'rgba(132, 85, 8, 0.08)',
                color: 'var(--color-brass)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}>
                LIVE MARKET DATA
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-3)', marginTop: '2px' }}>
              Live Simulated Securities Market &bull; Professional Academic Exchange Terminal
            </div>
          </div>
        </div>

        {/* Market Status & Sync Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: state?.marketState?.status === 'Open' ? 'var(--color-rise-light)' : 'var(--color-surface-2)',
            border: `1px solid ${state?.marketState?.status === 'Open' ? 'var(--color-rise)' : 'var(--color-border)'}`,
            fontSize: '0.8rem',
            fontWeight: 800
          }}>
            <span className={`status-pulse-dot ${state?.marketState?.status === 'Open' ? '' : 'closed'}`} />
            <span style={{ color: state?.marketState?.status === 'Open' ? 'var(--color-rise)' : 'var(--color-ink-2)' }}>
              {state?.marketState?.status === 'Open' ? 'LIVE MARKET' : (state?.marketState?.status || 'PAUSED')} &bull; {clock.sessionState}
            </span>
          </div>

          <div style={{
            background: 'var(--color-surface-2)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            fontWeight: 700
          }}>
            🕒 {clock.timeString} ({clock.timeLeftString})
          </div>

          <div style={{
            background: connected ? 'rgba(6, 95, 62, 0.08)' : 'rgba(147, 25, 19, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${connected ? 'var(--color-rise)' : 'var(--color-fall)'}`,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: connected ? 'var(--color-rise)' : 'var(--color-fall)'
          }}>
            {connected ? '⚡ REALTIME SYNCED' : '⚠ SYNC OFFLINE'}
          </div>
        </div>
      </div>

      {/* Non-intrusive Educational Disclaimer */}
      <div style={{
        background: 'rgba(132, 85, 8, 0.05)',
        border: '1px solid rgba(132, 85, 8, 0.2)',
        borderRadius: '8px',
        padding: '6px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'var(--color-ink-3)'
      }}>
        <span>
          ⚖ <strong>SIMULATED MARKET — EDUCATIONAL EVENT:</strong> SAAMX is a fictional simulation platform created strictly for academic learning. Not affiliated with NSE, BSE, SEBI, NYSE, NASDAQ, or LSE.
        </span>
        <span style={{ fontWeight: 700, color: 'var(--color-brass)' }}>
          READ-ONLY MARKET FEED
        </span>
      </div>

      {/* 2. INDEX STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {Object.entries(indices).map(([key, idx]) => {
          const val = Number(idx.currentValue || 1000);
          const openVal = Number(idx.openingValue || val);
          const chg = val - openVal;
          const chgPct = openVal > 0 ? (chg / openVal) * 100 : 0;
          const isUp = chg >= 0;

          return (
            <div key={key} style={{
              background: 'var(--color-surface)',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-ink-3)', letterSpacing: '0.04em' }}>
                  {idx.name || key}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: isUp ? 'var(--color-rise)' : 'var(--color-fall)',
                  background: isUp ? 'var(--color-rise-light)' : 'var(--color-fall-light)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {isUp ? '▲ +' : '▼ '}{chgPct.toFixed(2)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-ink)' }}>
                  {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isUp ? 'var(--color-rise)' : 'var(--color-fall)', fontFamily: 'monospace' }}>
                  {isUp ? '+' : ''}{chg.toFixed(2)} pts
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-ink-4)', marginTop: '4px', borderTop: '1px solid var(--color-border-light)', paddingTop: '4px' }}>
                <span>H: {Number(idx.dayHigh || val).toFixed(2)}</span>
                <span>L: {Number(idx.dayLow || val).toFixed(2)}</span>
                <span>Base: {openVal.toFixed(0)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MARKET BREADTH & TURNOVER BAR */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        padding: '12px 20px',
        marginBottom: '18px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-ink-3)', textTransform: 'uppercase' }}>Market Breadth (A/D)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
            <span style={{ color: 'var(--color-rise)', fontWeight: 800, fontSize: '0.95rem' }}>▲ {breadth.advances}</span>
            <span style={{ color: 'var(--color-ink-4)', fontSize: '0.8rem' }}>&bull;</span>
            <span style={{ color: 'var(--color-fall)', fontWeight: 800, fontSize: '0.95rem' }}>▼ {breadth.declines}</span>
            <span style={{ color: 'var(--color-ink-4)', fontSize: '0.8rem' }}>&bull;</span>
            <span style={{ color: 'var(--color-ink-3)', fontWeight: 700, fontSize: '0.85rem' }}>▬ {breadth.unchanged}</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-ink-4)' }}>
            {breadth.advancePct}% Advancing vs {breadth.declinePct}% Declining
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-ink-3)', textTransform: 'uppercase' }}>Securities Universe</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-ink)' }}>
            {breadth.totalSecurities.toLocaleString()} Instruments
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-ink-4)' }}>
            {breadth.activeSecs} Active &bull; {breadth.haltedSecs} Halted
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-ink-3)', textTransform: 'uppercase' }}>Consolidated Turnover</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-brass)', fontFamily: 'monospace' }}>
            ₹{breadth.totalTurnoverInr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-ink-4)' }}>
            {breadth.totalVolume.toLocaleString()} units traded
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-ink-3)', textTransform: 'uppercase' }}>Executed Trades</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-ink)' }}>
            {breadth.executedTradesCount.toLocaleString()} Trades
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-ink-4)' }}>
            Most Active: {breadth.highestVolSec?.ticker || 'N/A'}
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE SUB-VIEW SELECTOR */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'ALL_SECURITIES', label: `📊 All Securities (${securitiesList.length.toLocaleString()})`, count: filteredSecurities.length },
          { id: 'MOVERS', label: '🚀 Market Movers', count: 'Top 10' },
          { id: 'SECTORS', label: '🏢 Sector Watch', count: sectorPerformance.length },
          { id: 'GLOBAL', label: '🌐 Global Markets', count: '10 Currencies' },
          { id: 'FX_WATCH', label: '💱 FX Clearing Desk', count: '10 Currencies' },
          { id: 'TAPE', label: '📡 Live Market Tape', count: liveTapeEvents.length },
          { id: 'IPO_RADAR', label: '🌟 IPO Radar', count: ipoOfferings.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: activeView === tab.id ? 'var(--color-brass)' : 'transparent',
              color: activeView === tab.id ? '#FFFFFF' : 'var(--color-ink-2)',
              fontWeight: 800,
              fontSize: '0.85rem',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition-fast)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              background: activeView === tab.id ? 'rgba(255, 255, 255, 0.2)' : 'var(--color-surface-2)',
              color: activeView === tab.id ? '#FFFFFF' : 'var(--color-ink-3)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 5. VIEW: ALL SECURITIES MAIN TABLE */}
      {activeView === 'ALL_SECURITIES' && (
        <div>
          {/* Filters & Search Control Bar */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            padding: '14px 18px',
            marginBottom: '14px',
            boxShadow: 'var(--shadow-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Search Box */}
            <div style={{ flex: '1 1 260px', minWidth: '220px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search ticker, company, exchange, sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  color: 'var(--color-ink)',
                  background: 'var(--color-paper)'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-ink-4)',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select
                value={geoFilter}
                onChange={(e) => { setGeoFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">🌍 All Geography</option>
                <option value="India">🇮🇳 India</option>
                <option value="USA">🇺🇸 USA</option>
                <option value="UK">🇬🇧 UK</option>
                <option value="Europe">🇪🇺 Europe</option>
                <option value="APAC">🌏 APAC & Global</option>
                <option value="Other">🌐 Other</option>
              </select>

              <select
                value={assetClassFilter}
                onChange={(e) => { setAssetClassFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">📑 All Asset Classes</option>
                <option value="Stock">Stock / Equities</option>
                <option value="Bond">Bonds (Govt & Corp)</option>
                <option value="ETF">ETFs</option>
                <option value="MutualFund">Mutual Funds</option>
                <option value="REIT">REITs</option>
                <option value="InvIT">InvITs</option>
                <option value="IPO">Simulated IPOs</option>
              </select>

              <select
                value={exchangeFilter}
                onChange={(e) => { setExchangeFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">🏛 All Exchanges</option>
                {filterOptions.exchanges.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>

              <select
                value={currencyFilter}
                onChange={(e) => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">💵 All Currencies</option>
                {filterOptions.currencies.map(cur => (
                  <option key={cur} value={cur}>{cur} ({CURRENCY_SYMBOLS[cur] || cur})</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">🚥 All Status</option>
                <option value="Active">Active</option>
                <option value="Halted">Halted</option>
                <option value="Suspended">Suspended</option>
                <option value="IPO">IPO Staged</option>
              </select>

              <select
                value={movementFilter}
                onChange={(e) => { setMovementFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)' }}
              >
                <option value="ALL">📊 All Movements</option>
                <option value="GAINERS">Gainers (+)</option>
                <option value="LOSERS">Losers (-)</option>
                <option value="MOST_ACTIVE">Active Volume</option>
              </select>

              <select
                value={sectorFilter}
                onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-surface)', maxWidth: '160px' }}
              >
                <option value="ALL">🏭 All Sectors</option>
                {filterOptions.sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>

              <button
                onClick={resetAllFilters}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer' }}
                title="Reset all search filters"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Table Data Summary & Pagination Sizer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem', color: 'var(--color-ink-3)' }}>
            <div>
              Showing <strong>{paginatedSecurities.length}</strong> of <strong>{filteredSecurities.length}</strong> matching instruments (Page {currentPage} of {totalPages})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.78rem' }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* 17-Column Exchange Market Table */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            boxShadow: 'var(--shadow-card)',
            maxHeight: '75vh'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '1350px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--color-surface-2)', zIndex: 10, borderBottom: '2px solid var(--color-border)' }}>
                <tr>
                  <th onClick={() => handleSort('ticker')} style={{ padding: '10px 12px', cursor: 'pointer', fontWeight: 800 }}>
                    Symbol {sortBy === 'ticker' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('name')} style={{ padding: '10px 12px', cursor: 'pointer', fontWeight: 800 }}>
                    Security Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('exchange')} style={{ padding: '10px 8px', cursor: 'pointer', fontWeight: 800 }}>
                    Exchange {sortBy === 'exchange' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', fontWeight: 800 }}>Country</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800 }}>Asset Class</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800 }}>Sector</th>
                  <th style={{ padding: '10px 8px', fontWeight: 800 }}>Currency</th>
                  <th onClick={() => handleSort('previousClose')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', fontWeight: 800 }}>
                    Prev Close {sortBy === 'previousClose' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('currentPrice')} style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', fontWeight: 900, color: 'var(--color-brass)' }}>
                    LTP {sortBy === 'currentPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('priceDiff')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', fontWeight: 800 }}>
                    Change {sortBy === 'priceDiff' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('percentChange')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', fontWeight: 800 }}>
                    Change % {sortBy === 'percentChange' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>Day High</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>Day Low</th>
                  <th onClick={() => handleSort('volume')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', fontWeight: 800 }}>
                    Volume {sortBy === 'volume' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('availableUnits')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', fontWeight: 800 }}>
                    Available Units {sortBy === 'availableUnits' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 800 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSecurities.length === 0 ? (
                  <tr>
                    <td colSpan={17} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-ink-3)' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔍</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>No securities match your filters</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--color-ink-4)' }}>
                        Try clearing search terms or resetting the filter dropdowns.
                      </div>
                      <button onClick={resetAllFilters} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                        Clear Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedSecurities.map((sec, idx) => {
                    const isUp = sec.percentChange >= 0;
                    const curSym = CURRENCY_SYMBOLS[sec.currency] || (sec.currency === 'USD' ? '$' : '₹');
                    const isHalted = sec.status === 'Halted' || sec.status === 'Suspended';
                    const isIpo = sec.status === 'IPO_PENDING' || sec.status === 'IPO_STAGED' || sec.ipoStatus === 'SUBSCRIPTION_OPEN';

                    return (
                      <tr
                        key={sec.id || sec.ticker}
                        onClick={() => onOpenProfile && onOpenProfile(sec.id || sec.ticker)}
                        style={{
                          borderBottom: '1px solid var(--color-border-light)',
                          background: idx % 2 === 0 ? 'var(--color-surface)' : 'rgba(247, 245, 238, 0.4)',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(132, 85, 8, 0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--color-surface)' : 'rgba(247, 245, 238, 0.4)'}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-brass)' }}>
                          {sec.ticker}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sec.name}>
                          {sec.name}
                        </td>
                        <td style={{ padding: '8px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                          {sec.exchange || 'NSE'}
                        </td>
                        <td style={{ padding: '8px 8px', fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                          {sec.country || 'India'}
                        </td>
                        <td style={{ padding: '8px 8px', fontSize: '0.75rem' }}>
                          <span style={{
                            background: 'var(--color-surface-2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            {sec.type || 'Stock'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px', fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                          {sec.sector || 'General'}
                        </td>
                        <td style={{ padding: '8px 8px', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                          {sec.currency}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--color-ink-4)' }}>
                          {curSym}{sec.previousClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                          {curSym}{sec.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: isUp ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                          {isUp ? '+' : ''}{sec.priceDiff.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                          <span style={{
                            background: isUp ? 'var(--color-rise-light)' : 'var(--color-fall-light)',
                            color: isUp ? 'var(--color-rise)' : 'var(--color-fall)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {isUp ? '+' : ''}{sec.percentChange.toFixed(2)}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                          {curSym}{sec.dayHigh.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                          {curSym}{sec.dayLow.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {sec.volume.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: sec.availableUnits < 1000 ? 'var(--color-fall)' : 'var(--color-ink-3)' }}>
                          {sec.availableUnits.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            background: isHalted ? 'var(--color-fall-light)' : isIpo ? 'rgba(132, 85, 8, 0.12)' : 'var(--color-rise-light)',
                            color: isHalted ? 'var(--color-fall)' : isIpo ? 'var(--color-brass)' : 'var(--color-rise)'
                          }}>
                            {isHalted ? 'HALTED' : isIpo ? 'IPO' : 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenProfile) onOpenProfile(sec.id || sec.ticker);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                « First
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                ‹ Prev
              </button>

              <span style={{ padding: '0 10px', fontSize: '0.8rem', fontWeight: 700 }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next ›
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Last »
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. VIEW: MARKET MOVERS (Gainers, Losers, Most Active, Biggest Value) */}
      {activeView === 'MOVERS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {/* Top 10 Gainers */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--color-rise-light)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-rise)', margin: 0 }}>
                🚀 TOP GAINERS (Top 10)
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-3)' }}>% Gain</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-ink-4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Security</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Change %</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map((s, i) => (
                  <tr key={s.id || s.ticker} onClick={() => onOpenProfile && onOpenProfile(s.id || s.ticker)} style={{ borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                    <td style={{ padding: '6px', fontWeight: 800, color: 'var(--color-brass)' }}>{s.ticker}</td>
                    <td style={{ padding: '6px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--color-rise)', fontWeight: 800, fontFamily: 'monospace' }}>+{s.percentChange.toFixed(2)}%</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--color-ink-4)' }}>{s.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 10 Losers */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--color-fall-light)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-fall)', margin: 0 }}>
                📉 TOP LOSERS (Top 10)
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-3)' }}>% Loss</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-ink-4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Security</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Change %</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map((s, i) => (
                  <tr key={s.id || s.ticker} onClick={() => onOpenProfile && onOpenProfile(s.id || s.ticker)} style={{ borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                    <td style={{ padding: '6px', fontWeight: 800, color: 'var(--color-brass)' }}>{s.ticker}</td>
                    <td style={{ padding: '6px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--color-fall)', fontWeight: 800, fontFamily: 'monospace' }}>{s.percentChange.toFixed(2)}%</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--color-ink-4)' }}>{s.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 10 Most Active (Traded Volume) */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                🔥 MOST ACTIVE (Top 10 Volume)
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-3)' }}>Units Traded</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-ink-4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Security</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Change %</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {mostActiveList.map((s, i) => (
                  <tr key={s.id || s.ticker} onClick={() => onOpenProfile && onOpenProfile(s.id || s.ticker)} style={{ borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                    <td style={{ padding: '6px', fontWeight: 800, color: 'var(--color-brass)' }}>{s.ticker}</td>
                    <td style={{ padding: '6px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: s.percentChange >= 0 ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 800, fontFamily: 'monospace' }}>
                      {s.percentChange >= 0 ? '+' : ''}{s.percentChange.toFixed(2)}%
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{s.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top 10 Biggest Value Movers (Currency-Aware) */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                ⚡ BIGGEST VALUE MOVERS (INR Basis)
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-3)' }}>Absolute Move</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-ink-4)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Security</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>LTP</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Move (INR)</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Change %</th>
                </tr>
              </thead>
              <tbody>
                {biggestValueMovers.map((s, i) => (
                  <tr key={s.id || s.ticker} onClick={() => onOpenProfile && onOpenProfile(s.id || s.ticker)} style={{ borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                    <td style={{ padding: '6px', fontWeight: 800, color: 'var(--color-brass)' }}>{s.ticker}</td>
                    <td style={{ padding: '6px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{s.currentPrice.toFixed(2)} ({s.currency})</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>≈ ₹{s.absMovementInr.toFixed(0)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: s.percentChange >= 0 ? 'var(--color-rise)' : 'var(--color-fall)', fontWeight: 800, fontFamily: 'monospace' }}>
                      {s.percentChange >= 0 ? '+' : ''}{s.percentChange.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. VIEW: SECTOR WATCH */}
      {activeView === 'SECTORS' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {sectorPerformance.map(sec => {
              const isUp = sec.avgChange >= 0;
              return (
                <div
                  key={sec.sector}
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    padding: '16px',
                    boxShadow: 'var(--shadow-subtle)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                      {sec.sector}
                    </h4>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: isUp ? 'var(--color-rise-light)' : 'var(--color-fall-light)',
                      color: isUp ? 'var(--color-rise)' : 'var(--color-fall)'
                    }}>
                      {isUp ? '▲ +' : '▼ '}{sec.avgChange.toFixed(2)}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-ink-3)', margin: '8px 0 12px' }}>
                    <span>{sec.count} Securities</span>
                    <span>Volume: {sec.volume.toLocaleString()}</span>
                  </div>

                  {/* Breadth Bar */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-rise)', fontWeight: 700 }}>▲ {sec.advances} Adv</span>
                    <span style={{ color: 'var(--color-fall)', fontWeight: 700 }}>▼ {sec.declines} Dec</span>
                    <span style={{ color: 'var(--color-ink-4)' }}>▬ {sec.unchanged} Unch</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '8px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ color: 'var(--color-ink-4)' }}>Top: </span>
                      <strong style={{ color: 'var(--color-rise)', cursor: 'pointer' }} onClick={() => onOpenProfile && onOpenProfile(sec.strongest?.ticker)}>
                        {sec.strongest?.ticker} (+{sec.strongest?.percentChange.toFixed(1)}%)
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-ink-4)' }}>Lag: </span>
                      <strong style={{ color: 'var(--color-fall)', cursor: 'pointer' }} onClick={() => onOpenProfile && onOpenProfile(sec.weakest?.ticker)}>
                        {sec.weakest?.ticker} ({sec.weakest?.percentChange.toFixed(1)}%)
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSectorFilter(sec.sector);
                      setActiveView('ALL_SECURITIES');
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '0.75rem' }}
                  >
                    View {sec.sector} Stocks ({sec.count}) →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. VIEW: GLOBAL MARKETS */}
      {activeView === 'GLOBAL' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {globalMarkets.map(reg => {
              const isUp = reg.avgChange >= 0;
              return (
                <div key={reg.id} style={{ background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)', padding: '18px', boxShadow: 'var(--shadow-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                      {reg.name} ({reg.currency})
                    </h3>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: isUp ? 'var(--color-rise-light)' : 'var(--color-fall-light)',
                      color: isUp ? 'var(--color-rise)' : 'var(--color-fall)'
                    }}>
                      {isUp ? '▲ +' : '▼ '}{reg.avgChange.toFixed(2)}%
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-3)', marginBottom: '14px' }}>
                    <strong>{reg.count}</strong> listed instruments &bull; Currency: <strong>{reg.currency}</strong> ({reg.curSym})
                  </div>

                  <div style={{ background: 'var(--color-paper)', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-ink-4)' }}>Strongest:</span>
                      <strong style={{ color: 'var(--color-rise)', cursor: 'pointer' }} onClick={() => onOpenProfile && onOpenProfile(reg.strongest?.ticker)}>
                        {reg.strongest?.ticker} (+{reg.strongest?.percentChange.toFixed(2)}%)
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-ink-4)' }}>Weakest:</span>
                      <strong style={{ color: 'var(--color-fall)', cursor: 'pointer' }} onClick={() => onOpenProfile && onOpenProfile(reg.weakest?.ticker)}>
                        {reg.weakest?.ticker} ({reg.weakest?.percentChange.toFixed(2)}%)
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-4)', marginBottom: '12px' }}>
                    Total Session Volume: <strong>{reg.totalVol.toLocaleString()}</strong> units
                  </div>

                  <button
                    onClick={() => {
                      setGeoFilter(reg.filterCountry === 'APAC' ? 'APAC' : reg.filterCountry === 'United States' ? 'USA' : reg.filterCountry === 'United Kingdom' ? 'UK' : reg.filterCountry);
                      setActiveView('ALL_SECURITIES');
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
                  >
                    Filter Main Table to {reg.name} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. VIEW: FX CLEARING DESK WATCH */}
      {activeView === 'FX_WATCH' && (
        <div>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            padding: '18px 24px',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              Foreign Currency Clearing & Spot Exchange Rates
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '0.8rem', color: 'var(--color-ink-3)' }}>
              Spot rates applied by the Physical FX Clearing Desk (`#/fx`). Teams must hold native foreign currency balances to execute international stock trades.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {Object.entries(fxRates).map(([pairKey, fx]) => {
                const mid = Number(fx.midRate || 88.20);
                const buy = Number(fx.buyRate || (mid * 1.0045));
                const sell = Number(fx.sellRate || (mid * 0.9955));
                const spread = Number(fx.spreadPercent || 0.45);

                return (
                  <div key={pairKey} style={{ background: 'var(--color-paper)', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-brass)' }}>{fx.pair || pairKey}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ink-4)' }}>Spread: {spread}%</span>
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-ink)', margin: '8px 0' }}>
                      ₹{mid.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                      <span>Desk Buy: <strong>₹{buy.toFixed(2)}</strong></span>
                      <span>Desk Sell: <strong>₹{sell.toFixed(2)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 10. VIEW: LIVE MARKET TAPE */}
      {activeView === 'TAPE' && (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '10px',
          border: '1px solid var(--color-border)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-ink)' }}>
            Live Market Activity Tape (Real-Time Floor Feed)
          </h3>
          <p style={{ margin: '4px 0 14px', fontSize: '0.78rem', color: 'var(--color-ink-3)' }}>
            Continuously updated broadcast of verified trade executions, regulatory announcements, and breaking news bulletins.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {liveTapeEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-ink-4)' }}>
                Waiting for trading floor activity...
              </div>
            ) : (
              liveTapeEvents.map(evt => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-light)',
                    background: evt.type === 'NEWS' ? 'rgba(132, 85, 8, 0.04)' : 'var(--color-surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: evt.type === 'NEWS' ? 'var(--color-brass-subtle)' : 'var(--color-surface-2)',
                      color: evt.type === 'NEWS' ? 'var(--color-brass)' : 'var(--color-ink-2)'
                    }}>
                      {evt.type}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-ink)' }}>
                        <strong>[{evt.ticker}]</strong> {evt.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-4)' }}>
                        {evt.subtitle}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-4)', fontFamily: 'monospace' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 11. VIEW: IPO RADAR (5 Simulated Offerings) */}
      {activeView === 'IPO_RADAR' && (
        <div>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            padding: '18px 24px',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)' }}>
              🌟 SAAMX Simulated Primary Market IPO Radar
            </h3>
            <p style={{ margin: '4px 0 16px', fontSize: '0.8rem', color: 'var(--color-ink-3)' }}>
              6-Stage simulated IPO offerings. Participants submit bids through their team terminal; unallotted capital is returned upon listing.
            </p>

            {ipoOfferings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--color-paper)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔒</div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--color-ink)' }}>No Primary IPO Offerings Active</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-3)', margin: 0 }}>
                  The exchange administration has not yet scheduled or released primary bookbuilding offerings to participant desks.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {ipoOfferings.map(ipo => (
                <div key={ipo.ticker} style={{ background: 'var(--color-paper)', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-brass)', fontFamily: 'monospace' }}>{ipo.ticker}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: ipo.stage === 'Trading' ? 'var(--color-rise-light)' : 'rgba(132, 85, 8, 0.12)',
                      color: ipo.stage === 'Trading' ? 'var(--color-rise)' : 'var(--color-brass)'
                    }}>
                      {ipo.stage}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '6px 0 2px' }}>
                    {ipo.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-4)', marginBottom: '10px' }}>
                    {ipo.exchange} &bull; Issue Price: <strong>{ipo.curSym}{ipo.issuePrice.toFixed(2)}</strong> &bull; Lot: <strong>{ipo.lotSize}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', lineHeight: '1.4' }}>
                    {ipo.description}
                  </div>
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-brass)' }}>
                      SIMULATED IPO
                    </span>
                    <button
                      onClick={() => onOpenProfile && onOpenProfile(ipo.ticker)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      Dossier →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
}
