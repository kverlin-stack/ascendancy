/**
 * Engine types. Content (packages/content) validates its data files against
 * zod schemas that must produce exactly these shapes.
 */

export type CardType = 'research' | 'warEffort' | 'security' | 'people';

/** Effect primitives a card can use. Negative amounts spend the resource. */
export type CardEffect =
  | { type: 'addProgress'; amount: number }
  | { type: 'pushFront'; amount: number }
  | { type: 'gainBudget'; amount: number }
  | { type: 'protectSecrecy'; amount: number }
  | { type: 'gainMorale'; amount: number }
  | { type: 'drawCards'; amount: number };

/** Effect primitives an enemy action can use. */
export type ThreatEffect =
  | { type: 'advanceFront'; amount: number }
  | { type: 'loseSecrecy'; amount: number }
  | { type: 'loseBudget'; amount: number }
  | { type: 'loseMorale'; amount: number };

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  text: string;
  effects: CardEffect[];
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

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  /** 1-based. Each turn is one month. */
  turn: number;
  phase: Phase;
  lossCause: LossCause | null;
  effort: number;
  resources: Resources;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  /** The telegraphed enemy action that resolves when this turn ends. */
  threatId: string;
  nextUid: number;
  log: string[];
}

export type Action = { type: 'playCard'; uid: number } | { type: 'endTurn' };
