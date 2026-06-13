/**
 * Pure derived selectors over the data model. No I/O, no Dexie — these take
 * plain records and return view-ready shapes, so they unit-test in isolation.
 *
 * The prototype's "dia 6 · faltam 22" cycle numbers and the Tendências rollups
 * are MOCK. Real numbers come from `Medication.intervalDays` (56 for the 8-week
 * Infliximabe cycle) plus the date of the last `infusao` event.
 */
import type { DayLog, HealthEvent, Medication, Mood, Severity } from './types';
import { daysBetween, weekKeysMonday, weekdayLetterPt } from './date';

/**
 * A medication is an INFUSION-CYCLE med (gets the "ciclo da infusão" countdown)
 * only if its cadence is multi-week. Daily / short-interval meds are maintenance
 * meds — tracked in the list, but never framed as an infusion or a countdown, so
 * adding e.g. a daily azatioprina never says "próxima infusão em 1 dia".
 */
export const INFUSION_MIN_INTERVAL_DAYS = 14;
export function isInfusionMed(m: Medication): boolean {
  return m.intervalDays >= INFUSION_MIN_INTERVAL_DAYS;
}

/**
 * The medication that drives the infusion cycle: the one referenced by the
 * anchoring infusion EVENT — and only if it's actually an infusion-cadence med.
 * Keying off the event (not `meds[0]`) keeps the cycle stable as other meds are
 * added; the cadence guard keeps a daily med from ever driving the countdown.
 * Returns null when there's no infusion, its med is gone, or its med is daily.
 */
export function infusionMedication(
  meds: Medication[],
  lastInfusion: HealthEvent | null,
): Medication | null {
  if (!lastInfusion?.medicationId) return null;
  const med = meds.find((m) => m.id === lastInfusion.medicationId) ?? null;
  return med && isInfusionMed(med) ? med : null;
}

/**
 * Events still awaiting confirmation (`done === false`) — i.e. reminders. Sorted
 * by date ascending so the soonest/most-overdue is first. A pending event with a
 * past date is overdue ("confirmar"); today-or-future is upcoming.
 */
export function pendingEvents(events: HealthEvent[]): HealthEvent[] {
  return events.filter((e) => e.done === false).sort((a, b) => a.date.localeCompare(b.date));
}

export interface CycleStatus {
  dayN: number;
  total: number;
  daysLeft: number;
  pct: number;
  overdue: boolean;
}

/**
 * Infusion-cycle progress. `dayN` = days since the last infusion (clamped ≥ 0);
 * `total` = the medication interval; `daysLeft` = total − dayN (negative once
 * overdue); `pct` = dayN/total (clamped to [0,1] for the progress bar). Null
 * inputs yield a benign zeroed status so the UI never crashes pre-data.
 */
export function cycleStatus(
  today: string,
  lastInfusion: HealthEvent | null,
  med: Medication | null,
): CycleStatus {
  const total = med?.intervalDays ?? 0;
  if (!lastInfusion || total <= 0) {
    return { dayN: 0, total, daysLeft: total, pct: 0, overdue: false };
  }
  const dayN = Math.max(0, daysBetween(lastInfusion.date, today));
  const daysLeft = total - dayN;
  const pct = Math.min(1, Math.max(0, dayN / total));
  return { dayN, total, daysLeft, pct, overdue: daysLeft < 0 };
}

export interface WeekCell {
  key: string;
  letter: string;
  severity: Severity | null;
  /** A DayLog exists for this day. severity null + logged true = tranquilo. */
  logged: boolean;
  isToday: boolean;
}

/**
 * The Mon..Sun strip for the week containing `todayKey`. Each cell carries the
 * day's `overallSeverity` (null when tranquilo OR unlogged — disambiguate with
 * `logged`), whether a log exists at all, its pt-BR weekday letter, and whether
 * it is today.
 */
export function weekStrip(days: DayLog[], todayKey: string): WeekCell[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return weekKeysMonday(todayKey).map((key) => ({
    key,
    letter: weekdayLetterPt(key),
    severity: byDate.get(key)?.overallSeverity ?? null,
    logged: byDate.has(key),
    isToday: key === todayKey,
  }));
}

export interface MonthRollup {
  bom: number;
  mid: number;
  ruim: number;
}

/** Mood tally across the logged days passed in (neutro → `mid`). */
export function monthRollup(days: DayLog[]): MonthRollup {
  const roll: MonthRollup = { bom: 0, mid: 0, ruim: 0 };
  for (const d of days) {
    const key: keyof MonthRollup = d.mood === 'bom' ? 'bom' : d.mood === 'ruim' ? 'ruim' : 'mid';
    roll[key] += 1;
  }
  return roll;
}

export interface SymptomCount {
  name: string;
  count: number;
}

/**
 * Top symptoms by number of DAYS each appeared (not total occurrences), sorted
 * descending. A symptom logged twice in one day still counts as one day. Ties
 * break alphabetically for stable output.
 */
export function topSymptoms(days: DayLog[], n = 4): SymptomCount[] {
  const counts = new Map<string, number>();
  for (const d of days) {
    const seen = new Set<string>();
    for (const s of d.symptoms) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n);
}

export interface CyclePoint {
  dayN: number;
  severity: number;
}

const SEV_WEIGHT: Record<Severity, number> = { leve: 1, moderado: 2, grave: 3 };

/**
 * Severity-over-cycle series for the Tendências CycleCurve: each logged day in
 * `days` placed at its day-N within the cycle that started at `lastInfusion`,
 * carrying a numeric severity weight (leve 1 / moderado 2 / grave 3; tranquilo
 * 0). Days before the infusion or beyond `intervalDays` are excluded. Sorted by
 * dayN. Returns empty when there is no infusion/medication to anchor against.
 */
export function cycleCurveSeries(
  days: DayLog[],
  lastInfusion: HealthEvent | null,
  med: Medication | null,
): CyclePoint[] {
  const total = med?.intervalDays ?? 0;
  if (!lastInfusion || total <= 0) return [];
  const points: CyclePoint[] = [];
  for (const d of days) {
    const dayN = daysBetween(lastInfusion.date, d.date);
    if (dayN < 0 || dayN > total) continue;
    points.push({ dayN, severity: d.overallSeverity ? SEV_WEIGHT[d.overallSeverity] : 0 });
  }
  return points.sort((a, b) => a.dayN - b.dayN);
}

// Re-exported for callers that want the mood→bucket mapping the rollup uses.
export type { Mood };
