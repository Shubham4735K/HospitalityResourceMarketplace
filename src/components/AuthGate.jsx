import React from 'react';

/**
 * Clean fallback view shown when an unauthenticated or unauthorized user
 * attempts to view a protected application section (e.g. My Requests, Provider Requests).
 */
export function AuthGate({ title, message, actionText = 'Sign In / Register', onAction, icon = '🔒' }) {
  return (
    <section className="auth-gate-section">
      <div className="container">
        <div className="auth-gate-card">
          <div className="auth-gate-icon" aria-hidden="true">
            {icon}
          </div>
          <h2 className="auth-gate-title">{title}</h2>
          <p className="auth-gate-message">{message}</p>
          {onAction && (
            <button
              type="button"
              className="btn btn-primary auth-gate-cta"
              onClick={onAction}
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default AuthGate;
