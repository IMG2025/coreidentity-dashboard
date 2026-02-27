// CHC Design System — Script 25-F (mobile-responsive)
// Auto-generated — DO NOT hand edit
import { useState, useEffect } from 'react';

export const C = {
  bg:'#070c18', bg2:'#0a0e1a', surface:'#111827', surface2:'#1a2235',
  border:'#1f2937', border2:'#2d3748',
  gold:'#d4a843', goldDim:'#92722d', goldLight:'#f0c060',
  blue:'#3b82f6', teal:'#14b8a6', red:'#ef4444',
  green:'#22c55e', slate:'#94a3b8', white:'#f1f5f9',
  orange:'#f97316', purple:'#a855f7'
};
export const F = {
  display:"'Bebas Neue','Arial Black',sans-serif",
  mono:"'JetBrains Mono','Fira Code',monospace",
  body:"'DM Sans','Segoe UI',sans-serif"
};
export const fmtM = n => n >= 1e9 ? '$'+(n/1e9).toFixed(1)+'B' : n >= 1e6 ? '$'+(n/1e6).toFixed(1)+'M' : '$'+(n/1000).toFixed(0)+'K';
export const fmtK = n => n >= 1e6 ? '$'+(n/1e6).toFixed(1)+'M' : n >= 1000 ? '$'+(n/1000).toFixed(0)+'K' : '$'+n;

// Responsive breakpoint hook — use in any component
// const isMobile = useWindowWidth() < 768;
export function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export const injectFonts = () => {
  if (document.getElementById('chc-gf')) return;
  const l = document.createElement('link');
  l.id = 'chc-gf'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap';
  document.head.appendChild(l);
};
