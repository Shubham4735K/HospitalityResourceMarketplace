import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken } from '../utils/api.js';

export const AuthContext = createContext(null);

/**
 * Authentication Context Provider
 *
 * Manages user authentication state, token storage in localStorage,
 * and automatic session restoration on application startup.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on application mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getAuthToken();

      if (!storedToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Call GET /api/auth/me with Authorization: Bearer <storedToken>
        const res = await apiFetch('/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (isMounted) {
          if (res && res.user) {
            setUser(res.user);
            setToken(storedToken);
          } else {
            // Unexpected response structure; clear invalid token
            removeAuthToken();
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        // If token is invalid or expired (401/403), remove it and reset state
        console.warn('Could not restore auth session from token:', err.message);
        if (isMounted) {
          if (err.status === 401 || err.status === 403) {
            removeAuthToken();
            setToken(null);
            setUser(null);
          } else {
            // Network failure or offline: keep application running safely without crashing
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user: stores token in localStorage and updates state.
   * Supports both login(token, user) and login({ token, user }).
   */
  const login = useCallback((newToken, newUser) => {
    let resolvedToken = newToken;
    let resolvedUser = newUser;

    if (typeof newToken === 'object' && newToken !== null && !newUser) {
      resolvedToken = newToken.token;
      resolvedUser = newToken.user;
    }

    if (resolvedToken) {
      setAuthToken(resolvedToken);
      setToken(resolvedToken);
    }
    if (resolvedUser) {
      setUser(resolvedUser);
    }
  }, []);

  /**
   * Log out user: clears localStorage token and resets state.
   */
  const logout = useCallback(() => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const contextValue = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token && user)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
