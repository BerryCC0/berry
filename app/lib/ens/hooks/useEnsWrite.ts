/**
 * Base hook for dispatching ENS write transactions.
 *
 * ensjs's wallet functions expose `*.makeFunctionData(...)` which returns
 * `{ to, data, value? }` — pure encoding, no wallet needed. We pair that
 * with wagmi's useSendTransaction to actually submit, getting wallet
 * connection handling, gas estimation, and tx tracking for free.
 *
 * Each per-action hook (useSetTextRecord, useSetPrimaryName, etc.) builds
 * the encoded request and calls `execute()` from this hook.
 */

import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import type { Address, Hex } from 'viem';

export interface EnsTxRequest {
  to: Address;
  data: Hex;
  value?: bigint;
}

export function useEnsWrite() {
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    execute: (tx: EnsTxRequest) =>
      sendTransactionAsync({ to: tx.to, data: tx.data, value: tx.value ?? BigInt(0) }),
    hash,
    error,
    isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    receipt: receipt.data,
    reset,
  };
}
