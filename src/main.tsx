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
import { initReminders } from '@/lib/reminders';
import { localDayKey } from '@/lib/date';
import type { Reminder } from '@/lib/types';

async function bootstrap(): Promise<void> {
  await seedIfEmpty();

  // The foreground nudge is surfaced in-app by the React shell (App.tsx), which
  // listens for `chronologia:reminder` and shows a toast — see reminders.ts
  // §FOREGROUND-NUDGE CONTRACT.

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
  const arm = (reminders: Reminder[]) =>
    initReminders(reminders, { isTodayLogged: () => loggedCache });

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
