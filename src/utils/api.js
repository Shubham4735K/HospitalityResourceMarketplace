/**
 * ResShare Frontend API Helper
 *
 * Centralized HTTP client for interacting with the ResShare backend API.
 * Automatically handles:
 * - Base URL resolution (uses existing production URL with optional env override)
 * - Automatic Authorization header injection from localStorage
 * - JSON body serialization and response parsing
 * - Consistent error extraction and handling
 */

export const AUTH_TOKEN_KEY = 'hospitality_auth_token';

// Use existing production API base URL by default, allow VITE_API_BASE_URL override if present
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'https://hospitalityresourcemarketplace.onrender.com/api';

/**
 * Safe localStorage token getter
 */
export function getAuthToken() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to read auth token from localStorage:', e);
      return null;
    }
  }
  return null;
}

/**
 * Safe localStorage token setter
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Unable to persist auth token to localStorage:', e);
    }
  }
}

/**
 * Safe localStorage token remover
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to remove auth token from localStorage:', e);
    }
  }
}

/**
 * Custom error class for API failures
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Primary authenticated fetch wrapper
 *
 * @param {string} endpoint - Relative endpoint path (e.g. '/auth/me', '/resources') or full URL
 * @param {Object} [options={}] - Standard fetch RequestInit options
 * @returns {Promise<any>} Parsed JSON response body
 */
export async function apiFetch(endpoint, options = {}) {
  const { headers = {}, body, ...customConfig } = options;

  // Resolve full URL
  const isAbsoluteUrl = /^https?:\/\//i.test(endpoint);
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = isAbsoluteUrl ? endpoint : `${API_BASE_URL}${normalizedEndpoint}`;

  // Assemble request headers
  const requestHeaders = {
    ...headers
  };

  // Automatically attach Bearer token if present and not explicitly provided
  const token = getAuthToken();
  if (token && !requestHeaders['Authorization'] && !requestHeaders['authorization']) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Handle JSON body serialization
  let serializedBody = body;
  if (body !== undefined && body !== null) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (!isFormData && typeof body === 'object') {
      serializedBody = JSON.stringify(body);
      if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  const config = {
    ...customConfig,
    headers: requestHeaders,
    body: serializedBody
  };

  const response = await fetch(url, config);

  // Parse JSON response if present
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}

// Convenience methods
export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' }),
  fetch: apiFetch
};

export default api;
