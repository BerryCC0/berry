/**
 * Factories for producing TransactionActionDefs from minimal config.
 *
 * The Nouns protocol exposes ~70 admin setters that share three calldata
 * shapes:
 *   • `_setX(uintN value)`   — width-controlled integer
 *   • `_setX(address value)` — single address
 *   • `_setX()`              — no-arg toggle / pause / lock
 *
 * Writing 70 separate action def files would be ceremony. Instead each one
 * is a single factory call in its category's `index.ts`. The factory still
 * produces a fully-formed `TransactionActionDef` — same lifecycle, same
 * round-trip guarantee, same registry semantics.
 *
 * Special-shape admin setters (tuple structs, address arrays, mixed types)
 * get their own action files. Don't squeeze them into the factories.
 */

import {
  type Address,
  encodeAbiParameters,
  parseAbiParameters,
  parseUnits,
} from 'viem';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
} from './index';
import type {
  ActionCategory,
  ActionFieldDef,
  TransactionActionDef,
} from '../types';

// ---------------------------------------------------------------------------
// makeUintAction — _setX(uintN)
// ---------------------------------------------------------------------------

interface UintActionOpts<TName extends string> {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  target: Address;
  /** Full function signature, e.g. `_setVotingDelay(uint256)`. */
  signature: string;
  field: {
    name: TName;
    label: string;
    helpText?: string;
    placeholder?: string;
  };
  /** ABI parameter width — determines `parseAbiParameters` shape. */
  width: 'uint16' | 'uint32' | 'uint56' | 'uint192' | 'uint256';
  /**
   * If set, the field's display value is treated as a token-display amount
   * and scaled by `parseUnits(value, decimals)` for encoding (and
   * `formatTokenAmount(rawValue, decimals)` for decoding). Used by setters
   * that take ETH/USDC amounts (auction reserve price, payer USDC ops).
   */
  decimals?: number;
  /**
   * Optional title override for `describe()`. Defaults to `opts.name`
   * (e.g., "Set Auction Reserve Price") — almost always what you want.
   */
  describePrefix?: string;
  /**
   * Optional unit appended to the value in the description line. If unset,
   * one is inferred from `field.label`: parenthesised "(UNIT)" wins, else
   * common labels ("Percentage", "BPS", "Blocks") map to sensible suffixes.
   */
  displayUnit?: string;
}

export function makeUintAction<TName extends string>(
  opts: UintActionOpts<TName>,
): TransactionActionDef<Record<TName, string>> {
  const fieldDef: ActionFieldDef = {
    name: opts.field.name,
    label: opts.field.label,
    type: opts.decimals !== undefined ? 'amount' : 'number',
    helpText: opts.field.helpText,
    placeholder: opts.field.placeholder,
    required: true,
    validation: { min: 0 },
  };

  const abiSig = opts.width;
  const toRaw = (value: string): bigint =>
    opts.decimals !== undefined ? parseUnits(value, opts.decimals) : BigInt(value || '0');
  const fromRaw = (raw: bigint): string =>
    opts.decimals !== undefined ? formatTokenAmount(raw, opts.decimals) : raw.toString();

  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    isMultiAction: false,
    fields: [fieldDef],

    encode(values) {
      const raw = toRaw(values[opts.field.name] as string);
      const arg = opts.width === 'uint16' || opts.width === 'uint32'
        ? Number(raw)
        : raw;
      return [
        {
          target: opts.target,
          value: '0',
          signature: opts.signature,
          calldata: encodeAbiParameters(parseAbiParameters(abiSig), [arg as never]),
        },
      ];
    },

    decode(actions, cursor) {
      const action = actions[cursor];
      if (!action) return null;
      if (!matchTarget(action, opts.target)) return null;
      if (!matchSignature(action, opts.signature)) return null;
      const decoded = decodeArgs<readonly [bigint | number]>(
        action.calldata,
        abiSig,
      );
      if (!decoded) return null;
      const raw = typeof decoded[0] === 'number' ? BigInt(decoded[0]) : decoded[0];
      return {
        values: { [opts.field.name]: fromRaw(raw) } as Record<TName, string>,
        consumed: 1,
      };
    },

    describe(values) {
      const display = values[opts.field.name];
      // Use the action's `name` ("Set Auction Reserve Price") as the title
      // by default — the previous `Set ${field.label}` produced confusing
      // titles like "Set Amount (ETH)" that drop the parameter's context.
      // `describePrefix` overrides if a caller needs custom phrasing.
      const title = opts.describePrefix ?? opts.name;
      const unit = opts.displayUnit ?? inferUnitFromLabel(opts.field.label);
      const suffix = unit ? ` ${unit}` : '';
      return [
        {
          title,
          description: `→ ${display}${suffix}`,
          functionName: opts.signature.slice(0, opts.signature.indexOf('(')),
          params: { [opts.field.name]: String(display) },
        },
      ];
    },
  };
}

/**
 * Infer a display unit from the field label so describe() can append
 * "→ 0.5 ETH" / "→ 5000 blocks" / "→ 1000 BPS" instead of the bare value.
 *
 *   "Amount (ETH)"  → "ETH"     (extract parenthesised unit)
 *   "Pool Fee (bps)" → "bps"     (same)
 *   "Percentage"    → "%"
 *   "BPS"           → "BPS"
 *   "Blocks"        → "blocks"
 *   "Seconds"       → "seconds"
 *   "Address"       → ""         (no useful unit; let the value stand alone)
 */
