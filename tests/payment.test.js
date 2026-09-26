import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Request = require('../server/models/Request.js');
const Notification = require('../server/models/Notification.js');
const User = require('../server/models/User.js');
const { generateToken } = require('../server/utils/auth.js');
const app = require('../server/server.js');

describe('Phase 14.2 — Payment Lifecycle Tests', () => {
  let server;
  let baseUrl;
  let inMemoryStore = [];
  let inMemoryNotifications = [];
  let inMemoryUsers = [];

  const origFind = Request.find;
  const origFindById = Request.findById;
  const origSave = Request.prototype.save;
  const origNotifSave = Notification.prototype.save;
  const origUserFindById = User.findById;

  const seekerUserId = '60d0fe4f5311236168a109ca';
  const otherUserId = '60d0fe4f5311236168a109cb';
  const providerUserId = '60d0fe4f5311236168a109cc';

  const seekerToken = generateToken(seekerUserId);
  const otherToken = generateToken(otherUserId);
  const providerToken = generateToken(providerUserId);

  before(async () => {
    Request.find = async function (filter = {}) {
      return inMemoryStore.filter((item) => {
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
        providerNotes: this.providerNotes !== undefined ? this.providerNotes : '',
        counterProposal: this.counterProposal || null,
        seeker: this.seeker || null,
        provider: this.provider || null,
        price: this.price || 0,
        payment: this.payment || {
          status: 'Pending',
          transactionId: null,
          amount: 0,
          paidAt: null,
          refundedAt: null
        }
      };
      inMemoryStore.push(doc);
      return doc;
    };

    Notification.prototype.save = async function () {
      const doc = {
        _id: 'mock-notif-' + Math.random().toString(36).substring(2, 9),
        recipient: this.recipient,
        recipientRole: this.recipientRole,
        title: this.title,
        message: this.message,
        requestId: this.requestId,
        resourceTitle: this.resourceTitle,
        read: false,
        createdAt: new Date()
      };
      inMemoryNotifications.push(doc);
      return doc;
    };

    User.findById = async function (id) {
      return inMemoryUsers.find((u) => u._id === id.toString()) || null;
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
    Notification.prototype.save = origNotifSave;
    User.findById = origUserFindById;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    inMemoryStore = [];
    inMemoryNotifications = [];
    inMemoryUsers = [
      {
        _id: seekerUserId,
        role: 'seeker',
        businessProfile: { businessName: 'Flour Power' }
      },
      {
        _id: otherUserId,
        role: 'seeker',
        businessProfile: { businessName: 'Rival Bakery' }
      },
      {
        _id: providerUserId,
        role: 'provider',
        businessProfile: { businessName: 'The French Baker' }
      }
    ];
  });

  describe('1. Mock Payment on Confirmed Booking', () => {
    test('successful payment generates status Paid, transaction ID, payment date, and amount', async () => {
      inMemoryStore.push({
        _id: 'req-confirmed-1',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Confirmed',
        price: 1800,
        seeker: seekerUserId,
        payment: {
          status: 'Pending',
          transactionId: null,
          amount: 1800,
          paidAt: null,
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-confirmed-1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.payment.status, 'Paid');
      assert.ok(data.payment.transactionId);
      assert.ok(data.payment.transactionId.startsWith('TXN-'));
      assert.strictEqual(data.payment.amount, 1800);
      assert.ok(data.payment.paidAt);

      // Verify notification created for provider
      const notif = inMemoryNotifications.find((n) => n.requestId === 'req-confirmed-1');
      assert.ok(notif, 'Payment notification should be generated');
      assert.strictEqual(notif.title, 'Payment Received');
      assert.strictEqual(notif.recipientRole, 'provider');
      assert.ok(notif.message.includes('1800'));
      assert.ok(notif.message.includes(data.payment.transactionId));
    });

    test('amount comes from existing request price or resource rate data', async () => {
      inMemoryStore.push({
        _id: 'req-confirmed-no-price',
        resourceId: 'res-01', // res-01 has rate: 1800 in resources.js
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Confirmed',
        seeker: seekerUserId,
        payment: {
          status: 'Pending',
          transactionId: null,
          amount: 0,
          paidAt: null,
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-confirmed-no-price/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.payment.status, 'Paid');
      assert.strictEqual(data.payment.amount, 1800); // reused from res-01 rate
    });

    test('payment must not be created twice for the same booking (duplicate rejected)', async () => {
      inMemoryStore.push({
        _id: 'req-already-paid',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Confirmed',
        seeker: seekerUserId,
        payment: {
          status: 'Paid',
          transactionId: 'TXN-12345',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-already-paid/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('already been paid'));
    });

    test('payment rejected for non-Confirmed statuses (Pending, Accepted, Cancelled, Completed)', async () => {
      const statuses = ['Pending', 'Accepted', 'Cancelled', 'Completed'];

      for (const st of statuses) {
        const reqId = `req-status-${st.toLowerCase()}`;
        inMemoryStore.push({
          _id: reqId,
          resourceId: 'res-01',
          resourceTitle: 'Commercial Deck Oven',
          fullName: 'Alice Baker',
          businessName: 'Flour Power',
          email: 'alice@flourpower.com',
          phone: '+91 99999 11111',
          requestedDate: '2026-10-05',
          startTime: '05:00',
          endTime: '08:00',
          status: st,
          seeker: seekerUserId,
          payment: {
            status: 'Pending',
            transactionId: null,
            amount: 1800,
            paidAt: null,
            refundedAt: null
          }
        });

        const res = await fetch(`${baseUrl}/api/requests/${reqId}/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${seekerToken}`
          }
        });

        assert.strictEqual(res.status, 400, `Payment on status ${st} should be rejected with 400`);
        const body = await res.json();
        assert.ok(body.error.includes('Confirmed'));
      }
    });

    test('only the authorized seeker can make the payment (unauthorized rejected)', async () => {
      inMemoryStore.push({
        _id: 'req-auth-check',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Confirmed',
        seeker: seekerUserId,
        payment: {
          status: 'Pending',
          transactionId: null,
          amount: 1800,
          paidAt: null,
          refundedAt: null
        }
      });

      // 1. Without auth token -> 401
      const noAuthRes = await fetch(`${baseUrl}/api/requests/req-auth-check/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.strictEqual(noAuthRes.status, 401);

      // 2. With different seeker token -> 403
      const wrongUserRes = await fetch(`${baseUrl}/api/requests/req-auth-check/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherToken}`
        }
      });
      assert.strictEqual(wrongUserRes.status, 403);
      const wrongBody = await wrongUserRes.json();
      assert.ok(wrongBody.error.toLowerCase().includes('unauthorized'));

      // 3. With provider token -> 403
      const providerPayRes = await fetch(`${baseUrl}/api/requests/req-auth-check/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`
        }
      });
      assert.strictEqual(providerPayRes.status, 403);
      const providerBody = await providerPayRes.json();
      assert.ok(providerBody.error.toLowerCase().includes('unauthorized'));
    });
  });

  describe('2. Mock Refund Lifecycle', () => {
    test('refund succeeds for an eligible Paid booking that has been Cancelled', async () => {
      inMemoryStore.push({
        _id: 'req-paid-cancelled',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Cancelled',
        seeker: seekerUserId,
        payment: {
          status: 'Paid',
          transactionId: 'TXN-INITIAL-12345',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-paid-cancelled/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.payment.status, 'Refunded');
      // Rule 9: Refund preserves the transaction ID
      assert.strictEqual(data.payment.transactionId, 'TXN-INITIAL-12345');
      assert.ok(data.payment.refundedAt);

      // Rule 11: Notification for refund
      const notif = inMemoryNotifications.find((n) => n.requestId === 'req-paid-cancelled');
      assert.ok(notif, 'Refund notification should be generated');
      assert.strictEqual(notif.title, 'Payment Refunded');
      assert.strictEqual(notif.recipientRole, 'seeker');
      assert.ok(notif.message.includes('1800'));
      assert.ok(notif.message.includes('TXN-INITIAL-12345'));
    });

    test('refund rejected if booking is not Cancelled', async () => {
      inMemoryStore.push({
        _id: 'req-paid-confirmed',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Confirmed',
        seeker: seekerUserId,
        payment: {
          status: 'Paid',
          transactionId: 'TXN-CONFIRMED-999',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-paid-confirmed/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('cancelled'));
    });

    test('refund rejected if booking was never Paid', async () => {
      inMemoryStore.push({
        _id: 'req-unpaid-cancelled',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Cancelled',
        seeker: seekerUserId,
        payment: {
          status: 'Pending',
          transactionId: null,
          amount: 1800,
          paidAt: null,
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-unpaid-cancelled/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('not been paid'));
    });

    test('duplicate refund rejected', async () => {
      inMemoryStore.push({
        _id: 'req-already-refunded',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Cancelled',
        seeker: seekerUserId,
        payment: {
          status: 'Refunded',
          transactionId: 'TXN-REFUNDED-ALREADY',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: new Date().toISOString()
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-already-refunded/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seekerToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('already been refunded'));
    });

    test('provider must NOT be able to initiate a refund (rejected with 403)', async () => {
      inMemoryStore.push({
        _id: 'req-provider-refund-attempt',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Cancelled',
        seeker: seekerUserId,
        provider: providerUserId,
        payment: {
          status: 'Paid',
          transactionId: 'TXN-PROVIDER-ATTEMPT',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-provider-refund-attempt/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerToken}`
        }
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('unauthorized'));
    });

    test('unauthorized user cannot initiate a refund (rejected with 403)', async () => {
      inMemoryStore.push({
        _id: 'req-other-user-refund',
        resourceId: 'res-01',
        resourceTitle: 'Commercial Deck Oven',
        fullName: 'Alice Baker',
        businessName: 'Flour Power',
        email: 'alice@flourpower.com',
        phone: '+91 99999 11111',
        requestedDate: '2026-10-05',
        startTime: '05:00',
        endTime: '08:00',
        status: 'Cancelled',
        seeker: seekerUserId,
        payment: {
          status: 'Paid',
          transactionId: 'TXN-OTHER-ATTEMPT',
          amount: 1800,
          paidAt: new Date().toISOString(),
          refundedAt: null
        }
      });

      const res = await fetch(`${baseUrl}/api/requests/req-other-user-refund/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherToken}`
        }
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('unauthorized'));
    });
  });
});
