import {
  type Address,
  type Hex,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbi,
  parseAbiParameters,
} from 'viem';
import { addressEquals, decodeArgs, matchSignature, matchTarget } from '../shared';
import type { ProposalAction } from '../types';

export const OP_RECOVERY_ADDRESSES = {
  l1Messenger: '0x25ace71c97B33Cc4729CF772ae268934f7ab5fA1',
  opProxy: '0x4d6EC0e31c9177c696Fb49c2Ad04aB766e91F38f',
  opTokenBuyer: '0xdD9e5Dab49d8394660d4Fe2383692448e3944d2b',
  opStandardBridge: '0x4200000000000000000000000000000000000010',
  timelockV2: '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71',
} as const satisfies Record<string, Address>;

export const SEND_MESSAGE_SIGNATURE = 'sendMessage(address,bytes,uint32)';
export const L1_TO_L2_GAS_LIMIT = 1_000_000;
export const L2_TO_L1_GAS_LIMIT = 200_000;

const EXECUTE_FUNCTION_ABI = parseAbi([
  'function executeFunction(address target, uint256 msgValue, bytes data)',
]);

export const TRANSFER_L1_OWNERSHIP_ABI = parseAbi([
  'function transferL1Ownership(address newL1Owner)',
]);

export const ACCEPT_L1_OWNERSHIP_ABI = parseAbi([
  'function acceptL1Ownership()',
]);

export const TOKEN_BUYER_RECOVERY_ABI = parseAbi([
  'function pause()',
  'function withdrawETH()',
]);

export const L2_STANDARD_BRIDGE_ABI = parseAbi([
  'function bridgeETHTo(address to, uint32 minGasLimit, bytes extraData) payable',
]);

export function encodeProxyExecute(
  target: Address,
  msgValue: bigint,
  data: Hex,
): Hex {
  return encodeFunctionData({
    abi: EXECUTE_FUNCTION_ABI,
    functionName: 'executeFunction',
    args: [target, msgValue, data],
  });
}

export function decodeProxyExecute(payload: Hex): {
  target: Address;
  msgValue: bigint;
  data: Hex;
} | null {
  try {
    const decoded = decodeFunctionData({
      abi: EXECUTE_FUNCTION_ABI,
      data: payload,
    });
    const [target, msgValue, data] = decoded.args;
    return { target, msgValue, data };
  } catch {
    return null;
  }
}

export function makeCrossDomainAction(
  proxyPayload: Hex,
  groupId: string,
  index: number,
): ProposalAction {
  return {
    target: OP_RECOVERY_ADDRESSES.l1Messenger,
    value: '0',
    signature: SEND_MESSAGE_SIGNATURE,
    calldata: encodeAbiParameters(
      parseAbiParameters('address, bytes, uint32'),
      [
        OP_RECOVERY_ADDRESSES.opProxy,
        proxyPayload,
        L1_TO_L2_GAS_LIMIT,
      ],
    ),
    isPartOfMultiAction: true,
    multiActionGroupId: groupId,
    multiActionIndex: index,
  };
}

export function decodeCrossDomainPayload(action: ProposalAction): Hex | null {
  if (!matchTarget(action, OP_RECOVERY_ADDRESSES.l1Messenger)) return null;
  if (!matchSignature(action, SEND_MESSAGE_SIGNATURE)) return null;
  if (action.value !== '0') return null;

  const args = decodeArgs<readonly [Address, Hex, number]>(
    action,
    'address, bytes, uint32',
  );
  if (!args) return null;
  if (!addressEquals(args[0], OP_RECOVERY_ADDRESSES.opProxy)) return null;
  if (args[2] !== L1_TO_L2_GAS_LIMIT) return null;
  return args[1];
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
