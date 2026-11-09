import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  NEWS_PRESETS_LIBRARY,
  NEWS_PRESET_CATEGORIES,
  getPresetById,
  getPresetsByCategory,
  getPresetsBySearch,
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

export default function NewsControllerConsole({ state, adminPassword }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'presets' | 'composer' | 'active'

  // Workspace 1: Review Queue State
  const [drafts, setDrafts] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [rejectModalDraft, setRejectModalDraft] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Workspace 2: Preset Browser State
  const [presetCategory, setPresetCategory] = useState('All');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetSentiment, setPresetSentiment] = useState('All');
  const [presetPriority, setPresetPriority] = useState('All');
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Workspace 3: Custom Composer State with Live Keystroke Validation
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
        setActiveEvents(data.activeNews || []);
        setExpiredEvents(data.expiredNews || []);
      }
    } catch (err) {
      console.warn('Could not fetch active news:', err);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
    fetchActiveEvents();
    const interval = setInterval(() => {
      fetchActiveEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // WORKSPACE 1: REVIEW ACTIONS
  // -------------------------------------------------------------
  const handleApproveAndPublish = async (draftId) => {
    if (actionInProgress) return;
    setActionInProgress(true);
    try {
      // 1. Approve draft
      const reviewRes = await apiFetch('/api/news/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ draftId, action: 'APPROVE' })
      });
      if (!reviewRes.ok) throw new Error('Failed to approve draft.');

      // 2. Publish draft immediately
      const pubRes = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ draftId })
      });
      if (!pubRes.ok) throw new Error('Failed to publish approved draft.');

      alert('News draft approved and broadcasted live across trading floor!');
      fetchReviewQueue();
      fetchActiveEvents();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleOpenRejectModal = (draft) => {
    setRejectModalDraft(draft);
    setRejectFeedback('');
  };

  const handleConfirmReject = async () => {
    if (!rejectFeedback.trim()) {
      alert('Mandatory editorial feedback note required for rejection.');
      return;
    }
    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          draftId: rejectModalDraft.id,
          action: 'REJECT',
          feedback: rejectFeedback.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject draft.');
      }
      alert('Draft rejected and returned to journalist with editorial feedback.');
      setRejectModalDraft(null);
      fetchReviewQueue();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // -------------------------------------------------------------
  // WORKSPACE 2: PRESET TRIGGER
  // -------------------------------------------------------------
  const handleTriggerPreset = async (preset) => {
    if (actionInProgress) return;
    const confirm = window.confirm(`Trigger Preset Event Now?\n\n"${preset.headline}"\n\nImpact: ${preset.impactParameters.priceImpactPercent}% on ${preset.affectedAssets.securities.join(', ')}`);
    if (!confirm) return;

    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ triggerPresetId: preset.id })
      });
      if (!res.ok) throw new Error('Failed to broadcast preset event.');
      alert(`Preset ${preset.id} triggered successfully!`);
      fetchActiveEvents();
    } catch (err) {
      alert(`Preset error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCopyPresetToComposer = (preset) => {
    setCompHeadline(preset.headline);
    setCompDescription(preset.description);
    setCompCategory(preset.category);
    setCompSubcategory(preset.subcategory);
    setCompPriority(preset.priority);
    setCompSentiment(preset.sentiment);
    setCompMagnitude(String(Math.abs(preset.impactParameters.priceImpactPercent)));
    setCompClassification(preset.classification);
    setCompDuration(String(preset.duration || 5));
    if (preset.affectedAssets.securities.length > 0) {
      setCompTargetScope('Specific Asset');
      setCompTargetSec(preset.affectedAssets.securities[0]);
    } else if (preset.affectedAssets.sectors.length > 0) {
      setCompTargetScope('Whole Sector');
      setCompTargetSector(preset.affectedAssets.sectors[0]);
    }
    setActiveTab('composer');
  };

  // -------------------------------------------------------------
  // WORKSPACE 3: LIVE KEYSTROKE VALIDATION ENGINE
  // -------------------------------------------------------------
  const validationChecks = {
    headlineLen: compHeadline.trim().length >= 10 && compHeadline.trim().length <= 200,
    descLen: compDescription.trim().length >= 20 && compDescription.trim().length <= 1000,
    categoryValid: NEWS_PRESET_CATEGORIES.includes(compCategory),
    magnitudeValid: !isNaN(Number(compMagnitude)) && Number(compMagnitude) > 0 && Number(compMagnitude) <= 50,
    durationValid: !isNaN(Number(compDuration)) && Number(compDuration) >= 1 && Number(compDuration) <= 60,
    targetValid: compTargetScope === 'Specific Asset' ? Boolean(compTargetSec) :
                 compTargetScope === 'Whole Sector' ? true : Boolean(compTargetCurrency)
  };

  const isComposerSchemaValid = Object.values(validationChecks).every(Boolean);

  const handlePublishCustomNews = async (e) => {
    e.preventDefault();
    if (!isComposerSchemaValid || actionInProgress) return;

    setActionInProgress(true);
    let affectedSecurities = [];
    let affectedSectors = [];

    if (compTargetScope === 'Specific Asset' && compTargetSec) {
      affectedSecurities = [compTargetSec];
      const s = (state?.securities || []).find(sec => sec.id === compTargetSec || sec.ticker === compTargetSec);
      if (s?.sector) affectedSectors = [s.sector];
    } else if (compTargetScope === 'Whole Sector' && compTargetSector) {
      affectedSectors = [compTargetSector];
    }

    const customPayload = {
      id: `NEWS_CUSTOM_${Date.now()}`,
      headline: compHeadline.trim(),
      description: compDescription.trim(),
      category: compCategory,
      subcategory: compSubcategory,
      priority: compPriority,
      sentiment: compSentiment,
      impactMagnitude: Number(compMagnitude),
      affectedAssets: {
        securities: affectedSecurities,
        sectors: affectedSectors,
        currencies: [compTargetCurrency || 'INR']
      },
      eventType: 'CUSTOM_BROADCAST',
      classification: compClassification,
      impactParameters: {
        priceImpactPercent: (compSentiment === 'Positive' ? 1 : -1) * Number(compMagnitude),
        volatilityMultiplier: 1.4,
        demandShift: compSentiment === 'Positive' ? 35 : -35,
        tradingRestriction: Number(compMagnitude) >= 20 ? 'CIRCUIT_BREAKER_DOWN' : null,
        fxImpactPercent: 0.0,
        fxReserveDemand: 0
      },
      duration: Number(compDuration),
      expiryRules: { decayHalfLife: 90, autoRevert: true, revertFactor: 0.60 },
      correctionRules: { linkedRumourId: null, reversalFactor: 1.0, officialClarification: null },
      trainingEligibility: compTraining
    };

    try {
      const res = await apiFetch('/api/news/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ customPayload })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to broadcast custom news.');
      }
      alert('Custom bulletin validated and broadcasted live to trading floor!');
      setCompHeadline('');
      setCompDescription('');
      fetchActiveEvents();
      setActiveTab('active');
    } catch (err) {
      alert(`Publishing error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // -------------------------------------------------------------
  // WORKSPACE 4: CORRECTIONS & RETRACTION ENGINE
  // -------------------------------------------------------------
  const handleOpenCorrectionModal = (event) => {
    setCorrectionModalEvent(event);
    setCorrHeadline(`Clarification: ${event.headline.replace(/\[SIMULATION WIRE\]\s*/g, '')}`);
    setCorrDescription(`Official regulatory review confirms earlier reports regarding this event were premature. Price impacts are being cleanly unwound.`);
    setCorrReversalFactor(1.0);
  };

  const handleIssueCorrection = async () => {
    if (!correctionModalEvent || actionInProgress) return;
    setActionInProgress(true);

    try {
      const res = await apiFetch('/api/news/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({
          newsId: correctionModalEvent.id,
          correctionHeadline: corrHeadline.trim(),
          correctionDescription: corrDescription.trim(),
          reversalFactor: Number(corrReversalFactor)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to issue official correction.');
      }

      alert('Official retraction published! Market distortion cleanly unwound without mathematical drift.');
      setCorrectionModalEvent(null);
      fetchActiveEvents();
    } catch (err) {
      alert(`Correction error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDismissNews = async (item) => {
    if (!item || !item.id || actionInProgress) return;
    const confirm = window.confirm(`Dismiss news event ${item.id} from active displays?\n\n"${item.headline}"`);
    if (!confirm) return;

    setActionInProgress(true);
    try {
      const res = await apiFetch('/api/news/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FMS-Password': adminPassword },
        body: JSON.stringify({ newsId: item.id })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to dismiss news event.');
      }
      fetchActiveEvents();
    } catch (err) {
      alert(`Dismissal error: ${err.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Pre-filter presets for Workspace 2
  const filteredPresets = NEWS_PRESETS_LIBRARY.filter(preset => {
    if (presetCategory !== 'All' && preset.category !== presetCategory) return false;
    if (presetSentiment !== 'All' && preset.sentiment !== presetSentiment) return false;
    if (presetPriority !== 'All' && preset.priority !== presetPriority) return false;
    if (presetSearch) {
      const q = presetSearch.toLowerCase();
      const match = preset.headline.toLowerCase().includes(q) ||
                    preset.description.toLowerCase().includes(q) ||
                    preset.affectedAssets.securities.some(s => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 900, margin: 0, color: 'var(--color-ink)' }}>
              🎙️ News Controller Command Console
            </h1>
            <Badge variant="outline" style={{ background: '#4F46E5', color: '#FFF', fontWeight: 800 }}>PORTAL #10</Badge>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-ink-2)', fontSize: '0.9rem' }}>
            Centralized News Intelligence: Review queue, ~400 preset browser, live validation composer, and active telemetry.
          </p>
        </div>

        {/* Workspace Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-2)', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'review' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('review')}
            style={{ fontWeight: 700 }}
          >
            📥 Review Queue ({drafts.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'presets' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('presets')}
            style={{ fontWeight: 700 }}
          >
            📚 Presets Library (~400)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'composer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('composer')}
            style={{ fontWeight: 700 }}
          >
            ✏️ Custom Composer
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('active')}
            style={{ fontWeight: 700 }}
          >
            ⏱️ Active & Corrections ({activeEvents.length})
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* WORKSPACE 1: PENDING REVIEW QUEUE                         */}
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
            <div className="glass card" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--color-ink)' }}>Review Queue Clear</h3>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>No pending news drafts submitted by journalists right now.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '20px' }}>
              {drafts.map(draft => {
                const targetSec = (state?.securities || []).find(s => draft.affectedSecurityIds?.includes(s.ticker) || draft.affectedSecurityIds?.includes(s.id));
                const currentP = targetSec?.currentPrice || 100;
                const delta = (draft.sentiment === 'Positive' ? 1 : -1) * (draft.impactMagnitude || 0);
                const projectedP = parseFloat((currentP * (1 + delta / 100)).toFixed(2));
                const willHalt = Math.abs(delta) >= 20;

                return (
                  <div key={draft.id} className="glass card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Meta header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-2)' }}>
                          {draft.id} &bull; by {draft.submittedBy}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: draft.priority === 'CRITICAL' ? '#EF4444' : '#6B7280',
                            color: '#FFF'
                          }}>
                            {draft.priority}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: draft.sentiment === 'Positive' ? '#D1FAE5' : '#FEE2E2',
                            color: draft.sentiment === 'Positive' ? '#065F46' : '#991B1B'
                          }}>
                            {draft.sentiment}
                          </span>
                        </div>
                      </div>

                      {/* Headline & Description */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--color-ink)' }}>
                        {draft.headline}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', lineHeight: 1.4, margin: '0 0 16px' }}>
                        {draft.description}
                      </p>

                      {/* Pre-Flight Price Impact Preview Box */}
                      <div style={{
                        padding: '12px 14px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: willHalt ? '1px solid #EF4444' : '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                          <span>Pre-Flight Price Calculator:</span>
                          <span>Category: <strong>{draft.category}</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                          <span>Target: {draft.affectedSecurityIds?.join(', ') || draft.affectedSector || 'Macro'}</span>
                          <span className={delta >= 0 ? 'text-up' : 'text-down'}>
                            {currentP} &rarr; ₹{projectedP} ({delta >= 0 ? '+' : ''}{delta}%)
                          </span>
                        </div>
                        {willHalt && (
                          <div style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>
                            ⚠️ Extreme Shock: &ge; 20% impact will trigger automatic Circuit Breaker trading halt!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operator Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        style={{ flex: 2, fontWeight: 800 }}
                        onClick={() => handleApproveAndPublish(draft.id)}
                        disabled={actionInProgress}
                      >
                        ✓ Approve & Broadcast Live
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ flex: 1, color: '#DC2626', borderColor: '#FCA5A5' }}
                        onClick={() => handleOpenRejectModal(draft)}
                        disabled={actionInProgress}
                      >
                        ✕ Reject (Feedback)
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalDraft && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass card" style={{ background: '#FFF', padding: '24px', maxWidth: '520px', width: '90%', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#DC2626' }}>
              Reject News Draft: {rejectModalDraft.id}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-2)', margin: '0 0 16px' }}>
              Provide a clear, mandatory editorial feedback note to the journalist explaining why this draft was not approved (e.g. Unverified claims, extreme price distortion, redundant story):
            </p>
            <textarea
              className="input-field"
              rows={4}
              placeholder="e.g. Target magnitude is excessive without primary sourcing; please revise impact to under 8% and resubmit."
              value={rejectFeedback}
              onChange={e => setRejectFeedback(e.target.value)}
              style={{ width: '100%', marginBottom: '16px', padding: '10px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setRejectModalDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626' }}
                onClick={handleConfirmReject}
                disabled={actionInProgress || !rejectFeedback.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE 2: CURATED PRESETS BROWSER (~400 PRESETS)       */}
      {/* ========================================================= */}
      {activeTab === 'presets' && (
        <div>
          {/* Filters Bar */}
          <div className="glass card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              
              {/* Category Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Category Filter</label>
                <select
                  className="input-field"
                  value={presetCategory}
                  onChange={e => setPresetCategory(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px' }}
                >
                  <option value="All">All Categories (400 Presets)</option>
                  {NEWS_PRESET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Text Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Search Headline / Ticker</label>
                <input
                  type="text"
                  placeholder="e.g. TCS, Reliance, OPEC, RBI..."
                  className="input-field"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px' }}
                />
              </div>

              {/* Sentiment Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Sentiment</label>
                <select
                  className="input-field"
                  value={presetSentiment}
                  onChange={e => setPresetSentiment(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px' }}
                >
                  <option value="All">All Sentiments</option>
                  <option value="Positive">Positive (Bullish)</option>
                  <option value="Negative">Negative (Bearish)</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Priority Level</label>
                <select
                  className="input-field"
                  value={presetPriority}
                  onChange={e => setPresetPriority(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px' }}
                >
                  <option value="All">All Priorities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="BREAKING">BREAKING</option>
                  <option value="IMPORTANT">IMPORTANT</option>
                </select>
              </div>

            </div>
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
              Showing <strong>{filteredPresets.length}</strong> of {NEWS_PRESETS_LIBRARY.length} validated institutional presets.
            </div>
          </div>

          {/* Presets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
            {filteredPresets.slice(0, 50).map(p => {
              const delta = p.impactParameters.priceImpactPercent;
              return (
                <div key={p.id} className="glass card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-2)' }}>
                        {p.id} &bull; {p.category}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: delta >= 0 ? '#D1FAE5' : '#FEE2E2',
                        color: delta >= 0 ? '#065F46' : '#991B1B'
                      }}>
                        {delta >= 0 ? '+' : ''}{delta}% Impact
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--color-ink)' }}>
                      {p.headline}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', lineHeight: 1.35, margin: '0 0 12px' }}>
                      {p.description}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', marginBottom: '12px' }}>
                      <strong>Assets:</strong> {p.affectedAssets.securities.join(', ') || p.affectedAssets.sectors.join(', ') || 'Global'}
                      {p.correctionRules?.linkedRumourId && (
                        <span style={{ marginLeft: '8px', color: '#D97706', fontWeight: 700 }}>
                          🔗 Reverses {p.correctionRules.linkedRumourId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1, fontWeight: 800 }}
                      onClick={() => handleTriggerPreset(p)}
                      disabled={actionInProgress}
                    >
                      ⚡ Trigger Now
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => handleCopyPresetToComposer(p)}
                    >
                      📝 Copy to Composer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredPresets.length > 50 && (
            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>
              Displaying first 50 matches. Refine filters above to view specific presets.
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE 3: CUSTOM COMPOSER WITH LIVE SCHEMA VALIDATION   */}
      {/* ========================================================= */}
      {activeTab === 'composer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Composer Form */}
          <div className="glass card" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 16px', color: 'var(--color-ink)' }}>
              ✏️ Author Custom Market Bulletin
            </h2>

            <form onSubmit={handlePublishCustomNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Headline (10 - 200 chars)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter clear, institutional breaking market headline..."
                  value={compHeadline}
                  onChange={e => setCompHeadline(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Story Details & Financial Context (20 - 1000 chars)
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Enter context, financial metrics, balance sheet implications, or regulatory citations..."
                  value={compDescription}
                  onChange={e => setCompDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
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
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Priority</label>
                  <select
                    className="input-field"
                    value={compPriority}
                    onChange={e => setCompPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="CRITICAL">🔴 CRITICAL</option>
                    <option value="BREAKING">🟠 BREAKING</option>
                    <option value="IMPORTANT">🟡 IMPORTANT</option>
                    <option value="INFORMATION">⚪ INFORMATION</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Sentiment</label>
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

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Price Impact Magnitude (%) [Cap: 50%]</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    className="input-field"
                    value={compMagnitude}
                    onChange={e => setCompMagnitude(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="input-field"
                    value={compDuration}
                    onChange={e => setCompDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Classification</label>
                  <select
                    className="input-field"
                    value={compClassification}
                    onChange={e => setCompClassification(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="confirmed">Confirmed Fact</option>
                    <option value="rumour">Rumour (50% Uncertainty Dampener)</option>
                    <option value="speculative">Speculative Whisper</option>
                    <option value="macroeconomic">Macroeconomic Policy</option>
                  </select>
                </div>
              </div>

              {/* Target Scope */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Target Scope</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                  <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={compTargetScope === 'Specific Asset'} onChange={() => setCompTargetScope('Specific Asset')} /> Specific Stock
                  </label>
                  <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={compTargetScope === 'Whole Sector'} onChange={() => setCompTargetScope('Whole Sector')} /> Whole Sector
                  </label>
                  <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={compTargetScope === 'Currency Pair'} onChange={() => setCompTargetScope('Currency Pair')} /> FX Currency
                  </label>
                </div>

                {compTargetScope === 'Specific Asset' && (
                  <select
                    className="input-field"
                    value={compTargetSec}
                    onChange={e => setCompTargetSec(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    {(state?.securities || []).map(s => (
                      <option key={s.id || s.ticker} value={s.ticker || s.id}>
                        {s.ticker} &mdash; {s.name} ({s.sector})
                      </option>
                    ))}
                  </select>
                )}

                {compTargetScope === 'Whole Sector' && (
                  <select
                    className="input-field"
                    value={compTargetSector}
                    onChange={e => setCompTargetSector(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="">All Sectors (Global Broad Market)</option>
                    {[...new Set((state?.securities || []).map(s => s.sector))].filter(Boolean).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                {compTargetScope === 'Currency Pair' && (
                  <select
                    className="input-field"
                    value={compTargetCurrency}
                    onChange={e => setCompTargetCurrency(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="USD">USD/INR</option>
                    <option value="EUR">EUR/INR</option>
                    <option value="GBP">GBP/INR</option>
                    <option value="JPY">JPY/INR</option>
                    <option value="AED">AED/INR</option>
                  </select>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!isComposerSchemaValid || actionInProgress}
                className="btn btn-primary"
                style={{
                  padding: '14px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  opacity: isComposerSchemaValid ? 1 : 0.6,
                  cursor: isComposerSchemaValid ? 'pointer' : 'not-allowed'
                }}
              >
                {actionInProgress ? 'Broadcasting...' : '📢 Validate Schema & Broadcast Live Bulletin'}
              </button>

            </form>
          </div>

          {/* Right Rail: Interactive Keystroke Schema Checklist */}
          <div>
            <div className="glass card" style={{ padding: '20px', position: 'sticky', top: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', margin: '0 0 12px', color: 'var(--color-ink)' }}>
                🛡️ Live Schema Validation Engine
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', margin: '0 0 14px' }}>
                Strict pre-flight schema gates guarantee malformed news payloads cannot enter the matching engine.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.headlineLen ? '🟢' : '🔴'}</span>
                  <span style={{ color: validationChecks.headlineLen ? 'var(--color-ink)' : '#DC2626' }}>
                    Headline: {compHeadline.trim().length} / 200 chars (min 10)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.descLen ? '🟢' : '🔴'}</span>
                  <span style={{ color: validationChecks.descLen ? 'var(--color-ink)' : '#DC2626' }}>
                    Description: {compDescription.trim().length} / 1000 chars (min 20)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.categoryValid ? '🟢' : '🔴'}</span>
                  <span>Official 9-Category Schema: {compCategory ? 'OK' : 'Required'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.magnitudeValid ? '🟢' : '🔴'}</span>
                  <span style={{ color: validationChecks.magnitudeValid ? 'var(--color-ink)' : '#DC2626' }}>
                    Impact Bounded: 0.5% &le; {compMagnitude}% &le; 50%
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.durationValid ? '🟢' : '🔴'}</span>
                  <span>Duration: 1 &le; {compDuration}m &le; 60m</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{validationChecks.targetValid ? '🟢' : '🔴'}</span>
                  <span>Asset Scope Targeted</span>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: isComposerSchemaValid ? '#D1FAE5' : '#FEE2E2',
                color: isComposerSchemaValid ? '#065F46' : '#991B1B',
                fontWeight: 800,
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {isComposerSchemaValid ? '✓ 100% SCHEMA CHECKS PASSED' : '⚠️ RESOLVE HIGHLIGHTED ERRORS'}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE 4: ACTIVE EVENTS & OFFICIAL CORRECTIONS         */}
      {/* ========================================================= */}
      {activeTab === 'active' && (
        <div>
          {/* Active Events Table */}
          <div className="glass card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0, color: 'var(--color-ink)' }}>
                  Active Decaying News Events & Telemetry
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  Events currently exerting transient sentiment pressure. Half-life decay smoothly mean-reverts spikes to fundamental floor.
                </span>
              </div>
              <button type="button" className="btn btn-sm btn-outline" onClick={fetchActiveEvents}>
                🔄 Refresh Telemetry
              </button>
            </div>

            {activeEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
                No active transient news events in the decay pipeline right now.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-ink-2)' }}>
                      <th style={{ padding: '10px 12px' }}>Event ID</th>
                      <th style={{ padding: '10px 12px' }}>Headline</th>
                      <th style={{ padding: '10px 12px' }}>Category</th>
                      <th style={{ padding: '10px 12px' }}>Affected Assets</th>
                      <th style={{ padding: '10px 12px' }}>Time Remaining</th>
                      <th style={{ padding: '10px 12px' }}>Decay Telemetry</th>
                      <th style={{ padding: '10px 12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEvents.map(evt => {
                      const mins = Math.floor(evt.remainingSeconds / 60);
                      const secs = evt.remainingSeconds % 60;
                      return (
                        <tr key={evt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="font-mono" style={{ padding: '12px', fontWeight: 700 }}>
                            {evt.id}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, maxWidth: '300px' }}>
                            {evt.headline}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {evt.category}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {evt.affectedSecurityIds?.join(', ') || 'Macro'}
                          </td>
                          <td className="font-mono" style={{ padding: '12px', fontWeight: 800, color: '#4F46E5' }}>
                            ⏱️ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)' }}>
                              Decay multiplier: <strong>{(evt.decayMultiplier * 100).toFixed(0)}%</strong>
                            </span>
                          </td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ color: '#DC2626', borderColor: '#FCA5A5', fontWeight: 800 }}
                              onClick={() => handleOpenCorrectionModal(evt)}
                            >
                              🛑 Correct
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ color: '#475569', borderColor: '#CBD5E1', fontWeight: 700 }}
                              onClick={() => handleDismissNews(evt)}
                            >
                              ✕ Dismiss
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expired / Resolved Events Archive */}
          <div className="glass card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0 0 12px', color: 'var(--color-ink)' }}>
              Recent Expired & Retracted Events Archive
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {expiredEvents.length === 0 ? (
                <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>No expired events recorded.</div>
              ) : (
                expiredEvents.map(n => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: '6px', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600 }}>
                      {n.corrected ? '🛑 [CORRECTED] ' : '⌛ [RESOLVED] '}
                      {n.headline}
                    </span>
                    <span style={{ color: 'var(--color-ink-3)' }}>
                      {new Date(n.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Correction Modal */}
      {correctionModalEvent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass card" style={{ background: '#FFF', padding: '24px', maxWidth: '580px', width: '90%', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#DC2626' }}>
              Issue Official News Correction & Clean Unwind
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', margin: '0 0 16px' }}>
              Target: <strong>{correctionModalEvent.headline}</strong> ({correctionModalEvent.id})
            </p>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Correction Headline</label>
              <input
                type="text"
                className="input-field"
                value={corrHeadline}
                onChange={e => setCorrHeadline(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Clarification Notice</label>
              <textarea
                className="input-field"
                rows={3}
                value={corrDescription}
                onChange={e => setCorrDescription(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                Reversal Factor: <strong>{(corrReversalFactor * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.25"
                value={corrReversalFactor}
                onChange={e => setCorrReversalFactor(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                100% full unwind restores target security prices exactly to baseline using multiplicative inverse math.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setCorrectionModalEvent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626', fontWeight: 800 }}
                onClick={handleIssueCorrection}
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Unwinding...' : 'Confirm & Unwind Distortion'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
