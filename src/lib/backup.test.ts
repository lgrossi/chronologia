/**
 * Backup file serialization tests. The bug these guard against: `JSON.stringify`
 * turns a Blob into `{}`, so a naive backup silently loses every attachment and
 * restores `[{}]` garbage. The export path crosses the JSON boundary the real
 * UI uses, so these round-trip through `JSON.stringify`/`JSON.parse` — not just
 * the repo's structured-clone — to catch that exact loss.
 */
import { describe, expect, it } from 'vitest';
import type { Backup } from './types';
import { toBackup, toBackupFile } from './backup';

function baseBackup(overrides: Partial<Backup> = {}): Backup {
  return {
    version: 1,
    exportedAt: '2026-06-01T00:00:00.000Z',
    days: [],
    events: [],
    symptoms: [],
    medications: [],
    reminders: { dailyEnabled: true, dailyTime: '21:00' },
    profile: { name: 'Ana', condition: 'Crohn', sinceYear: 2021 },
    ...overrides,
  };
}

describe('backup attachment round-trip through JSON', () => {
  it('preserves a Blob attachment across stringify/parse', async () => {
    const bytes = new Uint8Array([0xff, 0x00, 0x42, 0x99]);
    const original = new Blob([bytes], { type: 'image/png' });
    const backup = baseBackup({
      events: [{ id: 'e1', date: '2026-06-10', type: 'exame', attachments: [original] }],
    });

    // The on-disk file carries the bytes as base64, NOT the `{}` JSON.stringify
    // would emit for a raw Blob — that empty-object loss is the bug guarded here.
    const file = await toBackupFile(backup);
    const onDisk = JSON.parse(JSON.stringify(file));
    const serialized = onDisk.events[0].attachments[0];
    expect(serialized.type).toBe('image/png');
    expect(atob(serialized.dataBase64)).toBe(String.fromCharCode(...bytes));

    const restored = toBackup(onDisk);
    const att = restored.events[0].attachments;
    expect(att).toHaveLength(1);
    expect(att![0]).toBeInstanceOf(Blob);
    expect(att![0].type).toBe('image/png');
    expect(att![0].size).toBe(bytes.length);
  });

  it('leaves an event without attachments un-attached after round-trip', async () => {
    const backup = baseBackup({
      events: [{ id: 'e2', date: '2026-06-11', type: 'consulta' }],
    });

    const restored = toBackup(JSON.parse(JSON.stringify(await toBackupFile(backup))));

    expect(restored.events[0].attachments).toBeUndefined();
  });
});

describe('toBackup rejects malformed files', () => {
  it('throws when days is not an array', () => {
    expect(() => toBackup({ version: 1, days: {}, events: [], symptoms: [], medications: [], reminders: {}, profile: {} })).toThrow();
  });

  it('throws when version is missing', () => {
    expect(() => toBackup({ days: [], events: [], symptoms: [], medications: [], reminders: {}, profile: {} })).toThrow();
  });

  it('throws on non-object input', () => {
    expect(() => toBackup('nope')).toThrow();
    expect(() => toBackup(null)).toThrow();
  });
});
