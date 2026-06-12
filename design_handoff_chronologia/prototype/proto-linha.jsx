// proto-linha.jsx — Linha do tempo: calendário ⇄ diário, filtros, day detail.
const { HSEV, HFace, HWave, Icon } = window;
const { useState } = React;

// month data (June 2026). sev null = no symptoms; some days have infusão / diarreia flags.
const MONTH = (() => {
  const pat = ['leve','leve','leve','moderado',null,null,'leve',null,'moderado',null,null,'leve',
    'leve','grave','leve',null,'leve','moderado',null,'leve',null,null,'grave','leve',
    'leve',null,'leve','moderado','leve','leve'];
  return pat.map((sev, i) => ({
    day: i + 1, sev, infusao: i === 3, diarreia: [0,3,8,17,22].includes(i),
    mood: sev === 'grave' ? 'ruim' : sev === 'moderado' ? 'neutro' : 'bom',
    count: sev === 'grave' ? 3 : sev === 'moderado' ? 2 : 1,
  }));
})();
const WD = ['S','T','Q','Q','S','S','D'];
const DETAIL = {
  9: { tags: [['pontadas','grave'],['gases','moderado'],['cansaço','leve']], note: 'Dia difícil, fiquei mais de molho.' },
  4: { tags: [['diarreia','moderado']], note: 'Dia da infusão — tudo tranquilo na clínica.' },
};

