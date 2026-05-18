'use client';

/**
 * usePredictStreamAddress
 *
 * Calls StreamFactory.predictStreamAddress(...) to compute the deterministic
 * CREATE2 address a new Sablier-style stream will receive when the proposal
 * executes. Both `msgSender` and `payer` are pinned to the treasury — the
 * treasury executes the proposal that calls createStream.
 *
 * Returns `{ address, isLoading, error }`. While any required input is
 * missing or zero, the hook is disabled and returns `address: undefined`
 * so callers can render a placeholder until enough fields are filled.
 */

import { useReadContract } from 'wagmi';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { StreamFactoryABI } from '@/app/lib/nouns/abis';

const TREASURY = NOUNS_ADDRESSES.treasury as `0x${string}`;
const STREAM_FACTORY = NOUNS_ADDRESSES.streamFactory as `0x${string}`;

export interface UsePredictStreamAddressInput {
  recipient?: `0x${string}` | string;
  tokenAddress?: `0x${string}` | string;
  tokenAmount?: bigint;
  startTime?: bigint;
  stopTime?: bigint;
}

export interface UsePredictStreamAddressResult {
  address: `0x${string}` | undefined;
  isLoading: boolean;
  error: Error | null;
}

function isHexAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string'
    && value.length === 42
    && value.startsWith('0x');
}

export function usePredictStreamAddress(
  input: UsePredictStreamAddressInput,
): UsePredictStreamAddressResult {
  const recipient = input.recipient;
  const tokenAddress = input.tokenAddress;
  const ready =
    isHexAddress(recipient) &&
    isHexAddress(tokenAddress) &&
    input.tokenAmount !== undefined &&
    input.tokenAmount > BigInt(0) &&
    input.startTime !== undefined &&
    input.startTime > BigInt(0) &&
    input.stopTime !== undefined &&
    input.stopTime > BigInt(0) &&
    input.stopTime > input.startTime;

  const { data, isLoading, error } = useReadContract({
    address: STREAM_FACTORY,
    abi: StreamFactoryABI,
    functionName: 'predictStreamAddress',
    // 8-arg overload (with nonce) — matches the createStream variant the
    // generator uses with nonce = 0.
    args: ready
      ? [
          TREASURY,
          TREASURY,
          recipient as `0x${string}`,
          input.tokenAmount as bigint,
          tokenAddress as `0x${string}`,
          input.startTime as bigint,
          input.stopTime as bigint,
          0,
        ]
      : undefined,
    query: { enabled: ready },
  });

  return {
    address: data as `0x${string}` | undefined,
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
