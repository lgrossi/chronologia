import { describe, it, expect } from 'vitest';
import {
  cycleStatus,
  infusionMedication,
  weekStrip,
  monthRollup,
  topSymptoms,
  cycleCurveSeries,
} from './selectors';
import type { DayLog, HealthEvent, Medication, Mood, Severity, SymptomEntry } from './types';

const med = (intervalDays: number): Medication => ({
  id: 'm1',
  name: 'Infliximabe',
  intervalDays,
});

const infusion = (date: string): HealthEvent => ({
  id: 'e1',
  date,
  type: 'infusao',
});

const day = (
  date: string,
  opts: { mood?: Mood; severity?: Severity | null; symptoms?: SymptomEntry[] } = {},
): DayLog => ({
  date,
  mood: opts.mood ?? 'neutro',
  overallSeverity: opts.severity ?? null,
  waveCount: 0,
  symptoms: opts.symptoms ?? [],
});

const sym = (name: string, severity: Severity = 'leve'): SymptomEntry => ({ name, severity });

describe('infusionMedication', () => {
  const infliximabe: Medication = { id: 'inf', name: 'Infliximabe', intervalDays: 56 };
  const dailyMed: Medication = { id: 'd1', name: 'Azatioprina', intervalDays: 1 };
  const lastInfusion: HealthEvent = { id: 'e9', date: '2026-06-01', type: 'infusao', medicationId: 'inf' };

  it('resolves the med the infusion event references, even when a daily med is first in the list', () => {
    expect(infusionMedication([dailyMed, infliximabe], lastInfusion)).toBe(infliximabe);
  });
  it('returns null when there is no infusion', () => {
    expect(infusionMedication([dailyMed, infliximabe], null)).toBeNull();
  });
  it('returns null when the referenced med no longer exists', () => {
    expect(infusionMedication([dailyMed], lastInfusion)).toBeNull();
  });
});

describe('cycleStatus', () => {
  it('computes dayN, daysLeft and pct mid-cycle (20 days into a 56-day cycle)', () => {
    const s = cycleStatus('2026-06-21', infusion('2026-06-01'), med(56));
    expect(s.dayN).toBe(20);
    expect(s.total).toBe(56);
    expect(s.daysLeft).toBe(36);
    expect(s.pct).toBeCloseTo(20 / 56, 10);
    expect(s.overdue).toBe(false);
  });

  it('is not overdue exactly on the interval day (daysLeft=0)', () => {
    const s = cycleStatus('2026-07-27', infusion('2026-06-01'), med(56));
    expect(s.dayN).toBe(56);
    expect(s.daysLeft).toBe(0);
    expect(s.overdue).toBe(false);
    expect(s.pct).toBe(1);
  });

  it('flags overdue with negative daysLeft and clamps pct to 1 past the interval', () => {
    const s = cycleStatus('2026-07-31', infusion('2026-06-01'), med(56)); // 60 days
    expect(s.dayN).toBe(60);
    expect(s.daysLeft).toBe(-4);
    expect(s.overdue).toBe(true);
    expect(s.pct).toBe(1);
  });

  it('clamps dayN to 0 when the infusion is in the future', () => {
    const s = cycleStatus('2026-06-01', infusion('2026-06-10'), med(56));
    expect(s.dayN).toBe(0);
    expect(s.pct).toBe(0);
    expect(s.daysLeft).toBe(56);
    expect(s.overdue).toBe(false);
  });

  it('returns a benign zeroed status when the infusion is null', () => {
    const s = cycleStatus('2026-06-21', null, med(56));
    expect(s).toEqual({ dayN: 0, total: 56, daysLeft: 56, pct: 0, overdue: false });
  });

  it('returns a benign zeroed status when the medication is null', () => {
    const s = cycleStatus('2026-06-21', infusion('2026-06-01'), null);
    expect(s).toEqual({ dayN: 0, total: 0, daysLeft: 0, pct: 0, overdue: false });
  });
});

describe('weekStrip', () => {
  it('marks exactly today as isToday and leaves the rest false', () => {
    const cells = weekStrip([], '2026-06-10'); // Wednesday
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].key).toBe('2026-06-10');
  });

  it('maps a logged day severity onto its cell and null for unlogged days', () => {
    const days = [day('2026-06-10', { severity: 'grave' })];
    const cells = weekStrip(days, '2026-06-10');
    const wed = cells.find((c) => c.key === '2026-06-10');
    const thu = cells.find((c) => c.key === '2026-06-11');
    expect(wed?.severity).toBe('grave');
    expect(thu?.severity).toBeNull();
  });

  it('distinguishes a logged tranquilo day (logged, no severity) from an unlogged one', () => {
    // The bug: a good day logged with no symptoms read as empty/white.
    const days = [day('2026-06-09', { mood: 'bom', severity: null })];
    const cells = weekStrip(days, '2026-06-10');
    const tue = cells.find((c) => c.key === '2026-06-09');
    const thu = cells.find((c) => c.key === '2026-06-11');
    expect(tue?.logged).toBe(true);
    expect(tue?.severity).toBeNull();
    expect(thu?.logged).toBe(false);
  });

  it('spans the Mon..Sun week with pt-BR weekday letters', () => {
    const cells = weekStrip([], '2026-06-10');
    expect(cells.map((c) => c.key)).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ]);
    expect(cells.map((c) => c.letter)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
  });
});

