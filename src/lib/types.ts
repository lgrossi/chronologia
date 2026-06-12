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
}

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
  reminders: ReminderSettings;
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
  getReminders(): Promise<ReminderSettings>;
  putReminders(r: ReminderSettings): Promise<void>;
  getProfile(): Promise<Profile>;
  putProfile(p: Profile): Promise<void>;
  exportAll(): Promise<Backup>;
  importAll(b: Backup): Promise<void>;
}
