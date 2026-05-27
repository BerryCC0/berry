/**
 * Food Nouns proposal action registry.
 *
 * Source of truth for what proposal actions exist, how their form fields
 * are shaped, how they encode to governor calldata, and how they decode
 * back from on-chain proposals.
 *
 * **Order matters for decoding.** `findActionDef()` walks the array and
 * returns the first def whose `decode()` claims the action. Rules:
 *   1. Specific admin-setter defs first (they key off exact target + signature).
 *   2. ETH transfer before custom (`customCallDef` would otherwise claim it).
 *   3. `customCallDef` ALWAYS last — it's a catch-all that accepts anything.
 *
 * Adding a new action: write a def (or use a factory) and insert it above
 * `customCallDef`. Tests live alongside.
 */

import {
  type Hex,
  formatEther,
  isAddress,
  parseEther,
} from 'viem';
import { FN_ADDRESSES } from '../../contracts';
import { makeNoArgAction, makeUintAction } from './factories';
import type { FNActionDef, FNOnChainAction, StagedAction } from './types';

// ---------------------------------------------------------------------------
// ETH transfer
// ---------------------------------------------------------------------------

const ethTransferDef: FNActionDef = {
  id: 'eth-transfer',
  category: 'eth-transfer',
  name: 'ETH Transfer',
  description: 'Send ETH from the treasury to an address',
  fields: [
    {
      name: 'recipient',
      label: 'Recipient',
      type: 'address',
      required: true,
      helpText: 'Address (or ENS name) that receives the ETH',
    },
    {
      name: 'amount',
      label: 'Amount (ETH)',
      type: 'amount',
      decimals: 18,
      required: true,
      placeholder: '0.0',
    },
  ],
  encode(values) {
    const recipient = (values.recipient ?? '').trim();
    const amount = (values.amount ?? '').trim();
    if (!recipient || !isAddress(recipient)) {
      throw new Error('Recipient must be a valid address');
    }
    if (!amount) {
      throw new Error('Amount is required');
    }
    let wei: bigint;
    try {
      wei = parseEther(amount as `${number}`);
    } catch {
      throw new Error('Amount must be a valid ETH value');
    }
    if (wei <= BigInt(0)) {
      throw new Error('Amount must be greater than zero');
    }
    return {
      target: recipient as `0x${string}`,
      value: wei,
      signature: '',
      calldata: '0x' as Hex,
    };
  },
  decode(action) {
    // Plain ETH transfer = no signature, no calldata, non-zero value.
    // Anything calling into a contract (sig or calldata set) is NOT this.
    if (action.signature !== '') return null;
    if (action.calldata !== '0x') return null;
    if (action.value === BigInt(0)) return null;
    return {
      recipient: action.target,
      amount: formatEther(action.value),
    };
  },
  describe(values) {
    const amount = values.amount || '?';
    const to = values.recipient || '?';
    return `Send Ξ ${amount} to ${truncateAddr(to)}`;
  },
};

// ---------------------------------------------------------------------------
// Auction admin — V1 setters target the auction house and take a single
// uint of varying width. The on-chain signatures (from the verified impl
// at 0xd80df22d…920d79a) are `setReservePrice(uint256)`,
// `setTimeBuffer(uint256)`, `setMinBidIncrementPercentage(uint8)`.
// ---------------------------------------------------------------------------

const setReservePriceDef = makeUintAction({
  id: 'auction-admin-set-reserve-price',
  name: 'Set Auction Reserve Price',
  description:
    'Minimum bid (in ETH) the auction house will accept at the start of each auction',
  category: 'auction-admin',
  target: FN_ADDRESSES.auctionHouse,
  signature: 'setReservePrice(uint256)',
  field: {
    name: 'reservePrice',
    label: 'Reserve price (ETH)',
    placeholder: '0.01',
    helpText:
      'Bids below this value are rejected. Lowering it makes lower opening bids viable.',
  },
  width: 'uint256',
  decimals: 18,
  unit: 'ETH',
});

const setTimeBufferDef = makeUintAction({
  id: 'auction-admin-set-time-buffer',
  name: 'Set Auction Time Buffer',
  description:
    'Seconds added to the auction when a bid lands close to the end (anti-snipe)',
  category: 'auction-admin',
  target: FN_ADDRESSES.auctionHouse,
  signature: 'setTimeBuffer(uint256)',
  field: {
    name: 'seconds',
    label: 'Seconds',
    placeholder: '300',
  },
  width: 'uint256',
  unit: 'seconds',
});

const setMinBidIncrementDef = makeUintAction({
  id: 'auction-admin-set-min-bid-increment',
  name: 'Set Min Bid Increment %',
  description:
    'Minimum percentage increase over the current bid for a new bid to be valid',
  category: 'auction-admin',
  target: FN_ADDRESSES.auctionHouse,
  signature: 'setMinBidIncrementPercentage(uint8)',
  field: {
    name: 'percentage',
    label: 'Percentage',
    placeholder: '2',
  },
  width: 'uint8',
  unit: '%',
});

const pauseAuctionDef = makeNoArgAction({
  id: 'auction-admin-pause',
  name: 'Pause Auctions',
  description: 'Stop new auctions from starting',
  category: 'auction-admin',
  target: FN_ADDRESSES.auctionHouse,
  signature: 'pause()',
});

