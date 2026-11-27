# Ascendancy

Roguelike deckbuilder for phones. Design: [docs/BRIEF.md](docs/BRIEF.md). How we work: [CLAUDE.md](CLAUDE.md). Choices made along the way: [docs/DECISIONS.md](docs/DECISIONS.md).

```bash
pnpm install
pnpm dev              # web app at http://localhost:5173 (also on your LAN for phone testing)
pnpm test             # engine, content and sim tests
pnpm sim --runs 1000 --seed 1   # bot plays 1000 seeded runs (-v lists every loss)
pnpm validate         # check content data files
pnpm typecheck && pnpm lint
```

| Package            | What's in it                                                                 |
| ------------------ | ---------------------------------------------------------------------------- |
| `packages/engine`  | Pure, deterministic game rules. No DOM, no `Math.random`.                    |
| `packages/content` | Cards, threats and rules as JSON, validated by zod. Balance changes go here. |
| `packages/sim`     | Greedy bot and CLI for balance runs.                                         |
| `apps/web`         | React + Vite mobile UI.                                                      |
