/**
 * Linha do tempo — browse history.
 *
 * Reads REAL data for the SHOWN month: DayLogs + HealthEvents in range. The
 * shown month is navigable (‹ / ›) so the user can walk back through history
 * AND forward to future appointments / the next infusion. Severity inks are
 * SACRED — they only ever color symptom intensity. Event markers (any of the
 * six EventTypes) use the neutral ink / single accent, never the inks.
 *
 * Filtering is screen-local and additive: a row of removable chips, each one a
 * chosen symptom or event type, plus a '+ filtro' picker grouped by category.
 * No active filters means show everything (there is no 'Tudo' affordance). With
 * one or more filters a day matches if it satisfies ANY of them (union/OR).
 *
 * Every day is tappable — logged, empty, past or future — opening DayDetail,
 * which lists that day's events (each tappable to edit) and always offers two
 * actions: register/edit the day's symptoms, or add an event.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { HWave } from '@/components/HWave';
import { HFace } from '@/components/HFace';
import { Icon, type IconName } from '@/components/Icon';
import { Btn } from '@/components/Btn';
import { SevDots } from '@/components/SevDots';
import { BottomSheet } from '@/components/BottomSheet';
import { COLORS, SEV } from '@/theme/tokens';
import type { DayLog, EventType, HealthEvent, Severity } from '@/lib/types';
import {
  addDays,
  capitalize,
  daysBetween,
  daysInMonth,
  formatLongPt,
  localDayKey,
  monthEndKey,
  monthNamePt,
  monthStartKey,
  parseDayKey,
  WEEKDAY_LETTERS_PT,
} from '@/lib/date';
import { useDaysInRange, useEventsInRange, useSymptoms } from '@/data/hooks';

export interface LinhaProps {
  onEditDay: (dateKey: string) => void;
  onAddEvento: (dateKey: string) => void;
  onEditEvento: (eventId: string, dateKey: string) => void;
}

type View = 'cal' | 'dia';

const WD_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

/** How far the month switcher may roam from the current month, in months. */
const MONTH_CLAMP = 24;

/**
 * Event-type presentation, mirroring AddEvento's TYPES so the timeline and the
 * editor speak the same language. Icons/labels are NEUTRAL chrome — the marker
 * color is always ink/accent, never a severity ink.
 */
const EVENT_META: Record<EventType, { label: string; icon: IconName }> = {
  infusao: { label: 'infusão', icon: 'drop' },
  exame: { label: 'exame', icon: 'flask' },
  consulta: { label: 'consulta', icon: 'user' },
  remedio: { label: 'remédio', icon: 'plus' },
  resultado: { label: 'resultado', icon: 'list' },
  outro: { label: 'outro', icon: 'spark' },
};

const EVENT_ORDER: readonly EventType[] = [
  'infusao',
  'exame',
  'consulta',
  'remedio',
  'resultado',
  'outro',
];

/**
 * One active filter. Symptom and event filters are namespaced so a symptom
 * literally named "exame" can't collide with the event type. `sym:` matches by
 * symptom name; `evt:` matches by event type. The empty list = no filter.
 */
type Filter = `sym:${string}` | `evt:${EventType}`;

/** Human label for a filter token, used by both the chips and the picker. */
function filterLabel(f: Filter): string {
  return f.startsWith('evt:') ? EVENT_META[f.slice(4) as EventType].label : f.slice(4);
}

/** Monday-first column index (0..6) the 1st of the month lands on. */
function leadingBlanks(monthStart: string): number {
  const dow = parseDayKey(monthStart).getDay(); // 0=Sun..6=Sat
  return (dow + 6) % 7; // 0=Mon..6=Sun
}

/** Mon-first short weekday label for a day-key (used in Diário/detail). */
function weekdayShortPt(key: string): string {
  const dow = parseDayKey(key).getDay();
  return WD_SHORT[(dow + 6) % 7];
}

