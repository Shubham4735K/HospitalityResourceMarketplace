import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function ResourceDetailModal({ resource, onClose, onRequestResource }) {
  const { user } = useAuth();
  const isProviderOnly = user?.role === 'provider';

  // Close on Escape key
  useEffect(() => {
    if (!resource) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resource, onClose]);

  // Prevent background scrolling while modal is active, restore on cleanup
  useEffect(() => {
    if (!resource) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [resource]);

  if (!resource) return null;

  const formattedRate = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(resource.rate);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop resource-detail-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog resource-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-resource-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close details modal"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Large Resource Image */}
        <div className="modal-hero-media">
          <img
            src={resource.image}
            alt={resource.title}
            className="modal-hero-image"
          />
          <div className="modal-media-overlay-badges">
            <span className="badge badge-amber">{resource.category}</span>
            {resource.verified && (
              <span className="badge badge-verified">✓ Verified Partner</span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-content">
          {/* Header Row */}
          <div className="modal-header-info">
            <div className="modal-host-meta">
              <span className="modal-host-name">{resource.hostBusiness}</span>
              <span className="modal-location">
                <svg
                  className="location-pin-icon"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{resource.location}</span>
              </span>
            </div>
            <h2 id="modal-resource-title" className="modal-title">
              {resource.title}
            </h2>
          </div>

          {/* Pricing & Availability Highlight Card */}
          <div className="modal-highlight-card">
            <div className="highlight-pricing">
              <span className="highlight-rate-label">Listed Resource Rate</span>
              <div className="highlight-rate-value">
                <span className="highlight-amount">{formattedRate}</span>
                <span className="highlight-unit">/{resource.rateUnit}</span>
              </div>
            </div>
            <div className="highlight-divider" />
            <div className="highlight-availability">
              <span className="highlight-avail-label">Availability Window</span>
              <span className="highlight-avail-value">{resource.availability}</span>
            </div>
          </div>

          {/* Prominent Action Button to Request Resource */}
          <div className="modal-cta-row">
            {isProviderOnly ? (
              <div className="provider-request-restriction-note">
                <span className="badge badge-amber" style={{ marginBottom: 'var(--space-2)' }}>
                  Provider Account
                </span>
                <p className="restriction-text">
                  Provider accounts cannot submit resource booking requests. Change your account type to <strong>Seeker</strong> or <strong>Dual Role (Both)</strong> to request resources.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary modal-cta-btn"
                  disabled
                  title="Provider accounts cannot submit booking requests"
                >
                  Request Resource (Provider Restricted)
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary modal-cta-btn"
                onClick={() => onRequestResource && onRequestResource(resource)}
              >
                Request Resource
              </button>
            )}
          </div>

          {/* Description */}
          <div className="modal-section">
            <h3 className="modal-section-title">About This Resource</h3>
            <p className="modal-description">{resource.description}</p>
          </div>

          {/* Specifications List */}
          {Array.isArray(resource.specs) && resource.specs.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Technical Specifications</h3>
              <ul className="modal-specs-list">
                {resource.specs.map((spec, index) => (
                  <li key={index} className="modal-spec-item">
                    <span className="spec-bullet">✓</span>
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* House Rules List */}
          {Array.isArray(resource.houseRules) && resource.houseRules.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Host Guidelines & Rules</h3>
              <ul className="modal-rules-list">
                {resource.houseRules.map((rule, index) => (
                  <li key={index} className="modal-rule-item">
                    <span className="rule-bullet">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResourceDetailModal;
