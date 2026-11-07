/**
 * SAAMX Authoritative PostgreSQL Transactional Backend & Database Gateway
 * Target Engine: PostgreSQL 15 / Google Cloud SQL
 * Implements:
 *   - P3.1: Connection Pooling (pg.Pool with max: 30, idleTimeoutMillis: 30000) & Graceful Fallback
 *   - P3.2: Transactional Business Logic with ACID Isolation (withTransaction)
 *   - P3.3: Concurrency & Row Locks (SELECT ... FOR UPDATE)
 *   - P3.4: PostgreSQL Session Store Migration (Primary Key <0.5ms lookup & Administrative Revocation)
 *   - Double-Entry Financial Ledger Invariant Enforcement
 */

import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Connection Pool Configuration
const DEFAULT_POOL_CONFIG = {
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false
};

let activePool = null;
let isExplicitlyClosed = false;

// Auto-load .env if DATABASE_URL is not yet set in process.env
if (process.env.DATABASE_URL === undefined) {
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
        break;
      }
    }
  } catch (_) {}
}

/**
 * Initializes or returns the PostgreSQL Connection Pool.
 * If DATABASE_URL is not set, returns null (graceful fallback).
 */
export function initPool(customConfig = {}) {
  if (activePool && !isExplicitlyClosed) {
    return activePool;
  }

  const rawConnectionString = customConfig.connectionString || process.env.DATABASE_URL;
  if (!rawConnectionString) {
    activePool = null;
    return null;
  }

  const sslRequested = process.env.DATABASE_SSL === 'true' || Boolean(customConfig.ssl) || rawConnectionString.includes('sslmode=');
  const connectionString = sslRequested
    ? rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
    : rawConnectionString;

  try {
    const config = {
      connectionString,
      max: Number(process.env.PG_POOL_MAX || customConfig.max || DEFAULT_POOL_CONFIG.max),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || customConfig.idleTimeoutMillis || DEFAULT_POOL_CONFIG.idleTimeoutMillis),
      connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT || customConfig.connectionTimeoutMillis || DEFAULT_POOL_CONFIG.connectionTimeoutMillis),
      ssl: sslRequested ? { rejectUnauthorized: false } : undefined
    };

    activePool = new Pool(config);

    activePool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error] Unexpected error on idle client:', err.message);
    });

    isExplicitlyClosed = false;
    return activePool;
  } catch (err) {
    console.error('[PostgreSQL Pool Init Failed] Fallback to in-memory state:', err.message);
    activePool = null;
    return null;
  }
}

/**
 * Returns current Pool instance or initializes it if DATABASE_URL is configured.
 */
export function getPool() {
  if (!activePool && !isExplicitlyClosed && process.env.DATABASE_URL) {
    return initPool();
  }
  return activePool;
}

/**
 * Sets an active pool instance (useful for test harnesses or mock pools).
 */
export function setPool(poolInstance) {
  activePool = poolInstance;
  isExplicitlyClosed = false;
}

/**
 * Checks whether PostgreSQL connection URL is configured in the environment.
 */
export function isPgConfigured() {
  return Boolean(process.env.DATABASE_URL || activePool);
}

/**
 * Actively checks connectivity against the PostgreSQL database.
 */
export async function isPgConnected() {
  const pool = getPool();
  if (!pool) return false;
  try {
    const res = await pool.query('SELECT 1 as connected');
    return res.rows?.[0]?.connected === 1;
  } catch (err) {
    return false;
  }
}

/**
 * Gracefully shuts down the PostgreSQL connection pool.
 */
export async function closePool() {
  isExplicitlyClosed = true;
  if (activePool) {
    try {
      await activePool.end();
    } catch (e) {
      // Ignore cleanup error
    } finally {
      activePool = null;
    }
  }
}

// -----------------------------------------------------------------------------
// P3.2: TRANSACTIONAL BUSINESS LOGIC (withTransaction)
// -----------------------------------------------------------------------------

/**
 * In-memory state rollback snapshot utility & Concurrency Mutex for offline/fallback mode.
 */
let fallbackStateRef = null;
export function setFallbackStateReference(stateObj) {
  fallbackStateRef = stateObj;
}

// Global promise-based Mutex queue to serialize in-memory transactions and eliminate race conditions
let fallbackMutex = Promise.resolve();
export async function acquireFallbackLock() {
  let release;
  const nextLock = new Promise(resolve => { release = resolve; });
  const currentLock = fallbackMutex;
  fallbackMutex = currentLock.then(() => nextLock);
  await currentLock;
  return release;
}

let fallbackTxDepth = 0;
let fallbackSnapshot = null;

/**
 * Executes a transactional callback inside an ACID transaction.
 * When PostgreSQL pool is active:
 *   Issues BEGIN -> callback(client) -> COMMIT (or ROLLBACK on error).
 * When PostgreSQL is not configured:
 *   Emulates ACID transaction with snapshot rollback against state and FIFO concurrency serialization.
 */
export async function withTransaction(callback, clientOverride = null) {
  // 1. If an active client is provided (nested transaction / mock client), use it
  if (clientOverride && typeof clientOverride.query === 'function') {
    const isRootClientTransaction = !clientOverride._inTransaction;
    if (isRootClientTransaction) {
      clientOverride._inTransaction = true;
      await clientOverride.query('BEGIN');
    }
    try {
      const result = await callback(clientOverride);
      if (isRootClientTransaction) {
        await clientOverride.query('COMMIT');
        clientOverride._inTransaction = false;
      }
      return result;
    } catch (err) {
      if (isRootClientTransaction) {
        try {
          await clientOverride.query('ROLLBACK');
        } catch (rbErr) {
          console.error('[PostgreSQL withTransaction] Rollback failed:', rbErr.message);
        }
        clientOverride._inTransaction = false;
      }
      throw err;
    }
  }

  // 2. PostgreSQL Connection Pool Branch
  const pool = getPool();
  if (pool) {
    const client = await pool.connect();
    client._inTransaction = true;
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      client._inTransaction = false;
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('[PostgreSQL withTransaction] Pool rollback failed:', rbErr.message);
      }
      client._inTransaction = false;
      throw err;
    } finally {
      client.release();
    }
  }

  // 3. Graceful Fallback: In-Memory ACID Emulation with Mutex Lock and Deep Snapshot Rollback
  const releaseLock = await acquireFallbackLock();
  const isRootFallback = (fallbackTxDepth === 0);
  fallbackTxDepth++;

  if (isRootFallback && fallbackStateRef) {
    try {
      fallbackSnapshot = {
        teams: JSON.stringify(fallbackStateRef.teams || []),
        securities: JSON.stringify(fallbackStateRef.securities || []),
        orders: JSON.stringify(fallbackStateRef.orders || []),
        transactions: JSON.stringify(fallbackStateRef.transactions || []),
        settlements: JSON.stringify(fallbackStateRef.settlements || []),
        fxTransactions: JSON.stringify(fallbackStateRef.fxTransactions || []),
        fxReserves: JSON.stringify(fallbackStateRef.fxReserves || {}),
        fxQueue: JSON.stringify(fallbackStateRef.fxQueue || [])
      };
    } catch (e) {
      fallbackSnapshot = null;
    }
  }

  try {
    const mockClient = {
      isFallback: true,
      query: async (sql, params) => {
        // Fallback dummy query handler for query compatibility
        return { rows: [], rowCount: 0 };
      }
    };
    const result = await callback(mockClient);
    fallbackTxDepth--;
    if (isRootFallback) {
      fallbackSnapshot = null;
    }
    return result;
  } catch (err) {
    fallbackTxDepth--;
    if (isRootFallback && fallbackSnapshot && fallbackStateRef) {
      try {
        // 1. In-place restoration of teams (cashWallets, reservedCash, cashBalance, holdings)
        if (fallbackSnapshot.teams && fallbackStateRef.teams) {
          const savedTeams = JSON.parse(fallbackSnapshot.teams);
          fallbackStateRef.teams.forEach(t => {
            const saved = savedTeams.find(st => st.id === t.id);
            if (saved) {
              Object.assign(t, saved);
              Object.keys(t).forEach(k => {
                if (!(k in saved)) delete t[k];
              });
            }
          });
          fallbackStateRef.teams.length = savedTeams.length;
        }

        // 2. In-place restoration of securities (currentPrice, availableUnits, priceHistory)
        if (fallbackSnapshot.securities && fallbackStateRef.securities) {
          const savedSecurities = JSON.parse(fallbackSnapshot.securities);
          fallbackStateRef.securities.forEach(s => {
            const saved = savedSecurities.find(ss => ss.ticker === s.ticker || ss.id === s.id);
            if (saved) {
              Object.assign(s, saved);
              Object.keys(s).forEach(k => {
                if (!(k in saved)) delete s[k];
              });
            }
          });
          fallbackStateRef.securities.length = savedSecurities.length;
        }

        // 3. In-place restoration of orders
        if (fallbackSnapshot.orders && fallbackStateRef.orders) {
          const savedOrders = JSON.parse(fallbackSnapshot.orders);
          fallbackStateRef.orders.forEach(o => {
            const saved = savedOrders.find(so => so.id === o.id);
            if (saved) {
              Object.assign(o, saved);
              Object.keys(o).forEach(k => {
                if (!(k in saved)) delete o[k];
              });
            }
          });
          fallbackStateRef.orders.length = savedOrders.length;
        }

        // 4. In-place restoration of settlements
        if (fallbackSnapshot.settlements && fallbackStateRef.settlements) {
          const savedSettlements = JSON.parse(fallbackSnapshot.settlements);
          fallbackStateRef.settlements.forEach(st => {
            const saved = savedSettlements.find(s => s.id === st.id);
            if (saved) {
              Object.assign(st, saved);
              Object.keys(st).forEach(k => {
                if (!(k in saved)) delete st[k];
              });
            }
          });
          fallbackStateRef.settlements.length = savedSettlements.length;
        }

        if (fallbackSnapshot.transactions && fallbackStateRef.transactions) {
          fallbackStateRef.transactions.length = JSON.parse(fallbackSnapshot.transactions).length;
        }
        if (fallbackSnapshot.fxTransactions && fallbackStateRef.fxTransactions) {
          fallbackStateRef.fxTransactions.length = JSON.parse(fallbackSnapshot.fxTransactions).length;
        }
        if (fallbackSnapshot.fxQueue && fallbackStateRef.fxQueue) {
          fallbackStateRef.fxQueue = JSON.parse(fallbackSnapshot.fxQueue);
        }
        if (fallbackSnapshot.fxReserves && fallbackStateRef.fxReserves) {
          fallbackStateRef.fxReserves = JSON.parse(fallbackSnapshot.fxReserves);
        }
      } catch (rbErr) {
        console.error('[Fallback withTransaction] Snapshot rollback failed:', rbErr.message);
      } finally {
        fallbackSnapshot = null;
      }
    }
    throw err;
  } finally {
    releaseLock();
  }
}

