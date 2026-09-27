import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const User = require('../server/models/User.js');
const Resource = require('../server/models/Resource.js');
const RoleChangeRequest = require('../server/models/RoleChangeRequest.js');
const resources = require('../server/data/resources.js');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('ResShare — Comprehensive Role Management & Authorization Tests', () => {
  let server;
  let baseUrl;

  let inMemoryRequests = [];
  let inMemoryUsers = [];
  let inMemoryResources = [];
  let inMemoryRoleRequests = [];

  const origRequestFind = Request.find;
  const origRequestFindById = Request.findById;
  const origRequestSave = Request.prototype.save;

  const origUserFind = User.find;
  const origUserFindById = User.findById;

  const origResourceSave = Resource.prototype.save;
  const origResourceFind = Resource.find;
  const origResourceUpdateOne = Resource.updateOne;

  const origRoleReqFind = RoleChangeRequest.find;
  const origRoleReqFindOne = RoleChangeRequest.findOne;
  const origRoleReqFindById = RoleChangeRequest.findById;
  const origRoleReqSave = RoleChangeRequest.prototype.save;

  // Test User IDs
  const seekerId = '60d0fe4f5311236168a109b1';
  const providerId = '60d0fe4f5311236168a109c1';
  const bothId = '60d0fe4f5311236168a109d1';
  const otherSeekerId = '60d0fe4f5311236168a109e2';
  const adminId = '60d0fe4f5311236168a109a1';
  const secondAdminId = '60d0fe4f5311236168a109a2';

  // JWT Tokens
  const seekerToken = generateToken(seekerId);
  const providerToken = generateToken(providerId);
  const bothToken = generateToken(bothId);
  const otherSeekerToken = generateToken(otherSeekerId);
  const adminToken = generateToken(adminId);

  const initialResourceCount = resources.length;

  before(async () => {
    // Mock User
    User.findById = function (id) {
      const idStr = id ? id.toString() : '';
      const u = inMemoryUsers.find((user) => user._id.toString() === idStr) || null;
      if (!u) {
        return {
          select: () => Promise.resolve(null),
          then: (resolve) => resolve(null)
        };
      }
      if (!u.save) {
        u.save = async function () { return this; };
      }
      return {
        select: () => Promise.resolve(u),
        then: (resolve) => resolve(u)
      };
    };

    User.find = function (filter = {}) {
      let filtered = [...inMemoryUsers];
      if (filter.role) {
        filtered = filtered.filter((u) => u.role === filter.role);
      }
      return {
        select: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
    };

    // Mock Resource.prototype.save
    Resource.prototype.save = async function () {
      const doc = {
        _id: this._id || 'res-test-' + Math.random().toString(36).substring(2, 9),
        id: this.id || 'res-test-' + Math.random().toString(36).substring(2, 9),
        title: this.title,
        category: this.category,
        hostBusiness: this.hostBusiness,
        location: this.location,
        rate: this.rate,
        rateUnit: this.rateUnit,
        availability: this.availability,
        schedule: this.schedule,
        description: this.description,
        specs: this.specs,
        image: this.image,
        houseRules: this.houseRules,
        verified: this.verified,
        disabled: this.disabled,
        provider: this.provider,
        createdAt: this.createdAt || new Date()
      };
      inMemoryResources.push(doc);
      return doc;
    };

    Resource.find = function () {
      return {
        lean: () => Promise.resolve(inMemoryResources),
        then: (resolve) => resolve(inMemoryResources)
      };
    };

    // Mock Request.prototype.save
    Request.prototype.save = async function () {
      const doc = {
        _id: this._id || 'req-test-' + Math.random().toString(36).substring(2, 9),
        id: this._id || 'req-test-' + Math.random().toString(36).substring(2, 9),
        resourceId: this.resourceId,
        resourceTitle: this.resourceTitle || 'Resource Title',
        fullName: this.fullName || 'Requester',
        businessName: this.businessName || 'Requester Biz',
        email: this.email || 'req@test.com',
        phone: this.phone || '9999999999',
        requestedDate: this.requestedDate || '2026-11-20',
        startTime: this.startTime || '09:00',
        endTime: this.endTime || '17:00',
        message: this.message || '',
        status: this.status || 'Pending',
        seeker: this.seeker || null,
        provider: this.provider || null,
        payment: this.payment || { status: 'Pending', transactionId: null, amount: 0, paidAt: null, refundedAt: null },
        createdAt: this.createdAt || new Date()
      };
      inMemoryRequests.push(doc);
      return doc;
    };

    Request.find = function (filter = {}) {
      let filtered = [...inMemoryRequests];
      if (filter.provider) {
        filtered = filtered.filter((r) => r.provider && r.provider.toString() === filter.provider.toString());
      }
      if (filter.seeker) {
        if (typeof filter.seeker === 'object' && filter.seeker.$ne) {
          filtered = filtered.filter((r) => !r.seeker || r.seeker.toString() !== filter.seeker.$ne.toString());
        } else {
          filtered = filtered.filter((r) => r.seeker && r.seeker.toString() === filter.seeker.toString());
        }
      }
      return {
        sort: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
    };

    // Mock RoleChangeRequest
    RoleChangeRequest.findOne = function (filter = {}) {
      let doc = inMemoryRoleRequests.find((r) => {
        if (filter.user && r.user.toString() !== filter.user.toString()) return false;
        if (filter.status && r.status !== filter.status) return false;
        return true;
      });
      return {
        then: (resolve) => resolve(doc || null)
      };
    };

    RoleChangeRequest.findById = function (id) {
      const idStr = id ? id.toString() : '';
      const doc = inMemoryRoleRequests.find((r) => r._id.toString() === idStr);
      if (!doc) {
        return {
          then: (resolve) => resolve(null)
        };
      }
      if (!doc.save) {
        doc.save = async function () { return this; };
      }
      return {
        then: (resolve) => resolve(doc)
      };
    };

    RoleChangeRequest.find = function (filter = {}) {
      let filtered = [...inMemoryRoleRequests];
      if (filter.user) {
        filtered = filtered.filter((r) => r.user.toString() === filter.user.toString());
      }
      if (filter.status) {
        filtered = filtered.filter((r) => r.status === filter.status);
      }
      return {
        sort: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
    };

    RoleChangeRequest.prototype.save = async function () {
      const idStr = this._id ? this._id.toString() : 'rcr-' + Math.random().toString(36).substring(2, 9);
      const existingIdx = inMemoryRoleRequests.findIndex((r) => r._id.toString() === idStr);
      const doc = {
        _id: idStr,
        id: idStr,
        user: this.user,
        requesterName: this.requesterName || 'User',
        requesterEmail: this.requesterEmail || 'user@test.com',
        currentRole: this.currentRole || 'seeker',
        requestedRole: this.requestedRole,
        reason: this.reason || '',
        status: this.status || 'Pending',
        reviewedBy: this.reviewedBy || null,
        reviewedAt: this.reviewedAt || null,
        adminNotes: this.adminNotes || '',
        createdAt: this.createdAt || new Date(),
        updatedAt: new Date(),
        save: async function () {
          Object.assign(this, { updatedAt: new Date() });
          return this;
        }
      };

      if (existingIdx >= 0) {
        inMemoryRoleRequests[existingIdx] = doc;
      } else {
        inMemoryRoleRequests.push(doc);
      }
      return doc;
    };

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    server.close();
    Request.find = origRequestFind;
    Request.findById = origRequestFindById;
    Request.prototype.save = origRequestSave;
    User.find = origUserFind;
    User.findById = origUserFindById;
    Resource.prototype.save = origResourceSave;
    Resource.find = origResourceFind;
    Resource.updateOne = origResourceUpdateOne;
    RoleChangeRequest.find = origRoleReqFind;
    RoleChangeRequest.findOne = origRoleReqFindOne;
    RoleChangeRequest.findById = origRoleReqFindById;
    RoleChangeRequest.prototype.save = origRoleReqSave;

    while (resources.length > initialResourceCount) {
      resources.shift();
    }
  });

  beforeEach(() => {
    inMemoryRequests = [];
    inMemoryResources = [];
    inMemoryRoleRequests = [];

    inMemoryUsers = [
      {
        _id: seekerId,
        id: seekerId,
        fullName: 'Alice Seeker',
        email: 'alice@seeker.com',
        role: 'seeker',
        status: 'Active',
        save: async function () { return this; }
      },
      {
        _id: providerId,
        id: providerId,
        fullName: 'Bob Provider',
        email: 'bob@provider.com',
        role: 'provider',
        status: 'Active',
        save: async function () { return this; }
      },
      {
        _id: bothId,
        id: bothId,
        fullName: 'Charlie Both',
        email: 'charlie@both.com',
        role: 'both',
        status: 'Active',
        save: async function () { return this; }
      },
      {
        _id: otherSeekerId,
        id: otherSeekerId,
        fullName: 'Diana Seeker',
        email: 'diana@seeker.com',
        role: 'seeker',
        status: 'Active',
        save: async function () { return this; }
      },
      {
        _id: adminId,
        id: adminId,
        fullName: 'Eve Admin',
        email: 'admin@resshare.internal',
        role: 'admin',
        status: 'Active',
        save: async function () { return this; }
      },
      {
        _id: secondAdminId,
        id: secondAdminId,
        fullName: 'Frank Admin',
        email: 'admin2@resshare.internal',
        role: 'admin',
        status: 'Active',
        save: async function () { return this; }
      }
    ];
  });

  // -------------------------------------------------------------------------
  // 1. Seeker can create a resource request
  // -------------------------------------------------------------------------
  test('1. Seeker can create a resource request', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        resourceId: 'res-1',
        fullName: 'Alice Seeker',
        businessName: 'Alice Dining',
        email: 'alice@seeker.com',
        phone: '9876543210',
        requestedDate: '2026-11-20',
        startTime: '10:00',
        endTime: '14:00',
        message: 'Looking for morning kitchen prep'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'Pending');
    assert.equal(data.fullName, 'Alice Seeker');
  });

  // -------------------------------------------------------------------------
  // 2. Seeker cannot list/create a resource
  // -------------------------------------------------------------------------
  test('2. Seeker cannot list/create a resource', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        title: 'Unauthorized Kitchen Listing',
        category: 'Commercial Kitchen & Prep',
        hostBusiness: 'Alice Dining',
        location: 'Mumbai, Maharashtra',
        rate: 2500,
        rateUnit: 'hour',
        availability: 'Mon - Fri',
        description: 'Trying to list as seeker',
        specs: ['Commercial oven'],
        houseRules: ['Keep clean'],
        image: 'https://example.com/image.jpg'
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error || '', /(Forbidden|Access denied)/i);
  });

  // -------------------------------------------------------------------------
  // 3. Provider can list/create a resource
  // -------------------------------------------------------------------------
  test('3. Provider can list/create a resource', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        title: 'Bob Commercial Bakery',
        category: 'Commercial Kitchen & Prep',
        hostBusiness: 'Bob Kitchens',
        location: 'Pune, Maharashtra',
        rate: 3500,
        rateUnit: 'hour',
        availability: 'Night Shift (10 PM - 6 AM)',
        description: 'Fully equipped commercial bakehouse',
        specs: ['Deck oven', 'Spiral mixer'],
        houseRules: ['Sanitize upon departure'],
        image: 'https://example.com/bakery.jpg'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.title, 'Bob Commercial Bakery');
    assert.equal(data.provider, providerId);
  });

  // -------------------------------------------------------------------------
  // 4. Provider cannot create a resource request
  // -------------------------------------------------------------------------
  test('4. Provider cannot create a resource request', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        resourceId: 'res-1',
        fullName: 'Bob Provider',
        businessName: 'Bob Kitchens',
        email: 'bob@provider.com',
        phone: '9876543210',
        requestedDate: '2026-11-20',
        startTime: '10:00',
        endTime: '14:00',
        message: 'Provider trying to book a resource'
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error || '', /Provider accounts cannot submit resource requests/i);
  });

  // -------------------------------------------------------------------------
  // 5. Both can create a resource request
  // -------------------------------------------------------------------------
  test('5. Both can create a resource request', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bothToken}`
      },
      body: JSON.stringify({
        resourceId: 'res-1',
        fullName: 'Charlie Both',
        businessName: 'Charlie Dual Co',
        email: 'charlie@both.com',
        phone: '9876543210',
        requestedDate: '2026-11-20',
        startTime: '14:00',
        endTime: '18:00',
        message: 'Dual role account seeking resource'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, 'Pending');
    assert.equal(data.fullName, 'Charlie Both');
  });

  // -------------------------------------------------------------------------
  // 6. Both can list/create a resource
  // -------------------------------------------------------------------------
  test('6. Both can list/create a resource', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bothToken}`
      },
      body: JSON.stringify({
        title: 'Charlie Banquet Hall',
        category: 'Venues & Spaces',
        hostBusiness: 'Charlie Dual Co',
        location: 'Bengaluru, Karnataka',
        rate: 15000,
        rateUnit: 'day',
        availability: 'Weekends Only',
        description: 'Spacious boutique banquet hall',
        specs: ['Seating for 150', 'Projector and AV'],
        houseRules: ['No loud music after 10 PM'],
        image: 'https://example.com/hall.jpg'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.title, 'Charlie Banquet Hall');
    assert.equal(data.provider, bothId);
  });

  // -------------------------------------------------------------------------
  // 7. Both user's own request does NOT appear in provider incoming requests
  // -------------------------------------------------------------------------
  test("7. Both user's own request does NOT appear in provider incoming requests", async () => {
    // Charlie (Both) owns a resource
    const charlieResource = {
      _id: 'charlie-res-1',
      id: 'charlie-res-1',
      title: 'Charlie Private Venue',
      provider: bothId
    };
    inMemoryResources.push(charlieResource);

    // Charlie creates a request for their own resource as a seeker
    inMemoryRequests.push({
      _id: 'req-charlie-self',
      id: 'req-charlie-self',
      resourceId: 'charlie-res-1',
      resourceTitle: 'Charlie Private Venue',
      fullName: 'Charlie Both',
      email: 'charlie@both.com',
      provider: bothId,
      seeker: bothId,
      status: 'Pending',
      createdAt: new Date()
    });

    const res = await fetch(`${baseUrl}/api/requests/incoming`, {
      headers: { Authorization: `Bearer ${bothToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data));
    const selfFound = data.find((r) => (r.seeker === bothId || r.email === 'charlie@both.com'));
    assert.equal(selfFound, undefined, "Both user's own request must be isolated from provider incoming requests");
  });

  // -------------------------------------------------------------------------
  // 8. Other users' requests for a Both user's resource DO appear
  // -------------------------------------------------------------------------
  test("8. Other users' requests for a Both user's resource DO appear", async () => {
    // Another seeker creates a request for Charlie's resource
    inMemoryRequests.push({
      _id: 'req-diana-for-charlie',
      id: 'req-diana-for-charlie',
      resourceId: 'charlie-res-1',
      resourceTitle: 'Charlie Private Venue',
      fullName: 'Diana Seeker',
      email: 'diana@seeker.com',
      provider: bothId,
      seeker: otherSeekerId,
      status: 'Pending',
      createdAt: new Date()
    });

    const res = await fetch(`${baseUrl}/api/requests/incoming`, {
      headers: { Authorization: `Bearer ${bothToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data));
    const dianaReq = data.find((r) => r.email === 'diana@seeker.com');
    assert(dianaReq, "Other user's request for Charlie's resource must appear in incoming requests");
    assert.equal(dianaReq.fullName, 'Diana Seeker');
  });

  // -------------------------------------------------------------------------
  // 9. User can submit account-type change request
  // -------------------------------------------------------------------------
  test('9. User can submit account-type change request', async () => {
    const res = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'We now have our own commercial kitchen to list.'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    const reqItem = data.request || data;
    assert(reqItem);
    assert.equal(reqItem.requestedRole, 'provider');
    assert.equal(reqItem.currentRole, 'seeker');
    assert.equal(reqItem.status, 'Pending');
  });

  // -------------------------------------------------------------------------
  // 10. Invalid requested role is rejected
  // -------------------------------------------------------------------------
  test('10. Invalid requested role is rejected', async () => {
    // Test unsupported role
    const resInvalid = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'superuser',
        reason: 'I want higher access'
      })
    });
    assert.equal(resInvalid.status, 400);

    // Test same role as current
    const resSame = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'seeker',
        reason: 'Already a seeker'
      })
    });
    assert.equal(resSame.status, 400);
  });

  // -------------------------------------------------------------------------
  // 11. Duplicate pending role-change request is rejected
  // -------------------------------------------------------------------------
  test('11. Duplicate pending role-change request is rejected', async () => {
    // Create first request
    const resFirst = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'First pending request'
      })
    });
    assert.equal(resFirst.status, 201);

    // Attempt second request while first is pending
    const resSecond = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'both',
        reason: 'Another attempt while pending'
      })
    });

    assert.equal(resSecond.status, 409);
    const data = await resSecond.json();
    assert.match(data.error || '', /already have a pending/i);
  });

  // -------------------------------------------------------------------------
  // 12. User can view their role-change request status
  // -------------------------------------------------------------------------
  test('12. User can view their role-change request status', async () => {
    // Submit a request first
    await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'Review test'
      })
    });

    const res = await fetch(`${baseUrl}/api/users/role-change-request`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const reqItem = data.request || (Array.isArray(data) ? data[0] : (Array.isArray(data.requests) ? data.requests[0] : null));
    assert(reqItem, 'User should be able to view their role change request');
    assert.equal(reqItem.status, 'Pending');
    assert.equal(reqItem.requestedRole, 'provider');
  });

  // -------------------------------------------------------------------------
  // 13. Admin can view pending role-change requests
  // -------------------------------------------------------------------------
  test('13. Admin can view pending role-change requests', async () => {
    // Submit a request first
    await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'For admin viewing'
      })
    });

    const res = await fetch(`${baseUrl}/api/admin/role-change-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const list = Array.isArray(data.requests) ? data.requests : (Array.isArray(data) ? data : []);
    assert(list.length >= 1, 'Admin should receive list of role change requests');
    const found = list.find((r) => r.requesterEmail === 'alice@seeker.com');
    assert(found, 'Pending request from alice should be found');
    assert.equal(found.status, 'Pending');
  });

  // -------------------------------------------------------------------------
  // 14. Admin can approve a role-change request
  // -------------------------------------------------------------------------
  test('14. Admin can approve a role-change request', async () => {
    // Submit request as Alice Seeker
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'Expanding to provide kitchen'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;
    assert(reqId, 'Request ID must be present');

    const res = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ adminNotes: 'Verified commercial operations' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.status, 'Approved');
    assert.equal(data.request.adminNotes, 'Verified commercial operations');
  });

  // -------------------------------------------------------------------------
  // 15. Admin can reject a role-change request
  // -------------------------------------------------------------------------
  test('15. Admin can reject a role-change request', async () => {
    // Submit request as Bob Provider
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'seeker',
        reason: 'Want to switch'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;
    assert(reqId, 'Request ID must be present');

    const res = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ adminNotes: 'Provider still has active asset listings' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.status, 'Rejected');
  });

  // -------------------------------------------------------------------------
  // 16. Approval actually changes the user's role
  // -------------------------------------------------------------------------
  test("16. Approval actually changes the user's role", async () => {
    // Submit request as Alice Seeker to become provider
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'Ready to host'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;

    // Approve request
    const approveRes = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(approveRes.status, 200);

    // Verify user role is now provider
    const alice = inMemoryUsers.find((u) => u._id === seekerId);
    assert.equal(alice.role, 'provider', "Alice's role must now be provider in the database");
  });

  // -------------------------------------------------------------------------
  // 17. Rejection preserves the user's existing role
  // -------------------------------------------------------------------------
  test("17. Rejection preserves the user's existing role", async () => {
    // Bob is provider. Submit request to become seeker.
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'seeker',
        reason: 'Trying to change role'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;

    // Reject request
    const rejectRes = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(rejectRes.status, 200);

    // Verify Bob's role remains provider
    const bob = inMemoryUsers.find((u) => u._id === providerId);
    assert.equal(bob.role, 'provider', "Bob's role must remain provider after rejection");
  });

  // -------------------------------------------------------------------------
  // 18. Non-admin cannot approve/reject role-change requests
  // -------------------------------------------------------------------------
  test('18. Non-admin cannot approve/reject role-change requests', async () => {
    // Create pending request
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'Non-admin authorization test'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;

    // Seeker trying to approve
    const resSeeker = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      }
    });
    assert.equal(resSeeker.status, 403);

    // Provider trying to reject
    const resProvider = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      }
    });
    assert.equal(resProvider.status, 403);
  });

  // -------------------------------------------------------------------------
  // 19. Already processed requests cannot be processed again
  // -------------------------------------------------------------------------
  test('19. Already processed requests cannot be processed again', async () => {
    // Create and approve request
    const createRes = await fetch(`${baseUrl}/api/users/role-change-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        requestedRole: 'provider',
        reason: 'Duplicate processing test'
      })
    });
    const createdData = await createRes.json();
    const reqId = createdData.request?._id || createdData._id || createdData.id;

    const firstApprove = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(firstApprove.status, 200);

    // Attempting to re-approve
    const resApprove = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(resApprove.status, 400);
    const dataApprove = await resApprove.json();
    assert.match(dataApprove.error || '', /already been approved/i);

    // Attempting to reject an already approved request
    const resReject = await fetch(`${baseUrl}/api/admin/role-change-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(resReject.status, 400);
  });

  // -------------------------------------------------------------------------
  // 20. Existing admin last-admin protection still works
  // -------------------------------------------------------------------------
  test('20. Existing admin last-admin protection still works', async () => {
    // Keep only 1 admin in inMemoryUsers
    inMemoryUsers = inMemoryUsers.filter((u) => u._id !== secondAdminId);
    const admins = inMemoryUsers.filter((u) => u.role === 'admin');
    assert.equal(admins.length, 1, 'Only one admin must remain in system');

    // Attempt to demote the sole admin via admin user management endpoint
    const res = await fetch(`${baseUrl}/api/admin/users/${adminId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ role: 'seeker' })
    });

    // Prohibited by self-demotion and last-admin protection
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error || '', /(Self-demotion prohibited|Cannot demote the last remaining platform administrator)/i);

    // Admin role remains intact
    const admin = inMemoryUsers.find((u) => u._id === adminId);
    assert.equal(admin.role, 'admin');
  });
});
