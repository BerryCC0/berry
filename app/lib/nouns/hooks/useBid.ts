/**
 * Bidding Hook
 * Place bids on Nouns auctions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { NOUNS_CONTRACTS } from '../contracts';
import { BERRY_CLIENT_ID } from '../constants';

/**
 * Pre-computed settle transaction parameters.
 * Kept ready in memory so the wallet prompt fires instantly on click.
 */
interface SettleParams {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export function useBid() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Pre-estimated settle parameters — refreshed every block
  const settleParamsRef = useRef<SettleParams | null>(null);
  const [isPreEstimating, setIsPreEstimating] = useState(false);

  // Pre-estimate gas for settle so there's zero delay on click
  const preEstimateSettle = useCallback(async () => {
    if (!publicClient || !address) return;
    setIsPreEstimating(true);
    try {
      const [gasEstimate, feeData] = await Promise.all([
        publicClient.estimateGas({
          account: address,
          to: NOUNS_CONTRACTS.auctionHouse.address,
          data: encodeFunctionData({
            abi: NOUNS_CONTRACTS.auctionHouse.abi,
            functionName: 'settleCurrentAndCreateNewAuction',
          }),
        }).catch(() => null),
        publicClient.estimateFeesPerGas().catch(() => null),
      ]);

      if (gasEstimate && feeData) {
        settleParamsRef.current = {
          // 20% gas buffer to avoid out-of-gas on state changes
          gas: gasEstimate + (gasEstimate / BigInt(5)),
          // Boost priority fee by 20% over current estimate for faster inclusion
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
            ? feeData.maxPriorityFeePerGas + (feeData.maxPriorityFeePerGas / BigInt(5))
            : BigInt(2_000_000_000), // 2 gwei fallback
          maxFeePerGas: feeData.maxFeePerGas
            ? feeData.maxFeePerGas + (feeData.maxFeePerGas / BigInt(5))
            : BigInt(50_000_000_000), // 50 gwei fallback
        };
      }
    } catch {
      // Estimation can fail if auction isn't settleable yet — that's fine
      settleParamsRef.current = null;
    }
    setIsPreEstimating(false);
  }, [publicClient, address]);

  // Re-estimate every ~12s (new block) while the user has the app open
  useEffect(() => {
    if (!publicClient || !address) return;
    preEstimateSettle();
    const interval = setInterval(preEstimateSettle, 12_000);
    return () => clearInterval(interval);
  }, [preEstimateSettle, publicClient, address]);

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Place a bid on the current auction
   */
  const placeBid = (nounId: bigint, bidAmount: string) => {
    const value = parseEther(bidAmount);
    
    writeContract({
      address: NOUNS_CONTRACTS.auctionHouse.address,
      abi: NOUNS_CONTRACTS.auctionHouse.abi,
      functionName: 'createBid',
      args: [nounId, BERRY_CLIENT_ID],
      value,
    });
  };

  /**
   * Settle the current auction and start a new one.
   * Uses pre-estimated gas + boosted priority fee for fastest possible inclusion.
   */
  const settleAuction = () => {
    const params = settleParamsRef.current;
    writeContract({
      address: NOUNS_CONTRACTS.auctionHouse.address,
      abi: NOUNS_CONTRACTS.auctionHouse.abi,
      functionName: 'settleCurrentAndCreateNewAuction',
      // Supply pre-estimated values so wagmi skips its own eth_estimateGas call
      ...(params ? {
        gas: params.gas,
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
      } : {}),
    });
  };

  return {
    placeBid,
    settleAuction,
    isPending,
    isConfirming,
    isSuccess,
    isPreEstimating,
    error: writeError || confirmError,
    hash,
  };
}

