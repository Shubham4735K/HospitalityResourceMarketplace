import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateRentalDuration,
  calculateSubtotal,
  calculatePricing,
  formatCurrency,
  SUPPORTED_RATE_UNITS
} = require('../server/utils/pricing.js');
const resources = require('../server/data/resources.js');

describe('Phase 14.1 — Pricing & Duration Utility', () => {
  const resBakery = resources.find((r) => r.id === 'res-01'); // 1800 / hour
  const resTerrace = resources.find((r) => r.id === 'res-04'); // 45000 / day
  const resBallroom = resources.find((r) => r.id === 'res-05'); // 35000 / day
  const resTrailer = resources.find((r) => r.id === 'res-06'); // 6500 / day

  describe('1. calculateRentalDuration', () => {
    test('calculates valid full-hour duration', () => {
      const result = calculateRentalDuration('10:00', '14:00');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.minutes, 240);
      assert.strictEqual(result.hours, 4);
      assert.strictEqual(result.days, 1);
      assert.strictEqual(result.error, null);
    });

    test('calculates valid fractional-hour duration (e.g. 2.5 hours)', () => {
      const result = calculateRentalDuration('14:00', '16:30');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.minutes, 150);
      assert.strictEqual(result.hours, 2.5);
      assert.strictEqual(result.days, 1);
      assert.strictEqual(result.error, null);
    });

    test('handles full day 23:59 boundary as 24 hours', () => {
      const result = calculateRentalDuration('00:00', '23:59');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.minutes, 1440);
      assert.strictEqual(result.hours, 24);
      assert.strictEqual(result.days, 1);
      assert.strictEqual(result.error, null);
    });

    test('rejects missing or non-string time arguments', () => {
      const res1 = calculateRentalDuration(null, '12:00');
      assert.strictEqual(res1.valid, false);
      assert.strictEqual(res1.hours, 0);
      assert.match(res1.error, /invalid or missing/i);

      const res2 = calculateRentalDuration('10:00', undefined);
      assert.strictEqual(res2.valid, false);
      assert.strictEqual(res2.hours, 0);

      const res3 = calculateRentalDuration(1200, 1400);
      assert.strictEqual(res3.valid, false);
    });

    test('rejects malformed time strings', () => {
      const res1 = calculateRentalDuration('25:00', '12:00');
      assert.strictEqual(res1.valid, false);
      assert.match(res1.error, /invalid time format/i);

      const res2 = calculateRentalDuration('10:00', '12:60');
      assert.strictEqual(res2.valid, false);

      const res3 = calculateRentalDuration('morning', 'afternoon');
      assert.strictEqual(res3.valid, false);
    });

    test('rejects end time earlier than start time', () => {
      const result = calculateRentalDuration('16:00', '10:00');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.hours, 0);
      assert.match(result.error, /end time must be later than start time/i);
    });

    test('rejects zero duration where start time equals end time', () => {
      const result = calculateRentalDuration('10:00', '10:00');
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.minutes, 0);
      assert.strictEqual(result.hours, 0);
      assert.match(result.error, /end time must be later than start time/i);
    });
  });

  describe('2. calculateSubtotal', () => {
    test('calculates valid hourly subtotal with numeric duration', () => {
      const result = calculateSubtotal(1800, 'hour', 4);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.rate, 1800);
      assert.strictEqual(result.rateUnit, 'hour');
      assert.strictEqual(result.billedUnits, 4);
      assert.strictEqual(result.subtotal, 7200);
      assert.strictEqual(result.error, null);
    });

    test('calculates valid hourly subtotal with duration object', () => {
      const duration = calculateRentalDuration('04:00', '11:00'); // 7 hours
      const result = calculateSubtotal(1800, 'hour', duration);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.billedUnits, 7);
      assert.strictEqual(result.subtotal, 12600);
    });

    test('calculates valid hourly fractional subtotal', () => {
      const duration = calculateRentalDuration('10:00', '11:30'); // 1.5 hours
      const result = calculateSubtotal(1200, 'hour', duration);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.billedUnits, 1.5);
      assert.strictEqual(result.subtotal, 1800);
    });

    test('calculates valid daily subtotal for single-day booking', () => {
      const duration = calculateRentalDuration('08:00', '18:00'); // 10 hours within 1 day
      const result = calculateSubtotal(35000, 'day', duration);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.billedUnits, 1);
      assert.strictEqual(result.subtotal, 35000);
    });

    test('calculates valid daily subtotal with explicit multi-day count in options', () => {
      const duration = calculateRentalDuration('00:00', '23:59');
      const result = calculateSubtotal(6500, 'day', duration, { days: 3 });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.billedUnits, 3);
      assert.strictEqual(result.subtotal, 19500);
    });

    test('normalizes rateUnit case and whitespace', () => {
      const resHour = calculateSubtotal(1000, '  Hour  ', 2);
      assert.strictEqual(resHour.valid, true);
      assert.strictEqual(resHour.rateUnit, 'hour');
      assert.strictEqual(resHour.subtotal, 2000);

      const resDay = calculateSubtotal(5000, 'DAY', 1);
      assert.strictEqual(resDay.valid, true);
      assert.strictEqual(resDay.rateUnit, 'day');
      assert.strictEqual(resDay.subtotal, 5000);
    });

    test('rejects missing or invalid rate', () => {
      const resNull = calculateSubtotal(null, 'hour', 2);
      assert.strictEqual(resNull.valid, false);
      assert.match(resNull.error, /invalid or missing resource rate/i);

      const resString = calculateSubtotal('free', 'hour', 2);
      assert.strictEqual(resString.valid, false);

      const resNegative = calculateSubtotal(-100, 'hour', 2);
      assert.strictEqual(resNegative.valid, false);

      const resNaN = calculateSubtotal(NaN, 'hour', 2);
      assert.strictEqual(resNaN.valid, false);
    });

    test('rejects missing or unsupported rateUnit', () => {
      const resNull = calculateSubtotal(1000, null, 2);
      assert.strictEqual(resNull.valid, false);
      assert.match(resNull.error, /invalid or missing rate unit/i);

      const resMonth = calculateSubtotal(1000, 'month', 2);
      assert.strictEqual(resMonth.valid, false);
      assert.match(resMonth.error, /unsupported rate unit/i);

      const resWeekly = calculateSubtotal(1000, 'week', 2);
      assert.strictEqual(resWeekly.valid, false);
    });

    test('rejects invalid or zero duration', () => {
      const resZero = calculateSubtotal(1000, 'hour', 0);
      assert.strictEqual(resZero.valid, false);
      assert.match(resZero.error, /duration must be a positive number/i);

      const resNegative = calculateSubtotal(1000, 'hour', -3);
      assert.strictEqual(resNegative.valid, false);

      const resInvalidObj = calculateSubtotal(1000, 'hour', { valid: false, error: 'Invalid start time' });
      assert.strictEqual(resInvalidObj.valid, false);
      assert.strictEqual(resInvalidObj.error, 'Invalid start time');
    });
  });

  describe('3. calculatePricing (complete structured pricing result)', () => {
    test('calculates pricing for hourly resource and request objects', () => {
      const request = {
        requestedDate: '2026-10-05',
        startTime: '04:00',
        endTime: '11:00'
      };

      const pricing = calculatePricing(resBakery, request);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.rate, 1800);
      assert.strictEqual(pricing.rateUnit, 'hour');
      assert.strictEqual(pricing.currency, 'INR');
      assert.strictEqual(pricing.duration.hours, 7);
      assert.strictEqual(pricing.duration.minutes, 420);
      assert.strictEqual(pricing.billedUnits, 7);
      assert.strictEqual(pricing.unitPrice, 1800);
      assert.strictEqual(pricing.subtotal, 12600);
      assert.strictEqual(pricing.total, 12600);
      assert.strictEqual(pricing.error, null);
    });

    test('calculates pricing for daily resource and request objects', () => {
      const request = {
        requestedDate: '2026-10-05',
        startTime: '00:00',
        endTime: '23:59'
      };

      const pricing = calculatePricing(resTerrace, request);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.rate, 45000);
      assert.strictEqual(pricing.rateUnit, 'day');
      assert.strictEqual(pricing.currency, 'INR');
      assert.strictEqual(pricing.duration.hours, 24);
      assert.strictEqual(pricing.billedUnits, 1);
      assert.strictEqual(pricing.unitPrice, 45000);
      assert.strictEqual(pricing.subtotal, 45000);
      assert.strictEqual(pricing.total, 45000);
      assert.strictEqual(pricing.error, null);
    });

    test('calculates pricing for daily resource with partial day window', () => {
      const request = {
        requestedDate: '2026-10-06',
        startTime: '08:00',
        endTime: '18:00'
      };

      const pricing = calculatePricing(resBallroom, request);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.rate, 35000);
      assert.strictEqual(pricing.rateUnit, 'day');
      assert.strictEqual(pricing.duration.hours, 10);
      assert.strictEqual(pricing.billedUnits, 1);
      assert.strictEqual(pricing.subtotal, 35000);
    });

    test('calculates pricing when passed a single combined options object', () => {
      const pricing = calculatePricing({
        rate: 2400,
        rateUnit: 'hour',
        startTime: '06:00',
        endTime: '10:00'
      });
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.duration.hours, 4);
      assert.strictEqual(pricing.subtotal, 9600);
    });

    test('handles invalid time input gracefully in calculatePricing', () => {
      const request = {
        requestedDate: '2026-10-05',
        startTime: '14:00',
        endTime: '10:00'
      };

      const pricing = calculatePricing(resBakery, request);
      assert.strictEqual(pricing.valid, false);
      assert.strictEqual(pricing.subtotal, null);
      assert.strictEqual(pricing.total, null);
      assert.match(pricing.error, /end time must be later than start time/i);
    });

    test('handles missing resource information gracefully', () => {
      const pricing = calculatePricing(null, { startTime: '10:00', endTime: '12:00' });
      assert.strictEqual(pricing.valid, false);
      assert.match(pricing.error, /invalid or missing resource information/i);
    });

    test('handles missing rate or rateUnit in resource object', () => {
      const invalidRes = { ...resBakery, rate: undefined };
      const pricing = calculatePricing(invalidRes, { startTime: '10:00', endTime: '12:00' });
      assert.strictEqual(pricing.valid, false);
      assert.match(pricing.error, /invalid or missing resource rate/i);
    });
  });

  describe('4. formatCurrency', () => {
    test('formats whole numbers to INR currency representation', () => {
      const formatted = formatCurrency(1800);
      assert.match(formatted, /1,800/);
    });

    test('formats fractional numbers to 2 decimal places', () => {
      const formatted = formatCurrency(1800.5);
      assert.match(formatted, /1,800\.5/);
    });

    test('returns empty string for invalid inputs', () => {
      assert.strictEqual(formatCurrency(null), '');
      assert.strictEqual(formatCurrency(undefined), '');
      assert.strictEqual(formatCurrency('abc'), '');
      assert.strictEqual(formatCurrency(NaN), '');
    });
  });

  describe('5. Constants and Boundaries', () => {
    test('SUPPORTED_RATE_UNITS exports "hour" and "day"', () => {
      assert.deepStrictEqual(SUPPORTED_RATE_UNITS, ['hour', 'day']);
    });
  });
});
