// Ponder schema — proposal lifecycle + auction/candidate/noun timestamps
import {
  onchainTable,
  onchainView,
  index,
  relations,
  eq,
  or,
  and,
  gt,
  desc,
  isNotNull,
} from "ponder";

// =============================================================================
// SUBGRAPH 1: CORE PROTOCOL
// =============================================================================

/** All Nouns with traits, SVG, auction info */
export const nouns = onchainTable("nouns", (t) => ({
  id: t.integer().primaryKey(),
  background: t.integer().notNull(),
  body: t.integer().notNull(),
  accessory: t.integer().notNull(),
  head: t.integer().notNull(),
  glasses: t.integer().notNull(),
  svg: t.text().notNull(),
  owner: t.hex(),
  settledByAddress: t.hex(),
  settledByEns: t.text(),
  settledAt: t.bigint(),
  settledTxHash: t.hex(),
  winningBid: t.bigint(),
  winnerAddress: t.hex(),
  winnerEns: t.text(),
  burned: t.boolean().notNull().default(false),
  burnedAt: t.bigint(),
  area: t.integer(),
  colorCount: t.integer(),
  brightness: t.integer(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Auction lifecycle */
export const auctions = onchainTable("auctions", (t) => ({
  nounId: t.integer().primaryKey(),
  startTime: t.bigint().notNull(),
  endTime: t.bigint().notNull(),
  winner: t.hex(),
  amount: t.bigint(),
  settled: t.boolean().notNull().default(false),
  clientId: t.integer(),
  settlerAddress: t.hex(),
  settledTimestamp: t.bigint(),
  blockNumber: t.bigint().notNull(),
}));

/** Every auction bid */
export const auctionBids = onchainTable(
  "auction_bids",
  (t) => ({
    id: t.text().primaryKey(),
    nounId: t.integer().notNull(),
    bidder: t.hex().notNull(),
    amount: t.bigint().notNull(),
    extended: t.boolean().notNull(),
    clientId: t.integer(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    nounIdx: index().on(table.nounId),
    bidderIdx: index().on(table.bidder),
  })
);

/** NounsToken transfers */
export const transfers = onchainTable(
  "transfers",
  (t) => ({
    id: t.text().primaryKey(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenId: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.tokenId),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  })
);

/** Delegation changes */
export const delegations = onchainTable(
  "delegations",
  (t) => ({
    id: t.text().primaryKey(),
    delegator: t.hex().notNull(),
    fromDelegate: t.hex().notNull(),
    toDelegate: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    delegatorIdx: index().on(table.delegator),
    toDelegateIdx: index().on(table.toDelegate),
  })
);

/** Voters / delegates */
export const voters = onchainTable(
  "voters",
  (t) => ({
    address: t.hex().primaryKey(),
    ensName: t.text(),
    delegatedVotes: t.integer().notNull().default(0),
    nounsRepresented: t.json().$type<number[]>().default([]),
    totalVotes: t.integer().notNull().default(0),
    lastVoteAt: t.bigint(),
    firstSeenAt: t.bigint(),
  }),
  (table) => ({
    votesIdx: index().on(table.delegatedVotes),
  })
);

/** Token config change audit trail */
export const tokenConfigChanges = onchainTable(
  "token_config_changes",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Auction house config change audit trail */
export const auctionConfigChanges = onchainTable(
  "auction_config_changes",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Descriptor config changes */
export const descriptorConfigChanges = onchainTable(
  "descriptor_config",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/**
 * $nouns NFT-backed token swap events.
 * One row per Deposit / Redeem / Swap. Lets the activity feed distinguish
 * these from ordinary Noun transfers, since underneath they look the same.
 *   - deposit: Noun(s) into pool, $nouns minted    (tokensIn populated)
 *   - redeem:  $nouns burned, Noun(s) out of pool (tokensOut populated)
 *   - swap:    Noun(s) ↔ Noun(s)                  (both populated, equal length)
 */
export const tokenSwapEvents = onchainTable(
  "token_swap_events",
  (t) => ({
    id: t.text().primaryKey(),
    kind: t.text().notNull(),
    actor: t.hex().notNull(),
    tokensIn: t.json().$type<number[]>().notNull().default([]),
    tokensOut: t.json().$type<number[]>().notNull().default([]),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    actorIdx: index().on(table.actor),
    kindIdx: index().on(table.kind),
    timestampIdx: index().on(table.blockTimestamp),
  })
);

// =============================================================================
// SUBGRAPH 2: GOVERNANCE
// =============================================================================

/** On-chain proposals */
export const proposals = onchainTable(
  "proposals",
  (t) => ({
    id: t.integer().primaryKey(),
    proposer: t.hex().notNull(),
    title: t.text().notNull().default(""),
    description: t.text(),
    /**
     * keccak256(abi.encode(targets, values, signatures, calldatas, keccak256(description))).
     * Matches the candidate's `encodedProposalHash` when the proposal was promoted
     * from one via `proposeBySigs` — the contract requires byte-identical params.
     */
    encodedProposalHash: t.hex(),
    status: t.text().notNull().default("PENDING"),
    targets: t.json().$type<string[]>(),
    values: t.json().$type<string[]>(),
    signatures: t.json().$type<string[]>(),
    calldatas: t.json().$type<string[]>(),
    startBlock: t.bigint(),
    endBlock: t.bigint(),
    // Estimated voting timestamps (computed at index time: createdTimestamp + blocksUntil * 12)
    startTimestamp: t.bigint(),
    endTimestamp: t.bigint(),
    proposalThreshold: t.bigint(),
    quorumVotes: t.bigint(),
    forVotes: t.integer().notNull().default(0),
    againstVotes: t.integer().notNull().default(0),
    abstainVotes: t.integer().notNull().default(0),
    executionEta: t.bigint(),
    signers: t.json().$type<string[]>(),
    updatePeriodEndBlock: t.bigint(),
    objectionPeriodEndBlock: t.bigint(),
    onTimelockV1: t.boolean().notNull().default(false),
    clientId: t.integer(),
    createdTimestamp: t.bigint(),
    createdBlock: t.bigint(),
    txHash: t.hex(),
    // Lifecycle timestamps (stored when status changes)
    cancelledTimestamp: t.bigint(),
    cancelledBlock: t.bigint(),
    queuedTimestamp: t.bigint(),
    queuedBlock: t.bigint(),
    executedTimestamp: t.bigint(),
    executedBlock: t.bigint(),
    vetoedTimestamp: t.bigint(),
    vetoedBlock: t.bigint(),
  }),
  (table) => ({
    statusIdx: index().on(table.status),
    proposerIdx: index().on(table.proposer),
    createdIdx: index().on(table.createdTimestamp),
    encodedHashIdx: index().on(table.encodedProposalHash),
  })
);

/** Proposal version history */
export const proposalVersions = onchainTable(
  "proposal_versions",
  (t) => ({
    id: t.text().primaryKey(),
    proposalId: t.integer().notNull(),
    versionNumber: t.integer().notNull(),
    title: t.text(),
    description: t.text(),
    targets: t.json().$type<string[]>(),
    values: t.json().$type<string[]>(),
    signatures: t.json().$type<string[]>(),
    calldatas: t.json().$type<string[]>(),
    updateMessage: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    proposalIdx: index().on(table.proposalId),
  })
);

/** Individual votes */
export const votes = onchainTable(
  "votes",
  (t) => ({
    id: t.text().primaryKey(),
    voter: t.hex().notNull(),
    proposalId: t.integer().notNull(),
    support: t.integer().notNull(),
    votes: t.integer().notNull(),
    reason: t.text(),
    clientId: t.integer(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    voterIdx: index().on(table.voter),
    proposalIdx: index().on(table.proposalId),
  })
);

/** Vote gas refunds */
export const voteRefunds = onchainTable("vote_refunds", (t) => ({
  id: t.text().primaryKey(),
  voter: t.hex().notNull(),
  refundAmount: t.bigint().notNull(),
  refundSent: t.boolean().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Cancelled signatures */
export const cancelledSignatures = onchainTable(
  "cancelled_signatures",
  (t) => ({
    id: t.text().primaryKey(),
    signer: t.hex().notNull(),
    sig: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  })
);

/** Proposal candidates */
export const candidates = onchainTable(
  "candidates",
  (t) => ({
    id: t.text().primaryKey(),
    slug: t.text().notNull(),
    proposer: t.hex().notNull(),
    title: t.text(),
    description: t.text(),
    targets: t.json().$type<string[]>(),
    values: t.json().$type<string[]>(),
    signatures: t.json().$type<string[]>(),
    calldatas: t.json().$type<string[]>(),
    encodedProposalHash: t.hex(),
    proposalIdToUpdate: t.integer(),
    canceled: t.boolean().notNull().default(false),
    canceledTimestamp: t.bigint(),
    canceledBlock: t.bigint(),
    signatureCount: t.integer().notNull().default(0),
    createdTimestamp: t.bigint(),
    lastUpdatedTimestamp: t.bigint(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    slugIdx: index().on(table.slug),
    proposerIdx: index().on(table.proposer),
    createdIdx: index().on(table.createdTimestamp),
  })
);

/** Candidate version history */
export const candidateVersions = onchainTable(
  "candidate_versions",
  (t) => ({
    id: t.text().primaryKey(),
    candidateId: t.text().notNull(),
    versionNumber: t.integer().notNull(),
    title: t.text(),
    description: t.text(),
    updateMessage: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    candidateIdx: index().on(table.candidateId),
  })
);

/** Candidate sponsor signatures */
export const candidateSignatures = onchainTable(
  "candidate_signatures",
  (t) => ({
    id: t.text().primaryKey(),
    candidateId: t.text().notNull(),
    signer: t.hex().notNull(),
    sig: t.hex().notNull(),
    expirationTimestamp: t.bigint().notNull(),
    proposer: t.hex().notNull(),
    slug: t.text().notNull(),
    proposalIdToUpdate: t.integer(),
    encodedPropHash: t.hex(),
    sigDigest: t.hex(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    signerIdx: index().on(table.signer),
    candidateIdx: index().on(table.candidateId),
  })
);

/** Feedback on proposals */
export const proposalFeedback = onchainTable(
  "proposal_feedback",
  (t) => ({
    id: t.text().primaryKey(),
    msgSender: t.hex().notNull(),
    proposalId: t.integer().notNull(),
    support: t.integer().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    proposalIdx: index().on(table.proposalId),
  })
);

/** Feedback on candidates */
export const candidateFeedback = onchainTable(
  "candidate_feedback",
  (t) => ({
    id: t.text().primaryKey(),
    candidateId: t.text().notNull(),
    msgSender: t.hex().notNull(),
    proposer: t.hex().notNull(),
    slug: t.text().notNull(),
    support: t.integer().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    candidateIdx: index().on(table.candidateId),
  })
);

/** Duna compliance signals */
export const complianceSignals = onchainTable(
  "compliance_signals",
  (t) => ({
    id: t.text().primaryKey(),
    proposalId: t.integer().notNull(),
    signal: t.integer().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  })
);

/** Duna admin/voter messages */
export const dunaMessages = onchainTable("duna_messages", (t) => ({
  id: t.text().primaryKey(),
  messageType: t.text().notNull(),
  message: t.text().notNull(),
  relatedProposals: t.json().$type<number[]>(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** DAO governor config changes */
export const daoConfigChanges = onchainTable(
  "dao_config_changes",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Data proxy config changes */
export const dataConfigChanges = onchainTable(
  "data_config_changes",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

// =============================================================================
// SUBGRAPH 3: TREASURY & FINANCE
// =============================================================================

/** Treasury timelock transactions (V1 + V2) */
export const treasuryTxs = onchainTable(
  "treasury_txs",
  (t) => ({
    id: t.text().primaryKey(),
    txHash: t.hex().notNull(),
    target: t.hex().notNull(),
    value: t.bigint().notNull(),
    signature: t.text().notNull(),
    data: t.hex().notNull(),
    eta: t.bigint().notNull(),
    status: t.text().notNull().default("QUEUED"),
    treasuryVersion: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    statusIdx: index().on(table.status),
  })
);

/** Treasury ETH/ERC20 sends */
export const treasuryTransfers = onchainTable(
  "treasury_transfers",
  (t) => ({
    id: t.text().primaryKey(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    tokenType: t.text().notNull(),
    erc20Token: t.hex(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Treasury config changes */
export const treasuryConfigChanges = onchainTable(
  "treasury_config",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    treasuryVersion: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Registered client apps */
export const clients = onchainTable("clients", (t) => ({
  clientId: t.integer().primaryKey(),
  name: t.text().notNull(),
  description: t.text().notNull(),
  approved: t.boolean().notNull().default(false),
  totalRewarded: t.bigint().notNull().default(0n),
  totalWithdrawn: t.bigint().notNull().default(0n),
  nftImage: t.text(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Client reward distributions */
export const clientRewardEvents = onchainTable(
  "client_reward_events",
  (t) => ({
    id: t.text().primaryKey(),
    clientId: t.integer().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  })
);

/** Client withdrawals */
export const clientWithdrawals = onchainTable(
  "client_withdrawals",
  (t) => ({
    id: t.text().primaryKey(),
    clientId: t.integer().notNull(),
    amount: t.bigint().notNull(),
    to: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  })
);

/** Reward update events */
export const rewardUpdates = onchainTable("reward_updates", (t) => ({
  id: t.text().primaryKey(),
  updateType: t.text().notNull(),
  params: t.json().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Reward config changes */
export const rewardConfigChanges = onchainTable(
  "reward_config_changes",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Token buyer trades */
export const tokenBuyerTrades = onchainTable(
  "token_buyer_trades",
  (t) => ({
    id: t.text().primaryKey(),
    to: t.hex().notNull(),
    ethOut: t.bigint().notNull(),
    tokenIn: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Token buyer config changes */
export const tokenBuyerConfig = onchainTable(
  "token_buyer_config",
  (t) => ({
    id: t.text().primaryKey(),
    eventName: t.text().notNull(),
    params: t.json().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  })
);

/** Payer debt records */
export const payerDebts = onchainTable("payer_debts", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  eventType: t.text().notNull(),
  remainingDebt: t.bigint(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Payer misc events */
export const payerEvents = onchainTable("payer_events", (t) => ({
  id: t.text().primaryKey(),
  eventName: t.text().notNull(),
  params: t.json().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Payment streams */
export const streams = onchainTable("streams", (t) => ({
  id: t.text().primaryKey(),
  msgSender: t.hex().notNull(),
  payer: t.hex().notNull(),
  recipient: t.hex().notNull(),
  tokenAmount: t.bigint().notNull(),
  tokenAddress: t.hex().notNull(),
  startTime: t.bigint().notNull(),
  stopTime: t.bigint().notNull(),
  streamAddress: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

// =============================================================================
// SUBGRAPH 4: NOUNS V2 + SMALL GRANTS
// Independent deployment from V1; same shape, separate tables. V2 has its own
// ERC-721, auction house, and governor/treasury. Small Grants is a separate
// governor/treasury that reads voting power from the V1 NounsToken.
// =============================================================================

/** All NounV2 tokens — same trait shape as V1. */
export const nounsV2 = onchainTable("nouns_v2", (t) => ({
  id: t.integer().primaryKey(),
  background: t.integer().notNull(),
  body: t.integer().notNull(),
  accessory: t.integer().notNull(),
  head: t.integer().notNull(),
  glasses: t.integer().notNull(),
  owner: t.hex(),
  /** True if the seed was overridden by the slobber rule (accessory == 143). */
  isSlobber: t.boolean().notNull().default(false),
  burned: t.boolean().notNull().default(false),
  burnedAt: t.bigint(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** NounV2 auction lifecycle. */
export const nounsV2Auctions = onchainTable("nouns_v2_auctions", (t) => ({
  nounId: t.integer().primaryKey(),
  startTime: t.bigint().notNull(),
  endTime: t.bigint().notNull(),
  winner: t.hex(),
  amount: t.bigint(),
  settled: t.boolean().notNull().default(false),
  settlerAddress: t.hex(),
  settledTimestamp: t.bigint(),
  blockNumber: t.bigint().notNull(),
}));

/** Every NounV2 auction bid. */
export const nounsV2AuctionBids = onchainTable(
  "nouns_v2_auction_bids",
  (t) => ({
    id: t.text().primaryKey(),
    nounId: t.integer().notNull(),
    bidder: t.hex().notNull(),
    amount: t.bigint().notNull(),
    extended: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    nounIdx: index().on(table.nounId),
    bidderIdx: index().on(table.bidder),
  })
);

/** NounV2 token transfers. */
export const nounsV2Transfers = onchainTable(
  "nouns_v2_transfers",
  (t) => ({
    id: t.text().primaryKey(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenId: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.tokenId),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  })
);

/** NounV2 governor proposals. */
export const nounsV2Proposals = onchainTable(
  "nouns_v2_proposals",
  (t) => ({
    id: t.integer().primaryKey(),
    proposer: t.hex().notNull(),
    description: t.text(),
    startBlock: t.bigint().notNull(),
    endBlock: t.bigint().notNull(),
    eta: t.bigint(),
    forVotes: t.bigint().notNull().default(0n),
    againstVotes: t.bigint().notNull().default(0n),
    abstainVotes: t.bigint().notNull().default(0n),
    canceled: t.boolean().notNull().default(false),
    queued: t.boolean().notNull().default(false),
    executed: t.boolean().notNull().default(false),
    createdTimestamp: t.bigint().notNull(),
    createdBlock: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    proposerIdx: index().on(table.proposer),
    createdIdx: index().on(table.createdTimestamp),
  })
);

/** NounV2 votes. */
export const nounsV2Votes = onchainTable(
  "nouns_v2_votes",
  (t) => ({
    id: t.text().primaryKey(),
    voter: t.hex().notNull(),
    proposalId: t.integer().notNull(),
    support: t.integer().notNull(),
    votes: t.bigint().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    voterIdx: index().on(table.voter),
    proposalIdx: index().on(table.proposalId),
  })
);

/** Small Grants proposals — V1-Nouns-voted grant pot, same shape as V2. */
export const smallGrantsProposals = onchainTable(
  "small_grants_proposals",
  (t) => ({
    id: t.integer().primaryKey(),
    proposer: t.hex().notNull(),
    description: t.text(),
    startBlock: t.bigint().notNull(),
    endBlock: t.bigint().notNull(),
    eta: t.bigint(),
    forVotes: t.bigint().notNull().default(0n),
    againstVotes: t.bigint().notNull().default(0n),
    abstainVotes: t.bigint().notNull().default(0n),
    canceled: t.boolean().notNull().default(false),
    queued: t.boolean().notNull().default(false),
    executed: t.boolean().notNull().default(false),
    createdTimestamp: t.bigint().notNull(),
    createdBlock: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    proposerIdx: index().on(table.proposer),
    createdIdx: index().on(table.createdTimestamp),
  })
);

/** Small Grants votes. */
export const smallGrantsVotes = onchainTable(
  "small_grants_votes",
  (t) => ({
    id: t.text().primaryKey(),
    voter: t.hex().notNull(),
    proposalId: t.integer().notNull(),
    support: t.integer().notNull(),
    votes: t.bigint().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    voterIdx: index().on(table.voter),
    proposalIdx: index().on(table.proposalId),
  })
);

// =============================================================================
// SUBGRAPH 5: FOOD NOUNS
// Independent V1-style Nouns fork. Same shape as V2/SmallGrants — Token,
// AuctionHouse, Governor, Descriptor (for SVG rendering), Treasury (timelock).
// No candidates, no client IDs, no signed proposals.
// =============================================================================

/** All Food Nouns with seed traits + SVG rendered at index time. */
export const foodNouns = onchainTable("food_nouns", (t) => ({
  id: t.integer().primaryKey(),
  background: t.integer().notNull(),
  body: t.integer().notNull(),
  accessory: t.integer().notNull(),
  head: t.integer().notNull(),
  glasses: t.integer().notNull(),
  /** SVG rendered by calling `generateSVGImage` on the active descriptor at mint. */
  svg: t.text().notNull(),
  owner: t.hex(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
}));

/** Food Nouns auction lifecycle. */
export const foodAuctions = onchainTable("food_auctions", (t) => ({
  nounId: t.integer().primaryKey(),
  startTime: t.bigint().notNull(),
  endTime: t.bigint().notNull(),
  winner: t.hex(),
  amount: t.bigint(),
  settled: t.boolean().notNull().default(false),
  settlerAddress: t.hex(),
  settledTimestamp: t.bigint(),
  blockNumber: t.bigint().notNull(),
}));

/** Every Food Nouns auction bid. */
export const foodAuctionBids = onchainTable(
  "food_auction_bids",
  (t) => ({
    id: t.text().primaryKey(),
    nounId: t.integer().notNull(),
    bidder: t.hex().notNull(),
    amount: t.bigint().notNull(),
    extended: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    nounIdx: index().on(table.nounId),
    bidderIdx: index().on(table.bidder),
  })
);

/** Food Nouns token transfers. */
export const foodTransfers = onchainTable(
  "food_transfers",
  (t) => ({
    id: t.text().primaryKey(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenId: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.tokenId),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  })
);

/** Food Nouns delegation changes. */
export const foodDelegations = onchainTable(
  "food_delegations",
  (t) => ({
    id: t.text().primaryKey(),
    delegator: t.hex().notNull(),
    fromDelegate: t.hex().notNull(),
    toDelegate: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    delegatorIdx: index().on(table.delegator),
    toDelegateIdx: index().on(table.toDelegate),
  })
);

/** Food Nouns voters / delegates. */
export const foodVoters = onchainTable(
  "food_voters",
  (t) => ({
    address: t.hex().primaryKey(),
    delegatedVotes: t.integer().notNull().default(0),
    totalVotes: t.integer().notNull().default(0),
    lastVoteAt: t.bigint(),
    firstSeenAt: t.bigint(),
  }),
  (table) => ({
    votesIdx: index().on(table.delegatedVotes),
  })
);

/** Food Nouns governor proposals. */
export const foodProposals = onchainTable(
  "food_proposals",
  (t) => ({
    id: t.integer().primaryKey(),
    proposer: t.hex().notNull(),
    description: t.text(),
    targets: t.json().$type<string[]>(),
    values: t.json().$type<string[]>(),
    signatures: t.json().$type<string[]>(),
    calldatas: t.json().$type<string[]>(),
    startBlock: t.bigint().notNull(),
    endBlock: t.bigint().notNull(),
    eta: t.bigint(),
    forVotes: t.bigint().notNull().default(0n),
    againstVotes: t.bigint().notNull().default(0n),
    abstainVotes: t.bigint().notNull().default(0n),
    canceled: t.boolean().notNull().default(false),
    vetoed: t.boolean().notNull().default(false),
    queued: t.boolean().notNull().default(false),
    executed: t.boolean().notNull().default(false),
    createdTimestamp: t.bigint().notNull(),
    createdBlock: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    proposerIdx: index().on(table.proposer),
    createdIdx: index().on(table.createdTimestamp),
  })
);

/** Food Nouns votes. */
export const foodVotes = onchainTable(
  "food_votes",
  (t) => ({
    id: t.text().primaryKey(),
    voter: t.hex().notNull(),
    proposalId: t.integer().notNull(),
    support: t.integer().notNull(),
    votes: t.bigint().notNull(),
    reason: t.text(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    voterIdx: index().on(table.voter),
    proposalIdx: index().on(table.proposalId),
  })
);

/**
 * Food Nouns treasury timelock transactions. One row per (txHash, eta) pair.
 * `status` advances queued → executed (or → cancelled). Compound-style timelock
 * may queue the same target+sig+data multiple times under different etas, so
 * the row key folds in both.
 */
export const foodTreasuryTransactions = onchainTable(
  "food_treasury_transactions",
  (t) => ({
    id: t.text().primaryKey(),
    txHash: t.hex().notNull(),
    target: t.hex().notNull(),
    value: t.bigint().notNull(),
    signature: t.text().notNull(),
    data: t.hex().notNull(),
    eta: t.bigint().notNull(),
    status: t.text().notNull().default("queued"),
    queuedTimestamp: t.bigint(),
    queuedBlock: t.bigint(),
    queuedTxHash: t.hex(),
    executedTimestamp: t.bigint(),
    executedBlock: t.bigint(),
    executedTxHash: t.hex(),
    cancelledTimestamp: t.bigint(),
    cancelledBlock: t.bigint(),
    cancelledTxHash: t.hex(),
  }),
  (table) => ({
    statusIdx: index().on(table.status),
    targetIdx: index().on(table.target),
  })
);

// =============================================================================
// ENS CACHE
// =============================================================================

/** Cached ENS name lookups -- populated lazily by API layer */
export const ensNames = onchainTable("ens_names", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  avatar: t.text(),
  resolvedAt: t.bigint().notNull(),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const nounsRelations = relations(nouns, ({ one, many }) => ({
  auction: one(auctions, { fields: [nouns.id], references: [auctions.nounId] }),
  transfers: many(transfers),
  bids: many(auctionBids),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  noun: one(nouns, { fields: [auctions.nounId], references: [nouns.id] }),
  bids: many(auctionBids),
  client: one(clients, { fields: [auctions.clientId], references: [clients.clientId] }),
}));

export const auctionBidsRelations = relations(auctionBids, ({ one }) => ({
  noun: one(nouns, { fields: [auctionBids.nounId], references: [nouns.id] }),
  auction: one(auctions, { fields: [auctionBids.nounId], references: [auctions.nounId] }),
  client: one(clients, { fields: [auctionBids.clientId], references: [clients.clientId] }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  noun: one(nouns, { fields: [transfers.tokenId], references: [nouns.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  votes: many(votes),
  versions: many(proposalVersions),
  feedback: many(proposalFeedback),
  client: one(clients, { fields: [proposals.clientId], references: [clients.clientId] }),
}));

export const proposalVersionsRelations = relations(proposalVersions, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalVersions.proposalId], references: [proposals.id] }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  proposal: one(proposals, { fields: [votes.proposalId], references: [proposals.id] }),
  voter: one(voters, { fields: [votes.voter], references: [voters.address] }),
  client: one(clients, { fields: [votes.clientId], references: [clients.clientId] }),
}));

export const proposalFeedbackRelations = relations(proposalFeedback, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalFeedback.proposalId], references: [proposals.id] }),
}));

export const votersRelations = relations(voters, ({ many }) => ({
  votes: many(votes),
  delegationsReceived: many(delegations),
}));

export const delegationsRelations = relations(delegations, ({ one }) => ({
  toVoter: one(voters, { fields: [delegations.toDelegate], references: [voters.address] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  auctions: many(auctions),
  auctionBids: many(auctionBids),
  proposals: many(proposals),
  votes: many(votes),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  versions: many(candidateVersions),
  signatures: many(candidateSignatures),
  feedback: many(candidateFeedback),
}));

export const candidateVersionsRelations = relations(candidateVersions, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateVersions.candidateId], references: [candidates.id] }),
}));

export const candidateSignaturesRelations = relations(candidateSignatures, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateSignatures.candidateId], references: [candidates.id] }),
}));

export const candidateFeedbackRelations = relations(candidateFeedback, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateFeedback.candidateId], references: [candidates.id] }),
}));

// =============================================================================
// VIEWS
// =============================================================================

/** Active proposals (PENDING, ACTIVE, UPDATABLE, OBJECTION_PERIOD) */
export const activeProposals = onchainView("active_proposals").as((qb) =>
  qb
    .select()
    .from(proposals)
    .where(
      or(
        eq(proposals.status, "PENDING"),
        eq(proposals.status, "ACTIVE"),
        eq(proposals.status, "UPDATABLE"),
        eq(proposals.status, "OBJECTION_PERIOD"),
      ),
    ),
);

/** Top delegates with voting power > 0 */
export const topDelegates = onchainView("top_delegates").as((qb) =>
  qb
    .select()
    .from(voters)
    .where(gt(voters.delegatedVotes, 0))
    .orderBy(desc(voters.delegatedVotes)),
);

/** Auction history with noun data */
export const auctionHistory = onchainView("auction_history").as((qb) =>
  qb
    .select({
      nounId: auctions.nounId,
      startTime: auctions.startTime,
      endTime: auctions.endTime,
      winner: auctions.winner,
      amount: auctions.amount,
      settled: auctions.settled,
      settlerAddress: auctions.settlerAddress,
      background: nouns.background,
      body: nouns.body,
      accessory: nouns.accessory,
      head: nouns.head,
      glasses: nouns.glasses,
    })
    .from(auctions)
    .innerJoin(nouns, eq(auctions.nounId, nouns.id)),
);

/** Settled auctions with client info (winning bid's client) */
export const clientAuctionWins = onchainView("client_auction_wins").as((qb) =>
  qb
    .select({
      nounId: auctions.nounId,
      winner: auctions.winner,
      amount: auctions.amount,
      startTime: auctions.startTime,
      endTime: auctions.endTime,
      clientId: auctions.clientId,
      clientName: clients.name,
    })
    .from(auctions)
    .innerJoin(clients, eq(auctions.clientId, clients.clientId))
    .where(eq(auctions.settled, true)),
);

/** Proposals submitted via a client */
export const clientProposals = onchainView("client_proposals").as((qb) =>
  qb
    .select({
      proposalId: proposals.id,
      proposer: proposals.proposer,
      title: proposals.title,
      status: proposals.status,
      forVotes: proposals.forVotes,
      againstVotes: proposals.againstVotes,
      abstainVotes: proposals.abstainVotes,
      createdTimestamp: proposals.createdTimestamp,
      clientId: proposals.clientId,
      clientName: clients.name,
    })
    .from(proposals)
    .innerJoin(clients, eq(proposals.clientId, clients.clientId)),
);

/** Votes cast via a client */
export const clientVotes = onchainView("client_votes").as((qb) =>
  qb
    .select({
      voteId: votes.id,
      voter: votes.voter,
      proposalId: votes.proposalId,
      support: votes.support,
      votes: votes.votes,
      reason: votes.reason,
      blockTimestamp: votes.blockTimestamp,
      clientId: votes.clientId,
      clientName: clients.name,
    })
    .from(votes)
    .innerJoin(clients, eq(votes.clientId, clients.clientId)),
);
