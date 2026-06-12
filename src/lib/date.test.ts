import { describe, it, expect } from 'vitest';
import {
  localDayKey,
  parseDayKey,
  addDays,
  daysBetween,
  weekdayLetterPt,
  monthNamePt,
  formatLongPt,
  formatLongWithYearPt,
  startOfWeekMonday,
  weekKeysMonday,
} from './date';

describe('localDayKey', () => {
  it('keys by the LOCAL calendar day for a late-night (23:30) entry', () => {
    // Constructed in local time. The key must be the local date regardless of
    // the device timezone — a toISOString()-based impl would shift this to the
    // next UTC day for any timezone behind UTC.
    const d = new Date(2026, 5, 10, 23, 30, 0); // 10 jun 2026, 23:30 local
    expect(localDayKey(d)).toBe('2026-06-10');
  });

  it('keys by the LOCAL calendar day for an after-midnight (00:30) entry', () => {
    const d = new Date(2026, 5, 11, 0, 30, 0); // 11 jun 2026, 00:30 local
    expect(localDayKey(d)).toBe('2026-06-11');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3, 12, 0, 0); // 3 jan 2026
    expect(localDayKey(d)).toBe('2026-01-03');
  });

  it('round-trips through parseDayKey without a UTC shift', () => {
    const key = '2026-06-10';
    expect(localDayKey(parseDayKey(key))).toBe(key);
  });
});

describe('addDays', () => {
  it('crosses a month boundary forward', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('crosses a month boundary backward', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });
});

describe('daysBetween', () => {
  it('is positive when to is after from, with the right magnitude', () => {
    expect(daysBetween('2026-06-01', '2026-06-09')).toBe(8);
  });

  it('is negative when to is before from', () => {
    expect(daysBetween('2026-06-09', '2026-06-01')).toBe(-8);
  });

  it('is zero for the same day', () => {
    expect(daysBetween('2026-06-09', '2026-06-09')).toBe(0);
  });

  it('counts across a month boundary', () => {
    expect(daysBetween('2026-01-30', '2026-02-02')).toBe(3);
  });
});

describe('weekdayLetterPt', () => {
  it('maps Monday to S (Monday-first, index 0)', () => {
    expect(weekdayLetterPt('2026-06-08')).toBe('S'); // 8 jun 2026 is Monday
  });

  it('maps Sunday to D (Monday-first, index 6)', () => {
    expect(weekdayLetterPt('2026-06-14')).toBe('D'); // 14 jun 2026 is Sunday
  });

  it('maps the full Mon..Sun week to S T Q Q S S D', () => {
    const week = weekKeysMonday('2026-06-08').map(weekdayLetterPt);
    expect(week).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
  });
});

describe('monthNamePt', () => {
  it('returns the lowercase full pt-BR month name', () => {
    expect(monthNamePt('2026-06-01')).toBe('junho');
    expect(monthNamePt('2026-01-15')).toBe('janeiro');
  });
});

describe('formatLongPt', () => {
  it('formats as "<full weekday>, <day> <short month>"', () => {
    expect(formatLongPt('2026-06-14')).toBe('domingo, 14 jun');
    expect(formatLongPt('2026-06-08')).toBe('segunda-feira, 8 jun');
  });
});

describe('formatLongWithYearPt', () => {
  it('includes weekday, day, full month name and year for a known Sunday', () => {
    const out = formatLongWithYearPt('2026-05-31'); // domingo, 31 de maio de 2026
    expect(out).toContain('domingo');
    expect(out).toContain('31');
    expect(out).toContain('maio');
    expect(out).toContain('2026');
  });
});

describe('startOfWeekMonday', () => {
  it('returns the same day when given a Monday', () => {
    expect(startOfWeekMonday('2026-06-08')).toBe('2026-06-08');
  });

  it('returns the preceding Monday when given a Sunday', () => {
    expect(startOfWeekMonday('2026-06-14')).toBe('2026-06-08');
  });
});

describe('weekKeysMonday', () => {
  it('returns 7 keys Mon..Sun for a midweek input, including the input', () => {
    const keys = weekKeysMonday('2026-06-10'); // Wednesday
    expect(keys).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
    ]);
    expect(keys).toContain('2026-06-10');
  });

  it('aligns to the Monday of the week even when input is the Sunday', () => {
    const keys = weekKeysMonday('2026-06-14'); // Sunday
    expect(keys[0]).toBe('2026-06-08');
    expect(keys[6]).toBe('2026-06-14');
  });
});
