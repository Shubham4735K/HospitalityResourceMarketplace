import React from 'react';
import ResourceCard from './ResourceCard.jsx';

function ResourceGrid({ resources = [], onViewDetails }) {
  if (!resources.length) {
    return (
      <div className="catalog-placeholder">
        <p className="placeholder-text">No hospitality resources found.</p>
      </div>
    );
  }

  return (
    <div className="resource-grid">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id || resource._id}
          resource={resource}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

export default ResourceGrid;

