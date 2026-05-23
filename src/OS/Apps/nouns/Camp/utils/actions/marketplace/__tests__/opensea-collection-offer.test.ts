/**
 * Round-trip tests for the validate-based offer templates. All four
 * (collection / item / trait offer + list-nft) share the same
 * _validate-pattern helper, so testing one rigorously covers the bundle
 * logic; the others get smoke tests.
 */

import { describe, it, expect } from 'vitest';
import { openseaCollectionOffer } from '../opensea-collection-offer';
import { openseaItemOffer } from '../opensea-item-offer';
import { openseaTraitOffer } from '../opensea-trait-offer';
import { openseaListNft } from '../opensea-list-nft';
import {
  ItemType,
  OPENSEA_CONDUIT,
  OPENSEA_CONDUIT_KEY,
  OPENSEA_FEE_RECIPIENT,
  OrderType,
  SEAPORT_1_6,
  stringifyOrder,
} from '../_seaport';
import { assertRoundTrip } from '../../__tests__/roundTrip';

const TREASURY = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' as const;
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const;
const NOUNS_TOKEN = '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03' as const;

function collectionOfferJson(): string {
  return stringifyOrder({
    parameters: {
      offerer: TREASURY,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: ItemType.ERC20,
          token: WETH,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt('1000000000000000000'),
          endAmount: BigInt('1000000000000000000'),
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC721_WITH_CRITERIA,
          token: NOUNS_TOKEN,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt(1),
          endAmount: BigInt(1),
          recipient: TREASURY,
        },
        {
          itemType: ItemType.ERC20,
          token: WETH,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt('5000000000000000'),
          endAmount: BigInt('5000000000000000'),
          recipient: OPENSEA_FEE_RECIPIENT,
        },
      ],
      orderType: OrderType.PARTIAL_RESTRICTED,
      startTime: BigInt(1700000000),
      endTime: BigInt(1700604800),
      zoneHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: BigInt('123456789'),
      conduitKey: OPENSEA_CONDUIT_KEY,
      totalOriginalConsiderationItems: BigInt(2),
    },
    signature: '0x',
  });
}

describe('opensea-collection-offer', () => {
  it('emits 2-action bundle: WETH.approve + Seaport.validate', () => {
    const actions = openseaCollectionOffer.encode(
      { order: collectionOfferJson() },
      {},
    );
    expect(actions).toHaveLength(2);
    // First action: WETH.approve(OPENSEA_CONDUIT, 1 WETH)
    expect(actions[0].target.toLowerCase()).toBe(WETH);
    expect(actions[0].signature).toBe('approve(address,uint256)');
    // Second action: Seaport.validate([order])
    expect(actions[1].target).toBe(SEAPORT_1_6);
    expect(actions[1].signature).toBe('validate(Order[])');
  });

  it('approves the conduit (not Seaport directly)', () => {
    const [approve] = openseaCollectionOffer.encode(
      { order: collectionOfferJson() },
      {},
    );
    // The approve.calldata starts with the spender address — verify it's
    // the OpenSea conduit, not Seaport. The first 32 bytes are the address
    // (left-padded), so checking the last 40 hex chars of the first 64.
    const spenderHex = '0x' + approve.calldata.slice(2 + 24, 2 + 64);
    expect(spenderHex.toLowerCase()).toBe(OPENSEA_CONDUIT.toLowerCase());
  });

  it('round-trips a collection offer', () => {
    assertRoundTrip(openseaCollectionOffer, { order: collectionOfferJson() });
  });

  it('produces deterministic group IDs (no Date.now())', () => {
    const a = openseaCollectionOffer.encode(
      { order: collectionOfferJson() },
      {},
    );
    const b = openseaCollectionOffer.encode(
      { order: collectionOfferJson() },
      {},
    );
    expect(a[0].multiActionGroupId).toBe(b[0].multiActionGroupId);
  });
});

