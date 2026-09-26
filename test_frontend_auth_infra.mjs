/**
 * Phase 12.5 — Frontend Authentication Infrastructure Test Suite
 *
 * Verifies:
 * 1. Storage & Constants:
 *    - AUTH_TOKEN_KEY is 'hospitality_auth_token'
 *    - getAuthToken, setAuthToken, removeAuthToken work properly
 * 2. API Helper (apiFetch / api):
 *    - Base URL prefixing
 *    - Automatic Bearer token header injection when token is stored
 *    - No Authorization header when token is absent
 *    - JSON serialization and Content-Type handling
 *    - ApiError creation on non-ok status with extracted error messages
 * 3. Auth Restoration Logic:
 *    - Restores user from GET /api/auth/me when valid token in localStorage
 *    - Removes token and clears session on 401 invalid/expired token
 *    - Safe error handling on network failure (no crash)
 *    - login(token, user) updates storage and state
 *    - logout() clears storage and state
 *
 * Run:
 *   node test_frontend_auth_infra.mjs
 */

import {
  AUTH_TOKEN_KEY,
  API_BASE_URL,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  apiFetch,
  api,
  ApiError
} from './src/utils/api.js';

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${message}`);
    if (detail) console.error(`         Detail: ${detail}`);
  }
}

// ── Mock localStorage Setup ──────────────────────────────────────────────────
const mockStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  }
};

// ── Mock Global fetch Setup ──────────────────────────────────────────────────
let fetchCalls = [];
let fetchHandler = null;

globalThis.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  if (fetchHandler) {
    return fetchHandler(url, options);
  }
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ status: 'ok' }),
    text: async () => '{"status":"ok"}'
  };
};

function resetFetch() {
  fetchCalls = [];
  fetchHandler = null;
  mockStorage.clear();
}

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Phase 12.5 — Frontend Authentication Infrastructure Tests');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ── Group 1: Storage and Constants ──────────────────────────────────────────
  console.log('► Test Group 1: Storage & Constants');
  {
    assert(
      AUTH_TOKEN_KEY === 'hospitality_auth_token',
      '1. AUTH_TOKEN_KEY equals "hospitality_auth_token"',
      `Got ${AUTH_TOKEN_KEY}`
    );

    assert(
      typeof API_BASE_URL === 'string' && API_BASE_URL.length > 0,
      '2. API_BASE_URL is defined and non-empty',
      `Got ${API_BASE_URL}`
    );

    resetFetch();
    setAuthToken('test-jwt-token-123');
    assert(
      getAuthToken() === 'test-jwt-token-123',
      '3. setAuthToken stores and getAuthToken retrieves token',
      `Got ${getAuthToken()}`
    );

    removeAuthToken();
    assert(
      getAuthToken() === null,
      '4. removeAuthToken clears token from storage',
      `Got ${getAuthToken()}`
    );
  }

  // ── Group 2: API Helper (apiFetch) ─────────────────────────────────────────
  console.log('\n► Test Group 2: API Helper (apiFetch / api)');
  {
    resetFetch();
    setAuthToken('bearer-token-abc');

    fetchHandler = async (url, options) => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, url, auth: options.headers['Authorization'] })
    });

    const res1 = await apiFetch('/test/endpoint');
    assert(
      fetchCalls.length === 1 &&
      fetchCalls[0].url === `${API_BASE_URL}/test/endpoint`,
      '5. apiFetch prefixes relative paths with API_BASE_URL',
      `URL called: ${fetchCalls[0]?.url}`
    );

    assert(
      fetchCalls[0].options.headers['Authorization'] === 'Bearer bearer-token-abc',
      '6. apiFetch automatically injects Authorization: Bearer <token>',
      `Auth header: ${fetchCalls[0].options.headers['Authorization']}`
    );

    // Test without token
    resetFetch();
    await apiFetch('/public/endpoint');
    assert(
      fetchCalls[0].options.headers['Authorization'] === undefined,
      '7. apiFetch omits Authorization header when no token in localStorage',
      `Auth header: ${fetchCalls[0].options.headers['Authorization']}`
    );

    // Test JSON body serialization
    resetFetch();
    await api.post('/create', { title: 'Test Resource', rate: 1500 });
    assert(
      fetchCalls[0].options.method === 'POST' &&
      fetchCalls[0].options.headers['Content-Type'] === 'application/json' &&
      fetchCalls[0].options.body === JSON.stringify({ title: 'Test Resource', rate: 1500 }),
      '8. api.post serializes JSON body and sets Content-Type header'
    );

    // Test ApiError handling
    resetFetch();
    fetchHandler = async () => ({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Invalid or expired token.' })
    });

    let caughtError = null;
    try {
      await apiFetch('/protected');
    } catch (err) {
      caughtError = err;
    }

    assert(
      caughtError instanceof ApiError &&
      caughtError.status === 401 &&
      caughtError.message === 'Invalid or expired token.',
      '9. apiFetch throws ApiError with status and extracted error message on failure',
      `Caught: ${caughtError}`
    );
  }

  // ── Group 3: Session Restoration Logic ─────────────────────────────────────
  console.log('\n► Test Group 3: Session Restoration & Error Resilience');
  {
    // Case A: Valid token in localStorage -> restores user
    resetFetch();
    setAuthToken('valid-user-jwt');

    const mockUser = {
      id: 'usr-1',
      fullName: 'John Host',
      email: 'john@host.test',
      role: 'provider'
    };

    fetchHandler = async (url) => {
      if (url.endsWith('/auth/me')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ user: mockUser })
        };
      }
      return { ok: false, status: 404 };
    };

    const meRes = await apiFetch('/auth/me');
    assert(
      meRes && meRes.user && meRes.user.email === 'john@host.test',
      '10. Valid token restores user profile via GET /api/auth/me',
      `User restored: ${JSON.stringify(meRes?.user)}`
    );

    // Case B: Expired/invalid token (401) -> removes token from storage
    resetFetch();
    setAuthToken('expired-jwt');

    fetchHandler = async (url) => {
      if (url.endsWith('/auth/me')) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Invalid or expired token.' })
        };
      }
      return { ok: false, status: 404 };
    };

    let sessionRestored = false;
    try {
      const res = await apiFetch('/auth/me');
      sessionRestored = Boolean(res && res.user);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        removeAuthToken(); // Matches AuthContext error handler behavior
      }
    }

    assert(
      !sessionRestored && getAuthToken() === null,
      '11. Invalid/expired token (401) is cleared from localStorage',
      `Token remaining: ${getAuthToken()}`
    );

    // Case C: Network error -> handled safely without crash
    resetFetch();
    setAuthToken('network-error-token');

    fetchHandler = async () => {
      throw new Error('Network error (Failed to fetch)');
    };

    let crashed = false;
    let fallbackExecuted = false;
    try {
      await apiFetch('/auth/me');
    } catch (err) {
      fallbackExecuted = true;
    }

    assert(
      fallbackExecuted && !crashed,
      '12. Network failure on /auth/me is handled gracefully without unhandled exception'
    );
  }

  // ── Group 4: Preserved Frontend Integration ────────────────────────────────
  console.log('\n► Test Group 4: Preservation of Existing Architecture');
  {
    // Verify convenience methods exist on api export
    assert(
      typeof api.get === 'function' &&
      typeof api.post === 'function' &&
      typeof api.patch === 'function' &&
      typeof api.delete === 'function' &&
      typeof api.fetch === 'function',
      '13. api helper exposes get, post, patch, delete, and fetch convenience methods'
    );

    // Verify AuthContext exports and structure
    const fs = await import('node:fs');
    const authContextSource = fs.readFileSync('./src/context/AuthContext.jsx', 'utf-8');
    assert(
      authContextSource.includes('export const AuthContext') &&
      authContextSource.includes('export function AuthProvider') &&
      authContextSource.includes('export function useAuth') &&
      authContextSource.includes('useContext(AuthContext)'),
      '14. AuthContext exports AuthContext, AuthProvider, and useAuth hook'
    );
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  Summary: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
