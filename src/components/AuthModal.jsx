import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';

export function AuthModal({ isOpen, onClose, initialMode = 'login', subtitle = '', onSuccess }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('seeker'); // 'seeker' | 'provider' | 'both'
  const [businessName, setBusinessName] = useState('');

  // UI status
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode if initialMode changes when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen, initialMode]);

  // Escape key listener to close modal
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

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
    setSubmitError('');
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (mode === 'register' && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full Name is required.';
      }

      if ((role === 'provider' || role === 'both') && !businessName.trim()) {
        newErrors.businessName = 'Business Name is required for providers.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getReadableAuthError = (err, currentMode) => {
    // Distinguish network failures or backend unavailability
    if (err.name === 'TypeError' || (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')))) {
      return 'Authentication service is currently unreachable. Please verify your connection or try again shortly.';
    }

    if (err.status) {
      if (err.status === 401) {
        return 'Invalid email or password. Please verify your credentials and try again.';
      }
      if (err.status === 409) {
        return 'An account with this email already exists. Please sign in or use a different email.';
      }
      if (err.status === 400) {
        return err.message || 'Please check your input details and try again.';
      }
      if (err.status === 403) {
        return err.message || 'Account access denied. Please contact platform administration.';
      }
      if (err.status === 503) {
        return 'Database service is temporarily unavailable. Please try again shortly.';
      }
      if (err.status === 500) {
        if (err.message && (err.message.includes('JWT') || err.message.includes('configuration') || err.message.includes('misconfigured'))) {
          return 'Server configuration error: Authentication service is misconfigured. Please contact platform administration.';
        }
        if (err.message && err.message !== 'Failed to log in.' && err.message !== 'Failed to register user.') {
          return err.message;
        }
        return 'A server error occurred during authentication. Please try again shortly.';
      }
    }

    if (err.message && err.message !== 'Failed to log in.' && err.message !== 'Failed to register user.') {
      return err.message;
    }

    return currentMode === 'login'
      ? 'Invalid email or password. Please try again.'
      : 'Unable to create account. Please verify your information and try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password
        });

        if (res && res.token && res.user) {
          login(res.token, res.user);
          if (onSuccess) onSuccess(res.user);
          onClose();
        } else {
          throw new Error('Unexpected response from login service.');
        }
      } else {
        // Register mode
        const payload = {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          businessProfile: {
            businessName: (role === 'provider' || role === 'both')
              ? businessName.trim()
              : (businessName.trim() || '')
          }
        };

        const res = await api.post('/auth/register', payload);

        if (res && res.token && res.user) {
          login(res.token, res.user);
          if (onSuccess) onSuccess(res.user);
          onClose();
        } else {
          // If backend only registered without returning session, switch to login
          switchMode('login');
          setSubmitError('Registration successful! Please sign in with your credentials.');
        }
      }
    } catch (err) {
      setSubmitError(getReadableAuthError(err, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop auth-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog auth-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close authentication form"
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

        {/* Mode Toggle Header */}
        <div className="auth-modal-header">
          <div className="auth-tab-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          <h2 id="auth-modal-title" className="auth-title">
            {mode === 'login' ? 'Welcome Back' : 'Join ResShare'}
          </h2>
          <p className="auth-subtitle">
            {subtitle || (mode === 'login'
              ? 'Sign in to request resources, manage bookings, and communicate with hosts.'
              : 'Create an account to discover, share, and exchange hospitality assets.')}
          </p>
        </div>

        {/* Error Alert Box */}
        {submitError && (
          <div className="auth-error-banner" role="alert">
            <svg
              className="auth-error-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="auth-error-text">{submitError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-fullName" className="form-label">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="auth-fullName"
                name="fullName"
                className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                placeholder="e.g. Maya Chen"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={isSubmitting}
              />
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email" className="form-label">
              Email Address <span className="required-star">*</span>
            </label>
            <input
              type="email"
              id="auth-email"
              name="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@hospitalitybiz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="auth-password" className="form-label">
              Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="auth-password"
                name="password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <>
              {/* Role Selection */}
              <div className="form-group">
                <label className="form-label">
                  Account Type <span className="required-star">*</span>
                </label>
                <div className="role-options-grid">
                  <label className={`role-option-card ${role === 'seeker' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="seeker"
                      checked={role === 'seeker'}
                      onChange={() => setRole('seeker')}
                      disabled={isSubmitting}
                    />
                    <div className="role-card-body">
                      <span className="role-card-title">Seeker</span>
                      <span className="role-card-desc">Looking to discover and request resources</span>
                    </div>
                  </label>

                  <label className={`role-option-card ${role === 'provider' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="provider"
                      checked={role === 'provider'}
                      onChange={() => setRole('provider')}
                      disabled={isSubmitting}
                    />
                    <div className="role-card-body">
                      <span className="role-card-title">Provider</span>
                      <span className="role-card-desc">Hosting commercial resources to share</span>
                    </div>
                  </label>

                  <label className={`role-option-card ${role === 'both' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="both"
                      checked={role === 'both'}
                      onChange={() => setRole('both')}
                      disabled={isSubmitting}
                    />
                    <div className="role-card-body">
                      <span className="role-card-title">Both</span>
                      <span className="role-card-desc">Seeking access and sharing my own assets</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Business Name (required for Provider & Both) */}
              {(role === 'provider' || role === 'both') && (
                <div className="form-group">
                  <label htmlFor="auth-businessName" className="form-label">
                    Business Name <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="auth-businessName"
                    name="businessName"
                    className={`form-input ${errors.businessName ? 'input-error' : ''}`}
                    placeholder="e.g. The Artisan Loaf & Patisserie"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {errors.businessName ? (
                    <span className="error-message">{errors.businessName}</span>
                  ) : (
                    <span className="form-hint">
                      Must match the host business name on resources you share.
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Submit CTA */}
          <div className="auth-form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (mode === 'login' ? 'Signing In...' : 'Creating Account...')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>

        {/* Footer switch prompt */}
        <div className="auth-modal-footer">
          {mode === 'login' ? (
            <p className="auth-switch-text">
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode('register')}
                disabled={isSubmitting}
              >
                Create one now
              </button>
            </p>
          ) : (
            <p className="auth-switch-text">
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode('login')}
                disabled={isSubmitting}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