/** Shift a month-anchor key by `n` whole months, staying on the 1st. */
function shiftMonth(monthKey: string, n: number): string {
  const d = parseDayKey(monthKey);
  return localDayKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function Linha({ onEditDay, onAddEvento, onEditEvento }: LinhaProps) {
  // Which month is shown — defaults to the current month, navigable both ways.
  const [shownMonth, setShownMonth] = useState<string>(() => monthStartKey(localDayKey()));
  const [view, setView] = useState<View>('cal');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const monthStart = monthStartKey(shownMonth);
  const monthEnd = monthEndKey(shownMonth);

  const days = useDaysInRange(monthStart, monthEnd);
  const events = useEventsInRange(monthStart, monthEnd);
  const symptoms = useSymptoms();

  const dayByKey = useMemo(
    () => new Map<string, DayLog>(days.map((d) => [d.date, d])),
    [days],
  );

  // All events for a day (any type), keyed by date. Drives markers + detail.
  const eventsByKey = useMemo(() => {
    const m = new Map<string, HealthEvent[]>();
    for (const e of events) {
      const list = m.get(e.date);
      if (list) list.push(e);
      else m.set(e.date, [e]);
    }
    return m;
  }, [events]);

  const activeSymptoms = useMemo(
    () => symptoms.filter((s) => !s.archived),
    [symptoms],
  );

  // Clamp month navigation to a generous ±24-month window so history and
  // upcoming appointments are reachable without wandering off into empty years.
  const thisMonth = monthStartKey(localDayKey());
  const offset = Math.round(daysBetween(thisMonth, shownMonth) / 30);
  const canPrev = offset > -MONTH_CLAMP;
  const canNext = offset < MONTH_CLAMP;

  // No filters → everything matches. Otherwise a day matches if it satisfies
  // ANY active filter (union/OR).
  const matches = (key: string): boolean => {
    if (filters.length === 0) return true;
    return filters.some((f) => {
      if (f.startsWith('evt:')) {
        const type = f.slice(4) as EventType;
        return (eventsByKey.get(key) ?? []).some((e) => e.type === type);
      }
      const name = f.slice(4).toLowerCase();
      const log = dayByKey.get(key);
      return !!log && log.symptoms.some((s) => s.name.toLowerCase() === name);
    });
  };

  const addFilter = (f: Filter) =>
    setFilters((cur) => (cur.includes(f) ? cur : [...cur, f]));
  const removeFilter = (f: Filter) => setFilters((cur) => cur.filter((x) => x !== f));

  const total = daysInMonth(shownMonth);
  const blanks = leadingBlanks(monthStart);

  return (
    <div className="font-sans text-ink">
      <div className="w-full">
        {/* Header: ‹ month › + Calendário|Diário toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MonthArrow dir="prev" disabled={!canPrev} onClick={() => setShownMonth((m) => shiftMonth(m, -1))} />
            <div
              style={{
                fontFamily: 'Schibsted Grotesk, sans-serif',
                fontSize: 24,
                fontWeight: 700,
                minWidth: 0,
              }}
            >
              {capitalize(monthNamePt(shownMonth))}{' '}
              <span style={{ color: COLORS.faint, fontWeight: 600 }}>
                {parseDayKey(shownMonth).getFullYear()}
              </span>
            </div>
            <MonthArrow dir="next" disabled={!canNext} onClick={() => setShownMonth((m) => shiftMonth(m, 1))} />
          </div>
          <div
            style={{
              display: 'inline-flex',
              background: COLORS.card,
              border: `1.5px solid ${COLORS.line}`,
              borderRadius: 13,
              padding: 3,
            }}
          >
            {([['cal', 'Calendário'], ['dia', 'Diário']] as const).map(([v, lbl]) => {
              const on = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    background: on ? COLORS.accent : 'transparent',
                    color: on ? COLORS.onAccent : COLORS.soft,
                  }}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Additive filter chips + a by-category picker. No chips = show all. */}
        <FilterBar
          filters={filters}
          onRemove={removeFilter}
          onClear={() => setFilters([])}
          onOpenPicker={() => setPicking(true)}
        />

        {view === 'cal' ? (
          <CalendarView
            monthStart={monthStart}
            total={total}
            blanks={blanks}
            dayByKey={dayByKey}
            eventsByKey={eventsByKey}
            matches={matches}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <DiarioList
            monthStart={monthStart}
            total={total}
            dayByKey={dayByKey}
            eventsByKey={eventsByKey}
            matches={matches}
            filtered={filters.length > 0}
            onSelect={setSelected}
          />
        )}
      </div>

      {picking && (
        <FilterPicker
          active={filters}
          symptoms={activeSymptoms.map((s) => s.name)}
          onAdd={addFilter}
          onClose={() => setPicking(false)}
        />
      )}

      {selected != null && (
        <DayDetail
          dateKey={selected}
          log={dayByKey.get(selected) ?? null}
          events={eventsByKey.get(selected) ?? []}
          onEditDay={onEditDay}
          onAddEvento={onAddEvento}
          onEditEvento={onEditEvento}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MonthArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'mês anterior' : 'próximo mês'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 10,
        background: COLORS.card,
        border: `1.5px solid ${COLORS.line}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
      }}
    >
      <Icon name={dir === 'prev' ? 'chevL' : 'chevR'} size={18} color={COLORS.soft} />
    </button>
  );
}

/**
 * The filter row: active filters as removable chips, an always-present
 * '+ filtro' chip that opens the category picker, and — only when something is
 * active — a quiet 'limpar' to clear all. No chips at all means "show
 * everything"; there is deliberately no 'Tudo' affordance.
 */
function FilterBar({
  filters,
  onRemove,
  onClear,
  onOpenPicker,
}: {
  filters: Filter[];
  onRemove: (f: Filter) => void;
  onClear: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}
    >
      {filters.map((f) => (
        <FilterChip key={f} label={filterLabel(f)} onRemove={() => onRemove(f)} />
      ))}
      <button
        onClick={onOpenPicker}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 13,
          border: `1.5px dashed ${COLORS.line}`,
          background: COLORS.card,
          color: COLORS.soft,
          fontFamily: 'Hanken Grotesk, sans-serif',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon name="plus" size={15} color={COLORS.soft} strokeWidth={2.4} />
        filtro
      </button>
      {filters.length > 0 && (
        <button
          onClick={onClear}
          style={{
            minHeight: 44,
            padding: '0 8px',
            border: 'none',
            background: 'transparent',
            color: COLORS.faint,
            fontFamily: 'Hanken Grotesk, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          limpar filtros
        </button>
      )}
    </div>
  );
}

/** A single active-filter chip: label + an × that removes just this filter. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        minHeight: 44,
        paddingLeft: 14,
        paddingRight: 0,
        borderRadius: 13,
        border: `1.5px solid ${COLORS.line}`,
        background: COLORS.card,
        color: COLORS.ink,
        fontFamily: 'Hanken Grotesk, sans-serif',
        fontSize: 13.5,
        fontWeight: 600,
      }}
    >
      {label}
      {/* Hit area is the full 44px button; the visual badge inside stays ~30px. */}
      <button
        onClick={onRemove}
        aria-label={`remover filtro ${label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: 9,
            background: COLORS.accentSoft,
            color: COLORS.accent,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ×
        </span>
      </button>
    </span>
  );
}

/**
 * Category picker: a bottom sheet with two labelled sections — Sintomas and
 * Eventos. Tapping an item adds it; already-active items are hidden from the
 * choices (they live in the chip row instead).
 */
function FilterPicker({
  active,
  symptoms,
  onAdd,
  onClose,
}: {
  active: Filter[];
  symptoms: string[];
  onAdd: (f: Filter) => void;
  onClose: () => void;
}) {
  const symptomChoices = symptoms
    .map((name): Filter => `sym:${name}`)
    .filter((f) => !active.includes(f));
  const eventChoices = EVENT_ORDER.map((t): Filter => `evt:${t}`).filter(
    (f) => !active.includes(f),
  );

  return (
    <BottomSheet open onClose={onClose}>
      <div
        style={{
          fontFamily: 'Schibsted Grotesk, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Adicionar filtro
      </div>

      <PickerSection
        title="Sintomas"
        choices={symptomChoices}
        empty="Sem sintomas para filtrar."
        onPick={(f) => onAdd(f)}
      />
      <PickerSection
        title="Eventos"
        choices={eventChoices}
        empty="Sem mais tipos para filtrar."
        onPick={(f) => onAdd(f)}
      />
    </BottomSheet>
  );
}

function PickerSection({
  title,
  choices,
  empty,
  onPick,
}: {
  title: string;
  choices: Filter[];
  empty: string;
  onPick: (f: Filter) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: COLORS.faint,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {choices.length === 0 ? (
        <div style={{ fontSize: 13.5, color: COLORS.soft }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {choices.map((f) => (
            <button
              key={f}
              onClick={() => onPick(f)}
              style={{
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 13,
                border: `1.5px solid ${COLORS.line}`,
                background: COLORS.card,
                color: COLORS.ink,
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CalendarViewProps {
  monthStart: string;
  total: number;
  blanks: number;
  dayByKey: Map<string, DayLog>;
  eventsByKey: Map<string, HealthEvent[]>;
  matches: (key: string) => boolean;
  selected: string | null;
  onSelect: (key: string) => void;
}

function CalendarView({
  monthStart,
  total,
  blanks,
  dayByKey,
  eventsByKey,
  matches,
  selected,
  onSelect,
}: CalendarViewProps) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          gap: 5,
          marginBottom: 5,
        }}
      >
        {WEEKDAY_LETTERS_PT.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11.5, color: COLORS.faint }}>
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          gap: 5,
          marginBottom: 16,
        }}
      >
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const key = addDays(monthStart, i);
          const sev = dayByKey.get(key)?.overallSeverity ?? null;
          const dayEvents = eventsByKey.get(key) ?? [];
          const hasEvents = dayEvents.length > 0;
          const dim = !matches(key);
          const dayNum = i + 1;
          // Marker ink is neutral: white over a filled severity cell, ink
          // otherwise. NEVER a severity ink (those are sacred to symptoms).
          const markerInk = sev ? '#fff' : COLORS.ink;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                aspectRatio: '1',
                borderRadius: 9,
                position: 'relative',
                padding: 4,
                border: hasEvents
                  ? `1.5px solid ${sev ? '#fff' : COLORS.ink}`
                  : `1.5px solid ${sev ? 'transparent' : COLORS.line}`,
                background: sev ? SEV[sev] : COLORS.card,
                opacity: dim ? 0.25 : 1,
                cursor: 'pointer',
                outline: selected === key ? `2.5px solid ${COLORS.accent}` : 'none',
                outlineOffset: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: sev ? '#fff' : COLORS.soft,
                }}
              >
                {dayNum}
              </span>
              {hasEvents && (
                <DayMarker count={dayEvents.length} type={dayEvents[0].type} ink={markerInk} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 13,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {(['leve', 'moderado', 'grave'] as const).map((s) => (
          <span
            key={s}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: COLORS.soft }}
          >
            <span style={{ width: 11, height: 11, borderRadius: 3, background: SEV[s] }} />
            {s}
          </span>
        ))}
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: COLORS.soft }}
        >
          <span
            style={{ width: 11, height: 11, borderRadius: 3, border: `1.5px solid ${COLORS.ink}` }}
          />
          evento
        </span>
      </div>
    </>
  );
}

/**
 * Calendar day marker for one or more events. A single event shows its icon; a
 * cluster shows a count. Ink is always neutral (passed in), never a severity.
 */
function DayMarker({ count, type, ink }: { count: number; type: EventType; ink: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        bottom: 2,
        right: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 13,
        height: 13,
        borderRadius: 7,
        padding: count > 1 ? '0 3px' : 0,
      }}
    >
      {count > 1 ? (
        <span style={{ fontSize: 9, fontWeight: 700, color: ink, lineHeight: 1 }}>{count}</span>
      ) : (
        <Icon name={EVENT_META[type].icon} size={11} color={ink} strokeWidth={2.4} />
      )}
    </span>
  );
}

interface DiarioListProps {
  monthStart: string;
  total: number;
  dayByKey: Map<string, DayLog>;
  eventsByKey: Map<string, HealthEvent[]>;
  matches: (key: string) => boolean;
  filtered: boolean;
  onSelect: (key: string) => void;
}

function DiarioList({
  monthStart,
  total,
  dayByKey,
  eventsByKey,
  matches,
  filtered,
  onSelect,
}: DiarioListProps) {
  // Days with a log OR any event, most recent first, honoring the filter.
  const rows: string[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const key = addDays(monthStart, i);
    const has = dayByKey.has(key) || eventsByKey.has(key);
    if (has && matches(key)) rows.push(key);
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 14.5, color: COLORS.soft, padding: '8px 2px' }}>
        {filtered ? 'Nada com esse filtro neste mês.' : 'Nada anotado neste mês ainda.'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((key) => {
        const log = dayByKey.get(key) ?? null;
        const dayEvents = eventsByKey.get(key) ?? [];
        const dayNum = parseDayKey(key).getDate();
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              textAlign: 'left',
              background: dayEvents.length > 0 ? COLORS.accentSoft : COLORS.card,
              border: `1.5px solid ${COLORS.line}`,
              borderRadius: 16,
              padding: 13,
              cursor: 'pointer',
              boxShadow: `0 2px 0 ${COLORS.line}`,
            }}
          >
            <div style={{ textAlign: 'center', width: 34 }}>
              <div
                style={{
                  fontFamily: 'Schibsted Grotesk, sans-serif',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 0.9,
                }}
              >
                {String(dayNum).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 11, color: COLORS.faint }}>{weekdayShortPt(key)}</div>
            </div>
            <div style={{ flex: 1 }}>
              {log?.overallSeverity ? (
                <HWave color={SEV[log.overallSeverity]} count={log.waveCount} h={14} w={26} sw={2.6} />
              ) : (
                <span style={{ fontSize: 13, color: COLORS.soft }}>
                  {dayEvents.length > 0 ? EVENT_META[dayEvents[0].type].label : '—'}
                </span>
              )}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {dayEvents.map((e) => (
                  <Tag key={e.id} on>
                    {EVENT_META[e.type].label}
                  </Tag>
                ))}
                {log?.symptoms.slice(0, 2).map((s) => <Tag key={s.name}>{s.name}</Tag>)}
              </div>
            </div>
            {log && <HFace mood={log.mood} size={24} color={COLORS.soft} />}
          </button>
        );
      })}
    </div>
  );
}

