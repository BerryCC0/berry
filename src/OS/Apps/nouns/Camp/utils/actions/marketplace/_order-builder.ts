/**
 * Client-side Seaport order builders.
 *
 * The editors collect high-level inputs (collection, amount, expiration)
 * and call these builders to produce a fully-formed `Order` ready to be
 * stuffed into the action def's `order` field.
 *
 * Design notes:
 *   • Deterministic salt — derived from a stable hash of the inputs so
 *     repeated builds with the same inputs produce the same Order JSON
 *     (and thus byte-identical calldata, which keeps round-trip tests
 *     happy).
 *   • Hardcoded OpenSea fee structure — 50 BPS to OPENSEA_FEE_RECIPIENT.
 *     If OpenSea changes their fee schedule, update OPENSEA_FEE_BPS in
 *     `_seaport.ts`.
 *   • Zone = address(0), orderType = FULL_OPEN. This is the simplest
 *     order shape; anyone can fulfill, no zone enforcement. OpenSea's UI
 *     may prefer specific zone configurations for criteria-based offers
 *     (their `OpenSeaCriteriaZone`) — proposers should verify on the UI
 *     before voting if appearance there matters.
 *   • `signature: '0x'` — empty. The order is authorised by an on-chain
 *     `Seaport.validate(...)` call from the proposal, not by an ECDSA
 *     signature. OpenSea's API accepts pre-validated orders with empty
 *     signatures (it checks `getOrderStatus` on Seaport).
 */

import { type Address, type Hex, keccak256, toHex } from 'viem';
import {
  ItemType,
  OPENSEA_CONDUIT_KEY,
  OPENSEA_FEE_BPS,
  OPENSEA_FEE_RECIPIENT,
  type Order,
  OrderType,
  stringifyOrder,
} from './_seaport';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

// ---------------------------------------------------------------------------
// Inputs the editors collect
// ---------------------------------------------------------------------------

export interface CollectionOfferInput {
  /** Offerer = the treasury. */
  offerer: Address;
  /** NFT contract being bid on. */
  collection: Address;
  /** Currency the offerer pays in. WETH is the only one OpenSea displays. */
  currency: Address;
  /** Net amount that ends up with the seller (in currency units, NOT wei display). */
  netAmount: bigint;
  /** Unix seconds when the offer becomes valid. Use 0 for "valid immediately." */
  startTime: bigint;
  /** Unix seconds when the offer expires. */
  endTime: bigint;
  /**
   * Optional stable identifier — incorporated into the salt hash so two
   * offers with otherwise-identical inputs get different salts. Defaults
   * to empty string (which means two identical inputs DO collide on salt,
   * which is fine and idempotent for Seaport).
   */
  saltSeed?: string;
}

export interface ItemOfferInput extends Omit<CollectionOfferInput, 'collection'> {
  collection: Address;
  /** Specific tokenId the offer targets. */
  tokenId: bigint;
}

export interface NftListingInput {
  offerer: Address;
  collection: Address;
  tokenId: bigint;
  /** Currency the seller wants in return. WETH or zero-address (ETH) supported. */
  askCurrency: Address;
  /** Gross asking price (in currency units). Fee is deducted from this. */
  askAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  saltSeed?: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Buy offer on any token in a collection.
 *
 * Order shape:
 *   offer         = [currency, netAmount + fee]
 *   consideration = [
 *     {ERC721_WITH_CRITERIA, collection, criteria=0 (wildcard), 1, 1, recipient=offerer},
 *     {currency fee, recipient=OPENSEA_FEE_RECIPIENT},
 *   ]
 */
export function buildCollectionOffer(input: CollectionOfferInput): Order {
  const fee = (input.netAmount * BigInt(OPENSEA_FEE_BPS)) / BigInt(10_000);
  const total = input.netAmount + fee;
  const salt = deriveSalt('collection-offer', input, [String(input.netAmount), String(input.endTime)]);

  return {
    parameters: {
      offerer: input.offerer,
      zone: ZERO_ADDRESS,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: input.currency,
          identifierOrCriteria: BigInt(0),
          startAmount: total,
          endAmount: total,
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC721_WITH_CRITERIA,
          token: input.collection,
          identifierOrCriteria: BigInt(0), // 0 = wildcard (any token in collection)
          startAmount: BigInt(1),
          endAmount: BigInt(1),
          recipient: input.offerer,
        },
        {
          itemType: ItemType.ERC20,
          token: input.currency,
          identifierOrCriteria: BigInt(0),
          startAmount: fee,
          endAmount: fee,
          recipient: OPENSEA_FEE_RECIPIENT,
        },
      ],
      orderType: OrderType.FULL_OPEN,
      startTime: input.startTime,
      endTime: input.endTime,
      zoneHash: ZERO_HASH,
      salt,
      conduitKey: OPENSEA_CONDUIT_KEY,
      totalOriginalConsiderationItems: BigInt(2),
    },
    signature: '0x',
  };
}

/**
 * Buy offer on one specific tokenId.
 *
 * Same shape as collection offer but consideration[0] uses ERC721 (not
 * ERC721_WITH_CRITERIA) and identifierOrCriteria = the tokenId.
 */
