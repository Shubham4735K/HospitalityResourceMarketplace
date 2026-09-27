import React from 'react';

function ResourceCard({ resource, onViewDetails }) {
  const formattedRate = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(resource.rate);

  const handleViewDetails = () => {
    if (typeof onViewDetails === 'function') {
      onViewDetails(resource);
    } else if (typeof resource?.onViewDetails === 'function') {
      resource.onViewDetails(resource);
    }
  };

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
          <div className="badges-group-end">
            {typeof resource.matchScore === 'number' && (
              <span className="badge badge-match">{resource.matchScore}% Match</span>
            )}
            {resource.verified && (
              <span className="badge badge-verified">✓ Verified</span>
            )}
          </div>
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

        {resource.aiMatchReasons && resource.aiMatchReasons.length > 0 && (
          <div className="card-why-matches">
            <div className="why-matches-header">
              <span className="why-matches-title">✨ Why this matches</span>
              <span className="why-matches-badge">Database Verified</span>
            </div>
            <ul className="why-matches-list">
              {resource.aiMatchReasons.map((reason, idx) => (
                <li key={idx} className="why-matches-item">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card-footer">
          <div className="card-pricing">
            <span className="rate-amount">{formattedRate}</span>
            <span className="rate-unit">/{resource.rateUnit}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline card-action-btn"
            onClick={handleViewDetails}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

export default ResourceCard;
