'use client';

/**
 * useTokenBuyerStatus
 *
 * Reads the live status of the Token Buyer / USDC Payer system:
 *   - TokenBuyer ETH balance (the system's fuel)
 *   - Payer USDC reserves
 *   - Payer total queued debt
 *
 * Used by the TokenBuyerStatusLine header to surface "should I refill?" /
 * "is there debt to repay?" signals when the user is composing a Token Buyer
 * category transaction.
 */

import { useReadContract, useBalance } from 'wagmi';
import { erc20Abi } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { PayerABI } from '@/app/lib/nouns/abis';

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`;
const TOKEN_BUYER = NOUNS_ADDRESSES.tokenBuyer as `0x${string}`;
const PAYER = NOUNS_ADDRESSES.payer as `0x${string}`;

export interface TokenBuyerStatus {
  /** Native ETH balance of the TokenBuyer contract (wei). */
  tokenBuyerEth: bigint | undefined;
  /** USDC balance of the Payer contract (6 decimals). */
  payerUsdc: bigint | undefined;
  /** Total queued debt the Payer owes recipients (6 decimals). */
  payerDebt: bigint | undefined;
  isLoading: boolean;
}

export function useTokenBuyerStatus(): TokenBuyerStatus {
  const ethQuery = useBalance({ address: TOKEN_BUYER });

  const usdcQuery = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PAYER],
  });

  const debtQuery = useReadContract({
    address: PAYER,
    abi: PayerABI,
    functionName: 'totalDebt',
  });

  return {
    tokenBuyerEth: ethQuery.data?.value,
    payerUsdc: usdcQuery.data as bigint | undefined,
    payerDebt: debtQuery.data as bigint | undefined,
    isLoading: ethQuery.isLoading || usdcQuery.isLoading || debtQuery.isLoading,
  };
}
