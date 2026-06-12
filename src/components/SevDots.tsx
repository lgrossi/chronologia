/**
 * SevDots — three-circle severity indicator/picker. The active severity's
 * circle is filled and bordered in its ink; the others are transparent with a
 * 2px neutral border. Read-only in day detail; a tap target in symptom rows.
 */
import { SEV } from '@/theme/tokens';
import type { Severity } from '@/lib/types';

/** Neutral border for inactive dots (not a token — picker-only chrome). */
const INACTIVE_BORDER = '#CFC7B6';

const ORDER: readonly Severity[] = ['leve', 'moderado', 'grave'];

export interface SevDotsProps {
  sev: Severity;
  /** Diameter of each dot in px. */
  size?: number;
}

export function SevDots({ sev, size = 16 }: SevDotsProps) {
  return (
    <span style={{ display: 'inline-flex', gap: 5 }}>
      {ORDER.map((o) => {
        const on = o === sev;
        return (
          <span
            key={o}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: on ? SEV[o] : 'transparent',
              border: `2px solid ${on ? SEV[o] : INACTIVE_BORDER}`,
            }}
          />
        );
      })}
    </span>
  );
}
