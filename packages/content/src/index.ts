import type { GameContent } from '@ascendancy/engine';
import cards from './data/cards.json';
import rules from './data/rules.json';
import directors from './data/directors.json';
import threats from './data/threats.json';
import { validateContent, type RawContent } from './validate';

export * from './schemas';
export * from './validate';

export const rawContent: RawContent = { rules, cards, threats, directors };

/** The validated Act I content. Throws at import time if any data file is invalid. */
export const content: GameContent = validateContent(rawContent);
