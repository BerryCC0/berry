/**
 * admin-data-withdraw-eth — `withdrawETH(address recipient, uint256 amount)`.
 * Two-arg setter, doesn't fit makeUintAction or makeAddressAction.
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { DATA_PROXY_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  recipient: string;
  amount: string;
}

const SIG = 'withdrawETH(address,uint256)';
const TARGET = DATA_PROXY_ADDRESS as Address;

export const adminDataWithdrawEth: TransactionActionDef<Fields> = {
  id: 'admin-data-withdraw-eth',
  category: 'governance-admin',
  name: 'Withdraw ETH from Data Proxy',
  description: 'Sweep ETH from the candidate-fee accumulation to a recipient',
  isMultiAction: false,
  fields: [
    { name: 'recipient', label: 'Recipient', type: 'address', required: true },
    { name: 'amount', label: 'Amount (ETH)', type: 'amount', required: true },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          values.recipient as Address,
          parseUnits(values.amount || '0', 18),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [Address, bigint]>(
      action.calldata,
      'address, uint256',
    );
    if (!args) return null;
    return {
      values: {
        recipient: args[0],
        amount: formatTokenAmount(args[1], 18),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Withdraw ${values.amount} ETH from Data Proxy`,
        description: `to ${values.recipient}`,
        functionName: 'withdrawETH',
        params: { ...values },
      },
    ];
  },
};
