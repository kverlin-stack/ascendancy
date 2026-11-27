import type { GameContent } from '@ascendancy/engine';
import type { SimSummary } from './run';

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : '0.0') + '%';

export function formatReport(
  sum: SimSummary,
  content: GameContent,
  opts: { seed: number; bot: string; verbose: boolean },
): string {
  const losses = sum.runs - sum.wins;
  const lines: string[] = [];
  lines.push(
    `Ascendancy sim: ${sum.runs} runs, seeds ${opts.seed}-${opts.seed + sum.runs - 1}, bot "${opts.bot}"`,
  );
  lines.push('');
  lines.push(`Win rate             ${pct(sum.wins, sum.runs)}  (${sum.wins}/${sum.runs})`);
  lines.push(
    `Avg turns survived   ${sum.avgTurns.toFixed(1)}  (wins ${sum.avgTurnsWins.toFixed(1)}, losses ${sum.avgTurnsLosses.toFixed(1)})`,
  );
  lines.push(`Scientists burned out ${sum.avgBurnedOut.toFixed(2)} per run`);
  lines.push('');
  lines.push(`Losses by cause (${losses})`);
  const causes = Object.entries(sum.lossCauses).sort((a, b) => b[1] - a[1]);
  if (causes.length === 0) lines.push('  none');
  for (const [cause, n] of causes)
    lines.push(`  ${cause.padEnd(10)} ${String(n).padStart(5)}  ${pct(n, losses).padStart(6)}`);
  lines.push('');
  lines.push('Card plays per run          in wins   in losses');
  for (const card of content.cards) {
    const p = sum.cardPlays[card.id];
    if (!p) continue;
    lines.push(
      `  ${card.name.padEnd(20)} ${p.wins.toFixed(2).padStart(7)}   ${p.losses.toFixed(2).padStart(9)}`,
    );
  }
  lines.push('');
  lines.push('Quarterly picks              offered  picked  win% when picked');
  for (const card of content.cards) {
    const p = sum.picks[card.id];
    if (!p) continue;
    const rate = p.offered ? pct(p.picked, p.offered) : '-';
    const win = p.picked ? pct(p.winRateWhenPicked * 100, 100) : '-';
    lines.push(
      `  ${card.name.padEnd(26)} ${String(p.offered).padStart(5)}  ${rate.padStart(6)}  ${win.padStart(8)}`,
    );
  }
  if (opts.verbose) {
    lines.push('');
    lines.push('Each loss (seed: cause, turn, progress)');
    for (const r of sum.results) {
      if (!r.won)
        lines.push(
          `  ${r.seed}: ${r.lossCause} on turn ${r.turns}, progress ${r.finalProgress}/${content.rules.progressGoal}`,
        );
    }
  }
  return lines.join('\n');
}
