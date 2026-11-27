import type { ReactElement } from 'react';

/*
 * Flat poster motifs for card art, drawn in a 120x80 box with 2-3 inks:
 * ink, signal red, paper, plus the card type's tint behind them.
 * Prototype art per docs/WORLD.md; a commissioned artist may replace it.
 */
const I = 'var(--ink)';
const I2 = 'var(--ink-2)';
const R = 'var(--red)';
const P = 'var(--paper)';
const T = 'var(--tint)';

type Motif = () => ReactElement;

function gearPath(cx: number, cy: number, r: number, teeth: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    pts.push(`${cx + rr * Math.cos(a0)},${cy + rr * Math.sin(a0)}`);
    pts.push(`${cx + rr * Math.cos(a1)},${cy + rr * Math.sin(a1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const arrow = (x: number, y: number, len: number, h: number, fill: string) => (
  <path
    d={`M${x} ${y - h * 0.3} h${len - h} v${-h * 0.35} l${h} ${h * 0.65} l${-h} ${h * 0.65} v${-h * 0.35} h${-(len - h)} Z`}
    fill={fill}
  />
);

export const MOTIFS: Record<string, Motif> = {
  chalkboard: () => (
    <g>
      <path d="M34 56 l-8 22 M86 56 l8 22" stroke={I} strokeWidth="3" />
      <rect x="16" y="8" width="88" height="50" fill={I} stroke="var(--paper-3)" strokeWidth="3" />
      <path
        d="M24 22 h10 M38 22 l4 -5 l4 9 l4 -5 M58 20 h16 M24 34 q6 -8 12 0 t12 0 M56 34 h8 m4 0 h10 M26 46 h28 M62 44 l6 5 l6 -5"
        stroke={P}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="90" cy="44" r="5" fill={R} />
    </g>
  ),
  nightShift: () => (
    <g>
      <circle cx="94" cy="18" r="10" fill={P} />
      <circle cx="99" cy="14" r="9" fill={T} />
      <path d="M10 80 V42 h24 V28 h22 V46 h16 V34 h26 V80 Z" fill={I} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <rect key={`${r}${c}`} x={16 + c * 16} y={50 + r * 10} width="6" height="6" fill={I2} />
        )),
      )}
      <rect x="48" y="36" width="6" height="7" fill={R} />
      <rect x="32" y="60" width="6" height="6" fill={P} />
    </g>
  ),
  gearSpark: () => (
    <g>
      <path d={gearPath(50, 46, 28, 10)} fill={I} />
      <circle cx="50" cy="46" r="9" fill={T} />
      <path d="M88 6 l-14 26 h12 l-10 26 l26 -34 h-12 l10 -18 Z" fill={R} />
    </g>
  ),
  sunrise: () => (
    <g>
      <circle cx="60" cy="62" r="34" fill={P} />
      <circle cx="60" cy="62" r="22" fill={R} />
      <rect x="0" y="62" width="120" height="18" fill={I} />
      <path d="M0 62 h120" stroke={P} strokeWidth="2" />
    </g>
  ),
  papers: () => (
    <g>
      <rect
        x="28"
        y="16"
        width="52"
        height="60"
        fill="var(--paper-3)"
        transform="rotate(-8 54 46)"
      />
      <rect x="36" y="12" width="52" height="60" fill={P} stroke={I} strokeWidth="2" />
      <path d="M44 24 h36 M44 32 h36 M44 40 h28 M44 48 h32" stroke={I} strokeWidth="2" />
      <path d="M62 60 l8 8 l18 -24" stroke={R} strokeWidth="6" fill="none" strokeLinecap="square" />
    </g>
  ),
  windTunnel: () => (
    <g>
      <circle cx="30" cy="42" r="26" fill="none" stroke={I} strokeWidth="8" />
      <path
        d="M12 30 q40 -10 96 0 M12 42 q40 -6 96 0 M12 54 q40 6 96 0"
        stroke={P}
        strokeWidth="3"
        fill="none"
      />
      <path d="M58 44 q20 -12 46 -4 q-24 8 -46 4 Z" fill={R} />
    </g>
  ),
  mainframe: () => (
    <g>
      {[14, 46, 78].map((x) => (
        <g key={x}>
          <rect x={x} y="10" width="28" height="66" fill={I} />
          {[0, 1, 2, 3, 4, 5].map((r) =>
            [0, 1, 2].map((c) => (
              <circle
                key={`${r}${c}`}
                cx={x + 7 + c * 7}
                cy={18 + r * 9}
                r="2.2"
                fill={(r * 3 + c + x) % 5 === 0 ? R : P}
              />
            )),
          )}
        </g>
      ))}
    </g>
  ),
  bulb: () => (
    <g>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI + (i / 6) * Math.PI;
        return (
          <path
            key={i}
            d={`M${60 + 30 * Math.cos(a)} ${36 + 30 * Math.sin(a)} L${60 + 44 * Math.cos(a)} ${36 + 44 * Math.sin(a)}`}
            stroke={R}
            strokeWidth="5"
          />
        );
      })}
      <circle cx="60" cy="36" r="20" fill={P} stroke={I} strokeWidth="3" />
      <rect x="50" y="54" width="20" height="14" fill={I} />
      <path d="M52 40 l4 -8 l4 8 l4 -8 l4 8" stroke={I} strokeWidth="2.5" fill="none" />
    </g>
  ),
  shovel: () => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={8 + i * 22}
          y="60"
          width="22"
          height="12"
          rx="6"
          fill="var(--paper-3)"
          stroke={I}
          strokeWidth="2"
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={19 + i * 22}
          y="49"
          width="22"
          height="12"
          rx="6"
          fill="var(--paper-3)"
          stroke={I}
          strokeWidth="2"
        />
      ))}
      <path d="M86 6 l-30 44" stroke={I} strokeWidth="6" />
      <path d="M50 44 l14 8 l-10 16 q-10 2 -14 -6 Z" fill={I} />
      <rect x="82" y="2" width="14" height="6" fill={R} transform="rotate(34 89 5)" />
    </g>
  ),
  advance: () => (
    <g>
      {arrow(6, 50, 96, 40, R)}
      <path d="M86 8 v34" stroke={I} strokeWidth="3" />
      <path d="M86 8 h24 l-6 7 l6 7 h-24 Z" fill={I} />
    </g>
  ),
  trench: () => (
    <g>
      <path
        d="M0 58 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 l12 -8 l12 8 V80 H0 Z"
        fill={I}
      />
      <path d="M0 30 h120" stroke={I} strokeWidth="2" />
      {[10, 30, 50, 70, 90, 110].map((x) => (
        <g key={x}>
          <path d={`M${x - 4} 26 l8 8 M${x + 4} 26 l-8 8`} stroke={I} strokeWidth="2" />
          <path d={`M${x} 30 v18`} stroke={I2} strokeWidth="3" />
        </g>
      ))}
      <rect x="54" y="62" width="12" height="8" fill={R} />
    </g>
  ),
  rails: () => (
    <g>
      <path d="M30 80 L56 20 M90 80 L64 20" stroke={I} strokeWidth="4" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 76 - i * 10;
        const half = 34 - i * 4.6;
        return <path key={i} d={`M${60 - half} ${y} h${half * 2}`} stroke={I2} strokeWidth="3" />;
      })}
      <path d="M60 4 l4 10 h11 l-9 7 l3 11 l-9 -7 l-9 7 l3 -11 l-9 -7 h11 Z" fill={R} />
    </g>
  ),
  tank: () => (
    <g>
      <rect x="12" y="52" width="96" height="18" rx="9" fill={I} />
      {[24, 40, 56, 72, 88].map((x) => (
        <circle key={x} cx={x + 4} cy="61" r="5" fill={I2} stroke={P} strokeWidth="1.5" />
      ))}
      <path d="M22 52 l8 -14 h60 l8 14 Z" fill={I} />
      <rect x="44" y="26" width="30" height="14" rx="3" fill={I} />
      <rect x="72" y="30" width="40" height="5" fill={I} />
      <path d="M52 40 l4 -6 h10 l4 6" fill={R} />
    </g>
  ),
  arrows: () => (
    <g>
      {arrow(4, 22, 80, 22, I)}
      {arrow(18, 46, 98, 30, R)}
      {arrow(4, 70, 80, 22, I)}
    </g>
  ),
  eye: () => (
    <g>
      <path d="M8 40 q52 -44 104 0 q-52 44 -104 0 Z" fill={P} stroke={I} strokeWidth="4" />
      <circle cx="60" cy="40" r="16" fill={R} />
      <circle cx="60" cy="40" r="7" fill={I} />
      <path d="M8 40 q52 -44 104 0" stroke={I} strokeWidth="7" fill="none" />
    </g>
  ),
  typewriter: () => (
    <g>
      <rect x="40" y="6" width="40" height="22" fill={P} stroke={I} strokeWidth="2" />
      <path d="M46 14 h28 M46 20 h20" stroke={I} strokeWidth="2" />
      <rect x="18" y="26" width="84" height="10" rx="3" fill={I} />
      <path d="M14 76 l10 -38 h72 l10 38 Z" fill={I} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) => (
          <circle
            key={`${r}${c}`}
            cx={30 + c * 10 + r * 2}
            cy={48 + r * 9}
            r="3"
            fill={(r + c) % 4 === 0 ? R : P}
          />
        )),
      )}
    </g>
  ),
  twoFaces: () => (
    <g>
      <g>
        <circle cx="38" cy="38" r="15" fill={I} />
        <path d="M14 30 h48 l-6 -6 h-36 Z M22 24 q16 -18 32 0 Z" fill={I} />
        <path d="M14 80 q24 -40 48 0 Z" fill={I} />
      </g>
      <g>
        <circle cx="82" cy="38" r="15" fill={R} />
        <path d="M58 30 h48 l-6 -6 h-36 Z M66 24 q16 -18 32 0 Z" fill={R} />
        <path d="M58 80 q24 -40 48 0 Z" fill={R} />
      </g>
    </g>
  ),
  map: () => (
    <g>
      <path
        d="M10 14 l32 -6 l36 8 l32 -6 v62 l-32 6 l-36 -8 l-32 6 Z"
        fill={P}
        stroke={I}
        strokeWidth="2"
      />
      <path d="M42 8 v62 M78 16 v62" stroke="var(--paper-3)" strokeWidth="2" />
      <path
        d="M18 60 q14 -30 30 -10 t30 -20 t24 6"
        stroke={R}
        strokeWidth="3"
        strokeDasharray="5 4"
        fill="none"
      />
      <text x="30" y="36" fontFamily="var(--font-display)" fontSize="20" fill={I}>
        ?
      </text>
      <text x="84" y="64" fontFamily="var(--font-display)" fontSize="20" fill={I}>
        ?
      </text>
    </g>
  ),
  compound: () => (
    <g>
      <path d="M96 10 l-70 60 h50 Z" fill={P} opacity="0.75" />
      <rect x="92" y="4" width="14" height="10" fill={I} />
      <path d="M99 14 v66" stroke={I} strokeWidth="3" />
      <path d="M0 52 h120 M0 62 h120" stroke={I} strokeWidth="1.5" />
      {[6, 26, 46, 66, 86].map((x) => (
        <path key={x} d={`M${x} 46 v34`} stroke={I} strokeWidth="4" />
      ))}
      <rect x="40" y="66" width="22" height="10" fill={R} />
    </g>
  ),
  mole: () => (
    <g>
      <path d="M22 80 q38 -52 76 0 Z" fill={I} />
      <path d="M44 80 l16 -26 l16 26" fill={I2} />
      <circle cx="60" cy="36" r="17" fill={I} />
      <path d="M26 30 h68 l-10 -6 h-48 Z M36 24 q24 -24 48 0 Z" fill={I} />
      <rect x="48" y="34" width="8" height="4" fill={R} />
      <rect x="64" y="34" width="8" height="4" fill={R} />
    </g>
  ),
  seal: () => (
    <g>
      <rect x="18" y="8" width="64" height="66" fill={P} stroke={I} strokeWidth="2" />
      <path d="M26 20 h48 M26 28 h48 M26 36 h36" stroke={I} strokeWidth="2" />
      <path d="M78 52 l-8 26 l10 -6 l6 10 l4 -28 Z" fill={R} />
      <circle cx="82" cy="50" r="16" fill={R} />
      <circle cx="82" cy="50" r="10" fill="none" stroke={P} strokeWidth="2" />
    </g>
  ),
  megaphone: () => (
    <g>
      <path d="M22 34 l46 -22 v56 l-46 -22 Z" fill={I} />
      <rect x="10" y="32" width="14" height="16" fill={I} />
      <path d="M30 46 l6 22 h10 l-6 -20" fill={I2} />
      <path
        d="M78 26 q10 14 0 28 M88 18 q16 22 0 44 M98 10 q22 30 0 60"
        stroke={R}
        strokeWidth="4"
        fill="none"
      />
    </g>
  ),
  clock: () => (
    <g>
      <circle cx="46" cy="42" r="30" fill={P} stroke={I} strokeWidth="5" />
      <path d="M46 42 v-20 M46 42 h14" stroke={I} strokeWidth="4" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x="44"
          y="14"
          width="4"
          height="6"
          fill={I}
          transform={`rotate(${i * 90} 46 42)`}
        />
      ))}
      <path d="M96 16 a10 10 0 1 1 0.1 0 Z" fill={R} />
      <path d="M96 36 l-6 -10 h12 Z" fill={R} />
      <path d="M96 36 v30" stroke={I} strokeWidth="2" />
    </g>
  ),
  bonds: () => (
    <g>
      <rect
        x="10"
        y="12"
        width="100"
        height="58"
        fill={P}
        stroke={I}
        strokeWidth="3"
        strokeDasharray="6 3"
      />
      <rect x="18" y="20" width="84" height="42" fill="none" stroke={I} strokeWidth="1.5" />
      <path d="M60 26 l5 11 h12 l-10 7 l4 12 l-11 -7 l-11 7 l4 -12 l-10 -7 h12 Z" fill={R} />
      <path d="M24 56 h20 M76 56 h20" stroke={I} strokeWidth="2" />
    </g>
  ),
  coffee: () => (
    <g>
      <path
        d="M50 26 q-8 -8 0 -16 M62 26 q-8 -8 0 -16 M74 26 q-8 -8 0 -16"
        stroke={P}
        strokeWidth="3"
        fill="none"
      />
      <path d="M36 32 h52 l-6 38 h-40 Z" fill={I} />
      <path d="M88 40 q16 0 10 14 q-4 8 -14 6" stroke={I} strokeWidth="5" fill="none" />
      <rect x="44" y="44" width="36" height="8" fill={R} />
      <ellipse cx="62" cy="74" rx="38" ry="5" fill={I2} />
    </g>
  ),
  seaside: () => (
    <g>
      <circle cx="60" cy="40" r="20" fill={R} />
      <rect x="0" y="48" width="120" height="32" fill={T} />
      {[52, 62, 72].map((y) => (
        <path
          key={y}
          d={`M0 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0`}
          stroke={I}
          strokeWidth="3"
          fill="none"
        />
      ))}
    </g>
  ),
  radar: () => (
    <g>
      <path d="M30 70 l20 -26 l20 26 Z" fill={I} />
      <path d="M22 40 q28 -36 64 -8 Z" fill={P} stroke={I} strokeWidth="3" />
      <path d="M52 32 l14 -14" stroke={I} strokeWidth="3" />
      <circle cx="68" cy="16" r="4" fill={R} />
      <path d="M78 12 q10 6 10 18 M86 6 q16 10 14 30" stroke={R} strokeWidth="3" fill="none" />
      <rect x="0" y="70" width="120" height="10" fill={I} />
    </g>
  ),
  cannon: () => (
    <g>
      <rect x="0" y="62" width="120" height="18" fill={T} />
      <path
        d="M0 66 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0"
        stroke={I}
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 62 h44 v-14 h-44 Z" fill={I} />
      <path d="M40 52 l64 -26 l3 7 l-62 28 Z" fill={I} />
      <circle cx="108" cy="28" r="6" fill={R} />
    </g>
  ),
  radio: () => (
    <g>
      <path d="M60 6 v22" stroke={I} strokeWidth="3" />
      <path d="M48 12 q12 -12 24 0 M40 6 q20 -18 40 0" stroke={R} strokeWidth="3" fill="none" />
      <rect x="20" y="28" width="80" height="46" rx="4" fill={I} />
      <circle cx="44" cy="51" r="14" fill={P} />
      <path d="M44 51 l8 -8" stroke={R} strokeWidth="3" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="68" y={38 + i * 8} width="24" height="4" fill={P} />
      ))}
    </g>
  ),
  feint: () => (
    <g>
      <path
        d="M10 62 q40 -70 86 -20"
        stroke={R}
        strokeWidth="9"
        fill="none"
        strokeDasharray="12 6"
      />
      <path d="M104 50 l-22 -4 l14 -16 Z" fill={R} />
      <path d="M14 70 h60" stroke={I} strokeWidth="6" />
      <path d="M84 70 l-16 -10 v20 Z" fill={I} />
    </g>
  ),
  tornOrder: () => (
    <g>
      <path
        d="M22 10 h36 l-6 12 l8 12 l-8 12 l6 12 l-4 12 h-32 Z"
        fill={P}
        stroke={I}
        strokeWidth="2"
      />
      <path
        d="M68 10 h30 v60 h-34 l4 -12 l-6 -12 l8 -12 l-8 -12 Z"
        fill={P}
        stroke={I}
        strokeWidth="2"
      />
      <path
        d="M28 22 h20 M28 32 h22 M28 42 h18 M74 22 h18 M76 32 h16 M74 42 h18"
        stroke={I}
        strokeWidth="2"
      />
      <path d="M30 56 l60 -40 M30 16 l60 40" stroke={R} strokeWidth="5" />
    </g>
  ),
  approved: () => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse
          key={i}
          cx="92"
          cy={70 - i * 7}
          rx="16"
          ry="5"
          fill={i % 2 ? P : 'var(--paper-3)'}
          stroke={I}
          strokeWidth="2"
        />
      ))}
      <g transform="rotate(-14 46 40)">
        <rect x="8" y="26" width="76" height="26" fill="none" stroke={R} strokeWidth="4" />
        <text
          x="46"
          y="46"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="17"
          fill={R}
        >
          APPROVED
        </text>
      </g>
    </g>
  ),
};

/** Parameters for a generated scientist portrait. */
export interface PortraitSpec {
  hair: 'bun' | 'short' | 'side' | 'long' | 'cap' | 'bald';
  glasses: boolean;
  coat: 'lab' | 'uniform' | 'suit';
  accent: 'red' | 'paper';
}

export function Portrait({ spec }: { spec: PortraitSpec }): ReactElement {
  const accent = spec.accent === 'red' ? R : P;
  return (
    <g>
      {/* shoulders and coat */}
      <path
        d="M22 80 q4 -30 38 -32 q34 2 38 32 Z"
        fill={spec.coat === 'lab' ? P : I}
        stroke={I}
        strokeWidth="2"
      />
      {spec.coat === 'lab' && (
        <path d="M52 50 l8 18 l8 -18" stroke={I} strokeWidth="3" fill="none" />
      )}
      {spec.coat === 'uniform' && (
        <g>
          <rect x="30" y="58" width="12" height="4" fill={accent} />
          <rect x="78" y="58" width="12" height="4" fill={accent} />
          <path d="M60 50 v30" stroke={I2} strokeWidth="2" />
        </g>
      )}
      {spec.coat === 'suit' && (
        <path
          d="M52 50 l8 22 l8 -22 M60 56 l-3 6 l3 10 l3 -10 Z"
          stroke={P}
          strokeWidth="2"
          fill={accent}
        />
      )}
      {/* neck and head */}
      <rect x="54" y="40" width="12" height="12" fill={I2} />
      <ellipse cx="60" cy="30" rx="15" ry="17" fill={I2} />
      {/* hair */}
      {spec.hair === 'bun' && (
        <g fill={I}>
          <path d="M44 28 q2 -20 16 -20 q14 0 16 20 q-4 -10 -16 -10 q-12 0 -16 10 Z" />
          <circle cx="60" cy="8" r="7" />
        </g>
      )}
      {spec.hair === 'short' && (
        <path d="M44 26 q0 -18 16 -18 q16 0 16 18 q-6 -8 -16 -8 q-10 0 -16 8 Z" fill={I} />
      )}
      {spec.hair === 'side' && (
        <path d="M44 30 q-2 -22 18 -22 q14 0 14 14 q-14 -6 -26 2 l-2 10 Z" fill={I} />
      )}
      {spec.hair === 'long' && (
        <path
          d="M43 50 q-6 -40 17 -42 q23 2 17 42 l-4 -2 q4 -24 -4 -32 q-9 6 -18 4 q-6 8 -4 28 Z"
          fill={I}
        />
      )}
      {spec.hair === 'cap' && (
        <g fill={I}>
          <path d="M42 22 q18 -18 36 0 Z" />
          <rect x="40" y="20" width="40" height="5" />
          <rect x="56" y="12" width="8" height="5" fill={accent} />
        </g>
      )}
      {/* glasses */}
      {spec.glasses && (
        <g stroke={P} strokeWidth="1.8" fill="none">
          <circle cx="54" cy="31" r="4.5" />
          <circle cx="66" cy="31" r="4.5" />
          <path d="M58.5 31 h3" />
        </g>
      )}
    </g>
  );
}
