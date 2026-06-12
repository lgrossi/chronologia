/**
 * Typed token constants for inline styles and SVG (where Tailwind classes
 * can't reach). Mirrors design-tokens.json.
 *
 * Severity inks are SACRED — only ever used to encode symptom intensity.
 */
import type { Severity } from '@/lib/types';

export const SEV: Record<Severity, string> = {
  leve: '#3F6DB0',
  moderado: '#E0892B',
  grave: '#8A4EA2',
};

export const SEV_TINT: Record<Severity, string> = {
  leve: '#E7EEF7',
  moderado: '#FAF0E2',
  grave: '#F1EAF5',
};

export const WELLBEING = {
  bom: '#9CB79A',
  mid: '#E7CFA0',
  ruim: '#D9B2AE',
} as const;

export const COLORS = {
  paper: '#F4EEE0',
  card: '#FBF7EC',
  ink: '#3A352E',
  soft: '#6F685B',
  faint: '#A79F8E',
  line: '#E3DAC6',
  lineSoft: '#EDE6D6',
  accent: '#3F5A43',
  accentDeep: '#33492F',
  accentSoft: '#E5ECDF',
  onAccent: '#F4EEE0',
} as const;
