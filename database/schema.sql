-- ==============================================================================
-- SAAMX Authoritative PostgreSQL Relational DDL & Double-Entry Financial Ledger
-- Target Engine: PostgreSQL 15 / Google Cloud SQL
-- Architecture: Single Authoritative Engine with Strict ACID Invariants
-- ==============================================================================

-- 1. EXTENSIONS & UTILITIES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Automatic timestamp updater
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. CORE REGISTRY & ASSET CATALOG
-- ==============================================================================

-- Tradable Securities Universe Catalog (2,063 baseline instruments)
CREATE TABLE IF NOT EXISTS securities (
    id VARCHAR(64) PRIMARY KEY,
    ticker VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    sector VARCHAR(128),
    industry VARCHAR(128),
    offer_price NUMERIC(18, 4),
    base_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
    reference_price NUMERIC(18, 4),
    previous_close NUMERIC(18, 4),
    opening_price NUMERIC(18, 4),
    current_price NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
    day_high NUMERIC(18, 4),
    day_low NUMERIC(18, 4),
    lot_size INT DEFAULT 1 CHECK (lot_size > 0),
    total_units BIGINT NOT NULL DEFAULT 0 CHECK (total_units >= 0),
    available_units BIGINT NOT NULL DEFAULT 0 CHECK (available_units >= 0),
    available_float BIGINT DEFAULT 0,
    trading_volume BIGINT DEFAULT 0 CHECK (trading_volume >= 0),
    total_subscription NUMERIC(24, 4) DEFAULT 0,
    subscription_multiple NUMERIC(10, 4) DEFAULT 0,
    volatility NUMERIC(8, 4) DEFAULT 0.5,
    risk_rating VARCHAR(32),
    growth_rating VARCHAR(32),
    exchange VARCHAR(64),
    country VARCHAR(64),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    type VARCHAR(32) DEFAULT 'Equity',
    status VARCHAR(32) DEFAULT 'Active',
    ipo_status VARCHAR(32) DEFAULT 'LISTED',
    ipo_stage VARCHAR(32) DEFAULT 'COMPLETED',
    visible_to_participants BOOLEAN DEFAULT TRUE,
    simulation_label VARCHAR(128),
    personality TEXT,
    description TEXT,
    profile_details JSONB DEFAULT '{}'::jsonb,
    price_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_securities_ticker ON securities(ticker);
CREATE INDEX IF NOT EXISTS idx_securities_currency ON securities(currency);
CREATE INDEX IF NOT EXISTS idx_securities_status ON securities(status);

-- Participant Teams Directory (20 baseline teams: T01 - T20)
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    team_code VARCHAR(32) UNIQUE NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    team_type VARCHAR(64) DEFAULT 'Retail',
    school_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code);

-- Staff & Personnel Directory
CREATE TABLE IF NOT EXISTS personnel (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    staff_id VARCHAR(64),
    department VARCHAR(128),
    password_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_personnel_username ON personnel(username);
CREATE INDEX IF NOT EXISTS idx_personnel_role ON personnel(role);

-- PostgreSQL Server-Side Session Store
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES personnel(id) ON DELETE CASCADE,
    username VARCHAR(64),
    role VARCHAR(64) NOT NULL,
    team_code VARCHAR(32),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_sessions_team_code ON sessions(team_code);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ==============================================================================
-- 3. DOUBLE-ENTRY LEDGER & FINANCIAL INVENTORIES
-- ==============================================================================

-- General Ledger Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(64) PRIMARY KEY,
    account_number VARCHAR(64) UNIQUE NOT NULL,
    account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CLEARING')),
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_team_id ON accounts(team_id);
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

-- Team Multi-Currency Cash Wallets (Direct cash balances with strict non-negative invariants)
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    currency VARCHAR(10) NOT NULL,
    balance NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    reserved NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_currency UNIQUE (team_id, currency),
    CONSTRAINT chk_wallet_unreserved CHECK (balance >= reserved)
);

