/**
 * Pure date helpers for Chronologia.
 *
 * The day-key is the spine of the data model: one DayLog per local calendar
 * day, keyed `yyyy-mm-dd`. The boundary is DEVICE-LOCAL time (BR), never UTC —
 * logging at 23:30 belongs to today, 00:30 to the next day. `toISOString()` is
 * UTC and would misattribute late-night entries, so it is deliberately avoided.
 */
import { addDays as fnsAddDays, differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Local calendar day as `yyyy-mm-dd`, using the device timezone. */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a `yyyy-mm-dd` key into a local Date at midnight (no UTC shift). */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a day-key by `n` days (may be negative), returning a new key. */
export function addDays(key: string, n: number): string {
  return localDayKey(fnsAddDays(parseDayKey(key), n));
}

/** Whole calendar days from `fromKey` to `toKey` (to − from). */
export function daysBetween(fromKey: string, toKey: string): number {
  return differenceInCalendarDays(parseDayKey(toKey), parseDayKey(fromKey));
}

// Single-letter pt-BR weekday headers, Monday-first: S T Q Q S S D.
const WEEKDAY_LETTERS_PT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

/** Weekday letter (S T Q Q S S D), Monday=index 0. */
export function weekdayLetterPt(key: string): string {
  const dow = parseDayKey(key).getDay(); // 0=Sun..6=Sat
  const mondayIdx = (dow + 6) % 7; // 0=Mon..6=Sun
  return WEEKDAY_LETTERS_PT[mondayIdx];
}

/** Full pt-BR month name, lowercase (e.g. 'junho'). */
export function monthNamePt(key: string): string {
  return format(parseDayKey(key), 'MMMM', { locale: ptBR });
}

/** e.g. 'domingo, 10 jun' — full weekday, day, short month. */
export function formatLongPt(key: string): string {
  return format(parseDayKey(key), "EEEE, d MMM", { locale: ptBR });
}

/** Monday of the week containing `key`, as a day-key. */
export function startOfWeekMonday(key: string): string {
  const dow = parseDayKey(key).getDay(); // 0=Sun..6=Sat
  const back = (dow + 6) % 7; // days since Monday
  return addDays(key, -back);
}

/** The seven day-keys Mon..Sun for the week containing `key`. */
export function weekKeysMonday(key: string): string[] {
  const monday = startOfWeekMonday(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
