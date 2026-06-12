/**
 * First-run seed. Idempotent: if any symptoms already exist we assume the seed
 * ran and do nothing, so calling this on every app init is safe.
 *
 * Seeds the six preset symptoms (the Registro checklist) and the primary
 * medication, Infliximabe on an 8-week (56-day) cycle — the anchor for
 * `cycleStatus`. The "dia 6 · faltam 22" / 28-day numbers in the prototype are
 * mock; the real cycle is 56 days.
 */
import type { Medication, Symptom } from '@/lib/types';
import { db } from './db';

const PRESET_SYMPTOMS: readonly string[] = [
  'diarreia',
  'pontadas',
  'gases',
  'cansaço',
  'intestino ativo',
  'náusea',
];

const PRIMARY_MEDICATION: Medication = {
  id: 'infliximabe',
  name: 'Infliximabe',
  intervalDays: 56,
};

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.symptoms.count();
  if (existing > 0) return;

  const symptoms: Symptom[] = PRESET_SYMPTOMS.map((name) => ({
    id: name,
    name,
    isPreset: true,
    archived: false,
  }));

  await db.transaction('rw', db.symptoms, db.medications, async () => {
    await db.symptoms.bulkPut(symptoms);
    await db.medications.put(PRIMARY_MEDICATION);
  });
}
