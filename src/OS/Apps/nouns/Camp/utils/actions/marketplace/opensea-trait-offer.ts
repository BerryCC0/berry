/**
 * opensea-trait-offer — bid on any NFT in a collection matching specific traits.
 *
 * Seaport supports this via the criteria-based item types
 * (ERC721_WITH_CRITERIA / ERC1155_WITH_CRITERIA) where
 * `identifierOrCriteria` holds the merkle root of allowed token IDs and
 * fulfillment must include a merkle proof for the actual token used.
 *
 * Computing the merkle root of "all Nouns with glasses=Black Watermelon"
 * requires the off-chain set of qualifying tokenIds + a standard merkle
 * tree library. The editor (or a server route) handles that; this action
 * def just encodes the resulting Order verbatim, same as the other
 * validate-based templates.
 *
 * On-chain emission is the same 2-action shape: WETH.approve + Seaport.validate.
 */

import {
  buildApproveAndValidate,
  isTraitOfferOrder,
  matchApproveAndValidate,
  tryParseOrderJson,
} from './_validate-pattern';
import type { TransactionActionDef } from '../types';

interface Fields {
  order: string;
}

export const openseaTraitOffer: TransactionActionDef<Fields> = {
  id: 'opensea-trait-offer',
  category: 'marketplace',
  name: 'Make Trait Offer (OpenSea)',
  description:
    'Standing offer on any NFT in a collection matching specific traits (criteria = merkle root of qualifying tokenIds).',
  isMultiAction: true,
  fields: [
    {
      name: 'order',
      label: 'Seaport Order (JSON)',
      type: 'text',
      required: true,
      helpText:
        'Order where consideration[0] uses ERC721_WITH_CRITERIA. identifierOrCriteria = merkle root of qualifying tokenIds.',
    },
  ],

  encode(values) {
    const order = tryParseOrderJson(values.order);
    if (!order) throw new Error('opensea-trait-offer: invalid order JSON');
    return buildApproveAndValidate('opensea-trait-offer', order);
  },

  decode(actions, cursor) {
    const match = matchApproveAndValidate(actions, cursor, isTraitOfferOrder);
    if (!match) return null;
    return {
      values: { order: match.orderJson },
      consumed: match.consumed,
    };
  },

  describe(values, actions) {
    const order = tryParseOrderJson(values.order);
    if (!order) return [];
    const offer = order.parameters.offer[0];
    const human = offer
      ? `${Number(offer.startAmount) / 1e18} WETH`
      : '0';
    const collection = order.parameters.consideration[0]?.token ?? 'unknown';
    const lines = [];
    if (actions.length === 2) {
      lines.push({
        title: 'Approve WETH for OpenSea conduit',
        functionName: 'approve',
      });
    }
    lines.push({
      title: `Trait offer: ${human}`,
      description: `on ${collection} matching trait criteria`,
      functionName: 'validate',
    });
    return lines;
  },
};
