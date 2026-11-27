# Ascendancy (working title)

A single-player roguelike deckbuilder for phones, told in two acts. The full design is in `docs/BRIEF.md`. Read it before making design decisions; this file is the short version plus how we work.

## The game in one screen

- **Act I: The War (free).** Your nation is losing a decisive global war. Build a deck of scientists, resources and favors and finish Project Sunfire (an abstract superweapon) before the enemy Front reaches your capital. Winning unifies the world.
- **Act II: The Ascent (paid unlock).** The unified world turns to the stars: Orbit, then Survey (pick a habitable world), then Colony. Surviving the colony's first winter is the true ending.
- **Shared turn:** draw 5, spend Effort (3/turn), resolve the telegraphed threat, discard. Between turns there's a branching map: Recruit, Requisition (Facility = relic), Event, Review, Crisis.
- **Act I clock:** the Front, 10 territories. The enemy advances every quarter, and its Advance value climbs each year. War Effort cards push back, at the cost of research.
- **Act I lose states:** Front reaches the capital, or Secrecy, Budget or Morale hits 0. **Win:** Progress track full.
- **Act II clock:** launch windows (stage bosses). Missing one drains Public Will. **Lose:** Public Will or Budget hits 0, or the final window closes.
- **Signature mechanics:** Burnout (overused scientists are lost for the run), the Front, and crew Risk in Act II.
- **Legacy:** winning Act I carries 3 cards, 1 Facility and veteran scientists into Act II.
- **Setting:** fictional alternate mid-century world. No real people, nations or science. The superweapon stays abstract, with no on-screen casualties.

## Design pillars (the tiebreakers)

1. The clock is the enemy.
2. Two acts, one rising story. Act II must feel new, not reskinned.
3. Every run tells a story.
4. Built to be tuned: content is data, logic runs headless, balance by simulation.

## Tech stack

- TypeScript everywhere, in a pnpm workspace monorepo:
  - `packages/engine`: pure game logic. No DOM, no React, no `Math.random`. All randomness goes through a seeded RNG passed in, so the same seed and the same inputs always give the same run.
  - `packages/content`: cards, threats, events, facilities and directors as data files, validated by zod schemas. Balance changes are data edits.
  - `packages/sim`: CLI bot that plays N seeded runs and reports win rate, run length and per-card pick and win stats.
  - `apps/web`: React + Vite UI, portrait and mobile-first, later wrapped with Capacitor for iOS and Android.
- Tests: Vitest. Every engine rule gets a unit test. Content schema validation runs in CI.
- CI: GitHub Actions runs typecheck, tests, content validation and a short sim smoke test on every push. The web app auto-deploys to a preview URL.

## Engine conventions

- Game state is plain serializable data. Actions are applied by pure reducer-style functions: `(state, action, rng) => state`. This makes save/load, replays and simulation free.
- Card effects are composed from a small library of effect primitives referenced in data (e.g. `{ "type": "addProgress", "amount": 3 }`), not one-off code per card. Add a new primitive only when data can't express the effect.
- Never put UI concerns in the engine or game rules in the UI.

## How we work

- Kenny playtests on his phone via the preview URL and sends notes, often from mobile. Keep summaries short and plain. Say what changed and what to try.
- Work in small, playable increments. Every change keeps `main` green and the preview playable.
- After any balance or content change, run the sim and report the before/after numbers.
- Commit messages: imperative, specific ("Add Burnout meter to scientist cards").
- When a design question comes up that the brief doesn't answer, propose an option and flag it rather than stalling. Log decisions in `docs/DECISIONS.md` (date, decision, why).

## Roadmap

0. **Foundation:** monorepo, engine skeleton, seeded RNG, content schema, tests, CI, preview deploy, sim bot. _Gate: a bot can play a full run end to end._
1. **Act I ugly prototype:** one year, ~30 cards, 1 director, the Front, enemy actions, Burnout, placeholder UI. _Gate: the Front and Burnout feel distinct._
2. **Act I vertical slice:** map, events, facilities, first Great Offensive, saves, poster art style on a few cards. _Gate: 5+ outside testers want another run._
3. **Act I complete + Act II prototype** of the launch-window clock. _Gate: Act II feels worth paying for._
4. **Act II build:** stages, crew, destinations, Legacy, colony ending. _Gate: win rates in target ranges._
5. **Launch:** Capacitor builds, free Act I + Act II unlock, store listings.

Current phase: **0**.
