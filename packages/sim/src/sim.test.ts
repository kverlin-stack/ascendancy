import { describe, expect, it } from 'vitest';
import { content } from '@ascendancy/content';
import { greedyBot } from './bot';
import { playRun, runSims } from './run';

describe('sim', () => {
  it('the greedy bot plays a full run to a win or loss', () => {
    const r = playRun(content, greedyBot, 1);
    expect(r.lossCause).not.toBe('stalled');
    expect(r.won || r.lossCause !== null).toBe(true);
  });

  it('is deterministic for the same seeds', () => {
    expect(runSims(content, greedyBot, 20, 7)).toEqual(runSims(content, greedyBot, 20, 7));
  });

  it('no run stalls across many seeds', () => {
    const sum = runSims(content, greedyBot, 200, 1);
    expect(sum.lossCauses['stalled'] ?? 0).toBe(0);
  });
});
