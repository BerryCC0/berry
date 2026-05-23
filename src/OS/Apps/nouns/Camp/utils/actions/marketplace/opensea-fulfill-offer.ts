/**
 * opensea-fulfill-offer — treasury sells INTO someone else's standing
 * Seaport offer.
 *
 * The inverse of opensea-collection-offer: someone has bid X WETH for an
 * NFT (potentially via criteria), and the treasury owns a qualifying NFT
 * and wants to sell to that bid. The proposer pastes the bidder's full
 * `AdvancedOrder` + (if criteria-based) `CriteriaResolver[]`.
 *
 * On-chain: `Seaport.fulfillAdvancedOrder(AdvancedOrder, CriteriaResolver[],
 * bytes32 fulfillerConduitKey, address recipient)`. The treasury is the
 * fulfiller; the bidder's WETH goes to the treasury minus fees, and the
 * NFT goes from the treasury to the bidder.
 *
 * Prefix action: NFT.setApprovalForAll(OPENSEA_CONDUIT, true). Without it,
 * the conduit can't pull the NFT from the treasury when the order settles.
 */

import {
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
  multiActionId,
} from '../shared';
import type { TransactionActionDef } from '../types';
import {
  ADVANCED_ORDER_ABI,
  CRITERIA_RESOLVER_ABI,
  OPENSEA_CONDUIT,
  OPENSEA_CONDUIT_KEY,
  SEAPORT_1_6,
} from './_seaport';

interface Fields {
  /** Address of the NFT being sold (for the prefix approval). */
  nftContract: string;
  /** JSON-stringified AdvancedOrder (the bidder's offer). */
  advancedOrder: string;
  /** JSON-stringified CriteriaResolver[] (for criteria-based offers). */
  criteriaResolvers: string;
}

/**
 * Canonical Solidity signature for Seaport's `fulfillAdvancedOrder(...)`.
 *
 * The Nouns Timelock computes `bytes4(keccak256(bytes(signature)))` to
 * produce the 4-byte selector, so the string MUST be fully tuple-expanded.
 * The human-readable form (`fulfillAdvancedOrder(AdvancedOrder, ...)`) hashes
 * to a different selector and Seaport would revert.
 */
const SIG = 'fulfillAdvancedOrder(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256),uint120,uint120,bytes,bytes),(uint256,uint8,uint256,uint256,bytes32[])[],bytes32,address)';

/** Legacy form kept only for backward-compatible decode of stale drafts. */
const LEGACY_HUMAN_SIG = 'fulfillAdvancedOrder(AdvancedOrder,CriteriaResolver[],bytes32,address)';

const TARGET = SEAPORT_1_6 as Address;
const APPROVE_SIG = 'setApprovalForAll(address,bool)';

function parseResolvers(raw: string | undefined): RawCriteriaResolver[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JsonCriteriaResolver[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => [
      BigInt(r.orderIndex),
      r.side,
      BigInt(r.index),
      BigInt(r.identifier),
      r.criteriaProof as Hex[],
    ] as RawCriteriaResolver);
  } catch {
    return [];
  }
}

function stringifyResolvers(rs: readonly RawCriteriaResolver[]): string {
  const json: JsonCriteriaResolver[] = rs.map((r) => ({
    orderIndex: r[0].toString(),
    side: r[1],
    index: r[2].toString(),
    identifier: r[3].toString(),
    criteriaProof: [...r[4]],
  }));
  return JSON.stringify(json);
}

interface JsonCriteriaResolver {
  orderIndex: string;
  side: number;
  index: string;
  identifier: string;
  criteriaProof: string[];
}

type RawCriteriaResolver = readonly [bigint, number, bigint, bigint, readonly Hex[]];

