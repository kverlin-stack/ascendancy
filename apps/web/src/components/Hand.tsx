import { useLayoutEffect, useRef, useState } from 'react';
import {
  burnoutLimitOf,
  costOf,
  getCard,
  traitsOf,
  whyCantPlay,
  type GameContent,
  type GameState,
} from '@ascendancy/engine';
import { Card } from './Card';
import { BLOCKED } from '../strings';

interface Props {
  state: GameState;
  content: GameContent;
  selected: number | null;
  onSelect: (uid: number) => void;
}

/** Fanned hand: cards overlap when they don't fit, tilted around the center. */
export function Hand({ state, content, selected, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 343, cw: 108 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cw = parseFloat(getComputedStyle(el).getPropertyValue('--card-w')) || 108;
      setBox({ w: el.clientWidth, cw });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = state.hand.length;
  const { cw } = box;
  // Keep a margin so tilted outer cards stay on screen.
  const pad = n > 4 ? 22 : 8;
  const w = box.w - pad * 2;
  const gap = 6;
  const step = n <= 1 ? 0 : Math.min(cw + gap, (w - cw) / (n - 1));
  const start = pad + (w - (cw + step * (n - 1))) / 2;
  const mid = (n - 1) / 2;

  return (
    <div className="hand" ref={ref}>
      {state.hand.map((inst, i) => {
        const card = getCard(content, inst.cardId);
        const reason = whyCantPlay(state, inst.uid, content);
        const off = i - mid;
        const isSel = selected === inst.uid;
        const lift = isSel ? -18 : 0;
        return (
          <Card
            key={inst.uid}
            card={card}
            size="hand"
            selected={isSel}
            blocked={reason ? BLOCKED[reason] : null}
            burnout={
              card.scientist
                ? {
                    used: state.burnout[inst.uid] ?? 0,
                    limit: burnoutLimitOf(state, content, card, inst.uid),
                  }
                : undefined
            }
            cost={costOf(state, content, inst.uid, card)}
            traits={traitsOf(state, content, inst.uid)}
            onClick={() => onSelect(inst.uid)}
            style={{
              position: 'absolute',
              left: start + i * step,
              bottom: 4,
              zIndex: isSel ? 50 : i,
              transform: `translateY(${off * off * 1.6 - (n > 1 ? mid * mid * 1.6 : 0) + lift}px) rotate(${isSel ? 0 : off * 2}deg)`,
              transformOrigin: '50% 100%',
            }}
          />
        );
      })}
    </div>
  );
}
