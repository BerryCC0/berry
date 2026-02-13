import { ponder } from "ponder:registry";
import {
  candidates,
  candidateVersions,
  candidateSignatures,
  proposalFeedback,
  candidateFeedback,
  complianceSignals,
  dunaMessages,
  dataConfigChanges,
} from "ponder:schema";
import { extractTitle, resolveAndStoreEns } from "../helpers/ens";

// =============================================================================
// CANDIDATES
// =============================================================================

ponder.on("NounsDAOData:ProposalCandidateCreated", async ({ event, context }) => {
  const { msgSender, targets, values, signatures, calldatas, description, slug, proposalIdToUpdate, encodedProposalHash } = event.args;

  // Resolve ENS for candidate proposer
  await resolveAndStoreEns(context, msgSender);

  const candidateId = `${msgSender.toLowerCase()}-${slug}`;

  await context.db.insert(candidates).values({
    id: candidateId,
    slug,
    proposer: msgSender,
    title: extractTitle(description),
    description,
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
    encodedProposalHash,
    proposalIdToUpdate: Number(proposalIdToUpdate) || null,
    canceled: false,
    signatureCount: 0,
    createdTimestamp: event.block.timestamp,
    lastUpdatedTimestamp: event.block.timestamp,
    blockNumber: event.block.number,
  }).onConflictDoNothing();
});

ponder.on("NounsDAOData:ProposalCandidateUpdated", async ({ event, context }) => {
  const { msgSender, targets, values, signatures, calldatas, description, slug, proposalIdToUpdate, encodedProposalHash, reason } = event.args;

  const candidateId = `${msgSender.toLowerCase()}-${slug}`;

  // Insert version
  await context.db.insert(candidateVersions).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    candidateId,
    versionNumber: 0,
    title: extractTitle(description),
    description,
    updateMessage: reason,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Update candidate
  await context.db.update(candidates, { id: candidateId }).set({
    title: extractTitle(description),
    description,
    targets: targets as string[],
    values: values.map((v) => v.toString()),
    signatures: signatures as string[],
    calldatas: calldatas as string[],
    encodedProposalHash,
    lastUpdatedTimestamp: event.block.timestamp,
  });
});

ponder.on("NounsDAOData:ProposalCandidateCanceled", async ({ event, context }) => {
  const { msgSender, slug } = event.args;
  const candidateId = `${msgSender.toLowerCase()}-${slug}`;

  await context.db.update(candidates, { id: candidateId }).set({
    canceled: true,
    canceledTimestamp: event.block.timestamp,
    canceledBlock: event.block.number,
  });
});

ponder.on("NounsDAOData:SignatureAdded", async ({ event, context }) => {
  const { signer, sig, expirationTimestamp, proposer, slug, proposalIdToUpdate, encodedPropHash, sigDigest, reason } = event.args;

  // Resolve ENS for signature signer
  await resolveAndStoreEns(context, signer);

  const candidateId = `${proposer.toLowerCase()}-${slug}`;

  await context.db.insert(candidateSignatures).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    candidateId,
    signer,
    sig,
    expirationTimestamp,
    proposer,
    slug,
    proposalIdToUpdate: Number(proposalIdToUpdate) || null,
    encodedPropHash,
    sigDigest,
    reason: reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Increment signature count on candidate
  const candidate = await context.db.find(candidates, { id: candidateId });
  if (candidate) {
    await context.db.update(candidates, { id: candidateId }).set({
      signatureCount: candidate.signatureCount + 1,
    });
  }
});

// =============================================================================
// FEEDBACK
// =============================================================================

ponder.on("NounsDAOData:FeedbackSent", async ({ event, context }) => {
  // Resolve ENS for feedback sender
  await resolveAndStoreEns(context, event.args.msgSender);

  await context.db.insert(proposalFeedback).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    msgSender: event.args.msgSender,
    proposalId: Number(event.args.proposalId),
    support: Number(event.args.support),
    reason: event.args.reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("NounsDAOData:CandidateFeedbackSent", async ({ event, context }) => {
  // Resolve ENS for feedback sender
  await resolveAndStoreEns(context, event.args.msgSender);

  const candidateId = `${event.args.proposer.toLowerCase()}-${event.args.slug}`;

  await context.db.insert(candidateFeedback).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    candidateId,
    msgSender: event.args.msgSender,
    proposer: event.args.proposer,
    slug: event.args.slug,
    support: Number(event.args.support),
    reason: event.args.reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// =============================================================================
// COMPLIANCE / DUNA
// =============================================================================

ponder.on("NounsDAOData:ProposalComplianceSignaled", async ({ event, context }) => {
  await context.db.insert(complianceSignals).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId: Number(event.args.proposalId),
    signal: Number(event.args.signal),
    reason: event.args.reason || null,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("NounsDAOData:DunaAdminMessagePosted", async ({ event, context }) => {
  await context.db.insert(dunaMessages).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    messageType: "ADMIN",
    message: event.args.message,
    relatedProposals: event.args.relatedProposals.map((p) => Number(p)),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("NounsDAOData:VoterMessageToDunaAdminPosted", async ({ event, context }) => {
  await context.db.insert(dunaMessages).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    messageType: "VOTER",
    message: event.args.message,
    relatedProposals: event.args.relatedProposals.map((p) => Number(p)),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// =============================================================================
// CONFIG EVENTS
// =============================================================================

const dataConfigHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args)) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(dataConfigChanges).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("NounsDAOData:DunaAdminSet", dataConfigHandler("DunaAdminSet"));
ponder.on("NounsDAOData:CreateCandidateCostSet", dataConfigHandler("CreateCandidateCostSet"));
ponder.on("NounsDAOData:UpdateCandidateCostSet", dataConfigHandler("UpdateCandidateCostSet"));
ponder.on("NounsDAOData:FeeRecipientSet", dataConfigHandler("FeeRecipientSet"));
ponder.on("NounsDAOData:ETHWithdrawn", dataConfigHandler("ETHWithdrawn"));
ponder.on("NounsDAOData:OwnershipTransferred", dataConfigHandler("OwnershipTransferred"));
ponder.on("NounsDAOData:AdminChanged", dataConfigHandler("AdminChanged"));
ponder.on("NounsDAOData:Upgraded", dataConfigHandler("Upgraded"));
