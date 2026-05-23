/**
 * Shared encoding for the "approve + Seaport.validate" multi-action pattern
 * used by every order-creating template (collection/item/trait offer, list).
 *
 * Field shape every consumer uses:
 *   • `order` — JSON-stringified Order (parameters + signature)
 *   • Summary fields for display — derived from `order` but cached
 *
 * On-chain:
 *   1. ERC20.approve(conduit, totalAmount)        // WETH offers
 *      OR ERC721.setApprovalForAll(conduit, true) // NFT listings
 *   2. Seaport.validate([order])
 *
 * The approval target is the CONDUIT (OpenSea's pull-payment hub), not
 * Seaport itself. That's what conduitKey resolves to — see _seaport.ts.
 */

import {
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import { multiActionId } from '../shared';
import type { ProposalAction } from '../types';
import {
  type Order,
  type OrderParameters,
  ItemType,
  ORDER_ABI,
  OPENSEA_CONDUIT,
  SEAPORT_1_6,
  decodeValidateCalldata,
  encodeValidateCalldata,
  parseOrderJson,
  stringifyOrder,
} from './_seaport';

export const VALIDATE_SIG = 'validate(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256),bytes)[])';

/** Human-readable form stored on the proposal action's `signature` field. */
export const VALIDATE_HUMAN_SIG = 'validate(Order[])';

void VALIDATE_SIG;

/** Sum every offer's start amount per token, grouped by ERC-20 token. */
function totalOfferByToken(params: OrderParameters): Map<Address, bigint> {
  const totals = new Map<Address, bigint>();
  for (const item of params.offer) {
    if (item.itemType !== ItemType.ERC20) continue;
    const key = item.token;
    totals.set(key, (totals.get(key) ?? BigInt(0)) + item.startAmount);
  }
  return totals;
}

/** Detect whether any offer line is an NFT (ERC-721 / ERC-1155). */
function offerHasNft(params: OrderParameters): { token: Address } | null {
  for (const item of params.offer) {
    if (
      item.itemType === ItemType.ERC721 ||
      item.itemType === ItemType.ERC721_WITH_CRITERIA ||
      item.itemType === ItemType.ERC1155 ||
      item.itemType === ItemType.ERC1155_WITH_CRITERIA
    ) {
      return { token: item.token };
    }
  }
  return null;
}

/**
 * Build the "approve + validate" multi-action bundle from a parsed Order.
 * The first action is the right approval flavour for what's in `offer[]`;
 * the second action is the on-chain validation of the order itself.
 *
 * Group id is hashed off the order's encoded validate calldata so the bundle
 * is deterministic across encode→decode→re-encode (encoded calldata is the
 * canonical form, immune to address-checksum drift in the field values).
 */
export function buildApproveAndValidate(
  actionId: string,
  order: Order,
): ProposalAction[] {
  const params = order.parameters;
  const validateCalldata = encodeValidateCalldata([order]);
  const groupId = multiActionId(actionId, { calldata: validateCalldata });

  const approvalAction = buildApprovalAction(params);

  const validateAction: ProposalAction = {
    target: SEAPORT_1_6,
    value: '0',
    signature: VALIDATE_HUMAN_SIG,
    calldata: validateCalldata,
    isPartOfMultiAction: true,
    multiActionGroupId: groupId,
    multiActionIndex: approvalAction ? 1 : 0,
  };

  if (!approvalAction) return [validateAction];
  return [
    { ...approvalAction, isPartOfMultiAction: true, multiActionGroupId: groupId, multiActionIndex: 0 },
    validateAction,
  ];
}

/**
 * The approval-leg encoder. Picks ERC20.approve for paid offers, or
 * ERC721.setApprovalForAll for listings. Returns null when the order's
 * offer side is empty or contains only native ETH (no approval needed).
 */
function buildApprovalAction(params: OrderParameters): ProposalAction | null {
  const erc20Totals = totalOfferByToken(params);
  if (erc20Totals.size > 0) {
    // For a multi-token offer (rare), we approve the LARGEST line. The
    // common case is a single ERC-20 offer (WETH for a collection bid).
    let bestToken: Address = '0x0000000000000000000000000000000000000000' as Address;
    let bestAmount = BigInt(0);
    for (const [token, amount] of erc20Totals) {
      if (amount > bestAmount) {
        bestToken = token;
        bestAmount = amount;
      }
    }
    return {
      // Lowercase normalisation — viem returns checksummed addresses from
      // decode, but calldata bytes are case-insensitive. Keeping target
      // lowercased across encode/decode/re-encode lets `.toEqual()` round-trip
      // tests compare cleanly.
      target: bestToken.toLowerCase() as Address,
      value: '0',
      signature: 'approve(address,uint256)',
      calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
        OPENSEA_CONDUIT,
        bestAmount,
      ]),
    };
  }

  const nft = offerHasNft(params);
  if (nft) {
    return {
      target: nft.token.toLowerCase() as Address,
      value: '0',
      signature: 'setApprovalForAll(address,bool)',
      calldata: encodeAbiParameters(parseAbiParameters('address, bool'), [
        OPENSEA_CONDUIT,
        true,
      ]),
    };
  }

  // Native ETH or unknown offer item — no approval prefix.
  return null;
}

/**
 * Decode an "approve + validate" bundle starting at `cursor`. Tolerates the
 * legacy single-action validate form (no approval prefix) by trying the
 * 1-action match if the 2-action match fails. Returns the JSON-stringified
 * Order (suitable for the field) plus how many actions were consumed.
 */
export function matchApproveAndValidate(
  actions: readonly ProposalAction[],
  cursor: number,
): { order: Order; orderJson: string; consumed: number } | null {
  // Try the 2-action variant first.
  const maybeApprove = actions[cursor];
  const maybeValidate = actions[cursor + 1];
  if (
    maybeApprove &&
    maybeValidate &&
    isValidateAction(maybeValidate)
  ) {
    const orders = decodeValidateOrders(maybeValidate.calldata);
    if (orders && orders.length === 1) {
      const order = orders[0];
      // The approve target+sig should match what buildApprovalAction would
      // produce. We don't strictly verify here — the validate side is the
      // source of truth; the approve is just a prefix.
      return {
        order,
        orderJson: stringifyOrder(order),
        consumed: 2,
      };
    }
  }

  // Fallback: lone validate (e.g., a historical proposal that already had
  // pre-approved the conduit). Less common but worth supporting for display.
  const loneValidate = actions[cursor];
  if (loneValidate && isValidateAction(loneValidate)) {
    const orders = decodeValidateOrders(loneValidate.calldata);
    if (orders && orders.length === 1) {
      const order = orders[0];
      return {
        order,
        orderJson: stringifyOrder(order),
        consumed: 1,
      };
    }
  }

  return null;
}

function isValidateAction(action: ProposalAction): boolean {
  if (action.target.toLowerCase() !== SEAPORT_1_6.toLowerCase()) return false;
  return action.signature === VALIDATE_HUMAN_SIG;
}

function decodeValidateOrders(calldata: string | undefined): Order[] | null {
  if (!calldata || calldata === '0x') return null;
  const cd = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
  return decodeValidateCalldata(cd);
}

/** Helper for tests / consumers: parse an Order from JSON, returning null on bad input. */
export function tryParseOrderJson(raw: string | undefined): Order | null {
  if (!raw) return null;
  try {
    return parseOrderJson(raw);
  } catch {
    return null;
  }
}

/** Re-export the order ABI string so consumers can reference it cleanly. */
export { ORDER_ABI };
