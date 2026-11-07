/**
 * ==============================================================================
 * SAAMX Phase 4 Master Verification Suite: Cloud Run & RTDB Integration
 * ==============================================================================
 * Verifies all Phase 4 technical specifications:
 *   - Gate 1: P4.1 Container Packaging — Multi-Stage Dockerfile Standards
 *   - Gate 2: P4.1 Container Packaging — Optimized .dockerignore Rules
 *   - Gate 3: P4.2 Firebase Gateway Rewrites — firebase.json Cloud Run routing
 *   - Gate 4: P4.3 RTDB Public Data Isolation — Hardened database.rules.json
 *   - Gate 5: P4.4 Throttled Delta Publisher — Payload Size Gate (<500B per tick)
 *   - Gate 6: P4.4 Throttled Delta Publisher — Delta Detection & Throttling
 *   - Gate 7: P4.5 Client-Side Codebase Write Purge — 0 client RTDB writes in src/
 *   - Gate 8: P4.5 Authoritative API Gateway Routing & Session Header Injection
 *   - Gate 9: Live Server Health & Gateway Integration Gate (/api/ping, /api/rtdb/delta-stats)
 *   - Gate 10: Production Frontend Compilation Gate (Vite dist bundle)
 *   - Gate 11: Immutable state.json SHA-256 Bit-Identical Preservation Gate
 * ==============================================================================
 */

import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import {
  formatPriceTick,
  measureTickByteSize,
  hasSecurityDelta,
  publishSecurityTick,
  publishDeltaBatch,
  startDeltaPublisher,
  stopDeltaPublisher,
  getDeltaPublisherStats,
  resetDeltaPublisher,
  setCustomDatabaseInstance,
  MAX_TICK_PAYLOAD_BYTES
} from '../services/deltaPublisher.js';

import { apiFetch, calculateMarketClock, updateMarketIndices, logAuditEvent } from '../src/lib/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const STATE_FILE = path.join(ROOT_DIR, 'state.json');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

const TEST_PORT = 3099;
const BASE_TEST_URL = `http://127.0.0.1:${TEST_PORT}`;

const gates = [];
function recordGate(id, title, status, evidence) {
  const symbol = status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED';
  gates.push({ id, title, status, evidence });
  console.log(`[${symbol}] ${id}: ${title}`);
  if (evidence) {
    console.log(`  Evidence: ${typeof evidence === 'object' ? JSON.stringify(evidence) : evidence}`);
  }
}

