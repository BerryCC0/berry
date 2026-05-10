/**
 * NounV2SlobberSeeder constants — must match the on-chain seeder at
 * 0xd777E701506A86fE89f07f963aA6c08d6905cFF8.
 *
 * The hidden "slobber" trait appears when a noun rolls (head ∈ {retainer,
 * index-card}) AND (accessory == grease) AND wins a 50/50 keccak-bit roll.
 * Probability per V2 mint: (1/143) × (2/253) × (1/2) ≈ 1/36,179.
 *
 * Used by the predictor view + any UI that wants to flag "this is a slobber".
 */
export const SLOBBER_RULE = {
  GREASE_INDEX: 137,
  RETAINER_INDEX: 173,
  INDEX_CARD_INDEX: 237,
  SLOBBER_INDEX: 143,
} as const;

export interface V2Seed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/** True if the seed satisfies the slobber rule (accessory was overridden to slobber). */
export function isSlobber(seed: V2Seed): boolean {
  return (
    seed.accessory === SLOBBER_RULE.SLOBBER_INDEX &&
    (seed.head === SLOBBER_RULE.RETAINER_INDEX || seed.head === SLOBBER_RULE.INDEX_CARD_INDEX)
  );
}

/**
 * True if a seed *would* be eligible for the slobber roll based on its
 * head/accessory pair, regardless of whether the keccak coin flip landed.
 * Useful for "near miss" callouts in the predictor.
 */
export function isSlobberEligible(seed: V2Seed): boolean {
  return (
    seed.accessory === SLOBBER_RULE.GREASE_INDEX &&
    (seed.head === SLOBBER_RULE.RETAINER_INDEX || seed.head === SLOBBER_RULE.INDEX_CARD_INDEX)
  );
}
