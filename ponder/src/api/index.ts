import { Hono } from "hono";
import { db, publicClients } from "ponder:api";
import schema from "ponder:schema";
import { graphql, eq, desc, asc, and, or, gt, sql, count, like } from "ponder";
import { resolveEns, batchResolveEns, initEnsResolver } from "./ens";
import { NounsDAOLogicV3ABI } from "../../../app/lib/nouns/abis/NounsDAOLogicV3";

// Initialize ENS resolver with DB access for ens_names table lookups
initEnsResolver(db);

const NOUNS_DAO_ADDRESS = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" as const;

// Proposal state enum matching the contract
const PROPOSAL_STATES = [
  "PENDING",
  "ACTIVE",
  "CANCELED",
  "DEFEATED",
  "SUCCEEDED",
  "QUEUED",
  "EXPIRED",
  "EXECUTED",
  "VETOED",
  "OBJECTION_PERIOD",
  "UPDATABLE",
] as const;

const app = new Hono();

// =============================================================================
// GraphQL (auto-generated from schema)
// =============================================================================
app.use("/graphql", graphql({ db, schema }));

// =============================================================================
// AUCTION ENDPOINTS
// =============================================================================

/** GET /api/auction/current - Latest auction with noun seed and bids */
app.get("/api/auction/current", async (c) => {
  const auction = await db
    .select()
    .from(schema.auctions)
    .orderBy(desc(schema.auctions.nounId))
    .limit(1);

  if (!auction.length) return c.json({ error: "No auctions found" }, 404);

  const current = auction[0]!;

  // Fetch noun data and bids in parallel
  const [noun, bids] = await Promise.all([
    db
      .select()
      .from(schema.nouns)
      .where(eq(schema.nouns.id, current.nounId))
      .limit(1),
    db
      .select()
      .from(schema.auctionBids)
      .where(eq(schema.auctionBids.nounId, current.nounId))
      .orderBy(desc(schema.auctionBids.amount)),
  ]);

  // Resolve ENS for bidders and winner
  const addressesToResolve = [
    ...bids.map((b) => b.bidder),
    current.winner,
    current.settlerAddress,
  ].filter(Boolean) as string[];

  const ensMap = await batchResolveEns(addressesToResolve);

  return c.json({
    ...current,
    winnerEns: current.winner ? ensMap.get(current.winner.toLowerCase()) || null : null,
    settlerEns: current.settlerAddress ? ensMap.get(current.settlerAddress.toLowerCase()) || null : null,
    noun: noun[0] || null,
    bids: bids.map((b) => ({
      ...b,
      bidderEns: ensMap.get(b.bidder.toLowerCase()) || null,
    })),
  });
});

/** GET /api/auction/:nounId - Historical auction by noun ID */
app.get("/api/auction/:nounId", async (c) => {
  const nounId = parseInt(c.req.param("nounId"));
  if (isNaN(nounId)) return c.json({ error: "Invalid nounId" }, 400);

  const [auction, noun, bids] = await Promise.all([
    db
      .select()
      .from(schema.auctions)
      .where(eq(schema.auctions.nounId, nounId))
      .limit(1),
    db
      .select()
      .from(schema.nouns)
      .where(eq(schema.nouns.id, nounId))
      .limit(1),
    db
      .select()
      .from(schema.auctionBids)
      .where(eq(schema.auctionBids.nounId, nounId))
      .orderBy(desc(schema.auctionBids.amount)),
  ]);

  if (!auction.length) return c.json({ error: "Auction not found" }, 404);

  const a = auction[0]!;
  const addressesToResolve = [
    ...bids.map((b) => b.bidder),
    a.winner,
    a.settlerAddress,
  ].filter(Boolean) as string[];
  const ensMap = await batchResolveEns(addressesToResolve);

  return c.json({
    ...a,
    winnerEns: a.winner ? ensMap.get(a.winner.toLowerCase()) || null : null,
    settlerEns: a.settlerAddress ? ensMap.get(a.settlerAddress.toLowerCase()) || null : null,
    noun: noun[0] || null,
    bids: bids.map((b) => ({
      ...b,
      bidderEns: ensMap.get(b.bidder.toLowerCase()) || null,
    })),
  });
});