// -----------------------------------------------------------------------------
// P3.3: CONCURRENCY & ROW LOCKS (SELECT ... FOR UPDATE)
// -----------------------------------------------------------------------------

/**
 * Locks an Order row for update to eliminate race conditions.
 */
export async function lockOrderForUpdate(client, orderId) {
  if (!client || typeof client.query !== 'function') return null;
  const res = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  return res.rows?.[0] || null;
}

/**
 * Locks a Team Cash Wallet for update.
 */
export async function lockWalletForUpdate(client, teamId, currency) {
  if (!client || typeof client.query !== 'function') return null;
  let res = await client.query(
    'SELECT * FROM wallets WHERE team_id = $1 AND currency = $2 FOR UPDATE',
    [teamId, currency]
  );
  if (!res.rows?.[0]) {
    await client.query(
      `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 0, NOW(), NOW())
       ON CONFLICT (team_id, currency) DO NOTHING`,
      [`W_${teamId}_${currency}`, teamId, currency]
    );
    res = await client.query(
      'SELECT * FROM wallets WHERE team_id = $1 AND currency = $2 FOR UPDATE',
      [teamId, currency]
    );
  }
  return res.rows?.[0] || null;
}

/**
 * Locks Team Holdings for a specific instrument for update.
 */
export async function lockHoldingForUpdate(client, teamId, ticker) {
  if (!client || typeof client.query !== 'function') return null;
  const res = await client.query(
    'SELECT * FROM holdings WHERE team_id = $1 AND ticker = $2 FOR UPDATE',
    [teamId, ticker]
  );
  return res.rows?.[0] || null;
}

/**
 * Locks a Security Instrument for update (e.g. price and float updates).
 */
export async function lockSecurityForUpdate(client, identifier, tickerFallback) {
  if (!client || typeof client.query !== 'function') return null;
  if (identifier) {
    const resId = await client.query('SELECT * FROM securities WHERE id = $1 FOR UPDATE', [identifier]);
    if (resId.rows?.[0]) return resId.rows[0];
    const resTicker = await client.query('SELECT * FROM securities WHERE ticker = $1 FOR UPDATE', [identifier]);
    if (resTicker.rows?.[0]) return resTicker.rows[0];
  }
  if (tickerFallback) {
    const res = await client.query('SELECT * FROM securities WHERE ticker = $1 FOR UPDATE', [tickerFallback]);
    return res.rows?.[0] || null;
  }
  return null;
}

/**
 * Locks a Bank Settlement Voucher for update.
 */
export async function lockSettlementVoucherForUpdate(client, voucherKey) {
  if (!client || typeof client.query !== 'function') return null;
  const res = await client.query(
    'SELECT * FROM settlement_vouchers WHERE id = $1 OR voucher_ref = $1 OR order_id = $1 FOR UPDATE',
    [voucherKey]
  );
  return res.rows?.[0] || null;
}

/**
 * Locks an FX Reserve row for update.
 */
export async function lockFxReserveForUpdate(client, currency) {
  if (!client || typeof client.query !== 'function') return null;
  const res = await client.query(
    'SELECT * FROM fx_reserves WHERE currency = $1 FOR UPDATE',
    [currency]
  );
  return res.rows?.[0] || null;
}

/**
 * Runs FX finite reserves migration idempotently on pool connection.
 */
export async function applyFxReservesMigration(poolOrClient) {
  const runner = poolOrClient || getPool();
  if (!runner) return;
  try {
    const migrationPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations', '003_fx_finite_reserves.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await runner.query(sql);
    }
  } catch (err) {
    console.error('[PostgreSQL Migration Error] Failed to apply 003_fx_finite_reserves.sql:', err.message);
  }
}

// -----------------------------------------------------------------------------
// DOUBLE-ENTRY FINANCIAL LEDGER TRANSACTIONAL ENGINE
// -----------------------------------------------------------------------------

/**
 * Records a balanced double-entry Journal Entry with detail lines.
 * Enforces the core invariant: Sum(Debits) === Sum(Credits) for every currency.
 */
export async function recordJournalEntry(client, {
  transactionId = null,
  orderId = null,
  voucherId = null,
  entryType,
  description = '',
  lines = []
}) {
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    throw new Error('Double-entry journal entry requires at least two ledger lines (1 debit, 1 credit).');
  }

  // 1. Invariant Validation: Sum(Debits) === Sum(Credits) per currency
  const currencyTotals = {};
  for (const line of lines) {
    const cur = line.currency || 'INR';
    if (!currencyTotals[cur]) {
      currencyTotals[cur] = { debit: 0, credit: 0 };
    }
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit > 0 && credit > 0) {
      throw new Error(`Invalid line: Cannot have both debit and credit on the same ledger line (Account: ${line.accountId}).`);
    }
    if (debit <= 0 && credit <= 0) {
      throw new Error(`Invalid line: Must have either positive debit or positive credit (Account: ${line.accountId}).`);
    }

    currencyTotals[cur].debit += debit;
    currencyTotals[cur].credit += credit;
  }

  for (const [cur, totals] of Object.entries(currencyTotals)) {
    const diff = Math.abs(totals.debit - totals.credit);
    // Allow up to 0.0001 for floating-point tolerance
    if (diff > 0.0001) {
      throw new Error(
        `Double-entry ledger invariant violation in entry ${entryType} for currency ${cur}: Debits (${totals.debit}) != Credits (${totals.credit}). Diff: ${diff}`
      );
    }
  }

  const journalEntryId = `JE_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // 2. PostgreSQL Execution Branch
  if (client && typeof client.query === 'function' && !client.isFallback) {
    await client.query(
      `INSERT INTO journal_entries (id, transaction_id, order_id, voucher_id, entry_type, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [journalEntryId, transactionId, orderId, voucherId, entryType, description]
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = `LL_${journalEntryId}_${i + 1}`;
      const lineCurrency = line.currency || 'INR';

      // Ensure account exists in accounts table to protect foreign key constraint
      await client.query(
        `INSERT INTO accounts (id, account_number, account_type, name, currency, created_at)
         VALUES ($1, $1, 'ASSET', $1, $2, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [line.accountId, lineCurrency]
      );

      await client.query(
        `INSERT INTO ledger_lines (id, journal_entry_id, account_id, debit, credit, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [lineId, journalEntryId, line.accountId, Number(line.debit || 0), Number(line.credit || 0), lineCurrency]
      );
    }
  }

  // 3. Return canonical representation
  return {
    id: journalEntryId,
    transactionId,
    orderId,
    voucherId,
    entryType,
    description,
    lines: lines.map((l, idx) => ({
      id: `LL_${journalEntryId}_${idx + 1}`,
      journalEntryId,
      accountId: l.accountId,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      currency: l.currency || 'INR'
    })),
    createdAt: new Date().toISOString()
  };
}

// -----------------------------------------------------------------------------
// P3.4: POSTGRESQL SESSION STORE MIGRATION (PostgresSessionStore)
// -----------------------------------------------------------------------------

/**
 * PostgreSQL Authoritative Session Store with L1 High-Speed Cache.
 * Provides <0.5ms primary key lookup and instant administrative revocation.
 */
export class PostgresSessionStore {
  constructor() {
    this.l1Cache = new Map(); // sessionId -> sessionData
  }

  /**
   * Fast primary key lookup (<0.5ms index scan).
   * Checks L1 cache first (<0.05ms); falls back to PostgreSQL if cache miss.
   */
  async getSession(sessionId) {
    if (!sessionId) return null;

    // 1. L1 Memory Cache Check
    const cached = this.l1Cache.get(sessionId);
    if (cached) {
      if (Date.now() > cached.expiresAt || cached.isActive === false) {
        this.l1Cache.delete(sessionId);
        return null;
      }
      return cached;
    }

    // 2. PostgreSQL Primary Key Index Scan
    const pool = getPool();
    if (pool) {
      try {
        const query = `
          SELECT id, user_id, username, role, team_code, ip_address, user_agent, is_active,
                 EXTRACT(EPOCH FROM expires_at) * 1000 AS expires_at_ms,
                 EXTRACT(EPOCH FROM created_at) * 1000 AS created_at_ms
          FROM sessions
          WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()
          LIMIT 1
        `;
        const res = await pool.query(query, [sessionId]);
        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          const session = {
            sessionId: row.id,
            personnelId: row.user_id,
            role: row.role,
            teamCode: row.team_code,
            username: row.username || row.team_code || (row.user_id ? 'staff' : row.role),
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            isActive: Boolean(row.is_active),
            createdAt: Number(row.created_at_ms),
            expiresAt: Number(row.expires_at_ms)
          };
          this.l1Cache.set(sessionId, session);
          return session;
        }
      } catch (err) {
        console.error('[SessionStore] Database lookup failed:', err.message);
      }
    }

