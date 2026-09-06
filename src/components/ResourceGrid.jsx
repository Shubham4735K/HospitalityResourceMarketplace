import React from 'react';
import ResourceCard from './ResourceCard';

function ResourceGrid({ resources = [] }) {
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
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}

export default ResourceGrid;
