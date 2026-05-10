/**
 * Vote on / queue / execute / cancel a NounV2 proposal. Single shared write
 * surface so the GovernanceView can render one banner regardless of action.
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export type V2Support = 0 | 1 | 2;

export function useV2Vote() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } =
    useWaitForTransactionReceipt({ hash });

  const castVote = (proposalId: bigint, support: V2Support, reason?: string) => {
    if (reason && reason.trim().length > 0) {
      writeContract({
        address: V2_CONTRACTS.treasury.address,
        abi: V2_CONTRACTS.treasury.abi,
        functionName: 'castVoteWithReason',
        args: [proposalId, support, reason],
        chainId: V2_CHAIN_ID,
      });
    } else {
      writeContract({
        address: V2_CONTRACTS.treasury.address,
        abi: V2_CONTRACTS.treasury.abi,
        functionName: 'castVote',
        args: [proposalId, support],
        chainId: V2_CHAIN_ID,
      });
    }
  };

  const queue = (proposalId: bigint) => {
    writeContract({
      address: V2_CONTRACTS.treasury.address,
      abi: V2_CONTRACTS.treasury.abi,
      functionName: 'queue',
      args: [proposalId],
      chainId: V2_CHAIN_ID,
    });
  };

  const execute = (proposalId: bigint) => {
    writeContract({
      address: V2_CONTRACTS.treasury.address,
      abi: V2_CONTRACTS.treasury.abi,
      functionName: 'execute',
      args: [proposalId],
      chainId: V2_CHAIN_ID,
    });
  };

  const cancel = (proposalId: bigint) => {
    writeContract({
      address: V2_CONTRACTS.treasury.address,
      abi: V2_CONTRACTS.treasury.abi,
      functionName: 'cancel',
      args: [proposalId],
      chainId: V2_CHAIN_ID,
    });
  };

  return {
    castVote,
    queue,
    execute,
    cancel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}
