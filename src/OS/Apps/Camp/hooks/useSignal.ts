/**
 * useSignal Hook
 * Send feedback/signals on proposals and candidates via the Data contract
 * 
 * This allows users to express support/opposition at any time,
 * regardless of whether the voting period is open.
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAODataABI, NounsTokenABI } from '@/app/lib/nouns/contracts';

export type SupportType = 0 | 1 | 2; // 0: Against, 1: For, 2: Abstain

interface UseSignalReturn {
  // Proposal signals
  sendProposalSignal: (proposalId: bigint, support: SupportType, reason: string) => Promise<void>;
  
  // Candidate signals
  sendCandidateSignal: (proposer: string, slug: string, support: SupportType, reason: string) => Promise<void>;
  
  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
  
  // User's voting power (needed to check if they can signal)
  votingPower: bigint | undefined;
  hasVotingPower: boolean;
  
  // Reset state
  reset: () => void;
}

export function useSignal(userAddress?: `0x${string}`): UseSignalReturn {
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  
  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });
  
  // Check user's voting power
  const { data: votingPower } = useReadContract({
    address: NOUNS_ADDRESSES.token as `0x${string}`,
    abi: NounsTokenABI,
    functionName: 'getCurrentVotes',
    args: userAddress ? [userAddress] : undefined,
  });
  
  const hasVotingPower = votingPower !== undefined && votingPower > BigInt(0);
  
  /**
   * Send feedback/signal on a proposal
   * Can be called at any time, not just during voting period
   */
  const sendProposalSignal = async (
    proposalId: bigint,
    support: SupportType,
    reason: string
  ) => {
    if (!hasVotingPower) {
      throw new Error('You must have voting power to send signals');
    }
    
    try {
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'sendFeedback',
        args: [proposalId, support, reason],
      });
    } catch (err) {
      console.error('Failed to send proposal signal:', err);
      throw err;
    }
  };
  
  /**
   * Send feedback/signal on a candidate
   * Can be called at any time
   */
  const sendCandidateSignal = async (
    proposer: string,
    slug: string,
    support: SupportType,
    reason: string
  ) => {
    if (!hasVotingPower) {
      throw new Error('You must have voting power to send signals');
    }
    
    try {
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'sendCandidateFeedback',
        args: [proposer as `0x${string}`, slug, support, reason],
      });
    } catch (err) {
      console.error('Failed to send candidate signal:', err);
      throw err;
    }
  };
  
  return {
    sendProposalSignal,
    sendCandidateSignal,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError,
    votingPower,
    hasVotingPower,
    reset: resetWrite,
  };
}
