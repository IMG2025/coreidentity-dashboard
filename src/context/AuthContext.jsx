import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_URL = 'https://api.coreidentitygroup.com';
const TOKEN_KEY = 'ci_token';
const USER_KEY  = 'ci_user';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res  = await fetch(API_URL + '/api/auth/login', {
        method:  'POST',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const text = await res.text();
      console.log('[AUTH] Response body:', text);
      let json;
      try { json = JSON.parse(text); } catch(e) { return { success: false, error: 'Invalid API response: ' + text.slice(0,100) }; }

      if (!res.ok) {
        const msg = json?.error || json?.message || 'Login failed (' + res.status + ')';
        return { success: false, error: msg };
      }

      const tok = json?.data?.token || json?.token || null;
      const usr = json?.data?.user  || json?.user  || null;

      if (!tok) return { success: false, error: 'No token returned by API' };
      if (!usr) return { success: false, error: 'No user returned by API' };

      localStorage.setItem(TOKEN_KEY, tok);
      localStorage.setItem(USER_KEY,  JSON.stringify(usr));
      setToken(tok);
      setUser(usr);
      return { success: true };

    } catch (err) {
      return { success: false, error: 'Network error: ' + (err.message || 'unknown') };
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

  // Restore session on cold load
  React.useEffect(() => {
    try {
      const tok = localStorage.getItem(TOKEN_KEY);
      const usr = localStorage.getItem(USER_KEY);
      if (tok && usr) {
        const parsed = JSON.parse(usr);
        // Validate JWT expiry
        const payload = JSON.parse(atob(tok.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(tok);
          setUser(parsed);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
    } catch (_) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
