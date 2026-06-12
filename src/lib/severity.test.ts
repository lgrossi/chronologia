import { describe, it, expect } from 'vitest';
import { lerp, sampleSev, baseSev, nextSeverity, RGB_SEV } from './severity';

describe('lerp', () => {
  it('returns endpoint a at t=0 and b at t=1', () => {
    expect(lerp([0, 0, 0], [10, 20, 30], 0)).toEqual([0, 0, 0]);
    expect(lerp([0, 0, 0], [10, 20, 30], 1)).toEqual([10, 20, 30]);
  });

  it('rounds the component-wise midpoint at t=0.5 (half rounds up)', () => {
    // 0 + (3-0)*0.5 = 1.5 -> Math.round = 2 (round-half-up, the bug-prone case)
    expect(lerp([0, 0, 0], [3, 4, 5], 0.5)).toEqual([2, 2, 3]);
  });
});

describe('sampleSev', () => {
  it('returns the exact leve ink at p=0', () => {
    expect(sampleSev(0)).toBe('rgb(63,109,176)');
  });

  it('returns the exact moderado ink at the p=0.5 seam', () => {
    expect(sampleSev(0.5)).toBe('rgb(224,137,43)');
  });

  it('returns the exact grave ink at p=1', () => {
    expect(sampleSev(1)).toBe('rgb(138,78,162)');
  });

  it('interpolates the leve→moderado midpoint at p=0.25', () => {
    // t = 0.25/0.5 = 0.5 between [63,109,176] and [224,137,43]
    // R round(143.5)=144  G round(123)=123  B round(109.5)=110
    expect(sampleSev(0.25)).toBe('rgb(144,123,110)');
  });

  it('interpolates the moderado→grave midpoint at p=0.75', () => {
    // t = (0.75-0.5)/0.5 = 0.5 between [224,137,43] and [138,78,162]
    // R round(181)=181  G round(107.5)=108  B round(102.5)=103
    expect(sampleSev(0.75)).toBe('rgb(181,108,103)');
  });
});

describe('baseSev', () => {
  it('classifies below the leve/moderado boundary (p=0.33) as leve', () => {
    expect(baseSev(0.33)).toBe('leve');
  });

  it('classifies at the leve/moderado boundary (p=0.34) as moderado', () => {
    expect(baseSev(0.34)).toBe('moderado');
  });

  it('classifies below the moderado/grave boundary (p=0.66) as moderado', () => {
    expect(baseSev(0.66)).toBe('moderado');
  });

  it('classifies at the moderado/grave boundary (p=0.67) as grave', () => {
    expect(baseSev(0.67)).toBe('grave');
  });
});

describe('nextSeverity', () => {
  it('walks the full cycle null→leve→moderado→grave→null', () => {
    expect(nextSeverity(null)).toBe('leve');
    expect(nextSeverity('leve')).toBe('moderado');
    expect(nextSeverity('moderado')).toBe('grave');
    expect(nextSeverity('grave')).toBeNull();
  });
});

describe('RGB_SEV', () => {
  it('keeps the ink triples consistent with the seam colors sampleSev emits', () => {
    // Guards against RGB_SEV drifting away from the colors the slider renders
    // at the canonical stops.
    expect(`rgb(${RGB_SEV.leve.join(',')})`).toBe(sampleSev(0));
    expect(`rgb(${RGB_SEV.moderado.join(',')})`).toBe(sampleSev(0.5));
    expect(`rgb(${RGB_SEV.grave.join(',')})`).toBe(sampleSev(1));
  });
});
