/**
 * Food Nouns Governor (NounsDAOLogicV1 fork) — indexer-grade ABI.
 * Proxy: 0xF72FAf0050a2cBb645362452a12d46EAdCC09177
 *
 * V1: simple propose/vote/queue/execute. No candidates, no client IDs,
 * no signed proposals, no refundable votes. Abstain is supported.
 */
export const fnGovernorAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "proposer", type: "address" },
      { indexed: false, name: "targets", type: "address[]" },
      { indexed: false, name: "values", type: "uint256[]" },
      { indexed: false, name: "signatures", type: "string[]" },
      { indexed: false, name: "calldatas", type: "bytes[]" },
      { indexed: false, name: "startBlock", type: "uint256" },
      { indexed: false, name: "endBlock", type: "uint256" },
      { indexed: false, name: "description", type: "string" },
    ],
    name: "ProposalCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "voter", type: "address" },
      { indexed: false, name: "proposalId", type: "uint256" },
      { indexed: false, name: "support", type: "uint8" },
      { indexed: false, name: "votes", type: "uint256" },
      { indexed: false, name: "reason", type: "string" },
    ],
    name: "VoteCast",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "id", type: "uint256" },
      { indexed: false, name: "eta", type: "uint256" },
    ],
    name: "ProposalQueued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "id", type: "uint256" }],
    name: "ProposalExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "id", type: "uint256" }],
    name: "ProposalCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "id", type: "uint256" }],
    name: "ProposalVetoed",
    type: "event",
  },
] as const;
