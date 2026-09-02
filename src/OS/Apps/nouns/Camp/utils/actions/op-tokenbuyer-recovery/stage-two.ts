import { encodeFunctionData, formatEther, parseEther } from 'viem';
import { addressEquals, multiActionId } from '../shared';
import type { ActionDescription, TransactionActionDef } from '../types';
import {
  ACCEPT_L1_OWNERSHIP_ABI,
  L2_STANDARD_BRIDGE_ABI,
  L2_TO_L1_GAS_LIMIT,
  OP_RECOVERY_ADDRESSES,
  decodeCrossDomainPayload,
  decodeProxyExecute,
  encodeProxyExecute,
  hexEquals,
  makeCrossDomainAction,
} from './shared';

interface Fields {
  proxyBalanceEth: string;
}
const ACTION_ID = 'admin-op-tokenbuyer-recovery-stage-2';

const ACCEPT_OWNERSHIP_PAYLOAD = encodeFunctionData({
  abi: ACCEPT_L1_OWNERSHIP_ABI,
  functionName: 'acceptL1Ownership',
});

const BRIDGE_ETH_PAYLOAD = encodeFunctionData({
  abi: L2_STANDARD_BRIDGE_ABI,
  functionName: 'bridgeETHTo',
  args: [
    OP_RECOVERY_ADDRESSES.timelockV2,
    L2_TO_L1_GAS_LIMIT,
    '0x',
  ],
});

export const opTokenBuyerRecoveryStageTwo: TransactionActionDef<Fields> = {
  id: ACTION_ID,
  category: 'tokenbuyer-admin',
  name: 'OP TokenBuyer Recovery — Stage 2',
  description:
    'Standard proposal only, after Stage 1 relays: accept OP proxy control and bridge its exact ETH balance to Timelock v2',
  isMultiAction: true,
  requiredProposalType: 'standard',
  fields: [
    {
      name: 'proxyBalanceEth',
      label: 'Verified OP Proxy Balance (ETH)',
      type: 'amount',
      placeholder: '1.090910787345462498',
      required: true,
      validation: { min: 0.000000000000000001, decimals: 18 },
      helpText:
        'Enter the exact Optimism proxy balance only after Stage 1 has relayed. This amount becomes the bridge call value.',
    },
  ],

  encode(values) {
    const proxyBalance = parseEther(values.proxyBalanceEth || '0');
    if (proxyBalance <= BigInt(0)) {
      throw new Error('The verified Optimism proxy balance must be greater than zero');
    }
    const bridgePayload = encodeProxyBridge(proxyBalance);
    const groupId = multiActionId(ACTION_ID, values);
    return [
      makeCrossDomainAction(ACCEPT_OWNERSHIP_PAYLOAD, groupId, 0),
      makeCrossDomainAction(bridgePayload, groupId, 1),
    ];
  },

  decode(actions, cursor) {
    const accept = actions[cursor];
    const bridge = actions[cursor + 1];
    if (!accept || !bridge) return null;

    const acceptPayload = decodeCrossDomainPayload(accept);
    const bridgePayload = decodeCrossDomainPayload(bridge);
    if (!acceptPayload || !bridgePayload) return null;
    if (!hexEquals(acceptPayload, ACCEPT_OWNERSHIP_PAYLOAD)) return null;

    const execute = decodeProxyExecute(bridgePayload);
    if (!execute) return null;
    if (!addressEquals(execute.target, OP_RECOVERY_ADDRESSES.opStandardBridge)) return null;
    if (execute.msgValue <= BigInt(0)) return null;
    if (!hexEquals(execute.data, BRIDGE_ETH_PAYLOAD)) return null;

    return {
      values: { proxyBalanceEth: formatEther(execute.msgValue) },
      consumed: 2,
    };
  },

  describe(values) {
    const descriptions: ActionDescription[] = [
      {
        title: 'Accept Optimism proxy control as Timelock v2',
        description: 'Cross-chain message 1 of 2 · completes the ownership handoff',
        functionName: 'acceptL1Ownership',
        params: { owner: OP_RECOVERY_ADDRESSES.timelockV2 },
      },
      {
        title: `Bridge ${values.proxyBalanceEth} ETH to Timelock v2`,
        description: 'Cross-chain message 2 of 2 · begins the OP withdrawal to Ethereum',
        functionName: 'bridgeETHTo',
        params: {
          amount: `${values.proxyBalanceEth} ETH`,
          recipient: OP_RECOVERY_ADDRESSES.timelockV2,
        },
      },
    ];
    return descriptions;
  },
};

function encodeProxyBridge(proxyBalance: bigint) {
  return encodeProxyExecute(
    OP_RECOVERY_ADDRESSES.opStandardBridge,
    proxyBalance,
    BRIDGE_ETH_PAYLOAD,
  );
}
