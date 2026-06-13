/**
 * The v1 Repository: IndexedDB via Dexie. The whole app reads and writes
 * through this seam, so swapping in a `SupabaseRepository` later needs no UI
 * change.
 *
 * Reminder/profile singletons live in the `meta` key/value table with the
 * defaults below applied on read when absent. `exportAll`/`importAll` are exact
 * inverses: import clears every table, then bulk-puts the backup verbatim, so
 * `importAll(await exportAll())` is the identity.
 */
import type {
  Backup,
  DayLog,
  HealthEvent,
  Medication,
  Profile,
  Reminder,
  ReminderSettings,
  Repository,
  Symptom,
} from '@/lib/types';
import { ChronologiaDB, META_KEYS, db as sharedDb } from './db';

/** The id of the canonical once-a-day "registrar o dia" reminder (singleton). */
export const DAY_REMINDER_ID = 'day-log';

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: DAY_REMINDER_ID, kind: 'day', label: 'Registrar o dia', time: '21:00', enabled: true },
];

/**
 * Coerce whatever is stored under the reminders key into a Reminder[]. Handles:
 * a current array (returned as-is), the legacy single {dailyEnabled,dailyTime}
 * shape (migrated to one day reminder), and anything else (defaults). Pure so
 * the repo and the live hook share one migration path.
 */
export function normalizeReminders(value: unknown): Reminder[] {
  if (Array.isArray(value)) return value as Reminder[];
  if (value && typeof value === 'object' && 'dailyTime' in value) {
    const legacy = value as ReminderSettings;
    return [
      {
        id: DAY_REMINDER_ID,
        kind: 'day',
        label: 'Registrar o dia',
        time: legacy.dailyTime,
        enabled: legacy.dailyEnabled,
      },
    ];
  }
  return DEFAULT_REMINDERS;
}

/**
 * The default profile returned before onboarding: empty and not yet onboarded,
 * which gates first-run onboarding. `sinceYear` defaults to the device-local
 * current year so the onboarding form starts on a sensible value.
 */
export const DEFAULT_PROFILE: Profile = {
  name: '',
  condition: 'Crohn',
  sinceYear: new Date().getFullYear(),
  email: undefined,
  onboarded: false,
};

const BACKUP_VERSION = 1;

export class DexieRepository implements Repository {
  private readonly db: ChronologiaDB;

  constructor(database: ChronologiaDB = sharedDb) {
    this.db = database;
  }

  async getDay(date: string): Promise<DayLog | null> {
    return (await this.db.days.get(date)) ?? null;
  }

  async putDay(log: DayLog): Promise<void> {
    await this.db.days.put(log);
  }

  async daysInRange(from: string, to: string): Promise<DayLog[]> {
    // Day-keys are zero-padded yyyy-mm-dd, so lexicographic range = date range.
    return this.db.days.where('date').between(from, to, true, true).sortBy('date');
  }

  async listEvents(from: string, to: string): Promise<HealthEvent[]> {
    return this.db.events.where('date').between(from, to, true, true).sortBy('date');
  }

  async getEvent(id: string): Promise<HealthEvent | null> {
    return (await this.db.events.get(id)) ?? null;
  }

  async putEvent(e: HealthEvent): Promise<void> {
    await this.db.events.put(e);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.db.events.delete(id);
  }

  async listSymptoms(): Promise<Symptom[]> {
    return this.db.symptoms.toArray();
  }

  async putSymptom(s: Symptom): Promise<void> {
    await this.db.symptoms.put(s);
  }

  async listMedications(): Promise<Medication[]> {
    return this.db.medications.toArray();
  }

  async putMedication(m: Medication): Promise<void> {
    await this.db.medications.put(m);
  }

  async deleteMedication(id: string): Promise<void> {
    await this.db.medications.delete(id);
  }

  async getReminders(): Promise<Reminder[]> {
    const row = await this.db.meta.get(META_KEYS.reminders);
    return normalizeReminders(row?.value);
  }

  async putReminders(r: Reminder[]): Promise<void> {
    await this.db.meta.put({ key: META_KEYS.reminders, value: r });
  }

  async getProfile(): Promise<Profile> {
    const row = await this.db.meta.get(META_KEYS.profile);
    return (row?.value as Profile | undefined) ?? DEFAULT_PROFILE;
  }

  async putProfile(p: Profile): Promise<void> {
    await this.db.meta.put({ key: META_KEYS.profile, value: p });
  }

  async exportAll(): Promise<Backup> {
    const [days, events, symptoms, medications, reminders, profile] = await Promise.all([
      this.db.days.toArray(),
      this.db.events.toArray(),
      this.db.symptoms.toArray(),
      this.db.medications.toArray(),
      this.getReminders(),
      this.getProfile(),
    ]);
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      days,
      events,
      symptoms,
      medications,
      reminders,
      profile,
    };
  }

  async importAll(b: Backup): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.days, this.db.events, this.db.symptoms, this.db.medications, this.db.meta],
      async () => {
        await Promise.all([
          this.db.days.clear(),
          this.db.events.clear(),
          this.db.symptoms.clear(),
          this.db.medications.clear(),
          this.db.meta.clear(),
        ]);
        await Promise.all([
          this.db.days.bulkPut(b.days),
          this.db.events.bulkPut(b.events),
          this.db.symptoms.bulkPut(b.symptoms),
          this.db.medications.bulkPut(b.medications),
          this.db.meta.bulkPut([
            { key: META_KEYS.reminders, value: b.reminders },
            { key: META_KEYS.profile, value: b.profile },
          ]),
        ]);
      },
    );
  }
}
