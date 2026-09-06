import React, { useEffect } from 'react';

function ConfirmationModal({ isOpen, requestData, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen || !requestData) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, requestData, onClose]);

  // Scroll lock with reliable cleanup
  useEffect(() => {
    if (!isOpen || !requestData) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isOpen, requestData]);

  if (!isOpen || !requestData) return null;

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
        className="modal-dialog confirmation-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close confirmation dialog"
        >
          ✕
        </button>

        <div className="confirmation-content">
          {/* Success Emerald Icon */}
          <div className="confirmation-icon-circle">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <span className="badge badge-verified confirmation-badge">
            Request Transmitted
          </span>

          <h2 id="confirmation-modal-title" className="confirmation-title">
            Request Sent Successfully
          </h2>

          <p className="confirmation-message">
            Your request has been sent to the host business. They can review your
            requirements and respond with availability.
          </p>

          {/* Request Summary Card */}
          <div className="confirmation-summary-card">
            <div className="confirmation-summary-row">
              <span className="summary-label">Resource</span>
              <span className="summary-val highlight">
                {requestData.resource?.title}
              </span>
            </div>

            <div className="confirmation-summary-row">
              <span className="summary-label">Host Business</span>
              <span className="summary-val">
                {requestData.resource?.hostBusiness}
              </span>
            </div>

            <div className="confirmation-summary-row">
              <span className="summary-label">Requested Date</span>
              <span className="summary-val">{requestData.requestedDate}</span>
            </div>

            <div className="confirmation-summary-row">
              <span className="summary-label">Requested Time</span>
              <span className="summary-val">
                {requestData.startTime} – {requestData.endTime}
              </span>
            </div>

            <div className="confirmation-summary-row">
              <span className="summary-label">Requesting Business</span>
              <span className="summary-val">{requestData.businessName}</span>
            </div>
          </div>

          <div className="confirmation-actions">
            <button
              type="button"
              className="btn btn-primary confirmation-done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
