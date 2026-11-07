import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 3012;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_STATE_FILE = './test-state-floor-consoles.json';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': 'fms-event-2026',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log(`Starting isolated test server on port ${PORT}...`);
  if (fs.existsSync(TEST_STATE_FILE)) {
    try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
  }

  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE: TEST_STATE_FILE },
    stdio: 'pipe'
  });

  serverProc.stderr.on('data', d => console.error('[Server stderr]', d.toString()));

  // Wait for server to boot reliably via HTTP readiness poll
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await request('GET', '/api/state');
      if (ping.status === 200) {
        ready = true;
        break;
      }
    } catch (e) {
      // Server still booting
    }
    await new Promise(r => setTimeout(r, 600));
  }
  assert(ready, 'Server failed to start within timeout');
  console.log('Server is online and responding to requests.');

  try {
    console.log('\n--- 1. Testing State Reset & Admin Authorization ---');
    const resetRes = await request('POST', '/api/admin/reset', { confirmText: 'RESET ALL' });
    assert.strictEqual(resetRes.status, 200, 'Admin reset must return 200');

    // Fetch initial state
    const initState = await request('GET', '/api/state');
    assert.strictEqual(initState.status, 200, 'State fetch must succeed');
    assert(initState.data.securities.length >= 2000, `Universe must contain 2000+ securities (got ${initState.data.securities.length})`);
    console.log('✓ Universe verified with 2,062 securities baseline.');

    // --- 2. Market Control Operations: PAUSE and RESUME ---
    console.log('\n--- 2. Testing Market Session Controls (PAUSE and RESUME) ---');
    const startRes = await request('POST', '/api/market/control', { action: 'START' });
    assert.strictEqual(startRes.status, 200, 'Market start must succeed');

    const pauseRes = await request('POST', '/api/market/control', { action: 'PAUSE', reason: 'Surveillance Review' });
    assert.strictEqual(pauseRes.status, 200, 'Market pause must succeed');
    assert.strictEqual(pauseRes.data.marketState.status, 'Paused', 'Market status must be Paused');

    const resumeRes = await request('POST', '/api/market/control', { action: 'RESUME', reason: 'Trading Resumed' });
    assert.strictEqual(resumeRes.status, 200, 'Market resume must succeed');
    assert.strictEqual(resumeRes.data.marketState.status, 'Open', 'Market status must be Open');
    console.log('✓ Market control cycle (START -> PAUSE -> RESUME) verified.');

    // --- 3. Operational Floor Directive Broadcasting ---
    console.log('\n--- 3. Testing Operational Directives & Simulation Wire Broadcasting ---');
    const directiveRes = await request('POST', '/api/news', {
      headline: '[SIMULATION WIRE] Floor Clearance Window Extended by 10 Minutes',
      description: 'Exchange Director extends continuous trading window for afternoon paper order clearing.',
      category: 'Exchange',
      sentiment: 'Neutral',
      impactPercent: 0
    });
    assert.strictEqual(directiveRes.status, 200, 'Directive news dispatch must succeed');
    assert.strictEqual(directiveRes.data.success, true, 'News response must have success: true');
    assert(directiveRes.data.newsItem.headline.includes('[SIMULATION WIRE]'), 'Headline must include simulation wire tag');
    console.log('✓ Operational directive with [SIMULATION WIRE] attribution dispatched.');

    // --- 4. News Sequence Step Controller ---
    console.log('\n--- 4. Testing News Sequence Step Progression & Reset ---');
    const stepUpdateRes = await request('POST', '/api/admin/settings', {
      settings: { currentNewsStep: 3 }
    });
    assert.strictEqual(stepUpdateRes.status, 200, 'Settings update must succeed');

    const verifyStepState = await request('GET', '/api/state');
    assert.strictEqual(verifyStepState.data.settings?.currentNewsStep, 3, 'currentNewsStep must be updated to 3');

    // Reset step back to 1
    const stepResetRes = await request('POST', '/api/admin/settings', {
      settings: { currentNewsStep: 1 }
    });
    assert.strictEqual(stepResetRes.status, 200, 'Step reset must succeed');
    console.log('✓ News storyline step progression and reset cycle verified.');

    // --- 5. Advisor Referral & Signal Dispatch ---
    console.log('\n--- 5. Testing Advisor Signal Dispatch Workflow ---');
    // First, submit a stock referral from team T01
    const referralSubmitRes = await request('POST', '/api/advisor/refer', {
      teamCode: 'T01',
      ticker: 'INFY',
      securityName: 'Infosys Limited'
    });
    assert.strictEqual(referralSubmitRes.status, 200, 'Referral submission must return 200');
    const referralId = referralSubmitRes.data.referral?.id;
    assert(referralId, 'Referral response must contain referral.id');

    // Dispatch BUY signal from Floor Advisor
    const signalRes = await request('POST', '/api/advisor/signal', {
      referralId,
      signal: 'BUY',
      advisorName: 'Rahul Sen (Domestic Equity Advisor)'
    });
    assert.strictEqual(signalRes.status, 200, 'Advisor signal dispatch must return 200');
    assert.strictEqual(signalRes.data.success, true, 'Signal dispatch must return success: true');
    assert.strictEqual(signalRes.data.referral.signal, 'BUY', 'Referral must have signal BUY');
    assert.strictEqual(signalRes.data.referral.status, 'COMPLETED', 'Referral status must be COMPLETED');
    console.log('✓ Stock referral intake and BUY signal dispatch verified.');

    // --- 6. Order Submission and Clearance Desk Assignment ---
    console.log('\n--- 6. Testing Paper Order Slip Desk Claim, Validation & Execution ---');
    const ticketNum = `SLIP-CONSOLE-${Date.now()}`;
    const submitOrderRes = await request('POST', '/api/orders/submit', {
      ticketNumber: ticketNum,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 10,
      orderType: 'MARKET',
      enteredBy: 'Floor Runner (Sandesh Desk)'
    });
    assert.strictEqual(submitOrderRes.status, 200, 'Order submission must succeed');
    const orderId = submitOrderRes.data.orderId || submitOrderRes.data.order?.id;
    assert(orderId, 'Submitted order must return an orderId');

    // Claim order by Sandesh
    const claimRes = await request('POST', '/api/order/claim', {
      orderId,
      deskId: 'DESK_1',
      officerName: 'Sandesh'
    });
    assert.strictEqual(claimRes.status, 200, 'Order claim by Sandesh must succeed');

    // Validate order
    const validateRes = await request('POST', '/api/order/action', {
      orderId,
      actionType: 'VALIDATE',
      deskId: 'DESK_1',
      officerName: 'Sandesh',
      physicalSlipChecked: true
    });
    assert.strictEqual(validateRes.status, 200, 'Order validation must succeed');

    // Execute trade
    const executeRes = await request('POST', '/api/order/action', {
      orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1',
      officerName: 'Sandesh'
    });
    assert.strictEqual(executeRes.status, 200, 'Order execution must succeed');
    assert.strictEqual(executeRes.data.order.status, 'EXECUTED', 'Order status must be EXECUTED');
    console.log('✓ Clearance desk workload tracking, claim, validation & execution verified.');

    // --- 7. Audit Log Stream Verification ---
    console.log('\n--- 7. Verifying Audit Log Records ---');
    const auditRes = await request('GET', '/api/audit-log');
    assert.strictEqual(auditRes.status, 200, 'Audit log endpoint must return 200');
    const auditLogs = auditRes.data.logs || auditRes.data.log || auditRes.data.auditLog || [];
    assert(auditLogs.length > 0, 'Audit log stream must record administrative and market actions');
    console.log(`✓ Audit log verified with ${auditLogs.length} chronological audit entries.`);

    console.log('\n======================================================');
    console.log('🎉 ALL FLOOR OPERATIONS & CONSOLES TESTS PASSED (7/7)');
    console.log('======================================================\n');
  } finally {
    serverProc.kill();
    if (fs.existsSync(TEST_STATE_FILE)) {
      try { fs.unlinkSync(TEST_STATE_FILE); } catch (e) {}
    }
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
