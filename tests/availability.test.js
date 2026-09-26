import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkResourceAvailability } from '../src/utils/availability.js';
import { resources } from '../src/data/resources.js';

describe('Phase 9.2 — Availability Validation Utility', () => {
  const res01 = resources.find((r) => r.id === 'res-01'); // Bakery: Mon-Fri, 04:00-11:00, min 1h, notice 0h
  const res04 = resources.find((r) => r.id === 'res-04'); // Terrace: Mon-Thu, full day (00:00-23:59), min 24h
  const res06 = resources.find((r) => r.id === 'res-06'); // Trailer: Mon-Fri, full day, notice 24h, min 24h
  const res07 = resources.find((r) => r.id === 'res-07'); // Oven: Daily, 06:00-11:30 & 15:00-18:00, min 1h

  const baseNow = new Date('2026-10-01T08:00:00'); // Reference timestamp for deterministic testing

  test('valid weekday and time slot on res-01', () => {
    // 2026-10-05 is Monday (ISO day 1)
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

  test('wrong weekday on res-01 (Sunday)', () => {
    // 2026-10-04 is Sunday (ISO day 7)
    const result = checkResourceAvailability(
      res01,
      '2026-10-04',
      '05:00',
      '09:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, false);
    assert.match(result.reason, /not available on Sundays/i);
  });

  test('blackout date rejection', () => {
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
    assert.match(result.reason, /blocked or unavailable/i);
  });

  test('request outside available time slot on res-01', () => {
    // res-01 slot is 04:00 to 11:00; request 10:00 to 12:00 overshoots the end
    const result = checkResourceAvailability(
      res01,
      '2026-10-05',
      '10:00',
      '12:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, false);
    assert.match(result.reason, /outside the resource's available operating hours/i);
  });

  test('request spanning two separate slots on res-07', () => {
    // res-07 slots are 06:00–11:30 and 15:00–18:00
    // Request spanning across the afternoon gap (10:00 to 15:00) must be rejected
    const spanResult = checkResourceAvailability(
      res07,
      '2026-10-05',
      '10:00',
      '15:00',
      { now: baseNow }
    );
    assert.strictEqual(spanResult.available, false);
    assert.match(spanResult.reason, /outside the resource's available operating hours/i);

    // Valid single slot requests on res-07 must pass:
    // Slot 1 (morning): 07:00 to 10:00
    const slot1Result = checkResourceAvailability(
      res07,
      '2026-10-05',
      '07:00',
      '10:00',
      { now: baseNow }
    );
    assert.strictEqual(slot1Result.available, true);
    assert.strictEqual(slot1Result.reason, null);

    // Slot 2 (afternoon): 15:30 to 17:30
    const slot2Result = checkResourceAvailability(
      res07,
      '2026-10-05',
      '15:30',
      '17:30',
      { now: baseNow }
    );
    assert.strictEqual(slot2Result.available, true);
    assert.strictEqual(slot2Result.reason, null);
  });

  test('invalid time: startTime >= endTime', () => {
    const equalTimes = checkResourceAvailability(
      res01,
      '2026-10-05',
      '07:00',
      '07:00',
      { now: baseNow }
    );
    assert.strictEqual(equalTimes.available, false);
    assert.match(equalTimes.reason, /end time must be later than start time/i);

    const reversedTimes = checkResourceAvailability(
      res01,
      '2026-10-05',
      '09:00',
      '07:00',
      { now: baseNow }
    );
    assert.strictEqual(reversedTimes.available, false);
    assert.match(reversedTimes.reason, /end time must be later than start time/i);
  });

  test('duration below minRentalHours on res-04', () => {
    // res-04 requires minRentalHours: 24 (full day)
    // Requesting only 4 hours (10:00 to 14:00) on a Tuesday (2026-10-06)
    const result = checkResourceAvailability(
      res04,
      '2026-10-06',
      '10:00',
      '14:00',
      { now: baseNow }
    );
    assert.strictEqual(result.available, false);
    assert.match(result.reason, /less than the minimum rental duration/i);

    // Requesting full 24h day (00:00 to 23:59) should pass
    const fullDayResult = checkResourceAvailability(
      res04,
      '2026-10-06',
      '00:00',
      '23:59',
      { now: baseNow }
    );
    assert.strictEqual(fullDayResult.available, true);
    assert.strictEqual(fullDayResult.reason, null);
  });

  test('insufficient notice on res-06', () => {
    // res-06 requires noticeHours: 24
    // now = 2026-10-05 08:00
    // Request start: 2026-10-05 16:00 (8 hours notice -> insufficient)
    const shortNoticeResult = checkResourceAvailability(
      res06,
      '2026-10-05',
      '00:00',
      '23:59',
      { now: new Date('2026-10-04T12:00:00') } // only 12h notice before 2026-10-05 00:00
    );
    assert.strictEqual(shortNoticeResult.available, false);
    assert.match(shortNoticeResult.reason, /requires at least 24 hours advance notice/i);

    // Sufficient notice: now is 2026-10-03 (48h before 2026-10-05 00:00)
    const validNoticeResult = checkResourceAvailability(
      res06,
      '2026-10-05',
      '00:00',
      '23:59',
      { now: new Date('2026-10-03T00:00:00') }
    );
    assert.strictEqual(validNoticeResult.available, true);
    assert.strictEqual(validNoticeResult.reason, null);
  });

  test('reject booking in the past', () => {
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

  test('safe handling of invalid parameters', () => {
    assert.strictEqual(
      checkResourceAvailability(null, '2026-10-05', '05:00', '09:00').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability({}, '2026-10-05', '05:00', '09:00').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability(res01, 'invalid-date', '05:00', '09:00').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability(res01, '2026-10-05', '25:00', '09:00').available,
      false
    );
    assert.strictEqual(
      checkResourceAvailability(res01, '2026-10-05', '05:00', 'invalid-time').available,
      false
    );
  });
});
