/**
 * Generate Noun seed from block hash
 * Replicates the NounSeeder contract logic off-chain
 */

import { keccak256, encodePacked } from 'viem';
import { ImageData } from '@/app/lib/nouns/utils/image-data';

export interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/**
 * Get the number of items in each trait category
 */
function getTraitCounts() {
  return {
    backgrounds: ImageData.bgcolors.length,
    bodies: ImageData.images.bodies.length,
    accessories: ImageData.images.accessories.length,
    heads: ImageData.images.heads.length,
    glasses: ImageData.images.glasses.length,
  };
}

/**
 * Generate a Noun seed from a block hash and noun ID
 * This replicates the NounSeeder contract's generateSeed function
 */
export function getNounSeedFromBlockHash(
  nounId: number | bigint,
  blockHash: `0x${string}`
): NounSeed {
  const counts = getTraitCounts();
  
  // Create pseudorandom hash by combining nounId and blockHash
  const pseudorandomness = keccak256(
    encodePacked(['bytes32', 'uint256'], [blockHash, BigInt(nounId)])
  );
  
  // Convert to BigInt for modulo operations
  const pseudorandomBigInt = BigInt(pseudorandomness);
  
  // Extract each trait using bit shifting (similar to Solidity uint48 extraction)
  // In the contract, each uint48 is extracted by shifting right
  const background = Number(pseudorandomBigInt % BigInt(counts.backgrounds));
  const body = Number((pseudorandomBigInt >> 48n) % BigInt(counts.bodies));
  const accessory = Number((pseudorandomBigInt >> 96n) % BigInt(counts.accessories));
  const head = Number((pseudorandomBigInt >> 144n) % BigInt(counts.heads));
  const glasses = Number((pseudorandomBigInt >> 192n) % BigInt(counts.glasses));
  
  return {
    background,
    body,
    accessory,
    head,
    glasses,
  };
}
