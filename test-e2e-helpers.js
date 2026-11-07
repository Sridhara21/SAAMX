/**
 * SAAMX '26 — E2E Test Suite Shared Helpers & Server Lifecycle Harness
 * File: SAAMX/test-e2e-helpers.js
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname);

export const DEFAULT_TEST_PORT = 3456;
export const DEFAULT_BASE_URL = `http://127.0.0.1:${DEFAULT_TEST_PORT}`;
export const ORIGINAL_STATE_FILE = path.join(ROOT_DIR, 'state.json');
export const DISPOSABLE_STATE_FILE = path.join(ROOT_DIR, 'state.test-e2e-disposable.json');
export const AUTHORITATIVE_BASELINE_HASH = '6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';

export function computeFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function verifyAuthoritativeBaseline() {
  const currentHash = computeFileHash(ORIGINAL_STATE_FILE);
  if (currentHash.toLowerCase() !== AUTHORITATIVE_BASELINE_HASH.toLowerCase()) {
    throw new Error(
      `CRITICAL INVARIANT VIOLATION: state.json SHA-256 hash mismatch!\n` +
      `  Expected: ${AUTHORITATIVE_BASELINE_HASH}\n` +
      `  Actual:   ${currentHash}`
    );
  }
  return currentHash;
}

export function httpRequest(method, endpoint, body = null, headers = {}, baseUrl = DEFAULT_BASE_URL) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(url, {
      method,
      headers: reqHeaders,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP request timed out after 10000ms: ${method} ${endpoint}`));
    });

    if (body !== null && body !== undefined) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

export function getAuthHeaders(role = 'admin', teamCode = null) {
  let mappedRole = role;
  if (role === 'bank') mappedRole = 'bank_teller';
  if (role === 'operator_x') mappedRole = 'exchange';
  const effectiveTeam = teamCode || (mappedRole === 'team' ? 'T01' : null);

  const headers = {
    'x-fms-password': 'fms-event-2026',
    'x-fms-role': mappedRole,
    'x-fms-team-code': effectiveTeam || '',
    'x-fms-username': mappedRole === 'bank_teller' ? 'bank' : (effectiveTeam || mappedRole)
  };

  if (mappedRole === 'admin' || mappedRole === 'super_admin') {
    headers['authorization'] = 'Bearer token_admin_admin';
    headers['x-fms-token'] = 'token_admin_admin';
  }

  return headers;
}

export class TestRecorder {
  constructor(suiteName = 'E2E Test Suite') {
    this.suiteName = suiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  async record(tier, domain, id, description, testFn) {
    const start = Date.now();
    try {
      await testFn();
      const durationMs = Date.now() - start;
      const res = { tier, domain, id, description, status: 'PASS', durationMs, error: null };
      this.results.push(res);
      console.log(`  ✓ [${tier} | ${id}] ${description} (${durationMs}ms)`);
      return res;
    } catch (err) {
      const durationMs = Date.now() - start;
      const res = { tier, domain, id, description, status: 'FAIL', durationMs, error: err.message };
      this.results.push(res);
      console.error(`  ✗ [${tier} | ${id}] ${description} (${durationMs}ms) -> FAIL: ${err.message}`);
      return res;
    }
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const totalDurationMs = Date.now() - this.startTime;

    const tierBreakdown = {};
    for (const r of this.results) {
      if (!tierBreakdown[r.tier]) {
        tierBreakdown[r.tier] = { total: 0, passed: 0, failed: 0 };
      }
      tierBreakdown[r.tier].total++;
      if (r.status === 'PASS') tierBreakdown[r.tier].passed++;
      else tierBreakdown[r.tier].failed++;
    }

    return {
      suiteName: this.suiteName,
      total,
      passed,
      failed,
      passRate,
      totalDurationMs,
      tierBreakdown,
      results: this.results
    };
  }

  printSummary() {
    const summary = this.getSummary();
    console.log('\n======================================================================');
    console.log(`📊 ${summary.suiteName.toUpperCase()} EXECUTION SUMMARY`);
    console.log('======================================================================');
    console.log(`Total Test Cases Executed : ${summary.total}`);
    console.log(`Passed                    : ${summary.passed}`);
    console.log(`Failed                    : ${summary.failed}`);
    console.log(`Pass Rate                 : ${summary.passRate}%`);
    console.log(`Duration                  : ${(summary.totalDurationMs / 1000).toFixed(2)}s\n`);

    console.log('Tier Breakdown:');
    for (const [tier, data] of Object.entries(summary.tierBreakdown)) {
      const pct = ((data.passed / data.total) * 100).toFixed(1);
      console.log(`  - ${tier.padEnd(8)}: ${data.passed}/${data.total} passed (${pct}%)`);
    }
    console.log('======================================================================\n');
    return summary;
  }
}

export async function waitForServer(baseUrl = DEFAULT_BASE_URL, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest('GET', '/api/ping', null, {}, baseUrl);
      if (res.status === 200 && res.body && (res.body.ready === true || res.body.ready === undefined)) {
        return true;
      }
    } catch {
      // Waiting for socket
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Server at ${baseUrl} failed to respond to /api/ping within ${timeoutMs}ms`);
}

export async function startTestServer(port = DEFAULT_TEST_PORT) {
  console.log(`[HARNESS] 1. Computing pre-flight baseline SHA-256 hash...`);
  const preHash = verifyAuthoritativeBaseline();
  console.log(`[HARNESS]    Authoritative state.json hash verified: ${preHash}`);

  console.log(`[HARNESS] 2. Creating disposable snapshot fixture: state.test-e2e-disposable.json...`);
  fs.copyFileSync(ORIGINAL_STATE_FILE, DISPOSABLE_STATE_FILE);

  console.log(`[HARNESS] 3. Spawning ephemeral server on port ${port}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      STATE_FILE: 'state.test-e2e-disposable.json',
      SAAMX_STATE_FILE: 'state.test-e2e-disposable.json',
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_TEST_SECRET: 'fms-event-2026',
      DATABASE_URL: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', d => {
    const msg = d.toString();
    if (msg.includes('Error') && !msg.includes('EADDRINUSE')) {
      // log debug if needed
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, 20000);
  console.log(`[HARNESS] 4. Server successfully bound and responsive at ${baseUrl}\n`);

  const cleanup = async () => {
    console.log(`\n[HARNESS] Tearing down ephemeral server (PID ${serverProcess.pid})...`);
    try {
      serverProcess.kill('SIGINT');
      await new Promise(r => setTimeout(r, 500));
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    } catch {
      // already exited
    }

    // Clean up disposable files and temporary fixtures
    try {
      if (fs.existsSync(DISPOSABLE_STATE_FILE)) {
        fs.unlinkSync(DISPOSABLE_STATE_FILE);
      }
      const tmpFile = `${DISPOSABLE_STATE_FILE}.tmp`;
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (e) {
      console.warn(`[HARNESS] Notice: could not remove temporary fixture: ${e.message}`);
    }

    console.log(`[HARNESS] Re-verifying authoritative state.json hash bit-exactness...`);
    const postHash = verifyAuthoritativeBaseline();
    console.log(`[HARNESS] ✓ Authoritative baseline preserved bit-for-bit: ${postHash}\n`);
  };

  return { serverProcess, baseUrl, cleanup };
}
