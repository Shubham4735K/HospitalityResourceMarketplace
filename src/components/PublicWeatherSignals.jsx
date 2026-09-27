import React, { useState } from 'react';

/**
 * ResShare — Public & Social Weather Signals Component
 * 
 * Displays institutional meteorological bulletins, disaster authority warnings,
 * and regional hospitality advisories with transparent LIVE / DEMO / SIMULATED tagging.
 */
export default function PublicWeatherSignals({ signals = [] }) {
  const [filter, setFilter] = useState('all');

  const filteredSignals = signals.filter((sig) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return sig.severity === 'Critical';
    if (filter === 'high') return sig.severity === 'High';
    if (filter === 'advisory') return sig.severity === 'Advisory' || sig.severity === 'Normal';
    return true;
  });

  return (
    <div className="weather-signals-card">
      <div className="signals-header-row">
        <div>
          <span className="signals-badge">📡 Public & Institutional Signals</span>
          <h3 className="signals-heading">Public Meteorological Signals & Advisories</h3>
          <p className="signals-subheading">
            Official weather authority alerts, disaster management protocols, and regional hospitality logistics bulletins.
          </p>
          <p className="signals-transparency-note">
            ℹ️ <strong>Note:</strong> Advisories under simulated weather shocks are model-generated contingency templates. Standing advisories are institutional/demo signals and are not presented as live social-media posts.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="signals-filter-pills" role="group" aria-label="Signal Severity Filter">
          <button
            type="button"
            className={`signal-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Signals ({signals.length})
          </button>
          <button
            type="button"
            className={`signal-pill pill-critical ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            Critical
          </button>
          <button
            type="button"
            className={`signal-pill pill-high ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            High Alerts
          </button>
          <button
            type="button"
            className={`signal-pill pill-advisory ${filter === 'advisory' ? 'active' : ''}`}
            onClick={() => setFilter('advisory')}
          >
            Advisories
          </button>
        </div>
      </div>

      <div className="signals-list">
        {filteredSignals.map((sig) => (
          <div key={sig.id} className={`signal-item-card severity-${sig.severity.toLowerCase()}`}>
            <div className="signal-item-top">
              <div className="signal-source-group">
                <span className="signal-agency-icon">🏛️</span>
                <div>
                  <span className="signal-source-name">{sig.source}</span>
                  <span className="signal-agency-type">{sig.agencyType}</span>
                </div>
              </div>

              <div className="signal-badges-group">
                <span className={`signal-status-tag status-${sig.status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                  {sig.status}
                </span>
                <span className={`signal-severity-tag severity-${sig.severity.toLowerCase()}`}>
                  {sig.severity}
                </span>
                <span className="signal-timestamp">🕒 {sig.timestamp}</span>
              </div>
            </div>

            <h4 className="signal-item-title">{sig.title}</h4>
            <p className="signal-item-desc">{sig.description}</p>

            <div className="signal-action-callout">
              <span className="action-label">Recommended Contingency:</span>
              <span className="action-text">{sig.recommendedAction}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
