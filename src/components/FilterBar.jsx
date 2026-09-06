import React from 'react';

const CATEGORIES = [
  'All Resources',
  'Commercial Kitchen & Prep',
  'Venues & Spaces',
  'Commercial Equipment',
  'Event Supplies & Decor'
];

function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory
}) {
  return (
    <div className="filter-bar">
      {/* Search Input Box */}
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="search-input"
          placeholder="Search kitchens, venues, equipment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search resources"
        />
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="category-pills" role="tablist" aria-label="Filter resources by category">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FilterBar;
