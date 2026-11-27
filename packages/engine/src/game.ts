import { advanceFor, isQuarterEnd, runQuarterOf, yearOf } from './calendar';
import { createRng, seedToState, type Rng } from './rng';
import { STATE_VERSION } from './types';
import type {
  Action,
  CardDef,
  CardEffect,
  CardInstance,
  DirectorDef,
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
  if (state.phase === 'reward') {
    return action.type === 'chooseReward' ? chooseReward(state, action.cardId, content) : state;
  }
  if (state.phase !== 'playing') return state;
  switch (action.type) {
    case 'playCard':
      return canPlay(state, action.uid, content) ? playCard(state, action.uid, content) : state;
    case 'endTurn':
      return endTurn(state, content);
    case 'chooseReward':
      return state;
  }
}

export function newGame(
  content: GameContent,
  seed: number | string,
  directorId: string = content.directors[0]?.id ?? '',
): GameState {
  const seedState = seedToState(seed);
  const rng = createRng(seedState);
  const { rules } = content;
  const director = getDirector(content, directorId);
  const deck: CardInstance[] = director.starterDeck.map((cardId, i) => ({ uid: i + 1, cardId }));
  const s: GameState = {
    version: STATE_VERSION,
    seed: seedState,
    rngState: 0,
    directorId: director.id,
    turn: 1,
    phase: 'playing',
    lossCause: null,
    effort: 0,
    maxEffort: 0,
    fortify: 0,
    researchThisTurn: 0,
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
    rewardOptions: [],
    lost: [],
    burnout: {},
    threatId: '',
    enemyDeck: [],
    nextUid: deck.length + 1,
    log: [],
  };
  s.effort = s.maxEffort = effortForTurn(s, content);
  drawCards(s, rules.handSize, rng);
  s.enemyDeck = rng.shuffle(eligibleThreats(content, 1));
  s.threatId = drawThreat(s, content, rng);
  s.rngState = rng.state;
  return s;
}

/** Effort at the start of a turn: the base, +1 at high Morale, -1 at low Morale. */
export function effortForTurn(s: GameState, content: GameContent): number {
  const { rules } = content;
  const m = s.resources.morale;
  const bonus = m >= rules.moraleEffort.high ? 1 : m <= rules.moraleEffort.low ? -1 : 0;
  return Math.max(1, rules.effortPerTurn + bonus);
}

