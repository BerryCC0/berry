/**
 * Food Nouns Token (V1 Nouns fork) — indexer-grade ABI.
 * Proxy: 0xF5331380e1d19757388A6E6198BF3BDc93D8b07a
 *
 * Includes the events Ponder needs to index: NounCreated for mint+seed,
 * Transfer for ownership history, DelegateChanged + DelegateVotesChanged
 * for voting-power tracking. Mirrors Nouns V1 NounsToken event shape.
 */
export const fnTokenAbi = [
  // ── reads ─────────────────────────────────────────────────────────
  {
    inputs: [],
    name: "descriptor",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "seeds",
    outputs: [
      { name: "background", type: "uint48" },
      { name: "body", type: "uint48" },
      { name: "accessory", type: "uint48" },
      { name: "head", type: "uint48" },
      { name: "glasses", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ── events ────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      {
        components: [
          { name: "background", type: "uint48" },
          { name: "body", type: "uint48" },
          { name: "accessory", type: "uint48" },
          { name: "head", type: "uint48" },
          { name: "glasses", type: "uint48" },
        ],
        indexed: false,
        name: "seed",
        type: "tuple",
      },
    ],
    name: "NounCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegator", type: "address" },
      { indexed: true, name: "fromDelegate", type: "address" },
      { indexed: true, name: "toDelegate", type: "address" },
    ],
    name: "DelegateChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegate", type: "address" },
      { indexed: false, name: "previousBalance", type: "uint256" },
      { indexed: false, name: "newBalance", type: "uint256" },
    ],
    name: "DelegateVotesChanged",
    type: "event",
  },
] as const;
