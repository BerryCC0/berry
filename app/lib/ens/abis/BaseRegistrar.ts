/**
 * ENS BaseRegistrar (.eth 2LDs)
 *
 * Address: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85
 * Deployed: block 9380471
 *
 * ERC-721 NFT for second-level .eth names. tokenId = uint256(labelhash(label)).
 * Only emits the labelhash — not the original label. To recover the label,
 * we cross-reference NameRegistered events from the ETHRegistrarController
 * (which does emit the string label).
 */

export const BaseRegistrarABI = [
  // ENS-specific events
  {
    type: 'event',
    name: 'NameRegistered',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'expires', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NameRenewed',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'expires', type: 'uint256', indexed: false },
    ],
  },
  // ERC-721
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
  // Reads
  {
    type: 'function',
    name: 'nameExpires',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
