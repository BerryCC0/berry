/**
 * lst-wsteth-wrap — 2-action: approve(wstETH, X) on stETH + wrap(X) on wstETH.
 *
 * Lido's wstETH contract pulls stETH via transferFrom, so the treasury must
 * approve it first. Both legs operate on 18-decimal balances.
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { COMMON_TOKENS, WSTETH_ADDRESS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  amount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const WRAP_SIG = 'wrap(uint256)';

const STETH_ADDRESS = COMMON_TOKENS.find((t) => t.symbol === 'stETH')!.address;

export const wstethWrap: TransactionActionDef<Fields> = {
  id: 'lst-wsteth-wrap',
  category: 'staking',
  name: 'Wrap stETH → wstETH',
  description: "Convert the treasury's stETH to non-rebasing wstETH",
  isMultiAction: true,
  fields: [
    { name: 'amount', label: 'stETH Amount', type: 'amount', required: true },
  ],

  encode(values) {
    const amount = parseUnits(values.amount || '0', 18);
    const groupId = multiActionId('lst-wsteth-wrap', values);
    return [
      {
        target: STETH_ADDRESS as Address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          WSTETH_ADDRESS as Address,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: WSTETH_ADDRESS as Address,
        value: '0',
        signature: WRAP_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [amount]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const wrap = actions[cursor + 1];
    if (!approve || !wrap) return null;
    if (!matchTarget(approve, STETH_ADDRESS)) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    if (!matchTarget(wrap, WSTETH_ADDRESS)) return null;
    if (!matchSignature(wrap, WRAP_SIG)) return null;

    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], WSTETH_ADDRESS)) return null;
    const wrapArgs = decodeArgs<readonly [bigint]>(wrap.calldata, 'uint256');
    if (!wrapArgs) return null;
    if (wrapArgs[0] !== approveArgs[1]) return null;

    return {
      values: { amount: formatTokenAmount(wrapArgs[0], 18) },
      consumed: 2,
    };
  },

  describe(values) {
    return [
      {
        title: `Approve ${values.amount} stETH`,
        description: 'for wstETH wrapping',
        functionName: 'approve',
      },
      {
        title: `Wrap ${values.amount} stETH → wstETH`,
        functionName: 'wrap',
      },
    ];
  },
};
