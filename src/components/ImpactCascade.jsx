import React from 'react';

/**
 * ResShare — Cascading Digital Twin Effects
 * 
 * Visualizes multi-stage stress propagation across interconnected hospitality entities,
 * from meteorological trigger to secondary capacity bottlenecks and market equilibrium.
 */
export default function ImpactCascade({ cascadeChain = [] }) {
  if (!cascadeChain || cascadeChain.length === 0) return null;

  return (
    <div className="impact-cascade-container">
      <div className="cascade-header-row">
        <div>
          <span className="cascade-badge">🔗 Digital Twin Propagation</span>
          <h3 className="cascade-title">Interconnected Impact Chain</h3>
          <p className="cascade-subtitle">
            How a localized meteorological shock cascades through primary venue demands, capacity bottlenecks, and secondary alternatives.
          </p>
        </div>
      </div>

      <div className="cascade-steps-flow">
        {cascadeChain.map((step, idx) => (
          <React.Fragment key={step.step}>
            <div className={`cascade-card cascade-step-${step.step}`}>
              <div className="cascade-card-top">
                <span className="cascade-step-number">Phase 0{step.step}</span>
                <span className={`cascade-status-pill status-${step.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {step.status}
                </span>
              </div>

              <div className="cascade-card-header">
                <span className="cascade-icon">{step.icon}</span>
                <div>
                  <h4 className="cascade-node-title">{step.title}</h4>
                  <span className="cascade-node-sub">{step.subtitle}</span>
                </div>
              </div>

              <p className="cascade-card-desc">{step.description}</p>

              <div className="cascade-metric-box">
                <span className="cascade-metric-label">{step.metricLabel}</span>
                <span className="cascade-metric-val">{step.metricValue}</span>
              </div>
            </div>

            {idx < cascadeChain.length - 1 && (
              <div className="cascade-connector" aria-hidden="true">
                <div className="connector-line"></div>
                <div className="connector-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
