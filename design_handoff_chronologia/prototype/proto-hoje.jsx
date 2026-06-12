// proto-hoje.jsx — Hoje (home) screen. Reflects whether today is logged.
const { HSEV, HFace, Icon } = window;

function Hoje({ data, onRegistrar, onOpenLinha }) {
  const { FL } = window;
  const { Card, Btn } = window;
  const week = data.week;
  const logged = data.today; // null or {mood, sev, count, symptoms}
  return (
    <>
      {/* greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, letterSpacing: '0.02em', color: FL.accent }}>Chronologia</div>
          <div style={{ fontFamily: FL.display, fontSize: 30, fontWeight: 700, marginTop: 6, lineHeight: 1 }}>Bom dia, Ana</div>
          <div style={{ fontSize: 14.5, color: FL.soft, marginTop: 3 }}>domingo · 10 junho</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: FL.card, border: `1.5px solid ${FL.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FL.display, fontWeight: 700, fontSize: 17 }}>A</div>
      </div>

      {/* yesterday */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, color: FL.soft, fontSize: 14 }}>
        <HFace mood="bom" size={22} color={FL.soft} />
        <span>Ontem foi um dia <b style={{ color: FL.ink }}>bom</b> · leve</span>
      </div>

      {/* starter / logged card */}
      {!logged ? (
        <Card fill={FL.accent} style={{ marginBottom: 16, boxShadow: `0 12px 26px -12px ${FL.accent}99`, borderColor: FL.accent }} pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: FL.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HFace mood="bom" size={34} color={FL.accent} />
            </div>
            <div style={{ fontFamily: FL.display, fontSize: 21, fontWeight: 600, color: FL.onAccent, lineHeight: 1.15 }}>Vamos registrar<br />o seu dia?</div>
          </div>
          <Btn primary onClick={onRegistrar} style={{ background: FL.onAccent, color: FL.accent, boxShadow: 'none' }}>
            registrar hoje <Icon name="chevR" size={18} c={FL.accent} />
          </Btn>
        </Card>
      ) : (
        <Card style={{ marginBottom: 16 }} pad={18} onClick={onRegistrar}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: logged.symptoms?.length ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: FL.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HFace mood={logged.mood} size={30} color={FL.accent} />
              </div>
              <div>
                <div style={{ fontFamily: FL.display, fontSize: 17, fontWeight: 700 }}>Dia registrado ✓</div>
                <div style={{ fontSize: 13.5, color: FL.soft }}>{logged.sev ? `${logged.count}× ${logged.sev}` : 'dia tranquilo'}</div>
              </div>
            </div>
            <Icon name="pencil" size={19} c={FL.soft} />
          </div>
          {logged.symptoms?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: `1.5px solid ${FL.line}`, paddingTop: 12 }}>
              {logged.symptoms.map(s => (
                <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: FL.soft,
                  background: FL.paper, border: `1.5px solid ${FL.line}`, borderRadius: 10, padding: '4px 10px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: HSEV[s.sev] }} />{s.name}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* infusion */}
      <Card style={{ marginBottom: 16 }} pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: FL.soft }}>
            <Icon name="drop" size={17} c={HSEV.grave} /> ciclo da infusão
          </span>
          <span style={{ fontSize: 13.5, color: FL.faint }}>Infliximabe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: FL.display, fontSize: 30, fontWeight: 700 }}>dia 6</span>
          <span style={{ fontSize: 14, color: FL.soft }}>· faltam 22 p/ a próxima</span>
        </div>
        <div style={{ height: 9, borderRadius: 6, background: FL.line, overflow: 'hidden' }}>
          <div style={{ width: '21%', height: '100%', background: HSEV.leve, borderRadius: 6 }} />
        </div>
      </Card>

      {/* week */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9, marginLeft: 2 }}>
        <span style={{ fontSize: 14, color: FL.soft }}>esta semana</span>
        <button onClick={onOpenLinha} style={{ background: 'none', border: 'none', color: FL.accent, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: FL.sans }}>ver tudo ›</button>
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
        {week.map(([d, sev, today], i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: '100%', height: 42, borderRadius: 12,
              background: sev ? HSEV[sev] : FL.card,
              border: today ? `2.5px solid ${FL.accent}` : `1.5px solid ${sev ? 'transparent' : FL.line}` }} />
            <span style={{ fontSize: 12, color: today ? FL.ink : FL.faint, fontWeight: today ? 700 : 500 }}>{d}</span>
          </div>
        ))}
      </div>

      {/* reminder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 14,
        border: `1.5px dashed ${FL.line}`, color: FL.soft }}>
        <Icon name="bell" size={18} c={FL.soft} />
        <span style={{ fontSize: 14, flex: 1 }}>Lembrete diário às 21h</span>
        <span style={{ fontSize: 13, color: FL.accent, fontWeight: 600 }}>editar</span>
      </div>
    </>
  );
}

window.Hoje = Hoje;