// =============================================================================
// NOUNS ENDPOINTS
// =============================================================================

/** GET /api/nouns - Paginated, filtered, sorted noun list */
app.get("/api/nouns", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const offset = parseInt(c.req.query("offset") || "0");
  const sortField = c.req.query("sort") || "id";
  const sortDir = c.req.query("dir") || "desc";

  // Trait filters
  const background = c.req.query("background");
  const body = c.req.query("body");
  const accessory = c.req.query("accessory");
  const head = c.req.query("head");
  const glasses = c.req.query("glasses");
  const burned = c.req.query("burned");

  // Build WHERE conditions
  const conditions: any[] = [];
  if (background !== undefined) conditions.push(eq(schema.nouns.background, parseInt(background)));
  if (body !== undefined) conditions.push(eq(schema.nouns.body, parseInt(body)));
  if (accessory !== undefined) conditions.push(eq(schema.nouns.accessory, parseInt(accessory)));
  if (head !== undefined) conditions.push(eq(schema.nouns.head, parseInt(head)));
  if (glasses !== undefined) conditions.push(eq(schema.nouns.glasses, parseInt(glasses)));
  if (burned !== undefined) conditions.push(eq(schema.nouns.burned, burned === "true"));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort
  const sortColumns: Record<string, any> = {
    id: schema.nouns.id,
    area: schema.nouns.area,
    colorCount: schema.nouns.colorCount,
    brightness: schema.nouns.brightness,
    settledAt: schema.nouns.settledAt,
    winningBid: schema.nouns.winningBid,
  };
  const sortColumn = sortColumns[sortField] || schema.nouns.id;
  const orderBy = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Query
  const [nouns, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.nouns)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(schema.nouns)
      .where(whereClause),
  ]);

  // Resolve ENS for owners
  const ownerAddresses = nouns
    .map((n) => n.owner)
    .filter(Boolean) as string[];
  const ensMap = await batchResolveEns(ownerAddresses);

  return c.json({
    nouns: nouns.map((n) => ({
      ...n,
      ownerEns: n.owner ? ensMap.get(n.owner.toLowerCase()) || null : null,
    })),
    total: totalResult[0]?.count || 0,
    limit,
    offset,
  });
});

/** GET /api/nouns/:id - Single noun with full detail */
app.get("/api/nouns/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  const [nounResult, auctionResult, bids, transferHistory] = await Promise.all([
    db
      .select()
      .from(schema.nouns)
      .where(eq(schema.nouns.id, id))
      .limit(1),
    db
      .select()
      .from(schema.auctions)
      .where(eq(schema.auctions.nounId, id))
      .limit(1),
    db
      .select()
      .from(schema.auctionBids)
      .where(eq(schema.auctionBids.nounId, id))
      .orderBy(desc(schema.auctionBids.amount)),
    db
      .select()
      .from(schema.transfers)
      .where(eq(schema.transfers.tokenId, id))
      .orderBy(desc(schema.transfers.blockTimestamp)),
  ]);

  if (!nounResult.length) return c.json({ error: "Noun not found" }, 404);

  const noun = nounResult[0]!;

  // Resolve ENS for owner, winner, settler
  const addressesToResolve = [
    noun.owner,
    noun.winnerAddress,
    noun.settledByAddress,
    ...bids.map((b) => b.bidder),
  ].filter(Boolean) as string[];
  const ensMap = await batchResolveEns(addressesToResolve);

  return c.json({
    ...noun,
    ownerEns: noun.owner ? ensMap.get(noun.owner.toLowerCase()) || null : null,
    winnerEns: noun.winnerAddress ? ensMap.get(noun.winnerAddress.toLowerCase()) || null : null,
    settlerEns: noun.settledByAddress ? ensMap.get(noun.settledByAddress.toLowerCase()) || null : null,
    auction: auctionResult[0] || null,
    bids: bids.map((b) => ({
      ...b,
      bidderEns: ensMap.get(b.bidder.toLowerCase()) || null,
    })),
    transfers: transferHistory,
  });
});

