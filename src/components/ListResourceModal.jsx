import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';

const CATEGORIES = [
  'Commercial Kitchen & Prep',
  'Venues & Spaces',
  'Commercial Equipment',
  'Event Supplies & Decor'
];

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80';

function ListResourceModal({ isOpen, onClose, onSuccess, onRequireAuth }) {
  const { isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Commercial Kitchen & Prep',
    hostBusiness: '',
    location: '',
    rate: '',
    rateUnit: 'hour',
    availability: '',
    description: '',
    specs: '',
    houseRules: '',
    image: ''
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Scroll lock with reliable cleanup
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        category: 'Commercial Kitchen & Prep',
        hostBusiness:
          (user && user.businessProfile && user.businessProfile.businessName) ||
          (user && user.fullName) ||
          '',
        location:
          (user && user.businessProfile && user.businessProfile.city) || '',
        rate: '',
        rateUnit: 'hour',
        availability: 'Daily, 8:00 AM – 8:00 PM',
        description: '',
        specs: '',
        houseRules: 'Must hold valid food safety/operational certifications.\nClean and sanitize workstation after checkout.',
        image: ''
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrors({});
    setSubmitError('');
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setSubmitError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Resource title is required.';
    }

    if (!formData.category || !CATEGORIES.includes(formData.category)) {
      newErrors.category = 'Please select a valid category.';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location (city / area) is required.';
    }

    const rateNum = Number(formData.rate);
    if (!formData.rate || isNaN(rateNum) || rateNum <= 0) {
      newErrors.rate = 'Rate must be a positive number greater than 0.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Resource description is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse multi-line or comma-separated specs and house rules into arrays
      const specsArray = formData.specs
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const houseRulesArray = formData.houseRules
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        hostBusiness: formData.hostBusiness.trim(),
        location: formData.location.trim(),
        rate: Number(formData.rate),
        rateUnit: formData.rateUnit || 'hour',
        availability: formData.availability.trim() || 'Daily, Available on request',
        description: formData.description.trim(),
        specs: specsArray,
        houseRules: houseRulesArray,
        image: formData.image.trim() || DEFAULT_IMAGE
      };

      const createdResource = await api.post('/resources', payload);

      if (onSuccess) {
        onSuccess(createdResource);
      }
      handleClose();
    } catch (err) {
      console.error('Error creating resource:', err);
      if (err.status === 401) {
        setSubmitError('Your session has expired. Please sign in again.');
        if (onRequireAuth) {
          onRequireAuth();
        }
      } else if (err.status === 403) {
        setSubmitError('Access denied. Only provider accounts can list resources.');
      } else {
        setSubmitError(err.message || 'Unable to list resource. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current authenticated user has provider permissions
  const isSeekerOnly = isAuthenticated && user && user.role === 'seeker';

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog list-resource-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-resource-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Close resource listing form"
        >
          ✕
        </button>

        <div className="request-modal-header">
          <span className="badge badge-amber">Host Listing</span>
          <h2 id="list-resource-title" className="request-modal-title">
            List a Hospitality Resource
          </h2>
          <p className="request-modal-subtitle">
            Publish an available kitchen, banquet hall, commercial equipment, or event asset to the marketplace.
          </p>
        </div>

        {/* If user is only a seeker, inform them that provider permissions are required */}
        {isSeekerOnly ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-4)'
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}
            >
              🔒
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Provider Account Required
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.925rem',
                maxWidth: 440,
                lineHeight: 1.6
              }}
            >
              Your account is currently registered as a <strong>Seeker</strong>. Only{' '}
              <strong>Provider</strong> or <strong>Both</strong> accounts can list hospitality assets for rent.
            </p>
            <div className="form-actions" style={{ width: '100%', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClose}
              >
                Close & Browse Marketplace
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="request-form" noValidate>
            {/* Title */}
            <div className="form-group">
              <label htmlFor="resource-title" className="form-label">
                Resource Title <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="resource-title"
                name="title"
                placeholder="e.g. Off-Peak Commercial Bakery & Pastry Kitchen"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                value={formData.title}
                onChange={handleChange}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            {/* Category & Location */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="resource-category" className="form-label">
                  Category <span className="required-star">*</span>
                </label>
                <select
                  id="resource-category"
                  name="category"
                  className={`form-input ${errors.category ? 'input-error' : ''}`}
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <span className="error-message">{errors.category}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="resource-location" className="form-label">
                  Location (Area, City) <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="resource-location"
                  name="location"
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className={`form-input ${errors.location ? 'input-error' : ''}`}
                  value={formData.location}
                  onChange={handleChange}
                />
                {errors.location && (
                  <span className="error-message">{errors.location}</span>
                )}
              </div>
            </div>

            {/* Rate, Rate Unit, and Host Business */}
            <div className="form-row-three form-row">
              <div className="form-group">
                <label htmlFor="resource-rate" className="form-label">
                  Rate (₹ INR) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  id="resource-rate"
                  name="rate"
                  min="1"
                  step="50"
                  placeholder="e.g. 1500"
                  className={`form-input ${errors.rate ? 'input-error' : ''}`}
                  value={formData.rate}
                  onChange={handleChange}
                />
                {errors.rate && <span className="error-message">{errors.rate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="resource-rateUnit" className="form-label">
                  Rate Unit <span className="required-star">*</span>
                </label>
                <select
                  id="resource-rateUnit"
                  name="rateUnit"
                  className="form-input"
                  value={formData.rateUnit}
                  onChange={handleChange}
                >
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="resource-hostBusiness" className="form-label">
                  Host Business <span className="optional-tag">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="resource-hostBusiness"
                  name="hostBusiness"
                  placeholder="e.g. The Artisan Loaf"
                  className="form-input"
                  value={formData.hostBusiness}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Availability */}
            <div className="form-group">
              <label htmlFor="resource-availability" className="form-label">
                Availability Window <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="text"
                id="resource-availability"
                name="availability"
                placeholder="e.g. Mon–Fri, 4:00 AM – 11:00 AM or Daily, 24/7"
                className="form-input"
                value={formData.availability}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="resource-description" className="form-label">
                Detailed Description <span className="required-star">*</span>
              </label>
              <textarea
                id="resource-description"
                name="description"
                rows="3"
                placeholder="Describe equipment capacity, workstations, power supply, and operational details..."
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && (
                <span className="error-message">{errors.description}</span>
              )}
            </div>

            {/* Specs & House Rules */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="resource-specs" className="form-label">
                  Key Specifications <span className="optional-tag">(1 per line)</span>
                </label>
                <textarea
                  id="resource-specs"
                  name="specs"
                  rows="3"
                  placeholder="3-Deck Stone Hearth Oven&#10;60L Spiral Dough Mixer&#10;3-Phase Industrial Power"
                  className="form-textarea"
                  value={formData.specs}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resource-houseRules" className="form-label">
                  House Rules / Requirements <span className="optional-tag">(1 per line)</span>
                </label>
                <textarea
                  id="resource-houseRules"
                  name="houseRules"
                  rows="3"
                  placeholder="Valid FSSAI certificate required&#10;Full workstation sanitize before checkout"
                  className="form-textarea"
                  value={formData.houseRules}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="form-group">
              <label htmlFor="resource-image" className="form-label">
                Photo URL <span className="optional-tag">(Optional - default image provided)</span>
              </label>
              <input
                type="url"
                id="resource-image"
                name="image"
                placeholder="https://images.unsplash.com/..."
                className="form-input"
                value={formData.image}
                onChange={handleChange}
              />
            </div>

            {/* Submit Error Banner */}
            {submitError && (
              <div
                className="error-message"
                role="alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}
              >
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary form-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Listing Resource...' : '🚀 Publish Resource'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ListResourceModal;
