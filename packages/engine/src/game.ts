import { advanceFor, isQuarterEnd, yearOf } from './calendar';
import { createRng, seedToState, type Rng } from './rng';
import type {
  Action,
  CardDef,
  CardEffect,
  CardInstance,
  GameContent,
  GameState,
  LossCause,
  ThreatDef,
  ThreatEffect,
} from './types';

/**
 * The reducer. Pure: (state, action, content) => new state. The RNG state is
 * stored in GameState, so a run is fully determined by seed + action list.
 * Illegal actions return the input state unchanged.
 */
export function applyAction(state: GameState, action: Action, content: GameContent): GameState {
  if (state.phase !== 'playing') return state;
  switch (action.type) {
    case 'playCard':
      return canPlay(state, action.uid, content) ? playCard(state, action.uid, content) : state;
    case 'endTurn':
      return endTurn(state, content);
  }
}

export function newGame(content: GameContent, seed: number | string): GameState {
  const seedState = seedToState(seed);
  const rng = createRng(seedState);
  const { rules } = content;
  const deck: CardInstance[] = content.starterDeck.map((cardId, i) => ({ uid: i + 1, cardId }));
  const s: GameState = {
    version: 1,
    seed: seedState,
    rngState: 0,
    turn: 1,
    phase: 'playing',
    lossCause: null,
    effort: rules.effortPerTurn,
    resources: {
      progress: 0,
      front: rules.frontTerritories,
      secrecy: rules.start.secrecy,
      budget: rules.start.budget,
      morale: rules.start.morale,
    },
    drawPile: rng.shuffle(deck),
    hand: [],
    discard: [],
    threatId: '',
    nextUid: deck.length + 1,
    log: [],
  };
  drawCards(s, rules.handSize, rng);
  s.threatId = pickThreat(content, rng).id;
  s.rngState = rng.state;
  return s;
}

