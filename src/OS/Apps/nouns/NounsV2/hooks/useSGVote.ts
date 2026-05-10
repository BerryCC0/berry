/**
 * Vote on / queue / execute / cancel a Small Grants proposal.
 * Same write surface as useV2Vote but pointed at SG_CONTRACTS.treasury.
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SG_CONTRACTS } from '../contracts';
import type { V2Support } from './useV2Vote';

export function useSGVote() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } =
    useWaitForTransactionReceipt({ hash });

  const castVote = (proposalId: bigint, support: V2Support, reason?: string) => {
    if (reason && reason.trim().length > 0) {
      writeContract({
        address: SG_CONTRACTS.treasury.address,
        abi: SG_CONTRACTS.treasury.abi,
        functionName: 'castVoteWithReason',
        args: [proposalId, support, reason],
        chainId: 1,
      });
    } else {
      writeContract({
        address: SG_CONTRACTS.treasury.address,
        abi: SG_CONTRACTS.treasury.abi,
        functionName: 'castVote',
        args: [proposalId, support],
        chainId: 1,
      });
    }
  };

  const queue = (proposalId: bigint) => {
    writeContract({
      address: SG_CONTRACTS.treasury.address,
      abi: SG_CONTRACTS.treasury.abi,
      functionName: 'queue',
      args: [proposalId],
      chainId: 1,
    });
  };

  const execute = (proposalId: bigint) => {
    writeContract({
      address: SG_CONTRACTS.treasury.address,
      abi: SG_CONTRACTS.treasury.abi,
      functionName: 'execute',
      args: [proposalId],
      chainId: 1,
    });
  };

  return {
    castVote,
    queue,
    execute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}
