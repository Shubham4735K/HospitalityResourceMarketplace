import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Booking = require('../server/models/Booking.js');

describe('Phase 14.2 — Booking Model Schema Validation', () => {
  const validBookingData = {
    bookingNumber: 'BK-2026-0001',
    requestId: new mongoose.Types.ObjectId(),
    resourceId: 'res-01',
    resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
    hostBusiness: 'The Artisan Loaf & Patisserie',
    seekerBusiness: 'Sweet Treats Cafe',
    seekerFullName: 'Rahul Sharma',
    seekerEmail: 'rahul@sweettreats.com',
    seekerPhone: '+91 98765 43210',
    requestedDate: '2026-10-05',
    startTime: '04:00',
    endTime: '11:00',
    rate: 1800,
    rateUnit: 'hour',
    duration: 7,
    billedUnits: 7,
    subtotal: 12600,
    total: 12600,
    currency: 'INR',
    status: 'Confirmed'
  };

  test('valid booking document passes schema validation', () => {
    const booking = new Booking(validBookingData);
    const error = booking.validateSync();
    assert.strictEqual(error, undefined);
  });

  test('applies default status "Confirmed" and currency "INR"', () => {
    const { status, currency, ...dataWithoutDefaults } = validBookingData;
    const booking = new Booking(dataWithoutDefaults);
    assert.strictEqual(booking.status, 'Confirmed');
    assert.strictEqual(booking.currency, 'INR');
    const error = booking.validateSync();
    assert.strictEqual(error, undefined);
  });

  test('accepts all allowed status values ("Confirmed", "Active", "Completed", "Cancelled")', () => {
    const allowedStatuses = ['Confirmed', 'Active', 'Completed', 'Cancelled'];
    for (const status of allowedStatuses) {
      const booking = new Booking({ ...validBookingData, status });
      const error = booking.validateSync();
      assert.strictEqual(error, undefined, `Status "${status}" should be valid`);
    }
  });

  test('rejects invalid status values', () => {
    const invalidStatuses = ['Pending', 'Rejected', 'Draft', 'refunded', 'unknown'];
    for (const status of invalidStatuses) {
      const booking = new Booking({ ...validBookingData, status });
      const error = booking.validateSync();
      assert.ok(error, `Status "${status}" should be rejected`);
      assert.ok(error.errors.status, 'Should contain status validation error');
    }
  });

  test('accepts allowed rateUnit values ("hour", "day")', () => {
    for (const rateUnit of ['hour', 'day']) {
      const booking = new Booking({ ...validBookingData, rateUnit });
      const error = booking.validateSync();
      assert.strictEqual(error, undefined, `rateUnit "${rateUnit}" should be valid`);
    }
  });

  test('rejects invalid rateUnit values', () => {
    const invalidUnits = ['month', 'week', 'flat', 'year'];
    for (const rateUnit of invalidUnits) {
      const booking = new Booking({ ...validBookingData, rateUnit });
      const error = booking.validateSync();
      assert.ok(error, `rateUnit "${rateUnit}" should be rejected`);
      assert.ok(error.errors.rateUnit, 'Should contain rateUnit validation error');
    }
  });

  test('enforces required fields', () => {
    const requiredFields = [
      'bookingNumber',
      'requestId',
      'resourceId',
      'resourceTitle',
      'hostBusiness',
      'seekerBusiness',
      'seekerFullName',
      'seekerEmail',
      'seekerPhone',
      'requestedDate',
      'startTime',
      'endTime',
      'rate',
      'rateUnit',
      'duration',
      'billedUnits',
      'subtotal',
      'total'
    ];

    for (const field of requiredFields) {
      const data = { ...validBookingData };
      delete data[field];
      const booking = new Booking(data);
      const error = booking.validateSync();
      assert.ok(error, `Missing field "${field}" should cause validation error`);
      assert.ok(error.errors[field], `Error should be on "${field}"`);
    }
  });

  test('rejects negative numbers for financial and duration fields', () => {
    const numericFields = ['rate', 'duration', 'billedUnits', 'subtotal', 'total'];
    for (const field of numericFields) {
      const booking = new Booking({ ...validBookingData, [field]: -1 });
      const error = booking.validateSync();
      assert.ok(error, `Negative value for "${field}" should be rejected`);
      assert.ok(error.errors[field], `Error should be on "${field}"`);
    }
  });

  test('optional Phase 12 identity fields do not prevent document creation and default to null', () => {
    const booking = new Booking(validBookingData);
    assert.strictEqual(booking.seekerUserId, null);
    assert.strictEqual(booking.hostBusinessId, null);
    const error = booking.validateSync();
    assert.strictEqual(error, undefined);

    const bookingWithPhase12 = new Booking({
      ...validBookingData,
      seekerUserId: 'usr_789',
      hostBusinessId: 'biz_456'
    });
    assert.strictEqual(bookingWithPhase12.seekerUserId, 'usr_789');
    assert.strictEqual(bookingWithPhase12.hostBusinessId, 'biz_456');
    const error2 = bookingWithPhase12.validateSync();
    assert.strictEqual(error2, undefined);
  });
});