describe('opensea-item-offer', () => {
  it('round-trips when consideration targets a specific tokenId', () => {
    const json = stringifyOrder({
      parameters: {
        offerer: TREASURY,
        zone: '0x0000000000000000000000000000000000000000',
        offer: [
          {
            itemType: ItemType.ERC20,
            token: WETH,
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt('500000000000000000'),
            endAmount: BigInt('500000000000000000'),
          },
        ],
        consideration: [
          {
            itemType: ItemType.ERC721,
            token: NOUNS_TOKEN,
            identifierOrCriteria: BigInt(42),
            startAmount: BigInt(1),
            endAmount: BigInt(1),
            recipient: TREASURY,
          },
        ],
        orderType: OrderType.FULL_RESTRICTED,
        startTime: BigInt(1700000000),
        endTime: BigInt(1700604800),
        zoneHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: BigInt('987'),
        conduitKey: OPENSEA_CONDUIT_KEY,
        totalOriginalConsiderationItems: BigInt(1),
      },
      signature: '0x',
    });
    assertRoundTrip(openseaItemOffer, { order: json });
  });
});

describe('opensea-trait-offer', () => {
  it('round-trips a criteria-based offer', () => {
    // Same shape as collection offer but with a non-zero criteria (merkle root).
    const json = stringifyOrder({
      parameters: {
        offerer: TREASURY,
        zone: '0x0000000000000000000000000000000000000000',
        offer: [
          {
            itemType: ItemType.ERC20,
            token: WETH,
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt('2000000000000000000'),
            endAmount: BigInt('2000000000000000000'),
          },
        ],
        consideration: [
          {
            itemType: ItemType.ERC721_WITH_CRITERIA,
            token: NOUNS_TOKEN,
            // Fake merkle root of qualifying tokenIds:
            identifierOrCriteria: BigInt(
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ),
            startAmount: BigInt(1),
            endAmount: BigInt(1),
            recipient: TREASURY,
          },
        ],
        orderType: OrderType.PARTIAL_RESTRICTED,
        startTime: BigInt(1700000000),
        endTime: BigInt(1700604800),
        zoneHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: BigInt('555'),
        conduitKey: OPENSEA_CONDUIT_KEY,
        totalOriginalConsiderationItems: BigInt(1),
      },
      signature: '0x',
    });
    assertRoundTrip(openseaTraitOffer, { order: json });
  });
});

describe('opensea-list-nft', () => {
  it('emits setApprovalForAll + validate for a listing', () => {
    const json = stringifyOrder({
      parameters: {
        offerer: TREASURY,
        zone: '0x0000000000000000000000000000000000000000',
        offer: [
          {
            itemType: ItemType.ERC721,
            token: NOUNS_TOKEN,
            identifierOrCriteria: BigInt(100),
            startAmount: BigInt(1),
            endAmount: BigInt(1),
          },
        ],
        consideration: [
          {
            // Buyer pays the seller (treasury) in ETH
            itemType: ItemType.NATIVE,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt('10000000000000000000'), // 10 ETH
            endAmount: BigInt('10000000000000000000'),
            recipient: TREASURY,
          },
        ],
        orderType: OrderType.FULL_OPEN,
        startTime: BigInt(1700000000),
        endTime: BigInt(1700604800),
        zoneHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: BigInt('111'),
        conduitKey: OPENSEA_CONDUIT_KEY,
        totalOriginalConsiderationItems: BigInt(1),
      },
      signature: '0x',
    });
    const actions = openseaListNft.encode({ order: json }, {});
    expect(actions).toHaveLength(2);
    // Approval target is the NFT contract; signature is setApprovalForAll
    expect(actions[0].target.toLowerCase()).toBe(NOUNS_TOKEN);
    expect(actions[0].signature).toBe('setApprovalForAll(address,bool)');
    expect(actions[1].target).toBe(SEAPORT_1_6);
  });
});
