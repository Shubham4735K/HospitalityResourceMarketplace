/**
 * Phase 12.4 — Request Ownership & Authorization Test Suite
 *
 * Dedicated tests verifying request ownership, access control, and authorization:
 *   1. Unauthenticated POST /api/requests → 401
 *   2. Authenticated seeker can create a request → 201
 *   3. Created request stores seeker = authenticated user's ID
 *   4. Created request stores provider = matched provider's ID (derived from resource.hostBusiness)
 *   5. Client cannot override seeker ID
 *   6. Client cannot override provider ID
 *   7. GET /api/requests/my returns only the authenticated seeker's requests
 *   8. GET /api/requests/my does not return another user's requests
 *   9. GET /api/requests/incoming returns only requests belonging to authenticated provider
 *  10. Seeker cannot access provider incoming requests → 403
 *  11. Provider can update status of their own incoming request
 *  12. Provider cannot update another provider's request → 403
 *  13. Seeker cannot update request status → 403
 *  14. Invalid status still returns 400
 *  15. Missing request still returns 404
 *  16. Legacy requests without ownership fields are excluded from ownership queries
 *  17. Public GET /api/requests no longer exposes all requests → 403
 *  18. Unknown resourceId returns 404
 *  19. Resource host with no registered provider returns 404
 *  20. User with role 'both' can access /api/requests/incoming
 *  21. Request schema backward compatibility: legacy requests without seeker/provider validate cleanly
 *
 * Designed with in-memory fixtures to run safely without modifying production MongoDB data.
 *
 * Run:
 *   node server/test_requests_auth.js
 */

"use strict";

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { generateToken } = require("./utils/auth");
const User = require("./models/User");
const Request = require("./models/Request");
const requestRoutes = require("./routes/requests");

// ── In-Memory Fixture State ──────────────────────────────────────────────────
const fixtureUsers = [];
const fixtureRequests = [];

// Helper to create test ObjectId
function makeId() {
  return new mongoose.Types.ObjectId();
}

// ── Test User Fixtures ───────────────────────────────────────────────────────
const seekerId = makeId();
const otherSeekerId = makeId();
const providerId = makeId();
const otherProviderId = makeId();
const bothUserId = makeId();

const seekerUser = {
  _id: seekerId,
  id: seekerId.toString(),
  fullName: "Alice Seeker",
  email: "alice@seeker.test",
  role: "seeker",
  businessProfile: {
    businessName: "Alice Bakery Supplies",
    businessType: "Catering",
    phone: "9123456780",
    city: "Bengaluru"
  }
};

const otherSeekerUser = {
  _id: otherSeekerId,
  id: otherSeekerId.toString(),
  fullName: "Bob Seeker",
  email: "bob@seeker.test",
  role: "seeker",
  businessProfile: {
    businessName: "Bob Event Planners",
    phone: "9876543210"
  }
};

// Matches hostBusiness "The Artisan Loaf & Patisserie" of res-01
const providerUser = {
  _id: providerId,
  id: providerId.toString(),
  fullName: "Pierre Boulanger",
  email: "pierre@artisanloaf.test",
  role: "provider",
  businessProfile: {
    businessName: "The Artisan Loaf & Patisserie",
    businessType: "Artisan Bakery",
    phone: "9988776655",
    city: "Bengaluru"
  }
};

// Matches hostBusiness of a different resource, not res-01
const otherProviderUser = {
  _id: otherProviderId,
  id: otherProviderId.toString(),
  fullName: "Mario Rossi",
  email: "mario@olivebar.test",
  role: "provider",
  businessProfile: {
    businessName: "Olive Bar & Kitchen",
    businessType: "Restaurant",
    phone: "9911223344",
    city: "Mumbai"
  }
};

const bothUser = {
  _id: bothUserId,
  id: bothUserId.toString(),
  fullName: "Sam MultiRole",
  email: "sam@multirole.test",
  role: "both",
  businessProfile: {
    businessName: "Sam Event Spaces",
    phone: "9191919191"
  }
};

