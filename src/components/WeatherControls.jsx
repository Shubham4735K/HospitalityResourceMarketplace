import React from 'react';

/**
 * ResShare — Weather Shock Simulator Controls
 * 
 * Interactive control panel enabling hospitality businesses and event planners
 * to model simulated meteorological shocks and assess digital twin market behavior.
 */
export default function WeatherControls({
  shockParams,
  onChange,
  onApplyPreset,
  onReset,
  baselineWeather
}) {
  const handleRainfallChange = (val) => {
    onChange({ ...shockParams, rainfallIntensity: val });
  };

  const handleTempChange = (e) => {
    onChange({ ...shockParams, temperature: parseFloat(e.target.value) });
  };

  const handleDurationChange = (e) => {
    onChange({ ...shockParams, stormDuration: parseInt(e.target.value, 10) });
  };

  const handleFloodRiskChange = (e) => {
    onChange({ ...shockParams, floodRisk: e.target.value });
  };

  const rainfallLevels = [
    { id: 'normal', label: 'Normal (0mm)', desc: 'Dry / Clear' },
    { id: 'light', label: 'Light (3mm/h)', desc: 'Drizzle' },
    { id: 'moderate', label: 'Moderate (12mm/h)', desc: 'Steady Rain' },
    { id: 'heavy', label: 'Heavy (35mm/h)', desc: 'Downpour' },
    { id: 'extreme', label: 'Extreme (80mm/h)', desc: 'Torrential / Squall' }
  ];

  return (
    <div className="weather-controls-card">
      <div className="weather-controls-header">
        <div className="controls-title-group">
          <span className="controls-badge">⚡ Simulation Parameters</span>
          <h3 className="controls-heading">Weather Shock Controls</h3>
          <p className="controls-description">
            Adjust meteorological shock variables below to simulate stress propagation across the B2B marketplace.
          </p>
        </div>

        {/* Scenario Presets */}
        <div className="scenario-presets-bar">
          <span className="presets-label">Scenario Presets:</span>
          <div className="presets-buttons-group">
            <button
              type="button"
              className="preset-btn"
              onClick={() => onApplyPreset('normal')}
              title="Reset parameters to normal seasonal conditions"
            >
              ☀️ Normal
            </button>
            <button
              type="button"
              className="preset-btn preset-rain"
              onClick={() => onApplyPreset('heavy_rain')}
              title="Simulate sustained heavy monsoon downpour"
            >
              🌧️ Heavy Rain
            </button>
            <button
              type="button"
              className="preset-btn preset-storm"
              onClick={() => onApplyPreset('severe_storm')}
              title="Simulate extreme storm with flood warning and high duration"
            >
              ⛈️ Severe Storm
            </button>
            <button
              type="button"
              className="preset-btn preset-heat"
              onClick={() => onApplyPreset('extreme_heat')}
              title="Simulate severe heatwave anomaly (44°C)"
            >
              🔥 Extreme Heat
            </button>
            <button
              type="button"
              className="preset-btn preset-reset"
              onClick={onReset}
              title="Restore baseline live meteorological feed"
            >
              🔄 Reset Simulation
            </button>
          </div>
        </div>
      </div>

      <div className="controls-grid">
        {/* Control 1: Rainfall Intensity */}
        <div className="control-field-group">
          <div className="control-label-row">
            <label className="control-label">Rainfall Intensity</label>
            <span className="control-value-highlight">
              {shockParams.rainfallIntensity?.toUpperCase()}
            </span>
          </div>
          <div className="rainfall-segmented-control" role="group" aria-label="Rainfall Intensity Selector">
            {rainfallLevels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                className={`rainfall-pill-btn ${shockParams.rainfallIntensity === lvl.id ? 'active' : ''}`}
                onClick={() => handleRainfallChange(lvl.id)}
              >
                <span className="pill-title">{lvl.label}</span>
                <span className="pill-subtitle">{lvl.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Control 2: Temperature Slider */}
        <div className="control-field-group">
          <div className="control-label-row">
            <label htmlFor="temp-slider" className="control-label">
              Simulated Ambient Temperature
            </label>
            <span className="control-value-highlight">
              {shockParams.temperature}°C
              {baselineWeather?.temperature != null && (
                <span className="control-delta-tag">
                  {shockParams.temperature - baselineWeather.temperature >= 0 ? '+' : ''}
                  {Math.round((shockParams.temperature - baselineWeather.temperature) * 10) / 10}°C vs Live
                </span>
              )}
            </span>
          </div>
          <div className="range-slider-wrapper">
            <input
              id="temp-slider"
              type="range"
              min="10"
              max="50"
              step="1"
              value={shockParams.temperature}
              onChange={handleTempChange}
              className="theme-range-slider"
            />
            <div className="slider-ticks-row">
              <span>10°C (Cold)</span>
              <span>25°C (Nominal)</span>
              <span>38°C (Hot)</span>
              <span>50°C (Extreme)</span>
            </div>
          </div>
        </div>

        {/* Control 3: Storm Duration */}
        <div className="control-field-group">
          <div className="control-label-row">
            <label htmlFor="duration-slider" className="control-label">
              Storm / Shock Duration
            </label>
            <span className="control-value-highlight">
              {shockParams.stormDuration} Hours
            </span>
          </div>
          <div className="range-slider-wrapper">
            <input
              id="duration-slider"
              type="range"
              min="1"
              max="48"
              step="1"
              value={shockParams.stormDuration}
              onChange={handleDurationChange}
              className="theme-range-slider"
            />
            <div className="slider-ticks-row">
              <span>1 hr (Flash)</span>
              <span>6 hrs (Session)</span>
              <span>24 hrs (Full Day)</span>
              <span>48 hrs (Prolonged)</span>
            </div>
          </div>
        </div>

        {/* Control 4: Flood Risk */}
        <div className="control-field-group">
          <div className="control-label-row">
            <label htmlFor="flood-risk-select" className="control-label">
              Localized Flood Risk
            </label>
            <span className={`risk-badge risk-${shockParams.floodRisk}`}>
              {shockParams.floodRisk?.toUpperCase()} RISK
            </span>
          </div>
          <select
            id="flood-risk-select"
            className="theme-select-input"
            value={shockParams.floodRisk}
            onChange={handleFloodRiskChange}
          >
            <option value="low">Low (Standard Drainage Capacity)</option>
            <option value="medium">Medium (Localized Waterlogging Expected)</option>
            <option value="high">High (Arterial Transit Disruption & Low-lying Inundation)</option>
          </select>
          <span className="control-hint">
            Directly influences backup diesel generator demand and logistics lead times.
          </span>
        </div>
      </div>
    </div>
  );
}
