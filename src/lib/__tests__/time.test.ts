import { describe, expect, it } from 'vitest';
import { formatHM, parseHM, prevMonth, toHM } from '../time';

describe('parseHM (hours.minutes input)', () => {
  it.each([
    ['1.15', 75],
    ['.45', 45],
    ['2', 120],
    ['1.30', 90],
    ['1.5', 110], // one digit = tens of minutes
    ['0.05', 5],
    [' 3.00 ', 180],
  ])('%s → %i minutes', (input, minutes) => {
    expect(parseHM(input)).toBe(minutes);
  });

  it.each(['', '.', '1.75', '1.60', 'abc', '1.2.3', '-1', '1.123'])('rejects %j', (input) => {
    expect(parseHM(input)).toBeNull();
  });
});

describe('formatHM / toHM', () => {
  it('formats minutes for display', () => {
    expect(formatHM(0)).toBe('0h');
    expect(formatHM(45)).toBe('45m');
    expect(formatHM(120)).toBe('2h');
    expect(formatHM(210)).toBe('3h 30m');
    expect(formatHM(-30)).toBe('-30m');
  });

  it('round-trips through the edit input format', () => {
    for (const m of [0, 5, 45, 75, 210, 1800]) expect(parseHM(toHM(m))).toBe(m);
  });
});

describe('prevMonth', () => {
  it('goes back one month, across years', () => {
    expect(prevMonth('2026-11')).toBe('2026-10');
    expect(prevMonth('2026-01')).toBe('2025-12');
  });
});