export function buildItemOffer(input: ItemOfferInput): Order {
  const fee = (input.netAmount * BigInt(OPENSEA_FEE_BPS)) / BigInt(10_000);
  const total = input.netAmount + fee;
  const salt = deriveSalt('item-offer', input, [
    String(input.tokenId),
    String(input.netAmount),
    String(input.endTime),
  ]);

  return {
    parameters: {
      offerer: input.offerer,
      zone: ZERO_ADDRESS,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: input.currency,
          identifierOrCriteria: BigInt(0),
          startAmount: total,
          endAmount: total,
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC721,
          token: input.collection,
          identifierOrCriteria: input.tokenId,
          startAmount: BigInt(1),
          endAmount: BigInt(1),
          recipient: input.offerer,
        },
        {
          itemType: ItemType.ERC20,
          token: input.currency,
          identifierOrCriteria: BigInt(0),
          startAmount: fee,
          endAmount: fee,
          recipient: OPENSEA_FEE_RECIPIENT,
        },
      ],
      orderType: OrderType.FULL_OPEN,
      startTime: input.startTime,
      endTime: input.endTime,
      zoneHash: ZERO_HASH,
      salt,
      conduitKey: OPENSEA_CONDUIT_KEY,
      totalOriginalConsiderationItems: BigInt(2),
    },
    signature: '0x',
  };
}

/**
 * Listing: treasury sells an NFT at a fixed price.
 *
 * Order shape:
 *   offer         = [NFT (ERC721, tokenId)]
 *   consideration = [
 *     {currency, sellerAmount, recipient=offerer},  // seller proceeds
 *     {currency, fee, recipient=OPENSEA_FEE_RECIPIENT},
 *   ]
 *
 * When the askCurrency is the zero address (native ETH), the consideration
 * uses ItemType.NATIVE — buyers pay with msg.value, no approval needed
 * on their side.
 */
export function buildNftListing(input: NftListingInput): Order {
  const fee = (input.askAmount * BigInt(OPENSEA_FEE_BPS)) / BigInt(10_000);
  const sellerProceeds = input.askAmount - fee;
  const isNative = input.askCurrency.toLowerCase() === ZERO_ADDRESS;
  const currencyItemType = isNative ? ItemType.NATIVE : ItemType.ERC20;
  const salt = deriveSalt('nft-listing', input, [
    String(input.tokenId),
    String(input.askAmount),
    String(input.endTime),
  ]);

  return {
    parameters: {
      offerer: input.offerer,
      zone: ZERO_ADDRESS,
      offer: [
        {
          itemType: ItemType.ERC721,
          token: input.collection,
          identifierOrCriteria: input.tokenId,
          startAmount: BigInt(1),
          endAmount: BigInt(1),
        },
      ],
      consideration: [
        {
          itemType: currencyItemType,
          token: isNative ? ZERO_ADDRESS : input.askCurrency,
          identifierOrCriteria: BigInt(0),
          startAmount: sellerProceeds,
          endAmount: sellerProceeds,
          recipient: input.offerer,
        },
        {
          itemType: currencyItemType,
          token: isNative ? ZERO_ADDRESS : input.askCurrency,
          identifierOrCriteria: BigInt(0),
          startAmount: fee,
          endAmount: fee,
          recipient: OPENSEA_FEE_RECIPIENT,
        },
      ],
      orderType: OrderType.FULL_OPEN,
      startTime: input.startTime,
      endTime: input.endTime,
      zoneHash: ZERO_HASH,
      salt,
      conduitKey: OPENSEA_CONDUIT_KEY,
      totalOriginalConsiderationItems: BigInt(2),
    },
    signature: '0x',
  };
}

// ---------------------------------------------------------------------------
// Convenience: build → stringify in one shot, matching the editor field shape
// ---------------------------------------------------------------------------

export function buildCollectionOfferJson(input: CollectionOfferInput): string {
  return stringifyOrder(buildCollectionOffer(input));
}

export function buildItemOfferJson(input: ItemOfferInput): string {
  return stringifyOrder(buildItemOffer(input));
}

export function buildNftListingJson(input: NftListingInput): string {
  return stringifyOrder(buildNftListing(input));
}

// ---------------------------------------------------------------------------
// Salt derivation
// ---------------------------------------------------------------------------

/**
 * Hash inputs to a stable 256-bit value used as the order salt. Including
 * the order kind in the hash means a collection offer and an item offer
 * with otherwise-identical numeric inputs still get different salts.
 *
 * Two identical inputs produce the same salt — which is fine because
 * Seaport's `validate()` is idempotent (re-validating an already-validated
 * order is a no-op). It also means the editor's preview JSON is stable
 * across re-renders.
 */
function deriveSalt(
  kind: string,
  input: { offerer: Address; saltSeed?: string },
  extras: string[],
): bigint {
  const payload = [kind, input.offerer.toLowerCase(), input.saltSeed ?? '', ...extras].join('|');
  return BigInt(keccak256(toHex(payload)));
}
