/**
 * ==============================================================================
 * SAAMX Throttled Delta Publisher (Phase 4.4)
 * ==============================================================================
 * Publishes lightweight price ticks (< 500 bytes per tick) every 1 second
 * to Firebase Realtime Database at `/public/live_prices/{ticker}`.
 *
 * Avoids dumping the monolithic ~5 MB state tree to clients, drastically
 * reducing network bandwidth, client DOM re-render lag, and RTDB billable egress.
 * ==============================================================================
 */

import fs from 'fs';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Maximum payload size per security tick in bytes (strict constraint: < 500 bytes)
export const MAX_TICK_PAYLOAD_BYTES = 500;
export const DEFAULT_TICK_INTERVAL_MS = 1000;

// Internal state tracking for throttling and delta comparison
const lastPublishedTicks = new Map();
let publisherTimer = null;
let customDbInstance = null;
let isPublishing = false;

const stats = {
  isRunning: false,
  intervalMs: DEFAULT_TICK_INTERVAL_MS,
  totalBatchesPublished: 0,
  totalTicksPublished: 0,
  totalBytesPublished: 0,
  lastBatchCount: 0,
  lastBatchBytes: 0,
  maxObservedPayloadBytes: 0,
  lastPublishTimestamp: null,
  activeTickersCount: 0
};

/**
 * Format a security object into a lightweight, bandwidth-optimized price tick.
 * Guarantees schema consistency and strictly caps payload size to < 500 bytes.
 *
 * @param {Object} security - Authoritative security object from server state
 * @returns {Object} Lightweight price tick
 */
export function formatPriceTick(security) {
  if (!security || typeof security !== 'object' || !security.ticker) {
    throw new Error('Invalid security: ticker is required');
  }

  const parseNum = (val, fallback = 0) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  };

  const base = parseNum(security.openingPrice ?? security.basePrice ?? security.previousClose, 100);
  const current = parseNum(security.currentPrice, base);
  const dayChange = parseFloat((current - base).toFixed(2));
  const dayChangePct = base !== 0 ? parseFloat(((dayChange / base) * 100).toFixed(2)) : 0;

  const tick = {
    ticker: String(security.ticker).trim().toUpperCase(),
    currentPrice: current,
    dayChange,
    dayChangePercent: dayChangePct,
    dayHigh: parseNum(security.dayHigh, current),
    dayLow: parseNum(security.dayLow, current),
    tradingVolume: parseNum(security.tradingVolume, 0),
    status: String(security.status || 'Active'),
    currency: String(security.currency || 'INR'),
    lastUpdated: Date.now()
  };

  const payloadBytes = Buffer.byteLength(JSON.stringify(tick), 'utf8');
  if (payloadBytes > MAX_TICK_PAYLOAD_BYTES) {
    throw new Error(
      `Payload size violation for ${tick.ticker}: ${payloadBytes} bytes exceeds ${MAX_TICK_PAYLOAD_BYTES} bytes limit.`
    );
  }

  return tick;
}

/**
 * Measure serialized UTF-8 byte length of a price tick
 * @param {Object} tick
 * @returns {number}
 */
export function measureTickByteSize(tick) {
  return Buffer.byteLength(JSON.stringify(tick), 'utf8');
}

/**
 * Check if a security has changed since the last published tick
 * @param {Object} tick
 * @returns {boolean}
 */
export function hasSecurityDelta(tick) {
  const prev = lastPublishedTicks.get(tick.ticker);
  if (!prev) return true;

  return (
    prev.currentPrice !== tick.currentPrice ||
    prev.dayChange !== tick.dayChange ||
    prev.dayChangePercent !== tick.dayChangePercent ||
    prev.tradingVolume !== tick.tradingVolume ||
    prev.status !== tick.status ||
    prev.dayHigh !== tick.dayHigh ||
    prev.dayLow !== tick.dayLow
  );
}

/**
 * Check if Firebase Admin credentials are present in the environment
 * @returns {boolean}
 */
