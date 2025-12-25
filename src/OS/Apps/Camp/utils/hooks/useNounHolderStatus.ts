/**
 * useNounHolderStatus Hook
 * Check if user owns Nouns or has delegated voting power
 */

'use client';

import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { NOUNS_ADDRESSES, NounsTokenABI, NounsDAODataABI } from '@/app/lib/nouns';

export function useNounHolderStatus() {
  const { address } = useAccount();
  
  // Get current block number
  const { data: currentBlock } = useBlockNumber();
  
  // Get PRIOR_VOTES_BLOCKS_AGO from Data Proxy
  const { data: priorBlocksAgo } = useReadContract({
    address: NOUNS_ADDRESSES.data as `0x${string}`,
    abi: NounsDAODataABI,
    functionName: 'createCandidateCost', // Fallback - just check if we can read from contract
  });
  
  // Check current votes
  const { data: currentVotes } = useReadContract({
    address: NOUNS_ADDRESSES.token as `0x${string}`,
    abi: NounsTokenABI,
    functionName: 'getCurrentVotes',
    args: address ? [address] : undefined,
  });
  
  // Check current balance
  const { data: nounBalance } = useReadContract({
    address: NOUNS_ADDRESSES.token as `0x${string}`,
    abi: NounsTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  
  // User has voting power if they have votes
  const hasVotingPower = currentVotes ? currentVotes > BigInt(0) : false;
  const ownsNouns = nounBalance ? nounBalance > BigInt(0) : false;
  
  return {
    hasVotingPower,
    ownsNouns,
    nounBalance: nounBalance || BigInt(0),
    votes: currentVotes || BigInt(0),
    priorBlocksAgo: undefined, // Not available in this simplified version
  };
}