const unpauseAuctionDef = makeNoArgAction({
  id: 'auction-admin-unpause',
  name: 'Unpause Auctions',
  description: 'Resume auctions',
  category: 'auction-admin',
  target: FN_ADDRESSES.auctionHouse,
  signature: 'unpause()',
});

// ---------------------------------------------------------------------------
// Custom call — escape hatch. Last in the registry because its `decode()`
// claims literally any action shape, so any specific matcher must come first.
// ---------------------------------------------------------------------------

const customCallDef: FNActionDef = {
  id: 'custom-call',
  category: 'custom',
  name: 'Custom Call',
  description:
    'Raw call to any contract with arbitrary value and calldata. Use when no template fits.',
  fields: [
    { name: 'target', label: 'Target address', type: 'address', required: true },
    {
      name: 'value',
      label: 'Value (ETH)',
      type: 'amount',
      decimals: 18,
      placeholder: '0',
      helpText: 'ETH forwarded with the call. Leave at 0 unless the function is payable.',
    },
    {
      name: 'signature',
      label: 'Function signature',
      type: 'text',
      placeholder: 'e.g. transfer(address,uint256)',
      helpText: 'Leave blank if you are providing pre-selected raw calldata.',
    },
    {
      name: 'calldata',
      label: 'Calldata (hex)',
      type: 'text',
      placeholder: '0x…',
      helpText:
        'When a signature is supplied, this should be just the ABI-encoded args (no selector). When blank, leave 0x.',
    },
  ],
  encode(values) {
    const target = (values.target ?? '').trim();
    if (!target || !isAddress(target)) {
      throw new Error('Target must be a valid address');
    }
    const valueStr = (values.value ?? '').trim();
    let value = BigInt(0);
    if (valueStr) {
      try {
        value = parseEther(valueStr as `${number}`);
      } catch {
        throw new Error('Value must be a valid ETH amount');
      }
      if (value < BigInt(0)) {
        throw new Error('Value must be non-negative');
      }
    }
    const signature = (values.signature ?? '').trim();
    let calldata = (values.calldata ?? '').trim();
    if (!calldata) calldata = '0x';
    if (!calldata.startsWith('0x')) calldata = `0x${calldata}`;
    if (!/^0x[0-9a-fA-F]*$/.test(calldata)) {
      throw new Error('Calldata must be a hex string (with optional 0x prefix)');
    }
    return {
      target: target as `0x${string}`,
      value,
      signature,
      calldata: calldata as Hex,
    };
  },
  decode(action) {
    // Catch-all — used when no specific matcher claims the action above.
    return {
      target: action.target,
      value: formatEther(action.value),
      signature: action.signature,
      calldata: action.calldata,
    };
  },
  describe(values) {
    const sig = (values.signature ?? '').trim();
    const target = truncateAddr(values.target ?? '?');
    const valueEth = (values.value ?? '').trim();
    const head = sig ? `${sig} on ${target}` : `Raw call to ${target}`;
    return valueEth && valueEth !== '0' ? `${head} (+Ξ ${valueEth})` : head;
  },
};

// ---------------------------------------------------------------------------
// Registry & helpers
// ---------------------------------------------------------------------------

/** Ordering rationale: see file header. customCallDef MUST be last. */
export const FN_ACTION_DEFS: readonly FNActionDef[] = [
  ethTransferDef,
  setReservePriceDef,
  setTimeBufferDef,
  setMinBidIncrementDef,
  pauseAuctionDef,
  unpauseAuctionDef,
  customCallDef,
] as const;

/**
 * Look up a def by id. Used by the editor when materialising staged actions
 * back into form state.
 */
export function getActionDef(id: string): FNActionDef | undefined {
  return FN_ACTION_DEFS.find((d) => d.id === id);
}

/**
 * Reverse-lookup: given an on-chain action (from a fetched proposal), find
 * the first def whose `decode()` claims it. Always succeeds — customCallDef
 * is the safety net.
 */
export function decodeOnChainAction(action: FNOnChainAction): {
  def: FNActionDef;
  values: Record<string, string>;
} {
  for (const def of FN_ACTION_DEFS) {
    const values = def.decode(action);
    if (values) return { def, values };
  }
  // Unreachable — customCallDef.decode always returns non-null.
  throw new Error('No action def matched (this should be impossible)');
}

/**
 * Encode an entire staged proposal back to governor-call shape.
 * Throws on the first invalid action (with a message naming which one).
 */
export function encodeStagedActions(
  staged: readonly StagedAction[],
): { targets: `0x${string}`[]; values: bigint[]; signatures: string[]; calldatas: Hex[] } {
  const out = {
    targets: [] as `0x${string}`[],
    values: [] as bigint[],
    signatures: [] as string[],
    calldatas: [] as Hex[],
  };
  staged.forEach((s, i) => {
    const def = getActionDef(s.defId);
    if (!def) {
      throw new Error(`Action ${i + 1}: unknown type "${s.defId}"`);
    }
    try {
      const encoded = def.encode(s.values);
      out.targets.push(encoded.target);
      out.values.push(encoded.value);
      out.signatures.push(encoded.signature);
      out.calldatas.push(encoded.calldata);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'invalid input';
      throw new Error(`Action ${i + 1} (${def.name}): ${msg}`);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Tiny local helper — kept inline so the registry has zero cross-file deps
// beyond viem and contracts.
// ---------------------------------------------------------------------------

function truncateAddr(addr: string): string {
  if (!addr || !addr.startsWith('0x') || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
