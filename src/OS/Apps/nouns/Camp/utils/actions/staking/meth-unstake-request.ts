/**
 * lst-meth-unstake-request — 2-action: approve(mETH, staking, amount) +
 * unstakeRequest(amount, minETH).
 *
 * Mantle's mETH unstaking is a two-phase process — request, then claim.
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import {
  MANTLE_STAKING_ADDRESS,
  METH_ADDRESS,
} from '../../actionTemplates/constants';
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
  minETHAmount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const REQUEST_SIG = 'unstakeRequest(uint128,uint128)';

export const methUnstakeRequest: TransactionActionDef<Fields> = {
  id: 'lst-meth-unstake-request',
  category: 'staking',
  name: 'Request mETH Unstake',
  description: 'Queue a Mantle mETH → ETH unstake (request phase of two-step)',
  isMultiAction: true,
  fields: [
    { name: 'amount', label: 'mETH Amount', type: 'amount', required: true },
    { name: 'minETHAmount', label: 'Min ETH Out', type: 'amount', required: true },
  ],

  encode(values) {
    const amount = parseUnits(values.amount || '0', 18);
    const minOut = parseUnits(values.minETHAmount || '0', 18);
    const groupId = multiActionId('lst-meth-unstake-request', values);
    return [
      {
        target: METH_ADDRESS as Address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          MANTLE_STAKING_ADDRESS as Address,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: MANTLE_STAKING_ADDRESS as Address,
        value: '0',
        signature: REQUEST_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint128, uint128'), [
          amount,
          minOut,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const request = actions[cursor + 1];
    if (!approve || !request) return null;
    if (!matchTarget(approve, METH_ADDRESS)) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    if (!matchTarget(request, MANTLE_STAKING_ADDRESS)) return null;
    if (!matchSignature(request, REQUEST_SIG)) return null;

    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], MANTLE_STAKING_ADDRESS)) return null;

    const requestArgs = decodeArgs<readonly [bigint, bigint]>(
      request.calldata,
      'uint128, uint128',
    );
    if (!requestArgs) return null;
    if (requestArgs[0] !== approveArgs[1]) return null;

    return {
      values: {
        amount: formatTokenAmount(requestArgs[0], 18),
        minETHAmount: formatTokenAmount(requestArgs[1], 18),
      },
      consumed: 2,
    };
  },

  describe(values) {
    return [
      {
        title: `Approve ${values.amount} mETH`,
        description: 'for Mantle staking',
        functionName: 'approve',
      },
      {
        title: `Request unstake ${values.amount} mETH`,
        description: `min ${values.minETHAmount} ETH out`,
        functionName: 'unstakeRequest',
      },
    ];
  },
};
