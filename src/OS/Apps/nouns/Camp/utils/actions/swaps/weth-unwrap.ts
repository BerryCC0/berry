/**
 * weth-unwrap — single-action `WETH.withdraw(amount)`.
 *
 * Converts the treasury's WETH back into ETH (1:1). The inverse of
 * `weth-wrap`. Useful for cleaning up unused WETH after canceling offers,
 * or for moving funds into ETH-denominated downstream actions (e.g.
 * funding a stream that pays in ETH).
 */

import {
  encodeAbiParameters,
  parseAbiParameters,
  parseUnits,
  type Address,
} from 'viem';
import { EXTERNAL_CONTRACTS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** WETH amount, in human display units (e.g. "5" for 5 WETH = 5 ETH out). */
  wethAmount: string;
}

const WETH = EXTERNAL_CONTRACTS.WETH.address;
const WITHDRAW_SIG = 'withdraw(uint256)';

export const wethUnwrap: TransactionActionDef<Fields> = {
  id: 'weth-unwrap',
  category: 'swaps',
  name: 'Unwrap WETH → ETH',
  description: "Convert the treasury's WETH back into native ETH (1:1, no slippage).",
  isMultiAction: false,
  fields: [
    {
      name: 'wethAmount',
      label: 'WETH Amount',
      type: 'amount',
      placeholder: '0.0',
      required: true,
      validation: { min: 0, decimals: 18 },
      helpText: 'Amount of WETH to unwrap. You will receive an equal amount of ETH.',
    },
  ],

  encode(values) {
    const amount = parseUnits(values.wethAmount || '0', 18);
    return [
      {
        target: WETH as Address,
        value: '0',
        signature: WITHDRAW_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [amount]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, WETH)) return null;
    if (!matchSignature(action, WITHDRAW_SIG)) return null;
    const args = decodeArgs<readonly [bigint]>(action, 'uint256');
    if (!args) return null;
    return {
      values: { wethAmount: formatTokenAmount(args[0], 18) },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Unwrap ${values.wethAmount} WETH → ETH`,
        description: 'Returns an equal amount of native ETH to the treasury',
        functionName: 'withdraw',
        params: { amount: values.wethAmount },
      },
    ];
  },
};