export function getCard(content: GameContent, cardId: string): CardDef {
  const card = content.cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Unknown card: ${cardId}`);
  return card;
}

export function getThreat(content: GameContent, threatId: string): ThreatDef {
  const threat = content.threats.find((t) => t.id === threatId);
  if (!threat) throw new Error(`Unknown threat: ${threatId}`);
  return threat;
}

/**
 * A card is playable if it's in hand, you have the Effort, and it wouldn't
 * spend Budget or Morale down to 0 (cards can't make you lose by themselves).
 */
export function canPlay(state: GameState, uid: number, content: GameContent): boolean {
  if (state.phase !== 'playing') return false;
  const inst = state.hand.find((c) => c.uid === uid);
  if (!inst) return false;
  const card = getCard(content, inst.cardId);
  if (card.cost > state.effort) return false;
  let budget = 0;
  let morale = 0;
  let secrecy = 0;
  for (const e of card.effects) {
    if (e.type === 'gainBudget') budget += e.amount;
    if (e.type === 'gainMorale') morale += e.amount;
    if (e.type === 'protectSecrecy') secrecy += e.amount;
  }
  const r = state.resources;
  if (budget < 0 && r.budget + budget <= 0) return false;
  if (morale < 0 && r.morale + morale <= 0) return false;
  if (secrecy < 0 && r.secrecy + secrecy <= 0) return false;
  return true;
}

function playCard(state: GameState, uid: number, content: GameContent): GameState {
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  const idx = s.hand.findIndex((c) => c.uid === uid);
  const [inst] = s.hand.splice(idx, 1) as [CardInstance];
  const card = getCard(content, inst.cardId);
  s.effort -= card.cost;
  for (const effect of card.effects) applyCardEffect(s, effect, content, rng);
  // Discard after effects, so a drawCards reshuffle can't pull the card straight back.
  s.discard.push(inst);
  s.log.push(`T${s.turn}: played ${card.name}`);
  if (s.resources.progress >= content.rules.progressGoal) {
    s.phase = 'won';
    s.log.push(`T${s.turn}: Project Sunfire complete`);
  }
  s.rngState = rng.state;
  return s;
}

function endTurn(state: GameState, content: GameContent): GameState {
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  const { rules } = content;

  // 1. The telegraphed enemy action resolves.
  const threat = getThreat(content, s.threatId);
  for (const effect of threat.effects) applyThreatEffect(s, effect);
  s.log.push(`T${s.turn}: enemy ${threat.name}`);

  // 2. Quarterly enemy advance.
  if (isQuarterEnd(s.turn, rules)) {
    const adv = advanceFor(yearOf(s.turn, rules), rules);
    s.resources.front = Math.max(0, s.resources.front - adv);
    s.log.push(`T${s.turn}: quarterly advance, Front -${adv}`);
  }

  // 3. Lose checks.
  const cause = lossCause(s);
  if (cause) {
    s.phase = 'lost';
    s.lossCause = cause;
    s.log.push(`T${s.turn}: lost (${cause})`);
    s.discard.push(...s.hand);
    s.hand = [];
    s.rngState = rng.state;
    return s;
  }

  // 4. Discard, start the next turn.
  s.discard.push(...s.hand);
  s.hand = [];
  s.turn += 1;
  s.effort = rules.effortPerTurn;
  drawCards(s, rules.handSize, rng);
  s.threatId = pickThreat(content, rng).id;
  s.rngState = rng.state;
  return s;
}

export function lossCause(s: GameState): LossCause | null {
  const r = s.resources;
  if (r.front <= 0) return 'front';
  if (r.secrecy <= 0) return 'secrecy';
  if (r.budget <= 0) return 'budget';
  if (r.morale <= 0) return 'morale';
  return null;
}

function applyCardEffect(s: GameState, e: CardEffect, content: GameContent, rng: Rng): void {
  const r = s.resources;
  const { rules } = content;
  switch (e.type) {
    case 'addProgress':
      r.progress = Math.min(rules.progressGoal, r.progress + e.amount);
      return;
    case 'pushFront':
      r.front = clamp(r.front + e.amount, 0, rules.frontTerritories);
      return;
    case 'gainBudget':
      r.budget = Math.max(0, r.budget + e.amount);
      return;
    case 'protectSecrecy':
      r.secrecy = clamp(r.secrecy + e.amount, 0, rules.max.secrecy);
      return;
    case 'gainMorale':
      r.morale = clamp(r.morale + e.amount, 0, rules.max.morale);
      return;
    case 'drawCards':
      drawCards(s, e.amount, rng);
      return;
  }
}

function applyThreatEffect(s: GameState, e: ThreatEffect): void {
  const r = s.resources;
  switch (e.type) {
    case 'advanceFront':
      r.front = Math.max(0, r.front - e.amount);
      return;
    case 'loseSecrecy':
      r.secrecy = Math.max(0, r.secrecy - e.amount);
      return;
    case 'loseBudget':
      r.budget = Math.max(0, r.budget - e.amount);
      return;
    case 'loseMorale':
      r.morale = Math.max(0, r.morale - e.amount);
      return;
  }
}

/** Draw n cards, reshuffling the discard pile into the draw pile when it runs out. */
function drawCards(s: GameState, n: number, rng: Rng): void {
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discard.length === 0) return;
      s.drawPile = rng.shuffle(s.discard);
      s.discard = [];
    }
    s.hand.push(s.drawPile.pop() as CardInstance);
  }
}

function pickThreat(content: GameContent, rng: Rng): ThreatDef {
  return rng.pickWeighted(content.threats, (t) => t.weight);
}

/**
 * Copy a GameState for the reducer to modify. Card instances are never
 * mutated, only moved between piles, so copying the arrays is enough.
 */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    resources: { ...s.resources },
    drawPile: s.drawPile.slice(),
    hand: s.hand.slice(),
    discard: s.discard.slice(),
    log: s.log.slice(),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
