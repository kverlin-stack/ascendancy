import { STATE_VERSION, type GameState } from '@ascendancy/engine';

const KEY = 'ascendancy.run';

/** Load the saved run, or null. Storage can be blocked or cleared, so never throw. */
export function loadRun(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s && s.version === STATE_VERSION && Array.isArray(s.hand) ? s : null;
  } catch {
    return null;
  }
}

export function saveRun(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the run still plays, it just won't resume.
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

type SeenFlag = 'intro' | 'coach';
const seenKey = (flag: SeenFlag) => `ascendancy.seen.${flag}`;

/** Whether the player has already seen the story intro or the guided first turn. */
export function hasSeen(flag: SeenFlag): boolean {
  try {
    return localStorage.getItem(seenKey(flag)) === '1';
  } catch {
    return false;
  }
}

export function markSeen(flag: SeenFlag): void {
  try {
    localStorage.setItem(seenKey(flag), '1');
  } catch {
    // Storage blocked: the intro will simply show again next time.
  }
}
