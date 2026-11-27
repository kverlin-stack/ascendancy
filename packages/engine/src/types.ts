/**
 * Engine types. Content (packages/content) validates its data files against
 * zod schemas that must produce exactly these shapes.
 */

export type CardType = 'research' | 'warEffort' | 'security' | 'people' | 'status';

/**
 * 'starter' cards only come from the starting deck and 'special' ones from
 * game effects (e.g. the Mole); the rest can be offered as picks.
 */
export type Rarity = 'starter' | 'special' | 'common' | 'uncommon' | 'rare';

/** Effect primitives a card can use. Negative amounts spend the resource. */
export type CardEffect =
  | { type: 'addProgress'; amount: number }
  | { type: 'pushFront'; amount: number }
  /** Block this much Front loss this turn (enemy action and quarterly advance). */
  | { type: 'fortify'; amount: number }
  | { type: 'gainBudget'; amount: number }
  | { type: 'protectSecrecy'; amount: number }
  | { type: 'gainMorale'; amount: number }
  | { type: 'drawCards'; amount: number }
  /** Remove this much Burnout from every scientist in the deck. */
  | { type: 'restScientists'; amount: number };

/** Effect primitives an enemy action can use. */
export type ThreatEffect =
  | { type: 'advanceFront'; amount: number }
  | { type: 'loseSecrecy'; amount: number }
  | { type: 'loseBudget'; amount: number }
  | { type: 'loseMorale'; amount: number }
  | { type: 'loseProgress'; amount: number }
  /** Shuffle copies of a card (e.g. the Mole) into the player's discard pile. */
  | { type: 'addCard'; cardId: string; amount: number };

export interface ScientistTraits {
  /** Plays before this scientist burns out and is lost for the run. */
  burnoutLimit: number;
  /** One-line flavor: field and personality. */
  role: string;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  cost: number;
  text: string;
  /** Tone per docs/WORLD.md. Shown in italics under the rules text. */
  flavorText?: string | undefined;
  effects: CardEffect[];
  /** Removed for the run after it's played. */
  exhaust?: boolean | undefined;
  /** Applied if the card is still in hand when the turn ends (curses like the Mole). */
  inHandAtEndOfTurn?: ThreatEffect[] | undefined;
  /** Present on scientist cards (People cards with a Burnout meter). */
  scientist?: ScientistTraits | undefined;
}

export interface ThreatDef {
  id: string;
  name: string;
  text: string;
  /** Copies of this action in the enemy deck. */
  copies: number;
  /** Quarter of the run (1 = first quarter) from which it joins the enemy deck. */
  fromQuarter: number;
  effects: ThreatEffect[];
}

export interface Rules {
  handSize: number;
  effortPerTurn: number;
  progressGoal: number;
  /** Territories between the enemy and the capital at the start. */
  frontTerritories: number;
  turnsPerQuarter: number;
  quartersPerYear: number;
  /** Enemy Advance per quarter for year 1, 2, 3...; the last value repeats. */
  advanceByYear: number[];
  /**
   * Morale at or above `high` draws `highDrawBonus` extra cards each turn;
   * at or below `low`, you get `lowEffortPenalty` less Effort.
   */
  morale: { high: number; highDrawBonus: number; low: number; lowEffortPenalty: number };
  /** War weariness: Morale lost at every quarter end. */
  quarterlyMoraleLoss: number;
  /** Morale lost when a scientist burns out. */
  burnoutMoraleLoss: number;
  /** Picks offered between quarters. */
  reward: {
    choices: number;
    weights: { common: number; uncommon: number; rare: number };
    /** Facilities offered per Facility pick. */
    facilityChoices: number;
    /** Offer a Facility pick before the first turn. */
    startFacility: boolean;
    /** Run quarters after which the report offers Facilities instead of cards. */
    facilityQuarters: number[];
  };
  start: { budget: number; secrecy: number; morale: number };
  max: { secrecy: number; morale: number };
}

