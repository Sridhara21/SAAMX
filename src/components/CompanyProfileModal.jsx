import React from 'react';

export default function CompanyProfileModal({ securityId, securities, newsEvents, onClose }) {
  const security = securities.find(s => s.id === securityId);
  if (!security) return null;

  // Filter news events targeting this security
  const companyNews = newsEvents.filter(news => 
    (news.affectedSecurityIds && news.affectedSecurityIds.includes(security.id)) ||
    (news.affectedSector && news.affectedSector === security.sector)
  ).slice(0, 5);

  const history = security.priceHistory || [];
  const currentPrice = security.currentPrice;
  const basePrice = security.basePrice;
  const priceDiff = currentPrice - basePrice;
  const percentChange = ((priceDiff / basePrice) * 100).toFixed(1);
  const isPriceUp = priceDiff >= 0;

  // Render SVG Price Chart
  const renderPriceChart = () => {
    if (history.length < 2) {
      return (
        <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232, 230, 223, 0.4)' }}>
          No trading history recorded yet.
        </div>
      );
    }

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice || 1;

    const width = 500;
    const height = 150;
    const points = history.map((item, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((item.price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    }).join(' ');

    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || lastPrice;
    const isUp = lastPrice >= prevPrice;
    const strokeColor = isUp ? 'var(--rise)' : 'var(--fall)';
    const areaGradientId = `grad-${security.id}`;

    return (
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '150px', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={`url(#${areaGradientId})`}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            points={points}
          />
          <circle
            cx={width}
            cy={height - ((lastPrice - minPrice) / priceRange) * height}
            r="4.5"
            fill={strokeColor}
          />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)' }}>
          <span>Simulation Open</span>
          <span style={{ fontWeight: 700 }} className="font-data">Current Price: ₹{security.currentPrice.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  // Safe fetch profile details or create fallbacks
  const profile = security.profileDetails || {
    tagline: `Pioneer in Indian ${security.sector} sector.`,
    about: `${security.name} is a major Indian enterprise driving commercial scale in ${security.sector.toLowerCase()} offerings.`,
    facts: [
      { label: 'Revenue', value: `₹${(security.basePrice * 125).toLocaleString()} Cr` },
      { label: 'Net Profit', value: `₹${(security.basePrice * 15).toLocaleString()} Cr` },
      { label: 'Debt-to-Equity', value: '0.45' },
      { label: 'CEO', value: security.ceoName || 'Executive Director' }
    ]
  };

  const isGlobal = security.type === 'GlobalEquity' || security.sector === 'Global Equity';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {/* Header section */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="avatar-tile" style={{ backgroundColor: security.status === 'Bankrupt' ? 'var(--fall)' : 'var(--brass)', minWidth: '60px', height: '60px', borderRadius: '8px', fontSize: '1.5rem' }}>
            {security.logoInitials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 850, margin: 0 }}>{security.name}</h2>
              <span className="team-badge badge-retail" style={{ background: 'var(--brass)', color: '#000', fontWeight: 'bold' }}>{security.ticker}</span>
              <span className="team-badge" style={{ background: 'rgba(232, 230, 223, 0.05)', color: 'var(--color-brass)' }}>
                {isGlobal ? '🌐 ' : ''}{security.sector}
              </span>
            </div>
            <p style={{ color: 'var(--color-brass)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontStyle: 'italic' }}>
              {profile.tagline}
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '1.5rem 0' }} />

        {/* Pricing Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>Current Price</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '0.25rem' }} className="font-data">
              ₹{currentPrice.toLocaleString()}
            </div>
          </div>
          <div className="glass" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>Change</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isPriceUp ? 'var(--rise)' : 'var(--fall)', marginTop: '0.25rem' }} className="font-data">
              {isPriceUp ? '▲' : '▼'} {isPriceUp ? '+' : ''}{percentChange}%
            </div>
          </div>
          <div className="glass" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>Available Units</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '0.25rem' }} className="font-data">
              {security.availableUnits} / {security.totalUnits}
            </div>
          </div>
          <div className="glass" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>Risk & Volatility</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: security.riskRating === 'High' ? 'var(--fall)' : security.riskRating === 'Medium' ? 'var(--color-brass)' : 'var(--rise)', marginTop: '0.25rem' }}>
              {security.riskRating} ({(security.volatility * 100).toFixed(0)}%)
            </div>
          </div>
        </div>

        {/* Core Layout Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Left Column: About & Key Facts */}
          <div>
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', color: 'var(--color-brass)' }}>About</h3>
              <p style={{ color: 'rgba(232, 230, 223, 0.75)', lineHeight: '1.6', fontSize: '0.95rem', margin: 0 }}>
                {profile.about}
              </p>
            </div>

            {/* Key Facts Section */}
            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-brass)' }}>Key Facts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {profile.facts && profile.facts.map((fact, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(232, 230, 223, 0.05)', paddingBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>{fact.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.15rem' }} className="font-data">{fact.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chart & Custom Note */}
          <div>
            <div className="glass" style={{ padding: '1.5rem', backgroundColor: '#101216', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historical Performance Chart</h4>
                {renderPriceChart()}
              </div>

              {/* Warning/Currency risk note */}
              {profile.note && (
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(217, 83, 79, 0.08)', borderLeft: '4px solid var(--fall)', borderRadius: '4px', fontSize: '0.85rem', color: 'rgba(232, 230, 223, 0.7)' }}>
                  ⚠️ <strong>Notice:</strong> {profile.note}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Top Holdings / Sector Exposure breakdown */}
        {profile.holdings && profile.holdings.length > 0 && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-brass)' }}>Portfolio constituents & Sector Allocation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {profile.holdings.map((hold, idx) => (
                <div key={idx} style={{ padding: '1rem', background: 'rgba(232, 230, 223, 0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase' }}>{hold.name}</strong>
                  <div style={{ fontSize: '1rem', color: 'var(--color-ink)', marginTop: '0.5rem', lineHeight: '1.5' }} className="font-data">
                    {hold.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live News Feed */}
        <div className="glass" style={{ padding: '1.5rem', backgroundColor: '#101216' }}>
          <h4 style={{ fontSize: '0.8rem', marginBottom: '1rem', color: 'rgba(232, 230, 223, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security News Feed</h4>
          {companyNews.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'rgba(232, 230, 223, 0.4)', margin: 0 }}>No news records logged for this ticker.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
              {companyNews.map(news => (
                <li key={news.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong className={news.sentiment === 'Positive' ? 'text-up' : news.sentiment === 'Negative' ? 'text-down' : ''}>
                      {news.headline}
                    </strong>
                    <span style={{ color: 'rgba(232, 230, 223, 0.4)' }} className="font-data">
                      {new Date(news.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(232, 230, 223, 0.6)', fontSize: '0.85rem' }}>{news.description}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
