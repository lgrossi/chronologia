/**
 * Best-effort reminder support for a device-only PWA (Android Chrome).
 *
 * HONEST LIMITS — read before relying on this:
 * A device-only PWA *cannot* guarantee an exact daily local notification. The
 * web platform has no reliable "fire at 20:00 every day" primitive:
 *   - `setTimeout`/`setInterval` die when the tab is backgrounded or the OS
 *     evicts the page; they never survive a real app close.
 *   - The Notifications API can only show a notification while some JS context
 *     (page or service worker) is awake — it cannot wake the device on its own.
 *   - `periodicSync` (Background Periodic Sync) is best-effort, Chromium-only,
 *     gated on PWA install + engagement heuristics, and the browser picks the
 *     interval — you cannot pin it to a clock time.
 * GUARANTEED daily reminders come later with server-side Web Push (the Supabase
 * step): a push server wakes the service worker at the scheduled time even when
 * the app is closed. Until then this module degrades gracefully.
 *
 * WHAT THIS DOES instead: a FOREGROUND NUDGE. Whenever the app comes to the
 * foreground (or `initReminders` is called), if reminders are enabled, the
 * current time is at/after today's `dailyTime`, and today has not been logged,
 * we emit one nudge — as a Notification when permission is granted, and always
 * as a `CustomEvent('chronologia:reminder')` on `window` so the running UI can
 * surface an in-app prompt regardless of OS permission.
 *
 * FOREGROUND-NUDGE CONTRACT (for integration / the screens layer):
 *   - Provide `isTodayLogged: () => boolean` so we never nag after a log.
 *     Omit it and every due check counts as "not logged".
 *   - Listen for the nudge:
 *       window.addEventListener('chronologia:reminder', (e) => {
 *         const { text } = (e as CustomEvent<ReminderNudge>).detail;
 *         // show an in-app banner / route to the log screen
 *       });
 *   - Re-arm on settings change by calling `initReminders(settings, opts)`
 *     again; the previous foreground listener is detached first (idempotent).
 *   - At most one nudge fires per local calendar day (deduped in-memory).
 *
 * Dependency-free. No throws on unsupported APIs — every platform call is
 * guarded so this is safe to import and call anywhere, including SSR/build.
 */
import type { Medication, Reminder } from './types';
import { daysBetween, localDayKey } from './date';

const REMINDER_EVENT = 'chronologia:reminder';

/** Payload carried by the `chronologia:reminder` CustomEvent. */
export interface ReminderNudge {
  /** Human-readable pt-BR nudge text the UI can show verbatim. */
  text: string;
  /** Day-key (`yyyy-mm-dd`) the nudge is for. */
  dayKey: string;
}

/** Options wiring the foreground nudge to app state. */
export interface InitReminderOptions {
  /**
   * Returns whether today already has a DayLog. When true, no nudge fires.
   * Integration supplies this (e.g. from `repo`/hooks); omitting it treats
   * every due window as un-logged.
   */
  isTodayLogged?: () => boolean;
  /** pt-BR copy for the daily nudge. Defaults to the standard reminder line. */
  dailyText?: string;
}

const DEFAULT_DAILY_TEXT = 'Como você está hoje? Toque para registrar seu dia.';

const hasWindow = (): boolean => typeof window !== 'undefined';
const hasNotification = (): boolean =>
  hasWindow() && typeof Notification !== 'undefined';

/**
 * Ask the OS for notification permission. Resolves to the resulting state, or
 * `'denied'` on platforms without the Notification API (never rejects).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!hasNotification()) return 'denied';
  try {
    // Some browsers resolve the returned promise; older Safari uses a callback.
    return await Notification.requestPermission();
  } catch {
    return Notification.permission ?? 'denied';
  }
}

/** True only when notifications are currently granted. */
export function isNotificationGranted(): boolean {
  return hasNotification() && Notification.permission === 'granted';
}

/** Parse `HH:mm` into minutes-since-midnight; null if malformed. */
function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since local midnight for `now`. */
function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Whether a reminder is due right now: enabled, a valid time, and the local
 * clock is at/after that time. Exported for unit testing without platform APIs.
 */
export function isReminderDue(r: Reminder, now: Date = new Date()): boolean {
  if (!r.enabled) return false;
  const due = parseTimeToMinutes(r.time);
  if (due === null) return false;
  return nowMinutes(now) >= due;
}

/** pt-BR nudge text for a reminder (generic — a custom reminder may be anything). */
function nudgeText(r: Reminder, opts: InitReminderOptions): string {
  if (r.kind === 'day') return opts.dailyText ?? DEFAULT_DAILY_TEXT;
  return r.label.trim() ? `Lembrete: ${r.label.trim()}` : 'Você tem um lembrete.';
}

