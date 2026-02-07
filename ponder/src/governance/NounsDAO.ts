import { ponder } from "ponder:registry";
import {
  proposals,
  proposalVersions,
  votes,
  voters,
  voteRefunds,
  cancelledSignatures,
  daoConfigChanges,
} from "ponder:schema";
import { extractTitle } from "../helpers/ens";

// =============================================================================
// PROPOSAL LIFECYCLE
// =============================================================================

ponder.on("NounsDAO:ProposalCreated", async ({ event, context }) => {
  const { id, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description } = event.args;

  await context.db.insert(proposals).values({
    id: Number(id),
    proposer,
    title: extractTitle(description),
    description,
    status: "PENDING",
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
    startBlock,
    endBlock,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    onTimelockV1: false,
    createdTimestamp: event.block.timestamp,
    createdBlock: event.block.number,
    txHash: event.transaction.hash,
  }).onConflictDoNothing();
});

// Overload 1: Full proposal data with requirements (V2-era)
ponder.on("NounsDAO:ProposalCreatedWithRequirements(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)", async ({ event, context }) => {
  const { id, proposer, targets, values, signatures, calldatas, startBlock, endBlock, proposalThreshold, quorumVotes, description } = event.args;

  await context.db
    .insert(proposals)
    .values({
      id: Number(id),
      proposer,
      title: extractTitle(description),
      description,
      status: "PENDING",
      targets: targets as string[],
      values: values.map((v) => v.toString()),
      signatures: signatures as string[],
      calldatas: calldatas as string[],
      startBlock,
      endBlock,
      proposalThreshold,
      quorumVotes,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      onTimelockV1: false,
      createdTimestamp: event.block.timestamp,
      createdBlock: event.block.number,
      txHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      proposalThreshold,
      quorumVotes,
    });
});

// Overload 2: Supplementary data -- signers, clientId, updatePeriodEndBlock (V3-era)
ponder.on("NounsDAO:ProposalCreatedWithRequirements(uint256 id, address[] signers, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, uint32 indexed clientId)", async ({ event, context }) => {
  const { id, signers, updatePeriodEndBlock, proposalThreshold, quorumVotes, clientId } = event.args;

  await context.db
    .update(proposals, { id: Number(id) })
    .set({
      signers: signers as string[],
      updatePeriodEndBlock,
      proposalThreshold,
      quorumVotes,
      clientId: Number(clientId),
    });
});

ponder.on("NounsDAO:ProposalCreatedOnTimelockV1", async ({ event, context }) => {
  await context.db
    .update(proposals, { id: Number(event.args.id) })
    .set({ onTimelockV1: true });
});

ponder.on("NounsDAO:ProposalUpdated", async ({ event, context }) => {
  const { id, proposer, targets, values, signatures, calldatas, description, updateMessage } = event.args;

  await context.db.insert(proposalVersions).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId: Number(id),
    versionNumber: 0,
    title: extractTitle(description),
    description,
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
    updateMessage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Update main proposal
  await context.db.update(proposals, { id: Number(id) }).set({
    title: extractTitle(description),
    description,
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
  });
});

ponder.on("NounsDAO:ProposalDescriptionUpdated", async ({ event, context }) => {
  const { id, description, updateMessage } = event.args;

  await context.db.insert(proposalVersions).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId: Number(id),
    versionNumber: 0,
    title: extractTitle(description),
    description,
    updateMessage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  await context.db.update(proposals, { id: Number(id) }).set({
    title: extractTitle(description),
    description,
  });
});

ponder.on("NounsDAO:ProposalTransactionsUpdated", async ({ event, context }) => {
  const { id, targets, values, signatures, calldatas, updateMessage } = event.args;

  await context.db.insert(proposalVersions).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId: Number(id),
    versionNumber: 0,
    updateMessage,
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  await context.db.update(proposals, { id: Number(id) }).set({
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
  });
});

ponder.on("NounsDAO:ProposalCanceled", async ({ event, context }) => {
  await context.db.update(proposals, { id: Number(event.args.id) }).set({ status: "CANCELLED" });
});

ponder.on("NounsDAO:ProposalQueued", async ({ event, context }) => {
  await context.db.update(proposals, { id: Number(event.args.id) }).set({
    status: "QUEUED",
    executionEta: event.args.eta,
  });
});

ponder.on("NounsDAO:ProposalExecuted", async ({ event, context }) => {
  await context.db.update(proposals, { id: Number(event.args.id) }).set({ status: "EXECUTED" });
});

ponder.on("NounsDAO:ProposalVetoed", async ({ event, context }) => {
  await context.db.update(proposals, { id: Number(event.args.id) }).set({ status: "VETOED" });
});

