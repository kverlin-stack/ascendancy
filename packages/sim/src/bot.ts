import {
  advanceFor,
  applyAction,
  burnoutLimitOf,
  canPlay,
  getCard,
  getFacility,
  getThreat,
  isQuarterEnd,
  yearOf,
  type Action,
  type CardDef,
  type FacilityDef,
  type GameContent,
  type GameState,
} from '@ascendancy/engine';

export interface Bot {
  name: string;
  /** Pick the next action for the current state. */
  chooseAction(state: GameState, content: GameContent): Action;
}

/** Value of drawing one card, since the bot can't see what it will draw. */
const DRAW_VALUE = 1.5;
/** Long-term cost of losing a scientist for the run, beyond the Morale hit. */
const BURNOUT_PENALTY = 6;
/** How much each resource matters when it gets low. Higher = defended harder. */
const DANGER = { front: 24, secrecy: 10, budget: 10, morale: 10 };

/**
 * Score a state from the bot's point of view: Progress is good, and each
 * resource is penalized more steeply as it nears 0 after the telegraphed
 * threat and any quarterly advance resolve.
 */
export function evaluate(state: GameState, content: GameContent): number {
  if (state.phase === 'won') return 1e6;
  if (state.phase === 'lost') return -1e6;
  const { rules } = content;
  const r = { ...state.resources };
  let frontLoss = 0;
  // The telegraphed action, plus any curses (Moles) still in hand, hit at end of turn.
  const incoming = [
    ...getThreat(content, state.threatId).effects,
    ...state.hand.flatMap((c) => getCard(content, c.cardId).inHandAtEndOfTurn ?? []),
  ];
  for (const e of incoming) {
    if (e.type === 'advanceFront') frontLoss += e.amount;
    if (e.type === 'loseSecrecy') r.secrecy -= e.amount;
    if (e.type === 'loseBudget') r.budget -= e.amount;
    if (e.type === 'loseMorale') r.morale -= e.amount;
    if (e.type === 'loseProgress') r.progress = Math.max(0, r.progress - e.amount);
    // A Mole in the deck will keep costing Secrecy.
    if (e.type === 'addCard') r.secrecy -= e.amount;
  }
  if (isQuarterEnd(state.turn, rules)) {
    frontLoss += advanceFor(yearOf(state.turn, rules), rules);
    r.morale -= rules.quarterlyMoraleLoss;
  }
  r.front -= Math.max(0, frontLoss - state.fortify);

  const reserve = reserves(content);
  const curses = [...state.drawPile, ...state.hand, ...state.discard].filter(
    (c) => getCard(content, c.cardId).inHandAtEndOfTurn,
  ).length;
  let score = r.progress * 1.0 - CURSE_VALUE * curses;
  for (const key of ['front', 'secrecy', 'budget', 'morale'] as const) {
    const v = r[key];
    if (v <= 0) return -1e4 + score;
    // Steeper as the value nears 0, plus a margin for the biggest hit that could come next turn.
    score += -DANGER[key] / v - MARGIN * Math.max(0, reserve[key] + 1 - v);
  }
  return score;
}

/** Penalty per point a resource sits inside its safety margin. */
const MARGIN = 3;

const reserveCache = new WeakMap<
  GameContent,
  Record<'front' | 'secrecy' | 'budget' | 'morale', number>
>();

/** The biggest single enemy hit each resource can take, so the bot keeps a cushion. */
function reserves(content: GameContent) {
  const cached = reserveCache.get(content);
  if (cached) return cached;
  const max = { front: 0, secrecy: 0, budget: 0, morale: 0 };
  for (const t of content.threats) {
    for (const e of t.effects) {
      if (e.type === 'advanceFront') max.front = Math.max(max.front, e.amount);
      if (e.type === 'loseSecrecy') max.secrecy = Math.max(max.secrecy, e.amount);
      if (e.type === 'loseBudget') max.budget = Math.max(max.budget, e.amount);
      if (e.type === 'loseMorale') max.morale = Math.max(max.morale, e.amount);
    }
  }
  max.front += Math.max(...content.rules.advanceByYear);
  reserveCache.set(content, max);
  return max;
}

/**
 * Greedy one-step bot: plays whichever affordable card improves the score
 * most, repeats until nothing helps, then ends the turn.
 */
