/**
 * lst-lido-request-withdrawal — 2-action:
 *   1. approve(wstETH, withdrawalQueue, amount)
 *   2. requestWithdrawalsWstETH([amount], treasury)
 *
 * The Lido WithdrawalQueueERC721 takes wstETH amounts as a `uint256[]` so it
 * can batch multiple requests; we only emit one request per action def here.
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  LIDO_WITHDRAWAL_QUEUE_ADDRESS,
  WSTETH_ADDRESS,
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
}

const APPROVE_SIG = 'approve(address,uint256)';
const REQUEST_SIG = 'requestWithdrawalsWstETH(uint256[],address)';
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const lidoRequestWithdrawal: TransactionActionDef<Fields> = {
  id: 'lst-lido-request-withdrawal',
  category: 'staking',
  name: 'Request Lido Withdrawal',
  description: 'Queue a wstETH → ETH withdrawal via the Lido WithdrawalQueue NFT',
  isMultiAction: true,
  fields: [{ name: 'amount', label: 'wstETH Amount', type: 'amount', required: true }],

  encode(values) {
    const amount = parseUnits(values.amount || '0', 18);
    const groupId = multiActionId('lst-lido-request-withdrawal', values);
    return [
      {
        target: WSTETH_ADDRESS as Address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          LIDO_WITHDRAWAL_QUEUE_ADDRESS as Address,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: LIDO_WITHDRAWAL_QUEUE_ADDRESS as Address,
        value: '0',
        signature: REQUEST_SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256[], address'),
          [[amount], TREASURY],
        ),
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
    if (!matchTarget(approve, WSTETH_ADDRESS)) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    if (!matchTarget(request, LIDO_WITHDRAWAL_QUEUE_ADDRESS)) return null;
    if (!matchSignature(request, REQUEST_SIG)) return null;

    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    if (!addressEquals(approveArgs[0], LIDO_WITHDRAWAL_QUEUE_ADDRESS)) return null;

    const requestArgs = decodeArgs<readonly [readonly bigint[], Address]>(
      request.calldata,
      'uint256[], address',
    );
    if (!requestArgs) return null;
    if (requestArgs[0].length !== 1) return null;
    if (requestArgs[0][0] !== approveArgs[1]) return null;
    if (!addressEquals(requestArgs[1], TREASURY)) return null;

    return {
      values: { amount: formatTokenAmount(requestArgs[0][0], 18) },
      consumed: 2,
    };
  },

  describe(values) {
    return [
      {
        title: `Approve ${values.amount} wstETH`,
        description: 'for the Lido WithdrawalQueue',
        functionName: 'approve',
      },
      {
        title: `Request Lido withdrawal of ${values.amount} wstETH`,
        functionName: 'requestWithdrawalsWstETH',
      },
    ];
  },
};
