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

const PORT = 3077;
const CDP_PORT = 9237;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ORIGINAL_STATE = path.join(__dirname, 'state.json');
const DISPOSABLE_STATE = path.join(__dirname, 'test-state-phase-g-disposable.json');
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

async function runRegistrationE2ETest() {
  console.log('======================================================================');
  console.log('📋 SAAMX PHASE G — REGISTRATION END-TO-END & INTEGRITY REVIEW');
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

  // Create disposable state with known initial conditions
  const rawState = JSON.parse(fs.readFileSync(ORIGINAL_STATE, 'utf8'));
  fs.writeFileSync(DISPOSABLE_STATE, JSON.stringify(rawState, null, 2));
  console.log(`✓ Cloned disposable state: ${path.basename(DISPOSABLE_STATE)}`);

  // 2. SPAWN ISOLATED BACKEND ON PORT 3077
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

  // Obtain admin token for authenticated management operations
  const adminLogin = await apiRequest('POST', '/api/auth/login', { username: 'admin', password: 'saamx-event-2026' });
  const adminToken = adminLogin.data?.token;
  assert(adminToken, 'Admin token required for test setup');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('✓ Admin authentication verified for isolated operations.\n');

  // 3. SPAWN CHROME HEADLESS CDP ON PORT 9237
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
    // Clear storage in CDP and navigate cleanly
    await cdp.navigate(`${BASE_URL}/#/register`, 1500);
    await cdp.eval(`
      sessionStorage.clear();
      localStorage.clear();
    `);
    await cdp.reload(1500);

    // ==================================================================
    // SUITE 1: UNAUTHENTICATED NAVIGATION & PUBLIC SHELL
    // ==================================================================
    console.log('======================================================================');
    console.log('🧪 SUITE 1: UNAUTHENTICATED NAVIGATION & PUBLIC SHELL');
    console.log('======================================================================');

    const unauthAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const isReg = text.includes('Investment House Registration') || text.includes('Official Entry Protocol');
      const isLogin = text.includes('Sign In to Floor Console') || text.includes('SAAMX Gateway');
      const hasSidebar = !!document.querySelector('.saamx-sidebar');
      const hasAppHeader = !!document.querySelector('.app-header');
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Floor Gateway'));
      return {
        isReg,
        isLogin,
        hasSidebar,
        hasAppHeader,
        hasBackBtn: !!backBtn,
        hash: window.location.hash
      };
    })()`);

    logResult(
      'Public Shell',
      'Unauthenticated Direct Access',
      unauthAudit.isReg && !unauthAudit.isLogin && !unauthAudit.hasSidebar && !unauthAudit.hasAppHeader,
      `Renders RegistrationPage in public shell without sidebar or internal header`
    );

    logResult(
      'Public Shell',
      'Floor Gateway Back Action Available',
      unauthAudit.hasBackBtn,
      `Floor Gateway return button rendered properly`
    );

    // ==================================================================
    // SUITE 2: CLIENT-SIDE STEP VALIDATION IN REAL BROWSER
    // ==================================================================
    console.log('\n======================================================================');
    console.log('🧪 SUITE 2: CLIENT-SIDE STEP VALIDATION');
    console.log('======================================================================');

    // Helper definition in browser context for setting React controlled input values
    await cdp.eval(`
      window.__setReactValue = function(element, value) {
        if (!element) return false;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
    `);

    // 2.1 Attempt Next on Step 1 with empty fields
    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Investment House'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const step1EmptyAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        hasAlert: text.includes('Please enter the school or institution name'),
        errorText: text.includes('Please enter the school') ? 'Please enter the school or institution name.' : ''
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 1 Requires School Name',
      step1EmptyAudit.hasAlert,
      `Validation caught: "${step1EmptyAudit.errorText}"`
    );

    // 2.2 Fill School details and advance to Step 2 using unambiguous placeholder matching
    await cdp.eval(`(() => {
      const inputs = Array.from(document.querySelectorAll('input'));

      // School Name: matches "Delhi Public School"
      const schoolInput = inputs.find(i => i.placeholder?.includes('Delhi Public School'));
      if (schoolInput) window.__setReactValue(schoolInput, 'National Public School - Indiranagar');

      // Student Team Leader: matches "Aarav Sharma"
      const contactInput = inputs.find(i => i.placeholder?.includes('Aarav Sharma'));
      if (contactInput) window.__setReactValue(contactInput, 'Prof. Rajesh Sharma');

      // Email: type email
      const emailInput = inputs.find(i => i.type === 'email');
      if (emailInput) window.__setReactValue(emailInput, 'rajesh.sharma@nps-ind.edu.in');

      // Phone: type tel
      const phoneInput = inputs.find(i => i.type === 'tel');
      if (phoneInput) window.__setReactValue(phoneInput, '+91 98450 12345');

      // City: exact placeholder "e.g. New Delhi"
      const cityInput = inputs.find(i => i.placeholder === 'e.g. New Delhi');
      if (cityInput) window.__setReactValue(cityInput, 'Bengaluru');
    })()`);
    await new Promise(r => setTimeout(r, 200));

    // Click Next to advance to Step 2
    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Investment House'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const step2Audit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isStep2: text.includes('Step 2: Investment House Identity'),
        hasHouseInput: Array.from(document.querySelectorAll('input')).some(i => i.placeholder?.includes('Apex'))
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 1 Completion Advances to Step 2',
      step2Audit.isStep2,
      'Navigated to Step 2: Investment House Identity'
    );

    // 2.3 Attempt Next on Step 2 with empty house name
    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Delegate Members'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const step2EmptyAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        hasAlert: text.includes('Please enter the Investment House name'),
        errorText: text.includes('Investment House name') ? 'Please enter the Investment House name.' : ''
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 2 Requires Investment House Name',
      step2EmptyAudit.hasAlert,
      `Validation caught: "${step2EmptyAudit.errorText}"`
    );

    // Fill Step 2 details and advance to Step 3
    await cdp.eval(`(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const houseInput = inputs.find(i => i.placeholder?.includes('Apex'));
      if (houseInput) window.__setReactValue(houseInput, 'Indira Sovereign Alpha Fund');

      const codeInput = inputs.find(i => i.placeholder?.includes('APEX01'));
      if (codeInput) window.__setReactValue(codeInput, 'IH99');
    })()`);
    await new Promise(r => setTimeout(r, 200));

    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Delegate Members'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const step3Audit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isStep3: text.includes('Step 3: Team Delegates & Officers'),
        delegateInputs: document.querySelectorAll('input').length
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 2 Completion Advances to Step 3',
      step3Audit.isStep3,
      `Navigated to Step 3 with ${step3Audit.delegateInputs} member inputs`
    );

    // 2.4 Attempt Next on Step 3 with empty delegates
    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Review & Verify'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const step3EmptyAudit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        hasAlert: text.includes('At least 2 student delegate members are required'),
        errorText: text.includes('2 student delegate') ? 'At least 2 student delegate members are required' : ''
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 3 Enforces Minimum 2 Delegates',
      step3EmptyAudit.hasAlert,
      `Validation caught: "${step3EmptyAudit.errorText}"`
    );

    // Fill all officer names specifically by placeholder "Full Name"
    await cdp.eval(`(() => {
      const nameInputs = Array.from(document.querySelectorAll('input')).filter(i => i.placeholder === 'Full Name');
      if (nameInputs[0]) window.__setReactValue(nameInputs[0], 'Aditi Rao');
      if (nameInputs[1]) window.__setReactValue(nameInputs[1], 'Karan Singhania');
      if (nameInputs[2]) window.__setReactValue(nameInputs[2], 'Rohan Gupta');
      if (nameInputs[3]) window.__setReactValue(nameInputs[3], 'Sneha Menon');
    })()`);
    await new Promise(r => setTimeout(r, 300));

    await cdp.eval(`(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next: Review & Verify'));
      if (nextBtn) nextBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const step4Audit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      return {
        isStep4: text.includes('Step 4: Review Registration Details'),
        hasSchool: text.includes('National Public School - Indiranagar'),
        hasHouse: text.includes('Indira Sovereign Alpha Fund'),
        hasAditi: text.includes('Aditi Rao'),
        hasKaran: text.includes('Karan Singhania'),
        heading: document.querySelector('h2')?.innerText || ''
      };
    })()`);

    logResult(
      'Client Validation',
      'Step 4 Review Presentation Integrity',
      step4Audit.isStep4 && step4Audit.hasSchool && step4Audit.hasHouse,
      `Review screen reflects data (Heading: "${step4Audit.heading}", School: ${step4Audit.hasSchool}, House: ${step4Audit.hasHouse})`
    );

    // ==================================================================
    // SUITE 3: SUBMISSION & CONFIRMATION CREDENTIAL TICKET (STEP 5)
    // ==================================================================
    console.log('\n======================================================================');
    console.log('🧪 SUITE 3: SUBMISSION & CONFIRMATION CREDENTIAL TICKET');
    console.log('======================================================================');

    // Click confirm & register house button
    await cdp.eval(`(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm & Register House') || b.innerText.includes('Confirm'));
      if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    const step5Audit = await cdp.eval(`(() => {
      const text = document.body.innerText;
      const isStep5 = text.includes('Registration Successfully Submitted!') || text.includes('Official Registration Ticket');
      const hasPrintBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Print Official Credentials') || b.innerText.includes('Print'));
      const hasBadge = !!document.querySelector('#saamx-credential-badge') || text.includes('OFFICIAL DELEGATE PASS');
      const hasTeamCode = text.includes('IH99') || text.includes('IH');
      const hasTempPin = text.includes('PIN') || text.includes('ACCESS PIN');
      return {
        isStep5,
        hasPrintBtn,
        hasBadge,
        hasTeamCode,
        hasTempPin
      };
    })()`);

    logResult(
      'Submission',
      'Step 5 Official Credential Confirmation Ticket',
      step5Audit.isStep5 && step5Audit.hasPrintBtn && step5Audit.hasTeamCode,
      `Registration submitted successfully and Step 5 confirmation credential rendered (PIN/Ticket: ${step5Audit.hasTempPin})`
    );

    // Verify backend record persistence
    const adminRegs = await apiRequest('GET', '/api/admin/registrations', null, adminHeaders);
    const registeredHouse = adminRegs.data?.investmentHouses?.find(h => h.investmentHouseName === 'Indira Sovereign Alpha Fund');
    logResult(
      'Submission',
      'Authoritative State Persistence',
      !!registeredHouse && registeredHouse.schoolId !== undefined && registeredHouse.teamCode === 'IH99',
      `Registered house persisted in backend state: Code ${registeredHouse?.teamCode}, Status ${registeredHouse?.registrationStatus}`
    );

    // ==================================================================
    // SUITE 4: BACKEND AUTHORITATIVE VALIDATION, DUPLICATES & CAPACITY
    // ==================================================================
    console.log('\n======================================================================');
    console.log('🧪 SUITE 4: BACKEND VALIDATION, DUPLICATES & CAPACITY');
    console.log('======================================================================');

    // 4.1 Missing required fields
    const missingFieldsResp = await apiRequest('POST', '/api/register/complete', {
      schoolName: '',
      investmentHouseName: ''
    });
    logResult(
      'Backend Validation',
      'Missing School & House Name Returns 400',
      missingFieldsResp.status === 400 && missingFieldsResp.data?.error?.includes('required'),
      `Status ${missingFieldsResp.status}: ${missingFieldsResp.data?.error}`
    );

    // 4.2 Duplicate registration handling (Same School Name)
    const duplicateSchoolResp = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'National Public School - Indiranagar',
      investmentHouseName: 'Unique New House Name',
      members: [{ name: 'Test Student', role: 'CIO' }]
    });
    logResult(
      'Duplicate Prevention',
      'Duplicate School Name Rejected with 400',
      duplicateSchoolResp.status === 400 && duplicateSchoolResp.data?.error?.includes('already exists'),
      `Status ${duplicateSchoolResp.status}: ${duplicateSchoolResp.data?.error}`
    );

    // 4.3 Duplicate registration handling (Same House Name)
    const duplicateHouseResp = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'Unique New School Name',
      investmentHouseName: 'Indira Sovereign Alpha Fund',
      members: [{ name: 'Test Student', role: 'CIO' }]
    });
    logResult(
      'Duplicate Prevention',
      'Duplicate Investment House Name Rejected with 400',
      duplicateHouseResp.status === 400 && duplicateHouseResp.data?.error?.includes('already exists'),
      `Status ${duplicateHouseResp.status}: ${duplicateHouseResp.data?.error}`
    );

    // 4.4 Closed registration lifecycle enforcement
    await apiRequest('POST', '/api/event/lifecycle', {
      eventStatus: 'REGISTRATION_CLOSED'
    }, adminHeaders);

    const closedRegAttempt = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'Test School While Closed',
      investmentHouseName: 'Test House While Closed',
      members: [{ name: 'Test Student', role: 'CIO' }]
    });
    logResult(
      'Registration Lifecycle',
      'Closed Registration Lifecycle Returns 403 Forbidden',
      closedRegAttempt.status === 403 && closedRegAttempt.data?.error?.includes('closed'),
      `Status ${closedRegAttempt.status}: ${closedRegAttempt.data?.error}`
    );

    // 4.5 Capacity enforcement (10–20 houses)
    // Reopen registration
    await apiRequest('POST', '/api/event/lifecycle', { eventStatus: 'REGISTRATION_OPEN' }, adminHeaders);

    // Set capacity to 10 via authoritative administrative endpoint
    const capSetResp = await apiRequest('POST', '/api/admin/capacity', { capacity: 10 }, adminHeaders);
    assert.strictEqual(capSetResp.status, 200, 'Capacity set failed');

    // Check how many houses currently exist for the event
    const preCapRegs = await apiRequest('GET', '/api/admin/registrations', null, adminHeaders);
    let houseCount = preCapRegs.data?.investmentHouses?.length || 0;

    // Fill capacity up to 10 houses
    while (houseCount < 10) {
      const idx = houseCount + 1;
      const fillResp = await apiRequest('POST', '/api/register/complete', {
        schoolName: `School Seat Fill ${idx}`,
        investmentHouseName: `House Seat Fill ${idx}`,
        members: [{ name: `Student ${idx}`, role: 'CIO' }]
      });
      assert.strictEqual(fillResp.status, 200, `Fill house ${idx} failed: ${JSON.stringify(fillResp.data)}`);
      houseCount++;
    }

    // Attempt 11th registration
    const capExceededResp = await apiRequest('POST', '/api/register/complete', {
      schoolName: 'Capacity Overfill School',
      investmentHouseName: 'Capacity Overfill House',
      members: [{ name: 'Overfill Student', role: 'CIO' }]
    });

    logResult(
      'Capacity Enforcement',
      'Capacity Ceiling (10 Houses) Rejection with 400',
      capExceededResp.status === 400 && capExceededResp.data?.error?.includes('Maximum capacity reached'),
      `Status ${capExceededResp.status}: ${capExceededResp.data?.error}`
    );

    // 4.6 Verify backend enforcement vs UI
    // Ensure 10 houses are correctly reflected in backend state
    const finalRegs = await apiRequest('GET', '/api/admin/registrations', null, adminHeaders);
    const finalCount = finalRegs.data?.investmentHouses?.length;
    logResult(
      'Authoritative State Integrity',
      'Capacity Saturated at Exactly 10 Houses in Authoritative Registry',
      finalCount === 10,
      `Authoritative investment houses recorded: ${finalCount}/10`
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

  // 5. POST-FLIGHT STATE INTEGRITY CHECK
  console.log('\n--- STEP 5: POST-TEST STATE.JSON HASH INTEGRITY ---');
  const postHash = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL_STATE)).digest('hex');
  console.log(`[POST-FLIGHT] state.json SHA-256: ${postHash}`);
  assert.strictEqual(postHash, EXPECTED_HASH, 'Post-flight hash mismatch!');
  console.log('✓ Post-flight state.json SHA-256 verified 100% identical to baseline!\n');

  console.log('======================================================================');
  console.log('📊 REGISTRATION E2E VERIFICATION SUMMARY');
  console.log('======================================================================');
  const passed = testLog.filter(t => t.passed).length;
  const failed = testLog.filter(t => !t.passed).length;
  console.log(`Total Checks: ${testLog.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    throw new Error(`${failed} verification checks failed!`);
  }
}

runRegistrationE2ETest().catch(err => {
  console.error('\n❌ Fatal error in registration E2E test:', err);
  process.exit(1);
});
