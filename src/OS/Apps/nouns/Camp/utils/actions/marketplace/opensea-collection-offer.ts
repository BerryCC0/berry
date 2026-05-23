/**
 * opensea-collection-offer — bid on any token in an NFT collection.
 *
 * The treasury becomes the offerer of a Seaport order where:
 *   • offer    = WETH amount the treasury is willing to pay
 *   • consideration = one ERC721_WITH_CRITERIA item targeting the entire
 *                     collection (criteria = 0 → any tokenId)
 *
 * 2 on-chain actions:
 *   1. WETH.approve(OPENSEA_CONDUIT, totalAmount)
 *   2. Seaport.validate([order])
 *
 * The `order` field is a JSON-stringified Order produced by the editor
 * (or pasted by a power user). All Seaport-specific fields (salt, zone,
 * conduitKey, fees, etc.) live in the JSON; this action def encodes them
 * verbatim. Editors that DON'T have the right Seaport fees configured
 * will produce orders that OpenSea's UI doesn't display — see the editor
 * implementation for the canonical fee structure.
 *
 * After this proposal executes, the order is on-chain authorised. For it
 * to be visible on OpenSea's UI, someone must also POST the order body
 * (parameters + empty signature) to OpenSea's `orders/v2/post` endpoint.
 * That's typically done off-chain by whoever posted the proposal.
 */

import {
  buildApproveAndValidate,
  isCollectionOfferOrder,
  matchApproveAndValidate,
  tryParseOrderJson,
} from './_validate-pattern';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** JSON-stringified Order (parameters + signature). */
  order: string;
}

export const openseaCollectionOffer: TransactionActionDef<Fields> = {
  id: 'opensea-collection-offer',
  category: 'marketplace',
  name: 'Make Collection Offer (OpenSea)',
  description:
    'Standing offer on any NFT in a collection. Useful for buybacks (e.g., a treasury bid on the Nouns collection) and CC0 proliferation buys.',
  isMultiAction: true,
  fields: [
    {
      name: 'order',
      label: 'Seaport Order (JSON)',
      type: 'text',
      required: true,
      helpText:
        'Full Order parameters + empty signature. The editor builds this from collection + amount + expiration; power users can paste an OpenSea SDK output.',
    },
  ],

  encode(values) {
    const order = tryParseOrderJson(values.order);
    if (!order) {
      throw new Error('opensea-collection-offer: invalid order JSON');
    }
    return buildApproveAndValidate('opensea-collection-offer', order);
  },

  decode(actions, cursor) {
    const match = matchApproveAndValidate(actions, cursor, isCollectionOfferOrder);
    if (!match) return null;
    return {
      values: { order: match.orderJson },
      consumed: match.consumed,
    };
  },

  describe(values, actions) {
    const order = tryParseOrderJson(values.order);
    if (!order) return [];
    const collectionAddress =
      order.parameters.consideration[0]?.token ?? 'unknown collection';
    const offerAmount = order.parameters.offer[0]?.startAmount ?? BigInt(0);
    const human =
      Number(offerAmount) / 1e18 > 0
        ? `${Number(offerAmount) / 1e18} ${order.parameters.offer[0]?.token ? 'WETH' : 'ETH'}`
        : `${offerAmount.toString()} (raw)`;
    const lines = [];
    if (actions.length === 2) {
      lines.push({
        title: 'Approve WETH for OpenSea conduit',
        functionName: 'approve',
      });
    }
    lines.push({
      title: `Collection offer: ${human}`,
      description: `on ${collectionAddress}`,
      functionName: 'validate',
    });
    return lines;
  },
};