function computeStateHash() {
  const buf = fs.readFileSync(STATE_FILE);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function httpRequest(method, urlStr, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const postData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const reqHeaders = {
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: reqHeaders
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAllGates() {
  console.log('======================================================================');
  console.log('🚀 SAAMX PHASE 4 MASTER VERIFICATION SUITE');
  console.log('   Target: Cloud Run Packaging, Gateway Rewrites & RTDB Isolation');
  console.log('======================================================================\n');

  // Verify baseline hash before running any tests
  const initialHash = computeStateHash();
  assert.strictEqual(
    initialHash,
    EXPECTED_HASH,
    `Initial state.json hash mismatch: expected ${EXPECTED_HASH}, got ${initialHash}`
  );

  // --------------------------------------------------------------------------
  // GATE 1: P4.1 Container Packaging — Multi-Stage Dockerfile Standards
  // --------------------------------------------------------------------------
  try {
    const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
    assert(fs.existsSync(dockerfilePath), 'Dockerfile must exist at project root');
    const dfContent = fs.readFileSync(dockerfilePath, 'utf8');

    assert(dfContent.includes('node:20-alpine'), 'Dockerfile must use node:20-alpine base image');
    assert(dfContent.includes('AS builder'), 'Dockerfile must specify builder stage');
    assert(dfContent.includes('AS runner'), 'Dockerfile must specify runner stage');
    assert(dfContent.includes('dumb-init'), 'Dockerfile must install and use dumb-init signal handler');
    assert(dfContent.includes('USER node'), 'Dockerfile must run as unprivileged non-root node user');
    assert(dfContent.includes('HEALTHCHECK'), 'Dockerfile must declare container HEALTHCHECK');
    assert(dfContent.includes('/api/ping'), 'Dockerfile HEALTHCHECK must probe /api/ping endpoint');
    assert(dfContent.includes('--chown=node:node'), 'Dockerfile must set non-root ownership on copied assets');
    assert(dfContent.includes('ENTRYPOINT ["dumb-init", "--"]'), 'Dockerfile must configure dumb-init as ENTRYPOINT');
    assert(dfContent.includes('CMD ["node", "server.js"]'), 'Dockerfile must execute server.js via CMD');

    recordGate('GATE_1', 'P4.1 Multi-Stage Production Dockerfile Standards', 'PASSED', {
      baseImage: 'node:20-alpine',
      multiStage: true,
      dumbInit: true,
      user: 'node',
      healthcheckEndpoint: '/api/ping'
    });
  } catch (err) {
    recordGate('GATE_1', 'P4.1 Multi-Stage Production Dockerfile Standards', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 2: P4.1 Container Packaging — Optimized .dockerignore Rules
  // --------------------------------------------------------------------------
  try {
    const dockerignorePath = path.join(ROOT_DIR, '.dockerignore');
    assert(fs.existsSync(dockerignorePath), '.dockerignore must exist at project root');
    const diContent = fs.readFileSync(dockerignorePath, 'utf8');

    const requiredPatterns = [
      'node_modules',
      'dist',
      '.git',
      '.env',
      '*.tmp',
      '*.log',
      '.firebase',
      'backups',
      'test-*',
      '*.xlsx',
      '*.csv'
    ];

    for (const pat of requiredPatterns) {
      assert(diContent.includes(pat), `.dockerignore must exclude ${pat}`);
    }

    recordGate('GATE_2', 'P4.1 Optimized .dockerignore Rules', 'PASSED', {
      excludedPatternsCount: diContent.split('\n').filter(l => l.trim() && !l.startsWith('#')).length,
      sampleExclusions: requiredPatterns
    });
  } catch (err) {
    recordGate('GATE_2', 'P4.1 Optimized .dockerignore Rules', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 3: P4.2 Firebase Gateway Rewrites — firebase.json Cloud Run routing
  // --------------------------------------------------------------------------
  try {
    const fbJsonPath = path.join(ROOT_DIR, 'firebase.json');
    assert(fs.existsSync(fbJsonPath), 'firebase.json must exist at project root');
    const fbConfig = JSON.parse(fs.readFileSync(fbJsonPath, 'utf8'));

    assert(fbConfig.database && fbConfig.database.rules === 'database.rules.json',
      'firebase.json must point database.rules to database.rules.json'
    );

    const hostingSites = Array.isArray(fbConfig.hosting) ? fbConfig.hosting : [fbConfig.hosting];
    assert(hostingSites.length > 0, 'firebase.json must contain hosting configuration');

    for (const site of hostingSites) {
      assert(site.rewrites && Array.isArray(site.rewrites), `Site ${site.site || 'default'} must have rewrites`);
      
      const apiRewrite = site.rewrites.find(r => r.source === '/api/**');
      assert(apiRewrite, `Site ${site.site} must contain /api/** rewrite`);
      assert(apiRewrite.run && apiRewrite.run.serviceId === 'saamx-backend',
        `Site ${site.site} /api/** must route to Cloud Run service saamx-backend`
      );

      const spaRewrite = site.rewrites.find(r => r.source === '**');
      assert(spaRewrite, `Site ${site.site} must contain ** SPA rewrite`);
      assert(spaRewrite.destination === '/index.html',
        `Site ${site.site} ** rewrite must point to /index.html`
      );
    }

    recordGate('GATE_3', 'P4.2 Firebase Gateway Rewrites (/api/** -> saamx-backend)', 'PASSED', {
      sitesConfigured: hostingSites.map(s => s.site),
      serviceId: 'saamx-backend',
      databaseRules: fbConfig.database.rules
    });
  } catch (err) {
    recordGate('GATE_3', 'P4.2 Firebase Gateway Rewrites (/api/** -> saamx-backend)', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 4: P4.3 RTDB Public Data Isolation — Hardened database.rules.json
  // --------------------------------------------------------------------------
  try {
    const rulesPath = path.join(ROOT_DIR, 'database.rules.json');
    assert(fs.existsSync(rulesPath), 'database.rules.json must exist at project root');
    const rulesConfig = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

    assert(rulesConfig.rules, 'database.rules.json must define top-level "rules" block');
    assert.strictEqual(rulesConfig.rules['.read'], false, 'Root .read must be false');
    assert.strictEqual(rulesConfig.rules['.write'], false, 'Root .write must be false');

    assert(rulesConfig.rules.public, 'database.rules.json must define "public" node');
    assert.strictEqual(rulesConfig.rules.public['.read'], true, 'Public node .read must be true');
    assert.strictEqual(rulesConfig.rules.public['.write'], false, 'Public node .write must be false');

    // Recursive validator: ensure NO path has .write: true
    function checkNoClientWrite(node, pathStr = '') {
      if (!node || typeof node !== 'object') return;
      if (node['.write'] === true) {
        throw new Error(`Security violation: .write: true found at ${pathStr}`);
      }
      for (const [key, val] of Object.entries(node)) {
        if (key !== '.write' && typeof val === 'object') {
          checkNoClientWrite(val, `${pathStr}/${key}`);
        }
      }
    }
    checkNoClientWrite(rulesConfig.rules);

    recordGate('GATE_4', 'P4.3 Hardened RTDB Security Rules (Zero Client Writes)', 'PASSED', {
      rootRead: rulesConfig.rules['.read'],
      rootWrite: rulesConfig.rules['.write'],
      publicRead: rulesConfig.rules.public['.read'],
      publicWrite: rulesConfig.rules.public['.write'],
      maxClientWritePermissions: 0
    });
  } catch (err) {
    recordGate('GATE_4', 'P4.3 Hardened RTDB Security Rules (Zero Client Writes)', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 5: P4.4 Throttled Delta Publisher — Payload Size Gate (<500B per tick)
  // --------------------------------------------------------------------------
  try {
    const stateData = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const securities = Object.values(stateData.securities || {});
    assert(securities.length > 0, 'Universe must contain securities');

    let maxByteSize = 0;
    let maxTicker = '';
    let totalBytes = 0;

    for (const sec of securities) {
      const tick = formatPriceTick(sec);
      const size = measureTickByteSize(tick);

      assert(tick.ticker, 'Tick must contain ticker');
      assert(typeof tick.currentPrice === 'number', 'Tick must contain numeric currentPrice');
      assert(typeof tick.dayChange === 'number', 'Tick must contain numeric dayChange');
      assert(typeof tick.dayChangePercent === 'number', 'Tick must contain numeric dayChangePercent');
      assert(typeof tick.dayHigh === 'number', 'Tick must contain numeric dayHigh');
      assert(typeof tick.dayLow === 'number', 'Tick must contain numeric dayLow');
      assert(typeof tick.tradingVolume === 'number', 'Tick must contain numeric tradingVolume');
      assert(typeof tick.status === 'string', 'Tick must contain string status');
      assert(typeof tick.currency === 'string', 'Tick must contain string currency');
      assert(typeof tick.lastUpdated === 'number', 'Tick must contain numeric timestamp');

      assert(
        size < MAX_TICK_PAYLOAD_BYTES,
        `Tick size ${size}B for ${sec.ticker} exceeds limit ${MAX_TICK_PAYLOAD_BYTES}B`
      );

      if (size > maxByteSize) {
        maxByteSize = size;
        maxTicker = sec.ticker;
      }
      totalBytes += size;
    }

    const avgByteSize = parseFloat((totalBytes / securities.length).toFixed(1));

    // Edge case test: Malformed input / NaN price fallback resilience
    const nanSec = { ticker: 'NAN_TEST', currentPrice: NaN, openingPrice: 100, dayHigh: 'invalid' };
    const nanTick = formatPriceTick(nanSec);
    assert.strictEqual(Number.isFinite(nanTick.currentPrice), true, 'currentPrice must be a finite number');
    assert.strictEqual(Number.isFinite(nanTick.dayHigh), true, 'dayHigh must be a finite number');
    assert.strictEqual(JSON.stringify(nanTick).includes('null'), false, 'Tick JSON must not serialize NaN to null');

    recordGate('GATE_5', 'P4.4 Delta Publisher Payload Size Gate (<500B)', 'PASSED', {
      totalSecuritiesChecked: securities.length,
      maxPayloadSize: `${maxByteSize} bytes (${maxTicker})`,
      avgPayloadSize: `${avgByteSize} bytes`,
      limit: `${MAX_TICK_PAYLOAD_BYTES} bytes`,
      headroom: `${MAX_TICK_PAYLOAD_BYTES - maxByteSize} bytes`,
      nanResilienceVerified: true
    });
  } catch (err) {
    recordGate('GATE_5', 'P4.4 Delta Publisher Payload Size Gate (<500B)', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 6: P4.4 Throttled Delta Publisher — Delta Detection & Throttling
  // --------------------------------------------------------------------------
  try {
    resetDeltaPublisher();

    // Mock in-memory RTDB instance
    let failNextUpdate = false;
    const memoryDb = {
      data: {},
      ref(p = '') {
        return {
          set: async (val) => {
            memoryDb.data[p] = val;
          },
          update: async (updates) => {
            if (failNextUpdate) {
              throw new Error('Simulated transient RTDB network failure');
            }
            Object.assign(memoryDb.data, updates);
          }
        };
      }
    };

    setCustomDatabaseInstance(memoryDb);

    const testSec1 = {
      ticker: 'RELI',
      currentPrice: 2850.0,
      openingPrice: 2800.0,
      dayHigh: 2860.0,
      dayLow: 2795.0,
      tradingVolume: 50000,
      status: 'Active',
      currency: 'INR'
    };
    const testSec2 = {
      ticker: 'TCS',
      currentPrice: 3950.0,
      openingPrice: 3920.0,
      dayHigh: 3970.0,
      dayLow: 3915.0,
      tradingVolume: 25000,
      status: 'Active',
      currency: 'INR'
    };

    // First batch: both are new, must be published
    const batch1 = await publishDeltaBatch([testSec1, testSec2], { db: memoryDb });
    assert.strictEqual(batch1.batchCount, 2, 'Initial batch must publish all new securities');
    assert(memoryDb.data['public/live_prices/RELI'], 'RELI must be published in RTDB mock');
    assert(memoryDb.data['public/live_prices/TCS'], 'TCS must be published in RTDB mock');

    // Second batch immediately without price change: delta must be 0
    const batch2 = await publishDeltaBatch([testSec1, testSec2], { db: memoryDb });
    assert.strictEqual(batch2.batchCount, 0, 'Unchanged batch must be throttled with 0 delta writes');

    // Change RELI price and publish: only RELI should produce delta
    testSec1.currentPrice = 2865.0;
    const batch3 = await publishDeltaBatch([testSec1, testSec2], { db: memoryDb });
    assert.strictEqual(batch3.batchCount, 1, 'Only modified security RELI should produce delta');
    assert.strictEqual(memoryDb.data['public/live_prices/RELI'].currentPrice, 2865.0);

    // Test transient failure retry: if DB update fails, cache should not commit and delta should retry
    failNextUpdate = true;
    testSec1.currentPrice = 2880.0;
    let failedCaught = false;
    try {
      await publishDeltaBatch([testSec1, testSec2], { db: memoryDb });
    } catch (e) {
      failedCaught = true;
    }
    assert(failedCaught, 'publishDeltaBatch must throw on database failure');
    // On subsequent retry when failure clears, RELI 2880 must still be recognized as a pending delta
    failNextUpdate = false;
    const retryBatch = await publishDeltaBatch([testSec1, testSec2], { db: memoryDb });
    assert.strictEqual(retryBatch.batchCount, 1, 'Uncommitted delta must be retried upon recovery');
    assert.strictEqual(memoryDb.data['public/live_prices/RELI'].currentPrice, 2880.0);

    // Verify stats
    const stats = getDeltaPublisherStats();
    assert.strictEqual(stats.totalBatchesPublished, 3, '3 total successful batches published');
    assert.strictEqual(stats.totalTicksPublished, 4, '4 total ticks successfully published');
    assert(stats.maxObservedPayloadBytes < MAX_TICK_PAYLOAD_BYTES);

    resetDeltaPublisher();

    recordGate('GATE_6', 'P4.4 Delta Detection & Throttling Logic', 'PASSED', {
      initialBatchTicks: batch1.batchCount,
      unchangedBatchDeltasSuppressed: batch2.batchCount === 0,
      singleDeltaBatchTicks: batch3.batchCount,
      failureRetryHandled: true,
      totalTicksRecorded: stats.totalTicksPublished
    });
  } catch (err) {
    recordGate('GATE_6', 'P4.4 Delta Detection & Throttling Logic', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 7: P4.5 Client-Side Codebase Write Purge — 0 client RTDB writes in src/
  // --------------------------------------------------------------------------
  try {
    function walkDir(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(walkDir(full));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          results.push(full);
        }
      });
      return results;
    }

    const srcFiles = walkDir(path.join(ROOT_DIR, 'src'));
    const detectedWrites = [];

    const writePattern = /(set|update|push|runTransaction)\s*\(\s*(ref\s*\(|db)/;

    for (const f of srcFiles) {
      const content = fs.readFileSync(f, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (writePattern.test(l)) {
          detectedWrites.push({
            file: path.relative(ROOT_DIR, f),
            line: idx + 1,
            snippet: l.trim()
          });
        }
      });
    }

    assert.strictEqual(
      detectedWrites.length,
      0,
      `Direct client RTDB writes found in src/: ${JSON.stringify(detectedWrites, null, 2)}`
    );

    // Verify useFirebaseState hook subscribes to public/live_prices stream
    const hookPath = path.join(ROOT_DIR, 'src', 'hooks', 'useFirebaseState.js');
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    assert(hookContent.includes('public/live_prices'), 'useFirebaseState must subscribe to public/live_prices');

    recordGate('GATE_7', 'P4.5 Client RTDB Write Purge (0 writes in src/)', 'PASSED', {
      srcFilesScanned: srcFiles.length,
      clientWritesDetected: 0,
      publicPricesListenerActive: true
    });
  } catch (err) {
    recordGate('GATE_7', 'P4.5 Client RTDB Write Purge (0 writes in src/)', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 8: P4.5 Authoritative API Gateway Routing & Session Header Injection
  // --------------------------------------------------------------------------
  try {
    // Intercept native fetch in node environment to test apiFetch request decoration
    let lastInterceptedRequest = null;
    const originalFetch = global.fetch;

    global.fetch = async (url, options) => {
      lastInterceptedRequest = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, mocked: true })
      };
    };

    // Test session token and headers injection
    const res = await apiFetch('/api/scoring/leaderboard', {
      headers: { 'X-Custom-Test': 'true' }
    });
    const data = await res.json();

    assert(lastInterceptedRequest, 'apiFetch must invoke HTTP fetch');
    assert(lastInterceptedRequest.url.endsWith('/api/scoring/leaderboard'),
      'apiFetch must route to normalized /api/ endpoint'
    );
    assert(lastInterceptedRequest.options._skipApiIntercept, 'apiFetch must set _skipApiIntercept flag');
    assert.strictEqual(lastInterceptedRequest.options.headers['Content-Type'], 'application/json');
    assert.strictEqual(lastInterceptedRequest.options.headers['X-Custom-Test'], 'true');

    // Restore fetch
    global.fetch = originalFetch;

    // Verify market clock pure calculation
    const clock = calculateMarketClock({ status: 'Open', mode: 'EVENT' });
    assert(clock.timeString, 'Market clock must return timeString');
    assert(clock.sessionState, 'Market clock must return sessionState');

    // Verify market indices pure calculation
    const testIndices = await updateMarketIndices({
      RELI: { ticker: 'RELI', basePrice: 2800, currentPrice: 2850, exchange: 'NSE' },
      AAPL: { ticker: 'AAPL', basePrice: 220, currentPrice: 225, exchange: 'NASDAQ' }
    });
    assert(testIndices.GLOBAL100, 'updateMarketIndices must calculate GLOBAL100');
    assert(testIndices.INDIA50, 'updateMarketIndices must calculate INDIA50');

    recordGate('GATE_8', 'P4.5 Authoritative API Gateway Routing & Clock/Index Invariants', 'PASSED', {
      apiFetchTarget: lastInterceptedRequest.url,
      skipApiIntercept: true,
      clockState: clock.sessionState,
      indicesCalculated: Object.keys(testIndices)
    });
  } catch (err) {
    recordGate('GATE_8', 'P4.5 Authoritative API Gateway Routing & Clock/Index Invariants', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 9: Live Server Health & Gateway Integration Gate (/api/ping)
  // --------------------------------------------------------------------------
  let serverProcess = null;
  try {
    console.log(`\nStarting live test server on port ${TEST_PORT}...`);
    serverProcess = spawn('node', ['server.js'], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        NODE_ENV: 'test'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server failed to start within 10s')), 10000);
      serverProcess.stdout.on('data', data => {
        const str = data.toString();
        if (str.includes('FMS Platform Backend running')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProcess.stderr.on('data', data => {
        console.error('  [Server Log]:', data.toString().trim());
      });
      serverProcess.on('exit', code => {
        clearTimeout(timeout);
        if (code !== 0) reject(new Error(`Server exited prematurely with code ${code}`));
      });
    });

    // Probe 1: GET /api/ping
    const pingRes = await httpRequest('GET', `${BASE_TEST_URL}/api/ping`);
    assert.strictEqual(pingRes.status, 200, '/api/ping must return 200 OK');
    assert.strictEqual(pingRes.json.pong, true, '/api/ping must return { pong: true }');

    // Probe 2: GET /api/rtdb/delta-stats
    const statsRes = await httpRequest('GET', `${BASE_TEST_URL}/api/rtdb/delta-stats`);
    assert.strictEqual(statsRes.status, 200, '/api/rtdb/delta-stats must return 200 OK');
    assert(statsRes.json.stats, '/api/rtdb/delta-stats must return stats object');

    // Probe 3: POST /api/audit-log
    const auditRes = await httpRequest('POST', `${BASE_TEST_URL}/api/audit-log`, {
      actor: 'TestHarness',
      action: 'GATE_9_VERIFY',
      reason: 'Phase 4 verification test audit entry'
    });
    assert.strictEqual(auditRes.status, 200, 'POST /api/audit-log must return 200 OK');
    assert(auditRes.json.success, 'POST /api/audit-log must succeed');

    recordGate('GATE_9', 'Live Server Health & Gateway Integration Gate', 'PASSED', {
      port: TEST_PORT,
      pingStatus: pingRes.status,
      pong: pingRes.json.pong,
      deltaStatsStatus: statsRes.status,
      auditStatus: auditRes.status
    });
  } catch (err) {
    recordGate('GATE_9', 'Live Server Health & Gateway Integration Gate', 'FAILED', err.message);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }

  // --------------------------------------------------------------------------
  // GATE 10: Production Frontend Compilation Gate (Vite dist bundle)
  // --------------------------------------------------------------------------
  try {
    const distIndex = path.join(ROOT_DIR, 'dist', 'index.html');
    assert(fs.existsSync(distIndex), 'dist/index.html must exist from build');
    const distAssets = fs.readdirSync(path.join(ROOT_DIR, 'dist', 'assets'));
    assert(distAssets.length > 0, 'dist/assets must contain built javascript and css chunks');

    recordGate('GATE_10', 'Production Frontend Compilation Gate', 'PASSED', {
      distIndexExists: true,
      assetsChunkCount: distAssets.length
    });
  } catch (err) {
    recordGate('GATE_10', 'Production Frontend Compilation Gate', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // GATE 11: Immutable state.json SHA-256 Bit-Identical Preservation Gate
  // --------------------------------------------------------------------------
  try {
    const finalHash = computeStateHash();
    assert.strictEqual(
      finalHash,
      EXPECTED_HASH,
      `state.json SHA-256 hash mutated! Expected ${EXPECTED_HASH}, found ${finalHash}`
    );

    recordGate('GATE_11', 'Immutable state.json SHA-256 Bit-Identical Preservation Gate', 'PASSED', {
      hash: finalHash,
      matchesExpected: true
    });
  } catch (err) {
    recordGate('GATE_11', 'Immutable state.json SHA-256 Bit-Identical Preservation Gate', 'FAILED', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('🏁 SAAMX PHASE 4 MASTER VERIFICATION RESULTS SUMMARY');
  console.log('======================================================================');

  const passedCount = gates.filter(g => g.status === 'PASSED').length;
  const failedCount = gates.filter(g => g.status === 'FAILED').length;

  console.log(`Total Gates: ${gates.length}`);
  console.log(`Passed:      ${passedCount}`);
  console.log(`Failed:      ${failedCount}`);

  if (failedCount > 0) {
    console.error(`\n❌ Verification failed with ${failedCount} gate failures.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 11/11 PHASE 4 VERIFICATION GATES PASSED PERFECTLY!');
    process.exit(0);
  }
}

runAllGates().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
