import { describe, expect, it } from 'vitest';
import { createRng, seedToState } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds and stays in [0, 1)', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('resumes from a saved state', () => {
    const a = createRng(99);
    a.next();
    a.next();
    const resumed = createRng(a.state);
    expect(resumed.next()).toBe(a.next());
  });

  it('shuffle keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng(3).shuffle(input);
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('pickWeighted never picks zero-weight items', () => {
    const r = createRng(5);
    for (let i = 0; i < 200; i++) {
      expect(r.pickWeighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
    }
  });

  it('hashes string seeds stably', () => {
    expect(seedToState('sunfire')).toBe(seedToState('sunfire'));
    expect(seedToState('sunfire')).not.toBe(seedToState('sunfirf'));
  });
});
