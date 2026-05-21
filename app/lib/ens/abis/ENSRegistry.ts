/**
 * ENS Registry (ENSIP-1 root)
 *
 * Address: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
 * Deployed: block 9380410
 *
 * Minimal ABI — only events + reads we need for indexing ownership.
 */

export const ENSRegistryABI = [
  // Events
  {
    type: 'event',
    name: 'NewOwner',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'label', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NewResolver',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'resolver', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NewTTL',
    inputs: [
      { name: 'node', type: 'bytes32', indexed: true },
      { name: 'ttl', type: 'uint64', indexed: false },
    ],
  },
  // Reads (rarely called from handlers but useful for tooling)
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'resolver',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
