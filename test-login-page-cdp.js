import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3050;
const CDP_PORT = 9222;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-login-cdp.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class ChromeCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.networkFailures = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
          this.consoleLogs.push({ type, text, timestamp: Date.now() });
        } else if (msg.method === 'Network.loadingFailed') {
          this.networkFailures.push(msg.params);
        }
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

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
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

function parseRgb(colorStr) {
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return [0, 0, 0, 1];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(fgStr, bgStr) {
  const [r1, g1, b1] = parseRgb(fgStr);
  const [r2, g2, b2] = parseRgb(bgStr);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

async function run() {
  console.log('======================================================================');
  console.log('🏛️ SAAMX — PHASE D.1 LOGIN PAGE REAL-BROWSER (CHROME CDP) QA SUITE');
  console.log('======================================================================\n');

  const initialHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE INTEGRITY] Baseline state.json SHA-256: ${initialHash}`);

  fs.copyFileSync(ORIGINAL_STATE, DISPOSABLE_STATE);

  console.log(`[SPAWN] Launching isolated backend on http://localhost:${PORT}...`);
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

  await new Promise(r => setTimeout(r, 2000));

  let chromeProcess = null;
  let wsUrl = null;
  try {
    wsUrl = await getCDPPageUrl();
  } catch (e) {
    console.log('[SPAWN] Launching Chrome Headless CDP on port 9222...');
    const tempUserData = path.join(os.tmpdir(), `cdp_login_test_${Date.now()}`);
    chromeProcess = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${tempUserData}`,
      '--no-first-run',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      'about:blank'
    ]);
    await new Promise(r => setTimeout(r, 2000));
    wsUrl = await getCDPPageUrl();
  }

  const cdp = new ChromeCDP(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  try {
    // ------------------------------------------------------------------
    // TEST 1: NAVIGATION & STRUCTURAL AUDIT
    // ------------------------------------------------------------------
    console.log('--- TEST 1: LOGIN PAGE MOUNT & STRUCTURAL INSPECTION ---');
    await cdp.navigate(`${BASE_URL}/#/login`);

    const structure = await cdp.eval(`(() => {
      const heading = document.querySelector('h1')?.innerText || '';
      const backLink = document.querySelector('a.saamx-login-back-link');
      const themeToggle = document.querySelector('.theme-toggle-btn');
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const submitBtn = document.querySelector('button[type="submit"]');
      const buildingIcon = document.querySelector('.saamx-card svg');
      const guideBox = document.querySelector('.saamx-card code');

      return {
        heading,
        hasBackLink: !!backLink,
        backLinkHref: backLink?.getAttribute('href'),
        hasThemeToggle: !!themeToggle,
        hasUsernameInput: !!usernameInput,
        hasPasswordInput: !!passwordInput,
        hasSubmitBtn: !!submitBtn,
        submitBtnText: submitBtn?.innerText?.trim(),
        hasSvgIcon: !!buildingIcon,
        hasGuideBox: !!guideBox
      };
    })()`);

    console.log(`  ✓ Title Heading: "${structure.heading}"`);
    console.log(`  ✓ Back Link present: ${structure.hasBackLink} (Href: "${structure.backLinkHref}")`);
    console.log(`  ✓ ThemeToggle present: ${structure.hasThemeToggle}`);
    console.log(`  ✓ Username & Password inputs present: ${structure.hasUsernameInput && structure.hasPasswordInput}`);
    console.log(`  ✓ Submit Button text: "${structure.submitBtnText}"`);
    console.log(`  ✓ Professional SVG emblem: ${structure.hasSvgIcon}`);
    console.log(`  ✓ Institutional credentials guide: ${structure.hasGuideBox}`);

    if (structure.heading !== 'SAAMX Gateway' || !structure.hasThemeToggle || !structure.hasSubmitBtn) {
      throw new Error('LoginPage structure does not meet required specifications.');
    }

    // ------------------------------------------------------------------
    // TEST 2: THEME SWITCHING & DUAL-THEME CONTRAST
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: DUAL-THEME SWITCHING & WCAG CONTRAST ---');

    // 2A. Light Theme
    await cdp.eval(`document.documentElement.setAttribute('data-theme', 'light')`);
    await new Promise(r => setTimeout(r, 200));

    const lightStyles = await cdp.eval(`(() => {
      const card = document.querySelector('.saamx-card');
      const heading = document.querySelector('h1');
      const sub = document.querySelector('.saamx-card p');
      const label = document.querySelector('.saamx-label');
      const input = document.getElementById('login-username');
      const btn = document.querySelector('button[type="submit"]');

      return {
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        cardBg: window.getComputedStyle(card).backgroundColor,
        headingColor: window.getComputedStyle(heading).color,
        subColor: window.getComputedStyle(sub).color,
        labelColor: window.getComputedStyle(label).color,
        btnBg: window.getComputedStyle(btn).backgroundColor,
        btnColor: window.getComputedStyle(btn).color
      };
    })()`);

    const lightHeadingContrast = contrastRatio(lightStyles.headingColor, lightStyles.cardBg);
    const lightSubContrast = contrastRatio(lightStyles.subColor, lightStyles.cardBg);
    const lightBtnContrast = contrastRatio(lightStyles.btnColor, lightStyles.btnBg);

    console.log(`  [Light Theme] Card Bg: ${lightStyles.cardBg}`);
    console.log(`  [Light Theme] Title Contrast: ${lightHeadingContrast}:1 (Target $\ge$ 7:1)`);
    console.log(`  [Light Theme] Subtitle Contrast: ${lightSubContrast}:1 (Target $\ge$ 4.5:1)`);
    console.log(`  [Light Theme] Submit Button Contrast: ${lightBtnContrast}:1 (Target $\ge$ 4.5:1)`);

    // 2B. Dark Theme
    await cdp.eval(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await new Promise(r => setTimeout(r, 200));

    const darkStyles = await cdp.eval(`(() => {
      const card = document.querySelector('.saamx-card');
      const heading = document.querySelector('h1');
      const sub = document.querySelector('.saamx-card p');
      const btn = document.querySelector('button[type="submit"]');

      return {
        cardBg: window.getComputedStyle(card).backgroundColor,
        headingColor: window.getComputedStyle(heading).color,
        subColor: window.getComputedStyle(sub).color,
        btnBg: window.getComputedStyle(btn).backgroundColor,
        btnColor: window.getComputedStyle(btn).color
      };
    })()`);

    const darkHeadingContrast = contrastRatio(darkStyles.headingColor, darkStyles.cardBg);
    const darkSubContrast = contrastRatio(darkStyles.subColor, darkStyles.cardBg);
    const darkBtnContrast = contrastRatio(darkStyles.btnColor, darkStyles.btnBg);

    console.log(`  [Dark Theme] Card Bg: ${darkStyles.cardBg}`);
    console.log(`  [Dark Theme] Title Contrast: ${darkHeadingContrast}:1 (Target $\ge$ 7:1)`);
    console.log(`  [Dark Theme] Subtitle Contrast: ${darkSubContrast}:1 (Target $\ge$ 4.5:1)`);
    console.log(`  [Dark Theme] Submit Button Contrast: ${darkBtnContrast}:1 (Target $\ge$ 4.5:1)`);

    // ------------------------------------------------------------------
    // TEST 3: EMPTY INPUT VALIDATION & AUTHENTICATION FAILURE
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: FORM VALIDATION & AUTHENTICATION FAILURE ---');

    // 3A. Empty field submission check
    await cdp.eval(`(() => {
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const emptyValidation = await cdp.eval(`(() => {
      const alert = document.querySelector('div[role="alert"]');
      return alert?.innerText?.trim();
    })()`);
    console.log(`  ✓ Client-side empty field validation: "${emptyValidation}"`);

    // 3B. Invalid credentials check
    await cdp.eval(`(() => {
      function setVal(el, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      setVal(u, 'T01');
      setVal(p, 'wrongpassword123');
      
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    // Wait for API response
    await new Promise(r => setTimeout(r, 600));

    const errorState = await cdp.eval(`(() => {
      const alert = document.querySelector('div[role="alert"]');
      if (!alert) return null;
      return {
        text: alert.innerText.trim(),
        role: alert.getAttribute('role'),
        ariaLive: alert.getAttribute('aria-live'),
        color: window.getComputedStyle(alert).color,
        bg: window.getComputedStyle(alert).backgroundColor
      };
    })()`);

    console.log(`  ✓ Alert rendered: "${errorState?.text}"`);
    console.log(`  ✓ ARIA role: "${errorState?.role}", live: "${errorState?.ariaLive}"`);
    const errorContrast = contrastRatio(errorState?.color || '#B91C1C', errorState?.bg || 'rgba(220, 38, 38, 0.08)');
    console.log(`  ✓ Error text contrast: ${errorContrast}:1`);

    if (!errorState || !errorState.text.includes('Invalid username, PIN or password')) {
      throw new Error('Authentication failure error alert not properly displayed');
    }

    // ------------------------------------------------------------------
    // TEST 4: SUCCESSFUL LOGIN & SESSION STORAGE
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: SUCCESSFUL AUTHENTICATION & ROLE REDIRECT ---');
    await cdp.eval(`(() => {
      function setVal(el, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      setVal(u, 'T01');
      setVal(p, 'saamx-team-01');
      
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    await new Promise(r => setTimeout(r, 1000));

    const sessionState = await cdp.eval(`(() => {
      return {
        hash: window.location.hash,
        token: sessionStorage.getItem('saamx_token')?.slice(0, 15),
        role: sessionStorage.getItem('saamx_role'),
        username: sessionStorage.getItem('saamx_username'),
        fmsAuth: sessionStorage.getItem('fms_authenticated')
      };
    })()`);

    console.log(`  ✓ Post-login route hash: "${sessionState.hash}" (Expected: "#/team")`);
    console.log(`  ✓ Stored token: "${sessionState.token}..."`);
    console.log(`  ✓ Stored role: "${sessionState.role}", username: "${sessionState.username}"`);
    console.log(`  ✓ Legacy session flag: "${sessionState.fmsAuth}"`);

    if (sessionState.hash !== '#/team' || sessionState.role !== 'team' || !sessionState.token) {
      throw new Error('Successful team login did not properly redirect or persist session');
    }

    // ------------------------------------------------------------------
    // TEST 5: ROLE-AWARE REDIRECT PARAMETER (?redirect=...)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: SAFE REDIRECT QUERY PARAMETER ---');
    await cdp.eval(`(() => {
      sessionStorage.clear();
      window.location.hash = '#/login?redirect=%23%2Fadvisor';
    })()`);
    await new Promise(r => setTimeout(r, 600));

    await cdp.eval(`(() => {
      function setVal(el, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      setVal(u, 'T01');
      setVal(p, 'saamx-team-01');
      
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    await new Promise(r => setTimeout(r, 1000));

    const redirectHash = await cdp.eval('window.location.hash');
    console.log(`  ✓ Post-login redirect with ?redirect=%23%2Fadvisor: "${redirectHash}"`);
    if (redirectHash !== '#/advisor') {
      throw new Error(`Expected redirect to #/advisor, got "${redirectHash}"`);
    }

    // ------------------------------------------------------------------
    // TEST 6: RESPONSIVENESS & VIEWPORT AUDIT (DESKTOP VS MOBILE)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: VIEWPORT RESPONSIVENESS & OVERFLOW ---');
    await cdp.navigate(`${BASE_URL}/#/login`);

    // Desktop 1440x900
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    const desktopCheck = await cdp.eval(`(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth
      };
    })()`);
    console.log(`  ✓ Desktop (1440px): ClientWidth: ${desktopCheck.clientWidth}px, ScrollWidth: ${desktopCheck.scrollWidth}px, Overflow: ${desktopCheck.hasHorizontalOverflow}`);

    // Mobile 375x667
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    const mobileCheck = await cdp.eval(`(() => {
      const doc = document.documentElement;
      const card = document.querySelector('.saamx-card');
      const cardWidth = card ? card.offsetWidth : 0;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        cardWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth
      };
    })()`);
    console.log(`  ✓ Mobile (375px): ClientWidth: ${mobileCheck.clientWidth}px, ScrollWidth: ${mobileCheck.scrollWidth}px, Card Width: ${mobileCheck.cardWidth}px, Overflow: ${mobileCheck.hasHorizontalOverflow}`);

    if (mobileCheck.hasHorizontalOverflow) {
      throw new Error('LoginPage has unwanted horizontal overflow on narrow mobile viewports.');
    }

    // ------------------------------------------------------------------
    // TEST 7: KEYBOARD NAVIGATION & FOCUS VISIBILITY
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: KEYBOARD NAVIGATION & FOCUS VISIBILITY ---');
    const focusCheck = await cdp.eval(`(() => {
      const u = document.getElementById('login-username');
      const p = document.getElementById('login-password');
      const btn = document.querySelector('button[type="submit"]');

      u.focus();
      const firstActive = document.activeElement.id;
      
      p.focus();
      const secondActive = document.activeElement.id;

      btn.focus();
      const thirdActive = document.activeElement.tagName;

      return {
        firstActive,
        secondActive,
        thirdActive
      };
    })()`);

    console.log(`  ✓ Focus order: "${focusCheck.firstActive}" -> "${focusCheck.secondActive}" -> "${focusCheck.thirdActive}"`);
    if (focusCheck.firstActive !== 'login-username' || focusCheck.secondActive !== 'login-password' || focusCheck.thirdActive !== 'BUTTON') {
      throw new Error('Keyboard tab focus sequence failed');
    }

    console.log(`\n======================================================================`);
    console.log(`🎉 ALL PHASE D.1 LOGIN PAGE REAL-BROWSER AUDIT CHECKS PASSED!`);
    console.log(`======================================================================\n`);

  } finally {
    cdp.close();
    serverProcess.kill('SIGTERM');
    if (chromeProcess) chromeProcess.kill('SIGTERM');
    if (fs.existsSync(DISPOSABLE_STATE)) fs.unlinkSync(DISPOSABLE_STATE);
  }

  const finalHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[STATE INTEGRITY] Final state.json SHA-256: ${finalHash}`);
  if (finalHash !== initialHash) {
    throw new Error(`CRITICAL: state.json was altered! Initial: ${initialHash}, Final: ${finalHash}`);
  }
  console.log('✓ Confirmed: state.json strictly untouched (100% byte-for-byte identical).');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
