import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  Card,
  Badge,
  Button,
  Modal,
  Alert
} from '../components/ui/index.js';
import {
  IconTarget,
  IconPlay,
  IconPause,
  IconSlash,
  IconRefreshCw,
  IconMonitor,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconFlame,
  IconTrendingUp,
  IconDownload,
  IconBarChart,
  IconBuilding,
  IconFileText,
  IconActivity
} from '../lib/icons.jsx';

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
    if (!state || !state.marketState) {
      return {
        interval: 30000,
        paceLabel: 'STABLE MARKET FLOW',
        variant: 'neutral',
        icon: <IconActivity size={14} />
      };
    }

    const isMarketOpen = state.marketState.status === 'Open';
    if (!isMarketOpen) {
      return {
        interval: 15000,
        paceLabel: 'REHEARSAL DRILL PACE (PRE-MARKET)',
        variant: 'info',
        icon: <IconActivity size={14} />
      };
    }

    const hasPendingIpo = (state.securities || []).some(s => s.status === 'IPO_PENDING');
    const hasHalted = (state.securities || []).some(s => s.status === 'Halted');

    // Check recent corporate actions or news in the last 2 minutes
    const cutoff = Date.now() - 120000;
    const recentAction = (state.corporateActions || []).some(act => act.triggeredAt >= cutoff);
    const recentNews = (state.newsEvents || []).some(news => news.triggeredAt >= cutoff);

    if (hasPendingIpo) {
      // High frequency during IPO launches
      return {
        interval: 10000,
        paceLabel: 'IPO PEAK RUSH (HIGH VOLUME)',
        variant: 'danger',
        icon: <IconFlame size={14} />
      };
    } else if (hasHalted || recentAction) {
      // Panic sell/buy
      return {
        interval: 15000,
        paceLabel: 'INTENSE MARKET VOLATILITY SPIKE',
        variant: 'warn',
        icon: <IconAlertTriangle size={14} />
      };
    } else if (recentNews) {
      // News reaction
      return {
        interval: 20000,
        paceLabel: 'ACTIVE NEWS RESPONSE',
        variant: 'info',
        icon: <IconTrendingUp size={14} />
      };
    }

    // Default flow
    return {
      interval: 30000,
      paceLabel: 'STABLE MARKET FLOW',
      variant: 'neutral',
      icon: <IconActivity size={14} />
    };
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
        const maxAffordable = Math.floor((team.cashBalance || 10000000) / price);
        quantity = Math.max(10, Math.min(100, Math.floor(maxAffordable * 0.4)));
        const fomoRationales = [
          `TO THE MOON! Buy ${ticker} now before we get left behind!`,
          `Everyone is buying ${ticker}, loading up the boat!`,
          `Pump it! Institutional investors are buying ${ticker} in blocks!`,
          `Breaking resistance! ${ticker} is surging on high volume!`
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
        const maxAffordable = Math.floor((team.cashBalance || 10000000) / price);
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

    // Initial order right away
    triggerOrderGeneration();

    const interval = setInterval(() => {
      triggerOrderGeneration();
    }, dynamicSettings.interval);

    return () => clearInterval(interval);
  }, [drillStatus, dynamicSettings.interval]);

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
    let variant = 'gain';
    if (deskAvg > 20) {
      indicator = '✗';
      variant = 'danger';
    } else if (deskAvg > 10) {
      indicator = '⚠';
      variant = 'warn';
    } else if (deskCompleted.length === 0) {
      indicator = '—';
      variant = 'neutral';
    }

    return {
      completed: deskCompleted.length,
      total: deskOrders.length,
      avg: deskAvg,
      indicator,
      variant,
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

  // Render elapsed timer badge
  const renderElapsedTime = (order) => {
    if (order.status === 'completed') {
      return (
        <Badge variant="gain" size="sm" icon={<IconCheck size={12} />}>
          <span className="font-mono tabular-nums">Done ({order.elapsedSeconds}s)</span>
        </Badge>
      );
    }
    const elapsed = Math.max(0, Math.floor((time - order.generatedAt) / 1000));
    let variant = 'info';
    if (elapsed > 20) {
      variant = 'danger';
    } else if (elapsed > 10) {
      variant = 'warn';
    }

    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');

    return (
      <Badge variant={variant} size="sm" icon={<IconClock size={12} />}>
        <span className="font-mono tabular-nums">{minutes}:{seconds} elapsed</span>
      </Badge>
    );
  };

  if (!isSeeded) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '680px', margin: '40px auto' }}>
        <Card style={{ borderTop: '4px solid var(--color-loss)', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--color-loss)' }}>
            <IconAlertTriangle size={24} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Drill Configuration Restricted
            </h2>
          </div>
          <p style={{ margin: 0, color: 'var(--color-ink-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
            Please seed securities and teams in the Admin Console before starting a training drill. The simulator requires active assets and registered codes to generate realistic trading instructions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px 20px 80px',
      fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      color: 'var(--color-ink-primary)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>

      {/* 1. Header controls panel */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-brass)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px'
            }}>
              <IconTarget size={14} />
              <span>Floor Training</span>
              <span style={{ opacity: 0.5 }}>/</span>
              <IconActivity size={14} />
              <span>Speed Rehearsal</span>
            </div>
            <h1 style={{
              margin: '0 0 6px',
              fontSize: '1.85rem',
              fontWeight: 800,
              fontFamily: "var(--font-display, 'Cinzel', serif)",
              color: 'var(--color-ink-primary)',
              letterSpacing: '-0.01em'
            }}>
              Staff Speed-Training Rehearsal
            </h1>
            <p style={{ margin: 0, fontSize: '0.90rem', color: 'var(--color-ink-secondary)' }}>
              Rehearse exchange entry times under live event trading frequencies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {drillStatus === 'running' ? (
              <Button
                variant="secondary"
                icon={<IconPause size={14} />}
                onClick={() => setDrillStatus('paused')}
              >
                Pause Drill
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<IconPlay size={14} />}
                onClick={() => setDrillStatus('running')}
              >
                Start Drill
              </Button>
            )}

            <Button
              variant="danger"
              icon={<IconSlash size={14} />}
              onClick={handleEndDrill}
              disabled={orders.length === 0}
            >
              End Drill
            </Button>

            <Button
              variant="secondary"
              icon={<IconRefreshCw size={14} />}
              onClick={handleResetDrill}
              disabled={orders.length === 0 && drillStatus === 'idle'}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Speed mode selectors & top statistics */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink-secondary)' }}>
              Market Activity Pace:
            </span>
            <Badge
              variant={dynamicSettings.variant}
              size="md"
              icon={dynamicSettings.icon}
            >
              {dynamicSettings.paceLabel}
            </Badge>
            <span className="font-mono tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
              (Interval: {dynamicSettings.interval === 999999 ? 'Paused' : `${dynamicSettings.interval / 1000}s`})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Slips
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
                {orders.length}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gain)' }}>
                {completedOrders.length}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Queued Pending
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-loss)' }}>
                {pendingOrders.length}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Avg Processing
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
                {avgTime}s
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Desk Breakdown Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* Desk 1 Column */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconMonitor size={16} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
                Desk 1 Operations
              </h3>
            </div>
            <Badge variant={desk1.variant} size="sm">
              <span className="font-mono tabular-nums">{desk1.indicator} Avg: {desk1.avg}s ({desk1.completed}/{desk1.total})</span>
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '460px', minHeight: '260px' }}>
            {orders.filter(o => o.desk === 1).length === 0 ? (
              <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
                No slips assigned to Desk 1.
              </div>
            ) : (
              orders.filter(o => o.desk === 1).map(o => (
                <div
                  key={o.id}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-gain)' : 'var(--color-loss)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="font-mono tabular-nums" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-ink-primary)' }}>
                      {o.id}
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                      {new Date(o.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <div>Team: <strong className="font-mono tabular-nums">{o.teamCode}</strong></div>
                    <div>Ticker: <strong className="font-mono">{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-gain)' : 'var(--color-loss)' }}>{o.action}</strong></div>
                    <div>Qty: <strong className="font-mono tabular-nums">{o.quantity}</strong></div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-secondary)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<IconCheck size={12} />}
                        onClick={() => handleMarkDone(o.id)}
                      >
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Desk 2 Column */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconMonitor size={16} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
                Desk 2 Operations
              </h3>
            </div>
            <Badge variant={desk2.variant} size="sm">
              <span className="font-mono tabular-nums">{desk2.indicator} Avg: {desk2.avg}s ({desk2.completed}/{desk2.total})</span>
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '460px', minHeight: '260px' }}>
            {orders.filter(o => o.desk === 2).length === 0 ? (
              <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
                No slips assigned to Desk 2.
              </div>
            ) : (
              orders.filter(o => o.desk === 2).map(o => (
                <div
                  key={o.id}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-gain)' : 'var(--color-loss)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="font-mono tabular-nums" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-ink-primary)' }}>
                      {o.id}
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                      {new Date(o.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <div>Team: <strong className="font-mono tabular-nums">{o.teamCode}</strong></div>
                    <div>Ticker: <strong className="font-mono">{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-gain)' : 'var(--color-loss)' }}>{o.action}</strong></div>
                    <div>Qty: <strong className="font-mono tabular-nums">{o.quantity}</strong></div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-secondary)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<IconCheck size={12} />}
                        onClick={() => handleMarkDone(o.id)}
                      >
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Desk 3 Column */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border-subtle)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconMonitor size={16} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
                Desk 3 Operations
              </h3>
            </div>
            <Badge variant={desk3.variant} size="sm">
              <span className="font-mono tabular-nums">{desk3.indicator} Avg: {desk3.avg}s ({desk3.completed}/{desk3.total})</span>
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '460px', minHeight: '260px' }}>
            {orders.filter(o => o.desk === 3).length === 0 ? (
              <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
                No slips assigned to Desk 3.
              </div>
            ) : (
              orders.filter(o => o.desk === 3).map(o => (
                <div
                  key={o.id}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderLeft: `4px solid ${o.status === 'completed' ? 'var(--color-gain)' : 'var(--color-loss)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="font-mono tabular-nums" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-ink-primary)' }}>
                      {o.id}
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                      {new Date(o.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <div>Team: <strong className="font-mono tabular-nums">{o.teamCode}</strong></div>
                    <div>Ticker: <strong className="font-mono">{o.ticker}</strong></div>
                    <div>Action: <strong style={{ color: o.action === 'BUY' ? 'var(--color-gain)' : 'var(--color-loss)' }}>{o.action}</strong></div>
                    <div>Qty: <strong className="font-mono tabular-nums">{o.quantity}</strong></div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-secondary)', fontStyle: 'italic', marginBottom: '10px' }}>
                    "{o.rationale}"
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderElapsedTime(o)}
                    {o.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<IconCheck size={12} />}
                        onClick={() => handleMarkDone(o.id)}
                      >
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* 4. Performance Log Table */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBarChart size={18} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink-primary)' }}>
              Performance Log
            </h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconDownload size={14} />}
            onClick={handleExportCSV}
            disabled={orders.length === 0}
          >
            Export CSV
          </Button>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--color-surface-sunken)',
                borderBottom: '1px solid var(--color-border-subtle)',
                color: 'var(--color-ink-secondary)',
                textTransform: 'uppercase',
                fontSize: '0.72rem',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '10px 14px' }}>#</th>
                <th style={{ padding: '10px 14px' }}>Desk</th>
                <th style={{ padding: '10px 14px' }}>Team</th>
                <th style={{ padding: '10px 14px' }}>Security</th>
                <th style={{ padding: '10px 14px' }}>Action</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '10px 14px' }}>Gen Time</th>
                <th style={{ padding: '10px 14px' }}>Done Time</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Seconds</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                    No orders recorded yet. Start drill to begin performance logging.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {o.id}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px' }}>
                      Desk {o.desk}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {o.teamCode}
                    </td>
                    <td className="font-mono" style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {o.ticker}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: o.action === 'BUY' ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                      {o.action}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {o.quantity}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', color: 'var(--color-ink-muted)' }}>
                      {new Date(o.generatedAt).toLocaleTimeString()}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', color: 'var(--color-ink-muted)' }}>
                      {o.completedAt ? new Date(o.completedAt).toLocaleTimeString() : 'pending'}
                    </td>
                    <td className="font-mono tabular-nums" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                      {o.elapsedSeconds !== null ? `${o.elapsedSeconds}s` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Summary Modal */}
      <Modal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Drill Session Complete"
        subtitle="Review throughput metrics, desk bottlenecks, and operational coaching recommendations."
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: 'var(--color-surface-sunken)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', textTransform: 'uppercase', display: 'block' }}>
                Total Slips
              </span>
              <strong className="font-mono tabular-nums" style={{ fontSize: '1.2rem', color: 'var(--color-ink-primary)' }}>
                {orders.length}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', textTransform: 'uppercase', display: 'block' }}>
                Completed
              </span>
              <strong className="font-mono tabular-nums" style={{ fontSize: '1.2rem', color: 'var(--color-gain)' }}>
                {completedOrders.length}
              </strong>
            </div>

            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', textTransform: 'uppercase', display: 'block' }}>
                Overall Average
              </span>
              <strong
                className="font-mono tabular-nums"
                style={{
                  fontSize: '1.4rem',
                  color: avgTime <= 10 ? 'var(--color-gain)' : avgTime <= 20 ? 'var(--color-brass)' : 'var(--color-loss)'
                }}
              >
                {avgTime}s
              </strong>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-ink-secondary)', letterSpacing: '0.05em' }}>
              Desk Metrics Breakdown
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Desk 1:</span>
                <span className="font-mono tabular-nums">
                  <strong>{desk1.avg}s</strong> average ({desk1.completed} orders)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Desk 2:</span>
                <span className="font-mono tabular-nums">
                  <strong>{desk2.avg}s</strong> average ({desk2.completed} orders)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Desk 3:</span>
                <span className="font-mono tabular-nums">
                  <strong>{desk3.avg}s</strong> average ({desk3.completed} orders)
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-ink-secondary)', letterSpacing: '0.05em' }}>
              Operational Coach Recommendations
            </h4>
            {recLoading ? (
              <div style={{ fontStyle: 'italic', color: 'var(--color-ink-muted)', fontSize: '0.85rem' }}>
                Generating recommendations from operations coach...
              </div>
            ) : (
              <p style={{
                margin: 0,
                fontSize: '0.88rem',
                lineHeight: 1.5,
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: '6px',
                borderLeft: '3px solid var(--color-brass)',
                color: 'var(--color-ink-primary)'
              }}>
                {recommendation}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px' }}>
            <Button variant="secondary" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button variant="primary" onClick={handleResetDrill}>
              Run Again
            </Button>
            <Button variant="ghost" onClick={() => setShowSummary(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
