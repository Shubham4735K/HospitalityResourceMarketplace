import React, { useState, useEffect } from 'react';
import ResourceGrid from './components/ResourceGrid.jsx';
import FilterBar from './components/FilterBar.jsx';
import ResourceDetailModal from './components/ResourceDetailModal.jsx';
import BookingRequestModal from './components/BookingRequestModal.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import AuthModal from './components/AuthModal.jsx';
import AuthGate from './components/AuthGate.jsx';
import AdminDashboardSection from './components/AdminDashboardSection.jsx';
import ListResourceModal from './components/ListResourceModal.jsx';
import { useAuth } from './context/AuthContext.jsx';
import api from './utils/api.js';
import { calculateMatchScore } from './utils/matching.js';

function Header({
  activeTab,
  onSelectTab,
  onBrowseResources,
  isAuthenticated,
  user,
  onOpenAuth,
  onLogout,
  onOpenListResource
}) {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <a
          href="#"
          className="brand-group"
          aria-label="ResShare Home"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('marketplace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="brand-logo-mark">R</div>
          <div className="brand-text-container">
            <span className="brand-name">Res<span>Share</span></span>
            <span className="brand-subtitle">Hospitality B2B Exchange</span>
          </div>
        </a>

        <nav className="header-nav" aria-label="Primary Navigation">
          <ul className="nav-menu">
            <li>
              <button
                type="button"
                className={`nav-link ${activeTab === 'marketplace' ? 'active' : ''}`}
                onClick={onBrowseResources}
              >
                Browse Resources
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`nav-link ${activeTab === 'activity' || activeTab === 'requests' || activeTab === 'provider-requests' ? 'active' : ''}`}
                onClick={() => {
                  if (!isAuthenticated) {
                    onOpenAuth('login');
                    return;
                  }
                  onSelectTab('activity');
                }}
              >
                My Activity
              </button>
            </li>

            {user?.role === 'admin' && (
              <li>
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => onSelectTab('admin-dashboard')}
                >
                  👑 Admin Dashboard
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="header-actions">
          <NotificationCenter />

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenListResource}
            id="header-list-resource-btn"
          >
            + List a Resource
          </button>

          {isAuthenticated ? (
            <div className="auth-user-controls">
              <span className="auth-user-name">
                {user?.fullName || user?.email}
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onLogout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onOpenAuth('login')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ onBrowseResources }) {
  return (
    <section className="hero-section">
      <div className="container hero-content">
        <div className="badge badge-amber hero-badge">
          Smart B2B Resource Marketplace
        </div>
        <h1 className="hero-title">
          Share More. <span>Waste Less.</span>
        </h1>
        <p className="hero-subtitle">
          Hospitality businesses can discover and share underused commercial kitchens,
          culinary equipment, banquet venues, and event resources.
        </p>
        <div className="hero-actions">
          <a
            href="#resources"
            className="btn btn-primary hero-cta"
            onClick={(e) => {
              e.preventDefault();
              onBrowseResources();
            }}
          >
            Browse Resources
          </a>
          <div className="hero-meta">
            <span>Verified hospitality resources</span>
            <span>•</span>
            <span>B2B only</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  const stats = [
    {
      value: '10+',
      label: 'Hospitality Resources',
      accent: 'amber',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      value: '4',
      label: 'Resource Categories',
      accent: 'amber',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      )
    },
    {
      value: '100%',
      label: 'B2B Focused',
      accent: 'amber',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      value: 'Verified',
      label: 'Resource Listings',
      accent: 'emerald',
      icon: (
        <svg
          className="stat-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
    }
  ];

  return (
    <section className="stats-strip-section" aria-label="Key Marketplace Statistics">
      <div className="container">
        <div className="stats-strip-card">
          <div className="stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className={`stat-item stat-item-${stat.accent}`}>
                <div className={`stat-icon-wrap stat-icon-${stat.accent}`}>
                  {stat.icon}
                </div>
                <div className="stat-text-wrap">
                  <div className={`stat-value stat-value-${stat.accent}`}>
                    {stat.value}
                  </div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Discover',
      description:
        'Find available kitchens, venues, equipment, and event resources from nearby hospitality businesses.',
      accent: 'amber',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6M8 11h6" strokeOpacity="0.4" />
        </svg>
      )
    },
    {
      number: '02',
      title: 'Request',
      description:
        'Choose a resource, check its availability, and send your requirements directly to the host business.',
      accent: 'amber',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      )
    },
    {
      number: '03',
      title: 'Collaborate',
      description:
        'Connect businesses, improve resource utilization, and reduce unnecessary hospitality waste.',
      accent: 'emerald',
      icon: (
        <svg
          className="how-step-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ];

  return (
    <section className="how-it-works-section" id="how-it-works" aria-label="How ResShare Works">
      <div className="container">
        <div className="how-it-works-header">
          <h2 className="section-title">How ResShare Works</h2>
          <p className="section-subtitle">
            Turn underused hospitality resources into opportunities for collaboration.
          </p>
        </div>

        <div className="how-steps-flow">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className={`how-step-card how-step-${step.accent}`}>
                <div className="how-step-card-glow" aria-hidden="true" />
                <div className="how-step-top">
                  <div className={`how-step-icon-wrap how-step-icon-${step.accent}`}>
                    {step.icon}
                  </div>
                  <span className={`how-step-num how-step-num-${step.accent}`}>
                    {step.number}
                  </span>
                </div>

                <div className="how-step-body">
                  <h3 className="how-step-title">{step.title}</h3>
                  <p className="how-step-desc">{step.description}</p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="how-step-connector" aria-hidden="true">
                  <div className="connector-line-start" />
                  <div className="connector-arrow-box">
                    <svg
                      className="connector-arrow-desktop"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                    <svg
                      className="connector-arrow-mobile"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </div>
                  <div className="connector-line-end" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketplaceSection({ resources = [], loading, error, onSelectResource }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Resources');
  const [sortBy, setSortBy] = useState('best-match');

  const filteredResources = resources.filter((resource) => {
    const matchesCategory =
      selectedCategory === 'All Resources' ||
      resource.category === selectedCategory;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      resource.title.toLowerCase().includes(term) ||
      resource.category.toLowerCase().includes(term) ||
      resource.hostBusiness.toLowerCase().includes(term) ||
      resource.location.toLowerCase().includes(term) ||
      resource.description.toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  const count = filteredResources.length;
  const countLabel = `${count} ${count === 1 ? 'resource' : 'resources'} available`;

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Resources');
  };

  let sortedResources = filteredResources;

  if (sortBy === 'best-match') {
    const queryParams = {
      searchQuery: searchTerm,
      category: selectedCategory
    };
    sortedResources = filteredResources
      .map((resource) => {
        const { score } = calculateMatchScore(resource, queryParams);
        return {
          ...resource,
          matchScore: score
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  } else if (sortBy === 'price-asc') {
    sortedResources = [...filteredResources].sort((a, b) => a.rate - b.rate);
  } else if (sortBy === 'price-desc') {
    sortedResources = [...filteredResources].sort((a, b) => b.rate - a.rate);
  } else {
    sortedResources = [...filteredResources];
  }

  const resourcesWithHandlers = sortedResources.map((item) => ({
    ...item,
    onViewDetails: () => onSelectResource(item)
  }));

  return (
    <section id="resources" className="marketplace-section">
      <div className="container">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Available Resources</h2>
            <p className="section-subtitle">
              Find trusted hospitality resources available from nearby businesses.
            </p>
          </div>
          <div className="marketplace-controls-group">
            <div className="marketplace-sort-wrapper">
              <label htmlFor="marketplace-sort" className="sort-label">
                Sort by:
              </label>
              <select
                id="marketplace-sort"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort marketplace resources"
              >
                <option value="best-match">Best Match</option>
                <option value="default">Default / Relevance</option>
                <option value="price-asc">Lowest Price</option>
                <option value="price-desc">Highest Price</option>
              </select>
            </div>
            <div className="results-count-badge">
              {countLabel}
            </div>
          </div>
        </div>

        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {loading ? (
          <div className="empty-state">
            <p className="placeholder-text">Loading resources...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="placeholder-text">{error}</p>
          </div>
        ) : resourcesWithHandlers.length > 0 ? (
          <ResourceGrid resources={resourcesWithHandlers} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">No resources found</h3>
            <p className="empty-state-subtitle">
              Try adjusting your search or category filter.
            </p>
            <button
              type="button"
              className="btn btn-secondary empty-state-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function isDatePassed(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return false;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
  return targetMidnight < todayMidnight;
}

function getStatusBadge(status) {
  const s = status || 'Pending';
  if (s === 'Accepted') {
    return <span className="badge badge-accepted">✓ Accepted</span>;
  }
  if (s === 'Confirmed') {
    return <span className="badge badge-confirmed">★ Confirmed</span>;
  }
  if (s === 'Completed') {
    return <span className="badge badge-completed">✔ Completed</span>;
  }
  if (s === 'Cancelled') {
    return <span className="badge badge-cancelled">⊘ Cancelled</span>;
  }
  if (s === 'Rejected') {
    return <span className="badge badge-rejected">✕ Rejected</span>;
  }
  if (s === 'Counter-Offered') {
    return <span className="badge badge-counter">⇄ Counter-Offered</span>;
  }
  return <span className="badge badge-pending">⏳ Pending</span>;
}

function getPaymentBadge(payment, bookingStatus) {
  const pStatus = payment?.status || 'Pending';
  if (pStatus === 'Paid') {
    return (
      <span className="badge badge-paid">
        ✓ Paid
      </span>
    );
  }
  if (pStatus === 'Refunded') {
    return (
      <span className="badge badge-refunded">
        ↩ Refunded
      </span>
    );
  }
  if (bookingStatus === 'Confirmed') {
    return <span className="badge badge-payment-pending">💳 Payment Pending</span>;
  }
  return null;
}

function SentRequestsPanel({ onBrowseResources, isUnifiedView = false, hasTabs = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [declineModal, setDeclineModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.get('/requests/my')
      .then((data) => {
        if (isMounted) {
          setRequests(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching requests:', err);
        if (isMounted) {
          setError(
            err.status === 401
              ? 'Session expired. Please sign in again.'
              : 'Unable to load requests.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !updatingId) {
        if (declineModal) setDeclineModal(null);
        if (cancelModal) setCancelModal(null);
        if (paymentModal) setPaymentModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [declineModal, cancelModal, paymentModal, updatingId]);

  const handleConfirmBooking = async (req) => {
    const reqId = req._id || req.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.patch(`/requests/${reqId}`, { status: 'Confirmed' });

      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
    } catch (err) {
      console.error('Error confirming booking:', err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        'Failed to confirm booking. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelBooking = async (req) => {
    const reqId = req._id || req.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.patch(`/requests/${reqId}`, { status: 'Cancelled' });

      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
      setCancelModal(null);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        'Failed to cancel booking. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteBooking = async (req) => {
    const reqId = req._id || req.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.patch(`/requests/${reqId}`, { status: 'Completed' });

      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
    } catch (err) {
      console.error('Error completing booking:', err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        'Failed to mark booking as completed. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAcceptCounter = async (req) => {
    const reqId = req._id || req.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.patch(`/requests/${reqId}`, { status: 'Accepted' });

      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
      setDeclineModal(null);
    } catch (err) {
      console.error('Error accepting counter offer:', err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        'Failed to accept counter offer. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeclineCounter = async (req) => {
    const reqId = req._id || req.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.patch(`/requests/${reqId}`, { status: 'Rejected' });

      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
      setDeclineModal(null);
    } catch (err) {
      console.error('Error declining counter offer:', err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        'Failed to decline counter offer. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMockPayment = async (request) => {
    const reqId = request._id || request.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.post(`/requests/${reqId}/pay`);
      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
      setPaymentModal(null);
    } catch (err) {
      console.error('Error processing mock payment:', err);
      const errMsg =
        err.data?.error ||
        err.message ||
        'Failed to process payment. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefundPayment = async (request) => {
    const reqId = request._id || request.id;
    if (!reqId) return;
    setUpdatingId(reqId);
    setActionError(null);

    try {
      const updated = await api.post(`/requests/${reqId}/refund`);
      setRequests((prev) =>
        prev.map((r) => ((r._id === reqId || r.id === reqId) ? updated : r))
      );
    } catch (err) {
      console.error('Error processing refund:', err);
      const errMsg =
        err.data?.error ||
        err.message ||
        'Failed to process refund. Please try again.';
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const content = (
    <>
      {isUnifiedView ? (
        <div className="activity-panel-subbar">
          <h3 className="activity-subheading">Requests I've Sent</h3>
          {!loading && !error && requests.length > 0 && (
            <div className="results-count-badge">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </div>
          )}
        </div>
      ) : (
        <div className="section-header-row">
          <div>
            <h2 className="section-title">My Requests</h2>
            <p className="section-subtitle">
              Track and manage your B2B resource inquiries with partner businesses.
            </p>
          </div>
          {!loading && !error && requests.length > 0 && (
            <div className="results-count-badge">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="action-error-banner" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            className="action-error-dismiss"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error notification"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="my-requests-empty-card">
          <p className="placeholder-text">Loading requests...</p>
        </div>
      ) : error ? (
        <div className="my-requests-empty-card">
          <p className="placeholder-text">{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="my-requests-empty-card">
          <div className="empty-requests-icon">📋</div>
          <h3 className="empty-requests-title">No requests sent yet.</h3>
          <p className="empty-requests-subtitle">
            You haven't sent any booking requests yet. Browse available hospitality resources to submit your first request.
          </p>
          <button
            type="button"
            className="btn btn-primary empty-requests-cta"
            onClick={onBrowseResources}
          >
            Browse Resources
          </button>
        </div>
      ) : (
          <div className="requests-list">
            {requests.map((req, idx) => {
              const reqId = req._id || req.id;
              const title =
                req.resourceTitle ||
                req.resource?.title ||
                req.title ||
                (req.resourceId ? `Resource #${req.resourceId}` : 'Hospitality Resource Request');
              const timeSlot =
                req.startTime && req.endTime
                  ? `${req.startTime} – ${req.endTime}`
                  : req.startTime || req.endTime || null;

              return (
                <div key={reqId || idx} className="request-card">
                  <div className="request-card-header">
                    <div>
                      <div className="request-badge" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {getStatusBadge(req.status)}
                        {getPaymentBadge(req.payment, req.status)}
                      </div>
                      <h3 className="request-card-title">{title}</h3>
                    </div>
                    {req.requestedDate && (
                      <span className="request-date-badge">
                        📅 {req.requestedDate}
                      </span>
                    )}
                  </div>

                  <div className="request-card-grid">
                    <div className="request-info-item">
                      <span className="request-info-label">Full Name</span>
                      <span className="request-info-value">{req.fullName || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Business Name</span>
                      <span className="request-info-value">{req.businessName || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Email</span>
                      <span className="request-info-value">{req.email || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Requested Date</span>
                      <span className="request-info-value">{req.requestedDate || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Current Status</span>
                      <span className="request-info-value">{getStatusBadge(req.status)}</span>
                    </div>

                    {(req.status === 'Confirmed' || req.payment?.status === 'Paid' || req.payment?.status === 'Refunded') && (
                      <div className="request-info-item">
                        <span className="request-info-label">Payment Status</span>
                        <span className="request-info-value">{getPaymentBadge(req.payment, req.status)}</span>
                      </div>
                    )}

                    {req.payment?.transactionId && (
                      <div className="request-info-item">
                        <span className="request-info-label">Transaction ID</span>
                        <span className="request-info-value transaction-pill">{req.payment.transactionId}</span>
                      </div>
                    )}

                    {(req.payment?.amount > 0 || req.price > 0) && (
                      <div className="request-info-item">
                        <span className="request-info-label">Amount</span>
                        <span className="request-info-value">₹{req.payment?.amount || req.price}</span>
                      </div>
                    )}

                    {timeSlot && (
                      <div className="request-info-item">
                        <span className="request-info-label">Time Window</span>
                        <span className="request-info-value">{timeSlot}</span>
                      </div>
                    )}

                    {req.phone && (
                      <div className="request-info-item">
                        <span className="request-info-label">Phone</span>
                        <span className="request-info-value">{req.phone}</span>
                      </div>
                    )}
                  </div>

                  {req.message && (
                    <div className="request-message-box">
                      <span className="request-info-label">Requirements / Message</span>
                      <p className="request-message-text">{req.message}</p>
                    </div>
                  )}

                  {req.status === 'Counter-Offered' && req.counterProposal && (
                    <div className="request-counter-proposal-box">
                      <div className="counter-proposal-header">
                        <span className="counter-proposal-icon">⇄</span>
                        <span className="counter-proposal-label">Provider Counter Offer</span>
                      </div>
                      <div className="counter-proposal-grid">
                        <div className="counter-proposal-item">
                          <span className="counter-proposal-field-label">Proposed Date</span>
                          <span className="counter-proposal-field-val">📅 {req.counterProposal.date}</span>
                        </div>
                      </div>
                      {((req.counterProposal.notes && req.counterProposal.notes.trim()) || (req.providerNotes && req.providerNotes.trim())) && (
                        <div className="counter-proposal-notes-box">
                          <span className="counter-proposal-field-label">Provider Note</span>
                          <p className="counter-proposal-notes-text">
                            {req.counterProposal.notes && req.counterProposal.notes.trim()
                              ? req.counterProposal.notes
                              : req.providerNotes}
                          </p>
                        </div>
                      )}
                      <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                        <button
                          type="button"
                          className="btn btn-accept"
                          onClick={() => handleAcceptCounter(req)}
                          disabled={updatingId === reqId}
                          aria-label={`Accept counter offer for ${title}`}
                        >
                          {updatingId === reqId ? 'Accepting...' : 'Accept Counter'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-reject"
                          onClick={() => setDeclineModal({ request: req, title })}
                          disabled={updatingId === reqId}
                          aria-label={`Decline counter offer for ${title}`}
                        >
                          Decline Counter
                        </button>
                      </div>
                    </div>
                  )}

                  {req.status !== 'Counter-Offered' && req.providerNotes && req.providerNotes.trim() && (
                    <div className="request-provider-response-box">
                      <div className="provider-response-header">
                        <span className="provider-response-icon">💬</span>
                        <span className="provider-response-label">Provider Response</span>
                      </div>
                      <p className="request-provider-response-text">{req.providerNotes}</p>
                    </div>
                  )}

                  {req.status === 'Accepted' && (
                    <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                      <button
                        type="button"
                        className="btn btn-confirm"
                        onClick={() => handleConfirmBooking(req)}
                        disabled={updatingId === reqId}
                        aria-label={`Confirm booking for ${title}`}
                      >
                        {updatingId === reqId ? 'Confirming...' : '★ Confirm Booking'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-cancel-booking"
                        onClick={() => setCancelModal({ request: req, title })}
                        disabled={updatingId === reqId}
                        aria-label={`Cancel booking for ${title}`}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {req.status === 'Pending' && (
                    <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                      <button
                        type="button"
                        className="btn btn-cancel-booking"
                        onClick={() => setCancelModal({ request: req, title })}
                        disabled={updatingId === reqId}
                        aria-label={`Cancel request for ${title}`}
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {req.status === 'Confirmed' && (
                    <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                      {(!req.payment || req.payment.status === 'Pending') && (
                        <button
                          type="button"
                          className="btn btn-pay"
                          onClick={() => setPaymentModal({ request: req, title })}
                          disabled={updatingId === reqId}
                          aria-label={`Pay now for ${title}`}
                        >
                          💳 Pay Now (₹{req.payment?.amount || req.price || 1000})
                        </button>
                      )}
                      {isDatePassed(req.requestedDate) && (
                        <button
                          type="button"
                          className="btn btn-complete"
                          onClick={() => handleCompleteBooking(req)}
                          disabled={updatingId === reqId}
                          aria-label={`Mark completed for ${title}`}
                        >
                          {updatingId === reqId ? 'Completing...' : '✔ Mark Completed'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-cancel-booking"
                        onClick={() => setCancelModal({ request: req, title })}
                        disabled={updatingId === reqId}
                        aria-label={`Cancel booking for ${title}`}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {req.status === 'Cancelled' && req.payment?.status === 'Paid' && (
                    <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                      <button
                        type="button"
                        className="btn btn-refund"
                        onClick={() => handleRefundPayment(req)}
                        disabled={updatingId === reqId}
                        aria-label={`Refund payment for ${title}`}
                      >
                        {updatingId === reqId ? 'Refunding...' : '↩ Refund Payment'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cancelModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updatingId) {
                setCancelModal(null);
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancelModal(null)}
                disabled={Boolean(updatingId)}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="badge badge-cancelled">Cancel Booking</span>
                </div>
                <h3 id="cancel-modal-title" className="decision-modal-title">
                  Cancel {cancelModal.request?.status === 'Pending' ? 'Request' : 'Booking'}?
                </h3>
                <p className="decision-modal-subtitle">
                  Are you sure you want to cancel your inquiry for <strong>{cancelModal.title}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="decision-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancelModal(null)}
                  disabled={Boolean(updatingId)}
                >
                  Keep {cancelModal.request?.status === 'Pending' ? 'Request' : 'Booking'}
                </button>
                <button
                  type="button"
                  className="btn btn-cancel-booking"
                  onClick={() => handleCancelBooking(cancelModal.request)}
                  disabled={Boolean(updatingId)}
                >
                  {updatingId ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {declineModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updatingId) {
                setDeclineModal(null);
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decline-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeclineModal(null)}
                disabled={Boolean(updatingId)}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="badge badge-rejected">Decline Counter Offer</span>
                </div>
                <h3 id="decline-modal-title" className="decision-modal-title">
                  Decline Provider Counter Offer
                </h3>
                <p className="decision-modal-subtitle">
                  Are you sure you want to decline the alternative date proposed by the provider? The request status will become Rejected.
                </p>
              </div>

              <div className="decision-summary-card">
                <div className="decision-summary-title">{declineModal.title}</div>
                <div className="decision-summary-meta">
                  <span><strong>Originally Requested:</strong> {declineModal.request.requestedDate || '—'}</span>
                </div>
                {declineModal.request.counterProposal?.date && (
                  <div className="decision-summary-meta">
                    <span><strong>Proposed Date:</strong> 📅 {declineModal.request.counterProposal.date}</span>
                  </div>
                )}
              </div>

              <div className="decision-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeclineModal(null)}
                  disabled={Boolean(updatingId)}
                >
                  Keep Offer
                </button>
                <button
                  type="button"
                  className="btn btn-reject"
                  onClick={() => handleDeclineCounter(declineModal.request)}
                  disabled={Boolean(updatingId)}
                >
                  {updatingId ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updatingId) {
                setPaymentModal(null);
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPaymentModal(null)}
                disabled={Boolean(updatingId)}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="badge badge-payment-pending">💳 ResShare Mock Checkout</span>
                </div>
                <h3 id="payment-modal-title" className="decision-modal-title">
                  Confirm Mock Payment
                </h3>
                <p className="decision-modal-subtitle">
                  Complete simulated payment for your confirmed booking with {paymentModal.title}.
                </p>
              </div>

              <div className="decision-summary-card">
                <div className="decision-summary-title">{paymentModal.title}</div>
                <div className="decision-summary-meta">
                  <span><strong>Booking Date:</strong> 📅 {paymentModal.request.requestedDate || '—'}</span>
                </div>
                {paymentModal.request.startTime && paymentModal.request.endTime && (
                  <div className="decision-summary-meta">
                    <span><strong>Time:</strong> {paymentModal.request.startTime} – {paymentModal.request.endTime}</span>
                  </div>
                )}
                <div className="decision-summary-meta">
                  <span><strong>Seeker:</strong> {paymentModal.request.businessName || paymentModal.request.fullName || '—'}</span>
                </div>
              </div>

              <div className="payment-amount-box">
                <div className="payment-amount-label">Total Amount Due</div>
                <div className="payment-amount-value">
                  ₹{paymentModal.request.payment?.amount || paymentModal.request.price || 1000}
                </div>
              </div>

              <div className="counter-proposal-notice" style={{ marginBottom: 'var(--space-4)' }}>
                ℹ <strong>Mock Payment System:</strong> No real card details or external gateways. Clicking "Confirm Payment" generates a mock transaction ID and marks your booking as Paid.
              </div>

              <div className="decision-modal-actions" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPaymentModal(null)}
                  disabled={Boolean(updatingId)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-pay"
                  onClick={() => handleMockPayment(paymentModal.request)}
                  disabled={Boolean(updatingId)}
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {updatingId ? 'Processing...' : `Confirm Payment (₹${paymentModal.request.payment?.amount || paymentModal.request.price || 1000})`}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (isUnifiedView) {
    return (
      <div
        id="panel-sent-requests"
        role={hasTabs ? 'tabpanel' : 'region'}
        aria-labelledby={hasTabs ? 'tab-sent-requests' : undefined}
        aria-label={!hasTabs ? "Requests I've Sent" : undefined}
        className="activity-tabpanel"
      >
        {content}
      </div>
    );
  }

  return (
    <section className="my-requests-section">
      <div className="container">
        {content}
      </div>
    </section>
  );
}

const MyRequestsSection = (props) => <SentRequestsPanel {...props} isUnifiedView={false} />;

function ReceivedRequestsPanel({ onBrowseResources, isUnifiedView = false, hasTabs = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);

  const fetchRequests = () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.get('/requests/incoming')
      .then((data) => {
        if (isMounted) {
          setRequests(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching provider requests:', err);
        if (isMounted) {
          setError(
            err.status === 403
              ? 'Access denied. Only provider accounts can access incoming requests.'
              : err.status === 401
              ? 'Session expired. Please sign in again.'
              : 'Unable to load incoming requests.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    const cleanup = fetchRequests();
    return cleanup;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !updatingId) {
        if (decisionModal) setDecisionModal(null);
        if (cancelModal) setCancelModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [decisionModal, cancelModal, updatingId]);

  const handleStatusUpdate = async (id, newStatus, providerNotes, counterProposal) => {
    if (!id) return;
    setUpdatingId(id);
    setActionError(null);

    try {
      const payload = { status: newStatus };
      if (typeof providerNotes === 'string') {
        payload.providerNotes = providerNotes;
      }
      if (newStatus === 'Counter-Offered' && counterProposal) {
        payload.counterProposal = counterProposal;
      }

      const updated = await api.patch(`/requests/${id}`, payload);

      setRequests((prev) =>
        prev.map((req) => ((req._id === id || req.id === id) ? updated : req))
      );
      setDecisionModal(null);
    } catch (err) {
      console.error(`Error updating request status to ${newStatus}:`, err);
      const errMsg =
        err.data?.reason ||
        err.data?.error ||
        err.message ||
        `Failed to update request status to ${newStatus}. Please try again.`;
      if (decisionModal) {
        setDecisionModal((prev) => ({ ...prev, error: errMsg }));
      }
      setActionError(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const content = (
    <>
      {isUnifiedView ? (
        <div className="activity-panel-subbar">
          <h3 className="activity-subheading">Requests I've Received</h3>
          {!loading && !error && requests.length > 0 && (
            <div className="results-count-badge">
              {requests.length} {requests.length === 1 ? 'incoming request' : 'incoming requests'}
            </div>
          )}
        </div>
      ) : (
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Provider Request Management</h2>
            <p className="section-subtitle">
              Review and manage incoming resource requests from partner hospitality businesses.
            </p>
          </div>
          {!loading && !error && requests.length > 0 && (
            <div className="results-count-badge">
              {requests.length} {requests.length === 1 ? 'incoming request' : 'incoming requests'}
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="action-error-banner" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            className="action-error-dismiss"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error notification"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="my-requests-empty-card">
          <p className="placeholder-text">Loading incoming requests...</p>
        </div>
      ) : error ? (
        <div className="my-requests-empty-card">
          <p className="placeholder-text">{error}</p>
          <button
            type="button"
            className="btn btn-secondary empty-requests-cta"
            onClick={fetchRequests}
            style={{ marginTop: 'var(--space-4)' }}
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="my-requests-empty-card">
          <div className="empty-requests-icon">📥</div>
          <h3 className="empty-requests-title">No incoming requests yet.</h3>
          <p className="empty-requests-subtitle">
            When other hospitality businesses request access to your resources, their requests will appear here.
          </p>
          <button
            type="button"
            className="btn btn-primary empty-requests-cta"
            onClick={onBrowseResources}
          >
            Browse Resources
          </button>
        </div>
      ) : (
          <div className="requests-list">
            {requests.map((req, idx) => {
              const reqId = req._id || req.id;
              const title =
                req.resourceTitle ||
                req.resource?.title ||
                req.title ||
                (req.resourceId ? `Resource #${req.resourceId}` : 'Hospitality Resource Request');
              const timeSlot =
                req.startTime && req.endTime
                  ? `${req.startTime} – ${req.endTime}`
                  : req.startTime || req.endTime || null;
              const status = req.status || 'Pending';
              const isUpdating = updatingId === reqId;

              return (
                <div key={reqId || idx} className="request-card">
                  <div className="request-card-header">
                    <div>
                      <div className="request-badge" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {getStatusBadge(status)}
                        {getPaymentBadge(req.payment, status)}
                      </div>
                      <h3 className="request-card-title">{title}</h3>
                    </div>
                    {req.requestedDate && (
                      <span className="request-date-badge">
                        📅 {req.requestedDate}
                      </span>
                    )}
                  </div>

                  <div className="request-card-grid">
                    <div className="request-info-item">
                      <span className="request-info-label">Requester Name</span>
                      <span className="request-info-value">{req.fullName || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Business Name</span>
                      <span className="request-info-value">{req.businessName || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Requested Date</span>
                      <span className="request-info-value">{req.requestedDate || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Time Window</span>
                      <span className="request-info-value">{timeSlot || '—'}</span>
                    </div>

                    <div className="request-info-item">
                      <span className="request-info-label">Current Status</span>
                      <span className="request-info-value">
                        {getStatusBadge(status)}
                      </span>
                    </div>

                    {(status === 'Confirmed' || req.payment?.status === 'Paid' || req.payment?.status === 'Refunded') && (
                      <div className="request-info-item">
                        <span className="request-info-label">Payment Status</span>
                        <span className="request-info-value">{getPaymentBadge(req.payment, status)}</span>
                      </div>
                    )}

                    {req.payment?.transactionId && (
                      <div className="request-info-item">
                        <span className="request-info-label">Transaction ID</span>
                        <span className="request-info-value transaction-pill">{req.payment.transactionId}</span>
                      </div>
                    )}

                    {(req.payment?.amount > 0 || req.price > 0) && (
                      <div className="request-info-item">
                        <span className="request-info-label">Amount</span>
                        <span className="request-info-value">₹{req.payment?.amount || req.price}</span>
                      </div>
                    )}

                    {req.email && (
                      <div className="request-info-item">
                        <span className="request-info-label">Email</span>
                        <span className="request-info-value">{req.email}</span>
                      </div>
                    )}

                    {req.phone && (
                      <div className="request-info-item">
                        <span className="request-info-label">Phone</span>
                        <span className="request-info-value">{req.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="request-message-box">
                    <span className="request-info-label">Requirements / Message</span>
                    <p className="request-message-text">
                      {req.message && req.message.trim() ? req.message : 'No additional requirements provided.'}
                    </p>
                  </div>

                  {req.status === 'Counter-Offered' && req.counterProposal && (
                    <div className="request-counter-proposal-box">
                      <div className="counter-proposal-header">
                        <span className="counter-proposal-icon">⇄</span>
                        <span className="counter-proposal-label">Provider Counter Offer</span>
                      </div>
                      <div className="counter-proposal-grid">
                        <div className="counter-proposal-item">
                          <span className="counter-proposal-field-label">Proposed Date</span>
                          <span className="counter-proposal-field-val">📅 {req.counterProposal.date}</span>
                        </div>
                      </div>
                      {((req.counterProposal.notes && req.counterProposal.notes.trim()) || (req.providerNotes && req.providerNotes.trim())) && (
                        <div className="counter-proposal-notes-box">
                          <span className="counter-proposal-field-label">Provider Note</span>
                          <p className="counter-proposal-notes-text">
                            {req.counterProposal.notes && req.counterProposal.notes.trim()
                              ? req.counterProposal.notes
                              : req.providerNotes}
                          </p>
                        </div>
                      )}
                      <div className="counter-proposal-notice">
                        ℹ Counter offer submitted to seeker. Awaiting response in next phase.
                      </div>
                    </div>
                  )}

                  {req.status !== 'Counter-Offered' && req.providerNotes && req.providerNotes.trim() && (
                    <div className="request-provider-response-box">
                      <div className="provider-response-header">
                        <span className="provider-response-icon">💬</span>
                        <span className="provider-response-label">Provider Response</span>
                      </div>
                      <p className="request-provider-response-text">{req.providerNotes}</p>
                    </div>
                  )}

                  {status === 'Pending' && reqId && (
                    <div className="provider-actions">
                      <button
                        type="button"
                        className="btn btn-accept"
                        onClick={() =>
                          setDecisionModal({
                            request: req,
                            status: 'Accepted',
                            title,
                            timeSlot,
                            note: '',
                            error: null
                          })
                        }
                        disabled={isUpdating}
                        aria-label={`Accept request for ${title}`}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-counter"
                        onClick={() =>
                          setDecisionModal({
                            request: req,
                            status: 'Counter-Offered',
                            title,
                            timeSlot,
                            date: req.requestedDate || '',
                            note: '',
                            error: null
                          })
                        }
                        disabled={isUpdating}
                        aria-label={`Counter offer for ${title}`}
                      >
                        Counter Offer
                      </button>
                      <button
                        type="button"
                        className="btn btn-reject"
                        onClick={() =>
                          setDecisionModal({
                            request: req,
                            status: 'Rejected',
                            title,
                            timeSlot,
                            note: '',
                            error: null
                          })
                        }
                        disabled={isUpdating}
                        aria-label={`Reject request for ${title}`}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {status === 'Accepted' && reqId && (
                    <div>
                      <div className="counter-proposal-notice" style={{ marginTop: 'var(--space-3)' }}>
                        ℹ Request approved by you. Awaiting seeker confirmation.
                      </div>
                      <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                        <button
                          type="button"
                          className="btn btn-cancel-booking"
                          onClick={() => setCancelModal({ request: req, title })}
                          disabled={isUpdating}
                          aria-label={`Cancel booking for ${title}`}
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  )}

                  {status === 'Confirmed' && reqId && (
                    <div className="provider-actions" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                      {isDatePassed(req.requestedDate) ? (
                        <button
                          type="button"
                          className="btn btn-complete"
                          onClick={() => handleStatusUpdate(reqId, 'Completed')}
                          disabled={isUpdating}
                          aria-label={`Mark completed for ${title}`}
                        >
                          {isUpdating ? 'Completing...' : '✔ Mark Completed'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-complete"
                          disabled={true}
                          title="Can only be marked completed after the booking date has passed"
                          style={{ opacity: 0.55, cursor: 'not-allowed' }}
                        >
                          ✔ Mark Completed (After {req.requestedDate})
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-cancel-booking"
                        onClick={() => setCancelModal({ request: req, title })}
                        disabled={isUpdating}
                        aria-label={`Cancel booking for ${title}`}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {decisionModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updatingId) {
                setDecisionModal(null);
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decision-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDecisionModal(null)}
                disabled={Boolean(updatingId)}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span
                    className={`badge ${decisionModal.status === 'Accepted'
                      ? 'badge-confirmed'
                      : decisionModal.status === 'Counter-Offered'
                        ? 'badge-counter'
                        : 'badge-rejected'
                      }`}
                  >
                    {decisionModal.status === 'Accepted'
                      ? 'Accepting Request'
                      : decisionModal.status === 'Counter-Offered'
                        ? 'Counter Offer'
                        : 'Rejecting Request'}
                  </span>
                </div>
                <h3 id="decision-modal-title" className="decision-modal-title">
                  {decisionModal.status === 'Accepted'
                    ? 'Accept Resource Request'
                    : decisionModal.status === 'Counter-Offered'
                      ? 'Counter Offer'
                      : 'Reject Resource Request'}
                </h3>
                <p className="decision-modal-subtitle">
                  {decisionModal.status === 'Accepted'
                    ? 'Confirm acceptance and optionally provide instructions or guidelines for the seeker.'
                    : decisionModal.status === 'Counter-Offered'
                      ? 'Propose an alternative date for the seeker along with optional notes.'
                      : 'Confirm rejection and optionally provide a reason or note for the seeker.'}
                </p>
              </div>

              <div className="decision-summary-card">
                <div className="decision-summary-title">{decisionModal.title}</div>
                <div className="decision-summary-meta">
                  <span><strong>Requester:</strong> {decisionModal.request.fullName || '—'} ({decisionModal.request.businessName || '—'})</span>
                </div>
                <div className="decision-summary-meta">
                  <span><strong>Originally Requested:</strong> {decisionModal.request.requestedDate || '—'}{decisionModal.timeSlot ? ` • ${decisionModal.timeSlot}` : ''}</span>
                </div>
              </div>

              {decisionModal.error && (
                <div className="action-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)', marginTop: 0 }}>
                  <span>{decisionModal.error}</span>
                </div>
              )}

              {decisionModal.status === 'Counter-Offered' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="counter-date">
                    Proposed Date *
                  </label>
                  <input
                    type="date"
                    id="counter-date"
                    className="form-input"
                    value={decisionModal.date || ''}
                    onChange={(e) =>
                      setDecisionModal((prev) => ({
                        ...prev,
                        date: e.target.value,
                        error: null
                      }))
                    }
                    disabled={Boolean(updatingId)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="decision-provider-notes">
                  Optional message to seeker
                </label>
                <textarea
                  id="decision-provider-notes"
                  className="form-textarea"
                  rows={decisionModal.status === 'Counter-Offered' ? 3 : 4}
                  placeholder={
                    decisionModal.status === 'Accepted'
                      ? 'e.g., Please bring your FSSAI certificate and check in at the reception upon arrival.'
                      : decisionModal.status === 'Counter-Offered'
                        ? 'e.g., We cannot accommodate this date due to private events, but tomorrow is available.'
                        : 'e.g., Resource is unavailable due to an internal private event during this time window.'
                  }
                  value={decisionModal.note || ''}
                  onChange={(e) =>
                    setDecisionModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                      error: null
                    }))
                  }
                  disabled={Boolean(updatingId)}
                />
              </div>

              <div className="decision-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDecisionModal(null)}
                  disabled={Boolean(updatingId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    decisionModal.status === 'Accepted'
                      ? 'btn btn-accept'
                      : decisionModal.status === 'Counter-Offered'
                        ? 'btn btn-counter'
                        : 'btn btn-reject'
                  }
                  onClick={() => {
                    const reqId = decisionModal.request._id || decisionModal.request.id;
                    if (decisionModal.status === 'Counter-Offered') {
                      handleStatusUpdate(
                        reqId,
                        'Counter-Offered',
                        decisionModal.note,
                        {
                          date: decisionModal.date,
                          notes: decisionModal.note
                        }
                      );
                    } else {
                      handleStatusUpdate(reqId, decisionModal.status, decisionModal.note);
                    }
                  }}
                  disabled={Boolean(updatingId)}
                >
                  {updatingId
                    ? 'Processing...'
                    : decisionModal.status === 'Accepted'
                      ? 'Confirm Accept'
                      : decisionModal.status === 'Counter-Offered'
                        ? 'Confirm Counter Offer'
                        : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updatingId) {
                setCancelModal(null);
              }
            }}
            role="presentation"
          >
            <div
              className="modal-dialog decision-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="provider-cancel-modal-title"
            >
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancelModal(null)}
                disabled={Boolean(updatingId)}
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="decision-modal-header">
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="badge badge-cancelled">Cancel Booking</span>
                </div>
                <h3 id="provider-cancel-modal-title" className="decision-modal-title">
                  Cancel Booking for {cancelModal.title}?
                </h3>
                <p className="decision-modal-subtitle">
                  Are you sure you want to cancel this booking for <strong>{cancelModal.request?.businessName || cancelModal.request?.fullName}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="decision-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancelModal(null)}
                  disabled={Boolean(updatingId)}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  className="btn btn-cancel-booking"
                  onClick={async () => {
                    const reqId = cancelModal.request._id || cancelModal.request.id;
                    await handleStatusUpdate(reqId, 'Cancelled');
                    setCancelModal(null);
                  }}
                  disabled={Boolean(updatingId)}
                >
                  {updatingId ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (isUnifiedView) {
    return (
      <div
        id="panel-received-requests"
        role={hasTabs ? 'tabpanel' : 'region'}
        aria-labelledby={hasTabs ? 'tab-received-requests' : undefined}
        aria-label={!hasTabs ? "Requests I've Received" : undefined}
        className="activity-tabpanel"
      >
        {content}
      </div>
    );
  }

  return (
    <section className="provider-requests-section">
      <div className="container">
        {content}
      </div>
    </section>
  );
}

const ProviderRequestsSection = (props) => <ReceivedRequestsPanel {...props} isUnifiedView={false} />;

function MyActivitySection({ onBrowseResources, onNavigateAdmin }) {
  const { user } = useAuth();
  const userRole = user?.role || 'seeker';

  const showSent = userRole === 'seeker' || userRole === 'both';
  const showReceived = userRole === 'provider' || userRole === 'both';
  const hasBoth = userRole === 'both';

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (userRole === 'provider') return 'received';
    return 'sent';
  });

  useEffect(() => {
    if (userRole === 'provider') {
      setActiveSubTab('received');
    } else if (userRole === 'seeker') {
      setActiveSubTab('sent');
    }
  }, [userRole]);

  if (userRole === 'admin') {
    return (
      <section className="my-activity-section">
        <div className="container">
          <div className="section-header-row activity-header-row">
            <div>
              <h2 className="section-title">My Activity</h2>
              <p className="section-subtitle">
                Manage requests you've sent and requests you've received from other hospitality businesses.
              </p>
            </div>
          </div>
          <div className="my-requests-empty-card">
            <div className="empty-requests-icon">👑</div>
            <h3 className="empty-requests-title">Administrator Account</h3>
            <p className="empty-requests-subtitle">
              Admin accounts do not participate in marketplace booking requests. Use the Admin Dashboard to monitor marketplace activity, audit logs, and analytics.
            </p>
            {onNavigateAdmin && (
              <button
                type="button"
                className="btn btn-primary empty-requests-cta"
                onClick={onNavigateAdmin}
              >
                Go to Admin Dashboard
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="my-activity-section">
      <div className="container">
        <div className="section-header-row activity-header-row">
          <div>
            <h2 className="section-title">My Activity</h2>
            <p className="section-subtitle">
              Manage requests you've sent and requests you've received from other hospitality businesses.
            </p>
          </div>
        </div>

        {hasBoth && (
          <div className="activity-tabs-container">
            <div className="activity-tabs" role="tablist" aria-label="Activity request views">
              <button
                type="button"
                role="tab"
                id="tab-sent-requests"
                aria-selected={activeSubTab === 'sent'}
                aria-controls="panel-sent-requests"
                className={`activity-tab-btn ${activeSubTab === 'sent' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('sent')}
              >
                Requests I've Sent
              </button>
              <button
                type="button"
                role="tab"
                id="tab-received-requests"
                aria-selected={activeSubTab === 'received'}
                aria-controls="panel-received-requests"
                className={`activity-tab-btn ${activeSubTab === 'received' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('received')}
              >
                Requests I've Received
              </button>
            </div>
          </div>
        )}

        {showSent && (!hasBoth || activeSubTab === 'sent') && (
          <SentRequestsPanel
            onBrowseResources={onBrowseResources}
            isUnifiedView={true}
            hasTabs={hasBoth}
          />
        )}

        {showReceived && (!hasBoth || activeSubTab === 'received') && (
          <ReceivedRequestsPanel
            onBrowseResources={onBrowseResources}
            isUnifiedView={true}
            hasTabs={hasBoth}
          />
        )}
      </div>
    </section>
  );
}

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showListResourceModal, setShowListResourceModal] = useState(false);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedResource, setSelectedResource] = useState(null);
  const [requestResource, setRequestResource] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  useEffect(() => {
    api.get('/resources')
      .then((data) => {
        setResources(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching resources:', err);
        setError('Unable to load resources.');
        setLoading(false);
      });
  }, []);

  const handleOpenRequest = (resource) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setSelectedResource(null);
    setRequestResource(resource);
  };

  const handleSubmitRequest = (formData) => {
    setSubmittedRequest(formData);
    setRequestResource(null);
    setShowConfirmation(true);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setSubmittedRequest(null);
  };

  const scrollToResources = () => {
    const el = document.getElementById('resources');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBrowseResources = () => {
    if (activeTab !== 'marketplace') {
      setActiveTab('marketplace');
      setTimeout(() => {
        scrollToResources();
      }, 50);
    } else {
      scrollToResources();
    }
  };

  const handleOpenListResource = () => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setShowListResourceModal(true);
  };

  const handleResourceCreated = (newResource) => {
    setResources((prev) => [newResource, ...prev]);
    setShowListResourceModal(false);
    setActiveTab('marketplace');
    setTimeout(() => {
      scrollToResources();
    }, 100);
  };

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBrowseResources={handleBrowseResources}
        isAuthenticated={isAuthenticated}
        user={user}
        onOpenAuth={(mode = 'login') => {
          setAuthMode(mode);
          setShowAuthModal(true);
        }}
        onLogout={logout}
        onOpenListResource={handleOpenListResource}
      />
      <main>
        {activeTab === 'marketplace' ? (
          <>
            <Hero onBrowseResources={handleBrowseResources} />
            <StatsStrip />
            <HowItWorks />
            <MarketplaceSection
              resources={resources}
              loading={loading}
              error={error}
              onSelectResource={setSelectedResource}
            />
          </>
        ) : activeTab === 'admin-dashboard' ? (
          !isAuthenticated ? (
            <AuthGate
              title="Sign In to Access Admin Dashboard"
              message="You need an active Administrator account to view marketplace analytics and management controls."
              actionText="Sign In / Register"
              onAction={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
            />
          ) : user?.role !== 'admin' ? (
            <AuthGate
              title="Admin Privileges Required"
              message="Access to the ResShare Analytics Dashboard is restricted to verified platform administrators."
              actionText="Browse Marketplace"
              onAction={handleBrowseResources}
              icon="🔒"
            />
          ) : (
            <AdminDashboardSection onBrowseResources={handleBrowseResources} currentUser={user} />
          )
        ) : (
          !isAuthenticated ? (
            <AuthGate
              title="Sign In to View Your Activity"
              message="Sign in to your ResShare account to view, track, and manage your hospitality bookings and requests."
              actionText="Sign In / Register"
              onAction={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
            />
          ) : (
            <MyActivitySection
              onBrowseResources={handleBrowseResources}
              onNavigateAdmin={() => setActiveTab('admin-dashboard')}
            />
          )
        )}
      </main>

      {/* Step 1: Resource Details Modal */}
      <ResourceDetailModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
        onRequestResource={handleOpenRequest}
      />

      {/* Step 2: Booking Request Modal */}
      <BookingRequestModal
        resource={requestResource}
        onClose={() => setRequestResource(null)}
        onSubmit={handleSubmitRequest}
        onRequireAuth={() => {
          setAuthMode('login');
          setShowAuthModal(true);
        }}
      />

      {/* Step 3: Request Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        requestData={submittedRequest}
        onClose={handleCloseConfirmation}
      />

      {/* Step 4: Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* Step 5: List a Resource Modal */}
      <ListResourceModal
        isOpen={showListResourceModal}
        onClose={() => setShowListResourceModal(false)}
        onSuccess={handleResourceCreated}
        onRequireAuth={() => {
          setAuthMode('login');
          setShowAuthModal(true);
        }}
      />
    </div>
  );
}

export default App;
