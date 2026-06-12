/**
 * Fixed bottom tab bar — global chrome (COMPONENTS.md → TabBar).
 *
 * Five slots: Hoje · Linha · FAB(⊕) · Tendências · Perfil. The four nav slots
 * report taps via `onTab`; the center FAB opens the "Adicionar evento" overlay
 * through the store directly (its action never varies with the active screen).
 *
 * Active slot uses the single Floresta accent (thicker icon stroke + 700
 * label); inactive slots are ink.faint. Severity inks never appear here — this
 * is chrome, not data.
 */
import { COLORS } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { useStore, type Tab } from '@/store';

interface NavSlot {
  tab: Tab;
  icon: IconName;
  label: string;
}

const NAV: readonly NavSlot[] = [
  { tab: 'hoje', icon: 'home', label: 'Hoje' },
  { tab: 'linha', icon: 'list', label: 'Linha' },
  { tab: 'tendencias', icon: 'trend', label: 'Tendências' },
  { tab: 'perfil', icon: 'user', label: 'Perfil' },
];

export interface TabBarProps {
  active: Tab;
  onTab: (tab: Tab) => void;
}

export function TabBar({ active, onTab }: TabBarProps) {
  const openEvento = useStore((s) => s.openEvento);

  return (
    <nav
      className="safe-bottom"
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 30,
        background: COLORS.card,
        borderTop: `1.5px solid ${COLORS.line}`,
        boxShadow: 'var(--shadow-tabbar)',
        padding: '12px 14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <TabSlot slot={NAV[0]} active={active === NAV[0].tab} onTab={onTab} />
      <TabSlot slot={NAV[1]} active={active === NAV[1].tab} onTab={onTab} />

      <button
        type="button"
        aria-label="Adicionar evento"
        onClick={() => openEvento()}
        style={{
          width: 54,
          height: 54,
          marginTop: -30,
          flex: '0 0 auto',
          borderRadius: 18,
          background: COLORS.accent,
          border: `3px solid ${COLORS.card}`,
          boxShadow: 'var(--shadow-fab)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Icon name="plus" size={26} color={COLORS.onAccent} strokeWidth={2.5} />
      </button>

      <TabSlot slot={NAV[2]} active={active === NAV[2].tab} onTab={onTab} />
      <TabSlot slot={NAV[3]} active={active === NAV[3].tab} onTab={onTab} />
    </nav>
  );
}

function TabSlot({
  slot,
  active,
  onTab,
}: {
  slot: NavSlot;
  active: boolean;
  onTab: (tab: Tab) => void;
}) {
  const color = active ? COLORS.accent : COLORS.faint;
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => onTab(slot.tab)}
      style={{
        flex: 1,
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color,
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
      }}
    >
      <Icon name={slot.icon} size={22} color={color} strokeWidth={active ? 2.6 : 2} />
      {slot.label}
    </button>
  );
}
