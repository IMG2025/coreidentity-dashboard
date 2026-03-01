import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [debug,    setDebug]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    const result = await login(email.trim(), password);
    setDebug(JSON.stringify(result));
    console.log('LOGIN RESULT:', result);

    if (!result.success) {
      setError(result.error || 'Login failed — check credentials and try again.');
    }
    // on success: AuthContext sets user → App re-renders → portal loads
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070c18',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg,#d4af37,#f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 22, fontWeight: 800, color: '#070c18',
          }}>C</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>CoreIdentity</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Governance Portal</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#7f1d1d',
            border: '1px solid #ef4444',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#fca5a5',
            fontSize: 13,
            marginBottom: 16,
            lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111827', border: '1px solid #374151',
                borderRadius: 8, padding: '10px 12px',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111827', border: '1px solid #374151',
                borderRadius: 8, padding: '10px 12px',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {debug && (
            <div style={{
              background: '#1e3a5f', border: '1px solid #3b82f6',
              borderRadius: 8, padding: '10px 14px',
              color: '#93c5fd', fontSize: 12,
              marginBottom: 12, wordBreak: 'break-all', lineHeight: 1.6
            }}>
              <strong>DEBUG:</strong> {debug}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#92400e' : '#d4af37',
              color: '#070c18',
              border: 'none',
              borderRadius: 8,
              padding: '12px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
