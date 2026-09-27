import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const User = require('../server/models/User.js');
const Resource = require('../server/models/Resource.js');
const resources = require('../server/data/resources.js');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('ResShare — List a Resource End-to-End Tests', () => {
  let server;
  let baseUrl;
  let inMemoryRequests = [];
  let inMemoryUsers = [];
  let inMemoryResources = [];

  const origRequestFind = Request.find;
  const origRequestFindById = Request.findById;
  const origRequestSave = Request.prototype.save;
  const origUserFind = User.find;
  const origUserFindById = User.findById;
  const origResourceSave = Resource.prototype.save;
  const origResourceFind = Resource.find;
  const origResourceUpdateOne = Resource.updateOne;

  const providerId = '60d0fe4f5311236168a109c1';
  const seekerId = '60d0fe4f5311236168a109b1';
  const bothId = '60d0fe4f5311236168a109d1';
  const adminId = '60d0fe4f5311236168a109a1';
  const suspendedProviderId = '60d0fe4f5311236168a109e1';

  const providerToken = generateToken(providerId);
  const seekerToken = generateToken(seekerId);
  const bothToken = generateToken(bothId);
  const adminToken = generateToken(adminId);
  const suspendedToken = generateToken(suspendedProviderId);

  const initialResourceCount = resources.length;

  before(async () => {
    // Mock Resource.prototype.save
    Resource.prototype.save = async function () {
      const doc = {
        _id: this._id || 'res-db-' + Math.random().toString(36).substring(2, 9),
        id: this.id,
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

    // Mock Resource.find
    Resource.find = function () {
      return {
        lean: function () {
          return Promise.resolve(inMemoryResources);
        },
        then: function (resolve) {
          resolve(inMemoryResources);
        }
      };
    };

    // Mock Resource.updateOne
    Resource.updateOne = async function (filter = {}, update = {}) {
      const found = inMemoryResources.find((r) => r.id === filter.id);
      if (found && update.$set) {
        Object.assign(found, update.$set);
      }
      return { matchedCount: found ? 1 : 0, modifiedCount: found ? 1 : 0 };
    };

    // Mock Request.prototype.save
    Request.prototype.save = async function () {
      const doc = {
        _id: this._id || 'mock-req-' + Math.random().toString(36).substring(2, 9),
        resourceId: this.resourceId,
        resourceTitle: this.resourceTitle || 'Resource Title',
        fullName: this.fullName || 'Test Seeker',
        businessName: this.businessName || 'Seeker Biz',
        email: this.email || 'seeker@test.com',
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

    // Mock Request.find
    Request.find = function (filter = {}) {
      const filtered = inMemoryRequests.filter((item) => {
        if (filter.resourceId && item.resourceId !== filter.resourceId) return false;
        if (filter.requestedDate && item.requestedDate !== filter.requestedDate) return false;
        return true;
      });
      return {
        sort: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
    };

    // Mock User.findById
    User.findById = function (id) {
      const u = inMemoryUsers.find((user) => user._id === id.toString()) || null;
      if (!u) {
        return {
          select: () => Promise.resolve(null),
          then: (resolve) => resolve(null)
        };
      }
      return {
        select: () => Promise.resolve(u),
        then: (resolve) => resolve(u)
      };
    };

    // Mock User.find
    User.find = function () {
      return {
        select: () => Promise.resolve(inMemoryUsers),
        then: (resolve) => resolve(inMemoryUsers)
      };
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

    // Clean up created resources from global in-memory array
    while (resources.length > initialResourceCount) {
      resources.shift();
    }
  });

  beforeEach(() => {
    inMemoryUsers = [
      {
        _id: providerId,
        fullName: 'Chef Marco Rossi',
        email: 'marco@artisanbakery.com',
        role: 'provider',
        status: 'Active',
        businessProfile: {
          businessName: 'The Artisan Bakery Co',
          city: 'Indiranagar, Bengaluru'
        }
      },
      {
        _id: seekerId,
        fullName: 'Sara Khan',
        email: 'sara@cateringcloud.com',
        role: 'seeker',
        status: 'Active',
        businessProfile: {
          businessName: 'Cloud Feasts Catering',
          city: 'Koramangala, Bengaluru'
        }
      },
      {
        _id: bothId,
        fullName: 'David Lee',
        email: 'david@bistrohosp.com',
        role: 'both',
        status: 'Active',
        businessProfile: {
          businessName: 'Bistro Collective',
          city: 'Bandra, Mumbai'
        }
      },
      {
        _id: adminId,
        fullName: 'Platform Admin',
        email: 'admin@resshare.internal',
        role: 'admin',
        status: 'Active'
      },
      {
        _id: suspendedProviderId,
        fullName: 'Suspended Provider',
        email: 'suspended@provider.com',
        role: 'provider',
        status: 'Suspended',
        businessProfile: {
          businessName: 'Suspended Kitchens'
        }
      }
    ];
  });

  // 1. Successful Resource Creation Flow
  test('1. Authenticated provider can list a new resource successfully', async () => {
    const payload = {
      title: 'Commercial Steam Convection Kitchen',
      category: 'Commercial Kitchen & Prep',
      location: 'Indiranagar, Bengaluru',
      rate: 2200,
      rateUnit: 'hour',
      availability: 'Mon–Sat, 5:00 AM – 1:00 PM',
      description: 'Fully equipped production kitchen with double combi-ovens, pass-through dishwashers, and dry storage racks.',
      specs: ['2x Rational Combi Ovens', 'Hobart Planetary Mixer', '3-compartment sink'],
      houseRules: ['FSSAI required', 'Clean after use'],
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80'
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();

    assert.ok(data.id, 'Resource should have a generated string id');
    assert.equal(data.title, payload.title);
    assert.equal(data.category, payload.category);
    assert.equal(data.location, payload.location);
    assert.equal(data.rate, 2200);
    assert.equal(data.rateUnit, 'hour');
    assert.equal(data.hostBusiness, 'The Artisan Bakery Co');
    assert.equal(data.provider, providerId);
    assert.equal(data.verified, true);
    assert.equal(data.disabled, false);
    assert.deepEqual(data.specs, payload.specs);
    assert.deepEqual(data.houseRules, payload.houseRules);

    // Verify it is saved in the MongoDB mock
    assert.ok(
      inMemoryResources.some((r) => r.id === data.id),
      'Resource should be persisted to MongoDB'
    );
  });

  // 2. Newly Created Resource Appears in Marketplace
  test('2. Newly listed resource immediately appears in GET /api/resources', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    assert.equal(res.status, 200);
    const allResources = await res.json();

    const created = allResources.find((r) => r.title === 'Commercial Steam Convection Kitchen');
    assert.ok(created, 'Created resource must appear in GET /api/resources list');
    assert.equal(created.rate, 2200);
    assert.equal(created.provider, providerId);
  });

  // 3. Lookup by ID
  test('3. Newly created resource is retrievable via GET /api/resources/:id', async () => {
    const createdResource = resources.find((r) => r.title === 'Commercial Steam Convection Kitchen');
    assert.ok(createdResource, 'Must find created resource in memory');

    const res = await fetch(`${baseUrl}/api/resources/${createdResource.id}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, createdResource.id);
    assert.equal(data.title, 'Commercial Steam Convection Kitchen');
  });

  // 4. Provider's own resources
  test('4. Provider can retrieve their listed resources via GET /api/resources/my', async () => {
    const res = await fetch(`${baseUrl}/api/resources/my`, {
      headers: {
        Authorization: `Bearer ${providerToken}`
      }
    });

    assert.equal(res.status, 200);
    const myResources = await res.json();
    assert.ok(Array.isArray(myResources));
    assert.ok(myResources.some((r) => r.title === 'Commercial Steam Convection Kitchen'));
  });

  // 5. Dual-Role ("both") user can create resource
  test('5. Dual-role (both) user can list a resource successfully', async () => {
    const payload = {
      title: 'Rooftop Banquet Terrace & Bar',
      category: 'Venues & Spaces',
      location: 'Bandra, Mumbai',
      rate: 35000,
      rateUnit: 'day',
      description: 'Scenic outdoor terrace suitable for private dining events, pop-ups, and corporate dinners.',
      specs: ['150 Person Capacity', 'Integrated Sound System', 'Prep Pantry'],
      houseRules: ['Noise curfew at 11 PM', 'Outside catering allowed']
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bothToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.title, payload.title);
    assert.equal(data.provider, bothId);
  });

  // 6. Admin can create resource
  test('6. Admin user can list a resource successfully', async () => {
    const payload = {
      title: 'Industrial Gelato & Ice Cream Machine',
      category: 'Commercial Equipment',
      location: 'Whitefield, Bengaluru',
      rate: 800,
      rateUnit: 'hour',
      description: 'Carpigiani batch freezer for small-batch artisan gelato production.',
      specs: ['Carpigiani Labo 14 20', 'Water-cooled condenser']
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.title, payload.title);
    assert.equal(data.provider, adminId);
  });

  // 7. Seeker role cannot create a resource
  test('7. Seeker role is forbidden from creating a resource (returns 403)', async () => {
    const payload = {
      title: 'Unauthorized Seeker Resource',
      category: 'Venues & Spaces',
      location: 'Bengaluru',
      rate: 5000,
      description: 'Should not be allowed'
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes('Insufficient role') || data.error.includes('Forbidden'));
  });

  // 8. Unauthenticated request rejected
  test('8. Unauthenticated request without token returns 401', async () => {
    const payload = {
      title: 'Unauthenticated Kitchen',
      category: 'Commercial Kitchen & Prep',
      location: 'Indiranagar',
      rate: 1500,
      description: 'No token'
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 401);
  });

  // 9. Invalid token rejected
  test('9. Invalid/malformed JWT token returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.token.garbage'
      },
      body: JSON.stringify({
        title: 'Bad Token Kitchen',
        category: 'Commercial Kitchen & Prep',
        location: 'Bengaluru',
        rate: 1000,
        description: 'Should fail'
      })
    });

    assert.equal(res.status, 401);
  });

  // 10. Suspended account rejected
  test('10. Suspended provider account returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${suspendedToken}`
      },
      body: JSON.stringify({
        title: 'Suspended Kitchen',
        category: 'Commercial Kitchen & Prep',
        location: 'Bengaluru',
        rate: 1000,
        description: 'Should fail due to suspended account'
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes('suspended'));
  });

  // 11-17. Field Validations
  test('11. Missing title returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        category: 'Commercial Kitchen & Prep',
        location: 'Bengaluru',
        rate: 1500,
        description: 'Valid description'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.toLowerCase().includes('title'));
  });

  test('12. Whitespace-only title returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        title: '   ',
        category: 'Commercial Kitchen & Prep',
        location: 'Bengaluru',
        rate: 1500,
        description: 'Valid description'
      })
    });
    assert.equal(res.status, 400);
  });

  test('13. Invalid category returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        title: 'Spaceship Dock',
        category: 'Intergalactic Ports',
        location: 'Bengaluru',
        rate: 1500,
        description: 'Valid description'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.toLowerCase().includes('category'));
  });

  test('14. Missing location returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        title: 'Cozy Prep Station',
        category: 'Commercial Kitchen & Prep',
        rate: 1500,
        description: 'Valid description'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.toLowerCase().includes('location'));
  });

  test('15. Missing or invalid rate returns 400', async () => {
    const testCases = [null, undefined, 0, -500, 'free'];
    for (const rate of testCases) {
      const res = await fetch(`${baseUrl}/api/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
        body: JSON.stringify({
          title: 'Cozy Prep Station',
          category: 'Commercial Kitchen & Prep',
          location: 'Bengaluru',
          rate,
          description: 'Valid description'
        })
      });
      assert.equal(res.status, 400, `Rate ${rate} should fail validation`);
    }
  });

  test('16. Missing description returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        title: 'Cozy Prep Station',
        category: 'Commercial Kitchen & Prep',
        location: 'Bengaluru',
        rate: 1500
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.toLowerCase().includes('description'));
  });

  // 17. Booking a newly created resource links to provider automatically
  test('17. Seeker can request newly created resource and provider is automatically linked', async () => {
    const createdResource = resources.find((r) => r.title === 'Commercial Steam Convection Kitchen');
    assert.ok(createdResource);

    const requestPayload = {
      resourceId: createdResource.id,
      resourceTitle: createdResource.title,
      fullName: 'Sara Khan',
      businessName: 'Cloud Feasts Catering',
      email: 'sara@cateringcloud.com',
      phone: '9876543210',
      requestedDate: '2026-11-25',
      startTime: '08:00',
      endTime: '12:00',
      message: 'Need the steam combi ovens for a catering prep shift.'
    };

    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify(requestPayload)
    });

    assert.equal(res.status, 201);
    const savedReq = await res.json();
    assert.equal(savedReq.resourceId, createdResource.id);
    assert.equal(savedReq.provider, providerId, 'Request must automatically link to the resource provider');
    assert.equal(savedReq.seeker, seekerId);
  });

  // 18. No duplicate resources on multiple calls or syncs
  test('18. Multiple calls to GET /api/resources do NOT duplicate items', async () => {
    const res1 = await fetch(`${baseUrl}/api/resources`);
    const data1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/resources`);
    const data2 = await res2.json();

    assert.equal(data1.length, data2.length, 'Resource count must remain consistent across requests');
    const ids = data2.map((r) => r.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, 'All resource IDs in marketplace must be unique');
  });

  // 19. Newly created resource appears in admin resources and can be disabled
  test('19. Admin resource moderation table includes newly created resource and can disable it', async () => {
    const createdResource = resources.find((r) => r.title === 'Commercial Steam Convection Kitchen');
    assert.ok(createdResource);

    // Fetch admin resources
    const res = await fetch(`${baseUrl}/api/admin/resources`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(res.status, 200);
    const adminResources = await res.json();
    const foundAdminRes = adminResources.find((r) => r.id === createdResource.id);
    assert.ok(foundAdminRes, 'Newly created resource must be listed in admin resources');
    assert.equal(foundAdminRes.disabled, false);

    // Admin disables this newly created resource
    const patchRes = await fetch(`${baseUrl}/api/admin/resources/${createdResource.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ disabled: true, reason: 'Maintenance inspection' })
    });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.resource.disabled, true);
    assert.equal(patchData.resource.status, 'Disabled');
  });

  // 20. Disabled newly created resource rejects new booking requests
  test('20. Disabled newly created resource cannot receive new booking requests (returns 400)', async () => {
    const createdResource = resources.find((r) => r.title === 'Commercial Steam Convection Kitchen');
    assert.ok(createdResource);
    assert.equal(createdResource.disabled, true);

    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        resourceId: createdResource.id,
        resourceTitle: createdResource.title,
        fullName: 'Sara Khan',
        businessName: 'Cloud Feasts Catering',
        email: 'sara@cateringcloud.com',
        phone: '9876543210',
        requestedDate: '2026-11-26',
        startTime: '08:00',
        endTime: '12:00'
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('disabled'));

    // Restore resource back to active
    await fetch(`${baseUrl}/api/admin/resources/${createdResource.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ disabled: false })
    });
  });

  // 21. Newly created resources are included in admin analytics and utilization metrics
  test('21. Newly created resources are reflected in totalResources count and utilization list', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    assert.equal(res.status, 200);
    const analytics = await res.json();
    assert.ok(analytics.overview.totalResources >= initialResourceCount + 1);

    const hasNewResInUtilization = analytics.resourceUtilization.some(
      (item) => item.title === 'Commercial Steam Convection Kitchen'
    );
    assert.ok(hasNewResInUtilization, 'Resource must appear in analytics utilization list');
  });

  // 22. Static resources remain available and functional
  test('22. Original static resources remain fully functional for requests alongside newly created resources', async () => {
    const staticRes = resources.find((r) => r.id === 'res-01');
    assert.ok(staticRes, 'Static resource res-01 must still exist');

    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${seekerToken}`
      },
      body: JSON.stringify({
        resourceId: 'res-01',
        resourceTitle: staticRes.title,
        fullName: 'Sara Khan',
        businessName: 'Cloud Feasts Catering',
        email: 'sara@cateringcloud.com',
        phone: '9876543210',
        requestedDate: '2026-12-05',
        startTime: '05:00',
        endTime: '09:00',
        message: 'Morning pastry shift'
      })
    });

    assert.equal(res.status, 201);
    const saved = await res.json();
    assert.equal(saved.resourceId, 'res-01');
  });

  // 23. Photo upload with base64 data URL
  test('23. Provider can list a resource with a base64 data URL photo', async () => {
    const dataUrlImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const payload = {
      title: 'Artisan Sourdough Proofing Room',
      category: 'Commercial Kitchen & Prep',
      location: 'Koramangala, Bengaluru',
      rate: 1400,
      description: 'Climate-controlled proofing chamber for sourdough baking.',
      image: dataUrlImage
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.image, dataUrlImage, 'Base64 data URL must be preserved');

    // Retrieve via GET /api/resources/:id
    const getRes = await fetch(`${baseUrl}/api/resources/${data.id}`);
    assert.equal(getRes.status, 200);
    const retrieved = await getRes.json();
    assert.equal(retrieved.image, dataUrlImage);
  });

  // 24. Local filesystem path is sanitized to default image
  test('24. Local filesystem path in image field is safely sanitized to default image', async () => {
    const payload = {
      title: 'Banquet Space with Local Path',
      category: 'Venues & Spaces',
      location: 'Bengaluru',
      rate: 15000,
      description: 'Should not accept local paths.',
      image: 'C:\\Users\\admin\\photos\\banquet.jpg'
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.image.startsWith('https://'), 'Local filesystem path must be sanitized to default web image');
    assert.ok(!data.image.includes('C:\\Users'));
  });

  // 25. Omitted photo safely falls back to default image
  test('25. Omitted or empty photo safely falls back to default image', async () => {
    const payload = {
      title: 'Beverage Dispensing System',
      category: 'Commercial Equipment',
      location: 'Bengaluru',
      rate: 900,
      description: 'Commercial beverage and nitro tap system.',
      image: ''
    };

    const res = await fetch(`${baseUrl}/api/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.image.startsWith('https://'), 'Empty photo must use default image');
  });
});
