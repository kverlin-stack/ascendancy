import { useLayoutEffect, useState } from 'react';
import { COACH, S } from '../strings';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Guided first turn: spotlights one part of the board at a time with a short note. */
export function Coach({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = COACH[i] ?? COACH[0]!;
  const last = i === COACH.length - 1;

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.target]);

  const next = () => (last ? onDone() : setI(i + 1));
  // Put the note on whichever side of the spotlight has more room.
  const below = box ? box.top + box.height / 2 < window.innerHeight / 2 : true;
  const noteStyle = box
    ? below
      ? { top: box.top + box.height + 12 }
      : { bottom: window.innerHeight - box.top + 12 }
    : { top: '40%' };

  return (
    <div className="coach" onClick={next} role="dialog" aria-modal="true">
      {box && <div className="coach-hole" style={box} />}
      <div className="coach-note grain" style={noteStyle} onClick={(e) => e.stopPropagation()}>
        <p>{step.text}</p>
        <div className="coach-row">
          <span className="coach-count">
            {i + 1} / {COACH.length}
          </span>
          {!last && (
            <button className="skip" onClick={onDone}>
              {S.introSkip}
            </button>
          )}
          <button className="coach-next" onClick={next}>
            {last ? S.coachDone : S.introNext}
          </button>
        </div>
      </div>
    </div>
  );
}
