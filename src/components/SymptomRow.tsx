/**
 * SymptomRow — one row in the register's symptom list: a checkbox, the name,
 * and either SevDots (when active) or a "tocar" hint (when off). Tapping
 * anywhere on the row calls onCycle; the parent owns the none→leve→moderado→
 * grave→none state machine (nextSeverity in src/lib/severity.ts).
 */
import { COLORS } from '@/theme/tokens';
import type { Severity } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { SevDots } from '@/components/SevDots';

export interface SymptomRowProps {
  name: string;
  severity: Severity | null;
  onCycle: () => void;
}

export function SymptomRow({ name, severity, onCycle }: SymptomRowProps) {
  const on = severity != null;
  return (
    <div
      onClick={onCycle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCycle();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 23,
          height: 23,
          borderRadius: 8,
          flexShrink: 0,
          background: on ? COLORS.accent : 'transparent',
          border: `2px solid ${on ? COLORS.accent : COLORS.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Icon name="check" size={15} color={COLORS.onAccent} strokeWidth={2.6} />}
      </span>
      <span style={{ flex: 1, fontSize: 15.5, color: on ? COLORS.ink : COLORS.soft }}>{name}</span>
      {on ? (
        <SevDots sev={severity} />
      ) : (
        <span style={{ fontSize: 13, color: COLORS.faint }}>tocar</span>
      )}
    </div>
  );
}
