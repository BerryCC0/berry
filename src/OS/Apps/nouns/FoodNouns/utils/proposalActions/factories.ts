/**
 * Factories for the common admin-setter shapes in Food Nouns.
 *
 * The FN protocol exposes a handful of uint-arg setters (reserve price,
 * time buffer, min bid increment %) and a handful of no-arg toggles
 * (pause / unpause). Each is one factory call rather than a bespoke def
 * file — same lifecycle, same round-trip guarantee.
 *
 * Mirrors Camp's `shared/factories.ts` pattern but lighter: FN's admin
 * surface is small enough that we only need uint + no-arg shapes today.
 * Add factories here as new shapes appear.
 */
import {
  type Address,
  type Hex,
  decodeAbiParameters,
  encodeAbiParameters,
  formatUnits,
  parseUnits,
} from 'viem';
import type { FNActionDef, FNActionCategory } from './types';

// ---------------------------------------------------------------------------
// makeUintAction — `setX(uintN)`
// ---------------------------------------------------------------------------

type UintWidth = 'uint8' | 'uint16' | 'uint32' | 'uint56' | 'uint192' | 'uint256';

interface UintActionOpts {
  id: string;
  name: string;
  description: string;
  category: FNActionCategory;
  target: Address;
  /** Full function signature, e.g. `setReservePrice(uint256)`. The width
   *  used for ABI encoding is taken from the type literal in this string —
   *  passing the wrong `width` will silently corrupt calldata, so we
   *  validate at boot time below. */
  signature: string;
  field: {
    name: string;
    label: string;
    placeholder?: string;
    helpText?: string;
  };
  /** ABI parameter width — must match the type inside `signature`. */
  width: UintWidth;
  /** If set, the field value is treated as a decimal token amount and
   *  scaled by `parseUnits(value, decimals)` on encode (and inversely on
   *  decode). 18 for ETH-denominated reserve price; omit for unit counts. */
  decimals?: number;
  /** Optional unit suffix shown in the describe text, e.g. "ETH", "seconds",
   *  "%". Falls back to the field label. */
  unit?: string;
}

export function makeUintAction(opts: UintActionOpts): FNActionDef {
  // Sanity check: the width in the signature string must match the declared
  // width. If they diverge, encoded calldata won't round-trip — better to
  // fail loudly at module init than silently produce a broken proposal.
  if (!opts.signature.includes(`(${opts.width})`)) {
    throw new Error(
      `makeUintAction(${opts.id}): signature "${opts.signature}" does not declare ${opts.width}`,
    );
  }

  const toRaw = (value: string): bigint =>
    opts.decimals !== undefined
      ? parseUnits(value as `${number}`, opts.decimals)
      : BigInt(value || '0');

  const fromRaw = (raw: bigint): string =>
    opts.decimals !== undefined ? formatUnits(raw, opts.decimals) : raw.toString();

  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    fields: [
      {
        name: opts.field.name,
        label: opts.field.label,
        type: opts.decimals !== undefined ? 'amount' : 'number',
        helpText: opts.field.helpText,
        placeholder: opts.field.placeholder,
        required: true,
        decimals: opts.decimals,
        min: 0,
      },
    ],

    encode(values) {
      const rawStr = (values[opts.field.name] ?? '').trim();
      if (!rawStr) {
        throw new Error(`${opts.field.label} is required`);
      }
      let raw: bigint;
      try {
        raw = toRaw(rawStr);
      } catch {
        throw new Error(`${opts.field.label} must be a valid number`);
      }
      if (raw < BigInt(0)) {
        throw new Error(`${opts.field.label} must be non-negative`);
      }
      // For sub-32-byte widths, viem accepts `number` for uint8/16/32 and
      // `bigint` for everything else. Pass the most permissive shape; viem
      // pads to 32 bytes on encoding.
      const arg =
        opts.width === 'uint8' || opts.width === 'uint16' || opts.width === 'uint32'
          ? Number(raw)
          : raw;
      const calldata = encodeAbiParameters([{ type: opts.width }], [arg]);
      return {
        target: opts.target,
        value: BigInt(0),
        signature: opts.signature,
        calldata: calldata as Hex,
      };
    },

    decode(action) {
      if (action.signature !== opts.signature) return null;
      if (action.target.toLowerCase() !== opts.target.toLowerCase()) return null;
      if (action.value !== BigInt(0)) return null; // these setters are non-payable
      try {
        const [raw] = decodeAbiParameters(
          [{ type: opts.width }],
          action.calldata as Hex,
        ) as [bigint | number];
        return { [opts.field.name]: fromRaw(BigInt(raw)) };
      } catch {
        return null;
      }
    },

    describe(values) {
      const v = (values[opts.field.name] ?? '').trim() || '?';
      const unit = opts.unit ?? '';
      const suffix = unit ? ` ${unit}` : '';
      return `${opts.name} → ${v}${suffix}`;
    },
  };
}

// ---------------------------------------------------------------------------
// makeNoArgAction — `setX()`, `pause()`, `unpause()`
// ---------------------------------------------------------------------------

interface NoArgActionOpts {
  id: string;
  name: string;
  description: string;
  category: FNActionCategory;
  target: Address;
  /** Function signature with empty parens, e.g. `pause()`. */
  signature: string;
}

export function makeNoArgAction(opts: NoArgActionOpts): FNActionDef {
  if (!opts.signature.endsWith('()')) {
    throw new Error(
      `makeNoArgAction(${opts.id}): signature "${opts.signature}" must take no arguments`,
    );
  }
  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    fields: [],

    encode() {
      return {
        target: opts.target,
        value: BigInt(0),
        signature: opts.signature,
        calldata: '0x' as Hex,
      };
    },

    decode(action) {
      if (action.signature !== opts.signature) return null;
      if (action.target.toLowerCase() !== opts.target.toLowerCase()) return null;
      if (action.calldata !== '0x') return null;
      if (action.value !== BigInt(0)) return null;
      return {};
    },

    describe() {
      return opts.name;
    },
  };
}
