import React, { useState } from 'react';

export default function JournalistPage({ state, adminPassword }) {
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
      const res = await fetch('/api/news', {
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

  // Distinct templates by category tab selection
  const templateCategories = ['All', 'Earnings', 'Policy', 'Scandal', 'Merger', 'Product', 'Macro', 'Disaster'];
  
  const filteredTemplates = state.newsEvents.filter(n => {
    if (n.triggeredAt) return false; // only show untriggered template cards
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
                    padding: '10px 14px',
                    cursor: 'pointer',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-l1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  onClick={() => handleApplyTemplate(tpl)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={tpl.sentiment === 'Positive' ? 'text-up' : tpl.sentiment === 'Negative' ? 'text-down' : 'text-brass'} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {tpl.headline}
                    </span>
                    <span className="badge badge-public" style={{ fontSize: '0.6rem' }}>{tpl.category}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                    Impact: {tpl.sentiment === 'Positive' ? '+' : '-'}{tpl.impactPercent}% &bull; Target: {tpl.affectedSector || tpl.tickerMatch || 'Global'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

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
