import React, { useState, useMemo } from 'react';

export default function BearTerminal({ state, onOpenProfile }) {
  const [talkingPointText, setTalkingPointText] = useState('');
  const [talkingPoints, setTalkingPoints] = useState([
    {
      id: 'BE1',
      title: 'Overextended Valuations & Bubble Risk',
      arg: 'Multiple momentum equities are trading at unsustainable multiples relative to underlying book value. Teams overconcentrated in single-sector high-beta assets risk severe drawdowns upon profit taking.'
    },
    {
      id: 'BE2',
      title: 'Macro & Regulatory Headwinds',
      arg: 'Tightening foreign exchange spreads and SEBI surveillance on excessive intraday order velocity increase circuit-breaker risks. Capital preservation in cash or balanced defensive allocations is critical.'
    }
  ]);

  const securities = useMemo(() => Object.values(state?.securities || {}), [state?.securities]);
  const newsEvents = useMemo(() => Object.values(state?.newsEvents || []).filter(n => n.triggeredAt), [state?.newsEvents]);
  const marketIndices = state?.marketIndices || {};

  // Bearish & Vulnerable Picks (Biggest Losers & High Volatility)
  const topBearPicks = useMemo(() => {
    return [...securities]
      .filter(s => s.status === 'Active')
      .map(s => {
        const cur = s.currentPrice || s.basePrice || 0;
        const open = s.openingPrice || s.basePrice || cur;
        const pct = open > 0 ? ((cur - open) / open) * 100 : 0;
        return { ...s, pct, cur };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8);
  }, [securities]);

  // Negative Market News Events & Risk Warnings
  const negativeNews = useMemo(() => {
    return newsEvents.filter(n => n.sentiment === 'Negative' || (n.impactPercent || 0) < 0 || n.category === 'REGULATORY');
  }, [newsEvents]);

  const handleAddPoint = (e) => {
    e.preventDefault();
    if (!talkingPointText.trim()) return;
    setTalkingPoints([
      { id: `BE_${Date.now()}`, title: 'Bearish Risk Warning', arg: talkingPointText },
      ...talkingPoints
    ]);
    setTalkingPointText('');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'linear-gradient(135deg, #931913, #B91C1C)', color: '#FFFFFF', padding: '4px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.9rem' }}>
              BEAR DESK 🐻
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--color-ink)', margin: 0 }}>
              Bear Market Intelligence & Risk Terminal
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-ink-2)', fontSize: '0.85rem' }}>
            Vulnerability Scans &bull; Volatility & Circuit Risks &bull; Downside Exposure &bull; Bear Talking Points
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="#/debate" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800 }}>
            ⚔️ Open Bull vs Bear Debate Screen
          </a>
        </div>
      </div>

      {/* Bear Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {[
          { label: 'GLOBAL 100', val: marketIndices.GLOBAL100?.currentValue || 1000, chg: marketIndices.GLOBAL100?.changePercent || 0 },
          { label: 'INDIA 50', val: marketIndices.INDIA50?.currentValue || 5000, chg: marketIndices.INDIA50?.changePercent || 0 },
          { label: 'US 100', val: marketIndices.US100?.currentValue || 8000, chg: marketIndices.US100?.changePercent || 0 }
        ].map((idx, i) => (
          <div key={i} className="card-metric" style={{ padding: '12px 16px', borderLeft: '4px solid var(--color-fall)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', fontWeight: 800 }}>SAAMX {idx.label}</span>
            <div className="font-data" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-ink)' }}>
              {Number(idx.val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: idx.chg >= 0 ? 'var(--color-rise)' : 'var(--color-fall)' }}>
              {idx.chg >= 0 ? '▲ +' : '▼ '}{Math.abs(idx.chg).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Left: Decliners & Vulnerability Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card-data" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-fall)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔻</span> Vulnerable & Decliners Watchlist
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)', background: 'var(--color-paper-subtle)' }}>
                  <th style={{ padding: '8px' }}>TICKER</th>
                  <th style={{ padding: '8px' }}>NAME</th>
                  <th style={{ padding: '8px' }}>SECTOR</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>PRICE</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>DROP %</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {topBearPicks.map(s => (
                  <tr key={s.ticker} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontWeight: 900, color: 'var(--color-brass)' }}>{s.ticker}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-ink)' }}>{s.name}</td>
                    <td style={{ padding: '8px', color: 'var(--color-ink-2)' }}>{s.sector || 'Equities'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                      ₹{s.cur}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: 'var(--color-fall)', fontFamily: 'monospace' }}>
                      {s.pct.toFixed(2)}%
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenProfile && onOpenProfile(s.ticker)}
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Negative News & Regulatory Risk Alerts */}
          <div className="card-data" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              ⚠️ Market Risk & Regulatory Warning Feed
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {negativeNews.slice(0, 5).map(n => (
                <div key={n.id} style={{ background: 'rgba(147, 25, 19, 0.04)', borderLeft: '4px solid var(--color-fall)', padding: '8px 12px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--color-ink)' }}>{n.headline}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-fall)', fontWeight: 800 }}>{n.impactPercent}%</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>{n.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Bear Talking Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card-data" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              🎯 Bear Talking Points (Debates & Risk Warning)
            </h3>

            <form onSubmit={handleAddPoint} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <textarea
                rows={3}
                placeholder="Formulate a new bearish risk warning or counter-argument for debate presentations..."
                value={talkingPointText}
                onChange={e => setTalkingPointText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: '0.78rem', backgroundColor: 'var(--color-fall)', color: '#fff' }}>
                Add Bear Talking Point
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {talkingPoints.map(tp => (
                <div key={tp.id} style={{ background: 'var(--color-paper-subtle)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--color-fall)', fontSize: '0.82rem', marginBottom: '4px' }}>
                    🐻 {tp.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink)', lineHeight: 1.4 }}>
                    {tp.arg}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
