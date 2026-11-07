import React from 'react';
import { Modal, Button, Badge } from './ui/index.js';
import { IconPrinter, IconBuilding, IconCheck, IconClock } from '../lib/icons.jsx';

export default function PrintableVoucherModal({ isOpen, onClose, voucher }) {
  if (!isOpen || !voucher) return null;

  const voucherRef = voucher.voucherReference || voucher.id || 'N/A';
  const orderId = voucher.orderId || voucher.id || 'N/A';
  const ticketNumber = voucher.ticketNumber || 'N/A';
  const teamCode = voucher.teamCode || 'N/A';
  const action = voucher.action || (voucher.type === 'PAYMENT_COLLECTION' ? 'BUY' : 'SELL');
  const isBuy = action === 'BUY';
  const direction = voucher.direction || voucher.classification || (isBuy ? 'PAY_IN' : 'PAY_OUT');
  const deskId = voucher.bankDeskId || voucher.assignedDesk || 'BANK_1';
  const deskName = deskId === 'BANK_1' ? 'Bank Desk 1 (Primary Settlement)' : deskId === 'BANK_2' ? 'Bank Desk 2 (Secondary Settlement)' : deskId;
  const ticker = voucher.ticker || 'N/A';
  const secName = voucher.securityName || '';
  const quantity = voucher.quantity != null ? Number(voucher.quantity).toLocaleString() : '—';
  const price = voucher.price != null ? Number(voucher.price).toLocaleString() : '—';
  const totalAmount = voucher.totalAmount != null ? Number(voucher.totalAmount).toLocaleString() : '—';
  const currency = voucher.currency || 'INR';
  const status = voucher.status || 'PENDING';
  const executedAt = voucher.executedAt || voucher.timestamp || voucher.createdAt ? new Date(voucher.executedAt || voucher.timestamp || voucher.createdAt).toLocaleString() : new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Floor Bank Settlement Voucher"
      maxWidth="680px"
    >
      <div className="printable-voucher-container">
        {/* Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .printable-voucher-container,
            .printable-voucher-container * {
              visibility: visible !important;
            }
            .printable-voucher-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 24px !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Voucher Paper Slip */}
        <div style={{
          border: '2px dashed var(--color-border, #CBD5E1)',
          borderRadius: '10px',
          padding: '24px',
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text-primary, #0F172A)',
          fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
          position: 'relative'
        }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-border, #E2E8F0)', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary, #3B82F6)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <IconBuilding size={16} />
                <span>SAAMX Central Clearing &amp; Settlement System</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0 0', letterSpacing: '-0.02em', color: 'var(--color-text-primary, #0F172A)' }}>
                OFFICIAL FLOOR SETTLEMENT VOUCHER
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                backgroundColor: direction === 'PAY_IN' ? '#DCFCE7' : '#DBEAFE',
                color: direction === 'PAY_IN' ? '#166534' : '#1E40AF',
                border: `1px solid ${direction === 'PAY_IN' ? '#86EFAC' : '#93C5FD'}`
              }}>
                {direction === 'PAY_IN' ? '📥 PAY-IN (CASH COLLECTION)' : '📤 PAY-OUT (PROCEEDS DISBURSEMENT)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #64748B)', marginTop: '4px' }}>
                Status: <strong>{status}</strong>
              </div>
            </div>
          </div>

          {/* Reference Numbers Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            backgroundColor: 'var(--color-surface-subtle, #F8FAFC)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--color-border, #E2E8F0)',
            marginBottom: '18px'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 700 }}>
                Voucher Reference
              </div>
              <div className="font-mono tabular-nums" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-primary, #3B82F6)' }}>
                {voucherRef}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 700 }}>
                Floor Slip / Ticket #
              </div>
              <div className="font-mono tabular-nums" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-primary, #0F172A)' }}>
                #{ticketNumber}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 700 }}>
                Assigned Desk
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#D97706' }}>
                {deskName}
              </div>
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Investment House</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text-primary, #0F172A)' }}>Team {teamCode}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Instrument</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary, #3B82F6)' }}>{ticker}</span>
                {secName && <span style={{ color: 'var(--color-text-secondary, #64748B)', marginLeft: '6px', fontSize: '0.82rem' }}>({secName})</span>}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Execution Timestamp</span>
                <span className="font-mono tabular-nums" style={{ fontSize: '0.82rem' }}>{executedAt}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Side &amp; Volume</span>
                <span style={{ fontWeight: 800, color: isBuy ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)' }}>
                  {action} {quantity} units
                </span>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.82rem', marginLeft: '6px' }}>@ {price} {currency}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  {direction === 'PAY_IN' ? 'Cash Due to Bank Desk' : 'Cash Payable to Team'}
                </span>
                <span className="font-mono tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 900, color: direction === 'PAY_IN' ? 'var(--color-fall, #EF4444)' : 'var(--color-rise, #10B981)' }}>
                  {totalAmount} {currency}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Linked Order ID</span>
                <span className="font-mono tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary, #64748B)' }}>{orderId}</span>
              </div>
            </div>
          </div>

          {/* Verification & Signature Section */}
          <div style={{
            borderTop: '1px solid var(--color-border, #E2E8F0)',
            paddingTop: '16px',
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }}>
            <div>
              <div style={{ height: '36px', borderBottom: '1px solid var(--color-border, #CBD5E1)', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 700 }}>
                Floor Desk Operator Signature
              </div>
            </div>
            <div>
              <div style={{ height: '36px', borderBottom: '1px solid var(--color-border, #CBD5E1)', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 700 }}>
                Bank Desk Teller Signature &amp; Stamp
              </div>
            </div>
          </div>

          {/* Security Monospace Footer */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.68rem', color: 'var(--color-text-muted, #94A3B8)', letterSpacing: '0.1em' }} className="font-mono">
            ★ SAAMX ATOMIC CLEARING ENGINE • SECURE SETTLEMENT MANIFEST • DO NOT DESTROY ★
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
          >
            <IconPrinter size={16} />
            <span>Print Physical Voucher</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
