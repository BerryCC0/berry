/**
 * opensea-item-offer — bid on a specific tokenId in a collection.
 *
 * Identical on-chain shape to opensea-collection-offer; differs only in the
 * consideration's `identifierOrCriteria` (a real tokenId rather than 0 for
 * wildcard) and `itemType` (ERC721 rather than ERC721_WITH_CRITERIA).
 *
 * Useful for the DAO bidding under-floor on a specific Noun the treasury
 * wants to bring back (e.g., a historic / rare Noun).
 *
 * Same 2-action shape: WETH.approve + Seaport.validate.
 */

import {
  buildApproveAndValidate,
  matchApproveAndValidate,
  tryParseOrderJson,
} from './_validate-pattern';
import type { TransactionActionDef } from '../types';

interface Fields {
  order: string;
}

export const openseaItemOffer: TransactionActionDef<Fields> = {
  id: 'opensea-item-offer',
  category: 'marketplace',
  name: 'Make Item Offer (OpenSea)',
  description:
    'Standing offer on one specific NFT. Lower-than-ask bidding for items the treasury wants without paying floor.',
  isMultiAction: true,
  fields: [
    {
      name: 'order',
      label: 'Seaport Order (JSON)',
      type: 'text',
      required: true,
      helpText:
        'Order where consideration[0] is a specific (collection, tokenId).',
    },
  ],

  encode(values) {
    const order = tryParseOrderJson(values.order);
    if (!order) throw new Error('opensea-item-offer: invalid order JSON');
    return buildApproveAndValidate('opensea-item-offer', order);
  },

  decode(actions, cursor) {
    const match = matchApproveAndValidate(actions, cursor);
    if (!match) return null;
    return {
      values: { order: match.orderJson },
      consumed: match.consumed,
    };
  },

  describe(values, actions) {
    const order = tryParseOrderJson(values.order);
    if (!order) return [];
    const c = order.parameters.consideration[0];
    const offer = order.parameters.offer[0];
    const human = offer
      ? `${Number(offer.startAmount) / 1e18} WETH`
      : '0';
    const lines = [];
    if (actions.length === 2) {
      lines.push({
        title: 'Approve WETH for OpenSea conduit',
        functionName: 'approve',
      });
    }
    lines.push({
      title: `Item offer: ${human}`,
      description: c
        ? `on ${c.token} #${c.identifierOrCriteria}`
        : 'unknown item',
      functionName: 'validate',
    });
    return lines;
  },
};