/** GET /api/nouns/addresses - Unique settler/winner addresses with ENS */
app.get("/api/nouns/addresses", async (c) => {
  // Get unique settler addresses
  const settlers = await db
    .selectDistinct({ address: schema.nouns.settledByAddress })
    .from(schema.nouns)
    .where(gt(schema.nouns.settledByAddress, sql`'0x'`));

  // Get unique winner addresses
  const winners = await db
    .selectDistinct({ address: schema.nouns.winnerAddress })
    .from(schema.nouns)
    .where(gt(schema.nouns.winnerAddress, sql`'0x'`));

  const allAddresses = new Set<string>();
  settlers.forEach((s) => s.address && allAddresses.add(s.address.toLowerCase()));
  winners.forEach((w) => w.address && allAddresses.add(w.address.toLowerCase()));

  const ensMap = await batchResolveEns([...allAddresses]);

  return c.json({
    settlers: settlers
      .filter((s) => s.address)
      .map((s) => ({
        address: s.address,
        ens: ensMap.get(s.address!.toLowerCase()) || null,
      })),
    winners: winners
      .filter((w) => w.address)
      .map((w) => ({
        address: w.address,
        ens: ensMap.get(w.address!.toLowerCase()) || null,
      })),
  });
});

// =============================================================================
// PROPOSALS ENDPOINTS
// =============================================================================

/** GET /api/proposals - Proposal list with computed status */
app.get("/api/proposals", async (c) => {
  const first = Math.min(parseInt(c.req.query("first") || "50"), 200);
  const skip = parseInt(c.req.query("skip") || "0");
  const filter = c.req.query("filter"); // ACTIVE, PENDING, etc.
  const sort = c.req.query("sort") || "id";
  const dir = c.req.query("dir") || "desc";

  const conditions: any[] = [];
  if (filter) {
    conditions.push(eq(schema.proposals.status, filter));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumns: Record<string, any> = {
    id: schema.proposals.id,
    createdTimestamp: schema.proposals.createdTimestamp,
    endBlock: schema.proposals.endBlock,
  };
  const sortColumn = sortColumns[sort] || schema.proposals.id;
  const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [proposalRows, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.proposals)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(first)
      .offset(skip),
    db
      .select({ count: count() })
      .from(schema.proposals)
      .where(whereClause),
  ]);

  // For active proposals, verify on-chain state
  const proposalsWithState = await Promise.all(
    proposalRows.map(async (p) => {
      let onChainState: string | null = null;
      if (
        p.status === "PENDING" ||
        p.status === "ACTIVE" ||
        p.status === "UPDATABLE" ||
        p.status === "OBJECTION_PERIOD"
      ) {
        try {
          const stateNum = (await publicClients.mainnet.readContract({
            abi: NounsDAOLogicV3ABI,
            address: NOUNS_DAO_ADDRESS,
            functionName: "state",
            args: [BigInt(p.id)],
          })) as number;
          onChainState = PROPOSAL_STATES[stateNum] || null;
        } catch {
          // On-chain call failed, use indexed state
        }
      }

      return {
        ...p,
        onChainStatus: onChainState || p.status,
      };
    }),
  );

  // Resolve ENS for proposers
  const proposerAddresses = proposalRows
    .map((p) => p.proposer)
    .filter(Boolean) as string[];
  const ensMap = await batchResolveEns(proposerAddresses);

  return c.json({
    proposals: proposalsWithState.map((p) => ({
      ...p,
      proposerEns: p.proposer ? ensMap.get(p.proposer.toLowerCase()) || null : null,
    })),
    total: totalResult[0]?.count || 0,
    first,
    skip,
  });
});

