/**
 * SAAMX '26 — Interactive Market Chart Timeframe Verification Suite
 * 
 * Tests the charting engine and UI responsiveness across all 5 timeframes (1D, 1W, 1M, 3M, 1Y)
 * for both simulated securities and external benchmark indices.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { generateTimeframeData, generateSmoothSvgPath } from './src/lib/chartTimeframeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINE_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, `test-state-chart-${Date.now()}-${process.pid}.json`);

const PORT = 3094;
const CDP_PORT = 9249;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function getFileHash(filepath) {
  const buf = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function apiRequest(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: pathUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runChartEngineUnitTests() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 1: CHART TIMEFRAME ENGINE MATHEMATICAL & GEOMETRIC INTEGRITY');
  console.log('======================================================================');

  const testInstruments = [
    { id: 'NIFTY50', name: 'Nifty 50', type: 'INDEX', currentPrice: 24852.60, previousClose: 24553.05 },
    { id: 'SP500', name: 'S&P 500', type: 'INDEX', currentPrice: 5826.31, previousClose: 5778.92 },
    { id: 'STK_RELIANCE_ea1e16', ticker: 'RELIANCE', name: 'Reliance Industries Ltd', currentPrice: 2651.76, previousClose: 2696.63, dayHigh: 2708.02, dayLow: 2638.90, basePrice: 2651.76 },
    { id: 'STK_DTAI_01', ticker: 'DTAI', name: 'DTAI Tech', currentPrice: 242.00, previousClose: 296.55, dayHigh: 298.00, dayLow: 238.00, basePrice: 296.55 }
  ];

  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  for (const inst of testInstruments) {
    console.log(`\n  Checking Instrument: ${inst.name} (${inst.id})`);
    const pathSignatures = new Set();

    for (const tf of timeframes) {
      const data = generateTimeframeData(inst, tf);

      // 1. Structure integrity
      assert.strictEqual(data.timeframe, tf, `Timeframe mismatch: expected ${tf}, got ${data.timeframe}`);
      assert.ok(Array.isArray(data.points) && data.points.length >= 5, `Expected >= 5 points for ${tf}, got ${data.points?.length}`);
      assert.ok(Array.isArray(data.xAxisLabels) && data.xAxisLabels.length >= 3, `Expected >= 3 X-axis labels for ${tf}`);
      assert.ok(data.sourceLabel && data.sourceLabel.length > 5, `Missing source label for ${tf}`);

      // 1b. Provenance transparency & Simulated/Illustrative disclosure
      const expectedLabels = {
        '1D': 'Intraday Simulated Trajectory',
        '1W': 'Past 7 Calendar Days • Simulated Closes',
        '1M': 'Past 30 Calendar Days • Simulated Model',
        '3M': 'Past 90 Calendar Days • Simulated Trajectory',
        '1Y': 'Past 365 Calendar Days • Illustrative Macro Trend'
      };
      assert.strictEqual(data.sourceLabel, expectedLabels[tf], `Expected sourceLabel '${expectedLabels[tf]}', got '${data.sourceLabel}'`);
      assert.ok(
        data.sourceLabel.includes('Simulated') || data.sourceLabel.includes('Illustrative'),
        `Synthetic curves must include 'Simulated' or 'Illustrative': ${data.sourceLabel}`
      );
      assert.strictEqual(data.isLive, false, `isLive must be false for synthetic curves without priceHistory`);

      // 1c. Dynamic 3M calendar month verification
      if (tf === '3M') {
        const now = new Date();
        const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
        const expectedMonths = [];
        for (let offset = 2; offset >= 0; offset--) {
          const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
          expectedMonths.push(monthFormatter.format(d));
        }
        assert.deepStrictEqual(data.xAxisLabels, expectedMonths, `3M X-axis labels must dynamically match current calendar months`);
      }

      // 2. Financial termination invariant
      assert.strictEqual(
        data.lastPrice,
        inst.currentPrice,
        `Final price must equal currentPrice (${inst.currentPrice}), got ${data.lastPrice}`
      );

      // 3. SVG Path generation
      const svg = generateSmoothSvgPath(data.points, 320, 140);
      assert.ok(svg.pathD.startsWith('M '), `pathD must start with 'M ': ${svg.pathD.slice(0, 20)}`);
      assert.ok(svg.pathD.includes(' C '), `pathD must include cubic Bezier 'C' curves: ${svg.pathD.slice(0, 40)}`);
      assert.ok(svg.areaD.endsWith(' Z'), `areaD must end with 'Z': ${svg.areaD.slice(-20)}`);
      assert.strictEqual(svg.vertices.length, data.points.length, `Vertex count must match points count`);

      // 4. Timeframe uniqueness
      pathSignatures.add(svg.pathD);

      // 5. Determinism test
      const dataRepeat = generateTimeframeData(inst, tf);
      const svgRepeat = generateSmoothSvgPath(dataRepeat.points, 320, 140);
      assert.strictEqual(
        svg.pathD,
        svgRepeat.pathD,
        `Deterministic generation must produce identical pathD across multiple calls`
      );

      console.log(`    ✓ [PASS] ${tf}: ${data.points.length} pts, Δ ${data.percentChange}%, Labels: [${data.xAxisLabels.join(', ')}], Source: "${data.sourceLabel}"`);
    }

    assert.strictEqual(pathSignatures.size, 5, `All 5 timeframes must produce unique paths for ${inst.name}`);
    console.log(`    ✓ [PASS] All 5 timeframes produce distinct geometries for ${inst.name}`);
  }
}

async function runLiveHistoryDownsamplingTests() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 1B: LIVE RECORDED TICKS & DOWNSAMPLING VERIFICATION');
  console.log('======================================================================');

  const now = Date.now();
  // Create 60 intraday recorded ticks (simulating active trading session)
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    ticks.push({
      price: Number((2500 + Math.sin(i / 5) * 20 + (i * 0.5)).toFixed(2)),
      timestamp: now - (60 - i) * 60000
    });
  }

  const liveInstrument = {
    id: 'STK_TEST_LIVE',
    ticker: 'LIVETEST',
    name: 'Live Ticks Test Stock',
    currentPrice: 2530.00,
    previousClose: 2490.00,
    dayHigh: 2540.00,
    dayLow: 2480.00,
    priceHistory: ticks
  };

  // 1. Verify 1D downsampling & live flags
  const live1D = generateTimeframeData(liveInstrument, '1D');
  assert.strictEqual(live1D.isLive, true, 'isLive must be true for 1D with >= 5 priceHistory ticks');
  assert.strictEqual(live1D.isSimulatedLive, false, 'isSimulatedLive must be false when real history is used');
  assert.strictEqual(live1D.sourceLabel, 'Session Intraday Ticks (Live)', 'sourceLabel must be Session Intraday Ticks (Live)');
  assert.ok(live1D.points.length >= 12 && live1D.points.length <= 16, `Points should be downsampled to 12-16 points, got ${live1D.points.length}`);
  assert.strictEqual(live1D.lastPrice, liveInstrument.currentPrice, 'Final point must strictly equal currentPrice');
  console.log(`  ✓ [PASS] 1D Live Ticks: ${live1D.points.length} downsampled points, isLive=${live1D.isLive}, Source: "${live1D.sourceLabel}"`);

  // 2. Verify that multi-day timeframes on live instruments remain transparently simulated
  const multiDayTfs = ['1W', '1M', '3M', '1Y'];
  for (const tf of multiDayTfs) {
    const simTf = generateTimeframeData(liveInstrument, tf);
    assert.strictEqual(simTf.isLive, false, `${tf} must have isLive === false even if instrument has priceHistory`);
    assert.ok(
      simTf.sourceLabel.includes('Simulated') || simTf.sourceLabel.includes('Illustrative'),
      `${tf} sourceLabel must disclose simulated nature: "${simTf.sourceLabel}"`
    );
    assert.strictEqual(simTf.lastPrice, liveInstrument.currentPrice, `Final price for ${tf} must match currentPrice`);
    console.log(`  ✓ [PASS] ${tf} on Live Instrument: isLive=${simTf.isLive}, Source: "${simTf.sourceLabel}"`);
  }

  // 3. Fallback when priceHistory has < 5 ticks (insufficient for live downsampling)
  const sparseHistoryInst = {
    id: 'STK_SPARSE_01',
    name: 'Sparse Ticks Stock',
    currentPrice: 120.00,
    previousClose: 118.00,
    priceHistory: [
      { price: 118.50, timestamp: now - 3600000 },
      { price: 119.20, timestamp: now - 1800000 }
    ]
  };
  const sparse1D = generateTimeframeData(sparseHistoryInst, '1D');
  assert.strictEqual(sparse1D.isLive, false, 'isLive must be false when priceHistory has < 5 ticks');
  assert.strictEqual(sparse1D.sourceLabel, 'Intraday Simulated Trajectory', 'Sparse history must fallback to Intraday Simulated Trajectory');
  assert.strictEqual(sparse1D.lastPrice, sparseHistoryInst.currentPrice, 'Final price must equal currentPrice');
  console.log(`  ✓ [PASS] Sparse History Fallback: < 5 ticks correctly uses simulated trajectory`);
}

async function runChartEngineEdgeCaseTests() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 1C: EDGE CASES & BOUNDARY VERIFICATION (ZERO & FLAT PRICES)');
  console.log('======================================================================');

  // Edge Case 1: currentPrice === 0 (delisted / liquidated security)
  const zeroPriceInst = {
    id: 'STK_ZERO_01',
    name: 'Delisted Corp',
    currentPrice: 0,
    previousClose: 10,
    dayHigh: 10,
    dayLow: 0
  };
  for (const tf of ['1D', '1W', '1M', '3M', '1Y']) {
    const dataZero = generateTimeframeData(zeroPriceInst, tf);
    assert.strictEqual(dataZero.lastPrice, 0, `Final price for delisted instrument on ${tf} must be 0`);
    assert.strictEqual(typeof dataZero.percentChange, 'number', 'percentChange must be a finite number');
    assert.ok(!Number.isNaN(dataZero.percentChange), 'percentChange must not be NaN');
    assert.strictEqual(dataZero.points[dataZero.points.length - 1].price, 0, 'Terminal point price must be 0');

    const svgZero = generateSmoothSvgPath(dataZero.points, 320, 140);
    assert.ok(svgZero.pathD.startsWith('M '), 'SVG path must be generated validly without NaN');
    assert.ok(!svgZero.pathD.includes('NaN'), 'SVG path must not contain NaN');
    assert.ok(!svgZero.areaD.includes('NaN'), 'SVG area must not contain NaN');
    console.log(`  ✓ [PASS] Zero-price security on ${tf}: Terminal price: 0, percentChange: ${dataZero.percentChange}%, Valid SVG`);
  }

  // Edge Case 2: dayHigh === dayLow (flat session / circuit-halted stock)
  const flatInst = {
    id: 'STK_FLAT_01',
    name: 'Flat Circuit Stock',
    currentPrice: 150.00,
    previousClose: 150.00,
    dayHigh: 150.00,
    dayLow: 150.00
  };
  for (const tf of ['1D', '1W', '1M', '3M', '1Y']) {
    const dataFlat = generateTimeframeData(flatInst, tf);
    assert.strictEqual(dataFlat.lastPrice, 150.00, `Final price for flat instrument on ${tf} must be 150.00`);
    const svgFlat = generateSmoothSvgPath(dataFlat.points, 320, 140);
    assert.ok(svgFlat.pathD.startsWith('M '), 'SVG path must be generated validly for flat instrument');
    assert.ok(!svgFlat.pathD.includes('NaN'), 'SVG path must not contain NaN');
    assert.ok(!svgFlat.areaD.includes('NaN'), 'SVG area must not contain NaN');
    console.log(`  ✓ [PASS] Flat-range security (dayHigh === dayLow) on ${tf}: Terminal price: 150.00, Valid SVG`);
  }
}

async function runBrowserCdpChartTests() {
  console.log('\n======================================================================');
  console.log('🧪 SUITE 2: REAL-BROWSER CDP TIMEFRAME & INTERACTION VERIFICATION');
  console.log('======================================================================');

  // Verify baseline hash before launching anything
  const preHash = getFileHash(ORIGINAL_STATE);
  assert.strictEqual(preHash, BASELINE_HASH, 'Baseline hash mismatch before CDP tests');

  // Create isolated disposable state
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`  ✓ Created isolated disposable test state: ${path.basename(DISPOSABLE_STATE)}`);

  // Spawn isolated backend server
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: 'saamx-local-test-secret-32-chars-long'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverOnline = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await apiRequest('GET', '/api/ping');
      if (res.status === 200) { serverOnline = true; break; }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!serverOnline) throw new Error('Isolated server failed to start within timeout.');
  console.log(`  ✓ Isolated backend online on http://127.0.0.1:${PORT}`);

  // Perform authentic login to obtain valid token
  const teamLogin = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
  assert.strictEqual(teamLogin.status, 200, 'Team login must succeed');
  const token = teamLogin.data?.token || 'mock-team-token';
  console.log(`  ✓ Authenticated as T01 (token obtained)`);

  let chromeProcess = null;

  try {
    // Launch headless Chrome
    chromeProcess = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-gpu',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-sandbox',
      '--safebrowsing-disable-auto-update',
      '--window-size=1440,900',
      'about:blank'
    ]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Connect to CDP target
    const versionRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try {
            const list = JSON.parse(raw);
            const page = list.find(p => p.type === 'page') || list[0];
            if (page) resolve(page.webSocketDebuggerUrl);
            else reject(new Error('No page target found'));
          } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket(versionRes);

    let id = 1;
    function sendCdp(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = msg => {
          const parsed = JSON.parse(msg.toString());
          if (parsed.id === msgId) {
            ws.off('message', handler);
            if (parsed.error) reject(new Error(parsed.error.message));
            else resolve(parsed.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    await sendCdp('Page.enable');
    await sendCdp('Runtime.enable');

    // Navigate to root first
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Inject session storage credentials
    await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        sessionStorage.setItem('saamx_token', '${token}');
        sessionStorage.setItem('saamx_role', 'team');
        sessionStorage.setItem('saamx_username', 'T01');
        sessionStorage.setItem('fms_authenticated', 'true');
        sessionStorage.setItem('fms_role', 'team');
        sessionStorage.setItem('fms_username', 'T01');
      })()`,
      returnByValue: true
    });

    // Navigate to Workstation Terminal and reload to hydrate sessionStorage into React state
    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/#/team` });
    await sendCdp('Page.reload');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify page content loaded
    const pageCheck = await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        return {
          title: document.title,
          hasMarketOverview: document.body.innerText.includes('Market Overview'),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean)
        };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ Workstation loaded, Market Overview present: ${pageCheck.result.value.hasMarketOverview}`);
    assert.ok(pageCheck.result.value.hasMarketOverview, 'Market Overview must be present on workstation');

    // Verify that when an index with zero live ticks (e.g. SAAMX INDIA 50 default) is viewed on 1D,
    // the status badge truthfully renders 'Simulated Model' and NOT 'Live'
    const badgeCheck = await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        const btn1D = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '1D');
        const headerContainer = btn1D ? btn1D.parentElement.parentElement : document;

        const divs = Array.from(headerContainer.querySelectorAll('div, span'));
        const badge = divs.find(d => d.textContent.trim() === 'Simulated Model' || d.textContent.trim() === 'Live');
        const sourceLabelEl = divs.find(d => d.textContent.includes('Intraday Simulated Trajectory') || d.textContent.includes('Simulated'));

        return {
          foundBadge: Boolean(badge),
          badgeText: badge ? badge.textContent.trim() : null,
          foundSourceLabel: Boolean(sourceLabelEl),
          sourceLabelText: sourceLabelEl ? sourceLabelEl.textContent.trim() : null
        };
      })()`,
      returnByValue: true
    });

    console.log(`  ✓ [PASS] Status badge on 1D for index without live ticks: "${badgeCheck.result.value.badgeText}", sourceLabel: "${badgeCheck.result.value.sourceLabelText}"`);
    assert.ok(badgeCheck.result.value.foundBadge, 'Status badge must be present in DOM');
    assert.strictEqual(badgeCheck.result.value.badgeText, 'Simulated Model', 'Benchmark index without live recorded ticks MUST display "Simulated Model", NOT "Live"');
    assert.notStrictEqual(badgeCheck.result.value.badgeText, 'Live', 'Deceptive "Live" badge must not be shown when instrument lacks genuine recorded ticks');

    // Test clicking all 5 timeframe buttons
    const tfs = ['1D', '1W', '1M', '3M', '1Y'];
    for (const tf of tfs) {
      const clickRes = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.trim() === '${tf}');
          if (!btn) return { found: false };
          btn.click();
          return { found: true };
        })()`,
        returnByValue: true
      });

      assert.ok(clickRes.result.value.found, `Found and clicked ${tf} button`);
      await new Promise(resolve => setTimeout(resolve, 400));

      const pathRes = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const svgs = Array.from(document.querySelectorAll('svg'));
          const chartSvg = svgs.find(s => s.querySelector('path[stroke="#FF6800"]') || s.querySelector('path[stroke="var(--color-orange, #FF6800)"]'));
          if (!chartSvg) return { foundSvg: false };
          const path = chartSvg.querySelector('path[stroke]');
          return {
            foundSvg: true,
            d: path ? path.getAttribute('d') : null,
            viewBox: chartSvg.getAttribute('viewBox')
          };
        })()`,
        returnByValue: true
      });

      assert.ok(pathRes.result.value.foundSvg, `Found rendered chart SVG for ${tf}`);
      assert.ok(pathRes.result.value.d && pathRes.result.value.d.startsWith('M'), `Valid path d attribute for ${tf}`);
      console.log(`  ✓ [PASS] Browser CDP Timeframe ${tf} Click: SVG rendered, path: "${pathRes.result.value.d.slice(0, 35)}..."`);
    }

    // Test clicking an item in the mini table (e.g. S&P 500)
    const selectRes = await sendCdp('Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('S&P 500') && d.textContent.includes('5,826.31'));
        if (items.length === 0) return { foundRow: false };
        items[0].click();
        return { foundRow: true, text: items[0].textContent.trim().slice(0, 30) };
      })()`,
      returnByValue: true
    });
    assert.ok(selectRes.result.value.foundRow, 'Found and clicked S&P 500 item row');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`  ✓ [PASS] Browser CDP Item Selection: Clicked S&P 500 row: "${selectRes.result.value.text}"`);

    ws.close();
  } finally {
    if (chromeProcess) chromeProcess.kill();
    serverProcess.kill();
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    }
  }
}

async function main() {
  console.log('======================================================================');
  console.log('📈 SAAMX MARKET CHART & TIMEFRAME AUDIT SUITE');
  console.log('======================================================================');

  await runChartEngineUnitTests();
  await runLiveHistoryDownsamplingTests();
  await runChartEngineEdgeCaseTests();
  await runBrowserCdpChartTests();

  // Post-flight hash check
  const postHash = getFileHash(ORIGINAL_STATE);
  assert.strictEqual(postHash, BASELINE_HASH, 'State hash corrupted during test execution');
  console.log(`\n✓ state.json SHA-256 strictly preserved: ${postHash}`);
  console.log('\n======================================================================');
  console.log('🎉 ALL MARKET CHART TIMEFRAME TESTS PASSED 100%');
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
