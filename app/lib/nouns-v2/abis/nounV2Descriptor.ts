// NounsDescriptorV2 — DAO-owned descriptor at
// 0xAe0247Ca34B211a61b03A95F8008DCb8B3124B89. Same shape as the official Nouns
// NounsDescriptorV2 (compressed art via SSTORE2). This file lists only the
// read surface the crystal ball needs: trait counts + seed-driven URI rendering.
// Admin/setter functions are omitted; pull from Etherscan if needed later.

export const nounV2DescriptorAbi = [
  // ─── Trait counts ────────────────────────────────────────────────
  {
    type: 'function',
    name: 'backgroundCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'bodyCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'accessoryCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'headCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'glassesCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // ─── Render an arbitrary seed (no token required) ────────────────
  // Returns `data:application/json;base64,...` with embedded SVG.
  {
    type: 'function',
    name: 'genericDataURI',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      {
        name: 'seed',
        type: 'tuple',
        components: [
          { name: 'background', type: 'uint48' },
          { name: 'body', type: 'uint48' },
          { name: 'accessory', type: 'uint48' },
          { name: 'head', type: 'uint48' },
          { name: 'glasses', type: 'uint48' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  // ─── Per-token render (requires the token to exist) ──────────────
  {
    type: 'function',
    name: 'dataURI',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      {
        name: 'seed',
        type: 'tuple',
        components: [
          { name: 'background', type: 'uint48' },
          { name: 'body', type: 'uint48' },
          { name: 'accessory', type: 'uint48' },
          { name: 'head', type: 'uint48' },
          { name: 'glasses', type: 'uint48' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  // ─── Background color hex strings (e.g., "d5d7e1") ───────────────
  {
    type: 'function',
    name: 'backgrounds',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;
