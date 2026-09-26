import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Request = require('../server/models/Request.js');
const Booking = require('../server/models/Booking.js');
const app = require('../server/server.js');

describe('Phase 14.3 — Booking Confirmation & Conflict Locking API', () => {
  let server;
  let baseUrl;
  let inMemoryRequests = [];
  let inMemoryBookings = [];

  const origRequestFind = Request.find;
  const origRequestFindById = Request.findById;
  const origRequestSave = Request.prototype.save;

  const origBookingFind = Booking.find;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origBookingSave = Booking.prototype.save;

  before(async () => {
    // Mock Request Mongoose methods
    Request.find = async function (filter = {}) {
      return inMemoryRequests.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status && item.status !== filter.status) return false;
        if (filter._id && filter._id.$ne && String(item._id) === String(filter._id.$ne)) return false;
        return true;
      });
    };

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
      const existingIdx = inMemoryRequests.findIndex((i) => String(i._id) === String(doc._id));
      if (existingIdx !== -1) {
        inMemoryRequests[existingIdx] = doc;
      } else {
        inMemoryRequests.push(doc);
      }
      return doc;
    };

    // Mock Booking Mongoose methods
    Booking.find = async function (filter = {}) {
      return inMemoryBookings.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status && filter.status.$in) {
          if (!filter.status.$in.includes(item.status)) return false;
        } else if (filter.status && item.status !== filter.status) {
          return false;
        }
        return true;
      });
    };

    Booking.findOne = async function (filter = {}) {
      return (
        inMemoryBookings.find((item) => {
          if (filter.requestId && String(item.requestId) === String(filter.requestId)) return true;
          if (filter.bookingNumber && item.bookingNumber === filter.bookingNumber) return true;
          return false;
        }) || null
      );
    };

    Booking.findById = async function (id) {
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

    Booking.prototype.save = async function () {
      const doc = {
        _id: this._id || new mongoose.Types.ObjectId(),
        bookingNumber: this.bookingNumber,
        requestId: this.requestId,
        resourceId: this.resourceId,
        resourceTitle: this.resourceTitle,
        hostBusiness: this.hostBusiness,
        seekerBusiness: this.seekerBusiness,
        seekerFullName: this.seekerFullName,
        seekerEmail: this.seekerEmail,
        seekerPhone: this.seekerPhone,
        requestedDate: this.requestedDate,
        startTime: this.startTime,
        endTime: this.endTime,
        rate: this.rate,
        rateUnit: this.rateUnit,
        duration: this.duration,
        billedUnits: this.billedUnits,
        subtotal: this.subtotal,
        total: this.total,
        currency: this.currency,
        status: this.status || 'Confirmed'
      };
      const existingIdx = inMemoryBookings.findIndex((i) => String(i._id) === String(doc._id));
      if (existingIdx !== -1) {
        inMemoryBookings[existingIdx] = doc;
      } else {
        inMemoryBookings.push(doc);
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
    Request.find = origRequestFind;
    Request.findById = origRequestFindById;
    Request.prototype.save = origRequestSave;

    Booking.find = origBookingFind;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Booking.prototype.save = origBookingSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryRequests = [];
    inMemoryBookings = [];
  });

  function createMockRequestId() {
    return new mongoose.Types.ObjectId().toString();
  }

  test('Accepted request can be confirmed into a Booking', async () => {
    const reqId = createMockRequestId();
    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      fullName: 'Rahul Sharma',
      businessName: 'Sweet Treats Cafe',
      email: 'rahul@sweettreats.com',
      phone: '+91 98765 43210',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.booking);
    assert.match(body.booking.bookingNumber, /^BK-\d{4}-[A-Z0-9]{4}$/);
    assert.strictEqual(body.booking.status, 'Confirmed');
    assert.strictEqual(String(body.booking.requestId), reqId);
    assert.strictEqual(body.booking.resourceId, 'res-01');
    assert.strictEqual(body.booking.seekerBusiness, 'Sweet Treats Cafe');
    assert.strictEqual(inMemoryBookings.length, 1);
  });

  test('Pending request cannot be confirmed', async () => {
    const reqId = createMockRequestId();
    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Pending',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /only accepted requests can be confirmed/i);
    assert.strictEqual(inMemoryBookings.length, 0);
  });

  test('Rejected request cannot be confirmed', async () => {
    const reqId = createMockRequestId();
    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Rejected',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.reason, /only accepted requests can be confirmed/i);
    assert.strictEqual(inMemoryBookings.length, 0);
  });

  test('invalid request ID returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/requests/invalid-mongo-id-123/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /invalid request id format/i);
  });

  test('nonexistent request returns 404', async () => {
    const nonExistentId = createMockRequestId();
    const res = await fetch(`${baseUrl}/api/requests/${nonExistentId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /request not found/i);
  });

  test('request with existing bookingId cannot create another Booking (HTTP 409)', async () => {
    const reqId = createMockRequestId();
    const existingBookingId = createMockRequestId();

    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: existingBookingId
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.match(body.reason, /already been confirmed/i);
    assert.strictEqual(inMemoryBookings.length, 0);
  });

  test('overlapping Accepted Request blocks confirmation (HTTP 409)', async () => {
    const reqAId = createMockRequestId();
    const reqBId = createMockRequestId();

    // Request A is already Accepted for 05:00 to 08:00
    inMemoryRequests.push({
      _id: reqAId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '05:00',
      endTime: '08:00',
      status: 'Accepted',
      bookingId: null
    });

    // Request B is Accepted for 07:00 to 10:00 (overlaps A)
    inMemoryRequests.push({
      _id: reqBId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '07:00',
      endTime: '10:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqBId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.match(body.reason, /overlaps with another accepted request/i);
    assert.strictEqual(inMemoryBookings.length, 0);
  });

  test('overlapping Confirmed Booking blocks confirmation (HTTP 409)', async () => {
    const existingBookingId = createMockRequestId();
    const otherReqId = createMockRequestId();
    const currentReqId = createMockRequestId();

    // Existing confirmed booking on res-01 for 04:00 to 08:00
    inMemoryBookings.push({
      _id: existingBookingId,
      requestId: otherReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '08:00',
      status: 'Confirmed'
    });

    // Request trying to confirm 06:00 to 10:00 (overlaps)
    inMemoryRequests.push({
      _id: currentReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '06:00',
      endTime: '10:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${currentReqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.match(body.reason, /overlaps with an existing confirmed booking/i);
    assert.strictEqual(inMemoryBookings.length, 1);
  });

  test('overlapping Active Booking blocks confirmation (HTTP 409)', async () => {
    const activeBookingId = createMockRequestId();
    const otherReqId = createMockRequestId();
    const currentReqId = createMockRequestId();

    // Active booking in progress on res-01 for 04:00 to 08:00
    inMemoryBookings.push({
      _id: activeBookingId,
      requestId: otherReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '08:00',
      status: 'Active'
    });

    // Request trying to confirm 07:00 to 09:00 (overlaps Active)
    inMemoryRequests.push({
      _id: currentReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '07:00',
      endTime: '09:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${currentReqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.match(body.reason, /overlaps with an existing confirmed booking/i);
    assert.strictEqual(inMemoryBookings.length, 1);
  });

  test('Cancelled Booking does not block confirmation', async () => {
    const cancelledBookingId = createMockRequestId();
    const otherReqId = createMockRequestId();
    const currentReqId = createMockRequestId();

    // Cancelled booking on res-01 for 04:00 to 11:00
    inMemoryBookings.push({
      _id: cancelledBookingId,
      requestId: otherReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Cancelled'
    });

    // New accepted request for the same slot
    inMemoryRequests.push({
      _id: currentReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${currentReqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(inMemoryBookings.length, 2);
  });

  test('Completed Booking does not block confirmation', async () => {
    const completedBookingId = createMockRequestId();
    const otherReqId = createMockRequestId();
    const currentReqId = createMockRequestId();

    // Completed booking on res-01
    inMemoryBookings.push({
      _id: completedBookingId,
      requestId: otherReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Completed'
    });

    // New accepted request for the same slot
    inMemoryRequests.push({
      _id: currentReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${currentReqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(inMemoryBookings.length, 2);
  });

  test('pricing snapshot is correctly stored in created Booking', async () => {
    const reqId = createMockRequestId();

    // res-01 has rate: 1800, rateUnit: "hour"
    // 04:00 to 11:00 = 7 hours -> subtotal = 12600, total = 12600
    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    const booking = body.booking;

    assert.strictEqual(booking.rate, 1800);
    assert.strictEqual(booking.rateUnit, 'hour');
    assert.strictEqual(booking.duration, 7);
    assert.strictEqual(booking.billedUnits, 7);
    assert.strictEqual(booking.subtotal, 12600);
    assert.strictEqual(booking.total, 12600);
    assert.strictEqual(booking.currency, 'INR');

    // Also verify pricing summary returned in API response
    assert.strictEqual(body.pricing.subtotal, 12600);
    assert.strictEqual(body.pricing.total, 12600);
  });

  test('Request.bookingId is linked and status remains Accepted after confirmation', async () => {
    const reqId = createMockRequestId();

    inMemoryRequests.push({
      _id: reqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '04:00',
      endTime: '11:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${reqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();

    const storedRequest = inMemoryRequests.find((r) => String(r._id) === reqId);
    assert.ok(storedRequest.bookingId, 'Request should have bookingId populated');
    assert.strictEqual(String(storedRequest.bookingId), String(body.booking._id));
    assert.strictEqual(storedRequest.status, 'Accepted', 'Request status must remain Accepted');
  });

  test('adjacent bookings such as 10:00–12:00 and 12:00–14:00 do not conflict', async () => {
    const existingBookingId = createMockRequestId();
    const otherReqId = createMockRequestId();
    const currentReqId = createMockRequestId();

    // Confirmed booking 10:00 to 12:00
    inMemoryBookings.push({
      _id: existingBookingId,
      requestId: otherReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '10:00',
      endTime: '12:00',
      status: 'Confirmed'
    });

    // Request immediately following at 12:00 to 14:00
    inMemoryRequests.push({
      _id: currentReqId,
      resourceId: 'res-01',
      requestedDate: '2026-10-05',
      startTime: '12:00',
      endTime: '14:00',
      status: 'Accepted',
      bookingId: null
    });

    const res = await fetch(`${baseUrl}/api/requests/${currentReqId}/confirm`, {
      method: 'POST'
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(inMemoryBookings.length, 2);
  });
});
