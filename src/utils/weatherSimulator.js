/**
 * ResShare — Digital Twin Weather Shock Simulation Model
 * 
 * Lightweight, deterministic, explainable mathematical model simulating how
 * meteorological shocks propagate through the hospitality B2B resource marketplace.
 * 
 * CRITICAL SAFETY:
 * This model NEVER modifies actual resource records, prices, or database availability.
 * All output values are explicitly returned as derived estimates and modelled projections.
 */

export const RESOURCE_ARCHETYPES = {
  OUTDOOR_VENUE: 'outdoor_venue',
  INDOOR_VENUE: 'indoor_venue',
  REFRIGERATION_COOLING: 'refrigeration_cooling',
  EMERGENCY_POWER: 'emergency_power',
  COMMERCIAL_KITCHEN: 'commercial_kitchen',
  EVENT_SUPPLIES: 'event_supplies'
};

/**
 * Classifies a resource into an operational archetype based on its category, title, and specs.
 */
export function classifyResourceArchetype(resource) {
  if (!resource) return RESOURCE_ARCHETYPES.COMMERCIAL_KITCHEN;

  const text = `${resource.title || ''} ${resource.description || ''} ${Array.isArray(resource.specs) ? resource.specs.join(' ') : ''}`.toLowerCase();
  const category = (resource.category || '').toLowerCase();

  // Emergency Power & Autonomous Mobile Generation
  if (text.includes('generator') || text.includes('diesel power') || text.includes('whisper-quiet')) {
    return RESOURCE_ARCHETYPES.EMERGENCY_POWER;
  }

  // Refrigeration & Cooling Equipment
  if (
    text.includes('blast chiller') ||
    text.includes('shock freezer') ||
    text.includes('cold storage') ||
    text.includes('refrigerated') ||
    text.includes('gelato') ||
    text.includes('soft-serve') ||
    text.includes('ice machine')
  ) {
    return RESOURCE_ARCHETYPES.REFRIGERATION_COOLING;
  }

  // Outdoor Venue / Terrace / Lawn / Open-air
  if (
    category.includes('venues') &&
    (text.includes('rooftop') || text.includes('terrace') || text.includes('open-air') || text.includes('lawn') || text.includes('outdoor'))
  ) {
    return RESOURCE_ARCHETYPES.OUTDOOR_VENUE;
  }

  // Indoor Venue / Ballrooms / Banquet Foyer
  if (category.includes('venues') || text.includes('ballroom') || text.includes('pillar-less') || text.includes('banquet hall')) {
    return RESOURCE_ARCHETYPES.INDOOR_VENUE;
  }

  // Event Supplies & Decor
  if (category.includes('supplies') || category.includes('decor') || text.includes('chiavari') || text.includes('chafing') || text.includes('buffet set')) {
    return RESOURCE_ARCHETYPES.EVENT_SUPPLIES;
  }

  // Commercial Kitchen & Prep Default
  return RESOURCE_ARCHETYPES.COMMERCIAL_KITCHEN;
}

/**
 * Simulates the impact of weather shock parameters on a specific resource.
 * Pure deterministic mathematical function. Never mutates input.
 */
