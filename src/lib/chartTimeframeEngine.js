/**
 * SAAMX '26 — Interactive Market Chart & Timeframe Engine
 * 
 * Provides deterministic and empirical price point generation across 5 standard financial timeframes:
 * - 1D: Intraday minute / 5-minute ticks for the current trading session (09:15 - 15:30)
 * - 1W: Hourly / daily historical observations over the past 7 calendar days (Mon - Fri)
 * - 1M: Daily observations over the past 30 calendar days
 * - 3M: Weekly / bi-weekly observations over the past 90 calendar days
 * - 1Y: Bi-weekly / monthly observations over the past 365 calendar days
 * 
 * Handles both simulated SAAMX universe securities (anchored to priceHistory, basePrice, previousClose, dayHigh, dayLow)
 * and external market indices (Nifty 50, S&P 500, FTSE 100, Hang Seng) with honest provenance labels.
 */

// Simple string hash to generate a stable integer seed for deterministic curves
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pseudo-random number generator with seed
function createPrng(seed) {
  let s = (seed % 2147483647) || 1;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate SVG Path string with smooth cubic Bezier curves
 */
export function generateSmoothSvgPath(points, width, height, padding = { top: 20, bottom: 20, left: 10, right: 10 }) {
  const sanitizedPoints = (points || [])
    .filter(p => p && typeof p === 'object' && Number.isFinite(Number(p.price)))
    .map(p => ({ ...p, price: Number(p.price) }));

  if (sanitizedPoints.length === 0) return { pathD: '', areaD: '', vertices: [] };
  if (sanitizedPoints.length === 1) {
    const y = height / 2;
    return {
      pathD: `M ${padding.left} ${y} L ${width - padding.right} ${y}`,
      areaD: `M ${padding.left} ${y} L ${width - padding.right} ${y} L ${width - padding.right} ${height} L ${padding.left} ${height} Z`,
      vertices: [{ x: width / 2, y, price: sanitizedPoints[0].price }]
    };
  }

  const prices = sanitizedPoints.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = (maxPrice - minPrice) || (maxPrice * 0.02) || 1;
  const safePriceRange = Number.isFinite(priceRange) && priceRange > 0 ? priceRange : 1;
  const safeMinPrice = Number.isFinite(minPrice) ? minPrice : 0;

  const chartWidth = Math.max(1, width - padding.left - padding.right);
  const chartHeight = Math.max(1, height - padding.top - padding.bottom);

  const coords = sanitizedPoints.map((p, idx) => {
    const x = padding.left + (idx / (sanitizedPoints.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((p.price - safeMinPrice) / safePriceRange) * chartHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), price: p.price, label: p.label, dateStr: p.dateStr };
  });

  // Build cubic Bezier curve command
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const prev = coords[i - 1] || curr;
    const nextNext = coords[i + 2] || next;

    // Catmull-Rom to Cubic Bezier conversion
    const tension = 0.25;
    const cp1x = curr.x + (next.x - prev.x) * tension;
    const cp1y = curr.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (nextNext.x - curr.x) * tension;
    const cp2y = next.y - (nextNext.y - curr.y) * tension;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x} ${next.y}`;
  }

  const lastCoord = coords[coords.length - 1];
  const firstCoord = coords[0];
  const areaD = `${pathD} L ${lastCoord.x} ${height} L ${firstCoord.x} ${height} Z`;

  return {
    pathD,
    areaD,
    vertices: coords,
    minPrice: safeMinPrice,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : safeMinPrice
  };
}

/**
 * Generate historical observation points for an instrument and timeframe
 */
export function generateTimeframeData(instrument, timeframe = '1D', state = null) {
  if (!instrument) {
    instrument = {
      name: 'Nifty 50',
      type: 'INDEX',
      currentPrice: 24852.60,
      previousClose: 24553.05,
      isUp: true
    };
  }

  const rawCurrentPrice = instrument.currentPrice ?? instrument.price ?? instrument.value ?? 24852.60;
  const currentPrice = Number(rawCurrentPrice);
  const rawPrevClose = instrument.previousClose ?? instrument.prevClose ?? (currentPrice * 0.988);
  const previousClose = Number(rawPrevClose);
  const rawDayHigh = instrument.dayHigh ?? Math.max(currentPrice, previousClose) * 1.008;
  const dayHigh = Number(rawDayHigh);
  const rawDayLow = instrument.dayLow ?? Math.min(currentPrice, previousClose) * 0.992;
  const dayLow = Number(rawDayLow);
  const rawBasePrice = instrument.basePrice ?? previousClose;
  const basePrice = Number(rawBasePrice);

  const VALID_TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'];
  const activeTimeframe = (typeof timeframe === 'string' && VALID_TIMEFRAMES.includes(timeframe))
    ? timeframe
    : '1D';

  const identifier = instrument.id || instrument.ticker || instrument.name || 'INSTRUMENT';
  const seed = hashString(identifier + '_' + activeTimeframe);
  const rng = createPrng(seed);

  // Check if simulated security has real recorded priceHistory in current session
  const realHistory = Array.isArray(instrument.priceHistory)
    ? instrument.priceHistory.filter(h => h && typeof h === 'object' && h.price !== null && h.price !== undefined && !Number.isNaN(Number(h.price)) && Number.isFinite(Number(h.price)))
    : null;

  let points = [];
  let xAxisLabels = [];
  let sourceLabel = '';
  let isLive = false;
  let isSimulatedLive = false;

  switch (activeTimeframe) {
    case '1D': {
      xAxisLabels = ['09:30', '11:00', '12:30', '14:00', '15:30'];
      const hasRealHistory = Boolean(realHistory && realHistory.length >= 5);
      sourceLabel = hasRealHistory ? 'Session Intraday Ticks (Live)' : 'Intraday Simulated Trajectory';
      isLive = hasRealHistory;
      isSimulatedLive = !hasRealHistory;

      if (hasRealHistory) {
        // Sample recorded history down to 12-16 points
        const step = Math.max(1, Math.floor(realHistory.length / 14));
        points = realHistory.filter((_, idx) => idx % step === 0).map((h, i) => ({
          price: Number(h.price),
          label: new Date(h.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: 'Today'
        }));
        // Ensure last point is exactly currentPrice
        points[points.length - 1] = {
          price: currentPrice,
          label: '15:30',
          dateStr: 'Today'
        };
      } else {
        // Construct realistic session curve anchored between previousClose and currentPrice
        const hours = [
          '09:15', '09:45', '10:15', '10:45', '11:15', '11:45',
          '12:15', '12:45', '13:15', '13:45', '14:15', '14:45', '15:15', '15:30'
        ];
        const numPoints = hours.length;
        points.push({ price: previousClose, label: '09:15', dateStr: 'Open' });

        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          // Baseline linear trend towards current price
          const baseline = previousClose + (currentPrice - previousClose) * t;
          // Add intraday wave oscillation
          const wave = Math.sin(t * Math.PI * 2.2) * ((dayHigh - dayLow) * 0.28);
          // Add micro jitter from PRNG
          const jitter = (rng() - 0.5) * ((dayHigh - dayLow) * 0.15);
          const price = Math.max(dayLow, Math.min(dayHigh, baseline + wave + jitter));
          points.push({
            price: Number(price.toFixed(2)),
            label: hours[i],
            dateStr: 'Today'
          });
        }
        points.push({ price: currentPrice, label: '15:30', dateStr: 'Close' });
      }
      break;
    }

    case '1W': {
      xAxisLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      sourceLabel = 'Past 7 Calendar Days • Simulated Closes';
      
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const weekVolatility = 0.035; // ~3.5% weekly amplitude
      const startPrice = previousClose * (1 - (rng() - 0.45) * weekVolatility);
      
      points.push({ price: Number(startPrice.toFixed(2)), label: 'Mon', dateStr: 'Day -4' });
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const trend = startPrice + (currentPrice - startPrice) * t;
        const swing = (rng() - 0.5) * (currentPrice * weekVolatility * 0.8);
        points.push({
          price: Number((trend + swing).toFixed(2)),
          label: days[i],
          dateStr: `Day -${4 - i}`
        });
      }
      points.push({ price: currentPrice, label: 'Fri', dateStr: 'Today' });
      break;
    }

    case '1M': {
      xAxisLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Today'];
      sourceLabel = 'Past 30 Calendar Days • Simulated Model';
      
      const monthSteps = 10;
      const monthVol = 0.065;
      const startPrice = previousClose * (1 - (rng() - 0.48) * monthVol);
      
      for (let i = 0; i < monthSteps; i++) {
        const t = i / (monthSteps - 1);
        const baseline = startPrice + (currentPrice - startPrice) * t;
        const cycle = Math.sin(t * Math.PI * 3) * (currentPrice * monthVol * 0.35);
        const noise = (rng() - 0.5) * (currentPrice * monthVol * 0.25);
        const p = baseline + cycle + noise;
        points.push({
          price: i === monthSteps - 1 ? currentPrice : Number(p.toFixed(2)),
          label: `D-${Math.round(30 - t * 30)}`,
          dateStr: `${Math.round(30 - t * 30)}d ago`
        });
      }
      break;
    }

    case '3M': {
      const now = new Date();
      const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
      const monthNames = [];
      for (let offset = 2; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        monthNames.push(monthFormatter.format(d));
      }
      xAxisLabels = monthNames;
      sourceLabel = 'Past 90 Calendar Days • Simulated Trajectory';
      
      const quarterSteps = 13;
      const qVol = 0.11;
      const startPrice = previousClose * (1 - (rng() - 0.45) * qVol);
      
      for (let i = 0; i < quarterSteps; i++) {
        const t = i / (quarterSteps - 1);
        const baseline = startPrice + (currentPrice - startPrice) * t;
        const trendCurve = Math.cos(t * Math.PI * 2) * (currentPrice * qVol * 0.4);
        const noise = (rng() - 0.5) * (currentPrice * qVol * 0.2);
        const p = baseline + trendCurve + noise;
        points.push({
          price: i === quarterSteps - 1 ? currentPrice : Number(p.toFixed(2)),
          label: `Wk ${i + 1}`,
          dateStr: `Week ${i + 1}`
        });
      }
      break;
    }

    case '1Y': {
      xAxisLabels = ['Q1', 'Q2', 'Q3', 'Q4', 'Current'];
      sourceLabel = 'Past 365 Calendar Days • Illustrative Macro Trend';
      
      const yearSteps = 20;
      const yVol = 0.22;
      const startPrice = basePrice * (1 - (rng() - 0.42) * yVol);
      
      for (let i = 0; i < yearSteps; i++) {
        const t = i / (yearSteps - 1);
        const baseline = startPrice + (currentPrice - startPrice) * t;
        const macroCycle = Math.sin(t * Math.PI * 2.5) * (currentPrice * yVol * 0.3);
        const noise = (rng() - 0.5) * (currentPrice * yVol * 0.18);
        const p = baseline + macroCycle + noise;
        points.push({
          price: i === yearSteps - 1 ? currentPrice : Number(p.toFixed(2)),
          label: `M${Math.round(1 + t * 11)}`,
          dateStr: `Month ${Math.round(1 + t * 11)}`
        });
      }
      break;
    }

    default:
      break;
  }

  // Calculate return over the timeframe
  const firstPrice = points.length > 0 ? points[0].price : currentPrice;
  const lastPrice = points.length > 0 ? points[points.length - 1].price : currentPrice;
  const delta = lastPrice - firstPrice;
  const percentChange = firstPrice === 0 ? 0 : Number(((delta / firstPrice) * 100).toFixed(2));
  const isUp = delta >= 0;

  return {
    timeframe: activeTimeframe,
    points,
    xAxisLabels,
    sourceLabel,
    isLive,
    isSimulatedLive,
    firstPrice,
    lastPrice,
    delta,
    percentChange,
    isUp
  };
}
