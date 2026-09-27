/**
 * ResShare — Frontend AI Helper Utility
 *
 * Interacts with the ResShare Express backend route:
 * POST /api/ai/analyze
 *
 * SECURITY:
 * Never contains or requires the Nugen API key. The API key is securely
 * managed by the Express backend via environment variables.
 */

const API_BASE = '/api/ai';

/**
 * Sends natural language requirements to the backend for intent and criteria extraction.
 *
 * @param {string} prompt - The natural language request from the user.
 * @returns {Promise<{
 *   success: boolean,
 *   source: string,
 *   model: string,
 *   isFallback: boolean,
 *   data: {
 *     intent: string,
 *     category: string,
 *     capacity: number|null,
 *     date: string|null,
 *     location: string|null,
 *     requirements: string[]
 *   }
 * }>}
 */
export async function analyzeRequirement(prompt) {
  const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmed) {
    throw new Error('Please enter a description of what you need.');
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: trimmed })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.reason || errorData.error || `AI analysis failed (HTTP ${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Maps the AI structured category string to ResShare's existing 4 marketplace categories.
 *
 * Supported ResShare categories:
 * - "Commercial Kitchen & Prep"
 * - "Venues & Spaces"
 * - "Commercial Equipment"
 * - "Event Supplies & Decor"
 *
 * @param {string} aiCategory - Extracted category name from AI
 * @returns {string} One of the 4 valid marketplace categories or 'All Resources'
 */
export function mapAICategoryToMarketplace(aiCategory) {
  if (!aiCategory || typeof aiCategory !== 'string') return 'All Resources';

  const lower = aiCategory.toLowerCase();
  if (lower.includes('kitchen') || lower.includes('culinary') || lower.includes('prep') || lower.includes('bakery')) {
    return 'Commercial Kitchen & Prep';
  }
  if (lower.includes('venue') || lower.includes('space') || lower.includes('banquet') || lower.includes('hall')) {
    return 'Venues & Spaces';
  }
  if (lower.includes('equipment') || lower.includes('machine') || lower.includes('appliance')) {
    return 'Commercial Equipment';
  }
  if (lower.includes('decor') || lower.includes('supplies') || lower.includes('tableware') || lower.includes('cutlery')) {
    return 'Event Supplies & Decor';
  }

  return 'All Resources';
}

/**
 * Generates verified, transparent "Why this matches" bullet points
 * based ONLY on actual resource / database attributes.
 *
 * Under no circumstances does this hallucinate unverified resource capabilities.
 *
 * @param {Object} resource - The resource object from the database/inventory
 * @param {Object} aiCriteria - The structured criteria extracted by AI
 * @returns {string[]} List of human-readable matching justification statements
 */
export function generateWhyMatchesReasons(resource, aiCriteria) {
  if (!resource || !aiCriteria) return [];

  const reasons = [];
  const mappedCategory = mapAICategoryToMarketplace(aiCriteria.category);

  // 1. Category alignment check (strictly against resource.category)
  if (resource.category && resource.category === mappedCategory) {
    reasons.push(`Category Match: Verified '${resource.category}' inventory asset.`);
  }

  // 2. Location proximity check (strictly against resource.location)
  if (aiCriteria.location && resource.location) {
    const resLoc = resource.location.toLowerCase();
    const reqLoc = aiCriteria.location.toLowerCase();

    if (resLoc.includes(reqLoc)) {
      reasons.push(`Location Match: Situated in ${resource.location} (exact match for '${aiCriteria.location}').`);
    } else if (
      (reqLoc.includes('mumbai') && resLoc.includes('mumbai')) ||
      (reqLoc.includes('bengaluru') && resLoc.includes('bengaluru')) ||
      (reqLoc.includes('chennai') && resLoc.includes('chennai'))
    ) {
      reasons.push(`Regional Match: Situated in ${resource.location} within the greater ${aiCriteria.location} region.`);
    }
  }

  // 3. Equipment / Specifications match (strictly against resource.specs and resource.description)
  if (Array.isArray(aiCriteria.requirements) && aiCriteria.requirements.length > 0) {
    const specsList = Array.isArray(resource.specs) ? resource.specs : [];
    const specsText = specsList.join(' ').toLowerCase();
    const descText = (resource.description || '').toLowerCase();
    const titleText = (resource.title || '').toLowerCase();
    const combinedContent = `${titleText} ${descText} ${specsText}`;

    for (const req of aiCriteria.requirements) {
      const reqLower = req.toLowerCase();
      const stem = reqLower.endsWith('s') ? reqLower.slice(0, -1) : reqLower;
      const tokens = reqLower.split(/\s+/).filter((t) => t.length > 2);

      // Find the specific matching spec from the database
      const matchingSpec = specsList.find((spec) => {
        const s = spec.toLowerCase();
        return s.includes(reqLower) || s.includes(stem) || (tokens.length > 1 && tokens.every((t) => s.includes(t)));
      });

      if (matchingSpec) {
        reasons.push(`Spec Match: Verified equipment '${matchingSpec}' satisfies '${req}' requirement.`);
      } else if (combinedContent.includes(reqLower) || combinedContent.includes(stem)) {
        reasons.push(`Spec Match: Confirmed '${req}' capability in verified facility description.`);
      }
    }
  }

  // 4. Operating Availability (strictly against resource.availability)
  if (resource.availability) {
    reasons.push(`Operating Window: Host operating slot: ${resource.availability}.`);
  }

  return reasons;
}

export default {
  analyzeRequirement,
  mapAICategoryToMarketplace,
  generateWhyMatchesReasons
};
