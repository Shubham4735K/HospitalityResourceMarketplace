/**
 * Receipt and invoice generation utility for ResShare bookings.
 * Phase 14.7 — Structured receipts derived from Booking and successful Charge.
 */

/**
 * Derives a deterministic receipt number from a successful Charge transaction.
 * Preferred format: RCPT-YYYY-XXXX.
 *
 * @param {Object} charge - The successful Charge transaction document/object.
 * @returns {string} Deterministic receipt number.
 */
function deriveReceiptNumber(charge) {
  if (!charge) return '';
  const txnNum = String(charge.transactionNumber || '').trim();
  const match = txnNum.match(/^TXN-(\d{4})-([A-Za-z0-9]+)$/i);
  if (match) {
    return `RCPT-${match[1]}-${match[2].toUpperCase()}`;
  }

  let year = new Date().getFullYear();
  if (charge.createdAt) {
    year = new Date(charge.createdAt).getUTCFullYear();
  } else if (charge._id && typeof charge._id.getTimestamp === 'function') {
    year = charge._id.getTimestamp().getUTCFullYear();
  }

  const source = txnNum || String(charge._id || '0000');
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(36).padStart(4, '0').slice(-4).toUpperCase();
  return `RCPT-${year}-${hex}`;
}

/**
 * Derives a stable ISO issue date from a charge transaction.
 *
 * @param {Object} charge - The Charge transaction.
 * @param {Object} [booking] - Optional booking fallback.
 * @returns {string} ISO timestamp.
 */
function deriveIssueDate(charge, booking) {
  if (charge && charge.createdAt) {
    return new Date(charge.createdAt).toISOString();
  }
  if (charge && charge.updatedAt) {
    return new Date(charge.updatedAt).toISOString();
  }
  if (charge && charge._id && typeof charge._id.getTimestamp === 'function') {
    return charge._id.getTimestamp().toISOString();
  }
  if (booking && booking.createdAt) {
    return new Date(booking.createdAt).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Builds a structured receipt object for a booking and its successful Charge.
 *
 * @param {Object} booking - The booking document/object.
 * @param {Object} charge - The successful Charge transaction document/object.
 * @returns {Object} Structured receipt.
 */
function buildReceipt(booking, charge) {
  const receiptNumber = deriveReceiptNumber(charge);
  const issueDate = deriveIssueDate(charge, booking);
  const currency = booking.currency || charge.currency || 'INR';

  return {
    receiptNumber,
    issueDate,
    bookingNumber: booking.bookingNumber,
    transactionNumber: charge.transactionNumber,
    paymentStatus: 'Paid',
    paymentMethod: charge.paymentMethod,
    currency,
    gatewayRef: charge.gatewayRef || null,
    host: {
      businessName: booking.hostBusiness
    },
    seeker: {
      fullName: booking.seekerFullName,
      businessName: booking.seekerBusiness,
      email: booking.seekerEmail,
      phone: booking.seekerPhone
    },
    resource: {
      resourceId: booking.resourceId,
      title: booking.resourceTitle
    },
    booking: {
      date: booking.requestedDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      billedUnits: booking.billedUnits
    },
    amounts: {
      rate: booking.rate,
      rateUnit: booking.rateUnit,
      subtotal: booking.subtotal,
      total: booking.total,
      bookingTotal: booking.total,
      paidAmount: charge.amount
    }
  };
}

module.exports = {
  deriveReceiptNumber,
  deriveIssueDate,
  buildReceipt
};