export function simulateResourceImpact(resource, shockParams = {}, baselineWeather = {}) {
  const archetype = classifyResourceArchetype(resource);

  const rainfall = shockParams.rainfallIntensity || 'normal';
  const floodRisk = shockParams.floodRisk || 'low';
  const temperature = typeof shockParams.temperature === 'number' ? shockParams.temperature : (baselineWeather.temperature ?? 26);
  const stormDuration = typeof shockParams.stormDuration === 'number' ? shockParams.stormDuration : 6;

  // Multiplier weights for rainfall intensity
  const rainWeightMap = {
    normal: 0.0,
    light: 0.25,
    moderate: 0.55,
    heavy: 0.85,
    extreme: 1.0
  };
  const rainWeight = rainWeightMap[rainfall] ?? 0.0;

  // Flood risk multiplier
  const floodRiskMultiplier = floodRisk === 'high' ? 1.3 : floodRisk === 'medium' ? 1.15 : 1.0;

  // Storm duration factor: scaling after 6 hours
  const durationFactor = Math.min(1.4, Math.max(0.8, 1.0 + (stormDuration - 6) * 0.03));

  let demandDelta = 0; // In percentage (-100 to +150)
  let ratePressureDelta = 0; // Modelled price pressure (-50 to +50%)
  let availabilityPressure = 'Normal'; // 'Normal' | 'Moderate' | 'High' | 'Critical'
  let impactLevel = 'low'; // 'low' | 'medium' | 'high'
  let impactReason = 'Operating within seasonal baseline parameters.';
  let confidenceIndicator = 'High (94%)';

  switch (archetype) {
    case RESOURCE_ARCHETYPES.OUTDOOR_VENUE: {
      if (rainWeight > 0.1 || floodRisk !== 'low') {
        const drop = Math.round(rainWeight * 75 * floodRiskMultiplier * durationFactor);
        demandDelta = -Math.min(90, Math.max(15, drop));
        ratePressureDelta = -Math.min(35, Math.round(Math.abs(demandDelta) * 0.35));
        availabilityPressure = 'Normal'; // Capacity is unbooked, low utilization
        impactLevel = Math.abs(demandDelta) > 50 ? 'high' : 'medium';
        impactReason = `Open-air venue exposed to ${rainfall} precipitation and squalls; scheduled outdoor events face cancellation or urgent relocation.`;
        confidenceIndicator = 'High (96%)';
      } else if (temperature >= 38) {
        demandDelta = -Math.min(45, Math.round((temperature - 35) * 8));
        ratePressureDelta = -10;
        availabilityPressure = 'Normal';
        impactLevel = 'medium';
        impactReason = `Elevated daytime ambient temperature (${temperature}°C) depresses midday terrace demand.`;
        confidenceIndicator = 'Moderate (88%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Favorable weather conditions support optimal open-air venue bookings.';
        confidenceIndicator = 'High (95%)';
      }
      break;
    }

    case RESOURCE_ARCHETYPES.INDOOR_VENUE: {
      if (rainWeight > 0.2 || floodRisk !== 'low') {
        const surge = Math.round(rainWeight * 70 * floodRiskMultiplier);
        demandDelta = +Math.min(85, Math.max(15, surge));
        ratePressureDelta = +Math.min(30, Math.round(demandDelta * 0.4));
        availabilityPressure = demandDelta > 50 ? 'Critical' : 'High';
        impactLevel = demandDelta > 40 ? 'high' : 'medium';
        impactReason = `Acute surge in emergency indoor relocation inquiries from displaced outdoor banquets drives severe capacity pressure.`;
        confidenceIndicator = 'High (94%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Standard corporate and private event bookings running at nominal capacity.';
        confidenceIndicator = 'High (92%)';
      }
      break;
    }

    case RESOURCE_ARCHETYPES.EMERGENCY_POWER: {
      if (rainWeight >= 0.55 || floodRisk === 'high' || stormDuration >= 12) {
        const surge = Math.round((rainWeight * 50 + (floodRisk === 'high' ? 35 : 15) + (stormDuration > 10 ? 20 : 0)) * durationFactor);
        demandDelta = +Math.min(120, Math.max(30, surge));
        ratePressureDelta = +Math.min(40, Math.round(demandDelta * 0.35));
        availabilityPressure = demandDelta > 60 ? 'Critical' : 'High';
        impactLevel = 'high';
        impactReason = `High municipal power grid instability risk during prolonged storm (${stormDuration}h) triggers critical demand for autonomous power.`;
        confidenceIndicator = 'High (95%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Nominal standby readiness for private event dispatch.';
        confidenceIndicator = 'High (90%)';
      }
      break;
    }

    case RESOURCE_ARCHETYPES.REFRIGERATION_COOLING: {
      if (temperature >= 35) {
        const heatSurge = Math.round((temperature - 32) * 9);
        demandDelta = +Math.min(80, Math.max(15, heatSurge));
        ratePressureDelta = +Math.min(25, Math.round(demandDelta * 0.3));
        availabilityPressure = demandDelta > 45 ? 'High' : 'Moderate';
        impactLevel = demandDelta > 40 ? 'high' : 'medium';
        impactReason = `Severe ambient heat (${temperature}°C) threatens perishable food safety; commercial shock chilling and cold storage in urgent demand.`;
        confidenceIndicator = 'High (93%)';
      } else if (rainWeight >= 0.85 || floodRisk === 'high') {
        demandDelta = +45;
        ratePressureDelta = +15;
        availabilityPressure = 'High';
        impactLevel = 'medium';
        impactReason = `Catering cold buffers mobilized to safeguard event prep against transit disruption.`;
        confidenceIndicator = 'Moderate (86%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Standard kitchen cold prep and freezer inventory cycles.';
        confidenceIndicator = 'High (91%)';
      }
      break;
    }

    case RESOURCE_ARCHETYPES.COMMERCIAL_KITCHEN: {
      if (rainWeight >= 0.55 || floodRisk !== 'low') {
        demandDelta = +Math.min(35, Math.round(rainWeight * 30));
        ratePressureDelta = +Math.min(12, Math.round(demandDelta * 0.3));
        availabilityPressure = 'Moderate';
        impactLevel = 'medium';
        impactReason = `Cloud kitchens and catering houses centralize batch preparation indoors to hedge against localized storm bottlenecks.`;
        confidenceIndicator = 'Moderate (85%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Steady culinary prep and baking shift utilization.';
        confidenceIndicator = 'High (90%)';
      }
      break;
    }

    case RESOURCE_ARCHETYPES.EVENT_SUPPLIES: {
      if (rainWeight >= 0.55) {
        demandDelta = -Math.min(40, Math.round(rainWeight * 35));
        ratePressureDelta = -10;
        availabilityPressure = 'Normal';
        impactLevel = 'medium';
        impactReason = `Lawn and outdoor reception furniture rentals delayed or downsized due to wet surface conditions.`;
        confidenceIndicator = 'Moderate (84%)';
      } else {
        demandDelta = 0;
        ratePressureDelta = 0;
        availabilityPressure = 'Normal';
        impactLevel = 'low';
        impactReason = 'Normal banquet chair and tabletop buffet rental schedule.';
        confidenceIndicator = 'High (92%)';
      }
      break;
    }

    default: {
      demandDelta = 0;
      ratePressureDelta = 0;
      availabilityPressure = 'Normal';
      impactLevel = 'low';
      impactReason = 'Standard operating conditions.';
      confidenceIndicator = 'Moderate (80%)';
      break;
    }
  }

  // Baseline normalized demand score (out of 100)
  const baselineDemand = 50;
  const simulatedDemand = Math.max(5, Math.min(100, Math.round(baselineDemand * (1 + demandDelta / 100))));

  return {
    ...resource, // Preserve all original fields
    actualRate: resource.rate, // Explicitly preserved
    actualRateUnit: resource.rateUnit,
    archetype,
    simulated: {
      demandDelta, // e.g. -70% or +45%
      baselineDemand, // 50
      simulatedDemand, // 15 or 85
      ratePressureDelta, // e.g. +22% or -15%
      availabilityPressure, // 'Normal', 'Moderate', 'High', 'Critical'
      impactLevel, // 'low', 'medium', 'high'
      impactReason,
      confidenceIndicator
    }
  };
}

