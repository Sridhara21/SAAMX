import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3075;
const CDP_PORT = 9235;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase-f-disposable.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${JSON.stringify(res.exceptionDetails)})`);
    }
    return res.result?.value;
  }

  async navigate(url, waitMs = 1200) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  }

  async reload(waitMs = 1200) {
    await this.send('Page.reload');
    await new Promise(r => setTimeout(r, waitMs));
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

function apiRequest(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: pathUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getCDPPageUrl() {
  return new Promise((resolve, reject) => {
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
}

const testLog = [];
function logResult(suite, name, passed, details = '') {
  testLog.push({ suite, name, passed, details });
  const icon = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${icon}: [${suite}] ${name} ${details ? '— ' + details : ''}`);
}

async function runPhaseFVerification() {
  console.log('======================================================================');
  console.log('🛡️ SAAMX PHASE F — REAL-BROWSER VERIFICATION: ROUTE REMEDIATION');
  console.log('======================================================================\n');

  // 1. STATE PRE-FLIGHT HASH INTEGRITY
  console.log('--- STEP 1: STATE.JSON BASELINE HASH CHECK ---');
  const initialHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[PRE-FLIGHT] state.json SHA-256: ${initialHash}`);
  assert.strictEqual(initialHash, EXPECTED_HASH, 'Baseline hash mismatch!');
  console.log('✓ Baseline hash verified strictly untouched.\n');

  try {
    fs.chmodSync(ORIGINAL_STATE, 0o444);
    console.log('✓ Marked state.json as READ-ONLY for testing safety.');
  } catch (e) {}

  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);
  console.log(`✓ Cloned disposable state: ${path.basename(DISPOSABLE_STATE)}`);

  // 2. SPAWN ISOLATED BACKEND ON PORT 3075
  console.log(`\n--- STEP 2: SPAWN ISOLATED BACKEND ON PORT ${PORT} ---`);
  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      STATE_FILE: DISPOSABLE_STATE,
      NODE_ENV: 'test',
      ALLOW_TEST_HEADER_AUTH: 'true',
      SAAMX_AUTH_SECRET: 'saamx-local-test-secret-32-chars-long'
    },
    stdio: 'ignore'
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await apiRequest('GET', '/api/ping');
      if (ping.status === 200) { serverReady = true; break; }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!serverReady) throw new Error('Isolated server failed to start within timeout');
  console.log(`✓ Isolated backend online at ${BASE_URL} serving dist/\n`);

  // 3. SPAWN CHROME HEADLESS WITH REMOTE DEBUGGING
  console.log(`--- STEP 3: SPAWN CHROME HEADLESS CDP ON PORT ${CDP_PORT} ---`);
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 1500));
  const wsUrl = await getCDPPageUrl();
  console.log(`✓ Chrome CDP target attached: ${wsUrl}\n`);

  const cdp = new ChromeCDP(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  try {
    // Obtain test tokens
    const adminAuth = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
    const advisorAuth = await apiRequest('POST', '/api/auth/login', { username: 'advisor', password: 'advisor-event-2026' });
    const sebiAuth = await apiRequest('POST', '/api/auth/login', { username: 'sebi', password: 'sebi-event-2026' });
    const journalistAuth = await apiRequest('POST', '/api/auth/login', { username: 'journalist', password: 'journalist-event-2026' });

    async function setSession(token, role, username) {
      await cdp.eval(`
        sessionStorage.setItem('saamx_token', '${token || ''}');
        sessionStorage.setItem('saamx_role', '${role || ''}');
        sessionStorage.setItem('saamx_username', '${username || ''}');
        sessionStorage.setItem('fms_authenticated', '${token ? 'true' : 'false'}');
        sessionStorage.setItem('fms_role', '${role || ''}');
        sessionStorage.setItem('fms_username', '${username || ''}');
      `);
      await cdp.reload(1000);
    }

    async function clearSession() {
      await cdp.eval(`
        sessionStorage.clear();
        localStorage.removeItem('fms_token');
      `);
      await cdp.reload(1000);
    }

    // ==================================================================
    // TEST SUITE 1: FINDING 1 — PUBLIC REGISTRATION ACCESS (#/register)
    // ==================================================================
    console.log('======================================================================');
    console.log('🧪 SUITE 1: FINDING 1 — PUBLIC REGISTRATION ACCESS');
    console.log('======================================================================');

    // 1.1 Unauthenticated fresh navigation to #/register
    await cdp.navigate(`${BASE_URL}/#/register`, 1500);
    await clearSession();
    await cdp.navigate(`${BASE_URL}/#/register`, 1500);

    const unauthRegAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const isLoginPage = text.includes('SAAMX Gateway') || text.includes('Sign In to Floor Console');
      const isRegPage = text.includes('Investment House Registration') || text.includes('Official Entry Protocol') || text.includes('School Details');
      const inputs = Array.from(document.querySelectorAll('input'));
      const hasSchoolInput = inputs.some(i => i.placeholder?.includes('School') || i.name?.includes('school') || i.id?.includes('school') || true);
      const isPublicShell = !document.querySelector('.saamx-sidebar') && !document.querySelector('.app-header');
      return {
        isLoginPage,
        isRegPage,
        inputCount: inputs.length,
        isPublicShell,
        heading: document.querySelector('h1')?.innerText || ''
      };
    })()`);

    logResult(
      'Finding 1',
      'Unauthenticated Direct Navigation to #/register',
      unauthRegAudit.isRegPage && !unauthRegAudit.isLoginPage,
      `Renders RegistrationPage without login redirect (Heading: "${unauthRegAudit.heading}", Inputs: ${unauthRegAudit.inputCount})`
    );

    logResult(
      'Finding 1',
      'Public Shell Isolation for Unauthenticated Registration',
      unauthRegAudit.isPublicShell,
      'Rendered in clean public shell without internal sidebar'
    );

    // 1.2 Back to home navigation from registration
    const backToHomeAudit = await cdp.eval(`(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Floor Gateway') || b.innerText.includes('Home') || b.innerText.includes('Back'));
      if (backBtn) {
        backBtn.click();
        return true;
      }
      return false;
    })()`);
    await new Promise(r => setTimeout(r, 600));
    const postBackHash = await cdp.eval('window.location.hash');
    logResult(
      'Finding 1',
      'Registration Back to Home Action',
      postBackHash === '#/' || postBackHash === '',
      `Navigated back to landing: ${postBackHash || '#/'}`
    );

    // 1.3 Authenticated navigation to #/register
    await setSession(adminAuth.data.token, 'admin', 'admin');
    await cdp.navigate(`${BASE_URL}/#/register`, 1500);
    const authRegAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isRegPage: text.includes('Investment House Registration') || text.includes('Official Entry Protocol'),
        hasInputs: document.querySelectorAll('input').length >= 3
      };
    })()`);
    logResult(
      'Finding 1',
      'Authenticated Navigation to #/register',
      authRegAudit.isRegPage && authRegAudit.hasInputs,
      'Rendered RegistrationPage successfully for authenticated user'
    );

    // ==================================================================
    // TEST SUITE 2: FINDING 2 — DEBATE ROUTE BINDING & AUTHORIZATION (#/debate)
    // ==================================================================
    console.log('\n======================================================================');
    console.log('🧪 SUITE 2: FINDING 2 — DEBATE ROUTE BINDING & AUTHORIZATION');
    console.log('======================================================================');

    // 2.1 Unauthorized role testing: SEBI
    await setSession(sebiAuth.data.token, 'sebi', 'sebi');
    await cdp.navigate(`${BASE_URL}/#/debate`, 1200);
    const sebiDebateAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isAccessRestricted: text.includes('Access Restricted') && text.includes('SEBI'),
        isDebatePage: text.includes('BULL VS. BEAR')
      };
    })()`);
    logResult(
      'Finding 2',
      'Role Enforcement — SEBI Blocked from #/debate',
      sebiDebateAudit.isAccessRestricted && !sebiDebateAudit.isDebatePage,
      'Access Restricted card rendered for unauthorized role SEBI'
    );

    // 2.2 Unauthorized role testing: Journalist
    await setSession(journalistAuth.data.token, 'journalist', 'journalist');
    await cdp.navigate(`${BASE_URL}/#/debate`, 1200);
    const jourDebateAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isAccessRestricted: text.includes('Access Restricted') && text.includes('JOURNALIST'),
        isDebatePage: text.includes('BULL VS. BEAR')
      };
    })()`);
    logResult(
      'Finding 2',
      'Role Enforcement — Journalist Blocked from #/debate',
      jourDebateAudit.isAccessRestricted && !jourDebateAudit.isDebatePage,
      'Access Restricted card rendered for unauthorized role JOURNALIST'
    );

    // 2.3 Authorized role testing: Advisor
    await setSession(advisorAuth.data.token, 'advisor', 'advisor');
    await cdp.navigate(`${BASE_URL}/#/debate`, 1500);
    const advisorDebateAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const heading = document.querySelector('h1')?.innerText || '';
      const hasArenaTitle = text.includes('BULL VS. BEAR') || text.includes('SAAMX ARENA') || heading.includes('BULL VS. BEAR');
      const hasTimer = text.includes('ACTIVE DEBATE') || text.includes(':') || !!document.querySelector('.font-mono');
      const hasVoteButton = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Bull') || b.innerText.includes('Bear') || b.innerText.includes('Vote'));
      const isBrokerTerminal = text.includes('Floor Brokerage & Advisory') || text.includes('Senior Floor Advisor');
      return {
        heading,
        hasArenaTitle,
        hasTimer,
        hasVoteButton,
        isBrokerTerminal
      };
    })()`);
    logResult(
      'Finding 2',
      'Role Enforcement — Advisor Authorized for #/debate',
      advisorDebateAudit.hasArenaTitle && !advisorDebateAudit.isBrokerTerminal,
      `BullBearDebatePage rendered successfully for Advisor (Heading: "${advisorDebateAudit.heading}")`
    );

    // 2.4 Authorized role testing: Admin / Super Admin
    await setSession(adminAuth.data.token, 'admin', 'admin');
    await cdp.navigate(`${BASE_URL}/#/debate`, 1500);
    const adminDebateAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const heading = document.querySelector('h1')?.innerText || '';
      const hasArenaTitle = text.includes('BULL VS. BEAR') || text.includes('SAAMX ARENA') || heading.includes('BULL VS. BEAR');
      return { hasArenaTitle, heading };
    })()`);
    logResult(
      'Finding 2',
      'Role Enforcement — Admin Authorized for #/debate',
      adminDebateAudit.hasArenaTitle,
      `BullBearDebatePage rendered successfully for Admin (Heading: "${adminDebateAudit.heading}")`
    );

    // 2.5 Verification of #/bull-bear separate preservation
    await setSession(adminAuth.data.token, 'admin', 'admin');
    await cdp.navigate(`${BASE_URL}/#/bull-bear`, 1500);
    const bullBearAliasAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const heading = document.querySelector('h1')?.innerText || '';
      const hasBrokerTerminal = heading.includes('Broker') && heading.includes('Advisor');
      return { hasBrokerTerminal, heading };
    })()`);
    logResult(
      'Finding 2',
      'Preservation of #/bull-bear as Broker Advisory Bull View',
      bullBearAliasAudit.hasBrokerTerminal,
      `#/bull-bear strictly preserved as BrokerAdvisoryTerminal (Heading: "${bullBearAliasAudit.heading}")`
    );

  } finally {
    cdp.close();
    chrome.kill('SIGTERM');
    server.kill('SIGTERM');

    if (fs.existsSync(DISPOSABLE_STATE)) {
      try { fs.unlinkSync(DISPOSABLE_STATE); } catch (e) {}
      console.log(`\n✓ Removed disposable test state.`);
    }

    try {
      fs.chmodSync(ORIGINAL_STATE, 0o666);
      console.log('✓ Restored state.json permissions.');
    } catch (e) {}
  }

  // 4. POST-FLIGHT STATE INTEGRITY CHECK
  console.log('\n--- STEP 4: POST-TEST STATE.JSON HASH INTEGRITY ---');
  const postHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[POST-FLIGHT] state.json SHA-256: ${postHash}`);
  assert.strictEqual(postHash, EXPECTED_HASH, 'Post-flight hash mismatch!');
  console.log('✓ Post-flight state.json SHA-256 verified 100% identical to baseline!\n');

  console.log('======================================================================');
  console.log('📊 PHASE F VERIFICATION SUMMARY');
  console.log('======================================================================');
  const passed = testLog.filter(t => t.passed).length;
  const failed = testLog.filter(t => !t.passed).length;
  console.log(`Total Checks: ${testLog.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    throw new Error(`${failed} verification checks failed!`);
  }
}

runPhaseFVerification().catch(err => {
  console.error('\n❌ Fatal error in Phase F verification suite:', err);
  process.exit(1);
});
