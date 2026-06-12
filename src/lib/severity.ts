/**
 * Pure, unit-testable severity math for the register flow.
 *
 * The IntensitySlider snaps to 5 stops; the color is interpolated between the
 * user's notebook inks so in-between days read correctly. baseSev() collapses a
 * slider position back to one of the three canonical Severity values stored in
 * the DayLog. nextSeverity() is the symptom-row cycle state machine.
 */
import type { Severity } from '@/lib/types';

export type RGB = readonly [number, number, number];

/** Notebook ink RGB triples. Mirror of SEV in theme/tokens.ts, as RGB. */
export const RGB_SEV: Record<Severity, RGB> = {
  leve: [63, 109, 176],
  moderado: [224, 137, 43],
  grave: [138, 78, 162],
};

export interface Snap {
  /** Track position in [0,1]. */
  p: number;
  /** pt-BR stop label. */
  label: string;
}

/** The 5 slider stops, in order. index 0..4 maps to these. */
export const SNAPS: readonly Snap[] = [
  { p: 0, label: 'leve' },
  { p: 0.25, label: 'leve a moderado' },
  { p: 0.5, label: 'moderado' },
  { p: 0.75, label: 'moderado a grave' },
  { p: 1, label: 'grave' },
];

/** Component-wise linear interpolation of two RGB triples at t in [0,1]. */
export function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Interpolated severity color at track position p in [0,1]:
 * leve→moderado for p<0.5, moderado→grave otherwise. Returns a CSS rgb() string.
 */
export function sampleSev(p: number): string {
  const c =
    p < 0.5
      ? lerp(RGB_SEV.leve, RGB_SEV.moderado, p / 0.5)
      : lerp(RGB_SEV.moderado, RGB_SEV.grave, (p - 0.5) / 0.5);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Collapse a track position into one of the three canonical severities. */
export function baseSev(p: number): Severity {
  return p < 0.34 ? 'leve' : p < 0.67 ? 'moderado' : 'grave';
}

/** Symptom-row cycle: none → leve → moderado → grave → none. */
export function nextSeverity(cur: Severity | null): Severity | null {
  if (cur == null) return 'leve';
  if (cur === 'leve') return 'moderado';
  if (cur === 'moderado') return 'grave';
  return null;
}
