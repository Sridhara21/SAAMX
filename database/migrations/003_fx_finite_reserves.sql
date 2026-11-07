-- ==============================================================================
-- Migration: 003_fx_finite_reserves.sql
-- Description: Finite FX Reserves Accounting Model, Solvency Constraints,
--              Queue Inventory Reservation, and Double-Entry Desk Balances.
-- Target Engine: PostgreSQL 15 / Supabase PostgreSQL 17
-- ==============================================================================

-- 1. Create fx_reserves table with generated solvency invariants and strict non-negativity checks
CREATE TABLE IF NOT EXISTS fx_reserves (
    currency VARCHAR(10) PRIMARY KEY,
    opening_reserve NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (opening_reserve >= 0),
    replenishments NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (replenishments >= 0),
    completed_purchases NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (completed_purchases >= 0),
    completed_sales NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (completed_sales >= 0),
    reserved_inventory NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (reserved_inventory >= 0),
    available_reserve NUMERIC(24, 4) GENERATED ALWAYS AS (
        (opening_reserve + replenishments + completed_purchases - completed_sales) - reserved_inventory
    ) STORED,
    current_inventory NUMERIC(24, 4) GENERATED ALWAYS AS (
        opening_reserve + replenishments + completed_purchases - completed_sales
    ) STORED,
    desk_inr_cash NUMERIC(24, 4) NOT NULL DEFAULT 0 CHECK (desk_inr_cash >= 0),
    min_reserve_threshold NUMERIC(24, 4) NOT NULL DEFAULT 0,
    max_capacity NUMERIC(24, 4) NOT NULL DEFAULT 100000000000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fx_reserves_solvency CHECK (
        (opening_reserve + replenishments + completed_purchases - completed_sales) >= reserved_inventory
    )
);

-- 2. Seed initial finite reserves for the 9 foreign reference currencies
-- Opening pool sizes scaled to institutional trading simulation capacity
INSERT INTO fx_reserves (
    currency, opening_reserve, replenishments, completed_purchases, completed_sales,
    reserved_inventory, desk_inr_cash, min_reserve_threshold, max_capacity, updated_at
)
VALUES
    ('USD', 10000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 1000000.0000, 1000000000.0000, NOW()),
    ('EUR',  9000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000,  900000.0000, 1000000000.0000, NOW()),
    ('GBP',  8000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000,  800000.0000, 1000000000.0000, NOW()),
    ('JPY', 1500000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 150000000.0000, 100000000000.0000, NOW()),
    ('AED', 36000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 3600000.0000, 1000000000.0000, NOW()),
    ('SGD', 13000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 1300000.0000, 1000000000.0000, NOW()),
    ('CNY', 70000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 7000000.0000, 1000000000.0000, NOW()),
    ('AUD', 15000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 1500000.0000, 1000000000.0000, NOW()),
    ('KRW', 13000000000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 5000000000.0000, 1300000000.0000, 100000000000.0000, NOW())
ON CONFLICT (currency) DO NOTHING;

-- 3. Ensure fx_queue table exists with necessary status checks and indexing
CREATE TABLE IF NOT EXISTS fx_queue (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE,
    team_code VARCHAR(32) NOT NULL,
    team_name VARCHAR(128),
    event_id VARCHAR(64) NOT NULL DEFAULT 'EVT_LIVE_MAIN',
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    from_amount NUMERIC(24, 4) NOT NULL CHECK (from_amount > 0),
    to_amount NUMERIC(24, 4) NOT NULL CHECK (to_amount > 0),
    quote_rate NUMERIC(18, 6) NOT NULL,
    spread_percent NUMERIC(8, 4) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (
        status IN ('QUEUED', 'RATE_CHECK', 'PROCESSING', 'SETTLED', 'REJECTED', 'CANCELLED')
    ),
    operator_id VARCHAR(64),
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ,
    rate_checked_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fx_queue_team_code ON fx_queue(team_code);
CREATE INDEX IF NOT EXISTS idx_fx_queue_status ON fx_queue(status);
CREATE INDEX IF NOT EXISTS idx_fx_queue_created_at ON fx_queue(created_at);

-- 4. Ensure fx_transactions table exists with ticket uniqueness and audit columns
CREATE TABLE IF NOT EXISTS fx_transactions (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(64) UNIQUE NOT NULL,
    team_code VARCHAR(32) NOT NULL,
    team_id VARCHAR(32),
    team_name VARCHAR(128),
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    from_amount NUMERIC(24, 4) NOT NULL CHECK (from_amount > 0),
    to_amount NUMERIC(24, 4) NOT NULL CHECK (to_amount > 0),
    rate NUMERIC(18, 6) NOT NULL,
    spread_percent NUMERIC(8, 4) NOT NULL,
    operator_id VARCHAR(64),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_transactions_team_code ON fx_transactions(team_code);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_created_at ON fx_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_currencies ON fx_transactions(from_currency, to_currency);

-- 5. Backwards-compatible schema synchronization for existing deployments
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
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS operator_id VARCHAR(64);
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'CONFIRMED';

-- 6. Mark legacy CAD/CHF accounts as inactive if present
UPDATE accounts SET is_active = FALSE WHERE id IN (
    'ACC_SYS_CLEARING_EXCHANGE_CAD', 'ACC_SYS_CLEARING_FX_CAD',
    'ACC_SYS_CLEARING_EXCHANGE_CHF', 'ACC_SYS_CLEARING_FX_CHF'
);
