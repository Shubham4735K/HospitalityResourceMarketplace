import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatchScore } from '../src/utils/matching.js';
import { resources } from '../src/data/resources.js';

describe('Phase 11.2 — Transparent Rule-Based Resource Matching Utility', () => {
  // res-01: Commercial Kitchen & Prep, Indiranagar, Bengaluru, rate: 1800/hour
  // schedule: Mon-Fri (1-5), 04:00-11:00
  const res01 = resources.find((r) => r.id === 'res-01');

  // res-04: Venues & Spaces, Koramangala, Bengaluru, rate: 45000/day
  // schedule: Mon-Thu (1-4), 00:00-23:59, min 24h
  const res04 = resources.find((r) => r.id === 'res-04');

  // res-02: Commercial Kitchen & Prep, Bandra West, Mumbai, rate: 1200/hour
  const res02 = resources.find((r) => r.id === 'res-02');

  const baseNow = new Date('2026-10-01T08:00:00'); // Fixed reference time

  // 1. Perfect match reaches 100
  test('1. Perfect match reaches 100', () => {
    // 2026-10-05 is Monday (within Mon-Fri, 04:00-11:00)
    const result = calculateMatchScore(res01, {
      category: 'Commercial Kitchen & Prep',
      searchQuery: 'Artisan Bakery',
      location: 'Bengaluru',
      requestedDate: '2026-10-05',
      startTime: '05:00',
      endTime: '09:00',
      maxPrice: 2000,
      options: { now: baseNow }
    });

    assert.strictEqual(result.score, 100);
    assert.deepStrictEqual(result.breakdown, {
      availability: 40,
      suitability: 30,
      location: 20,
      price: 10
    });
  });

  // 2. Wrong category reduces suitability
  test('2. Wrong category reduces suitability', () => {
    const matchingCategoryResult = calculateMatchScore(res01, {
      category: 'Commercial Kitchen & Prep',
      searchQuery: 'Artisan Bakery'
    });

    const wrongCategoryResult = calculateMatchScore(res01, {
      category: 'Venues & Spaces',
      searchQuery: 'Artisan Bakery'
    });

    assert.strictEqual(matchingCategoryResult.breakdown.suitability, 30);
    assert.strictEqual(wrongCategoryResult.breakdown.suitability, 10); // 0 for category + 10 for keywords
    assert.ok(matchingCategoryResult.score > wrongCategoryResult.score);
  });

  // 3. Matching location adds location points
  test('3. Matching location adds location points', () => {
    const result = calculateMatchScore(res01, {
      location: 'Bengaluru'
    });

    assert.strictEqual(result.breakdown.location, 20);

    const subAreaResult = calculateMatchScore(res01, {
      location: 'Indiranagar'
    });
    assert.strictEqual(subAreaResult.breakdown.location, 20);
  });

  // 4. Non-matching location gets 0 location points
  test('4. Non-matching location gets 0 location points', () => {
    const result = calculateMatchScore(res01, {
      location: 'Mumbai'
    });

    assert.strictEqual(result.breakdown.location, 0);

    const resultChennai = calculateMatchScore(res01, {
      location: 'Chennai'
    });
    assert.strictEqual(resultChennai.breakdown.location, 0);
  });

  // 5. Matching search keywords increases suitability
  test('5. Matching search keywords increases suitability', () => {
    const withIrrelevantKeywords = calculateMatchScore(res01, {
      category: 'Commercial Kitchen & Prep',
      searchQuery: 'completelyunrelatedterm123'
    });

    const withMatchingKeywords = calculateMatchScore(res01, {
      category: 'Commercial Kitchen & Prep',
      searchQuery: 'Artisan Bakery'
    });

    assert.strictEqual(withIrrelevantKeywords.breakdown.suitability, 20); // 20 category + 0 keywords
    assert.strictEqual(withMatchingKeywords.breakdown.suitability, 30);   // 20 category + 10 keywords
    assert.ok(withMatchingKeywords.score > withIrrelevantKeywords.score);
  });

  // 6. Valid requested date/time gets availability points
  test('6. Valid requested date/time gets availability points', () => {
    const result = calculateMatchScore(res01, {
      requestedDate: '2026-10-05', // Monday
      startTime: '05:00',
      endTime: '09:00',
      options: { now: baseNow }
    });

    assert.strictEqual(result.breakdown.availability, 40);
  });

  // 7. Unavailable day gets 0 availability points
  test('7. Unavailable day gets 0 availability points', () => {
    // res-01 is Mon-Fri; 2026-10-04 is Sunday
    const sundayResult = calculateMatchScore(res01, {
      requestedDate: '2026-10-04',
      options: { now: baseNow }
    });

    assert.strictEqual(sundayResult.breakdown.availability, 0);
  });

  // 8. Resource over max budget receives reduced price points
  test('8. Resource over max budget receives reduced price points', () => {
    // res-01 rate is 1800
    // Within budget: maxPrice = 2000 -> 10 pts
    const withinBudget = calculateMatchScore(res01, { maxPrice: 2000 });
    assert.strictEqual(withinBudget.breakdown.price, 10);

    // Moderately over budget: maxPrice = 1200 (rate 1800 is 50% over budget)
    // Scaled down: 10 * (1 - 0.5) = 5 pts
    const overBudget = calculateMatchScore(res01, { maxPrice: 1200 });
    assert.strictEqual(overBudget.breakdown.price, 5);

    // Significantly over budget: maxPrice = 800 (rate 1800 is >100% over budget)
    // Scale reaches 0
    const severelyOverBudget = calculateMatchScore(res01, { maxPrice: 800 });
    assert.strictEqual(severelyOverBudget.breakdown.price, 0);

    assert.ok(withinBudget.score > overBudget.score);
    assert.ok(overBudget.score > severelyOverBudget.score);
  });

  // 9. No max budget does not penalize the resource
  test('9. No max budget does not penalize the resource', () => {
    const withoutBudget = calculateMatchScore(res01, {});
    assert.strictEqual(withoutBudget.breakdown.price, 10);

    const withUndefinedBudget = calculateMatchScore(res01, { maxPrice: undefined });
    assert.strictEqual(withUndefinedBudget.breakdown.price, 10);
  });

  // 10. Invalid/missing query parameters are handled safely
  test('10. Invalid/missing query parameters are handled safely', () => {
    // Null resource returns 0 score safely
    const nullResourceResult = calculateMatchScore(null, {});
    assert.strictEqual(nullResourceResult.score, 0);
    assert.deepStrictEqual(nullResourceResult.breakdown, {
      availability: 0,
      suitability: 0,
      location: 0,
      price: 0
    });

    // Null query parameters
    const nullParamsResult = calculateMatchScore(res01, null);
    assert.ok(nullParamsResult.score >= 0 && nullParamsResult.score <= 100);

    // Undefined query parameters
    const undefinedParamsResult = calculateMatchScore(res01, undefined);
    assert.ok(undefinedParamsResult.score >= 0 && undefinedParamsResult.score <= 100);

    // Completely empty query parameters
    const emptyParamsResult = calculateMatchScore(res01, {});
    assert.ok(emptyParamsResult.score >= 0 && emptyParamsResult.score <= 100);

    // Malformed types in queryParams
    const malformedResult = calculateMatchScore(res01, {
      category: 12345,
      searchQuery: ['invalid'],
      location: { city: 'Bengaluru' },
      maxPrice: 'not-a-number',
      requestedDate: 'not-a-date',
      startTime: 'invalid',
      endTime: 'invalid'
    });
    assert.ok(malformedResult.score >= 0 && malformedResult.score <= 100);
  });
});