export const greedyBot: Bot = {
  name: 'greedy',
  chooseAction(state, content) {
    if (state.phase === 'reward') return chooseRewardGreedy(state, content);
    const base = evaluate(state, content);
    let best: { uid: number; gain: number } | null = null;
    for (const inst of state.hand) {
      if (!canPlay(state, inst.uid, content)) continue;
      const card = getCard(content, inst.cardId);
      const after = applyAction(state, { type: 'playCard', uid: inst.uid }, content);
      let gain = evaluate(after, content) - base;
      for (const e of card.effects) if (e.type === 'drawCards') gain += DRAW_VALUE * e.amount;
      if (
        card.scientist &&
        (state.burnout[inst.uid] ?? 0) + 1 >= burnoutLimitOf(state, content, card, inst.uid)
      ) {
        gain -= BURNOUT_PENALTY;
      }
      if (gain > 0 && (!best || gain > best.gain)) best = { uid: inst.uid, gain };
    }
    return best ? { type: 'playCard', uid: best.uid } : { type: 'endTurn' };
  },
};

/** Rough worth of one point of each effect, before scaling by need. */
const EFFECT_VALUE: Record<CardDef['effects'][number]['type'], number> = {
  addProgress: 1,
  pushFront: 2.5,
  fortify: 1.6,
  gainBudget: 0.6,
  protectSecrecy: 0.7,
  gainMorale: 0.8,
  drawCards: 1.3,
  restScientists: 1,
};

/** Each curse in the deck counts as this much lost score, so rooting one out is worth Effort. */
export const CURSE_VALUE = 2;

/** Static card score for picks: value per Effort, weighted toward whatever resource is lowest. */
export function cardValue(card: CardDef, state: GameState, content: GameContent): number {
  const r = state.resources;
  const need = (v: number, max: number) => 1 + Math.max(0, (max - v) / max) * 2;
  const scale: Partial<Record<CardDef['effects'][number]['type'], number>> = {
    pushFront: need(r.front, content.rules.frontTerritories),
    fortify: need(r.front, content.rules.frontTerritories),
    protectSecrecy: need(r.secrecy, content.rules.max.secrecy),
    gainMorale: need(r.morale, content.rules.max.morale),
    gainBudget: need(r.budget, content.rules.start.budget),
  };
  let v = 0;
  for (const e of card.effects) {
    const per = EFFECT_VALUE[e.type] * (scale[e.type] ?? 1);
    v += e.amount > 0 ? per * e.amount : EFFECT_VALUE[e.type] * e.amount;
  }
  if (card.exhaust) v *= 0.5;
  if (card.scientist) v *= Math.min(1.2, burnoutLimitOf(state, content, card) / 3.5);
  return v / (card.cost + 1);
}

function chooseRewardGreedy(state: GameState, content: GameContent): Action {
  let best: { id: string; v: number } | null = null;
  for (const id of state.rewardOptions) {
    const v =
      state.rewardKind === 'facility'
        ? facilityValue(getFacility(content, id))
        : cardValue(getCard(content, id), state, content);
    if (!best || v > best.v) best = { id, v };
  }
  // Facilities are always worth taking; weak cards dilute the deck.
  const take = best && (state.rewardKind === 'facility' || best.v > 0.8);
  return { type: 'chooseReward', id: take && best ? best.id : null };
}

/** Rough per-run worth of a Facility, for the bot's picks. */
export function facilityValue(f: FacilityDef): number {
  let v = 0;
  for (const r of f.rules) {
    const effects =
      'effects' in r ? r.effects.reduce((n, e) => n + EFFECT_VALUE[e.type] * e.amount, 0) : 0;
    if (r.type === 'onTurnStart') v += effects * 12;
    if (r.type === 'onFirstPlayOfType') v += effects * 9;
    if (r.type === 'onQuarterEnd') v += effects * 4;
    if (r.type === 'effortBonus') v += r.amount * 20;
    if (r.type === 'drawBonus') v += r.amount * 14;
    if (r.type === 'burnoutLimit') v += r.amount * 6;
    if (r.type === 'reduceThreat') v += r.amount * 8;
    if (r.type === 'intel') v += r.amount * 1;
  }
  return v;
}