export function hasFirebaseCredentials() {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.K_SERVICE || // Google Cloud Run environment
    process.env.GAE_SERVICE || // Google App Engine
    customDbInstance
  );
}

/**
 * Get or initialize Firebase Admin Database instance using modular SDK
 * Returns null if credentials are not configured (graceful fallback)
 */
export function getFirebaseAdminDb() {
  if (customDbInstance) {
    return customDbInstance;
  }

  const apps = getApps();
  if (apps.length > 0) {
    return getDatabase(apps[0]);
  }

  if (!hasFirebaseCredentials()) {
    return null;
  }

  const dbUrl =
    process.env.FIREBASE_DATABASE_URL ||
    'https://fmos-a6573-default-rtdb.asia-southeast1.firebasedatabase.app';

  try {
    let credential = undefined;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        const saObj = raw.startsWith('{')
          ? JSON.parse(raw)
          : JSON.parse(fs.readFileSync(raw, 'utf8'));
        credential = cert(saObj);
      } catch (saErr) {
        console.warn('[Firebase Admin Warning] Failed to parse FIREBASE_SERVICE_ACCOUNT:', saErr.message);
      }
    }

    const app = initializeApp({
      databaseURL: dbUrl,
      ...(credential ? { credential } : {})
    });
    return getDatabase(app);
  } catch (err) {
    // If running in development or offline test mode without Google credentials,
    // fallback gracefully rather than crashing the server.
    return null;
  }
}

/**
 * Override the database instance (used for testing and in-memory mock injection)
 * @param {Object|null} db
 */
export function setCustomDatabaseInstance(db) {
  customDbInstance = db;
}

/**
 * Publish a single security price tick to /public/live_prices/{ticker}
 * @param {Object} security
 * @param {Object} [db] Optional database override
 * @returns {Promise<{ published: boolean, tick: Object, byteSize: number }>}
 */
export async function publishSecurityTick(security, db = null) {
  const tick = formatPriceTick(security);
  const byteSize = measureTickByteSize(tick);

  if (byteSize > stats.maxObservedPayloadBytes) {
    stats.maxObservedPayloadBytes = byteSize;
  }

  const rtdb = db || getFirebaseAdminDb();
  if (rtdb && typeof rtdb.ref === 'function') {
    const targetRef = rtdb.ref(`public/live_prices/${tick.ticker}`);
    await targetRef.set(tick);
  }

  lastPublishedTicks.set(tick.ticker, tick);
  stats.totalTicksPublished++;
  stats.totalBytesPublished += byteSize;
  stats.lastPublishTimestamp = tick.lastUpdated;

  return { published: true, tick, byteSize };
}

/**
 * Publish a batch of security deltas to /public/live_prices
 * Uses multi-path updates for maximum network and database efficiency.
 *
 * @param {Array<Object>|Object} securitiesList
 * @param {Object} [options]
 * @param {boolean} [options.forceAll=false] - Force publish all securities even if unchanged
 * @param {Object} [options.db=null] - Optional database instance
 * @returns {Promise<{ batchCount: number, batchBytes: number, updates: Object }>}
 */
