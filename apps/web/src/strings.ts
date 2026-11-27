import { NAMES } from '@ascendancy/content';
import type { CantPlayReason, CardType, LossCause } from '@ascendancy/engine';

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
  scientist: 'Scientist',
  facility: 'Facility',
  facilitiesTitle: 'Your Facilities',
  facilitiesNone:
    'No Facilities yet. You requisition one at the start of a run and another mid-year.',
  openingPickTitle: 'Requisition a Facility',
  openingPickHint: 'Choose one to start the program. Facilities work for the whole run.',
  facilityPickTitle: (q: number) => `Q${q} report: requisition`,
  facilityPickHint: 'Choose one Facility. It works for the rest of the run.',
  requisition: (name: string) => `Requisition ${name}`,
  turnLabel: (year: number, q: number, turn: number) => `Year ${year} · Q${q} · Turn ${turn}`,
  menu: 'Menu',
  close: 'Close',
  frontTitle: 'The Front',
  frontInfoTitle: 'The Front',
  frontInfo: `Territories still standing between ${NAMES.enemy} and the capital. The ${NAMES.enemyShort} advances every quarter (every 3 turns), and the Advance grows each year. Some orders push it further. Fortify blocks Front loss for one turn; War Effort cards can push it back. At 0 the capital falls and you lose.`,
  fortifyChip: (n: number) => `${n}`,
  advanceChip: (adv: number, turns: number) => `−${adv} in ${turns} turn${turns === 1 ? '' : 's'}`,
  enemyTitle: `${NAMES.enemyShort} orders · at end of turn`,
  ordersLeft: (n: number) => `${n} left`,
  ordersSheetTitle: `${NAMES.enemyShort} orders still to come`,
  ordersSheetHint: 'The deck reshuffles when it runs out. New orders join as the year goes on.',
  play: 'Play',
  effortLabel: 'Effort',
  piles: (deck: number, discard: number, lost: number) =>
    `Deck ${deck} · Discard ${discard}${lost ? ` · Lost ${lost}` : ''}`,
  recruit: (name: string) => `Recruit ${name}`,
  pickOne: 'Tap a card to choose it.',
  howToPlay: 'How to play',
  rules: [
    `Finish ${NAMES.program} (fill the Progress bar) before the ${NAMES.enemyShort} reaches the capital.`,
    'Each turn: spend Effort to play cards, then End Turn. The order in the telegram hits when you end your turn.',
    'If the Front, Secrecy, Budget or Morale hits 0, you lose.',
    'Morale 8+ draws an extra card each turn. Morale 3 or less costs 1 Effort.',
    'Scientists burn out: each play adds 1 Burnout, and at the limit they leave for good. Leave one unplayed in your hand and they rest 1.',
    'After each quarter, recruit a new card.',
  ],
  oneUse: 'ONE USE',
  compromised: 'COMPROMISED',
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

/** Why a card can't be played, in the player's words. */
export const BLOCKED: Record<CantPlayReason, string> = {
  notPlaying: 'Not now',
  notInHand: 'Not in hand',
  effort: 'Not enough Effort',
  unplayable: "Can't be played",
  budget: 'Would drop Budget to 0',
  morale: 'Would drop Morale to 0',
  secrecy: 'Would drop Secrecy to 0',
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
