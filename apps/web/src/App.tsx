import { useEffect, useState } from 'react';
import {
  advanceFor,
  applyAction,
  burnoutLimitOf,
  canPlay,
  getCard,
  getDirector,
  getThreat,
  newGame,
  quarterOf,
  turnsUntilAdvance,
  yearOf,
  type CardType,
  type GameState,
} from '@ascendancy/engine';
import { content } from '@ascendancy/content';
import { loadRun, saveRun } from './save';

const { rules } = content;

const TYPE_LABEL: Record<CardType, string> = {
  research: 'Research',
  warEffort: 'War Effort',
  security: 'Security',
  people: 'People',
  status: 'Status',
};

type StatKey = 'secrecy' | 'budget' | 'morale';

/** What each resource means. Shown when you tap it. */
const STAT_INFO: Record<StatKey, string> = {
  secrecy:
    'How well Project Sunfire stays hidden. Spy Rings lower it; Security cards restore it. At 0 the program is exposed and you lose.',
  budget:
    'Money to run the program. Blockades and big research drain it; favors refill it. At 0 the money runs out and you lose.',
  morale:
    'How hard your people can keep going. At 8+ you get +1 Effort each turn; at 3 or less, -1. War weariness costs 2 every quarter, losing a scientist to Burnout costs 2, and offensives and overtime wear it down. At 0 the staff walk out and you lose.',
};

const LOSS_TEXT: Record<string, string> = {
  front: 'The Front reached the capital.',
  secrecy: 'Secrecy collapsed. The program was exposed.',
  budget: 'The money ran out.',
  morale: 'Morale broke. The staff walked out.',
};

function randomSeed(): number {
  // UI-side only: the engine itself never uses Math.random.
  return Math.floor(Math.random() * 1_000_000);
}

