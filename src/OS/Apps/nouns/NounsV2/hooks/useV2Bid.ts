/**
 * Place a bid on the current NounV2 auction, or settle when expired.
 */

'use client';

import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export function useV2Bid() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } =
    useWaitForTransactionReceipt({ hash });

  const placeBid = (nounId: bigint, ethAmount: string) => {
    writeContract({
      address: V2_CONTRACTS.auctionHouse.address,
      abi: V2_CONTRACTS.auctionHouse.abi,
      functionName: 'createBid',
      args: [nounId],
      value: parseEther(ethAmount),
      chainId: V2_CHAIN_ID,
    });
  };

  const settle = () => {
    writeContract({
      address: V2_CONTRACTS.auctionHouse.address,
      abi: V2_CONTRACTS.auctionHouse.abi,
      functionName: 'settleCurrentAndCreateNewAuction',
      chainId: V2_CHAIN_ID,
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
