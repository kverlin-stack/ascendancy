import type { CardDef, TraitDef } from '@ascendancy/engine';
import { Fragment, type ReactNode } from 'react';
import { S, TYPE_LABEL } from '../strings';
import { CardArt } from './CardArt';

export type CardSize = 'hand' | 'pick' | 'full';

interface Props {
  card: CardDef;
  size: CardSize;
  /** Scientists: Burnout so far and the limit after Director rules. */
  burnout?: { used: number; limit: number } | undefined;
  /** Effort cost after traits; defaults to the card's printed cost. */
  cost?: number | undefined;
  /** Traits this copy has picked up (scientists). */
  traits?: TraitDef[] | undefined;
  /** Why it can't be played, shown as a dimmed card (hand) or a note (full). */
  blocked?: string | null | undefined;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const RARITY_MARK: Record<CardDef['rarity'], string> = {
  starter: '',
  special: '',
  common: '●',
  uncommon: '●●',
  rare: '★',
};

/** Bold the game keywords in rules text. */
const KEYWORDS =
  /(Fortify \d+|Exhaust|Draw \d+|Rest all scientists \d+|Push the Front back \d+|Intel \d+|Delay|Cancel)/g;
function Rules({ text }: { text: string }): ReactNode {
  return text
    .split(KEYWORDS)
    .map((part, i) =>
      i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
}

export function Card({
  card,
  size,
  burnout,
  cost,
  traits,
  blocked,
  selected,
  onClick,
  style,
}: Props) {
  const shownCost = cost ?? card.cost;
  const typeLabel = card.scientist ? S.scientist : TYPE_LABEL[card.type];
  const classes = [
    'card',
    `size-${size}`,
    `type-${card.type}`,
    card.scientist ? 'is-scientist' : '',
    blocked && size === 'hand' ? 'is-blocked' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={classes}
      onClick={onClick}
      style={style}
      aria-label={`${card.name}, cost ${shownCost}`}
    >
      <span className="card-paper grain">
        <span className="card-head">
          <span className={shownCost !== card.cost ? 'card-cost is-changed' : 'card-cost'}>
            {shownCost}
          </span>
          <span className="card-name">{card.name}</span>
        </span>
        <span className="card-art-wrap">
          <CardArt card={card} />
          {card.exhaust && card.type !== 'status' && (
            <span className="stamp stamp-exhaust">{S.oneUse}</span>
          )}
          {card.type === 'status' && <span className="stamp stamp-status">{S.compromised}</span>}
        </span>
        <span className="card-typeline">
          <span>{typeLabel}</span>
          <span className="card-rarity">{RARITY_MARK[card.rarity]}</span>
        </span>
        <span className="card-rules">
          <Rules text={card.text} />
        </span>
        {size !== 'hand' && card.flavorText && (
          <span className="card-flavor">{card.flavorText}</span>
        )}
        {size === 'full' && card.scientist && (
          <span className="card-role">{card.scientist.role}</span>
        )}
        {traits && traits.length > 0 && (
          <span className="card-traits">
            {traits.map((t) => (
              <span key={t.id} className={`trait trait-${t.kind}`}>
                <strong>{t.name}</strong>
                {size === 'full' && <span> · {t.text}</span>}
              </span>
            ))}
          </span>
        )}
        {burnout && <BurnoutRow used={burnout.used} limit={burnout.limit} size={size} />}
      </span>
    </Tag>
  );
}

function BurnoutRow({ used, limit, size }: { used: number; limit: number; size: CardSize }) {
  const last = used === limit - 1;
  return (
    <span className={last ? 'card-burnout is-last' : 'card-burnout'}>
      <span className="burnout-stamps">
        <span className="burnout-label">{S.burnoutLabel(used, limit)}</span>
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={i < used ? 'bstamp used' : 'bstamp'} />
        ))}
      </span>
      {size === 'full' && (
        <span className="burnout-help">
          {last ? S.burnoutLast : used > 0 ? S.burnoutResting : S.burnoutFresh}
        </span>
      )}
    </span>
  );
}
