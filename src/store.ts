/**
 * Global UI state (Zustand). Holds only ephemeral chrome state that is shared
 * across screens — the active overlay and a `tab` mirror for components that
 * want it. Persistent data lives in Dexie and is read through the reactive
 * hooks in `@/data/hooks`; nothing domain-shaped belongs here. The Linha filter
 * is screen-local state, owned by Linha itself.
 *
 * Routing is owned by react-router (App derives the active tab from the URL),
 * so `tab`/`setTab` are a convenience mirror, not the source of truth.
 *
 * The evento overlay carries an optional `eventId`: present => edit an existing
 * event, absent => create a new one.
 */
import { create } from 'zustand';
import { localDayKey } from '@/lib/date';
import type { EventPrefill } from '@/lib/types';

export type Tab = 'hoje' | 'linha' | 'tendencias' | 'perfil';

export type Overlay =
  | { kind: 'registro'; dateKey: string }
  | { kind: 'evento'; dateKey: string; eventId?: string; prefill?: EventPrefill }
  | null;

interface AppState {
  tab: Tab;
  setTab: (tab: Tab) => void;

  overlay: Overlay;
  openRegistro: (dateKey?: string) => void;
  openEvento: (dateKey?: string, eventId?: string, prefill?: EventPrefill) => void;
  closeOverlay: () => void;
}

export const useStore = create<AppState>((set) => ({
  tab: 'hoje',
  setTab: (tab) => set({ tab }),

  overlay: null,
  openRegistro: (dateKey = localDayKey()) => set({ overlay: { kind: 'registro', dateKey } }),
  openEvento: (dateKey = localDayKey(), eventId, prefill) =>
    set({ overlay: { kind: 'evento', dateKey, eventId, prefill } }),
  closeOverlay: () => set({ overlay: null }),
}));
