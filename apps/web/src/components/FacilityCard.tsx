import type { FacilityDef } from '@ascendancy/engine';
import { FACILITY_MOTIF } from '../art/cardArt';
import { MOTIFS } from '../art/motifs';
import { S } from '../strings';

const RARITY_MARK: Record<FacilityDef['rarity'], string> = {
  common: '●',
  uncommon: '●●',
  rare: '★',
};

function FacilityArt({ facility }: { facility: FacilityDef }) {
  const motif = MOTIFS[FACILITY_MOTIF[facility.id] ?? 'compound'] ?? MOTIFS.compound!;
  return (
    <svg
      className="card-art grain"
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="120" height="80" fill="var(--tint)" />
      {motif()}
    </svg>
  );
}

/** A Facility as a brass-plaque card: same anatomy as a card, no cost. */
export function FacilityCard({
  facility,
  selected,
  onClick,
}: {
  facility: FacilityDef;
  selected?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card size-pick type-facility ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
    >
      <span className="card-paper grain">
        <span className="card-head">
          <span className="card-name">{facility.name}</span>
        </span>
        <span className="card-art-wrap">
          <FacilityArt facility={facility} />
        </span>
        <span className="card-typeline">
          <span>{S.facility}</span>
          <span className="card-rarity">{RARITY_MARK[facility.rarity]}</span>
        </span>
        <span className="card-rules">{facility.text}</span>
      </span>
    </Tag>
  );
}

/** Small square tile for the top bar. */
export function FacilityTile({ facility }: { facility: FacilityDef }) {
  return (
    <span className="facility-tile" title={facility.name}>
      <FacilityArt facility={facility} />
    </span>
  );
}
