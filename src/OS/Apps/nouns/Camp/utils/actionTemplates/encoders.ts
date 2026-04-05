/**
 * Calldata encoding helpers for proposal actions
 */

import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * Encode a simple address + amount for ETH send
 */
export function encodeSendETH(recipient: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${amountHex}`;
}

/**
 * Encode recipient + token + amount for ERC20 operations
 */
export function encodeSendERC20(recipient: Address, token: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenPadded = token.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${tokenPadded}${amountHex}`;
}

/**
 * Encode transferFrom(from, to, amount/id)
 */
export function encodeTransferFrom(from: Address, to: Address, tokenIdOrAmount: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const valuePadded = tokenIdOrAmount.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${valuePadded}`;
}

/**
 * Encode safeTransferFrom(from, to, tokenId)
 */
export function encodeSafeTransferFrom(from: Address, to: Address, tokenId: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const tokenIdPadded = tokenId.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${tokenIdPadded}`;
}

/**
 * Encode delegate(delegatee)
 */
export function encodeDelegate(delegatee: Address): `0x${string}` {
  const delegateePadded = delegatee.slice(2).padStart(64, '0');
  return `0x${delegateePadded}`;
}

/**
 * Encode transfer(to, amount)
 */
export function encodeTransfer(to: Address, amount: bigint): `0x${string}` {
  const toPadded = to.slice(2).padStart(64, '0');
  const amountPadded = amount.toString(16).padStart(64, '0');
  return `0x${toPadded}${amountPadded}`;
}

/**
 * Encode a single uint256 value
 */
export function encodeAdminUint256(value: bigint): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single uint32 value
 */
export function encodeAdminUint32(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single uint16 value
 */
export function encodeAdminUint16(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

/**
 * Encode a single address value
 */
export function encodeAdminAddress(address: Address): `0x${string}` {
  const addressPadded = address.slice(2).padStart(64, '0');
  return `0x${addressPadded}`;
}

/**
 * Encode dynamic quorum params: (minBps, maxBps, coefficient)
 */
export function encodeDynamicQuorumParams(minBps: number, maxBps: number, coefficient: number): `0x${string}` {
  const minBpsPadded = minBps.toString(16).padStart(64, '0');
  const maxBpsPadded = maxBps.toString(16).padStart(64, '0');
  const coefficientPadded = coefficient.toString(16).padStart(64, '0');
  return `0x${minBpsPadded}${maxBpsPadded}${coefficientPadded}`;
}

/**
 * Encode burnVetoPower (empty calldata)
 */
export function encodeBurnVetoPower(): `0x${string}` {
  return '0x';
}

/**
 * Encode createStreamWithPredictedAddress parameters
 */
export function encodeCreateStreamWithPredictedAddress(
  recipient: Address,
  tokenAmount: bigint,
  tokenAddress: Address,
  startTime: bigint,
  stopTime: bigint,
  nonce: number,
  predictedStreamAddress: Address
): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenAmountHex = tokenAmount.toString(16).padStart(64, '0');
  const tokenAddressPadded = tokenAddress.slice(2).padStart(64, '0');
  const startTimeHex = startTime.toString(16).padStart(64, '0');
  const stopTimeHex = stopTime.toString(16).padStart(64, '0');
  const noncePadded = nonce.toString(16).padStart(64, '0');
  const predictedAddressPadded = predictedStreamAddress.slice(2).padStart(64, '0');

  return `0x${recipientPadded}${tokenAmountHex}${tokenAddressPadded}${startTimeHex}${stopTimeHex}${noncePadded}${predictedAddressPadded}`;
}

/**
 * Encode the calldata for a meta-proposal (propose() that creates another proposal)
 * Uses viem's encodeAbiParameters for complex nested array encoding
 */
export function encodeMetaProposeCalldata(
  targets: Address[],
  values: bigint[],
  signatures: string[],
  calldatas: `0x${string}`[],
  description: string,
  clientId: number
): `0x${string}` {
  // Use viem to properly encode the complex nested structure
  const encoded = encodeAbiParameters(
    parseAbiParameters('address[], uint256[], string[], bytes[], string, uint32'),
    [targets, values, signatures, calldatas, description, clientId]
  );
  return encoded;
}
