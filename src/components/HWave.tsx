/**
 * HWave — the signature severity "wave" glyph. Color encodes intensity,
 * repeat-count encodes episode frequency. Geometry ported verbatim from the
 * prototype (hf-shell.jsx): one glyph is 4 quadratic segments alternating
 * up/down across width `w`, vertically centered, round caps, no fill.
 */
import { SEV } from '@/theme/tokens';

export interface HWaveProps {
  /** Stroke color. Defaults to the leve ink. */
  color?: string;
  /** Number of glyph repeats (frequency). Clamped 1–6. */
  count?: number;
  /** Glyph height. */
  h?: number;
  /** Single-glyph width. */
  w?: number;
  /** Stroke width. */
  sw?: number;
  /** Gap in px between repeats. */
  gap?: number;
  /** Wave amplitude. Defaults to h * 0.34. */
  amp?: number;
}

function glyphPath(w: number, h: number, amp: number): string {
  const mid = h / 2;
  const seg = w / 4;
  let d = `M2 ${mid}`;
  for (let i = 0; i < 4; i++) {
    const x0 = 2 + i * seg;
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` Q ${x0 + seg / 2} ${mid + dir * amp} ${x0 + seg} ${mid}`;
  }
  return d;
}

export function HWave({
  color = SEV.leve,
  count = 1,
  h = 18,
  w = 32,
  sw = 3,
  gap = 3,
  amp,
}: HWaveProps) {
  const a = amp != null ? amp : h * 0.34;
  const d = glyphPath(w, h, a);
  const n = Math.max(1, Math.min(6, count));

  return (
    <span style={{ display: 'inline-flex', gap, alignItems: 'center' }}>
      {Array.from({ length: n }).map((_, i) => (
        <svg
          key={i}
          width={w}
          height={h}
          viewBox={`0 0 ${w + 4} ${h}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        >
          <path d={d} />
        </svg>
      ))}
    </span>
  );
}
