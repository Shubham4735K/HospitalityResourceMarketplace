import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const User = require('../server/models/User.js');
const Request = require('../server/models/Request.js');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('Security Audit — Admin Account Security & Privilege Escalation Guards', () => {
  let server;
  let baseUrl;
  let inMemoryUsers = [];
  let inMemoryRequests = [];

  const origUserFindOne = User.findOne;
  const origUserFindById = User.findById;
  const origUserFind = User.find;
  const origUserSave = User.prototype.save;
  const origRequestFind = Request.find;

  // Predefined users for testing authorization
  const existingAdminId = '60d0fe4f5311236168a109a1';
  const seekerUserId = '60d0fe4f5311236168a109b1';
  const providerUserId = '60d0fe4f5311236168a109c1';
  const bothUserId = '60d0fe4f5311236168a109d1';

  const existingAdminToken = generateToken(existingAdminId);
  const seekerToken = generateToken(seekerUserId);
  const providerToken = generateToken(providerUserId);
  const bothToken = generateToken(bothUserId);

  before(async () => {
    User.findOne = async function (query = {}) {
      if (query.email) {
        const found = inMemoryUsers.find((u) => u.email === query.email.toLowerCase());
        if (!found) return null;
        return {
          ...found,
          comparePassword: async function (candidate) {
            return bcrypt.compare(candidate, found.password);
          },
          toJSON: function () {
            const ret = { ...found, id: found._id };
            delete ret.password;
            return ret;
          }
        };
      }
      return null;
    };

    User.find = async function (query = {}) {
      return inMemoryUsers.filter((u) => {
        if (query.role && u.role !== query.role) return false;
        return true;
      });
    };

    User.findById = function (id) {
      const idStr = id && (id._id || id.id) ? (id._id || id.id).toString() : id?.toString();
      const found = inMemoryUsers.find((u) => u._id.toString() === idStr);
      return {
        select: async function () {
          if (!found) return null;
          return {
            ...found,
            status: found.status || 'Active',
            toJSON: () => {
              const copy = { ...found, id: found._id.toString() };
              delete copy.password;
              return copy;
            }
          };
        },
        then: function (resolve) {
          if (!found) return resolve(null);
          resolve({
            ...found,
            status: found.status || 'Active',
            save: async function () {
              const idx = inMemoryUsers.findIndex((u) => u._id.toString() === idStr);
              if (idx !== -1) inMemoryUsers[idx] = { ...this };
              return this;
            },
            toJSON: () => {
              const copy = { ...found, id: found._id.toString() };
              delete copy.password;
              return copy;
            }
          });
        }
      };
    };

    User.prototype.save = async function () {
      const idStr = this._id ? this._id.toString() : ('60d0fe4f5311236168a109' + (inMemoryUsers.length + 10).toString(16));
      this._id = idStr;
      this.id = idStr;

      const existingIdx = inMemoryUsers.findIndex((u) => u._id.toString() === idStr);

      if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }

      const doc = {
        _id: idStr,
        id: idStr,
        fullName: this.fullName,
        email: this.email ? this.email.toLowerCase() : '',
        password: this.password,
        role: this.role || 'seeker',
        status: this.status || 'Active',
        businessProfile: this.businessProfile || {},
        comparePassword: async function (candidate) {
          return bcrypt.compare(candidate, this.password);
        },
        toJSON: function () {
          const ret = { ...this, id: idStr };
          delete ret.password;
          delete ret.comparePassword;
          return ret;
        }
      };

      if (existingIdx !== -1) {
        inMemoryUsers[existingIdx] = doc;
      } else {
        inMemoryUsers.push(doc);
      }
      return doc;
    };

    Request.find = function () {
      return {
        sort: () => inMemoryRequests
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
    User.findOne = origUserFindOne;
    User.findById = origUserFindById;
    User.find = origUserFind;
    User.prototype.save = origUserSave;
    Request.find = origRequestFind;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryUsers = [
      {
        _id: existingAdminId,
        id: existingAdminId,
        fullName: 'Existing Platform Admin',
        email: 'admin@resshare.com',
        role: 'admin',
        status: 'Active',
        businessProfile: { businessName: 'ResShare Platform Admin' }
      },
      {
        _id: seekerUserId,
        id: seekerUserId,
        fullName: 'Alice Seeker',
        email: 'alice@seeker.com',
        role: 'seeker',
        status: 'Active',
        businessProfile: {}
      },
      {
        _id: providerUserId,
        id: providerUserId,
        fullName: 'Bob Provider',
        email: 'bob@provider.com',
        role: 'provider',
        status: 'Active',
        businessProfile: { businessName: 'Bob Kitchens' }
      },
      {
        _id: bothUserId,
        id: bothUserId,
        fullName: 'Charlie Both',
        email: 'charlie@both.com',
        role: 'both',
        status: 'Active',
        businessProfile: { businessName: 'Charlie Venues' }
      }
    ];
    inMemoryRequests = [];
  });

  // TEST 1: Public registration with role="admin" -> REJECTED
  test('TEST 1: Public registration with role="admin" is strictly rejected', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Malicious Attacker',
        email: 'attacker@example.com',
        password: 'password123',
        role: 'admin'
      })
    });

    assert.equal(res.status, 403, 'Expected status 403 when public registration attempts admin role');
    const data = await res.json();
    assert.ok(data.error, 'Expected error response');
    assert.match(data.error, /admin/i, 'Error message should explain admin accounts cannot be self-registered');

    // Verify attacker account was NOT created in database
    const createdUser = inMemoryUsers.find((u) => u.email === 'attacker@example.com');
    assert.equal(createdUser, undefined, 'Attacker must not be saved in database');
  });

  // TEST 2: Public registration with role="seeker" -> SUCCESS
  test('TEST 2: Public registration with role="seeker" succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Legitimate Seeker',
        email: 'legit.seeker@example.com',
        password: 'password123',
        role: 'seeker'
      })
    });

    assert.equal(res.status, 201, 'Expected status 201 for seeker registration');
    const data = await res.json();
    assert.equal(data.user.role, 'seeker');
    assert.ok(data.token);
  });

  // TEST 3: Public registration with role="provider" -> SUCCESS
  test('TEST 3: Public registration with role="provider" succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Legitimate Provider',
        email: 'legit.provider@example.com',
        password: 'password123',
        role: 'provider',
        businessProfile: { businessName: 'Sunny Bakery' }
      })
    });

    assert.equal(res.status, 201, 'Expected status 201 for provider registration');
    const data = await res.json();
    assert.equal(data.user.role, 'provider');
    assert.ok(data.token);
  });

  // TEST 4: Public registration with role="both" -> SUCCESS
  test('TEST 4: Public registration with role="both" succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dual Operator',
        email: 'dual@example.com',
        password: 'password123',
        role: 'both',
        businessProfile: { businessName: 'Dual Kitchen & Banquets' }
      })
    });

    assert.equal(res.status, 201, 'Expected status 201 for both role registration');
    const data = await res.json();
    assert.equal(data.user.role, 'both');
    assert.ok(data.token);
  });

  // TEST 5: Authenticated seeker attempts admin endpoint -> 403 Forbidden
  test('TEST 5: Authenticated seeker attempting GET /api/admin/analytics is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });

    assert.equal(res.status, 403, 'Seeker must be forbidden from admin analytics');
    const data = await res.json();
    assert.equal(data.error, 'Forbidden. Insufficient role permissions.');
  });

  // TEST 6: Authenticated provider attempts admin endpoint -> 403 Forbidden
  test('TEST 6: Authenticated provider attempting GET /api/admin/users is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });

    assert.equal(res.status, 403, 'Provider must be forbidden from admin user management');
    const data = await res.json();
    assert.equal(data.error, 'Forbidden. Insufficient role permissions.');
  });

  // TEST 7: Authenticated both-role user attempts admin endpoint -> 403 Forbidden
  test('TEST 7: Authenticated both-role user attempting GET /api/admin/audit-logs is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${bothToken}` }
    });

    assert.equal(res.status, 403, 'Both-role user must be forbidden from admin audit logs');
    const data = await res.json();
    assert.equal(data.error, 'Forbidden. Insufficient role permissions.');
  });

  // TEST 8: Normal user attempts to update their role to admin -> REJECTED (403 Forbidden)
  test('TEST 8: Normal user attempting to elevate role via PATCH /api/admin/users/:id/role is rejected with 403', async () => {
    // Seeker attempting to promote themselves to admin
    const res = await fetch(`${baseUrl}/api/admin/users/${seekerUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({ role: 'admin' })
    });

    assert.equal(res.status, 403, 'Normal user must be forbidden from PATCH /api/admin/users/:id/role');
    const data = await res.json();
    assert.equal(data.error, 'Forbidden. Insufficient role permissions.');

    // Verify user role was NOT changed
    const target = inMemoryUsers.find((u) => u._id === seekerUserId);
    assert.equal(target.role, 'seeker', 'Seeker role must remain unchanged');
  });

  // TEST 9: Existing admin accesses admin endpoint -> SUCCESS (200 OK)
  test('TEST 9: Existing admin successfully accesses GET /api/admin/analytics and GET /api/admin/users', async () => {
    const analyticsRes = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${existingAdminToken}` }
    });
    assert.equal(analyticsRes.status, 200, 'Admin must be granted access to analytics');
    const analyticsData = await analyticsRes.json();
    assert.ok(analyticsData.overview, 'Analytics response must contain overview metrics');

    const usersRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${existingAdminToken}` }
    });
    assert.equal(usersRes.status, 200, 'Admin must be granted access to user list');
    const usersData = await usersRes.json();
    assert.ok(Array.isArray(usersData), 'Users response must be an array of users');
    assert.ok(usersData.length > 0, 'Users response must contain user entries');
  });
});
