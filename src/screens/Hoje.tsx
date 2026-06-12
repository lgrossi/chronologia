/**
 * Hoje — the Home screen. Orients and invites today's log in one glance.
 *
 * Two primary-card states keyed on whether today is logged: the accent STARTER
 * card (nothing logged yet) or the normal recap Card (tap to edit). All data is
 * live via the reactive hooks; navigation/overlay actions arrive as props.
 */
import { useState } from 'react';
import { useEventsInRange, useDay, useDaysInRange, useMedications, useProfile, useReminders } from '@/data/hooks';
import { Card } from '@/components/Card';
import { DayDetail } from '@/components/DayDetail';
import { Btn } from '@/components/Btn';
import { HFace } from '@/components/HFace';
import { Icon } from '@/components/Icon';
import { COLORS, SEV } from '@/theme/tokens';
import {
  addDays,
  formatGreetingPt,
  localDayKey,
  weekKeysMonday,
} from '@/lib/date';
import { cycleStatus, infusionMedication, weekStrip } from '@/lib/selectors';
import type { DayLog, Mood } from '@/lib/types';

/** Display word for a mood (the recap bolds it as the day's character). */
const MOOD_WORD: Record<Mood, string> = { bom: 'bom', neutro: 'neutro', ruim: 'ruim' };

