import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const STATE_FILE = path.join(ROOT_DIR, 'state.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'database', 'seeds.sql');
const EXPECTED_HASH = '441077e432987ce85a8ec982b818564f68f9b3fa8a59128e5313d04ab30c754c';

// Currency Directory & Supported Currencies
const SUPPORTED_CURRENCIES = [
  'INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW', 'CAD', 'CHF'
];

const DEFAULT_FX_RATES = {
  USDINR: { pair: 'USD/INR', base: 'USD', quote: 'INR', midRate: 88.20, buyRate: 88.60, sellRate: 87.80, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  GBPINR: { pair: 'GBP/INR', base: 'GBP', quote: 'INR', midRate: 119.40, buyRate: 119.95, sellRate: 118.85, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  EURINR: { pair: 'EUR/INR', base: 'EUR', quote: 'INR', midRate: 103.50, buyRate: 103.95, sellRate: 103.05, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  JPYINR: { pair: 'JPY/INR', base: 'JPY', quote: 'INR', midRate: 0.58, buyRate: 0.583, sellRate: 0.577, spreadPercent: 0.52, label: 'Simulation Reference Rate' },
  AEDINR: { pair: 'AED/INR', base: 'AED', quote: 'INR', midRate: 24.01, buyRate: 24.12, sellRate: 23.90, spreadPercent: 0.46, label: 'Simulation Reference Rate' },
  SGDINR: { pair: 'SGD/INR', base: 'SGD', quote: 'INR', midRate: 66.80, buyRate: 67.10, sellRate: 66.50, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  CNYINR: { pair: 'CNY/INR', base: 'CNY', quote: 'INR', midRate: 12.25, buyRate: 12.31, sellRate: 12.19, spreadPercent: 0.49, label: 'Simulation Reference Rate' },
  AUDINR: { pair: 'AUD/INR', base: 'AUD', quote: 'INR', midRate: 55.50, buyRate: 55.75, sellRate: 55.25, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  KRWINR: { pair: 'KRW/INR', base: 'KRW', quote: 'INR', midRate: 0.062, buyRate: 0.0623, sellRate: 0.0617, spreadPercent: 0.48, label: 'Simulation Reference Rate' },
  CADINR: { pair: 'CAD/INR', base: 'CAD', quote: 'INR', midRate: 64.50, buyRate: 64.79, sellRate: 64.21, spreadPercent: 0.45, label: 'Simulation Reference Rate' },
  CHFINR: { pair: 'CHF/INR', base: 'CHF', quote: 'INR', midRate: 99.10, buyRate: 99.55, sellRate: 98.65, spreadPercent: 0.45, label: 'Simulation Reference Rate' }
};

// SQL Formatting & Escaping Helpers
function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlNum(val, def = 0) {
  if (val === null || val === undefined || isNaN(Number(val))) return def;
  return Number(val);
}

function sqlInt(val, def = 0) {
  if (val === null || val === undefined || isNaN(parseInt(val, 10))) return def;
  return parseInt(val, 10);
}

function sqlBool(val, def = false) {
  if (val === null || val === undefined) return def ? 'TRUE' : 'FALSE';
  return val ? 'TRUE' : 'FALSE';
}

function sqlJson(val, def = '{}') {
  if (val === null || val === undefined) return `'${def}'::jsonb`;
  const json = typeof val === 'string' ? val : JSON.stringify(val);
  return `'${json.replace(/'/g, "''")}'::jsonb`;
}

function sqlTimestamp(val) {
  if (!val) return 'NULL';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'NULL';
    return `'${d.toISOString()}'::timestamptz`;
  } catch {
    return 'NULL';
  }
}

export function migrateStateToPg() {
  console.log('======================================================================');
  console.log('📦 SAAMX DETERMINISTIC STATE-TO-POSTGRESQL MIGRATION GENERATOR');
  console.log('======================================================================\n');

  // STEP 1: VERIFY IMMUTABLE STATE HASH
  console.log('--- Step 1: Pre-Flight State Hash Verification ---');
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`State file missing: ${STATE_FILE}`);
  }
  const rawBytes = fs.readFileSync(STATE_FILE);
  const actualHash = crypto.createHash('sha256').update(rawBytes).digest('hex');
  console.log(`Expected SHA-256: ${EXPECTED_HASH}`);
  console.log(`Actual SHA-256:   ${actualHash}`);

  if (actualHash !== EXPECTED_HASH) {
    throw new Error(`CRITICAL INTEGRITY FAILURE: state.json SHA-256 hash mismatch! Migration aborted.`);
  }
  console.log('✓ SHA-256 state hash verified bit-identical.\n');

  // STEP 2: PARSE STATE
  console.log('--- Step 2: Parsing state.json & Auditing Structure ---');
  const state = JSON.parse(rawBytes.toString('utf8'));
  const rootKeys = Object.keys(state);
  console.log(`Root keys detected: ${rootKeys.length} (Expected: 39)`);
  if (rootKeys.length !== 39) {
    throw new Error(`Root key count mismatch: expected 39, got ${rootKeys.length}`);
  }
  console.log('✓ All 39 root keys present and confirmed.\n');

  const lines = [];
  lines.push('-- ==============================================================================');
  lines.push('-- SAAMX Authoritative Database Seed (Generated Deterministically)');
  lines.push(`-- Source SHA-256: ${EXPECTED_HASH}`);
  lines.push('-- Target Engine:  PostgreSQL 15 / Google Cloud SQL');
  lines.push('-- ==============================================================================\n');
  lines.push('BEGIN;\n');

  // 1. RISK CONTROLS
  console.log('Seeding Floor Risk Controls...');
  const rc = state.riskControls || {};
  lines.push('-- 1. RISK CONTROLS');
  lines.push(`INSERT INTO risk_controls (
    id, circuit_breaker_threshold, price_band_percent, max_order_value,
    max_position_size_percent, concentration_warning_percent, allow_short_selling,
    cash_protection_floor, updated_at
  ) VALUES (
    1, ${sqlNum(rc.circuitBreakerThreshold, 30)}, ${sqlNum(rc.priceBandPercent, 20)},
    ${sqlNum(rc.maxOrderValue, 50000000)}, ${sqlNum(rc.maxPositionSizePercent, 35)},
    ${sqlNum(rc.concentrationWarningPercent, 25)}, ${sqlBool(rc.allowShortSelling, false)},
    ${sqlNum(rc.cashProtectionFloor, 0)}, NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    circuit_breaker_threshold = EXCLUDED.circuit_breaker_threshold,
    price_band_percent = EXCLUDED.price_band_percent,
    max_order_value = EXCLUDED.max_order_value,
    max_position_size_percent = EXCLUDED.max_position_size_percent,
    concentration_warning_percent = EXCLUDED.concentration_warning_percent,
    allow_short_selling = EXCLUDED.allow_short_selling,
    cash_protection_floor = EXCLUDED.cash_protection_floor,
    updated_at = NOW();\n`);

  // 2. ORDER DESKS
  console.log('Seeding Order Desks...');
  lines.push('-- 2. ORDER DESKS');
  const desks = state.orderDesks || {};
  for (const [deskId, desk] of Object.entries(desks)) {
    lines.push(`INSERT INTO order_desks (
      desk_id, desk_name, operator, status, total_processed, updated_at
    ) VALUES (
      ${sqlStr(desk.id || deskId)}, ${sqlStr(desk.name || deskId)},
      ${sqlStr(desk.operator || 'Unassigned')}, 'ACTIVE',
      ${sqlInt(desk.totalProcessed, 0)}, NOW()
    ) ON CONFLICT (desk_id) DO UPDATE SET
      desk_name = EXCLUDED.desk_name,
      operator = EXCLUDED.operator,
      total_processed = EXCLUDED.total_processed,
      updated_at = NOW();`);
  }
  lines.push('');

  // 3. MARKET INDICES
  console.log('Seeding Market Indices...');
  lines.push('-- 3. MARKET INDICES');
  const indices = state.marketIndices || {};
  for (const [symbol, idx] of Object.entries(indices)) {
    lines.push(`INSERT INTO market_indices (
      symbol, name, current_value, opening_value, change_percent, updated_at
    ) VALUES (
      ${sqlStr(symbol)}, ${sqlStr(idx.name || symbol)},
      ${sqlNum(idx.currentValue, 1000)}, ${sqlNum(idx.openingValue, idx.currentValue || 1000)},
      ${sqlNum(idx.changePercent, 0)}, NOW()
    ) ON CONFLICT (symbol) DO UPDATE SET
      name = EXCLUDED.name,
      current_value = EXCLUDED.current_value,
      opening_value = EXCLUDED.opening_value,
      change_percent = EXCLUDED.change_percent,
      updated_at = NOW();`);
  }
  lines.push('');

  // 4. FX RATES
  console.log('Seeding FX Rates (11 normalized global pairs)...');
  lines.push('-- 4. FX RATES');
  const mergedRates = { ...DEFAULT_FX_RATES, ...(state.fxRates || {}) };
  for (const [pairKey, rate] of Object.entries(mergedRates)) {
    const base = rate.base || pairKey.substring(0, 3);
    const quote = rate.quote || pairKey.substring(3, 6);
    lines.push(`INSERT INTO fx_rates (
      pair, base_currency, quote_currency, mid_rate, buy_rate, sell_rate, spread_percent, label, updated_at
    ) VALUES (
      ${sqlStr(pairKey)}, ${sqlStr(base)}, ${sqlStr(quote)},
      ${sqlNum(rate.midRate, 1.0)}, ${sqlNum(rate.buyRate, 1.0)}, ${sqlNum(rate.sellRate, 1.0)},
      ${sqlNum(rate.spreadPercent, 0.45)}, ${sqlStr(rate.label || 'Simulation Reference Rate')}, NOW()
    ) ON CONFLICT (pair) DO UPDATE SET
      mid_rate = EXCLUDED.mid_rate,
      buy_rate = EXCLUDED.buy_rate,
      sell_rate = EXCLUDED.sell_rate,
      spread_percent = EXCLUDED.spread_percent,
      label = EXCLUDED.label,
      updated_at = NOW();`);
  }
  lines.push('');

  // 5. PERSONNEL & MASTER ADMINS
  console.log('Seeding Personnel & Password Hashes...');
  lines.push('-- 5. PERSONNEL');
  const personnelList = state.personnel || [];
  for (const p of personnelList) {
    lines.push(`INSERT INTO personnel (
      id, username, display_name, role, status, staff_id, department, password_hash, permissions, created_at, last_login
    ) VALUES (
      ${sqlStr(p.id)}, ${sqlStr(p.username)}, ${sqlStr(p.displayName || p.username)},
      ${sqlStr(p.role)}, ${sqlStr(p.status || 'ACTIVE')}, ${sqlStr(p.staffId)},
      ${sqlStr(p.department)}, ${sqlStr(p.passwordHash)},
      ${sqlJson(p.permissions, '[]')}, ${sqlTimestamp(p.createdAt || Date.now())},
      ${sqlTimestamp(p.lastLogin)}
    ) ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      password_hash = EXCLUDED.password_hash,
      permissions = EXCLUDED.permissions;`);
  }

  // Also reconcile state.masterAdmins
  const masterAdmins = state.masterAdmins || [];
  for (const ma of masterAdmins) {
    const existing = personnelList.find(p => p.username?.toLowerCase() === ma.username?.toLowerCase());
    if (!existing) {
      const maId = `USR_MASTER_${ma.username.toUpperCase()}`;
      lines.push(`INSERT INTO personnel (
        id, username, display_name, role, status, staff_id, department, password_hash, permissions, created_at, last_login
      ) VALUES (
        ${sqlStr(maId)}, ${sqlStr(ma.username.toLowerCase())}, ${sqlStr(ma.username)},
        ${sqlStr(ma.role || 'super_admin')}, 'ACTIVE', 'MASTER_ADMIN',
        'Executive Management', 'scrypt:bootstrap_master:unhashed',
        '["*"]'::jsonb, ${sqlTimestamp(ma.createdAt || Date.now())}, NULL
      ) ON CONFLICT (id) DO NOTHING;`);
    }
  }
  lines.push('');

  // 6. CHAMPIONSHIP EVENTS
  console.log('Seeding Events...');
  lines.push('-- 6. CHAMPIONSHIP EVENTS');
  const events = state.events || [];
  for (const evt of events) {
    lines.push(`INSERT INTO events (
      event_id, event_name, event_date, venue, registration_open, registration_close,
      maximum_investment_houses, team_size, starting_capital, market_open_time, market_close_time,
      lunch_break, results_time, event_status, event_mode, schedule, created_at, updated_at
    ) VALUES (
      ${sqlStr(evt.eventId)}, ${sqlStr(evt.eventName)}, ${sqlStr(evt.eventDate)},
      ${sqlStr(evt.venue)}, ${sqlBool(evt.registrationOpen, true)}, ${sqlTimestamp(evt.registrationClose)},
      ${sqlInt(evt.maximumInvestmentHouses, 40)}, ${sqlInt(evt.teamSize, 4)},
      ${sqlNum(evt.startingCapital, 10000000)}, ${sqlStr(evt.marketOpenTime || '09:30')},
      ${sqlStr(evt.marketCloseTime || '15:30')}, ${sqlStr(evt.lunchBreak || '12:00 - 13:00')},
      ${sqlStr(evt.resultsTime || '16:00')}, ${sqlStr(evt.eventStatus || 'REGISTRATION_OPEN')},
      ${sqlStr(evt.eventMode || 'LIVE')}, ${sqlJson(evt.schedule, '[]')},
      ${sqlTimestamp(evt.createdAt || Date.now())}, ${sqlTimestamp(evt.updatedAt || Date.now())}
    ) ON CONFLICT (event_id) DO UPDATE SET
      event_name = EXCLUDED.event_name,
      event_date = EXCLUDED.event_date,
      venue = EXCLUDED.venue,
      registration_open = EXCLUDED.registration_open,
      event_status = EXCLUDED.event_status,
      schedule = EXCLUDED.schedule,
      updated_at = NOW();`);
  }
  lines.push('');

  // 7. NEWS EVENTS (30 items)
  console.log('Seeding News Events (30 items)...');
  lines.push('-- 7. NEWS EVENTS');
  const newsList = state.newsEvents || [];
  for (const news of newsList) {
    lines.push(`INSERT INTO news_events (
      id, headline, description, affected_sector, sentiment, impact_percent, is_custom, category, created_at
    ) VALUES (
      ${sqlStr(news.id)}, ${sqlStr(news.headline)}, ${sqlStr(news.description)},
      ${sqlStr(news.affectedSector)}, ${sqlStr(news.sentiment)}, ${sqlNum(news.impactPercent, 0)},
      ${sqlBool(news.isCustom, false)}, ${sqlStr(news.category || 'Corporate')}, NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      headline = EXCLUDED.headline,
      description = EXCLUDED.description,
      affected_sector = EXCLUDED.affected_sector,
      sentiment = EXCLUDED.sentiment,
      impact_percent = EXCLUDED.impact_percent;`);
  }
  lines.push('');

  // 8. ADVISORS
  console.log('Seeding Advisors (4 personas)...');
  lines.push('-- 8. ADVISORS');
  const advisors = state.advisors || {};
  for (const [advId, adv] of Object.entries(advisors)) {
    lines.push(`INSERT INTO advisors (
      id, name, coverage, bio, updated_at
    ) VALUES (
      ${sqlStr(adv.id || advId)}, ${sqlStr(adv.name)}, ${sqlStr(adv.coverage)},
      ${sqlStr(adv.bio)}, NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      coverage = EXCLUDED.coverage,
      bio = EXCLUDED.bio,
      updated_at = NOW();`);
  }
  lines.push('');

  // 9. BULL/BEAR DEBATE & SENTIMENT
  console.log('Seeding Bull/Bear Debate State...');
  lines.push('-- 9. BULL/BEAR DEBATE');
  const bbd = state.bullBearDebate || {};
  const bb = state.bullBear || {};
  lines.push(`INSERT INTO bull_bear_debates (
    id, active_round, current_topic, timer_seconds, status, history, moderator_notes,
    bull_stance, bull_confidence, bull_statement, bear_stance, bear_confidence, bear_statement, updated_at
  ) VALUES (
    1, ${sqlInt(bbd.activeRound, 1)}, ${sqlStr(bbd.currentTopic)},
    ${sqlInt(bbd.timerSeconds, 300)}, ${sqlStr(bbd.status || 'IDLE')},
    ${sqlJson(bbd.history, '[]')}, ${sqlStr(bbd.moderatorNotes || '')},
    ${sqlStr(bb.bull?.stance)}, ${sqlInt(bb.bull?.confidence, 80)}, ${sqlStr(bb.bull?.statement)},
    ${sqlStr(bb.bear?.stance)}, ${sqlInt(bb.bear?.confidence, 70)}, ${sqlStr(bb.bear?.statement)}, NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    active_round = EXCLUDED.active_round,
    current_topic = EXCLUDED.current_topic,
    timer_seconds = EXCLUDED.timer_seconds,
    status = EXCLUDED.status,
    history = EXCLUDED.history,
    moderator_notes = EXCLUDED.moderator_notes,
    bull_stance = EXCLUDED.bull_stance,
    bull_confidence = EXCLUDED.bull_confidence,
    bull_statement = EXCLUDED.bull_statement,
    bear_stance = EXCLUDED.bear_stance,
    bear_confidence = EXCLUDED.bear_confidence,
    bear_statement = EXCLUDED.bear_statement,
    updated_at = NOW();\n`);

  if (bb.bull) {
    lines.push(`INSERT INTO bull_bear_signals (stance_type, stance, confidence, statement, updated_at)
    VALUES ('BULL', ${sqlStr(bb.bull.stance || 'Strongly Bullish')}, ${sqlInt(bb.bull.confidence, 85)}, ${sqlStr(bb.bull.statement || '')}, NOW())
    ON CONFLICT (stance_type) DO UPDATE SET stance = EXCLUDED.stance, confidence = EXCLUDED.confidence, statement = EXCLUDED.statement, updated_at = NOW();`);
  }
  if (bb.bear) {
    lines.push(`INSERT INTO bull_bear_signals (stance_type, stance, confidence, statement, updated_at)
    VALUES ('BEAR', ${sqlStr(bb.bear.stance || 'Defensive/Bearish')}, ${sqlInt(bb.bear.confidence, 75)}, ${sqlStr(bb.bear.statement || '')}, NOW())
    ON CONFLICT (stance_type) DO UPDATE SET stance = EXCLUDED.stance, confidence = EXCLUDED.confidence, statement = EXCLUDED.statement, updated_at = NOW();`);
  }
  lines.push('');

  // 10. MARKET STATE & SYSTEM SETTINGS
  console.log('Seeding Market State & System Settings...');
  lines.push('-- 10. MARKET STATE & SETTINGS');
  const ms = state.marketState || {};
  lines.push(`INSERT INTO market_state (
    id, status, simulation_start_time, simulation_duration_minutes, market_index,
    pause_time_offset, paused_at, session_state, results_lifecycle, reconciled_at, updated_at
  ) VALUES (
    1, ${sqlStr(ms.status || 'Closed')}, ${sqlTimestamp(ms.simulationStartTime)},
    ${sqlInt(ms.simulationDurationMinutes, 60)}, ${sqlInt(ms.marketIndex, 0)},
    ${sqlNum(ms.pauseTimeOffset, 0)}, ${sqlTimestamp(ms.pausedAt)},
    ${sqlStr(ms.sessionState || 'RESULTS')}, ${sqlStr(state.resultsLifecycle || 'VALUATION_FROZEN')},
    ${sqlTimestamp(ms.reconciledAt)}, NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    session_state = EXCLUDED.session_state,
    results_lifecycle = EXCLUDED.results_lifecycle,
    reconciled_at = EXCLUDED.reconciled_at,
    updated_at = NOW();\n`);

  const settings = state.settings || {};
  for (const [k, v] of Object.entries(settings)) {
    lines.push(`INSERT INTO system_settings (key, value, description, updated_at)
    VALUES (${sqlStr(k)}, ${sqlJson(v)}, ${sqlStr('Platform System Setting: ' + k)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`);
  }
  lines.push('');

  // 11. COORDINATOR STATE
  console.log('Seeding Floor Coordinator State...');
  lines.push('-- 11. COORDINATOR STATE');
  const coord = state.coordinator || {};
  lines.push(`INSERT INTO coordinator_state (
    session_uuid, role, claimed_at, last_heartbeat, current_phase, current_title,
    is_trading_permitted, minutes_to_next, current_time_string, timezone, updated_at
  ) VALUES (
    ${sqlStr(coord.sessionUuid || 'UUID_DEFAULT')}, ${sqlStr(coord.role || 'admin')},
    ${sqlTimestamp(coord.claimedAt || Date.now())}, ${sqlTimestamp(coord.lastHeartbeat || Date.now())},
    ${sqlStr(coord.currentPhase || 'BRIEFING')}, ${sqlStr(coord.currentTitle || 'Briefing')},
    ${sqlBool(coord.isTradingPermitted, false)}, ${sqlInt(coord.minutesToNext, 0)},
    ${sqlStr(coord.currentTimeString || '09:00 IST')}, ${sqlStr(coord.timezone || 'Asia/Kolkata')}, NOW()
  ) ON CONFLICT (session_uuid) DO UPDATE SET
    role = EXCLUDED.role,
    last_heartbeat = EXCLUDED.last_heartbeat,
    current_phase = EXCLUDED.current_phase,
    current_title = EXCLUDED.current_title,
    is_trading_permitted = EXCLUDED.is_trading_permitted,
    minutes_to_next = EXCLUDED.minutes_to_next,
    current_time_string = EXCLUDED.current_time_string,
    updated_at = NOW();\n`);

  // 12. SCORING CONFIG
  console.log('Seeding Scoring Config...');
  lines.push('-- 12. SCORING CONFIG');
  const sc = state.scoringConfig || {};
  lines.push(`INSERT INTO scoring_configs (version, config_data, created_at, updated_at)
  VALUES (${sqlStr(sc.version || 'v1.0-standard')}, ${sqlJson(sc)}, NOW(), NOW())
  ON CONFLICT (version) DO UPDATE SET config_data = EXCLUDED.config_data, updated_at = NOW();\n`);

  // 13. CLOSING SNAPSHOT
  console.log('Seeding Event Closing Snapshots...');
  lines.push('-- 13. CLOSING SNAPSHOTS');
  const ecs = state.eventClosingSnapshots || {};
  for (const [evtId, snap] of Object.entries(ecs)) {
    lines.push(`INSERT INTO event_closing_snapshots (
      event_id, snapshot_id, frozen_at, immutable_hash, data, created_at
    ) VALUES (
      ${sqlStr(evtId)}, ${sqlStr(snap.snapshotId || `SNAP_${evtId}`)},
      ${sqlTimestamp(snap.frozenAt || Date.now())},
      ${sqlStr(snap.immutableHash || 'HASH_DEFAULT')},
      ${sqlJson(snap.closingTeamValuations || snap)}, NOW()
    ) ON CONFLICT (event_id) DO UPDATE SET
      snapshot_id = EXCLUDED.snapshot_id,
      frozen_at = EXCLUDED.frozen_at,
      immutable_hash = EXCLUDED.immutable_hash,
      data = EXCLUDED.data;`);
  }
  lines.push('');

  // 14. AUDIT LOGS (23 items)
  console.log('Seeding Audit Trail Logs (23 items)...');
  lines.push('-- 14. AUDIT LOGS');
  const auditLogs = state.auditLog || [];
  for (const al of auditLogs) {
    lines.push(`INSERT INTO audit_logs (
      id, timestamp, actor, role, action, target, previous_state, new_state, reason, created_at
    ) VALUES (
      ${sqlStr(al.id)}, ${sqlTimestamp(al.timestamp)}, ${sqlStr(al.actor)},
      ${sqlStr(al.role)}, ${sqlStr(al.action)}, ${sqlStr(al.target)},
      ${sqlJson(al.previousState, null)}, ${sqlJson(al.newState, null)},
      ${sqlStr(al.reason)}, NOW()
    ) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push('');

  // 15. SECURITIES CATALOG (2,063 items)
  console.log(`Seeding Tradable Securities Universe (${state.securities.length} instruments)...`);
  lines.push('-- 15. SECURITIES CATALOG');
  for (const s of state.securities) {
    lines.push(`INSERT INTO securities (
      id, ticker, name, company_name, sector, industry, offer_price, base_price,
      reference_price, previous_close, opening_price, current_price, day_high, day_low,
      lot_size, total_units, available_units, available_float, trading_volume,
      total_subscription, subscription_multiple, volatility, risk_rating, growth_rating,
      exchange, country, currency, type, status, ipo_status, ipo_stage,
      visible_to_participants, simulation_label, personality, description,
      profile_details, price_history, created_at, updated_at
    ) VALUES (
      ${sqlStr(s.id)}, ${sqlStr(s.ticker)}, ${sqlStr(s.name)}, ${sqlStr(s.companyName || s.name)},
      ${sqlStr(s.sector)}, ${sqlStr(s.industry)}, ${sqlNum(s.offerPrice, null)},
      ${sqlNum(s.basePrice, s.currentPrice || 0)}, ${sqlNum(s.referencePrice, null)},
      ${sqlNum(s.previousClose, null)}, ${sqlNum(s.openingPrice, null)},
      ${sqlNum(s.currentPrice, 0)}, ${sqlNum(s.dayHigh, s.currentPrice)},
      ${sqlNum(s.dayLow, s.currentPrice)}, ${sqlInt(s.lotSize, 1)},
      ${sqlInt(s.totalUnits, 0)}, ${sqlInt(s.availableUnits, s.totalUnits || 0)},
      ${sqlInt(s.availableFloat, s.availableUnits || 0)}, ${sqlInt(s.tradingVolume, 0)},
      ${sqlNum(s.totalSubscription, 0)}, ${sqlNum(s.subscriptionMultiple, 0)},
      ${sqlNum(s.volatility, 0.5)}, ${sqlStr(s.riskRating)}, ${sqlStr(s.growthRating)},
      ${sqlStr(s.exchange)}, ${sqlStr(s.country)}, ${sqlStr(s.currency || 'INR')},
      ${sqlStr(s.type || 'Equity')}, ${sqlStr(s.status || 'Active')},
      ${sqlStr(s.ipoStatus || 'LISTED')}, ${sqlStr(s.ipoStage || 'COMPLETED')},
      ${sqlBool(s.visibleToParticipants, true)}, ${sqlStr(s.simulationLabel)},
      ${sqlStr(s.personality)}, ${sqlStr(s.description)},
      ${sqlJson(s.profileDetails, '{}')}, ${sqlJson(s.priceHistory, '[]')}, NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      ticker = EXCLUDED.ticker,
      name = EXCLUDED.name,
      company_name = EXCLUDED.company_name,
      current_price = EXCLUDED.current_price,
      base_price = EXCLUDED.base_price,
      total_units = EXCLUDED.total_units,
      available_units = EXCLUDED.available_units,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      updated_at = NOW();`);
  }
  lines.push('');

  // 16. SYSTEM CHART OF ACCOUNTS (Normalized for all 12 supported currencies)
  console.log('Seeding General Ledger Chart of Accounts (all 12 currencies)...');
  lines.push('-- 16. CHART OF ACCOUNTS');
  const sysAccounts = [
    `('ACC_SYS_EQUITY_SEED', 'EQ-1000', 'EQUITY', 'System Initial Seed Capital', 'INR')`
  ];
  SUPPORTED_CURRENCIES.forEach((cur, idx) => {
    sysAccounts.push(`('ACC_SYS_CLEARING_EXCHANGE_${cur}', 'CLR-EXC-${cur}-${100 + idx}', 'CLEARING', 'Exchange Clearing Account ${cur}', '${cur}')`);
    sysAccounts.push(`('ACC_SYS_CLEARING_FX_${cur}', 'CLR-FX-${cur}-${200 + idx}', 'CLEARING', 'FX Settlement Clearing ${cur}', '${cur}')`);
  });
  lines.push(`INSERT INTO accounts (id, account_number, account_type, name, currency) VALUES\n  ${sysAccounts.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;\n`);

  // 17. PARTICIPANT TEAMS, WALLETS, HOLDINGS & DOUBLE-ENTRY CAPITAL SEED
  console.log(`Seeding Participant Teams (${state.teams.length} teams), Wallets & Ledger...`);
  lines.push('-- 17. TEAMS, WALLETS, AND DOUBLE-ENTRY LEDGER SEED');
  for (const team of state.teams) {
    const teamCode = team.teamCode || team.id;
    lines.push(`-- Team ${teamCode}`);
    lines.push(`INSERT INTO teams (
      id, team_code, team_name, team_type, is_active, created_at, updated_at
    ) VALUES (
      ${sqlStr(team.id)}, ${sqlStr(teamCode)}, ${sqlStr(team.teamName)},
      ${sqlStr(team.teamType || 'Retail')}, ${sqlBool(team.isActive, true)},
      ${sqlTimestamp(team.createdAt || Date.now())}, NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      team_name = EXCLUDED.team_name,
      team_type = EXCLUDED.team_type,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();`);

    // Chart of accounts for team across ALL 12 currencies
    for (const cur of SUPPORTED_CURRENCIES) {
      lines.push(`INSERT INTO accounts (
        id, account_number, account_type, name, currency, team_id
      ) VALUES (
        'ACC_TEAM_${teamCode}_${cur}', 'WLT-${teamCode}-${cur}', 'ASSET',
        'Team ${teamCode} Cash Wallet (${cur})', '${cur}', ${sqlStr(team.id)}
      ) ON CONFLICT (id) DO NOTHING;`);
    }

    // Wallets for all supported currencies
    for (const cur of SUPPORTED_CURRENCIES) {
      const bal = cur === 'INR' ? sqlNum(team.cashWallets?.INR || team.cashBalance, 10000000) : sqlNum(team.cashWallets?.[cur], 0);
      lines.push(`INSERT INTO wallets (
        id, team_id, currency, balance, reserved, created_at, updated_at
      ) VALUES (
        'WLT_${teamCode}_${cur}', ${sqlStr(team.id)}, '${cur}', ${bal}, 0, NOW(), NOW()
      ) ON CONFLICT (team_id, currency) DO UPDATE SET
        balance = EXCLUDED.balance,
        reserved = EXCLUDED.reserved,
        updated_at = NOW();`);
    }

    // Seed Double-Entry Capital Journal Entry (Debit Team INR Asset, Credit System Equity)
    const inrBalance = sqlNum(team.cashWallets?.INR || team.cashBalance, 10000000);
    lines.push(`INSERT INTO journal_entries (
      id, entry_type, description, created_at
    ) VALUES (
      'JE_SEED_${teamCode}', 'CAPITAL_SEED',
      'Initial capital allotment of ₹10,000,000 for Team ${teamCode}', NOW()
    ) ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO ledger_lines (
      id, journal_entry_id, account_id, debit, credit, currency, created_at
    ) VALUES
      ('LL_SEED_${teamCode}_DR', 'JE_SEED_${teamCode}', 'ACC_TEAM_${teamCode}_INR', ${inrBalance}, 0, 'INR', NOW()),
      ('LL_SEED_${teamCode}_CR', 'JE_SEED_${teamCode}', 'ACC_SYS_EQUITY_SEED', 0, ${inrBalance}, 'INR', NOW())
    ON CONFLICT (id) DO NOTHING;`);

    // Holdings if any exist
    const teamHoldings = team.holdings || {};
    for (const [ticker, h] of Object.entries(teamHoldings)) {
      const units = typeof h === 'number' ? h : h.units || 0;
      const locked = typeof h === 'object' ? h.lockedUnits || 0 : 0;
      const avgPrice = typeof h === 'object' ? h.averageBuyPrice || 0 : 0;
      const invested = typeof h === 'object' ? h.totalInvested || (units * avgPrice) : 0;
      if (units > 0) {
        lines.push(`INSERT INTO holdings (
          id, team_id, ticker, units, locked_units, average_buy_price, total_invested, created_at, updated_at
        ) VALUES (
          'HLD_${teamCode}_${ticker}', ${sqlStr(team.id)}, ${sqlStr(ticker)},
          ${sqlInt(units)}, ${sqlInt(locked)}, ${sqlNum(avgPrice)}, ${sqlNum(invested)}, NOW(), NOW()
        ) ON CONFLICT (team_id, ticker) DO UPDATE SET
          units = EXCLUDED.units,
          locked_units = EXCLUDED.locked_units,
          average_buy_price = EXCLUDED.average_buy_price,
          total_invested = EXCLUDED.total_invested,
          updated_at = NOW();`);
      }
    }

    // IPO Reservations if any exist
    if (team.ipoReservations && typeof team.ipoReservations === 'object') {
      for (const [ticker, amt] of Object.entries(team.ipoReservations)) {
        const numAmt = Number(amt);
        if (numAmt > 0) {
          const ipoId = `IPO_RES_${teamCode}_${ticker}`;
          lines.push(`INSERT INTO ipo_reservations (
            id, team_id, ticker, amount, quantity, status, created_at, updated_at
          ) VALUES (
            ${sqlStr(ipoId)}, ${sqlStr(team.id)}, ${sqlStr(ticker)},
            ${numAmt}, 1, 'RESERVED', NOW(), NOW()
          ) ON CONFLICT (team_id, ticker) DO UPDATE SET
            amount = EXCLUDED.amount,
            updated_at = NOW();`);
        }
      }
    }
  }
  lines.push('');

  // 18. FX TRANSACTIONS & JOURNAL BALANCING
  console.log('Seeding FX Transactions & Balanced Multi-Currency Journal...');
  lines.push('-- 18. FX TRANSACTIONS');
  const fxTxs = state.fxTransactions || [];
  for (const fx of fxTxs) {
    lines.push(`INSERT INTO fx_transactions (
      id, ticket_number, team_code, from_currency, to_currency,
      from_amount, to_amount, rate, operator, timestamp, created_at
    ) VALUES (
      ${sqlStr(fx.id)}, ${sqlStr(fx.ticketNumber)}, ${sqlStr(fx.teamCode)},
      ${sqlStr(fx.fromCurrency)}, ${sqlStr(fx.toCurrency)},
      ${sqlNum(fx.debited)}, ${sqlNum(fx.credited)}, ${sqlNum(fx.rate)},
      ${sqlStr(fx.operator)}, ${sqlTimestamp(fx.timestamp)}, NOW()
    ) ON CONFLICT (id) DO NOTHING;`);

    // Double-entry balancing for FX transaction
    const jeId = `JE_FX_${fx.id}`;
    lines.push(`INSERT INTO journal_entries (id, entry_type, description, created_at)
    VALUES (${sqlStr(jeId)}, 'FX_EXCHANGE', 'Currency exchange of ${fx.debited} ${fx.fromCurrency} to ${fx.credited} ${fx.toCurrency}', NOW())
    ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO ledger_lines (id, journal_entry_id, account_id, debit, credit, currency, created_at) VALUES
      ('LL_FX_${fx.id}_DR_IN', ${sqlStr(jeId)}, 'ACC_SYS_CLEARING_FX_${fx.fromCurrency}', ${sqlNum(fx.debited)}, 0, ${sqlStr(fx.fromCurrency)}, NOW()),
      ('LL_FX_${fx.id}_CR_IN', ${sqlStr(jeId)}, 'ACC_TEAM_${fx.teamCode}_${fx.fromCurrency}', 0, ${sqlNum(fx.debited)}, ${sqlStr(fx.fromCurrency)}, NOW()),
      ('LL_FX_${fx.id}_DR_OUT', ${sqlStr(jeId)}, 'ACC_TEAM_${fx.teamCode}_${fx.toCurrency}', ${sqlNum(fx.credited)}, 0, ${sqlStr(fx.toCurrency)}, NOW()),
      ('LL_FX_${fx.id}_CR_OUT', ${sqlStr(jeId)}, 'ACC_SYS_CLEARING_FX_${fx.toCurrency}', 0, ${sqlNum(fx.credited)}, ${sqlStr(fx.toCurrency)}, NOW())
    ON CONFLICT (id) DO NOTHING;\n`);
  }

  // 19. ORDERS & EXECUTIONS
  console.log('Seeding Orders & Executions...');
  lines.push('-- 19. ORDERS & EXECUTIONS');
  const orders = state.orders || [];
  for (const o of orders) {
    const teamId = o.teamCode; // T01 is both teamCode and id
    lines.push(`INSERT INTO orders (
      id, ticket_number, idempotency_key, team_id, event_id, ticker, security_name,
      action, order_type, quantity, limit_price, requested_value, broker_id,
      status, workflow_stage, verification_status, exchange_status, final_status,
      physical_slip_checked, desk_id, operator, verified_by, verified_at,
      returned_at, return_reason, rejection_reason, notes, status_history,
      submitted_at, created_at, updated_at
    ) VALUES (
      ${sqlStr(o.id)}, ${sqlStr(o.ticketNumber)}, ${sqlStr(o.idempotencyKey || `IDEMP_${o.id}`)},
      ${sqlStr(teamId)}, ${sqlStr(o.eventId || 'EVT_LIVE_MAIN')}, ${sqlStr(o.ticker)},
      ${sqlStr(o.securityName)}, ${sqlStr(o.action)}, ${sqlStr(o.orderType || 'MARKET')},
      ${sqlInt(o.quantity, 1)}, ${sqlNum(o.limitPrice, null)}, ${sqlNum(o.requestedValue, 0)},
      ${sqlStr(o.brokerId)}, ${sqlStr(o.status)}, ${sqlStr(o.workflowStage || o.status)},
      ${sqlStr(o.verificationStatus)}, ${sqlStr(o.exchangeStatus)}, ${sqlStr(o.finalStatus)},
      ${sqlBool(o.physicalSlipChecked, false)}, ${sqlStr(o.deskId)}, ${sqlStr(o.operator)},
      ${sqlStr(o.verifiedBy)}, ${sqlTimestamp(o.verifiedAt)}, ${sqlTimestamp(o.returnedAt)},
      ${sqlStr(o.returnReason)}, ${sqlStr(o.rejectionReason)}, ${sqlStr(o.notes)},
      ${sqlJson(o.statusHistory, '[]')}, ${sqlTimestamp(o.submittedAt || o.timestamp || Date.now())},
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      workflow_stage = EXCLUDED.workflow_stage,
      verification_status = EXCLUDED.verification_status,
      exchange_status = EXCLUDED.exchange_status,
      final_status = EXCLUDED.final_status,
      updated_at = NOW();`);

    // Executed order: seed execution row
    if (o.status === 'EXECUTED' && o.executionPrice) {
      const execId = `EXEC_${o.id}`;
      lines.push(`INSERT INTO executions (
        id, order_id, price, quantity, execution_value,
        executed_by_desk, executed_by_operator, executed_at, created_at
      ) VALUES (
        ${sqlStr(execId)}, ${sqlStr(o.id)}, ${sqlNum(o.executionPrice)},
        ${sqlInt(o.executionQuantity || o.quantity)}, ${sqlNum(o.executionValue || (o.quantity * o.executionPrice))},
        ${sqlStr(o.executedByDesk || o.deskId)}, ${sqlStr(o.executedByOperator || o.operator)},
        ${sqlTimestamp(o.executedAt || o.timestamp)}, NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        price = EXCLUDED.price,
        quantity = EXCLUDED.quantity,
        execution_value = EXCLUDED.execution_value;`);
    }
  }
  lines.push('');

  // 20. SETTLEMENT VOUCHERS
  const settlements = state.settlements || [];
  if (settlements.length > 0) {
    console.log(`Seeding Bank Settlement Vouchers (${settlements.length} vouchers)...`);
    lines.push('-- 20. SETTLEMENT VOUCHERS');
    for (const sv of settlements) {
      lines.push(`INSERT INTO settlement_vouchers (
        id, voucher_ref, order_id, team_id, ticker, action, amount, currency, status,
        teller_operator, rejection_reason, settled_at, created_at, updated_at
      ) VALUES (
        ${sqlStr(sv.id)}, ${sqlStr(sv.voucherReference || sv.id)}, ${sqlStr(sv.orderId)},
        ${sqlStr(sv.teamId || sv.teamCode)}, ${sqlStr(sv.ticker)}, ${sqlStr(sv.action)},
        ${sqlNum(sv.totalAmount || sv.amount, 0)}, ${sqlStr(sv.currency || 'INR')},
        ${sqlStr(sv.status || 'PENDING')}, ${sqlStr(sv.settledBy)}, ${sqlStr(sv.rejectionReason)},
        ${sqlTimestamp(sv.settledAt)}, ${sqlTimestamp(sv.createdAt || Date.now())}, NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        settled_at = EXCLUDED.settled_at,
        rejection_reason = EXCLUDED.rejection_reason,
        updated_at = NOW();`);
    }
    lines.push('');
  }

  lines.push('COMMIT;\n');

  // WRITE SQL SCRIPT
  const finalSql = lines.join('\n');
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, finalSql, 'utf8');

  console.log(`\n======================================================================`);
  console.log(`✅ Deterministic PostgreSQL Seed File Generated Successfully!`);
  console.log(`Output Path:   ${OUTPUT_FILE}`);
  console.log(`Total Bytes:   ${Buffer.byteLength(finalSql, 'utf8')} bytes`);
  console.log(`Total Lines:   ${lines.length} SQL lines`);
  console.log(`Securities:    ${state.securities.length} records`);
  console.log(`Teams:         ${state.teams.length} teams`);
  console.log(`Personnel:     ${state.personnel.length} personnel accounts`);
  console.log(`News Events:   ${state.newsEvents.length} events`);
  console.log(`Market Orders: ${state.orders.length} orders`);
  console.log(`FX History:    ${state.fxTransactions.length} transaction`);
  console.log(`======================================================================\n`);

  return {
    success: true,
    outputFile: OUTPUT_FILE,
    lineCount: lines.length,
    securitiesCount: state.securities.length,
    teamsCount: state.teams.length
  };
}

// Direct CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    migrateStateToPg();
  } catch (err) {
    console.error('Fatal Migration Error:', err.message);
    process.exit(1);
  }
}
