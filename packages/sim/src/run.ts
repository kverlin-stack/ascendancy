import { applyAction, newGame, type GameContent, type LossCause } from '@ascendancy/engine';
import type { Bot } from './bot';

export interface RunResult {
  seed: number;
  won: boolean;
  turns: number;
  lossCause: LossCause | 'stalled' | null;
  finalProgress: number;
  cardPlays: Record<string, number>;
}

/** Safety valve so a broken rule can never hang the sim. */
const MAX_ACTIONS = 5000;

export function playRun(content: GameContent, bot: Bot, seed: number): RunResult {
  let s = newGame(content, seed);
  const cardPlays: Record<string, number> = {};
  for (let i = 0; i < MAX_ACTIONS && s.phase === 'playing'; i++) {
    const action = bot.chooseAction(s, content);
    if (action.type === 'playCard') {
      const id = s.hand.find((c) => c.uid === action.uid)?.cardId;
      if (id) cardPlays[id] = (cardPlays[id] ?? 0) + 1;
    }
    const next = applyAction(s, action, content);
    // A bot that keeps choosing illegal plays would loop forever; force the turn on.
    s =
      next === s && action.type === 'playCard'
        ? applyAction(s, { type: 'endTurn' }, content)
        : next;
  }
  return {
    seed,
    won: s.phase === 'won',
    turns: s.turn,
    lossCause: s.phase === 'playing' ? 'stalled' : s.lossCause,
    finalProgress: s.resources.progress,
    cardPlays,
  };
}

export interface SimSummary {
  runs: number;
  wins: number;
  winRate: number;
  avgTurns: number;
  avgTurnsWins: number;
  avgTurnsLosses: number;
  lossCauses: Record<string, number>;
  /** Average plays per run of each card, in won and lost runs. */
  cardPlays: Record<string, { wins: number; losses: number }>;
  results: RunResult[];
}

export function runSims(
  content: GameContent,
  bot: Bot,
  runs: number,
  baseSeed: number,
): SimSummary {
  const results: RunResult[] = [];
  for (let i = 0; i < runs; i++) results.push(playRun(content, bot, baseSeed + i));

  const wins = results.filter((r) => r.won);
  const losses = results.filter((r) => !r.won);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const lossCauses: Record<string, number> = {};
  for (const r of losses)
    lossCauses[r.lossCause ?? 'unknown'] = (lossCauses[r.lossCause ?? 'unknown'] ?? 0) + 1;

  const cardPlays: Record<string, { wins: number; losses: number }> = {};
  for (const card of content.cards) {
    const per = (rs: RunResult[]) => avg(rs.map((r) => r.cardPlays[card.id] ?? 0));
    cardPlays[card.id] = { wins: per(wins), losses: per(losses) };
  }

  return {
    runs,
    wins: wins.length,
    winRate: runs ? wins.length / runs : 0,
    avgTurns: avg(results.map((r) => r.turns)),
    avgTurnsWins: avg(wins.map((r) => r.turns)),
    avgTurnsLosses: avg(losses.map((r) => r.turns)),
    lossCauses,
    cardPlays,
    results,
  };
}
