import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const ROLE_LABELS = {
  seeker: 'Resource Seeker (Browse & Book Resources)',
  provider: 'Resource Provider (List & Manage Resources)',
  both: 'Dual Role (Seeker & Provider Access)'
};

const ROLE_DESCRIPTIONS = {
  seeker: 'Search, discover, and request hospitality resources, commercial kitchens, and event spaces.',
  provider: 'List, host, and manage your underutilized hospitality resources and handle incoming bookings.',
  both: 'Full access to browse and request external resources while listing and hosting your own assets.'
};

export default function RoleChangeModal({ isOpen, onClose, user, onStatusChange }) {
  const [currentReq, setCurrentReq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isOpen]);

  // Fetch user's role change request on open
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccess('');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    api.get('/users/role-change-request')
      .then((data) => {
        if (!isMounted) return;
        setCurrentReq(data.request || null);
        // Default target role to first available non-current role
        const curRole = user?.role || 'seeker';
        const availableRoles = ['seeker', 'provider', 'both'].filter((r) => r !== curRole);
        setSelectedRole(availableRoles[0] || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching role change request:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentRole = user?.role || 'seeker';
  const hasPending = currentReq && currentReq.status === 'Pending';
  const availableTargetRoles = ['seeker', 'provider', 'both'].filter((r) => r !== currentRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedRole) {
      setError('Please select a target account type.');
      return;
    }

    if (selectedRole === currentRole) {
      setError('Requested role must be different from your current role.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/users/role-change-request', {
        requestedRole: selectedRole,
        reason: reason.trim()
      });

      setSuccess('Your account type change request has been submitted for Administrator review.');
      setCurrentReq(res.request);
      setReason('');
      if (onStatusChange) {
        onStatusChange(res.request);
      }
    } catch (err) {
      console.error('Error submitting role change request:', err);
      setError(err.message || 'Failed to submit account type change request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div
      className="modal-backdrop role-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog role-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
          disabled={submitting}
        >
          ✕
        </button>

        <div className="role-modal-header">
          <div className="role-modal-badge-row">
            <span className="badge badge-amber">Account Settings</span>
          </div>
          <h2 id="role-modal-title" className="role-modal-title">
            Request Account Type Change
          </h2>
          <p className="role-modal-subtitle">
            Account role changes require platform Administrator review and approval to ensure
            compliance with marketplace host and seeker standards.
          </p>
        </div>

        <div className="role-modal-body">
          {/* Current Role Card */}
          <div className="role-current-card">
            <div className="role-current-meta">
              <span className="role-current-label">Current Account Type:</span>
              <span className={`role-badge role-badge-${currentRole}`}>
                {currentRole === 'both'
                  ? 'Dual Role (Seeker & Provider)'
                  : currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
              </span>
            </div>
            <p className="role-current-desc">
              {ROLE_DESCRIPTIONS[currentRole] || ''}
            </p>
          </div>

          {/* Pending Request Banner */}
          {hasPending && (
            <div className="role-pending-notice" role="status">
              <div className="role-notice-icon">⏳</div>
              <div className="role-notice-content">
                <h4 className="role-notice-title">Change Request Under Review</h4>
                <p className="role-notice-text">
                  You requested to switch to <strong>{currentReq.requestedRole.toUpperCase()}</strong> on{' '}
                  {formatDate(currentReq.createdAt)}.
                </p>
                <div className="role-notice-status-row">
                  <span className="badge badge-pending">Status: Pending Administrator Review</span>
                  {currentReq.reason && (
                    <span className="role-notice-reason">"{currentReq.reason}"</span>
                  )}
                </div>
                <p className="role-notice-footnote">
                  You cannot submit another account type change request while one is pending review.
                </p>
              </div>
            </div>
          )}

          {/* Past Request Info if not pending */}
          {!hasPending && currentReq && (
            <div className="role-history-notice">
              <span className="role-history-label">Previous Request:</span>
              <span
                className={`badge ${
                  currentReq.status === 'Approved' ? 'badge-accepted' : 'badge-cancelled'
                }`}
              >
                {currentReq.status}
              </span>
              <span className="role-history-detail">
                {currentReq.requestedRole} on {formatDate(currentReq.updatedAt || currentReq.createdAt)}
              </span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="admin-success-banner" role="status" style={{ marginBottom: 'var(--space-4)' }}>
              <span>✓ {success}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="admin-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="admin-error-content">
                <span className="admin-error-icon">⚠️</span>
                <div>{error}</div>
              </div>
            </div>
          )}

          {/* Form to submit role change request */}
          {!hasPending && (
            <form onSubmit={handleSubmit} className="role-change-form">
              <div className="form-group">
                <label className="form-label" htmlFor="role-select">
                  Select Desired Account Type <span className="required-star">*</span>
                </label>
                <div className="role-options-list">
                  {availableTargetRoles.map((r) => (
                    <label
                      key={r}
                      className={`role-option-card ${selectedRole === r ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="requestedRole"
                        value={r}
                        checked={selectedRole === r}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        disabled={submitting || loading}
                      />
                      <div className="role-option-text">
                        <div className="role-option-title">{ROLE_LABELS[r]}</div>
                        <div className="role-option-desc">{ROLE_DESCRIPTIONS[r]}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="role-reason">
                  Reason for Request (Optional)
                </label>
                <textarea
                  id="role-reason"
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. We have expanded our kitchen operations and want to offer spare prep tables during morning hours."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting || loading}
                  maxLength="500"
                />
                <span className="form-help-text">
                  Provide brief context to assist the Administrator in reviewing your request.
                </span>
              </div>

              <div className="role-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loading || !selectedRole}
                  id="submit-role-change-btn"
                >
                  {submitting ? 'Submitting Request...' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          )}

          {hasPending && (
            <div className="role-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
