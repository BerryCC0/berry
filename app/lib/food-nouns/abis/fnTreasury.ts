/**
 * Food Nouns Treasury / Timelock (NounsDAOExecutor V1 fork) — indexer ABI.
 * Address: 0xaF1BFd8bF02C5EC169d20faba53BF0fa761bf65f
 *
 * Standard Compound-style timelock events: schedule → execute, or cancel.
 * The (txHash, target, value, signature, data, eta) tuple uniquely
 * identifies a queued transaction across all three lifecycle events.
 */
export const fnTreasuryAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "txHash", type: "bytes32" },
      { indexed: true, name: "target", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
      { indexed: false, name: "signature", type: "string" },
      { indexed: false, name: "data", type: "bytes" },
      { indexed: false, name: "eta", type: "uint256" },
    ],
    name: "QueueTransaction",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "txHash", type: "bytes32" },
      { indexed: true, name: "target", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
      { indexed: false, name: "signature", type: "string" },
      { indexed: false, name: "data", type: "bytes" },
      { indexed: false, name: "eta", type: "uint256" },
    ],
    name: "ExecuteTransaction",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "txHash", type: "bytes32" },
      { indexed: true, name: "target", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
      { indexed: false, name: "signature", type: "string" },
      { indexed: false, name: "data", type: "bytes" },
      { indexed: false, name: "eta", type: "uint256" },
    ],
    name: "CancelTransaction",
    type: "event",
  },
] as const;
