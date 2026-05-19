'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import {
  collectTokenAddressesToResolve,
  decodeTransactions,
  type DecodedTransaction,
  type StreamInfo,
  type TokenInfo,
} from '../utils/transactionDecoder';
import { MINIMAL_ERC20_ABI } from '../utils/actionTemplates/constants';

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

/**
 * Decode proposal transactions, enriched with two flavors of metadata:
 *
 * 1. Treasury-stream info — pulled from the indexer, populates the
 *    vested/unvested numbers on cancel/recover descriptions.
 * 2. ERC-20 token info — fetched on-chain via batched `symbol()` +
 *    `decimals()` reads, so unknown tokens (memecoins, new launches, etc.)
 *    render with their real symbol instead of a truncated address.
 *
 * Both are progressive: the decoder runs immediately with whatever's
 * resolved, then re-runs as data lands.
 *
 * Safe to call with `undefined`/empty actions — returns an empty array.
 */
export function useDecodedTransactions(
  actions: ProposalAction[] | undefined,
): DecodedTransaction[] {
  const { data: streamsData } = useTreasuryStreams();

  const streamMap = useMemo(() => {
    const m = new Map<string, StreamInfo>();
    streamsData?.streams.forEach((s) => {
      m.set(s.streamAddress.toLowerCase(), {
        streamAddress: s.streamAddress.toLowerCase(),
        tokenAddress: s.tokenAddress.toLowerCase(),
        tokenAmountRaw: s.tokenAmountRaw,
        vestedRatio: s.vestedRatio,
        status: s.status,
      });
    });
    return m;
  }, [streamsData]);

  // Extract token addresses that aren't already in the static TOKEN_SYMBOLS
  // map. These get a parallel `symbol` + `decimals` read so the decoder
  // can render them by name (e.g. "MOG" instead of "0xaaee…1c7a").
  const tokenAddresses = useMemo(
    () => (actions ? collectTokenAddressesToResolve(actions) : []),
    [actions],
  );

  const { data: tokenData } = useReadContracts({
    contracts: tokenAddresses.flatMap((addr) => [
      {
        address: addr as Address,
        abi: MINIMAL_ERC20_ABI,
        functionName: 'symbol' as const,
      },
      {
        address: addr as Address,
        abi: MINIMAL_ERC20_ABI,
        functionName: 'decimals' as const,
      },
    ]),
    query: {
      enabled: tokenAddresses.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  });

  const tokenMap = useMemo(() => {
    const m = new Map<string, TokenInfo>();
    if (!tokenData) return m;
    tokenAddresses.forEach((addr, i) => {
      const symbolEntry = tokenData[i * 2];
      const decimalsEntry = tokenData[i * 2 + 1];
      const symbol =
        symbolEntry?.status === 'success'
          ? (symbolEntry.result as string)
          : undefined;
      const decimals =
        decimalsEntry?.status === 'success'
          ? Number(decimalsEntry.result as number)
          : undefined;
      if (symbol && decimals !== undefined) {
        m.set(addr, { symbol, decimals });
      }
    });
    return m;
  }, [tokenData, tokenAddresses]);

  return useMemo(() => {
    if (!actions || actions.length === 0) return [];
    return decodeTransactions(actions, {
      streams: streamMap,
      tokens: tokenMap,
    });
  }, [actions, streamMap, tokenMap]);
}
