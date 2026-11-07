import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  hydrateStateFromPg,
  updateOrderStatusInDb,
  executeDirectTradeInDb,
  rejectBankVoucherInDb,
  recordJournalEntry
} from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const EXPECTED_STATE_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertTest(name, condition, details = {}) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${name}`);
    if (Object.keys(details).length > 0) {
      console.log(`       Evidence: ${JSON.stringify(details)}`);
    }
  } else {
    failedTests++;
    console.error(`[FAIL] ${name}`);
    console.error(`       Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function runAdversarialVerification() {
  console.log('======================================================================');
  console.log('⚡ SAAMX PHASE 6 ADVERSARIAL REMEDIATION VERIFICATION SUITE');
  console.log('======================================================================\n');

  // ------------------------------------------------------------------
  // 1. STATE IMMUTABILITY PRE-CHECK
  // ------------------------------------------------------------------
  console.log('--- 1. Authoritative state.json SHA-256 Preservation ---');
  const statePath = path.join(REPO_ROOT, 'state.json');
  const stateBuffer = fs.readFileSync(statePath);
  const actualHash = crypto.createHash('sha256').update(stateBuffer).digest('hex');
  assertTest('STATE-HASH-CHECK: state.json remains bit-identical to baseline', actualHash === EXPECTED_STATE_HASH, {
    expected: EXPECTED_STATE_HASH,
    actual: actualHash
  });

  // ------------------------------------------------------------------
  // 2. HYDRATION STATE ASSIGNMENT & CONSOLIDATED CASH BALANCE
  // ------------------------------------------------------------------
  console.log('\n--- 2. Database Hydration & Team Cash Consolidation ---');
  const mockHydrationPool = {
    query: async (sql, params) => {
      const q = sql.trim().toUpperCase();
      if (q.includes('FROM SECURITIES')) {
        return {
          rows: [
            { ticker: 'RELIANCE', current_price: 2500, available_units: 50000, lot_size: 10, currency: 'INR' },
            { ticker: 'AAPL', current_price: 180, available_units: 10000, lot_size: 1, currency: 'USD' }
          ]
        };
      }
      if (q.includes('FROM WALLETS')) {
        return {
          rows: [
            { team_id: 'T01', currency: 'INR', balance: 5000000, reserved: 0 },
            { team_id: 'T01', currency: 'USD', balance: 10000, reserved: 0 } // 10000 USD * 83 = 830,000 INR
          ]
        };
      }
      if (q.includes('FROM HOLDINGS')) {
        return {
          rows: [
            { team_id: 'T01', ticker: 'RELIANCE', quantity: 200, average_price: 2400 }
          ]
        };
      }
      if (q.includes('FROM ORDERS')) {
        return {
          rows: [
            { id: 'ORD-101', ticket_number: 'TKT-001', team_id: 'T01', ticker: 'RELIANCE', action: 'BUY', order_type: 'MARKET', quantity: 50, status: 'EXECUTED' }
          ]
        };
      }
      if (q.includes('FROM SETTLEMENT_VOUCHERS')) {
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  const initialServerState = {
    teams: [{ id: 'T01', teamCode: 'T01', teamName: 'House Alpha', pin: '1234' }],
    fxRates: {
      USDINR: { midRate: 83.0 }
    }
  };

  const hydrationResult = await hydrateStateFromPg(mockHydrationPool, initialServerState);
  assertTest('HYDRATION-SUCCESS: hydrateStateFromPg completes successfully', hydrationResult.hydrated === true, {
    orderCount: hydrationResult.state?.orders?.length,
    securitiesCount: hydrationResult.state?.securities?.length
  });

  const hydratedTeam = hydrationResult.state.teams.find(t => t.teamCode === 'T01');
  // Expected consolidated cashBalance: 5,000,000 (INR) + 10,000 * 83 (USD) = 5,830,000
  assertTest('HYDRATION-CASH-CONSOLIDATION: Team consolidated cashBalance calculated across currencies', hydratedTeam && hydratedTeam.cashBalance === 5830000, {
    teamCode: hydratedTeam?.teamCode,
    cashBalance: hydratedTeam?.cashBalance,
    expectedCash: 5830000,
    cashWallets: hydratedTeam?.cashWallets
  });

  // Verify server.js line 11398 pattern: Object.assign(state, hydration.state) works and mutates original object
  Object.assign(initialServerState, hydrationResult.state);
  assertTest('HYDRATION-OBJECT-ASSIGN: Server state object retains hydrated database values', initialServerState.orders?.length === 1 && initialServerState.securities?.length === 2, {
    serverOrderCount: initialServerState.orders?.length,
    serverSecuritiesCount: initialServerState.securities?.length
  });

  // ------------------------------------------------------------------
  // 3. updateOrderStatusInDb AUTHORITATIVE PERSISTENCE
  // ------------------------------------------------------------------
  console.log('\n--- 3. Authoritative Order Status Database Persistence ---');
  const capturedQueries = [];
  const mockClient = {
    query: async (sql, params) => {
      capturedQueries.push({ sql, params });
      return { rowCount: 1, rows: [{ id: params?.[0] || 'ORD-999', status: params?.[1] }] };
    }
  };

  // Test REJECT, CANCEL, CLAIM, VERIFY, RETURN_FOR_CORRECTION, RESUBMIT
  const statusActions = [
    { status: 'REJECTED', reason: 'Insufficient Margin' },
    { status: 'CANCELLED', reason: 'User Cancelled' },
    { status: 'VERIFYING', reason: null },
    { status: 'VALIDATED', reason: null },
    { status: 'RETURNED_FOR_CORRECTION', reason: 'Fix lot size' },
    { status: 'SETTLEMENT_REJECTED', reason: 'Voucher bounced' }
  ];

  let allStatusUpdated = true;
  for (const item of statusActions) {
    const res = await updateOrderStatusInDb(mockClient, {
      orderId: 'ORD-TEST-1',
      ticketNumber: 'TKT-TEST-1',
      status: item.status,
      rejectionReason: item.reason,
      returnReason: item.reason,
      executedBy: 'operator-1'
    });
    if (!res || !res.persistedInDb) allStatusUpdated = false;
  }

  assertTest('ORDER-STATUS-DB-PERSISTENCE: updateOrderStatusInDb executes for all lifecycle states', allStatusUpdated, {
    queriesRun: capturedQueries.length,
    sampleSql: capturedQueries[0]?.sql,
    sampleParams: capturedQueries[0]?.params
  });

  // ------------------------------------------------------------------
  // 4. executeDirectTradeInDb ATOMIC DIRECT TRADES
  // ------------------------------------------------------------------
  console.log('\n--- 4. Direct Trade Database Execution & Ledger Recording ---');
  const tradeQueries = [];
  const mockTradeClient = {
    query: async (sql, params) => {
      tradeQueries.push({ sql: sql.trim(), params });
      const q = sql.trim().toUpperCase();
      if (q.includes('FROM SECURITIES') && q.includes('FOR UPDATE')) {
        return { rows: [{ ticker: 'TCS', current_price: 3500, available_units: 10000, status: 'Active' }] };
      }
      if (q.includes('FROM WALLETS') && q.includes('FOR UPDATE')) {
        return { rows: [{ team_id: 'T01', currency: 'INR', balance: 1000000, reserved: 0 }] };
      }
      if (q.includes('FROM HOLDINGS') && q.includes('FOR UPDATE')) {
        return { rows: [{ team_id: 'T01', ticker: 'TCS', quantity: 50, average_price: 3400 }] };
      }
      if (q.includes('INSERT INTO EXECUTIONS')) {
        return { rows: [{ id: 'EXEC-001' }] };
      }
      if (q.includes('INSERT INTO JOURNAL_ENTRIES')) {
        return { rows: [{ id: 'JE-001' }] };
      }
      return { rowCount: 1, rows: [] };
    }
  };

  const tradeResult = await executeDirectTradeInDb(mockTradeClient, {
    tradeId: 'TRADE-DIR-1',
    teamId: 'T01',
    ticker: 'TCS',
    action: 'BUY',
    quantity: 10,
    executionPrice: 3500,
    deskId: 'DESK-A',
    operator: 'Lead Clerk'
  });

  const hasSecUpdate = tradeQueries.some(q => q.sql.includes('UPDATE securities'));
  const hasWalletUpdate = tradeQueries.some(q => q.sql.includes('UPDATE wallets'));
  const hasHoldingInsertUpdate = tradeQueries.some(q => q.sql.includes('INSERT INTO holdings'));
  const hasExecInsert = tradeQueries.some(q => q.sql.includes('INSERT INTO executions'));
  const hasAccountInsert = tradeQueries.some(q => q.sql.includes('INSERT INTO accounts'));
  const hasJournalInsert = tradeQueries.some(q => q.sql.includes('INSERT INTO journal_entries'));
  const hasLedgerInsert = tradeQueries.some(q => q.sql.includes('INSERT INTO ledger_lines'));

  assertTest('DIRECT-TRADE-DB-EXECUTION: Direct trade updates securities, wallets, holdings, executions, and double-entry ledger in PostgreSQL',
    tradeResult.persistedInDb && hasSecUpdate && hasWalletUpdate && hasHoldingInsertUpdate && hasExecInsert && hasAccountInsert && hasJournalInsert && hasLedgerInsert,
    {
      tradeSuccess: tradeResult.persistedInDb,
      totalQueries: tradeQueries.length,
      hasSecUpdate,
      hasWalletUpdate,
      hasHoldingInsertUpdate,
      hasExecInsert,
      hasAccountInsert,
      hasJournalInsert,
      hasLedgerInsert
    }
  );

  // ------------------------------------------------------------------
  // 5. VOUCHER REJECTION FLOAT RESTORATION FIX (NO SHARE DUPLICATION)
  // ------------------------------------------------------------------
  console.log('\n--- 5. Voucher Rejection Float Invariant Check ---');
  const rejectQueries = [];
  const mockRejectClient = {
    query: async (sql, params) => {
      rejectQueries.push({ sql: sql.trim(), params });
      const q = sql.trim().toUpperCase();
      if (q.includes('FROM SETTLEMENT_VOUCHERS') && q.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'VOUCH-001',
            status: 'PENDING',
            order_id: 'ORD-SELL-1',
            ticket_number: 'TKT-SELL-1',
            team_id: 'T01',
            ticker: 'INFY',
            action: 'SELL',
            amount: 150000,
            currency: 'INR'
          }]
        };
      }
      if (q.includes('FROM ORDERS') && q.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'ORD-SELL-1',
            quantity: 100
          }]
        };
      }
      return { rowCount: 1, rows: [] };
    }
  };

  const rejectResult = await rejectBankVoucherInDb(mockRejectClient, {
    settlementId: 'VOUCH-001',
    effectiveActor: 'Teller-01',
    rejectionReason: 'Signature mismatch'
  });
  const secDecrementQuery = rejectQueries.find(q => q.sql.includes('UPDATE securities') && q.sql.includes('available_units = GREATEST(0, available_units - $1)'));
  const holdingRestoreQuery = rejectQueries.find(q => q.sql.includes('INSERT INTO holdings') && q.sql.includes('ON CONFLICT (team_id, ticker) DO UPDATE'));
  const orderStatusQuery = rejectQueries.find(q => q.sql.includes('UPDATE orders') && q.params[0] === 'Signature mismatch' && q.params[1] === 'ORD-SELL-1');

  assertTest('VOUCHER-REJECT-NO-SHARE-DUPLICATION: rejectBankVoucherInDb decrements available_units on SELL rejection',
    rejectResult.persistedInDb && !!secDecrementQuery && !!holdingRestoreQuery && !!orderStatusQuery,
    {
      secDecrementSql: secDecrementQuery?.sql,
      secDecrementParams: secDecrementQuery?.params,
      orderStatusSql: orderStatusQuery?.sql,
      orderStatusParams: orderStatusQuery?.params
    }
  );

  // ------------------------------------------------------------------
  // 6. MIGRATION 001 STATUS CHECK CONSTRAINT
  // ------------------------------------------------------------------
  console.log('\n--- 6. Migration Check Constraint Verification ---');
  const migration001Path = path.join(REPO_ROOT, 'database', 'migrations', '001_phase6_order_lifecycle_and_idempotency.sql');
  const migrationContent = fs.readFileSync(migration001Path, 'utf8');
  const hasVerifyingConstraint = migrationContent.includes("'VERIFYING'");
  const hasSettlementRejectedConstraint = migrationContent.includes("'SETTLEMENT_REJECTED'");

  assertTest('MIGRATION-001-CONSTRAINTS: orders_status_check permits VERIFYING and SETTLEMENT_REJECTED',
    hasVerifyingConstraint && hasSettlementRejectedConstraint,
    { hasVerifyingConstraint, hasSettlementRejectedConstraint }
  );

  // ------------------------------------------------------------------
  // 7. FRONTEND MARKET-ORDER-ONLY COMPLIANCE
  // ------------------------------------------------------------------
  console.log('\n--- 7. Frontend Market-Order-Only & Domain Configuration ---');
  const paperSlipPath = path.join(REPO_ROOT, 'src', 'components', 'team', 'PaperSlipModal.jsx');
  const paperSlipContent = fs.readFileSync(paperSlipPath, 'utf8');
  const paperSlipNoLimitState = !paperSlipContent.includes("useState('LIMIT')");
  const paperSlipHasMarketOnly = paperSlipContent.includes("useState('MARKET')");
  const paperSlipNoLimitPriceInput = !paperSlipContent.includes('placeholder="Enter limit price"');
  const paperSlipSendsMarket = paperSlipContent.includes("orderType: 'MARKET'");

  assertTest('FE-PAPER-SLIP-MARKET-ONLY: PaperSlipModal enforces MARKET orders and eliminates limit price input',
    paperSlipNoLimitState && paperSlipHasMarketOnly && paperSlipNoLimitPriceInput && paperSlipSendsMarket,
    { paperSlipNoLimitState, paperSlipHasMarketOnly, paperSlipNoLimitPriceInput, paperSlipSendsMarket }
  );

  const orderHistoryPath = path.join(REPO_ROOT, 'src', 'components', 'team', 'OrderHistorySection.jsx');
  const orderHistoryContent = fs.readFileSync(orderHistoryPath, 'utf8');
  const orderHistoryNoLimitState = !orderHistoryContent.includes('resubmitLimitPrice');
  const orderHistorySendsMarket = orderHistoryContent.includes("orderType: 'MARKET'");

  assertTest('FE-ORDER-HISTORY-MARKET-ONLY: OrderHistorySection resubmit enforces MARKET orders and eliminates limit input',
    orderHistoryNoLimitState && orderHistorySendsMarket,
    { orderHistoryNoLimitState, orderHistorySendsMarket }
  );

  const apiJsPath = path.join(REPO_ROOT, 'src', 'lib', 'api.js');
  const apiJsContent = fs.readFileSync(apiJsPath, 'utf8');
  const apiHandlesFirebaseHosts =
    apiJsContent.includes("'fmos-a6573.web.app'") &&
    apiJsContent.includes("'fmos-a6573.firebaseapp.com'");

  assertTest('FE-API-FIREBASE-ROUTING: src/lib/api.js routes Firebase Hosting domains to https://api.saamx.in',
    apiHandlesFirebaseHosts,
    { apiHandlesFirebaseHosts }
  );

  const wsHookPath = path.join(REPO_ROOT, 'src', 'hooks', 'useFirebaseState.js');
  const wsHookContent = fs.readFileSync(wsHookPath, 'utf8');
  const wsHandlesFirebaseHosts =
    wsHookContent.includes("'fmos-a6573.web.app'") &&
    wsHookContent.includes("'fmos-a6573.firebaseapp.com'");

  assertTest('FE-WS-FIREBASE-ROUTING: useFirebaseState.js routes WebSocket on Firebase Hosting to wss://api.saamx.in',
    wsHandlesFirebaseHosts,
    { wsHandlesFirebaseHosts }
  );

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} PASSED (Failed: ${failedTests})`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialVerification().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
