import { describe, expect, it } from 'vitest';
import { applyAction, canPlay, cloneState, getCard, newGame } from './game';
import { testContent } from './test-fixtures';
import type { GameContent, GameState } from './types';

const content = testContent();

/** Put specific cards in hand so tests don't depend on the shuffle. */
function withHand(state: GameState, cardIds: string[]): GameState {
  const s = cloneState(state);
  s.discard.push(...s.hand);
  s.hand = cardIds.map((cardId, i) => ({ uid: 1000 + i, cardId }));
  return s;
}

function cardCount(s: GameState): number {
  return s.drawPile.length + s.hand.length + s.discard.length;
}

describe('newGame', () => {
  it('deals a hand of 5 with full Effort and starting resources', () => {
    const s = newGame(content, 1);
    expect(s.hand).toHaveLength(5);
    expect(s.drawPile).toHaveLength(content.starterDeck.length - 5);
    expect(s.effort).toBe(3);
    expect(s.turn).toBe(1);
    expect(s.resources).toEqual({ progress: 0, front: 10, secrecy: 5, budget: 5, morale: 5 });
    expect(s.threatId).toBe('quiet');
  });

  it('is deterministic: same seed, same state', () => {
    expect(newGame(content, 'abc')).toEqual(newGame(content, 'abc'));
    expect(newGame(content, 1).hand).not.toEqual(newGame(content, 2).hand);
  });

  it('is plain serializable data', () => {
    const s = newGame(content, 1);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('playCard', () => {
  it('spends Effort, applies effects and discards the card', () => {
    const s0 = withHand(newGame(content, 1), ['lab']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.effort).toBe(2);
    expect(s1.resources.progress).toBe(2);
    expect(s1.hand).toHaveLength(0);
    expect(s1.discard.some((c) => c.uid === 1000)).toBe(true);
  });

  it('does not mutate the input state', () => {
    const s0 = withHand(newGame(content, 1), ['lab']);
    const snapshot = cloneState(s0);
    applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s0).toEqual(snapshot);
  });

  it('rejects cards you cannot afford in Effort', () => {
    const s0 = { ...withHand(newGame(content, 1), ['big']), effort: 1 };
    expect(canPlay(s0, 1000, content)).toBe(false);
    expect(applyAction(s0, { type: 'playCard', uid: 1000 }, content)).toBe(s0);
  });

  it('rejects cards not in hand', () => {
    const s0 = withHand(newGame(content, 1), ['lab']);
    expect(applyAction(s0, { type: 'playCard', uid: 9999 }, content)).toBe(s0);
  });

  it('blocks cards that would spend Budget or Morale to 0', () => {
    const s0 = withHand(newGame(content, 1), ['big', 'draw']);
    s0.resources.budget = 2;
    s0.resources.morale = 1;
    expect(canPlay(s0, 1000, content)).toBe(false);
    expect(canPlay(s0, 1001, content)).toBe(false);
    s0.resources.budget = 3;
    s0.resources.morale = 2;
    expect(canPlay(s0, 1000, content)).toBe(true);
    expect(canPlay(s0, 1001, content)).toBe(true);
  });

  it('pushFront regains territory but never past the starting line', () => {
    const s0 = withHand(newGame(content, 1), ['hold', 'hold']);
    s0.resources.front = 7;
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.resources.front).toBe(9);
    const s2 = applyAction(s1, { type: 'playCard', uid: 1001 }, content);
    expect(s2.resources.front).toBe(10);
  });

  it('protectSecrecy and gainMorale are capped at their max', () => {
    const s0 = withHand(newGame(content, 1), ['cover', 'rally']);
    s0.resources.secrecy = 9;
    s0.resources.morale = 9;
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    const s2 = applyAction(s1, { type: 'playCard', uid: 1001 }, content);
    expect(s2.resources.secrecy).toBe(10);
    expect(s2.resources.morale).toBe(10);
  });

  it('gainBudget adds Budget', () => {
    const s0 = withHand(newGame(content, 1), ['bonds']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.resources.budget).toBe(8);
  });

  it('drawCards draws, reshuffling the discard when the draw pile is empty', () => {
    const s0 = withHand(newGame(content, 1), ['draw']);
    s0.discard.push(...s0.drawPile);
    s0.drawPile = [];
    const total = cardCount(s0);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.hand).toHaveLength(2);
    expect(s1.hand.some((c) => c.uid === 1000)).toBe(false);
    expect(cardCount(s1)).toBe(total);
  });

  it('wins the moment Progress reaches the goal', () => {
    const s0 = withHand(newGame(content, 1), ['lab']);
    s0.resources.progress = 9;
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.resources.progress).toBe(10);
    expect(s1.phase).toBe('won');
    expect(applyAction(s1, { type: 'endTurn' }, content)).toBe(s1);
  });
});

