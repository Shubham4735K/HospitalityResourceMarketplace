import React, { useState, useEffect } from 'react';

function BookingRequestModal({ resource, onClose, onSubmit }) {
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

  // Scroll lock with reliable cleanup
  useEffect(() => {
    if (!resource) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [resource]);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    requestedDate: '',
    startTime: '',
    endTime: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form fields and validation errors whenever a new resource request is opened
  useEffect(() => {
    if (resource) {
      setFormData({
        fullName: '',
        businessName: '',
        email: '',
        phone: '',
        requestedDate: '',
        startTime: '',
        endTime: '',
        message: ''
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    }
  }, [resource]);

  if (!resource) return null;

  const formattedRate = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(resource.rate);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    }

    if (!formData.requestedDate) {
      newErrors.requestedDate = 'Requested date is required.';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required.';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required.';
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = 'End time must be later than start time.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (validate()) {
      setIsSubmitting(true);
      try {
        const response = await fetch('http://localhost:5000/api/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          onSubmit({
            resource,
            ...formData
          });
        } else {
          setSubmitError('Unable to send request. Please try again.');
        }
      } catch (err) {
        console.error('Error sending request:', err);
        setSubmitError('Unable to send request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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
        className="modal-dialog request-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-request-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close request form"
        >
          ✕
        </button>

        <div className="request-modal-header">
          <span className="badge badge-amber">B2B Resource Request</span>
          <h2 id="booking-request-title" className="request-modal-title">
            Request Resource Access
          </h2>
          <p className="request-modal-subtitle">
            Submit your usage requirements to the host business.
          </p>
        </div>

        {/* Compact Resource Summary Card */}
        <div className="request-resource-summary">
          <img
            src={resource.image}
            alt={resource.title}
            className="summary-thumb"
          />
          <div className="summary-details">
            <h3 className="summary-title">{resource.title}</h3>
            <p className="summary-host">
              {resource.hostBusiness} • 📍 {resource.location}
            </p>
            <div className="summary-rate">
              <span className="rate-value">{formattedRate}</span>
              <span className="rate-unit">/{resource.rateUnit}</span>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="request-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Full Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
              />
              {errors.fullName && (
                <span className="error-message">{errors.fullName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="businessName" className="form-label">
                Business Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                className={`form-input ${errors.businessName ? 'input-error' : ''}`}
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={handleChange}
              />
              {errors.businessName && (
                <span className="error-message">{errors.businessName}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@business.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone Number <span className="required-star">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className={`form-input ${errors.phone ? 'input-error' : ''}`}
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && (
                <span className="error-message">{errors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-row form-row-three">
            <div className="form-group">
              <label htmlFor="requestedDate" className="form-label">
                Requested Date <span className="required-star">*</span>
              </label>
              <input
                type="date"
                id="requestedDate"
                name="requestedDate"
                className={`form-input ${errors.requestedDate ? 'input-error' : ''}`}
                value={formData.requestedDate}
                onChange={handleChange}
              />
              {errors.requestedDate && (
                <span className="error-message">{errors.requestedDate}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="startTime" className="form-label">
                Start Time <span className="required-star">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                className={`form-input ${errors.startTime ? 'input-error' : ''}`}
                value={formData.startTime}
                onChange={handleChange}
              />
              {errors.startTime && (
                <span className="error-message">{errors.startTime}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endTime" className="form-label">
                End Time <span className="required-star">*</span>
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                className={`form-input ${errors.endTime ? 'input-error' : ''}`}
                value={formData.endTime}
                onChange={handleChange}
              />
              {errors.endTime && (
                <span className="error-message">{errors.endTime}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">
              Message / Requirements <span className="optional-tag">(Optional)</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows="3"
              className="form-textarea"
              placeholder="Tell the host about your requirements..."
              value={formData.message}
              onChange={handleChange}
            />
          </div>

          {submitError && (
            <div className="error-message" style={{ marginBottom: 'var(--space-3)' }}>
              {submitError}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary form-submit-btn"
              disabled={isSubmitting}
            >
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingRequestModal;