/** GET /api/proposals/:id - Proposal detail with votes, feedback, signers */
app.get("/api/proposals/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  const [proposalResult, votesResult, feedbackResult, versionsResult] =
    await Promise.all([
      db
        .select()
        .from(schema.proposals)
        .where(eq(schema.proposals.id, id))
        .limit(1),
      db
        .select()
        .from(schema.votes)
        .where(eq(schema.votes.proposalId, id))
        .orderBy(desc(schema.votes.blockTimestamp)),
      db
        .select()
        .from(schema.proposalFeedback)
        .where(eq(schema.proposalFeedback.proposalId, id))
        .orderBy(desc(schema.proposalFeedback.blockTimestamp)),
      db
        .select()
        .from(schema.proposalVersions)
        .where(eq(schema.proposalVersions.proposalId, id))
        .orderBy(asc(schema.proposalVersions.blockTimestamp)),
    ]);

  if (!proposalResult.length) return c.json({ error: "Proposal not found" }, 404);

  const proposal = proposalResult[0]!;

  // Verify on-chain state
  let onChainState: string | null = null;
  try {
    const stateNum = (await publicClients.mainnet.readContract({
      abi: NounsDAOLogicV3ABI,
      address: NOUNS_DAO_ADDRESS,
      functionName: "state",
      args: [BigInt(id)],
    })) as number;
    onChainState = PROPOSAL_STATES[stateNum] || null;
  } catch {
    // Use indexed state
  }

  // Resolve ENS for all addresses
  const allAddresses = [
    proposal.proposer,
    ...votesResult.map((v) => v.voter),
    ...feedbackResult.map((f) => f.msgSender),
  ].filter(Boolean) as string[];
  const ensMap = await batchResolveEns(allAddresses);

  return c.json({
    ...proposal,
    onChainStatus: onChainState || proposal.status,
    proposerEns: proposal.proposer ? ensMap.get(proposal.proposer.toLowerCase()) || null : null,
    votes: votesResult.map((v) => ({
      ...v,
      voterEns: ensMap.get(v.voter.toLowerCase()) || null,
    })),
    feedback: feedbackResult.map((f) => ({
      ...f,
      senderEns: ensMap.get(f.msgSender.toLowerCase()) || null,
    })),
    versions: versionsResult,
  });
});

// =============================================================================
// VOTERS ENDPOINTS
// =============================================================================

/** GET /api/voters - Delegate list */
app.get("/api/voters", async (c) => {
  const first = Math.min(parseInt(c.req.query("first") || "50"), 200);
  const skip = parseInt(c.req.query("skip") || "0");
  const sort = c.req.query("sort") || "delegatedVotes";
  const dir = c.req.query("dir") || "desc";

  const sortColumns: Record<string, any> = {
    delegatedVotes: schema.voters.delegatedVotes,
    totalVotes: schema.voters.totalVotes,
    firstSeenAt: schema.voters.firstSeenAt,
  };
  const sortColumn = sortColumns[sort] || schema.voters.delegatedVotes;
  const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [voterRows, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.voters)
      .orderBy(orderBy)
      .limit(first)
      .offset(skip),
    db
      .select({ count: count() })
      .from(schema.voters),
  ]);

  // Resolve ENS
  const addresses = voterRows.map((v) => v.address);
  const ensMap = await batchResolveEns(addresses);

  return c.json({
    voters: voterRows.map((v) => ({
      ...v,
      ens: ensMap.get(v.address.toLowerCase()) || null,
    })),
    total: totalResult[0]?.count || 0,
    first,
    skip,
  });
});

