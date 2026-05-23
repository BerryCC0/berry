/**
 * Shared helpers used by multiple stream action defs.
 */

import {
  type Address,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import type { ProposalAction } from '../types';

export const CANCEL_SIG = 'cancel()';
export const RECOVER_SIG = 'recoverTokens(address)';
export const CREATE_STREAM_SIG =
  'createStream(address,uint256,address,uint256,uint256,uint8,address)';
export const TRANSFER_SIG = 'transfer(address,uint256)';

/**
 * Encode `recoverTokens(address)` calldata.
 */
export function encodeRecoverTokens(destination: Address): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address'), [destination]);
}

/**
 * Encode `createStream(...)` calldata. The contract takes `nonce` as uint8;
 * legacy code passed it through the uint256 encoder, which produces the same
 * bytes for values 0-255.
 */
export function encodeCreateStream(args: {
  recipient: Address;
  tokenAmount: bigint;
  tokenAddress: Address;
  startTime: bigint;
  stopTime: bigint;
  nonce: number;
  predictedStreamAddress: Address;
}): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('address, uint256, address, uint256, uint256, uint8, address'),
    [
      args.recipient,
      args.tokenAmount,
      args.tokenAddress,
      args.startTime,
      args.stopTime,
      args.nonce,
      args.predictedStreamAddress,
    ],
  );
}

/**
 * Encode a plain ERC-20 `transfer(to, amount)`.
 */
export function encodeErc20Transfer(
  to: Address,
  amount: bigint,
): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters('address, uint256'), [
    to,
    amount,
  ]);
}

/**
 * Convert a `<input type="datetime-local">` value back to a unix-seconds
 * bigint. The input is in local time; `new Date(...)` parses it as local
 * and `.getTime()` returns UTC milliseconds, so this is timezone-safe.
 */
export function dateInputToUnix(raw: string | undefined): bigint {
  if (!raw) return BigInt(0);
  return BigInt(Math.floor(new Date(raw).getTime() / 1000));
}

/**
 * Convert a unix-seconds bigint back to the `<input type="datetime-local">`
 * format (YYYY-MM-DDTHH:mm) in the user's local timezone.
 */
export function unixToDateInput(unix: bigint): string {
  const d = new Date(Number(unix) * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Cheap structural type check for a 2-tuple of stream actions. */
export interface StreamCancelRecoverShape {
  streamAddress: string;
  destination: Address;
}

/**
 * Recognise a `cancel() + recoverTokens(destination)` pair starting at the
 * given cursor. Returns the shared stream address and the recovery
 * destination, or null if the pair doesn't match.
 */
export function matchCancelAndRecover(
  actions: readonly ProposalAction[],
  cursor: number,
  decodeArgs: <T extends readonly unknown[]>(
    source: string | import('../types').ProposalAction | undefined,
    sig: string,
  ) => T | null,
): StreamCancelRecoverShape | null {
  const cancel = actions[cursor];
  const recover = actions[cursor + 1];
  if (!cancel || !recover) return null;
  if (cancel.signature !== CANCEL_SIG) return null;
  if (recover.signature !== RECOVER_SIG) return null;
  if (cancel.target.toLowerCase() !== recover.target.toLowerCase()) return null;
  const args = decodeArgs<readonly [Address]>(recover, 'address');
  if (!args) return null;
  return {
    streamAddress: cancel.target,
    destination: args[0],
  };
}
