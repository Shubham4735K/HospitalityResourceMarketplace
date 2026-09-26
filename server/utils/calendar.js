/**
 * iCalendar (.ics) generation utility for ResShare bookings.
 */

/**
 * Escapes characters for iCalendar TEXT property values (RFC 5545 §3.3.11).
 * Specifically:
 * - backslash (\) -> \\
 * - semicolon (;) -> \;
 * - comma (,) -> \,
 * - newline -> \n
 *
 * @param {string} text
 * @returns {string}
 */
function escapeIcsText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Formats a date string (YYYY-MM-DD) and time string (HH:mm or HH:mm:ss)
 * into a floating local iCalendar date-time string (YYYYMMDDTHHmmss).
 * Preserves the booking's intended local time semantics.
 *
 * @param {string} dateStr - Date string, e.g. "2026-10-05"
 * @param {string} timeStr - Time string, e.g. "04:00"
 * @returns {string}
 */
function formatIcsDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const dateFormatted = String(dateStr).replace(/-/g, '').trim();
  const timeParts = String(timeStr).trim().split(':');
  const hours = (timeParts[0] || '00').padStart(2, '0');
  const minutes = (timeParts[1] || '00').padStart(2, '0');
  const seconds = (timeParts[2] || '00').padStart(2, '0');
  return `${dateFormatted}T${hours}${minutes}${seconds}`;
}

/**
 * Formats a Date object into a UTC iCalendar timestamp (YYYYMMDDTHHmmssZ).
 *
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function formatIcsUtcTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const mins = pad(date.getUTCMinutes());
  const secs = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

/**
 * Generates an iCalendar (.ics) string for a booking.
 *
 * @param {Object} booking - Booking document/object
 * @param {Object} [resource] - Optional associated resource object
 * @param {Date} [timestampDate] - Optional timestamp for testing
 * @returns {string}
 */
function generateBookingIcs(booking, resource = null, timestampDate = new Date()) {
  const uid = `${booking.bookingNumber || booking._id}@resshare.marketplace`;
  const dtstamp = formatIcsUtcTimestamp(timestampDate);
  const dtstart = formatIcsDateTime(booking.requestedDate, booking.startTime);
  const dtend = formatIcsDateTime(booking.requestedDate, booking.endTime);

  const summary = `ResShare Booking: ${booking.resourceTitle || 'Resource'} (${booking.bookingNumber || booking._id})`;

  const descParts = [];
  if (booking.bookingNumber) descParts.push(`Booking Number: ${booking.bookingNumber}`);
  if (booking.resourceTitle) descParts.push(`Resource: ${booking.resourceTitle}`);
  if (booking.hostBusiness) descParts.push(`Host: ${booking.hostBusiness}`);
  if (booking.seekerFullName || booking.seekerBusiness) {
    const seekerInfo = [booking.seekerFullName, booking.seekerBusiness ? `(${booking.seekerBusiness})` : '']
      .filter(Boolean)
      .join(' ');
    descParts.push(`Seeker: ${seekerInfo}`);
  }
  if (booking.requestedDate && booking.startTime && booking.endTime) {
    descParts.push(`Time: ${booking.requestedDate} ${booking.startTime} - ${booking.endTime}`);
  }
  if (booking.rate !== undefined && booking.rateUnit) {
    descParts.push(`Rate: ${booking.currency || 'INR'} ${booking.rate} per ${booking.rateUnit}`);
  }
  if (booking.total !== undefined) {
    descParts.push(`Total: ${booking.currency || 'INR'} ${booking.total}`);
  }
  if (booking.status) {
    descParts.push(`Status: ${booking.status}`);
  }
  const description = descParts.join('\n');

  let location = booking.location || null;
  if (!location && resource && resource.location) {
    location = resource.location;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HospitalityResourceMarketplace//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`
  ];

  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

module.exports = {
  escapeIcsText,
  formatIcsDateTime,
  formatIcsUtcTimestamp,
  generateBookingIcs
};
