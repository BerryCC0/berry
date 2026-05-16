import { ponder } from "ponder:registry";
import { foodProposals, foodVotes, foodVoters } from "ponder:schema";

// =============================================================================
// ProposalCreated — V1 shape: targets/values/sigs/calldatas + description.
// =============================================================================
ponder.on("FoodNounsGovernor:ProposalCreated", async ({ event, context }) => {
  const {
    id,
    proposer,
    targets,
    values,
    signatures,
    calldatas,
    startBlock,
    endBlock,
    description,
  } = event.args;

  await context.db
    .insert(foodProposals)
    .values({
      id: Number(id),
      proposer,
      description,
      targets: targets as string[],
      values: values.map((v) => v.toString()),
      signatures: signatures as string[],
      calldatas: calldatas as string[],
      startBlock,
      endBlock,
      forVotes: 0n,
      againstVotes: 0n,
      abstainVotes: 0n,
      canceled: false,
      vetoed: false,
      queued: false,
      executed: false,
      createdTimestamp: event.block.timestamp,
      createdBlock: event.block.number,
      txHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// =============================================================================
// VoteCast — record vote + bump proposal tallies + voter stats.
// =============================================================================
ponder.on("FoodNounsGovernor:VoteCast", async ({ event, context }) => {
  const { voter, proposalId, support, votes: voteCount, reason } = event.args;

  await context.db.insert(foodVotes).values({
    id: `${voter}-${proposalId}`,
    voter,
    proposalId: Number(proposalId),
    support: Number(support),
    votes: voteCount,
    reason: reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  // Update tallies on the proposal. V1 uses uint256 for tallies on-chain.
  const proposal = await context.db.find(foodProposals, { id: Number(proposalId) });
  if (proposal) {
    const supportNum = Number(support);
    if (supportNum === 1) {
      await context.db
        .update(foodProposals, { id: Number(proposalId) })
        .set({ forVotes: proposal.forVotes + voteCount });
    } else if (supportNum === 0) {
      await context.db
        .update(foodProposals, { id: Number(proposalId) })
        .set({ againstVotes: proposal.againstVotes + voteCount });
    } else if (supportNum === 2) {
      await context.db
        .update(foodProposals, { id: Number(proposalId) })
        .set({ abstainVotes: proposal.abstainVotes + voteCount });
    }
  }

  // Bump voter activity counter.
  const existing = await context.db.find(foodVoters, { address: voter });
  if (existing) {
    await context.db.update(foodVoters, { address: voter }).set({
      totalVotes: existing.totalVotes + 1,
      lastVoteAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(foodVoters)
      .values({
        address: voter,
        delegatedVotes: 0,
        totalVotes: 1,
        lastVoteAt: event.block.timestamp,
        firstSeenAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }
});

// =============================================================================
// Lifecycle transitions — flip boolean flags on the proposal row.
// =============================================================================

ponder.on("FoodNounsGovernor:ProposalQueued", async ({ event, context }) => {
  await context.db
    .update(foodProposals, { id: Number(event.args.id) })
    .set({ queued: true, eta: event.args.eta });
});

ponder.on("FoodNounsGovernor:ProposalExecuted", async ({ event, context }) => {
  await context.db
    .update(foodProposals, { id: Number(event.args.id) })
    .set({ executed: true });
});

ponder.on("FoodNounsGovernor:ProposalCanceled", async ({ event, context }) => {
  await context.db
    .update(foodProposals, { id: Number(event.args.id) })
    .set({ canceled: true });
});

ponder.on("FoodNounsGovernor:ProposalVetoed", async ({ event, context }) => {
  await context.db
    .update(foodProposals, { id: Number(event.args.id) })
    .set({ vetoed: true });
});
