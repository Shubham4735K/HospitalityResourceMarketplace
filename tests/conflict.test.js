import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hasTimeOverlap, parseTimeToMinutes } = require('../server/utils/conflict.js');
const Request = require('../server/models/Request.js');
const app = require('../server/server.js');

describe('Phase 9.4 — Time Overlap Utility (hasTimeOverlap)', () => {
  test('partial overlap (starts before, ends inside)', () => {
    // A: 10:00–12:00, B: 11:00–13:00
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '11:00', '13:00'), true);
  });

  test('partial overlap (starts inside, ends after)', () => {
    // A: 11:00–13:00, B: 10:00–12:00
    assert.strictEqual(hasTimeOverlap('11:00', '13:00', '10:00', '12:00'), true);
  });

  test('enclosing overlap (A encompasses B)', () => {
    // A: 09:00–15:00, B: 10:00–12:00
    assert.strictEqual(hasTimeOverlap('09:00', '15:00', '10:00', '12:00'), true);
  });

  test('contained overlap (A inside B)', () => {
    // A: 10:00–12:00, B: 09:00–15:00
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '09:00', '15:00'), true);
  });

  test('exact same slot', () => {
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '10:00', '12:00'), true);
  });

  test('adjacent slots (consecutive back-to-back do NOT conflict)', () => {
    // 10:00–12:00 followed immediately by 12:00–14:00
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '12:00', '14:00'), false);
    // 12:00–14:00 preceded immediately by 10:00–12:00
    assert.strictEqual(hasTimeOverlap('12:00', '14:00', '10:00', '12:00'), false);
  });

  test('full day 23:59 representation overlap', () => {
    // 00:00–23:59 covers entire day, so 09:00–17:00 must conflict
    assert.strictEqual(hasTimeOverlap('00:00', '23:59', '09:00', '17:00'), true);
    assert.strictEqual(hasTimeOverlap('09:00', '17:00', '00:00', '23:59'), true);
  });

  test('invalid or missing time inputs safely return false', () => {
    assert.strictEqual(hasTimeOverlap(null, '12:00', '10:00', '12:00'), false);
    assert.strictEqual(hasTimeOverlap('10:00', 'invalid', '10:00', '12:00'), false);
    assert.strictEqual(hasTimeOverlap('25:00', '12:00', '10:00', '12:00'), false);
  });
});

describe('Phase 9.4 — Backend Request Conflict Detection API', () => {
  let server;
  let baseUrl;
  let inMemoryStore = [];

  // Save original Mongoose methods to restore after tests
  const origFind = Request.find;
  const origFindById = Request.findById;
  const origSave = Request.prototype.save;

  before(async () => {
    // Mock Mongoose methods with in-memory store (zero touch on production MongoDB)
    Request.find = async function (filter = {}) {
      return inMemoryStore.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status && item.status !== filter.status) return false;
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
        _id: 'mock-id-' + Math.random().toString(36).substring(2, 9),
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
        status: this.status || 'Pending'
      };
      inMemoryStore.push(doc);
      return doc;
    };

    // Start server on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Restore original Mongoose methods
    Request.find = origFind;
    Request.findById = origFindById;
    Request.prototype.save = origSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryStore = [];
  });

  describe('A. POST /api/requests conflict behavior', () => {
    test('succeeds when no existing booking exists', async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Alice',
          businessName: 'Bakery A',
          email: 'alice@test.com',
          phone: '+91 99999 99999',
          requestedDate: '2026-10-05',
          startTime: '05:00',
          endTime: '08:00'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.status, 'Pending');
      assert.strictEqual(inMemoryStore.length, 1);
    });

    test('returns 409 Conflict when overlapping an Accepted booking', async () => {
      // Seed an Accepted booking from 06:00 to 09:00
      inMemoryStore.push({
        _id: 'accepted-1',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      // Attempt to book 07:00 to 10:00 on same resource & date
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Bob',
          businessName: 'Bakery B',
          email: 'bob@test.com',
          phone: '+91 88888 88888',
          requestedDate: '2026-10-05',
          startTime: '07:00',
          endTime: '10:00'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /already booked/i);
      // Ensure no new request was added
      assert.strictEqual(inMemoryStore.length, 1);
    });

    test('succeeds when Accepted booking is on a different date', async () => {
      inMemoryStore.push({
        _id: 'accepted-other-day',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-06',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Charlie',
          businessName: 'Bakery C',
          email: 'charlie@test.com',
          phone: '+91 77777 77777',
          requestedDate: '2026-10-05',
          startTime: '06:00',
          endTime: '09:00'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(inMemoryStore.length, 2);
    });

    test('succeeds for adjacent booking (10:00–12:00 followed by 12:00–14:00)', async () => {
      inMemoryStore.push({
        _id: 'accepted-morning',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-05',
        startTime: '10:00',
        endTime: '12:00',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Dave',
          businessName: 'Bakery D',
          email: 'dave@test.com',
          phone: '+91 66666 66666',
          requestedDate: '2026-10-05',
          startTime: '12:00',
          endTime: '14:00'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(inMemoryStore.length, 2);
    });

    test('an existing Pending request does NOT block submission', async () => {
      inMemoryStore.push({
        _id: 'pending-1',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Eve',
          businessName: 'Bakery E',
          email: 'eve@test.com',
          phone: '+91 55555 55555',
          requestedDate: '2026-10-05',
          startTime: '06:00',
          endTime: '09:00'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(inMemoryStore.length, 2);
    });

    test('an existing Rejected request does NOT block submission', async () => {
      inMemoryStore.push({
        _id: 'rejected-1',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Rejected'
      });

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery',
          fullName: 'Frank',
          businessName: 'Bakery F',
          email: 'frank@test.com',
          phone: '+91 44444 44444',
          requestedDate: '2026-10-05',
          startTime: '06:00',
          endTime: '09:00'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(inMemoryStore.length, 2);
    });
  });

  describe('B. PATCH /api/requests/:id conflict behavior', () => {
    test('accepting a non-conflicting request succeeds', async () => {
      inMemoryStore.push({
        _id: 'req-pending-1',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/req-pending-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(inMemoryStore[0].status, 'Accepted');
    });

    test('accepting a conflicting request returns 409 and keeps request Pending', async () => {
      // Existing accepted request: 06:00–09:00
      inMemoryStore.push({
        _id: 'already-accepted',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      // Pending request overlapping it: 07:00–10:00
      inMemoryStore.push({
        _id: 'conflict-pending',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '07:00',
        endTime: '10:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/conflict-pending`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /already accepted/i);

      // Verify the conflicting request remains Pending
      const candidate = inMemoryStore.find((i) => i._id === 'conflict-pending');
      assert.strictEqual(candidate.status, 'Pending');
    });

    test('rejecting a request always succeeds without conflict check', async () => {
      inMemoryStore.push({
        _id: 'req-to-reject',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/req-to-reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Rejected');
    });
  });
});