function inferUnitFromLabel(label: string): string {
  const parens = label.match(/\(([^)]+)\)\s*$/);
  if (parens) return parens[1];
  switch (label) {
    case 'Percentage':
      return '%';
    case 'BPS':
      return 'BPS';
    case 'Blocks':
      return 'blocks';
    case 'Seconds':
      return 'seconds';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// makeAddressAction — _setX(address)
// ---------------------------------------------------------------------------

interface AddressActionOpts<TName extends string> {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  target: Address;
  signature: string;
  field: {
    name: TName;
    label: string;
    helpText?: string;
    placeholder?: string;
  };
  describePrefix?: string;
}

export function makeAddressAction<TName extends string>(
  opts: AddressActionOpts<TName>,
): TransactionActionDef<Record<TName, string>> {
  const fieldDef: ActionFieldDef = {
    name: opts.field.name,
    label: opts.field.label,
    type: 'address',
    helpText: opts.field.helpText,
    placeholder: opts.field.placeholder ?? '0x... or name.eth',
    required: true,
  };

  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    isMultiAction: false,
    fields: [fieldDef],

    encode(values) {
      const address = values[opts.field.name] as Address;
      return [
        {
          target: opts.target,
          value: '0',
          signature: opts.signature,
          calldata: encodeAbiParameters(parseAbiParameters('address'), [address]),
        },
      ];
    },

    decode(actions, cursor) {
      const action = actions[cursor];
      if (!action) return null;
      if (!matchTarget(action, opts.target)) return null;
      if (!matchSignature(action, opts.signature)) return null;
      const decoded = decodeArgs<readonly [Address]>(action, 'address');
      if (!decoded) return null;
      return {
        values: { [opts.field.name]: decoded[0] } as Record<TName, string>,
        consumed: 1,
      };
    },

    describe(values) {
      const display = values[opts.field.name];
      const title = opts.describePrefix ?? opts.name;
      return [
        {
          title,
          description: `→ ${display}`,
          functionName: opts.signature.slice(0, opts.signature.indexOf('(')),
          // `owner` here so the renderer's recipient normalisation picks
          // the address up for ENS chip + avatar resolution.
          params: { [opts.field.name]: String(display), owner: String(display) },
        },
      ];
    },
  };
}

// ---------------------------------------------------------------------------
// makeNoArgAction — _setX() / pause() / unpause() / lockParts() / etc.
// ---------------------------------------------------------------------------

interface NoArgActionOpts {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  target: Address;
  /** Function signature with empty argument list, e.g. `pause()`. */
  signature: string;
  /** Optional human title; falls back to `name`. */
  describeTitle?: string;
}

export function makeNoArgAction(
  opts: NoArgActionOpts,
): TransactionActionDef<Record<string, never>> {
  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    isMultiAction: false,
    fields: [],

    encode() {
      return [
        {
          target: opts.target,
          value: '0',
          signature: opts.signature,
          calldata: '0x',
        },
      ];
    },

    decode(actions, cursor) {
      const action = actions[cursor];
      if (!action) return null;
      if (!matchTarget(action, opts.target)) return null;
      if (!matchSignature(action, opts.signature)) return null;
      if (action.calldata && action.calldata !== '0x') return null;
      return { values: {}, consumed: 1 };
    },

    describe() {
      return [
        {
          title: opts.describeTitle ?? opts.name,
          functionName: opts.signature.slice(0, opts.signature.indexOf('(')),
        },
      ];
    },
  };
}

// ---------------------------------------------------------------------------
// makeStringAction — _setX(string) (e.g. setBaseURI, setContractURIHash, addBackground)
// ---------------------------------------------------------------------------

interface StringActionOpts<TName extends string> {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  target: Address;
  signature: string;
  field: {
    name: TName;
    label: string;
    helpText?: string;
    placeholder?: string;
  };
}

export function makeStringAction<TName extends string>(
  opts: StringActionOpts<TName>,
): TransactionActionDef<Record<TName, string>> {
  return {
    id: opts.id,
    category: opts.category,
    name: opts.name,
    description: opts.description,
    isMultiAction: false,
    fields: [
      {
        name: opts.field.name,
        label: opts.field.label,
        type: 'text',
        helpText: opts.field.helpText,
        placeholder: opts.field.placeholder,
        required: true,
      },
    ],

    encode(values) {
      return [
        {
          target: opts.target,
          value: '0',
          signature: opts.signature,
          calldata: encodeAbiParameters(parseAbiParameters('string'), [
            String(values[opts.field.name] ?? ''),
          ]),
        },
      ];
    },

    decode(actions, cursor) {
      const action = actions[cursor];
      if (!action) return null;
      if (!matchTarget(action, opts.target)) return null;
      if (!matchSignature(action, opts.signature)) return null;
      const decoded = decodeArgs<readonly [string]>(action, 'string');
      if (!decoded) return null;
      return {
        values: { [opts.field.name]: decoded[0] } as Record<TName, string>,
        consumed: 1,
      };
    },

    describe(values) {
      const display = values[opts.field.name];
      return [
        {
          title: `${opts.name}: "${display}"`,
          functionName: opts.signature.slice(0, opts.signature.indexOf('(')),
          params: { [opts.field.name]: String(display) },
        },
      ];
    },
  };
}

// ---------------------------------------------------------------------------
// Suppress unused-vars warning for `addressEquals` re-import path; left in
// the import block above because future factory variants will use it.
// ---------------------------------------------------------------------------
void addressEquals;
