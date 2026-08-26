import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { NEWS_PRESETS } from '../lib/newsPresets.js';

export default function JournalistPage({ state, adminPassword }) {
  // Preset news sequence player logic
  const currentNewsStep = state?.settings?.currentNewsStep || 1;

  const handleBroadcastStep = async (stepNum) => {
    const preset = NEWS_PRESETS.find(p => p.step === stepNum);
    if (!preset) {
      alert("Invalid step number or end of sequence reached.");
      return;
    }

    const confirmSend = window.confirm(`Broadcast Step ${stepNum} news to exchange?\n\n"${preset.headline}"`);
    if (!confirmSend) return;

    try {
      // 1. Dispatch news event via standard endpoint
      const resNews = await apiFetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          headline: preset.headline,
          description: preset.description,
          affectedSecurityIds: preset.affectedSecurityIds || [],
          affectedSector: preset.affectedSector || null,
          sentiment: preset.sentiment || 'Neutral',
          impactPercent: preset.impactPercent || 0,
          category: preset.category || 'Macro'
        })
      });

      if (!resNews.ok) {
        throw new Error("Failed to dispatch news bulletin.");
      }

      // 2. Increment step count in Firebase settings
      const nextStep = stepNum + 1;
      const currentSettings = state.settings || {};
      const resSettings = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            currentNewsStep: nextStep
          }
        })
      });

      if (!resSettings.ok) {
        throw new Error("News dispatched, but failed to update step counter in settings.");
      }

      alert(`Step ${stepNum} news broadcasted successfully! Next step is Step ${nextStep}.`);
    } catch (err) {
      alert(`Error broadcasting step: ${err.message}`);
    }
  };

  const handleResetStep = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset the news sequence back to Step 1?");
    if (!confirmReset) return;

    try {
      const currentSettings = state.settings || {};
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            currentNewsStep: 1
          }
        })
      });
      if (res.ok) {
        alert("News sequence reset to Step 1 successfully.");
      }
    } catch (err) {
      alert("Failed to reset news step: " + err.message);
    }
  };
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [sentiment, setSentiment] = useState('Positive');
  const [impactPct, setImpactPct] = useState('10');
  const [category, setCategory] = useState('Macro');
  const [targetScope, setTargetScope] = useState('Whole Sector');
  const [targetSector, setTargetSector] = useState('');
  const [targetSecId, setTargetSecId] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!headline.trim()) {
      alert('Headline is required.');
      return;
    }

    const payload = {
      headline,
      description,
      sentiment,
      impactPercent: Number(impactPct) || 0,
      category,
      affectedSector: targetScope === 'Whole Sector' && targetSector ? targetSector : null,
      affectedSecurityIds: targetScope === 'Specific Asset' && targetSecId ? [targetSecId] : []
    };

    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setHeadline('');
        setDescription('');
        setTargetSecId('');
        setImpactPct('10');
        alert('News Bulletin Published & Broadcasted Live!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch news.');
      }
    } catch (err) {
      alert('Publishing failed: ' + err.message);
    }
  };

  const handleApplyTemplate = (tpl) => {
    setHeadline(tpl.headline);
    setDescription(tpl.description || '');
    setSentiment(tpl.sentiment);
    setImpactPct(String(tpl.impactPercent));
    setCategory(tpl.category || 'Policy');

    if (tpl.affectedSector) {
      setTargetScope('Whole Sector');
      setTargetSector(tpl.affectedSector);
    } else if (tpl.tickerMatch) {
      const sec = state.securities.find(s => s.ticker === tpl.tickerMatch);
      if (sec) {
        setTargetScope('Specific Asset');
        setTargetSecId(sec.id);
      }
    } else {
      setTargetScope('Whole Sector');
      setTargetSector('');
    }
  };

  // Staged news templates for quick-select
  const PRE_GENERATED_NEWS = [
    {
      headline: "INF & TCS Evaluate Blockbuster Cloud Infrastructure Merger",
      description: "Industry rumors suggest India's top software services exporters are discussing a joint venture in sovereign AI compute cloud services.",
      sentiment: "Positive",
      impactPercent: 8,
      category: "Merger",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "Union Budget Proposes 18% Tariff Hike on Imported GPU & AI Accelerators",
      description: "Finance Ministry tables proposal to raise customs duties on advanced microchips to encourage domestic fab development.",
      sentiment: "Negative",
      impactPercent: 12,
      category: "Policy",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "Foreign Institutional Investors Inflow Hits Record High in Tech Sector",
      description: "Block deals in tech conglomerates drive major indices up. Global wealth funds cite low valuation and strong tailwinds.",
      sentiment: "Positive",
      impactPercent: 10,
      category: "Macro",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "RBI Announces Surprise Repo Rate Cut of 25 Basis Points",
      description: "Monetary Policy Committee moves to ease interest rates as inflation cools down to 3.2% year-on-year.",
      sentiment: "Positive",
      impactPercent: 6,
      category: "Policy",
      targetScope: "Whole Sector",
      targetSector: ""
    },
    {
      headline: "Tech Volatility Spike: SEBI Surveillance Desk Flags High-Frequency Speculation",
      description: "Regulator advises brokerages to increase margin requirements on volatile tech listings citing excessive retail leverage.",
      sentiment: "Negative",
      impactPercent: 8,
      category: "Policy",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "Retail Investors FOMO Peak: Daily Signup Volume Reaches 5-Year High",
      description: "Major domestic brokers report server latency due to massive retail order volumes rushing into AI and fintech assets.",
      sentiment: "Positive",
      impactPercent: 7,
      category: "Macro",
      targetScope: "Whole Sector",
      targetSector: ""
    },
    {
      headline: "Tata Sons Evaluates Minority Strategic Stake in Staged Tech IPOs",
      description: "Whispers from Bombay House suggest evaluation of upcoming startup subscription filings to expand digital portfolio.",
      sentiment: "Positive",
      impactPercent: 15,
      category: "Merger",
      targetScope: "Whole Sector",
      targetSector: "Fintech / Technology"
    },
    {
      headline: "Major Computing Firms Face Liquidity Squeeze Amid Elevated Bond Yields",
      description: "Debt-heavy technology and compute startups struggle to refinance short-term debt instruments.",
      sentiment: "Negative",
      impactPercent: 14,
      category: "Earnings",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "Global Chip Shortage Threatens Local AI Deployments",
      description: "Supply chain blockages delay local server deployments for leading technology enterprises by 6 months.",
      sentiment: "Negative",
      impactPercent: 11,
      category: "Disaster",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    },
    {
      headline: "Tech Index Technical Breakout: Indices Break Historic Resistance Levels",
      description: "Chartists indicate strong momentum and support levels as indices surge past previous record highs.",
      sentiment: "Positive",
      impactPercent: 5,
      category: "Macro",
      targetScope: "Whole Sector",
      targetSector: "Technology"
    }
  ];

  const handleQuickPublish = async (tpl) => {
    let targetSectorName = null;
    let targetSecIdVal = [];

    if (tpl.targetScope === 'Whole Sector' && tpl.targetSector) {
      targetSectorName = tpl.targetSector;
    } else if (tpl.targetScope === 'Specific Asset') {
      const match = state.securities.find(s => s.ticker === tpl.targetSecId);
      if (match) targetSecIdVal = [match.id];
    }

    const payload = {
      headline: tpl.headline,
      description: tpl.description || '',
      sentiment: tpl.sentiment,
      impactPercent: tpl.impactPercent,
      category: tpl.category || 'Policy',
      affectedSector: targetSectorName,
      affectedSecurityIds: targetSecIdVal
    };

    try {
      const res = await apiFetch('/api/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-FMS-Password': adminPassword
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('News Bulletin Broadcasted Live!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch news.');
      }
    } catch (err) {
      alert('Publishing failed: ' + err.message);
    }
  };

  const templateCategories = ['All', 'Earnings', 'Policy', 'Merger', 'Macro', 'Disaster'];
  
  const filteredTemplates = PRE_GENERATED_NEWS.filter(n => {
    if (selectedCategoryTab === 'All') return true;
    return n.category === selectedCategoryTab;
  });

  const publishedNews = [...state.newsEvents]
    .filter(n => n.triggeredAt)
    .sort((a, b) => b.triggeredAt - a.triggeredAt);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '12px' }}>
      
      {/* Column 1: News Bulletin Composer */}
      <div className="glass card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-ink)' }}>Newsroom Bulletin Editor</h2>
            <p style={{ color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>Draft and broadcast market intelligence wire dispatches</p>
          </div>
          <span className="badge badge-public" style={{ backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }}>PRESS WIRE</span>
        </div>

        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Headline Bulletin</label>
            <input
              type="text"
              className="input-field"
              required
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. TCRP Announces Breakthrough AI Chip Core"
            />
          </div>

          <div className="form-group">
            <label>Supporting Story Description</label>
            <textarea
              className="input-field"
              rows="4"
              style={{ resize: 'none' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide context on product releases, regulatory actions, or macro trends..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Sentiment</label>
              <select className="input-field" value={sentiment} onChange={e => setSentiment(e.target.value)}>
                <option value="Positive">Positive (Bullish)</option>
                <option value="Negative">Negative (Bearish)</option>
                <option value="Neutral">Neutral (Flat)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price Impact (%)</label>
              <input
                type="number"
                className="input-field font-data"
                value={impactPct}
                onChange={e => setImpactPct(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Earnings">Earnings</option>
                <option value="Policy">Policy</option>
                <option value="Scandal">Scandal</option>
                <option value="Merger">Merger</option>
                <option value="Product">Product</option>
                <option value="Macro">Macro</option>
                <option value="Disaster">Disaster</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink-2)', marginBottom: '8px' }}>Target Asset Scope</label>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="radio" checked={targetScope === 'Whole Sector'} onChange={() => setTargetScope('Whole Sector')} /> Whole Sector
              </label>
              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="radio" checked={targetScope === 'Specific Asset'} onChange={() => setTargetScope('Specific Asset')} /> Specific Asset
              </label>
            </div>

            {targetScope === 'Whole Sector' ? (
              <select className="input-field" value={targetSector} onChange={e => setTargetSector(e.target.value)}>
                <option value="">All Sectors (Global Market Impact)</option>
                {[...new Set(state.securities.map(s => s.sector))].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <select className="input-field" value={targetSecId} onChange={e => setTargetSecId(e.target.value)}>
                <option value="">Select Target Security...</option>
                {state.securities.map(s => (
                  <option key={s.id} value={s.id}>{s.ticker} &mdash; {s.name}</option>
                ))}
              </select>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontWeight: 700 }}>
            ⚡ PUBLISH WIRE BULLETIN
          </button>
        </form>
      </div>

      {/* Column 2: News Templates & Live Wire Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Templates Panel */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem' }}>
            Quick-Select Templates
          </h3>
          
          {/* Categories Tab Selector */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
            {templateCategories.map(cat => (
              <button
                key={cat}
                type="button"
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  backgroundColor: selectedCategoryTab === cat ? 'var(--color-brass-light)' : 'transparent',
                  color: selectedCategoryTab === cat ? 'var(--color-brass)' : 'var(--color-ink-2)',
                  border: 'none',
                  borderRadius: '4px'
                }}
                onClick={() => setSelectedCategoryTab(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {filteredTemplates.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', marginTop: '16px' }}>No templates in this category.</div>
            ) : (
              filteredTemplates.map((tpl, idx) => (
                <div
                  key={idx}
                  className="glass"
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-l1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={tpl.sentiment === 'Positive' ? 'text-up' : tpl.sentiment === 'Negative' ? 'text-down' : 'text-brass'} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {tpl.headline}
                    </span>
                    <span className="badge badge-public" style={{ fontSize: '0.6rem' }}>{tpl.category}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                    Impact: {tpl.sentiment === 'Positive' ? '+' : '-'}{tpl.impactPercent}% &bull; Target: {tpl.targetSector || 'Global'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleApplyTemplate(tpl)}>
                      📝 Draft
                    </button>
                    <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)', border: 'none' }} onClick={() => handleQuickPublish(tpl)}>
                      🚀 Send Live
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel: SAAMX Event Scenario Sequence Player */}
        {(() => {
          const currentPreset = NEWS_PRESETS.find(p => p.step === currentNewsStep) || null;
          return (
            <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1.5px solid var(--color-brass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.25rem', margin: 0 }}>
                  🎭 SAAMX Event Scenario Wire
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onClick={handleResetStep}
                >
                  ⏪ Reset to Step 1
                </button>
              </div>

              {currentPreset ? (
                <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-brass)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-brass)' }}>
                      ▶ NEXT NEWS: STEP {currentNewsStep} / {NEWS_PRESETS.length}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: currentPreset.sentiment === 'Positive' ? 'var(--color-rise-light)' : currentPreset.sentiment === 'Negative' ? 'var(--color-fall-light)' : 'var(--color-border)',
                      color: currentPreset.sentiment === 'Positive' ? 'var(--color-rise)' : currentPreset.sentiment === 'Negative' ? 'var(--color-fall)' : 'var(--color-ink-2)'
                    }}>
                      {currentPreset.sentiment} ({currentPreset.impactPercent > 0 ? `+${currentPreset.impactPercent}%` : `${currentPreset.impactPercent}%`})
                    </span>
                  </div>

                  <strong style={{ color: 'var(--color-ink)', fontSize: '1.05rem', display: 'block' }}>
                    {currentPreset.headline}
                  </strong>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                    {currentPreset.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-ink-2)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '4px' }}>
                    <span><strong>Sector:</strong> {currentPreset.affectedSector || 'Macro / Universal'}</span>
                    {currentPreset.affectedSecurityIds && currentPreset.affectedSecurityIds.length > 0 && (
                      <span><strong>Targets:</strong> {currentPreset.affectedSecurityIds.join(', ')}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      backgroundColor: 'var(--color-brass)',
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      padding: '12px',
                      boxShadow: '0 4px 12px rgba(197, 160, 89, 0.2)',
                      cursor: 'pointer',
                      border: 'none',
                      borderRadius: '6px'
                    }}
                    onClick={() => handleBroadcastStep(currentNewsStep)}
                  >
                    🚀 BROADCAST STEP {currentNewsStep} NEWS
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-rise)', fontWeight: 'bold', backgroundColor: 'var(--color-rise-light)', borderRadius: '8px' }}>
                  ✓ All 80 Scheduled Event Scenario News Items Have Been Successfully Broadcasted!
                </div>
              )}

              {/* Scrollable list of all steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-ink-2)' }}>
                  📋 SCENARIO TIMELINE DIRECTORY ({NEWS_PRESETS.length} STEPS)
                </span>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-2)', padding: '6px' }}>
                  {NEWS_PRESETS.map((preset) => {
                    const isBroadcasted = preset.step < currentNewsStep;
                    const isCurrent = preset.step === currentNewsStep;

                    return (
                      <div
                        key={preset.step}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: isCurrent ? 'rgba(197, 160, 89, 0.08)' : 'transparent',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '75%' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: isBroadcasted ? 'var(--color-rise)' : isCurrent ? 'var(--color-brass)' : 'var(--color-ink-3)',
                            minWidth: '55px'
                          }}>
                            {isBroadcasted ? '✓ Step ' : isCurrent ? '▶ Step ' : '⏳ Step '}{preset.step}
                          </span>
                          <span style={{
                            color: isBroadcasted ? 'var(--color-ink-3)' : 'var(--color-ink)',
                            textDecoration: isBroadcasted ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={preset.headline}>
                            {preset.headline}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            backgroundColor: isBroadcasted ? 'var(--color-surface-3)' : 'var(--color-brass-light)',
                            color: isBroadcasted ? 'var(--color-ink-3)' : 'var(--color-brass)',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleBroadcastStep(preset.step)}
                        >
                          Trigger
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Live Published Press Wire */}
        <div className="glass card">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', marginBottom: '16px' }}>
            Published Press Wire
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
            {publishedNews.length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', marginTop: '16px' }}>No bulletins broadcasted yet.</div>
            ) : (
              publishedNews.map(news => (
                <div key={news.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className={news.sentiment === 'Positive' ? 'text-up' : news.sentiment === 'Negative' ? 'text-down' : ''} style={{ fontWeight: 700 }}>
                      {news.headline}
                    </span>
                    <span className="font-data" style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>
                      {new Date(news.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-ink-2)', fontSize: '0.75rem' }}>{news.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
