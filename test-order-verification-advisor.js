import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';

const PORT = 3007;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  console.log(`Starting server on port ${PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {
    // console.log(d.toString());
  });
  serverProc.stderr.on('data', d => {
    console.error(d.toString());
  });

  // Wait for server to boot
  await new Promise(r => setTimeout(r, 2000));

  try {
    // 1. Reset state
    console.log('1. Seeding and starting market...');
    const seedRes = await request('POST', '/api/admin/reset', { confirmText: 'RESET ALL' });
    assert.strictEqual(seedRes.status, 200);

    const startRes = await request('POST', '/api/market/control', { action: 'START' });
    assert.strictEqual(startRes.status, 200);

    // 2. Submit paper order slip
    console.log('2. Testing Order Submission & Initial Verification Status...');
    const tktNum = `TKT-${Date.now()}`;
    const orderRes = await request('POST', '/api/order/create', {
      ticketNumber: tktNum,
      teamCode: 'T01',
      ticker: 'RELIANCE',
      action: 'BUY',
      quantity: 50,
      orderType: 'MARKET',
      enteredBy: 'Desk Operator 1'
    });
    if (orderRes.status !== 200) {
      console.error('Order creation failed with:', orderRes.status, orderRes.data);
    }
    assert.strictEqual(orderRes.status, 200);
    assert.strictEqual(orderRes.data.order.status, 'PENDING');
    assert.strictEqual(orderRes.data.order.workflowStage, 'AWAITING_VERIFICATION');
    assert.strictEqual(orderRes.data.order.verificationStatus, 'PENDING');
    assert(orderRes.data.order.requestedValue > 0, 'requestedValue must be computed');
    const orderId = orderRes.data.orderId;

    // 3. Verification Officer Claims Ticket
    console.log('3. Testing Verification Claim...');
    const claimRes = await request('POST', '/api/verification/claim', {
      orderId,
      officerName: 'Verification Officer Maya',
      deskId: 'VERIFY_DESK_1'
    });
    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.data.order.status, 'BEING_VERIFIED');
    assert.strictEqual(claimRes.data.order.workflowStage, 'BEING_VERIFIED');

    // 4. Verification Officer Returns Ticket for Correction
    console.log('4. Testing Return for Correction Workflow...');
    const returnRes = await request('POST', '/api/verification/return', {
      orderId,
      officerName: 'Verification Officer Maya',
      returnReason: 'Quantity illegible on physical slip; please re-confirm signature.'
    });
    assert.strictEqual(returnRes.status, 200);
    assert.strictEqual(returnRes.data.order.status, 'RETURNED_FOR_CORRECTION');
    assert.strictEqual(returnRes.data.order.returnReason, 'Quantity illegible on physical slip; please re-confirm signature.');

    // 5. Investment House Corrects and Resubmits
    console.log('5. Testing Team Resubmission...');
    const resubmitRes = await request('POST', '/api/orders/resubmit', {
      orderId,
      teamCode: 'T01',
      quantity: 60,
      notes: 'Clarified 60 units with CIO countersignature'
    });
    assert.strictEqual(resubmitRes.status, 200);
    assert.strictEqual(resubmitRes.data.order.status, 'PENDING');
    assert.strictEqual(resubmitRes.data.order.quantity, 60);

    // 6. Verification Officer Marks Order Verified
    console.log('6. Testing Mark Verified with Physical Slip Confirmation...');
    const verifyRes = await request('POST', '/api/verification/verify', {
      orderId,
      officerName: 'Verification Officer Maya',
      physicalSlipChecked: true
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.order.status, 'VERIFIED_AWAITING_EXCHANGE');
    assert.strictEqual(verifyRes.data.order.verificationStatus, 'VERIFIED');
    assert.strictEqual(verifyRes.data.order.physicalSlipChecked, true);

    // 7. Exchange Desk Validates & Executes
    console.log('7. Testing Exchange Desk Validation and Execution...');
    const valRes = await request('POST', '/api/order/action', {
      orderId,
      actionType: 'VALIDATE',
      deskId: 'DESK_1',
      operator: 'Sandesh'
    });
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.data.order.status, 'VALIDATED');

    const execRes = await request('POST', '/api/order/action', {
      orderId,
      actionType: 'EXECUTE',
      deskId: 'DESK_1',
      operator: 'Sandesh'
    });
    assert.strictEqual(execRes.status, 200);
    assert.strictEqual(execRes.data.order.status, 'EXECUTED');
    assert.strictEqual(execRes.data.order.executionQuantity, 60);
    assert(execRes.data.order.executionPrice > 0);
    assert(execRes.data.order.executionValue > 0);
    assert(execRes.data.transaction, 'Transaction must be created');

    // 8. Simple Stock-Advisor Referral System
    console.log('8. Testing Simple Stock-Advisor Referral System...');
    const referRes = await request('POST', '/api/advisor/refer', {
      teamCode: 'T01',
      ticker: 'TCS'
    });
    assert.strictEqual(referRes.status, 200);
    assert.strictEqual(referRes.data.referral.status, 'PENDING');
    assert.strictEqual(referRes.data.referral.signal, null);
    const referralId = referRes.data.referral.id;

    // Test Duplicate Referral Prevention
    const dupReferRes = await request('POST', '/api/advisor/refer', {
      teamCode: 'T01',
      ticker: 'TCS'
    });
    assert.strictEqual(dupReferRes.status, 400, 'Duplicate pending referral must be rejected');

    // Test Invalid Signal (rejects non-BUY/HOLD/SELL)
    console.log('9. Testing Signal Validation (Strict BUY/HOLD/SELL only)...');
    const invalidSignalRes = await request('POST', '/api/advisor/signal', {
      referralId,
      signal: 'STRONG_BUY_TARGET_4500',
      advisorName: 'Floor Advisor'
    });
    assert.strictEqual(invalidSignalRes.status, 400, 'Non BUY/HOLD/SELL signals must be rejected');

    // Submit Valid Signal (BUY)
    const validSignalRes = await request('POST', '/api/advisor/signal', {
      referralId,
      signal: 'BUY',
      advisorName: 'Senior Floor Advisor'
    });
    assert.strictEqual(validSignalRes.status, 200);
    assert.strictEqual(validSignalRes.data.referral.status, 'COMPLETED');
    assert.strictEqual(validSignalRes.data.referral.signal, 'BUY');

    // Prevent Overwriting Published Signal
    const overwriteRes = await request('POST', '/api/advisor/signal', {
      referralId,
      signal: 'HOLD',
      advisorName: 'Another Advisor'
    });
    assert.strictEqual(overwriteRes.status, 400, 'Overwriting published signal must be rejected');

    // 10. Reports CSV Endpoints
    console.log('10. Testing CSV Report Endpoints...');
    const ordersCsvRes = await request('GET', '/api/reports/orders/csv');
    assert.strictEqual(ordersCsvRes.status, 200);
    assert(ordersCsvRes.data.includes(tktNum), 'Orders CSV must contain executed order ticket');
    assert(ordersCsvRes.data.includes('EXECUTED'), 'Orders CSV must contain EXECUTED status');

    const reconCsvRes = await request('GET', '/api/reports/reconciliation/csv');
    assert.strictEqual(reconCsvRes.status, 200);
    assert(reconCsvRes.data.includes('T01'), 'Reconciliation CSV must contain T01');
    assert(reconCsvRes.data.includes('10000000'), 'Reconciliation CSV must contain 1 Crore starting capital');

    console.log('\n======================================================');
    console.log('🎉 ALL ORDER LIFECYCLE, VERIFICATION & ADVISOR TESTS PASSED!');
    console.log('======================================================');
  } finally {
    serverProc.kill();
  }
}

run().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
