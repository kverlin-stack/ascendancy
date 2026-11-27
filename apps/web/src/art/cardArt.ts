import type { CardDef } from '@ascendancy/engine';
import type { PortraitSpec } from './motifs';

/**
 * Which art each card uses. Art is presentation, so it lives in the web app;
 * a new card without an entry falls back to its type's motif.
 */
export const CARD_MOTIF: Record<string, string> = {
  'lab-work': 'chalkboard',
  'night-shift': 'nightShift',
  'prototype-run': 'gearSpark',
  'open-air-test': 'sunrise',
  'peer-review': 'papers',
  'wind-tunnel': 'windTunnel',
  'requisitioned-mainframe': 'mainframe',
  eureka: 'bulb',
  'dig-in': 'shovel',
  counteroffensive: 'advance',
  'trench-lines': 'trench',
  'partisan-raid': 'rails',
  'armored-reserve': 'tank',
  'grand-counterstroke': 'arrows',
  counterintelligence: 'eye',
  'cover-story': 'typewriter',
  'double-agent': 'twoFaces',
  disinformation: 'map',
  'sealed-compound': 'compound',
  mole: 'mole',
  'ministers-favor': 'seal',
  'rally-the-workers': 'megaphone',
  'morning-briefing': 'clock',
  'war-bonds': 'bonds',
  'coffee-ration': 'coffee',
  'leave-of-absence': 'seaside',
  'emergency-appropriation': 'approved',
  codebreakers: 'radio',
  feint: 'feint',
  'decoy-convoy': 'rails',
  'intercepted-orders': 'tornOrder',
};

export const TYPE_MOTIF: Record<CardDef['type'], string> = {
  research: 'bulb',
  warEffort: 'advance',
  security: 'eye',
  people: 'megaphone',
  status: 'mole',
};

export const PORTRAITS: Record<string, PortraitSpec> = {
  'dr-ilse-varnholt': { hair: 'bun', glasses: true, coat: 'lab', accent: 'red' },
  'col-august-rhee': { hair: 'cap', glasses: false, coat: 'uniform', accent: 'red' },
  'prof-tomas-iturbe': { hair: 'side', glasses: true, coat: 'suit', accent: 'red' },
  'dr-adaeze-okafor': { hair: 'short', glasses: false, coat: 'suit', accent: 'paper' },
  'dr-anand-varghese': { hair: 'short', glasses: true, coat: 'lab', accent: 'red' },
  'dr-yuki-tanabe': { hair: 'long', glasses: false, coat: 'lab', accent: 'red' },
};

export const DEFAULT_PORTRAIT: PortraitSpec = {
  hair: 'short',
  glasses: false,
  coat: 'lab',
  accent: 'red',
};

export const FACILITY_MOTIF: Record<string, string> = {
  'radar-station': 'radar',
  'bond-office': 'bonds',
  'proving-ground': 'tank',
  canteen: 'coffee',
  'coastal-batteries': 'cannon',
  'cipher-office': 'typewriter',
  'convalescent-home': 'seaside',
  'counter-espionage-bureau': 'eye',
  'central-archive': 'papers',
  'deep-shelters': 'compound',
  'generator-hall': 'gearSpark',
};