export function App() {
  const [state, setState] = useState<GameState>(() => loadRun() ?? newGame(content, randomSeed()));
  const [info, setInfo] = useState<StatKey | null>(null);
  const [showEnemyDeck, setShowEnemyDeck] = useState(false);
  const [showDirector, setShowDirector] = useState(false);
  const toggleInfo = (key: StatKey) => setInfo((cur) => (cur === key ? null : key));

  useEffect(() => saveRun(state), [state]);

  const act = (action: Parameters<typeof applyAction>[1]) =>
    setState((s) => applyAction(s, action, content));
  const newRun = () => setState(newGame(content, randomSeed()));

  const r = state.resources;
  const director = getDirector(content, state.directorId);
  const threat = getThreat(content, state.threatId);
  const year = yearOf(state.turn, rules);
  const untilAdvance = turnsUntilAdvance(state, rules);
  const nextAdvance = advanceFor(yearOf(state.turn + untilAdvance - 1, rules), rules);

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>Year {year}</strong> · Q{quarterOf(state.turn, rules)} · Turn {state.turn}
        </div>
        <button className="link" onClick={newRun}>
          New run
        </button>
      </header>

      <button className="director" onClick={() => setShowDirector((v) => !v)}>
        {director.name} · <em>{director.ruleName}</em> {showDirector ? '▴' : '▾'}
      </button>
      {showDirector && <p className="stat-info">{director.text}</p>}

      <section className="progress" aria-label="Progress">
        <div className="row">
          <span>Project Sunfire</span>
          <span>
            {r.progress} / {rules.progressGoal}
          </span>
        </div>
        <div className="bar">
          <div style={{ width: `${(100 * r.progress) / rules.progressGoal}%` }} />
        </div>
      </section>

      <section className="stats">
        <Stat
          label="Secrecy"
          value={r.secrecy}
          max={rules.max.secrecy}
          active={info === 'secrecy'}
          onTap={() => toggleInfo('secrecy')}
        />
        <Stat
          label="Budget"
          value={r.budget}
          active={info === 'budget'}
          onTap={() => toggleInfo('budget')}
        />
        <Stat
          label="Morale"
          value={r.morale}
          max={rules.max.morale}
          active={info === 'morale'}
          onTap={() => toggleInfo('morale')}
        />
      </section>
      <p className="stat-info">
        {info ? STAT_INFO[info] : 'If any of these hit 0, you lose. Tap one to learn more.'}
      </p>

      <section className="front" aria-label="The Front">
        <div className="row">
          <span>
            Front: <strong>{r.front}</strong> / {rules.frontTerritories} held
          </span>
          <span className="muted">
            −{nextAdvance} in {untilAdvance} turn{untilAdvance === 1 ? '' : 's'}
          </span>
        </div>
        {state.fortify > 0 && (
          <div className="fortify">
            🛡 Fortified: blocks the next {state.fortify} Front lost this turn
          </div>
        )}
        <div className="territories">
          {Array.from({ length: rules.frontTerritories }, (_, i) => {
            const held = i >= rules.frontTerritories - r.front;
            return <div key={i} className={held ? 'cell held' : 'cell lost'} />;
          })}
          <div className="capital" title="Capital">
            ★
          </div>
        </div>
      </section>

      <section className="threat">
        <span className="muted">Enemy's next move · hits when you end your turn</span>
        <div>
          <strong>{threat.name}</strong>: {threat.text}
        </div>
        <button className="enemy-deck" onClick={() => setShowEnemyDeck((v) => !v)}>
          Enemy deck: {state.enemyDeck.length} left {showEnemyDeck ? '▴' : '▾'}
        </button>
        {showEnemyDeck && (
          <ul className="enemy-list">
            {countBy(state.enemyDeck).map(([id, n]) => (
              <li key={id}>
                {n}× {getThreat(content, id).name}:{' '}
                <span className="muted">{getThreat(content, id).text}</span>
              </li>
            ))}
            {state.enemyDeck.length === 0 && <li className="muted">Reshuffles next turn.</li>}
          </ul>
        )}
      </section>

      <section className="effort" aria-label="Effort">
        Effort{' '}
        {Array.from({ length: state.maxEffort }, (_, i) => (
          <span key={i} className={i < state.effort ? 'pip on' : 'pip'} />
        ))}
        <span className="muted">
          {' '}
          · deck {state.drawPile.length} · discard {state.discard.length}
          {state.lost.length > 0 && ` · lost ${state.lost.length}`}
        </span>
      </section>

      <section className="hand">
        {state.hand.map((inst) => {
          const card = getCard(content, inst.cardId);
          const playable = canPlay(state, inst.uid, content);
          return (
            <button
              key={inst.uid}
              className={`card ${card.type}`}
              disabled={!playable}
              onClick={() => act({ type: 'playCard', uid: inst.uid })}
            >
              <span className="cost">{card.cost}</span>
              <span className="name">{card.name}</span>
              <span className="type">{card.scientist ? 'Scientist' : TYPE_LABEL[card.type]}</span>
              <span className="text">{card.text}</span>
              {card.scientist && (
                <Burnout
                  used={state.burnout[inst.uid] ?? 0}
                  limit={burnoutLimitOf(state, content, card)}
                />
              )}
            </button>
          );
        })}
        {state.hand.length === 0 && <p className="muted">No cards left in hand.</p>}
      </section>

      <ol className="log">
        {state.log.slice(-4).map((line, i) => (
          <li key={state.log.length - 4 + i}>{line}</li>
        ))}
      </ol>

      <footer className="bottom">
        <button className="end-turn" onClick={() => act({ type: 'endTurn' })}>
          End Turn
        </button>
      </footer>

      {state.phase === 'reward' && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel reward">
            <h2>Q{quarterOf(state.turn, rules)} report</h2>
            <p className="muted">Recruit one card into your deck, or skip.</p>
            <div className="hand">
              {state.rewardOptions.map((id) => {
                const card = getCard(content, id);
                return (
                  <button
                    key={id}
                    className={`card ${card.type}`}
                    onClick={() => act({ type: 'chooseReward', cardId: id })}
                  >
                    <span className="cost">{card.cost}</span>
                    <span className="name">{card.name}</span>
                    <span className="type">
                      {card.scientist ? 'Scientist' : TYPE_LABEL[card.type]} · {card.rarity}
                    </span>
                    <span className="text">{card.text}</span>
                    {card.scientist && (
                      <span className="role muted">
                        {card.scientist.role} Burnout {burnoutLimitOf(state, content, card)}.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              className="link skip"
              onClick={() => act({ type: 'chooseReward', cardId: null })}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {(state.phase === 'won' || state.phase === 'lost') && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            <h2>{state.phase === 'won' ? 'Sunfire is complete' : 'The war is lost'}</h2>
            <p>
              {state.phase === 'won'
                ? `The war ends on turn ${state.turn}, with ${r.front} territories still held.`
                : LOSS_TEXT[state.lossCause ?? ''] +
                  ` Turn ${state.turn}, Progress ${r.progress}/${rules.progressGoal}.`}
            </p>
            <button className="end-turn" onClick={newRun}>
              New run
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function countBy(ids: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Burnout meter: filled pips are used up; the last pip is the burnout play. */
function Burnout({ used, limit }: { used: number; limit: number }) {
  const left = limit - used;
  return (
    <span className="burnout" title="Burnout">
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} className={i < used ? 'bpip used' : 'bpip'} />
      ))}
      <span className={left === 1 ? 'warn' : 'muted'}>
        {left === 1 ? 'Burns out if played' : `${left} plays left`}
      </span>
    </span>
  );
}

function Stat({
  label,
  value,
  max,
  active,
  onTap,
}: {
  label: string;
  value: number;
  max?: number;
  active: boolean;
  onTap: () => void;
}) {
  const classes = ['stat', value <= 3 ? 'low' : '', active ? 'active' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} onClick={onTap} aria-expanded={active}>
      <span className="muted">{label} ⓘ</span>
      <strong>
        {value}
        {max !== undefined && <span className="muted">/{max}</span>}
      </strong>
    </button>
  );
}