export const openseaFulfillOffer: TransactionActionDef<Fields> = {
  id: 'opensea-fulfill-offer',
  category: 'marketplace',
  name: 'Fulfill OpenSea Offer (sell INTO a bid)',
  description:
    "Accept someone else's standing OpenSea bid — the treasury sells an NFT to claim the bidder's WETH.",
  isMultiAction: true,
  fields: [
    {
      name: 'nftContract',
      label: 'NFT Contract Address',
      type: 'address',
      required: true,
      helpText:
        'The collection of the NFT being sold (for the prefix approval).',
    },
    {
      name: 'advancedOrder',
      label: "Bidder's AdvancedOrder (JSON)",
      type: 'text',
      required: true,
      helpText:
        "The full Order struct from the bidder, with numerator/denominator for partial fills and their signature.",
    },
    {
      name: 'criteriaResolvers',
      label: 'Criteria Resolvers (JSON, optional)',
      type: 'text',
      helpText:
        'For criteria-based offers (e.g., trait offers), provide the merkle proofs identifying which specific tokenId fulfills the criteria.',
    },
  ],

  encode(values) {
    // Parse the AdvancedOrder JSON. We pass it through to the abi-encoder
    // as a single nested tuple. The full shape is documented in
    // _seaport.ts (ADVANCED_ORDER_ABI).
    const advancedOrderJson = JSON.parse(values.advancedOrder) as RawAdvancedOrderJson;
    const advancedOrderTuple = advancedOrderJsonToTuple(advancedOrderJson);
    const resolvers = parseResolvers(values.criteriaResolvers);

    const fulfillCalldata = encodeAbiParameters(
      parseAbiParameters(
        `${ADVANCED_ORDER_ABI}, ${CRITERIA_RESOLVER_ABI}[], bytes32, address`,
      ),
      [
        advancedOrderTuple as never,
        resolvers as never,
        OPENSEA_CONDUIT_KEY,
        // Recipient = address(0) means "back to msg.sender" (the treasury).
        '0x0000000000000000000000000000000000000000' as Address,
      ],
    );

    const groupId = multiActionId('opensea-fulfill-offer', {
      calldata: fulfillCalldata,
    });

    return [
      {
        target: values.nftContract as Address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, bool'), [
          OPENSEA_CONDUIT,
          true,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: fulfillCalldata,
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    // 2-action shape preferred. Fall back to single fulfill if no approve.
    const approve = actions[cursor];
    const fulfill = actions[cursor + 1];

    if (
      approve &&
      fulfill &&
      matchTarget(fulfill, TARGET) &&
      (matchSignature(fulfill, SIG) ||
        matchSignature(fulfill, LEGACY_HUMAN_SIG)) &&
      matchSignature(approve, APPROVE_SIG)
    ) {
      const approveArgs = decodeArgs<readonly [Address, boolean]>(
        approve.calldata,
        'address, bool',
      );
      if (approveArgs) {
        const decoded = decodeFulfillAdvancedOrderCalldata(fulfill.calldata);
        if (decoded) {
          return {
            values: {
              nftContract: approve.target,
              advancedOrder: JSON.stringify(decoded.advancedOrder),
              criteriaResolvers: stringifyResolvers(decoded.resolvers),
            },
            consumed: 2,
          };
        }
      }
    }

    // Legacy / lone fulfill (no approve — already-approved conduit).
    const lone = actions[cursor];
    if (
      lone &&
      matchTarget(lone, TARGET) &&
      (matchSignature(lone, SIG) || matchSignature(lone, LEGACY_HUMAN_SIG))
    ) {
      const decoded = decodeFulfillAdvancedOrderCalldata(lone.calldata);
      if (decoded) {
        return {
          values: {
            // No prefix → we don't know the NFT contract from calldata
            // alone. Leave empty; the proposer fills it on re-edit.
            nftContract: '',
            advancedOrder: JSON.stringify(decoded.advancedOrder),
            criteriaResolvers: stringifyResolvers(decoded.resolvers),
          },
          consumed: 1,
        };
      }
    }

    return null;
  },

  describe(values, actions) {
    const lines = [];
    if (actions.length === 2) {
      lines.push({
        title: 'Approve OpenSea conduit for NFT collection',
        functionName: 'setApprovalForAll',
      });
    }
    lines.push({
      title: `Fulfill standing offer on ${values.nftContract || 'NFT'}`,
      description: "Treasury sells INTO the bidder's offer",
      functionName: 'fulfillAdvancedOrder',
    });
    return lines;
  },
};

// ---------------------------------------------------------------------------
// AdvancedOrder JSON <-> tuple — same shape as Order but with extra fields
// ---------------------------------------------------------------------------

interface RawAdvancedOrderJson {
  parameters: {
    offerer: string;
    zone: string;
    offer: Array<{
      itemType: number;
      token: string;
      identifierOrCriteria: string;
      startAmount: string;
      endAmount: string;
    }>;
    consideration: Array<{
      itemType: number;
      token: string;
      identifierOrCriteria: string;
      startAmount: string;
      endAmount: string;
      recipient: string;
    }>;
    orderType: number;
    startTime: string;
    endTime: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: string;
  };
  numerator: string;
  denominator: string;
  signature: string;
  extraData: string;
}

function advancedOrderJsonToTuple(j: RawAdvancedOrderJson): unknown {
  return [
    [
      j.parameters.offerer,
      j.parameters.zone,
      j.parameters.offer.map((o) => [
        o.itemType,
        o.token,
        BigInt(o.identifierOrCriteria),
        BigInt(o.startAmount),
        BigInt(o.endAmount),
      ]),
      j.parameters.consideration.map((c) => [
        c.itemType,
        c.token,
        BigInt(c.identifierOrCriteria),
        BigInt(c.startAmount),
        BigInt(c.endAmount),
        c.recipient,
      ]),
      j.parameters.orderType,
      BigInt(j.parameters.startTime),
      BigInt(j.parameters.endTime),
      j.parameters.zoneHash,
      BigInt(j.parameters.salt),
      j.parameters.conduitKey,
      BigInt(j.parameters.totalOriginalConsiderationItems),
    ],
    BigInt(j.numerator),
    BigInt(j.denominator),
    j.signature,
    j.extraData,
  ];
}

function decodeFulfillAdvancedOrderCalldata(
  calldata: string | undefined,
): { advancedOrder: RawAdvancedOrderJson; resolvers: RawCriteriaResolver[] } | null {
  // Decoding the full AdvancedOrder + CriteriaResolver[] tuple is heavy
  // enough that we punt on round-trip parity here. The encoded calldata is
  // canonical; round-trip via re-edit preserves the JSON payload that
  // produced it. Returning null for the parse path means the editor will
  // round-trip via the stored JSON field rather than reconstructing it from
  // calldata — which is a reasonable trade since the AdvancedOrder JSON is
  // structurally complex and the editor stores it verbatim anyway.
  void calldata;
  return null;
}
