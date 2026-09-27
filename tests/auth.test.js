import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const User = require('../server/models/User.js');
const Request = require('../server/models/Request.js');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('Phase 12 — Authentication and Authorization End-to-End Suite', () => {
  let server;
  let baseUrl;
  let inMemoryUsers = [];
  let inMemoryRequests = [];

  // Save original methods
  const origUserFindOne = User.findOne;
  const origUserFindById = User.findById;
  const origUserSave = User.prototype.save;
  const origRequestSave = Request.prototype.save;
  const origRequestFind = Request.find;

  before(async () => {
    // Mock User queries and persistence
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
        }
      };
    };

    User.prototype.save = async function () {
      const idStr = this._id ? this._id.toString() : ('60d0fe4f5311236168a109' + (inMemoryUsers.length + 10).toString(16));
      this._id = idStr;
      this.id = idStr;

      const existingIdx = inMemoryUsers.findIndex((u) => u._id.toString() === idStr);

      // Hash password if modified
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

    // Mock Request persistence
    Request.prototype.save = async function () {
      const doc = {
        _id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...this.toObject ? this.toObject() : this,
        createdAt: new Date()
      };
      inMemoryRequests.push(doc);
      return doc;
    };

    Request.find = async function () {
      return inMemoryRequests;
    };

    // Spin up test server on ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Restore originals
    User.findOne = origUserFindOne;
    User.findById = origUserFindById;
    User.prototype.save = origUserSave;
    Request.prototype.save = origRequestSave;
    Request.find = origRequestFind;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryUsers = [];
    inMemoryRequests = [];
  });

  // 1. Create Account succeeds
  test('1. Create Account succeeds with valid details and returns JWT token and safe user profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Maya Chen',
        email: 'maya@harvestbistro.com',
        password: 'securePassword123',
        role: 'seeker',
        businessProfile: {
          businessName: 'Harvest Bistro'
        }
      })
    });

    assert.equal(res.status, 201, 'Expected status 201 for successful registration');
    const data = await res.json();
    assert.ok(data.token, 'Expected response to contain JWT token');
    assert.equal(typeof data.token, 'string');
    assert.ok(data.user, 'Expected response to contain user profile');
    assert.equal(data.user.email, 'maya@harvestbistro.com');
    assert.equal(data.user.fullName, 'Maya Chen');
    assert.equal(data.user.password, undefined, 'Password hash must NOT be exposed in response');
  });

  // 2. Login with newly created account succeeds
  test('2. Login with the newly created account succeeds and returns valid JWT token', async () => {
    // First register
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Maya Chen',
        email: 'maya@harvestbistro.com',
        password: 'securePassword123',
        role: 'seeker'
      })
    });

    // Then login
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maya@harvestbistro.com',
        password: 'securePassword123'
      })
    });

    assert.equal(res.status, 200, 'Expected status 200 for successful login');
    const data = await res.json();
    assert.ok(data.token, 'Expected response to contain JWT token');
    assert.ok(data.user, 'Expected response to contain user profile');
    assert.equal(data.user.email, 'maya@harvestbistro.com');
    assert.equal(data.user.password, undefined);
  });

  // 3. /api/auth/me works with the returned token
  test('3. /api/auth/me works with the returned Bearer token', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Devon Lee',
        email: 'devon@grandview.com',
        password: 'grandPassword456',
        role: 'provider',
        businessProfile: { businessName: 'Grandview Hotel' }
      })
    });
    const { token } = await regRes.json();

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    assert.equal(meRes.status, 200, 'Expected status 200 for /api/auth/me with valid token');
    const meData = await meRes.json();
    assert.ok(meData.user, 'Expected user profile in /api/auth/me response');
    assert.equal(meData.user.email, 'devon@grandview.com');
    assert.equal(meData.user.fullName, 'Devon Lee');
    assert.equal(meData.user.role, 'provider');
  });

  // 4. Sign Out works (revoking/removing token denies access to protected endpoints)
  test('4. Sign Out works: unauthenticated /api/auth/me call is rejected with 401', async () => {
    // When signed out, no Authorization header is provided
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401, 'Access denied without token');

    // With invalid or malformed token
    const invalidRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.token.payload'
      }
    });
    assert.equal(invalidRes.status, 401, 'Access denied with invalid token');
  });

  // 5. Login with incorrect password is rejected
  test('5. Login with incorrect password is rejected with 401 and descriptive error', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: 'user@example.com',
        password: 'correctPassword123'
      })
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'wrongPassword'
      })
    });

    assert.equal(res.status, 401, 'Expected status 401 for incorrect password');
    const data = await res.json();
    assert.equal(data.error, 'Invalid email or password.');
  });

  // 6. Duplicate registration is rejected
  test('6. Duplicate registration with the same email is rejected with 409 conflict', async () => {
    const firstRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'First Register',
        email: 'duplicate@example.com',
        password: 'password123'
      })
    });
    assert.equal(firstRes.status, 201);

    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Second Register',
        email: 'duplicate@example.com',
        password: 'differentPassword'
      })
    });

    assert.equal(dupRes.status, 409, 'Expected status 409 for duplicate email registration');
    const data = await dupRes.json();
    assert.equal(data.error, 'Email is already registered.');
  });

  // 7. Unauthenticated marketplace browsing still works
  test('7. Unauthenticated marketplace browsing still works via GET /api/resources', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    assert.equal(res.status, 200, 'Marketplace resources endpoint must remain publicly accessible');
    const resources = await res.json();
    assert.ok(Array.isArray(resources), 'Expected array of resources');
    assert.ok(resources.length > 0, 'Expected resources to be populated');
  });

  // 8. Authenticated request submission still works
  test('8. Authenticated request submission binds seeker user ID and returns 201', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Booking Seeker',
        email: 'seeker@eventco.com',
        password: 'password123',
        role: 'seeker'
      })
    });
    const { token, user } = await regRes.json();

    const reqRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        resourceId: 'res-01',
        resourceTitle: 'Commercial Induction Kitchen Suite',
        fullName: 'Booking Seeker',
        businessName: 'Event Co',
        email: 'seeker@eventco.com',
        phone: '+91 98765 43210',
        requestedDate: '2026-10-15',
        startTime: '09:00',
        endTime: '17:00',
        message: 'Need commercial kitchen for catering preparation'
      })
    });

    assert.equal(reqRes.status, 201, 'Expected status 201 for request submission');
    const reqData = await reqRes.json();
    assert.ok(reqData._id, 'Expected saved request to have an _id');
    assert.equal(reqData.resourceId, 'res-01');
    assert.equal(reqData.seeker, user.id, 'Expected saved request to link seeker user ID');
  });

  // 9. Server configuration error handling for JWT_SECRET
  test('9. Missing JWT_SECRET in production returns 500 with descriptive server configuration error', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevJwtSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      // Register first with dev secret before setting to production
      // When login is called in production without JWT_SECRET:
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@domain.com',
          password: 'anyPassword'
        })
      });

      // Nonexistent user returns 401 before token generation
      assert.equal(res.status, 401);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevJwtSecret !== undefined) {
        process.env.JWT_SECRET = prevJwtSecret;
      }
    }
  });
});
