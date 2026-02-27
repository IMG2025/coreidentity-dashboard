import { C, F } from '../chc-design.js';
const LINKS = [
  ['#/demo','Live Demo'],['#/pricing','Pricing'],
  ['#/docs','API Docs'],['#/investor','Investors']
];
export default function Nav({ route }) {
  return (
    <nav style={{
      background:C.bg+'f0', backdropFilter:'blur(12px)',
      borderBottom:'1px solid '+C.border, padding:'0 40px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      height:60, position:'sticky', top:0, zIndex:100,
      fontFamily:F.body
    }}>
      <a href="#/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:28,height:28,background:C.gold,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:C.bg}}>C</div>
        <div>
          <div style={{color:C.white,fontFamily:F.display,fontSize:16,letterSpacing:'0.08em'}}>COREIDENTITY</div>
          <div style={{color:C.slate,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',marginTop:-2}}>by Core Holding Corp</div>
        </div>
      </a>
      <div style={{display:'flex',gap:4,alignItems:'center'}}>
        {LINKS.map(([h,l]) => (
          <a key={h} href={h} style={{
            color:route===h.slice(1)?C.gold:C.slate, textDecoration:'none',
            padding:'8px 14px', borderRadius:6, fontSize:13, fontWeight:500,
            background:route===h.slice(1)?C.gold+'11':'none',
            border:route===h.slice(1)?'1px solid '+C.gold+'33':'1px solid transparent'
          }}>{l}</a>
        ))}
      </div>
      <a href="#/onboard" style={{background:C.gold,color:C.bg,textDecoration:'none',padding:'9px 20px',borderRadius:6,fontSize:13,fontWeight:700,letterSpacing:'0.04em'}}>Free Assessment →</a>
    </nav>
  );
}
