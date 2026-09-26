import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

export default function AdminDashboardSection({ onBrowseResources }) {
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (amount) => {
    return '₹' + (Number(amount) || 0).toLocaleString('en-IN');
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
  const bookingsByStatus = analytics?.bookingsByStatus || [];
  const monthlyBookings = analytics?.monthlyBookings || [];
  const resourceUtilization = analytics?.resourceUtilization || [];
  const recentActivity = analytics?.recentActivity || [];

  // Filter utilization by search query
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

  return (
    <section className="admin-dashboard-section" aria-label="Admin Analytics Dashboard">
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
            <h1 className="admin-dashboard-title">Marketplace Analytics & Control</h1>
            <p className="admin-dashboard-subtitle">
              Real-time B2B resource utilization, pipeline conversions, bookings, and platform revenue metrics.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-refresh-analytics"
              onClick={fetchAnalytics}
              disabled={loading}
              aria-label="Refresh analytics data"
            >
              <span className={loading ? 'spinning-icon' : ''}>🔄</span> {loading ? 'Refreshing...' : 'Refresh Metrics'}
            </button>
          </div>
        </div>

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
                          <div className="monthly-bar-sub">{monthItem.requests} req / {monthItem.bookings} book</div>
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
                      <th title="Booking conversion: (Confirmed + Completed) / Inquiries">Utilization (Conversion)</th>
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
                                <span className="seeker-business">{act.seeker.businessName}</span>
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
                              <span className="badge badge-paid">
                                ✓ Paid
                              </span>
                            ) : act.payment.status === 'Refunded' ? (
                              <span className="badge badge-refunded">
                                ↩ Refunded
                              </span>
                            ) : (
                              <span className="badge badge-payment-pending">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <span className="res-revenue-val">
                              {act.payment.amount > 0 ? formatCurrency(act.payment.amount) : '—'}
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
      </div>
    </section>
  );
}
