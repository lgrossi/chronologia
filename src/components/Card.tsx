/**
 * Card — the diary surface. Signature look: a solid 2px paper edge as the
 * shadow (never a blur). The accent variant is the starter/mood card: green
 * fill, elevated shadow, text in on-accent.
 */
import type { CSSProperties, ReactNode } from 'react';
import { COLORS } from '@/theme/tokens';

/** Solid 2px paper edge — the signature card shadow. */
const SHADOW_CARD = '0 2px 0 #E3DAC6';
/** Elevated green glow for the accent starter card. */
const SHADOW_ELEVATED = '0 12px 26px -12px rgba(63,90,67,0.6)';

export interface CardProps {
  children: ReactNode;
  /** Green starter-card variant. */
  accent?: boolean;
  /** Inner padding (px). Spec range 16–20. */
  pad?: number;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, accent = false, pad = 18, onClick, style, className }: CardProps) {
  const base: CSSProperties = {
    background: accent ? COLORS.accent : COLORS.card,
    color: accent ? COLORS.onAccent : COLORS.ink,
    border: `1.5px solid ${COLORS.line}`,
    borderRadius: 20,
    padding: pad,
    boxShadow: accent ? SHADOW_ELEVATED : SHADOW_CARD,
    cursor: onClick ? 'pointer' : 'default',
  };
  return (
    <div onClick={onClick} className={className} style={{ ...base, ...style }}>
      {children}
    </div>
  );
}