describe('endTurn', () => {
  it('discards the hand, refills Effort and draws 5 for the next turn', () => {
    const s0 = newGame(content, 1);
    const total = cardCount(s0);
    const s1 = applyAction({ ...s0, effort: 0 }, { type: 'endTurn' }, content);
    expect(s1.turn).toBe(2);
    expect(s1.effort).toBe(3);
    expect(s1.hand).toHaveLength(5);
    expect(cardCount(s1)).toBe(total);
  });

  it('resolves the telegraphed enemy action', () => {
    const c: GameContent = testContent({
      threats: [
        {
          id: 'raid',
          name: 'Raid',
          text: '',
          weight: 1,
          effects: [
            { type: 'advanceFront', amount: 2 },
            { type: 'loseSecrecy', amount: 1 },
            { type: 'loseBudget', amount: 1 },
            { type: 'loseMorale', amount: 1 },
          ],
        },
      ],
    });
    const s1 = applyAction(newGame(c, 1), { type: 'endTurn' }, c);
    expect(s1.resources).toMatchObject({ front: 8, secrecy: 4, budget: 4, morale: 4 });
  });

  it('the enemy advances by the yearly Advance value every quarter', () => {
    let s = newGame(content, 1);
    const fronts: number[] = [];
    for (let i = 0; i < 15; i++) {
      s = applyAction(s, { type: 'endTurn' }, content);
      fronts.push(s.resources.front);
    }
    // Year 1 advance 1 at turns 3, 6, 9, 12; year 2 advance 2 at turn 15.
    expect(fronts).toEqual([10, 10, 9, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 6, 4]);
  });

  it('loses when the Front reaches the capital', () => {
    const s0 = newGame(content, 1);
    s0.resources.front = 1;
    s0.turn = 3; // quarter end
    const s1 = applyAction(s0, { type: 'endTurn' }, content);
    expect(s1.phase).toBe('lost');
    expect(s1.lossCause).toBe('front');
  });

  it.each([
    ['secrecy', 'loseSecrecy'],
    ['budget', 'loseBudget'],
    ['morale', 'loseMorale'],
  ] as const)('loses when %s hits 0', (resource, effect) => {
    const c = testContent({
      threats: [
        { id: 't', name: 'T', text: '', weight: 1, effects: [{ type: effect, amount: 99 }] },
      ],
    });
    const s1 = applyAction(newGame(c, 1), { type: 'endTurn' }, c);
    expect(s1.phase).toBe('lost');
    expect(s1.lossCause).toBe(resource);
    expect(applyAction(s1, { type: 'endTurn' }, c)).toBe(s1);
  });
});

