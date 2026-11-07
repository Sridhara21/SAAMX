-- ==============================================================================
-- Migration: 001_phase6_order_lifecycle_and_idempotency.sql
-- Description: Enforce market order lifecycle status constraints, execution columns,
--              and idempotency indexing for SAAMX Phase 6.
-- ==============================================================================

-- 1. Update orders.status check constraint to support complete verification and settlement workflow stages
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
    status IN (
        'PENDING',
        'VERIFYING',
        'BEING_VERIFIED',
        'VERIFIED_AWAITING_EXCHANGE',
        'UNDER_EXCHANGE_REVIEW',
        'RETURNED_FOR_CORRECTION',
        'VALIDATED',
        'EXECUTING',
        'EXECUTED',
        'EXECUTED_PENDING_SETTLEMENT',
        'SETTLED',
        'SETTLEMENT_REJECTED',
        'REJECTED',
        'CANCELLED',
        'RETURNED'
    )
);

-- 2. Add execution detail columns to orders if not already present
ALTER TABLE orders ADD COLUMN IF NOT EXISTS execution_quantity BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS execution_price NUMERIC(18, 4);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS execution_value NUMERIC(24, 4);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

-- 3. Add critical indexes for query performance under concurrent order intake
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_holdings_team_ticker ON holdings(team_id, ticker);
CREATE INDEX IF NOT EXISTS idx_wallets_team_currency ON wallets(team_id, currency);

-- 4. Ensure audit_logs actor is nullable with default SYSTEM
ALTER TABLE audit_logs ALTER COLUMN actor DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN actor SET DEFAULT 'SYSTEM';

