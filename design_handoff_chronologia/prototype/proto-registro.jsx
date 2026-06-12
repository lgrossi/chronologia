// proto-registro.jsx — the daily register flow (controlled, progressive).
const { HSEV, HFace, HWave, Icon } = window;
const { useState } = React;

const PRESETS = ['diarreia', 'pontadas', 'gases', 'cansaço', 'intestino ativo', 'náusea'];
const SNAPS = [
  { p: 0, label: 'leve' }, { p: 0.25, label: 'leve a moderado' }, { p: 0.5, label: 'moderado' },
  { p: 0.75, label: 'moderado a grave' }, { p: 1, label: 'grave' },
];
function lerp(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
const RGB = { leve: [63, 109, 176], moderado: [224, 137, 43], grave: [138, 78, 162] };
function sampleSev(p) {
  const c = p < 0.5 ? lerp(RGB.leve, RGB.moderado, p / 0.5) : lerp(RGB.moderado, RGB.grave, (p - 0.5) / 0.5);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function baseSev(p) { return p < 0.34 ? 'leve' : p < 0.67 ? 'moderado' : 'grave'; }

function Registro({ initial, onSave, onClose }) {
  const { FL } = window;
  const { Btn, SevDots } = window;
  const [mood, setMood] = useState(initial?.mood || null);
  const [gate, setGate] = useState(initial ? (initial.sev ? 'sim' : 'nao') : null);
  const [sevIdx, setSevIdx] = useState(1);
  const [count, setCount] = useState(2);
  const [syms, setSyms] = useState(() => {
    const m = {}; (initial?.symptoms || []).forEach(s => m[s.name] = s.sev); return m;
  });
  const [custom, setCustom] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState(initial?.note || '');

  const snap = SNAPS[sevIdx];
  const waveColor = sampleSev(snap.p);

  const allSyms = [...PRESETS, ...custom];
  const cycle = (name) => setSyms(s => {
    const cur = s[name];
    const next = cur == null ? 'leve' : cur === 'leve' ? 'moderado' : cur === 'moderado' ? 'grave' : null;
    const m = { ...s }; if (next == null) delete m[name]; else m[name] = next; return m;
  });

  const doSave = () => {
    const symptoms = allSyms.filter(n => syms[n]).map(n => ({ name: n, sev: syms[n] }));
    onSave(gate === 'sim'
      ? { mood, sev: baseSev(snap.p), sevLabel: snap.label, count, symptoms, note }
      : { mood, sev: null, symptoms: [], note });
  };

  const H = ({ children, style }) => <div style={{ fontFamily: FL.display, fontSize: 17, fontWeight: 600, marginBottom: 11, ...style }}>{children}</div>;

  return (
    <div style={{ position: 'absolute', inset: 0, background: FL.paper, zIndex: 50, overflowY: 'auto' }}>
      <div style={{ padding: '54px 20px 40px' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button onClick={onClose} style={iconBtn(FL)}><Icon name="chevL" size={22} c={FL.ink} /></button>
          <div style={{ fontFamily: FL.display, fontSize: 18, fontWeight: 700 }}>domingo, 10 jun</div>
          <div style={{ width: 38 }} />
        </div>

        {/* mood */}
        <div style={{ background: FL.accentSoft, border: `1.5px solid ${FL.line}`, borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <div style={{ fontFamily: FL.display, fontSize: 18, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>Como você passou hoje?</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
            {[['bom', 'bem'], ['neutro', 'mais ou menos'], ['ruim', 'difícil']].map(([m, lbl]) => {
              const on = mood === m;
              return <button key={m} onClick={() => setMood(m)} style={{ background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0 }}>
                <span style={{ width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: on ? FL.accent : 'transparent', border: on ? 'none' : `2px solid ${FL.line}`, transition: 'all .15s' }}>
                  <HFace mood={m} size={38} color={on ? FL.onAccent : FL.soft} />
                </span>
                <span style={{ fontSize: 11.5, color: on ? FL.ink : FL.faint, fontWeight: on ? 700 : 500 }}>{lbl}</span>
              </button>;
            })}
          </div>
        </div>

        {/* gate (after mood) */}
        {mood && (
          <div style={{ animation: 'fadeIn .2s' }}>
            <H>Teve algo para anotar?</H>
            <div style={{ display: 'flex', gap: 10, marginBottom: gate ? 20 : 8 }}>
              {[['nao', 'não, tranquilo'], ['sim', 'sim, tive sintomas']].map(([g, lbl]) => {
                const on = gate === g;
                return <button key={g} onClick={() => setGate(g)} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: 14,
                  cursor: 'pointer', fontFamily: FL.sans, fontSize: 15, fontWeight: on ? 700 : 500,
                  background: on ? (g === 'sim' ? FL.accentSoft : FL.accent) : FL.card,
                  color: on ? (g === 'sim' ? FL.accent : FL.onAccent) : FL.soft,
                  border: on && g === 'sim' ? `2px solid ${FL.accent}` : `1.5px solid ${FL.line}` }}>{lbl}</button>;
              })}
            </div>
          </div>
        )}

        {/* report (gate = sim) */}
        {gate === 'sim' && (
          <div style={{ animation: 'fadeIn .25s' }}>
            <H style={{ marginBottom: 2 }}>As ondas de hoje</H>
            <div style={{ fontSize: 13, color: FL.faint, marginBottom: 12 }}>a cor é a força · você desenha quantas</div>
            <div style={{ background: FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 20, padding: 16, marginBottom: 18, boxShadow: '0 2px 0 ' + FL.line }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 13.5, color: FL.soft }}>intensidade</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{snap.label}</span>
              </div>
              {/* slider track with 5 snap dots */}
              <div style={{ position: 'relative', height: 26, marginBottom: 8 }}>
                <div style={{ position: 'absolute', top: 10, left: 4, right: 4, height: 7, borderRadius: 5,
                  background: `linear-gradient(90deg, ${HSEV.leve}, ${HSEV.moderado}, ${HSEV.grave})` }} />
                {SNAPS.map((s, i) => (
                  <button key={i} onClick={() => setSevIdx(i)} style={{ position: 'absolute', top: 0, left: `calc(${s.p * 100}% - 13px)`,
                    width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                    {i === sevIdx
                      ? <span style={{ display: 'block', width: 24, height: 24, margin: '1px', borderRadius: '50%', background: FL.card, border: `3px solid ${waveColor}`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                      : <span style={{ display: 'block', width: 11, height: 11, margin: '7.5px', borderRadius: '50%', background: FL.card, border: `2px solid ${FL.faint}` }} />}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: FL.soft, marginBottom: 16 }}>
                <span>leve</span><span>moderado</span><span>grave</span>
              </div>
              <div style={{ borderTop: `1.5px dashed ${FL.line}`, paddingTop: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => setCount(c => Math.max(1, c - 1))} style={stepBtn(FL, false)}>–</button>
                  <span style={{ minWidth: 120, display: 'flex', justifyContent: 'center' }}>
                    <HWave color={waveColor} count={count} h={22} w={34} sw={3.2} gap={6} />
                  </span>
                  <button onClick={() => setCount(c => Math.min(6, c + 1))} style={stepBtn(FL, true)}>+</button>
                </div>
                <div style={{ fontSize: 12, color: FL.faint, textAlign: 'center', marginTop: 9 }}>{count} {count === 1 ? 'onda' : 'ondas'} hoje</div>
              </div>
            </div>

            {/* symptoms */}
            <H>Sintomas</H>
            <div style={{ background: FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 20, padding: 6, marginBottom: 14, boxShadow: '0 2px 0 ' + FL.line }}>
              {allSyms.map((s, i) => {
                const sev = syms[s]; const on = !!sev;
                return <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                  borderBottom: i < allSyms.length - 1 ? `1.5px solid ${FL.line}` : 'none' }}>
                  <button onClick={() => cycle(s)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    <span style={{ width: 23, height: 23, borderRadius: 8, flexShrink: 0, background: on ? FL.accent : 'transparent',
                      border: `2px solid ${on ? FL.accent : FL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Icon name="check" size={15} c={FL.onAccent} sw={2.6} />}
                    </span>
                  </button>
                  <span style={{ flex: 1, fontSize: 15.5, color: on ? FL.ink : FL.soft }}>{s}</span>
                  {on
                    ? <button onClick={() => cycle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><SevDots sev={sev} /></button>
                    : <button onClick={() => cycle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: FL.faint, fontFamily: FL.sans }}>tocar</button>}
                </div>;
              })}
            </div>

            {/* custom add */}
            {adding ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { setCustom(c => [...c, draft.trim()]); setSyms(s => ({ ...s, [draft.trim()]: 'leve' })); setDraft(''); setAdding(false); } }}
                  placeholder="novo sintoma…" style={{ flex: 1, padding: '13px 15px', borderRadius: 14, border: `1.5px solid ${FL.accent}`,
                    fontFamily: FL.sans, fontSize: 15, background: FL.card, color: FL.ink, outline: 'none' }} />
                <button onClick={() => { if (draft.trim()) { setCustom(c => [...c, draft.trim()]); setSyms(s => ({ ...s, [draft.trim()]: 'leve' })); } setDraft(''); setAdding(false); }}
                  style={{ ...stepBtn(FL, true), width: 48, borderRadius: 14, fontSize: 16 }}>ok</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14,
                border: `1.5px dashed ${FL.line}`, color: FL.soft, marginBottom: 18, background: 'transparent', cursor: 'pointer', fontFamily: FL.sans }}>
                <Icon name="plus" size={18} c={FL.soft} /><span style={{ fontSize: 14.5 }}>adicionar outro sintoma</span>
              </button>
            )}
          </div>
        )}

        {/* note (after mood) */}
        {mood && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', borderRadius: 14, border: `1.5px solid ${FL.line}`, background: FL.card }}>
              <Icon name="pencil" size={17} c={FL.soft} />
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="uma nota do dia (opcional)" rows={note ? 3 : 1}
                style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: FL.sans, fontSize: 14.5, color: FL.ink, lineHeight: 1.5 }} />
            </div>
          </div>
        )}

        {/* save */}
        {gate && (
          <Btn primary onClick={doSave}>{gate === 'sim' ? 'guardar o dia' : 'guardar — foi um bom dia'} <Icon name="check" size={18} c={FL.onAccent} sw={2.6} /></Btn>
        )}
      </div>
    </div>
  );
}

function iconBtn(FL) { return { width: 38, height: 38, borderRadius: '50%', border: `1.5px solid ${FL.line}`, background: FL.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }; }
function stepBtn(FL, primary) {
  return { width: 40, height: 40, borderRadius: 12, cursor: 'pointer', fontSize: 22, lineHeight: 1, fontFamily: FL.sans,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: primary ? 'none' : `2px solid ${FL.line}`, background: primary ? FL.accent : FL.card, color: primary ? FL.onAccent : FL.soft };
}

window.Registro = Registro;
