/**
 * Global UI state (Zustand). Holds only ephemeral chrome state that is shared
 * across screens — the active overlay, the Linha filter chip, and a `tab`
 * mirror for components that want it. Persistent data lives in Dexie and is
 * read through the reactive hooks in `@/data/hooks`; nothing domain-shaped
 * belongs here.
 *
 * Routing is owned by react-router (App derives the active tab from the URL),
 * so `tab`/`setTab` are a convenience mirror, not the source of truth.
 */
import { create } from 'zustand';
import { localDayKey } from '@/lib/date';

export type Tab = 'hoje' | 'linha' | 'tendencias' | 'perfil';

export type Overlay = { kind: 'registro' | 'evento'; dateKey: string } | null;

interface AppState {
  tab: Tab;
  setTab: (tab: Tab) => void;

  overlay: Overlay;
  openRegistro: (dateKey?: string) => void;
  openEvento: (dateKey?: string) => void;
  closeOverlay: () => void;

  filter: string;
  setFilter: (filter: string) => void;
}

export const useStore = create<AppState>((set) => ({
  tab: 'hoje',
  setTab: (tab) => set({ tab }),

  overlay: null,
  openRegistro: (dateKey = localDayKey()) => set({ overlay: { kind: 'registro', dateKey } }),
  openEvento: (dateKey = localDayKey()) => set({ overlay: { kind: 'evento', dateKey } }),
  closeOverlay: () => set({ overlay: null }),

  filter: 'tudo',
  setFilter: (filter) => set({ filter }),
}));
