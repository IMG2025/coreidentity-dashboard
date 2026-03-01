import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error || 'Invalid credentials.');
  };

  return (
    <div style={{ minHeight:'100vh', background:'#070c18', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:'100%', maxWidth:420, padding:'0 24px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <img src="/chc-logo.png" alt="Core Holding Corp" style={{ width:64, height:64, objectFit:'contain', marginBottom:16 }} />
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:700, margin:'0 0 8px' }}>CoreIdentity Governance Portal</h1>
          <p style={{ color:'#4a9eff', fontSize:13, margin:0 }}>Core Holding Corp — Governance Portal</p>
        </div>
        <div style={{ background:'#fff', borderRadius:16, padding:32, boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize:18, fontWeight:600, color:'#111', margin:'0 0 24px' }}>Sign in to your account</h2>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'#dc2626', fontSize:13 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@coreholdingcorp.com"
                autoComplete="email"
                style={{ width:'100%', padding:'10px 14px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none' }}
              />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ width:'100%', padding:'10px 14px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width:'100%', padding:'11px', background: loading ? '#93c5fd' : '#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', color:'#4b5563', fontSize:12, marginTop:24 }}>© 2026 Core Holding Corp. All rights reserved.</p>
      </div>
    </div>
  );
}
