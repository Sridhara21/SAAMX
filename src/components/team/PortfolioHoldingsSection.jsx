import React, { useState, useMemo } from 'react';
import { useDensity } from '../../context/DensityContext.jsx';
import PaperSlipModal from './PaperSlipModal.jsx';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { CurrencyDisplay, DeltaBadge } from '../ui/FinancialFormatters.jsx';
import { EmptyState, Alert } from '../ui/States.jsx';
import {
  IconBriefcase,
  IconCurrencyExchange,
  IconBarChart,
  IconGlobe,
  IconArrowRight,
  IconSearch
} from '../../lib/icons.jsx';
import { ACTIVE_CURRENCIES, CURRENCY_DIRECTORY, CURRENCY_SYMBOLS, DEFAULT_FX_RATES } from '../../lib/formatters.js';

export default function PortfolioHoldingsSection({
  holdingsList,
  totalCashInr,
  holdingsValuation,
  totalCapital,
  realizedPnL,
  unrealizedPnL,
  roi,
  buyingPower,
  teamWallets,
  fxRates,
  team,
  onOpenProfile,
  onNavigate
}) {
  const { isCompact } = useDensity();
  const [orderModalSecurity, setOrderModalSecurity] = useState(null);
  const [sortField, setSortField] = useState('value'); // 'value', 'pnl', 'ticker', 'qty'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  const activeCurrenciesList = ACTIVE_CURRENCIES || ['INR', 'USD', 'GBP', 'EUR', 'JPY', 'AED', 'SGD', 'CNY', 'AUD', 'KRW'];

  // Map each active currency to its midRate and native/INR values
  const currencyValues = useMemo(() => {
    const values = {};
    activeCurrenciesList.forEach(cur => {
      const balance = Number(teamWallets?.[cur] || 0);
      let rate = 1.0;
      if (cur !== 'INR') {
        const pairKey = `${cur}INR`;
        rate = fxRates?.[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0;
      }
      const inrVal = balance * rate;
      values[cur] = {
        currency: cur,
        balance,
        rate,
        inrVal
      };
    });
    return values;
  }, [teamWallets, fxRates, activeCurrenciesList]);

  // Sector Diversification Breakdown
  const sectorAllocation = useMemo(() => {
    const map = {};
    (holdingsList || []).forEach(h => {
      const sec = h.sector || 'Unclassified';
      map[sec] = (map[sec] || 0) + h.inrValuation;
    });

    return Object.entries(map).map(([sec, val]) => ({
      sector: sec,
      valuation: val,
      percent: holdingsValuation > 0 ? (val / holdingsValuation) * 100 : 0
    })).sort((a, b) => b.valuation - a.valuation);
  }, [holdingsList, holdingsValuation]);

  // Currency / Country Breakdown across all 10 active reference currencies
  const currencyAllocation = useMemo(() => {
    const map = {};
    activeCurrenciesList.forEach(cur => {
      map[cur] = currencyValues[cur]?.inrVal || 0;
    });
    (holdingsList || []).forEach(h => {
      const ccy = h.currency || 'INR';
      map[ccy] = (map[ccy] || 0) + h.inrValuation;
    });

    return Object.entries(map).map(([ccy, val]) => ({
      currency: ccy,
      valuation: val,
      percent: totalCapital > 0 ? (val / totalCapital) * 100 : 0
    })).sort((a, b) => b.valuation - a.valuation);
  }, [holdingsList, currencyValues, totalCapital, activeCurrenciesList]);

  // Sorted Holdings
  const sortedHoldings = useMemo(() => {
    return [...(holdingsList || [])].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'value') {
        valA = a.inrValuation;
        valB = b.inrValuation;
      } else if (sortField === 'ticker') {
        valA = a.ticker;
        valB = b.ticker;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [holdingsList, sortField, sortDirection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Top Financial Ledger Strip (Frosted Glass Panel Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* Total Capital */}
        <Card
          style={{
            padding: '20px 22px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              TOTAL PORTFOLIO VALUE
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: roi >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: roi >= 0 ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              <span>{roi >= 0 ? '↑' : '↓'}</span>
              <span className="tabular-nums font-mono">{Math.abs(roi).toFixed(1)}%</span>
            </div>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.2 }}>
            <CurrencyDisplay value={totalCapital} currency="INR" />
          </div>
          <div style={{ marginTop: '8px' }}>
            <DeltaBadge value={roi} isPercent={true} />
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', marginLeft: '6px' }}>Overall ROI</span>
          </div>
        </Card>

        {/* Total Cash Balance */}
        <Card
          style={{
            padding: '20px 22px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              TOTAL VIRTUAL CASH
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-rise, #059669)' }}>
              LIQUID
            </span>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.2 }}>
            <CurrencyDisplay value={totalCashInr} currency="INR" />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', marginTop: '8px' }}>
            Buying Power: <strong className="tabular-nums font-mono" style={{ color: 'var(--color-navy, #0B192C)' }}>₹{buyingPower.toLocaleString('en-IN')}</strong>
          </div>
        </Card>

        {/* Current Stock Holdings Value */}
        <Card
          style={{
            padding: '20px 22px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              HOLDINGS MARKET VALUE
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 104, 0, 0.1)', color: 'var(--color-orange, #FF6800)' }}>
              EQUITIES
            </span>
          </div>
          <div className="tabular-nums font-mono" style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-navy, #0B192C)', lineHeight: 1.2 }}>
            <CurrencyDisplay value={holdingsValuation} currency="INR" />
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', marginTop: '8px', display: 'block' }}>
            {(holdingsList || []).length} Unique Equities Held
          </span>
        </Card>

        {/* Unrealized & Realized P&L */}
        <Card
          style={{
            padding: '20px 22px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              UNREALIZED P&L
            </span>
            <Badge variant={unrealizedPnL >= 0 ? 'success' : 'danger'} size="sm">
              {unrealizedPnL >= 0 ? '▲ PROFIT' : '▼ LOSS'}
            </Badge>
          </div>
          <div
            className="tabular-nums font-mono"
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: unrealizedPnL >= 0 ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)',
              lineHeight: 1.2
            }}
          >
            {unrealizedPnL >= 0 ? '+₹' : '-₹'}{Math.abs(unrealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-muted, #64748B)', marginTop: '8px' }}>
            Realized:{' '}
            <strong className="tabular-nums font-mono" style={{ color: realizedPnL >= 0 ? 'var(--color-rise, #059669)' : 'var(--color-fall, #DC2626)' }}>
              {realizedPnL >= 0 ? '+₹' : '-₹'}{Math.abs(realizedPnL).toLocaleString('en-IN')}
            </strong>
          </div>
        </Card>

      </div>

      {/* 2. Multi-Currency Wallets Breakdown Strip */}
      <Card
        style={{
          padding: '20px 24px',
          background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <strong
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-primary, #F8FAFC)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700
            }}
          >
            <IconCurrencyExchange size={16} />
            <span>Multi-Currency Cash Wallets (Spot Converted to INR)</span>
          </strong>
          <span className="tabular-nums" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted, #64748B)' }}>
            10 Active Reference Currencies &bull; Live Spot Conversion
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {activeCurrenciesList.map(cur => {
            const item = currencyValues[cur] || { balance: 0, rate: 1.0, inrVal: 0 };
            const meta = CURRENCY_DIRECTORY[cur] || { name: cur, symbol: cur, flag: '🌐' };
            const isZeroDecimal = cur === 'JPY' || cur === 'KRW';
            const formattedBalance = item.balance.toLocaleString('en-US', {
              minimumFractionDigits: isZeroDecimal ? 0 : 2,
              maximumFractionDigits: isZeroDecimal ? 0 : 2
            });

            return (
              <div
                key={cur}
                style={{
                  background: 'var(--color-surface-elevated, #0F131C)',
                  border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 800 }}>
                    {meta.flag} {cur} WALLET
                  </span>
                  {cur !== 'INR' && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #94A3B8)', fontFamily: 'var(--font-mono, monospace)' }}>
                      ₹{item.rate < 1 ? item.rate.toFixed(4) : item.rate.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary, #F8FAFC)', fontFamily: 'var(--font-mono, monospace)', margin: '4px 0' }}>
                  {meta.symbol}{formattedBalance}
                </div>
                <span className="tabular-nums" style={{ fontSize: '0.7rem', color: cur === 'INR' ? 'var(--color-text-secondary, #94A3B8)' : 'var(--color-rise, #10B981)' }}>
                  {cur === 'INR' ? '100% Native Base' : `≈ ₹${Math.round(item.inrVal).toLocaleString('en-IN')}`}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Holdings Table & Monitoring Controls */}
      <Card
        style={{
          padding: '24px',
          background: 'var(--glass-bg, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border, rgba(11, 25, 44, 0.08))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 4px 20px -2px rgba(11, 25, 44, 0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontFamily: "var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif)",
                color: 'var(--color-navy, #0B192C)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 900
              }}
            >
              <IconBriefcase size={20} color="var(--color-orange, #FF6800)" />
              <span>Active Stock Holdings & Position Monitoring</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-ink-muted, #64748B)' }}>
              Monitored in real-time. To rebalance or exit positions, prepare a Physical Order Slip for the Exchange Desk.
            </p>
          </div>

          {/* Sort Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)' }}>Sort:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                fontSize: '0.78rem',
                background: 'var(--color-surface-elevated, #0F131C)',
                color: 'var(--color-text-primary, #F8FAFC)'
              }}
            >
              <option value="value">Position Value (INR)</option>
              <option value="pnl">Unrealized P&L</option>
              <option value="ticker">Ticker</option>
              <option value="qty">Quantity</option>
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
            </Button>
          </div>
        </div>

        {sortedHoldings.length === 0 ? (
          <EmptyState
            icon={<IconBarChart size={36} />}
            title="100% Cash Allocation — No Equities Held"
            description="Your Investment House currently holds zero securities. Research candidate assets in Market Overview, evaluate advisor theses, and submit Physical Order Slips to an Exchange Desk clerk."
            action={
              <Button
                variant="primary"
                onClick={() => onNavigate('market')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Open Market Overview to Research Securities</span>
                <IconArrowRight size={16} />
              </Button>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.76rem' : '0.825rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--color-surface-elevated, #0F131C)',
                    borderBottom: '2px solid var(--color-border, rgba(255,255,255,0.1))',
                    textAlign: 'left'
                  }}
                >
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>TICKER & NAME</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>SECTOR / EXCH</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>QUANTITY</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>AVG COST</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>MARKET PRICE</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>VALUATION (INR)</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>UNREALIZED P&L</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>WEIGHT</th>
                  <th style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'center', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map(h => {
                  const isUp = h.pnl >= 0;
                  return (
                    <tr
                      key={h.ticker}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: isCompact ? '6px 10px' : '12px 14px' }}>
                        <strong
                          style={{
                            color: 'var(--color-primary, #38BDF8)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: isCompact ? '0.80rem' : '0.875rem',
                            display: 'block'
                          }}
                        >
                          {h.ticker}
                        </strong>
                        <span style={{ fontSize: isCompact ? '0.70rem' : '0.75rem', color: 'var(--color-text-secondary, #94A3B8)' }}>
                          {h.name}
                        </span>
                      </td>

                      <td style={{ padding: isCompact ? '6px 10px' : '12px 14px', color: 'var(--color-text-muted, #64748B)', fontSize: isCompact ? '0.70rem' : '0.76rem' }}>
                        {h.sector} &bull; <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{h.exchange}</span>
                      </td>

                      <td className="tabular-nums" style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                        {h.qty.toLocaleString()}
                        {h.lockedQty > 0 && (
                          <span style={{ display: 'block', fontSize: '0.70rem', color: 'var(--color-warn, #D97706)', fontWeight: 600 }}>
                            ({h.deliverableQty} free / {h.lockedQty} locked)
                          </span>
                        )}
                      </td>

                      <td className="tabular-nums" style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                        {h.curSym}{h.avgCost.toFixed(2)}
                      </td>

                      <td className="tabular-nums" style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                        {h.curSym}{h.currentPrice.toFixed(2)}
                      </td>

                      <td className="tabular-nums" style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 800 }}>
                        ₹{h.inrValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td
                        className="tabular-nums"
                        style={{
                          padding: isCompact ? '6px 10px' : '12px 14px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 800,
                          color: isUp ? 'var(--color-rise, #10B981)' : 'var(--color-fall, #EF4444)'
                        }}
                      >
                        {isUp ? '+₹' : '-₹'}{Math.abs(h.pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.7rem', display: 'block', opacity: 0.9 }}>
                          ({isUp ? '+' : ''}{h.pnlPercent.toFixed(2)}%)
                        </span>
                      </td>

                      <td className="tabular-nums" style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--color-text-secondary, #94A3B8)' }}>
                        {h.weight.toFixed(1)}%
                      </td>

                      <td style={{ padding: isCompact ? '6px 10px' : '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setOrderModalSecurity({
                              ticker: h.ticker,
                              name: h.name,
                              exchange: h.exchange,
                              currency: h.currency,
                              currentPrice: h.currentPrice,
                              basePrice: h.avgCost
                            })}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              borderColor: 'var(--color-fall, #EF4444)',
                              color: 'var(--color-fall, #EF4444)',
                              fontWeight: 800,
                              padding: isCompact ? '2px 8px' : '4px 10px'
                            }}
                            title="Generate Sell / Rebalance Slip"
                          >
                            Sell
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenProfile && onOpenProfile(h.ticker)}
                            title="Inspect deep profile and price history"
                            style={{ padding: isCompact ? '2px 6px' : '4px 8px' }}
                          >
                            Profile ↗
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Portfolio Allocation & Diversification Breakdown (Two Columns) */}
      {sortedHoldings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          
          {/* Sector Allocation Breakdown */}
          <Card
            style={{
              padding: '18px 20px',
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)'
            }}
          >
            <h3
              style={{
                margin: '0 0 14px 0',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-display, sans-serif)',
                color: 'var(--color-text-primary, #F8FAFC)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconBarChart size={18} />
              <span>Sector Diversification Breakdown</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sectorAllocation.map(sec => (
                <div key={sec.sector}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-primary, #F8FAFC)', fontWeight: 600 }}>{sec.sector}</span>
                    <span className="tabular-nums" style={{ color: 'var(--color-text-muted, #64748B)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {sec.percent.toFixed(1)}% (₹{sec.valuation.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--color-surface-elevated, #0F131C)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${sec.percent}%`, height: '100%', background: 'var(--color-primary, #2563EB)' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Currency / Jurisdiction Breakdown */}
          <Card
            style={{
              padding: '18px 20px',
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)'
            }}
          >
            <h3
              style={{
                margin: '0 0 14px 0',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-display, sans-serif)',
                color: 'var(--color-text-primary, #F8FAFC)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconGlobe size={18} />
              <span>Currency & Jurisdiction Allocation</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currencyAllocation.map(c => (
                <div key={c.currency}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-primary, #F8FAFC)', fontWeight: 600 }}>{c.currency} Exposure</span>
                    <span className="tabular-nums" style={{ color: 'var(--color-text-muted, #64748B)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {c.percent.toFixed(1)}% (₹{c.valuation.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--color-surface-elevated, #0F131C)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.percent}%`, height: '100%', background: '#0E7490' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

      {/* Educational Notice Banner */}
      <Alert variant="info" title="Monitoring Station Only">
        All holding quantities, cost bases and cash ledger values reconcile directly with the authoritative server database. The Team Terminal does not place online trades. To adjust holdings, write a Physical Order Slip and present it at the Exchange Desk.
      </Alert>

      {/* Physical Paper Slip Order Modal for Sell / Rebalance */}
      {orderModalSecurity && (
        <PaperSlipModal
          isOpen={!!orderModalSecurity}
          onClose={() => setOrderModalSecurity(null)}
          security={orderModalSecurity}
          team={team || { teamCode: 'T01' }}
          defaultAction="SELL"
          fxRates={fxRates}
        />
      )}

    </div>
  );
}
