/**
 * lst-wsteth-unwrap — single-action `unwrap(amount)` on wstETH.
 * No approval needed (the contract burns the caller's own wstETH).
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { WSTETH_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  amount: string;
}

const SIG = 'unwrap(uint256)';
const TARGET = WSTETH_ADDRESS as Address;

export const wstethUnwrap: TransactionActionDef<Fields> = {
  id: 'lst-wsteth-unwrap',
  category: 'staking',
  name: 'Unwrap wstETH → stETH',
  description: 'Convert treasury wstETH back to rebasing stETH',
  isMultiAction: false,
  fields: [{ name: 'amount', label: 'wstETH Amount', type: 'amount', required: true }],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [
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
    const args = decodeArgs<readonly [bigint]>(action, 'uint256');
    if (!args) return null;
    return {
      values: { amount: formatTokenAmount(args[0], 18) },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Unwrap ${values.amount} wstETH`,
        functionName: 'unwrap',
        params: { amount: values.amount },
      },
    ];
  },
};
