/**
 * Request conflict and time overlap detection utility.
 */

/**
 * Converts an "HH:mm" time string to minutes from the start of the day (0–1440).
 * When isEndTime is true and the time is "23:59", returns 1440 (24h)
 * to represent the complete end of the 24-hour day.
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
 * Checks whether two time intervals [startA, endA] and [startB, endB] overlap on the same date.
 *
 * Two intervals overlap if and only if:
 * startA < endB && endA > startB
 *
 * Adjacent/back-to-back bookings (e.g. 10:00–12:00 and 12:00–14:00) do NOT overlap.
 *
 * @param {string} startA - Start time of first interval ("HH:mm")
 * @param {string} endA - End time of first interval ("HH:mm")
 * @param {string} startB - Start time of second interval ("HH:mm")
 * @param {string} endB - End time of second interval ("HH:mm")
 * @returns {boolean} True if the intervals overlap, false otherwise.
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
  parseTimeToMinutes,
  hasTimeOverlap
};
