import { useEffect, useState } from 'react';
import {
  advanceFor,
  applyAction,
  canPlay,
  getCard,
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

  useEffect(() => saveRun(state), [state]);

  const act = (action: Parameters<typeof applyAction>[1]) =>
    setState((s) => applyAction(s, action, content));
  const newRun = () => setState(newGame(content, randomSeed()));

  const r = state.resources;
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
        <Stat label="Secrecy" value={r.secrecy} max={rules.max.secrecy} />
        <Stat label="Budget" value={r.budget} />
        <Stat label="Morale" value={r.morale} max={rules.max.morale} />
      </section>

      <section className="front" aria-label="The Front">
        <div className="row">
          <span>
            Front: <strong>{r.front}</strong> / {rules.frontTerritories} held
          </span>
          <span className="muted">
            −{nextAdvance} in {untilAdvance} turn{untilAdvance === 1 ? '' : 's'}
          </span>
        </div>
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
        <span className="muted">Enemy this turn</span>
        <div>
          <strong>{threat.name}</strong>: {threat.text}
        </div>
      </section>

      <section className="effort" aria-label="Effort">
        Effort{' '}
        {Array.from({ length: rules.effortPerTurn }, (_, i) => (
          <span key={i} className={i < state.effort ? 'pip on' : 'pip'} />
        ))}
        <span className="muted">
          {' '}
          · deck {state.drawPile.length} · discard {state.discard.length}
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
              <span className="type">{TYPE_LABEL[card.type]}</span>
              <span className="text">{card.text}</span>
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

      {state.phase !== 'playing' && (
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

function Stat({ label, value, max }: { label: string; value: number; max?: number }) {
  const low = value <= 3;
  return (
    <div className={low ? 'stat low' : 'stat'}>
      <span className="muted">{label}</span>
      <strong>
        {value}
        {max !== undefined && <span className="muted">/{max}</span>}
      </strong>
    </div>
  );
}
