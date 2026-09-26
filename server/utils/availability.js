/**
 * Backend availability validation utility for ResShare resources.
 * Validates requested or counter-proposed dates against structured resource schedules.
 * DAY-ONLY availability: resources are either available on a particular day or unavailable.
 * Operating hours and time slots are NOT validated.
 */

const DAYS_OF_WEEK = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday"
};

/**
 * Parses a "YYYY-MM-DD" date string into its components and ISO weekday (1 = Monday ... 7 = Sunday).
 *
 * @param {string} dateStr - Date string in "YYYY-MM-DD" format.
 * @returns {{ year: number, month: number, day: number, isoDay: number, dateObj: Date } | null}
 */
function parseDateParts(dateStr) {
  if (typeof dateStr !== "string") return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  const dateObj = new Date(year, month - 1, day);
  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null;
  }

  const jsDay = dateObj.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  return { year, month, day, isoDay, dateObj };
}

/**
 * Validates whether a resource is available for a requested date.
 * Operating hours / time parameters are accepted for backward compatibility but NOT validated.
 *
 * @param {Object} resource - The resource object with a schedule definition.
 * @param {string} requestedDate - Date in "YYYY-MM-DD" format.
 * @param {string} [_startTime] - Optional start time (ignored for day-only availability).
 * @param {string} [_endTime] - Optional end time (ignored for day-only availability).
 * @param {Object} [options={}] - Optional configuration.
 * @param {Date} [options.now] - Current reference time for past-date checks.
 * @returns {{ available: boolean, reason: string|null }}
 */
function checkResourceAvailability(
  resource,
  requestedDate,
  _startTime,
  _endTime,
  options = {}
) {
  if (!resource || typeof resource !== "object") {
    return { available: false, reason: "Invalid or missing resource." };
  }

  const schedule = resource.schedule;
  if (!schedule || typeof schedule !== "object") {
    return { available: false, reason: "Resource does not have a defined schedule." };
  }

  if (schedule.status && schedule.status.toLowerCase() === "unavailable") {
    return { available: false, reason: "This resource is currently marked as unavailable." };
  }

  const dateParts = parseDateParts(requestedDate);
  if (!dateParts) {
    return {
      available: false,
      reason: "Invalid or missing requested date. Expected format: YYYY-MM-DD."
    };
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
  if (targetMidnight < todayMidnight) {
    return {
      available: false,
      reason: "Requested date cannot be in the past."
    };
  }

  const availableDays = Array.isArray(schedule.availableDays) ? schedule.availableDays : [];
  if (availableDays.length > 0 && !availableDays.includes(dateParts.isoDay)) {
    const dayName = DAYS_OF_WEEK[dateParts.isoDay] || "this day";
    return {
      available: false,
      reason: `This resource is not available on ${dayName}s.`
    };
  }

  const blackoutDates = Array.isArray(schedule.blackoutDates) ? schedule.blackoutDates : [];
  if (blackoutDates.includes(requestedDate.trim())) {
    return {
      available: false,
      reason: "Resource is unavailable on the requested date."
    };
  }

  return {
    available: true,
    reason: null
  };
}

module.exports = {
  checkResourceAvailability,
  parseDateParts,
  DAYS_OF_WEEK
};
