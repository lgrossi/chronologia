// proto-tend.jsx — Tendências: gentle-but-substantial monthly summary + month nav.
const { HSEV, HFace, Icon } = window;
const { useState } = React;

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho'];
// per-month rollups (bom / mid / ruim counts), most recent last
const ROLL = {
  abril:  { bom: 21, mid: 6, ruim: 3, top: [['cansaço',7],['pontadas',5],['diarreia',4],['gases',2]], back: 22 },
  maio:   { bom: 19, mid: 8, ruim: 4, top: [['pontadas',9],['cansaço',6],['diarreia',5],['gases',4]], back: 21 },
  junho:  { bom: 18, mid: 8, ruim: 4, top: [['pontadas',8],['cansaço',6],['diarreia',5],['gases',3]], back: 21 },
};

function Tend() {
  const { FL } = window;
  const { Btn } = window;
  const [mi, setMi] = useState(5); // index into MONTHS (junho)
  const name = MONTHS[mi];
  const r = ROLL[name] || ROLL.junho;
  const total = r.bom + r.mid + r.ruim;

  return (
    <>
      {/* month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <button onClick={() => setMi(m => Math.max(3, m - 1))} disabled={mi <= 3} style={navBtn(FL, mi <= 3)}><Icon name="chevL" size={20} c={mi <= 3 ? FL.faint : FL.ink} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: FL.display, fontSize: 24, fontWeight: 700, textTransform: 'capitalize' }}>{name}</div>
          <div style={{ fontSize: 13, color: FL.faint }}>2026</div>
        </div>
        <button onClick={() => setMi(m => Math.min(5, m + 1))} disabled={mi >= 5} style={navBtn(FL, mi >= 5)}><Icon name="chevR" size={20} c={mi >= 5 ? FL.faint : FL.ink} /></button>
      </div>
      <div style={{ fontSize: 13.5, color: FL.faint, textAlign: 'center', marginBottom: 18 }}>um olhar tranquilo sobre o mês</div>

      {/* positive lead + proportion */}
      <div style={{ background: FL.accentSoft, border: `1.5px solid ${FL.line}`, borderRadius: 20, padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: FL.display, fontSize: 18, fontWeight: 600, lineHeight: 1.35, marginBottom: 14 }}>
          Mais dias tranquilos do que difíceis.
        </div>
        <div style={{ display: 'flex', height: 26, borderRadius: 9, overflow: 'hidden', border: `1.5px solid ${FL.line}` }}>
          <div style={{ flex: r.bom, background: '#9CB79A' }} />
          <div style={{ flex: r.mid, background: '#E7CFA0' }} />
          <div style={{ flex: r.ruim, background: '#D9B2AE' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 13, color: FL.soft }}>
          <span><b style={{ color: FL.ink }}>{r.bom}</b> bons</span>
          <span><b style={{ color: FL.ink }}>{r.mid}</b> +/–</span>
          <span><b style={{ color: FL.ink }}>{r.ruim}</b> difíceis</span>
        </div>
      </div>

      {/* cycle insight */}
      <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Ao longo do ciclo</div>
      <div style={{ background: FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 20, padding: 16, marginBottom: 16, boxShadow: '0 2px 0 ' + FL.line }}>
        <svg width="100%" viewBox="0 0 300 60" style={{ display: 'block' }}>
          <line x1="0" y1="52" x2="300" y2="52" stroke={FL.line} strokeWidth="1" />
          <path d="M4 50 C 90 50, 150 46, 205 32 S 285 12, 296 8 L296 56 L4 56 Z" fill={HSEV.moderado} opacity="0.12" />
          <path d="M4 50 C 90 50, 150 46, 205 32 S 285 12, 296 8" fill="none" stroke={HSEV.moderado} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="4" cy="50" r="4.5" fill="none" stroke={FL.ink} strokeWidth="2" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: FL.faint, marginTop: 2, marginBottom: 11 }}>
          <span>infusão</span><span>dia 14</span><span>próxima dose</span>
        </div>
        <div style={{ fontSize: 14.5, color: FL.soft, lineHeight: 1.45 }}>
          Os primeiros ~12 dias foram leves. O desconforto começou a voltar perto do <b style={{ color: FL.ink }}>dia {r.back}</b> — um bom assunto para a próxima consulta.
        </div>
      </div>

      {/* top symptoms */}
      <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>O que mais apareceu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
        {r.top.map(([n, v]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ fontSize: 14.5, width: 84 }}>{n}</span>
            <div style={{ flex: 1, height: 14, background: FL.lineSoft, borderRadius: 7, overflow: 'hidden' }}>
              <div style={{ width: `${(v / 14) * 100}%`, height: '100%', background: FL.accent, opacity: 0.85, borderRadius: 7 }} />
            </div>
            <span style={{ fontSize: 12.5, color: FL.soft, width: 46, textAlign: 'right' }}>{v} dias</span>
          </div>
        ))}
      </div>

      <Btn><Icon name="list" size={18} c={FL.ink} /> levar um resumo p/ o médico</Btn>
    </>
  );
}

function navBtn(FL, disabled) {
  return { width: 38, height: 38, borderRadius: '50%', border: `1.5px solid ${FL.line}`, background: FL.card,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer' };
}

window.Tend = Tend;
