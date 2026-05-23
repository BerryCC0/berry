/**
 * lst-lido-claim-withdrawal — single-action `claimWithdrawal(requestId)`.
 * Redeems a previously-queued withdrawal NFT for ETH.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { LIDO_WITHDRAWAL_QUEUE_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  requestId: string;
}

const SIG = 'claimWithdrawal(uint256)';
const TARGET = LIDO_WITHDRAWAL_QUEUE_ADDRESS as Address;

export const lidoClaimWithdrawal: TransactionActionDef<Fields> = {
  id: 'lst-lido-claim-withdrawal',
  category: 'staking',
  name: 'Claim Lido Withdrawal',
  description: 'Redeem a previously-queued Lido withdrawal NFT for ETH',
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
    const args = decodeArgs<readonly [bigint]>(action, 'uint256');
    if (!args) return null;
    return {
      values: { requestId: args[0].toString() },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Claim Lido withdrawal #${values.requestId}`,
        functionName: 'claimWithdrawal',
        params: { requestId: values.requestId },
      },
    ];
  },
};
