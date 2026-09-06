import React from 'react';

function ResourceCard({ resource }) {
  const formattedRate = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(resource.rate);

  return (
    <article className="resource-card">
      <div className="card-media">
        <img
          src={resource.image}
          alt={resource.title}
          className="card-image"
          loading="lazy"
        />
        <div className="card-media-badges">
          <span className="badge badge-amber">{resource.category}</span>
          {resource.verified && (
            <span className="badge badge-verified">✓ Verified</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="card-host-row">
          <span className="card-host">{resource.hostBusiness}</span>
          <span className="card-location">📍 {resource.location}</span>
        </div>

        <h3 className="card-title">{resource.title}</h3>

        <div className="card-availability">
          <span className="availability-label">Availability:</span>
          <span className="availability-text">{resource.availability}</span>
        </div>

        <div className="card-footer">
          <div className="card-pricing">
            <span className="rate-amount">{formattedRate}</span>
            <span className="rate-unit">/{resource.rateUnit}</span>
          </div>
          <button type="button" className="btn btn-outline card-action-btn">
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

export default ResourceCard;