/** GET /api/voters/:address - Voter detail with nested data */
app.get("/api/voters/:address", async (c) => {
  const address = c.req.param("address").toLowerCase() as `0x${string}`;

  const [
    voterResult,
    votesResult,
    ownedNouns,
    delegationsResult,
    authoredProposals,
    authoredCandidates,
  ] = await Promise.all([
    db
      .select()
      .from(schema.voters)
      .where(eq(schema.voters.address, address))
      .limit(1),
    db
      .select()
      .from(schema.votes)
      .where(eq(schema.votes.voter, address))
      .orderBy(desc(schema.votes.blockTimestamp)),
    db
      .select()
      .from(schema.nouns)
      .where(eq(schema.nouns.owner, address)),
    db
      .select()
      .from(schema.delegations)
      .where(eq(schema.delegations.toDelegate, address))
      .orderBy(desc(schema.delegations.blockTimestamp)),
    db
      .select()
      .from(schema.proposals)
      .where(eq(schema.proposals.proposer, address))
      .orderBy(desc(schema.proposals.createdTimestamp)),
    db
      .select()
      .from(schema.candidates)
      .where(eq(schema.candidates.proposer, address))
      .orderBy(desc(schema.candidates.createdTimestamp)),
  ]);

  if (!voterResult.length) return c.json({ error: "Voter not found" }, 404);

  const voter = voterResult[0]!;

  // Resolve ENS for the voter and delegators
  const allAddresses = [
    voter.address,
    ...delegationsResult.map((d) => d.delegator),
  ].filter(Boolean) as string[];
  const ensMap = await batchResolveEns(allAddresses);

  return c.json({
    ...voter,
    ens: ensMap.get(voter.address.toLowerCase()) || null,
    votes: votesResult,
    ownedNouns,
    delegations: delegationsResult.map((d) => ({
      ...d,
      delegatorEns: ensMap.get(d.delegator.toLowerCase()) || null,
    })),
    authoredProposals,
    authoredCandidates,
  });
});

// =============================================================================
// CANDIDATES ENDPOINTS
// =============================================================================

/** GET /api/candidates - Candidate list */
app.get("/api/candidates", async (c) => {
  const first = Math.min(parseInt(c.req.query("first") || "50"), 200);
  const skip = parseInt(c.req.query("skip") || "0");

  const [candidateRows, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.candidates)
      .orderBy(desc(schema.candidates.createdTimestamp))
      .limit(first)
      .offset(skip),
    db
      .select({ count: count() })
      .from(schema.candidates),
  ]);

  // Resolve ENS for proposers
  const proposerAddresses = candidateRows
    .map((c) => c.proposer)
    .filter(Boolean) as string[];
  const ensMap = await batchResolveEns(proposerAddresses);

  return c.json({
    candidates: candidateRows.map((candidate) => ({
      ...candidate,
      proposerEns: ensMap.get(candidate.proposer.toLowerCase()) || null,
    })),
    total: totalResult[0]?.count || 0,
    first,
    skip,
  });
});

/** GET /api/candidates/:slug - Candidate detail with signatures and feedback */
app.get("/api/candidates/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Find the candidate (slug is not globally unique, so we find the first match)
  const candidateResult = await db
    .select()
    .from(schema.candidates)
    .where(eq(schema.candidates.slug, slug))
    .limit(1);

  if (!candidateResult.length) return c.json({ error: "Candidate not found" }, 404);

  const candidate = candidateResult[0]!;

  const [signaturesResult, feedbackResult, versionsResult] = await Promise.all([
    db
      .select()
      .from(schema.candidateSignatures)
      .where(eq(schema.candidateSignatures.candidateId, candidate.id))
      .orderBy(desc(schema.candidateSignatures.blockTimestamp)),
    db
      .select()
      .from(schema.candidateFeedback)
      .where(eq(schema.candidateFeedback.candidateId, candidate.id))
      .orderBy(desc(schema.candidateFeedback.blockTimestamp)),
    db
      .select()
      .from(schema.candidateVersions)
      .where(eq(schema.candidateVersions.candidateId, candidate.id))
      .orderBy(asc(schema.candidateVersions.blockTimestamp)),
  ]);

  // Resolve ENS
  const allAddresses = [
    candidate.proposer,
    ...signaturesResult.map((s) => s.signer),
    ...feedbackResult.map((f) => f.msgSender),
  ].filter(Boolean) as string[];
  const ensMap = await batchResolveEns(allAddresses);

  return c.json({
    ...candidate,
    proposerEns: ensMap.get(candidate.proposer.toLowerCase()) || null,
    signatures: signaturesResult.map((s) => ({
      ...s,
      signerEns: ensMap.get(s.signer.toLowerCase()) || null,
    })),
    feedback: feedbackResult.map((f) => ({
      ...f,
      senderEns: ensMap.get(f.msgSender.toLowerCase()) || null,
    })),
    versions: versionsResult,
  });
});

