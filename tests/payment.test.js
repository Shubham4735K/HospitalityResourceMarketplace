import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Booking = require('../server/models/Booking.js');
const Transaction = require('../server/models/Transaction.js');
const app = require('../server/server.js');

describe('Phase 14.4 — Payment Simulation & Transaction Logging API', () => {
  let server;
  let baseUrl;
  let inMemoryBookings = [];
  let inMemoryTransactions = [];

  const origBookingFindById = Booking.findById;
  const origTransactionFindOne = Transaction.findOne;
  const origTransactionFind = Transaction.find;
  const origTransactionSave = Transaction.prototype.save;

  before(async () => {
    // Mock Booking methods
    Booking.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const found = inMemoryBookings.find((item) => String(item._id) === String(id));
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryBookings.findIndex((i) => String(i._id) === String(id));
          if (idx !== -1) {
            inMemoryBookings[idx] = { ...this };
          }
          return this;
        }
      };
    };

    // Mock Transaction methods
    Transaction.findOne = async function (filter = {}) {
      return (
        inMemoryTransactions.find((item) => {
          if (filter.bookingId && String(item.bookingId) !== String(filter.bookingId)) return false;
          if (filter.type && item.type !== filter.type) return false;
          if (filter.status && item.status !== filter.status) return false;
          if (filter.transactionNumber && item.transactionNumber !== filter.transactionNumber) return false;
          return true;
        }) || null
      );
    };

    Transaction.find = async function (filter = {}) {
      return inMemoryTransactions.filter((item) => {
        if (filter.bookingId && String(item.bookingId) !== String(filter.bookingId)) return false;
        if (filter.type && item.type !== filter.type) return false;
        if (filter.status && item.status !== filter.status) return false;
        return true;
      });
    };

    Transaction.prototype.save = async function () {
      const doc = {
        _id: this._id || new mongoose.Types.ObjectId(),
        transactionNumber: this.transactionNumber,
        bookingId: this.bookingId,
        type: this.type,
        amount: this.amount,
        currency: this.currency,
        status: this.status || 'Pending',
        paymentMethod: this.paymentMethod,
        gatewayRef: this.gatewayRef || null
      };
      inMemoryTransactions.push(doc);
      return doc;
    };

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    Booking.findById = origBookingFindById;
    Transaction.findOne = origTransactionFindOne;
    Transaction.find = origTransactionFind;
    Transaction.prototype.save = origTransactionSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryBookings = [];
    inMemoryTransactions = [];
  });

  function createMockBooking(overrides = {}) {
    const id = new mongoose.Types.ObjectId().toString();
    const booking = {
      _id: id,
      bookingNumber: 'BK-2026-TEST',
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
      status: 'Confirmed',
      ...overrides
    };
    inMemoryBookings.push(booking);
    return booking;
  }

  test('1. Confirmed booking can be paid', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Payment simulated successfully');
    assert.ok(body.transaction);
  });

  test('2. Payment creates a Charge transaction in the database', async () => {
    const booking = createMockBooking();

    await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Card' })
    });

    assert.strictEqual(inMemoryTransactions.length, 1);
    assert.strictEqual(inMemoryTransactions[0].type, 'Charge');
    assert.strictEqual(String(inMemoryTransactions[0].bookingId), String(booking._id));
  });

  test('3. Transaction amount equals booking.total', async () => {
    const customTotal = 15400;
    const booking = createMockBooking({ total: customTotal, subtotal: customTotal });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'NetBanking' })
    });

    const body = await res.json();
    assert.strictEqual(body.transaction.amount, customTotal);
    assert.strictEqual(inMemoryTransactions[0].amount, customTotal);
  });

  test('4. Transaction currency equals booking.currency', async () => {
    const booking = createMockBooking({ currency: 'INR' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    const body = await res.json();
    assert.strictEqual(body.transaction.currency, 'INR');
    assert.strictEqual(inMemoryTransactions[0].currency, 'INR');
  });

  test('5. Payment method is stored and normalized', async () => {
    const booking1 = createMockBooking();
    const res1 = await fetch(`${baseUrl}/api/bookings/${booking1._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: '  upi  ' })
    });
    const body1 = await res1.json();
    assert.strictEqual(body1.transaction.paymentMethod, 'UPI');

    const booking2 = createMockBooking();
    const res2 = await fetch(`${baseUrl}/api/bookings/${booking2._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'card' })
    });
    const body2 = await res2.json();
    assert.strictEqual(body2.transaction.paymentMethod, 'Card');
  });

  test('6. Transaction status is Success', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Card' })
    });

    const body = await res.json();
    assert.strictEqual(body.transaction.status, 'Success');
    assert.strictEqual(inMemoryTransactions[0].status, 'Success');
  });

  test('7. Simulated gatewayRef is generated', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    const body = await res.json();
    assert.ok(body.transaction.gatewayRef);
    assert.match(body.transaction.gatewayRef, /^MOCK-\d{4}-[A-Z0-9]{4}$/);
  });

  test('8. Transaction number follows TXN-YYYY-XXXX format', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    const body = await res.json();
    assert.ok(body.transaction.transactionNumber);
    assert.match(body.transaction.transactionNumber, /^TXN-\d{4}-[A-Z0-9]{4}$/);
  });

  test('9. Invalid ID format returns 400 and nonexistent booking returns 404', async () => {
    const resInvalid = await fetch(`${baseUrl}/api/bookings/invalid-id-format/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });
    assert.strictEqual(resInvalid.status, 400);

    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await fetch(`${baseUrl}/api/bookings/${nonExistentId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });
    assert.strictEqual(resNotFound.status, 404);
  });

  test('10. Active booking cannot be paid', async () => {
    const booking = createMockBooking({ status: 'Active' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /payment is only allowed for confirmed bookings/i);
    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  test('11. Completed booking cannot be paid', async () => {
    const booking = createMockBooking({ status: 'Completed' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Card' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /payment is only allowed for confirmed bookings/i);
    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  test('12. Cancelled booking cannot be paid', async () => {
    const booking = createMockBooking({ status: 'Cancelled' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'NetBanking' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /payment is only allowed for confirmed bookings/i);
    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  test('13. Missing paymentMethod returns 400', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /invalid or missing payment method/i);
    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  test('14. Unsupported paymentMethod returns 400', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Cryptocurrency' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /supported payment methods are: UPI, Card, NetBanking/i);
    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  test('15. Successful duplicate payment returns 409', async () => {
    const booking = createMockBooking();

    // First payment succeeds
    const res1 = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });
    assert.strictEqual(res1.status, 201);

    // Second payment attempts duplicate
    const res2 = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    assert.strictEqual(res2.status, 409);
    const body2 = await res2.json();
    assert.match(body2.reason, /booking has already been paid/i);
  });

  test('16. Duplicate payment does not create a second Charge', async () => {
    const booking = createMockBooking();

    await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Card' })
    });

    assert.strictEqual(inMemoryTransactions.length, 1);
  });

  test('17. Booking remains Confirmed after successful payment', async () => {
    const booking = createMockBooking({ status: 'Confirmed' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.booking.status, 'Confirmed');

    const storedBooking = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(storedBooking.status, 'Confirmed');
  });

  test('18. Booking total is used instead of recalculating resource pricing', async () => {
    // If the catalog rate had changed or a custom negotiated total was stored on the booking:
    const customSnapshotTotal = 9999;
    const booking = createMockBooking({
      resourceId: 'res-01', // res-01 normal rate is 1800/hr
      total: customSnapshotTotal,
      subtotal: customSnapshotTotal
    });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'UPI' })
    });

    const body = await res.json();
    assert.strictEqual(body.transaction.amount, customSnapshotTotal);
  });
});
