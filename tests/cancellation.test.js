import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Booking = require('../server/models/Booking.js');
const Transaction = require('../server/models/Transaction.js');
const Request = require('../server/models/Request.js');
const app = require('../server/server.js');

describe('Phase 14.5 — Cancellation & Refund Workflow API', () => {
  let server;
  let baseUrl;
  let inMemoryBookings = [];
  let inMemoryTransactions = [];
  let inMemoryRequests = [];

  const origBookingFindById = Booking.findById;
  const origTransactionFindOne = Transaction.findOne;
  const origTransactionFind = Transaction.find;
  const origTransactionSave = Transaction.prototype.save;
  const origRequestFindById = Request.findById;
  const origRequestFind = Request.find;
  const origRequestSave = Request.prototype.save;

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

    // Mock Request methods
    Request.findById = async function (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const found = inMemoryRequests.find((item) => String(item._id) === String(id));
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryRequests.findIndex((i) => String(i._id) === String(id));
          if (idx !== -1) {
            inMemoryRequests[idx] = { ...this };
          }
          return this;
        }
      };
    };

    Request.find = async function (filter = {}) {
      return inMemoryRequests.filter((item) => {
        if (filter._id && String(item._id) !== String(filter._id)) return false;
        if (filter.status && item.status !== filter.status) return false;
        return true;
      });
    };

    Request.prototype.save = async function () {
      const doc = {
        _id: this._id || new mongoose.Types.ObjectId(),
        resourceId: this.resourceId,
        resourceTitle: this.resourceTitle,
        fullName: this.fullName,
        businessName: this.businessName,
        email: this.email,
        phone: this.phone,
        requestedDate: this.requestedDate,
        startTime: this.startTime,
        endTime: this.endTime,
        message: this.message,
        status: this.status || 'Pending',
        bookingId: this.bookingId || null
      };
      const idx = inMemoryRequests.findIndex((i) => String(i._id) === String(doc._id));
      if (idx !== -1) {
        inMemoryRequests[idx] = doc;
      } else {
        inMemoryRequests.push(doc);
      }
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
    Request.findById = origRequestFindById;
    Request.find = origRequestFind;
    Request.prototype.save = origRequestSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryBookings = [];
    inMemoryTransactions = [];
    inMemoryRequests = [];
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

  function createMockCharge(bookingId, overrides = {}) {
    const charge = {
      _id: new mongoose.Types.ObjectId(),
      transactionNumber: 'TXN-2026-ABCD',
      bookingId,
      type: 'Charge',
      amount: 12600,
      currency: 'INR',
      status: 'Success',
      paymentMethod: 'UPI',
      gatewayRef: 'MOCK-2026-WXYZ',
      ...overrides
    };
    inMemoryTransactions.push(charge);
    return charge;
  }

  function createMockRequest(overrides = {}) {
    const id = new mongoose.Types.ObjectId().toString();
    const req = {
      _id: id,
      resourceId: 'res-01',
      resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      fullName: 'Rahul Sharma',
      businessName: 'Sweet Treats Cafe',
      email: 'rahul@sweettreats.com',
      phone: '+91 98765 43210',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      message: 'Need kitchen for prep work',
      status: 'Accepted',
      bookingId: null,
      ...overrides
    };
    inMemoryRequests.push(req);
    return req;
  }

  // 1. Invalid booking ID -> 400
  test('1. Invalid booking ID format returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/invalid-id-xyz/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking ID format');
  });

  // 2. Non-existent booking -> 404
  test('2. Non-existent booking returns 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/api/bookings/${nonExistentId}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error, 'Booking not found');
  });

  // 3. Cancel confirmed unpaid booking -> 200
  test('3. Cancel confirmed unpaid booking returns 200 with refund as null', async () => {
    const booking = createMockBooking();

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Booking cancelled successfully');
    assert.strictEqual(body.booking.status, 'Cancelled');
    assert.strictEqual(body.refund, null);
  });

  // 4. Cancel confirmed paid booking -> 200
  test('4. Cancel confirmed paid booking returns 200 with refund transaction', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { amount: 12600, paymentMethod: 'Card' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Booking cancelled successfully');
    assert.strictEqual(body.booking.status, 'Cancelled');
    assert.ok(body.refund);
    assert.strictEqual(body.refund.type, 'Refund');
    assert.strictEqual(body.refund.status, 'Success');
  });

  // 5. Paid cancellation creates exactly one Refund transaction
  test('5. Paid cancellation creates exactly one Refund transaction in database', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);

    await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const refunds = inMemoryTransactions.filter(
      (t) => String(t.bookingId) === String(booking._id) && t.type === 'Refund'
    );
    assert.strictEqual(refunds.length, 1);
    assert.strictEqual(refunds[0].status, 'Success');
  });

  // 6. Refund amount equals successful Charge amount
  test('6. Refund amount equals successful Charge amount', async () => {
    const chargeAmount = 18500;
    const booking = createMockBooking({ total: chargeAmount, subtotal: chargeAmount });
    createMockCharge(booking._id, { amount: chargeAmount });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const body = await res.json();
    assert.strictEqual(body.refund.amount, chargeAmount);

    const refundInDb = inMemoryTransactions.find(
      (t) => String(t.bookingId) === String(booking._id) && t.type === 'Refund'
    );
    assert.strictEqual(refundInDb.amount, chargeAmount);
  });

  // 7. Refund currency matches booking currency
  test('7. Refund currency matches booking currency', async () => {
    const booking = createMockBooking({ currency: 'INR' });
    createMockCharge(booking._id, { currency: 'INR' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const body = await res.json();
    assert.strictEqual(body.refund.currency, 'INR');

    const refundInDb = inMemoryTransactions.find(
      (t) => String(t.bookingId) === String(booking._id) && t.type === 'Refund'
    );
    assert.strictEqual(refundInDb.currency, 'INR');
  });

  // 8. Refund uses the original payment method
  test('8. Refund uses the original payment method from successful Charge', async () => {
    const bookingUPI = createMockBooking();
    createMockCharge(bookingUPI._id, { paymentMethod: 'UPI' });

    const res1 = await fetch(`${baseUrl}/api/bookings/${bookingUPI._id}/cancel`, {
      method: 'POST'
    });
    const body1 = await res1.json();
    assert.strictEqual(body1.refund.paymentMethod, 'UPI');

    const bookingCard = createMockBooking();
    createMockCharge(bookingCard._id, { paymentMethod: 'Card' });

    const res2 = await fetch(`${baseUrl}/api/bookings/${bookingCard._id}/cancel`, {
      method: 'POST'
    });
    const body2 = await res2.json();
    assert.strictEqual(body2.refund.paymentMethod, 'Card');
  });

  // 9. Cancelled booking has status "Cancelled"
  test('9. Cancelled booking has status "Cancelled" in database', async () => {
    const booking = createMockBooking();

    await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const updatedBooking = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(updatedBooking.status, 'Cancelled');
  });

  // 10. Already Cancelled booking -> 400
  test('10. Already Cancelled booking returns 400 and preserves status', async () => {
    const booking = createMockBooking({ status: 'Cancelled' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking status');
    assert.ok(body.reason.includes('Only Confirmed bookings can be cancelled'));

    const bookingInDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(bookingInDb.status, 'Cancelled');
  });

  // 11. Active booking -> 400
  test('11. Active booking returns 400 and preserves status', async () => {
    const booking = createMockBooking({ status: 'Active' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking status');
    assert.ok(body.reason.includes('Current status is Active'));

    const bookingInDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(bookingInDb.status, 'Active');
  });

  // 12. Completed booking -> 400
  test('12. Completed booking returns 400 and preserves status', async () => {
    const booking = createMockBooking({ status: 'Completed' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking status');
    assert.ok(body.reason.includes('Current status is Completed'));

    const bookingInDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(bookingInDb.status, 'Completed');
  });

  // 13. Duplicate successful refund is prevented
  test('13. Duplicate successful refund is prevented and returns 409', async () => {
    const booking = createMockBooking({ status: 'Confirmed' });
    createMockCharge(booking._id);
    // Pre-existing refund in DB
    inMemoryTransactions.push({
      _id: new mongoose.Types.ObjectId(),
      transactionNumber: 'TXN-2026-REF1',
      bookingId: booking._id,
      type: 'Refund',
      amount: 12600,
      currency: 'INR',
      status: 'Success',
      paymentMethod: 'UPI',
      gatewayRef: 'REFUND-2026-AAAA'
    });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error, 'Conflict');
    assert.strictEqual(body.reason, 'This booking has already been refunded.');

    // Ensure no additional refund transaction was created
    const refunds = inMemoryTransactions.filter(
      (t) => String(t.bookingId) === String(booking._id) && t.type === 'Refund'
    );
    assert.strictEqual(refunds.length, 1);

    // Ensure booking status was not altered for rejected attempt
    const bookingInDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.strictEqual(bookingInDb.status, 'Confirmed');
  });

  // 14. No refund transaction is created for unpaid booking
  test('14. No refund transaction is created for unpaid booking', async () => {
    const booking = createMockBooking();

    await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(inMemoryTransactions.length, 0);
  });

  // 15. Successful cancellation does not create any additional Charge
  test('15. Successful cancellation does not create any additional Charge', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);

    const initialCharges = inMemoryTransactions.filter((t) => t.type === 'Charge').length;

    await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const postCharges = inMemoryTransactions.filter((t) => t.type === 'Charge').length;
    assert.strictEqual(initialCharges, postCharges);
  });

  // 16. Existing booking data remains intact after cancellation
  test('16. Existing booking data remains intact after cancellation', async () => {
    const booking = createMockBooking({
      resourceId: 'res-custom-99',
      resourceTitle: 'Grand Ballroom Venue',
      hostBusiness: 'Heritage Hotel Co.',
      seekerBusiness: 'Elite Events',
      seekerFullName: 'Ananya Verma',
      seekerEmail: 'ananya@eliteevents.com',
      seekerPhone: '+91 91234 56789',
      requestedDate: '2026-11-20',
      startTime: '10:00',
      endTime: '18:00',
      rate: 5000,
      rateUnit: 'hour',
      duration: 8,
      billedUnits: 8,
      subtotal: 40000,
      total: 40000,
      currency: 'INR'
    });
    createMockCharge(booking._id, { amount: 40000 });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 200);
    const updated = inMemoryBookings.find((b) => String(b._id) === String(booking._id));

    assert.strictEqual(updated.status, 'Cancelled');
    assert.strictEqual(updated.bookingNumber, booking.bookingNumber);
    assert.strictEqual(String(updated.requestId), String(booking.requestId));
    assert.strictEqual(updated.resourceId, 'res-custom-99');
    assert.strictEqual(updated.resourceTitle, 'Grand Ballroom Venue');
    assert.strictEqual(updated.hostBusiness, 'Heritage Hotel Co.');
    assert.strictEqual(updated.seekerBusiness, 'Elite Events');
    assert.strictEqual(updated.seekerFullName, 'Ananya Verma');
    assert.strictEqual(updated.seekerEmail, 'ananya@eliteevents.com');
    assert.strictEqual(updated.seekerPhone, '+91 91234 56789');
    assert.strictEqual(updated.requestedDate, '2026-11-20');
    assert.strictEqual(updated.startTime, '10:00');
    assert.strictEqual(updated.endTime, '18:00');
    assert.strictEqual(updated.rate, 5000);
    assert.strictEqual(updated.rateUnit, 'hour');
    assert.strictEqual(updated.duration, 8);
    assert.strictEqual(updated.billedUnits, 8);
    assert.strictEqual(updated.subtotal, 40000);
    assert.strictEqual(updated.total, 40000);
    assert.strictEqual(updated.currency, 'INR');
  });

  // 17. Unrelated Request data is not altered by cancellation
  test('17. Cancellation does not alter unrelated or linked Request data', async () => {
    const linkedRequest = createMockRequest({ status: 'Accepted' });
    const unrelatedRequest = createMockRequest({
      status: 'Pending',
      fullName: 'Vikram Singh',
      businessName: 'Spice Route Catering'
    });

    const booking = createMockBooking({ requestId: linkedRequest._id });
    linkedRequest.bookingId = booking._id;

    await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const linkedInDb = inMemoryRequests.find((r) => String(r._id) === String(linkedRequest._id));
    assert.strictEqual(linkedInDb.status, 'Accepted');
    assert.strictEqual(String(linkedInDb.bookingId), String(booking._id));

    const unrelatedInDb = inMemoryRequests.find((r) => String(r._id) === String(unrelatedRequest._id));
    assert.strictEqual(unrelatedInDb.status, 'Pending');
    assert.strictEqual(unrelatedInDb.fullName, 'Vikram Singh');
    assert.strictEqual(unrelatedInDb.businessName, 'Spice Route Catering');
  });

  // 18. Gateway reference follows REFUND-YYYY-XXXX format
  test('18. Gateway reference for refund follows REFUND-YYYY-XXXX format', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    const body = await res.json();
    assert.ok(body.refund);
    assert.match(body.refund.gatewayRef, /^REFUND-\d{4}-[A-Z0-9]{4}$/);
    assert.match(body.refund.transactionNumber, /^TXN-\d{4}-[A-Z0-9]{4}$/);
  });

  // 19. Booking with only Failed Charge cancels as unpaid without refund
  test('19. Booking with only Failed Charge cancels as unpaid without refund', async () => {
    const booking = createMockBooking();
    inMemoryTransactions.push({
      _id: new mongoose.Types.ObjectId(),
      transactionNumber: 'TXN-2026-FAIL',
      bookingId: booking._id,
      type: 'Charge',
      amount: 12600,
      currency: 'INR',
      status: 'Failed',
      paymentMethod: 'UPI'
    });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/cancel`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.booking.status, 'Cancelled');
    assert.strictEqual(body.refund, null);

    const refunds = inMemoryTransactions.filter((t) => t.type === 'Refund');
    assert.strictEqual(refunds.length, 0);
  });
});
