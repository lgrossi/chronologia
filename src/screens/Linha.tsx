/**
 * Linha do tempo — browse history (SCREENS.md §4, proto-linha.jsx).
 *
 * Reads REAL data for the shown month: DayLogs + HealthEvents in range. The
 * prototype's mock month is gone — severity colors, infusão markers, symptom
 * tags and the day-detail body all derive from the repository via hooks.
 *
 * Navigation/overlay actions arrive as props (never the store): `setFilter`
 * lifts the active chip to the parent so a deep-link can preselect it;
 * `onEditDay` closes the sheet and lets the parent open Registro for that date;
 * `onAddEvento` is wired for the FAB elsewhere but kept on the contract.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { HWave } from '@/components/HWave';
import { HFace } from '@/components/HFace';
import { Icon } from '@/components/Icon';
import { Btn } from '@/components/Btn';
import { SevDots } from '@/components/SevDots';
import { BottomSheet } from '@/components/BottomSheet';
import { COLORS, SEV } from '@/theme/tokens';
import type { DayLog, Severity } from '@/lib/types';
import {
  addDays,
  formatLongPt,
  localDayKey,
  monthNamePt,
  parseDayKey,
} from '@/lib/date';
import { useDaysInRange, useEventsInRange } from '@/data/hooks';

export interface LinhaProps {
  filter: string;
  setFilter: (f: string) => void;
  onEditDay: (dateKey: string) => void;
  onAddEvento: () => void;
}

type View = 'cal' | 'dia';

const FILTERS = ['tudo', 'diarreia', 'pontadas', 'cansaço', 'infusão'] as const;
const WEEKDAY_HEADER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;
const WD_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

/** First day-key of the calendar month containing `key`. */
function monthStartKey(key: string): string {
  const d = parseDayKey(key);
  return localDayKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Last day-key of the calendar month containing `key`. */
function monthEndKey(key: string): string {
  const d = parseDayKey(key);
  return localDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Number of days in the calendar month of `key`. */
function daysInMonth(key: string): number {
  const d = parseDayKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
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

/** Capitalize the first letter (month names come back lowercased). */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Linha({ filter, setFilter, onEditDay, onAddEvento }: LinhaProps) {
  void onAddEvento; // wired on the contract; the FAB triggers it from the shell
  // Which month is shown — defaults to the current month. (No in-screen month
  // nav is specified for Linha; Tendências owns the ‹ › month switcher.)
  const [month] = useState<string>(() => localDayKey());
  const [view, setView] = useState<View>('cal');
  const [selected, setSelected] = useState<string | null>(null);

  const monthStart = monthStartKey(month);
  const monthEnd = monthEndKey(month);

  const days = useDaysInRange(monthStart, monthEnd);
  const events = useEventsInRange(monthStart, monthEnd);

  const dayByKey = new Map<string, DayLog>(days.map((d) => [d.date, d]));
  const infusionByKey = new Set<string>(
    events.filter((e) => e.type === 'infusao').map((e) => e.date),
  );

  const matches = (key: string): boolean => {
    if (filter === 'tudo') return true;
    if (filter === 'infusão') return infusionByKey.has(key);
    const log = dayByKey.get(key);
    if (!log) return false;
    return log.symptoms.some((s) => s.name.toLowerCase() === filter);
  };

  const total = daysInMonth(month);
  const blanks = leadingBlanks(monthStart);

  return (
    <div className="min-h-screen bg-paper px-5 pt-14 pb-28 font-sans text-ink">
      <div className="mx-auto w-full" style={{ maxWidth: 480 }}>
        {/* Header: month + Calendário|Diário toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div style={{ fontFamily: 'Schibsted Grotesk, sans-serif', fontSize: 26, fontWeight: 700 }}>
            {cap(monthNamePt(month))}
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
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Hanken Grotesk, sans-serif',
                    fontSize: 13.5,
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

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 11,
                  cursor: 'pointer',
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: 13,
                  fontWeight: on ? 700 : 500,
                  background: on ? COLORS.ink : 'transparent',
                  color: on ? COLORS.onAccent : COLORS.soft,
                  border: `1.5px solid ${on ? COLORS.ink : COLORS.line}`,
                  minHeight: 34,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {view === 'cal' ? (
          <CalendarView
            monthStart={monthStart}
            total={total}
            blanks={blanks}
            dayByKey={dayByKey}
            infusionByKey={infusionByKey}
            matches={matches}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <DiarioList
            monthStart={monthStart}
            total={total}
            dayByKey={dayByKey}
            infusionByKey={infusionByKey}
            onSelect={setSelected}
          />
        )}
      </div>

      {selected != null && (
        <DayDetail
          dateKey={selected}
          log={dayByKey.get(selected) ?? null}
          hasInfusion={infusionByKey.has(selected)}
          infusionNote={events.find((e) => e.type === 'infusao' && e.date === selected)?.note}
          onEditDay={onEditDay}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

interface CalendarViewProps {
  monthStart: string;
  total: number;
  blanks: number;
  dayByKey: Map<string, DayLog>;
  infusionByKey: Set<string>;
  matches: (key: string) => boolean;
  selected: string | null;
  onSelect: (key: string) => void;
}

function CalendarView({
  monthStart,
  total,
  blanks,
  dayByKey,
  infusionByKey,
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
        {WEEKDAY_HEADER.map((d, i) => (
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
          const infusao = infusionByKey.has(key);
          const dim = !matches(key);
          const dayNum = i + 1;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                aspectRatio: '1',
                borderRadius: 9,
                position: 'relative',
                padding: 4,
                border: infusao
                  ? `1.5px solid ${COLORS.ink}`
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
              {infusao && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 3,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: `2px solid ${sev ? '#fff' : COLORS.ink}`,
                  }}
                />
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
            style={{ width: 11, height: 11, borderRadius: '50%', border: `2px solid ${COLORS.ink}` }}
          />
          infusão
        </span>
      </div>
    </>
  );
}

interface DiarioListProps {
  monthStart: string;
  total: number;
  dayByKey: Map<string, DayLog>;
  infusionByKey: Set<string>;
  onSelect: (key: string) => void;
}

function DiarioList({ monthStart, total, dayByKey, infusionByKey, onSelect }: DiarioListProps) {
  // Logged days OR infusão days, most recent first.
  const rows: string[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const key = addDays(monthStart, i);
    if (dayByKey.has(key) || infusionByKey.has(key)) rows.push(key);
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 14.5, color: COLORS.soft, padding: '8px 2px' }}>
        Nada anotado neste mês ainda.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((key) => {
        const log = dayByKey.get(key) ?? null;
        const infusao = infusionByKey.has(key);
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
              background: infusao ? COLORS.accentSoft : COLORS.card,
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
                <span style={{ fontSize: 13, color: COLORS.soft }}>infusão</span>
              )}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {infusao && <Tag on>infusão</Tag>}
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
  hasInfusion: boolean;
  infusionNote?: string;
  onEditDay: (dateKey: string) => void;
  onClose: () => void;
}

function DayDetail({ dateKey, log, hasInfusion, infusionNote, onEditDay, onClose }: DayDetailProps) {
  const sev: Severity | null = log?.overallSeverity ?? null;
  const editLink: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: COLORS.accent,
    fontFamily: 'Hanken Grotesk, sans-serif',
    fontSize: 14.5,
    fontWeight: 700,
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
            {cap(formatLongPt(dateKey))}
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

      {hasInfusion && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: COLORS.accentSoft,
            borderRadius: 14,
            padding: '13px 15px',
            marginBottom: 14,
          }}
        >
          <Icon name="drop" size={19} color={COLORS.accent} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {infusionNote?.trim() ? infusionNote : 'Infusão'}
          </span>
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
        !hasInfusion && (
          <div style={{ fontSize: 15, color: COLORS.soft, marginBottom: 18 }}>
            Dia tranquilo, sem sintomas anotados.
          </div>
        )
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          style={editLink}
          onClick={() => {
            onClose();
            onEditDay(dateKey);
          }}
        >
          editar
        </button>
      </div>

      <Btn onClick={onClose}>fechar</Btn>
    </BottomSheet>
  );
}