// =============================================================================
// ACTIVITY FEED ENDPOINT
// =============================================================================

/** GET /api/activity - Unified activity feed */
app.get("/api/activity", async (c) => {
  const first = Math.min(parseInt(c.req.query("first") || "50"), 200);
  const sinceTimestamp = c.req.query("since")
    ? BigInt(c.req.query("since")!)
    : null;

  // Fetch recent activity from multiple tables in parallel
  const timestampFilter = sinceTimestamp ? sinceTimestamp : 0n;

  const [
    recentVotes,
    recentTransfers,
    recentProposals,
    recentAuctions,
    recentCandidates,
    recentDelegations,
  ] = await Promise.all([
    db
      .select({
        type: sql<string>`'vote'`,
        id: schema.votes.id,
        timestamp: schema.votes.blockTimestamp,
        data: sql`json_build_object(
          'proposalId', ${schema.votes.proposalId},
          'voter', ${schema.votes.voter},
          'support', ${schema.votes.support},
          'votes', ${schema.votes.votes}::text,
          'reason', ${schema.votes.reason}
        )`,
      })
      .from(schema.votes)
      .where(gt(schema.votes.blockTimestamp, timestampFilter))
      .orderBy(desc(schema.votes.blockTimestamp))
      .limit(first),
    db
      .select({
        type: sql<string>`'transfer'`,
        id: schema.transfers.id,
        timestamp: schema.transfers.blockTimestamp,
        data: sql`json_build_object(
          'from', ${schema.transfers.from},
          'to', ${schema.transfers.to},
          'tokenId', ${schema.transfers.tokenId}
        )`,
      })
      .from(schema.transfers)
      .where(gt(schema.transfers.blockTimestamp, timestampFilter))
      .orderBy(desc(schema.transfers.blockTimestamp))
      .limit(first),
    db
      .select({
        type: sql<string>`'proposal'`,
        id: sql<string>`${schema.proposals.id}::text`,
        timestamp: schema.proposals.createdTimestamp,
        data: sql`json_build_object(
          'proposalId', ${schema.proposals.id},
          'proposer', ${schema.proposals.proposer},
          'title', ${schema.proposals.title},
          'status', ${schema.proposals.status}
        )`,
      })
      .from(schema.proposals)
      .where(gt(schema.proposals.createdTimestamp, timestampFilter))
      .orderBy(desc(schema.proposals.createdTimestamp))
      .limit(first),
    db
      .select({
        type: sql<string>`'auction_settled'`,
        id: sql<string>`${schema.auctions.nounId}::text`,
        timestamp: schema.nouns.settledAt,
        data: sql`json_build_object(
          'nounId', ${schema.auctions.nounId},
          'winner', ${schema.auctions.winner},
          'amount', ${schema.auctions.amount}::text
        )`,
      })
      .from(schema.auctions)
      .innerJoin(schema.nouns, eq(schema.auctions.nounId, schema.nouns.id))
      .where(
        and(
          eq(schema.auctions.settled, true),
          gt(schema.nouns.settledAt, timestampFilter),
        ),
      )
      .orderBy(desc(schema.nouns.settledAt))
      .limit(first),
    db
      .select({
        type: sql<string>`'candidate'`,
        id: schema.candidates.id,
        timestamp: schema.candidates.createdTimestamp,
        data: sql`json_build_object(
          'slug', ${schema.candidates.slug},
          'proposer', ${schema.candidates.proposer},
          'title', ${schema.candidates.title}
        )`,
      })
      .from(schema.candidates)
      .where(gt(schema.candidates.createdTimestamp, timestampFilter))
      .orderBy(desc(schema.candidates.createdTimestamp))
      .limit(first),
    db
      .select({
        type: sql<string>`'delegation'`,
        id: schema.delegations.id,
        timestamp: schema.delegations.blockTimestamp,
        data: sql`json_build_object(
          'delegator', ${schema.delegations.delegator},
          'fromDelegate', ${schema.delegations.fromDelegate},
          'toDelegate', ${schema.delegations.toDelegate}
        )`,
      })
      .from(schema.delegations)
      .where(gt(schema.delegations.blockTimestamp, timestampFilter))
      .orderBy(desc(schema.delegations.blockTimestamp))
      .limit(first),
  ]);

  // Merge and sort by timestamp
  const allActivity = [
    ...recentVotes,
    ...recentTransfers,
    ...recentProposals,
    ...recentAuctions,
    ...recentCandidates,
    ...recentDelegations,
  ]
    .sort((a, b) => {
      const aTs = BigInt(a.timestamp || 0n);
      const bTs = BigInt(b.timestamp || 0n);
      return bTs > aTs ? 1 : bTs < aTs ? -1 : 0;
    })
    .slice(0, first);

  return c.json({ activity: allActivity });
});