// Per-reminder guard so each reminder nudges at most once per local day.
const lastNudged = new Map<string, string>();
// The currently-attached foreground listener, so re-init can detach it.
let foregroundHandler: (() => void) | null = null;

function emitNudge(reminderId: string, text: string, dayKey: string): void {
  if (!hasWindow()) return;
  if (lastNudged.get(reminderId) === dayKey) return;
  lastNudged.set(reminderId, dayKey);

  if (isNotificationGranted()) {
    try {
      new Notification('Chronologia', { body: text, tag: `${reminderId}-${dayKey}` });
    } catch {
      // Constructing Notification can throw on some mobile browsers that only
      // allow ServiceWorkerRegistration.showNotification — fall through to the
      // CustomEvent so the in-app nudge still reaches the UI.
    }
  }

  window.dispatchEvent(
    new CustomEvent<ReminderNudge>(REMINDER_EVENT, { detail: { text, dayKey } }),
  );
}

function maybeNudgeAll(reminders: Reminder[], opts: InitReminderOptions): void {
  const dayKey = localDayKey();
  for (const r of reminders) {
    if (!isReminderDue(r)) continue;
    // The day-log nudge is suppressed once today is logged; med reminders fire
    // regardless (taking a pill is independent of logging the day).
    if (r.kind === 'day' && opts.isTodayLogged?.() === true) continue;
    emitNudge(r.id, nudgeText(r, opts), dayKey);
  }
}

/**
 * Best-effort periodic background sync registration. Guarded and silent: many
 * browsers lack `periodicSync`, and `register` rejects unless the PWA is
 * installed and the permission is granted. We never surface failures — this is
 * a bonus wakeup path on top of the foreground nudge, not a guarantee.
 */
function tryRegisterPeriodicSync(): void {
  if (!hasWindow() || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      const periodicSync = (reg as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
      }).periodicSync;
      if (!periodicSync) return;
      // Browser ultimately decides the cadence; ~daily is the most we can ask.
      return periodicSync.register('chronologia-daily-reminder', {
        minInterval: 24 * 60 * 60 * 1000,
      });
    })
    .catch(() => {
      // periodicSync unavailable / not permitted — expected on most devices.
    });
}

/**
 * Best-effort: arm the daily reminder. Idempotent — re-call after a settings
 * change to re-arm (the prior foreground listener is detached first).
 *
 * When enabled it (a) checks immediately in case the app opened past the due
 * time, (b) re-checks each time the app returns to the foreground
 * (`visibilitychange` → visible), and (c) attempts a periodic background sync
 * registration as a bonus wakeup path. When disabled it tears the listener down.
 */
export function initReminders(reminders: Reminder[], opts: InitReminderOptions = {}): void {
  if (!hasWindow()) return;

  if (foregroundHandler) {
    document.removeEventListener('visibilitychange', foregroundHandler);
    foregroundHandler = null;
  }

  if (!reminders.some((r) => r.enabled)) return;

  foregroundHandler = () => {
    if (document.visibilityState === 'visible') maybeNudgeAll(reminders, opts);
  };
  document.addEventListener('visibilitychange', foregroundHandler);

  maybeNudgeAll(reminders, opts);
  tryRegisterPeriodicSync();
}

/**
 * pt-BR text for the next-dose reminder of a medication, given the date-key of
 * the last infusion. Mirrors `selectors.cycleStatus` timing semantics: due in
 * `intervalDays − daysSince` days. Speaks plainly about today / overdue cases.
 *
 * `lastInfusionDate` is a `yyyy-mm-dd` day-key (or null when none recorded).
 */
export function nextDoseReminderText(med: Medication, lastInfusionDate: string | null): string {
  if (!lastInfusionDate || med.intervalDays <= 0) {
    return `Sem próxima dose de ${med.name} agendada.`;
  }
  const daysSince = Math.max(0, daysBetween(lastInfusionDate, localDayKey()));
  const daysLeft = med.intervalDays - daysSince;

  if (daysLeft > 1) return `Próxima dose de ${med.name} em ${daysLeft} dias.`;
  if (daysLeft === 1) return `Próxima dose de ${med.name} amanhã.`;
  if (daysLeft === 0) return `Dose de ${med.name} é hoje.`;
  const overdue = -daysLeft;
  if (overdue === 1) return `Dose de ${med.name} está atrasada 1 dia.`;
  return `Dose de ${med.name} está atrasada ${overdue} dias.`;
}
