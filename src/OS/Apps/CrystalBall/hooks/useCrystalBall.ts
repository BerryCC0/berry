/**
 * Crystal Ball Hook
 * Watches for new blocks and generates predicted next Noun
 */

import { useState, useEffect } from 'react';
import { useBlockNumber, useBlock, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import { getNounSeedFromBlockHash, type NounSeed } from '../utils/seedFromBlockHash';

interface CrystalBallState {
  seed: NounSeed | null;
  nextNounId: number | null;
  blockNumber: bigint | null;
  blockHash: `0x${string}` | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCrystalBall() {
  const [state, setState] = useState<CrystalBallState>({
    seed: null,
    nextNounId: null,
    blockNumber: null,
    blockHash: null,
    isLoading: true,
    error: null,
  });

  // Watch for new blocks on mainnet
  const { data: blockNumber } = useBlockNumber({
    chainId: mainnet.id,
    watch: true,
  });

  // Get block details for the hash
  const { data: block } = useBlock({
    chainId: mainnet.id,
    blockNumber: blockNumber,
  });

  // Get current auction to determine next noun ID
  const { data: auctionData } = useReadContract({
    address: NOUNS_CONTRACTS.auctionHouse.address,
    abi: NOUNS_CONTRACTS.auctionHouse.abi,
    functionName: 'auction',
    chainId: mainnet.id,
  });

  // Generate seed when block or auction changes
  useEffect(() => {
    if (!block?.hash || !auctionData) {
      setState(prev => ({ ...prev, isLoading: !block || !auctionData }));
      return;
    }

    try {
      const currentNounId = Number(auctionData[0]);
      const nextNounId = currentNounId + 1;
      const blockHash = block.hash;

      const seed = getNounSeedFromBlockHash(nextNounId, blockHash);

      setState({
        seed,
        nextNounId,
        blockNumber: block.number,
        blockHash,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to generate seed'),
      }));
    }
  }, [block?.hash, block?.number, auctionData]);

  return state;
}