fixtureUsers.push(seekerUser, otherSeekerUser, providerUser, otherProviderUser, bothUser);

// ── Legacy Request Fixture (no seeker, no provider) ──────────────────────────
const legacyRequestId = makeId();
const legacyRequest = {
  _id: legacyRequestId,
  id: legacyRequestId.toString(),
  seeker: null,
  provider: null,
  resourceId: "res-01",
  resourceTitle: "Off-Peak Artisan Bakery & Pastry Kitchen",
  fullName: "Legacy Customer",
  businessName: "Legacy Old Corp",
  email: "legacy@oldcorp.test",
  phone: "9000000000",
  requestedDate: "2024-01-15",
  startTime: "06:00",
  endTime: "10:00",
  status: "Pending",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01")
};
fixtureRequests.push(legacyRequest);

// ── Mock Mongoose Static and Instance Methods ────────────────────────────────
User.findById = function (id) {
  const targetId = id ? id.toString() : "";
  const found = fixtureUsers.find((u) => u._id.toString() === targetId);
  return {
    select: function () {
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        toJSON: () => ({ ...found })
      });
    }
  };
};

User.find = function (query) {
  let matched = [...fixtureUsers];
  if (query && query.role && query.role.$in) {
    matched = matched.filter((u) => query.role.$in.includes(u.role));
  }
  return {
    select: function () {
      return Promise.resolve(matched);
    }
  };
};

Request.find = function (query) {
  let matched = [...fixtureRequests];
  if (query) {
    if (query.seeker !== undefined) {
      const qSeeker = query.seeker ? query.seeker.toString() : null;
      matched = matched.filter((r) => r.seeker && r.seeker.toString() === qSeeker);
    }
    if (query.provider !== undefined) {
      const qProvider = query.provider ? query.provider.toString() : null;
      matched = matched.filter((r) => r.provider && r.provider.toString() === qProvider);
    }
  }
  return {
    sort: function () {
      return Promise.resolve(matched);
    }
  };
};

Request.findById = function (id) {
  const targetId = id ? id.toString() : "";
  const found = fixtureRequests.find((r) => r._id.toString() === targetId);
  if (!found) return Promise.resolve(null);

  const doc = new Request(found);
  doc._id = found._id;
  return Promise.resolve(doc);
};

Request.prototype.save = function () {
  const doc = this;
  if (!doc._id) doc._id = makeId();
  doc.status = doc.status || "Pending";
  doc.createdAt = doc.createdAt || new Date();
  doc.updatedAt = new Date();

  const raw = {
    _id: doc._id,
    id: doc._id.toString(),
    seeker: doc.seeker,
    provider: doc.provider,
    resourceId: doc.resourceId,
    resourceTitle: doc.resourceTitle,
    fullName: doc.fullName,
    businessName: doc.businessName,
    email: doc.email,
    phone: doc.phone,
    requestedDate: doc.requestedDate,
    startTime: doc.startTime,
    endTime: doc.endTime,
    message: doc.message,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };

  const existingIdx = fixtureRequests.findIndex((r) => r._id.toString() === doc._id.toString());
  if (existingIdx !== -1) {
    fixtureRequests[existingIdx] = raw;
  } else {
    fixtureRequests.push(raw);
  }

  return Promise.resolve(doc);
};

// ── Test App Setup ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/requests", requestRoutes);

// ── Test Harness ─────────────────────────────────────────────────────────────
let passedCount = 0;
let failedCount = 0;
const testResults = [];

function pass(testName) {
  passedCount++;
  console.log(`  ✓ [PASS] ${testName}`);
  testResults.push({ name: testName, passed: true });
}

function fail(testName, reason) {
  failedCount++;
  console.error(`  ✗ [FAIL] ${testName}`);
  console.error(`         Reason: ${reason}`);
  testResults.push({ name: testName, passed: false, reason });
}

function assert(condition, testName, reason = "Assertion failed") {
  if (condition) pass(testName);
  else fail(testName, reason);
}

// ── HTTP Request Helper ─────────────────────────────────────────────────────
let server;
let serverPort;

