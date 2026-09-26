import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Notification = require('../server/models/Notification.js');
const Request = require('../server/models/Request.js');
const app = require('../server/server.js');

describe('Phase 13.2 — Backend Notification Foundation', () => {
  let server;
  let baseUrl;
  let inMemoryRequests = [];
  let inMemoryNotifications = [];

  // Save original Mongoose methods
  const origRequestFind = Request.find;
  const origRequestFindById = Request.findById;
  const origRequestSave = Request.prototype.save;

  const origNotificationFind = Notification.find;
  const origNotificationFindById = Notification.findById;
  const origNotificationSave = Notification.prototype.save;

  before(async () => {
    // Mock Request methods
    Request.find = async function (filter = {}) {
      return inMemoryRequests.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status && item.status !== filter.status) return false;
        if (filter._id && filter._id.$ne && item._id === filter._id.$ne) return false;
        return true;
      });
    };

    Request.findById = async function (id) {
      const found = inMemoryRequests.find((item) => item._id === id);
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryRequests.findIndex((i) => i._id === id);
          if (idx !== -1) {
            inMemoryRequests[idx] = { ...this };
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
        status: this.status || 'Pending'
      };
      inMemoryRequests.push(doc);
      return doc;
    };

    // Mock Notification methods
    Notification.find = function () {
      return {
        sort: function (sortCriteria) {
          const copy = [...inMemoryNotifications];
          if (sortCriteria && sortCriteria.createdAt === -1) {
            copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return Promise.resolve(copy);
        },
        then: function (resolve, reject) {
          return Promise.resolve([...inMemoryNotifications]).then(resolve, reject);
        }
      };
    };

    Notification.findById = async function (id) {
      if (id === 'invalid-id-error') {
        const err = new Error('Cast to ObjectId failed');
        err.name = 'CastError';
        throw err;
      }
      const found = inMemoryNotifications.find((item) => item._id === id);
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryNotifications.findIndex((i) => i._id === id);
          if (idx !== -1) {
            inMemoryNotifications[idx] = { ...this };
          }
          return this;
        }
      };
    };

    Notification.prototype.save = async function () {
      const doc = {
        _id: this._id || 'mock-notif-' + Math.random().toString(36).substring(2, 9),
        recipient: this.recipient,
        recipientRole: this.recipientRole,
        title: this.title,
        message: this.message,
        requestId: this.requestId,
        resourceTitle: this.resourceTitle,
        read: this.read !== undefined ? this.read : false,
        createdAt: this.createdAt || new Date()
      };
      inMemoryNotifications.push(doc);
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
    Request.find = origRequestFind;
    Request.findById = origRequestFindById;
    Request.prototype.save = origRequestSave;

    Notification.find = origNotificationFind;
    Notification.findById = origNotificationFindById;
    Notification.prototype.save = origNotificationSave;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryRequests = [];
    inMemoryNotifications = [];
  });

  // 1. Notification model can be created
  test('1. Notification model can be created with required fields', async () => {
    const notif = new Notification({
      recipient: 'The Artisan Loaf & Patisserie',
      recipientRole: 'provider',
      title: 'New Booking Request',
      message: 'Flour Power requested your kitchen.',
      requestId: 'mock-req-001',
      resourceTitle: 'Artisan Bakery'
    });

    assert.strictEqual(notif.recipient, 'The Artisan Loaf & Patisserie');
    assert.strictEqual(notif.recipientRole, 'provider');
    assert.strictEqual(notif.title, 'New Booking Request');
    assert.strictEqual(notif.message, 'Flour Power requested your kitchen.');
    assert.strictEqual(notif.requestId, 'mock-req-001');
    assert.strictEqual(notif.resourceTitle, 'Artisan Bakery');
    assert.strictEqual(notif.read, false);
    assert.ok(notif.createdAt instanceof Date);

    await notif.validate();

    // Validation fails if required fields are missing
    const emptyNotif = new Notification({});
    await assert.rejects(
      async () => {
        await emptyNotif.validate();
      },
      (err) => {
        assert.ok(err.errors.recipient);
        assert.ok(err.errors.recipientRole);
        assert.ok(err.errors.title);
        assert.ok(err.errors.message);
        assert.ok(err.errors.requestId);
        return true;
      }
    );
  });

  // 2. Successful POST /api/requests creates a provider notification
  test('2. Successful POST /api/requests creates a provider notification', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: 'res-01',
        resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-10',
        startTime: '05:00',
        endTime: '08:00'
      })
    });

    assert.strictEqual(res.status, 201);
    const createdReq = await res.json();
    assert.ok(createdReq._id);

    // Check that 1 provider notification was created
    assert.strictEqual(inMemoryNotifications.length, 1);
    const notif = inMemoryNotifications[0];
    assert.strictEqual(notif.recipient, 'The Artisan Loaf & Patisserie');
    assert.strictEqual(notif.recipientRole, 'provider');
    assert.strictEqual(notif.title, 'New Booking Request');
    assert.ok(notif.message.includes('Flour Power'));
    assert.ok(notif.message.includes('Off-Peak Artisan Bakery & Pastry Kitchen'));
    assert.strictEqual(notif.requestId, createdReq._id);
    assert.strictEqual(notif.resourceTitle, 'Off-Peak Artisan Bakery & Pastry Kitchen');
    assert.strictEqual(notif.read, false);
  });

  // 3. Rejected/conflicting POST does not create a notification
  test('3. Rejected/conflicting POST does not create a notification', async () => {
    // Seed an existing accepted booking
    inMemoryRequests.push({
      _id: 'existing-accepted',
      resourceId: 'res-01',
      resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      fullName: 'Prior Bookings',
      businessName: 'Prior Bakery',
      email: 'prior@test.com',
      phone: '+91 99999 00000',
      requestedDate: '2026-10-10',
      startTime: '05:00',
      endTime: '08:00',
      status: 'Accepted'
    });

    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: 'res-01',
        resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
        fullName: 'Conflicting Requester',
        businessName: 'Conflict Kitchen',
        email: 'conflict@test.com',
        phone: '+91 88888 88888',
        requestedDate: '2026-10-10',
        startTime: '06:00',
        endTime: '07:00'
      })
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(inMemoryNotifications.length, 0);
  });

  // 4. Successful PATCH to Accepted creates a seeker notification
  test('4. Successful PATCH to Accepted creates a seeker notification', async () => {
    inMemoryRequests.push({
      _id: 'req-pending-01',
      resourceId: 'res-01',
      resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      fullName: 'Alice Baker',
      businessName: 'Flour Power',
      email: 'alice@flourpower.com',
      phone: '+91 99999 11111',
      requestedDate: '2026-10-12',
      startTime: '05:00',
      endTime: '08:00',
      status: 'Pending'
    });

    const res = await fetch(`${baseUrl}/api/requests/req-pending-01`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Accepted' })
    });

    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.status, 'Accepted');

    assert.strictEqual(inMemoryNotifications.length, 1);
    const notif = inMemoryNotifications[0];
    assert.strictEqual(notif.recipient, 'Flour Power');
    assert.strictEqual(notif.recipientRole, 'seeker');
    assert.strictEqual(notif.title, 'Request Accepted');
    assert.ok(notif.message.toLowerCase().includes('accepted'));
    assert.ok(notif.message.includes('Off-Peak Artisan Bakery & Pastry Kitchen'));
    assert.ok(notif.message.includes('The Artisan Loaf & Patisserie'));
    assert.strictEqual(notif.requestId, 'req-pending-01');
    assert.strictEqual(notif.read, false);
  });

  // 5. Successful PATCH to Rejected creates a seeker notification
  test('5. Successful PATCH to Rejected creates a seeker notification', async () => {
    inMemoryRequests.push({
      _id: 'req-pending-02',
      resourceId: 'res-02',
      resourceTitle: 'Cold Prep & Vacuum Packaging Station',
      fullName: 'Bob Chef',
      businessName: 'Cloud Kitchens Co',
      email: 'bob@cloudkitchens.com',
      phone: '+91 88888 22222',
      requestedDate: '2026-10-14',
      startTime: '08:00',
      endTime: '11:00',
      status: 'Pending'
    });

    const res = await fetch(`${baseUrl}/api/requests/req-pending-02`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected' })
    });

    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.status, 'Rejected');

    assert.strictEqual(inMemoryNotifications.length, 1);
    const notif = inMemoryNotifications[0];
    assert.strictEqual(notif.recipient, 'Cloud Kitchens Co');
    assert.strictEqual(notif.recipientRole, 'seeker');
    assert.strictEqual(notif.title, 'Request Rejected');
    assert.ok(notif.message.toLowerCase().includes('rejected'));
    assert.ok(notif.message.includes('Cold Prep & Vacuum Packaging Station'));
    assert.ok(notif.message.includes('Olive Bar & Kitchen'));
    assert.strictEqual(notif.requestId, 'req-pending-02');
    assert.strictEqual(notif.read, false);
  });

  // 6. Invalid PATCH status does not create a notification
  test('6. Invalid PATCH status does not create a notification', async () => {
    inMemoryRequests.push({
      _id: 'req-pending-03',
      resourceId: 'res-01',
      resourceTitle: 'Off-Peak Artisan Bakery & Pastry Kitchen',
      fullName: 'Alice Baker',
      businessName: 'Flour Power',
      email: 'alice@flourpower.com',
      phone: '+91 99999 11111',
      requestedDate: '2026-10-12',
      startTime: '05:00',
      endTime: '08:00',
      status: 'Pending'
    });

    const res = await fetch(`${baseUrl}/api/requests/req-pending-03`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'UnknownStatus' })
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(inMemoryNotifications.length, 0);
  });

  // 7. GET /api/notifications returns notifications newest first
  test('7. GET /api/notifications returns notifications newest first', async () => {
    inMemoryNotifications.push(
      {
        _id: 'notif-1',
        recipient: 'Business A',
        recipientRole: 'provider',
        title: 'Older Notification',
        message: 'Older msg',
        requestId: 'req-1',
        createdAt: new Date('2026-09-01T10:00:00Z')
      },
      {
        _id: 'notif-2',
        recipient: 'Business B',
        recipientRole: 'seeker',
        title: 'Newest Notification',
        message: 'Newest msg',
        requestId: 'req-2',
        createdAt: new Date('2026-09-03T10:00:00Z')
      },
      {
        _id: 'notif-3',
        recipient: 'Business C',
        recipientRole: 'provider',
        title: 'Middle Notification',
        message: 'Middle msg',
        requestId: 'req-3',
        createdAt: new Date('2026-09-02T10:00:00Z')
      }
    );

    const res = await fetch(`${baseUrl}/api/notifications`);
    assert.strictEqual(res.status, 200);

    const list = await res.json();
    assert.strictEqual(list.length, 3);
    assert.strictEqual(list[0]._id, 'notif-2');
    assert.strictEqual(list[1]._id, 'notif-3');
    assert.strictEqual(list[2]._id, 'notif-1');
  });

  // 8. PATCH /api/notifications/:id/read marks notification as read
  test('8. PATCH /api/notifications/:id/read marks notification as read', async () => {
    inMemoryNotifications.push({
      _id: 'notif-unread',
      recipient: 'Business A',
      recipientRole: 'provider',
      title: 'Alert',
      message: 'You have a new request',
      requestId: 'req-10',
      read: false,
      createdAt: new Date()
    });

    const res = await fetch(`${baseUrl}/api/notifications/notif-unread/read`, {
      method: 'PATCH'
    });

    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.read, true);

    const stored = inMemoryNotifications.find((n) => n._id === 'notif-unread');
    assert.strictEqual(stored.read, true);
  });

  // 9. Invalid/nonexistent notification ID is handled safely
  test('9. Invalid/nonexistent notification ID returns 404', async () => {
    // Non-existent ID
    const resNotFound = await fetch(`${baseUrl}/api/notifications/non-existent-id/read`, {
      method: 'PATCH'
    });
    assert.strictEqual(resNotFound.status, 404);
    const bodyNotFound = await resNotFound.json();
    assert.strictEqual(bodyNotFound.error, 'Notification not found');

    // Invalid ID format triggering CastError
    const resCastError = await fetch(`${baseUrl}/api/notifications/invalid-id-error/read`, {
      method: 'PATCH'
    });
    assert.strictEqual(resCastError.status, 404);
    const bodyCastError = await resCastError.json();
    assert.strictEqual(bodyCastError.error, 'Notification not found');
  });
});
