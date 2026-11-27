import { z } from 'zod';
import type { CardDef, Rules, ThreatDef } from '@ascendancy/engine';

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are lowercase-kebab-case, e.g. "lab-work"');
const amount = z.number().int();
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
]);

export const ThreatEffectSchema = z.discriminatedUnion('type', [
  effect('advanceFront', positive),
  effect('loseSecrecy', positive),
  effect('loseBudget', positive),
  effect('loseMorale', positive),
]);

export const CardSchema: z.ZodType<CardDef> = z
  .object({
    id,
    name: z.string().min(1),
    type: z.enum(['research', 'warEffort', 'security', 'people']),
    cost: z.number().int().min(0).max(5),
    text: z.string().min(1),
    effects: z.array(CardEffectSchema).min(1),
    scientist: z
      .object({ burnoutLimit: z.number().int().min(1).max(9), role: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict()
  .refine((c) => !c.scientist || c.type === 'people', 'scientists must be People cards');

export const ThreatSchema: z.ZodType<ThreatDef> = z
  .object({
    id,
    name: z.string().min(1),
    text: z.string().min(1),
    weight: z.number().positive(),
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
    moraleEffort: z.object({ high: positive, low: positive }).strict(),
    quarterlyMoraleLoss: z.number().int().min(0),
    burnoutMoraleLoss: z.number().int().min(0),
    start: z.object({ budget: positive, secrecy: positive, morale: positive }).strict(),
    max: z.object({ secrecy: positive, morale: positive }).strict(),
  })
  .strict();

export const StarterDeckSchema = z.array(id).min(5);
