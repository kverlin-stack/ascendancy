# Ascendancy (working title) — Project Brief

Nov 26, 2026 · @Kenny Verlin

## Pitch

**Ascendancy** (working title, TBD) is a single-player roguelike deckbuilder for phones, told in two acts.

In **Act I: The War**, your nation is losing a decisive global war. You build a deck of scientists, resources and political favors, racing to finish a secret superweapon program before the enemy front reaches your capital. Win, and the war ends with the world unified under one banner.

In **Act II: The Ascent** (paid unlock), the unified world turns to the stars. You run the space program: reach orbit, find a habitable world nearby and plant a permanent colony there. That landing is the game's true ending.

The setting is fictional: an invented world with its own nations, people and technology, drawn from our own ideas and public-domain scientific romance (see `docs/WORLD.md`). Its look moves with the story: Act I's war feels early-to-mid 20th century, and Act II jumps ahead to a 1960s-style space age. It takes the proven Slay the Spire / Balatro loop and wraps it in a story whose stakes climb from survival to the stars.

- **Platform:** iOS and Android, portrait, one-handed play. A web build is used for playtesting.
- **Session length:** a run takes 20–40 minutes and can be paused at any point.
- **Target player:** fans of deckbuilders and strategy games (Slay the Spire, Balatro, Civ, Stellaris) who want a story with real stakes, not another fantasy dungeon.

## Pillars and tone

Four pillars decide every design argument. If a feature serves none of them, it gets cut.

1. **The clock is the enemy.** In Act I the clock is the enemy front, advancing every quarter. In Act II it's the launch windows that close if you aren't ready. Every choice trades speed against safety, secrecy or people.
2. **Two acts, one rising story.** War leads to unification, and unification leads to the stars. Act II has to feel like a reward and a new game, with its own clock, cards and ending, not more of Act I.
3. **Every run tells a story.** Events, setbacks and characters should add up to a run you'd want to tell a friend about. ("The front was two territories from the capital when Sunfire came online.")
4. **Built to be tuned.** All content lives in data files, and the game logic runs headless, so we can simulate thousands of runs and balance on numbers, not just gut feel.

**Tone guardrails.** The superweapon stays abstract. It's "Project Sunfire," with no real science, and no casualties are shown on screen. Act I's ending takes a quiet moment on what the war cost before turning hopeful. The fictional world means every person, nation and invention is ours to write.

## Core loop

Both acts share one turn structure: draw 5 cards, spend **Effort** (3 per turn, raised by upgrades) to play them, resolve the telegraphed threat, then discard. Between turns, a branching map offers 2–3 nodes: **Recruit** (add a card), **Requisition** (gain a Facility, which works like a relic), **Event** (a story choice with a tradeoff), **Review** (remove or upgrade a card) or **Crisis** (an elite threat with a big reward). What changes between the acts is the clock, the goal and the cards.

### Act I: The War (free)

**The clock is the Front.** Ten territories stand between the enemy and your capital. Every quarter the enemy advances by its **Advance** value, and that value climbs each year. War Effort cards can hold the line or push it back, but every card spent on the front is one not spent on research.

- **Win:** fill the **Progress** track to complete Project Sunfire.
- **Lose:** the front reaches your capital, or **Secrecy**, **Budget** or **Morale** drops to zero.
- **Enemy actions** are shown a turn ahead: an offensive (front +2), a spy ring (Secrecy hit), a bombing raid (destroys a Facility), a blockade (Budget drain). Counter them or take the hit.
- **Bosses:** each year ends with a **Great Offensive**, a multi-turn enemy push you have to survive while still making progress.
- **Branching:** at the start of a run you pick which research tracks to fund. That choice shapes which cards and bosses show up.
- **Ending:** Sunfire ends the war. A unification epilogue closes Act I and shows the first telescope image of a nearby world, which leads straight into the unlock.

### Act II: The Ascent (paid)

