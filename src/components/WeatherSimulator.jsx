import React, { useState, useEffect, useMemo } from 'react';
import { fetchLiveWeather, getCitiesList, FALLBACK_WEATHER } from '../services/weatherService.js';
import { generatePublicSignals } from '../services/weatherSignalService.js';
import { runDigitalTwinSimulation } from '../utils/weatherSimulator.js';
import WeatherControls from './WeatherControls.jsx';
import ImpactCascade from './ImpactCascade.jsx';
import WeatherImpactMap from './WeatherImpactMap.jsx';
import PublicWeatherSignals from './PublicWeatherSignals.jsx';

/**
 * ResShare — Weather Shock Simulator (Digital Twin)
 * 
 * Midnight Enhancement for HackCelestial 3.0.
 * Operates as a strictly read-only mathematical and geospatial Digital Twin
 * projecting market stress under simulated weather shocks.
 * 
 * CRITICAL SAFETY:
 * NEVER modifies real resource prices, availability, bookings, or user accounts.
 */
export default function WeatherSimulator({ resources = [], onBrowseResources }) {
  const cities = useMemo(() => getCitiesList(), []);
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [liveWeather, setLiveWeather] = useState(FALLBACK_WEATHER);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Shock Parameters State
  const [shockParams, setShockParams] = useState({
    rainfallIntensity: 'normal',
    temperature: 26,
    stormDuration: 6,
    floodRisk: 'low'
  });

  // Fetch live meteorological feed when city changes
  useEffect(() => {
    let isMounted = true;
    setWeatherLoading(true);

    fetchLiveWeather(selectedCity)
      .then((data) => {
        if (isMounted) {
          setLiveWeather(data);
          setWeatherLoading(false);
          // Set initial simulation temperature from live weather
          setShockParams((prev) => ({
            ...prev,
            temperature: Math.round(data.temperature ?? 26)
          }));
        }
      })
      .catch((err) => {
        console.error('Error fetching live weather:', err);
        if (isMounted) {
          setLiveWeather(FALLBACK_WEATHER);
          setWeatherLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Run Digital Twin simulation reactively whenever resources, shockParams, or baseline weather change
  const simulationResults = useMemo(() => {
    return runDigitalTwinSimulation(resources, shockParams, liveWeather);
  }, [resources, shockParams, liveWeather]);

  // Generate public weather signals reactively based on current city and shock parameters
  const publicSignals = useMemo(() => {
    return generatePublicSignals(selectedCity, shockParams);
  }, [selectedCity, shockParams]);

  // Scenario Presets Handler
  const handleApplyPreset = (presetType) => {
    if (presetType === 'normal') {
      setShockParams({
        rainfallIntensity: 'normal',
        temperature: Math.round(liveWeather.temperature ?? 26),
        stormDuration: 6,
        floodRisk: 'low'
      });
    } else if (presetType === 'heavy_rain') {
      setShockParams({
        rainfallIntensity: 'heavy',
        temperature: Math.round((liveWeather.temperature ?? 26) - 3),
        stormDuration: 12,
        floodRisk: 'medium'
      });
    } else if (presetType === 'severe_storm') {
      setShockParams({
        rainfallIntensity: 'extreme',
        temperature: Math.round((liveWeather.temperature ?? 26) - 5),
        stormDuration: 24,
        floodRisk: 'high'
      });
    } else if (presetType === 'extreme_heat') {
      setShockParams({
        rainfallIntensity: 'normal',
        temperature: 44,
        stormDuration: 8,
        floodRisk: 'low'
      });
    }
  };

  // Reset Simulation Handler
  const handleResetSimulation = () => {
    setShockParams({
      rainfallIntensity: 'normal',
      temperature: Math.round(liveWeather.temperature ?? 26),
      stormDuration: 6,
      floodRisk: 'low'
    });
  };

  const { simulatedResources, summary, cascadeChain } = simulationResults;

  return (
    <section className="weather-simulator-section" aria-label="Weather Shock Simulator">
      <div className="container">
        {/* Section Header */}
        <div className="simulator-header-row">
          <div className="simulator-title-group">
            <div className="simulator-kicker">
              <span className="kicker-pulse"></span>
              <span>Digital Twin Enhancement • Midnight Task</span>
            </div>
            <h2 className="section-title">Weather Shock Simulator</h2>
            <p className="section-subtitle">
              Simulate localized atmospheric shocks and model stress propagation across the B2B hospitality resource marketplace.
            </p>
          </div>

          <div className="simulator-meta-card">
            <span className="meta-label">Live Feed Source:</span>
            <div className="meta-status-row">
              <span className={`status-pill ${liveWeather.isLive ? 'pill-live' : 'pill-demo'}`}>
                {liveWeather.isLive ? '● LIVE METEOROLOGICAL FEED' : '○ DEMO / FALLBACK DATA'}
              </span>
            </div>
            <span className="meta-time">Updated: {new Date(liveWeather.fetchedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Live Weather Strip */}
        <div className="live-weather-strip">
          <div className="weather-strip-left">
            <div className="city-selector-group">
              <label htmlFor="weather-city-select" className="city-select-label">Location:</label>
              <select
                id="weather-city-select"
                className="city-select-dropdown"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="weather-current-box">
              <span className="current-icon">{liveWeather.icon}</span>
              <div className="current-temp-group">
                <span className="current-temp">{liveWeather.temperature}°C</span>
                <span className="current-cond">{liveWeather.condition}</span>
              </div>
            </div>
          </div>

          <div className="weather-metrics-grid">
            <div className="weather-metric-item">
              <span className="w-metric-icon">🌧️</span>
              <div>
                <span className="w-metric-val">{liveWeather.rainfall} mm</span>
                <span className="w-metric-lbl">Precipitation</span>
              </div>
            </div>

            <div className="weather-metric-item">
              <span className="w-metric-icon">💨</span>
              <div>
                <span className="w-metric-val">{liveWeather.windSpeed} km/h</span>
                <span className="w-metric-lbl">Wind Speed</span>
              </div>
            </div>

            <div className="weather-metric-item">
              <span className="w-metric-icon">💧</span>
              <div>
                <span className="w-metric-val">{liveWeather.humidity}%</span>
                <span className="w-metric-lbl">Humidity</span>
              </div>
            </div>

            <div className="weather-metric-item">
              <span className="w-metric-icon">🧭</span>
              <div>
                <span className="w-metric-val">{liveWeather.pressure} hPa</span>
                <span className="w-metric-lbl">Barometric</span>
              </div>
            </div>
          </div>

          {/* 3-day forecast chips */}
          <div className="weather-forecast-chips">
            {liveWeather.forecast?.map((fc, i) => (
              <div key={i} className="forecast-chip">
                <span className="fc-day">{fc.day}</span>
                <span className="fc-icon">{fc.icon}</span>
                <span className="fc-temp">{fc.tempMax}° / {fc.tempMin}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shock Controls & Presets Panel */}
        <WeatherControls
          shockParams={shockParams}
          onChange={setShockParams}
          onApplyPreset={handleApplyPreset}
          onReset={handleResetSimulation}
          baselineWeather={liveWeather}
        />

        {/* Digital Twin Comparative KPI Strip: BASELINE vs SIMULATED */}
        <div className="digital-twin-kpis">
          <div className="kpi-card">
            <div className="kpi-title-row">
              <span className="kpi-title">Outdoor Venue Demand</span>
              <span className="kpi-tag">Modelled</span>
            </div>
            <div className="kpi-values-row">
              <div className="kpi-val-group">
                <span className="kpi-lbl">Baseline</span>
                <span className="kpi-val-base">50 Index</span>
              </div>
              <span className="kpi-arrow">→</span>
              <div className="kpi-val-group">
                <span className="kpi-lbl">Simulated</span>
                <span className={`kpi-val-sim ${summary.avgOutdoorDemand >= 0 ? 'surge' : 'drop'}`}>
                  {summary.avgOutdoorDemand >= 0 ? '+' : ''}{summary.avgOutdoorDemand}%
                </span>
              </div>
            </div>
            <p className="kpi-footer-note">Open-air terraces & rooftops vulnerable to rainfall</p>
          </div>

          <div className="kpi-card">
            <div className="kpi-title-row">
              <span className="kpi-title">Indoor Relocation Pressure</span>
              <span className="kpi-tag">Modelled</span>
            </div>
            <div className="kpi-values-row">
              <div className="kpi-val-group">
                <span className="kpi-lbl">Baseline</span>
                <span className="kpi-val-base">Nominal</span>
              </div>
              <span className="kpi-arrow">→</span>
              <div className="kpi-val-group">
                <span className="kpi-lbl">Simulated</span>
                <span className={`kpi-val-sim ${summary.avgIndoorDemand >= 0 ? 'surge' : 'drop'}`}>
                  {summary.avgIndoorDemand >= 0 ? '+' : ''}{summary.avgIndoorDemand}%
                </span>
              </div>
            </div>
            <p className="kpi-footer-note">Executive ballrooms absorbing outdoor event overflow</p>
          </div>

          <div className="kpi-card">
            <div className="kpi-title-row">
              <span className="kpi-title">Emergency Power & Cold Chain</span>
              <span className="kpi-tag">Modelled</span>
            </div>
            <div className="kpi-values-row">
              <div className="kpi-val-group">
                <span className="kpi-lbl">Baseline</span>
                <span className="kpi-val-base">Standby</span>
              </div>
              <span className="kpi-arrow">→</span>
              <div className="kpi-val-group">
                <span className="kpi-lbl">Simulated</span>
                <span className={`kpi-val-sim ${summary.avgEmergencyDemand >= 0 ? 'surge' : 'drop'}`}>
                  {summary.avgEmergencyDemand >= 0 ? '+' : ''}{summary.avgEmergencyDemand}%
                </span>
              </div>
            </div>
            <p className="kpi-footer-note">Generators & mobile refrigerated trailers mobilized</p>
          </div>

          <div className="kpi-card">
            <div className="kpi-title-row">
              <span className="kpi-title">Market Rate Pressure</span>
              <span className="kpi-tag">Modelled</span>
            </div>
            <div className="kpi-values-row">
              <div className="kpi-val-group">
                <span className="kpi-lbl">Actual Rates</span>
                <span className="kpi-val-base">Unchanged</span>
              </div>
              <span className="kpi-arrow">→</span>
              <div className="kpi-val-group">
                <span className="kpi-lbl">Simulated</span>
                <span className={`kpi-val-sim ${summary.avgRatePressure >= 0 ? 'surge' : 'drop'}`}>
                  {summary.avgRatePressure >= 0 ? '+' : ''}{summary.avgRatePressure}%
                </span>
              </div>
            </div>
            <p className="kpi-footer-note">Aggregate price pressure index across marketplace</p>
          </div>
        </div>

        {/* Cascading Impact Chain Flowchart */}
        <ImpactCascade cascadeChain={cascadeChain} />

        {/* Geospatial Map Visualization */}
        <WeatherImpactMap
          simulatedResources={simulatedResources}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          citiesList={cities}
        />

        {/* Affected Marketplace Resources Digital Twin Table */}
        <div className="simulated-resources-section">
          <div className="table-header-row">
            <div>
              <span className="table-badge">📊 Asset Vulnerability Table</span>
              <h3 className="table-heading">Marketplace Resources — Digital Twin Impact</h3>
              <p className="table-subheading">
                Comparison of actual baseline listed rates against simulated market demand and availability pressure.
              </p>
            </div>
            <div className="safety-disclaimer-pill">
              🔒 Actual listed rates and real availability are NEVER modified.
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="simulated-resources-table" aria-label="Digital Twin Resource Simulation Impact Table">
              <thead>
                <tr>
                  <th scope="col">Resource Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Location</th>
                  <th scope="col">Actual Listed Rate</th>
                  <th scope="col">Simulated Rate Pressure</th>
                  <th scope="col">Simulated Demand</th>
                  <th scope="col">Availability Pressure</th>
                  <th scope="col">Vulnerability</th>
                </tr>
              </thead>
              <tbody>
                {simulatedResources.map((res) => {
                  const sim = res.simulated;
                  return (
                    <tr key={res.id || res._id} className={`row-impact-${sim.impactLevel}`}>
                      <td className="cell-title">
                        <strong>{res.title}</strong>
                        <span className="cell-host">{res.hostBusiness}</span>
                      </td>
                      <td className="cell-category">
                        <span className="category-tag">{res.category}</span>
                      </td>
                      <td className="cell-location">
                        <span>📍 {res.location}</span>
                      </td>
                      <td className="cell-actual-rate">
                        <span className="real-rate-val">₹{res.rate}</span>
                        <span className="real-rate-unit">/{res.rateUnit}</span>
                      </td>
                      <td className="cell-rate-pressure">
                        <span className={`pressure-tag ${sim.ratePressureDelta >= 0 ? 'tag-surge' : 'tag-drop'}`}>
                          {sim.ratePressureDelta >= 0 ? '+' : ''}{sim.ratePressureDelta}%
                        </span>
                        <span className="pressure-sub">Modelled</span>
                      </td>
                      <td className="cell-demand">
                        <div className="demand-meter-container">
                          <span className="demand-percent">
                            {sim.demandDelta >= 0 ? '+' : ''}{sim.demandDelta}%
                          </span>
                          <div className="meter-track">
                            <div
                              className={`meter-bar ${sim.demandDelta >= 0 ? 'bar-surge' : 'bar-drop'}`}
                              style={{ width: `${Math.min(100, Math.max(10, sim.simulatedDemand))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="cell-avail-pressure">
                        <span className={`badge-avail-pressure pressure-${sim.availabilityPressure.toLowerCase()}`}>
                          {sim.availabilityPressure}
                        </span>
                      </td>
                      <td className="cell-impact-badge">
                        <span className={`badge badge-impact-${sim.impactLevel}`}>
                          {sim.impactLevel?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Public & Social Weather Signals Section */}
        <PublicWeatherSignals signals={publicSignals} />

        {/* Browse Marketplace CTA */}
        <div className="simulator-footer-cta">
          <div className="footer-cta-content">
            <h4>Ready to explore active marketplace listings?</h4>
            <p>Return to the live catalog to discover, book, or list hospitality resources.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onBrowseResources}
          >
            Browse Live Marketplace
          </button>
        </div>
      </div>
    </section>
  );
}
