import React, { useState } from 'react';
import { SaamxLogo } from './ui/index.js';
import { IconCheck, IconX } from '../lib/icons.jsx';

function IconCopy({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Universal Digital Form Renderer for SAAMX
 * Faithfully mirrors the 4 physical forms:
 * 1. Trade Order Slip (TOS)
 * 2. Bank Pay-In / Pay-Out Slip (PIS/POS)
 * 3. Forex Conversion Form (FCF)
 * 4. IPO Application Form (IPO)
 */

export function DigitalTradeOrderSlip({ order, onClose, showHeaderClose = true }) {
  const [copiedField, setCopiedField] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!order) return null;

  const tosNo = order.ticketNumber || order.tosNumber || order.id || 'TOS-PENDING';
  const teamCode = order.teamCode || order.teamId || 'T01';
  const teamName = order.teamName || order.investmentHouse || `Investment House ${teamCode}`;
  const representative = order.enteredBy || order.representative || `Representative (${teamCode})`;
  const secCode = order.ticker || order.securityCode || 'SEC';
  const secName = order.securityName || order.name || secCode;
  const side = (order.action || order.side || 'BUY').toUpperCase();
  const quantity = Number(order.quantity || 0).toLocaleString();
  const unitPrice = order.price || order.unitPrice || order.limitPrice || order.currentPrice || 'MARKET';
  const currency = order.currency || 'INR';
  const estValue = (order.requestedValue || order.estimatedValue || order.totalValue || (Number(order.quantity || 0) * Number(order.price || 0))) || 0;
  const estValueFormatted = typeof estValue === 'number' ? estValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : estValue;
  const dateTime = order.submittedAt || order.timestamp || order.createdAt ? new Date(order.submittedAt || order.timestamp || order.createdAt).toLocaleString() : new Date().toLocaleString();

  const copyText = (label, val) => {
    navigator.clipboard.writeText(String(val));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullForm = () => {
    const text = [
      `SAAMX // Trade Order Slip (TOS)`,
      `TOS No: ${tosNo}`,
      `Investment House (Team Name & ID): ${teamName} (${teamCode})`,
      `Representative: ${representative}`,
      `Security Code: ${secCode}`,
      `Security Name: ${secName}`,
      `Side: ${side}`,
      `Quantity (Units): ${quantity}`,
      `Unit Price: ${unitPrice}`,
      `Trading Currency: ${currency}`,
      `Est. Value (Qty x Price): ${currency} ${estValueFormatted}`,
      `Date & Time: ${dateTime}`,
      `Assigned Desk: ${order.deskId || 'DESK_1'}`
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div style={containerStyle}>
      {/* Physical Form Visual Frame */}
      <div style={slipCardStyle}>
        {/* Top Header Logos */}
        <div style={headerRowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/gatik-logo.png"
              alt="Gatik Junior College"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>
              Student Academic Asset Market eXchange
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img
              src="/cadfem-partner-logo.png"
              alt="Industry Partner CADFEM"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Title & TOS No */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '14px 0 10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#FF6800', fontWeight: 900, fontSize: '1.25rem' }}>//</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0B192C', margin: 0 }}>Trade Order Slip</h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Submit to the Exchange Desk
            </div>
          </div>

          {/* TOS Number pill box */}
          <div style={{ border: '2px solid #0B192C', borderRadius: '10px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0B192C' }}>TOS No.</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.98rem', color: '#2563EB' }}>
              {tosNo}
            </span>
            <button
              type="button"
              onClick={() => copyText('TOS No', tosNo)}
              style={copyMiniBtn}
              title="Copy TOS Number"
            >
              {copiedField === 'TOS No' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        {/* Particulars Banner */}
        <div style={particularsBannerStyle}>PARTICULARS</div>

        {/* Field Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>INVESTMENT HOUSE (TEAM NAME &amp; ID)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={valStyle}>{teamName} ({teamCode})</div>
              <button type="button" onClick={() => copyText('Team', `${teamName} (${teamCode})`)} style={copyMiniBtn}>
                {copiedField === 'Team' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>REPRESENTATIVE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={valStyle}>{representative}</div>
              <button type="button" onClick={() => copyText('Rep', representative)} style={copyMiniBtn}>
                {copiedField === 'Rep' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>SECURITY CODE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900, color: '#0B192C' }}>{secCode}</div>
              <button type="button" onClick={() => copyText('Security Code', secCode)} style={copyMiniBtn}>
                {copiedField === 'Security Code' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>SECURITY NAME</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={valStyle}>{secName}</div>
              <button type="button" onClick={() => copyText('Security Name', secName)} style={copyMiniBtn}>
                {copiedField === 'Security Name' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>SIDE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 900,
                fontSize: '0.88rem',
                color: side === 'BUY' ? '#10B981' : '#94A3B8',
                backgroundColor: side === 'BUY' ? '#ECFDF5' : 'transparent',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {side === 'BUY' ? '☑' : '☐'} BUY ▲
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 900,
                fontSize: '0.88rem',
                color: side === 'SELL' ? '#EF4444' : '#94A3B8',
                backgroundColor: side === 'SELL' ? '#FEF2F2' : 'transparent',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {side === 'SELL' ? '☑' : '☐'} SELL ▼
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.3fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>QUANTITY (UNITS)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900 }}>{quantity}</div>
              <button type="button" onClick={() => copyText('Quantity', quantity)} style={copyMiniBtn}>
                {copiedField === 'Quantity' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>UNIT PRICE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace' }}>{unitPrice}</div>
              <button type="button" onClick={() => copyText('Unit Price', unitPrice)} style={copyMiniBtn}>
                {copiedField === 'Unit Price' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TRADING CURRENCY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontWeight: 900, color: '#2563EB' }}>{currency}</div>
              <button type="button" onClick={() => copyText('Currency', currency)} style={copyMiniBtn}>
                {copiedField === 'Currency' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={{ ...fieldBlockStyle, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div style={{ ...labelStyle, color: '#1E40AF' }}>EST. VALUE (QTY × PRICE)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900, color: '#1E3A8A' }}>
                {currency} {estValueFormatted}
              </div>
              <button type="button" onClick={() => copyText('Est Value', `${currency} ${estValueFormatted}`)} style={copyMiniBtn}>
                {copiedField === 'Est Value' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TEAM REPRESENTATIVE</div>
            <div style={valStyle}>{representative}</div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>DATE &amp; TIME</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>{dateTime}</div>
          </div>
        </div>

        {/* Bottom Tagline & Copies */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Experience the market, don&apos;t just plan it.</span>
          <div style={{ display: 'flex', gap: '14px', fontWeight: 700 }}>
            <span>Copy: ☑ Team</span>
            <span>☑ Desk ({order.deskId || 'DESK_1'})</span>
          </div>
        </div>
      </div>

      {/* Action Footer: Copy Complete Form details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={copyFullForm}
          style={copyFullBtnStyle}
        >
          {copiedAll ? (
            <>
              <IconCheck size={16} color="#FFFFFF" />
              <span>✓ FORM DETAILS COPIED TO CLIPBOARD</span>
            </>
          ) : (
            <>
              <IconCopy size={16} />
              <span>COPY COMPLETE FORM DETAILS</span>
            </>
          )}
        </button>

        {onClose && showHeaderClose && (
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            Close Digital Form
          </button>
        )}
      </div>
    </div>
  );
}

export function DigitalBankSlip({ voucher, onClose, showHeaderClose = true }) {
  const [copiedField, setCopiedField] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!voucher) return null;

  const pisPosNo = voucher.voucherReference || voucher.id || voucher.settlementId || 'PIS-PENDING';
  const linkedTosNo = voucher.ticketNumber || voucher.orderId || 'TOS-LINKED';
  const teamCode = voucher.teamCode || 'T01';
  const teamName = voucher.teamName || `Investment House ${teamCode}`;
  const currency = voucher.currency || 'INR';
  const isBuy = (voucher.action === 'BUY' || voucher.type === 'PAYMENT_COLLECTION' || voucher.direction === 'PAY_IN');
  const slipType = isBuy ? 'BUY / Pay-In ↓' : 'SELL / Pay-Out ↑';
  const secTicker = voucher.ticker || voucher.securityCode || 'SEC';
  const secQty = voucher.quantity != null ? Number(voucher.quantity).toLocaleString() : '—';
  const execPrice = voucher.price != null ? Number(voucher.price).toLocaleString() : '—';
  const grossAmount = voucher.grossAmount || voucher.totalAmount || voucher.requestedValue || 0;
  const grossFormatted = typeof grossAmount === 'number' ? grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : grossAmount;
  const txCost = voucher.transactionCost != null ? Number(voucher.transactionCost).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
  const netAmount = voucher.netAmount || voucher.totalAmount || grossAmount;
  const netFormatted = typeof netAmount === 'number' ? netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : netAmount;
  const accountAction = isBuy ? `DEBIT: Cash Wallet (${currency})` : `CREDIT: Cash Wallet (${currency})`;
  const representative = voucher.operator || voucher.enteredBy || `Representative (${teamCode})`;
  const dateTime = voucher.executedAt || voucher.timestamp || voucher.createdAt ? new Date(voucher.executedAt || voucher.timestamp || voucher.createdAt).toLocaleString() : new Date().toLocaleString();
  const effectiveBankDesk = voucher.bankDeskId || (teamCode ? `BANK_${(((parseInt(String(teamCode).replace(/\D/g, '') || 1) - 1) % 4) + 1)}` : 'BANK_1');

  const copyText = (label, val) => {
    navigator.clipboard.writeText(String(val));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullForm = () => {
    const text = [
      `SAAMX // Bank Pay-In / Pay-Out Slip (PIS/POS)`,
      `PIS/POS No: ${pisPosNo}`,
      `Investment House: ${teamName} (${teamCode})`,
      `Linked TOS No: ${linkedTosNo}`,
      `Settlement Currency: ${currency}`,
      `Slip Type: ${slipType}`,
      `Security & Qty: ${secTicker} x ${secQty}`,
      `Executed Price / Unit: ${currency} ${execPrice}`,
      `Gross Amount: ${currency} ${grossFormatted}`,
      `Transaction Cost: ${currency} ${txCost}`,
      `Total Payable (BUY) / Net Receivable (SELL): ${currency} ${netFormatted}`,
      `Account: ${accountAction}`,
      `Date & Time: ${dateTime}`,
      `Bank Desk: ${effectiveBankDesk}`
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div style={containerStyle}>
      <div style={slipCardStyle}>
        <div style={headerRowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/gatik-logo.png"
              alt="Gatik Junior College"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>
              Student Academic Asset Market eXchange
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img
              src="/cadfem-partner-logo.png"
              alt="Industry Partner CADFEM"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '14px 0 10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#FF6800', fontWeight: 900, fontSize: '1.25rem' }}>//</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0B192C', margin: 0 }}>
                Bank Pay-In / Pay-Out Slip
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Pay-In for BUY orders &bull; Pay-Out for SELL orders
            </div>
          </div>

          <div style={{ border: '2px solid #0B192C', borderRadius: '10px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0B192C' }}>PIS/POS No.</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.98rem', color: '#059669' }}>
              {pisPosNo}
            </span>
            <button type="button" onClick={() => copyText('PIS/POS No', pisPosNo)} style={copyMiniBtn}>
              {copiedField === 'PIS/POS No' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={particularsBannerStyle}>PARTICULARS</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>INVESTMENT HOUSE (TEAM NAME &amp; ID)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={valStyle}>{teamName} ({teamCode})</div>
              <button type="button" onClick={() => copyText('Team', `${teamName} (${teamCode})`)} style={copyMiniBtn}>
                {copiedField === 'Team' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>LINKED TOS NO.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 800 }}>{linkedTosNo}</div>
              <button type="button" onClick={() => copyText('Linked TOS', linkedTosNo)} style={copyMiniBtn}>
                {copiedField === 'Linked TOS' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>SETTLEMENT CURRENCY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontWeight: 900, color: '#2563EB' }}>{currency}</div>
              <button type="button" onClick={() => copyText('Currency', currency)} style={copyMiniBtn}>
                {copiedField === 'Currency' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Slip Type pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '10px 0' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: isBuy ? '2px solid #10B981' : '1px solid #CBD5E1',
              backgroundColor: isBuy ? '#ECFDF5' : '#F8FAFC',
              fontWeight: 900,
              fontSize: '0.85rem',
              color: isBuy ? '#065F46' : '#94A3B8'
            }}>
              {isBuy ? '●' : '○'} BUY / Pay-In ↓
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: !isBuy ? '2px solid #EF4444' : '1px solid #CBD5E1',
              backgroundColor: !isBuy ? '#FEF2F2' : '#F8FAFC',
              fontWeight: 900,
              fontSize: '0.85rem',
              color: !isBuy ? '#991B1B' : '#94A3B8'
            }}>
              {!isBuy ? '●' : '○'} SELL / Pay-Out ↑
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic' }}>
            {isBuy ? 'Authorized debit on participant wallet upon settlement' : 'For SELL: I confirm the net amount above has been credited to my team account.'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>SECURITY &amp; QUANTITY BOUGHT / SOLD</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 800 }}>{secTicker} &bull; {secQty} units</div>
              <button type="button" onClick={() => copyText('Sec & Qty', `${secTicker} x ${secQty}`)} style={copyMiniBtn}>
                {copiedField === 'Sec & Qty' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>EXECUTED PRICE / UNIT</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace' }}>{currency} {execPrice}</div>
              <button type="button" onClick={() => copyText('Exec Price', `${currency} ${execPrice}`)} style={copyMiniBtn}>
                {copiedField === 'Exec Price' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>GROSS AMOUNT</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 800 }}>{currency} {grossFormatted}</div>
              <button type="button" onClick={() => copyText('Gross', `${currency} ${grossFormatted}`)} style={copyMiniBtn}>
                {copiedField === 'Gross' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.4fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TRANSACTION COST (IF ANY)</div>
            <div style={{ ...valStyle, fontFamily: 'monospace' }}>{currency} {txCost}</div>
          </div>

          <div style={{ ...fieldBlockStyle, background: isBuy ? '#EFF6FF' : '#ECFDF5', border: `1px solid ${isBuy ? '#BFDBFE' : '#A7F3D0'}` }}>
            <div style={{ ...labelStyle, color: isBuy ? '#1E40AF' : '#065F46' }}>
              TOTAL PAYABLE (BUY) / NET RECEIVABLE (SELL)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900, color: isBuy ? '#1E3A8A' : '#047857' }}>
                {currency} {netFormatted}
              </div>
              <button type="button" onClick={() => copyText('Total Amount', `${currency} ${netFormatted}`)} style={copyMiniBtn}>
                {copiedField === 'Total Amount' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
              </button>
            </div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>ACCOUNT TO BE DEBITED (BUY) / CREDITED (SELL)</div>
            <div style={{ ...valStyle, fontSize: '0.8rem', fontWeight: 800 }}>{accountAction}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TEAM REPRESENTATIVE</div>
            <div style={valStyle}>{representative}</div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>DATE &amp; TIME</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>{dateTime}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Experience the market, don&apos;t just plan it.</span>
          <div style={{ display: 'flex', gap: '14px', fontWeight: 700 }}>
            <span>Copy: ☑ Team</span>
            <span>☑ Desk ({effectiveBankDesk.replace('BANK_', 'Bank ')})</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={copyFullForm} style={copyFullBtnStyle}>
          {copiedAll ? (
            <>
              <IconCheck size={16} color="#FFFFFF" />
              <span>✓ FORM DETAILS COPIED TO CLIPBOARD</span>
            </>
          ) : (
            <>
              <IconCopy size={16} />
              <span>COPY COMPLETE FORM DETAILS</span>
            </>
          )}
        </button>

        {onClose && showHeaderClose && (
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            Close Digital Form
          </button>
        )}
      </div>
    </div>
  );
}

export function DigitalForexSlip({ fxItem, onClose, showHeaderClose = true }) {
  const [copiedField, setCopiedField] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!fxItem) return null;

  const fcfNo = fxItem.fcfNumber || fxItem.id || 'FCF-PENDING';
  const teamCode = fxItem.teamCode || 'T01';
  const teamName = fxItem.teamName || `Investment House ${teamCode}`;
  const fromCurrency = (fxItem.fromCurrency || fxItem.currencyFrom || 'INR').toUpperCase();
  const toCurrency = (fxItem.toCurrency || fxItem.currencyTo || 'USD').toUpperCase();
  const fromAmount = Number(fxItem.fromAmount || fxItem.amount || 0).toLocaleString();
  const toAmount = Number(fxItem.toAmount || fxItem.receivedAmount || 0).toLocaleString();
  const rate = fxItem.rate || fxItem.conversionRate || fxItem.executionRate || 1;
  const representative = fxItem.representative || fxItem.operator || `Representative (${teamCode})`;
  const dateTime = fxItem.timestamp || fxItem.createdAt ? new Date(fxItem.timestamp || fxItem.createdAt).toLocaleString() : new Date().toLocaleString();

  const currencies = ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'CNY', 'AED', 'AUD', 'SGD', 'KRW'];

  const copyText = (label, val) => {
    navigator.clipboard.writeText(String(val));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullForm = () => {
    const text = [
      `SAAMX // Forex Conversion Form (FCF)`,
      `FCF No: ${fcfNo}`,
      `Investment House: ${teamName} (${teamCode})`,
      `Currency to Sell (From): ${fromCurrency}`,
      `Amount to Sell: ${fromAmount} ${fromCurrency}`,
      `Conversion Rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`,
      `Currency to Buy (To): ${toCurrency}`,
      `Amount to Receive: ${toAmount} ${toCurrency}`,
      `Representative: ${representative}`,
      `Date & Time: ${dateTime}`,
      `FX Desk: ${fxItem.deskId || 'FX_1'}`
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div style={containerStyle}>
      <div style={slipCardStyle}>
        <div style={headerRowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/gatik-logo.png"
              alt="Gatik Junior College"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>
              Student Academic Asset Market eXchange
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img
              src="/cadfem-partner-logo.png"
              alt="Industry Partner CADFEM"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '14px 0 10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#FF6800', fontWeight: 900, fontSize: '1.25rem' }}>//</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0B192C', margin: 0 }}>
                Forex Conversion Form
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Submit to the Forex Desk
            </div>
          </div>

          <div style={{ border: '2px solid #0B192C', borderRadius: '10px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0B192C' }}>FCF No.</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.98rem', color: '#D97706' }}>
              {fcfNo}
            </span>
            <button type="button" onClick={() => copyText('FCF No', fcfNo)} style={copyMiniBtn}>
              {copiedField === 'FCF No' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={particularsBannerStyle}>PARTICULARS</div>

        <div style={{ marginTop: '12px', ...fieldBlockStyle }}>
          <div style={labelStyle}>INVESTMENT HOUSE (TEAM NAME &amp; ID)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={valStyle}>{teamName} ({teamCode})</div>
            <button type="button" onClick={() => copyText('Team', `${teamName} (${teamCode})`)} style={copyMiniBtn}>
              {copiedField === 'Team' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        {/* Currency selection boxes matching physical form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr', gap: '12px', marginTop: '12px' }}>
          {/* 1. Currency To Sell */}
          <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px' }}>
            <div style={{ ...labelStyle, color: '#B45309' }}>① CURRENCY TO SELL (FROM)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px' }}>
              {currencies.map(cur => (
                <span key={cur} style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: cur === fromCurrency ? '#FFFFFF' : '#64748B',
                  backgroundColor: cur === fromCurrency ? '#D97706' : '#F1F5F9',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  textAlign: 'center'
                }}>
                  {cur === fromCurrency ? '☑' : '☐'} {cur}
                </span>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontWeight: 900, fontSize: '0.95rem', color: '#0B192C' }}>
              Amount: {fromAmount} {fromCurrency}
            </div>
          </div>

          {/* Rate & Middle particulars */}
          <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={labelStyle}>CONVERSION RATE</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.98rem', color: '#2563EB', margin: '4px 0' }}>
              1 {fromCurrency} = {rate} {toCurrency}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
              Finite Central Reserve Counter
            </div>
          </div>

          {/* 2. Currency To Buy */}
          <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px' }}>
            <div style={{ ...labelStyle, color: '#047857' }}>② CURRENCY TO BUY (TO)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px' }}>
              {currencies.map(cur => (
                <span key={cur} style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: cur === toCurrency ? '#FFFFFF' : '#64748B',
                  backgroundColor: cur === toCurrency ? '#059669' : '#F1F5F9',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  textAlign: 'center'
                }}>
                  {cur === toCurrency ? '☑' : '☐'} {cur}
                </span>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontWeight: 900, fontSize: '0.95rem', color: '#047857' }}>
              Receives: {toAmount} {toCurrency}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TEAM REPRESENTATIVE</div>
            <div style={valStyle}>{representative}</div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>DATE &amp; TIME</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>{dateTime}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Experience the market, don&apos;t just plan it.</span>
          <div style={{ display: 'flex', gap: '14px', fontWeight: 700 }}>
            <span>Copy: ☑ Team</span>
            <span>☑ Desk ({fxItem.deskId || 'FX_1'})</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={copyFullForm} style={copyFullBtnStyle}>
          {copiedAll ? (
            <>
              <IconCheck size={16} color="#FFFFFF" />
              <span>✓ FORM DETAILS COPIED TO CLIPBOARD</span>
            </>
          ) : (
            <>
              <IconCopy size={16} />
              <span>COPY COMPLETE FORM DETAILS</span>
            </>
          )}
        </button>

        {onClose && showHeaderClose && (
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            Close Digital Form
          </button>
        )}
      </div>
    </div>
  );
}

export function DigitalIpoSlip({ ipoBid, onClose, showHeaderClose = true }) {
  const [copiedField, setCopiedField] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!ipoBid) return null;

  const ipoNo = ipoBid.ipoNumber || ipoBid.id || `IPO-${ipoBid.ticker}-${ipoBid.teamCode}`;
  const teamCode = ipoBid.teamCode || 'T01';
  const teamName = ipoBid.teamName || `Investment House ${teamCode}`;
  const companyName = ipoBid.companyName || ipoBid.name || ipoBid.ticker;
  const issuePrice = ipoBid.issuePrice || ipoBid.offerPrice || ipoBid.price || 100;
  const lotSize = ipoBid.lotSize || 100;
  const currency = ipoBid.currency || 'USD';
  const lotsApplied = ipoBid.lotsApplied || Math.max(1, Math.floor((ipoBid.quantity || lotSize) / lotSize));
  const totalUnits = Number(ipoBid.quantity || (lotsApplied * lotSize)).toLocaleString();
  const linkedSlipNo = ipoBid.linkedSlipNo || ipoBid.voucherReference || `PIS-${ipoNo.replace(/[^A-Za-z0-9]/g, '').slice(-6)}`;
  const amountToBlock = (ipoBid.amountToBlock || ipoBid.capitalReserved || (Number(ipoBid.quantity || 0) * Number(issuePrice))) || 0;
  const amountFormatted = typeof amountToBlock === 'number' ? amountToBlock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : amountToBlock;
  const representative = ipoBid.representative || ipoBid.enteredBy || `Representative (${teamCode})`;
  const dateTime = ipoBid.timestamp ? new Date(ipoBid.timestamp).toLocaleString() : new Date().toLocaleString();

  const copyText = (label, val) => {
    navigator.clipboard.writeText(String(val));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyFullForm = () => {
    const text = [
      `SAAMX // IPO Application Form (IPO)`,
      `IPO No: ${ipoNo}`,
      `Investment House: ${teamName} (${teamCode})`,
      `Company / IPO Name: ${companyName} (${ipoBid.ticker})`,
      `Issue Price / Band: ${currency} ${issuePrice}`,
      `Lot Size: ${lotSize}`,
      `Currency: ${currency}`,
      `Lots Applied: ${lotsApplied}`,
      `Total Units: ${totalUnits}`,
      `Linked Pay-In / Pay-Out Slip No: ${linkedSlipNo}`,
      `Amount to be Blocked: ${currency} ${amountFormatted}`,
      `Representative: ${representative}`,
      `Date & Time: ${dateTime}`
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div style={containerStyle}>
      <div style={slipCardStyle}>
        <div style={headerRowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/gatik-logo.png"
              alt="Gatik Junior College"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SaamxLogo size="sm" showSubtitle={false} />
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>
              Student Academic Asset Market eXchange
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img
              src="/cadfem-partner-logo.png"
              alt="Industry Partner CADFEM"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '14px 0 10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#FF6800', fontWeight: 900, fontSize: '1.25rem' }}>//</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0B192C', margin: 0 }}>
                IPO Application Form
              </h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Submit to the IPO Desk
            </div>
          </div>

          <div style={{ border: '2px solid #0B192C', borderRadius: '10px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}>
            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0B192C' }}>IPO No.</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.98rem', color: '#7C3AED' }}>
              {ipoNo}
            </span>
            <button type="button" onClick={() => copyText('IPO No', ipoNo)} style={copyMiniBtn}>
              {copiedField === 'IPO No' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={particularsBannerStyle}>PARTICULARS</div>

        <div style={{ marginTop: '12px', ...fieldBlockStyle }}>
          <div style={labelStyle}>INVESTMENT HOUSE (TEAM NAME &amp; ID)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={valStyle}>{teamName} ({teamCode})</div>
            <button type="button" onClick={() => copyText('Team', `${teamName} (${teamCode})`)} style={copyMiniBtn}>
              {copiedField === 'Team' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '10px', ...fieldBlockStyle, background: '#F8FAFC' }}>
          <div style={labelStyle}>COMPANY / IPO NAME</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...valStyle, fontSize: '1.05rem', fontWeight: 900 }}>{companyName} ({ipoBid.ticker})</div>
            <button type="button" onClick={() => copyText('Company', companyName)} style={copyMiniBtn}>
              {copiedField === 'Company' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>ISSUE PRICE / BAND</div>
            <div style={{ ...valStyle, fontFamily: 'monospace' }}>{currency} {issuePrice}</div>
          </div>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>LOT SIZE</div>
            <div style={{ ...valStyle, fontFamily: 'monospace' }}>{lotSize} shares</div>
          </div>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>CURRENCY</div>
            <div style={{ ...valStyle, fontWeight: 900, color: '#2563EB' }}>{currency}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr', gap: '12px', marginTop: '10px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>LOTS APPLIED</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900 }}>{lotsApplied}</div>
          </div>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TOTAL UNITS</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontWeight: 900 }}>{totalUnits}</div>
          </div>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>LINKED PAY-IN / PAY-OUT SLIP NO.</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>{linkedSlipNo}</div>
          </div>
        </div>

        {/* Amount to be blocked prominent pink/purple box matching form */}
        <div style={{ marginTop: '12px', border: '2px solid #E11D48', borderRadius: '10px', padding: '12px 16px', background: '#FFF1F2' }}>
          <div style={{ ...labelStyle, color: '#BE123C' }}>AMOUNT TO BE BLOCKED</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: '#9F1239' }}>
              {currency} {amountFormatted}
            </div>
            <button type="button" onClick={() => copyText('Blocked Amount', `${currency} ${amountFormatted}`)} style={copyMiniBtn}>
              {copiedField === 'Blocked Amount' ? <IconCheck size={12} color="#10B981" /> : <IconCopy size={12} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div style={fieldBlockStyle}>
            <div style={labelStyle}>TEAM REPRESENTATIVE</div>
            <div style={valStyle}>{representative}</div>
          </div>

          <div style={fieldBlockStyle}>
            <div style={labelStyle}>DATE &amp; TIME</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>{dateTime}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Experience the market, don&apos;t just plan it.</span>
          <div style={{ display: 'flex', gap: '14px', fontWeight: 700 }}>
            <span>Copy: ☑ Team</span>
            <span>☑ Desk (IPO Order Desk)</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={copyFullForm} style={copyFullBtnStyle}>
          {copiedAll ? (
            <>
              <IconCheck size={16} color="#FFFFFF" />
              <span>✓ FORM DETAILS COPIED TO CLIPBOARD</span>
            </>
          ) : (
            <>
              <IconCopy size={16} />
              <span>COPY COMPLETE FORM DETAILS</span>
            </>
          )}
        </button>

        {onClose && showHeaderClose && (
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            Close Digital Form
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SHARED VISUAL STYLES MATCHING PHYSICAL SAAMX FORMS
// ----------------------------------------------------
const containerStyle = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: '#0B192C'
};

const slipCardStyle = {
  backgroundColor: '#FFFFFF',
  border: '2px solid #CBD5E1',
  borderRadius: '12px',
  padding: '20px 24px',
  boxShadow: '0 8px 24px rgba(11, 25, 44, 0.08)'
};

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #E2E8F0',
  paddingBottom: '10px'
};

const particularsBannerStyle = {
  backgroundColor: '#0B192C',
  color: '#FFFFFF',
  borderRadius: '9999px',
  textAlign: 'center',
  padding: '4px 18px',
  fontSize: '0.70rem',
  fontWeight: 900,
  letterSpacing: '0.2em',
  width: 'fit-content',
  margin: '10px auto 4px auto'
};

const fieldBlockStyle = {
  borderBottom: '1px solid #E2E8F0',
  paddingBottom: '4px'
};

const labelStyle = {
  fontSize: '0.64rem',
  fontWeight: 800,
  color: '#64748B',
  letterSpacing: '0.04em',
  marginBottom: '2px'
};

const valStyle = {
  fontSize: '0.92rem',
  fontWeight: 700,
  color: '#0B192C'
};

const copyMiniBtn = {
  background: '#F1F5F9',
  border: '1px solid #CBD5E1',
  borderRadius: '4px',
  padding: '3px 6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: '6px'
};

const copyFullBtnStyle = {
  flex: 1,
  minWidth: '220px',
  padding: '12px 18px',
  backgroundColor: '#0B192C',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 800,
  fontSize: '0.88rem',
  letterSpacing: '0.02em',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 2px 8px rgba(11, 25, 44, 0.2)'
};

const closeBtnStyle = {
  padding: '12px 18px',
  backgroundColor: '#F8FAFC',
  color: '#475569',
  border: '1px solid #CBD5E1',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer'
};
