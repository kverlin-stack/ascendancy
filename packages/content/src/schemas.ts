import { z } from 'zod';
import type {
  CardDef,
  DirectorDef,
  FacilityDef,
  Rules,
  RunRule,
  ThreatDef,
  TraitDef,
} from '@ascendancy/engine';

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are lowercase-kebab-case, e.g. "lab-work"');
const amount = z.number().int();
const cardType = z.enum(['research', 'warEffort', 'security', 'people', 'status']);
const positive = z.number().int().positive();

const effect = <T extends string>(type: T, amt: z.ZodNumber) =>
  z.object({ type: z.literal(type), amount: amt }).strict();

/** Card effect primitives. Negative amounts spend a resource (e.g. gainBudget -2). */
export const CardEffectSchema = z.discriminatedUnion('type', [
  effect('addProgress', positive),
  effect('pushFront', positive),
  effect('fortify', positive),
  effect('gainBudget', amount),
  effect('protectSecrecy', amount),
  effect('gainMorale', amount),
  effect('drawCards', positive),
  effect('restScientists', positive),
  effect('intel', positive),
  z.object({ type: z.literal('delayThreat') }).strict(),
  z.object({ type: z.literal('cancelThreat') }).strict(),
]);

export const ThreatEffectSchema = z.discriminatedUnion('type', [
  effect('advanceFront', positive),
  effect('loseSecrecy', positive),
  effect('loseBudget', positive),
  effect('loseMorale', positive),
  effect('loseProgress', positive),
  z.object({ type: z.literal('addCard'), cardId: id, amount: positive }).strict(),
]);

export const CardSchema: z.ZodType<CardDef> = z
  .object({
    id,
    name: z.string().min(1),
    type: cardType,
    rarity: z.enum(['starter', 'special', 'common', 'uncommon', 'rare']),
    cost: z.number().int().min(0).max(5),
    text: z.string().min(1),
    flavorText: z.string().min(1).max(140).optional(),
    effects: z.array(CardEffectSchema),
    exhaust: z.boolean().optional(),
    inHandAtEndOfTurn: z.array(ThreatEffectSchema).min(1).optional(),
    scientist: z
      .object({ burnoutLimit: z.number().int().min(1).max(9), role: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict()
  .refine((c) => !c.scientist || c.type === 'people', 'scientists must be People cards')
  .refine(
    (c) => c.effects.length > 0 || c.exhaust || c.type === 'status',
    'cards need at least one effect',
  )
  .refine(
    (c) => c.type !== 'status' || c.rarity === 'special',
    'status cards must be rarity "special"',
  );

export const ThreatSchema: z.ZodType<ThreatDef> = z
  .object({
    id,
    name: z.string().min(1),
    text: z.string().min(1),
    copies: z.number().int().min(1).max(9),
    fromQuarter: z.number().int().min(1),
    effects: z.array(ThreatEffectSchema).min(1),
  })
  .strict();

export const RulesSchema: z.ZodType<Rules> = z
  .object({
    handSize: positive,
    effortPerTurn: positive,
    progressGoal: positive,
    frontTerritories: positive,
    turnsPerQuarter: positive,
    quartersPerYear: positive,
    advanceByYear: z.array(z.number().int().min(0)).min(1),
    morale: z
      .object({
        high: positive,
        highDrawBonus: z.number().int().min(0),
        low: positive,
        lowEffortPenalty: z.number().int().min(0),
      })
      .strict(),
    quarterlyMoraleLoss: z.number().int().min(0),
    burnoutMoraleLoss: z.number().int().min(0),
    traits: z.object({ meritAfterPlays: positive, strainAtBurnout: positive }).strict(),
    reward: z
      .object({
        choices: positive,
        weights: z
          .object({
            common: z.number().min(0),
            uncommon: z.number().min(0),
            rare: z.number().min(0),
          })
          .strict(),
        facilityChoices: positive,
        startFacility: z.boolean(),
        facilityQuarters: z.array(positive),
      })
      .strict(),
    start: z.object({ budget: positive, secrecy: positive, morale: positive }).strict(),
    max: z.object({ secrecy: positive, morale: positive }).strict(),
  })
  .strict();

/** Run-wide rules, shared by Directors and Facilities. */
export const RunRuleSchema: z.ZodType<RunRule> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('onTurnStart'), effects: z.array(CardEffectSchema).min(1) }).strict(),
  z.object({ type: z.literal('onQuarterEnd'), effects: z.array(CardEffectSchema).min(1) }).strict(),
  z
    .object({
      type: z.literal('onFirstPlayOfType'),
      cardType,
      effects: z.array(CardEffectSchema).min(1),
    })
    .strict(),
  effect('effortBonus', amount),
  effect('drawBonus', amount),
  effect('burnoutLimit', amount),
  z
    .object({
      type: z.literal('reduceThreat'),
      effect: z.enum(['advanceFront', 'loseSecrecy', 'loseBudget', 'loseMorale', 'loseProgress']),
      amount: positive,
    })
    .strict(),
  effect('intel', positive),
]);

export const TraitSchema: z.ZodType<TraitDef> = z
  .object({
    id,
    name: z.string().min(1),
    kind: z.enum(['merit', 'strain']),
    text: z.string().min(1),
    rules: z
      .array(
        z.discriminatedUnion('type', [
          z
            .object({ type: z.literal('onPlay'), effects: z.array(CardEffectSchema).min(1) })
            .strict(),
          effect('costDelta', amount),
          effect('burnoutLimit', amount),
          z.object({ type: z.literal('noRest') }).strict(),
        ]),
      )
      .min(1),
  })
  .strict();

export const FacilitySchema: z.ZodType<FacilityDef> = z
  .object({
    id,
    name: z.string().min(1),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    text: z.string().min(1),
    flavorText: z.string().min(1).max(140).optional(),
    rules: z.array(RunRuleSchema).min(1),
  })
  .strict();

export const DirectorSchema: z.ZodType<DirectorDef> = z
  .object({
    id,
    name: z.string().min(1),
    ruleName: z.string().min(1),
    text: z.string().min(1),
    starterDeck: z.array(id).min(5),
    rules: z.array(RunRuleSchema),
  })
  .strict();
