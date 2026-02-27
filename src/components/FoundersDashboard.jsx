// FoundersDashboard.jsx — recovery placeholder (Script 25-E)
// Git history did not contain a dashboard snapshot.
// Restore manually: git log --oneline -- src/App.jsx
import { C, F } from '../chc-design.js';
export default function FoundersDashboard() {
  return (
    <div style={{ background:C.bg, minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center', fontFamily:F.body }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontFamily:F.display, fontSize:36, color:C.gold,
          letterSpacing:'0.08em', marginBottom:12 }}>FOUNDERS DASHBOARD</div>
        <div style={{ color:C.red, fontSize:14, marginBottom:8 }}>
          Dashboard not recovered — check git history.
        </div>
        <div style={{ color:C.slate, fontSize:12, fontFamily:F.mono }}>
          git log --oneline -- src/App.jsx
        </div>
      </div>
    </div>
  );
}