    return null;
  }

  /**
   * Synchronous get from L1 cache for sub-millisecond route checks.
   */
  getSessionSync(sessionId) {
    if (!sessionId) return null;
    const cached = this.l1Cache.get(sessionId);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt || cached.isActive === false) {
      this.l1Cache.delete(sessionId);
      return null;
    }
    return cached;
  }

  /**
   * Creates and registers a new session in PostgreSQL and L1 Cache.
   */
  async createSession({ sessionId, userId = null, role, teamCode = null, username = null, ipAddress = null, userAgent = null, expiresAt }) {
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    }
    const createdAt = Date.now();
    const expiry = expiresAt || (createdAt + 12 * 60 * 60 * 1000);

    const sessionData = {
      sessionId,
      personnelId: userId || null,
      role,
      teamCode: teamCode ? String(teamCode).toUpperCase() : null,
      username: username || (teamCode ? String(teamCode).toUpperCase() : role),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      isActive: true,
      createdAt,
      expiresAt: expiry
    };

    // Store in L1 cache immediately
    this.l1Cache.set(sessionId, sessionData);

    // Persist to PostgreSQL sessions table if database is active
    const pool = getPool();
    if (pool) {
      try {
        let validPersonnelId = null;
        if (userId) {
          const checkUser = await pool.query('SELECT id FROM personnel WHERE id = $1 LIMIT 1', [userId]);
          if (checkUser.rows && checkUser.rows.length > 0) {
            validPersonnelId = checkUser.rows[0].id;
          }
        }
        if (!validPersonnelId && (username || sessionData.username)) {
          const uName = username || sessionData.username;
          const checkByUsername = await pool.query('SELECT id FROM personnel WHERE LOWER(username) = LOWER($1) LIMIT 1', [uName]);
          if (checkByUsername.rows && checkByUsername.rows.length > 0) {
            validPersonnelId = checkByUsername.rows[0].id;
          }
        }

        const query = `
          INSERT INTO sessions (
            id, user_id, username, role, team_code, ip_address, user_agent, is_active, expires_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, TRUE, TO_TIMESTAMP($8 / 1000.0), NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            is_active = TRUE,
            username = EXCLUDED.username,
            expires_at = EXCLUDED.expires_at,
            updated_at = NOW()
        `;
        await pool.query(query, [
          sessionId,
          validPersonnelId,
          sessionData.username || null,
          role,
          teamCode ? String(teamCode).toUpperCase() : null,
          ipAddress || null,
          userAgent || null,
          expiry
        ]);
      } catch (err) {
        console.error('[SessionStore] Failed to write session to PostgreSQL:', err.message);
      }
    }

    return sessionData;
  }

  /**
   * Instant Administrative Revocation by Session ID.
   */
  async revokeSession(sessionId) {
    if (!sessionId) return false;
    this.l1Cache.delete(sessionId);

    const pool = getPool();
    if (pool) {
      try {
        await pool.query('UPDATE sessions SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [sessionId]);
        return true;
      } catch (err) {
        console.error('[SessionStore] Revoke session failed in PostgreSQL:', err.message);
      }
    }
    return true;
  }

  /**
   * Instant Administrative Revocation by User / Staff ID or Username.
   */
  async revokeSessionsByUser(userIdOrUsername) {
    if (!userIdOrUsername) return 0;
    const target = String(userIdOrUsername).toLowerCase();
    let count = 0;

    for (const [id, session] of this.l1Cache.entries()) {
      if (
        (session.personnelId && session.personnelId.toLowerCase() === target) ||
        (session.username && session.username.toLowerCase() === target)
      ) {
        this.l1Cache.delete(id);
        count++;
      }
    }

    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `UPDATE sessions 
           SET is_active = FALSE, updated_at = NOW() 
           WHERE user_id = $1 
              OR LOWER(username) = LOWER($1) 
              OR user_id IN (SELECT id FROM personnel WHERE LOWER(username) = LOWER($1))`,
          [target]
        );
        count = Math.max(count, res.rowCount || 0);
      } catch (err) {
        console.error('[SessionStore] Revoke by user failed in PostgreSQL:', err.message);
      }
    }
    return count;
  }

  /**
   * Instant Administrative Revocation by Team Code.
   */
  async revokeSessionsByTeam(teamCode) {
    if (!teamCode) return 0;
    const target = String(teamCode).toUpperCase();
    let count = 0;

    for (const [id, session] of this.l1Cache.entries()) {
      if (session.teamCode && session.teamCode.toUpperCase() === target) {
        this.l1Cache.delete(id);
        count++;
      }
    }

    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          'UPDATE sessions SET is_active = FALSE, updated_at = NOW() WHERE UPPER(team_code) = $1',
          [target]
        );
        count = Math.max(count, res.rowCount || 0);
      } catch (err) {
        console.error('[SessionStore] Revoke by team failed in PostgreSQL:', err.message);
      }
    }
    return count;
  }

  /**
   * Emergency Administrative Revocation of ALL active sessions.
   */
  async revokeAllSessions() {
    const count = this.l1Cache.size;
    this.l1Cache.clear();

    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query('UPDATE sessions SET is_active = FALSE, updated_at = NOW() WHERE is_active = TRUE');
        return Math.max(count, res.rowCount || 0);
      } catch (err) {
        console.error('[SessionStore] Revoke all failed in PostgreSQL:', err.message);
      }
    }
    return count;
  }

  /**
   * Prunes expired sessions from memory and PostgreSQL.
   */
  async pruneExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.l1Cache.entries()) {
      if (now > session.expiresAt || session.isActive === false) {
        this.l1Cache.delete(id);
      }
    }

    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query('DELETE FROM sessions WHERE expires_at <= NOW() OR is_active = FALSE');
        return res.rowCount || 0;
      } catch (err) {
        console.error('[SessionStore] Prune failed in PostgreSQL:', err.message);
      }
    }
    return 0;
  }

  /**
   * Lists all currently active sessions (for admin auditing).
   */
  async listActiveSessions() {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(`
          SELECT id, user_id, username, role, team_code, ip_address, user_agent, is_active,
                 EXTRACT(EPOCH FROM expires_at) * 1000 AS expires_at_ms,
                 EXTRACT(EPOCH FROM created_at) * 1000 AS created_at_ms
          FROM sessions
          WHERE is_active = TRUE AND expires_at > NOW()
          ORDER BY created_at DESC
        `);
        return res.rows.map(r => ({
          sessionId: r.id,
          personnelId: r.user_id,
          role: r.role,
          teamCode: r.team_code,
          username: r.username || r.team_code || (r.user_id ? 'staff' : r.role),
          ipAddress: r.ip_address,
          userAgent: r.user_agent,
          createdAt: Number(r.created_at_ms),
          expiresAt: Number(r.expires_at_ms)
        }));
      } catch (err) {
        console.error('[SessionStore] List sessions failed:', err.message);
      }
    }

    // Fallback to active L1 cache sessions
    const now = Date.now();
    return Array.from(this.l1Cache.values()).filter(s => s.expiresAt > now && s.isActive !== false);
  }
}

// -----------------------------------------------------------------------------
// AUTHORITATIVE ORDER PERSISTENCE & EXECUTION FUNCTIONS
// -----------------------------------------------------------------------------

export function mapDbRowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    idempotencyKey: row.idempotency_key,
    teamCode: row.team_id,
    teamId: row.team_id,
    eventId: row.event_id,
    ticker: row.ticker,
    securityName: row.security_name,
    action: row.action,
    orderType: row.order_type || 'MARKET',
    quantity: Number(row.quantity),
    limitPrice: row.limit_price !== null && row.limit_price !== undefined ? Number(row.limit_price) : null,
    requestedValue: row.requested_value !== null && row.requested_value !== undefined ? Number(row.requested_value) : null,
    estimatedCost: row.requested_value !== null && row.requested_value !== undefined ? Number(row.requested_value) : null,
    reservedCashAmount: row.action === 'BUY' && row.requested_value ? Number((Number(row.requested_value) * 1.05).toFixed(2)) : 0,
    executionBuffer: row.action === 'BUY' && row.requested_value ? Number((Number(row.requested_value) * 0.05).toFixed(2)) : 0,
    lockedUnits: row.action === 'SELL' ? Number(row.quantity) : 0,
    brokerId: row.broker_id,
    status: row.status,
    workflowStage: row.workflow_stage,
    verificationStatus: row.verification_status,
    exchangeStatus: row.exchange_status,
    finalStatus: row.final_status,
    physicalSlipChecked: Boolean(row.physical_slip_checked),
    deskId: row.desk_id,
    operator: row.operator,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at ? new Date(row.verified_at).getTime() : null,
    returnedAt: row.returned_at ? new Date(row.returned_at).getTime() : null,
    returnReason: row.return_reason,
    rejectionReason: row.rejection_reason,
    executionQuantity: row.execution_quantity !== null && row.execution_quantity !== undefined ? Number(row.execution_quantity) : null,
    executionPrice: row.execution_price !== null && row.execution_price !== undefined ? Number(row.execution_price) : null,
    executionValue: row.execution_value !== null && row.execution_value !== undefined ? Number(row.execution_value) : null,
    executedAt: row.executed_at ? new Date(row.executed_at).getTime() : null,
    notes: row.notes,
    statusHistory: typeof row.status_history === 'string' ? JSON.parse(row.status_history) : (row.status_history || []),
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : Date.now(),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

