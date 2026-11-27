/**
 * Seeded, serializable RNG (mulberry32). The whole generator state is one
 * 32-bit integer, so it can live inside GameState and survive save/load.
 * The engine never calls Math.random.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Fisher-Yates shuffle, returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
  /** Pick an item with probability proportional to its weight. */
  pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Current generator state, to store back into GameState. */
  readonly state: number;
}

export function seedToState(seed: number | string): number {
  if (typeof seed === 'number') return seed >>> 0;
  // FNV-1a hash for string seeds.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(initialState: number): Rng {
  let s = initialState >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j] as T, out[i] as T];
      }
      return out;
    },
    pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T {
      if (items.length === 0) throw new Error('pickWeighted: empty list');
      const total = items.reduce((sum, it) => sum + weight(it), 0);
      let roll = next() * total;
      for (const it of items) {
        roll -= weight(it);
        if (roll < 0) return it;
      }
      return items[items.length - 1] as T;
    },
    get state() {
      return s;
    },
  };
}
