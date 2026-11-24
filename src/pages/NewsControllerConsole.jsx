import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  NEWS_PRESETS_LIBRARY,
  NEWS_PRESET_CATEGORIES,
  getPresetById,
  getPresetsByCategory,
  getPresetsBySearch,
  getPresetsByScope,
  validateNewsPreset
} from '../lib/newsPresetsLibrary.js';
import {
  calculateMarketImpact,
  calculateNewsCorrection
} from '../lib/marketImpactEngine.js';
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardBody
} from '../components/ui/index.js';
import { MORNING_MARKET_BULLETIN } from '../lib/morningNewsBulletin.js';
import { generateEveningBulletin } from '../lib/eveningNewsBulletin.js';
import { SAAMX_MARKET_HERALD } from '../lib/newspaperData.js';
import { DEBATE_BANK } from '../lib/debateBank.js';

export default function NewsControllerConsole({ state, adminPassword }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('presets'); // 'review' | 'presets' | 'composer' | 'active' | 'morning' | 'evening' | 'newspaper' | 'debates'

  // News Engine State
  const [engineStatus, setEngineStatus] = useState(state?.newsEngineState?.status || 'READY');
  const [engineUpdating, setEngineUpdating] = useState(false);

  // Workspace 1: Review Queue State
  const [drafts, setDrafts] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [rejectModalDraft, setRejectModalDraft] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Workspace 2: Preset Browser State
  const [presetScope, setPresetScope] = useState('All'); // 'All' | 'India' | 'Global'
  const [presetCategory, setPresetCategory] = useState('All');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetSentiment, setPresetSentiment] = useState('All');
  const [presetPriority, setPresetPriority] = useState('All');
  const [selectedPresetDetail, setSelectedPresetDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [jumpSequence, setJumpSequence] = useState('');

  // Workspace 3: Custom Composer State
  const [compHeadline, setCompHeadline] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compCategory, setCompCategory] = useState(NEWS_PRESET_CATEGORIES[0]);
  const [compSubcategory, setCompSubcategory] = useState('GENERAL_UPDATE');
  const [compPriority, setCompPriority] = useState('IMPORTANT');
  const [compSentiment, setCompSentiment] = useState('Positive');
  const [compMagnitude, setCompMagnitude] = useState('10.0');
  const [compTargetScope, setCompTargetScope] = useState('Specific Asset');
  const [compTargetSec, setCompTargetSec] = useState('TCS');
  const [compTargetSector, setCompTargetSector] = useState('');
  const [compTargetCurrency, setCompTargetCurrency] = useState('USD');
  const [compClassification, setCompClassification] = useState('confirmed');
  const [compDuration, setCompDuration] = useState('5');
  const [compTraining, setCompTraining] = useState(false);

  // Workspace 4: Active Events & Corrections State
  const [activeEvents, setActiveEvents] = useState([]);
  const [expiredEvents, setExpiredEvents] = useState([]);
  const [correctionModalEvent, setCorrectionModalEvent] = useState(null);
  const [corrHeadline, setCorrHeadline] = useState('');
  const [corrDescription, setCorrDescription] = useState('');
  const [corrReversalFactor, setCorrReversalFactor] = useState(1.0);

  // Auto-refresh drafts & active telemetry
  const fetchReviewQueue = async () => {
    setIsLoadingDrafts(true);
    try {
      const res = await apiFetch('/api/news/drafts?status=SUBMITTED');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (err) {
      console.warn('Could not fetch drafts:', err);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const fetchActiveEvents = async () => {
    try {
      const res = await apiFetch('/api/news/active');
      if (res.ok) {
        const data = await res.json();
        setActiveEvents(data.activeEvents || []);
        setExpiredEvents(data.expiredEvents || []);
      }
    } catch (err) {
      console.warn('Could not fetch active news:', err);
    }
  };

  const fetchEngineState = async () => {
    try {
      const res = await apiFetch('/api/news/state');
      if (res.ok) {
        const data = await res.json();
        if (data.newsEngineState?.status) {
          setEngineStatus(data.newsEngineState.status);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchReviewQueue();
    fetchActiveEvents();
    fetchEngineState();
    const interval = setInterval(() => {
      fetchActiveEvents();
      fetchReviewQueue();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update News Engine State
  const handleUpdateEngineStatus = async (newStatus) => {
    setEngineUpdating(true);
    try {
      const res = await apiFetch('/api/news/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: `Operator manual switch to ${newStatus}` })
      });
      if (res.ok) {
        const data = await res.json();
        setEngineStatus(data.newsEngineState.status);
      } else {
        const err = await res.json();
        alert(`Failed to update engine status: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setEngineUpdating(false);
    }
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [presetScope, presetCategory, presetSentiment, presetPriority, presetSearch]);

  const handleJumpToSequence = (e) => {
    if (e) e.preventDefault();
    if (!jumpSequence) return;
    const cleanNum = parseInt(jumpSequence.toString().replace(/^news-?/i, ''), 10);
    if (isNaN(cleanNum) || cleanNum < 1 || cleanNum > 500) {
      alert('Please enter a valid preset sequence number between 1 and 500 (e.g. 137 or NEWS-137).');
      return;
    }
    let idx = filteredPresets.findIndex(p => p.sequence === cleanNum);
    if (idx === -1) {
      setPresetScope('All');
      setPresetCategory('All');
      setPresetSentiment('All');
      setPresetPriority('All');
      setPresetSearch('');
      idx = NEWS_PRESETS_LIBRARY.findIndex(p => p.sequence === cleanNum);
    }
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      setCurrentPage(targetPage);
      const targetPreset = NEWS_PRESETS_LIBRARY.find(p => p.sequence === cleanNum);
      if (targetPreset) setSelectedPresetDetail(targetPreset);
      setJumpSequence('');
    }
  };

  // Pre-filter presets for Workspace 2
  const filteredPresets = NEWS_PRESETS_LIBRARY.filter(preset => {
    if (presetScope !== 'All' && preset.scope?.toUpperCase() !== presetScope.toUpperCase()) return false;
    if (presetCategory !== 'All' && preset.category !== presetCategory) return false;
    if (presetSentiment !== 'All' && preset.sentiment !== presetSentiment) return false;
    if (presetPriority !== 'All' && preset.priority !== presetPriority) return false;
    if (presetSearch) {
      const q = presetSearch.toLowerCase();
      const match = (preset.headline && preset.headline.toLowerCase().includes(q)) ||
                    (preset.shortHeadline && preset.shortHeadline.toLowerCase().includes(q)) ||
                    (preset.description && preset.description.toLowerCase().includes(q)) ||
                    (preset.id && preset.id.toLowerCase().includes(q)) ||
                    ((preset.affectedSecurityIds || []).some(s => s.toLowerCase().includes(q))) ||
                    ((preset.affectedTickers || []).some(s => s.toLowerCase().includes(q))) ||
                    ((preset.affectedAssets?.securities || []).some(s => s.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  // Actions
  const handleApproveDraft = async (draft) => {
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id, action: 'APPROVE' })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Approval failed');
      const pubRes = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id })
      });
      if (!pubRes.ok) throw new Error((await pubRes.json()).error || 'Auto-publish failed');
      alert(`Draft ${draft.id} approved and published to live exchange!`);
      fetchReviewQueue();
      fetchActiveEvents();
    } catch (err) {
      alert(`Error approving draft: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectDraft = async () => {
    if (!rejectModalDraft) return;
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: rejectModalDraft.id,
          action: 'REJECT',
          feedback: rejectFeedback || 'Does not meet institutional news criteria'
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Rejection failed');
      setRejectModalDraft(null);
      setRejectFeedback('');
      fetchReviewQueue();
    } catch (err) {
      alert(`Error rejecting draft: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTriggerPreset = async (preset) => {
    if (!confirm(`Publish preset [${preset.id}]: "${preset.headline}" to live market?`)) return;
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerPresetId: preset.id })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Trigger failed');
      const data = await res.json();
      alert(`Published! Affected ${data.affectedCount || 0} securities across exchange order books.`);
      fetchActiveEvents();
    } catch (err) {
      alert(`Error triggering preset: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handlePublishCustomNews = async () => {
    setActionInProgress(true);
    try {
      const payload = {
        headline: compHeadline.trim(),
        description: compDescription.trim(),
        category: compCategory,
        subcategory: compSubcategory,
        priority: compPriority,
        sentiment: compSentiment,
        impactMagnitude: parseFloat(compMagnitude),
        affectedAssets: {
          securities: compTargetScope === 'Specific Asset' ? [compTargetSec] : [],
          sectors: compTargetScope === 'Entire Sector' ? [compTargetSector] : [],
          currencies: compTargetScope === 'Currency Pair' ? [compTargetCurrency] : []
        },
        classification: compClassification,
        impactParameters: {
          priceImpactPercent: compSentiment === 'Negative' ? -parseFloat(compMagnitude) : parseFloat(compMagnitude),
          volatilityMultiplier: 1.3,
          demandShift: compSentiment === 'Negative' ? -25 : 25,
          tradingRestriction: null,
          fxImpactPercent: 0,
          fxReserveDemand: 0
        },
        duration: parseInt(compDuration, 10),
        expiryRules: { decayHalfLife: 90, autoRevert: false, revertFactor: 0.35 },
        correctionRules: { linkedRumourId: null, reversalFactor: 1.0, officialClarification: null },
        trainingEligibility: compTraining
      };

      const res = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPayload: payload })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Custom publish failed');
      alert('Custom news published successfully to live exchange!');
      setCompHeadline('');
      setCompDescription('');
      fetchActiveEvents();
      setActiveTab('active');
    } catch (err) {
      alert(`Error publishing custom news: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleIssueCorrection = async () => {
    if (!correctionModalEvent) return;
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetNewsId: correctionModalEvent.id,
          correctionHeadline: corrHeadline || `CLARIFICATION: Reversal of ${correctionModalEvent.headline}`,
          correctionDescription: corrDescription || 'Official regulatory clarification has resolved market uncertainty.',
          reversalFactor: corrReversalFactor
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Correction failed');
      alert(`Distortion unwind applied successfully!`);
      setCorrectionModalEvent(null);
      fetchActiveEvents();
    } catch (err) {
      alert(`Correction error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDismissActiveEvent = async (newsId) => {
    if (!confirm(`Dismiss active news event ${newsId}?`)) return;
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Dismissal failed');
      fetchActiveEvents();
    } catch (err) {
      alert(`Dismissal error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--color-ink)' }}>
              🎙️ News Controller Command Console
            </h1>
            <Badge variant="outline" style={{ background: '#4F46E5', color: '#FFF', fontWeight: 800 }}>PORTAL #10</Badge>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-ink-2)', fontSize: '0.9rem' }}>
            Authoritative News Information Engine: 500 Presets (155 India + 345 Global), Multi-Asset Impact, Editorial Bulletins & Live Telemetry.
          </p>
        </div>

        {/* News Engine State Control Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--color-surface-2, #F8FAFC)',
          border: '1.5px solid var(--color-border, #E2E8F0)',
          borderRadius: '10px',
          padding: '8px 16px'
        }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-ink-muted, #64748B)', textTransform: 'uppercase', display: 'block' }}>
              NEWS ENGINE STATE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: engineStatus === 'RUNNING' || engineStatus === 'READY' ? '#10B981' : engineStatus === 'PAUSED' ? '#F59E0B' : '#EF4444'
              }} />
              <strong style={{
                fontSize: '1rem',
                fontWeight: 900,
                color: engineStatus === 'RUNNING' || engineStatus === 'READY' ? '#065F46' : engineStatus === 'PAUSED' ? '#B45309' : '#991B1B'
              }}>
                {engineStatus}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'OFF'].map(st => (
              <button
                key={st}
                type="button"
                disabled={engineUpdating || engineStatus === st}
                onClick={() => handleUpdateEngineStatus(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: engineStatus === st ? '#1E293B' : '#FFFFFF',
                  borderColor: engineStatus === st ? '#1E293B' : '#CBD5E1',
                  color: engineStatus === st ? '#FFFFFF' : '#475569'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operator Independence Banner */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '8px',
        padding: '8px 16px',
        marginBottom: '16px',
        fontSize: '0.82rem',
        color: '#1E40AF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          🛡️ <strong>Rule: Operator-Controlled News:</strong> Market timing alone never publishes news. The clock reaching session milestones will not release headlines unless explicitly published or unpaused by authorized personnel.
        </span>
        <span style={{ fontWeight: 700 }}>
          {filteredPresets.length} Presets Available &bull; 40 Debates Live
        </span>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-2, #F1F5F9)', padding: '6px', borderRadius: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'presets' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('presets')}
          style={{ fontWeight: 800 }}
        >
          📚 Presets Library (500)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'review' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('review')}
          style={{ fontWeight: 800 }}
        >
          📥 Review Queue ({drafts.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'composer' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('composer')}
          style={{ fontWeight: 800 }}
        >
          ✏️ Custom Composer
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('active')}
          style={{ fontWeight: 800 }}
        >
          ⏱️ Active & Corrections ({activeEvents.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'morning' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('morning')}
          style={{ fontWeight: 800 }}
        >
          🌅 Morning Bulletin
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'evening' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('evening')}
          style={{ fontWeight: 800 }}
        >
          🌆 Evening Bulletin
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'newspaper' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('newspaper')}
          style={{ fontWeight: 800 }}
        >
          📰 Market Herald
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'debates' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('debates')}
          style={{ fontWeight: 800 }}
        >
          ⚖️ Debate Bank (40)
        </button>
      </div>

      {/* ========================================================= */}
      {/* WORKSPACE: PRESETS LIBRARY (500 STRUCTURED PRESETS)       */}
      {/* ========================================================= */}
      {activeTab === 'presets' && (
        <div>
          {/* Filters Bar */}
          <div className="glass card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              
              {/* Scope Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>Region / Scope</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['All', 'India', 'Global'].map(sc => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setPresetScope(sc)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: '1px solid',
                        backgroundColor: presetScope === sc ? '#4F46E5' : '#FFFFFF',
                        borderColor: presetScope === sc ? '#4F46E5' : '#CBD5E1',
                        color: presetScope === sc ? '#FFFFFF' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {sc === 'All' ? 'All (500)' : sc === 'India' ? 'India (155)' : 'Global (345)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>Category ({NEWS_PRESET_CATEGORIES.length})</label>
                <select
                  className="input-field"
                  value={presetCategory}
                  onChange={e => setPresetCategory(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem' }}
                >
                  <option value="All">All 24 Canonical Categories</option>
                  {NEWS_PRESET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Text Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>Search Headline / Ticker</label>
                <input
                  type="text"
                  placeholder="e.g. TCS, HDFC, Red Sea, Nvidia, OAI..."
                  className="input-field"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem' }}
                />
              </div>

              {/* Sentiment Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>Direction / Sentiment</label>
                <select
                  className="input-field"
                  value={presetSentiment}
                  onChange={e => setPresetSentiment(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem' }}
                >
                  <option value="All">All Sentiments</option>
                  <option value="Positive">Positive (Bullish)</option>
                  <option value="Negative">Negative (Bearish)</option>
                  <option value="Neutral">Neutral / Mixed</option>
                </select>
              </div>

            </div>

            <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--color-ink-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Showing <strong>{filteredPresets.length}</strong> of 500 validated institutional presets ({NEWS_PRESETS_LIBRARY.filter(p => p.scope === 'INDIA').length} India, {NEWS_PRESETS_LIBRARY.filter(p => p.scope === 'GLOBAL').length} Global).
              </span>
              {selectedPresetDetail && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelectedPresetDetail(null)}
                >
                  Close Inspection Panel
                </button>
              )}
            </div>
          </div>

          {/* Detailed Inspector Modal/Panel if a preset is selected */}
          {selectedPresetDetail && (
            <div className="glass card" style={{
              padding: '24px',
              marginBottom: '24px',
              border: '2px solid #4F46E5',
              background: '#FFFFFF',
              boxShadow: '0 8px 30px rgba(79, 70, 229, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Badge variant={selectedPresetDetail.scope === 'INDIA' ? 'success' : 'primary'}>
                      {selectedPresetDetail.scope} &bull; {selectedPresetDetail.country}
                    </Badge>
                    <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4F46E5' }}>
                      #{selectedPresetDetail.sequence} &bull; {selectedPresetDetail.presetId || selectedPresetDetail.id}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>
                      Category: {selectedPresetDetail.category}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0F172A' }}>
                    {selectedPresetDetail.headline}
                  </h3>
                  {selectedPresetDetail.shortHeadline && (
                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>
                      Ticker Banner: "{selectedPresetDetail.shortHeadline}"
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 800 }}
                    onClick={() => handleTriggerPreset(selectedPresetDetail)}
                    disabled={actionInProgress}
                  >
                    ⚡ Publish to Live Exchange
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedPresetDetail(null)}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.5, margin: '0 0 16px' }}>
                {selectedPresetDetail.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', background: '#F8FAFC', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>DIRECT MARKET IMPACT:</strong>
                  <span style={{ fontSize: '0.85rem', color: '#0F172A' }}>{selectedPresetDetail.directImpact}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>SECOND-ORDER CONTAGION (30% PEERS):</strong>
                  <span style={{ fontSize: '0.85rem', color: '#0F172A' }}>{selectedPresetDetail.secondOrderImpact}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>CROSS-MARKET TRANSMISSION:</strong>
                  <span style={{ fontSize: '0.85rem', color: '#0F172A' }}>{selectedPresetDetail.crossMarketImpact}</span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>OPERATOR GUIDANCE:</strong>
                  <span style={{ fontSize: '0.85rem', color: '#0F172A' }}>{selectedPresetDetail.operatorNotes}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pagination Controls & Presets Grid */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filteredPresets.length / pageSize));
            const safePage = Math.min(Math.max(1, currentPage), totalPages);
            const startIdx = (safePage - 1) * pageSize;
            const endIdx = Math.min(startIdx + pageSize, filteredPresets.length);

            // Generate page window (e.g. 1..5 around safePage)
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
                className="glass card"
                style={{
                  padding: '12px 18px',
                  margin: position === 'top' ? '0 0 16px 0' : '20px 0 0 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              >
                {/* Left Telemetry */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-ink)' }}>
                    Showing {filteredPresets.length === 0 ? 0 : startIdx + 1}–{endIdx} of {filteredPresets.length} presets
                  </span>
                  <span style={{ color: 'var(--color-ink-3)' }}>•</span>
                  <span style={{ color: 'var(--color-ink-2)' }}>
                    Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                  </span>
                </div>

                {/* Right Pagination Buttons & Jump */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={safePage <= 1}
                    onClick={() => { setCurrentPage(1); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                    title="Jump to First Page (NEWS-001)"
                    style={{ fontWeight: 700, padding: '4px 8px', fontSize: '0.78rem' }}
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={safePage <= 1}
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                    style={{ fontWeight: 700, padding: '4px 8px', fontSize: '0.78rem' }}
                  >
                    ‹ Prev
                  </button>

                  {startPage > 1 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => { setCurrentPage(1); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                      >
                        1
                      </button>
                      {startPage > 2 && <span style={{ color: 'var(--color-ink-3)', padding: '0 2px' }}>…</span>}
                    </>
                  )}

                  {pageButtons.map(pg => (
                    <button
                      key={pg}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => { setCurrentPage(pg); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: pg === safePage ? 900 : 700,
                        backgroundColor: pg === safePage ? '#4F46E5' : 'transparent',
                        color: pg === safePage ? '#FFFFFF' : 'var(--color-ink)',
                        border: pg === safePage ? '1px solid #4F46E5' : '1px solid var(--color-border)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {pg}
                    </button>
                  ))}

                  {endPage < totalPages && (
                    <>
                      {endPage < totalPages - 1 && <span style={{ color: 'var(--color-ink-3)', padding: '0 2px' }}>…</span>}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={safePage >= totalPages}
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                    style={{ fontWeight: 700, padding: '4px 8px', fontSize: '0.78rem' }}
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={safePage >= totalPages}
                    onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                    title="Jump to Last Page (NEWS-500)"
                    style={{ fontWeight: 700, padding: '4px 8px', fontSize: '0.78rem' }}
                  >
                    Last »
                  </button>

                  {/* Jump directly to preset sequence # */}
                  <form onSubmit={handleJumpToSequence} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                    <input
                      type="text"
                      placeholder="Preset # (1-500)"
                      value={jumpSequence}
                      onChange={e => setJumpSequence(e.target.value)}
                      style={{
                        width: '110px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-sm btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.78rem', fontWeight: 800 }}
                    >
                      Go
                    </button>
                  </form>

                  {/* Page Size Selector */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      style={{ padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
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
              <>
                {renderPaginationBar('top')}

                {/* Presets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
                  {filteredPresets.slice(startIdx, startIdx + pageSize).map(p => {
                    const delta = p.impactParameters?.priceImpactPercent !== undefined ? p.impactParameters.priceImpactPercent : p.impactMagnitude;
                    const isPos = p.sentiment === 'Positive' || p.primaryDirection === 'BULLISH';
                    const isNeg = p.sentiment === 'Negative' || p.primaryDirection === 'BEARISH';

                    return (
                      <div
                        key={p.id}
                        className="glass card"
                        onClick={() => setSelectedPresetDetail(p)}
                        style={{
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          border: selectedPresetDetail?.id === p.id ? '2px solid #4F46E5' : '1px solid var(--color-border)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>
                              #{p.sequence} &bull; {p.presetId || p.id} &bull; <span style={{ color: p.scope === 'INDIA' ? '#065F3E' : '#4F46E5' }}>{p.scope}</span>
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isPos ? '#D1FAE5' : isNeg ? '#FEE2E2' : '#F1F5F9',
                              color: isPos ? '#065F46' : isNeg ? '#991B1B' : '#475569'
                            }}>
                              {delta > 0 ? '+' : ''}{delta}% {p.primaryDirection || p.sentiment}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--color-ink)', lineHeight: 1.3 }}>
                            {p.headline}
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', lineHeight: 1.35, margin: '0 0 10px' }}>
                            {p.description}
                          </p>

                          <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)', marginBottom: '10px' }}>
                            <strong>Target:</strong> {(p.affectedTickers || p.affectedSecurityIds || []).join(', ') || 'Macro / Sector'}
                            <span style={{ marginLeft: '10px', color: '#64748B' }}>Category: {p.category}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1, fontWeight: 800 }}
                            onClick={() => handleTriggerPreset(p)}
                            disabled={actionInProgress}
                          >
                            ⚡ Publish Now
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1 }}
                            onClick={() => setSelectedPresetDetail(p)}
                          >
                            🔍 Inspect Data
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPaginationBar('bottom')}
              </>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: REVIEW QUEUE                                   */}
      {/* ========================================================= */}
      {activeTab === 'review' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>
              Incoming Journalist Submissions Awaiting Clearance
            </h2>
            <button type="button" className="btn btn-sm btn-outline" onClick={fetchReviewQueue} disabled={isLoadingDrafts}>
              {isLoadingDrafts ? 'Refreshing...' : '🔄 Refresh Queue'}
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="glass card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
              No submitted drafts awaiting review in the queue.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {drafts.map(d => (
                <div key={d.id} className="glass card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.8rem', color: '#4F46E5' }}>{d.id}</span>
                      <Badge variant="outline">{d.category}</Badge>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)' }}>By: {d.author}</span>
                    </div>
                    <Badge variant={d.sentiment === 'Positive' ? 'success' : 'danger'}>
                      {d.sentiment} ({d.impactMagnitude}%)
                    </Badge>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>{d.headline}</h3>
                  <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--color-ink-2)' }}>{d.description}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleApproveDraft(d)}
                      disabled={actionInProgress}
                    >
                      ✓ Approve & Publish
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ color: '#DC2626', borderColor: '#DC2626' }}
                      onClick={() => setRejectModalDraft(d)}
                      disabled={actionInProgress}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: CUSTOM COMPOSER                                */}
      {/* ========================================================= */}
      {activeTab === 'composer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div className="glass card" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 16px', color: 'var(--color-ink)' }}>
              Institutional News Flash Composer
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Headline</label>
                <input
                  type="text"
                  placeholder="Official breaking headline..."
                  className="input-field"
                  value={compHeadline}
                  onChange={e => setCompHeadline(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Full Story Description</label>
                <textarea
                  placeholder="Provide comprehensive market story and rationale..."
                  className="input-field"
                  rows={4}
                  value={compDescription}
                  onChange={e => setCompDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Category</label>
                  <select
                    className="input-field"
                    value={compCategory}
                    onChange={e => setCompCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    {NEWS_PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Sentiment</label>
                  <select
                    className="input-field"
                    value={compSentiment}
                    onChange={e => setCompSentiment(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Positive">Positive (Bullish)</option>
                    <option value="Negative">Negative (Bearish)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Magnitude (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={compMagnitude}
                    onChange={e => setCompMagnitude(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>Target Ticker</label>
                  <input
                    type="text"
                    value={compTargetSec}
                    onChange={e => setCompTargetSec(e.target.value.toUpperCase())}
                    placeholder="e.g. TCS, INFY, RELIANCE"
                    className="input-field"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublishCustomNews}
                disabled={actionInProgress || !compHeadline.trim()}
                style={{ marginTop: '12px', fontWeight: 900 }}
              >
                ⚡ Publish Live Event
              </button>
            </div>
          </div>

          {/* Quick Previews */}
          <div className="glass card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px' }}>Impact Preview</h3>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>Primary Target:</span>
              <strong style={{ fontSize: '1.1rem', color: compSentiment === 'Positive' ? '#065F46' : '#991B1B' }}>
                {compTargetSec}: {compSentiment === 'Positive' ? '+' : '-'}{compMagnitude}%
              </strong>
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#64748B' }}>
                Peer Contagion: ~{parseFloat((parseFloat(compMagnitude) * 0.3).toFixed(2))}% across same sector.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: ACTIVE EVENTS & CORRECTIONS                    */}
      {/* ========================================================= */}
      {activeTab === 'active' && (
        <div>
          <div className="glass card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0 }}>
                  Active Decaying News Events & Telemetry
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  Events currently exerting transient sentiment pressure on exchange order books.
                </span>
              </div>
              <button type="button" className="btn btn-sm btn-outline" onClick={fetchActiveEvents}>
                🔄 Refresh Telemetry
              </button>
            </div>

            {activeEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
                No active transient news events currently exerting decay pressure.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-ink-2)' }}>
                      <th style={{ padding: '10px 12px' }}>Event ID</th>
                      <th style={{ padding: '10px 12px' }}>Headline</th>
                      <th style={{ padding: '10px 12px' }}>Target</th>
                      <th style={{ padding: '10px 12px' }}>Time Remaining</th>
                      <th style={{ padding: '10px 12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEvents.map(evt => (
                      <tr key={evt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="font-mono" style={{ padding: '12px', fontWeight: 700 }}>{evt.id}</td>
                        <td style={{ padding: '12px', fontWeight: 700, maxWidth: '350px' }}>{evt.headline}</td>
                        <td style={{ padding: '12px' }}>{evt.affectedSecurityIds?.join(', ') || 'Macro'}</td>
                        <td className="font-mono" style={{ padding: '12px', fontWeight: 800, color: '#4F46E5' }}>
                          {Math.floor(evt.remainingSeconds / 60)}m {evt.remainingSeconds % 60}s
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ color: '#DC2626', borderColor: '#DC2626' }}
                            onClick={() => handleDismissActiveEvent(evt.id)}
                          >
                            Dismiss
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: MORNING MARKET BULLETIN                        */}
      {/* ========================================================= */}
      {activeTab === 'morning' && (
        <div className="glass card" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ borderBottom: '2px solid var(--color-brass, #845508)', paddingBottom: '14px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '1px' }}>
              OFFICIAL SAAMX INTELLIGENCE FRAMEWORK
            </span>
            <h2 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '1.75rem', margin: '4px 0', color: '#1E232B', fontWeight: 900 }}>
              {MORNING_MARKET_BULLETIN.title}
            </h2>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: '#64748B', fontWeight: 700 }}>
              <span>{MORNING_MARKET_BULLETIN.edition}</span>
              &bull;
              <span>Timestamp: {MORNING_MARKET_BULLETIN.timestamp}</span>
              &bull;
              <span style={{ color: '#065F3E' }}>Setup Tone: {MORNING_MARKET_BULLETIN.marketSetupTone}</span>
            </div>
          </div>

          {/* Morning Deliberation Question */}
          <div style={{
            background: 'rgba(132, 85, 8, 0.08)',
            borderLeft: '4px solid var(--color-brass, #845508)',
            padding: '14px 18px',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-brass, #845508)', textTransform: 'uppercase' }}>
              THE MORNING DELIBERATION QUESTION:
            </span>
            <h3 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1E232B', fontStyle: 'italic' }}>
              {MORNING_MARKET_BULLETIN.morningQuestion.prompt}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              {MORNING_MARKET_BULLETIN.morningQuestion.subtext}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            {/* Global Overnight */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                🌐 {MORNING_MARKET_BULLETIN.globalOvernight.title}
              </h4>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>US:</strong> {MORNING_MARKET_BULLETIN.globalOvernight.usMarketDirection}</p>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Europe:</strong> {MORNING_MARKET_BULLETIN.globalOvernight.europeanMarketDirection}</p>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Asia:</strong> {MORNING_MARKET_BULLETIN.globalOvernight.asianMarketDirection}</p>
              <p style={{ fontSize: '0.85rem', margin: '0', color: '#065F3E', fontWeight: 700 }}><strong>Sentiment:</strong> {MORNING_MARKET_BULLETIN.globalOvernight.globalRiskSentiment}</p>
            </div>

            {/* India Setup */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                🇮🇳 {MORNING_MARKET_BULLETIN.india.title}
              </h4>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Setup:</strong> {MORNING_MARKET_BULLETIN.india.setup}</p>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>RBI & Rates:</strong> {MORNING_MARKET_BULLETIN.india.rbiLiquidityRates}</p>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Macro/PMI:</strong> {MORNING_MARKET_BULLETIN.india.inflationMacroData}</p>
              <p style={{ fontSize: '0.85rem', margin: '0', color: '#4F46E5', fontWeight: 700 }}><strong>Flows:</strong> {MORNING_MARKET_BULLETIN.india.institutionalFlows}</p>
            </div>

            {/* Corporate Catalysts */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                🏢 {MORNING_MARKET_BULLETIN.corporate.title}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                {MORNING_MARKET_BULLETIN.corporate.earningsHighlights.map((h, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{h}</li>
                ))}
              </ul>
            </div>

            {/* Commodities & Currencies */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                🛢️ Commodities & Currencies
              </h4>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Crude:</strong> {MORNING_MARKET_BULLETIN.commodities.crudeOil}</p>
              <p style={{ fontSize: '0.85rem', margin: '0 0 6px' }}><strong>Gold:</strong> {MORNING_MARKET_BULLETIN.commodities.goldPreciousMetals}</p>
              <p style={{ fontSize: '0.85rem', margin: '0', color: '#B45309', fontWeight: 700 }}><strong>FX Base:</strong> {MORNING_MARKET_BULLETIN.currency.inrBase}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: EVENING MARKET BULLETIN                        */}
      {/* ========================================================= */}
      {activeTab === 'evening' && (
        <div className="glass card" style={{ padding: '28px', background: '#FFFFFF' }}>
          {(() => {
            const ev = generateEveningBulletin(state);
            return (
              <div>
                <div style={{ borderBottom: '2px solid var(--color-brass, #845508)', paddingBottom: '14px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '1px' }}>
                    DYNAMIC CLOSING SYNTHESIS DERIVED FROM LIVE SAAMX TRADING
                  </span>
                  <h2 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '1.75rem', margin: '4px 0', color: '#1E232B', fontWeight: 900 }}>
                    {ev.title}
                  </h2>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                    {ev.sessionSummary}
                  </p>
                </div>

                {/* Closing Unresolved Question */}
                <div style={{
                  background: 'rgba(132, 85, 8, 0.08)',
                  borderLeft: '4px solid var(--color-brass, #845508)',
                  padding: '14px 18px',
                  borderRadius: '6px',
                  marginBottom: '24px'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-brass, #845508)', textTransform: 'uppercase' }}>
                    {ev.unresolvedQuestion.headline}:
                  </span>
                  <h3 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1E232B', fontStyle: 'italic' }}>
                    {ev.unresolvedQuestion.prompt}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                    {ev.unresolvedQuestion.subtext}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                  {/* Winner vs Loser */}
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#065F3E' }}>
                      🏆 Biggest Winner: {ev.biggestWinner.ticker} ({ev.biggestWinner.pctChange}%)
                    </h4>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 12px' }}>{ev.biggestWinner.reason}</p>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#991B1B' }}>
                      📉 Biggest Loser: {ev.biggestLoser.ticker} ({ev.biggestLoser.pctChange}%)
                    </h4>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>{ev.biggestLoser.reason}</p>
                  </div>

                  {/* Sectors & News */}
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      ⚡ Major News Catalyst
                    </h4>
                    <p style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 4px', color: '#4F46E5' }}>{ev.majorNewsEvent.headline}</p>
                    <p style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>{ev.majorNewsEvent.narrative}</p>

                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      🔄 Market Reversal Observation
                    </h4>
                    <p style={{ fontSize: '0.82rem', margin: 0 }}>{ev.marketReversal.observation}</p>
                  </div>

                  {/* Investor Behavior Patterns */}
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      🧠 Observed Investor Behavior
                    </h4>
                    {ev.investorBehaviour.map((b, i) => (
                      <div key={i} style={{ marginBottom: '8px', fontSize: '0.82rem' }}>
                        <strong style={{ color: 'var(--color-brass, #845508)' }}>&bull; {b.pattern}:</strong> {b.description}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: THE SAAMX MARKET HERALD (NEWSPAPER)            */}
      {/* ========================================================= */}
      {activeTab === 'newspaper' && (
        <div className="glass card" style={{ padding: '28px', background: '#FFFFFF' }}>
          <div style={{ textAlign: 'center', borderBottom: '3px double var(--color-brass, #845508)', paddingBottom: '16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {SAAMX_MARKET_HERALD.masthead.edition}
            </span>
            <h1 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '2.5rem', fontWeight: 900, margin: '6px 0', letterSpacing: '1px', color: '#1E232B' }}>
              {SAAMX_MARKET_HERALD.masthead.title}
            </h1>
            <span style={{ fontSize: '0.88rem', color: '#64748B', fontStyle: 'italic' }}>
              "{SAAMX_MARKET_HERALD.masthead.motto}" &bull; {SAAMX_MARKET_HERALD.masthead.dateString}
            </span>
          </div>

          {/* The Big Question Callout */}
          <div style={{
            background: 'var(--color-surface-sunken, #FAF8F3)',
            border: '2px solid var(--color-brass, #845508)',
            padding: '16px 22px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '28px'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-brass, #845508)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              THE BIG QUESTION:
            </span>
            <h2 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '1.6rem', margin: '6px 0', color: '#1E232B', fontWeight: 900 }}>
              {SAAMX_MARKET_HERALD.theBigQuestion.prompt}
            </h2>
            <p style={{ margin: '6px auto 0', fontSize: '0.92rem', color: '#475569', maxWidth: '800px', lineHeight: 1.45 }}>
              {SAAMX_MARKET_HERALD.theBigQuestion.narrative}
            </p>
          </div>

          {/* Securities to Watch — Editorial Lenses */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '1.35rem', fontWeight: 900, margin: '0 0 14px', color: '#1E232B', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '8px' }}>
              🔍 {SAAMX_MARKET_HERALD.securitiesToWatch.title}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              {SAAMX_MARKET_HERALD.securitiesToWatch.categories.map(cat => (
                <div key={cat.lens} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{cat.lens}</strong>
                    <Badge variant={cat.badgeColor}>{cat.lens}</Badge>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px', fontStyle: 'italic' }}>{cat.description}</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    {cat.securities.map(sec => (
                      <li key={sec.ticker} style={{ marginBottom: '6px' }}>
                        <strong style={{ color: '#4F46E5' }}>{sec.name} ({sec.ticker}):</strong> {sec.thesis}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Things Every Investor Should Watch */}
          <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontFamily: "var(--font-display, 'Cinzel', serif)", fontSize: '1.25rem', fontWeight: 900, margin: '0 0 14px', color: '#1E232B' }}>
              📌 {SAAMX_MARKET_HERALD.fiveThingsToWatch.title}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {SAAMX_MARKET_HERALD.fiveThingsToWatch.items.map(it => (
                <div key={it.number} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-brass, #845508)' }}>#{it.number}</span>
                  <strong style={{ display: 'block', fontSize: '0.95rem', margin: '2px 0 4px', color: '#0F172A' }}>{it.title}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{it.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE: DEBATE BANK (40 STRUCTURED TOPICS)             */}
      {/* ========================================================= */}
      {activeTab === 'debates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0 }}>
                Auditorium News Debate Bank (40 Topics)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                Structured intellectual foundation covering valuation, AI capex, banking NIMs, power grids, EVs, and macro decoupling.
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4F46E5' }}>
              21 India Topics &bull; 19 Global Topics
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {DEBATE_BANK.map((d, i) => (
              <div key={d.id} className="glass card" style={{ padding: '20px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={d.scope === 'INDIA' ? 'success' : 'primary'}>{d.scope}</Badge>
                    <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.75rem', color: '#4F46E5' }}>{d.id}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Category: {d.category}</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-brass, #845508)' }}>Target: {d.securityOrSector}</strong>
                </div>

                <h3 style={{ margin: '0 0 10px', fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                  {i + 1}. {d.topic}
                </h3>

                {/* Moderator Question */}
                <div style={{ background: 'rgba(132, 85, 8, 0.08)', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', borderLeft: '3px solid var(--color-brass, #845508)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brass, #845508)', textTransform: 'uppercase' }}>MODERATOR QUESTION:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 700, color: '#1E232B' }}>
                    "{d.moderatorQuestion}"
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: 'rgba(6, 95, 62, 0.06)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(6, 95, 62, 0.2)' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#065F3E', display: 'block', marginBottom: '4px' }}>🐂 BULL ARGUMENT:</strong>
                    <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#1E232B' }}>{d.bullArgument}</p>
                    <span style={{ fontSize: '0.75rem', color: '#065F3E', fontStyle: 'italic' }}>Evidence: {d.supportingEvidence}</span>
                  </div>

                  <div style={{ background: 'rgba(147, 25, 19, 0.06)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(147, 25, 19, 0.2)' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#991B1B', display: 'block', marginBottom: '4px' }}>🐻 BEAR ARGUMENT:</strong>
                    <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#1E232B' }}>{d.bearArgument}</p>
                    <span style={{ fontSize: '0.75rem', color: '#991B1B', fontStyle: 'italic' }}>Key Risk: {d.keyRisk}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Feedback Modal */}
      {rejectModalDraft && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '24px', background: '#FFFFFF' }}>
            <h3 style={{ margin: '0 0 12px' }}>Reject Draft {rejectModalDraft.id}</h3>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Provide constructive editorial feedback for the journalist..."
              value={rejectFeedback}
              onChange={e => setRejectFeedback(e.target.value)}
              style={{ width: '100%', marginBottom: '14px', padding: '8px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setRejectModalDraft(null)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }} onClick={handleRejectDraft}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
