import { describe, expect, it } from 'vitest';
import {
  applyAction,
  burnoutLimitOf,
  canPlay,
  cloneState,
  costOf,
  effectsOf,
  getCard,
  newGame,
  traitsOf,
  whyCantPlay,
} from './game';
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

function skipReward(s: GameState, c: GameContent = content): GameState {
  return s.phase === 'reward' ? applyAction(s, { type: 'chooseReward', id: null }, c) : s;
}

function cardCount(s: GameState): number {
  return s.drawPile.length + s.hand.length + s.discard.length;
}

describe('newGame', () => {
  it('deals a hand of 5 with full Effort and starting resources', () => {
    const s = newGame(content, 1);
    expect(s.hand).toHaveLength(5);
    expect(s.drawPile).toHaveLength(content.directors[0]!.starterDeck.length - 5);
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

  it('whyCantPlay names the reason', () => {
    const s0 = withHand(newGame(content, 1), ['big', 'draw', 'lab']);
    s0.resources.budget = 2;
    s0.resources.morale = 1;
    expect(whyCantPlay(s0, 1000, content)).toBe('budget');
    expect(whyCantPlay(s0, 1001, content)).toBe('morale');
    expect(whyCantPlay(s0, 1002, content)).toBeNull();
    expect(whyCantPlay({ ...s0, effort: 0 }, 1002, content)).toBe('effort');
    expect(whyCantPlay(s0, 9999, content)).toBe('notInHand');
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
          copies: 1,
          fromQuarter: 1,
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
      s = skipReward(applyAction(s, { type: 'endTurn' }, content));
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
        {
          id: 't',
          name: 'T',
          text: '',
          copies: 1,
          fromQuarter: 1,
          effects: [{ type: effect, amount: 99 }],
        },
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
          copies: 1,
          fromQuarter: 1,
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
  it('high Morale draws +1 card; low Morale gives -1 Effort', () => {
    const s0 = newGame(content, 1);
    const at = (morale: number) =>
      applyAction({ ...s0, resources: { ...s0.resources, morale } }, { type: 'endTurn' }, content);
    expect(at(5).effort).toBe(3);
    expect(at(5).hand).toHaveLength(5);
    expect(at(8).effort).toBe(3);
    expect(at(8).hand).toHaveLength(6);
    expect(at(2).effort).toBe(2);
    expect(at(2).hand).toHaveLength(5);
  });

  it('war weariness costs Morale every quarter', () => {
    const c = testContent();
    c.rules.quarterlyMoraleLoss = 1;
    let s = newGame(c, 1);
    for (let i = 0; i < 6; i++) s = skipReward(applyAction(s, { type: 'endTurn' }, c), c);
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

  it('cannot burn out a scientist if the Morale hit would end the run', () => {
    const s0 = withHand(newGame(content, 1), ['ace']);
    s0.burnout = { 1000: 1 };
    s0.resources.morale = 2;
    expect(canPlay(s0, 1000, content)).toBe(false);
  });

  it('a lost scientist never comes back through reshuffles', () => {
    const s0 = withHand(newGame(content, 1), ['ace']);
    s0.burnout = { 1000: 1 };
    let s = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    for (let i = 0; i < 8; i++) {
      s = skipReward(applyAction(s, { type: 'endTurn' }, content));
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

describe('quarterly card picks', () => {
  const atQuarterEnd = (): GameState => ({ ...newGame(content, 1), turn: 3 });

  it('after a quarter ends, 3 distinct non-starter cards are offered before the next turn', () => {
    const s = applyAction(atQuarterEnd(), { type: 'endTurn' }, content);
    expect(s.phase).toBe('reward');
    expect(s.turn).toBe(3);
    expect(s.hand).toHaveLength(0);
    expect(new Set(s.rewardOptions).size).toBe(3);
    for (const id of s.rewardOptions) expect(getCard(content, id).rarity).not.toBe('starter');
  });

  it('no pick after a turn that is not a quarter end', () => {
    expect(applyAction(newGame(content, 1), { type: 'endTurn' }, content).phase).toBe('playing');
  });

  it('picking adds the card to the discard pile and starts the next turn', () => {
    const s1 = applyAction(atQuarterEnd(), { type: 'endTurn' }, content);
    const pick = s1.rewardOptions[0] as string;
    const total = cardCount(s1);
    const s2 = applyAction(s1, { type: 'chooseReward', id: pick }, content);
    expect(s2.phase).toBe('playing');
    expect(s2.turn).toBe(4);
    expect(s2.hand).toHaveLength(5);
    expect(cardCount(s2)).toBe(total + 1);
    expect([...s2.drawPile, ...s2.hand, ...s2.discard].some((c) => c.cardId === pick)).toBe(true);
    expect(s2.rewardOptions).toEqual([]);
  });

  it('skipping adds nothing', () => {
    const s1 = applyAction(atQuarterEnd(), { type: 'endTurn' }, content);
    const s2 = applyAction(s1, { type: 'chooseReward', id: null }, content);
    expect(cardCount(s2)).toBe(cardCount(s1));
    expect(s2.turn).toBe(4);
  });

  it('ignores cards that were not offered, and other actions during the pick', () => {
    const s1 = applyAction(atQuarterEnd(), { type: 'endTurn' }, content);
    const notOffered = content.cards.find((c) => !s1.rewardOptions.includes(c.id))!.id;
    expect(applyAction(s1, { type: 'chooseReward', id: notOffered }, content)).toBe(s1);
    expect(applyAction(s1, { type: 'endTurn' }, content)).toBe(s1);
    expect(
      applyAction(newGame(content, 1), { type: 'chooseReward', id: null }, content).phase,
    ).toBe('playing');
  });
});

describe('exhaust', () => {
  it('an exhaust card is removed for the run after it is played', () => {
    const s0 = withHand(newGame(content, 1), ['r1']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.resources.progress).toBe(5);
    expect(s1.lost.map((c) => c.uid)).toEqual([1000]);
    expect(s1.discard.some((c) => c.uid === 1000)).toBe(false);
  });
});

describe('enemy deck', () => {
  const t = (id: string, copies: number, fromQuarter: number) => ({
    id,
    name: id,
    text: '',
    copies,
    fromQuarter,
    effects: [] as never[],
  });

  it('draws every copy once before reshuffling, so the enemy can be counted', () => {
    const c = testContent({ threats: [t('a', 2, 1), t('b', 1, 1)] });
    let s = newGame(c, 5);
    const seen: string[] = [s.threatId];
    for (let i = 0; i < 2; i++) {
      s = skipReward(applyAction(s, { type: 'endTurn' }, c), c);
      seen.push(s.threatId);
    }
    expect(seen.sort()).toEqual(['a', 'a', 'b']);
  });

  it('later actions join the deck when their quarter starts', () => {
    const c = testContent({ threats: [t('early', 1, 1), t('late', 1, 2)] });
    let s = newGame(c, 1);
    const seen: string[] = [s.threatId];
    for (let i = 0; i < 5; i++) {
      s = skipReward(applyAction(s, { type: 'endTurn' }, c), c);
      seen.push(s.threatId);
    }
    expect(seen.slice(0, 3)).toEqual(['early', 'early', 'early']);
    expect(seen.slice(3)).toContain('late');
  });

  it('loseProgress (Sabotage) sets Progress back', () => {
    const c = testContent({
      threats: [{ ...t('sab', 1, 1), effects: [{ type: 'loseProgress', amount: 3 }] }],
    });
    const s0 = newGame(c, 1);
    s0.resources.progress = 5;
    expect(applyAction(s0, { type: 'endTurn' }, c).resources.progress).toBe(2);
  });
});

describe('the Mole', () => {
  const infiltrator = testContent({
    threats: [
      {
        id: 'inf',
        name: 'Inf',
        text: '',
        copies: 1,
        fromQuarter: 1,
        effects: [{ type: 'addCard', cardId: 'mole', amount: 1 }],
      },
    ],
  });

  it('Infiltrator adds a Mole to your deck', () => {
    const s0 = newGame(infiltrator, 1);
    const total = cardCount(s0);
    const s1 = applyAction(s0, { type: 'endTurn' }, infiltrator);
    expect(cardCount(s1)).toBe(total + 1);
    expect(
      [...s1.drawPile, ...s1.hand, ...s1.discard].filter((c) => c.cardId === 'mole'),
    ).toHaveLength(1);
  });

  it('costs Secrecy if still in hand at end of turn', () => {
    const s0 = withHand(newGame(content, 1), ['mole']);
    expect(applyAction(s0, { type: 'endTurn' }, content).resources.secrecy).toBe(4);
  });

  it('playing it spends Effort and roots it out for good', () => {
    const s0 = withHand(newGame(content, 1), ['mole']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.effort).toBe(2);
    expect(s1.lost.map((c) => c.uid)).toEqual([1000]);
    expect(applyAction(s1, { type: 'endTurn' }, content).resources.secrecy).toBe(5);
  });

  it('is never offered as a pick', () => {
    for (let seed = 0; seed < 30; seed++) {
      const s = applyAction({ ...newGame(content, seed), turn: 3 }, { type: 'endTurn' }, content);
      expect(s.rewardOptions).not.toContain('mole');
    }
  });
});

describe('director rules', () => {
  const withRules = (rules: GameContent['directors'][number]['rules']): GameContent => {
    const c = testContent();
    c.directors = [{ ...c.directors[0]!, rules }];
    return c;
  };

  it('onFirstPlayOfType adds effects to the first card of that type each turn only', () => {
    const c = withRules([
      {
        type: 'onFirstPlayOfType',
        cardType: 'research',
        effects: [{ type: 'addProgress', amount: 2 }],
      },
    ]);
    const s0 = withHand(newGame(c, 1), ['lab', 'lab']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, c);
    expect(s1.resources.progress).toBe(4);
    const s2 = applyAction(s1, { type: 'playCard', uid: 1001 }, c);
    expect(s2.resources.progress).toBe(6);
    const s3 = applyAction(s2, { type: 'endTurn' }, c);
    expect(s3.typesPlayedThisTurn).toEqual([]);
  });

  it('burnoutLimit makes scientists burn out sooner, but never below 1 play', () => {
    const c = withRules([{ type: 'burnoutLimit', amount: -1 }]);
    const s0 = withHand(newGame(c, 1), ['ace']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, c);
    expect(s1.lost.map((x) => x.uid)).toEqual([1000]); // limit 2 - 1 = 1
    const harsh = withRules([{ type: 'burnoutLimit', amount: -5 }]);
    expect(burnoutLimitOf(newGame(harsh, 1), harsh, getCard(harsh, 'ace'))).toBe(1);
  });

  it('newGame uses the chosen director and rejects unknown ones', () => {
    expect(newGame(content, 1, 'd').directorId).toBe('d');
    expect(() => newGame(content, 1, 'nobody')).toThrow(/Unknown director/);
  });
});

describe('facilities', () => {
  const own = (c: GameContent, ...ids: string[]): GameState => ({
    ...newGame(c, 1),
    facilities: ids,
  });

  it('onTurnStart applies at the start of each turn', () => {
    const s = applyAction(own(content, 'radar'), { type: 'endTurn' }, content);
    expect(s.fortify).toBe(1);
  });

  it('onQuarterEnd applies at each quarter end', () => {
    const s0 = { ...own(content, 'bonds-office'), turn: 3 };
    const s1 = skipReward(applyAction(s0, { type: 'endTurn' }, content));
    expect(s1.resources.budget).toBe(7);
  });

  it('onFirstPlayOfType fires once per turn per type', () => {
    const s0 = withHand(own(content, 'proving'), ['hold', 'hold']);
    const s1 = applyAction(s0, { type: 'playCard', uid: 1000 }, content);
    expect(s1.fortify).toBe(2);
    const s2 = applyAction(s1, { type: 'playCard', uid: 1001 }, content);
    expect(s2.fortify).toBe(2);
  });

  it('effortBonus and drawBonus raise Effort and hand size', () => {
    const s = applyAction(own(content, 'generator'), { type: 'endTurn' }, content);
    expect(s.effort).toBe(4);
    expect(s.hand).toHaveLength(6);
  });

  it('reduceThreat softens matching enemy hits', () => {
    const c = testContent({
      threats: [
        {
          id: 'b',
          name: 'B',
          text: '',
          copies: 1,
          fromQuarter: 1,
          effects: [{ type: 'loseBudget', amount: 2 }],
        },
      ],
    });
    c.facilities = content.facilities;
    expect(applyAction(own(c, 'batteries'), { type: 'endTurn' }, c).resources.budget).toBe(4);
  });

  it('an opening Facility pick happens on turn 0 before the first hand', () => {
    const c = testContent();
    c.rules.reward.startFacility = true;
    const s0 = newGame(c, 1);
    expect(s0.turn).toBe(0);
    expect(s0.phase).toBe('reward');
    expect(s0.rewardKind).toBe('facility');
    expect(s0.hand).toHaveLength(0);
    const s1 = applyAction(s0, { type: 'chooseReward', id: s0.rewardOptions[0]! }, c);
    expect(s1.turn).toBe(1);
    expect(s1.phase).toBe('playing');
    expect(s1.facilities).toEqual([s0.rewardOptions[0]]);
    expect(s1.hand).toHaveLength(5);
  });

  it('Facility quarters offer Facilities you do not own instead of cards', () => {
    const c = testContent();
    c.rules.reward.facilityQuarters = [1];
    const s0 = { ...own(c, 'radar'), turn: 3 };
    const s1 = applyAction(s0, { type: 'endTurn' }, c);
    expect(s1.rewardKind).toBe('facility');
    expect(s1.rewardOptions).toHaveLength(2);
    expect(s1.rewardOptions).not.toContain('radar');
  });
});

describe('scientist traits', () => {
  const playVet = (s: GameState): GameState =>
    applyAction({ ...withHand(s, ['vet']), effort: 3 }, { type: 'playCard', uid: 1000 }, content);
  const keep = (s: GameState): GameState => ({
    ...s,
    hand: [],
    discard: s.discard.filter((c) => c.uid !== 1000),
  });

  it('earns a merit after enough plays, and its onPlay effect then applies', () => {
    let s = playVet(newGame(content, 1));
    expect(s.scientists[1000]).toEqual({ plays: 1, traits: [] });
    s.burnout = {};
    s = playVet(keep(s));
    expect(s.scientists[1000]?.traits).toEqual(['seasoned']);
    const before = s.resources.progress;
    s.burnout = {};
    s = playVet(keep(s));
    expect(s.resources.progress).toBe(before + 2); // 1 base + 1 Seasoned
    expect(s.scientists[1000]?.traits).toEqual(['seasoned']); // never a second merit
  });

  it('gains a strain when played while tired; Obsessed adds Progress but never rests', () => {
    let s = withHand(newGame(content, 1), ['vet']);
    s.burnout = { 1000: 1 };
    s = applyAction(s, { type: 'playCard', uid: 1000 }, content); // Burnout 2 = strain threshold
    expect(s.scientists[1000]?.traits).toContain('obsessed');
    expect(traitsOf(s, content, 1000).map((t) => t.kind)).toContain('strain');
    // back in hand, unplayed: an Obsessed scientist does not rest
    const s2 = applyAction(
      { ...keep(s), hand: [{ uid: 1000, cardId: 'vet' }] },
      { type: 'endTurn' },
      content,
    );
    expect(s2.burnout[1000]).toBe(2);
  });

  it('traits belong to one copy, not the card', () => {
    const s = playVet(playVet(newGame(content, 1)));
    expect(s.scientists[1000]?.traits.length).toBeGreaterThan(0);
    expect(effectsOf(s, content, 1000, getCard(content, 'vet')).length).toBeGreaterThan(1);
    expect(effectsOf(s, content, 4242, getCard(content, 'vet'))).toHaveLength(1);
  });

  it('costDelta and burnoutLimit trait rules change that copy only', () => {
    const c = testContent();
    c.traits = [
      {
        id: 'quick',
        name: 'Quick',
        kind: 'merit',
        text: '',
        rules: [
          { type: 'costDelta', amount: -1 },
          { type: 'burnoutLimit', amount: 1 },
        ],
      },
    ];
    const s = { ...newGame(c, 1), scientists: { 7: { plays: 3, traits: ['quick'] } } };
    const vet = getCard(c, 'vet');
    expect(costOf(s, c, 7, vet)).toBe(0);
    expect(costOf(s, c, 8, vet)).toBe(1);
    expect(burnoutLimitOf(s, c, vet, 7)).toBe(6);
    expect(burnoutLimitOf(s, c, vet, 8)).toBe(5);
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
        s = skipReward(applyAction(s, { type: 'endTurn' }, content));
      }
      return s;
    };
    expect(play()).toEqual(play());
  });
});
