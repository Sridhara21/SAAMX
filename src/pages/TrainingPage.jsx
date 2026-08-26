import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api.js';

export default function TrainingPage({ state }) {
  const [drillStatus, setDrillStatus] = useState('idle'); // idle, running, paused
  const [orders, setOrders] = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [deskCounter, setDeskCounter] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [recommendation, setRecommendation] = useState('Run a drill and complete orders to get coaching recommendations.');
  const [recLoading, setRecLoading] = useState(false);
  const [time, setTime] = useState(Date.now());

  // Ref to hold orders for interval callback access
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Clock tick for elapsed time displays
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate dynamic interval based on market conditions (influenced by Phoenix acts, IPOs, halts, and volatility)
  const getDynamicInterval = () => {
    if (!state || !state.marketState) return { interval: 30000, paceLabel: '💤 STABLE MARKET FLOW' };

    const isMarketOpen = state.marketState.status === 'Open';
    if (!isMarketOpen) {
      return { interval: 999999, paceLabel: '⏸ MARKET CLOSED / AWAITING OPEN' };
    }

    const hasPendingIpo = (state.securities || []).some(s => s.status === 'IPO_PENDING');
    const hasHalted = (state.securities || []).some(s => s.status === 'Halted');
    
    // Check recent corporate actions or news in the last 2 minutes
    const cutoff = Date.now() - 120000;
    const recentAction = (state.corporateActions || []).some(act => act.triggeredAt >= cutoff);
    const recentNews = (state.newsEvents || []).some(news => news.triggeredAt >= cutoff);

    if (hasPendingIpo) {
      // High frequency during IPO launches
      return { interval: 10000, paceLabel: '🔥 IPO PEAK RUSH (HIGH VOLUME)' };
    } else if (hasHalted || recentAction) {
      // Panic sell/buy
      return { interval: 15000, paceLabel: '⚠️ INTENSE MARKET VOLATILITY SPIKE' };
    } else if (recentNews) {
      // News reaction
      return { interval: 20000, paceLabel: '📈 ACTIVE NEWS RESPONSE' };
    }

    // Default flow
    return { interval: 30000, paceLabel: '💤 STABLE MARKET FLOW' };
  };

  const dynamicSettings = getDynamicInterval();

  const isSeeded = state.securities && state.securities.length > 0 && state.teams && state.teams.length > 0;

  const generateMockOrder = () => {
    if (!isSeeded) return null;

    const adjustOrderParameters = (ord) => {
      if (!ord) return null;
      const liveSec = state.securities.find(s => s.ticker === ord.ticker && s.status === 'Active');
      const liveTeam = state.teams.find(t => t.teamCode === ord.teamCode);

      if (!liveSec || !liveTeam) return null;

      const secPrice = liveSec.currentPrice || 100;
      let finalAction = ord.action;
      let finalQuantity = ord.quantity;
      let finalRationale = ord.rationale;

      if (finalAction === 'SELL') {
        const ownedQty = (liveTeam.holdings || {})[liveSec.ticker] || 0;
        if (ownedQty <= 0) {
          // Switch to BUY
          finalAction = 'BUY';
          const maxAffordable = Math.min(liveSec.availableUnits, Math.floor(liveTeam.cashBalance / secPrice));
          if (maxAffordable <= 0) return null;
          finalQuantity = Math.max(1, Math.min(maxAffordable, Math.floor(Math.random() * 15) + 1));
          finalRationale = `Strategic cash reallocation into active asset ${liveSec.ticker}.`;
        } else {
          finalQuantity = Math.max(1, Math.min(finalQuantity, ownedQty));
        }
      } else {
        // BUY
        const maxAffordable = Math.min(liveSec.availableUnits, Math.floor(liveTeam.cashBalance / secPrice));
        if (maxAffordable <= 0) {
          // Switch to SELL if they hold it
          const ownedQty = (liveTeam.holdings || {})[liveSec.ticker] || 0;
          if (ownedQty > 0) {
            finalAction = 'SELL';
            finalQuantity = Math.max(1, Math.min(finalQuantity, ownedQty));
            finalRationale = `Liquidating ${liveSec.ticker} to raise cash reserves.`;
          } else {
            // Find any security they hold to sell
            const teamHoldings = Object.entries(liveTeam.holdings || {}).filter(([_, q]) => q > 0);
            if (teamHoldings.length > 0) {
              const [holdTicker, holdQty] = teamHoldings[Math.floor(Math.random() * teamHoldings.length)];
              const holdSec = state.securities.find(s => s.ticker === holdTicker && s.status === 'Active');
              if (holdSec) {
                return {
                  teamCode: ord.teamCode,
                  action: 'SELL',
                  ticker: holdSec.ticker,
                  quantity: Math.max(1, Math.min(ord.quantity, holdQty)),
                  rationale: `Liquidating holdings of ${holdSec.ticker} due to cash constraints.`
                };
              }
            }
            return null;
          }
        } else {
          finalQuantity = Math.max(1, Math.min(finalQuantity, maxAffordable));
        }
      }

      return {
        teamCode: ord.teamCode,
        action: finalAction,
        ticker: liveSec.ticker,
        quantity: finalQuantity,
        rationale: finalRationale
      };
    };

    // Retry loop to ensure a valid order is generated based on holdings and cash limits
    for (let attempt = 0; attempt < 10; attempt++) {
      // Choose team
      const activeTeams = state.teams.filter(t => t.teamCode && t.isActive);
      if (activeTeams.length === 0) return null;
      const team = activeTeams[Math.floor(Math.random() * activeTeams.length)];

      // Choose active securities
      const activeSecurities = state.securities.filter(s => s.status === 'Active');
      if (activeSecurities.length === 0) return null;
      const sec = activeSecurities[Math.floor(Math.random() * activeSecurities.length)];
      const ticker = sec.ticker;
      const price = sec.currentPrice || 100;

      // Emotional personalities: FOMO, PANIC, CONFUSED, CALCULATED, FAT_FINGER
      const personalities = ['FOMO', 'PANIC', 'CONFUSED', 'CALCULATED', 'FAT_FINGER'];
      const personality = personalities[Math.floor(Math.random() * personalities.length)];

      let action = 'BUY';
      let quantity = 10;
      let rationale = '';

      const teamHoldings = Object.entries(team.holdings || {}).filter(([_, q]) => q > 0);
      
      if (personality === 'PANIC') {
        if (teamHoldings.length > 0 && Math.random() < 0.7) {
          action = 'SELL';
          const [secId, ownedQty] = teamHoldings[Math.floor(Math.random() * teamHoldings.length)];
          const panicSec = state.securities.find(s => (s.id === secId || s.ticker === secId) && s.status === 'Active');
          
          if (panicSec) {
            const panicTicker = panicSec.ticker;
            quantity = Math.max(1, Math.floor(Math.random() * ownedQty));
            const panicRationales = [
              `SELL EVERYTHING! ${panicTicker} is dropping fast!`,
              `Get us out of ${panicTicker} now! SEBI surveillance is active!`,
              `Panic sell! Save our capital before we go bankrupt!`,
              `Market volatility is too high, liquidate ${panicTicker} instantly!`
            ];
            rationale = panicRationales[Math.floor(Math.random() * panicRationales.length)];
            const rawOrder = { teamCode: team.teamCode, action, ticker: panicTicker, quantity, rationale };
            const adjusted = adjustOrderParameters(rawOrder);
            if (adjusted) return adjusted;
          }
          continue;
        } else {
          action = 'BUY';
          quantity = Math.max(1, Math.floor(Math.random() * 15));
          rationale = `Panicked hedge buy on ${ticker} to protect cash reserves!`;
        }
      } else if (personality === 'FOMO') {
        action = 'BUY';
        const maxAffordable = Math.floor((team.cashBalance || 1000000) / price);
        quantity = Math.max(10, Math.min(100, Math.floor(maxAffordable * 0.4)));
        const fomoRationales = [
          `TO THE MOON! Buy ${ticker} now before we get left behind!`,
          `Everyone is buying ${ticker}, loading up the boat!`,
          `Pump it! Institutional investors are buying ${ticker} in blocks!`,
          `Rocket emoji! ${ticker} is breaking resistance levels!`
        ];
        rationale = fomoRationales[Math.floor(fomoRationales.length * Math.random())];
      } else if (personality === 'FAT_FINGER') {
        action = Math.random() < 0.5 ? 'BUY' : 'SELL';
        quantity = Math.random() < 0.3 ? 555 : Math.random() < 0.5 ? 99 : 111;
        const fatFingerRationales = [
          `Wait, did I type too many zeros? Just execute this buy for ${ticker}.`,
          `Typo trade! Meant to trade 10 but typed ${quantity} of ${ticker}!`,
          `Fat finger error on ${ticker} slip! Standardize this transaction.`,
          `System latency made us double tap! Processing ${quantity} units.`
        ];
        rationale = fatFingerRationales[Math.floor(Math.random() * fatFingerRationales.length)];
      } else if (personality === 'CONFUSED') {
        action = Math.random() < 0.8 ? 'BUY' : 'SELL';
        quantity = Math.floor(Math.random() * 20) + 1;
        const confusedRationales = [
          `Uh, our strategy sheet says buy ${ticker} but I'm not sure why.`,
          `Desk manager told me to execute this. Hope the ticker matches.`,
          `New operator confusion: Placing test order on ${ticker}.`,
          `Is this a buy or sell? Slippage is high, processing anyway.`
        ];
        rationale = confusedRationales[Math.floor(Math.random() * confusedRationales.length)];
      } else {
        action = Math.random() < 0.7 ? 'BUY' : 'SELL';
        const maxAffordable = Math.floor((team.cashBalance || 1000000) / price);
        if (price > 5000) {
          quantity = Math.max(1, Math.min(5, maxAffordable));
        } else if (price > 1000) {
          quantity = Math.max(5, Math.min(30, maxAffordable));
        } else {
          quantity = Math.max(10, Math.min(150, maxAffordable));
        }
        const calcRationales = [
          `Portfolio asset reallocation based on Q3 earnings reports.`,
          `Value investment in ${ticker} following sector correction.`,
          `Strategic position hedge against macroeconomic volatility.`,
          `Liquidity optimization and yield rebalancing model.`
        ];
        rationale = calcRationales[Math.floor(Math.random() * calcRationales.length)];
      }

      const rawOrder = { teamCode: team.teamCode, action, ticker, quantity, rationale };
      const adjusted = adjustOrderParameters(rawOrder);
      if (adjusted) return adjusted;
    }

    return null;
  };

  // Trigger Order Generation
  const triggerOrderGeneration = () => {
    if (!isSeeded) return;
    
    const orderSlip = generateMockOrder();

    if (orderSlip) {
      setOrderCount(prev => {
        const nextCount = prev + 1;
        const desk = ((nextCount - 1) % 3) + 1;

        const newOrder = {
          id: `ORDER_${String(nextCount).padStart(3, '0')}`,
          desk,
          teamCode: orderSlip.teamCode,
          action: orderSlip.action,
          ticker: orderSlip.ticker,
          quantity: orderSlip.quantity,
          rationale: orderSlip.rationale || 'Regular portfolio rebalancing.',
          generatedAt: Date.now(),
          completedAt: null,
          elapsedSeconds: null,
          status: 'pending'
        };

        setOrders(prevOrders => [newOrder, ...prevOrders]);
        return nextCount;
      });
    }
  };

  // Setup Generator Loop
  useEffect(() => {
    if (drillStatus !== 'running') return;
    if (state.marketState.status !== 'Open') return;
    
    // Initial order right away
    triggerOrderGeneration();

    const interval = setInterval(() => {
      triggerOrderGeneration();
    }, dynamicSettings.interval);

    return () => clearInterval(interval);
  }, [drillStatus, dynamicSettings.interval, state.marketState.status]);

  // Method B: Auto-detection via transaction ledger
  useEffect(() => {
    if (drillStatus !== 'running') return;

    const interval = setInterval(() => {
      const pendingOrders = ordersRef.current.filter(o => o.status === 'pending');
      if (pendingOrders.length === 0) return;

      const recentTransactions = state.transactions || [];
      
      let updatedAny = false;
      const nextOrders = ordersRef.current.map(order => {
        if (order.status !== 'pending') return order;

        // Search for a matching transaction completed after the order was generated
        const match = recentTransactions.find(tx => {
          return tx.teamId === order.teamCode &&
                 tx.securityId === order.ticker &&
                 tx.action.toUpperCase() === order.action.toUpperCase() &&
                 tx.quantity === order.quantity &&
                 tx.timestamp >= order.generatedAt;
        });

        if (match) {
          updatedAny = true;
          const completedAt = match.timestamp;
          const elapsedSeconds = parseFloat(((completedAt - order.generatedAt) / 1000).toFixed(1));
          return {
            ...order,
            status: 'completed',
            completedAt,
            elapsedSeconds
          };
        }
        return order;
      });

      if (updatedAny) {
        setOrders(nextOrders);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [drillStatus, state.transactions]);

  // Method A: Manual Completion
  const handleMarkDone = (id) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const completedAt = Date.now();
        const elapsedSeconds = parseFloat(((completedAt - o.generatedAt) / 1000).toFixed(1));
        return {
          ...o,
          status: 'completed',
          completedAt,
          elapsedSeconds
        };
      }
      return o;
    }));
  };

  // Metrics Calculations
  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  
  const avgTime = completedOrders.length > 0
    ? parseFloat((completedOrders.reduce((acc, curr) => acc + curr.elapsedSeconds, 0) / completedOrders.length).toFixed(1))
    : 0;

  const getDeskMetrics = (deskNum) => {
    const deskOrders = orders.filter(o => o.desk === deskNum);
    const deskCompleted = deskOrders.filter(o => o.status === 'completed');
    const deskPending = deskOrders.filter(o => o.status === 'pending');
    const deskAvg = deskCompleted.length > 0
      ? parseFloat((deskCompleted.reduce((acc, curr) => acc + curr.elapsedSeconds, 0) / deskCompleted.length).toFixed(1))
      : 0;

    let indicator = '✓';
    let color = 'var(--color-rise)';
    if (deskAvg > 20) {
      indicator = '✗';
      color = 'var(--color-fall)';
    } else if (deskAvg > 10) {
      indicator = '⚠';
      color = 'var(--color-brass)';
    } else if (deskCompleted.length === 0) {
      indicator = '—';
      color = 'var(--color-ink-3)';
    }

    return {
      completed: deskCompleted.length,
      total: deskOrders.length,
      avg: deskAvg,
      indicator,
      color,
      pending: deskPending.length
    };
  };

  const desk1 = getDeskMetrics(1);
  const desk2 = getDeskMetrics(2);
  const desk3 = getDeskMetrics(3);

  // Stop/End Drill Summary Recommendation Trigger
  const handleEndDrill = () => {
    setDrillStatus('paused');
    setShowSummary(true);
    setRecLoading(true);

    // Local coach calculation
    let slowDeskNum = 1;
    let maxAvg = desk1.avg;
    if (desk2.avg > maxAvg) { slowDeskNum = 2; maxAvg = desk2.avg; }
    if (desk3.avg > maxAvg) { slowDeskNum = 3; maxAvg = desk3.avg; }

    if (maxAvg > 20) {
      setRecommendation(`Desk ${slowDeskNum} is bottlenecking with an average processing time of ${maxAvg}s. Operations recommendation: Re-allocate a secondary operator to Desk ${slowDeskNum} to help verify inputs or introduce keyboard shortcuts to decrease entry latency.`);
    } else if (maxAvg > 10) {
      setRecommendation(`Desk ${slowDeskNum} average time is ${maxAvg}s. Recommendation: Assign a senior operator to Desk ${slowDeskNum} to handle heavy volume and ensure all order sheets are sorted by ticker.`);
    } else {
      setRecommendation('Excellent drill results! Average response time is below 10 seconds. Operator latency is nominal. Ready for event day operations.');
    }
    setRecLoading(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    let csv = 'Order ID,Desk,Team,Security,Action,Quantity,Gen Time,Done Time,Seconds\n';
    orders.forEach(o => {
      const genTime = new Date(o.generatedAt).toLocaleTimeString();
      const doneTime = o.completedAt ? new Date(o.completedAt).toLocaleTimeString() : 'pending';
      const secVal = o.elapsedSeconds !== null ? o.elapsedSeconds : '';
      csv += `${o.id},${o.desk},${o.teamCode},${o.ticker},${o.action},${o.quantity},${genTime},${doneTime},${secVal}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `drill_session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset drill
  const handleResetDrill = () => {
    setOrders([]);
    setOrderCount(0);
    setDeskCounter(0);
    setDrillStatus('idle');
    setShowSummary(false);
  };

  // Render elapsed timer with colors
  const renderElapsedTime = (order) => {
    if (order.status === 'completed') {
      return <span style={{ color: 'var(--color-rise)', fontWeight: 'bold' }}>✓ Done ({order.elapsedSeconds}s)</span>;
    }
    const elapsed = Math.max(0, Math.floor((time - order.generatedAt) / 1000));
    let color = 'var(--color-rise)';
    if (elapsed > 20) {
      color = 'var(--color-fall)';
    } else if (elapsed > 10) {
      color = 'var(--color-brass)';
    }

    return (
      <span style={{ color, fontWeight: 'bold' }}>
        ⏱ {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} elapsed
      </span>
    );
  };

  if (!isSeeded) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass card" style={{ borderTop: '4px solid var(--color-fall)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fall)', marginBottom: '16px' }}>drill configuration restricted</h2>
          <p style={{ color: 'var(--color-ink-2)', lineHeight: '1.6' }}>
            Please seed securities and teams in the Admin Console before starting a training drill. The simulator requires active assets and registered codes to generate realistic trading instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: 'var(--color-paper)', minHeight: 'calc(100vh - 60px)' }}>
      
      {/* 1. Header controls panel */}
      <div className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', fontSize: '1.8rem', margin: 0 }}>
            🎯 Staff Speed-Training Rehearsal
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-2)' }}>Rehearse exchange entry times under live event trading frequencies.</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {drillStatus === 'running' ? (
            <button className="btn" style={{ backgroundColor: 'var(--color-brass-light)', color: 'var(--color-brass)' }} onClick={() => setDrillStatus('paused')}>
              ⏸ Pause
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setDrillStatus('running')}>
              ▶ Start Drill
            </button>
          )}
          <button className="btn" style={{ backgroundColor: 'var(--color-fall-light)', color: 'var(--color-fall)' }} onClick={handleEndDrill}>
            ⏹ End Drill
          </button>
          <button className="btn btn-secondary" onClick={handleResetDrill}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* 2. Speed mode selectors & top statistics */}
      <div className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Market Activity Pace:</span>
          <span 
            className="badge" 
            style={{ 
              backgroundColor: dynamicSettings.paceLabel.includes('PEAK') ? 'var(--color-fall)' : dynamicSettings.paceLabel.includes('VOLATILITY') ? 'var(--color-brass)' : 'var(--color-brass-light)',
              color: dynamicSettings.paceLabel.includes('PEAK') || dynamicSettings.paceLabel.includes('VOLATILITY') ? '#fff' : 'var(--color-brass)',
              fontWeight: '900',
              padding: '6px 12px',
              fontSize: '0.85rem',
              borderRadius: '4px',
              fontFamily: 'var(--font-display)'
            }}
          >
            {dynamicSettings.paceLabel}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
            (Interval: {dynamicSettings.interval === 999999 ? 'Paused' : `${dynamicSettings.interval / 1000}s`})
          </span>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase' }}>TOTAL SLIPS</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{orders.length}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase' }}>COMPLETED</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-rise)' }}>{completedOrders.length}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase' }}>QUEUED PENDING</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-fall)' }}>{pendingOrders.length}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', display: 'block', textTransform: 'uppercase' }}>AVG PROCESSING</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{avgTime}s</span>
          </div>
        </div>
      </div>

      {/* 3. Desk Breakdown Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        
        {/* Desk 1 Column */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', margin: 0 }}>💼 Desk 1 Operations</h3>
            <span style={{ fontWeight: 'bold', color: desk1.color }}>{desk1.indicator} Avg: {desk1.avg}s ({desk1.completed}/{desk1.total})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '450px', minHeight: '300px' }}>
            {orders.filter(o => o.desk === 1).length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>No slips assigned.</div>
            ) : (
              orders.filter(o => o.desk === 1).map(o => (
                <div key={o.id} className="glass" style={{ padding: '12px', borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-rise)' : 'var(--color-fall)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>{o.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>{new Date(o.generatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <div>Team: <strong>{o.teamCode}</strong></div>
                    <div>Ticker: <strong>{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{o.action}</strong></div>
                    <div>Qty: <strong>{o.quantity}</strong></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)' }} onClick={() => handleMarkDone(o.id)}>
                        MARK DONE ✓
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desk 2 Column */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', margin: 0 }}>💼 Desk 2 Operations</h3>
            <span style={{ fontWeight: 'bold', color: desk2.color }}>{desk2.indicator} Avg: {desk2.avg}s ({desk2.completed}/{desk2.total})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '450px', minHeight: '300px' }}>
            {orders.filter(o => o.desk === 2).length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>No slips assigned.</div>
            ) : (
              orders.filter(o => o.desk === 2).map(o => (
                <div key={o.id} className="glass" style={{ padding: '12px', borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-rise)' : 'var(--color-fall)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>{o.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>{new Date(o.generatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <div>Team: <strong>{o.teamCode}</strong></div>
                    <div>Ticker: <strong>{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{o.action}</strong></div>
                    <div>Qty: <strong>{o.quantity}</strong></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)' }} onClick={() => handleMarkDone(o.id)}>
                        MARK DONE ✓
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desk 3 Column */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.1rem', margin: 0 }}>💼 Desk 3 Operations</h3>
            <span style={{ fontWeight: 'bold', color: desk3.color }}>{desk3.indicator} Avg: {desk3.avg}s ({desk3.completed}/{desk3.total})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '450px', minHeight: '300px' }}>
            {orders.filter(o => o.desk === 3).length === 0 ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>No slips assigned.</div>
            ) : (
              orders.filter(o => o.desk === 3).map(o => (
                <div key={o.id} className="glass" style={{ padding: '12px', borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-rise)' : 'var(--color-fall)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>{o.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-3)' }}>{new Date(o.generatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <div>Team: <strong>{o.teamCode}</strong></div>
                    <div>Ticker: <strong>{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{o.action}</strong></div>
                    <div>Qty: <strong>{o.quantity}</strong></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-rise-light)', color: 'var(--color-rise)' }} onClick={() => handleMarkDone(o.id)}>
                        MARK DONE ✓
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Performance Log Table */}
      <div className="glass card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.25rem', margin: 0 }}>📊 Performance Log</h3>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
          <table className="fms-table" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Desk</th>
                <th>Team</th>
                <th>Security</th>
                <th>Action</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Gen Time</th>
                <th>Done Time</th>
                <th style={{ textAlign: 'right' }}>Seconds</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="font-data" style={{ fontWeight: 700 }}>{o.id}</td>
                  <td className="font-data">{o.desk}</td>
                  <td className="font-data">{o.teamCode}</td>
                  <td className="font-data">{o.ticker}</td>
                  <td className="font-data" style={{ color: o.action === 'BUY' ? 'var(--color-rise)' : 'var(--color-fall)' }}>{o.action}</td>
                  <td className="font-data" style={{ textAlign: 'right' }}>{o.quantity}</td>
                  <td className="font-data">{new Date(o.generatedAt).toLocaleTimeString()}</td>
                  <td className="font-data">{o.completedAt ? new Date(o.completedAt).toLocaleTimeString() : 'pending'}</td>
                  <td className="font-data" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {o.elapsedSeconds !== null ? `${o.elapsedSeconds}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }}>
          <div className="glass card" style={{ maxWidth: '600px', width: '100%', padding: '32px', borderTop: '6px solid var(--color-brass)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brass)', textAlign: 'center', margin: '0 0 16px 0' }}>DRILL SESSION COMPLETE</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', backgroundColor: 'var(--color-surface-2)', padding: '16px', borderRadius: '8px' }}>
              <div>Total Slips: <strong>{orders.length}</strong></div>
              <div>Completed: <strong style={{ color: 'var(--color-rise)' }}>{completedOrders.length}</strong></div>
              <div style={{ gridColumn: 'span 2', fontSize: '1.1rem' }}>
                OVERALL AVERAGE: <strong style={{ color: avgTime <= 10 ? 'var(--color-rise)' : avgTime <= 20 ? 'var(--color-brass)' : 'var(--color-fall)' }}>{avgTime}s</strong>
              </div>
            </div>

            <div style={{ borderBottom: '1px dashed var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>Desk Metrics Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Desk 1:</span>
                  <span><strong>{desk1.avg}s</strong> average ({desk1.completed} orders)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Desk 2:</span>
                  <span><strong>{desk2.avg}s</strong> average ({desk2.completed} orders)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Desk 3:</span>
                  <span><strong>{desk3.avg}s</strong> average ({desk3.completed} orders)</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>AI Operational Coach Recommendations</h4>
              {recLoading ? (
                <div style={{ fontStyle: 'italic', color: 'var(--color-ink-3)', fontSize: '0.9rem' }}>Generating recommendations from operations coach...</div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', borderLeft: '3px solid var(--color-brass)' }}>
                  {recommendation}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
              <button className="btn btn-primary" onClick={handleResetDrill}>Run Again</button>
              <button className="btn" style={{ backgroundColor: 'var(--color-surface-2)' }} onClick={() => setShowSummary(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
