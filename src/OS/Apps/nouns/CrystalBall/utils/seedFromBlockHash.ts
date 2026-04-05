/**
 * Generate Noun seed from block hash
 * Replicates the NounSeeder contract logic off-chain
 * 
 * Algorithm based on the Nouns protocol NounSeeder contract:
 * 1. Create pseudorandomness via keccak256(abi.encodePacked(blockHash, nounId))
 * 2. Extract each trait by shifting right and masking to uint48
 * 3. Take modulo of the trait count
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
 * Shift right and cast to uint48 (mask to lower 48 bits)
 * This replicates the Solidity behavior of casting to uint48 after shifting
 */
function shiftRightAndCastToUint48(value: bigint, shiftAmount: number): bigint {
  const shifted = value >> BigInt(shiftAmount);
  // Mask to 48 bits (0xFFFFFFFFFFFF = 2^48 - 1)
  const UINT48_MAX = BigInt('281474976710655'); // 2^48 - 1
  return shifted & UINT48_MAX;
}

/**
 * Get pseudorandom part from the pseudorandomness value
 * Replicates the NounSeeder contract's trait extraction
 */
function getPseudorandomPart(
  pseudorandomness: bigint,
  partCount: number,
  shiftAmount: number
): number {
  const uint48Value = shiftRightAndCastToUint48(pseudorandomness, shiftAmount);
  return Number(uint48Value % BigInt(partCount));
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
  
  // Create pseudorandom hash by combining blockHash and nounId
  // This matches: keccak256(abi.encodePacked(blockhash, nounId))
  const pseudorandomnessHex = keccak256(
    encodePacked(['bytes32', 'uint256'], [blockHash, BigInt(nounId)])
  );
  
  // Convert to BigInt for bit operations
  const pseudorandomness = BigInt(pseudorandomnessHex);
  
  // Extract each trait using bit shifting and uint48 masking
  // Each trait uses 48 bits of the 256-bit pseudorandomness
  return {
    background: getPseudorandomPart(pseudorandomness, counts.backgrounds, 0),
    body: getPseudorandomPart(pseudorandomness, counts.bodies, 48),
    accessory: getPseudorandomPart(pseudorandomness, counts.accessories, 96),
    head: getPseudorandomPart(pseudorandomness, counts.heads, 144),
    glasses: getPseudorandomPart(pseudorandomness, counts.glasses, 192),
  };
}
