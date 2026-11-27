/**
 * Working names from docs/WORLD.md. This is the one place to rename them.
 *
 * Content data files refer to these with tokens like {enemyShort}; they're
 * filled in when content loads (see interpolate.ts). The web UI imports
 * NAMES directly.
 */
export const NAMES = {
  /** Player's alliance (Act I). */
  alliance: 'the Concord',
  allianceShort: 'Concord',
  /** The enemy. A faceless faction, never a caricature of a real nation. */
  enemy: 'the Iron Directorate',
  enemyShort: 'Directorate',
  /** Superweapon program. Always abstract. */
  program: 'Project Sunfire',
  programShort: 'Sunfire',
  /** Unified world government, founded at the end of Act I. */
  worldGovernment: 'the World Assembly',
  /** The conference where the nations unite. */
  accord: 'the Accord',
  /** Act II space program; gives the game its title. */
  spaceProgram: 'the Ascendancy Program',
  /** The habitable world (working). */
  newWorld: 'Meridian',
  /** The colony. True ending: "First Landing endures." */
  colony: 'First Landing',
  /** Game title (working). */
  game: 'Ascendancy',
} as const;

export type NameKey = keyof typeof NAMES;