/** Time-of-day salutation from the device-local hour (same clock as the day-key). */
function greetingPt(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "{count}× {sev}" when there were waves, else "dia tranquilo". */
function recapSubline(log: DayLog): string {
  return log.overallSeverity ? `${log.waveCount}× ${log.overallSeverity}` : 'dia tranquilo';
}

export function Hoje({
  onRegistrar,
  onOpenLinha,
  onEditDay,
  onAddEvento,
  onEditEvento,
}: {
  onRegistrar: () => void;
  onOpenLinha: () => void;
  onEditDay: (dateKey: string) => void;
  onAddEvento: (dateKey: string) => void;
  onEditEvento: (eventId: string, dateKey: string) => void;
}) {
  const todayKey = localDayKey();
  // A tapped week-strip day opens the same chooser sheet as the calendar.
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const profile = useProfile();
  const reminders = useReminders();

  const today = useDay(todayKey);
  const yesterday = useDay(addDays(todayKey, -1));

  // Week strip: the Mon..Sun keys for this week, colored by each day's severity.
  const weekKeys = weekKeysMonday(todayKey);
  const weekDays = useDaysInRange(weekKeys[0], weekKeys[6]);
  const cells = weekStrip(weekDays, todayKey);

  // Infusion cycle: most recent `infusao` in the past year + the med that
  // infusion references (not meds[0], which may be a daily maintenance med).
  const events = useEventsInRange(addDays(todayKey, -365), todayKey);
  const meds = useMedications();
  const lastInfusion =
    [...events].reverse().find((e) => e.type === 'infusao') ?? null;
  const med = infusionMedication(meds, lastInfusion);
  const cycle = cycleStatus(todayKey, lastInfusion, med);
  const hasCycle = lastInfusion !== null && cycle.total > 0;

  const logged = today ?? null;
  const avatarLetter = profile.name.trim().charAt(0).toUpperCase() || 'A';

  return (
    <div className="flex w-full flex-col gap-4">
      {/* greeting */}
      <div className="flex items-start justify-between">
        <div>
          <div
            className="font-display text-base font-semibold tracking-wide"
            style={{ color: COLORS.accent }}
          >
            Chronologia
          </div>
          <div className="mt-1.5 font-display text-3xl font-bold leading-none">
            {greetingPt(new Date().getHours())}, {profile.name}
          </div>
          <div className="mt-1 text-[14.5px]" style={{ color: COLORS.soft }}>
            {formatGreetingPt(todayKey)}
          </div>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold"
          style={{ background: COLORS.card, border: `1.5px solid ${COLORS.line}` }}
        >
          {avatarLetter}
        </div>
      </div>

      {/* yesterday recap */}
      {yesterday && (
        <div className="flex items-center gap-2.5 text-sm" style={{ color: COLORS.soft }}>
          <HFace mood={yesterday.mood} size={22} color={COLORS.soft} />
          <span>
            Ontem foi um dia{' '}
            <b style={{ color: COLORS.ink }}>{MOOD_WORD[yesterday.mood]}</b>
            {yesterday.overallSeverity ? ` · ${yesterday.overallSeverity}` : ' · tranquilo'}
          </span>
        </div>
      )}

      {/* primary card — starter vs logged */}
      {!logged ? (
        <Card accent pad={20}>
          <div className="mb-[18px] flex items-center gap-3.5">
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full"
              style={{ background: COLORS.onAccent }}
            >
              <HFace mood="bom" size={34} color={COLORS.accent} />
            </div>
            <div
              className="font-display text-[21px] font-semibold leading-[1.15]"
              style={{ color: COLORS.onAccent }}
            >
              Vamos registrar
              <br />o seu dia?
            </div>
          </div>
          <Btn
            primary
            onClick={onRegistrar}
            style={{ background: COLORS.onAccent, color: COLORS.accent, boxShadow: 'none' }}
          >
            registrar hoje <Icon name="chevR" size={18} color={COLORS.accent} />
          </Btn>
        </Card>
      ) : (
        <Card pad={18} onClick={onRegistrar}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: logged.symptoms.length ? 12 : 0 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full"
                style={{ background: COLORS.accentSoft }}
              >
                <HFace mood={logged.mood} size={30} color={COLORS.accent} />
              </div>
              <div>
                <div className="font-display text-[17px] font-bold">Dia registrado ✓</div>
                <div className="text-[13.5px]" style={{ color: COLORS.soft }}>
                  {recapSubline(logged)}
                </div>
              </div>
            </div>
            <Icon name="pencil" size={19} color={COLORS.soft} />
          </div>
          {logged.symptoms.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5 pt-3"
              style={{ borderTop: `1.5px solid ${COLORS.line}` }}
            >
              {logged.symptoms.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[13px]"
                  style={{
                    color: COLORS.soft,
                    background: COLORS.paper,
                    border: `1.5px solid ${COLORS.line}`,
                  }}
                >
                  <span
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: SEV[s.severity] }}
                  />
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* infusion cycle */}
      <Card pad={16}>
        <div className="mb-[11px] flex items-baseline justify-between">
          <span className="flex items-center gap-2 text-[14.5px]" style={{ color: COLORS.soft }}>
            <Icon name="drop" size={17} color={SEV.grave} /> ciclo da infusão
          </span>
          {med && (
            <span className="text-[13.5px]" style={{ color: COLORS.faint }}>
              {med.name}
            </span>
          )}
        </div>
        {hasCycle ? (
          <>
            <div className="mb-2.5 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold">dia {cycle.dayN}</span>
              <span className="text-sm" style={{ color: COLORS.soft }}>
                {cycle.overdue
                  ? `· ${Math.abs(cycle.daysLeft)} dia(s) em atraso`
                  : `· faltam ${cycle.daysLeft} p/ a próxima`}
              </span>
            </div>
            <div
              className="h-[9px] overflow-hidden rounded-md"
              style={{ background: COLORS.line }}
            >
              <div
                className="h-full rounded-md"
                style={{ width: `${Math.round(cycle.pct * 100)}%`, background: SEV.leve }}
              />
            </div>
          </>
        ) : (
          <div className="text-sm" style={{ color: COLORS.soft }}>
            nenhuma infusão registrada ainda
          </div>
        )}
      </Card>

      {/* week strip */}
      <div>
        <div className="mb-2.5 ml-0.5 flex items-center justify-between">
          <span className="text-sm" style={{ color: COLORS.soft }}>
            esta semana
          </span>
          <button
            type="button"
            onClick={onOpenLinha}
            className="cursor-pointer border-none bg-transparent font-sans text-[13.5px] font-semibold"
            style={{ color: COLORS.accent }}
          >
            ver tudo ›
          </button>
        </div>
        <div className="flex gap-[7px]">
          {cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSheetDay(cell.key)}
              aria-label={`abrir ${cell.key}`}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0"
            >
              <div
                className="h-[42px] w-full rounded-xl"
                style={{
                  // severity ink for symptom days, Floresta green for a logged
                  // tranquilo day, white only for days with no record at all.
                  background: cell.severity
                    ? SEV[cell.severity]
                    : cell.logged
                      ? COLORS.accent
                      : COLORS.card,
                  border: cell.isToday
                    ? `2.5px solid ${COLORS.accent}`
                    : `1.5px solid ${cell.severity || cell.logged ? 'transparent' : COLORS.line}`,
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: cell.isToday ? COLORS.ink : COLORS.faint,
                  fontWeight: cell.isToday ? 700 : 500,
                }}
              >
                {cell.letter}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* reminder strip */}
      <div
        className="flex items-center gap-3 rounded-[14px] px-[15px] py-[13px]"
        style={{ border: `1.5px dashed ${COLORS.line}`, color: COLORS.soft }}
      >
        <Icon name="bell" size={18} color={COLORS.soft} />
        <span className="flex-1 text-sm">Lembrete diário às {reminders.dailyTime}</span>
        <span className="text-[13px] font-semibold" style={{ color: COLORS.accent }}>
          editar
        </span>
      </div>

      {sheetDay && (
        <DayDetail
          dateKey={sheetDay}
          onEditDay={onEditDay}
          onAddEvento={onAddEvento}
          onEditEvento={onEditEvento}
          onClose={() => setSheetDay(null)}
        />
      )}
    </div>
  );
}
