import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Booking = require('../server/models/Booking.js');
const app = require('../server/server.js');
const {
  escapeIcsText,
  formatIcsDateTime,
  formatIcsUtcTimestamp,
  generateBookingIcs
} = require('../server/utils/calendar.js');

describe('Phase 14.6 — Calendar Integration API', () => {
  let server;
  let baseUrl;
  let inMemoryBookings = [];

  const origBookingFindById = Booking.findById;

  before(async () => {
    // Mock Booking.findById
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

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryBookings = [];
  });

  function createMockBooking(overrides = {}) {
    const id = new mongoose.Types.ObjectId().toString();
    const booking = {
      _id: id,
      bookingNumber: 'BK-2026-ABCD',
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

  // 1. Invalid booking ID -> 400
  test('1. Invalid booking ID format returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/invalid-booking-id/calendar`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking ID format');
  });

  // 2. Non-existent booking -> 404
  test('2. Non-existent booking returns 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/api/bookings/${nonExistentId}/calendar`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error, 'Booking not found');
  });

  // 3. Confirmed booking returns 200
  test('3. Confirmed booking returns 200', async () => {
    const booking = createMockBooking({ status: 'Confirmed' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    assert.strictEqual(res.status, 200);
  });

  // 4. Active booking returns 200
  test('4. Active booking returns 200', async () => {
    const booking = createMockBooking({ status: 'Active' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    assert.strictEqual(res.status, 200);
  });

  // 5. Completed booking returns 200
  test('5. Completed booking returns 200', async () => {
    const booking = createMockBooking({ status: 'Completed' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    assert.strictEqual(res.status, 200);
  });

  // 6. Cancelled booking returns 400
  test('6. Cancelled booking returns 400 with descriptive error', async () => {
    const booking = createMockBooking({ status: 'Cancelled' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking status');
    assert.ok(body.reason.includes('Cancelled bookings cannot be exported'));
  });

  // 7. Response Content-Type is text/calendar
  test('7. Response Content-Type is text/calendar; charset=utf-8', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('text/calendar'));
  });

  // 8. Response contains BEGIN:VCALENDAR
  test('8. Response contains BEGIN:VCALENDAR', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('BEGIN:VCALENDAR'));
  });

  // 9. Response contains VERSION:2.0
  test('9. Response contains VERSION:2.0', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('VERSION:2.0'));
  });

  // 10. Response contains BEGIN:VEVENT
  test('10. Response contains BEGIN:VEVENT', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('BEGIN:VEVENT'));
  });

  // 11. Response contains END:VEVENT
  test('11. Response contains END:VEVENT', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('END:VEVENT'));
  });

  // 12. Response contains END:VCALENDAR
  test('12. Response contains END:VCALENDAR', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('END:VCALENDAR'));
  });

  // 13. UID is present
  test('13. UID is present and stable', async () => {
    const booking = createMockBooking({ bookingNumber: 'BK-2026-XYZ9' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('UID:BK-2026-XYZ9@resshare.marketplace'));
  });

  // 14. DTSTAMP is present
  test('14. DTSTAMP is present in valid UTC format', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.match(text, /DTSTAMP:\d{8}T\d{6}Z/);
  });

  // 15. DTSTART is generated from booking date/start time
  test('15. DTSTART is generated from booking date and start time', async () => {
    const booking = createMockBooking({ requestedDate: '2026-10-15', startTime: '06:30' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('DTSTART:20261015T063000'));
  });

  // 16. DTEND is generated from booking date/end time
  test('16. DTEND is generated from booking date and end time', async () => {
    const booking = createMockBooking({ requestedDate: '2026-10-15', endTime: '14:45' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('DTEND:20261015T144500'));
  });

  // 17. SUMMARY contains relevant booking/resource information
  test('17. SUMMARY contains relevant booking and resource information', async () => {
    const booking = createMockBooking({
      resourceTitle: 'Rooftop Banquet Terrace',
      bookingNumber: 'BK-2026-ROOF'
    });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('SUMMARY:ResShare Booking: Rooftop Banquet Terrace (BK-2026-ROOF)'));
  });

  // 18. DESCRIPTION contains booking number
  test('18. DESCRIPTION contains booking number and details', async () => {
    const booking = createMockBooking({
      bookingNumber: 'BK-2026-DESC1',
      hostBusiness: 'Grand Heritage Hotel',
      seekerFullName: 'Priya Patel',
      seekerBusiness: 'Patel Catering'
    });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('DESCRIPTION:'));
    assert.ok(text.includes('Booking Number: BK-2026-DESC1'));
    assert.ok(text.includes('Host: Grand Heritage Hotel'));
    assert.ok(text.includes('Seeker: Priya Patel (Patel Catering)'));
  });

  // 19. Booking number appears in the download filename/header
  test('19. Booking number appears in Content-Disposition header', async () => {
    const booking = createMockBooking({ bookingNumber: 'BK-2026-FILE' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const disposition = res.headers.get('content-disposition');
    assert.strictEqual(disposition, 'attachment; filename="BK-2026-FILE.ics"');
  });

  // 20. Special characters are properly escaped
  test('20. Special characters are properly escaped in iCalendar text', async () => {
    const booking = createMockBooking({
      resourceTitle: 'Pastry Kitchen, Bakery & Cafe; Unit \\B',
      hostBusiness: 'Flour & Yeast, Ltd.; Special Ops'
    });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    // Commas, semicolons, and backslashes should be escaped with \
    assert.ok(text.includes('Pastry Kitchen\\, Bakery & Cafe\\; Unit \\\\B'));
    assert.ok(text.includes('Flour & Yeast\\, Ltd.\\; Special Ops'));
  });

  // 21. No sensitive payment information appears in the ICS
  test('21. No sensitive payment information appears in the ICS', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.strictEqual(text.includes('cardNumber'), false);
    assert.strictEqual(text.includes('cvv'), false);
    assert.strictEqual(text.includes('gatewayRef'), false);
    assert.strictEqual(text.includes('password'), false);
    assert.strictEqual(text.includes('token'), false);
  });

  // 22. Existing booking data remains unchanged
  test('22. Existing booking data remains unchanged in database after export', async () => {
    const booking = createMockBooking();
    const originalBookingSnapshot = JSON.parse(JSON.stringify(booking));

    await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);

    const inDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.deepStrictEqual(inDb, originalBookingSnapshot);
  });

  // 23. Location is included when resource location exists
  test('23. Location is included when resource has a location', async () => {
    // res-01 has location: 'Indiranagar, Bengaluru' in resources.js
    const booking = createMockBooking({ resourceId: 'res-01' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.ok(text.includes('LOCATION:Indiranagar\\, Bengaluru'));
  });

  // 24. Location is omitted when no location exists
  test('24. Location is omitted when resource has no location and none on booking', async () => {
    const booking = createMockBooking({ resourceId: 'res-nonexistent-999' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/calendar`);
    const text = await res.text();
    assert.strictEqual(text.includes('LOCATION:'), false);
  });

  // 25. Unit test utility functions directly
  describe('Calendar Utility Unit Tests', () => {
    test('escapeIcsText escapes backslashes, semicolons, commas, and newlines', () => {
      assert.strictEqual(escapeIcsText('Hello, World; test\\me\nnew line'), 'Hello\\, World\\; test\\\\me\\nnew line');
      assert.strictEqual(escapeIcsText(''), '');
      assert.strictEqual(escapeIcsText(null), '');
      assert.strictEqual(escapeIcsText(undefined), '');
    });

    test('formatIcsDateTime formats date and time into local floating format', () => {
      assert.strictEqual(formatIcsDateTime('2026-10-05', '04:00'), '20261005T040000');
      assert.strictEqual(formatIcsDateTime('2026-12-31', '23:59'), '20261231T235900');
      assert.strictEqual(formatIcsDateTime('', '04:00'), '');
      assert.strictEqual(formatIcsDateTime('2026-10-05', ''), '');
    });

    test('formatIcsUtcTimestamp formats UTC dates with trailing Z', () => {
      const fixedDate = new Date(Date.UTC(2026, 9, 5, 14, 30, 0));
      assert.strictEqual(formatIcsUtcTimestamp(fixedDate), '20261005T143000Z');
    });

    test('generateBookingIcs produces RFC 5545 compliant document with CRLF', () => {
      const mockBooking = {
        _id: '507f1f77bcf86cd799439011',
        bookingNumber: 'BK-2026-TEST',
        resourceTitle: 'Pastry Kitchen',
        requestedDate: '2026-10-05',
        startTime: '04:00',
        endTime: '11:00',
        status: 'Confirmed'
      };
      const ics = generateBookingIcs(mockBooking, null, new Date(Date.UTC(2026, 9, 5, 0, 0, 0)));
      assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
      assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
      assert.ok(ics.includes('PRODID:-//HospitalityResourceMarketplace//Booking Calendar//EN\r\n'));
      assert.ok(ics.includes('CALSCALE:GREGORIAN\r\n'));
      assert.ok(ics.includes('METHOD:PUBLISH\r\n'));
      assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
      assert.ok(ics.includes('UID:BK-2026-TEST@resshare.marketplace\r\n'));
      assert.ok(ics.includes('DTSTAMP:20261005T000000Z\r\n'));
      assert.ok(ics.includes('DTSTART:20261005T040000\r\n'));
      assert.ok(ics.includes('DTEND:20261005T110000\r\n'));
      assert.ok(ics.includes('END:VEVENT\r\n'));
    });
  });
});