function Tag({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 8,
        fontWeight: 600,
        background: on ? COLORS.accent : COLORS.paper,
        color: on ? COLORS.onAccent : COLORS.soft,
        border: `1.5px solid ${on ? COLORS.accent : COLORS.line}`,
      }}
    >
      {children}
    </span>
  );
}

interface DayDetailProps {
  dateKey: string;
  log: DayLog | null;
  events: HealthEvent[];
  onEditDay: (dateKey: string) => void;
  onAddEvento: (dateKey: string) => void;
  onEditEvento: (eventId: string, dateKey: string) => void;
  onClose: () => void;
}

function DayDetail({
  dateKey,
  log,
  events,
  onEditDay,
  onAddEvento,
  onEditEvento,
  onClose,
}: DayDetailProps) {
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
        <div>
          <div style={{ fontFamily: 'Schibsted Grotesk, sans-serif', fontSize: 24, fontWeight: 700 }}>
            {capitalize(formatLongPt(dateKey))}
          </div>
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
            <button
              key={e.id}
              onClick={() => {
                onClose();
                onEditEvento(e.id, dateKey);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
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
              <Icon name="pencil" size={15} color={COLORS.faint} />
            </button>
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
        events.length === 0 && (
          <div style={{ fontSize: 15, color: COLORS.soft, marginBottom: 18 }}>
            Nada anotado neste dia ainda.
          </div>
        )
      )}

      {/* Always-available actions: register/edit the day, or add an event. */}
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
