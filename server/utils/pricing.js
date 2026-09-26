/**
 * Pricing and duration calculation utility for ResShare resources and bookings.
 * Phase 14.1 — Pure functions for duration calculation, subtotal calculation,
 * and structured pricing results supporting "hour" and "day" rate units.
 */

const { parseTimeToMinutes } = require('./conflict');

const SUPPORTED_RATE_UNITS = ['hour', 'day'];

/**
 * Calculates rental duration between startTime and endTime on a given calendar day.
 *
 * @param {string} startTime - Start time in "HH:mm" format.
 * @param {string} endTime - End time in "HH:mm" format (supports "23:59" as 24:00).
 * @returns {{
 *   valid: boolean,
 *   minutes: number,
 *   hours: number,
 *   days: number,
 *   error: string|null
 * }}
 */
function calculateRentalDuration(startTime, endTime) {
  if (typeof startTime !== 'string' || typeof endTime !== 'string') {
    return {
      valid: false,
      minutes: 0,
      hours: 0,
      days: 0,
      error: 'Invalid or missing start or end time. Expected HH:mm string.'
    };
  }

  const startMin = parseTimeToMinutes(startTime, false);
  const endMin = parseTimeToMinutes(endTime, true);

  if (startMin === null || endMin === null) {
    return {
      valid: false,
      minutes: 0,
      hours: 0,
      days: 0,
      error: 'Invalid time format for start or end time. Expected HH:mm format (00:00 to 23:59).'
    };
  }

  if (endMin <= startMin) {
    return {
      valid: false,
      minutes: 0,
      hours: 0,
      days: 0,
      error: 'End time must be later than start time.'
    };
  }

  const minutes = endMin - startMin;
  const hours = Math.round((minutes / 60) * 100) / 100;
  // For a valid same-day time interval, days is 1.
  const days = Math.max(1, Math.ceil(hours / 24));

  return {
    valid: true,
    minutes,
    hours,
    days,
    error: null
  };
}

/**
 * Calculates subtotal based on rate, rateUnit, and duration.
 *
 * @param {number} rate - Resource unit rate.
 * @param {string} rateUnit - Resource rate unit ("hour" or "day").
 * @param {number|Object} duration - Duration in hours/days or duration object from calculateRentalDuration.
 * @param {Object} [options={}] - Optional overrides (e.g., explicit days count).
 * @returns {{
 *   valid: boolean,
 *   rate: number|null,
 *   rateUnit: string|null,
 *   billedUnits: number|null,
 *   subtotal: number|null,
 *   error: string|null
 * }}
 */
function calculateSubtotal(rate, rateUnit, duration, options = {}) {
  // Validate rate
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0) {
    return {
      valid: false,
      rate: null,
      rateUnit: null,
      billedUnits: null,
      subtotal: null,
      error: 'Invalid or missing resource rate. Expected a non-negative number.'
    };
  }

  // Validate rateUnit
  if (typeof rateUnit !== 'string') {
    return {
      valid: false,
      rate,
      rateUnit: null,
      billedUnits: null,
      subtotal: null,
      error: 'Invalid or missing rate unit. Expected "hour" or "day".'
    };
  }

  const normalizedUnit = rateUnit.trim().toLowerCase();
  if (!SUPPORTED_RATE_UNITS.includes(normalizedUnit)) {
    return {
      valid: false,
      rate,
      rateUnit: rateUnit,
      billedUnits: null,
      subtotal: null,
      error: `Unsupported rate unit "${rateUnit}". Supported units are: ${SUPPORTED_RATE_UNITS.join(', ')}.`
    };
  }

  // Resolve duration numbers
  let hours = 0;
  let days = 1;

  if (typeof duration === 'number') {
    if (isNaN(duration) || duration <= 0) {
      return {
        valid: false,
        rate,
        rateUnit: normalizedUnit,
        billedUnits: null,
        subtotal: null,
        error: 'Duration must be a positive number.'
      };
    }
    hours = duration;
    days = duration;
  } else if (duration && typeof duration === 'object') {
    if (duration.valid === false) {
      return {
        valid: false,
        rate,
        rateUnit: normalizedUnit,
        billedUnits: null,
        subtotal: null,
        error: duration.error || 'Invalid duration.'
      };
    }
    hours = typeof duration.hours === 'number' ? duration.hours : 0;
    days = typeof duration.days === 'number' ? duration.days : 1;
  } else {
    return {
      valid: false,
      rate,
      rateUnit: normalizedUnit,
      billedUnits: null,
      subtotal: null,
      error: 'Invalid or missing duration.'
    };
  }

  // Check optional explicit days override (e.g. for multi-day rentals)
  if (typeof options.days === 'number' && options.days > 0) {
    days = options.days;
  }

  let billedUnits = 0;
  let rawSubtotal = 0;

  if (normalizedUnit === 'hour') {
    billedUnits = hours;
    rawSubtotal = billedUnits * rate;
  } else if (normalizedUnit === 'day') {
    billedUnits = days;
    rawSubtotal = billedUnits * rate;
  }

  const subtotal = Math.round(rawSubtotal * 100) / 100;

  return {
    valid: true,
    rate,
    rateUnit: normalizedUnit,
    billedUnits,
    subtotal,
    error: null
  };
}

