import type { ReactNode } from 'react';
import { S, type StatKey } from '../strings';
import { useDelta } from './useDelta';

export function Gauge({ value, goal }: { value: number; goal: number }) {
  const delta = useDelta(value);
  return (
    <section className={`gauge ${delta ?? ''}`} aria-label={S.progressLabel}>
      <div className="gauge-row">
        <span className="gauge-title">☀ {S.progressLabel}</span>
        <span className="gauge-value">
          {value}
          <span className="dim"> / {goal}</span>
        </span>
      </div>
      <div className="gauge-bar grain">
        <div className="gauge-fill" style={{ width: `${(100 * value) / goal}%` }} />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="gauge-tick" style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </div>
    </section>
  );
}

const STAT_ICON: Record<StatKey, string> = { secrecy: '👁', budget: '¤', morale: '✊' };

export function StatTag({
  stat,
  label,
  value,
  max,
  onTap,
  note,
}: {
  stat: StatKey;
  label: string;
  value: number;
  max?: number;
  onTap: () => void;
  note?: string | undefined;
}) {
  const delta = useDelta(value);
  const cls = ['stat-tag', 'grain', value <= 3 ? 'low' : '', delta ?? ''].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={onTap} aria-label={`${label} ${value}`}>
      <span className="stat-label">
        <span className="stat-icon">{STAT_ICON[stat]}</span> {label}
      </span>
      <span className="stat-value">
        {value}
        {max !== undefined && <span className="dim">/{max}</span>}
      </span>
      {note && <span className="stat-note">{note}</span>}
    </button>
  );
}

export function FrontTrack({
  front,
  total,
  nextAdvance,
  turnsUntil,
  fortify,
  onTap,
}: {
  front: number;
  total: number;
  nextAdvance: number;
  turnsUntil: number;
  fortify: number;
  onTap: () => void;
}) {
  const delta = useDelta(front);
  return (
    <button
      className={`front ${delta ?? ''}`}
      onClick={onTap}
      aria-label={`The Front: ${front} of ${total} held`}
    >
      <div className="front-row">
        <span className="front-title">
          {S.frontTitle} <strong>{front}</strong>
          <span className="dim">/{total}</span>
        </span>
        {fortify > 0 && <span className="chip chip-fortify">🛡 {S.fortifyChip(fortify)}</span>}
        <span className="chip chip-advance">{S.advanceChip(nextAdvance, turnsUntil)}</span>
      </div>
      <div className="front-track">
        <span className="front-enemy">◀</span>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i >= total - front ? 'cell held' : 'cell lost'} />
        ))}
        <span className="front-capital" title={S.capital}>
          ★
        </span>
      </div>
    </button>
  );
}

export function Telegram({
  title,
  name,
  text,
  ordersLeft,
  onTap,
}: {
  title: string;
  name: string;
  text: string;
  ordersLeft: number;
  onTap: () => void;
}) {
  return (
    <button className="telegram grain" onClick={onTap}>
      <span className="telegram-head">
        <span>{title}</span>
        <span>{S.ordersLeft(ordersLeft)} ›</span>
      </span>
      <span className="telegram-body">
        <strong>{name.toUpperCase()}</strong> · {text}
      </span>
    </button>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet grain" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="sheet-close" onClick={onClose} aria-label={S.close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
