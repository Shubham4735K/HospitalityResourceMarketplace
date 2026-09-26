import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AuditLog = require('../server/models/AuditLog.js');
const User = require('../server/models/User.js');
const Request = require('../server/models/Request.js');
const resources = require('../server/data/resources.js');
const { generateToken } = require('../server/utils/auth.js');
const { sanitizeMetadata } = require('../server/utils/audit.js');
const app = require('../server/server.js');

describe('Phase 15.3 — Admin Audit & Activity Monitoring Tests', () => {
  let server;
  let baseUrl;
  let inMemoryAuditLogs = [];
  let inMemoryUsers = [];
  let inMemoryRequests = [];

  const origAuditFind = AuditLog.find;
  const origAuditCount = AuditLog.countDocuments;
  const origAuditSave = AuditLog.prototype.save;
  const origUserFind = User.find;
  const origUserFindById = User.findById;
  const origRequestFind = Request.find;
  const origRequestFindById = Request.findById;

  const adminId = '60d0fe4f5311236168a109a1';
  const seekerId = '60d0fe4f5311236168a109b1';
  const providerId = '60d0fe4f5311236168a109c1';

  const adminToken = generateToken(adminId);
  const seekerToken = generateToken(seekerId);
  const providerToken = generateToken(providerId);

  before(async () => {
    Request.find = function () {
      return Promise.resolve([]);
    };

    Request.findById = async function (id) {
      const found = inMemoryRequests.find((r) => (r._id ? r._id.toString() : r.id) === id.toString());
      if (!found) return null;
      return {
        ...found,
        save: async function () {
          const idx = inMemoryRequests.findIndex(
            (r) => (r._id ? r._id.toString() : r.id) === id.toString()
          );
          if (idx !== -1) {
            inMemoryRequests[idx] = { ...this };
          }
          return this;
        }
      };
    };

    // Mock User queries
    User.find = function (filter = {}) {
      const filtered = inMemoryUsers.filter((u) => {
        if (filter.role && u.role !== filter.role) return false;
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
      const found = inMemoryUsers.find((u) => (u._id ? u._id.toString() : u.id) === id.toString());
      if (!found) {
        return {
          select: function () {
            return Promise.resolve(null);
          },
          then: function (resolve) {
            return Promise.resolve(null).then(resolve);
          }
        };
      }
      const userDoc = {
        ...found,
        save: async function () {
          const idx = inMemoryUsers.findIndex(
            (u) => (u._id ? u._id.toString() : u.id) === id.toString()
          );
          if (idx !== -1) {
            inMemoryUsers[idx] = { ...this };
          }
          return this;
        }
      };
      return {
        select: function () {
          return Promise.resolve(userDoc);
        },
        then: function (resolve) {
          return Promise.resolve(userDoc).then(resolve);
        }
      };
    };

    // Mock AuditLog queries
    AuditLog.find = function (filter = {}) {
      const matches = inMemoryAuditLogs.filter((log) => {
        if (filter.action && log.action !== filter.action) return false;
        if (filter.targetType && log.targetType !== filter.targetType) return false;
        if (filter.createdAt) {
          const logTime = new Date(log.createdAt).getTime();
          if (filter.createdAt.$gte && logTime < new Date(filter.createdAt.$gte).getTime()) {
            return false;
          }
          if (filter.createdAt.$lte && logTime > new Date(filter.createdAt.$lte).getTime()) {
            return false;
          }
        }
        return true;
      });

      // Chainable query simulation
      let sortFn = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
      let skipCount = 0;
      let limitCount = matches.length;

      const chain = {
        sort: function (sortObj) {
          return chain;
        },
        skip: function (num) {
          skipCount = num;
          return chain;
        },
        limit: function (num) {
          limitCount = num;
          return chain;
        },
        then: function (resolve, reject) {
          const sorted = [...matches].sort(sortFn);
          const sliced = sorted.slice(skipCount, skipCount + limitCount);
          return Promise.resolve(sliced).then(resolve, reject);
        }
      };
      return chain;
    };

    AuditLog.countDocuments = async function (filter = {}) {
      const filtered = inMemoryAuditLogs.filter((log) => {
        if (filter.action && log.action !== filter.action) return false;
        if (filter.targetType && log.targetType !== filter.targetType) return false;
        if (filter.createdAt) {
          const logTime = new Date(log.createdAt).getTime();
          if (filter.createdAt.$gte && logTime < new Date(filter.createdAt.$gte).getTime()) {
            return false;
          }
          if (filter.createdAt.$lte && logTime > new Date(filter.createdAt.$lte).getTime()) {
            return false;
          }
        }
        return true;
      });
      return filtered.length;
    };

    AuditLog.prototype.save = async function () {
      const entry = {
        _id: 'audit-' + Math.random().toString(36).substring(2, 9),
        action: this.action,
        actorId: this.actorId,
        actorEmail: this.actorEmail,
        actorRole: this.actorRole,
        targetType: this.targetType,
        targetId: this.targetId,
        description: this.description,
        metadata: this.metadata || {},
        createdAt: this.createdAt || new Date()
      };
      inMemoryAuditLogs.push(entry);
      return entry;
    };

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    AuditLog.find = origAuditFind;
    AuditLog.countDocuments = origAuditCount;
    AuditLog.prototype.save = origAuditSave;
    User.find = origUserFind;
    User.findById = origUserFindById;
    Request.find = origRequestFind;
    Request.findById = origRequestFindById;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryAuditLogs = [];
    inMemoryUsers = [
      {
        _id: adminId,
        fullName: 'Admin Root',
        email: 'admin@resshare.test',
        role: 'admin',
        status: 'Active',
        businessProfile: { businessName: 'ResShare Platform Admin' }
      },
      {
        _id: seekerId,
        fullName: 'Seeker One',
        email: 'seeker@resshare.test',
        role: 'seeker',
        status: 'Active',
        businessProfile: { businessName: 'Spice Retreat' }
      },
      {
        _id: providerId,
        fullName: 'Provider One',
        email: 'provider@resshare.test',
        role: 'provider',
        status: 'Active',
        businessProfile: { businessName: 'Metro Kitchens' }
      }
    ];

    inMemoryRequests = [
      {
        _id: 'req-active-1',
        seeker: seekerId,
        provider: providerId,
        resourceId: resources[0].id,
        resourceTitle: resources[0].title,
        status: 'Pending',
        requestedDate: '2026-10-20',
        email: 'seeker@resshare.test'
      }
    ];

    // Seed some initial audit entries
    inMemoryAuditLogs.push(
      {
        _id: 'seed-audit-1',
        action: 'USER_ROLE_CHANGED',
        actorId: adminId,
        actorEmail: 'admin@resshare.test',
        actorRole: 'admin',
        targetType: 'User',
        targetId: seekerId,
        description: 'Admin changed role for user seeker@resshare.test from "seeker" to "both".',
        metadata: { previousRole: 'seeker', newRole: 'both' },
        createdAt: new Date('2026-09-20T10:00:00Z')
      },
      {
        _id: 'seed-audit-2',
        action: 'RESOURCE_DISABLED',
        actorId: adminId,
        actorEmail: 'admin@resshare.test',
        actorRole: 'admin',
        targetType: 'Resource',
        targetId: 'res-1',
        description: 'Admin disabled marketplace resource "Commercial Convection Oven".',
        metadata: { resourceTitle: 'Commercial Convection Oven', disabled: true },
        createdAt: new Date('2026-09-22T12:00:00Z')
      },
      {
        _id: 'seed-audit-3',
        action: 'BOOKING_CONFIRMED',
        actorId: seekerId,
        actorEmail: 'seeker@resshare.test',
        actorRole: 'seeker',
        targetType: 'Booking',
        targetId: 'req-101',
        description: 'Booking confirmed for Banquet Hall on 2026-10-15.',
        metadata: { requestId: 'req-101', resourceId: 'res-2' },
        createdAt: new Date('2026-09-25T14:30:00Z')
      }
    );
  });

  describe('1. Authentication and Authorization on GET /api/admin/audit-logs', () => {
    test('Unauthenticated request returns 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.error);
    });

    test('Non-admin user (seeker) returns 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${seekerToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error);
    });

    test('Non-admin user (provider) returns 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${providerToken}` }
      });
      assert.equal(res.status, 403);
    });

    test('Admin user returns 200 with logs and pagination metadata', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.logs));
      assert.equal(data.logs.length, 3);
      assert.ok(data.pagination);
      assert.equal(data.pagination.total, 3);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.totalPages, 1);
    });
  });

  describe('2. Pagination Behavior', () => {
    test('Pagination with limit and page behaves correctly', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.logs.length, 2);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 2);
      assert.equal(data.pagination.total, 3);
      assert.equal(data.pagination.totalPages, 2);

      // Page 2
      const res2 = await fetch(`${baseUrl}/api/admin/audit-logs?page=2&limit=2`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.logs.length, 1);
      assert.equal(data2.pagination.page, 2);
    });
  });

  describe('3. Filtering Audit Logs', () => {
    test('Filter by action returns matching records', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs?action=RESOURCE_DISABLED`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.logs.length, 1);
      assert.equal(data.logs[0].action, 'RESOURCE_DISABLED');
      assert.equal(data.pagination.total, 1);
    });

    test('Filter by targetType returns matching records', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs?targetType=User`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.logs.length, 1);
      assert.equal(data.logs[0].targetType, 'User');
    });

    test('Filter by date range returns records within boundaries', async () => {
      const res = await fetch(
        `${baseUrl}/api/admin/audit-logs?startDate=2026-09-21&endDate=2026-09-23`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.logs.length, 1);
      assert.equal(data.logs[0].action, 'RESOURCE_DISABLED');
    });

    test('Invalid date queries do not crash server and return 200', async () => {
      const res = await fetch(
        `${baseUrl}/api/admin/audit-logs?startDate=notadate&endDate=badFormat`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.logs));
    });
  });

  describe('4. Audit Events Creation and Accuracy on Platform Actions', () => {
    test('Admin changing user role generates USER_ROLE_CHANGED audit record', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${seekerId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ role: 'both' })
      });
      assert.equal(res.status, 200);

      const roleEvent = inMemoryAuditLogs.find(
        (l) => l.action === 'USER_ROLE_CHANGED' && l.targetId === seekerId && l.metadata?.newRole === 'both'
      );
      assert.ok(roleEvent, 'Expected USER_ROLE_CHANGED event in audit logs');
      assert.equal(roleEvent.targetType, 'User');
      assert.equal(roleEvent.actorId, adminId);
      assert.equal(roleEvent.metadata.previousRole, 'seeker');
      assert.equal(roleEvent.metadata.newRole, 'both');
    });

    test('Failed operations do NOT emit misleading audit records', async () => {
      const countBefore = inMemoryAuditLogs.length;

      // 1. Self-demotion blocked with 400
      const selfDemoteRes = await fetch(`${baseUrl}/api/admin/users/${adminId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ role: 'seeker' })
      });
      assert.equal(selfDemoteRes.status, 400);

      // 2. Invalid role update with 400
      const invalidRoleRes = await fetch(`${baseUrl}/api/admin/users/${seekerId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ role: 'superuser' })
      });
      assert.equal(invalidRoleRes.status, 400);

      // 3. Disabling nonexistent resource with 404
      const notFoundRes = await fetch(`${baseUrl}/api/admin/resources/nonexistent-res-id/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ disabled: true })
      });
      assert.equal(notFoundRes.status, 404);

      // Verify no new audit logs were created
      assert.equal(inMemoryAuditLogs.length, countBefore, 'Failed operations must not create audit records');
    });

    test('Client-supplied body cannot spoof actorId or actorRole', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${seekerId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          role: 'provider',
          actorId: 'spoofed-attacker-id',
          actorRole: 'fake-super-admin',
          actorEmail: 'spoofed@evil.test'
        })
      });
      assert.equal(res.status, 200);

      const latestLog = inMemoryAuditLogs[inMemoryAuditLogs.length - 1];
      assert.equal(latestLog.actorId, adminId, 'Actor ID must match authenticated admin');
      assert.equal(latestLog.actorRole, 'admin', 'Actor Role must match authenticated admin');
      assert.equal(latestLog.actorEmail, 'admin@resshare.test', 'Actor Email must match authenticated admin');
    });

    test('Admin soft-deleting user generates USER_DEACTIVATED audit record', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${providerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      assert.equal(res.status, 200);

      const deactEvent = inMemoryAuditLogs.find(
        (l) => l.action === 'USER_DEACTIVATED' && l.targetId === providerId
      );
      assert.ok(deactEvent, 'Expected USER_DEACTIVATED event in audit logs');
      assert.equal(deactEvent.targetType, 'User');
      assert.equal(deactEvent.actorId, adminId);
      assert.equal(deactEvent.metadata.userRole, 'provider');
    });

    test('Admin disabling resource generates RESOURCE_DISABLED audit record', async () => {
      const testResource = resources[0];
      testResource.disabled = false;

      const res = await fetch(`${baseUrl}/api/admin/resources/${testResource.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ disabled: true, reason: 'Temporary maintenance audit' })
      });
      assert.equal(res.status, 200);

      const resEvent = inMemoryAuditLogs.find(
        (l) => l.action === 'RESOURCE_DISABLED' && l.targetId === testResource.id
      );
      assert.ok(resEvent, 'Expected RESOURCE_DISABLED event in audit logs');
      assert.equal(resEvent.targetType, 'Resource');
      assert.equal(resEvent.metadata.disabled, true);
      assert.equal(resEvent.metadata.reason, 'Temporary maintenance audit');
    });

    test('Admin enabling resource generates RESOURCE_ENABLED audit record', async () => {
      const testResource = resources[0];
      testResource.disabled = true;

      const res = await fetch(`${baseUrl}/api/admin/resources/${testResource.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ disabled: false })
      });
      assert.equal(res.status, 200);

      const resEvent = inMemoryAuditLogs.find(
        (l) => l.action === 'RESOURCE_ENABLED' && l.targetId === testResource.id
      );
      assert.ok(resEvent, 'Expected RESOURCE_ENABLED event in audit logs');
      assert.equal(resEvent.targetType, 'Resource');
      assert.equal(resEvent.metadata.disabled, false);
    });

    test('Booking cancellation generates BOOKING_CANCELLED audit record', async () => {
      const res = await fetch(`${baseUrl}/api/requests/req-active-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      assert.equal(res.status, 200);

      const cancelEvent = inMemoryAuditLogs.find(
        (l) => l.action === 'BOOKING_CANCELLED' && l.targetId === 'req-active-1'
      );
      assert.ok(cancelEvent, 'Expected BOOKING_CANCELLED event in audit logs');
      assert.equal(cancelEvent.targetType, 'Booking');
      assert.equal(cancelEvent.actorId, seekerId);
      assert.equal(cancelEvent.actorRole, 'seeker');
    });
  });

  describe('5. Data Sanitization and Privacy', () => {
    test('sanitizeMetadata strips passwords, tokens, jwt, credentials, and cards', () => {
      const dirty = {
        userEmail: 'admin@resshare.test',
        password: 'plainPassword123',
        userPasswordHash: '$2b$10$...',
        jwtToken: 'eyJhbGciOi...',
        authToken: 'secret-token',
        nested: {
          clientSecret: 'shhh',
          allowedProp: 'safeValue',
          credentialId: 'cred-9',
          cardNumber: '4111-2222-3333-4444',
          cvv: '123'
        }
      };

      const clean = sanitizeMetadata(dirty);
      assert.equal(clean.userEmail, 'admin@resshare.test');
      assert.equal(clean.password, undefined);
      assert.equal(clean.userPasswordHash, undefined);
      assert.equal(clean.jwtToken, undefined);
      assert.equal(clean.authToken, undefined);
      assert.equal(clean.nested.allowedProp, 'safeValue');
      assert.equal(clean.nested.clientSecret, undefined);
      assert.equal(clean.nested.credentialId, undefined);
      assert.equal(clean.nested.cardNumber, undefined);
      assert.equal(clean.nested.cvv, undefined);
    });

    test('sanitizeMetadata strips sensitive fields in nested arrays of objects', () => {
      const payload = {
        title: 'Batch update',
        items: [
          { name: 'Oven', secretKey: 'top-secret', apiKey: 'xyz' },
          { name: 'Blender', allowedInfo: 100 }
        ]
      };

      const clean = sanitizeMetadata(payload);
      assert.equal(clean.title, 'Batch update');
      assert.equal(clean.items[0].name, 'Oven');
      assert.equal(clean.items[0].secretKey, undefined);
      assert.equal(clean.items[0].apiKey, undefined);
      assert.equal(clean.items[1].name, 'Blender');
      assert.equal(clean.items[1].allowedInfo, 100);
    });
  });

  describe('6. Non-Fatal Failure Handling', () => {
    test('Audit logging failure does NOT break the primary admin action', async () => {
      // Intentionally break AuditLog.prototype.save
      const faultySave = AuditLog.prototype.save;
      AuditLog.prototype.save = async function () {
        throw new Error('Database disk full / connection timeout');
      };

      try {
        const res = await fetch(`${baseUrl}/api/admin/users/${seekerId}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ role: 'provider' })
        });

        // The primary operation MUST still succeed
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.user.role, 'provider');
      } finally {
        // Restore save
        AuditLog.prototype.save = faultySave;
      }
    });
  });
});
