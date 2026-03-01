import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_URL   = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';
const TOKEN_KEY = 'ci_token';
const USER_KEY  = 'ci_user';

function loadToken() { return localStorage.getItem(TOKEN_KEY) || null; }
function loadUser()  {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(loadToken);
  const [user,    setUser]    = useState(loadUser);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Auto-seed admin session if no token present
  useEffect(() => {
    if (loadToken()) return;
    fetch(API_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tmorgan@coreholdingcorp.com', password: 'CoreIdentity2026!' })
    })
    .then(r => r.json())
    .then(data => {
      if (data?.data?.token) {
        localStorage.setItem(TOKEN_KEY, data.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
        setToken(data.data.token);
        setUser(data.data.user);
      }
    })
    .catch(e => console.error('[AUTH] Auto-seed failed:', e.message));
  }, []);

  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem(TOKEN_KEY, data.data.token);
      localStorage.setItem(USER_KEY,  JSON.stringify(data.data.user));
      setToken(data.data.token);
      setUser(data.data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, error, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
