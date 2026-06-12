import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { liveQuery } from 'dexie';
import App from './App';
import './index.css';

import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/800.css';

import { repo } from '@/data/repo';
import { seedIfEmpty } from '@/data/seed';
import { initReminders, type ReminderNudge } from '@/lib/reminders';
import { localDayKey } from '@/lib/date';
import type { ReminderSettings } from '@/lib/types';

/**
 * Foreground-nudge contract (see reminders.ts §INTEGRATION). The CustomEvent
 * always fires when a daily reminder is due; a native Notification also fires
 * when permission is granted. We listen so the nudge is observable in-app even
 * without OS permission; the native Notification (when granted) is the visible
 * prompt and is handled inside the reminders module.
 */
function wireReminderNudge(): void {
  window.addEventListener('chronologia:reminder', (e) => {
    const { dayKey } = (e as CustomEvent<ReminderNudge>).detail;
    if (dayKey !== localDayKey()) return; // ignore stale-day events
  });
}

async function bootstrap(): Promise<void> {
  await seedIfEmpty();
  wireReminderNudge();

  // initReminders' isTodayLogged hook is synchronous; back it with a small
  // cache refreshed on tab focus so a nudge never nags after today is logged.
  let loggedCache = (await repo.getDay(localDayKey())) !== null;
  const refreshLogged = async () => {
    loggedCache = (await repo.getDay(localDayKey())) !== null;
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshLogged();
  });

  // initReminders is idempotent and best-effort; re-arming detaches the prior
  // listener first, so re-running it on every settings change is safe.
  const arm = (settings: ReminderSettings) =>
    initReminders(settings, { isTodayLogged: () => loggedCache });

  arm(await repo.getReminders());

  // Re-arm whenever reminder settings change (e.g. edited in Perfil).
  liveQuery(() => repo.getReminders()).subscribe({
    next: arm,
    error: () => {
      /* best-effort: a failed re-arm leaves the prior arming in place */
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

void bootstrap();
