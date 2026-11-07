import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import NewsAnchorConsole from './NewsAnchorConsole.jsx';
import { NEWS_PRESET_CATEGORIES } from '../lib/newsPresetsLibrary.js';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SectionHeader,
  Badge,
  Alert,
  EmptyState
} from '../components/ui/index.js';

export default function JournalistPage({ state, adminPassword, initialMode = 'draft' }) {
  const [activeMode, setActiveMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('tab=anchor') || hash.includes('#/anchor') || hash.includes('#/news-anchor')) {
        return 'anchor';
      }
      if (hash.includes('tab=history') || hash.includes('#/draft-history')) {
        return 'history';
      }
    }
    return initialMode;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeSimTag, setIncludeSimTag] = useState(true);

  // Draft form fields
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(NEWS_PRESET_CATEGORIES[0] || 'Corporate earnings');
  const [subcategory, setSubcategory] = useState('QUARTERLY_RESULTS');
  const [priority, setPriority] = useState('IMPORTANT');
  const [sentiment, setSentiment] = useState('Positive');
  const [impactMagnitude, setImpactMagnitude] = useState('8.0');
  const [targetScope, setTargetScope] = useState('Specific Asset');
  const [targetSecId, setTargetSecId] = useState('TCS');
  const [targetSector, setTargetSector] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('INR');
  const [classification, setClassification] = useState('confirmed');
  const [durationMinutes, setDurationMinutes] = useState('5');
  const [trainingEligibility, setTrainingEligibility] = useState(false);

  // Local drafts list synced with state
  const [drafts, setDrafts] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null);

  const fetchDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const res = await apiFetch('/api/news/drafts');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (err) {
      console.warn('Could not fetch drafts from server:', err);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [state?.newsDrafts]);

  const handleSubmitDraft = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!headline.trim()) {
      alert('Headline is required.');
      return;
    }
    if (!description.trim()) {
      alert('Description is required.');
      return;
    }

    const rawHeadline = headline.trim();
    const finalHeadline = (includeSimTag && !rawHeadline.startsWith('[SIMULATION'))
      ? `[SIMULATION WIRE] ${rawHeadline}`
      : rawHeadline;

    setIsSubmitting(true);
    setSubmitSuccessMsg(null);

    let affectedSecurities = [];
    let affectedSectors = [];

    if (targetScope === 'Specific Asset' && targetSecId) {
      affectedSecurities = [targetSecId];
      const secObj = (state?.securities || []).find(s => s.id === targetSecId || s.ticker === targetSecId);
      if (secObj?.sector) affectedSectors = [secObj.sector];
    } else if (targetScope === 'Whole Sector' && targetSector) {
      affectedSectors = [targetSector];
    }

    const draftPayload = {
      headline: finalHeadline,
      description: description.trim(),
      category,
      subcategory,
      priority,
      sentiment,
      impactMagnitude: Number(impactMagnitude) || 5,
      affectedSecurityIds: affectedSecurities,
      affectedSector: affectedSectors[0] || null,
      affectedSectors,
      affectedCurrencies: [targetCurrency || 'INR'],
      eventType: 'JOURNALIST_WIRE_DRAFT',
      classification,
      durationMinutes: Number(durationMinutes) || 5,
      decayType: 'exponential',
      trainingEligibility,
      authorUsername: 'journalist'
    };

    try {
      const res = await apiFetch('/api/news/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(draftPayload)
      });

      if (res.ok) {
        const data = await res.json();
        setHeadline('');
        setDescription('');
        setSubmitSuccessMsg(`Draft ${data.draft?.id || ''} submitted successfully! Awaiting News Controller review.`);
        fetchDrafts();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit draft.');
      }
    } catch (err) {
      alert('Draft submission failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishedNews = state?.newsEvents || [];
  const activeDraftsList = (drafts.length > 0 ? drafts : state?.newsDrafts) || [];

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--color-ink)' }}>
              📰 Journalist Console & Press Room
            </h1>
            <Badge variant="outline">PORTAL #9</Badge>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-ink-2)', fontSize: '0.88rem' }}>
            Two-Phase Editorial Pipeline: Compose drafts for News Controller clearance before live broadcast.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'draft' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveMode('draft')}
          >
            ✍️ Draft Composer
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveMode('history'); fetchDrafts(); }}
          >
            📋 Draft Clearance ({activeDraftsList.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'anchor' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveMode('anchor')}
          >
            🎙️ Anchor Teleprompter
          </button>
        </div>
      </div>

      {/* Mode 1: News Anchor Teleprompter Mode */}
      {activeMode === 'anchor' && (
        <NewsAnchorConsole state={state} />
      )}

      {/* Mode 2: Draft Clearance History */}
      {activeMode === 'history' && (
        <div className="glass card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0, color: 'var(--color-ink)' }}>
                Editorial Draft Submissions & Review Status
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                Track approval status and reviewer feedback notes from the News Controller.
              </span>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={fetchDrafts} disabled={isLoadingDrafts}>
              {isLoadingDrafts ? 'Refreshing...' : '🔄 Refresh Queue'}
            </button>
          </div>

          {activeDraftsList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
              <p style={{ fontSize: '1rem', margin: 0 }}>No drafts submitted yet.</p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ marginTop: '12px' }}
                onClick={() => setActiveMode('draft')}
              >
                Create First Draft
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-ink-2)' }}>
                    <th style={{ padding: '10px 12px' }}>Ticket</th>
                    <th style={{ padding: '10px 12px' }}>Timestamp</th>
                    <th style={{ padding: '10px 12px' }}>Headline & Story</th>
                    <th style={{ padding: '10px 12px' }}>Category</th>
                    <th style={{ padding: '10px 12px' }}>Priority</th>
                    <th style={{ padding: '10px 12px' }}>Sentiment</th>
                    <th style={{ padding: '10px 12px' }}>Impact</th>
                    <th style={{ padding: '10px 12px' }}>Clearance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDraftsList.map(draft => {
                    const statusColors = {
                      SUBMITTED: { bg: '#FEF3C7', color: '#B45309', label: '⏳ SUBMITTED (In Review)' },
                      APPROVED: { bg: '#DBEAFE', color: '#1D4ED8', label: '✓ APPROVED (Pending Broadcast)' },
                      REJECTED: { bg: '#FEE2E2', color: '#B91C1C', label: '✕ REJECTED' },
                      PUBLISHED: { bg: '#D1FAE5', color: '#047857', label: '🚀 PUBLISHED LIVE' }
                    };
                    const s = statusColors[draft.status] || { bg: '#F3F4F6', color: '#4B5563', label: draft.status };

                    return (
                      <tr key={draft.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td className="font-mono" style={{ padding: '12px', fontWeight: 700, fontSize: '0.78rem' }}>
                          {draft.id}
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--color-ink-2)' }}>
                          {draft.submittedAt ? new Date(draft.submittedAt).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px', maxWidth: '350px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                            {draft.headline}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', lineHeight: 1.3 }}>
                            {draft.description}
                          </div>

                          {/* Rejection Feedback Note Callout */}
                          {draft.status === 'REJECTED' && draft.rejectionReason && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px 12px',
                              background: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              borderRadius: '6px',
                              color: '#991B1B',
                              fontSize: '0.78rem'
                            }}>
                              <strong>Editorial Feedback:</strong> {draft.rejectionReason}
                              {draft.reviewedBy && <span style={{ marginLeft: '6px', opacity: 0.8 }}>({draft.reviewedBy})</span>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{draft.category}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
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
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={draft.sentiment === 'Positive' ? 'text-up' : draft.sentiment === 'Negative' ? 'text-down' : ''} style={{ fontWeight: 700 }}>
                            {draft.sentiment}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700 }}>
                          ±{draft.impactMagnitude}%
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            background: s.bg,
                            color: s.color
                          }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Draft Composer */}
      {activeMode === 'draft' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(500px, 2fr) 1fr', gap: '24px' }}>
          
          {/* Main Draft Composer Form */}
          <div className="glass card" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 16px', color: 'var(--color-ink)' }}>
              ✍️ Compose News Draft for Clearance
            </h2>

            {submitSuccessMsg && (
              <div style={{ padding: '12px 16px', background: '#D1FAE5', border: '1px solid #10B981', color: '#065F46', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                {submitSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSubmitDraft} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Simulation Wire Prefix Option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="includeSimTag"
                  checked={includeSimTag}
                  onChange={e => setIncludeSimTag(e.target.checked)}
                />
                <label htmlFor="includeSimTag" style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                  Auto-prefix headline with <code>[SIMULATION WIRE]</code>
                </label>
              </div>

              {/* Headline Input */}
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Headline Bulletin <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. TCS Secures $1.8B Multi-Year Cloud Modernization Pact with EU Banking Consortium"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.95rem' }}
                  required
                />
              </div>

              {/* Description Input */}
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Story Details & Context <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  placeholder="Provide institutional background, expected revenue or margin impact, key contract milestones, or regulatory context..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Grid: Category, Priority, Sentiment, Impact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                
                {/* Category (9 Official Categories) */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Category</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    {NEWS_PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Subcategory Tag</label>
                  <input
                    type="text"
                    className="input-field"
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  />
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Priority</label>
                  <select
                    className="input-field"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="CRITICAL">🔴 CRITICAL</option>
                    <option value="BREAKING">🟠 BREAKING</option>
                    <option value="IMPORTANT">🟡 IMPORTANT</option>
                    <option value="INFORMATION">⚪ INFORMATION</option>
                  </select>
                </div>

                {/* Sentiment */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Sentiment Direction</label>
                  <select
                    className="input-field"
                    value={sentiment}
                    onChange={e => setSentiment(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="Positive">Bullish (Positive Price Action)</option>
                    <option value="Negative">Bearish (Negative Price Action)</option>
                    <option value="Neutral">Neutral (Informational)</option>
                  </select>
                </div>

                {/* Magnitude */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Est. Magnitude (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    className="input-field"
                    value={impactMagnitude}
                    onChange={e => setImpactMagnitude(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  />
                </div>

                {/* Duration */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Active Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="input-field"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  />
                </div>

                {/* Classification */}
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Classification</label>
                  <select
                    className="input-field"
                    value={classification}
                    onChange={e => setClassification(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="confirmed">Confirmed Fact</option>
                    <option value="rumour">Unverified Rumour</option>
                    <option value="speculative">Market Speculation</option>
                    <option value="macroeconomic">Macroeconomic Benchmark</option>
                  </select>
                </div>

              </div>

              {/* Target Asset Scope */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                  Target Asset Scope
                </label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={targetScope === 'Specific Asset'} onChange={() => setTargetScope('Specific Asset')} /> Specific Security
                  </label>
                  <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={targetScope === 'Whole Sector'} onChange={() => setTargetScope('Whole Sector')} /> Whole Sector
                  </label>
                  <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" checked={targetScope === 'Currency Pair'} onChange={() => setTargetScope('Currency Pair')} /> FX Currency Pair
                  </label>
                </div>

                {targetScope === 'Specific Asset' && (
                  <select
                    className="input-field"
                    value={targetSecId}
                    onChange={e => setTargetSecId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="">Select Target Security...</option>
                    {(state?.securities || []).map(s => (
                      <option key={s.id || s.ticker} value={s.ticker || s.id}>
                        {s.ticker} &mdash; {s.name} ({s.sector || 'Equities'})
                      </option>
                    ))}
                  </select>
                )}

                {targetScope === 'Whole Sector' && (
                  <select
                    className="input-field"
                    value={targetSector}
                    onChange={e => setTargetSector(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="">All Sectors (Broad Market)</option>
                    {[...new Set((state?.securities || []).map(s => s.sector))].filter(Boolean).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                {targetScope === 'Currency Pair' && (
                  <select
                    className="input-field"
                    value={targetCurrency}
                    onChange={e => setTargetCurrency(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px' }}
                  >
                    <option value="USD">USD/INR (US Dollar)</option>
                    <option value="EUR">EUR/INR (Euro)</option>
                    <option value="GBP">GBP/INR (British Pound)</option>
                    <option value="JPY">JPY/INR (Japanese Yen)</option>
                    <option value="AED">AED/INR (UAE Dirham)</option>
                  </select>
                )}
              </div>

              {/* Training Isolation Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                <input
                  type="checkbox"
                  id="trainingEligibility"
                  checked={trainingEligibility}
                  onChange={e => setTrainingEligibility(e.target.checked)}
                />
                <label htmlFor="trainingEligibility" style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                  Training Sandbox Eligible (can be triggered in isolated simulation drills)
                </label>
              </div>

              {/* Submit Draft Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  marginTop: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Submitting to Editorial Desk...' : '📤 Submit Draft to News Controller Queue'}
              </button>

            </form>
          </div>

          {/* Right Rail: Editorial Guidelines & Published Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Editorial Clearance Rules */}
            <div className="glass card" style={{ padding: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: '0 0 10px', color: 'var(--color-ink)' }}>
                🛡️ Newsroom Editorial Policy
              </h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                <li><strong>No Direct Publishing:</strong> All articles must pass editorial review by the News Controller to ensure floor integrity.</li>
                <li><strong>Cap on Volatility:</strong> Single-event price impacts above ±20% trigger mandatory circuit halts.</li>
                <li><strong>Rumour Discipline:</strong> Unconfirmed rumors carry a 50% uncertainty dampener until officially confirmed or debunked.</li>
                <li><strong>Audit Accountability:</strong> Every submission logs author staff identity to durable PostgreSQL audit records.</li>
              </ul>
            </div>

            {/* Live Published Wire Stream */}
            <div className="glass card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0, color: 'var(--color-ink)' }}>
                  📡 Broadcasted Wire Stream
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>{publishedNews.length} Live</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {publishedNews.length === 0 ? (
                  <div style={{ color: 'var(--color-ink-3)', fontSize: '0.82rem', textAlign: 'center', padding: '16px' }}>
                    No bulletins broadcasted yet.
                  </div>
                ) : (
                  publishedNews.map(news => (
                    <div key={news.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <span className={news.sentiment === 'Positive' ? 'text-up' : news.sentiment === 'Negative' ? 'text-down' : ''} style={{ fontWeight: 800 }}>
                          {news.headline}
                        </span>
                        <span className="font-mono tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--color-ink-3)', marginLeft: '6px' }}>
                          {new Date(news.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-ink-2)', fontSize: '0.75rem', lineHeight: 1.25 }}>
                        {news.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