CREATE INDEX IF NOT EXISTS idx_wallets_team_id ON wallets(team_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Team Securities Inventory Holdings (Direct instrument units with strict non-negative invariants)
CREATE TABLE IF NOT EXISTS holdings (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE RESTRICT,
    units BIGINT NOT NULL DEFAULT 0 CHECK (units >= 0),
    locked_units BIGINT NOT NULL DEFAULT 0 CHECK (locked_units >= 0),
    average_buy_price NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (average_buy_price >= 0),
    total_invested NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (total_invested >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_ticker UNIQUE (team_id, ticker),
    CONSTRAINT chk_holdings_deliverable CHECK (units >= locked_units)
);

CREATE INDEX IF NOT EXISTS idx_holdings_team_id ON holdings(team_id);
CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);

-- IPO Capital Reservations (Multi-Bid Isolation per Team and Ticker)
CREATE TABLE IF NOT EXISTS ipo_reservations (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE RESTRICT,
    amount NUMERIC(24, 4) NOT NULL CHECK (amount > 0),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    status VARCHAR(32) NOT NULL CHECK (status IN ('RESERVED', 'ALLOTTED', 'REFUNDED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ipo_team_ticker UNIQUE (team_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_ipo_team_id ON ipo_reservations(team_id);
CREATE INDEX IF NOT EXISTS idx_ipo_ticker ON ipo_reservations(ticker);

-- ==============================================================================
-- 4. ORDER MANAGEMENT & SETTLEMENT PIPELINE
-- ==============================================================================

-- Trading Orders Queue
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(64) UNIQUE NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    event_id VARCHAR(64) NOT NULL,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE RESTRICT,
    security_name VARCHAR(255),
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT')),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    limit_price NUMERIC(18, 4),
    requested_value NUMERIC(24, 4),
    broker_id VARCHAR(64),
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'QUEUED', 'VERIFYING', 'BEING_VERIFIED', 'VERIFIED_AWAITING_EXCHANGE', 'UNDER_EXCHANGE_REVIEW', 'RETURNED_FOR_CORRECTION', 'VALIDATED', 'EXECUTING', 'EXECUTED', 'EXECUTED_PENDING_SETTLEMENT', 'SETTLED', 'SETTLEMENT_REJECTED', 'REJECTED', 'CANCELLED', 'RETURNED', 'VOIDED')),
    workflow_stage VARCHAR(64) NOT NULL,
    verification_status VARCHAR(32),
    exchange_status VARCHAR(32),
    final_status VARCHAR(32),
    physical_slip_checked BOOLEAN DEFAULT FALSE,
    desk_id VARCHAR(32),
    bank_desk_id VARCHAR(32),
    operator VARCHAR(128),
    verified_by VARCHAR(128),
    verified_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    return_reason TEXT,
    rejection_reason TEXT,
    notes TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_team_id ON orders(team_id);
CREATE INDEX IF NOT EXISTS idx_orders_ticker ON orders(ticker);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ticket ON orders(ticket_number);

-- Exchange Executions
CREATE TABLE IF NOT EXISTS executions (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    price NUMERIC(18, 4) NOT NULL CHECK (price > 0),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    execution_value NUMERIC(24, 4) NOT NULL CHECK (execution_value > 0),
    executed_by_desk VARCHAR(32),
    executed_by_operator VARCHAR(128),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_order_id ON executions(order_id);

-- Bank Settlement Vouchers
CREATE TABLE IF NOT EXISTS settlement_vouchers (
    id VARCHAR(64) PRIMARY KEY,
    voucher_ref VARCHAR(64) UNIQUE NOT NULL,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE RESTRICT,
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    direction VARCHAR(16) NOT NULL DEFAULT 'PAY_IN' CHECK (direction IN ('PAY_IN', 'PAY_OUT')),
    classification VARCHAR(16) NOT NULL DEFAULT 'PAY_IN' CHECK (classification IN ('PAY_IN', 'PAY_OUT')),
    bank_desk_id VARCHAR(32) NOT NULL DEFAULT 'BANK_1',
    amount NUMERIC(24, 4) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'SETTLED', 'REJECTED', 'CANCELLED', 'VOIDED', 'FAILED')),
    teller_operator VARCHAR(128),
    rejection_reason TEXT,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_order_id ON settlement_vouchers(order_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_team_id ON settlement_vouchers(team_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON settlement_vouchers(status);

-- Double-Entry Journal Entries (Header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64),
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    voucher_id VARCHAR(64) REFERENCES settlement_vouchers(id) ON DELETE SET NULL,
    entry_type VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_order_id ON journal_entries(order_id);

-- Double-Entry Ledger Lines (Detail: Sum Debits == Sum Credits per Journal Entry per Currency)
CREATE TABLE IF NOT EXISTS ledger_lines (
    id VARCHAR(64) PRIMARY KEY,
    journal_entry_id VARCHAR(64) NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_debit_xor_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_ledger_lines_entry_id ON ledger_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_account_id ON ledger_lines(account_id);

-- Trigger Function to Enforce Balanced Double-Entry Invariant (Debits == Credits per currency)
CREATE OR REPLACE FUNCTION check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_rec RECORD;
    v_entry_id VARCHAR(64);
BEGIN
    -- Determine target journal entry ID based on trigger operation
    IF TG_OP = 'DELETE' THEN
        v_entry_id := OLD.journal_entry_id;
    ELSE
        v_entry_id := NEW.journal_entry_id;
    END IF;

    -- Verify double-entry balance: SUM(debit) MUST equal SUM(credit) for every currency in the entry
    FOR v_rec IN
        SELECT currency, COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit
        FROM ledger_lines
        WHERE journal_entry_id = v_entry_id
        GROUP BY currency
    LOOP
        IF v_rec.total_debit <> v_rec.total_credit THEN
            RAISE EXCEPTION 'Double-entry ledger invariant violation in journal entry % for currency %: Debits (%) != Credits (%)',
                v_entry_id, v_rec.currency, v_rec.total_debit, v_rec.total_credit;
        END IF;
    END LOOP;

    -- If UPDATE reassigned journal_entry_id, also verify the OLD journal entry remains balanced
    IF TG_OP = 'UPDATE' AND OLD.journal_entry_id IS DISTINCT FROM NEW.journal_entry_id THEN
        FOR v_rec IN
            SELECT currency, COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit
            FROM ledger_lines
            WHERE journal_entry_id = OLD.journal_entry_id
            GROUP BY currency
        LOOP
            IF v_rec.total_debit <> v_rec.total_credit THEN
                RAISE EXCEPTION 'Double-entry ledger invariant violation in previous journal entry % for currency %: Debits (%) != Credits (%)',
                    OLD.journal_entry_id, v_rec.currency, v_rec.total_debit, v_rec.total_credit;
            END IF;
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_double_entry_balance ON ledger_lines;
CREATE CONSTRAINT TRIGGER trg_enforce_double_entry_balance
AFTER INSERT OR UPDATE OR DELETE ON ledger_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_journal_entry_balance();

-- ==============================================================================
-- 5. FOREIGN EXCHANGE (FX) & MULTI-CURRENCY
-- ==============================================================================

-- Reference FX Rates & Bid/Ask Spreads
CREATE TABLE IF NOT EXISTS fx_rates (
    pair VARCHAR(16) PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    mid_rate NUMERIC(18, 6) NOT NULL CHECK (mid_rate > 0),
    buy_rate NUMERIC(18, 6) NOT NULL CHECK (buy_rate > 0),
    sell_rate NUMERIC(18, 6) NOT NULL CHECK (sell_rate > 0),
    spread_percent NUMERIC(8, 4) NOT NULL CHECK (spread_percent >= 0),
    label VARCHAR(128),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FX Conversions History
CREATE TABLE IF NOT EXISTS fx_transactions (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(64) UNIQUE NOT NULL,
    team_code VARCHAR(32) NOT NULL REFERENCES teams(team_code) ON DELETE RESTRICT,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    from_amount NUMERIC(24, 4) NOT NULL CHECK (from_amount > 0),
    to_amount NUMERIC(24, 4) NOT NULL CHECK (to_amount > 0),
    rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
    operator VARCHAR(128),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_tx_team ON fx_transactions(team_code);

-- ==============================================================================
-- 6. MARKET OPERATIONS, CONTROLS & DESKS
-- ==============================================================================

-- Floor Risk Controls
CREATE TABLE IF NOT EXISTS risk_controls (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    circuit_breaker_threshold NUMERIC(8, 2) NOT NULL DEFAULT 30,
    price_band_percent NUMERIC(8, 2) NOT NULL DEFAULT 20,
    max_order_value NUMERIC(24, 4) NOT NULL DEFAULT 50000000,
    max_position_size_percent NUMERIC(8, 2) NOT NULL DEFAULT 35,
    concentration_warning_percent NUMERIC(8, 2) NOT NULL DEFAULT 25,
    allow_short_selling BOOLEAN NOT NULL DEFAULT FALSE,
    cash_protection_floor NUMERIC(24, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Physical Order Intake Desks
CREATE TABLE IF NOT EXISTS order_desks (
    desk_id VARCHAR(32) PRIMARY KEY,
    desk_name VARCHAR(128) NOT NULL,
    operator VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    total_processed INT DEFAULT 0 CHECK (total_processed >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Market Composite Indices
CREATE TABLE IF NOT EXISTS market_indices (
    symbol VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    current_value NUMERIC(18, 4) NOT NULL,
    opening_value NUMERIC(18, 4) NOT NULL,
    change_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Market News Events
CREATE TABLE IF NOT EXISTS news_events (
    id VARCHAR(64) PRIMARY KEY,
    headline VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_sector VARCHAR(128) NOT NULL,
    sentiment VARCHAR(32) NOT NULL,
    impact_percent NUMERIC(8, 2) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    category VARCHAR(64) DEFAULT 'General',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Championship Events
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(64) PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    venue VARCHAR(255),
    registration_open BOOLEAN DEFAULT TRUE,
    registration_close TIMESTAMPTZ,
    maximum_investment_houses INT DEFAULT 40,
    team_size INT DEFAULT 4,
    starting_capital NUMERIC(24, 4) DEFAULT 10000000,
    market_open_time VARCHAR(10) DEFAULT '09:30',
    market_close_time VARCHAR(10) DEFAULT '15:30',
    lunch_break VARCHAR(32) DEFAULT '12:00 - 13:00',
    results_time VARCHAR(10) DEFAULT '16:00',
    event_status VARCHAR(64) DEFAULT 'REGISTRATION_OPEN',
    event_mode VARCHAR(32) DEFAULT 'LIVE',
    schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Live Floor Sentiment & Debate
CREATE TABLE IF NOT EXISTS bull_bear_debates (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    active_round INT DEFAULT 1,
    current_topic TEXT,
    timer_seconds INT DEFAULT 300,
    status VARCHAR(32) DEFAULT 'IDLE',
    history JSONB DEFAULT '[]'::jsonb,
    moderator_notes TEXT,
    bull_stance VARCHAR(64),
    bull_confidence INT,
    bull_statement TEXT,
    bear_stance VARCHAR(64),
    bear_confidence INT,
    bear_statement TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Advisory Personas
CREATE TABLE IF NOT EXISTS advisors (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    coverage VARCHAR(255) NOT NULL,
    bio TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Live Market State
CREATE TABLE IF NOT EXISTS market_state (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    status VARCHAR(32) NOT NULL DEFAULT 'Closed',
    simulation_start_time TIMESTAMPTZ,
    simulation_duration_minutes INT DEFAULT 60,
    market_index INT DEFAULT 0,
    pause_time_offset BIGINT DEFAULT 0,
    paused_at TIMESTAMPTZ,
    session_state VARCHAR(64) DEFAULT 'RESULTS',
    results_lifecycle VARCHAR(64) DEFAULT 'VALUATION_FROZEN',
    reconciled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Autonomous Floor Coordinator State
CREATE TABLE IF NOT EXISTS coordinator_state (
    session_uuid VARCHAR(64) PRIMARY KEY,
    role VARCHAR(64) NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL,
    last_heartbeat TIMESTAMPTZ NOT NULL,
    current_phase VARCHAR(64) NOT NULL,
    current_title VARCHAR(255) NOT NULL,
    is_trading_permitted BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_to_next INT DEFAULT 0,
    current_time_string VARCHAR(32),
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-Only Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    actor VARCHAR(128) DEFAULT 'SYSTEM',
    role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target VARCHAR(255),
    previous_state JSONB,
    new_state JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);

-- Scoring Configuration
CREATE TABLE IF NOT EXISTS scoring_configs (
    version VARCHAR(64) PRIMARY KEY,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Event Closing Snapshots (Valuation Freeze)
CREATE TABLE IF NOT EXISTS event_closing_snapshots (
    event_id VARCHAR(64) PRIMARY KEY,
    snapshot_id VARCHAR(128) NOT NULL,
    frozen_at TIMESTAMPTZ NOT NULL,
    immutable_hash VARCHAR(128) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. DYNAMIC LEADERBOARD VIEW
-- ==============================================================================

CREATE OR REPLACE VIEW v_leaderboard AS
SELECT 
    t.team_code,
    t.team_name,
    t.team_type,
    COALESCE(w.cash_inr, 0) AS cash_inr,
    COALESCE(h.holdings_inr, 0) AS holdings_inr,
    (COALESCE(w.cash_inr, 0) + COALESCE(h.holdings_inr, 0)) AS total_equity,
    DENSE_RANK() OVER (ORDER BY (COALESCE(w.cash_inr, 0) + COALESCE(h.holdings_inr, 0)) DESC) AS rank
FROM teams t
LEFT JOIN (
    -- Sum team cash converted to INR across all wallets
    SELECT 
        w1.team_id,
        SUM(w1.balance * CASE WHEN w1.currency = 'INR' THEN 1.0 ELSE COALESCE(r.mid_rate, 1.0) END) AS cash_inr
    FROM wallets w1
    LEFT JOIN fx_rates r ON r.pair = (w1.currency || 'INR')
    GROUP BY w1.team_id
) w ON w.team_id = t.id
LEFT JOIN (
    -- Sum marked-to-market holdings converted to INR
    SELECT 
        h1.team_id,
        SUM(h1.units * s.current_price * CASE WHEN s.currency = 'INR' THEN 1.0 ELSE COALESCE(r.mid_rate, 1.0) END) AS holdings_inr
    FROM holdings h1
    JOIN securities s ON s.ticker = h1.ticker
    LEFT JOIN fx_rates r ON r.pair = (s.currency || 'INR')
    GROUP BY h1.team_id
) h ON h.team_id = t.id
WHERE t.is_active = TRUE;

-- ==============================================================================
-- 8. EXTENDED EVENT OPERATIONS, PARTICIPANTS & REGULATORY REGISTRY
-- ==============================================================================

-- Participating Schools
CREATE TABLE IF NOT EXISTS schools (
    school_id VARCHAR(64) PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    board VARCHAR(64) DEFAULT 'CBSE',
    city VARCHAR(128),
    contact_person VARCHAR(128),
    faculty_coordinator VARCHAR(128),
    registration_status VARCHAR(32) DEFAULT 'REGISTERED',
    event_id VARCHAR(64) REFERENCES events(event_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_event_id ON schools(event_id);

-- Investment Houses & Participant Groups
CREATE TABLE IF NOT EXISTS investment_houses (
    investment_house_id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(school_id) ON DELETE SET NULL,
    event_id VARCHAR(64) REFERENCES events(event_id) ON DELETE CASCADE,
    investment_house_name VARCHAR(255) NOT NULL,
    team_code VARCHAR(32) UNIQUE NOT NULL,
    team_type VARCHAR(64) DEFAULT 'Retail',
    members JSONB DEFAULT '[]'::jsonb,
    registration_status VARCHAR(32) DEFAULT 'SUBMITTED',
    verification_status VARCHAR(32) DEFAULT 'PENDING',
    active_status VARCHAR(32) DEFAULT 'INACTIVE',
    participant_lifecycle VARCHAR(64) DEFAULT 'REGISTERED',
    credentials JSONB DEFAULT '{}'::jsonb,
    assigned_desk VARCHAR(64),
    verified_by VARCHAR(128),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ih_team_code ON investment_houses(team_code);
CREATE INDEX IF NOT EXISTS idx_ih_event_id ON investment_houses(event_id);

-- Registration Applications
CREATE TABLE IF NOT EXISTS registrations (
    registration_id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES schools(school_id) ON DELETE CASCADE,
    investment_house_id VARCHAR(64) REFERENCES investment_houses(investment_house_id) ON DELETE CASCADE,
    event_id VARCHAR(64) REFERENCES events(event_id) ON DELETE CASCADE,
    status VARCHAR(32) DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(128),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);

-- Corporate Actions (Splits, Dividends, Circuit Breakers, Mergers)
CREATE TABLE IF NOT EXISTS corporate_actions (
    id VARCHAR(64) PRIMARY KEY,
    security_id VARCHAR(64) REFERENCES securities(id) ON DELETE CASCADE,
    ticker VARCHAR(32) REFERENCES securities(ticker) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,
    details TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    total_payout NUMERIC(24, 4) DEFAULT 0,
    payouts JSONB DEFAULT '[]'::jsonb,
    triggered_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_ticker ON corporate_actions(ticker);

-- Regulatory & Compliance Penalties
CREATE TABLE IF NOT EXISTS penalties (
    id VARCHAR(64) PRIMARY KEY,
    team_code VARCHAR(32) NOT NULL REFERENCES teams(team_code) ON DELETE RESTRICT,
    rule_violation VARCHAR(255) NOT NULL,
    points_deducted INT NOT NULL CHECK (points_deducted > 0 AND points_deducted <= 50),
    reason TEXT NOT NULL,
    evidence_reference TEXT,
    reviewer VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CONFIRMED', 'APPEALED', 'REVOKED')),
    appeal JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalties_team ON penalties(team_code);

-- Qualitative Judge Scorecards
CREATE TABLE IF NOT EXISTS judge_scorecards (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    team_code VARCHAR(32) NOT NULL REFERENCES teams(team_code) ON DELETE RESTRICT,
    judge_id VARCHAR(64) NOT NULL,
    judge_name VARCHAR(128) NOT NULL,
    response_to_events NUMERIC(4, 2) DEFAULT 3.0 CHECK (response_to_events >= 0 AND response_to_events <= 5),
    decision_timing NUMERIC(4, 2) DEFAULT 3.0 CHECK (decision_timing >= 0 AND decision_timing <= 5),
    adaptability NUMERIC(4, 2) DEFAULT 3.0 CHECK (adaptability >= 0 AND adaptability <= 5),
    risk_recognition NUMERIC(4, 2) DEFAULT 3.0 CHECK (risk_recognition >= 0 AND risk_recognition <= 5),
    forward_positioning NUMERIC(4, 2) DEFAULT 3.0 CHECK (forward_positioning >= 0 AND forward_positioning <= 5),
    resilience NUMERIC(4, 2) DEFAULT 3.0 CHECK (resilience >= 0 AND resilience <= 5),
    balance NUMERIC(4, 2) DEFAULT 3.0 CHECK (balance >= 0 AND balance <= 5),
    adapt_capacity NUMERIC(4, 2) DEFAULT 3.0 CHECK (adapt_capacity >= 0 AND adapt_capacity <= 5),
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_judge_team_event UNIQUE (event_id, team_code, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_scorecards_team ON judge_scorecards(team_code);

-- Broker Advisor Referrals
CREATE TABLE IF NOT EXISTS advisor_referrals (
    id VARCHAR(64) PRIMARY KEY,
    team_code VARCHAR(32) NOT NULL REFERENCES teams(team_code) ON DELETE RESTRICT,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE RESTRICT,
    security_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ANSWERED', 'REJECTED')),
    signal JSONB,
    advisor_name VARCHAR(128),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adv_referrals_team ON advisor_referrals(team_code);

-- Official Signed Published Results
CREATE TABLE IF NOT EXISTS published_results (
    event_id VARCHAR(64) PRIMARY KEY REFERENCES events(event_id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by VARCHAR(128) NOT NULL,
    rubric_version VARCHAR(64) NOT NULL,
    snapshot_id VARCHAR(128),
    snapshot_hash VARCHAR(128),
    scoring_config_version VARCHAR(64),
    leaderboard JSONB NOT NULL,
    status VARCHAR(64) DEFAULT 'OFFICIAL_FINAL_RESULTS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- End-of-Day Reconciliation Records
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    starting_capital NUMERIC(24, 4) NOT NULL DEFAULT 10000000,
    total_teams INT NOT NULL,
    leaderboard JSONB NOT NULL,
    reconciled_by VARCHAR(128) NOT NULL,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_event ON reconciliation_records(event_id);

-- Operational Mid-Session Event Snapshots
CREATE TABLE IF NOT EXISTS event_snapshots (
    snapshot_id VARCHAR(128) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    snapshot_type VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    market_state JSONB DEFAULT '{}'::jsonb,
    teams_count INT DEFAULT 0,
    orders_count INT DEFAULT 0,
    transactions_count INT DEFAULT 0,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_event ON event_snapshots(event_id);

-- Real-time Intelligence Feed
CREATE TABLE IF NOT EXISTS intelligence_feed (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) REFERENCES events(event_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    narrative TEXT NOT NULL,
    category VARCHAR(64) DEFAULT 'MARKET_OVERVIEW',
    severity VARCHAR(32) DEFAULT 'INFO',
    affected_tickers JSONB DEFAULT '[]'::jsonb,
    affected_sectors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'PUBLISHED',
    scenario_id VARCHAR(64),
    author VARCHAR(128) DEFAULT 'News Controller',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_event ON intelligence_feed(event_id);

-- Physical FX Desk Conversion Request Queue
CREATE TABLE IF NOT EXISTS fx_queue (
    id VARCHAR(64) PRIMARY KEY,
    team_code VARCHAR(32) NOT NULL REFERENCES teams(team_code) ON DELETE RESTRICT,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    from_amount NUMERIC(24, 4) NOT NULL CHECK (from_amount > 0),
    to_amount NUMERIC(24, 4) CHECK (to_amount >= 0),
    rate NUMERIC(18, 6),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')),
    operator_id VARCHAR(128),
    notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_queue_team ON fx_queue(team_code);
CREATE INDEX IF NOT EXISTS idx_fx_queue_status ON fx_queue(status);

-- Bull / Bear Floor Sentiment Signals
CREATE TABLE IF NOT EXISTS bull_bear_signals (
    stance_type VARCHAR(16) PRIMARY KEY CHECK (stance_type IN ('BULL', 'BEAR')),
    stance VARCHAR(64) NOT NULL,
    confidence INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    statement TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Broker Research Recommendations & Stock Picks
CREATE TABLE IF NOT EXISTS broker_recommendations (
    id VARCHAR(64) PRIMARY KEY,
    broker_name VARCHAR(128) NOT NULL,
    ticker VARCHAR(32) NOT NULL REFERENCES securities(ticker) ON DELETE CASCADE,
    recommendation VARCHAR(32) NOT NULL CHECK (recommendation IN ('BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL')),
    confidence INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasoning TEXT,
    risk_level VARCHAR(32) DEFAULT 'MEDIUM',
    timeframe VARCHAR(32) DEFAULT 'MEDIUM',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_rec_ticker ON broker_recommendations(ticker);

-- Live Audience Interactive Polls
CREATE TABLE IF NOT EXISTS audience_polls (
    id VARCHAR(64) PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    expires_at TIMESTAMPTZ,
    votes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
