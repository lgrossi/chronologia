/**
 * AddEvento — "Novo evento" / "Editar evento" overlay (SCREENS.md §3, proto-evento.jsx).
 *
 * CREATE (no eventId): the center FAB opens a blank form on `dateKey`; save mints
 * a new id and reports onSaved(type,'created'). EDIT (eventId set): the event is
 * loaded via repo.getEvent and EVERY field is prefilled — type, date, medication,
 * reminder toggle, note, and any existing attachment (shown, replaceable, removable).
 * Save writes back under the SAME id (onSaved(type,'updated')); the destructive
 * "excluir evento" action removes it (onSaved(type,'deleted')).
 *
 * Overlay-only: navigation is by props. onSaved(type, mode) lets the parent close
 * and fire the matching confirmation toast.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { EventType } from '@/lib/types';
import { COLORS } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Btn } from '@/components/Btn';
import { formatLongPt } from '@/lib/date';
import { useMedications } from '@/data/hooks';
import { repo } from '@/data/repo';

export interface AddEventoProps {
  /** Day-key (yyyy-mm-dd) the overlay opened on; the default "Quando". */
  dateKey: string;
  /** When present, edit this existing event instead of creating a new one. */
  eventId?: string;
  /** Dismiss without saving. */
  onClose: () => void;
  /** Saved/removed; parent closes the overlay and shows the matching toast. */
  onSaved: (type: EventType, mode: 'created' | 'updated' | 'deleted') => void;
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

export function AddEvento({ dateKey, eventId, onClose, onSaved }: AddEventoProps) {
  const medications = useMedications();
  const med = medications[0];

  const isEdit = Boolean(eventId);

  const [type, setType] = useState<EventType>('infusao');
  const [chosenKey, setChosenKey] = useState(dateKey);
  const [remind, setRemind] = useState(true);
  // A freshly picked image (CREATE, or replacing in EDIT).
  const [file, setFile] = useState<File | null>(null);
  // An attachment already stored on the event being edited.
  const [existingAttachment, setExistingAttachment] = useState<Blob | null>(null);
  const [note, setNote] = useState('');
  // EDIT mode is not ready to save until the event finishes loading.
  const [loaded, setLoaded] = useState(!eventId);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // EDIT: load the event once and prefill every field.
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    void repo.getEvent(eventId).then((event) => {
      if (!active || !event) return;
      setType(event.type);
      setChosenKey(event.date);
      setRemind(event.remindNextDoseDays != null);
      setExistingAttachment(event.attachments?.[0] ?? null);
      setNote(event.note ?? '');
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  const isInfusao = type === 'infusao';
  // Medication cycle in whole weeks (Infliximabe = 56 days → 8 semanas).
  const weeks = med ? Math.round(med.intervalDays / 7) : null;

  // What the attachment row shows: a new pick wins, else the stored one.
  const attachmentLabel = file
    ? file.name
    : existingAttachment
      ? 'anexo atual'
      : null;

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      // showPicker can throw (not user-activated / unsupported); the native
      // input remains tappable as the fallback, so swallow and move on.
    }
  }

  function clearAttachment() {
    setFile(null);
    setExistingAttachment(null);
  }

  async function save() {
    if (!loaded) return;
    const trimmed = note.trim();
    // Keep an existing attachment unless replaced or cleared.
    const attachment = file ?? existingAttachment;
    await repo.putEvent({
      id: eventId ?? crypto.randomUUID(),
      date: chosenKey,
      type,
      medicationId: isInfusao ? med?.id : undefined,
      remindNextDoseDays: isInfusao && remind ? med?.intervalDays : undefined,
      attachments: attachment ? [attachment] : undefined,
      note: trimmed ? trimmed : undefined,
    });
    onSaved(type, isEdit ? 'updated' : 'created');
  }

  async function remove() {
    if (!eventId) return;
    await repo.deleteEvent(eventId);
    onSaved(type, 'deleted');
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
            {isEdit ? 'Editar evento' : 'Novo evento'}
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

        {/* Quando — a real native date input is the interactive control. The
            whole row opens the picker on a single tap (showPicker), and the
            input sits in normal flow so it is itself the click target on
            Android Chrome — nothing absolutely-positioned covers it. */}
        <div style={sectionTitle}>Quando</div>
        <div
          onClick={openDatePicker}
          style={{
            ...rowCard,
            marginBottom: 18,
            boxShadow: SHADOW_CARD,
            cursor: 'pointer',
            gap: 12,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="cal" size={18} color={COLORS.accent} />
            {formatLongPt(chosenKey)}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            value={chosenKey}
            onChange={(e) => e.target.value && setChosenKey(e.target.value)}
            onFocus={openDatePicker}
            style={{
              background: COLORS.card,
              border: `1.5px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: '8px 10px',
              minHeight: 44,
              fontFamily: 'inherit',
              fontSize: 14,
              color: COLORS.ink,
              colorScheme: 'light',
              outline: 'none',
              cursor: 'pointer',
            }}
            aria-label="data do evento"
          />
        </div>

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
            color: attachmentLabel ? COLORS.ink : COLORS.soft,
            marginBottom: attachmentLabel ? 8 : 14,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <Icon name="pencil" size={17} color={attachmentLabel ? COLORS.accent : COLORS.soft} />
          <span style={{ fontSize: 14.5 }}>
            {attachmentLabel ?? 'anexar foto do exame ou uma nota'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
        </label>

        {/* Replace/remove the chosen or stored attachment. */}
        {attachmentLabel && (
          <button
            type="button"
            onClick={clearAttachment}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: COLORS.soft,
              fontWeight: 600,
              minHeight: 44,
              padding: '0 4px',
              marginBottom: 8,
            }}
          >
            remover anexo
          </button>
        )}

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
        <Btn primary onClick={save} disabled={!loaded}>
          {isEdit ? 'salvar alterações' : 'salvar evento'}
          <Icon name="check" size={18} color={COLORS.onAccent} strokeWidth={2.6} />
        </Btn>

        {/* Destructive: only in EDIT mode. Stays within the palette — severity
            inks are reserved for symptom intensity, the single accent for
            primary actions — so the danger is carried by the label and a muted,
            borderless secondary surface, not by colour. */}
        {isEdit && (
          <Btn
            onClick={remove}
            style={{
              marginTop: 12,
              color: COLORS.soft,
              border: 'none',
              boxShadow: 'none',
              fontWeight: 600,
            }}
          >
            excluir evento
          </Btn>
        )}
      </div>
    </div>
  );
}