/** Threat effects a rule can soften. */
export type ReducibleThreat =
  'advanceFront' | 'loseSecrecy' | 'loseBudget' | 'loseMorale' | 'loseProgress';

/** Run-wide rules, shared by Directors and Facilities. */
export type RunRule =
  /** Card effects applied at the start of every turn. */
  | { type: 'onTurnStart'; effects: CardEffect[] }
  /** Card effects applied at every quarter end (after the advance and war weariness). */
  | { type: 'onQuarterEnd'; effects: CardEffect[] }
  /** Card effects added to the first card of a type played each turn. */
  | { type: 'onFirstPlayOfType'; cardType: CardType; effects: CardEffect[] }
  /** Extra Effort every turn. */
  | { type: 'effortBonus'; amount: number }
  /** Extra cards drawn every turn. */
  | { type: 'drawBonus'; amount: number }
  /** Changes every scientist's Burnout limit (negative = burn out sooner). Never below 1. */
  | { type: 'burnoutLimit'; amount: number }
  /** Enemy orders (and curses) of this kind hit for less. */
  | { type: 'reduceThreat'; effect: ReducibleThreat; amount: number }
  /** See this many more upcoming enemy orders. */
  | { type: 'intel'; amount: number };

/** @deprecated alias kept for readability in director data. */
export type DirectorRule = RunRule;

export interface FacilityDef {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  text: string;
  flavorText?: string | undefined;
  rules: RunRule[];
}

export interface DirectorDef {
  id: string;
  name: string;
  /** Short name of the run-wide rule, e.g. "Wartime Footing". */
  ruleName: string;
  text: string;
  /** Card ids, duplicates allowed. */
  starterDeck: string[];
  rules: RunRule[];
}

export interface GameContent {
  rules: Rules;
  cards: CardDef[];
  threats: ThreatDef[];
  directors: DirectorDef[];
  facilities: FacilityDef[];
}

export interface CardInstance {
  uid: number;
  cardId: string;
}

/** 'reward' = waiting for the player to pick a card or Facility (between quarters, or before turn 1). */
export type Phase = 'playing' | 'reward' | 'won' | 'lost';
export type LossCause = 'front' | 'secrecy' | 'budget' | 'morale';

export interface Resources {
  progress: number;
  /** Territories still standing between the enemy and the capital. 0 = capital falls. */
  front: number;
  secrecy: number;
  budget: number;
  morale: number;
}

/** Bump whenever GameState's shape changes, so old saves are dropped instead of misread. */
export const STATE_VERSION = 9;

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  directorId: string;
  /** 1-based. Each turn is one month. 0 while the opening Facility pick is on screen. */
  turn: number;
  phase: Phase;
  lossCause: LossCause | null;
  effort: number;
  /** Effort this turn started with (base adjusted by Morale). */
  maxEffort: number;
  /** Front loss blocked for the rest of this turn. */
  fortify: number;
  /** Card types played so far this turn (for first-of-type rules). */
  typesPlayedThisTurn: CardType[];
  /** Facilities owned, in the order they were gained. */
  facilities: string[];
  resources: Resources;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  /** What the 'reward' phase is offering. */
  rewardKind: 'card' | 'facility';
  /** Card or Facility ids offered in the 'reward' phase. */
  rewardOptions: string[];
  /** Cards gone for the run (burned-out scientists, exhausted cards). */
  lost: CardInstance[];
  /** Burnout per scientist card instance, keyed by uid. */
  burnout: Record<string, number>;
  /** The telegraphed enemy action that resolves when this turn ends. */
  threatId: string;
  /** Enemy actions still to come before the enemy deck reshuffles. */
  enemyDeck: string[];
  nextUid: number;
  log: string[];
}

export type Action =
  | { type: 'playCard'; uid: number }
  | { type: 'endTurn' }
  /** Pick one of the offered cards or Facilities, or null to skip. */
  | { type: 'chooseReward'; id: string | null };
