import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Transaction = require('../server/models/Transaction.js');

describe('Phase 14.2 — Transaction Model Schema Validation', () => {
  const validTransactionData = {
    transactionNumber: 'TXN-2026-0001',
    bookingId: new mongoose.Types.ObjectId(),
    type: 'Charge',
    amount: 12600,
    currency: 'INR',
    status: 'Pending',
    paymentMethod: 'Card',
    gatewayRef: 'ch_mock_123456'
  };

  test('valid transaction document passes schema validation', () => {
    const txn = new Transaction(validTransactionData);
    const error = txn.validateSync();
    assert.strictEqual(error, undefined);
  });

  test('applies default status "Pending" and currency "INR"', () => {
    const { status, currency, ...dataWithoutDefaults } = validTransactionData;
    const txn = new Transaction(dataWithoutDefaults);
    assert.strictEqual(txn.status, 'Pending');
    assert.strictEqual(txn.currency, 'INR');
    const error = txn.validateSync();
    assert.strictEqual(error, undefined);
  });

  test('accepts all allowed transaction types ("Charge", "Deposit", "Refund", "Payout")', () => {
    const allowedTypes = ['Charge', 'Deposit', 'Refund', 'Payout'];
    for (const type of allowedTypes) {
      const txn = new Transaction({ ...validTransactionData, type });
      const error = txn.validateSync();
      assert.strictEqual(error, undefined, `Type "${type}" should be valid`);
    }
  });

  test('rejects invalid transaction types', () => {
    const invalidTypes = ['Payment', 'Transfer', 'Credit', 'Withdrawal'];
    for (const type of invalidTypes) {
      const txn = new Transaction({ ...validTransactionData, type });
      const error = txn.validateSync();
      assert.ok(error, `Type "${type}" should be rejected`);
      assert.ok(error.errors.type, 'Should contain type validation error');
    }
  });

  test('accepts all allowed transaction statuses ("Pending", "Success", "Failed", "Refunded")', () => {
    const allowedStatuses = ['Pending', 'Success', 'Failed', 'Refunded'];
    for (const status of allowedStatuses) {
      const txn = new Transaction({ ...validTransactionData, status });
      const error = txn.validateSync();
      assert.strictEqual(error, undefined, `Status "${status}" should be valid`);
    }
  });

  test('rejects invalid transaction statuses', () => {
    const invalidStatuses = ['Completed', 'Confirmed', 'Void', 'Cancelled', 'Authorized'];
    for (const status of invalidStatuses) {
      const txn = new Transaction({ ...validTransactionData, status });
      const error = txn.validateSync();
      assert.ok(error, `Status "${status}" should be rejected`);
      assert.ok(error.errors.status, 'Should contain status validation error');
    }
  });

  test('enforces required fields', () => {
    const requiredFields = [
      'transactionNumber',
      'bookingId',
      'type',
      'amount',
      'paymentMethod'
    ];

    for (const field of requiredFields) {
      const data = { ...validTransactionData };
      delete data[field];
      const txn = new Transaction(data);
      const error = txn.validateSync();
      assert.ok(error, `Missing field "${field}" should cause validation error`);
      assert.ok(error.errors[field], `Error should be on "${field}"`);
    }
  });

  test('rejects negative amount', () => {
    const txn = new Transaction({ ...validTransactionData, amount: -100 });
    const error = txn.validateSync();
    assert.ok(error, 'Negative amount should be rejected');
    assert.ok(error.errors.amount, 'Error should be on amount');
  });

  test('accepts zero amount (e.g. for non-charge records or zero-fee adjustments)', () => {
    const txn = new Transaction({ ...validTransactionData, amount: 0 });
    const error = txn.validateSync();
    assert.strictEqual(error, undefined);
  });

  test('gatewayRef is optional and defaults to null', () => {
    const { gatewayRef, ...dataWithoutRef } = validTransactionData;
    const txn = new Transaction(dataWithoutRef);
    assert.strictEqual(txn.gatewayRef, null);
    const error = txn.validateSync();
    assert.strictEqual(error, undefined);
  });
});
