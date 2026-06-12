/**
 * Shared health-event presentation metadata. Lives outside any screen so Linha,
 * the DayDetail sheet, and Perfil all label/icon event types identically.
 */
import type { EventType } from './types';
import type { IconName } from '@/components/Icon';

export const EVENT_META: Record<EventType, { label: string; icon: IconName }> = {
  infusao: { label: 'infusão', icon: 'drop' },
  exame: { label: 'exame', icon: 'flask' },
  consulta: { label: 'consulta', icon: 'user' },
  remedio: { label: 'remédio', icon: 'plus' },
  resultado: { label: 'resultado', icon: 'list' },
  outro: { label: 'outro', icon: 'spark' },
};

export const EVENT_ORDER: readonly EventType[] = [
  'infusao',
  'exame',
  'consulta',
  'remedio',
  'resultado',
  'outro',
];
