import type { CardDef } from '@ascendancy/engine';
import { CARD_MOTIF, DEFAULT_PORTRAIT, PORTRAITS, TYPE_MOTIF } from '../art/cardArt';
import { MOTIFS, Portrait } from '../art/motifs';

/** Sunburst wedges radiating from a point: the classic poster backdrop. */
function Sunburst({ cx, cy }: { cx: number; cy: number }) {
  const wedges = 18;
  return (
    <g fill="var(--ink)" opacity="0.13">
      {Array.from({ length: wedges }, (_, i) => {
        if (i % 2) return null;
        const a0 = (i / wedges) * Math.PI * 2;
        const a1 = ((i + 1) / wedges) * Math.PI * 2;
        const r = 160;
        return (
          <path
            key={i}
            d={`M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`}
          />
        );
      })}
    </g>
  );
}

export function CardArt({ card }: { card: CardDef }) {
  const portrait = card.scientist ? (PORTRAITS[card.id] ?? DEFAULT_PORTRAIT) : null;
  const motif = MOTIFS[CARD_MOTIF[card.id] ?? TYPE_MOTIF[card.type]] ?? MOTIFS.bulb!;
  return (
    <svg
      className="card-art grain"
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="120" height="80" fill="var(--tint)" />
      <Sunburst cx={60} cy={portrait ? 30 : 46} />
      {portrait ? <Portrait spec={portrait} /> : motif()}
    </svg>
  );
}
