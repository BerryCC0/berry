/**
 * useNounApproval Hook
 * Check and manage approval for Noun token transfers
 * Required before creating a proposal that transfers a user's Noun
 */

'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NOUNS_ADDRESSES, NounsTokenABI } from '@/app/lib/nouns';
import { TREASURY_ADDRESS } from '../actionTemplates';

const NOUNS_TOKEN_ADDRESS = NOUNS_ADDRESSES.token as `0x${string}`;

/**
 * Hook to check and manage Noun approval for treasury transfers
 * @param nounId - The ID of the Noun to check/approve
 */
export function useNounApproval(nounId: string | undefined) {
  const { address } = useAccount();
  const nounIdBigInt = nounId ? BigInt(nounId) : undefined;

  // Check if specific Noun is approved for Treasury
  const { data: approvedAddress, refetch: refetchApproved } = useReadContract({
    address: NOUNS_TOKEN_ADDRESS,
    abi: NounsTokenABI,
    functionName: 'getApproved',
    args: nounIdBigInt !== undefined ? [nounIdBigInt] : undefined,
  });

  // Check if Treasury is approved for ALL user's Nouns
  const { data: isApprovedForAll, refetch: refetchApprovedForAll } = useReadContract({
    address: NOUNS_TOKEN_ADDRESS,
    abi: NounsTokenABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, TREASURY_ADDRESS] : undefined,
  });

  // Check if the specific Noun is approved
  const isApproved = approvedAddress?.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

  // Write contract for approval
  const { 
    writeContract, 
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Approve single Noun
  const approveNoun = () => {
    if (!nounIdBigInt) return;
    
    writeContract({
      address: NOUNS_TOKEN_ADDRESS,
      abi: NounsTokenABI,
      functionName: 'approve',
      args: [TREASURY_ADDRESS, nounIdBigInt],
    });
  };

  // Approve all Nouns (setApprovalForAll)
  const approveAllNouns = () => {
    writeContract({
      address: NOUNS_TOKEN_ADDRESS,
      abi: NounsTokenABI,
      functionName: 'setApprovalForAll',
      args: [TREASURY_ADDRESS, true],
    });
  };

  // Refetch approval status after transaction confirms
  const refetch = () => {
    refetchApproved();
    refetchApprovedForAll();
  };

  return {
    // Status
    isApproved,
    isApprovedForAll: isApprovedForAll || false,
    needsApproval: nounId ? !isApproved && !isApprovedForAll : false,
    isLoading: isPending || isConfirming,
    
    // Actions
    approveNoun,
    approveAllNouns,
    refetch,
    reset,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
