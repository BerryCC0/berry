/**
 * Types for the Food Nouns proposal action registry.
 *
 * Scaled-down counterpart to Camp's TransactionActionDef. FN has a much
 * smaller admin surface (V1 governor + V1 auction house + treasury timelock),
 * so the registry is a flat list rather than per-category subdirectories.
 *
 * Each def owns its full lifecycle:
 *   • encode(values)  → FNOnChainAction         (form → governor calldata)
 *   • decode(action)  → values | null            (governor calldata → form)
 *   • describe(values) → string                  (one-line summary)
 *
 * `decode` is also how the proposal-detail view recognises known calls
 * after the fact, so each def's identity is grounded in (target, signature)
 * rather than a UI-only id.
 */
import type { Hex } from 'viem';

/** Coarse grouping shown to the user in the action picker. */
export type FNActionCategory = 'eth-transfer' | 'auction-admin' | 'custom';

/** Field input kinds the default renderer knows. Custom editors can ignore. */
export type FNActionFieldType =
  | 'address'
  | 'amount'   // decimal-place token amount (uses field.decimals)
  | 'number'   // integer / unscaled uint
  | 'text';

export interface FNActionField {
  name: string;
  label: string;
  type: FNActionFieldType;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  /** For `amount`: how many decimals to scale by when encoding. ETH = 18. */
  decimals?: number;
  /** For `number`: input bounds (informational; encode validates). */
  min?: number;
  max?: number;
}

/** Exactly the shape the V1 governor `propose()` consumes per action. */
export interface FNOnChainAction {
  target: `0x${string}`;
  /** ETH (in wei) forwarded with the call. */
  value: bigint;
  /** Function signature string, e.g. "setReservePrice(uint256)". Empty for
   *  plain ETH transfers. The timelock derives the selector from this and
   *  prepends it to `calldata` at execute time. */
  signature: string;
  /** ABI-encoded args (no selector). "0x" for no-arg calls and pure ETH transfers. */
  calldata: Hex;
}

export interface FNActionDef {
  /** Stable id used as the action type discriminator in the editor. */
  id: string;
  category: FNActionCategory;
  /** Display name in the picker and in summary lines. */
  name: string;
  /** One-line description for the picker. */
  description: string;
  /** Form fields, top-to-bottom. */
  fields: FNActionField[];

  /**
   * Build the on-chain action from form values.
   * Throws an `Error` with a user-facing message on invalid input — the
   * editor catches and displays the message. Field-level validation lives
   * here (not in the field renderer) so the def is the single source of truth.
   */
  encode(values: Record<string, string>): FNOnChainAction;

  /**
   * Recover form values from an on-chain action. Return `null` if this def
   * doesn't claim the action. The first def in the registry whose `decode`
   * returns non-null wins, so ordering matters — see registry.ts.
   */
  decode(action: FNOnChainAction): Record<string, string> | null;

  /** One-line human-readable summary, used in staged-action lists and the
   *  proposal-detail action rows. */
  describe(values: Record<string, string>): string;
}

/** A staged action in the propose UI — pairs a def id with its form values. */
export interface StagedAction {
  defId: string;
  values: Record<string, string>;
}
