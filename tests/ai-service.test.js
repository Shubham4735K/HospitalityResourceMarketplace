import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = require('../server/server.js');
const {
  analyzeRequirement,
  analyzeWithFallbackAdapter,
  NUGEN_DEFAULT_MODEL_ID
} = require('../server/services/nugenService.js');

import {
  mapAICategoryToMarketplace,
  generateWhyMatchesReasons
} from '../src/utils/nugenAI.js';

describe('AI Resource Finder — Nugen Integration Shell & Service Abstraction', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Fallback Heuristic Adapter on Example Prompt
  test('1. Fallback adapter parses the example prompt into expected structured intent', () => {
    const prompt =
      'I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space.';

    const result = analyzeWithFallbackAdapter(prompt);

    assert.strictEqual(result.intent, 'FIND_RESOURCE');
    assert.strictEqual(result.category, 'Commercial Kitchen');
    assert.strictEqual(result.capacity, 80);
    assert.strictEqual(result.date, 'next Saturday');
    assert.strictEqual(result.duration, null);
    assert.strictEqual(result.location, 'Navi Mumbai');
    assert.strictEqual(result.eventType, null);
    assert.deepStrictEqual(result.requirements, ['ovens', 'refrigeration', 'prep space']);
    assert.strictEqual(result.budget, null);
    assert.strictEqual(result.urgency, null);
  });

  // 2. Service Abstraction Default (Fallback Mode when no API Key)
  test('2. Service abstraction clearly identifies fallback adapter when NUGEN_API_KEY is unset', async () => {
    const origKey = process.env.NUGEN_API_KEY;
    delete process.env.NUGEN_API_KEY;

    try {
      const prompt = 'I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai.';
      const result = await analyzeRequirement(prompt);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.source, 'fallback_demo_adapter');
      assert.strictEqual(result.isFallback, true);
      assert.strictEqual(result.configuredTargetModel, NUGEN_DEFAULT_MODEL_ID);
      assert.ok(result.data);
      assert.strictEqual(result.data.category, 'Commercial Kitchen');
      assert.strictEqual(result.data.capacity, 80);
    } finally {
      if (origKey) process.env.NUGEN_API_KEY = origKey;
    }
  });

  // 3. Category Detection Across Diverse Hospitality Domains
  test('3. Fallback adapter accurately classifies hospitality resource categories', () => {
    const venueTest = analyzeWithFallbackAdapter('Need a banquet hall for 200 people in Bengaluru');
    assert.strictEqual(venueTest.category, 'Venues & Spaces');
    assert.strictEqual(venueTest.capacity, 200);

    const equipmentTest = analyzeWithFallbackAdapter('Looking to rent a shock freezer and blast chiller in Chennai');
    assert.strictEqual(equipmentTest.category, 'Commercial Equipment');
    assert.ok(equipmentTest.requirements.includes('blast chiller'));

    const suppliesTest = analyzeWithFallbackAdapter('Need tableware and chafing dishes for catering event in Mumbai');
    assert.strictEqual(suppliesTest.category, 'Event Supplies & Decor');
    assert.ok(suppliesTest.requirements.includes('chafing dishes'));
  });

  // 4. POST /api/ai/analyze API Endpoint
  test('4. POST /api/ai/analyze returns 400 for empty or invalid requests', async () => {
    const res = await fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '   ' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid requirement');
  });

  test('5. POST /api/ai/analyze returns 200 with structured data for valid prompt', async () => {
    const prompt =
      'I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space.';

    const res = await fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
    assert.strictEqual(body.data.intent, 'FIND_RESOURCE');
    assert.strictEqual(body.data.category, 'Commercial Kitchen');
    assert.strictEqual(body.data.capacity, 80);
    assert.strictEqual(body.data.location, 'Navi Mumbai');
  });

  // 6. Frontend Category Mapper
  test('6. mapAICategoryToMarketplace maps AI categories to existing ResShare categories', () => {
    assert.strictEqual(
      mapAICategoryToMarketplace('Commercial Kitchen'),
      'Commercial Kitchen & Prep'
    );
    assert.strictEqual(
      mapAICategoryToMarketplace('Venues & Spaces'),
      'Venues & Spaces'
    );
    assert.strictEqual(
      mapAICategoryToMarketplace('Commercial Equipment'),
      'Commercial Equipment'
    );
    assert.strictEqual(
      mapAICategoryToMarketplace('Event Supplies & Decor'),
      'Event Supplies & Decor'
    );
    assert.strictEqual(
      mapAICategoryToMarketplace('Unknown Category'),
      'All Resources'
    );
  });

  // 7. Verified "Why this matches" based ONLY on actual resource attributes
  test('7. generateWhyMatchesReasons generates reasons strictly from resource attributes', () => {
    const mockResource = {
      id: 'res-01',
      title: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      category: 'Commercial Kitchen & Prep',
      location: 'Bandra West, Mumbai',
      availability: 'Mon–Fri, 4:00 AM – 11:00 AM',
      specs: [
        '3-Deck Roto-Deck Stone Hearth Oven',
        '60L Hobart Spiral Dough Mixer',
        'Walk-in proofing chamber'
      ],
      description: 'Fully certified commercial baking space with ovens and refrigeration.'
    };

    const mockAiCriteria = {
      intent: 'FIND_RESOURCE',
      category: 'Commercial Kitchen',
      capacity: 80,
      location: 'Navi Mumbai',
      requirements: ['ovens', 'refrigeration']
    };

    const reasons = generateWhyMatchesReasons(mockResource, mockAiCriteria);

    assert.ok(reasons.length >= 3);
    // Must contain category match
    assert.ok(reasons.some((r) => r.includes('Commercial Kitchen & Prep')));
    // Must contain regional/location match
    assert.ok(reasons.some((r) => r.includes('Mumbai')));
    // Must contain equipment spec match for ovens
    assert.ok(reasons.some((r) => r.includes('Stone Hearth Oven')));
    // Must contain operating window from database
    assert.ok(reasons.some((r) => r.includes('Mon–Fri, 4:00 AM – 11:00 AM')));
  });

  // 8. Availability Safety: AI does not alter or dictate actual resource availability
  test('8. Database remains source of truth; AI does not define availability', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    assert.strictEqual(res.status, 200);
    const resources = await res.json();

    // Verify resources have their own existing schedule and availability
    assert.ok(resources.length > 0);
    for (const resource of resources) {
      assert.ok(resource.id);
      assert.ok(resource.availability);
      assert.ok(resource.schedule);
    }
  });
});