/**
 * Calculates complete pricing breakdown for a resource request.
 * Can be called as calculatePricing(resource, request) or calculatePricing(options).
 *
 * @param {Object} resourceOrOptions - Resource object or combined options object.
 * @param {Object} [request] - Request object containing startTime, endTime, requestedDate.
 * @returns {{
 *   valid: boolean,
 *   rate: number|null,
 *   rateUnit: string|null,
 *   currency: string,
 *   duration: {
 *     minutes: number,
 *     hours: number,
 *     days: number
 *   },
 *   billedUnits: number|null,
 *   unitPrice: number|null,
 *   subtotal: number|null,
 *   total: number|null,
 *   error: string|null
 * }}
 */
function calculatePricing(resourceOrOptions, request) {
  if (!resourceOrOptions || typeof resourceOrOptions !== 'object') {
    return {
      valid: false,
      rate: null,
      rateUnit: null,
      currency: 'INR',
      duration: { minutes: 0, hours: 0, days: 0 },
      billedUnits: null,
      unitPrice: null,
      subtotal: null,
      total: null,
      error: 'Invalid or missing resource information.'
    };
  }

  // Extract rate & rateUnit
  const rate = resourceOrOptions.rate !== undefined
    ? resourceOrOptions.rate
    : (resourceOrOptions.resource && resourceOrOptions.resource.rate);

  const rateUnit = resourceOrOptions.rateUnit !== undefined
    ? resourceOrOptions.rateUnit
    : (resourceOrOptions.resource && resourceOrOptions.resource.rateUnit);

  // Extract times & days
  const reqObj = request || resourceOrOptions.request || resourceOrOptions;
  const startTime = reqObj ? reqObj.startTime : undefined;
  const endTime = reqObj ? reqObj.endTime : undefined;
  const explicitDays = reqObj && typeof reqObj.days === 'number' ? reqObj.days : undefined;

  // Calculate duration
  const durationResult = calculateRentalDuration(startTime, endTime);
  if (!durationResult.valid) {
    return {
      valid: false,
      rate: typeof rate === 'number' ? rate : null,
      rateUnit: typeof rateUnit === 'string' ? rateUnit : null,
      currency: 'INR',
      duration: {
        minutes: durationResult.minutes,
        hours: durationResult.hours,
        days: durationResult.days
      },
      billedUnits: null,
      unitPrice: typeof rate === 'number' ? rate : null,
      subtotal: null,
      total: null,
      error: durationResult.error
    };
  }

  // Calculate subtotal
  const subtotalResult = calculateSubtotal(
    rate,
    rateUnit,
    durationResult,
    { days: explicitDays }
  );

  if (!subtotalResult.valid) {
    return {
      valid: false,
      rate: subtotalResult.rate,
      rateUnit: subtotalResult.rateUnit,
      currency: 'INR',
      duration: {
        minutes: durationResult.minutes,
        hours: durationResult.hours,
        days: durationResult.days
      },
      billedUnits: null,
      unitPrice: subtotalResult.rate,
      subtotal: null,
      total: null,
      error: subtotalResult.error
    };
  }

  return {
    valid: true,
    rate: subtotalResult.rate,
    rateUnit: subtotalResult.rateUnit,
    currency: 'INR',
    duration: {
      minutes: durationResult.minutes,
      hours: durationResult.hours,
      days: durationResult.days
    },
    billedUnits: subtotalResult.billedUnits,
    unitPrice: subtotalResult.rate,
    subtotal: subtotalResult.subtotal,
    total: subtotalResult.subtotal,
    error: null
  };
}

/**
 * Formats a numeric currency amount into INR or specified currency.
 *
 * @param {number} amount - The numeric amount.
 * @param {string} [currency='INR'] - Currency code.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(amount, currency = 'INR') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount);
}

module.exports = {
  SUPPORTED_RATE_UNITS,
  calculateRentalDuration,
  calculateSubtotal,
  calculatePricing,
  formatCurrency
};
