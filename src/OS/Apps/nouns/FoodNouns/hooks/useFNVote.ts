/**
 * Cast a vote on a Food Nouns proposal.
 * V1 governor — no refundable voting, gas is on the voter.
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

export type FNVoteSupport = 0 | 1 | 2; // 0 = against, 1 = for, 2 = abstain

export function useFNVote() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const castVote = (proposalId: bigint, support: FNVoteSupport, reason: string = '') => {
    if (reason.trim()) {
      writeContract({
        address: FN_CONTRACTS.governor.address,
        abi: FN_CONTRACTS.governor.abi,
        functionName: 'castVoteWithReason',
        args: [proposalId, support, reason],
        chainId: FN_CHAIN_ID,
      });
    } else {
      writeContract({
        address: FN_CONTRACTS.governor.address,
        abi: FN_CONTRACTS.governor.abi,
        functionName: 'castVote',
        args: [proposalId, support],
        chainId: FN_CHAIN_ID,
      });
    }
  };

  return {
    castVote,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}
