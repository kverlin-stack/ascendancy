import {
  advanceFor,
  applyAction,
  canPlay,
  getCard,
  getThreat,
  isQuarterEnd,
  yearOf,
  type Action,
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
  for (const e of getThreat(content, state.threatId).effects) {
    if (e.type === 'advanceFront') frontLoss += e.amount;
    if (e.type === 'loseSecrecy') r.secrecy -= e.amount;
    if (e.type === 'loseBudget') r.budget -= e.amount;
    if (e.type === 'loseMorale') r.morale -= e.amount;
  }
  if (isQuarterEnd(state.turn, rules)) {
    frontLoss += advanceFor(yearOf(state.turn, rules), rules);
    r.morale -= rules.quarterlyMoraleLoss;
  }
  r.front -= Math.max(0, frontLoss - state.fortify);

  const reserve = reserves(content);
  let score = r.progress * 1.0;
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
    const base = evaluate(state, content);
    let best: { uid: number; gain: number } | null = null;
    for (const inst of state.hand) {
      if (!canPlay(state, inst.uid, content)) continue;
      const card = getCard(content, inst.cardId);
      const after = applyAction(state, { type: 'playCard', uid: inst.uid }, content);
      let gain = evaluate(after, content) - base;
      for (const e of card.effects) if (e.type === 'drawCards') gain += DRAW_VALUE * e.amount;
      if (gain > 0 && (!best || gain > best.gain)) best = { uid: inst.uid, gain };
    }
    return best ? { type: 'playCard', uid: best.uid } : { type: 'endTurn' };
  },
};
