/**
 * App shell. Wires the real screens to routes, drives the bottom tab bar from
 * the URL, and hosts the two overlays (Registro / AddEvento) and the toast.
 *
 * Routing is the source of truth for the active tab — clicking a tab navigates,
 * and the active slot is derived from `useLocation`. The Zustand store carries
 * only the overlay and the Linha filter. `/resumo` is the print view: it
 * renders full-screen with no tab bar and no overlays.
 */
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '@/theme/tokens';
import { ToastProvider, ToastHost, useToast } from '@/components/Toast';
import { TabBar } from '@/components/TabBar';
import { useStore, type Tab } from '@/store';
import { localDayKey } from '@/lib/date';
import type { ReminderNudge } from '@/lib/reminders';
import type { Profile } from '@/lib/types';
import { META_KEYS, db } from '@/data/db';
import { Hoje } from '@/screens/Hoje';
import { Linha } from '@/screens/Linha';
import { Tendencias } from '@/screens/Tendencias';
import { Perfil } from '@/screens/Perfil';
import { Resumo } from '@/screens/Resumo';
import { Registro } from '@/screens/Registro';
import { AddEvento } from '@/screens/AddEvento';
import { Onboarding } from '@/screens/Onboarding';

/** Map a pathname to the active tab; everything non-tabbed falls back to Hoje. */
function tabForPath(pathname: string): Tab {
  if (pathname.startsWith('/linha')) return 'linha';
  if (pathname.startsWith('/tendencias')) return 'tendencias';
  if (pathname.startsWith('/perfil')) return 'perfil';
  return 'hoje';
}

const TAB_ROUTE: Record<Tab, string> = {
  hoje: '/',
  linha: '/linha',
  tendencias: '/tendencias',
  perfil: '/perfil',
};

/** Current month as `?month=YYYY-MM` for the doctor-summary deep link. */
function currentMonthQuery(): string {
  return `?month=${localDayKey().slice(0, 7)}`;
}

export default function App() {
  return (
    <ToastProvider>
      <Gate />
    </ToastProvider>
  );
}

/**
 * First-run gate. Reads the stored profile directly (not via useProfile, which
 * substitutes DEFAULT_PROFILE — onboarded:false — while loading and would flash
 * Onboarding at an already-onboarded user). The raw liveQuery is `undefined`
 * until the meta row resolves: that window renders a calm splash, never the
 * main app. Once loaded, an un-onboarded profile gets the full-screen
 * Onboarding with no shell chrome; completing it writes onboarded:true, the
 * liveQuery re-fires, and this flips to the normal shell automatically.
 */
function Gate() {
  const navigate = useNavigate();
  const stored = useLiveQuery(async () => {
    const row = await db.meta.get(META_KEYS.profile);
    return (row?.value as Profile | undefined) ?? null;
  }, []);

  if (stored === undefined) return <Splash />;

  if (!stored?.onboarded) {
    return <Onboarding onDone={() => navigate('/')} />;
  }

  return <Shell />;
}

/** Minimal calm splash shown only while the profile load is in flight. */
function Splash() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: COLORS.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 800,
          color: COLORS.accent,
          letterSpacing: '-0.01em',
        }}
      >
        Chronologia
      </div>
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const setTab = useStore((s) => s.setTab);
  const openRegistro = useStore((s) => s.openRegistro);
  const openEvento = useStore((s) => s.openEvento);

  // Surface the foreground reminder nudge in-app (reminders.ts fires this even
  // when OS notification permission is denied). The toast is the visible prompt;
  // stale-day events are ignored so a backgrounded tab can't nag for yesterday.
  useEffect(() => {
    const onNudge = (e: Event) => {
      const { text, dayKey } = (e as CustomEvent<ReminderNudge>).detail;
      if (dayKey !== localDayKey()) return;
      toast.show(text);
    };
    window.addEventListener('chronologia:reminder', onNudge);
    return () => window.removeEventListener('chronologia:reminder', onNudge);
  }, [toast]);

  // The print view owns the whole viewport: no shell chrome, no overlays.
  if (location.pathname.startsWith('/resumo')) {
    return (
      <Routes>
        <Route path="/resumo" element={<Resumo />} />
      </Routes>
    );
  }

  const active = tabForPath(location.pathname);

  const onTab = (tab: Tab) => {
    setTab(tab);
    navigate(TAB_ROUTE[tab]);
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: COLORS.paper,
        maxWidth: 480,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Hoje onRegistrar={() => openRegistro()} onOpenLinha={() => navigate('/linha')} />
          }
        />
        <Route
          path="/linha"
          element={
            <Linha
              onEditDay={(k) => openRegistro(k)}
              onAddEvento={(k) => openEvento(k)}
              onEditEvento={(id, k) => openEvento(k, id)}
            />
          }
        />
        <Route
          path="/tendencias"
          element={<Tendencias onExport={() => navigate('/resumo' + currentMonthQuery())} />}
        />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>

      <TabBar active={active} onTab={onTab} />
      <OverlayHost />
      <ToastHost />
    </div>
  );
}

/**
 * Renders whichever overlay the store has open. Lives below ToastProvider so it
 * can fire the post-save toast via useToast().
 */
function OverlayHost() {
  const overlay = useStore((s) => s.overlay);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const navigate = useNavigate();
  const toast = useToast();

  if (!overlay) return null;

  if (overlay.kind === 'registro') {
    return (
      <Registro
        dateKey={overlay.dateKey}
        onClose={closeOverlay}
        onSaved={(had) => {
          closeOverlay();
          navigate('/');
          toast.show(had ? 'Dia registrado' : 'Bom dia registrado');
        }}
      />
    );
  }

  return (
    <AddEvento
      dateKey={overlay.dateKey}
      eventId={overlay.eventId}
      onClose={closeOverlay}
      onSaved={(type, mode) => {
        closeOverlay();
        if (mode === 'deleted') {
          toast.show('Evento removido');
        } else if (mode === 'updated') {
          toast.show('Evento atualizado');
        } else {
          toast.show(type === 'infusao' ? 'Infusão adicionada' : 'Evento adicionado');
        }
      }}
    />
  );
}
