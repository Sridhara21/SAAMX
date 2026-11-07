import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Alert,
  StationBadge
} from '../components/ui/index.js';
import {
  IconBuilding,
  IconCurrencyExchange,
  IconTrendingUp,
  IconBarChart,
  IconSearch,
  IconBriefcase,
  IconScale,
  IconRadio,
  IconShieldCheck,
  IconFolderOpen,
  IconNewspaper,
  IconClipboardList,
  IconSettings,
  IconUsers,
  IconTrophy,
  IconMonitor,
  IconUser,
  IconCrown,
  IconLock,
  IconCheck,
  IconRefreshCw,
  IconAlertTriangle,
  IconSlash,
  IconFileText,
  IconFilter,
  IconLayers
} from '../lib/icons.jsx';

const DESK_PAGES = [
  { path: '#/exchange', label: 'Exchange Desk', group: 'Trading', icon: IconBuilding },
  { path: '#/desk-queues', label: 'Order Queue Screen (Portal #11)', group: 'Trading', icon: IconLayers },
  { path: '#/desk-dashboard', label: 'Desk Queue Dashboard', group: 'Trading', icon: IconLayers },
  { path: '#/bank', label: 'Bank Desk', group: 'Trading', icon: IconBuilding },
  { path: '#/fx', label: 'Currency Desk', group: 'Trading', icon: IconCurrencyExchange },
  { path: '#/team', label: 'Team Terminal', group: 'Trading', icon: IconTrendingUp },
  { path: '#/market-watch', label: 'Market Watch', group: 'Market', icon: IconBarChart },
  { path: '#/market-intelligence', label: 'Market Intelligence', group: 'Market', icon: IconSearch },
  { path: '#/advisor', label: 'Broker Advisor', group: 'Market', icon: IconBriefcase },
  { path: '#/debate', label: 'Bull vs Bear Arena', group: 'Market', icon: IconScale },
  { path: '#/news', label: 'News Wire Anchor', group: 'Market', icon: IconRadio },
  { path: '#/sebi', label: 'SEBI Surveillance', group: 'Surveillance', icon: IconShieldCheck },
  { path: '#/portfolio', label: 'Portfolios Oversight', group: 'Surveillance', icon: IconFolderOpen },
  { path: '#/journalist', label: 'Journalist Press', group: 'Surveillance', icon: IconNewspaper },
  { path: '#/floor-ops', label: 'Floor Operations', group: 'Operations', icon: IconClipboardList },
  { path: '#/admin', label: 'Floor Director (Admin)', group: 'Operations', icon: IconSettings },
  { path: '#/personnel', label: 'Personnel Management', group: 'Operations', icon: IconUsers },
  { path: '#/results', label: 'Competition Results', group: 'Event', icon: IconTrophy },
  { path: '#/projector', label: 'Auditorium Projector', group: 'Event', icon: IconMonitor }
];

const ROLE_OPTIONS = [
  { id: 'super_admin', label: 'Super Administrator (Master)', badge: 'MASTER', variant: 'warn' },
  { id: 'admin', label: 'Floor Administrator', badge: 'ADMIN', variant: 'info' },
  { id: 'operator_x', label: 'Exchange Matching Operator (Mr. X)', badge: 'EXCHANGE', variant: 'gain' },
  { id: 'bank_teller', label: 'Bank Teller / Cash Officer', badge: 'BANK', variant: 'info' },
  { id: 'verification', label: 'Order Verification Officer', badge: 'VERIFY', variant: 'info' },
  { id: 'advisor', label: 'Floor Market Advisor', badge: 'ADVISOR', variant: 'warn' },
  { id: 'sebi', label: 'SEBI Surveillance Officer', badge: 'REGULATOR', variant: 'loss' },
  { id: 'journalist', label: 'Financial Press Reporter', badge: 'PRESS', variant: 'neutral' },
  { id: 'judge', label: 'Championship Adjudicator', badge: 'JUDGE', variant: 'warn' },
  { id: 'portfolio', label: 'Valuation & Portfolio Officer', badge: 'LEDGER', variant: 'neutral' },
  { id: 'observer', label: 'Gallery Observer', badge: 'OBSERVER', variant: 'neutral' }
];

