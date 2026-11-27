import { NAMES } from '@ascendancy/content';
import type { CardType, LossCause } from '@ascendancy/engine';

/**
 * All player-facing UI copy. World names come from NAMES (packages/content/src/names.ts);
 * tone follows docs/WORLD.md.
 */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const S = {
  title: NAMES.game,
  newRun: 'New run',
  progressLabel: NAMES.program,
  frontHeld: (front: number, total: number) => `${front} / ${total} held`,
  capital: 'Capital',
  enemyNext: `${NAMES.enemyShort}'s next move · hits when you end your turn`,
  enemyDeck: (n: number) => `${NAMES.enemyShort} orders: ${n} left`,
  enemyDeckEmpty: 'Reshuffles next turn.',
  statsHint: 'If any of these hit 0, you lose. Tap one to learn more.',
  fortified: (n: number) => `🛡 Fortified: blocks the next ${n} Front lost this turn`,
  endTurn: 'End Turn',
  emptyHand: 'No cards left in hand.',
  rewardTitle: (q: number) => `Q${q} report`,
  rewardHint: 'Recruit one card into your deck, or skip.',
  skip: 'Skip',
  burnoutLabel: (used: number, limit: number) => `Burnout ${used}/${limit}`,
  burnoutFresh: 'Each play adds 1. At the limit they leave for good.',
  burnoutResting: 'Skip playing them this turn and they rest (−1).',
  burnoutLast: 'Next play is their last: they leave the program for good (−2 Morale).',
  burnoutReward: (limit: number) =>
    `Burnout ${limit}: each play adds 1, resting in hand removes 1, and at ${limit} they leave for the rest of the run.`,
  wonTitle: `${NAMES.programShort} is complete`,
  wonText: (turn: number, front: number) =>
    `The war ends on turn ${turn}, with ${front} territories still held. ${cap(NAMES.alliance)} will meet at ${NAMES.accord}.`,
  lostTitle: 'The war is lost',
  lostText: (cause: LossCause | null, turn: number, progress: number, goal: number) =>
    `${cause ? LOSS_TEXT[cause] : ''} Turn ${turn}, Progress ${progress}/${goal}.`,
};

export const TYPE_LABEL: Record<CardType, string> = {
  research: 'Research',
  warEffort: 'War Effort',
  security: 'Security',
  people: 'People',
  status: 'Status',
};

export type StatKey = 'secrecy' | 'budget' | 'morale';

export const STAT_LABEL: Record<StatKey, string> = {
  secrecy: 'Secrecy',
  budget: 'Budget',
  morale: 'Morale',
};

/** What each resource means. Shown when you tap it. */
export const STAT_INFO: Record<StatKey, string> = {
  secrecy: `How well ${NAMES.program} stays hidden. Spy Rings and Moles lower it; Security cards restore it; loud research spends it. At 0 the program is exposed and you lose.`,
  budget:
    'Money to run the program. Blockades and big research drain it; favors refill it. At 0 the money runs out and you lose.',
  morale:
    'How hard your people can keep going. At 8+ you draw 1 extra card each turn; at 3 or less you get 1 less Effort. War weariness costs 2 every quarter, losing a scientist to Burnout costs 2, and offensives and overtime wear it down. At 0 the staff walk out and you lose.',
};

const LOSS_TEXT: Record<LossCause, string> = {
  front: `The ${NAMES.enemyShort} reached the capital.`,
  secrecy: `${NAMES.program} was exposed.`,
  budget: 'The money ran out.',
  morale: 'Morale broke. The staff walked out.',
};
