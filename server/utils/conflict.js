/**
 * Request conflict detection utility.
 * Under DAY-ONLY availability:
 * - same resource + same date → conflict
 * - same resource + different date → no conflict
 * - different resource + same date → no conflict
 * Time overlap no longer determines whether two bookings conflict.
 */

/**
 * Checks whether two bookings conflict on the same resource and date.
 *
 * @param {string} resourceIdA - First resource ID.
 * @param {string} dateA - First booking date ("YYYY-MM-DD").
 * @param {string} resourceIdB - Second resource ID.
 * @param {string} dateB - Second booking date ("YYYY-MM-DD").
 * @returns {boolean} True if both point to the same resource on the same date.
 */
function hasResourceDateConflict(resourceIdA, dateA, resourceIdB, dateB) {
  if (!resourceIdA || !dateA || !resourceIdB || !dateB) return false;
  return String(resourceIdA).trim() === String(resourceIdB).trim() &&
         String(dateA).trim() === String(dateB).trim();
}

/**
 * Checks whether two booking dates conflict (exact calendar date match).
 *
 * @param {string} dateA - First date ("YYYY-MM-DD").
 * @param {string} dateB - Second date ("YYYY-MM-DD").
 * @returns {boolean} True if dates are identical.
 */
function hasDateConflict(dateA, dateB) {
  if (typeof dateA !== 'string' || typeof dateB !== 'string') return false;
  return dateA.trim() === dateB.trim();
}

/**
 * Legacy time-to-minutes parser maintained for compatibility.
 *
 * @param {string} timeStr - Time string in "HH:mm" format.
 * @param {boolean} [isEndTime=false] - Whether this represents the end boundary of an interval.
 * @returns {number|null} Minutes from midnight or null if invalid.
 */
function parseTimeToMinutes(timeStr, isEndTime = false) {
  if (typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (isEndTime && hours === 23 && minutes === 59) {
    return 24 * 60;
  }

  return hours * 60 + minutes;
}

/**
 * Legacy time-overlap checker maintained for compatibility.
 *
 * @param {string} startA
 * @param {string} endA
 * @param {string} startB
 * @param {string} endB
 * @returns {boolean}
 */
function hasTimeOverlap(startA, endA, startB, endB) {
  const aStart = parseTimeToMinutes(startA, false);
  const aEnd = parseTimeToMinutes(endA, true);
  const bStart = parseTimeToMinutes(startB, false);
  const bEnd = parseTimeToMinutes(endB, true);

  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false;
  }

  return aStart < bEnd && aEnd > bStart;
}

module.exports = {
  hasResourceDateConflict,
  hasDateConflict,
  parseTimeToMinutes,
  hasTimeOverlap
};
