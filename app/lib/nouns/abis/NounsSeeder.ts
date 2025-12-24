/**
 * Nouns Seeder ABI
 * 
 * Contract: NounsSeeder
 * Address: 0xCC8a0FB5ab3C7132c1b2A0109142Fb112c4Ce515
 * 
 * The Nouns Seeder contract generates pseudorandom trait combinations for Nouns.
 * It uses the Noun ID and descriptor to deterministically generate a seed that
 * determines which background, body, accessory, head, and glasses a Noun will have.
 * 
 * This ensures every Noun has unique, on-chain generated artwork that is
 * reproducible and verifiable.
 * 
 * Key features:
 * - Deterministic pseudorandom generation
 * - Generates trait seeds for Noun artwork
 * - Used by NounsToken during minting
 * - Seeds are stored on-chain in the token contract
 * 
 * Key functions:
 * - generateSeed: Generate a trait seed for a given Noun ID
 */

export const NounsSeederABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'nounId',
        type: 'uint256',
      },
      {
        internalType: 'contract INounsDescriptor',
        name: 'descriptor',
        type: 'address',
      },
    ],
    name: 'generateSeed',
    outputs: [
      {
        components: [
          {
            internalType: 'uint48',
            name: 'background',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'body',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'accessory',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'head',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'glasses',
            type: 'uint48',
          },
        ],
        internalType: 'struct INounsSeeder.Seed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

