import CompanySelector from './CompanySelector.jsx';
import { useState } from 'react';
import {
  LayoutDashboard, Bot, Shield, Zap, Globe, ClipboardList,
  Workflow, Terminal, Play, BarChart3, Lock, Settings,
  LogOut, Menu, X, ChevronRight, Activity, Users
} from 'lucide-react';
import { C, F, useWindowWidth } from '../chc-design.js';

const NAV_ITEMS = [
  { path:'/#/dashboard',   icon:LayoutDashboard, label:'Founders',    adminOnly:true  },
  { path:'/#/agents',      icon:Bot,             label:'Agents',      adminOnly:false },
  { path:'/#/sentinel',    icon:Shield,          label:'Sentinel OS', adminOnly:false },
  { path:'/#/nexus',       icon:Zap,             label:'Nexus OS',    adminOnly:false },
  { path:'/#/smartnation', icon:Globe,           label:'SmartNation', adminOnly:false },
  { path:'/#/governance',  icon:ClipboardList,   label:'Governance',  adminOnly:false },
  { path:'/#/workflows',   icon:Workflow,        label:'Workflows',   adminOnly:false },
  { path:'/#/mcp-demo',    icon:Terminal,        label:'MCP Demo',    adminOnly:false },
  { path:'/#/live-demo',   icon:Play,            label:'Live Demo',   adminOnly:false },
  { path:'/#/ciag',        icon:Activity,        label:'CIAG',        adminOnly:true  },
  { path:'/#/tenants',     icon:Users,           label:'Companies',   adminOnly:true  },
  { path:'/#/analytics',   icon:BarChart3,       label:'Analytics',   adminOnly:true  },
  { path:'/#/ciso',        icon:Lock,            label:'CISO',        adminOnly:true  },
  { path:'/#/settings',    icon:Settings,        label:'Settings',    adminOnly:true  },
];

export default function PortalNav({ route, onNavigate, userEmail, onLogout, user }) {
  const w = useWindowWidth();
  const isMobile = w < 1024;
  const [open, setOpen] = useState(false);

  const navigate = (path) => {
    window.location.hash = path.replace('/#','#');
    if (onNavigate) onNavigate(path);
    setOpen(false);
  };

  const isActive = (path) => route === path;
  const visible = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'ADMIN');

  const navBtn = (path, Icon, label) => {
    const active = isActive(path);
    return (
      <button key={path} onClick={() => navigate(path)} style={{
        display:'flex', alignItems:'center', gap:5, padding:'5px 9px',
        background: active ? 'rgba(212,168,67,0.1)' : 'transparent',
        border: active ? '1px solid rgba(212,168,67,0.25)' : '1px solid transparent',
        borderRadius:5, color: active ? C.gold : C.slate,
        cursor:'pointer', fontSize:11, fontFamily:F.body,
        fontWeight: active ? 600 : 400, whiteSpace:'nowrap',
      }}>
        <Icon size={12}/><span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <nav style={{
        background:'rgba(7,12,24,0.95)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(212,168,67,0.15)',
        padding: isMobile ? '0 16px' : '0 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        height:56, position:'sticky', top:0, zIndex:100, fontFamily:F.body, gap:12,
      }}>
        <button onClick={() => navigate('/#/dashboard')} style={{
          background:'none', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', gap:10, flexShrink:0, padding:0,
        }}>
          <img src="/logo-dark.png" alt="CoreIdentity" style={{height:30, width:'auto'}} />
          {!isMobile && (
            <div>
              <div style={{color:C.white, fontFamily:F.display, fontSize:12, letterSpacing:'0.1em', lineHeight:1.1}}>
                COREIDENTITY DEVELOPMENT GROUP
              </div>
              <div style={{color:C.gold, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:F.mono}}>
                GOVERNANCE PORTAL
              </div>
            </div>
          )}
        </button>

        {!isMobile && (
          <div style={{display:'flex', alignItems:'center', gap:2, flex:1, justifyContent:'center', overflow:'hidden'}}>
            {visible.map(({path, icon:Icon, label}) => navBtn(path, Icon, label))}
          </div>
        )}

        <div style={{display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
          {!isMobile && <CompanySelector />}
          <div style={{
            display:'flex', alignItems:'center', gap:5, padding:'4px 8px',
            border:'1px solid rgba(34,197,94,0.2)', borderRadius:4,
            background:'rgba(34,197,94,0.05)',
          }}>
            <span style={{
              width:5, height:5, borderRadius:'50%', background:C.green,
              display:'inline-block', boxShadow:'0 0 6px '+C.green,
              animation:'cidg-pulse 2s infinite',
            }}/>
            <span style={{fontSize:9, fontFamily:F.mono, color:C.green, letterSpacing:'0.05em'}}>OPERATIONAL</span>
          </div>
          {!isMobile && (
            <button onClick={onLogout} style={{
              display:'flex', alignItems:'center', gap:5, background:'transparent',
              border:'1px solid '+C.border, color:C.slate, borderRadius:5,
              padding:'5px 10px', cursor:'pointer', fontSize:11, fontFamily:F.body,
            }}>
              <LogOut size={12}/><span>Sign out</span>
            </button>
          )}
          {isMobile && (
            <button onClick={() => setOpen(o => !o)} style={{
              background:'transparent', border:'1px solid '+C.border,
              color:C.white, borderRadius:5, padding:7, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {open ? <X size={16}/> : <Menu size={16}/>}
            </button>
          )}
        </div>
      </nav>

      {isMobile && open && (
        <div style={{
          position:'fixed', top:56, left:0, right:0, bottom:0, zIndex:99,
          background:'rgba(7,12,24,0.98)', backdropFilter:'blur(20px)',
          borderTop:'1px solid rgba(212,168,67,0.15)',
          padding:'12px 16px', display:'flex', flexDirection:'column',
          gap:3, overflowY:'auto',
        }}>
          <div style={{marginBottom:8, paddingBottom:12, borderBottom:'1px solid '+C.border}}>
            <CompanySelector />
          </div>
          {visible.map(({path, icon:Icon, label}) => {
            const active = isActive(path);
            return (
              <button key={path} onClick={() => navigate(path)} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px',
                background: active ? 'rgba(212,168,67,0.08)' : 'transparent',
                border: active ? '1px solid rgba(212,168,67,0.2)' : '1px solid transparent',
                borderRadius:7, color: active ? C.gold : C.slate,
                cursor:'pointer', fontSize:14, fontFamily:F.body,
                fontWeight: active ? 600 : 400,
              }}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <Icon size={16}/><span>{label}</span>
                </div>
                {active && <ChevronRight size={14} style={{color:C.gold}}/>}
              </button>
            );
          })}
          <div style={{borderTop:'1px solid '+C.border, marginTop:8, paddingTop:12}}>
            {userEmail && (
              <div style={{color:C.slate, fontSize:11, fontFamily:F.mono, padding:'4px 14px', marginBottom:8}}>
                {userEmail}
              </div>
            )}
            <button onClick={() => { setOpen(false); onLogout(); }} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'12px 14px', background:'rgba(239,68,68,0.05)',
              border:'1px solid rgba(239,68,68,0.2)', borderRadius:7,
              color:'#ef4444', fontSize:14, cursor:'pointer', fontFamily:F.body,
            }}>
              <LogOut size={15}/><span>Sign out</span>
            </button>
          </div>
        </div>
      )}
      <style>{'@keyframes cidg-pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
    </>
  );
}
