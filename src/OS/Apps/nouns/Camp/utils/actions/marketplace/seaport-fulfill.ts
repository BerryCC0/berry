/**
 * marketplace-fulfill-seaport — power-user fallback for the OpenSea listing
 * template. Accepts hand-built Seaport calldata (e.g., from the Seaport JS
 * SDK or a private listing's `fulfillment_data` API response).
 *
 * Same passthrough shape as opensea-listing; existing as a separate template
 * so the editor picks the right UI (no API fetch, raw paste only).
 */

import type { Address, Hex } from 'viem';
import type { TransactionActionDef } from '../types';

interface Fields {
  to: string;
  value: string;
  calldata: string;
}

export const seaportFulfill: TransactionActionDef<Fields> = {
  id: 'marketplace-fulfill-seaport',
  category: 'marketplace',
  name: 'Fulfill Seaport Order (advanced)',
  description: 'Manual Seaport fulfillment with pre-built calldata',
  isMultiAction: false,
  fields: [
    { name: 'to', label: 'Seaport Contract', type: 'address', required: true },
    { name: 'value', label: 'ETH Value (wei)', type: 'text', required: true },
    { name: 'calldata', label: 'Pre-built Calldata', type: 'text', required: true },
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
