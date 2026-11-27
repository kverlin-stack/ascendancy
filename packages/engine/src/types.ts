/**
 * Engine types. Content (packages/content) validates its data files against
 * zod schemas that must produce exactly these shapes.
 */

export type CardType = 'research' | 'warEffort' | 'security' | 'people';

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
  | { type: 'loseMorale'; amount: number };

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
  cost: number;
  text: string;
  effects: CardEffect[];
  /** Present on scientist cards (People cards with a Burnout meter). */
  scientist?: ScientistTraits | undefined;
}

export interface ThreatDef {
  id: string;
  name: string;
  text: string;
  /** Relative chance of being chosen as the next enemy action. */
  weight: number;
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
  /** Morale at or above `high` gives +1 Effort per turn; at or below `low`, -1. */
  moraleEffort: { high: number; low: number };
  /** War weariness: Morale lost at every quarter end. */
  quarterlyMoraleLoss: number;
  /** Morale lost when a scientist burns out. */
  burnoutMoraleLoss: number;
  start: { budget: number; secrecy: number; morale: number };
  max: { secrecy: number; morale: number };
}

export interface GameContent {
  rules: Rules;
  cards: CardDef[];
  threats: ThreatDef[];
  /** Card ids, duplicates allowed. */
  starterDeck: string[];
}

export interface CardInstance {
  uid: number;
  cardId: string;
}

export type Phase = 'playing' | 'won' | 'lost';
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
export const STATE_VERSION = 3;

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  /** 1-based. Each turn is one month. */
  turn: number;
  phase: Phase;
  lossCause: LossCause | null;
  effort: number;
  /** Effort this turn started with (base adjusted by Morale). */
  maxEffort: number;
  /** Front loss blocked for the rest of this turn. */
  fortify: number;
  resources: Resources;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  /** Cards gone for the run (burned-out scientists). */
  lost: CardInstance[];
  /** Burnout per scientist card instance, keyed by uid. */
  burnout: Record<string, number>;
  /** The telegraphed enemy action that resolves when this turn ends. */
  threatId: string;
  nextUid: number;
  log: string[];
}

export type Action = { type: 'playCard'; uid: number } | { type: 'endTurn' };