describe('fortify', () => {
  const raid = (amount: number): GameContent =>
    testContent({
      threats: [
        {
          id: 'raid',
          name: 'Raid',
          text: '',
          weight: 1,
          effects: [{ type: 'advanceFront', amount }],
        },
      ],
    });

  it('blocks Front loss from the enemy action this turn', () => {
    const c = raid(3);
    const s0 = withHand(newGame(c, 1), ['wall']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, c);
    expect(s1.fortify).toBe(2);
    const s2 = applyAction(s1, { type: 'endTurn' }, c);
    expect(s2.resources.front).toBe(9);
  });

  it('carries over to the quarterly advance, then expires at end of turn', () => {
    const c = raid(1);
    const s0 = withHand(newGame(c, 1), ['wall', 'wall']);
    s0.turn = 3; // quarter end: raid 1 + advance 1 = 2 loss, 4 blocked
    let s = applyAction(s0, { type: 'playCard', uid: 1000 }, c);
    s = applyAction(s, { type: 'playCard', uid: 1001 }, c);
    s = applyAction(s, { type: 'endTurn' }, c);
    expect(s.resources.front).toBe(10);
    expect(s.fortify).toBe(0);
  });
});

describe('morale', () => {
  it('high Morale gives +1 Effort, low Morale gives -1', () => {
    const s0 = newGame(content, 1);
    const at = (morale: number) =>
      applyAction({ ...s0, resources: { ...s0.resources, morale } }, { type: 'endTurn' }, content)
        .effort;
    expect(at(5)).toBe(3);
    expect(at(8)).toBe(4);
    expect(at(2)).toBe(2);
  });

  it('war weariness costs Morale every quarter', () => {
    const c = testContent();
    c.rules.quarterlyMoraleLoss = 1;
    let s = newGame(c, 1);
    for (let i = 0; i < 6; i++) s = applyAction(s, { type: 'endTurn' }, c);
    expect(s.resources.morale).toBe(3);
  });
});

describe('burnout', () => {
  it('each play adds Burnout to that copy only', () => {
    const s0 = withHand(newGame(content, 1), ['ace', 'ace']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.burnout).toEqual({ 1000: 1 });
    expect(s1.discard.some((c) => c.uid === 1000)).toBe(true);
  });

  it('at the limit the scientist is lost for the run and Morale drops', () => {
    const s0 = withHand(newGame(content, 1), ['ace']);
    s0.burnout = { 1000: 1 };
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.resources.progress).toBe(3); // the last play still resolves
    expect(s1.lost.map((c) => c.uid)).toEqual([1000]);
    expect(s1.discard.some((c) => c.uid === 1000)).toBe(false);
    expect(s1.burnout[1000]).toBeUndefined();
    expect(s1.resources.morale).toBe(3);
  });

  it('a lost scientist never comes back through reshuffles', () => {
    const s0 = withHand(newGame(content, 1), ['ace']);
    s0.burnout = { 1000: 1 };
    let s = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    for (let i = 0; i < 8; i++) {
      s = applyAction(s, { type: 'endTurn' }, content);
      expect(s.hand.some((c) => c.uid === 1000)).toBe(false);
    }
  });

  it('a scientist left unplayed in hand rests 1 at end of turn', () => {
    const s0 = withHand(newGame(content, 1), ['ace']);
    s0.burnout = { 1000: 1 };
    const s1 = applyAction(s0, { type: 'endTurn' }, content);
    expect(s1.burnout[1000]).toBeUndefined();
  });

  it('restScientists lowers Burnout across the deck', () => {
    const s0 = withHand(newGame(content, 1), ['leave']);
    s0.burnout = { 1: 1, 2: 3 };
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.burnout).toEqual({ 2: 2 });
  });
});

describe('replays', () => {
  it('the same seed and actions always produce the same run', () => {
    const play = (): GameState => {
      let s = newGame(content, 'replay');
      for (let t = 0; t < 10 && s.phase === 'playing'; t++) {
        for (const inst of [...s.hand]) {
          if (canPlay(s, inst.uid, content) && getCard(content, inst.cardId).type !== 'people') {
            s = applyAction(s, { type: 'playCard', uid: inst.uid }, content);
          }
        }
        s = applyAction(s, { type: 'endTurn' }, content);
      }
      return s;
    };
    expect(play()).toEqual(play());
  });
});
