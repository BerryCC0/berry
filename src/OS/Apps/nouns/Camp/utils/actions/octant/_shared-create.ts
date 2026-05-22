/**
 * Shared bundle assembly + disassembly for the Octant vault-create defs.
 *
 * Each vault-create template can emit 1-4 on-chain actions depending on
 * whether the user opted into:
 *   • a prepended `createPaymentSplitter` deploy (the splitter is then the
 *     vault's donation address)
 *   • a trailing seed deposit (approve + deposit) of the underlying asset
 *
 * Bundle layout when both are present:
 *   [createPaymentSplitter, createStrategy, approve(asset, vault), deposit(amount, treasury)]
 *
 * The vault-create-{lido,morpho,sky} variants share the 8-arg createStrategy
 * shape; vault-create-yearn has a 10-arg shape with `yearnVault` and `asset`
 * prepended. Both flow through this module's assemble/disassemble helpers.
 */

import {
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
  parseUnits,
} from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS,
} from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  multiActionId,
} from '../shared';
import type { ProposalAction } from '../types';

const TREASURY = NOUNS_ADDRESSES.treasury as Address;
const SPLITTER_FACTORY = OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS as Address;

const APPROVE_SIG = 'approve(address,uint256)';
const DEPOSIT_SIG = 'deposit(uint256,address)';
const CREATE_PAYMENT_SPLITTER_SIG_PREFIX = 'createPaymentSplitter(';

// ---------------------------------------------------------------------------
// Field types shared between vault-create variants
// ---------------------------------------------------------------------------

/** Common base fields for every variant. */
export interface BaseVaultCreateFields {
  vaultName: string;
  vaultSymbol: string;
  management: string;
  keeper: string;
  emergencyAdmin: string;
  donationAddress: string;
  /** 'true' | 'false' — string-typed because field forms use strings. */
  enableBurning: string;
  tokenizedStrategyAddress: string;
  // Optional bundle pieces — present if the user opted in via the editor.
  seedAmount?: string;
  predictedVault?: string;
  /** Yearn editor sets this so we can scale the seed amount correctly. */
  seedAssetDecimals?: string;
  /** JSON-stringified NewSplitterPayload if the editor opted into deploy-new-splitter. */
  newSplitterPayload?: string;
}

/** Extra fields specific to the Yearn-V3 variant. */
export interface YearnVaultCreateFields extends BaseVaultCreateFields {
  yearnVault: string;
  asset: string;
}

/** The splitter sub-payload the editor stores on `newSplitterPayload`. */
interface NewSplitterPayload {
  payees: Address[];
  names: string[];
  /** Shares serialised as decimal strings — the editor builds it from bigints. */
  shares: string[];
  /** CREATE2-predicted splitter address; matches the vault's donationAddress. */
  predicted: Address;
}

// ---------------------------------------------------------------------------
// Address normalisation
// ---------------------------------------------------------------------------

/** Return `value` if it parses as an address, else `fallback`. */
function addressOr(value: string | undefined, fallback: Address): Address {
  if (value && value.startsWith('0x') && value.length === 42) {
    return value as Address;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Splitter sub-payload helpers
// ---------------------------------------------------------------------------

function parseNewSplitterPayload(raw: string | undefined): NewSplitterPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as NewSplitterPayload;
    if (!Array.isArray(obj.payees) || obj.payees.length === 0) return null;
    if (!Array.isArray(obj.names) || obj.names.length !== obj.payees.length) return null;
    if (!Array.isArray(obj.shares) || obj.shares.length !== obj.payees.length) return null;
    if (!obj.predicted || !obj.predicted.startsWith('0x') || obj.predicted.length !== 42) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}

/** If the editor populated `newSplitterPayload`, build the prepended action. */
export function maybeSplitterAction(
  fields: BaseVaultCreateFields,
): ProposalAction | null {
  const payload = parseNewSplitterPayload(fields.newSplitterPayload);
  if (!payload) return null;
  return {
    target: SPLITTER_FACTORY,
    value: '0',
    signature: 'createPaymentSplitter(address[],string[],uint256[])',
    calldata: encodeAbiParameters(
      parseAbiParameters('address[], string[], uint256[]'),
      [payload.payees, payload.names, payload.shares.map((s) => BigInt(s))],
    ),
  };
}

// ---------------------------------------------------------------------------
// Seed pair helpers
// ---------------------------------------------------------------------------

/** Concrete asset address + decimals chosen by the variant; passed in. */
export interface SeedAsset {
  asset: Address;
  decimals: number;
}

/** If the editor populated seedAmount + predictedVault, build the trailing pair. */
export function maybeSeedActions(
  fields: BaseVaultCreateFields,
  seedAsset: SeedAsset,
): ProposalAction[] {
  const seedRaw = (fields.seedAmount || '').trim();
  if (!seedRaw || seedRaw === '0' || parseFloat(seedRaw) <= 0) return [];

  const predicted = fields.predictedVault;
  if (!predicted || !predicted.startsWith('0x') || predicted.length !== 42) {
    return [];
  }
  const predictedAddr = predicted as Address;
  const amount = parseUnits(seedRaw, seedAsset.decimals);
  return [
    {
      target: seedAsset.asset,
      value: '0',
      signature: APPROVE_SIG,
      calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
        predictedAddr,
        amount,
      ]),
    },
    {
      target: predictedAddr,
      value: '0',
      signature: DEPOSIT_SIG,
      calldata: encodeAbiParameters(parseAbiParameters('uint256, address'), [
        amount,
        TREASURY,
      ]),
    },
  ];
}