ponder.on("NounsDAO:ProposalObjectionPeriodSet", async ({ event, context }) => {
  await context.db.update(proposals, { id: Number(event.args.id) }).set({
    objectionPeriodEndBlock: event.args.objectionPeriodEndBlock,
  });
});

// =============================================================================
// VOTING
// =============================================================================

ponder.on("NounsDAO:VoteCast", async ({ event, context }) => {
  const { voter, proposalId, support, votes: voteCount, reason } = event.args;

  await context.db.insert(votes).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    voter,
    proposalId: Number(proposalId),
    support: Number(support),
    votes: Number(voteCount),
    reason: reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  // Update vote counts on proposal using find + update
  const proposal = await context.db.find(proposals, { id: Number(proposalId) });
  if (proposal) {
    const supportNum = Number(support);
    const vc = Number(voteCount);
    if (supportNum === 1) {
      await context.db.update(proposals, { id: Number(proposalId) }).set({
        forVotes: proposal.forVotes + vc,
      });
    } else if (supportNum === 0) {
      await context.db.update(proposals, { id: Number(proposalId) }).set({
        againstVotes: proposal.againstVotes + vc,
      });
    } else if (supportNum === 2) {
      await context.db.update(proposals, { id: Number(proposalId) }).set({
        abstainVotes: proposal.abstainVotes + vc,
      });
    }
  }

  // Update voter stats
  const existingVoter = await context.db.find(voters, { address: voter });
  if (existingVoter) {
    await context.db.update(voters, { address: voter }).set({
      totalVotes: existingVoter.totalVotes + 1,
      lastVoteAt: event.block.timestamp,
    });
  } else {
    await context.db.insert(voters).values({
      address: voter,
      delegatedVotes: 0,
      totalVotes: 1,
      lastVoteAt: event.block.timestamp,
      firstSeenAt: event.block.timestamp,
    }).onConflictDoNothing();
  }
});

ponder.on("NounsDAO:VoteCastWithClientId", async ({ event, context }) => {
  // This event fires in the same tx as VoteCast; update the most recent vote for this voter+proposal
  // Since we can't query by composite key, we just store the clientId on the proposal for now
  // The vote was already inserted by VoteCast handler
  // We store clientId on the vote record by matching tx hash
  // For simplicity, we'll skip updating individual votes with clientId here
  // The auction/proposal-level clientId is more useful for rewards
});

ponder.on("NounsDAO:RefundableVote", async ({ event, context }) => {
  await context.db.insert(voteRefunds).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    voter: event.args.voter,
    refundAmount: event.args.refundAmount,
    refundSent: event.args.refundSent,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// =============================================================================
// SIGNATURE MANAGEMENT
// =============================================================================

ponder.on("NounsDAO:SignatureCancelled", async ({ event, context }) => {
  await context.db.insert(cancelledSignatures).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    signer: event.args.signer,
    sig: event.args.sig,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// =============================================================================
// ADMIN/CONFIG EVENTS (emitted via delegatecall from NounsDAOAdmin)
// =============================================================================

const configHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args)) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(daoConfigChanges).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("NounsDAO:NewAdmin", configHandler("NewAdmin"));
ponder.on("NounsDAO:NewPendingAdmin", configHandler("NewPendingAdmin"));
ponder.on("NounsDAO:NewVetoer", configHandler("NewVetoer"));
ponder.on("NounsDAO:NewPendingVetoer", configHandler("NewPendingVetoer"));
ponder.on("NounsDAO:VotingDelaySet", configHandler("VotingDelaySet"));
ponder.on("NounsDAO:VotingPeriodSet", configHandler("VotingPeriodSet"));
ponder.on("NounsDAO:ProposalThresholdBPSSet", configHandler("ProposalThresholdBPSSet"));
ponder.on("NounsDAO:MinQuorumVotesBPSSet", configHandler("MinQuorumVotesBPSSet"));
ponder.on("NounsDAO:MaxQuorumVotesBPSSet", configHandler("MaxQuorumVotesBPSSet"));
ponder.on("NounsDAO:QuorumCoefficientSet", configHandler("QuorumCoefficientSet"));
ponder.on("NounsDAO:QuorumVotesBPSSet", configHandler("QuorumVotesBPSSet"));
ponder.on("NounsDAO:ObjectionPeriodDurationSet", configHandler("ObjectionPeriodDurationSet"));
ponder.on("NounsDAO:LastMinuteWindowSet", configHandler("LastMinuteWindowSet"));
ponder.on("NounsDAO:ProposalUpdatablePeriodSet", configHandler("ProposalUpdatablePeriodSet"));
ponder.on("NounsDAO:TimelocksAndAdminSet", configHandler("TimelocksAndAdminSet"));
ponder.on("NounsDAO:Withdraw", configHandler("Withdraw"));