function api(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const headers = { "Content-Type": "application/json" };
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options = {
      hostname: "127.0.0.1",
      port: serverPort,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Test Execution ───────────────────────────────────────────────────────────
async function runTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  Phase 12.4 — Request Ownership & Authorization Test Suite");
  console.log("════════════════════════════════════════════════════════════════\n");

  // Tokens
  const seekerToken = generateToken(seekerUser);
  const otherSeekerToken = generateToken(otherSeekerUser);
  const providerToken = generateToken(providerUser);
  const otherProviderToken = generateToken(otherProviderUser);
  const bothToken = generateToken(bothUser);

  let createdRequestId = null;

  // ── 1. Unauthenticated POST /api/requests → 401 ───────────────────────────
  console.log("► Test Group 1: Request Creation Security");
  {
    const res = await api("POST", "/api/requests", {
      resourceId: "res-01",
      requestedDate: "2025-08-01",
      startTime: "05:00",
      endTime: "09:00"
    });
    assert(
      res.status === 401,
      "1. Unauthenticated POST /api/requests → 401",
      `Expected 401, got ${res.status}`
    );
  }

  // ── 2. Authenticated seeker can create a request → 201 ───────────────────
  {
    const res = await api(
      "POST",
      "/api/requests",
      {
        resourceId: "res-01",
        requestedDate: "2025-09-01",
        startTime: "04:00",
        endTime: "08:00",
        message: "Need morning prep space for patisserie batch."
      },
      seekerToken
    );
    assert(
      res.status === 201,
      "2. Authenticated seeker can create a request → 201",
      `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`
    );

    if (res.status === 201) {
      createdRequestId = res.body._id.toString();

      // ── 3. Stored seeker = authenticated user's ID ────────────────────────
      assert(
        res.body.seeker.toString() === seekerId.toString(),
        "3. Created request stores seeker = authenticated user's ID",
        `Expected ${seekerId}, got ${res.body.seeker}`
      );

      // ── 4. Stored provider = matched provider's ID (hostBusiness) ────────
      assert(
        res.body.provider.toString() === providerId.toString(),
        "4. Created request stores provider = matched provider's ID (from hostBusiness)",
        `Expected ${providerId}, got ${res.body.provider}`
      );
    }
  }

  // ── 5. Client cannot override seeker ID ──────────────────────────────────
  {
    const fakeSeekerId = makeId().toString();
    const res = await api(
      "POST",
      "/api/requests",
      {
        resourceId: "res-01",
        requestedDate: "2025-09-02",
        startTime: "04:00",
        endTime: "08:00",
        seeker: fakeSeekerId // attempted injection
      },
      seekerToken
    );
    assert(
      res.status === 201 && res.body.seeker.toString() === seekerId.toString(),
      "5. Client cannot override seeker ID (injected seeker ignored)",
      `Expected ${seekerId}, got ${res.body.seeker}`
    );
  }

  // ── 6. Client cannot override provider ID ────────────────────────────────
  {
    const fakeProviderId = makeId().toString();
    const res = await api(
      "POST",
      "/api/requests",
      {
        resourceId: "res-01",
        requestedDate: "2025-09-03",
        startTime: "04:00",
        endTime: "08:00",
        provider: fakeProviderId // attempted injection
      },
      seekerToken
    );
    assert(
      res.status === 201 && res.body.provider.toString() === providerId.toString(),
      "6. Client cannot override provider ID (injected provider ignored)",
      `Expected ${providerId}, got ${res.body.provider}`
    );
  }

  // ── 7. GET /api/requests/my returns only authenticated seeker's requests ──
  console.log("\n► Test Group 2: Seeker Scoped Queries (/my)");
  {
    const res = await api("GET", "/api/requests/my", null, seekerToken);
    assert(
      res.status === 200,
      "7a. GET /api/requests/my returns 200 for authenticated seeker",
      `Expected 200, got ${res.status}`
    );
    const requests = Array.isArray(res.body) ? res.body : [];
    const allBelongToSeeker = requests.every(
      (r) => r.seeker && r.seeker.toString() === seekerId.toString()
    );
    assert(
      requests.length > 0 && allBelongToSeeker,
      "7b. GET /api/requests/my returns only requests belonging to authenticated seeker",
      `Returned ${requests.length} requests, allBelong: ${allBelongToSeeker}`
    );
  }

  // ── 8. GET /api/requests/my does not return another user's requests ──────
  {
    const res = await api("GET", "/api/requests/my", null, otherSeekerToken);
    assert(
      res.status === 200,
      "8a. Other seeker GET /api/requests/my returns 200",
      `Expected 200, got ${res.status}`
    );
    const requests = Array.isArray(res.body) ? res.body : [];
    const containsAliceRequest = requests.some(
      (r) => r._id.toString() === createdRequestId
    );
    assert(
      !containsAliceRequest,
      "8b. GET /api/requests/my does NOT return another user's requests",
      `Other seeker unexpectedly saw request ${createdRequestId}`
    );
  }

  // ── 9. GET /api/requests/incoming returns only authenticated provider's requests
  console.log("\n► Test Group 3: Provider Incoming Queries (/incoming)");
  {
    const res = await api("GET", "/api/requests/incoming", null, providerToken);
    assert(
      res.status === 200,
      "9a. Provider GET /api/requests/incoming returns 200",
      `Expected 200, got ${res.status}`
    );
    const incoming = Array.isArray(res.body) ? res.body : [];
    const hasCreatedReq = incoming.some(
      (r) => r._id.toString() === createdRequestId
    );
    const allBelongToProvider = incoming.every(
      (r) => r.provider && r.provider.toString() === providerId.toString()
    );
    assert(
      hasCreatedReq && allBelongToProvider,
      "9b. GET /api/requests/incoming returns only requests directed at this provider",
      `Found request: ${hasCreatedReq}, allBelong: ${allBelongToProvider}`
    );
  }

  // ── 10. Seeker cannot access provider incoming requests → 403 ────────────
  {
    const res = await api("GET", "/api/requests/incoming", null, seekerToken);
    assert(
      res.status === 403,
      "10. Seeker cannot access provider incoming requests → 403 Forbidden",
      `Expected 403, got ${res.status}`
    );
  }

  // ── 11. Provider can update status of their own incoming request ───────────
  console.log("\n► Test Group 4: Status Update Authorization (PATCH /:id)");
  {
    const res = await api(
      "PATCH",
      `/api/requests/${createdRequestId}`,
      { status: "Accepted" },
      providerToken
    );
    assert(
      res.status === 200 && res.body.status === "Accepted",
      "11. Provider can update status of their own incoming request (→ Accepted)",
      `Expected 200 & Accepted, got ${res.status} & ${res.body && res.body.status}`
    );
  }

  // ── 12. Provider cannot update another provider's request → 403 ───────────
  {
    const res = await api(
      "PATCH",
      `/api/requests/${createdRequestId}`,
      { status: "Rejected" },
      otherProviderToken
    );
    assert(
      res.status === 403,
      "12. Provider cannot update another provider's request → 403 Forbidden",
      `Expected 403, got ${res.status}`
    );
  }

  // ── 13. Seeker cannot update request status → 403 ──────────────────────────
  {
    const res = await api(
      "PATCH",
      `/api/requests/${createdRequestId}`,
      { status: "Accepted" },
      seekerToken
    );
    assert(
      res.status === 403,
      "13. Seeker cannot update request status (self-approval blocked) → 403 Forbidden",
      `Expected 403, got ${res.status}`
    );
  }

  // ── 14. Invalid status still returns 400 ──────────────────────────────────
  {
    const res = await api(
      "PATCH",
      `/api/requests/${createdRequestId}`,
      { status: "Cancelled" }, // invalid status
      providerToken
    );
    assert(
      res.status === 400,
      "14. Invalid status returns 400 Bad Request",
      `Expected 400, got ${res.status}`
    );
  }

  // ── 15. Missing request still returns 404 ─────────────────────────────────
  {
    const fakeId = makeId().toString();
    const res = await api(
      "PATCH",
      `/api/requests/${fakeId}`,
      { status: "Accepted" },
      providerToken
    );
    assert(
      res.status === 404,
      "15. Missing request returns 404 Not Found",
      `Expected 404, got ${res.status}`
    );
  }

  // ── 16. Legacy requests without ownership are excluded from queries ───────
  console.log("\n► Test Group 5: Backward Compatibility & Legacy Requests");
  {
    const myRes = await api("GET", "/api/requests/my", null, seekerToken);
    const incRes = await api("GET", "/api/requests/incoming", null, providerToken);
    const myIds = (myRes.body || []).map((r) => r._id.toString());
    const incIds = (incRes.body || []).map((r) => r._id.toString());

    const legacyInMy = myIds.includes(legacyRequestId.toString());
    const legacyInInc = incIds.includes(legacyRequestId.toString());

    assert(
      !legacyInMy && !legacyInInc,
      "16. Legacy requests without ownership fields are excluded from /my and /incoming",
      `legacyInMy: ${legacyInMy}, legacyInInc: ${legacyInInc}`
    );
  }

  // ── 17. Public GET /api/requests no longer exposes all requests → 403 ─────
  console.log("\n► Test Group 6: Public Endpoint Deprecation");
  {
    const res = await api("GET", "/api/requests");
    assert(
      res.status === 403,
      "17. Public GET /api/requests no longer exposes all requests → 403 Forbidden",
      `Expected 403, got ${res.status}`
    );
  }

  // ── 18. Unknown resourceId returns 404 ───────────────────────────────────
  console.log("\n► Test Group 7: Edge Cases & Role Verification");
  {
    const res = await api(
      "POST",
      "/api/requests",
      {
        resourceId: "res-UNKNOWN-999",
        requestedDate: "2025-09-01",
        startTime: "04:00",
        endTime: "08:00"
      },
      seekerToken
    );
    assert(
      res.status === 404,
      "18. Unknown resourceId returns 404 Not Found",
      `Expected 404, got ${res.status}`
    );
  }

  // ── 19. Resource host with no registered provider returns 404 ─────────────
  {
    // res-03 has hostBusiness "The Grand Ballroom at Pavilion" which has no user in fixtureUsers
    const res = await api(
      "POST",
      "/api/requests",
      {
        resourceId: "res-03",
        requestedDate: "2025-09-01",
        startTime: "04:00",
        endTime: "08:00"
      },
      seekerToken
    );
    assert(
      res.status === 404,
      "19. Resource host with no registered provider returns 404",
      `Expected 404, got ${res.status}`
    );
  }

  // ── 20. User with role 'both' can access /incoming ───────────────────────
  {
    const res = await api("GET", "/api/requests/incoming", null, bothToken);
    assert(
      res.status === 200,
      "20. User with role 'both' can access /api/requests/incoming",
      `Expected 200, got ${res.status}`
    );
  }

  // ── 21. Request schema validates legacy documents without seeker/provider ──
  {
    const legacyDoc = new Request({
      resourceId: "res-01",
      resourceTitle: "Off-Peak Artisan Bakery & Pastry Kitchen",
      fullName: "Legacy User",
      businessName: "Legacy Kitchen Co",
      email: "legacy@kitchen.test",
      phone: "9876500000",
      requestedDate: "2025-02-01",
      startTime: "08:00",
      endTime: "12:00"
    });
    let validationError = null;
    try {
      await legacyDoc.validate();
    } catch (err) {
      validationError = err;
    }
    assert(
      validationError === null,
      "21. Request schema validates legacy documents without seeker/provider",
      validationError ? validationError.message : ""
    );
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function main() {
  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      console.log(`Test server running on port ${serverPort}`);
      resolve();
    });
  });

  try {
    await runTests();
  } catch (err) {
    console.error("\nUnexpected error during test execution:", err);
    failedCount++;
  } finally {
    server.close();
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`  Summary: ${passedCount} passed, ${failedCount} failed (${passedCount + failedCount} total)`);
  console.log("════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
