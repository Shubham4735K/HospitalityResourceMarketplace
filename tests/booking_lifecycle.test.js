import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const Notification = require('../server/models/Notification.js');
const app = require('../server/server.js');

describe('Phase 14.1 — Booking Lifecycle Tests', () => {
  let server;
  let baseUrl;
  let inMemoryStore = [];
  let inMemoryNotifications = [];

  const origFind = Request.find;
  const origFindById = Request.findById;
  const origSave = Request.prototype.save;
  const origNotifSave = Notification.prototype.save;

  before(async () => {
    Request.find = async function (filter = {}) {
      return inMemoryStore.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status) {
          if (typeof filter.status === 'object' && Array.isArray(filter.status.$in)) {
            if (!filter.status.$in.includes(item.status)) return false;
          } else if (item.status !== filter.status) {
            return false;
          }
        }
        if (filter._id && filter._id.$ne && item._id === filter._id.$ne) return false;
        return true;
      });
    };

    Request.findById = async function (id) {
      const found = inMemoryStore.find((item) => item._id === id);
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryStore.findIndex((i) => i._id === id);
          if (idx !== -1) {
            inMemoryStore[idx] = { ...this };
          }
          return this;
        }
      };
    };

    Request.prototype.save = async function () {
      const doc = {
        _id: this._id || 'mock-req-' + Math.random().toString(36).substring(2, 9),
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
        providerNotes: this.providerNotes !== undefined ? this.providerNotes : '',
        counterProposal: this.counterProposal || null
      };
      inMemoryStore.push(doc);
      return doc;
    };

    Notification.prototype.save = async function () {
      const doc = {
        _id: 'mock-notif-' + Math.random().toString(36).substring(2, 9),
        recipient: this.recipient,
        recipientRole: this.recipientRole,
        title: this.title,
        message: this.message,
        requestId: this.requestId,
        resourceTitle: this.resourceTitle,
        read: false,
        createdAt: new Date()
      };
      inMemoryNotifications.push(doc);
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
    Request.find = origFind;
    Request.findById = origFindById;
    Request.prototype.save = origSave;
    Notification.prototype.save = origNotifSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryStore = [];
    inMemoryNotifications = [];
  });

  describe('1. Happy Path Lifecycle (Pending -> Accepted -> Confirmed -> Completed)', () => {
    test('transitions through full lifecycle cleanly', async () => {
      // 1. Seed a Pending request for a valid future date
      inMemoryStore.push({
        _id: 'req-lifecycle-1',
        resourceId: 'res-01', // Bakery: available Mon-Fri
        resourceTitle: 'Bakery',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05', // Monday in the future
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending',
        providerNotes: ''
      });

      // Provider accepts
      const acceptRes = await fetch(`${baseUrl}/api/requests/req-lifecycle-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted', providerNotes: 'Approved for kitchen use.' })
      });
      assert.strictEqual(acceptRes.status, 200);
      const acceptedData = await acceptRes.json();
      assert.strictEqual(acceptedData.status, 'Accepted');
      assert.strictEqual(acceptedData.providerNotes, 'Approved for kitchen use.');
      assert.strictEqual(inMemoryStore[0].status, 'Accepted');

      // Seeker confirms
      const confirmRes = await fetch(`${baseUrl}/api/requests/req-lifecycle-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });
      assert.strictEqual(confirmRes.status, 200);
      const confirmedData = await confirmRes.json();
      assert.strictEqual(confirmedData.status, 'Confirmed');
      assert.strictEqual(confirmedData.providerNotes, 'Approved for kitchen use.'); // preserved
      assert.strictEqual(inMemoryStore[0].status, 'Confirmed');

      // Provider confirms notification was created
      const confirmNotif = inMemoryNotifications.find((n) => n.title === 'Booking Confirmed');
      assert.ok(confirmNotif);
      assert.strictEqual(confirmNotif.recipientRole, 'provider');

      // Now simulate date having passed: update requestedDate to a past date
      inMemoryStore[0].requestedDate = '2020-01-06';

      // Mark Completed (date has passed)
      const completeRes = await fetch(`${baseUrl}/api/requests/req-lifecycle-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      assert.strictEqual(completeRes.status, 200);
      const completedData = await completeRes.json();
      assert.strictEqual(completedData.status, 'Completed');
      assert.strictEqual(inMemoryStore[0].status, 'Completed');

      // Seeker notification for completion
      const completeNotif = inMemoryNotifications.find((n) => n.title === 'Booking Completed');
      assert.ok(completeNotif);
      assert.strictEqual(completeNotif.recipientRole, 'seeker');
    });
  });

  describe('2. Confirmation Availability & Conflict Validation', () => {
    test('confirmation fails with 409 if another booking is already Accepted on same date', async () => {
      // Seed conflicting Accepted booking
      inMemoryStore.push({
        _id: 'conflict-accepted',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Accepted'
      });

      // Target Accepted request to confirm
      inMemoryStore.push({
        _id: 'target-to-confirm',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests/target-to-confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /already booked/i);
      // Status remains Accepted
      assert.strictEqual(inMemoryStore[1].status, 'Accepted');
    });

    test('confirmation fails with 409 if another booking is already Confirmed on same date', async () => {
      // Seed conflicting Confirmed booking
      inMemoryStore.push({
        _id: 'conflict-confirmed',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Confirmed'
      });

      // Target Accepted request to confirm
      inMemoryStore.push({
        _id: 'target-to-confirm-2',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests/target-to-confirm-2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /already booked/i);
    });

    test('confirmation fails with 409 if resource is not available on scheduled day', async () => {
      // res-01 is available Mon-Fri (isoDay 1-5). 2026-10-11 is Sunday (isoDay 7)
      inMemoryStore.push({
        _id: 'target-sunday',
        resourceId: 'res-01',
        requestedDate: '2026-10-11',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests/target-sunday`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /not available on Sundays/i);
    });
  });

  describe('3. Completed Date Validation', () => {
    test('marking completed fails with 400 if booking date is in the future', async () => {
      inMemoryStore.push({
        _id: 'confirmed-future',
        resourceId: 'res-01',
        requestedDate: '2099-12-31',
        status: 'Confirmed'
      });

      const res = await fetch(`${baseUrl}/api/requests/confirmed-future`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /after the requested booking date has passed/i);
      assert.strictEqual(inMemoryStore[0].status, 'Confirmed');
    });

    test('marking completed fails with 400 if request is not Confirmed', async () => {
      inMemoryStore.push({
        _id: 'pending-past',
        resourceId: 'res-01',
        requestedDate: '2020-01-06',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/pending-past`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /invalid status transition/i);
    });
  });

  describe('4. Cancellation Transitions', () => {
    test('Pending request can be Cancelled', async () => {
      inMemoryStore.push({
        _id: 'pending-to-cancel',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/pending-to-cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Cancelled');
      assert.strictEqual(inMemoryStore[0].status, 'Cancelled');
    });

    test('Accepted request can be Cancelled', async () => {
      inMemoryStore.push({
        _id: 'accepted-to-cancel',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests/accepted-to-cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Cancelled');
      assert.strictEqual(inMemoryStore[0].status, 'Cancelled');
    });

    test('Confirmed booking can be Cancelled', async () => {
      inMemoryStore.push({
        _id: 'confirmed-to-cancel',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Confirmed'
      });

      const res = await fetch(`${baseUrl}/api/requests/confirmed-to-cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Cancelled');
      assert.strictEqual(inMemoryStore[0].status, 'Cancelled');
    });
  });

  describe('5. Terminal States Immutability (Rejected, Cancelled, Completed)', () => {
    test('Rejected request cannot be modified', async () => {
      inMemoryStore.push({
        _id: 'term-rejected',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Rejected'
      });

      const res = await fetch(`${baseUrl}/api/requests/term-rejected`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot modify a request that is already Rejected/i);
    });

    test('Cancelled request cannot be modified', async () => {
      inMemoryStore.push({
        _id: 'term-cancelled',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Cancelled'
      });

      const res = await fetch(`${baseUrl}/api/requests/term-cancelled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot modify a request that is already Cancelled/i);
    });

    test('Completed request cannot be modified', async () => {
      inMemoryStore.push({
        _id: 'term-completed',
        resourceId: 'res-01',
        requestedDate: '2020-01-06',
        status: 'Completed'
      });

      const res = await fetch(`${baseUrl}/api/requests/term-completed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot modify a request that is already Completed/i);
    });
  });

  describe('6. Invalid Transitions', () => {
    test('Pending cannot transition directly to Confirmed', async () => {
      inMemoryStore.push({
        _id: 'pending-invalid',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/pending-invalid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot be transitioned directly to Confirmed/i);
    });

    test('Confirmed cannot transition back to Accepted or Rejected', async () => {
      inMemoryStore.push({
        _id: 'confirmed-invalid',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Confirmed'
      });

      const res = await fetch(`${baseUrl}/api/requests/confirmed-invalid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot modify a Confirmed booking to Accepted/i);
    });
  });

  describe('7. Counter-Offered Lifecycle Integration', () => {
    test('Counter-offer accepted -> Accepted -> Confirmed', async () => {
      inMemoryStore.push({
        _id: 'cp-lifecycle',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Counter-Offered',
        providerNotes: 'Initial note',
        counterProposal: {
          date: '2026-10-07', // Wednesday (available on res-01)
          notes: 'Alternative date'
        }
      });

      // Seeker accepts counter-offer
      const acceptRes = await fetch(`${baseUrl}/api/requests/cp-lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });
      assert.strictEqual(acceptRes.status, 200);
      const acceptedData = await acceptRes.json();
      assert.strictEqual(acceptedData.status, 'Accepted');
      assert.strictEqual(acceptedData.requestedDate, '2026-10-07');
      assert.strictEqual(acceptedData.providerNotes, 'Initial note');
      assert.deepStrictEqual(acceptedData.counterProposal, {
        date: '2026-10-07',
        notes: 'Alternative date'
      });

      // Seeker confirms booking
      const confirmRes = await fetch(`${baseUrl}/api/requests/cp-lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' })
      });
      assert.strictEqual(confirmRes.status, 200);
      const confirmedData = await confirmRes.json();
      assert.strictEqual(confirmedData.status, 'Confirmed');
      assert.strictEqual(confirmedData.requestedDate, '2026-10-07');
      assert.strictEqual(confirmedData.providerNotes, 'Initial note');
    });
  });
});
