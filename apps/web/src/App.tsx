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
  type GameState,
} from '@ascendancy/engine';
import { content } from '@ascendancy/content';
import { loadRun, saveRun } from './save';
import { S, STAT_INFO, STAT_LABEL, TYPE_LABEL, type StatKey } from './strings';

const { rules } = content;

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
          {S.newRun}
        </button>
      </header>

      <button className="director" onClick={() => setShowDirector((v) => !v)}>
        {director.name} · <em>{director.ruleName}</em> {showDirector ? '▴' : '▾'}
      </button>
      {showDirector && <p className="stat-info">{director.text}</p>}

      <section className="progress" aria-label="Progress">
        <div className="row">
          <span>{S.progressLabel}</span>
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
          label={STAT_LABEL.secrecy}
          value={r.secrecy}
          max={rules.max.secrecy}
          active={info === 'secrecy'}
          onTap={() => toggleInfo('secrecy')}
        />
        <Stat
          label={STAT_LABEL.budget}
          value={r.budget}
          active={info === 'budget'}
          onTap={() => toggleInfo('budget')}
        />
        <Stat
          label={STAT_LABEL.morale}
          value={r.morale}
          max={rules.max.morale}
          active={info === 'morale'}
          onTap={() => toggleInfo('morale')}
        />
      </section>
      <p className="stat-info">{info ? STAT_INFO[info] : S.statsHint}</p>

      <section className="front" aria-label="The Front">
        <div className="row">
          <span>
            Front: <strong>{S.frontHeld(r.front, rules.frontTerritories)}</strong>
          </span>
          <span className="muted">
            −{nextAdvance} in {untilAdvance} turn{untilAdvance === 1 ? '' : 's'}
          </span>
        </div>
        {state.fortify > 0 && <div className="fortify">{S.fortified(state.fortify)}</div>}
        <div className="territories">
          {Array.from({ length: rules.frontTerritories }, (_, i) => {
            const held = i >= rules.frontTerritories - r.front;
            return <div key={i} className={held ? 'cell held' : 'cell lost'} />;
          })}
          <div className="capital" title={S.capital}>
            ★
          </div>
        </div>
      </section>

      <section className="threat">
        <span className="muted">{S.enemyNext}</span>
        <div>
          <strong>{threat.name}</strong>: {threat.text}
        </div>
        <button className="enemy-deck" onClick={() => setShowEnemyDeck((v) => !v)}>
          {S.enemyDeck(state.enemyDeck.length)} {showEnemyDeck ? '▴' : '▾'}
        </button>
        {showEnemyDeck && (
          <ul className="enemy-list">
            {countBy(state.enemyDeck).map(([id, n]) => (
              <li key={id}>
                {n}× {getThreat(content, id).name}:{' '}
                <span className="muted">{getThreat(content, id).text}</span>
              </li>
            ))}
            {state.enemyDeck.length === 0 && <li className="muted">{S.enemyDeckEmpty}</li>}
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
              {card.flavorText && <span className="flavor">{card.flavorText}</span>}
              {card.scientist && (
                <Burnout
                  used={state.burnout[inst.uid] ?? 0}
                  limit={burnoutLimitOf(state, content, card)}
                />
              )}
            </button>
          );
        })}
        {state.hand.length === 0 && <p className="muted">{S.emptyHand}</p>}
      </section>

      <ol className="log">
        {state.log.slice(-4).map((line, i) => (
          <li key={state.log.length - 4 + i} className={line.includes('burned out') ? 'warn' : ''}>
            {line}
          </li>
        ))}
      </ol>

      <footer className="bottom">
        <button className="end-turn" onClick={() => act({ type: 'endTurn' })}>
          {S.endTurn}
        </button>
      </footer>

      {state.phase === 'reward' && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel reward">
            <h2>{S.rewardTitle(quarterOf(state.turn, rules))}</h2>
            <p className="muted">{S.rewardHint}</p>
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
                    {card.flavorText && <span className="flavor">{card.flavorText}</span>}
                    {card.scientist && (
                      <span className="role muted">
                        {card.scientist.role}{' '}
                        {S.burnoutReward(burnoutLimitOf(state, content, card))}
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
              {S.skip}
            </button>
          </div>
        </div>
      )}

      {(state.phase === 'won' || state.phase === 'lost') && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            <h2>{state.phase === 'won' ? S.wonTitle : S.lostTitle}</h2>
            <p>
              {state.phase === 'won'
                ? S.wonText(state.turn, r.front)
                : S.lostText(state.lossCause, state.turn, r.progress, rules.progressGoal)}
            </p>
            <button className="end-turn" onClick={newRun}>
              {S.newRun}
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
  const last = used === limit - 1;
  return (
    <span className="burnout">
      <span className="burnout-row">
        <span className={last ? 'warn' : 'muted'}>{S.burnoutLabel(used, limit)}</span>
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={i < used ? 'bpip used' : 'bpip'} />
        ))}
      </span>
      <span className={last ? 'warn' : 'muted'}>
        {last ? S.burnoutLast : used > 0 ? S.burnoutResting : S.burnoutFresh}
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
