import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_URL   = import.meta.env.VITE_API_URL || 'https://api.coreidentity.coreholdingcorp.com';
const TOKEN_KEY = 'ci_token';
const USER_KEY  = 'ci_user';

function loadToken() { return localStorage.getItem(TOKEN_KEY) || null; }
function loadUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(loadToken);
  const [user,    setUser]    = useState(loadUser);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(API_URL + '/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Login failed');
      // Handle both {data:{token}} and {token} response shapes
      const tok  = json.data?.token  || json.token;
      const usr  = json.data?.user   || json.user;
      if (!tok) throw new Error('No token in response');
      localStorage.setItem(TOKEN_KEY, tok);
      localStorage.setItem(USER_KEY,  JSON.stringify(usr));
      setToken(tok);
      setUser(usr);
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