function Linha({ filter, setFilter, onAddEvento }) {
  const { FL } = window;
  const [view, setView] = useState('cal');
  const [sel, setSel] = useState(null); // selected day number

  const FILTERS = ['tudo', 'diarreia', 'pontadas', 'cansaço', 'infusão'];
  const matches = (d) => {
    if (filter === 'tudo') return true;
    if (filter === 'infusão') return d.infusao;
    if (filter === 'diarreia') return d.diarreia;
    return d.sev != null; // pontadas/cansaço — approximate: any symptom day
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: FL.display, fontSize: 26, fontWeight: 700 }}>Junho</div>
        {/* toggle */}
        <div style={{ display: 'inline-flex', background: FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 13, padding: 3 }}>
          {[['cal', 'Calendário'], ['dia', 'Diário']].map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: FL.sans, fontSize: 13.5, fontWeight: view === v ? 700 : 500,
              background: view === v ? FL.accent : 'transparent', color: view === v ? FL.onAccent : FL.soft }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const on = filter === f;
          return <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 13px', borderRadius: 11, cursor: 'pointer', fontFamily: FL.sans,
            fontSize: 13, fontWeight: on ? 700 : 500, background: on ? FL.ink : 'transparent', color: on ? FL.onAccent : FL.soft,
            border: `1.5px solid ${on ? FL.ink : FL.line}` }}>{f}</button>;
        })}
      </div>

      {view === 'cal' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 5 }}>
            {WD.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11.5, color: FL.faint }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 16 }}>
            {[0,1,2].map(i => <div key={'b'+i} />)}
            {MONTH.map(d => {
              const dim = !matches(d);
              return <button key={d.day} onClick={() => setSel(d.day)} style={{ aspectRatio: '1', borderRadius: 9, position: 'relative', padding: 4,
                border: d.infusao ? `1.5px solid ${FL.ink}` : `1.5px solid ${d.sev ? 'transparent' : FL.line}`,
                background: d.sev ? HSEV[d.sev] : FL.card, opacity: dim ? 0.25 : 1, cursor: 'pointer',
                outline: sel === d.day ? `2.5px solid ${FL.accent}` : 'none', outlineOffset: 1,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: d.sev ? '#fff' : FL.soft }}>{d.day}</span>
                {d.infusao && <span style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderRadius: '50%', border: `2px solid ${d.sev ? '#fff' : FL.ink}` }} />}
              </button>;
            })}
          </div>

          {/* legend */}
          <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            {['leve','moderado','grave'].map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: FL.soft }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: HSEV[s] }} />{s}</span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: FL.soft }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${FL.ink}` }} />infusão</span>
          </div>
        </>
      ) : (
        <DiarioList onSel={setSel} />
      )}

      {/* day detail sheet */}
      {sel != null && <DayDetail day={sel} onClose={() => setSel(null)} onAddEvento={onAddEvento} />}
    </>
  );
}

function DiarioList({ onSel }) {
  const { FL } = window;
  const rows = MONTH.filter(d => d.sev || d.infusao).slice().reverse().slice(0, 10);
  const wdName = ['dom','seg','ter','qua','qui','sex','sáb'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(d => {
        const det = DETAIL[d.day];
        return <button key={d.day} onClick={() => onSel(d.day)} style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left',
          background: d.infusao ? FL.accentSoft : FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 16, padding: 13, cursor: 'pointer', boxShadow: '0 2px 0 ' + FL.line }}>
          <div style={{ textAlign: 'center', width: 34 }}>
            <div style={{ fontFamily: FL.display, fontSize: 22, fontWeight: 700, lineHeight: 0.9 }}>{String(d.day).padStart(2,'0')}</div>
            <div style={{ fontSize: 11, color: FL.faint }}>{wdName[(d.day + 6) % 7]}</div>
          </div>
          <div style={{ flex: 1 }}>
            {d.sev ? <HWave color={HSEV[d.sev]} count={d.count} h={14} w={26} sw={2.6} /> : <span style={{ fontSize: 13, color: FL.soft }}>infusão</span>}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
              {d.infusao && <Tag FL={FL} on>infusão</Tag>}
              {det?.tags?.slice(0,2).map(([n]) => <Tag key={n} FL={FL}>{n}</Tag>)}
            </div>
          </div>
          <HFace mood={d.mood} size={24} color={FL.soft} />
        </button>;
      })}
    </div>
  );
}

function Tag({ children, FL, on }) {
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
    background: on ? FL.accent : FL.paper, color: on ? FL.onAccent : FL.soft, border: `1.5px solid ${on ? FL.accent : FL.line}` }}>{children}</span>;
}

function DayDetail({ day, onClose, onAddEvento }) {
  const { FL } = window;
  const { Btn, SevDots } = window;
  const d = MONTH[day - 1];
  const det = DETAIL[day];
  const wdFull = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,32,22,0.4)' }} />
      <div style={{ position: 'relative', background: FL.paper, borderRadius: '26px 26px 0 0', padding: '12px 22px 40px',
        maxHeight: '78%', overflowY: 'auto', boxShadow: '0 -16px 40px -12px rgba(0,0,0,0.4)', animation: 'slideUp .25s' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: FL.line, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: FL.display, fontSize: 24, fontWeight: 700 }}>{day} de junho</div>
            <div style={{ fontSize: 14, color: FL.soft }}>{wdFull[(day + 6) % 7]}</div>
          </div>
          {d.sev && <div style={{ width: 48, height: 48, borderRadius: '50%', background: FL.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HFace mood={d.mood} size={32} color={FL.accent} /></div>}
        </div>

        {d.infusao && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: FL.accentSoft, borderRadius: 14, padding: '13px 15px', marginBottom: 14 }}>
            <Icon name="drop" size={19} c={FL.accent} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Infusão · Infliximabe</span>
          </div>
        )}

        {d.sev ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <HWave color={HSEV[d.sev]} count={d.count} h={22} w={34} sw={3.2} gap={6} />
              <span style={{ fontSize: 14.5, color: FL.soft }}>{d.count}× · {d.sev}</span>
            </div>
            {det?.tags && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                {det.tags.map(([n, sev]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: FL.card, border: `1.5px solid ${FL.line}`, borderRadius: 13, padding: '11px 14px' }}>
                    <span style={{ fontSize: 15 }}>{n}</span><SevDots sev={sev} size={14} />
                  </div>
                ))}
              </div>
            )}
            {det?.note && <div style={{ fontSize: 14.5, color: FL.soft, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 18,
              borderLeft: `3px solid ${FL.line}`, paddingLeft: 12 }}>{det.note}</div>}
          </>
        ) : !d.infusao && (
          <div style={{ fontSize: 15, color: FL.soft, marginBottom: 18 }}>Dia tranquilo, sem sintomas anotados.</div>
        )}

        <Btn onClick={onClose} style={{ marginBottom: 0 }}>fechar</Btn>
      </div>
    </div>
  );
}

window.Linha = Linha;
