import React, { useState, useEffect, useRef } from 'react';

const C = {
  bg: '#070c18', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  white: '#f8fafc', slate: '#64748b', blue: '#3b82f6', green: '#22c55e',
  gold: '#d4af37', red: '#ef4444', teal: '#14b8a6', indigo: '#6366f1',
  amber: '#d4af37',
};
const F = { mono: 'monospace', display: 'monospace', body: 'system-ui,-apple-system,sans-serif' };

const STEP_DURATION = 8000;

const STEPS = [
  {
    id: 'intro',
    eyebrow: 'AGENTIC EXECUTION GOVERNANCE',
    headline: 'Your agents are making\nconsequential decisions\nright now.',
    sub: 'Without a control plane designed to govern them.',
    accent: C.white,
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%)',
  },
  {
    id: 'enforcement',
    eyebrow: 'LIVE ENFORCEMENT — SAL KERNEL',
    headline: 'A threat was intercepted\nbefore it reached\nyour infrastructure.',
    sub: null,
    accent: C.red,
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.12) 0%, transparent 60%)',
    event: {
      agent: 'Autonomous Data Agent',
      action: 'DROP TABLE customer_records',
      policy: 'Governance Enforcement Policy',
      outcome: 'BLOCKED',
      latency: '2.3ms',
      trace: ['Identity ✓', 'Intent ✗', 'Asset ✗', 'Action ✗', 'Context ✗'],
    },
  },
  {
    id: 'iiaac',
    eyebrow: 'POLICY DECISION TRACE — IIAAC MODEL',
    headline: 'Five dimensions evaluated.\nThree failed.\nExecution stopped.',
    sub: 'Deterministic enforcement. No exceptions.',
    accent: C.amber,
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 60%)',
    iiaac: [
      { dim: 'Identity', label: 'WHO', result: 'PASS', detail: 'Autonomous Data Agent · TIER_2' },
      { dim: 'Intent', label: 'WHY', result: 'FAIL', detail: 'Destructive operation not in policy scope' },
      { dim: 'Asset', label: 'WHAT', result: 'FAIL', detail: 'customer_records — protected dataset' },
      { dim: 'Action', label: 'HOW', result: 'FAIL', detail: 'DROP TABLE — explicitly prohibited' },
      { dim: 'Context', label: 'WHEN', result: 'PASS', detail: 'Within operating window' },
    ],
  },
  {
    id: 'compliance',
    eyebrow: 'COMPLIANCE POSTURE',
    headline: 'Every framework.\nEvery audit.\nEvidence already captured.',
    sub: null,
    accent: C.teal,
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 60%)',
    frameworks: [
      { name: 'SOC2 Type II', score: 98 },
      { name: 'HIPAA', score: 96 },
      { name: 'ISO 27001', score: 91 },
      { name: 'PCI-DSS', score: 93 },
    ],
    pqc: 'FIPS 203 / 204 / 205 — Quantum-Resistant',
  },
  {
    id: 'close',
    eyebrow: 'COREIDENTITY DEVELOPMENT GROUP',
    headline: 'Every agent.\nEvery decision.\nGoverned before execution.',
    sub: 'Request a briefing to see your environment under AEG.',
    accent: C.white,
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)',
    cta: true,
  },
];

function ProgressBar({ step, total, progress }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', gap: 4, padding: '12px 16px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: 'rgba(255,255,255,0.7)',
            width: i < step ? '100%' : i === step ? `${progress}%` : '0%',
            transition: i === step ? 'none' : 'width 0.3s ease',
          }} />
        </div>
      ))}
    </div>
  );
}

function StepIntro({ step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', height: '100%', padding: '0 32px', maxWidth: 600 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', marginBottom: 24 }}>{step.eyebrow}</div>
      <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.15, color: step.accent, whiteSpace: 'pre-line', margin: 0, marginBottom: 20 }}>{step.headline}</h1>
      {step.sub && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>{step.sub}</p>}
    </div>
  );
}

