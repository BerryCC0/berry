/**
 * Bidding Hook
 * Place bids on Nouns auctions
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { NOUNS_CONTRACTS } from '../contracts';
import { BERRY_CLIENT_ID } from '../constants';

export function useBid() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Place a bid on the current auction
   * @param nounId - The ID of the Noun being auctioned
   * @param bidAmount - The bid amount in ETH (as string, e.g., "0.1")
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
   * Settle the current auction and start a new one
   */
  const settleAuction = () => {
    writeContract({
      address: NOUNS_CONTRACTS.auctionHouse.address,
      abi: NOUNS_CONTRACTS.auctionHouse.abi,
      functionName: 'settleCurrentAndCreateNewAuction',
    });
  };

  return {
    placeBid,
    settleAuction,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    hash,
  };
}

