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
    if (!email || !password) {
      setError('Email and password required.');
      return;
    }
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error || 'Invalid credentials.');
  };

  const S = {
    page:    { minHeight:'100vh', background:'#070c18', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans','Segoe UI',sans-serif" },
    wrap:    { width:'100%', maxWidth:420, padding:'0 24px' },
    logo:    { textAlign:'center', marginBottom:32 },
    img:     { width:64, height:64, objectFit:'contain', marginBottom:16 },
    h1:      { color:'#fff', fontSize:24, fontWeight:700, margin:'0 0 8px' },
    sub:     { color:'#4a9eff', fontSize:13, margin:0 },
    card:    { background:'#fff', borderRadius:16, padding:32, boxShadow:'0 24px 64px rgba(0,0,0,0.4)' },
    h2:      { fontSize:18, fontWeight:600, color:'#111', margin:'0 0 24px' },
    err:     { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'#dc2626', fontSize:13 },
    field:   { marginBottom:16 },
    label:   { display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 },
    input:   { width:'100%', padding:'10px 14px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none' },
    fieldLast: { marginBottom:24 },
    btn:     (disabled) => ({ width:'100%', padding:11, background: disabled ? '#93c5fd' : '#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer' }),
    footer:  { textAlign:'center', color:'#4b5563', fontSize:12, marginTop:24 },
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.logo}>
          <img src="/chc-logo.png" alt="CHC" style={S.img} onError={e => e.target.style.display='none'} />
          <h1 style={S.h1}>CoreIdentity Portal</h1>
          <p style={S.sub}>Core Holding Corp — Governance Platform</p>
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Sign in</h2>
          {error && <div style={S.err}>{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tmorgan@coreholdingcorp.com" autoComplete="email" style={S.input} />
            </div>
            <div style={S.fieldLast}>
              <label style={S.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" style={S.input} />
            </div>
            <button type="submit" disabled={loading} style={S.btn(loading)}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>
        <p style={S.footer}>© 2026 Core Holding Corp. All rights reserved.</p>
      </div>
    </div>
  );
}