export function getCard(content: GameContent, cardId: string): CardDef {
  const card = content.cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Unknown card: ${cardId}`);
  return card;
}

export function getDirector(content: GameContent, directorId: string): DirectorDef {
  const d = content.directors.find((x) => x.id === directorId);
  if (!d) throw new Error(`Unknown director: ${directorId}`);
  return d;
}

/** A scientist's Burnout limit after the Director's rules. */
export function burnoutLimitOf(state: GameState, content: GameContent, card: CardDef): number {
  if (!card.scientist) return Infinity;
  let limit = card.scientist.burnoutLimit;
  for (const r of getDirector(content, state.directorId).rules) {
    if (r.type === 'burnoutLimit') limit += r.amount;
  }
  return Math.max(1, limit);
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
  if (card.type === 'status' && card.effects.length === 0 && !card.exhaust) return false;
  let budget = 0;
  let morale = 0;
  let secrecy = 0;
  for (const e of card.effects) {
    if (e.type === 'gainBudget') budget += e.amount;
    if (e.type === 'gainMorale') morale += e.amount;
    if (e.type === 'protectSecrecy') secrecy += e.amount;
  }
  // Burning out a scientist costs Morale too.
  if (card.scientist && (state.burnout[uid] ?? 0) + 1 >= burnoutLimitOf(state, content, card)) {
    morale -= content.rules.burnoutMoraleLoss;
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
  if (card.type === 'research') {
    if (s.researchThisTurn === 0) {
      for (const r of getDirector(content, s.directorId).rules) {
        if (r.type === 'firstResearchBonus') {
          s.resources.progress = Math.min(
            content.rules.progressGoal,
            s.resources.progress + r.amount,
          );
        }
      }
    }
    s.researchThisTurn += 1;
  }
  s.log.push(`T${s.turn}: played ${card.name}`);
  // Discard after effects, so a drawCards reshuffle can't pull the card straight back.
  if (card.scientist) {
    const b = (s.burnout[inst.uid] ?? 0) + 1;
    if (b >= burnoutLimitOf(s, content, card)) {
      s.lost.push(inst);
      delete s.burnout[inst.uid];
      s.resources.morale = Math.max(0, s.resources.morale - content.rules.burnoutMoraleLoss);
      s.log.push(`T${s.turn}: ${card.name} burned out and left the program`);
    } else {
      s.burnout[inst.uid] = b;
      s.discard.push(inst);
    }
  } else if (card.exhaust) {
    s.lost.push(inst);
  } else {
    s.discard.push(inst);
  }
  if (s.resources.progress >= content.rules.progressGoal) {
    s.phase = 'won';
    s.log.push(`T${s.turn}: Progress goal reached`);
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
  for (const effect of threat.effects) applyThreatEffect(s, effect, content, rng);
  s.log.push(`T${s.turn}: enemy ${threat.name}`);

  // 2. Quarterly enemy advance and war weariness.
  if (isQuarterEnd(s.turn, rules)) {
    const adv = advanceFor(yearOf(s.turn, rules), rules);
    loseFront(s, adv);
    s.resources.morale = Math.max(0, s.resources.morale - rules.quarterlyMoraleLoss);
    s.log.push(
      `T${s.turn}: quarterly advance ${adv}, war weariness -${rules.quarterlyMoraleLoss} Morale`,
    );
  }

  // 3. Curses still in hand (e.g. a Mole) take effect.
  for (const inst of s.hand) {
    const card = getCard(content, inst.cardId);
    if (!card.inHandAtEndOfTurn) continue;
    for (const effect of card.inHandAtEndOfTurn) applyThreatEffect(s, effect, content, rng);
    s.log.push(`T${s.turn}: ${card.name} in hand`);
  }

  // 4. Lose checks.
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

  // 5. Fortify expires. Scientists left unplayed in hand rest, then discard.
  s.fortify = 0;
  for (const inst of s.hand) rest(s, inst.uid, 1);
  s.discard.push(...s.hand);
  s.hand = [];

  // 6. After a quarter, offer a card pick before the next turn starts.
  if (isQuarterEnd(s.turn, rules)) {
    s.rewardOptions = pickRewardOptions(content, rng);
    if (s.rewardOptions.length > 0) {
      s.phase = 'reward';
      s.rngState = rng.state;
      return s;
    }
  }
  startNextTurn(s, content, rng);
  s.rngState = rng.state;
  return s;
}

function startNextTurn(s: GameState, content: GameContent, rng: Rng): void {
  s.turn += 1;
  s.researchThisTurn = 0;
  s.effort = s.maxEffort = effortForTurn(s, content);
  drawCards(s, content.rules.handSize, rng);
  // A new quarter shuffles newly unlocked enemy actions into the rest of the enemy deck.
  const rules = content.rules;
  if ((s.turn - 1) % rules.turnsPerQuarter === 0) {
    const q = runQuarterOf(s.turn, rules);
    const added = content.threats.filter((t) => t.fromQuarter === q).flatMap((t) => copiesOf(t));
    if (added.length > 0) s.enemyDeck = rng.shuffle([...s.enemyDeck, ...added]);
  }
  s.threatId = drawThreat(s, content, rng);
}

function copiesOf(t: ThreatDef): string[] {
  return Array.from({ length: t.copies }, () => t.id);
}

/** Every copy of every enemy action unlocked by this run quarter. */
function eligibleThreats(content: GameContent, runQuarter: number): string[] {
  return content.threats.filter((t) => t.fromQuarter <= runQuarter).flatMap(copiesOf);
}

/** Draw the next enemy action, reshuffling the full unlocked enemy deck when it runs out. */
function drawThreat(s: GameState, content: GameContent, rng: Rng): string {
  if (s.enemyDeck.length === 0) {
    s.enemyDeck = rng.shuffle(eligibleThreats(content, runQuarterOf(s.turn, content.rules)));
  }
  const next = s.enemyDeck.pop();
  if (next === undefined) throw new Error('No enemy actions available');
  return next;
}

function chooseReward(state: GameState, cardId: string | null, content: GameContent): GameState {
  if (cardId !== null && !state.rewardOptions.includes(cardId)) return state;
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  if (cardId !== null) {
    s.discard.push({ uid: s.nextUid++, cardId });
    s.log.push(`T${s.turn}: recruited ${getCard(content, cardId).name}`);
  }
  s.rewardOptions = [];
  s.phase = 'playing';
  startNextTurn(s, content, rng);
  s.rngState = rng.state;
  return s;
}

/** Distinct non-starter cards, weighted by rarity. */
export function pickRewardOptions(content: GameContent, rng: Rng): string[] {
  const { weights, choices } = content.rules.reward;
  let pool = content.cards.filter((c) => c.rarity !== 'starter' && c.rarity !== 'special');
  const picks: string[] = [];
  while (picks.length < choices && pool.length > 0) {
    const card = rng.pickWeighted(pool, (c) =>
      c.rarity === 'starter' || c.rarity === 'special' ? 0 : weights[c.rarity],
    );
    picks.push(card.id);
    pool = pool.filter((c) => c.id !== card.id);
  }
  return picks;
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
    case 'fortify':
      s.fortify += e.amount;
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
    case 'restScientists':
      for (const uid of Object.keys(s.burnout)) rest(s, Number(uid), e.amount);
      return;
  }
}

function applyThreatEffect(s: GameState, e: ThreatEffect, content: GameContent, rng: Rng): void {
  const r = s.resources;
  switch (e.type) {
    case 'loseProgress':
      r.progress = Math.max(0, r.progress - e.amount);
      return;
    case 'addCard': {
      getCard(content, e.cardId); // fail loudly on bad data
      for (let i = 0; i < e.amount; i++) s.discard.push({ uid: s.nextUid++, cardId: e.cardId });
      s.discard = rng.shuffle(s.discard);
      return;
    }
    case 'advanceFront':
      loseFront(s, e.amount);
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

/** Lower a scientist's Burnout (no-op for other cards). */
function rest(s: GameState, uid: number, amount: number): void {
  const b = s.burnout[uid];
  if (b === undefined) return;
  if (b - amount <= 0) delete s.burnout[uid];
  else s.burnout[uid] = b - amount;
}

/** Front loss, absorbed first by this turn's Fortify. */
function loseFront(s: GameState, amount: number): void {
  const blocked = Math.min(s.fortify, amount);
  s.fortify -= blocked;
  s.resources.front = Math.max(0, s.resources.front - (amount - blocked));
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
    rewardOptions: s.rewardOptions.slice(),
    enemyDeck: s.enemyDeck.slice(),
    lost: s.lost.slice(),
    burnout: { ...s.burnout },
    log: s.log.slice(),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
