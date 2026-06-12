/**
 * Dexie (IndexedDB) schema for Chronologia. This is the only place that knows
 * about IndexedDB; everything above it speaks the `Repository` interface.
 *
 * `meta` is a tiny key/value table holding the singletons (reminders, profile)
 * that have no natural collection — one row each, addressed by a fixed key.
 */
import Dexie, { type Table } from 'dexie';
import type {
  DayLog,
  HealthEvent,
  Medication,
  Profile,
  ReminderSettings,
  Symptom,
} from '@/lib/types';

/** A row in the `meta` key/value table. */
export interface MetaRow {
  key: string;
  value: ReminderSettings | Profile;
}

export const META_KEYS = {
  reminders: 'reminders',
  profile: 'profile',
} as const;

export class ChronologiaDB extends Dexie {
  days!: Table<DayLog, string>;
  events!: Table<HealthEvent, string>;
  symptoms!: Table<Symptom, string>;
  medications!: Table<Medication, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('chronologia');
    // Index `events.date` so range queries (listEvents) hit an index, and
    // `events.type` so we can find the latest infusion for cycleStatus.
    this.version(1).stores({
      days: 'date',
      events: 'id, date, type',
      symptoms: 'id',
      medications: 'id',
      meta: 'key',
    });
  }
}

export const db = new ChronologiaDB();
