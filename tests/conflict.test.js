import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  hasResourceDateConflict,
  hasDateConflict,
  hasTimeOverlap,
  parseTimeToMinutes
} = require('../server/utils/conflict.js');
const Request = require('../server/models/Request.js');
const app = require('../server/server.js');

describe('Phase 9.3 — Day-Only Conflict Utility (hasResourceDateConflict & hasDateConflict)', () => {
  test('hasResourceDateConflict: same resource and same date conflicts', () => {
    assert.strictEqual(hasResourceDateConflict('res-01', '2026-10-05', 'res-01', '2026-10-05'), true);
  });

  test('hasResourceDateConflict: same resource and different date does not conflict', () => {
    assert.strictEqual(hasResourceDateConflict('res-01', '2026-10-05', 'res-01', '2026-10-06'), false);
  });

  test('hasResourceDateConflict: different resource and same date does not conflict', () => {
    assert.strictEqual(hasResourceDateConflict('res-01', '2026-10-05', 'res-02', '2026-10-05'), false);
  });

  test('hasResourceDateConflict: handles null/undefined inputs safely', () => {
    assert.strictEqual(hasResourceDateConflict(null, '2026-10-05', 'res-01', '2026-10-05'), false);
    assert.strictEqual(hasResourceDateConflict('res-01', null, 'res-01', '2026-10-05'), false);
  });

  test('hasDateConflict: matches identical dates', () => {
    assert.strictEqual(hasDateConflict('2026-10-05', '2026-10-05'), true);
    assert.strictEqual(hasDateConflict('2026-10-05', '2026-10-06'), false);
    assert.strictEqual(hasDateConflict(null, '2026-10-05'), false);
  });
});

