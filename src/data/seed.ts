/**
 * First-run seed. Idempotent: if any symptoms already exist we assume the seed
 * ran and do nothing, so calling this on every app init is safe.
 *
 * Seeds ONLY the six preset symptoms (the Registro checklist). A fresh device
 * starts with no medication and a not-onboarded empty profile — onboarding
 * collects the person's name, condition, and first medication.
 */
import type { Symptom } from '@/lib/types';
import { db } from './db';

const PRESET_SYMPTOMS: readonly string[] = [
  'diarreia',
  'pontadas',
  'gases',
  'cansaço',
  'intestino ativo',
  'náusea',
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.symptoms.count();
  if (existing > 0) return;

  const symptoms: Symptom[] = PRESET_SYMPTOMS.map((name) => ({
    id: name,
    name,
    isPreset: true,
    archived: false,
  }));

  await db.symptoms.bulkPut(symptoms);
}
