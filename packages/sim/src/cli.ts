import { parseArgs } from 'node:util';
import { content } from '@ascendancy/content';
import { greedyBot } from './bot';
import { formatReport } from './report';
import { runSims } from './run';

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '1000' },
    seed: { type: 'string', default: '1' },
    verbose: { type: 'boolean', short: 'v', default: false },
    json: { type: 'boolean', default: false },
    'min-win-rate': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`Usage: pnpm sim [--runs N] [--seed S] [--verbose] [--json] [--min-win-rate 0.1]

  --runs           number of runs (default 1000)
  --seed           first seed; run i uses seed+i (default 1)
  --verbose, -v    list the cause of every loss
  --json           print the summary as JSON
  --min-win-rate   exit 1 if the win rate is below this (for CI)`);
  process.exit(0);
}

const runs = Number(values.runs);
const seed = Number(values.seed);
if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(seed)) {
  console.error('--runs must be a positive integer and --seed an integer');
  process.exit(1);
}

const summary = runSims(content, greedyBot, runs, seed);

if (values.json) {
  const { results, ...rest } = summary;
  console.log(
    JSON.stringify(values.verbose ? summary : { ...rest, runsListed: results.length }, null, 2),
  );
} else {
  console.log(
    formatReport(summary, content, { seed, bot: greedyBot.name, verbose: values.verbose }),
  );
}

const stalled = summary.lossCauses['stalled'] ?? 0;
if (stalled > 0) {
  console.error(`\n${stalled} run(s) never finished. That's an engine or bot bug.`);
  process.exit(1);
}
const min = values['min-win-rate'];
if (min !== undefined && summary.winRate < Number(min)) {
  console.error(`\nWin rate ${summary.winRate.toFixed(3)} is below --min-win-rate ${min}.`);
  process.exit(1);
}