describe('monthRollup', () => {
  it('tallies bom and ruim directly and folds neutro into mid', () => {
    const days = [
      day('2026-06-01', { mood: 'bom' }),
      day('2026-06-02', { mood: 'bom' }),
      day('2026-06-03', { mood: 'neutro' }),
      day('2026-06-04', { mood: 'ruim' }),
      day('2026-06-05', { mood: 'neutro' }),
    ];
    expect(monthRollup(days)).toEqual({ bom: 2, mid: 2, ruim: 1 });
  });

  it('returns all-zero for no days', () => {
    expect(monthRollup([])).toEqual({ bom: 0, mid: 0, ruim: 0 });
  });
});

describe('topSymptoms', () => {
  it('counts DAYS a symptom appeared, not total occurrences within a day', () => {
    // dor logged twice on the same day counts as ONE day.
    const days = [
      day('2026-06-01', { symptoms: [sym('dor'), sym('dor', 'grave')] }),
      day('2026-06-02', { symptoms: [sym('dor')] }),
    ];
    const top = topSymptoms(days);
    expect(top).toEqual([{ name: 'dor', count: 2 }]);
  });

  it('sorts by descending day-count', () => {
    const days = [
      day('2026-06-01', { symptoms: [sym('dor'), sym('nausea')] }),
      day('2026-06-02', { symptoms: [sym('dor')] }),
      day('2026-06-03', { symptoms: [sym('dor')] }),
    ];
    const top = topSymptoms(days);
    expect(top).toEqual([
      { name: 'dor', count: 3 },
      { name: 'nausea', count: 1 },
    ]);
  });

  it('breaks ties alphabetically', () => {
    const days = [day('2026-06-01', { symptoms: [sym('zeta'), sym('alpha'), sym('mid')] })];
    const top = topSymptoms(days);
    expect(top.map((s) => s.name)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('respects the n cap, keeping the highest counts', () => {
    const days = [
      day('2026-06-01', { symptoms: [sym('a'), sym('b'), sym('c')] }),
      day('2026-06-02', { symptoms: [sym('a'), sym('b')] }),
      day('2026-06-03', { symptoms: [sym('a')] }),
    ];
    const top = topSymptoms(days, 2);
    expect(top).toEqual([
      { name: 'a', count: 3 },
      { name: 'b', count: 2 },
    ]);
  });
});

describe('cycleCurveSeries', () => {
  it('weights severities leve=1, moderado=2, grave=3 and tranquilo=0, placed at dayN', () => {
    const days = [
      day('2026-06-01', { severity: 'leve' }), // dayN 0
      day('2026-06-03', { severity: 'moderado' }), // dayN 2
      day('2026-06-05', { severity: 'grave' }), // dayN 4
      day('2026-06-07', { severity: null }), // dayN 6 -> weight 0
    ];
    const series = cycleCurveSeries(days, infusion('2026-06-01'), med(56));
    expect(series).toEqual([
      { dayN: 0, severity: 1 },
      { dayN: 2, severity: 2 },
      { dayN: 4, severity: 3 },
      { dayN: 6, severity: 0 },
    ]);
  });

  it('excludes days before the infusion and beyond the interval, and sorts by dayN', () => {
    const days = [
      day('2026-06-10', { severity: 'grave' }), // dayN 9, in range
      day('2026-05-31', { severity: 'leve' }), // dayN -1, before infusion -> excluded
      day('2026-06-12', { severity: 'leve' }), // dayN 11 == total, in range (boundary)
      day('2026-06-13', { severity: 'moderado' }), // dayN 12 > total -> excluded
      day('2026-06-01', { severity: 'moderado' }), // dayN 0, in range
    ];
    const series = cycleCurveSeries(days, infusion('2026-06-01'), med(11));
    expect(series).toEqual([
      { dayN: 0, severity: 2 },
      { dayN: 9, severity: 3 },
      { dayN: 11, severity: 1 },
    ]);
  });

  it('returns [] without an anchoring infusion', () => {
    const days = [day('2026-06-01', { severity: 'grave' })];
    expect(cycleCurveSeries(days, null, med(56))).toEqual([]);
  });

  it('returns [] without an anchoring medication', () => {
    const days = [day('2026-06-01', { severity: 'grave' })];
    expect(cycleCurveSeries(days, infusion('2026-06-01'), null)).toEqual([]);
  });
});