// =============================================================================
// SEARCH ENDPOINT
// =============================================================================

/** GET /api/search - Full-text search across voters, proposals, candidates */
app.get("/api/search", async (c) => {
  const q = c.req.query("q");
  const type = c.req.query("type"); // voter, proposal, candidate, or omit for all
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  if (!q || q.length < 2) return c.json({ error: "Query must be at least 2 characters" }, 400);

  const results: {
    voters: any[];
    proposals: any[];
    candidates: any[];
  } = { voters: [], proposals: [], candidates: [] };

  const searchPattern = `%${q}%`;

  if (!type || type === "voter") {
    // Search voters by address or ENS
    const isAddress = q.startsWith("0x");
    if (isAddress) {
      results.voters = await db
        .select()
        .from(schema.voters)
        .where(like(schema.voters.address, searchPattern))
        .limit(limit);
    }
    // Also resolve the query as ENS if it looks like an ENS name
    if (q.includes(".")) {
      try {
        const res = await fetch(`https://api.ensideas.com/ens/resolve/${q}`);
        if (res.ok) {
          const data = (await res.json()) as { address?: string };
          if (data.address) {
            const voter = await db
              .select()
              .from(schema.voters)
              .where(eq(schema.voters.address, data.address.toLowerCase() as `0x${string}`))
              .limit(1);
            if (voter.length) {
              results.voters = voter;
            }
          }
        }
      } catch {
        // ENS lookup failed, continue
      }
    }
  }

  if (!type || type === "proposal") {
    results.proposals = await db
      .select()
      .from(schema.proposals)
      .where(like(schema.proposals.title, searchPattern))
      .orderBy(desc(schema.proposals.id))
      .limit(limit);
  }

  if (!type || type === "candidate") {
    results.candidates = await db
      .select()
      .from(schema.candidates)
      .where(like(schema.candidates.title, searchPattern))
      .orderBy(desc(schema.candidates.createdTimestamp))
      .limit(limit);
  }

  return c.json(results);
});

// =============================================================================
// ENS ENDPOINTS
// =============================================================================

/** POST /api/ens/batch - Bulk-resolve ENS names */
app.post("/api/ens/batch", async (c) => {
  const body = await c.req.json<{ addresses: string[] }>();
  if (!body.addresses || !Array.isArray(body.addresses)) {
    return c.json({ error: "addresses array required" }, 400);
  }

  const ensMap = await batchResolveEns(body.addresses.slice(0, 100));

  const results: Record<string, string | null> = {};
  for (const [addr, name] of ensMap) {
    results[addr] = name;
  }

  return c.json(results);
});

/** GET /api/ens/:address - Resolve a single ENS name */
app.get("/api/ens/:address", async (c) => {
  const address = c.req.param("address");
  const name = await resolveEns(address);
  return c.json({ address, name });
});

export default app;
