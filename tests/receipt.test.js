import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Booking = require('../server/models/Booking.js');
const Transaction = require('../server/models/Transaction.js');
const app = require('../server/server.js');
const {
  deriveReceiptNumber,
  deriveIssueDate,
  buildReceipt
} = require('../server/utils/receipt.js');

describe('Phase 14.7 — Receipts / Invoicing API', () => {
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
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      ...overrides
    };
    inMemoryTransactions.push(charge);
    return charge;
  }

  // 1. Invalid booking ID -> 400
  test('1. Invalid booking ID format returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/invalid-booking-id/receipt`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid booking ID format');
  });

  // 2. Non-existent booking -> 404
  test('2. Non-existent booking returns 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/api/bookings/${nonExistentId}/receipt`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error, 'Booking not found');
  });

  // 3. Unpaid booking -> 400
  test('3. Unpaid booking returns 400 with payment-required error', async () => {
    const booking = createMockBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Receipt unavailable');
    assert.strictEqual(body.reason, 'No successful payment found for this booking.');
  });

  // 4. Booking with failed Charge only -> 400
  test('4. Booking with failed Charge only returns 400', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { status: 'Failed' });
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Receipt unavailable');
  });

  // 5. Paid confirmed booking -> 200
  test('5. Paid confirmed booking returns 200 with structured receipt', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);
    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.receipt);
  });

  // 6. Successful Charge is used
  test('6. Successful Charge is used for receipt data', async () => {
    const booking = createMockBooking();
    // Failed charge first
    createMockCharge(booking._id, { transactionNumber: 'TXN-2026-FAIL', status: 'Failed' });
    // Successful charge
    createMockCharge(booking._id, { transactionNumber: 'TXN-2026-SUCC', status: 'Success' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.transactionNumber, 'TXN-2026-SUCC');
  });

  // 7. Receipt number is present
  test('7. Receipt number is present and formatted as RCPT-YYYY-XXXX', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { transactionNumber: 'TXN-2026-ABCD' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.receiptNumber, 'RCPT-2026-ABCD');
  });

  // 8. Receipt number is stable across repeated calls
  test('8. Receipt number is stable across repeated calls', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { transactionNumber: 'TXN-2026-STBL' });

    const res1 = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body2 = await res2.json();

    assert.strictEqual(body1.receipt.receiptNumber, body2.receipt.receiptNumber);
    assert.strictEqual(body1.receipt.receiptNumber, 'RCPT-2026-STBL');
  });

  // 9. Issue date is derived from payment transaction timestamp
  test('9. Issue date is derived from payment transaction timestamp', async () => {
    const paymentTimestamp = new Date('2026-10-02T15:30:00.000Z');
    const booking = createMockBooking();
    createMockCharge(booking._id, { createdAt: paymentTimestamp });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.issueDate, paymentTimestamp.toISOString());
  });

  // 10. Booking number is present
  test('10. Booking number is present in receipt', async () => {
    const booking = createMockBooking({ bookingNumber: 'BK-2026-NUMB' });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.bookingNumber, 'BK-2026-NUMB');
  });

  // 11. Transaction number is present
  test('11. Transaction number is present in receipt', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { transactionNumber: 'TXN-2026-9999' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.transactionNumber, 'TXN-2026-9999');
  });

  // 12. Payment status is Paid
  test('12. Payment status is Paid', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.paymentStatus, 'Paid');
  });

  // 13. Payment method matches successful Charge
  test('13. Payment method matches successful Charge', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id, { paymentMethod: 'NetBanking' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.paymentMethod, 'NetBanking');
  });

  // 14. Currency is correct
  test('14. Currency is correct in receipt', async () => {
    const booking = createMockBooking({ currency: 'INR' });
    createMockCharge(booking._id, { currency: 'INR' });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.currency, 'INR');
  });

  // 15. Resource information is correct
  test('15. Resource information is correct in receipt', async () => {
    const booking = createMockBooking({
      resourceId: 'res-custom-55',
      resourceTitle: 'Cold Prep Workstation'
    });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.resource.resourceId, 'res-custom-55');
    assert.strictEqual(body.receipt.resource.title, 'Cold Prep Workstation');
  });

  // 16. Host information is correct
  test('16. Host information is correct in receipt', async () => {
    const booking = createMockBooking({ hostBusiness: 'Olive Bar & Kitchen' });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.host.businessName, 'Olive Bar & Kitchen');
  });

  // 17. Seeker information is correct
  test('17. Seeker information is correct in receipt', async () => {
    const booking = createMockBooking({
      seekerFullName: 'Ananya Verma',
      seekerBusiness: 'Verma Patisserie',
      seekerEmail: 'ananya@verma.com',
      seekerPhone: '+91 99887 76655'
    });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.seeker.fullName, 'Ananya Verma');
    assert.strictEqual(body.receipt.seeker.businessName, 'Verma Patisserie');
    assert.strictEqual(body.receipt.seeker.email, 'ananya@verma.com');
    assert.strictEqual(body.receipt.seeker.phone, '+91 99887 76655');
  });

  // 18. Booking date/time information is correct
  test('18. Booking date/time information is correct in receipt', async () => {
    const booking = createMockBooking({
      requestedDate: '2026-11-10',
      startTime: '05:00',
      endTime: '12:00'
    });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.booking.date, '2026-11-10');
    assert.strictEqual(body.receipt.booking.startTime, '05:00');
    assert.strictEqual(body.receipt.booking.endTime, '12:00');
  });

  // 19. Duration/billedUnits are correct
  test('19. Duration/billedUnits are correct in receipt', async () => {
    const booking = createMockBooking({ duration: 6, billedUnits: 6 });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.booking.duration, 6);
    assert.strictEqual(body.receipt.booking.billedUnits, 6);
  });

  // 20. Pricing snapshot is correct
  test('20. Pricing snapshot is correct in receipt', async () => {
    const booking = createMockBooking({
      rate: 1500,
      rateUnit: 'hour',
      subtotal: 9000,
      total: 9000
    });
    createMockCharge(booking._id, { amount: 9000 });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.amounts.rate, 1500);
    assert.strictEqual(body.receipt.amounts.rateUnit, 'hour');
    assert.strictEqual(body.receipt.amounts.subtotal, 9000);
    assert.strictEqual(body.receipt.amounts.total, 9000);
  });

  // 21. Paid amount equals successful Charge amount
  test('21. Paid amount equals successful Charge amount', async () => {
    const booking = createMockBooking({ total: 10000 });
    createMockCharge(booking._id, { amount: 10000 });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.amounts.paidAmount, 10000);
  });

  // 22. Booking total remains separately represented if different
  test('22. Booking total remains separately represented if charge amount differs', async () => {
    const booking = createMockBooking({ total: 15000 });
    createMockCharge(booking._id, { amount: 12000 });

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const body = await res.json();
    assert.strictEqual(body.receipt.amounts.bookingTotal, 15000);
    assert.strictEqual(body.receipt.amounts.paidAmount, 12000);
  });

  // 23. No sensitive payment data is exposed
  test('23. No sensitive payment data is exposed in receipt', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    const raw = await res.text();
    assert.strictEqual(raw.includes('cvv'), false);
    assert.strictEqual(raw.includes('cardNumber'), false);
    assert.strictEqual(raw.includes('password'), false);
    assert.strictEqual(raw.includes('token'), false);
  });

  // 24. Cancelled paid booking can still produce the original payment receipt
  test('24. Cancelled paid booking can still produce the original payment receipt', async () => {
    const booking = createMockBooking({ status: 'Cancelled' });
    createMockCharge(booking._id);

    const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.receipt);
    assert.strictEqual(body.receipt.bookingNumber, booking.bookingNumber);
  });

  // 25. Receipt generation does not modify Booking
  test('25. Receipt generation does not modify Booking', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);
    const originalBookingSnapshot = JSON.parse(JSON.stringify(booking));

    await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);

    const inDb = inMemoryBookings.find((b) => String(b._id) === String(booking._id));
    assert.deepStrictEqual(inDb, originalBookingSnapshot);
  });

  // 26. Receipt generation does not create a new Transaction
  test('26. Receipt generation does not create a new Transaction', async () => {
    const booking = createMockBooking();
    createMockCharge(booking._id);
    const initialTxnCount = inMemoryTransactions.length;

    await fetch(`${baseUrl}/api/bookings/${booking._id}/receipt`);

    assert.strictEqual(inMemoryTransactions.length, initialTxnCount);
  });

  // 27. Utility unit tests
  describe('Receipt Utility Unit Tests', () => {
    test('deriveReceiptNumber handles standard TXN numbers and fallbacks', () => {
      assert.strictEqual(deriveReceiptNumber({ transactionNumber: 'TXN-2026-ABCD' }), 'RCPT-2026-ABCD');
      assert.strictEqual(deriveReceiptNumber({ transactionNumber: 'txn-2026-xyz1' }), 'RCPT-2026-XYZ1');
      assert.match(deriveReceiptNumber({ transactionNumber: 'OTHER-123' }), /^RCPT-\d{4}-[A-Z0-9]{4}$/);
      assert.strictEqual(deriveReceiptNumber(null), '');
    });

    test('deriveIssueDate handles createdAt and fallbacks', () => {
      const fixedDate = new Date('2026-10-01T12:00:00.000Z');
      assert.strictEqual(deriveIssueDate({ createdAt: fixedDate }), fixedDate.toISOString());
    });
  });
});
