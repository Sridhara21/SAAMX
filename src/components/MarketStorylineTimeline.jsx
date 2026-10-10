import React, { useState, useMemo } from 'react';
import { MASTER_MARKET_EVENTS } from '../lib/marketEventsDataset.js';

export default function MarketStorylineTimeline({
  activeEventId,
  firedEvents = {},
  onTriggerEvent,
  onSkipEvent,
  onInspectEvent,
  onToggleTakeover,
  currentSimTime = '10:00 AM'
}) {
  const [tierFilter, setTierFilter] = useState('ALL'); // 'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'SKIPPED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoryline, setSelectedStoryline] = useState('ALL');

  // Categories extracted from master dataset
  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(MASTER_MARKET_EVENTS.map(e => e.category).filter(Boolean)))];
  }, []);

  const storylines = useMemo(() => {
    return ['ALL', ...Array.from(new Set(MASTER_MARKET_EVENTS.map(e => e.storyline).filter(Boolean)))];
  }, []);

  // Filtered master timeline events
  const filteredEvents = useMemo(() => {
    return MASTER_MARKET_EVENTS.filter(evt => {
      const isFired = !!firedEvents[evt.id];
      const isSkipped = firedEvents[evt.id]?.skipped;
      const isLive = activeEventId === evt.id;

      let status = 'UPCOMING';
      if (isSkipped) status = 'SKIPPED';
      else if (isLive) status = 'LIVE';
      else if (isFired) status = 'COMPLETED';

      // Tier check
      if (tierFilter !== 'ALL' && evt.tier !== tierFilter) return false;
      // Category check
      if (categoryFilter !== 'ALL' && evt.category !== categoryFilter) return false;
      // Storyline check
      if (selectedStoryline !== 'ALL' && evt.storyline !== selectedStoryline) return false;
      // Status check
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title?.toLowerCase().includes(q);
        const matchDesc = evt.description?.toLowerCase().includes(q);
        const matchSec = evt.affectedSecurities?.some(s => s.ticker?.toLowerCase().includes(q));
        const matchCat = evt.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSec && !matchCat) return false;
      }

      return true;
    });
  }, [tierFilter, categoryFilter, statusFilter, selectedStoryline, searchQuery, firedEvents, activeEventId]);

  // Statistics
  const stats = useMemo(() => {
    let completed = 0;
    let upcoming = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    MASTER_MARKET_EVENTS.forEach(evt => {
      if (firedEvents[evt.id] && !firedEvents[evt.id].skipped) completed++;
      else upcoming++;

      if (evt.tier === 'TIER_1') tier1Count++;
      else if (evt.tier === 'TIER_2') tier2Count++;
      else tier3Count++;
    });

    return { total: MASTER_MARKET_EVENTS.length, completed, upcoming, tier1Count, tier2Count, tier3Count };
  }, [firedEvents]);

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
    const isFired = !!firedEvents[evt.id];
    const isSkipped = firedEvents[evt.id]?.skipped;
    const isLive = activeEventId === evt.id;

    if (isLive) {
      return (
        <span style={{ backgroundColor: 'var(--color-rise)', color: '#fff', fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', animation: 'pulse 1.5s infinite' }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#0F172A', color: '#F8FAFC', borderRadius: '12px', border: '1px solid #334155', padding: '20px' }}>
      
      {/* 1. Header & Summary Telemetry */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#EAB308', color: '#000', fontWeight: 900, fontSize: '0.72rem', padding: '2px 6px', borderRadius: '3px' }}>
              MASTER TIMELINE ENGINE
            </span>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>
              {stats.total} Total Structured Signals &bull; {stats.completed} Deployed &bull; {stats.upcoming} In Queue
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F8FAFC', margin: '6px 0 0 0', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            SAAMX 2026 Chronological Event Orbit
          </h2>
        </div>

        {/* Quick Tier Counters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#F87171', fontWeight: 800, display: 'block' }}>TIER 1 (MAJOR)</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.tier1Count}</span>
          </div>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#FBBF24', fontWeight: 800, display: 'block' }}>TIER 2 (SECTOR)</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.tier2Count}</span>
          </div>
          <div style={{ background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, display: 'block' }}>TIER 3 (WIRE)</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{stats.tier3Count}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Search & Filters Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: '#1E293B', padding: '12px', borderRadius: '8px' }}>
        
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search 315 events, tickers (e.g. OAI, IDEA, NVDA), headlines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '220px', background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
        />

        {/* Tier Filter */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          <option value="ALL">All Tiers ({stats.total})</option>
          <option value="TIER_1">Tier 1 &bull; Defining ({stats.tier1Count})</option>
          <option value="TIER_2">Tier 2 &bull; Sector ({stats.tier2Count})</option>
          <option value="TIER_3">Tier 3 &bull; Intelligence ({stats.tier3Count})</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Storyline Filter */}
        <select
          value={selectedStoryline}
          onChange={(e) => setSelectedStoryline(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          {storylines.map(s => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Storylines' : s.replace('_', ' ')}</option>
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

      {/* 3. Event List Stream */}
      <div style={{ maxHeight: '650px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '0.9rem' }}>
            No market events found matching current filter criteria.
          </div>
        ) : (
          filteredEvents.map(evt => {
            const isFired = !!firedEvents[evt.id];
            const isLive = activeEventId === evt.id;

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
                      ⏰ {evt.scheduledTime}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800 }}>
                      #{evt.sequence}
                    </span>
                    {getTierBadge(evt.tier)}
                    {getStatusBadge(evt)}
                    <span style={{ fontSize: '0.68rem', color: '#CBD5E1', background: '#334155', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                      {evt.category}
                    </span>
                    {evt.storyline && (
                      <span style={{ fontSize: '0.68rem', color: '#FCD34D', background: 'rgba(234, 179, 8, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 800, border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        {evt.storyline.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 900, color: isLive ? '#34D399' : '#FFFFFF', marginBottom: '4px', lineHeight: '1.4' }}>
                    {evt.title}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4', marginBottom: '8px' }}>
                    {evt.description}
                  </div>

                  {/* Affected Assets Pill Row */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {evt.affectedSecurities && evt.affectedSecurities.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800 }}>SECURITIES:</span>
                        {evt.affectedSecurities.map((s, idx) => {
                          const isPositive = s.impactPercent > 0;
                          return (
                            <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: isPositive ? '#34D399' : '#F87171', border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                              {s.ticker} {isPositive ? '+' : ''}{s.impactPercent}%
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {evt.affectedCurrencies && evt.affectedCurrencies.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, marginLeft: '6px' }}>FX:</span>
                        {evt.affectedCurrencies.map((c, idx) => (
                          <span key={idx} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: '#334155', color: '#E2E8F0' }}>
                            {c}
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

                    {evt.tier === 'TIER_1' && (
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
                      >
                        🚨 Projector
                      </button>
                    )}

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
                      title="Skip this event"
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

    </div>
  );
}
