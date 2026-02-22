import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Package, GitBranch, Shield, BarChart3, Menu, Bell, Settings, X, LogOut, Award } from 'lucide-react';
import { createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import AgentCatalog from './pages/AgentCatalog';
import Workflows from './pages/Workflows';
import Governance from './pages/Governance';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/SettingsPage';

import SentinelOS from './pages/Sentinel';
import SmartNationAI from './pages/SmartNation';
import FoundersDashboard from './pages/FoundersDashboard';
const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };
  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm ${n.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

const NAV = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Agents', href: '/agents', icon: Package },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Governance', href: '/governance', icon: Shield },
  { name: 'Sentinel OS', href: '/sentinel', icon: Shield },
  { name: 'SmartNation AI', href: '/smartnation', icon: Database },
  { name: 'Founders', href: '/founders', icon: Award },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function MobileSidebar({ isOpen, onClose }) {
  const location = useLocation();
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose}></div>
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-50 lg:hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-400">CoreIdentity</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href} onClick={onClose}
                className={`flex items-center px-3 py-3 rounded-lg ${active ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                <Icon className="h-5 w-5" /><span className="ml-3">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function DesktopSidebar({ isOpen }) {
  const location = useLocation();
  return (
    <div className={`hidden lg:block ${isOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all`}>
      <div className="p-4 border-b border-gray-800">
        {isOpen ? <h1 className="text-xl font-bold text-blue-400">CoreIdentity</h1> : <div className="text-xl font-bold text-blue-400">CI</div>}
      </div>
      <nav className="p-2 space-y-1">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href}
              className={`flex items-center px-3 py-2 rounded-lg ${active ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
              <Icon className="h-5 w-5" />
              {isOpen && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifList, setNotifList] = React.useState([]);
  React.useEffect(function() {
    function handler(e) {
      setNotifList(function(prev) {
        return [{ message: e.detail.message, type: e.detail.type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10);
      });
    }
    window.addEventListener('ci-notif', handler);
    return function() { window.removeEventListener('ci-notif', handler); };
  }, []);
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'CI';
  return (
    <nav className="bg-white shadow-sm px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 lg:hidden">CoreIdentity</h1>
      </div>
      <div className="flex items-center space-x-3">
                <div className="relative">
          <button
            onClick={function() { setNotifOpen(function(p) { return !p; }); }}
            className="p-2 hover:bg-gray-100 rounded-full relative"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {notifList.length > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                {notifList.length}
              </span>
            )}
            {notifList.length === 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                <button
                  onClick={function() { setNotifList([]); setNotifOpen(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >Clear all</button>
              </div>
              {notifList.length === 0
                ? <div className="p-6 text-center text-sm text-gray-400">No notifications</div>
                : notifList.map(function(n, i) {
                    return (
                      <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className={"text-sm " + (n.type === "error" ? "text-red-700" : "text-gray-700")}>{n.message}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{n.time}</div>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</span>
              <span className="text-xs text-blue-600 font-medium">{user.role}</span>
            </div>
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-full" title="Sign out">
              <LogOut className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<ErrorBoundary name="Dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></ErrorBoundary>} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <DesktopSidebar isOpen={desktopSidebarOpen} />
      <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => {
          if (window.innerWidth >= 1024) setDesktopSidebarOpen(!desktopSidebarOpen);
          else setMobileSidebarOpen(!mobileSidebarOpen);
        }} />
        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/" element={<ErrorBoundary name="Dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/agents" element={<ErrorBoundary name="AgentCatalog"><ProtectedRoute><AgentCatalog /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/workflows" element={<ErrorBoundary name="Workflows"><ProtectedRoute><Workflows /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/sentinel" element={<ErrorBoundary name="SentinelOS"><SentinelOS /></ErrorBoundary>} />
              <Route path="/smartnation" element={<ErrorBoundary name="SmartNationAI"><SmartNationAI /></ErrorBoundary>} />
              <Route path="/founders" element={<ErrorBoundary name="FoundersDashboard"><FoundersDashboard /></ErrorBoundary>} />
              <Route path="/governance" element={<ErrorBoundary name="Governance"><ProtectedRoute><Governance /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/analytics" element={<ErrorBoundary name="Analytics"><ProtectedRoute><Analytics /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary name="SettingsPage"><ProtectedRoute><SettingsPage /></ProtectedRoute></ErrorBoundary>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
