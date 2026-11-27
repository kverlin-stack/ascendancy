import type { GameState, Rules } from './types';

/** 1-based year for a turn. */
export function yearOf(turn: number, rules: Rules): number {
  return Math.floor((turn - 1) / (rules.turnsPerQuarter * rules.quartersPerYear)) + 1;
}

/** 1-based quarter within the year. */
export function quarterOf(turn: number, rules: Rules): number {
  return (Math.floor((turn - 1) / rules.turnsPerQuarter) % rules.quartersPerYear) + 1;
}

/** Enemy Advance value for a given year. */
export function advanceFor(year: number, rules: Rules): number {
  const table = rules.advanceByYear;
  return table[Math.min(year, table.length) - 1] ?? 0;
}

/** True if the quarterly enemy advance happens at the end of this turn. */
export function isQuarterEnd(turn: number, rules: Rules): boolean {
  return turn % rules.turnsPerQuarter === 0;
}

/** Turns until the next quarterly advance (1 = at the end of this turn). */
export function turnsUntilAdvance(state: GameState, rules: Rules): number {
  return rules.turnsPerQuarter - ((state.turn - 1) % rules.turnsPerQuarter);
}