function StepEnforcement({ step }) {
  const e = step.event;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 32px', maxWidth: 600 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', marginBottom: 20 }}>{step.eyebrow}</div>
      <h1 style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2, color: step.accent, whiteSpace: 'pre-line', margin: 0, marginBottom: 24 }}>{step.headline}</h1>
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 9, fontFamily: F.mono, color: C.red, letterSpacing: '0.12em' }}>ENFORCEMENT EVENT</span>
          <span style={{ fontSize: 9, fontFamily: F.mono, color: 'rgba(255,255,255,0.3)' }}>{e.latency}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 6 }}>{e.agent}</div>
        <div style={{ fontSize: 11, fontFamily: F.mono, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>{e.action}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {e.trace.map((t, i) => (
            <span key={i} style={{ fontSize: 9, fontFamily: F.mono, padding: '3px 8px', borderRadius: 3, background: t.includes('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${t.includes('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: t.includes('✓') ? C.green : C.red }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, fontFamily: F.mono, color: C.red, fontWeight: 700 }}>ACTION: {e.outcome} — EXECUTION STOPPED</div>
      </div>
    </div>
  );
}

function StepIIAAC({ step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 32px', maxWidth: 640 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', marginBottom: 16 }}>{step.eyebrow}</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, color: step.accent, whiteSpace: 'pre-line', margin: 0, marginBottom: 20 }}>{step.headline}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {step.iiaac.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: item.result === 'FAIL' ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)', border: `1px solid ${item.result === 'FAIL' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ width: 60, flexShrink: 0 }}>
              <div style={{ fontSize: 8, fontFamily: F.mono, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{item.dim}</div>
            </div>
            <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{item.detail}</div>
            <span style={{ fontSize: 10, fontFamily: F.mono, fontWeight: 700, color: item.result === 'FAIL' ? C.red : C.green }}>{item.result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCompliance({ step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 32px', maxWidth: 600 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', marginBottom: 16 }}>{step.eyebrow}</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: step.accent, whiteSpace: 'pre-line', margin: 0, marginBottom: 20 }}>{step.headline}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {step.frameworks.map((fw, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{fw.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.teal, fontFamily: F.mono }}>{fw.score}%</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 }}>
              <div style={{ height: '100%', width: `${fw.score}%`, background: C.teal, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: F.mono, color: C.teal }}>
        {step.pqc}
      </div>
    </div>
  );
}

function StepClose({ step, onRestart, onContact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', height: '100%', padding: '0 32px', maxWidth: 600 }}>
      <div style={{ fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', marginBottom: 24 }}>{step.eyebrow}</div>
      <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.15, color: step.accent, whiteSpace: 'pre-line', margin: 0, marginBottom: 20 }}>{step.headline}</h1>
      {step.sub && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 32px', lineHeight: 1.6 }}>{step.sub}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="https://coreidentitygroup.com/contact" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: C.white, fontSize: 14, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
          Request a Briefing →
        </a>
        <button onClick={onRestart} style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>
          Watch Again
        </button>
      </div>
    </div>
  );
}

export default function DemoNarrative() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  function startProgress(stepIdx) {
    setProgress(0);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / STEP_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current);
        if (stepIdx < STEPS.length - 1) {
          setStep(stepIdx + 1);
        } else {
          setDone(true);
        }
      }
    }, 50);
  }

  useEffect(() => {
    if (!paused && !done) {
      startProgress(step);
    }
    return () => { clearInterval(progressRef.current); };
  }, [step, paused, done]);

  function handleRestart() {
    setStep(0);
    setProgress(0);
    setDone(false);
    setPaused(false);
  }

  const current = STEPS[step];

  return (
    <div
      onClick={() => setPaused(p => !p)}
      style={{ position: 'fixed', inset: 0, background: C.bg, fontFamily: F.body, color: C.white, overflow: 'hidden', cursor: 'pointer' }}
    >
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Background gradient */}
      <div style={{ position: 'absolute', inset: 0, background: current.bg, transition: 'background 0.8s ease', pointerEvents: 'none' }} />

      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      {/* Progress bars */}
      <ProgressBar step={step} total={STEPS.length} progress={done ? 100 : progress} />

      {/* Pause indicator */}
      {paused && (
        <div style={{ position: 'fixed', top: 40, right: 20, fontSize: 10, fontFamily: F.mono, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>PAUSED — TAP TO RESUME</div>
      )}

      {/* Step content */}
      <div key={step} style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', alignItems: 'center', animation: 'fadeIn 0.4s ease forwards' }}>
        {current.id === 'intro' && <StepIntro step={current} />}
        {current.id === 'enforcement' && <StepEnforcement step={current} />}
        {current.id === 'iiaac' && <StepIIAAC step={current} />}
        {current.id === 'compliance' && <StepCompliance step={current} />}
        {current.id === 'close' && <StepClose step={current} onRestart={handleRestart} />}
      </div>

      {/* Step counter */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, fontSize: 9, fontFamily: F.mono, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
        {step + 1} / {STEPS.length}
      </div>
    </div>
  );
}
