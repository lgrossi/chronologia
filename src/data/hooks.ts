/**
 * Reactive read hooks over the repository, backed by Dexie liveQuery: any write
 * through `repo` re-runs the matching query and re-renders subscribers.
 *
 * These query the shared `db` directly (liveQuery needs Dexie's observable
 * queries, which the abstract `Repository` does not expose) while writes still
 * go through `repo` — the seam holds because reads here are an implementation
 * detail of the Dexie backend, mirrored if a future backend needs its own
 * realtime hooks.
 *
 * Collection hooks default to `[]` and singleton hooks to their defaults while
 * the first query resolves, so screens never branch on `undefined`.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  DayLog,
  HealthEvent,
  Medication,
  Profile,
  ReminderSettings,
  Symptom,
} from '@/lib/types';
import { META_KEYS, db } from './db';
import { DEFAULT_PROFILE, DEFAULT_REMINDERS } from './DexieRepository';

/** Live DayLog for one date, or null when nothing is logged. */
export function useDay(date: string): DayLog | null | undefined {
  return useLiveQuery(async () => (await db.days.get(date)) ?? null, [date]);
}

/** Live DayLogs in `[from, to]` (inclusive), sorted by date. */
export function useDaysInRange(from: string, to: string): DayLog[] {
  return (
    useLiveQuery(
      () => db.days.where('date').between(from, to, true, true).sortBy('date'),
      [from, to],
    ) ?? []
  );
}

/** Live HealthEvents in `[from, to]` (inclusive), sorted by date. */
export function useEventsInRange(from: string, to: string): HealthEvent[] {
  return (
    useLiveQuery(
      () => db.events.where('date').between(from, to, true, true).sortBy('date'),
      [from, to],
    ) ?? []
  );
}

/**
 * Live HealthEvent by id, or null when absent. `undefined` while the first
 * query resolves and whenever `id` is omitted, so callers can branch on the
 * loading/no-id window separately from the not-found case.
 */
export function useEvent(id?: string): HealthEvent | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.events.get(id)) ?? null) : undefined), [id]);
}

/** Live list of all symptoms (presets + personalizados). */
export function useSymptoms(): Symptom[] {
  return useLiveQuery(() => db.symptoms.toArray(), []) ?? [];
}

/** Live list of medications. */
export function useMedications(): Medication[] {
  return useLiveQuery(() => db.medications.toArray(), []) ?? [];
}

/** Live reminder settings, falling back to defaults. */
export function useReminders(): ReminderSettings {
  return (
    useLiveQuery(async () => {
      const row = await db.meta.get(META_KEYS.reminders);
      return (row?.value as ReminderSettings | undefined) ?? DEFAULT_REMINDERS;
    }, []) ?? DEFAULT_REMINDERS
  );
}

/** Live local profile, falling back to defaults. */
export function useProfile(): Profile {
  return (
    useLiveQuery(async () => {
      const row = await db.meta.get(META_KEYS.profile);
      return (row?.value as Profile | undefined) ?? DEFAULT_PROFILE;
    }, []) ?? DEFAULT_PROFILE
  );
}
