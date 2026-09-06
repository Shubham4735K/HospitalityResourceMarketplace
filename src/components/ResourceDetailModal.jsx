import React, { useEffect } from 'react';

function ResourceDetailModal({ resource, onClose }) {
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

  // If no resource is selected, render nothing
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
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog"
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
          ✕
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
              <span className="modal-location">📍 {resource.location}</span>
            </div>
            <h2 id="modal-resource-title" className="modal-title">
              {resource.title}
            </h2>
          </div>

          {/* Pricing & Availability Highlight Card */}
          <div className="modal-highlight-card">
            <div className="highlight-pricing">
              <span className="highlight-rate-label">Resource Rate</span>
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

          {/* Description */}
          <div className="modal-section">
            <h3 className="modal-section-title">About This Resource</h3>
            <p className="modal-description">{resource.description}</p>
          </div>

          {/* Specifications List */}
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

          {/* House Rules List */}
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
        </div>
      </div>
    </div>
  );
}

export default ResourceDetailModal;
