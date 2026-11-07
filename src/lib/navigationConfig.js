/**
 * SAAMX 2.0 — Authoritative Navigation Configuration & Role Visibility
 */

export const NAVIGATION_SECTIONS = [
  {
    id: 'trading',
    title: 'Trading & Execution',
    items: [
      {
        id: 'team-terminal',
        name: 'Team Terminal',
        path: '#/team',
        routes: ['#/team', '#/terminal'],
        icon: 'trending-up',
        roles: ['team', 'admin'],
        badge: 'PORTFOLIO',
        description: 'Investment House Portfolio & Orders'
      },
      {
        id: 'exchange-desk',
        name: 'Exchange Desk',
        path: '#/exchange',
        routes: ['#/exchange', '#/verification', '#/verification-desk'],
        icon: 'exchange',
        roles: ['operator_x', 'verification', 'admin'],
        badge: 'CLEARANCE',
        description: 'Unified Intake, Slip Review & Bank Routing'
      },
      {
        id: 'desk-queue-dashboard',
        name: 'Desk Queue Dashboard',
        path: '#/desk-queues',
        routes: ['#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue'],
        icon: 'layers',
        roles: ['operator_x', 'verification', 'bank_teller', 'admin', 'sebi', 'portfolio'],
        badge: 'PORTAL #11',
        description: 'Multi-Desk Assignment & Live Queue Telemetry'
      },
      {
        id: 'currency-desk',
        name: 'Currency Desk',
        path: '#/fx',
        routes: ['#/fx'],
        icon: 'currency',
        roles: ['operator_x', 'admin'],
        description: 'Spot FX Exchange (INR/USD/GBP/EUR)'
      },
      {
        id: 'bank-desk',
        name: 'Bank Desk',
        path: '#/bank',
        routes: ['#/bank', '#/bank-desk', '#/settlement'],
        icon: 'bank',
        roles: ['bank_teller', 'admin', 'sebi', 'team'],
        badge: 'SETTLEMENT',
        description: 'Physical Cash Desk & Two-Phase Settlement'
      }
    ]
  },
  {
    id: 'market',
    title: 'Market & Intelligence',
    items: [
      {
        id: 'market-watch',
        name: 'Market Watch',
        path: '#/market-watch',
        routes: ['#/market-watch'],
        icon: 'bar-chart',
        roles: ['team', 'operator_x', 'verification', 'advisor', 'sebi', 'journalist', 'judge', 'portfolio', 'admin'],
        description: '2,061 Securities Universe & Live Quotes'
      },
      {
        id: 'market-intelligence',
        name: 'Market Intelligence',
        path: '#/market-intelligence',
        routes: ['#/market-intelligence'],
        icon: 'search',
        roles: ['team', 'journalist', 'admin'],
        description: 'News Catalysts & Sentiment Radar'
      },
      {
        id: 'broker-advisor',
        name: 'Broker Advisor',
        path: '#/advisor',
        routes: ['#/advisor', '#/broker', '#/broker-desk', '#/bull', '#/bear', '#/bull-terminal', '#/bear-terminal'],
        icon: 'briefcase',
        roles: ['team', 'advisor', 'admin'],
        description: 'Floor Advisor Research, Bull Momentum & Bear Risk Scanners'
      }
    ]
  },
  {
    id: 'surveillance',
    title: 'Surveillance & Oversight',
    items: [
      {
        id: 'sebi-surveillance',
        name: 'SEBI Surveillance',
        path: '#/sebi',
        routes: ['#/sebi'],
        icon: 'shield-check',
        roles: ['sebi', 'admin'],
        badge: 'REGULATOR',
        description: 'Surveillance, Circuit Limits & Penalties'
      },
      {
        id: 'portfolios-overview',
        name: 'Portfolios Oversight',
        path: '#/portfolio',
        routes: ['#/portfolio'],
        icon: 'folder-open',
        roles: ['operator_x', 'sebi', 'portfolio', 'admin'],
        description: 'Multi-House Valuation Ledger & Positions'
      },
      {
        id: 'journalist-press',
        name: 'Journalist Press',
        path: '#/journalist',
        routes: ['#/journalist', '#/news', '#/newsroom', '#/news-room', '#/anchor'],
        icon: 'newspaper',
        roles: ['journalist', 'admin'],
        description: 'Press Wire Dispatch & Live Stage Broadcast Teleprompter'
      },
      {
        id: 'news-controller',
        name: 'News Controller Console',
        path: '#/news-controller',
        routes: ['#/news-controller', '#/news-control'],
        icon: 'newspaper',
        roles: ['news_controller', 'admin'],
        badge: 'PORTAL #10',
        description: 'News Draft Review, ~400 Presets & Live Market Impact Engine'
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations & Control',
    items: [
      {
        id: 'training-terminal',
        name: 'Training Terminal',
        path: '#/training',
        routes: ['#/training'],
        icon: 'target',
        roles: ['team', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'portfolio', 'admin', 'super_admin'],
        badge: 'SANDBOX',
        description: 'Multi-Role Rehearsal Simulator & Operator Performance Scorecard'
      },
      {
        id: 'floor-operations',
        name: 'Floor Operations',
        path: '#/floor-ops',
        routes: ['#/floor-ops'],
        icon: 'clipboard-list',
        roles: ['operator_x', 'sebi', 'portfolio', 'admin'],
        description: 'Runner Logistics & Physical Slip Routing'
      },
      {
        id: 'floor-director',
        name: 'Floor Director (Admin)',
        path: '#/admin',
        routes: ['#/admin', '#/personnel', '#/personnel-management'],
        icon: 'settings',
        roles: ['admin'],
        badge: 'COMMAND',
        description: 'Executive Orchestrator, Personnel, Market Controls & Backups'
      },
      {
        id: 'tech-ops-monitoring',
        name: 'Technical Operations Monitoring',
        path: '#/tech-ops',
        routes: ['#/tech-ops', '#/monitoring'],
        icon: 'activity',
        roles: ['admin', 'super_admin', 'sebi'],
        badge: 'TELEMETRY',
        description: 'Real-time System Health, Throughput, Latency & Error Logs'
      }
    ]
  },
  {
    id: 'event',
    title: 'Event & Overview',
    items: [
      {
        id: 'competition-results',
        name: 'Competition Results',
        path: '#/results',
        routes: ['#/results'],
        icon: 'trophy',
        roles: ['team', 'operator_x', 'verification', 'advisor', 'sebi', 'journalist', 'judge', 'portfolio', 'admin'],
        description: '1,000-Point Scorecard & Awards Podium'
      },
      {
        id: 'portals-directory',
        name: 'Portals Directory',
        path: '#/portals',
        routes: ['#/portals', '#/directory'],
        icon: 'globe',
        roles: ['admin'],
        description: 'Directory of All Terminal Portals'
      },
      {
        id: 'auditorium-projector',
        name: 'Auditorium Projector',
        path: '#/projector',
        routes: ['#/projector'],
        icon: 'monitor',
        roles: ['team', 'operator_x', 'verification', 'advisor', 'sebi', 'journalist', 'judge', 'portfolio', 'admin'],
        description: 'Public Big-Screen & Split-Flap Board'
      }
    ]
  }
];

export function getFilteredNavSections(userRole, grantedPermissions = [], grantedPages = []) {
  if (!userRole) return [];
  const normalizedRole = userRole.toLowerCase();

  return NAVIGATION_SECTIONS.map(section => {
    const visibleItems = section.items.filter(item => {
      if (normalizedRole === 'admin' || normalizedRole === 'super_admin') return true;
      if (item.roles.includes(normalizedRole)) return true;
      if (Array.isArray(grantedPages) && grantedPages.length > 0) {
        if (grantedPages.includes(item.path) || item.routes?.some(r => grantedPages.includes(r))) {
          return true;
        }
      }
      return false;
    });

    if (visibleItems.length === 0) return null;
    return {
      ...section,
      items: visibleItems
    };
  }).filter(Boolean);
}

export function isItemActive(item, currentRoute) {
  if (!currentRoute || !item?.routes) return false;
  return item.routes.some(r => currentRoute === r || currentRoute.startsWith(r + '/') || currentRoute.startsWith(r + '?'));
}