/**
 * Runs the full Digital Twin simulation across an entire collection of marketplace resources.
 * Returns cloned simulated items + aggregate market statistics + cascading effect nodes.
 */
export function runDigitalTwinSimulation(resources = [], shockParams = {}, baselineWeather = {}) {
  const simulatedResources = resources.map((res) =>
    simulateResourceImpact(res, shockParams, baselineWeather)
  );

  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  let outdoorDemandSum = 0;
  let outdoorCount = 0;

  let indoorDemandSum = 0;
  let indoorCount = 0;

  let emergencyDemandSum = 0;
  let emergencyCount = 0;

  let ratePressureSum = 0;

  for (const item of simulatedResources) {
    const sim = item.simulated;
    if (sim.impactLevel === 'high') highCount++;
    else if (sim.impactLevel === 'medium') mediumCount++;
    else lowCount++;

    ratePressureSum += sim.ratePressureDelta;

    if (item.archetype === RESOURCE_ARCHETYPES.OUTDOOR_VENUE) {
      outdoorDemandSum += sim.demandDelta;
      outdoorCount++;
    } else if (item.archetype === RESOURCE_ARCHETYPES.INDOOR_VENUE) {
      indoorDemandSum += sim.demandDelta;
      indoorCount++;
    } else if (item.archetype === RESOURCE_ARCHETYPES.EMERGENCY_POWER) {
      emergencyDemandSum += sim.demandDelta;
      emergencyCount++;
    }
  }

  const avgOutdoorDemand = outdoorCount > 0 ? Math.round(outdoorDemandSum / outdoorCount) : 0;
  const avgIndoorDemand = indoorCount > 0 ? Math.round(indoorDemandSum / indoorCount) : 0;
  const avgEmergencyDemand = emergencyCount > 0 ? Math.round(emergencyDemandSum / emergencyCount) : 0;
  const avgRatePressure = simulatedResources.length > 0 ? Math.round((ratePressureSum / simulatedResources.length) * 10) / 10 : 0;

  const rainfall = shockParams.rainfallIntensity || 'normal';
  const floodRisk = shockParams.floodRisk || 'low';
  const temp = typeof shockParams.temperature === 'number' ? shockParams.temperature : 26;

  // Build the 5-stage Cascading Impact Chain
  const cascadeChain = [
    {
      step: 1,
      title: 'Weather Shock Trigger',
      subtitle: 'Atmospheric Anomaly',
      status: rainfall !== 'normal' || temp > 35 || floodRisk !== 'low' ? 'ACTIVE ANOMALY' : 'BASELINE',
      description: `Rainfall: ${rainfall.toUpperCase()}, Flood Risk: ${floodRisk.toUpperCase()}, Temp: ${temp}°C`,
      metricLabel: 'Shock Intensity',
      metricValue: rainfall === 'extreme' || temp >= 42 ? 'Critical' : rainfall === 'heavy' || temp >= 38 ? 'Severe' : 'Moderate',
      icon: rainfall !== 'normal' ? '🌧️' : temp > 35 ? '🔥' : '🌤️'
    },
    {
      step: 2,
      title: 'Primary Demand Divergence',
      subtitle: 'Sectoral Substitution',
      status: avgOutdoorDemand !== 0 || avgIndoorDemand !== 0 ? 'DIVERGING' : 'NOMINAL',
      description: `Outdoor venue demand shifts by ${avgOutdoorDemand >= 0 ? '+' : ''}${avgOutdoorDemand}%, while indoor spaces surge by ${avgIndoorDemand >= 0 ? '+' : ''}${avgIndoorDemand}%.`,
      metricLabel: 'Net Divergence',
      metricValue: `${Math.abs(avgIndoorDemand - avgOutdoorDemand)}% spread`,
      icon: '🔀'
    },
    {
      step: 3,
      title: 'Capacity & Availability Pressure',
      subtitle: 'Host Inventory Saturation',
      status: avgIndoorDemand > 30 ? 'BOTTLENECK' : 'STABLE',
      description: avgIndoorDemand > 30 
        ? 'Indoor luxury ballrooms face emergency short-lead booking requests, exhausting standard availability slots.'
        : 'Available host inventory absorbs booking inquiries without acute bottlenecking.',
      metricLabel: 'Peak Pressure',
      metricValue: avgIndoorDemand > 45 ? 'Critical (92%)' : avgIndoorDemand > 20 ? 'Elevated (74%)' : 'Nominal (40%)',
      icon: '🏢'
    },
    {
      step: 4,
      title: 'Alternative Resource Routing',
      subtitle: 'Cross-Category Rebalancing',
      status: avgIndoorDemand > 30 || avgEmergencyDemand > 20 ? 'REROUTING' : 'IDLE',
      description: 'Demand pressure shifts toward compatible marketplace alternatives, such as indoor auxiliary spaces, backup prep stations, and modular equipment.',
      metricLabel: 'Alternative Relevance',
      metricValue: avgIndoorDemand > 30 ? '+68% Weight' : '+15% Weight',
      icon: '🔄'
    },
    {
      step: 5,
      title: 'Marketplace Equilibrium',
      subtitle: 'Dynamic Valuation Index',
      status: avgRatePressure !== 0 ? 'ADJUSTED' : 'EQUILIBRIUM',
      description: `Simulated rate pressure balances at ${avgRatePressure >= 0 ? '+' : ''}${avgRatePressure}% across the market. Real rates remain unchanged.`,
      metricLabel: 'Valuation Pressure',
      metricValue: `${avgRatePressure >= 0 ? '+' : ''}${avgRatePressure}%`,
      icon: '⚖️'
    }
  ];

  return {
    simulatedResources,
    summary: {
      totalResources: simulatedResources.length,
      highImpactCount: highCount,
      mediumImpactCount: mediumCount,
      lowImpactCount: lowCount,
      avgOutdoorDemand,
      avgIndoorDemand,
      avgEmergencyDemand,
      avgRatePressure
    },
    cascadeChain
  };
}