// ---------------------------------------------------------------------------
// createStrategy encoding (base + yearn)
// ---------------------------------------------------------------------------

export const BASE_CREATE_SIG =
  'createStrategy(string,string,address,address,address,address,bool,address)';
export const YEARN_CREATE_SIG =
  'createStrategy(address,address,string,string,address,address,address,address,bool,address)';

/** Encode the createStrategy action for lido/morpho/sky factories. */
export function encodeBaseCreate(
  factory: Address,
  fields: BaseVaultCreateFields,
  implFallback: Address,
): ProposalAction {
  return {
    target: factory,
    value: '0',
    signature: BASE_CREATE_SIG,
    calldata: encodeAbiParameters(
      parseAbiParameters(
        'string, string, address, address, address, address, bool, address',
      ),
      [
        fields.vaultName || '',
        fields.vaultSymbol || '',
        addressOr(fields.management, TREASURY),
        (fields.keeper || '') as Address,
        addressOr(fields.emergencyAdmin, TREASURY),
        (fields.donationAddress || '') as Address,
        fields.enableBurning !== 'false',
        addressOr(fields.tokenizedStrategyAddress, implFallback),
      ],
    ),
  };
}

/** Encode the createStrategy action for the Yearn-V3 factory. */
export function encodeYearnCreate(
  factory: Address,
  fields: YearnVaultCreateFields,
  implFallback: Address,
): ProposalAction {
  return {
    target: factory,
    value: '0',
    signature: YEARN_CREATE_SIG,
    calldata: encodeAbiParameters(
      parseAbiParameters(
        'address, address, string, string, address, address, address, address, bool, address',
      ),
      [
        (fields.yearnVault || '') as Address,
        (fields.asset || '') as Address,
        fields.vaultName || '',
        fields.vaultSymbol || '',
        addressOr(fields.management, TREASURY),
        (fields.keeper || '') as Address,
        addressOr(fields.emergencyAdmin, TREASURY),
        (fields.donationAddress || '') as Address,
        fields.enableBurning !== 'false',
        addressOr(fields.tokenizedStrategyAddress, implFallback),
      ],
    ),
  };
}

// ---------------------------------------------------------------------------
// Bundle assembly
// ---------------------------------------------------------------------------

/**
 * Wrap the optional splitter + required create + optional seed actions into a
 * single bundle. Single-action bare create is returned unwrapped (matches
 * legacy behaviour). Multi-action bundles get a deterministic group id.
 *
 * The group id is hashed off the bundle's actual on-chain calldata rather
 * than the input fields — that's the canonical form, so encode→decode→encode
 * produces identical group ids even when input fields had empty defaults
 * (e.g., empty `management` → normalised to TREASURY in calldata).
 */
export function assembleBundle(
  actionId: string,
  _fields: object,
  createAction: ProposalAction,
  splitterAction: ProposalAction | null,
  seedActions: ProposalAction[],
): ProposalAction[] {
  const extras = (splitterAction ? 1 : 0) + seedActions.length;
  if (extras === 0) return [createAction];

  const ordered: ProposalAction[] = splitterAction
    ? [splitterAction, createAction, ...seedActions]
    : [createAction, ...seedActions];
  const groupId = multiActionId(actionId, {
    calldatas: ordered.map((a) => a.calldata),
  });
  return ordered.map((a, i) => ({
    ...a,
    isPartOfMultiAction: true,
    multiActionGroupId: groupId,
    multiActionIndex: i,
  }));
}

