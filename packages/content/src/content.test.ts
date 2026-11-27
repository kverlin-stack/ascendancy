import { describe, expect, it } from 'vitest';
import { applyAction, newGame } from '@ascendancy/engine';
import { content, ContentError, rawContent, validateContent } from './index';

describe('content', () => {
  it('the shipped data files are valid', () => {
    expect(() => validateContent(rawContent)).not.toThrow();
    expect(content.cards.length).toBeGreaterThanOrEqual(10);
    expect(content.threats.length).toBeGreaterThanOrEqual(3);
  });

  it('every card type is represented', () => {
    const types = new Set(content.cards.map((c) => c.type));
    expect([...types].sort()).toEqual(['people', 'research', 'security', 'status', 'warEffort']);
  });

  it('rejects unknown effect primitives', () => {
    const cards = [
      {
        id: 'x',
        name: 'X',
        type: 'research',
        cost: 1,
        text: 'x',
        effects: [{ type: 'nuke', amount: 1 }],
      },
    ];
    expect(() => validateContent({ ...rawContent, cards })).toThrow(ContentError);
  });

  it('rejects duplicate ids and unknown starter cards', () => {
    const dupCards = [...(rawContent.cards as object[]), (rawContent.cards as object[])[0]];
    expect(() => validateContent({ ...rawContent, cards: dupCards })).toThrow(/duplicate id/);
    expect(() =>
      validateContent({
        ...rawContent,
        starterDeck: [...(rawContent.starterDeck as string[]), 'ghost'],
      }),
    ).toThrow(/unknown card "ghost"/);
  });

  it('rejects bad field values with a readable path', () => {
    const cards = (rawContent.cards as object[]).map((c, i) => (i === 0 ? { ...c, cost: -1 } : c));
    expect(() => validateContent({ ...rawContent, cards })).toThrow(/cards\.0\.cost/);
  });

  it('a game can start and run a turn with the real content', () => {
    const s = applyAction(newGame(content, 1), { type: 'endTurn' }, content);
    expect(s.turn === 2 || s.phase !== 'playing').toBe(true);
  });
});
