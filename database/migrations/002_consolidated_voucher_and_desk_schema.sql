-- ==============================================================================
-- Migration: 002_consolidated_voucher_and_desk_schema.sql
-- Description: Consolidate exchange-to-bank desk voucher routing, comprehensive order
--              lifecycle statuses, and indexing for Supabase PostgreSQL 15.
-- ==============================================================================

-- 1. Enforce complete 17-state lifecycle constraint on orders table
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
    status IN (
        'PENDING',
        'QUEUED',
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
        'RETURNED',
        'VOIDED'
    )
);

-- 2. Add bank_desk_id column to orders table for station routing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bank_desk_id VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_orders_bank_desk_id ON orders(bank_desk_id);

-- 3. Ensure settlement_vouchers schema supports desk routing and voucher classifications
ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS bank_desk_id VARCHAR(32) NOT NULL DEFAULT 'BANK_1';
ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS direction VARCHAR(16) NOT NULL DEFAULT 'PAY_IN';
ALTER TABLE settlement_vouchers ADD COLUMN IF NOT EXISTS classification VARCHAR(64) NOT NULL DEFAULT 'PAY_IN';

-- 4. Update settlement_vouchers status check constraint to include all terminal & failure states
ALTER TABLE settlement_vouchers DROP CONSTRAINT IF EXISTS settlement_vouchers_status_check;
ALTER TABLE settlement_vouchers ADD CONSTRAINT settlement_vouchers_status_check CHECK (
    status IN ('PENDING', 'SETTLED', 'REJECTED', 'CANCELLED', 'VOIDED', 'FAILED')
);

-- 5. Performance indexes for concurrent teller lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_order_id ON settlement_vouchers(order_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_team_id ON settlement_vouchers(team_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_bank_desk_id ON settlement_vouchers(bank_desk_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON settlement_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_ref ON settlement_vouchers(voucher_ref);