// ---------------------------------------------------------------------------
// Bundle disassembly — used by every variant's decode()
// ---------------------------------------------------------------------------

interface SplitterPieces {
  payees: readonly Address[];
  names: readonly string[];
  shares: readonly bigint[];
}

interface SeedPieces {
  /** Token approved + deposited (matches the underlying asset). */
  assetAddress: Address;
  amount: bigint;
  /** Vault that received the deposit — equals the predicted CREATE2 address. */
  predictedVault: Address;
}

export interface BundleMatch {
  /** Total actions consumed by this bundle. */
  consumed: number;
  /** Index of the createStrategy within the bundle (0 or 1). */
  createIdx: number;
  splitter: SplitterPieces | null;
  seed: SeedPieces | null;
}

/**
 * Attempt to match a vault-create bundle starting at `cursor`. The required
 * piece is a createStrategy at cursor or cursor+1 (if splitter prefix);
 * everything else is optional.
 *
 * `expectedFactory` constrains which factory's createStrategy this bundle
 * matches — each variant passes its own factory address.
 */
export function matchVaultCreateBundle(
  actions: readonly ProposalAction[],
  cursor: number,
  expectedFactory: Address,
  expectedCreateSig: string,
): BundleMatch | null {
  let createIdx = cursor;
  let splitter: SplitterPieces | null = null;

  // Optional leading splitter creation
  const maybeSplitter = actions[cursor];
  if (
    maybeSplitter &&
    addressEquals(maybeSplitter.target, SPLITTER_FACTORY) &&
    maybeSplitter.signature?.startsWith(CREATE_PAYMENT_SPLITTER_SIG_PREFIX)
  ) {
    const args = decodeArgs<
      readonly [readonly Address[], readonly string[], readonly bigint[]]
    >(maybeSplitter.calldata, 'address[], string[], uint256[]');
    if (args) {
      splitter = {
        payees: args[0],
        names: args[1],
        shares: args[2],
      };
      createIdx = cursor + 1;
    }
    // If the splitter calldata is malformed, leave splitter=null and treat
    // the action at cursor as not-part-of-bundle (decode will fail at create).
  }

  // Required: createStrategy at createIdx, on the expected factory
  const create = actions[createIdx];
  if (!create) return null;
  if (!addressEquals(create.target, expectedFactory)) return null;
  if (create.signature !== expectedCreateSig) return null;

  // Optional trailing seed pair after createStrategy
  let seed: SeedPieces | null = null;
  const maybeApprove = actions[createIdx + 1];
  const maybeDeposit = actions[createIdx + 2];
  if (
    maybeApprove &&
    maybeDeposit &&
    maybeApprove.signature === APPROVE_SIG &&
    maybeDeposit.signature === DEPOSIT_SIG
  ) {
    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      maybeApprove.calldata,
      'address, uint256',
    );
    const depositArgs = decodeArgs<readonly [bigint, Address]>(
      maybeDeposit.calldata,
      'uint256, address',
    );
    if (
      approveArgs &&
      depositArgs &&
      addressEquals(approveArgs[0], maybeDeposit.target) &&
      addressEquals(depositArgs[1], TREASURY) &&
      approveArgs[1] === depositArgs[0]
    ) {
      seed = {
        assetAddress: maybeApprove.target as Address,
        amount: depositArgs[0],
        predictedVault: maybeDeposit.target as Address,
      };
    }
  }

  const consumed =
    (splitter ? 1 : 0) +
    1 + // createStrategy
    (seed ? 2 : 0);

  return { consumed, createIdx, splitter, seed };
}

/**
 * Convert a parsed splitter back into the JSON-stringified payload the
 * `newSplitterPayload` field expects. `predicted` is the splitter's CREATE2
 * address — derived from the createStrategy's `donationAddress` arg by the
 * caller, since the factory uses that as the donation target by construction.
 */
export function stringifyNewSplitterPayload(
  splitter: SplitterPieces,
  predicted: Address,
): string {
  const payload: NewSplitterPayload = {
    payees: splitter.payees as Address[],
    names: splitter.names as string[],
    shares: splitter.shares.map((s) => s.toString()),
    predicted,
  };
  return JSON.stringify(payload);
}

/**
 * Format a seed amount back to display units. Variants pass their own
 * `decimals` since the asset is hardcoded per factory (or user-supplied
 * for yearn).
 */
export function formatSeedAmount(rawAmount: bigint, decimals: number): string {
  return formatTokenAmount(rawAmount, decimals);
}

/** Suppress unused-import warning during the migration period. */
void ({} as Hex);
