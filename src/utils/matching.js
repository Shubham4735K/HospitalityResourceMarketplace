import { checkResourceAvailability } from './availability.js';

/**
 * Transparent, deterministic rule-based resource matching utility.
 *
 * Scoring Model (Total: 0 to 100 points):
 * 1. Availability: 40 points
 * 2. Suitability:  30 points (20 category + up to 10 keywords)
 * 3. Location:     20 points
 * 4. Price:        10 points
 *
 * @param {Object} resource - The resource object to score.
 * @param {Object} [queryParams={}] - Search and request filter criteria.
 * @param {string} [queryParams.searchQuery] - Search keywords.
 * @param {string} [queryParams.category] - Desired resource category.
 * @param {string} [queryParams.location] - Desired city or area.
 * @param {string} [queryParams.requestedDate] - Booking date (YYYY-MM-DD).
 * @param {string} [queryParams.startTime] - Start time (HH:mm).
 * @param {string} [queryParams.endTime] - End time (HH:mm).
 * @param {number} [queryParams.maxPrice] - Maximum budget/rate.
 * @param {Object} [queryParams.options] - Options passed to availability checker (e.g. { now }).
 * @returns {{ score: number, breakdown: { availability: number, suitability: number, location: number, price: number } }}
 */
export function calculateMatchScore(resource, queryParams = {}) {
  // Safety guard for invalid resource input
  if (!resource || typeof resource !== 'object') {
    return {
      score: 0,
      breakdown: {
        availability: 0,
        suitability: 0,
        location: 0,
        price: 0
      }
    };
  }

  const params = queryParams && typeof queryParams === 'object' ? queryParams : {};

  // ---------------------------------------------------------------------------
  // 1. AVAILABILITY SCORING (40 Points)
  // ---------------------------------------------------------------------------
  // If requestedDate, startTime, and endTime are all provided, validate against
  // the resource's operating schedule using the existing availability utility.
  // If no date/time is supplied, do not penalize the resource (award full 40 pts).
  let availabilityScore = 40;

  if (params.requestedDate && params.startTime && params.endTime) {
    const availabilityResult = checkResourceAvailability(
      resource,
      params.requestedDate,
      params.startTime,
      params.endTime,
      params.options || (params.now ? { now: params.now } : {})
    );

    availabilityScore = availabilityResult && availabilityResult.available ? 40 : 0;
  }

  // ---------------------------------------------------------------------------
  // 2. SUITABILITY SCORING (30 Points Max)
  // ---------------------------------------------------------------------------
  // A. Category Match (20 points):
  //    - If a specific category is requested, award 20 points for exact match.
  //    - If category is 'All Resources' or not specified, award 20 points (no penalty).
  //    - If a specific category is requested and does not match, award 0 points.
  let categoryScore = 0;
  const requestedCategory = typeof params.category === 'string' ? params.category.trim() : '';

  if (!requestedCategory || requestedCategory.toLowerCase() === 'all resources') {
    categoryScore = 20;
  } else if (
    resource.category &&
    resource.category.trim().toLowerCase() === requestedCategory.toLowerCase()
  ) {
    categoryScore = 20;
  } else {
    categoryScore = 0;
  }

  // B. Keyword Relevance (Up to 10 points):
  //    - If searchQuery is provided, search tokens across title, description, and specs.
  //    - Proportion of matched tokens scales from 0 to 10 points.
  //    - If no searchQuery is provided, award 10 points so general browsing is not penalized.
  let keywordScore = 0;
  const rawSearchQuery = typeof params.searchQuery === 'string' ? params.searchQuery.trim() : '';

  if (!rawSearchQuery) {
    // No search keyword constraint provided; award full points
    keywordScore = 10;
  } else {
    const searchTokens = rawSearchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (searchTokens.length === 0) {
      keywordScore = 10;
    } else {
      const titleText = (resource.title || '').toLowerCase();
      const descText = (resource.description || '').toLowerCase();
      const specsText = Array.isArray(resource.specs)
        ? resource.specs.join(' ').toLowerCase()
        : '';
      const searchableContent = `${titleText} ${descText} ${specsText}`;

      const matchedCount = searchTokens.filter((token) =>
        searchableContent.includes(token)
      ).length;

      keywordScore = Math.round((matchedCount / searchTokens.length) * 10);
    }
  }

  const suitabilityScore = Math.min(30, categoryScore + keywordScore);

  // ---------------------------------------------------------------------------
  // 3. LOCATION SCORING (20 Points)
  // ---------------------------------------------------------------------------
  // If location is provided and the resource's location string contains the
  // requested city/area (case-insensitive), award 20 points. Otherwise 0 points.
  let locationScore = 0;
  const requestedLocation = typeof params.location === 'string' ? params.location.trim() : '';

  if (requestedLocation && resource.location && typeof resource.location === 'string') {
    const resLoc = resource.location.toLowerCase();
    const reqLoc = requestedLocation.toLowerCase();

    if (resLoc.includes(reqLoc) || reqLoc.includes(resLoc)) {
      locationScore = 20;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. PRICE SCORING (10 Points)
  // ---------------------------------------------------------------------------
  // If no budget/maxPrice exists, award 10 points so resources are not penalized.
  // If maxPrice is supplied:
  //   - 10 points if resource.rate <= maxPrice
  //   - Scaled down linearly if rate exceeds maxPrice, reaching 0 when rate >= 2 * maxPrice
  let priceScore = 10;
  const rawBudget = params.maxPrice ?? params.budget;
  const budget = typeof rawBudget === 'number' ? rawBudget : parseFloat(rawBudget);

  if (typeof budget === 'number' && !isNaN(budget) && budget > 0) {
    const rate = typeof resource.rate === 'number' ? resource.rate : 0;

    if (rate <= budget) {
      priceScore = 10;
    } else {
      // Linear penalty: rate 100% over budget (2x) yields 0 points
      const excessRatio = (rate - budget) / budget;
      priceScore = Math.max(0, Math.round(10 * (1 - excessRatio)));
    }
  }

  // ---------------------------------------------------------------------------
  // TOTAL SCORE COMPUTATION
  // ---------------------------------------------------------------------------
  const totalScore = availabilityScore + suitabilityScore + locationScore + priceScore;
  const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  return {
    score: finalScore,
    breakdown: {
      availability: availabilityScore,
      suitability: suitabilityScore,
      location: locationScore,
      price: priceScore
    }
  };
}

export default calculateMatchScore;
