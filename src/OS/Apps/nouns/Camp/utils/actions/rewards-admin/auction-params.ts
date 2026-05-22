/**
 * admin-rewards-auction-params — `setAuctionRewardParams((uint16, uint8))`.
 * Static struct of (auctionRewardBps, minimumAuctionsBetweenUpdates).
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  auctionRewardBps: string;
  minimumAuctionsBetweenUpdates: string;
}

const SIG = 'setAuctionRewardParams((uint16,uint8))';
const TARGET = CLIENT_REWARDS_ADDRESS as Address;

export const adminRewardsAuctionParams: TransactionActionDef<Fields> = {
  id: 'admin-rewards-auction-params',
  category: 'rewards-admin',
  name: 'Set Auction Reward Params',
  description: 'Reward rate (BPS) and minimum auctions between rate updates',
  isMultiAction: false,
  fields: [
    { name: 'auctionRewardBps', label: 'Reward (BPS)', type: 'number', required: true },
    { name: 'minimumAuctionsBetweenUpdates', label: 'Min auctions between updates', type: 'number', required: true },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('(uint16, uint8)'), [
          [
            Number(values.auctionRewardBps || '0'),
            Number(values.minimumAuctionsBetweenUpdates || '0'),
          ],
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [readonly [number, number]]>(
      action.calldata,
      '(uint16, uint8)',
    );
    if (!args) return null;
    return {
      values: {
        auctionRewardBps: args[0][0].toString(),
        minimumAuctionsBetweenUpdates: args[0][1].toString(),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Auction rewards: ${values.auctionRewardBps} BPS, ${values.minimumAuctionsBetweenUpdates} auctions cooldown`,
        functionName: 'setAuctionRewardParams',
        params: { ...values },
      },
    ];
  },
};
