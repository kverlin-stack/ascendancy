import { describe, expect, it } from 'vitest';
import { advanceFor, isQuarterEnd, quarterOf, yearOf } from './calendar';
import { testContent } from './test-fixtures';

const { rules } = testContent();

describe('calendar', () => {
  it('maps turns to years and quarters (3 turns/quarter, 4 quarters/year)', () => {
    expect(yearOf(1, rules)).toBe(1);
    expect(yearOf(12, rules)).toBe(1);
    expect(yearOf(13, rules)).toBe(2);
    expect(quarterOf(1, rules)).toBe(1);
    expect(quarterOf(3, rules)).toBe(1);
    expect(quarterOf(4, rules)).toBe(2);
    expect(quarterOf(12, rules)).toBe(4);
    expect(quarterOf(13, rules)).toBe(1);
  });

  it('marks every third turn as a quarter end', () => {
    expect([1, 2, 3, 4, 5, 6].map((t) => isQuarterEnd(t, rules))).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('Advance climbs each year and the last value repeats', () => {
    expect(advanceFor(1, rules)).toBe(1);
    expect(advanceFor(2, rules)).toBe(2);
    expect(advanceFor(3, rules)).toBe(3);
    expect(advanceFor(9, rules)).toBe(3);
  });
});
