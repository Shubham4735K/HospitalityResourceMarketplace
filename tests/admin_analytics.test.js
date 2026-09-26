import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const User = require('../server/models/User.js');
const resources = require('../server/data/resources.js');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('Phase 15.1 — Admin Analytics API & Calculations', () => {
  let server;
  let baseUrl;
  let inMemoryStore = [];
  let inMemoryUsers = [];

  const origFind = Request.find;
  const origFindById = Request.findById;
  const origSave = Request.prototype.save;
  const origUserFindById = User.findById;

  const adminUserId = '60d0fe4f5311236168a109aa';
  const seekerUserId = '60d0fe4f5311236168a109bb';
  const providerUserId = '60d0fe4f5311236168a109cc';
  const bothUserId = '60d0fe4f5311236168a109dd';

  const adminToken = generateToken(adminUserId);
  const seekerToken = generateToken(seekerUserId);
  const providerToken = generateToken(providerUserId);
  const bothToken = generateToken(bothUserId);

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

    User.findById = function (id) {
      const u = inMemoryUsers.find((user) => user._id === id.toString()) || null;
      return {
        select: function () {
          return Promise.resolve(u);
        },
        then: function (resolve, reject) {
          return Promise.resolve(u).then(resolve, reject);
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
    Request.find = origFind;
    Request.findById = origFindById;
    Request.prototype.save = origSave;
    User.findById = origUserFindById;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryStore = [];
    inMemoryUsers = [
      {
        _id: adminUserId,
        role: 'admin',
        fullName: 'Admin User',
        email: 'admin@resshare.com'
      },
      {
        _id: seekerUserId,
        role: 'seeker',
        fullName: 'Seeker User',
        email: 'seeker@resshare.com'
      },
      {
        _id: providerUserId,
        role: 'provider',
        fullName: 'Provider User',
        email: 'provider@resshare.com'
      },
      {
        _id: bothUserId,
        role: 'both',
        fullName: 'Both User',
        email: 'both@resshare.com'
      }
    ];
  });

  describe('1. Authentication and Admin Authorization', () => {
    test('unauthenticated analytics access rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /token/i);
    });

    test('invalid token rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: 'Bearer invalid.token.payload' }
      });
      assert.strictEqual(res.status, 401);
    });

    test('token without Bearer prefix rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: adminToken }
      });
      assert.strictEqual(res.status, 401);
    });

    test('token for non-existent/deleted user rejected with 401', async () => {
      const ghostUserId = '60d0fe4f5311236168a10999';
      const ghostToken = generateToken(ghostUserId);
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${ghostToken}` }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /not found|no longer exists|invalid/i);
    });

    test('non-admin seeker role rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${seekerToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /forbidden|permissions/i);
    });

    test('non-admin provider role rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${providerToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /forbidden|permissions/i);
    });

    test('non-admin both role rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${bothToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /forbidden|permissions/i);
    });

    test('authenticated admin access succeeds with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.overview);
      assert.ok(Array.isArray(data.requestsByStatus));
      assert.ok(Array.isArray(data.bookingsByStatus));
      assert.ok(Array.isArray(data.monthlyBookings));
      assert.ok(Array.isArray(data.resourceUtilization));
      assert.ok(Array.isArray(data.recentActivity));
    });
  });

  describe('2. Empty Database and Safe Handling', () => {
    test('handles empty dataset safely without runtime errors or NaNs', async () => {
      inMemoryStore = [];

      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.overview.totalRequests, 0);
      assert.strictEqual(data.overview.pendingRequests, 0);
      assert.strictEqual(data.overview.acceptedRequests, 0);
      assert.strictEqual(data.overview.confirmedBookings, 0);
      assert.strictEqual(data.overview.completedBookings, 0);
      assert.strictEqual(data.overview.cancelledBookings, 0);
      assert.strictEqual(data.overview.totalPaidRevenue, 0);
      assert.strictEqual(data.overview.totalRefundedAmount, 0);
      assert.strictEqual(data.overview.netRevenue, 0);
      assert.strictEqual(data.overview.totalResources, resources.length);
      assert.ok(data.overview.availableResources > 0);

      // Check all percentages are 0, not NaN
      for (const item of data.requestsByStatus) {
        assert.strictEqual(item.count, 0);
        assert.strictEqual(item.percentage, 0);
      }

      assert.deepStrictEqual(data.monthlyBookings, []);
      assert.deepStrictEqual(data.recentActivity, []);

      // Check utilization has 0% utilization and 0 booking count for all resources
      for (const util of data.resourceUtilization) {
        assert.strictEqual(util.totalRequests, 0);
        assert.strictEqual(util.bookingCount, 0);
        assert.strictEqual(util.utilizationPercentage, 0);
        assert.strictEqual(util.revenue, 0);
      }
    });
  });

  describe('3. Overview Metrics and Status Aggregations', () => {
    beforeEach(() => {
      inMemoryStore = [
        {
          _id: 'req-1',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          fullName: 'Alice Chef',
          businessName: 'Alice Bakery',
          email: 'alice@bakery.com',
          requestedDate: '2026-10-05',
          status: 'Pending',
          payment: { status: 'Pending', amount: 1800, transactionId: null },
          createdAt: new Date('2026-10-01T10:00:00Z')
        },
        {
          _id: 'req-2',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          fullName: 'Bob Baker',
          businessName: 'Bob Treats',
          email: 'bob@treats.com',
          requestedDate: '2026-10-06',
          status: 'Accepted',
          payment: { status: 'Pending', amount: 1800, transactionId: null },
          createdAt: new Date('2026-10-02T11:00:00Z')
        },
        {
          _id: 'req-3',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          fullName: 'Charlie Cook',
          businessName: 'Charlie Kitchen',
          email: 'charlie@kitchen.com',
          requestedDate: '2026-10-07',
          status: 'Confirmed',
          payment: { status: 'Paid', amount: 1800, transactionId: 'TXN-101' },
          createdAt: new Date('2026-10-03T12:00:00Z')
        },
        {
          _id: 'req-4',
          resourceId: 'res-02',
          resourceTitle: 'Cold Prep Station',
          fullName: 'David Deli',
          businessName: 'David Foods',
          email: 'david@foods.com',
          requestedDate: '2026-10-08',
          status: 'Completed',
          payment: { status: 'Paid', amount: 1200, transactionId: 'TXN-102' },
          createdAt: new Date('2026-10-04T13:00:00Z')
        },
        {
          _id: 'req-5',
          resourceId: 'res-02',
          resourceTitle: 'Cold Prep Station',
          fullName: 'Eve Events',
          businessName: 'Eve Catering',
          email: 'eve@catering.com',
          requestedDate: '2026-10-09',
          status: 'Cancelled',
          payment: { status: 'Refunded', amount: 1200, transactionId: 'TXN-103' },
          createdAt: new Date('2026-10-05T14:00:00Z')
        }
      ];
    });

    test('correct overview counts for resources, requests, and lifecycle stages', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.overview.totalRequests, 5);
      assert.strictEqual(data.overview.pendingRequests, 1);
      assert.strictEqual(data.overview.acceptedRequests, 1);
      assert.strictEqual(data.overview.confirmedBookings, 1);
      assert.strictEqual(data.overview.completedBookings, 1);
      assert.strictEqual(data.overview.cancelledBookings, 1);
      assert.strictEqual(data.overview.totalResources, resources.length);
    });

    test('correct payment totals for paid revenue and refunded amount', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      // req-3: Paid 1800, req-4: Paid 1200 => totalPaidRevenue = 3000
      assert.strictEqual(data.overview.totalPaidRevenue, 3000);
      // req-5: Refunded 1200 => totalRefundedAmount = 1200
      assert.strictEqual(data.overview.totalRefundedAmount, 1200);
      // netRevenue logically accounts for totalPaidRevenue and totalRefundedAmount: 3000 - 1200 = 1800
      assert.strictEqual(data.overview.netRevenue, 1800);
    });

    test('netRevenue equals totalPaidRevenue when there are zero refunds', async () => {
      inMemoryStore = [
        {
          _id: 'nr-1',
          resourceId: 'res-01',
          status: 'Confirmed',
          payment: { status: 'Paid', amount: 2500 }
        }
      ];

      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.overview.totalPaidRevenue, 2500);
      assert.strictEqual(data.overview.totalRefundedAmount, 0);
      assert.strictEqual(data.overview.netRevenue, 2500);
    });

    test('netRevenue does not drop below 0 when refunds exceed paid revenue', async () => {
      inMemoryStore = [
        {
          _id: 'nr-2',
          resourceId: 'res-01',
          status: 'Cancelled',
          payment: { status: 'Refunded', amount: 2000 }
        }
      ];

      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.overview.totalPaidRevenue, 0);
      assert.strictEqual(data.overview.totalRefundedAmount, 2000);
      assert.strictEqual(data.overview.netRevenue, 0);
    });

    test('correct status aggregations across requests and bookings', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      const pendingItem = data.requestsByStatus.find((s) => s.status === 'Pending');
      assert.ok(pendingItem);
      assert.strictEqual(pendingItem.count, 1);
      assert.strictEqual(pendingItem.percentage, 20);

      const confirmedItem = data.requestsByStatus.find((s) => s.status === 'Confirmed');
      assert.ok(confirmedItem);
      assert.strictEqual(confirmedItem.count, 1);
      assert.strictEqual(confirmedItem.percentage, 20);

      const rejectedItem = data.requestsByStatus.find((s) => s.status === 'Rejected');
      assert.ok(rejectedItem);
      assert.strictEqual(rejectedItem.count, 0);
      assert.strictEqual(rejectedItem.percentage, 0);

      const bookingConfirmed = data.bookingsByStatus.find((s) => s.status === 'Confirmed');
      assert.strictEqual(bookingConfirmed.count, 1);

      const bookingCompleted = data.bookingsByStatus.find((s) => s.status === 'Completed');
      assert.strictEqual(bookingCompleted.count, 1);

      const bookingCancelled = data.bookingsByStatus.find((s) => s.status === 'Cancelled');
      assert.strictEqual(bookingCancelled.count, 1);
    });

    test('correct monthly booking trends aggregation', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.monthlyBookings.length, 1);
      const oct = data.monthlyBookings[0];
      assert.strictEqual(oct.month, '2026-10');
      assert.strictEqual(oct.label, 'Oct 2026');
      assert.strictEqual(oct.requests, 5);
      // Bookings = Confirmed + Completed = 1 + 1 = 2
      assert.strictEqual(oct.bookings, 2);
      // Paid revenue = 1800 + 1200 = 3000
      assert.strictEqual(oct.revenue, 3000);
    });
  });

  describe('4. Resource Utilization Calculation', () => {
    beforeEach(() => {
      inMemoryStore = [
        // res-01 has 3 requests: 1 Confirmed, 1 Completed, 1 Pending
        {
          _id: 'u-1',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          requestedDate: '2026-10-05',
          status: 'Confirmed',
          payment: { status: 'Paid', amount: 1800 },
          createdAt: new Date()
        },
        {
          _id: 'u-2',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          requestedDate: '2026-10-06',
          status: 'Completed',
          payment: { status: 'Paid', amount: 1800 },
          createdAt: new Date()
        },
        {
          _id: 'u-3',
          resourceId: 'res-01',
          resourceTitle: 'Off-Peak Artisan Bakery',
          requestedDate: '2026-10-07',
          status: 'Pending',
          payment: { status: 'Pending', amount: 1800 },
          createdAt: new Date()
        }
      ];
    });

    test('utilization percentage and booking counts calculated correctly for resources', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      const res01 = data.resourceUtilization.find((r) => r.resourceId === 'res-01');
      assert.ok(res01);
      assert.strictEqual(res01.totalRequests, 3);
      assert.strictEqual(res01.confirmedBookings, 1);
      assert.strictEqual(res01.completedBookings, 1);
      assert.strictEqual(res01.bookingCount, 2);
      // 2 / 3 * 100 = 66.7%
      assert.strictEqual(res01.utilizationPercentage, 66.7);
      // Revenue = 1800 + 1800 = 3600
      assert.strictEqual(res01.revenue, 3600);

      // Other resources with 0 requests should have 0% utilization
      const otherRes = data.resourceUtilization.find((r) => r.resourceId === 'res-02');
      assert.ok(otherRes);
      assert.strictEqual(otherRes.totalRequests, 0);
      assert.strictEqual(otherRes.bookingCount, 0);
      assert.strictEqual(otherRes.utilizationPercentage, 0);
      assert.strictEqual(otherRes.revenue, 0);
    });
  });

  describe('5. Recent Activity Feed', () => {
    test('returns latest requests with resource, seeker, and payment details', async () => {
      inMemoryStore = [
        {
          _id: 'act-1',
          resourceId: 'res-01',
          resourceTitle: 'Artisan Bakery',
          fullName: 'Chef Marco',
          businessName: 'Marco Pasticceria',
          email: 'marco@chef.com',
          requestedDate: '2026-10-12',
          status: 'Confirmed',
          payment: {
            status: 'Paid',
            amount: 1800,
            transactionId: 'TXN-999'
          },
          createdAt: new Date('2026-10-01T15:30:00Z')
        }
      ];

      const res = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.recentActivity.length, 1);
      const item = data.recentActivity[0];
      assert.strictEqual(item.id, 'act-1');
      assert.strictEqual(item.resource.id, 'res-01');
      assert.strictEqual(item.resource.title, 'Artisan Bakery');
      assert.strictEqual(item.seeker.name, 'Chef Marco');
      assert.strictEqual(item.seeker.businessName, 'Marco Pasticceria');
      assert.strictEqual(item.status, 'Confirmed');
      assert.strictEqual(item.date, '2026-10-12');
      assert.strictEqual(item.payment.status, 'Paid');
      assert.strictEqual(item.payment.amount, 1800);
      assert.strictEqual(item.payment.transactionId, 'TXN-999');
    });
  });
});
