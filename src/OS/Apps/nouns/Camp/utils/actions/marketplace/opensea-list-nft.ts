/**
 * opensea-list-nft — list a treasury-held NFT for sale on OpenSea.
 *
 * Inverse of the offer templates: the treasury offers an NFT, accepts ETH
 * (or WETH/USDC). The Order shape:
 *   • offer        = the NFT (ERC721 or ERC1155)
 *   • consideration = the asking currency (split into seller proceeds +
 *                     OpenSea protocol fee + optional royalty)
 *
 * 2 on-chain actions:
 *   1. NFT.setApprovalForAll(OPENSEA_CONDUIT, true)
 *   2. Seaport.validate([order])
 *
 * The approval is `setApprovalForAll` (true) rather than a specific tokenId
 * because the conduit needs blanket permission to settle whichever items
 * the OFFERER (treasury) sells across all its listings. This matches the
 * OpenSea SDK's default behaviour.
 */

import {
  buildApproveAndValidate,
  isListingOrder,
  matchApproveAndValidate,
  tryParseOrderJson,
} from './_validate-pattern';
import type { TransactionActionDef } from '../types';

interface Fields {
  order: string;
}

export const openseaListNft: TransactionActionDef<Fields> = {
  id: 'opensea-list-nft',
  category: 'marketplace',
  name: 'List NFT for Sale (OpenSea)',
  description:
    'Authorise the treasury to sell a held NFT at a specific price (ETH/WETH/USDC). The proposer chooses the listing terms; OpenSea posts the order in its UI.',
  isMultiAction: true,
  fields: [
    {
      name: 'order',
      label: 'Seaport Order (JSON)',
      type: 'text',
      required: true,
      helpText:
        "Order where offer[0] is the NFT and consideration is the asking currency. Editor produces this from collection + tokenId + price.",
    },
  ],

  encode(values) {
    const order = tryParseOrderJson(values.order);
    if (!order) throw new Error('opensea-list-nft: invalid order JSON');
    return buildApproveAndValidate('opensea-list-nft', order);
  },

  decode(actions, cursor) {
    const match = matchApproveAndValidate(actions, cursor, isListingOrder);
    if (!match) return null;
    return {
      values: { order: match.orderJson },
      consumed: match.consumed,
    };
  },

  describe(values, actions) {
    const order = tryParseOrderJson(values.order);
    if (!order) return [];
    const nft = order.parameters.offer[0];
    const ask = order.parameters.consideration[0];
    const askHuman = ask ? `${Number(ask.startAmount) / 1e18} ETH` : 'unknown';
    const lines = [];
    if (actions.length === 2) {
      lines.push({
        title: 'Approve OpenSea conduit for collection',
        functionName: 'setApprovalForAll',
      });
    }
    lines.push({
      title: `List ${nft ? `${nft.token} #${nft.identifierOrCriteria}` : 'NFT'} for ${askHuman}`,
      functionName: 'validate',
    });
    return lines;
  },
};