describe('Phase 9.4 — Legacy Time Overlap Utility (hasTimeOverlap)', () => {
  test('partial overlap (starts before, ends inside)', () => {
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '11:00', '13:00'), true);
  });

  test('partial overlap (starts inside, ends after)', () => {
    assert.strictEqual(hasTimeOverlap('11:00', '13:00', '10:00', '12:00'), true);
  });

  test('enclosing overlap (A encompasses B)', () => {
    assert.strictEqual(hasTimeOverlap('09:00', '15:00', '10:00', '12:00'), true);
  });

  test('contained overlap (A inside B)', () => {
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '09:00', '15:00'), true);
  });

  test('exact same slot', () => {
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '10:00', '12:00'), true);
  });

  test('adjacent slots (consecutive back-to-back do NOT conflict in legacy utility)', () => {
    assert.strictEqual(hasTimeOverlap('10:00', '12:00', '12:00', '14:00'), false);
    assert.strictEqual(hasTimeOverlap('12:00', '14:00', '10:00', '12:00'), false);
  });

  test('full day 23:59 representation overlap', () => {
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
        status: this.status || 'Pending',
        providerNotes: this.providerNotes !== undefined ? this.providerNotes : '',
        counterProposal: this.counterProposal || null
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

    test('7. Same resource + same date Accepted request → conflict (409)', async () => {
      // Seed an Accepted booking from 06:00 to 09:00 on 2026-10-05
      inMemoryStore.push({
        _id: 'accepted-1',
        resourceId: 'res-01',
        resourceTitle: 'Bakery',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      // Attempt to book on the same resource and same date (even with different times 14:00-16:00)
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
          startTime: '14:00',
          endTime: '16:00'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.match(data.reason, /already booked/i);
      // Ensure no new request was added
      assert.strictEqual(inMemoryStore.length, 1);
    });

    test('8. Same resource + different date → no conflict', async () => {
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

    test('9. Different resource + same date → no conflict', async () => {
      inMemoryStore.push({
        _id: 'accepted-res-01',
        resourceId: 'res-01',
        resourceTitle: 'Bakery Kitchen',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-02',
          resourceTitle: 'Espresso Bar',
          fullName: 'Grace',
          businessName: 'Cafe G',
          email: 'grace@test.com',
          phone: '+91 33333 33333',
          requestedDate: '2026-10-05',
          startTime: '06:00',
          endTime: '09:00'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(inMemoryStore.length, 2);
    });

    test('returns 409 Conflict for same resource and date regardless of adjacent or non-overlapping time slot', async () => {
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

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.strictEqual(inMemoryStore.length, 1);
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

    test('accepting a conflicting request on same date returns 409 and keeps request Pending', async () => {
      // Existing accepted request on 2026-10-05
      inMemoryStore.push({
        _id: 'already-accepted',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      // Pending request on same date: 14:00–16:00
      inMemoryStore.push({
        _id: 'conflict-pending',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '14:00',
        endTime: '16:00',
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
      assert.match(data.reason, /already booked/i);

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

  describe('C. PATCH /api/requests/:id providerNotes behavior (Phase 10.1)', () => {
    test('PATCH Accepted with providerNotes saves the trimmed note', async () => {
      inMemoryStore.push({
        _id: 'req-notes-1',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending',
        providerNotes: ''
      });

      const res = await fetch(`${baseUrl}/api/requests/req-notes-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Accepted',
          providerNotes: 'Please bring your FSSAI certificate.'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(data.providerNotes, 'Please bring your FSSAI certificate.');
      assert.strictEqual(inMemoryStore[0].providerNotes, 'Please bring your FSSAI certificate.');
    });

    test('PATCH Rejected with providerNotes saves the note', async () => {
      inMemoryStore.push({
        _id: 'req-notes-2',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending',
        providerNotes: ''
      });

      const res = await fetch(`${baseUrl}/api/requests/req-notes-2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          providerNotes: 'Facility is undergoing maintenance.'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Rejected');
      assert.strictEqual(data.providerNotes, 'Facility is undergoing maintenance.');
      assert.strictEqual(inMemoryStore[0].providerNotes, 'Facility is undergoing maintenance.');
    });

    test('PATCH without providerNotes still works and leaves existing notes unchanged', async () => {
      inMemoryStore.push({
        _id: 'req-notes-3',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending',
        providerNotes: 'Initial note'
      });

      const res = await fetch(`${baseUrl}/api/requests/req-notes-3`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(data.providerNotes, 'Initial note');
      assert.strictEqual(inMemoryStore[0].providerNotes, 'Initial note');
    });

    test('whitespace-only providerNotes becomes empty string', async () => {
      inMemoryStore.push({
        _id: 'req-notes-4',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending',
        providerNotes: ''
      });

      const res = await fetch(`${baseUrl}/api/requests/req-notes-4`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Accepted',
          providerNotes: '   \n\t  '
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(data.providerNotes, '');
      assert.strictEqual(inMemoryStore[0].providerNotes, '');
    });

    test('invalid non-string providerNotes is rejected with 400', async () => {
      inMemoryStore.push({
        _id: 'req-notes-5',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '07:00',
        status: 'Pending',
        providerNotes: 'untouched'
      });

      const res = await fetch(`${baseUrl}/api/requests/req-notes-5`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Accepted',
          providerNotes: 12345
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'providerNotes must be a string');
      assert.strictEqual(inMemoryStore[0].status, 'Pending');
      assert.strictEqual(inMemoryStore[0].providerNotes, 'untouched');
    });

    test('Accepted conflict still returns 409 and does NOT save providerNotes', async () => {
      // Existing accepted request
      inMemoryStore.push({
        _id: 'already-accepted-slot',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted',
        providerNotes: 'Prior booking'
      });

      // Pending request on same date
      inMemoryStore.push({
        _id: 'conflict-note-req',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '07:00',
        endTime: '10:00',
        status: 'Pending',
        providerNotes: ''
      });

      const res = await fetch(`${baseUrl}/api/requests/conflict-note-req`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Accepted',
          providerNotes: 'Should not be saved due to conflict'
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');

      // Verify the candidate request status and providerNotes were NOT modified
      const candidate = inMemoryStore.find((i) => i._id === 'conflict-note-req');
      assert.strictEqual(candidate.status, 'Pending');
      assert.strictEqual(candidate.providerNotes, '');
    });

    test('14. Existing request records without counterProposal remain compatible', async () => {
      // Legacy document without providerNotes or counterProposal field
      inMemoryStore.push({
        _id: 'legacy-req',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '14:00',
        endTime: '16:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/legacy-req`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(inMemoryStore[0].status, 'Accepted');
    });
  });

  describe('D. PATCH /api/requests/:id Provider Counter-Proposal (Phase 10.2 Day-Only)', () => {
    test('10. Valid counter-proposal date → succeeds', async () => {
      inMemoryStore.push({
        _id: 'cp-req-1',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-req-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: {
            date: '2026-10-06',
            notes: 'We can accommodate on Tuesday'
          }
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Counter-Offered');
      assert.strictEqual(data.counterProposal.date, '2026-10-06');
      assert.strictEqual(data.counterProposal.notes, 'We can accommodate on Tuesday');
      assert.strictEqual(data.counterProposal.startTime, undefined);
      assert.strictEqual(data.counterProposal.endTime, undefined);
      assert.strictEqual(inMemoryStore[0].status, 'Counter-Offered');
    });

    test('11. Counter-proposal on unavailable day → 400', async () => {
      // res-01 schedule is Mon-Fri [1,2,3,4,5]. 2026-10-11 is Sunday (ISO 7)
      inMemoryStore.push({
        _id: 'cp-req-unavail',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-req-unavail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: {
            date: '2026-10-11',
            notes: 'Sunday proposal'
          }
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /not available on Sundays/i);
      assert.strictEqual(inMemoryStore[0].status, 'Pending');
    });

    test('12. Counter-proposal on occupied Accepted date → 409', async () => {
      // Seed an Accepted booking on 2026-10-06
      inMemoryStore.push({
        _id: 'accepted-tuesday',
        resourceId: 'res-01',
        requestedDate: '2026-10-06',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Accepted'
      });

      // Pending request attempting counter-proposal on the same occupied date
      inMemoryStore.push({
        _id: 'cp-req-occupied',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '10:00',
        endTime: '11:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-req-occupied`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: {
            date: '2026-10-06',
            notes: 'Trying occupied date'
          }
        })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.strictEqual(data.reason, 'The proposed date conflicts with an existing booking.');

      // Conflict leaves original request unchanged
      const candidate = inMemoryStore.find((r) => r._id === 'cp-req-occupied');
      assert.strictEqual(candidate.status, 'Pending');
      assert.strictEqual(candidate.counterProposal, undefined);
    });

    test('13. Counter-proposal no longer requires startTime/endTime', async () => {
      inMemoryStore.push({
        _id: 'cp-req-no-time',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-req-no-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: {
            date: '2026-10-07'
          }
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Counter-Offered');
      assert.deepStrictEqual(data.counterProposal, {
        date: '2026-10-07',
        notes: ''
      });
      assert.strictEqual(inMemoryStore[0].counterProposal.startTime, undefined);
      assert.strictEqual(inMemoryStore[0].counterProposal.endTime, undefined);
    });

    test('Missing counterProposal object or missing date rejected with 400', async () => {
      inMemoryStore.push({
        _id: 'cp-req-missing',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      // Missing counterProposal entirely
      const res1 = await fetch(`${baseUrl}/api/requests/cp-req-missing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Counter-Offered' })
      });
      assert.strictEqual(res1.status, 400);

      // Missing date in counterProposal
      const res2 = await fetch(`${baseUrl}/api/requests/cp-req-missing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: { notes: 'Missing date' }
        })
      });
      assert.strictEqual(res2.status, 400);
    });

    test('Invalid date format or non-calendar date rejected with 400', async () => {
      inMemoryStore.push({
        _id: 'cp-req-bad-date',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      const resFormat = await fetch(`${baseUrl}/api/requests/cp-req-bad-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: { date: 'not-a-valid-date' }
        })
      });
      assert.strictEqual(resFormat.status, 400);

      const resCalendar = await fetch(`${baseUrl}/api/requests/cp-req-bad-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: { date: '2026-02-31' }
        })
      });
      assert.strictEqual(resCalendar.status, 400);
      assert.strictEqual(inMemoryStore[0].status, 'Pending');
    });

    test('Provider notes and counter-proposal notes are preserved and trimmed', async () => {
      inMemoryStore.push({
        _id: 'cp-req-notes-trim',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Pending'
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-req-notes-trim`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          providerNotes: '   General provider message   ',
          counterProposal: {
            date: '2026-10-06',
            notes: '   Spaced counter note   '
          }
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.providerNotes, 'General provider message');
      assert.strictEqual(data.counterProposal.notes, 'Spaced counter note');
      assert.strictEqual(inMemoryStore[0].providerNotes, 'General provider message');
      assert.strictEqual(inMemoryStore[0].counterProposal.notes, 'Spaced counter note');
    });

    test('Counter-offer does NOT block the resource from accepting another request', async () => {
      // Seed a request that was Counter-Offered for 2026-10-06
      inMemoryStore.push({
        _id: 'cp-req-existing',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Counter-Offered',
        counterProposal: {
          date: '2026-10-06',
          notes: 'Suggested alternative'
        }
      });

      // Submit a new request for 2026-10-06
      const postRes = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Bakery Kitchen',
          fullName: 'New Seeker',
          businessName: 'Bakery Co',
          email: 'seeker@test.com',
          phone: '+91 99999 11111',
          requestedDate: '2026-10-06',
          startTime: '06:00',
          endTime: '09:00'
        })
      });

      assert.strictEqual(postRes.status, 201);
      const postData = await postRes.json();

      // Accepting this new request must succeed without conflict with the counter-offered request
      const patchRes = await fetch(`${baseUrl}/api/requests/${postData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(patchRes.status, 200);
    });

    test('Only Pending requests can be counter-offered', async () => {
      inMemoryStore.push({
        _id: 'already-rejected',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Rejected'
      });

      const res = await fetch(`${baseUrl}/api/requests/already-rejected`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: {
            date: '2026-10-06'
          }
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /only pending/i);
    });
  });

  describe('E. PATCH /api/requests/:id Seeker Response to Counter-Proposal (Phase 10.3)', () => {
    test('1. Counter-Offered request can be accepted (changes status to Accepted)', async () => {
      inMemoryStore.push({
        _id: 'cp-accept-1',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Counter-Offered',
        providerNotes: 'Alternative date note',
        counterProposal: {
          date: '2026-10-07',
          notes: 'Wednesday is open'
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-accept-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
      assert.strictEqual(data.requestedDate, '2026-10-07');
      assert.strictEqual(data.startTime, '05:00');
      assert.strictEqual(data.endTime, '08:00');
      assert.deepStrictEqual(data.counterProposal, {
        date: '2026-10-07',
        notes: 'Wednesday is open'
      });
      assert.strictEqual(data.providerNotes, 'Alternative date note');
      assert.strictEqual(inMemoryStore[0].status, 'Accepted');
      assert.strictEqual(inMemoryStore[0].requestedDate, '2026-10-07');
    });

    test('2. Accepting Counter-Offered against an already Accepted booking on proposed date returns 409', async () => {
      // Seed an Accepted booking on the proposed date (2026-10-07)
      inMemoryStore.push({
        _id: 'prior-booking',
        resourceId: 'res-01',
        requestedDate: '2026-10-07',
        status: 'Accepted'
      });

      // Seed the Counter-Offered request
      inMemoryStore.push({
        _id: 'cp-conflict',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Counter-Offered',
        counterProposal: {
          date: '2026-10-07',
          notes: 'Wednesday is open'
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-conflict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, 'Conflict');
      assert.strictEqual(data.reason, 'The proposed date is no longer available for this resource.');

      // Conflict response does NOT change the request
      const candidate = inMemoryStore.find((r) => r._id === 'cp-conflict');
      assert.strictEqual(candidate.status, 'Counter-Offered');
      assert.strictEqual(candidate.requestedDate, '2026-10-05');
    });

    test('3. Counter-Offered request can be declined (changes status to Rejected without conflict check)', async () => {
      // Even if another booking is on the proposed date, decline must succeed
      inMemoryStore.push({
        _id: 'prior-booking-2',
        resourceId: 'res-01',
        requestedDate: '2026-10-08',
        status: 'Accepted'
      });

      inMemoryStore.push({
        _id: 'cp-decline-1',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        startTime: '06:00',
        endTime: '09:00',
        status: 'Counter-Offered',
        counterProposal: {
          date: '2026-10-08',
          notes: 'Thursday'
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-decline-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Rejected');
      assert.strictEqual(data.requestedDate, '2026-10-05');
      assert.deepStrictEqual(data.counterProposal, {
        date: '2026-10-08',
        notes: 'Thursday'
      });
      assert.strictEqual(inMemoryStore[1].status, 'Rejected');
    });

    test('4. Counter-Offered request cannot be transitioned to arbitrary status', async () => {
      inMemoryStore.push({
        _id: 'cp-invalid-transition',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Counter-Offered',
        counterProposal: {
          date: '2026-10-09'
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-invalid-transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Counter-Offered' })
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(inMemoryStore[0].status, 'Counter-Offered');
    });

    test('5. Terminal Accepted or Rejected requests cannot be modified', async () => {
      inMemoryStore.push({
        _id: 'terminal-accepted',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Accepted'
      });

      const res = await fetch(`${baseUrl}/api/requests/terminal-accepted`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot modify a request that is already accepted/i);
    });

    test('6. Accepting Counter-Offered without valid counterProposal date returns 400', async () => {
      inMemoryStore.push({
        _id: 'cp-no-date',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Counter-Offered',
        counterProposal: null
      });

      const res = await fetch(`${baseUrl}/api/requests/cp-no-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /without a valid counterproposal date/i);
    });

    test('7. Accepting Counter-Offered excludes the current request from conflict query', async () => {
      // Counter-Offered request currently has requestedDate: '2026-10-05' and counterProposal.date: '2026-10-05'
      inMemoryStore.push({
        _id: 'cp-same-day',
        resourceId: 'res-01',
        requestedDate: '2026-10-05',
        status: 'Counter-Offered',
        counterProposal: {
          date: '2026-10-05',
          notes: 'Same date confirmed'
        }
      });

      // Accepting should not conflict with itself even if requestedDate was already '2026-10-05'
      const res = await fetch(`${baseUrl}/api/requests/cp-same-day`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Accepted' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Accepted');
    });
  });
});
