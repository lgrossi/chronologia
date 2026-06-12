// proto-evento.jsx — Adicionar evento (infusão / exame / consulta…) sheet.
const { HSEV, Icon } = window;
const { useState } = React;

const TYPES = [
  ['infusão', 'drop'], ['exame', 'flask'], ['consulta', 'user'],
  ['remédio novo', 'plus'], ['resultado', 'list'], ['outro', 'spark'],
];

function AddEvento({ onSave, onClose }) {
  const { FL } = window;
  const { Btn } = window;
  const [type, setType] = useState('infusão');
  const [remind, setRemind] = useState(true);

  return (
    <div style={{ position: 'absolute', inset: 0, background: FL.paper, zIndex: 50, overflowY: 'auto' }}>
      <div style={{ padding: '54px 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: FL.soft, fontFamily: FL.sans, fontWeight: 600 }}>cancelar</button>
          <div style={{ fontFamily: FL.display, fontSize: 18, fontWeight: 700 }}>Novo evento</div>
          <div style={{ width: 56 }} />
        </div>

        <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>O que aconteceu?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
          {TYPES.map(([t, ic]) => {
            const on = type === t;
            return <button key={t} onClick={() => setType(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `2px solid ${on ? FL.accent : FL.line}`, background: on ? FL.accent : FL.card, color: on ? FL.onAccent : FL.soft,
              borderRadius: 14, padding: '10px 15px', fontSize: 15, fontFamily: FL.sans, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>
              <Icon name={ic} size={16} c={on ? FL.onAccent : FL.soft} /> {t}
            </button>;
          })}
        </div>

        <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Quando</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: FL.card,
          border: `1.5px solid ${FL.line}`, borderRadius: 16, padding: '14px 16px', marginBottom: 18, boxShadow: '0 2px 0 ' + FL.line }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}><Icon name="cal" size={18} c={FL.accent} /> hoje · 10 jun 2026</span>
          <span style={{ fontSize: 14, color: FL.soft }}>alterar ›</span>
        </div>

        {type === 'infusão' && (
          <div style={{ animation: 'fadeIn .2s' }}>
            <div style={{ fontFamily: FL.display, fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Detalhes da infusão</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: FL.card,
              border: `1.5px solid ${FL.line}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: FL.soft }}>medicamento</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Infliximabe ›</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: FL.card,
              border: `1.5px solid ${FL.line}`, borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
              <button onClick={() => setRemind(r => !r)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: remind ? FL.accent : 'transparent',
                  border: `2px solid ${remind ? FL.accent : FL.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {remind && <Icon name="check" size={14} c={FL.onAccent} sw={2.8} />}
                </span>
              </button>
              <span style={{ flex: 1, fontSize: 14.5, color: FL.soft }}>lembrar da próxima dose</span>
              <span style={{ fontSize: 14, color: FL.ink, fontWeight: 600 }}>em 8 semanas</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 16,
          border: `1.5px dashed ${FL.line}`, color: FL.soft, marginBottom: 26 }}>
          <Icon name="pencil" size={17} c={FL.soft} />
          <span style={{ fontSize: 14.5 }}>anexar foto do exame ou uma nota</span>
        </div>

        <Btn primary onClick={() => onSave(type)}>salvar evento <Icon name="check" size={18} c={FL.onAccent} sw={2.6} /></Btn>
      </div>
    </div>
  );
}

window.AddEvento = AddEvento;
