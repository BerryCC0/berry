/**
 * Voting Hook
 * Cast votes on Nouns DAO proposals
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NOUNS_CONTRACTS } from '../contracts';
import { BERRY_CLIENT_ID } from '../constants';

export type VoteSupport = 0 | 1 | 2; // 0 = against, 1 = for, 2 = abstain

export function useVote() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Cast a simple vote (no gas refund)
   */
  const vote = (proposalId: bigint, support: VoteSupport) => {
    writeContract({
      address: NOUNS_CONTRACTS.governor.address,
      abi: NOUNS_CONTRACTS.governor.abi,
      functionName: 'castVote',
      args: [proposalId, support],
    });
  };

  /**
   * Cast a vote with reason (no gas refund)
   */
  const voteWithReason = (proposalId: bigint, support: VoteSupport, reason: string) => {
    writeContract({
      address: NOUNS_CONTRACTS.governor.address,
      abi: NOUNS_CONTRACTS.governor.abi,
      functionName: 'castVoteWithReason',
      args: [proposalId, support, reason],
    });
  };

  /**
   * Cast a refundable vote with reason (gas refunded from treasury)
   * RECOMMENDED: Includes client ID for rewards
   */
  const voteRefundable = (proposalId: bigint, support: VoteSupport, reason: string = '') => {
    writeContract({
      address: NOUNS_CONTRACTS.governor.address,
      abi: NOUNS_CONTRACTS.governor.abi,
      functionName: 'castRefundableVoteWithReason',
      args: [proposalId, support, reason, BERRY_CLIENT_ID],
    });
  };

  return {
    vote,
    voteWithReason,
    voteRefundable,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    hash,
  };
}

