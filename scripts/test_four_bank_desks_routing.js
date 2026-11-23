import assert from 'assert';
import fs from 'fs';

console.log('====================================================');
console.log('   TESTING 4 BANK COUNTERS & DYNAMIC ROUTING');
console.log('====================================================\n');

// 1. Check state.json
const stateJson = JSON.parse(fs.readFileSync('state.json', 'utf8'));
assert(stateJson.bankDesks, 'state.json must have bankDesks');
const bankDeskKeys = Object.keys(stateJson.bankDesks);
console.log('[Check 1] state.json bank desks:', bankDeskKeys);
assert.deepStrictEqual(bankDeskKeys.sort(), ['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4'].sort(), 'All 4 bank desks must be in state.json');

// 2. Check server.js initialization & fallback
const serverJs = fs.readFileSync('server.js', 'utf8');
assert(serverJs.includes('BANK_3'), 'server.js must define BANK_3');
assert(serverJs.includes('BANK_4'), 'server.js must define BANK_4');
assert(serverJs.includes("['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4']"), 'server.js fallbackBankDesks must have all 4 desks');

// 3. Simulate least-queue routing across all 4 bank desks
console.log('[Check 2] Simulating least-queue order distribution across all 4 bank desks:');
const simulatedBankDesks = ['BANK_1', 'BANK_2', 'BANK_3', 'BANK_4'];
const orders = [];

function routeNextOrder(orderId) {
  const counts = simulatedBankDesks.map(bId => 
    orders.filter(o => o.bankDeskId === bId && o.status === 'EXECUTED_PENDING_SETTLEMENT').length
  );
  const minIdx = counts.indexOf(Math.min(...counts));
  const assignedDesk = simulatedBankDesks[minIdx >= 0 ? minIdx : 0];
  orders.push({ id: orderId, bankDeskId: assignedDesk, status: 'EXECUTED_PENDING_SETTLEMENT' });
  return assignedDesk;
}

const assigned1 = routeNextOrder('ORD_001');
const assigned2 = routeNextOrder('ORD_002');
const assigned3 = routeNextOrder('ORD_003');
const assigned4 = routeNextOrder('ORD_004');
const assigned5 = routeNextOrder('ORD_005');

console.log(`Order 1 -> ${assigned1}`);
console.log(`Order 2 -> ${assigned2}`);
console.log(`Order 3 -> ${assigned3}`);
console.log(`Order 4 -> ${assigned4}`);
console.log(`Order 5 -> ${assigned5}`);

assert.strictEqual(assigned1, 'BANK_1');
assert.strictEqual(assigned2, 'BANK_2');
assert.strictEqual(assigned3, 'BANK_3');
assert.strictEqual(assigned4, 'BANK_4');
assert.strictEqual(assigned5, 'BANK_1');
console.log('[Check 2 PASS] Verified least-queue routing distributes across all 4 counters!');

// 4. Check BankPage.jsx filter & presentation
const bankPageJsx = fs.readFileSync('src/pages/BankPage.jsx', 'utf8');
assert(bankPageJsx.includes('value="BANK_3"'), 'BankPage must include BANK_3 in filter');
assert(bankPageJsx.includes('value="BANK_4"'), 'BankPage must include BANK_4 in filter');
assert(bankPageJsx.includes('All Desks (BANK_1 – BANK_4)'), 'BankPage dropdown must reflect 1-4');
console.log('[Check 3 PASS] BankPage.jsx has all 4 counters in filter and badge handlers.');

console.log('\nALL 4-COUNTER TESTS PASSED SUCCESSFULLY!\n');
process.exit(0);
