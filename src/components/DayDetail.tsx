/**
 * DayDetail — the bottom-sheet for a single day, shared by Linha (calendar /
 * diário) and Hoje (week strip). Self-contained: given a dateKey it reads the
 * day's log and events via the reactive hooks, so callers only wire navigation.
 *
 * Every day is openable — logged, empty, past or future. The sheet always
 * offers BOTH actions ("registrar/editar o dia" and "adicionar evento"), which
 * is what makes a day-tap an unambiguous chooser rather than a jump straight to
 * the day report.
 */
import type { CSSProperties } from 'react';
import { useDay, useEventsInRange } from '@/data/hooks';
import { repo } from '@/data/repo';
import { COLORS, SEV } from '@/theme/tokens';
import { capitalize, formatLongPt } from '@/lib/date';
import { EVENT_META } from '@/lib/events';
import type { Severity } from '@/lib/types';
import { BottomSheet } from './BottomSheet';
import { Btn } from './Btn';
import { Icon } from './Icon';
import { HFace } from './HFace';
import { HWave } from './HWave';
import { SevDots } from './SevDots';

interface DayDetailProps {
  dateKey: string;
  onEditDay: (dateKey: string) => void;
  onAddEvento: (dateKey: string) => void;
  onEditEvento: (eventId: string, dateKey: string) => void;
  onClose: () => void;
}

export function DayDetail({
  dateKey,
  onEditDay,
  onAddEvento,
  onEditEvento,
  onClose,
}: DayDetailProps) {
  const log = useDay(dateKey) ?? null;
  const events = useEventsInRange(dateKey, dateKey);
  const sev: Severity | null = log?.overallSeverity ?? null;

  const secondaryAction: CSSProperties = {
    flex: 1,
    background: COLORS.card,
    border: `1.5px solid ${COLORS.line}`,
    borderRadius: 14,
    padding: '13px 14px',
    cursor: 'pointer',
    fontFamily: 'Hanken Grotesk, sans-serif',
    fontSize: 14.5,
    fontWeight: 700,
    color: COLORS.ink,
  };

  return (
    <BottomSheet open onClose={onClose}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 18,
        }}
      >
        <div style={{ fontFamily: 'Schibsted Grotesk, sans-serif', fontSize: 24, fontWeight: 700 }}>
          {capitalize(formatLongPt(dateKey))}
        </div>
        {log && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: COLORS.accentSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HFace mood={log.mood} size={32} color={COLORS.accent} />
          </div>
        )}
      </div>

      {/* This day's events — each row tappable to edit. */}
      {events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          {events.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <button
                onClick={() => {
                  onClose();
                  onEditEvento(e.id, dateKey);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  flex: 1,
                  textAlign: 'left',
                  background: COLORS.accentSoft,
                  border: `1.5px solid ${COLORS.line}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                <Icon name={EVENT_META[e.type].icon} size={18} color={COLORS.accent} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
                  {e.note?.trim() ? e.note : capitalize(EVENT_META[e.type].label)}
                </span>
                {e.done === false && (
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.accent }}>
                    {e.date < dateKey ? 'confirmar' : 'planejado'}
                  </span>
                )}
                <Icon name="pencil" size={15} color={COLORS.faint} />
              </button>
              {e.done === false && (
                <button
                  onClick={() => void repo.putEvent({ ...e, done: true })}
                  aria-label="marcar como feito"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 48,
                    border: `1.5px solid ${COLORS.line}`,
                    borderRadius: 14,
                    background: COLORS.card,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="check" size={18} color={COLORS.accent} strokeWidth={2.6} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {sev ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <HWave color={SEV[sev]} count={log!.waveCount} h={22} w={34} sw={3.2} gap={6} />
            <span style={{ fontSize: 14.5, color: COLORS.soft }}>
              {log!.waveCount}× · {sev}
            </span>
          </div>
          {log!.symptoms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              {log!.symptoms.map((s) => (
                <div
                  key={s.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: COLORS.card,
                    border: `1.5px solid ${COLORS.line}`,
                    borderRadius: 13,
                    padding: '11px 14px',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{s.name}</span>
                  <SevDots sev={s.severity} size={14} />
                </div>
              ))}
            </div>
          )}
          {log!.note?.trim() && (
            <div
              style={{
                fontSize: 14.5,
                color: COLORS.soft,
                fontStyle: 'italic',
                lineHeight: 1.5,
                marginBottom: 18,
                borderLeft: `3px solid ${COLORS.line}`,
                paddingLeft: 12,
              }}
            >
              {log!.note}
            </div>
          )}
        </>
      ) : (
        log && (
          <div style={{ fontSize: 15, color: COLORS.soft, marginBottom: 18 }}>
            Dia tranquilo, sem sintomas anotados.
          </div>
        )
      )}

      {!log && events.length === 0 && (
        <div style={{ fontSize: 15, color: COLORS.soft, marginBottom: 18 }}>
          Nada anotado neste dia ainda.
        </div>
      )}

      {/* Always-available chooser: register/edit the day, or add an event. */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button
          style={secondaryAction}
          onClick={() => {
            onClose();
            onAddEvento(dateKey);
          }}
        >
          adicionar evento
        </button>
      </div>
      <Btn
        onClick={() => {
          onClose();
          onEditDay(dateKey);
        }}
      >
        {log ? 'editar o dia' : 'registrar o dia'}
      </Btn>
    </BottomSheet>
  );
}
