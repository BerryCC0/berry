/**
 * tokenbuyer-refill-eth — send ETH directly to the TokenBuyer so it can keep
 * paying bots that arb USDC into the Payer. Same on-chain shape as a plain
 * ETH transfer; differentiated only by target = TokenBuyer.
 *
 * MUST be registered before `treasury-transfer` in `registry.ts` so the
 * generic ETH-transfer matcher doesn't claim it first.
 */

import { type Address, parseEther } from 'viem';
import { TOKEN_BUYER_ADDRESS } from '../../actionTemplates/constants';
import {
  addressEquals,
  formatTokenAmount,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** ETH amount, in human display units (e.g. "5" for 5 ETH). */
  ethAmount: string;
}

export const tokenbuyerRefillEth: TransactionActionDef<Fields> = {
  id: 'tokenbuyer-refill-eth',
  category: 'treasury',
  name: 'Refill TokenBuyer (ETH)',
  description:
    'Send ETH to the TokenBuyer so it can keep paying out to bots arbing USDC into the Payer',
  isMultiAction: false,
  fields: [
    {
      name: 'ethAmount',
      label: 'ETH Amount',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: 18 },
    },
  ],

  encode(values) {
    return [
      {
        target: TOKEN_BUYER_ADDRESS as Address,
        value: parseEther(values.ethAmount || '0').toString(),
        signature: '',
        calldata: '0x',
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (action.signature) return null;
    if (action.calldata && action.calldata !== '0x') return null;
    if (!action.value || action.value === '0') return null;
    if (!addressEquals(action.target, TOKEN_BUYER_ADDRESS)) return null;
    return {
      values: { ethAmount: formatTokenAmount(BigInt(action.value), 18) },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Refill TokenBuyer with ${values.ethAmount} ETH`,
        description: 'Funds bot-driven USDC → ETH swaps for the Payer',
        functionName: 'transfer',
        params: { amount: values.ethAmount },
      },
    ];
  },
};
