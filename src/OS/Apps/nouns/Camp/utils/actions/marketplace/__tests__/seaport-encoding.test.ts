/**
 * Direct unit tests for the Seaport tuple encoders. Round-trip every shape
 * we encode (Order + OrderComponents) and verify the byte forms match
 * across encode → decode → re-encode.
 */

import { describe, it, expect } from 'vitest';
import {
  type Order,
  type OrderComponents,
  ItemType,
  OPENSEA_FEE_RECIPIENT,
  OPENSEA_CONDUIT_KEY,
  OrderType,
  decodeCancelCalldata,
  decodeValidateCalldata,
  encodeCancelCalldata,
  encodeValidateCalldata,
  parseOrderComponentsJson,
  parseOrderJson,
  stringifyOrder,
  stringifyOrderComponents,
} from '../_seaport';

const TREASURY = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71' as const;
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as const;
const NOUNS_TOKEN = '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03' as const;

function sampleCollectionOffer(): Order {
  // Treasury bids 1 WETH on any Noun, with the standard OpenSea fee
  // structure (50 BPS to the OpenSea fee recipient).
  return {
    parameters: {
      offerer: TREASURY,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: ItemType.ERC20,
          token: WETH,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt('1000000000000000000'), // 1 WETH
          endAmount: BigInt('1000000000000000000'),
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC721_WITH_CRITERIA,
          token: NOUNS_TOKEN,
          identifierOrCriteria: BigInt(0), // wildcard
          startAmount: BigInt(1),
          endAmount: BigInt(1),
          recipient: TREASURY,
        },
        // OpenSea fee
        {
          itemType: ItemType.ERC20,
          token: WETH,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt('5000000000000000'), // 0.005 WETH = 0.5% of 1 WETH
          endAmount: BigInt('5000000000000000'),
          recipient: OPENSEA_FEE_RECIPIENT,
        },
      ],
      orderType: OrderType.PARTIAL_RESTRICTED,
      startTime: BigInt(1700000000),
      endTime: BigInt(1700604800), // 7 days later
      zoneHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: BigInt('123456789'),
      conduitKey: OPENSEA_CONDUIT_KEY,
      totalOriginalConsiderationItems: BigInt(2),
    },
    signature: '0x', // contract offerer — to be validated on-chain
  };
}

describe('Seaport tuple encoding', () => {
  it('round-trips an Order through validate calldata', () => {
    const order = sampleCollectionOffer();
    const calldata = encodeValidateCalldata([order]);
    const decoded = decodeValidateCalldata(calldata);
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveLength(1);

    // Re-encode the decoded order; must produce byte-identical calldata.
    const reEncoded = encodeValidateCalldata(decoded!);
    expect(reEncoded).toBe(calldata);
  });

  it('round-trips an OrderComponents through cancel calldata', () => {
    const order = sampleCollectionOffer();
    const components: OrderComponents = {
      offerer: order.parameters.offerer,
      zone: order.parameters.zone,
      offer: order.parameters.offer,
      consideration: order.parameters.consideration,
      orderType: order.parameters.orderType,
      startTime: order.parameters.startTime,
      endTime: order.parameters.endTime,
      zoneHash: order.parameters.zoneHash,
      salt: order.parameters.salt,
      conduitKey: order.parameters.conduitKey,
      counter: BigInt(0),
    };
    const calldata = encodeCancelCalldata([components]);
    const decoded = decodeCancelCalldata(calldata);
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveLength(1);

    const reEncoded = encodeCancelCalldata(decoded!);
    expect(reEncoded).toBe(calldata);
  });

  it('round-trips an Order through stringify/parse (BigInt-safe)', () => {
    const order = sampleCollectionOffer();
    const json = stringifyOrder(order);
    const parsed = parseOrderJson(json);
    expect(parsed.parameters.offer[0].startAmount).toBe(
      order.parameters.offer[0].startAmount,
    );
    expect(parsed.parameters.salt).toBe(order.parameters.salt);
    // Re-stringify must match — confirms canonical JSON form.
    expect(stringifyOrder(parsed)).toBe(json);
  });

  it('round-trips OrderComponents through stringify/parse', () => {
    const order = sampleCollectionOffer();
    const components: OrderComponents = {
      ...order.parameters,
      counter: BigInt(42),
    };
    delete (components as Partial<OrderComponents> & { totalOriginalConsiderationItems?: bigint }).totalOriginalConsiderationItems;
    const json = stringifyOrderComponents(components);
    const parsed = parseOrderComponentsJson(json);
    expect(parsed.counter).toBe(BigInt(42));
    expect(stringifyOrderComponents(parsed)).toBe(json);
  });
});
