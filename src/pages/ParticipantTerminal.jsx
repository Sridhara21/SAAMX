import React, { useState, useMemo, useEffect } from 'react';
import { calculateMarketClock } from '../lib/api.js';
import CompanyProfileModal from '../components/CompanyProfileModal.jsx';
import TeamOverviewSection from '../components/team/TeamOverviewSection.jsx';
import MarketOverviewIntelligenceSection from '../components/team/MarketOverviewIntelligenceSection.jsx';
import PortfolioHoldingsSection from '../components/team/PortfolioHoldingsSection.jsx';
import OrderHistorySection from '../components/team/OrderHistorySection.jsx';
import { Button, Card, Badge, Alert } from '../components/ui/index.js';
import {
  IconBarChart,
  IconGlobe,
  IconBriefcase,
  IconClipboardList,
  IconShieldAlert
} from '../lib/icons.jsx';
import { CURRENCY_DIRECTORY, CURRENCY_SYMBOLS, DEFAULT_FX_RATES } from '../lib/formatters.js';

export default function ParticipantTerminal({
  state,
  teamCode: propTeamCode,
  onOpenProfile,
  connected = true,
  isCoordinatorOffline = false
}) {
  const teamCode = propTeamCode || sessionStorage.getItem('fms_username') || sessionStorage.getItem('saamx_team_code') || 'T01';

  // Four Primary Sections: 'overview', 'market', 'portfolio', 'orders'
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('tab=market') || hash.includes('section=market')) return 'market';
      if (hash.includes('tab=portfolio') || hash.includes('section=portfolio')) return 'portfolio';
      if (hash.includes('tab=orders') || hash.includes('section=orders')) return 'orders';
    }
    return 'overview';
  });

  // Keep hash in sync with section changes without breaking browser history
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    if (typeof window !== 'undefined') {
      const currentRoute = window.location.hash.split('?')[0] || '#/team';
      window.location.hash = `${currentRoute}?section=${sectionId}`;
    }
  };

  // Local Profile Modal state fallback
  const [localProfileSecurityId, setLocalProfileSecurityId] = useState(null);

  const handleOpenProfile = (ticker) => {
    if (onOpenProfile) {
      onOpenProfile(ticker);
    } else {
      setLocalProfileSecurityId(ticker);
    }
  };

  // Find authoritative team record
  const team = useMemo(() => {
    const list = state?.teams ? (Array.isArray(state.teams) ? state.teams : Object.values(state.teams)) : [];
    return list.find(t => (t.teamCode || '').toUpperCase() === teamCode.toUpperCase() || (t.id || '').toUpperCase() === teamCode.toUpperCase()) || list[0];
  }, [state?.teams, teamCode]);

  // Market State & Clock
  const marketState = state?.marketState || {};
  const sessionState = marketState.sessionState || 'PRE_OPEN';
  const clock = useMemo(() => calculateMarketClock(marketState), [marketState]);

  // FX Rates & Multi-Currency Calculations
  const fxRates = useMemo(() => {
    return state?.fxRates || DEFAULT_FX_RATES;
  }, [state?.fxRates]);

  const usdRate = fxRates?.USDINR?.midRate || DEFAULT_FX_RATES?.USDINR?.midRate || 88.20;
  const gbpRate = fxRates?.GBPINR?.midRate || DEFAULT_FX_RATES?.GBPINR?.midRate || 119.40;
  const eurRate = fxRates?.EURINR?.midRate || DEFAULT_FX_RATES?.EURINR?.midRate || 103.50;

  // Visible Securities Universe
  const rawSecuritiesList = useMemo(() => {
    if (!state?.securities) return [];
    return Array.isArray(state.securities) ? state.securities : Object.values(state.securities);
  }, [state?.securities]);

  const securitiesList = useMemo(() => {
    return rawSecuritiesList.filter(s => {
      if (s.visibleToParticipants === false || s.ipoStage === 'HIDDEN' || s.ipoStatus === 'HIDDEN') return false;
      return true;
    });
  }, [rawSecuritiesList]);

  // Team Wallets
  const teamWallets = useMemo(() => {
    if (!team) return { INR: 10000000 };
    return team.cashWallets || {
      INR: Number(team.cashBalance) || 10000000
    };
  }, [team]);

  const totalCashInr = useMemo(() => {
    let sum = Number(teamWallets.INR || 0);
    Object.keys(CURRENCY_DIRECTORY).forEach(cur => {
      if (cur === 'INR') return;
      const bal = Number(teamWallets[cur] || 0);
      if (bal !== 0) {
        const pairKey = `${cur}INR`;
        const rate = fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0;
        sum += bal * rate;
      }
    });
    return parseFloat(sum.toFixed(2));
  }, [teamWallets, fxRates]);

  // Authoritative Team Orders (strictly filtered for this team)
  const teamOrders = useMemo(() => {
    const list = state?.orders ? (Array.isArray(state.orders) ? state.orders : Object.values(state.orders)) : [];
    const tId = (team?.teamCode || teamCode || '').toUpperCase();
    return list.filter(o => (o.teamCode || '').toUpperCase() === tId || (o.teamId || '').toUpperCase() === tId).reverse();
  }, [state?.orders, team, teamCode]);

  const openOrders = useMemo(() => {
    return teamOrders.filter(o => ['PENDING', 'SUBMITTED', 'VERIFYING', 'VALIDATED', 'EXECUTING', 'EXECUTED_PENDING_SETTLEMENT', 'AWAITING_PHYSICAL_SLIP', 'VERIFYING_AT_EXCHANGE', 'EXCHANGE_APPROVED', 'AWAITING_BANK_SETTLEMENT', 'VERIFYING_AT_BANK', 'HELD_FOR_REVIEW'].includes(o.status));
  }, [teamOrders]);

  // Holdings Compilation & Dual P&L Reconciliation
  const holdingsList = useMemo(() => {
    const list = [];
    if (!team || !team.holdings) return list;

    Object.entries(team.holdings).forEach(([ticker, qty]) => {
      const security = securitiesList.find(s => s.ticker === ticker || s.id === ticker);
      if (security && qty > 0) {
        const lockedQty = Number(team.lockedHoldings?.[ticker] || 0);
        const deliverableQty = Math.max(0, qty - lockedQty);
        const secCurrency = security.currency || (security.exchange === 'NASDAQ' || security.exchange === 'NYSE' ? 'USD' : security.exchange === 'LSE' ? 'GBP' : security.exchange === 'XETRA' ? 'EUR' : 'INR');
        const curSym = CURRENCY_SYMBOLS[secCurrency] || (secCurrency === 'USD' ? '$' : '₹');
        const pairKey = `${secCurrency}INR`;
        const fxRate = secCurrency === 'INR' ? 1.0 : (fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);

        const currentPrice = security.currentPrice || security.basePrice || 0;
        const avgCost = security.basePrice || currentPrice;
        const nativeValuation = qty * currentPrice;
        const inrValuation = nativeValuation * fxRate;
        const nativeCostBasis = qty * avgCost;
        const inrCostBasis = nativeCostBasis * fxRate;

        const nativePnl = nativeValuation - nativeCostBasis;
        const inrPnl = inrValuation - inrCostBasis;
        const pnlPercent = nativeCostBasis > 0 ? (nativePnl / nativeCostBasis) * 100 : 0;

        list.push({
          ticker,
          name: security.name,
          exchange: security.exchange || 'NSE',
          currency: secCurrency,
          curSym,
          fxRate,
          sector: security.sector || 'Unclassified',
          qty,
          lockedQty,
          deliverableQty,
          avgCost,
          currentPrice,
          nativeValuation,
          inrValuation,
          pnl: inrPnl,
          nativePnl,
          pnlPercent,
          weight: 0
        });
      }
    });

    const totalVal = list.reduce((acc, h) => acc + h.inrValuation, 0);
    list.forEach(h => {
      h.weight = totalVal > 0 ? (h.inrValuation / totalVal) * 100 : 0;
    });

    return list.sort((a, b) => b.inrValuation - a.inrValuation);
  }, [team, securitiesList, usdRate, gbpRate, eurRate]);

  const holdingsValuation = useMemo(() => {
    return holdingsList.reduce((acc, h) => acc + h.inrValuation, 0);
  }, [holdingsList]);

  // Authoritative Overall Ledger Performance
  const totalCapital = totalCashInr + holdingsValuation;
  const initialCapital = Number(team?.startingCapital || team?.initialCapital) || 10000000; // ₹1 Crore default
  const totalPnL = totalCapital - initialCapital;
  const roi = initialCapital > 0 ? ((totalCapital - initialCapital) / initialCapital) * 100 : 0;
  const unrealizedPnL = holdingsList.reduce((acc, h) => acc + h.pnl, 0);
  const realizedPnL = totalPnL - unrealizedPnL;

  // Buying Power (Cash minus open buy slip commitments / reserved cash across all currencies)
  const openBuyCommitmentInr = useMemo(() => {
    if (team?.reservedCash !== undefined && team?.reservedCash !== null) {
      if (typeof team.reservedCash === 'object') {
        let reservedInrTotal = 0;
        Object.entries(team.reservedCash).forEach(([cur, amt]) => {
          const val = Number(amt) || 0;
          if (val > 0) {
            const pairKey = `${cur}INR`;
            const rate = cur === 'INR' ? 1.0 : (fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
            reservedInrTotal += val * rate;
          }
        });
        return reservedInrTotal;
      }
      return Number(team.reservedCash) || 0;
    }
    if (team?.reservedWallets && typeof team.reservedWallets === 'object') {
      let reservedInrTotal = 0;
      Object.entries(team.reservedWallets).forEach(([cur, amt]) => {
        const val = Number(amt) || 0;
        if (val > 0) {
          const pairKey = `${cur}INR`;
          const rate = cur === 'INR' ? 1.0 : (fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
          reservedInrTotal += val * rate;
        }
      });
      return reservedInrTotal;
    }
    return openOrders.filter(o => o.action === 'BUY').reduce((acc, o) => {
      const sec = securitiesList.find(s => s.ticker === o.ticker);
      const price = o.limitPrice || sec?.currentPrice || 0;
      const secCcy = sec?.currency || 'INR';
      const pairKey = `${secCcy}INR`;
      const fxR = secCcy === 'INR' ? 1.0 : (fxRates[pairKey]?.midRate || DEFAULT_FX_RATES[pairKey]?.midRate || 1.0);
      return acc + (o.quantity * price * fxR);
    }, 0);
  }, [team?.reservedCash, team?.reservedWallets, openOrders, securitiesList, fxRates]);

  const buyingPower = Math.max(0, totalCashInr - openBuyCommitmentInr);

  if (!team) {
    return (
      <div style={{ maxWidth: '540px', margin: '80px auto', padding: '16px' }}>
        <Card
          style={{
            textAlign: 'center',
            padding: '32px',
            background: 'var(--color-surface, #131822)',
            border: '1px solid var(--color-border, rgba(255,255,255,0.1))'
          }}
        >
          <Alert variant="danger" title="Authentication Error">
            Could not find profile records for Investment House <strong>{teamCode}</strong>.
          </Alert>
          <div style={{ marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => { window.location.hash = '#/login'; }}>
              Return to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="saamx-participant-terminal"
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        color: 'var(--color-text-primary, #F8FAFC)'
      }}
    >
      {/* 1. Workstation Top Brand & Internal Navigation Rail */}
      <Card
        style={{
          padding: '14px 20px',
          background: 'var(--color-surface, #131822)',
          border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
          borderRadius: 'var(--radius-lg, 12px)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          {/* Left: Brand Badge & House Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                background: 'var(--color-primary, #2563EB)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                fontWeight: 900,
                fontSize: '0.875rem',
                letterSpacing: '0.06em'
              }}
            >
              SAAMX
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '1.35rem',
                    color: 'var(--color-text-primary, #F8FAFC)',
                    margin: 0,
                    lineHeight: 1.2,
                    fontWeight: 800
                  }}
                >
                  Team Trading Workstation
                </h1>
                <Badge variant="brass">
                  House #{team.teamCode}
                </Badge>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted, #94A3B8)',
                  display: 'block',
                  marginTop: '3px'
                }}
              >
                Logged in as: <strong style={{ color: 'var(--color-text-primary, #F8FAFC)' }}>{team.teamName || team.teamCode}</strong> &bull; {team.school || 'Championship Delegation'}
              </span>
            </div>
          </div>

          {/* Right: Internal Navigation Bar (The Four Core Sections) */}
          <div
            role="tablist"
            aria-label="Workstation Sections"
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <Button
              type="button"
              role="tab"
              aria-selected={activeSection === 'overview'}
              aria-controls="section-overview"
              variant={activeSection === 'overview' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleSectionChange('overview')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconBarChart size={16} />
              <span>Team Overview</span>
            </Button>

            <Button
              type="button"
              role="tab"
              aria-selected={activeSection === 'market'}
              aria-controls="section-market"
              variant={activeSection === 'market' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleSectionChange('market')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconGlobe size={16} />
              <span>Market Overview & Intelligence</span>
            </Button>

            <Button
              type="button"
              role="tab"
              aria-selected={activeSection === 'portfolio'}
              aria-controls="section-portfolio"
              variant={activeSection === 'portfolio' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleSectionChange('portfolio')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconBriefcase size={16} />
              <span>Portfolio & Holdings</span>
            </Button>

            <Button
              type="button"
              role="tab"
              aria-selected={activeSection === 'orders'}
              aria-controls="section-orders"
              variant={activeSection === 'orders' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleSectionChange('orders')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700
              }}
            >
              <IconClipboardList size={16} />
              <span>Order History</span>
              {openOrders.length > 0 && (
                <span
                  className="tabular-nums"
                  style={{
                    background: 'var(--color-rise, #10B981)',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginLeft: '4px'
                  }}
                >
                  {openOrders.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Offline Alert if Coordinator / Server Disconnected */}
      {(!connected || isCoordinatorOffline) && (
        <Alert variant="warning" title="Floor Sync Interrupted" icon={<IconShieldAlert size={18} />}>
          Real-time event coordinator is reconnecting. Existing portfolio records and submitted paper order slips remain cached and securely preserved.
        </Alert>
      )}

      {/* 2. Primary Workstation Viewport */}
      <main id={`section-${activeSection}`} role="tabpanel">
        {activeSection === 'overview' && (
          <TeamOverviewSection
            team={team}
            state={state}
            sessionState={sessionState}
            clock={clock}
            fxRates={fxRates}
            totalCashInr={totalCashInr}
            holdingsValuation={holdingsValuation}
            totalCapital={totalCapital}
            realizedPnL={realizedPnL}
            unrealizedPnL={unrealizedPnL}
            roi={roi}
            buyingPower={buyingPower}
            teamWallets={teamWallets}
            teamOrders={teamOrders}
            holdingsList={holdingsList}
            onNavigate={handleSectionChange}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {activeSection === 'market' && (
          <MarketOverviewIntelligenceSection
            state={state}
            securitiesList={securitiesList}
            sessionState={sessionState}
            clock={clock}
            fxRates={fxRates}
            onOpenProfile={handleOpenProfile}
            teamCode={team.teamCode}
            team={team}
          />
        )}

        {activeSection === 'portfolio' && (
          <PortfolioHoldingsSection
            holdingsList={holdingsList}
            totalCashInr={totalCashInr}
            holdingsValuation={holdingsValuation}
            totalCapital={totalCapital}
            realizedPnL={realizedPnL}
            unrealizedPnL={unrealizedPnL}
            roi={roi}
            buyingPower={buyingPower}
            teamWallets={teamWallets}
            fxRates={fxRates}
            team={team}
            onOpenProfile={handleOpenProfile}
            onNavigate={handleSectionChange}
          />
        )}

        {activeSection === 'orders' && (
          <OrderHistorySection
            teamOrders={teamOrders}
            teamCode={team.teamCode}
            onNavigate={handleSectionChange}
          />
        )}
      </main>

      {/* Local Profile Modal fallback */}
      {localProfileSecurityId && (
        <CompanyProfileModal
          securityId={localProfileSecurityId}
          securities={securitiesList}
          newsEvents={state?.newsEvents || []}
          onClose={() => setLocalProfileSecurityId(null)}
        />
      )}
    </div>
  );
}
