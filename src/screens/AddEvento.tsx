/**
 * AddEvento — "Adicionar evento" overlay (SCREENS.md §3, proto-evento.jsx).
 *
 * Opened by the center FAB. Logs infusions, exams, appointments, etc. The
 * infusão type reveals its own details block (medication + next-dose reminder).
 * The attachment row carries the dual "foto do exame ou uma nota" — a file
 * picker plus an optional free-text note, both folded into the saved event.
 *
 * Overlay-only: navigation is by props. onSaved(type) lets the parent close
 * and fire the confirmation toast.
 */
import { useState, type CSSProperties } from 'react';
import type { EventType } from '@/lib/types';
import { COLORS } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Btn } from '@/components/Btn';
import { formatLongPt } from '@/lib/date';
import { useMedications } from '@/data/hooks';
import { repo } from '@/data/repo';

export interface AddEventoProps {
  /** Day-key (yyyy-mm-dd) the FAB opened on; the default "Quando". */
  dateKey: string;
  /** Dismiss without saving. */
  onClose: () => void;
  /** Saved successfully; parent closes the overlay and shows the toast. */
  onSaved: (type: EventType) => void;
}

// Chip order + icon mirror the prototype. Label is final pt-BR copy; value is
// the EventType persisted on the HealthEvent.
const TYPES: ReadonlyArray<{ value: EventType; label: string; icon: IconName }> = [
  { value: 'infusao', label: 'infusão', icon: 'drop' },
  { value: 'exame', label: 'exame', icon: 'flask' },
  { value: 'consulta', label: 'consulta', icon: 'user' },
  { value: 'remedio', label: 'remédio novo', icon: 'plus' },
  { value: 'resultado', label: 'resultado', icon: 'list' },
  { value: 'outro', label: 'outro', icon: 'spark' },
];

const SHADOW_CARD = '0 2px 0 ' + COLORS.line;

const rowCard: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: COLORS.card,
  border: `1.5px solid ${COLORS.line}`,
  borderRadius: 16,
  padding: '14px 16px',
};

const sectionTitle: CSSProperties = {
  fontFamily: 'var(--font-display, inherit)',
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 10,
};

export function AddEvento({ dateKey, onClose, onSaved }: AddEventoProps) {
  const medications = useMedications();
  const med = medications[0];

  const [type, setType] = useState<EventType>('infusao');
  const [chosenKey, setChosenKey] = useState(dateKey);
  const [remind, setRemind] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');

  const isInfusao = type === 'infusao';
  // Medication cycle in whole weeks (Infliximabe = 56 days → 8 semanas).
  const weeks = med ? Math.round(med.intervalDays / 7) : null;

  async function save() {
    const trimmed = note.trim();
    await repo.putEvent({
      id: crypto.randomUUID(),
      date: chosenKey,
      type,
      medicationId: isInfusao ? med?.id : undefined,
      remindNextDoseDays: isInfusao && remind ? med?.intervalDays : undefined,
      attachments: file ? [file] : undefined,
      note: trimmed ? trimmed : undefined,
    });
    onSaved(type);
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.paper,
        zIndex: 50,
        overflowY: 'auto',
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '54px 20px 40px',
          fontFamily: 'var(--font-sans, inherit)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              color: COLORS.soft,
              fontWeight: 600,
              minHeight: 44,
              padding: '0 4px',
            }}
          >
            cancelar
          </button>
          <div style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 18, fontWeight: 700 }}>
            Novo evento
          </div>
          <div style={{ width: 56 }} />
        </div>

        {/* O que aconteceu? */}
        <div style={{ ...sectionTitle, marginBottom: 12 }}>O que aconteceu?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 24 }}>
          {TYPES.map(({ value, label, icon }) => {
            const on = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `2px solid ${on ? COLORS.accent : COLORS.line}`,
                  background: on ? COLORS.accent : COLORS.card,
                  color: on ? COLORS.onAccent : COLORS.soft,
                  borderRadius: 14,
                  padding: '11px 15px',
                  minHeight: 44,
                  fontSize: 15,
                  fontWeight: on ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                <Icon name={icon} size={16} color={on ? COLORS.onAccent : COLORS.soft} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Quando */}
        <div style={sectionTitle}>Quando</div>
        <label
          style={{
            ...rowCard,
            marginBottom: 18,
            boxShadow: SHADOW_CARD,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="cal" size={18} color={COLORS.accent} />
            {formatLongPt(chosenKey)}
          </span>
          <span style={{ fontSize: 14, color: COLORS.soft }}>alterar ›</span>
          {/* Transparent native picker over the whole row keeps the calm look
              while still letting the user reassign the day. */}
          <input
            type="date"
            value={chosenKey}
            onChange={(e) => e.target.value && setChosenKey(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
            aria-label="alterar a data do evento"
          />
        </label>

        {/* Type-specific: infusão details */}
        {isInfusao && (
          <div style={{ animation: 'fadeIn .2s' }}>
            <div style={sectionTitle}>Detalhes da infusão</div>
            <div style={{ ...rowCard, marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: COLORS.soft }}>medicamento</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{med ? `${med.name} ›` : '—'}</span>
            </div>
            <div style={{ ...rowCard, gap: 12, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setRemind((r) => !r)}
                aria-pressed={remind}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    flexShrink: 0,
                    background: remind ? COLORS.accent : 'transparent',
                    border: `2px solid ${remind ? COLORS.accent : COLORS.faint}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {remind && <Icon name="check" size={14} color={COLORS.onAccent} strokeWidth={2.8} />}
                </span>
              </button>
              <span style={{ flex: 1, fontSize: 14.5, color: COLORS.soft }}>
                lembrar da próxima dose
              </span>
              {weeks !== null && (
                <span style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600 }}>
                  em {weeks} semanas
                </span>
              )}
            </div>
          </div>
        )}

        {/* Attachment: foto do exame ou uma nota */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderRadius: 16,
            border: `1.5px dashed ${COLORS.line}`,
            color: file ? COLORS.ink : COLORS.soft,
            marginBottom: 14,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <Icon name="pencil" size={17} color={file ? COLORS.accent : COLORS.soft} />
          <span style={{ fontSize: 14.5 }}>
            {file ? file.name : 'anexar foto do exame ou uma nota'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
        </label>

        {/* Free-text note (the "ou uma nota" half) */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="uma nota sobre o evento (opcional)"
          rows={2}
          style={{
            width: '100%',
            resize: 'none',
            background: COLORS.card,
            border: `1.5px solid ${COLORS.line}`,
            borderRadius: 16,
            padding: '14px 16px',
            fontSize: 14.5,
            fontFamily: 'inherit',
            color: COLORS.ink,
            marginBottom: 26,
            boxShadow: SHADOW_CARD,
            outline: 'none',
          }}
        />

        {/* Save */}
        <Btn primary onClick={save}>
          salvar evento
          <Icon name="check" size={18} color={COLORS.onAccent} strokeWidth={2.6} />
        </Btn>
      </div>
    </div>
  );
}
