// proto-core.jsx — Chronologia prototype shell: Floresta theme, scaling phone
// device, shared UI atoms. Relies on hf-shell.jsx for HWave/HFace/Icon/HSEV.
const { HSEV, HSEV_TINT, HWave, HFace, Icon } = window;
const { useState, useEffect, useRef } = React;

// ── Floresta theme ────────────────────────────────────────────────────
const FL = {
  paper: '#F4EEE0', card: '#FBF7EC', ink: '#3A352E', soft: '#6F685B', faint: '#A79F8E',
  line: '#E3DAC6', lineSoft: '#EDE6D6',
  accent: '#3F5A43', accentDeep: '#33492F', accentSoft: '#E5ECDF', onAccent: '#F4EEE0',
  sans: '"Hanken Grotesk", sans-serif', display: '"Schibsted Grotesk", sans-serif',
};
const SEV_LABEL = { leve: 'leve', moderado: 'moderado', grave: 'grave' };

// ── Scaling device: fixed 390×844, scales to fit viewport, letterboxed ──
function Device({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const m = 24;
      const s = Math.min((window.innerWidth - m) / 390, (window.innerHeight - m) / 844, 1.15);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#E7E1D6',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: 390, height: 844, transform: `scale(${scale})`, transformOrigin: 'center',
        background: '#0d0d0f', borderRadius: 52, padding: 11,
        boxShadow: '0 40px 80px -30px rgba(40,30,20,0.5)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', background: FL.paper,
          borderRadius: 42, overflow: 'hidden', fontFamily: FL.sans, color: FL.ink }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ light }) {
  const c = light ? '#fff' : FL.ink;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, zIndex: 30,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px 0', pointerEvents: 'none' }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: c, fontVariantNumeric: 'tabular-nums' }}>9:41</span>
      <div style={{ position: 'absolute', left: '50%', top: 11, transform: 'translateX(-50%)', width: 92, height: 28, background: '#0d0d0f', borderRadius: 15 }} />
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill={c}><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke={c} strokeWidth="1.7"><path d="M1 3.5 A 11 11 0 0 1 16 3.5" strokeLinecap="round"/><path d="M4 6.3 A 7 7 0 0 1 13 6.3" strokeLinecap="round"/><circle cx="8.5" cy="9.6" r="1.2" fill={c} stroke="none"/></svg>
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke={c} opacity="0.5"/><rect x="2.5" y="2.5" width="16" height="8" rx="1.8" fill={c}/><rect x="24" y="4" width="2" height="5" rx="1" fill={c} opacity="0.5"/></svg>
      </span>
    </div>
  );
}

function HomeIndicator({ light }) {
  return <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 30, pointerEvents: 'none' }}>
    <div style={{ width: 134, height: 5, borderRadius: 3, background: light ? 'rgba(255,255,255,0.55)' : 'rgba(58,53,46,0.3)' }} />
  </div>;
}

// scrollable screen body (between status bar and nav)
function Screen({ children, pt = 54, pb = 96, bg = FL.paper, onScroll }) {
  return (
    <div onScroll={onScroll} style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
      background: bg, WebkitOverflowScrolling: 'touch' }}>
      <div style={{ padding: `${pt}px 20px ${pb}px` }}>{children}</div>
    </div>
  );
}

// bottom tab bar (fixed within device)
function TabBar({ active, onTab, onFab }) {
  const items = [['hoje', 'home', 'Hoje'], ['linha', 'list', 'Linha'], ['add', 'plus', ''], ['tend', 'trend', 'Tend.'], ['perfil', 'user', 'Perfil']];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 25,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '12px 14px 24px', background: FL.card, borderTop: `1.5px solid ${FL.line}`,
      boxShadow: '0 -8px 24px -16px rgba(40,30,20,0.3)' }}>
      {items.map(([id, ic, label]) => id === 'add' ? (
        <button key={id} onClick={onFab} style={{ width: 54, height: 54, borderRadius: 18, background: FL.accent, color: FL.onAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -30, border: `3px solid ${FL.card}`,
          boxShadow: `0 10px 20px -6px ${FL.accent}88`, cursor: 'pointer' }}>
          <Icon name="plus" size={26} c={FL.onAccent} />
        </button>
      ) : (
        <button key={id} onClick={() => onTab(id)} style={{ background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: active === id ? FL.accent : FL.faint, width: 58, padding: 0 }}>
          <Icon name={ic} size={23} c={active === id ? FL.accent : FL.faint} sw={active === id ? 2.4 : 1.9} />
          <span style={{ fontSize: 11.5, fontWeight: active === id ? 700 : 500 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── atoms ─────────────────────────────────────────────────────────────
function Card({ children, style, fill, pad = 18, onClick }) {
  return <div onClick={onClick} style={{ background: fill || FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 20,
    padding: pad, boxShadow: '0 2px 0 ' + FL.line, cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>;
}

function Btn({ children, onClick, primary, style, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, whiteSpace: 'nowrap',
    background: primary ? (disabled ? FL.faint : FL.accent) : FL.card, color: primary ? FL.onAccent : FL.ink,
    border: primary ? 'none' : `1.5px solid ${FL.line}`, borderRadius: 16, padding: '16px', fontWeight: 700, fontSize: 16,
    fontFamily: FL.sans, cursor: disabled ? 'default' : 'pointer', boxShadow: primary && !disabled ? `0 8px 18px -8px ${FL.accent}88` : 'none', ...style }}>
    {children}</button>;
}

// severity dots (used in symptom rows / day detail)
function SevDots({ sev, size = 16 }) {
  return <span style={{ display: 'inline-flex', gap: 5 }}>
    {['leve', 'moderado', 'grave'].map(o => <span key={o} style={{ width: size, height: size, borderRadius: '50%',
      background: o === sev ? HSEV[o] : 'transparent', border: `2px solid ${o === sev ? HSEV[o] : '#CFC7B6'}` }} />)}
  </span>;
}

// small toast
function Toast({ msg }) {
  return <div style={{ position: 'absolute', bottom: 104, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
    background: FL.ink, color: FL.onAccent, padding: '12px 20px', borderRadius: 14, fontSize: 14.5, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 12px 28px -10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
    <Icon name="check" size={17} c={HSEV.leve === '#3F6DB0' ? '#9BD3A0' : '#9BD3A0'} sw={3} /> {msg}
  </div>;
}

Object.assign(window, { FL, SEV_LABEL, Device, StatusBar, HomeIndicator, Screen, TabBar, Card, Btn, SevDots, Toast });
