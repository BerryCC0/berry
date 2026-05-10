// NounV2Token — ERC-721 + ERC721Checkpointable + Ownable, fork of NounsToken
// with the nounder reward removed. Canonical ABI is the verified contract on
// Etherscan at 0xb1d6bdf9326dd09183c2e9d25af5e22c637293b9.
//
// This file lists the ABI surface most integrations need (ERC-721 reads,
// voting-power reads, delegation). For admin functions (mint, burn,
// setMinter, lockMinter, setDescriptor, etc.), pull the full ABI from
// Etherscan or recompile from contracts/NounV2Token.sol.

export const nounV2TokenAbi = [
  // ─── ERC-721 reads ───────────────────────────────────────────────
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // ERC721Enumerable — present on the V2 token (forks NounsToken which extends
  // ERC721Enumerable). Trimmed from the handoff bundle ABI; needed for holdings.
  {
    type: 'function',
    name: 'tokenOfOwnerByIndex',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenByIndex',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'dataURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'contractURI',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'seeds',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'background', type: 'uint48' },
      { name: 'body', type: 'uint48' },
      { name: 'accessory', type: 'uint48' },
      { name: 'head', type: 'uint48' },
      { name: 'glasses', type: 'uint48' },
    ],
    stateMutability: 'view',
  },
  // ─── ERC-721 writes ──────────────────────────────────────────────
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ─── Voting power (ERC721Checkpointable) ─────────────────────────
  {
    type: 'function',
    name: 'getCurrentVotes',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint96' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPriorVotes',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'blockNumber', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint96' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'delegates',
    inputs: [{ name: 'delegator', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'delegate',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ─── Ownable / config ───────────────────────────────────────────
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minter',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'descriptor',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'seeder',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // ─── Events ──────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'NounCreated',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      {
        name: 'seed',
        type: 'tuple',
        indexed: false,
        components: [
          { name: 'background', type: 'uint48' },
          { name: 'body', type: 'uint48' },
          { name: 'accessory', type: 'uint48' },
          { name: 'head', type: 'uint48' },
          { name: 'glasses', type: 'uint48' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'NounBurned',
    inputs: [{ name: 'tokenId', type: 'uint256', indexed: true }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DelegateChanged',
    inputs: [
      { name: 'delegator', type: 'address', indexed: true },
      { name: 'fromDelegate', type: 'address', indexed: true },
      { name: 'toDelegate', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DelegateVotesChanged',
    inputs: [
      { name: 'delegate', type: 'address', indexed: true },
      { name: 'previousBalance', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;
