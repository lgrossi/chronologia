/**
 * Btn — full-width action button. Primary is the Floresta-green CTA with a
 * soft green shadow; disabled flattens to ink.faint. Secondary is a bordered
 * card surface with no shadow.
 */
import type { CSSProperties, ReactNode } from 'react';
import { COLORS } from '@/theme/tokens';

/** Soft green lift for the primary CTA. */
const SHADOW_BUTTON_PRIMARY = '0 8px 18px -8px rgba(63,90,67,0.53)';

export interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  /** Primary green variant. Omit for secondary. */
  primary?: boolean;
  disabled?: boolean;
  /** Button type — default 'button' so it never submits a form by accident. */
  type?: 'button' | 'submit';
  style?: CSSProperties;
  className?: string;
}

export function Btn({
  children,
  onClick,
  primary = false,
  disabled = false,
  type = 'button',
  style,
  className,
}: BtnProps) {
  const base: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    whiteSpace: 'nowrap',
    background: primary ? (disabled ? COLORS.faint : COLORS.accent) : COLORS.card,
    color: primary ? COLORS.onAccent : COLORS.ink,
    border: primary ? 'none' : `1.5px solid ${COLORS.line}`,
    borderRadius: 16,
    padding: 16,
    fontWeight: 700,
    fontSize: 16,
    cursor: disabled ? 'default' : 'pointer',
    boxShadow: primary && !disabled ? SHADOW_BUTTON_PRIMARY : 'none',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...style }}
    >
      {children}
    </button>
  );
}
