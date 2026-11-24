import React, { useState, useMemo, useEffect } from 'react';
import { NEWS_PRESETS_LIBRARY, NEWS_PRESET_CATEGORIES } from '../lib/newsPresetsLibrary.js';

export default function MarketStorylineTimeline({
  activeEventId,
  firedEvents = {},
  onTriggerEvent,
  onSkipEvent,
  onInspectEvent,
  onToggleTakeover,
  currentSimTime = '10:00 AM'
}) {
  const [scopeFilter, setScopeFilter] = useState('ALL'); // 'ALL' | 'INDIA' | 'GLOBAL'
  const [tierFilter, setTierFilter] = useState('ALL'); // 'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'SKIPPED'
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [jumpSequence, setJumpSequence] = useState('');

  // Canonical 500 presets normalized for the timeline engine
  const canonicalEvents = useMemo(() => {
    return NEWS_PRESETS_LIBRARY.map(p => {
      const isCritical = p.priority === 'CRITICAL';
      const isMajor = p.priority === 'BREAKING' || p.priority === 'HIGH';
      const tier = isCritical ? 'TIER_1' : isMajor ? 'TIER_2' : 'TIER_3';
      const scheduledWindow = p.scope === 'INDIA' ? 'India Session' : 'Global Session';

      return {
        id: p.id || p.presetId,
        presetId: p.presetId || p.id,
        sequence: p.sequence,
        title: p.headline,
        headline: p.headline,
        description: p.description,
        scope: p.scope,
        country: p.country,
        category: p.category,
        subcategory: p.subcategory,
        priority: p.priority,
        tier,
        scheduledTime: p.scheduledTime || `${scheduledWindow} • #${p.sequence}`,
        affectedSecurities: (p.affectedTickers || p.affectedSecurityIds || []).map(t => ({
          ticker: t,
          impactPercent: p.impactMagnitude || 5
        })),
        affectedTickers: p.affectedTickers || p.affectedSecurityIds || [],
        affectedSectors: p.affectedSectors || [],
        affectedCurrencies: p.affectedCurrencies || [],
        impactMagnitude: p.impactMagnitude || 5,
        sentiment: p.sentiment || 'Neutral',
        primaryDirection: p.primaryDirection || 'VOLATILE',
        directImpact: p.directImpact,
        secondOrderImpact: p.secondOrderImpact,
        crossMarketImpact: p.crossMarketImpact,
        operatorNotes: p.operatorNotes,
        rawPreset: p
      };
    }).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, []);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [scopeFilter, tierFilter, categoryFilter, statusFilter, searchQuery]);

  // Jump directly to sequence #
  const handleJumpToSequence = (e) => {
    if (e) e.preventDefault();
    if (!jumpSequence) return;
    const cleanNum = parseInt(jumpSequence.toString().replace(/^news-?/i, ''), 10);
    if (isNaN(cleanNum) || cleanNum < 1 || cleanNum > 500) {
      alert('Please enter a valid preset sequence number between 1 and 500 (e.g. 137 or NEWS-137).');
      return;
    }
    let idx = filteredEvents.findIndex(p => p.sequence === cleanNum);
    if (idx === -1) {
      setScopeFilter('ALL');
      setTierFilter('ALL');
      setCategoryFilter('ALL');
      setStatusFilter('ALL');
      setSearchQuery('');
      idx = canonicalEvents.findIndex(p => p.sequence === cleanNum);
    }
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      setCurrentPage(targetPage);
      const targetEvt = canonicalEvents.find(p => p.sequence === cleanNum);
      if (targetEvt && onInspectEvent) onInspectEvent(targetEvt);
      setJumpSequence('');
    }
  };

  // Filtered master timeline events
  const filteredEvents = useMemo(() => {
    return canonicalEvents.filter(evt => {
      const isFired = !!firedEvents[evt.id] || !!firedEvents[evt.presetId];
      const isSkipped = firedEvents[evt.id]?.skipped || firedEvents[evt.presetId]?.skipped;
      const isLive = activeEventId === evt.id || activeEventId === evt.presetId;

      let status = 'UPCOMING';
      if (isSkipped) status = 'SKIPPED';
      else if (isLive) status = 'LIVE';
      else if (isFired) status = 'COMPLETED';

      // Scope check
      if (scopeFilter !== 'ALL' && evt.scope?.toUpperCase() !== scopeFilter.toUpperCase()) return false;
      // Tier check
      if (tierFilter !== 'ALL' && evt.tier !== tierFilter) return false;
      // Category check
      if (categoryFilter !== 'ALL' && evt.category !== categoryFilter) return false;
      // Status check
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title?.toLowerCase().includes(q);
        const matchDesc = evt.description?.toLowerCase().includes(q);
        const matchId = evt.id?.toLowerCase().includes(q) || evt.presetId?.toLowerCase().includes(q);
        const matchSeq = String(evt.sequence) === q.replace(/^news-?/i, '');
        const matchSec = evt.affectedTickers?.some(t => t.toLowerCase().includes(q));
        const matchCat = evt.category?.toLowerCase().includes(q);
        const matchSector = evt.affectedSectors?.some(s => s.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchId && !matchSeq && !matchSec && !matchCat && !matchSector) return false;
      }

      return true;
    });
  }, [canonicalEvents, scopeFilter, tierFilter, categoryFilter, statusFilter, searchQuery, firedEvents, activeEventId]);

  // Statistics
  const stats = useMemo(() => {
    let completed = 0;
    let upcoming = 0;
    let indiaCount = 0;
    let globalCount = 0;

    canonicalEvents.forEach(evt => {
      if ((firedEvents[evt.id] || firedEvents[evt.presetId]) && !(firedEvents[evt.id]?.skipped || firedEvents[evt.presetId]?.skipped)) completed++;
      else upcoming++;

      if (evt.scope === 'INDIA') indiaCount++;
      else globalCount++;
    });

    return { total: canonicalEvents.length, completed, upcoming, indiaCount, globalCount };
  }, [canonicalEvents, firedEvents]);

  // Helper badge renderers
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'TIER_1':
        return <span style={{ backgroundColor: '#931913', color: '#fff', fontSize: '0.68rem', fontWeight: 900, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em' }}>TIER 1 &bull; DEFINING</span>;
      case 'TIER_2':
        return <span style={{ backgroundColor: '#845508', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>TIER 2 &bull; SECTOR</span>;
      default:
        return <span style={{ backgroundColor: '#374151', color: '#E5E7EB', fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>TIER 3 &bull; WIRE</span>;
    }
  };

  const getStatusBadge = (evt) => {
    const isFired = !!firedEvents[evt.id] || !!firedEvents[evt.presetId];
    const isSkipped = firedEvents[evt.id]?.skipped || firedEvents[evt.presetId]?.skipped;
    const isLive = activeEventId === evt.id || activeEventId === evt.presetId;

    if (isLive) {
      return (
        <span style={{ backgroundColor: 'var(--color-rise, #065F3E)', color: '#fff', fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', animation: 'pulse 1.5s infinite' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} /> LIVE ACTIVE
        </span>
      );
    }
    if (isSkipped) {
      return <span style={{ backgroundColor: '#4B5563', color: '#9CA3AF', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>SKIPPED</span>;
    }
    if (isFired) {
      return <span style={{ backgroundColor: '#065F3E', color: '#D1FAE5', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>✓ DEPLOYED</span>;
    }
    return <span style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>UPCOMING</span>;
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredEvents.length);
  const pageEvents = filteredEvents.slice(startIdx, startIdx + pageSize);

  // Smart page window
  const pageButtons = [];
  let startPage = Math.max(1, safePage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(i);
  }

  const renderPaginationBar = (position = 'top') => (
    <div
      style={{
        padding: '10px 14px',
        margin: position === 'top' ? '0 0 12px 0' : '16px 0 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
        <span style={{ fontWeight: 800, color: '#F8FAFC' }}>
          Showing {filteredEvents.length === 0 ? 0 : startIdx + 1}–{endIdx} of {filteredEvents.length} Presets
        </span>
        <span style={{ color: '#64748B' }}>•</span>
        <span style={{ color: '#94A3B8' }}>
          Page <strong style={{ color: '#38BDF8' }}>{safePage}</strong> of <strong>{totalPages}</strong>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setCurrentPage(1)}
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: safePage <= 1 ? '#0F172A' : '#334155',
            color: safePage <= 1 ? '#475569' : '#F8FAFC',
            border: '1px solid #475569',
            borderRadius: '4px',
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
          }}
          title="Jump to First Page (NEWS-001)"
        >
          « First
        </button>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: safePage <= 1 ? '#0F172A' : '#334155',
            color: safePage <= 1 ? '#475569' : '#F8FAFC',
            border: '1px solid #475569',
            borderRadius: '4px',
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ‹ Prev
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                background: '#334155',
                color: '#F8FAFC',
                border: '1px solid #475569',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              1
            </button>
            {startPage > 2 && <span style={{ color: '#64748B' }}>…</span>}
          </>
        )}

        {pageButtons.map(pg => (
          <button
            key={pg}
            type="button"
            onClick={() => setCurrentPage(pg)}
            style={{
              padding: '4px 9px',
              fontSize: '0.75rem',
              fontWeight: pg === safePage ? 900 : 700,
              backgroundColor: pg === safePage ? '#2563EB' : '#1E293B',
              color: pg === safePage ? '#FFFFFF' : '#CBD5E1',
              border: pg === safePage ? '1px solid #3B82F6' : '1px solid #475569',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {pg}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ color: '#64748B' }}>…</span>}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                background: '#334155',
                color: '#F8FAFC',
                border: '1px solid #475569',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: safePage >= totalPages ? '#0F172A' : '#334155',
            color: safePage >= totalPages ? '#475569' : '#F8FAFC',
            border: '1px solid #475569',
            borderRadius: '4px',
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next ›
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setCurrentPage(totalPages)}
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: safePage >= totalPages ? '#0F172A' : '#334155',
            color: safePage >= totalPages ? '#475569' : '#F8FAFC',
            border: '1px solid #475569',
            borderRadius: '4px',
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
          }}
          title="Jump to Last Page (NEWS-500)"
        >
          Last »
        </button>

        {/* Jump Form */}
        <form onSubmit={handleJumpToSequence} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
          <input
            type="text"
            placeholder="# (1-500)"
            value={jumpSequence}
            onChange={e => setJumpSequence(e.target.value)}
            style={{
              width: '85px',
              padding: '4px 6px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              background: '#0F172A',
              border: '1px solid #475569',
              color: '#F8FAFC',
              fontFamily: 'monospace'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go
          </button>
        </form>

        {/* Page Size */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Size:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              padding: '3px 6px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              background: '#0F172A',
              border: '1px solid #475569',
              color: '#F8FAFC'
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#0F172A', color: '#F8FAFC', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
      
      {/* 1. Header & Summary Telemetry */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#EAB308', color: '#000', fontWeight: 900, fontSize: '0.72rem', padding: '2px 6px', borderRadius: '3px' }}>
              AUTHORITATIVE NEWS PRESETS & MASTER TIMELINE
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>
              {stats.total} Canonical Presets &bull; {stats.completed} Deployed &bull; {stats.upcoming} In Orbit
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F8FAFC', margin: '6px 0 0 0', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            SAAMX 2026 Chronological 500 Presets Orbit (NEWS-001 to NEWS-500)
          </h2>
        </div>

        {/* Region & Scope Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#34D399', fontWeight: 800, display: 'block' }}>INDIA PRESETS</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.indiaCount}</span>
          </div>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#60A5FA', fontWeight: 800, display: 'block' }}>GLOBAL PRESETS</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.globalCount}</span>
          </div>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#FBBF24', fontWeight: 800, display: 'block' }}>DEPLOYED</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Search & Filters Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: '#1E293B', padding: '12px', borderRadius: '8px' }}>
        
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search 500 presets (e.g. NEWS-137, TCS, RBI, Federal Reserve, crude)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '220px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
        />

        {/* Scope Filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['ALL', 'INDIA', 'GLOBAL'].map(sc => (
            <button
              key={sc}
              type="button"
              onClick={() => setScopeFilter(sc)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                border: '1px solid',
                backgroundColor: scopeFilter === sc ? '#2563EB' : '#0F172A',
                borderColor: scopeFilter === sc ? '#3B82F6' : '#334155',
                color: scopeFilter === sc ? '#FFFFFF' : '#94A3B8',
                cursor: 'pointer'
              }}
            >
              {sc === 'ALL' ? 'All (500)' : sc === 'INDIA' ? 'India (155)' : 'Global (345)'}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, maxWidth: '220px' }}
        >
          <option value="ALL">All 24 Categories</option>
          {NEWS_PRESET_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          <option value="ALL">All Statuses</option>
          <option value="UPCOMING">Upcoming Only</option>
          <option value="LIVE">Live Active</option>
          <option value="COMPLETED">Deployed</option>
          <option value="SKIPPED">Skipped</option>
        </select>

      </div>

      {/* Top Pagination Controls */}
      {renderPaginationBar('top')}

      {/* 3. Event List Stream */}
      <div style={{ maxHeight: '680px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }}>
        {pageEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '0.9rem' }}>
            No presets found matching current filter criteria.
          </div>
        ) : (
          pageEvents.map(evt => {
            const isFired = !!firedEvents[evt.id] || !!firedEvents[evt.presetId];
            const isLive = activeEventId === evt.id || activeEventId === evt.presetId;

            return (
              <div
                key={evt.id}
                style={{
                  background: isLive ? 'rgba(6, 95, 62, 0.25)' : isFired ? 'rgba(15, 23, 42, 0.6)' : '#1E293B',
                  border: isLive ? '2px solid #10B981' : isFired ? '1px solid #334155' : '1px solid #475569',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left: Timing, Tier, Title, Description */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#38BDF8', fontSize: '0.82rem', background: '#0F172A', padding: '2px 6px', borderRadius: '4px', border: '1px solid #1E293B' }}>
                      #{evt.sequence} &bull; {evt.presetId || evt.id}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: evt.scope === 'INDIA' ? '#34D399' : '#60A5FA', fontWeight: 800 }}>
                      [{evt.scope}]
                    </span>
                    {getTierBadge(evt.tier)}
                    {getStatusBadge(evt)}
                    <span style={{ fontSize: '0.68rem', color: '#CBD5E1', background: '#334155', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                      {evt.category}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: evt.sentiment === 'Positive' ? 'rgba(16, 185, 129, 0.15)' : evt.sentiment === 'Negative' ? 'rgba(239, 68, 68, 0.15)' : '#334155',
                      color: evt.sentiment === 'Positive' ? '#34D399' : evt.sentiment === 'Negative' ? '#F87171' : '#CBD5E1'
                    }}>
                      ±{evt.impactMagnitude}% {evt.primaryDirection}
                    </span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 900, color: isLive ? '#34D399' : '#FFFFFF', marginBottom: '4px', lineHeight: '1.4' }}>
                    {evt.title}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4', marginBottom: '8px' }}>
                    {evt.description}
                  </div>

                  {/* Affected Assets Pill Row */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {evt.affectedTickers && evt.affectedTickers.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800 }}>TARGET SECURITIES:</span>
                        {evt.affectedTickers.map((t, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {evt.affectedSectors && evt.affectedSectors.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, marginLeft: '6px' }}>SECTORS:</span>
                        {evt.affectedSectors.map((sec, idx) => (
                          <span key={idx} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: '#334155', color: '#E2E8F0' }}>
                            {sec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Operational Action Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => onTriggerEvent && onTriggerEvent(evt)}
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      background: isLive ? '#10B981' : evt.tier === 'TIER_1' ? '#DC2626' : '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      letterSpacing: '0.02em'
                    }}
                  >
                    {isLive ? '🔄 RE-DEPLOY' : isFired ? '⚡ RE-TRIGGER' : '🚀 DEPLOY NOW'}
                  </button>

                  <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                    <button
                      onClick={() => onInspectEvent && onInspectEvent(evt)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: '#334155',
                        color: '#E2E8F0',
                        border: '1px solid #475569',
                        cursor: 'pointer'
                      }}
                    >
                      🔍 Inspect
                    </button>

                    <button
                      onClick={() => onToggleTakeover && onToggleTakeover(evt)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: '#7F1D1D',
                        color: '#FCA5A5',
                        border: '1px solid #991B1B',
                        cursor: 'pointer'
                      }}
                      title="Trigger Projector Alert Takeover"
                    >
                      🚨 Projector
                    </button>

                    <button
                      onClick={() => onSkipEvent && onSkipEvent(evt)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: '#1E293B',
                        color: '#94A3B8',
                        border: '1px solid #334155',
                        cursor: 'pointer'
                      }}
                      title="Skip this preset"
                    >
                      ⏭
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {renderPaginationBar('bottom')}

    </div>
  );
}
