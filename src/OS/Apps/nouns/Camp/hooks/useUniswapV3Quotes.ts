/**
 * useUniswapV3Quotes
 * Fetch live Uniswap V3 swap quotes across all four fee tiers in parallel,
 * so the editor can recommend the best-output pool and preview output for
 * the chosen tier.
 *
 * QuoterV2's `quoteExactInputSingle` is marked `nonpayable` (it actually
 * executes the swap and reverts with the result encoded in the revert
 * data) — viem/wagmi handle this transparently via eth_call.
 */

'use client';

import { useReadContracts } from 'wagmi';
import { isAddress, type Address } from 'viem';
import {
  UNISWAP_V3_FEE_TIERS,
  UNISWAP_V3_QUOTER_ABI,
  UNISWAP_V3_QUOTER_ADDRESS,
  type UniswapV3FeeTier,
} from '../utils/actionTemplates/constants';

export interface UniswapV3QuoteResult {
  /** Quote per fee tier — bigint amountOut, or null when the pool doesn't exist / has insufficient liquidity. */
  quotes: Record<UniswapV3FeeTier, bigint | null>;
  /** Fee tier with the highest amountOut, or null if no tier returned a quote. */
  bestFee: UniswapV3FeeTier | null;
  /** amountOut of the best-fee pool, or null. */
  bestAmountOut: bigint | null;
  isLoading: boolean;
}

export function useUniswapV3Quotes(
  tokenIn: string | undefined,
  tokenOut: string | undefined,
  amountIn: bigint,
): UniswapV3QuoteResult {
  const enabled =
    !!tokenIn &&
    !!tokenOut &&
    isAddress(tokenIn) &&
    isAddress(tokenOut) &&
    tokenIn.toLowerCase() !== tokenOut.toLowerCase() &&
    amountIn > BigInt(0);

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? UNISWAP_V3_FEE_TIERS.map((fee) => ({
          address: UNISWAP_V3_QUOTER_ADDRESS,
          abi: UNISWAP_V3_QUOTER_ABI,
          functionName: 'quoteExactInputSingle' as const,
          args: [
            {
              tokenIn: tokenIn as Address,
              tokenOut: tokenOut as Address,
              amountIn,
              fee,
              sqrtPriceLimitX96: BigInt(0),
            },
          ],
        }))
      : [],
    query: { enabled },
  });

  const quotes = {} as Record<UniswapV3FeeTier, bigint | null>;
  let bestFee: UniswapV3FeeTier | null = null;
  let bestAmountOut: bigint | null = null;

  UNISWAP_V3_FEE_TIERS.forEach((fee, i) => {
    const entry = data?.[i];
    // QuoterV2 returns a tuple — amountOut is the first element. When a pool
    // doesn't exist for a fee tier, the call reverts and `status` is 'failure'.
    const amountOut =
      entry?.status === 'success'
        ? (entry.result as readonly [bigint, bigint, number, bigint])[0]
        : null;
    quotes[fee] = amountOut;
    if (amountOut !== null && (bestAmountOut === null || amountOut > bestAmountOut)) {
      bestAmountOut = amountOut;
      bestFee = fee;
    }
  });

  return { quotes, bestFee, bestAmountOut, isLoading };
}
