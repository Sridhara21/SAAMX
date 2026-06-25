import http from 'http';

const PASSWORD = 'fms-event-2026';
const BASE_URL = 'http://localhost:3000';

const apiPost = (path, body) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = JSON.stringify(body);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': PASSWORD,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const apiPut = (path, body) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = JSON.stringify(body);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-FMS-Password': PASSWORD,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const apiGet = (path) => {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
};

const run = async () => {
  try {
    console.log('1. Seeding database...');
    await apiPost('/api/admin/seed', {});

    console.log('2. Starting Market Simulation...');
    await apiPost('/api/market/control', { action: 'START', duration: 60 });

    console.log('3. Fetching seeded state...');
    const initialState = await apiGet('/api/state');
    const teamId = initialState.state.teams[0].id;
    const sec1 = initialState.state.securities[0].id;
    const sec2 = initialState.state.securities[1].id;

    console.log(`Using Team: ${teamId}, Asset 1: ${sec1}, Asset 2: ${sec2}`);

    console.log('4. Logging 5 sequential transactions for server kill testing...');
    for (let i = 1; i <= 5; i++) {
      const tx = await apiPost('/api/trade', {
        teamId,
        securityId: sec1,
        action: 'BUY',
        quantity: 1,
        enteredBy: `Sequential-Test-Bot-${i}`
      });
    }
    console.log('   Sequential transactions logged.');

    console.log('5. Executing concurrent write test (2 trades A and B)...');
    const trade1 = apiPost('/api/trade', {
      teamId,
      securityId: sec1,
      action: 'BUY',
      quantity: 2,
      enteredBy: 'Concurrent-Bot-A'
    });
    const trade2 = apiPost('/api/trade', {
      teamId,
      securityId: sec2,
      action: 'BUY',
      quantity: 5,
      enteredBy: 'Concurrent-Bot-B'
    });

    const [res1, res2] = await Promise.all([trade1, trade2]);
    console.log(`   Concurrent trade A logged: ${res1.transaction.id}`);
    console.log(`   Concurrent trade B logged: ${res2.transaction.id}`);

    console.log('\n====================================================');
    console.log('6. STARTING RACE CONDITION TEST...');
    console.log('   Overriding Asset 1 available units to exactly 10...');
    await apiPut(`/api/securities/${sec1}`, { availableUnits: 10, currentPrice: 100 });
    
    console.log('   Firing two simultaneous BUY orders for 8 units each (Total: 16 units)...');
    
    const raceOrder1 = apiPost('/api/trade', {
      teamId,
      securityId: sec1,
      action: 'BUY',
      quantity: 8,
      enteredBy: 'Race-Client-1'
    });

    const raceOrder2 = apiPost('/api/trade', {
      teamId,
      securityId: sec1,
      action: 'BUY',
      quantity: 8,
      enteredBy: 'Race-Client-2'
    });

    const results = await Promise.allSettled([raceOrder1, raceOrder2]);

    const successResult = results.find(r => r.status === 'fulfilled');
    const failedResult = results.find(r => r.status === 'rejected');

    if (successResult) {
      console.log(`   ✔ Order Succeeded: ${successResult.value.transaction.id} - Qty: ${successResult.value.transaction.quantity} executed.`);
    } else {
      console.log('   ❌ No order succeeded.');
    }

    if (failedResult) {
      console.log(`   ✔ Order Rejected as expected: ${failedResult.reason.message}`);
    } else {
      console.log('   ❌ Both orders succeeded! (Race Condition Alert!)');
    }

    const finalState = await apiGet('/api/state');
    const finalSec1 = finalState.state.securities.find(s => s.id === sec1);
    console.log(`   ✔ Asset Final Available Units: ${finalSec1.availableUnits} (Expected: 2, must not be negative)`);

    if (finalSec1.availableUnits >= 0 && successResult && failedResult) {
      console.log('====================================================');
      console.log('RACE CONDITION TEST PASSED SUCCESSFULLY!');
      console.log('====================================================');
    } else {
      console.log('====================================================');
      console.log('RACE CONDITION TEST FAILED!');
      console.log('====================================================');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  }
};

run();