/**
 * Creates and stores an order in PostgreSQL with strict idempotency protection.
 */
export async function createOrderInDb(client, orderData) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false, isDuplicate: false, order: orderData };
  }

  // 1. Idempotency Check: if idempotency_key or ticket_number already exists, return existing order
  if (orderData.idempotencyKey || orderData.ticketNumber) {
    const existing = await client.query(
      `SELECT * FROM orders 
       WHERE (idempotency_key = $1 AND $1 IS NOT NULL) 
          OR (ticket_number = $2 AND $2 IS NOT NULL) 
       LIMIT 1`,
      [orderData.idempotencyKey || null, orderData.ticketNumber || null]
    );
    if (existing.rows && existing.rows.length > 0) {
      return {
        persistedInDb: true,
        isDuplicate: true,
        order: mapDbRowToOrder(existing.rows[0])
      };
    }
  }

  const query = `
    INSERT INTO orders (
      id, ticket_number, idempotency_key, team_id, event_id, ticker, security_name,
      action, order_type, quantity, limit_price, requested_value, broker_id,
      status, workflow_stage, verification_status, exchange_status, final_status,
      physical_slip_checked, desk_id, operator, notes, status_history, submitted_at,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, TO_TIMESTAMP($24 / 1000.0),
      NOW(), NOW()
    )
    RETURNING *;
  `;

  const values = [
    orderData.id,
    orderData.ticketNumber,
    orderData.idempotencyKey || null,
    orderData.teamCode || orderData.teamId,
    orderData.eventId || 'EVT_LIVE_MAIN',
    orderData.ticker,
    orderData.securityName || orderData.ticker,
    orderData.action,
    orderData.orderType || 'MARKET',
    orderData.quantity,
    orderData.limitPrice || null,
    orderData.requestedValue || 0,
    orderData.brokerId || 'B01',
    orderData.status || 'AWAITING_PHYSICAL_SLIP',
    orderData.workflowStage || 'AWAITING_PHYSICAL_SLIP',
    orderData.verificationStatus || 'PENDING',
    orderData.exchangeStatus || 'PENDING',
    orderData.finalStatus || 'PENDING',
    Boolean(orderData.physicalSlipChecked),
    orderData.deskId || null,
    orderData.operator || orderData.enteredBy || null,
    orderData.notes || '',
    JSON.stringify(orderData.statusHistory || []),
    orderData.submittedAt || Date.now()
  ];

  const res = await client.query(query, values);

  const teamId = orderData.teamCode || orderData.teamId;
  const secCurrency = orderData.currency || 'INR';

  // Pre-exchange reservation in PostgreSQL
  if (orderData.action === 'BUY' && orderData.reservedCashAmount && orderData.reservedCashAmount > 0) {
    const wallet = await lockWalletForUpdate(client, teamId, secCurrency);
    if (!wallet) {
      await client.query(
        `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
         ON CONFLICT (team_id, currency) DO UPDATE SET
           reserved = wallets.reserved + $4,
           updated_at = NOW()`,
        [`WLT_${teamId}_${secCurrency}`, teamId, secCurrency, orderData.reservedCashAmount]
      );
    } else {
      await client.query(
        `UPDATE wallets
         SET reserved = reserved + $1,
             updated_at = NOW()
         WHERE team_id = $2 AND currency = $3`,
        [orderData.reservedCashAmount, teamId, secCurrency]
      );
    }
  } else if (orderData.action === 'SELL' && orderData.lockedUnits && orderData.lockedUnits > 0) {
    const holding = await lockHoldingForUpdate(client, teamId, orderData.ticker);
    if (!holding) {
      await client.query(
        `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4, 0, 0, NOW(), NOW())
         ON CONFLICT (team_id, ticker) DO UPDATE SET
           locked_units = holdings.locked_units + $4,
           updated_at = NOW()`,
        [`HLD_${teamId}_${orderData.ticker}`, teamId, orderData.ticker, orderData.lockedUnits]
      );
    } else {
      await client.query(
        `UPDATE holdings
         SET locked_units = locked_units + $1,
             updated_at = NOW()
         WHERE team_id = $2 AND ticker = $3`,
        [orderData.lockedUnits, teamId, orderData.ticker]
      );
    }
  }

  return {
    persistedInDb: true,
    isDuplicate: false,
    order: mapDbRowToOrder(res.rows[0])
  };
}

/**
 * Atomically executes a market order against PostgreSQL tables:
 * locks rows, validates funds/holdings, updates securities/wallets/holdings,
 * records double-entry ledger lines, and records executions.
 */
