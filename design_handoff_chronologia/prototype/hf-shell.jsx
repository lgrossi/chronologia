// hf-shell.jsx — shared hi-fi primitives: phone frame, severity palette,
// wave + mood-face SVG generators (themeable per direction).
// Severity colours are HER notebook ink: leve=blue, moderado=orange, grave=purple.

const HSEV = { leve: '#3F6DB0', moderado: '#E0892B', grave: '#8A4EA2' };
// soft tints of each (for fills/backgrounds in the softer directions)
const HSEV_TINT = { leve: '#E7EEF7', moderado: '#FaF0E2', grave: '#F1EAF5' };

// ── Phone frame — fixed width, height grows with content (reads as a scroll view).
function Phone({ children, bg = '#fff', statusDark = true, w = 390, label, accent = '#1c1b1a' }) {
  const ink = statusDark ? '#1c1b1a' : '#fff';
  return (
    <div style={{ width: w, background: '#0d0d0f', borderRadius: 46, padding: 11,
      boxShadow: '0 30px 60px -20px rgba(40,30,20,0.35), 0 8px 20px -8px rgba(40,30,20,0.25)' }}>
      <div style={{ background: bg, borderRadius: 36, overflow: 'hidden', position: 'relative' }}>
        {/* status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 26px 4px', color: ink, position: 'relative', zIndex: 5 }}>
          <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>9:41</span>
          <div style={{ position: 'absolute', left: '50%', top: 9, transform: 'translateX(-50%)',
            width: 86, height: 26, background: '#0d0d0f', borderRadius: 14 }} />
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Signal c={ink} /><Wifi c={ink} /><Batt c={ink} />
          </span>
        </div>
        {children}
        {/* home indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 9px' }}>
          <div style={{ width: 134, height: 5, borderRadius: 3, background: statusDark ? 'rgba(28,27,26,0.28)' : 'rgba(255,255,255,0.5)' }} />
        </div>
      </div>
    </div>
  );
}

function Signal({ c }) {
  return <svg width="18" height="12" viewBox="0 0 18 12" fill={c}><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>;
}
function Wifi({ c }) {
  return <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke={c} strokeWidth="1.7"><path d="M1 3.5 A 11 11 0 0 1 16 3.5" strokeLinecap="round"/><path d="M4 6.3 A 7 7 0 0 1 13 6.3" strokeLinecap="round"/><circle cx="8.5" cy="9.6" r="1.2" fill={c} stroke="none"/></svg>;
}
function Batt({ c }) {
  return <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke={c} opacity="0.45"/><rect x="2.5" y="2.5" width="15" height="8" rx="1.8" fill={c}/><rect x="24" y="4" width="2" height="5" rx="1" fill={c} opacity="0.45"/></svg>;
}

// ── Wave glyph — smooth, rounded. count = frequency, colour = intensity.
function HWave({ color = HSEV.leve, count = 1, h = 18, amp, sw = 3, gap = 3, w = 32 }) {
  const a = amp != null ? amp : h * 0.34;
  const mid = h / 2;
  const seg = w / 4;
  let d = `M2 ${mid}`;
  for (let i = 0; i < 4; i++) {
    const x0 = 2 + i * seg;
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` Q ${x0 + seg / 2} ${mid + dir * a} ${x0 + seg} ${mid}`;
  }
  const one = (
    <svg width={w} height={h} viewBox={`0 0 ${w + 4} ${h}`} fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round">
      <path d={d} />
    </svg>
  );
  return <span style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
    {Array.from({ length: count }).map((_, i) => <span key={i} style={{ display: 'inline-flex' }}>{one}</span>)}
  </span>;
}

// ── Mood face. variant: 'line' | 'soft' (filled).
function HFace({ mood = 'bom', size = 40, color = '#1c1b1a', sw = 2.2, fill, variant = 'line' }) {
  const mouth = mood === 'bom' ? 'M9 16 Q15 22 21 16' : mood === 'ruim' ? 'M9 19 Q15 13 21 19' : 'M9.5 17.5 H20.5';
  const eyeY = 12;
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="13.5" fill={fill || 'none'} stroke={color} strokeWidth={variant === 'soft' ? 0 : sw * 0.85} />
      <circle cx="10.5" cy={eyeY} r={sw * 0.62} fill={color} />
      <circle cx="19.5" cy={eyeY} r={sw * 0.62} fill={color} />
      <path d={mouth} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ── tiny inline icons (line style) ────────────────────────────────────
function Icon({ name, size = 22, c = 'currentColor', sw = 2 }) {
  const paths = {
    home: 'M3 11l9-7 9 7M5 10v9h6v-6h2v6h6v-9',
    list: 'M4 6h16M4 12h16M4 18h11',
    trend: 'M4 17l5-6 4 4 7-9',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
    plus: 'M12 5v14M5 12h14',
    bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 004 0',
    chevL: 'M15 5l-7 7 7 7',
    chevR: 'M9 5l7 7-7 7',
    pencil: 'M4 20l4-1 11-11-3-3L5 16l-1 4z',
    check: 'M5 12l5 5 9-11',
    drop: 'M12 3c4 5 6 7.5 6 11a6 6 0 11-12 0c0-3.5 2-6 6-11z',
    cal: 'M4 7h16v13H4zM4 7l0-3M20 7l0-3M8 3v4M16 3v4M4 11h16',
    flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

Object.assign(window, { HSEV, HSEV_TINT, Phone, HWave, HFace, Icon });