const DESK_ASSIGN_OPTIONS = [
  { id: 'UNASSIGNED', label: 'None / Floating Staff (Cross-Floor)' },
  { id: 'DESK_1', label: 'Order Desk 1 (Blue Station)' },
  { id: 'DESK_2', label: 'Order Desk 2 (Amber Station)' },
  { id: 'DESK_3', label: 'Order Desk 3 (Emerald Station)' },
  { id: 'DESK_4', label: 'Order Desk 4 (Purple Station)' },
  { id: 'DESK_5', label: 'Order Desk 5 (Crimson Station)' },
  { id: 'BANK_1', label: 'Bank Desk 1 (Vault Station)' },
  { id: 'BANK_2', label: 'Bank Desk 2 (Reserve Station)' }
];

export default function PersonnelManagementPage({ state, adminPassword }) {
  const [personnelList, setPersonnelList] = useState([]);
  const [permissionsMatrix, setPermissionsMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [statusToggleStaff, setStatusToggleStaff] = useState(null);
  const [passwordResetStaff, setPasswordResetStaff] = useState(null);

  // Form states for Provisioning
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState('operator_x');
  const [formDepartment, setFormDepartment] = useState('Central Exchange Operations');
  const [formPassword, setFormPassword] = useState('');
  const [formAssignedDesk, setFormAssignedDesk] = useState('UNASSIGNED');
  const [formSelectedPages, setFormSelectedPages] = useState(['#/exchange', '#/market-watch']);
  const [formPermissions, setFormPermissions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Editing
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editAssignedDesk, setEditAssignedDesk] = useState('UNASSIGNED');
  const [editSelectedPages, setEditSelectedPages] = useState([]);
  const [editPermissions, setEditPermissions] = useState([]);

  // Form states for Password Reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch matrix and personnel directory from authoritative backend
  const loadDirectoryData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const [permRes, staffRes] = await Promise.all([
        apiFetch('/api/permissions/matrix'),
        apiFetch('/api/personnel')
      ]);

      if (permRes.ok) {
        const pData = await permRes.json();
        setPermissionsMatrix(pData);
      }

      if (staffRes.ok) {
        const sData = await staffRes.json();
        if (sData.personnel) {
          setPersonnelList(sData.personnel);
        }
      } else if (state?.personnel) {
        setPersonnelList(state.personnel);
      }
    } catch (err) {
      console.error('Failed to load personnel data:', err);
      if (state?.personnel) {
        setPersonnelList(state.personnel);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
  }, [state?.personnel]);

  // Sync role defaults when role changes in provision modal
  const handleRoleChange = (selectedRole) => {
    setFormRole(selectedRole);
    if (permissionsMatrix?.rolePermissions?.[selectedRole]) {
      setFormPermissions([...permissionsMatrix.rolePermissions[selectedRole]]);
    }
    // Set typical page presets for role
    const presets = {
      super_admin: DESK_PAGES.map(p => p.path),
      admin: ['#/admin', '#/personnel', '#/exchange', '#/bank', '#/desk-queues', '#/desk-dashboard', '#/market-watch', '#/portfolio', '#/results'],
      operator_x: ['#/exchange', '#/desk-queues', '#/desk-dashboard', '#/fx', '#/floor-ops', '#/market-watch', '#/results'],
      bank_teller: ['#/bank', '#/desk-queues', '#/desk-dashboard', '#/market-watch', '#/results'],
      verification: ['#/exchange', '#/desk-queues', '#/desk-dashboard', '#/market-watch', '#/results'],
      advisor: ['#/advisor', '#/debate', '#/market-watch', '#/results'],
      sebi: ['#/sebi', '#/desk-queues', '#/desk-dashboard', '#/floor-ops', '#/portfolio', '#/market-watch', '#/results'],
      journalist: ['#/journalist', '#/news', '#/market-watch', '#/results'],
      judge: ['#/results', '#/market-watch'],
      portfolio: ['#/portfolio', '#/floor-ops', '#/market-watch', '#/results'],
      observer: ['#/market-watch', '#/results', '#/projector']
    };
    if (presets[selectedRole]) {
      setFormSelectedPages(presets[selectedRole]);
    }
  };

  const handleApplyRoleDefaults = () => {
    if (permissionsMatrix?.rolePermissions?.[formRole]) {
      setFormPermissions([...permissionsMatrix.rolePermissions[formRole]]);
    }
  };

  const handleEditRoleDefaults = () => {
    if (permissionsMatrix?.rolePermissions?.[editRole]) {
      setEditPermissions([...permissionsMatrix.rolePermissions[editRole]]);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = personnelList.length;
    const active = personnelList.filter(p => p.status !== 'DISABLED').length;
    const disabled = personnelList.filter(p => p.status === 'DISABLED').length;
    const multiPage = personnelList.filter(p => Array.isArray(p.selectedPages) && p.selectedPages.length > 1).length;
    return { total, active, disabled, multiPage };
  }, [personnelList]);

  // Filtered List
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(staff => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        staff.displayName?.toLowerCase().includes(q) ||
        staff.username?.toLowerCase().includes(q) ||
        staff.staffId?.toLowerCase().includes(q) ||
        staff.department?.toLowerCase().includes(q);

      const matchRole = roleFilter === 'ALL' || staff.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && staff.status !== 'DISABLED') ||
        (statusFilter === 'DISABLED' && staff.status === 'DISABLED');

      return matchSearch && matchRole && matchStatus;
    });
  }, [personnelList, searchQuery, roleFilter, statusFilter]);

  // Provision Staff Account Submission
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!formName.trim() || !formUsername.trim() || !formPassword.trim()) {
      setActionError('Display Name, Username, and Password are required.');
      return;
    }
    if (formPassword.trim().length < 8) {
      setActionError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        displayName: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        role: formRole,
        department: formDepartment.trim() || 'Floor Operations',
        password: formPassword.trim(),
        assignedDesk: formAssignedDesk === 'UNASSIGNED' ? null : formAssignedDesk,
        selectedPages: formSelectedPages,
        permissions: formPermissions
      };

      const res = await apiFetch('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision staff account');
      }

      setActionSuccess(`Account @${data.account.username} provisioned successfully!`);
      setIsProvisionModalOpen(false);
      // Reset form
      setFormName('');
      setFormUsername('');
      setFormPassword('');
      setFormDepartment('Central Exchange Operations');
      setFormRole('operator_x');
      setFormAssignedDesk('UNASSIGNED');
      setFormSelectedPages(['#/exchange', '#/market-watch']);
      setFormPermissions([]);
      loadDirectoryData();
    } catch (err) {
      setActionError(err.message || 'Error provisioning account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditName(staff.displayName || '');
    setEditRole(staff.role || 'operator_x');
    setEditDepartment(staff.department || '');
    setEditAssignedDesk(staff.assignedDesk || 'UNASSIGNED');
    setEditSelectedPages(Array.isArray(staff.selectedPages) ? [...staff.selectedPages] : []);
    setEditPermissions(Array.isArray(staff.permissions) ? [...staff.permissions] : []);
    setActionError('');
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setActionError('');
    setActionSuccess('');
    setIsSubmitting(true);

    try {
      const payload = {
        displayName: editName.trim(),
        role: editRole,
        department: editDepartment.trim(),
        assignedDesk: editAssignedDesk === 'UNASSIGNED' ? null : editAssignedDesk,
        selectedPages: editSelectedPages,
        permissions: editPermissions
      };

      const res = await apiFetch(`/api/personnel/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update staff account');
      }

      setActionSuccess(`Staff account @${editingStaff.username} updated successfully!`);
      setEditingStaff(null);
      loadDirectoryData();
    } catch (err) {
      setActionError(err.message || 'Error updating staff account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Account Status
  const handleStatusToggle = async () => {
    if (!statusToggleStaff) return;
    setActionError('');
    setActionSuccess('');
    setIsSubmitting(true);

    const targetStatus = statusToggleStaff.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';

    try {
      const res = await apiFetch(`/api/personnel/${statusToggleStaff.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reason: `Floor admin toggled status to ${targetStatus}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account status');
      }

      setActionSuccess(`Account @${statusToggleStaff.username} is now ${targetStatus}. Active sessions revoked.`);
      setStatusToggleStaff(null);
      loadDirectoryData();
    } catch (err) {
      setActionError(err.message || 'Error updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password Submit
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!passwordResetStaff) return;
    setActionError('');
    setActionSuccess('');

    if (newPassword.length < 8) {
      setActionError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/personnel/${passwordResetStaff.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setActionSuccess(`Password reset successfully for @${passwordResetStaff.username}.`);
      setPasswordResetStaff(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setActionError(err.message || 'Error resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format timestamp safely
  const formatTime = (ts) => {
    if (!ts) return 'Never';
    try {
      return new Date(ts).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Never';
    }
  };

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px 20px 80px',
      fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      color: 'var(--color-ink-primary)'
    }}>
      {/* Top Header & Breadcrumb */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-brass)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '6px'
          }}>
            <IconBuilding size={14} />
            <span>Floor Operations</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <IconShieldCheck size={14} />
            <span>Access Control & RBAC</span>
          </div>
          <h1 style={{
            margin: '0 0 6px',
            fontSize: '1.85rem',
            fontWeight: 800,
            fontFamily: "var(--font-display, 'Cinzel', serif)",
            color: 'var(--color-ink-primary)',
            letterSpacing: '-0.01em'
          }}>
            Floor Personnel & Access Directory
          </h1>
          <p style={{ margin: 0, color: 'var(--color-ink-secondary)', fontSize: '0.92rem', maxWidth: '680px', lineHeight: 1.5 }}>
            Manage individualized staff credentials, configure multi-page desk authorization, inspect granular permissions, and govern active session lifecycles.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<IconUsers size={16} />}
          onClick={() => {
            setIsProvisionModalOpen(true);
            handleRoleChange('operator_x');
            setActionError('');
          }}
        >
          Provision Staff Account
        </Button>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <Alert
          variant="success"
          onClose={() => setActionSuccess('')}
          style={{ marginBottom: '20px' }}
        >
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert
          variant="danger"
          onClose={() => setActionError('')}
          style={{ marginBottom: '20px' }}
        >
          {actionError}
        </Alert>
      )}

      {/* KPI Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card style={{ padding: '16px 20px', borderTop: '3px solid var(--color-info)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Staff Accounts
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-ink-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Authoritative provisioned records
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', borderTop: '3px solid var(--color-gain)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Operators
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-gain)' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Permitted for floor console login
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', borderTop: '3px solid var(--color-loss)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Deactivated Accounts
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-loss)' }}>
            {stats.disabled}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Revoked from desk access
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', borderTop: '3px solid var(--color-brass)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Multi-Page Assigned
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-brass)' }}>
            {stats.multiPage}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Cross-desk authorization
          </div>
        </Card>
      </div>

      {/* Directory Search & Filters */}
      <Card style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Field */}
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)', pointerEvents: 'none' }}>
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, username (@id), or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="saamx-input"
              style={{
                width: '100%',
                paddingLeft: '38px',
                backgroundColor: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '6px',
                height: '38px',
                fontSize: '0.88rem',
                color: 'var(--color-ink-primary)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            {/* Role Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-ink-secondary)' }}>Role:</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="saamx-select"
                style={{
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '0.85rem',
                  color: 'var(--color-ink-primary)',
                  minWidth: '160px'
                }}
              >
                <option value="ALL">All Roles ({personnelList.length})</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-ink-secondary)' }}>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="saamx-select"
                style={{
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '0.85rem',
                  color: 'var(--color-ink-primary)',
                  minWidth: '130px'
                }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="DISABLED">Deactivated</option>
              </select>
            </div>

            {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                icon={<IconRefreshCw size={12} />}
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Staff Directory Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--color-surface-sunken)',
                borderBottom: '1px solid var(--color-border-subtle)',
                color: 'var(--color-ink-secondary)',
                textTransform: 'uppercase',
                fontSize: '0.74rem',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Staff Member</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Username</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Role</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Station</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Multi-Page Access</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Last Login</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                    Loading personnel directory...
                  </td>
                </tr>
              )}
              {!loading && filteredPersonnel.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                    No personnel accounts match the current filter criteria.
                  </td>
                </tr>
              )}
              {!loading && filteredPersonnel.map(staff => {
                const isSridhara = staff.username?.toLowerCase() === 'sridhara' || staff.id === 'USR_MASTER_01';
                const roleMeta = ROLE_OPTIONS.find(r => r.id === staff.role) || { label: staff.role, badge: staff.role?.toUpperCase(), variant: 'neutral' };
                const pages = Array.isArray(staff.selectedPages) && staff.selectedPages.length > 0 ? staff.selectedPages : [];

                return (
                  <tr
                    key={staff.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Staff Member */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: isSridhara ? 'rgba(212, 175, 55, 0.15)' : 'var(--color-surface-sunken)',
                          border: isSridhara ? '1px solid var(--color-brass)' : '1px solid var(--color-border-subtle)',
                          color: isSridhara ? 'var(--color-brass)' : (staff.role === 'sebi' ? 'var(--color-loss)' : 'var(--color-ink-secondary)'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSridhara ? <IconCrown size={18} /> : (staff.role === 'sebi' ? <IconShieldCheck size={18} /> : (staff.role === 'journalist' ? <IconNewspaper size={18} /> : <IconUser size={18} />))}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-ink-primary)' }}>
                            {staff.displayName || staff.username}
                          </div>
                          <div className="font-mono tabular-nums" style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)' }}>
                            {staff.department || 'Floor Operations'} • {staff.staffId || 'ID-TBD'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td style={{ padding: '14px 18px' }}>
                      <code className="font-mono tabular-nums" style={{
                        backgroundColor: 'var(--color-surface-sunken)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-ink-primary)',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}>
                        @{staff.username}
                      </code>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '14px 18px' }}>
                      <Badge variant={isSridhara ? 'warn' : roleMeta.variant} size="sm">
                        {roleMeta.badge}
                      </Badge>
                    </td>

                    {/* Assigned Station */}
                    <td style={{ padding: '14px 18px' }}>
                      {staff.assignedDesk && staff.assignedDesk !== 'UNASSIGNED' ? (
                        <StationBadge deskId={staff.assignedDesk} size="sm" />
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>Floating</span>
                      )}
                    </td>

                    {/* Multi-Page Access */}
                    <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                      {pages.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {pages.map(p => {
                            const match = DESK_PAGES.find(dp => dp.path === p);
                            const PageIcon = match?.icon || IconFileText;
                            return (
                              <span
                                key={p}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--color-surface-sunken)',
                                  border: '1px solid var(--color-border-subtle)',
                                  color: 'var(--color-ink-secondary)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={p}
                              >
                                <PageIcon size={12} />
                                <span>{match?.label || p.replace('#/', '')}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                          Role Defaults ({staff.role})
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <Badge variant={staff.status === 'DISABLED' ? 'danger' : 'gain'} size="sm">
                        <span style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'currentColor',
                          marginRight: '6px'
                        }} />
                        {staff.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE'}
                      </Badge>
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: '14px 18px', color: 'var(--color-ink-muted)', fontSize: '0.80rem' }}>
                      <span className="font-mono tabular-nums">{formatTime(staff.lastLogin)}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconSettings size={12} />}
                          onClick={() => openEditModal(staff)}
                          title="Edit staff access & permissions"
                        >
                          Edit
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconLock size={12} />}
                          onClick={() => setPasswordResetStaff(staff)}
                          title="Reset staff password"
                        >
                          Reset
                        </Button>

                        <Button
                          variant={staff.status === 'DISABLED' ? 'primary' : 'danger'}
                          size="sm"
                          icon={staff.status === 'DISABLED' ? <IconCheck size={12} /> : <IconSlash size={12} />}
                          disabled={isSridhara}
                          onClick={() => setStatusToggleStaff(staff)}
                          title={isSridhara ? 'Master super-admin cannot be deactivated' : (staff.status === 'DISABLED' ? 'Reactivate account' : 'Deactivate account')}
                        >
                          {staff.status === 'DISABLED' ? 'Reactivate' : 'Deactivate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 1. PROVISION STAFF MODAL                                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        title="Provision New Staff Account"
        subtitle="Create individualized operator credentials with multi-page access. No email or phone fields."
        size="lg"
      >
        <form onSubmit={handleProvisionSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Display Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="saamx-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Username (@identifier) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. priya_exchange"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="saamx-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Primary Role *
              </label>
              <select
                value={formRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="saamx-select"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Department / Floor Wing
              </label>
              <input
                type="text"
                placeholder="e.g. Central Matching Desk"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="saamx-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Assigned Trading Desk Station
              </label>
              <select
                value={formAssignedDesk}
                onChange={(e) => setFormAssignedDesk(e.target.value)}
                className="saamx-select"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              >
                {DESK_ASSIGN_OPTIONS.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Initial Password / PIN (Min 8 chars) *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter secure initial password..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="saamx-input"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    color: 'var(--color-ink-primary)'
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
          </div>

          {/* Multi-Page Access Selector */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-ink-primary)' }}>Multi-Page Desk Access</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginLeft: '8px' }}>
                  Selected pages will be authorized and visible in navigation
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormSelectedPages(DESK_PAGES.map(p => p.path))}
                  style={{ background: 'none', border: 'none', color: 'var(--color-brass)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--color-border-subtle)' }}>|</span>
                <button
                  type="button"
                  onClick={() => setFormSelectedPages([])}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
              {DESK_PAGES.map(page => {
                const isChecked = formSelectedPages.includes(page.path);
                const PageIcon = page.icon;
                return (
                  <label
                    key={page.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isChecked ? 'var(--color-surface)' : 'transparent',
                      border: isChecked ? '1px solid var(--color-brass)' : '1px solid var(--color-border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.80rem',
                      fontWeight: isChecked ? 700 : 500,
                      color: isChecked ? 'var(--color-ink-primary)' : 'var(--color-ink-secondary)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormSelectedPages([...formSelectedPages, page.path]);
                        } else {
                          setFormSelectedPages(formSelectedPages.filter(p => p !== page.path));
                        }
                      }}
                    />
                    <PageIcon size={14} />
                    <span>{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Granular Permissions Section */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-ink-primary)' }}>Granular Permission Grants</span>
                <span className="font-mono tabular-nums" style={{ fontSize: '0.76rem', color: 'var(--color-ink-muted)', marginLeft: '8px' }}>
                  ({formPermissions.length} granted)
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<IconRefreshCw size={12} />}
                onClick={handleApplyRoleDefaults}
              >
                Reset to Role Defaults
              </Button>
            </div>

            {permissionsMatrix?.groups?.map(group => {
              const defs = (permissionsMatrix.definitions || []).filter(d => d.group === group.id);
              if (defs.length === 0) return null;

              return (
                <div key={group.id} style={{ marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: 'var(--color-brass)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px'
                  }}>
                    {group.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                    {defs.map(def => {
                      const isChecked = formPermissions.includes(def.id);
                      return (
                        <label
                          key={def.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: isChecked ? 'var(--color-surface)' : 'transparent',
                            border: isChecked ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border-subtle)',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormPermissions([...formPermissions, def.id]);
                              } else {
                                setFormPermissions(formPermissions.filter(p => p !== def.id));
                              }
                            }}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-ink-primary)' }}>{def.label}</div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)' }}>{def.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProvisionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Provision Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. EDIT STAFF MODAL                                      */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title={`Edit Staff Access: @${editingStaff?.username || ''}`}
        subtitle="Update assigned desk pages, primary role, and granular permission overrides."
        size="lg"
      >
        {editingStaff && (
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="saamx-input"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    color: 'var(--color-ink-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                  Department
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="saamx-input"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    color: 'var(--color-ink-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                  Primary Role
                </label>
                <select
                  value={editRole}
                  disabled={editingStaff.username?.toLowerCase() === 'sridhara'}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="saamx-select"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    color: 'var(--color-ink-primary)'
                  }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                  Assigned Trading Desk Station
                </label>
                <select
                  value={editAssignedDesk}
                  onChange={(e) => setEditAssignedDesk(e.target.value)}
                  className="saamx-select"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    color: 'var(--color-ink-primary)'
                  }}
                >
                  {DESK_ASSIGN_OPTIONS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multi-Page Selector */}
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-ink-primary)' }}>Assigned Desk Pages</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditSelectedPages(DESK_PAGES.map(p => p.path))}
                    style={{ background: 'none', border: 'none', color: 'var(--color-brass)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--color-border-subtle)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setEditSelectedPages([])}
                    style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px' }}>
                {DESK_PAGES.map(page => {
                  const isChecked = editSelectedPages.includes(page.path);
                  const PageIcon = page.icon;
                  return (
                    <label
                      key={page.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? 'var(--color-surface)' : 'transparent',
                        border: isChecked ? '1px solid var(--color-brass)' : '1px solid var(--color-border-subtle)',
                        cursor: 'pointer',
                        fontSize: '0.80rem',
                        fontWeight: isChecked ? 700 : 500,
                        color: isChecked ? 'var(--color-ink-primary)' : 'var(--color-ink-secondary)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditSelectedPages([...editSelectedPages, page.path]);
                          } else {
                            setEditSelectedPages(editSelectedPages.filter(p => p !== page.path));
                          }
                        }}
                      />
                      <PageIcon size={14} />
                      <span>{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Granular Permissions Section */}
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-ink-primary)' }}>
                  Granular Permission Overrides <span className="font-mono tabular-nums">({editPermissions.length} granted)</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<IconRefreshCw size={12} />}
                  onClick={handleEditRoleDefaults}
                >
                  Reset to Role Defaults
                </Button>
              </div>

              {permissionsMatrix?.groups?.map(group => {
                const defs = (permissionsMatrix.definitions || []).filter(d => d.group === group.id);
                if (defs.length === 0) return null;

                return (
                  <div key={group.id} style={{ marginBottom: '14px' }}>
                    <div style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: 'var(--color-brass)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '6px'
                    }}>
                      {group.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                      {defs.map(def => {
                        const isChecked = editPermissions.includes(def.id);
                        return (
                          <label
                            key={def.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: isChecked ? 'var(--color-surface)' : 'transparent',
                              border: isChecked ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border-subtle)',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditPermissions([...editPermissions, def.id]);
                                } else {
                                  setEditPermissions(editPermissions.filter(p => p !== def.id));
                                }
                              }}
                              style={{ marginTop: '2px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-ink-primary)' }}>{def.label}</div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--color-ink-muted)' }}>{def.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingStaff(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 3. STATUS TOGGLE CONFIRMATION MODAL                      */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!statusToggleStaff}
        onClose={() => setStatusToggleStaff(null)}
        title={statusToggleStaff?.status === 'DISABLED' ? 'Reactivate Staff Account?' : 'Deactivate Staff Account?'}
        size="sm"
      >
        {statusToggleStaff && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: statusToggleStaff.status === 'DISABLED' ? 'var(--color-gain-subtle, rgba(16,185,129,0.1))' : 'var(--color-loss-subtle, rgba(239,68,68,0.1))',
              color: statusToggleStaff.status === 'DISABLED' ? 'var(--color-gain)' : 'var(--color-loss)',
              marginBottom: '16px'
            }}>
              {statusToggleStaff.status === 'DISABLED' ? <IconCheck size={24} /> : <IconAlertTriangle size={24} />}
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                {statusToggleStaff.status === 'DISABLED'
                  ? `Reactivating @${statusToggleStaff.username} will permit login immediately.`
                  : `Deactivating @${statusToggleStaff.username} will immediately revoke all active sessions.`}
              </div>
            </div>

            <p style={{ margin: '0 0 20px', color: 'var(--color-ink-secondary)', lineHeight: 1.5, fontSize: '0.88rem' }}>
              {statusToggleStaff.status === 'DISABLED' ? (
                <>Reactivating <strong>@{statusToggleStaff.username}</strong> will allow them to authenticate and access their assigned desks immediately.</>
              ) : (
                <>Deactivating <strong>@{statusToggleStaff.username}</strong> will <strong>immediately revoke all active sessions</strong> and disconnect any connected desk terminals.</>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusToggleStaff(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={statusToggleStaff.status === 'DISABLED' ? 'primary' : 'danger'}
                loading={isSubmitting}
                onClick={handleStatusToggle}
              >
                {statusToggleStaff.status === 'DISABLED' ? 'Confirm Reactivation' : 'Confirm Deactivation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 4. PASSWORD RESET MODAL                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!passwordResetStaff}
        onClose={() => {
          setPasswordResetStaff(null);
          setNewPassword('');
          setConfirmPassword('');
        }}
        title={`Reset Password: @${passwordResetStaff?.username || ''}`}
        subtitle="Set a new secure access password or PIN for this staff member."
        size="sm"
      >
        {passwordResetStaff && (
          <form onSubmit={handlePasswordResetSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="saamx-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-ink-secondary)' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="saamx-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  color: 'var(--color-ink-primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPasswordResetStaff(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
