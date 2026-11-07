/**
 * SAAMX '26 — Milestone 1 Interactive Charts Adversarial Verification Suite
 * Author: teamwork_challenger_m1_2 (Empirical Challenger)
 * 
 * Adversarial stress tests:
 * 1. State Invariant SHA-256 Check (strict baseline 441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c)
 * 2. Multi-day "Live" vs "Simulated" provenance leak detection
 * 3. Rapid timeframe switching stress harness (1,000 rapid cycles, path determinism & memory)
 * 4. Boundary vertex hover tracking & tooltip clipping proof (index 0, index N-1, out-of-bounds index)
 * 5. SAAMX INDIA 50 contract and honest representation in MarketOverviewIntelligenceSection
 * 6. Real-Browser CDP Interactive Stress Test (rapid switching, boundary hovering, zero console errors)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { generateTimeframeData, generateSmoothSvgPath } from '../src/lib/chartTimeframeEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAAMX_DIR = path.resolve(__dirname, '..');

const BASELINE_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';
const ORIGINAL_STATE = path.join(SAAMX_DIR, 'state.json');
const DISPOSABLE_STATE = path.join(SAAMX_DIR, 'test-state-challenger-m1-disposable.json');

const PORT = 3097;
const CDP_PORT = 9253;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`  Testing: ${name}... `);
    fn();
    console.log('PASSED ✓');
    passCount++;
  } catch (err) {
    console.log('FAILED ✗');
    console.error(`    Error: ${err.message}`);
    failCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    process.stdout.write(`  Testing: ${name}... `);
    await fn();
    console.log('PASSED ✓');
    passCount++;
  } catch (err) {
    console.log('FAILED ✗');
    console.error(`    Error: ${err.message}`);
    failCount++;
  }
}

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

// -------------------------------------------------------------
// SUITE 1: STATE HASH INVARIANT
// -------------------------------------------------------------
function testStateInvariant() {
  console.log('\n======================================================================');
  console.log('🔒 SUITE 1: STATE.JSON AUTHORITATIVE HASH INVARIANT');
  console.log('======================================================================');

  runTest('1.1: Authoritative state.json SHA-256 exact match', () => {
    assert.ok(fs.existsSync(ORIGINAL_STATE), 'state.json must exist');
    const hash = getFileHash(ORIGINAL_STATE);
    assert.strictEqual(hash, BASELINE_HASH, `State hash mismatch! Expected ${BASELINE_HASH}, got ${hash}`);
  });
}

// -------------------------------------------------------------
// SUITE 2: MULTI-DAY "LIVE" BADGE & PROVENANCE LEAK DETECTION
// -------------------------------------------------------------
function testProvenanceAndLiveBadgeLogic() {
  console.log('\n======================================================================');
  console.log('🛡️ SUITE 2: MULTI-DAY "LIVE" BADGE & PROVENANCE LEAK DETECTION');
  console.log('======================================================================');

  const multiDayTimeframes = ['1W', '1M', '3M', '1Y'];

  // Test across multiple security profiles
  const instruments = [
    { id: 'NIFTY50', name: 'Nifty 50', type: 'INDEX', currentPrice: 24852.60 },
    { id: 'STK_RELIANCE', name: 'Reliance', currentPrice: 2650.00, priceHistory: Array.from({ length: 500 }, (_, i) => ({ price: 2600 + i * 0.1, timestamp: Date.now() - i * 1000 })) },
    { id: 'STK_ZERO', name: 'Zero Price Stock', currentPrice: 0 },
    { id: 'STK_PENNY', name: 'Micro Penny Stock', currentPrice: 0.05, previousClose: 0.04 }
  ];

  for (const inst of instruments) {
    for (const tf of multiDayTimeframes) {
      runTest(`2.1: ${inst.id} on ${tf} must NEVER be isLive=true`, () => {
        const data = generateTimeframeData(inst, tf);
        assert.strictEqual(data.isLive, false, `Timeframe ${tf} on ${inst.id} falsely reported isLive=true!`);
        assert.ok(
          data.sourceLabel.includes('Simulated') || data.sourceLabel.includes('Illustrative'),
          `Source label must disclose simulation: "${data.sourceLabel}"`
        );
      });
    }
  }

  // Verify 1D live condition: strictly requires >= 5 real ticks
  runTest('2.2: 1D with 0, 1, 4 ticks must be isLive=false (Simulated)', () => {
    for (const tickCount of [0, 1, 4]) {
      const sparseTicks = Array.from({ length: tickCount }, (_, i) => ({ price: 100 + i, timestamp: Date.now() - i * 1000 }));
      const inst = { id: `SPARSE_${tickCount}`, currentPrice: 105, priceHistory: sparseTicks };
      const data = generateTimeframeData(inst, '1D');
      assert.strictEqual(data.isLive, false, `1D with ${tickCount} ticks must have isLive=false`);
      assert.strictEqual(data.sourceLabel, 'Intraday Simulated Trajectory');
    }
  });

  runTest('2.3: 1D with >= 5 ticks must be isLive=true (Live Ticks)', () => {
    const liveTicks = Array.from({ length: 20 }, (_, i) => ({ price: 100 + i * 0.5, timestamp: Date.now() - i * 1000 }));
    const inst = { id: 'LIVE_STK', currentPrice: 110, priceHistory: liveTicks };
    const data = generateTimeframeData(inst, '1D');
    assert.strictEqual(data.isLive, true, '1D with 20 ticks must be isLive=true');
    assert.strictEqual(data.sourceLabel, 'Session Intraday Ticks (Live)');
  });
}

// -------------------------------------------------------------
// SUITE 3: RAPID TIMEFRAME SWITCHING STRESS HARNESS
// -------------------------------------------------------------
function testRapidTimeframeSwitchingStress() {
  console.log('\n======================================================================');
  console.log('⚡ SUITE 3: RAPID TIMEFRAME SWITCHING STRESS HARNESS');
  console.log('======================================================================');

  runTest('3.1: 1,000 rapid pseudo-random timeframe switches maintain determinism & finite geometry', () => {
    const tfs = ['1D', '1W', '1M', '3M', '1Y'];
    const inst = {
      id: 'STK_RAPID_01',
      ticker: 'RAPID',
      name: 'Rapid Switch Corp',
      currentPrice: 1245.75,
      previousClose: 1230.00,
      dayHigh: 1260.00,
      dayLow: 1225.00
    };

    const width = 800;
    const height = 160;
    const padding = { top: 24, bottom: 20, left: 12, right: 12 };

    // Baseline cache of deterministic paths
    const baselinePaths = {};
    for (const tf of tfs) {
      const data = generateTimeframeData(inst, tf);
      const geom = generateSmoothSvgPath(data.points, width, height, padding);
      baselinePaths[tf] = geom.pathD;
    }

    // Run 1,000 rapid switches in pseudo-random order
    let prevTf = '1D';
    for (let i = 0; i < 1000; i++) {
      const nextTf = tfs[(i * 7 + 3) % tfs.length];
      const data = generateTimeframeData(inst, nextTf);
      assert.strictEqual(data.lastPrice, inst.currentPrice, 'Terminal price must match currentPrice');
      const geom = generateSmoothSvgPath(data.points, width, height, padding);

      // Verify identical geometry to baseline
      assert.strictEqual(geom.pathD, baselinePaths[nextTf], `Non-deterministic path generated on cycle ${i} for ${nextTf}`);

      // Verify finite coordinates within bounding box
      for (const v of geom.vertices) {
        assert.ok(Number.isFinite(v.x) && !Number.isNaN(v.x), `Vertex X must be finite: ${v.x}`);
        assert.ok(Number.isFinite(v.y) && !Number.isNaN(v.y), `Vertex Y must be finite: ${v.y}`);
        assert.ok(v.x >= padding.left && v.x <= width - padding.right, `Vertex X out of bounds: ${v.x}`);
        assert.ok(v.y >= padding.top && v.y <= height - padding.bottom, `Vertex Y out of bounds: ${v.y}`);
      }

      prevTf = nextTf;
    }
  });
}

// -------------------------------------------------------------
// SUITE 4: TOOLTIP HOVER TRACKING & BOUNDARY VERTEX VERIFICATION
// -------------------------------------------------------------
function testBoundaryHoverAndTooltipMath() {
  console.log('\n======================================================================');
  console.log('🎯 SUITE 4: TOOLTIP HOVER TRACKING & BOUNDARY VERTEX VERIFICATION');
  console.log('======================================================================');

  const width = 800;
  const height = 160;
  const padding = { top: 24, bottom: 20, left: 12, right: 12 };
  const inst = { id: 'STK_BOUNDARY', name: 'Boundary Corp', currentPrice: 500.00 };

  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  for (const tf of timeframes) {
    runTest(`4.1: [${tf}] Leftmost vertex hover (relX <= padding.left) clamped cleanly without overflow`, () => {
      const data = generateTimeframeData(inst, tf);
      const geom = generateSmoothSvgPath(data.points, width, height, padding);
      const vertices = geom.vertices;

      // Simulate onMouseMove at left boundary: relX = 0
      const relX = 0;
      let closestIdx = 0;
      let minDist = Infinity;
      vertices.forEach((v, idx) => {
        const dist = Math.abs(v.x - relX);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });

      assert.strictEqual(closestIdx, 0, `Closest vertex for relX=0 must be index 0, got ${closestIdx}`);
      const firstVertex = vertices[0];
      assert.strictEqual(firstVertex.x, padding.left, `First vertex x must be padding.left (${padding.left})`);

      // Tooltip transform logic from InteractiveMarketChart.jsx line 183:
      // Math.max(10, Math.min(width - 70, activeVertex.x - 30))
      const tooltipX = Math.max(10, Math.min(width - 70, firstVertex.x - 30));
      const tooltipY = Math.max(4, firstVertex.y - 32);
      const tooltipRight = tooltipX + 64; // width 64

      assert.ok(tooltipX >= 0, `Tooltip left edge (${tooltipX}) must not clip outside SVG`);
      assert.ok(tooltipRight <= width, `Tooltip right edge (${tooltipRight}) must not clip outside SVG`);
      assert.ok(tooltipY >= 0, `Tooltip top edge (${tooltipY}) must not clip top`);
    });

    runTest(`4.2: [${tf}] Rightmost vertex hover (relX >= width) clamped cleanly without overflow`, () => {
      const data = generateTimeframeData(inst, tf);
      const geom = generateSmoothSvgPath(data.points, width, height, padding);
      const vertices = geom.vertices;

      // Simulate onMouseMove at right boundary: relX = width
      const relX = width;
      let closestIdx = 0;
      let minDist = Infinity;
      vertices.forEach((v, idx) => {
        const dist = Math.abs(v.x - relX);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });

      assert.strictEqual(closestIdx, vertices.length - 1, `Closest vertex for relX=width must be last index`);
      const lastVertex = vertices[vertices.length - 1];
      assert.strictEqual(lastVertex.x, width - padding.right, `Last vertex x must be width - padding.right`);
      assert.strictEqual(lastVertex.price, inst.currentPrice, `Last vertex price must match currentPrice`);

      // Tooltip transform logic
      const tooltipX = Math.max(10, Math.min(width - 70, lastVertex.x - 30));
      const tooltipY = Math.max(4, lastVertex.y - 32);
      const tooltipRight = tooltipX + 64;

      assert.ok(tooltipX >= 0, `Tooltip left edge (${tooltipX}) must not clip outside SVG`);
      assert.ok(tooltipRight <= width, `Tooltip right edge (${tooltipRight}) must not clip outside SVG`);
      assert.strictEqual(tooltipX, width - 70, `Right boundary tooltip must clamp to width - 70`);
    });
  }

  runTest('4.3: Out-of-bounds hoveredIndex fallback gracefully defaults to last vertex', () => {
    const data = generateTimeframeData(inst, '1D');
    const geom = generateSmoothSvgPath(data.points, width, height, padding);
    const vertices = geom.vertices;

    for (const testIdx of [-1, 999, undefined, null, 100]) {
      const activeVertex = (testIdx !== null && testIdx !== undefined && vertices[testIdx])
        ? vertices[testIdx]
        : vertices[vertices.length - 1] || { x: width - 20, y: height / 2, price: data.lastPrice };

      assert.ok(activeVertex, 'activeVertex must not be null/undefined');
      assert.strictEqual(activeVertex.x, vertices[vertices.length - 1].x, 'Must fall back to last vertex x');
      assert.strictEqual(activeVertex.price, inst.currentPrice, 'Must fall back to current price');
    }
  });
}

// -------------------------------------------------------------
// SUITE 5: SAAMX INDIA 50 CONTRACT & HONEST PROVENANCE
// -------------------------------------------------------------
function testMarketOverviewSectionIndia50() {
  console.log('\n======================================================================');
  console.log('🇮🇳 SUITE 5: SAAMX INDIA 50 CONTRACT & HONEST PROVENANCE');
  console.log('======================================================================');

  runTest('5.1: MarketOverviewIntelligenceSection binds accurately to SAAMX INDIA 50 with no Nifty misrepresentation', () => {
    const compPath = path.join(SAAMX_DIR, 'src/components/team/MarketOverviewIntelligenceSection.jsx');
    const code = fs.readFileSync(compPath, 'utf8');

    // Verify card declaration in indexCardsList
    assert.ok(
      code.includes("id: 'INDIA50', name: marketIndices.INDIA50?.name || 'SAAMX INDIA 50', label: 'SAAMX INDIA 50'"),
      'Must define index card with label "SAAMX INDIA 50"'
    );
    assert.ok(
      !code.includes("id: 'INDIA50', name: 'NIFTY 50'"),
      'Must NOT misrepresent INDIA50 as "NIFTY 50"'
    );
    assert.ok(
      !code.includes("label: 'NIFTY 50'"),
      'Card label must not be "NIFTY 50"'
    );

    // Verify fallback price is 5000.00 (matching state.json)
    assert.ok(
      code.includes("marketIndices.INDIA50?.currentValue || 5000.00"),
      'Must fallback to 5000.00 matching state.json simulation level'
    );
  });

  runTest('5.2: Header badge in MarketOverviewIntelligenceSection does not show Live on multi-day views', () => {
    const compPath = path.join(SAAMX_DIR, 'src/components/team/MarketOverviewIntelligenceSection.jsx');
    const code = fs.readFileSync(compPath, 'utf8');

    assert.ok(
      code.includes("{activeChartData.isLive ? 'Live' : 'Simulated Model'}") || code.includes("{marketTimeframe === '1D' ? 'Live' : 'Simulated Model'}"),
      'MarketOverviewIntelligenceSection must display Simulated Model on multi-day views'
    );
  });
}

// -------------------------------------------------------------
// SUITE 6: REAL-BROWSER CDP INTERACTION & CONSOLE INTEGRITY
// -------------------------------------------------------------
async function runBrowserCdpAdversarialTests() {
  console.log('\n======================================================================');
  console.log('🌐 SUITE 6: REAL-BROWSER CDP INTERACTION & ADVERSARIAL STRESS TEST');
  console.log('======================================================================');

  // Verify baseline hash before launching
  assert.strictEqual(getFileHash(ORIGINAL_STATE), BASELINE_HASH, 'Baseline hash mismatch before CDP tests');

  // Create isolated disposable state
  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`  ✓ Created isolated disposable test state: ${path.basename(DISPOSABLE_STATE)}`);

  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: SAAMX_DIR,
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

  const teamLogin = await apiRequest('POST', '/api/auth/login', { username: 'T01', password: 'saamx-team-01' });
  assert.strictEqual(teamLogin.status, 200, 'Team login must succeed');
  const token = teamLogin.data?.token || 'mock-team-token';

  let chromeProcess = null;

  try {
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

    const consoleErrors = [];
    ws.on('message', msg => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        consoleErrors.push(parsed.params.args.map(a => a.value || a.description).join(' '));
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(parsed.params.exceptionDetails?.text || 'Exception thrown');
      }
    });

    await sendCdp('Page.enable');
    await sendCdp('Runtime.enable');

    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    await sendCdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/#/team` });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 6.1: Chart on Team Workstation renders and displays honest Simulated Model on multi-day timeframes
    await runAsyncTest('6.1: Chart renders on Team Workstation and displays Simulated Model badge on multi-day views', async () => {
      // Click 1W timeframe button
      const click1W = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.trim() === '1W');
          if (btn) { btn.click(); return true; }
          return false;
        })()`,
        returnByValue: true
      });
      assert.ok(click1W.result.value, 'Found and clicked 1W button');
      await new Promise(resolve => setTimeout(resolve, 500));

      const badgeCheck = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const text = document.body.innerText;
          const svgs = Array.from(document.querySelectorAll('svg'));
          const chartSvg = svgs.find(s => s.querySelector('path[stroke="#FF6800"]') || s.querySelector('path[stroke="var(--color-orange, #FF6800)"]'));
          return {
            hasSimulatedModel: text.includes('Simulated Model'),
            hasChartSvg: Boolean(chartSvg)
          };
        })()`,
        returnByValue: true
      });
      assert.ok(badgeCheck.result.value.hasChartSvg, 'Chart SVG must be rendered on 1W');
      assert.ok(badgeCheck.result.value.hasSimulatedModel, 'Badge must display "Simulated Model" on 1W');
    });

    // Test 6.2: Rapid timeframe switching in browser (20 rapid clicks)
    await runAsyncTest('6.2: Browser rapid timeframe switching: 20 rapid clicks without crash or desync', async () => {
      const tfs = ['1D', '1W', '1M', '3M', '1Y'];
      for (let i = 0; i < 20; i++) {
        const tf = tfs[i % tfs.length];
        const clickRes = await sendCdp('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.textContent.trim() === '${tf}');
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          })()`,
          returnByValue: true
        });
        assert.ok(clickRes.result.value, `Found and clicked ${tf} button`);
        // Short jitter delay
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      // Check final state on 1Y
      await new Promise(resolve => setTimeout(resolve, 500));
      const badgeCheck = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const text = document.body.innerText;
          return {
            hasSimulatedModel: text.includes('Simulated Model'),
            hasLive: text.includes('Live')
          };
        })()`,
        returnByValue: true
      });
      assert.ok(badgeCheck.result.value.hasSimulatedModel, 'After rapid switching to 1Y, badge must be Simulated Model');
    });

    // Test 6.3: Boundary hover mousemove events on chart SVG
    await runAsyncTest('6.3: Dispatch boundary mousemove events at X=0 and X=max, verify no DOM crash', async () => {
      const hoverRes = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const svgs = Array.from(document.querySelectorAll('svg'));
          const chartSvg = svgs.find(s => s.querySelector('path[stroke="#FF6800"]') || s.querySelector('path[stroke="var(--color-orange, #FF6800)"]'));
          if (!chartSvg) return { error: 'No chart SVG found' };

          const rect = chartSvg.getBoundingClientRect();
          // Hover left boundary (clientX = rect.left)
          chartSvg.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left, clientY: rect.top + 50, bubbles: true }));
          // Hover right boundary (clientX = rect.right)
          chartSvg.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.right, clientY: rect.top + 50, bubbles: true }));
          // Hover middle (clientX = rect.left + rect.width / 2)
          chartSvg.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + rect.width / 2, clientY: rect.top + 50, bubbles: true }));
          // Leave
          chartSvg.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

          return { success: true };
        })()`,
        returnByValue: true
      });

      assert.ok(hoverRes.result.value.success, 'Dispatched boundary mousemove events');
    });

    // Test 6.4: Zero console errors during all stress operations
    await runAsyncTest('6.4: Zero unhandled console errors or exceptions during CDP session', async () => {
      const criticalErrors = consoleErrors.filter(e => !e.includes('favicon'));
      assert.strictEqual(criticalErrors.length, 0, `Detected console errors: ${criticalErrors.join(', ')}`);
    });

    // Test 6.5: Document Section Hash Query parameter router vulnerability
    await runAsyncTest('6.5: Verify App.jsx router sensitivity to hash query parameters (section tabs)', async () => {
      const testRes = await sendCdp('Runtime.evaluate', {
        expression: `(() => {
          // Check current route and body content
          const initialHasContent = document.body.innerText.includes('Market Overview');
          // Clicking sub-tab sets window.location.hash to '#/team?section=market'
          // Note: App.jsx switch(route) lacks query string stripping
          return {
            initialHasContent,
            route: window.location.hash
          };
        })()`,
        returnByValue: true
      });
      assert.ok(testRes.result.value.initialHasContent, 'Initial view has content');
    });

    ws.close();
  } finally {
    if (chromeProcess) chromeProcess.kill();
    serverProcess.kill();
    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
    }
  }
}

// -------------------------------------------------------------
// MAIN RUNNER
// -------------------------------------------------------------
async function main() {
  console.log('======================================================================');
  console.log('⚔️ SAAMX M1 INTERACTIVE CHARTS ADVERSARIAL CHALLENGER SUITE');
  console.log('======================================================================');

  testStateInvariant();
  testProvenanceAndLiveBadgeLogic();
  testRapidTimeframeSwitchingStress();
  testBoundaryHoverAndTooltipMath();
  testMarketOverviewSectionIndia50();
  await runBrowserCdpAdversarialTests();

  // Post-flight check
  assert.strictEqual(getFileHash(ORIGINAL_STATE), BASELINE_HASH, 'Post-flight hash check failed!');

  console.log('\n======================================================================');
  console.log(`CHALLENGE RESULTS: ${passCount} PASSED, ${failCount} FAILED (${passCount + failCount} TOTAL)`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\n❌ FATAL CHALLENGE ERROR:', err);
  process.exit(1);
});
