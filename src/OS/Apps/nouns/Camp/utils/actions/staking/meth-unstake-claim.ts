/**
 * lst-meth-unstake-claim — single-action `claimUnstakeRequest(requestId)`.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { MANTLE_STAKING_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  requestId: string;
}

const SIG = 'claimUnstakeRequest(uint256)';
const TARGET = MANTLE_STAKING_ADDRESS as Address;

export const methUnstakeClaim: TransactionActionDef<Fields> = {
  id: 'lst-meth-unstake-claim',
  category: 'staking',
  name: 'Claim mETH Unstake',
  description: 'Redeem a previously-queued mETH unstake request for ETH',
  isMultiAction: false,
  fields: [{ name: 'requestId', label: 'Request ID', type: 'number', required: true }],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256'), [
          BigInt(values.requestId || '0'),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [bigint]>(action.calldata, 'uint256');
    if (!args) return null;
    return {
      values: { requestId: args[0].toString() },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Claim mETH unstake #${values.requestId}`,
        functionName: 'claimUnstakeRequest',
        params: { requestId: values.requestId },
      },
    ];
  },
};
