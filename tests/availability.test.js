import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkResourceAvailability } from '../src/utils/availability.js';
import { resources } from '../src/data/resources.js';

describe('Phase 9.2 — Day-Only Availability Validation Utility', () => {
  const res01 = resources.find((r) => r.id === 'res-01'); // Bakery: Mon-Fri
  const res04 = resources.find((r) => r.id === 'res-04'); // Terrace: Mon-Thu

  const baseNow = new Date('2026-10-01T08:00:00'); // Reference timestamp: Thursday Oct 1, 2026

  test('1. Available weekday → available', () => {
    // 2026-10-05 is Monday (ISO day 1, available on res-01)
    const result = checkResourceAvailability(
      res01,
      '2026-10-05',
      '05:00',
      '09:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.reason, null);
  });

  test('2. Unavailable weekday → unavailable', () => {
    // 2026-10-04 is Sunday (ISO day 7, unavailable on res-01)
    const result = checkResourceAvailability(
      res01,
      '2026-10-04',
      '05:00',
      '09:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, false);
    assert.match(result.reason, /not available on Sundays/i);

    // 2026-10-09 is Friday (ISO day 5, unavailable on res-04 which is Mon-Thu)
    const res04Result = checkResourceAvailability(
      res04,
      '2026-10-09',
      '10:00',
      '18:00',
      { now: baseNow }
    );
    assert.strictEqual(res04Result.available, false);
    assert.match(res04Result.reason, /not available on Fridays/i);
  });

  test('3. Blackout date → unavailable', () => {
    const resWithBlackout = {
      ...res01,
      schedule: {
        ...res01.schedule,
        blackoutDates: ['2026-10-05']
      }
    };
    const result = checkResourceAvailability(
      resWithBlackout,
      '2026-10-05',
      '05:00',
      '09:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, false);
    assert.match(result.reason, /unavailable on the requested date/i);
  });

  test('4. Past date → unavailable', () => {
    // now = 2026-10-10, requested date = 2026-10-05
    const pastResult = checkResourceAvailability(
      res01,
      '2026-10-05',
      '05:00',
      '09:00',
      { now: new Date('2026-10-10T00:00:00') }
    );
    assert.strictEqual(pastResult.available, false);
    assert.match(pastResult.reason, /cannot be in the past/i);
  });

  test('5. Invalid date → rejected', () => {
    const invalidFormat = checkResourceAvailability(res01, 'invalid-date', '05:00', '09:00');
    assert.strictEqual(invalidFormat.available, false);
    assert.match(invalidFormat.reason, /invalid or missing requested date/i);

    const nonCalendarDate = checkResourceAvailability(res01, '2026-02-31', '05:00', '09:00');
    assert.strictEqual(nonCalendarDate.available, false);
    assert.match(nonCalendarDate.reason, /invalid or missing requested date/i);
  });

  test('6. Different start/end times on the SAME available day produce the SAME availability result', () => {
    // 2026-10-05 is an available Monday on res-01
    const morning = checkResourceAvailability(res01, '2026-10-05', '04:00', '06:00', { now: baseNow });
    const afternoon = checkResourceAvailability(res01, '2026-10-05', '14:00', '18:00', { now: baseNow });
    const night = checkResourceAvailability(res01, '2026-10-05', '22:00', '23:59', { now: baseNow });
    const invertedTimes = checkResourceAvailability(res01, '2026-10-05', '18:00', '14:00', { now: baseNow });
    const noTimes = checkResourceAvailability(res01, '2026-10-05', undefined, undefined, { now: baseNow });

    assert.strictEqual(morning.available, true);
    assert.strictEqual(afternoon.available, true);
    assert.strictEqual(night.available, true);
    assert.strictEqual(invertedTimes.available, true);
    assert.strictEqual(noTimes.available, true);

    assert.strictEqual(morning.reason, null);
    assert.strictEqual(afternoon.reason, null);
    assert.strictEqual(night.reason, null);
    assert.strictEqual(invertedTimes.reason, null);
    assert.strictEqual(noTimes.reason, null);
  });

  test('7. Safe handling of invalid parameters', () => {
    assert.strictEqual(
      checkResourceAvailability(null, '2026-10-05').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability({}, '2026-10-05').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability({ schedule: { status: 'Unavailable' } }, '2026-10-05').available,
      false
    );
  });
});
