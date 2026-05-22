/**
 * opensea-listing — buy an NFT from a public OpenSea listing.
 *
 * The custom editor (OpenSeaListingEditor) fetches `fulfillment_data` from
 * the OpenSea API and stuffs the resulting `to`, `value`, `calldata` into
 * fieldValues. The action def's encode just passes them through as the
 * single proposal action.
 *
 * decode() returns null — Seaport calldata is recognised by the transaction
 * decoder's selector-pattern matcher, not by template id. Edit-mode
 * round-trip through this def isn't supported (re-editing requires
 * re-fetching the listing from the marketplace).
 */

import type { Address, Hex } from 'viem';
import type { TransactionActionDef } from '../types';

interface Fields {
  to: string;
  value: string;
  calldata: string;
}

export const openseaListing: TransactionActionDef<Fields> = {
  id: 'opensea-listing',
  category: 'marketplace',
  name: 'Buy on OpenSea',
  description: 'Paste an OpenSea listing URL to purchase an NFT for the treasury',
  isMultiAction: false,
  fields: [
    { name: 'to', label: 'Seaport Contract', type: 'address', required: true },
    { name: 'value', label: 'ETH Value (wei)', type: 'text', required: true },
    { name: 'calldata', label: 'Calldata', type: 'text', required: true },
  ],

  encode(values) {
    return [
      {
        target: (values.to || '') as Address,
        value: values.value || '0',
        signature: '',
        calldata: (values.calldata || '0x') as Hex,
      },
    ];
  },

  decode() {
    return null;
  },

  describe() {
    return [];
  },
};
