import { applyAction, newGame, type GameContent, type LossCause } from '@ascendancy/engine';
import type { Bot } from './bot';

export interface RunResult {
  seed: number;
  won: boolean;
  turns: number;
  lossCause: LossCause | 'stalled' | null;
  finalProgress: number;
  /** Scientists lost to Burnout this run. */
  burnedOut: number;
  /** Card ids offered and picked at quarterly rewards. */
  offered: string[];
  picked: string[];
  cardPlays: Record<string, number>;
}

/** Safety valve so a broken rule can never hang the sim. */
const MAX_ACTIONS = 5000;

export function playRun(content: GameContent, bot: Bot, seed: number): RunResult {
  let s = newGame(content, seed);
  const cardPlays: Record<string, number> = {};
  const offered: string[] = [];
  const picked: string[] = [];
  const active = () => s.phase === 'playing' || s.phase === 'reward';
  for (let i = 0; i < MAX_ACTIONS && active(); i++) {
    const action = bot.chooseAction(s, content);
    if (action.type === 'chooseReward') {
      offered.push(...s.rewardOptions);
      if (action.cardId) picked.push(action.cardId);
    }
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
    lossCause: active() ? 'stalled' : s.lossCause,
    finalProgress: s.resources.progress,
    burnedOut: s.lost.filter((c) => content.cards.find((d) => d.id === c.cardId)?.scientist).length,
    offered,
    picked,
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
  avgBurnedOut: number;
  lossCauses: Record<string, number>;
  /** Average plays per run of each card, in won and lost runs. */
  cardPlays: Record<string, { wins: number; losses: number }>;
  /** Per card: times offered, times picked, and win rate of runs that picked it. */
  picks: Record<string, { offered: number; picked: number; winRateWhenPicked: number }>;
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

  const picks: SimSummary['picks'] = {};
  for (const card of content.cards) {
    if (card.rarity === 'starter' || card.rarity === 'special') continue;
    const pickedIn = results.filter((r) => r.picked.includes(card.id));
    picks[card.id] = {
      offered: results.reduce((n, r) => n + r.offered.filter((id) => id === card.id).length, 0),
      picked: results.reduce((n, r) => n + r.picked.filter((id) => id === card.id).length, 0),
      winRateWhenPicked: pickedIn.length
        ? pickedIn.filter((r) => r.won).length / pickedIn.length
        : 0,
    };
  }

  return {
    runs,
    wins: wins.length,
    winRate: runs ? wins.length / runs : 0,
    avgTurns: avg(results.map((r) => r.turns)),
    avgTurnsWins: avg(wins.map((r) => r.turns)),
    avgTurnsLosses: avg(losses.map((r) => r.turns)),
    avgBurnedOut: avg(results.map((r) => r.burnedOut)),
    lossCauses,
    cardPlays,
    picks,
    results,
  };
}
