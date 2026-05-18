/**
 * V2 crystal-ball hook. Watches mainnet blocks; each new block, computes
 * what the *next* V2 noun's seed would be (including the slobber override)
 * if the current auction were settled on that block.
 *
 * Modelled after the V1 useCrystalBall, with V2 contracts + V2 seeder rule.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBlock, useWatchBlockNumber } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getV2NounSeedFromBlockHash } from '../utils/seedFromBlockHashV2';
import type { V2Seed } from '../utils/slobber';
import { useV2CurrentAuction } from './useV2CurrentAuction';
import { useV2TraitCounts } from './useV2TraitCounts';

interface V2CrystalBallState {
  seed: V2Seed | null;
  nextNounId: number | null;
  blockNumber: bigint | null;
  blockHash: `0x${string}` | null;
  auctionEndTime: number | null;
  auctionSettled: boolean;
  isLoading: boolean;
  error: Error | null;
}

function isAuctionEnded(endTime: number | null, settled: boolean): boolean {
  if (settled) return false;
  if (!endTime) return false;
  return Math.floor(Date.now() / 1000) >= endTime;
}

export function useV2CrystalBall() {
  const [currentBlockNumber, setCurrentBlockNumber] = useState<bigint | null>(null);

  const [state, setState] = useState<V2CrystalBallState>({
    seed: null,
    nextNounId: null,
    blockNumber: null,
    blockHash: null,
    auctionEndTime: null,
    auctionSettled: false,
    isLoading: true,
    error: null,
  });

  useWatchBlockNumber({
    chainId: mainnet.id,
    emitOnBegin: true,
    onBlockNumber(blockNumber) {
      setCurrentBlockNumber(blockNumber);
    },
  });

  const { data: block, refetch: refetchBlock } = useBlock({
    chainId: mainnet.id,
    blockNumber: currentBlockNumber ?? undefined,
    query: { enabled: !!currentBlockNumber },
  });

  const { auction, refetch: refetchAuction } = useV2CurrentAuction();
  const { counts, isLoading: countsLoading } = useV2TraitCounts();

  useEffect(() => {
    if (currentBlockNumber) refetchBlock();
  }, [currentBlockNumber, refetchBlock]);

  useEffect(() => {
    if (!block?.hash || !auction || !counts) {
      setState((prev) => ({
        ...prev,
        isLoading: !block || !auction || countsLoading,
      }));
      return;
    }

    try {
      const currentNounId = Number(auction.nounId);
      const nextNounId = currentNounId + 1;
      const blockHash = block.hash;
      const endTime = Number(auction.endTime);
      const settled = auction.settled;

      const seed = getV2NounSeedFromBlockHash(nextNounId, blockHash, counts);

      setState({
        seed,
        nextNounId,
        blockNumber: block.number,
        blockHash,
        auctionEndTime: endTime,
        auctionSettled: settled,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to generate V2 seed'),
      }));
    }
  }, [block, auction, counts, countsLoading]);

  const canSettle = isAuctionEnded(state.auctionEndTime, state.auctionSettled);

  const refresh = useCallback(() => {
    refetchBlock();
    refetchAuction();
  }, [refetchBlock, refetchAuction]);

  return {
    ...state,
    canSettle,
    refetchAuction,
    refresh,
  };
}
