import { ponder } from "ponder:registry";
import { smallGrantsProposals, smallGrantsVotes } from "ponder:schema";

ponder.on("SmallGrantsTreasury:ProposalCreated", async ({ event, context }) => {
  const { id, proposer, startBlock, endBlock, description } = event.args;
  await context.db.insert(smallGrantsProposals).values({
    id: Number(id),
    proposer,
    description,
    startBlock,
    endBlock,
    createdTimestamp: event.block.timestamp,
    createdBlock: event.block.number,
    txHash: event.transaction.hash,
  });
});

ponder.on("SmallGrantsTreasury:VoteCast", async ({ event, context }) => {
  const { voter, proposalId, support, votes, reason } = event.args;
  await context.db.insert(smallGrantsVotes).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    voter,
    proposalId: Number(proposalId),
    support: Number(support),
    votes,
    reason,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  const proposal = await context.db.find(smallGrantsProposals, { id: Number(proposalId) });
  if (!proposal) return;

  const supportN = Number(support);
  if (supportN === 0) {
    await context.db
      .update(smallGrantsProposals, { id: Number(proposalId) })
      .set({ againstVotes: proposal.againstVotes + votes });
  } else if (supportN === 1) {
    await context.db
      .update(smallGrantsProposals, { id: Number(proposalId) })
      .set({ forVotes: proposal.forVotes + votes });
  } else {
    await context.db
      .update(smallGrantsProposals, { id: Number(proposalId) })
      .set({ abstainVotes: proposal.abstainVotes + votes });
  }
});

ponder.on("SmallGrantsTreasury:ProposalCanceled", async ({ event, context }) => {
  await context.db
    .update(smallGrantsProposals, { id: Number(event.args.id) })
    .set({ canceled: true });
});

ponder.on("SmallGrantsTreasury:ProposalQueued", async ({ event, context }) => {
  await context.db
    .update(smallGrantsProposals, { id: Number(event.args.id) })
    .set({ queued: true, eta: event.args.eta });
});

ponder.on("SmallGrantsTreasury:ProposalExecuted", async ({ event, context }) => {
  await context.db
    .update(smallGrantsProposals, { id: Number(event.args.id) })
    .set({ executed: true });
});
