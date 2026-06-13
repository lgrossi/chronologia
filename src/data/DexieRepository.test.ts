/**
 * Data-layer round-trip tests. This is the v1 durability story: these tests
 * exist to catch backup/restore corruption — the exportAll→importAll→exportAll
 * identity is the load-bearing invariant.
 *
 * `fake-indexeddb/auto` must be imported before anything that touches Dexie so
 * the global IndexedDB exists when the shared `db` singleton is constructed.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Backup,
  DayLog,
  HealthEvent,
  Medication,
  Profile,
  Reminder,
  Symptom,
} from '@/lib/types';
import { db } from './db';
import {
  DEFAULT_PROFILE,
  DEFAULT_REMINDERS,
  DexieRepository,
} from './DexieRepository';
import { seedIfEmpty } from './seed';

let repo: DexieRepository;

// Each test gets a pristine store: close the shared singleton's connection,
// delete the underlying IndexedDB, then reopen empty. This guarantees no state
// bleeds between tests even though `db` and `seedIfEmpty` share one instance.
async function freshDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await freshDb();
  repo = new DexieRepository(db);
});

afterEach(() => {
  db.close();
});

function makeDay(date: string, overrides: Partial<DayLog> = {}): DayLog {
  return {
    date,
    mood: 'neutro',
    overallSeverity: 'leve',
    waveCount: 2,
    symptoms: [
      { name: 'diarreia', severity: 'moderado' },
      { name: 'gases', severity: 'leve' },
    ],
    note: 'um dia comum',
    ...overrides,
  };
}

function makeEvent(id: string, date: string, overrides: Partial<HealthEvent> = {}): HealthEvent {
  return {
    id,
    date,
    type: 'infusao',
    medicationId: 'infliximabe',
    remindNextDoseDays: 56,
    note: 'infusão na clínica',
    ...overrides,
  };
}

describe('DayLog put/get', () => {
  it('round-trips a DayLog deep-equal through putDay/getDay', async () => {
    const day = makeDay('2026-01-15');
    await repo.putDay(day);
    expect(await repo.getDay('2026-01-15')).toEqual(day);
  });

  it('returns null for an absent day', async () => {
    expect(await repo.getDay('1999-12-31')).toBeNull();
  });

  it('daysInRange filters inclusively on both bounds and sorts by date', async () => {
    await repo.putDay(makeDay('2026-01-01'));
    await repo.putDay(makeDay('2026-01-10'));
    await repo.putDay(makeDay('2026-01-20'));
    await repo.putDay(makeDay('2026-02-01'));

    const inRange = await repo.daysInRange('2026-01-10', '2026-01-20');

    // Inclusive on both ends: 01-10 and 01-20 are kept, 01-01 and 02-01 dropped.
    expect(inRange.map((d) => d.date)).toEqual(['2026-01-10', '2026-01-20']);
  });
});

describe('HealthEvent put/list/delete', () => {
  it('round-trips an event and lists it within range', async () => {
    const event = makeEvent('e1', '2026-03-05');
    await repo.putEvent(event);

    const listed = await repo.listEvents('2026-03-01', '2026-03-31');
    expect(listed).toEqual([event]);
  });

  it('listEvents range-filters inclusively and sorts by date', async () => {
    await repo.putEvent(makeEvent('a', '2026-03-01', { type: 'exame' }));
    await repo.putEvent(makeEvent('b', '2026-03-15', { type: 'consulta' }));
    await repo.putEvent(makeEvent('c', '2026-04-01', { type: 'resultado' }));

    const listed = await repo.listEvents('2026-03-01', '2026-03-15');
    expect(listed.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('getEvent returns the stored event and null for a missing id', async () => {
    const event = makeEvent('e1', '2026-03-05');
    await repo.putEvent(event);

    expect(await repo.getEvent('e1')).toEqual(event);
    expect(await repo.getEvent('nope')).toBeNull();
  });

  it('putEvent on an existing id updates in place without duplicating', async () => {
    await repo.putEvent(makeEvent('e1', '2026-03-05', { note: 'antes' }));
    await repo.putEvent(makeEvent('e1', '2026-03-05', { note: 'depois', type: 'consulta' }));

    // The update overwrites the row: one event, with the new fields.
    const listed = await repo.listEvents('2026-03-01', '2026-03-31');
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(makeEvent('e1', '2026-03-05', { note: 'depois', type: 'consulta' }));
  });

  it('changing an event date moves it across listEvents and daysInRange windows', async () => {
    await repo.putEvent(makeEvent('e1', '2026-03-05'));
    // It is in March, not April.
    expect((await repo.listEvents('2026-03-01', '2026-03-31')).map((e) => e.id)).toEqual(['e1']);
    expect(await repo.listEvents('2026-04-01', '2026-04-30')).toEqual([]);

    // Re-put the same id on an April date.
    await repo.putEvent(makeEvent('e1', '2026-04-10'));

    // Still a single row, now found in April and gone from March.
    expect(await repo.listEvents('2026-03-01', '2026-03-31')).toEqual([]);
    expect((await repo.listEvents('2026-04-01', '2026-04-30')).map((e) => e.id)).toEqual(['e1']);
  });

  it('deleteEvent removes only the targeted event', async () => {
    await repo.putEvent(makeEvent('keep', '2026-05-01'));
    await repo.putEvent(makeEvent('drop', '2026-05-02'));

    await repo.deleteEvent('drop');

    const remaining = await repo.listEvents('2026-05-01', '2026-05-31');
    expect(remaining.map((e) => e.id)).toEqual(['keep']);
  });
});

describe('Symptom and Medication lists', () => {
  it('round-trips symptoms through putSymptom/listSymptoms', async () => {
    const custom: Symptom = { id: 'enxaqueca', name: 'enxaqueca', isPreset: false, archived: false };
    await repo.putSymptom(custom);
    expect(await repo.listSymptoms()).toEqual([custom]);
  });

  it('putSymptom on the same id overwrites rather than duplicating', async () => {
    await repo.putSymptom({ id: 'gases', name: 'gases', isPreset: true, archived: false });
    await repo.putSymptom({ id: 'gases', name: 'gases', isPreset: true, archived: true });

    const symptoms = await repo.listSymptoms();
    expect(symptoms).toEqual([{ id: 'gases', name: 'gases', isPreset: true, archived: true }]);
  });

  it('round-trips medications through putMedication/listMedications', async () => {
    const med: Medication = { id: 'infliximabe', name: 'Infliximabe', intervalDays: 56 };
    await repo.putMedication(med);
    expect(await repo.listMedications()).toEqual([med]);
  });

  it('deleteMedication removes only the targeted medication', async () => {
    await repo.putMedication({ id: 'infliximabe', name: 'Infliximabe', intervalDays: 56 });
    await repo.putMedication({ id: 'azatioprina', name: 'Azatioprina', intervalDays: 1 });

    await repo.deleteMedication('azatioprina');

    expect((await repo.listMedications()).map((m) => m.id)).toEqual(['infliximabe']);
  });
});

describe('Reminders and Profile singletons', () => {
  it('getReminders returns defaults on an empty db', async () => {
    expect(await repo.getReminders()).toEqual(DEFAULT_REMINDERS);
  });

  it('getProfile returns defaults on an empty db', async () => {
    expect(await repo.getProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('default profile is empty and not onboarded (the first-run gate)', async () => {
    const profile = await repo.getProfile();
    expect(profile.name).toBe('');
    expect(profile.onboarded).toBe(false);
  });

  it('round-trips an onboarded profile so the gate flips persistently', async () => {
    const onboarded: Profile = {
      name: 'Ana',
      condition: 'Crohn',
      sinceYear: 2019,
      onboarded: true,
    };
    await repo.putProfile(onboarded);
    expect(await repo.getProfile()).toEqual(onboarded);
  });

  it('round-trips a multi-reminder list', async () => {
    const reminders: Reminder[] = [
      { id: 'day-log', kind: 'day', label: 'Registrar o dia', time: '07:30', enabled: false },
      { id: 'm1', kind: 'custom', label: 'Azatioprina', time: '09:00', enabled: true, medicationId: 'aza' },
    ];
    await repo.putReminders(reminders);
    expect(await repo.getReminders()).toEqual(reminders);
  });

  it('migrates a legacy single-reminder shape to one day reminder', async () => {
    await db.meta.put({ key: 'reminders', value: { dailyEnabled: true, dailyTime: '08:00' } });
    const migrated = await repo.getReminders();
    expect(migrated).toEqual([
      { id: 'day-log', kind: 'day', label: 'Registrar o dia', time: '08:00', enabled: true },
    ]);
  });

  it('records and clears per-day reminder check-offs', async () => {
    await repo.setReminderDone('2026-06-10', 'm1', true);
    await repo.setReminderDone('2026-06-10', 'm2', true);
    expect((await repo.getDoneReminderIds('2026-06-10')).sort()).toEqual(['m1', 'm2']);
    expect(await repo.getDoneReminderIds('2026-06-11')).toEqual([]);
    await repo.setReminderDone('2026-06-10', 'm1', false);
    expect(await repo.getDoneReminderIds('2026-06-10')).toEqual(['m2']);
  });

  it('round-trips a custom profile including optional email', async () => {
    const profile: Profile = {
      name: 'Ana Maria',
      condition: 'Crohn',
      sinceYear: 2019,
      email: 'ana@example.com',
      onboarded: true,
    };
    await repo.putProfile(profile);
    expect(await repo.getProfile()).toEqual(profile);
  });
});

describe('exportAll / importAll identity', () => {
  it('export → wipe → import → export reproduces the same backup', async () => {
    // Seed every table with non-default content so a dropped or mangled table
    // would change the second export.
    await repo.putDay(makeDay('2026-01-01', { mood: 'bom', note: undefined }));
    await repo.putDay(makeDay('2026-01-02', { overallSeverity: null, symptoms: [] }));
    await repo.putEvent(makeEvent('ev1', '2026-01-01'));
    await repo.putEvent(
      makeEvent('ev2', '2026-01-15', { type: 'remedio', medicationId: undefined, remindNextDoseDays: undefined, note: undefined }),
    );
    await repo.putSymptom({ id: 'diarreia', name: 'diarreia', isPreset: true, archived: false });
    await repo.putSymptom({ id: 'enxaqueca', name: 'enxaqueca', isPreset: false, archived: true });
    await repo.putMedication({ id: 'infliximabe', name: 'Infliximabe', intervalDays: 56 });
    await repo.putReminders([
      { id: 'day-log', kind: 'day', label: 'Registrar o dia', time: '06:15', enabled: false },
      { id: 'm1', kind: 'custom', label: 'Azatioprina', time: '09:00', enabled: true },
    ]);
    await repo.setReminderDone('2026-01-01', 'm1', true);
    await repo.putProfile({ name: 'Ana', condition: 'Crohn', sinceYear: 2020, email: 'ana@x.com', onboarded: true });

    const first = await repo.exportAll();

    // Fresh store, then restore from the backup.
    await freshDb();
    repo = new DexieRepository(db);

    await repo.importAll(first);
    const second = await repo.exportAll();

    // exportedAt is wall-clock and intentionally allowed to differ; everything
    // else must survive the round-trip byte-for-byte.
    expect(stripExportedAt(second)).toEqual(stripExportedAt(first));
  });

  it('importAll replaces existing content rather than merging', async () => {
    // Pre-existing rows that are NOT in the backup must be gone after import.
    await repo.putDay(makeDay('2099-09-09'));
    await repo.putEvent(makeEvent('stale', '2099-09-09'));

    const backup: Backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      days: [makeDay('2026-06-01')],
      events: [makeEvent('fresh', '2026-06-01')],
      symptoms: [{ id: 'gases', name: 'gases', isPreset: true, archived: false }],
      medications: [{ id: 'infliximabe', name: 'Infliximabe', intervalDays: 56 }],
      reminders: [{ id: 'day-log', kind: 'day', label: 'Registrar o dia', time: '20:00', enabled: true }],
      reminderLog: [],
      profile: { name: 'Ana', condition: 'Crohn', sinceYear: 2021, onboarded: true },
    };

    await repo.importAll(backup);

    expect(await repo.getDay('2099-09-09')).toBeNull();
    expect(await repo.listEvents('2099-01-01', '2099-12-31')).toEqual([]);
    expect(await repo.getDay('2026-06-01')).toEqual(backup.days[0]);
    expect((await repo.listEvents('2026-06-01', '2026-06-30')).map((e) => e.id)).toEqual(['fresh']);
  });

  it('round-trip preserves the onboarded gate so a restored backup never re-runs onboarding', async () => {
    // Targeted regression for the first-run gate specifically: if importAll
    // dropped or reset profile.onboarded, a restore would bounce the user back
    // into onboarding. The broad identity test would catch a wholesale profile
    // loss, but this pins the single boolean that gates the whole app.
    await repo.putProfile({
      name: 'Ana',
      condition: 'Crohn',
      sinceYear: 2020,
      email: 'ana@x.com',
      onboarded: true,
    });

    const backup = await repo.exportAll();
    expect(backup.profile.onboarded).toBe(true);

    await freshDb();
    repo = new DexieRepository(db);
    // Sanity: the fresh store is back to the not-onboarded default.
    expect((await repo.getProfile()).onboarded).toBe(false);

    await repo.importAll(backup);

    expect((await repo.getProfile()).onboarded).toBe(true);
  });
});

function stripExportedAt(b: Backup): Omit<Backup, 'exportedAt'> {
  const { exportedAt, ...rest } = b;
  void exportedAt;
  return rest;
}

describe('seedIfEmpty idempotency', () => {
  it('seeds only the 6 preset symptoms — no medication, no profile', async () => {
    await seedIfEmpty();

    const symptoms = await repo.listSymptoms();
    const medications = await repo.listMedications();

    expect(symptoms).toHaveLength(6);
    expect(symptoms.every((s) => s.isPreset && !s.archived)).toBe(true);
    expect(symptoms.map((s) => s.name).sort()).toEqual(
      ['cansaço', 'diarreia', 'gases', 'intestino ativo', 'náusea', 'pontadas'].sort(),
    );

    // A fresh device starts with no medication; onboarding collects it.
    expect(medications).toEqual([]);
    // The seed must not pre-onboard a profile.
    expect((await repo.getProfile()).onboarded).toBe(false);
  });

  it('does not duplicate presets when called twice', async () => {
    await seedIfEmpty();
    await seedIfEmpty();

    expect(await repo.listSymptoms()).toHaveLength(6);
    expect(await repo.listMedications()).toEqual([]);
  });
});
