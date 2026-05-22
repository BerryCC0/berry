/**
 * auction-bid — place a bid on the live Noun auction from treasury funds.
 * One on-chain action: `createBid(nounId, clientId)` on AuctionHouse with
 * the ETH bid in the value field. `clientId` is BERRY_CLIENT_ID so Berry OS
 * earns its protocol reward when treasury bids land via Camp.
 */

import { encodeAbiParameters, parseAbiParameters, parseEther } from 'viem';
import { NOUNS_ADDRESSES, BERRY_CLIENT_ID } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  nounId: string;
  bidAmount: string;
}

const CREATE_BID_SIG = 'createBid(uint256,uint32)';

export const auctionBid: TransactionActionDef<Fields> = {
  id: 'auction-bid',
  category: 'nouns',
  name: 'Bid on Noun Auction',
  description: 'Place a bid on the live Noun auction from treasury funds',
  isMultiAction: false,
  fields: [
    {
      name: 'nounId',
      label: 'Noun ID',
      type: 'number',
      placeholder: '1234',
      required: true,
      validation: { min: 0 },
      helpText: 'The ID of the Noun to bid on',
    },
    {
      name: 'bidAmount',
      label: 'Bid Amount (ETH)',
      type: 'amount',
      placeholder: '100',
      required: true,
      validation: { min: 0, decimals: 18 },
      helpText: 'Amount of ETH to bid from the treasury',
    },
  ],

  encode(values) {
    const bidAmountWei = parseEther(values.bidAmount || '0');
    return [
      {
        target: NOUNS_ADDRESSES.auctionHouse,
        value: bidAmountWei.toString(),
        signature: CREATE_BID_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256, uint32'), [
          BigInt(values.nounId || '0'),
          BERRY_CLIENT_ID,
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!addressEquals(action.target, NOUNS_ADDRESSES.auctionHouse)) return null;
    if (!matchSignature(action, CREATE_BID_SIG)) return null;

    const args = decodeArgs<readonly [bigint, number]>(
      action.calldata,
      'uint256, uint32',
    );
    if (!args) return null;
    return {
      values: {
        nounId: args[0].toString(),
        bidAmount: formatTokenAmount(BigInt(action.value || '0'), 18),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Bid ${values.bidAmount} ETH on Noun #${values.nounId}`,
        functionName: 'createBid',
        params: { nounId: values.nounId, bidAmount: values.bidAmount },
      },
    ];
  },
};
