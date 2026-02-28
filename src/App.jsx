import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage.jsx';

// ── Page imports ──────────────────────────────────────────────────────────────
import FoundersDashboard from './pages/FoundersDashboard.jsx';
import AgentCatalog      from './pages/AgentCatalog.jsx';
import Sentinel          from './pages/Sentinel.jsx';
import NexusOS           from './pages/NexusOS.jsx';
import SmartNation       from './pages/SmartNation.jsx';
import Governance        from './pages/Governance.jsx';
import Workflows         from './pages/Workflows.jsx';
import Analytics         from './pages/Analytics.jsx';
import SettingsPage      from './pages/SettingsPage.jsx';
import MarketingPage     from './pages/MarketingPage.jsx';
import DemoPage          from './pages/DemoPage.jsx';
import OnboardPage       from './pages/OnboardPage.jsx';
import InvestorPage      from './pages/InvestorPage.jsx';
import PricingPage       from './pages/PricingPage.jsx';
import ReportsPage       from './pages/ReportsPage.jsx';
import DocsPage          from './pages/DocsPage.jsx';

// ── Hash router page map ──────────────────────────────────────────────────────
const PAGES = {
  '/':           MarketingPage,
  '/#/demo':     DemoPage,
  '/#/onboard':  OnboardPage,
  '/#/investor': InvestorPage,
  '/#/pricing':  PricingPage,
  '/#/reports':  ReportsPage,
  '/#/docs':     DocsPage,
  // Portal (authenticated)
  '/#/dashboard':  FoundersDashboard,
  '/#/agents':     AgentCatalog,
  '/#/sentinel':   Sentinel,
  '/#/nexus':      NexusOS,
  '/#/smartnation':SmartNation,
  '/#/governance': Governance,
  '/#/workflows':  Workflows,
  '/#/analytics':  Analytics,
  '/#/settings':   SettingsPage,
};

// Public routes (no auth required)
const PUBLIC_ROUTES = new Set(['/', '/#/demo', '/#/onboard', '/#/investor', '/#/pricing', '/#/reports', '/#/docs']);

// Routes that render without the portal sidebar
const BARE_ROUTES = new Set(['/', '/#/demo', '/#/onboard', '/#/investor', '/#/pricing', '/#/reports', '/#/docs']);

function isPortalDomain() {
  return window.location.hostname === 'portal.coreholdingcorp.com';
}

function getRoute() {
  const hash = window.location.hash || '';
  if ((!hash || hash === '#') && isPortalDomain()) {
    window.location.replace('/#/dashboard');
    return '/#/dashboard';
  }
  if (!hash || hash === '#') return '/';
  return '/#' + hash.slice(1);
}

// ── Notifications context (consumed by AgentCatalog + others)
const NotificationContext = React.createContext({ notifications: [], addNotification: () => {} });
export const useNotifications = () => React.useContext(NotificationContext);

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Founders',      route: '/#/dashboard',   icon: '🏛' },
  { label: 'Agents',        route: '/#/agents',       icon: '🤖' },
  { label: 'Sentinel OS',   route: '/#/sentinel',     icon: '🛡' },
  { label: 'Nexus OS',      route: '/#/nexus',        icon: '⚡' },
  { label: 'SmartNation AI',route: '/#/smartnation',  icon: '🌐' },
  { label: 'Governance',    route: '/#/governance',   icon: '📋' },
  { label: 'Workflows',     route: '/#/workflows',    icon: '🔄' },
  { label: 'Analytics',     route: '/#/analytics',    icon: '📊' },
  { label: 'Settings',      route: '/#/settings',     icon: '⚙' },
];

// ── Portal sidebar layout ─────────────────────────────────────────────────────
function PortalLayout({ route, setRoute, children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = (r) => {
    window.location.hash = r.replace('/#', '');
    setRoute(r);
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 64,
        background: '#111118',
        borderRight: '1px solid #1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid #1e1e2e', display:'flex', alignItems:'center', gap:10 }}>
          <img
            src="/chc-logo.png"
            alt="CHC"
            style={{ width:36, height:36, objectFit:'contain', flexShrink:0, background:'transparent' }}
          />
          {sidebarOpen && (
            <div>
              <div style={{ fontSize:11, color:'#6b7280', letterSpacing:'0.08em', textTransform:'uppercase' }}>Core Holding Corp</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#f5f5f5', lineHeight:1.2 }}>Governance Portal</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: sidebarOpen ? '10px 16px' : '10px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
                  borderLeft: active ? '3px solid #d4af37' : '3px solid transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? '#d4af37' : '#9ca3af',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer: toggle + user */}
        <div style={{ borderTop:'1px solid #1e1e2e', padding:'12px' }}>
          {sidebarOpen && user && (
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.email}
            </div>
          )}
          <div style={{ display:'flex', gap:6 }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ flex:1, padding:'6px', background:'#1e1e2e', border:'none', borderRadius:6, color:'#9ca3af', cursor:'pointer', fontSize:12 }}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            {sidebarOpen && (
              <button
                onClick={logout}
                style={{ flex:1, padding:'6px', background:'#1e1e2e', border:'none', borderRadius:6, color:'#ef4444', cursor:'pointer', fontSize:11 }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflow:'auto' }}>
        {children}
      </main>
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#d4af37', fontSize:14 }}>Loading…</div>
      </div>
    );
  }

  const Page        = PAGES[route] || MarketingPage;
  const isPublic    = PUBLIC_ROUTES.has(route);
  const isBare      = BARE_ROUTES.has(route);

  // Public/marketing routes — no auth, no sidebar
  if (isPublic || isBare) {
    return <Page />;
  }

  // Protected portal routes — require login
  if (!user) {
    return <LoginPage />;
  }

  return (
    <NotificationContext.Provider value={{ notifications: [], addNotification: () => {} }}>
      <PortalLayout route={route} setRoute={setRoute}>
      <Page />
    </PortalLayout>
    </NotificationContext.Provider>
  );
}
