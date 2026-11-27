import { useState } from 'react';
import { MOTIFS } from '../art/motifs';
import { INTRO, S } from '../strings';

/** Story panels shown before the first run: who you are and what's at stake. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const panel = INTRO[i] ?? INTRO[0]!;
  const last = i === INTRO.length - 1;
  const motif = MOTIFS[panel.motif] ?? MOTIFS.sunrise!;
  return (
    <div className="intro" role="dialog" aria-modal="true">
      <div className={`intro-poster grain tint-${panel.tint}`} key={i}>
        <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="120" height="80" fill="var(--tint)" />
          <g fill="var(--ink)" opacity="0.13">
            {Array.from({ length: 9 }, (_, k) => {
              const a0 = ((k * 2) / 18) * Math.PI * 2;
              const a1 = ((k * 2 + 1) / 18) * Math.PI * 2;
              return (
                <path
                  key={k}
                  d={`M60 46 L${60 + 160 * Math.cos(a0)} ${46 + 160 * Math.sin(a0)} L${60 + 160 * Math.cos(a1)} ${46 + 160 * Math.sin(a1)} Z`}
                />
              );
            })}
          </g>
          {motif()}
        </svg>
      </div>
      <div className="intro-text" key={`t${i}`}>
        <p className="intro-kicker">{panel.kicker}</p>
        <h1>{panel.title}</h1>
        <p>{panel.body}</p>
      </div>
      <div className="intro-nav">
        <div className="intro-dots" aria-hidden="true">
          {INTRO.map((_, k) => (
            <span key={k} className={k === i ? 'dot on' : 'dot'} />
          ))}
        </div>
        <button className="end-turn grain" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? S.introStart : S.introNext}
        </button>
        {!last && (
          <button className="skip" onClick={onDone}>
            {S.introSkip}
          </button>
        )}
      </div>
    </div>
  );
}
