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
        roles: ['team', 'admin', 'super_admin'],
        badge: 'PORTFOLIO',
        description: 'Investment House Portfolio & Orders'
      },
      {
        id: 'exchange-desk',
        name: 'Exchange Desk',
        path: '#/exchange',
        routes: ['#/exchange', '#/verification', '#/verification-desk'],
        icon: 'exchange',
        roles: ['exchange', 'verification', 'operator_x', 'admin', 'super_admin'],
        badge: 'CLEARANCE',
        description: 'Unified Intake, Slip Review & Bank Routing'
      },
      {
        id: 'desk-queue-dashboard',
        name: 'Desk Queue Dashboard',
        path: '#/desk-queues',
        routes: ['#/desk-queues', '#/desk-dashboard', '#/queue-dashboard', '#/desk-queue'],
        icon: 'layers',
        roles: ['exchange', 'verification', 'operator_x', 'bank_teller', 'admin', 'super_admin', 'sebi', 'portfolio', 'coordinator'],
        badge: 'PORTAL #11',
        description: 'Multi-Desk Assignment & Live Queue Telemetry'
      },
      {
        id: 'currency-desk',
        name: 'Currency Desk',
        path: '#/fx',
        routes: ['#/fx'],
        icon: 'currency',
        roles: ['operator_x', 'exchange', 'team', 'admin', 'super_admin'],
        description: 'Spot FX Exchange (INR/USD/GBP/EUR)'
      },
      {
        id: 'bank-desk',
        name: 'Bank Desk',
        path: '#/bank',
        routes: ['#/bank', '#/bank-desk', '#/settlement'],
        icon: 'bank',
        roles: ['bank_teller', 'admin', 'super_admin', 'sebi', 'team'],
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
        roles: ['team', 'exchange', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'observer', 'portfolio', 'admin', 'super_admin', 'coordinator'],
        description: '3,000+ Securities Universe & Live Quotes'
      },
      {
        id: 'market-intelligence',
        name: 'Market Intelligence',
        path: '#/market-intelligence',
        routes: ['#/market-intelligence'],
        icon: 'search',
        roles: ['team', 'exchange', 'bank_teller', 'advisor', 'journalist', 'news_controller', 'admin', 'super_admin', 'sebi', 'coordinator'],
        description: 'News Catalysts & Sentiment Radar'
      },
      {
        id: 'broker-advisor',
        name: 'Broker Advisor',
        path: '#/advisor',
        routes: ['#/advisor', '#/broker', '#/broker-desk', '#/bull', '#/bear', '#/bull-terminal', '#/bear-terminal', '#/debate', '#/bull-bear'],
        icon: 'briefcase',
        roles: ['team', 'advisor', 'admin', 'super_admin', 'coordinator'],
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
        roles: ['sebi', 'admin', 'super_admin'],
        badge: 'REGULATOR',
        description: 'Surveillance, Circuit Limits & Penalties'
      },
      {
        id: 'portfolios-overview',
        name: 'Portfolios Oversight',
        path: '#/portfolio',
        routes: ['#/portfolio'],
        icon: 'folder-open',
        roles: ['operator_x', 'exchange', 'sebi', 'portfolio', 'admin', 'super_admin', 'coordinator'],
        description: 'Multi-House Valuation Ledger & Positions'
      },
      {
        id: 'journalist-press',
        name: 'Journalist Press',
        path: '#/journalist',
        routes: ['#/journalist', '#/news', '#/newsroom', '#/news-room', '#/anchor'],
        icon: 'newspaper',
        roles: ['journalist', 'news_controller', 'admin', 'super_admin'],
        description: 'Press Wire Dispatch & Live Stage Broadcast Teleprompter'
      },
      {
        id: 'news-controller',
        name: 'News Controller Console',
        path: '#/news-controller',
        routes: ['#/news-controller', '#/news-control'],
        icon: 'newspaper',
        roles: ['news_controller', 'journalist', 'admin', 'super_admin'],
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
        roles: ['team', 'exchange', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'observer', 'portfolio', 'admin', 'super_admin', 'coordinator'],
        badge: 'SANDBOX',
        description: 'Multi-Role Rehearsal Simulator & Operator Performance Scorecard'
      },
      {
        id: 'floor-operations',
        name: 'Floor Operations',
        path: '#/floor-ops',
        routes: ['#/floor-ops'],
        icon: 'clipboard-list',
        roles: ['coordinator', 'operator_x', 'exchange', 'verification', 'sebi', 'portfolio', 'admin', 'super_admin'],
        description: 'Runner Logistics & Physical Slip Routing'
      },
      {
        id: 'floor-director',
        name: 'Floor Director (Admin)',
        path: '#/admin',
        routes: ['#/admin', '#/personnel', '#/personnel-management'],
        icon: 'settings',
        roles: ['admin', 'super_admin'],
        badge: 'COMMAND',
        description: 'Executive Orchestrator, Personnel, Market Controls & Backups'
      },
      {
        id: 'tech-ops-monitoring',
        name: 'Technical Operations Monitoring',
        path: '#/tech-ops',
        routes: ['#/tech-ops', '#/monitoring'],
        icon: 'activity',
        roles: ['admin', 'super_admin', 'sebi', 'coordinator'],
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
        roles: ['team', 'exchange', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'observer', 'portfolio', 'admin', 'super_admin', 'coordinator'],
        description: '1,000-Point Scorecard & Awards Podium'
      },
      {
        id: 'portals-directory',
        name: 'Portals Directory',
        path: '#/portals',
        routes: ['#/portals', '#/directory'],
        icon: 'globe',
        roles: ['team', 'exchange', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'observer', 'portfolio', 'admin', 'super_admin', 'coordinator'],
        description: 'Directory of All Terminal Portals'
      },
      {
        id: 'auditorium-projector',
        name: 'Auditorium Projector',
        path: '#/projector',
        routes: ['#/projector'],
        icon: 'monitor',
        roles: ['team', 'exchange', 'operator_x', 'verification', 'bank_teller', 'advisor', 'sebi', 'journalist', 'news_controller', 'judge', 'observer', 'portfolio', 'admin', 'super_admin', 'coordinator'],
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
      if (normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'coordinator') return true;
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
