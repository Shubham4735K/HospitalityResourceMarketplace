import React from 'react';

function ResourceCard({ resource, onViewDetails }) {
  const formattedRate = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(resource.rate);

  const handleViewDetails = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (typeof onViewDetails === 'function') {
      onViewDetails(resource);
    } else if (typeof resource?.onViewDetails === 'function') {
      resource.onViewDetails(resource);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewDetails(e);
    }
  };

  return (
    <article
      className="resource-card"
      onClick={handleViewDetails}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${resource.title}`}
    >
      {/* 1. Image */}
      <div className="card-media">
        <img
          src={resource.image}
          alt={resource.title}
          className="card-image"
          loading="lazy"
        />
        <div className="card-media-badges">
          <span className="badge badge-amber">{resource.category}</span>
          <div className="badges-group-end">
            {typeof resource.matchScore === 'number' && (
              <span className="badge badge-match">{resource.matchScore}% Match</span>
            )}
            {resource.verified && (
              <span className="badge badge-verified">
                <span className="badge-dot" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* 2. Resource Title */}
        <h3 className="card-title">{resource.title}</h3>

        {/* 3. Location */}
        <div className="card-location">
          <svg
            className="location-pin-icon"
            viewBox="0 0 24 24"
            width="13"
            height="13"
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
        </div>

        {/* 4. Host / Business */}
        <div className="card-host">
          <span className="host-label">Host: </span>
          <span className="host-name">{resource.hostBusiness}</span>
        </div>

        {/* 5. Rate & 6. Availability */}
        <div className="card-meta-row">
          <div className="card-pricing">
            <span className="rate-amount">{formattedRate}</span>
            <span className="rate-unit">/{resource.rateUnit}</span>
          </div>

          <div className="card-availability">
            <span className="availability-dot" />
            <span className="availability-text">{resource.availability}</span>
          </div>
        </div>

        {/* 7. View Details */}
        <div className="card-footer">
          <button
            type="button"
            className="btn btn-outline card-action-btn"
            onClick={handleViewDetails}
            aria-label={`View details for ${resource.title}`}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

export default ResourceCard;
