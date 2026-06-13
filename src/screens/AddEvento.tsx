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
import type { EventPrefill, EventType } from '@/lib/types';
import { COLORS } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Btn } from '@/components/Btn';
import { formatLongWithYearPt, localDayKey } from '@/lib/date';
import { useMedications } from '@/data/hooks';
import { isInfusionMed } from '@/lib/selectors';
import { repo } from '@/data/repo';

export interface AddEventoProps {
  /** Day-key (yyyy-mm-dd) the overlay opened on; the default "Quando". */
  dateKey: string;
  /** When present, edit this existing event instead of creating a new one. */
  eventId?: string;
  /** Dismiss without saving. */
  onClose: () => void;
  /** Seed values for a NEW event (e.g. opened from a reminder). Ignored in edit. */
  prefill?: EventPrefill;
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

// Feature-detect the native calendar API once. When present (desktop
// Chrome/Edge/Firefox, Android, iOS) a trusted-gesture showPicker() opens the
// calendar; when absent (older Safari) we render the native input inline as a
// always-usable last resort instead of a button that could open nothing.
const canShowPicker =
  typeof HTMLInputElement !== 'undefined' && 'showPicker' in HTMLInputElement.prototype;

// Visually hidden but kept in the DOM and focusable (sr-only). NOT display:none
// (showPicker/focus would throw or no-op) and NOT positioned over the readout
// button (it must not intercept the button's click).
const srOnlyInput: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  border: 0,
  opacity: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

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

export function AddEvento({ dateKey, eventId, prefill, onClose, onSaved }: AddEventoProps) {
  const medications = useMedications();
  const [medId, setMedId] = useState<string | undefined>(prefill?.medicationId);

  const isEdit = Boolean(eventId);

  const [type, setType] = useState<EventType>(prefill?.type ?? 'infusao');
  const [chosenKey, setChosenKey] = useState(dateKey);
  const [remind, setRemind] = useState(true);
  // A freshly picked image (CREATE, or replacing in EDIT).
  const [file, setFile] = useState<File | null>(null);
  // An attachment already stored on the event being edited.
  const [existingAttachment, setExistingAttachment] = useState<Blob | null>(null);
  const [note, setNote] = useState(prefill?.note ?? '');
  // Confirmation state, only meaningful in EDIT (a new event's done is derived
  // from its date at save: future = planned/false, today-or-past = true).
  const [done, setDone] = useState(true);
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
      setMedId(event.medicationId);
      setRemind(event.remindNextDoseDays != null);
      setExistingAttachment(event.attachments?.[0] ?? null);
      setNote(event.note ?? '');
      setDone(event.done ?? event.date <= localDayKey());
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  const isInfusao = type === 'infusao';
  // Medication applies to infusions (the cycle) and to "remédio novo". The pools
  // are split by cadence: an infusão only offers infusion-cadence meds, a remédio
  // only offers daily/maintenance meds — so a daily med can never become an
  // "infusion" (nor drive a "próxima infusão" countdown).
  const showMed = isInfusao || type === 'remedio';
  const infusionMeds = medications.filter(isInfusionMed);
  const otherMeds = medications.filter((m) => !isInfusionMed(m));
  const medPool = isInfusao ? infusionMeds : otherMeds;
  const med = medPool.find((m) => m.id === medId) ?? medPool[0] ?? null;
  // Cycle in whole weeks (Infliximabe = 56 days → 8 semanas).
  const weeks = med ? Math.round(med.intervalDays / 7) : null;

  // What the attachment row shows: a new pick wins, else the stored one.
  const attachmentLabel = file
    ? file.name
    : existingAttachment
      ? 'anexo atual'
      : null;

  // Must run synchronously inside the click handler so the trusted user-gesture
  // is preserved for showPicker(). On desktop a native date input only focuses
  // (no dropdown) without this; showPicker() surfaces the calendar instead.
  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      // showPicker can throw (not user-activated / sandboxed); fall through to
      // focus()+click(), then the always-visible native fallback covers the rest.
    }
    el.focus();
    el.click();
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
      medicationId: showMed ? med?.id : undefined,
      remindNextDoseDays: isInfusao && remind ? med?.intervalDays : undefined,
      attachments: attachment ? [attachment] : undefined,
      note: trimmed ? trimmed : undefined,
      // New events confirm themselves by date; edits keep their state (confirm
      // happens via "marcar feito" on Home / the day sheet).
      done: isEdit ? done : chosenKey <= localDayKey(),
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
          paddingTop: 54,
          paddingBottom: 40,
          paddingLeft: 'var(--screen-px-left)',
          paddingRight: 'var(--screen-px-right)',
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

        {/* Quando — ONE on-brand readout (with year) is the only date string the
            user sees. When the native calendar API is available the readout is a
            <button> whose click synchronously calls input.showPicker() (with a
            focus()+click() fallback), opening the calendar on desktop
            Chrome/Edge/Firefox AND on Android/iOS from a single tap. The real
            <input type="date"> stays in the DOM, sr-only (focusable, NOT
            display:none, NOT overlaid on the button so it can't steal the click).
            Where showPicker is unsupported, the native input is rendered inline
            and visibly instead, guaranteeing a working control everywhere. */}
        <div style={sectionTitle}>Quando</div>
        {canShowPicker ? (
          <div
            style={{
              ...rowCard,
              position: 'relative',
              marginBottom: 18,
              boxShadow: SHADOW_CARD,
              padding: 0,
            }}
          >
            <button
              type="button"
              onClick={openDatePicker}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: COLORS.ink,
                fontFamily: 'inherit',
                textAlign: 'left',
                padding: '14px 16px',
                minHeight: 44,
              }}
            >
              <Icon name="cal" size={18} color={COLORS.accent} />
              {formatLongWithYearPt(chosenKey)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={chosenKey}
              onChange={(e) => e.target.value && setChosenKey(e.target.value)}
              aria-label="data do evento"
              tabIndex={-1}
              style={srOnlyInput}
            />
          </div>
        ) : (
          <input
            ref={dateInputRef}
            type="date"
            value={chosenKey}
            onChange={(e) => e.target.value && setChosenKey(e.target.value)}
            aria-label="data do evento"
            style={{
              ...rowCard,
              width: '100%',
              marginBottom: 18,
              boxShadow: SHADOW_CARD,
              fontSize: 16,
              fontFamily: 'inherit',
              color: COLORS.ink,
              cursor: 'pointer',
              colorScheme: 'light',
            }}
          />
        )}

        {/* Medication — pick ANY med from the list. Drives the cycle for
            infusões; also offered for "remédio novo". */}
        {showMed && (
          <div style={{ animation: 'fadeIn .2s' }}>
            <div style={sectionTitle}>{isInfusao ? 'Detalhes da infusão' : 'Medicamento'}</div>
            <div style={{ ...rowCard, marginBottom: isInfusao ? 10 : 18 }}>
              <span style={{ fontSize: 15, color: COLORS.soft }}>medicamento</span>
              {medPool.length > 0 ? (
                <select
                  value={med?.id ?? ''}
                  onChange={(e) => setMedId(e.target.value || undefined)}
                  aria-label="medicamento"
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    border: 'none',
                    background: 'transparent',
                    color: COLORS.ink,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'right',
                  }}
                >
                  {medPool.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || 'sem nome'}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 14, color: COLORS.faint }}>
                  {isInfusao
                    ? 'nenhuma infusão no Perfil (defina 2+ semanas)'
                    : 'nenhum medicamento no Perfil'}
                </span>
              )}
            </div>
            {isInfusao && (
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
            )}
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
