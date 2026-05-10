/**
 * Self-delegate (or delegate to a chosen address) on the NounV2 token.
 * Required to vote your own balance — Compound checkpoint pattern.
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export function useV2Delegate() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } =
    useWaitForTransactionReceipt({ hash });

  const delegate = (delegatee: `0x${string}`) => {
    writeContract({
      address: V2_CONTRACTS.token.address,
      abi: V2_CONTRACTS.token.abi,
      functionName: 'delegate',
      args: [delegatee],
      chainId: V2_CHAIN_ID,
    });
  };

  return {
    delegate,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}
