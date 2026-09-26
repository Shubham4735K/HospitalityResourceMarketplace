/**
 * Frontend API client for ResShare bookings, payments, cancellations, calendar, and receipts.
 * Phase 14.8a — Frontend API foundation
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://hospitalityresourcemarketplace.onrender.com';

/**
 * Confirms an accepted request into a booking.
 * POST /api/requests/:id/confirm
 *
 * @param {string} requestId
 * @returns {Promise<{ success: boolean, message: string, booking: Object, request: Object }>}
 */
export async function confirmBooking(requestId) {
  const response = await fetch(`${API_BASE_URL}/api/requests/${requestId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.reason || data.error || 'Failed to confirm booking');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/**
 * Simulates a payment for a confirmed booking.
 * POST /api/bookings/:id/pay
 *
 * @param {string} bookingId
 * @param {string} [paymentMethod='UPI'] - 'UPI' | 'Card' | 'NetBanking'
 * @returns {Promise<{ success: boolean, message: string, transaction: Object, booking: Object }>}
 */
export async function payBooking(bookingId, paymentMethod = 'UPI') {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paymentMethod })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.reason || data.error || 'Payment failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/**
 * Cancels a confirmed booking and initiates a refund if paid.
 * POST /api/bookings/:id/cancel
 *
 * @param {string} bookingId
 * @returns {Promise<{ success: boolean, message: string, booking: Object, refund: Object|null }>}
 */
export async function cancelBooking(bookingId) {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.reason || data.error || 'Failed to cancel booking');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/**
 * Fetches the structured receipt for a paid booking.
 * GET /api/bookings/:id/receipt
 *
 * @param {string} bookingId
 * @returns {Promise<{ success: boolean, receipt: Object }>}
 */
export async function getReceipt(bookingId) {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/receipt`);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.reason || data.error || 'Failed to load receipt');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/**
 * Fetches the iCalendar (.ics) export for a booking and provides download information.
 * GET /api/bookings/:id/calendar
 *
 * @param {string} bookingId
 * @returns {Promise<{ blob: Blob, filename: string, download: Function }>}
 */
export async function downloadCalendar(bookingId) {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/calendar`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.reason || data.error || 'Failed to download calendar event');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // Extract filename from Content-Disposition header if available
  const disposition = response.headers.get('content-disposition');
  let filename = `booking-${bookingId}.ics`;
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  return {
    blob,
    filename,
    download: () => {
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    }
  };
}

export { API_BASE_URL };