**The clock is the launch windows.** The act has three stages, and each ends at a launch window, which is that stage's boss. Miss a window and you wait for the next one, which drains **Public Will**. Public Will replaces Secrecy and slowly falls whenever you aren't hitting milestones.

1. **Orbit:** first satellite, then a crewed orbit. Boss: the first crewed launch.
2. **Survey:** telescopes and probes reveal candidate worlds. You pick one, and your pick sets the final challenges (a frozen world, a thin atmosphere, hostile native life).
3. **Colony:** build the ship, choose the crew, land, and survive the colony's first winter, which is the final boss.

- **Win:** the colony survives. That's the true ending.
- **Lose:** Public Will or Budget hits zero, or the last window to your chosen world closes.
- **New card types:** Engineering and Mission cards, plus **Crew** (astronauts) who carry **Risk**: a failed mission can lose them for good.
- **Legacy:** winning Act I carries a Legacy into Act II: 3 cards, 1 Facility, and veteran versions of your surviving scientists. Act II can also be started fresh from a preset.

## Systems

| System | What it is | Act I scope | Act II scope |
| --- | --- | --- | --- |
| Cards | Each card has an Effort cost, an effect and an upgraded version. Act I types: Research, War Effort, Security, People. Act II adds Engineering, Mission, Crew. | \~100 | \~80 |
| Resources | Act I: Progress, Front, Secrecy, Budget, Morale. Act II: Readiness, Public Will, Budget, Morale. Effort is the per-turn energy in both. | 5 | 4 |
| Scientists | Fictional named People cards with a passive ability and a Burnout meter. They carry into Act II as veterans. | \~25 | Veterans + \~10 new |
| Crew | Astronaut cards with Risk. A failed mission can lose them permanently. | — | \~15 |
| Directors | The starting character, who sets your starting deck and a run-wide rule. | 3 | 2 |
| Threats | Telegraphed attacks and bosses. Act I: enemy actions and Great Offensives. Act II: launch failures, budget cuts, solar storms and launch-window bosses. | \~40 | \~30 |
| Facilities | Relics: permanent passive effects (a research city, a shipyard, an orbital station). | \~35 | \~25 |
| Events | Story choice scenes with tradeoffs. | \~40 | \~30 |
| Destinations | Candidate worlds, each with its own final challenges. | — | 3 |
| Meta progression | Unlock cards, directors and research tracks, plus difficulty tiers ("Clearance Levels"). | 10 levels | 10 levels |

**Signature mechanics.** **Burnout:** your best scientists are your strongest cards, and the more you lean on them, the closer they get to burning out. That pushes you to build a deep bench. **The Front:** in Act I, defending and researching pull against each other every turn, so the clock is something you can fight, not just watch. Act II swaps the Front for launch windows and adds **Risk** on crew, so it plays differently but feels just as tense.

## Monetization and business model

**Free, ad-supported Act I; one paid unlock.** The download is free and includes all of Act I: the full war campaign, its directors and its Clearance Levels, supported by ads. A one-time purchase (around $5–8) removes ads and opens **Act II: The Ascent** (and future acts or expansions are candidates for the same model). Act I has to be fun and engaging enough that ads are tolerated, and Act I's ending is the sales pitch: the unification epilogue reveals the new world, then offers the unlock.

- **Why it works:** players reach the paywall after finishing a satisfying game, so the unlock feels like buying the sequel and getting rid of ads, not paying a ransom. Because the free part is complete, reviews stay positive. No energy timers.
- **Ad guardrails:** ads only at natural breaks (between runs, or at most between quarters), never mid-turn and never on top of a decision. No ads in the first run. Optional rewarded ads (watch for a reroll of the card picks) are fine; forced ads that block a paused run are not. Ads must never feel like a punishment for losing.
- **The catch:** with all of Act I free, Act II has to be clearly bigger and different, or people won't convert. Pillar 2 exists for this reason.
- **Expansions later:** new destinations and colony scenarios for Act II, or a future Act III that goes beyond the first colony, sold as paid packs.
- **Subscription stores:** pitch Apple Arcade and Google Play Pass once there's a polished vertical slice.
- **Marketing angle:** the war-to-the-stars arc and the retro-futurist look are the hook. Fans of space and strategy games (Stellaris, Kerbal Space Program, Civ) are the core audience.

