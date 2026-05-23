/**
 * Place a bid on the current Food Nouns auction, or settle when expired.
 */

'use client';

import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

export function useFNBid() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const placeBid = (nounId: bigint, ethAmount: string) => {
    writeContract({
      address: FN_CONTRACTS.auctionHouse.address,
      abi: FN_CONTRACTS.auctionHouse.abi,
      functionName: 'createBid',
      args: [nounId],
      value: parseEther(ethAmount),
      chainId: FN_CHAIN_ID,
    });
  };

  const settle = () => {
    writeContract({
      address: FN_CONTRACTS.auctionHouse.address,
      abi: FN_CONTRACTS.auctionHouse.abi,
      functionName: 'settleCurrentAndCreateNewAuction',
      chainId: FN_CHAIN_ID,
    });
  };

  return {
    placeBid,
    settle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}
