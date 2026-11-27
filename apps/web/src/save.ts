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
