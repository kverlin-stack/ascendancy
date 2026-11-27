import { useEffect, useState } from 'react';
import {
  advanceFor,
  applyAction,
  burnoutLimitOf,
  getCard,
  getDirector,
  getThreat,
  newGame,
  quarterOf,
  turnsUntilAdvance,
  whyCantPlay,
  yearOf,
  type Action,
  type CardDef,
  type GameState,
} from '@ascendancy/engine';
import { content } from '@ascendancy/content';
import { loadRun, saveRun } from './save';
import { BLOCKED, S, STAT_INFO, STAT_LABEL, type StatKey } from './strings';
import { Card } from './components/Card';
import { Hand } from './components/Hand';
import { FrontTrack, Gauge, Sheet, StatTag, Telegram } from './components/Board';

const { rules } = content;

type SheetKind =
  { kind: 'stat'; stat: StatKey } | { kind: 'front' } | { kind: 'orders' } | { kind: 'menu' };

function randomSeed(): number {
  // UI-side only: the engine itself never uses Math.random.
  return Math.floor(Math.random() * 1_000_000);
}

export function App() {
  const [state, setState] = useState<GameState>(() => loadRun() ?? newGame(content, randomSeed()));
  const [selected, setSelected] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [flying, setFlying] = useState<{ key: number; card: CardDef } | null>(null);

  useEffect(() => saveRun(state), [state]);

  const act = (action: Action) => setState((s) => applyAction(s, action, content));
  const newRun = () => {
    setSelected(null);
    setSheet(null);
    setState(newGame(content, randomSeed()));
  };

  const play = (uid: number) => {
    const inst = state.hand.find((c) => c.uid === uid);
    if (!inst || whyCantPlay(state, uid, content)) return;
    setFlying({ key: Date.now(), card: getCard(content, inst.cardId) });
    setSelected(null);
    act({ type: 'playCard', uid });
  };

  // Tap once to inspect, tap the same card again to play it.
  const tapCard = (uid: number) => {
    if (selected === uid) play(uid);
    else setSelected(uid);
  };

  const endTurn = () => {
    setSelected(null);
    act({ type: 'endTurn' });
  };

  const r = state.resources;
  const director = getDirector(content, state.directorId);
  const threat = getThreat(content, state.threatId);
  const untilAdvance = turnsUntilAdvance(state, rules);
  const nextAdvance = advanceFor(yearOf(state.turn + untilAdvance - 1, rules), rules);
  const selInst = state.hand.find((c) => c.uid === selected) ?? null;
  const selCard = selInst ? getCard(content, selInst.cardId) : null;
  const selReason = selInst ? whyCantPlay(state, selInst.uid, content) : null;
  const moraleNote =
    r.morale >= rules.morale.high
      ? '+1 draw'
      : r.morale <= rules.morale.low
        ? '−1 Effort'
        : undefined;

  return (
    <main className="app">
      <header className="topbar">
        <span className="turn">
          {S.turnLabel(yearOf(state.turn, rules), quarterOf(state.turn, rules), state.turn)}
        </span>
        <button className="menu-btn" onClick={() => setSheet({ kind: 'menu' })} aria-label={S.menu}>
          ☰
        </button>
      </header>

      <Gauge value={r.progress} goal={rules.progressGoal} />

      <section className="stats">
        <StatTag
          stat="secrecy"
          label={STAT_LABEL.secrecy}
          value={r.secrecy}
          max={rules.max.secrecy}
          onTap={() => setSheet({ kind: 'stat', stat: 'secrecy' })}
        />
        <StatTag
          stat="budget"
          label={STAT_LABEL.budget}
          value={r.budget}
          onTap={() => setSheet({ kind: 'stat', stat: 'budget' })}
        />
        <StatTag
          stat="morale"
          label={STAT_LABEL.morale}
          value={r.morale}
          max={rules.max.morale}
          note={moraleNote}
          onTap={() => setSheet({ kind: 'stat', stat: 'morale' })}
        />
      </section>

      <FrontTrack
        front={r.front}
        total={rules.frontTerritories}
        nextAdvance={nextAdvance}
        turnsUntil={untilAdvance}
        fortify={state.fortify}
        onTap={() => setSheet({ kind: 'front' })}
      />

      <Telegram
        title={S.enemyTitle}
        name={threat.name}
        text={threat.text}
        ordersLeft={state.enemyDeck.length}
        onTap={() => setSheet({ kind: 'orders' })}
      />

      <section className="ticker" aria-live="polite">
        {state.log.slice(-3).map((line, i, arr) => (
          <div
            key={state.log.length - arr.length + i}
            className={line.includes('burned out') ? 'warn' : ''}
          >
            {line}
          </div>
        ))}
      </section>

      <Hand state={state} content={content} selected={selected} onSelect={tapCard} />

      <footer className="bottombar">
        <div className="effort">
          <span className="effort-label">{S.effortLabel}</span>
          <span className="effort-pips">
            {Array.from({ length: state.maxEffort }, (_, i) => (
              <span key={i} className={i < state.effort ? 'pip on' : 'pip'} />
            ))}
          </span>
          <span className="piles">
            {S.piles(state.drawPile.length, state.discard.length, state.lost.length)}
          </span>
        </div>
        <button className="end-turn grain" onClick={endTurn}>
          {S.endTurn}
        </button>
      </footer>

      {selCard && selInst && (
        <div className="inspect" onClick={() => setSelected(null)}>
          <div className="inspect-inner" onClick={(e) => e.stopPropagation()}>
            <Card
              card={selCard}
              size="full"
              burnout={
                selCard.scientist
                  ? {
                      used: state.burnout[selInst.uid] ?? 0,
                      limit: burnoutLimitOf(state, content, selCard),
                    }
                  : undefined
              }
              onClick={() => play(selInst.uid)}
            />
            <button
              className="play-btn grain"
              disabled={!!selReason}
              onClick={() => play(selInst.uid)}
            >
              {selReason ? BLOCKED[selReason] : `${S.play} · ${selCard.cost} ${S.effortLabel}`}
            </button>
          </div>
        </div>
      )}

      {flying && (
        <div className="flying" key={flying.key} onAnimationEnd={() => setFlying(null)}>
          <Card card={flying.card} size="full" />
        </div>
      )}

      {sheet?.kind === 'stat' && (
        <Sheet title={STAT_LABEL[sheet.stat]} onClose={() => setSheet(null)}>
          <p>{STAT_INFO[sheet.stat]}</p>
        </Sheet>
      )}
      {sheet?.kind === 'front' && (
        <Sheet title={S.frontInfoTitle} onClose={() => setSheet(null)}>
          <p>{S.frontInfo}</p>
        </Sheet>
      )}
      {sheet?.kind === 'orders' && (
        <Sheet title={S.ordersSheetTitle} onClose={() => setSheet(null)}>
          <ul className="orders">
            {countBy(state.enemyDeck).map(([id, n]) => (
              <li key={id}>
                <strong>
                  {n}× {getThreat(content, id).name}
                </strong>{' '}
                <span className="dim">{getThreat(content, id).text}</span>
              </li>
            ))}
            {state.enemyDeck.length === 0 && <li className="dim">{S.enemyDeckEmpty}</li>}
          </ul>
          <p className="dim small">{S.ordersSheetHint}</p>
        </Sheet>
      )}
      {sheet?.kind === 'menu' && (
        <Sheet title={director.name} onClose={() => setSheet(null)}>
          <p>
            <strong>{director.ruleName}.</strong> {director.text}
          </p>
          <h3>{S.howToPlay}</h3>
          <ul className="rules-list">
            {S.rules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button className="end-turn grain" onClick={newRun}>
            {S.newRun}
          </button>
        </Sheet>
      )}

      {state.phase === 'reward' && (
        <div className="overlay">
          <div className="reward">
            <h2>{S.rewardTitle(quarterOf(state.turn, rules))}</h2>
            <p className="dim">{S.rewardHint}</p>
            <div className="picks">
              {state.rewardOptions.map((id) => {
                const card = getCard(content, id);
                return (
                  <Card
                    key={id}
                    card={card}
                    size="pick"
                    selected={pick === id}
                    burnout={
                      card.scientist
                        ? { used: 0, limit: burnoutLimitOf(state, content, card) }
                        : undefined
                    }
                    onClick={() => setPick(id)}
                  />
                );
              })}
            </div>
            <p className="pick-detail">
              {pick ? (getCard(content, pick).flavorText ?? '') : S.pickOne}
            </p>
            <button
              className="end-turn grain"
              disabled={!pick}
              onClick={() => {
                act({ type: 'chooseReward', cardId: pick });
                setPick(null);
              }}
            >
              {pick ? S.recruit(getCard(content, pick).name) : S.pickOne}
            </button>
            <button
              className="skip"
              onClick={() => {
                act({ type: 'chooseReward', cardId: null });
                setPick(null);
              }}
            >
              {S.skip}
            </button>
          </div>
        </div>
      )}

      {(state.phase === 'won' || state.phase === 'lost') && (
        <div className="overlay">
          <div className={`gameover grain ${state.phase}`}>
            <h2>{state.phase === 'won' ? S.wonTitle : S.lostTitle}</h2>
            <p>
              {state.phase === 'won'
                ? S.wonText(state.turn, r.front)
                : S.lostText(state.lossCause, state.turn, r.progress, rules.progressGoal)}
            </p>
            <button className="end-turn grain" onClick={newRun}>
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
