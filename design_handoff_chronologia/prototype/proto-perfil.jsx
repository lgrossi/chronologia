// proto-perfil.jsx — light Perfil/Ajustes screen (rounds out the tab bar).
const { Icon, HFace } = window;

function Perfil() {
  const { FL } = window;
  const rows = [
    ['drop', 'Meus medicamentos', 'Infliximabe · a cada 8 semanas'],
    ['bell', 'Lembretes', 'Diário às 21h'],
    ['list', 'Meus sintomas', '6 predefinidos + personalizados'],
    ['flask', 'Exames e documentos', '3 anexos'],
    ['user', 'Conta', 'ana@email.com'],
  ];
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: FL.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: FL.display, fontSize: 30, fontWeight: 700, color: FL.accent }}>A</span>
        </div>
        <div style={{ fontFamily: FL.display, fontSize: 22, fontWeight: 700 }}>Ana</div>
        <div style={{ fontSize: 14, color: FL.soft }}>Crohn · desde 2021</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([ic, title, sub]) => (
          <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, background: FL.card,
            border: `1.5px solid ${FL.line}`, borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 0 ' + FL.line }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: FL.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={ic} size={19} c={FL.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 13, color: FL.soft }}>{sub}</div>
            </div>
            <Icon name="chevR" size={18} c={FL.faint} />
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 26, fontSize: 13, color: FL.faint }}>Chronologia · v0.1</div>
    </>
  );
}

window.Perfil = Perfil;
