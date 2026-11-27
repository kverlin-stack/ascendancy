import { z } from 'zod';
import type { GameContent } from '@ascendancy/engine';
import { interpolate, leftoverTokens } from './interpolate';
import {
  CardSchema,
  DirectorSchema,
  FacilitySchema,
  RulesSchema,
  ThreatSchema,
  TraitSchema,
} from './schemas';

export interface RawContent {
  rules: unknown;
  cards: unknown;
  threats: unknown;
  directors: unknown;
  facilities: unknown;
  traits: unknown;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid content:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ContentError';
  }
}

/**
 * Fill in {name} tokens, then validate data files and cross-references.
 * Throws ContentError listing every problem.
 */
export function validateContent(input: RawContent): GameContent {
  const raw = interpolate(input);
  const problems: string[] = leftoverTokens(raw);
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
  const directors = parse('directors', z.array(DirectorSchema).min(1), raw.directors);
  const facilities = parse('facilities', z.array(FacilitySchema), raw.facilities);
  if (facilities) {
    for (const dup of duplicates(facilities.map((f) => f.id)))
      problems.push(`facilities: duplicate id "${dup}"`);
  }
  if (
    rules &&
    facilities &&
    rules.reward.startFacility &&
    facilities.length < rules.reward.facilityChoices
  ) {
    problems.push('facilities: not enough Facilities for the opening pick');
  }

  if (cards) {
    for (const dup of duplicates(cards.map((c) => c.id)))
      problems.push(`cards: duplicate id "${dup}"`);
  }
  if (threats) {
    for (const dup of duplicates(threats.map((t) => t.id)))
      problems.push(`threats: duplicate id "${dup}"`);
  }
  if (directors) {
    for (const dup of duplicates(directors.map((d) => d.id)))
      problems.push(`directors: duplicate id "${dup}"`);
  }
  if (cards && directors) {
    const known = new Set(cards.map((c) => c.id));
    for (const d of directors) {
      for (const cardId of d.starterDeck) {
        if (!known.has(cardId))
          problems.push(`director "${d.id}" starterDeck: unknown card "${cardId}"`);
      }
    }
  }
  if (cards && threats) {
    const known = new Set(cards.map((c) => c.id));
    const refs = [
      ...threats.flatMap((t) => t.effects.map((e) => ({ where: `threat "${t.id}"`, e }))),
      ...cards.flatMap((c) =>
        (c.inHandAtEndOfTurn ?? []).map((e) => ({ where: `card "${c.id}"`, e })),
      ),
    ];
    for (const { where, e } of refs) {
      if (e.type === 'addCard' && !known.has(e.cardId))
        problems.push(`${where}: addCard of unknown card "${e.cardId}"`);
    }
    if (!threats.some((t) => t.fromQuarter === 1))
      problems.push('threats: at least one must start in quarter 1');
  }
  if (rules && directors) {
    for (const d of directors) {
      if (d.starterDeck.length < rules.handSize) {
        problems.push(
          `director "${d.id}" starterDeck: needs at least ${rules.handSize} cards (hand size)`,
        );
      }
    }
  }

  const traits = parse('traits', z.array(TraitSchema), raw.traits);
  if (traits) {
    for (const dup of duplicates(traits.map((t) => t.id)))
      problems.push(`traits: duplicate id "${dup}"`);
  }

  if (problems.length > 0 || !rules || !cards || !threats || !directors || !facilities || !traits) {
    throw new ContentError(problems);
  }
  return { rules, cards, threats, directors, facilities, traits };
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) (seen.has(id) ? dups : seen).add(id);
  return [...dups];
}
