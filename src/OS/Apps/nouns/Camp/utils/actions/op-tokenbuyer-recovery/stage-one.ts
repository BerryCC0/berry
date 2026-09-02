import { encodeFunctionData } from 'viem';
import { multiActionId } from '../shared';
import type { ActionDescription, TransactionActionDef } from '../types';
import {
  OP_RECOVERY_ADDRESSES,
  TOKEN_BUYER_RECOVERY_ABI,
  TRANSFER_L1_OWNERSHIP_ABI,
  decodeCrossDomainPayload,
  encodeProxyExecute,
  hexEquals,
  makeCrossDomainAction,
} from './shared';

type Fields = Record<string, never>;
const ACTION_ID = 'admin-op-tokenbuyer-recovery-stage-1';

const PAUSE_PAYLOAD = encodeProxyExecute(
  OP_RECOVERY_ADDRESSES.opTokenBuyer,
  BigInt(0),
  encodeFunctionData({
    abi: TOKEN_BUYER_RECOVERY_ABI,
    functionName: 'pause',
  }),
);

const WITHDRAW_PAYLOAD = encodeProxyExecute(
  OP_RECOVERY_ADDRESSES.opTokenBuyer,
  BigInt(0),
  encodeFunctionData({
    abi: TOKEN_BUYER_RECOVERY_ABI,
    functionName: 'withdrawETH',
  }),
);

const START_TRANSFER_PAYLOAD = encodeFunctionData({
  abi: TRANSFER_L1_OWNERSHIP_ABI,
  functionName: 'transferL1Ownership',
  args: [OP_RECOVERY_ADDRESSES.timelockV2],
});

export const opTokenBuyerRecoveryStageOne: TransactionActionDef<Fields> = {
  id: ACTION_ID,
  category: 'tokenbuyer-admin',
  name: 'OP TokenBuyer Recovery — Stage 1',
  description:
    'Timelock v1 only: pause the OP TokenBuyer, recover its ETH to the OP proxy, and begin transferring proxy control to Timelock v2',
  isMultiAction: true,
  requiredProposalType: 'timelock_v1',
  fields: [],

  encode(values) {
    const groupId = multiActionId(ACTION_ID, values);
    return [
      makeCrossDomainAction(PAUSE_PAYLOAD, groupId, 0),
      makeCrossDomainAction(WITHDRAW_PAYLOAD, groupId, 1),
      makeCrossDomainAction(START_TRANSFER_PAYLOAD, groupId, 2),
    ];
  },

  decode(actions, cursor) {
    const pause = actions[cursor];
    const withdraw = actions[cursor + 1];
    const startTransfer = actions[cursor + 2];
    if (!pause || !withdraw || !startTransfer) return null;

    const pausePayload = decodeCrossDomainPayload(pause);
    const withdrawPayload = decodeCrossDomainPayload(withdraw);
    const startTransferPayload = decodeCrossDomainPayload(startTransfer);
    if (!pausePayload || !withdrawPayload || !startTransferPayload) return null;
    if (!hexEquals(pausePayload, PAUSE_PAYLOAD)) return null;
    if (!hexEquals(withdrawPayload, WITHDRAW_PAYLOAD)) return null;
    if (!hexEquals(startTransferPayload, START_TRANSFER_PAYLOAD)) return null;

    return { values: {}, consumed: 3 };
  },

  describe() {
    const descriptions: ActionDescription[] = [
      {
        title: 'Pause the Optimism TokenBuyer',
        description: 'Cross-chain message 1 of 3 · stops new protection purchases',
        functionName: 'pause',
        params: { chain: 'Optimism', contract: OP_RECOVERY_ADDRESSES.opTokenBuyer },
      },
      {
        title: 'Recover TokenBuyer ETH to the Optimism proxy',
        description: 'Cross-chain message 2 of 3 · withdraws the full TokenBuyer balance',
        functionName: 'withdrawETH',
        params: { chain: 'Optimism', contract: OP_RECOVERY_ADDRESSES.opTokenBuyer },
      },
      {
        title: 'Begin transferring Optimism proxy control to Timelock v2',
        description: 'Cross-chain message 3 of 3 · Timelock v1 remains owner until Stage 2',
        functionName: 'transferL1Ownership',
        params: { newOwner: OP_RECOVERY_ADDRESSES.timelockV2 },
      },
    ];
    return descriptions;
  },
};