## Tech approach

**Web-first TypeScript, wrapped for the app stores.** Every change can be played on your phone in a browser within minutes, wherever you are. When it's time to ship, the same code gets wrapped as an iOS and Android app.

| Layer | Choice | Why |
| --- | --- | --- |
| Game engine | Pure TypeScript, deterministic, seeded RNG, no UI code | Testable, replayable, and simulatable without a screen |
| Content | Cards, threats, events and facilities as data files, checked by a schema | New content and balance changes are data edits, not code changes |
| Simulator | A command-line bot that plays thousands of runs and reports win rates and card pick/win stats | Balancing on numbers (pillar 4) |
| UI | React + Vite with CSS/Framer Motion animations, portrait layout | Cards are mostly UI, so no full game engine is needed |
| Mobile | Capacitor wrap for iOS and Android | One codebase. iOS builds run locally in Xcode on your Mac; Android builds in Android Studio |
| Saves | Local storage first, cloud save later | Mid-run saves from day one, because phone sessions get interrupted |
| Repo and preview | GitHub repo, auto-deployed preview URL on every push | Playtest from your phone right away |

**Working rhythm:** you play a build on your phone and send notes. I turn the notes into issues, build them, run the simulator to check balance, then push a new preview. Unit tests cover all engine rules, so new features don't quietly break old ones.

**Art plan: the style changes with the story.** Act I uses a wartime propaganda-poster look: bold flat shapes, two or three ink colors and screen-print grain. Act II switches to bright 1960s retro-futurist space posters, with chrome, starfields and optimism. That switch makes the paywall feel like stepping into a new world.

- **Prototype art:** I'll build a consistent card design system (frames, typography, palettes) with generated vector art: silhouettes, icons and geometric scenes in that poster style. Flat poster art is unusually well suited to code-generated vector graphics, so the game can look intentional from early on, not like placeholder boxes.
- **Commissioned art:** if you're loving it, hire an illustrator for the scientist and crew portraits, the key art and the store screenshots. The style guide we build becomes their brief, and their work slots into the same card frames.

## Milestones

There are six phases, each ending in a gate. Two gates matter most: Phase 1 proves Act I's core feels distinct, and Phase 3 proves Act II is worth paying for, before we build it out.

&#91;embedded content: roadmap · 5 phases, 4 gates\]

We start with Phase 0. There's a build you can play on your phone at every step from Phase 1 on, and the pace is up to you.

## Open questions and risks

- [ ] **Name:** "Ascendancy" is the front-runner, but there's an older 4X strategy game with the same name. Check the App Store and trademarks before committing.
- [ ] **World names:** names for the nations, the enemy, Project Sunfire and the new world.
- [ ] **Act II clock:** launch windows plus Public Will is the proposal. Prototype it early to confirm it's as tense as the Front.
- [ ] **Free/paid split:** all of Act I free (current plan), or hold back its top Clearance Levels as part of the unlock?
- [ ] **Burnout tuning:** does it feel like a fun tradeoff or a punishment? Prototype it first.
- [ ] **iOS build path:** builds run locally in Xcode. Sign up for an Apple Developer account before the first TestFlight build.
- [ ] **Artist:** when to commission, for which pieces, and on what budget.

**Risks:**

- **Act II has to earn the money.** If it plays like Act I with new art, players won't pay. Its clock, card types and ending have to feel new, so we prototype the Act II clock before Act I is finished, not after.
- **Fun gap.** Phase 1 has to prove the Front and Burnout feel different from other deckbuilders, or we change the core before building content.
- **Scope creep.** Two acts means roughly twice the content. Because content is data-driven, we can launch with fewer destinations and cards and grow after launch.
- **Theme.** The superweapon stays abstract and the setting is fictional. Store-listing copy still gets a once-over for tone.
