import React, { useState } from 'react';

/**
 * ResShare — Geospatial Digital Twin Weather Impact Map
 * 
 * Interactive SVG/Canvas geospatial visualization plotting marketplace resources across
 * major Indian hospitality hubs (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad).
 * Displays real-time impact halos (Green = Low, Yellow = Medium, Red = High) with click-to-inspect drawers.
 */
export default function WeatherImpactMap({
  simulatedResources = [],
  selectedCity = 'All',
  onSelectCity,
  citiesList = []
}) {
  const [selectedResource, setSelectedResource] = useState(null);
  const [impactFilter, setImpactFilter] = useState('all');

  // Filter resources by city and impact level
  const filteredResources = simulatedResources.filter((res) => {
    const cityMatch = selectedCity === 'All' || res.coordinates?.city === selectedCity;
    const impactMatch = impactFilter === 'all' || res.simulated?.impactLevel === impactFilter;
    return cityMatch && impactMatch;
  });

  // Geographic bounds for mapping India coordinates to SVG coordinate space
  // India roughly spans Lat 8°N to 34°N, Lon 68°E to 92°E
  const MAP_BOUNDS = {
    minLat: 10.0,
    maxLat: 30.5,
    minLon: 70.0,
    maxLon: 86.0
  };

  // Convert GPS coordinates to SVG percentage coordinates (width 800, height 600)
  const projectCoordinates = (lat, lon) => {
    // Invert lat for Y axis (higher lat = lower Y in SVG)
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 520 + 40;
    const x = ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * 720 + 40;
    return { x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(570, y)) };
  };

  const getImpactColor = (level) => {
    if (level === 'high') return { fill: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', text: 'High Impact' };
    if (level === 'medium') return { fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', text: 'Medium Impact' };
    return { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', text: 'Low Impact' };
  };

  return (
    <div className="weather-map-card">
      <div className="map-card-header">
        <div>
          <span className="map-badge">🗺️ Geospatial Digital Twin</span>
          <h3 className="map-heading">Marketplace Impact Geospatial View</h3>
          <p className="map-subheading">
            Live geospatial distribution of hospitality assets showing localized weather shock vulnerability.
          </p>
          <p className="map-coordinate-note">
            📍 <strong>Note:</strong> Resource pins represent regional hospitality hubs with neighborhood dispersion based on listed location text. Exact building GPS coordinates are not stored.
          </p>
        </div>

        {/* Map Filter Controls */}
        <div className="map-filters-row">
          <div className="map-filter-group">
            <label htmlFor="map-city-select" className="filter-label">Region:</label>
            <select
              id="map-city-select"
              className="map-select-input"
              value={selectedCity}
              onChange={(e) => onSelectCity && onSelectCity(e.target.value)}
            >
              <option value="All">All Hospitality Hubs</option>
              {citiesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="map-impact-toggles" role="group" aria-label="Impact Severity Filter">
            <button
              type="button"
              className={`impact-toggle-btn ${impactFilter === 'all' ? 'active' : ''}`}
              onClick={() => setImpactFilter('all')}
            >
              All ({simulatedResources.length})
            </button>
            <button
              type="button"
              className={`impact-toggle-btn toggle-high ${impactFilter === 'high' ? 'active' : ''}`}
              onClick={() => setImpactFilter('high')}
            >
              🔴 High ({simulatedResources.filter(r => r.simulated?.impactLevel === 'high').length})
            </button>
            <button
              type="button"
              className={`impact-toggle-btn toggle-medium ${impactFilter === 'medium' ? 'active' : ''}`}
              onClick={() => setImpactFilter('medium')}
            >
              🟡 Medium ({simulatedResources.filter(r => r.simulated?.impactLevel === 'medium').length})
            </button>
            <button
              type="button"
              className={`impact-toggle-btn toggle-low ${impactFilter === 'low' ? 'active' : ''}`}
              onClick={() => setImpactFilter('low')}
            >
              🟢 Low ({simulatedResources.filter(r => r.simulated?.impactLevel === 'low').length})
            </button>
          </div>
        </div>
      </div>

      <div className="map-canvas-container">
        <svg
          viewBox="0 0 800 600"
          className="geospatial-svg-canvas"
          role="img"
          aria-label="Map of India showing hospitality resource distribution and weather shock severity"
        >
          <defs>
            <radialGradient id="high-impact-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </radialGradient>
            <radialGradient id="medium-impact-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </radialGradient>
            <radialGradient id="low-impact-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </radialGradient>
            <pattern id="map-grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="rgba(255, 255, 255, 0.08)" />
            </pattern>
          </defs>

          {/* Background Map Surface */}
          <rect width="800" height="600" fill="var(--bg-surface)" rx="12" />
          <rect width="800" height="600" fill="url(#map-grid-dots)" rx="12" />

          {/* Stylized Regional Territory Polygons */}
          <path
            d="M 320 60 L 400 90 L 450 170 L 410 240 L 490 280 L 480 340 L 390 420 L 350 510 L 320 540 L 290 490 L 230 400 L 190 320 L 170 240 L 230 180 L 270 120 Z"
            fill="rgba(30, 41, 59, 0.45)"
            stroke="rgba(51, 65, 85, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Hub Region Labels */}
          <text x="360" y="110" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1">DELHI NCR</text>
          <text x="180" y="325" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1">MUMBAI METRO</text>
          <text x="330" y="475" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1">BENGALURU HUB</text>
          <text x="380" y="430" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1">HYDERABAD</text>
          <text x="440" y="525" fill="var(--text-muted)" fontSize="11" fontWeight="700" letterSpacing="1">CHENNAI</text>

          {/* Resource Markers */}
          {filteredResources.map((res) => {
            const pos = projectCoordinates(res.coordinates?.lat ?? 12.97, res.coordinates?.lon ?? 77.59);
            const style = getImpactColor(res.simulated?.impactLevel);
            const isSelected = selectedResource?.id === res.id;

            return (
              <g
                key={res.id}
                className={`map-marker-node ${isSelected ? 'marker-selected' : ''}`}
                onClick={() => setSelectedResource(res)}
                cursor="pointer"
              >
                {/* Pulsing Aura Halo */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 26 : 18}
                  fill={`url(#${res.simulated?.impactLevel}-impact-glow)`}
                  className={res.simulated?.impactLevel === 'high' ? 'halo-pulse-high' : 'halo-pulse-normal'}
                />

                {/* Core Pin Outer Ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 10 : 7}
                  fill={style.fill}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 3 : 1.5}
                />

                {/* Inner Dot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={3}
                  fill="#0b0f19"
                />

                {/* Quick Title Label on Pin */}
                <text
                  x={pos.x + 12}
                  y={pos.y + 4}
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="600"
                  className="map-pin-title-shadow"
                >
                  {res.title?.length > 20 ? `${res.title.substring(0, 18)}...` : res.title}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="map-legend-overlay">
          <span className="legend-title">Impact Legend:</span>
          <div className="legend-items">
            <span className="legend-item"><span className="legend-dot dot-red"></span> High Vulnerability</span>
            <span className="legend-item"><span className="legend-dot dot-yellow"></span> Medium Divergence</span>
            <span className="legend-item"><span className="legend-dot dot-green"></span> Nominal / Low</span>
          </div>
        </div>
      </div>

      {/* Selected Marker Inspection Card */}
      {selectedResource && (
        <div className="selected-resource-inspector" role="region" aria-label="Selected Resource Simulation Details">
          <div className="inspector-header">
            <div>
              <span className={`badge badge-impact-${selectedResource.simulated?.impactLevel}`}>
                {selectedResource.simulated?.impactLevel?.toUpperCase()} IMPACT
              </span>
              <h4 className="inspector-title">{selectedResource.title}</h4>
              <p className="inspector-location">📍 {selectedResource.location} • {selectedResource.category}</p>
            </div>
            <button
              type="button"
              className="inspector-close-btn"
              onClick={() => setSelectedResource(null)}
              aria-label="Close resource inspection card"
            >
              ✕
            </button>
          </div>

          <div className="inspector-stats-grid">
            <div className="inspector-stat-box">
              <span className="stat-label">Actual Listed Rate</span>
              <span className="stat-value highlight-real">
                ₹{selectedResource.rate} <span className="stat-unit">/ {selectedResource.rateUnit}</span>
              </span>
              <span className="stat-tag-verified">🔒 Real Rate (Unchanged)</span>
            </div>

            <div className="inspector-stat-box">
              <span className="stat-label">Simulated Rate Pressure</span>
              <span className={`stat-value ${selectedResource.simulated?.ratePressureDelta >= 0 ? 'text-surge' : 'text-drop'}`}>
                {selectedResource.simulated?.ratePressureDelta >= 0 ? '+' : ''}
                {selectedResource.simulated?.ratePressureDelta}%
              </span>
              <span className="stat-tag-simulated">⚡ Modelled Estimate</span>
            </div>

            <div className="inspector-stat-box">
              <span className="stat-label">Simulated Demand Shift</span>
              <span className="stat-value">
                {selectedResource.simulated?.demandDelta >= 0 ? '+' : ''}
                {selectedResource.simulated?.demandDelta}%
              </span>
              <span className="stat-tag-simulated">Index: {selectedResource.simulated?.simulatedDemand}/100</span>
            </div>

            <div className="inspector-stat-box">
              <span className="stat-label">Availability Pressure</span>
              <span className={`stat-value pressure-${selectedResource.simulated?.availabilityPressure?.toLowerCase()}`}>
                {selectedResource.simulated?.availabilityPressure}
              </span>
              <span className="stat-tag-simulated">Confidence: {selectedResource.simulated?.confidenceIndicator}</span>
            </div>
          </div>

          <div className="inspector-reason-banner">
            <span className="reason-title">🧠 Digital Twin Impact Reason:</span>
            <p className="reason-text">{selectedResource.simulated?.impactReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
