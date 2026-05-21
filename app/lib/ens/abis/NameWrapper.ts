/**
 * ENS NameWrapper
 *
 * Address: 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401
 * Deployed: block 16925618
 *
 * ERC-1155 wrapper for ENS names. Most modern registrations wrap by default.
 * Crucially, NameWrapped emits the DNS-encoded name bytes — we decode these
 * to recover full labels for both .eth 2LDs and any subnames.
 */

export const NameWrapperABI = [
  {
    type: 'event',
    name: 'NameWrapped',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'name', type: 'bytes', indexed: false },
      { name: 'owner', type: 'address', indexed: false },
      { name: 'fuses', type: 'uint32', indexed: false },
      { name: 'expiry', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NameUnwrapped',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FusesSet',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'fuses', type: 'uint32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpiryExtended',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'expiry', type: 'uint64', indexed: false },
    ],
  },
  // ERC-1155
  {
    type: 'event',
    name: 'TransferSingle',
    inputs: [
      { name: 'operator', type: 'address', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'id', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TransferBatch',
    inputs: [
      { name: 'operator', type: 'address', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'values', type: 'uint256[]', indexed: false },
    ],
  },
  // Reads
  {
    type: 'function',
    name: 'getData',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
