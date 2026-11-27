import { z } from 'zod';
import type { GameContent } from '@ascendancy/engine';
import { CardSchema, RulesSchema, StarterDeckSchema, ThreatSchema } from './schemas';

export interface RawContent {
  rules: unknown;
  cards: unknown;
  threats: unknown;
  starterDeck: unknown;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid content:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ContentError';
  }
}

/** Validate raw data files and cross-references. Throws ContentError listing every problem. */
export function validateContent(raw: RawContent): GameContent {
  const problems: string[] = [];
  const parse = <T>(label: string, schema: z.ZodType<T>, value: unknown): T | undefined => {
    const r = schema.safeParse(value);
    if (r.success) return r.data;
    for (const issue of r.error.issues) {
      problems.push(
        `${label}${issue.path.length ? '.' + issue.path.join('.') : ''}: ${issue.message}`,
      );
    }
    return undefined;
  };

  const rules = parse('rules', RulesSchema, raw.rules);
  const cards = parse('cards', z.array(CardSchema).min(1), raw.cards);
  const threats = parse('threats', z.array(ThreatSchema).min(1), raw.threats);
  const starterDeck = parse('starterDeck', StarterDeckSchema, raw.starterDeck);

  if (cards) {
    for (const dup of duplicates(cards.map((c) => c.id)))
      problems.push(`cards: duplicate id "${dup}"`);
  }
  if (threats) {
    for (const dup of duplicates(threats.map((t) => t.id)))
      problems.push(`threats: duplicate id "${dup}"`);
  }
  if (cards && starterDeck) {
    const known = new Set(cards.map((c) => c.id));
    for (const cardId of starterDeck) {
      if (!known.has(cardId)) problems.push(`starterDeck: unknown card "${cardId}"`);
    }
  }
  if (rules && starterDeck && starterDeck.length < rules.handSize) {
    problems.push(`starterDeck: needs at least ${rules.handSize} cards (hand size)`);
  }

  if (problems.length > 0 || !rules || !cards || !threats || !starterDeck) {
    throw new ContentError(problems);
  }
  return { rules, cards, threats, starterDeck };
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) (seen.has(id) ? dups : seen).add(id);
  return [...dups];
}
