/**
 * JSON-safe serialization for the backup file.
 *
 * `HealthEvent.attachments` is `Blob[]`, and `JSON.stringify` turns a Blob into
 * `{}` — every exam photo would be silently lost on a backup round-trip and the
 * restored `[{}]` would still count as a "valid" attachment everywhere. So the
 * on-disk format is NOT the in-memory `Backup`: attachments are base64-encoded
 * out-of-band on export and reconstructed into real Blobs on import.
 *
 * The on-disk shape carries a `format` discriminator so a future change can be
 * detected, and `toBackup` validates the parsed object before it reaches the
 * repository — arbitrary user-supplied JSON must never `bulkPut` garbage.
 */
import type { Backup, HealthEvent } from './types';

/** A Blob encoded for JSON: enough to faithfully reconstruct it. */
interface SerializedBlob {
  name?: string;
  type: string;
  dataBase64: string;
}

/** The on-disk backup file shape (attachments serialized). */
interface BackupFile extends Omit<Backup, 'events'> {
  format: 'chronologia-backup';
  events: Array<Omit<HealthEvent, 'attachments'> & { attachments?: SerializedBlob[] }>;
}

/**
 * Base64-encode a Blob via FileReader's data URL. FileReader is supported across
 * browsers and jsdom, unlike `Blob.arrayBuffer()` which jsdom omits — so the
 * encode path is testable through the same JSON boundary the UI uses.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('unexpected reader result'));
      // result is `data:<type>;base64,<payload>` — keep only the payload.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataBase64: string, type: string): Blob {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Encode an in-memory Backup to the JSON-safe on-disk file shape. */
export async function toBackupFile(backup: Backup): Promise<BackupFile> {
  const events = await Promise.all(
    backup.events.map(async (e) => {
      if (!e.attachments?.length) {
        const { attachments: _drop, ...rest } = e;
        void _drop;
        return rest;
      }
      const attachments = await Promise.all(
        e.attachments.map(async (b) => ({
          type: b.type,
          dataBase64: await blobToBase64(b),
        })),
      );
      return { ...e, attachments };
    }),
  );
  return { ...backup, format: 'chronologia-backup', events };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Validate parsed JSON and reconstruct a real `Backup` (Blobs restored). Throws
 * on a malformed file so the caller's catch surfaces "Arquivo inválido" instead
 * of persisting garbage. The shape check is intentionally shallow but covers the
 * fields the repository bulk-puts (arrays vs objects).
 */
export function toBackup(parsed: unknown): Backup {
  if (!isObject(parsed)) throw new Error('backup: not an object');
  const { version, days, events, symptoms, medications, reminders, profile } = parsed;
  if (typeof version !== 'number') throw new Error('backup: missing version');
  if (!Array.isArray(days)) throw new Error('backup: days not an array');
  if (!Array.isArray(events)) throw new Error('backup: events not an array');
  if (!Array.isArray(symptoms)) throw new Error('backup: symptoms not an array');
  if (!Array.isArray(medications)) throw new Error('backup: medications not an array');
  if (!Array.isArray(reminders)) throw new Error('backup: reminders not an array');
  if (!isObject(profile)) throw new Error('backup: profile not an object');

  const restoredEvents: HealthEvent[] = (events as HealthEvent[]).map((e) => {
    const serialized = (e as { attachments?: SerializedBlob[] }).attachments;
    if (!serialized?.length) {
      const { attachments: _drop, ...rest } = e;
      void _drop;
      return rest;
    }
    return {
      ...e,
      attachments: serialized.map((s) => base64ToBlob(s.dataBase64, s.type)),
    };
  });

  return {
    version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    days: days as Backup['days'],
    events: restoredEvents,
    symptoms: symptoms as Backup['symptoms'],
    medications: medications as Backup['medications'],
    reminders: reminders as Backup['reminders'],
    profile: profile as unknown as Backup['profile'],
  };
}