export async function executeMarketOrderInDb(client, {
  orderId,
  securityId = null,
  deskId = 'DESK_1',
  bankDeskId = 'BANK_1',
  settlementId = null,
  voucherReference = null,
  direction = null,
  classification = null,
  operator = 'Desk Operator',
  executionPrice,
  priceChangePercent,
  isTwoPhaseBank = false,
  fxRateAtExecution = 1.0,
  eventId = 'EVT_LIVE_MAIN'
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  // 1. Row Lock on Order
  const orderRow = await lockOrderForUpdate(client, orderId);
  if (!orderRow) {
    throw new Error(`Order ${orderId} not found in authoritative database.`);
  }

  if (orderRow.status === 'EXECUTED' || orderRow.status === 'EXECUTED_PENDING_SETTLEMENT' || orderRow.status === 'SETTLED') {
    const existingVoucherRes = await client.query('SELECT * FROM settlement_vouchers WHERE order_id = $1', [orderId]);
    const vRow = existingVoucherRes.rows[0];
    return {
      persistedInDb: true,
      isDuplicate: true,
      orderStatus: orderRow.status,
      settlementVoucher: vRow ? {
        id: vRow.id,
        voucherReference: vRow.voucher_ref,
        orderId: vRow.order_id,
        teamId: vRow.team_id,
        teamCode: vRow.team_id,
        ticker: vRow.ticker,
        action: vRow.action,
        direction: vRow.direction || (vRow.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT'),
        classification: vRow.classification || (vRow.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT'),
        bankDeskId: vRow.bank_desk_id || 'BANK_1',
        totalAmount: Number(vRow.amount),
        currency: vRow.currency,
        status: vRow.status
      } : null
    };
  }

  const teamId = orderRow.team_id;
  const ticker = orderRow.ticker;
  const quantity = Number(orderRow.quantity);
  const action = orderRow.action;

  // 2. Row Lock on Security
  const secRow = await lockSecurityForUpdate(client, securityId || orderRow.security_id || ticker, ticker);
  if (!secRow) {
    throw new Error(`Security ${ticker} not found in database.`);
  }
  if (secRow.status !== 'Active') {
    throw new Error(`Security ${ticker} is ${secRow.status} — trading halted.`);
  }

  const secCurrency = secRow.currency || 'INR';
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const price = executionPrice || Number(secRow.current_price);
  const totalValue = isZeroDec ? Math.round(quantity * price) : parseFloat((quantity * price).toFixed(2));

  // 3. Row Lock on Wallet
  let walletRow = await lockWalletForUpdate(client, teamId, secCurrency);
  if (!walletRow) {
    await client.query(
      `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 0, NOW(), NOW())
       ON CONFLICT (team_id, currency) DO NOTHING`,
      [`W_${teamId}_${secCurrency}`, teamId, secCurrency]
    );
    walletRow = await lockWalletForUpdate(client, teamId, secCurrency);
  }

  const balance = Number(walletRow?.balance || 0);
  const reserved = Number(walletRow?.reserved || 0);
  const availableCash = balance - reserved;

  // 4. Row Lock on Holdings
  let holdingRow = await lockHoldingForUpdate(client, teamId, ticker);
  const unitsHeld = Number(holdingRow?.units || 0);

  // Validate limits under row lock
  if (action === 'BUY') {
    const availUnits = Number(secRow.available_units || 0);
    if (quantity > availUnits) {
      throw new Error(`Float exhausted: Only ${availUnits} units available.`);
    }
    if (availableCash < totalValue) {
      throw new Error(`Insufficient unreserved ${secCurrency} balance. Required: ${totalValue}, Available: ${availableCash}`);
    }
  } else {
    // SELL
    if (unitsHeld < quantity) {
      throw new Error(`Insufficient holdings. Team holds ${unitsHeld} units of ${ticker}.`);
    }
  }

  // Calculate new security price
  const totalUnits = Number(secRow.total_units || 100000);
  const volatility = Number(secRow.volatility || 0.5);
  const pct = priceChangePercent !== undefined
    ? priceChangePercent
    : (quantity / totalUnits) * volatility * 100;

  const newSecPrice = action === 'BUY'
    ? parseFloat((price * (1 + pct / 100)).toFixed(2))
    : Math.max(1, parseFloat((price * (1 - pct / 100)).toFixed(2)));

  // Update Securities float and price
  const newAvailUnits = action === 'BUY'
    ? Number(secRow.available_units) - quantity
    : (isTwoPhaseBank ? Number(secRow.available_units) : Number(secRow.available_units) + quantity);

  await client.query(
    `UPDATE securities
     SET current_price = $1, available_units = $2, trading_volume = trading_volume + $3, updated_at = NOW()
     WHERE ticker = $4`,
    [newSecPrice, newAvailUnits, quantity, ticker]
  );

  let createdVoucher = null;

  // Update Wallets and Holdings
  if (action === 'BUY') {
    if (isTwoPhaseBank) {
      // Funds were already reserved at order creation with 5% buffer.
      // Adjust reservation if totalValue exceeds current reservation.
      const currentReserved = Number(walletRow?.reserved || 0);
      if (totalValue > currentReserved) {
        await client.query(
          `UPDATE wallets
           SET reserved = $1, updated_at = NOW()
           WHERE team_id = $2 AND currency = $3`,
          [totalValue, teamId, secCurrency]
        );
      }
    } else {
      // Instant settlement: deduct balance, increase holdings
      await client.query(
        `UPDATE wallets
         SET balance = balance - $1, updated_at = NOW()
         WHERE team_id = $2 AND currency = $3`,
        [totalValue, teamId, secCurrency]
      );

      await client.query(
        `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, $5, $6, NOW(), NOW())
         ON CONFLICT (team_id, ticker) DO UPDATE SET
           units = holdings.units + $4,
           total_invested = holdings.total_invested + $6,
           average_buy_price = CASE WHEN (holdings.units + $4) > 0 THEN (holdings.total_invested + $6) / (holdings.units + $4) ELSE holdings.average_buy_price END,
           updated_at = NOW()`,
        [`H_${teamId}_${ticker}`, teamId, ticker, quantity, price, totalValue]
      );
    }
  } else {
    // SELL
    if (isTwoPhaseBank) {
      // Fix asymmetric SELL execution: do NOT decrement holdings or increment market float at exchange approval!
      // Shares remain deliverable-locked in locked_units until Bank settlement confirms payment.
    } else {
      // Instant settlement: deduct holdings, increase cash wallet
      await client.query(
        `UPDATE holdings
         SET units = units - $1, updated_at = NOW()
         WHERE team_id = $2 AND ticker = $3`,
        [quantity, teamId, ticker]
      );

      await client.query(
        `UPDATE wallets
         SET balance = balance + $1, updated_at = NOW()
         WHERE team_id = $2 AND currency = $3`,
        [totalValue, teamId, secCurrency]
      );
    }
  }

  // Insert execution
  const executionId = `EXEC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  await client.query(
    `INSERT INTO executions (
      id, order_id, price, quantity, execution_value, executed_by_desk, executed_by_operator, executed_at, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    )`,
    [executionId, orderId, price, quantity, totalValue, deskId, operator]
  );

  // If two-phase, create settlement voucher
  if (isTwoPhaseBank) {
    const voucherId = settlementId || `SETTLE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const voucherRef = voucherReference || `BNK-${action === 'BUY' ? 'PAY' : 'REC'}-${orderRow.ticket_number || orderId.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
    const dir = direction || (action === 'BUY' ? 'PAY_IN' : 'PAY_OUT');
    const cls = classification || (action === 'BUY' ? 'PAY_IN' : 'PAY_OUT');
    const assignedBankDesk = bankDeskId || 'BANK_1';

    await client.query(
      `INSERT INTO settlement_vouchers (
        id, voucher_ref, order_id, team_id, ticker, action, direction, classification, bank_desk_id, amount, currency, status, teller_operator, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, NOW(), NOW()
      )`,
      [voucherId, voucherRef, orderId, teamId, ticker, action, dir, cls, assignedBankDesk, totalValue, secCurrency, operator]
    );

    createdVoucher = {
      id: voucherId,
      voucherReference: voucherRef,
      orderId,
      teamId,
      teamCode: teamId,
      ticker,
      action,
      direction: dir,
      classification: cls,
      bankDeskId: assignedBankDesk,
      totalAmount: totalValue,
      currency: secCurrency,
      status: 'PENDING'
    };
  } else {
    // Record balanced double-entry journal entry for instant execution
    const teamAccount = `ACC_TEAM_${teamId}_${secCurrency}`;
    const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
    const lines = action === 'BUY'
      ? [
          { accountId: clearingAccount, debit: totalValue, credit: 0, currency: secCurrency },
          { accountId: teamAccount, debit: 0, credit: totalValue, currency: secCurrency }
        ]
      : [
          { accountId: teamAccount, debit: totalValue, credit: 0, currency: secCurrency },
          { accountId: clearingAccount, debit: 0, credit: totalValue, currency: secCurrency }
        ];

    await recordJournalEntry(client, {
      transactionId: executionId,
      orderId,
      entryType: 'TRADE_EXECUTION_INSTANT',
      description: `Instant Trade Execution ${action} ${quantity} ${ticker} @ ${price} ${secCurrency}`,
      lines
    });
  }

  // Update order status in orders table
  const newStatus = isTwoPhaseBank ? 'EXCHANGE_APPROVED' : 'EXECUTED';
  const stage = isTwoPhaseBank ? 'AWAITING_BANK_SETTLEMENT' : 'EXECUTED';

  await client.query(
    `UPDATE orders
     SET status = $1, workflow_stage = $2, verification_status = 'VERIFIED', exchange_status = 'APPROVED',
         final_status = $3, execution_quantity = $4, execution_price = $5, execution_value = $6,
         bank_desk_id = $7, executed_at = NOW(), updated_at = NOW()
     WHERE id = $8`,
    [newStatus, stage, isTwoPhaseBank ? 'PENDING_SETTLEMENT' : 'EXECUTED', quantity, price, totalValue, isTwoPhaseBank ? (bankDeskId || 'BANK_1') : null, orderId]
  );

  return {
    persistedInDb: true,
    executionId,
    executionPrice: price,
    executionQuantity: quantity,
    executionValue: totalValue,
    newSecurityPrice: newSecPrice,
    orderStatus: newStatus,
    settlementVoucher: createdVoucher
  };
}

/**
 * Atomically settles a bank voucher in PostgreSQL.
 */
export async function settleBankVoucherInDb(client, {
  settlementId,
  effectiveActor = 'Bank Teller',
  notes = '',
  voucherReference = null
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  // 1. Lock voucher
  const vRes = await client.query(
    `SELECT * FROM settlement_vouchers WHERE id = $1 OR voucher_ref = $1 OR order_id = $1 FOR UPDATE`,
    [settlementId]
  );
  if (!vRes.rows || vRes.rows.length === 0) {
    throw new Error('Settlement voucher not found in database.');
  }
  const v = vRes.rows[0];
  if (v.status === 'SETTLED') {
    throw new Error('Duplicate settlement prevented: This voucher has already been settled.');
  }
  if (v.status !== 'PENDING' && v.status !== 'AWAITING_BANK_SETTLEMENT' && v.status !== 'VERIFYING_AT_BANK' && v.status !== 'HELD_FOR_REVIEW') {
    throw new Error(`Cannot settle record in status ${v.status}.`);
  }

  const teamId = v.team_id;
  const secCurrency = v.currency || 'INR';
  const amount = Number(v.amount);
  const action = v.action;
  const orderId = v.order_id;

  // 2. Lock and update wallet and holdings
  const walletRow = await lockWalletForUpdate(client, teamId, secCurrency);
  const ordRow = orderId ? await lockOrderForUpdate(client, orderId) : null;
  const qty = Number(ordRow?.quantity || 0);

  if (action === 'BUY') {
    const curBalance = Number(walletRow?.balance || 0);
    if (curBalance < amount) {
      throw new Error(`Insufficient ${secCurrency} balance for settlement. Available: ${curBalance}, Required: ${amount}`);
    }
    // Debit actual cost from balance and release the full reserved amount (including execution buffer)
    const reservedToRelease = Number(ordRow?.requested_value ? ordRow.requested_value * 1.05 : amount * 1.05);
    await client.query(
      `UPDATE wallets
       SET balance = balance - $1, reserved = GREATEST(0, reserved - $2), updated_at = NOW()
       WHERE team_id = $3 AND currency = $4`,
      [amount, reservedToRelease, teamId, secCurrency]
    );

    // Credit holdings
    await client.query(
      `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, $5, $6, NOW(), NOW())
       ON CONFLICT (team_id, ticker) DO UPDATE SET
         units = holdings.units + $4,
         total_invested = holdings.total_invested + $6,
         updated_at = NOW()`,
      [`H_${teamId}_${v.ticker}`, teamId, v.ticker, qty, (amount / qty) || 0, amount]
    );
  } else {
    // SELL: credit cash proceeds to wallet
    await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE team_id = $2 AND currency = $3`,
      [amount, teamId, secCurrency]
    );

    // Transfer shares out: deduct units and release locked units
    await client.query(
      `UPDATE holdings
       SET units = GREATEST(0, units - $1), locked_units = GREATEST(0, locked_units - $1), updated_at = NOW()
       WHERE team_id = $2 AND ticker = $3`,
      [qty, teamId, v.ticker]
    );

    // Increment market float on security upon final settlement
    await client.query(
      `UPDATE securities
       SET available_units = available_units + $1, updated_at = NOW()
       WHERE ticker = $2`,
      [qty, v.ticker]
    );
  }

  // 3. Record balanced double-entry ledger entry
  const teamAccount = `ACC_TEAM_${teamId}_${secCurrency}`;
  const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
  const lines = action === 'BUY'
    ? [
        { accountId: clearingAccount, debit: amount, credit: 0, currency: secCurrency },
        { accountId: teamAccount, debit: 0, credit: amount, currency: secCurrency }
      ]
    : [
        { accountId: teamAccount, debit: amount, credit: 0, currency: secCurrency },
        { accountId: clearingAccount, debit: 0, credit: amount, currency: secCurrency }
      ];

  await recordJournalEntry(client, {
    transactionId: v.id,
    orderId,
    voucherId: v.id,
    entryType: 'BANK_SETTLEMENT_CONFIRMED',
    description: `Physical Bank Settlement ${action} for Team ${teamId} (${secCurrency} ${amount})`,
    lines
  });

  // 4. Update settlement voucher and order status
  await client.query(
    `UPDATE settlement_vouchers
     SET status = 'SETTLED', settled_at = NOW(), teller_operator = $1, updated_at = NOW()
     WHERE id = $2`,
    [effectiveActor, v.id]
  );

  if (orderId) {
    await client.query(
      `UPDATE orders
       SET status = 'SETTLED', workflow_stage = 'SETTLED', final_status = 'SETTLED', updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );
  }

  return { persistedInDb: true, settlementId: v.id, status: 'SETTLED' };
}

/**
 * Atomically rejects a bank voucher in PostgreSQL, releasing cash reservations or unlocking holdings,
 * reversing trading volume, and recording compensating journal entries.
 */
export async function rejectBankVoucherInDb(client, {
  settlementId,
  effectiveActor = 'Bank Teller',
  rejectionReason = 'Settlement rejected by teller'
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  const vRes = await client.query(
    `SELECT * FROM settlement_vouchers WHERE id = $1 OR voucher_ref = $1 OR order_id = $1 FOR UPDATE`,
    [settlementId]
  );
  if (!vRes.rows || vRes.rows.length === 0) {
    throw new Error('Settlement voucher not found in database.');
  }
  const v = vRes.rows[0];
  if (v.status !== 'PENDING' && v.status !== 'HELD_FOR_REVIEW' && v.status !== 'AWAITING_BANK_SETTLEMENT' && v.status !== 'VERIFYING_AT_BANK') {
    throw new Error(`Cannot reject voucher in status ${v.status}.`);
  }

  const teamId = v.team_id;
  const secCurrency = v.currency || 'INR';
  const amount = Number(v.amount);
  const action = v.action;
  const orderId = v.order_id;
  const ticker = v.ticker;

  const ordRow = orderId ? await lockOrderForUpdate(client, orderId) : null;
  const qty = Number(ordRow?.quantity || 0);

  if (action === 'BUY') {
    // Release cash reservation (including buffer)
    const reservedToRelease = Number(ordRow?.requested_value ? ordRow.requested_value * 1.05 : amount * 1.05);
    await client.query(
      `UPDATE wallets
       SET reserved = GREATEST(0, reserved - $1), updated_at = NOW()
       WHERE team_id = $2 AND currency = $3`,
      [reservedToRelease, teamId, secCurrency]
    );

    // Restore available float on security and decrement trading volume
    await client.query(
      `UPDATE securities
       SET available_units = available_units + $1, trading_volume = GREATEST(0, trading_volume - $2), updated_at = NOW()
       WHERE ticker = $3`,
      [qty, qty, ticker]
    );
  } else {
    // Unlock shares (shares were never prematurely deducted from units)
    await client.query(
      `UPDATE holdings
       SET locked_units = GREATEST(0, locked_units - $1), updated_at = NOW()
       WHERE team_id = $2 AND ticker = $3`,
      [qty, teamId, ticker]
    );

    // Decrement trading volume (market float was never prematurely incremented)
    await client.query(
      `UPDATE securities
       SET trading_volume = GREATEST(0, trading_volume - $1), updated_at = NOW()
       WHERE ticker = $2`,
      [qty, ticker]
    );
  }

  // Record audited reversal journal entries in PostgreSQL
  const teamAccount = `ACC_TEAM_${teamId}_${secCurrency}`;
  const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
  const lines = action === 'BUY'
    ? [
        { accountId: teamAccount, debit: amount, credit: 0, currency: secCurrency },
        { accountId: clearingAccount, debit: 0, credit: amount, currency: secCurrency }
      ]
    : [
        { accountId: clearingAccount, debit: amount, credit: 0, currency: secCurrency },
        { accountId: teamAccount, debit: 0, credit: amount, currency: secCurrency }
      ];

  await recordJournalEntry(client, {
    transactionId: v.id,
    orderId,
    voucherId: v.id,
    entryType: 'BANK_SETTLEMENT_REVERSAL',
    description: `Reversal of bank settlement rejection for voucher ${v.voucher_ref || v.id}: ${rejectionReason}`,
    lines
  });

  await client.query(
    `UPDATE settlement_vouchers
     SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [rejectionReason, v.id]
  );

  if (orderId) {
    await client.query(
      `UPDATE orders
       SET status = 'REJECTED_BY_BANK', workflow_stage = 'REJECTED_BY_BANK', final_status = 'REJECTED_BY_BANK', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [rejectionReason, orderId]
    );
  }

  return { persistedInDb: true, settlementId: v.id, status: 'REJECTED' };
}

/**
 * Atomically places a bank settlement voucher on hold with documented notes.
 */
export async function holdBankVoucherInDb(client, {
  settlementId,
  effectiveActor = 'Bank Teller',
  notes = 'Voucher held for review'
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  const vRes = await client.query(
    `SELECT * FROM settlement_vouchers WHERE id = $1 OR voucher_ref = $1 OR order_id = $1 FOR UPDATE`,
    [settlementId]
  );
  if (!vRes.rows || vRes.rows.length === 0) {
    throw new Error('Settlement voucher not found in database.');
  }
  const v = vRes.rows[0];
  if (v.status !== 'PENDING' && v.status !== 'AWAITING_BANK_SETTLEMENT' && v.status !== 'VERIFYING_AT_BANK') {
    throw new Error(`Cannot place voucher in status ${v.status} on hold.`);
  }

  await client.query(
    `UPDATE settlement_vouchers
     SET status = 'HELD_FOR_REVIEW', notes = $1, teller_operator = $2, updated_at = NOW()
     WHERE id = $3`,
    [notes, effectiveActor, v.id]
  );

  if (v.order_id) {
    await client.query(
      `UPDATE orders
       SET status = 'HELD_FOR_REVIEW', workflow_stage = 'HELD_FOR_REVIEW', notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [notes, v.order_id]
    );
  }

  return { persistedInDb: true, settlementId: v.id, status: 'HELD_FOR_REVIEW' };
}

/**
 * Updates an existing order's workflow stage, status, verification, or rejection in PostgreSQL.
 */
export async function updateOrderStatusInDb(client, {
  orderId,
  status,
  workflowStage,
  verificationStatus,
  exchangeStatus,
  finalStatus,
  rejectionReason,
  returnReason,
  operator,
  deskId,
  notes,
  statusHistory,
  quantity,
  executionPrice,
  executionQuantity,
  executionValue,
  executedAt
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  const query = `
    UPDATE orders
    SET status = COALESCE($2, status),
        workflow_stage = COALESCE($3, workflow_stage),
        verification_status = COALESCE($4, verification_status),
        exchange_status = COALESCE($5, exchange_status),
        final_status = COALESCE($6, final_status),
        rejection_reason = CASE WHEN $7::text IS NOT NULL THEN $7::text ELSE rejection_reason END,
        return_reason = CASE WHEN $8::text IS NOT NULL THEN $8::text ELSE return_reason END,
        operator = COALESCE($9, operator),
        desk_id = COALESCE($10, desk_id),
        notes = CASE WHEN $11::text IS NOT NULL THEN $11::text ELSE notes END,
        status_history = CASE WHEN $12::text IS NOT NULL THEN $12::jsonb ELSE status_history END,
        quantity = COALESCE($13, quantity),
        execution_price = COALESCE($14, execution_price),
        execution_quantity = COALESCE($15, execution_quantity),
        execution_value = COALESCE($16, execution_value),
        executed_at = CASE WHEN $17::numeric IS NOT NULL THEN TO_TIMESTAMP($17::numeric / 1000.0) ELSE executed_at END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const values = [
    orderId,
    status || null,
    workflowStage || null,
    verificationStatus || null,
    exchangeStatus || null,
    finalStatus || null,
    rejectionReason !== undefined ? rejectionReason : null,
    returnReason !== undefined ? returnReason : null,
    operator || null,
    deskId || null,
    notes !== undefined ? notes : null,
    statusHistory ? JSON.stringify(statusHistory) : null,
    quantity ? Number(quantity) : null,
    executionPrice ? Number(executionPrice) : null,
    executionQuantity ? Number(executionQuantity) : null,
    executionValue ? Number(executionValue) : null,
    executedAt ? Number(executedAt) : null
  ];

  const res = await client.query(query, values);
  return {
    persistedInDb: true,
    order: res.rows?.[0] ? mapDbRowToOrder(res.rows[0]) : null
  };
}

/**
 * Atomically executes a direct trade (from /api/trade) against PostgreSQL tables:
 * locks security, wallet, holdings; updates price, float, wallet balance, and holdings;
 * records double-entry journal entry and execution.
 */
export async function executeDirectTradeInDb(client, {
  tradeId,
  teamId,
  ticker,
  action,
  quantity,
  executionPrice,
  priceChangePercent,
  deskId = 'Staff Desk',
  operator = 'Staff Desk',
  eventId = 'EVT_LIVE_MAIN'
}) {
  if (!client || typeof client.query !== 'function' || client.isFallback) {
    return { persistedInDb: false };
  }

  // 1. Lock Security
  const secRow = await lockSecurityForUpdate(client, ticker);
  if (!secRow) {
    throw new Error(`Security ${ticker} not found in database.`);
  }
  if (secRow.status !== 'Active') {
    throw new Error(`Security ${ticker} is ${secRow.status} — trading not permitted.`);
  }

  const secCurrency = secRow.currency || 'INR';
  const isZeroDec = (secCurrency === 'JPY' || secCurrency === 'KRW');
  const price = executionPrice || Number(secRow.current_price);
  const totalValue = isZeroDec ? Math.round(quantity * price) : parseFloat((quantity * price).toFixed(2));

  // 2. Lock Wallet
  let walletRow = await lockWalletForUpdate(client, teamId, secCurrency);
  if (!walletRow) {
    await client.query(
      `INSERT INTO wallets (id, team_id, currency, balance, reserved, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 0, NOW(), NOW())
       ON CONFLICT (team_id, currency) DO NOTHING`,
      [`W_${teamId}_${secCurrency}`, teamId, secCurrency]
    );
    walletRow = await lockWalletForUpdate(client, teamId, secCurrency);
  }

  const balance = Number(walletRow?.balance || 0);
  const reserved = Number(walletRow?.reserved || 0);
  const availableCash = balance - reserved;

  // 3. Lock Holdings
  let holdingRow = await lockHoldingForUpdate(client, teamId, ticker);
  const unitsHeld = Number(holdingRow?.units || 0);

  // Validate limits
  if (action === 'BUY') {
    const availUnits = Number(secRow.available_units || 0);
    if (quantity > availUnits) {
      throw new Error(`Only ${availUnits} units available.`);
    }
    if (availableCash < totalValue) {
      throw new Error(`Insufficient ${secCurrency} balance. Team has ${availableCash}, order requires ${totalValue}.`);
    }
  } else {
    if (unitsHeld < quantity) {
      throw new Error(`Insufficient holdings. Team holds ${unitsHeld} units of ${ticker}.`);
    }
  }

  // Calculate new price & float
  const totalUnits = Number(secRow.total_units || 100000);
  const volatility = Number(secRow.volatility || 0.5);
  const pct = priceChangePercent !== undefined
    ? priceChangePercent
    : (quantity / totalUnits) * volatility * 100;

  const newSecPrice = action === 'BUY'
    ? parseFloat((price * (1 + pct / 100)).toFixed(2))
    : Math.max(1, parseFloat((price * (1 - pct / 100)).toFixed(2)));

  const newAvailUnits = action === 'BUY'
    ? Number(secRow.available_units) - quantity
    : Number(secRow.available_units) + quantity;

  await client.query(
    `UPDATE securities
     SET current_price = $1, available_units = $2, trading_volume = trading_volume + $3, updated_at = NOW()
     WHERE ticker = $4`,
    [newSecPrice, newAvailUnits, quantity, ticker]
  );

  // Update Wallets and Holdings
  if (action === 'BUY') {
    await client.query(
      `UPDATE wallets
       SET balance = balance - $1, updated_at = NOW()
       WHERE team_id = $2 AND currency = $3`,
      [totalValue, teamId, secCurrency]
    );

    await client.query(
      `INSERT INTO holdings (id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, $5, $6, NOW(), NOW())
       ON CONFLICT (team_id, ticker) DO UPDATE SET
         units = holdings.units + $4,
         total_invested = holdings.total_invested + $6,
         average_buy_price = CASE WHEN (holdings.units + $4) > 0 THEN (holdings.total_invested + $6) / (holdings.units + $4) ELSE holdings.average_buy_price END,
         updated_at = NOW()`,
      [`H_${teamId}_${ticker}`, teamId, ticker, quantity, price, totalValue]
    );
  } else {
    await client.query(
      `UPDATE holdings
       SET units = units - $1, updated_at = NOW()
       WHERE team_id = $2 AND ticker = $3`,
      [quantity, teamId, ticker]
    );

    await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE team_id = $2 AND currency = $3`,
      [totalValue, teamId, secCurrency]
    );
  }

  // Insert execution audit record
  const executionId = `EXEC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  await client.query(
    `INSERT INTO executions (
      id, order_id, price, quantity, execution_value, executed_by_desk, executed_by_operator, executed_at, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    )`,
    [executionId, tradeId || `TRD_${Date.now()}`, price, quantity, totalValue, deskId, operator]
  );

  // Record double-entry ledger lines
  const teamAccount = `ACC_TEAM_${teamId}_${secCurrency}`;
  const clearingAccount = `ACC_SYS_CLEARING_EXCHANGE_${secCurrency}`;
  const lines = action === 'BUY'
    ? [
        { accountId: clearingAccount, debit: totalValue, credit: 0, currency: secCurrency },
        { accountId: teamAccount, debit: 0, credit: totalValue, currency: secCurrency }
      ]
    : [
        { accountId: teamAccount, debit: totalValue, credit: 0, currency: secCurrency },
        { accountId: clearingAccount, debit: 0, credit: totalValue, currency: secCurrency }
      ];

  await recordJournalEntry(client, {
    transactionId: tradeId,
    entryType: 'TRADE_EXECUTION_INSTANT',
    description: `Direct Trade Execution ${action} ${quantity} ${ticker} @ ${price} ${secCurrency}`,
    lines
  });

  return {
    persistedInDb: true,
    executionPrice: price,
    executionQuantity: quantity,
    executionValue: totalValue,
    newSecurityPrice: newSecPrice,
    newAvailableUnits: newAvailUnits
  };
}

/**
 * Runs versioned SQL migrations automatically.
 */
export async function runMigrations(poolInstance) {
  const p = poolInstance || getPool();
  if (!p) return;

  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(128) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationsDir = path.join(currentFileDir, 'migrations');

    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const check = await p.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
        if (check.rows.length === 0) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await p.query(sql);
          await p.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())', [file]);
          console.log(`[Database Migration] Applied migration: ${file}`);
        }
      }
    }
    // Ensure orders and settlement_vouchers check constraints allow all distinct M1 states
    try {
      await p.query(`
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
          status IN (
            'AWAITING_PHYSICAL_SLIP',
            'VERIFYING_AT_EXCHANGE',
            'EXCHANGE_APPROVED',
            'AWAITING_BANK_SETTLEMENT',
            'VERIFYING_AT_BANK',
            'SETTLED',
            'RETURNED_FOR_CORRECTION',
            'REJECTED_BY_EXCHANGE',
            'REJECTED_BY_BANK',
            'HELD_FOR_REVIEW',
            'PENDING',
            'QUEUED',
            'VERIFYING',
            'BEING_VERIFIED',
            'VERIFIED_AWAITING_EXCHANGE',
            'UNDER_EXCHANGE_REVIEW',
            'VALIDATED',
            'EXECUTING',
            'EXECUTED',
            'EXECUTED_PENDING_SETTLEMENT',
            'SETTLEMENT_REJECTED',
            'REJECTED',
            'CANCELLED',
            'RETURNED',
            'VOIDED'
          )
        );
        ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE settlement_vouchers DROP CONSTRAINT IF EXISTS settlement_vouchers_status_check;
        ALTER TABLE settlement_vouchers ADD CONSTRAINT settlement_vouchers_status_check CHECK (
          status IN ('PENDING', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW', 'SETTLED', 'REJECTED', 'CANCELLED', 'VOIDED', 'FAILED')
        );

        -- Synchronize fx_queue and fx_transactions schema
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS request_id VARCHAR(64);
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS team_name VARCHAR(128);
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS event_id VARCHAR(64) DEFAULT 'EVT_LIVE_MAIN';
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS quote_rate NUMERIC(18, 6);
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS spread_percent NUMERIC(8, 4);
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS rate_checked_at TIMESTAMPTZ;
        ALTER TABLE fx_queue ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
        ALTER TABLE fx_queue DROP CONSTRAINT IF EXISTS fx_queue_status_check;
        ALTER TABLE fx_queue ADD CONSTRAINT fx_queue_status_check CHECK (
          status IN ('QUEUED', 'RATE_CHECK', 'PROCESSING', 'SETTLED', 'REJECTED', 'CANCELLED', 'PENDING', 'APPROVED', 'PROCESSED')
        );

        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(64);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS team_id VARCHAR(32);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS team_name VARCHAR(128);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS rate NUMERIC(18, 6);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS spread_percent NUMERIC(8, 4);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS operator VARCHAR(128);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS operator_id VARCHAR(64);
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'CONFIRMED';
        ALTER TABLE fx_transactions ALTER COLUMN timestamp SET DEFAULT NOW();
        ALTER TABLE fx_transactions ALTER COLUMN timestamp DROP NOT NULL;
      `);
    } catch (cErr) {
      // Non-fatal if table not created yet or lacks permissions
    }
  } catch (err) {
    console.error('[Database Migration Warning]', err.message);
  }
}

/**
 * Hydrates application state from authoritative PostgreSQL tables.
 */
export async function hydrateStateFromPg(poolInstance, existingState = {}) {
  const p = poolInstance || getPool();
  if (!p) return { state: existingState, hydrated: false };

  try {
    console.log('[PostgreSQL State Hydration] Fetching authoritative state from database...');

    // 1. Securities
    const secRes = await p.query('SELECT * FROM securities ORDER BY id ASC');
    let securities = existingState.securities || [];
    if (secRes.rows && secRes.rows.length > 0) {
      securities = secRes.rows.map(r => ({
        id: r.id,
        ticker: r.ticker,
        name: r.name,
        companyName: r.company_name,
        sector: r.sector,
        industry: r.industry,
        currentPrice: Number(r.current_price),
        basePrice: Number(r.base_price),
        openingPrice: r.opening_price ? Number(r.opening_price) : Number(r.base_price),
        dayHigh: r.day_high ? Number(r.day_high) : Number(r.current_price),
        dayLow: r.day_low ? Number(r.day_low) : Number(r.current_price),
        lotSize: Number(r.lot_size || 1),
        totalUnits: Number(r.total_units || 0),
        availableUnits: Number(r.available_units || 0),
        tradingVolume: Number(r.trading_volume || 0),
        volatility: Number(r.volatility || 0.5),
        exchange: r.exchange,
        country: r.country,
        currency: r.currency || 'INR',
        status: r.status,
        ipoStatus: r.ipo_status,
        ipoStage: r.ipo_stage,
        visibleToParticipants: Boolean(r.visible_to_participants),
        bids: existingState.securities?.find(s => s.ticker === r.ticker)?.bids || {},
        availableFloat: r.available_float ? Number(r.available_float) : (existingState.securities?.find(s => s.ticker === r.ticker)?.availableFloat || Number(r.total_units || 0)),
        offerPrice: r.offer_price ? Number(r.offer_price) : (existingState.securities?.find(s => s.ticker === r.ticker)?.offerPrice || Number(r.base_price || 100)),
        priceHistory: typeof r.price_history === 'string' ? JSON.parse(r.price_history) : (r.price_history || [])
      }));
    }

    // 2. Teams
    const teamsRes = await p.query('SELECT * FROM teams WHERE is_active = TRUE ORDER BY id ASC');
    let teams = existingState.teams || [];
    if (teamsRes.rows && teamsRes.rows.length > 0) {
      teams = teamsRes.rows.map(r => {
        const existingTeam = (existingState.teams || []).find(et => et.id === r.id || et.teamCode === r.team_code);
        return {
          ...(existingTeam || {}),
          id: r.id,
          teamCode: r.team_code,
          teamName: r.team_name,
          teamType: r.team_type || existingTeam?.teamType || 'Retail',
          schoolName: r.school_name || existingTeam?.schoolName,
          isActive: Boolean(r.is_active),
          cashWallets: { INR: 0 },
          reservedCash: {},
          holdings: {}
        };
      });
    }

    // 3. Wallets
    const walletsRes = await p.query('SELECT team_id, currency, balance, reserved FROM wallets');
    if (walletsRes.rows) {
      for (const w of walletsRes.rows) {
        const team = teams.find(t => t.id === w.team_id || t.teamCode === w.team_id);
        if (team) {
          if (!team.cashWallets) team.cashWallets = {};
          if (!team.reservedCash) team.reservedCash = {};
          team.cashWallets[w.currency] = Number(w.balance);
          team.reservedCash[w.currency] = Number(w.reserved);
        }
      }
    }

    // 4. Holdings
    const holdingsRes = await p.query('SELECT team_id, ticker, units, locked_units, average_buy_price FROM holdings WHERE units > 0');
    if (holdingsRes.rows) {
      for (const h of holdingsRes.rows) {
        const team = teams.find(t => t.id === h.team_id || t.teamCode === h.team_id);
        if (team) {
          if (!team.holdings) team.holdings = {};
          if (!team.lockedHoldings) team.lockedHoldings = {};
          team.holdings[h.ticker] = Number(h.units);
          team.lockedHoldings[h.ticker] = Number(h.locked_units || 0);
        }
      }
    }

    // 5. Orders
    const ordersRes = await p.query('SELECT * FROM orders ORDER BY submitted_at ASC LIMIT 1000');
    let orders = existingState.orders || [];
    if (ordersRes.rows && ordersRes.rows.length > 0) {
      orders = ordersRes.rows.map(mapDbRowToOrder);
    }

    // 6. FX Rates
    const fxRes = await p.query('SELECT * FROM fx_rates');
    let fxRates = existingState.fxRates || {};
    if (fxRes.rows && fxRes.rows.length > 0) {
      for (const r of fxRes.rows) {
        fxRates[r.pair.replace('/', '')] = {
          pair: r.pair,
          base: r.base_currency,
          quote: r.quote_currency,
          midRate: Number(r.mid_rate),
          buyRate: Number(r.buy_rate),
          sellRate: Number(r.sell_rate),
          spreadPercent: Number(r.spread_percent),
          label: r.label || 'Simulation Reference Rate'
        };
      }
    }

    // Compute consolidated cashBalance for each hydrated team
    for (const team of teams) {
      let totalINR = Number(team.cashWallets?.INR || 0);
      for (const [cur, bal] of Object.entries(team.cashWallets || {})) {
        if (cur === 'INR') continue;
        const pairKey = `${cur}INR`;
        const rate = fxRates[pairKey]?.midRate || 1.0;
        totalINR += Number(bal) * rate;
      }
      team.cashBalance = parseFloat(totalINR.toFixed(2));
    }

    // 7. Settlements
    const stlRes = await p.query('SELECT * FROM settlement_vouchers ORDER BY created_at ASC LIMIT 500');
    let settlements = existingState.settlements || [];
    if (stlRes.rows && stlRes.rows.length > 0) {
      settlements = stlRes.rows.map(r => ({
        id: r.id,
        voucherReference: r.voucher_ref,
        orderId: r.order_id,
        teamId: r.team_id,
        teamCode: r.team_id,
        ticker: r.ticker,
        action: r.action,
        direction: r.direction || (r.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT'),
        classification: r.classification || (r.action === 'BUY' ? 'PAY_IN' : 'PAY_OUT'),
        bankDeskId: r.bank_desk_id || 'BANK_1',
        totalAmount: Number(r.amount),
        currency: r.currency || 'INR',
        status: r.status,
        tellerOperator: r.teller_operator,
        settledAt: r.settled_at ? new Date(r.settled_at).getTime() : null,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
      }));
    }

    // 8. Finite FX Reserves
    let fxReserves = existingState.fxReserves || {};
    try {
      const reservesRes = await p.query('SELECT * FROM fx_reserves');
      if (reservesRes.rows && reservesRes.rows.length > 0) {
        fxReserves = {};
        for (const r of reservesRes.rows) {
          fxReserves[r.currency] = {
            currency: r.currency,
            openingReserve: Number(r.opening_reserve),
            replenishments: Number(r.replenishments),
            completedPurchases: Number(r.completed_purchases),
            completedSales: Number(r.completed_sales),
            reservedInventory: Number(r.reserved_inventory),
            availableReserve: Number(r.available_reserve),
            currentInventory: Number(r.current_inventory),
            deskInrCash: Number(r.desk_inr_cash),
            minReserveThreshold: Number(r.min_reserve_threshold),
            maxCapacity: Number(r.max_capacity),
            updatedAt: r.updated_at
          };
        }
      }
    } catch (rErr) {
      // Table may not exist yet if migrations haven't run
    }

    // 7. Audit Logs (Durable Audit Trail)
    let auditLog = existingState.auditLog || [];
    try {
      const auditRes = await p.query(
        `SELECT id, EXTRACT(EPOCH FROM timestamp) * 1000 AS timestamp, actor, role, action, target, previous_state, new_state, reason
         FROM audit_logs ORDER BY timestamp DESC LIMIT 300`
      );
      if (auditRes.rows && auditRes.rows.length > 0) {
        auditLog = auditRes.rows.map(r => ({
          id: r.id,
          timestamp: Math.round(Number(r.timestamp)),
          actor: r.actor,
          role: r.role,
          action: r.action,
          target: r.target,
          previousState: r.previous_state ? (typeof r.previous_state === 'string' ? r.previous_state : JSON.stringify(r.previous_state)) : null,
          newState: r.new_state ? (typeof r.new_state === 'string' ? r.new_state : JSON.stringify(r.new_state)) : null,
          reason: r.reason
        }));
      }
    } catch (_) {}

    console.log(`[PostgreSQL State Hydration Complete] Loaded ${securities.length} securities, ${teams.length} teams, ${orders.length} orders, ${Object.keys(fxReserves).length} FX reserves, ${auditLog.length} audit logs.`);
    return {
      state: {
        ...existingState,
        securities,
        teams,
        orders,
        settlements,
        fxRates,
        fxReserves,
        auditLog,
        _isHydratedFromPg: true
      },
      hydrated: true
    };
  } catch (err) {
    console.error('[PostgreSQL State Hydration Failed]', err.message);
    return { state: existingState, hydrated: false, error: err.message };
  }
}

// Authoritative Session Store Singleton Instance
export const sessionStore = new PostgresSessionStore();
export const pool = getPool();
export default {
  initPool,
  getPool,
  setPool,
  isPgConfigured,
  isPgConnected,
  closePool,
  withTransaction,
  lockOrderForUpdate,
  lockWalletForUpdate,
  lockHoldingForUpdate,
  lockSecurityForUpdate,
  lockSettlementVoucherForUpdate,
  lockFxReserveForUpdate,
  applyFxReservesMigration,
  recordJournalEntry,
  sessionStore,
  PostgresSessionStore,
  mapDbRowToOrder,
  createOrderInDb,
  executeMarketOrderInDb,
  updateOrderStatusInDb,
  executeDirectTradeInDb,
  settleBankVoucherInDb,
  rejectBankVoucherInDb,
  holdBankVoucherInDb,
  runMigrations,
  hydrateStateFromPg
};

