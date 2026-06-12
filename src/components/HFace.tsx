/**
 * HFace — mood face in three states. Geometry ported verbatim from the
 * prototype (hf-shell.jsx). viewBox 0 0 30 30; circle r13.5; eyes at
 * (10.5,12) & (19.5,12); mouth path by mood. The 'soft' variant drops the
 * outline (used when the face sits on a filled accent circle).
 */
import { COLORS } from '@/theme/tokens';
import type { Mood } from '@/lib/types';

export interface HFaceProps {
  mood: Mood;
  /** Square pixel size. */
  size?: number;
  /** Stroke + dot color. */
  color?: string;
  /** Stroke width baseline (mouth uses sw, eyes sw*0.62, ring sw*0.85). */
  sw?: number;
  /** 'line' draws the ring; 'soft' omits it. */
  variant?: 'line' | 'soft';
  /** Optional circle fill. */
  fill?: string;
}

const MOUTH: Record<Mood, string> = {
  bom: 'M9 16 Q15 22 21 16',
  neutro: 'M9.5 17.5 H20.5',
  ruim: 'M9 19 Q15 13 21 19',
};

export function HFace({
  mood,
  size = 40,
  color = COLORS.ink,
  sw = 2.2,
  variant = 'line',
  fill,
}: HFaceProps) {
  const eyeY = 12;
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <circle
        cx="15"
        cy="15"
        r="13.5"
        fill={fill || 'none'}
        stroke={color}
        strokeWidth={variant === 'soft' ? 0 : sw * 0.85}
      />
      <circle cx="10.5" cy={eyeY} r={sw * 0.62} fill={color} />
      <circle cx="19.5" cy={eyeY} r={sw * 0.62} fill={color} />
      <path d={MOUTH[mood]} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
    </svg>
  );
}
