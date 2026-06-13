/**
 * THE SHARED CONTRACT.
 *
 * Every downstream layer (Dexie repository, screens, selectors) depends on
 * these exact shapes. Changes here ripple everywhere — treat as the API.
 */

export type Severity = 'leve' | 'moderado' | 'grave';
export type Mood = 'bom' | 'neutro' | 'ruim';
export type EventType = 'infusao' | 'exame' | 'consulta' | 'remedio' | 'resultado' | 'outro';

export interface Symptom {
  id: string;
  name: string;
  isPreset: boolean;
  archived: boolean;
}

export interface Medication {
  id: string;
  name: string;
  intervalDays: number;
}

export interface SymptomEntry {
  name: string;
  severity: Severity;
}

export interface DayLog {
  date: string;
  mood: Mood;
  overallSeverity: Severity | null;
  waveCount: number;
  symptoms: SymptomEntry[];
  note?: string;
}

export interface HealthEvent {
  id: string;
  date: string;
  type: EventType;
  medicationId?: string;
  remindNextDoseDays?: number;
  attachments?: Blob[];
  note?: string;
  /**
   * Confirmation state. A future-dated event is created with `done: false` — it
   * acts as a reminder until confirmed. `done: false` once its date passes ⇒
   * "confirmar". Past/today events are logged with `done: true` (already
   * happened). Absent (legacy) is treated as done.
   */
  done?: boolean;
}

/**
 * A single reminder. `kind: 'day'` is the once-a-day "registrar o dia" nudge
 * (suppressed once the day is logged); `kind: 'custom'` is any other daily
 * reminder — a medicine, water, a stretch, anything — checked off per day,
 * optionally linked to a Medication.
 */
export type ReminderKind = 'day' | 'custom';
export interface Reminder {
  id: string;
  kind: ReminderKind;
  label: string;
  time: string; // HH:mm, device-local
  enabled: boolean;
  medicationId?: string;
}

/** One per-day check-off: reminder `reminderId` was marked done on `date`. */
export interface ReminderLogEntry {
  id: string; // `${date}|${reminderId}`
  date: string; // yyyy-mm-dd, device-local
  reminderId: string;
}

/** Legacy single-reminder shape, kept only to migrate old stored data. */
export interface ReminderSettings {
  dailyEnabled: boolean;
  dailyTime: string;
}

export interface Profile {
  name: string;
  condition: string;
  sinceYear: number;
  email?: string;
  /** First-run gate: false until onboarding completes. */
  onboarded: boolean;
}

export interface Backup {
  version: number;
  exportedAt: string;
  days: DayLog[];
  events: HealthEvent[];
  symptoms: Symptom[];
  medications: Medication[];
  reminders: Reminder[];
  reminderLog: ReminderLogEntry[];
  profile: Profile;
}

export interface Repository {
  getDay(date: string): Promise<DayLog | null>;
  putDay(log: DayLog): Promise<void>;
  daysInRange(from: string, to: string): Promise<DayLog[]>;
  listEvents(from: string, to: string): Promise<HealthEvent[]>;
  getEvent(id: string): Promise<HealthEvent | null>;
  putEvent(e: HealthEvent): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  listSymptoms(): Promise<Symptom[]>;
  putSymptom(s: Symptom): Promise<void>;
  listMedications(): Promise<Medication[]>;
  putMedication(m: Medication): Promise<void>;
  deleteMedication(id: string): Promise<void>;
  getReminders(): Promise<Reminder[]>;
  putReminders(r: Reminder[]): Promise<void>;
  getDoneReminderIds(date: string): Promise<string[]>;
  setReminderDone(date: string, reminderId: string, done: boolean): Promise<void>;
  getProfile(): Promise<Profile>;
  putProfile(p: Profile): Promise<void>;
  exportAll(): Promise<Backup>;
  importAll(b: Backup): Promise<void>;
}
