/**
 * Delegation Hook
 * Manage Nouns voting power delegation
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NOUNS_CONTRACTS } from '../contracts';

export function useDelegate(address?: `0x${string}`) {
  // Read current delegate
  const { data: currentDelegate, isLoading: isLoadingDelegate, refetch } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read current votes
  const { data: currentVotes, isLoading: isLoadingVotes } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'getCurrentVotes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Write contract for delegation
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Delegate voting power to another address
   */
  const delegate = (delegatee: `0x${string}`) => {
    writeContract({
      address: NOUNS_CONTRACTS.token.address,
      abi: NOUNS_CONTRACTS.token.abi,
      functionName: 'delegate',
      args: [delegatee],
    });
  };

  /**
   * Delegate to self (reclaim voting power)
   */
  const delegateToSelf = () => {
    if (!address) return;
    delegate(address);
  };

  return {
    // Read state
    currentDelegate: currentDelegate as `0x${string}` | undefined,
    currentVotes: currentVotes as bigint | undefined,
    isLoadingDelegate,
    isLoadingVotes,
    
    // Write actions
    delegate,
    delegateToSelf,
    refetch,
    
    // Transaction state
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    hash,
  };
}