export async function publishDeltaBatch(securitiesList, options = {}) {
  const { forceAll = false, db = null } = options;
  const list = Array.isArray(securitiesList)
    ? securitiesList
    : Object.values(securitiesList || {});

  const updates = {};
  const pendingTicks = [];
  let batchBytes = 0;
  let batchCount = 0;

  for (const sec of list) {
    if (!sec || typeof sec !== 'object' || !sec.ticker) continue;

    const tick = formatPriceTick(sec);
    const byteSize = measureTickByteSize(tick);

    if (forceAll || hasSecurityDelta(tick)) {
      updates[`public/live_prices/${tick.ticker}`] = tick;
      pendingTicks.push(tick);
      batchBytes += byteSize;
      batchCount++;

      if (byteSize > stats.maxObservedPayloadBytes) {
        stats.maxObservedPayloadBytes = byteSize;
      }
    }
  }

  if (batchCount > 0) {
    const rtdb = db || getFirebaseAdminDb();
    if (rtdb && typeof rtdb.ref === 'function') {
      try {
        await rtdb.ref().update(updates);
      } catch (err) {
        if (customDbInstance) {
          throw err;
        }
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[DELTA PUBLISHER] RTDB update notice:', err.message);
        }
      }
    }

    // Commit to lastPublishedTicks only after batch dispatch
    for (const tick of pendingTicks) {
      lastPublishedTicks.set(tick.ticker, tick);
    }

    stats.totalBatchesPublished++;
    stats.totalTicksPublished += batchCount;
    stats.totalBytesPublished += batchBytes;
    stats.lastBatchCount = batchCount;
    stats.lastBatchBytes = batchBytes;
    stats.lastPublishTimestamp = Date.now();
  }

  stats.activeTickersCount = list.length;

  return { batchCount, batchBytes, updates };
}

/**
 * Start the background 1-second throttled delta publisher loop.
 *
 * @param {Object} config
 * @param {Function} config.getState - Function returning current authoritative state
 * @param {number} [config.intervalMs=1000] - Publishing throttle interval (default: 1000ms)
 * @param {Object} [config.db=null] - Optional database instance
 * @returns {Object} Controller handle
 */
export function startDeltaPublisher(config = {}) {
  const { getState, intervalMs = DEFAULT_TICK_INTERVAL_MS, db = null } = config;

  if (typeof getState !== 'function') {
    throw new Error('startDeltaPublisher requires a getState() function');
  }

  if (db) {
    setCustomDatabaseInstance(db);
  }

  if (publisherTimer) {
    clearInterval(publisherTimer);
    publisherTimer = null;
  }

  stats.isRunning = true;
  stats.intervalMs = intervalMs;
  isPublishing = false;

  publisherTimer = setInterval(async () => {
    if (isPublishing) return;
    isPublishing = true;
    try {
      const currentState = getState();
      if (!currentState || !currentState.securities) return;

      await publishDeltaBatch(currentState.securities, { db: customDbInstance });
    } catch (err) {
      console.error('[DELTA PUBLISHER ERROR]:', err.message);
    } finally {
      isPublishing = false;
    }
  }, intervalMs);

  return {
    stop: stopDeltaPublisher,
    getStats: getDeltaPublisherStats
  };
}

/**
 * Stop the delta publisher timer cleanly
 */
export function stopDeltaPublisher() {
  if (publisherTimer) {
    clearInterval(publisherTimer);
    publisherTimer = null;
  }
  isPublishing = false;
  stats.isRunning = false;
}

/**
 * Retrieve current telemetry and runtime performance statistics
 */
export function getDeltaPublisherStats() {
  return {
    ...stats,
    cachedTickersCount: lastPublishedTicks.size,
    isDbConnected: !!(customDbInstance || (getApps().length > 0))
  };
}

/**
 * Reset all tracked deltas and metrics (for test isolation)
 */
export function resetDeltaPublisher() {
  stopDeltaPublisher();
  lastPublishedTicks.clear();
  customDbInstance = null;
  isPublishing = false;
  stats.totalBatchesPublished = 0;
  stats.totalTicksPublished = 0;
  stats.totalBytesPublished = 0;
  stats.lastBatchCount = 0;
  stats.lastBatchBytes = 0;
  stats.maxObservedPayloadBytes = 0;
  stats.lastPublishTimestamp = null;
  stats.activeTickersCount = 0;
}

export default {
  MAX_TICK_PAYLOAD_BYTES,
  DEFAULT_TICK_INTERVAL_MS,
  formatPriceTick,
  measureTickByteSize,
  hasSecurityDelta,
  hasFirebaseCredentials,
  getFirebaseAdminDb,
  setCustomDatabaseInstance,
  publishSecurityTick,
  publishDeltaBatch,
  startDeltaPublisher,
  stopDeltaPublisher,
  getDeltaPublisherStats,
  resetDeltaPublisher
};
