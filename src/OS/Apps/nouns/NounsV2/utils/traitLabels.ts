/**
 * V2 trait label helpers. V2 stores trait names on-chain in the descriptor
 * (no static name registry like V1's image-data.ts), so the crystal ball
 * shows index-based labels plus the handful of named indices we care about
 * for the slobber narrative. The image itself conveys the actual trait —
 * these labels are supplementary text.
 */

import { SLOBBER_RULE, type V2Seed } from './slobber';

export type V2TraitType = 'background' | 'body' | 'accessory' | 'head' | 'glasses';

const NAMED_HEADS: Record<number, string> = {
  [SLOBBER_RULE.RETAINER_INDEX]: 'Retainer',
  [SLOBBER_RULE.INDEX_CARD_INDEX]: 'Index Card',
};

const NAMED_ACCESSORIES: Record<number, string> = {
  [SLOBBER_RULE.GREASE_INDEX]: 'Grease',
  [SLOBBER_RULE.SLOBBER_INDEX]: 'Slobber',
};

// V2 inherited V1's two cool/warm backgrounds at fork. If the descriptor
// later adds more, those will display as "Background #N".
const BACKGROUND_LABELS = ['Cool', 'Warm'];

export function getV2TraitLabel(type: V2TraitType, value: number): string {
  switch (type) {
    case 'background':
      return BACKGROUND_LABELS[value] ?? `Background #${value}`;
    case 'head':
      return NAMED_HEADS[value] ?? `Head #${value}`;
    case 'accessory':
      return NAMED_ACCESSORIES[value] ?? `Accessory #${value}`;
    case 'body':
      return `Body #${value}`;
    case 'glasses':
      return `Glasses #${value}`;
  }
}

export function getV2SeedLabels(seed: V2Seed) {
  return {
    head: getV2TraitLabel('head', seed.head),
    glasses: getV2TraitLabel('glasses', seed.glasses),
    body: getV2TraitLabel('body', seed.body),
    accessory: getV2TraitLabel('accessory', seed.accessory),
    background: getV2TraitLabel('background', seed.background),
  };
}
