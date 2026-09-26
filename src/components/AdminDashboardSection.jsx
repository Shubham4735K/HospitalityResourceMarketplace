import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

export default function AdminDashboardSection({ onBrowseResources, currentUser }) {
  // Navigation tab state: 'analytics' | 'users' | 'resources'
  const [activeTab, setActiveTab] = useState('analytics');

  // ---------------------------------------------------------------------------
  // 1. Analytics State
  // ---------------------------------------------------------------------------
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/analytics');
      setAnalytics(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
      const errMsg =
        err.status === 403
          ? 'Access forbidden. Administrator privileges are required.'
          : err.status === 401
          ? 'Authentication required. Please sign in as an admin.'
          : err.message || 'Unable to load marketplace analytics.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. User Management State
  // ---------------------------------------------------------------------------
  const [users, setUsers] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userActionMsg, setUserActionMsg] = useState(null);
  const [userActionError, setUserActionError] = useState(null);

  // Role edit modal state
  const [roleModal, setRoleModal] = useState({
    open: false,
    user: null,
    newRole: 'seeker'
  });

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await api.get('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin users:', err);
      const errMsg =
        err.status === 403
          ? 'Access forbidden. Administrator privileges are required.'
          : err.status === 401
          ? 'Authentication required. Please sign in as an admin.'
          : err.message || 'Unable to load marketplace users.';
      setUsersError(errMsg);
    } finally {
      setUsersLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Resource Moderation State
  // ---------------------------------------------------------------------------
  const [adminResources, setAdminResources] = useState(null);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState(null);
  const [resSearchQuery, setResSearchQuery] = useState('');
  const [resCategoryFilter, setResCategoryFilter] = useState('all');
  const [resStatusFilter, setResStatusFilter] = useState('all');
  const [resActionMsg, setResActionMsg] = useState(null);
  const [resActionError, setResActionError] = useState(null);

  const fetchAdminResources = async () => {
    setResLoading(true);
    setResError(null);
    try {
      const data = await api.get('/admin/resources');
      setAdminResources(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin resources:', err);
      const errMsg =
        err.status === 403
          ? 'Access forbidden. Administrator privileges are required.'
          : err.status === 401
          ? 'Authentication required. Please sign in as an admin.'
          : err.message || 'Unable to load resources for moderation.';
      setResError(errMsg);
    } finally {
      setResLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Audit Activity State (Phase 15.3)
  // ---------------------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchAuditLogs = async (page = 1) => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (auditActionFilter && auditActionFilter !== 'all') {
        params.set('action', auditActionFilter);
      }
      if (auditTargetTypeFilter && auditTargetTypeFilter !== 'all') {
        params.set('targetType', auditTargetTypeFilter);
      }
      if (auditStartDate) {
        params.set('startDate', auditStartDate);
      }
      if (auditEndDate) {
        params.set('endDate', auditEndDate);
      }

      const data = await api.get(`/admin/audit-logs?${params.toString()}`);
      setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
      if (data.pagination) {
        setAuditPagination(data.pagination);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      const errMsg =
        err.status === 403
          ? 'Access forbidden. Administrator privileges are required.'
          : err.status === 401
          ? 'Authentication required. Please sign in as an admin.'
          : err.message || 'Unable to load platform audit logs.';
      setAuditError(errMsg);
    } finally {
      setAuditLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Confirmation Dialog Modal State
  // ---------------------------------------------------------------------------
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmBtnClass: 'btn-confirm',
    onConfirm: null,
    isProcessing: false
  });

  // Tab change & lazy loading
  useEffect(() => {
    if (activeTab === 'analytics') {
      if (!analytics) fetchAnalytics();
    } else if (activeTab === 'users') {
      if (!users) fetchUsers();
    } else if (activeTab === 'resources') {
      if (!adminResources) fetchAdminResources();
    } else if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
  }, [activeTab, auditActionFilter, auditTargetTypeFilter, auditStartDate, auditEndDate]);

  // Master refresh button handler
  const handleRefresh = () => {
    if (activeTab === 'analytics') fetchAnalytics();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'resources') fetchAdminResources();
    else if (activeTab === 'audit') fetchAuditLogs(auditPagination.page);
  };

  const isCurrentTabLoading =
    (activeTab === 'analytics' && loading) ||
    (activeTab === 'users' && usersLoading) ||
    (activeTab === 'resources' && resLoading) ||
    (activeTab === 'audit' && auditLoading);

  const formatCurrency = (amount) => {
    return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Helper for status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Accepted':
        return 'badge-accepted';
      case 'Confirmed':
        return 'badge-confirmed';
      case 'Completed':
        return 'badge-completed';
      case 'Cancelled':
        return 'badge-cancelled';
      case 'Rejected':
        return 'badge-rejected';
      case 'Counter-Offered':
        return 'badge-counter';
      default:
        return 'badge-default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#f59e0b';
      case 'Accepted':
        return '#3b82f6';
      case 'Confirmed':
        return '#10b981';
      case 'Completed':
        return '#8b5cf6';
      case 'Cancelled':
        return '#ef4444';
      case 'Rejected':
        return '#64748b';
      case 'Counter-Offered':
        return '#ec4899';
      default:
        return '#94a3b8';
    }
  };

  // Helper for user role badge
  const renderUserRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-admin-role">👑 Admin</span>;
      case 'provider':
        return <span className="badge badge-blue">🏢 Provider</span>;
      case 'seeker':
        return <span className="badge badge-emerald">🔍 Seeker</span>;
      case 'both':
        return <span className="badge badge-purple">🔄 Seeker & Provider</span>;
      default:
        return <span className="badge badge-default">{role}</span>;
    }
  };

  // Helper for user status badge
  const renderUserStatusBadge = (status) => {
    const s = status || 'Active';
    switch (s) {
      case 'Active':
        return <span className="badge badge-emerald">✓ Active</span>;
      case 'Suspended':
        return <span className="badge badge-rejected">⚠ Suspended</span>;
      case 'Inactive':
        return <span className="badge badge-cancelled">○ Inactive</span>;
      default:
        return <span className="badge badge-default">{s}</span>;
    }
  };

  // Helper for audit timestamp formatting
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Helper for audit action badges
  const renderAuditActionBadge = (action) => {
    switch (action) {
      case 'USER_ROLE_CHANGED':
        return <span className="badge badge-purple">👤 Role Changed</span>;
      case 'USER_DEACTIVATED':
        return <span className="badge badge-cancelled">🚫 User Deactivated</span>;
      case 'RESOURCE_DISABLED':
        return <span className="badge badge-cancelled">🔒 Resource Disabled</span>;
      case 'RESOURCE_ENABLED':
        return <span className="badge badge-confirmed">🔓 Resource Enabled</span>;
      case 'BOOKING_CONFIRMED':
        return <span className="badge badge-confirmed">✅ Booking Confirmed</span>;
      case 'BOOKING_ACCEPTED':
        return <span className="badge badge-accepted">👍 Booking Accepted</span>;
      case 'BOOKING_REJECTED':
        return <span className="badge badge-rejected">❌ Booking Rejected</span>;
      case 'BOOKING_CANCELLED':
        return <span className="badge badge-cancelled">⚠️ Booking Cancelled</span>;
      case 'BOOKING_COMPLETED':
        return <span className="badge badge-completed">🎉 Booking Completed</span>;
      case 'BOOKING_COUNTER_OFFERED':
        return <span className="badge badge-counter">🔄 Counter-Offer</span>;
      case 'PAYMENT_RECEIVED':
        return <span className="badge badge-emerald">💰 Payment Received</span>;
      case 'PAYMENT_REFUNDED':
        return <span className="badge badge-amber">💸 Payment Refunded</span>;
      default:
        return <span className="badge badge-default">{action}</span>;
    }
  };

  // Helper for audit target pill
  const renderAuditTargetBadge = (targetType, targetId) => {
    let icon = '🏷️';
    if (targetType === 'User') icon = '👤';
    else if (targetType === 'Resource') icon = '📦';
    else if (targetType === 'Booking') icon = '📅';
    else if (targetType === 'Payment') icon = '💳';

    return (
      <span className="audit-target-pill">
        <span className="audit-target-type">{icon} {targetType}</span>
        <code className="audit-target-id" title={targetId}>
          {targetId ? (targetId.length > 12 ? `${targetId.slice(0, 6)}…${targetId.slice(-4)}` : targetId) : '—'}
        </code>
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // User Management Actions
  // ---------------------------------------------------------------------------
  const handleOpenRoleModal = (targetUser) => {
    setUserActionError(null);
    setUserActionMsg(null);
    setRoleModal({
      open: true,
      user: targetUser,
      newRole: targetUser.role || 'seeker'
    });
  };

  const handleRoleChangeSubmit = (e) => {
    e.preventDefault();
    if (!roleModal.user) return;

    const targetUser = roleModal.user;
    const newRole = roleModal.newRole;

    if (targetUser.role === newRole) {
      setRoleModal({ open: false, user: null, newRole: 'seeker' });
      return;
    }

    // Check self-demotion on frontend
    const isSelf =
      currentUser &&
      ((currentUser._id && currentUser._id.toString() === targetUser._id?.toString()) ||
        (currentUser.id && currentUser.id.toString() === targetUser._id?.toString()) ||
        (currentUser.email &&
          currentUser.email.toLowerCase() === targetUser.email?.toLowerCase()));

    if (isSelf && newRole !== 'admin') {
      setUserActionError('Action blocked: You cannot demote your own platform administrator account.');
      return;
    }

    // Open confirmation dialog
    setConfirmModal({
      open: true,
      title: 'Confirm User Role Change',
      message: `Are you sure you want to change the role for ${targetUser.fullName || targetUser.email} from "${targetUser.role}" to "${newRole}"?`,
      confirmText: 'Change Role',
      confirmBtnClass: 'btn-confirm',
      isProcessing: false,
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
          const res = await api.patch(`/admin/users/${targetUser._id}/role`, { role: newRole });
          setUserActionMsg(res.message || `User role updated to ${newRole} successfully.`);
          setUserActionError(null);
          setRoleModal({ open: false, user: null, newRole: 'seeker' });
          setConfirmModal({
            open: false,
            title: '',
            message: '',
            confirmText: 'Confirm',
            confirmBtnClass: 'btn-confirm',
            onConfirm: null,
            isProcessing: false
          });
          await fetchUsers();
        } catch (err) {
          setUserActionError(err.message || 'Failed to update user role.');
          setConfirmModal({
            open: false,
            title: '',
            message: '',
            confirmText: 'Confirm',
            confirmBtnClass: 'btn-confirm',
            onConfirm: null,
            isProcessing: false
          });
        }
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Resource Moderation Actions
  // ---------------------------------------------------------------------------
  const handleToggleResourceStatus = (resItem) => {
    setResActionError(null);
    setResActionMsg(null);
    const willDisable = !resItem.disabled;

    setConfirmModal({
      open: true,
      title: willDisable ? 'Disable Marketplace Resource' : 'Enable Marketplace Resource',
      message: willDisable
        ? `Are you sure you want to disable "${resItem.title}"? Normal users will not be able to submit new inquiries or confirm reservations for it. Historical data and existing bookings will be safely preserved.`
        : `Are you sure you want to enable "${resItem.title}"? The resource will become active and available for marketplace inquiries and bookings again.`,
      confirmText: willDisable ? 'Disable Resource' : 'Enable Resource',
      confirmBtnClass: willDisable ? 'btn-reject' : 'btn-accept',
      isProcessing: false,
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
          const resId = resItem._id || resItem.id;
          const response = await api.patch(`/admin/resources/${resId}/status`, {
            disabled: willDisable
          });
          setResActionMsg(
            response.message ||
              `Resource "${resItem.title}" ${willDisable ? 'disabled' : 'enabled'} successfully.`
          );
          setResActionError(null);
          setConfirmModal({
            open: false,
            title: '',
            message: '',
            confirmText: 'Confirm',
            confirmBtnClass: 'btn-confirm',
            onConfirm: null,
            isProcessing: false
          });
          await fetchAdminResources();
        } catch (err) {
          setResActionError(err.message || 'Failed to update resource moderation status.');
          setConfirmModal({
            open: false,
            title: '',
            message: '',
            confirmText: 'Confirm',
            confirmBtnClass: 'btn-confirm',
            onConfirm: null,
            isProcessing: false
          });
        }
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Data Filtering
  // ---------------------------------------------------------------------------
  const overview = analytics?.overview || {
    totalResources: 0,
    availableResources: 0,
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalPaidRevenue: 0,
    totalRefundedAmount: 0,
    netRevenue: 0
  };

  const requestsByStatus = analytics?.requestsByStatus || [];
  const monthlyBookings = analytics?.monthlyBookings || [];
  const resourceUtilization = analytics?.resourceUtilization || [];
  const recentActivity = analytics?.recentActivity || [];

  // Filter utilization by search query in analytics tab
  const filteredUtilization = resourceUtilization.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.hostBusiness && item.hostBusiness.toLowerCase().includes(q)) ||
      (item.resourceId && item.resourceId.toLowerCase().includes(q))
    );
  });

  // Filter users in user management tab
  const filteredUsers = (users || []).filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.businessName && u.businessName.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'all' || (u.status || 'Active') === userStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter resources in resource moderation tab
  const resourceCategories = [
    'all',
    ...Array.from(new Set((adminResources || []).map((r) => r.category).filter(Boolean)))
  ];

  const filteredAdminResources = (adminResources || []).filter((r) => {
    const q = resSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.hostBusiness && r.hostBusiness.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r._id && r._id.toLowerCase().includes(q));

    const matchesCategory = resCategoryFilter === 'all' || r.category === resCategoryFilter;
    const matchesStatus =
      resStatusFilter === 'all' ||
      (resStatusFilter === 'disabled' ? Boolean(r.disabled) : !r.disabled);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Self check for role modal
  const isEditingSelf =
    Boolean(roleModal.user && currentUser) &&
    ((currentUser._id && currentUser._id.toString() === roleModal.user._id?.toString()) ||
      (currentUser.id && currentUser.id.toString() === roleModal.user._id?.toString()) ||
      (currentUser.email &&
        currentUser.email.toLowerCase() === roleModal.user.email?.toLowerCase()));

  return (
    <section className="admin-dashboard-section" aria-label="Admin Control & Analytics Dashboard">
      <div className="container">
        {/* Top Header Row */}
        <div className="admin-dashboard-header">
          <div>
            <div className="admin-badge-container">
              <span className="badge badge-admin-role">👑 Platform Administrator</span>
              {lastRefreshed && (
                <span className="admin-refresh-timestamp">
                  Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="admin-dashboard-title">Marketplace Administration & Control</h1>
            <p className="admin-dashboard-subtitle">
              Manage platform users, moderate shared hospitality assets, and monitor real-time utilization & monetization metrics.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-refresh-analytics"
              onClick={handleRefresh}
              disabled={isCurrentTabLoading}
              aria-label="Refresh current section data"
            >
              <span className={isCurrentTabLoading ? 'spinning-icon' : ''}>🔄</span>{' '}
              {isCurrentTabLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="admin-nav-tabs" role="tablist" aria-label="Admin Navigation Tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'analytics'}
            className={`admin-nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics & Metrics
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            className={`admin-nav-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'resources'}
            className={`admin-nav-tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            📦 Resource Moderation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audit'}
            className={`admin-nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Audit Activity
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: ANALYTICS                                                  */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <>
            {/* Error State */}
            {error && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <div>
                    <strong>Analytics Error:</strong> {error}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchAnalytics}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State Skeleton */}
            {loading && !analytics && (
              <div className="admin-skeleton-container" aria-busy="true" aria-live="polite">
                <div className="admin-kpi-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="admin-kpi-card skeleton-card">
                      <div className="skeleton-line skeleton-title"></div>
                      <div className="skeleton-line skeleton-value"></div>
                      <div className="skeleton-line skeleton-desc"></div>
                    </div>
                  ))}
                </div>
                <div className="admin-charts-grid">
                  <div className="admin-card skeleton-card chart-skeleton"></div>
                  <div className="admin-card skeleton-card chart-skeleton"></div>
                </div>
              </div>
            )}

            {/* Analytics Content */}
            {analytics && (
              <>
                {/* 1. Overview KPI Cards */}
                <div className="admin-kpi-grid">
                  {/* Card 1: Marketplace Inventory */}
                  <div className="admin-kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-label">Marketplace Inventory</span>
                      <span className="kpi-icon-badge">🏢</span>
                    </div>
                    <div className="kpi-metric-row">
                      <div className="kpi-big-value">{overview.totalResources}</div>
                      <div className="kpi-badge-group">
                        <span className="kpi-sub-badge badge-emerald">
                          {overview.availableResources} Available
                        </span>
                      </div>
                    </div>
                    <div className="kpi-footer-text">
                      Shared commercial kitchens, venues, and specialized equipment
                    </div>
                  </div>

                  {/* Card 2: Inquiry Pipeline */}
                  <div className="admin-kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-label">Total Inquiries</span>
                      <span className="kpi-icon-badge">📩</span>
                    </div>
                    <div className="kpi-metric-row">
                      <div className="kpi-big-value">{overview.totalRequests}</div>
                      <div className="kpi-badge-group">
                        <span className="kpi-sub-badge badge-amber">
                          {overview.pendingRequests} Pending
                        </span>
                        <span className="kpi-sub-badge badge-blue">
                          {overview.acceptedRequests} Accepted
                        </span>
                      </div>
                    </div>
                    <div className="kpi-footer-text">
                      B2B requests submitted across all marketplace categories
                    </div>
                  </div>

                  {/* Card 3: Booking Lifecycle */}
                  <div className="admin-kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-label">Confirmed & Completed</span>
                      <span className="kpi-icon-badge">📅</span>
                    </div>
                    <div className="kpi-metric-row">
                      <div className="kpi-big-value">
                        {overview.confirmedBookings + overview.completedBookings}
                      </div>
                      <div className="kpi-badge-group">
                        <span className="kpi-sub-badge badge-emerald">
                          {overview.confirmedBookings} Confirmed
                        </span>
                        <span className="kpi-sub-badge badge-purple">
                          {overview.completedBookings} Completed
                        </span>
                      </div>
                    </div>
                    <div className="kpi-footer-text">
                      {overview.cancelledBookings} cancelled bookings handled safely
                    </div>
                  </div>

                  {/* Card 4: Platform Financials */}
                  <div className="admin-kpi-card kpi-card-highlight">
                    <div className="kpi-card-header">
                      <span className="kpi-label">Paid Revenue</span>
                      <span className="kpi-icon-badge">💰</span>
                    </div>
                    <div className="kpi-metric-row">
                      <div className="kpi-big-value kpi-gold">
                        {formatCurrency(overview.totalPaidRevenue)}
                      </div>
                    </div>
                    <div className="kpi-footer-text kpi-financial-footer">
                      <span>Refunded: {formatCurrency(overview.totalRefundedAmount)}</span>
                      <span>•</span>
                      <span>Net: {formatCurrency(overview.netRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Visual Trends Section */}
                <div className="admin-charts-grid">
                  {/* Card A: Request Pipeline Distribution */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Inquiry Status Breakdown</h3>
                        <p className="admin-card-subtitle">
                          Distribution of all {overview.totalRequests} marketplace inquiries
                        </p>
                      </div>
                    </div>

                    {/* Horizontal Segmented Progress Bar */}
                    {overview.totalRequests > 0 ? (
                      <div className="status-progress-track" title="Status Distribution">
                        {requestsByStatus.map((item) => {
                          if (item.percentage <= 0) return null;
                          return (
                            <div
                              key={item.status}
                              className="status-progress-segment"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: getStatusColor(item.status)
                              }}
                              title={`${item.status}: ${item.count} (${item.percentage}%)`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-empty-state-mini">No inquiries submitted yet.</div>
                    )}

                    {/* Status Items List */}
                    <div className="status-legend-grid">
                      {requestsByStatus.map((item) => (
                        <div key={item.status} className="status-legend-item">
                          <div className="status-legend-header">
                            <span
                              className="status-color-dot"
                              style={{ backgroundColor: getStatusColor(item.status) }}
                            />
                            <span className="status-legend-name">{item.status}</span>
                          </div>
                          <div className="status-legend-values">
                            <span className="status-count-val">{item.count}</span>
                            <span className="status-percent-val">({item.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card B: Monthly Booking Trends */}
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Monthly Booking Activity</h3>
                        <p className="admin-card-subtitle">
                          Chronological inquiry volume and completed booking conversions
                        </p>
                      </div>
                    </div>

                    {monthlyBookings.length === 0 ? (
                      <div className="admin-empty-state-mini">
                        <p>No monthly activity recorded yet.</p>
                      </div>
                    ) : (
                      <div className="monthly-bars-container">
                        {monthlyBookings.map((monthItem) => {
                          const maxRequests = Math.max(...monthlyBookings.map((m) => m.requests), 1);
                          const barHeightPercent = Math.max(
                            Math.round((monthItem.requests / maxRequests) * 100),
                            15
                          );

                          return (
                            <div key={monthItem.month} className="monthly-bar-col">
                              <div className="monthly-bar-visual-wrap">
                                <div className="monthly-bar-metrics-tooltip">
                                  <div><strong>{monthItem.label}</strong></div>
                                  <div>Requests: {monthItem.requests}</div>
                                  <div>Bookings: {monthItem.bookings}</div>
                                  <div>Revenue: {formatCurrency(monthItem.revenue)}</div>
                                </div>

                                <div
                                  className="monthly-bar-pill"
                                  style={{ height: `${barHeightPercent}%` }}
                                >
                                  <div
                                    className="monthly-bar-inner-booking"
                                    style={{
                                      height: `${
                                        monthItem.requests > 0
                                          ? Math.min((monthItem.bookings / monthItem.requests) * 100, 100)
                                          : 0
                                      }%`
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="monthly-bar-label">{monthItem.label}</div>
                              <div className="monthly-bar-sub">
                                {monthItem.requests} req / {monthItem.bookings} book
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Resource Utilization Matrix */}
                <div className="admin-card">
                  <div className="admin-card-header admin-table-header">
                    <div>
                      <h3 className="admin-card-title">Resource Utilization & Monetization</h3>
                      <p className="admin-card-subtitle">
                        Tracking booking conversion rate ((Confirmed + Completed) / Total Inquiries) and revenue generated per resource
                      </p>
                    </div>

                    <div className="admin-table-search">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search resource, host, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search resource utilization table"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="admin-search-clear"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="admin-table-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Resource Asset</th>
                          <th>Category & Host</th>
                          <th className="text-center">Rate</th>
                          <th className="text-center">Inquiries</th>
                          <th className="text-center">Bookings</th>
                          <th title="Booking conversion: (Confirmed + Completed) / Inquiries">
                            Utilization (Conversion)
                          </th>
                          <th className="text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUtilization.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center admin-table-empty">
                              No matching resources found.
                            </td>
                          </tr>
                        ) : (
                          filteredUtilization.map((resItem) => {
                            const hasBookings = resItem.bookingCount > 0;
                            return (
                              <tr key={resItem.resourceId}>
                                <td>
                                  <div className="res-title-cell">
                                    <span className="res-id-badge">{resItem.resourceId}</span>
                                    <span className="res-title-text">{resItem.title}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="res-category-cell">
                                    <span className="res-category-name">{resItem.category}</span>
                                    <span className="res-host-name">{resItem.hostBusiness}</span>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <span className="res-rate-text">
                                    ₹{resItem.rate}/{resItem.rateUnit || 'hr'}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="metric-count-pill">{resItem.totalRequests}</span>
                                </td>
                                <td className="text-center">
                                  <span
                                    className={`metric-count-pill ${
                                      hasBookings ? 'count-active' : ''
                                    }`}
                                  >
                                    {resItem.bookingCount}
                                  </span>
                                </td>
                                <td>
                                  <div
                                    className="utilization-cell"
                                    title={`Booking conversion: ${resItem.bookingCount} of ${resItem.totalRequests} inquiries booked (${resItem.utilizationPercentage}%)`}
                                  >
                                    <div className="utilization-bar-bg">
                                      <div
                                        className="utilization-bar-fill"
                                        style={{
                                          width: `${Math.min(resItem.utilizationPercentage, 100)}%`,
                                          backgroundColor:
                                            resItem.utilizationPercentage >= 50
                                              ? '#10b981'
                                              : resItem.utilizationPercentage > 0
                                              ? '#f59e0b'
                                              : '#475569'
                                        }}
                                      />
                                    </div>
                                    <span className="utilization-pct-text">
                                      {resItem.utilizationPercentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="text-right">
                                  <span className="res-revenue-val">
                                    {formatCurrency(resItem.revenue)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Recent Marketplace Activity */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3 className="admin-card-title">Recent Activity Feed</h3>
                      <p className="admin-card-subtitle">
                        Latest incoming inquiries, booking lifecycle shifts, and settlement actions
                      </p>
                    </div>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="admin-empty-state-mini">
                      <p>No recent activity recorded.</p>
                    </div>
                  ) : (
                    <div className="admin-table-responsive">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Resource</th>
                            <th>Requesting Seeker / Business</th>
                            <th>Requested Date</th>
                            <th className="text-center">Booking Status</th>
                            <th className="text-center">Payment Status</th>
                            <th className="text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((act) => (
                            <tr key={act.id}>
                              <td>
                                <div className="res-title-cell">
                                  <span className="res-id-badge">{act.resource.id}</span>
                                  <span className="res-title-text">{act.resource.title}</span>
                                </div>
                              </td>
                              <td>
                                <div className="res-seeker-cell">
                                  <span className="seeker-name">{act.seeker.name}</span>
                                  {act.seeker.businessName && (
                                    <span className="seeker-business">
                                      {act.seeker.businessName}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="date-pill">{act.date}</span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${getStatusBadgeClass(act.status)}`}>
                                  {act.status}
                                </span>
                              </td>
                              <td className="text-center">
                                {act.payment.status === 'Paid' ? (
                                  <span className="badge badge-paid">✓ Paid</span>
                                ) : act.payment.status === 'Refunded' ? (
                                  <span className="badge badge-refunded">↩ Refunded</span>
                                ) : (
                                  <span className="badge badge-payment-pending">Pending</span>
                                )}
                              </td>
                              <td className="text-right">
                                <span className="res-revenue-val">
                                  {act.payment.amount > 0
                                    ? formatCurrency(act.payment.amount)
                                    : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 2: USER MANAGEMENT                                            */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="admin-users-view">
            {/* Action Feedback Messages */}
            {userActionMsg && (
              <div className="admin-success-banner" role="status">
                <span>✓ {userActionMsg}</span>
                <button
                  type="button"
                  className="admin-banner-dismiss"
                  onClick={() => setUserActionMsg(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {userActionError && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <div>{userActionError}</div>
                </div>
                <button
                  type="button"
                  className="admin-banner-dismiss"
                  onClick={() => setUserActionError(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {/* General Users Error */}
            {usersError && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <div>
                    <strong>User Management Error:</strong> {usersError}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchUsers}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Users Card Container */}
            <div className="admin-card">
              <div className="admin-card-header admin-table-header">
                <div>
                  <h3 className="admin-card-title">Marketplace User Accounts</h3>
                  <p className="admin-card-subtitle">
                    Registered businesses, roles, verification status, and administrative role assignment
                  </p>
                </div>

                {/* Filter & Search Bar */}
                <div className="admin-filter-bar">
                  <div className="admin-table-search">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search name, email, business..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      aria-label="Search users"
                    />
                    {userSearchQuery && (
                      <button
                        type="button"
                        className="admin-search-clear"
                        onClick={() => setUserSearchQuery('')}
                        aria-label="Clear user search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-group">
                    <select
                      className="admin-select-input"
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      aria-label="Filter by role"
                    >
                      <option value="all">All Roles</option>
                      <option value="seeker">Seeker</option>
                      <option value="provider">Provider</option>
                      <option value="both">Both (Seeker & Provider)</option>
                      <option value="admin">Platform Admin</option>
                    </select>

                    <select
                      className="admin-select-input"
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {usersLoading && !users && (
                <div className="admin-empty-state-mini">
                  <span className="spinning-icon">🔄</span> Loading registered platform users...
                </div>
              )}

              {/* Users Table */}
              {users && (
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>User & Business</th>
                        <th>Contact / Email</th>
                        <th className="text-center">Role</th>
                        <th className="text-center">Account Status</th>
                        <th>Registered Date</th>
                        <th className="text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center admin-table-empty">
                            No matching user accounts found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSelf =
                            currentUser &&
                            ((currentUser._id && currentUser._id.toString() === u._id?.toString()) ||
                              (currentUser.id && currentUser.id.toString() === u._id?.toString()) ||
                              (currentUser.email &&
                                currentUser.email.toLowerCase() === u.email?.toLowerCase()));

                          return (
                            <tr key={u._id}>
                              <td>
                                <div className="user-profile-cell">
                                  <div className="user-business-row">
                                    <span className="user-business-title">
                                      {u.businessName || '—'}
                                    </span>
                                    {isSelf && (
                                      <span className="badge badge-amber badge-sm">You</span>
                                    )}
                                  </div>
                                  <span className="user-fullname-sub">{u.fullName || u.name}</span>
                                </div>
                              </td>
                              <td>
                                <div className="user-contact-cell">
                                  <span className="user-email-text">{u.email}</span>
                                  {u.phone && (
                                    <span className="user-phone-text">📞 {u.phone}</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center">
                                {renderUserRoleBadge(u.role)}
                              </td>
                              <td className="text-center">
                                {renderUserStatusBadge(u.status)}
                              </td>
                              <td>
                                <span className="date-pill">{formatDate(u.createdAt)}</span>
                              </td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenRoleModal(u)}
                                  title="Change User Role"
                                >
                                  ✏️ Change Role
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 3: RESOURCE MODERATION                                        */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'resources' && (
          <div className="admin-resources-view">
            {/* Action Feedback Messages */}
            {resActionMsg && (
              <div className="admin-success-banner" role="status">
                <span>✓ {resActionMsg}</span>
                <button
                  type="button"
                  className="admin-banner-dismiss"
                  onClick={() => setResActionMsg(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {resActionError && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <div>{resActionError}</div>
                </div>
                <button
                  type="button"
                  className="admin-banner-dismiss"
                  onClick={() => setResActionError(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {/* General Resources Error */}
            {resError && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <div>
                    <strong>Resource Moderation Error:</strong> {resError}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchAdminResources}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Resources Card Container */}
            <div className="admin-card">
              <div className="admin-card-header admin-table-header">
                <div>
                  <h3 className="admin-card-title">Shared Hospitality Resource Moderation</h3>
                  <p className="admin-card-subtitle">
                    Inspect all listings, monitor demand pipeline, and enable or disable listings to preserve marketplace compliance
                  </p>
                </div>

                {/* Filter & Search Bar */}
                <div className="admin-filter-bar">
                  <div className="admin-table-search">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search title, category, host..."
                      value={resSearchQuery}
                      onChange={(e) => setResSearchQuery(e.target.value)}
                      aria-label="Search resources"
                    />
                    {resSearchQuery && (
                      <button
                        type="button"
                        className="admin-search-clear"
                        onClick={() => setResSearchQuery('')}
                        aria-label="Clear resource search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-group">
                    <select
                      className="admin-select-input"
                      value={resCategoryFilter}
                      onChange={(e) => setResCategoryFilter(e.target.value)}
                      aria-label="Filter by category"
                    >
                      {resourceCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>

                    <select
                      className="admin-select-input"
                      value={resStatusFilter}
                      onChange={(e) => setResStatusFilter(e.target.value)}
                      aria-label="Filter by availability"
                    >
                      <option value="all">All Moderation States</option>
                      <option value="active">Active Only</option>
                      <option value="disabled">Disabled Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {resLoading && !adminResources && (
                <div className="admin-empty-state-mini">
                  <span className="spinning-icon">🔄</span> Loading marketplace resource listings...
                </div>
              )}

              {/* Resources Table */}
              {adminResources && (
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Resource Asset</th>
                        <th>Category & Host</th>
                        <th className="text-center">Pricing</th>
                        <th className="text-center">Moderation Status</th>
                        <th className="text-center">Marketplace Traffic</th>
                        <th className="text-right">Moderation Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminResources.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center admin-table-empty">
                            No matching resources found.
                          </td>
                        </tr>
                      ) : (
                        filteredAdminResources.map((resItem) => {
                          const isDisabled = Boolean(resItem.disabled);
                          return (
                            <tr key={resItem._id || resItem.id}>
                              <td>
                                <div className="res-title-cell">
                                  <span className="res-id-badge">{resItem.id || resItem._id}</span>
                                  <div>
                                    <span className="res-title-text">{resItem.title}</span>
                                    {resItem.location && (
                                      <div className="res-host-name">📍 {resItem.location}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="res-category-cell">
                                  <span className="res-category-name">{resItem.category}</span>
                                  <span className="res-host-name">
                                    {resItem.hostBusiness || '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="res-rate-text">
                                  ₹{resItem.rate}/{resItem.rateUnit || 'hr'}
                                </span>
                              </td>
                              <td className="text-center">
                                {isDisabled ? (
                                  <span className="badge badge-rejected" title="Resource is disabled and blocked from new booking requests">
                                    🚫 Disabled
                                  </span>
                                ) : (
                                  <span className="badge badge-emerald" title="Resource is active and bookable">
                                    ✓ Active
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                <span
                                  className={`metric-count-pill ${
                                    resItem.bookingCount > 0 ? 'count-active' : ''
                                  }`}
                                  title={`${resItem.totalRequests || 0} total requests, ${resItem.bookingCount || 0} bookings`}
                                >
                                  {resItem.totalRequests || 0} req / {resItem.bookingCount || 0} book
                                </span>
                              </td>
                              <td className="text-right">
                                {isDisabled ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-accept"
                                    onClick={() => handleToggleResourceStatus(resItem)}
                                    title="Enable this resource for seekers"
                                  >
                                    ✓ Enable
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-reject"
                                    onClick={() => handleToggleResourceStatus(resItem)}
                                    title="Disable this resource without deleting data"
                                  >
                                    🚫 Disable
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TAB 4: AUDIT ACTIVITY                                            */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div className="admin-tab-pane" role="tabpanel" aria-label="Audit Activity Pane">
            {/* Filter and Control Bar */}
            <div className="admin-controls-card">
              <div className="admin-controls-header">
                <div>
                  <h2 className="admin-section-heading">Platform Audit & Activity Trail</h2>
                  <p className="admin-section-subheading">
                    Immutable activity log tracking administrative interventions, security actions, resource modifications, and booking/payment lifecycle changes.
                  </p>
                </div>
                <div className="admin-controls-meta">
                  <span className="admin-count-badge">
                    {auditPagination.total} Total Recorded Events
                  </span>
                </div>
              </div>

              <div className="admin-filter-bar" style={{ marginTop: 'var(--space-4)' }}>
                {/* Action Filter */}
                <div className="admin-filter-group">
                  <label htmlFor="audit-action-filter" className="admin-filter-label">Action:</label>
                  <select
                    id="audit-action-filter"
                    className="admin-select-input"
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                  >
                    <option value="all">All Actions</option>
                    <option value="USER_ROLE_CHANGED">User Role Changed</option>
                    <option value="USER_DEACTIVATED">User Deactivated</option>
                    <option value="RESOURCE_DISABLED">Resource Disabled</option>
                    <option value="RESOURCE_ENABLED">Resource Enabled</option>
                    <option value="BOOKING_CONFIRMED">Booking Confirmed</option>
                    <option value="BOOKING_ACCEPTED">Booking Accepted</option>
                    <option value="BOOKING_COUNTER_OFFERED">Counter-Offer Proposed</option>
                    <option value="BOOKING_COMPLETED">Booking Completed</option>
                    <option value="BOOKING_CANCELLED">Booking Cancelled</option>
                    <option value="BOOKING_REJECTED">Booking Rejected</option>
                    <option value="PAYMENT_RECEIVED">Payment Received</option>
                    <option value="PAYMENT_REFUNDED">Payment Refunded</option>
                  </select>
                </div>

                {/* Target Type Filter */}
                <div className="admin-filter-group">
                  <label htmlFor="audit-target-filter" className="admin-filter-label">Target:</label>
                  <select
                    id="audit-target-filter"
                    className="admin-select-input"
                    value={auditTargetTypeFilter}
                    onChange={(e) => setAuditTargetTypeFilter(e.target.value)}
                  >
                    <option value="all">All Targets</option>
                    <option value="User">User</option>
                    <option value="Resource">Resource</option>
                    <option value="Booking">Booking</option>
                    <option value="Payment">Payment</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="admin-filter-group">
                  <label htmlFor="audit-start-date" className="admin-filter-label">From:</label>
                  <input
                    type="date"
                    id="audit-start-date"
                    className="admin-date-input"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="admin-filter-group">
                  <label htmlFor="audit-end-date" className="admin-filter-label">To:</label>
                  <input
                    type="date"
                    id="audit-end-date"
                    className="admin-date-input"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                  />
                </div>

                {/* Reset Filters button */}
                {(auditActionFilter !== 'all' || auditTargetTypeFilter !== 'all' || auditStartDate || auditEndDate) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAuditActionFilter('all');
                      setAuditTargetTypeFilter('all');
                      setAuditStartDate('');
                      setAuditEndDate('');
                    }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Error State */}
            {auditError && (
              <div className="admin-error-banner" role="alert">
                <div className="admin-error-content">
                  <span className="admin-error-icon">⚠️</span>
                  <span>{auditError}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchAuditLogs(auditPagination.page)}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State */}
            {auditLoading && !auditLogs && (
              <div className="admin-loading-state" aria-busy="true">
                <span className="spinning-icon" style={{ fontSize: '2rem' }}>🔄</span>
                <p>Loading platform audit logs...</p>
              </div>
            )}

            {/* Empty State */}
            {auditLogs && !auditLoading && auditLogs.length === 0 && (
              <div className="admin-empty-state">
                <span className="admin-empty-icon">📜</span>
                <h3>No Audit Records Found</h3>
                <p>
                  No platform events match your current filter criteria.
                </p>
                {(auditActionFilter !== 'all' || auditTargetTypeFilter !== 'all' || auditStartDate || auditEndDate) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-3)' }}
                    onClick={() => {
                      setAuditActionFilter('all');
                      setAuditTargetTypeFilter('all');
                      setAuditStartDate('');
                      setAuditEndDate('');
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Table View */}
            {auditLogs && auditLogs.length > 0 && (
              <div className="admin-table-container">
                <table className="admin-data-table" aria-label="Platform Activity Audit Table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '160px' }}>Timestamp</th>
                      <th scope="col" style={{ width: '160px' }}>Action</th>
                      <th scope="col" style={{ width: '150px' }}>Actor</th>
                      <th scope="col" style={{ width: '150px' }}>Target</th>
                      <th scope="col">Description</th>
                      <th scope="col" style={{ width: '100px', textAlign: 'center' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const isExpanded = expandedLogId === log._id;
                      const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                      return (
                        <React.Fragment key={log._id}>
                          <tr className={isExpanded ? 'admin-row-expanded' : ''}>
                            <td className="admin-timestamp-cell">
                              <span className="audit-date-time">{formatDateTime(log.createdAt)}</span>
                            </td>
                            <td>{renderAuditActionBadge(log.action)}</td>
                            <td>
                              <div className="audit-actor-cell">
                                <span className="audit-actor-role">
                                  {log.actorRole ? (
                                    <span className={`badge badge-sm ${log.actorRole === 'admin' ? 'badge-admin-role' : 'badge-default'}`}>
                                      {log.actorRole}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="audit-actor-id" title={log.actorEmail || log.actorId}>
                                  {log.actorEmail || log.actorId || 'system'}
                                </span>
                              </div>
                            </td>
                            <td>{renderAuditTargetBadge(log.targetType, log.targetId)}</td>
                            <td>
                              <span className="audit-desc-text">{log.description}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {hasMetadata ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm audit-details-btn"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                                  aria-expanded={isExpanded}
                                  title="View audit event payload"
                                >
                                  {isExpanded ? 'Hide' : 'Inspect'}
                                </button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasMetadata && (
                            <tr className="admin-detail-subrow">
                              <td colSpan={6}>
                                <div className="audit-metadata-viewer">
                                  <div className="audit-metadata-title">Event Metadata & Payload:</div>
                                  <pre className="audit-json-box">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Footer */}
                <div className="admin-pagination-bar">
                  <div className="admin-pagination-info">
                    Showing {Math.min((auditPagination.page - 1) * auditPagination.limit + 1, auditPagination.total)}–
                    {Math.min(auditPagination.page * auditPagination.limit, auditPagination.total)} of{' '}
                    <strong>{auditPagination.total}</strong> recorded events
                  </div>
                  <div className="admin-pagination-controls">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={auditPagination.page <= 1 || auditLoading}
                      onClick={() => fetchAuditLogs(auditPagination.page - 1)}
                    >
                      ‹ Previous
                    </button>
                    <span className="admin-page-indicator">
                      Page <strong>{auditPagination.page}</strong> of <strong>{auditPagination.totalPages}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={auditPagination.page >= auditPagination.totalPages || auditLoading}
                      onClick={() => fetchAuditLogs(auditPagination.page + 1)}
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* ROLE MODAL DIALOG                                                 */}
        {/* ----------------------------------------------------------------- */}
        {roleModal.open && roleModal.user && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setRoleModal({ open: false, user: null, newRole: 'seeker' });
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="role-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRoleModal({ open: false, user: null, newRole: 'seeker' })}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <h2 id="role-modal-title" className="decision-modal-title">
                  Change User Role
                </h2>
                <p className="decision-modal-subtitle">
                  Assign administrative or marketplace permissions to this account.
                </p>
              </div>

              <div className="decision-summary-card">
                <span className="decision-summary-title">
                  {roleModal.user.fullName || roleModal.user.name}
                </span>
                <span className="decision-summary-meta">
                  Business: {roleModal.user.businessName || '—'} • Email: {roleModal.user.email}
                </span>
                <span className="decision-summary-meta">
                  Current Role: <strong>{roleModal.user.role}</strong>
                </span>
              </div>

              {/* Warning if editing own admin role */}
              {isEditingSelf && roleModal.newRole !== 'admin' && (
                <div className="admin-error-banner" style={{ margin: 'var(--space-3) 0' }}>
                  <div className="admin-error-content">
                    <span>⚠️</span>
                    <span>
                      <strong>Warning:</strong> You cannot demote your own administrator account. Platform rules protect active admin access.
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleRoleChangeSubmit}>
                <div style={{ margin: 'var(--space-4) 0' }}>
                  <label
                    htmlFor="role-select"
                    style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Select New Role:
                  </label>
                  <select
                    id="role-select"
                    className="admin-select-input"
                    style={{ width: '100%', padding: '0.6rem 0.85rem' }}
                    value={roleModal.newRole}
                    onChange={(e) =>
                      setRoleModal((prev) => ({ ...prev, newRole: e.target.value }))
                    }
                  >
                    <option value="seeker">Seeker (Discover and book resources)</option>
                    <option value="provider">Provider (List and offer underutilized assets)</option>
                    <option value="both">Both (Seeker and Provider permissions)</option>
                    <option value="admin">Platform Admin (Administrative management)</option>
                  </select>
                </div>

                <div className="decision-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRoleModal({ open: false, user: null, newRole: 'seeker' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-confirm"
                    disabled={
                      roleModal.newRole === roleModal.user.role ||
                      (isEditingSelf && roleModal.newRole !== 'admin')
                    }
                  >
                    Update Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* CONFIRMATION ACTION MODAL                                         */}
        {/* ----------------------------------------------------------------- */}
        {confirmModal.open && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !confirmModal.isProcessing) {
                setConfirmModal((prev) => ({ ...prev, open: false }));
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                disabled={confirmModal.isProcessing}
                aria-label="Close confirmation dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <h2 id="confirm-modal-title" className="decision-modal-title">
                  {confirmModal.title}
                </h2>
                <p className="decision-modal-subtitle" style={{ marginTop: 'var(--space-2)' }}>
                  {confirmModal.message}
                </p>
              </div>

              <div className="decision-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                  disabled={confirmModal.isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${confirmModal.confirmBtnClass || 'btn-confirm'}`}
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                  }}
                  disabled={confirmModal.isProcessing}
                >
                  {confirmModal.isProcessing ? (
                    <>
                      <span className="spinning-icon">🔄</span> Processing...
                    </>
                  ) : (
                    confirmModal.confirmText || 'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
