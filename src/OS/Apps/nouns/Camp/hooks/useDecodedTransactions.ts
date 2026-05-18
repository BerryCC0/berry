'use client';

import { useMemo } from 'react';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import {
  decodeTransactions,
  type DecodedTransaction,
  type StreamInfo,
} from '../utils/transactionDecoder';

interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

/**
 * Decode proposal transactions with stream metadata enrichment.
 *
 * Loads the treasury-streams index in the background; while it's loading the
 * decoder simply falls back to its no-stream descriptions. Once loaded,
 * cancel/recover actions get concrete vested/unvested amounts.
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

  return useMemo(() => {
    if (!actions || actions.length === 0) return [];
    return decodeTransactions(actions, { streams: streamMap });
  }, [actions, streamMap]);
}
