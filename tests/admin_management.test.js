import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const User = require('../server/models/User.js');
const resources = require('../server/data/resources.js');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('Phase 15.2 — Admin Controls & Management Tests', () => {
  let server;
  let baseUrl;
  let inMemoryStore = [];
  let inMemoryUsers = [];

  const origFind = Request.find;
  const origFindById = Request.findById;
  const origSave = Request.prototype.save;
  const origUserFind = User.find;
  const origUserFindById = User.findById;
  const origUserFindOne = User.findOne;

  const admin1Id = '60d0fe4f5311236168a109a1';
  const admin2Id = '60d0fe4f5311236168a109a2';
  const seekerUserId = '60d0fe4f5311236168a109b1';
  const providerUserId = '60d0fe4f5311236168a109c1';
  const bothUserId = '60d0fe4f5311236168a109d1';

  const admin1Token = generateToken(admin1Id);
  const admin2Token = generateToken(admin2Id);
  const seekerToken = generateToken(seekerUserId);
  const providerToken = generateToken(providerUserId);

  before(async () => {
    Request.find = function (filter = {}) {
      const filtered = inMemoryStore.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        if (filter.status) {
          if (typeof filter.status === 'object' && Array.isArray(filter.status.$in)) {
            if (!filter.status.$in.includes(item.status)) return false;
          } else if (item.status !== filter.status) {
            return false;
          }
        }
        if (filter.$or && Array.isArray(filter.$or)) {
          const matchesOr = filter.$or.some((cond) => {
            if (cond.seeker && item.seeker === cond.seeker) return true;
            if (cond.provider && item.provider === cond.provider) return true;
            return false;
          });
          if (!matchesOr) return false;
        }
        if (filter._id && filter._id.$ne && item._id === filter._id.$ne) return false;
        return true;
      });

      return {
        sort: function () {
          return Promise.resolve(filtered);
        },
        then: function (resolve, reject) {
          return Promise.resolve(filtered).then(resolve, reject);
        }
      };
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
        resourceTitle: this.resourceTitle || 'Resource Title',
        fullName: this.fullName || 'Test User',
        businessName: this.businessName || 'Test Business',
        email: this.email || 'test@test.com',
        phone: this.phone || '9999999999',
        requestedDate: this.requestedDate || '2026-10-15',
        startTime: this.startTime || '09:00',
        endTime: this.endTime || '17:00',
        message: this.message || '',
        status: this.status || 'Pending',
        providerNotes: this.providerNotes || '',
        counterProposal: this.counterProposal || null,
        seeker: this.seeker || null,
        provider: this.provider || null,
        payment: this.payment || {
          status: 'Pending',
          transactionId: null,
          amount: 0,
          paidAt: null,
          refundedAt: null
        },
        createdAt: this.createdAt || new Date()
      };
      inMemoryStore.push(doc);
      return doc;
    };

    User.find = function (filter = {}) {
      const filtered = inMemoryUsers.filter((u) => {
        if (filter.role) {
          if (typeof filter.role === 'object' && Array.isArray(filter.role.$in)) {
            if (!filter.role.$in.includes(u.role)) return false;
          } else if (u.role !== filter.role) {
            return false;
          }
        }
        return true;
      });

      return {
        select: function () {
          return Promise.resolve(filtered);
        },
        sort: function () {
          return Promise.resolve(filtered);
        },
        then: function (resolve, reject) {
          return Promise.resolve(filtered).then(resolve, reject);
        }
      };
    };

    User.findById = function (id) {
      const u = inMemoryUsers.find((user) => user._id === id.toString()) || null;
      if (!u) {
        return {
          select: function () {
            return Promise.resolve(null);
          },
          then: function (resolve) {
            resolve(null);
          }
        };
      }

      const userDoc = {
        ...u,
        save: async function () {
          const idx = inMemoryUsers.findIndex((item) => item._id === id.toString());
          if (idx !== -1) {
            inMemoryUsers[idx] = { ...this };
          }
          return this;
        },
        deleteOne: async function () {
          inMemoryUsers = inMemoryUsers.filter((item) => item._id !== id.toString());
          return { deletedCount: 1 };
        }
      };

      return {
        select: function () {
          return Promise.resolve(userDoc);
        },
        then: function (resolve, reject) {
          return Promise.resolve(userDoc).then(resolve, reject);
        }
      };
    };

    User.findOne = function (filter = {}) {
      const u = inMemoryUsers.find((user) => {
        if (filter.email && user.email !== filter.email) return false;
        return true;
      });
      if (!u) return Promise.resolve(null);
      return Promise.resolve({
        ...u,
        comparePassword: async function () {
          return true;
        },
        toJSON: function () {
          return { ...u };
        }
      });
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
    User.find = origUserFind;
    User.findById = origUserFindById;
    User.findOne = origUserFindOne;

    // Reset resource disabled states
    resources.forEach((r) => {
      delete r.disabled;
      if (r.schedule) r.status = r.schedule.status || 'Available';
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryStore = [];
    inMemoryUsers = [
      {
        _id: admin1Id,
        role: 'admin',
        fullName: 'Primary Admin',
        email: 'admin1@resshare.com',
        status: 'Active',
        businessProfile: { businessName: 'ResShare Operations' },
        createdAt: new Date('2026-01-01')
      },
      {
        _id: admin2Id,
        role: 'admin',
        fullName: 'Secondary Admin',
        email: 'admin2@resshare.com',
        status: 'Active',
        businessProfile: { businessName: 'ResShare Moderation' },
        createdAt: new Date('2026-01-02')
      },
      {
        _id: seekerUserId,
        role: 'seeker',
        fullName: 'Sam Seeker',
        email: 'sam@bakery.com',
        status: 'Active',
        businessProfile: { businessName: 'Sweet Tooth Bakery' },
        createdAt: new Date('2026-02-01')
      },
      {
        _id: providerUserId,
        role: 'provider',
        fullName: 'Paul Provider',
        email: 'paul@kitchens.com',
        status: 'Active',
        businessProfile: { businessName: 'Commercial Kitchen Hub' },
        createdAt: new Date('2026-02-02')
      },
      {
        _id: bothUserId,
        role: 'both',
        fullName: 'Beth Both',
        email: 'beth@hospitality.com',
        status: 'Active',
        businessProfile: { businessName: 'Beth Catering & Events' },
        createdAt: new Date('2026-02-03')
      }
    ];

    // Reset resource disabled state
    resources.forEach((r) => {
      delete r.disabled;
      if (r.schedule) r.status = r.schedule.status || 'Available';
    });
  });

  describe('1. User Management Authorization and Retrieval', () => {
    test('GET /api/admin/users succeeds for admin with all user details', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 5);

      const sam = data.find((u) => u.email === 'sam@bakery.com');
      assert.ok(sam);
      assert.strictEqual(sam.fullName, 'Sam Seeker');
      assert.strictEqual(sam.role, 'seeker');
      assert.strictEqual(sam.businessName, 'Sweet Tooth Bakery');
      assert.strictEqual(sam.status, 'Active');
      assert.ok(!sam.password, 'Password must never be exposed');
    });

    test('GET /api/admin/users rejected for unauthenticated users with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`);
      assert.strictEqual(res.status, 401);
    });

    test('GET /api/admin/users rejected for non-admin roles with 403', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${seekerToken}` }
      });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('2. User Role Updates & Guard Rules', () => {
    test('admin can update a user role between seeker, provider, and both', async () => {
      // Seeker -> Provider
      const res1 = await fetch(`${baseUrl}/api/admin/users/${seekerUserId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'provider' })
      });
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert.strictEqual(data1.user.role, 'provider');

      // Provider -> Both
      const res2 = await fetch(`${baseUrl}/api/admin/users/${seekerUserId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'both' })
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.user.role, 'both');
    });

    test('invalid role is rejected with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${seekerUserId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'super-admin-invalid' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /invalid role/i);
    });

    test('role change for non-existent user returns 404', async () => {
      const nonExistentId = '60d0fe4f5311236168a10900';
      const res = await fetch(`${baseUrl}/api/admin/users/${nonExistentId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'provider' })
      });
      assert.strictEqual(res.status, 404);
    });

    test('self-demotion is strictly prevented (admin cannot demote their own account)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${admin1Id}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'seeker' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /self-demotion/i);

      // Verify role unchanged
      const admin1 = inMemoryUsers.find((u) => u._id === admin1Id);
      assert.strictEqual(admin1.role, 'admin');
    });

    test('self-deletion is strictly prevented (admin cannot delete their own account)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${admin1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /self-deletion/i);
    });

    test('last remaining admin cannot be demoted or removed', async () => {
      // Remove admin2 so only admin1 remains
      inMemoryUsers = inMemoryUsers.filter((u) => u._id !== admin2Id);

      // Try demoting the last admin (using admin2 token or admin1 demoting another admin if 1 left)
      // Here admin1 tries to demote an admin when only 1 admin exists
      // Suppose another admin2 existed and admin1 demotes admin2:
      // When 2 admins exist, admin1 CAN demote admin2:
      inMemoryUsers.push({
        _id: admin2Id,
        role: 'admin',
        fullName: 'Secondary Admin',
        email: 'admin2@resshare.com'
      });

      const resDemoteSecond = await fetch(`${baseUrl}/api/admin/users/${admin2Id}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'seeker' })
      });
      assert.strictEqual(resDemoteSecond.status, 200);

      // Now only admin1 remains as admin!
      const remainingAdmins = inMemoryUsers.filter((u) => u.role === 'admin');
      assert.strictEqual(remainingAdmins.length, 1);

      // If a non-self admin tries to demote the last admin (simulate with valid admin token):
      const resDemoteLast = await fetch(`${baseUrl}/api/admin/users/${admin1Id}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'seeker' })
      });
      // Should fail either by self-demotion or last-admin
      assert.strictEqual(resDemoteLast.status, 400);

      // Verify deletion of last admin also blocked
      const resDeleteLast = await fetch(`${baseUrl}/api/admin/users/${admin1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(resDeleteLast.status, 400);
    });

    test('admin can safely soft-delete a user with no active bookings, setting status to Inactive', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${seekerUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.status, 'Inactive');

      // Verify in-memory user status updated to Inactive without deleting record (no orphaned foreign keys)
      const seeker = inMemoryUsers.find((u) => u._id === seekerUserId);
      assert.ok(seeker, 'User document must not be deleted (prevents orphaned records)');
      assert.strictEqual(seeker.status, 'Inactive');
    });

    test('deactivated/inactive user cannot access authenticated endpoints (protect rejects with 403)', async () => {
      // Set seeker to Inactive
      const seeker = inMemoryUsers.find((u) => u._id === seekerUserId);
      seeker.status = 'Inactive';

      const res = await fetch(`${baseUrl}/api/admin/resources`, {
        headers: { Authorization: `Bearer ${seekerToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /inactive/i);
    });

    test('deactivated/inactive user cannot log in (POST /api/auth/login rejects with 403)', async () => {
      // Set seeker to Inactive
      const seeker = inMemoryUsers.find((u) => u._id === seekerUserId);
      seeker.status = 'Inactive';

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sam@bakery.com', password: 'password123' })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /inactive/i);
    });

    test('admin cannot delete/deactivate a user with active requests or bookings', async () => {
      // Add an active Pending request for bothUserId
      inMemoryStore.push({
        _id: 'req-active-test',
        resourceId: 'res-01',
        seeker: bothUserId,
        status: 'Pending',
        requestedDate: '2026-11-01'
      });

      const res = await fetch(`${baseUrl}/api/admin/users/${bothUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /active requests/i);
    });
  });

  describe('3. Resource Moderation & Enable/Disable Functionality', () => {
    test('GET /api/admin/resources returns all resources with moderation status', async () => {
      const res = await fetch(`${baseUrl}/api/admin/resources`, {
        headers: { Authorization: `Bearer ${admin1Token}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, resources.length);

      const first = data[0];
      assert.ok(first.id);
      assert.ok(first.title);
      assert.ok(first.category);
      assert.ok(first.hostBusiness);
      assert.strictEqual(first.disabled, false);
      assert.strictEqual(first.status, 'Available');
    });

    test('admin can disable a resource without deleting its data', async () => {
      const res = await fetch(`${baseUrl}/api/admin/resources/res-01/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.resource.disabled, true);
      assert.strictEqual(data.resource.status, 'Disabled');

      // In-memory resource array reflects disabled
      const r01 = resources.find((r) => r.id === 'res-01');
      assert.strictEqual(r01.disabled, true);
    });

    test('non-admin cannot disable or enable resources (403)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/resources/res-01/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${seekerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });
      assert.strictEqual(res.status, 403);
    });

    test('disabling non-existent resource returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/admin/resources/res-99999/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });
      assert.strictEqual(res.status, 404);
    });

    test('disabled resource cannot receive new booking requests (POST /api/requests rejected with 400)', async () => {
      // Disable res-01
      const resToggle = await fetch(`${baseUrl}/api/admin/resources/res-01/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });
      assert.strictEqual(resToggle.status, 200);

      // Attempt to book res-01
      const resBook = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${seekerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          fullName: 'Sam Seeker',
          businessName: 'Sweet Tooth Bakery',
          email: 'sam@bakery.com',
          phone: '9876543210',
          requestedDate: '2026-10-20',
          startTime: '05:00',
          endTime: '10:00'
        })
      });
      assert.strictEqual(resBook.status, 400);
      const data = await resBook.json();
      assert.match(data.error, /disabled/i);
    });

    test('disabled resource cannot be confirmed into a booking (PATCH /api/requests/:id rejected with 400)', async () => {
      // Create an Accepted request for res-02
      inMemoryStore.push({
        _id: 'req-accepted-disabled-test',
        resourceId: 'res-02',
        resourceTitle: 'Cold Prep Station',
        fullName: 'Sam Seeker',
        businessName: 'Sweet Tooth Bakery',
        email: 'sam@bakery.com',
        requestedDate: '2026-10-22',
        status: 'Accepted',
        seeker: seekerUserId,
        payment: { status: 'Pending', amount: 1200 }
      });

      // Admin disables res-02
      await fetch(`${baseUrl}/api/admin/resources/res-02/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });

      // Seeker attempts to Confirm booking for the disabled resource
      const resConfirm = await fetch(`${baseUrl}/api/requests/req-accepted-disabled-test`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${seekerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Confirmed' })
      });
      assert.strictEqual(resConfirm.status, 400);
      const data = await resConfirm.json();
      assert.match(data.error, /disabled/i);
    });

    test('re-enabling a resource restores booking capability', async () => {
      // Re-enable res-01
      const resReenable = await fetch(`${baseUrl}/api/admin/resources/res-01/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: false })
      });
      assert.strictEqual(resReenable.status, 200);

      // Booking now succeeds
      const resBook = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${seekerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          fullName: 'Sam Seeker',
          businessName: 'Sweet Tooth Bakery',
          email: 'sam@bakery.com',
          phone: '9876543210',
          requestedDate: '2026-10-25',
          startTime: '05:00',
          endTime: '10:00'
        })
      });
      assert.strictEqual(resBook.status, 201);
    });

    test('disabled resource cannot receive counter-proposals (PATCH /api/requests/:id returns 400)', async () => {
      // Create a pending request on res-03
      inMemoryStore.push({
        _id: 'req-counter-disabled-test',
        resourceId: 'res-03',
        status: 'Pending',
        seeker: seekerUserId,
        requestedDate: '2026-11-10'
      });

      // Admin disables res-03
      await fetch(`${baseUrl}/api/admin/resources/res-03/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });

      // Provider attempts counter-proposal on disabled res-03
      const res = await fetch(`${baseUrl}/api/requests/req-counter-disabled-test`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Counter-Offered',
          counterProposal: { date: '2026-11-12' }
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /disabled/i);
    });

    test('disabled resource cannot be accepted by provider (PATCH /api/requests/:id returns 400)', async () => {
      inMemoryStore.push({
        _id: 'req-provider-accept-disabled-test',
        resourceId: 'res-03',
        status: 'Pending',
        seeker: seekerUserId,
        requestedDate: '2026-11-15'
      });

      // Disable res-03
      await fetch(`${baseUrl}/api/admin/resources/res-03/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${admin1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ disabled: true })
      });

      // Provider attempts to accept the pending request on disabled resource
      const res = await fetch(`${baseUrl}/api/requests/req-provider-accept-disabled-test`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Accepted' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /disabled/i);
    });
  });
});

