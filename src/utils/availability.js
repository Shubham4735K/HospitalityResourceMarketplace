/**
 * Availability validation utility for ResShare resources.
 * Validates requested booking date and time against structured resource schedules.
 */

const DAYS_OF_WEEK = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

/**
 * Converts an "HH:mm" time string to minutes from the start of the day (0–1440).
 * When isEndTime is true and the time is "23:59", returns 1440 (24h full day)
 * to cleanly handle full-day rental windows.
 *
 * @param {string} timeStr - Time string in "HH:mm" format.
 * @param {boolean} [isEndTime=false] - Whether this represents the end boundary of a slot/request.
 * @returns {number|null} Minutes from midnight or null if invalid.
 */
export function parseTimeToMinutes(timeStr, isEndTime = false) {
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
 * Safely parses a "YYYY-MM-DD" date string into its numeric components
 * and calculates the ISO weekday (1 = Monday ... 7 = Sunday) using local calendar components
 * to avoid UTC timezone shifts.
 *
 * @param {string} dateStr - Date string in "YYYY-MM-DD" format.
 * @returns {{ year: number, month: number, day: number, isoDay: number, dateObj: Date } | null}
 */
export function parseDateParts(dateStr) {
  if (typeof dateStr !== 'string') return null;
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

  // JS Date.getDay(): 0 = Sunday, 1 = Monday ... 6 = Saturday
  // ISO standard: 1 = Monday ... 7 = Sunday
  const jsDay = dateObj.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  return { year, month, day, isoDay, dateObj };
}

/**
 * Validates whether a resource is available for a requested date and time window.
 *
 * @param {Object} resource - The resource object with a schedule definition.
 * @param {string} requestedDate - Booking date in "YYYY-MM-DD" format.
 * @param {string} startTime - Start time in "HH:mm" format.
 * @param {string} endTime - End time in "HH:mm" format.
 * @param {Object} [options={}] - Optional configuration.
 * @param {Date} [options.now] - Current reference time for advance notice checks (defaults to new Date()).
 * @returns {{ available: boolean, reason: string|null }}
 */
export function checkResourceAvailability(
  resource,
  requestedDate,
  startTime,
  endTime,
  options = {}
) {
  // 1. Resource and Schedule Presence
  if (!resource || typeof resource !== 'object') {
    return { available: false, reason: 'Invalid or missing resource.' };
  }

  const schedule = resource.schedule;
  if (!schedule || typeof schedule !== 'object') {
    return { available: false, reason: 'Resource does not have a defined schedule.' };
  }

  if (schedule.status && schedule.status.toLowerCase() === 'unavailable') {
    return { available: false, reason: 'This resource is currently marked as unavailable.' };
  }

  // 2. Format & Validity of requestedDate, startTime, endTime
  const dateParts = parseDateParts(requestedDate);
  if (!dateParts) {
    return {
      available: false,
      reason: 'Invalid or missing requested date. Expected format: YYYY-MM-DD.'
    };
  }

  const startMin = parseTimeToMinutes(startTime, false);
  const endMin = parseTimeToMinutes(endTime, true);

  if (startMin === null || endMin === null) {
    return {
      available: false,
      reason: 'Invalid or missing time format. Expected format: HH:mm.'
    };
  }

  // 3. Time Validity: startTime must be before endTime
  if (startMin >= endMin) {
    return {
      available: false,
      reason: 'End time must be later than start time.'
    };
  }

  // 4. Advance Notice and Past-Date Checks
  const now = options.now instanceof Date ? options.now : new Date();
  const reqStartDateTime = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    Math.floor(startMin / 60),
    startMin % 60,
    0,
    0
  );

  const msDiff = reqStartDateTime.getTime() - now.getTime();
  if (msDiff < 0) {
    return {
      available: false,
      reason: 'Requested booking date and time cannot be in the past.'
    };
  }

  const noticeHours = typeof schedule.noticeHours === 'number' ? schedule.noticeHours : 0;
  const diffHours = msDiff / (1000 * 60 * 60);
  if (noticeHours > 0 && diffHours < noticeHours) {
    return {
      available: false,
      reason: `This resource requires at least ${noticeHours} hour${noticeHours === 1 ? '' : 's'} advance notice.`
    };
  }

  // 5. Minimum Rental Duration
  const durationHours = (endMin - startMin) / 60;
  const minRentalHours = typeof schedule.minRentalHours === 'number' ? schedule.minRentalHours : 0;
  if (minRentalHours > 0 && durationHours < minRentalHours) {
    return {
      available: false,
      reason: `Requested duration of ${durationHours} hour${durationHours === 1 ? '' : 's'} is less than the minimum rental duration of ${minRentalHours} hour${minRentalHours === 1 ? '' : 's'}.`
    };
  }

  // 6. Weekday Availability
  const availableDays = Array.isArray(schedule.availableDays) ? schedule.availableDays : [];
  if (availableDays.length > 0 && !availableDays.includes(dateParts.isoDay)) {
    const dayName = DAYS_OF_WEEK[dateParts.isoDay] || 'this day';
    return {
      available: false,
      reason: `This resource is not available on ${dayName}s.`
    };
  }

  // 7. Blackout Dates
  const blackoutDates = Array.isArray(schedule.blackoutDates) ? schedule.blackoutDates : [];
  if (blackoutDates.includes(requestedDate.trim())) {
    return {
      available: false,
      reason: `The requested date (${requestedDate}) is blocked or unavailable.`
    };
  }

  // 8. Time-Window Availability (must fit completely within at least ONE timeSlot)
  const timeSlots = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
  if (timeSlots.length > 0) {
    const fitsInAnySlot = timeSlots.some((slot) => {
      const slotStartMin = parseTimeToMinutes(slot.start, false);
      const slotEndMin = parseTimeToMinutes(slot.end, true);
      if (slotStartMin === null || slotEndMin === null) return false;
      return slotStartMin <= startMin && endMin <= slotEndMin;
    });

    if (!fitsInAnySlot) {
      return {
        available: false,
        reason: `Requested time window (${startTime} – ${endTime}) is outside the resource's available operating hours.`
      };
    }
  }

  // 9. All checks passed
  return {
    available: true,
    reason: null
  };
}

export default checkResourceAvailability;
