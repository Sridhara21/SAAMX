import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import { useDensity } from '../context/DensityContext.jsx';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SectionHeader,
  Badge,
  Button,
  Spinner,
  Alert
} from '../components/ui/index.js';
import {
  IconActivity,
  IconDatabase,
  IconWifi,
  IconClock,
  IconShieldAlert,
  IconShieldCheck,
  IconRefreshCw,
  IconPause,
  IconPlay,
  IconLayers,
  IconBarChart,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconUsers,
  IconBuilding
} from '../lib/icons.jsx';

export default function TechOpsMonitoringPage({ state, connected }) {
  const { density } = useDensity();
  const userRole = (sessionStorage.getItem('saamx_role') || sessionStorage.getItem('fms_role') || '').toLowerCase();
  const isAuthorized = ['admin', 'super_admin', 'sebi'].includes(userRole);

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [eventFilter, setEventFilter] = useState('ALL');

  const timerRef = useRef(null);

  const fetchMetrics = async () => {
    try {
      const res = await apiFetch('/api/monitoring/metrics');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMetrics(data);
        setError(null);
        setLastRefreshedAt(Date.now());
      } else {
        setError(data.error || 'Failed to retrieve telemetry metrics.');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching monitoring metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchMetrics();

    if (!isPaused) {
      timerRef.current = setInterval(fetchMetrics, 3000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthorized, isPaused]);

  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px' }}>
        <Card variant="default" style={{ textAlign: 'center', padding: '40px 24px', borderTop: '4px solid var(--color-fall)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-fall)', marginBottom: '12px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--color-ink-2)', lineHeight: 1.6, marginBottom: '20px' }}>
            The Technical Operations Monitoring Portal is strictly reserved for Authorized Administrators, System Engineers, and SEBI Regulatory Officers.
          </p>
          <Badge variant="neutral" size="large">Current Role: {(userRole || 'ANONYMOUS').toUpperCase()}</Badge>
        </Card>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'Unavailable';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const filteredEvents = (metrics?.securityEvents || []).filter(e => {
    if (eventFilter === 'ALL') return true;
    if (eventFilter === 'AUTH' && e.type.includes('AUTH')) return true;
    if (eventFilter === 'RBAC' && (e.type.includes('FORBIDDEN') || e.status === 403)) return true;
    if (eventFilter === 'CONFLICT' && (e.type.includes('CONFLICT') || e.status === 409)) return true;
    if (eventFilter === 'ERROR' && (e.status >= 500 || e.type.includes('ERROR'))) return true;
    return false;
  });

  return (
    <div className={`saamx-tech-ops-page density-${density}`} style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconActivity size={28} color="var(--color-primary)" />
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Technical Operations Monitoring Portal
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--color-ink-2)', fontSize: '0.92rem' }}>
            Real-Time Institutional Telemetry, Request Throughput, ACID Health, and Security Audit Stream
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshedAt && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconClock size={14} /> Updated: {new Date(lastRefreshedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant={isPaused ? 'warning' : 'outline'}
            size="small"
            onClick={() => setIsPaused(!isPaused)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isPaused ? <><IconPlay size={14} /> Resume Live</> : <><IconPause size={14} /> Pause Live</>}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={fetchMetrics}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefreshCw size={14} className={loading ? 'saamx-spin' : ''} /> Refresh Now
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" style={{ marginBottom: '20px' }}>
          <strong>Telemetry Error:</strong> {error}
        </Alert>
      )}

      {loading && !metrics ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spinner size="large" />
          <p style={{ marginTop: '16px', color: 'var(--color-ink-2)' }}>Polling server telemetry metrics...</p>
        </div>
      ) : (
        <>
          {/* Top Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* System Health */}
            <Card variant="elevated">
              <CardBody style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 700, textTransform: 'uppercase' }}>System Health</span>
                  <Badge variant={metrics?.health?.status === 'HEALTHY' ? 'success' : 'danger'}>
                    {metrics?.health?.status || 'UNKNOWN'}
                  </Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  Uptime: {formatUptime(metrics?.health?.uptimeSeconds)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-3)', marginTop: '6px' }}>
                  Node.js {metrics?.health?.nodeVersion || 'v20'} • RSS: {formatBytes(metrics?.health?.memory?.rssBytes)}
                </div>
              </CardBody>
            </Card>

            {/* Database Engine */}
            <Card variant="elevated">
              <CardBody style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 700, textTransform: 'uppercase' }}>Database</span>
                  <Badge variant={metrics?.health?.database?.connected ? 'success' : (metrics?.health?.database?.configured ? 'warning' : 'neutral')}>
                    {metrics?.health?.database?.connected ? 'POSTGRES 15' : 'IN-MEMORY / FILE'}
                  </Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  {metrics?.health?.database?.pingLatencyMs !== null && metrics?.health?.database?.pingLatencyMs !== undefined && metrics?.health?.database?.pingLatencyMs >= 0
                    ? `${metrics.health.database.pingLatencyMs} ms Ping`
                    : 'Active / Fallback'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-3)', marginTop: '6px' }}>
                  Pool: {metrics?.health?.database?.pool ? `${metrics.health.database.pool.totalCount} total (${metrics.health.database.pool.idleCount} idle)` : 'Single tenant fallback'}
                </div>
              </CardBody>
            </Card>

            {/* Request Throughput */}
            <Card variant="elevated">
              <CardBody style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 700, textTransform: 'uppercase' }}>Throughput (RPM)</span>
                  <Badge variant="primary">LIVE</Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {metrics?.throughput?.rpm || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>req / min</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-3)', marginTop: '6px' }}>
                  p50: {metrics?.throughput?.latency?.p50 || 0}ms • p95: {metrics?.throughput?.latency?.p95 || 0}ms • Jitter: {metrics?.throughput?.jitterMs || 0}ms
                </div>
              </CardBody>
            </Card>

            {/* Active Sessions & WebSockets */}
            <Card variant="elevated">
              <CardBody style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', fontWeight: 700, textTransform: 'uppercase' }}>Connected Devices</span>
                  <Badge variant="info">{metrics?.sessions?.activeWebSockets || 0} WS</Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  {metrics?.sessions?.activeCount || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Active Sessions</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-3)', marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(metrics?.sessions?.breakdown || {}).map(([role, cnt]) => (
                    <span key={role} style={{ background: 'var(--color-surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                      {role}: {cnt}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Section 2: Pipelines & Queues */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Order Pipeline Throughput */}
            <Card variant="default">
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <IconBarChart size={18} color="var(--color-primary)" />
                  Order Pipeline Throughput (Submitted / Accepted / Rejected)
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: '14px 8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', fontWeight: 700, marginBottom: '6px' }}>LAST 5 MIN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                      {metrics?.orders?.last5m?.submitted || 0}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--color-rise)' }}>✓ {metrics?.orders?.last5m?.accepted || 0}</span> • <span style={{ color: 'var(--color-fall)' }}>✗ {metrics?.orders?.last5m?.rejected || 0}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-surface-subtle)', padding: '14px 8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', fontWeight: 700, marginBottom: '6px' }}>LAST 15 MIN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                      {metrics?.orders?.last15m?.submitted || 0}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--color-rise)' }}>✓ {metrics?.orders?.last15m?.accepted || 0}</span> • <span style={{ color: 'var(--color-fall)' }}>✗ {metrics?.orders?.last15m?.rejected || 0}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-surface-subtle)', padding: '14px 8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)', fontWeight: 700, marginBottom: '6px' }}>LAST 60 MIN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                      {metrics?.orders?.last60m?.submitted || 0}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--color-rise)' }}>✓ {metrics?.orders?.last60m?.accepted || 0}</span> • <span style={{ color: 'var(--color-fall)' }}>✗ {metrics?.orders?.last60m?.rejected || 0}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Voucher & Settlement Throughput */}
            <Card variant="default">
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <IconBuilding size={18} color="var(--color-warning)" />
                  Virtual Bank Voucher & Settlement Throughput
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: '12px 6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)', fontWeight: 700 }}>ISSUED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                      {metrics?.vouchers?.totalGenerated || 0}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: '12px 6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-rise)', fontWeight: 700 }}>SETTLED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-rise)', marginTop: '4px' }}>
                      {metrics?.vouchers?.settled || 0}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: '12px 6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 700 }}>PENDING</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '4px' }}>
                      {metrics?.vouchers?.pending || 0}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: '12px 6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-fall)', fontWeight: 700 }}>REJECTED</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-fall)', marginTop: '4px' }}>
                      {metrics?.vouchers?.rejected || 0}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '14px', fontSize: '0.82rem', color: 'var(--color-ink-2)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  <span>Duplicate Settlement Attempts Blocked:</span>
                  <Badge variant="success">🛡️ {metrics?.vouchers?.duplicateAttempts || 0} Blocked</Badge>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Section 3: Desk Queue Depths */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Exchange Desks Queue Depth */}
            <Card variant="default">
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <IconLayers size={18} color="var(--color-primary)" />
                  Exchange Desks Queue Depths (Intake & Verification)
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                  {['DESK_1', 'DESK_2', 'DESK_3', 'DESK_4', 'DESK_5'].map(d => {
                    const depth = metrics?.queues?.exchangeQueue?.[d] || 0;
                    const isHigh = depth > 10;
                    return (
                      <div
                        key={d}
                        style={{
                          background: isHigh ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-subtle)',
                          border: isHigh ? '1px solid var(--color-fall)' : '1px solid var(--color-border)',
                          padding: '10px 4px',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-2)' }}>{d.replace('_', ' ')}</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', color: isHigh ? 'var(--color-fall)' : 'var(--color-ink)' }}>
                          {depth}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-3)', marginTop: '2px' }}>Tickets</div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Bank Desks Queue Depth */}
            <Card variant="default">
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <IconBuilding size={18} color="var(--color-warning)" />
                  Bank Desks Queue Depths (Settlement Clearance)
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', textAlign: 'center' }}>
                  {['BANK_1', 'BANK_2'].map(b => {
                    const depth = metrics?.queues?.bankQueue?.[b] || 0;
                    const isHigh = depth > 8;
                    return (
                      <div
                        key={b}
                        style={{
                          background: isHigh ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-surface-subtle)',
                          border: isHigh ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                          padding: '12px',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-ink-2)' }}>{b.replace('_', ' ')}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: isHigh ? 'var(--color-warning)' : 'var(--color-ink)' }}>
                          {depth}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-3)', marginTop: '2px' }}>Pending Vouchers</div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Section 4: Security Audit & Error Events Stream */}
          <Card variant="default">
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <IconShieldAlert size={18} color="var(--color-fall)" />
                Real-Time Security Audit & Error Event Stream (Zero Secrets Leaked)
              </CardTitle>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'AUTH', 'RBAC', 'CONFLICT', 'ERROR'].map(f => (
                  <Button
                    key={f}
                    variant={eventFilter === f ? 'primary' : 'outline'}
                    size="small"
                    onClick={() => setEventFilter(f)}
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardBody style={{ padding: '0' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '0.9rem' }}>
                  ✓ No security violations, 401s, 403s, or 500 server errors recorded in telemetry buffer.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Time</th>
                        <th style={{ padding: '10px 14px' }}>Type</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px' }}>Method & Path</th>
                        <th style={{ padding: '10px 14px' }}>Role / User</th>
                        <th style={{ padding: '10px 14px' }}>Client IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map(evt => {
                        const is403 = evt.status === 403;
                        const is401 = evt.status === 401;
                        const is409 = evt.status === 409;
                        const is500 = evt.status >= 500;
                        return (
                          <tr key={evt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: 'var(--color-ink-3)' }}>
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </td>
                            <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                              <Badge variant={is500 ? 'danger' : is403 ? 'warning' : is401 ? 'danger' : is409 ? 'info' : 'neutral'}>
                                {evt.type}
                              </Badge>
                            </td>
                            <td style={{ padding: '8px 14px', fontWeight: 700 }}>
                              <span style={{ color: is500 || is401 ? 'var(--color-fall)' : is403 ? 'var(--color-warning)' : 'var(--color-ink)' }}>
                                {evt.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--color-ink-2)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{evt.method}</span> {evt.path}
                            </td>
                            <td style={{ padding: '8px 14px' }}>
                              <Badge variant="neutral" size="small">{evt.role}</Badge> {evt.username && <span style={{ color: 'var(--color-ink-2)', marginLeft: '4px' }}>({evt.username})</span>}
                            </td>
                            <td style={{ padding: '8px 14px', color: 'var(--color-ink-3)', fontFamily: 'monospace' }}>
                              {evt.ip}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
