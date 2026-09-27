import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resources } from '../src/data/resources.js';
import {
  classifyResourceArchetype,
  simulateResourceImpact,
  runDigitalTwinSimulation,
  RESOURCE_ARCHETYPES
} from '../src/utils/weatherSimulator.js';
import { interpretWmoCode } from '../src/services/weatherService.js';

describe('HackCelestial 3.0 — Weather Shock Simulator (Digital Twin) Tests', () => {
  const outdoorRes = resources.find((r) => r.id === 'res-04'); // Skyline Rooftop Terrace
  const indoorRes = resources.find((r) => r.id === 'res-05'); // Weekday Executive Ballroom
  const coolingRes = resources.find((r) => r.id === 'res-03'); // Shock Freezer / Blast Chiller
  const emergencyRes = resources.find((r) => r.id === 'res-06'); // Mobile Trailer with generator

  const baselineWeather = {
    city: 'Bengaluru',
    temperature: 26,
    rainfall: 0,
    windSpeed: 10,
    condition: 'Partly Cloudy'
  };

  const normalParams = {
    rainfallIntensity: 'normal',
    temperature: 26,
    stormDuration: 6,
    floodRisk: 'low'
  };

  // Test 1: Normal weather produces baseline-like impact
  test('1. Normal weather produces baseline-like impact', () => {
    const simOutdoor = simulateResourceImpact(outdoorRes, normalParams, baselineWeather);
    const simIndoor = simulateResourceImpact(indoorRes, normalParams, baselineWeather);

    assert.strictEqual(simOutdoor.simulated.impactLevel, 'low');
    assert.strictEqual(simOutdoor.simulated.demandDelta, 0);
    assert.strictEqual(simOutdoor.simulated.simulatedDemand, 50);
    assert.strictEqual(simOutdoor.simulated.availabilityPressure, 'Normal');

    assert.strictEqual(simIndoor.simulated.impactLevel, 'low');
    assert.strictEqual(simIndoor.simulated.demandDelta, 0);
    assert.strictEqual(simIndoor.simulated.simulatedDemand, 50);
  });

  // Test 2: Heavy rain decreases outdoor demand
  test('2. Heavy rain decreases outdoor demand', () => {
    const heavyRainParams = {
      rainfallIntensity: 'heavy',
      temperature: 22,
      stormDuration: 12,
      floodRisk: 'medium'
    };

    const simOutdoor = simulateResourceImpact(outdoorRes, heavyRainParams, baselineWeather);
    assert.strictEqual(simOutdoor.archetype, RESOURCE_ARCHETYPES.OUTDOOR_VENUE);
    assert.ok(simOutdoor.simulated.demandDelta < 0, 'Outdoor demand delta must be negative');
    assert.ok(simOutdoor.simulated.simulatedDemand < 50, 'Simulated demand must drop below baseline (50)');
    assert.ok(['medium', 'high'].includes(simOutdoor.simulated.impactLevel));
    assert.ok(simOutdoor.simulated.ratePressureDelta <= 0, 'Rate pressure must reflect depressed demand');
    assert.match(simOutdoor.simulated.impactReason, /open-air/i);
  });

  // Test 3: Heavy rain increases indoor demand
  test('3. Heavy rain increases indoor demand', () => {
    const heavyRainParams = {
      rainfallIntensity: 'heavy',
      temperature: 22,
      stormDuration: 12,
      floodRisk: 'medium'
    };

    const simIndoor = simulateResourceImpact(indoorRes, heavyRainParams, baselineWeather);
    assert.strictEqual(simIndoor.archetype, RESOURCE_ARCHETYPES.INDOOR_VENUE);
    assert.ok(simIndoor.simulated.demandDelta > 0, 'Indoor demand delta must be positive');
    assert.ok(simIndoor.simulated.simulatedDemand > 50, 'Simulated demand must exceed baseline (50)');
    assert.ok(['High', 'Critical'].includes(simIndoor.simulated.availabilityPressure));
    assert.ok(simIndoor.simulated.ratePressureDelta > 0, 'Indoor rate pressure must be positive');
    assert.match(simIndoor.simulated.impactReason, /indoor/i);
  });

  // Test 4: Extreme heat increases cooling-related demand
  test('4. Extreme heat increases cooling-related demand', () => {
    const extremeHeatParams = {
      rainfallIntensity: 'normal',
      temperature: 43,
      stormDuration: 6,
      floodRisk: 'low'
    };

    const simCooling = simulateResourceImpact(coolingRes, extremeHeatParams, baselineWeather);
    assert.strictEqual(simCooling.archetype, RESOURCE_ARCHETYPES.REFRIGERATION_COOLING);
    assert.ok(simCooling.simulated.demandDelta > 30, 'Cooling demand must surge significantly during extreme heat');
    assert.strictEqual(simCooling.simulated.impactLevel, 'high');
    assert.ok(simCooling.simulated.ratePressureDelta > 0, 'Cooling rate pressure must rise');
    assert.match(simCooling.simulated.impactReason, /ambient heat/i);
  });

  // Test 5: Severe storm increases emergency/generator demand
  test('5. Severe storm increases emergency/generator demand', () => {
    const severeStormParams = {
      rainfallIntensity: 'extreme',
      temperature: 20,
      stormDuration: 24,
      floodRisk: 'high'
    };

    const simEmergency = simulateResourceImpact(emergencyRes, severeStormParams, baselineWeather);
    assert.strictEqual(simEmergency.archetype, RESOURCE_ARCHETYPES.EMERGENCY_POWER);
    assert.ok(simEmergency.simulated.demandDelta >= 50, 'Emergency power demand must spike during severe storm');
    assert.strictEqual(simEmergency.simulated.availabilityPressure, 'Critical');
    assert.strictEqual(simEmergency.simulated.impactLevel, 'high');
    assert.match(simEmergency.simulated.impactReason, /grid instability/i);
  });

  // Test 6: Higher weather intensity increases impact
  test('6. Higher weather intensity increases impact', () => {
    const lightRainParams = { rainfallIntensity: 'light', temperature: 24, stormDuration: 4, floodRisk: 'low' };
    const moderateRainParams = { rainfallIntensity: 'moderate', temperature: 22, stormDuration: 6, floodRisk: 'low' };
    const extremeRainParams = { rainfallIntensity: 'extreme', temperature: 19, stormDuration: 24, floodRisk: 'high' };

    const simLight = simulateResourceImpact(outdoorRes, lightRainParams, baselineWeather);
    const simMod = simulateResourceImpact(outdoorRes, moderateRainParams, baselineWeather);
    const simExtreme = simulateResourceImpact(outdoorRes, extremeRainParams, baselineWeather);

    // Negative demand drops further as intensity increases
    assert.ok(Math.abs(simExtreme.simulated.demandDelta) > Math.abs(simMod.simulated.demandDelta));
    assert.ok(Math.abs(simMod.simulated.demandDelta) > Math.abs(simLight.simulated.demandDelta));

    // Indoor demand rises higher as intensity increases
    const indoorLight = simulateResourceImpact(indoorRes, lightLightParams(lightRainParams), baselineWeather);
    const indoorExtreme = simulateResourceImpact(indoorRes, extremeRainParams, baselineWeather);
    assert.ok(indoorExtreme.simulated.demandDelta > indoorLight.simulated.demandDelta);
  });

  function lightLightParams(p) { return p; }

  // Test 7: Simulation never mutates original resource objects
  test('7. Simulation never mutates original resource objects', () => {
    const originalRate = outdoorRes.rate;
    const originalTitle = outdoorRes.title;
    const originalJson = JSON.stringify(outdoorRes);

    const result = simulateResourceImpact(outdoorRes, {
      rainfallIntensity: 'extreme',
      temperature: 44,
      stormDuration: 36,
      floodRisk: 'high'
    }, baselineWeather);

    assert.strictEqual(outdoorRes.rate, originalRate);
    assert.strictEqual(outdoorRes.title, originalTitle);
    assert.strictEqual(JSON.stringify(outdoorRes), originalJson);
    assert.notStrictEqual(result, outdoorRes);
  });

  // Test 8: Actual listed rate remains unchanged
  test('8. Actual listed rate remains unchanged', () => {
    const fullSim = runDigitalTwinSimulation(resources, {
      rainfallIntensity: 'heavy',
      temperature: 30,
      stormDuration: 8,
      floodRisk: 'medium'
    }, baselineWeather);

    for (const item of fullSim.simulatedResources) {
      const original = resources.find((r) => r.id === item.id);
      if (original) {
        assert.strictEqual(item.rate, original.rate, `Rate for ${item.id} must be unchanged`);
        assert.strictEqual(item.actualRate, original.rate, `actualRate field must match original rate`);
      }
    }
  });

  // Test 9: Reset returns to baseline
  test('9. Reset returns to baseline', () => {
    // Run severe shock
    const shockResult = runDigitalTwinSimulation(resources, {
      rainfallIntensity: 'extreme',
      temperature: 44,
      stormDuration: 24,
      floodRisk: 'high'
    }, baselineWeather);

    assert.ok(shockResult.summary.highImpactCount > 0);

    // Reset to normal baseline
    const resetResult = runDigitalTwinSimulation(resources, normalParams, baselineWeather);
    assert.strictEqual(resetResult.summary.highImpactCount, 0);
    assert.strictEqual(resetResult.summary.avgOutdoorDemand, 0);
    assert.strictEqual(resetResult.summary.avgIndoorDemand, 0);
    assert.strictEqual(resetResult.summary.avgRatePressure, 0);
  });

  // Test 10: Deterministic input produces deterministic output
  test('10. Deterministic input produces deterministic output', () => {
    const testParams = {
      rainfallIntensity: 'moderate',
      temperature: 32,
      stormDuration: 10,
      floodRisk: 'medium'
    };

    const run1 = runDigitalTwinSimulation(resources, testParams, baselineWeather);
    const run2 = runDigitalTwinSimulation(resources, testParams, baselineWeather);

    assert.deepStrictEqual(run1.summary, run2.summary);
    assert.strictEqual(run1.simulatedResources.length, run2.simulatedResources.length);
    for (let i = 0; i < run1.simulatedResources.length; i++) {
      assert.strictEqual(run1.simulatedResources[i].simulated.demandDelta, run2.simulatedResources[i].simulated.demandDelta);
      assert.strictEqual(run1.simulatedResources[i].simulated.ratePressureDelta, run2.simulatedResources[i].simulated.ratePressureDelta);
      assert.strictEqual(run1.simulatedResources[i].simulated.availabilityPressure, run2.simulatedResources[i].simulated.availabilityPressure);
      assert.strictEqual(run1.simulatedResources[i].simulated.impactLevel, run2.simulatedResources[i].simulated.impactLevel);
    }
  });

  // Test 11: WMO weather code interpretation behaves accurately
  test('11. WMO weather code interpretation behaves accurately', () => {
    assert.strictEqual(interpretWmoCode(0).condition, 'Clear Sky');
    assert.strictEqual(interpretWmoCode(2).condition, 'Partly Cloudy');
    assert.strictEqual(interpretWmoCode(61).condition, 'Rain');
    assert.strictEqual(interpretWmoCode(95).condition, 'Thunderstorm');
  });
});
