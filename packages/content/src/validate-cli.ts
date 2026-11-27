import { ContentError, rawContent, validateContent } from './index';

try {
  const c = validateContent(rawContent);
  console.log(
    `Content OK: ${c.cards.length} cards, ${c.threats.length} threats, ${c.directors.length} director(s), ${c.facilities.length} facilities, ${c.traits.length} traits.`,
  );
} catch (err) {
  console.error(err instanceof ContentError ? err.message : err);
  process.exit(1);
}
